'use strict';
/* AVATARS — character models, name tags, animation, remote-player sync */
/* ---------- avatars ---------- */
function makeLabelSprite(text, big) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const g = c.getContext('2d'), tex = new THREE.CanvasTexture(c);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
  sp.scale.set(big ? 0.5 : 1.3, big ? 0.125 * 2.6 : 0.325, 1);
  sp.userData.set = t => {
    g.clearRect(0, 0, 256, 64); g.font = 'bold 30px Karla, "Segoe UI", sans-serif';
    const w = Math.min(244, g.measureText(t).width + 30);
    g.fillStyle = 'rgba(15,19,29,.82)'; rrect(g, (256 - w) / 2, 9, w, 46, 12); g.fill();
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, 128, 33, 232); tex.needsUpdate = true;
  };
  sp.userData.set(text); return sp;
}
function buildAvatar(o) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const skin = mat(o.skin), shirt = new THREE.MeshLambertMaterial({ color: o.shirt }), pants = mat(o.boss ? '#22252e' : '#39415a'), dark = mat('#1a1d26');
  box(0.46, 0.58, 0.26, 0, 1.08, 0, shirt, body);
  const head = new THREE.Group(); head.position.set(0, 1.58, 0); body.add(head);
  const headMat = new THREE.MeshLambertMaterial({ color: o.skin });
  box(0.36, 0.38, 0.34, 0, 0, 0, headMat, head);
  box(0.05, 0.07, 0.02, -0.08, 0.04, -0.175, dark, head); box(0.05, 0.07, 0.02, 0.08, 0.04, -0.175, dark, head);
  box(0.13, 0.03, 0.02, 0, -0.1, -0.175, dark, head);
  if (o.boss) { box(0.2, 0.045, 0.02, 0, -0.045, -0.178, mat('#5a5a5a'), head); box(0.12, 0.03, 0.02, -0.08, 0.11, -0.175, dark, head).rotation.z = -0.35; box(0.12, 0.03, 0.02, 0.08, 0.11, -0.175, dark, head).rotation.z = 0.35; }
  if (o.hair) { box(0.38, 0.1, 0.36, 0, 0.22, 0, mat(o.hair), head); box(0.38, 0.2, 0.08, 0, 0.1, 0.15, mat(o.hair), head); }
  if (o.headset !== false) {
    box(0.43, 0.035, 0.06, 0, 0.29, 0, dark, head); box(0.05, 0.14, 0.13, -0.205, 0.03, 0, dark, head); box(0.05, 0.14, 0.13, 0.205, 0.03, 0, dark, head);
    box(0.02, 0.02, 0.2, -0.21, -0.07, -0.1, dark, head); box(0.04, 0.04, 0.04, -0.2, -0.07, -0.2, dark, head);
  }
  if (o.boss) box(0.08, 0.32, 0.02, 0, 1.16, -0.135, mat('#c0261f'), body); else box(0.11, 0.07, 0.012, 0.12, 1.2, -0.135, mat('#ffffff'), body);
  const arm = x => { const p = new THREE.Group(); p.position.set(x, 1.33, 0); body.add(p); box(0.13, 0.34, 0.14, 0, -0.15, 0, shirt, p); box(0.12, 0.22, 0.13, 0, -0.42, 0, skin, p); return p; };
  const leg = x => { const p = new THREE.Group(); p.position.set(x, 0.79, 0); body.add(p); box(0.17, 0.7, 0.19, 0, -0.36, 0, pants, p); box(0.18, 0.09, 0.26, 0, -0.745, -0.03, dark, p); return p; };
  const sh = new THREE.Mesh(new THREE.CircleGeometry(0.34, 16), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.25, depthWrite: false })); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.015; g.add(sh);
  const tag = makeLabelSprite(o.name || ''); tag.position.y = 2.12; tag.visible = !!o.name; g.add(tag);
  const talk = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshBasicMaterial({ color: 0x27c07a })); talk.position.y = 2.38; talk.visible = false; g.add(talk);
  return { group: g, body, head, headMat, shirt, armL: arm(-0.3), armR: arm(0.3), legL: leg(-0.115), legR: leg(0.115), tag, talk, phase: Math.random() * 6,
    /* contract (docs/ARCHITECTURE.md): one-shot actions and reactions. Stubs until the avatar module implements them. */
    play(action) {}, stun(sec) {} };
}
function poseAvatar(a, sit, t, speed) {
  if (sit) {
    a.body.position.y = -0.27; a.legL.rotation.x = a.legR.rotation.x = Math.PI / 2;
    a.armL.rotation.x = 1.0 + Math.sin(t * 9 + a.phase) * 0.07; a.armR.rotation.x = 1.0 + Math.cos(t * 8 + a.phase) * 0.07;
    a.head.rotation.y = Math.sin(t * 0.6 + a.phase) * 0.15;
  } else {
    a.body.position.y = 0; const s = Math.sin(t * 10 + a.phase) * 0.7 * Math.min(1, speed / 3);
    a.legL.rotation.x = s; a.legR.rotation.x = -s; a.armL.rotation.x = -s * 0.8; a.armR.rotation.x = s * 0.8; a.head.rotation.y = 0;
  }
}
/* remote players: create/remove avatars and feed them target positions */
function syncAvatars(players, myId) {
  for (const [id, a] of W.avatars) if (!players.has(id) || id === myId) { W.scene.remove(a.av.group); W.avatars.delete(id); }
  for (const [id, p] of players) {
    if (id === myId) continue;
    let a = W.avatars.get(id);
    if (!a) {
      const hsh = hashStr(p.name || id);
      a = { av: buildAvatar({ shirt: p.color || '#3b82f6', skin: SKINS[hsh % SKINS.length], hair: HAIRS[(hsh >> 4) % HAIRS.length], name: p.name || 'Agent' }), x: p.x, z: p.z, y: 0, ry: p.ry || 0, name: p.name, color: p.color, speed: 0 };
      a.av.group.position.set(p.x || 0, 0, p.z || 0); W.scene.add(a.av.group); W.avatars.set(id, a);
    }
    if (a.name !== p.name) { a.name = p.name; a.av.tag.userData.set(p.name || 'Agent'); }
    if (a.color !== p.color) { a.color = p.color; a.av.shirt.color.set(p.color || '#3b82f6'); }
    a.tx = p.x; a.tz = p.z; a.ty = p.y || 0; a.tr = p.ry || 0; a.seat = p.seat; a.talk = !!p.talk;
  }
}
function updateAvatars(dt, t) {
  for (const a of W.avatars.values()) {
    const g = a.av.group; let sit = false, tx = a.tx, tz = a.tz, tr = a.tr, ty = a.ty;
    if (a.seat >= 0 && W.desks[a.seat]) { const d = W.desks[a.seat]; tx = d.seat.x; tz = d.seat.z; tr = d.rot; ty = 0; sit = true; }
    else if (a.seat <= -10) { const s = REVIEW_SEATS[(-a.seat - 10) % REVIEW_SEATS.length]; tx = s[0]; tz = s[1]; tr = -Math.PI / 2; ty = 0; sit = true; }
    const k = 1 - Math.exp(-dt * 12), ox = g.position.x, oz = g.position.z;
    if (Math.hypot(tx - ox, tz - oz) > 6) { g.position.x = tx; g.position.z = tz; } else { g.position.x = lerp(ox, tx, k); g.position.z = lerp(oz, tz, k); }
    g.position.y = lerp(g.position.y, ty, k);
    let dr = tr - g.rotation.y; dr = Math.atan2(Math.sin(dr), Math.cos(dr)); g.rotation.y += dr * k;
    a.speed = lerp(a.speed, Math.hypot(g.position.x - ox, g.position.z - oz) / Math.max(dt, 0.001), 0.3);
    poseAvatar(a.av, sit, t, a.speed);
    a.av.talk.visible = a.talk; if (a.talk) a.av.talk.scale.setScalar(1 + Math.sin(t * 14) * 0.25);
  }
  W.npcs.forEach(n => poseAvatar(n, true, t, 0));
  poseAvatar(W.boss, false, t, 0);
  W.boss.armL.rotation.x = W.boss.armR.rotation.x = 0; W.boss.armL.rotation.z = -0.5; W.boss.armR.rotation.z = 0.5;
  W.boss.head.rotation.y = Math.sin(t * 0.7) * 0.5;
}

