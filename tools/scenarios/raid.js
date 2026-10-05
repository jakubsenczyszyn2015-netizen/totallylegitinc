/* Raid scenario: heat gauge (HUD + LegitOS pill), the weapons in BonkMart, a forced police raid (door burst, chase,
   mace, taser, foam darts, sniper scope, coworkers ducking, The Boss hiding), an arrest with the mugshot, dizzy cops
   running out and the "raid repelled" banner. RAID_ONLY=heat,shop,raid,arrest,end,lineup runs some parts.
   Waits are in game time (software rendering is slow); screenshots freeze the frame loop. */
module.exports = async page => {
  const only = (process.env.RAID_ONLY || '').split(',').filter(Boolean), want = k => !only.length || only.includes(k);
  const ev = (f, ...a) => page.eval(f, ...a);
  const gw = sec => ev(s => new Promise(res => { const t0 = W.t; const f = () => (W.t - t0 >= s ? res(true) : setTimeout(f, 25)); f(); }), sec);
  /* wait (game time) until a condition written as a function body is true, at most max seconds */
  const until = (body, max) => ev((b, m) => new Promise(res => { const f = new Function('return (' + b + ')'), t0 = W.t; const g = () => { let v = false; try { v = f(); } catch (e) {} if (v || W.t - t0 > m) res(!!v); else setTimeout(g, 25); }; g(); }), body, max || 10);
  const shot0 = page.shot; page.shot = async n => {
    await ev(() => new Promise(res => { document.querySelectorAll('.toast').forEach(t => t.remove()); const raf = window.requestAnimationFrame; window.__raf = raf; window.requestAnimationFrame = cb => { window.__cb = cb; return 0; }; raf(() => setTimeout(() => res(true), 30)); }));
    const r = await shot0(n);
    await ev(() => { window.requestAnimationFrame = window.__raf; if (window.__cb) window.__raf(window.__cb); return true; });
    return r;
  };
  await page.startSolo('week');
  await ev(() => {
    const T = window.__tli, P = T.P; T.OS.fastBoot = true; T.G.timeLeft = 9999; T.G.wallet = 3000;
    window.__face = (x, z, y) => { const a = lookAngles({ x: P.pos.x, y: 1.62, z: P.pos.z }, { x, y: y == null ? 1.25 : y, z }); P.yaw = a.yaw; P.pitch = a.pitch; return true; };
    window.__stand = (x, z, tx, tz) => { const f = freeSpot(x, z); P.pos.x = f[0]; P.pos.z = f[1]; P.pos.y = 0; P.vx = P.vz = P.kx = P.kz = 0; __face(tx, tz); return true; };
    window.__near = () => { let b = null, bd = 1e9; for (const c of Raid.cops) { if (c.st >= 3 && c.st !== 6) continue; const d = Math.hypot(c.x - P.pos.x, c.z - P.pos.z); if (d < bd) { bd = d; b = c; } } return b ? { c: b, d: bd } : null; };
    window.__sel = id => { if (!Props.slotList().includes(id)) { const n = Inv.count(id) || 1; delete Inv.items[id]; Inv.items = Object.assign({ [id]: n }, Inv.items); } Props.refreshHeld(); const k = Props.slots.indexOf(id); if (k >= 0) Props.select(k); return k; };
    window.__noCalls = () => { const C = window.__tli.Call; if (C.state === 'ringing') C.decline(); C.wait = 1e9; return true; };
    ['soda', 'beans', 'whoopee', 'confetti'].forEach(id => { while (Inv.count(id)) Inv.take(id); });
    return true;
  });

  if (want('heat')) {   // HUD gauge while walking, then "raid risk"
    await ev(() => { Raid.heat = 0; Raid.addHeat(46); __stand(9, 2.2, 0, 2.2); return true; });
    await gw(0.5);
    await page.shot('r01-heat-hud');
    await ev(() => { Raid.addHeat(32); return true; });
    await gw(0.6);
    await page.shot('r02-heat-risk');
  }

  if (want('shop')) {   // the taskbar pill and the weapons section of BonkMart
    await page.sit();
    await ev(() => __noCalls());
    await gw(0.8);
    await ev(() => { window.__tli.OS.close('memo', true); BonkMart.open('goods'); return true; });
    await gw(0.8);
    await ev(() => { const s = BonkMart.win.body.querySelector('.bm-scroll'), sec = [...s.querySelectorAll('.bm-sec')].find(e => /Weapons/.test(e.textContent)); s.scrollTop = sec ? sec.offsetTop - s.offsetTop - 8 : 0; return !!sec; });
    await gw(2.5);   // 3D thumbnails render one by one
    await ev(() => { window.__tli.OS.maximise('shop'); return true; });
    await gw(1.2);
    await ev(() => { const s = BonkMart.win.body.querySelector('.bm-scroll'), sec = [...s.querySelectorAll('.bm-sec')].find(e => /Weapons/.test(e.textContent)); s.scrollTop = sec ? sec.offsetTop - s.offsetTop - 8 : 0; return true; });
    await gw(0.5);
    await page.shot('r03-shop-weapons');
    const bought = await ev(() => ['w_mace', 'w_taser', 'w_foam'].map(id => BonkMart.buy(id)));
    console.log('bought: ' + JSON.stringify(bought));
    await ev(() => { window.__tli.OS.close('shop', true); return true; });
    await page.stand();
  }

  const items = await ev(() => { ['mace', 'taser', 'foam', 'sniper', 'stress', 'hammer', 'baton', 'shield'].forEach(id => { if (!Inv.count(id)) Inv.give(id); }); Props.refreshHeld(); return Props.slots; });
  console.log('hotbar: ' + JSON.stringify(items));

  if (want('raid')) {
    // stand in the hallway looking at the main door, then call the police
    await ev(() => { __noCalls(); RAID.tag = 0; Raid.heat = 85; __stand(14.6, -0.9, 20, 0); P.third = false; __sel('mace'); W.camOverride = { pos: [16.4, 1.85, -1.4], look: [20.3, 1.0, 0.3] }; return Raid.start(3); });
    await until('Raid.t > 1.42', 6);
    await page.shot('r04-door-burst');
    await until('Raid.t > 2.6', 6);
    await page.shot('r05-cops-in');
    await ev(() => { W.camOverride = null; P.third = true; return true; });
    await until('window.__near() && window.__near().d < 3.6', 8);
    await ev(() => { const n = __near(); if (n) __face(n.c.x, n.c.z); return true; });
    await gw(0.15);
    await page.shot('r06-chase-third');
    // Bear Mace in the face of the nearest cop
    await until('window.__near() && window.__near().d < 2.2', 6);
    await ev(() => { const n = __near(); __face(n.c.x, n.c.z, 1.3); Props.startUse(); return n.d; });
    await gw(0.3);
    await page.shot('r07-mace');
    // step back and tase the next one (first person)
    await ev(() => { P.third = false; __stand(12.6, 0.5, 18, 0); __sel('taser'); return true; });
    await gw(0.3);
    await until('window.__near() && window.__near().d < 4', 5);
    await ev(() => { const n = __near(); __face(n.c.x, n.c.z, 1.1); Props.startUse(); return true; });
    await gw(0.06);
    await page.shot('r08-taser');
    await gw(0.6);
    await ev(() => { __sel('foam'); const n = __near(); if (n) __face(n.c.x, n.c.z, 1.0); Props.startUse(); return true; });
    await gw(0.12);
    await page.shot('r09-foam');
    // coworkers under their desks, The Boss hiding behind his
    await ev(() => { const n = W.npcs[0], d = W.desks[n.desk], dx = d.stand.x - d.x, dz = d.stand.z - d.z, l = Math.hypot(dx, dz) || 1; W.camOverride = { pos: [d.stand.x + dx / l * 0.9, 2.15, d.stand.z + dz / l * 0.9 + 0.5], look: [d.x, 0.45, d.z] }; return true; });
    await gw(0.4);
    await page.shot('r10-coworkers-duck');
    await ev(() => { const b = W.boss.group.position; W.camOverride = { pos: [16.9, 1.7, 2.4], look: [b.x, 0.7, b.z] }; return true; });
    await gw(0.3);
    await page.shot('r11-boss-hides');
    await ev(() => { W.camOverride = null; return true; });
    // sniper scope
    await ev(() => { __sel('sniper'); const n = __near(); if (n) __face(n.c.x, n.c.z, 1.2); Props.startUse(); return true; });
    await gw(0.5);
    await page.shot('r12-sniper-scope');
    await ev(() => { Props.endUse(); return true; });
    await gw(0.2);
  }

  if (want('arrest')) {   // let the nearest cop catch us: cuffs, fine, mugshot in the lobby
    const w0 = await ev(() => { RAID.tag = 0.8; if (!Raid.on) Raid.start(2); Raid.immune.delete('me'); P.third = true; __sel('hammer'); const n = __near(); if (n) { __stand(n.c.x - 1.2, n.c.z, n.c.x, n.c.z); } return window.__tli.G.wallet; });
    const got = await until('!!Raid.bust', 10);
    console.log('arrested: ' + got);
    await until('Raid.bust && Raid.bust.t > 0.7', 3);
    await page.shot('r13-busted');
    await until('Raid.bust && Raid.bust.t > 2.4', 4);
    await page.shot('r14-mugshot');
    await until('!Raid.bust', 4);
    const w1 = await ev(() => window.__tli.G.wallet);
    console.log('wallet before/after arrest: ' + w0 + ' -> ' + w1);
  }

  if (want('end')) {   // hammer + baton on the cops until they see stars and run out
    await ev(() => { RAID.tag = 0; if (!Raid.on) Raid.start(3); Raid.immune.delete('me'); P.third = true; __sel('hammer'); return true; });
    await until('Raid.cops.some(c => c.st === 1)', 8);
    for (let i = 0; i < 3; i++) {
      await until('window.__near() && window.__near().d < 1.7', 6);
      await ev(() => { const n = __near(); if (n) { __face(n.c.x, n.c.z); RaidW.cd = {}; Props.startUse(); } return true; });
      await gw(0.25);
    }
    await page.shot('r15-hammer');
    await ev(() => { for (const c of Raid.cops) Raid.hurt(c, 99, 0, 0, 0, 'baton'); const n = Raid.cops[0]; __face(n.x, n.z, 0.6); return true; });
    await gw(0.9);
    await page.shot('r16-dizzy');
    await ev(() => { P.third = false; RAID.tag = 0.8; return true; });
    const ended = await until('!Raid.on', 14);
    console.log('raid ended: ' + ended + ' heat ' + (await ev(() => Raid.heat)));
    await gw(0.4);
    await page.shot('r17-repelled');
  }

  if (want('lineup')) {   // every weapon in a teammate-ish pose (third person), for the art
    await ev(() => { if (Raid.on) Raid.abort(); __stand(9, 2.2, 0, 2.2); P.third = true; __sel('sniper'); return true; });
    await gw(0.4);
    await ev(() => { Avatars.act('point', { dur: 3 }); return true; });
    await gw(0.4);
    await page.shot('r18-third-sniper');
    for (const id of ['foam', 'shield', 'hammer']) {
      await ev(i => { P.third = false; __sel(i); return true; }, id);
      await gw(0.5);
      await page.shot('r19-fp-' + id);
    }
  }
  const st = await ev(() => ({ heat: Raid.heat, on: Raid.on, cops: Raid.cops.length, items: Object.keys(RAID_W).length, shop: Shop.list('goods').filter(i => i.section === 'Weapons & personal safety').length }));
  console.log('raid state: ' + JSON.stringify(st));
};
