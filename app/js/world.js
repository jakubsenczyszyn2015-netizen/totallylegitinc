'use strict';
/* =====================================================================
   WORLD — renderer, colour pipeline, geometry batching, office shell
   (floors, walls, windows, doors, lights), desks, boss.
   office.js adds the furniture, props, screens, leaderboard and projector.
   Public API: docs/modules/office.md
   ===================================================================== */

/* ---------- colour pipeline (like modern three.js colour management) ----------
   Hex / CSS colours are sRGB and get converted to linear; the renderer outputs sRGB with ACES
   tone mapping. Canvas textures default to sRGB; sprites (name tags) skip tone mapping. */
(() => {
  const C = THREE.Color.prototype, tmp = new THREE.Color(); let depth = 0;
  for (const k of ['setHex', 'setStyle', 'setHSL']) {
    const o = C[k];
    C[k] = function () { depth++; try { o.apply(this, arguments); } finally { depth--; } if (!depth) this.convertSRGBToLinear(); return this; };
  }
  for (const k of ['getHex', 'getStyle', 'getHSL']) { const o = C[k]; C[k] = function (a) { return o.call(tmp.copy(this).convertLinearToSRGB(), a); }; }
  const CT = THREE.CanvasTexture;
  THREE.CanvasTexture = class extends CT { constructor(...a) { super(...a); this.encoding = THREE.sRGBEncoding; } };
  const SM = THREE.SpriteMaterial;
  THREE.SpriteMaterial = class extends SM { constructor(p) { super(p); if (!p || p.toneMapped === undefined) this.toneMapped = false; } };
})();

const W = { colliders: [], interact: [], desks: [], avatars: new Map(), balls: [], bins: [], npcs: [], scene: null, camera: null, renderer: null, cur: null, boss: null, t: 0,
  doors: {}, rooms: {}, spawn: { players: [], police: [] }, bounds: { x0: -11.6, x1: 19.6, z0: -8.6, z1: 8.6 }, anim: [], sun: null, layers: {} };
/* hide the drop ceiling (tiles, lights, vents, cameras) for top-down / spectator cameras */
W.setCeiling = v => { for (const m of W.layers.ceil || []) m.visible = !!v; };
const P = { pos: { x: 8, y: 0, z: 0 }, yaw: Math.PI / 2, pitch: 0, vy: 0, seated: false, seat: -1, eye: 1.62, boost: 0, locked: false, drag: false, review: -1, cam: null, speed: 0, bob: 0, expectUnlock: false, throwT: 0 };
const Keys = {};
const ROOM_H = 3.2;
/* floor plan: main call floor west of x=10; east wing = review room (south), hallway to the main door (middle), break room + boss office (north) */
const PLAN = { x0: -12, x1: 20, z0: -9, z1: 9, wing: 10, hall: 1.8, split: 16 };
const DESK_PODS = [6.4, 1.4, -3.6, -8.6], DESK_Z = [-2.15, 2.15, -4.05, 4.05, -5.95, 5.95];
const NPC_DESKS = new Set([5, 8, 15, 22, 26, 33, 39, 44]);
const REVIEW_SEATS = [[13.6, -6.45], [13.6, -4.35], [14.8, -6.45], [14.8, -4.35], [16.0, -6.45], [16.0, -4.35], [17.2, -6.45], [17.2, -4.35]];
const BOSS_DAY = { x: 18.0, z: 7.05, yaw: 0 }, BOSS_REVIEW = { x: 18.75, z: -7.85, yaw: Math.PI / 2 };
W.rooms = { floor: { x0: -12, x1: 10, z0: -9, z1: 9 }, hall: { x0: 10, x1: 20, z0: -1.8, z1: 1.8 }, review: { x0: 10, x1: 20, z0: -9, z1: -1.8 },
  break: { x0: 10, x1: 16, z0: 1.8, z1: 9 }, boss: { x0: 16, x1: 20, z0: 1.8, z1: 9 }, lobby: { x0: 20.2, x1: 24.4, z0: -2.4, z1: 2.4 } };
W.spawn = { players: [[8, 0], [8, -1.2], [8, 1.2], [6.8, -0.6], [6.8, 0.6], [9.1, 0]].map(p => ({ x: p[0], z: p[1], yaw: Math.PI / 2 })),
  police: [[21.3, -0.6], [21.3, 0.6], [22.3, -1.2], [22.3, 0], [22.3, 1.2], [23.3, 0]].map(p => ({ x: p[0], z: p[1] })) };

/* ---------- small helpers (public) ---------- */
const _mats = {}, _geos = {};
function mat(color, opts) { const k = String(color) + (opts ? JSON.stringify(opts) : ''); return _mats[k] || (_mats[k] = new THREE.MeshLambertMaterial(Object.assign({ color }, opts || {}))); }
function boxGeo(w, hh, d) { const k = w + '|' + hh + '|' + d; return _geos[k] || (_geos[k] = new THREE.BoxGeometry(w, hh, d)); }
function box(w, hh, d, x, y, z, m, parent, collide) {
  const mesh = new THREE.Mesh(boxGeo(w, hh, d), (m && m.isMaterial) ? m : mat(m));
  mesh.position.set(x, y, z); (parent || W.scene).add(mesh);
  if (collide) W.colliders.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2, y1: y + hh / 2 });
  return mesh;
}
function canvasTex(w, hh, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = hh;
  const g = c.getContext('2d'); draw(g, w, hh);
  const t = new THREE.CanvasTexture(c);
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  t.anisotropy = 4; return t;
}
function rrect(g, x, y, w, hh, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + hh, r); g.arcTo(x + w, y + hh, x, y + hh, r); g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function plane(w, hh, x, y, z, material, rx, ry) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, hh), material); m.position.set(x, y, z); if (rx) m.rotation.x = rx; if (ry) m.rotation.y = ry; W.scene.add(m); return m; }
/* seeded random numbers: const r = rng(42); r() -> [0, 1) */
function rng(seed) { seed = (seed * 2654435761) >>> 0 || 1; return () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296; }
/* chunky rounded box (own take on the classic odd-segment trick: the middle segment becomes the flat face) */
function rboxGeo(w, hh, d, r, seg) {
  seg = seg || 1; r = Math.min(r, w / 2, hh / 2, d / 2);
  const k = 'r' + w + '|' + hh + '|' + d + '|' + r + '|' + seg; if (_geos[k]) return _geos[k];
  const n = seg * 2 + 1, g = new THREE.BoxGeometry(1, 1, 1, n, n, n), Pa = g.attributes.position, Na = g.attributes.normal, hs = 0.5 / n, t = new THREE.Vector3();
  const bx = w / 2 - r, by = hh / 2 - r, bz = d / 2 - r;
  for (let i = 0; i < Pa.count; i++) {
    t.fromBufferAttribute(Pa, i); const sx = Math.sign(t.x), sy = Math.sign(t.y), sz = Math.sign(t.z);
    t.set(t.x - sx * hs, t.y - sy * hs, t.z - sz * hs).normalize();
    Pa.setXYZ(i, bx * sx + t.x * r, by * sy + t.y * r, bz * sz + t.z * r); Na.setXYZ(i, t.x, t.y, t.z);
  }
  return (_geos[k] = g);
}
function cylGeo(rt, rb, hh, seg, open) { const k = 'c' + rt + '|' + rb + '|' + hh + '|' + seg + '|' + !!open; return _geos[k] || (_geos[k] = new THREE.CylinderGeometry(rt, rb, hh, seg, 1, !!open)); }

/* ---------- static geometry batching ----------
   Everything static goes through S.* and is merged into one mesh per material group when the build ends
   (a few dozen draw calls for the whole office). Colours become vertex colours. o = { rx, ry, rz, sx, sy, sz, p: parentMatrix4 } */
const _e = new THREE.Euler(0, 0, 0, 'YXZ'), _q = new THREE.Quaternion(), _v3 = new THREE.Vector3(), _s3 = new THREE.Vector3();
function xf(x, y, z, o) {
  o = o || {}; _e.set(o.rx || 0, o.ry || 0, o.rz || 0, 'YXZ'); _q.setFromEuler(_e);
  const m = new THREE.Matrix4().compose(_v3.set(x, y, z), _q, _s3.set(o.sx || 1, o.sy || 1, o.sz || 1));
  return o.p ? m.premultiply(o.p) : m;
}
const Batch = {
  g: {},
  def(key, m, o) { this.g[key] = Object.assign({ m, items: [] }, o || {}); return m; },
  add(key, geo, m, col) { if (S.layer) key = this.sub(key, S.layer); this.g[key].items.push(geo, m, col == null ? 0xffffff : col); },
  /* a layer (e.g. 'ceil') gets its own copy of each material group so it can be shown/hidden on its own */
  sub(key, layer) { const k = key + '@' + layer; if (!this.g[k]) this.g[k] = Object.assign({}, this.g[key], { items: [], layer, mesh: null }); return k; },
  flush() {
    for (const key in this.g) {
      const g = this.g[key]; if (!g.items.length) continue;
      const mesh = new THREE.Mesh(mergeGeos(g.items, g.uv), g.m);
      mesh.castShadow = !!g.cast; mesh.receiveShadow = g.recv !== false; mesh.matrixAutoUpdate = false; mesh.name = 'batch:' + key;
      if (g.order) mesh.renderOrder = g.order;
      if (g.layer) (W.layers[g.layer] = W.layers[g.layer] || []).push(mesh);
      W.scene.add(mesh); g.items = []; g.mesh = mesh;
    }
  }
};
/* merge [geo, matrix, colour, ...] into one indexed BufferGeometry (position, normal, uv, color).
   uvMode: undefined = keep uvs, 'wall' = world-space wall mapping (v = height / ROOM_H), number = planar world uvs (metres per repeat) */