/* ---------- the local player's own body (W.me) ----------
   Hidden in first person. Shown by the third-person camera and the webcam. Follows P every frame. */
Bus.on('world:built', () => {
  const hsh = hashStr(settings.name || 'me');
  W.me = buildAvatar({ shirt: settings.color, skin: SKINS[hsh % SKINS.length], hair: HAIRS[(hsh >> 4) % HAIRS.length], name: '' });
  W.me.group.visible = false; W.scene.add(W.me.group);
});
Loop.add((dt, t) => {
  const a = W.me; if (!a) return;
  const g = a.group; let sit = false;
  if (P.seated && W.desks[P.seat]) { const d = W.desks[P.seat]; g.position.set(d.seat.x, 0, d.seat.z); g.rotation.y = d.rot; sit = true; }
  else if (P.review >= 0) { const s = REVIEW_SEATS[P.review % REVIEW_SEATS.length]; g.position.set(s[0], 0, s[1]); g.rotation.y = -Math.PI / 2; sit = true; }
  else { g.position.set(P.pos.x, P.pos.y, P.pos.z); g.rotation.y = P.yaw; }
  if (a.shirt && a._col !== settings.color) { a._col = settings.color; a.shirt.color.set(settings.color); }
  poseAvatar(a, sit, t, P.speed || 0);
});
/* the avatar for a player id: yourself (W.me) or a remote player's avatar; null if unknown */
function avatarOf(id) {
  if (!Net.active || id === Net.myId || id === 'me') return W.me || null;
  const a = W.avatars.get(id); return a ? a.av : null;
}

