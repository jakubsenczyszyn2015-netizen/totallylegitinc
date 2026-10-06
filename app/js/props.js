'use strict';
/* PROPS — physics objects, held items, punching, item behaviour (ItemDefs).
   - PropArt: generated models (paper ball, soda can, beans, whoopee cushion, party popper, box, hands)
   - PropTypes + Props: simple rigid bodies (fixed 120 Hz steps, deterministic so every client sees the same flight)
     that bounce off the floor, desk tops, W.colliders; pick up (E), carry, throw (F / click), drop (G)
   - hotbar (6 slots from Inv + ItemDefs), first-person view model, held item in avatars' hands (Net.addMe 'held')
   - melee (Q / right mouse), NPC + boss reactions, items: soda, beans, whoopee, confetti
   See docs/modules/props.md. */

/* ---------- generated models (shared geometries and materials) ---------- */
const PropArt = (() => {
  const geo = {}, mats = {};
  const once = (k, f) => geo[k] || (geo[k] = f());
  const lam = (c, o) => { const k = c + JSON.stringify(o || {}); return mats[k] || (mats[k] = new THREE.MeshLambertMaterial(Object.assign({ color: c }, o || {}))); };
  function tex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t; }
  const FONT = '"Lilita One", "Alfa Slab One", Impact, sans-serif';
  /* rounded box: a segmented box whose vertices are pulled onto a rounded shell */
  function rbox(w, h, d, r, seg) {
    const g = new THREE.BoxGeometry(w, h, d, seg || 3, seg || 3, seg || 3), p = g.attributes.position, v = new THREE.Vector3(), c = new THREE.Vector3();
    const hx = w / 2 - r, hy = h / 2 - r, hz = d / 2 - r;
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); c.set(clamp(v.x, -hx, hx), clamp(v.y, -hy, hy), clamp(v.z, -hz, hz)); v.sub(c).normalize().multiplyScalar(r).add(c); p.setXYZ(i, v.x, v.y, v.z); }
    g.computeVertexNormals(); return g;
  }
  const paperGeo = () => once('paper', () => {
    const g = new THREE.IcosahedronGeometry(0.075, 1), p = g.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n = Math.sin(v.x * 91 + v.y * 37) * Math.cos(v.z * 73 - v.x * 19) * 0.5 + Math.sin(v.y * 140 + v.z * 51) * 0.5; v.multiplyScalar(1 + n * 0.22); p.setXYZ(i, v.x, v.y, v.z); }
    g.computeVertexNormals(); return g;
  });
  const paperMat = () => lam('#f4f0e4');   // non-indexed geometry: computeVertexNormals gives faceted, crumpled shading
  function label(kind) {
    return mats['tex' + kind] || (mats['tex' + kind] = tex(256, 128, (g, w, h) => {
      if (kind === 'soda' || kind === 'empty') {
        const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ffb238'); gr.addColorStop(0.5, '#ff8a12'); gr.addColorStop(1, '#e8620a'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
        g.fillStyle = '#fff4dc'; g.beginPath(); g.moveTo(0, 92); for (let x = 0; x <= w; x += 8) g.lineTo(x, 88 + Math.sin(x / 20) * 8); g.lineTo(w, 108); for (let x = w; x >= 0; x -= 8) g.lineTo(x, 104 + Math.sin(x / 20) * 8); g.fill();
        g.font = '54px ' + FONT; g.textAlign = 'center'; g.lineWidth = 8; g.strokeStyle = '#7a2a00'; g.strokeText('BONK', 80, 66); g.fillStyle = '#ffffff'; g.fillText('BONK', 80, 66);
        g.font = '20px ' + FONT; g.fillStyle = '#7a2a00'; g.fillText('ORANGE FIZZ', 200, 50); g.fillText('EXTRA SHAKY', 200, 74);
        if (kind === 'empty') { g.fillStyle = 'rgba(60,40,20,.35)'; g.fillRect(0, 0, w, h); }
      } else if (kind === 'beans') {
        g.fillStyle = '#8c3b1c'; g.fillRect(0, 0, w, h); g.fillStyle = '#f2e3b8'; g.fillRect(0, 18, w, 92);
        for (let i = 0; i < 9; i++) { g.fillStyle = '#c4531f'; g.beginPath(); g.ellipse(30 + i * 26, 92, 10, 6, i, 0, 7); g.fill(); }
        g.font = '44px ' + FONT; g.textAlign = 'center'; g.fillStyle = '#8c3b1c'; g.fillText('BEANS', 128, 66); g.font = '16px ' + FONT; g.fillText('BOTTOMLESS  •  EXTRA AIRY', 128, 32);
      } else if (kind === 'popper') {
        for (let i = 0; i < 8; i++) { g.fillStyle = ['#ff3b6b', '#ffd23b', '#3bc9ff', '#7cf05b'][i % 4]; g.beginPath(); g.moveTo(i * 32 - 20, h); g.lineTo(i * 32 + 12, h); g.lineTo(i * 32 + 52, 0); g.lineTo(i * 32 + 20, 0); g.fill(); }
      } else if (kind === 'box') {
        g.fillStyle = '#c99a62'; g.fillRect(0, 0, w, h); for (let i = 0; i < 300; i++) { g.fillStyle = 'rgba(90,60,30,' + Math.random() * 0.12 + ')'; g.fillRect(Math.random() * w, Math.random() * h, 3, 1); }
        g.fillStyle = '#d9c39a'; g.fillRect(0, 54, w, 20); g.font = '26px ' + FONT; g.textAlign = 'center'; g.fillStyle = '#3a2a18'; g.fillText('TPS REPORTS', 128, 44); g.font = '15px ' + FONT; g.fillText('FRAGILE  •  DO NOT READ', 128, 104);
      }
    }));
  }
  function can(kind) {
    const k = kind || 'soda', r = k === 'beans' ? 0.04 : 0.033, hh = k === 'beans' ? 0.1 : 0.12;
    const g = new THREE.Group();
    const body = new THREE.Mesh(once('can' + k, () => new THREE.CylinderGeometry(r, r, hh, 16, 1, true)), mats['m' + k] || (mats['m' + k] = new THREE.MeshLambertMaterial({ map: label(k) })));
    const top = new THREE.Mesh(once('cantop' + k, () => new THREE.CylinderGeometry(r * 0.88, r, 0.01, 16)), lam('#cfd3d8'));
    const bot = new THREE.Mesh(once('canbot' + k, () => new THREE.CylinderGeometry(r, r * 0.88, 0.01, 16)), lam('#aeb3ba'));
    body.rotation.y = k === 'beans' ? -Math.PI : -1.95;   // the brand name faces +z
    top.position.y = hh / 2 + 0.005; bot.position.y = -hh / 2 - 0.005; g.add(body, top, bot);
    if (k !== 'beans') { const tab = new THREE.Mesh(boxGeo(0.012, 0.003, 0.02), lam('#e2e5ea')); tab.position.set(0, hh / 2 + 0.011, 0.008); g.add(tab); }
    g.userData.nozzle = new THREE.Vector3(0, hh / 2 + 0.02, 0); return g;
  }
  function cushion() {
    const g = new THREE.Group();
    const b = new THREE.Mesh(once('cush', () => { const s = new THREE.SphereGeometry(0.11, 16, 10); s.scale(1, 0.3, 0.9); return s; }), lam('#ff6fa8'));
    const n = new THREE.Mesh(once('cushn', () => new THREE.CylinderGeometry(0.018, 0.026, 0.06, 10)), lam('#e04f8a')); n.rotation.x = Math.PI / 2; n.position.set(0, 0, 0.11);
    const hl = new THREE.Mesh(once('cushh', () => { const s = new THREE.SphereGeometry(0.05, 10, 6); s.scale(1, 0.25, 0.6); return s; }), lam('#ffb3d1')); hl.position.set(-0.03, 0.025, -0.02);
    g.add(b, n, hl); return g;
  }
  function popper() {
    const g = new THREE.Group();
    const c = new THREE.Mesh(once('pop', () => new THREE.ConeGeometry(0.034, 0.13, 14, 1, true)), mats.mpop || (mats.mpop = new THREE.MeshLambertMaterial({ map: label('popper'), side: THREE.DoubleSide })));
    c.rotation.x = Math.PI; const cap = new THREE.Mesh(once('popc', () => new THREE.CylinderGeometry(0.034, 0.034, 0.012, 14)), lam('#ffd23b')); cap.position.y = 0.066;
    const str = new THREE.Mesh(boxGeo(0.004, 0.05, 0.004), lam('#ffffff')); str.position.set(0.01, -0.085, 0);
    g.add(c, cap, str); g.userData.nozzle = new THREE.Vector3(0, 0.08, 0); return g;
  }
  function cardbox() {
    const g = new THREE.Group(), m = mats.mbox || (mats.mbox = new THREE.MeshLambertMaterial({ map: label('box') }));
    const b = new THREE.Mesh(once('box', () => rbox(0.42, 0.3, 0.32, 0.015, 2)), m); g.add(b);
    const tape = new THREE.Mesh(boxGeo(0.425, 0.004, 0.07), lam('#b8925a')); tape.position.y = 0.151; g.add(tape); return g;
  }
  function fist(skin, shirt) {
    const g = new THREE.Group(), m = lam(skin);
    const f = new THREE.Mesh(once('fist', () => rbox(0.1, 0.09, 0.11, 0.038, 3)), m); g.add(f);
    const t = new THREE.Mesh(once('thumb', () => rbox(0.035, 0.035, 0.065, 0.016, 2)), m); t.position.set(-0.05, -0.015, -0.01); t.rotation.y = 0.3; g.add(t);
    const cuff = new THREE.Mesh(once('cuff', () => new THREE.CylinderGeometry(0.045, 0.05, 0.09, 12)), lam(shirt || '#f4f4f4')); cuff.rotation.x = Math.PI / 2; cuff.position.set(0.004, -0.004, 0.1); cuff.scale.setScalar(0.85); g.add(cuff);
    return g;
  }
  /* first-person hand gripping an item (palm behind, fingers wrapped in front, thumb, shirt cuff) */
  function grip(skin, shirt) {
    const g = new THREE.Group(), m = lam(skin), add = (geo, x, y, z, rx, ry, rz, mm) => { const o = new THREE.Mesh(geo, mm || m); o.position.set(x, y, z); o.rotation.set(rx || 0, ry || 0, rz || 0); g.add(o); return o; };
    add(once('palm', () => rbox(0.05, 0.062, 0.04, 0.018, 3)), 0.026, -0.01, 0.024, 0, 0.5, 0.15);
    add(once('fing', () => rbox(0.06, 0.03, 0.022, 0.01, 2)), 0.002, -0.008, -0.03, 0, -0.25, 0.08);
    add(once('fing2', () => rbox(0.054, 0.027, 0.02, 0.009, 2)), 0.004, -0.036, -0.026, 0, -0.25, 0.12);
    add(once('thmb', () => rbox(0.02, 0.04, 0.02, 0.009, 2)), -0.03, 0.012, -0.01, 0, 0, -0.5);
    return g;
  }
  function item(id) {
    const d = ItemDefs[id]; let m = null;
    try { m = d && d.model ? d.model() : null; } catch (e) { m = null; }
    if (!m) { m = new THREE.Mesh(once('gen', () => rbox(0.1, 0.1, 0.1, 0.02, 2)), lam('#7c8db5')); }
    return m;
  }
  return { rbox, lam, tex, paperGeo, paperMat, can, cushion, popper, cardbox, fist, grip, item, beans: () => can('beans') };
})();

