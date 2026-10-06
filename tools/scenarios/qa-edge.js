/* QA: more edge cases. The hotbar with more kinds of items than slots (scroll on to reach them all), Esc at the desk
   (pause over the desktop), a long session (three days back to back: no leaked Loop hooks, Bus handlers, cameras,
   textures, DOM), the day ending with a call ringing, the clock-out box and BonkMart open, quitting mid-raid
   mid-call with the webcam on, then endless mode starting clean.
   Run: xvfb-run -a -s "-screen 0 1920x1080x24" ./node_modules/.bin/electron --no-sandbox --enable-unsafe-swiftshader tools/harness.js tools/scenarios/qa-edge.js 1280x720 <outdir> */
module.exports = async page => {
  const Q = require('./qa-lib')(page);
  await page.eval(() => { const T = window.__tli; T.Saves.week = [null, null, null]; T.Saves.endless = null; writeSaves(); T.OS.fastBoot = true; return true; });
  await page.startSolo('week');
  await page.eval(() => { window.__tli.G.timeLeft = 280; return true; });

  // ---------- the hotbar with more kinds of items than slots ----------
  const kinds = await page.eval(() => { const T = window.__tli, ids = Object.keys(T.ItemDefs).filter(id => id !== 'paper' && T.ItemDefs[id].hotbar !== false); for (const id of ids) T.Inv.give(id, 2); return ids; });
  await page.wait(400);
  const hb = await page.eval(() => ({ slots: Props.slots.slice(), hidden: Props.hidden(), more: (document.querySelector('#hotbar .hb-more') || {}).textContent || null }));
  Q.check('more item kinds than slots: a "+N" chip on the hotbar', hb.slots.length === 9 && hb.hidden === kinds.length - 8 && hb.more === '+' + hb.hidden, hb);
  await page.eval(() => { Props.select(8); return true; });
  await page.wait(150);
  await page.eval(() => { window.dispatchEvent(new WheelEvent('wheel', { deltaY: 100 })); return true; });   // the real wheel handler
  await page.wait(200);
  const w1 = await page.eval(() => ({ sel: Props.sel, id: Props.slots[Props.sel], slots: Props.slots.slice() }));
  Q.check('the wheel past the last slot brings in a hidden item', w1.sel === 8 && !hb.slots.includes(w1.id), { w1, before: hb.slots });
  const seen = new Set([...hb.slots, w1.id]);
  for (let i = 0; i < kinds.length + 12; i++) { const id = await page.eval(() => { Props.cycle(1); return Props.slots[Props.sel]; }); seen.add(id); }
  Q.check('scrolling on reaches every item', kinds.every(k => seen.has(k)), { missing: kinds.filter(k => !seen.has(k)) });
  Q.check('scrolling never loses items', (await page.eval(() => window.__tli.Inv.all().length)) === kinds.length);
  await Q.shot('edge-01-hotbar-overflow');
  await page.eval(() => { window.__tli.Inv.load({}); return true; });

  // ---------- Esc at the desk: the pause menu over the desktop ----------
  await Q.sit(); await Q.hush();
  await page.eval(() => { window.__tli.OS.close('memo', true); window.__tli.OS.launch('casino', true); return true; });
  await page.wait(400);
  await Q.press('Escape');
  await page.wait(400);
  let s = await page.eval(() => { const T = window.__tli, m = document.querySelector('#pause .modal') || document.querySelector('#pause'), r = m.getBoundingClientRect(), e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return { paused: T.G.paused, pause: !document.querySelector('#pause').classList.contains('hidden'), seated: T.P.seated, top: !!(e && e.closest('#pause')) }; });
  Q.check('Esc at the desk pauses, the menu is on top of the windows', s.paused && s.pause && s.seated && s.top, s);
  await Q.shot('edge-02-pause-over-desktop');
  await page.wait(350);
  await Q.press('Escape');
  await page.wait(400);
  s = await page.eval(() => ({ paused: window.__tli.G.paused, seated: window.__tli.P.seated, os: window.__tli.OS.open, casino: window.__tli.OS.wins.has('casino') }));
  Q.check('Esc again: back at the desk with the windows', !s.paused && s.seated && s.os && s.casino, s);

  // ---------- three days back to back: nothing piles up ----------
  const snap = () => page.eval(() => {
    const T = window.__tli, m = T.W.renderer.info.memory; let objs = 0, bus = 0; T.W.scene.traverse(() => objs++); for (const v of T.Bus.map.values()) bus += v.size;
    const by = {}; for (const el of document.body.children) by[el.id || el.className || el.tagName] = el.getElementsByTagName('*').length;
    return { geo: m.geometries, tex: m.textures, objs, loop: T.Loop.fns.length, render: T.Loop.renders.length, bus, dom: document.getElementsByTagName('*').length, cams: Cams.list.length, wins: T.OS.wins.size, toasts: document.querySelectorAll('#toasts > *').length, by };
  });
  const day = async n => {
    await page.eval(() => { const T = window.__tli; T.G.team = T.G.quota; T.G.timeLeft = 0.05; return true; });
    await Q.waitFor(() => window.__tli.G.phase === 'review', 8000, 100);
    await page.eval(() => { Review.seek(60); return true; });
    await Q.waitFor(() => Review.state.sheet, 8000, 200);
    await page.eval(() => { window.__tli.Game.nextDay(); document.getElementById('daycard').classList.add('hidden'); return true; });
    await page.wait(500);
    return page.eval(() => window.__tli.G.day);
  };
  await Q.fast(true);
  await page.eval(() => { window.__tli.OS.launch('camera', true); return true; });   // a live render-to-texture camera across the reviews
  await page.wait(300);
  await day(1);
  await Q.sit(); await Q.hush(); await page.eval(() => { window.__tli.OS.launch('camera', true); return true; }); await page.wait(400);
  const a = await snap();
  await day(2); await Q.sit(); await Q.hush(); await page.eval(() => { window.__tli.OS.launch('camera', true); return true; }); await page.wait(400);
  await day(3); await Q.sit(); await Q.hush(); await page.eval(() => { window.__tli.OS.launch('camera', true); return true; }); await page.wait(400);
  const b = await snap();
  Q.log('day 2', a, 'day 4', b, 'DOM growth', Object.keys(b.by).filter(k => b.by[k] !== a.by[k]).map(k => k + ' ' + a.by[k] + '->' + b.by[k]));
  Q.check('Thursday after three reviews', (await page.eval(() => window.__tli.G.day)) === 4);
  Q.check('no leaked Loop hooks / Bus handlers / cameras', b.loop === a.loop && b.render === a.render && b.bus === a.bus && b.cams <= a.cams, { a, b });
  Q.check('no piling textures / geometries / scene objects / DOM', b.tex - a.tex <= 4 && b.geo - a.geo <= 12 && b.objs - a.objs <= 40 && b.dom - a.dom <= 150, { a, b });

  // ---------- the day ends with a call ringing, the clock-out box and BonkMart open ----------
  await page.eval(() => { const T = window.__tli; T.OS.launch('shop', true); T.Call.ring(false); T.Call.ringLeft = 60; return true; });
  await page.wait(300);
  await page.eval(() => { ClockOut.request(); return true; });
  await page.wait(300);
  Q.check('clock-out box open', await page.eval(() => !!document.getElementById('co-confirm')));
  await Q.shot('edge-03-before-day-end');
  await page.eval(() => { window.__tli.G.timeLeft = 0.05; return true; });
  await Q.waitFor(() => window.__tli.G.phase === 'review', 8000, 100);
  await page.wait(600);
  s = await page.eval(() => { const T = window.__tli; return { call: T.Call.state, ring: !!T.Call.ringIv, card: document.querySelectorAll('#os-modal .ringcard').length, dlg: !!document.getElementById('co-confirm'), os: T.OS.open, shop: !document.querySelector('#os').classList.contains('hidden') }; });
  Q.check('day end: ringing stops, no ring card, clock-out box gone, desktop hidden', s.call === 'off' && !s.ring && !s.dlg && !s.os && !s.shop, s);
  await Q.shot('edge-04-review-after-ring');
  await page.eval(() => { window.__tli.Game.nextDay(); document.getElementById('daycard').classList.add('hidden'); return true; });
  await page.wait(500);

  // ---------- quit mid-raid, mid-call, webcam on → endless starts clean ----------
  await Q.sit(); await Q.hush();
  await page.eval(() => { window.__tli.OS.launch('camera', true); return true; });
  await Q.ringAnswer('granny');
  await page.eval(() => { window.__tli.Call.setScheme('card'); RAID.tag = 0; Raid.start(2); FX.tint('#ff3030', 0.3); return true; });
  await page.wait(1200);
  const pre = await page.eval(() => ({ raid: Raid.on, call: window.__tli.Call.state, cams: Cams.list.filter(c => c.isOn()).length }));
  Q.check('mid-raid, mid-call, webcam rendering', pre.raid && pre.call === 'live' && pre.cams >= 1, pre);
  await page.eval(() => { window.__tli.Game.pause(true); return true; });
  await page.wait(300);
  await Q.click('#pause .btn.danger', /Quit/, 900);
  const L = await page.eval(() => {
    const T = window.__tli, ft = document.querySelector('#fx-tint');
    return { phase: T.G.phase, raid: Raid.on, cops: Raid.cops.length, siren: !!RaidSnd.siren, call: T.Call.state, ring: !!T.Call.ringIv, wins: T.OS.wins.size, camsOn: Cams.list.filter(c => c.isOn()).length,
      tint: ft ? +(ft.style.opacity || 0) : 0, hud: !document.querySelector('#hud').classList.contains('hidden'), menu: !document.querySelector('#menu').classList.contains('hidden'), camOverride: !!T.W.camOverride, ctx: !!document.querySelector('#os-ctx:not(.hidden)') };
  });
  Q.check('quit: menu, no raid, call, windows, live cameras, tint', L.phase === 'menu' && !L.raid && !L.cops && !L.siren && L.call === 'off' && !L.ring && !L.wins && !L.camsOn && L.tint < 0.01 && !L.hud && L.menu && !L.camOverride, L);
  await Q.shot('edge-05-menu-after-quit');
  await page.eval(() => { const T = window.__tli; T.Game.startSolo('endless', 0); document.getElementById('daycard').classList.add('hidden'); return true; });
  await page.wait(1200);
  const E = await page.eval(() => { const T = window.__tli; return { mode: T.G.mode, phase: T.G.phase, team: T.G.team, quota: T.G.quota, raid: Raid.on, heat: Raid.heat, wallet: T.G.wallet, inv: T.Inv.all().length, wins: T.OS.wins.size, day: T.G.day, timeLeft: T.G.timeLeft, ctl: T.Game.canControl() }; });
  Q.check('endless starts clean after quitting a week', E.mode === 'endless' && E.phase === 'day' && E.team === 0 && !E.raid && E.heat === 0 && E.wallet === 0 && E.inv <= 4 && !E.wins && E.ctl, E);   // inv: only HR's welcome kit
  await Q.fast(false);
  await Q.shot('edge-06-endless-clean');
  await Q.done();
};