function mergeGeos(items, uvMode) {
  let nv = 0, ni = 0;
  for (let k = 0; k < items.length; k += 3) { const g = items[k], c = g.attributes.position.count; nv += c; ni += g.index ? g.index.count : c; }
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), col = new Float32Array(nv * 3), idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
  const v = new THREE.Vector3(), n = new THREE.Vector3(), nm = new THREE.Matrix3(), c = new THREE.Color();
  let vo = 0, io = 0;
  for (let k = 0; k < items.length; k += 3) {
    const g = items[k], m = items[k + 1]; c.set(items[k + 2]); nm.getNormalMatrix(m);
    const Pa = g.attributes.position, Na = g.attributes.normal, Ua = g.attributes.uv, cnt = Pa.count;
    for (let i = 0; i < cnt; i++) {
      v.fromBufferAttribute(Pa, i).applyMatrix4(m); n.fromBufferAttribute(Na, i).applyMatrix3(nm).normalize();
      const o = (vo + i) * 3, u = (vo + i) * 2;
      pos[o] = v.x; pos[o + 1] = v.y; pos[o + 2] = v.z; nor[o] = n.x; nor[o + 1] = n.y; nor[o + 2] = n.z; col[o] = c.r; col[o + 1] = c.g; col[o + 2] = c.b;
      if (uvMode) {
        const ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z), s = uvMode === 'wall' ? 3 : uvMode;
        if (ay >= ax && ay >= az) { uv[u] = v.x / s; uv[u + 1] = -v.z / s; }
        else { uv[u] = (ax >= az ? v.z : v.x) / s; uv[u + 1] = uvMode === 'wall' ? v.y / ROOM_H : v.y / s; }
      } else if (Ua) { uv[u] = Ua.getX(i); uv[u + 1] = Ua.getY(i); }
    }
    if (g.index) { const I = g.index; for (let i = 0; i < I.count; i++) idx[io++] = I.getX(i) + vo; } else for (let i = 0; i < cnt; i++) idx[io++] = vo + i;
    vo += cnt;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(new THREE.BufferAttribute(idx, 1)); geo.computeBoundingSphere();
  return geo;
}
/* S: the static builder used by world.js and office.js */
const S = {
  layer: null,   // set to 'ceil' while building ceiling things (W.setCeiling hides them)
  box(key, w, hh, d, x, y, z, col, o) { Batch.add(key, boxGeo(w, hh, d), xf(x, y, z, o), col); },
  rbox(key, w, hh, d, r, x, y, z, col, o) { Batch.add(key, rboxGeo(w, hh, d, r, o && o.seg), xf(x, y, z, o), col); },
  cyl(key, rt, rb, hh, x, y, z, col, o) { Batch.add(key, cylGeo(rt, rb, hh, (o && o.seg) || 14, o && o.open), xf(x, y, z, o), col); },
  geo(key, geo, x, y, z, col, o) { Batch.add(key, geo, xf(x, y, z, o), col); },
  /* a flat picture from the atlas (cell from Atlas.cell); faces +z before rotation */
  decal(cell, w, hh, x, y, z, o, glow) { Batch.add(glow ? 'atlasGlow' : 'atlas', cellGeo(cell, w, hh), xf(x, y, z, o), (o && o.col) || 0xffffff); },
  col(x0, x1, z0, z1, y1) { W.colliders.push({ x0, x1, z0, z1, y1: y1 || 1.5 }); },
  /* collider for a box given in a local frame p (Matrix4) */
  colL(p, x0, x1, z0, z1, y1) {
    let a = Infinity, b = -Infinity, c = Infinity, d = -Infinity;
    for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) { _v3.set(x, 0, z).applyMatrix4(p); a = Math.min(a, _v3.x); b = Math.max(b, _v3.x); c = Math.min(c, _v3.z); d = Math.max(d, _v3.z); }
    this.col(a, b, c, d, y1);
  }
};

/* ---------- texture atlas: all small static pictures (notes, posters, signs, keyboards...) in one texture ---------- */
const Atlas = {
  W: 2048, H: 2048, x: 0, y: 0, rowH: 0, cells: [], canvas: null, g: null, tex: null,
  init() { this.canvas = document.createElement('canvas'); this.canvas.width = this.W; this.canvas.height = this.H; this.g = this.canvas.getContext('2d'); this.tex = new THREE.CanvasTexture(this.canvas); this.tex.anisotropy = 4; },
  cell(w, hh, draw) {
    const pad = 4;
    if (this.x + w + pad * 2 > this.W) { this.x = 0; this.y += this.rowH; this.rowH = 0; }
    if (this.y + hh + pad * 2 > this.H) console.warn('Atlas full');
    const c = { x: this.x + pad, y: this.y + pad, w, h: hh, draw };
    this.x += w + pad * 2; this.rowH = Math.max(this.rowH, hh + pad * 2);
    c.u0 = c.x / this.W; c.u1 = (c.x + w) / this.W; c.v0 = 1 - (c.y + hh) / this.H; c.v1 = 1 - c.y / this.H;
    this.cells.push(c); this.paint(c); return c;
  },
  paint(c) {
    const g = this.g; g.save(); g.clearRect(c.x - 4, c.y - 4, c.w + 8, c.h + 8); g.beginPath(); g.rect(c.x, c.y, c.w, c.h); g.clip(); g.translate(c.x, c.y); c.draw(g, c.w, c.h); g.restore();
    // bleed the edges into the padding so mipmaps don't pick up neighbours
    const cv = this.canvas;
    g.drawImage(cv, c.x, c.y, c.w, 1, c.x, c.y - 4, c.w, 4); g.drawImage(cv, c.x, c.y + c.h - 1, c.w, 1, c.x, c.y + c.h, c.w, 4);
    g.drawImage(cv, c.x, c.y - 4, 1, c.h + 8, c.x - 4, c.y - 4, 4, c.h + 8); g.drawImage(cv, c.x + c.w - 1, c.y - 4, 1, c.h + 8, c.x + c.w, c.y - 4, 4, c.h + 8);
  },
  repaint() { for (const c of this.cells) this.paint(c); this.tex.needsUpdate = true; }
};
function cellGeo(c, w, hh) {
  const k = 'd' + Atlas.cells.indexOf(c) + '|' + w + '|' + hh; if (_geos[k]) return _geos[k];
  const g = new THREE.PlaneGeometry(w, hh), U = g.attributes.uv;
  for (let i = 0; i < U.count; i++) U.setXY(i, c.u0 + U.getX(i) * (c.u1 - c.u0), c.v0 + U.getY(i) * (c.v1 - c.v0));
  return (_geos[k] = g);
}
/* text helpers for canvas art: hand-written marker look, and a font stack that falls back nicely */
const FONT = { slab: '"Alfa Slab One", Georgia, serif', chunky: '"Lilita One", "Arial Black", sans-serif', ui: 'Roboto, "Segoe UI", Arial, sans-serif', menu: 'Karla, "Segoe UI", Arial, sans-serif' };
function scrawl(g, text, x, y, size, color, opt) {
  opt = opt || {}; const r = rng(hashStr(text) + (opt.seed || 0));
  g.save(); g.fillStyle = color; g.strokeStyle = color; g.textBaseline = 'alphabetic';
  g.font = (opt.weight || 700) + ' ' + size + 'px ' + FONT.menu; g.lineWidth = size * 0.05; g.lineJoin = 'round';
  let w = 0; for (const ch of text) w += g.measureText(ch).width * 0.96;
  let cx = opt.align === 'center' ? x - w / 2 : x;
  for (const ch of text) {
    const cw = g.measureText(ch).width;
    g.save(); g.translate(cx + cw / 2, y + (r() - 0.5) * size * 0.12); g.rotate((r() - 0.5) * 0.22 + (opt.slant || 0)); g.scale(0.9 + r() * 0.2, 0.92 + r() * 0.16);
    g.fillText(ch, -cw / 2, 0); g.strokeText(ch, -cw / 2, 0); g.restore();
    cx += cw * 0.96;
  }
  g.restore(); return w;
}
/* wobbly hand-drawn polyline */
function wobble(g, pts, color, lw, seed) {
  const r = rng(seed || 7); g.save(); g.strokeStyle = color; g.lineWidth = lw; g.lineCap = g.lineJoin = 'round'; g.beginPath();
  pts.forEach((p, i) => { const x = p[0] + (r() - 0.5) * lw * 0.8, y = p[1] + (r() - 0.5) * lw * 0.8; i ? g.lineTo(x, y) : g.moveTo(x, y); });
  g.stroke(); g.restore();
}
function noiseFill(g, w, hh, n, a, size) { for (let i = 0; i < n; i++) { g.fillStyle = (Math.random() < 0.5 ? 'rgba(255,255,255,' : 'rgba(0,0,0,') + (Math.random() * a) + ')'; g.fillRect(Math.random() * w, Math.random() * hh, size || 2, size || 2); } }

/* ---------- quality + renderer ---------- */
const SUN_I = 3.2;
function applyQuality() {
  if (!W.renderer) return;
  const R = W.renderer, q = settings.quality, dpr = window.devicePixelRatio || 1;
  R.setPixelRatio(q === 'low' ? Math.min(dpr, 0.75) : q === 'high' ? Math.min(dpr, 2) : Math.min(dpr, 1.25));
  R.setSize(innerWidth, innerHeight, false);
  if (W.camera) { W.camera.aspect = innerWidth / innerHeight; W.camera.fov = settings.fov; W.camera.updateProjectionMatrix(); }
  W.npcs.forEach(n => n.group.visible = settings.npcs);
  if (W.sun) {
    const sh = q !== 'low', size = q === 'high' ? 2048 : 1024, type = q === 'high' ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
    if (R.shadowMap.enabled !== sh || W.sun.shadow.mapSize.x !== size || R.shadowMap.type !== type) {
      R.shadowMap.enabled = sh; R.shadowMap.type = type; W.sun.castShadow = sh; W.sun.shadow.mapSize.set(size, size);
      if (W.sun.shadow.map) { W.sun.shadow.map.dispose(); W.sun.shadow.map = null; }
      W.sun.intensity = sh ? SUN_I : SUN_I * 0.3;
      W.scene.traverse(o => { if (o.material) [].concat(o.material).forEach(m => { m.needsUpdate = true; }); });
    }
    W.updateShadows();
  }
  Bus.emit('quality', q);
}
/* the sun never moves, so the shadow map is rendered once; call this after moving big shadow-casting things */
W.updateShadows = () => { if (W.renderer) W.renderer.shadowMap.needsUpdate = true; };

