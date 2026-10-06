/* QA: the rest of a work week through the real UI. Friday: a call driven only by the Phone window (scheme picked in
   the dropdown, Script lines clicked, Enter in the input), a caller who loses all trust and hangs up, Space skips the
   review, the Friday promotion notice, "Start week 2" → Monday of week 2 (bigger quota), the evaluation's
   "Save and quit" → the time card → Continue lands on the right day; the review sheet fits at 720p.
   Run: xvfb-run -a -s "-screen 0 1920x1080x24" ./node_modules/.bin/electron --no-sandbox --enable-unsafe-swiftshader tools/harness.js tools/scenarios/qa-week.js 1280x720 <outdir> */
module.exports = async page => {
  const Q = require('./qa-lib')(page);
  const G = () => page.eval(() => { const T = window.__tli; return { phase: T.G.phase, day: T.G.day, team: T.G.team, quota: T.G.quota, personal: T.G.personal, wallet: T.G.wallet, bank: T.G.bank, hung: T.G.stats.hung }; });
  await page.eval(() => { const T = window.__tli; T.Saves.week = [{ day: 5, bank: 4000, dayLen: 300, stats: { calls: 20, scams: 15, baited: 2, hung: 3 }, wallet: 900, up: {}, inv: {}, prog: { props: { kit: 1 } } }, null, null]; T.Saves.endless = null; writeSaves(); T.OS.fastBoot = true; T.UI.menu('solo'); return true; });
  await page.wait(300);
  const tc = await page.eval(() => document.querySelector('#solo-body .tcard').textContent);
  Q.check('time card: week 1, next Friday', /Week 1/.test(tc) && /Next: Friday/.test(tc), tc);
  await Q.click('#solo-body .tcard .btn.primary', /Continue/, 900);
  await page.eval(() => { document.getElementById('daycard').classList.add('hidden'); return true; });
  let g = await G();
  Q.check('Friday loaded', g.phase === 'day' && g.day === 5 && g.wallet === 900 && g.bank === 4000, g);
  await Q.sit(); await Q.hush();
  await page.eval(() => { window.__tli.OS.close('memo', true); return true; });

  // ---------- a call driven only through the Phone window ----------
  await Q.ringAnswer('granny');
  const opts = await page.eval(() => [...document.querySelectorAll('.win[data-app=phone] select option')].map(o => o.value).filter(Boolean));
  Q.check('the scheme dropdown lists the unlocked schemes', opts.length === (await page.eval(() => window.__tli.Game.unlocked().length)), opts);
  await page.eval(() => { const s = document.querySelector('.win[data-app=phone] select'); s.value = 'prize'; s.dispatchEvent(new Event('change', { bubbles: true })); return true; });
  await page.wait(500);
  Q.check('picking a scheme in the dropdown runs it and opens its window', await page.eval(() => { const T = window.__tli; return T.Call.cur.scheme && T.Call.cur.scheme.id === 'prize' && T.OS.wins.has('sch_prize'); }));
  // say each step through the Script app (click the highlighted line) and Enter in the Phone input
  for (let k = 0; k < 8; k++) {
    const st = await page.eval(() => { const T = window.__tli, c = T.Call.cur; return { live: T.Call.state === 'live', busy: c.busy, res: c.result }; });
    if (!st.live || st.res) break;
    if (st.busy) { await page.wait(400); continue; }
    await page.eval(() => { const T = window.__tli; T.OS.launch('script', true); const b = document.querySelector('.win[data-app=script] .sc-line.hot') || document.querySelector('.win[data-app=script] .sc-line'); b.click(); return true; });
    await page.wait(150);
    const typed = await page.eval(() => document.querySelector('.win[data-app=phone] .ph-in input').value);
    if (k === 0) Q.check('clicking a Script line pastes it into the Phone', typed.length > 10, typed);
    await page.eval(() => { const i = document.querySelector('.win[data-app=phone] .ph-in input'); i.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); return true; });
    await Q.waitFor(() => !window.__tli.Call.cur.busy || window.__tli.Call.state !== 'live', 6000, 200);
    await page.wait(300);
  }
  let r = await Q.state();
  Q.check('the Phone-only call gets paid', r.res === 'paid', r);
  await Q.shot('week-01-phone-ui-call');
  await page.wait(2600); await Q.hush();

  // ---------- a rude agent: trust hits 0, the caller hangs up ----------
  const h0 = (await G()).hung;
  await Q.ringAnswer('gym');
  for (let k = 0; k < 6; k++) {
    if ((await page.eval(() => window.__tli.Call.state)) !== 'live') break;
    await page.eval(() => { window.__tli.Call.cur.trust = 3; return true; });
    await page.say('Shut up and give me your money, idiot. You are stupid.');
    await Q.waitFor(() => window.__tli.Call.state !== 'live' || !window.__tli.Call.cur.busy, 5000, 200);
  }
  await Q.waitFor(() => window.__tli.Call.state === 'ended', 6000, 200);
  r = await Q.state();
  Q.check('insulted caller hangs up (hung), counted', r.st === 'ended' && r.res === 'hung' && (await G()).hung === h0 + 1, { r, hung: (await G()).hung });
  await Q.shot('week-02-hung-up');
  await page.wait(500); await Q.hush();

  // ---------- Friday's review: Space skips, promotion notice ----------
  await page.eval(() => { const T = window.__tli; T.Game.earn(T.G.quota); T.G.timeLeft = 0.3; return true; });
  await Q.waitFor(() => window.__tli.G.phase === 'review' && Review.on, 30000);
  await page.wait(800);
  Q.check('Friday result is a week result', await page.eval(() => window.__tli.G.result.week && window.__tli.G.result.pass));
  await Q.press('Space'); await page.wait(900);
  const s1 = await page.eval(() => Review.state);
  Q.check('Space jumps to the verdict', s1.slide === 'verdict' && !s1.sheet, s1.slide);
  await Q.shot('week-03-promoted-slide');
  await Q.press('Space'); await page.wait(1500);
  await Q.gw(1.5);   // let the sheet's slide-in finish (rows slide up 10 px, which shows a scrollbar while they move)
  const s2 = await page.eval(() => Review.state);
  Q.check('Space again: the promotion notice', s2.sheet === 'promo', s2.sheet);
  const fit = await page.eval(() => { const s = document.querySelector('.rv-sheet'), rows = s && s.querySelector('.rows'), r = s.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), h: innerHeight, rowsOver: rows ? rows.scrollHeight - rows.clientHeight : null }; });
  Q.check('the report fits on a 720p screen', fit.top >= 0 && fit.bottom <= fit.h, fit);
  Q.check('one row does not need a scrollbar', fit.rowsOver !== null && fit.rowsOver <= 1, fit);
  await Q.shot('week-04-promotion-notice');
  Q.check('saved as day 6 after Friday', (await page.eval(() => window.__tli.Saves.week[0].day)) === 6);
  await Q.click('.rv-sheet .rv-btn.primary', /Start week 2/, 1200);
  await page.eval(() => { document.getElementById('daycard').classList.add('hidden'); return true; });
  g = await G();
  Q.check('week 2 starts on Monday with a bigger quota', g.phase === 'day' && g.day === 6 && g.quota > 1500 && g.team === 0, g);
  Q.check('the clock shows a Monday', /^Mon/.test(await page.eval(() => window.__tli.OS.clock()[1])), await page.eval(() => window.__tli.OS.clock()));

  // ---------- Monday of week 2: pass, then Save and quit, Continue ----------
  await page.eval(() => { const T = window.__tli; T.Game.earn(T.G.quota + 50); T.G.timeLeft = 0.3; return true; });
  Q.check('Monday review starts', await Q.waitFor(() => window.__tli.G.phase === 'review' && Review.on, 30000), await page.eval(() => window.__tli.G.phase));
  await page.wait(600);
  await page.eval(() => { Review.skip(); Review.skip(); return true; });
  await Q.waitFor(() => !!Review.state.sheet, 8000);
  Q.check('evaluation sheet', (await page.eval(() => Review.state.sheet)) === 'eval', await page.eval(() => Review.state));
  await Q.click('.rv-sheet .rv-btn', /Save and quit/, 1000);
  g = await G();
  Q.check('Save and quit: main menu', g.phase === 'menu' && (await Q.visible('#menu')), g);
  await page.eval(() => { window.__tli.UI.menu('solo'); return true; });
  await page.wait(300);
  const tc2 = await page.eval(() => document.querySelector('#solo-body .tcard').textContent);
  Q.check('time card: week 2, next Tuesday', /Week 2/.test(tc2) && /Next: Tuesday/.test(tc2), tc2);
  await Q.shot('week-05-timecard-week2');
  await Q.click('#solo-body .tcard .btn.primary', /Continue/, 900);
  g = await G();
  Q.check('Continue: Tuesday of week 2', g.phase === 'day' && g.day === 7, g);
  await Q.done();
};
