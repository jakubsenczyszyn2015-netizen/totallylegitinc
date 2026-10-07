/* QA: smaller things found in the final pass. Walking into The Boss / a seated coworker (you stay outside them),
   a burst of toasts (at most 5 on screen), the form scheme's verification box after a scambaiter (says the details
   were fake).
   Run: xvfb-run -a -s "-screen 0 1920x1080x24" ./node_modules/.bin/electron --no-sandbox --enable-unsafe-swiftshader tools/harness.js tools/scenarios/qa-misc.js 1280x720 <outdir> */
module.exports = async page => {
  const Q = require('./qa-lib')(page);
  await page.eval(() => { const T = window.__tli; T.Saves.week = [null, null, null]; T.Saves.endless = null; writeSaves(); T.OS.fastBoot = true; return true; });
  await page.startSolo('week');
  await page.eval(() => { window.__tli.G.timeLeft = 280; return true; });
  await Q.fast(true);   // logic only between screenshots (software GL is slow)
  const errs0 = page.errors.length;

  // ---------- walking into The Boss and into a seated coworker ----------
  const walkInto = async av => {
    const st = await page.eval(av => { const T = window.__tli, P = T.P, a = av === 'boss' ? T.W.boss : T.W.npcs[0], g = a.group.position;
      // start 1.2 m away on a free side, facing the avatar
      for (let k = 0; k < 32; k++) { const an = k / 32 * 6.283, x = g.x + Math.cos(an) * 1.2, z = g.z + Math.sin(an) * 1.2; let ok = !blocked(x, z);
        for (let s = 0.1; ok && s < 1.2; s += 0.1) if (blocked(g.x + Math.cos(an) * s, g.z + Math.sin(an) * s)) ok = false;
        if (ok) { P.pos.x = x; P.pos.z = z; P.pos.y = 0; P.vx = P.vz = 0; const l = lookAngles({ x, y: 1.5, z }, { x: g.x, y: 1.3, z: g.z }); P.yaw = l.yaw; P.pitch = l.pitch; return { x, z, free: true }; } }
      return { free: false }; }, av);
    if (!st.free) return { free: false };
    await Q.hold('KeyW', 1.6);
    return page.eval(av => { const T = window.__tli, P = T.P, a = av === 'boss' ? T.W.boss : T.W.npcs[0], g = a.group.position; return { free: true, d: +Math.hypot(P.pos.x - g.x, P.pos.z - g.z).toFixed(2) }; }, av);
  };
  await page.eval(() => { const T = window.__tli; if (!T.W.doors.boss.isOpen) T.W.doors.boss.open(); return true; });
  const db = await walkInto('boss');
  Q.check('walking into The Boss stops at his body', db.free && db.d >= 0.7, db);
  await Q.shot('misc-01-walk-into-boss');
  const dn = await walkInto('npc');
  Q.check('walking into a seated coworker stops at them (or the cubicle)', !dn.free || dn.d >= 0.7, dn);

  // ---------- a burst of toasts ----------
  await page.eval(() => { for (let i = 0; i < 12; i++) toast('Toast number ' + (i + 1), i % 2 ? 'good' : ''); return true; });
  await Q.waitFor(() => document.querySelectorAll('#toasts .toast').length <= 5, 5000, 100);   // the pushed-out ones fade for 0.4 s
  const ts = await page.eval(() => ({ n: document.querySelectorAll('#toasts .toast').length, live: document.querySelectorAll('#toasts .toast:not(.out)').length, top: Math.min(...[...document.querySelectorAll('#toasts .toast')].map(t => t.getBoundingClientRect().top)), last: document.querySelector('#toasts .toast:last-child').textContent }));
  Q.check('a burst of toasts shows at most 5, newest kept, all on screen', ts.n <= 5 && ts.top >= 0 && ts.last === 'Toast number 12', ts);
  await Q.shot('misc-02-toast-burst');

  // ---------- form scheme after a scambaiter ----------
  await Q.sit(); await Q.hush();
  await page.eval(() => { window.__tli.OS.close('memo', true); return true; });
  await Q.ringAnswer(null, true);
  await page.eval(() => { window.__tli.Call.setScheme('card'); return true; });
  const r = await Q.play();
  await page.wait(1400);
  await page.eval(() => { window.__tli.OS.clearPopups(); return true; });
  const fb = await page.eval(() => { const b = document.querySelector('.win.scheme .sx-form .sx-banner'); return b ? { cls: b.className, t: b.textContent } : null; });
  Q.check('baited form banner', !!fb && /fake/i.test(fb.t) && /bad/.test(fb.cls), { r, fb });
  await Q.shot('misc-03-baited-form');

  Q.check('no page errors', page.errors.length === errs0, page.errors.slice(errs0));
  await Q.done();
};
