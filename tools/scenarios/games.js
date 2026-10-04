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
};
