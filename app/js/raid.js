'use strict';
/* RAID — police raids on the office, team heat, cartoon self-defence weapons.
   - Heat: a host-owned team meter (Net.share 'raid'). Every closed scam heats it up (more for big payouts, a lot for
     scambaiter disasters); it cools slowly. HUD gauge while walking, a pill on the LegitOS taskbar.
   - Raid (from day 2 when the heat is high, or a rare random check): sirens, red/blue light through the windows,
     the main door bursts open and cartoon cops (buildAvatar + cap, badge, shades) chase the nearest player on a
     flow-field grid around W.colliders. A tag = arrest: cuffs, a fine, a mugshot in the lobby, back at the door.
     Cops that take enough hits see stars and run out. The host simulates, clients interpolate (~10 Hz snapshots).
   - Weapons: BonkMart goods, section 'Weapons & personal safety' (ItemDefs + the props hotbar). They work on
     teammates too (mild slapstick knockback).
   - Coworkers dive under their desks, The Boss hides behind his.
   See docs/modules/raid.md. */

const RAID = {
  cool: 0.1, risk: 70, max: 100, day: 2, dur: 75, gap: 90, warn: 45,   // heat/s, random-raid threshold, first day, raid length, min gap, no raid this close to the review
  hp: 4, speed: 4.5, tag: 0.8, immune: 9,                               // cops: hit points, run speed, tag reach, how long an arrested player is left alone
  fine: 0.25, fineMin: 40, bonus: 150, hazard: 150, leaveFine: 0.1      // arrest fine (share of wallet), team bonus per cop, hazard pay, petty-cash seizure
};
const _rV = new THREE.Vector3(), _rV2 = new THREE.Vector3(), _rQ = new THREE.Quaternion(), _rM = new THREE.Matrix4(), _rS = new THREE.Vector3(1, 1, 1), _rZ = new THREE.Vector3(0, 0, 1), _rY = new THREE.Vector3(0, 1, 0);

/* =====================================================================
   ART — weapon models, cop accessories, darts, cuffs (shared geometry and materials).
   Weapons are modelled in the hand's frame (avatars.md: fingers -Y, thumb forward -Z):
   guns point their muzzle down -Y with the grip running back along +Z, spray cans and melee weapons
   point forward along -Z. That way an arm raised to aim ('point', 'spray') aims the weapon too.
   ===================================================================== */
const RaidArt = (() => {
  const G0 = {}, once = (k, f) => G0[k] || (G0[k] = f());
  const PI = Math.PI;
  let vc = null, lab = null, glass = null; const caseNo = 100 + Math.floor(Math.random() * 899);
  const CELLS = {};
  const vcMat = () => vc || (vc = new THREE.MeshLambertMaterial({ vertexColors: true }));
  const sph = (r, w, h) => once('s' + r + w + h, () => new THREE.SphereGeometry(r, w || 14, h || 10));
  /* one label atlas for every printed decal (weapon labels, POLICE back print, mugshot board) */
  function labMat() {
    if (lab) return lab;
    const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const g = c.getContext('2d');
    let x = 0, y = 0, rowH = 0;
    const cell = (name, w, hh, draw) => {
      if (x + w > 1024) { x = 0; y += rowH; rowH = 0; }
      g.save(); g.translate(x, y); g.beginPath(); g.rect(0, 0, w, hh); g.clip(); draw(g, w, hh); g.restore();
      CELLS[name] = { u0: (x + 1) / 1024, u1: (x + w - 1) / 1024, v0: 1 - (y + hh - 1) / 512, v1: 1 - (y + 1) / 512 }; x += w; rowH = Math.max(rowH, hh);
    };
    const F = '"Lilita One", "Arial Black", sans-serif', S = '"Alfa Slab One", Georgia, serif';
    const txt = (g, t, cx, cy, size, fill, stroke, lw, font) => { g.font = size + 'px ' + (font || F); g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round'; if (stroke) { g.lineWidth = lw || 6; g.strokeStyle = stroke; g.strokeText(t, cx, cy); } g.fillStyle = fill; g.fillText(t, cx, cy); };
    cell('police', 256, 72, (g, w, hh) => txt(g, 'POLICE', w / 2, hh / 2 + 2, 60, '#ffe14a', '#0f1730', 8));
    cell('taser', 256, 64, (g, w, hh) => { txt(g, 'TASER-ISH', w / 2, hh / 2 + 2, 46, '#1a1c22'); });
    cell('foam', 256, 64, (g, w, hh) => { txt(g, 'CONFLICT  RES.', w / 2, hh / 2 + 2, 40, '#ffffff', '#123a7a', 7); });
    cell('sniper', 256, 64, (g, w, hh) => { txt(g, 'REMOTE-WORK', w / 2, hh / 2 + 2, 40, '#ffffff', '#7a2a00', 7); });
    cell('stress', 256, 64, (g, w, hh) => { txt(g, 'CHILL OUT', w / 2, hh / 2 + 2, 44, '#ffffff', '#1d5a2c', 7); });
    cell('bat', 256, 64, (g, w, hh) => { txt(g, 'BATTON', w / 2, hh / 2 + 3, 52, '#ffd23b', '#000000', 6, S); });
    cell('shield', 512, 128, (g, w, hh) => { txt(g, 'CUSTOMER', w / 2, 38, 54, '#ffffff', '#0f1730', 10); txt(g, 'SUPPORT', w / 2, 94, 54, '#ffffff', '#0f1730', 10); });
    cell('smile', 128, 128, (g, w, hh) => {
      g.fillStyle = '#ffd23b'; g.beginPath(); g.arc(64, 64, 56, 0, 7); g.fill(); g.lineWidth = 7; g.strokeStyle = '#3a2a00'; g.stroke();
      g.fillStyle = '#3a2a00'; g.beginPath(); g.ellipse(44, 52, 7, 11, 0, 0, 7); g.ellipse(84, 52, 7, 11, 0, 0, 7); g.fill();
      g.lineWidth = 8; g.lineCap = 'round'; g.beginPath(); g.arc(64, 66, 32, 0.35, PI - 0.35); g.stroke();
    });
    cell('bear', 128, 128, (g) => {
      g.fillStyle = '#ffffff'; g.beginPath(); g.arc(64, 64, 60, 0, 7); g.fill();
      g.fillStyle = '#7a4a24'; [[30, 34], [98, 34]].forEach(p => { g.beginPath(); g.arc(p[0], p[1], 16, 0, 7); g.fill(); });
      g.beginPath(); g.arc(64, 70, 42, 0, 7); g.fill(); g.fillStyle = '#d9a46a'; g.beginPath(); g.ellipse(64, 86, 20, 15, 0, 0, 7); g.fill();
      g.fillStyle = '#1a1210'; g.beginPath(); g.arc(48, 60, 6, 0, 7); g.arc(80, 60, 6, 0, 7); g.fill(); g.beginPath(); g.ellipse(64, 80, 8, 6, 0, 0, 7); g.fill();
      g.strokeStyle = '#d6342c'; g.lineWidth = 6; g.beginPath(); g.moveTo(36, 46); g.lineTo(56, 52); g.moveTo(92, 46); g.lineTo(72, 52); g.stroke();   // angry brows
    });
    cell('mace', 256, 64, (g, w, hh) => { txt(g, 'BEAR MACE', w / 2, hh / 2 + 2, 46, '#ffffff', '#5a1a00', 7); });
    cell('mug', 256, 384, (g, w, hh) => {   // mugshot height chart
      g.fillStyle = '#d9dde6'; g.fillRect(0, 0, w, hh);
      for (let i = 0; i <= 24; i++) { const yy = hh - 14 - i * 15; g.fillStyle = i % 4 === 0 ? '#2a3040' : '#7d8596'; g.fillRect(0, yy, i % 4 === 0 ? w : w * 0.18, i % 4 === 0 ? 3 : 2); if (i % 4 === 0 && i) { g.fillStyle = '#2a3040'; g.font = '20px ' + F; g.textAlign = 'left'; g.fillText((i / 4 + 1) + "'", 8, yy - 6); } }
      g.fillStyle = '#1b2747'; g.fillRect(0, 0, w, 44); txt(g, 'TOTALLY ARRESTED', w / 2, 23, 26, '#ffe14a');
    });
    cell('plate', 256, 96, (g, w, hh) => {
      g.fillStyle = '#15171c'; g.fillRect(0, 0, w, hh); g.strokeStyle = '#f4f1ea'; g.lineWidth = 4; g.strokeRect(6, 6, w - 12, hh - 12);
      txt(g, 'TOTALLY LEGIT INC.', w / 2, 32, 26, '#f4f1ea'); txt(g, 'CASE  #404-' + caseNo, w / 2, 66, 28, '#ffe14a');
    });
    const t = new THREE.CanvasTexture(c); t.anisotropy = 4;
    lab = new THREE.MeshLambertMaterial({ map: t, transparent: true, alphaTest: 0.2 });
    return lab;
  }
  function decalGeo(name, w, hh) {
    labMat(); return once('d' + name + w + 'x' + hh, () => { const g = new THREE.PlaneGeometry(w, hh), U = g.attributes.uv, c = CELLS[name]; for (let i = 0; i < U.count; i++) U.setXY(i, c.u0 + U.getX(i) * (c.u1 - c.u0), c.v0 + U.getY(i) * (c.v1 - c.v0)); return g; });
  }
  /* builder: vertex-coloured parts + decals + see-through parts, merged into 1-3 meshes */
  function B(p) {
    const it = [], dc = [], gl = [];
    const o2 = o => p ? Object.assign({}, o || {}, { p }) : o;
    return {
      add(geo, x, y, z, col, o) { it.push(geo, xf(x, y, z, o2(o)), col); return this; },
      dec(name, w, hh, x, y, z, o) { dc.push(decalGeo(name, w, hh), xf(x, y, z, o2(o)), '#ffffff'); return this; },
      glass(geo, x, y, z, o) { gl.push(geo, xf(x, y, z, o2(o)), '#ffffff'); return this; },
      done(extra) { return Object.assign({ g: mergeGeos(it), d: dc.length ? mergeGeos(dc) : null, s: gl.length ? mergeGeos(gl) : null }, extra || {}); }
    };
  }
  const glassMat = () => glass || (glass = new THREE.MeshPhongMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.42, shininess: 90, specular: 0x666666, side: THREE.DoubleSide, depthWrite: false }));
  function mesh(def) {
    const m = new THREE.Mesh(def.g, vcMat());
    if (def.d) m.add(new THREE.Mesh(def.d, labMat()));
    if (def.s) { const s = new THREE.Mesh(def.s, glassMat()); s.renderOrder = 2; m.add(s); }
    return m;
  }
  const tilt = new THREE.Matrix4().makeRotationX(-0.45);   // melee weapons droop a little in a relaxed fist
  /* ----- weapons (hand frame) ----- */
  const MAKE = {
    mace: () => B().add(cylGeo(0.03, 0.03, 0.13, 16), 0, 0, 0, '#262a33', { rx: -PI / 2 }).add(cylGeo(0.0306, 0.0306, 0.064, 16), 0, 0, 0.004, '#ff7a1a', { rx: -PI / 2 })
      .add(cylGeo(0.018, 0.03, 0.022, 16), 0, 0, -0.076, '#c9ccd2', { rx: -PI / 2 }).add(cylGeo(0.017, 0.017, 0.028, 12), 0, 0, -0.1, '#d6342c', { rx: -PI / 2 })
      .add(boxGeo(0.012, 0.012, 0.012), 0, -0.017, -0.106, '#15171c').add(cylGeo(0.031, 0.031, 0.008, 16), 0, 0, 0.062, '#15171c', { rx: -PI / 2 })
      .dec('bear', 0.046, 0.046, 0.0312, 0, 0.004, { ry: PI / 2 }).dec('bear', 0.046, 0.046, -0.0312, 0, 0.004, { ry: -PI / 2 })
      .dec('mace', 0.06, 0.016, 0, -0.0312, 0.004, { rx: PI / 2, rz: PI / 2 }).done({ thumb: { rx: 0.2, ry: -0.5, zoom: 1.25 }, show: [PI / 2, 0, 0.25] }),
    taser: () => B().add(rboxGeo(0.052, 0.19, 0.064, 0.016, 2), 0, -0.05, -0.042, '#ffd43b').add(rboxGeo(0.054, 0.045, 0.066, 0.01, 1), 0, -0.162, -0.042, '#1d2026')
      .add(boxGeo(0.007, 0.016, 0.007), 0.013, -0.19, -0.042, '#dfe3e8').add(boxGeo(0.007, 0.016, 0.007), -0.013, -0.19, -0.042, '#dfe3e8')
      .add(boxGeo(0.054, 0.014, 0.066), 0, -0.105, -0.042, '#1d2026').add(rboxGeo(0.046, 0.058, 0.105, 0.016, 2), 0, 0.004, 0.035, '#25282f', { rx: 0.22 })
      .add(boxGeo(0.01, 0.006, 0.036), 0, -0.036, 0.002, '#25282f').add(boxGeo(0.008, 0.02, 0.008), 0, -0.022, -0.004, '#d6342c')
      .add(cylGeo(0.008, 0.008, 0.012, 8), 0, 0.03, -0.075, '#3bd0ff', { rx: -PI / 2 })
      .dec('taser', 0.13, 0.032, 0.0265, -0.045, -0.042, { ry: PI / 2, rz: -PI / 2 }).dec('taser', 0.13, 0.032, -0.0265, -0.045, -0.042, { ry: -PI / 2, rz: PI / 2 })
      .done({ thumb: { rx: 0.15, ry: 0.15, zoom: 1.25 }, show: [PI / 2, -PI / 2, 0] }),
    foam: () => B().add(cylGeo(0.02, 0.02, 0.4, 12), 0.021, -0.2, -0.05, '#2f7de1').add(cylGeo(0.02, 0.02, 0.4, 12), -0.021, -0.2, -0.05, '#2f7de1')
      .add(cylGeo(0.025, 0.025, 0.032, 12), 0.021, -0.39, -0.05, '#ff8a12').add(cylGeo(0.025, 0.025, 0.032, 12), -0.021, -0.39, -0.05, '#ff8a12')
      .add(sph(0.014), 0.021, -0.408, -0.05, '#1f6fd6').add(sph(0.014), -0.021, -0.408, -0.05, '#1f6fd6')
      .add(rboxGeo(0.1, 0.11, 0.064, 0.02, 2), 0, -0.25, -0.05, '#ff8a12').add(boxGeo(0.104, 0.012, 0.068), 0, -0.225, -0.05, '#c45f00').add(boxGeo(0.104, 0.012, 0.068), 0, -0.275, -0.05, '#c45f00')
      .add(rboxGeo(0.066, 0.17, 0.085, 0.016, 2), 0, -0.02, -0.046, '#2459b5').add(rboxGeo(0.05, 0.21, 0.075, 0.018, 2), 0, 0.15, -0.035, '#ffd23b', { rx: -0.12 })
      .add(rboxGeo(0.044, 0.055, 0.095, 0.014, 2), 0, 0.012, 0.028, '#3a3f4a', { rx: 0.22 }).add(boxGeo(0.01, 0.006, 0.034), 0, -0.032, 0.0, '#3a3f4a')
      .dec('foam', 0.15, 0.036, 0.0335, -0.02, -0.046, { ry: PI / 2, rz: -PI / 2 }).dec('foam', 0.15, 0.036, -0.0335, -0.02, -0.046, { ry: -PI / 2, rz: PI / 2 })
      .done({ thumb: { rx: 0.18, ry: 0.15, zoom: 1.12 }, show: [PI / 2, -PI / 2, 0] }),
    sniper: () => B().add(rboxGeo(0.05, 0.32, 0.078, 0.018, 2), 0, -0.07, -0.045, '#ff8a12').add(cylGeo(0.016, 0.016, 0.42, 12), 0, -0.43, -0.06, '#f1efe8')
      .add(cylGeo(0.023, 0.023, 0.045, 12), 0, -0.64, -0.06, '#ffd23b').add(sph(0.015), 0, -0.665, -0.06, '#1f6fd6')
      .add(cylGeo(0.021, 0.021, 0.19, 14), 0, -0.09, -0.108, '#30343e').add(cylGeo(0.028, 0.024, 0.035, 14), 0, -0.19, -0.108, '#30343e').add(cylGeo(0.026, 0.028, 0.03, 14), 0, 0.01, -0.108, '#30343e')
      .add(cylGeo(0.022, 0.022, 0.004, 14), 0, -0.21, -0.108, '#7fd4ff').add(boxGeo(0.014, 0.02, 0.03), 0, -0.13, -0.088, '#30343e').add(boxGeo(0.014, 0.02, 0.03), 0, -0.04, -0.088, '#30343e')
      .add(rboxGeo(0.046, 0.24, 0.095, 0.02, 2), 0, 0.2, -0.032, '#2f7de1', { rx: -0.08 }).add(boxGeo(0.048, 0.03, 0.098), 0, 0.31, -0.03, '#15171c')
      .add(rboxGeo(0.044, 0.058, 0.1, 0.014, 2), 0, 0.012, 0.03, '#3a3f4a', { rx: 0.22 }).add(boxGeo(0.01, 0.006, 0.036), 0, -0.032, 0.0, '#3a3f4a')
      .dec('sniper', 0.17, 0.042, 0.0255, -0.08, -0.045, { ry: PI / 2, rz: -PI / 2 }).dec('sniper', 0.17, 0.042, -0.0255, -0.08, -0.045, { ry: -PI / 2, rz: PI / 2 })
      .done({ thumb: { rx: 0.15, ry: 0.12, zoom: 1.08 }, show: [PI / 2, -PI / 2, 0] }),
    stress: () => B().add(cylGeo(0.05, 0.05, 0.3, 18), 0, -0.13, -0.075, '#38b25a').add(cylGeo(0.059, 0.059, 0.045, 18), 0, -0.28, -0.075, '#ffd23b')
      .add(cylGeo(0.04, 0.04, 0.004, 18), 0, -0.303, -0.075, '#15171c').add(cylGeo(0.055, 0.055, 0.03, 18), 0, 0.03, -0.075, '#8a63d2')
      .add(cylGeo(0.042, 0.036, 0.06, 14), 0, -0.07, -0.145, '#8a63d2', { rx: -PI / 2 }).add(sph(0.024), 0.013, -0.075, -0.18, '#ff5c93').add(sph(0.024), -0.016, -0.06, -0.182, '#3bc9ff').add(sph(0.022), 0.0, -0.09, -0.19, '#ffd23b')
      .add(rboxGeo(0.044, 0.058, 0.1, 0.014, 2), 0, 0.0, 0.0, '#8a63d2', { rx: 0.22 }).add(boxGeo(0.01, 0.006, 0.036), 0, -0.04, -0.028, '#8a63d2')
      .dec('stress', 0.15, 0.037, 0.051, -0.13, -0.075, { ry: PI / 2, rz: -PI / 2 }).dec('stress', 0.15, 0.037, -0.051, -0.13, -0.075, { ry: -PI / 2, rz: PI / 2 })
      .done({ thumb: { rx: 0.2, ry: 0.15, zoom: 1.2 }, show: [PI / 2, -PI / 2, 0] }),
    hammer: () => B(tilt).add(cylGeo(0.02, 0.02, 0.36, 12), 0, 0, -0.12, '#3b82f6', { rx: -PI / 2 }).add(cylGeo(0.026, 0.026, 0.1, 12), 0, 0, 0.02, '#ffd23b', { rx: -PI / 2 })
      .add(cylGeo(0.078, 0.078, 0.22, 20), 0, 0, -0.34, '#ff4d5a', { rz: PI / 2 }).add(cylGeo(0.08, 0.08, 0.03, 20), 0.055, 0, -0.34, '#ffffff', { rz: PI / 2 }).add(cylGeo(0.08, 0.08, 0.03, 20), -0.055, 0, -0.34, '#ffffff', { rz: PI / 2 })
      .add(sph(0.078, 18, 12), 0.11, 0, -0.34, '#ffd23b', { sx: 0.45 }).add(sph(0.078, 18, 12), -0.11, 0, -0.34, '#ffd23b', { sx: 0.45 })
      .add(cylGeo(0.012, 0.012, 0.03, 8), 0, 0.085, -0.34, '#ffffff').dec('smile', 0.08, 0.08, 0, 0, -0.42, { ry: PI })
      .done({ thumb: { rx: 0.2, ry: -0.3, zoom: 1.15 }, show: [PI / 2 + 0.45, 0, -0.6] }),
    baton: () => {
      const prof = [[0.026, 0], [0.027, 0.012], [0.015, 0.024], [0.0145, 0.22], [0.022, 0.33], [0.031, 0.45], [0.034, 0.53], [0.03, 0.556], [0.001, 0.562]].map(p => new THREE.Vector2(p[0], p[1]));
      return B(tilt).add(once('bat', () => new THREE.LatheGeometry(prof, 16)), 0, 0, 0.09, '#1d1f24', { rx: -PI / 2 })
        .add(cylGeo(0.0162, 0.0162, 0.13, 12), 0, 0, 0.0, '#ffd23b', { rx: -PI / 2 }).add(cylGeo(0.0322, 0.034, 0.02, 14), 0, 0, -0.36, '#ffd23b', { rx: -PI / 2 })
        .dec('bat', 0.12, 0.03, 0, 0.0285, -0.29, { rx: -PI / 2, rz: PI / 2 }).dec('bat', 0.12, 0.03, 0, -0.0285, -0.29, { rx: PI / 2, rz: -PI / 2 })
        .done({ thumb: { rx: 0.2, ry: -0.3, zoom: 1.1 }, show: [PI / 2 + 0.45, 0, -0.75] });
    },
    shield: () => {
      const b = B();
      b.glass(rboxGeo(0.46, 0.72, 0.016, 0.06, 2), -0.1, 0.24, -0.12);
      for (const [w, hh, x, y] of [[0.47, 0.035, -0.1, 0.6], [0.47, 0.035, -0.1, -0.12], [0.035, 0.72, 0.13, 0.24], [0.035, 0.72, -0.33, 0.24]]) b.add(rboxGeo(w, hh, 0.034, 0.012, 1), x, y, -0.12, '#2a2f3a');
      b.add(boxGeo(0.4, 0.13, 0.004), -0.1, 0.4, -0.131, '#1b2747').dec('shield', 0.38, 0.095, -0.1, 0.4, -0.134, { ry: PI }).dec('smile', 0.1, 0.1, -0.1, 0.1, -0.13, { ry: PI });
      b.add(boxGeo(0.03, 0.14, 0.03), 0, 0.02, -0.075, '#2a2f3a').add(boxGeo(0.03, 0.03, 0.05), 0, 0.08, -0.095, '#2a2f3a').add(boxGeo(0.03, 0.03, 0.05), 0, -0.04, -0.095, '#2a2f3a');
      return b.done({ thumb: { rx: 0.12, ry: -0.45, zoom: 1.15 }, show: [0, PI, 0] });
    }
  };
  const defs = {};
  const def = id => defs[id] || (defs[id] = MAKE[id]());
  /* ----- cop accessories (head / chest bone frames) ----- */
  const capDef = () => once('cap', () => {
    const vis = new THREE.CylinderGeometry(0.205, 0.205, 0.016, 20, 1, false, PI / 2, PI); vis.scale(1, 1, 0.78);
    const star = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = -PI / 2 + i * PI / 5, r = i % 2 ? 0.016 : 0.036; i ? star.lineTo(Math.cos(a) * r, -Math.sin(a) * r) : star.moveTo(Math.cos(a) * r, -Math.sin(a) * r); }
    const sg = new THREE.ExtrudeGeometry(star, { depth: 0.008, bevelEnabled: false }); G0.star = sg;
    return B().add(cylGeo(0.212, 0.22, 0.1, 22), 0, 0.42, 0.012, '#1b2747').add(cylGeo(0.262, 0.214, 0.075, 22), 0, 0.5, 0.03, '#22305a', { rx: -0.1 })
      .add(cylGeo(0.262, 0.262, 0.022, 22), 0, 0.548, 0.034, '#27375f', { rx: -0.1 }).add(cylGeo(0.223, 0.223, 0.032, 22), 0, 0.392, 0.012, '#0f1116')
      .add(vis, 0, 0.372, -0.11, '#121418', { rx: -0.32 }).add(cylGeo(0.036, 0.036, 0.012, 7), 0, 0.452, -0.218, '#f2c14e', { rx: PI / 2 - 0.1 })
      .add(cylGeo(0.02, 0.02, 0.014, 7), 0, 0.452, -0.224, '#fff1a6', { rx: PI / 2 - 0.1 }).done();
  });
  const chestDef = () => once('chest', () => { capDef(); return B().add(G0.star, -0.078, 0.13, -0.121, '#f2c14e', { ry: 0.38 }).add(boxGeo(0.05, 0.075, 0.03), 0.085, 0.16, -0.112, '#15171c', { ry: -0.35 })
    .add(boxGeo(0.012, 0.05, 0.012), 0.098, 0.215, -0.112, '#15171c').dec('police', 0.25, 0.07, 0, 0.145, 0.142).done(); });
  /* ----- darts, stress balls, cuffs ----- */
  const dartGeo = () => once('dart', () => B().add(cylGeo(0.012, 0.012, 0.075, 10), 0, 0, -0.01, '#ff8a12', { rx: PI / 2 }).add(sph(0.014, 10, 8), 0, 0, 0.03, '#1f6fd6', { sz: 0.8 })
    .add(cylGeo(0.0125, 0.0125, 0.012, 10), 0, 0, -0.045, '#ffd23b', { rx: PI / 2 }).done().g);
  const BALLC = ['#ff5c93', '#3bc9ff', '#ffd23b', '#7cf05b', '#b46bff', '#ff8a2b']; let ballN = 0;
  const ballMats = BALLC.map(c => null);
  function ball() {
    const k = ballN++ % BALLC.length, m = ballMats[k] || (ballMats[k] = new THREE.MeshLambertMaterial({ color: BALLC[k] }));
    const g = new THREE.Mesh(sph(0.06, 16, 12), m), face = new THREE.Mesh(decalGeo('smile', 0.07, 0.07), labMat()); face.position.z = 0.061; g.add(face); return g;
  }
  const cuffDef = () => once('cuff', () => B().add(new THREE.TorusGeometry(0.042, 0.009, 6, 18), 0, 0, 0, '#c9ced6', { rx: PI / 2 }).add(boxGeo(0.02, 0.016, 0.026), 0.046, 0, 0, '#9aa1ab').done());
  return {
    vcMat, labMat, decalGeo, mesh, def, MAKE, caseNo,
    weapon(id) { const m = mesh(def(id)); m.name = 'w:' + id; return m; },
    /* the same weapon turned for a shop picture (muzzle to the right, grip down) */
    show(id) { const d = def(id), m = mesh(d), g = new THREE.Group(); m.rotation.set(d.show[0], d.show[1], d.show[2], 'YXZ'); g.add(m); g.userData.thumb = d.thumb; return g; },
    cap: () => mesh(capDef()), chest: () => mesh(chestDef()), dartGeo, ball, cuff: () => mesh(cuffDef()),
    board() {   // the mugshot backdrop (lobby, only during an arrest)
      const g = new THREE.Group(), b = new THREE.Mesh(decalGeo('mug', 1.6, 2.4), labMat()); b.position.y = 1.2; g.add(b);
      const p = new THREE.Mesh(decalGeo('plate', 0.5, 0.19), labMat()); p.position.set(0.55, 0.62, 0.02); g.add(p); return g;
    }
  };
})();

