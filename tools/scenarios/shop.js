/* BonkMart scenario: every tab, hold-to-buy in progress, NEED $X / OWNED states, the desktop badge,
   licences unlocking a scheme, perks, and the Chaos goods in the office (airstrike on yourselves,
   airstrike on the rival, pizza party, inflatable boss, gold stapler).
   SHOP_ONLY=tabs,hold,badge,licence,strike,rival,pizza,boss,stapler runs some parts.
   Waits are in game time (gw) and screenshots freeze the frame loop while capturing. */
module.exports = async page => {
  const only = (process.env.SHOP_ONLY || '').split(',').filter(Boolean), want = k => !only.length || only.includes(k);
  const ev = (f, ...a) => page.eval(f, ...a);
  const gw = sec => ev(s => new Promise(res => { const t0 = W.t; const f = () => (W.t - t0 >= s ? res(true) : setTimeout(f, 30)); f(); }), sec);
  const shot0 = page.shot; page.shot = async n => {
    await ev(() => new Promise(res => { document.querySelectorAll('.toast').forEach(t => t.remove()); const raf = window.requestAnimationFrame; window.__raf = raf; window.requestAnimationFrame = cb => { window.__cb = cb; return 0; }; raf(() => setTimeout(() => res(true), 30)); }));
    const r = await shot0(n);
    await ev(() => { window.requestAnimationFrame = window.__raf; if (window.__cb) window.__raf(window.__cb); return true; });
    return r;
  };
  const check = (name, ok, info) => console.log((ok ? 'OK   ' : 'FAIL ') + name + (info !== undefined ? '  ' + JSON.stringify(info) : ''));

  await ev(() => { const T = window.__tli; T.Saves.week[2] = null; writeSaves(); return true; });   // a fresh save
  await page.startSolo('week');
  await ev(() => {
    const T = window.__tli; T.OS.fastBoot = true; T.G.timeLeft = 9999;
    T.Loop.add(() => { if (T.Call.state === 'idle') T.Call.wait = 999; });   // no calls during the shop shots
    // the purchasable apps belong to other modules: stand-ins so the Games tab has stock in this test
    if (!T.Shop.list('games').length) [['cookie', 'Cosmic Cookie', 150, 'cookie', '#c47a2c', 'Click a cookie. Then click it again. A thrilling career in confectionery.'], ['casino', 'LuckyBonk Casino', 300, 'dice', '#d6336c', 'Eight games of chance, one wallet. The house always wins, and you are not the house.'],
      ['paint', 'Doodle Pro', 100, 'palette', '#1c7ed6', 'Professional art software for unprofessional art.'], ['antivirus', 'BugBuster', 200, 'shield', '#2f9e44', 'Squashes pop-ups, bugs and, occasionally, hope.'], ['cctv', 'CCTV', 400, 'cctv', '#495057', 'Watch your coworkers from the comfort of your desk. Legally ambiguous.']]
      .forEach((a, i) => T.Shop.add({ id: 'app_' + a[0], tab: 'games', section: 'Software', name: a[1], price: a[2], icon: a[3], color: a[4], desc: a[5], sort: i, owned: () => !!(T.G.prog.apps && T.G.prog.apps[a[0]]), buy() { (T.G.prog.apps = T.G.prog.apps || {})[a[0]] = true; } }));
    return true;
  });
  await page.sit(0);
  await gw(0.3);

  if (want('tabs')) {
    await ev(() => { const T = window.__tli; T.G.wallet = 640; T.OS.close('memo', true); BonkMart.open('goods'); return true; });
    await gw(1.5);   // 3D thumbnails render one per ~20 ms
    await page.shot('s01-goods');
    await ev(() => { BonkMart.win.body.querySelector('.bm-scroll').scrollTop = 99999; return true; });
    await gw(0.3);
    await page.shot('s02-goods-chaos');
    for (const [t, n] of [['scams', 's03-scams'], ['apps', 's04-business'], ['games', 's05-games']]) {
      await ev(tab => { BonkMart.open(tab); return true; }, t);
      await gw(0.4);
      await page.shot(n);
    }
    const st = await ev(() => ({ tabs: [...document.querySelectorAll('.bm-tab')].map(e => e.textContent), cards: document.querySelectorAll('.bm-card').length, need: document.querySelectorAll('.bm-btn.need').length, buy: document.querySelectorAll('.bm-btn.buy').length }));
    check('tabs render', st.tabs.length === 4 && st.cards > 0, st);
    await ev(() => { window.__tli.OS.maximise('shop'); BonkMart.open('goods'); return true; });
    await gw(0.5);
    await page.shot('s06-goods-maximised');
    await ev(() => { window.__tli.OS.maximise('shop'); return true; });
  }

  if (want('hold')) {
    // a slow hold so the screenshot catches the fill half-way, then a normal 0.7 s hold that buys
    await ev(() => { const T = window.__tli; T.G.wallet = 640; BonkMart.open('apps'); BonkMart.win.body.querySelector('.bm-scroll').scrollTop = 0; BonkMart.holdMs = 5000; const c = BonkMart.cards.get('up_comm'); c.btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 })); return true; });
    await page.wait(2200);
    await page.shot('s07-hold-progress');
    const before = await ev(() => { const c = BonkMart.cards.get('up_comm'); c.btn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); BonkMart.holdMs = 700; return window.__tli.G.wallet; });
    check('cancelled hold buys nothing', before === 640, before);
    await ev(() => { const c = BonkMart.cards.get('up_comm'); c.btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 })); return true; });
    await page.wait(850);
    await page.shot('s08-bought-pop');
    const r = await ev(() => ({ wallet: window.__tli.G.wallet, lvl: window.__tli.Game.lvl('comm') }));
    check('hold to buy: Bigger Cut level 1 for $200', r.wallet === 440 && r.lvl === 1, r);
    // perks + owned / maxed states
    await ev(() => { const T = window.__tli; T.G.wallet = 5000; ['perk_chair', 'perk_poster', 'up_patience', 'up_patience'].forEach(id => BonkMart.buy(id)); T.G.wallet = 120; BonkMart.update(); const s = BonkMart.win.body.querySelector('.bm-scroll'), sec = [...s.querySelectorAll('.bm-sec')].pop(); s.scrollTop = sec.offsetTop - 260; return true; });
    await gw(1.2);
    await page.shot('s09-owned-need');
    const pc = await ev(() => ({ walk: PC.walk, chair: bmPerk('chair') }));
    check('ergonomic chair speeds you up', pc.chair && pc.walk > 3.5, pc);
  }

  if (want('licence')) {
    const r = await ev(() => {
      const T = window.__tli; T.G.wallet = 2000; const before = T.Game.unlocked().map(s => s.id);
      const ok = BonkMart.buy('lic_invest'); const after = T.Game.unlocked().map(s => s.id);
      return { ok, before: before.length, after: after.length, has: after.includes('invest'), icon: !!document.querySelector('#os-icons [data-id="sch_invest"]') };
    });
    check('licence unlocks a scheme early', r.ok && r.has && r.after === r.before + 1, r);
    await ev(() => { BonkMart.open('scams'); BonkMart.win.body.querySelector('.bm-scroll').scrollTop = 99999; return true; });
    await gw(0.4);
    await page.shot('s10-scams-licensed');
  }

  if (want('badge')) {
    await ev(() => { const T = window.__tli; T.OS.close('shop', true); T.G.wallet = 10; BonkMart.calcBadge(); return true; });
    await gw(0.4);
    const b0 = await ev(() => window.__tli.OS.badges.has('shop'));
    await ev(() => { window.__tli.Game.addWallet(300); return true; });
    await gw(0.5);
    const b1 = await ev(() => window.__tli.OS.badges.has('shop'));
    check('badge appears when something new is affordable', !b0 && b1, { b0, b1 });
    await page.shot('s11-badge');
    await ev(() => { BonkMart.open('goods'); return true; });
    await gw(0.3);
    const b2 = await ev(() => window.__tli.OS.badges.has('shop'));
    check('badge clears when the shop opens', !b2, b2);
    await ev(() => { window.__tli.OS.close('shop', true); return true; });
  }

  // ---------- the Chaos goods in the office ----------
  const look = (x, z, tx, ty, tz) => ev((x, z, tx, ty, tz) => { const P = window.__tli.P; P.pos.x = x; P.pos.z = z; P.pos.y = 0; P.vx = P.vz = P.kx = P.kz = 0; const a = lookAngles({ x, y: 1.62, z }, { x: tx, y: ty, z: tz }); P.yaw = a.yaw; P.pitch = a.pitch; return true; }, x, z, tx, ty, tz);

  if (await ev(() => window.__tli.P.seated)) await page.stand();

  if (want('strike')) {
    await page.sit(0);
    await ev(() => { window.__tli.G.wallet = 3000; BonkMart.open('goods'); return true; });
    await gw(0.3);
    const ok = await ev(() => BonkMart.buy('chaos_strike'));
    await gw(0.4);
    await page.shot('s12-strike-ordered');
    await page.stand();
    // watch from the cross aisle, looking down the floor; keep the player still so the view stays put
    await look(9.2, -0.4, -2, 0.6, 0.6);
    await ev(() => { const T = window.__tli; T.P.stunT = 0; window.__hold = T.Loop.add(() => { if (Chaos.busy()) { const P = T.P; P.kx = P.kz = 0; P.pos.x = 9.2; P.pos.z = -0.4; P.pos.y = 0; } }); return true; });
    await gw(3.7);
    await page.shot('s13-strike-1');
    await gw(1.3);
    await page.shot('s14-strike-2');
    await gw(1.6);
    await page.shot('s15-strike-3');
    await ev(() => { window.__tli.Loop.remove(window.__hold); return true; });
    check('airstrike ordered', ok, ok);
    await gw(2.5);
  }

  if (want('rival')) {
    await ev(() => { const T = window.__tli; FX.clear(); T.G.wallet = 3000; return true; });
    const team0 = await ev(() => window.__tli.G.team);
    await ev(() => BonkMart.buy('chaos_rival'));
    await look(-9.5, -3.2, -17, 1.6, -4.5);
    await gw(3.2);
    await page.shot('s16-rival');
    await gw(3.2);
    const team1 = await ev(() => window.__tli.G.team);
    check('rival airstrike pays the team', team1 - team0 >= 1000, { team0, team1 });
  }

  if (want('pizza')) {
    await ev(() => { const T = window.__tli; FX.clear(); T.G.wallet = 500; T.P.boost = 0; return BonkMart.buy('chaos_pizza'); });
    await look(11.6, 3.4, 13.4, 0.8, 5.0);
    await gw(0.8);
    const b = await ev(() => ({ boost: window.__tli.P.boost, boxes: !!Chaos.boxes }));
    check('pizza party: boxes + speed boost', b.boxes && b.boost > 30, b);
    await page.shot('s17-pizza');
  }

  if (want('boss')) {
    await ev(() => { window.__tli.G.wallet = 1000; return BonkMart.buy('chaos_boss'); });
    await look(16.6, -0.9, 23.3, 1.7, 1.4);
    await gw(3);
    await page.shot('s18-boss-through-door');
    await ev(() => { W.doors.main.open(); return true; });
    await look(19.2, -0.6, 23.3, 1.6, 1.4);
    await gw(1.2);
    await page.shot('s19-boss-door-open');
  }

  if (want('stapler')) {
    await ev(() => { const T = window.__tli; T.G.wallet = 2000; return BonkMart.buy('chaos_stapler'); });
    const d = await ev(() => { const d = W.desks[Chaos.lastDesk >= 0 ? Chaos.lastDesk : 0]; return { x: d.x, z: d.z, rot: d.rot, n: Chaos.staplers.size }; });
    await gw(0.5);
    const n = await ev(() => Chaos.staplers.size);
    check('stapler on the desk', n === 1, { n, desk: d });
    // stand behind the chair, look down at the desk top
    await ev(d => { const T = window.__tli, c = Math.cos(d.rot), s = Math.sin(d.rot); const x = d.x + s * 1.25 + c * -0.2, z = d.z + c * 1.25 - s * -0.2; const tx = d.x + c * -0.36 + s * -0.12, tz = d.z - s * -0.36 + c * -0.12; const P = T.P; P.pos.x = x; P.pos.z = z; const a = lookAngles({ x, y: 1.62, z }, { x: tx, y: 0.78, z: tz }); P.yaw = a.yaw; P.pitch = a.pitch; return true; }, d);
    await gw(0.6);
    await page.shot('s20-stapler');
  }
  const errs = page.errors.length; check('no page errors', !errs, errs);
};
