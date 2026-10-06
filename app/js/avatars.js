'use strict';
/* AVATARS — chunky cartoon characters: one skinned body mesh (vertex colours), an egg head with a
   canvas-drawn face, hair/beard/headset/glasses merged into one mesh, procedural blended animation,
   one-shot actions, stun stars, name tags, remote-player sync, W.me and avatarOf().
   Public API: docs/modules/avatars.md */

/* ---------- look options ---------- */
const AV_OPT = {
  skins: [['Porcelain', '#f8dcc6'], ['Peach', '#f2c4a0'], ['Sand', '#e2ad80'], ['Honey', '#cd935f'], ['Caramel', '#b17447'], ['Bronze', '#8f5c36'], ['Cocoa', '#6b4128'], ['Espresso', '#48291a'],
    ['Tangerine', '#f08a3c'], ['Lemon', '#f4c84a'], ['Mint', '#8fd0a6'], ['Lilac', '#b9a2e0']],
  hairCols: ['#1c1714', '#3a281c', '#6a4327', '#9c6a3a', '#d9b56c', '#ece4cf', '#8d8d8d', '#b5442a', '#e06aa6', '#3f6fd6', '#2fb39a'],
  shirts: ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#a855f7', '#ec4899', '#14b8a6', '#f97316', '#64748b', '#eab308', '#f4f1ea', '#273142', '#7dd3fc', '#86efac'],
  pants: ['#39415a', '#262a35', '#5b4633', '#8c7a58', '#2f4a3a', '#6b6f78', '#1f2d4d', '#cbb68c', '#7a2e2e'],
  shoes: ['#1a1c22', '#4a2e1e', '#7d4b2a', '#ebe6da', '#b8312f', '#2b4c8c'],
  hairs: [['bald', 'Bald'], ['buzz', 'Buzz cut'], ['short', 'Short'], ['sidepart', 'Side part'], ['curly', 'Curly'], ['quiff', 'Quiff'], ['afro', 'Afro'], ['long', 'Long'], ['bun', 'Bun'], ['ponytail', 'Ponytail'], ['mohawk', 'Mohawk'], ['fringe', 'Receding']],
  facials: [['none', 'None'], ['stubble', 'Stubble'], ['mustache', 'Mustache'], ['bigmustache', 'Big mustache'], ['goatee', 'Goatee'], ['beard', 'Beard']],
  glasses: [['none', 'None'], ['round', 'Round'], ['square', 'Square'], ['shades', 'Shades']],
  builds: [['slim', 'Slim'], ['avg', 'Regular'], ['big', 'Big']]
};
const AV_ACTIONS = ['throw', 'punch', 'slap', 'wave', 'point', 'cheer', 'facepalm', 'drink', 'spray', 'fart', 'hit', 'fall', 'dance', 'shrug', 'nod'];
const AV_MOODS = ['neutral', 'happy', 'angry', 'sad', 'surprised'];

const avSS = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const avApp = (v, to, s) => v < to ? Math.min(to, v + s) : Math.max(to, v - s);
const avNoise = x => Math.sin(x) * 0.55 + Math.sin(x * 2.13 + 1.3) * 0.3 + Math.sin(x * 4.71 + 2.1) * 0.15;
function avRng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function avWPick(r, list, w) { let tot = 0; for (const x of w) tot += x; let v = r() * tot; for (let i = 0; i < list.length; i++) { v -= w[i]; if (v <= 0) return list[i]; } return list[list.length - 1]; }
const avIds = a => a.map(x => x[0]);
const AV_HEX = /^#[0-9a-f]{6}$/i;

/* a random but stable look for a seed (name hash, NPC desk…) */
function lookFromSeed(seed) {
  const r = avRng(Math.imul(seed | 0, 2654435761) ^ 0x5bd1e995), O = AV_OPT, P = a => a[Math.floor(r() * a.length)];
  const skin = r() < 0.06 ? O.skins[8 + Math.floor(r() * 4)][1] : O.skins[Math.floor(r() * 8)][1];
  const hair = avWPick(r, avIds(O.hairs), [7, 10, 18, 12, 10, 8, 6, 10, 7, 7, 2, 4]);
  const hairColor = r() < 0.06 ? O.hairCols[8 + Math.floor(r() * 3)] : r() < 0.12 ? O.hairCols[5 + Math.floor(r() * 2)] : O.hairCols[Math.floor(r() * 5)];
  return { skin, hair, hairColor, facial: avWPick(r, avIds(O.facials), [50, 12, 14, 6, 8, 10]), glasses: avWPick(r, avIds(O.glasses), [68, 11, 15, 6]),
    shirt: P(O.shirts), pants: avWPick(r, O.pants, [6, 5, 3, 4, 2, 2, 3, 3, 1]), shoes: avWPick(r, O.shoes, [6, 3, 3, 2, 1, 1]), build: avWPick(r, avIds(O.builds), [3, 5, 2]), badge: true };
}
function normLook(l) {
  l = l || {}; const d = lookFromSeed(7), O = AV_OPT, ok = (v, list) => list.includes(v), col = (v, f) => AV_HEX.test(v || '') ? v.toLowerCase() : f;
  return { skin: col(l.skin, d.skin), hair: ok(l.hair, avIds(O.hairs)) ? l.hair : 'short', hairColor: col(l.hairColor, d.hairColor), facial: ok(l.facial, avIds(O.facials)) ? l.facial : 'none',
    glasses: ok(l.glasses, avIds(O.glasses)) ? l.glasses : 'none', shirt: col(l.shirt, '#3b82f6'), pants: col(l.pants, '#39415a'), shoes: col(l.shoes, '#1a1c22'),
    build: ok(l.build, avIds(O.builds)) ? l.build : 'avg', badge: l.badge !== false, boss: !!l.boss };
}
/* compact string form used over the network: "f2c4a0|short|3a281c|none|none|3b82f6|39415a|1a1c22|avg" */
const AV_PK = ['skin', 'hair', 'hairColor', 'facial', 'glasses', 'shirt', 'pants', 'shoes', 'build'];
function packLook(l) { return AV_PK.map(k => String(l[k] || '').replace('#', '')).join('|'); }
function unpackLook(s) {
  if (s && typeof s === 'object') return normLook(s);
  const p = String(s || '').split('|'), o = {};
  AV_PK.forEach((k, i) => { const v = p[i] || ''; o[k] = /^[0-9a-f]{6}$/i.test(v) && !['hair', 'facial', 'glasses', 'build'].includes(k) ? '#' + v : v; });
  return normLook(o);
}
let _avSeq = 0;
function resolveLook(o) {
  if (o.look) return normLook(typeof o.look === 'string' ? unpackLook(o.look) : o.look);
  const L = lookFromSeed(hashStr(o.name || ((o.shirt || '') + (o.skin || '') + (o.hair || '') + '#' + (_avSeq++))));
  if (o.shirt) L.shirt = String(o.shirt); if (o.skin) L.skin = String(o.skin); if (o.hair) L.hairColor = String(o.hair);
  if (o.boss) Object.assign(L, { hair: 'fringe', facial: 'bigmustache', glasses: 'square', build: 'big', pants: '#2b2f3b', shoes: '#141519', shirt: '#f4f2ec', boss: true });
  return normLook(L);
}

/* ---------- shared materials and textures ---------- */
const AVM = {};
function avMats() {
  if (AVM.body) return AVM;
  AVM.body = new THREE.MeshLambertMaterial({ vertexColors: true, skinning: true });
  AVM.acc = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  const tex = (w, draw) => { const c = document.createElement('canvas'); c.width = c.height = w; draw(c.getContext('2d'), w); const t = new THREE.CanvasTexture(c); return t; };
  AVM.shadow = new THREE.MeshBasicMaterial({ map: tex(64, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(0,0,0,.5)'); gr.addColorStop(0.55, 'rgba(0,0,0,.28)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); }), transparent: true, depthWrite: false });
  AVM.shadowGeo = new THREE.PlaneGeometry(0.8, 0.8); AVM.shadowGeo.rotateX(-Math.PI / 2);
  AVM.talk = new THREE.SpriteMaterial({ map: tex(64, (g) => {
    g.fillStyle = '#1d2a22'; g.beginPath(); g.arc(32, 32, 30, 0, 7); g.fill(); g.fillStyle = '#2fd07f'; g.beginPath(); g.arc(32, 32, 25, 0, 7); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.moveTo(14, 26); g.lineTo(21, 26); g.lineTo(30, 18); g.lineTo(30, 46); g.lineTo(21, 38); g.lineTo(14, 38); g.closePath(); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 3.5; g.lineCap = 'round'; [8, 15].forEach(r => { g.beginPath(); g.arc(31, 32, r, -0.8, 0.8); g.stroke(); });
  }), depthTest: false, depthWrite: false, transparent: true });
  AVM.star = new THREE.SpriteMaterial({ map: tex(64, (g) => {
    const star = (r1, r2) => { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? r2 : r1; g.lineTo(32 + Math.cos(a) * r, 33 + Math.sin(a) * r); } g.closePath(); };
    g.lineJoin = 'round'; star(29, 13); g.fillStyle = '#7a4300'; g.fill(); g.lineWidth = 5; g.strokeStyle = '#7a4300'; g.stroke();
    star(24, 11); g.fillStyle = '#ffd23a'; g.fill(); g.fillStyle = 'rgba(255,255,255,.75)'; g.beginPath(); g.ellipse(26, 24, 5, 3, -0.6, 0, 7); g.fill();
  }), depthWrite: false, transparent: true });
  [AVM.body, AVM.acc].forEach(avShade);
  return AVM;
}
/* soft cartoon volume: darken towards the silhouette and keep bright office lights from washing colours out */
function avShadeHook(sh) {   // Lambert (per-vertex lighting, cheap) + a per-vertex rim term
  sh.vertexShader = 'varying float vAvRim;\n' + sh.vertexShader.replace('#include <lights_lambert_vertex>', '#include <lights_lambert_vertex>\n\tvAvRim = clamp(dot(geometry.normal, geometry.viewDir), 0.0, 1.0);');
  sh.fragmentShader = 'varying float vAvRim;\n' + sh.fragmentShader.replace('gl_FragColor = vec4( outgoingLight, diffuseColor.a );', 'outgoingLight *= 0.86 * (0.7 + 0.3 * smoothstep(0.05, 0.8, vAvRim));\n\tgl_FragColor = vec4( outgoingLight, diffuseColor.a );');
}
function avShade(m) { m.onBeforeCompile = avShadeHook; return m; }

/* ---------- geometry helpers ---------- */
const _avV = new THREE.Vector3(), _avN = new THREE.Vector3(), _avM3 = new THREE.Matrix3(), _avQ = new THREE.Quaternion(), _avE = new THREE.Euler();
function avGbNew(skinned) { return { p: [], n: [], c: [], u: [], i: [], si: [], sw: [], sk: skinned }; }
/* add geometry: m = Matrix4|null, color = THREE.Color|fn(x,y,z), skin = [bone]|fn(x,y,z) -> [b0, b1, weightOfB1] */
function avGbAdd(b, geo, m, color, skin) {
  const pos = geo.attributes.position, nor = geo.attributes.normal, uv = geo.attributes.uv, base = b.p.length / 3, flip = m && m.determinant() < 0;
  if (m) _avM3.getNormalMatrix(m);
  for (let k = 0; k < pos.count; k++) {
    _avV.fromBufferAttribute(pos, k); if (m) _avV.applyMatrix4(m);
    _avN.fromBufferAttribute(nor, k); if (m) _avN.applyMatrix3(_avM3).normalize();
    const c = typeof color === 'function' ? color(_avV.x, _avV.y, _avV.z) : color; b.c.push(c.r, c.g, c.b);
    if (b.sk) {
      const s = typeof skin === 'function' ? skin(_avV.x, _avV.y, _avV.z) : skin; const w = s[2] || 0; b.si.push(s[0], s.length > 1 ? s[1] : s[0], 0, 0); b.sw.push(1 - w, w, 0, 0);
      if (b.leg && _avV.y > AV_LEG.a && _avV.y < AV_LEG.b) { _avV.y = AV_LEG.a + (_avV.y - AV_LEG.a) * AV_LEG.s; _avN.y /= AV_LEG.s; _avN.normalize(); }   // squash the legs
      else if (!b.leg || _avV.y >= AV_LEG.b) _avV.y -= AV_LEG.dy;
    }
    b.p.push(_avV.x, _avV.y, _avV.z); b.n.push(_avN.x, _avN.y, _avN.z); b.u.push(uv ? uv.getX(k) : 0, uv ? uv.getY(k) : 0);
  }
  const cnt = geo.index ? geo.index.count : pos.count, ix = k => geo.index ? geo.index.getX(k) : k;
  for (let k = 0; k < cnt; k += 3) { const a = ix(k), c2 = ix(k + 1), d = ix(k + 2); if (flip) b.i.push(base + a, base + d, base + c2); else b.i.push(base + a, base + c2, base + d); }
}
function avGbBuild(b) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(b.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(b.n, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(b.c, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(b.u, 2));
  if (b.sk) { g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(b.si, 4)); g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(b.sw, 4)); }
  g.setIndex(b.p.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(b.i, 1) : new THREE.Uint16BufferAttribute(b.i, 1));
  g.computeBoundingSphere(); return g;
}
function avM(x, y, z, sx, sy, sz, rx, ry, rz) { _avE.set(rx || 0, ry || 0, rz || 0); _avQ.setFromEuler(_avE); return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), _avQ, new THREE.Vector3(sx, sy == null ? sx : sy, sz == null ? sx : sz)); }
/* lathe from a [[y, r], ...] table sampled at ys (bottom to top), elliptical (zs) and moved to x0 */
function avTable(T, y) { if (y <= T[0][0]) return T[0][1]; for (let i = 1; i < T.length; i++) if (y <= T[i][0]) { const p = T[i - 1], q = T[i]; return p[1] + (q[1] - p[1]) * (y - p[0]) / (q[0] - p[0]); } return T[T.length - 1][1]; }
function avLathe(ys, rf, seg, zs, x0) { const g = new THREE.LatheGeometry(ys.map(y => new THREE.Vector2(Math.max(0, rf(y)), y)), seg); if (zs !== 1) g.scale(1, 1, zs); if (x0) g.translate(x0, 0, 0); return g; }
const avRange = (a, b, step) => { const o = []; for (let y = a; y < b - 1e-6; y += step) o.push(+y.toFixed(4)); o.push(b); return o; };
const avUniq = ys => [...new Set(ys.map(y => +y.toFixed(4)))].sort((a, b) => a - b);
const AV_SPH = {}; function avSphere(w, h) { const k = w + 'x' + h; return AV_SPH[k] || (AV_SPH[k] = new THREE.SphereGeometry(1, w, h)); }
const avCol = (s, k) => { const c = new THREE.Color(s); return k ? c.multiplyScalar(k) : c; };
const avMix = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), t);

