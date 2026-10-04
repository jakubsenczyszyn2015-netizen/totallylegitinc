/* Props / FX scenario: hotbar, soda spray, fart cloud, paper balls into a bin, punching an NPC (stars),
   third-person camera, fire + explosion + confetti. Run PROPS_ONLY=spray,fart,... to run parts. */
module.exports = async page => {
  const only = (process.env.PROPS_ONLY || '').split(',').filter(Boolean), want = k => !only.length || only.includes(k);
  const ev = (f, ...a) => page.eval(f, ...a);
  await page.startSolo('week');
  await page.wait(500);
  // helper in the page: stand somewhere free, facing a point
  await ev(() => {
    window.__stand = (x, z, tx, ty, tz) => { const T = window.__tli, P = T.P; const f = freeSpot(x, z); P.pos.x = f[0]; P.pos.z = f[1]; P.pos.y = 0; P.vx = P.vz = 0; const a = lookAngles({ x: P.pos.x, y: 1.62, z: P.pos.z }, { x: tx, y: ty, z: tz }); P.yaw = a.yaw; P.pitch = a.pitch; return [P.pos.x, P.pos.z]; };
    window.__clearStuff = () => { const T = window.__tli; Props.clear(); FX.clear(); return true; };
    return true;
  });
  const info = await ev(() => ({ npcs: W.npcs.length, bins: W.bins.slice(0, 4), slots: Props.slots, inv: Inv.dump(), desks: W.desks.length, fx: FX.ready }));
  console.log('info: ' + JSON.stringify(info));

  if (want('hotbar')) {
    await ev(() => { const b = W.bins[0]; __stand(b.x + 3, b.z + 1.5, b.x, 0.6, b.z); Props.select(1); return true; });
    await page.wait(500);
    await page.shot('p01-hotbar');
  }

  if (want('spray')) {
    // spray soda across the aisle, then at an NPC
    await ev(() => { const P = window.__tli.P; P.pitch = -0.05; Props.select(Props.slots.indexOf('soda')); return Props.slots; });
    await page.wait(300);
    await ev(() => { Props.startUse(); return true; });
    await page.wait(700);
    await ev(() => { window.__tli.P.yaw += 0.35; return true; });
    await page.wait(500);
    await page.shot('p02-spray');
    await ev(() => { Props.endUse(); return true; });
    await page.wait(900);
    await page.shot('p03-spray-puddles');
  }

  if (want('bin')) {
    await ev(() => { __clearStuff(); const b = W.bins[0]; __stand(b.x + 2.2, b.z + 0.8, b.x, 0.3, b.z); Props.select(0); return true; });
    await page.wait(200);
    // three real throws (F) and one ballistic shot straight into the bin
    for (let i = 0; i < 3; i++) { await ev(() => { Props.throwT = 0; Props.throwSel(); window.__tli.P.yaw += 0.12; return true; }); await page.wait(260); }
    const scored = await ev(() => new Promise(res => {
      const b = W.bins[0], P = window.__tli.P, h = Props.handPos(), T = 0.55;
      const v = [(b.x - h.x) / T, (0.32 - h.y + 0.5 * 9.8 * T * T) / T, (b.z - h.z) / T];
      let ok = false; const off = Bus.on('prop:bin', () => { ok = true; });
      Props.launch('paper', [h.x, h.y, h.z], v); setTimeout(() => { off(); res(ok); }, 900);
    }));
    console.log('paper ball scored in bin: ' + scored);
    await page.shot('p04-paper-balls');
  }

  if (want('punch')) {
    const r = await ev(() => {
      __clearStuff(); const n = W.npcs[0], g = n.group.position, ry = n.group.rotation.y;
      const fx = -Math.sin(ry), fz = -Math.cos(ry);   // NPC faces -Z rotated by ry: stand behind it
      __stand(g.x - fx * 1.05, g.z - fz * 1.05, g.x, 1.2, g.z); window.__tli.P.pitch = -0.15;
      Props.punchT = 0; Props.punch(); return [g.x, g.z];
    });
    await page.wait(260);
    await page.shot('p05-punch-npc');
    await page.wait(500);
    await ev(() => { Props.punchT = 0; Props.punch(); return true; });
    await page.wait(200);
    await page.shot('p06-punch-again');
  }

  if (want('fart')) {
    await ev(() => { __clearStuff(); const b = W.bins[0]; __stand(b.x + 3, b.z + 1.5, b.x, 1.0, b.z); Props.select(Props.slots.indexOf('beans')); Props._fartT = -9; return Props.slots; });
    await page.wait(300);
    await ev(() => { Props.startUse(); return true; });
    await page.wait(1100);
    await ev(() => { const P = window.__tli.P; P.yaw += Math.PI; P.pitch = -0.15; return true; });
    await page.wait(400);
    await page.shot('p07-fart');
  }

  if (want('third')) {
    await ev(() => { __clearStuff(); const b = W.bins[0]; __stand(b.x + 3.5, b.z + 1.5, b.x, 1.0, b.z); Props.select(Props.slots.indexOf('soda')); setThird(true); return true; });
    await page.key('KeyW', 700);
    await ev(() => { Props.startUse(); return true; });
    await page.wait(900);
    await page.shot('p08-third-person');
    await ev(() => { Props.endUse(); return true; });
  }

  if (want('fx')) {
    await ev(() => { __clearStuff(); setThird(false); const b = W.bins[0]; __stand(b.x + 5, b.z, b.x, 0.5, b.z); return true; });
    await ev(() => { const b = W.bins[0]; for (let i = 0; i < 4; i++) FX.fire([b.x + 0.8 + (i % 2) * 1.2, 0, b.z - 1.2 + i * 0.8], 0.8 + (i % 2) * 0.4, 20); FX.tint('#ff3a1a', 0.45); return true; });
    await page.wait(900);
    await page.shot('p09-fire-tint');
    await ev(() => { FX.tint(null); const b = W.bins[0]; FX.spawn('explosion', [b.x + 1, 0.4, b.z + 1.5]); return true; });
    await page.wait(160);
    await page.shot('p10-explosion');
    await page.wait(700);
    await ev(() => { const b = W.bins[0]; FX.spawn('confetti', [b.x + 2.5, 1.2, b.z], { dir: [0, 1, 0] }); FX.spawn('coins', [b.x + 2.5, 1.0, b.z - 1]); return true; });
    await page.wait(500);
    await page.shot('p11-confetti-coins');
  }
  const st = await ev(() => FX.stats());
  console.log('fx stats: ' + JSON.stringify(st));
};
