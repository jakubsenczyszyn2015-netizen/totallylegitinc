/* Props / FX scenario: hotbar, soda spray, fart cloud, paper balls into a bin, punching an NPC (stars),
   third-person camera, fire + explosion + confetti. PROPS_ONLY=spray,fart,... runs some parts.
   Software rendering is slow, so waits are in game time (gw), not wall time. */
module.exports = async page => {
  const only = (process.env.PROPS_ONLY || '').split(',').filter(Boolean), want = k => !only.length || only.includes(k);
  const ev = (f, ...a) => page.eval(f, ...a);
  const gw = sec => ev(s => new Promise(res => { const t0 = W.t; const f = () => (W.t - t0 >= s ? res(true) : setTimeout(f, 30)); f(); }), sec);
  const shot0 = page.shot; page.shot = async n => { await ev(() => { document.querySelectorAll('.toast').forEach(t => t.remove()); return true; }); return shot0(n); };
  await page.startSolo('week');
  await ev(() => {
    const P = window.__tli.P; P.third = false;
    window.__stand = (x, z, tx, ty, tz) => { const f = freeSpot(x, z); P.pos.x = f[0]; P.pos.z = f[1]; P.pos.y = 0; P.vx = P.vz = 0; const a = lookAngles({ x: P.pos.x, y: 1.62, z: P.pos.z }, { x: tx, y: ty, z: tz }); P.yaw = a.yaw; P.pitch = a.pitch; return [P.pos.x, P.pos.z]; };
    window.__clearStuff = () => { Props.clear(); FX.clear(); document.querySelectorAll('.toast').forEach(t => t.remove()); return true; };
    /* turn smoothly in game time (a Loop hook) */
    window.__turn = (rate, secs) => { let t = 0; const f = Loop.add(dt => { P.yaw += rate * dt; t += dt; if (t > secs) Loop.remove(f); }); return true; };
    return true;
  });
  const info = await ev(() => ({ npcs: W.npcs.length, bins: W.bins.slice(0, 2), slots: Props.slots, inv: Inv.dump(), fx: FX.ready }));
  console.log('info: ' + JSON.stringify(info));
  const bin = await ev(() => { const l = W.bins.filter(b => b.x < 9.5 && Math.abs(b.z) < 6); return (l.length ? l : W.bins).reduce((a, b) => (Math.hypot(b.x - 4, b.z) < Math.hypot(a.x - 4, a.z) ? b : a)); });
  console.log('bin: ' + JSON.stringify(bin));

  if (want('hotbar')) {
    await ev(b => { __stand(b.x + 3, b.z + 1.5, b.x, 0.6, b.z); Props.select(1); return true; }, bin);
    await gw(0.4);
    await page.shot('p01-hotbar');
  }

  if (want('spray')) {
    // spray soda along the aisle while turning (garden-hose arc), puddles on the floor
    await ev(b => { __clearStuff(); __stand(b.x + 3.2, b.z - 1.6, b.x - 2, 0.9, b.z + 1.5); Props.select(Props.slots.indexOf('soda')); return true; }, bin);
    await gw(0.3);
    await ev(() => { Props.startUse(); __turn(-0.5, 1.4); return true; });
    await gw(1.3);
    await page.shot('p02-spray');
    await ev(() => { Props.endUse(); return true; });
    await gw(0.8);
    await page.shot('p03-spray-puddles');
  }

  if (want('bin')) {
    await ev(b => { __clearStuff(); __stand(b.x + 2.2, b.z + 0.8, b.x, 0.3, b.z); Props.select(0); return true; }, bin);
    await gw(0.2);
    for (let i = 0; i < 3; i++) { await ev(() => { Props.throwT = 0; Props.throwSel(); window.__tli.P.yaw += 0.12; return true; }); await gw(0.12); }
    const scored = await ev(b => new Promise(res => {
      const h = Props.handPos(), T = 0.55, v = [(b.x - h.x) / T, (0.32 - h.y + 0.5 * 9.8 * T * T) / T, (b.z - h.z) / T];
      let ok = false; const off = Bus.on('prop:bin', () => { ok = true; });
      Props.launch('paper', [h.x, h.y, h.z], v); const t0 = W.t; const f = () => (W.t - t0 > 0.9 ? (off(), res(ok)) : setTimeout(f, 30)); f();
    }), bin);
    console.log('paper ball scored in bin: ' + scored);
    await page.shot('p04-paper-balls');
  }

  if (want('punch')) {
    await ev(() => {
      __clearStuff(); const n = W.npcs[0], g = n.group.position, ry = n.group.rotation.y;
      const fx = -Math.sin(ry), fz = -Math.cos(ry), sx = Math.cos(ry), sz = -Math.sin(ry);   // NPC faces (fx, fz); stand behind and to the side
      __stand(g.x - fx * 1.0 + sx * 0.9, g.z - fz * 1.0 + sz * 0.9, g.x, 1.15, g.z);
      Props.select(0); Props.punchT = 0; Props.punch(); return true;
    });
    await gw(0.22);
    await page.shot('p05-punch-npc');
    await gw(0.5);
    await ev(() => { Props.punchT = 0; Props.punch(); return true; });
    await gw(0.18);
    await page.shot('p06-punch-again');
  }

  if (want('fart')) {
    await ev(b => { __clearStuff(); __stand(b.x + 3, b.z + 1.5, b.x, 1.0, b.z); Props.select(Props.slots.indexOf('beans')); Props._fartT = -9; return true; }, bin);
    await gw(0.2);
    await ev(() => { Props.startUse(); return true; });
    await gw(0.7);
    await ev(() => { const P = window.__tli.P; P.yaw += Math.PI; P.pitch = -0.2; P.pos.x += -Math.sin(P.yaw) * -1.2; P.pos.z += -Math.cos(P.yaw) * -1.2; return true; });
    await gw(0.5);
    await page.shot('p07-fart');
  }

  if (want('third')) {
    await ev(b => { __clearStuff(); __stand(b.x + 4.5, b.z + 2.5, b.x, 0.9, b.z); Props.select(Props.slots.indexOf('soda')); setThird(true); return true; }, bin);
    await page.key('KeyW', 500);
    await ev(() => { Props.startUse(); __turn(0.9, 1.2); return true; });
    await gw(1.2);
    await page.shot('p08-third-person');
    await ev(() => { Props.endUse(); return true; });
    await ev(() => { Props.select(0); const P = window.__tli.P; P.yaw += 0.6; P.pitch = -0.25; return true; });
    await gw(0.5);
    await page.shot('p09-third-person-walk');
  }

  if (want('fx')) {
    await ev(b => { __clearStuff(); window.__tli.P.third = false; __stand(b.x + 5, b.z, b.x, 0.5, b.z); return true; }, bin);
    await ev(b => { for (let i = 0; i < 4; i++) FX.fire([b.x + 0.8 + (i % 2) * 1.2, 0, b.z - 1.2 + i * 0.8], 0.8 + (i % 2) * 0.4, 20); FX.tint('#ff5a2a', 0.45); return true; }, bin);
    await gw(0.8);
    await page.shot('p10-fire-tint');
    await ev(b => { FX.tint(null); FX.spawn('explosion', [b.x + 1, 0.4, b.z + 1.5]); return true; }, bin);
    await gw(0.12);
    await page.shot('p11-explosion');
    await gw(0.6);
    await ev(b => { FX.spawn('confetti', [b.x + 2.5, 1.2, b.z], { dir: [0, 1, 0] }); FX.spawn('coins', [b.x + 2.5, 1.0, b.z - 1]); return true; }, bin);
    await gw(0.5);
    await page.shot('p12-confetti-coins');
  }
  const st = await ev(() => FX.stats());
  console.log('fx stats: ' + JSON.stringify(st));
};