/* ---------- skeleton (bind pose = standing, arms hanging) ---------- */
const AV_BONES = ['root', 'hips', 'chest', 'neck', 'head', 'shL', 'elL', 'haL', 'shR', 'elR', 'haR', 'thL', 'knL', 'ftL', 'thR', 'knR', 'ftR'];
const AVBI = {}; AV_BONES.forEach((n, i) => { AVBI[n] = i; });
const AV_PAR = { hips: 'root', chest: 'hips', neck: 'chest', head: 'neck', shL: 'chest', elL: 'shL', haL: 'elL', shR: 'chest', elR: 'shR', haR: 'elR', thL: 'hips', knL: 'thL', ftL: 'knL', thR: 'hips', knR: 'thR', ftR: 'knR' };
const AV_Y = { sh: 1.255, el: 0.985, ha: 0.745, th: 0.84, kn: 0.47, ft: 0.1 };
/* the body is modelled in these (long-legged) units, then the legs are squashed between ankle and hip at build time
   for short cartoon legs; everything above the hips moves down by dy */
const AV_LEG = { a: 0.13, b: 0.86, s: 0.84 }; AV_LEG.dy = (AV_LEG.b - AV_LEG.a) * (1 - AV_LEG.s);
const avLegY = y => y <= AV_LEG.a ? y : y < AV_LEG.b ? AV_LEG.a + (y - AV_LEG.a) * AV_LEG.s : y - AV_LEG.dy;
function avDims(L) { const b = L.build; return { shX: b === 'slim' ? 0.196 : b === 'big' ? 0.228 : 0.212, hipX: b === 'slim' ? 0.096 : b === 'big' ? 0.112 : 0.104, zs: b === 'big' ? 0.82 : b === 'slim' ? 0.72 : 0.75 }; }
function avBonePos(n, D) {
  const s = n.endsWith('L') ? -1 : 1, k = n.slice(0, 2), dy = AV_LEG.dy;
  if (n === 'root') return [0, 0, 0]; if (n === 'hips') return [0, 0.86 - dy, 0]; if (n === 'chest') return [0, 0.98 - dy, 0]; if (n === 'neck') return [0, 1.29 - dy, 0]; if (n === 'head') return [0, 1.37 - dy, 0];
  if (k === 'sh' || k === 'el' || k === 'ha') return [s * D.shX, AV_Y[k] - dy, 0];
  return [s * D.hipX, avLegY(AV_Y[k]), 0];
}

/* ---------- body ---------- */
const AV_TORSO = [[0.81, 0], [0.812, 0.07], [0.821, 0.112], [0.838, 0.138], [0.855, 0.148], [0.87, 0.152], [0.905, 0.152], [0.96, 0.149], [1.03, 0.151], [1.1, 0.158], [1.17, 0.164], [1.215, 0.163], [1.25, 0.152], [1.28, 0.128], [1.3, 0.098], [1.312, 0.07], [1.316, 0]];
function avTorsoR(y, b) {
  let r = avTable(AV_TORSO, y) * 1.11;
  if (b === 'slim') r *= 0.9; else if (b === 'big') r = r * 1.05 + 0.042 * Math.exp(-Math.pow((y - 1.0) / 0.11, 2)) * Math.min(1, r / 0.1);
  return r;
}
const AV_TORSO_Y = avUniq(AV_TORSO.map(p => p[0]).concat(avRange(0.92, 1.14, 0.045)));
/* geometry caches shared by avatars with the same look; unused entries are freed once the cache grows */
function avUse(map, key, make) { let e = map.get(key); if (!e) { e = { g: make(), n: 0 }; map.set(key, e); } e.n++; return e.g; }
function avFree(map, key) { const e = map.get(key); if (e) e.n--; if (map.size > 12) for (const [k, v] of map) if (v.n <= 0) { if (v.g) v.g.dispose(); map.delete(k); } }
const AV_BODY = new Map(), avBodyKey = L => packLook(L) + (L.boss ? '|boss' : '');
function avBodyGeo(L) {
  const b = avGbNew(true), D = avDims(L), B = L.build, zs = D.zs, boss = L.boss;
  const shirt = avCol(L.shirt), skin = avCol(L.skin), pants = avCol(L.pants), shoes = avCol(L.shoes), belt = avCol('#2a2220');
  const jacket = boss ? avCol(L.pants, 1.05) : null, top = boss ? jacket : shirt;
  const tR = y => avTorsoR(y, B), tZ = y => tR(y) * zs;
  const wTorso = (x, y) => y > 1.285 ? [AVBI.chest, AVBI.neck, avSS(1.29, 1.36, y)] : [AVBI.hips, AVBI.chest, avSS(0.89, 1.12, y)];
  // torso: trousers, belt, shirt
  const seat = avLathe(AV_TORSO_Y.filter(y => y <= 0.865), tR, 16, zs), sp = seat.attributes.position;   // trousers seat: flatter front/back towards the crotch
  for (let k = 0; k < sp.count; k++) sp.setZ(k, sp.getZ(k) * (0.8 + 0.2 * avSS(0.81, 0.86, sp.getY(k))));
  const pc = new THREE.Color();
  avGbAdd(b, seat, null, (x, y) => pc.copy(pants).multiplyScalar(0.72 + 0.28 * avSS(0.81, 0.865, y)), wTorso);
  avGbAdd(b, avLathe([0.862, 0.866, 0.902, 0.906], y => tR(y) + (y > 0.864 && y < 0.904 ? 0.008 : 0.001), 16, zs), null, belt, wTorso);
  avGbAdd(b, avLathe(AV_TORSO_Y.filter(y => y >= 0.905), tR, 16, zs), null, top, wTorso);
  avGbAdd(b, avSphere(8, 6), avM(0, 0.885, -tZ(0.885) - 0.008, 0.024, 0.018, 0.008), avCol('#d4b25a'), [AVBI.hips]);   // buckle
  // neck
  avGbAdd(b, avLathe([1.25, 1.3, 1.35, 1.4, 1.46], y => 0.066 - (y - 1.25) * 0.03, 12, 0.95), null, skin, (x, y) => y < 1.37 ? [AVBI.chest, AVBI.neck, avSS(1.29, 1.35, y)] : [AVBI.neck, AVBI.head, avSS(1.38, 1.43, y)]);
  // a strip of quads that hugs the front of the torso (placket, tie, shirt V)
  const front = (y0, y1, wf, off, col, n) => {
    const g = new THREE.PlaneGeometry(1, 1, 1, n || 6), p = g.attributes.position;
    for (let k = 0; k < p.count; k++) { const u = p.getX(k), v = p.getY(k) + 0.5, y = y0 + (y1 - y0) * v, w = wf(v); p.setXYZ(k, -u * w, y, -tZ(y) - off); }
    g.computeVertexNormals(); avGbAdd(b, g, null, col, [AVBI.chest]);
  };
  if (boss) {
    front(1.1, 1.316, v => 0.15 * Math.pow(v, 0.9), 0.002, avCol('#f4f2ec'));                                        // shirt V
    front(1.0, 1.27, v => v < 0.12 ? v / 0.12 * 0.05 : 0.05 - (v - 0.12) * 0.03, 0.006, avCol('#c62f2a'), 8);         // tie
    avGbAdd(b, avSphere(8, 6), avM(0, 1.275, -tZ(1.275) - 0.012, 0.022, 0.02, 0.014), avCol('#a52520'), [AVBI.chest]);    // knot
    [-1, 1].forEach(s => avGbAdd(b, new THREE.BoxGeometry(1, 1, 1), avM(s * 0.07, 1.21, -tZ(1.21) - 0.004, 0.035, 0.16, 0.012, -0.25, 0, s * 0.42), avCol(L.pants, 0.78), [AVBI.chest]));  // lapels
  } else {
    front(1.18, 1.3, () => 0.028, 0.003, avCol(L.shirt, 0.84));                                                       // placket
    [1.268, 1.222].forEach(y => avGbAdd(b, avSphere(6, 4), avM(0, y, -tZ(y) - 0.007, 0.007, 0.007, 0.004), avCol('#f6f3ea'), [AVBI.chest]));
    [-1, 1].forEach(s => avGbAdd(b, new THREE.BoxGeometry(1, 1, 1), avM(s * 0.036, 1.292, -tZ(1.29) + 0.002, 0.052, 0.034, 0.01, -0.95, 0, s * 0.5), avCol(L.shirt, 1.06), [AVBI.chest]));  // collar flaps
    avGbAdd(b, avLathe([1.28, 1.293, 1.315, 1.326, 1.33], y => y < 1.29 ? 0.07 : y < 1.31 ? 0.078 : y < 1.32 ? 0.086 : 0.083, 14, 0.9), null, avCol(L.shirt, 1.04), [AVBI.chest]);   // collar ring
    if (L.badge) {
      const rx = tR(1.17), rz = tZ(1.17), bx = -0.078 * (rx / 0.164), bz = -Math.sqrt(Math.max(0, 1 - Math.pow(bx / rx, 2))) * rz - 0.004, ang = Math.atan2(-bx / (rx * rx), -bz / (rz * rz));
      avGbAdd(b, new THREE.BoxGeometry(1, 1, 1), avM(bx, 1.17, bz, 0.07, 0.042, 0.008, 0, ang, 0), avCol('#fbfaf5'), [AVBI.chest]);
      avGbAdd(b, new THREE.BoxGeometry(1, 1, 1), avM(bx, 1.186, bz - 0.0012, 0.07, 0.011, 0.008, 0, ang, 0), avCol('#d6342c'), [AVBI.chest]);
      avGbAdd(b, new THREE.BoxGeometry(1, 1, 1), avM(bx, 1.166, bz - 0.002, 0.044, 0.007, 0.006, 0, ang, 0), avCol('#4a5068'), [AVBI.chest]);
      avGbAdd(b, new THREE.BoxGeometry(1, 1, 1), avM(bx, 1.156, bz - 0.002, 0.03, 0.005, 0.006, 0, ang, 0), avCol('#8a90a6'), [AVBI.chest]);
    }
  }
  // arms: sleeve + noodle arm + mitten hand
  const armT = [[0.733, 0], [0.736, 0.022], [0.745, 0.031], [0.79, 0.034], [0.87, 0.037], [0.99, 0.041], [1.1, 0.045], [1.17, 0.046], [1.19, 0.032], [1.198, 0]];
  const armY = avUniq(armT.map(p => p[0]).concat(avRange(0.92, 1.06, 0.035)));
  [-1, 1].forEach(s => {
    const x0 = s * D.shX, sh = s < 0 ? AVBI.shL : AVBI.shR, el = s < 0 ? AVBI.elL : AVBI.elR, ha = s < 0 ? AVBI.haL : AVBI.haR;
    const wArm = (x, y) => y > 0.87 ? [sh, el, 1 - avSS(0.93, 1.05, y)] : [el, ha, 1 - avSS(0.745, 0.785, y)];
    if (boss) {
      const sl = [[0.768, 0.0], [0.77, 0.046], [0.776, 0.052], [0.85, 0.054], [0.99, 0.058], [1.1, 0.064], [1.2, 0.069], [1.26, 0.067], [1.29, 0.057], [1.312, 0.038], [1.322, 0]];
      avGbAdd(b, avLathe(avUniq(sl.map(p => p[0]).concat(avRange(0.91, 1.07, 0.03))), y => avTable(sl, y), 12, 1, x0), null, jacket, wArm);
      avGbAdd(b, avLathe([0.75, 0.752, 0.772, 0.774], y => y > 0.751 && y < 0.773 ? 0.044 : 0.036, 12, 1, x0), null, avCol('#f4f2ec'), wArm);
      avGbAdd(b, avLathe(armY.filter(y => y < 0.8), y => avTable(armT, y), 9, 1, x0), null, skin, wArm);
    } else {
      const sl = [[1.116, 0.0], [1.118, 0.05], [1.122, 0.066], [1.13, 0.069], [1.17, 0.07], [1.22, 0.07], [1.26, 0.066], [1.29, 0.056], [1.312, 0.038], [1.322, 0]];
      avGbAdd(b, avLathe(sl.map(p => p[0]), y => avTable(sl, y), 12, 1, x0), null, shirt, [sh]);
      avGbAdd(b, avLathe(armY, y => avTable(armT, y), 9, 1, x0), null, skin, wArm);
    }
    avGbAdd(b, avSphere(9, 6), avM(x0 + s * 0.002, 0.69, -0.004, 0.034, 0.062, 0.048), skin, [ha]);
    avGbAdd(b, avSphere(7, 5), avM(x0 - s * 0.017, 0.712, -0.036, 0.017, 0.031, 0.018, 0.35, 0, s * 0.25), skin, [ha]);
  });
  // legs: trousers + chunky shoes
  const legT = [[0.098, 0], [0.1, 0.06], [0.104, 0.075], [0.13, 0.072], [0.25, 0.069], [0.4, 0.074], [0.47, 0.077], [0.56, 0.08], [0.72, 0.087], [0.85, 0.092], [0.93, 0.088], [0.95, 0.06], [0.955, 0]];
  const legY = avUniq(legT.map(p => p[0]).concat([0.36, 0.435, 0.515]));
  const sole = avCol(L.shoes === '#ebe6da' ? '#b9b2a3' : '#f1ece1'), shoeTop = avCol(L.shoes);
  b.leg = true;
  [-1, 1].forEach(s => {
    const x0 = s * D.hipX, th = s < 0 ? AVBI.thL : AVBI.thR, kn = s < 0 ? AVBI.knL : AVBI.knR, ft = s < 0 ? AVBI.ftL : AVBI.ftR;
    avGbAdd(b, avLathe(legY, y => avTable(legT, y) * (B === 'slim' ? 1.08 : B === 'big' ? 1.24 : 1.16), 10, 1, x0), null, pants, (x, y) => [th, kn, 1 - avSS(0.4, 0.55, y)]);
    const sg = avSphere(12, 7).clone(); sg.applyMatrix4(avM(x0, 0.052, -0.038, 0.074, 0.072, 0.138));
    const p = sg.attributes.position, nn = sg.attributes.normal;
    for (let k = 0; k < p.count; k++) if (p.getY(k) < 0.004) { p.setY(k, 0.004); nn.setXYZ(k, 0, -1, 0); }
    avGbAdd(b, sg, null, (x, y) => y < 0.024 ? sole : shoeTop, [ft]);
  });
  b.leg = false;
  const g = avGbBuild(b); g.boundingSphere.center.set(0, 0.95, 0); g.boundingSphere.radius = 1.3;
  return g;
}