function initWorld() {
  const canvas = $('#gl');
  W.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  const R = W.renderer;
  R.outputEncoding = THREE.sRGBEncoding; R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.0;
  R.shadowMap.autoUpdate = false; R.shadowMap.type = THREE.PCFShadowMap;
  W.scene = new THREE.Scene(); W.scene.background = new THREE.Color().setRGB(0.03, 0.02, 0.018); W.scene.fog = new THREE.Fog(0x2a1d16, 18, 52);
  W.camera = new THREE.PerspectiveCamera(settings.fov, innerWidth / innerHeight, 0.05, 90); W.camera.rotation.order = 'YXZ';
  applyQuality();
  buildWorld();
  applyQuality();
  window.addEventListener('resize', applyQuality);
  Bus.emit('world:built');

  canvas.addEventListener('click', () => {
    AudioSys.resume();
    if (!Game.canControl()) return;
    if (P.locked) { tryThrow(); return; }
    try { const r = canvas.requestPointerLock && canvas.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) {}
  });
  canvas.addEventListener('mousedown', () => { if (!P.locked) P.drag = true; });
  window.addEventListener('mouseup', () => { P.drag = false; });
  document.addEventListener('pointerlockchange', () => {
    P.locked = document.pointerLockElement === canvas;
    if (!P.locked && Game.canControl() && !P.expectUnlock) Game.pause(true);
    P.expectUnlock = false;
  });
  document.addEventListener('mousemove', e => {
    if (!Game.canControl() || !(P.locked || P.drag)) return;
    P.yaw -= e.movementX * 0.0022 * settings.sens;
    P.pitch = clamp(P.pitch - e.movementY * 0.0022 * settings.sens * (settings.invertY ? -1 : 1), -1.45, 1.45);
  });
}
function releaseLock() { if (document.pointerLockElement) { P.expectUnlock = true; try { document.exitPointerLock(); } catch (e) {} } }

/* ---------- materials + procedural textures ---------- */
const TEX = {};
function wrapTex(t, aniso) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = aniso || 8; return t; }
function defMaterials() {
  Atlas.init();
  TEX.paint = wrapTex(canvasTex(256, 256, (g, w, hh) => {
    g.fillStyle = '#f4f1ec'; g.fillRect(0, 0, w, hh);
    for (let i = 0; i < 70; i++) { const x = Math.random() * w, y = Math.random() * hh, r = 10 + Math.random() * 40; for (const dx of [-w, 0, w]) { const gr = g.createRadialGradient(x + dx, y, 0, x + dx, y, r); gr.addColorStop(0, 'rgba(120,100,80,' + (Math.random() * 0.06) + ')'); gr.addColorStop(1, 'rgba(120,100,80,0)'); g.fillStyle = gr; g.fillRect(x + dx - r, y - r, r * 2, r * 2); } }
    noiseFill(g, w, hh, 2500, 0.035);
    let gr = g.createLinearGradient(0, hh, 0, hh * 0.78); gr.addColorStop(0, 'rgba(60,40,25,.32)'); gr.addColorStop(1, 'rgba(60,40,25,0)'); g.fillStyle = gr; g.fillRect(0, hh * 0.78, w, hh * 0.22);
    gr = g.createLinearGradient(0, 0, 0, hh * 0.12); gr.addColorStop(0, 'rgba(40,30,20,.28)'); gr.addColorStop(1, 'rgba(40,30,20,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, hh * 0.12);
    for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(70,50,30,.05)'; g.fillRect(Math.random() * w, hh * (0.82 + Math.random() * 0.12), 20 + Math.random() * 50, 2 + Math.random() * 3); }
  }));
  TEX.paint.wrapT = THREE.ClampToEdgeWrapping;
  TEX.fabric = wrapTex(canvasTex(128, 128, (g, w, hh) => {
    g.fillStyle = '#dadde6'; g.fillRect(0, 0, w, hh);
    for (let y = 0; y < hh; y += 2) { g.fillStyle = 'rgba(0,0,0,' + (0.04 + Math.random() * 0.05) + ')'; g.fillRect(0, y, w, 1); }
    for (let x = 0; x < w; x += 2) { g.fillStyle = 'rgba(255,255,255,' + (0.03 + Math.random() * 0.04) + ')'; g.fillRect(x, 0, 1, hh); }
    noiseFill(g, w, hh, 1400, 0.12, 1);
  }));
  TEX.wood = wrapTex(canvasTex(256, 256, (g, w, hh) => {
    g.fillStyle = '#e9dcc8'; g.fillRect(0, 0, w, hh);
    for (let i = 0; i < 60; i++) { const y0 = Math.random() * hh, a = 0.04 + Math.random() * 0.1; g.strokeStyle = 'rgba(90,55,25,' + a + ')'; g.lineWidth = 1 + Math.random() * 2.5; g.beginPath(); for (let x = 0; x <= w; x += 8) g.lineTo(x, y0 + Math.sin(x * 0.03 + i) * 3 + Math.sin(x * 0.11 + i * 2) * 1.2); g.stroke(); }
    noiseFill(g, w, hh, 1200, 0.05, 1);
  }));
  TEX.carpet = wrapTex(canvasTex(512, 512, (g, w, hh) => {
    const n = 8, s = w / n, r = rng(11);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const odd = (i + j) % 2, v = (odd ? 146 : 124) + (r() - 0.5) * 18 + (r() < 0.1 ? 16 : 0) + (r() < 0.08 ? -16 : 0);
      g.fillStyle = 'rgb(' + v + ',' + v + ',' + (v + 7) + ')'; g.fillRect(i * s, j * s, s, s);
      g.fillStyle = 'rgba(0,0,0,.07)';
      for (let k = 0; k < s; k += 3) odd ? g.fillRect(i * s + k, j * s, 1, s) : g.fillRect(i * s, j * s + k, s, 1);
      g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(i * s, j * s, s, 1); g.fillRect(i * s, j * s, 1, s);
    }
    noiseFill(g, w, hh, 16000, 0.12, 2);
    for (let i = 0; i < 4; i++) { const x = r() * w, y = r() * hh, rr = 5 + r() * 10, gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, 'rgba(50,30,15,.28)'); gr.addColorStop(0.7, 'rgba(50,30,15,.14)'); gr.addColorStop(1, 'rgba(50,30,15,0)'); g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
  }), 8);
  TEX.lino = wrapTex(canvasTex(256, 256, (g, w, hh) => {
    const n = 4, s = w / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const v = (i + j) % 2 ? 232 : 205; g.fillStyle = 'rgb(' + v + ',' + (v - 6) + ',' + (v - 22) + ')'; g.fillRect(i * s, j * s, s, s); }
    noiseFill(g, w, hh, 5000, 0.05, 2);
    g.strokeStyle = 'rgba(70,50,30,.25)'; g.lineWidth = 2; for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, hh); g.moveTo(0, i * s); g.lineTo(w, i * s); g.stroke(); }
  }));
  TEX.planks = wrapTex(canvasTex(256, 256, (g, w, hh) => {
    const r = rng(5);
    for (let i = 0; i < 8; i++) { const v = 150 + r() * 50; g.fillStyle = 'rgb(' + v + ',' + (v * 0.68 | 0) + ',' + (v * 0.42 | 0) + ')'; g.fillRect(0, i * 32, w, 32); g.fillStyle = 'rgba(40,20,5,.45)'; g.fillRect(0, i * 32, w, 2); g.fillRect((r() * w) | 0, i * 32, 2, 32); }
    for (let i = 0; i < 120; i++) { g.strokeStyle = 'rgba(60,30,10,' + (0.05 + r() * 0.1) + ')'; g.lineWidth = 1; const y = r() * hh; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(w / 3, y + 3, w * 2 / 3, y - 3, w, y); g.stroke(); }
  }));
  TEX.ceil = wrapTex(canvasTex(512, 512, (g, w, hh) => {
    const n = 8, s = w / n, r = rng(3);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const v = 228 + (r() - 0.5) * 16; g.fillStyle = 'rgb(' + v + ',' + (v - 4) + ',' + (v - 12) + ')'; g.fillRect(i * s, j * s, s, s);
      for (let k = 0; k < 70; k++) { g.fillStyle = 'rgba(80,70,60,' + (0.1 + r() * 0.15) + ')'; g.fillRect(i * s + r() * s, j * s + r() * s, 1 + r() * 1.5, 1); }
      if (r() < 0.03) { const x = i * s + s * (0.3 + r() * 0.4), y = j * s + s * (0.3 + r() * 0.4), rr = s * (0.2 + r() * 0.25); g.strokeStyle = 'rgba(140,100,50,.22)'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, rr, 0, 7); g.stroke(); g.fillStyle = 'rgba(160,120,60,.1)'; g.fill(); }
    }
    g.fillStyle = '#a49c8e'; for (let i = 0; i <= n; i++) { g.fillRect(i * s - 1, 0, 2, hh); g.fillRect(0, i * s - 1, w, 2); }
    g.fillStyle = 'rgba(255,255,255,.18)'; for (let i = 0; i < n; i++) { g.fillRect(i * s + 1, 0, 1, hh); g.fillRect(0, i * s + 1, w, 1); }
  }), 8);
  TEX.radial = canvasTex(128, 128, (g, w, hh) => { const gr = g.createRadialGradient(w / 2, hh / 2, 0, w / 2, hh / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(150,150,150,1)'); gr.addColorStop(1, 'rgba(0,0,0,1)'); g.fillStyle = gr; g.fillRect(0, 0, w, hh); });
  TEX.ao = canvasTex(128, 128, (g, w, hh) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, hh); g.filter = 'blur(14px)'; g.fillStyle = '#7d7268'; rrect(g, 26, 26, w - 52, hh - 52, 16); g.fill(); g.filter = 'none'; });
  const L = THREE.MeshLambertMaterial, Ph = THREE.MeshPhongMaterial, B = THREE.MeshBasicMaterial;
  Batch.def('solid', new L({ vertexColors: true }), { cast: true });
  Batch.def('small', new L({ vertexColors: true }));
  Batch.def('shiny', new Ph({ vertexColors: true, shininess: 50, specular: 0x2a2a2a }), { cast: true });
  Batch.def('flat', new L({ vertexColors: true }));
  Batch.def('two', new L({ vertexColors: true, side: THREE.DoubleSide }), { cast: true });
  Batch.def('glow', new B({ vertexColors: true, toneMapped: false }));
  Batch.def('glass', new Ph({ vertexColors: true, transparent: true, opacity: 0.32, shininess: 100, specular: 0x777777, depthWrite: false }), { order: 2 });
  Batch.def('wall', new Ph({ map: TEX.paint, vertexColors: true, shininess: 4, specular: 0x0a0a0a }), { cast: true, uv: 'wall' });
  Batch.def('fabric', new L({ map: TEX.fabric, vertexColors: true }), { cast: true, uv: 0.5 });
  Batch.def('wood', new Ph({ map: TEX.wood, vertexColors: true, shininess: 24, specular: 0x1c1c1c }), { cast: true, uv: 0.9 });
  Batch.def('carpet', new Ph({ map: TEX.carpet, vertexColors: true, shininess: 0, specular: 0 }), { uv: 8 });
  Batch.def('lino', new Ph({ map: TEX.lino, vertexColors: true, shininess: 30, specular: 0x202020 }), { uv: 2 });
  Batch.def('planks', new Ph({ map: TEX.planks, vertexColors: true, shininess: 40, specular: 0x262626 }), { uv: 2.4 });
  Batch.def('ceil', new Ph({ map: TEX.ceil, vertexColors: true, shininess: 0, specular: 0, emissive: 0x2e2b28, emissiveMap: TEX.ceil, shadowSide: THREE.FrontSide }), { cast: true, uv: 4.8 });
  Batch.def('atlas', new L({ map: Atlas.tex, alphaTest: 0.5 }));
  Batch.def('atlasGlow', new B({ map: Atlas.tex, toneMapped: false, alphaTest: 0.5 }));
  Batch.def('pool', new B({ map: TEX.radial, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), { order: 1, recv: false });
  Batch.def('ao', new B({ map: TEX.ao, transparent: true, depthWrite: false, blending: THREE.MultiplyBlending, toneMapped: false, fog: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }), { order: 1, recv: false });
}
/* soft contact shadow on the floor (w x d, centred), and an additive light pool */
function aoDecal(x, z, w, d, ry, y) { S.geo('ao', boxGeoFlat(), x, y || 0.004, z, 0xffffff, { sx: w, sz: d, ry }); }
function lightPool(x, z, w, d, col, y, o) { const l = S.layer; S.layer = null; S.geo('pool', boxGeoFlat(), x, y || 0.006, z, col, Object.assign({ sx: w, sz: d }, o || {})); S.layer = l; }
function boxGeoFlat() { return _geos.flat || (_geos.flat = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)); }

