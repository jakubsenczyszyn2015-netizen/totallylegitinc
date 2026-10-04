/* Props / FX scenario: hotbar, soda spray, fart cloud, paper balls into a bin, punching an NPC (stars),
   third-person camera, fire + explosion + confetti. PROPS_ONLY=spray,fart,... runs some parts.
   Software rendering is slow, so waits are in game time (gw), not wall time. */
module.exports = async page => {
  const only = (process.env.PROPS_ONLY || '').split(',').filter(Boolean), want = k => !only.length || only.includes(k);
  const ev = (f, ...a) => page.eval(f, ...a);
  const gw = sec => ev(s => new Promise(res => { const t0 = W.t; const f = () => (W.t - t0 >= s ? res(true) : setTimeout(f, 30)); f(); }), sec);
  /* screenshots freeze the frame loop while capturing (software GL is slow; short effects would be over) */
  const shot0 = page.shot; page.shot = async n => {
    await ev(() => new Promise(res => { document.querySelectorAll('.toast').forEach(t => t.remove()); const raf = window.requestAnimationFrame; window.__raf = raf; window.requestAnimationFrame = cb => { window.__cb = cb; return 0; }; raf(() => setTimeout(() => res(true), 30)); }));
    const r = await shot0(n);
    await ev(() => { window.requestAnimationFrame = window.__raf; if (window.__cb) window.__raf(window.__cb); return true; });
    return r;
  };
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

  if (want('pickup')) {
    // a box on the floor: look at it, E prompt, pick it up, carry it, throw it
    const lab = await ev(b => {
      __clearStuff(); __stand(b.x + 2.6, b.z + 1.2, b.x + 1.4, 0.15, b.z + 1.2); const P = window.__tli.P;
      Props.spawn('box', [P.pos.x - Math.sin(P.yaw) * 1.2, 0.15, P.pos.z - Math.cos(P.yaw) * 1.2], [0, 0, 0], { rest: true, ry: 0.5 });
      P.pitch = -0.62; return true;
    }, bin);
    await gw(0.3);
    const cur = await ev(() => W.cur && W.cur.label());
    console.log('looking at: ' + cur);
    await page.shot('p13-pickup-prompt');
    await ev(() => { W.cur && W.cur.act(); window.__tli.P.pitch = 0; return !!Props.carry; });
    await gw(0.4);
    await page.shot('p14-carry-box');
    await ev(() => { Props.throwT = 0; Props.throwSel(); return true; });
    await gw(0.25);
    await page.shot('p15-throw-box');
    await gw(1.5);
    const rest = await ev(() => Props.bodies.filter(b => b.type === 'box').map(b => ({ rest: b.rest, y: +b.pos.y.toFixed(2) })));
    console.log('box after throw: ' + JSON.stringify(rest));
  }

  if (want('whoopee')) {
    // a cushion on an NPC's chair pops at once; one on the floor pops when you step on it
    await ev(() => {
      __clearStuff(); const n = W.npcs[1], g = n.group.position, ry = n.group.rotation.y, fx = -Math.sin(ry), fz = -Math.cos(ry), sx = Math.cos(ry), sz = -Math.sin(ry);
      __stand(g.x - fx * 1.3 + sx * 1.2, g.z - fz * 1.3 + sz * 1.2, g.x, 0.6, g.z); Props.select(Props.slots.indexOf('whoopee')); return true;
    });
    await gw(0.2);
    await ev(() => { Props.startUse(); return true; });
    await gw(0.75);
    await page.shot('p16-whoopee-npc');
    await ev(b => { Inv.give('whoopee'); __stand(b.x + 3, b.z + 1.5, b.x, 0.3, b.z); Props.select(Props.slots.indexOf('whoopee')); return true; }, bin);
    await gw(0.2);
    await ev(() => { window.__tli.P.pitch = -0.5; Props.startUse(); return Props.cushions.length; });
    await gw(0.4);
    await page.shot('p17-whoopee-floor');
    await gw(1.0);
    await page.key('KeyW', 900);
    await gw(0.2);
    const left = await ev(() => Props.cushions.length);
    console.log('cushions left after stepping on it: ' + left);
    await page.shot('p18-whoopee-pop');
  }

  if (want('confetti')) {
    await ev(b => { __clearStuff(); __stand(b.x + 3, b.z + 1.5, b.x, 1.2, b.z); Props.select(Props.slots.indexOf('confetti')); return true; }, bin);
    await gw(0.2);
    await ev(() => { Props.startUse(); return true; });
    await gw(0.35);
    await page.shot('p19-party-popper');
  }

  if (want('net')) {
    // a fake remote player through the real sync path: they hold + spray soda, get punched, punch back, fart, throw
    await ev(b => {
      __clearStuff(); const P = window.__tli.P; __stand(b.x + 3.4, b.z + 1.6, b.x + 1.2, 1.2, b.z + 1.6);
      Net.active = true; Net.isHost = true; Net.myId = 'me'; Net.players.set('me', Net.me());
      const x = P.pos.x - Math.sin(P.yaw) * 1.3, z = P.pos.z - Math.cos(P.yaw) * 1.3;
      Net.players.set('p2', { name: 'Remote Rita', color: '#ef4444', x, y: 0, z, ry: P.yaw + 2.2, seat: -1, talk: false, personal: 0, ext: { held: { i: 'soda', u: 1, p: -0.1 } } });
      syncAvatars(Net.players, Net.myId); return true;
    }, bin);
    await gw(1.0);
    await page.shot('p20-net-remote-spray');
    await ev(() => { const p = Net.players.get('p2'); p.ext = { held: { i: 'soda', u: 0 } }; Props.select(0); Props.punchT = 0; Props.punch(); return true; });
    await gw(0.2);
    await page.shot('p21-net-punch-remote');
    await ev(() => { Net.handlers.get('hit')({ id: 'me', d: [Math.sin(window.__tli.P.yaw), Math.cos(window.__tli.P.yaw)], f: 6.5, s: 1.4, y: 1.6 }, 'p2'); return true; });
    await gw(0.3);
    const kb = await ev(() => ({ kx: +window.__tli.P.kx.toFixed(2), kz: +window.__tli.P.kz.toFixed(2), stun: +window.__tli.P.stunT.toFixed(2) }));
    console.log('knockback on me: ' + JSON.stringify(kb));
    await page.shot('p22-net-got-hit');
    await gw(1.2);
    await ev(() => {
      const P = window.__tli.P, a = W.avatars.get('p2').av.group.position;
      Net.handlers.get('fx')({ k: 'fart', p: [a.x, 0.75, a.z], o: { dir: [0, 0.1, 1] } }, 'p2');
      Net.handlers.get('prop:throw')({ id: 'p2.1', t: 'paper', o: [a.x, 1.3, a.z], v: [-Math.sin(P.yaw) * -4, 3, -Math.cos(P.yaw) * -4] }, 'p2');
      return true;
    });
    await gw(1.0);
    await page.shot('p23-net-fart-cough');
    await ev(() => { Net.players.clear(); syncAvatars(Net.players, 'me'); Net.active = false; Net.isHost = false; return true; });
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
