/* QA: monkey test. Clicks random buttons, icons, tabs and inputs on the LegitOS desktop (every app owned, money to
   spend, calls ringing), types junk, walks around pressing random game keys, sits back down, and checks after
   each round that nothing threw and the game is still in a sane state. Seeded, so a failure can be replayed:
   QA_SEED=123 ... tools/harness.js tools/scenarios/qa-monkey.js 1280x720 <outdir>
   Run: xvfb-run -a -s "-screen 0 1920x1080x24" ./node_modules/.bin/electron --no-sandbox --enable-unsafe-swiftshader tools/harness.js tools/scenarios/qa-monkey.js 1280x720 <outdir> */
module.exports = async page => {
  const Q = require('./qa-lib')(page);
  const seed = +(process.env.QA_SEED || 4242), ROUNDS = +(process.env.QA_ROUNDS || 6);
  Q.log('seed', seed);
  await page.eval(s => {
    let x = s; window.__rnd = () => { x = (x * 16807) % 2147483647; return x / 2147483647; };
    const T = window.__tli; T.Saves.week = [null, null, null]; T.Saves.endless = null; writeSaves(); T.OS.fastBoot = true; return true;
  }, seed);
  await page.startSolo('week');
  await Q.fast(true);
  await Q.sit();
  await page.eval(() => { const T = window.__tli; T.G.wallet = 50000; T.G.timeLeft = 9999; for (const it of Shop.items.values()) if (it.tab === 'apps' && !it.owned()) try { it.buy(); } catch (e) {} T.OS.buildIcons(); return true; });
  const errs0 = page.errors.length;
  const log = [];
  for (let round = 0; round < ROUNDS; round++) {
    // ---- desktop: 40 random actions ----
    const acts = await page.eval(n => {
      const T = window.__tli, R = window.__rnd, out = [];
      const AVOID = /Quit|Main menu|Save and quit|Stand up|Clock out|Reset|Delete|Sign out|Leave/i;
      const vis = e => { const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2 || r.right < 0 || r.bottom < 0 || r.left > innerWidth || r.top > innerHeight) return false; const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return t && (t === e || e.contains(t)); };
      for (let i = 0; i < n && T.OS.open && T.G.phase === 'day'; i++) {
        if (T.UI.settingsOpen) { T.UI.closeSettings(); out.push('close settings'); }
        const k = R();
        if (k < 0.12) { const ids = T.OS.desktopIds(); const id = ids[Math.floor(R() * ids.length)]; T.OS.launch(id, true); out.push('launch ' + id); continue; }
        if (k < 0.16 && T.OS.wins.size > 6) { const ids = [...T.OS.wins.keys()].filter(i => i !== 'phone'); const id = ids[Math.floor(R() * ids.length)]; if (id) { T.OS.close(id, true); out.push('close ' + id); } continue; }
        if (k < 0.2 && T.Call.state === 'idle') { T.Call.ring(R() < 0.3); out.push('ring'); continue; }
        if (k < 0.24 && T.Call.state === 'live') { T.Call.say(['hello', 'your card is compromised', 'I need your number', 'thank you', 'what is the code on your screen'][Math.floor(R() * 5)]); out.push('say'); continue; }
        const els = [...document.querySelectorAll('#os button, #os .icon, #os [role=button], #os input, #os select, #os textarea, #os canvas, #os-modal button')].filter(e => !e.disabled && !AVOID.test(e.textContent || '') && vis(e));
        if (!els.length) continue;
        const e = els[Math.floor(R() * els.length)], r = e.getBoundingClientRect(), x = r.left + r.width * (0.2 + 0.6 * R()), y = r.top + r.height * (0.2 + 0.6 * R());
        const tag = e.tagName;
        if (tag === 'INPUT' && /text|search|number|password|^$/.test(e.type)) { e.focus(); e.value = ['1234', 'hello', '0000 0000', '12/27', 'ABC-123', '', '💥💥', '9'.repeat(40)][Math.floor(R() * 8)]; e.dispatchEvent(new Event('input', { bubbles: true })); if (R() < 0.5) e.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true })); e.blur(); out.push('type ' + (e.className || e.placeholder || '').toString().slice(0, 20)); continue; }
        if (tag === 'SELECT') { const o = e.options; if (o.length) { e.selectedIndex = Math.floor(R() * o.length); e.dispatchEvent(new Event('change', { bubbles: true })); } out.push('select'); continue; }
        const opt = { bubbles: true, clientX: x, clientY: y, button: 0, pointerId: 1 };
        e.dispatchEvent(new PointerEvent('pointerdown', opt)); e.dispatchEvent(new MouseEvent('mousedown', opt));
        if (tag === 'CANVAS') { for (let j = 0; j < 4; j++) { const o2 = Object.assign({}, opt, { clientX: x + (R() - 0.5) * 60, clientY: y + (R() - 0.5) * 60 }); e.dispatchEvent(new PointerEvent('pointermove', o2)); e.dispatchEvent(new MouseEvent('mousemove', o2)); } }
        e.dispatchEvent(new PointerEvent('pointerup', opt)); e.dispatchEvent(new MouseEvent('mouseup', opt)); e.click();
        out.push('click ' + (e.textContent || e.className || tag).toString().trim().replace(/\s+/g, ' ').slice(0, 24));
      }
      return out;
    }, 40);
    log.push(...acts.map(a => round + ': ' + a));
    await page.wait(1500);
    // ---- sanity: the desktop is still usable ----
    let s = await page.eval(() => { const T = window.__tli, r = document.querySelector('#taskbar') && document.querySelector('#taskbar').getBoundingClientRect();
      return { phase: T.G.phase, os: T.OS.open, seated: T.P.seated, wallet: T.G.wallet, team: T.G.team, nan: [T.G.wallet, T.G.team, T.G.personal].some(v => !isFinite(v)), wins: T.OS.wins.size, popups: T.OS.popups, tb: !!r && r.bottom <= innerHeight + 1 }; });
    Q.check('round ' + round + ': no page errors', page.errors.length === errs0, page.errors.slice(errs0, errs0 + 5));
    Q.check('round ' + round + ': money is finite and not negative', !s.nan && s.wallet >= 0 && s.team >= 0, s);
    if (page.errors.length !== errs0) { Q.log('last actions', log.slice(-15)); break; }
    if (round === 1 || round === ROUNDS - 1) await Q.shot('monkey-desk-' + round);
    // ---- walking: stand up, random keys, sit back down ----
    if (!s.seated && s.phase === 'day' && !s.os) { await page.eval(() => { const T = window.__tli; if (T.G.paused) T.Game.pause(false); return true; }); }
    if (s.seated && s.phase === 'day') {
      await page.eval(() => { standUp(); return true; });
      await page.wait(300);
      await page.eval(() => {
        const T = window.__tli, R = window.__rnd, K = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ShiftLeft'];
        for (let i = 0; i < 6; i++) T.Keys[K[Math.floor(R() * K.length)]] = R() < 0.5;
        const keys = ['KeyQ', 'KeyF', 'KeyG', 'KeyC', 'KeyE', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6'];
        for (let i = 0; i < 8; i++) { const c = keys[Math.floor(R() * keys.length)]; window.dispatchEvent(new KeyboardEvent('keydown', { code: c, key: c.slice(-1).toLowerCase(), bubbles: true })); window.dispatchEvent(new KeyboardEvent('keyup', { code: c, bubbles: true })); }
        Props.startUse(); setTimeout(() => Props.endUse(), 400);
        return true;
      });
      await Q.gw(1.5, 20000);
      await page.eval(() => { const T = window.__tli; for (const k in T.Keys) T.Keys[k] = false; if (T.P.third) setThird(false); return true; });
      Q.check('round ' + round + ': walking with random keys threw nothing', page.errors.length === errs0, page.errors.slice(errs0, errs0 + 5));
      if (round === 2) await Q.shot('monkey-walk-' + round);
      const free = await page.eval(() => { const T = window.__tli; return T.W.desks.findIndex((d, i) => !d.npc && !T.Game.deskTaken(i)); });
      await page.sit(free); await Q.desktop();
    }
    if ((await page.eval(() => window.__tli.G.phase)) !== 'day') break;
  }
  Q.log('actions', log.length);
  Q.check('the shift is still running and the game responds', await page.eval(() => window.__tli.G.phase === 'day'));
  await Q.done();
};
