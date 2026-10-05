/* UI polish scenario: title screen, sub-menus, settings tabs, day card, walking HUD (stats, prompt, controls panel),
   multiplayer lobby card (faked Net state), pause menu with the room code, toasts.  UI_ONLY=menu,settings,hud,lobby runs some parts. */
module.exports = async page => {
  const ev = page.eval, want = k => !process.env.UI_ONLY || process.env.UI_ONLY.split(',').includes(k);
  const click = sel => ev(s => { const b = [...document.querySelectorAll(s.q)].find(x => !s.t || new RegExp(s.t, 'i').test(x.textContent)); if (!b) throw new Error('no button ' + s.q + ' ' + s.t); b.click(); return true; }, sel);
  // software rendering is slow: let the page paint two fresh frames before each screenshot
  const shot = async n => { await ev(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => r(true))))); await page.wait(150); return page.shot(n); };
  const check = (name, ok, info) => { console.log((ok ? 'OK   ' : 'FAIL ') + name + (info ? ' ' + JSON.stringify(info) : '')); if (!ok) throw new Error('check failed: ' + name); };
  await page.wait(1200);
  if (want('menu')) {
    await shot('ui-01-home');
    const btns = await ev(() => [...document.querySelectorAll('#menu .home-btns .btn')].map(b => b.querySelector('.ml b') ? b.querySelector('.ml b').textContent : b.textContent));
    check('home buttons incl. Character', btns.join() === 'Singleplayer,Multiplayer,Character,Settings,How to play', btns);
    await click({ q: '#menu .home-btns .btn', t: 'singleplayer' }); await page.wait(400);
    await shot('ui-02-solo');
    await click({ q: '#menu .back' }); await click({ q: '#menu .home-btns .btn', t: 'multiplayer' }); await page.wait(400);
    await shot('ui-03-multi-host');
    await click({ q: '#menu .seg button', t: 'join' }); await ev(() => { document.querySelector('.code-inp').value = 'BONK'; return true; }); await page.wait(300);
    await shot('ui-04-multi-join');
    await click({ q: '#menu .seg button', t: 'host' });
    await click({ q: '#menu .screen.on .back' }); await click({ q: '#menu .home-btns .btn', t: 'how to play' }); await page.wait(400);
    await shot('ui-05-how');
    await click({ q: '#menu .screen.on .back' });
  }
  if (want('settings')) {
    await ev(() => { window.__tli.UI.openSettings(); return true; }); await page.wait(400);
    await shot('ui-06-settings-player');
    for (const [tab, n] of [['sound', '07'], ['ai', '08'], ['controls', '09'], ['graphics', '10']]) {
      await click({ q: '#set-tabs button', t: tab }); await page.wait(250); await shot('ui-' + n + '-settings-' + tab);
    }
    await ev(() => { window.__tli.UI.closeSettings(); return true; });
  }
  await page.startSolo('week');
  if (want('hud')) {
    await ev(() => { const T = window.__tli; T.UI.dayCard('Monday', 'Team quota $400'); return true; });
    await page.wait(700);
    await shot('ui-11-daycard');
    await page.wait(2600);
    // stand in front of a free desk so the interaction prompt shows
    await ev(() => { const T = window.__tli, d = T.W.desks.find(x => !x.npc); const P = T.P; P.pos.x = d.stand.x; P.pos.z = d.stand.z; const dx = d.seat.x - d.stand.x, dz = d.seat.z - d.stand.z; P.yaw = Math.atan2(-dx, -dz); P.pitch = -0.35; T.G.personal = 150; T.G.team = 150; return true; });
    await page.wait(900);
    const st = await ev(() => ({ prompt: !document.getElementById('hud-prompt').classList.contains('hidden'), hint: document.getElementById('hud-hint').className, keyhint: getComputedStyle(document.getElementById('keyhint') || document.body).display }));
    await shot('ui-12-hud-walk');
    check('prompt + full controls panel, props keyhint folded in', st.prompt && !/mini|hidden/.test(st.hint) && st.keyhint === 'none', st);
    await ev(() => { const T = window.__tli; T.UI.hintUntil = 0; T.G.timeLeft = 42; setTimeout(() => T.UI.hud(), 50); toast('Motivational posters: +$10 synergy bonus.', 'good'); toast('Agent Kim closed a scam: +$250', 'good'); toast('You got baited: -$120', 'bad'); toast('Room code copied.'); T.Call.state = 'ringing'; return true; });
    await page.wait(700);
    const mini = await ev(() => document.getElementById('hud-hint').className);
    await shot('ui-13-hud-mini-toasts');
    check('controls panel collapses to the H tab', /mini/.test(mini), { mini });
    await ev(() => { window.__tli.Call.state = 'idle'; return true; });
    // H opens it again
    await ev(() => { window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyH' })); return true; });
    const reopened = await ev(() => document.getElementById('hud-hint').className);
    check('H reopens the controls', !/mini/.test(reopened), { reopened });
    await ev(() => { window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyH' })); return true; });
  }
  if (want('lobby')) {
    // fake a multiplayer lobby: room code card, players, pause menu with a copyable code
    await ev(() => {
      const T = window.__tli, N = T.Net; window.__auth = T.Game.authority; T.Game.authority = () => true;
      N.active = true; N.isHost = false; N.room = 'BONKZ';
      N.players.set('me', { name: T.settings.name, color: T.settings.color }); N.players.set('p2', { name: 'Priya', color: '#ef4444' }); N.players.set('p3', { name: 'Marcus', color: '#22c55e' });
      T.G.phase = 'lobby'; T.UI.hud(); return true;
    });
    await page.wait(400);
    await shot('ui-14-lobby');
    await ev(() => { window.__tli.Game.pause(true); return true; }); await page.wait(400);
    const pr = await ev(() => document.querySelectorAll('#pause-room .rc-letters b').length);
    await shot('ui-15-pause-room');
    check('pause menu shows the room code', pr === 5, { pr });
    await ev(() => { const T = window.__tli, N = T.Net; T.Game.pause(false); N.active = false; N.room = ''; N.players.clear(); T.Game.authority = window.__auth; T.G.phase = 'day'; T.UI.hud(); return true; });
  }
  await ev(() => { window.__tli.Game.pause(true); return true; }); await page.wait(400);
  await shot('ui-16-pause');
  await ev(() => { window.__tli.Game.pause(false); return true; });
};