/* ---------- the building shell ---------- */
const COL = { floorWall: '#e9d7b6', hallWall: '#e3d2b2', reviewWall: '#575c70', breakWall: '#c8c6d2', breakAccent: '#3e4768', bossWall: '#55705f', lobbyWall: '#c9c2b6', outside: '#8c7a68', base: '#3b3138', trim: '#f1e8d8', door: '#8a5a3a' };
/* a straight wall with holes: axis 'x' runs along x at z = c; axis 'z' runs along z at x = c.
   holes: [a, b, y0, y1, kind] ('door' adds a casing). colA = colour of the negative side, colB = positive side. */
function wall(axis, c, a0, a1, holes, colA, colB, t) {
  t = t || 0.16; holes = (holes || []).slice().sort((p, q) => p[0] - q[0]);
  const part = (s0, s1, y0, y1, solid) => {
    if (s1 - s0 < 0.001 || y1 - y0 < 0.001) return;
    const len = s1 - s0, mid = (s0 + s1) / 2, ym = (y0 + y1) / 2, hh = y1 - y0;
    [[-1, colA], [1, colB]].forEach(([sd, col]) => {
      const off = c + sd * t / 4;
      if (axis === 'x') S.box('wall', len, hh, t / 2, mid, ym, off, col); else S.box('wall', t / 2, hh, len, off, ym, mid, col);
      if (y0 === 0) { const bo = c + sd * (t / 2 + 0.012); if (axis === 'x') S.box('small', len, 0.11, 0.024, mid, 0.055, bo, COL.base); else S.box('small', 0.024, 0.11, len, bo, 0.055, mid, COL.base); }
    });
    if (solid) { if (axis === 'x') S.col(s0, s1, c - t / 2, c + t / 2, y1); else S.col(c - t / 2, c + t / 2, s0, s1, y1); }
  };
  let p = a0;
  for (const hl of holes) {
    part(p, hl[0], 0, ROOM_H, true); part(hl[0], hl[1], 0, hl[2], true); part(hl[0], hl[1], hl[3], ROOM_H, false); p = hl[1];
    if (hl[4] === 'door') for (const sd of [-1, 1]) {   // door casing on both faces
      const o = c + sd * (t / 2 + 0.015), cw = 0.08, ch = hl[3];
      if (axis === 'x') { S.box('solid', cw, ch + cw, 0.03, hl[0] - cw / 2, (ch + cw) / 2, o, COL.trim); S.box('solid', cw, ch + cw, 0.03, hl[1] + cw / 2, (ch + cw) / 2, o, COL.trim); S.box('solid', hl[1] - hl[0] + cw * 2, cw, 0.03, (hl[0] + hl[1]) / 2, ch + cw / 2, o, COL.trim); }
      else { S.box('solid', 0.03, ch + cw, cw, o, (ch + cw) / 2, hl[0] - cw / 2, COL.trim); S.box('solid', 0.03, ch + cw, cw, o, (ch + cw) / 2, hl[1] + cw / 2, COL.trim); S.box('solid', 0.03, cw, hl[1] - hl[0] + cw * 2, o, ch + cw / 2, (hl[0] + hl[1]) / 2, COL.trim); }
    }
  }
  part(p, a1, 0, ROOM_H, true);
}
/* a window in a wall hole: frame, sill, mullions and venetian blinds. inSign = side of the room (+1/-1).
   blinds: { cover: 0..1 from the top, tilt: radians (0 = open flat, 1.4 = nearly closed) } */
function windowAt(axis, c, a, b, y0, y1, inSign, blinds, t) {
  t = t || 0.2; const len = b - a, mid = (a + b) / 2, ym = (y0 + y1) / 2, fz = c + inSign * (t / 2 + 0.02);
  const B = (w, hh, d, along, y, across, col, key, o) => axis === 'x' ? S.box(key || 'solid', w, hh, d, along, y, across, col, o) : S.box(key || 'solid', d, hh, w, across, y, along, col, o);
  B(len + 0.16, 0.08, 0.04, mid, y1 + 0.04, fz, COL.trim); B(len + 0.16, 0.06, 0.2, mid, y0 - 0.02, c + inSign * (t / 2 + 0.05), COL.trim);
  B(0.08, y1 - y0, 0.04, a - 0.04, ym, fz, COL.trim); B(0.08, y1 - y0, 0.04, b + 0.04, ym, fz, COL.trim);
  const nm = Math.max(1, Math.round(len / 1.5)); for (let i = 1; i < nm; i++) B(0.06, y1 - y0, 0.06, a + len * i / nm, ym, c, '#d8cdb8');
  B(len, 0.04, 0.06, mid, (y0 + y1) / 2 + 0.05, c - inSign * 0.04, '#d8cdb8');
  // blinds (slats cast the striped sunlight onto the floor)
  const bl = blinds || { cover: 1, tilt: 0.55 }, sy = y1 - 0.08, n = Math.floor((y1 - y0 - 0.1) / 0.075 * bl.cover), across = c + inSign * 0.03;
  B(len - 0.02, 0.05, 0.07, mid, y1 - 0.03, across, '#efe7d6', 'shiny');
  for (let i = 0; i < n; i++) {
    const y = sy - i * 0.075, rot = (inSign > 0 ? 1 : -1) * bl.tilt;
    if (axis === 'x') S.box('shiny', len - 0.04, 0.004, 0.06, mid, y, across, '#f3ead8', { rx: rot }); else S.box('shiny', 0.06, 0.004, len - 0.04, across, y, mid, '#f3ead8', { rz: -rot });
  }
  const by = sy - n * 0.075;
  if (n > 0) { B(len - 0.02, 0.025, 0.06, mid, by, across, '#e2d8c4', 'shiny'); for (const f of [0.25, 0.75]) B(0.006, sy - by, 0.006, a + len * f, (sy + by) / 2, across + inSign * 0.01, '#d6ccb6', 'small'); }
}

