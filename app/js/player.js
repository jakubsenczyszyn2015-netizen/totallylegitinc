'use strict';
/* PLAYER — local movement, camera, sitting, throwing, interaction */
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
  P.seated = true; P.seat = i; releaseLock(); SFX.click();
  startCam(d.eye, d.rot, -0.08, 0.35, () => OS.show());
  Bus.emit('player:sit', i);
}
function standUp() {
  if (!P.seated) return;
  const d = W.desks[P.seat]; OS.hide(); P.seated = false; P.seat = -1;
  if (d) { P.pos.x = d.stand.x; P.pos.z = d.stand.z; P.yaw = d.rot; }
  P.pos.y = 0; P.pitch = 0; P.cam = null;
  Bus.emit('player:stand');
}
function seatForReview(idx) {
  OS.hide(); P.seated = false; P.seat = -1; P.review = idx; P.cam = null; releaseLock();
  const s = REVIEW_SEATS[idx % REVIEW_SEATS.length]; P.pos.x = s[0]; P.pos.z = s[1]; P.pos.y = 0;
  const a = lookAngles({ x: s[0], y: 1.2, z: s[1] }, { x: BOSS_REVIEW.x, y: 1.0, z: BOSS_REVIEW.z }); P.yaw = a.yaw; P.pitch = a.pitch;
}
function leaveReview() { if (P.review < 0) return; P.review = -1; P.pos.x = 14; P.pos.z = -2; P.yaw = Math.PI / 2; P.pitch = 0; }
function resetPlayer() { P.pos.x = 8 + rand(-0.8, 0.8); P.pos.y = 0; P.pos.z = rand(-1, 1); P.yaw = Math.PI / 2; P.pitch = 0; P.seated = false; P.seat = -1; P.review = -1; P.cam = null; P.boost = 0; }

function tryThrow() {
  if (!Game.canControl() || W.t < P.throwT) return;
  P.throwT = W.t + 0.35;
  const cy = Math.cos(P.yaw), sy = Math.sin(P.yaw), cp = Math.cos(P.pitch), sp = Math.sin(P.pitch);
  const dir = [-sy * cp, sp, -cy * cp];
  const o = [P.pos.x + dir[0] * 0.4, P.pos.y + P.eye - 0.1 + dir[1] * 0.4, P.pos.z + dir[2] * 0.4], v = [dir[0] * 9, dir[1] * 9 + 2.2, dir[2] * 9];
  spawnBall(o, v, true); SFX.throw(); Net.sendThrow(o, v);
}
function spawnBall(o, v, local) {
  const m = new THREE.Mesh(W.ballGeo, W.ballMat); m.position.set(o[0], o[1], o[2]); W.scene.add(m);
  W.balls.push({ m, vx: v[0], vy: v[1], vz: v[2], life: 16, local });
  if (W.balls.length > 50) W.scene.remove(W.balls.shift().m);
}
function updateBalls(dt) {
  for (let i = W.balls.length - 1; i >= 0; i--) {
    const b = W.balls[i], p = b.m.position; b.life -= dt;
    b.vy -= 9.8 * dt; p.x += b.vx * dt; p.y += b.vy * dt; p.z += b.vz * dt;
    b.m.rotation.x += dt * 6; b.m.rotation.z += dt * 4;
    if (p.y < 0.075) { p.y = 0.075; if (Math.abs(b.vy) > 1.2 && b.local) SFX.bounce(); b.vy = -b.vy * 0.42; b.vx *= 0.72; b.vz *= 0.72; }
    if (p.y > ROOM_H - 0.1) { p.y = ROOM_H - 0.1; b.vy = -Math.abs(b.vy) * 0.4; }
    for (let j = 0; j < W.colliders.length; j++) {
      const c = W.colliders[j]; if (p.y > c.y1 + 0.07) continue;
      if (p.x > c.x0 - 0.07 && p.x < c.x1 + 0.07 && p.z > c.z0 - 0.07 && p.z < c.z1 + 0.07) {
        const px = Math.min(p.x - (c.x0 - 0.07), (c.x1 + 0.07) - p.x), pz = Math.min(p.z - (c.z0 - 0.07), (c.z1 + 0.07) - p.z);
        if (px < pz) { p.x += (p.x - (c.x0 + c.x1) / 2 > 0 ? px : -px); b.vx = -b.vx * 0.5; } else { p.z += (p.z - (c.z0 + c.z1) / 2 > 0 ? pz : -pz); b.vz = -b.vz * 0.5; }
        break;
      }
    }
    let gone = b.life <= 0;
    if (!gone && b.vy < 0 && p.y < 0.46 && p.y > 0.2) for (const bin of W.bins) if (Math.hypot(p.x - bin.x, p.z - bin.z) < 0.19) { gone = true; if (b.local) { SFX.bin(); toast(pick(['Nice shot.', 'Nothing but bin.', 'Put that on your review.']), 'good'); } break; }
    if (gone) { W.scene.remove(b.m); W.balls.splice(i, 1); }
  }
}

