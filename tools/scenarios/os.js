/* LegitOS scenario: boot screen, desktop with windows, incoming call card, cash pop-up, wallpapers, virus storm.
   Run: xvfb-run -a -s "-screen 0 1920x1080x24" ./node_modules/.bin/electron --no-sandbox --enable-unsafe-swiftshader tools/harness.js tools/scenarios/os.js 1280x720 <outdir>
   Optional env OS_SHOTS=boot,desk,... to run only some parts. */
module.exports = async page => {
  const only = (process.env.OS_SHOTS || '').split(',').filter(Boolean), want = k => !only.length || only.includes(k);
  await page.startSolo('week');
  await page.eval(() => { const T = window.__tli; T.G.timeLeft = 246; return true; });
  // sit down: the boot screen shows first
  await page.eval(() => { const T = window.__tli; const d = T.W.desks.filter(x => !x.npc)[0]; sitAt(d.i); return true; });
  for (let i = 0; i < 40 && !(await page.eval(() => window.__tli.OS.open)); i++) await page.wait(50);
  await page.wait(350);
  if (want('boot')) await page.shot('os-01-boot');
  await page.wait(1800);
  const ms = await page.eval(() => Wallpapers.lastMs);
  console.log('wallpaper render ms: ' + ms);
  if (want('desk')) {
    await page.eval(() => { const T = window.__tli; T.Call.state = 'off'; T.Call.wait = 999; return true; });
    await page.shot('os-02-desktop');
    // several windows: phone, a scheme app, memo, payroll
    await page.eval(() => { const T = window.__tli; T.OS.launch('sch_card', true); T.OS.launch('payroll', true); T.OS.badge('shop', true); T.OS.badge('nosy', 3); return true; });
    await page.wait(400);
    await page.shot('os-03-windows');
    await page.eval(() => { const T = window.__tli; T.OS.power(true); return true; });
    await page.wait(250);
    await page.shot('os-04-power');
    await page.eval(() => { const T = window.__tli; T.OS.power(false); return true; });
    // drag the payroll window by its title bar, then maximise / restore it
    const drag = await page.eval(() => {
      const T = window.__tli, w = T.OS.wins.get('payroll'), tb = w.tb, r = tb.getBoundingClientRect(), x0 = w.el.offsetLeft, y0 = w.el.offsetTop;
      const ev = (type, x, y) => tb.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: x, clientY: y, pointerId: 1, button: 0 }));
      ev('pointerdown', r.left + 60, r.top + 10); ev('pointermove', r.left + 160, r.top + 60); ev('pointerup', r.left + 160, r.top + 60);
      const moved = [w.el.offsetLeft - x0, w.el.offsetTop - y0]; T.OS.maximise('payroll'); const max = w.el.classList.contains('max'); T.OS.maximise('payroll');
      return { moved, max, restored: !w.el.classList.contains('max') };
    });
    console.log('drag/maximise: ' + JSON.stringify(drag));
    const endless = await page.eval(() => { const T = window.__tli, m = T.G.mode; T.G.mode = 'endless'; T.OS.stats(); const t = document.getElementById('tb-stats').innerText.replace(/\s+/g, ' '); T.G.mode = m; T.OS.stats(); return t; });
    console.log('endless stats: ' + endless);
    // stand up and sit down again: the quick (0.3 s) boot
    await page.stand();
    await page.eval(() => { const T = window.__tli; const d = T.W.desks.filter(x => !x.npc)[0]; sitAt(d.i); return true; });
    for (let i = 0; i < 40 && !(await page.eval(() => window.__tli.OS.open)); i++) await page.wait(50);
    const quick = await page.eval(() => document.getElementById('os-boot').classList.contains('quick'));
    console.log('second boot quick: ' + quick);
    await page.wait(800);
  }
  if (want('ring')) {
    await page.ring(false);
    await page.wait(500);
    await page.shot('os-05-ringing');
    await page.answer();
    const st = await page.eval(() => ({ st: window.__tli.Call.state, modal: document.querySelectorAll('#os-modal .ringcard:not(.out)').length }));
    console.log('after answer: ' + JSON.stringify(st));
  }
  if (want('cash')) {
    await page.eval(() => { window.__tli.OS.cashFx('+$250'); return true; });
    await page.wait(330);
    await page.shot('os-06-cash');
    await page.wait(1600);
    await page.eval(() => { window.__tli.OS.cashFx('BAITED', true); return true; });
    await page.wait(330);
    await page.shot('os-07-cash-bad');
    await page.wait(1500);
  }
  if (want('virus')) {
    await page.eval(() => { window.__tli.OS.virus(8); return true; });
    await page.wait(1900);
    await page.shot('os-08-virus');
    await page.eval(() => { document.querySelectorAll('#os-wins .popup').forEach(p => p.remove()); window.__tli.OS.popups = 0; return true; });
  }
  if (want('icons')) {
    // lots of icons: pretend 20 more apps were registered by other modules
    await page.eval(() => { const T = window.__tli, G = ['cookie', 'dice', 'chat', 'palette', 'globe', 'bag', 'shield', 'camera', 'id', 'gift', 'bank', 'trophy', 'virus', 'monitor', 'cctv', 'music', 'gamepad', 'rocket', 'pizza', 'calendar'];
      G.forEach((g, i) => { T.OS.apps['fake' + i] = { desktop: true, order: 70 + i, title: g[0].toUpperCase() + g.slice(1) + (i % 4 ? '' : ' Deluxe Edition'), icon: g, color: ['#e8590c', '#2f9e44', '#1c7ed6', '#7048e8', '#c2255c', '#0c8599'][i % 6], w: 300, render: b => b.append('hi') }; });
      T.G.day = 5; T.OS.buildIcons(); [...T.OS.wins.keys()].forEach(id => T.OS.minimise(id)); return true; });
    await page.wait(300);
    await page.shot('os-09-icons');
  }
  if (want('walls')) {
    const ids = await page.eval(() => Wallpapers.list.map(s => s.id));
    await page.eval(() => { const T = window.__tli; [...T.OS.wins.keys()].forEach(id => T.OS.minimise(id)); document.getElementById('os-icons').style.visibility = 'hidden'; return true; });
    for (const id of ids) {
      const t = await page.eval(i => { const t0 = performance.now(); Wallpapers.set(i); return Math.round(performance.now() - t0); }, id);
      console.log('wallpaper ' + id + ': ' + t + ' ms');
      await page.wait(700);
      await page.shot('os-10-wall-' + id);
    }
    await page.eval(() => { document.getElementById('os-icons').style.visibility = ''; Wallpapers.set('canyon'); window.__tli.OS.launch('wallpapers'); return true; });
    await page.wait(2200);
    await page.shot('os-11-wallapp');
  }
  if (want('memo')) {
    await page.eval(() => { const T = window.__tli; T.OS.close('wallpapers', true); T.OS.launch('memo', true); T.OS.focus(T.OS.wins.get('memo')); return true; });
    await page.wait(300);
    const nul = await page.eval(() => /\bnull\b/.test(document.querySelector('.win.memo').textContent));
    console.log('memo has null: ' + nul);
    await page.shot('os-12-memo');
  }
};
