/* QA soak: a long endless session at the desk like a player grinding calls. Answers every call on the card, runs a
   random unlocked scheme like a player (Script lines, forms, NosyViewer, PINs), stands up and sits down now and then,
   and samples the DOM size, the JS heap, scene objects and Loop hooks every round. Looks for slow leaks (things that
   pile up over many calls) and errors that only show after a while. QA_SOAK = number of rounds (default 4, ~4 min).
   Run: xvfb-run -a -s "-screen 0 1920x1080x24" ./node_modules/.bin/electron --no-sandbox --enable-unsafe-swiftshader tools/harness.js tools/scenarios/qa-soak.js 1280x720 <outdir> */
module.exports = async page => {
  const Q = require('./qa-lib')(page);
  const rounds = +process.env.QA_SOAK || 4;
  await page.eval(() => { const T = window.__tli; T.Saves.week = [null, null, null]; T.Saves.endless = null; writeSaves(); T.OS.fastBoot = true; return true; });
  await page.startSolo('endless');
  await Q.sit();
  await page.eval(() => { window.__tli.OS.close('memo', true); return true; });
  await Q.fast(true);
  const errs0 = page.errors.length;
  const sample = () => page.eval(() => { const T = window.__tli; let objs = 0; T.W.scene.traverse(() => objs++);
    if (T.Call.state !== 'live') for (const id of [...T.OS.wins.keys()]) if (id !== 'phone') T.OS.close(id, true);   // measure what is left behind, not open windows
    const popDom = [...document.querySelectorAll('#os-wins .popup')].reduce((n, e) => n + 1 + e.getElementsByTagName('*').length, 0);   // a scambaiter's pop-up storm is live state, not a leak
    return { dom: document.getElementsByTagName('*').length - popDom, heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : 0, objs, loop: T.Loop.fns.length,
      wins: T.OS.wins.size, pops: T.OS.popups, bubbles: document.querySelectorAll('.win[data-app=phone] .bub, .win[data-app=phone] [class*=bubble]').length, toasts: document.querySelectorAll('#toasts .toast').length,
      team: T.G.team, calls: T.G.stats.calls, scams: T.G.stats.scams, geo: T.W.renderer.info.memory.geometries, tex: T.W.renderer.info.memory.textures,
      raid: Raid.on ? Raid.cops.length : 0, raids: Raid.n, book: !!Raid.book,
      where: Object.fromEntries([...document.body.children].map(e => [e.id || e.className || e.tagName, e.getElementsByTagName('*').length]).filter(x => x[1] > 20)),
      phone: (() => { const w = document.querySelector('.win[data-app=phone]'); return w ? w.getElementsByTagName('*').length : 0; })() }; });
  /* police raids happen in a long endless session: a seated player who keeps typing gets arrested and stood up */
  const resit = async () => { if (await page.eval(() => window.__tli.P.seated && window.__tli.OS.open)) return;
    await Q.waitFor(() => !Raid.bust, 15000, 300);
    await page.eval(() => { const T = window.__tli, d = T.W.desks.filter(x => !x.npc)[0]; if (T.P.seated) standUp(); T.P.pos.x = d.stand.x; T.P.pos.z = d.stand.z; return true; });
    await Q.sit(); await page.eval(() => { window.__tli.OS.close('memo', true); return true; }); };
  const S = [await sample()];
  Q.log('start', S[0]);
  for (let r = 0; r < rounds; r++) {
    // a few calls per round
    for (let k = 0; k < 3; k++) {
      await resit();
      const rang = await Q.waitFor(() => window.__tli.Call.state === 'ringing', 12000, 200);
      if (!rang) { await page.eval(() => { window.__tli.Call.ring(); return true; }); await page.wait(300); }
      await Q.click('#os-modal .ringcard .rb.yes', null, 700);
      await page.eval(() => { const T = window.__tli, u = T.Game.unlocked(); if (T.Call.state === 'live' && !T.Call.cur.scheme) T.Call.setScheme(u[Math.floor(Math.random() * u.length)].id); return true; });
      await Q.play(10);
      await page.eval(() => { window.__tli.OS.clearPopups(); return true; });
      await Q.waitFor(() => window.__tli.Call.state !== 'live', 6000, 200);
      if ((await page.eval(() => window.__tli.Call.state)) === 'live') await page.eval(() => { window.__tli.Call.end('you'); return true; });
    }
    // stand up, wander a bit, sit back down
    if (r % 2 === 1) {
      await page.eval(() => { standUp(); return true; });
      await Q.hold('KeyS', 0.6);
      await page.eval(() => { const T = window.__tli; T.P.pos.x = T.W.desks.filter(d => !d.npc)[0].stand.x; T.P.pos.z = T.W.desks.filter(d => !d.npc)[0].stand.z; return true; });
      await Q.sit();
      await page.eval(() => { window.__tli.OS.close('memo', true); return true; });
    }
    await resit();
    if (await page.eval(() => Raid.on)) await Q.waitFor(() => !Raid.on && !Raid.cops.length, 100000, 500);   // compare scene sizes between raids
    const s = await sample(); S.push(s);
    Q.log('round ' + (r + 1), s);
  }
  const a = S[1], b = S[S.length - 1];   // compare after the first round (first-use caches warm up)
  Q.check('calls were played', b.calls - S[0].calls >= rounds * 2 && b.scams > S[0].scams, { calls: b.calls, scams: b.scams, team: b.team });
  Q.check('DOM does not keep growing', b.dom - a.dom < 150, { from: a.dom, to: b.dom });
  Q.check('scene objects do not keep growing', b.objs - a.objs - (b.book && !a.book ? 45 : 0) < 30, { from: a.objs, to: b.objs, bookingSetBuilt: b.book && !a.book });
  Q.check('GPU geometries / textures do not keep growing', b.geo - a.geo < 40 && b.tex - a.tex < 20, { geo: [a.geo, b.geo], tex: [a.tex, b.tex] });
  Q.check('Loop hooks stable', b.loop === a.loop, { from: a.loop, to: b.loop });
  Q.check('no page errors over the session', page.errors.length === errs0, page.errors.slice(errs0));
  await Q.shot('soak-end');
  await Q.done();
};
