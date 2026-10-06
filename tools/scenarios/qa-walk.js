/* QA: the walking game. Walking with real key events (and walls), sprinting, jumping, third person, punching a
   coworker and The Boss, paper balls into a bin, picking up / carrying / throwing / dropping a box, coffee, water
   cooler, vending machine, the main door and the boss door, the break room, the boss office, frame times.
   Run: xvfb-run -a -s "-screen 0 1920x1080x24" ./node_modules/.bin/electron --no-sandbox --enable-unsafe-swiftshader tools/harness.js tools/scenarios/qa-walk.js 1280x720 <outdir> */
module.exports = async page => {
  const Q = require('./qa-lib')(page);
  await page.eval(() => { const T = window.__tli; T.Saves.week = [null, null, null]; writeSaves(); return true; });
  await page.startSolo('week');
  await page.eval(() => { const T = window.__tli; T.G.timeLeft = 1e5; window.__bub = []; window.__toasts = []; const ot = window.toast; window.toast = function (m) { window.__toasts.push(String(m)); return ot.apply(this, arguments); }; const ob = FX.bubble; FX.bubble = function (t, txt, s) { window.__bub.push(txt); return ob.apply(this, arguments); }; window.__bins = 0; T.Bus.on('prop:bin', () => window.__bins++); return true; });
  await Q.fast(true);   // game logic at full speed; screenshots still draw
  const P = () => page.eval(() => { const P = window.__tli.P; return { x: +P.pos.x.toFixed(2), y: +P.pos.y.toFixed(2), z: +P.pos.z.toFixed(2), yaw: +P.yaw.toFixed(2), speed: +(P.speed || 0).toFixed(2), boost: P.boost, third: P.third, stun: P.stunT }; });
  /* stand `dist` metres from a point and look at it */
  const face = (x, y, z, dist = 1.3, side = 0) => page.eval((x, y, z, dist, side) => {
    const T = window.__tli, P = T.P; let best = null;
    for (let a = side; a < side + 6.28; a += 0.2) { const px = x + Math.cos(a) * dist, pz = z + Math.sin(a) * dist; if (!blocked(px, pz)) { best = [px, pz]; break; } }
    if (!best) return null; P.pos.x = best[0]; P.pos.z = best[1]; P.pos.y = 0; P.vx = P.vz = 0;
    const l = lookAngles({ x: best[0], y: P.eye, z: best[1] }, { x, y, z }); P.yaw = l.yaw; P.pitch = l.pitch; return best;
  }, x, y, z, dist, side);
  const label = () => page.eval(() => { const T = window.__tli; return T.W.cur ? T.W.cur.label() : null; });

  // ---------- walking with real key events ----------
  let p0 = await P();
  await page.eval(() => { const P = window.__tli.P; P.yaw = Math.PI / 2; P.pitch = 0; return true; });   // face west, down the floor
  await page.eval(() => { window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', key: 'w' })); return true; });
  await Q.gw(0.9);
  const mid = await P();
  await page.eval(() => { window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW', key: 'w' })); return true; });
  await Q.gw(0.5);
  let p1 = await P();
  Q.check('W walks forward', p1.x < p0.x - 0.8, [p0, p1]);
  Q.check('walk speed sane', mid.speed > 2 && mid.speed < 4.5, mid.speed);
  Q.check('stops when the key is released', p1.speed < 0.3, p1.speed);
  await Q.shot('walk-01-floor');
  // sprint
  await page.eval(() => { const K = window.__tli.Keys; K.ShiftLeft = true; K.KeyW = true; return true; });
  await Q.gw(0.8);
  const sp = await P();
  await page.eval(() => { const K = window.__tli.Keys; K.ShiftLeft = false; K.KeyW = false; return true; });
  Q.check('sprint is faster', sp.speed > 4.5, sp.speed);
  // walls: walk into the west wall
  await page.teleport(-10.8, 0.1, Math.PI / 2, 0);
  await Q.hold('KeyW', 1.2);
  p1 = await P();
  Q.check('the outer wall stops you', p1.x >= -11.65, p1);
  // jump
  await page.teleport(8, 0, Math.PI / 2, 0);
  await page.eval(() => { window.__tli.Keys.Space = true; return true; });
  await Q.gw(0.15);
  const jy = await page.eval(() => window.__tli.P.pos.y);
  await page.eval(() => { window.__tli.Keys.Space = false; return true; });
  await Q.gw(1.2);
  Q.check('Space jumps and lands', jy > 0.1 && (await P()).y === 0, jy);

  // ---------- third person ----------
  await Q.press('KeyC');
  await Q.gw(0.9);
  const th = await page.eval(() => ({ third: window.__tli.P.third, vis: window.__tli.W.me.group.visible, boom: window.__tli.P.boom }));
  Q.check('C toggles third person and shows your avatar', th.third && th.vis, th);
  await Q.hold('KeyW', 0.5);
  await Q.gw(0.4);
  await Q.shot('walk-02-third-person');
  await Q.press('KeyC');
  await page.wait(300);
  Q.check('C again: first person', !(await page.eval(() => window.__tli.P.third)));

  // ---------- punch a coworker ----------
  const npc = await page.eval(() => { const T = window.__tli, n = T.W.npcs.find(n => n.group.visible); if (!n) return null; const p = n.group.position; return { x: p.x, z: p.z, i: T.W.npcs.indexOf(n) }; });
  if (npc) {
    const at = await face(npc.x, 1.2, npc.z, 1.0);
    await page.wait(200);
    await page.eval(() => { window.__bub.length = 0; Props.punch(); return true; });
    await Q.gw(0.4);
    const bub = await page.eval(() => window.__bub.slice());
    Q.check('punching a coworker gets a reaction', bub.length > 0, { at, bub });
    await Q.shot('walk-03-punch-npc');
    await Q.gw(0.6);
    await page.eval(() => { window.__bub.length = 0; Props.punch(); return true; });   // 2nd
    await Q.gw(0.7);
    await page.eval(() => { window.__bub.length = 0; Props.punch(); return true; });   // 3rd = slap
    await Q.gw(0.4);
    Q.check('third hit is a slap with a reaction', (await page.eval(() => window.__bub.length)) > 0);
  } else Q.check('there are coworkers', false);

  // ---------- paper balls into a bin ----------
  const bin = await page.eval(() => window.__tli.W.bins[0]);
  await page.eval(b => { window.__bins = 0; Props.spawn('paper', [b.x, 1.1, b.z], [0, -0.5, 0], { local: true }); return true; }, bin);
  await Q.gw(1.5);
  Q.check('a paper ball dropped in a bin scores', (await page.eval(() => window.__bins)) > 0);
  // a real throw from 1.6 m: search a pitch that lands it in the bin
  const hit = await page.eval(async b => {
    const T = window.__tli, P = T.P; Props.select(0);
    for (let k = 0; k < 14; k++) {
      let sp = null; for (let a = 0; a < 6.28; a += 0.3) { const px = b.x + Math.cos(a) * 1.6, pz = b.z + Math.sin(a) * 1.6; if (!blocked(px, pz)) { sp = [px, pz]; break; } }
      P.pos.x = sp[0]; P.pos.z = sp[1]; P.vx = P.vz = 0; const l = lookAngles({ x: sp[0], y: P.eye, z: sp[1] }, { x: b.x, y: 0.4, z: b.z }); P.yaw = l.yaw; P.pitch = l.pitch - 0.05 - k * 0.04;
      const n0 = window.__bins; Props.throwT = 0; Props.throwSel(); const t0 = T.W.t, e = Date.now() + 30000; while (T.W.t - t0 < 1.4 && Date.now() < e) await new Promise(r => setTimeout(r, 30));
      if (window.__bins > n0) return { k, pitch: P.pitch };
    }
    return null;
  }, bin);
  Q.check('a real throw (aimed with the crosshair) can land in the bin', !!hit, hit);
  await Q.shot('walk-04-bin');

  // ---------- pick up a box, carry, throw, drop ----------
  const box = await page.eval(() => { const b = Props.bodies.find(b => b.type === 'box'); return b ? { id: b.id, x: b.pos.x, y: b.pos.y, z: b.pos.z } : null; });
  if (box) {
    await face(box.x, box.y, box.z, 1.1);
    await page.wait(300);
    const lb = await label();
    await Q.press('KeyE');
    await page.wait(300);
    const carry = await page.eval(() => Props.carry && Props.carry.type);
    Q.check('E picks up the box', carry === 'box', { lb, carry });
    await Q.shot('walk-05-carry-box');
    await page.eval(() => { const P = window.__tli.P; P.pitch = 0.1; Props.throwT = 0; return true; });
    await Q.press('KeyF');
    await Q.gw(1.5);
    const thrown = await page.eval(id => { const b = Props.byId.get(id); return { carry: !!Props.carry, b: b ? [+b.pos.x.toFixed(1), +b.pos.z.toFixed(1)] : null }; }, box.id);
    Q.check('F throws it', !thrown.carry && thrown.b, thrown);
    const b2 = await page.eval(id => { const b = Props.byId.get(id); return b && { x: b.pos.x, y: b.pos.y, z: b.pos.z }; }, box.id);
    if (b2) {   // the box may have landed by a desk: E there would sit down, so only press E on a "Pick up" prompt
      await face(b2.x, b2.y, b2.z, 1.1); await Q.gw(0.2);
      if (/Pick up/.test((await label()) || '')) await Q.press('KeyE'); else await page.eval(id => { Props.pickup(Props.byId.get(id)); return true; }, box.id);
      await Q.gw(0.2); Q.check('carrying it again', !!(await page.eval(() => Props.carry))); await Q.press('KeyG'); await Q.gw(0.8);
    }
    Q.check('G drops it', !(await page.eval(() => Props.carry)));
  } else Q.check('there is a box on the floor', false);

  // ---------- coffee, water, vending, copier ----------
  const inter = await page.eval(() => window.__tli.W.interact.filter(i => !i.desk && !i.prop).map(i => ({ x: i.pos.x, y: i.pos.y, z: i.pos.z, l: i.label() })));
  Q.log('interactables', inter.map(i => i.l + '@' + i.x.toFixed(1) + ',' + i.z.toFixed(1)).join(' | '));
  for (const want of ['Drink coffee', 'Get some water', 'Buy a snack', 'Use the copier']) {
    const it = inter.find(i => i.l === want);
    if (!it) { Q.check('interactable "' + want + '" exists', false); continue; }
    await face(it.x, it.y, it.z, 1.0);
    await Q.gw(0.2);
    const lb = await label();
    const t0 = await page.eval(() => window.__toasts.length);
    await Q.press('KeyE');
    await Q.gw(0.2);
    const t1 = await page.eval(() => window.__toasts.length);
    Q.check('E: ' + want, lb === want && t1 > t0, { lb });
    if (want === 'Drink coffee') { Q.check('coffee gives a speed boost', (await P()).boost > 30); await Q.shot('walk-06-break-room-coffee'); }
  }
  // the boost makes you faster
  await page.teleport(8, 0, Math.PI / 2, 0);
  await page.eval(() => { window.__tli.Keys.KeyW = true; return true; });
  await Q.gw(0.7);
  const bs = await P();
  await page.eval(() => { window.__tli.Keys.KeyW = false; return true; });
  Q.check('caffeinated walk is faster', bs.speed > 3.6, bs.speed);
  Q.check('HUD shows the caffeine chip', await page.eval(() => /Caffeinated/.test(document.querySelector('#hud-left').textContent)));

  // ---------- doors ----------
  for (const [id, at] of [['boss', [17, 1.1, 1.8]], ['main', [19.6, 1.1, 0]]]) {
    const d0 = await page.eval(id => window.__tli.W.doors[id].isOpen, id);
    await face(at[0], at[1], at[2], 1.1, id === 'main' ? Math.PI : -Math.PI / 2);
    await Q.gw(0.2);
    const lb = await label();
    await Q.press('KeyE');
    await Q.gw(0.9);
    const d1 = await page.eval(id => window.__tli.W.doors[id].isOpen, id);
    Q.check('E toggles the ' + id + ' door', /door/.test(lb || '') && d1 !== d0, { lb, d0, d1 });
    if (id === 'main') await Q.shot('walk-07-main-door');
  }
  // walk through the open boss door into the boss office
  const boss = await page.eval(() => { const T = window.__tli; if (!T.W.doors.boss.isOpen) T.W.doors.boss.open(); const r = T.W.rooms.boss, g = T.W.boss.group.position; return { r, x: g.x, z: g.z }; });
  await page.teleport(17, 0.4, Math.PI, 0);
  await Q.hold('KeyW', 1.4);
  const inBoss = await page.eval(() => { const T = window.__tli, r = T.W.rooms.boss, p = T.P.pos; return p.x > r.x0 && p.x < r.x1 && p.z > r.z0 && p.z < r.z1; });
  Q.check('walk through the boss door into the office', inBoss, await P());
  await face(boss.x, 1.4, boss.z, 1.0);
  await Q.gw(0.6);
  await page.eval(() => { window.__bub.length = 0; Props.punch(); return true; });
  await Q.gw(0.4);
  const bb = await page.eval(() => window.__bub.slice());
  Q.check('punching The Boss gets a reaction', bb.length > 0, bb);
  await Q.shot('walk-08-boss-office');
  // break room overview
  const br = await page.eval(() => window.__tli.W.rooms.break);
  await page.teleport(br.x0 + 0.8, (br.z0 + br.z1) / 2, -Math.PI / 2 - 0.4, -0.15);
  await Q.gw(0.3);
  await Q.shot('walk-09-break-room');

  // ---------- frame times on the busy floor ----------
  await Q.fast(false);
  await page.teleport(8, 0, Math.PI / 2, -0.05);
  const ft = await page.eval(() => new Promise(r => { const ts = []; let last = performance.now(); const f = () => { const t = performance.now(); ts.push(t - last); last = t; if (ts.length < 60) requestAnimationFrame(f); else { ts.sort((a, b) => a - b); r({ median: Math.round(ts[30]), p95: Math.round(ts[56]), calls: window.__tli.W.renderer.info.render.calls, tris: window.__tli.W.renderer.info.render.triangles }); } }; requestAnimationFrame(f); }));
  Q.log('frame times on the floor (software GL, shared CPU)', ft);
  Q.check('draw calls reasonable', ft.calls < 400, ft);
  await Q.done();
};
