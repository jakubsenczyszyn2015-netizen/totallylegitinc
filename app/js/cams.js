'use strict';
/* CAMS — render-to-texture cameras (webcam, CCTV, photos) and the Bonk SnapCam instant camera.
   - Cams.create({w, h, fps, fov, near, far, me, tags, alpha, visible, before, onFrame}) -> a camera you aim
     (cam.set(pos, look)); it is rendered by the main WebGLRenderer into one shared render target per size and
     read back into cam.canvas (a 2D canvas you can put in the DOM). Renders run from Loop.addRender, only while
     cam.visible() says so, at most 1-2 per frame (the main render is skipped while the desktop is open).
   - Cams.snap({w, h, pos, quat, fov, me}) renders once, right now, into a new canvas.
   - Photos: the SnapCam item (ItemDefs.polaroid) takes a picture of your view, prints a polaroid card and ejects
     it as a physics prop ('photo') that flutters down; everyone gets the same picture (Net 'cam:photo'). */
const Cams = (() => {
  const cams = [], slots = new Map(), _c = new THREE.Color(), _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3();
  /* one render target + pixel buffer + ImageData per size (shared by every camera of that size) */
  function slot(w, h) {
    const k = w + 'x' + h; let s = slots.get(k); if (s) return s;
    const R = W.renderer, o = { depthBuffer: true, stencilBuffer: false };
    const rt = R.capabilities.isWebGL2 && THREE.WebGLMultisampleRenderTarget ? new THREE.WebGLMultisampleRenderTarget(w, h, o) : new THREE.WebGLRenderTarget(w, h, o);
    if (rt.samples !== undefined) rt.samples = 4;
    rt.texture.encoding = THREE.sRGBEncoding; rt.texture.generateMipmaps = false;   // same output encoding as the screen: no shader recompiles
    s = { rt, buf: new Uint8Array(w * h * 4), img: new ImageData(w, h) }; slots.set(k, s); return s;
  }
  /* things that must not show (or must show) in an extra camera; restored right after */
  const _hid = [];
  function prep(c) {
    _hid.length = 0; const vis = (o, v) => { if (o && o.visible !== v) { _hid.push(o, o.visible); o.visible = v; } };
    if (W.me) vis(W.me.group, !!c.me);
    if (typeof Props !== 'undefined' && Props.vm) vis(Props.vm.root, false);
    if (!c.tags) { if (W.me) vis(W.me.tag, false); for (const a of W.avatars.values()) { vis(a.av.tag, false); vis(a.av.talk, false); } if (W.boss) vis(W.boss.tag, false); }
  }
  function unprep() { for (let i = _hid.length - 2; i >= 0; i -= 2) _hid[i].visible = _hid[i + 1]; _hid.length = 0; }
  function draw(c) {
    const R = W.renderer, sc = W.scene; if (!R || !sc) return false;
    if (c.before && c.before(c) === false) return false;
    const S = slot(c.w, c.h), prevRT = R.getRenderTarget(); let bg = null, ca = 1;
    prep(c);
    if (c.alpha) { bg = sc.background; sc.background = null; R.getClearColor(_c); ca = R.getClearAlpha(); R.setClearColor(0x000000, 0); }
    try { R.setRenderTarget(S.rt); R.render(sc, c.cam); R.readRenderTargetPixels(S.rt, 0, 0, c.w, c.h, S.buf); }
    finally { R.setRenderTarget(prevRT); unprep(); if (c.alpha) { sc.background = bg; R.setClearColor(_c, ca); } }
    const row = c.w * 4, d = S.img.data, b = S.buf;   // GL rows are bottom-up
    for (let y = 0; y < c.h; y++) d.set(b.subarray((c.h - 1 - y) * row, (c.h - y) * row), y * row);
    c.ctx.putImageData(S.img, 0, 0); c.frames++;
    if (c.onFrame) c.onFrame(c);
    return true;
  }
  class Cam {
    constructor(o) {
      o = o || {}; this.w = o.w || 480; this.h = o.h || 270; this.fps = o.fps || 12; this.me = o.me !== false; this.tags = !!o.tags; this.alpha = !!o.alpha;
      this.cam = new THREE.PerspectiveCamera(o.fov || 60, this.w / this.h, o.near || 0.05, o.far || 60); this.cam.rotation.order = 'YXZ';
      this.canvas = document.createElement('canvas'); this.canvas.width = this.w; this.canvas.height = this.h; this.ctx = this.canvas.getContext('2d');
      this.visible = o.visible || null; this.before = o.before || null; this.onFrame = o.onFrame || null; this.on = true; this.last = -1e9; this.frames = 0;
    }
    /* aim: pos and look are [x,y,z], {x,y,z} or Vector3 */
    set(pos, look) {
      const p = Array.isArray(pos) ? _v.fromArray(pos) : pos, l = Array.isArray(look) ? _v2.fromArray(look) : look;
      this.cam.position.set(p.x, p.y, p.z); if (l) this.cam.lookAt(l.x, l.y, l.z); return this;
    }
    setSize(w, h) { if (w === this.w && h === this.h) return; this.w = w; this.h = h; this.canvas.width = w; this.canvas.height = h; this.cam.aspect = w / h; this.cam.updateProjectionMatrix(); }
    isOn() { return this.on && (!this.visible || !!this.visible(this)); }
    /* render now (ignores fps and visibility) */
    render() { this.last = Cams.t; return draw(this); }
    /* world point -> canvas pixels {x, y, z (view depth, m), ok (in front and on screen)} */
    project(p, out) {
      out = out || {}; _v.set(p.x, p.y, p.z); const C = this.cam; C.updateMatrixWorld(); C.matrixWorldInverse.copy(C.matrixWorld).invert(); const z = -_v3.copy(_v).applyMatrix4(this.cam.matrixWorldInverse).z; _v.project(this.cam);
      out.x = (_v.x * 0.5 + 0.5) * this.w; out.y = (0.5 - _v.y * 0.5) * this.h; out.z = z; out.ok = z > 0.05 && Math.abs(_v.x) <= 1.05 && Math.abs(_v.y) <= 1.05; return out;
    }
    dispose() { const i = cams.indexOf(this); if (i >= 0) cams.splice(i, 1); this.on = false; }
  }
  /* the scheduler: the most overdue visible camera gets rendered; 2 per frame while the main render is skipped */
  Loop.addRender((dt, t) => {
    api.t = t;
    if (!cams.length || !W.renderer || G.phase === 'menu') return;
    let budget = (OS.open && P.seated && !P.cam) ? 2 : 1;
    while (budget-- > 0) {
      let best = null, bo = 0;
      for (const c of cams) { if (!c.isOn()) continue; const o = (t - c.last) * c.fps; if (o >= 1 && o > bo) { bo = o; best = c; } }
      if (!best) break; best.last = t; try { draw(best); } catch (e) { best.on = false; console.error('Cams render failed', e); }
    }
  });
  let _snap = null;
  const api = {
    t: 0, list: cams, labels: [],
    create(o) { const c = new Cam(o); cams.push(c); return c; },
    /* render once into a new canvas: {w, h, pos, look | quat, fov, me, near} (defaults: the main camera's view) */
    snap(o) {
      o = o || {}; const w = o.w || 256, h = o.h || 256;
      if (!_snap) _snap = new Cam({ w, h }); const c = _snap; c.setSize(w, h); c.me = !!o.me; c.tags = false; c.alpha = false;
      const src = W.camera; c.cam.fov = o.fov || src.fov; c.cam.near = o.near || 0.06; c.cam.far = src.far; c.cam.updateProjectionMatrix();
      if (o.pos) c.set(o.pos, o.look || null); else c.cam.position.copy(src.position);
      if (o.quat) c.cam.quaternion.copy(o.quat); else if (!o.look) c.cam.quaternion.copy(src.quaternion);
      draw(c); const out = document.createElement('canvas'); out.width = w; out.height = h; out.getContext('2d').drawImage(c.canvas, 0, 0); return out;
    },
    /* people a security camera should label: [{pos: Vector3, text, color, kind}] (players + whatever modules push into Cams.labels as fns) */
    people() {
      const out = [], head = av => av.head.getWorldPosition(new THREE.Vector3()).add(_v2.set(0, 0.55, 0));
      if (W.me && G.phase !== 'menu') out.push({ pos: head(W.me), text: settings.name || 'You', color: settings.color || '#3b82f6', kind: 'me', av: W.me });
      for (const [id, a] of W.avatars) { const p = Net.players.get(id); out.push({ pos: head(a.av), text: (p && p.name) || 'Agent', color: (p && p.color) || '#ffd23b', kind: 'player', av: a.av }); }
      for (const f of this.labels) { try { const l = f(); if (l) out.push(...l); } catch (e) {} }
      return out;
    },
    /* which room a point is in (W.rooms names) */
    roomAt(x, z) { const R = W.rooms || {}; for (const k in R) { const r = R[k]; if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) return k; } return null; }
  };
  return api;
})();