/* ---------- head: egg with nose and ears (shared), face decal (shared), accessories (per look) ---------- */
const AV_HD = { rx: 0.18, ry: 0.215, rz: 0.172, cy: 0.19, k: 1.27 };   // head-local units, scaled by k
const avEgg = th => Math.pow(Math.max(0, Math.sin(th)), 0.82) * (1 - 0.075 * Math.cos(th));
function avHeadPt(th, ph, off, o) { const k = avEgg(th), s = 1 + off / 0.19; o[0] = AV_HD.rx * k * Math.sin(ph) * s; o[1] = AV_HD.ry * Math.cos(th) * s; o[2] = AV_HD.rz * k * Math.cos(ph) * s; return o; }
const AV_FACE_T0 = 0.6, AV_FACE_T1 = 2.9, AV_FACE_W = 2.6;
let AV_HEAD = null, AV_FACEG = null;
function avHeadGeos() {
  if (AV_HEAD) return;
  const pts = []; for (let i = 0; i <= 18; i++) { const th = Math.PI - i / 18 * Math.PI; pts.push(new THREE.Vector2(AV_HD.rx * avEgg(th), AV_HD.ry * Math.cos(th))); }
  const egg = new THREE.LatheGeometry(pts, 26); egg.scale(1, 1, AV_HD.rz / AV_HD.rx);
  const b = avGbNew(false), w = new THREE.Color(1, 1, 1), P = [0, 0, 0];
  avGbAdd(b, egg, null, w);
  avHeadPt(1.74, Math.PI, -0.012, P); avGbAdd(b, avSphere(10, 7), avM(P[0], P[1], P[2], 0.034, 0.034, 0.034), w);              // nose
  [-1, 1].forEach(s => { avHeadPt(1.6, Math.PI / 2 * s, -0.006, P); avGbAdd(b, avSphere(8, 6), avM(P[0], P[1], P[2] + 0.01, 0.022, 0.047, 0.034, 0, 0, s * 0.12), w); });   // ears
  AV_HEAD = avGbBuild(b);
  const fp = []; for (let i = 0; i <= 16; i++) { const th = AV_FACE_T1 - i / 16 * (AV_FACE_T1 - AV_FACE_T0); fp.push(new THREE.Vector2(AV_HD.rx * avEgg(th) * 1.012, AV_HD.ry * Math.cos(th) * 1.012)); }
  AV_FACEG = new THREE.LatheGeometry(fp, 18, Math.PI - AV_FACE_W / 2, AV_FACE_W); AV_FACEG.scale(1, 1, AV_HD.rz / AV_HD.rx);
}
/* a shell over the head: φ range, θ range per φ, thickness that tapers to the head surface */
function avShell(o) {
  const nu = o.nu, nv = o.nv, pos = [], idx = [], P = [0, 0, 0];
  for (let i = 0; i <= nu; i++) {
    const u = i / nu, ph = o.p0 + (o.p1 - o.p0) * u, d = Math.abs(Math.atan2(Math.sin(ph - Math.PI), Math.cos(ph - Math.PI))) / Math.PI;
    const a = o.t0(ph, d), bb = o.t1(ph, d);
    for (let j = 0; j <= nv; j++) {
      const v = j / nv, th = a + (bb - a) * v, off = o.th(u, v, ph, d, th) - 0.004;
      if (o.hang && th > Math.PI / 2) { avHeadPt(Math.PI / 2, ph, off, P); P[1] = -(th - Math.PI / 2) * o.hang; } else avHeadPt(th, ph, off, P);
      pos.push(P[0], P[1], P[2]);
    }
  }
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) { const A = i * (nv + 1) + j, B = A + nv + 1; idx.push(A, A + 1, B, A + 1, B + 1, B); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  if (o.closed) { const n = g.attributes.normal; for (let j = 0; j <= nv; j++) { const a = j, c = nu * (nv + 1) + j; _avN.set(n.getX(a) + n.getX(c), n.getY(a) + n.getY(c), n.getZ(a) + n.getZ(c)).normalize(); n.setXYZ(a, _avN.x, _avN.y, _avN.z); n.setXYZ(c, _avN.x, _avN.y, _avN.z); } }
  return g;
}
const avEdge = (f, s, k) => (ph, d) => d < 0.5 ? f + (s - f) * avSS(0, 0.5, d) : s + (k - s) * avSS(0.5, 1, d);
function avCap(thk, f, s, k, extra, hang) {
  return avShell({ p0: 0, p1: Math.PI * 2, nu: 36, nv: 9, closed: true, t0: () => 0, t1: avEdge(f, s, k), hang,
    th: (u, v, ph, d, th) => (thk + (extra ? extra(ph, d, v, th) : 0)) * (1 - avSS(hang ? 0.9 : 0.8, 1, v)) + 0.001 });
}
function avBumps(b, col, n, r0, r1, off, f, s, k, seed) {
  const r = avRng(seed), edge = avEdge(f, s, k), P = [0, 0, 0];
  for (let i = 0; i < n; i++) {
    const ph = r() * Math.PI * 2, d = Math.abs(Math.atan2(Math.sin(ph - Math.PI), Math.cos(ph - Math.PI))) / Math.PI, th = Math.acos(1 - r() * (1 - Math.cos(edge(ph, d) - 0.12)));
    const rr = r0 + r() * (r1 - r0); avHeadPt(th, ph, off + rr * 0.15, P);
    avGbAdd(b, avSphere(7, 5), avM(P[0], P[1], P[2], rr, rr * 0.9, rr), col);
  }
}
/* a tube along a curve with radius rf(u), u = 0..1 (ponytails) */
function avTaper(pts, rf, n, seg) {
  const cv = new THREE.CatmullRomCurve3(pts), fr = cv.computeFrenetFrames(n, false), pos = [], idx = [], p = new THREE.Vector3();
  for (let i = 0; i <= n; i++) {
    const u = i / n, r = rf(u), N = fr.normals[i], B = fr.binormals[i]; cv.getPointAt(u, p);
    for (let j = 0; j <= seg; j++) { const a = j / seg * Math.PI * 2, c = Math.cos(a) * r, s = Math.sin(a) * r; pos.push(p.x + c * N.x + s * B.x, p.y + c * N.y + s * B.y, p.z + c * N.z + s * B.z); }
  }
  for (let i = 0; i < n; i++) for (let j = 0; j < seg; j++) { const A = i * (seg + 1) + j, C = A + seg + 1; idx.push(A, C, A + 1, A + 1, C, C + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
/* hair colour with a soft top highlight and darker ends */
function avHairCol(hex) {
  const base = new THREE.Color(hex), c = new THREE.Color(), w = new THREE.Color(1, 0.96, 0.9);
  return (x, y) => { const t = avSS(-0.14, 0.24, y); return c.copy(base).multiplyScalar(0.78 + 0.3 * t).lerp(w, 0.05 * t); };
}
const AV_ACC = new Map(), avAccKey = (L, headset) => [L.hair, L.hairColor, L.facial, L.glasses, L.skin, headset ? 1 : 0].join('|');
function avAccGeo(L, headset) {
  const b = avGbNew(false), hc = avHairCol(L.hairColor), P = [0, 0, 0], PI = Math.PI, h = L.hair;
  // hair
  if (h === 'buzz') avGbAdd(b, avCap(0.007, 0.72, 1.48, 2.2), null, avMix(L.hairColor, L.skin, 0.35));
  else if (h === 'short') avGbAdd(b, avCap(0.026, 0.62, 1.45, 2.2, (ph, d, v) => 0.014 * (1 - v)), null, hc);
  else if (h === 'sidepart') avGbAdd(b, avCap(0.026, 0.66, 1.45, 2.2, (ph, d, v) => 0.012 * (1 - v) + 0.034 * Math.exp(-Math.pow((d - 0.2) / 0.16, 2)) * Math.exp(-Math.pow((v - 0.55) / 0.3, 2)) * (Math.sin(ph) > 0 ? 1 : 0.35)), null, hc);
  else if (h === 'quiff') avGbAdd(b, avCap(0.024, 0.6, 1.45, 2.2, (ph, d, v) => 0.062 * Math.exp(-Math.pow(d / 0.3, 2)) * Math.exp(-Math.pow((v - 0.6) / 0.3, 2)) + 0.012 * (1 - v)), null, hc);
  else if (h === 'curly') { avGbAdd(b, avCap(0.03, 0.6, 1.5, 2.25), null, hc); avBumps(b, hc, 28, 0.036, 0.052, 0.03, 0.62, 1.48, 2.1, 11); }
  else if (h === 'afro') { avGbAdd(b, avCap(0.1, 0.64, 1.58, 2.05, (ph, d, v) => 0.03 * (1 - v)), null, hc); avBumps(b, hc, 32, 0.055, 0.078, 0.1, 0.7, 1.5, 1.95, 23); }
  else if (h === 'long') avGbAdd(b, avCap(0.028, 0.6, 2.45, 3.05, (ph, d, v, th) => th > 1.5 ? 0.016 : 0.01 * (1 - v), 0.26), null, hc);
  else if (h === 'bun') { avGbAdd(b, avCap(0.018, 0.6, 1.45, 2.15), null, hc); avHeadPt(0.55, 0, 0.05, P); avGbAdd(b, avSphere(10, 8), avM(P[0], P[1] + 0.02, P[2], 0.078), hc); }
  else if (h === 'ponytail') {
    avGbAdd(b, avCap(0.02, 0.6, 1.45, 2.15), null, hc); avHeadPt(1.15, 0, 0.02, P);
    avGbAdd(b, avSphere(10, 8), avM(P[0], P[1], P[2] + 0.012, 0.036, 0.036, 0.03), avCol('#d6342c'));
    const V = (x, y, z) => new THREE.Vector3(P[0] + x, P[1] + y, P[2] + z);
    avGbAdd(b, avTaper([V(0, 0.005, 0.01), V(0, -0.01, 0.075), V(0, -0.12, 0.105), V(0, -0.25, 0.085), V(0, -0.33, 0.05)], u => (0.034 + 0.034 * Math.sin(Math.min(1, u * 1.6) * PI * 0.5)) * (1 - avSS(0.45, 1, u) * 0.85), 14, 10), null, hc);
  } else if (h === 'mohawk') {
    avGbAdd(b, avCap(0.006, 0.7, 1.5, 2.2), null, avMix(L.hairColor, L.skin, 0.8).multiplyScalar(0.9));
    avGbAdd(b, avCap(0.0, 0.62, 1.5, 1.9, (ph, d, v) => 0.15 * Math.exp(-Math.pow(Math.sin(ph) / 0.15, 2)) * (1 - avSS(0.7, 1, v))), null, hc);
  } else if (h === 'fringe') {
    avGbAdd(b, avShell({ p0: 0, p1: PI * 2, nu: 36, nv: 8, closed: true, t0: () => 1.05, t1: avEdge(1.25, 1.75, 2.0),
      th: (u, v, ph, d) => 0.032 * avSS(0.27, 0.42, d) * Math.pow(Math.sin(v * PI), 0.6) + 0.001 }), null, hc);
  }
  // facial hair
  const f = L.facial;
  const stache = (w, t0, t1, thk, droop) => avGbAdd(b, avShell({ p0: PI - w, p1: PI + w, nu: 12, nv: 5, t0: (ph, d) => t0 + droop * d * d, t1: (ph, d) => t1 + droop * d * d,
    th: (u, v) => thk * Math.pow(Math.sin(u * PI), 0.5) * Math.pow(Math.sin(v * PI), 0.6) + 0.001 }), null, hc);
  if (f === 'mustache') stache(0.5, 1.86, 1.99, 0.026, 3.5);
  else if (f === 'bigmustache') stache(0.7, 1.83, 2.07, 0.042, 4.5);
  else if (f === 'goatee') { stache(0.42, 1.87, 1.97, 0.02, 3); avGbAdd(b, avShell({ p0: PI - 0.38, p1: PI + 0.38, nu: 12, nv: 8, t0: () => 2.22, t1: () => 2.85, th: (u, v) => 0.028 * Math.pow(Math.sin(u * PI), 0.5) * Math.pow(Math.sin(v * PI), 0.4) + 0.001 }), null, hc); }
  else if (f === 'beard') {
    avGbAdd(b, avShell({ p0: PI / 2 - 0.12, p1: PI * 1.5 + 0.12, nu: 20, nv: 8, t0: (ph, d) => 2.2 - 0.62 * avSS(0.1, 0.5, d), t1: (ph, d) => 2.95 - 0.25 * avSS(0.3, 0.5, d),
      th: (u, v, ph, d) => 0.034 * avSS(0, 0.08, u) * avSS(1, 0.92, u) * avSS(0, 0.25, v) * (1 - avSS(0.85, 1, v)) + 0.001 }), null, hc);
    stache(0.48, 1.86, 1.99, 0.024, 3.5);
  }
  // glasses
  if (L.glasses !== 'none') {
    const fr = avCol('#1c1c22'), ey = AV_HD.ry * Math.cos(1.42), ez = -AV_HD.rz * avEgg(1.42) - 0.022;
    [-1, 1].forEach(s => {
      const x = s * 0.066;
      if (L.glasses === 'square') avGbAdd(b, new THREE.TorusGeometry(0.05, 0.0065, 5, 4).rotateZ(PI / 4), avM(x, ey, ez, 1.02, 0.74, 1), fr);
      else avGbAdd(b, new THREE.TorusGeometry(0.043, 0.0062, 5, 16), avM(x, ey, ez, 1, 0.9, 1), fr);
      if (L.glasses === 'shades') avGbAdd(b, new THREE.CylinderGeometry(0.045, 0.045, 0.006, 20), avM(x, ey, ez + 0.002, 1, 1, 0.88, PI / 2, 0, 0), avCol('#10131b'));
      const tx = s * 0.17, tz = -0.03, mx = (s * 0.112 + tx) / 2, mz = (ez + tz) / 2, len = Math.hypot(tx - s * 0.112, tz - ez);
      avGbAdd(b, new THREE.BoxGeometry(0.008, 0.008, 1), avM(mx, ey + 0.005, mz, 1, 1, len, 0, Math.atan2(tx - s * 0.112, tz - ez), 0), fr);
    });
    avGbAdd(b, new THREE.BoxGeometry(0.04, 0.008, 0.008), avM(0, ey + 0.012, ez - 0.004, 1), fr);
  }
  // headset: band, ear cups, mic boom
  if (headset) {
    const dk = avCol('#2c2f38'), cup = avCol('#3c404b'), pad = avCol('#16171b');
    const big = h === 'afro' ? 0.08 : h === 'quiff' || h === 'mohawk' ? 0.02 : 0, bx = 0.212 + big * 0.3, by = 0.29 + big;
    const arc = []; for (let i = 0; i <= 16; i++) { const a = i / 16 * PI; arc.push(new THREE.Vector3(Math.cos(a) * bx, Math.sin(a) * by - 0.025, 0.004)); }
    avGbAdd(b, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(arc), 16, 0.011, 5, false), null, dk);
    [-1, 1].forEach(s => {
      avGbAdd(b, new THREE.CylinderGeometry(0.058, 0.058, 0.04, 14), avM(s * 0.212, -0.03, 0.004, 1, 1, 1, 0, 0, PI / 2), cup);
      avGbAdd(b, new THREE.CylinderGeometry(0.05, 0.054, 0.02, 14), avM(s * 0.186, -0.03, 0.004, 1, 1, 1, 0, 0, PI / 2), pad);
      avGbAdd(b, new THREE.CylinderGeometry(0.03, 0.03, 0.012, 10), avM(s * 0.236, -0.03, 0.004, 1, 1, 1, 0, 0, PI / 2), dk);
    });
    avHeadPt(2.05, PI - 0.38, 0.035, P);
    const boom = new THREE.CatmullRomCurve3([new THREE.Vector3(0.226, -0.055, -0.012), new THREE.Vector3(0.212, -0.105, -0.085), new THREE.Vector3(0.15, -0.125, -0.16), new THREE.Vector3(P[0] + 0.01, P[1] - 0.01, P[2] - 0.012)]);
    avGbAdd(b, new THREE.TubeGeometry(boom, 10, 0.0065, 4, false), null, dk);
    avGbAdd(b, avSphere(7, 5), avM(P[0] + 0.006, P[1] - 0.01, P[2] - 0.014, 0.022, 0.016, 0.016, 0, -0.5, 0), avCol('#111216'));
  }
  return b.p.length ? avGbBuild(b) : null;
}

/* ---------- face (per avatar canvas, redrawn only when the expression changes) ---------- */
const AV_FACES = {
  neutral: ['open', 'neutral', 'neutral'], happy: ['open', 'happy', 'smile', 1], angry: ['angry', 'angry', 'angry'], sad: ['sad', 'sad', 'frown'],
  surprised: ['wide', 'up', 'o'], grumpy: ['angry', 'angry', 'grumpy'], dizzy: ['dizzy', 'sad', 'wavy'], strain: ['squeeze', 'angry', 'teeth'],
  joy: ['joy', 'happy', 'smile', 1], ouch: ['squeeze', 'sad', 'o'], facepalm: ['closed', 'sad', 'frown'], grin: ['open', 'angry', 'grin'], sleepy: ['closed', 'neutral', 'neutral']
};
class AvFace {
  constructor() {
    this.c = document.createElement('canvas'); this.c.width = this.c.height = 256; this.g = this.c.getContext('2d', { willReadFrequently: true });   // CPU canvas: no GPU readback on upload
    this.tex = new THREE.CanvasTexture(this.c); this.tex.generateMipmaps = false; this.tex.minFilter = THREE.LinearFilter;
    this.mat = avShade(new THREE.MeshLambertMaterial({ map: this.tex, transparent: true, polygonOffset: true, polygonOffsetFactor: -2, depthWrite: false }));
    this.key = ''; this.stub = null;
  }
  setLook(L) {
    this.L = L; this.key = '';
    const hc = new THREE.Color(L.hairColor), sk = new THREE.Color(L.skin), bald = L.hair === 'bald' || L.hair === 'fringe' && L.hairColor === '#ece4cf';
    const brow = (L.hair === 'bald' ? sk.clone().multiplyScalar(0.42) : hc.clone().lerp(new THREE.Color(0x1a120c), hc.getHSL({}).l > 0.6 ? 0.25 : 0.35));
    this.brow = '#' + brow.getHexString(); this.bushy = L.boss || L.facial === 'bigmustache' || bald;
    this.dark = sk.getHSL({}).l < 0.33; this.stub = null;
    if (L.facial === 'stubble' || L.facial === 'beard' || L.facial === 'goatee') {
      const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d', { willReadFrequently: true }), r = avRng(hashStr(L.skin + L.hairColor));
      g.fillStyle = '#' + hc.clone().lerp(sk, 0.35).getHexString();
      for (let i = 0; i < 1300; i++) { const a = r() * Math.PI * 2, rr = Math.sqrt(r()), x = 128 + Math.cos(a) * rr * 74, y = 196 + Math.sin(a) * rr * 52; if (y < 150 || Math.abs(x - 128) < 26 && y < 178) continue; g.globalAlpha = 0.18 + r() * 0.3; g.fillRect(x, y, 2.2, 2.2); }
      for (let i = 0; i < 260; i++) { const x = 104 + r() * 48, y = 145 + r() * 9; g.globalAlpha = 0.15 + r() * 0.25; g.fillRect(x, y, 2, 2); }
      this.stub = c;
    }
  }
  draw(eye, brow, mouth, look, blush) {
    const key = eye + brow + mouth + look + blush; if (key === this.key) return; this.key = key;
    const g = this.g, ink = '#1b120d', L = this.L; g.clearRect(0, 0, 256, 256); g.lineCap = g.lineJoin = 'round';
    if (this.stub) g.drawImage(this.stub, 0, 0);
    if (blush) { g.fillStyle = 'rgba(255,90,110,.28)'; [76, 180].forEach(x => { g.beginPath(); g.ellipse(x, 128, 17, 10, 0, 0, 7); g.fill(); }); }
    const EY = 91;
    [-1, 1].forEach(s => {   // s = -1: eye on the viewer's left
      const ex = 128 + s * 35;
      g.save();
      if (eye === 'closed' || eye === 'joy' || eye === 'squeeze') {
        g.strokeStyle = ink; g.lineWidth = 5; g.beginPath();
        if (eye === 'closed') { g.moveTo(ex - 13, EY + 1); g.quadraticCurveTo(ex, EY + 9, ex + 13, EY + 1); }
        else if (eye === 'joy') { g.moveTo(ex - 13, EY + 5); g.quadraticCurveTo(ex, EY - 11, ex + 13, EY + 5); }
        else { g.moveTo(ex + s * 12, EY - 9); g.lineTo(ex - s * 9, EY); g.lineTo(ex + s * 12, EY + 9); }
        g.stroke();
      } else if (eye === 'dizzy') {
        g.fillStyle = '#fff'; g.beginPath(); g.ellipse(ex, EY, 15, 17, 0, 0, 7); g.fill(); g.strokeStyle = ink; g.lineWidth = 3.4; g.stroke();
        g.lineWidth = 2.6; g.beginPath(); for (let a = 0; a < 15; a += 0.3) { const r = a * 0.85; g.lineTo(ex + Math.cos(a * s) * r, EY + Math.sin(a * s) * r); } g.stroke();
      } else {
        const wide = eye === 'wide', rx = wide ? 17 : 15, ry = wide ? 21 : 18.5;
        g.beginPath();
        if (eye === 'angry') { g.moveTo(ex - 22, EY - 13 + s * 7); g.lineTo(ex + 22, EY - 13 - s * 7); g.lineTo(ex + 22, EY + 30); g.lineTo(ex - 22, EY + 30); g.closePath(); g.clip(); }
        else if (eye === 'sad') { g.moveTo(ex - 22, EY - 11 - s * 6); g.lineTo(ex + 22, EY - 11 + s * 6); g.lineTo(ex + 22, EY + 30); g.lineTo(ex - 22, EY + 30); g.closePath(); g.clip(); }
        g.beginPath(); g.ellipse(ex, EY, rx, ry, 0, 0, 7); g.fillStyle = '#fffdf8'; g.fill(); g.strokeStyle = ink; g.lineWidth = 3.6; g.stroke();
        const px = ex + look * 5 - s * 1.5, py = EY + (eye === 'sad' ? 4 : 2), pr = wide ? 7 : 9;
        g.fillStyle = '#21160f'; g.beginPath(); g.arc(px, py, pr, 0, 7); g.fill();
        g.fillStyle = '#fff'; g.beginPath(); g.arc(px + 2.8, py - 3.5, pr * 0.36, 0, 7); g.fill();
        g.restore(); g.save();
        if (eye === 'angry' || eye === 'sad') { g.strokeStyle = ink; g.lineWidth = 4.5; g.beginPath(); const k = eye === 'angry' ? 1 : -1; g.moveTo(ex - 16, EY - 13 + s * 7 * k + (k < 0 ? 2 : 0)); g.lineTo(ex + 16, EY - 13 - s * 7 * k + (k < 0 ? 2 : 0)); g.stroke(); }
      }
      g.restore();
      // brows
      const by = 60; g.strokeStyle = this.brow; g.lineWidth = this.bushy ? 12 : 9; g.beginPath();
      const o = s;   // points to the outer end
      if (brow === 'angry') { g.moveTo(ex + o * 17, by - 5); g.quadraticCurveTo(ex, by - 2, ex - o * 15, by + 9); }
      else if (brow === 'sad') { g.moveTo(ex + o * 17, by + 6); g.quadraticCurveTo(ex, by - 3, ex - o * 14, by - 6); }
      else if (brow === 'up') { g.moveTo(ex + o * 17, by - 4); g.quadraticCurveTo(ex, by - 17, ex - o * 15, by - 7); }
      else if (brow === 'happy') { g.moveTo(ex + o * 17, by - 1); g.quadraticCurveTo(ex, by - 12, ex - o * 15, by - 3); }
      else { g.moveTo(ex + o * 17, by + 2); g.quadraticCurveTo(ex, by - 7, ex - o * 15, by + 1); }
      g.stroke();
    });
    // mouth
    const MY = 163, lip = '#5e1d1c'; g.strokeStyle = ink; g.lineWidth = 4.5;
    const fillMouth = (path, teeth, tongue) => {
      g.save(); path(); g.fillStyle = lip; g.fill(); g.clip();
      if (teeth) { g.fillStyle = '#fff'; g.fillRect(90, MY - 30, 76, teeth); }
      if (tongue) { g.fillStyle = '#e0607a'; g.beginPath(); g.ellipse(128, tongue, 15, 9, 0, 0, 7); g.fill(); }
      g.restore(); path(); g.lineWidth = 3.6; g.stroke();
    };
    if (mouth === 'neutral') { g.beginPath(); g.moveTo(112, MY); g.quadraticCurveTo(128, MY + 5, 144, MY - 1); g.stroke(); }
    else if (mouth === 'smile') fillMouth(() => { g.beginPath(); g.moveTo(103, MY - 7); g.quadraticCurveTo(128, MY - 2, 153, MY - 7); g.quadraticCurveTo(150, MY + 22, 128, MY + 22); g.quadraticCurveTo(106, MY + 22, 103, MY - 7); g.closePath(); }, 34, MY + 20);
    else if (mouth === 'grin') fillMouth(() => { g.beginPath(); g.moveTo(104, MY - 6); g.quadraticCurveTo(128, MY - 1, 152, MY - 6); g.quadraticCurveTo(146, MY + 13, 128, MY + 13); g.quadraticCurveTo(110, MY + 13, 104, MY - 6); g.closePath(); }, 60, 0);
    else if (mouth === 'frown') { g.beginPath(); g.moveTo(110, MY + 8); g.quadraticCurveTo(128, MY - 8, 146, MY + 8); g.stroke(); }
    else if (mouth === 'grumpy') { g.beginPath(); g.moveTo(108, MY + 7); g.quadraticCurveTo(114, MY, 128, MY); g.quadraticCurveTo(142, MY, 148, MY + 7); g.stroke(); }
    else if (mouth === 'angry') fillMouth(() => { g.beginPath(); g.moveTo(106, MY + 9); g.quadraticCurveTo(128, MY - 16, 150, MY + 9); g.quadraticCurveTo(128, MY + 3, 106, MY + 9); g.closePath(); }, 0, 0);
    else if (mouth === 'teeth') { g.beginPath(); g.moveTo(113, MY - 9); g.arcTo(150, MY - 9, 150, MY + 9, 7); g.arcTo(150, MY + 9, 106, MY + 9, 7); g.arcTo(106, MY + 9, 106, MY - 9, 7); g.arcTo(106, MY - 9, 150, MY - 9, 7); g.closePath(); g.fillStyle = '#fff'; g.fill(); g.lineWidth = 3.4; g.stroke(); g.lineWidth = 2; g.beginPath(); g.moveTo(108, MY); g.lineTo(148, MY); [117, 128, 139].forEach(x => { g.moveTo(x, MY - 8); g.lineTo(x, MY + 8); }); g.stroke(); }
    else if (mouth === 'o') fillMouth(() => { g.beginPath(); g.ellipse(128, MY + 3, 10, 13, 0, 0, 7); }, 0, MY + 14);
    else if (mouth === 'talk1') fillMouth(() => { g.beginPath(); g.ellipse(128, MY + 1, 13, 7, 0, 0, 7); }, 0, MY + 7);
    else if (mouth === 'talk2') fillMouth(() => { g.beginPath(); g.moveTo(110, MY - 6); g.quadraticCurveTo(128, MY - 10, 146, MY - 6); g.quadraticCurveTo(144, MY + 16, 128, MY + 16); g.quadraticCurveTo(112, MY + 16, 110, MY - 6); g.closePath(); }, 7, MY + 15);
    else if (mouth === 'wavy') { g.beginPath(); for (let x = 108; x <= 148; x += 2) g.lineTo(x, MY + 2 + Math.sin(x * 0.45) * 4); g.stroke(); }
    else { g.beginPath(); g.moveTo(114, MY); g.lineTo(142, MY); g.stroke(); }
    this.tex.needsUpdate = true;
  }
  dispose() { this.tex.dispose(); this.mat.dispose(); }
}

/* ---------- name tags ---------- */
const _avTags = new Set(); let _avFontOk = false;
function makeLabelSprite(text, big) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128;
  const g = c.getContext('2d', { willReadFrequently: true }), tex = new THREE.CanvasTexture(c);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false }));
  sp.renderOrder = 20; const k = big ? 1.3 : 1; sp.scale.set(1.5 * k, 0.375 * k, 1); sp.userData.base = 1.5 * k;
  sp.userData.set = t => {
    sp.userData.text = t = String(t || ''); g.clearRect(0, 0, 512, 128);
    let fs = 80; const font = () => fs + 'px "Alfa Slab One", "Rockwell", Georgia, serif'; g.font = font();
    while (g.measureText(t).width > 470 && fs > 34) { fs -= 4; g.font = font(); }
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = 10; g.shadowOffsetY = 5;
    g.strokeStyle = 'rgba(30,20,14,.92)'; g.lineWidth = 15; g.strokeText(t, 256, 68, 490);
    g.shadowColor = 'transparent'; g.fillStyle = '#fffaf0'; g.fillText(t, 256, 68, 490);
    tex.needsUpdate = true;
  };
  sp.userData.set(text);
  if (!_avFontOk) _avTags.add(sp);
  return sp;
}
if (document.fonts && document.fonts.load) document.fonts.load('80px "Alfa Slab One"').then(() => { _avFontOk = true; _avTags.forEach(s => s.userData.set(s.userData.text)); _avTags.clear(); }).catch(() => {});

