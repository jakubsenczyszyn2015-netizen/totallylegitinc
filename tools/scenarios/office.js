/* Office scenario: screenshots of the office from viewpoints comparable to the references,
   plus a few contract checks (desks, doors, rooms, screens, leaderboard, projector). */
module.exports = async page => {
  // software rendering is slow: wait for a few real frames before every screenshot
  const frames = (n = 3) => page.eval(n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r(true) : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
  const snap = async (name, n) => { await frames(n); await page.wait(250); await page.shot(name); };
  const cam = async (name, pos, look, n) => { await page.eval((p, l) => { window.__tli.W.camOverride = { pos: p, look: l }; return true; }, pos, look); await snap(name, n); };
  const free = () => page.eval(() => { window.__tli.W.camOverride = null; return true; });
  await page.wait(1200);
  await page.shot('01-menu');
  const info = await page.eval(() => {
    const W = window.__tli.W;
    return { desks: W.desks.length, npc: W.desks.filter(d => d.npc).length, colliders: W.colliders.length, interact: W.interact.length, bins: W.bins.length,
      calls: W.renderer.info.render.calls, tris: W.renderer.info.render.triangles, doors: Object.keys(W.doors), rooms: Object.keys(W.rooms),
      seats: REVIEW_SEATS.length, lb: !!(W.leaderboard && W.leaderboard.update), proj: !!(W.projector && W.projector.draw), spawn: W.spawn.players.length + '/' + W.spawn.police.length };
  });
  console.log('office info: ' + JSON.stringify(info));
  await page.startSolo('week');
  await frames(3);
  console.log('fps: ' + await page.eval(() => new Promise(r => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else r(n / 2); }; requestAnimationFrame(f); })));
  await snap('02-spawn');
  console.log('draw calls at spawn: ' + await page.eval(() => window.__tli.W.renderer.info.render.calls));
  await cam('03-high', [6.2, 3.0, -3.2], [-3, 0, 2.2]);
  // ref03-style top-down views with the drop ceiling hidden
  await page.eval(() => { window.__tli.W.setCeiling(false); return true; });
  await cam('04-topdown', [2.6, 7.2, -6.4], [-2.6, 0, 0.6]);
  await cam('04b-topdown-wide', [4.5, 15, -12], [3.5, 0, 0]);
  await page.eval(() => { window.__tli.W.setCeiling(true); return true; });
  await free();
  await page.teleport(-0.6, 7.6, 0, -0.06); await snap('05-aisle');
  // standing at a desk, looking at the monitor (ref27)
  await page.eval(() => { const T = window.__tli, d = T.W.desks[0]; T.P.pos.x = d.stand.x; T.P.pos.z = d.stand.z; T.P.yaw = d.rot; T.P.pitch = -0.42; return true; });
  await snap('06-at-desk');
  await page.eval(() => { const T = window.__tli, d = T.W.desks[0]; T.W.camOverride = { pos: [d.eye.x, d.eye.y, d.eye.z], look: [d.eye.x - Math.sin(d.rot), d.eye.y - 0.08, d.eye.z - Math.cos(d.rot)] }; return true; });
  await snap('06b-seated-eye');
  await page.teleport(8, 0, -Math.PI / 2, 0);   // away from interactables (no prompt in the shots)
  await cam('07-break-room', [10.7, 1.65, 2.5], [14.6, 1.05, 7.2]);
  await cam('08-whiteboard', [12.6, 1.6, 5.1], [15.9, 1.5, 5.1]);
  await page.eval(() => { window.__tli.W.projector.draw((g, w, h) => { g.fillStyle = '#2a0606'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = '40px sans-serif'; g.textAlign = 'center'; g.fillText('QUOTA MISSED BY $1,000', w / 2, 200); g.fillStyle = '#ff2a2a'; g.font = '110px "Alfa Slab One"'; g.fillText("YOU'RE FIRED!", w / 2, 340); }); return true; });
  await cam('09-review', [12.2, 1.35, -5.4], [19.9, 1.5, -5.4]);
  await page.eval(() => { window.__tli.W.projector.clear(); return true; });
  await cam('09b-review-idle', [13.4, 1.25, -4.4], [19.9, 1.6, -5.6]);
  await cam('10-leaderboard', [7.9, 1.7, -2.4], [10, 1.85, -5.6]);
  await cam('11-boss', [16.9, 1.7, 2.4], [19, 1.0, 7.2]);
  await page.eval(() => { window.__tli.W.doors.main.open(); return true; });
  await cam('12-hall-door', [11.2, 1.65, 0.6], [20.5, 1.2, -0.2], 12);
  await cam('12b-raid-view', [23.6, 1.7, 0.9], [12, 1.1, -0.4]);   // what the police see from the lobby
  await page.eval(() => { window.__tli.W.doors.main.close(); return true; });
  // monitor in ring mode (ref11): sit, stand up, ring
  await free();
  await page.eval(() => { window.__tli.W.camOverride = null; sitAt(0); return true; }); await page.wait(250);
  console.log('screen right after sitting: ' + await page.eval(() => window.__tli.W.deskScreen(0)));
  await page.wait(700); await page.stand();
  await page.ring(false); await frames(2);
  console.log('ring state: ' + JSON.stringify(await page.eval(() => { const T = window.__tli; return { state: T.Call.state, mode: T.W.deskScreen(0) }; })));
  await page.eval(() => { const T = window.__tli, d = T.W.desks[0]; T.P.pos.x = d.stand.x + 1.4; T.P.pos.z = d.stand.z + 0.9; T.P.yaw = d.rot + 0.55; T.P.pitch = -0.2; return true; });
  await snap('13-ring');
  await page.eval(() => { window.__tli.Call.decline(); return true; });
  // forced screen modes: desktop / off / saver side by side
  await page.eval(() => { const W = window.__tli.W; W.setDeskScreen(0, 'desktop'); W.setDeskScreen(2, 'off'); W.setDeskScreen(4, 'boot'); return [W.deskScreen(0), W.deskScreen(2), W.deskScreen(4)]; }).then(m => console.log('modes: ' + JSON.stringify(m)));
  await page.teleport(8, 0, -Math.PI / 2, 0);
  await cam('14-modes', [9.5, 1.65, -3.7], [6.6, 1.05, -3.7]);
  await page.eval(() => { const W = window.__tli.W; W.setDeskScreen(0, null); W.setDeskScreen(2, null); W.setDeskScreen(4, null); W.camOverride = null; return true; });
  // quality switches rebuild shadows/materials at runtime
  await page.eval(() => { const T = window.__tli; T.settings.quality = 'low'; applyQuality(); return true; });
  await page.teleport(8.6, 0, Math.PI / 2, 0); await snap('15-low');
  await page.eval(() => { const T = window.__tli; T.settings.quality = 'high'; applyQuality(); return true; });
  await snap('16-high');
};