/* ---------- item icons for the hotbar / shop (inline SVG, chunky outlines) ---------- */
const PropIcons = {
  paper: '<svg viewBox="0 0 48 48"><path d="M10 26c-2-9 6-17 15-16 9 0 15 7 13 16-1 8-8 13-16 12-7 0-11-5-12-12z" fill="#f4f0e4" stroke="#141824" stroke-width="3" stroke-linejoin="round"/><path d="M16 21l7 4 6-7M19 32l5-6 7 5M27 24l7 1" fill="none" stroke="#b9b2a0" stroke-width="2.4" stroke-linecap="round"/></svg>',
  soda: '<svg viewBox="0 0 48 48"><rect x="13" y="7" width="22" height="35" rx="5" fill="#ff8a12" stroke="#141824" stroke-width="3"/><rect x="15" y="8" width="18" height="5" rx="2" fill="#d9dde2"/><path d="M14 30c5-3 10 3 20-1v5c-10 4-15-2-20 1z" fill="#fff4dc"/><text x="24" y="27" font-family="Lilita One,sans-serif" font-size="11" text-anchor="middle" fill="#fff" stroke="#7a2a00" stroke-width="1">BONK</text></svg>',
  beans: '<svg viewBox="0 0 48 48"><rect x="11" y="10" width="26" height="30" rx="4" fill="#8c3b1c" stroke="#141824" stroke-width="3"/><rect x="11" y="16" width="26" height="18" fill="#f2e3b8"/><ellipse cx="18" cy="29" rx="3.5" ry="2.2" fill="#c4531f"/><ellipse cx="25" cy="30" rx="3.5" ry="2.2" fill="#c4531f"/><ellipse cx="31" cy="28" rx="3" ry="2" fill="#c4531f"/><text x="24" y="25" font-family="Lilita One,sans-serif" font-size="8" text-anchor="middle" fill="#8c3b1c">BEANS</text><path d="M30 8c3-3 6-3 8 0M33 4c2-2 5-1 6 1" fill="none" stroke="#9fd63a" stroke-width="2.4" stroke-linecap="round"/></svg>',
  whoopee: '<svg viewBox="0 0 48 48"><ellipse cx="22" cy="28" rx="15" ry="10" fill="#ff6fa8" stroke="#141824" stroke-width="3"/><path d="M35 27l7-3v8l-7-2z" fill="#e04f8a" stroke="#141824" stroke-width="2.5" stroke-linejoin="round"/><ellipse cx="18" cy="24" rx="6" ry="2.5" fill="#ffb3d1"/></svg>',
  confetti: '<svg viewBox="0 0 48 48"><path d="M8 42l10-24 12 12z" fill="#ffd23b" stroke="#141824" stroke-width="3" stroke-linejoin="round"/><path d="M12 33l4-9M16 37l7-6" stroke="#ff3b6b" stroke-width="3"/><rect x="30" y="8" width="5" height="5" fill="#ff3b6b" transform="rotate(20 32 10)"/><rect x="38" y="18" width="5" height="5" fill="#3bc9ff" transform="rotate(-25 40 20)"/><rect x="24" y="5" width="4" height="4" fill="#7cf05b"/><circle cx="40" cy="9" r="2.5" fill="#b46bff"/><path d="M28 18c3-4 7-3 9-7" fill="none" stroke="#ff8a2b" stroke-width="2.5" stroke-linecap="round"/></svg>',
  box: '<svg viewBox="0 0 48 48"><path d="M8 16l16-7 16 7v20l-16 7-16-7z" fill="#c99a62" stroke="#141824" stroke-width="3" stroke-linejoin="round"/><path d="M8 16l16 7 16-7M24 23v20" fill="none" stroke="#141824" stroke-width="2.5"/></svg>',
  can: '<svg viewBox="0 0 48 48"><rect x="13" y="12" width="22" height="30" rx="5" fill="#a3683a" stroke="#141824" stroke-width="3" transform="rotate(-20 24 27)"/></svg>',
  fist: '<svg viewBox="0 0 48 48"><rect x="12" y="14" width="24" height="20" rx="8" fill="#e9b98f" stroke="#141824" stroke-width="3"/><path d="M18 14v8M24 14v8M30 14v8" stroke="#141824" stroke-width="2.2"/></svg>'
};
function propIcon(id) {
  const d = ItemDefs[id], ic = (d && d.icon) || PropIcons[id];
  if (ic && /^\s*<svg/.test(ic)) return ic;
  if (ic) return '<span class="hb-emoji">' + String(ic).replace(/</g, '&lt;') + '</span>';
  return '<span class="hb-emoji">' + ((d && d.name) || id || '?').charAt(0).toUpperCase() + '</span>';
}

/* ---------- physics bodies ---------- */
const PropTypes = {
  paper: { name: 'paper ball', r: 0.075, bounce: 0.45, fric: 0.35, roll: true, inst: true },
  box: { name: 'cardboard box', r: 0.16, bounce: 0.18, fric: 0.9, box: 0.15, model: () => PropArt.cardbox() },
  can: { name: 'empty can', r: 0.045, bounce: 0.4, fric: 0.3, roll: true, model: () => PropArt.can('empty') },
  soda: { name: 'Bonk soda', r: 0.05, bounce: 0.35, fric: 0.4, roll: true, item: 'soda', model: () => PropArt.can('soda') },
  beans: { name: 'can of beans', r: 0.05, bounce: 0.3, fric: 0.4, roll: true, item: 'beans', model: () => PropArt.beans() },
  whoopee: { name: 'whoopee cushion', r: 0.07, bounce: 0.62, fric: 0.6, item: 'whoopee', model: () => PropArt.cushion() },
  confetti: { name: 'party popper', r: 0.05, bounce: 0.35, fric: 0.4, item: 'confetti', model: () => PropArt.popper() },
  item: { name: 'item', r: 0.06, bounce: 0.3, fric: 0.5 }   // anything from another module's ItemDefs (b.item)
};

