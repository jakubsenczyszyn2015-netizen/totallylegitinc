/* Games scenario: Cosmic Cookie (fresh, mid-game, boosts, golden cookie) and LuckyBonk Casino (every game mid-play and on a win).
   Run: xvfb-run -a -s "-screen 0 1920x1080x24" ./node_modules/.bin/electron --no-sandbox --enable-unsafe-swiftshader tools/harness.js tools/scenarios/games.js 1280x720 <outdir>
   Optional env GAMES=cookie,crash,slots,plinko,dice,mines,coin,keno,roulette to run only some parts. */
module.exports = async page => {
  const only = (process.env.GAMES || '').split(',').filter(Boolean), want = k => !only.length || only.includes(k);
  await page.startSolo('week');
  await page.eval(() => { const T = window.__tli; T.OS.fastBoot = true; T.G.timeLeft = 246; T.Call.wait = 1e9; T.G.prog.apps = { cookie: true, casino: true }; T.G.wallet = 2834; return true; });
  await page.sit();
  for (let i = 0; i < 60 && !(await page.eval(() => window.__tli.OS.open)); i++) await page.wait(100);
  await page.wait(900);
  await page.eval(() => { const T = window.__tli; T.Call.state = 'idle'; T.Call.wait = 1e9; [...T.OS.wins.keys()].forEach(id => T.OS.close(id, true)); return true; });
  const shop = await page.eval(() => [...window.__tli.Shop.items.values()].filter(i => i.tab === 'games').map(i => i.id + ':' + i.price + ':' + i.owned()));
  console.log('shop items: ' + JSON.stringify(shop));

  if (want('cookie')) {
    await page.eval(() => { window.__tli.OS.launch('cookie', true); return true; });
    await page.wait(500);
    await page.shot('ck-01-fresh');
    // click the cookie a few times (crumbs + floating numbers) and buy an intern
    await page.eval(() => {
      const c = document.querySelector('.ck-cookie'), r = c.getBoundingClientRect();
      for (let i = 0; i < 24; i++) c.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, clientX: r.left + r.width * (0.3 + Math.random() * 0.4), clientY: r.top + r.height * (0.3 + Math.random() * 0.4) }));
      Cookie.buyUnit('intern', 1); return true;
    });
    await page.wait(250);
    await page.shot('ck-02-clicks');
    const st1 = await page.eval(() => { const s = Cookie.state(); return { c: s.c, life: s.life, units: s.units, rate: Cookie.rate() }; });
    console.log('after clicks: ' + JSON.stringify(st1));
    // mid-game: lots of units, upgrades, a synergy
    await page.eval(() => {
      const s = Cookie.state();
      Object.assign(s.units, { intern: 61, micro: 48, grandma: 33, farm: 21, mine: 12, cartel: 4 }); s.up.finger = s.up.mouse = s.up.mitts = 1; s.syn.intern_micro = 1;
      s.c = 4.2e6; s.life = 7.79e7; s.clicks = 1834; s.ms = 6; Cookie.dirty();
      const w = window.__tli.OS.wins.get('cookie'); w.tab = 'auto'; return true;
    });
    await page.wait(400);
    await page.eval(() => { document.querySelector('.ck-tab[data-t=click]').click(); document.querySelector('.ck-tab[data-t=auto]').click(); return true; });
    await page.wait(500);
    await page.shot('ck-03-midgame');
    // boosts: frenzy + golden cookie + banner
    await page.eval(() => { document.querySelector('.ck-tab[data-t=boost]').click(); const s = Cookie.state(); s.b.frenzy = 24; s.cd.lure = 80; const w = window.__tli.OS.wins.get('cookie'); w.gold(); return true; });
    await page.wait(2600);
    await page.shot('ck-04-boosts');
    await page.eval(() => { document.querySelector('.ck-tab[data-t=syn]').click(); const w = window.__tli.OS.wins.get('cookie'); w.banner('MILESTONE: CRUMB TYCOON', '+5% production'); return true; });
    await page.wait(600);
    await page.shot('ck-05-synergies');
    // keeps baking while closed
    const before = await page.eval(() => { window.__tli.OS.close('cookie', true); window.__tli.Cookie = Cookie; return Cookie.state().c; });
    await page.wait(1500);
    const after = await page.eval(() => Cookie.state().c);
    console.log('baking while closed: ' + (after > before ? 'yes' : 'NO') + ' (' + Math.round(after - before) + ' in 1.5 s)');
  }

  /* ---------- LuckyBonk Casino ---------- */
  const rig = vals => page.eval(v => { const o = Math.random; window.__rq = v.slice(); Math.random = () => window.__rq.length ? window.__rq.shift() : o.call(Math); window.__rqo = o; return true; }, vals);
  const unrig = () => page.eval(() => { if (window.__rqo) Math.random = window.__rqo; window.__rqo = null; return true; });
  const cz = (code, ...a) => page.eval(code, ...a);
  const act = () => cz(() => { document.querySelector('.lb-act').click(); return document.querySelector('.lb-act').textContent; });
  const open = async (id, bet) => { await cz((id, bet) => { const T = window.__tli; [...T.OS.wins.keys()].forEach(k => { if (k !== 'casino') T.OS.close(k, true); }); const w = Casino.open(id); T.G.prog.casino.bet = bet || 50; w.casino.ctx.refresh(); if (w.casino.game.onBet) w.casino.game.onBet(); return true; }, id, bet); await page.wait(350); };
  const wallet = () => cz(() => window.__tli.G.wallet);
  if (want('crash')) {
    await open('crash', 50);
    await page.shot('cz-01-crash-idle');
    await rig([0.8]); await act(); await unrig();            // pops at 4.85x
    await page.wait(5600);
    await page.shot('cz-02-crash-flying');
    console.log('crash cash out: ' + await act());
    await page.wait(250);
    await page.shot('cz-03-crash-win');
    await page.wait(7600);
    await page.shot('cz-04-crash-popped');
  }
  if (want('slots')) {
    await open('slots', 50);
    await act(); await page.wait(900);
    await page.shot('cz-05-slots-spin');
    await page.wait(2200);
    await rig([0.1, 0.7, 0.2, 0.3, 0.7, 0.9, 0.5, 0.7, 0.1]); await act(); await unrig();   // three desk phones (16x)
    await page.wait(2600);
    await page.shot('cz-06-slots-win');
    await page.wait(1500);
  }
  if (want('plinko')) {
    await open('plinko', 20);
    for (let i = 0; i < 5; i++) { await act(); await page.wait(160); }
    await page.wait(250);
    await page.shot('cz-07-plinko-drop');
    await page.wait(2000);
    await rig([0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1]); await act(); await unrig();  // all rights: 22x
    await page.wait(1950);
    await page.shot('cz-08-plinko-win');
    await page.wait(2000);
  }
  if (want('dice')) {
    await open('dice', 50);
    await act(); await page.wait(300);
    await page.shot('cz-09-dice-roll');
    await page.wait(1200);
    await cz(() => { const w = window.__tli.OS.wins.get('casino'), r = document.querySelector('.lb-range'); r.value = 88; r.dispatchEvent(new Event('input')); return true; });
    await rig([0.9512]); await act(); await unrig();
    await page.wait(1100);
    await page.shot('cz-10-dice-win');
    await page.wait(1500);
  }
  if (want('mines')) {
    await open('mines', 50);
    await cz(() => { [...document.querySelectorAll('.lb-chipsel')].find(b => b.textContent === '5').click(); return true; });
    await act();
    const safe = await cz(() => { const g = window.__tli.OS.wins.get('casino').casino.game, s = g.peek(); const out = []; for (let i = 0; i < 25 && out.length < 4; i++) if (!s.bombs.has((i * 7) % 25)) out.push((i * 7) % 25); return out; });
    for (const i of safe.slice(0, 3)) { await cz(i => { window.__tli.OS.wins.get('casino').casino.game.reveal(i); return true; }, i); await page.wait(120); }
    await page.wait(300);
    await page.shot('cz-11-mines-play');
    await cz(i => { window.__tli.OS.wins.get('casino').casino.game.reveal(i); return true; }, safe[3]);
    await act(); await page.wait(400);
    await page.shot('cz-12-mines-win');
    await page.wait(1500);
    await act();
    await cz(() => { const g = window.__tli.OS.wins.get('casino').casino.game, s = g.peek(); g.reveal([...s.bombs][0]); return true; });
    await page.wait(350);
    await page.shot('cz-13-mines-boom');
    await page.wait(1200);
  }
  if (want('coin')) {
    await open('coin', 100);
    await act(); await page.wait(520);
    await page.shot('cz-14-coin-flip');
    await page.wait(1400);
    await cz(() => { document.querySelector('.lb-pickside').click(); return true; });
    await rig([0.2, 0.5]); await act(); await unrig();
    await page.wait(1500);
    await page.shot('cz-15-coin-win');
    await page.wait(1200);
  }
  if (want('keno')) {
    await open('keno', 50);
    await act(); await page.wait(900);
    await page.shot('cz-16-keno-draw');
    await page.wait(1400);
    await act();
    await cz(() => { const g = window.__tli.OS.wins.get('casino').casino.game, d = g.peek(), p = [...g.picks]; d.nums = p.slice(0, 5).concat([1, 2, 4, 5, 6, 8, 9, 10, 11].filter(n => !p.includes(n))).slice(0, 10); d.hits = 5; d.m = Casino.KENO[p.length][5]; return true; });
    await page.wait(2000);
    await page.shot('cz-17-keno-win');
    await page.wait(1500);
  }
  if (want('roulette')) {
    await open('roulette', 20);
    await cz(() => { document.querySelector('.lb-rc[data-k=n32]').click(); return true; });
    await rig([1.5 / 37, 0.5, 0.5]); await act(); await unrig();
    await page.wait(2200);
    await page.shot('cz-18-roulette-spin');
    await page.wait(2700);
    await page.shot('cz-19-roulette-win');
    await page.wait(1500);
  }
  if (only.length === 0 || only.some(k => k !== 'cookie')) {
    const st = await cz(() => { const T = window.__tli; T.OS.close('casino'); return { wallet: T.G.wallet, prog: T.G.prog.casino }; });
    console.log('casino done: ' + JSON.stringify(st));
  }
};
