/* Multiplayer basics: host + 1-2 clients, lobby -> shift, remote avatars (look, name, walk, sit), desks taken,
   desk screens, money (team total, quota, toasts, leaderboard), Payroll ranks.
   Run: tools/harness-mp.js tools/scenarios/mp-basic.js 2 1280x720 <outdir> */
module.exports = async mp => {
  const [A, B] = mp.pages, C = mp.pages[2];
  await mp.host('week', 0);
  await mp.join(B); if (C) await mp.join(C);
  const ids = {}; for (const p of mp.pages) ids[p.name] = await p.id();
  mp.check('lobby: client sees host in Net.players', await B.eval(id => window.__tli.Net.players.has(id), ids.Alice));
  mp.check('lobby: client phase is lobby', (await B.eval(() => window.__tli.G.phase)) === 'lobby');
  await mp.startShift();
  for (const p of mp.pages) mp.check('day start reaches ' + p.name, (await p.eval(() => [window.__tli.G.phase, window.__tli.G.day, window.__tli.G.quota])).join() === (await A.eval(() => [window.__tli.G.phase, window.__tli.G.day, window.__tli.G.quota])).join());
  // remote avatars: the host sees Bob with Bob's look and name
  await mp.wait(600);
  const av = await A.eval(id => { const a = window.__tli.W.avatars.get(id); return a && { name: a.name, lk: a.lk, vis: a.av.group.visible, inScene: !!a.av.group.parent }; }, ids.Bob);
  const bobLook = await B.eval(() => packLook(avMyLook()));
  mp.check('host sees Bob avatar', av && av.inScene && av.name === 'Bob', av);
  mp.check('Bob avatar has his own look', av && av.lk === bobLook, { remote: av && av.lk, own: bobLook });
  const av2 = await B.eval(id => { const a = window.__tli.W.avatars.get(id); return a && { name: a.name, lk: a.lk }; }, ids.Alice);
  mp.check('Bob sees Alice avatar with her look', av2 && av2.name === 'Alice' && av2.lk === await A.eval(() => packLook(avMyLook())), av2);
  // walking: put Bob in front of Alice, Alice looks at him
  await A.teleport(4, 2, Math.PI / 2, 0);
  await B.teleport(1.2, 2, -Math.PI / 2, 0);
  await B.key('KeyW', 500);
  await mp.wait(400);
  const pos = await A.eval(id => { const a = window.__tli.W.avatars.get(id); return a && [+a.av.group.position.x.toFixed(2), +a.av.group.position.z.toFixed(2)]; }, ids.Bob);
  const bpos = await B.eval(() => [+window.__tli.P.pos.x.toFixed(2), +window.__tli.P.pos.z.toFixed(2)]);
  mp.check('Bob position synced on host', pos && Math.hypot(pos[0] - bpos[0], pos[1] - bpos[1]) < 0.6, { remote: pos, own: bpos });
  await B.eval(() => { window.__tli.Keys.KeyW = true; return true; });
  await mp.wait(250);
  await A.shot('01-host-sees-bob-walking');
  await B.eval(() => { window.__tli.Keys.KeyW = false; return true; });
  // sitting: Bob sits, desk shows taken on host and his desk screen goes to the desktop
  const desk = await B.sit();
  await mp.wait(700);
  mp.check('desk taken on host', await A.eval(i => window.__tli.Game.deskTaken(i), desk));
  const scr = await A.eval(i => window.__tli.W.deskScreen(i), desk);
  mp.check('Bob desk screen on host is desktop/boot', scr === 'desktop' || scr === 'boot', scr);
  const sitRemote = await A.eval(id => { const a = window.__tli.W.avatars.get(id); return a && a.seat; }, ids.Bob);
  mp.check('host sees Bob seated', sitRemote === desk, sitRemote);
  const d = await A.eval(i => { const d = window.__tli.W.desks[i]; return { x: d.stand.x, z: d.stand.z, rot: d.rot }; }, desk);
  await A.teleport(d.x + Math.sin(d.rot) * 1.6, d.z + Math.cos(d.rot) * 1.6, d.rot, -0.15);
  await mp.wait(500);
  await A.shot('02-host-sees-bob-seated');
  // Alice can't sit at Bob's desk
  await A.eval(i => { sitAt(i); return true; }, desk);
  mp.check('host cannot sit in a taken desk', !(await A.eval(() => window.__tli.P.seated)));
  // ring on Bob's phone shows a ring screen for the host
  await B.ring(false);
  await mp.wait(600);
  mp.check('Bob ringing desk screen on host', (await A.eval(i => window.__tli.W.deskScreen(i), desk)) === 'ring');
  // money: Bob closes a scam via Game.earn
  await B.answer();
  await B.eval(() => { window.__tli.Call.hangUp && window.__tli.Call.hangUp(); return true; }).catch(() => {});
  await B.eval(() => { window.__tli.Game.earn(250); return true; });
  await mp.wait(800);
  const tA = await A.eval(() => window.__tli.G.team), tB = await B.eval(() => window.__tli.G.team);
  mp.check('team total on host after client earn', tA === 250, tA);
  mp.check('team total on client', tB === 250, tB);
  if (C) mp.check('team total on 3rd player', (await C.eval(() => window.__tli.G.team)) === 250);
  await A.eval(() => { window.__tli.Game.earn(100); return true; });
  await mp.wait(800);
  mp.check('client sees host earn', (await B.eval(() => window.__tli.G.team)) === 350);
  const ros = await B.eval(() => window.__tli.Game.roster());
  mp.check('roster ranks on client', ros[0].name === 'Bob' && ros[0].personal === 250 && ros[1].personal === 100, ros);
  const rosA = await A.eval(() => window.__tli.Game.roster());
  mp.check('roster ranks on host', rosA[0].name === 'Bob' && rosA[0].personal === 250, rosA);
  await A.teleport(0, 0, 0, 0);
  await mp.shotAll('03-after-money');
};
