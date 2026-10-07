'use strict';
/* =====================================================================
   INPUT + MAIN LOOP
   ===================================================================== */
let _lockT = 0;
document.addEventListener('pointerlockchange', () => { _lockT = now(); });
window.addEventListener('keydown', e => {
  const tag = e.target && e.target.tagName, typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
  if (e.code === 'Escape') {
    if (UI.settingsOpen) UI.closeSettings();
    else if (G.phase !== 'menu' && now() - _lockT > 0.3) Game.pause(!G.paused);
    return;
  }
  if (typing || G.phase === 'menu') return;
  Keys[e.code] = true;
  if (e.code === 'KeyE' && W.cur && Game.canControl()) W.cur.act();
  if (e.code === 'KeyV') { Voice.ptt = true; Voice.applyMode(); }
  if (e.code === 'Enter' && G.phase === 'lobby' && !P.seated && !G.paused) Game.startShift();
  if (!P.seated && (e.code === 'Space' || e.code.startsWith('Arrow'))) e.preventDefault();
});
window.addEventListener('keyup', e => { Keys[e.code] = false; if (e.code === 'KeyV') { Voice.ptt = false; Voice.applyMode(); } });
window.addEventListener('blur', () => { for (const k in Keys) Keys[k] = false; Voice.ptt = false; Voice.applyMode(); });
window.addEventListener('pointerdown', () => AudioSys.resume(), { capture: true });

let _last = 0, _t = 0, _uiT = 0;
function frame(ts) {
  const dt = Math.min(0.05, (ts - _last) / 1000 || 0.016); _last = ts;
  const wdt = G.paused && !Net.active ? 0 : dt; _t += wdt;   // a solo pause freezes the world too (particles, props, chaos goods, coffee)
  Game.tick(dt); updateWorld(wdt, _t); Loop.run(wdt, _t); Net.tick(dt); Voice.update();
  _uiT += dt;
  if (_uiT > 0.2) { _uiT = 0; if (G.phase !== 'menu') { if (OS.open) OS.stats(); else UI.hud(); } }
  else if (G.phase !== 'menu' && !OS.open) { const pr = $('#hud-prompt'), lab = W.cur && W.cur.label(); if (!lab !== pr.classList.contains('hidden')) UI.hud(); }
  if (!(OS.open && P.seated && !P.cam)) renderWorld();
  Loop.runRender(wdt, _t);
  requestAnimationFrame(frame);
}
function boot() {
  const fail = msg => document.body.append(h('div', { class: 'overlay' }, h('div', { class: 'modal' }, h('div', { class: 'body', style: { borderTop: 0 } }, h('h2', {}, 'Could not start'), h('p', {}, msg)))));
  if (!window.THREE) return fail('The 3D engine did not load. Check your internet connection and reload the page.');
  try { initWorld(); } catch (e) { console.error(e); return fail('This browser or device could not start WebGL, which the game needs for 3D.'); }
  OS.build(); UI.build(); Bus.emit('boot');
  window.__tli = { G, Game, Call, Net, Voice, OS, W, P, UI, settings, Saves, AI, STT, Phone, Keys, Bus, Loop, Shop, Inv, ItemDefs };
  requestAnimationFrame(frame);
}
if (window.THREE) boot(); else { window.__threeLate = boot; setTimeout(() => { if (!window.THREE && !window.__tli) boot(); }, 6000); }
