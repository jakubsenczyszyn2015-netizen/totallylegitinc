/* Multiplayer police raids over the real network: heat from a client's scam reaches the host, the host's raid starts on
   every client with the same cops, cops chase and arrest a client (busted card on Bob, cuffs on Bob's avatar for the host),
   a client's hit knocks a cop out (host decides, everyone sees it), a late joiner walks into a running raid, the raid
   is repelled (hazard pay for everyone, team bonus), and a late joiner arriving while cops are still leaving.
   Starts with 2 players, opens Cara late.  Run: tools/harness-mp.js tools/scenarios/mp-raid.js 2 1280x720 <outdir> */
module.exports = async mp => {
  const [A, B] = mp.pages;
  await mp.host('week', 0); await mp.join(B);
  await mp.startShift();
  const ids = { Alice: await A.id(), Bob: await B.id() };
  const hook = p => p.eval(() => { window.__toasts = []; const o = toast; toast = (m, k) => { window.__toasts.push(typeof m === 'string' ? m : m.textContent); return o(m, k); }; return true; });
  await hook(A); await hook(B);
  const toasts = p => p.eval(() => window.__toasts.splice(0));
  const copsOf = p => p.eval(() => Raid.cops.map(c => [+c.x.toFixed(1), +c.z.toFixed(1), c.st]));

  // ---- heat: Bob closes a scam, the host's team meter heats up
  const h0 = await A.eval(() => Raid.heat);
  await B.eval(() => { Bus.emit('scam:paid', { amt: 300, call: null, scheme: null }); return true; });
  await mp.wait(700);
  const h1 = await A.eval(() => Raid.heat);
  mp.check('Bob\'s scam heats up the host\'s meter', h1 >= h0 + 15, { before: h0, after: h1 });
  mp.check('Bob\'s heat gauge follows the host', Math.abs((await B.eval(() => Raid.heat)) - h1) <= 1);

  // ---- the host starts a raid: everyone gets it with the same cops
  await A.teleport(6, -1.5, Math.PI / 2, 0); await B.teleport(10, 1.2, Math.PI / 2, 0);
  await B.eval(() => { G.wallet = 400; return true; });
  await A.eval(() => { RAID.tag = 0; Raid.start(3); return true; });   // no arrests until we want one
  await mp.waitFor(B, () => Raid.on && Raid.cops.length === 3, 4000).catch(() => {});
  mp.check('raid starts on Bob with 3 cops', await B.eval(() => Raid.on && Raid.cops.length === 3));
  mp.check('Bob sees the raid banner', await B.eval(() => /POLICE RAID/.test((document.getElementById('raid-alert') || {}).textContent || '')));
  await mp.wait(3500);
  const cA = await copsOf(A), cB = await copsOf(B);
  const off = cA.map((c, i) => cB[i] ? Math.hypot(c[0] - cB[i][0], c[1] - cB[i][1]) : 99);
  mp.check('cops are in the same places for host and Bob', off.every(d => d < 1.2), { host: cA, bob: cB });
  mp.check('the main door burst open for Bob', await B.eval(() => W.doors.main.isOpen));
  await B.eval(() => { P.third = true; return true; });
  await B.shot('d01-bob-raid');
  await B.eval(() => { P.third = false; return true; });

  // ---- Cara walks into the running raid
  const C = await mp.open('Cara'); await hook(C);
  await mp.join(C); ids.Cara = await C.id();
  await mp.waitFor(C, () => G.phase === 'day', 8000);
  await mp.wait(1500);
  mp.check('late joiner sees the running raid with all cops', await C.eval(() => Raid.on && Raid.cops.length === 3 && Raid.cops.every(Boolean)), await C.eval(() => [Raid.on, Raid.cops.length]));
  const cC = await copsOf(C), cA2 = await copsOf(A);
  mp.check('late joiner: cops in the same places', cA2.every((c, i) => cC[i] && Math.hypot(c[0] - cC[i][0], c[1] - cC[i][1]) < 1.2), { host: cA2, cara: cC });

  // ---- a client's hit: Bob knocks cop 0 out (the host decides, everyone sees it fall)
  await B.eval(() => { Raid.hitCop(Raid.cops[0], 4, 1, 2, 0, 'zap'); return true; });
  await mp.wait(600);
  mp.check('host: Bob\'s hit knocked cop 0 out', (await A.eval(() => Raid.cops[0].st)) === 3);
  mp.check('Cara sees cop 0 dizzy on the floor', (await C.eval(() => Raid.cops[0].st)) === 3);

  // ---- an arrest: Bob walks into cop 1, the host's cop tags him
  const w0 = await B.eval(() => G.wallet);
  await A.eval(() => { RAID.tag = 0.8; return true; });
  const c1 = await A.eval(() => { const c = Raid.cops[1]; return [c.x, c.z]; });
  if (!(await B.eval(() => !!Raid.bust))) await B.teleport(c1[0] - 0.3, c1[1], Math.PI / 2, 0);
  const busted = await mp.waitFor(B, () => !!Raid.bust, 5000).then(() => true, () => false);
  mp.check('Bob gets arrested by the host\'s cop', busted);
  mp.check('Bob fined from his wallet', (await B.eval(() => G.wallet)) < w0, { before: w0, after: await B.eval(() => G.wallet) });
  await mp.wait(300);
  mp.check('host sees cuffs on Bob\'s avatar', await A.eval(id => Raid.cuffM.has(id), ids.Bob));
  mp.check('Cara told Bob got arrested', (await toasts(C)).some(t => /Bob got arrested/.test(t)));
  await mp.wait(1400);
  mp.check('Bob\'s mugshot shows only Bob (a teammate booked at the same time is hidden)', await B.eval(() => [...W.avatars.values()].every(a => !(a.av.group.visible && Math.hypot(a.av.group.position.x - 23.3, a.av.group.position.z) < 0.9))));
  mp.check('Bob stands in his own mugshot', await B.eval(() => W.me.group.visible && Math.hypot(W.me.group.position.x - 23.3, W.me.group.position.z) < 0.2));
  await B.shot('d02-bob-busted');
  await A.eval(() => { RAID.tag = 0; return true; });
  await mp.waitFor(B, () => !Raid.bust, 6000).catch(() => {});
  mp.check('Bob released at the front door', await B.eval(() => !Raid.bust && P.pos.x > 17));

  // ---- the raid is repelled: the host knocks the rest out, everyone gets hazard pay
  const wB = await B.eval(() => G.wallet), wC = await C.eval(() => G.wallet), tA = await A.eval(() => G.team);
  await toasts(B);
  await A.eval(() => { for (const c of Raid.cops) Raid.hurt(c, 9, 1, 0, 0, 'hit'); return true; });
  const ended = await mp.waitFor(A, () => !Raid.on, 15000).then(() => true, () => false);
  mp.check('raid repelled on the host', ended);
  await mp.waitFor(B, () => !Raid.on, 4000).catch(() => {});
  await mp.wait(1200);
  mp.check('Bob: raid over + hazard pay', await B.eval(w => !Raid.on && G.wallet === w + 150, wB), { before: wB, after: await B.eval(() => G.wallet) });
  mp.check('Cara: hazard pay', (await C.eval(() => G.wallet)) === wC + 150);
  mp.check('Bob saw "Raid repelled"', (await toasts(B)).some(t => /Raid repelled/.test(t)));
  const tA2 = await A.eval(() => G.team);
  mp.check('team bonus on the host reaches the clients', tA2 === tA + 450 && (await B.eval(() => G.team)) === tA2, { before: tA, host: tA2, bob: await B.eval(() => G.team) });
  mp.check('heat reset everywhere', (await A.eval(() => Raid.heat)) === 0 && (await B.eval(() => Raid.heat)) === 0);

  // ---- a late joiner arrives while the cops are still walking out (some already gone)
  const st = await A.eval(() => Raid.shared());
  const fake = { h: 0, on: 0, n: st.n, s: st.s, l: 0, c: [[23, 0, 0, 5, 0], [15, 1, 0, 4, 4], [14, -1, 0, 4, 4]] };
  await C.eval(s => { Raid.abort(); Raid.n = 0; Raid.applyShared(s); return true; }, fake);   // what a fresh client gets in its first snapshot
  await mp.wait(500);
  mp.check('late joiner during the cops\' exit: no holes in the cop list', await C.eval(() => Raid.cops.every(Boolean)), await C.eval(() => Raid.cops.map(c => c ? c.st : null)));
  await mp.wait(800);
  mp.check('late joiner: leftover cops cleared by the next snapshots', await C.eval(() => Raid.cops.length === 0 || Raid.cops.every(c => c.st >= 4)));
};
