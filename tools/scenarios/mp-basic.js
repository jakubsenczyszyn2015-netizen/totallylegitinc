/* Multiplayer basics: host + 1-2 clients, lobby -> shift, remote avatars (look, name tag, walk, sit, talking), desks taken,
   desk screens, money (team total, quota, toasts, leaderboard wall, Payroll ranks).
   Run: tools/harness-mp.js tools/scenarios/mp-basic.js 3 1280x720 <outdir>   (2 players works too) */
module.exports = async mp => {
  const [A, B] = mp.pages, C = mp.pages[2];
  // Bob talks with an open mic (the rig's fake microphone beeps), so the voice mesh and the talking indicator run too
  await B.eval(() => { settings.micMode = 'open'; return true; });
  await mp.host('week', 0);
  await mp.join(B); if (C) await mp.join(C);
  const ids = {}; for (const p of mp.pages) ids[p.name] = await p.id();
  mp.check('lobby: client sees host in Net.players', await B.eval(id => Net.players.has(id), ids.Alice));
  mp.check('lobby: client phase is lobby', (await B.eval(() => G.phase)) === 'lobby');
  await mp.wait(400);
  mp.check('lobby: client HUD says waiting for the host', /Waiting for the host/.test(await B.eval(() => document.getElementById('hud-left').textContent)));
  // spawn spots: nobody spawns inside somebody else
  const sp = []; for (const p of mp.pages) sp.push(await p.eval(() => [P.pos.x, P.pos.z]));
  let minD = 99; for (let i = 0; i < sp.length; i++) for (let j = i + 1; j < sp.length; j++) minD = Math.min(minD, Math.hypot(sp[i][0] - sp[j][0], sp[i][1] - sp[j][1]));
  mp.check('spawn spots are apart', minD > 0.5, minD.toFixed(2));
  await mp.startShift();
  const hostG = (await A.eval(() => [G.phase, G.day, G.quota])).join();
  for (const p of mp.pages) mp.check('day start reaches ' + p.name, (await p.eval(() => [G.phase, G.day, G.quota])).join() === hostG, hostG);
  mp.check('quota scales with the team size', await A.eval(n => G.quota === Game.quotaFor(G.day, n), mp.pages.length));
  // remote avatars: look + name tag
  await mp.wait(600);
  const av = await A.eval(id => { const a = W.avatars.get(id); return a && { name: a.name, lk: a.lk, vis: a.av.group.visible, inScene: !!a.av.group.parent, tag: a.av.tag && a.av.tag.visible }; }, ids.Bob);
  const bobLook = await B.eval(() => packLook(avMyLook()));
  mp.check('host sees Bob avatar with a name tag', av && av.inScene && av.name === 'Bob' && av.tag, av);
  mp.check('Bob avatar has his own look', av && av.lk === bobLook, { remote: av && av.lk, own: bobLook });
  const av2 = await B.eval(id => { const a = W.avatars.get(id); return a && { name: a.name, lk: a.lk }; }, ids.Alice);
  mp.check('Bob sees Alice avatar with her look', av2 && av2.name === 'Alice' && av2.lk === await A.eval(() => packLook(avMyLook())), av2);
  if (C) mp.check('Cara sees both teammates', await C.eval((a, b) => W.avatars.has(a) && W.avatars.has(b) && W.avatars.size === 2, ids.Alice, ids.Bob));
  // talking indicator: Bob's open mic beeps -> the host sees him talking
  await A.eval(id => { window.__sawTalk = false; Loop.add(() => { const a = W.avatars.get(id); if (a && a.talk && a.av.talk.visible) window.__sawTalk = true; }); return true; }, ids.Bob);
  const talk = await mp.waitFor(A, () => window.__sawTalk, 6000).catch(() => false);
  mp.check('host sees Bob talking (voice indicator)', talk);
  mp.check('voice mesh connected host <-> Bob', await A.eval(id => Voice.nodes.has(id), ids.Bob));
  // walking: put Bob in front of Alice, Alice looks at him
  await A.teleport(4.5, 0, Math.PI / 2, 0);   // the main aisle (z = 0) has nothing to bump into
  await B.teleport(-1.5, 0, -Math.PI / 2, 0);
  await B.key('KeyW', 500);
  await mp.wait(400);
  const pos = await A.eval(id => { const a = W.avatars.get(id); return a && [+a.av.group.position.x.toFixed(2), +a.av.group.position.z.toFixed(2)]; }, ids.Bob);
  const bpos = await B.eval(() => [+P.pos.x.toFixed(2), +P.pos.z.toFixed(2)]);
  mp.check('Bob position synced on host', pos && Math.hypot(pos[0] - bpos[0], pos[1] - bpos[1]) < 0.6, { remote: pos, own: bpos });
  await B.eval(() => { Keys.KeyW = true; return true; });
  await mp.wait(350);
  mp.check('host plays Bob walking', await A.eval(id => W.avatars.get(id).speed > 0.5, ids.Bob));
  await A.shot('01-host-sees-bob-walking');
  await B.eval(() => { Keys.KeyW = false; return true; });
  // sitting: Bob sits, desk shows taken on host and his desk screen goes to the desktop
  const desk = await B.sit();
  await mp.wait(700);
  mp.check('desk taken on host', await A.eval(i => Game.deskTaken(i), desk));
  const scr = await A.eval(i => W.deskScreen(i), desk);
  mp.check('Bob desk screen on host is desktop/boot', scr === 'desktop' || scr === 'boot', scr);
  const sitRemote = await A.eval(id => { const a = W.avatars.get(id); return a && a.seat; }, ids.Bob);
  mp.check('host sees Bob seated', sitRemote === desk, sitRemote);
  const d = await A.eval(i => { const d = W.desks[i]; return { x: d.stand.x, z: d.stand.z, rot: d.rot }; }, desk);
  await A.teleport(d.x + Math.sin(d.rot) * 1.6, d.z + Math.cos(d.rot) * 1.6, d.rot, -0.15);
  await mp.wait(500);
  await A.shot('02-host-sees-bob-seated');
  // Alice can't sit at Bob's desk
  await A.eval(i => { sitAt(i); return true; }, desk);
  mp.check('host cannot sit in a taken desk', !(await A.eval(() => P.seated)));
  // ring on Bob's phone shows a ring screen for the host
  await B.ring(false);
  await mp.wait(600);
  mp.check('Bob ringing desk screen on host', (await A.eval(i => W.deskScreen(i), desk)) === 'ring');
  // money: Bob closes a scam via Game.earn
  await B.answer();
  await B.eval(() => { Call.hangUp && Call.hangUp(); return true; }).catch(() => {});
  await A.eval(() => { window.__toasts = []; const o = toast; toast = (m, k) => { window.__toasts.push(typeof m === 'string' ? m : m.textContent); return o(m, k); }; return true; });
  if (C) await C.eval(() => { window.__toasts = []; const o = toast; toast = (m, k) => { window.__toasts.push(typeof m === 'string' ? m : m.textContent); return o(m, k); }; return true; });
  await B.eval(() => { OS.launch('payroll'); Game.earn(250); return true; });
  await mp.wait(800);
  const tA = await A.eval(() => G.team), tB = await B.eval(() => G.team);
  mp.check('team total on host after client earn', tA === 250, tA);
  mp.check('team total on client', tB === 250, tB);
  mp.check('host toast for Bob\'s scam', (await A.eval(() => window.__toasts)).some(t => /Bob closed a scam/.test(t)));
  if (C) {
    mp.check('team total on 3rd player', (await C.eval(() => G.team)) === 250);
    mp.check('3rd player toast for Bob\'s scam', (await C.eval(() => window.__toasts)).some(t => /Bob closed a scam/.test(t)));
  }
  await A.eval(() => { Game.earn(100); return true; });
  await mp.wait(900);
  mp.check('client sees host earn', (await B.eval(() => G.team)) === 350);
  const ros = await B.eval(() => Game.roster());
  mp.check('roster ranks on client', ros[0].name === 'Bob' && ros[0].personal === 250 && ros[1].personal === 100, ros);
  const rosA = await A.eval(() => Game.roster());
  mp.check('roster ranks on host', rosA[0].name === 'Bob' && rosA[0].personal === 250, rosA);
  // Payroll on Bob (opened before the host earned) shows the new ranks without reopening
  const pay = await B.eval(() => { const r = [...document.querySelectorAll('.payroll .pay-row')]; return r.length ? r.map(x => x.textContent) : null; });
  mp.check('Payroll on client lists both ranks', pay && pay.length >= 2 && /Bob/.test(pay[0]) && /Alice/.test(pay[1]) && /\$100/.test(pay[1]), pay);
  // the wall leaderboard redraws on the host
  mp.check('leaderboard on host ranks Bob first', await A.eval(() => { W.leaderboard.update(); return Game.roster()[0].name === 'Bob'; }));
  await B.shot('03-bob-payroll');
  await A.teleport(6.2, -5.4, -Math.PI / 2, 0.05);
  await mp.wait(300);
  await A.shot('04-host-leaderboard');
};
