/* Clock out early (singleplayer): the punch clock by the main door, the confirm time card, the review that follows,
   and the pause / start menu entries. The multiplayer vote is in mp-clockout.js.
   Run: tools/harness.js tools/scenarios/clockout.js 1280x720 <outdir> */
module.exports = async page => {
  const shot = async n => { await page.wait(1300); await page.shot(n); };   // software WebGL: give the compositor time to catch up
  const ok = (name, v, d) => { console.log((v ? 'OK   ' : 'FAIL ') + name + (d !== undefined ? '  ' + JSON.stringify(d) : '')); if (!v) page.errors.push('check failed: ' + name); };
  await page.startSolo('week');
  await page.eval(() => { G.team = 150; return true; });
  // stand in front of the punch clock, looking at it
  await page.teleport(18.75, -1.25, -Math.PI / 2 - 0.12, 0.08);
  await page.wait(500);
  const lab = await page.eval(() => W.cur && W.cur.label());
  ok('punch clock prompt', lab === 'Clock out early', lab);
  await shot('co01-clock');
  await page.teleport(19.35, -1.38, -Math.PI / 2, 0.02);
  await page.wait(400);
  await shot('co02-clock-close');
  await page.teleport(18.75, -1.25, -Math.PI / 2 - 0.12, 0.08);
  await page.wait(300);
  // E opens the time card
  await page.eval(() => { window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' })); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE' })); return true; });
  await page.wait(500);
  ok('confirm card open', await page.eval(() => ClockOut.open));
  await shot('co03-confirm');
  // Esc closes it without pausing
  await page.eval(() => { window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape' })); return true; });
  await page.wait(300);
  ok('Esc closes the card, no pause', await page.eval(() => !ClockOut.open && !G.paused));
  // pause menu entry
  await page.eval(() => { Game.pause(true); return true; });
  await page.wait(300);
  ok('pause menu has the clock-out button', await page.eval(() => { const b = document.querySelector('#pause .co-pause'); return b && !b.classList.contains('hidden') && b.textContent; }));
  await shot('co04-pause');
  await page.eval(() => { document.querySelector('#pause .co-pause').click(); return true; });
  await page.wait(300);
  ok('card over the pause menu', await page.eval(() => ClockOut.open));
  await page.eval(() => { window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter' })); return true; });
  await page.wait(800);
  const st = await page.eval(() => ({ phase: G.phase, paused: G.paused, early: G.result && G.result.early, line: G.result && G.result.lines[1], pass: G.result && G.result.pass }));
  ok('Enter punches out: review with res.early', st.phase === 'review' && !st.paused && st.early > 200 && /clock/.test(st.line), st);
  await page.wait(1500);
  await shot('co05-review');
  await page.eval(() => { Review.seek(Review.state.sheetAt + 0.5); return true; });
  await page.wait(1200);
  await shot('co06-report');
  // try again: back to day 1, the start menu shows the entry while seated
  await page.eval(() => { Game.retryDay(); return true; });
  await page.wait(800);
  await page.sit();
  await page.eval(() => { OS.power(true); return true; });
  await page.wait(300);
  ok('LegitOS start menu entry', await page.eval(() => { const b = document.querySelector('#powermenu .pm-item.co'); return b && b.textContent; }));
  await shot('co07-startmenu');
  await page.eval(() => { OS.power(false); return true; });
  // endless: no clock to punch
  await page.eval(() => { G.mode = 'endless'; return true; });
  ok('no clock out in overtime', await page.eval(() => { ClockOut.request(); return !ClockOut.open; }));
};