/* =====================================================================
   SOUNDS (procedural, through FXSnd from fx.js)
   ===================================================================== */
const RaidSnd = {
  siren: null,
  sirenOn() {
    if (this.siren || !FXSnd.ok()) return; const c = AudioSys.ctx, g = c.createGain(), f = c.createBiquadFilter(); g.gain.value = 0.0001; f.type = 'lowpass'; f.frequency.value = 1900;
    const mk = (type, base, depth, rate, ph) => { const o = c.createOscillator(), l = c.createOscillator(), lg = c.createGain(); o.type = type; o.frequency.value = base; l.type = 'triangle'; l.frequency.value = rate; lg.gain.value = depth; l.connect(lg); lg.connect(o.frequency); o.connect(f); o.start(); l.start(c.currentTime + ph); return [o, l]; };
    const oscs = [...mk('sawtooth', 820, 300, 0.36, 0), ...mk('square', 826, 300, 0.36, 0.02)];
    f.connect(g); g.connect(AudioSys.sfx); this.siren = { g, oscs };
  },
  sirenVol(v) { if (this.siren) this.siren.g.gain.setTargetAtTime(Math.max(0.0001, v), AudioSys.ctx.currentTime, 0.25); },
  sirenOff() { const s = this.siren; if (!s) return; this.siren = null; s.g.gain.setTargetAtTime(0.0001, AudioSys.ctx.currentTime, 0.3); setTimeout(() => s.oscs.forEach(o => { try { o.stop(); o.disconnect(); } catch (e) {} }), 1500); },
  whistle(pos) { const v = 0.11 * FXSnd.vol(pos); for (let i = 0; i < 2; i++) FXSnd.tone(2500, 2380, 0.1, 'sine', v, i * 0.14); for (let i = 0; i < 9; i++) FXSnd.tone(2620, 2520, 0.035, 'sine', v, 0.3 + i * 0.04); },
  burst(pos) {
    const v = FXSnd.vol(pos); FXSnd.tone(95, 38, 0.55, 'sine', 0.55 * v); FXSnd.noise(0.6, 0.45 * v, 0, 1800, 160, 'lowpass', 0.7); FXSnd.noise(0.09, 0.35 * v, 0, 4200, 1800, 'bandpass', 0.6);
    [2900, 3600, 4300, 3100].forEach((fq, i) => FXSnd.tone(fq, fq * 0.9, 0.18, 'triangle', 0.035 * v, 0.05 + i * 0.05));
  },
  cuffs() { FXSnd.tone(3300, 2900, 0.035, 'square', 0.07); FXSnd.tone(2700, 2500, 0.04, 'square', 0.07, 0.1); for (let i = 0; i < 6; i++) FXSnd.noise(0.014, 0.12, 0.2 + i * 0.028, 5200, 0, 'highpass', 0.8); },
  busted() { [311, 294, 277].forEach((fq, i) => FXSnd.tone(fq, fq * 0.98, 0.3, 'sawtooth', 0.08, 0.45 + i * 0.32, 1500)); FXSnd.tone(262, 240, 0.9, 'sawtooth', 0.08, 1.41, 1300); },
  shutter() { FXSnd.noise(0.035, 0.3, 0, 3000, 0, 'highpass', 0.7); FXSnd.noise(0.05, 0.25, 0.07, 2200, 0, 'bandpass', 1); FXSnd.tone(1800, 600, 0.25, 'sine', 0.05, 0.1); },
  hiss(pos) { const v = FXSnd.vol(pos); FXSnd.noise(0.6, 0.24 * v, 0, 6500, 4200, 'highpass', 0.7); FXSnd.noise(0.15, 0.1 * v, 0, 900, 0, 'lowpass', 0.7); },
  zap(pos) { const v = FXSnd.vol(pos); FXSnd.tone(112, 96, 0.4, 'square', 0.1 * v, 0, 900); FXSnd.noise(0.38, 0.2 * v, 0, 3600, 2400, 'bandpass', 2); for (let i = 0; i < 5; i++) FXSnd.noise(0.025, 0.22 * v, i * 0.07, 6000, 0, 'highpass', 0.7); },
  fwump(pos) { const v = FXSnd.vol(pos); FXSnd.noise(0.15, 0.32 * v, 0, 900, 180, 'lowpass', 0.8); FXSnd.tone(230, 70, 0.13, 'sine', 0.28 * v); },
  thwip(pos) { const v = FXSnd.vol(pos); FXSnd.tone(1300, 280, 0.1, 'triangle', 0.2 * v); FXSnd.noise(0.07, 0.2 * v, 0, 2600, 800, 'bandpass', 1); },
  squeak(pos) { const v = FXSnd.vol(pos); FXSnd.tone(950, 1600, 0.08, 'triangle', 0.13 * v); FXSnd.tone(1600, 1150, 0.09, 'triangle', 0.1 * v, 0.07); },
  boing(pos) { const v = FXSnd.vol(pos); FXSnd.tone(170, 560, 0.1, 'sine', 0.32 * v); FXSnd.tone(560, 150, 0.4, 'sine', 0.26 * v, 0.09); this.squeak(pos); },
  fanfare() { [523, 659, 784, 1047, 1319].forEach((fq, i) => FXSnd.tone(fq, fq, i === 4 ? 0.5 : 0.16, 'triangle', 0.12, i * 0.11)); },
  alarm() { for (let i = 0; i < 3; i++) { FXSnd.tone(880, 880, 0.16, 'square', 0.06, i * 0.36); FXSnd.tone(660, 660, 0.16, 'square', 0.06, i * 0.36 + 0.18); } }
};

