/* Clock out early: the punch clock (E) and the pause-menu button end a solo shift (confirm box -> review), the LegitOS
   start menu item, hidden outside week-mode days, and the multiplayer vote with faked Net players (host counting,
   F1/F2, a failed vote + cooldown, players leaving / joining mid-vote, a timeout, the client side).
   CO_ONLY=solo,vote runs one part. */
module.exports = async page => {
  const ev = page.eval, want = k => !process.env.CO_ONLY || process.env.CO_ONLY.split(',').includes(k);
  const shot = async n => { await ev(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => r(true))))); await page.wait(150); return page.shot(n); };
  const check = (name, ok, info) => { console.log((ok ? 'OK   ' : 'FAIL ') + name + (info !== undefined ? ' ' + JSON.stringify(info) : '')); if (!ok) throw new Error('check failed: ' + name); };
  const key = code => ev(c => { window.dispatchEvent(new KeyboardEvent('keydown', { code: c, bubbles: true })); return true; }, code);
  const freshDay = () => ev(() => { const T = window.__tli; if (T.G.phase === 'review') T.Game.retryDay(); const dc = document.getElementById('daycard'); dc.classList.remove('on'); T.G.timeLeft = 200; return T.G.phase; });
  await ev(() => { document.head.append(Object.assign(document.createElement('style'), { textContent: '#daycard{display:none!important}.toast{animation:none!important}' })); return true; });
  await page.startSolo('week');
  await ev(() => { window.__tli.G.timeLeft = 200; return true; });

  if (want('solo')) {
    // 1. the punch clock on the hallway wall: E -> confirm -> review
    await page.teleport(18.62, 0.35, Math.PI, -0.18);
    await page.wait(700);
    const lab = await ev(() => { const W = window.__tli.W; return W.cur ? W.cur.label() : null; });
    check('punch clock prompt', lab === 'Clock out early', lab);
    await shot('co-01-punch-clock');
    await ev(() => { window.__tli.W.cur.act(); return true; });
    await page.wait(400);
    check('confirm box open', await ev(() => !!document.getElementById('co-confirm')));
    await shot('co-02-confirm');
    await ev(() => { [...document.querySelectorAll('#co-confirm .btn')].find(b => /clock out now/i.test(b.textContent)).click(); return true; });
    await page.wait(600);
    const r1 = await ev(() => { const G = window.__tli.G; return { phase: G.phase, early: G.result && G.result.early, line: G.result && G.result.lines.join(' | ') }; });
    check('punch clock ends the day', r1.phase === 'review' && r1.early > 0 && /clock|early/i.test(r1.line), r1);
    await page.wait(1500);
    await shot('co-03-review');
    // 2. pause menu button -> confirm -> Enter
    check('back to work', (await freshDay()) === 'day');
    await page.wait(500);
    await ev(() => { window.__tli.Game.pause(true); return true; });
    await page.wait(300);
    const pb = await ev(() => { const b = document.getElementById('pause-clockout'); return b && !b.classList.contains('hidden') && b.textContent; });
    check('pause menu button', pb === 'Clock out early', pb);
    await shot('co-04-pause');
    await ev(() => { document.getElementById('pause-clockout').click(); return true; });
    await page.wait(300);
    // Esc closes the box and keeps the pause menu
    await key('Escape');
    const esc = await ev(() => ({ dlg: !!document.getElementById('co-confirm'), paused: window.__tli.G.paused }));
    check('Esc closes the confirm box only', !esc.dlg && esc.paused, esc);
    await ev(() => { document.getElementById('pause-clockout').click(); return true; });
    await page.wait(200);
    await key('Enter');
    await page.wait(500);
    const r2 = await ev(() => ({ phase: window.__tli.G.phase, paused: window.__tli.G.paused, pauseHidden: document.getElementById('pause').classList.contains('hidden') }));
    check('pause button ends the day', r2.phase === 'review' && !r2.paused && r2.pauseHidden, r2);
    // 3. hidden outside a week-mode day
    const hid = await ev(() => {
      const T = window.__tli, out = {};
      T.Game.pause(true); out.review = document.getElementById('pause-clockout').classList.contains('hidden'); T.Game.pause(false);
      T.G.mode = 'endless'; T.G.phase = 'day'; out.endless = ClockOut.label() === null && !ClockOut.available();
      T.G.mode = 'week'; T.G.phase = 'lobby'; out.lobby = ClockOut.label() === null; T.G.phase = 'review';
      return out;
    });
    check('hidden in the review, endless and the lobby', hid.review && hid.endless && hid.lobby, hid);
    await freshDay();
    // 4. LegitOS start menu
    await page.sit();
    await ev(() => { window.__tli.OS.power(true); return true; });
    await page.wait(300);
    const pm = await ev(() => { const b = document.querySelector('#powermenu .co-pm'); return b && b.textContent; });
    check('start menu item', /clock out early/i.test(pm || ''), pm);
    await shot('co-05-start-menu');
    await ev(() => { document.querySelector('#powermenu .co-pm').click(); return true; });
    await page.wait(300);
    check('start menu opens the confirm box', await ev(() => !!document.getElementById('co-confirm')));
    await ev(() => { [...document.querySelectorAll('#co-confirm .btn')].find(b => /keep working/i.test(b.textContent)).click(); return true; });
    await page.stand();
  }

  if (want('vote')) {
    // fake a 3-player room with us as the host; record what we send
    await ev(() => {
      const T = window.__tli, N = T.Net; window.__sent = []; window.__emit = N.emit;
      N.emit = (k, p, o) => { window.__sent.push({ k, p, o: o || {} }); };
      N.active = true; N.isHost = true; N.myId = 'me'; N.room = 'BONKZ'; N.players.clear();
      N.players.set('me', { name: T.settings.name, color: T.settings.color });
      N.players.set('p2', { name: 'Priya', color: '#ef4444', x: 17.2, y: 0, z: -0.6, ry: 1.2, seat: -1 });
      N.players.set('p3', { name: 'Marcus', color: '#22c55e', x: 16.6, y: 0, z: 0.8, ry: 2, seat: -1 });
      ClockOut.VOTE_S = 120;      // the harness is slow: keep the vote open while we look at it
      return true;
    });
    await freshDay();
    await page.sit();
    await ev(() => { ClockOut.hostStart('p2'); return true; });
    await page.wait(500);
    const v1 = await ev(() => ({ view: ClockOut.view, shown: !document.getElementById('co-vote').classList.contains('hidden'), title: document.querySelector('#co-vote .cv-title').textContent }));
    check('vote started by Priya, panel over the desktop', v1.shown && v1.view.total === 3 && v1.view.need === 2 && v1.view.yes.join() === 'p2' && /Priya wants/.test(v1.title), v1);
    await shot('co-06-vote-desktop');
    // F2 = no from us, then Marcus says no -> 1 yes can no longer reach 2 -> fails, cooldown
    await key('F2');
    const v2 = await ev(() => ({ no: ClockOut.view.no, mine: ClockOut.myVote() }));
    check('F2 votes no', v2.no.includes('me') && v2.mine === false, v2);
    await ev(() => { window.__tli.Net._x({ k: 'co:vote', p: { n: ClockOut.view.n, yes: false } }, 'p3'); return true; });
    await page.wait(300);
    const v3 = await ev(() => ({ view: ClockOut.view, result: ClockOut.result, cool: ClockOut.cooldown(), sent: window.__sent.filter(m => m.k === 'co:result').map(m => m.p), phase: window.__tli.G.phase }));
    check('vote fails, result broadcast, cooldown', !v3.view && v3.result && !v3.result.pass && v3.cool > 50 && v3.sent.length === 1 && v3.phase === 'day', v3);
    await shot('co-07-vote-failed');
    await ev(() => { ClockOut.hostStart('p3'); return true; });
    const v4 = await ev(() => window.__sent.filter(m => m.k === 'co:msg').map(m => [m.o.to, m.p.text]));
    check('cooldown refuses a new vote', v4.length === 1 && v4[0][0] === 'p3', v4);
    // players leaving and joining mid-vote
    await page.stand();
    await page.teleport(14.5, 0, -Math.PI / 2, -0.05);
    await ev(() => { ClockOut.cool = 0; ClockOut.result = null; ClockOut.hostStart('p2'); window.__tli.Net.players.set('p4', { name: 'Dana', color: '#f59e0b', x: 16, y: 0, z: 0, ry: 0, seat: -1 }); ClockOut.hostUpdate(); return true; });
    const v5 = await ev(() => ({ total: ClockOut.view.total, need: ClockOut.view.need }));
    check('late joiner counts', v5.total === 4 && v5.need === 3, v5);
    await ev(() => { window.__tli.Net.players.delete('p4'); ClockOut.hostUpdate(); return true; });
    await page.wait(400);
    await shot('co-08-vote-walking');
    await ev(() => { window.__tli.Net.players.delete('p2'); ClockOut.hostUpdate(); return true; });
    const v6 = await ev(() => ClockOut.view && { yes: ClockOut.view.yes.length, total: ClockOut.view.total, need: ClockOut.view.need });
    check('starter left: vote keeps running without their yes', v6 && v6.yes === 0 && v6.total === 2 && v6.need === 2, v6);
    // F1 from us + Marcus yes -> passes -> review after a moment
    await key('F1');
    await ev(() => { window.__tli.Net._x({ k: 'co:vote', p: { n: ClockOut.view.n, yes: true } }, 'p3'); return true; });
    const v7 = await ev(() => ({ result: ClockOut.result, phase: window.__tli.G.phase }));
    check('majority passes', v7.result && v7.result.pass && v7.result.yes === 2 && v7.phase === 'day', v7);
    await page.wait(300);
    await shot('co-09-vote-passed');
    await page.wait(1800);
    const v8 = await ev(() => ({ phase: window.__tli.G.phase, early: window.__tli.G.result && window.__tli.G.result.early }));
    check('passed vote ends the day on the host', v8.phase === 'review' && v8.early > 0, v8);
    // a vote nobody answers times out
    await freshDay();
    await ev(() => { window.__tli.Net.players.set('p2', { name: 'Priya', color: '#ef4444' }); ClockOut.hostStart('me'); ClockOut.vote.end = now() - 1; return true; });
    await page.wait(800);
    const v9 = await ev(() => ({ view: ClockOut.view, result: ClockOut.result }));
    check('silent players count as no: timeout fails', !v9.view && v9.result && !v9.result.pass && v9.result.yes === 1 && v9.result.total === 3, v9);
    // client side: state from the host, F1 sends a vote to the host, result message
    await ev(() => { const N = window.__tli.Net; N.isHost = false; ClockOut.result = null; ClockOut.vote = null; ClockOut.cool = 0;
      ClockOut.applyShared({ n: 7, by: 'p2', name: 'Priya', yes: ['p2'], no: [], left: 21, total: 3, need: 2 }); return true; });
    await key('F1');
    await page.wait(300);
    const c1 = await ev(() => ({ sent: window.__sent.filter(m => m.k === 'co:vote').map(m => [m.p, m.o.host]), voted: document.getElementById('co-vote').className, mine: ClockOut.myVote() }));
    check('client F1 sends the vote to the host', c1.sent.length === 1 && c1.sent[0][0].n === 7 && c1.sent[0][0].yes === true && c1.sent[0][1] === true && /voted/.test(c1.voted) && c1.mine === true, c1);
    await shot('co-10-vote-client');
    await ev(() => { window.__tli.Net._x({ k: 'co:result', p: { n: 7, pass: false, yes: 1, total: 3, name: 'Priya' } }, 'host'); return true; });
    const c2 = await ev(() => ({ result: ClockOut.result, view: ClockOut.view }));
    check('client shows the result', c2.result && !c2.result.pass && !c2.view, c2);
    await ev(() => { const N = window.__tli.Net; N.emit = window.__emit; N.active = false; N.isHost = false; N.room = ''; N.players.clear(); ClockOut.VOTE_S = 30; ClockOut.reset(); return true; });
  }
};