const HB_N = 9;   // hotbar slots: paper + up to 8 kinds of items (keys 1-9)
const Props = {
  bodies: [], byId: new Map(), seq: 0, ver: 1, acc: 0, H: 1 / 120, MAX: 70,
  carry: null, sel: 0, slots: ['paper'], useDown: false, useT: 0, throwT: 0, punchT: 0, punchN: 0, sodaLeft: 0, _own: false,
  inst: null, vm: null, held: new Map(), cushions: [], _targets: [], _lastShared: -1, _taken: new Map(),

  newId() { return (Net.active ? String(Net.myId).slice(-4) : 'l') + '.' + (++this.seq).toString(36); },
  /* spawn a body. type: key of PropTypes. o/v: [x,y,z]. opts: {id, item, local, rest, spin, owner, ry} */
  spawn(type, o, v, opts) {
    opts = opts || {}; const def = PropTypes[type] || PropTypes.item; if (!W.scene) return null;
    const id = opts.id || this.newId(); if (this.byId.has(id)) this.remove(this.byId.get(id));
    let m;
    if (def.inst) m = new THREE.Object3D();
    else { m = def.model ? def.model() : PropArt.item(opts.item); W.scene.add(m); }
    m.position.set(+o[0] || 0, +o[1] || 0, +o[2] || 0);
    if (opts.ry) m.rotation.y = opts.ry;
    const b = { id, type, def, item: opts.item || def.item || null, m, pos: m.position, vel: new THREE.Vector3(+v[0] || 0, +v[1] || 0, +v[2] || 0), spin: new THREE.Vector3(),
      r: def.r, rest: !!opts.rest, restT: 0, restAge: 0, t: opts.rest ? 5 : 0, life: 16, local: !!opts.local, owner: opts.owner || null, hitT: 0, settle: null };
    if (opts.spin) b.spin.set(opts.spin[0], opts.spin[1], opts.spin[2]); else if (!b.rest) b.spin.set(rand(-9, 9), rand(-5, 5), rand(-9, 9));
    if (def.inst) { m.rotation.set(rand(6), rand(6), rand(6)); W.balls.push(b); }
    this.bodies.push(b); this.byId.set(id, b);
    b.inter = { prop: b, pos: b.pos, label: () => (b.rest || b.vel.lengthSq() < 0.5) && !Props.carry && Game.canControl() ? 'Pick up ' + (b.item && ItemDefs[b.item] ? ItemDefs[b.item].name : def.name) : null, act: () => Props.pickup(b) };
    W.interact.push(b.inter);
    if (b.rest) this.ver++;
    this.cap();
    return b;
  },
  remove(b) {
    if (!b || !this.byId.has(b.id)) return; this.byId.delete(b.id);
    const i = this.bodies.indexOf(b); if (i >= 0) this.bodies.splice(i, 1);
    const k = W.interact.indexOf(b.inter); if (k >= 0) W.interact.splice(k, 1);
    if (b.def.inst) { const j = W.balls.indexOf(b); if (j >= 0) W.balls.splice(j, 1); } else W.scene.remove(b.m);
    this.ver++;
  },
  clear() { for (const b of [...this.bodies]) this.remove(b); this.carry = null; for (const c of this.cushions) W.scene.remove(c.m); this.cushions = []; this._lastShared = undefined; },
  /* too many props: drop the oldest resting paper balls first */
  cap() {
    if (this.bodies.length <= this.MAX) return;
    const old = this.bodies.find(b => b.rest && b.type === 'paper') || this.bodies.find(b => b.rest) || this.bodies[0]; this.remove(old);
  },
  /* launch an existing or new body and tell everyone (deterministic flight on every client) */
  launch(type, o, v, opts) {
    opts = opts || {}; const id = opts.id || this.newId(), spin = [rand(-9, 9), rand(-5, 5), rand(-9, 9)].map(x => +x.toFixed(2));
    const r = n => +(+n).toFixed(3);
    o = o.map(r); v = v.map(r);
    const b = this.spawn(type, o, v, { id, item: opts.item, local: true, spin, owner: 'me' });
    Net.emit('prop:throw', { id, t: type, i: opts.item || undefined, o, v, s: spin });
    return b;
  },

  /* ----- simulation ----- */
  step(b, h) {
    const p = b.pos, v = b.vel, d = b.def, r = b.r;
    v.y -= 9.8 * h; const dr = 1 - 0.05 * h; v.x *= dr; v.z *= dr;
    const ox = p.x, oy = p.y, oz = p.z; let nx = ox + v.x * h, ny = oy + v.y * h, nz = oz + v.z * h, ground = false;
    const c = Space.solid(nx, ny, nz, r);
    if (c) {
      const top = Space.top(c), wb = 0.45;
      if (top <= Space.TALL && oy - r >= top - 0.03) { ny = top + r; ground = true; }
      else if (!Space.solid(ox, ny, nz, r)) { nx = ox; v.x = -v.x * wb; }
      else if (!Space.solid(nx, ny, oz, r)) { nz = oz; v.z = -v.z * wb; }
      else if (!Space.solid(ox, ny, oz, r)) { nx = ox; nz = oz; v.x = -v.x * wb; v.z = -v.z * wb; }
      else {   // stuck inside: push out along the smallest overlap
        const px0 = nx - (c.x0 - r), px1 = (c.x1 + r) - nx, pz0 = nz - (c.z0 - r), pz1 = (c.z1 + r) - nz, m = Math.min(px0, px1, pz0, pz1);
        if (m === px0) nx = c.x0 - r - 0.01; else if (m === px1) nx = c.x1 + r + 0.01; else if (m === pz0) nz = c.z0 - r - 0.01; else nz = c.z1 + r + 0.01;
      }
    }
    const g = Space.ground(nx, oy - r, nz);
    if (ny - r <= g) { ny = g + r; ground = true; }
    if (ground && v.y < 0) {
      if (v.y < -1.1) { v.y = -v.y * d.bounce; b.spin.multiplyScalar(0.7); if (b.local && -v.y > 1.5) SFX.bounce(); }
      else v.y = 0;
      if (v.y === 0) { const s = Math.hypot(v.x, v.z), dec = (d.roll ? 0.9 : d.fric * 9.8) * h; if (s <= dec) { v.x = 0; v.z = 0; } else { v.x *= (s - dec) / s; v.z *= (s - dec) / s; } }
    }
    if (ny + r > ROOM_H) { ny = ROOM_H - r; v.y = -Math.abs(v.y) * 0.4; }
    const B = W.bounds; if (B) { nx = clamp(nx, B.x0 - 0.6, B.x1 + 5); nz = clamp(nz, B.z0 - 0.6, B.z1 + 0.6); }
    p.set(nx, ny, nz);
    // rotation: roll on the ground, tumble in the air
    if (ground && v.y === 0 && d.roll) { const s = Math.hypot(v.x, v.z); if (s > 0.01) { _pAx.set(v.z / s, 0, -v.x / s); _pQ.setFromAxisAngle(_pAx, s * h / r); b.m.quaternion.premultiply(_pQ); } b.spin.multiplyScalar(0.9); }
    else { const w = b.spin.length(); if (w > 0.01) { _pAx.copy(b.spin).divideScalar(w); _pQ.setFromAxisAngle(_pAx, w * h); b.m.quaternion.premultiply(_pQ); } if (ground) b.spin.multiplyScalar(0.85); }
    // come to rest
    if (ground && v.y === 0 && v.x * v.x + v.z * v.z < 0.02) { b.restT += h; if (b.restT > 0.2) this.sleep(b, g); } else b.restT = 0;
    if (p.y < -3) { p.set(ox, 1, oz); v.set(0, 0, 0); }
  },
  sleep(b, g) {
    b.rest = true; b.vel.set(0, 0, 0); b.spin.set(0, 0, 0); b.restAge = 0; this.ver++;
    if (b.def.box) {   // lie flat, keep the heading
      _pE.setFromQuaternion(b.m.quaternion, 'YXZ'); b.settle = new THREE.Quaternion().setFromEuler(_pE.set(0, _pE.y, 0)); b.pos.y = g + b.def.box;
    }
  },
  wake(b) { if (b.rest) { b.rest = false; b.restT = 0; this.ver++; } },
  checkBins(b) {
    if (b.type !== 'paper' || b.vel.y >= 0) return false;
    const p = b.pos; if (p.y > 0.5 || p.y < 0.18) return false;
    for (const bin of W.bins) if (Math.hypot(p.x - bin.x, p.z - bin.z) < 0.19) {
      if (b.local) { SFX.bin(); if (now() - (Props._binT || 0) > 1.5) { Props._binT = now(); toast(pick(['Nice shot.', 'Nothing but bin.', 'Put that on your review.', 'Three points. Zero dollars.']), 'good'); } Bus.emit('prop:bin', b); }
      else SFX.bounce();
      FX.spawn('puff', [bin.x, 0.45, bin.z], { scale: 0.4, color: '#f4f0e4' });
      return true;
    }
    return false;
  },
  /* thrown props bonking people (only the thrower decides, then re-syncs the flight) */
  checkHits(b, t) {
    if (!b.local || t - b.hitT < 0.4 || b.vel.lengthSq() < 9) return;
    const T = Props._targets, p = b.pos;
    for (let i = 0; i < T.length; i++) {
      const g = T[i]; if (g.me) continue;
      const dx = p.x - g.x, dz = p.z - g.z, dd = Math.hypot(dx, dz);
      if (dd > g.r + b.r || p.y < g.y0 || p.y > g.y1) continue;
      b.hitT = t; const nx = dx / (dd || 1), nz = dz / (dd || 1), dot = b.vel.x * nx + b.vel.z * nz;
      if (dot < 0) { b.vel.x -= 1.6 * dot * nx; b.vel.z -= 1.6 * dot * nz; } b.vel.multiplyScalar(0.4); b.vel.y = Math.max(b.vel.y, 1.2);
      Props.launch(b.type, [p.x, p.y, p.z], [b.vel.x, b.vel.y, b.vel.z], { id: b.id, item: b.item });
      FX.net('hit', [p.x, p.y, p.z], { n: 3, scale: 0.55 }); SFX.bonk(p);
      if (g.kind === 'player') Net.emit('bonk', { id: g.id }); else Props.npcNet(g.n, 'bonk');
      return;
    }
  },
  update(dt, t) {
    this.acc = Math.min(this.acc + dt, 0.1); const H = this.H;
    while (this.acc >= H) {
      this.acc -= H;
      for (let i = this.bodies.length - 1; i >= 0; i--) { const b = this.bodies[i]; if (b.rest) continue; this.step(b, H); if (this.checkBins(b)) this.remove(b); }
    }
    for (let i = this.bodies.length - 1; i >= 0; i--) {
      const b = this.bodies[i]; b.t += dt; if (b.def.inst) b.life = 16 - b.t;
      if (b.rest) { b.restAge += dt; if (b.settle) { b.m.quaternion.slerp(b.settle, Math.min(1, dt * 12)); if (b.m.quaternion.angleTo(b.settle) < 0.01) { b.m.quaternion.copy(b.settle); b.settle = null; } } }
      else this.checkHits(b, t);
    }
    // instanced paper balls
    const im = this.inst; let n = 0;
    if (im) { for (const b of this.bodies) if (b.def.inst && n < im.count0) { b.m.updateMatrix(); im.setMatrixAt(n++, b.m.matrix); } im.count = n; if (n) im.instanceMatrix.needsUpdate = true; }
  },
  /* host: the resting props, for late joiners and drift correction */
  shared() {
    const l = []; for (const b of this.bodies) if (b.rest && l.length < 60) { _pE.setFromQuaternion(b.m.quaternion, 'YXZ'); l.push([b.id, b.type, +b.pos.x.toFixed(2), +b.pos.y.toFixed(3), +b.pos.z.toFixed(2), +_pE.y.toFixed(2), b.item || 0]); }
    return { v: this.ver, l, c: this.cushions.slice(0, 20).map(c => [c.id, +c.x.toFixed(2), +c.y.toFixed(2), +c.z.toFixed(2), c.desk]) };
  },
  applyShared(s) {
    if (!s || Net.isHost || s.v === this._lastShared || !Array.isArray(s.l)) return; this._lastShared = s.v;
    if (Array.isArray(s.c)) {   // whoopee cushions (late joiners)
      const ids = new Set(s.c.map(c => String(c[0])));
      for (const c of s.c) if (Array.isArray(c) && !this._taken.has(String(c[0]))) Cushions.add(String(c[0]), +c[1], +c[2], +c[3], c[4] == null ? -1 : c[4] | 0);
      for (const c of [...this.cushions]) if (!ids.has(c.id) && W.t - c.t > 3) { W.scene.remove(c.m); this.cushions.splice(this.cushions.indexOf(c), 1); }
    }
    const seen = new Set(), tnow = now();
    for (const [id, t] of this._taken) if (tnow - t > 4) this._taken.delete(id);
    for (const e of s.l) {
      if (!Array.isArray(e)) continue; const id = String(e[0]); seen.add(id); const b = this.byId.get(id);
      if (b) { if (b.rest && Math.hypot(b.pos.x - e[2], b.pos.z - e[4]) > 0.25) b.pos.set(e[2], e[3], e[4]); continue; }
      if ((this.carry && this.carry.id === id) || this._taken.has(id)) continue;   // I just picked it up
      if (!PropTypes[e[1]]) continue;
      const nb = this.spawn(e[1], [e[2], e[3], e[4]], [0, 0, 0], { id, item: e[6] || null, rest: true, ry: e[5] });
      if (nb && !nb.def.inst) nb.m.rotation.set(0, e[5] || 0, 0);
    }
    for (const b of [...this.bodies]) if (b.rest && !seen.has(b.id) && b.restAge > 1.5) this.remove(b);
  },

  /* ----- picking up, carrying, throwing ----- */
  pickup(b) {
    if (!b || !Game.canControl() || this.carry) return;
    this.remove(b); this._taken.set(b.id, now()); Net.emit('prop:take', { id: b.id }); SFX.click();
    if (b.item && ItemDefs[b.item]) { Inv.give(b.item); this.toFront(b.item); const k = this.slots.indexOf(b.item); if (k >= 0) this.select(k); toast('Picked up: ' + ItemDefs[b.item].name, 'good'); return; }
    this.carry = { type: b.type, id: b.id, item: b.item }; this.vmKick = 0; this.refreshHeld();
  },
  drop() {
    if (!this.carry) return; const c = this.carry; this.carry = null; const h = this.handPos(), f = aimDir();
    this.launch(c.type, [h.x, h.y, h.z], [f.x * 1.2 + (P.vx || 0), 0.5, f.z * 1.2 + (P.vz || 0)], { id: c.id, item: c.item }); this.refreshHeld();
  },
  throwObj(type, item, id, speed) {
    const h = this.handPos(), f = aimDir(), s = speed || 9;
    const b = this.launch(type, [h.x, h.y, h.z], [f.x * s + (P.vx || 0) * 0.6, f.y * s + 2.2, f.z * s + (P.vz || 0) * 0.6], { id, item });
    SFX.throw(); Props.act('throw'); this.vmKick = 0; return b;
  },
  /* F / click: throw whatever is in hand */
  throwSel() {
    if (!Game.canControl() || W.t < this.throwT) return; this.throwT = W.t + 0.35;
    if (this.carry) { const c = this.carry; this.carry = null; this.throwObj(c.type, c.item, c.id); this.refreshHeld(); return; }
    const id = this.slots[this.sel] || 'paper';
    if (id === 'paper') { this.throwObj('paper'); return; }
    const d = ItemDefs[id]; if (!d || !Inv.count(id)) return;
    if (d.throwable === false) return;
    if (this.useDown) this.endUse();
    Inv.take(id); const type = d.prop && PropTypes[d.prop] ? d.prop : PropTypes[id] ? id : 'item';
    this.throwObj(type, type === 'item' || PropTypes[type].item ? id : null);
  },

  /* ----- hotbar ----- */
  slotList() { return ['paper', ...Inv.all().filter(id => id !== 'paper' && ItemDefs[id] && ItemDefs[id].hotbar !== false)].slice(0, HB_N); },
  /* an item you just bought / picked up that would not fit the hotbar moves to the front of the inventory, so it can be selected */
  toFront(id) { if (!Inv.count(id) || this.slotList().includes(id)) return; const n = Inv.items[id], rest = Object.assign({}, Inv.items); delete rest[id]; Inv.items = Object.assign({ [id]: n }, rest); Bus.emit('inv:change', id, n); },
  select(i) {
    const s = this.slots; i = ((i % HB_N) + HB_N) % HB_N; if (i >= s.length) return;
    if (this.carry) this.drop();
    if (i === this.sel) return;
    const old = ItemDefs[s[this.sel]]; if (this.useDown) this.endUse(); if (old && old.unequip) try { old.unequip(); } catch (e) {}
    this.sel = i; const d = ItemDefs[s[i]]; if (d && d.equip) try { d.equip(); } catch (e) {}
    this.vmEquip = 0; SFX.click(); this.refreshHeld(); HUDBar.flashName();
  },
  cycle(dir) { const n = this.slots.length; if (n > 1) this.select((this.sel + dir + n) % n); },
  heldId() { return this.carry ? 'prop:' + this.carry.type + (this.carry.item ? ':' + this.carry.item : '') : (this.slots[this.sel] || 'paper'); },
  refreshHeld() { this.slots = this.slotList(); if (this.sel >= this.slots.length) this.sel = 0; this._vmKey = null; HUDBar.render(); },

  /* ----- using the selected item (left click) ----- */
  ctx() { const h = this.handPos(), d = aimDir(); return { pos: h, dir: d, eye: eyePos(), yaw: P.yaw, pitch: P.pitch }; },
  startUse() {
    if (!Game.canControl()) return;
    if (this.carry) { this.throwSel(); return; }
    const id = this.slots[this.sel] || 'paper';
    if (id === 'paper') { this.throwSel(); return; }
    const d = ItemDefs[id]; if (!d || !Inv.count(id)) return;
    this.useDown = true; this.useId = id; this.vmKick = 0;
    try { if (d.use) d.use(this.ctx()); } catch (e) { console.error('item use', e); }
    if (!d.hold) this.useDown = false;
  },
  endUse() {
    if (!this.useDown) return; this.useDown = false; const d = ItemDefs[this.useId];
    try { if (d && d.useEnd) d.useEnd(this.ctx()); } catch (e) { console.error('item useEnd', e); }
  },
  tickUse(dt) {
    if (!this.useDown) return; const d = ItemDefs[this.useId];
    if (!Game.canControl() || this.slots[this.sel] !== this.useId || !Inv.count(this.useId)) { this.endUse(); return; }
    try { if (d && d.useHold) d.useHold(dt, this.ctx()); } catch (e) { console.error('item useHold', e); this.endUse(); }
  },
  /* the local player does an action: animation for everyone */
  act(a) { if (W.me && W.me.play) W.me.play(a); Net.emit('act', { a }); },

  /* ----- melee ----- */
  punch() {
    if (!Game.canControl() || W.t < this.punchT) return; this.punchT = W.t + 0.5;
    const slap = this.punchN++ % 3 === 2; this.act(slap ? 'slap' : 'punch'); this.vmPunch = 0; this.vmSlap = slap; SFX.whoosh();
    this.pendingHit = { t: W.t + 0.11, slap };
  },
  doHit(slap) {
    const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw); let best = null, bd = 1.75;
    for (const g of this._targets) {
      if (g.me) continue; const dx = g.x - P.pos.x, dz = g.z - P.pos.z, d = Math.hypot(dx, dz); if (d > bd || d < 0.01) continue;
      if ((dx * fx + dz * fz) / d < 0.55) continue; best = g; bd = d;
    }
    // props in front get knocked away too
    for (const b of this.bodies) {
      const dx = b.pos.x - P.pos.x, dz = b.pos.z - P.pos.z, d = Math.hypot(dx, dz); if (d > 1.4 || d < 0.01 || (dx * fx + dz * fz) / d < 0.5 || b.pos.y > 1.9) continue;
      this.launch(b.type, [b.pos.x, b.pos.y + 0.02, b.pos.z], [fx * 5.5 + rand(-0.5, 0.5), 2.5, fz * 5.5 + rand(-0.5, 0.5)], { id: b.id, item: b.item });
    }
    if (!best) return;
    const hy = best.y1 + 0.02, hx = best.x - fx * 0.3, hz = best.z - fz * 0.3;
    (slap ? SFX.slap : SFX.punch)(); FX.shake(0.22, 0.18);
    FX.spawn('stars', [hx, hy, hz], { n: slap ? 5 : 7, scale: slap ? 0.8 : 1 });
    if (best.kind === 'player') {
      const m = { id: best.id, d: [+fx.toFixed(2), +fz.toFixed(2)], f: slap ? 4.5 : 6.5, s: slap ? 0.9 : 1.4, sl: slap ? 1 : 0, y: +hy.toFixed(2) };
      Net.emit('hit', m); onHitMsg(m, Net.myId, true);
    } else this.npcNet(best.n, 'hit', slap);
  },

  /* ----- NPC + boss reactions (n = index into W.npcs, -1 = the boss) ----- */
  npcNet(n, k, extra) { Net.emit('npc', { n, k, x: extra ? 1 : 0 }); npcReact(n, k, extra, true); },

  /* ----- hand / view helpers ----- */
  handPos() {
    const out = _pHand;
    if (!P.third && this.vm && this.vm.root.visible) {   // the view model is drawn at half size, half distance: use the full-size spot
      this.vm.anchor.getWorldPosition(out); const c = W.camera.position, k = 1 / this.vm.root.scale.x; out.set(c.x + (out.x - c.x) * k, c.y + (out.y - c.y) * k, c.z + (out.z - c.z) * k); return out;
    }
    const a = this.held.get('me'); if (P.third && a && a.obj && a.obj.parent) { a.obj.getWorldPosition(out); out.y += 0.05; return out; }
    const sy = Math.sin(P.yaw), cy = Math.cos(P.yaw);
    out.set(P.pos.x - sy * 0.35 + cy * 0.22, P.pos.y + P.eye - 0.3, P.pos.z - cy * 0.35 - sy * 0.22); return out;
  }
};
const _vmBox = new THREE.Box3(), _pQ = new THREE.Quaternion(), _pAx = new THREE.Vector3(), _pE = new THREE.Euler(), _pHand = new THREE.Vector3(), _pAim = new THREE.Vector3(), _pEye = new THREE.Vector3(), _pV = new THREE.Vector3();
function aimDir() {
  const cp = Math.cos(P.pitch), fx = -Math.sin(P.yaw) * cp, fy = Math.sin(P.pitch), fz = -Math.cos(P.yaw) * cp;
  if (!W.camera) return _pAim.set(fx, fy, fz);
  // from the hand towards the point under the crosshair (first person too: the hand sits right of the eye, so a throw parallel to the view always passed ~25 cm right of what you aimed at, e.g. every bin)
  const c = W.camera.position, r = Space.ray(c.x, c.y, c.z, fx, fy, fz, 25, 0), d = P.third ? Math.min(25, r) : clamp(r, 1.2, 25), hp = Props.handPos();
  return _pAim.set(c.x + fx * d - hp.x, c.y + fy * d - hp.y, c.z + fz * d - hp.z).normalize();
}
function eyePos() { return _pEye.set(P.pos.x, P.pos.y + P.eye, P.pos.z); }