/* =====================================================================
   COMIC WORDS ("ZAP!", "BOING!") and extra FX kinds: FX.spawn / FX.net('word' | 'mace' | 'zap', pos, opts)
   ===================================================================== */
const RaidWords = {
  pool: [], mats: {},
  mat(w, col) {
    const k = w + col; if (this.mats[k]) return this.mats[k];
    const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d');
    g.translate(128, 64); g.beginPath(); for (let i = 0; i < 22; i++) { const a = i / 22 * Math.PI * 2, r = i % 2 ? 44 : 62; g.lineTo(Math.cos(a) * r * 1.85, Math.sin(a) * r); } g.closePath();
    g.fillStyle = col; g.fill(); g.lineWidth = 6; g.strokeStyle = '#141824'; g.stroke();
    g.rotate(-0.08); g.font = (w.length > 6 ? 46 : 58) + 'px "Lilita One", "Arial Black", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    g.lineWidth = 12; g.strokeStyle = '#141824'; g.strokeText(w, 0, 4); g.fillStyle = '#ffffff'; g.fillText(w, 0, 4);
    const t = new THREE.CanvasTexture(c);
    return (this.mats[k] = new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
  },
  pop(c, w, col, size) {
    if (!W.scene) return; let s = this.pool.find(p => !p.visible);
    if (!s) { if (this.pool.length >= 10) s = this.pool.reduce((a, b) => (a.userData.t > b.userData.t ? a : b)); else { s = new THREE.Sprite(); s.renderOrder = 22; W.scene.add(s); this.pool.push(s); } }
    s.material = this.mat(w, col || '#ffd23b'); s.material.opacity = 1; s.visible = true; s.position.set(c.x, c.y, c.z);
    s.userData = { t: 0, life: 0.95, y: c.y, k: size || 1, rot: rand(-0.25, 0.25) }; s.material.rotation = s.userData.rot;
  },
  update(dt) {
    for (const s of this.pool) {
      if (!s.visible) continue; const u = s.userData; u.t += dt; const k = u.t / u.life;
      if (k >= 1) { s.visible = false; continue; }
      const sc = (k < 0.14 ? k / 0.14 * 1.25 : k < 0.28 ? 1.25 - (k - 0.14) / 0.14 * 0.25 : 1) * u.k;
      s.scale.set(0.95 * sc, 0.475 * sc, 1); s.position.y = u.y + k * 0.35; s.material.opacity = k > 0.72 ? 1 - (k - 0.72) / 0.28 : 1;
    }
  }
};
/* taser bolts: a jagged camera-facing ribbon that re-jitters for a moment */
const RaidBolts = {
  list: [], mat: null,
  add(a, b) {
    if (!W.scene) return; let o = this.list.find(x => !x.m.visible);
    if (!o) {
      if (!this.mat) this.mat = new THREE.MeshBasicMaterial({ color: 0xbff4ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(13 * 2 * 3), 3));
      const idx = []; for (let i = 0; i < 12; i++) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); } g.setIndex(idx);
      o = { m: new THREE.Mesh(g, this.mat), a: new THREE.Vector3(), b: new THREE.Vector3(), t: 0, j: 0 }; o.m.frustumCulled = false; o.m.renderOrder = 6; W.scene.add(o.m); this.list.push(o);
    }
    o.a.set(a.x, a.y, a.z); o.b.set(b.x, b.y, b.z); o.t = 0; o.j = 0; o.m.visible = true; this.jag(o);
  },
  jag(o) {
    const P = o.m.geometry.attributes.position, cam = W.camera.position, L = o.a.distanceTo(o.b);
    _rV.subVectors(o.b, o.a).normalize(); _rV2.subVectors(cam, o.a).cross(_rV).normalize();
    for (let i = 0; i <= 12; i++) {
      const k = i / 12, off = (i === 0 || i === 12) ? 0 : rand(-1, 1) * L * 0.06, w = 0.014 + (i % 3 === 0 ? 0.008 : 0);
      const x = o.a.x + (o.b.x - o.a.x) * k + _rV2.x * off, y = o.a.y + (o.b.y - o.a.y) * k + _rV2.y * off + (i && i < 12 ? rand(-1, 1) * L * 0.03 : 0), z = o.a.z + (o.b.z - o.a.z) * k + _rV2.z * off;
      P.setXYZ(i * 2, x + _rV2.x * w, y + _rV2.y * w, z + _rV2.z * w); P.setXYZ(i * 2 + 1, x - _rV2.x * w, y - _rV2.y * w, z - _rV2.z * w);
    }
    P.needsUpdate = true; o.m.geometry.computeBoundingSphere();
  },
  update(dt) { for (const o of this.list) { if (!o.m.visible) continue; o.t += dt; o.j += dt; if (o.t > 0.32) { o.m.visible = false; continue; } if (o.j > 0.045) { o.j = 0; this.jag(o); } } }
};
FX.kinds.word = (c, o) => { RaidWords.pop(c, String(o.w || 'POW!').slice(0, 12), typeof o.c === 'string' ? o.c : '#ffd23b', clamp(+o.s || 1, 0.4, 2)); };
FX.kinds.mace = (c, o) => {   // a cone of pepper spray
  const d = Array.isArray(o.dir) ? o.dir : [0, 0, -1], l = Math.hypot(d[0], d[1], d[2]) || 1, dx = d[0] / l, dy = d[1] / l, dz = d[2] / l;
  for (let i = 0; i < 26; i++) {
    const sp = rand(3.5, 7.5), s = 0.13;
    FX.particle({ layer: 'soft', pos: [c.x + dx * 0.08, c.y + dy * 0.08, c.z + dz * 0.08], vel: [(dx + rand(-s, s)) * sp, (dy + rand(-s, s)) * sp + 0.2, (dz + rand(-s, s)) * sp], ttl: rand(0.6, 1.1),
      size: [0.04, rand(0.45, 0.75)], color: i % 3 ? '#ff6a1c' : '#ffb347', color2: '#ffd9a0', alpha: [0.9, 0], frame: 'puff', drag: 3.2 });
  }
  for (let i = 0; i < 8; i++) FX.particle({ layer: 'cut', pos: [c.x, c.y, c.z], vel: [(dx + rand(-0.2, 0.2)) * 5, (dy + rand(-0.1, 0.3)) * 5, (dz + rand(-0.2, 0.2)) * 5], ttl: 0.6, size: [0.04, 0.02], color: '#ff4a12', frame: 'drop', gravity: 0.6, drag: 1 });
};
FX.kinds.zap = (c, o) => {
  const b = Array.isArray(o.to) ? { x: +o.to[0] || 0, y: +o.to[1] || 0, z: +o.to[2] || 0 } : { x: c.x, y: c.y, z: c.z - 2 };
  RaidBolts.add(c, b); RaidSnd.zap(b);
  for (let i = 0; i < 14; i++) { const a = Math.random() * 6.28; FX.particle({ layer: 'add', pos: [b.x, b.y, b.z], vel: [Math.cos(a) * rand(1, 4), rand(-1, 3), Math.sin(a) * rand(1, 4)], ttl: rand(0.15, 0.35), size: [0.07, 0.01], color: i % 2 ? '#bff4ff' : '#ffe97a', frame: 'spark', drag: 4 }); }
  FX.particle({ layer: 'add', pos: [b.x, b.y, b.z], ttl: 0.16, size: [0.6, 0.2], color: '#d8f6ff', alpha: [0.9, 0], frame: 'soft' });
};

/* =====================================================================
   NAVIGATION — a coarse occupancy grid over the office + lobby and BFS distance fields to each target,
   so cops find their way round cubicle pods and through doors. Rebuilt when W.colliders changes.
   ===================================================================== */
const RaidNav = {
  x0: -12.2, z0: -9.2, cs: 0.4, nx: 93, nz: 46, free: null, q: null, colN: -1, fields: new Map(),
  hit(x, z, r) { const C = W.colliders; for (let k = 0; k < C.length; k++) { const c = C[k]; if (x > c.x0 - r && x < c.x1 + r && z > c.z0 - r && z < c.z1 + r) return true; } return false; },
  inside(x, z) {
    const B = W.bounds || { x0: -11.6, x1: 19.6, z0: -8.6, z1: 8.6 }; if (x >= B.x0 - 0.05 && x <= B.x1 + 0.45 && z >= B.z0 - 0.05 && z <= B.z1 + 0.05) return true;
    const L = (W.rooms && W.rooms.lobby) || { x0: 20.2, x1: 24.4, z0: -2.4, z1: 2.4 }; return x > 19.5 && x < L.x1 - 0.2 && z > L.z0 + 0.15 && z < L.z1 - 0.15;
  },
  build() {
    const n = this.nx * this.nz; if (!this.free) { this.free = new Uint8Array(n); this.q = new Int32Array(n); }
    for (let j = 0; j < this.nz; j++) for (let i = 0; i < this.nx; i++) { const x = this.x0 + (i + 0.5) * this.cs, z = this.z0 + (j + 0.5) * this.cs; this.free[i + j * this.nx] = this.inside(x, z) && !this.hit(x, z, 0.24) ? 1 : 0; }
    this.colN = W.colliders.length; this.fields.clear();
  },
  sync() { if (!this.free || this.colN !== W.colliders.length) this.build(); },
  cell(x, z) { const i = Math.floor((x - this.x0) / this.cs), j = Math.floor((z - this.z0) / this.cs); return i < 0 || j < 0 || i >= this.nx || j >= this.nz ? -1 : i + j * this.nx; },
  near(c) {   // nearest free cell (targets inside furniture, cops pushed into a corner)
    if (c >= 0 && this.free[c]) return c; if (c < 0) return -1; const ci = c % this.nx, cj = (c / this.nx) | 0;
    for (let r = 1; r < 6; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) { if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue; const i = ci + di, j = cj + dj; if (i >= 0 && j >= 0 && i < this.nx && j < this.nz && this.free[i + j * this.nx]) return i + j * this.nx; }
    return -1;
  },
  /* distance field to (x, z), cached per key; recomputed when the target changes cell */
  field(key, x, z) {
    this.sync(); const c = this.near(this.cell(x, z)); let f = this.fields.get(key);
    if (f && f.c === c) return f; if (!f) { f = { c: -1, d: new Uint16Array(this.nx * this.nz) }; this.fields.set(key, f); }
    f.c = c; const D = f.d, Q = this.q, nx = this.nx; D.fill(65535); if (c < 0) return f;
    let h = 0, t = 0; D[c] = 0; Q[t++] = c;
    while (h < t) {
      const k = Q[h++], i = k % nx, dd = D[k] + 1;
      if (i > 0 && this.free[k - 1] && D[k - 1] > dd) { D[k - 1] = dd; Q[t++] = k - 1; }
      if (i < nx - 1 && this.free[k + 1] && D[k + 1] > dd) { D[k + 1] = dd; Q[t++] = k + 1; }
      if (k >= nx && this.free[k - nx] && D[k - nx] > dd) { D[k - nx] = dd; Q[t++] = k - nx; }
      if (k < D.length - nx && this.free[k + nx] && D[k + nx] > dd) { D[k + nx] = dd; Q[t++] = k + nx; }
    }
    return f;
  },
  /* direction to walk from (x, z) down the field; returns false when there is no way */
  steer(f, x, z, out) {
    let c = this.cell(x, z); if (c < 0) return false; if (!this.free[c] || f.d[c] === 65535) c = this.near(c); if (c < 0 || f.d[c] === 65535) return false;
    const nx = this.nx, i0 = c % nx, j0 = (c / nx) | 0; let best = c, bd = f.d[c];
    // look two rings out for the lowest reachable cell (smoother paths than 8 neighbours)
    for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) {
      const i = i0 + di, j = j0 + dj; if (i < 0 || j < 0 || i >= nx || j >= this.nz) continue; const k = i + j * nx; if (!this.free[k] || f.d[k] >= bd) continue;
      if ((Math.abs(di) === 2 || Math.abs(dj) === 2) && !this.free[(i0 + Math.sign(di)) + (j0 + Math.sign(dj)) * nx]) continue;
      if (di && dj && (!this.free[i0 + di + j0 * nx] || !this.free[i0 + (j0 + dj) * nx])) continue;
      best = k; bd = f.d[k] - (Math.abs(di) + Math.abs(dj) > 2 ? 0.01 : 0);
    }
    if (best === c) { out.x = this.x0 + (i0 + 0.5) * this.cs - x; out.z = this.z0 + (j0 + 0.5) * this.cs - z; }
    else { out.x = this.x0 + (best % nx + 0.5) * this.cs - x; out.z = this.z0 + (((best / nx) | 0) + 0.5) * this.cs - z; }
    const l = Math.hypot(out.x, out.z); if (l < 1e-4) return false; out.x /= l; out.z /= l; return true;
  }
};

/* =====================================================================
   LIGHTS — red / blue police light pouring in through the windows, round the main door and in the lobby
   (two merged additive meshes, hidden unless a raid is on)
   ===================================================================== */