function updateWorld(dt, t) {
  W.t = t; const cam = W.camera;
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
    if (Game.canControl()) {
      let f = ((Keys.KeyW || Keys.ArrowUp) ? 1 : 0) - ((Keys.KeyS || Keys.ArrowDown) ? 1 : 0), s = ((Keys.KeyD || Keys.ArrowRight) ? 1 : 0) - ((Keys.KeyA || Keys.ArrowLeft) ? 1 : 0);
      const sp = ((Keys.ShiftLeft || Keys.ShiftRight) ? 5.2 : 3.2) * (P.boost > 0 ? 1.35 : 1);
      let dx = 0, dz = 0;
      if (f || s) { const l = Math.hypot(f, s); f /= l; s /= l; const sy = Math.sin(P.yaw), cy = Math.cos(P.yaw); dx = (-sy * f + cy * s) * sp * dt; dz = (-cy * f - sy * s) * sp * dt; }
      const stuck = blocked(P.pos.x, P.pos.z);
      if (stuck || !blocked(P.pos.x + dx, P.pos.z)) P.pos.x += dx;
      if (stuck || !blocked(P.pos.x, P.pos.z + dz)) P.pos.z += dz;
      P.pos.x = clamp(P.pos.x, -11.6, 19.6); P.pos.z = clamp(P.pos.z, -8.6, 8.6);
      P.speed = (f || s) ? sp : 0;
      if (Keys.Space && P.pos.y <= 0) P.vy = 4.3;
      if (Keys.KeyF) tryThrow();
    } else P.speed = 0;
    P.vy -= 12 * dt; P.pos.y += P.vy * dt; if (P.pos.y <= 0) { P.pos.y = 0; P.vy = 0; }
    if (P.boost > 0) P.boost -= dt;
    P.bob += dt * P.speed * 2.6;
    cam.position.set(P.pos.x, P.pos.y + P.eye + (P.speed ? Math.sin(P.bob) * 0.035 : 0), P.pos.z);
    cam.rotation.set(P.pitch, P.yaw, 0);
  }
  updateAvatars(dt, t); updateBalls(dt);
  // what is the player looking at?
  let best = null, bd = 2.3;
  if (Game.canControl() && !P.seated && P.review < 0) {
    const cy = Math.cos(P.yaw), sy = Math.sin(P.yaw), cp = Math.cos(P.pitch);
    for (const it of W.interact) {
      const dx = it.pos.x - cam.position.x, dy = it.pos.y - cam.position.y, dz = it.pos.z - cam.position.z, d = Math.hypot(dx, dy, dz);
      if (d > bd) continue;
      const dot = (dx * -sy * cp + dy * Math.sin(P.pitch) + dz * -cy * cp) / (d || 1);
      if (dot > 0.72 && it.label()) { best = it; bd = d; }
    }
  }
  W.cur = best;
}
function renderWorld() { W.renderer.render(W.scene, W.camera); }
