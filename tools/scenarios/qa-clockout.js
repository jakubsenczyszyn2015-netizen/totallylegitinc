/* QA: clock out early (solo). The time clock in the hallway, the confirmation (Esc / Enter), the LegitOS start menu
   item, the pause menu button, the review saying you left early, and endless mode (not available there).
   The multiplayer vote is in qa-clockout-mp.js (needs tools/harness-mp.js).
   Run: xvfb-run -a -s "-screen 0 1920x1080x24" ./node_modules/.bin/electron --no-sandbox --enable-unsafe-swiftshader tools/harness.js tools/scenarios/qa-clockout.js 1280x720 <outdir> */
module.exports = async page => {
  const Q = require('./qa-lib')(page);
  await page.eval(() => { const T = window.__tli; T.Saves.week = [null, null, null]; T.Saves.endless = null; writeSaves(); window.__toasts = []; const ot = window.toast; window.toast = function (m) { window.__toasts.push(String(m)); return ot.apply(this, arguments); }; return true; });
  await page.startSolo('week');
  await Q.fast(true);

  // ---------- the time clock on the hallway wall ----------
  const it = await page.eval(() => { const T = window.__tli; const i = T.W.interact.find(x => /clock out/i.test(x.label() || '')); return i && { x: i.pos.x, y: i.pos.y, z: i.pos.z, l: i.label() }; });
  Q.check('time clock interactable', it && it.l === 'Clock out early', it);
  await page.eval(c => { const T = window.__tli, P = T.P; P.pos.x = c.x - 0.25; P.pos.z = c.z + 1.05; const l = lookAngles({ x: P.pos.x, y: P.eye, z: P.pos.z }, c); P.yaw = l.yaw; P.pitch = l.pitch; return true; }, it);
  await Q.gw(0.3);
  Q.check('E prompt on the time clock', (await page.eval(() => { const c = window.__tli.W.cur; return c && c.label(); })) === 'Clock out early');
  await Q.fast(false);
  await Q.shot('co-01-time-clock');
  await Q.press('KeyE');
  Q.check('confirmation opens', await Q.waitFor(() => ClockOut.modal && !document.querySelector('#co-confirm').classList.contains('hidden'), 3000));
  await page.wait(400);
  Q.check('no walking while it is open', !(await page.eval(() => window.__tli.Game.canControl())));
  Q.check('confirmation shows the quota shortfall', /short/.test(await page.eval(() => document.querySelector('#co-confirm .co-quota').textContent)));
  await Q.shot('co-02-confirm-short');
  Q.check('confirmation fits at this size', !(await Q.offscreen('#co-confirm .co-card')).length);
  await Q.press('Escape');
  await page.wait(200);
  const esc = await page.eval(() => ({ modal: ClockOut.modal, vis: !document.querySelector('#co-confirm').classList.contains('hidden'), paused: window.__tli.G.paused, phase: window.__tli.G.phase }));
  Q.check('Esc closes it without pausing or ending the day', !esc.modal && !esc.vis && !esc.paused && esc.phase === 'day', esc);

  // ---------- from the LegitOS start menu, quota met ----------
  await Q.fast(true);
  await page.eval(() => { window.__tli.OS.fastBoot = true; return true; });
  await Q.sit();
  await Q.hush();
  await page.eval(() => { const T = window.__tli; T.G.team = T.G.quota + 150; T.G.personal = T.G.team; T.G.timeLeft = 200; T.OS.power(true); return true; });
  const pm = await page.eval(() => [...document.querySelectorAll('#powermenu .pm-item b')].map(b => b.textContent));
  Q.check('start menu has Clock out early above Quit', pm.indexOf('Clock out early') >= 0 && pm.indexOf('Clock out early') === pm.length - 2, pm);
  await Q.fast(false);
  await Q.shot('co-03-start-menu');
  await Q.click('#powermenu .co-pm');
  Q.check('start menu item opens the confirmation (quota met)', (await Q.visible('#co-confirm')) && /quota met/.test(await page.eval(() => document.querySelector('#co-confirm .co-quota').textContent)));
  await Q.shot('co-04-confirm-met');
  await Q.click('#co-confirm .btn', /Clock out/, 600);
  const rv = await page.eval(() => ({ phase: window.__tli.G.phase, res: window.__tli.G.result && { early: window.__tli.G.result.early, pass: window.__tli.G.result.pass, lines: window.__tli.G.result.lines }, os: window.__tli.OS.open, modal: ClockOut.modal }));
  Q.check('clocking out starts the review now', rv.phase === 'review' && !rv.os && !rv.modal, rv.phase);
  Q.check('the review knows you left early', rv.res && rv.res.early >= 190 && rv.res.early <= 200 && rv.res.pass && rv.res.lines.some(l => /early/i.test(l)), rv.res);
  Q.check('a passed early day is saved', (await page.eval(() => window.__tli.Saves.week[window.__tli.G.slot].day)) === 2);
  await Q.waitFor(() => Review.on, 4000);
  await page.eval(() => { Review.seek(Review.state.marks.sheet + 0.5); return true; });
  await page.wait(800);
  await Q.click('.rv-sheet .rv-btn.primary', /Start/, 1000);
  Q.check('next day starts after an early clock-out', (await page.eval(() => [window.__tli.G.phase, window.__tli.G.day])).join() === 'day,2');

  // ---------- from the pause menu (Enter confirms) ----------
  await page.eval(() => { window.__tli.Game.pause(true); return true; });
  await page.wait(200);
  Q.check('pause menu has the button', await Q.visible('#pause .co-pause'));
  await Q.fast(false);
  await Q.shot('co-05-pause');
  await Q.click('#pause .co-pause');
  Q.check('confirmation above the pause menu', await Q.waitFor(() => ClockOut.modal, 2000));
  await page.wait(300);
  await Q.shot('co-06-confirm-over-pause');
  await Q.press('Enter');
  await page.wait(600);
  const r2 = await page.eval(() => ({ phase: window.__tli.G.phase, paused: window.__tli.G.paused, pause: !document.querySelector('#pause').classList.contains('hidden'), early: window.__tli.G.result && window.__tli.G.result.early, pass: window.__tli.G.result && window.__tli.G.result.pass }));
  Q.check('Enter clocks out from the pause menu (fired, short)', r2.phase === 'review' && !r2.paused && !r2.pause && r2.early > 0 && r2.pass === false, r2);
  Q.check('not available during the review', !(await page.eval(() => ClockOut.available())) && (await page.eval(() => { ClockOut.ask(); return window.__toasts.slice(-1)[0]; })).includes('during a shift'));
  await page.eval(() => window.__tli.Game.quit());
  await page.wait(300);

  // ---------- endless: no review to clock out to ----------
  await page.startSolo('endless');
  await page.eval(() => { const T = window.__tli; T.OS.power(true); T.Game.pause(true); return true; });
  const en = await page.eval(() => ({ pm: !!document.querySelector('#powermenu .co-pm'), pause: !document.querySelector('#pause .co-pause').classList.contains('hidden'), lab: window.__tli.W.interact.find(x => /time clock/i.test(x.label() || '')) ? 'clock' : null }));
  Q.check('endless: no start menu item, no pause button, the clock is just a joke', !en.pm && !en.pause && en.lab === 'clock', en);
  await page.eval(() => { const T = window.__tli; T.Game.pause(false); T.OS.power(false); ClockOut.ask(); return true; });
  Q.check('endless: asking explains why', /Overtime never ends/.test(await page.eval(() => window.__toasts.slice(-1)[0])));
  await page.eval(() => window.__tli.Game.quit());
  await Q.done();
};
