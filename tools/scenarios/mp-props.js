/* Multiplayer props / FX / items: paper balls, punches (right victim, knockback, stars), soda spray + soak, fart,
   whoopee cushion, picking up / throwing a box, SnapCam photos, Doodle Pro paintings, chaos goods, stapler, doors.
   Alice hosts, Bob does things, Cara (3rd player, optional) watches.
   Run: tools/harness-mp.js tools/scenarios/mp-props.js 3 1280x720 <outdir> */
module.exports = async mp => {
  const [A, B] = mp.pages, C = mp.pages[2];
  await mp.host('week', 0); await mp.join(B); if (C) await mp.join(C);
  await mp.startShift();
  const ids = {}; for (const p of mp.pages) ids[p.name] = await p.id();
  const all = mp.pages;
  for (const p of all) await p.eval(() => { window.__toasts = []; const o = toast; toast = (m, k) => { window.__toasts.push(typeof m === 'string' ? m : m.textContent); return o(m, k); }; return true; });
  const toasts = p => p.eval(() => window.__toasts.splice(0));
  // line up in the main aisle (z = 0): Alice facing west, Bob 1.3 m in front of her facing east, Cara behind Bob
  await A.teleport(4.5, 0, Math.PI / 2, 0); await B.teleport(3.2, 0, -Math.PI / 2, 0); if (C) await C.teleport(0.6, 0, -Math.PI / 2, -0.05);
  await mp.wait(700);

  // ---- paper ball: Bob throws one, everyone sees the same flight and resting spot
  const nB = await B.eval(() => Props.bodies.length);
  const pid = await B.eval(() => { Props.select(0); const b = Props.throwObj('paper'); return b.id; });
  await mp.wait(300);
  mp.check('host sees Bob\'s paper ball fly', await A.eval(id => !!Props.byId.get(id), pid));
  await mp.wait(2600);
  const restB = await B.eval(id => { const b = Props.byId.get(id); return b && [b.pos.x, b.pos.z, b.rest]; }, pid);
  const restA = await A.eval(id => { const b = Props.byId.get(id); return b && [b.pos.x, b.pos.z, b.rest]; }, pid);
  mp.check('paper ball lands on the same spot for host and thrower', restA && restB && Math.hypot(restA[0] - restB[0], restA[1] - restB[1]) < 0.3, { host: restA, bob: restB });

  // ---- punch: Bob punches Alice -> Alice is knocked back + stunned, Cara sees Alice (not Bob) get hit
  if (C) await C.eval(id => { window.__hitOn = null; const av = W.avatars.get(id).av, o = av.play.bind(av); av.play = (n, op) => { if (n === 'hit') window.__hitOn = 'Alice'; return o(n, op); }; return true; }, ids.Alice);
  if (C) await C.eval(id => { const av = W.avatars.get(id).av, o = av.play.bind(av); av.play = (n, op) => { if (n === 'hit') window.__hitOn = 'Bob'; return o(n, op); }; return true; }, ids.Bob);
  const ax0 = await A.eval(() => P.pos.x);
  await B.eval(() => { Props.punchT = 0; Props.punchN = 0; Props.punch(); return true; });
  await mp.wait(250);
  const hitA = await A.eval(() => ({ stun: P.stunT, kx: P.kx, x: P.pos.x }));
  await mp.wait(400);
  const ax1 = await A.eval(() => P.pos.x);
  mp.check('punch: Alice stunned and knocked back (away from Bob = -x)', hitA.stun > 0 && ax1 < ax0 - 0.15, { hitA, ax0, ax1 });
  mp.check('punch: Alice got the "seeing stars" toast', (await toasts(A)).some(t => /stars|bonked|mark|incident/i.test(t)));
  if (C) mp.check('punch: Cara sees Alice play the hit (right victim)', (await C.eval(() => window.__hitOn)) === 'Alice', await C.eval(() => window.__hitOn));
  if (C) mp.check('punch: Cara sees Bob throw the punch', await C.eval(id => { const a = W.avatars.get(id).av.act; return !!a; }, ids.Bob));
  await A.teleport(4.5, 0, Math.PI / 2, 0);
  await mp.wait(1500);

  // ---- soda spray: Bob sprays Alice -> host sees the stream from Bob's hand and gets soaked
  await B.eval(() => { Inv.give('soda', 1); Props.refreshHeld(); Props.select(Props.slots.indexOf('soda')); P.pitch = -0.05; Props.startUse(); return true; });
  await mp.wait(700);
  const heldA = await A.eval(id => { const p = Net.players.get(id); return p && p.ext && p.ext.held; }, ids.Bob);
  mp.check('host sees Bob holding + using the soda', heldA && heldA.i === 'soda' && heldA.u === 1, heldA);
  mp.check('host draws Bob\'s soda stream', (await A.eval(() => FX.stats().streams)) > 0, await A.eval(() => FX.stats()));
  if (C) await C.shot('p01-cara-sees-bob-spray-alice');
  await mp.wait(900);
  await B.eval(() => { Props.endUse(); return true; });
  mp.check('Alice got soaked by Bob\'s soda', (await toasts(A)).some(t => /soda|sticky|keyboard/i.test(t)));
  await mp.wait(400);

  // ---- fart: Bob eats beans next to Alice -> Alice sees the cloud and coughs
  await B.eval(() => { Inv.give('beans', 1); Props.refreshHeld(); Props.select(Props.slots.indexOf('beans')); Props._fartT = -9; Props.startUse(); return true; });
  await mp.wait(1600);
  mp.check('Alice coughs at Bob\'s fart', (await toasts(A)).some(t => /cough|died|eyes|hostile/i.test(t)));
  mp.check('Alice sees the fart cloud', (await A.eval(() => FX.stats().soft)) > 0);

  // ---- whoopee cushion on Alice's chair: Bob places it, Alice sits -> it pops for everyone
  const deskA = 6;   // a free desk next to the aisle (x 5.2, z -2.1)
  await B.teleport(5.2, -0.6, Math.PI, -0.5);   // stand in front of desk 6 looking at its chair
  await mp.wait(200);
  const cush = await B.eval(() => { Inv.give('whoopee', 1); Props.refreshHeld(); Props.select(Props.slots.indexOf('whoopee')); Props.startUse(); const c = Props.cushions[Props.cushions.length - 1]; return c && { id: c.id, desk: c.desk }; });
  await mp.wait(600);
  mp.check('whoopee cushion placed on a chair', cush && cush.desk >= 0, cush);
  mp.check('host sees the cushion', await A.eval(id => Props.cushions.some(c => c.id === id), cush && cush.id));
  await A.eval(i => { sitAt(i); return true; }, cush ? cush.desk : deskA);
  await mp.wait(2200);
  mp.check('cushion popped when Alice sat (host)', !(await A.eval(id => Props.cushions.some(c => c.id === id), cush && cush.id)));
  mp.check('cushion popped for Bob too', !(await B.eval(id => Props.cushions.some(c => c.id === id), cush && cush.id)));
  mp.check('Alice told she sat on it', (await toasts(A)).some(t => /whoopee|PFFF|NOT you/i.test(t)));
  await A.stand();
  await A.teleport(4.5, 0, Math.PI / 2, 0);

  // ---- pick up and throw a box: the host spawns a box at Bob's feet, Bob picks it up and throws it
  await B.teleport(3.2, 0, -Math.PI / 2, 0);
  const box = await A.eval(() => { const b = Props.launch('box', [3.0, 0.4, 0], [0, 0, 0]); return b.id; });
  await mp.wait(1600);
  mp.check('Bob sees the host\'s box', await B.eval(id => !!Props.byId.get(id), box));
  await B.eval(id => { Props.pickup(Props.byId.get(id)); return true; }, box);
  await mp.wait(500);
  mp.check('box gone from the floor on host while Bob carries it', !(await A.eval(id => Props.byId.has(id), box)));
  const carried = await A.eval(id => { const p = Net.players.get(id); return p.ext && p.ext.held && p.ext.held.i; }, ids.Bob);
  mp.check('host sees Bob carrying the box', /^prop:box/.test(carried || ''), carried);
  await B.eval(() => { P.yaw = -Math.PI / 2; P.pitch = 0.2; Props.throwT = 0; Props.throwSel(); return true; });
  await mp.wait(2800);
  const bxB = await B.eval(id => { const b = Props.byId.get(id); return b && [b.pos.x, b.pos.z]; }, box), bxA = await A.eval(id => { const b = Props.byId.get(id); return b && [b.pos.x, b.pos.z]; }, box);
  mp.check('thrown box lands on the same spot for host and Bob', bxA && bxB && Math.hypot(bxA[0] - bxB[0], bxA[1] - bxB[1]) < 0.35, { host: bxA, bob: bxB });

  // ---- SnapCam: Bob takes a photo of Alice, everyone gets the same picture
  await B.teleport(2.4, 0, -Math.PI / 2, 0);
  const photo = await B.eval(() => { Inv.give('polaroid', 5); Props.refreshHeld(); Props.select(Props.slots.indexOf('polaroid')); SnapCam.cool = 0; Props.startUse(); const ids = [...Photos.urls.keys()]; return ids[ids.length - 1]; });
  await mp.wait(1500);
  const urlB = await B.eval(id => { const u = Photos.urls.get(id); return u && u.url.length; }, photo);
  const urlA = await A.eval(id => { const u = Photos.urls.get(id) || {}; const m = Photos.map.get(id); return { len: u.url ? u.url.length : 0, has: !!m }; }, photo);
  mp.check('host received Bob\'s photo', urlA.has, urlA);
  const same = await A.eval(id => { const u = Photos.urls.get(id); return u ? u.url.slice(-200) : ''; }, photo) === await B.eval(id => { const u = Photos.urls.get(id); return u ? u.url.slice(-200) : ''; }, photo);
  mp.check('photo image identical on host and Bob', same && urlA.len === urlB, { bob: urlB, host: urlA.len });
  if (C) mp.check('Cara received the photo too', await C.eval(id => Photos.map.has(id), photo));
  mp.check('photo prop flies on the host', await A.eval(id => !!Props.byId.get(id), photo));

  // ---- Doodle Pro: Bob hangs a painting on an easel, everyone sees it
  const pnt = await B.eval(() => { const c = document.createElement('canvas'); c.width = 64; c.height = 40; const g = c.getContext('2d'); g.fillStyle = '#ff00aa'; g.fillRect(0, 0, 64, 40); g.fillStyle = '#00ffaa'; g.fillRect(10, 10, 30, 20); return Paintings.hang(c.toDataURL('image/jpeg', 0.8), { title: 'MP test' }).id; });
  await mp.wait(1000);
  mp.check('host sees Bob\'s painting', await A.eval(id => { const p = Paintings.list.get(id); return !!(p && p.group && p.group.parent); }, pnt));
  if (C) mp.check('Cara sees Bob\'s painting', await C.eval(id => Paintings.list.has(id), pnt));

  // ---- chaos goods: Bob orders a pizza party and the inflatable boss; the host's shared state follows
  await B.eval(() => { Chaos.order('pizza'); Chaos.order('boss'); return true; });
  await mp.wait(1500);
  mp.check('host runs Bob\'s pizza party', await A.eval(() => Chaos.st.pizza > 0));
  mp.check('host has Bob\'s inflatable boss', await A.eval(() => !!Chaos.st.boss));
  if (C) mp.check('Cara has the pizza + boss', await C.eval(() => Chaos.st.pizza > 0 && !!Chaos.st.boss));
  await mp.wait(3500);   // past the 3 s grace window: the host snapshot must not undo Bob's own order
  mp.check('Bob still has his pizza + boss after host snapshots', await B.eval(() => Chaos.st.pizza > 0 && !!Chaos.st.boss));
  // airstrike from the client: everyone runs the same plan, the host launches the debris
  await B.eval(() => { Chaos.busyUntil = 0; Chaos.order('strike'); return true; });
  await mp.wait(800);
  mp.check('host runs Bob\'s airstrike', await A.eval(() => Chaos.busy() && Chaos.last && Chaos.last.pts.length > 0));
  if (C) mp.check('Cara got the same strike plan', JSON.stringify(await C.eval(() => Chaos.last.pts)) === JSON.stringify(await A.eval(() => Chaos.last.pts)));
  await mp.wait(4200);
  await A.shot('p02-host-airstrike');
  // stapler: Bob gets the trophy stapler on his desk, others draw it there
  const deskB = await B.sit(13);
  await B.eval(() => { Chaos.lastDesk = P.seat; return true; });
  const stOk = await B.eval(() => { const it = Shop.items.get('chaos_stapler'); if (it) { it.buy(); return true; } return false; }).catch(() => false);
  await mp.wait(800);
  if (stOk) mp.check('host sees Bob\'s stapler on his desk', await A.eval((id, d) => { const p = Net.players.get(id); return p.ext && p.ext.stapler === d + 1; }, ids.Bob, deskB), await A.eval(id => Net.players.get(id).ext.stapler, ids.Bob));
  await B.stand();

  // ---- doors: Bob opens the main door, everyone sees it open (and the host shares it)
  const was = await A.eval(() => W.doors.main.isOpen);
  await B.eval(() => { W.doors.main.toggle(true); return true; });
  await mp.wait(900);
  mp.check('host sees the door Bob toggled', (await A.eval(() => W.doors.main.isOpen)) === !was);
  if (C) mp.check('Cara sees the door Bob toggled', (await C.eval(() => W.doors.main.isOpen)) === !was);
  await mp.wait(1200);
  mp.check('door state survives host snapshots on Bob', (await B.eval(() => W.doors.main.isOpen)) === !was);
  await B.teleport(2.4, 0, -Math.PI / 2, 0.05);
  await mp.shotAll('p03-end');
};