function buildShell() {
  const F = COL.floorWall, H = COL.hallWall, R = COL.reviewWall, Br = COL.breakWall, Ba = COL.breakAccent, O = COL.bossWall, X = COL.outside, Lb = COL.lobbyWall;
  // floors
  S.box('carpet', 22.2, 0.1, 18.2, -1, -0.05, 0, '#9ea2b6');
  S.box('lino', 10, 0.1, 3.6, 15, -0.05, 0, '#d8d0c4');
  S.box('carpet', 10, 0.1, 7.2, 15, -0.05, -5.4, '#a3858a');
  S.box('lino', 6, 0.1, 7.2, 13, -0.05, 5.4, '#d2d0cc');
  S.box('planks', 4, 0.1, 7.2, 18, -0.05, 5.4, '#d9cbbd');
  S.box('lino', 4.4, 0.1, 5.2, 22.4, -0.05, 0, '#bdb8b0');
  // ceiling (a thin box: it must block the sun; its top face is the shadow caster, see defMaterials)
  S.layer = 'ceil'; S.box('ceil', 36.8, 0.08, 18.4, 6.2, ROOM_H + 0.04, 0, '#bcbab5'); S.layer = null;
  // outer walls
  const winW = [[-8.1, -4.9], [-3.8, -0.6], [0.6, 3.8], [4.9, 8.1]], winS = [[-9.8, -7.0], [-4.6, -1.8], [0.6, 3.4], [5.6, 8.4]];
  wall('z', -12.1, -9.2, 9.2, winW.map(w => [w[0], w[1], 0.95, 2.55]), X, F, 0.2);
  wall('x', -9.1, -12.2, 10, winS.map(w => [w[0], w[1], 0.95, 2.55]), X, F, 0.2);
  wall('x', -9.1, 10, 20.2, [[13.8, 16.6, 1.0, 2.5]], X, R, 0.2);
  wall('x', 9.1, -12.2, 10, [], F, X, 0.2);
  wall('x', 9.1, 10, 16, [], Br, X, 0.2);
  wall('x', 9.1, 16, 20.2, [[17.1, 19.1, 1.0, 2.5]], O, X, 0.2);
  wall('z', 20.1, -9.2, -2.5, [], R, X, 0.2); wall('z', 20.1, -2.5, -1.8, [], R, Lb, 0.2);
  wall('z', 20.1, -1.8, 1.8, [[-0.9, 0.9, 0, 2.3, 'door']], H, Lb, 0.2);
  wall('z', 20.1, 1.8, 2.5, [], O, Lb, 0.2); wall('z', 20.1, 2.5, 9.2, [], O, X, 0.2);
  winW.forEach((w, i) => windowAt('z', -12.1, w[0], w[1], 0.95, 2.55, 1, [{ cover: 1, tilt: 0.75 }, { cover: 0.55, tilt: 0.5 }, { cover: 1, tilt: 0.95 }, { cover: 0.7, tilt: 0.6 }][i]));
  winS.forEach((w, i) => windowAt('x', -9.1, w[0], w[1], 0.95, 2.55, 1, [{ cover: 0.6, tilt: 0.6 }, { cover: 1, tilt: 0.8 }, { cover: 0.45, tilt: 0.5 }, { cover: 1, tilt: 1.1 }][i]));
  windowAt('x', -9.1, 13.8, 16.6, 1.0, 2.5, 1, { cover: 1, tilt: 1.35 });
  windowAt('x', 9.1, 17.1, 19.1, 1.0, 2.5, -1, { cover: 0.8, tilt: 0.7 });
  // inner walls
  wall('z', 10, -9, -1.8, [], F, R);
  wall('z', 10, -1.8, 1.8, [[-1.8, 1.8, 0, 2.7]], F, H);
  wall('z', 10, 1.8, 9, [], F, Ba);
  wall('x', -1.8, 10, 20, [[13.3, 14.7, 0, 2.3, 'door']], R, H);
  wall('x', 1.8, 10, 16, [[11.0, 13.6, 0, 2.45, 'door']], H, Br);
  wall('x', 1.8, 16, 20, [[16.5, 17.5, 0, 2.2, 'door'], [17.9, 19.6, 1.0, 2.3]], H, O);
  wall('z', 16, 1.8, 9, [], Br, O);
  // boss window glass + frame
  S.box('glass', 1.7, 1.3, 0.02, 18.75, 1.65, 1.8, '#bfe3f0');
  for (const x of [17.9, 19.6]) S.box('solid', 0.05, 1.3, 0.18, x, 1.65, 1.8, COL.trim);
  S.box('solid', 1.8, 0.05, 0.22, 18.75, 1.0, 1.8, COL.trim); S.box('solid', 1.8, 0.05, 0.18, 18.75, 2.3, 1.8, COL.trim);
  // lobby outside the main door (police come from here)
  wall('x', -2.5, 20.2, 24.6, [], X, Lb); wall('x', 2.5, 20.2, 24.6, [], Lb, X); wall('z', 24.5, -2.5, 2.5, [], Lb, X);
  // wainscot in the boss office, chair rail in the hallway
  S.box('wood', 0.03, 1.0, 7.2, 16.1, 0.5, 5.4, '#7d5a42'); S.box('wood', 0.03, 1.0, 7.2, 19.98, 0.5, 5.4, '#7d5a42'); S.box('wood', 3.9, 1.0, 0.03, 18, 0.5, 8.98, '#7d5a42');
  for (const z of [-1.71, 1.71]) S.box('small', 10, 0.06, 0.03, 15, 0.95, z, '#b19c7d');
  // exterior backdrop: sunset city behind the windows
  const sky = canvasTex(1024, 384, drawSkyline);
  const skyM = new THREE.MeshBasicMaterial({ map: sky, fog: false, toneMapped: false });
  plane(44, 16.5, -17, 3.4, 0, skyM, 0, Math.PI / 2);
  plane(52, 16.5, 4, 3.4, -15, skyM, 0, 0).material = skyM;
  const skyN = new THREE.MeshBasicMaterial({ map: sky, fog: false, toneMapped: false, color: 0x8a7a90 });
  plane(52, 16.5, 4, 3.4, 15, skyN, 0, Math.PI);
}
function drawSkyline(g, w, hh) {
  let gr = g.createLinearGradient(0, 0, 0, hh);
  gr.addColorStop(0, '#5b3a6e'); gr.addColorStop(0.32, '#c75a5a'); gr.addColorStop(0.55, '#ff9a4a'); gr.addColorStop(0.7, '#ffd27a'); gr.addColorStop(1, '#ffb25c');
  g.fillStyle = gr; g.fillRect(0, 0, w, hh);
  gr = g.createRadialGradient(w * 0.42, hh * 0.64, 0, w * 0.42, hh * 0.64, w * 0.4); gr.addColorStop(0, 'rgba(255,250,210,1)'); gr.addColorStop(0.08, 'rgba(255,230,160,.9)'); gr.addColorStop(0.4, 'rgba(255,170,90,.35)'); gr.addColorStop(1, 'rgba(255,140,60,0)');
  g.fillStyle = gr; g.fillRect(0, 0, w, hh);
  g.fillStyle = 'rgba(255,220,180,.35)'; for (let i = 0; i < 7; i++) { const y = hh * (0.2 + i * 0.05); rrect(g, Math.random() * w * 0.8, y, 80 + Math.random() * 220, 6 + Math.random() * 6, 6); g.fill(); }
  const r = rng(21), far = '#a2555a', near = '#5a2f3e';
  for (const [col, base, hmax, wmin] of [[far, 0.7, 0.28, 30], [near, 0.78, 0.36, 40]]) {
    let x = -10;
    while (x < w) {
      const bw = wmin + r() * 60, bh = hh * (0.05 + r() * hmax); g.fillStyle = col; g.fillRect(x, hh * base - bh, bw, bh + hh);
      if (col === near) { g.fillStyle = 'rgba(255,214,140,.75)'; for (let wy = hh * base - bh + 8; wy < hh * base - 6; wy += 12) for (let wx = x + 5; wx < x + bw - 6; wx += 10) if (r() < 0.35) g.fillRect(wx, wy, 5, 6); }
      if (r() < 0.2) { g.fillStyle = col; g.fillRect(x + bw / 2 - 1, hh * base - bh - 24, 2, 24); }
      x += bw + r() * 6;
    }
  }
  g.fillStyle = '#3e2230'; g.fillRect(0, hh * 0.86, w, hh);
}

/* ---------- doors ---------- */
/* a swinging door leaf. hinge at (x, z); the leaf extends along +x before rotation `ry0`; opens by `swing` radians */
function makeDoor(id, o) {
  const g = new THREE.Group(); g.position.set(o.x, 0, o.z); g.rotation.y = o.ry0; W.scene.add(g);
  const leaf = new THREE.Group(); g.add(leaf);
  const items = [], add = (gg, x, y, z, col, oo) => items.push(gg, xf(x, y, z, oo), col), w = o.w, hh = o.h || 2.2, dark = '#3a3330';
  if (o.glass) {
    add(boxGeo(0.07, hh, 0.05), 0.035, hh / 2, 0, o.frame); add(boxGeo(0.07, hh, 0.05), w - 0.035, hh / 2, 0, o.frame);
    add(boxGeo(w, 0.1, 0.05), w / 2, hh - 0.05, 0, o.frame); add(boxGeo(w, 0.28, 0.05), w / 2, 0.14, 0, o.frame);
    add(boxGeo(w - 0.2, 0.04, 0.05), w / 2, 1.05, 0.05, '#c9c4bc'); add(boxGeo(w - 0.2, 0.04, 0.05), w / 2, 1.05, -0.05, '#c9c4bc');
  } else {
    add(boxGeo(w, hh, 0.045), w / 2, hh / 2, 0, o.frame);
    add(boxGeo(0.3, 0.42, 0.05), w * 0.5, 1.78, 0, '#d9eef5');
    add(boxGeo(0.04, 0.03, 0.12), w - 0.1, 1.0, 0, '#d6c27a'); add(cylGeo(0.025, 0.025, 0.06, 10), w - 0.1, 1.0, 0.05, '#d6c27a', { rx: Math.PI / 2 }); add(cylGeo(0.025, 0.025, 0.06, 10), w - 0.1, 1.0, -0.05, '#d6c27a', { rx: Math.PI / 2 });
    add(boxGeo(w - 0.16, 0.6, 0.05), w / 2, 0.55, 0, dark);
  }
  const frame = new THREE.Mesh(mergeGeos(items), Batch.g.shiny.m); frame.castShadow = true; frame.receiveShadow = true; leaf.add(frame);
  if (o.glass) { const gl = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.14, hh - 0.38), new THREE.MeshPhongMaterial({ color: 0xa8d4e0, transparent: true, opacity: 0.28, shininess: 100, specular: 0x888888, side: THREE.DoubleSide, depthWrite: false })); gl.position.set(w / 2, hh / 2 + 0.09, 0); leaf.add(gl); }
  if (o.sign) { const s = new THREE.Mesh(cellGeo(o.sign, 0.42, 0.14), Batch.g.atlas.m); s.position.set(w / 2, 1.38, 0.03); leaf.add(s); const s2 = s.clone(); s2.rotation.y = Math.PI; s2.position.z = -0.03; leaf.add(s2); }
  const col = { x0: 0, x1: 0, z0: 0, z1: 0, y1: hh };
  { const c = Math.cos(o.ry0), s = Math.sin(o.ry0), ex = o.x + c * w, ez = o.z - s * w; col.x0 = Math.min(o.x, ex) - 0.04; col.x1 = Math.max(o.x, ex) + 0.04; col.z0 = Math.min(o.z, ez) - 0.04; col.z1 = Math.max(o.z, ez) + 0.04; }
  const d = {
    id, group: g, leaf, isOpen: false, a: 0, target: 0, pos: o.pos, swing: o.swing,
    open(sync) { this.set(true, sync); }, close(sync) { this.set(false, sync); }, toggle(sync) { this.set(!this.isOpen, sync); },
    set(open, sync) {
      if (this.isOpen === !!open) return; this.isOpen = !!open; this.target = open ? this.swing : 0;
      const i = W.colliders.indexOf(col); if (open && i >= 0) W.colliders.splice(i, 1); else if (!open && i < 0) W.colliders.push(col);
      if (sync && Net.active) Net.emit('office:door', { id, open: this.isOpen });
      Bus.emit('door', { id, open: this.isOpen });
    }
  };
  W.colliders.push(col);
  W.anim.push(dt => { if (d.a !== d.target) { const k = Math.min(1, dt * 7); d.a += (d.target - d.a) * k; if (Math.abs(d.target - d.a) < 0.002) { d.a = d.target; W.updateShadows(); } leaf.rotation.y = d.a; } });
  W.doors[id] = d;
  return d;
}
function buildDoors() {
  // main entrance: double glass doors, swing inwards
  const L = makeDoor('mainL', { x: 20.04, z: -0.9, ry0: -Math.PI / 2, w: 0.88, h: 2.25, glass: true, frame: '#5b4636', swing: -Math.PI * 0.55, pos: { x: 20, z: -0.45 } });
  const Rr = makeDoor('mainR', { x: 20.04, z: 0.9, ry0: Math.PI / 2, w: 0.88, h: 2.25, glass: true, frame: '#5b4636', swing: Math.PI * 0.55, pos: { x: 20, z: 0.45 } });
  const main = {
    id: 'main', pos: { x: 20, z: 0 }, inside: { x: 18.8, z: 0 }, outside: { x: 21.4, z: 0 },
    get isOpen() { return L.isOpen; },
    open(sync) { L.open(); Rr.open(); if (sync && Net.active) Net.emit('office:door', { id: 'main', open: true }); },
    close(sync) { L.close(); Rr.close(); if (sync && Net.active) Net.emit('office:door', { id: 'main', open: false }); },
    toggle(sync) { this.isOpen ? this.close(sync) : this.open(sync); },
    set(open, sync) { open ? this.open(sync) : this.close(sync); }
  };
  W.doors.main = main; delete W.doors.mainL; delete W.doors.mainR; Object.defineProperty(W.doors, '_leaves', { value: [L, Rr], enumerable: false });
  const boss = makeDoor('boss', { x: 16.5, z: 1.8, ry0: 0, w: 1.0, h: 2.2, frame: COL.door, swing: -Math.PI * 0.6, pos: { x: 17, z: 1.8 }, sign: Atlas.signBoss });
  boss.set(true);
  for (const [d, lab, at] of [[main, 'the door', [19.6, 1.1, 0]], [boss, 'the door', [17, 1.1, 1.8]]]) W.interact.push({ pos: new THREE.Vector3(at[0], at[1], at[2]), label: () => (d.isOpen ? 'Close ' : 'Open ') + lab, act: () => { d.toggle(true); SFX.click(); } });
  Net.on('office:door', p => { const d = W.doors[p && p.id]; if (d) d.set(!!p.open); });
  Net.share('doors', () => ({ main: main.isOpen, boss: boss.isOpen }), s => { if (!s) return; if (main.isOpen !== !!s.main) main.set(!!s.main); if (boss.isOpen !== !!s.boss) boss.set(!!s.boss); });
  // a new game / shift starts with the doors as built (a police raid bursts the main door open and an aborted raid never closes it)
  Bus.on('game:begin', () => { main.close(); boss.open(); });
  Bus.on('day:start', () => { if (Net.isAuth()) main.close(true); });
}