/* ---------- reactions ---------- */
const NPC_LINES = {
  hit: ['Ow!', 'Hey!', 'HR will hear about this.', 'My coffee!', 'Not the face!', 'Rude.', 'I bruise easily!', 'I was on hold!'],
  bossHit: ['Did you just...?', 'That is going in your review.', 'My office. Now.', 'OW. Back to work!', 'Assaulting management? Bold.'],
  soak: ['My shirt!', 'Is that soda?!', 'Sticky!', 'Why is it orange?', 'I am on a call!'],
  bossSoak: ['This suit was rented!', 'You are paying for dry cleaning.', 'Is this... orange?'],
  fart: ['Ugh! Who was that?', 'Smells like a missed quota.', 'My eyes!', 'Open a window!', 'Was that the printer?'],
  bonk: ['Hey!', 'Very mature.', 'Throw it at the bin!', 'Paper cut!'],
  whoopee: ['Very funny.', 'Excuse me!', 'That was the chair. I swear.']
};
function npcAv(n) { return n < 0 ? W.boss : W.npcs[n]; }
function npcReact(n, k, extra) {
  const av = npcAv(n); if (!av || !av.group) return; const boss = n < 0;
  av.group.getWorldPosition(_pV);
  const lines = boss ? NPC_LINES[k === 'hit' ? 'bossHit' : k === 'soak' ? 'bossSoak' : k] || NPC_LINES[k] : NPC_LINES[k];
  if (lines) FX.bubble(av, pick(lines), 2.4);
  if (k === 'hit') {
    if (av.play) av.play('hit'); if (av.stun) av.stun(extra ? 1 : 1.8);
    if (av.stunT === undefined) FX.spawn('stars', [_pV.x, _pV.y + (boss ? 1.85 : 1.5), _pV.z], { n: 0, orbit: 1.8, scale: 0.7 });
    if (av.setMood) av.setMood('angry', 3); SFX.ow(_pV);
  } else if (k === 'soak') { if (av.play) av.play('facepalm'); if (av.setMood) av.setMood('surprised', 2.5); }
  else if (k === 'fart') { if (av.play) av.play(pick(['facepalm', 'shrug'])); if (av.setMood) av.setMood('sad', 3); }
  else if (k === 'bonk') { if (av.play) av.play('hit'); if (av.setMood) av.setMood('angry', 2); }
  else if (k === 'whoopee') { if (av.play) av.play('hit'); if (av.setMood) av.setMood('surprised', 2); }
}
Net.on('npc', d => { if (d && typeof d.n === 'number' && typeof d.k === 'string') npcReact(d.n | 0, d.k, !!d.x); });
/* someone got punched: everyone shows it, the victim applies the knockback to itself */
function onHitMsg(m, from, mine) {
  if (!m || !m.id) return; const s = clamp(+m.s || 1, 0.2, 3), f = clamp(+m.f || 5, 0, 10), d = Array.isArray(m.d) ? m.d : [0, 0];
  const me = m.id === Net.myId || (!Net.active && m.id === 'me');
  if (me) {
    const seated = P.seated || P.review >= 0;
    if (!seated) { P.kx = clamp(+d[0] || 0, -1, 1) * f; P.kz = clamp(+d[1] || 0, -1, 1) * f; P.vy = Math.max(P.vy, 2.8); P.stunT = s; }
    if (W.me && W.me.stun) W.me.stun(s); if (W.me && W.me.play) W.me.play('hit');
    FX.shake(seated ? 0.4 : 0.7, 0.35); FX.flash('#ffffff', 0.18, 0.35); (m.sl ? SFX.slap : SFX.punch)();
    const sp = seated && W.me ? W.me.group.position : P.pos;
    FX.spawn('stars', [sp.x, sp.y + (seated ? 1.45 : 1.75), sp.z], { n: 0, orbit: s + 0.4, scale: 0.7 });
    toast(pick(['Ow! Seeing stars.', 'You got bonked.', 'That will leave a mark.', 'Workplace incident logged.']), 'bad');
    return;
  }
  const av = avatarOf(m.id); if (!av) return;
  if (av.play) av.play('hit'); if (av.stun) av.stun(s);
  if (!mine) { av.group.getWorldPosition(_pV); FX.spawn('stars', [_pV.x, +m.y || _pV.y + 1.5, _pV.z], { n: m.sl ? 5 : 7 }); (m.sl ? SFX.slap : SFX.punch)(_pV); }
  if (av.stunT === undefined) { av.group.getWorldPosition(_pV); FX.spawn('stars', [_pV.x, _pV.y + 1.75, _pV.z], { n: 0, orbit: s, scale: 0.7 }); }
}
Net.on('hit', (m, from) => onHitMsg(m, from, false));
Net.on('bonk', d => { if (!d) return; if (d.id === Net.myId) { FX.shake(0.25, 0.15); SFX.bonk(); toast(pick(['Bonk! Someone threw something at you.', 'Hey! Who threw that?']), 'bad'); } else { const av = avatarOf(d.id); if (av && av.play) av.play('hit'); } });
Net.on('soak', d => { if (d && d.id === Net.myId) soakMe(); });
function soakMe() {
  if (W.t - (Props._soakT || -9) < 1.5) return; Props._soakT = W.t;
  FX.tint('#ff9418', 0.28, 1.2); FX.flash('#ffb24a', 0.4, 0.35); SFX.splat();
  toast(pick(['You got sprayed with soda. Sticky.', 'Orange soda. Everywhere.', 'Your keyboard will never be the same.']), 'bad');
}
Net.on('act', (p, from) => { if (!p || typeof p.a !== 'string') return; const av = avatarOf(from); if (av && av.play) av.play(p.a); });
Net.on('prop:throw', d => {
  if (!d || typeof d.id !== 'string' || !Array.isArray(d.o) || !Array.isArray(d.v) || d.o.length !== 3 || d.v.length !== 3) return;
  const t = PropTypes[d.t] ? d.t : 'paper';
  const n = (x, l) => (Number.isFinite(+x) ? clamp(+x, -l, l) : 0);
  Props.spawn(t, d.o.map(x => n(x, 80)), d.v.map(x => n(x, 30)), { id: d.id.slice(0, 40), item: typeof d.i === 'string' ? d.i.slice(0, 40) : null, spin: Array.isArray(d.s) && d.s.length === 3 ? d.s.map(x => n(x, 20)) : null });
});
Net.on('prop:take', d => { if (d && d.id) Props.remove(Props.byId.get(String(d.id))); });
Net.share('props', () => Props.shared(), s => Props.applyShared(s));
Net.addMe('held', () => { const id = Props.heldId(); return id === 'paper' || P.seated || P.review >= 0 ? null : { i: id, u: Props.useDown ? 1 : 0, p: +P.pitch.toFixed(2) }; });

