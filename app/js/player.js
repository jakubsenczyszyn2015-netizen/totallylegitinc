'use strict';
/* PLAYER — local movement, camera, sitting, throwing, interaction (updateWorld)
   Smooth acceleration, sprint (Shift), jump, footsteps, knockback + stun, a third-person camera (C) with a
   wall-aware boom, and the input for held items (click / F / Q / G / 1-6 / wheel, handled by props.js). */
Object.assign(P, { vx: 0, vz: 0, kx: 0, kz: 0, stunT: 0, third: false, boom: 0, dip: 0, fovK: 0, roll: 0, stepN: 0 });
const PC = { walk: 3.4, run: 5.8, accel: 30, decel: 22, air: 6, jump: 4.9, grav: 13.5, boom: 3.3 };
try { P.third = Store.get('tli_third', false) === true; } catch (e) {}

/* ---------- player ---------- */
function blocked(x, z) {
  const r = 0.3;
  for (let i = 0; i < W.colliders.length; i++) { const c = W.colliders[i]; if (x > c.x0 - r && x < c.x1 + r && z > c.z0 - r && z < c.z1 + r) return true; }
  return false;
}
function lookAngles(from, to) { const dx = to.x - from.x, dy = to.y - from.y, dz = to.z - from.z; return { yaw: Math.atan2(-dx, -dz), pitch: Math.atan2(dy, Math.hypot(dx, dz)) }; }
function startCam(to, yaw, pitch, dur, done) {
  const c = W.camera;
  let dy = yaw - c.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
  P.cam = { fx: c.position.x, fy: c.position.y, fz: c.position.z, fyaw: c.rotation.y, fp: c.rotation.x, tx: to.x, ty: to.y, tz: to.z, tyaw: c.rotation.y + dy, tp: pitch, t: 0, dur, done };
}
function sitAt(i) {
  const d = W.desks[i]; if (!d || d.npc || Game.deskTaken(i) || P.seated || P.cam) return;
  P.seated = true; P.seat = i; releaseLock(); SFX.click(); P.vx = P.vz = P.kx = P.kz = 0;
  startCam(d.eye, d.rot, -0.08, P.third ? 0.55 : 0.35, () => OS.show());
  Bus.emit('player:sit', i);
}
function standUp() {
  if (!P.seated) return;
  const d = W.desks[P.seat]; OS.hide(); P.seated = false; P.seat = -1;
  if (d) { P.pos.x = d.stand.x; P.pos.z = d.stand.z; P.yaw = d.rot; }
  P.pos.y = 0; P.pitch = 0; P.cam = null; P.boom = 0.4;
  Bus.emit('player:stand');
}
function seatForReview(idx) {
  OS.hide(); P.seated = false; P.seat = -1; P.review = idx; P.cam = null; releaseLock(); P.vx = P.vz = P.kx = P.kz = 0;
  const s = REVIEW_SEATS[idx % REVIEW_SEATS.length]; P.pos.x = s[0]; P.pos.z = s[1]; P.pos.y = 0;
  const a = lookAngles({ x: s[0], y: 1.2, z: s[1] }, { x: BOSS_REVIEW.x, y: 1.0, z: BOSS_REVIEW.z }); P.yaw = a.yaw; P.pitch = a.pitch;
}
/* where this player spawns: W.spawn.players (office module) by player order, else the classic spot */
function spawnSpot() {
  const S = W.spawn && W.spawn.players; if (!S || !S.length) return null;
  let i = 0; if (Net.active) { const ids = [...Net.players.keys()].sort(); i = Math.max(0, ids.indexOf(Net.myId)); }
  return S[i % S.length];
}
function freeSpot(x, z) {
  if (!blocked(x, z)) return [x, z];
  for (let r = 0.3; r < 3; r += 0.3) for (let a = 0; a < 6.28; a += 0.5) { const nx = x + Math.cos(a) * r, nz = z + Math.sin(a) * r; if (!blocked(nx, nz)) return [nx, nz]; }
  return [x, z];
}
function leaveReview() {
  if (P.review < 0) return; P.review = -1; P.pitch = 0;
  const s = spawnSpot(); if (s) { const f = freeSpot(s.x, s.z); P.pos.x = f[0]; P.pos.z = f[1]; P.yaw = s.yaw != null ? s.yaw : Math.PI / 2; }
  else { P.pos.x = 14; P.pos.z = -2; P.yaw = Math.PI / 2; }
}
function resetPlayer() {
  const s = spawnSpot();
  if (s) { const f = freeSpot(s.x + rand(-0.15, 0.15), s.z + rand(-0.15, 0.15)); P.pos.x = f[0]; P.pos.z = f[1]; P.yaw = s.yaw != null ? s.yaw : Math.PI / 2; }
  else { P.pos.x = 8 + rand(-0.8, 0.8); P.pos.z = rand(-1, 1); P.yaw = Math.PI / 2; }
  P.pos.y = 0; P.pitch = 0; P.seated = false; P.seat = -1; P.review = -1; P.cam = null; P.boost = 0;
  P.vx = P.vz = P.kx = P.kz = P.vy = 0; P.stunT = 0; P.boom = 0;
}

