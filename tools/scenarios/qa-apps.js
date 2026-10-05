/* QA: every desktop app. Open it, use its main feature, close it; minimise / maximise / restore through the title bar;
   every app open at once; a pop-up storm cleaned by BugBuster (scan + quarantine + shield); the start menu and the
   desktop context menu; taskbar buttons.
   Run: xvfb-run -a -s "-screen 0 1920x1080x24" ./node_modules/.bin/electron --no-sandbox --enable-unsafe-swiftshader tools/harness.js tools/scenarios/qa-apps.js 1280x720 <outdir> */
module.exports = async page => {
  const Q = require('./qa-lib')(page);
  await page.eval(() => { const T = window.__tli; T.Saves.week = [null, null, null]; T.Saves.endless = null; writeSaves(); T.OS.fastBoot = true; return true; });
  await page.startSolo('week');
  await page.eval(() => { const T = window.__tli; T.G.prog.apps = { cookie: true, casino: true, paint: true, antivirus: true, cctv: true }; T.Game.addWallet(5000); return true; });
  await Q.sit(); await Q.hush();
  await page.eval(() => { window.__tli.OS.close('memo', true); return true; });
  const errs0 = page.errors.length;
  const ids = await page.eval(() => window.__tli.OS.desktopIds());
  Q.log('desktop icons', ids);
  for (const id of ['phone', 'script', 'playbook', 'payroll', 'shop', 'chat', 'browser', 'camera', 'wallpapers', 'cookie', 'casino', 'paint', 'antivirus', 'cctv'])
    Q.check('icon ' + id, ids.includes(id) || (await page.eval(i => window.__tli.OS.pinned.includes(i), id)), ids.length);

  // ---------- open / use / close each app ----------
  const use = {
    phone: () => { return !!document.querySelector('.win[data-app=phone] .ph-in, .win[data-app=phone] input, .win[data-app=phone] textarea'); },
    script: () => { const b = document.querySelector('.win[data-app=script] .sc-line'); return !!document.querySelector('.win[data-app=script] .wb').children.length; },
    playbook: () => { const b = [...document.querySelectorAll('.win[data-app=playbook] button, .win[data-app=playbook] .pb-s, .win[data-app=playbook] [onclick]')]; return document.querySelector('.win[data-app=playbook] .wb').textContent.length > 50; },
    payroll: () => /Quota|quota/.test(document.querySelector('.win[data-app=payroll] .wb').textContent),
    shop: () => { BonkMart.open('goods'); return document.querySelectorAll('.win .bm-card').length > 0; },
    chat: () => { Chat.open('bot:it'); Chat.send('bot:it', 'My computer is full of pop-ups'); return Chat.threads.get('bot:it').length > 0; },
    browser: () => { Browser.go('intranet.totallylegit.inc'); return Browser.current(); },
    camera: () => { CamApp.setFx('boss'); return !!document.querySelector('.win[data-app=camera] canvas'); },
    wallpapers: () => { Wallpapers.set('ocean'); return document.querySelectorAll('.win[data-app=wallpapers] .wb *').length > 3; },
    cookie: () => { const c = document.querySelector('.win[data-app=cookie] .ck-cookie'), r = c.getBoundingClientRect(); for (let i = 0; i < 25; i++) c.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 })); return Cookie.state().clicks; },
    casino: () => { const w = window.__tli.OS.wins.get('casino'); w.casino.select('dice'); document.querySelector('.lb-act').click(); return w.casino.id; },
    paint: () => { DoodlePro.stroke('pen', [[40, 40], [200, 120], [300, 60]], '#e03131', 8); DoodlePro.stroke('ellipse', [[350, 200], [480, 320]], '#1971c2', 6); DoodlePro.flood(10, 390, '#ffd43b'); return DoodlePro.jpeg(160, 0.6).length; },
    antivirus: () => { const b = document.querySelector('.win[data-app=antivirus] .bb-scan'); b && b.click(); return !!b; },
    cctv: () => { CCTV.sel = 'break'; CCTV.setMode('one'); return document.querySelectorAll('.win[data-app=cctv] canvas').length; },
  };
  let n = 0;
  for (const id of Object.keys(use)) {
    const before = page.errors.length;
    const r = await page.eval((id, src) => { const T = window.__tli; const w = T.OS.launch(id, true); if (!w) return { err: 'no window' }; let v; try { v = (0, eval)('(' + src + ')')(); } catch (e) { return { err: String(e && e.stack || e) }; } return { v, rect: [w.el.offsetLeft, w.el.offsetTop, w.el.offsetWidth, w.el.offsetHeight] }; }, id, use[id].toString());
    await page.wait(id === 'antivirus' ? 1200 : id === 'cookie' || id === 'casino' ? 900 : 500);
    const off = await Q.offscreen('.win[data-app=' + id + ']');
    Q.check('app ' + id + ' opens and works', !r.err && r.v && page.errors.length === before && !off.length, { r, off });
    if (++n % 3 === 1 || ['casino', 'paint', 'cctv', 'camera', 'browser'].includes(id)) await Q.shot('apps-' + String(n).padStart(2, '0') + '-' + id);
    if (id !== 'phone') await page.eval(id => { const b = document.querySelector('.win[data-app=' + id + '] .tb .wbtn.x'); b.click(); return true; }, id);
    await page.wait(250);
    if (id !== 'phone') Q.check('app ' + id + ' closed', !(await page.eval(id => window.__tli.OS.wins.has(id) || !!document.querySelector('.win[data-app=' + id + ']:not(.closing)'), id)));
  }

  // ---------- minimise / maximise / restore via the title bar and the taskbar ----------
  await page.eval(() => { window.__tli.OS.launch('browser', true); return true; });
  await page.wait(300);
  await page.eval(() => { document.querySelector('.win[data-app=browser] .tb .wbtn[title=Maximise]').click(); return true; });
  await page.wait(300);
  const mx = await page.eval(() => { const e = document.querySelector('.win[data-app=browser]'), a = document.querySelector('#os-wins'); return { max: e.classList.contains('max'), w: e.offsetWidth, aw: a.offsetWidth, h: e.offsetHeight, ah: a.offsetHeight }; });
  Q.check('maximise fills the desktop', mx.max && mx.w >= mx.aw - 4 && mx.h >= mx.ah - 4, mx);
  await Q.shot('apps-20-browser-max');
  await page.eval(() => { document.querySelector('.win[data-app=browser] .tb .wbtn[title=Restore]').click(); return true; });
  await page.eval(() => { document.querySelector('.win[data-app=browser] .tb .wbtn[title=Minimise]').click(); return true; });
  await page.wait(300);
  Q.check('minimise hides the window', await page.eval(() => document.querySelector('.win[data-app=browser]').classList.contains('min') && !document.querySelector('.win[data-app=browser]').classList.contains('max')));
  await page.eval(() => { document.querySelector('#taskbar .tbtn[data-id=browser]').click(); return true; });
  await page.wait(300);
  Q.check('taskbar restores it', await page.eval(() => !document.querySelector('.win[data-app=browser]').classList.contains('min')));
  // drag by the title bar
  const dr = await page.eval(() => { const w = window.__tli.OS.wins.get('browser'), tb = w.tb, x0 = w.el.offsetLeft; const r = tb.getBoundingClientRect();
    tb.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, clientX: r.left + 60, clientY: r.top + 10, pointerId: 1 }));
    tb.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: r.left + 160, clientY: r.top + 50, pointerId: 1 }));
    tb.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 })); return [x0, w.el.offsetLeft]; });
  Q.check('drag moves the window', dr[1] > dr[0], dr);

  // ---------- every app at once ----------
  await page.eval(ids => { const T = window.__tli; for (const id of ids) if (!T.OS.apps[id].direct) T.OS.launch(id, true); return true; }, ids);
  await page.wait(1500);
  const all = await page.eval(() => ({ n: window.__tli.OS.wins.size, tb: document.querySelectorAll('#tb-run .tbtn').length, tbW: document.querySelector('#tb-run').scrollWidth, tbVis: document.querySelector('#tb-run').clientWidth }));
  Q.check('every app open at once', all.n >= ids.length - 2, all);
  Q.check('taskbar buttons fit', all.tbW <= all.tbVis + 2, all);
  await Q.shot('apps-21-everything-open');
  const fps = await page.eval(() => new Promise(r => { let k = 0, t0 = performance.now(), worst = 0, last = t0; const f = () => { const t = performance.now(); worst = Math.max(worst, t - last); last = t; k++; if (t - t0 < 2000) requestAnimationFrame(f); else r({ fps: Math.round(k / 2), worstMs: Math.round(worst) }); }; requestAnimationFrame(f); }));
  Q.log('frame rate with every window open (software GL)', fps);
  await page.eval(() => { window.__tli.OS.showDesktop(); return true; });
  await page.wait(300);
  Q.check('show desktop minimises everything', await page.eval(() => [...window.__tli.OS.wins.values()].every(w => w.el.classList.contains('min'))));
  await page.eval(() => { window.__tli.OS.showDesktop(); return true; });
  await page.eval(() => { const T = window.__tli; for (const id of [...T.OS.wins.keys()]) if (id !== 'phone') T.OS.close(id, true); return true; });

  // ---------- pop-up storm + BugBuster ----------
  await page.eval(() => { window.__tli.OS.virus(10); return true; });
  await page.wait(2200);
  const p0 = await page.eval(() => window.__tli.OS.popups);
  Q.check('pop-up storm', p0 >= 10, p0);
  Q.check('pop-ups stay on screen', !(await Q.offscreen('#os-wins .popup')).length, await Q.offscreen('#os-wins .popup'));
  await Q.shot('apps-22-popup-storm');
  // close one through its button: it may spawn another (that is the joke), the counter must stay right
  await page.eval(() => { document.querySelector('#os-wins .popup .pbtn').click(); return true; });
  await page.wait(200);
  Q.check('popup counter matches the DOM', await page.eval(() => window.__tli.OS.popups === document.querySelectorAll('#os-wins .popup').length));
  await page.eval(() => { window.__tli.OS.launch('antivirus', true); document.querySelector('.win[data-app=antivirus] .bb-scan').click(); return true; });
  await Q.waitFor(() => !!document.querySelector('.win[data-app=antivirus] .bb-q'), 20000, 400);
  await Q.shot('apps-23-bugbuster-results');
  await page.eval(() => { document.querySelector('.win[data-app=antivirus] .bb-q').click(); return true; });
  await page.wait(1200);
  const bb = await page.eval(() => ({ pops: window.__tli.OS.popups, dom: document.querySelectorAll('#os-wins .popup').length, shield: BugBuster.shielded() }));
  Q.check('quarantine clears every pop-up and raises the shield', !bb.pops && !bb.dom && bb.shield, bb);
  await Q.shot('apps-24-bugbuster-clean');
  await page.eval(() => { window.__tli.OS.virus(4); return true; });
  await page.wait(1000);
  Q.check('the shield blocks a new storm', (await page.eval(() => window.__tli.OS.popups)) === 0);
  await page.eval(() => { BugBuster.off(); window.__tli.OS.close('antivirus', true); return true; });

  // ---------- start menu, context menu ----------
  await page.eval(() => { window.__tli.OS.power(true); return true; });
  await page.wait(300);
  Q.check('start menu on screen', (await Q.visible('#powermenu')) && !(await Q.offscreen('#powermenu')).length);
  await Q.shot('apps-25-start-menu');
  await page.eval(() => { window.__tli.OS.power(false); const r = document.querySelector('#os-wall').getBoundingClientRect(); document.querySelector('#os-wall').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: r.width - 20, clientY: r.height - 60 })); return true; });
  await page.wait(300);
  Q.check('context menu on screen', (await Q.visible('#os-ctx')) && !(await Q.offscreen('#os-ctx')).length, await Q.offscreen('#os-ctx'));
  await page.eval(() => { window.__tli.OS.ctx(false); return true; });

  // ---------- settings app (direct) ----------
  await page.eval(() => { window.__tli.OS.launch('settings', true); return true; });
  await page.wait(300);
  Q.check('settings app opens the settings modal', await page.eval(() => window.__tli.UI.settingsOpen));
  await page.eval(() => { window.__tli.UI.closeSettings(); return true; });

  Q.check('no page errors from the apps', page.errors.length === errs0, page.errors.slice(errs0));
  await Q.done();
};