/* ---------- whoopee cushions ---------- */
const Cushions = {
  add(id, x, y, z, desk) {
    if (Props.cushions.find(c => c.id === id)) return;
    const m = PropArt.cushion(); m.position.set(x, y + 0.03, z); m.rotation.y = rand(6); W.scene.add(m);
    Props.cushions.push({ id, x, y, z, desk: desk == null ? -1 : desk, m, t: W.t }); Props.ver++;
  },
  pop(id, who) {
    Props._taken.set(id, now()); const i = Props.cushions.findIndex(c => c.id === id); if (i < 0) return; const c = Props.cushions[i]; Props.cushions.splice(i, 1); W.scene.remove(c.m); Props.ver++;
    _pV.set(c.x, c.y + 0.1, c.z); SFX.whoopee(_pV);
    FX.spawn('fart', [c.x, c.y + 0.1, c.z], { dir: [0, 0.3, 0], scale: 0.55, sound: false, prank: 1 }); FX.spawn('confetti', [c.x, c.y + 0.2, c.z], { n: 14, dir: [0, 1, 0], scale: 0.6, sound: false });
    const av = who === 'me' || who === Net.myId ? null : (typeof who === 'number' ? npcAv(who) : avatarOf(who));
    if (av && av.group) { FX.bubble(av, 'PFFFRRT!', 1.8); if (av.play) av.play('hit'); }
  },
  /* the local player sat or stepped on one */
  check() {
    if (!Props.cushions.length) return;
    for (const c of Props.cushions) {
      if (W.t - c.t < 1.2) continue;
      let hit = false;
      if (c.desk >= 0) hit = P.seated && P.seat === c.desk;
      else if (P.review >= 0) { const s = REVIEW_SEATS[P.review % REVIEW_SEATS.length]; hit = Math.hypot(s[0] - c.x, s[1] - c.z) < 0.45; }
      else hit = !P.seated && P.pos.y < 0.2 && Math.hypot(P.pos.x - c.x, P.pos.z - c.z) < 0.42;
      if (hit) {
        Net.emit('whoopee:pop', { id: c.id }); this.pop(c.id, 'me');
        FX.shake(0.35, 0.3); toast(pick(['PFFFRRT. Someone left a whoopee cushion for you.', 'You sat on a whoopee cushion. Everyone heard.', 'That was NOT you. Probably.']), 'bad');
        return;
      }
    }
  }
};
Net.on('whoopee', d => { if (d && d.id && Array.isArray(d.p) && d.p.length === 3 && d.p.every(Number.isFinite)) Cushions.add(String(d.id).slice(0, 40), clamp(d.p[0], -80, 80), clamp(d.p[1], 0, 5), clamp(d.p[2], -80, 80), d.d == null ? -1 : d.d | 0); });
Net.on('whoopee:pop', (d, from) => { if (d && d.id) Cushions.pop(String(d.id), typeof d.n === 'number' ? d.n : from); });