/* ---------- pose channels ---------- */
const AV_CH = ['ry', 'rz', 'rrx', 'hx', 'hy', 'hz', 'cx', 'cy', 'cz', 'nx', 'ny', 'nz',
  'lax', 'lay', 'laz', 'lex', 'lez', 'lhx', 'rax', 'ray', 'raz', 'rex', 'rez', 'rhx',
  'ltx', 'lty', 'ltz', 'lkx', 'lfx', 'rtx', 'rty', 'rtz', 'rkx', 'rfx'];
const AVC = {}; AV_CH.forEach((n, i) => { AVC[n] = i; });
const AV_NCH = AV_CH.length;
/* keyframes: K = [k0, v0, k1, v1, ...], smoothstep between keys */
function avKF(k, K) { if (k <= K[0]) return K[1]; for (let i = 2; i < K.length; i += 2) if (k <= K[i]) { const u = (k - K[i - 2]) / (K[i] - K[i - 2]), e = u * u * (3 - 2 * u); return K[i - 1] + (K[i + 1] - K[i - 1]) * e; } return K[K.length - 1]; }
const avLerpCh = (T, i, v, w) => { T[i] += (v - T[i]) * w; };
/* blend an arm to [shoulder x, y, z, elbow x, elbow z] (side: 'l', 'r' or 'lr'); the poses below were solved with IK */
function avArm(T, side, a, w) {
  if (side.includes('l')) { avLerpCh(T, AVC.lax, a[0], w); avLerpCh(T, AVC.lay, a[1], w); avLerpCh(T, AVC.laz, a[2], w); avLerpCh(T, AVC.lex, a[3], w); avLerpCh(T, AVC.lez, a[4], w); }
  if (side.includes('r')) { avLerpCh(T, AVC.rax, a[0], w); avLerpCh(T, AVC.ray, a[1], w); avLerpCh(T, AVC.raz, a[2], w); avLerpCh(T, AVC.rex, a[3], w); avLerpCh(T, AVC.rez, a[4], w); }
}
const AV_ARM = { facepalm: [1.38, -0.22, -0.91, 1.13, 0.13], drink: [1.82, 0.38, -0.38, 1.44, 0.2], akimbo: [-1.05, 0.26, 0.6, 1.92, -0.14], behind: [3.08, 0.24, -0.06, 1.51, -0.15],
  typing: [0.72, 0.08, 0.08, 1.16, -0.32], rest: [0.51, 0.25, -0.11, 1.41, 0.16], knees: [0.84, 0, -0.08, 0.14, -0.1] };
