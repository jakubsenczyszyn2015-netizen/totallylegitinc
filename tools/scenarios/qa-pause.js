/* QA: the wall clock follows the shift; a solo pause freezes the whole world (a box in mid-air, particles, a BonkMart chaos delivery on its way, the
   coffee boost) and everything carries on after; speech bubbles are hidden by walls (The Boss in his office, seen
   from the hall); a BonkMart "Hold to buy" still held when the shift ends does not buy anything during the review.
   Run: xvfb-run -a -s "-screen 0 1920x1080x24" ./node_modules/.bin/electron --no-sandbox --enable-unsafe-swiftshader tools/harness.js tools/scenarios/qa-pause.js 1280x720 <outdir> */
module.exports = async page => {
  const Q = require('./qa-lib')(page);
  await page.eval(() => { const T = window.__tli; T.Saves.week = [null, null, null]; T.Saves.endless = null; writeSaves(); return true; });
  await page.startSolo('week');

  // ---------- the wall clock shows the shift time (4 PM to midnight) like the LegitOS taskbar ----------
  const clk = await page.eval(async () => { const T = window.__tli, t0 = T.G.timeLeft; T.G.timeLeft = T.G.dayLen / 2; await new Promise(r => setTimeout(r, 300)); const hr = ((-CLOCK.h.rotation.z / (Math.PI * 2) * 12) % 12 + 12) % 12; T.G.timeLeft = t0; return +hr.toFixed(2); });
  Q.check('wall clock at mid-shift shows 8 PM', Math.abs(clk - 8) < 0.1, clk);

  // ---------- solo pause freezes the world ----------
  await page.teleport(8, 0, Math.PI / 2, -0.1);
  await Q.gw(0.3);
  const snap = () => page.eval(() => { const T = window.__tli, b = Props.byId.get('qa-box'); return { y: b ? +b.pos.y.toFixed(4) : null, boost: +T.P.boost.toFixed(3), boom: window.__boom, t: +T.W.t.toFixed(3), left: +T.G.timeLeft.toFixed(2) }; });
  await page.eval(() => {
    const T = window.__tli; T.P.boost = 20; window.__boom = 0; Chaos.after(1.2, () => { window.__boom++; });
    Props.spawn('box', [6.2, 2.6, 0], [0, 0.5, 0], { id: 'qa-box' }); FX.spawn('confetti', [6.2, 1.6, 0], { n: 60 });
    return true;
  });
  await Q.gw(0.15);
  await Q.press('Escape');
  const a = await snap();
  await page.wait(2500);
  const b = await snap();
  Q.check('Esc pauses (solo)', await page.eval(() => window.__tli.G.paused));
  Q.check('paused: the box hangs in the air, the boost, the chaos delivery and the clock wait', a.y > 0.5 && a.y === b.y && a.boost === b.boost && b.boom === 0 && a.left === b.left && a.t === b.t, { a, b });
  Q.check('paused: the hotbar and the raid heat HUD hide behind the pause menu', await page.eval(() => HUDBar.el.classList.contains('hidden') && RaidUI.el.hud.classList.contains('hidden')));
  await Q.shot('pause-01-frozen');
  await Q.press('Escape');
  await Q.gw(2);
  const c = await snap();
  Q.check('unpaused: the hotbar is back', await page.eval(() => !HUDBar.el.classList.contains('hidden')));
  Q.check('unpaused: the box lands, the delivery arrives, the boost and the clock run again', c.y < 0.5 && c.boom === 1 && c.boost < b.boost && c.left < b.left, c);

  // ---------- speech bubbles are hidden by walls ----------
  const bub = await page.eval(() => { const T = window.__tli; if (T.W.doors.boss.isOpen) T.W.doors.boss.close(); placeBoss(false); const g = T.W.boss.group.position, ry = T.W.boss.group.rotation.y; return { x: g.x, z: g.z, ry }; });
  // in the hall, facing the closed boss office wall, The Boss talking behind it
  await page.teleport(bub.x, -0.6, Math.PI, 0.25);
  await page.eval(() => { FX.bubble(window.__tli.W.boss, 'Did you just...?', 30); return true; });
  await Q.gw(0.4);
  const mat = await page.eval(() => { let d = null; window.__tli.W.scene.traverse(o => { if (o.isSprite && o.renderOrder === 30 && o.visible && o.material.map && o.material.map.image && o.material.map.image.width === 512) d = o.material.depthTest; }); return d; });
  Q.check('speech bubbles are depth-tested (walls hide them)', mat === true, mat);
  await Q.shot('pause-02-bubble-behind-wall');
  // inside the office the same bubble shows
  await page.eval(() => { const T = window.__tli; T.W.doors.boss.open(); return true; });
  await page.teleport(bub.x - Math.sin(bub.ry) * 2.2, bub.z - Math.cos(bub.ry) * 2.2, bub.ry + Math.PI, 0.12);   // in front of him, looking at him
  await Q.gw(0.6);
  await Q.shot('pause-03-bubble-in-office');

  // ---------- a hold to buy that outlives the shift ----------
  await Q.sit();
  await Q.hush();
  await page.eval(() => { const T = window.__tli; T.G.wallet = 5000; T.OS.launch('shop', true); return true; });
  await page.wait(700);
  await Q.click('.win .bm-tab', /Physical/, 900);
  const late = await page.eval(() => { const T = window.__tli, t0 = T.G.timeLeft; T.G.timeLeft = 8; const b = bmBlocked(Shop.items.get('chaos_rival')); T.G.timeLeft = t0; return b; });
  Q.check('the rival airstrike (its team bonus lands ~6 s later) is blocked in the last seconds of a shift', /late/i.test(late), late);
  const h = await page.eval(() => {
    const T = window.__tli, card = [...document.querySelectorAll('.win .bm-card')].find(c => /Party Popper/.test(c.textContent)); if (!card) return null;
    window.__n0 = T.Inv.count('confetti'); window.__w0 = T.G.wallet;
    card.querySelector('.bm-btn').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    T.G.timeLeft = 0.01; return true;   // the shift ends while the button is held
  });
  await Q.waitFor(() => window.__tli.G.phase === 'review', 8000, 50);
  await page.wait(1500);
  const r = await page.eval(() => ({ phase: window.__tli.G.phase, got: window.__tli.Inv.count('confetti') - window.__n0, paid: window.__w0 - window.__tli.G.wallet }));
  Q.check('a BonkMart hold still down when the shift ends buys nothing in the review', h && r.phase === 'review' && r.got === 0 && r.paid === 0, r);
  await Q.done();
};
