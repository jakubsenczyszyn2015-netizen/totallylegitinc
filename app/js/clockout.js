'use strict';
/* =====================================================================
   CLOCK OUT EARLY — end the shift now and go straight to the performance review.
   Singleplayer: a time-card confirm. Multiplayer: anyone can call a vote and a strict majority of the
   players in the room must say yes within 30 s (both of 2, 2 of 3, 3 of 4…). The host runs the vote
   (Net.share 'clockout'), clients send 'co:start' / 'co:vote' requests.
   Ways in: the punch clock beside the main door (E), the pause menu, the LegitOS start menu,
   Y / N (or the buttons) while a vote is running. API: docs/modules/multiplayer.md
   ===================================================================== */
const ClockOut = (() => {
  const VOTE_SECS = 30, COOL = 25, MIN_LEFT = 15;
  // v = { id, by, nm, yes: [ids], no: [ids], left (s), res: '' | 'pass' | 'fail', resT }
  const V = { v: null, n: 0, cool: new Map(), early: 0, el: null, modal: null, sig: '', tT: 0 };
  const EARLY = {
    pass: ['You all clocked out with {t} still on the clock. The quota is met, so I will allow it. This once.', 'Punching out {t} early. Bold. Lucky for you, the numbers add up.'],
    fail: ['You clocked out {t} early AND missed the quota. That takes a special kind of talent.', 'Punching out with {t} left on the clock while the quota burns? Interesting career move.']
  };
  const need = n => Math.floor(Math.max(1, n) / 2) + 1;
  const ids = () => Net.active ? [...Net.players.keys()] : [Net.myId];
  const nameOf = id => { if (id === Net.myId) return settings.name || 'You'; const p = Net.players.get(id); return p ? p.name : 'Someone'; };
  const colorOf = id => { if (id === Net.myId) return settings.color; const p = Net.players.get(id); return (p && p.color) || '#8a8f9c'; };
  const active = () => !!(V.v && !V.v.res);
  const myVote = () => !V.v ? null : V.v.yes.includes(Net.myId) ? 'yes' : V.v.no.includes(Net.myId) ? 'no' : null;
  /* why clocking out is not possible right now ('' = it is; 'x' = not, and say nothing) */
  function why() {
    if (G.phase === 'menu' || G.phase === 'review') return 'x';
    if (G.mode !== 'week') return 'Overtime has no clock to punch. Quit from the pause menu to go home.';
    if (G.phase === 'lobby') return 'The shift has not started yet.';
    if (G.timeLeft < MIN_LEFT) return 'The shift is nearly over anyway. Hang in there.';
    return '';
  }
  function chunk() { AudioSys.noise(0.06, 0.28, 0, 700); AudioSys.tone(150, 0.12, 'square', 0.12, 0.03, 70); AudioSys.tone(2300, 0.18, 'sine', 0.06, 0.17); }

  /* ----- entry point: the punch clock, the pause menu, the start menu ----- */
  function request() {
    const w = why(); if (w) { if (w !== 'x') toast(w); return; }
    if (active()) {
      if (myVote() === 'yes') toast('Waiting for the others: ' + V.v.yes.length + ' of ' + need(ids().length) + ' want to clock out.');
      else cast(true);
      return;
    }
    if (V.v && V.v.res) return;
    confirmCard();
  }
  function go() {
    closeCard(); if (G.paused) Game.pause(false);
    if (why()) return;
    if (!Net.active) { punch(); return; }
    if (Net.isHost) start(Net.myId); else Net.emit('co:start', {}, { host: true });   // the vote panel shows up with the host's next snapshot
  }

  /* ----- the host runs the vote ----- */
  function tell(id, msg) { if (id === Net.myId) toast(msg); else Net.emit('co:msg', { m: msg }, { to: id }); }
  function start(id) {
    if (!Net.isAuth() || active() || (V.v && V.v.res)) return;
    const w = why(); if (w) { if (w !== 'x') tell(id, w); return; }
    const t = now(), c = V.cool.get(id) || 0;
    if (t < c) { tell(id, 'Easy. You can call another clock-out vote in ' + Math.ceil(c - t) + ' s.'); return; }
    V.v = { id: ++V.n, by: id, nm: String(nameOf(id)).slice(0, 18), yes: [id], no: [], left: VOTE_SECS, res: '', resT: 0 };
    started(); tally(); show();
  }
  function mark(id, yes) { const v = V.v; v.yes = v.yes.filter(x => x !== id); v.no = v.no.filter(x => x !== id); (yes ? v.yes : v.no).push(id); }
  function vote(id, vid, yes) {
    const v = V.v; if (!v || v.res || v.id !== vid || (Net.active && !Net.players.has(id))) return;
    mark(id, !!yes); tally(); show();
  }
  function tally() {
    const v = V.v; if (!v || v.res) return;
    const all = ids(), n = all.length, k = need(n);
    v.yes = v.yes.filter(x => all.includes(x)); v.no = v.no.filter(x => all.includes(x));
    if (v.yes.length >= k) finish('pass');
    else if (n - v.no.length < k || v.left <= 0) finish('fail');
  }
  function finish(res) {
    const v = V.v; v.res = res; v.resT = res === 'pass' ? 2.4 : 3;
    if (res === 'fail') V.cool.set(v.by, now() + COOL);
    feedback(res); show();
    if (res === 'pass') setTimeout(() => { if (V.v === v && G.phase === 'day') punch(); }, 1300);
  }
  /* end the day now (host / singleplayer); reviewLines below adds The Boss's comment */
  function punch() {
    if (!Game.authority() || G.phase !== 'day' || G.mode !== 'week') return;
    V.early = Math.max(1, G.timeLeft); chunk();
    Bus.emit('clockout', { left: V.early });
    try { Game.endDay(); } finally { V.early = 0; }
  }
  /* the local player votes */
  function cast(yes) {
    const v = V.v; if (!v || v.res) return;
    if (myVote() === (yes ? 'yes' : 'no')) return;
    SFX.click();
    if (Net.isAuth()) vote(Net.myId, v.id, yes);
    else { mark(Net.myId, yes); Net.emit('co:vote', { id: v.id, y: yes ? 1 : 0 }, { host: true }); show(); }
  }
  function started() {
    if (V.v.by === Net.myId) return;
    AudioSys.tone(660, 0.12, 'triangle', 0.12); AudioSys.tone(990, 0.16, 'triangle', 0.12, 0.13);
  }
  function feedback(res) {
    if (res === 'pass') { chunk(); toast('Vote passed: everyone clocks out. Time to face The Boss.', 'good'); }
    else { AudioSys.tone(300, 0.18, 'sawtooth', 0.08); AudioSys.tone(200, 0.3, 'sawtooth', 0.08, 0.16); toast('Clock-out vote failed. Back to the phones.', 'bad'); }
  }

  /* ----- network ----- */
  Net.on('co:start', (d, from) => { if (Net.isHost) start(from); });
  Net.on('co:vote', (d, from) => { if (Net.isHost && d && typeof d === 'object') vote(from, d.id | 0, !!d.y); });
  Net.on('co:msg', (d, from) => { if (!Net.isHost && Net.hostConn && from === Net.hostConn.peer && d && typeof d.m === 'string') toast(d.m.slice(0, 140)); });
  Net.share('clockout', () => { const v = V.v; return v ? { i: v.id, b: v.by, nm: v.nm, y: v.yes, n: v.no, l: Math.round(v.left * 10) / 10, r: v.res } : 0; }, s => {
    if (Net.isHost) return;
    if (!s || typeof s !== 'object') { if (V.v) { V.v = null; show(); } return; }
    const list = a => Array.isArray(a) ? a.filter(x => typeof x === 'string').slice(0, 8) : [], prev = V.v;
    V.v = { id: s.i | 0, by: String(s.b || '').slice(0, 64), nm: String(s.nm || 'Someone').slice(0, 18), yes: list(s.y), no: list(s.n), left: clamp(+s.l || 0, 0, VOTE_SECS), res: s.r === 'pass' || s.r === 'fail' ? s.r : '' };
    if (prev && prev.id === V.v.id && !V.v.res) { const m = prev.yes.includes(Net.myId) ? 'y' : prev.no.includes(Net.myId) ? 'n' : '';   // keep my fresh vote until the host has it
      if (m && !V.v.yes.includes(Net.myId) && !V.v.no.includes(Net.myId)) mark(Net.myId, m === 'y'); }
    if (!prev || prev.id !== V.v.id) started();
    if (V.v.res && (!prev || prev.id !== V.v.id || prev.res !== V.v.res)) feedback(V.v.res);
    show();
  });

  Loop.add(dt => {
    const v = V.v; if (!v) return;
    if (Net.isAuth()) {
      if (v.res) { v.resT -= dt; if (v.resT <= 0) { V.v = null; show(); return; } }
      else if (G.phase !== 'day') { V.v = null; show(); return; }
      else { v.left -= dt; tally(); }
    } else if (!v.res) v.left = Math.max(0, v.left - dt);
    if ((V.tT += dt) > 0.25) { V.tT = 0; tick(); }
  });
  Bus.on('quit', () => { V.v = null; V.cool.clear(); closeCard(); show(); });
  Bus.on('game:begin', () => { V.v = null; V.cool.clear(); show(); });
  Bus.on('review', () => { closeCard(); show(); });

  /* The Boss mentions it in the review (Game.endDay → reviewLines) */
  if (typeof reviewLines === 'function') {
    const _rl = reviewLines;
    reviewLines = function (res) {
      const L = _rl(res);
      if (V.early > 0) { res.early = Math.round(V.early); L.splice(Math.min(1, L.length), 0, pick(res.pass ? EARLY.pass : EARLY.fail).replace('{t}', fmtTime(V.early))); }
      return L;
    };
  }

  /* ----- UI: the confirm time card ----- */
  function confirmCard() {
    closeCard(); releaseLock();
    const mp = Net.active, n = ids().length, short = G.quota - G.team, pct = clamp(G.team / Math.max(1, G.quota), 0, 1);
    const ok = h('button', { class: 'btn primary', onclick: go }, mp ? 'Call a vote' : 'Punch out');
    const card = h('div', { class: 'co-card' },
      h('div', { class: 'co-holes' }), h('div', { class: 'co-kick' }, 'Totally Legit Inc. · Time card · ' + DAYS[(G.day - 1) % 5]),
      h('h2', {}, 'Clock out early?'),
      h('p', { class: 'co-sub' }, mp ? 'Everybody votes. ' + need(n) + ' of ' + n + ' must agree, then you all face The Boss.' : 'The Boss reviews you right now. The shift ends when you punch out.'),
      h('div', { class: 'co-rows' },
        h('div', { class: 'co-row' }, h('span', {}, 'Shift left'), h('b', {}, fmtTime(G.timeLeft))),
        h('div', { class: 'co-row' }, h('span', {}, 'Team'), h('b', { class: 'g' }, money(G.team)), h('span', { class: 'co-of' }, 'of ' + money(G.quota))),
        h('div', { class: 'co-bar' }, h('i', { style: { width: (pct * 100).toFixed(1) + '%' } }))),
      h('p', { class: 'co-warn ' + (short > 0 ? 'bad' : 'good') }, short > 0 ? money(short) + ' short of quota. That is a firing.' : 'Quota met. Go home early!'),
      h('div', { class: 'co-acts' }, ok, h('button', { class: 'btn', onclick: closeCard }, 'Keep working')),
      h('small', { class: 'co-keys' }, h('kbd', {}, 'Enter'), ' punch out   ', h('kbd', {}, 'Esc'), ' cancel'));
    V.modal = h('div', { id: 'co-modal' }, card);
    document.body.append(V.modal); setTimeout(() => ok.focus(), 30); SFX.open();
  }
  function closeCard() { if (V.modal) { V.modal.remove(); V.modal = null; } }

  /* ----- UI: the vote panel (top centre, over the 3D view and the desktop) ----- */
  const CLOCK_SVG = '<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="8.5" fill="#fff6dc" stroke="currentColor" stroke-width="2.4"/><path d="M12 8.6V13l3 2" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M5 4.5l3 -1.6M19 4.5l-3 -1.6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';
  function show() {
    const v = G.phase === 'day' || (V.v && !V.v.res) ? V.v : null;   // the review takes the screen as soon as it starts
    if (!v) { if (V.el) { V.el.classList.add('out'); const el = V.el; V.el = null; V.sig = ''; setTimeout(() => el.remove(), 260); } return; }
    const all = ids(), n = all.length, me = myVote(), sig = [v.id, v.yes.join(), v.no.join(), v.res, all.join(), me].join('|');
    if (V.el && sig === V.sig) return tick();
    V.sig = sig;
    const pips = all.map(id => { const s = v.yes.includes(id) ? 'yes' : v.no.includes(id) ? 'no' : 'wait';
      return h('span', { class: 'co-pip ' + s }, h('i', { style: { background: colorOf(id) } }), nameOf(id) + (id === Net.myId ? ' (you)' : ''), h('em', {}, s === 'yes' ? '✓' : s === 'no' ? '✕' : '?')); });
    const btn = (yes, label) => h('button', { class: 'co-b ' + (yes ? 'yes' : 'no') + (me === (yes ? 'yes' : 'no') ? ' on' : ''), onclick: () => cast(yes) }, h('kbd', {}, yes ? 'Y' : 'N'), label);
    const el = h('div', { id: 'co-vote', class: v.res ? 'done ' + v.res : '' },
      h('div', { class: 'co-vh' }, h('i', { class: 'co-ic', html: CLOCK_SVG }), h('b', {}, 'Clock out early?'), h('span', { class: 'co-t' })),
      h('p', { class: 'co-who' }, h('b', {}, v.by === Net.myId ? 'You' : v.nm), v.by === Net.myId ? ' called a vote to punch out with ' : ' wants to punch out with ', h('span', { class: 'co-left' }), ' left.'),
      h('div', { class: 'co-pips' }, pips),
      v.res ? null : h('div', { class: 'co-btns' }, btn(true, 'Punch out'), btn(false, 'Keep working')),
      h('div', { class: 'co-need' }, Math.min(v.yes.length, need(n)) + ' of ' + need(n) + ' yes votes needed  ·  Team ' + money(G.team) + ' / ' + money(G.quota)),
      v.res ? h('div', { class: 'co-stamp' }, v.res === 'pass' ? 'Punched out!' : 'Vote failed') : null);
    if (V.el) V.el.replaceWith(el); else document.body.append(el);
    V.el = el; tick();
  }
  function tick() {
    const v = V.v, el = V.el; if (!v || !el) return;
    const t = el.querySelector('.co-t'), l = el.querySelector('.co-left');
    const ts = v.res ? '' : fmtTime(v.left), ls = fmtTime(G.timeLeft);
    if (t && t.textContent !== ts) { t.textContent = ts; t.classList.toggle('hurry', v.left <= 8); }
    if (l && l.textContent !== ls) l.textContent = ls;
  }

  /* keys: Y / N vote; the confirm card takes Enter / Esc (before the pause menu sees Esc) */
  window.addEventListener('keydown', e => {
    if (!V.modal) return;
    if (e.code === 'Escape') { e.stopImmediatePropagation(); e.preventDefault(); closeCard(); }
    else if (e.code === 'Enter' || e.code === 'NumpadEnter') { e.stopImmediatePropagation(); e.preventDefault(); go(); }
  }, true);
  window.addEventListener('keydown', e => {
    const tag = e.target && e.target.tagName; if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.repeat || !active() || UI.settingsOpen) return;
    if (e.code === 'KeyY') cast(true); else if (e.code === 'KeyN') cast(false);
  });

  /* ----- the pause menu and the LegitOS start menu get a "Clock out early" entry ----- */
  function label() { return Net.active ? 'Vote to clock out early' : 'Clock out early'; }
  Bus.on('boot', () => {
    const body = $('#pause .modal .body');
    if (body) {
      const b = h('button', { class: 'btn co-pause', onclick: () => request() }, label());
      body.insertBefore(b, body.querySelector('.btn.danger'));
      const _pause = Game.pause;
      Game.pause = function (on) { _pause.call(this, on); b.textContent = label(); b.classList.toggle('hidden', !!why() || active()); };
    }
    const _rp = OS.renderPower;
    OS.renderPower = function () {
      _rp.apply(this, arguments);
      const list = $('#powermenu .pm-list'); if (!list || why() === 'x' || G.mode !== 'week') return;
      const it = h('button', { class: 'pm-item co', onclick: () => { this.power(false); SFX.click(); request(); } },
        h('i', { class: 'ti', style: { background: '#c4581f' }, html: this.glyph('clock') }),
        h('span', {}, h('b', {}, label()), h('small', {}, Net.active ? 'Everyone votes. Majority wins.' : 'End the shift now and face The Boss')));
      list.insertBefore(it, list.querySelector('.pm-item.quit'));
    };
  });

  /* ----- the punch clock on the wall beside the main door ----- */
  const CK = { cv: null, g: null, tex: null, txt: '', pos: new THREE.Vector3(19.965, 1.47, -1.38) };
  function drawFace() {
    const g = CK.g, w = CK.cv.width, hh = CK.cv.height, v = V.v, blink = v && !v.res && Math.floor(now() * 2) % 2 === 0;
    const [tm] = OS.clock(), day = G.phase === 'menu' ? '---' : DAYS[(G.day - 1) % 5].slice(0, 3).toUpperCase();
    const led = v ? (v.res === 'pass' ? 'BYE!' : v.res === 'fail' ? 'NOPE' : blink ? 'VOTE' : v.yes.length + '/' + need(ids().length)) : tm.replace(/ ?[AP]M$/, '');
    const txt = led + '|' + day + '|' + /PM$/.test(tm); if (txt === CK.txt) return; CK.txt = txt;
    g.fillStyle = '#e4d6b4'; g.fillRect(0, 0, w, hh);
    g.fillStyle = '#3a2f14'; g.font = '700 15px ' + FONT.menu; g.textAlign = 'center'; g.fillText('BONK TIME-O-MATIC 3000', w / 2, 22);
    g.fillStyle = '#1d1a14'; rrect(g, 14, 32, w - 28, 86, 10); g.fill(); g.fillStyle = '#2a0d08'; rrect(g, 22, 40, w - 44, 70, 6); g.fill();
    g.fillStyle = 'rgba(255,70,40,.13)'; g.font = '50px ' + FONT.chunky; g.textAlign = 'center'; g.fillText('88:88', w / 2 - 12, 94);
    g.fillStyle = v ? '#ffb02e' : '#ff4a28'; g.shadowColor = g.fillStyle; g.shadowBlur = 12; g.fillText(led, w / 2 - 12, 94); g.shadowBlur = 0;
    g.font = '16px ' + FONT.chunky; g.fillStyle = '#ff7a50'; g.fillText(day, w - 44, 62); g.fillText(v ? '' : /PM$/.test(tm) ? 'PM' : 'AM', w - 44, 98);
    g.fillStyle = '#2b2620'; rrect(g, 34, 132, w - 68, 14, 7); g.fill(); g.fillStyle = '#6b5d45'; g.font = '700 12px ' + FONT.menu; g.fillText('▼  INSERT CARD  ▼', w / 2, 164);
    g.fillStyle = '#b3261e'; g.font = '36px ' + FONT.slab; g.fillText('CLOCK', w / 2, 196); g.fillText('OUT', w / 2, 230);
    g.fillStyle = '#3a2f14'; g.font = '800 14px ' + FONT.menu; g.fillText(Net.active ? 'EARLY? MAJORITY VOTE' : 'EARLY? NO REFUNDS', w / 2, 252);
    g.save(); g.translate(w / 2, 304); g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(0, 0, 30, 0, 7); g.fill(); g.strokeStyle = '#1d1a14'; g.lineWidth = 7; g.setLineDash([7, 7]); g.beginPath(); g.arc(0, 0, 26, 0, 7); g.stroke(); g.restore();
    CK.tex.needsUpdate = true;
  }
  function buildClock() {
    const it = [], M = (geo, x, y, z, col, o) => it.push(geo, xf(x, y, z, o), col);
    M(rboxGeo(0.44, 0.62, 0.03, 0.012), -0.02, 0.02, 0.012, '#5b4636');                 // wooden backplate
    M(rboxGeo(0.32, 0.46, 0.15, 0.035, 2), 0, 0, 0.1, '#e9dfc6');                        // body
    M(rboxGeo(0.335, 0.075, 0.165, 0.025, 2), 0, 0.215, 0.1, '#b8402c');                 // red cap
    M(boxGeo(0.16, 0.02, 0.03), 0, 0.255, 0.1, '#1d1a14');                               // card slot on top
    M(boxGeo(0.085, 0.13, 0.004), 0.004, 0.31, 0.1, '#f0dfa8', { rz: 0.05 });            // a time card sticking out
    M(boxGeo(0.086, 0.022, 0.005), 0.0, 0.365, 0.1, '#2f6fd6', { rz: 0.05 });
    M(cylGeo(0.042, 0.042, 0.012, 20), 0, -0.165, 0.181, '#1d1a14', { rx: Math.PI / 2 }); // punch button collar + button
    M(cylGeo(0.03, 0.034, 0.034, 20), 0, -0.165, 0.196, '#e03a2f', { rx: Math.PI / 2 });
    // card rack beside it (towards the door) with a few time cards
    M(boxGeo(0.13, 0.4, 0.02), 0.27, -0.02, 0.02, '#8d939c');
    [[0.1, '#d6342c'], [-0.04, '#25a35a'], [-0.18, '#f08a1c']].forEach(([y, c], i) => {
      M(boxGeo(0.088, 0.13, 0.004), 0.27 + (i - 1) * 0.006, y + 0.05, 0.034, '#f0dfa8', { rz: (i - 1) * 0.05 }); M(boxGeo(0.089, 0.02, 0.005), 0.27 + (i - 1) * 0.006, y + 0.105, 0.035, c, { rz: (i - 1) * 0.05 });
      M(boxGeo(0.13, 0.05, 0.03), 0.27, y, 0.04, '#a7adb5');
    });
    const g = new THREE.Group(); g.position.copy(CK.pos); g.rotation.y = -Math.PI / 2; W.scene.add(g);
    const body = new THREE.Mesh(mergeGeos(it), (Batch.g.shiny && Batch.g.shiny.m) || new THREE.MeshPhongMaterial({ vertexColors: true }));
    body.castShadow = true; body.receiveShadow = true; g.add(body);
    CK.cv = document.createElement('canvas'); CK.cv.width = 232; CK.cv.height = 344; CK.g = CK.cv.getContext('2d');
    CK.tex = new THREE.CanvasTexture(CK.cv); CK.tex.anisotropy = 4;
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.29, 0.43), new THREE.MeshLambertMaterial({ map: CK.tex, emissive: 0xffffff, emissiveMap: CK.tex, emissiveIntensity: 0.12 }));
    face.position.set(0, 0, 0.1755); g.add(face); drawFace();
    W.interact.push({ pos: new THREE.Vector3(CK.pos.x - 0.12, CK.pos.y - 0.1, CK.pos.z), label: () => {
      if (G.mode !== 'week' || (G.phase !== 'day' && G.phase !== 'lobby')) return '';
      if (G.phase === 'lobby') return 'Time clock (start the shift first)';
      if (V.v && V.v.res) return '';
      if (active()) return myVote() === 'yes' ? 'Clock-out vote: ' + V.v.yes.length + ' of ' + need(ids().length) : 'Vote YES to clock out';
      return Net.active ? 'Call a vote to clock out early' : 'Clock out early';
    }, act: () => request() });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { CK.txt = ''; drawFace(); });
  }
  Bus.on('world:built', () => { try { buildClock(); } catch (e) { console.error('time clock', e); } });
  let faceT = 0;
  Loop.add(dt => {
    if (!CK.tex || (faceT += dt) < 0.25) return; faceT = 0;
    const c = W.camera.position; if (Math.abs(c.x - CK.pos.x) + Math.abs(c.z - CK.pos.z) < 16) drawFace();
  });

  return {
    request, cast, punch,
    /* the current vote (copy) or null: { id, by, nm, yes, no, left, res, need } */
    get vote() { const v = V.v; return v ? Object.assign({}, v, { yes: v.yes.slice(), no: v.no.slice(), need: need(ids().length) }) : null; },
    get open() { return !!V.modal; }, confirm: go, cancel: closeCard,
    VOTE_SECS, need
  };
})();