/* left click while the pointer is locked (world.js calls this). The press itself is handled on mousedown
   (hold-to-use items), so the click that follows is ignored. */
function tryThrow() { if (Props._own) { Props._own = false; return; } Props.throwSel(); }
/* compat: Net's old 'throw' message spawns a paper ball */
function spawnBall(o, v, local) { return Props.spawn('paper', o, v, { local: !!local }); }
function setThird(on) {
  P.third = !!on; P.boom = 0.3; try { Store.set('tli_third', P.third); } catch (e) {}
  toast(P.third ? 'Third-person camera. Press C to go back.' : 'First-person camera.');
}

/* ---------- input (items, punching, camera) ---------- */
let _wheelT = 0;
window.addEventListener('keydown', e => {
  const tag = e.target && e.target.tagName; if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || G.phase === 'menu' || !Game.canControl()) return;
  if (/^Digit[1-6]$/.test(e.code)) Props.select(+e.code.slice(5) - 1);
  else if (e.code === 'KeyQ') Props.punch();
  else if (e.code === 'KeyC' && !e.repeat) setThird(!P.third);
  else if (e.code === 'KeyG' && !e.repeat) Props.drop();
});
window.addEventListener('wheel', e => { if (G.phase === 'menu' || !Game.canControl() || now() - _wheelT < 0.09 || !e.deltaY) return; _wheelT = now(); Props.cycle(e.deltaY > 0 ? 1 : -1); }, { passive: true });
window.addEventListener('mouseup', e => { if (e.button === 0) Props.endUse(); });
Bus.on('world:built', () => {
  const cv = W.renderer.domElement;
  cv.addEventListener('contextmenu', e => e.preventDefault());
  cv.addEventListener('mousedown', e => {
    if (!P.locked || !Game.canControl()) return;
    if (e.button === 0) { Props._own = true; Props.startUse(); } else if (e.button === 2) Props.punch();
  });
});

/* ---------- camera helpers ---------- */
function applyFov(cam, dt) {
  const fov = settings.fov + 7 * P.fovK; if (Math.abs(cam.fov - fov) > 0.01) { cam.fov = fov; cam.updateProjectionMatrix(); }
}
/* third person: a boom behind and above the player that slides in when a wall or the ceiling is in the way */
function thirdCam(cam, dt) {
  const cp = Math.cos(P.pitch), sp = Math.sin(P.pitch), sy = Math.sin(P.yaw), cy = Math.cos(P.yaw);
  const hx = P.pos.x, hy = P.pos.y + 1.45, hz = P.pos.z;
  let ox = sy * cp * PC.boom + cy * 0.55, oy = -sp * PC.boom + 0.75, oz = cy * cp * PC.boom - sy * 0.55;
  const len = Math.hypot(ox, oy, oz); ox /= len; oy /= len; oz /= len;
  const hit = Math.max(0.05, Space.ray(hx, hy, hz, ox, oy, oz, len, 0.2) - 0.08);
  P.boom = hit < P.boom ? hit : lerp(P.boom, hit, 1 - Math.exp(-dt * 4));
  cam.position.set(hx + ox * P.boom, hy + oy * P.boom, hz + oz * P.boom);
}
function setMeVisible(v) { if (W.me && P._meVis !== v) { P._meVis = v; W.me.group.visible = v; } }