/* ---------- the local player's mouth flaps while saying a line on a call (the webcam shows it) ---------- */
Bus.on('call:line', e => { if (e && e.who === 'you') Cams.talkUntil = (W.t || 0) + clamp(String(e.text || '').length * 0.06, 0.9, 4.5); });
Bus.on('world:built', () => {
  const me = W.me; if (!me) return; let v = !!me.talking;
  Object.defineProperty(me, 'talking', { configurable: true, get: () => v || (P.seated && (W.t || 0) < (Cams.talkUntil || 0)), set: x => { v = !!x; } });
});

/* =====================================================================
   PHOTOS — polaroid cards: canvas + texture, developing, network sync
   ===================================================================== */
const Photos = {
  map: new Map(), urls: new Map(), MAX: 32, W: 256, H: 312, IMG: 224, asked: new Set(),
  /* print a card from a rendered square picture */
  card(pic, caption, stamp) {
    const c = document.createElement('canvas'); c.width = this.W; c.height = this.H; const g = c.getContext('2d'), m = (this.W - this.IMG) / 2;
    const gr = g.createLinearGradient(0, 0, this.W, this.H); gr.addColorStop(0, '#fbf9f2'); gr.addColorStop(1, '#ece6d6'); g.fillStyle = gr; g.fillRect(0, 0, this.W, this.H);
    for (let i = 0; i < 500; i++) { g.fillStyle = 'rgba(120,100,70,' + (Math.random() * 0.05) + ')'; g.fillRect(Math.random() * this.W, Math.random() * this.H, 2, 2); }
    g.fillStyle = '#1b1712'; g.fillRect(m - 1, m - 1, this.IMG + 2, this.IMG + 2);
    g.drawImage(pic, m, m, this.IMG, this.IMG);
    // instant-film look: lifted blacks, warm highlights, soft vignette
    g.save(); g.globalCompositeOperation = 'soft-light'; g.fillStyle = 'rgba(255,190,120,.35)'; g.fillRect(m, m, this.IMG, this.IMG); g.restore();
    const vg = g.createRadialGradient(this.W / 2, m + this.IMG / 2, this.IMG * 0.3, this.W / 2, m + this.IMG / 2, this.IMG * 0.75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(30,10,0,.38)');
    g.fillStyle = vg; g.fillRect(m, m, this.IMG, this.IMG); g.fillStyle = 'rgba(40,30,60,.08)'; g.fillRect(m, m, this.IMG, this.IMG);
    if (stamp) { g.save(); g.font = '700 13px "Roboto Mono", Consolas, monospace'; g.textAlign = 'right'; g.fillStyle = '#ff8a1e'; g.shadowColor = 'rgba(255,90,0,.8)'; g.shadowBlur = 4; g.fillText(stamp, m + this.IMG - 8, m + this.IMG - 8); g.restore(); }
    g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 1; g.strokeRect(m - 0.5, m - 0.5, this.IMG + 1, this.IMG + 1);
    if (caption) { let size = 24; g.font = '700 ' + size + 'px ' + FONT.menu; while (size > 13 && g.measureText(caption).width > this.W - 26) { size -= 1; g.font = '700 ' + size + 'px ' + FONT.menu; } scrawl(g, caption, this.W / 2, this.H - 30, size, '#27306b', { align: 'center' }); }
    return c;
  },
  /* register a photo (from a card canvas or a JPEG dataURL); returns the record */
  add(id, src, meta) {
    let p = this.map.get(id);
    if (!p) {
      const c = document.createElement('canvas'); c.width = this.W; c.height = this.H; const tex = new THREE.CanvasTexture(c); tex.anisotropy = 4;
      p = { id, card: null, cv: c, g: c.getContext('2d'), tex, url: null, by: '', cap: '', t0: W.t || 0, dev: 0, uses: 0, mat: null };
      this.map.set(id, p); this.blank(p); this.trim();
    }
    Object.assign(p, meta || {});
    if (typeof src === 'string') {
      p.url = src; if (Net.isHost || !Net.active) this.keep(id, src, meta);
      const img = new Image(); img.onload = () => { const c = document.createElement('canvas'); c.width = this.W; c.height = this.H; c.getContext('2d').drawImage(img, 0, 0, this.W, this.H); p.card = c; p.t0 = W.t || 0; p.dev = 0; this.develop(p, true); }; img.src = src;
    } else if (src) { p.card = src; p.t0 = W.t || 0; p.dev = 0; this.develop(p, true); }
    return p;
  },
  keep(id, url, meta) { this.urls.set(id, { url, by: meta && meta.by || '', cap: meta && meta.cap || '' }); while (this.urls.size > this.MAX) this.urls.delete(this.urls.keys().next().value); },
  get(id) { return this.map.get(id) || null; },
  /* placeholder until the picture arrives: an unexposed card */
  blank(p) {
    const g = p.g, m = (this.W - this.IMG) / 2; g.fillStyle = '#f6f3ea'; g.fillRect(0, 0, this.W, this.H); g.fillStyle = '#2b2a28'; g.fillRect(m, m, this.IMG, this.IMG); p.tex.needsUpdate = true;
  },
  /* instant film develops over ~5 s: the picture fades up out of a murky brown */
  develop(p, force) {
    if (!p.card) return; const k = clamp(((W.t || 0) - p.t0) / 5, 0, 1); if (!force && k - p.dev < 0.06 && k < 1) return; if (!force && p.dev >= 1) return; p.dev = k;
    const g = p.g, m = (this.W - this.IMG) / 2; g.drawImage(p.card, 0, 0);
    if (k < 1) { const e = 1 - k * k * (3 - 2 * k); g.fillStyle = 'rgba(52,44,36,' + (e * 0.96).toFixed(3) + ')'; g.fillRect(m, m, this.IMG, this.IMG); g.fillStyle = 'rgba(90,120,140,' + (e * 0.25).toFixed(3) + ')'; g.fillRect(m, m, this.IMG, this.IMG); }
    p.tex.needsUpdate = true; if (p.hud) p.hud();
  },
  trim() {
    if (this.map.size <= this.MAX) return;
    for (const [id, p] of this.map) { if (this.map.size <= this.MAX) break; if (p.uses > 0 || (Props.carry && Props.carry.id === id)) continue; p.tex.dispose(); if (p.mat) p.mat.dispose(); this.map.delete(id); }
  },
  /* a material for the front of a photo prop */
  front(p) { if (!p.mat) p.mat = new THREE.MeshLambertMaterial({ map: p.tex, emissive: 0xffffff, emissiveMap: p.tex, emissiveIntensity: 0.22 }); return p.mat; },
  clear() { for (const p of this.map.values()) { p.tex.dispose(); if (p.mat) p.mat.dispose(); } this.map.clear(); this.urls.clear(); this.asked.clear(); PhotoHud.hide(true); }
};
Loop.add(() => { for (const p of Photos.map.values()) if (p.card && p.dev < 1) Photos.develop(p); });
Bus.on('game:begin', () => Photos.clear());
Bus.on('quit', () => Photos.clear());

/* the photo as a physics prop: a thin card that lies flat, flutters down like a leaf and can be picked up and thrown */
const PhotoArt = {
  geo: null, edge: null, back: null, blankMat: null,
  init() {
    if (this.geo) return; this.geo = new THREE.BoxGeometry(0.14, 0.004, 0.17);
    this.edge = new THREE.MeshLambertMaterial({ color: '#f1ede2' }); this.back = new THREE.MeshLambertMaterial({ color: '#d9d4c6' });
    this.blankMat = new THREE.MeshLambertMaterial({ color: '#f1ede2', map: canvasTex(64, 78, (g, w, hh) => { g.fillStyle = '#f6f3ea'; g.fillRect(0, 0, w, hh); g.fillStyle = '#34302a'; g.fillRect(5, 5, w - 10, w - 10); }) });
  },
  model(p) { this.init(); const m = new THREE.Mesh(this.geo, [this.edge, this.edge, p ? Photos.front(p) : this.blankMat, this.back, this.edge, this.edge]); m.castShadow = false; return m; },
  dress(m, id) { const p = Photos.get(id); if (!p || !m || !m.material) return; m.material = [this.edge, this.edge, Photos.front(p), this.back, this.edge, this.edge]; }
};
PropTypes.photo = { name: 'photo', r: 0.04, bounce: 0.05, fric: 1.4, box: 0.002, model: () => PhotoArt.model(Props.carry && Props.carry.type === 'photo' ? Photos.get(Props.carry.id) : null) };
(() => {
  /* wrap Props from here: photos get their picture, a nicer label, a usage count, and leaf-like air drag */
  const _spawn = Props.spawn, _remove = Props.remove, _step = Props.step;
  Props.spawn = function (type, o, v, opts) {
    const b = _spawn.call(this, type, o, v, opts);
    if (b && type === 'photo') {
      let p = Photos.get(b.id);
      if (!p) { p = Photos.add(b.id, null, {}); if (Net.active && !Net.isHost && !Photos.asked.has(b.id)) { Photos.asked.add(b.id); Net.emit('cam:photoReq', { id: b.id }, { host: true }); } }
      p.uses++; PhotoArt.dress(b.m, b.id);
      b.inter.label = () => (b.rest || b.vel.lengthSq() < 0.5) && !Props.carry && Game.canControl() ? 'Pick up the photo' + (p.by ? ' (by ' + p.by + ')' : '') : null;
    }
    return b;
  };
  Props.remove = function (b) { if (b && b.type === 'photo' && this.byId.get(b.id) === b) { const p = Photos.get(b.id); if (p) p.uses = Math.max(0, p.uses - 1); } return _remove.call(this, b); };
  Props.step = function (b, h) {
    if (b.type === 'photo') {
      const v = b.vel, air = Math.abs(v.y) > 0.04 || v.x * v.x + v.z * v.z > 0.05;
      if (air) {   // fixed 120 Hz steps: deterministic on every client
        const t = b.ft = (b.ft || 0) + h, ph = b.ph || (b.ph = (hashStr(String(b.id)) % 628) / 100);
        v.y += 9.8 * 0.86 * h; v.y *= Math.exp(-1.6 * h); const dr = Math.exp(-2.6 * h); v.x *= dr; v.z *= dr;
        v.x += Math.cos(t * 3.3 + ph) * 1.7 * h; v.z += Math.sin(t * 2.7 + ph * 2) * 1.7 * h;
        b.spin.set(Math.cos(t * 4.2 + ph) * 2.6, 0.9 * Math.sin(ph * 3 + t * 0.7), Math.sin(t * 3.4 + ph) * 2.6);
      }
    }
    return _step.call(this, b, h);
  };
})();

/* ---------- the photo you hold (or just took) shown big at the bottom right ---------- */
const PhotoHud = {
  el: null, id: null, t: 0,
  ensure() {
    if (this.el) return this.el; const hud = $('#hud'); if (!hud) return null;
    this.el = h('div', { id: 'cam-photo', class: 'hidden' }, h('div', { class: 'cp-card' }, this.cv = h('canvas', { width: Photos.W, height: Photos.H })), this.lab = h('div', { class: 'cp-lab' }));
    this.g = this.cv.getContext('2d'); hud.append(this.el); return this.el;
  },
  show(id, label, secs) {
    const p = Photos.get(id); if (!p || !this.ensure()) return; this.id = id; this.t = secs ? (W.t || 0) + secs : 0;
    p.hud = () => { if (this.id === id) this.g.drawImage(p.cv, 0, 0); }; p.hud();
    this.lab.replaceChildren(...label); this.el.classList.remove('hidden', 'out'); this.el.classList.toggle('held', !secs);
  },
  hide(now) { if (!this.el || this.el.classList.contains('hidden')) return; this.id = null; if (now) this.el.classList.add('hidden'); else { this.el.classList.add('out'); setTimeout(() => { if (!this.id) this.el.classList.add('hidden'); }, 260); } },
  update() {
    const c = typeof Props !== 'undefined' && Props.carry, held = c && c.type === 'photo' ? c.id : null;
    if (held && this.id !== held) { const p = Photos.get(held); this.show(held, [h('b', {}, p && p.by ? 'Photo by ' + p.by : 'A photo'), h('span', {}, h('kbd', {}, 'F'), ' throw  ', h('kbd', {}, 'G'), ' drop')]); }
    else if (!held && this.id && (!this.t || (W.t || 0) > this.t)) this.hide();
  }
};
Loop.add(() => PhotoHud.update());

/* =====================================================================
   BONK SNAPCAM — the instant camera item (ItemDefs.polaroid)
   ===================================================================== */
const SnapCam = {
  shots: 5, cool: 0, mats: null,
  icon: '<svg viewBox="0 0 48 48"><rect x="6" y="14" width="36" height="26" rx="5" fill="#f2ead6" stroke="#141824" stroke-width="3"/><path d="M14 14l3-6h14l3 6" fill="#3a3d46" stroke="#141824" stroke-width="3" stroke-linejoin="round"/><rect x="9" y="30" width="30" height="4" fill="#ff7a2e"/><rect x="9" y="34" width="30" height="3" fill="#2bb5a5"/><circle cx="24" cy="25" r="8" fill="#26282f" stroke="#141824" stroke-width="2.5"/><circle cx="24" cy="25" r="4.2" fill="#5d86b8"/><circle cx="22.4" cy="23.4" r="1.5" fill="#fff"/><rect x="33" y="17" width="6" height="4" rx="1" fill="#fff6c8" stroke="#141824" stroke-width="1.6"/><circle cx="12" cy="19" r="2" fill="#e5383b"/></svg>',
  /* shared materials, built once */
  M() {
    if (this.mats) return this.mats; const L = c => new THREE.MeshLambertMaterial({ color: c });
    return (this.mats = { body: L('#efe6cf'), dark: L('#2c2e35'), lens: new THREE.MeshPhongMaterial({ color: '#4d79ad', shininess: 90, specular: 0x99aacc }), orange: L('#ff7a2e'), teal: L('#2bb5a5'), red: L('#e5383b'),
      glow: new THREE.MeshBasicMaterial({ color: '#fff6c8', toneMapped: false }), slot: L('#121216') });
  },
  /* a chunky boxy instant camera, ~14 cm wide, lens facing -z */
  model() {
    const M = this.M(), g = new THREE.Group(), add = (geo, mat, x, y, z, rx) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); if (rx) m.rotation.x = rx; g.add(m); return m; };
    add(rboxGeo(0.14, 0.095, 0.11, 0.02, 2), M.body, 0, 0.0475, 0);
    add(rboxGeo(0.12, 0.03, 0.07, 0.01, 1), M.dark, 0, 0.105, 0.012);                // top hump
    add(rboxGeo(0.035, 0.018, 0.006, 0.004, 1), M.glow, 0.035, 0.105, -0.025);       // flash window
    add(rboxGeo(0.022, 0.016, 0.01, 0.004, 1), M.dark, -0.035, 0.108, -0.024);        // viewfinder
    add(rboxGeo(0.142, 0.012, 0.112, 0.004, 1), M.orange, 0, 0.026, 0);              // stripes
    add(rboxGeo(0.142, 0.01, 0.112, 0.004, 1), M.teal, 0, 0.015, 0);
    add(cylGeo(0.034, 0.036, 0.03, 18), M.dark, 0, 0.055, -0.058, Math.PI / 2);       // lens barrel
    add(cylGeo(0.022, 0.022, 0.006, 16), M.lens, 0, 0.055, -0.073, Math.PI / 2);
    add(cylGeo(0.008, 0.008, 0.008, 10), M.red, -0.05, 0.097, -0.035);                // shutter button
    add(rboxGeo(0.09, 0.006, 0.01, 0.002, 1), M.slot, 0, 0.006, -0.052);              // photo slot
    g.userData.nozzle = new THREE.Vector3(0, 0.0, -0.06);
    return g;
  },
  /* what is in the picture? a silly caption */
  caption() {
    const cam = W.camera, f = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion); let best = null, bs = 0.93;
    const test = (av, name, kind) => {
      if (!av || !av.group.visible) return; const p = av.head.getWorldPosition(new THREE.Vector3()).sub(cam.position), d = p.length(); if (d > 9 || d < 0.3) return;
      const dot = p.dot(f) / d; if (dot > bs && Space.ray(cam.position.x, cam.position.y, cam.position.z, p.x / d, p.y / d, p.z / d, d, 0) >= d - 0.4) { bs = dot; best = { name, kind }; }
    };
    for (const [id, a] of W.avatars) { const p = Net.players.get(id); test(a.av, p && p.name, 'player'); }
    W.npcs.forEach(n => test(n, null, 'npc')); test(W.boss, 'The Boss', 'boss');
    if (best && best.kind === 'boss') return pick(['The Boss (burn after viewing)', 'Boss, unaware', 'Evidence for the union', 'Management, in the wild']);
    if (best && best.kind === 'player' && best.name) return pick([best.name + ', hard at work', best.name + ' (caught)', 'Employee of the month: ' + best.name, best.name + ' mid-scam', 'Wanted: ' + best.name]);
    if (best) return pick(['Coworker, probably', 'Who is this guy?', 'Team building', 'Not my best angle', 'Fresh hire']);
    const room = Cams.roomAt(P.pos.x, P.pos.z);
    return pick({ break: ['Break room, again', 'Snack time', 'Who took my yogurt?'], review: ['Exhibit A', 'Crime scene', 'Review prep'], boss: ['Forbidden zone', 'The big chair'], hall: ['The long hallway', 'Escape route'], lobby: ['Freedom!', 'The outside world'] }[room] || ['Another day at the office', 'Quota vibes', 'Cubicle life', 'Totally legit', 'Day ' + (G.day || 1) + ' memories', 'Look busy!']);
  },
  stamp() { const d = new Date(), c = OS.clock ? OS.clock() : null, s = c && c[1] ? new Date(c[1]) : d, k = isNaN(s) ? d : s, z = n => String(n).padStart(2, '0'); return "'" + String(k.getFullYear()).slice(2) + ' ' + z(k.getMonth() + 1) + ' ' + z(k.getDate()); },
  sound() {
    if (!FXSnd.ok()) { SFX.click(); return; }
    FXSnd.noise(0.05, 0.22, 0, 5200, 2600, 'bandpass', 0.8); FXSnd.tone(1800, 900, 0.03, 'square', 0.05); FXSnd.noise(0.04, 0.16, 0.07, 3000, 1500, 'bandpass', 1);   // ka-chick
    FXSnd.tone(950, 1250, 0.18, 'sine', 0.03, 0.01);                                                                                                  // flash whine
    for (let i = 0; i < 6; i++) FXSnd.tone(140, 150, 0.08, 'sawtooth', 0.04, 0.32 + i * 0.075, 900);                                                // ejection motor
  },
  /* take the picture: render the view, print the card, flash, eject the photo, tell everyone */
  use() {
    if ((W.t || 0) < this.cool || !Inv.count('polaroid')) return; this.cool = (W.t || 0) + 1.3;
    Inv.take('polaroid'); const left = Inv.count('polaroid');
    let pic = null;
    try { pic = Cams.snap({ w: Photos.IMG, h: Photos.IMG, me: !!P.third, fov: Math.min(70, W.camera.fov) }); } catch (e) { console.error('snap failed', e); }
    if (!pic) return;
    const cap = this.caption(), card = Photos.card(pic, cap, this.stamp()), id = Props.newId(), url = card.toDataURL('image/jpeg', 0.72);
    const p = Photos.add(id, card, { by: settings.name, cap }); Photos.keep(id, url, p);
    const hp = Props.handPos();
    Net.emit('cam:photo', { id, img: url, by: settings.name, cap, p: [+hp.x.toFixed(2), +hp.y.toFixed(2), +hp.z.toFixed(2)] });
    FX.flash('#ffffff', 0.4, 0.92); this.sound(); this.glint(hp); Props.vmKick = 0;
    PhotoHud.show(id, [h('b', {}, 'Developing…'), h('span', {}, left ? left + ' shot' + (left === 1 ? '' : 's') + ' left' : 'Out of film')], 4.5);
    setTimeout(() => {   // the motor spits the photo out of the front slot
      const o = Props.handPos(), f = aimDir(), sy = Math.sin(P.yaw), cy = Math.cos(P.yaw);
      Props.launch('photo', [o.x + f.x * 0.12, o.y + 0.02, o.z + f.z * 0.12], [f.x * 1.6 - sy * 0 + (P.vx || 0) * 0.5, 1.1 + f.y * 0.8, f.z * 1.6 + (P.vz || 0) * 0.5 + cy * 0], { id });
      if (!left) toast('Out of film. BonkMart sells more.', '');
    }, 420);
  },
  /* the flash as others see it: a bright glint at the camera */
  glint(p) {
    FX.particle({ layer: 'add', pos: [p.x, p.y + 0.05, p.z], ttl: 0.18, size: [0.25, 1.6], color: '#ffffff', alpha: [1, 0], frame: 'soft' });
    FX.particle({ layer: 'add', pos: [p.x, p.y + 0.05, p.z], ttl: 0.12, size: [0.6, 0.2], color: '#fff6c8', alpha: [1, 0], frame: 'spark' });
  }
};
ItemDefs.polaroid = {
  name: 'Bonk SnapCam', icon: SnapCam.icon, desc: 'Instant camera. Point, click, and a photo pops out for everyone to see. 5 shots per film pack.',
  hint: 'Click to snap a photo', throwable: false, model: () => SnapCam.model(), use: () => SnapCam.use()
};
Shop.add({
  id: 'polaroid', tab: 'goods', section: 'Gadgets', name: 'Bonk SnapCam', price: 80, icon: 'camera', emoji: '📸', color: '#f2a93b', repeatable: true, sort: 300,
  desc: 'Instant camera with a 5-shot film pack. Catch coworkers napping, frame the boss, pin evidence to the fridge. Photos pop out, flutter down and can be passed around.',
  owned: () => false, available: () => true,
  art(g, w, hh) { SnapCam.art(g, w, hh); },
  buy() { Inv.give('polaroid', SnapCam.shots); toast('Bonk SnapCam added to your hotbar (' + Inv.count('polaroid') + ' shots).', 'good'); if (typeof Game !== 'undefined') Game.saveProgress(); }
});
/* shop picture: the camera with a photo popping out */
SnapCam.art = (g, w, hh) => {
  const s = Math.min(w, hh) / 100, cx = w / 2, cy = hh / 2; g.save(); g.translate(cx, cy); g.scale(s, s); g.lineJoin = 'round'; g.lineWidth = 3; g.strokeStyle = '#141824';
  const rr = (x, y, ww, hh2, r, fill) => { g.beginPath(); g.roundRect ? g.roundRect(x, y, ww, hh2, r) : g.rect(x, y, ww, hh2); g.fillStyle = fill; g.fill(); g.stroke(); };
  g.save(); g.rotate(-0.12); rr(-16, -46, 34, 40, 2, '#fbf8ef'); g.fillStyle = '#e7a35a'; g.fillRect(-12, -42, 26, 26); g.fillStyle = '#ffd36b'; g.beginPath(); g.arc(-2, -32, 6, 0, 7); g.fill(); g.restore();
  rr(-38, -18, 76, 52, 8, '#f2ead6'); g.fillStyle = '#3a3d46'; g.beginPath(); g.moveTo(-22, -18); g.lineTo(-16, -30); g.lineTo(16, -30); g.lineTo(22, -18); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#ff7a2e'; g.fillRect(-36, 18, 72, 6); g.fillStyle = '#2bb5a5'; g.fillRect(-36, 24, 72, 5);
  g.beginPath(); g.arc(0, 4, 17, 0, 7); g.fillStyle = '#26282f'; g.fill(); g.stroke(); g.beginPath(); g.arc(0, 4, 9, 0, 7); g.fillStyle = '#5d86b8'; g.fill(); g.beginPath(); g.arc(-3, 1, 3, 0, 7); g.fillStyle = '#fff'; g.fill();
  rr(22, -12, 11, 7, 1.5, '#fff6c8'); g.beginPath(); g.arc(-28, -9, 3.5, 0, 7); g.fillStyle = '#e5383b'; g.fill(); g.stroke(); g.restore();
};

