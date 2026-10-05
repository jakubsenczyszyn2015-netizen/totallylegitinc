'use strict';
/* =====================================================================
   CLOCK OUT EARLY — end a work-week shift before the timer runs out and go
   straight to the performance review.
   Solo: confirm, then Game.endDay().  Multiplayer: a 30 s vote; a majority of
   everyone online must say yes (non-voters count as no). The host counts.
   Triggers: the punch clock in the hallway (E), the pause menu, the LegitOS
   start menu, F1 / F2 while a vote runs.  See docs/modules/ui.md.
   ===================================================================== */
const CO_IC = '<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="8.6" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="M11 8.2h2.2v4.5l3 1.9-1.1 1.8-4.1-2.6z"/><path d="M8.6 2.2h6.8v2.4H8.6z"/></svg>';
const ClockOut = {
  VOTE_S: 30, COOL_S: 60,
  vote: null,     // host only: { n, by, name, yes: [ids], no: [ids], end }
  view: null,     // what everyone shows: { n, by, name, yes, no, left, total, need } (built by the host, shared)
  cool: 0,        // host: now() before which a new vote may not start
  coolLeft: 0,    // clients: seconds of cooldown left (shared)
  mine: null,     // { n, yes } my vote, shown at once before the host confirms it
  result: null,   // { n, pass, yes, total, name, until } the last result, shown for a moment
  seq: 0, early: false, _t: 0, el: null, dlg: null, clock: null,

  available() { return G.phase === 'day' && G.mode === 'week' && !G.result; },
  cooldown() { return Math.max(0, Net.isHost ? this.cool - now() : this.coolLeft); },
  myVote() { const v = this.view; if (!v) return null; if (this.mine && this.mine.n === v.n) return this.mine.yes; return v.yes.includes(Net.myId) ? true : v.no.includes(Net.myId) ? false : null; },
  tally() { const v = this.view; return v ? v.yes.length + '/' + v.total + ' yes' : ''; },

  /* ----- what the buttons call ----- */
  request() {
    if (!this.available()) { toast(G.mode === 'week' ? 'You can only clock out during a shift.' : 'No clocking out in overtime. The phones never stop.'); return; }
    if (Net.active && this.view) { this.cast(true); return; }
    const cd = Net.active ? this.cooldown() : 0;
    if (cd > 0) { toast('The last vote failed. Try again in ' + Math.ceil(cd) + ' s.', 'bad'); return; }
    this.confirm();
  },
  confirm() {
    if (this.dlg) return;
    const solo = !Net.active, n = Net.players.size, close = () => { if (this.dlg) { this.dlg.remove(); this.dlg = null; } };
    const yes = () => { close(); if (!this.available()) return; solo ? this.endNow() : this.start(); };
    const stat = (k, v, cls) => h('div', { class: 'co-stat ' + (cls || '') }, h('small', {}, k), h('b', {}, v));
    releaseLock();
    this.dlg = h('div', { class: 'overlay', id: 'co-confirm', onclick: e => { if (e.target === this.dlg) close(); } },
      h('div', { class: 'modal co-m' },
        h('header', {}, h('i', { class: 'co-hic', html: CO_IC }), h('div', {}, h('small', {}, 'Punch clock'), h('h2', {}, solo ? 'Clock out now?' : 'Clock out early?'))),
        h('div', { class: 'body' },
          h('p', { class: 'co-q' }, solo ? 'The boss reviews you immediately.' : 'This starts a vote. Everyone gets ' + this.VOTE_S + ' seconds, and a majority of the ' + n + ' agents online has to say yes.'),
          h('div', { class: 'co-stats' }, stat('Time left', fmtTime(G.timeLeft)), stat('Team', money(G.team), G.team >= G.quota ? 'ok' : 'bad'), stat('Quota', money(G.quota), 'q')),
          h('p', { class: 'note' }, G.team >= G.quota ? 'Quota met. Go home a hero.' : 'Quota not met yet. Leaving now gets you fired.'),
          h('div', { class: 'row co-acts' },
            h('button', { class: 'btn primary', onclick: yes }, solo ? 'Clock out now' : 'Start the vote'),
            h('button', { class: 'btn', onclick: close }, 'Keep working')))));
    this.dlg._yes = yes; this.dlg._no = close;
    document.body.append(this.dlg);
  },
  endNow() {       // solo, or the host after a vote passed
    if (!this.available()) return;
    if (!Net.active) this.punch(); this.early = true;
    try { Game.endDay(); } finally { this.early = false; }
  },
  start() { this.punch(); if (Net.isHost) this.hostStart(Net.myId); else Net.emit('co:start', {}, { host: true }); },
  cast(yes) {
    const v = this.view; if (!v || !this.available()) return;
    this.mine = { n: v.n, yes: !!yes }; SFX.click(); this.render();
    if (Net.isHost) this.hostCast(Net.myId, !!yes); else Net.emit('co:vote', { n: v.n, yes: !!yes }, { host: true });
  },

  /* ----- host: count the votes ----- */
  hostStart(id) {
    const tell = t => { if (id === Net.myId) toast(t, 'bad'); else Net.emit('co:msg', { text: t }, { to: id }); };
    if (!this.available()) return tell('You can only clock out during a work-week shift.');
    if (this.vote) return this.hostCast(id, true);
    const cd = this.cool - now(); if (cd > 0) return tell('The last vote failed. Try again in ' + Math.ceil(cd) + ' s.');
    const p = Net.players.get(id);
    this.vote = { n: ++this.seq, by: id, name: String((p && p.name) || 'Someone').slice(0, 18), yes: [id], no: [], end: now() + this.VOTE_S };
    this.hostUpdate();
  },
  hostCast(id, yes) {
    const v = this.vote; if (!v || !Net.players.has(id)) return;
    v.yes = v.yes.filter(x => x !== id); v.no = v.no.filter(x => x !== id); (yes ? v.yes : v.no).push(id);
    this.hostUpdate();
  },
  /* re-count (players may have left or joined), decide, publish */
  hostUpdate() {
    const v = this.vote; if (!v) return;
    if (!this.available()) { this.vote = null; this.setView(null); return; }
    const total = Math.max(1, Net.players.size), need = Math.floor(total / 2) + 1, left = v.end - now();
    v.yes = v.yes.filter(x => Net.players.has(x)); v.no = v.no.filter(x => Net.players.has(x));
    if (v.yes.length >= need) return this.hostFinish(true, total);
    if (v.yes.length + (total - v.yes.length - v.no.length) < need || left <= 0) return this.hostFinish(false, total);
    this.setView({ n: v.n, by: v.by, name: v.name, yes: v.yes.slice(), no: v.no.slice(), left: Math.round(left * 10) / 10, total, need });
  },
  hostFinish(pass, total) {
    const v = this.vote; this.vote = null;
    const r = { n: v.n, pass, yes: v.yes.length, total, name: v.name };
    if (!pass) this.cool = now() + this.COOL_S;
    this.setView(null); Net.emit('co:result', r); this.showResult(r);
    if (pass) setTimeout(() => this.endNow(), 1400);   // let everyone see the result first
  },
  setView(v) { this.view = v; this.render(); },
  shared() { return this.view || (this.cool > now() ? { cool: Math.ceil(this.cool - now()) } : 0); },
  applyShared(s) {
    if (Net.isHost) return;
    this.coolLeft = (s && +s.cool) || 0;
    const v = s && s.n && Array.isArray(s.yes) && Array.isArray(s.no) ? s : null;
    if (!v && !this.view) return;
    this.view = v; this.render();
  },
  showResult(r) {
    if (!r) return;
    this.view = null; this.result = Object.assign({ until: now() + 3.2 }, r);
    toast(r.pass ? 'Vote passed (' + r.yes + '/' + r.total + '): everyone clocks out early!' : 'Vote failed (' + r.yes + '/' + r.total + ' yes). Back to work.', r.pass ? 'good' : 'bad');
    r.pass ? this.punch() : SFX.bad();
    this.render();
  },
  reset() { this.vote = null; this.view = null; this.mine = null; this.result = null; this.cool = 0; this.coolLeft = 0; if (this.dlg) { this.dlg.remove(); this.dlg = null; } this.render(); },

  /* ----- the vote panel (top centre, also over the desktop and the pause menu) ----- */
  build() {
    const b = (cls, key, label, yes) => h('button', { class: 'cv-b ' + cls, onclick: e => { e.stopPropagation(); this.cast(yes); } }, h('kbd', {}, key), h('span', {}, label));
    this.$t = h('div', { class: 'cv-title' }); this.$pips = h('div', { class: 'cv-pips' }); this.$n = h('span', { class: 'cv-n' });
    this.$s = h('b', {}); this.$yes = b('yes', 'F1', 'Yes, clock out', true); this.$no = b('no', 'F2', 'No, keep working', false);
    this.$res = h('div', { class: 'cv-res' });
    this.el = h('div', { id: 'co-vote', class: 'hidden', 'aria-live': 'polite' },
      h('div', { class: 'cv-top' }, h('i', { class: 'cv-ic', html: CO_IC }), h('div', { class: 'cv-main' }, h('small', {}, 'Clock-out vote'), this.$t, h('div', { class: 'cv-meta' }, this.$pips, this.$n)), h('div', { class: 'cv-time' }, this.$s)),
      h('div', { class: 'cv-btns' }, this.$yes, this.$no), this.$res);
    document.body.append(this.el);
    // pause menu button (between Resume and Settings)
    const body = $('#pause .body');
    if (body) {
      const set = $$('.btn', body).find(x => /settings/i.test(x.textContent));
      body.insertBefore(h('button', { class: 'btn co-btn', id: 'pause-clockout', onclick: () => this.request() }, h('i', { class: 'co-bi', html: CO_IC }), h('span', {}, 'Clock out early')), set || null);
    }
    const _pause = Game.pause;
    Game.pause = function () { const r = _pause.apply(this, arguments); try { ClockOut.pauseBtn(); } catch (e) {} return r; };
    // LegitOS start menu item (above "Quit to main menu")
    const _rp = OS.renderPower;
    OS.renderPower = function () { const r = _rp.apply(this, arguments); try { ClockOut.powerItem(); } catch (e) { console.error('clockout power menu', e); } return r; };
    this.pauseBtn();
  },
  render() {
    const el = this.el; if (!el) return;
    const r = this.result, v = !r && Net.active && G.phase === 'day' ? this.view : null, show = !!(r || v);
    if (el._on !== show) { el._on = show; el.classList.toggle('hidden', !show); document.body.classList.toggle('co-voting', show); }
    if (G.paused) this.pauseBtn();
    if (!show) { el._k = ''; return; }
    if (r) {
      const k = 'r' + r.n + r.pass; if (el._k === k) return; el._k = k;
      el.className = 'res ' + (r.pass ? 'pass' : 'fail');
      this.$res.replaceChildren(h('b', {}, r.pass ? 'Clocking out!' : 'Vote failed'), h('small', {}, r.yes + ' of ' + r.total + ' said yes · ' + (r.pass ? 'to the review room' : 'back to work')));
      return;
    }
    const mv = this.myVote(), left = Math.max(0, v.left), k = v.n + '|' + v.yes.length + '|' + v.no.length + '|' + v.total + '|' + mv + '|' + Math.ceil(left);
    el.style.setProperty('--p', (left / this.VOTE_S).toFixed(3));
    if (el._k === k) return; el._k = k;
    el.className = (mv == null ? '' : 'voted') + (left < 8 ? ' hurry' : '');
    const me = v.by === Net.myId;
    this.$t.replaceChildren(h('b', {}, me ? 'You' : v.name), me ? ' want to clock out early' : ' wants to clock out early');
    const pips = []; for (let i = 0; i < v.total; i++) pips.push(h('i', { class: i < v.yes.length ? 'y' : i < v.yes.length + v.no.length ? 'n' : '' }));
    this.$pips.replaceChildren(...pips);
    this.$n.textContent = v.yes.length + '/' + v.total + ' yes · ' + v.need + ' needed';
    this.$s.textContent = Math.ceil(left);
    this.$yes.classList.toggle('on', mv === true); this.$no.classList.toggle('on', mv === false);
  },
  pauseBtn() {
    const b = $('#pause-clockout'); if (!b) return;
    const ok = this.available(); b.classList.toggle('hidden', !ok); if (!ok) return;
    const cd = Net.active && !this.view ? this.cooldown() : 0, mv = this.myVote();
    const t = !Net.active ? 'Clock out early' : this.view ? (mv === true ? 'You voted yes (' + this.tally() + ')' : 'Vote yes to clock out (' + this.tally() + ')') : cd > 0 ? 'Vote again in ' + Math.ceil(cd) + ' s' : 'Vote to clock out early';
    b.disabled = cd > 0 || mv === true; if (b.lastChild.textContent !== t) b.lastChild.textContent = t;
  },
  powerItem() {
    const list = $('#powermenu .pm-list'); if (!list || !this.available()) return;
    const cd = Net.active && !this.view ? this.cooldown() : 0;
    const label = !Net.active ? 'Clock out early' : this.view ? 'Vote to clock out' : 'Vote to clock out early';
    const sub = !Net.active ? 'End the shift now. Straight to the review.' : this.view ? this.tally() + ' so far · F1 yes, F2 no' : cd > 0 ? 'The last vote failed. Again in ' + Math.ceil(cd) + ' s' : 'A ' + this.VOTE_S + ' s vote. A majority ends the shift.';
    list.insertBefore(h('button', { class: 'pm-item co-pm', disabled: cd > 0, onclick: () => { OS.power(false); SFX.click(); this.request(); } },
      h('i', { class: 'ti', style: { background: '#f08c00' }, html: OS.glyph('clock') }), h('span', {}, h('b', {}, label), h('small', {}, sub))), list.querySelector('.pm-item.quit'));
  },

  /* ----- the punch clock on the hallway wall, by the main door ----- */
  punch() {
    try { AudioSys.noise(0.08, 0.22, 0, 900); AudioSys.tone(180, 0.09, 'square', 0.12, 0.02, 90); AudioSys.tone(1400, 0.05, 'triangle', 0.08, 0.13); } catch (e) {}
    if (this.clock) this.clock.punchT = 0.5;
  },
  buildClock() {
    const X = 18.75, Y = 1.36, WZ = 1.70, ry = Math.PI;                 // on the north hallway wall, facing the hallway (-z)
    const M = (x, y, z, o) => xf(X - x, Y + y, WZ - z, Object.assign({ ry }, o || {}));   // local: +x right, +z out of the wall
    const it = [];
    it.push(rboxGeo(0.5, 0.7, 0.03, 0.03, 2), M(0.05, 0, 0.015), '#4a3a2c');                      // backplate
    it.push(rboxGeo(0.38, 0.52, 0.15, 0.045, 2), M(0, 0.02, 0.105), '#e6d9b8');                   // body
    it.push(rboxGeo(0.4, 0.06, 0.17, 0.025, 2), M(0, 0.29, 0.105), '#c9b48a');                    // top cap
    it.push(cylGeo(0.142, 0.142, 0.035, 28), M(0, 0.1, 0.19, { rx: Math.PI / 2 }), '#c9ccd2');      // dial bezel
    it.push(rboxGeo(0.24, 0.075, 0.05, 0.015, 1), M(-0.03, -0.13, 0.2), '#2b2b30');               // card slot block
    it.push(boxGeo(0.16, 0.012, 0.02), M(-0.03, -0.12, 0.226), '#0b0b0d');                        // slot
    it.push(cylGeo(0.04, 0.046, 0.035, 20), M(0.125, -0.13, 0.2, { rx: Math.PI / 2 }), '#d6342c'); // big red button
    it.push(cylGeo(0.028, 0.028, 0.02, 16), M(0.125, -0.13, 0.226, { rx: Math.PI / 2 }), '#ff6a5c');
    it.push(boxGeo(0.21, 0.5, 0.02), M(0.4, -0.02, 0.01), '#8a8f98');                             // card rack
    for (let i = 0; i < 4; i++) {
      it.push(boxGeo(0.21, 0.035, 0.045), M(0.4, -0.22 + i * 0.13, 0.035), '#6f747d');
      it.push(boxGeo(0.085, 0.13, 0.004), M(0.36 + (i % 2) * 0.07, -0.17 + i * 0.13 + (i * 37 % 5) * 0.006, 0.04, { rz: (i % 2 ? 0.06 : -0.05) }), ['#f0dfa8', '#f6e7b8', '#e9d59a', '#f3e2ae'][i]);
    }
    const body = new THREE.Mesh(mergeGeos(it), new THREE.MeshLambertMaterial({ vertexColors: true }));
    body.matrixAutoUpdate = false; body.receiveShadow = true; W.scene.add(body);
    // dial (redrawn with the shift time while someone is near) + sign + brass plate
    const dc = document.createElement('canvas'); dc.width = dc.height = 256;
    const dtex = new THREE.CanvasTexture(dc), dial = new THREE.Mesh(new THREE.CircleGeometry(0.125, 32), new THREE.MeshLambertMaterial({ map: dtex }));
    dial.applyMatrix4(M(0, 0.1, 0.2085)); dial.matrixAutoUpdate = false; W.scene.add(dial);
    const sc = document.createElement('canvas'); sc.width = 512; sc.height = 256;
    const stex = new THREE.CanvasTexture(sc); stex.anisotropy = 4;
    const sg = new THREE.PlaneGeometry(0.66, 0.226), pg = new THREE.PlaneGeometry(0.21, 0.028), uv = (g, v0, v1) => { const a = g.attributes.uv; for (let i = 0; i < a.count; i++) a.setY(i, a.getY(i) ? v1 : v0); };
    uv(sg, 80 / 256, 1); uv(pg, 6 / 256, 74 / 256);
    const signs = new THREE.Mesh(mergeGeos([sg, M(0.05, 0.56, 0.004), 0xffffff, pg, M(0, -0.205, 0.1805), 0xffffff]), new THREE.MeshLambertMaterial({ map: stex, alphaTest: 0.5 }));
    signs.matrixAutoUpdate = false; W.scene.add(signs);
    // the time card in the top slot (it dips in when someone punches)
    const card = new THREE.Mesh(boxGeo(0.085, 0.15, 0.004), mat('#f0dfa8')); card.position.set(X, Y + 0.31, WZ - 0.12); card.rotation.y = ry; W.scene.add(card);
    const C = this.clock = { dc, dtex, sc, stex, card, punchT: 0, minute: -1, pos: new THREE.Vector3(X, Y, WZ - 0.25) };
    this.drawSign(); this.drawDial(9);
    W.interact.push({ pos: new THREE.Vector3(X, Y - 0.05, WZ - 0.22), label: () => this.label(), act: () => this.request() });
    W.colliders.push({ x0: X - 0.55, x1: X + 0.22, z0: WZ - 0.24, z1: WZ, y1: 1.8 });
    return C;
  },
  label() {
    if (!this.available()) return null;
    if (!Net.active) return 'Clock out early';
    if (this.view) return this.myVote() === true ? null : 'Vote to clock out (' + this.tally() + ')';
    const cd = this.cooldown(); return cd > 0 ? 'Vote failed. Punch again in ' + Math.ceil(cd) + ' s' : 'Start a vote to clock out early';
  },
  drawSign() {
    const C = this.clock; if (!C) return; const g = C.sc.getContext('2d'), Wd = 512;
    g.clearRect(0, 0, Wd, 256);
    // sign: yellow plate, ink border, "CLOCK OUT" + small print
    g.fillStyle = '#16110f'; rrect(g, 4, 4, Wd - 8, 168, 22); g.fill();
    g.fillStyle = '#ffd23b'; rrect(g, 12, 12, Wd - 24, 152, 16); g.fill();
    g.fillStyle = '#d6342c'; rrect(g, 12, 12, Wd - 24, 40, 16); g.fill(); g.fillRect(12, 34, Wd - 24, 18);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#fff'; g.font = '700 26px ' + FONT.menu; g.fillText('TOTALLY LEGIT INC. · STAFF ONLY', Wd / 2, 33);
    g.font = '86px ' + FONT.chunky; g.lineJoin = 'round'; g.lineWidth = 10; g.strokeStyle = '#16110f'; g.strokeText('CLOCK OUT', Wd / 2, 102); g.fillStyle = '#fff6df'; g.fillText('CLOCK OUT', Wd / 2, 102);
    g.fillStyle = '#3a2512'; g.font = '700 23px ' + FONT.menu; g.fillText('Leaving early? The Boss reviews you on the spot.', Wd / 2, 147);
    // brass plate under the slot
    const gr = g.createLinearGradient(0, 180, 0, 256); gr.addColorStop(0, '#f2cf72'); gr.addColorStop(1, '#a87b2a');
    g.fillStyle = gr; rrect(g, 6, 182, Wd - 12, 68, 12); g.fill();
    g.fillStyle = '#3a2512'; g.font = '46px ' + FONT.slab; g.fillText('PUNCH-O-MATIC 3000', Wd / 2, 218);
    C.stex.needsUpdate = true;
  },
  /* hour: 9 (start of the shift) .. 17 (end) */
  drawDial(hour) {
    const C = this.clock; if (!C) return; const g = C.dc.getContext('2d'), c = 128;
    g.fillStyle = '#c9ccd2'; g.fillRect(0, 0, 256, 256);
    g.fillStyle = '#fbf5e6'; g.beginPath(); g.arc(c, c, 124, 0, 7); g.fill();
    g.strokeStyle = '#16110f'; g.lineWidth = 5; g.stroke();
    g.fillStyle = '#16110f'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '30px ' + FONT.chunky;
    for (let i = 1; i <= 12; i++) { const a = i / 12 * Math.PI * 2; g.fillText(String(i), c + Math.sin(a) * 96, c - Math.cos(a) * 96); }
    for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2, r0 = i % 5 ? 114 : 108; g.lineWidth = i % 5 ? 2 : 4; g.beginPath(); g.moveTo(c + Math.sin(a) * r0, c - Math.cos(a) * r0); g.lineTo(c + Math.sin(a) * 120, c - Math.cos(a) * 120); g.stroke(); }
    g.font = '700 15px ' + FONT.menu; g.fillStyle = '#d6342c'; g.fillText(hour >= 17 ? 'HOME TIME' : 'ON THE CLOCK', c, c + 46);
    g.fillStyle = '#5a4a3a'; g.font = '700 13px ' + FONT.menu; g.fillText('LEGIT TIME', c, c - 44);
    const hand = (a, len, w, col) => { g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(c - Math.sin(a) * 14, c + Math.cos(a) * 14); g.lineTo(c + Math.sin(a) * len, c - Math.cos(a) * len); g.stroke(); };
    hand((hour % 12) / 12 * Math.PI * 2, 58, 10, '#16110f'); hand((hour % 1) * Math.PI * 2, 88, 6, '#16110f');
    g.fillStyle = '#d6342c'; g.beginPath(); g.arc(c, c, 9, 0, 7); g.fill();
    C.dtex.needsUpdate = true;
  },
  tick(dt) {
    if (Net.isHost && this.vote && now() - this._t > 0.25) { this._t = now(); this.hostUpdate(); }
    if (this.result && now() > this.result.until) { this.result = null; this.render(); }
    else if (this.view && !Net.active) { this.view = null; this.render(); }
    const C = this.clock; if (!C || G.phase === 'menu') return;
    if (C.punchT > 0) { C.punchT = Math.max(0, C.punchT - dt); C.card.position.y = 1.36 + 0.31 - Math.sin(C.punchT / 0.5 * Math.PI) * 0.09; }
    // the dial follows the shift (9:00 → 17:00) in 5-minute steps, only while the clock is close enough to read
    const dx = P.pos.x - C.pos.x, dz = P.pos.z - C.pos.z; if (dx * dx + dz * dz > 100 && C.minute >= 0) return;
    const hr = G.mode === 'week' && G.dayLen > 1 ? (G.phase === 'day' ? 9 + 8 * clamp(1 - G.timeLeft / G.dayLen, 0, 1) : G.phase === 'review' ? 17 : 9) : 17;
    const m = Math.round(hr * 12); if (m !== C.minute) { C.minute = m; this.drawDial(m / 12); }
  }
};

