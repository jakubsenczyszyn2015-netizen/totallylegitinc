/* QA: LuckyBonk money maths and Cosmic Cookie baking like a player would hit them.
   Every casino game played once through the real buttons (wallet = start - bets + payouts, from casino:result);
   every game closed mid-round (settled once, nothing paid twice, no errors when its animation ends); a solo pause
   mid-crash (the rocket waits); the shift ending mid-round; quitting mid-round (the save has the settled wallet);
   Cosmic Cookie keeps baking with the window closed, not in the menu, and its units survive quit + continue.
   Run: xvfb-run -a -s "-screen 0 1920x1080x24" ./node_modules/.bin/electron --no-sandbox --enable-unsafe-swiftshader tools/harness.js tools/scenarios/qa-games.js 1280x720 <outdir> */
module.exports = async page => {
  const Q = require('./qa-lib')(page);
  await page.eval(() => { const T = window.__tli; T.Saves.week = [null, null, null]; T.Saves.endless = null; writeSaves(); T.OS.fastBoot = true; return true; });
  await page.startSolo('week');
  await page.eval(() => { const T = window.__tli; T.G.prog.apps = { cookie: true, casino: true }; T.Game.addWallet(5000); T.G.timeLeft = 280;
    window.__cr = []; T.Bus.on('casino:result', r => window.__cr.push(r)); return true; });
  await Q.sit(); await Q.hush();
  await page.eval(() => { window.__tli.OS.close('memo', true); return true; });
  const errs0 = page.errors.length;
  const W = () => page.eval(() => window.__tli.G.wallet);
  const net = () => page.eval(() => window.__cr.reduce((a, r) => a + r.payout - r.bet, 0));
  const open = async (id, bet) => { await page.eval((id, bet) => { const T = window.__tli; const w = Casino.open(id); T.G.prog.casino.bet = bet; w.casino.ctx.refresh(); if (w.casino.game.onBet) w.casino.game.onBet(); return true; }, id, bet); await page.wait(300); };
  const act = () => page.eval(() => { const b = document.querySelector('.win[data-app=casino] .lb-act'); if (!b || b.disabled) return false; b.click(); return true; });
  const busy = () => page.eval(() => { const w = window.__tli.OS.wins.get('casino'); return !!(w && w.casino.game && w.casino.game.busy()); });
  const prep = { roulette: () => page.eval(() => { const c = document.querySelector('.win[data-app=casino] .lb-rc[data-k=red]'); if (c) c.click(); return !!c; }) };
  const GAMES = ['crash', 'slots', 'plinko', 'dice', 'mines', 'coin', 'keno', 'roulette'];

  // ---------- one round of each game through the action button ----------
  for (const id of GAMES) {
    const w0 = await W(), n0 = await net(), k0 = await page.eval(() => window.__cr.length);
    await open(id, 50);
    if (prep[id]) await prep[id]();
    await page.eval(() => { window.__tli.G.prog.casino.auto = 0; return true; });
    const started = await act();
    if (id === 'crash') { await Q.waitFor(() => { const g = window.__tli.OS.wins.get('casino').casino.game; return g.label()[0].startsWith('CASH OUT') || !g.busy(); }, 8000, 100); await act(); }
    if (id === 'mines') { await page.eval(() => { const g = window.__tli.OS.wins.get('casino').casino.game, s = g.peek(); for (let i = 0; i < 25; i++) if (!s.bombs.has(i)) { g.reveal(i); break; } return true; }); await page.wait(200); await act(); }
    await Q.waitFor(() => { const w = window.__tli.OS.wins.get('casino'); return !w.casino.game.busy(); }, 12000, 200);
    await page.wait(300);
    const w1 = await W(), n1 = await net();
    Q.check('casino ' + id + ': one round, wallet = bets and payouts', started && w1 - w0 === n1 - n0 && (await page.eval(() => window.__cr.length)) > k0, { started, w0, w1, net: n1 - n0 });
    if (id === 'slots' || id === 'roulette') await Q.shot('games-01-' + id);
  }

  // ---------- close the window mid-round: settled exactly once ----------
  for (const id of GAMES) {
    const w0 = await W(), n0 = await net();
    await open(id, 40);
    if (prep[id]) await prep[id]();
    await act();
    if (id === 'crash') await Q.waitFor(() => window.__tli.OS.wins.get('casino').casino.game.label()[0].startsWith('CASH OUT'), 8000, 100);
    if (id === 'mines') await page.eval(() => { const g = window.__tli.OS.wins.get('casino').casino.game, s = g.peek(); for (let i = 0; i < 25; i++) if (!s.bombs.has(i)) { g.reveal(i); break; } return true; });
    if (id === 'plinko') { await act(); await act(); }
    const mid = await busy();
    await page.eval(() => { document.querySelector('.win[data-app=casino] .tb .wbtn.x').click(); return true; });
    await page.wait(400);
    const w1 = await W(), n1 = await net();
    await page.wait(3500);   // let any leftover animation finish
    const w2 = await W(), n2 = await net();
    Q.check('casino ' + id + ': closing mid-round settles it once', mid && w1 - w0 === n1 - n0 && w2 === w1 && n2 === n1, { mid, w0, w1, w2, net1: n1 - n0, net2: n2 - n0 });
  }
  Q.check('no page errors from mid-round closes', page.errors.length === errs0, page.errors.slice(errs0));

  // ---------- a solo pause mid-crash: the rocket waits ----------
  await open('crash', 30);
  await page.eval(() => { window.__tli.G.prog.casino.auto = 0; return true; });
  await act();
  await Q.waitFor(() => window.__tli.OS.wins.get('casino').casino.game.label()[0].startsWith('CASH OUT'), 8000, 100);
  await Q.press('Escape');
  await page.wait(300);
  const m0 = await page.eval(() => window.__tli.OS.wins.get('casino').casino.game.label()[0]);
  await page.wait(2500);
  const m1 = await page.eval(() => window.__tli.OS.wins.get('casino').casino.game.label()[0]);
  Q.check('solo pause freezes the crash rocket', (await page.eval(() => window.__tli.G.paused)) && m0 === m1, [m0, m1]);
  await Q.shot('games-02-paused-crash');
  await Q.press('Escape');
  await page.wait(500);
  await act();
  await page.wait(300);

  // ---------- the shift ends mid-round ----------
  {
    const w0 = await W(), n0 = await net(), k0 = await page.eval(() => window.__cr.length);
    await open('plinko', 25);
    for (let i = 0; i < 4; i++) await act();
    await page.eval(() => { window.__tli.G.timeLeft = 0.2; return true; });
    await Q.waitFor(() => window.__tli.G.phase === 'review', 8000, 100);
    // the desktop is only hidden for the review (windows stay for tomorrow): the balls land and pay meanwhile
    await Q.waitFor(() => { const w = window.__tli.OS.wins.get('casino'); return !w || !w.casino.game.busy(); }, 40000, 300);
    const w1 = await W(), n1 = await net(), k = await page.eval(() => window.__cr.length);
    Q.check('shift end mid-round: the round still settles', w1 - w0 === n1 - n0 && k - k0 === 4, { w0, w1, net: n1 - n0, results: k - k0 });
    await page.eval(() => { window.__tli.G.team = 99999; return true; });
  }
  await page.eval(() => { const T = window.__tli; T.Game.nextDay(); document.getElementById('daycard').classList.add('hidden'); return true; });
  await page.wait(800);

  // ---------- Cosmic Cookie bakes with the window closed, not in the menu; units survive quit + continue ----------
  await Q.sit(); await Q.hush();
  await page.eval(() => { const T = window.__tli; T.OS.launch('cookie', true); const s = Cookie.state(); s.c = 5000; s.life = Math.max(s.life, 5000); Cookie.dirty(); return true; });
  await page.wait(300);
  const bought = await page.eval(() => Cookie.buyUnit('intern', 10) && Cookie.buyUnit('micro', 1));
  const ck0 = await page.eval(() => { window.__tli.OS.close('cookie', true); return Cookie.state().c; });
  await Q.gw(3);
  const ck1 = await page.eval(() => Cookie.state().c);
  Q.check('cookies bake with the window closed', bought && ck1 > ck0, { bought, ck0, ck1 });
  await page.eval(() => { window.__tli.Game.quit(); return true; });
  await page.wait(300);
  const ckm0 = await page.eval(() => window.__tli.G.prog.cookie && window.__tli.G.prog.cookie.c);
  await page.wait(2000);
  const ckm1 = await page.eval(() => window.__tli.G.prog.cookie && window.__tli.G.prog.cookie.c);
  Q.check('no baking in the menu', ckm0 === ckm1, [ckm0, ckm1]);
  await page.eval(() => { const T = window.__tli; T.Game.startSolo('week', 2); document.getElementById('daycard').classList.add('hidden'); return true; });
  await page.wait(800);
  const ck2 = await page.eval(() => { const s = Cookie.state(); return { u: s.units, c: s.c }; });
  Q.check('cookie units survive quit + continue', ck2.u.intern === 10 && ck2.u.micro === 1 && ck2.c > 0, ck2);

  // ---------- quit mid-round: the save holds the settled wallet ----------
  await Q.sit(); await Q.hush();
  await open('coin', 60);
  await act();
  await page.wait(150);
  await page.eval(() => { window.__tli.Game.quit(); return true; });
  await page.wait(2200);
  const sq = await page.eval(() => ({ w: window.__tli.G.wallet, sv: window.__tli.Saves.week[2].wallet, flips: window.__cr.filter(r => r.game === 'coin').length }));
  Q.check('quit mid-flip: the save has the settled wallet', sq.w === sq.sv, sq);
  Q.check('no page errors', page.errors.length === errs0, page.errors.slice(errs0));
  await Q.done();
};