/* one-shot actions. fn(T, k (0..1), t (seconds), av) writes absolute channel values over the current base pose. */
const AV_ACT = {
  throw: { d: 0.62, rate: 30, face: 'grin', fn(T, k) {
    T[AVC.rax] = avKF(k, [0, 0.2, 0.38, 3.3, 0.56, 1.35, 0.8, 0.5, 1, 0.1]); T[AVC.rex] = avKF(k, [0, 0.3, 0.38, 1.6, 0.56, 0.1, 1, 0.2]); T[AVC.raz] = avKF(k, [0, 0.15, 0.38, 0.4, 0.6, 0.12, 1, 0.13]);
    T[AVC.cy] = avKF(k, [0, 0, 0.38, -0.5, 0.6, 0.4, 1, 0]); T[AVC.cx] = avKF(k, [0, 0, 0.38, 0.1, 0.6, -0.2, 1, 0]); T[AVC.lax] = avKF(k, [0, 0, 0.38, 0.8, 0.6, -0.3, 1, 0]); T[AVC.laz] = 0.3; } },
  punch: { d: 0.46, rate: 36, face: 'angry', fn(T, k) {
    T[AVC.rex] = avKF(k, [0, 0.4, 0.25, 2.2, 0.42, 0.05, 0.72, 0.05, 1, 0.4]); T[AVC.rax] = avKF(k, [0, 0.3, 0.25, 0.55, 0.42, 1.55, 0.72, 1.45, 1, 0.3]); T[AVC.raz] = avKF(k, [0, 0.15, 0.42, -0.06, 1, 0.15]);
    T[AVC.cy] = avKF(k, [0, 0, 0.25, -0.35, 0.42, 0.5, 0.75, 0.35, 1, 0]); T[AVC.rz] = avKF(k, [0, 0, 0.42, -0.08, 1, 0]);
    T[AVC.lax] = 0.95; T[AVC.lex] = 2.1; T[AVC.laz] = 0.12; T[AVC.ny] = avKF(k, [0, 0, 0.42, -0.25, 1, 0]); } },
  slap: { d: 0.56, rate: 34, face: 'angry', fn(T, k) {
    T[AVC.raz] = avKF(k, [0, 0.2, 0.3, 1.45, 0.62, 1.2, 1, 0.2]); T[AVC.ray] = avKF(k, [0, 0, 0.3, -0.6, 0.62, 1.5, 1, 0]); T[AVC.rex] = avKF(k, [0, 0.2, 0.3, 0.5, 0.62, 0.15, 1, 0.2]);
    T[AVC.rax] = avKF(k, [0, 0, 0.3, 0.25, 1, 0]); T[AVC.cy] = avKF(k, [0, 0, 0.3, -0.45, 0.62, 0.55, 1, 0]); } },
  wave: { d: 1.8, face: 'happy', fn(T, k, t) {
    T[AVC.raz] = 2.55; T[AVC.rax] = 0.25; T[AVC.rex] = 0.4; T[AVC.rez] = 0.5 * Math.sin(t * 12); T[AVC.nz] = 0.12; T[AVC.ny] = 0; T[AVC.cz] = -0.05; } },
  point: { d: 1.4, face: 'surprised', fn(T, k) { T[AVC.rax] = 1.5; T[AVC.raz] = 0.05; T[AVC.ray] = 0; T[AVC.rex] = 0.05; T[AVC.rhx] = 0.1; T[AVC.cy] = 0.12; T[AVC.nx] = 0.05; T[AVC.ny] = 0; } },
  cheer: { d: 1.6, face: 'joy', fn(T, k, t) {
    const b = Math.max(0, Math.sin(t * 11)); T[AVC.lax] = T[AVC.rax] = 2.85; T[AVC.laz] = T[AVC.raz] = 0.45; T[AVC.lex] = T[AVC.rex] = 0.3 + 0.4 * b; T[AVC.ry] += 0.035 * b; T[AVC.nx] = 0.2; T[AVC.lkx] += 0.15 * b; T[AVC.rkx] += 0.15 * b; } },
  facepalm: { d: 1.9, face: 'facepalm', fn(T, k) {
    const w = avKF(k, [0, 0, 0.22, 1, 0.82, 1, 1, 0]); avArm(T, 'r', AV_ARM.facepalm, w);
    avLerpCh(T, AVC.nx, -0.38, w); avLerpCh(T, AVC.ny, 0.12, w); avLerpCh(T, AVC.cx, -0.12, w); } },
  drink: { d: 2.0, face: 'happy', fn(T, k) {
    const w = avKF(k, [0, 0, 0.2, 1, 0.85, 1, 1, 0]); avArm(T, 'r', AV_ARM.drink, w);
    avLerpCh(T, AVC.nx, 0.4, avKF(k, [0, 0, 0.3, 0, 0.42, 1, 0.78, 1, 0.9, 0])); } },
  spray: { d: 1.5, face: 'grin', fn(T, k, t) { T[AVC.rax] = 1.42; T[AVC.raz] = 0.08; T[AVC.ray] = 0.05 * Math.sin(t * 23); T[AVC.rex] = 0.12 + 0.04 * Math.sin(t * 31); T[AVC.cy] = 0.14; T[AVC.lax] = 0.3; T[AVC.lex] = 0.6; T[AVC.cx] = -0.05; } },
  fart: { d: 1.7, fn(T, k, t, a) {
    const w = avKF(k, [0, 0, 0.18, 1, 0.75, 1, 1, 0]);
    avLerpCh(T, AVC.ry, -0.12, w); avLerpCh(T, AVC.rz, 0.11, w); avLerpCh(T, AVC.ltx, 0.8, w); avLerpCh(T, AVC.rtx, 0.8, w); avLerpCh(T, AVC.lkx, 1.15, w); avLerpCh(T, AVC.rkx, 1.15, w);
    avLerpCh(T, AVC.lfx, 0.35, w); avLerpCh(T, AVC.rfx, 0.35, w); avLerpCh(T, AVC.cx, -0.5, w); avLerpCh(T, AVC.nx, 0.45, w);
    avArm(T, 'lr', AV_ARM.knees, w);
    T[AVC.rz] += 0.012 * Math.sin(t * 45) * w; a._face = k < 0.62 ? 'strain' : 'joy'; } },
  hit: { d: 0.6, rate: 30, face: 'ouch', fn(T, k) {
    const w = avKF(k, [0, 0, 0.18, 1, 1, 0]); avLerpCh(T, AVC.cx, 0.4, w); avLerpCh(T, AVC.nx, 0.45, w); avLerpCh(T, AVC.laz, 0.95, w); avLerpCh(T, AVC.raz, 0.95, w);
    avLerpCh(T, AVC.lax, -0.35, w); avLerpCh(T, AVC.rax, -0.35, w); avLerpCh(T, AVC.lex, 0.8, w); avLerpCh(T, AVC.rex, 0.8, w); avLerpCh(T, AVC.rz, 0.12, w); } },
  fall: { d: 3.0, rate: 22, fn(T, k, t, a) {
    T[AVC.rrx] = avKF(k, [0, 0, 0.11, 1.52, 0.7, 1.52, 0.86, 0.35, 1, 0]); T[AVC.ry] = avKF(k, [0, 0, 0.11, 0.14, 0.7, 0.14, 0.86, 0.02, 1, 0]);
    T[AVC.ltx] = avKF(k, [0, 0, 0.08, 1.0, 0.18, 0.35, 0.7, 0.3, 0.8, 1.4, 0.95, 0.2, 1, 0]); T[AVC.rtx] = avKF(k, [0, 0, 0.1, 0.7, 0.2, 0.15, 0.7, 0.2, 0.8, 1.2, 0.95, 0.15, 1, 0]);
    T[AVC.lkx] = T[AVC.rkx] = avKF(k, [0, 0, 0.1, 0.6, 0.2, 0.2, 0.7, 0.2, 0.8, 1.9, 0.95, 0.3, 1, 0]);
    T[AVC.laz] = T[AVC.raz] = avKF(k, [0, 0.13, 0.1, 1.5, 0.22, 1.05, 0.7, 1.0, 0.86, 0.35, 1, 0.13]); T[AVC.lax] = T[AVC.rax] = avKF(k, [0, 0, 0.1, 0.6, 0.25, 0.2, 0.75, 0.3, 0.86, 0.9, 1, 0]);
    T[AVC.lex] = T[AVC.rex] = avKF(k, [0, 0.2, 0.1, 0.6, 0.3, 0.3, 1, 0.2]); T[AVC.cx] = avKF(k, [0, 0, 0.7, 0, 0.8, -0.75, 0.95, -0.1, 1, 0]); T[AVC.nx] = avKF(k, [0, 0, 0.1, -0.4, 0.25, 0.1, 1, 0]);
    T[AVC.ny] = 0.5 * Math.sin(t * 2) * avKF(k, [0.2, 0, 0.3, 1, 0.68, 1, 0.75, 0]);
    a._face = k < 0.14 ? 'surprised' : k < 0.78 ? 'dizzy' : 'sad'; a._stars = k > 0.12 && k < 0.8; } },
  dance: { d: 4.2, face: 'joy', fn(T, k, t) {
    const w = t * Math.PI * 2 * 1.9, b = Math.sin(w), ab = Math.abs(b), u = 0.5 + 0.5 * Math.sin(w * 0.5);
    T[AVC.hz] = 0.14 * b; T[AVC.cz] = -0.1 * b; T[AVC.cy] = 0.15 * Math.sin(w * 0.5); T[AVC.ry] = -0.04 - 0.035 * ab; T[AVC.lkx] = T[AVC.rkx] = 0.32 + 0.25 * ab; T[AVC.ltx] = T[AVC.rtx] = 0.16 + 0.12 * ab;
    T[AVC.ltz] = T[AVC.rtz] = 0.06; T[AVC.lfx] = T[AVC.rfx] = 0.15; T[AVC.rax] = 0.4 + 2.4 * u; T[AVC.raz] = 0.5; T[AVC.rex] = 0.25 + 0.6 * (1 - u); T[AVC.lax] = 0.4 + 2.4 * (1 - u); T[AVC.laz] = 0.5; T[AVC.lex] = 0.25 + 0.6 * u;
    T[AVC.nx] = 0.12 * Math.sin(w * 2); T[AVC.ny] = 0.25 * Math.sin(w * 0.5); T[AVC.nz] = 0.1 * b; } },
  shrug: { d: 1.1, face: 'surprised', fn(T, k) {
    const w = avKF(k, [0, 0, 0.25, 1, 0.7, 1, 1, 0]); avLerpCh(T, AVC.laz, 0.5, w); avLerpCh(T, AVC.raz, 0.5, w); avLerpCh(T, AVC.lex, 1.5, w); avLerpCh(T, AVC.rex, 1.5, w);
    avLerpCh(T, AVC.lez, 0.6, w); avLerpCh(T, AVC.rez, 0.6, w); avLerpCh(T, AVC.lax, 0.2, w); avLerpCh(T, AVC.rax, 0.2, w); avLerpCh(T, AVC.nz, 0.18, w); avLerpCh(T, AVC.ry, 0.015, w); } },
  nod: { d: 0.9, face: 'happy', fn(T, k, t) { T[AVC.nx] += 0.28 * Math.sin(k * Math.PI * 3) * (1 - k); } }
};