/* the host adds a line for The Boss when the shift ended early (reviewLines runs inside Game.endDay) */
if (typeof reviewLines === 'function') {
  const _rl = reviewLines;
  reviewLines = function (res) {
    const L = _rl(res);
    if (ClockOut.early && Array.isArray(L)) {
      res.early = Math.round(Math.max(0, G.timeLeft));
      L.splice(Math.min(1, L.length), 0, pick(['You clocked out with ' + fmtTime(res.early) + ' still on the clock. Bold.', 'Leaving ' + fmtTime(res.early) + ' early? I admire the confidence. Not the numbers.', 'Somebody punched out early. The punch clock told me everything.']));
    }
    return L;
  };
}
Net.on('co:start', (p, from) => { if (Net.isHost) ClockOut.hostStart(from); });
Net.on('co:vote', (p, from) => { if (Net.isHost && ClockOut.vote && p && p.n === ClockOut.vote.n) ClockOut.hostCast(from, !!p.yes); });
Net.on('co:result', p => { if (!Net.isHost && p && typeof p === 'object') ClockOut.showResult({ n: +p.n || 0, pass: !!p.pass, yes: +p.yes || 0, total: +p.total || 1, name: String(p.name || '') }); });
Net.on('co:msg', p => { if (p && p.text) toast(String(p.text).slice(0, 140), 'bad'); });
Net.share('clockout', () => ClockOut.shared(), s => ClockOut.applyShared(s));
Bus.on('world:built', () => { try { ClockOut.buildClock(); } catch (e) { console.error('punch clock', e); } });
Bus.on('fonts:ready', () => { ClockOut.drawSign(); if (ClockOut.clock) ClockOut.clock.minute = -1; });
Bus.on('boot', () => ClockOut.build());
Bus.on('game:begin', () => ClockOut.reset());
Bus.on('quit', () => ClockOut.reset());
Bus.on('day:start', () => { ClockOut.vote = null; ClockOut.view = null; ClockOut.mine = null; ClockOut.cool = 0; ClockOut.coolLeft = 0; ClockOut.render(); });
Bus.on('review', () => { ClockOut.vote = null; ClockOut.view = null; ClockOut.mine = null; if (ClockOut.dlg) { ClockOut.dlg.remove(); ClockOut.dlg = null; } ClockOut.render(); });
Loop.add(dt => ClockOut.tick(dt));
/* F1 = yes, F2 = no while a vote runs; Esc / Enter answer the confirm box (capture phase: before main.js) */
window.addEventListener('keydown', e => {
  if (e.code === 'F1' || e.code === 'F2') {
    if (Net.active && ClockOut.view && ClockOut.available()) { e.preventDefault(); if (!e.repeat) ClockOut.cast(e.code === 'F1'); }
  } else if (ClockOut.dlg && (e.code === 'Escape' || e.code === 'Enter' || e.code === 'NumpadEnter')) {
    e.preventDefault(); e.stopImmediatePropagation(); (e.code === 'Escape' ? ClockOut.dlg._no : ClockOut.dlg._yes)();
  }
}, true);