/* ---------- lighting ---------- */
function buildLights() {
  const S_ = W.scene;
  S_.add(new THREE.HemisphereLight(0xffe0b8, 0x40302c, 0.5));
  S_.add(new THREE.AmbientLight(0xffe6cc, 0.1));
  // low evening sun from the west-southwest, through the blinds
  const sun = new THREE.DirectionalLight(0xffa860, SUN_I);
  sun.position.set(-26, 10, -9.5); sun.target.position.set(0, 0, 0); S_.add(sun.target);
  const sc = sun.shadow.camera; sc.left = -20; sc.right = 20; sc.top = 13; sc.bottom = -13; sc.near = 1; sc.far = 70;
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.025; sun.shadow.mapSize.set(1024, 1024);
  S_.add(sun); W.sun = sun;
  // warm fluorescent fill
  [[-7.5, 2.3, 0, 0.55, 15], [-1, 2.3, -2, 0.5, 14], [5, 2.3, 2, 0.55, 14], [15, 2.2, 0, 0.45, 9], [13, 2.2, 5.6, 0.55, 9], [15, 2.1, -5.4, 0.3, 9], [18, 2.2, 5.4, 0.45, 7]].forEach(p => {
    const l = new THREE.PointLight(0xffd6a0, p[3], p[4], 1.2); l.position.set(p[0], p[1], p[2]); S_.add(l);
  });
}
/* recessed fluorescent troffer (ceiling) + its light pool on the floor */
function troffer(x, z, along, pool) {
  const w = along === 'z' ? 0.6 : 1.2, d = along === 'z' ? 1.2 : 0.6;
  S.box('solid', w + 0.06, 0.03, d + 0.06, x, ROOM_H - 0.012, z, '#d8d2c6');
  S.box('glow', w - 0.08, 0.02, d - 0.08, x, ROOM_H - 0.02, z, '#fff2d8');
  for (let i = 1; i < 3; i++) along === 'z' ? S.box('small', w - 0.08, 0.012, 0.02, x, ROOM_H - 0.034, z - d / 2 + d * i / 3, '#e8e0d0') : S.box('small', 0.02, 0.012, d - 0.08, x - w / 2 + w * i / 3, ROOM_H - 0.034, z, '#e8e0d0');
  if (pool !== false) lightPool(x, z, 3.6, 3.6, '#2a2116');
}
/* linear pendant fixture (break / review rooms) */
function pendant(x, z, len, along) {
  const y = ROOM_H - 0.32;
  const P_ = (w, hh, d, lx, ly, col, key) => along === 'z' ? S.box(key || 'solid', d, hh, w, x, ly, z + lx, col) : S.box(key || 'solid', w, hh, d, x + lx, ly, z, col);
  P_(len, 0.08, 0.16, 0, y, '#2c2a2e', 'shiny'); P_(len - 0.06, 0.02, 0.12, 0, y - 0.045, '#fff0d4', 'glow');
  for (const s of [-1, 1]) P_(0.008, 0.28, 0.008, s * len * 0.4, y + 0.18, '#555', 'small');
  lightPool(x, z, along === 'z' ? 3 : 4.2, along === 'z' ? 4.2 : 3, '#30251a');
}

