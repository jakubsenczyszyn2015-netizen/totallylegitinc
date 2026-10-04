/* Props / FX scenario: hotbar, soda spray, paper balls into a bin, punching an NPC (stars), fart cloud,
   third-person camera, pick up / carry / throw, whoopee cushions, party popper, a fake remote player
   through the real Net handlers, fire + red tint, explosion, confetti + coins.
   PROPS_ONLY=spray,fart,... runs some parts. Spots are anchored to the spawn aisle (open in every layout).
   Software rendering is slow, so waits are in game time (gw), and screenshots freeze the frame loop. */
module.exports = async page => {
  const only = (process.env.PROPS_ONLY || '').split(',').filter(Boolean), want = k => !only.length || only.includes(k);
  const ev = (f, ...a) => page.eval(f, ...a);
  /* hold a key for some game time (the frame loop clamps dt, so wall time is not enough on slow machines) */
  const walk = (code, sec) => ev((c, s) => new Promise(res => { const K = window.__tli.Keys; K[c] = true; const t0 = W.t; const f = () => (W.t - t0 >= s ? (K[c] = false, res(true)) : setTimeout(f, 20)); f(); }), code, sec);
  const gw = sec => ev(s => new Promise(res => { const t0 = W.t; const f = () => (W.t - t0 >= s ? res(true) : setTimeout(f, 30)); f(); }), sec);
  const shot0 = page.shot; page.shot = async n => {
    await ev(() => new Promise(res => { document.querySelectorAll('.toast').forEach(t => t.remove()); const raf = window.requestAnimationFrame; window.__raf = raf; window.requestAnimationFrame = cb => { window.__cb = cb; return 0; }; raf(() => setTimeout(() => res(true), 30)); }));
    const r = await shot0(n);
    await ev(() => { window.requestAnimationFrame = window.__raf; if (window.__cb) window.__raf(window.__cb); return true; });
    return r;
  };
  await page.startSolo('week');
  await ev(() => {
    const P = window.__tli.P, S = (W.spawn && W.spawn.players && W.spawn.players[0]) || { x: 8, z: 0 };
    window.__A = { x: S.x, z: S.z };   // the spawn aisle runs west (-x) from here
    window.__stand = (x, z, tx, ty, tz) => { const f = freeSpot(x, z); P.pos.x = f[0]; P.pos.z = f[1]; P.pos.y = 0; P.vx = P.vz = P.kx = P.kz = 0; const a = lookAngles({ x: P.pos.x, y: 1.62, z: P.pos.z }, { x: tx, y: ty, z: tz }); P.yaw = a.yaw; P.pitch = a.pitch; return [P.pos.x, P.pos.z]; };
    window.__aisle = (dx, dz, pitch) => { __stand(__A.x + dx, __A.z + (dz || 0), __A.x + dx - 5, 1.62, __A.z + (dz || 0)); P.pitch = pitch || 0; return true; };
    window.__clearStuff = () => { Props.clear(); FX.clear(); P.third = false; Props.useDown = false; document.querySelectorAll('.toast').forEach(t => t.remove()); return true; };
    window.__turn = (rate, secs) => { let t = 0; const f = Loop.add(dt => { P.yaw += rate * dt; t += dt; if (t > secs) Loop.remove(f); }); return true; };
    // the bin nearest the spawn that has a free spot with a clear throwing line
    window.__binSpot = () => {
      const list = W.bins.slice().sort((a, b) => Math.hypot(a.x - __A.x, a.z - __A.z) - Math.hypot(b.x - __A.x, b.z - __A.z));
      for (const b of list) for (let k = 0; k < 16; k++) {
        const a = k / 16 * 6.283, x = b.x + Math.cos(a) * 2.2, z = b.z + Math.sin(a) * 2.2; if (blocked(x, z)) continue;
        const dx = b.x - x, dy = 0.6 - 1.35, dz = b.z - z, l = Math.hypot(dx, dy, dz);
        if (Space.ray(x, 1.35, z, dx / l, dy / l, dz / l, l, 0.05) >= l - 0.05) return { b, x, z };
      }
      return null;
    };
    P.third = false; return true;
  });
  const info = await ev(() => ({ npcs: W.npcs.length, bins: W.bins.length, slots: Props.slots, inv: Inv.dump(), A: __A }));
  console.log('info: ' + JSON.stringify(info));

  if (want('hotbar')) {
    await ev(() => { __aisle(-1, 0, -0.1); Props.select(1); return true; });
    await gw(0.4);
    await page.shot('p01-hotbar');
  }

  if (want('spray')) {   // soda down the aisle while turning: a garden-hose arc and puddles
    await ev(() => { __clearStuff(); __aisle(-1.5, 0.4, 0.05); window.__tli.P.yaw += 0.35; Props.select(Props.slots.indexOf('soda')); return true; });
    await gw(0.3);
    await ev(() => { Props.startUse(); __turn(-0.5, 1.4); return true; });
    await gw(1.3);
    await page.shot('p02-spray');
    await ev(() => { Props.endUse(); return true; });
    await gw(0.8);
    await page.shot('p03-spray-puddles');
  }

  if (want('bin')) {
    const sp = await ev(() => { __clearStuff(); const s = __binSpot(); if (s) __stand(s.x, s.z, s.b.x, 0.25, s.b.z); Props.select(0); return s; });
    console.log('bin spot: ' + JSON.stringify(sp));
    await gw(0.2);
    for (let i = 0; i < 3; i++) { await ev(() => { Props.throwT = 0; Props.throwSel(); window.__tli.P.yaw += 0.1; return true; }); await gw(0.1); }
    const scored = await ev(s => new Promise(res => {
      const b = s.b, h = Props.handPos(), T = 0.55, v = [(b.x - h.x) / T, (0.32 - h.y + 0.5 * 9.8 * T * T) / T, (b.z - h.z) / T];
      let ok = false; const off = Bus.on('prop:bin', () => { ok = true; });
      Props.launch('paper', [h.x, h.y, h.z], v); const t0 = W.t; const f = () => (W.t - t0 > 0.9 ? (off(), res(ok)) : setTimeout(f, 30)); f();
    }), sp);
    console.log('paper ball scored in bin: ' + scored);
    await page.shot('p04-paper-balls');
  }

  if (want('punch')) {
    await ev(() => {
      __clearStuff(); const n = W.npcs.filter(n => n.group.visible).sort((a, b) => Math.abs(a.group.position.z - __A.z) + Math.abs(a.group.position.x - __A.x) * 0.1 - Math.abs(b.group.position.z - __A.z) - Math.abs(b.group.position.x - __A.x) * 0.1)[0];
      window.__npc = W.npcs.indexOf(n); const g = n.group.position, sz = Math.sign(g.z - __A.z) || 1;
      __stand(g.x + 0.5, g.z - sz * 1.2, g.x, 1.15, g.z); Props.select(0); Props.punchT = 0; Props.punch(); return window.__npc;
    });
    await gw(0.15);
    await page.shot('p05-punch-npc');
    await gw(0.6);
    await ev(() => { Props.punchT = 0; Props.punch(); return true; });
    await gw(0.12);
    await page.shot('p06-punch-again');
  }

  if (want('fart')) {   // fart in the aisle, then step away and look back at the cloud
    await ev(() => { __clearStuff(); __aisle(-2, 0, 0); Props.select(Props.slots.indexOf('beans')); Props._fartT = -9; return true; });
    await gw(0.3);
    await ev(() => { Props.startUse(); return true; });
    await gw(0.9);
    await ev(() => { const P = window.__tli.P, x = P.pos.x; __stand(x - 3.4, __A.z - 0.3, x + 0.6, 0.9, __A.z); return true; });
    await gw(0.5);
    await page.shot('p07-fart');
  }

  if (want('third')) {
    await ev(() => { __clearStuff(); __aisle(0, 0, -0.1); Props.select(Props.slots.indexOf('soda')); setThird(true); window.__tli.P.yaw -= 0.5; return true; });
    await walk('KeyW', 0.4);
    await ev(() => { Props.startUse(); __turn(0.8, 1.3); return true; });
    await gw(1.25);
    await page.shot('p08-third-person');
    await ev(() => { Props.endUse(); Props.select(0); const P = window.__tli.P; P.yaw += 0.5; P.pitch = -0.3; return true; });
    await gw(0.6);
    await page.shot('p09-third-person-walk');
  }

  if (want('pickup')) {   // a box in the aisle: E prompt, pick up, carry, throw
    await ev(() => { __clearStuff(); __aisle(-1, 0, -0.62); const P = window.__tli.P; Props.spawn('box', [P.pos.x - Math.sin(P.yaw) * 1.2, 0.15, P.pos.z - Math.cos(P.yaw) * 1.2], [0, 0, 0], { rest: true, ry: 0.5 }); return true; });
    await gw(0.3);
    console.log('looking at: ' + await ev(() => W.cur && W.cur.label()));
    await page.shot('p13-pickup-prompt');
    await ev(() => { W.cur && W.cur.act(); window.__tli.P.pitch = 0; return !!Props.carry; });
    await gw(0.4);
    await page.shot('p14-carry-box');
    await ev(() => { Props.throwT = 0; Props.throwSel(); return true; });
    await gw(0.2);
    await page.shot('p15-throw-box');
    await gw(2);
    console.log('box after throw: ' + JSON.stringify(await ev(() => Props.bodies.filter(b => b.type === 'box').map(b => ({ rest: b.rest, y: +b.pos.y.toFixed(2) })))));
  }

  if (want('whoopee')) {   // on an NPC's chair it pops at once; on the floor it pops when you step on it
    await ev(() => {
      __clearStuff(); const n = W.npcs[window.__npc >= 0 ? window.__npc : 0], g = n.group.position, sz = Math.sign(g.z - __A.z) || 1;
      __stand(g.x - 0.3, g.z - sz * 1.6, g.x, 0.55, g.z); Props.select(Props.slots.indexOf('whoopee')); return true;
    });
    await gw(0.2);
    await ev(() => { Props.startUse(); return true; });
    await gw(0.7);
    await page.shot('p16-whoopee-npc');
    await ev(() => { Inv.give('whoopee'); __aisle(-1, 0, -0.55); Props.select(Props.slots.indexOf('whoopee')); return true; });
    await gw(0.2);
    await ev(() => { Props.startUse(); return Props.cushions.length; });
    await gw(0.3);
    await page.shot('p17-whoopee-floor');
    await gw(1.0);
    await walk('KeyW', 0.7);
    await gw(0.15);
    console.log('cushions left after stepping on it: ' + await ev(() => Props.cushions.length));
    await ev(() => { window.__tli.P.yaw += Math.PI; window.__tli.P.pitch = -0.3; return true; });
    await gw(0.3);
    await page.shot('p18-whoopee-pop');
  }

  if (want('confetti')) {
    await ev(() => { __clearStuff(); __aisle(-1, 0, 0.1); Props.select(Props.slots.indexOf('confetti')); return true; });
    await gw(0.2);
    await ev(() => { Props.startUse(); return true; });
    await gw(0.35);
    await page.shot('p19-party-popper');
  }

  if (want('net')) {   // a fake remote player through the real sync path
    await ev(() => {
      __clearStuff(); __aisle(-1, 0, -0.05); const P = window.__tli.P; P.yaw -= 0.25;
      Net.active = true; Net.isHost = true; Net.myId = 'me'; Net.players.set('me', Net.me());
      const x = P.pos.x - Math.sin(P.yaw + 0.25) * 1.5, z = P.pos.z - Math.cos(P.yaw + 0.25) * 1.5;
      Net.players.set('p2', { name: 'Remote Rita', color: '#ef4444', x, y: 0, z, ry: P.yaw + 1.9, seat: -1, talk: false, personal: 0, ext: { held: { i: 'soda', u: 1, p: -0.1 } } });
      syncAvatars(Net.players, Net.myId); return true;
    });
    await gw(1.0);
    await page.shot('p20-net-remote-spray');
    await ev(() => { const p = Net.players.get('p2'), a = W.avatars.get('p2').av.group.position, P = window.__tli.P; p.ext = { held: { i: 'soda', u: 0 } }; const l = lookAngles({ x: P.pos.x, y: 1.62, z: P.pos.z }, { x: a.x, y: 1.3, z: a.z }); P.yaw = l.yaw; P.pitch = l.pitch; Props.select(0); Props.punchT = 0; Props.punch(); return true; });
    await gw(0.15);
    await page.shot('p21-net-punch-remote');
    await ev(() => { Net.handlers.get('hit')({ id: 'me', d: [Math.sin(window.__tli.P.yaw), Math.cos(window.__tli.P.yaw)], f: 6.5, s: 1.4, y: 1.6 }, 'p2'); return true; });
    await gw(0.3);
    console.log('knockback on me: ' + JSON.stringify(await ev(() => ({ kx: +window.__tli.P.kx.toFixed(2), kz: +window.__tli.P.kz.toFixed(2), stun: +window.__tli.P.stunT.toFixed(2) }))));
    await page.shot('p22-net-got-hit');
    await gw(1.2);
    await ev(() => {
      const P = window.__tli.P, a = W.avatars.get('p2').av.group.position;
      Net.handlers.get('fx')({ k: 'fart', p: [a.x, 0.75, a.z], o: { dir: [0, 0.1, 1] } }, 'p2');
      Net.handlers.get('prop:throw')({ id: 'p2.1', t: 'paper', o: [a.x, 1.3, a.z], v: [Math.sin(P.yaw) * 4, 3, Math.cos(P.yaw) * 4] }, 'p2');
      return true;
    });
    await gw(1.0);
    await page.shot('p23-net-fart-cough');
    await ev(() => { Net.players.clear(); syncAvatars(Net.players, 'me'); Net.active = false; Net.isHost = false; return true; });
  }

  if (want('fx')) {
    await ev(() => { __clearStuff(); __aisle(1, 0, -0.12); for (let i = 0; i < 5; i++) FX.fire([__A.x - 2.5 - i * 0.9, 0, __A.z + (i % 2 ? 0.6 : -0.6)], 0.7 + (i % 2) * 0.4, 20); FX.tint('#ff5a2a', 0.45); return true; });
    await gw(0.8);
    await page.shot('p10-fire-tint');
    await ev(() => { FX.tint(null); FX.spawn('explosion', [__A.x - 3, 0.4, __A.z + 0.8]); return true; });
    await gw(0.1);
    await page.shot('p11-explosion');
    await gw(0.6);
    await ev(() => { FX.spawn('confetti', [__A.x - 2, 1.4, __A.z - 0.6], { dir: [0, 1, 0] }); FX.spawn('coins', [__A.x - 2.2, 1.0, __A.z + 0.6]); return true; });
    await gw(0.45);
    await page.shot('p12-confetti-coins');
  }
  console.log('fx stats: ' + JSON.stringify(await ev(() => FX.stats())));
};