const RaidLights = {
  red: null, blue: null, on: false,
  build() {
    const tex = canvasTex(128, 128, (g, w, hh) => {
      const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, hh); g.globalCompositeOperation = 'destination-out'; g.fillStyle = 'rgba(0,0,0,.55)'; for (let y = 4; y < hh; y += 9) g.fillRect(0, y, w, 3.5);
    });
    const mk = col => new THREE.MeshBasicMaterial({ map: tex, color: col, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
    const R = [], Bl = [], pl = new THREE.PlaneGeometry(1, 1);
    const add = (list, w, hh, x, y, z, o) => list.push(pl, xf(x, y, z, Object.assign({ sx: w, sy: hh }, o)), '#ffffff');
    const winW = [[-8.1, -4.9], [-3.8, -0.6], [0.6, 3.8], [4.9, 8.1]], winS = [[-9.8, -7.0], [-4.6, -1.8], [0.6, 3.4], [5.6, 8.4]];
    winW.forEach((w, i) => { const L = i % 2 ? R : Bl, zc = (w[0] + w[1]) / 2; add(L, 3.6, 2.2, -11.95, 1.75, zc, { ry: Math.PI / 2 }); add(L, 3.4, 3.2, -10.6, 0.02, zc, { rx: -Math.PI / 2 }); add(L, 3.4, 2.4, -11.9, 2.95, zc, { rx: Math.PI / 2 }); });
    winS.forEach((w, i) => { const L = i % 2 ? Bl : R, xc = (w[0] + w[1]) / 2; add(L, 3.6, 2.2, xc, 1.75, -8.95, {}); add(L, 3.4, 3.2, xc, 0.02, -7.6, { rx: -Math.PI / 2 }); add(L, 3.4, 2.4, xc, 2.95, -8.9, { rx: Math.PI / 2 }); });
    add(R, 3.0, 2.0, 15.2, 1.75, -8.95, {}); add(Bl, 3.0, 3.0, 15.2, 0.02, -7.7, { rx: -Math.PI / 2 });
    add(R, 4.4, 4.4, 22.2, 0.02, -0.9, { rx: -Math.PI / 2 }); add(Bl, 4.4, 4.4, 22.2, 0.02, 0.9, { rx: -Math.PI / 2 });
    add(R, 4.0, 2.6, 22.3, 1.4, -2.42, {}); add(Bl, 4.0, 2.6, 22.3, 1.4, 2.42, { ry: Math.PI });
    add(R, 3.2, 3.2, 18.4, 0.02, -0.6, { rx: -Math.PI / 2 }); add(Bl, 3.2, 3.2, 18.4, 0.02, 0.6, { rx: -Math.PI / 2 });
    const mesh = (list, col) => { const m = new THREE.Mesh(mergeGeos(list), mk(col)); m.visible = false; m.renderOrder = 4; m.frustumCulled = false; W.scene.add(m); return m; };
    this.red = mesh(R, '#ff2238'); this.blue = mesh(Bl, '#2a62ff');
  },
  set(on) { this.on = on; if (this.red) { this.red.visible = this.blue.visible = on; if (!on) this.red.material.opacity = this.blue.material.opacity = 0; } },
  update(t) {
    if (!this.on || !this.red) return; const ph = t * 2.6 * Math.PI, a = Math.max(0, Math.sin(ph)), b = Math.max(0, -Math.sin(ph));
    this.red.material.opacity = 0.62 * Math.pow(a, 0.6) * (0.75 + 0.25 * Math.sin(t * 31)); this.blue.material.opacity = 0.7 * Math.pow(b, 0.6) * (0.75 + 0.25 * Math.sin(t * 27));
  }
};

/* =====================================================================
   COPS
   ===================================================================== */
const COP_LINES = {
  in: ['POLICE! Nobody move!', 'Freeze! Paperwork inspection!', 'We have a warrant for... most of this.', 'Hands where I can see them!', 'Step away from the headsets!'],
  chase: ['Stop right there!', 'Halt, telemarketer!', 'Put down the phone!', 'You have the right to remain on hold!', 'Get back here!', 'Nice tie. Freeze!'],
  arrest: ['You\'re under arrest!', 'Busted!', 'Gotcha!', 'Book \'em!', 'Case closed.'],
  hit: ['Ow!', 'My eyes!', 'Not the uniform!', 'Hey!', 'That is going in my report!'],
  dizzy: ['Seeing... stars...', 'Officer down! Ish!', 'Who turned off gravity?', 'Five more minutes...'],
  out: ['Retreat!', 'Calling for backup! From home!', 'Above my pay grade!', 'I quit!', 'Not worth it!'],
  leave: ['Paperwork can wait.', 'Shift\'s over, folks.', 'We\'ll be back.', 'Keep the change.'],
  block: ['Hey! No fair!', 'A shield?!', 'Customer support?!']
};
const NPC_DUCK = ['Not again!', 'I just work here!', 'I\'m only an intern!', 'Hide the headsets!', 'I saw nothing!', 'Is this a drill?', 'Tell my plant I love it.'];
const BOSS_HIDE = ['I have never met these people.', 'This is a legitimate business!', 'Tell them I\'m on vacation.', 'I am a lamp. Lamps can\'t be arrested.'];
const CUFF_POSE = [0.5, 0.05, -0.42, 1.3, 0.3];
/* a cop's look: navy uniform, cap, shades, the occasional heroic moustache; varied skin tones */
function copLook(seed) {
  const r = rng(seed * 31 + 7), O = AV_OPT, hairs = ['buzz', 'short', 'bald', 'buzz', 'short', 'ponytail', 'bun', 'sidepart'];
  const hair = hairs[Math.floor(r() * hairs.length)], long = hair === 'ponytail' || hair === 'bun', f = r();
  return { skin: O.skins[Math.floor(r() * 8)][1], hair, hairColor: r() < 0.15 ? '#8d8d8d' : O.hairCols[Math.floor(r() * 5)],
    facial: long ? 'none' : f < 0.45 ? 'bigmustache' : f < 0.65 ? 'mustache' : f < 0.8 ? 'stubble' : 'none',
    glasses: r() < 0.72 ? 'shades' : 'none', shirt: '#26396a', pants: '#1a2236', shoes: '#101114', build: ['slim', 'avg', 'avg', 'big'][Math.floor(r() * 4)], badge: false };
}
function copAvatar(seed, name) {
  const av = buildAvatar({ look: copLook(seed), name: name == null ? 'POLICE' : name, headset: false });
  av.tag.material.color.set('#b8d2ff'); av.tag.userData.base *= 0.6; av.head.add(RaidArt.cap()); av.chest.add(RaidArt.chest()); av.lookCam = false; av.isCop = true;
  return av;
}
const _rDir = { x: 0, z: 0 };

const Raid = {
  heat: 0, on: false, n: 0, seed: 1, left: 0, t: 0, doorT: -1, cops: [], lastEnd: -999, chkT: 0, uiT: 0,
  immune: new Map(), cuffs: new Map(), cuffM: new Map(), cd: {}, later: [], duck: [], ducking: false, bossW: 0, bust: null, book: null, _T: [], _TP: [],

  /* ----- heat (host-owned; clients predict and tell the host) ----- */
  addHeat(a) {
    a = clamp(+a || 0, -100, 100); this.heat = clamp(this.heat + a, 0, RAID.max);
    if (!Net.isAuth()) Net.emit('raid:heat', { a: +a.toFixed(1) }, { host: true }); Bus.emit('raid:heat', this.heat);
  },
  setHeat(v) { if (Net.isAuth()) this.heat = clamp(+v || 0, 0, RAID.max); },
  canRaid() {
    if (G.phase !== 'day' || this.on || this.cops.length || W.t - this.lastEnd < RAID.gap) return false;
    if (G.mode === 'week' ? (G.day < RAID.day || G.timeLeft < RAID.warn || G.dayLen - G.timeLeft < 20) : now() - G.startedAt < 150) return false;
    return !(typeof Chaos !== 'undefined' && Chaos.busy && Chaos.busy());
  },
  after(sec, fn) { this.later.push({ t: W.t + sec, fn }); },

  /* ----- start / end ----- */
  /* host (or solo): start a raid now, whatever the heat and the day. k = number of cops (default 2 + players) */
  start(k) {
    if (!Net.isAuth() || this.on || !W.scene || G.phase === 'menu') return false;
    if (this.cops.length) this.clearCops();
    const d = { n: this.n + 1, k: clamp(k || 2 + (Net.active ? Net.players.size : 1), 1, 6), s: randi(1, 99999) };
    this.begin(d); Net.emit('raid:go', d); return true;
  },
  begin(d, late) {
    if (this.on && this.n === d.n) return;
    this.clearCops(); this.on = true; this.n = d.n | 0; this.seed = d.s | 0; this.left = RAID.dur; this.t = 0; this.doorT = late ? -1 : 1.25;
    for (let i = 0; i < (d.k | 0); i++) this.cops.push(this.makeCop(i));
    RaidLights.set(true); RaidSnd.sirenOn(); RaidSnd.alarm(); RaidUI.alert('raid'); RaidUI.glow(true); this.duckAll(true);
    if (P.seated) toast('POLICE RAID! Stand up (start menu) and defend the office, or keep typing and hope.', 'bad');
    Bus.emit('raid:start', { n: this.n, cops: this.cops.length });
  },
  /* host: end the raid (ok = the cops were driven out) */
  finish(ok) { if (!this.on || !Net.isAuth()) return; const d = { n: this.n, ok: ok ? 1 : 0, k: this.cops.length }; this.over(d); Net.emit('raid:end', d); },
  over(d) {
    if (!this.on) return; this.on = false; this.lastEnd = W.t; this.doorT = -1;
    RaidLights.set(false); RaidSnd.sirenOff(); RaidUI.glow(false); this.duckAll(false);
    for (const c of this.cops) if (c.st < 3 || c.st === 6) { if (Net.isAuth()) this.setSt(c, 4); }
    if (d.ok === 1) {
      RaidUI.alert('win'); RaidSnd.fanfare(); Game.addWallet(RAID.hazard); if (OS.open) OS.cashFx('+' + money(RAID.hazard));
      toast('Raid repelled! Hazard pay +' + money(RAID.hazard) + '. Legal says this never happened.', 'good');
      if (Net.isAuth()) { const b = RAID.bonus * Math.max(1, d.k | 0); G.team += b; if (W.leaderboard && W.leaderboard.update) W.leaderboard.update(true); setTimeout(() => toast('Team bonus +' + money(b) + ' for defending the office.', 'good'), 900); }
      if (!P.seated) FX.spawn('confetti', [P.pos.x, P.pos.y + 2.2, P.pos.z], { n: 60, dir: [0, -0.2, 0], sound: false });
    } else if (d.ok === 0) {
      const f = Math.round(G.wallet * RAID.leaveFine); if (f > 0) Game.addWallet(-f); RaidUI.alert('lose', f); SFX.bad();
      if (f > 0 && OS.open) OS.cashFx('-' + money(f), true);
    }
    if (Net.isAuth()) this.heat = 0;
    Bus.emit('raid:end', { ok: d.ok === 1, n: d.n });
  },
  /* drop everything at once (new day, review, quit): no money, no banners */
  abort() {
    this.on = false; this.doorT = -1; this.clearCops(); RaidLights.set(false); RaidSnd.sirenOff(); RaidUI.glow(false); RaidUI.alertOff(true); this.duckAll(false, true);
    if (this.bust) this.release(true); for (const id of [...this.cuffs.keys()]) this.uncuff(id); this.later.length = 0;
  },
  burst() {
    const D = W.doors && W.doors.main; if (!D) return;
    D.open(Net.isHost);   // the host also syncs it; everyone opens it locally so the slam lines up
    const L = W.doors._leaves; if (L) for (const lf of L) { lf.a = lf.swing * 1.28; lf.leaf.rotation.y = lf.a; }
    const p = D.pos || { x: 20, z: 0 };
    FX.spawn('puff', [p.x - 0.3, 0.05, p.z], { scale: 2.4, color: '#d9d2c4' }); FX.spawn('smoke', [p.x - 0.3, 0.9, p.z], { n: 6, scale: 0.7, color: '#bdb6aa' });
    FX.spawn('word', [p.x - 0.7, 2.3, p.z], { w: 'BAM!', c: '#ff5a5a', s: 1.6 }); RaidSnd.burst(_rV.set(p.x, 1, p.z));
    const d = Math.hypot(P.pos.x - p.x, P.pos.z - p.z); if (d < 14 && !P.seated) FX.shake(0.6 * (1 - d / 14) + 0.1, 0.4);
    if (W.updateShadows) W.updateShadows();
  },

  /* ----- cops ----- */
  makeCop(i) {
    const S = (W.spawn && W.spawn.police && W.spawn.police.length) ? W.spawn.police : [{ x: 22, z: 0 }], sp = S[i % S.length];
    const av = copAvatar(this.seed + i * 17); W.scene.add(av.group); av.group.position.set(sp.x, 0, sp.z); av.group.rotation.y = Math.PI / 2;
    return { i, av, x: sp.x, z: sp.z, ry: Math.PI / 2, vx: 0, vz: 0, kx: 0, kz: 0, hp: RAID.hp, st: 0, stT: 0, wait: 1.3 + i * 0.14, tgt: null, retT: 0, sayT: rand(3, 6), sp: 0, tagT: 0, head: new THREE.Vector3() };
  },
  clearCops() { for (const c of this.cops) c.av.dispose(); this.cops.length = 0; },
  copSpeed() { return RAID.speed + (G.mode === 'week' ? Math.min(0.6, Math.max(0, G.day - RAID.day) * 0.15) : 0.3); },
  isImmune(id) { const t = this.immune.get(id); return t != null && W.t < t; },
  /* who the cops can chase: standing players (position) and seated ones (their desk's aisle spot) */
  targets() {
    const T = this._T; T.length = 0; let k = 0;
    const add = (id, x, z, seat, held, ry) => { const o = this._TP[k] || (this._TP[k] = {}); k++; o.id = id; o.x = x; o.z = z; o.seat = seat; o.held = held; o.ry = ry; T.push(o); };
    if (G.phase !== 'day') return T;
    const me = Net.active ? Net.myId : 'me';
    if (P.review < 0 && !this.bust && !this.isImmune(me)) {
      if (P.seated && W.desks[P.seat]) { const d = W.desks[P.seat]; add(me, d.stand.x, d.stand.z, P.seat, null, d.rot); }
      else add(me, P.pos.x, P.pos.z, -1, Props.heldId(), P.yaw);
    }
    if (Net.active) for (const [id, p] of Net.players) {
      if (id === Net.myId || this.isImmune(id) || p.seat <= -10) continue;
      if (p.seat >= 0 && W.desks[p.seat]) { const d = W.desks[p.seat]; add(id, d.stand.x, d.stand.z, p.seat, null, d.rot); }
      else add(id, +p.x || 0, +p.z || 0, -1, p.ext && p.ext.held ? p.ext.held.i : null, +p.ry || 0);
    }
    return T;
  },
  pick(c, T) {
    let best = null, bs = 1e9;
    for (const g of T) {
      let s = Math.hypot(g.x - c.x, g.z - c.z); if (c.tgt && c.tgt.id === g.id) s -= 1.2;
      for (const o of this.cops) if (o !== c && o.st === 1 && o.tgt && o.tgt.id === g.id) s += 2.5;
      if (s < bs) { bs = s; best = g; }
    }
    return best;
  },
  /* host: one cop's brain + legs */
  simCop(c, dt, T) {
    c.stT -= dt; c.sayT -= dt;
    let tx = null, tz = null, sp = 0, key = null;
    if (c.st === 0) { if (this.t >= c.wait) { tx = 18.2; tz = c.z * 0.4; sp = RAID.speed * 0.9; key = 'door'; if (c.x < 19.0) this.setSt(c, 1); } }
    else if (c.st === 1) {
      if ((c.retT -= dt) <= 0) { c.retT = 0.4; c.tgt = this.pick(c, T); }
      const g = c.tgt && T.includes(c.tgt) ? c.tgt : null;
      if (g) { tx = g.x; tz = g.z; sp = this.copSpeed(); key = 'p:' + g.id; this.tryTag(c, g); }
      else { tx = 14.5; tz = (c.i - 2) * 0.7; sp = 2.2; key = 'idle'; }
      if (c.sayT <= 0) { c.sayT = rand(5, 9); if (g && Math.random() < 0.6) FX.bubble(c.av, pick(COP_LINES.chase), 2); }
    }
    else if (c.st === 2) { if (c.stT <= 0) this.setSt(c, this.on ? 1 : 4); }
    else if (c.st === 3) { if (c.stT <= 0) this.setSt(c, 4); }
    else if (c.st === 4) { tx = 23.4; tz = (c.i % 3 - 1) * 0.8; sp = RAID.speed * 1.15; key = 'exit'; if (c.x > 22.7) this.setSt(c, 5); }
    else if (c.st === 6) { if (c.stT <= 0) this.setSt(c, this.on ? 1 : 4); }
    let wx = 0, wz = 0;
    if (tx !== null) {
      const dx = tx - c.x, dz = tz - c.z, d = Math.hypot(dx, dz);
      if (d < 1.4 || (c.st === 0 && c.x > 19.4) || (c.st === 4 && c.x > 19.6)) { wx = dx / (d || 1); wz = dz / (d || 1); }
      else if (RaidNav.steer(RaidNav.field(key, tx, tz), c.x, c.z, _rDir)) { wx = _rDir.x; wz = _rDir.z; }
      else { wx = dx / d; wz = dz / d; }
      if (d < 0.3) wx = wz = 0;
    }
    for (const o of this.cops) {   // keep a little personal space
      if (o === c || o.st === 5) continue; const dx = c.x - o.x, dz = c.z - o.z, d2 = dx * dx + dz * dz;
      if (d2 < 0.5 && d2 > 1e-6) { const d = Math.sqrt(d2), k = (0.71 - d) / 0.71 * 1.2; wx += dx / d * k; wz += dz / d * k; }
    }
    const a = 1 - Math.exp(-dt * 8); c.vx += (wx * sp - c.vx) * a; c.vz += (wz * sp - c.vz) * a;
    const kd = Math.exp(-dt * 4); c.kx *= kd; c.kz *= kd;
    const mx = (c.vx + c.kx) * dt, mz = (c.vz + c.kz) * dt, stuck = blocked(c.x, c.z);
    if (stuck || !blocked(c.x + mx, c.z)) c.x += mx; else { c.vx *= 0.3; c.kx *= -0.3; }
    if (stuck || !blocked(c.x, c.z + mz)) c.z += mz; else { c.vz *= 0.3; c.kz *= -0.3; }
    c.sp = Math.hypot(c.vx, c.vz);
    if (c.st !== 3) {
      let ry = c.ry; if (c.sp > 0.35) ry = Math.atan2(-c.vx, -c.vz); else if (c.st === 6 && c.face) ry = Math.atan2(-(c.face.x - c.x), -(c.face.z - c.z));
      let dr = ry - c.ry; dr = Math.atan2(Math.sin(dr), Math.cos(dr)); c.ry += dr * Math.min(1, dt * 10);
    }
  },
  tryTag(c, g) {
    const d = Math.hypot(g.x - c.x, g.z - c.z); if (d > (g.seat >= 0 ? 0.95 : RAID.tag) || W.t < c.tagT) return;
    c.tagT = W.t + 1.2;
    if (g.held === 'shield' && g.seat < 0) {   // a riot shield held up towards the cop bounces them off
      const dot = ((c.x - g.x) * -Math.sin(g.ry) + (c.z - g.z) * -Math.cos(g.ry)) / (d || 1);
      if (dot > -0.3) { c.kx = (c.x - g.x) / (d || 1) * 7; c.kz = (c.z - g.z) / (d || 1) * 7; c.stT = 1.3; c.lastK = 'block'; this.setSt(c, 2); const m = { c: c.i, id: g.id }; Net.emit('raid:block', m); this.onBlock(m); return; }
    }
    this.immune.set(g.id, W.t + RAID.immune); c.face = { x: g.x, z: g.z }; this.setSt(c, 6);
    const m = { id: g.id, c: c.i }; Net.emit('raid:arrest', m); this.onArrest(m);
  },
  /* host: damage a cop */
  hurt(c, dmg, stun, kx, kz, kind) {
    if (!c || c.st >= 3 && c.st !== 6) return;
    c.hp -= dmg; c.kx += clamp(kx, -9, 9); c.kz += clamp(kz, -9, 9); c.lastK = kind;
    if (c.hp <= 0) { this.setSt(c, 3); return; }
    if (stun > 0) { if (c.st === 2) { c.stT = Math.max(c.stT, stun); c.av.play(kind === 'mace' ? 'facepalm' : 'hit'); c.av.stun(stun); } else { c.stT = stun; this.setSt(c, 2); } }
  },
  /* any client: a weapon hit a cop (the host decides, everyone sees the reaction) */
  hitCop(c, dmg, stun, kx, kz, kind) {
    if (!c || c.st >= 3 && c.st !== 6) return;
    if (Net.isAuth()) this.hurt(c, dmg, stun, kx, kz, kind);
    else { Net.emit('raid:hit', { c: c.i, d: +dmg.toFixed(2), s: +stun.toFixed(2), kb: [+kx.toFixed(2), +kz.toFixed(2)], k: kind }, { host: true }); c.av.play(kind === 'mace' ? 'facepalm' : 'hit'); c.av.stun(Math.max(0.6, stun)); }
  },
  /* state changes (host: from the brain; clients: from snapshots) with their one-shot reactions */
  setSt(c, st) {
    if (c.st === st) return; const old = c.st; c.st = st; const av = c.av;
    if (st === 1 && old === 0) { if (c.i === 0) { RaidSnd.whistle(av.group.position); FX.bubble(av, pick(COP_LINES.in), 2.4); } }
    else if (st === 2) { av.play(c.lastK === 'mace' ? 'facepalm' : 'hit'); av.stun(c.stT > 0 ? c.stT : 1); if (c.lastK !== 'block' && Math.random() < 0.45) FX.bubble(av, pick(COP_LINES.hit), 1.6); }
    else if (st === 3) { av.play('fall'); av.stun(3.4); av.setMood('dizzy', 3.4); FX.bubble(av, pick(COP_LINES.dizzy), 2.4); SFX.ow(av.group.position); c.stT = 3.1; }
    else if (st === 4) { av.stop(); av.setMood(old === 3 || this.on ? 'surprised' : 'happy', 9); FX.bubble(av, pick(old === 3 || this.on ? COP_LINES.out : COP_LINES.leave), 2.2); }
    else if (st === 5) { av.group.visible = false; }
    else if (st === 6) { av.play('point'); av.setMood('happy', 2); c.stT = 1.7; }
  },
  clientCop(c, dt) {
    if (c.tx === undefined) return; const k = 1 - Math.exp(-dt * 10), ox = c.x, oz = c.z;
    if (Math.hypot(c.tx - c.x, c.tz - c.z) > 4) { c.x = c.tx; c.z = c.tz; } else { c.x += (c.tx - c.x) * k; c.z += (c.tz - c.z) * k; }
    let dr = c.tr - c.ry; dr = Math.atan2(Math.sin(dr), Math.cos(dr)); c.ry += dr * k;
    c.sp = lerp(c.sp, Math.hypot(c.x - ox, c.z - oz) / Math.max(dt, 1e-3), 0.3);
  },
  copVisual(c, t) {
    const g = c.av.group; g.position.set(c.x, 0, c.z); g.rotation.y = c.ry;
    poseAvatar(c.av, false, t, c.st === 3 ? 0 : c.sp); avTagScale(c.av, W.camera);
    c.av.head.getWorldPosition(c.head);
  },
  onBlock(m) {
    const c = this.cops[m.c | 0]; if (c) { c.av.head.getWorldPosition(_rV); FX.spawn('stars', [_rV.x, _rV.y + 0.3, _rV.z], { n: 6 }); FX.spawn('word', [_rV.x, _rV.y + 0.75, _rV.z], { w: 'BLOCKED!', c: '#7fd4ff' }); FX.bubble(c.av, pick(COP_LINES.block), 1.8); RaidSnd.boing(_rV); }
    if (m.id === (Net.active ? Net.myId : 'me')) { FX.shake(0.3, 0.2); toast('Shield block! The officer bounced right off.', 'good'); }
  },
  onArrest(m) {
    const c = this.cops[m.c | 0], me = Net.active ? Net.myId : 'me', mine = m.id === me;
    if (c) { c.av.play('point'); FX.bubble(c.av, pick(COP_LINES.arrest), 2.2); }
    this.immune.set(m.id, W.t + RAID.immune); this.cuffs.set(m.id, W.t + 4.8);
    if (mine) this.busted();
    else {
      const p = Net.players.get(m.id), av = avatarOf(m.id); toast((p ? p.name : 'A teammate') + ' got arrested!', 'bad');
      if (av) { av.head.getWorldPosition(_rV); FX.spawn('word', [_rV.x, _rV.y + 0.7, _rV.z], { w: 'BUSTED!', c: '#ff6b6b' }); RaidSnd.cuffs(); }
    }
    Bus.emit('raid:arrest', { id: m.id, me: mine });
  },

  /* ----- getting arrested yourself: cuffs, a fine, a mugshot in the lobby, then back at the front door ----- */
  busted() {
    if (P.review >= 0 || this.bust || G.phase !== 'day') return;
    if (P.seated) standUp(); if (Props.carry) Props.drop(); Props.endUse();
    const fine = Math.min(G.wallet, Math.max(RAID.fineMin, Math.round(G.wallet * RAID.fine))); if (fine > 0) Game.addWallet(-fine);
    RaidSnd.cuffs(); RaidSnd.busted(); FX.flash('#ffffff', 0.25, 0.7); FX.shake(0.5, 0.3);
    this.bust = { t: 0, fine, snap: false };
    P.vx = P.vz = P.kx = P.kz = P.vy = 0; P.pos.x = 23.3; P.pos.z = 0; P.pos.y = 0; P.yaw = Math.PI / 2; P.pitch = 0;
    startCam({ x: 21.0, y: 1.55, z: 0.05 }, Math.PI / 2, 0, 1e9, null);   // holds the controls; the camera itself is pinned below
    W.camOverride = { pos: [21.05, 1.52, 0.04], look: [23.3, 1.22, 0] };
    this.booking(true); RaidUI.busted(fine);
  },
  release(quiet) {
    const b = this.bust; this.bust = null; W.camOverride = null; this.booking(false); RaidUI.busted(null); P._meVis = undefined;
    if (P.review < 0 && G.phase === 'day') {
      P.cam = null; const f = freeSpot(18.5, rand(-0.7, 0.7)); P.pos.x = f[0]; P.pos.z = f[1]; P.pos.y = 0; P.yaw = Math.PI / 2; P.pitch = -0.05; P.stunT = 1.0; P.boom = 0.3;
      if (!quiet && b) toast('Booked, fined ' + money(b.fine) + ' and released at the front door. Officers will leave you alone for a bit.', 'bad');
    } else if (P.cam && P.cam.dur > 1e8) P.cam = null;
  },
  booking(on) {
    if (on && !this.book) {
      const av = copAvatar(4242, ''), board = RaidArt.board(); board.position.set(23.95, 0, 0); board.rotation.y = -Math.PI / 2;
      av.group.position.set(22.95, 0, -0.85); av.group.rotation.y = Math.PI / 2 + 0.55; W.scene.add(av.group, board); this.book = { av, board };
    }
    if (this.book) { this.book.av.group.visible = this.book.board.visible = !!on; if (on) { this.book.av.play('point'); this.book.av.setMood('happy', 4); } }
  },
  bustUpdate(dt, t) {
    if (this.book && this.book.av.group.visible) poseAvatar(this.book.av, false, t, 0);
    const b = this.bust; if (!b) return; b.t += dt;
    if (!W.camOverride) W.camOverride = { pos: [21.05, 1.52, 0.04], look: [23.3, 1.22, 0] };   // keep the mugshot camera even if someone released it
    if (W.me) W.me.group.visible = true; const ho = Props.held.get('me'); if (ho && ho.obj) ho.obj.visible = false;
    if (!b.snap && b.t > 1.5) { b.snap = true; RaidSnd.shutter(); FX.flash('#ffffff', 0.3, 0.95); RaidUI.snap(); }
    if (b.t > 3.8 || G.phase !== 'day' || P.review >= 0) this.release();
  },
  /* handcuffs on an arrested player's avatar (everyone sees them) */
  cuffUpdate() {
    if (!this.cuffs.size) return;
    for (const [id, until] of this.cuffs) {
      const av = avatarOf(id); if (!av || W.t > until) { this.uncuff(id); continue; }
      let m = this.cuffM.get(id);
      if (!m || m.av !== av) {
        if (m) this.uncuff(id, true);
        const L = RaidArt.cuff(), R = RaidArt.cuff(), ch = new THREE.Mesh(cylGeo(0.007, 0.007, 1, 6), RaidArt.vcMat());
        const col = new THREE.Color('#9aa1ab'), n = ch.geometry.attributes.position.count;
        if (!ch.geometry.attributes.color) { const ca = new Float32Array(n * 3); for (let i = 0; i < n; i++) { ca[i * 3] = col.r; ca[i * 3 + 1] = col.g; ca[i * 3 + 2] = col.b; } ch.geometry.setAttribute('color', new THREE.BufferAttribute(ca, 3)); }
        L.position.set(0, 0.0, 0); R.position.set(0, 0.0, 0); L.rotation.y = Math.PI; av.handL.add(L); av.handR.add(R); W.scene.add(ch); m = { av, L, R, ch }; this.cuffM.set(id, m);
      }
      avArm(av.cur, 'lr', CUFF_POSE, 1); av._pose();
      m.L.getWorldPosition(_rV); m.R.getWorldPosition(_rV2); m.ch.position.addVectors(_rV, _rV2).multiplyScalar(0.5);
      const len = _rV.distanceTo(_rV2); _rV2.sub(_rV).normalize(); m.ch.quaternion.setFromUnitVectors(_rY, _rV2); m.ch.scale.set(1, Math.max(0.02, len), 1);
      m.ch.visible = av.group.visible;
    }
  },
  uncuff(id, keep) {
    const m = this.cuffM.get(id); if (m) { if (m.L.parent) m.L.parent.remove(m.L); if (m.R.parent) m.R.parent.remove(m.R); W.scene.remove(m.ch); this.cuffM.delete(id); }
    if (!keep) this.cuffs.delete(id);
  },

  /* ----- coworkers dive under their desks, The Boss crouches behind his ----- */
  duckAll(on, instant) {
    this.ducking = on;
    if (on) { for (const n of W.npcs) if (n.setMood) n.setMood('surprised', RAID.dur); this.duck.forEach(s => { if (s) s.d = rand(0.05, 1.3); }); }
    else { for (const n of W.npcs) if (n.setMood) n.setMood('neutral'); }
    if (instant) { this.duck.forEach((s, k) => { if (s) { s.w = 0; const n = W.npcs[k]; if (n && s.base) n.group.position.set(s.base.x, 0, s.base.z); s.base = null; } }); if (this.bossW > 0 && W.boss) W.boss.group.position.y = 0; this.bossW = 0; }
  },
  duckUpdate(dt, t) {
    for (let k = 0; k < W.npcs.length; k++) {
      const n = W.npcs[k], s = this.duck[k] || (this.duck[k] = { w: 0, d: rand(0.05, 1.3), base: null }), g = n.group;
      if (this.ducking) { if ((s.d -= dt) <= 0) s.w = Math.min(1, s.w + dt * 2.4); } else s.w = Math.max(0, s.w - dt * 1.3);
      if (s.w <= 0) { if (s.base) { g.position.set(s.base.x, 0, s.base.z); s.base = null; } continue; }
      if (!s.base) { const d = W.desks[n.desk]; let dx = 0, dz = 0; if (d) { dx = d.x - g.position.x; dz = d.z - g.position.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l; } s.base = { x: g.position.x, z: g.position.z, dx, dz }; }
      if (!g.visible) continue;
      const e = s.w * s.w * (3 - 2 * s.w);
      g.position.set(s.base.x + s.base.dx * 0.4 * e, -0.38 * e, s.base.z + s.base.dz * 0.4 * e);
      const c = n.cur; avArm(c, 'lr', AV_ARM.behind, e); avLerpCh(c, AVC.cx, 0.66, e); avLerpCh(c, AVC.nx, 0.5, e); avLerpCh(c, AVC.ny, 0, e); c[AVC.cz] += Math.sin(t * 38 + k * 1.7) * 0.03 * e; n._pose();
    }
    const B = W.boss;
    if (B) {
      const want = this.ducking && G.phase === 'day'; this.bossW = want ? Math.min(1, this.bossW + dt * 1.6) : Math.max(0, this.bossW - dt * 1.3);
      if (this.bossW > 0) {
        const e = this.bossW * this.bossW * (3 - 2 * this.bossW), c = B.cur; B.group.position.y = -0.6 * e; this._bossLow = true;
        avArm(c, 'lr', AV_ARM.behind, e); avLerpCh(c, AVC.cx, 0.6, e); avLerpCh(c, AVC.nx, 0.45, e); avLerpCh(c, AVC.ny, 0, e); avLerpCh(c, AVC.ltx, 1.1, e); avLerpCh(c, AVC.rtx, 1.1, e); avLerpCh(c, AVC.lkx, 1.5, e); avLerpCh(c, AVC.rkx, 1.5, e);
        c[AVC.cz] += Math.sin(t * 41) * 0.03 * e; B._pose();
        if (want && Math.random() < dt * 0.12) FX.bubble(B, pick(BOSS_HIDE), 2.6);
      } else if (this._bossLow) { this._bossLow = false; B.group.position.y = 0; }
    }
    if (this.ducking && W.npcs.length && Math.random() < dt * 0.3) { const n = pick(W.npcs); if (n.group.visible) FX.bubble(n, pick(NPC_DUCK), 2.2); }
  },

  /* ----- per frame ----- */
  update(dt, t) {
    if (!W.scene) return;
    for (let i = this.later.length - 1; i >= 0; i--) if (W.t >= this.later[i].t) { const f = this.later[i].fn; this.later.splice(i, 1); try { f(); } catch (e) { console.error('raid timer', e); } }
    RaidWords.update(dt); RaidBolts.update(dt); Shots.update(dt); RaidLights.update(t);
    if (G.phase === 'menu') return;
    const auth = Net.isAuth();
    if (auth && G.phase === 'day') {
      if (!this.on) this.heat = Math.max(0, this.heat - RAID.cool * dt);
      if ((this.chkT += dt) >= 1) {
        this.chkT = 0; const h = this.heat;
        if (this.canRaid() && (h >= RAID.max || (h >= RAID.risk && Math.random() < (h - RAID.risk) / (RAID.max - RAID.risk) * 0.035) || (h >= 30 && Math.random() < 0.0012))) this.start();
      }
    }
    if (this.on) {
      this.t += dt; this.left = Math.max(0, this.left - dt);
      if (this.doorT > 0 && this.t >= this.doorT) { this.doorT = -1; this.burst(); }
      if (auth) { let active = 0; for (const c of this.cops) if (c.st < 4 || c.st === 6) active++; if (this.t > 3 && !active) this.finish(true); else if (this.left <= 0) this.finish(false); }
      if ((this.sirT = (this.sirT || 0) + dt) > 0.25) { this.sirT = 0; const D = Math.hypot(W.camera.position.x - 20, W.camera.position.z); RaidSnd.sirenVol((0.03 + 0.06 * clamp(1 - D / 30, 0, 1)) * (OS.open ? 0.6 : 1)); }
    }
    const T = auth && this.cops.length ? this.targets() : null;
    for (const c of this.cops) { if (c.st === 5) continue; if (auth) this.simCop(c, dt, T); else this.clientCop(c, dt); this.copVisual(c, t); }
    if (auth && !this.on && this.cops.length) {
      let gone = true; for (const c of this.cops) if (c.st !== 5) gone = false;
      if (gone) { this.clearCops(); this.after(1.2, () => { if (!this.on && W.doors && W.doors.main) W.doors.main.close(true); }); }
    }
    RaidW.stressHits(t); this.duckUpdate(dt, t); this.cuffUpdate(); this.bustUpdate(dt, t);
    if ((this.uiT += dt) > 0.2) { this.uiT = 0; RaidUI.tick(); }
  },

  /* ----- network ----- */
  shared() { return { h: Math.round(this.heat), on: this.on ? 1 : 0, n: this.n, s: this.seed, l: Math.round(this.left), c: this.cops.map(c => [+c.x.toFixed(2), +c.z.toFixed(2), +c.ry.toFixed(2), c.st, +Math.max(0, c.hp).toFixed(1)]) }; },
  applyShared(s) {
    if (!s || Net.isHost || G.phase === 'menu') return;
    this.heat = clamp(+s.h || 0, 0, RAID.max); const C = Array.isArray(s.c) ? s.c : [];
    if (s.on && (!this.on || this.n !== s.n)) this.begin({ n: s.n, k: C.length, s: s.s }, this.on || this.n === s.n);
    else if (!s.on && this.on) this.over({ n: this.n, ok: -1 });
    if (this.on) this.left = +s.l || 0;
    if (!C.length) { if (this.cops.length) this.clearCops(); return; }
    if (this.seed !== (s.s | 0)) { this.clearCops(); this.seed = s.s | 0; }
    for (let i = 0; i < C.length; i++) {
      const e = C[i]; if (!Array.isArray(e)) continue; let c = this.cops[i];
      if (!c) { if (e[3] === 5) continue; c = this.cops[i] = this.makeCop(i); c.x = +e[0]; c.z = +e[1]; }
      c.tx = +e[0]; c.tz = +e[1]; c.tr = +e[2]; c.hp = +e[4]; if ((e[3] | 0) !== c.st) this.setSt(c, e[3] | 0);
    }
  },
  camLabels() { const out = []; for (const c of this.cops) if (c.st !== 5) out.push({ pos: c.head, text: 'POLICE', color: '#ff4040', kind: 'police', av: c.av }); return out; }
};

/* =====================================================================
   PROJECTILES — foam darts (instanced), stress balls (props physics)
   ===================================================================== */
const Shots = {
  list: [], im: null, MAX: 90,
  init() { this.im = new THREE.InstancedMesh(RaidArt.dartGeo(), RaidArt.vcMat(), this.MAX); this.im.count = 0; this.im.frustumCulled = false; W.scene.add(this.im); },
  clear() { this.list.length = 0; if (this.im) this.im.count = 0; },
  /* shooter: n darts from o along d with a random spread; others get the same darts (visual only) */
  fire(k, o, d, n, spread, speed) {
    const vs = [];
    for (let i = 0; i < n; i++) {
      _rV.set(d.x + (i ? rand(-spread, spread) : 0), d.y + (i ? rand(-spread, spread) * 0.6 : 0), d.z + (i ? rand(-spread, spread) : 0)).normalize().multiplyScalar(speed);
      vs.push([+_rV.x.toFixed(2), +_rV.y.toFixed(2), +_rV.z.toFixed(2)]);
    }
    const oo = [+o.x.toFixed(2), +o.y.toFixed(2), +o.z.toFixed(2)]; this.spawn(k, oo, vs, true); Net.emit('raid:shot', { k, o: oo, v: vs });
  },
  spawn(k, o, vs, local) {
    for (const v of vs) { if (this.list.length >= this.MAX) this.list.shift(); const sp = Math.hypot(v[0], v[1], v[2]) || 1; this.list.push({ k, x: +o[0], y: +o[1], z: +o[2], vx: +v[0], vy: +v[1], vz: +v[2], dx: v[0] / sp, dy: v[1] / sp, dz: v[2] / sp, st: 0, t: 0, local, s: k === 'sniper' ? 1.45 : 1 }); }
  },
  W: { foam: { dmg: 0.6, stun: 0.5, kb: 1.6, k: 'foam', f: 2.2, s: 0.4, npc: 'bonk', word: 'POMF!', wc: '#ff9a3c', stars: 3 },
    sniper: { dmg: 3, stun: 1.6, kb: 4.5, k: 'sniper', f: 4.5, s: 1.1, npc: 'hit', word: 'BULLSEYE!', wc: '#7cf05b', stars: 7 } },
  hitTest(s, x, y, z) {
    const w = this.W[s.k] || this.W.foam; let hit = null, top = 0;
    for (const c of Raid.cops) { if (c.st >= 3 && c.st !== 6) continue; if (y > 0.1 && y < 1.9 && Math.hypot(x - c.x, z - c.z) < 0.36) { hit = { kind: 'cop', ref: c, x: c.x, y, z: c.z, top: 1.8 }; break; } }
    if (!hit) for (const g of Props._targets) { if (g.me) continue; if (y > g.y0 && y < g.y1 + 0.1 && Math.hypot(x - g.x, z - g.z) < g.r + 0.04) { hit = { kind: g.kind, ref: g, x: g.x, y, z: g.z, top: g.y1 }; break; } }
    if (!hit) return false;
    RaidW.strike(hit, w, s.vx, s.vz, s.k === 'foam' && Math.random() < 0.6);
    s.vx *= -0.22; s.vz *= -0.22; s.vy = 1.6; s.st = 2; s.x = x; s.y = y; s.z = z; SFX.bonk(_rV.set(x, y, z));
    return true;
  },
  update(dt) {
    if (!this.im) return;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const s = this.list[i]; s.t += dt;
      if (s.st === 1) { if (s.t > 5) this.list.splice(i, 1); continue; }
      if (s.t > 4) { this.list.splice(i, 1); continue; }
      const g = s.st === 0 ? (s.k === 'sniper' ? 1.2 : 3.4) : 9.8, steps = Math.max(1, Math.ceil(Math.hypot(s.vx, s.vy, s.vz) * dt / 0.16)), h = dt / steps;
      for (let j = 0; j < steps; j++) {
        s.vy -= g * h; const nx = s.x + s.vx * h, ny = s.y + s.vy * h, nz = s.z + s.vz * h;
        if (s.st === 0 && s.local && this.hitTest(s, nx, ny, nz)) break;
        const gr = Space.ground(nx, s.y + 0.05, nz);
        if (ny <= gr + 0.014) { s.x = nx; s.z = nz; s.y = gr + 0.014; s.st = 1; s.t = 0; const l = Math.hypot(s.dx, s.dz) || 1; s.dx /= l; s.dz /= l; s.dy = 0; break; }
        if (Space.solid(nx, ny, nz, 0.02) || ny > ROOM_H - 0.03) { if (s.st === 0) { s.st = 1; s.t = 0; FX.spawn('puff', [s.x, s.y, s.z], { scale: 0.18, color: '#ffb36b' }); } else { s.vx *= -0.3; s.vz *= -0.3; } break; }
        s.x = nx; s.y = ny; s.z = nz;
      }
      if (s.st !== 1) { const sp = Math.hypot(s.vx, s.vy, s.vz); if (sp > 0.5) { s.dx = s.vx / sp; s.dy = s.vy / sp; s.dz = s.vz / sp; } }
    }
    const im = this.im; let n = 0;
    for (const s of this.list) { _rV.set(s.dx, s.dy, s.dz); _rQ.setFromUnitVectors(_rZ, _rV); _rS.setScalar(s.s); _rM.compose(_rV2.set(s.x, s.y, s.z), _rQ, _rS); im.setMatrixAt(n++, _rM); }
    im.count = n; if (n) im.instanceMatrix.needsUpdate = true;
  }
};
PropTypes.stressball = { name: 'stress ball', r: 0.06, bounce: 0.72, fric: 0.5, roll: true, model: () => RaidArt.ball() };

