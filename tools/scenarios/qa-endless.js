/* QA: endless mode. Start from the menu, no quota / no review, taskbar shows OVERTIME, calls keep coming, money unlocks
   new schemes (toast + desktop icons), the total saves, quit to the menu, the menu shows the total, continue restores
   it (wallet, inventory, progress), reset total. Also: a page reload keeps the endless save.
   Run: xvfb-run -a -s "-screen 0 1920x1080x24" ./node_modules/.bin/electron --no-sandbox --enable-unsafe-swiftshader tools/harness.js tools/scenarios/qa-endless.js 1280x720 <outdir> */
module.exports = async page => {
  const Q = require('./qa-lib')(page);
  await page.eval(() => { const T = window.__tli; T.Saves.endless = null; writeSaves(); T.OS.fastBoot = true; T.UI.menu('solo'); return true; });
  await page.wait(300);
  Q.check('menu offers endless', /Start endless/.test(await page.eval(() => document.querySelector('#solo-body').textContent)));
  await Q.click('#solo-body .btn.primary', /Start endless/, 900);
  let g = await page.eval(() => { const T = window.__tli; return { mode: T.G.mode, phase: T.G.phase, quota: T.G.quota, team: T.G.team, n: T.Game.unlockCount() }; });
  Q.check('endless started', g.mode === 'endless' && g.phase === 'day' && g.team === 0, g);
  await page.wait(2000);
  await Q.shot('end-01-daycard');
  await Q.sit();
  const tb = await page.eval(() => document.querySelector('#tb-stats').textContent);
  Q.check('taskbar: team + overtime, no quota', /Overtime/i.test(tb) && !/Quota/i.test(tb), tb);
  // the phone rings by itself
  const rang = await Q.waitFor(() => window.__tli.Call.state === 'ringing', 15000, 300);
  Q.check('calls come in by themselves', rang);
  await Q.shot('end-02-desktop-ringing');
  await Q.click('#os-modal .ringcard .rb.yes', null, 900);
  await page.eval(() => { window.__tli.OS.close('memo', true); window.__tli.Call.setScheme(window.__tli.Game.unlocked()[0].id); return true; });
  const r = await Q.play();
  Q.check('endless call paid', r.res === 'paid', r);
  await page.wait(2600); await Q.hush();
  g = await page.eval(() => { const T = window.__tli; return { team: T.G.team, sv: T.Saves.endless && T.Saves.endless.total, n: T.Game.unlockCount() }; });
  Q.check('team total saved right away', g.team > 0 && g.sv === g.team, g);
  // big earnings unlock new schemes
  const n0 = g.n;
  await page.eval(() => { window.__tli.Game.earn(1300); return true; });
  await page.wait(500);
  const un = await page.eval(() => { const T = window.__tli; return { n: T.Game.unlockCount(), icons: T.OS.desktopIds().filter(i => /^sch_/.test(i)).length, toasts: [...document.querySelectorAll('#toasts .toast')].map(t => t.textContent).filter(t => /unlocked/.test(t)) }; });
  Q.check('earning unlocks schemes with a toast and icons', un.n > n0 && un.icons === un.n && un.toasts.length, un);
  await Q.shot('end-03-unlocked');
  // no review ever
  await page.eval(() => { window.__tli.G.timeLeft = 0; return true; });
  await page.wait(1200);
  Q.check('no review in endless', (await page.eval(() => window.__tli.G.phase)) === 'day');
  // buy something and earn wallet money, then quit
  await page.eval(() => { const T = window.__tli; T.Game.addWallet(500); BonkMart.buy('soda'); T.G.prog.qaEnd = 1; T.Game.saveProgress(); return true; });
  const before = await page.eval(() => { const T = window.__tli; return { team: T.G.team, wallet: T.G.wallet, soda: T.Inv.count('soda'), scams: T.G.stats.scams }; });
  await page.eval(() => { window.__tli.Game.pause(true); return true; });
  await Q.click('#pause .btn.danger', /Quit/, 800);
  await page.eval(() => { window.__tli.UI.menu('solo'); return true; });
  await page.wait(300);
  const txt = await page.eval(() => document.querySelector('#solo-body').textContent);
  Q.check('menu shows the endless total and Continue', txt.includes('Continue endless') && txt.replace(/,/g, '').includes(String(before.team)), txt.slice(0, 400));
  await Q.shot('end-04-menu-total');
  // reload the page: the save survives
  await page.eval(() => { location.reload(); return true; }).catch(() => {});
  await page.wait(4000);
  await Q.waitFor(() => !!window.__tli, 15000);
  await page.eval(() => { const T = window.__tli; T.settings.tts = false; T.OS.fastBoot = true; T.UI.menu('solo'); return true; });
  await page.wait(300);
  await Q.click('#solo-body .btn.primary', /Continue endless/, 900);
  const after = await page.eval(() => { const T = window.__tli; return { mode: T.G.mode, team: T.G.team, wallet: T.G.wallet, soda: T.Inv.count('soda'), scams: T.G.stats.scams, prog: T.G.prog.qaEnd, n: T.Game.unlockCount() }; });
  Q.check('continue restores total, wallet, inventory, stats and progress', after.mode === 'endless' && after.team === before.team && after.wallet === before.wallet && after.soda === before.soda && after.scams === before.scams && after.prog === 1, { before, after });
  Q.check('unlocks restored from the total', after.n >= un.n, after.n);
  await page.wait(1500);
  await Q.shot('end-05-continued');
  // reset total from the menu
  await page.eval(() => { window.__tli.Game.quit(); window.__tli.UI.menu('solo'); return true; });
  await page.wait(300);
  await Q.click('#solo-body .btn.small', /Reset total/, 400);
  Q.check('reset total clears the endless save', await page.eval(() => window.__tli.Saves.endless === null && /Start endless/.test(document.querySelector('#solo-body').textContent)));
  await Q.done();
};