/* ---------- items ---------- */
const SODA_SECS = 4;
ItemDefs.paper = { name: 'Paper ball', icon: PropIcons.paper, desc: 'An endless supply of crumpled memos.', hint: 'Click / F to throw', infinite: true, throwable: true, model: () => new THREE.Mesh(PropArt.paperGeo(), PropArt.paperMat()) };
ItemDefs.soda = {
  name: 'Bonk Soda', icon: PropIcons.soda, desc: 'Orange fizz. Shake well, point at a coworker, squeeze.', hint: 'Hold click to spray', hold: true, fx: 'spray', prop: 'soda',
  model: () => PropArt.can('soda'),
  use() { if (Props.sodaLeft <= 0) Props.sodaLeft = SODA_SECS; if (W.me && W.me.play) W.me.play('spray', { hold: 0.5 }); },   // others start their 'spray' pose from held.u
  useHold(dt) {
    Props.sodaLeft -= dt;
    if (Props.sodaLeft <= 0) {   // can empty: drop it
      Props.endUse(); Inv.take('soda'); Props.sodaLeft = 0; const h = Props.handPos(), f = aimDir();
      Props.launch('can', [h.x, h.y, h.z], [f.x * 2, 1.5, f.z * 2]); toast('Out of soda. The can is empty.');
    }
  },
  useEnd() { if (W.me && W.me.stop) W.me.stop(); }
};
ItemDefs.beans = {
  name: 'Bottomless Beans', icon: PropIcons.beans, desc: 'Eat. Wait. Release a cloud of regret. Coworkers nearby will cough.', hint: 'Click to eat (and regret)', prop: 'beans',
  model: () => PropArt.beans(),
  use() {
    if (W.t - (Props._fartT || -9) < 1.2) return; Props._fartT = W.t; Inv.take('beans');
    Props.act('fart'); SFX.sip();
    setTimeout(() => {   // the beans take a moment
      const sy = Math.sin(P.yaw), cy = Math.cos(P.yaw), y = P.pos.y + (P.seated ? 0.5 : 0.75);
      FX.net('fart', [P.pos.x + sy * 0.25, y, P.pos.z + cy * 0.25], { dir: [+(sy).toFixed(2), 0.1, +(cy).toFixed(2)] });
      FX.shake(0.15, 0.4);
    }, 450);
  }
};
ItemDefs.whoopee = {
  name: 'Whoopee Cushion', icon: PropIcons.whoopee, desc: 'Place it on any chair. The next person to sit down will announce themselves.', hint: 'Click to place on a chair or floor', prop: 'whoopee',
  model: () => PropArt.cushion(),
  use() {
    const e = eyePos(), f = aimDir(); let best = null, bs = 0.86;
    for (const d of W.desks) {
      const dx = d.seat.x - e.x, dy = 0.5 - e.y, dz = d.seat.z - e.z, dist = Math.hypot(dx, dy, dz); if (dist > 2.8) continue;
      const dot = (dx * f.x + dy * f.y + dz * f.z) / dist; if (dot > bs) { bs = dot; best = d; }
    }
    const id = Props.newId(); Inv.take('whoopee'); SFX.click();
    if (best) {
      const npc = best.npc ? W.npcs.findIndex(n => n.desk === best.i || Math.hypot(n.group.position.x - best.seat.x, n.group.position.z - best.seat.z) < 0.6) : -2;
      const p = [+best.seat.x.toFixed(2), 0.5, +best.seat.z.toFixed(2)];
      Cushions.add(id, p[0], p[1], p[2], best.i); Net.emit('whoopee', { id, p, d: best.i });
      if (npc >= 0 || best.npc) {   // someone is already sitting there: instant result
        setTimeout(() => { Net.emit('whoopee:pop', { id, n: npc >= 0 ? npc : undefined }); Cushions.pop(id, npc >= 0 ? npc : null); if (npc >= 0) setTimeout(() => FX.bubble(W.npcs[npc], pick(NPC_LINES.whoopee), 2.2), 1300); }, 350);
      } else toast('Whoopee cushion armed. Now act natural.', 'good');
    } else {
      const x = P.pos.x + f.x * 1.1, z = P.pos.z + f.z * 1.1, y = Space.ground(x, 1.2, z), p = [+x.toFixed(2), +y.toFixed(3), +z.toFixed(2)];
      Cushions.add(id, p[0], p[1], p[2], -1); Net.emit('whoopee', { id, p }); toast('Whoopee cushion placed on the floor. Someone will step on it.', 'good');
    }
  }
};
ItemDefs.confetti = {
  name: 'Party Popper', icon: PropIcons.confetti, desc: 'For closed deals, birthdays and other people\'s mistakes.', hint: 'Click to pop', prop: 'confetti',
  model: () => PropArt.popper(),
  use() {
    Inv.take('confetti'); const h = Props.handPos(), f = aimDir();
    FX.net('confetti', [+h.x.toFixed(2), +h.y.toFixed(2), +h.z.toFixed(2)], { dir: [+f.x.toFixed(2), +(f.y + 0.35).toFixed(2), +f.z.toFixed(2)] });
    Props.act('cheer');
  }
};
const SHOP_ITEMS = [
  ['soda', 60, '#ff8a12', '🥤', 'Shake well. Point at a coworker. Squeeze. Four seconds of sticky orange regret per can. Not for drinking (legal says).'],
  ['beans', 40, '#8c3b1c', '🫘', 'Industrial-strength legumes. One spoonful clears a meeting room. Everyone within four metres will cough. You will feel lighter.'],
  ['whoopee', 35, '#ff6fa8', '🎈', 'Place it on any chair. The next person to sit down will announce themselves to the whole floor. Works on NPCs instantly.'],
  ['confetti', 20, '#ffd23b', '🎉', 'For closed deals, birthdays and other people\'s mistakes. Single use. Cleaning crew not included.']
];
SHOP_ITEMS.forEach((s, i) => Shop.add({
  id: s[0], tab: 'goods', section: 'Snacks & pranks', name: ItemDefs[s[0]].name, desc: s[4], price: s[1], icon: PropIcons[s[0]], emoji: s[3], color: s[2],
  owned: () => false, available: () => true, repeatable: true, sort: 100 + i,
  buy() { Inv.give(s[0]); Props.toFront(s[0]); toast(ItemDefs[s[0]].name + ' added to your hotbar.', 'good'); if (typeof Game !== 'undefined') Game.saveProgress(); }
}));