/* ---------- desks ---------- */
const DESK_COL = { top: '#d3cbbb', leg: '#e6e1d6', ped: '#c9c1b0', fab: '#4a5690', trim: '#cbc5b8', bezel: '#2b2d33', chair: '#ece8df', base: '#2c2c31', kb: '#d4cdbd', phone: '#d6cfbf' };
function deskArt() {
  const notes = [
    ['STAY', 'AWAKE', 'eyes'], ['Focus!', '', 'doodle'], ['', '', 'smiley'], ['CALL', 'MOM', 'heart'], ['$$$', '', 'dollar'], ['Lunch', '12:00', 'burger'],
    ['Be nice', ':)', ''], ['', '', 'cat'], ['QUOTA', '!!!', 'arrow'], ['Meeting', '5PM', 'clock'], ['', '', 'stick'], ['Don\'t', 'panic', 'star']
  ];
  const paper = ['#ffe36e', '#fff1a8', '#ffb7cc', '#a8e6ff', '#ffc98a', '#c5f29a'];
  Atlas.notes = notes.map((n, i) => Atlas.cell(128, 128, (g, w, hh) => drawNote(g, w, hh, n, paper[i % paper.length], i)));
  Atlas.keys = Atlas.cell(256, 84, (g, w, hh) => {
    g.fillStyle = '#bdb6a6'; g.fillRect(0, 0, w, hh);
    const rows = [[14, 1], [14, 1], [13, 1], [12, 1]];
    rows.forEach((r, j) => { const kw = (w - 10) / 15; for (let i = 0; i < r[0]; i++) { const x = 5 + i * kw + j * kw * 0.3, y = 5 + j * 16; g.fillStyle = '#efeadf'; rrect(g, x, y, kw - 2, 13, 2); g.fill(); g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(x, y + 11, kw - 2, 2); } });
    g.fillStyle = '#efeadf'; rrect(g, 60, 70, 120, 12, 2); g.fill();
  });
  Atlas.keypad = Atlas.cell(96, 96, (g, w, hh) => {
    g.fillStyle = '#c9c1b0'; g.fillRect(0, 0, w, hh); g.fillStyle = '#7fd8a8'; rrect(g, 8, 6, 52, 20, 3); g.fill(); g.fillStyle = '#245'; g.font = '10px monospace'; g.fillText('09:41', 14, 20);
    for (let i = 0; i < 12; i++) { g.fillStyle = '#f2ede2'; rrect(g, 10 + (i % 3) * 17, 32 + Math.floor(i / 3) * 15, 14, 11, 3); g.fill(); }
    g.fillStyle = '#d23'; rrect(g, 66, 34, 22, 12, 3); g.fill(); g.fillStyle = '#2b7'; rrect(g, 66, 52, 22, 12, 3); g.fill();
  });
  Atlas.photo = [0, 1, 2].map(k => Atlas.cell(96, 80, (g, w, hh) => {
    const sk = ['#7ec8ff', '#ffb36b', '#9fe0a8'][k]; g.fillStyle = '#3a2a20'; g.fillRect(0, 0, w, hh); g.fillStyle = sk; g.fillRect(6, 6, w - 12, hh - 12);
    g.fillStyle = '#5aa05a'; g.fillRect(6, hh - 26, w - 12, 20);
    for (let i = 0; i < 2 + k; i++) { const x = 22 + i * 20; g.fillStyle = SKINS[(i + k * 2) % SKINS.length]; g.beginPath(); g.arc(x, hh - 40, 7, 0, 7); g.fill(); g.fillStyle = SHIRTS[(i * 3 + k) % SHIRTS.length]; g.fillRect(x - 7, hh - 33, 14, 14); }
  }));
  Atlas.signBoss = Atlas.cell(192, 64, (g, w, hh) => { g.fillStyle = '#2b2118'; g.fillRect(0, 0, w, hh); g.strokeStyle = '#d8b15a'; g.lineWidth = 4; g.strokeRect(5, 5, w - 10, hh - 10); g.fillStyle = '#e9c873'; g.font = '30px ' + FONT.slab; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('THE BOSS', w / 2, hh / 2 + 2); });
}
function drawNote(g, w, hh, n, col, i) {
  g.fillStyle = col; g.fillRect(0, 0, w, hh);
  const gr = g.createLinearGradient(0, 0, 0, hh); gr.addColorStop(0, 'rgba(0,0,0,.08)'); gr.addColorStop(0.18, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.06)'); g.fillStyle = gr; g.fillRect(0, 0, w, hh);
  const ink = i % 4 === 3 ? '#1c3b8c' : '#2a2320';
  if (n[0]) scrawl(g, n[0], w / 2, n[1] ? 46 : 64, n[0].length > 6 ? 24 : 30, ink, { align: 'center', seed: i });
  if (n[1]) scrawl(g, n[1], w / 2, 82, n[1].length > 6 ? 24 : 30, ink, { align: 'center', seed: i + 9 });
  const d = n[2], cx = w / 2, by = n[0] ? 104 : 64;
  if (d === 'eyes') { for (const s of [-1, 1]) { g.strokeStyle = ink; g.lineWidth = 3; g.beginPath(); g.ellipse(cx + s * 14, by, 11, 9, 0, 0, 7); g.stroke(); g.fillStyle = ink; g.beginPath(); g.arc(cx + s * 14 + 3, by + 2, 3.5, 0, 7); g.fill(); } }
  else if (d === 'smiley') { g.strokeStyle = ink; g.lineWidth = 5; g.beginPath(); g.arc(cx, by, 38, 0, 7); g.stroke(); g.fillStyle = ink; g.beginPath(); g.arc(cx - 13, by - 10, 5, 0, 7); g.arc(cx + 13, by - 10, 5, 0, 7); g.fill(); g.beginPath(); g.arc(cx, by + 4, 22, 0.2, Math.PI - 0.2); g.stroke(); }
  else if (d === 'heart') { g.fillStyle = '#d33'; g.beginPath(); g.moveTo(cx, by + 10); g.bezierCurveTo(cx - 20, by - 4, cx - 10, by - 18, cx, by - 6); g.bezierCurveTo(cx + 10, by - 18, cx + 20, by - 4, cx, by + 10); g.fill(); }
  else if (d === 'dollar') { scrawl(g, '$', cx - 30, 104, 40, '#1f7a3a', { seed: 3 }); scrawl(g, '$', cx + 10, 108, 34, '#1f7a3a', { seed: 4 }); }
  else if (d === 'burger') { g.fillStyle = '#c98a3a'; g.beginPath(); g.ellipse(cx, by - 4, 18, 8, 0, Math.PI, 0); g.fill(); g.fillStyle = '#5a3'; g.fillRect(cx - 18, by - 4, 36, 3); g.fillStyle = '#6b3a1e'; g.fillRect(cx - 17, by - 1, 34, 5); g.fillStyle = '#c98a3a'; g.fillRect(cx - 17, by + 4, 34, 4); }
  else if (d === 'cat') { wobble(g, [[cx - 30, by + 30], [cx - 30, by - 10], [cx - 22, by - 34], [cx - 10, by - 16], [cx + 10, by - 16], [cx + 22, by - 34], [cx + 30, by - 10], [cx + 30, by + 30], [cx - 30, by + 30]], ink, 4, 2); g.fillStyle = ink; g.beginPath(); g.arc(cx - 11, by, 4, 0, 7); g.arc(cx + 11, by, 4, 0, 7); g.fill(); wobble(g, [[cx - 6, by + 12], [cx, by + 16], [cx + 6, by + 12]], ink, 3, 4); }
  else if (d === 'arrow') { wobble(g, [[cx - 30, by + 6], [cx + 24, by - 8]], '#d33', 4, 5); wobble(g, [[cx + 10, by - 16], [cx + 26, by - 8], [cx + 14, by + 4]], '#d33', 4, 6); }
  else if (d === 'clock') { g.strokeStyle = ink; g.lineWidth = 3; g.beginPath(); g.arc(cx + 34, 30, 12, 0, 7); g.stroke(); wobble(g, [[cx + 34, 22], [cx + 34, 30], [cx + 40, 33]], ink, 2, 8); }
  else if (d === 'stick') { g.strokeStyle = ink; g.lineWidth = 4; g.beginPath(); g.arc(cx, 36, 13, 0, 7); g.stroke(); wobble(g, [[cx, 49], [cx, 86]], ink, 4, 1); wobble(g, [[cx - 22, 58], [cx, 64], [cx + 24, 52]], ink, 4, 2); wobble(g, [[cx - 16, 110], [cx, 86], [cx + 16, 110]], ink, 4, 3); scrawl(g, 'me', cx + 30, 40, 18, ink, { seed: 5 }); }
  else if (d === 'star') { g.fillStyle = '#e6a400'; g.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 7 : 16; g.lineTo(cx + 34 + Math.cos(a) * r, 26 + Math.sin(a) * r); } g.fill(); }
  else if (d === 'doodle') { wobble(g, [[20, 88], [34, 76], [48, 92], [62, 74], [76, 94]], ink, 3, 9); g.strokeStyle = ink; g.lineWidth = 3; g.beginPath(); g.arc(98, 92, 10, 0, 7); g.stroke(); wobble(g, [[92, 90], [96, 95], [104, 88]], ink, 2, 4); }
}
function buildDesks() {
  let i = 0;
  DESK_PODS.forEach(c => {
    buildPod(c);
    [[c + 0.47, Math.PI / 2], [c - 0.47, -Math.PI / 2]].forEach(([x, rot]) => DESK_Z.forEach(z => makeDesk(i++, x, z, rot)));
  });
}
/* a pod: the long back partition shared by two rows of desks + the side partitions between desks */
function buildPod(c) {
  const C = DESK_COL;
  for (const s of [-1, 1]) {
    const z0 = s * 1.2, z1 = s * 6.9, zm = (z0 + z1) / 2, len = 5.7;
    S.box('fabric', 0.05, 1.42, len, c, 0.79, zm, C.fab); S.box('solid', 0.06, 0.08, len, c, 0.04, zm, '#26283a');
    S.rbox('solid', 0.09, 0.045, len + 0.04, 0.015, c, 1.515, zm, C.trim);
    S.col(c - 0.92, c + 0.92, Math.min(z0, z1) - 0.02, Math.max(z0, z1) + 0.02, 1.5);
    for (const zb of [1.2, 3.1, 5.0, 6.9]) {
      const z = s * zb;
      S.box('fabric', 2.24, 1.42, 0.05, c, 0.79, z, C.fab); S.box('solid', 2.24, 0.08, 0.06, c, 0.04, z, '#26283a');
      S.rbox('solid', 2.3, 0.045, 0.09, 0.015, c, 1.515, z, C.trim);
      for (const x of [c - 1.12, c, c + 1.12]) S.rbox('solid', 0.08, 1.52, 0.08, 0.02, x, 0.76, z, C.trim);
      S.col(c - 1.14, c + 1.14, z - 0.04, z + 0.04, 1.5);
    }
    aoDecal(c, zm, 2.4, len + 0.4);
  }
}
function makeDesk(i, x, z, rot) {
  const C = DESK_COL, r = rng(i * 7 + 3), npc = NPC_DESKS.has(i);
  const p = new THREE.Matrix4().makeRotationY(rot).setPosition(x, 0, z), o = (extra) => Object.assign({ p }, extra || {});
  const lw = (lx, lz) => { _v3.set(lx, 0, lz).applyMatrix4(p); return [_v3.x, _v3.z]; };
  // desk
  S.rbox('solid', 1.82, 0.045, 0.84, 0.014, 0, 0.745, 0, C.top, o());
  for (const s of [-1, 1]) S.box('solid', 0.04, 0.72, 0.74, s * 0.86, 0.36, -0.02, C.leg, o());
  S.box('solid', 1.68, 0.36, 0.02, 0, 0.52, -0.36, C.leg, o());
  S.rbox('solid', 0.42, 0.62, 0.66, 0.012, 0.6, 0.31, -0.04, C.ped, o());
  for (const y of [0.2, 0.4, 0.56]) { S.box('small', 0.38, 0.008, 0.01, 0.6, y, 0.295, '#9d9584', o()); S.box('small', 0.12, 0.016, 0.02, 0.6, y + 0.06, 0.3, '#8a8272', o()); }
  // chunky monitor + webcam
  S.rbox('shiny', 0.24, 0.018, 0.17, 0.008, 0, 0.776, -0.2, C.bezel, o());
  S.box('shiny', 0.05, 0.17, 0.035, 0, 0.86, -0.26, C.bezel, o());
  S.rbox('shiny', 0.68, 0.45, 0.05, 0.02, 0, 1.14, -0.235, C.bezel, o({ seg: 2 }));
  S.rbox('shiny', 0.5, 0.33, 0.13, 0.04, 0, 1.13, -0.32, '#34363d', o());
  S.box('glow', 0.012, 0.012, 0.004, 0.3, 0.935, -0.209, '#5cff8a', o());
  S.rbox('shiny', 0.12, 0.048, 0.05, 0.018, 0, 1.39, -0.235, '#1c1d22', o());
  S.cyl('shiny', 0.017, 0.017, 0.01, -0.012, 1.39, -0.209, '#25335c', o({ rx: Math.PI / 2, seg: 10 }));
  S.box('glow', 0.01, 0.01, 0.004, 0.032, 1.39, -0.209, '#ff2a2a', o());
  // keyboard, mouse, phone
  S.rbox('small', 0.44, 0.022, 0.15, 0.008, 0, 0.778, 0.1, C.kb, o());
  S.decal(Atlas.keys, 0.42, 0.13, 0, 0.7905, 0.1, o({ rx: -Math.PI / 2 }));
  const mx = 0.34 + r() * 0.05;
  S.box('small', 0.22, 0.004, 0.18, mx, 0.769, 0.11, ['#2b3a5c', '#5c2b3a', '#2c4a3a'][i % 3], o());
  S.rbox('small', 0.055, 0.032, 0.09, 0.02, mx, 0.784, 0.12, '#dcd6c8', o({ ry: (r() - 0.5) * 0.5 }));
  S.rbox('small', 0.19, 0.06, 0.17, 0.02, -0.6, 0.795, -0.03, C.phone, o({ rx: 0.1 }));
  S.decal(Atlas.keypad, 0.12, 0.12, -0.57, 0.83, -0.035, o({ rx: -Math.PI / 2 + 0.1 }));
  S.rbox('small', 0.055, 0.045, 0.2, 0.02, -0.66, 0.845, -0.03, '#cbc3b2', o());
  // sticky notes on the partition and the desk
  const nn = 2 + Math.floor(r() * 2);
  for (let k = 0; k < nn; k++) {
    const left = k % 2 === 0, lx = (left ? -1 : 1) * (0.42 + r() * 0.4), y = 1.0 + r() * 0.38;
    S.decal(Atlas.notes[(i * 5 + k * 7) % Atlas.notes.length], 0.11, 0.11, lx, y, -0.443, o({ rz: (r() - 0.5) * 0.3 }));
  }
  if (r() < 0.7) S.decal(Atlas.notes[(i * 3 + 1) % Atlas.notes.length], 0.1, 0.1, -0.25 + r() * 0.1, 0.769, 0.28, o({ rx: -Math.PI / 2, rz: (r() - 0.5) * 0.8 }));
  if (r() < 0.5) S.decal(Atlas.notes[(i * 11 + 4) % Atlas.notes.length], 0.11, 0.11, 0.893, 1.05 + r() * 0.3, -0.1 - r() * 0.2, o({ ry: -Math.PI / 2, rz: (r() - 0.5) * 0.3 }));
  // personal clutter
  const kind = r();
  if (kind < 0.45) { S.cyl('small', 0.042, 0.038, 0.1, 0.62, 0.818, -0.12, ['#f4f1ea', '#d6342c', '#3b82f6', '#2b2b2b', '#f59e0b'][i % 5], o()); S.box('small', 0.015, 0.05, 0.035, 0.665, 0.82, -0.12, '#eee', o()); S.cyl('small', 0.036, 0.036, 0.004, 0.62, 0.866, -0.12, '#4a2c18', o()); }
  else if (kind < 0.8) { S.cyl('glass', 0.035, 0.035, 0.2, 0.62, 0.867, -0.15, '#bfe6ff', o()); S.cyl('small', 0.02, 0.02, 0.03, 0.62, 0.982, -0.15, '#2f7dd8', o()); }
  else { S.cyl('small', 0.033, 0.033, 0.12, 0.6, 0.827, -0.14, ['#d6342c', '#2b9a5a', '#e8c020'][i % 3], o()); }
  for (let k = 0, n = Math.floor(r() * 3); k < n; k++) S.box('small', 0.21, 0.003 + k * 0.001, 0.297, -0.3 + r() * 0.2, 0.769 + k * 0.004, 0.18 + r() * 0.06, '#f4f0e6', o({ ry: (r() - 0.5) * 0.7 }));
  if (r() < 0.35) { S.cyl('small', 0.05, 0.04, 0.07, -0.82, 0.802, -0.25, '#b0643c', o()); for (let k = 0; k < 6; k++) S.geo('two', leafGeo(), -0.82, 0.83, -0.25, '#4f9e3e', o({ ry: k * 1.05 + r(), rx: -0.5 - r() * 0.4, sx: 0.5, sy: 0.5, sz: 0.5 })); }
  if (r() < 0.4) { S.decal(Atlas.photo[i % 3], 0.12, 0.1, -0.35, 0.83, -0.33, o({ rx: -0.2, ry: 0.3 })); S.box('small', 0.13, 0.11, 0.01, -0.35, 0.828, -0.336, '#3a2a20', o({ rx: -0.2, ry: 0.3 })); }
  if (r() < 0.5) { S.rbox('shiny', 0.19, 0.42, 0.44, 0.012, -0.55, 0.21, -0.08, '#2f3138', o()); S.box('glow', 0.01, 0.01, 0.004, -0.5, 0.36, 0.143, '#59a8ff', o()); }
  // chair
  const cz = 0.74 + (npc ? 0 : (r() - 0.3) * 0.25), cx = npc ? 0 : (r() - 0.5) * 0.2, cr = npc ? 0 : (r() - 0.5) * 0.6;
  officeChair(new THREE.Matrix4().makeRotationY(cr).setPosition(cx, 0, cz).premultiply(p));
  aoDecal(x, z, 2.2, 1.3, rot); { const a = lw(cx, cz); aoDecal(a[0], a[1], 0.8, 0.8); }
  const seat = lw(0, 0.74), eye = lw(0, 0.6), stand = lw(0, 1.3);
  const d = { i, x, z, rot, npc, seat: { x: seat[0], z: seat[1] }, eye: { x: eye[0], y: 1.2, z: eye[1] }, stand: { x: stand[0], z: stand[1] },
    screen: { x: lw(0, -0.2065)[0], y: 1.15, z: lw(0, -0.2065)[1], w: 0.61, h: 0.37 } };
  W.desks.push(d);
  if (npc) {
    const n = buildAvatar({ shirt: SHIRTS[(i * 3) % SHIRTS.length], skin: SKINS[i % SKINS.length], hair: HAIRS[(i * 5) % HAIRS.length], name: '' });
    n.group.position.set(d.seat.x, 0, d.seat.z); n.group.rotation.y = rot; W.scene.add(n.group); W.npcs.push(n); n.desk = i;
  } else {
    W.interact.push({ desk: i, pos: new THREE.Vector3(d.seat.x, 1.0, d.seat.z), label: () => Game.deskTaken(i) ? null : 'Sit at this desk', act: () => sitAt(i) });
  }
}
/* white swivel chair in a local frame p (faces -z) */
function officeChair(p, col) {
  const o = (e) => Object.assign({ p }, e || {}), C = col || DESK_COL.chair;
  S.rbox('solid', 0.5, 0.085, 0.48, 0.035, 0, 0.47, 0, C, o({ seg: 2 }));
  S.rbox('solid', 0.47, 0.58, 0.075, 0.035, 0, 0.9, 0.25, C, o({ rx: 0.12, seg: 2 }));
  S.box('solid', 0.05, 0.3, 0.03, 0, 0.62, 0.24, DESK_COL.base, o({ rx: 0.12 }));
  S.cyl('solid', 0.026, 0.03, 0.34, 0, 0.27, 0, '#8d8f96', o({ seg: 8 }));
  for (let k = 0; k < 5; k++) {
    const a = k * Math.PI * 2 / 5;
    S.box('small', 0.045, 0.035, 0.3, Math.sin(a) * 0.14, 0.07, Math.cos(a) * 0.14, DESK_COL.base, o({ ry: a }));
    S.box('small', 0.04, 0.045, 0.05, Math.sin(a) * 0.28, 0.025, Math.cos(a) * 0.28, '#151517', o({ ry: a }));
  }
}
/* a single leaf blade (for plants), 1 unit long along +z, bent */
function leafGeo() {
  if (_geos.leaf) return _geos.leaf;
  const pts = [[0, 0, 0], [0.09, 0.03, 0.25], [0.07, 0.06, 0.6], [0, 0.03, 1], [-0.07, 0.06, 0.6], [-0.09, 0.03, 0.25], [0, 0.07, 0.3], [0, 0.09, 0.62]];
  const tri = [0, 1, 6, 0, 6, 5, 1, 2, 7, 1, 7, 6, 6, 7, 4, 6, 4, 5, 2, 3, 7, 7, 3, 4];
  const pos = [], g = new THREE.BufferGeometry(); tri.forEach(k => pos.push(...pts[k]));
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
  g.setAttribute('uv', new THREE.Float32BufferAttribute(new Array(tri.length * 2).fill(0), 2));
  return (_geos.leaf = g);
}

