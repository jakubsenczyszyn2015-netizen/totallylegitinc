'use strict';
/* =====================================================================
   WORLD — three.js office, avatars, player controller
   ===================================================================== */
const W = { colliders: [], interact: [], desks: [], avatars: new Map(), balls: [], bins: [], npcs: [], scene: null, camera: null, renderer: null, cur: null, boss: null, t: 0 };
const P = { pos: { x: 8, y: 0, z: 0 }, yaw: Math.PI / 2, pitch: 0, vy: 0, seated: false, seat: -1, eye: 1.62, boost: 0, locked: false, drag: false, review: -1, cam: null, speed: 0, bob: 0, expectUnlock: false, throwT: 0 };
const Keys = {};
const ROOM_H = 3.2;
const NPC_DESKS = new Set([1, 4, 8, 11, 13, 16, 20, 23]);
const REVIEW_SEATS = [[15.0, -5.65], [16.2, -5.65], [15.0, -3.35], [16.2, -3.35], [13.9, -5.65], [13.9, -3.35]];
const BOSS_DAY = { x: 13.3, z: 1.9, yaw: Math.PI / 2 }, BOSS_REVIEW = { x: 18.5, z: -4.5, yaw: Math.PI / 2 };

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

function applyQuality() {
  if (!W.renderer) return;
  const dpr = window.devicePixelRatio || 1;
  W.renderer.setPixelRatio(settings.quality === 'low' ? Math.min(dpr, 0.75) : settings.quality === 'high' ? Math.min(dpr, 2) : Math.min(dpr, 1.25));
  W.renderer.setSize(innerWidth, innerHeight, false);
  if (W.camera) { W.camera.aspect = innerWidth / innerHeight; W.camera.fov = settings.fov; W.camera.updateProjectionMatrix(); }
  W.npcs.forEach(n => n.group.visible = settings.npcs);
}

