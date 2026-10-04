'use strict';
/* =====================================================================
   NET — PeerJS. The host is the authority; voice is a peer-to-peer mesh.
   ===================================================================== */
const ROOM_PREFIX = 'tli-v1-';
const Net = {
  active: false, isHost: false, peer: null, conns: new Map(), hostConn: null, myId: 'me', room: '', players: new Map(), hostAI: false,
  waiters: new Map(), rid: 0, media: new Map(), sendT: 0, errT: 0, handlers: new Map(), shared: new Map(), meExt: new Map(),
  libUrls: ['vendor/peerjs.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/peerjs/1.5.4/peerjs.min.js', 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js', 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js'],

  async lib() { if (window.Peer) return; try { await loadScript(this.libUrls); } catch (e) { throw new Error('Could not load the multiplayer library. Check your internet connection.'); } if (!window.Peer) throw new Error('Multiplayer library failed to start.'); },
  opts() { const o = { debug: 0 }; if (settings.peerHost) { o.host = settings.peerHost; if (settings.peerPort) o.port = +settings.peerPort; o.path = settings.peerPath || '/'; o.secure = !!settings.peerSecure; } return o; },
  me() { return { name: settings.name, color: settings.color, x: +P.pos.x.toFixed(2), y: +P.pos.y.toFixed(2), z: +P.pos.z.toFixed(2), ry: +P.yaw.toFixed(2), seat: P.seated ? P.seat : (P.review >= 0 ? -10 - P.review : -1), talk: Voice.talking, personal: G.personal , ext: this.ext() }; },
  ext() { if (!this.meExt.size) return undefined; const o = {}; for (const [k, fn] of this.meExt) { try { o[k] = fn(); } catch (e) {} } return o; },
  /* ----- generic messages for any module (see docs/ARCHITECTURE.md) -----
     Net.on(type, (payload, fromId) => ...)   register a handler (one per type)
     Net.emit(type, payload, opts)           send to everyone else; the host relays client messages.
                                             The sender's own handler is NOT called: apply your change locally first.
                                             opts.host = true: deliver only to the host (requests the host decides on).
                                             opts.to = id: deliver only to that player (relayed through the host).
     Net.share(key, getState, applyState)    host-owned state sent in every snapshot (about 10 per second).
     Net.addMe(key, getter)                  extra per-player data sent with your position (look, held item, pose…);
                                             remote players expose it as player.ext[key]. */
  on(type, fn) { this.handlers.set(type, fn); },
  emit(type, p, opts) {
    if (!this.active) return; opts = opts || {};
    const m = { t: 'x', k: type, p, from: this.myId };
    if (this.isHost) {
      if (opts.host) return;
      if (opts.to) { const c = this.conns.get(opts.to); if (c && c.open) { try { c.send(m); } catch (e) {} } return; }
      this.broadcast(m);
    } else if (this.hostConn && this.hostConn.open) {
      if (opts.host) m.host = true; if (opts.to) m.to = opts.to;
      try { this.hostConn.send(m); } catch (e) {}
    }
  },
  share(key, get, set) { this.shared.set(key, { get, set }); },
  addMe(key, get) { this.meExt.set(key, get); },
  isAuth() { return !this.active || this.isHost; },
  _x(d, fromId) { const fn = this.handlers.get(d.k); if (fn) { try { fn(d.p, fromId); } catch (e) { console.error('Net handler "' + d.k + '" failed', e); } } },
  sharedState() { if (!this.shared.size) return undefined; const o = {}; for (const [k, v] of this.shared) { try { o[k] = v.get(); } catch (e) {} } return o; },
  applyShared(x) { if (!x) return; for (const k in x) { const v = this.shared.get(k); if (v) { try { v.set(x[k]); } catch (e) { console.error('Net shared "' + k + '" failed', e); } } } },

  plObj() { const o = {}; for (const [id, p] of this.players) o[id] = p; return o; },

  async host() {
    await this.lib(); AudioSys.resume();
    const code = await new Promise((res, rej) => {
      let n = 0;
      const attempt = () => {
        const code = Array.from({ length: 5 }, () => pick('ABCDEFGHJKLMNPQRSTUVWXYZ23456789')).join('');
        const peer = new Peer(ROOM_PREFIX + code, this.opts()); let opened = false;
        const to = setTimeout(() => { if (!opened) { try { peer.destroy(); } catch (e) {} rej(new Error('Could not reach the matchmaking server. Try again in a moment.')); } }, 15000);
        peer.on('open', () => { opened = true; clearTimeout(to); this.peer = peer; res(code); });
        peer.on('error', e => {
          if (opened) return this.peerErr(e);
          clearTimeout(to); try { peer.destroy(); } catch (_) {}
          if (e.type === 'unavailable-id' && n++ < 4) attempt(); else rej(new Error(e.message || e.type));
        });
      };
      attempt();
    });
    this.active = true; this.isHost = true; this.room = code; this.myId = this.peer.id; this.hostAI = AI.hasKey();
    this.players.clear(); this.players.set(this.myId, this.me()); this.bind(); Voice.start();
    return code;
  },
  async join(code) {
    await this.lib(); AudioSys.resume(); code = String(code || '').trim().toUpperCase();
    if (code.length < 4) throw new Error('Enter the room code from the host.');
    const welcome = await new Promise((res, rej) => {
      const peer = new Peer(this.opts()); let done = false;
      const fail = m => { if (done) return; done = true; clearTimeout(to); try { peer.destroy(); } catch (e) {} rej(new Error(m)); };
      const to = setTimeout(() => fail('Timed out. Check the room code and try again.'), 16000);
      peer.on('open', id => {
        const conn = peer.connect(ROOM_PREFIX + code, { reliable: true });
        conn.on('open', () => conn.send({ t: 'hello', name: settings.name, color: settings.color, v: VERSION }));
        conn.on('data', d => {
          if (done && this.hostConn === conn) return this.clientRecv(d);
          if (d && d.t === 'welcome') { done = true; clearTimeout(to); this.peer = peer; this.hostConn = conn; this.myId = id; this.room = code; res(d); }
          else if (d && d.t === 'full') fail('That room is full.');
        });
        conn.on('close', () => { if (!done) fail('Could not connect to that room.'); else if (this.hostConn === conn) this.hostLost(); });
      });
      peer.on('error', e => { if (!done) fail(e.type === 'peer-unavailable' ? 'No room found with that code.' : (e.message || e.type)); else this.peerErr(e); });
    });
    this.active = true; this.isHost = false; this.hostAI = !!welcome.hostAI;
    this.bind(); Voice.start(); this.applyPl(welcome.pl); this.applyShared(welcome.x);
    return welcome;
  },
  bind() {
    const p = this.peer;
    p.on('connection', c => this.onConn(c));
    p.on('call', mc => { try { mc.answer(Voice.stream || Voice.silent()); } catch (e) {} this.wireMedia(mc); });
    p.on('disconnected', () => { if (this.active && this.peer === p) { try { p.reconnect(); } catch (e) {} } });
  },
  peerErr(e) { console.warn('peer error', e && e.type, e && e.message); if (!this.active) return; const t = now(); if (e && ['network', 'server-error', 'socket-error', 'socket-closed'].includes(e.type) && t - this.errT > 12) { this.errT = t; toast('Connection trouble (' + e.type + ').', 'bad'); } },

  /* ----- host side ----- */
  onConn(conn) {
    if (!this.isHost) { try { conn.close(); } catch (e) {} return; }
    conn.on('data', d => this.hostRecv(conn, d));
    conn.on('close', () => this.drop(conn.peer)); conn.on('error', () => this.drop(conn.peer));
  },
  hostRecv(conn, d) {
    if (!d || typeof d !== 'object') return; const id = conn.peer;
    if (d.t === 'hello') {
      if (this.players.size >= 6) { conn.send({ t: 'full' }); setTimeout(() => { try { conn.close(); } catch (e) {} }, 400); return; }
      const name = String(d.name || 'Agent').slice(0, 18);
      this.conns.set(id, conn);
      this.players.set(id, { name, color: String(d.color || '#3b82f6').slice(0, 9), x: 8, y: 0, z: 0, ry: 0, seat: -1, talk: false, personal: 0 });
      conn.send({ t: 'welcome', id, g: Game.netState(), hostAI: AI.hasKey(), pl: this.plObj(), x: this.sharedState() });
      toast(name + ' joined.', 'good'); SFX.join(); syncAvatars(this.players, this.myId); return;
    }
    const p = this.players.get(id); if (!p) return;
    if (d.t === 'pos') { if (d.ext && typeof d.ext === 'object') p.ext = d.ext; p.x = +d.x || 0; p.y = +d.y || 0; p.z = +d.z || 0; p.ry = +d.ry || 0; p.seat = d.seat | 0; p.talk = !!d.talk; p.personal = +d.personal || 0; if (d.name) p.name = String(d.name).slice(0, 18); if (d.color) p.color = String(d.color).slice(0, 9); }
    else if (d.t === 'earn') Game.addTeam(clamp(+d.amt || 0, -500, 2000), id);
    else if (d.t === 'x' && typeof d.k === 'string') {
      const m = { t: 'x', k: d.k, p: d.p, from: id };
      if (d.to && d.to !== this.myId) { const c = this.conns.get(d.to); if (c && c.open) { try { c.send(m); } catch (e) {} } return; }
      this._x(m, id);
      if (!d.host && !d.to) this.broadcast(m, id);
    }
    else if (d.t === 'throw') { if (Array.isArray(d.o) && Array.isArray(d.v) && d.o.length === 3 && d.v.length === 3) { spawnBall(d.o.map(Number), d.v.map(Number), false); this.broadcast({ t: 'throw', o: d.o, v: d.v }, id); } }
    else if (d.t === 'ai') {
      const back = m => { try { conn.send(Object.assign({ t: 'air', rid: d.rid }, m)); } catch (e) {} };
      if (!AI.hasKey() || !Array.isArray(d.messages)) return back({ ok: false, err: 'the host has no AI key' });
      const msgs = d.messages.slice(-18).map(m => ({ role: ['system', 'user', 'assistant'].includes(m.role) ? m.role : 'user', content: String(m.content || '').slice(0, 6000) }));
      AI.raw(msgs).then(text => back({ ok: true, text })).catch(e => back({ ok: false, err: e.message }));
    }
  },
  drop(id) {
    if (!this.players.has(id)) return; const p = this.players.get(id);
    this.conns.delete(id); this.players.delete(id); this.closeMedia(id);
    toast((p.name || 'Someone') + ' left.'); syncAvatars(this.players, this.myId);
  },
  broadcast(msg, except) { if (!this.active || !this.isHost) return; for (const [id, c] of this.conns) if (id !== except && c.open) { try { c.send(msg); } catch (e) {} } },

  /* ----- client side ----- */
  clientRecv(d) {
    if (!d || typeof d !== 'object' || !this.active) return;
    if (d.t === 'snap') { this.applyPl(d.pl); Game.applyNet(d.g); Game.syncPhase(d.g); this.applyShared(d.x); }
    else if (d.t === 'x' && typeof d.k === 'string') this._x(d, d.from || 'host');
    else if (d.t === 'phase') Game.onPhase(d);
    else if (d.t === 'evt') { if (d.k === 'earn' && d.id !== this.myId) toast(d.amt >= 0 ? d.name + ' closed a scam: +' + money(d.amt) : d.name + ' got baited: ' + money(d.amt), d.amt >= 0 ? 'good' : 'bad'); }
    else if (d.t === 'throw') spawnBall(d.o, d.v, false);
    else if (d.t === 'air') { const w = this.waiters.get(d.rid); if (w) { this.waiters.delete(d.rid); clearTimeout(w.to); d.ok ? w.res(d.text) : w.rej(new Error(d.err || 'host AI error')); } }
  },
  applyPl(pl) { this.players = new Map(Object.entries(pl || {})); syncAvatars(this.players, this.myId); this.voiceMesh(); },
  askHostAI(messages) {
    return new Promise((res, rej) => {
      if (!this.hostConn || !this.hostConn.open) return rej(new Error('not connected'));
      const rid = ++this.rid, to = setTimeout(() => { this.waiters.delete(rid); rej(new Error('host timed out')); }, 30000);
      this.waiters.set(rid, { res, rej, to }); this.hostConn.send({ t: 'ai', rid, messages });
    });
  },
  hostLost() { if (!this.active) return; toast('The host left. Back to the main menu.', 'bad'); Game.quit(); },

  /* ----- voice mesh ----- */
  voiceMesh() {
    if (!this.active || !this.peer || !Voice.stream) return; const t = now();
    for (const id of this.players.keys()) {
      if (id === this.myId) continue; const mc = this.media.get(id);
      if (mc && !Voice.nodes.has(id) && t - mc._t > 9) { this.closeMedia(id); continue; }
      if (!mc && this.myId < id) { try { const c = this.peer.call(id, Voice.stream); if (c) this.wireMedia(c); } catch (e) {} }
    }
    for (const id of [...this.media.keys()]) if (!this.players.has(id)) this.closeMedia(id);
  },
  wireMedia(mc) {
    const id = mc.peer; mc._t = now(); this.media.set(id, mc);
    mc.on('stream', s => Voice.attach(id, s));
    mc.on('close', () => { if (this.media.get(id) === mc) { this.media.delete(id); Voice.detach(id); } });
    mc.on('error', () => {});
  },
  closeMedia(id) { const mc = this.media.get(id); this.media.delete(id); Voice.detach(id); if (mc) { try { mc.close(); } catch (e) {} } },
  swapTrack(stream) {
    const tr = stream.getAudioTracks()[0]; if (!tr) return;
    for (const mc of this.media.values()) { try { mc.peerConnection.getSenders().forEach(s => { if (s.track && s.track.kind === 'audio') s.replaceTrack(tr); }); } catch (e) {} }
  },

  sendThrow(o, v) { if (!this.active) return; const m = { t: 'throw', o, v }; if (this.isHost) this.broadcast(m); else if (this.hostConn && this.hostConn.open) this.hostConn.send(m); },
  sendEarn(amt) { if (this.hostConn && this.hostConn.open) this.hostConn.send({ t: 'earn', amt }); },
  tick(dt) {
    if (!this.active) return; this.sendT += dt;
    if (this.isHost) {
      if (this.sendT >= 0.1) { this.sendT = 0; this.players.set(this.myId, this.me()); syncAvatars(this.players, this.myId); this.voiceMesh(); this.broadcast({ t: 'snap', pl: this.plObj(), g: Game.netState(), x: this.sharedState() }); }
    } else if (this.sendT >= 0.066) { this.sendT = 0; if (this.hostConn && this.hostConn.open) { try { this.hostConn.send(Object.assign({ t: 'pos' }, this.me())); } catch (e) {} } }
  },
  leave() {
    const was = this.active; this.active = false;
    for (const id of [...this.media.keys()]) this.closeMedia(id); Voice.detachAll();
    for (const w of this.waiters.values()) { clearTimeout(w.to); w.rej(new Error('left')); } this.waiters.clear();
    if (this.peer) { try { this.peer.destroy(); } catch (e) {} }
    this.peer = null; this.hostConn = null; this.conns.clear(); this.players.clear(); this.isHost = false; this.room = ''; this.myId = 'me'; this.hostAI = false;
    if (was) syncAvatars(this.players, this.myId);
  }
};