/* =====================================================================
   WEAPONS — cartoon self-defence: ItemDefs for the props hotbar + BonkMart goods ('Weapons & personal safety').
   Every weapon works on cops (damage + stun), coworkers (a reaction) and teammates (mild slapstick knockback).
   ===================================================================== */
const _wSvg = b => '<svg viewBox="0 0 48 48" stroke="#141824" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">' + b + '</svg>';
const W_ICONS = {
  mace: _wSvg('<path d="M35 9c3-1 6 0 7 2M36 15c3 0 5 1 6 3" fill="none" stroke="#ff8a3c" stroke-width="2.6"/><circle cx="40" cy="6" r="2.4" fill="#ffb347" stroke="none"/><rect x="17" y="13" width="15" height="30" rx="4" fill="#262a33"/><rect x="17" y="21" width="15" height="13" fill="#ff7a1a" stroke="none"/><circle cx="24.5" cy="27.5" r="4.2" fill="#7a4a24" stroke-width="2"/><rect x="20" y="6" width="9" height="7" rx="2" fill="#d6342c"/><path d="M29 9h4" stroke-width="2.6"/>'),
  taser: _wSvg('<path d="M6 13h27a5 5 0 0 1 5 5v5a5 5 0 0 1-5 5H23l-3 12h-9l3-12H9a3 3 0 0 1-3-3z" fill="#ffd43b"/><path d="M6 21h32" stroke-width="2.4"/><path d="M41 12l5-2-3 5 4 0-6 6" fill="none" stroke="#3bd0ff" stroke-width="2.6"/>'),
  foam: _wSvg('<rect x="4" y="12" width="30" height="5.5" rx="2.5" fill="#2f7de1"/><rect x="4" y="18" width="30" height="5.5" rx="2.5" fill="#2f7de1"/><rect x="33" y="11" width="6" height="14" rx="2" fill="#ff8a12"/><path d="M20 24h14l-4 16h-9l2-9h-6z" fill="#ff8a12"/><rect x="10" y="10" width="8" height="15" rx="2" fill="#ffd23b"/><circle cx="43" cy="14.5" r="2.6" fill="#ff8a12" stroke-width="2"/><circle cx="44" cy="21" r="2.6" fill="#1f6fd6" stroke-width="2"/>'),
  sniper: _wSvg('<rect x="13" y="9" width="17" height="6" rx="3" fill="#30343e"/><path d="M2 19h9l4-3h22v7H24l-3 10h-7l2-10H6l-4 5z" fill="#ff8a12"/><rect x="36" y="18" width="10" height="3.4" rx="1.6" fill="#f1efe8" stroke-width="2.2"/><path d="M2 19v5" stroke-width="2.4"/>'),
  stress: _wSvg('<rect x="6" y="15" width="28" height="13" rx="5" fill="#38b25a"/><rect x="31" y="13" width="7" height="17" rx="2.5" fill="#ffd23b"/><path d="M13 27l-3 12h8l3-12z" fill="#8a63d2"/><circle cx="43" cy="12" r="4.5" fill="#ff5c93" stroke-width="2.4"/><circle cx="42" cy="28" r="3.6" fill="#3bc9ff" stroke-width="2.2"/><path d="M41.4 12.6a1.6 1.6 0 0 0 3.2 0" fill="none" stroke-width="1.6"/>'),
  hammer: _wSvg('<path d="M26 22L10 42" stroke="#141824" stroke-width="9"/><path d="M26 22L10 42" stroke="#3b82f6" stroke-width="4.5"/><rect x="14" y="5" width="28" height="18" rx="8" fill="#ff4d5a" transform="rotate(38 28 14)"/><path d="M19 9l14 11" stroke="#ffffff" stroke-width="2.6" opacity=".55"/><circle cx="23" cy="10" r="1.6" fill="#141824" stroke="none"/>'),
  baton: _wSvg('<path d="M12 42L38 9" stroke="#141824" stroke-width="10"/><path d="M12 42L38 9" stroke="#2a2d34" stroke-width="5.6"/><path d="M13.5 40.5l5-6" stroke="#ffd23b" stroke-width="5.6" stroke-linecap="butt"/><path d="M27 19l-9 3" stroke="#141824" stroke-width="7"/><path d="M27 19l-9 3" stroke="#2a2d34" stroke-width="3"/>'),
  shield: _wSvg('<rect x="9" y="4" width="30" height="40" rx="7" fill="#bfe6ff" fill-opacity=".85"/><rect x="12" y="10" width="24" height="8" rx="2" fill="#1b2747" stroke-width="2"/><circle cx="24" cy="30" r="6" fill="#ffd23b" stroke-width="2.4"/><path d="M21 31a3 3 0 0 0 6 0" fill="none" stroke-width="2"/>')
};
/* id: [name, price, colour, description, hotbar hint, cooldown] */
const RAID_W = {
  mace: { name: 'Bear Mace', price: 120, color: '#9b5de5', cd: 0.5, uses: 8,
    desc: 'A pocket-sized performance review. Eight bursts per can: officers forget why they came, coworkers forget your birthday.' },
  taser: { name: 'Motivational Taser', price: 260, color: '#2fb344', cd: 1.6, hint: 'Click to zap (7 m)',
    desc: 'Delivers actionable feedback at seven metres. Recharges between pep talks. Not approved by the wellness committee.' },
  foam: { name: 'Conflict Resolution Foam Blaster', price: 320, color: '#ff8a12', cd: 0.9, hint: 'Click to fire six foam darts',
    desc: 'Six foam darts per pump. Settles any dispute before HR finishes reading the complaint form.' },
  shield: { name: 'Customer Support Riot Shield', price: 280, color: '#ff6b2c', cd: 0.7, hint: 'Hold it to block arrests, click to bash',
    desc: 'Officers bounce off it like complaints off the call script. Hold it towards them. Click to shove.' },
  sniper: { name: 'Remote-Work Nerf Sniper', price: 480, color: '#8fb4e6', cd: 1.2, hint: 'Hold click to aim, release to fire', hold: true,
    desc: 'Manage colleagues from the far side of the building. Hold to zoom, release to deliver one very focused foam dart.' },
  stress: { name: 'Stress-Ball Launcher', price: 220, color: '#20c997', cd: 0.6, hint: 'Click to launch a stress ball',
    desc: 'Fires smiley stress balls at alarming speeds. Very relaxing, for one of the two people involved.' },
  hammer: { name: 'Inflatable Hammer', price: 90, color: '#ff4d8d', cd: 0.55, hint: 'Click to bonk (huge knockback)',
    desc: 'Squeaky, harmless and somehow still a disciplinary matter. Sends people flying, gently.' },
  baton: { name: 'Batton (Definitely Spelled Right)', price: 160, color: '#fab005', cd: 0.6, hint: 'Click to swing',
    desc: 'Standard issue for middle management. The typo on the side was signed off by Legal.' }
};
/* hit parameters: dmg/stun/kb on cops, f/s knockback + stun on teammates, npc reaction, comic word */
const W_HIT = {
  mace: { dmg: 0.9, stun: 2.6, kb: 1, k: 'mace', f: 1.2, s: 1.4, npc: 'hit', word: 'ACHOO!', wc: '#ff9a3c', stars: 3, ouch: 'mace' },
  taser: { dmg: 1.6, stun: 3, kb: 2, k: 'zap', f: 2.5, s: 1.8, npc: 'hit', word: 'ZAP!', wc: '#7fe8ff', stars: 5, ouch: 'zap' },
  stress: { dmg: 1, stun: 1, kb: 4, k: 'stress', f: 4, s: 0.8, npc: 'bonk', word: 'SQUISH!', wc: '#7cf05b', stars: 4 },
  hammer: { dmg: 0.8, stun: 0.9, kb: 7.5, k: 'hammer', f: 8, s: 0.7, npc: 'bonk', word: 'BOING!', wc: '#ff7ab8', stars: 5, r: 2.0 },
  baton: { dmg: 1.4, stun: 1.5, kb: 3.5, k: 'baton', f: 4.5, s: 1.3, npc: 'hit', word: 'BONK!', wc: '#ffd23b', stars: 7, r: 1.9 },
  shield: { dmg: 0.6, stun: 0.8, kb: 8, k: 'shield', f: 7, s: 0.7, npc: 'hit', word: 'SHOVE!', wc: '#7fd4ff', stars: 4, r: 1.6 },
  punch: { dmg: 0.5, stun: 0.6, kb: 3, k: 'punch', word: 'POW!', wc: '#ffd23b', stars: 6 }
};
/* first-person view model placement per weapon: [rx, ry, rz, scale, x, y, z] (hold frame, Euler YXZ) and the muzzle in the model frame */
const W_VM = {
  mace: [0.1, 0.62, 0, 1.1, -0.01, 0.02, 0], taser: [Math.PI / 2, 0.34, 0, 1.0, 0, 0.0, 0], foam: [Math.PI / 2, 0.32, 0, 0.82, 0, 0.01, 0],
  sniper: [Math.PI / 2, 0.3, 0, 0.72, 0, 0.02, 0.02], stress: [Math.PI / 2, 0.32, 0, 0.85, 0, 0.0, 0],
  hammer: [1.45, 0.1, 0.3, 0.8, 0.0, -0.02, 0], baton: [1.5, 0.1, 0.32, 0.95, 0.0, -0.02, 0], shield: [0, 0.38, 0, 0.5, -0.16, -0.06, 0]
};
const W_TIP = { mace: [0, 0, -0.11], taser: [0, -0.2, -0.042], foam: [0, -0.42, -0.05], sniper: [0, -0.67, -0.06], stress: [0, -0.31, -0.075], hammer: [0, 0, -0.34], baton: [0, 0, -0.45], shield: [-0.1, 0.24, -0.14] }; for (const k in W_TIP) W_TIP[k] = new THREE.Vector3().fromArray(W_TIP[k]);
const W_SWING = { hammer: 1, baton: 1, shield: 2 };
const _wO = new THREE.Vector3(), _wD = new THREE.Vector3(), _wT = [], _wTP = [];

