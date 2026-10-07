'use strict';
/* CCTV app — the office security console (bought in BonkMart for $400): a 2x2 grid of grainy feeds from the
   ceiling cameras (W.cctvSpots), timestamps, REC dots, people tagged with their names, click a feed to enlarge,
   AUTO cycles through every camera. Handy for seeing who is where, and who is coming through the main door.
   Rendering goes through Cams (cams.js, loaded later: only used lazily). */
const CCTV = {
  ID: 'cctv', win: null, mode: 'grid', sel: 'lobby', auto: false, autoT: 0, grid: [], big: null, alerts: {}, noise: null, _p: {}, _q: {},
  GRID: ['lobby', 'floor', 'break', 'review'],
  NAMES: { lobby: 'Entrance', floor: 'Call floor', floorW: 'Call floor west', hall: 'Hallway', break: 'Break room', review: 'Review room' },
  SHORT: { lobby: 'ENTRANCE', floor: 'FLOOR', floorW: 'FLOOR W', hall: 'HALL', break: 'BREAK', review: 'REVIEW' },
  ROOMS: { floor: 'Call floor', hall: 'Hallway', review: 'Review room', break: 'Break room', boss: "Boss's office", lobby: 'Lobby' },
  owned() { return !!(G.prog.apps && G.prog.apps[this.ID]); },
  spots() { return W.cctvSpots || []; },
  spot(id) { return this.spots().find(s => s.id === id) || this.spots()[0]; },
  num(id) { return String(Math.max(0, this.spots().findIndex(s => s.id === id)) + 1).padStart(2, '0'); },
  label(id) { const s = this.spot(id); return 'CAM ' + this.num(id) + ' · ' + String(this.NAMES[id] || (s && s.label) || id).toUpperCase(); },
  visible(mode) { const w = this.win; return !!(w && OS.open && P.seated && !P.cam && OS.wins.get(this.ID) === w && !w.el.classList.contains('min') && this.mode === mode); },
  /* other modules: flash a warning on a feed, e.g. CCTV.alert('lobby', 'POLICE AT THE DOOR', 8) */
  alert(id, text, secs) { this.alerts[id] = { text: String(text || 'ALERT'), until: (W.t || 0) + (secs || 6) }; if (!this.win && this.owned()) OS.badge(this.ID, '!'); },
  ensure() {
    if (this.big || typeof Cams === 'undefined') return;
    const mk = (i, w, hh, fps, mode) => Cams.create({ w, h: hh, fps, fov: 64, near: 0.1, far: 45, me: true, tags: false, visible: () => this.visible(mode), before: c => this.aim(c), onFrame: c => this.overlay(c) });
    this.grid = this.GRID.map((id, i) => { const c = mk(i, 320, 180, 4, 'grid'); c.spotId = id; return c; });
    this.big = mk(-1, 640, 360, 10, 'one'); this.big.spotId = this.sel;
  },
  aim(c) {
    if (c === this.big) c.spotId = this.sel;
    const s = this.spot(c.spotId); if (!s) return false;
    const t = W.t || 0, sway = s.id === 'floor' || s.id === 'floorW' ? Math.sin(t * 0.25 + s.pos[0]) * 0.9 : 0;   // the floor cameras pan slowly
    c.set(s.pos, [s.look[0] + sway * (s.look[2] - s.pos[2]) * 0.12, s.look[1], s.look[2] - sway * (s.look[0] - s.pos[0]) * 0.12]);
    return true;
  },
  /* after each frame: tag people (brackets + name) when the camera can see them */
  overlay(c) {
    const g = c.ctx, ppl = Cams.people(), cp = c.cam.position, sc = c.w / 320; let n = 0, bad = false;
    g.save(); g.lineWidth = Math.max(1.5, sc * 1.4); g.font = '700 ' + Math.round(10 * sc) + 'px "Roboto Mono", Consolas, monospace'; g.textBaseline = 'bottom';
    for (const p of ppl) {
      const top = c.project(p.pos, this._p); if (!top.ok) continue;
      const dx = p.pos.x - cp.x, dy = p.pos.y - 0.3 - cp.y, dz = p.pos.z - cp.z, d = Math.hypot(dx, dy, dz);
      if (d > 26 || Space.ray(cp.x, cp.y, cp.z, dx / d, dy / d, dz / d, d, 0) < d - 0.5) continue;
      const foot = c.project({ x: p.pos.x, y: Math.max(0, p.pos.y - 2.0), z: p.pos.z }, this._q), hh = Math.max(10, foot.y - top.y), ww = hh * 0.42, x = top.x - ww / 2, y = top.y, k = Math.min(ww, hh) * 0.25;
      const col = p.kind === 'police' ? '#ff4040' : p.kind === 'me' ? '#7dff9a' : '#ffe14d'; bad = bad || p.kind === 'police'; n++;
      g.strokeStyle = col; g.beginPath();
      g.moveTo(x, y + k); g.lineTo(x, y); g.lineTo(x + k, y); g.moveTo(x + ww - k, y); g.lineTo(x + ww, y); g.lineTo(x + ww, y + k);
      g.moveTo(x, y + hh - k); g.lineTo(x, y + hh); g.lineTo(x + k, y + hh); g.moveTo(x + ww - k, y + hh); g.lineTo(x + ww, y + hh); g.lineTo(x + ww, y + hh - k); g.stroke();
      const txt = String(p.text || '').toUpperCase().slice(0, 16), tw = g.measureText(txt).width + 6 * sc;
      g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(top.x - tw / 2, y - 13 * sc, tw, 12 * sc); g.fillStyle = col; g.textAlign = 'center'; g.fillText(txt, top.x, y - 2 * sc);
    }
    g.restore();
    c.seen = n; c.bad = bad;
  },
  clockText() {
    const c = OS.clock ? OS.clock() : null, s = String(Math.floor((W.t || 0) % 60)).padStart(2, '0');
    if (!c) return new Date().toLocaleString();
    const d = new Date(c[1]), z = n => String(n).padStart(2, '0'), date = isNaN(d) ? c[1] : z(d.getMonth() + 1) + '/' + z(d.getDate()) + '/' + d.getFullYear();
    return date + '  ' + c[0].replace(/ (AM|PM)/, ':' + s + ' $1');
  },
  noiseURL() {
    if (this.noise) return this.noise; const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), d = g.createImageData(128, 128);
    for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = Math.random() * 70; }
    g.putImageData(d, 0, 0); return (this.noise = c.toDataURL());
  },
  feedEl(c, big) {
    const el = h('div', { class: 'cc-feed' + (big ? ' big' : ''), onclick: () => { SFX.click(); if (big) this.setMode('grid'); else { this.sel = c.spotId; this.auto = false; this.setMode('one'); } } },
      c.canvas, h('div', { class: 'cc-fx', style: { backgroundImage: 'url(' + this.noiseURL() + ')' } }),
      h('div', { class: 'cc-name' }), h('div', { class: 'cc-ts' }), h('div', { class: 'cc-rec' }, h('i'), 'REC'), h('div', { class: 'cc-alert' }));
    c.canvas.classList.add('cc-cv'); el._cam = c; return el;
  },
  setMode(m) {
    this.mode = m; if (!this.win) return;
    const el = this.win.el; el.classList.toggle('one', m === 'one'); this.autoT = W.t || 0; this.tick(true);
    for (const c of this.grid.concat(this.big)) if (c) c.last = -1e9;   // fresh frame right away
  },
  tick(force) {
    const w = this.win; if (!w) return;
    const t = W.t || 0, ts = this.clockText();
    if (this.auto && this.mode === 'one' && t - this.autoT > 5) { const S = this.spots(), i = S.findIndex(s => s.id === this.sel); this.sel = S[(i + 1) % S.length].id; this.autoT = t; if (this.big) this.big.last = -1e9; }
    for (const el of w.feeds) {
      const c = el._cam, id = c === this.big ? this.sel : c.spotId, al = this.alerts[id], door = id === 'lobby' && W.doors && W.doors.main && W.doors.main.isOpen;
      el.querySelector('.cc-name').textContent = this.label(id); el.querySelector('.cc-ts').textContent = ts;
      const a = el.querySelector('.cc-alert'), txt = al && al.until > t ? al.text : c.bad ? 'INTRUDER' : door ? 'DOOR OPEN' : c.seen ? 'MOTION' : '';
      a.textContent = txt; a.className = 'cc-alert' + (txt ? ' on' : '') + (al && al.until > t || c.bad ? ' red' : door ? ' amber' : '');
      el.classList.toggle('alarm', !!(al && al.until > t) || !!c.bad);
    }
    w.camBar.querySelectorAll('button[data-id]').forEach(b => b.classList.toggle('on', b.dataset.id === this.sel && this.mode === 'one'));
    w.autoBtn.classList.toggle('on', this.auto);
    w.clock.textContent = ts;
    // who is where
    if (force || !this._whoT || t - this._whoT > 1) {
      this._whoT = t;
      const list = []; if (W.me) list.push([settings.name || 'You', settings.color, P.seated ? 'Desk ' + (P.seat + 1) : this.ROOMS[Cams.roomAt(P.pos.x, P.pos.z)] || 'Somewhere']);
      for (const [id, p] of Net.players) { if (id === Net.myId) continue; list.push([p.name || 'Agent', p.color, p.seat >= 0 ? 'Desk ' + (p.seat + 1) : p.seat <= -10 ? 'Review room' : this.ROOMS[Cams.roomAt(p.x || 0, p.z || 0)] || 'Somewhere']); }
      w.who.replaceChildren(h('b', {}, 'ON SITE'), ...list.map(([n, col, where]) => h('span', { class: 'cc-who' }, h('i', { style: { background: col || '#ffe14d' } }), n, h('em', {}, where))));
    }
  },
  render(b, win) {
    this.win = win; this.ensure(); b.classList.add('cc-body'); win.el.classList.toggle('one', this.mode === 'one');
    const grid = h('div', { class: 'cc-grid' }, ...this.grid.map(c => this.feedEl(c))), one = h('div', { class: 'cc-one' }, this.feedEl(this.big, true));
    win.feeds = [...grid.children, ...one.children];
    win.clock = h('span', { class: 'cc-clock' });
    win.autoBtn = h('button', { class: 'cc-btn auto', title: 'Cycle through every camera', onclick: () => { SFX.click(); this.auto = !this.auto; if (this.auto && this.mode !== 'one') this.setMode('one'); else this.tick(true); } }, h('i', { html: OS.glyph('refresh') }), 'AUTO');
    win.camBar = h('div', { class: 'cc-cams' },
      h('button', { class: 'cc-btn grid', title: 'All feeds', onclick: () => { SFX.click(); this.auto = false; this.setMode('grid'); } }, h('i', { html: OS.glyph('grid') }), 'GRID'),
      ...this.spots().map(s => h('button', { class: 'cc-btn', 'data-id': s.id, onclick: () => { SFX.click(); this.sel = s.id; this.auto = false; this.setMode('one'); } }, this.num(s.id) + ' ' + (this.SHORT[s.id] || String(s.label).toUpperCase()))),
      win.autoBtn);
    win.who = h('div', { class: 'cc-whos' });
    b.append(
      h('div', { class: 'cc-head' }, h('i', { class: 'cc-logo', html: OS.glyph('cctv') }), h('div', { class: 'cc-title' }, h('b', {}, 'SECURITY CONSOLE'), h('small', {}, 'Totally Legit Inc. · ' + this.spots().length + ' cameras online')),
        h('div', { class: 'cc-recall' }, h('i'), 'REC'), win.clock),
      grid, one, win.camBar, win.who);
    win.timer = setInterval(() => this.tick(), 250); this.tick(true);
    for (const c of this.grid.concat(this.big)) { c.on = true; c.last = -1e9; }
    OS.badge(this.ID, false);
  },
  close(win) { clearInterval(win.timer); if (this.win === win) this.win = null; }
};
OS.apps.cctv = {
  desktop: true, order: 45, available: () => CCTV.owned(), title: 'CCTV', icon: 'cctv', emoji: '📹', color: '#334155',
  w: 660, x: 0.2, y: 0.03, cls: 'cctvwin',
  render: (b, w) => CCTV.render(b, w), onClose: w => CCTV.close(w)
};
Shop.add({
  id: 'app_cctv', tab: 'games', section: 'Software', name: 'CCTV', price: 400, icon: 'cctv', color: '#334155', sort: 50,
  desc: 'Tap into the office security cameras from your desk. Six feeds, night-shift grain, name tags on everyone. See who is slacking in the break room and who is coming through the front door.',
  owned: () => CCTV.owned(), available: () => true,
  art(g, w, hh) {   // a ceiling camera over a little wall of monitors
    const s = Math.min(w, hh) / 100; g.save(); g.translate(w / 2, hh / 2); g.scale(s, s); g.lineJoin = 'round'; g.lineWidth = 3; g.strokeStyle = '#141824';
    const box = (x, y, ww, h2, fill) => { g.fillStyle = fill; g.beginPath(); g.roundRect ? g.roundRect(x, y, ww, h2, 3) : g.rect(x, y, ww, h2); g.fill(); g.stroke(); };
    for (let i = 0; i < 4; i++) { const x = -40 + (i % 2) * 42, y = -2 + Math.floor(i / 2) * 26; box(x, y, 38, 22, '#20262f'); g.fillStyle = ['#6f8f7a', '#7a8796', '#8c8a78', '#6d7f8f'][i]; g.fillRect(x + 4, y + 4, 30, 14); g.fillStyle = '#ff3b3b'; g.beginPath(); g.arc(x + 31, y + 7, 1.8, 0, 7); g.fill(); }
    g.save(); g.translate(-6, -30); g.rotate(0.28); box(-22, -9, 40, 18, '#e9e6de'); box(18, -6, 9, 12, '#3a3f4a'); g.beginPath(); g.arc(23, 0, 3, 0, 7); g.fillStyle = '#4d79ad'; g.fill(); g.restore();
    g.fillStyle = '#3a3f4a'; g.fillRect(-36, -46, 6, 14); g.strokeRect(-36, -46, 6, 14);
    g.restore();
  },
  buy() { (G.prog.apps = G.prog.apps || {})[CCTV.ID] = true; Game.saveProgress(); if (OS.open) OS.buildIcons(); toast('CCTV installed. Check your desktop.', 'good'); }
});
/* police raids (raid module): flash the entrance feed */
Bus.on('raid:start', () => CCTV.alert('lobby', 'POLICE AT THE DOOR', 15));
Bus.on('game:begin', () => { CCTV.alerts = {}; CCTV.mode = 'grid'; CCTV.auto = false; OS.badge(CCTV.ID, false); });   // no stale raid '!' from the last game
