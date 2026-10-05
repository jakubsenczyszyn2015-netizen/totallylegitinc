/* Clock out early in multiplayer: anyone calls a vote, a strict majority must say yes.
   Bob (seated, desktop) calls a vote, Alice + Cara vote no -> it fails for everyone and Bob is on a cool-down;
   Cara calls one, Alice votes yes at the punch clock -> it passes, the host ends the day and every client reaches
   the review with The Boss's clock-out line. Works with 2 players too (then both must agree).
   Run: tools/harness-mp.js tools/scenarios/mp-clockout.js 3 1280x720 <outdir> */
module.exports = async mp => {
  const [A, B] = mp.pages, C = mp.pages[2], all = mp.pages, n = all.length;
  await mp.host('week', 0); await mp.join(B); if (C) await mp.join(C);
  await mp.startShift();
  const ids = {}; for (const p of all) ids[p.name] = await p.id();
  for (const p of all) await p.eval(() => { window.__toasts = []; const o = toast; toast = (m, k) => { window.__toasts.push(typeof m === 'string' ? m : m.textContent); return o(m, k); }; return true; });
  const toasts = p => p.eval(() => window.__toasts.splice(0));
  const vote = p => p.eval(() => ClockOut.vote);
  const key = (p, code) => p.eval(c => { window.dispatchEvent(new KeyboardEvent('keydown', { code: c })); window.dispatchEvent(new KeyboardEvent('keyup', { code: c })); return true; }, code);
  await A.eval(() => { G.team = 300; return true; });
  await B.sit();
  await A.teleport(14, 0, -Math.PI / 2, 0); if (C) await C.teleport(12.5, 0.6, -Math.PI / 2, 0);

  // ---- vote 1: Bob calls it from his desk (start menu -> time card -> Call a vote)
  await B.eval(() => { ClockOut.request(); return true; });
  await mp.wait(300);
  mp.check('Bob gets the time card (Call a vote)', await B.eval(() => ClockOut.open && /vote/i.test(document.querySelector('#co-modal .btn.primary').textContent)));
  await B.eval(() => { ClockOut.confirm(); return true; });
  for (const p of all) await mp.waitFor(p, () => !!ClockOut.vote, 6000);
  for (const p of all) { const v = await vote(p); mp.check('vote reaches ' + p.name + ' (called by Bob, Bob = yes)', v && v.by === ids.Bob && v.yes.join() === ids.Bob && v.need === Math.floor(n / 2) + 1, v); }
  mp.check('vote panel on every screen', (await Promise.all(all.map(p => p.eval(() => !!document.querySelector('#co-vote .co-btns'))))).every(Boolean));
  await mp.wait(500);
  await B.shot('c01-bob-desktop-vote');
  await A.shot('c02-alice-vote');
  // Alice says no with the N key
  await key(A, 'KeyN');
  await mp.waitFor(B, id => { const v = ClockOut.vote; return v && v.no.includes(id); }, 5000, ids.Alice);
  mp.check('Alice\'s NO reaches Bob', true);
  if (C) {
    mp.check('vote still open after one no (2 of 3 possible)', !(await vote(A)).res);
    await key(C, 'KeyN');
  }
  for (const p of all) await mp.waitFor(p, () => { const v = ClockOut.vote; return v && v.res === 'fail'; }, 6000);
  mp.check('vote failed for everyone', true);
  await A.shot('c03-alice-vote-failed');
  mp.check('still on the clock after a failed vote', (await Promise.all(all.map(p => p.eval(() => G.phase)))).every(ph => ph === 'day'));
  mp.check('failed-vote toast on Bob', (await toasts(B)).some(t => /failed/i.test(t)));
  for (const p of all) await mp.waitFor(p, () => !ClockOut.vote, 8000);
  // Bob is on a cool-down
  await B.eval(() => { ClockOut.request(); ClockOut.confirm(); return true; });
  await mp.wait(1200);
  mp.check('Bob cannot call another vote right away', !(await vote(A)) && (await toasts(B)).some(t => /another clock-out vote/i.test(t)));

  // ---- vote 2: Cara (or Alice with 2 players) calls it, Alice votes yes at the punch clock -> passes
  const caller = C || A;
  await caller.eval(() => { ClockOut.request(); ClockOut.confirm(); return true; });
  for (const p of all) await mp.waitFor(p, () => !!ClockOut.vote && !ClockOut.vote.res, 6000);
  if (C) {
    await A.teleport(18.75, -1.25, -Math.PI / 2 - 0.12, 0.08);
    await mp.wait(600);
    mp.check('Alice sees the punch clock prompt', /vote yes/i.test(await A.eval(() => W.cur && W.cur.label()) || ''), await A.eval(() => W.cur && W.cur.label()));
    await A.shot('c04-alice-punch-clock');
    await key(A, 'KeyE');
  } else await key(B, 'KeyY');
  for (const p of all) await mp.waitFor(p, () => { const v = ClockOut.vote; return v && v.res === 'pass'; }, 6000);
  mp.check('vote passed for everyone', true);
  await B.shot('c05-bob-vote-passed');
  for (const p of all) await mp.waitFor(p, () => G.phase === 'review' && G.result, 10000);
  mp.check('the day ends for everyone', true);
  for (const p of all) {
    const r = await p.eval(() => ({ early: G.result.early, line: G.result.lines[1], seat: P.review }));
    mp.check(p.name + ' got the clock-out review (res.early + Boss line)', r.early > 0 && /clock/i.test(r.line), r);
  }
  const seats = await Promise.all(all.map(p => p.eval(() => P.review)));
  mp.check('everyone has their own review seat', new Set(seats).size === n && seats.every(s => s >= 0), seats);
  for (const p of all) await p.eval(() => { Review.seek(Review.state.sheetAt + 0.3); return true; });
  await mp.wait(1500);
  mp.check('client report says waiting for the host', /Waiting for the host/.test(await B.eval(() => (document.querySelector('.rv-sheet .acts') || {}).textContent || '')));
  await B.shot('c06-bob-report');
  // the host retries the day: everyone is back on the floor, no vote left over
  await A.eval(() => { Game.retryDay(); return true; });
  for (const p of all) await mp.waitFor(p, () => G.phase === 'day' && !ClockOut.vote, 8000);
  mp.check('host retry moves everyone to the new day, vote cleared', true);
};
