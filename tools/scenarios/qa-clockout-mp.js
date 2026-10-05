/* QA: clock out early in multiplayer = a majority vote (host decides). Three players:
   A) the host proposes, a client votes yes with F1 -> 2 of 3 -> everyone sees the stamp -> the review starts for all;
   B) a client proposes, two players vote no (F2 / the No button) -> the vote fails, the day goes on, a cooldown applies;
   C) nobody answers -> the vote times out;  D) a voter quits mid-vote -> the room is recounted (2 of 2).
   Run (needs the multiplayer rig tools/harness-mp.js):
     xvfb-run -a -s "-screen 0 1920x1080x24" ./node_modules/.bin/electron --no-sandbox --enable-unsafe-swiftshader tools/harness-mp.js tools/scenarios/qa-clockout-mp.js 3 1280x720 <outdir> */
module.exports = async mp => {
  const [A, B, C] = mp.pages;
  const vote = p => p.eval(() => ClockOut.vote && { by: ClockOut.vote.by, yes: ClockOut.vote.yes.length, no: ClockOut.vote.no.length, n: ClockOut.vote.n, need: ClockOut.vote.need, card: !document.querySelector('#co-vote').classList.contains('hidden') });
  const press = (p, code) => p.eval(c => { window.dispatchEvent(new KeyboardEvent('keydown', { code: c, key: c, bubbles: true })); return true; }, code);
  const propose = async p => {
    await p.eval(() => { ClockOut.ask(); return true; });
    await mp.waitFor(p, () => ClockOut.modal, 4000);
    const note = await p.eval(() => (document.querySelector('#co-confirm .co-note') || {}).textContent || '');
    await p.eval(() => { [...document.querySelectorAll('#co-confirm .btn')].find(b => /Start the vote/.test(b.textContent)).click(); return true; });
    return note;
  };
  for (const p of mp.pages) await p.eval(() => { window.__toasts = []; const ot = window.toast; window.toast = function (m) { window.__toasts.push(String(m)); return ot.apply(this, arguments); }; window.__stamps = []; const r = ClockOut.result.bind(ClockOut); ClockOut.result = x => { window.__stamps.push(x); return r(x); }; return true; });
  await mp.host('week', 0);
  await mp.join(B); await mp.join(C);
  await mp.startShift();

  // ---------- A) the host proposes, Bob says yes ----------
  const note = await propose(A);
  mp.check('A: the confirmation explains the vote (2 of 3)', /2 of 3/.test(note), note);
  for (const p of mp.pages) await mp.waitFor(p, () => ClockOut.vote && !document.querySelector('#co-vote').classList.contains('hidden'), 6000);
  const vb = await vote(B);
  mp.check('A: everyone sees the vote card (1 yes of 2 needed)', vb && vb.yes === 1 && vb.need === 2 && vb.n === 3 && vb.card, vb);
  mp.check('A: the others are told who wants to clock out', /wants to clock out early/.test(await C.eval(() => window.__toasts.join('|'))));
  await B.eval(() => { const T = window.__tli; T.OS.fastBoot = true; return true; });
  await B.sit();
  await mp.wait(1200);
  await mp.shotAll('mpco-01-vote-open');
  await press(B, 'F1');
  await mp.waitFor(B, () => window.__stamps.length >= 1, 6000);
  await B.shot('mpco-02-passed-bob');
  for (const p of mp.pages) await mp.waitFor(p, () => window.__stamps.length >= 1, 6000);
  mp.check('A: the vote passes on every screen', (await Promise.all(mp.pages.map(p => p.eval(() => window.__stamps[0] && window.__stamps[0].ok && window.__stamps[0].yes === 2)))).every(Boolean));
  for (const p of mp.pages) await mp.waitFor(p, () => window.__tli.G.phase === 'review', 8000);
  const early = await Promise.all(mp.pages.map(p => p.eval(() => { const r = window.__tli.G.result; return r && r.early > 0 && r.lines.some(l => /early/i.test(l)); })));
  mp.check('A: the review starts for everyone and says they left early', early.every(Boolean), early);
  const cam = await A.eval(() => { const T = window.__tli; return { review: T.P.review, x: +T.W.camera.position.x.toFixed(1), z: +T.W.camera.position.z.toFixed(1) }; });
  mp.check('A: the host is seated in the review room', cam.review >= 0 && cam.x > 10 && cam.z < -2, cam);
  mp.check('A: no vote left over', (await Promise.all(mp.pages.map(p => p.eval(() => !ClockOut.vote && document.querySelector('#co-vote').classList.contains('hidden'))))).every(Boolean));
  await A.eval(() => { window.__tli.Game.nextDay(); return true; });
  for (const p of mp.pages) await mp.waitFor(p, () => window.__tli.G.phase === 'day' && window.__tli.G.day === 2, 8000);

  // ---------- B) Bob proposes, Alice and Cara say no ----------
  for (const p of mp.pages) await p.eval(() => { window.__stamps.length = 0; return true; });
  await B.sit();
  await mp.waitFor(B, () => window.__tli.OS.open, 8000);
  await propose(B);
  const bid = await B.id();
  await mp.waitFor(B, () => ClockOut.vote && document.querySelector('#co-vote.in-os'), 6000);
  await mp.wait(500);
  await B.shot('mpco-03b-vote-bob-desk');
  await mp.waitFor(A, id => ClockOut.vote && ClockOut.vote.by === id, 6000, bid);
  await mp.waitFor(C, () => ClockOut.vote && !document.querySelector('#co-vote').classList.contains('hidden'), 6000);
  await press(A, 'F2');
  await mp.waitFor(C, () => ClockOut.vote && ClockOut.vote.no.length === 1, 6000);
  await C.shot('mpco-03-vote-cara');
  await C.eval(() => { document.querySelector('#co-vote .co-no').click(); return true; });
  await mp.waitFor(B, () => window.__stamps.length >= 1, 6000);
  await B.shot('mpco-04-failed-bob');
  for (const p of mp.pages) await mp.waitFor(p, () => window.__stamps.length >= 1, 6000);
  const st = await B.eval(() => window.__stamps[0]);
  mp.check('B: two no votes sink it', st && !st.ok && st.yes === 1 && st.no === 2, st);
  mp.check('B: the shift goes on', (await Promise.all(mp.pages.map(p => p.eval(() => window.__tli.G.phase)))).every(ph => ph === 'day'));
  await mp.waitFor(B, () => ClockOut.cool > 0, 3000);
  await B.eval(() => { ClockOut.ask(); return true; });
  mp.check('B: a new vote has to wait (cooldown)', /Try again in/.test(await B.eval(() => window.__toasts.slice(-1)[0])) && !(await B.eval(() => ClockOut.modal)));

  // ---------- C) nobody answers: the vote times out ----------
  for (const p of mp.pages) await p.eval(() => { window.__stamps.length = 0; return true; });
  await A.eval(() => { ClockOut.cool = 0; ClockOut.VOTE_SECS = 3; return true; });
  await propose(A);
  for (const p of mp.pages) await mp.waitFor(p, () => window.__stamps.length >= 1, 15000);
  const to = await C.eval(() => window.__stamps[0]);
  mp.check('C: an unanswered vote times out', to && !to.ok && to.timeout && to.yes === 1, to);

  // ---------- D) Cara leaves mid-vote: 2 of 2 needed now ----------
  for (const p of mp.pages) await p.eval(() => { window.__stamps.length = 0; return true; });
  await A.eval(() => { ClockOut.cool = 0; ClockOut.VOTE_SECS = 30; return true; });
  await propose(A);
  await mp.waitFor(B, () => ClockOut.vote, 6000);
  await C.eval(() => { window.__tli.Game.quit(); return true; });   // Cara quits to the menu
  await mp.waitFor(A, () => ClockOut.vote && ClockOut.vote.n === 2, 20000);
  const vd = await vote(A);
  mp.check('D: the room is recounted when someone leaves', vd && vd.n === 2 && vd.need === 2 && vd.yes === 1, vd);
  await press(B, 'F1');
  for (const p of [A, B]) await mp.waitFor(p, () => window.__tli.G.phase === 'review', 8000);
  mp.check('D: 2 of 2 clocks out', (await A.eval(() => window.__stamps[0] && window.__stamps[0].ok && window.__stamps[0].n === 2)));
};
