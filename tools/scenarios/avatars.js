/* Avatars: 8 characters in the office doing actions, close-ups, third-person views, sitting at desks,
   the review room, walking/running, and the character creator.
   Run: xvfb-run -a ./node_modules/.bin/electron --no-sandbox --enable-unsafe-swiftshader tools/harness.js tools/scenarios/avatars.js 1600x900 <outdir> */
module.exports = async page => {
  const only = (process.env.AV_ONLY || '').split(',').filter(Boolean), want = k => !only.length || only.includes(k);
  // ---- character creator (main menu) ----
  if (want('creator')) {
    await page.eval(() => { const b = [...document.querySelectorAll('#menu .home-btns .btn')].find(x => /character/i.test(x.textContent)); if (!b) throw new Error('no Character button'); return true; });
    await page.shot('av-00-menu');
    await page.eval(() => { [...document.querySelectorAll('#menu .home-btns .btn')].find(x => /character/i.test(x.textContent)).click(); return true; });
    await page.wait(1500);
    await page.shot('av-01-creator');
    await page.eval(() => { const L = Object.assign({}, settings.look, { hair: 'afro', hairColor: '#1c1714', skin: '#6b4128', facial: 'beard', glasses: 'round', shirt: '#22c55e', pants: '#8c7a58' }); Customize.apply(L); Customize.preview && Customize.preview.play('wave'); return true; });
    await page.wait(900);
    await page.shot('av-02-creator-changed');
    await page.eval(() => { Customize.zoomT = 1; Customize.preview.setMood('happy', 5); return true; });
    await page.wait(1200);
    await page.shot('av-03-creator-zoom');
    await page.eval(() => { Customize.close(); return true; });
  }
  await page.startSolo('week');
  await page.eval(() => {
    document.getElementById('hud').classList.add('hidden');
    const P = window.__tli.P;
    window.__cam = (x, y, z, yaw, pitch) => { P.cam = { fx: x, fy: y, fz: z, fyaw: yaw, fp: pitch, tx: x, ty: y, tz: z, tyaw: yaw, tp: pitch, t: 0, dur: 1e9 }; };
    const looks = [
      { skin: '#f2c4a0', hair: 'short', hairColor: '#3a281c', facial: 'bigmustache', glasses: 'none', shirt: '#3b82f6', pants: '#39415a', shoes: '#1a1c22', build: 'avg' },
      { skin: '#6b4128', hair: 'afro', hairColor: '#1c1714', facial: 'none', glasses: 'round', shirt: '#22c55e', pants: '#8c7a58', shoes: '#ebe6da', build: 'slim' },
      { skin: '#cd935f', hair: 'ponytail', hairColor: '#6a4327', facial: 'none', glasses: 'none', shirt: '#ec4899', pants: '#262a35', shoes: '#b8312f', build: 'avg' },
      { skin: '#f8dcc6', hair: 'quiff', hairColor: '#b5442a', facial: 'beard', glasses: 'square', shirt: '#f59e0b', pants: '#1f2d4d', shoes: '#4a2e1e', build: 'big' },
      { skin: '#48291a', hair: 'bald', hairColor: '#1c1714', facial: 'goatee', glasses: 'shades', shirt: '#a855f7', pants: '#262a35', shoes: '#1a1c22', build: 'big' },
      { skin: '#e2ad80', hair: 'bun', hairColor: '#d9b56c', facial: 'none', glasses: 'round', shirt: '#14b8a6', pants: '#5b4633', shoes: '#7d4b2a', build: 'slim' },
      { skin: '#8f5c36', hair: 'curly', hairColor: '#3a281c', facial: 'stubble', glasses: 'none', shirt: '#ef4444', pants: '#39415a', shoes: '#2b4c8c', build: 'avg' },
      { skin: '#f08a3c', hair: 'mohawk', hairColor: '#3f6fd6', facial: 'mustache', glasses: 'none', shirt: '#eab308', pants: '#2f4a3a', shoes: '#ebe6da', build: 'avg' }];
    const names = ['Dmitri', 'Kezia', 'Priya', 'Bjorn', 'Marcus', 'Hana', 'Tomas', 'Zed'];
    window.__avs = looks.map((l, i) => { const a = buildAvatar({ look: l, name: names[i] }); a.group.position.set(7.0, 0, -3.5 + i * 1.0); a.group.rotation.y = -Math.PI / 2; W.scene.add(a.group); a.sit = false; a.speed = 0; return a; });
    Loop.add((dt, t) => window.__avs.forEach(a => { if (a.walk) { a.walk.a += dt * a.walk.s / a.walk.r; a.group.position.set(a.walk.x + Math.cos(a.walk.a) * a.walk.r, 0, a.walk.z + Math.sin(a.walk.a) * a.walk.r); a.group.rotation.y = -a.walk.a; } poseAvatar(a, a.sit, t, a.walk ? a.walk.s : 0); }));
    return true;
  });
  const poses = async list => page.eval(list => { list.forEach((p, i) => { const a = window.__avs[i]; a.act = null; a.stunT = 0; a.setMood(p.mood || 'neutral'); if (p.act) a.play(p.act, { hold: p.hold, loop: p.loop }); if (p.stun) a.stun(30); }); return true; }, list);
  if (want('line')) {
    await poses([{}, { act: 'wave', hold: 0.5 }, { act: 'cheer', loop: true }, { act: 'facepalm', hold: 0.5 }, { act: 'point', hold: 0.5 }, { stun: true }, { act: 'dance', loop: true }, { act: 'fart', hold: 0.45 }]);
    await page.eval(() => { window.__cam(11.0, 1.5, 0.3, Math.PI / 2, -0.1); return true; });
    await page.wait(1600);
    await page.shot('av-10-lineup');
    await page.eval(() => { window.__cam(9.0, 1.55, -2.0, Math.PI / 2, -0.06); return true; });
    await page.wait(700);
    await page.shot('av-11-close-a');
    await page.eval(() => { window.__cam(9.0, 1.55, 2.0, Math.PI / 2, -0.06); return true; });
    await page.wait(700);
    await page.shot('av-12-close-b');
    await poses([{ act: 'punch', hold: 0.45 }, { act: 'slap', hold: 0.5 }, { act: 'throw', hold: 0.4 }, { act: 'drink', hold: 0.5 }, { act: 'spray', hold: 0.5 }, { act: 'hit', hold: 0.2 }, { act: 'fall', hold: 0.45 }, { act: 'shrug', hold: 0.5 }]);
    await page.eval(() => { window.__cam(11.0, 1.6, 0, Math.PI / 2, -0.12); return true; });
    await page.wait(1300);
    await page.shot('av-13-actions');
    await page.eval(() => { window.__cam(5.2, 2.1, -4.6, -Math.PI * 0.78, -0.25); return true; });
    await page.wait(700);
    await page.shot('av-14-behind');
    await poses([{ mood: 'neutral' }, { mood: 'happy' }, { mood: 'angry' }, { mood: 'sad' }, { mood: 'surprised' }, { mood: 'happy' }, { mood: 'angry' }, { mood: 'sad' }]);
    await page.eval(() => { window.__cam(8.3, 1.62, -2.0, Math.PI / 2, -0.03); return true; });
    await page.wait(700);
    await page.shot('av-15-faces');
    await page.eval(() => { window.__avs[2].setMood('happy'); window.__avs[2].talking = true; window.__cam(7.82, 1.66, -1.5, Math.PI / 2, -0.04); return true; });
    await page.wait(700);
    await page.shot('av-16-face-close');
    await page.eval(() => { window.__avs[2].talking = false; return true; });
  }
  if (want('gallery')) {
    // every hair style, facial hair and glasses option side by side (two rows of 6)
    await page.eval(() => {
      window.__avs.forEach(a => { a.group.visible = false; });
      const O = AV_OPT, hairs = O.hairs.map(x => x[0]), fac = O.facials.map(x => x[0]), gl = O.glasses.map(x => x[0]);
      const skins = ['#f8dcc6', '#6b4128', '#cd935f', '#48291a', '#f2c4a0', '#8f5c36', '#e2ad80', '#b17447', '#f08a3c', '#f4c84a', '#8fd0a6', '#b9a2e0'];
      window.__gal = hairs.map((hr, i) => {
        const L = { skin: skins[i], hair: hr, hairColor: O.hairCols[(i * 3) % O.hairCols.length], facial: fac[i % fac.length], glasses: gl[(i >> 1) % gl.length], shirt: O.shirts[i], pants: O.pants[i % O.pants.length], shoes: O.shoes[i % O.shoes.length], build: O.builds[i % 3][0] };
        const a = buildAvatar({ look: L, name: hr });
        a.group.position.set(7.4, 0, -2.6 + (i % 6) * 1.04); a.group.rotation.y = -Math.PI / 2; a.group.visible = i < 6; W.scene.add(a.group); a.setMood(['neutral', 'happy', 'surprised'][i % 3]); return a;
      });
      Loop.add((dt, t) => window.__gal.forEach(a => a.group.visible && poseAvatar(a, false, t, 0)));
      window.__cam(10.6, 1.6, 0.0, Math.PI / 2, -0.06); return true;
    });
    await page.wait(1300);
    await page.shot('av-05-gallery-a');
    await page.eval(() => { window.__gal.forEach((a, i) => { a.group.visible = i >= 6; }); return true; });
    await page.wait(700);
    await page.shot('av-06-gallery-b');
    await page.eval(() => { window.__cam(5.0, 1.75, -0.2, -Math.PI / 2 + 0.25, -0.1); return true; });
    await page.wait(600);
    await page.shot('av-07-gallery-back');
    await page.eval(() => { window.__gal.forEach(a => { a.group.visible = false; }); window.__avs.forEach(a => { a.group.visible = true; }); return true; });
  }
  if (want('walk')) {
    await page.eval(() => { window.__avs.forEach((a, i) => { a.act = null; a.stunT = 0; a.walk = i < 4 ? { x: 7, z: -1.5, r: 1.8, a: i * 1.57, s: i % 2 ? 5.2 : 3.2 } : null; if (!a.walk) a.group.position.y = i === 5 ? 0.5 : 0; }); window.__cam(11.2, 2.0, -1.0, Math.PI / 2, -0.2); return true; });
    await page.wait(1200);
    await page.shot('av-20-walk');
    await page.eval(() => { window.__avs.forEach(a => { a.walk = null; a.group.position.y = 0; }); return true; });
  }
  if (want('sit')) {
    // seat the spawned avatars at free desks + review seats, show W.me seated
    await page.eval(() => {
      const free = W.desks.filter(d => !d.npc);
      window.__avs.forEach((a, i) => { const d = free[i]; a.act = null; a.stunT = 0; a.sit = 'desk'; a.group.position.set(d.seat.x, 0, d.seat.z); a.group.rotation.y = d.rot; });
      window.__avs[2].play('wave', { hold: 0.5 });
      return true;
    });
    await page.wait(300);
    const d0 = await page.eval(() => { const d = W.desks.filter(d => !d.npc)[0]; return { x: d.seat.x, z: d.seat.z, rot: d.rot }; });
    await page.eval(() => { window.__cam(-2.0, 4.6, -0.2, -0.9, -0.85); return true; });
    await page.wait(1600);
    await page.shot('av-30-desks-top');
    await page.eval(d => { window.__cam(d.x + 1.6, 1.7, d.z + 1.4 * Math.cos(d.rot), Math.atan2(1.6, 1.4 * Math.cos(d.rot)), -0.18); return true; }, d0);
    await page.wait(900);
    await page.shot('av-31-desk-close');
    await page.eval(() => {
      window.__avs.forEach((a, i) => { const s = REVIEW_SEATS[i % REVIEW_SEATS.length]; a.sit = i < 6 ? 'review' : false; if (i < 6) { a.group.position.set(s[0], 0, s[1]); a.group.rotation.y = -Math.PI / 2; } else a.group.position.set(14 + i * 0.5, 0, -7.4); });
      placeBoss(true, true); window.__cam(18.7, 1.9, -2.5, 1.085, -0.2); return true;
    });
    await page.wait(1300);
    await page.shot('av-32-review');
  }
  if (want('boss')) {
    await page.eval(() => { window.__avs.forEach(a => { a.group.visible = false; }); placeBoss(false, false); window.__cam(12.3, 1.75, 2.3, -Math.PI / 2 - 0.25, -0.08); return true; });
    await page.wait(1000);
    await page.shot('av-25-boss');
    await page.eval(() => { placeBoss(false, true); return true; });
    await page.wait(900);
    await page.shot('av-26-boss-angry');
    await page.eval(() => { placeBoss(false, false); window.__avs.forEach(a => { a.group.visible = true; }); return true; });
  }
  if (want('net')) {
    // fake remote players through the real sync path: look string in ext, talking flag, seat, net actions
    const r = await page.eval(() => {
      const out = {}; window.__avs.forEach(a => { a.group.visible = false; }); placeBoss(false);
      Net.active = true; Net.myId = 'me1';
      const desk = W.desks.find(d => !d.npc);
      const pl = new Map([['me1', { name: 'Me' }],
        ['p1', { name: 'Remote Rita', color: '#ef4444', x: 8.6, y: 0, z: 0.9, ry: -Math.PI / 2, seat: -1, talk: true, ext: { look: packLook(normLook({ hair: 'bun', hairColor: '#1c1714', skin: '#6b4128', shirt: '#ef4444', glasses: 'round' })), mood: 'happy' } }],
        ['p2', { name: 'Plain Pete', color: '#22c55e', x: 8.6, y: 0, z: -0.6, ry: -Math.PI / 2, seat: -1, talk: false }],
        ['p3', { name: 'Seated Sam', color: '#a855f7', x: 0, y: 0, z: 0, ry: 0, seat: desk.i, talk: false }]]);
      syncAvatars(pl, 'me1');
      out.count = W.avatars.size;
      const a = W.avatars.get('p1'); out.pk1 = a.av._pk;
      pl.get('p1').ext.look = packLook(normLook({ hair: 'afro', hairColor: '#1c1714', skin: '#6b4128', shirt: '#ef4444', glasses: 'round' })); syncAvatars(pl, 'me1'); out.rebuilt = a.av._pk !== out.pk1;
      Net._x({ k: 'av:act', p: { a: 'wave' } }, 'p1'); out.remoteWave = !!(a.av.act && a.av.act.name === 'wave');
      Net._x({ k: 'av:act', p: { id: 'me1', a: 'hit' } }, 'p2'); out.meHit = !!(W.me.act && W.me.act.name === 'hit');
      Net._x({ k: 'av:stun', p: { s: 30 } }, 'p2'); out.stunned = W.avatars.get('p2').av.stunT > 0;
      out.ext = Net.ext(); out.avatarOf = avatarOf('p1') === a.av && avatarOf('me1') === W.me;
      window.__pl = pl; window.__cam(11.2, 1.7, 0.2, Math.PI / 2, -0.12);
      return out;
    });
    console.log('net check: ' + JSON.stringify(r));
    if (!(r.count === 3 && r.rebuilt && r.remoteWave && r.meHit && r.stunned && r.avatarOf && r.ext && r.ext.look)) throw new Error('net check failed');
    await page.wait(1200);
    await page.shot('av-35-remote');
    await page.eval(() => { syncAvatars(new Map(), 'me1'); Net.active = false; Net.myId = 'me'; return true; });
  }
  if (want('me')) {
    await page.eval(() => { placeBoss(false); window.__avs.forEach(a => { a.group.visible = false; }); P.cam = null; return true; });
    await page.sit();
    await page.eval(() => { OS.hide(); W.me.group.visible = true; const d = W.desks[P.seat]; window.__cam(d.seat.x + 1.1 * Math.sin(d.rot) + 0.9, 1.9, d.seat.z + 1.1 * Math.cos(d.rot), Math.atan2(1.1 * Math.sin(d.rot) + 0.9, 1.1 * Math.cos(d.rot)), -0.35); return true; });
    await page.wait(1200);
    await page.shot('av-40-me-seated');
  }
  const info = await page.eval(() => ({ meshes: (() => { let n = 0; W.me.group.traverse(o => { if (o.isMesh || o.isSprite) n++; }); return n; })(), calls: W.renderer.info.render.calls, tris: W.renderer.info.render.triangles }));
  console.log('avatar info: ' + JSON.stringify(info));
};
