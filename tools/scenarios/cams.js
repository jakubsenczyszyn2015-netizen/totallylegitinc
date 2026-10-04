/* Cams scenario: the Camera (webcam) app alone, with a teammate leaning in, every webcam effect; the CCTV console
   (grid + enlarged feed); the Bonk SnapCam: flash, a photo fluttering in the office, lying on a desk, held.
   CAMS_ONLY=webcam,fx,cctv,photo runs some parts. Waits are in game time; screenshots freeze the frame loop. */
module.exports = async page => {
  const only = (process.env.CAMS_ONLY || '').split(',').filter(Boolean), want = k => !only.length || only.includes(k);
  const ev = (f, ...a) => page.eval(f, ...a);
  const gw = sec => ev(s => new Promise(res => { const t0 = W.t; const f = () => (W.t - t0 >= s ? res(true) : setTimeout(f, 30)); f(); }), sec);
  const shot0 = page.shot; page.shot = async n => {
    await ev(() => new Promise(res => { document.querySelectorAll('.toast').forEach(t => t.remove()); const raf = window.requestAnimationFrame; window.__raf = raf; window.requestAnimationFrame = cb => { window.__cb = cb; return 0; }; raf(() => setTimeout(() => res(true), 30)); }));
    const r = await shot0(n);
    await ev(() => { window.requestAnimationFrame = window.__raf; if (window.__cb) window.__raf(window.__cb); return true; });
    return r;
  };
  /* wait until a camera has rendered n more frames */
  const frames = (which, n) => ev((w, n) => new Promise(res => { const c = w === 'web' ? CamApp.cam : w === 'big' ? CCTV.big : CCTV.grid[0]; const f0 = c ? c.frames : 0, t0 = W.t; const f = () => ((c && c.frames >= f0 + n) || W.t - t0 > 6 ? res(c ? c.frames : -1) : setTimeout(f, 40)); f(); }), which, n);

  await page.startSolo('week');
  await ev(() => { const T = window.__tli; T.OS.fastBoot = true; T.Call.state = 'idle'; T.Call.wait = 1e9; return true; });
  const desk = await ev(() => { const T = window.__tli; const d = T.W.desks.filter(x => !x.npc && !T.Game.deskTaken(x.i))[2]; sitAt(d.i); return d.i; });
  await gw(1.2);
  await ev(() => { const T = window.__tli; T.OS.close('memo', true); const ph = T.OS.wins.get('phone'); if (ph) T.OS.minimise('phone'); settings.camFx = 'none'; return true; });
  // a teammate for the test (a real avatar, posed every frame)
  await ev(d => {
    const D = W.desks[d], s = Math.sin(D.rot), c = Math.cos(D.rot), L = (lx, lz) => [D.x + c * lx + s * lz, D.z - s * lx + c * lz];
    const mate = window.__mate = buildAvatar({ name: 'Dana', look: Object.assign(lookFromSeed(77), { skin: '#8d5524', hair: 'afro', hairColor: '#1b1410', shirt: '#14b8a6', glasses: 'round' }) });
    W.scene.add(mate.group); mate.lookCam = false; window.__mateL = L; window.__mateD = D;
    window.__matePose = Loop.add((dt, t) => poseAvatar(mate, false, t, 0));
    Cams.labels.push(() => mate.group.visible ? [{ pos: mate.head.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.55, 0)), text: 'Dana', color: '#14b8a6', kind: 'player', av: mate }] : []); Cams.hideTags.push(mate.tag);
    mate.group.visible = false; return true;
  }, desk);

  if (want('webcam')) {
    await ev(() => { window.__tli.OS.launch('camera'); return true; });
    await frames('web', 3);
    await page.shot('c01-webcam');
    const info = await ev(() => ({ frames: CamApp.cam.frames, fx: CamApp.fx(), vis: CamApp.visible() }));
    console.log('webcam: ' + JSON.stringify(info));
    // teammate leaning in behind your right shoulder, waving
    await ev(() => { const m = __mate, p = __mateL(0.42, 1.05); m.group.visible = true; m.group.position.set(p[0], 0, p[1]); m.group.rotation.y = __mateD.rot + 0.35; m.play('wave', { loop: true }); m.setMood('happy'); return true; });
    await ev(() => { Cams.talkUntil = W.t + 5; return true; });
    await gw(0.6); await frames('web', 2);
    await page.shot('c02-webcam-mate');
  }

  if (want('fx')) {
    await ev(() => { if (!window.__tli.OS.wins.get('camera')) window.__tli.OS.launch('camera'); const m = __mate, p = __mateL(-0.5, 1.15); m.group.visible = true; m.group.position.set(p[0], 0, p[1]); m.group.rotation.y = __mateD.rot - 0.3; m.play('point', { loop: true }); return true; });
    await ev(() => { const w = window.__tli.OS.wins.get('camera'); w.el.querySelector('.cam-tab').click(); return true; });
    for (const fx of ['pro', 'boss', 'beauty', 'potato', 'night']) {
      await ev(f => { CamApp.setFx(f); CamApp.freeze = 0; return true; }, fx);
      await gw(0.3); await frames('web', 2);
      await page.shot('c03-fx-' + fx);
    }
    await ev(() => { CamApp.setFx('none'); const w = window.__tli.OS.wins.get('camera'); w.el.querySelector('.cam-tab').click(); return true; });
  }

  if (want('cctv')) {
    await ev(() => {
      const T = window.__tli; T.G.prog.apps = Object.assign(T.G.prog.apps || {}, { cctv: true }); T.OS.buildIcons(); T.OS.close('camera', true);
      // the teammate in the break room, the main door open
      const m = __mate; m.group.visible = true; m.stop(); m.group.position.set(13.2, 0, 5.2); m.group.rotation.y = 0.8; m.play('dance', { loop: true });
      if (W.doors && W.doors.main) W.doors.main.open();
      T.OS.launch('cctv'); return true;
    });
    await frames('grid', 3); await gw(1.6);
    await page.shot('c10-cctv-grid');
    await ev(() => { CCTV.sel = 'break'; CCTV.setMode('one'); return true; });
    await frames('big', 3);
    await page.shot('c11-cctv-big');
    await ev(() => { CCTV.alert('lobby', 'POLICE AT THE DOOR', 10); CCTV.sel = 'lobby'; CCTV.setMode('one'); return true; });
    await frames('big', 3); await gw(0.3);
    await page.shot('c12-cctv-lobby');
    await ev(() => { window.__tli.OS.close('cctv', true); if (W.doors && W.doors.main) W.doors.main.close(); return true; });
  }

  if (want('photo')) {
    await page.stand();
    const pid = await ev(() => {
      const T = window.__tli, P = T.P, m = __mate; m.group.visible = true; m.stop(); Inv.give('polaroid', 5); Props.refreshHeld(); Props.select(Props.slots.indexOf('polaroid'));
      // stand in the aisle facing the teammate, who strikes a pose
      const A = W.spawn.players[0], f = freeSpot(A.x - 1.2, A.z); P.pos.x = f[0]; P.pos.z = f[1]; m.group.position.set(f[0] - 2.4, 0, f[1] + 0.2); m.group.rotation.y = -Math.PI / 2 + 0.25; m.play('cheer', { loop: true }); m.setMood('joy');
      const a = lookAngles({ x: P.pos.x, y: 1.62, z: P.pos.z }, { x: m.group.position.x, y: 1.3, z: m.group.position.z }); P.yaw = a.yaw; P.pitch = a.pitch; P.third = false;
      return true;
    });
    await gw(0.5);
    await page.shot('c20-snapcam-held');
    const id = await ev(() => { SnapCam.cool = 0; SnapCam.use(); return [...Photos.map.keys()].pop(); });
    await gw(0.05);
    await page.shot('c21-flash');
    await gw(0.9);
    await page.shot('c22-photo-ejected');
    await ev(() => { const P = window.__tli.P; P.pitch = -0.35; return true; });
    await gw(0.5);
    await page.shot('c23-photo-fluttering');
    await gw(3.5);
    const st = await ev(i => { const b = Props.byId.get(i); return b ? { rest: b.rest, pos: [b.pos.x, b.pos.y, b.pos.z].map(v => +v.toFixed(2)), dev: Photos.get(i).dev } : null; }, id);
    console.log('photo body: ' + JSON.stringify(st));
    // the same photo lying on a desk (spawned just above the desk top), seen from close by
    await ev(i => {
      const D = W.desks.find(d => !d.npc && !Game.deskTaken(d.i) && d.i > 4), s = Math.sin(D.rot), c = Math.cos(D.rot), L = (lx, lz) => [D.x + c * lx + s * lz, D.z - s * lx + c * lz];
      const p = L(-0.25, 0.22), q = Photos.get(i); const id2 = 'desk.1'; Photos.add(id2, q.card, { by: settings.name, cap: q.cap }); Photos.get(id2).t0 = -99;
      Props.spawn('photo', [p[0], 1.0, p[1]], [0, 0, 0], { id: id2 });
      const e = L(0.05, 0.95); W.camOverride = { pos: [e[0], 1.45, e[1]], look: [p[0], 0.77, p[1]] }; return true;
    }, id);
    await gw(2.5);
    await page.shot('c24-photo-on-desk');
    await ev(i => { const b = Props.byId.get(i); W.camOverride = b ? { pos: [b.pos.x + 0.7, 1.1, b.pos.z + 0.5], look: [b.pos.x, b.pos.y, b.pos.z] } : null; return !!b; }, id);
    await gw(0.3);
    await page.shot('c25-photo-on-floor');
    await ev(i => { W.camOverride = null; const b = Props.byId.get(i); if (b) Props.pickup(b); return !!Props.carry; }, id);
    await gw(0.6);
    await page.shot('c26-photo-held');
  }
  await ev(() => { if (window.__matePose) Loop.remove(window.__matePose); return true; });
};