/* ---------- the avatar ---------- */
const _av3 = new THREE.Vector3(), AV_TAG_Y = 2.1;
class AvatarRig {
  constructor(o) {
    o = o || {}; avMats(); avHeadGeos();
    this.group = new THREE.Group(); this.phase = Math.random() * 6.283; this.boss = !!o.boss; this.headset = o.headset !== false && !o.boss;
    this.cur = new Float32Array(AV_NCH); this.tgt = new Float32Array(AV_NCH); this.tmp = new Float32Array(AV_NCH); this.tmp2 = new Float32Array(AV_NCH);
    this.mood = this.boss ? 'grumpy' : 'neutral'; this.moodT = 0; this.tmood = null; this.talking = false; this.act = null; this.stunT = 0;
    this.sitW = 0; this.moveW = 0; this.airW = 0; this.leanW = 0; this.talkW = 0; this.walkPh = 0; this._t = -1; this._py = 0; this._vy = 0;
    this.blinkT = 1 + Math.random() * 3; this.blinkOn = 0; this.flapT = 0; this.mouthT = 'closed'; this._face = null; this._stars = false;
    this.bones = AV_BONES.map(n => { const b = new THREE.Bone(); b.name = n; return b; });
    this.bn = {}; AV_BONES.forEach((n, i) => { this.bn[n] = this.bones[i]; if (AV_PAR[n]) this.bones[AVBI[AV_PAR[n]]].add(this.bones[i]); });
    this.body = this.bn.root; this.head = this.bn.head; this.armL = this.bn.shL; this.armR = this.bn.shR; this.legL = this.bn.thL; this.legR = this.bn.thR;
    this.handL = this.bn.haL; this.handR = this.bn.haR; this.chest = this.bn.chest;
    this.headMat = avShade(new THREE.MeshLambertMaterial({ color: '#e9b98f' }));
    this.headMesh = new THREE.Mesh(AV_HEAD, this.headMat);
    this.face = new AvFace(); this.faceMesh = new THREE.Mesh(AV_FACEG, this.face.mat); this.faceMesh.renderOrder = 1;
    this.accMesh = new THREE.Mesh(undefined, AVM.acc);
    [this.headMesh, this.faceMesh, this.accMesh].forEach(m => { m.position.y = AV_HD.cy * AV_HD.k; m.scale.setScalar(AV_HD.k); this.head.add(m); });
    this.shadow = new THREE.Mesh(AVM.shadowGeo, AVM.shadow); this.shadow.position.y = 0.012; this.shadow.renderOrder = -1; this.group.add(this.shadow);
    this.tag = makeLabelSprite(o.name || ''); if (o.boss) this.tag.material.depthTest = true; this.tag.position.y = AV_TAG_Y; this.tag.visible = !!o.name; this.group.add(this.tag);
    this.talk = new THREE.Sprite(AVM.talk); this.talk.scale.setScalar(0.2); this.talk.position.y = AV_TAG_Y + 0.27; this.talk.visible = false; this.talk.renderOrder = 21; this.group.add(this.talk);
    this.setLook(resolveLook(o));
  }
  /* rebuild the body for a new look (same group, bones and headMat, so outside references stay valid) */
  setLook(L) {
    L = normLook(L); if (this.boss) L.boss = true;
    const pk = packLook(L) + L.boss; if (this._pk === pk) return; this._pk = pk; this.look = L;
    const D = avDims(L);
    AV_BONES.forEach((n, i) => { const p = avBonePos(n, D), pp = AV_PAR[n] ? avBonePos(AV_PAR[n], D) : [0, 0, 0]; this.bones[i].position.set(p[0] - pp[0], p[1] - pp[1], p[2] - pp[2]); this.bones[i].rotation.set(0, 0, 0); });
    if (this.mesh) { this.mesh.remove(this.bones[0]); this.group.remove(this.mesh); }
    const bk = avBodyKey(L), ak = avAccKey(L, this.headset), oldB = this._bk, oldA = this._ak; this._bk = bk; this._ak = ak;
    this.mesh = new THREE.SkinnedMesh(avUse(AV_BODY, bk, () => avBodyGeo(L)), AVM.body); this.mesh.add(this.bones[0]);
    this.group.add(this.mesh); this.mesh.bind(this.skel || (this.skel = new THREE.Skeleton(this.bones)));
    this.headMat.color.set(L.skin);
    const acc = avUse(AV_ACC, ak, () => avAccGeo(L, this.headset)); this.accMesh.geometry = acc || AV_EMPTY(); this.accMesh.visible = !!acc;
    if (oldB) avFree(AV_BODY, oldB); if (oldA) avFree(AV_ACC, oldA);
    this.face.setLook(L); this._pose();
  }
  get shirt() { const self = this; return { color: { set(c) { self.setLook(Object.assign({}, self.look, { shirt: '#' + new THREE.Color(c).getHexString() })); } } }; }
  /* one-shot action (see AV_ACTIONS). opts: { dur, hold (0..1: freeze at that point until stop()), loop } */
  play(name, opts) {
    const def = AV_ACT[name]; if (!def) return false; opts = opts || {};
    this.act = { name, def, t: 0, d: opts.dur || def.d, hold: opts.hold != null ? opts.hold : null, loop: !!opts.loop || name === 'dance' && !!opts.loop };
    if (name === 'fall') this.stunT = 0;
    return true;
  }
  stop() { if (this.act) { this.act.loop = false; this.act.hold = null; this.act.d = Math.min(this.act.d, this.act.t + 0.18); } }
  stun(sec) { this.stunT = Math.max(this.stunT, +sec || 2); }
  /* mood: 'neutral','happy','angry','sad','surprised' (also 'grumpy','joy','dizzy'…). With sec, it reverts afterwards. */
  setMood(m, sec) { if (!AV_FACES[m]) m = 'neutral'; if (sec) { this.tmood = m; this.moodT = sec; } else { this.mood = m; this.tmood = null; } }
  setName(n) { this.tag.userData.set(n || ''); this.tag.visible = !!n; }
  dispose() {
    if (this.group.parent) this.group.parent.remove(this.group); this.face.dispose(); this.headMat.dispose(); this.tag.material.map.dispose(); this.tag.material.dispose(); _avTags.delete(this.tag);
    if (this._bk) avFree(AV_BODY, this._bk); if (this._ak) avFree(AV_ACC, this._ak); this._bk = this._ak = null; if (this.skel && this.skel.dispose) this.skel.dispose();
  }

