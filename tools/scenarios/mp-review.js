/* Multiplayer end of day: the review reaches every client, everyone is pulled out of their chair and seated in the review
   room, the slideshow (Call Analysis with lines from every player) and the report run on every client, clients wait for
   the host, the host's "Try the day again" and "Start Tuesday" move everyone on.
   Run: tools/harness-mp.js tools/scenarios/mp-review.js 3 1280x720 <outdir>   (2 players works too) */
module.exports = async mp => {
  const [A, B] = mp.pages, C = mp.pages[2], all = mp.pages;
  await mp.host('week', 0); await mp.join(B); if (C) await mp.join(C);
  await mp.startShift();
  const ids = {}; for (const p of all) ids[p.name] = await p.id();
  const names = all.map(p => p.name);
  const seekAll = async key => { for (const p of all) await p.eval(k => { const s = Review.state; Review.seek((k === 'sheet' ? s.sheetAt : s.marks[k]) + 0.05); return true; }, key); };
  const clearToasts = async () => { for (const p of all) await p.eval(() => { document.querySelectorAll('.toast').forEach(t => t.remove()); return true; }); };

  // ---- call lines: Bob on a real call (offline caller brain), Alice and Cara through the call:line event
  const deskB = await B.sit();
  await B.ring(false); await B.answer();
  await B.say('Trust me, this is TOTALLY LEGIT and not a scam! You won a JET SKI and a llama!');
  await B.eval(() => { Call.hangup(); return true; });
  await A.eval(() => { Bus.emit('call:line', { who: 'you', text: 'Sir, your computer has a virus called Kevin. I can remove it for 40 dollars, I promise!', call: null }); return true; });
  if (C) await C.eval(() => { Bus.emit('call:line', { who: 'you', text: 'Grandma, the prince needs your gift card code RIGHT NOW, it is urgent!', call: null }); return true; });
  await mp.wait(700);
  const pool = await A.eval(() => Review.quotes().map(q => q.name));
  mp.check('host collected call lines from every player', names.every(n => pool.includes(n)), pool);

  // ---- money: under the quota (fired), Bob stays in his desk chair
  await B.eval(() => { Game.earn(300); return true; });
  await A.eval(() => { Game.earn(120); return true; });
  await mp.wait(800);
  mp.check('Bob still seated at his desk before the review', await B.eval(() => P.seated));

  // ---- the host's clock runs out
  await A.eval(() => { G.timeLeft = 0.05; return true; });
  for (const p of all) await mp.waitFor(p, () => G.phase === 'review' && Review.on, 10000);
  mp.check('review reached every client', true);
  const seats = []; for (const p of all) seats.push(await p.eval(() => [P.review, P.seated, OS.open, Call.state]));
  mp.check('everyone seated in the review room (nobody left in a desk chair, desktop closed)', seats.every(s => s[0] >= 0 && !s[1] && !s[2]), seats);
  mp.check('every player has their own review chair', new Set(seats.map(s => s[0])).size === seats.length, seats);
  mp.check('Bob\'s desk is free again during the review', !(await A.eval(i => Game.deskTaken(i), deskB)));
  await mp.wait(600);
  const rem = await A.eval(list => list.map(id => { const a = W.avatars.get(id); return a ? a.seat : null; }), all.slice(1).map(p => ids[p.name]));
  mp.check('host sees the teammates seated in review chairs', rem.every(s => s <= -10), rem);
  const remB = await B.eval(id => { const a = W.avatars.get(id); return a ? a.seat : null; }, ids.Alice);
  mp.check('Bob sees Alice seated in a review chair', remB <= -10 && -remB - 10 === seats[0][0], { remB, alice: seats[0][0] });

  // ---- the same result on every client: team, verdict, quotes from every player, records
  const hostRes = await A.eval(() => JSON.stringify({ team: G.result.team, quota: G.result.quota, pass: G.result.pass, q: G.result.quotes, recs: (G.result.recs || []).map(r => [r.name, r.today]) }));
  for (const p of all.slice(1)) mp.check('same review result on ' + p.name, (await p.eval(() => JSON.stringify({ team: G.result.team, quota: G.result.quota, pass: G.result.pass, q: G.result.quotes, recs: (G.result.recs || []).map(r => [r.name, r.today]) }))) === hostRes);
  const res = JSON.parse(hostRes);
  mp.check('Call Analysis quotes come from every player', names.every(n => res.q.some(q => q.name === n)), res.q.map(q => q.name + ': ' + q.text));
  mp.check('records rank Bob first with $300', res.recs[0][0] === 'Bob' && res.recs[0][1] === 300, res.recs);
  mp.check('quota missed', res.pass === false && res.team === 420, res);

  // ---- slideshow on every client
  await seekAll('calls'); await mp.wait(3200); await clearToasts();
  for (const p of all) mp.check('Call Analysis slide on ' + p.name, (await p.eval(() => Review.state.slide)) === 'calls');
  await B.shot('r01-bob-call-analysis');
  if (C) await C.shot('r01-cara-call-analysis');
  await seekAll('chart'); await mp.wait(2600); await clearToasts();
  await A.shot('r02-alice-chart');
  await seekAll('verdict'); await mp.wait(2200);
  for (const p of all) mp.check('verdict + fire on ' + p.name, await p.eval(() => Review.state.slide === 'verdict' && Review.state.fired));
  await clearToasts();
  await B.shot('r03-bob-fired');

  // ---- the report: the host gets the buttons, clients wait for the host
  await seekAll('sheet'); await mp.wait(1500);
  const sheetOf = p => p.eval(() => { const s = document.querySelector('.rv-sheet'); return s && { kind: s.className, btns: [...s.querySelectorAll('.rv-btn')].map(b => b.textContent), wait: !!s.querySelector('.wait'), rows: [...s.querySelectorAll('.row .nm')].map(n => n.textContent) }; });
  const sA = await sheetOf(A);
  mp.check('host report: termination report with "Try the day again"', sA && /fired/.test(sA.kind) && sA.btns.some(b => /Try the day again/.test(b)) && !sA.wait, sA);
  for (const p of all.slice(1)) {
    const s = await sheetOf(p);
    mp.check(p.name + ' report: "Waiting for the host", no host buttons', s && /fired/.test(s.kind) && s.wait && !s.btns.some(b => /Try|Start/.test(b)), s);
    mp.check(p.name + ' report lists every player', s && names.every(n => s.rows.some(r => r.startsWith(n))), s && s.rows);
  }
  await clearToasts();
  await A.shot('r04-alice-report');
  await B.shot('r04-bob-report-waiting');
  // a client cannot move the team on by itself
  await B.eval(() => { Game.retryDay(); Game.nextDay(); return true; });
  await mp.wait(400);
  mp.check('client cannot restart the day', (await B.eval(() => G.phase)) === 'review' && (await A.eval(() => G.phase)) === 'review');

  // ---- host: try the day again -> everyone back at work on the same day
  await A.eval(() => { [...document.querySelectorAll('.rv-sheet .rv-btn')].find(b => /Try the day again/.test(b.textContent)).click(); return true; });
  for (const p of all) await mp.waitFor(p, () => G.phase === 'day' && !Review.on && P.review < 0, 10000);
  const st = []; for (const p of all) st.push(await p.eval(() => [G.day, G.team, G.personal, !!document.querySelector('.rv-sheet'), document.getElementById('review').classList.contains('hidden')]));
  mp.check('try again: everyone back on Monday with a fresh team total', st.every(s => s[0] === 1 && s[1] === 0 && s[2] === 0 && !s[3] && s[4]), st);
  mp.check('try again: the fires are out', (await B.eval(() => FX.stats().fires)) === 0);

  // ---- a passing day: the host's "Start Tuesday" moves everyone on
  const quota = await A.eval(() => G.quota);
  await B.eval(q => { Game.earn(Math.min(2000, q)); return true; }, quota);
  await mp.wait(900);
  mp.check('team total reaches the quota', (await A.eval(() => G.team >= G.quota)));
  await A.eval(() => { G.timeLeft = 0.05; return true; });
  for (const p of all) await mp.waitFor(p, () => G.phase === 'review' && Review.on, 10000);
  await seekAll('sheet'); await mp.wait(1500);
  const sP = await sheetOf(A), sPB = await sheetOf(B);
  mp.check('passed: evaluation report with "Start Tuesday" on the host', sP && /eval/.test(sP.kind) && sP.btns.some(b => /Start Tuesday/.test(b)), sP);
  mp.check('passed: Bob waits for the host', sPB && /eval/.test(sPB.kind) && sPB.wait, sPB);
  await clearToasts();
  await B.shot('r05-bob-evaluation');
  await A.eval(() => { [...document.querySelectorAll('.rv-sheet .rv-btn')].find(b => /Start Tuesday/.test(b.textContent)).click(); return true; });
  for (const p of all) await mp.waitFor(p, () => G.phase === 'day' && G.day === 2 && !Review.on, 10000);
  const q2 = await A.eval(() => G.quota);
  for (const p of all) mp.check('Tuesday on ' + p.name + ' with the host\'s quota', (await p.eval(() => [G.day, G.quota, G.team].join())) === [2, q2, 0].join());
};