/* ---------- first-person view model ---------- */
const VM = {
  build() {
    const root = new THREE.Group(), sway = new THREE.Group(), hold = new THREE.Group(), anchor = new THREE.Object3D(), fist = new THREE.Group();
    root.add(sway); sway.add(hold); hold.add(anchor); root.add(fist); root.visible = false; W.scene.add(root);
    root.scale.setScalar(0.5);   // half size at half distance: same look, never pokes through walls
    return { root, sway, hold, anchor, fist, item: null, skin: null, fistObj: null, hand: null };
  },
  skin() { return (settings.look && settings.look.skin) || (typeof SKINS !== 'undefined' ? SKINS[hashStr(settings.name || 'me') % SKINS.length] : '#e9b98f'); },
  model(key) {
    if (key.startsWith('prop:')) { const pt = key.split(':'), def = PropTypes[pt[1]]; return def && def.inst ? new THREE.Mesh(PropArt.paperGeo(), PropArt.paperMat()) : def && def.model ? def.model() : PropArt.item(pt[2]); }
    if (key === 'paper') return new THREE.Mesh(PropArt.paperGeo(), PropArt.paperMat());
    return PropArt.item(key);
  },
  setItem(v, key) {
    const sk = this.skin(), sh = settings.color || '#3b82f6';
    if (v.skin !== sk + sh) {
      v.skin = sk + sh; if (v.fistObj) v.fist.remove(v.fistObj); v.fistObj = PropArt.fist(sk, sh); v.fist.add(v.fistObj);
      if (v.hand) v.hold.remove(v.hand); v.hand = PropArt.grip(sk, sh); v.hold.add(v.hand);
    }
    if (v.item) v.hold.remove(v.item);
    const m = this.model(key), box = _vmBox.setFromObject(m), size = box.getSize(_pV), mx = Math.max(size.x, size.y, size.z);
    const lim = key === 'paper' || key === 'prop:paper' ? 0.1 : 0.16, sc = mx > lim ? lim / mx : 1; m.scale.multiplyScalar(sc);
    m.position.y = -box.min.y * sc - 0.045; m.position.x = -(box.min.x + box.max.x) / 2 * sc; m.position.z = -(box.min.z + box.max.z) / 2 * sc;
    v.item = m; v.hold.add(m);
    const top = m.position.y + box.max.y * sc, nz = m.userData.nozzle;
    v.anchor.position.set(0, nz ? m.position.y + nz.y * sc : top, 0);
    v.hand.position.set(0, 0, 0); v.hand.scale.setScalar(clamp(Math.max(size.x, size.z) * sc / 0.068, 0.9, 1.5));
  },
  update(dt, t) {
    const v = Props.vm || (Props.vm = this.build());
    const show = G.phase !== 'menu' && !P.seated && P.review < 0 && !P.cam && !P.third && !!W.camera;
    v.root.visible = show; if (!show) return;
    const key = Props.heldId(); if (Props._vmKey !== key) { Props._vmKey = key; this.setItem(v, key); Props.vmEquip = 0; }
    const cam = W.camera; v.root.position.copy(cam.position); v.root.quaternion.copy(cam.quaternion);
    // sway with turning, bob with walking
    let dy = P.yaw - (this._yaw == null ? P.yaw : this._yaw); dy = Math.atan2(Math.sin(dy), Math.cos(dy)); this._yaw = P.yaw;
    const dp = P.pitch - (this._pitch == null ? P.pitch : this._pitch); this._pitch = P.pitch;
    this.sx = lerp(this.sx || 0, clamp(dy * 4, -0.2, 0.2), Math.min(1, dt * 10)); this.sy = lerp(this.sy || 0, clamp(-dp * 4, -0.2, 0.2), Math.min(1, dt * 10));
    const sp = Math.min(1, (P.speed || 0) / 4), bob = P.bob || 0;
    Props.vmEquip = Math.min(1, (Props.vmEquip == null ? 1 : Props.vmEquip) + dt * 4); const eq = 1 - Math.pow(1 - Props.vmEquip, 3);
    Props.vmKick = Math.min(1, (Props.vmKick == null ? 1 : Props.vmKick) + dt * 3.5); const kk = Props.vmKick, kick = kk < 1 ? Math.sin(kk * Math.PI) : 0;
    const spraying = Props.useDown && ItemDefs[Props.useId] && ItemDefs[Props.useId].hold;
    v.sway.position.set(0.27 + this.sx * 0.3 + Math.cos(bob) * 0.012 * sp, -0.25 - (1 - eq) * 0.35 + this.sy * 0.2 + Math.abs(Math.sin(bob)) * 0.02 * sp + (spraying ? Math.sin(t * 50) * 0.003 : 0), -0.55 + kick * -0.12);
    v.sway.rotation.set(0.12 + kick * 0.9 + (spraying ? -0.55 : 0), -0.35 + this.sx, 0.12 + this.sx * 0.5);
    v.hold.rotation.set(0, 0, 0);
    // punch / slap: the fist jabs in from the side
    Props.vmPunch = Math.min(1, (Props.vmPunch == null ? 1 : Props.vmPunch) + dt * 2.6); const pp = Props.vmPunch;
    v.fist.visible = pp < 1;
    if (pp < 1) {   // quick jab out, short hold, slower pull back
      const e = pp < 0.22 ? pp / 0.22 : pp < 0.45 ? 1 : 1 - (pp - 0.45) / 0.55, s = e * e * (3 - 2 * e);
      if (Props.vmSlap) { v.fist.position.set(0.42 - s * 0.62, -0.3 + s * 0.16, -0.48 - s * 0.1); v.fist.rotation.set(0.8, 0.6 - s * 0.9, -1.3 + s * 0.5); }
      else { v.fist.position.set(-0.3 + s * 0.22, -0.42 + s * 0.3, -0.3 - s * 0.36); v.fist.rotation.set(0.95 - s * 0.25, 0.35 - s * 0.3, 0.15); }
    }
  }
};

/* ---------- held items in avatars' hands (yourself in third person, remote players) ---------- */
const HeldSync = {
  hand(av) { return av.handR || av.armR || null; },
  attach(key, av, id, using, pitch) {
    let a = Props.held.get(key); const hand = this.hand(av);
    if (!a) { a = { id: null, obj: null, stream: null, using: false, av }; Props.held.set(key, a); }
    if (a.av !== av) { if (a.obj && a.obj.parent) a.obj.parent.remove(a.obj); a.id = null; a.av = av; }
    if (a.id !== id) {
      if (a.obj && a.obj.parent) a.obj.parent.remove(a.obj); a.obj = null; a.id = id;
      if (id && hand) {
        let m;
        if (id.startsWith('prop:')) { const pt = id.split(':'), def = PropTypes[pt[1]]; m = def && def.inst ? new THREE.Mesh(PropArt.paperGeo(), PropArt.paperMat()) : def && def.model ? def.model() : PropArt.item(pt[2]); }
        else m = PropArt.item(id);
        const g = new THREE.Group(); g.add(m);
        if (av.handR) { g.position.set(0, -0.07, 0.02); g.scale.setScalar(1.4); } else { g.position.set(0, -0.56, -0.06); g.rotation.x = -0.3; g.scale.setScalar(1.3); }
        hand.add(g); a.obj = g; a.nozzle = m.userData.nozzle ? m.userData.nozzle.clone() : new THREE.Vector3(0, 0.06, 0);
      }
    }
    // spraying: a stream from the can for everyone to see
    const def = id && ItemDefs[id]; using = !!using && !!(def && def.fx === 'spray');
    if (using !== a.using) { a.using = using; if (av.play && key !== 'me') { if (using) av.play('spray', { hold: 0.5 }); else if (av.stop) av.stop(); } }
    if (using || (a.stream && !a.stream.dead)) {
      if (!a.stream || a.stream.dead) a.stream = FX.stream({ color: '#ff9418', owner: key, test: sprayTest, onHit: sprayHit });
      if (a.obj && a.obj.parent) { a.obj.updateWorldMatrix(true, false); _pV.copy(a.nozzle).applyMatrix4(a.obj.matrixWorld); }
      else av.group.getWorldPosition(_pV).add(_pHand.set(0, 1.2, 0));
      const ry = av.group.rotation.y, pt = pitch || 0;
      a.stream.set(_pV, _pAim.set(-Math.sin(ry) * Math.cos(pt), Math.sin(pt) + 0.12, -Math.cos(ry) * Math.cos(pt)), using);
    }
    return a;
  },
  update() {
    // remote players
    if (Net.active) for (const [id, a] of W.avatars) { const p = Net.players.get(id), h = p && p.ext && p.ext.held; this.attach(id, a.av, h && typeof h.i === 'string' ? h.i : null, h && h.u, h && +h.p || 0); }
    for (const key of Props.held.keys()) if (key !== 'me' && (!Net.active || !W.avatars.has(key))) { const a = Props.held.get(key); if (a.obj && a.obj.parent) a.obj.parent.remove(a.obj); if (a.stream) a.stream.stop(); Props.held.delete(key); }
    // yourself (seen in third person, webcams)
    if (W.me) {
      const id = Props.heldId(), a = this.attach('me', W.me, id === 'paper' || P.seated ? null : id, false, P.pitch);
      if (a.obj) a.obj.visible = !P.seated && P.review < 0;
    }
  }
};
/* soda stream vs people: returns true when a node hits someone (the node splashes) */
function sprayTest(x, y, z, s) {
  const T = Props._targets;
  for (let i = 0; i < T.length; i++) { const g = T[i]; if (g.me && s.owner === 'me') continue; if (g.kind === 'player' && g.id === s.owner) continue; if (y < g.y0 || y > g.y1) continue; if (Math.abs(x - g.x) < g.r && Math.abs(z - g.z) < g.r && Math.hypot(x - g.x, z - g.z) < g.r) { s.lastHit = g; return true; } }
  return false;
}
function sprayHit(kind, x, y, z) {
  if (kind !== 'body') return; const s = this, g = s.lastHit; if (!g) return;
  const k = (g.kind === 'player' ? g.id : 'n' + g.n); Props._soakAt = Props._soakAt || {};
  if (W.t - (Props._soakAt[k] || -9) < 2.5) return; Props._soakAt[k] = W.t;
  if (g.me) { soakMe(); return; }
  if (g.kind === 'npc') npcReact(g.n, 'soak');
  else if (s.owner === 'me') Net.emit('soak', { id: g.id }, { to: g.id });
}
/* the local stream (first or third person) */
const MySpray = {
  s: null,
  update() {
    const id = Props.useDown ? Props.useId : null, on = !!(id && ItemDefs[id] && ItemDefs[id].fx === 'spray');
    if (!on && (!this.s || this.s.dead)) return;
    if (!this.s || this.s.dead) this.s = FX.stream({ color: '#ff9418', owner: 'me', test: sprayTest, onHit: sprayHit });
    const h = Props.handPos(), f = aimDir(); this.s.set(h, _pV.set(f.x, f.y + 0.12, f.z), on);
    if (!on) this.s.stop();
  }
};