function initWorld() {
  const canvas = $('#gl');
  W.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  W.scene = new THREE.Scene(); W.scene.background = new THREE.Color(0x1b2233); W.scene.fog = new THREE.Fog(0x2a3044, 20, 48);
  W.camera = new THREE.PerspectiveCamera(settings.fov, innerWidth / innerHeight, 0.05, 80); W.camera.rotation.order = 'YXZ';
  applyQuality();
  buildWorld();
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

/* ---------- build ---------- */
function buildWorld() {
  const S = W.scene, H = ROOM_H;
  const carpet = canvasTex(256, 256, (g, w, hh) => {
    g.fillStyle = '#3a435e'; g.fillRect(0, 0, w, hh);
    g.fillStyle = 'rgba(255,255,255,.04)'; g.fillRect(0, 0, w / 2, hh / 2); g.fillRect(w / 2, hh / 2, w / 2, hh / 2);
    for (let i = 0; i < 2600; i++) { g.fillStyle = 'rgba(' + (Math.random() < 0.5 ? '255,255,255,' : '0,0,0,') + (Math.random() * 0.07) + ')'; g.fillRect(Math.random() * w, Math.random() * hh, 2, 2); }
  }, [12, 9]);
  const tiles = canvasTex(128, 128, (g, w, hh) => {
    g.fillStyle = '#d9d2c0'; g.fillRect(0, 0, w, hh); g.fillStyle = '#c4bca8'; g.fillRect(0, 0, w / 2, hh / 2); g.fillRect(w / 2, hh / 2, w / 2, hh / 2);
    g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = 2; g.strokeRect(0, 0, w / 2, hh / 2); g.strokeRect(w / 2, hh / 2, w / 2, hh / 2);
  }, [4, 9]);
  const ceilT = canvasTex(128, 128, (g, w, hh) => { g.fillStyle = '#8f8a7c'; g.fillRect(0, 0, w, hh); g.fillStyle = '#a39d8d'; g.fillRect(3, 3, w - 6, hh - 6); for (let i = 0; i < 300; i++) { g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(Math.random() * w, Math.random() * hh, 2, 2); } }, [16, 9]);
  plane(24, 18, 0, 0, 0, new THREE.MeshLambertMaterial({ map: carpet }), -Math.PI / 2);
  plane(8, 18, 16, 0, 0, new THREE.MeshLambertMaterial({ map: tiles }), -Math.PI / 2);
  plane(32.4, 18.4, 4, H, 0, new THREE.MeshLambertMaterial({ map: ceilT }), Math.PI / 2);

  const WALL = '#d6cdb8', WALL2 = '#b9cbc1', WALL3 = '#b3a892', TRIM = '#3a4668';
  const wallX = (x, z0, z1, y0, y1, c, col) => box(0.2, y1 - y0, z1 - z0, x, (y0 + y1) / 2, (z0 + z1) / 2, c, null, col);
  const wallZ = (z, x0, x1, y0, y1, c, col) => box(x1 - x0, y1 - y0, 0.2, (x0 + x1) / 2, (y0 + y1) / 2, z, c, null, col);
  wallZ(-9.1, -12.2, 20.2, 0, H, WALL, true); wallZ(9.1, -12.2, 20.2, 0, H, WALL, true);
  wallX(-12.1, -9, 9, 0, H, WALL, true); wallX(20.1, -9, 9, 0, H, WALL2, true);
  // divider between the floor and the two side rooms (x = 12)
  wallX(12, -9, -5.2, 0, H, WALL, true); wallX(12, -5.2, -3.6, 2.25, H, WALL, false);
  wallX(12, -3.6, 0.8, 0, H, WALL, true);
  wallX(12, 0.8, 3.0, 0, 1.0, WALL, true); wallX(12, 0.8, 3.0, 2.3, H, WALL, false);
  box(0.06, 1.3, 2.2, 12, 1.65, 1.9, new THREE.MeshLambertMaterial({ color: 0x9fd0e8, transparent: true, opacity: 0.28 }));
  wallX(12, 3.0, 3.6, 0, H, WALL, true);
  box(0.12, 2.25, 1.6, 12, 1.125, 4.4, '#6b4a2f', null, true); wallX(12, 3.6, 5.2, 2.25, H, WALL, false);
  box(0.05, 0.05, 0.14, 11.9, 1.1, 3.9, '#d9c36a');
  wallX(12, 5.2, 9, 0, H, WALL, true);
  wallZ(0, 12.1, 20, 0, H, WALL3, true);
  // baseboards
  box(24, 0.12, 0.04, 0, 0.06, -8.98, TRIM); box(24, 0.12, 0.04, 0, 0.06, 8.98, TRIM);

  // windows on the west wall
  const sky = canvasTex(256, 160, (g, w, hh) => {
    const gr = g.createLinearGradient(0, 0, 0, hh); gr.addColorStop(0, '#6fb7ff'); gr.addColorStop(1, '#dff1ff'); g.fillStyle = gr; g.fillRect(0, 0, w, hh);
    g.fillStyle = 'rgba(255,255,255,.9)'; [[40, 40, 26], [70, 46, 20], [180, 30, 22], [205, 36, 16]].forEach(a => { g.beginPath(); g.arc(a[0], a[1], a[2], 0, 7); g.fill(); });
    for (let i = 0; i < 12; i++) { const bw = 14 + Math.random() * 20, bh = 30 + Math.random() * 70; g.fillStyle = ['#5d6b8a', '#70809f', '#4b5876'][i % 3]; g.fillRect(i * 22, hh - bh, bw, bh); }
  });
  const skyM = new THREE.MeshBasicMaterial({ map: sky });
  [-6, -2, 2, 6].forEach(z => { plane(2.6, 1.5, -11.98, 1.8, z, skyM, 0, Math.PI / 2); box(0.06, 1.62, 0.08, -11.96, 1.8, z, '#f4f0e6'); box(0.06, 0.08, 2.72, -11.96, 1.8, z, '#f4f0e6'); });

  // ceiling lights
  const lightM = new THREE.MeshBasicMaterial({ color: 0xfff5da });
  for (let x = -9; x <= 9; x += 6) for (let z = -6; z <= 6; z += 4) box(1.3, 0.04, 0.5, x, H - 0.03, z, lightM);
  box(1.3, 0.04, 0.5, 16, H - 0.03, -4.5, lightM); box(1.3, 0.04, 0.5, 16, H - 0.03, 4.5, lightM);
  S.add(new THREE.HemisphereLight(0xfff3dd, 0x394260, 0.82));
  S.add(new THREE.AmbientLight(0xffffff, 0.22));
  [[-6, -4], [-6, 4], [5, -4], [5, 4], [16, -4.5], [16, 4.5]].forEach(p => { const l = new THREE.PointLight(0xffe7bd, 0.42, 17, 1.6); l.position.set(p[0], H - 0.4, p[1]); S.add(l); });

  // screens
  const screens = [0, 1, 2].map(v => new THREE.MeshBasicMaterial({ map: canvasTex(128, 80, (g, w, hh) => {
    const gr = g.createLinearGradient(0, 0, 0, hh); gr.addColorStop(0, ['#ff9a5c', '#6aa9ff', '#7be0b0'][v]); gr.addColorStop(1, ['#ffd27a', '#b7d4ff', '#d9f7e6'][v]); g.fillStyle = gr; g.fillRect(0, 0, w, hh);
    g.fillStyle = '#fbf7ea'; g.fillRect(14 + v * 8, 10, 52, 40); g.fillStyle = ['#27c07a', '#d6342c', '#3b82f6'][v]; g.fillRect(14 + v * 8, 10, 52, 8);
    g.fillStyle = '#161d2e'; g.fillRect(74, 22 + v * 4, 40, 44); g.fillStyle = '#0f131d'; g.fillRect(0, hh - 10, w, 10);
  }) }));

  // desks: two back-to-back double rows
  const xs = [-8.5, -6.5, -4.5, -2.5, -0.5, 1.5];
  let di = 0;
  [[-4.0, Math.PI], [-3.0, 0], [3.0, Math.PI], [4.0, 0]].forEach(row => { xs.forEach(x => { makeDesk(di, x, row[0], row[1], screens[di % 3]); di++; }); });

  // office props
  box(0.9, 1.05, 0.7, 10.6, 0.525, -8.3, '#e9e6dc', null, true); box(0.7, 0.06, 0.5, 10.6, 1.08, -8.3, '#22252e');       // copier
  box(1.0, 1.9, 0.7, 6.4, 0.95, -8.5, '#b3261e', null, true); box(0.7, 1.1, 0.02, 6.25, 1.2, -8.14, new THREE.MeshBasicMaterial({ color: 0xbfe6ff }));   // vending machine
  box(2.4, 0.42, 0.8, 8.6, 0.21, 8.4, '#7a5ea8', null, true); box(2.4, 0.5, 0.2, 8.6, 0.67, 8.72, '#6a4f97'); // couch
  plant(11.2, -0.6); plant(-11.2, 8.2); plant(-11.2, -8.2); plant(11.3, 5.6);
  // water cooler
  box(0.34, 0.95, 0.34, 11.4, 0.475, 8.3, '#f4f4f4', null, true);
  const jug = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.36, 12), new THREE.MeshLambertMaterial({ color: 0x8fd3ff, transparent: true, opacity: 0.7 })); jug.position.set(11.4, 1.13, 8.3); S.add(jug);
  W.interact.push({ pos: new THREE.Vector3(11.4, 1.0, 8.3), label: () => 'Get some water', act: () => { SFX.glug(); toast(pick(['Hydrated. Productivity unchanged.', 'Refreshing. The boss is watching.', 'That was water.'])); } });
  // posters
  poster('SYNERGY', 'It is a word', '#3b82f6', -3, -8.98, 0);
  poster('HUSTLE', 'The phones will not answer themselves', '#d6342c', 3, -8.98, 0);
  poster('TEAMWORK', 'Someone else will do it', '#27c07a', 0, 8.98, Math.PI);
  poster('QUOTA', 'Hit it', '#f59e0b', -6, 8.98, Math.PI);
  // bins
  [[-10.6, 0], [3.4, 0], [11.3, -2.4], [3.4, -7.9]].forEach(b => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.42, 12, 1, true), new THREE.MeshLambertMaterial({ color: 0x2b2f3a, side: THREE.DoubleSide })); m.position.set(b[0], 0.21, b[1]); S.add(m); W.bins.push({ x: b[0], z: b[1] }); });

  // break room / meeting room
  box(3.6, 0.08, 1.3, 15.3, 0.78, -4.5, '#7a2f2a', null, true); box(0.3, 0.74, 0.9, 15.3, 0.37, -4.5, '#22252e');
  REVIEW_SEATS.forEach(s => { box(0.46, 0.06, 0.46, s[0], 0.5, s[1], '#cfcfcf'); box(0.06, 0.5, 0.46, s[0] - 0.22, 0.78, s[1], '#cfcfcf'); });
  box(6.4, 0.9, 0.7, 15.6, 0.45, -8.6, '#b9ae97', null, true); box(6.5, 0.06, 0.78, 15.6, 0.93, -8.6, '#ece6d6');   // counter
  box(0.55, 0.34, 0.4, 14.2, 1.13, -8.6, '#e8e8e8'); box(0.3, 0.2, 0.02, 14.12, 1.13, -8.39, '#22252e');          // microwave
  box(0.3, 0.44, 0.3, 16.6, 1.18, -8.6, '#22252e'); box(0.16, 0.14, 0.16, 16.6, 1.03, -8.48, '#e8e8e8');          // coffee machine
  W.interact.push({ pos: new THREE.Vector3(16.6, 1.1, -8.3), label: () => P.boost > 0 ? null : 'Drink coffee', act: () => { SFX.sip(); P.boost = 45; toast('Caffeinated. You walk faster for a bit.', 'good'); } });
  box(0.9, 1.9, 0.8, 19.3, 0.95, -8.4, '#f0f0f0', null, true); box(0.04, 0.5, 0.04, 18.83, 1.2, -8.1, '#9a9a9a');     // fridge
  plant(19.2, -0.7);
  W.boardCanvas = document.createElement('canvas'); W.boardCanvas.width = 512; W.boardCanvas.height = 272;
  W.boardTex = new THREE.CanvasTexture(W.boardCanvas);
  box(0.06, 1.7, 3.2, 19.96, 1.75, -4.5, '#8a8f99');
  plane(3.0, 1.55, 19.92, 1.75, -4.5, new THREE.MeshBasicMaterial({ map: W.boardTex }), 0, -Math.PI / 2);
  setBoard(['Welcome to', 'Totally Legit Inc.']);

  // boss office
  box(2.0, 0.8, 0.9, 17, 0.4, 5.2, '#5a3d28', null, true); box(0.7, 1.2, 0.2, 17, 0.6, 6.3, '#22252e');
  plant(19.2, 8.2); plant(12.9, 8.2);
  poster('ME', 'Employee of every month', '#111827', 16, 8.98, Math.PI);

  // boss + ball assets
  W.boss = buildAvatar({ shirt: '#f4f4f4', skin: '#e9b98f', hair: '#8a8a8a', name: 'The Boss', boss: true, headset: false });
  W.boss.group.scale.setScalar(1.14); S.add(W.boss.group); placeBoss(false);
  W.ballGeo = new THREE.IcosahedronGeometry(0.075, 0); W.ballMat = new THREE.MeshLambertMaterial({ color: 0xf6f3ea });
}
function plant(x, z) {
  box(0.36, 0.4, 0.36, x, 0.2, z, '#8a5a3c', null, true);
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 0), mat('#3f9a5a')); m.position.set(x, 0.9, z); m.scale.y = 1.3; W.scene.add(m);
}
function poster(title, sub, color, x, z, ry) {
  const t = canvasTex(256, 320, (g, w, hh) => {
    g.fillStyle = '#11151f'; g.fillRect(0, 0, w, hh); g.fillStyle = color; g.fillRect(16, 16, w - 32, 170);
    g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.arc(w / 2, 150, 60, Math.PI, 0); g.fill();
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = '900 44px Georgia, serif'; g.fillText(title, w / 2, 240, 230);
    g.font = '18px Georgia, serif'; g.fillStyle = '#c9cfdd'; g.fillText(sub, w / 2, 275, 230);
  });
  plane(1.0, 1.25, x, 1.9, z + (z < 0 ? 0.02 : -0.02), new THREE.MeshBasicMaterial({ map: t }), 0, ry);
}
function setBoard(lines) {
  const g = W.boardCanvas.getContext('2d');
  g.fillStyle = '#f7f7f2'; g.fillRect(0, 0, 512, 272);
  g.fillStyle = '#1b2233'; g.textAlign = 'left';
  lines.forEach((l, i) => { g.font = (i === 0 ? 'bold 40px ' : '30px ') + '"Comic Sans MS", "Segoe Print", cursive'; g.fillStyle = i === 0 ? '#d6342c' : '#1b2233'; g.fillText(l, 28, 58 + i * 46, 460); });
  W.boardTex.needsUpdate = true;
}
function placeBoss(review, angry) {
  const b = review ? BOSS_REVIEW : BOSS_DAY;
  W.boss.group.position.set(b.x, 0, b.z); W.boss.group.rotation.y = b.yaw;
  W.boss.headMat.color.set(angry ? '#e2553f' : '#e9b98f');
}

