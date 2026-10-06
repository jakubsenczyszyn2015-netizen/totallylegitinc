/* Multiplayer sessions: a late joiner mid-day catches up with everything (day, clock, team total, avatars, taken desks,
   props on the floor, a photo, a painting, a pizza party, the door), a client quits mid-day and reconnects, a client's
   window dies (the host notices), the host quits (clients return to the menu cleanly) and the host's window dies.
   Starts with 2 players and opens Cara late.  Run: tools/harness-mp.js tools/scenarios/mp-session.js 2 1280x720 <outdir> */
module.exports = async mp => {
  const [A, B] = mp.pages;
  await mp.host('week', 0); await mp.join(B);
  await mp.startShift();
  const ids = { Alice: await A.id(), Bob: await B.id() };
  const hook = p => p.eval(() => { window.__toasts = []; const o = toast; toast = (m, k) => { window.__toasts.push(typeof m === 'string' ? m : m.textContent); return o(m, k); }; return true; });
  await hook(A); await hook(B);
  const toasts = p => p.eval(() => window.__toasts.splice(0));

  // ---- some mid-day state for the late joiner to catch up with
  await B.eval(() => { Game.earn(200); return true; });
  const deskB = await B.sit();
  await A.teleport(4.5, 0, Math.PI / 2, 0.1);
  const ball = await A.eval(() => { Props.select(0); return Props.throwObj('paper').id; });
  const pnt = await A.eval(() => { const c = document.createElement('canvas'); c.width = 64; c.height = 40; const g = c.getContext('2d'); g.fillStyle = '#ffaa00'; g.fillRect(0, 0, 64, 40); return Paintings.hang(c.toDataURL('image/jpeg', 0.8), { title: 'Late' }).id; });
  const photo = await A.eval(() => { Inv.give('polaroid', 5); Props.refreshHeld(); Props.select(Props.slots.indexOf('polaroid')); SnapCam.cool = 0; Props.startUse(); const k = [...Photos.urls.keys()]; return k[k.length - 1]; });
  await A.eval(() => { Chaos.order('pizza'); W.doors.main.toggle(true); return true; });
  await mp.wait(3500);   // the ball and the photo come to rest

  // ---- Cara joins mid-day
  const C = await mp.open('Cara'); await hook(C);
  await mp.join(C); ids.Cara = await C.id();
  await mp.waitFor(C, () => G.phase === 'day', 8000);
  await mp.wait(2500);
  const gA = await A.eval(() => ({ day: G.day, quota: G.quota, team: G.team, t: G.timeLeft })), gC = await C.eval(() => ({ day: G.day, quota: G.quota, team: G.team, t: G.timeLeft, card: document.getElementById('daycard').classList.contains('on') }));
  mp.check('late joiner: same day, quota and team total', gC.day === gA.day && gC.quota === gA.quota && gC.team === gA.team && gA.team === 200, { host: gA, cara: gC });
  mp.check('late joiner: review clock in step', Math.abs(gC.t - gA.t) < 1.5, { host: gA.t, cara: gC.t });
  mp.check('late joiner: sees Alice and Bob', await C.eval((a, b) => W.avatars.has(a) && W.avatars.has(b), ids.Alice, ids.Bob));
  mp.check('late joiner: Bob\'s desk shows as taken', await C.eval(i => Game.deskTaken(i), deskB));
  mp.check('host + Bob see Cara', await A.eval(id => W.avatars.has(id), ids.Cara) && await B.eval(id => W.avatars.has(id), ids.Cara));
  const bA = await A.eval(id => { const b = Props.byId.get(id); return b && [b.pos.x, b.pos.z]; }, ball), bC = await C.eval(id => { const b = Props.byId.get(id); return b && [b.pos.x, b.pos.z]; }, ball);
  mp.check('late joiner: the paper ball lies on the same spot', bA && bC && Math.hypot(bA[0] - bC[0], bA[1] - bC[1]) < 0.3, { host: bA, cara: bC });
  mp.check('late joiner: the painting is hung', await C.eval(id => { const p = Paintings.list.get(id); return !!(p && p.group && p.group.parent); }, pnt));
  const phC = await mp.waitFor(C, id => { const p = Photos.get(id); return p && p.url && p.card ? p.url.length : 0; }, 6000, photo).catch(() => 0);
  mp.check('late joiner: got the photo picture from the host', phC > 1000 && phC === await A.eval(id => Photos.urls.get(id).url.length, photo), phC);
  mp.check('late joiner: pizza party + open door', await C.eval(() => Chaos.st.pizza > 0 && W.doors.main.isOpen));
  mp.check('quota does not jump when someone joins mid-day', (await A.eval(() => G.quota)) === gA.quota);
  await C.teleport(2.0, 0.6, Math.PI / 2, -0.05);
  await mp.wait(300);
  await C.shot('s01-cara-late-join');

  // ---- Bob quits mid-day (menu), then reconnects with the same code
  await B.eval(() => { Game.quit(); return true; });
  const tq = Date.now();
  await mp.waitFor(A, id => !Net.players.has(id), 8000, ids.Bob);
  mp.check('host drops Bob quickly after he quits', Date.now() - tq < 4000, (Date.now() - tq) + ' ms');
  await mp.waitFor(C, id => !W.avatars.has(id), 4000, ids.Bob).catch(() => {});
  mp.check('Cara no longer sees Bob', !(await C.eval(id => W.avatars.has(id), ids.Bob)));
  mp.check('Bob\'s desk is free again', !(await A.eval(i => Game.deskTaken(i), deskB)) && !(await C.eval(i => Game.deskTaken(i), deskB)));
  mp.check('host toast: Bob left', (await toasts(A)).some(t => /Bob left/.test(t)));
  mp.check('Cara told Bob left', (await toasts(C)).some(t => /Bob left/.test(t)));
  mp.check('Bob is back in the menu', await B.eval(() => G.phase === 'menu' && !Net.active && !document.getElementById('menu').classList.contains('hidden') && W.avatars.size === 0));
  mp.check('team total keeps Bob\'s money', (await A.eval(() => G.team)) === 200);
  await mp.join(B); ids.Bob2 = await B.id();
  await mp.waitFor(B, () => G.phase === 'day', 8000);
  await mp.wait(1200);
  mp.check('Bob reconnects into the running day', await B.eval(t => G.phase === 'day' && G.team === t && W.avatars.size === 2, await A.eval(() => G.team)));
  mp.check('everyone sees the reconnected Bob', await A.eval(id => W.avatars.has(id), ids.Bob2) && await C.eval(id => W.avatars.has(id), ids.Bob2));

  // ---- Bob's window dies (no goodbye): the host notices and everyone moves on
  await mp.close(B);
  const tc = Date.now();
  const gone = await mp.waitFor(A, id => !Net.players.has(id), 30000, ids.Bob2).then(() => true, () => false);
  mp.check('host drops a client whose game died', gone, (Date.now() - tc) + ' ms');
  await mp.wait(600);
  mp.check('Cara no longer sees the dead Bob', !(await C.eval(id => W.avatars.has(id), ids.Bob2)));

  // ---- the host quits: Cara returns to the menu cleanly
  await A.eval(() => { Game.quit(); return true; });
  const th = Date.now();
  const back = await mp.waitFor(C, () => G.phase === 'menu', 15000).then(() => true, () => false);
  mp.check('client back in the menu when the host quits', back, (Date.now() - th) + ' ms');
  const cs = await C.eval(() => ({ active: Net.active, menu: !document.getElementById('menu').classList.contains('hidden'), hud: document.getElementById('hud').classList.contains('hidden'), avatars: W.avatars.size, os: OS.open, raid: Raid.on, review: !document.getElementById('review').classList.contains('hidden') ? 'shown' : 'hidden' }));
  mp.check('client menu state is clean', !cs.active && cs.menu && cs.hud && cs.avatars === 0 && !cs.os && !cs.raid && cs.review === 'hidden', cs);
  mp.check('client told the host left', (await toasts(C)).some(t => /host left/i.test(t)));
  await C.shot('s02-cara-host-left');

  // ---- a new room: the host's window dies; the client notices and returns to the menu
  await mp.host('week', 0); await mp.join(C);
  await mp.startShift();
  await C.sit();
  await mp.close(A);
  const td = Date.now();
  const back2 = await mp.waitFor(C, () => G.phase === 'menu', 30000).then(() => true, () => false);
  mp.check('client back in the menu when the host\'s game dies', back2, (Date.now() - td) + ' ms');
  mp.check('client menu state is clean after a host crash', await C.eval(() => !Net.active && !OS.open && !P.seated && W.avatars.size === 0));
};