/* ---------- targets (players, NPCs, boss) rebuilt each frame for hit tests ---------- */
const _tPool = [];
function tgt(i, kind, id, n, x, z, y0, y1, r, me) { const o = _tPool[i] || (_tPool[i] = {}); o.kind = kind; o.id = id; o.n = n; o.x = x; o.z = z; o.y0 = y0; o.y1 = y1; o.r = r; o.me = me; Props._targets.push(o); }
function buildTargets() {
  const T = Props._targets; T.length = 0; let i = 0;
  if (Net.active) for (const [id, a] of W.avatars) { const g = a.av.group.position, sit = a.seat >= 0 || a.seat <= -10; tgt(i++, 'player', id, 0, g.x, g.z, g.y + 0.2, g.y + (sit ? 1.5 : 1.85), 0.34, false); }
  for (let k = 0; k < W.npcs.length; k++) { const n = W.npcs[k]; if (!n.group.visible) continue; const g = n.group.position; tgt(i++, 'npc', null, k, g.x, g.z, 0.2, 1.5, 0.34, false); }
  if (W.boss) { const g = W.boss.group.position, s = W.boss.group.scale.y || 1; tgt(i++, 'npc', null, -1, g.x, g.z, 0.2, 1.85 * s, 0.38, false); }
  const sit = P.seated || P.review >= 0; let mx = P.pos.x, mz = P.pos.z;
  if (W.me && sit) { mx = W.me.group.position.x; mz = W.me.group.position.z; }
  tgt(i++, 'player', Net.myId, 0, mx, mz, P.pos.y + 0.2, P.pos.y + (sit ? 1.5 : 1.85), 0.34, true);
}

/* ---------- farts make people cough ---------- */
Bus.on('fx', (kind, c, o) => {
  if (kind !== 'fart' || !c || G.phase === 'menu' || (o && o.prank)) return;
  const near = Math.hypot(c.x - P.pos.x, c.z - P.pos.z) < 4 && !(W.t - (Props._fartT || -9) < 1.5);
  if (near) setTimeout(() => {
    SFX.cough(); FX.tint('#9fd63a', 0.22, 2.2); const f = aimDir(), e = eyePos();
    FX.spawn('cough', [e.x + f.x * 0.4, e.y - 0.1, e.z + f.z * 0.4], { dir: [f.x, 0, f.z] }); if (W.me && W.me.play) W.me.play('facepalm');
    toast(pick(['*cough* *cough* Who did that?!', 'Something died in here.', 'Your eyes are watering.', 'That is a hostile work environment.']), 'bad');
  }, 700);
  W.npcs.forEach((n, i) => { if (n.group.visible && Math.hypot(n.group.position.x - c.x, n.group.position.z - c.z) < 4.2) setTimeout(() => npcReact(i, 'fart'), 500 + Math.random() * 900); });
  if (W.boss && Math.hypot(W.boss.group.position.x - c.x, W.boss.group.position.z - c.z) < 4.5) setTimeout(() => npcReact(-1, 'fart'), 800);
});

/* ---------- hotbar HUD ---------- */
const HUDBar = {
  el: null, nameT: 0,
  build() {
    if (this.el) return; const hud = $('#hud'); if (!hud) return;
    this.el = h('div', { id: 'hotbar' }, h('div', { class: 'hb-name' }), h('div', { class: 'hb-slots' }));
    this.keys = h('div', { id: 'keyhint' }, ...[['LMB', 'use'], ['F', 'throw'], ['Q', 'punch'], ['E', 'pick up'], ['G', 'drop'], ['C', 'camera'], ['1-9', 'items']].map(k => h('span', {}, h('kbd', {}, k[0]), ' ' + k[1])));
    hud.append(this.el, this.keys); this.render();
  },
  render() {
    if (!this.el) return; const s = Props.slots, box = this.el.querySelector('.hb-slots'); const kids = [];
    for (let i = 0; i < Math.max(6, s.length); i++) {   // 6 slots, more (up to HB_N) when you carry more kinds of items
      const id = s[i], d = id && ItemDefs[id], sel = i === Props.sel && !Props.carry;
      const n = id === 'paper' ? '∞' : id ? Inv.count(id) : '';
      const slot = h('div', { class: 'hb-slot' + (sel ? ' sel' : '') + (id ? '' : ' empty') }, h('i', {}, String(i + 1)));
      if (id) { const ic = h('span', { class: 'hb-ic' }); ic.innerHTML = propIcon(id); slot.append(ic, h('b', {}, String(n))); if (id === 'soda' && Props.sodaLeft > 0) slot.append(h('u', { class: 'hb-bar', style: { width: Math.round(Props.sodaLeft / SODA_SECS * 100) + '%' } })); }
      kids.push(slot);
    }
    if (Props.carry) { const c = Props.carry, ic = h('span', { class: 'hb-ic' }); ic.innerHTML = propIcon(c.item || (c.type === 'paper' ? 'paper' : c.type)); kids.push(h('div', { class: 'hb-slot carry sel' }, h('i', {}, 'G'), ic)); }
    box.replaceChildren(...kids); this.nameHTML();
  },
  nameHTML() {
    const nm = this.el.querySelector('.hb-name'), c = Props.carry;
    let t, sub;
    if (c) { const d = c.item && ItemDefs[c.item]; t = d ? d.name : (PropTypes[c.type] || PropTypes.item).name; t = t.charAt(0).toUpperCase() + t.slice(1); sub = 'Click / F to throw, G to drop'; }
    else { const id = Props.slots[Props.sel], d = ItemDefs[id]; t = d ? d.name : ''; sub = d ? d.hint || '' : ''; }
    nm.innerHTML = '<b>' + t + '</b>' + (sub ? '<small>' + sub + '</small>' : '');
  },
  flashName() { if (!this.el) return; this.nameHTML(); const nm = this.el.querySelector('.hb-name'); nm.classList.remove('on'); void nm.offsetWidth; nm.classList.add('on'); clearTimeout(this._nt); this._nt = setTimeout(() => nm.classList.remove('on'), 2200); },
  tick(dt) {
    if (!this.el) return; this._t = (this._t || 0) + dt; if (this._t < 0.1) return; this._t = 0;
    const vis = G.phase !== 'menu' && !P.seated && P.review < 0 && !G.paused && G.phase !== 'review';
    this.el.classList.toggle('hidden', !vis); this.keys.classList.toggle('hidden', !vis);
    document.body.classList.toggle('hb-on', vis);
    const key = Props.slots.join() + '|' + Props.sel + '|' + Props.slots.map(id => Inv.count(id)).join() + '|' + Math.ceil(Props.sodaLeft * 10) + '|' + (Props.carry ? Props.carry.id : '');
    if (key !== this._key) { this._key = key; this.render(); }
  }
};

/* ---------- world clutter + lifecycle ---------- */
function spawnClutter() {
  let s = 1234567; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const B = W.bounds || { x0: -11.6, x1: 19.6, z0: -8.6, z1: 8.6 }; let n = 0, tries = 0;
  while (n < 16 && tries++ < 400) {
    const x = lerp(B.x0 + 0.5, Math.min(B.x1, 9.5) - 0.5, r()), z = lerp(B.z0 + 0.5, B.z1 - 0.5, r());
    if (blocked(x, z) || Space.overDesk(x, z) || Math.hypot(x - 8, z) < 1.5) continue;
    const t = n < 14 ? 'paper' : 'box', def = PropTypes[t];
    const b = Props.spawn(t, [x, def.box || def.r, z], [0, 0, 0], { rest: true, ry: r() * 6.28 });
    if (b && !def.inst) b.m.rotation.set(0, r() * 6.28, 0);
    n++;
  }
}
Bus.on('world:built', () => {
  const im = new THREE.InstancedMesh(PropArt.paperGeo(), PropArt.paperMat(), 90); im.count0 = 90; im.count = 0; im.frustumCulled = false; W.scene.add(im); Props.inst = im;
});
Bus.on('boot', () => HUDBar.build());
Bus.on('game:begin', () => {
  Props.clear(); Props.sel = 0; Props.sodaLeft = 0; Props.refreshHeld(); FX.clear();
  if (Game.authority()) spawnClutter();
  else if (!Inv.all().length) { Inv.give('soda', 1); Inv.give('confetti', 1); }
});
Bus.on('save:loaded', () => {
  G.prog.props = G.prog.props || {};
  if (!G.prog.props.kit) { G.prog.props.kit = 1; Inv.give('soda', 2); Inv.give('beans', 1); Inv.give('whoopee', 1); Inv.give('confetti', 2); Game.saveProgress(); setTimeout(() => toast('HR left a welcome kit in your drawer: soda, beans, a whoopee cushion and party poppers. Press 1-6.', 'good'), 2500); }
  Props.refreshHeld();
});
Bus.on('quit', () => { Props.clear(); Props.useDown = false; });
Bus.on('inv:change', () => Props.refreshHeld());
Bus.on('player:sit', () => { if (Props.carry) Props.drop(); Props.endUse(); });

Loop.add((dt, t) => {
  if (!W.scene) return;
  buildTargets();
  if (Props.pendingHit && W.t >= Props.pendingHit.t) { const s = Props.pendingHit.slap; Props.pendingHit = null; Props.doHit(s); }
  Props.tickUse(dt); Props.update(dt, t);
  VM.update(dt, t); HeldSync.update(); MySpray.update();
  if (G.phase !== 'menu') Cushions.check();
  HUDBar.tick(dt);
});