  /* ----- animation ----- */
  pose(sit, t, speed) {
    const dt = this._t < 0 ? 0.016 : clamp(t - this._t, 0, 0.1); this._t = t;
    if (!this.group.visible && this !== W.me) return;
    const T = this.tgt, S = this.tmp, ph = this.phase, y = this.group.position.y;
    this._vy = lerp(this._vy, (y - this._py) / Math.max(dt, 1e-3), 0.5); this._py = y; speed = speed || 0;
    const kind = sit ? (sit === 'review' || sit === 'rest' ? 'rest' : 'desk') : null;
    this.sitW = avApp(this.sitW, sit ? 1 : 0, dt * 3.5); this.moveW = lerp(this.moveW, clamp(speed / 3.2, 0, 1.7), 1 - Math.exp(-dt * 8));
    this.airW = avApp(this.airW, !sit && y > 0.04 ? 1 : 0, dt * 9); this.talkW = avApp(this.talkW, this.talking && !sit ? 1 : 0, dt * 3);
    this._face = null; this._stars = false;
    T.fill(0);
    if (this.sitW < 1) this.standPose(T, t, speed, dt);
    if (this.sitW > 0) { this.sitPose(S, t, kind || this._kind || 'desk', dt); const w = this.sitW * this.sitW * (3 - 2 * this.sitW); for (let i = 0; i < AV_NCH; i++) T[i] += (S[i] - T[i]) * w; }
    if (sit) this._kind = kind;
    if (this.airW > 0) {
      const w = this.airW, up = this._vy > 0, fl = Math.sin(t * 15) * 0.25;
      avLerpCh(T, AVC.ltx, 0.8, w); avLerpCh(T, AVC.lkx, 1.2, w); avLerpCh(T, AVC.rtx, -0.1, w); avLerpCh(T, AVC.rkx, 0.6, w); avLerpCh(T, AVC.cx, -0.08, w);
      avLerpCh(T, AVC.laz, up ? 0.9 : 1.5 + fl, w); avLerpCh(T, AVC.raz, up ? 0.9 : 1.5 - fl, w); avLerpCh(T, AVC.lex, 0.5, w); avLerpCh(T, AVC.rex, 0.5, w); avLerpCh(T, AVC.lax, 0.3, w); avLerpCh(T, AVC.rax, 0.3, w); avLerpCh(T, AVC.nx, up ? 0.15 : -0.1, w);
    }
    this.lookAtCam(T, dt);
    if (this.talkW > 0 && !this.act) {   // chatty hand gestures
      const w = this.talkW * (1 - this.moveW * 0.7), g = 0.5 + 0.5 * Math.sin(t * 2.3 + ph);
      T[AVC.rax] += 0.35 * g * w; T[AVC.rex] += 0.9 * g * w; T[AVC.rez] -= 0.2 * g * w; T[AVC.nx] += 0.05 * Math.sin(t * 7.3) * w; T[AVC.nz] += 0.05 * Math.sin(t * 1.7) * w;
    }
    let rate = 16;
    if (this.act) {
      const A = this.act; A.t += dt;
      let k = A.hold != null ? A.hold : A.t / A.d;
      if (A.loop && k >= 1) { A.t -= A.d; k = A.t / A.d; }
      if (k >= 1) this.act = null;
      else {
        S.set(T); A.def.fn(S, k, A.t, this);
        const w = Math.min(1, A.t / 0.1) * (A.hold != null || A.loop ? 1 : Math.min(1, (A.d - A.t) / 0.16));
        for (let i = 0; i < AV_NCH; i++) T[i] += (S[i] - T[i]) * w;
        if (A.def.face && w > 0.3) this._face = A.def.face;
        rate = A.def.rate || 22;
      }
    }
    if (this.stunT > 0) {
      this.stunT -= dt; const w = Math.min(1, this.stunT * 2);
      T[AVC.nx] += 0.15 * Math.sin(t * 5.5) * w; T[AVC.nz] += 0.17 * Math.cos(t * 5.5) * w; T[AVC.cz] += 0.08 * Math.sin(t * 3.1) * w; T[AVC.hz] += 0.05 * Math.sin(t * 2.3 + 1) * w;
      T[AVC.laz] += (0.3 + 0.2 * Math.sin(t * 4)) * w; T[AVC.raz] += (0.3 + 0.2 * Math.cos(t * 4.3)) * w; T[AVC.lkx] += 0.15 * w; T[AVC.rkx] += 0.15 * w; T[AVC.ry] -= 0.02 * w;
      this._face = this._face || 'dizzy'; this._stars = true;
    }
    const kk = 1 - Math.exp(-dt * rate), c = this.cur;
    for (let i = 0; i < AV_NCH; i++) c[i] += (T[i] - c[i]) * kk;
    this._pose(); this.faceUpdate(dt, t);
    // shadow, tag and stars follow the body
    this.shadow.position.set(0, 0.012 - y, c[AVC.rz] * 0.5); this.shadow.scale.setScalar(clamp(1 - y * 0.5, 0.5, 1) * (c[AVC.rrx] > 0.5 ? 1.5 : 1));
    this.tag.position.y = AV_TAG_Y + c[AVC.ry] * (1 - Math.min(1, c[AVC.rrx])) - Math.min(1, c[AVC.rrx]) * 1.2; this.talk.position.y = this.tag.position.y + 0.27;
    if (this._stars || this.stars && this.stars.visible) this.starsUpdate(t, this._stars);
  }
  /* standing avatars glance at a camera that comes close (W.camera, or av.lookCam; av.lookCam = false turns it off) */
  lookAtCam(T, dt) {
    const cam = this.lookCam === undefined ? (this !== W.me && W.camera) : this.lookCam;
    let w = 0, ny = 0, nx = 0;
    if (cam && this.sitW < 0.5 && this.moveW < 0.4 && this.airW < 0.5 && this.group.parent) {
      const g = this.group, cp = cam.position, dx = cp.x - g.position.x, dz = cp.z - g.position.z, d = Math.hypot(dx, dz), ry = g.rotation.y;
      const lx = dx * Math.cos(ry) - dz * Math.sin(ry), lz = dx * Math.sin(ry) + dz * Math.cos(ry);
      ny = Math.atan2(-lx, -lz); nx = clamp(Math.atan2(cp.y - 1.5 * (g.scale.y || 1), d), -0.45, 0.5);
      w = avSS(4.5, 2.2, d) * (1 - avSS(1.25, 1.7, Math.abs(ny))); ny = clamp(ny, -1.05, 1.05);
    }
    this.lookW = avApp(this.lookW || 0, w, dt * 2.5); if (this.lookW <= 0) return;
    const k = this.lookW * this.lookW * (3 - 2 * this.lookW) * 0.85; avLerpCh(T, AVC.ny, ny, k); avLerpCh(T, AVC.nx, nx, k * 0.8); avLerpCh(T, AVC.cy, ny * 0.15, k);
  }
  standPose(T, t, speed, dt) {
    const ph = this.phase, br = Math.sin(t * 1.7 + ph), sw = avNoise(t * 0.33 + ph * 3), look = avNoise(t * 0.21 + ph * 7);
    T[AVC.cx] = 0.025 * br; T[AVC.ry] = 0.004 * br; T[AVC.hz] = 0.035 * sw; T[AVC.cz] = -0.035 * sw; T[AVC.ltz] = -0.035 * sw; T[AVC.rtz] = 0.035 * sw;
    T[AVC.ny] = 0.42 * look; T[AVC.nx] = 0.06 * avNoise(t * 0.29 + ph);
    T[AVC.laz] = T[AVC.raz] = 0.13 + 0.02 * br; T[AVC.lex] = T[AVC.rex] = 0.2; T[AVC.lax] = T[AVC.rax] = 0.04 + 0.02 * br; T[AVC.lez] = T[AVC.rez] = -0.08;
    if (this.boss) { avArm(T, 'lr', AV_ARM.akimbo, 1); T[AVC.ny] = 0.55 * Math.sin(t * 0.7); T[AVC.cx] = -0.02 + 0.02 * br; }
    const m = this.moveW; if (m < 0.02) return;
    const S = this.tmp2, wm = Math.min(1, m * 2.5), r = clamp((m - 1.05) / 0.5, 0, 1), A = Math.min(1, m) * (1 + 0.45 * r);
    this.walkPh += dt * Math.max(speed, 0.6) * 2.1;
    const p = this.walkPh, s = Math.sin(p), c = Math.cos(p);
    S.fill(0);
    S[AVC.ry] = -0.012 - 0.02 * r + 0.045 * Math.abs(c) * A; S[AVC.rz] = 0;
    S[AVC.ltx] = 0.52 * s * A; S[AVC.rtx] = -0.52 * s * A; S[AVC.lkx] = 0.12 + Math.max(0, c) * 0.95 * A; S[AVC.rkx] = 0.12 + Math.max(0, -c) * 0.95 * A;
    S[AVC.lfx] = -0.2 * s * A + Math.max(0, c) * 0.3 * A; S[AVC.rfx] = 0.2 * s * A + Math.max(0, -c) * 0.3 * A;
    S[AVC.hy] = 0.13 * s * A; S[AVC.hz] = 0.05 * c * A; S[AVC.cy] = -0.2 * s * A; S[AVC.cx] = -0.06 - 0.24 * r; S[AVC.cz] = -0.04 * c * A;
    S[AVC.lax] = -0.9 * s * A * (1 - 0.2 * r) - 0.05; S[AVC.rax] = 0.9 * s * A * (1 - 0.2 * r) - 0.05;   // floppy noodle arms
    S[AVC.lex] = 0.3 + 0.55 * (0.5 + 0.5 * Math.sin(p - 0.9)) * A + 0.9 * r; S[AVC.rex] = 0.3 + 0.55 * (0.5 - 0.5 * Math.sin(p - 0.9)) * A + 0.9 * r;
    S[AVC.lez] = 0.16 * Math.sin(p * 2 + 0.6) - 0.05; S[AVC.rez] = -0.16 * Math.sin(p * 2 + 0.6) - 0.05; S[AVC.laz] = S[AVC.raz] = 0.15 + 0.1 * Math.abs(s);
    S[AVC.lhx] = 0.25 * Math.sin(p - 2); S[AVC.rhx] = -0.25 * Math.sin(p - 2);
    S[AVC.nx] = 0.04 * Math.sin(p * 2) + 0.08 * r; S[AVC.ny] = 0.12 * s * A + 0.12 * avNoise(t * 0.4 + ph); S[AVC.nz] = 0.03 * c;
    for (let i = 0; i < AV_NCH; i++) T[i] += (S[i] - T[i]) * wm;
  }
  sitPose(S, t, kind, dt) {
    const ph = this.phase; S.fill(0);
    S[AVC.ry] = -0.27 + AV_LEG.dy; S[AVC.rz] = kind === 'desk' ? -0.1 : -0.05;
    S[AVC.ltx] = S[AVC.rtx] = 1.45; S[AVC.lkx] = S[AVC.rkx] = 1.42; S[AVC.ltz] = S[AVC.rtz] = 0.08; S[AVC.lfx] = S[AVC.rfx] = 0.05; S[AVC.cx] = -0.08;
    if (kind === 'desk') {
      avArm(S, 'lr', AV_ARM.typing, 1); S[AVC.cx] = -0.13;
      S[AVC.lex] += 0.07 * Math.sin(t * 17 + ph); S[AVC.rex] += 0.07 * Math.sin(t * 15.3 + ph * 2); S[AVC.lhx] = -0.15 + 0.2 * Math.max(0, Math.sin(t * 21 + ph)); S[AVC.rhx] = -0.15 + 0.2 * Math.max(0, Math.sin(t * 19 + ph * 3));
      S[AVC.nx] = -0.12 + 0.03 * Math.sin(t * 0.7 + ph); S[AVC.ny] = 0.08 * avNoise(t * 0.5 + ph);
      const turn = avNoise(t * 0.11 + ph * 5); if (turn > 0.55) { S[AVC.ny] = (turn - 0.55) * 2.4 * (ph > 3 ? 1 : -1); S[AVC.cy] = S[AVC.ny] * 0.2; }
      this.leanW = avApp(this.leanW, avNoise(t * 0.045 + ph * 13) > 0.62 ? 1 : 0, dt * 1.4);
      if (this.leanW > 0) {
        const w = this.leanW * this.leanW * (3 - 2 * this.leanW);
        avLerpCh(S, AVC.cx, 0.24, w); avLerpCh(S, AVC.rz, 0.0, w); avArm(S, 'lr', AV_ARM.behind, w); avLerpCh(S, AVC.nx, 0.12, w); avLerpCh(S, AVC.ltx, 1.3, w); avLerpCh(S, AVC.rtx, 1.3, w);
      }
    } else {
      avArm(S, 'lr', AV_ARM.rest, 1); S[AVC.ny] = 0.25 * avNoise(t * 0.23 + ph); S[AVC.nx] = 0.02;
    }
  }
  _pose() {
    const c = this.cur, b = this.bn;
    b.root.position.set(0, c[AVC.ry], c[AVC.rz]); b.root.rotation.set(c[AVC.rrx], 0, 0);
    b.hips.rotation.set(c[AVC.hx], c[AVC.hy], c[AVC.hz]); b.chest.rotation.set(c[AVC.cx], c[AVC.cy], c[AVC.cz]);
    b.neck.rotation.set(c[AVC.nx] * 0.35, c[AVC.ny] * 0.4, c[AVC.nz] * 0.35); b.head.rotation.set(c[AVC.nx] * 0.65, c[AVC.ny] * 0.6, c[AVC.nz] * 0.65);
    b.shL.rotation.set(c[AVC.lax], -c[AVC.lay], -c[AVC.laz]); b.elL.rotation.set(c[AVC.lex], 0, -c[AVC.lez]); b.haL.rotation.set(c[AVC.lhx], 0, 0);
    b.shR.rotation.set(c[AVC.rax], c[AVC.ray], c[AVC.raz]); b.elR.rotation.set(c[AVC.rex], 0, c[AVC.rez]); b.haR.rotation.set(c[AVC.rhx], 0, 0);
    b.thL.rotation.set(c[AVC.ltx], -c[AVC.lty], -c[AVC.ltz]); b.knL.rotation.set(-c[AVC.lkx], 0, 0); b.ftL.rotation.set(c[AVC.lfx], 0, 0);
    b.thR.rotation.set(c[AVC.rtx], c[AVC.rty], c[AVC.rtz]); b.knR.rotation.set(-c[AVC.rkx], 0, 0); b.ftR.rotation.set(c[AVC.rfx], 0, 0);
  }
  faceUpdate(dt, t) {
    if (this.moodT > 0) { this.moodT -= dt; if (this.moodT <= 0) this.tmood = null; }
    const m = this._face || this.tmood || this.mood, F = AV_FACES[m] || AV_FACES.neutral;
    let eye = F[0], mouth = F[2];
    this.blinkT -= dt;
    if (this.blinkT <= 0) { this.blinkOn = 0.13; this.blinkT = 1.8 + Math.random() * 3.8; if (Math.random() < 0.15) this.blinkT = 0.3; }
    if (this.blinkOn > 0) { this.blinkOn -= dt; if (eye === 'open' || eye === 'wide' || eye === 'angry' || eye === 'sad') eye = 'closed'; }
    if (this.talking && mouth !== 'teeth') {
      this.flapT -= dt; if (this.flapT <= 0) { this.flapT = 0.07 + Math.random() * 0.1; this.mouthT = pick(['talk1', 'talk2', 'talk1', 'closed', 'talk2']); }
      mouth = this.mouthT === 'closed' ? (F[2] === 'smile' ? 'grin' : 'neutral') : this.mouthT;
    }
    const ny = this.cur[AVC.ny], look = ny > 0.3 ? -1 : ny < -0.3 ? 1 : 0;
    this.face.draw(eye, F[1], mouth, look, F[3] ? 1 : 0);
  }
  starsUpdate(t, on) {
    if (!this.stars) { this.stars = new THREE.Group(); for (let i = 0; i < 4; i++) { const s = new THREE.Sprite(AVM.star); s.scale.setScalar(0.15); this.stars.add(s); } this.group.add(this.stars); }
    const g = this.stars; g.visible = on; if (!on) return;
    this.head.getWorldPosition(_av3); this.group.worldToLocal(_av3); g.position.set(_av3.x, _av3.y + 0.42, _av3.z);
    g.children.forEach((s, i) => { const a = t * 4.2 + i * Math.PI / 2; s.position.set(Math.cos(a) * 0.27, Math.sin(t * 7 + i * 1.7) * 0.035, Math.sin(a) * 0.27); });
  }
}
let _avEmpty = null; function AV_EMPTY() { return _avEmpty || (_avEmpty = new THREE.BufferGeometry()); }

