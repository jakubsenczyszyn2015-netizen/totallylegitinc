/* Multiplayer guards: a misbehaving client (Bob) sends junk through every registered Net message type, a host-only
   decision (a police raid), absurd positions and a huge per-player extra. The host and the other client (Cara) must keep
   running without errors, ignore what is not theirs to decide and clamp what they keep.
   Run: tools/harness-mp.js tools/scenarios/mp-guards.js 3 1280x720 <outdir> */
module.exports = async mp => {
  const [A, B, C] = mp.pages;
  await mp.host('week', 0); await mp.join(B); await mp.join(C);
  await mp.startShift();
  const idB = await B.id();
  const types = await B.eval(() => [...Net.handlers.keys()]);
  mp.check('handlers registered', types.length > 15, types.length);

  // ---- a host-only decision from a client is ignored by the others
  await B.eval(() => { Net.emit('raid:go', { n: 1, k: 6, s: 7 }); Net.emit('raid:arrest', { id: Net.players.keys().next().value, c: 0 }); return true; });
  await mp.wait(800);
  mp.check('a client cannot start a police raid for everyone', !(await C.eval(() => Raid.on)) && !(await A.eval(() => Raid.on)));
  mp.check('a client cannot arrest the host', !(await A.eval(() => !!Raid.bust)));

  // ---- junk through every message type, to everyone and to the host only
  const tW0 = await A.eval(() => W.t), tC0 = await C.eval(() => W.t);
  await B.eval(() => { window.__tick = Net.tick; Net.tick = () => {}; return true; });   // Bob stops sending his real position for a moment
  await mp.wait(300);
  await B.eval(types => {
    const big = 'x'.repeat(5000);
    const junk = [null, 0, -1, 5e14 + 0.5, 'x', true, [], {}, [NaN, -NaN, 'a'],
      { id: 'q'.repeat(300), p: [NaN, -NaN, 5], o: [NaN, 0, 0], v: [NaN, 0, 0], s: [123456789.5, 123456789.5, 123456789.5], d: [123456789.5, 123456789.5], f: 123456789.5, n: -1, c: 99, k: 'constructor', a: 'dance',
        t: big, text: big, img: 'data:image/jpeg;base64,AAAA', pos: [NaN, 2], desk: 123456789.5, pts: [[123456789.5, 123456789.5, 123456789.5], 'z'], i: big, by: big, name: big, amt: 'lots', kb: ['a', 123456789.5], ok: 1, o2: { loop: true, dur: 123456789.5 } },
      { id: 'ok1', k: 'm', text: 'hi', p: [0, 0.5, 0], t: 'paper', o: [0, 1, 0], v: [0, 0, 0], d: 3, n: 0 }];
    for (const k of types) for (const j of junk) { Net.emit(k, j); Net.emit(k, j, { host: true }); }
    // raw messages: absurd position, huge extras, a broken AI relay request
    Net.hostConn.send({ t: 'pos', name: big, color: 'url(evil)', x: 5e14 + 0.5, y: -5e14 + 0.5, z: 'abc', ry: 123456789.5, seat: 123456789.5, personal: 5e14 + 0.5, ext: { look: big, held: { i: 'prop:box', u: 1, p: 123456789.5 }, junk: big + big, mood: 5 } });
    Net.hostConn.send({ t: 'ai', rid: 1, messages: [null, 5, { role: 'evil', content: big }] });
    Net.hostConn.send({ t: 'throw', o: [5e14 + 0.5, 'a', null], v: [5e14 + 0.5, 5e14 + 0.5, 5e14 + 0.5] });
    Net.hostConn.send({ t: 'x', k: 'chat', p: { k: 'm', text: 'to nobody' }, to: 'nobody' });
    Net.hostConn.send('junk'); Net.hostConn.send({ t: 'x', k: 5 });   // (a bare null crashes inside PeerJS's own receive code on the host: not ours to fix, harmless)
    return true;
  }, types);
  await mp.wait(2500);
  const pA = await A.eval(id => { const p = Net.players.get(id); return p && { x: p.x, y: p.y, z: p.z, seat: p.seat, personal: p.personal, color: p.color, name: p.name.length, ext: Object.keys(p.ext || {}), look: p.ext && p.ext.look && p.ext.look.length }; }, idB);
  mp.check('host keeps sane numbers for Bob', pA && [pA.x, pA.y, pA.z, pA.personal].every(Number.isFinite) && Math.abs(pA.x) <= 200 && pA.color === '#3b82f6' && pA.name <= 18, pA);
  mp.check('host keeps only registered extras, capped', pA && !pA.ext.includes('junk') && pA.look <= 160, pA);
  await B.eval(() => { Net.tick = window.__tick; return true; });
  await mp.wait(800);   // Bob's own position messages put him back to normal
  mp.check('host frame loop still running', (await A.eval(() => W.t)) > tW0 + 1);
  mp.check('Cara frame loop still running', (await C.eval(() => W.t)) > tC0 + 1);
  mp.check('Cara still sees Bob at a sane spot', await C.eval(id => { const a = W.avatars.get(id); return !!a && Number.isFinite(a.av.group.position.x) && Math.abs(a.av.group.position.x) < 200; }, idB));
  mp.check('Cara has no police raid', !(await C.eval(() => Raid.on)));
  mp.check('props stay finite on the host', await A.eval(() => Props.bodies.every(b => Number.isFinite(b.pos.x) && Number.isFinite(b.pos.y) && Number.isFinite(b.pos.z))));
  mp.check('props stay finite on Cara', await C.eval(() => Props.bodies.every(b => Number.isFinite(b.pos.x) && Number.isFinite(b.pos.y) && Number.isFinite(b.pos.z))));
  // the game still works after all that: Bob earns, everyone sees it
  const t0 = await A.eval(() => G.team);
  await B.eval(() => { Game.earn(100); return true; });
  await mp.wait(800);
  mp.check('money still syncs afterwards', (await C.eval(() => G.team)) === t0 + 100, { before: t0, cara: await C.eval(() => G.team) });
  await A.teleport(4.5, 0, Math.PI / 2, 0.05);
  await A.shot('g01-host-after-junk');
  // Bob's own console may complain about his own junk; only the host's and Cara's matter here
  B.errors.length = 0;
};