function updateWorld(dt, t) {
  W.t = t; const cam = W.camera; let free = false;
  if (G.phase === 'menu') {
    cam.position.set(Math.cos(t * 0.05) * 9.5, 2.55, Math.sin(t * 0.05) * 6.2);
    cam.rotation.set(0, 0, 0); cam.lookAt(0, 1.2, 0); cam.rotation.order = 'YXZ';
  } else if (P.cam) {
    const c = P.cam; c.t = Math.min(1, c.t + dt / c.dur); const k = c.t * c.t * (3 - 2 * c.t);
    cam.position.set(lerp(c.fx, c.tx, k), lerp(c.fy, c.ty, k), lerp(c.fz, c.tz, k));
    cam.rotation.set(lerp(c.fp, c.tp, k), lerp(c.fyaw, c.tyaw, k), 0);
    if (c.t >= 1) { P.cam = null; c.done && c.done(); }
  } else if (P.seated) {
    const d = W.desks[P.seat]; cam.position.set(d.eye.x, d.eye.y, d.eye.z); cam.rotation.set(-0.08, d.rot, 0);
  } else if (P.review >= 0) {
    cam.position.set(P.pos.x, 1.2, P.pos.z); cam.rotation.set(P.pitch, P.yaw + Math.sin(t * 0.4) * 0.02, 0);
  } else {
    free = true;
    const ctl = Game.canControl(), stunned = P.stunT > 0;
    if (stunned) P.stunT -= dt;
    let f = 0, s = 0, run = false;
    if (ctl) {
      f = ((Keys.KeyW || Keys.ArrowUp) ? 1 : 0) - ((Keys.KeyS || Keys.ArrowDown) ? 1 : 0); s = ((Keys.KeyD || Keys.ArrowRight) ? 1 : 0) - ((Keys.KeyA || Keys.ArrowLeft) ? 1 : 0);
      run = !!(Keys.ShiftLeft || Keys.ShiftRight) && f >= 0;
    }
    const ground = P.pos.y <= 0.001, sy = Math.sin(P.yaw), cy = Math.cos(P.yaw);
    let wx = 0, wz = 0;
    if (f || s) {
      const l = Math.hypot(f, s), sp = (run ? PC.run : PC.walk) * (P.boost > 0 ? 1.3 : 1) * (stunned ? 0.15 : 1);
      wx = (-sy * f + cy * s) / l * sp; wz = (-cy * f - sy * s) / l * sp;
    }
    // smooth acceleration towards the wanted velocity (less control in the air)
    const a = (ground ? ((f || s) ? PC.accel : PC.decel) : PC.air) * dt;
    let dvx = wx - P.vx, dvz = wz - P.vz; const dl = Math.hypot(dvx, dvz); if (dl > a) { dvx *= a / dl; dvz *= a / dl; }
    P.vx += dvx; P.vz += dvz;
    const kd = Math.exp(-dt * (ground ? 4.5 : 1)); P.kx *= kd; P.kz *= kd; if (Math.abs(P.kx) + Math.abs(P.kz) < 0.02) P.kx = P.kz = 0;
    const dx = (P.vx + P.kx) * dt, dz = (P.vz + P.kz) * dt;
    const stuck = blocked(P.pos.x, P.pos.z);
    if (stuck || !blocked(P.pos.x + dx, P.pos.z)) P.pos.x += dx; else { P.vx = 0; P.kx *= -0.3; }
    if (stuck || !blocked(P.pos.x, P.pos.z + dz)) P.pos.z += dz; else { P.vz = 0; P.kz *= -0.3; }
    const B = W.bounds || { x0: -11.6, x1: 19.6, z0: -8.6, z1: 8.6 };
    P.pos.x = clamp(P.pos.x, B.x0, B.x1); P.pos.z = clamp(P.pos.z, B.z0, B.z1);
    P.speed = Math.hypot(P.vx, P.vz);
    if (ctl && Keys.Space && ground && !stunned) { P.vy = PC.jump; FXSnd.noise(0.1, 0.05, 0, 500, 900, 'bandpass', 1); }
    if (ctl && Keys.KeyF) Props.throwSel();
    P.vy -= PC.grav * dt; P.pos.y += P.vy * dt;
    if (P.pos.y <= 0) { if (P.vy < -4) { SFX.land(); P.dip = Math.min(0.12, -P.vy * 0.016); } P.pos.y = 0; P.vy = 0; }
    if (P.boost > 0) P.boost -= dt;
    // footsteps on every stride
    if (ground && P.speed > 0.5) { P.bob += dt * P.speed * 2.6; const n = Math.floor(P.bob / Math.PI); if (n !== P.stepN) { P.stepN = n; SFX.step2(run); } }
    P.fovK = lerp(P.fovK, run && P.speed > 4 ? 1 : 0, 1 - Math.exp(-dt * 6));
    P.dip *= Math.exp(-dt * 9);
    P.roll = lerp(P.roll, -s * 0.012 * Math.min(1, P.speed / 3), 1 - Math.exp(-dt * 8));
    const wob = stunned ? Math.sin(t * 7) * 0.07 * Math.min(1, P.stunT) : 0;
    if (P.third) thirdCam(cam, dt);
    else cam.position.set(P.pos.x, P.pos.y + P.eye - P.dip + Math.sin(P.bob) * 0.04 * Math.min(1, P.speed / 3.4), P.pos.z);
    cam.rotation.set(P.pitch + (stunned ? Math.sin(t * 5) * 0.03 : 0), P.yaw + wob * 0.5, P.roll + wob);
  }
  if (!free) { P.fovK = lerp(P.fovK, 0, 1 - Math.exp(-dt * 6)); P.speed = 0; if (P.seated || P.review >= 0) P.stunT = 0; }
  applyFov(cam, dt);
  setMeVisible(free && P.third && P.boom > 0.75);
  updateAvatars(dt, t);
  // what is the player looking at? (from the head, so it works in third person too)
  let best = null, bd = 2.3;
  if (Game.canControl() && !P.seated && P.review < 0) {
    const cy = Math.cos(P.yaw), sy = Math.sin(P.yaw), cp = Math.cos(P.pitch), ex = P.pos.x, ey = P.pos.y + P.eye, ez = P.pos.z;
    for (const it of W.interact) {
      const dx = it.pos.x - ex, dy = it.pos.y - ey, dz = it.pos.z - ez, d = Math.hypot(dx, dy, dz);
      if (d > bd) continue;
      const dot = (dx * -sy * cp + dy * Math.sin(P.pitch) + dz * -cy * cp) / (d || 1);
      if (dot > (it.prop ? 0.9 : 0.72) && it.label()) { best = it; bd = d; }
    }
  }
  W.cur = best;
}
function renderWorld() { W.renderer.render(W.scene, W.camera); }