const RaidW = {
  cd: {}, maceLeft: 0, aim: 0, aimOn: false, aimT: 0, swingT: 1, swingK: 0, fov: 0,
  isWeapon: id => !!RAID_W[id],
  /* give a weapon; when the hotbar (5 item slots) is full it moves to the front so it can be selected */
  give(id) {
    Inv.give(id); if (Props.slotList().includes(id)) return;
    const n = Inv.items[id], rest = Object.assign({}, Inv.items); delete rest[id]; Inv.items = Object.assign({ [id]: n }, rest); Bus.emit('inv:change', id, n);
  },
  /* everyone a weapon can hit: cops + Props._targets (other players, coworkers, The Boss) */
  targets() {
    const T = _wT; T.length = 0; let k = 0;
    const add = (kind, ref, x, z, y0, y1, r) => { const o = _wTP[k] || (_wTP[k] = {}); k++; o.kind = kind; o.ref = ref; o.x = x; o.z = z; o.y0 = y0; o.y1 = y1; o.r = r; o.top = y1; T.push(o); };
    for (const c of Raid.cops) if ((c.st < 3 || c.st === 6) && c.av.group.visible) add('cop', c, c.x, c.z, 0.1, 1.85, 0.38);
    for (const g of Props._targets) if (!g.me) add(g.kind, g, g.x, g.z, g.y0, g.y1, g.r);
    return T;
  },
  /* the camera ray (crosshair) */
  ray() { const cp = Math.cos(P.pitch); return _wD.set(-Math.sin(P.yaw) * cp, Math.sin(P.pitch), -Math.cos(P.yaw) * cp); },
  /* targets along a ray from o in direction d: closest approach within reach (r + pad + t * widen); sorted by distance */
  along(o, d, max, pad, widen, all) {
    const out = [];
    for (const g of this.targets()) {
      const yc = (g.y0 + g.y1) / 2, t = (g.x - o.x) * d.x + (yc - o.y) * d.y + (g.z - o.z) * d.z; if (t < 0.15 || t > max) continue;
      const px = o.x + d.x * t, py = o.y + d.y * t, pz = o.z + d.z * t;
      if (Math.hypot(px - g.x, pz - g.z) > g.r + pad + t * widen || py < g.y0 - 0.25 - t * widen || py > g.y1 + 0.25 + t * widen) continue;
      if (Space.ray(o.x, o.y, o.z, d.x, d.y, d.z, t, 0) < t - g.r - 0.15) continue;   // behind a wall
      out.push({ g, t, x: px, y: py, z: pz }); if (!all) break;
    }
    out.sort((a, b) => a.t - b.t); return all ? out : out.slice(0, 1);
  },
  /* muzzle position and the direction from it to whatever is under the crosshair */
  muzzle(id, ctx) {
    const o = _wO.copy(ctx.pos), a = Props.held.get('me');
    if (P.third && a && a.obj && a.obj.children[0]) { const m = a.obj.children[0]; m.updateWorldMatrix(true, false); o.copy(W_TIP[id]).applyMatrix4(m.matrixWorld); }
    const c = W.camera.position, f = this.ray(); let dist = Math.min(40, Space.ray(c.x, c.y, c.z, f.x, f.y, f.z, 40, 0));
    const hit = this.along(c, f, dist, 0, 0); if (hit.length) dist = hit[0].t;
    const dir = new THREE.Vector3(c.x + f.x * dist - o.x, c.y + f.y * dist - o.y, c.z + f.z * dist - o.z).normalize();
    return { o: o.clone(), d: dir };
  },
  /* one hit on a target from a weapon (local player decides, everyone sees it) */
  strike(hit, w, dx, dz, conf) {
    const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    const top = hit.top != null ? hit.top : 1.7, k = hit.kind;
    if (w.word) FX.net('word', [hit.x, top + 0.5, hit.z], { w: w.word, c: w.wc, s: 1 });
    if (conf) FX.net('confetti', [hit.x, top - 0.2, hit.z], { n: 18, dir: [dx, 0.6, dz] });
    if (k === 'cop') { FX.net('stars', [hit.x, top, hit.z], { n: w.stars || 4, scale: 0.85 }); Raid.hitCop(hit.ref, w.dmg, w.stun, dx * w.kb, dz * w.kb, w.k); }
    else if (k === 'player') {
      FX.spawn('stars', [hit.x, top, hit.z], { n: w.stars || 4, scale: 0.8 });
      const m = { id: hit.ref.id, d: [+dx.toFixed(2), +dz.toFixed(2)], f: w.f, s: w.s, sl: 0, y: +top.toFixed(2) };
      Net.emit('hit', m); onHitMsg(m, Net.myId, true); if (w.ouch) Net.emit('raid:ouch', { id: hit.ref.id, k: w.ouch }, { to: hit.ref.id });
    } else if (k === 'npc') { FX.net('stars', [hit.x, top, hit.z], { n: w.stars || 4, scale: 0.8 }); Props.npcNet(hit.ref.n, w.npc || 'hit', true); }
  },
  /* the victim's side of a mace / taser hit */
  ouch(k) {
    if (k === 'mace') { FX.tint('#ff7a1a', 0.32, 2.2); SFX.cough(); toast(pick(['Bear mace! Your eyes are watering.', 'Spicy! You cannot see a thing.', 'That was a performance review to the face.']), 'bad'); }
    else if (k === 'zap') { FX.flash('#bff4ff', 0.3, 0.7); FX.shake(0.4, 0.4); toast(pick(['Bzzzt! You feel extremely motivated.', 'Zapped! Your hair is standing up.', 'Actionable feedback received.']), 'bad'); }
  },
  use(id, ctx) {
    const w = RAID_W[id]; if (!w || W.t < (this.cd[id] || 0)) return; this.cd[id] = W.t + w.cd;
    if (id === 'mace') this.spray(ctx);
    else if (id === 'taser') this.zap(ctx);
    else if (id === 'foam') { const m = this.muzzle(id, ctx); Shots.fire('foam', m.o, m.d, 6, 0.075, 21); RaidSnd.fwump(m.o); Props.vmKick = 0; Avatars.act('point', { dur: 0.55 }); }
    else if (id === 'sniper') { this.aimOn = true; this.aimT = 0; }
    else if (id === 'stress') {
      const m = this.muzzle(id, ctx), s = 15; Props.launch('stressball', [m.o.x, m.o.y, m.o.z], [m.d.x * s + (P.vx || 0) * 0.5, m.d.y * s + 1.2, m.d.z * s + (P.vz || 0) * 0.5]);
      RaidSnd.fwump(m.o); RaidSnd.squeak(m.o); Props.vmKick = 0; Avatars.act('point', { dur: 0.5 });
    } else this.melee(id);
  },
  /* Bear Mace: a cone of orange pepper spray, everyone in it sneezes */
  spray(ctx) {
    if (this.maceLeft <= 0) this.maceLeft = RAID_W.mace.uses;
    const m = this.muzzle('mace', ctx), f = this.ray(), e = eyePos();
    FX.net('mace', [m.o.x, m.o.y, m.o.z], { dir: [+m.d.x.toFixed(2), +(m.d.y + 0.05).toFixed(2), +m.d.z.toFixed(2)] });
    Avatars.act('spray', { dur: 0.6 }); Props.vmKick = 0.5;
    for (const h of this.along(e, f, 3.6, 0.15, 0.3, true)) this.strike(h.g, W_HIT.mace, h.g.x - P.pos.x, h.g.z - P.pos.z);
    if (--this.maceLeft <= 0) { Inv.take('mace'); toast(Inv.count('mace') ? 'Can empty. Opening a fresh one.' : 'Your Bear Mace is empty.', Inv.count('mace') ? '' : 'bad'); }
    HUDBar.nameHTML && HUDBar.el && HUDBar.nameHTML();
  },
  /* Motivational Taser: a crackling bolt to the first target under the crosshair (7 m) */
  zap(ctx) {
    const m = this.muzzle('taser', ctx), e = eyePos(), f = this.ray(), h = this.along(e, f, 7, 0.22, 0.03)[0];
    let to;
    if (h) to = [h.g.x, Math.min(h.g.y1 - 0.35, Math.max(h.g.y0 + 0.5, h.y)), h.g.z];
    else { const d = Math.min(7, Space.ray(e.x, e.y, e.z, f.x, f.y, f.z, 7, 0)); to = [e.x + f.x * d, e.y + f.y * d, e.z + f.z * d]; }
    FX.net('zap', [m.o.x, m.o.y, m.o.z], { to: to.map(v => +v.toFixed(2)) });
    Props.vmKick = 0; Avatars.act('point', { dur: 0.5 });
    if (h) this.strike(h.g, W_HIT.taser, h.g.x - P.pos.x, h.g.z - P.pos.z);
  },
  /* sniper: hold to zoom, release to fire */
  aimEnd(id, ctx) {
    if (!this.aimOn) return; this.aimOn = false; const m = this.muzzle(id, ctx);
    Shots.fire('sniper', m.o, m.d, 1, 0, 42); RaidSnd.thwip(m.o); Props.vmKick = 0; Avatars.act('point', { dur: 0.5 }); this.cd[id] = W.t + RAID_W.sniper.cd;
  },
  /* hammer / baton / shield bash: a short cone in front */
  melee(id) {
    const w = W_HIT[id], fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw); let best = null, bd = w.r;
    for (const g of this.targets()) {
      const dx = g.x - P.pos.x, dz = g.z - P.pos.z, d = Math.hypot(dx, dz); if (d > bd + g.r * 0.5 || d < 0.01 || (dx * fx + dz * fz) / d < 0.5) continue; best = g; bd = d;
    }
    this.swingT = 0; this.swingK = W_SWING[id] || 1; Props.act(id === 'shield' ? 'punch' : 'slap'); SFX.whoosh();
    if (!best) return;
    setTimeout(() => {
      if (id === 'hammer') RaidSnd.boing(_rV.set(best.x, 1.4, best.z)); else if (id === 'baton') { SFX.punch(); SFX.bonk(); } else SFX.punch();
      FX.shake(0.2, 0.15); this.strike(best, w, fx, fz, id === 'hammer' && Math.random() < 0.5);
    }, 110);
  },
  /* stress balls in flight vs cops (props.js already bonks players and coworkers) */
  stressHits(t) {
    if (!Raid.cops.length) return;
    for (const b of Props.bodies) {
      if (b.type !== 'stressball' || !b.local || b.rest || t - b.hitT < 0.4 || b.vel.lengthSq() < 9) continue;
      for (const c of Raid.cops) {
        if (c.st >= 3 && c.st !== 6) continue; const dx = b.pos.x - c.x, dz = b.pos.z - c.z, d = Math.hypot(dx, dz);
        if (d > 0.45 || b.pos.y < 0.1 || b.pos.y > 1.9) continue;
        b.hitT = t; this.strike({ kind: 'cop', ref: c, x: c.x, z: c.z, top: 1.8 }, W_HIT.stress, b.vel.x, b.vel.z);
        const nx = dx / (d || 1), nz = dz / (d || 1), dot = b.vel.x * nx + b.vel.z * nz; if (dot < 0) { b.vel.x -= 1.6 * dot * nx; b.vel.z -= 1.6 * dot * nz; }
        b.vel.multiplyScalar(0.4); b.vel.y = Math.max(b.vel.y, 1.5); Props.launch(b.type, [b.pos.x, b.pos.y, b.pos.z], [b.vel.x, b.vel.y, b.vel.z], { id: b.id });
        break;
      }
    }
  },
  /* per frame (after the props view model update): sniper zoom + scope, melee swing on the view model */
  update(dt) {
    const id = Props.slots[Props.sel], held = !Props.carry && id === 'sniper' && Props.useDown && Props.useId === 'sniper' && this.aimOn;
    if (this.aimOn && !held) this.aimOn = false;
    this.aim = clamp(this.aim + (held ? dt * 4 : -dt * 6), 0, 1);
    const cam = W.camera;
    if (this.aim > 0 && cam && !P.seated && !P.cam) { const f = lerp(cam.fov, 26, this.aim * this.aim * (3 - 2 * this.aim)); if (Math.abs(cam.fov - f) > 0.01) { cam.fov = f; cam.updateProjectionMatrix(); } }
    if (RaidUI.el.scope) RaidUI.el.scope.style.opacity = this.aim > 0.55 ? Math.min(1, (this.aim - 0.55) / 0.3) : 0;
    const v = Props.vm; if (!v || !v.root.visible) return;
    if (this.aim > 0.6) v.root.visible = false;
    if (this.swingT < 1) {
      this.swingT = Math.min(1, this.swingT + dt * 3.2); const k = this.swingT;
      if (this.swingK === 2) { const e = k < 0.3 ? k / 0.3 : 1 - (k - 0.3) / 0.7; v.sway.position.z -= 0.22 * e; v.sway.position.x -= 0.1 * e; }
      else { const up = k < 0.22 ? k / 0.22 : 0, dn = k < 0.22 ? 0 : k < 0.45 ? (k - 0.22) / 0.23 : 1 - (k - 0.45) / 0.55; v.sway.rotation.x += 0.7 * up - 1.6 * dn * dn * (3 - 2 * dn); v.sway.rotation.z += 0.5 * dn; v.sway.position.x -= 0.12 * dn; }
    }
  },
  /* view model: our weapons are modelled in the hand frame, so re-pose them for the first-person hold */
  fixVM(v, key) {
    const p = W_VM[key], m = v.item; if (!p || !m) return;
    m.rotation.set(p[0], p[1], p[2], 'YXZ'); m.scale.setScalar(p[3]); m.position.set(p[4], p[5], p[6]); m.updateMatrix();
    v.anchor.position.copy(W_TIP[key]).applyMatrix4(m.matrix);
    if (v.hand) { v.hand.visible = key !== 'shield'; v.hand.scale.setScalar(1.1); }
  }
};
/* hook our weapons into the props module: first-person pose, and punches that land on cops */
{
  const _set = VM.setItem; VM.setItem = function (v, key) { _set.call(this, v, key); if (v.hand) v.hand.visible = true; if (RAID_W[key]) RaidW.fixVM(v, key); };
  const _hit = Props.doHit; Props.doHit = function (slap) {
    if (Raid.cops.length) {
      const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw); let best = null, bd = 1.75;
      for (const c of Raid.cops) { if (c.st >= 3 && c.st !== 6) continue; const dx = c.x - P.pos.x, dz = c.z - P.pos.z, d = Math.hypot(dx, dz); if (d > bd || d < 0.01 || (dx * fx + dz * fz) / d < 0.55) continue; best = c; bd = d; }
      if (best) { (slap ? SFX.slap : SFX.punch)(); FX.shake(0.22, 0.18); RaidW.strike({ kind: 'cop', ref: best, x: best.x, z: best.z, top: 1.75 }, W_HIT.punch, fx, fz); return; }
    }
    return _hit.call(this, slap);
  };
}
for (const id in RAID_W) {
  const w = RAID_W[id];
  const def = ItemDefs[id] = { name: w.name, desc: w.desc, icon: W_ICONS[id], hint: w.hint, weapon: true, model: () => RaidArt.weapon(id), use: ctx => RaidW.use(id, ctx) };
  if (w.hold) Object.assign(def, { hold: true, useHold() {}, useEnd: ctx => RaidW.aimEnd(id, ctx) });
  if (id === 'mace') Object.defineProperty(def, 'hint', { get: () => 'Click to spray · ' + (RaidW.maceLeft > 0 ? RaidW.maceLeft : RAID_W.mace.uses) + ' bursts left in this can', enumerable: true });
  if (id === 'shield') def.equip = () => toast('Riot shield up: officers who run into the front of it bounce off.', 'good');
  Shop.add({
    id: 'w_' + id, item: id, tab: 'goods', section: 'Weapons & personal safety', name: w.name, desc: w.desc, price: w.price, icon: W_ICONS[id], color: w.color,
    sort: 300 + Object.keys(RAID_W).indexOf(id), repeatable: id === 'mace', available: () => true,
    owned: () => id !== 'mace' && Inv.count(id) > 0, ownedLabel: 'In your hotbar',
    model: () => RaidArt.show(id),
    buy() { RaidW.give(id); const k = Props.slots.indexOf(id); toast(w.name + ' added to your hotbar' + (k >= 0 ? ' (slot ' + (k + 1) + ').' : '.'), 'good'); Game.saveProgress(); }
  });
}