/* public: build an avatar. opts: { look, name, boss, headset } (old opts.shirt/skin/hair still work) */
function buildAvatar(o) { return new AvatarRig(o || {}); }
/* animate an avatar for this frame. sit: false | true/'desk' (typing) | 'review'/'rest' (hands on lap) */
function poseAvatar(a, sit, t, speed) { if (a && a.pose) a.pose(sit, t, speed); }

/* ---------- remote players ---------- */
function avFallbackLook(p, id) { const L = lookFromSeed(hashStr(p.name || id)); if (p.color) L.shirt = p.color; return L; }
function syncAvatars(players, myId) {
  for (const [id, a] of W.avatars) if (!players.has(id) || id === myId) { a.av.dispose(); W.avatars.delete(id); }
  for (const [id, p] of players) {
    if (id === myId) continue;
    let a = W.avatars.get(id); const ext = p.ext || {}, lk = typeof ext.look === 'string' ? ext.look : ext.look ? packLook(normLook(ext.look)) : '';
    if (!a) {
      a = { av: buildAvatar({ look: lk ? unpackLook(lk) : avFallbackLook(p, id), name: p.name || 'Agent' }), x: p.x, z: p.z, y: 0, ry: p.ry || 0, name: p.name, color: p.color, lk, speed: 0 };
      a.av.group.position.set(p.x || 0, 0, p.z || 0); W.scene.add(a.av.group); W.avatars.set(id, a);
    }
    if (a.name !== p.name) { a.name = p.name; a.av.setName(p.name || 'Agent'); }
    if (a.lk !== lk || (!lk && a.color !== p.color)) { a.lk = lk; a.color = p.color; a.av.setLook(lk ? unpackLook(lk) : avFallbackLook(p, id)); }
    if (ext.mood && a.mood !== ext.mood) { a.mood = ext.mood; a.av.setMood(ext.mood); }
    a.tx = p.x; a.tz = p.z; a.ty = p.y || 0; a.tr = p.ry || 0; a.seat = p.seat; a.talk = !!p.talk;
  }
}
function avTagScale(av, cam) {
  const g = av.group, d = cam.position.distanceTo(g.position), tg = av.tag; if (!tg.visible) return;
  const f = clamp(d / 7, 1, 2.3), s = g.scale.x || 1; tg.scale.set(tg.userData.base * f / s, tg.userData.base * 0.25 * f / s, 1);
  tg.material.opacity = 1 - avSS(24, 34, d);
}
function updateAvatars(dt, t) {
  const cam = W.camera;
  for (const a of W.avatars.values()) {
    const g = a.av.group; let sit = false, tx = a.tx, tz = a.tz, tr = a.tr, ty = a.ty;
    if (a.seat >= 0 && W.desks[a.seat]) { const d = W.desks[a.seat]; tx = d.seat.x; tz = d.seat.z; tr = d.rot; ty = 0; sit = 'desk'; }
    else if (a.seat <= -10) { const s = REVIEW_SEATS[(-a.seat - 10) % REVIEW_SEATS.length]; tx = s[0]; tz = s[1]; tr = s[2] != null ? s[2] : -Math.PI / 2; ty = 0; sit = 'review'; }
    const k = 1 - Math.exp(-dt * 12), ox = g.position.x, oz = g.position.z;
    if (Math.hypot(tx - ox, tz - oz) > 6) { g.position.x = tx; g.position.z = tz; } else { g.position.x = lerp(ox, tx, k); g.position.z = lerp(oz, tz, k); }
    g.position.y = lerp(g.position.y, ty, Math.min(1, k * 1.5));
    let dr = tr - g.rotation.y; dr = Math.atan2(Math.sin(dr), Math.cos(dr)); g.rotation.y += dr * k;
    a.speed = lerp(a.speed, Math.hypot(g.position.x - ox, g.position.z - oz) / Math.max(dt, 0.001), 0.3);
    a.av.talking = a.talk; poseAvatar(a.av, sit, t, a.speed);
    a.av.talk.visible = a.talk; if (a.talk) a.av.talk.scale.setScalar(0.2 * (1 + Math.sin(t * 14) * 0.15));
    avTagScale(a.av, cam);
  }
  // coworkers fidget now and then (local only, purely cosmetic)
  if (W.npcs.length && Math.random() < dt * 0.08) { const n = pick(W.npcs); if (!n.act) { const r = Math.random(); if (r < 0.3) { n.play('cheer'); n.setMood('joy', 2); } else if (r < 0.55) n.play('facepalm'); else if (r < 0.75) n.play('shrug'); else n.setMood(pick(['happy', 'sad', 'surprised', 'angry']), 4); } }
  W.npcs.forEach(n => poseAvatar(n, 'desk', t, 0));
  if (W.boss) {
    const hc = W.boss.headMat.color, angry = hc.r > 0.8 && hc.g < 0.5; W.boss.mood = angry ? 'angry' : 'grumpy';
    if (angry && !W.boss.act && Math.random() < dt * 0.25) W.boss.play(pick(['point', 'point', 'facepalm']));
    poseAvatar(W.boss, false, t, 0); avTagScale(W.boss, cam);
  }
  avWatchBalls();
}

/* whoever throws a paper ball plays the throw animation (works for local and remote throws, no hooks needed) */
const _avSeenBalls = new WeakSet(), _avBallV = new THREE.Vector3();
function avWatchBalls() {
  if (!W.balls) return;
  for (let i = W.balls.length - 1; i >= 0; i--) {
    const b = W.balls[i]; if (_avSeenBalls.has(b)) break; _avSeenBalls.add(b);
    if (b.life < 15.5) continue;
    let best = null, bd = 1.3;
    const test = av => { if (!av || !av.group.parent) return; av.head.getWorldPosition(_avBallV); const d = _avBallV.distanceTo(b.m.position); if (d < bd) { bd = d; best = av; } };
    if (b.local) best = W.me; else { for (const a of W.avatars.values()) test(a.av); }
    if (best && (!best.act || best.act.name === 'throw')) best.play('throw');
  }
}

/* ---------- the local player's own body (W.me) ----------
   Hidden in first person. Shown by the third-person camera and the webcam. Follows P every frame. */
let _avLookOk = false;
function avMyLook() {
  if (!settings.look || typeof settings.look !== 'object') { const L = lookFromSeed(hashStr(settings.name || 'me')); L.shirt = settings.color || L.shirt; settings.look = L; _avLookOk = false; }
  if (!_avLookOk) { _avLookOk = true; settings.look = normLook(settings.look); delete settings.look.boss; saveSettings(); }
  return settings.look;
}
const Avatars = {
  mood: 'neutral', moodT: 0,
  /* the local player does an action (seen by everyone) */
  act(name, opts) { if (W.me) W.me.play(name, opts); Net.emit('av:act', { a: name, o: opts || null }); },
  /* make any player's avatar do an action (e.g. the props module: Avatars.actOn(victimId, 'hit')) */
  actOn(id, name, opts) { const av = avatarOf(id); if (av) av.play(name, opts); Net.emit('av:act', { id: id === 'me' ? Net.myId : id, a: name, o: opts || null }); },
  stunOn(id, sec) { const av = avatarOf(id); if (av) av.stun(sec); Net.emit('av:stun', { id: id === 'me' ? Net.myId : id, s: sec }); },
  /* the local player's face: Avatars.setMood('happy', 3) */
  setMood(m, sec) { if (W.me) W.me.setMood(m, sec); if (sec) { this.tmood = m; this.moodT = sec; } else { this.mood = m; this.tmood = null; } },
  myLook: avMyLook,
  /* call after changing settings.look */
  refreshMe() { _avLookOk = false; const L = avMyLook(); settings.color = L.shirt; saveSettings(); if (W.me) W.me.setLook(L); },
  lookFromSeed, normLook, packLook, unpackLook, OPT: AV_OPT, ACTIONS: AV_ACTIONS, MOODS: AV_MOODS
};
Net.on('av:act', (p, from) => {
  if (!p || !AV_ACT[p.a]) return; const av = avatarOf(p.id || from), o = p.o && typeof p.o === 'object' ? p.o : null;
  if (av) av.play(p.a, o ? { dur: o.dur ? clamp(+o.dur || 1, 0.1, 12) : undefined, hold: o.hold != null ? clamp(+o.hold || 0, 0, 12) : undefined, loop: !!o.loop } : undefined);
});
Net.on('av:stun', (p, from) => { if (!p) return; const av = avatarOf(p.id || from); if (av) av.stun(clamp(+p.s || 2, 0.2, 10)); });
Net.addMe('look', () => packLook(avMyLook()));
Net.addMe('mood', () => Avatars.tmood || Avatars.mood);

Bus.on('scam:paid', () => { Avatars.setMood('joy', 4); Avatars.act('cheer'); });
Bus.on('scam:baited', () => { Avatars.setMood('sad', 5); Avatars.act('facepalm'); });
Bus.on('call:end', e => { if (e && (e.result === 'hung' || e.result === 'timeout')) Avatars.setMood('angry', 3); });
Bus.on('call:answer', () => Avatars.setMood('happy', 2));
Bus.on('review', res => Avatars.setMood(res && res.pass ? 'happy' : 'surprised', 6));
Bus.on('world:built', () => {
  W.me = buildAvatar({ look: avMyLook(), name: '' });
  W.me.group.visible = false; W.scene.add(W.me.group);
});
Loop.add((dt, t) => {
  const a = W.me; if (!a) return;
  if (Avatars.moodT > 0) { Avatars.moodT -= dt; if (Avatars.moodT <= 0) Avatars.tmood = null; }
  const g = a.group; let sit = false;
  if (P.seated && W.desks[P.seat]) { const d = W.desks[P.seat]; g.position.set(d.seat.x, 0, d.seat.z); g.rotation.y = d.rot; sit = 'desk'; }
  else if (P.review >= 0) { const s = REVIEW_SEATS[P.review % REVIEW_SEATS.length]; g.position.set(s[0], 0, s[1]); g.rotation.y = s[2] != null ? s[2] : -Math.PI / 2; sit = 'review'; }
  else { g.position.set(P.pos.x, P.pos.y, P.pos.z); g.rotation.y = P.yaw; }
  const L = avMyLook(); if (settings.color && L.shirt !== settings.color) { L.shirt = settings.color; saveSettings(); }
  if (a.look.shirt !== L.shirt) a.setLook(L);
  a.talking = !!(typeof Voice !== 'undefined' && Voice.talking);
  poseAvatar(a, sit, t, P.speed || 0);
});
/* the avatar for a player id: yourself (W.me) or a remote player's avatar; null if unknown */
function avatarOf(id) {
  if (!Net.active || id === Net.myId || id === 'me') return W.me || null;
  const a = W.avatars.get(id); return a ? a.av : null;
}
