/* QA: edge cases and clean resets. Standing up mid-call, the day ending mid-call with the shop and many windows
   open, quitting to the menu from the review, starting a new game (no leftovers), pause, settings (quality, FOV,
   volume), window resize 1920x1080 / 1280x720, the character creator, saves surviving a page reload.
   Run: xvfb-run -a -s "-screen 0 1920x1080x24" ./node_modules/.bin/electron --no-sandbox --enable-unsafe-swiftshader tools/harness.js tools/scenarios/qa-reset.js 1280x720 <outdir> */
module.exports = async page => {
  const Q = require('./qa-lib')(page);
  await page.eval(() => { const T = window.__tli; T.Saves.week = [null, null, null]; T.Saves.endless = null; writeSaves(); T.OS.fastBoot = true; return true; });
  await page.startSolo('week');
  await Q.sit(); await Q.hush();

  // ---------- many windows + a live call ----------
  const apps = await page.eval(() => Object.keys(window.__tli.OS.apps).filter(id => { const d = window.__tli.OS.apps[id]; return d.desktop && !d.direct && (!d.available || d.available()); }));
  Q.log('desktop apps', apps);
  await page.eval(ids => { const T = window.__tli; for (const id of ids) T.OS.launch(id, true); return true; }, apps);
  await page.wait(1500);
  const nw = await page.eval(() => window.__tli.OS.wins.size);
  Q.check('every desktop app opens', nw >= apps.length, [nw, apps.length]);
  await Q.shot('reset-01-many-windows');
  await Q.ringAnswer('granny');
  await page.eval(() => { window.__tli.Call.setScheme('card'); return true; });
  await page.say('Hello, this is Bonk Pay security. I am afraid your card has been compromised.');

  // ---------- stand up mid-call, sit back down ----------
  await page.stand();
  let s = await page.eval(() => ({ call: window.__tli.Call.state, os: window.__tli.OS.open, seated: window.__tli.P.seated, hud: !document.querySelector('#hud').classList.contains('hidden') }));
  Q.log('stood up mid-call', s);
  Q.check('standing up mid-call: desktop closed, HUD back', !s.os && !s.seated && s.hud, s);
  await page.wait(800);
  await Q.shot('reset-02-stood-mid-call');
  await Q.sit();
  s = await page.eval(() => ({ call: window.__tli.Call.state, phone: window.__tli.OS.wins.has('phone'), wins: window.__tli.OS.wins.size }));
  Q.check('sitting back: the call is still there', s.call === 'live' && s.phone, s);

  // ---------- the day ends mid-call with the shop open and fires/tints/props around ----------
  await page.eval(() => { BonkMart.open('goods'); FX.fire([2, 0, 2], 1, 0); FX.tint('#ff0000', 0.3); return true; });
  await page.wait(500);
  await page.eval(() => { window.__tli.G.timeLeft = 0.3; return true; });
  await Q.waitFor(() => window.__tli.G.phase === 'review', 5000);
  await page.wait(1200);
  s = await page.eval(() => { const T = window.__tli; return { call: T.Call.state, res: T.Call.cur && T.Call.cur.result, os: T.OS.open, osEl: !document.querySelector('#os').classList.contains('hidden'), rv: Review.on }; });
  Q.check('day end mid-call: call cut, desktop hidden, review on', s.call === 'off' && s.res === 'cut' && !s.os && !s.osEl && s.rv, s);
  await Q.shot('reset-03-review-after-cut');

  // ---------- quit to the menu from the review ----------
  await page.eval(() => { window.__tli.Game.pause(true); return true; });
  await page.wait(300);
  await Q.shot('reset-04-pause-in-review');
  await Q.click('#pause .btn.danger', /Quit/, 800);
  const leak = () => page.eval(() => {
    const T = window.__tli, ft = document.querySelector('#fx-tint'), tint = ft && +(ft.style.opacity || 0) > 0.01 ? [1] : [];   // target opacity (it fades)
    return { phase: T.G.phase, rv: Review.on, review: T.P.review, wins: T.OS.wins.size, popups: T.OS.popups, ring: !!T.Call.ringIv, call: T.Call.state, tint: tint.length,
      flames: document.querySelectorAll('.rv-flames').length, sheet: document.querySelectorAll('.rv-sheet').length, rvVisible: !document.querySelector('#review').classList.contains('hidden'),
      bodyCls: document.body.className, toasts: document.querySelectorAll('#toasts .toast').length, cards: document.querySelectorAll('#os-modal .ringcard').length,
      props: Props.bodies.length, carry: !!Props.carry, paused: T.G.paused, boss: T.W.boss ? [+T.W.boss.group.position.x.toFixed(1), +T.W.boss.group.position.z.toFixed(1)] : null };
  });
  let L = await leak();
  Q.log('after quit', L);
  Q.check('quit from the review: menu, nothing left over', L.phase === 'menu' && !L.rv && L.review < 0 && !L.wins && !L.popups && !L.ring && !L.tint && !L.flames && !L.rvVisible && !/rv-on/.test(L.bodyCls) && !L.paused, L);
  await Q.shot('reset-05-menu-after-quit');

  // ---------- a new game starts clean ----------
  await page.eval(() => { window.__tli.Game.startSolo('week', 1); document.getElementById('daycard').classList.add('hidden'); return true; });
  await page.wait(1200);
  L = await leak();
  const g = await page.eval(() => { const T = window.__tli; return { day: T.G.day, wallet: T.G.wallet, prog: Object.keys(T.G.prog), team: T.G.team, personal: T.G.personal, inv: T.Inv.dump(), phase: T.G.phase, timeLeft: T.G.timeLeft }; });
  Q.log('new game', g, L);
  Q.check('new game: fresh state', g.day === 1 && g.team === 0 && g.personal === 0 && g.phase === 'day', g);
  Q.check('new game: no review / fire / tint / windows left', !L.rv && L.review < 0 && !L.wins && !L.tint && !L.flames && !L.rvVisible, L);
  await Q.shot('reset-06-new-game');

  // ---------- pause stops the clock ----------
  await Q.press('Escape');
  await page.wait(200);
  const t1 = await page.eval(() => window.__tli.G.timeLeft);
  await page.wait(1500);
  const t2 = await page.eval(() => window.__tli.G.timeLeft);
  Q.check('Esc pauses and stops the clock', (await page.eval(() => window.__tli.G.paused)) && t1 === t2, [t1, t2]);
  await page.wait(400);
  await Q.press('Escape');
  await page.wait(300);
  Q.check('Esc again resumes', !(await page.eval(() => window.__tli.G.paused)));

  // ---------- settings: quality, FOV, volume ----------
  const before = await page.eval(() => ({ pr: window.__tli.W.renderer.getPixelRatio(), sh: window.__tli.W.renderer.shadowMap.enabled }));
  for (const q of ['low', 'high', 'med']) {
    await page.eval(q => { const T = window.__tli; T.settings.quality = q; saveSettings(); applyQuality(); return true; }, q);
    await page.wait(700);
    const st = await page.eval(() => ({ pr: window.__tli.W.renderer.getPixelRatio(), sh: window.__tli.W.renderer.shadowMap.enabled, calls: window.__tli.W.renderer.info.render.calls }));
    Q.log('quality ' + q, st);
    if (q !== 'med') await Q.shot('reset-07-quality-' + q);
  }
  await page.eval(() => { const T = window.__tli; T.settings.fov = 95; saveSettings(); applyQuality(); return true; });
  await page.wait(500);
  Q.check('FOV applies', Math.abs((await page.eval(() => window.__tli.W.camera.fov)) - 95) < 8);
  await page.eval(() => { const T = window.__tli; T.settings.fov = 72; T.settings.master = 0.3; saveSettings(); AudioSys.applyVolumes(); applyQuality(); return true; });
  await page.eval(() => { window.__tli.UI.openSettings(); return true; });
  for (const tab of ['player', 'controls', 'sound', 'ai', 'other']) { await page.eval(t => { window.__tli.UI.tab = t; window.__tli.UI.renderSettings(); return true; }, tab); await page.wait(150); }
  await Q.shot('reset-08-settings');
  Q.check('settings fit on screen', !(await Q.offscreen('#modal-settings .modal')).length, await Q.offscreen('#modal-settings .modal'));
  await page.eval(() => { window.__tli.UI.closeSettings(); return true; });

  // ---------- character creator ----------
  await page.eval(() => { Customize.show(); return true; });
  await page.wait(1200);
  await Q.shot('reset-09-creator');
  Q.check('creator fits on screen', !(await Q.offscreen('#cz .cz-panel, #cz > div')).length, await Q.offscreen('#cz > div'));
  const look = await page.eval(() => { const L = lookFromSeed(4242); Customize.apply(L); Customize.close(); return packLook(normLook(L)); });
  await page.wait(300);
  Q.check('creator look applied to W.me', await page.eval(l => packLook(window.__tli.W.me.look) === l || packLook(Avatars.myLook()) === l, look));

  // ---------- window resize ----------
  await Q.sit();
  await page.eval(() => { window.__tli.OS.launch('shop', true); window.__tli.OS.launch('casino', true); return true; });
  page.win.setContentSize(1920, 1080); await page.wait(1500);
  await Q.shot('reset-10-desktop-1080p');
  Q.check('1080p: windows on screen', !(await Q.offscreen('#os-wins .win, #taskbar')).length, await Q.offscreen('#os-wins .win, #taskbar'));
  page.win.setContentSize(1280, 720); await page.wait(1500);
  await Q.shot('reset-11-desktop-720p-after-resize');
  Q.check('back to 720p: windows on screen', !(await Q.offscreen('#os-wins .win, #taskbar')).length, await Q.offscreen('#os-wins .win, #taskbar'));

  // ---------- saves survive a reload ----------
  await page.eval(() => { const T = window.__tli; T.Game.addWallet(321); T.Inv.give('soda', 2); T.G.prog.qa = { n: 7 }; T.Game.saveProgress(); return true; });
  const w = await page.eval(() => window.__tli.G.wallet);
  await page.eval(() => { location.reload(); return true; }).catch(() => {});
  await page.wait(4000);
  await Q.waitFor(() => !!window.__tli, 10000);
  await page.eval(() => { window.__tli.settings.tts = false; return true; });
  const sv = await page.eval(() => { const T = window.__tli, s = T.Saves.week[1]; return s && { day: s.day, wallet: s.wallet, soda: s.inv && s.inv.soda, qa: s.prog && s.prog.qa, look: packLook(normLook(T.settings.look || {})) }; });
  Q.check('save survives the reload', sv && sv.wallet === w && sv.soda >= 2 && sv.qa && sv.qa.n === 7, sv);
  Q.check('look survives the reload', sv && sv.look === look, sv && sv.look);
  await page.eval(() => { const T = window.__tli; T.Game.startSolo('week', 1); return true; });
  await page.wait(800);
  const lo = await page.eval(() => { const T = window.__tli; return { wallet: T.G.wallet, soda: T.Inv.count('soda'), qa: T.G.prog.qa }; });
  Q.check('continue loads wallet, inventory and progress', lo.wallet === w && lo.soda >= 2 && lo.qa && lo.qa.n === 7, lo);
  await Q.done();
};
