/* Review scenario: the end-of-day performance review both ways.
   A) solo, quota missed: real Game.endDay with call lines collected from 'call:line' → title, call analysis,
      results chart, verdict, the room on fire, the termination report; then "Try the day again".
   B) four agents, quota met → results chart + employee evaluation, then "Next day".
   C) four agents fired, seen by a client → termination report with "Waiting for the host".
   D) Friday passed → promotion notice.
   REVIEW_ONLY=a,b,c,d runs some parts. Waits are in game time; screenshots freeze the frame loop. */
module.exports = async page => {
  const only = (process.env.REVIEW_ONLY || '').split(',').filter(Boolean), want = k => !only.length || only.includes(k);
  const ev = (f, ...a) => page.eval(f, ...a);
  const gw = sec => ev(s => new Promise(res => { const t0 = W.t; const f = () => (W.t - t0 >= s ? res(true) : setTimeout(f, 30)); f(); }), sec);
  const shot0 = page.shot; page.shot = async n => {
    await ev(() => new Promise(res => { document.querySelectorAll('.toast').forEach(t => t.remove()); const raf = window.requestAnimationFrame; window.__raf = raf; window.requestAnimationFrame = cb => { window.__cb = cb; return 0; }; raf(() => setTimeout(() => res(true), 30)); }));
    const r = await shot0(n);
    await ev(() => { window.requestAnimationFrame = window.__raf; if (window.__cb) window.__raf(window.__cb); return true; });
    return r;
  };
  const seek = t => ev(t => { Review.seek(t); return Review.state; }, t);
  const state = () => ev(() => Review.state);
  /* a fake 4-agent result run through the real Game.enterReview (+ the host's reviewLines/enrich) */
  const fake = (pass, day, client) => ev((pass, day, client) => {
    const T = window.__tli, G = T.G, Game = T.Game;
    G.day = day; G.phase = 'review'; G.quota = 2600; G.team = pass ? 3150 : 1600;
    const players = pass ? [['Priya', 1250], ['Marcus', 900], ['Agent', 650], ['Tomasz', 350]] : [['Priya', 650], ['Agent', 450], ['Marcus', 300], ['Tomasz', 200]];
    const res = { day, team: G.team, quota: G.quota, pass, week: day % 5 === 0, players: players.map(p => ({ name: p[0], personal: p[1] })) };
    Review.addQuote('Ma\'am, this is definitely, 100% not a scam. Please read me the code on the back of the gift card.', 'Priya');
    Review.addQuote('Congratulations! You have won a JET SKI and a lifetime supply of bananas!', 'Marcus');
    Review.addQuote('Sir, I am calling from Bonk Bank. Your llama has been hacked.', 'Tomasz');
    res.lines = reviewLines(res);
    if (client) { window.__auth = Game.authority; Game.authority = () => false; }   // restored after the shot
    Game.enterReview(res);
    return Review.state;
  }, pass, day, !!client);

  await page.startSolo('week');

  if (want('a')) {
    // a short day: say some things on calls, earn a bit, end the day early (quota missed)
    await ev(() => {
      const T = window.__tli;
      for (const t of ['Hello, this is Steve from the prize office.', 'You won a JET SKI! I promise this is totally legit!', 'Can you read me the numbers on the gift card? Slowly. All of them.', 'ok', 'Sir, your computer has a virus called Kevin. I can remove it for a small fee of 40 dollars.'])
        T.Bus.emit('call:line', { who: 'you', text: t, call: null });
      T.Game.earn(250); return true;
    });
    await gw(0.3);
    const st = await ev(() => { window.__tli.Game.endDay(); return Review.state; });
    const res = await ev(() => { const r = window.__tli.G.result; return { quotes: r.quotes, recs: r.recs, days: r.days, haul: r.haul, lines: r.lines }; });
    console.log('review A: ' + JSON.stringify(st) + '\nres A: ' + JSON.stringify(res));
    if (!res.quotes || res.quotes.length < 3) throw new Error('expected three call quotes');
    const M = st.marks;
    await gw(1.6);
    await page.shot('rv-01-title');
    await seek(M.calls + 0.05); await gw(4.4);
    await page.shot('rv-02-calls');
    await seek(M.chart + 0.05); await gw(2.6);
    await page.shot('rv-03-chart');
    await seek(M.verdict + 0.05); await gw(0.7);
    await page.shot('rv-04-verdict');
    await gw(2.2);
    await page.shot('rv-05-fire');
    await ev(() => { const P = window.__tli.P; P.yaw += 0.9; P.pitch = -0.15; return true; });   // look around while seated
    await gw(0.4);
    await page.shot('rv-05b-fire-look');
    await seek(M.sheet + 0.05); await gw(1.4);
    await page.shot('rv-06-termination');
    await ev(() => { window.__tli.Game.retryDay(); return true; });
    await gw(0.4);
    const after = await ev(() => { const T = window.__tli; return { phase: T.G.phase, review: document.getElementById('review').className, on: Review.on, fx: FX.stats(), p: T.P.review, tint: document.getElementById('fx-tint').style.opacity }; });
    console.log('after retry: ' + JSON.stringify(after));
    if (after.phase !== 'day' || after.on) throw new Error('retry did not restart the day');
    if (after.fx && after.fx.fires) throw new Error('fires still burning after the retry');
  }

  if (want('b')) {
    const st = await fake(true, 1);
    console.log('review B: ' + JSON.stringify(st));
    await seek(st.marks.chart + 0.05); await gw(2.6);
    await page.shot('rv-07-chart-team');
    await seek(st.verdictAt + 0.1); await gw(1.6);
    await page.shot('rv-08-pass');
    await seek(st.sheetAt + 0.05); await gw(1.4);
    await page.shot('rv-09-evaluation');
    const nd = await ev(() => { const T = window.__tli; T.Game.nextDay(); return { day: T.G.day, phase: T.G.phase, on: Review.on }; });
    console.log('next day: ' + JSON.stringify(nd));
    if (nd.day !== 2 || nd.phase !== 'day') throw new Error('next day failed');
  }

  if (want('c')) {
    const st = await fake(false, 3, true);
    await ev(() => { Review.skip(); Review.skip(); return true; });
    await gw(1.4);
    const wait = await ev(() => !!document.querySelector('.rv-sheet .wait'));
    await page.shot('rv-10-termination-client');
    await ev(() => { const T = window.__tli; T.Game.authority = window.__auth; T.G.phase = 'review'; T.Game.retryDay(); return true; });
    if (!wait) throw new Error('client sheet should wait for the host');
  }

  if (want('d')) {
    const st = await fake(true, 5);
    await seek(st.verdictAt + 0.1); await gw(1.2);
    await page.shot('rv-11-promoted-slide');
    await seek(st.sheetAt + 0.05); await gw(1.4);
    await page.shot('rv-12-promotion');
  }
  console.log('errors so far: ' + page.errors.length);
};
