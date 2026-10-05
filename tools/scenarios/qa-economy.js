/* QA: the economy. Earn money on a call, BonkMart tabs, hold-to-buy through the UI, buy every item in the catalog
   (licences, upgrades, perks, software, snacks, gadgets, chaos), purchased apps get desktop icons, use every hotbar
   item, perks apply and survive quit / continue.
   Run: xvfb-run -a -s "-screen 0 1920x1080x24" ./node_modules/.bin/electron --no-sandbox --enable-unsafe-swiftshader tools/harness.js tools/scenarios/qa-economy.js 1280x720 <outdir> */
module.exports = async page => {
  const Q = require('./qa-lib')(page);
  await page.eval(() => { const T = window.__tli; T.Saves.week = [null, null, null]; T.Saves.endless = null; writeSaves(); T.OS.fastBoot = true; return true; });
  await page.startSolo('week');
  await Q.sit(); await Q.hush();
  await page.eval(() => { window.__tli.OS.close('memo', true); return true; });

  // ---------- earn ----------
  await Q.ringAnswer('knitter');
  await page.eval(() => { window.__tli.Call.setScheme('virus'); return true; });
  const r = await Q.play();
  const w0 = await page.eval(() => window.__tli.G.wallet);
  Q.check('earned into the wallet', r.res === 'paid' && w0 > 0, [r, w0]);
  await page.wait(2600); await Q.hush();

  // ---------- BonkMart tabs ----------
  await Q.click('#os-icons *', /BonkMart/, 600) || await page.eval(() => { BonkMart.open('scams'); return true; });
  await page.eval(() => { BonkMart.open('scams'); window.__tli.OS.maximise('shop'); return true; });
  await page.wait(800);
  for (const [i, tab] of ['scams', 'apps', 'games', 'goods'].entries()) {
    await Q.click('.win .bm-tab', new RegExp(['Scams', 'Business', 'Games', 'Physical'][i]), 900);
    const n = await page.eval(() => document.querySelectorAll('.win .bm-card').length);
    Q.check('tab ' + tab + ' lists products', n > 0, n);
    await page.shot('eco-0' + (i + 1) + '-tab-' + tab);
  }

  // ---------- hold to buy (UI) ----------
  const hold = await page.eval(async () => {
    const T = window.__tli, card = [...document.querySelectorAll('.win .bm-card')].find(c => /Party Popper/.test(c.textContent)); if (!card) return 'no card';
    const btn = card.querySelector('.bm-btn'), n0 = T.Inv.count('confetti'), w = T.G.wallet;
    btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    await new Promise(r => setTimeout(r, 300)); btn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, button: 0 }));   // released early: nothing
    const early = T.Inv.count('confetti') - n0;
    btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    await new Promise(r => setTimeout(r, 1400)); btn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, button: 0 }));
    return { early, got: T.Inv.count('confetti') - n0, paid: w - T.G.wallet };
  });
  Q.check('hold to buy: early release cancels, full hold buys', hold.early === 0 && hold.got === 1 && hold.paid === 20, hold);
  await page.shot('eco-05-held-buy');

  // ---------- buy everything ----------
  await page.eval(() => { window.__tli.Game.addWallet(200000); return true; });
  const res = await page.eval(() => {
    const T = window.__tli, out = [];
    for (const it of Shop.list()) {
      if (/^chaos_/.test(it.id)) continue;
      if (it.available && !it.available()) { out.push({ id: it.id, skip: 'unavailable' }); continue; }
      let n = 0, ok = true, spent = 0;
      do { const w = T.G.wallet, p = BonkMart.priceOf(it), st = BonkMart.state(it)[0]; if (st !== 'buy') break; ok = BonkMart.buy(it.id); spent = w - T.G.wallet; if (!ok || spent !== p) { out.push({ id: it.id, bad: true, ok, spent, p, st }); break; } n++; } while (it.level && n < 10);
      const st = BonkMart.state(it); out.push({ id: it.id, n, st: st[0], owned: it.owned ? !!it.owned() : null, rep: !!it.repeatable });
    }
    return out;
  });
  const bad = res.filter(x => x.bad || (!x.skip && x.n === 0 && x.st !== 'owned') || (!x.rep && !x.skip && x.owned === false));
  Q.check('every catalog item buys for its price and ends owned / maxed', !bad.length, bad);
  Q.log('bought', res.map(x => x.id + ':' + (x.skip || x.n + '/' + x.st)).join(' '));
  const ups = await page.eval(() => UPGRADES.map(u => [u.id, window.__tli.G.up[u.id] || 0, u.max]));
  Q.check('upgrades maxed', ups.every(u => u[1] === u[2]), ups);
  await page.eval(() => { window.__tli.OS.buildIcons(); return true; });
  const icons = await page.eval(() => ['cookie', 'casino', 'paint', 'antivirus', 'cctv'].map(id => { const d = window.__tli.OS.apps[id]; return [id, !!d && (!d.available || d.available()), !!d && [...document.querySelectorAll('#os-icons *')].some(e => e.textContent.trim() === d.title || e.textContent.includes(d.title))]; }));
  Q.check('bought apps get desktop icons', icons.every(i => i[1] && i[2]), icons);
  await page.eval(() => { window.__tli.OS.close('shop', true); return true; });
  await page.wait(500);
  await page.shot('eco-06-desktop-all-apps');
  Q.check('licensed schemes unlocked', await page.eval(() => window.__tli.Game.unlocked().length === SCHEMES.length));

  // ---------- perks ----------
  const perks = await page.eval(() => ({ walk: PC.walk, run: PC.run }));
  Q.log('perks applied', perks);

  // ---------- chaos ----------
  await page.stand(); await page.wait(400);
  const room = await page.eval(() => window.__tli.W.rooms.floor);
  await page.teleport((room.x0 + room.x1) / 2, (room.z0 + room.z1) / 2, 0, 0);
  for (const id of ['chaos_pizza', 'chaos_boss', 'chaos_stapler', 'chaos_rival', 'chaos_strike']) {
    await Q.waitFor(() => !Chaos.busy(), 40000, 500);
    const ok = await page.eval(id => { const it = Shop.get(id); const st = BonkMart.state(it)[0]; return st === 'buy' ? BonkMart.buy(id) : st; }, id);
    Q.check('chaos ' + id + ' bought', ok === true, ok);
    await page.wait(id === 'chaos_strike' ? 4500 : id === 'chaos_rival' ? 3500 : 1500);
    await page.shot('eco-07-' + id);
    if (/strike|rival/.test(id)) await page.wait(6000);
  }
  const fps = await page.eval(() => new Promise(r => { let n = 0, t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else r({ fps: Math.round(n / 2), calls: window.__tli.W.renderer.info.render.calls, tris: window.__tli.W.renderer.info.render.triangles, fx: FX.stats() }); }; requestAnimationFrame(f); }));
  Q.log('after chaos', fps);

  // ---------- use every hotbar item ----------
  await page.eval(() => { const T = window.__tli; T.P.stunT = 0; T.P.kx = T.P.kz = 0; Props.refreshHeld(); return true; });
  const slots = await page.eval(() => Props.slots.slice());
  Q.log('hotbar', slots);
  const allItems = await page.eval(() => window.__tli.Inv.all().filter(id => ItemDefs[id] && ItemDefs[id].hotbar !== false));
  Q.check('every carried item fits on the hotbar', allItems.every(id => slots.includes(id)), { allItems, slots });
  for (let i = 0; i < slots.length; i++) {
    const id = slots[i];
    const out = await page.eval(async (i, id) => {
      const T = window.__tli; Props.select(i); const n0 = T.Inv.count(id), d = ItemDefs[id];
      await new Promise(r => setTimeout(r, 200)); T.P.yaw += 0.6;
      Props.startUse(); await new Promise(r => setTimeout(r, d && d.hold ? 1200 : 300)); Props.endUse();
      return { id, sel: Props.heldId(), before: n0, after: T.Inv.count(id), hold: !!(d && d.hold) };
    }, i, id);
    Q.log('used', out);
    if (i === 1 || id === 'beans' || id === 'soda') await page.shot('eco-08-use-' + id);
    await page.wait(500);
  }
  // throw one of each throwable item with F
  await page.eval(() => { const T = window.__tli; T.Inv.give('soda', 1); Props.refreshHeld(); Props.select(Props.slots.indexOf('soda')); Props.throwT = 0; Props.throwSel(); return true; });
  await page.wait(800);

  // ---------- quit restores the perks, continue applies them again ----------
  await page.eval(() => { window.__tli.Game.quit(); return true; });
  await page.wait(500);
  const q = await page.eval(() => ({ walk: PC.walk, run: PC.run }));
  await page.eval(() => { window.__tli.Game.startSolo('week', 2); return true; });   // page.startSolo uses time card 3 (slot 2)
  await page.wait(800);
  const c = await page.eval(() => ({ walk: PC.walk, run: PC.run, up: window.__tli.G.up, lic: Object.keys((window.__tli.G.prog.licences) || {}).length, apps: ['cookie', 'casino', 'paint', 'antivirus', 'cctv'].filter(id => window.__tli.OS.apps[id].available()) }));
  Q.check('perks restored on quit and re-applied on continue', q.walk < perks.walk && Math.abs(c.walk - perks.walk) < 1e-6, { perks, q, c: c.walk });
  Q.check('purchases survive quit / continue', c.lic > 0 && c.apps.length === 5, c);
  await Q.done();
};