/* ---------- network: everyone gets the same photo ---------- */
Net.on('cam:photo', (d, from) => {
  if (!d || typeof d.id !== 'string' || typeof d.img !== 'string' || !/^data:image\/(jpeg|png);base64,/.test(d.img) || d.img.length > 400000) return;
  const meta = { by: String(d.by || '').slice(0, 24), cap: String(d.cap || '').slice(0, 60) };
  Photos.add(d.id, d.img, meta);
  if (Array.isArray(d.p)) { const p = { x: +d.p[0] || 0, y: +d.p[1] || 0, z: +d.p[2] || 0 }; SnapCam.glint(p); if (FXSnd.ok() && W.camera && W.camera.position.distanceTo(_camV.set(p.x, p.y, p.z)) < 14) FXSnd.noise(0.06, 0.12 * FXSnd.vol(p), 0, 5200, 2600, 'bandpass', 0.8); }
});
/* late joiners (or a missed message): ask the host for a photo by id */
Net.on('cam:photoReq', (d, from) => {
  if (!Net.isHost || !d || typeof d.id !== 'string') return; const u = Photos.urls.get(d.id); if (!u) return;
  Net.emit('cam:photo', { id: d.id, img: u.url, by: u.by, cap: u.cap }, { to: from });
});
const _camV = new THREE.Vector3();