function makeDesk(i, x, z, rot, screenMat) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; W.scene.add(g);
  const FAB = '#4a5a85', TOP = '#e8e2d4', DARK = '#22252e';
  box(1.88, 0.05, 0.86, 0, 0.74, -0.02, TOP, g);
  box(1.94, 1.5, 0.06, 0, 0.75, -0.47, FAB, g);
  box(0.06, 1.5, 1.34, -0.94, 0.75, 0.17, FAB, g); box(0.06, 1.5, 1.34, 0.94, 0.75, 0.17, FAB, g);
  box(0.62, 0.4, 0.04, 0, 1.13, -0.22, DARK, g); box(0.06, 0.2, 0.06, 0, 0.86, -0.22, DARK, g);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.34), screenMat); scr.position.set(0, 1.13, -0.198); g.add(scr);
  box(0.42, 0.02, 0.14, 0, 0.775, 0.1, DARK, g);
  box(0.16, 0.06, 0.2, -0.6, 0.795, 0.02, '#c9c3b2', g);
  box(0.5, 0.07, 0.5, 0, 0.48, 0.74, '#2b2f3a', g); box(0.5, 0.5, 0.07, 0, 0.8, 0.98, '#2b2f3a', g); box(0.08, 0.46, 0.08, 0, 0.23, 0.74, '#555', g);
  const note = ['#ffe14a', '#ff9ecb', '#9be7ff'][i % 3];
  box(0.12, 0.12, 0.01, 0.6, 1.2, -0.435, note, g); box(0.12, 0.12, 0.01, -0.62, 1.05, -0.435, '#ffe14a', g);
  const s = rot ? -1 : 1, lw = (lx, lz) => [x + lx * s, z + lz * s];
  const addCol = (lx0, lx1, lz0, lz1) => { const a = lw(lx0, lz0), b = lw(lx1, lz1); W.colliders.push({ x0: Math.min(a[0], b[0]), x1: Math.max(a[0], b[0]), z0: Math.min(a[1], b[1]), z1: Math.max(a[1], b[1]), y1: 1.5 }); };
  addCol(-0.97, 0.97, -0.5, 0.41); addCol(-0.97, -0.91, -0.5, 0.84); addCol(0.91, 0.97, -0.5, 0.84);
  const seat = lw(0, 0.74), eye = lw(0, 0.6), stand = lw(0, 1.3), npc = NPC_DESKS.has(i);
  const d = { i, x, z, rot, npc, seat: { x: seat[0], z: seat[1] }, eye: { x: eye[0], y: 1.2, z: eye[1] }, stand: { x: stand[0], z: stand[1] } };
  W.desks.push(d);
  if (npc) {
    const n = buildAvatar({ shirt: SHIRTS[(i * 3) % SHIRTS.length], skin: SKINS[i % SKINS.length], hair: HAIRS[(i * 5) % HAIRS.length], name: '' });
    n.group.position.set(d.seat.x, 0, d.seat.z); n.group.rotation.y = rot; W.scene.add(n.group); W.npcs.push(n);
  } else {
    W.interact.push({ desk: i, pos: new THREE.Vector3(d.seat.x, 1.0, d.seat.z), label: () => Game.deskTaken(i) ? null : 'Sit at this desk', act: () => sitAt(i) });
  }
}