/* =====================================================================
   UI — HUD heat gauge, LegitOS taskbar pill, raid banner, red/blue edge glow, busted card, sniper scope
   ===================================================================== */
const RAID_CHARGES = ['Excessive legitimacy', 'Aggravated cold calling', 'Felony small talk', 'Unlicensed synergy', 'Loitering with intent to upsell',
  'Operating a headset without a permit', 'Impersonating customer service', 'Grand theft auto-dialer', 'Possession of a suspicious quota'];
const COP_ICON = '<svg viewBox="0 0 24 24"><path d="M4 9.5c0-2.6 3.6-4.5 8-4.5s8 1.9 8 4.5l-1.4.6H5.4z" fill="#26396a" stroke="#0f131d" stroke-width="1.6" stroke-linejoin="round"/><path d="M5.6 10.4h12.8v1.8c0 4-2.8 7.8-6.4 7.8s-6.4-3.8-6.4-7.8z" fill="#f0c49c" stroke="#0f131d" stroke-width="1.6"/><path d="M7.4 12.6h3.8M12.8 12.6h3.8" stroke="#0f131d" stroke-width="2.4" stroke-linecap="round"/><path d="M8.6 16.2c1.6-.9 2.4-.2 3.4-.2s1.8-.7 3.4.2" fill="none" stroke="#5a3a24" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="7.4" r="1.4" fill="#f2c14e"/></svg>';
const RaidUI = {
  el: {}, _k: {}, grab: false,
  build() {
    if (this.el.hud) return; const E = this.el, hud = $('#hud');
    E.hud = h('div', { id: 'raid-heat', class: 'hidden' },
      E.ic = h('div', { class: 'rh-ic', html: OS.glyph('flame') }),
      h('div', { class: 'rh-main' },
        h('div', { class: 'rh-top' }, E.title = h('b', {}, 'HEAT'), E.word = h('span', { class: 'rh-word' })),
        h('div', { class: 'rh-bar' }, E.fill = h('i'), h('u')),
        E.cops = h('div', { class: 'rh-cops' })));
    if (hud) hud.append(E.hud);
    const st = $('#tb-stats');
    E.pill = h('div', { id: 'tb-heat', title: 'Team heat: every scam attracts attention. Too much and the police pay a visit.' },
      E.pic = h('i', { html: OS.glyph('flame') }), E.ptxt = h('b', {}, 'HEAT'), h('span', { class: 'th-bar' }, E.pfill = h('u')), E.pval = h('em'));
    if (st && st.parentNode) st.parentNode.insertBefore(E.pill, st);
    E.glow = h('div', { id: 'raid-glow' }); E.alert = h('div', { id: 'raid-alert' }); E.bust = h('div', { id: 'raid-bust', class: 'hidden' });
    E.scope = h('div', { id: 'raid-scope' }, h('i'));
    document.body.append(E.glow, E.scope, E.alert, E.bust);
  },
  set(k, el, v, prop) { if (this._k[k] === v) return; this._k[k] = v; if (prop === 'html') el.innerHTML = v; else if (prop) el.style[prop] = v; else el.textContent = v; },
  word(h) { return h >= 95 ? 'SIRENS!' : h >= RAID.risk ? 'Raid risk!' : h >= 50 ? 'Hot' : h >= 25 ? 'Warm' : 'Chill'; },
  col(h) { const k = clamp(h / 100, 0, 1); return 'hsl(' + Math.round(52 - 50 * k) + ',' + Math.round(92 + 6 * k) + '%,' + Math.round(56 - 6 * k) + '%)'; },
  tick() {
    const E = this.el; if (!E.hud) return;
    if (this.alertT && W.t > this.alertT) this.alertOff();
    const ht = Raid.heat, on = Raid.on, live = G.phase === 'day' || G.phase === 'lobby', pct = Math.round(ht);
    const vis = live && !P.seated && P.review < 0 && !G.paused && !Raid.bust;
    E.hud.classList.toggle('hidden', !vis); document.body.classList.toggle('raid-busted', !!Raid.bust);
    if (vis) { const s = $('#hud-stats'), r = s && s.getBoundingClientRect(); this.set('top', E.hud, (r && r.height ? Math.round(r.bottom + 8) : 96) + 'px', 'top'); }
    E.hud.classList.toggle('raid', on); E.hud.classList.toggle('risk', !on && ht >= RAID.risk); E.pill.classList.toggle('raid', on); E.pill.classList.toggle('risk', !on && ht >= RAID.risk);
    E.pill.classList.toggle('hidden', !live);
    const col = this.col(ht);
    if (on) {
      let left = 0; for (const c of Raid.cops) if (c.st < 4 || c.st === 6) left++;
      this.set('t', E.title, 'POLICE RAID'); this.set('w', E.word, fmtTime(Raid.left)); this.set('f', E.fill, Math.round(Raid.left / RAID.dur * 100) + '%', 'width');
      this.set('c', E.cops, Raid.cops.map(c => '<span class="' + (c.st < 3 || c.st === 6 ? '' : c.st === 3 ? 'dz' : 'out') + '">' + COP_ICON + '</span>').join('') + '<em>' + left + ' in the building</em>', 'html');
      this.set('pt', E.ptxt, 'RAID'); this.set('pv', E.pval, fmtTime(Raid.left)); this.set('pf', E.pfill, Math.round(Raid.left / RAID.dur * 100) + '%', 'width');
    } else {
      this.set('t', E.title, 'HEAT'); this.set('w', E.word, this.word(ht) + ' ' + pct + '%'); this.set('f', E.fill, pct + '%', 'width'); this.set('c', E.cops, '', 'html');
      this.set('pt', E.ptxt, 'HEAT'); this.set('pv', E.pval, pct + '%'); this.set('pf', E.pfill, pct + '%', 'width');
    }
    if (this._k.col2 !== col) { this._k.col2 = col; E.hud.style.setProperty('--heat', col); E.pill.style.setProperty('--heat', col); }
  },
  /* big banner: 'raid' | 'win' | 'lose' */
  alert(kind, amt) {
    const E = this.el; if (!E.alert) return;
    const M = {
      raid: ['POLICE RAID!', 'Cops at the front door! Mace them, tase them, or hide under a desk.'],
      win: ['RAID REPELLED!', 'Hazard pay +' + money(RAID.hazard) + ' each. Legal says this never happened.'],
      lose: ['RAID OVER', amt > 0 ? 'The officers seized ' + money(amt) + ' of your petty cash on the way out.' : 'The officers got bored and went for donuts.']
    }[kind]; if (!M) return;
    E.alert.className = ''; void E.alert.offsetWidth; E.alert.className = 'on ' + kind; this.alertT = W.t + 4;
    E.alert.replaceChildren(h('div', { class: 'ra-in' }, h('i', { class: 'ra-l' }), h('div', { class: 'ra-t' }, h('b', {}, M[0]), h('small', {}, M[1])), h('i', { class: 'ra-r' })));
  },
  alertOff(now) { const a = this.el.alert; this.alertT = 0; if (!a || !a.className) return; if (now) a.className = ''; else { a.classList.add('out'); clearTimeout(this._at); this._at = setTimeout(() => { if (a.classList.contains('out')) a.className = ''; }, 450); } },
  glow(on) { if (this.el.glow) this.el.glow.classList.toggle('on', !!on); },
  busted(fine) {
    const E = this.el; if (!E.bust) return;
    if (fine == null) { E.bust.className = 'hidden'; E.bust.replaceChildren(); return; }
    E.bust.className = ''; void E.bust.offsetWidth; E.bust.className = 'on';
    E.bust.replaceChildren(
      h('div', { class: 'rb-stamp' }, 'BUSTED!'),
      h('div', { class: 'rb-info' }, h('small', {}, 'Charged with'), h('b', {}, pick(RAID_CHARGES)),
        h('span', { class: 'rb-fine' }, fine > 0 ? 'Fine -' + money(fine) : 'Fine waived: your wallet is empty'), h('em', {}, 'Booked in the lobby. Released at the front door in a moment.')));
  },
  /* the mugshot: grab the frame right after it is rendered and pin it on the busted card as a photo */
  snap() { this.grab = true; },
  render() {
    if (!this.grab) return; this.grab = false; const E = this.el, src = W.renderer && W.renderer.domElement; if (!src || !E.bust || !Raid.bust) return;
    const cw = 220, chh = 250, c = h('canvas', { width: cw, height: chh }), g = c.getContext('2d'), sw = src.height * 0.62 * cw / chh, sh = src.height * 0.62;
    try { g.drawImage(src, (src.width - sw) / 2, src.height * 0.12, sw, sh, 0, 0, cw, chh); } catch (e) { return; }
    E.bust.append(h('div', { class: 'rb-photo' }, c, h('b', {}, (settings.name || 'Agent').slice(0, 18)), h('small', {}, 'CASE #404-' + RaidArt.caseNo)));
  }
};

