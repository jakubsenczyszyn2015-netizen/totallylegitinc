/* QA: police raids played like a player. Heat from scams, a raid while seated ("officer incoming" + stand up),
   pausing mid-raid (solo: everything freezes), an arrest (fine maths, mugshot, release at the door), repelling the
   raid (hazard pay + team bonus), losing one (petty cash), the day ending mid-raid, quitting to the menu while
   busted, and a new game starting clean.
   Run: xvfb-run -a -s "-screen 0 1920x1080x24" ./node_modules/.bin/electron --no-sandbox --enable-unsafe-swiftshader tools/harness.js tools/scenarios/qa-raid.js 1280x720 <outdir> */
module.exports = async page => {
  const Q = require('./qa-lib')(page);
  const until = (body, max) => page.eval((b, m) => new Promise(res => { const f = new Function('return (' + b + ')'), t0 = W.t, e = Date.now() + m * 6000; const g = () => { let v = false; try { v = f(); } catch (er) {} if (v || W.t - t0 > m || Date.now() > e) res(!!v); else setTimeout(g, 25); }; g(); }), body, max || 10);
  const R = () => page.eval(() => ({ on: Raid.on, heat: Math.round(Raid.heat), left: +Raid.left.toFixed(2), cops: Raid.cops.length, bust: !!Raid.bust, wallet: window.__tli.G.wallet, team: window.__tli.G.team,
    glow: document.querySelector('#raid-glow').classList.contains('on'), alert: document.querySelector('#raid-alert').className, near: !document.querySelector('#raid-near').classList.contains('hidden'),
    siren: !!RaidSnd.siren, cam: !!window.__tli.W.camOverride, pcam: !!window.__tli.P.cam, bustEl: !document.querySelector('#raid-bust').classList.contains('hidden'), lights: !!(RaidLights.red && RaidLights.on) }));
  // a saved week on Tuesday (raids start on day 2) with money in the wallet
  await page.eval(() => { const T = window.__tli; T.Saves.week = [{ day: 2, bank: 500, dayLen: 300, stats: {}, wallet: 400, up: {}, inv: {}, prog: { props: { kit: 1 } } }, null, null]; T.Saves.endless = null; writeSaves(); T.OS.fastBoot = true;
    T.Game.startSolo('week', 0); document.getElementById('daycard').classList.add('hidden'); return true; });
  await page.wait(800);
  await Q.fast(true);   // game logic at full speed; Q.shot still draws
  let r = await R();
  Q.check('Tuesday, wallet loaded, no raid, heat 0', !r.on && r.heat === 0 && r.wallet === 400 && (await page.eval(() => window.__tli.G.day)) === 2, r);

  // ---------- heat from scams ----------
  await page.eval(() => { window.__tli.Bus.emit('scam:paid', { amt: 300 }); window.__tli.Bus.emit('scam:baited', {}); return true; });
  r = await R();
  Q.check('heat rises on scams (+16) and bait (+18)', r.heat === 34, r.heat);
  await Q.waitFor(() => /Warm/.test(document.querySelector('#raid-heat').textContent), 3000);
  await Q.shot('raid-01-heat-warm');

  // ---------- a raid while seated ----------
  await Q.sit(); await Q.hush();
  await page.eval(() => { window.__tli.OS.close('memo', true); RAID.tag = 0; return Raid.start(2); });
  const nearOk = await until('!document.querySelector("#raid-near").classList.contains("hidden")', 25);
  r = await R();
  Q.check('raid on: sirens, glow, lights, cops', r.on && r.siren && r.glow && r.cops === 2, r);
  Q.check('seated: "officer incoming" warning', nearOk, r);
  await Q.shot('raid-02-officer-incoming');
  await page.eval(() => { window.__tli.Game.pause(true); return true; });
  Q.check('solo pause hides the seated warning (its button would stand you up while paused)', await until('document.querySelector("#raid-near").classList.contains("hidden")', 3));
  await page.eval(() => { window.__tli.Game.pause(false); return true; });
  await until('!document.querySelector("#raid-near").classList.contains("hidden")', 10);
  await Q.click('#raid-near button', null, 400);
  Q.check('"Stand up & run" stands you up', !(await page.eval(() => window.__tli.P.seated)));
  Q.check('the warning goes away once you stand', await until('document.querySelector("#raid-near").classList.contains("hidden")', 2));

  // ---------- pause mid-raid (solo): the raid freezes ----------
  await Q.gw(0.5);
  const a = await page.eval(() => { window.__tli.Game.pause(true); return { left: Raid.left, c: Raid.cops.map(c => [c.x, c.z]) }; });
  await page.wait(1500);
  const b = await page.eval(() => ({ left: Raid.left, c: Raid.cops.map(c => [c.x, c.z]) }));
  Q.check('solo pause freezes the raid clock and the officers', a.left === b.left && JSON.stringify(a.c) === JSON.stringify(b.c), { a, b });
  await page.eval(() => { window.__tli.Game.pause(false); return true; });

  // ---------- an arrest: fine = 25% of the wallet (min $40), mugshot, released at the door ----------
  await page.eval(() => { const T = window.__tli; RAID.tag = 0.8; T.G.wallet = 400; const c = Raid.cops[0]; const f = freeSpot(c.x - 0.5, c.z); T.P.pos.x = f[0]; T.P.pos.z = f[1]; T.P.third = true; return true; });
  const busted = await until('!!Raid.bust', 12);
  r = await R();
  Q.check('a cop tags you: busted, fined $100 of $400', busted && r.wallet === 300 && r.bustEl, r);
  await until('Raid.bust && Raid.bust.snap', 4);
  await Q.gw(0.4);
  await Q.shot('raid-03-mugshot');
  await until('!Raid.bust', 8);
  const rel = await page.eval(() => { const T = window.__tli; return { x: +T.P.pos.x.toFixed(1), cam: !!T.P.cam, over: !!T.W.camOverride, ctl: T.Game.canControl(), card: document.querySelector('#raid-bust').className }; });
  Q.check('released at the front door with the controls back', rel.x > 17 && !rel.cam && !rel.over && rel.ctl && rel.card === 'hidden', rel);
  // tiny wallets: the fine never takes more than you have, and $0 stays $0
  const fines = await page.eval(() => { const T = window.__tli, out = []; for (const w of [0, 30, 100, 1000]) { T.G.wallet = w; Raid.bust = null; Raid.busted(); out.push([w, T.G.wallet]); Raid.release(true); } return out; });
  Q.check('fine: min $40, never more than the wallet', JSON.stringify(fines) === JSON.stringify([[0, 0], [30, 0], [100, 60], [1000, 750]]), fines);

  // ---------- repel the raid: every cop dizzy → they run out → hazard pay + team bonus ----------
  await page.eval(() => { const T = window.__tli; T.G.wallet = 200; window.__team0 = T.G.team; RAID.tag = 0; for (const c of Raid.cops) Raid.hurt(c, 10, 1, 0, 0, 'hammer'); return true; });
  await Q.gw(0.5);
  await Q.shot('raid-04-cops-dizzy');
  const won = await until('!Raid.on', 20);
  r = await R();
  const team0 = await page.eval(() => window.__team0);
  Q.check('raid repelled: +$150 hazard pay, +$300 team bonus, sirens off', won && r.wallet === 350 && r.team === team0 + 300 && !r.siren && !r.glow && /win/.test(r.alert), { r, team0 });
  await Q.gw(0.6);
  await Q.shot('raid-05-repelled');
  await until('Raid.cops.length === 0', 20);
  Q.check('the cops leave the building', (await R()).cops === 0);

  // ---------- lose one: 10% petty cash ----------
  await page.eval(() => { const T = window.__tli; Raid.lastEnd = -999; T.G.wallet = 500; Raid.start(2); Raid.left = 0.2; return true; });
  await until('!Raid.on', 5);
  r = await R();
  Q.check('raid timed out: 10% of the wallet seized', !r.on && r.wallet === 450 && /lose/.test(r.alert), r);
  await Q.shot('raid-06-lost');

  // ---------- the day ends mid-raid ----------
  await page.eval(() => { const T = window.__tli; Raid.lastEnd = -999; Raid.start(3); return true; });
  await Q.gw(2);
  await page.eval(() => { window.__tli.G.timeLeft = 0.2; return true; });
  await Q.waitFor(() => window.__tli.G.phase === 'review', 5000);
  await Q.gw(0.5);
  r = await R();
  Q.check('the review stops the raid: no cops, sirens, lights, banners', !r.on && !r.cops && !r.siren && !r.glow && !r.lights && !r.near && !r.alert, r);
  const boss = await page.eval(() => ({ y: window.__tli.W.boss.group.position.y, duck: Raid.ducking }));
  Q.check('The Boss stands up for the review', !boss.duck && Math.abs(boss.y) < 0.05, boss);
  await Q.shot('raid-07-review-after-raid');

  // ---------- busted, then quit to the menu ----------
  await page.eval(() => { Review.seek(Review.state.sheetAt + 0.5); return true; });
  await page.wait(800);
  await page.eval(() => { const T = window.__tli; if (T.G.result && T.G.result.pass) T.Game.nextDay(); else T.Game.retryDay(); return true; });
  await page.wait(800);
  Q.check('the next shift starts with the main door closed', !(await page.eval(() => window.__tli.W.doors.main.isOpen)));
  await page.eval(() => { const T = window.__tli; document.getElementById('daycard').classList.add('hidden'); T.G.timeLeft = 200; Raid.lastEnd = -999; RAID.tag = 0.8; T.G.wallet = 100; Raid.start(2); return true; });
  await Q.gw(2.5);
  await page.eval(() => { Raid.busted(); return true; });
  await Q.gw(0.5);
  Q.check('busted before quitting', (await R()).bust);
  await page.eval(() => { window.__tli.Game.quit(); return true; });
  await page.wait(600);
  r = await R();
  const scene = await page.eval(() => ({ book: !!(Raid.book && Raid.book.av.group.visible), busted: document.body.classList.contains('raid-busted'), heatHud: !document.querySelector('#raid-heat').classList.contains('hidden'), pill: !document.querySelector('#tb-heat').classList.contains('hidden') }));
  Q.check('quit mid-raid while busted: everything cleaned up', !r.on && !r.cops && !r.bust && !r.siren && !r.glow && !r.cam && !r.pcam && !r.bustEl && !r.near && !scene.busted && !scene.heatHud && !scene.book, { r, scene });
  await Q.shot('raid-08-menu-after-quit');

  // ---------- a new game starts clean ----------
  await page.eval(() => { window.__tli.Game.startSolo('week', 1); document.getElementById('daycard').classList.add('hidden'); RAID.tag = 0.8; return true; });
  await page.wait(800);
  r = await R();
  const ng = await page.eval(() => ({ ctl: window.__tli.Game.canControl(), heat: Raid.heat, day: window.__tli.G.day, door: window.__tli.W.doors.main.isOpen }));
  Q.check('new game: heat 0, no raid, you can walk', !r.on && !r.cops && !r.cam && !r.pcam && ng.ctl && ng.heat === 0 && ng.day === 1, { r, ng });
  Q.check('new game: the main door the raid burst open is closed again', !ng.door, ng.door);
  await Q.done();
};