/* ---------- build ---------- */
function buildWorld() {
  defMaterials(); deskArt();
  if (typeof officeArt === 'function') officeArt();
  // whiteboard canvas (placed in the break room by office.js)
  W.boardCanvas = document.createElement('canvas'); W.boardCanvas.width = 1024; W.boardCanvas.height = 576;
  W.boardTex = new THREE.CanvasTexture(W.boardCanvas); W.boardTex.anisotropy = 8;
  buildShell(); buildLights(); buildDesks();
  if (typeof buildOffice === 'function') buildOffice();
  buildDoors();
  Batch.flush();
  setBoard(['Welcome to', 'Totally Legit Inc.']);

  // boss + ball assets
  W.boss = buildAvatar({ shirt: '#f4f4f4', skin: '#e9b98f', hair: '#8a8a8a', name: 'The Boss', boss: true, headset: false });
  W.boss.group.scale.setScalar(1.14); W.scene.add(W.boss.group); placeBoss(false);
  W.ballGeo = new THREE.IcosahedronGeometry(0.075, 0); W.ballMat = new THREE.MeshLambertMaterial({ color: 0xf6f3ea });
  Loop.add(dt => { for (const f of W.anim) f(dt); });
  // redraw text art once the bundled fonts are ready
  if (document.fonts && document.fonts.load) Promise.all([FONT.slab, FONT.chunky, FONT.menu, FONT.ui].map(f => document.fonts.load('700 30px ' + f).catch(() => {}))).then(() => { Atlas.repaint(); if (W.boardLines) setBoard(W.boardLines); Bus.emit('fonts:ready'); });
}
/* the "Daily Targets" whiteboard in the break room, written in marker */
function setBoard(lines) {
  W.boardLines = lines;
  const g = W.boardCanvas.getContext('2d'), w = W.boardCanvas.width, hh = W.boardCanvas.height;
  g.fillStyle = '#f5f3ee'; g.fillRect(0, 0, w, hh);
  let gr = g.createLinearGradient(0, 0, w, hh); gr.addColorStop(0, 'rgba(255,255,255,.5)'); gr.addColorStop(0.5, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(180,170,160,.18)'); g.fillStyle = gr; g.fillRect(0, 0, w, hh);
  g.fillStyle = 'rgba(120,120,140,.07)'; for (let i = 0; i < 6; i++) { g.save(); g.translate(120 + i * 150, 300 + (i % 3) * 60); g.rotate(-0.2); rrect(g, -90, -24, 180, 48, 24); g.fill(); g.restore(); }
  lines.forEach((l, i) => {
    if (i === 0) { const tw = scrawl(g, l, w / 2, 92, 74, '#1d2a6b', { align: 'center' }); wobble(g, [[w / 2 - tw / 2 - 6, 112], [w / 2 + tw / 2 + 8, 108]], '#1d2a6b', 5, 3); }
    else scrawl(g, l, 90, 110 + i * 84, 56, i === 1 ? '#c62828' : '#22252e', { seed: i });
  });
  // smiley
  g.strokeStyle = '#22252e'; g.lineWidth = 5; g.beginPath(); g.arc(w - 140, hh - 120, 46, 0, 7); g.stroke(); g.fillStyle = '#22252e'; g.beginPath(); g.arc(w - 156, hh - 132, 6, 0, 7); g.arc(w - 124, hh - 132, 6, 0, 7); g.fill(); g.beginPath(); g.arc(w - 140, hh - 116, 26, 0.3, Math.PI - 0.3); g.stroke();
  W.boardTex.needsUpdate = true;
}
function placeBoss(review, angry) {
  const b = review ? BOSS_REVIEW : BOSS_DAY;
  W.boss.group.position.set(b.x, 0, b.z); W.boss.group.rotation.y = b.yaw;
  W.boss.headMat.color.set(angry ? '#e2553f' : '#e9b98f');
}