/* =====================================================================
   NETWORK + LIFECYCLE
   ===================================================================== */
Net.on('raid:go', d => { if (d && !Net.isHost && typeof d.n === 'number') Raid.begin({ n: d.n | 0, k: clamp(d.k | 0, 1, 6), s: d.s | 0 }); });
Net.on('raid:end', d => { if (d && !Net.isHost && Raid.on) Raid.over({ n: d.n | 0, ok: d.ok ? 1 : 0, k: d.k | 0 }); });
Net.on('raid:heat', d => { if (d && Net.isHost) { Raid.heat = clamp(Raid.heat + clamp(+d.a || 0, -30, 30), 0, RAID.max); Bus.emit('raid:heat', Raid.heat); } });
Net.on('raid:hit', d => {
  if (!d || !Net.isHost) return; const c = Raid.cops[d.c | 0], kb = Array.isArray(d.kb) ? d.kb : [0, 0];
  if (c) Raid.hurt(c, clamp(+d.d || 0, 0, 4), clamp(+d.s || 0, 0, 4), clamp(+kb[0] || 0, -9, 9), clamp(+kb[1] || 0, -9, 9), typeof d.k === 'string' ? d.k.slice(0, 10) : 'hit');
});
Net.on('raid:arrest', d => { if (d && d.id != null) Raid.onArrest({ id: String(d.id), c: d.c | 0 }); });
Net.on('raid:block', d => { if (d && d.id != null) Raid.onBlock({ id: String(d.id), c: d.c | 0 }); });
Net.on('raid:shot', d => {
  if (!d || !Shots.W[d.k] || !Array.isArray(d.o) || d.o.length !== 3 || !Array.isArray(d.v)) return;
  const vs = d.v.slice(0, 8).filter(v => Array.isArray(v) && v.length === 3).map(v => v.map(x => clamp(+x || 0, -60, 60)));
  Shots.spawn(d.k, d.o.map(Number), vs, false); _rV.set(+d.o[0] || 0, +d.o[1] || 0, +d.o[2] || 0); if (d.k === 'sniper') RaidSnd.thwip(_rV); else RaidSnd.fwump(_rV);
});
Net.on('raid:ouch', d => { if (d && d.id === Net.myId && typeof d.k === 'string') RaidW.ouch(d.k); });
Net.share('raid', () => Raid.shared(), s => Raid.applyShared(s));

Bus.on('world:built', () => { RaidLights.build(); Shots.init(); RaidNav.build(); });
Bus.on('boot', () => RaidUI.build());
/* heat: bigger payouts are louder, a scambaiter disaster is very loud */
Bus.on('scam:paid', e => { if (G.phase === 'day') Raid.addHeat(clamp(6 + ((e && +e.amt) || 0) / 30, 6, 26)); });
Bus.on('scam:baited', () => { if (G.phase === 'day') Raid.addHeat(18); });
Bus.on('raid:heat', hh => { const k = hh >= RAID.risk; if (k && !Raid._warned && !Raid.on && G.phase === 'day') toast('The heat is on. Someone at the bank called the police...', 'bad'); Raid._warned = k; });
Bus.on('game:begin', () => { Raid.abort(); Raid.heat = 0; Raid.n = 0; Raid.lastEnd = -999; Raid._warned = false; Shots.clear(); RaidW.maceLeft = 0; RaidW.aim = 0; RaidW.aimOn = false; });
Bus.on('day:start', () => { Raid.abort(); if (Net.isAuth()) Raid.heat = Math.round(Raid.heat * 0.5); Raid.lastEnd = -999; Shots.clear(); });
Bus.on('review', () => Raid.abort());
Bus.on('quit', () => { Raid.abort(); Raid.heat = 0; Shots.clear(); RaidUI.tick(); });
Loop.add((dt, t) => { Raid.update(dt, t); RaidW.update(dt); });
Loop.addRender(() => RaidUI.render());
