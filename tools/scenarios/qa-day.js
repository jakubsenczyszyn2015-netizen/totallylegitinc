/* QA: a solo work week played like a player. Menu → start a week → walk to a desk → sit (boot screen) →
   calls from several archetypes (form scheme, prize, scambaiter, hang up) → the day ends → review → pass →
   evaluation → Tuesday → ID Verifier → day ends short → fired → termination report → retry → a NosyViewer
   scheme with the PIN step (licence bought in BonkMart) → pause → main menu → the time card shows Tuesday.
   Run: xvfb-run -a -s "-screen 0 1920x1080x24" ./node_modules/.bin/electron --no-sandbox --enable-unsafe-swiftshader tools/harness.js tools/scenarios/qa-day.js 1280x720 <outdir> */
module.exports = async page => {
  const Q = require('./qa-lib')(page);
  const G = () => page.eval(() => { const T = window.__tli; return { phase: T.G.phase, day: T.G.day, team: T.G.team, quota: T.G.quota, personal: T.G.personal, wallet: T.G.wallet, bank: T.G.bank, stats: T.G.stats, seated: T.P.seated }; });

  // ---------- menu → start a week ----------
  await page.eval(() => { const T = window.__tli; T.Saves.week = [null, null, null]; T.Saves.endless = null; writeSaves(); T.UI.menu('home'); return true; });
  await page.shot('day-01-menu');
  Q.check('menu visible', await Q.visible('#menu'));
  await page.eval(() => { window.__dc = null; window.__tli.Bus.on('day:start', () => { window.__dc = document.querySelector('#daycard').classList.contains('on') && document.querySelector('#daycard').textContent; }); return true; });
  await Q.click('#menu .home-btns .btn', /Singleplayer/);
  Q.check('solo screen', await Q.visible('#menu .screen[data-s="solo"].on'));
  await Q.click('#solo-body .tcard .btn.primary', /Start a week/, 700);
  let g = await G();
  Q.check('week started on Monday', g.phase === 'day' && g.day === 1 && g.quota > 0, g);
  Q.check('day card shown', /Monday/.test(await page.eval(() => window.__dc)), await page.eval(() => window.__dc));
  await page.shot('day-02-office-daycard');

  // ---------- walk to a desk and sit ----------
  const desk = await page.eval(() => { const T = window.__tli; const d = T.W.desks.find(x => !x.npc && !T.Game.deskTaken(x.i)); return { i: d.i, x: d.stand.x, z: d.stand.z, rot: d.rot }; });
  await page.teleport(desk.x, desk.z, desk.rot, -0.35);
  await page.wait(400);
  const lab = await page.eval(() => { const T = window.__tli; return T.W.cur && T.W.cur.label(); });
  Q.check('E prompt at the desk', !!lab, lab);
  await page.shot('day-03-desk-prompt');
  await Q.press('KeyE');
  await page.wait(900);
  Q.check('seated after E', (await G()).seated);
  await Q.waitFor(() => window.__tli.OS.open, 10000, 100);
  await page.shot('day-04-boot');
  await Q.desktop();
  const wins = await page.eval(() => [...window.__tli.OS.wins.keys()]);
  Q.check('desktop open with the phone and memo', wins.includes('phone') && wins.includes('memo'), wins);
  await page.shot('day-05-desktop');
  await Q.hush();
  await page.eval(() => { const T = window.__tli; T.OS.close('memo', true); return true; });

  // ---------- call 1: granny, Credit Card (a form scheme) ----------
  const g0 = await G();
  const card = await Q.ringAnswer('granny');
  const full = await page.eval(() => window.__tli.Call.cur && window.__tli.Call.cur.caller.full);
  Q.check('ring card shows the full name with nickname', card && card === full && /"/.test(card), card);
  Q.check('call live after answering on the card', (await Q.state()).st === 'live');
  await page.eval(() => { window.__tli.Call.setScheme('card'); return true; });
  let r = await Q.play();
  await page.shot('day-06-card-paid');
  const paid = await page.eval(() => window.__tli.Call.cur && window.__tli.Call.cur.paid);
  g = await G();
  Q.check('card scheme paid', r.res === 'paid', r);
  Q.check('money maths: personal / team / wallet', g.personal === g0.personal + paid && g.team === g0.team + paid && g.wallet === g0.wallet + Math.round(paid * 0.5), { paid, g0: [g0.personal, g0.team, g0.wallet], g: [g.personal, g.team, g.wallet] });
  await page.wait(3000);   // the call ends, the phone goes idle
  Q.check('call ended → idle', ['ended', 'idle'].includes((await Q.state()).st));
  await Q.hush();

  // ---------- call 2: crypto bro, Prize Winner ----------
  await Q.ringAnswer('crypto');
  await page.eval(() => { window.__tli.Call.setScheme('prize'); return true; });
  r = await Q.play();
  Q.check('prize scheme paid', r.res === 'paid', r);
  await page.wait(2600); await Q.hush();

  // ---------- call 3: a scambaiter ----------
  const before = await G();
  await Q.ringAnswer(null, true);
  Q.check('baiter flagged as baiter', await page.eval(() => window.__tli.Call.cur.caller.baiter));
  await page.eval(() => { window.__tli.Call.setScheme('gift'); return true; });
  r = await Q.play();
  await page.wait(1600);
  await page.shot('day-07-baited');
  g = await G();
  const pops = await page.eval(() => window.__tli.OS.popups);
  Q.check('baited result', (await page.eval(() => window.__tli.Call.cur && window.__tli.Call.cur.result)) === 'baited', r);
  Q.check('baited costs money', g.personal === before.personal - Math.min(100, before.personal) && g.stats.baited === before.stats.baited + 1, { before: before.personal, after: g.personal });
  Q.check('baited opens a pop-up storm', pops > 0, pops);
  await page.wait(2800);
  await page.eval(() => window.__tli.OS.clearPopups());
  await Q.hush();

  // ---------- call 4: hang up on a gym bro ----------
  await Q.ringAnswer('gym');
  await page.say('Hello there, how are you today?');
  await Q.click('.ph-hang', null, 400);
  r = await Q.state();
  Q.check('hang up ends the call (you)', r.st === 'ended' && r.res === 'you', r);
  await page.wait(500);
  // declining a call from the ring card
  await page.eval(() => { const T = window.__tli; T.Call.ring(false, 'chef'); T.Call.ringLeft = 60; return true; });
  await page.wait(400);
  await Q.click('#os-modal .ringcard .rb.no', null, 400);
  Q.check('decline from the card', (await Q.state()).st === 'idle');
  await Q.hush();

  // ---------- the day ends → review → pass ----------
  g = await G();
  Q.check('quota met before the review', g.team >= g.quota, [g.team, g.quota]);
  await page.eval(() => { window.__tli.G.timeLeft = 0.5; return true; });
  await Q.waitFor(() => window.__tli.G.phase === 'review' && Review.on, 5000);
  await page.wait(1500);
  const mood0 = await page.eval(() => Avatars.tmood);
  Q.check('no verdict face before the verdict', mood0 !== 'happy' && mood0 !== 'surprised', mood0);
  Q.check('desktop closed for the review', !(await page.eval(() => window.__tli.OS.open)));
  await page.shot('day-08-review-title');
  const marks = await page.eval(() => Review.state.marks);
  await page.eval(t => { Review.seek(t + 1.5); return true; }, marks.calls); await page.wait(900);
  await page.shot('day-09-review-calls');
  await page.eval(t => { Review.seek(t - 0.2); return true; }, marks.verdict); await page.wait(300);
  Q.check('still no verdict face just before the verdict', !['happy', 'surprised'].includes(await page.eval(() => Avatars.tmood)));
  await page.eval(t => { Review.seek(t + 1.5); return true; }, marks.verdict); await page.wait(900);
  Q.check('happy face on the passed verdict', (await page.eval(() => Avatars.tmood)) === 'happy');
  await page.shot('day-10-review-verdict-pass');
  await page.eval(t => { Review.seek(t + 0.5); return true; }, marks.sheet); await page.wait(1200);
  Q.check('evaluation sheet', (await page.eval(() => Review.state.sheet)) === 'eval');
  await page.shot('day-11-evaluation');
  Q.check('saved after the pass (day 2)', (await page.eval(() => window.__tli.Saves.week[0] && window.__tli.Saves.week[0].day)) === 2);
  await Q.click('.rv-sheet .rv-btn.primary', /Start/, 1200);
  g = await G();
  Q.check('Tuesday started', g.phase === 'day' && g.day === 2 && g.team === 0 && g.personal === 0, g);
  const left = await page.eval(() => ({ review: !document.querySelector('#review').classList.contains('hidden'), rv: Review.on, P: window.__tli.P.review, tint: document.querySelector('#fx-tint') ? getComputedStyle(document.querySelector('#fx-tint')).opacity : null }));
  Q.check('review cleaned up on the next day', !left.review && !left.rv && left.P < 0, left);

  // ---------- Tuesday: ID Verifier, then the day ends short ----------
  await Q.sit();
  await Q.hush(); await page.eval(() => { window.__tli.OS.close('memo', true); return true; });
  Q.check('idv unlocked on Tuesday', await page.eval(() => window.__tli.Game.unlocked().some(s => s.id === 'idv')));
  await Q.ringAnswer('astro');
  await page.eval(() => { window.__tli.Call.setScheme('idv'); return true; });
  r = await Q.play();
  Q.check('ID Verifier paid', r.res === 'paid', r);
  await page.shot('day-12-idv-paid');
  await page.wait(2600); await Q.hush();
  g = await G();
  Q.check('quota not met yet', g.team < g.quota, [g.team, g.quota]);
  await page.eval(() => { window.__tli.G.timeLeft = 0.5; return true; });
  await Q.waitFor(() => window.__tli.G.phase === 'review' && Review.on, 5000);
  const m2 = await page.eval(() => Review.state.marks);
  await page.eval(t => { Review.seek(t + 2.5); return true; }, m2.verdict); await page.wait(1200);
  Q.check('fired: room on fire, surprised face', (await page.eval(() => Review.state.fired)) && (await page.eval(() => Avatars.tmood)) === 'surprised');
  await page.shot('day-13-fired');
  await page.eval(t => { Review.seek(t + 0.5); return true; }, m2.sheet); await page.wait(1200);
  Q.check('termination report', (await page.eval(() => Review.state.sheet)) === 'fired');
  await page.shot('day-14-termination');
  Q.check('a failed day is not saved', (await page.eval(() => window.__tli.Saves.week[0].day)) === 2);
  await Q.click('.rv-sheet .rv-btn.primary', /again/, 1200);
  g = await G();
  Q.check('retry restarts Tuesday', g.phase === 'day' && g.day === 2 && g.team === 0, g);
  const fx = await page.eval(() => ({ fires: FX._fires ? FX._fires.length : null, tint: (document.querySelector('.fx-tint') || {}).style ? document.querySelector('.fx-tint').style.opacity : null }));
  Q.log('after retry fx', fx);

  // ---------- licence for Tech Support (NosyViewer + PIN) ----------
  await Q.sit();
  await Q.hush(); await page.eval(() => { window.__tli.OS.close('memo', true); return true; });
  await page.eval(() => { window.__tli.Game.addWallet(2000); return true; });
  const w0 = await page.eval(() => window.__tli.G.wallet);
  const bought = await page.eval(() => BonkMart.buy('lic_support'));
  const w1 = await page.eval(() => window.__tli.G.wallet);
  Q.check('licence bought', bought && w1 < w0 && (await page.eval(() => window.__tli.Game.unlocked().some(s => s.id === 'support'))), [w0, w1]);
  Q.check('licensed scheme has a desktop icon', await page.eval(() => !!document.querySelector('#os-icons [data-id="sch_support"], #os-icons .ic[data-app="sch_support"]') || [...document.querySelectorAll('#os-icons *')].some(e => /Tech Support/.test(e.textContent))));
  await Q.ringAnswer('tinfoil');
  await page.eval(() => { const T = window.__tli; T.Call.setScheme('support'); T.Call.cur.trust = Math.max(T.Call.cur.trust, 70); return true; });
  r = await Q.play(24);
  const flow = await page.eval(() => { const c = window.__tli.Call.cur; return c && { code: c.codeGiven, remote: c.remote, res: c.result }; });
  Q.check('NosyViewer code read out and connected', flow && flow.code && flow.remote, flow);
  Q.check('Tech Support paid (PIN step done)', r.res === 'paid', r);
  await page.shot('day-15-support-paid');
  await page.wait(2600);

  // ---------- pause → main menu ----------
  await page.eval(() => { const T = window.__tli; T.Game.pause(true); return true; });
  await page.wait(300);
  Q.check('pause menu', await Q.visible('#pause'));
  await page.shot('day-16-pause');
  await Q.click('#pause .btn.danger', /Quit/, 800);
  g = await G();
  const menuState = await page.eval(() => ({ menu: !document.querySelector('#menu').classList.contains('hidden'), os: window.__tli.OS.open, wins: window.__tli.OS.wins.size, hud: !document.querySelector('#hud').classList.contains('hidden'), call: window.__tli.Call.state }));
  Q.check('back on the main menu, clean', g.phase === 'menu' && menuState.menu && !menuState.os && !menuState.wins && !menuState.hud && menuState.call === 'off', menuState);
  await Q.click('#menu .home-btns .btn', /Singleplayer/);
  const tc = await page.eval(() => document.querySelector('#solo-body .tcard').textContent);
  Q.check('time card shows Tuesday', /Next: Tuesday/.test(tc), tc);
  await page.shot('day-17-timecard');
  await Q.done();
};
