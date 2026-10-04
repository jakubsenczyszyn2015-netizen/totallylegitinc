'use strict';
/* =====================================================================
   COSMIC COOKIE — idle clicker desktop app (bought in BonkMart, $150).
   Click the big cookie, buy automation units, upgrades, boosts and synergies.
   Keeps baking while the window is closed (Loop hook), saves to G.prog.cookie.
   Cookies are not money (the boss can tell). API: docs/modules/games.md
   ===================================================================== */
const Cookie = (() => {
  /* ---------- glyphs (24x24, white) — added to OS.glyphs so OS.tile can draw them ---------- */
  const n2 = v => Math.round(v * 100) / 100;
  const CI = (cx, cy, r) => `M${n2(cx - r)} ${cy}a${r} ${r} 0 1 0 ${n2(2 * r)} 0a${r} ${r} 0 1 0 ${n2(-2 * r)} 0z`;
  const RR = (x, y, w, h, r) => `M${n2(x + r)} ${y}h${n2(w - 2 * r)}a${r} ${r} 0 0 1 ${r} ${r}v${n2(h - 2 * r)}a${r} ${r} 0 0 1 ${-r} ${r}h${n2(2 * r - w)}a${r} ${r} 0 0 1 ${-r} ${-r}v${n2(2 * r - h)}a${r} ${r} 0 0 1 ${r} ${-r}z`;
  const P = d => `<path fill-rule="evenodd" d="${d}"/>`, F = d => `<path d="${d}"/>`;
  const S = (d, w = 2) => `<path d="${d}" fill="none" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  Object.assign(OS.glyphs, {
    ck_intern: F(CI(12, 7, 4.2)) + P('M3.8 21.5c.4-4.8 3.8-7.6 8.2-7.6s7.8 2.8 8.2 7.6z' + 'M11 14.6h2l.7 2.1-1.7 3.9-1.7-3.9z'),
    ck_micro: P(RR(2, 5, 20, 14, 2.2) + RR(4.2, 7.2, 11, 9.6, 1.2) + CI(18.4, 9.4, 1.1) + CI(18.4, 12.8, 1.1)) + F('M3.5 19h3v1.8h-3zM17.5 19h3v1.8h-3z'),
    ck_grandma: F(CI(12, 3.8, 2.6)) + P(CI(12, 11, 6.2) + CI(9.4, 11.2, 1.8) + CI(14.6, 11.2, 1.8)) + F('M4.5 22c.5-3.4 3.6-5 7.5-5s7 1.6 7.5 5z'),
    ck_farm: P('M2.5 10.5 12 3.2l9.5 7.3V21h-19z' + 'M8.6 21v-6.2h6.8V21z' + 'M10.4 8.6h3.2v2.8h-3.2z') + S('M8.6 14.8l6.8 6.2M15.4 14.8 8.6 21', 1.2),
    ck_mine: S('M4.2 20.2 14.4 10', 2.8) + S('M7.6 3.8Q17.6 4.8 20.4 16.4', 3.2),
    ck_cartel: P('M6 13.4c0-4.2 1.5-8.6 3.6-8.6 1 0 1.5.9 2.4.9s1.4-.9 2.4-.9c2.1 0 3.6 4.4 3.6 8.6z' + 'M6.2 10.6h11.6v1.8H6.2z') + F('M1.8 13.6c3 2.8 17.4 2.8 20.4 0-.9 3.6-4.8 5.4-10.2 5.4s-9.3-1.8-10.2-5.4z'),
    ck_printer: F('M6.5 2.5h11V7h-11z') + P(RR(2.2, 7.8, 19.6, 9.4, 2.2) + 'M16.8 10.4h2.4v1.6h-2.4z') + P('M6.5 13.5h11V22h-11z' + CI(12, 17.8, 2.4)),
    ck_moon: P('M15.6 2.6A9.6 9.6 0 1 0 21.4 16.2 7.7 7.7 0 0 1 15.6 2.6z' + CI(9, 14.5, 1.6) + CI(12.4, 18.2, 1)),
    ck_toaster: F(RR(6.2, 3.2, 4.8, 7, 1.6) + RR(13, 3.2, 4.8, 7, 1.6)) + P(RR(2.5, 9, 19, 11.5, 3) + CI(16.6, 14.8, 2.2)) + S('M16.6 13.6v1.2l.8.6', 1),
    ck_sing: P(CI(12, 12, 10) + CI(12, 12, 8.2)) + S('M12 12m-1.2 0a1.2 1.2 0 1 1 2.4 0a3.2 3.2 0 1 1-6.4 0a5.2 5.2 0 1 1 10.4 0', 1.9) + F(CI(12, 12, 1.5)),
    ck_mouse: P('M12 2.5c4 0 6.8 3 6.8 7.4v4.6c0 4.2-2.9 7-6.8 7s-6.8-2.8-6.8-7V9.9C5.2 5.5 8 2.5 12 2.5z' + 'M11.3 4.6h1.4v5h-1.4z'),
    ck_mitt: F('M8 21.5V12C6.6 11 5 9.4 4.4 7.6c-.5-1.6 1.6-2.6 2.6-1.2L8.6 9V6.2a3.6 3.6 0 0 1 7.2 0V14c0 1.2-.2 1.6.8 2.6l2 2v2.9z') + F('M7 21.5h12V23H7z'),
    ck_kbd: P(RR(1.8, 6.5, 20.4, 11, 2) + 'M4.4 9h2v2h-2zM7.6 9h2v2h-2zM10.8 9h2v2h-2zM14 9h2v2h-2zM17.2 9h2.4v2h-2.4zM4.4 12.4h3v2h-3zM8.8 12.4h6.4v2H8.8zM16.6 12.4h3v2h-3z'),
    ck_mug: P('M4 6h12.5v11a3.5 3.5 0 0 1-3.5 3.5H7.5A3.5 3.5 0 0 1 4 17z' + 'M6 8h8.5v1.6H6z') + S('M16.5 9h1.6a2.5 2.5 0 0 1 0 5h-1.6', 2) + S('M8 1.8c-.8 1 .8 1.6 0 2.8M12 1.8c-.8 1 .8 1.6 0 2.8', 1.3)
  });

  /* ---------- catalog ---------- */
  const UNITS = [
    ['intern', 'Intern', 15, 0.1, '#f08c00', 'Clicks the cookie for you. Unpaid. Thrilled.'],
    ['micro', 'Microwave', 100, 1, '#e8590c', 'Reheats yesterday\'s crumbs into today\'s cookies.'],
    ['grandma', 'Grandma Hotline', 1100, 8, '#d6336c', 'Call-in grandmas bake while they wait on hold.'],
    ['farm', 'Cookie Farm', 12000, 47, '#2f9e44', 'Free-range, organic, suspiciously round.'],
    ['mine', 'Dough Mine', 130000, 260, '#868e96', 'Deep veins of raw dough. Hard hats optional.'],
    ['cartel', 'Bakery Cartel', 1.4e6, 1400, '#5c3d2e', 'Controls 98% of the world\'s sprinkles. Do not ask.'],
    ['printer', 'Cookie Printer', 2e7, 7800, '#1c7ed6', 'Prints cookies on demand. Still jams on Mondays.'],
    ['moon', 'Moon Oven', 3.3e8, 44000, '#5f3dc4', 'Bakes in reflected sunlight. Low gravity, high rise.'],
    ['toaster', 'Time Toaster', 5.1e9, 260000, '#0c8599', 'Toasts cookies from next week. Tastes like Friday.'],
    ['sing', 'Cookie Singularity', 7.5e10, 1.6e6, '#212529', 'Every cookie, everywhere, all at once. Crunchy.']
  ].map(([id, name, cost, cps, col, desc]) => ({ id, name, cost, cps, col, desc, icon: 'ck_' + id }));
  const UNIT = {}; UNITS.forEach(u => { UNIT[u.id] = u; });
  const CLICKS = [
    { id: 'finger', name: 'Reinforced Index Finger', cost: 100, mul: 2, icon: 'hand', col: '#f08c00', desc: 'A gym membership for one finger.' },
    { id: 'mouse', name: 'Ergonomic Mouse', cost: 500, mul: 2, icon: 'ck_mouse', col: '#1c7ed6', desc: 'Shaped like a cookie. Confusing, but fast.' },
    { id: 'mitts', name: 'Oven Mitts of Power', cost: 1e4, mul: 2, icon: 'ck_mitt', col: '#e03131', desc: 'Click hot cookies without the ouch.' },
    { id: 'elbow', name: 'Elbow Grease', cost: 5e4, pct: 0.01, icon: 'bolt', col: '#f59f00', desc: 'Every click also bakes 1% of your cookies per second.' },
    { id: 'kbd', name: 'Clacky Keyboard', cost: 1e6, pct: 0.02, icon: 'ck_kbd', col: '#495057', desc: 'Every click is a symphony. The cubicle next door disagrees.' },
    { id: 'iv', name: 'Coffee IV Drip', cost: 1e7, mul: 3, icon: 'ck_mug', col: '#7b4a2b', desc: 'Hydration, but make it espresso.' },
    { id: 'poster', name: 'Motivational Poster', cost: 2e8, pct: 0.03, icon: 'image', col: '#0c8599', desc: '"HANG IN THERE." You hang. You click.' },
    { id: 'hand', name: 'The Hand of Management', cost: 5e9, mul: 5, icon: 'crown', col: '#ae3ec9', desc: 'Delegates the clicking to itself.' },
    { id: 'cosmic', name: 'Cosmic Wrist', cost: 1e11, pct: 0.05, icon: 'star', col: '#5f3dc4', desc: 'Your wrist has reached low orbit.' }
  ];
  const BOOSTS = [
    { id: 'lure', name: 'Golden Cookie Lure', icon: 'cookie', col: '#e0a800', mins: 3, min: 300, cd: 120, desc: 'Wave a sugar cube out of the window. A golden cookie drifts by.' },
    { id: 'frenzy', name: 'Frenzy', icon: 'flame', col: '#e8590c', mins: 2, min: 200, cd: 180, dur: 30, desc: 'Production x7 for 30 seconds. The ovens scream.' },
    { id: 'clickf', name: 'Click Frenzy', icon: 'bolt', col: '#7048e8', mins: 1, min: 100, cd: 120, dur: 15, desc: 'Clicks x10 for 15 seconds. Hydrate your finger.' },
    { id: 'rush', name: 'Sugar Rush', icon: 'rocket', col: '#d6336c', mins: 1.5, min: 500, cd: 300, dur: 120, desc: 'Production x2 for 2 minutes. Then a nap.' }
  ];
  const BOOST_LBL = { frenzy: 'FRENZY x7', clickf: 'CLICK FRENZY x10', rush: 'SUGAR RUSH x2' };
  const SYN = [
    ['intern', 'micro', 'Microwave Training Day', 'Interns finally learn which button is START.'],
    ['micro', 'grandma', 'Reheated Wisdom', 'Grandmas explain the popcorn setting. Twice.'],
    ['grandma', 'farm', 'Grandma Goes Rural', 'Fresh air, fresh dough, fresh gossip.'],
    ['farm', 'mine', 'Topsoil Dough', 'Turns out the dirt was dough all along.'],
    ['mine', 'cartel', 'Vertical Integration', 'The cartel buys the mine. The mine buys a hat.'],
    ['cartel', 'printer', 'Counterfeit Crumbs', 'Indistinguishable from real crumbs. Mostly.'],
    ['printer', 'moon', 'Printed in Space', 'Zero-gravity toner. The cookies come out rounder.'],
    ['moon', 'toaster', 'Toast of Tomorrow', 'The moon oven preheats next Tuesday.'],
    ['toaster', 'sing', 'Event Horizon Snack', 'Nothing escapes. Especially not crumbs.'],
    ['intern', 'sing', 'Intern of Infinity', 'One intern, every timeline, still unpaid.']
  ].map(([a, b, name, desc]) => ({ id: a + '_' + b, a, b, name, desc, need: 10, cost: (UNIT[a].cost + UNIT[b].cost) * 60 }));
  const MS = ['Crumb Collector', 'Snack Dealer', 'Bake Sale Legend', 'Dough Baron', 'Cookie Mogul', 'Crumb Tycoon', 'Sugar Monarch', 'Biscuit Emperor', 'Galactic Baker', 'Cookie Deity'];
  const msAt = i => Math.pow(10, i + 2);                       // 100, 1k, 10k…
  const msName = i => i < MS.length ? MS[i] : MS[MS.length - 1] + ' ' + (i - MS.length + 2);
  const TIER = 25;                                              // every 25 owned doubles that unit

  /* ---------- number formatting: 77.946 Thousand ---------- */
  const NAMES = ['Thousand', 'Million', 'Billion', 'Trillion', 'Quadrillion', 'Quintillion', 'Sextillion', 'Septillion', 'Octillion', 'Nonillion', 'Decillion'];
  const SHORT = ['K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
  const comma = n => Math.floor(n).toLocaleString('en-US');
  const exp3 = n => Math.min(NAMES.length, Math.floor(Math.log10(n) / 3 + 1e-9));
  const dec = n => n < 100 && n % 1 ? (Math.floor(n * 10) / 10).toFixed(1) : comma(n);   // 0.1 … 99.9, then whole numbers
  /* named(n): '77.946 Thousand' (round: '100 Million'); fmt(n): commas below a million; sh(n): '1.54M' for buttons */
  function named(n, round) { if (n < 1000) return comma(n); const e = exp3(n), v = Math.floor(n / Math.pow(1000, e) * 1000) / 1000; return (round ? +v.toFixed(3) : v.toFixed(3)) + ' ' + NAMES[e - 1]; }
  const fmt = n => n < 1e6 ? comma(n) : named(n);
  const rateTxt = n => n < 1e6 ? dec(n) : named(n);
  function sh(n) { if (n < 1e4) return dec(n); const e = exp3(n); return +(n / Math.pow(1000, e)).toFixed(n / Math.pow(1000, e) >= 100 ? 1 : 2) + SHORT[e - 1]; }

  /* ---------- state (G.prog.cookie) ---------- */
  const owned = () => !!(G.prog && G.prog.apps && G.prog.apps.cookie);
  function st() {
    if (!G.prog) return null;
    let s = G.prog.cookie;
    if (!s || typeof s !== 'object') s = G.prog.cookie = {};
    if (!s.units) Object.assign(s, { c: 0, life: 0, clicks: 0, units: {}, up: {}, syn: {}, b: {}, cd: {}, ms: 0, golden: 0, sold: 0 });
    s.b = s.b || {}; s.cd = s.cd || {};
    return s;
  }
  let cache = null, cacheFor = null, saveT = 0, dirtyT = 0;
  const dirty = () => { cache = null; dirtyT = 1; };
  const cnt = (s, id) => s.units[id] || 0;
  const tierOf = n => Math.min(12, Math.floor(n / TIER));
  /* per-unit multiplier: tiers x synergies */
  function unitMult(s, u) {
    let m = Math.pow(2, tierOf(cnt(s, u.id)));
    for (const y of SYN) if (s.syn[y.id]) { if (y.a === u.id) m *= 1 + 0.03 * cnt(s, y.b); if (y.b === u.id) m *= 1 + 0.01 * cnt(s, y.a); }
    return m;
  }
  /* base production (no timed boosts), cached until something is bought */
  function base(s) {
    if (cache && cacheFor === s) return cache;
    let cps = 0; const per = {};
    for (const u of UNITS) { const k = cnt(s, u.id); per[u.id] = u.cps * unitMult(s, u); cps += k * per[u.id]; }
    const msMul = 1 + 0.05 * (s.ms || 0); cps *= msMul;
    let cm = 1, pct = 0; for (const c of CLICKS) if (s.up[c.id]) { if (c.mul) cm *= c.mul; if (c.pct) pct += c.pct; }
    cacheFor = s; cache = { cps, per, msMul, cm, pct };
    return cache;
  }
  const boostMul = s => ((s.b.frenzy || 0) > 0 ? 7 : 1) * ((s.b.rush || 0) > 0 ? 2 : 1);
  const rate = s => base(s).cps * boostMul(s);
  const clickPow = s => { const b = base(s); return (b.cm + rate(s) * b.pct) * ((s.b.clickf || 0) > 0 ? 10 : 1); };
  const unitCost = (u, have, n) => u.cost * Math.pow(1.15, have) * (Math.pow(1.15, n) - 1) / 0.15;
  const maxBuy = (u, have, c) => Math.max(0, Math.floor(Math.log(c * 0.15 / (u.cost * Math.pow(1.15, have)) + 1) / Math.log(1.15)));
  const boostCost = (s, bo) => Math.max(bo.min, Math.ceil(base(s).cps * 60 * bo.mins));
  const unlocked = (s, u, i) => i === 0 || cnt(s, u.id) > 0 || s.life >= u.cost * 0.5 || cnt(s, UNITS[i - 1].id) > 0;

  function gain(s, v) { s.c += v; s.life += v; }
  function checkMs(s) {
    let hit = false;
    while (s.life >= msAt(s.ms || 0)) { s.ms = (s.ms || 0) + 1; hit = true; }
    if (!hit) return;
    dirty(); const name = msName(s.ms - 1);
    Bus.emit('cookie:milestone', { n: s.ms, name });
    const w = OS.wins.get('cookie');
    if (w && w.banner) w.banner('MILESTONE: ' + name.toUpperCase(), '+5% production');
    else if (OS.open) toast('Cosmic Cookie milestone: ' + name + ' (+5% production)', 'good');
  }

  /* ---------- background baking (runs every frame) ---------- */
  function tick(dt) {
    if (G.phase === 'menu' || !owned()) return;
    const s = st(); if (!s) return;
    if (dt > 1) dt = 1;
    const b = s.b, cd = s.cd;
    for (const k in b) if (b[k] > 0) b[k] = b[k] > dt ? b[k] - dt : 0;
    for (const k in cd) if (cd[k] > 0) cd[k] = cd[k] > dt ? cd[k] - dt : 0;
    const r = rate(s); if (r > 0) gain(s, r * dt);
    if (s.life >= msAt(s.ms || 0)) checkMs(s);
    saveT += dt;
    if (saveT > 10) { saveT = 0; if (dirtyT || r > 0) { dirtyT = 0; Game.saveProgress(); } }
  }
  Loop.add(tick);

  /* ---------- actions ---------- */
  const snd = {
    click() { AudioSys.tone(rand(380, 520), 0.06, 'triangle', 0.07, 0, rand(600, 760)); AudioSys.noise(0.04, 0.03, 0, 2400); },
    buy() { AudioSys.tone(660, 0.07, 'triangle', 0.1); AudioSys.tone(990, 0.1, 'triangle', 0.1, 0.06); },
    gold() { [784, 988, 1175, 1568].forEach((f, i) => AudioSys.tone(f, 0.16, 'sine', 0.1, i * 0.06)); },
    no() { AudioSys.tone(180, 0.09, 'square', 0.05); }
  };
  function buyUnit(u, n) {
    const s = st(), have = cnt(s, u.id); if (n === 'max') n = maxBuy(u, have, s.c);
    if (n < 1) return snd.no();
    const cost = unitCost(u, have, n); if (s.c < cost) return snd.no();
    s.c -= cost; s.units[u.id] = have + n; dirty(); snd.buy();
    if (tierOf(have + n) > tierOf(have)) { const w = OS.wins.get('cookie'); if (w && w.banner) w.banner(u.name.toUpperCase() + ' TIER ' + tierOf(have + n), u.name + ' output doubled'); }
    return true;
  }
  function buyUp(c) { const s = st(); if (s.up[c.id] || s.c < c.cost) return snd.no(); s.c -= c.cost; s.up[c.id] = 1; dirty(); snd.buy(); return true; }
  function buySyn(y) { const s = st(); if (s.syn[y.id] || cnt(s, y.a) < y.need || cnt(s, y.b) < y.need || s.c < y.cost) return snd.no(); s.c -= y.cost; s.syn[y.id] = 1; dirty(); snd.buy(); return true; }
  function useBoost(bo) {
    const s = st(), cost = boostCost(s, bo); if ((s.cd[bo.id] || 0) > 0 || s.c < cost) return snd.no();
    s.c -= cost; s.cd[bo.id] = bo.cd; dirty();
    if (bo.id === 'lure') { const w = OS.wins.get('cookie'); if (w && w.gold) w.gold(); }
    else { s.b[bo.id] = bo.dur; AudioSys.tone(440, 0.4, 'sawtooth', 0.06, 0, 880); }
    snd.buy(); return true;
  }
  /* golden cookie reward: lucky lump, frenzy or click frenzy */
  function goldReward(s) {
    s.golden = (s.golden || 0) + 1; dirty(); snd.gold();
    const r = Math.random();
    if (r < 0.5) { const v = Math.floor(Math.max(13, Math.min(s.c * 0.15, base(s).cps * 900)) + 13); gain(s, v); return ['LUCKY!', '+' + fmt(v) + ' cookies']; }
    if (r < 0.8) { s.b.frenzy = Math.max(s.b.frenzy || 0, 30); return ['FRENZY!', 'Production x7 for 30 s']; }
    s.b.clickf = Math.max(s.b.clickf || 0, 15); return ['CLICK FRENZY!', 'Clicks x10 for 15 s'];
  }
  function sell() {
    const s = st(); if (s.c < 1000 || (s.cd.sell || 0) > 0) return snd.no();
    const c = s.c; s.c = 0; s.sold = (s.sold || 0) + 1; s.cd.sell = 120; Game.addWallet(1); SFX.cash();
    toast('The break room bought ' + fmt(c) + ' cookies for $1. The boss can tell.', 'good');
    return true;
  }

  /* ---------- art ---------- */
  function cookieSVG(gold) {
    let seed = gold ? 11 : 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const blob = (cx, cy, r, k, jit) => {
      const p = []; for (let i = 0; i < k; i++) { const a = i / k * Math.PI * 2, rr = r * (1 + (rnd() - 0.5) * jit); p.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
      let d = ''; for (let i = 0; i < k; i++) { const a = p[i], b = p[(i + 1) % k], m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; d += (i ? '' : 'M' + n2((p[k - 1][0] + a[0]) / 2) + ' ' + n2((p[k - 1][1] + a[1]) / 2)) + 'Q' + n2(a[0]) + ' ' + n2(a[1]) + ' ' + n2(m[0]) + ' ' + n2(m[1]); }
      return d + 'z';
    };
    const id = gold ? 'ckgg' : 'ckg', edge = blob(50, 50, 45, 26, 0.07);
    const c0 = gold ? ['#fff3b0', '#ffd23f', '#d99a00'] : ['#f6cf8a', '#d8964d', '#a9662c'], ink = gold ? '#6b4300' : '#2b1609', chip = gold ? '#b87800' : '#4a2511', chipHi = gold ? '#e8b030' : '#7a4426';
    let chips = '';
    [[33, 30, 7.5], [60, 25, 6], [72, 47, 7.8], [47, 50, 6.2], [27, 58, 6.8], [55, 72, 8], [77, 69, 5.2], [38, 79, 5], [16, 41, 4]].forEach(([x, y, r]) => {
      chips += `<path d="${blob(x, y, r, 7, 0.45)}" fill="${chip}" stroke="${ink}" stroke-width="1.6"/><ellipse cx="${n2(x - r * 0.28)}" cy="${n2(y - r * 0.3)}" rx="${n2(r * 0.32)}" ry="${n2(r * 0.2)}" fill="${chipHi}"/>`;
    });
    let dots = ''; for (let i = 0; i < 16; i++) { const a = rnd() * 6.283, r = rnd() * 38; dots += `<circle cx="${n2(50 + Math.cos(a) * r)}" cy="${n2(50 + Math.sin(a) * r)}" r="${n2(0.7 + rnd())}" fill="${gold ? '#fff8d0' : '#f9dca6'}" opacity=".7"/>`; }
    return `<svg viewBox="-2 -2 104 104" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="${id}" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="${c0[0]}"/><stop offset=".55" stop-color="${c0[1]}"/><stop offset="1" stop-color="${c0[2]}"/></radialGradient></defs>`
      + `<path d="${edge}" fill="${ink}" transform="translate(0 3.5)" opacity=".55"/><path d="${edge}" fill="url(#${id})" stroke="${ink}" stroke-width="3.6" stroke-linejoin="round"/>`
      + `<path d="M24 26Q36 13 54 12" fill="none" stroke="#fff" stroke-opacity=".38" stroke-width="4" stroke-linecap="round"/>` + dots + chips + '</svg>';
  }
  const COOKIE = cookieSVG(false), GOLD = cookieSVG(true);
  const MINI = 'url("data:image/svg+xml,' + encodeURIComponent(COOKIE) + '")';
  /* shop picture: art(ctx, w, h) */
  function art(g, w, h) {
    const img = new Image(); img.src = 'data:image/svg+xml,' + encodeURIComponent(COOKIE);
    const bg = g.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, Math.max(w, h) * 0.7); bg.addColorStop(0, '#5a3a22'); bg.addColorStop(1, '#1d140e');
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    const draw = () => { const s = Math.min(w, h) * 0.8; g.drawImage(img, (w - s) / 2, (h - s) / 2, s, s); };
    if (img.complete) draw(); else img.onload = draw;
  }

  /* ---------- window ---------- */
  function render(b, w) {
    const s = st();
    b.classList.add('ck');
    const ui = w.ui = {};
    const cookie = h('button', { class: 'ck-cookie', title: 'Bake!', html: COOKIE });
    const fx = h('div', { class: 'ck-fx' });
    const stage = ui.stage = h('div', { class: 'ck-stage' },
      h('div', { class: 'ck-rays' }), h('div', { class: 'ck-stars' }), ui.rain = h('div', { class: 'ck-rain' }),
      h('div', { class: 'ck-top' }, ui.count = h('div', { class: 'ck-count' }), ui.cps = h('div', { class: 'ck-cps' })),
      ui.chips = h('div', { class: 'ck-chips' }),
      cookie, fx, ui.goldBox = h('div', { class: 'ck-goldbox' }),
      h('div', { class: 'ck-prog' }, h('div', { class: 'ck-bar' }, ui.bar = h('i')), h('div', { class: 'ck-pl' }, ui.pl = h('span'), ui.pct = h('b'))));
    const floatTxt = (x, y, txt, cls) => { const e = h('span', { class: 'ck-plus ' + (cls || ''), style: { left: x + 'px', top: y + 'px' } }, txt); fx.append(e); setTimeout(() => e.remove(), 1100); };
    const crumbs = (x, y, k, gold) => {
      for (let i = 0; i < k; i++) {
        const e = h('i', { class: 'ck-crumb' + (gold ? ' g' : ''), style: { left: x + 'px', top: y + 'px', width: rand(4, 9) + 'px', height: rand(4, 8) + 'px' } }); fx.append(e);
        const a = rand(-Math.PI, 0), v = rand(40, 95), dx = Math.cos(a) * v, dy = Math.sin(a) * v;
        e.animate([{ transform: 'translate(0,0) rotate(0)', opacity: 1 }, { transform: `translate(${dx * 0.7}px,${dy}px) rotate(${rand(-200, 200)}deg)`, opacity: 1, offset: 0.4 },
          { transform: `translate(${dx}px,${dy + 110}px) rotate(${rand(-400, 400)}deg)`, opacity: 0 }], { duration: rand(650, 900), easing: 'cubic-bezier(.25,.6,.6,1)' });
        setTimeout(() => e.remove(), 950);
      }
    };
    const local = e => { const r = stage.getBoundingClientRect(), k = OS.ws || 1; return [(e.clientX - r.left) / k, (e.clientY - r.top) / k]; };
    cookie.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      const s = st(), v = clickPow(s); gain(s, v); s.clicks++; dirtyT = 1;
      cookie.classList.remove('sq'); void cookie.offsetWidth; cookie.classList.add('sq');
      const [x, y] = local(e); floatTxt(x + rand(-10, 10), y - 10, '+' + fmt(v), (s.b.clickf || 0) > 0 ? 'hot' : ''); crumbs(x, y, 5);
      snd.click(); Bus.emit('cookie:click', v); upd();
    });
    /* banner (milestones, tiers) */
    w.banner = (big, small) => {
      const e = h('div', { class: 'ck-banner' }, h('b', {}, big), h('span', {}, small)); stage.append(e); setTimeout(() => e.remove(), 2600);
      AudioSys.tone(523, 0.12, 'triangle', 0.1); AudioSys.tone(784, 0.2, 'triangle', 0.1, 0.1);
    };
    /* golden cookie drifting across the stage */
    w.gold = () => {
      if (ui.goldBox.firstChild) return;
      const g = h('button', { class: 'ck-gold', title: 'A golden cookie!', html: GOLD, style: { top: rand(18, 52) + '%', animationDuration: rand(8, 11) + 's' } });
      g.addEventListener('pointerdown', e => {
        e.stopPropagation(); const [x, y] = local(e); const [a, t] = goldReward(st());
        floatTxt(x, y - 24, a, 'gold'); floatTxt(x, y + 6, t, 'gold small'); crumbs(x, y, 12, true); g.remove(); upd(true);
      });
      g.addEventListener('animationend', () => g.remove());
      ui.goldBox.append(g);
    };
    w.goldT = rand(45, 120);

    /* tabs + list */
    const TABS = [['auto', 'Automation'], ['click', 'Click Power'], ['boost', 'Boosts'], ['syn', 'Synergies']];
    w.tab = w.tab || 'auto';
    const tabs = h('div', { class: 'ck-tabs' }, TABS.map(([id, label]) => h('button', { class: 'ck-tab', 'data-t': id, onclick: () => { if (w.tab === id) return; w.tab = id; SFX.click(); build(true); } }, label)));
    const list = ui.list = h('div', { class: 'ck-list' });
    ui.rows = [];
    const card = (cls, icon, col, kicker, name, sub, desc, btns) => h('div', { class: 'ck-card ' + cls },
      h('i', { class: 'ck-ic', style: { background: col }, html: OS.glyph(icon) }),
      h('div', { class: 'ck-tx' }, h('small', {}, kicker), h('b', {}, name), sub, desc ? h('p', {}, desc) : null),
      h('div', { class: 'ck-btns' }, btns));
    const buyBtn = (label, fn) => h('button', { class: 'ck-buy', onclick: () => { if (fn()) { build(); upd(); } } }, h('b', {}, label), h('span'));
    function build(top) {
      const s = st(), sc = top ? 0 : list.scrollTop;
      $$('.ck-tab', tabs).forEach(t => t.classList.toggle('on', t.dataset.t === w.tab));
      const rows = ui.rows = [], kids = [];
      if (w.tab === 'auto') {
        let locked = 0;
        UNITS.forEach((u, i) => {
          if (!unlocked(s, u, i)) {
            if (locked++ < 2) kids.push(h('div', { class: 'ck-card locked' }, h('i', { class: 'ck-ic', html: OS.glyph(u.icon) }),
              h('div', { class: 'ck-tx' }, h('small', {}, 'AUTOMATION UNIT'), h('b', {}, 'LOCKED'), h('p', {}, 'Bake ' + named(u.cost * 0.5, true) + ' cookies to discover it.'))));
            return;
          }
          const sub = h('div', { class: 'ck-sub' }), b1 = buyBtn('BUY 1', () => buyUnit(u, 1)), b10 = buyBtn('BUY 10', () => buyUnit(u, 10)), bm = buyBtn('MAX', () => buyUnit(u, 'max'));
          kids.push(card('', u.icon, u.col, 'AUTOMATION UNIT · TIER ' + tierOf(cnt(s, u.id)), u.name, sub, u.desc, [b1, b10, bm]));
          rows.push(() => {
            const k = cnt(s, u.id), per = base(s).per[u.id] * base(s).msMul, mx = maxBuy(u, k, s.c);
            sub.textContent = 'Owned ' + k + ' • ' + sh(per) + '/s each • next tier at ' + (tierOf(k) + 1) * TIER;
            const c1 = unitCost(u, k, 1), c10 = unitCost(u, k, 10), cm = unitCost(u, k, Math.max(1, mx));
            b1.lastChild.textContent = sh(c1); b1.disabled = s.c < c1;
            b10.lastChild.textContent = sh(c10); b10.disabled = s.c < c10;
            bm.firstChild.textContent = 'MAX ' + mx; bm.lastChild.textContent = sh(cm); bm.disabled = mx < 1;
          });
        });
        if (UNITS.some((u, i) => !unlocked(s, u, i)) && locked > 2) kids.push(h('div', { class: 'ck-more' }, '+ ' + (locked - 2) + ' more units somewhere in the dough'));
      } else if (w.tab === 'click') {
        kids.push(h('div', { class: 'ck-info' }, ui.clickInfo = h('span'), h('small', {}, 'Click power upgrades are permanent.')));
        rows.push(() => { ui.clickInfo.textContent = 'Each click bakes ' + fmt(clickPow(s)) + ' cookies'; });
        let next = 0;
        CLICKS.forEach(c => {
          const own = !!s.up[c.id];
          if (!own && next++ >= 3) return;                                   // owned ones + the next three
          const btn = own ? h('div', { class: 'ck-own' }, 'OWNED') : buyBtn('BUY', () => buyUp(c));
          kids.push(card(own ? 'owned' : '', c.icon, c.col, 'CLICK POWER · ' + (c.mul ? 'CLICKS x' + c.mul : '+' + Math.round(c.pct * 100) + '% CPS / CLICK'), c.name, null, c.desc, [btn]));
          if (!own) rows.push(() => { btn.lastChild.textContent = sh(c.cost); btn.disabled = s.c < c.cost; });
        });
      } else if (w.tab === 'boost') {
        kids.push(h('div', { class: 'ck-info' }, h('span', {}, 'Golden cookies drift by every minute or two. Click them!'), h('small', {}, s.golden ? 'Golden cookies caught: ' + s.golden : 'None caught yet.')));
        BOOSTS.forEach(bo => {
          const btn = buyBtn('USE', () => useBoost(bo)), bar = h('i'), sub = h('div', { class: 'ck-sub' }, h('div', { class: 'ck-tbar' }, bar));
          kids.push(card('boost', bo.icon, bo.col, 'TIMED BOOST' + (bo.dur ? ' · ' + bo.dur + ' S' : ''), bo.name, sub, bo.desc, [btn]));
          rows.push(() => {
            const cdl = s.cd[bo.id] || 0, act = s.b[bo.id] || 0, cost = boostCost(s, bo);
            btn.firstChild.textContent = act > 0 ? 'ACTIVE' : cdl > 0 ? 'WAIT' : 'USE';
            btn.lastChild.textContent = act > 0 ? Math.ceil(act) + 's' : cdl > 0 ? fmtTime(cdl) : sh(cost);
            btn.disabled = cdl > 0 || s.c < cost;
            bar.style.width = (act > 0 ? act / bo.dur * 100 : cdl > 0 ? (1 - cdl / bo.cd) * 100 : 100) + '%';
            bar.className = act > 0 ? 'act' : cdl > 0 ? 'cd' : '';
          });
        });
      } else {
        kids.push(h('div', { class: 'ck-info' }, h('span', {}, 'Pairs of units that work better together.'), h('small', {}, 'Needs 10 of each unit.')));
        SYN.forEach(y => {
          const A = UNIT[y.a], B = UNIT[y.b], own = !!s.syn[y.id], ready = cnt(s, y.a) >= y.need && cnt(s, y.b) >= y.need;
          const btn = own ? h('div', { class: 'ck-own' }, 'ACTIVE') : buyBtn(ready ? 'BUY' : 'LOCKED', () => buySyn(y));
          const icons = h('div', { class: 'ck-pair' }, h('i', { class: 'ck-ic', style: { background: A.col }, html: OS.glyph(A.icon) }), h('em', {}, '+'), h('i', { class: 'ck-ic', style: { background: B.col }, html: OS.glyph(B.icon) }));
          const el = h('div', { class: 'ck-card syn' + (own ? ' owned' : '') + (ready || own ? '' : ' dim') }, icons,
            h('div', { class: 'ck-tx' }, h('small', {}, A.name.toUpperCase() + ' + ' + B.name.toUpperCase()), h('b', {}, y.name),
              h('div', { class: 'ck-sub' }, A.name + ' +3% per ' + B.name + ' · ' + B.name + ' +1% per ' + A.name), h('p', {}, y.desc)), h('div', { class: 'ck-btns' }, btn));
          kids.push(el);
          if (!own) rows.push(() => { btn.lastChild.textContent = ready ? sh(y.cost) : Math.min(cnt(s, y.a), y.need) + '/' + y.need + ' · ' + Math.min(cnt(s, y.b), y.need) + '/' + y.need; btn.disabled = !ready || s.c < y.cost; });
        });
      }
      list.replaceChildren(...kids); list.scrollTop = sc;
      rows.forEach(f => f());
      w.unl = UNITS.filter((u, i) => unlocked(s, u, i)).length;
    }
    const foot = h('div', { class: 'ck-foot' },
      h('div', { class: 'ck-life' }, h('small', {}, 'LIFETIME COOKIE MASS'), ui.life = h('b'), ui.raw = h('span')),
      h('div', { class: 'ck-side' }, ui.sell = h('button', { class: 'ck-sell', title: 'Cookies are not money. Mostly.', onclick: () => { sell(); upd(); } }, 'Sell to the break room', h('small', {}, 'all cookies → $1')),
        ui.stat = h('small', { class: 'ck-stat' })));
    b.append(stage, tabs, list, foot);

    /* live numbers */
    let k = 0, rainN = -1;
    function upd(full) {
      const s = st(), r = rate(s), bm = boostMul(s);
      ui.count.textContent = fmt(s.c) + (s.c >= 1 && s.c < 2 ? ' cookie' : ' cookies');
      ui.cps.textContent = 'per second: ' + rateTxt(r) + (bm > 1 ? '  (x' + bm + ')' : '');
      const i = s.ms || 0, lo = i ? msAt(i - 1) : 0, hi = msAt(i), f = clamp((s.life - lo) / (hi - lo), 0, 1);
      ui.bar.style.width = (f * 100).toFixed(1) + '%'; ui.pl.textContent = 'Next milestone: ' + msName(i) + ' · ' + named(hi, true); ui.pct.textContent = Math.floor(f * 100) + '%';
      ui.life.textContent = named(s.life); ui.raw.textContent = comma(s.life);
      ui.stat.textContent = comma(s.clicks) + ' clicks · ' + (s.ms ? '+' + s.ms * 5 + '% milestone bonus' : 'no milestones yet');
      ui.sell.disabled = s.c < 1000 || (s.cd.sell || 0) > 0;
      stage.classList.toggle('frenzy', (s.b.frenzy || 0) > 0 || (s.b.rush || 0) > 0); stage.classList.toggle('clickf', (s.b.clickf || 0) > 0);
      const act = Object.keys(BOOST_LBL).filter(id => (s.b[id] || 0) > 0), key = act.map(id => id + Math.ceil(s.b[id])).join();
      if (ui.chips.dataset.k !== key) { ui.chips.dataset.k = key; ui.chips.replaceChildren(...act.map(id => h('span', { class: 'ck-chip ' + id }, BOOST_LBL[id] + ' · ' + Math.ceil(s.b[id]) + 's'))); }
      const want = r <= 0 ? 0 : Math.min(14, Math.round(Math.log10(r + 1) * 3.2));
      if (want !== rainN) {
        rainN = want;
        ui.rain.replaceChildren(...Array.from({ length: want }, () => { const z = rand(12, 22); return h('i', { style: { left: rand(2, 95) + '%', width: z + 'px', height: z + 'px', backgroundImage: MINI, animationDuration: rand(3.5, 6.5) + 's', animationDelay: -rand(0, 6) + 's' } }); }));
      }
      if (full || ++k % 4 === 0) { const unl = UNITS.filter((u, j) => unlocked(s, u, j)).length; if (unl !== w.unl && w.tab === 'auto') build(); else ui.rows.forEach(f2 => f2()); }
    }
    build(true); upd(true);
    w.timer = setInterval(() => {
      if (!w.el.isConnected) return;
      if (!w.el.classList.contains('min') && OS.open && (w.goldT -= 0.1) <= 0) { w.goldT = rand(60, 150); w.gold(); }
      upd();
    }, 100);
  }

  OS.apps.cookie = {
    desktop: true, order: 80, available: owned, title: 'Cosmic Cookie', icon: 'cookie', color: '#c2702a', cls: 'ckwin', w: 440, h: 640, x: 0.03, y: 0.01,
    render, onClose(w) { clearInterval(w.timer); Game.saveProgress(); }
  };
  Shop.add({
    id: 'app_cookie', tab: 'games', section: 'Software', name: 'Cosmic Cookie', price: 150, icon: 'cookie', color: '#c2702a', sort: 10, art,
    desc: 'An idle clicker for your desktop. Bake a galaxy of cookies. Cookies are not money. The boss can tell.',
    owned, buy() { (G.prog.apps = G.prog.apps || {}).cookie = true; Game.saveProgress(); if (OS.open) OS.buildIcons(); }
  });

  return { UNITS, CLICKS, BOOSTS, SYN, state: st, rate: () => { const s = st(); return s ? rate(s) : 0; }, click: () => { const s = st(); return s ? clickPow(s) : 0; },
    named, fmt, short: sh, cookieSVG: gold => gold ? GOLD : COOKIE, art, buyUnit: (id, n) => buyUnit(UNIT[id], n || 1), dirty };
})();
