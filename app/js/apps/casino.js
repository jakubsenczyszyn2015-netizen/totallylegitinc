'use strict';
/* =====================================================================
   LUCKYBONK CASINO — "original office casino" desktop app (BonkMart, $300).
   Crash, Slots, Plinko, Dice, Mines, Coinflip, Keno, Roulette. Every bet uses the
   Bonk Pay wallet (Game.addWallet). Fair RNG, slightly house-favoured (~2-5% edge).
   API: docs/modules/games.md
   ===================================================================== */
const Casino = (() => {
  const CHIPS = [10, 20, 50, 100, 250];
  const owned = () => !!(G.prog && G.prog.apps && G.prog.apps.casino);
  const prog = () => { const p = G.prog.casino = G.prog.casino || {}; p.tab = p.tab || 'crash'; p.bet = p.bet || 10; return p; };
  const n2 = v => Math.round(v * 100) / 100;
  const CI = (cx, cy, r) => `M${n2(cx - r)} ${cy}a${r} ${r} 0 1 0 ${n2(2 * r)} 0a${r} ${r} 0 1 0 ${n2(-2 * r)} 0z`;
  Object.assign(OS.glyphs, {
    lb_chip: `<path fill-rule="evenodd" d="${CI(12, 12, 10.5) + 'M10.5 1.5h3v4h-3zM10.5 18.5h3v4h-3zM1.5 10.5h4v3h-4zM18.5 10.5h4v3h-4z' + CI(12, 12, 6.8)}"/><path d="M12 7.6l1.3 2.8 3 .3-2.3 2 .7 3-2.7-1.6-2.7 1.6.7-3-2.3-2 3-.3z"/>`,
    lb_cherry: '<path d="M7 14a4 4 0 1 0 .1 0zM16 15a4 4 0 1 0 .1 0z"/><path d="M8 14c1-5 4-9 9-11M16 15c-1-4-1-8 1-12" fill="none" stroke-width="1.8" stroke-linecap="round"/><path d="M17 3c2-1 5 0 5 2-2 1-4 0-5-2z"/>',
    lb_plinko: `<path d="${CI(12, 4.5, 2.6)}"/><path fill-rule="evenodd" d="${[[8, 10], [16, 10], [4, 15], [12, 15], [20, 15]].map(([x, y]) => CI(x, y, 1.6)).join('')}M2 19.5h20V22H2z"/>`,
    lb_wheel: `<path fill-rule="evenodd" d="${CI(12, 12, 10) + CI(12, 12, 7.6)}"/><path d="M12 4.4v15.2M4.4 12h15.2M6.6 6.6l10.8 10.8M17.4 6.6 6.6 17.4" fill="none" stroke-width="1.6"/><path d="${CI(12, 12, 2.6)}"/>`,
    lb_bomb: `<path d="${CI(10.5, 14, 7.5)}"/><path d="M14.5 7.5l2-2 2 2-2 2z"/><path d="M17.5 5.5c1-2 3-2.5 4.5-1.5" fill="none" stroke-width="1.6" stroke-linecap="round"/>`,
    lb_coins: `<path fill-rule="evenodd" d="${CI(9, 13, 7.2) + CI(9, 13, 5.2)}"/><path d="${CI(15.5, 10, 6.6)}"/>`
  });

  /* ---------- colourful symbol art (64x64) ---------- */
  const INK = '#1b1035', svg = (inner, vb = '0 0 64 64') => `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
  const CLIPD = 'M27 49V21a6.5 6.5 0 0 1 13 0v25a9.5 9.5 0 0 1-19 0V15';
  const SYM = {
    clip: svg(`<g transform="rotate(-24 32 32)"><path d="${CLIPD}" fill="none" stroke="${INK}" stroke-width="10" stroke-linecap="round"/><path d="${CLIPD}" fill="none" stroke="#d3dbe6" stroke-width="5" stroke-linecap="round"/><path d="M23 15v6" stroke="#fff" stroke-width="2" stroke-linecap="round"/></g>`),
    mug: svg(`<path d="M44 26h3.5a7.5 7.5 0 0 1 0 15H44" fill="none" stroke="${INK}" stroke-width="8"/><path d="M44 26h3.5a7.5 7.5 0 0 1 0 15H44" fill="none" stroke="#e8484f" stroke-width="3.5"/><path d="M15 20h29v24a8.5 8.5 0 0 1-8.5 8.5h-12A8.5 8.5 0 0 1 15 44z" fill="#e8484f" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/><ellipse cx="29.5" cy="20.5" rx="14" ry="3.6" fill="#6b3a1f" stroke="${INK}" stroke-width="3"/><path d="M29.5 41.5s-6-3.6-6-7.2a3 3 0 0 1 6-1 3 3 0 0 1 6 1c0 3.6-6 7.2-6 7.2z" fill="#fff"/><path d="M19 26v14" stroke="#ff8a8f" stroke-width="3" stroke-linecap="round"/><path d="M24 6c-3 3 3 5 0 9M33 5c-3 3 3 5 0 9" stroke="#9d8ec4" stroke-width="3" fill="none" stroke-linecap="round"/>`),
    phone: svg(`<path d="M12 52l5.5-21h29L52 52z" fill="#2fb36b" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/><path d="M24 36h4v3h-4zM30 36h4v3h-4zM36 36h4v3h-4zM23 42h4v3h-4zM30 42h4v3h-4zM37 42h4v3h-4z" fill="#eafff3"/><path d="M7 25c0-8 7-13 25-13s25 5 25 13c0 3-2 5-5 5h-6c-2 0-3-1-3-3v-3H21v3c0 2-1 3-3 3h-6c-3 0-5-2-5-5z" fill="#1f8f50" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/><path d="M14 19c4-2 9-3 13-3" stroke="#7ee2a8" stroke-width="2.5" fill="none" stroke-linecap="round"/>`),
    tie: svg(`<path d="M25 7h14l-2.5 8h-9z" fill="#4263eb" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/><path d="M27.5 15h9l7 29-11.5 12-11.5-12z" fill="#4263eb" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/><path d="M26.6 21.5l11-4.4.9 3.9-12.7 5.1zM24.6 30l15.3-6.2 1 4-17.2 7zM23 39l19-7.7.9 4L22.6 43.4" fill="#ffd43b"/>`),
    stapler: svg(`<path d="M7 46h46a4.5 4.5 0 0 1 0 9H7z" fill="#4c4470" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/><path d="M9 44c0-9 7-15 18-17l22-4c5 0 7 3 5 7l-4 6c-2 3-5 5-9 5.5L14 46.5c-3 0-5-.5-5-2.5z" fill="#e8484f" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/><path d="M17 36c3-3 7-4.5 12-5.5l16-3" stroke="#ff9a9e" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="14" cy="42" r="2.4" fill="${INK}"/>`),
    bonk: svg(`<circle cx="32" cy="33.5" r="23" fill="#b86b00"/><circle cx="32" cy="31" r="23" fill="#ffc93c" stroke="${INK}" stroke-width="3.5"/><circle cx="32" cy="31" r="16.5" fill="none" stroke="#e09100" stroke-width="2.6"/><text x="32" y="41" text-anchor="middle" font-family="Lilita One,Impact,sans-serif" font-size="27" fill="#9c5600">B</text><path d="M19 22a15 15 0 0 1 9-6" stroke="#fff6cf" stroke-width="3.5" fill="none" stroke-linecap="round"/>`)
  };
  const GEM = svg('<path d="M14 25l8.5-11h19L50 25 32 51z" fill="#20c997" stroke="#063b2c" stroke-width="3" stroke-linejoin="round"/><path d="M14 25h36M22.5 14 27 25l5 26 5-26 4.5-11" fill="none" stroke="#063b2c" stroke-width="1.8" stroke-linejoin="round"/><path d="M23 16l3.5 8H16.5z" fill="#96f2d7"/><path d="M27 25h10l-5 22z" fill="#63e6be"/>');
  const BOMB = svg(`<circle cx="29" cy="37" r="17" fill="#2b2140" stroke="${INK}" stroke-width="3.5"/><path d="M38 21l5-5 5 5-5 5z" fill="#4c4470" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M46 17c2-5 6-7 10-5" stroke="#9c8a6a" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M57 7l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z" fill="#ffd43b"/><path d="M20 30a11 11 0 0 1 6-5" stroke="#8e7cc3" stroke-width="3.5" fill="none" stroke-linecap="round"/>`);
  const STACHE = '<path d="M32 36c-3-5-9-6-14-4-5 2-8 1-10-2 0 6 5 10 12 10 5 0 9-2 12-4 3 2 7 4 12 4 7 0 12-4 12-10-2 3-5 4-10 2-5-2-11-1-14 4z" fill="#7a4a00"/>';
  const COIN_H = svg(`<circle cx="32" cy="32" r="29" fill="#ffc93c" stroke="#8a5300" stroke-width="3"/><circle cx="32" cy="32" r="23" fill="none" stroke="#e09100" stroke-width="2" stroke-dasharray="3 3"/>${STACHE}<path d="M22 24c3-2 6-2 8 0M34 24c2-2 5-2 8 0" stroke="#7a4a00" stroke-width="3" fill="none" stroke-linecap="round"/><text x="32" y="55" text-anchor="middle" font-family="Roboto,sans-serif" font-weight="900" font-size="6.5" fill="#8a5300" letter-spacing="1">THE BOSS</text><text x="32" y="15" text-anchor="middle" font-family="Roboto,sans-serif" font-weight="900" font-size="6" fill="#8a5300" letter-spacing="1">HEADS</text>`);
  const COIN_T = svg(`<circle cx="32" cy="32" r="29" fill="#b197fc" stroke="#4b2e9e" stroke-width="3"/><circle cx="32" cy="32" r="23" fill="none" stroke="#7950f2" stroke-width="2" stroke-dasharray="3 3"/><text x="32" y="44" text-anchor="middle" font-family="Lilita One,Impact,sans-serif" font-size="34" fill="#4b2e9e">B</text><text x="32" y="55" text-anchor="middle" font-family="Roboto,sans-serif" font-weight="900" font-size="6.5" fill="#4b2e9e" letter-spacing="1">BONK</text><text x="32" y="15" text-anchor="middle" font-family="Roboto,sans-serif" font-weight="900" font-size="6" fill="#4b2e9e" letter-spacing="1">TAILS</text>`);

  /* ---------- sound ---------- */
  let lastSad = -9;
  const snd = {
    chip() { AudioSys.tone(1500, 0.03, 'square', 0.03); AudioSys.tone(2300, 0.03, 'square', 0.022, 0.03); },
    tick(f) { AudioSys.tone(f || 1700, 0.025, 'square', 0.022); },
    win() { SFX.cash(); },
    big() { [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => AudioSys.tone(f, 0.28, 'triangle', 0.13, i * 0.08)); setTimeout(() => SFX.cash(), 450); },
    boom() { AudioSys.noise(0.7, 0.32, 0, 420); AudioSys.tone(120, 0.6, 'sawtooth', 0.12, 0, 38); },
    no() { AudioSys.tone(170, 0.12, 'square', 0.05); },
    /* the sad trombone: four filtered brass notes, the last one wobbling down */
    sad() {
      const A = AudioSys; if (!A.ctx) return;
      if (now() - lastSad < 3) { A.tone(160, 0.18, 'triangle', 0.07, 0, 110); return; }
      lastSad = now(); const c = A.ctx, t0 = c.currentTime + 0.05;
      [[293.7, 0, 0.36], [277.2, 0.42, 0.36], [261.6, 0.84, 0.36], [246.9, 1.26, 1.25]].forEach(([f, at, d], i) => {
        const o = c.createOscillator(), fl = c.createBiquadFilter(), g = c.createGain(), s = t0 + at;
        o.type = 'sawtooth'; o.frequency.setValueAtTime(f * 1.04, s); o.frequency.exponentialRampToValueAtTime(f, s + 0.08);
        fl.type = 'lowpass'; fl.Q.value = 6; fl.frequency.setValueAtTime(350, s); fl.frequency.linearRampToValueAtTime(1500, s + 0.12); fl.frequency.linearRampToValueAtTime(600, s + d);
        g.gain.setValueAtTime(0.0001, s); g.gain.exponentialRampToValueAtTime(0.1, s + 0.05); g.gain.setValueAtTime(0.1, s + d - 0.1); g.gain.exponentialRampToValueAtTime(0.0001, s + d);
        if (i === 3) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = 5.5; lg.gain.value = 7; l.connect(lg); lg.connect(o.frequency); l.start(s + 0.2); l.stop(s + d); o.frequency.linearRampToValueAtTime(f * 0.93, s + d); }
        o.connect(fl); fl.connect(g); g.connect(A.sfx); o.start(s); o.stop(s + d + 0.05);
      });
    }
  };

  /* ---------- helpers ---------- */
  const C = (n, k) => { if (k < 0 || k > n) return 0; let r = 1; for (let i = 1; i <= k; i++) r = r * (n - k + i) / i; return r; };
  const xs = m => (m >= 100 ? m.toFixed(0) : m >= 10 ? m.toFixed(1) : m.toFixed(2)) + '×';
  const ease = t => 1 - Math.pow(1 - t, 3);
  function mkCanvas(w, ht, cls) {
    const k = Math.min(2.5, (OS.ws || 1) * (window.devicePixelRatio || 1)), c = h('canvas', { class: cls || '', width: Math.round(w * k), height: Math.round(ht * k) });
    c.style.width = w + 'px'; c.style.height = ht + 'px'; const g = c.getContext('2d'); g.setTransform(k, 0, 0, k, 0, 0); return [c, g];
  }
  const weighted = list => { let r = Math.random() * list.reduce((a, x) => a + x[1], 0); for (const x of list) if ((r -= x[1]) < 0) return x[0]; return list[0][0]; };

  /* =====================================================================
     GAMES — each: { id, name, icon, act: label, mount(ctx) -> { act(), label(), busy(), stop(), frame(dt) } }
     ctx: main/side elements, bet(), take(bet), pay(bet, mult, note), status(text, kind), hist(text, kind), fx(...)
     ===================================================================== */
  const GAMES = [];

  /* ----- CRASH: a rising multiplier, cash out before the rocket pops ----- */
  GAMES.push({ id: 'crash', name: 'Crash', icon: 'rocket', mount(x) {
    const [cv, g] = mkCanvas(396, 300, 'lb-cv');
    const auto = h('input', { class: 'lb-inp', type: 'number', min: 1.01, step: 0.01, placeholder: 'off', value: prog().auto || '' });
    auto.onchange = () => { prog().auto = +auto.value > 1 ? +auto.value : 0; };
    x.main.append(h('div', { class: 'lb-crash' }, cv));
    x.opts(h('label', { class: 'lb-field' }, h('span', {}, 'AUTO CASH OUT AT'), h('div', { class: 'lb-inrow' }, auto, h('em', {}, '×'))), h('p', { class: 'lb-note' }, 'The rocket can pop at any moment. 3% of launches pop on the pad.'));
    const K = 0.13, s = { ph: 'idle', t: 0, m: 1, at: 0, bet: 0, out: 0, parts: [], wait: 0, last: prog().lastCrash || 0 };
    const pts = new Float32Array(122);
    function draw() {
      const W = 396, H = 300, L = 38, B = 26, T = 18, R = 14;
      g.clearRect(0, 0, W, H); let tip = null;
      const tMax = Math.max(8, s.t * 1.12), mMax = Math.max(2, s.m * 1.18);
      const X = t => L + t / tMax * (W - L - R), Y = m => H - B - (m - 1) / (mMax - 1) * (H - B - T);
      g.lineWidth = 1; g.font = '600 10px Roboto,sans-serif'; g.fillStyle = '#8d84b8'; g.textAlign = 'right';
      const stepM = mMax > 20 ? 5 : mMax > 8 ? 2 : mMax > 4 ? 1 : mMax > 2.5 ? 0.5 : 0.25;
      for (let m = 1; m <= mMax + 1e-6; m += stepM) { const y = Y(m); g.strokeStyle = 'rgba(124,92,255,.16)'; g.beginPath(); g.moveTo(L, y); g.lineTo(W - R, y); g.stroke(); g.fillText(m.toFixed(stepM < 1 ? 2 : 0) + '×', L - 5, y + 3); }
      g.textAlign = 'center'; const stepT = tMax > 30 ? 10 : tMax > 14 ? 4 : 2;
      for (let t = 0; t <= tMax; t += stepT) { const xx = X(t); g.strokeStyle = 'rgba(124,92,255,.1)'; g.beginPath(); g.moveTo(xx, T); g.lineTo(xx, H - B); g.stroke(); g.fillText(t + 's', xx, H - 9); }
      if (s.ph === 'fly' || s.ph === 'crashed') {
        const n = 60; for (let i = 0; i <= n; i++) { const t = s.t * i / n; pts[i * 2] = X(t); pts[i * 2 + 1] = Y(Math.exp(K * t)); }
        const grd = g.createLinearGradient(0, H, 0, T); grd.addColorStop(0, 'rgba(255,79,216,0)'); grd.addColorStop(1, s.ph === 'crashed' ? 'rgba(255,77,109,.35)' : 'rgba(255,79,216,.38)');
        g.beginPath(); g.moveTo(pts[0], H - B); for (let i = 0; i <= n; i++) g.lineTo(pts[i * 2], pts[i * 2 + 1]); g.lineTo(pts[n * 2], H - B); g.closePath(); g.fillStyle = grd; g.fill();
        g.beginPath(); for (let i = 0; i <= n; i++) g[i ? 'lineTo' : 'moveTo'](pts[i * 2], pts[i * 2 + 1]);
        g.strokeStyle = s.ph === 'crashed' ? '#ff4d6d' : '#ff4fd8'; g.lineWidth = 4; g.lineCap = 'round'; g.shadowColor = g.strokeStyle; g.shadowBlur = 12; g.stroke(); g.shadowBlur = 0;
        const tx = pts[n * 2], ty = pts[n * 2 + 1], ang = Math.atan2(pts[n * 2 + 1] - pts[(n - 3) * 2 + 1], pts[n * 2] - pts[(n - 3) * 2]);
        if (s.ph === 'fly') tip = [tx, ty, ang];
        if (s.out) { const yo = Y(s.out); g.setLineDash([5, 5]); g.strokeStyle = 'rgba(53,224,138,.7)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(L, yo); g.lineTo(W - R, yo); g.stroke(); g.setLineDash([]); g.fillStyle = '#35e08a'; g.textAlign = 'left'; g.font = '700 10px Roboto,sans-serif'; g.fillText('YOU CASHED OUT ' + xs(s.out), L + 6, yo - 5); }
      } else rocket(L + 22, H - B - 14, -Math.PI / 2.6);
      for (const p of s.parts) { g.globalAlpha = Math.max(0, p.l); g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.283); g.fill(); }
      g.globalAlpha = 1; g.textAlign = 'center';
      if (s.ph === 'idle') { big(s.last ? 'LAST: ' + xs(s.last) : 'PLACE YOUR BET', s.last ? (s.last >= 2 ? '#35e08a' : '#ff4d6d') : '#e6e0ff', 30); sub('Pick a wager, press BET, cash out before it pops'); }
      else if (s.ph === 'count') { big('LAUNCHING…', '#ffc93c', 34); sub('Fasten your lanyard'); }
      else if (s.ph === 'fly') { big(xs(s.m), s.out ? '#35e08a' : '#ffffff', 56); sub(s.out ? 'Cashed out: +' + money(Math.floor(s.bet * s.out)) : 'Current payout ' + money(Math.floor(s.bet * s.m))); }
      else { big('POPPED @ ' + xs(s.at), '#ff4d6d', 38); sub(s.out ? 'You got out at ' + xs(s.out) + ' — nice' : s.bet ? 'Lost ' + money(s.bet) : ''); }
      if (tip) rocket(tip[0], tip[1], tip[2]);
    }
    /* big caption: centred while idle, top-left while the curve is on screen */
    const at = () => s.ph === 'fly' || s.ph === 'crashed' ? [52, 70, 'left'] : [208, 108, 'center'];
    function big(t, col, size) { const [px, py, al] = at(); g.textAlign = al; g.font = `400 ${size}px "Lilita One",sans-serif`; g.lineWidth = 6; g.strokeStyle = 'rgba(10,6,30,.85)'; g.lineJoin = 'round'; g.strokeText(t, px, py); g.fillStyle = col; g.fillText(t, px, py); }
    function sub(t) { const [px, py, al] = at(); g.textAlign = al; g.font = '600 12px Roboto,sans-serif'; g.fillStyle = '#b8b0e0'; g.fillText(t, px + (al === 'left' ? 2 : 0), py + 24); }
    function rocket(x0, y0, a) {
      g.save(); g.translate(x0, y0); g.rotate(a);
      const fl = 8 + Math.random() * 6; g.fillStyle = '#ffc93c'; g.beginPath(); g.moveTo(-10, -4); g.lineTo(-10 - fl, 0); g.lineTo(-10, 4); g.fill();
      g.fillStyle = '#ff6b3c'; g.beginPath(); g.moveTo(-10, -2.5); g.lineTo(-10 - fl * 0.6, 0); g.lineTo(-10, 2.5); g.fill();
      g.lineWidth = 2; g.strokeStyle = INK; g.fillStyle = '#ff4d6d'; g.beginPath(); g.moveTo(-7, -5); g.lineTo(-12, -10); g.lineTo(-3, -6); g.moveTo(-7, 5); g.lineTo(-12, 10); g.lineTo(-3, 6); g.fill(); g.stroke();
      g.fillStyle = '#f1f0ff'; g.beginPath(); g.ellipse(2, 0, 12, 6, 0, 0, 6.283); g.fill(); g.stroke();
      g.fillStyle = '#4dabf7'; g.beginPath(); g.arc(4, 0, 2.6, 0, 6.283); g.fill(); g.stroke(); g.restore();
    }
    function explode() {
      const W = 396, H = 300, tMax = Math.max(8, s.t * 1.12), mMax = Math.max(2, s.m * 1.18), px = 38 + s.t / tMax * (W - 52), py = H - 26 - (s.m - 1) / (mMax - 1) * (H - 44);
      for (let i = 0; i < 34; i++) { const a = rand(0, 6.283), v = rand(40, 190); s.parts.push({ x: px, y: py, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: rand(1.5, 4.5), l: 1, c: pick(['#ff4d6d', '#ffc93c', '#ff922b', '#fff']) }); }
      cv.parentNode.classList.remove('shake'); void cv.offsetWidth; cv.parentNode.classList.add('shake');
    }
    function cash(m) {
      s.out = Math.floor(m * 100) / 100; x.pay(s.bet, s.out, 'Cashed out at ' + xs(s.out)); x.hist(xs(s.out), 'ok'); x.refresh();
    }
    draw();
    return {
      label: () => s.ph === 'count' ? ['LAUNCHING…', true] : s.ph === 'fly' ? (s.out ? ['CASHED OUT ✓', true] : ['CASH OUT ' + money(Math.floor(s.bet * s.m)), false, 'cash']) : ['BET ' + money(x.bet()), false],
      act() {
        if (s.ph === 'fly' && !s.out) return cash(s.m);
        if (s.ph !== 'idle' && s.ph !== 'crashed') return;
        const b = x.bet(); if (!x.take(b)) return;
        const r = Math.random(); s.at = Math.max(1, Math.min(1000, Math.floor(97 / (1 - r)) / 100));
        Object.assign(s, { ph: 'count', wait: 0.9, t: 0, m: 1, bet: b, out: 0 }); s.parts.length = 0; x.status('Launching… cash out before it pops!'); AudioSys.tone(220, 0.8, 'sawtooth', 0.04, 0, 440);
      },
      busy: () => s.ph === 'count' || (s.ph === 'fly' && !s.out),
      stop() { if (s.ph === 'count') { Game.addWallet(s.bet); x.net(s.bet); } else if (s.ph === 'fly' && !s.out) cash(s.m); s.ph = 'idle'; },
      frame(dt) {
        let dirty = s.parts.length > 0;
        for (const p of s.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 260 * dt; p.l -= dt * 1.3; }
        if (s.parts.length && s.parts[0].l <= 0) s.parts = s.parts.filter(p => p.l > 0);
        if (s.ph === 'count') { s.wait -= dt; if (s.wait <= 0) { s.ph = 'fly'; x.refresh(); } dirty = true; }
        else if (s.ph === 'fly') {
          s.t += dt; s.m = Math.exp(K * s.t);
          const a = prog().auto; if (!s.out && a > 1 && s.m >= a && a < s.at) cash(a);
          if (s.m >= s.at) {
            s.m = s.at; s.ph = 'crashed'; s.last = prog().lastCrash = s.at; explode(); snd.boom();
            if (!s.out) { x.pay(s.bet, 0, 'Popped at ' + xs(s.at)); x.hist(xs(s.at), 'bad'); }
            x.refresh();
          } else if (Math.floor(s.m * 10) !== Math.floor((s.m - K * s.m * dt) * 10)) snd.tick(600 + s.m * 90);
          x.liveAct(); dirty = true;
        }
        if (dirty) draw();
      }
    };
  } });

  /* ----- SLOTS: three reels of office supplies ----- */
  const REEL = [['clip', 30], ['mug', 25], ['phone', 20], ['tie', 13], ['stapler', 8], ['bonk', 4]];
  const PAY3 = { clip: 5, mug: 9, phone: 16, tie: 40, stapler: 150, bonk: 600 }, PAY2 = { clip: 2, mug: 2, phone: 2, tie: 2.5, stapler: 3, bonk: 5 };
  const SYM_NAME = { clip: 'Paperclip', mug: 'Boss Mug', phone: 'Desk Phone', tie: 'Power Tie', stapler: 'Red Stapler', bonk: 'Bonk Coin' };
  GAMES.push({ id: 'slots', name: 'Slots', icon: 'lb_cherry', mount(x) {
    const SH = 76, reels = [], cur = [0, 1, 2].map(() => [weighted(REEL), weighted(REEL), weighted(REEL)]);
    const cell = k => h('div', { class: 'lb-sym', 'data-s': k, html: SYM[k] });
    const bulbs = n => h('div', { class: 'lb-bulbs' }, Array.from({ length: n }, (_, i) => h('i', { style: { animationDelay: (i % 2) * 0.35 + 's' } })));
    const box = h('div', { class: 'lb-reels' }, [0, 1, 2].map(i => { const strip = h('div', { class: 'lb-strip' }, cur[i].map(cell)); reels.push(strip); return h('div', { class: 'lb-reel' }, strip); }), h('div', { class: 'lb-line' }));
    const msg = h('div', { class: 'lb-slotmsg' }, 'Line up three of a kind on the middle line');
    x.main.append(h('div', { class: 'lb-cab' }, h('div', { class: 'lb-marq' }, bulbs(6), h('b', {}, 'LUCKY', h('span', {}, 'BONK'), ' SLOTS'), bulbs(6)), box, msg));
    x.opts(h('div', { class: 'lb-pay' }, h('div', { class: 'lb-ph' }, h('span', {}, 'PAYTABLE'), h('span', {}, '3×'), h('span', {}, '2×')),
      [...REEL].reverse().map(([k]) => h('div', { class: 'lb-pr' }, h('i', { html: SYM[k] }), h('span', {}, SYM_NAME[k]), h('b', {}, PAY3[k] + '×'), h('em', {}, PAY2[k] + '×')))),
    h('p', { class: 'lb-note' }, '2× column: first two reels match.'));
    let spin = null;
    return {
      label: () => spin ? ['SPINNING…', true] : ['SPIN ' + money(x.bet()), false],
      busy: () => !!spin,
      act() {
        if (spin) return; const b = x.bet(); if (!x.take(b)) return;
        const res = [0, 1, 2].map(() => [weighted(REEL), weighted(REEL), weighted(REEL)]), mid = res.map(r => r[1]);
        const mult = mid[0] === mid[1] && mid[1] === mid[2] ? PAY3[mid[0]] : mid[0] === mid[1] ? PAY2[mid[0]] : 0;
        spin = { b, mult, res }; box.classList.remove('won'); $$('.lb-sym.hit', box).forEach(e => e.classList.remove('hit')); msg.textContent = 'Spinning…'; msg.className = 'lb-slotmsg';
        let done = 0;
        reels.forEach((strip, i) => {
          const filler = Array.from({ length: 14 + i * 6 }, () => weighted(REEL)), list = cur[i].concat(filler, res[i]);
          strip.replaceChildren(...list.map(cell)); strip.classList.add('blur');
          const dist = (list.length - 3) * SH, dur = 1100 + i * 450;
          const an = strip.animate([{ transform: 'translateY(0)' }, { transform: `translateY(${-dist - 10}px)`, offset: 0.92 }, { transform: `translateY(${-dist}px)` }], { duration: dur, easing: 'cubic-bezier(.2,.65,.3,1)', fill: 'forwards' });
          const tk = setInterval(() => snd.tick(1300 + i * 200), 90); setTimeout(() => clearInterval(tk), dur - 250);
          an.onfinish = () => {
            strip.classList.remove('blur'); cur[i] = res[i]; strip.replaceChildren(...res[i].map(cell)); an.cancel(); AudioSys.tone(300 + i * 80, 0.08, 'triangle', 0.12);
            if (++done === 3) finish();
          };
        });
        x.status('Spinning…'); x.refresh();
      },
      stop() { if (spin) { x.pay(spin.b, spin.mult, ''); spin = null; } },
      frame() {}
    };
    function finish() {
      const { b, mult, res } = spin; spin = null;
      const three = res[0][1] === res[1][1] && res[1][1] === res[2][1];
      if (mult) {
        const n = three ? 3 : 2;
        reels.forEach((s, i) => { if (i < n) s.children[1].classList.add('hit'); }); box.classList.add('won');
        msg.textContent = (n === 3 ? 'THREE ' + SYM_NAME[res[0][1]].toUpperCase() + 'S! ' : 'PAIR! ') + 'WIN ' + money(Math.floor(b * mult)); msg.className = 'lb-slotmsg ok';
      } else { msg.textContent = 'No luck. The house thanks you.'; msg.className = 'lb-slotmsg bad'; }
      x.pay(b, mult, mult ? (three ? 'Three of a kind!' : 'A pair!') : 'No match'); x.hist(mult ? xs(mult) : '0×', mult ? 'ok' : 'bad'); x.refresh();
    }
  } });

  /* ----- PLINKO: balls bounce through pegs into multiplier buckets ----- */
  const PLK = [22, 3, 1.5, 1.1, 0.9, 0.4, 0.9, 1.1, 1.5, 3, 22];
  GAMES.push({ id: 'plinko', name: 'Plinko', icon: 'lb_plinko', mount(x) {
    const W = 396, H = 344, ROWS = 10, DX = 34, DY = 27.5, TOP = 30, BR = 6.5, PR = 3.8, cx = W / 2;
    const [cv, g] = mkCanvas(W, H, 'lb-cv');
    x.main.append(h('div', { class: 'lb-plinko' }, cv));
    x.opts(h('div', { class: 'lb-kv' }, h('span', {}, 'ROWS'), h('b', {}, '10')), h('div', { class: 'lb-kv' }, h('span', {}, 'RISK'), h('b', {}, 'Normal')),
      h('p', { class: 'lb-note' }, 'Drop as many balls as you like. Edges pay 22×, the middle pays 0.4×.'));
    const pegs = []; for (let r = 0; r < ROWS; r++) for (let j = 0; j < r + 3; j++) pegs.push({ x: cx + (j - (r + 2) / 2) * DX, y: TOP + r * DY, hit: 0 });
    const pegAt = (r, j) => pegs[r * (r + 5) / 2 + j];           // rows start at 0,3,7,12…
    const BY = TOP + ROWS * DY - 4, bk = PLK.map((m, i) => ({ m, x: cx + (i - 5) * DX, bounce: 0 }));
    const bcol = m => m >= 10 ? ['#ff4d6d', '#ffb3c1'] : m >= 3 ? ['#ff922b', '#ffd8a8'] : m >= 1.5 ? ['#fab005', '#fff3bf'] : m >= 1 ? ['#94d82d', '#e9fac8'] : m >= 0.9 ? ['#38d9a9', '#c3fae8'] : ['#7c5cff', '#d0bfff'];
    const balls = [], texts = [];
    function draw() {
      g.clearRect(0, 0, W, H);
      for (const p of pegs) {
        if (p.hit > 0) { g.fillStyle = `rgba(255,79,216,${p.hit * 0.55})`; g.beginPath(); g.arc(p.x, p.y, PR + 6 * p.hit, 0, 6.283); g.fill(); }
        g.fillStyle = p.hit > 0 ? '#ffd6f5' : '#d8d0ff'; g.beginPath(); g.arc(p.x, p.y, PR, 0, 6.283); g.fill();
      }
      g.textAlign = 'center'; g.font = '800 10px Roboto,sans-serif';
      for (const b of bk) {
        const [c1, c2] = bcol(b.m), y = BY + 4 + b.bounce * 5, w = DX - 3;
        g.fillStyle = 'rgba(0,0,0,.35)'; rr(b.x - w / 2, y + 3, w, 22, 5); g.fill();
        g.fillStyle = c1; rr(b.x - w / 2, y, w, 22, 5); g.fill(); g.fillStyle = 'rgba(255,255,255,.25)'; rr(b.x - w / 2 + 2, y + 2, w - 4, 7, 3); g.fill();
        g.fillStyle = '#1b1035'; g.fillText(b.m + '×', b.x, y + 15); if (b.bounce > 0) { g.strokeStyle = c2; g.lineWidth = 2; rr(b.x - w / 2, y, w, 22, 5); g.stroke(); }
      }
      for (const b of balls) {
        g.fillStyle = 'rgba(255,79,216,.35)'; g.beginPath(); g.arc(b.x, b.y, BR + 4, 0, 6.283); g.fill();
        const gr = g.createRadialGradient(b.x - 2, b.y - 2, 1, b.x, b.y, BR); gr.addColorStop(0, '#fff'); gr.addColorStop(0.4, '#ff8ae2'); gr.addColorStop(1, '#d6249f');
        g.fillStyle = gr; g.beginPath(); g.arc(b.x, b.y, BR, 0, 6.283); g.fill();
      }
      g.font = '400 18px "Lilita One",sans-serif';
      for (const t of texts) { g.globalAlpha = Math.min(1, t.l * 2); g.lineWidth = 4; g.strokeStyle = '#120c2a'; g.strokeText(t.s, t.x, t.y); g.fillStyle = t.c; g.fillText(t.s, t.x, t.y); }
      g.globalAlpha = 1;
    }
    function rr(x0, y0, w, ht, r) { g.beginPath(); g.moveTo(x0 + r, y0); g.arcTo(x0 + w, y0, x0 + w, y0 + ht, r); g.arcTo(x0 + w, y0 + ht, x0, y0 + ht, r); g.arcTo(x0, y0 + ht, x0, y0, r); g.arcTo(x0, y0, x0 + w, y0, r); g.closePath(); }
    draw();
    return {
      label: () => ['DROP ' + money(x.bet()), balls.length >= 12],
      busy: () => balls.length > 0,
      act() {
        if (balls.length >= 12) return; const b = x.bet(); if (!x.take(b)) return;
        const path = []; let k = 0; for (let r = 0; r < ROWS; r++) { path.push(k); if (Math.random() < 0.5) k++; }
        balls.push({ bet: b, path, end: k, r: -1, t: 0, x: cx + rand(-3, 3), y: 4, x0: cx, y0: 4 }); snd.chip();
      },
      stop() { for (const b of balls) x.pay(b.bet, PLK[b.end], ''); balls.length = 0; },
      frame(dt) {
        let dirty = false;
        for (const p of pegs) if (p.hit > 0) { p.hit = Math.max(0, p.hit - dt * 3.5); dirty = true; }
        for (const b of bk) if (b.bounce > 0) { b.bounce = Math.max(0, b.bounce - dt * 4); dirty = true; }
        for (const t of texts) { t.l -= dt; t.y -= dt * 26; dirty = true; }
        if (texts.length && texts[0].l <= 0) texts.shift();
        for (let i = balls.length - 1; i >= 0; i--) {
          const b = balls[i]; dirty = true; b.t += dt / (b.r < 0 ? 0.22 : 0.15);
          const nr = b.r + 1, last = nr >= ROWS;
          const tx = last ? bk[b.end].x : pegAt(nr, b.path[nr] + 1).x, ty = last ? BY + 8 : TOP + nr * DY - PR - BR + 0.5;
          const t = Math.min(1, b.t);
          b.x = b.x0 + (tx - b.x0) * (1 - (1 - t) * (1 - t)); b.y = b.y0 + (ty - b.y0) * t * t - (b.r < 0 ? 0 : 9) * 4 * t * (1 - t);
          if (b.t >= 1) {
            if (last) {
              const m = PLK[b.end], bb = bk[b.end]; bb.bounce = 1; balls.splice(i, 1);
              texts.push({ s: m + '×', x: bb.x, y: BY - 6, l: 0.9, c: m >= 1 ? '#35e08a' : '#ff8fa3' });
              x.pay(b.bet, m, 'Ball landed on ' + m + '×', { quiet: m < 3, soft: true }); x.hist(m + '×', m >= 1 ? 'ok' : 'bad');
              AudioSys.tone(m >= 3 ? 880 : m >= 1 ? 660 : 330, 0.12, 'triangle', 0.1); continue;
            }
            b.r = nr; b.t = 0; b.x0 = b.x = tx; b.y0 = b.y = ty; pegAt(nr, b.path[nr] + 1).hit = 1; snd.tick(1000 + nr * 120);
          }
        }
        if (dirty) draw();
      }
    };
  } });

  /* ----- DICE: roll over / under a target ----- */
  GAMES.push({ id: 'dice', name: 'Dice', icon: 'dice', mount(x) {
    const p = prog(); p.dice = p.dice || { t: 50, over: true };
    const D = p.dice, EDGE = 98;
    const num = h('div', { class: 'lb-dnum' }, '50.00'), cap = h('div', { class: 'lb-dcap' });
    const range = h('input', { type: 'range', min: 2, max: 98, step: 0.5, value: D.t, class: 'lb-range' });
    const mark = h('div', { class: 'lb-mark' }, h('span')), track = h('div', { class: 'lb-track' }, mark);
    const stat = (k) => h('div', { class: 'lb-stat' }, h('small', {}, k), h('b'));
    const sM = stat('MULTIPLIER'), sT = stat('ROLL OVER'), sC = stat('WIN CHANCE');
    sT.classList.add('click'); sT.title = 'Click to switch over / under'; sT.onclick = () => { if (!rolling) { D.over = !D.over; snd.chip(); upd(); } };
    x.main.append(h('div', { class: 'lb-dice' }, num, cap,
      h('div', { class: 'lb-slider' }, track, range, h('div', { class: 'lb-ticks' }, [0, 25, 50, 75, 100].map(v => h('span', {}, v)))),
      h('div', { class: 'lb-stats' }, sM, sT, sC)));
    const ob = h('button', { class: 'lb-seg', onclick: () => { if (!rolling) { D.over = true; snd.chip(); upd(); } } }, 'ROLL OVER'), ub = h('button', { class: 'lb-seg', onclick: () => { if (!rolling) { D.over = false; snd.chip(); upd(); } } }, 'ROLL UNDER');
    x.opts(h('div', { class: 'lb-segs' }, ob, ub), h('p', { class: 'lb-note' }, 'Drag the slider: lower chance, bigger payout. 2% house edge.'));
    const chance = () => D.over ? 100 - D.t : D.t, mult = () => Math.floor(EDGE / chance() * 10000) / 10000;
    function upd() {
      const c = chance(); track.style.background = D.over ? `linear-gradient(90deg,#ff4d6d ${D.t}%,#35e08a ${D.t}%)` : `linear-gradient(90deg,#35e08a ${D.t}%,#ff4d6d ${D.t}%)`;
      sM.lastChild.textContent = mult().toFixed(4) + '×'; sT.firstChild.textContent = D.over ? 'ROLL OVER' : 'ROLL UNDER'; sT.lastChild.textContent = (+D.t).toFixed(2); sC.lastChild.textContent = c.toFixed(2) + '%';
      cap.textContent = (D.over ? 'Roll over ' : 'Roll under ') + (+D.t).toFixed(2) + ' to win ' + money(Math.floor(x.bet() * mult()));
      ob.classList.toggle('on', D.over); ub.classList.toggle('on', !D.over);
    }
    range.oninput = () => { if (rolling) { range.value = D.t; return; } D.t = +range.value; upd(); };
    let rolling = null; upd();
    return {
      label: () => rolling ? ['ROLLING…', true] : ['ROLL ' + money(x.bet()), false],
      busy: () => !!rolling,
      act() {
        if (rolling) return; const b = x.bet(); if (!x.take(b)) return;
        const roll = Math.floor(Math.random() * 10000) / 100, win = D.over ? roll > D.t : roll < D.t;
        rolling = { b, roll, win, m: win ? mult() : 0, t: 0 }; num.className = 'lb-dnum'; mark.classList.add('show'); x.refresh();
      },
      stop() { if (rolling) { x.pay(rolling.b, rolling.m, ''); rolling = null; } },
      frame(dt) {
        if (!rolling) return; const R = rolling; R.t += dt;
        if (R.t < 0.7) { const v = Math.random() * 100; num.textContent = v.toFixed(2); if (Math.random() < 0.5) snd.tick(900 + v * 8); mark.style.left = v + '%'; return; }
        num.textContent = R.roll.toFixed(2); num.className = 'lb-dnum ' + (R.win ? 'ok' : 'bad'); mark.style.left = R.roll + '%'; mark.firstChild.textContent = R.roll.toFixed(2); mark.className = 'lb-mark show ' + (R.win ? 'ok' : 'bad');
        rolling = null; x.pay(R.b, R.m, 'Rolled ' + R.roll.toFixed(2)); x.hist(R.roll.toFixed(2), R.win ? 'ok' : 'bad'); x.refresh(); upd();
      },
      onBet: upd
    };
  } });

  /* ----- MINES: find gems, avoid bombs, cash out ----- */
  GAMES.push({ id: 'mines', name: 'Mines', icon: 'lb_bomb', mount(x) {
    const p = prog(); p.mines = p.mines || 3;
    const grid = h('div', { class: 'lb-grid' }), tiles = [];
    for (let i = 0; i < 25; i++) { const t = h('button', { class: 'lb-tile', onclick: () => reveal(i) }); tiles.push(t); grid.append(t); }
    x.main.append(h('div', { class: 'lb-mines' }, grid));
    const counts = [1, 3, 5, 10, 24], cbtn = counts.map(n => h('button', { class: 'lb-chipsel', onclick: () => { if (s.on) return snd.no(); p.mines = n; snd.chip(); info(); } }, n));
    const iFound = h('b'), iNext = h('b'), iCur = h('b');
    x.opts(h('div', { class: 'lb-lab' }, 'MINES'), h('div', { class: 'lb-chiprow' }, cbtn),
      h('div', { class: 'lb-kv' }, h('span', {}, 'GEMS FOUND'), iFound), h('div', { class: 'lb-kv' }, h('span', {}, 'CURRENT'), iCur), h('div', { class: 'lb-kv' }, h('span', {}, 'NEXT GEM'), iNext));
    const s = { on: false, bombs: null, found: 0, bet: 0 };
    const mul = k => k ? Math.floor(0.97 * C(25, k) / C(25 - p.mines, k) * 100) / 100 : 1;
    function info() {
      cbtn.forEach((b, i) => { b.classList.toggle('on', counts[i] === p.mines); b.disabled = s.on && counts[i] !== p.mines; });
      iFound.textContent = s.found + ' / ' + (25 - p.mines); iCur.textContent = s.found ? xs(mul(s.found)) + ' · ' + money(Math.floor(s.bet * mul(s.found))) : '—'; iNext.textContent = s.found < 25 - p.mines ? xs(mul(s.found + 1)) : '—';
    }
    function end(boom) {
      s.on = false;
      tiles.forEach((t, i) => { if (!t.classList.contains('open')) { t.classList.add('open', 'dim'); t.innerHTML = s.bombs.has(i) ? BOMB : GEM; t.classList.toggle('bomb', s.bombs.has(i)); t.classList.toggle('gem', !s.bombs.has(i)); } t.disabled = true; });
      if (!boom) { const m = mul(s.found); x.pay(s.bet, m, 'Cashed out with ' + s.found + ' gems'); x.hist(xs(m), 'ok'); }
      info(); x.refresh();
    }
    function reveal(i) {
      const t = tiles[i]; if (!s.on || t.classList.contains('open')) return;
      t.classList.add('open');
      if (s.bombs.has(i)) {
        t.classList.add('bomb', 'boom'); t.innerHTML = BOMB; snd.boom(); grid.classList.remove('shake'); void grid.offsetWidth; grid.classList.add('shake');
        x.pay(s.bet, 0, 'Boom! You hit a bomb'); x.hist('BOOM', 'bad'); end(true); return;
      }
      s.found++; t.classList.add('gem'); t.innerHTML = GEM; AudioSys.tone(600 + s.found * 70, 0.1, 'triangle', 0.12); AudioSys.tone(1200 + s.found * 140, 0.08, 'sine', 0.06, 0.05);
      x.status('Gem! ' + xs(mul(s.found)) + ' — keep going or cash out', 'ok');
      if (s.found >= 25 - p.mines) return end(false);
      info(); x.refresh();
    }
    tiles.forEach(t => { t.disabled = true; }); info();
    return {
      label: () => !s.on ? ['BET ' + money(x.bet()), false] : s.found ? ['CASH OUT ' + money(Math.floor(s.bet * mul(s.found))), false, 'cash'] : ['PICK A TILE', true],
      busy: () => s.on,
      act() {
        if (s.on) { if (s.found) end(false); return; }
        const b = x.bet(); if (!x.take(b)) return;
        const idx = shuffle([...Array(25).keys()]); s.bombs = new Set(idx.slice(0, p.mines)); s.on = true; s.found = 0; s.bet = b;
        tiles.forEach(t => { t.className = 'lb-tile'; t.innerHTML = ''; t.disabled = false; }); x.status('Pick tiles. ' + p.mines + (p.mines > 1 ? ' bombs are' : ' bomb is') + ' hiding.'); info(); x.refresh();
      },
      stop() { if (s.on) { if (s.found) end(false); else { Game.addWallet(s.bet); x.net(s.bet); s.on = false; } } },
      frame() {}, peek: () => s, reveal
    };
  } });

  /* ----- COINFLIP: heads (The Boss) or tails (Bonk) ----- */
  GAMES.push({ id: 'coin', name: 'Coinflip', icon: 'coin', mount(x) {
    const p = prog(); p.side = p.side || 'h';
    const coin = h('div', { class: 'lb-coin' }, h('div', { class: 'lb-face h', html: COIN_H }), h('div', { class: 'lb-face t', html: COIN_T }));
    const shadow = h('div', { class: 'lb-cshadow' }), streak = h('div', { class: 'lb-streak' });
    const pickB = side => h('button', { class: 'lb-pickside', onclick: () => { if (flip) return; p.side = side; snd.chip(); upd(); } }, h('i', { html: side === 'h' ? COIN_H : COIN_T }), h('b', {}, side === 'h' ? 'HEADS' : 'TAILS'), h('small', {}, side === 'h' ? 'The Boss' : 'Bonk'));
    const bh = pickB('h'), bt = pickB('t');
    x.main.append(h('div', { class: 'lb-coinwrap' }, h('div', { class: 'lb-stagec' }, coin, shadow), h('div', { class: 'lb-sides' }, bh, bt), streak));
    const dots = h('div', { class: 'lb-dots' });
    x.opts(h('div', { class: 'lb-kv' }, h('span', {}, 'PAYOUT'), h('b', {}, '1.96×')), h('div', { class: 'lb-lab' }, 'LAST FLIPS'), dots, h('p', { class: 'lb-note' }, 'A fair coin. Mostly. The Boss insists it is fair.'));
    let flip = null, face = 'h', run = 0;
    const upd = () => { bh.classList.toggle('on', p.side === 'h'); bt.classList.toggle('on', p.side === 't'); streak.textContent = run > 1 ? run + ' wins in a row!' : 'Pick a side and flip'; };
    upd();
    return {
      label: () => flip ? ['FLIPPING…', true] : ['FLIP ' + money(x.bet()), false],
      busy: () => !!flip,
      act() {
        if (flip) return; const b = x.bet(); if (!x.take(b)) return;
        const res = Math.random() < 0.5 ? 'h' : 't', win = res === p.side, turns = 6 + randi(0, 2);
        const from = face === 'h' ? 0 : 180, to = turns * 360 + (res === 'h' ? 0 : 180);
        flip = { b, res, win };
        const an = coin.animate([{ transform: `translateY(0) rotateX(${from}deg) scale(1)` }, { transform: `translateY(-66px) rotateX(${(from + to) / 2}deg) scale(1.12)`, offset: 0.45 }, { transform: `translateY(0) rotateX(${to}deg) scale(1)` }],
          { duration: 1300, easing: 'cubic-bezier(.3,.1,.35,1)', fill: 'forwards' });
        shadow.animate([{ transform: 'scale(1)', opacity: 0.6 }, { transform: 'scale(.55)', opacity: 0.25, offset: 0.45 }, { transform: 'scale(1)', opacity: 0.6 }], { duration: 1300, easing: 'cubic-bezier(.3,.1,.35,1)' });
        AudioSys.tone(1800, 0.05, 'square', 0.05); const tk = setInterval(() => snd.tick(2400), 110); setTimeout(() => clearInterval(tk), 1100);
        an.onfinish = () => {
          face = res; coin.style.transform = `rotateX(${res === 'h' ? 0 : 180}deg)`; an.cancel(); AudioSys.tone(500, 0.06, 'triangle', 0.12); flip = null;
          run = win ? run + 1 : 0; dots.prepend(h('i', { class: res + (win ? ' w' : ''), title: res === 'h' ? 'Heads' : 'Tails' }, res === 'h' ? 'H' : 'T')); while (dots.children.length > 12) dots.lastChild.remove();
          x.pay(b, win ? 1.96 : 0, (res === 'h' ? 'Heads' : 'Tails') + (win ? ' — you called it' : ' — wrong call')); x.hist(res === 'h' ? 'HEADS' : 'TAILS', win ? 'ok' : 'bad'); upd(); x.refresh();
        };
        x.refresh();
      },
      stop() { if (flip) { x.pay(flip.b, flip.win ? 1.96 : 0, ''); flip = null; } },
      frame() {}
    };
  } });

  /* ----- KENO: pick up to 10 of 40, ten numbers are drawn ----- */
  const KENO = { 1: [0, 3.8], 2: [0, 1.7, 5], 3: [0, 0.9, 2, 22], 4: [0, 0, 2, 9.5, 60], 5: [0, 0, 1.5, 4, 18, 150], 6: [0, 0, 1.1, 2.5, 7, 50, 250], 7: [0, 0, 0.9, 1.6, 4.5, 18, 90, 450], 8: [0, 0, 0.4, 1.6, 3.5, 10, 40, 200, 800], 9: [0, 0, 0.4, 1.2, 2.4, 6, 20, 80, 400, 1500], 10: [0, 0, 0, 1.2, 2, 4.5, 12, 45, 200, 800, 4000] };
  GAMES.push({ id: 'keno', name: 'Keno', icon: 'grid', mount(x) {
    const p = prog(); p.keno = (p.keno || [3, 7, 12, 19, 26, 33]).filter(n => n >= 1 && n <= 40).slice(0, 10);
    const picks = new Set(p.keno), cells = [];
    const grid = h('div', { class: 'lb-keno' });
    for (let i = 1; i <= 40; i++) { const c = h('button', { class: 'lb-kc', onclick: () => tog(i) }, i); cells[i] = c; grid.append(c); }
    const info = h('span', { class: 'lb-kinfo' });
    x.main.append(h('div', { class: 'lb-kwrap' }, grid, h('div', { class: 'lb-krow' },
      h('button', { class: 'lb-mini', onclick: () => { if (draw) return; picks.clear(); shuffle([...Array(40).keys()]).slice(0, 10).forEach(i => picks.add(i + 1)); snd.chip(); upd(); } }, 'AUTO PICK'),
      h('button', { class: 'lb-mini', onclick: () => { if (draw) return; picks.clear(); snd.chip(); upd(); } }, 'CLEAR'), info)));
    const table = h('div', { class: 'lb-ktab' });
    x.opts(h('div', { class: 'lb-lab' }, 'PAYOUTS'), table);
    let draw = null, lastHits = -1;
    function tog(i) { if (draw) return; if (picks.has(i)) picks.delete(i); else if (picks.size < 10) picks.add(i); else return snd.no(); snd.chip(); lastHits = -1; clearMarks(); upd(); }
    function clearMarks() { cells.forEach((c, i) => { if (c) { c.classList.remove('drawn', 'hit', 'miss'); if (c.firstElementChild) c.textContent = i; } }); }
    function upd() {
      p.keno = [...picks]; cells.forEach((c, i) => c && c.classList.toggle('pick', picks.has(i)));
      info.textContent = 'Picked ' + picks.size + ' / 10';
      const row = KENO[picks.size] || [];
      table.replaceChildren(...(picks.size ? row.map((m, hcount) => [hcount, m]).filter(r => r[1] > 0).reverse().map(([hc, m]) => h('div', { class: 'lb-kt' + (hc === lastHits ? ' on' : '') }, h('span', {}, hc + (hc === 1 ? ' hit' : ' hits')), h('b', {}, m + '×'))) : [h('p', { class: 'lb-note' }, 'Pick 1 to 10 numbers.')]));
      x.refresh();
    }
    upd();
    return {
      label: () => draw ? ['DRAWING…', true] : ['DRAW ' + money(x.bet()), !picks.size],
      busy: () => !!draw,
      act() {
        if (draw || !picks.size) return; const b = x.bet(); if (!x.take(b)) return;
        clearMarks(); lastHits = -1;
        const nums = shuffle([...Array(40).keys()].map(i => i + 1)).slice(0, 10), hits = nums.filter(n => picks.has(n)).length;
        draw = { b, nums, hits, i: 0, t: 0.15, m: (KENO[picks.size] || [])[hits] || 0 }; x.refresh();
      },
      stop() { if (draw) { x.pay(draw.b, draw.m, ''); draw = null; } }, peek: () => draw, picks,
      frame(dt) {
        if (!draw) return; draw.t -= dt; if (draw.t > 0) return;
        if (draw.i < draw.nums.length) {
          const n = draw.nums[draw.i++], c = cells[n], hit = picks.has(n); c.classList.add(hit ? 'hit' : 'drawn');
          if (hit) { AudioSys.tone(700 + draw.i * 60, 0.1, 'triangle', 0.12); c.innerHTML = GEM + '<span>' + n + '</span>'; } else snd.tick(900);
          draw.t = 0.16; return;
        }
        const d = draw; draw = null; lastHits = d.hits;
        cells.forEach((c, i) => { if (c && picks.has(i) && !c.classList.contains('hit')) c.classList.add('miss'); });
        x.pay(d.b, d.m, d.hits + (d.hits === 1 ? ' hit' : ' hits') + ' out of ' + picks.size); x.hist(d.hits + '/' + picks.size, d.m >= 1 ? 'ok' : 'bad'); upd();
      }
    };
  } });

  /* ----- ROULETTE: European wheel, one bet per spin ----- */
  const WHEEL = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
  const REDS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
  const rcol = n => n === 0 ? 'g' : REDS.has(n) ? 'r' : 'b';
  const RBETS = { red: ['RED', n => REDS.has(n), 2], black: ['BLACK', n => n > 0 && !REDS.has(n), 2], odd: ['ODD', n => n % 2 === 1, 2], even: ['EVEN', n => n > 0 && n % 2 === 0, 2],
    low: ['1–18', n => n >= 1 && n <= 18, 2], high: ['19–36', n => n >= 19, 2], d1: ['1st 12', n => n >= 1 && n <= 12, 3], d2: ['2nd 12', n => n >= 13 && n <= 24, 3], d3: ['3rd 12', n => n >= 25, 3] };
  let wheelImg = null;
  function wheelArt(R, k) {
    const c = document.createElement('canvas'); c.width = c.height = Math.round(R * 2 * k); const g = c.getContext('2d'); g.scale(k, k); g.translate(R, R);
    const seg = Math.PI * 2 / 37;
    g.fillStyle = '#5a3a1c'; g.beginPath(); g.arc(0, 0, R, 0, 6.283); g.fill();
    const rim = g.createRadialGradient(0, 0, R * 0.8, 0, 0, R); rim.addColorStop(0, '#8a5a2b'); rim.addColorStop(0.6, '#c58b48'); rim.addColorStop(1, '#4a2c12');
    g.fillStyle = rim; g.beginPath(); g.arc(0, 0, R - 1, 0, 6.283); g.fill();
    g.fillStyle = '#ffc93c'; g.beginPath(); g.arc(0, 0, R * 0.86, 0, 6.283); g.fill();
    for (let i = 0; i < 37; i++) {
      const n = WHEEL[i], a0 = i * seg - seg / 2 - Math.PI / 2;
      g.fillStyle = n === 0 ? '#1aa35b' : REDS.has(n) ? '#d6283f' : '#1d1730';
      g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, R * 0.84, a0, a0 + seg); g.closePath(); g.fill();
      g.save(); g.rotate(i * seg); g.fillStyle = '#fff'; g.font = `800 ${R * 0.085}px Roboto,sans-serif`; g.textAlign = 'center'; g.fillText(n, 0, -R * 0.73); g.restore();
    }
    g.strokeStyle = 'rgba(255,215,120,.7)'; g.lineWidth = 1; for (let i = 0; i < 37; i++) { const a = i * seg - seg / 2 - Math.PI / 2; g.beginPath(); g.moveTo(Math.cos(a) * R * 0.56, Math.sin(a) * R * 0.56); g.lineTo(Math.cos(a) * R * 0.84, Math.sin(a) * R * 0.84); g.stroke(); }
    g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.arc(0, 0, R * 0.64, 0, 6.283); g.fill();
    const cone = g.createRadialGradient(-R * 0.1, -R * 0.12, 2, 0, 0, R * 0.58); cone.addColorStop(0, '#7f62ff'); cone.addColorStop(0.7, '#3b2890'); cone.addColorStop(1, '#1c1250');
    g.fillStyle = cone; g.beginPath(); g.arc(0, 0, R * 0.56, 0, 6.283); g.fill(); g.strokeStyle = '#ffc93c'; g.lineWidth = 2; g.stroke();
    g.fillStyle = '#ffc93c'; for (let i = 0; i < 4; i++) { g.save(); g.rotate(i * Math.PI / 2); g.beginPath(); g.moveTo(-3, 0); g.lineTo(0, -R * 0.4); g.lineTo(3, 0); g.fill(); g.restore(); }
    g.beginPath(); g.arc(0, 0, R * 0.09, 0, 6.283); g.fill(); g.fillStyle = '#fff6cf'; g.beginPath(); g.arc(-2, -2, R * 0.035, 0, 6.283); g.fill();
    return c;
  }
  GAMES.push({ id: 'roulette', name: 'Roulette', icon: 'lb_wheel', mount(x) {
    const p = prog(); p.rbet = p.rbet || 'red';
    const R = 84, S = R * 2 + 8, [cv, g] = mkCanvas(S, S, 'lb-wheel'), k = cv.width / S;
    if (!wheelImg || wheelImg.k !== k) { wheelImg = wheelArt(R, k); wheelImg.k = k; }
    const big = h('div', { class: 'lb-rnum' }, '—'), recent = h('div', { class: 'lb-rrec' });
    const cell = (key, label, cls) => { const c = h('button', { class: 'lb-rc ' + (cls || ''), onclick: () => { if (spin) return; p.rbet = key; snd.chip(); upd(); } }, label); c.dataset.k = key; return c; };
    const nums = h('div', { class: 'lb-rnums' }, cell('n0', '0', 'g zero'));
    for (let col = 0; col < 12; col++) for (let row = 0; row < 3; row++) { const n = col * 3 + (3 - row); const c = cell('n' + n, n, rcol(n)); c.style.gridColumn = col + 2; c.style.gridRow = row + 1; nums.append(c); }
    const outs = h('div', { class: 'lb-routs' }, ['d1', 'd2', 'd3'].map(kk => cell(kk, RBETS[kk][0], 'out dz'))), outs2 = h('div', { class: 'lb-routs' }, ['low', 'even', 'red', 'black', 'odd', 'high'].map(kk => cell(kk, RBETS[kk][0], 'out ' + (kk === 'red' ? 'r' : kk === 'black' ? 'b' : ''))));
    const table = h('div', { class: 'lb-rtable' }, nums, outs, outs2);
    x.main.append(h('div', { class: 'lb-roul' }, h('div', { class: 'lb-rtop' }, h('div', { class: 'lb-wwrap' }, cv, h('i', { class: 'lb-ptr' })), h('div', { class: 'lb-rres' }, h('small', {}, 'RESULT'), big, h('small', {}, 'LAST SPINS'), recent)), table));
    const betInfo = h('b');
    x.opts(h('div', { class: 'lb-kv' }, h('span', {}, 'YOUR BET'), betInfo), h('p', { class: 'lb-note' }, 'Click the table to pick a bet. Numbers pay 36×, dozens 3×, red/black/odd/even/halves 2×. Zero is the house\'s best friend.'));
    const desc = key => key[0] === 'n' ? ['Number ' + key.slice(1), n => n === +key.slice(1), 36] : RBETS[key];
    function upd() {
      $$('.lb-rc', table).forEach(c => { c.classList.toggle('sel', c.dataset.k === p.rbet); const ch = c.querySelector('.lb-rchip'); if (ch) ch.remove(); if (c.dataset.k === p.rbet) c.append(h('span', { class: 'lb-rchip' }, x.bet() >= 1000 ? Math.round(x.bet() / 1000) + 'k' : x.bet())); });
      const d = desc(p.rbet); betInfo.textContent = d[0] + ' · ' + d[2] + '×';
    }
    let spin = null, wa = rand(0, 6.283), ba = 0, br = R * 0.92, landed = -1;
    function draw() {
      g.clearRect(0, 0, S, S); g.save(); g.translate(S / 2, S / 2);
      g.fillStyle = 'rgba(0,0,0,.45)'; g.beginPath(); g.arc(2, 4, R + 2, 0, 6.283); g.fill();
      g.rotate(wa); g.drawImage(wheelImg, -R, -R, R * 2, R * 2); g.restore();
      if (spin || landed >= 0) {
        const bx = S / 2 + Math.cos(ba) * br, by = S / 2 + Math.sin(ba) * br;
        g.fillStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.arc(bx + 1.5, by + 2, 5, 0, 6.283); g.fill();
        const gr = g.createRadialGradient(bx - 1.5, by - 1.5, 0.5, bx, by, 5); gr.addColorStop(0, '#fff'); gr.addColorStop(1, '#b8b8c8'); g.fillStyle = gr; g.beginPath(); g.arc(bx, by, 4.6, 0, 6.283); g.fill();
      }
    }
    upd(); draw();
    return {
      label: () => spin ? ['SPINNING…', true] : ['SPIN ' + money(x.bet()), false],
      busy: () => !!spin,
      act() {
        if (spin) return; const b = x.bet(); if (!x.take(b)) return;
        const idx = randi(0, 36), n = WHEEL[idx], d = desc(p.rbet), seg = Math.PI * 2 / 37, T = 4.6;
        const w0 = wa, wEnd = w0 + Math.PI * 2 * (2.5 + Math.random()), bEnd = wEnd + idx * seg - Math.PI / 2, b0 = bEnd + Math.PI * 2 * (5 + randi(0, 2));
        spin = { b, n, idx, win: d[1](n), m: d[1](n) ? d[2] : 0, t: 0, T, w0, wEnd, b0, bEnd, lastSeg: -1 }; landed = -1; big.className = 'lb-rnum spin'; big.textContent = '?'; x.status('No more bets!'); x.refresh();
      },
      stop() { if (spin) { x.pay(spin.b, spin.m, ''); spin = null; } },
      frame(dt) {
        if (!spin) { if (landed >= 0) { wa += dt * 0.25; ba += dt * 0.25; draw(); } return; }
        const s = spin; s.t += dt; const f = Math.min(1, s.t / s.T), e = ease(f);
        wa = s.w0 + (s.wEnd - s.w0) * e;
        const fb = Math.min(1, s.t / (s.T * 0.92)), eb = 1 - Math.pow(1 - fb, 2.4);
        ba = s.b0 + (s.bEnd - s.b0) * eb;
        br = f < 0.55 ? R * 0.92 : f < 0.85 ? R * (0.92 - 0.24 * (f - 0.55) / 0.3) + Math.abs(Math.sin(f * 40)) * 4 * (0.85 - f) / 0.3 : R * 0.68;
        const sg = Math.floor((ba - wa) / (Math.PI * 2 / 37)); if (sg !== s.lastSeg && f > 0.5) { s.lastSeg = sg; snd.tick(f > 0.85 ? 900 : 1500); }
        if (f >= 1) {
          spin = null; landed = s.idx; ba = wa + s.idx * Math.PI * 2 / 37 - Math.PI / 2; br = R * 0.68;
          big.textContent = s.n; big.className = 'lb-rnum ' + rcol(s.n);
          recent.prepend(h('i', { class: rcol(s.n) }, s.n)); while (recent.children.length > 8) recent.lastChild.remove();
          AudioSys.tone(420, 0.1, 'triangle', 0.12);
          x.pay(s.b, s.m, 'Landed on ' + s.n + ' ' + (s.n === 0 ? 'green' : REDS.has(s.n) ? 'red' : 'black')); x.hist(String(s.n), s.win ? 'ok' : 'bad'); x.refresh();
        }
        draw();
      },
      onBet: upd
    };
  } });

  /* =====================================================================
     WINDOW
     ===================================================================== */
  function render(b, win) {
    b.classList.add('lbc');
    const p = prog(), sess = win.sess = { net: 0, best: 0, rounds: 0 };
    const bal = h('b'), sessEl = h('b');
    const head = h('div', { class: 'lb-head' },
      h('i', { class: 'lb-logo', html: OS.glyph('lb_chip') }),
      h('div', { class: 'lb-brand' }, h('b', {}, 'LUCKY', h('span', {}, 'BONK')), h('small', {}, 'ORIGINAL OFFICE CASINO')),
      h('div', { class: 'lb-box' }, h('small', {}, 'SESSION'), sessEl),
      h('div', { class: 'lb-box bal' }, h('small', {}, 'PERSONAL BALANCE'), bal));
    const tabs = h('div', { class: 'lb-tabs' }, GAMES.map(gm => h('button', { class: 'lb-tab', 'data-g': gm.id, onclick: () => select(gm.id) }, h('i', { html: OS.glyph(gm.icon) }), h('span', {}, gm.name.toUpperCase()))));
    const main = h('div', { class: 'lb-main' }), opts = h('div', { class: 'lb-opts' }), stat = h('div', { class: 'lb-status' }), histEl = h('div', { class: 'lb-hist' });
    const side = h('div', { class: 'lb-side' }, h('div', { class: 'lb-lab' }, 'ROUND STATUS'), stat, opts, h('div', { class: 'lb-lab' }, 'HISTORY'), histEl);
    const custom = h('input', { class: 'lb-custom', type: 'number', min: 1, step: 1, placeholder: 'custom' });
    const chips = CHIPS.map((v, i) => h('button', { class: 'lb-chip c' + i, onclick: () => setBet(v) }, '$' + v));
    const selEl = h('b'), actBtn = h('button', { class: 'lb-act', onclick: () => { if (cur && !actBtn.disabled) { cur.act(); refresh(); } } });
    custom.oninput = () => { const v = Math.floor(+custom.value); if (v >= 1) setBet(v, true); };
    const wager = h('div', { class: 'lb-wager' },
      h('div', { class: 'lb-wl' }, h('div', { class: 'lb-lab' }, 'WAGER · BONK PAY'), h('div', { class: 'lb-chips' }, chips, h('label', { class: 'lb-cust' }, h('span', {}, '$'), custom))),
      h('div', { class: 'lb-wr' }, h('small', {}, 'SELECTED ', selEl), actBtn));
    const foot = h('div', { class: 'lb-foot' }, h('i', { html: OS.glyph('warning') }), 'LuckyBonk reminds you: the house always wins, and the house reports to The Boss. Gamble responsibly-ish. 18+ (in dog years).');
    const fx = win.fx = h('div', { class: 'lb-fx' });
    b.append(head, tabs, h('div', { class: 'lb-row' }, main, side), wager, foot, fx);

    let cur = null, curDef = null;
    function setBet(v, typed) {
      if (cur && cur.busy() && curDef.id !== 'plinko') { snd.no(); return; }
      p.bet = clamp(Math.floor(v), 1, 100000); if (!typed) custom.value = ''; snd.chip(); refresh(); if (cur && cur.onBet) cur.onBet();
    }
    const ctx = {
      main, bet: () => p.bet,
      opts: (...els) => opts.append(...els),
      take(v) {
        if (v > G.wallet || v < 1) { status(G.wallet < 1 ? 'Your Bonk Pay is empty. Go scam someone (fictionally).' : 'Not enough Bonk Pay for a ' + money(v) + ' bet.', 'bad'); snd.no(); actBtn.classList.remove('shake'); void actBtn.offsetWidth; actBtn.classList.add('shake'); return false; }
        Game.addWallet(-v); sess.net -= v; sess.rounds++; p.wagered = (p.wagered || 0) + v; refresh(); return true;
      },
      net(v) { sess.net += v; refresh(); },
      pay(bet, mult, note, o) {
        o = o || {}; const payout = Math.floor(bet * mult + 1e-9), profit = payout - bet;
        if (payout > 0) { Game.addWallet(payout); sess.net += payout; p.won = (p.won || 0) + payout; }
        if (profit > sess.best) sess.best = profit;
        Bus.emit('casino:result', { game: curDef ? curDef.id : '', bet, payout, mult });
        if (note !== '') {
          if (payout > bet) status((note ? note + '. ' : '') + 'Won ' + money(payout) + ' (' + xs(mult) + ')', 'ok');
          else if (payout > 0) status((note ? note + '. ' : '') + 'Got back ' + money(payout) + ' of ' + money(bet) + '.', 'meh');
          else status((note ? note + '. ' : '') + 'Lost ' + money(bet) + '.', 'bad');
        }
        if (!win.el.isConnected) return;
        if (payout > bet) {
          if (mult >= 10 || profit >= 500) { celebrate(2, payout, profit); snd.big(); }
          else if (mult >= 3 || profit >= 150) { celebrate(1, payout, profit); snd.big(); }
          else { coins(o.soft ? 6 : 14); if (!o.quiet) snd.win(); else AudioSys.tone(1046, 0.12, 'triangle', 0.08); }
          if ((mult >= 10 || profit >= 500) && Net.active) Net.emit('casino:big', { name: settings.name, amt: payout, game: curDef ? curDef.name : 'Casino' });
        } else if (payout === 0 && !o.soft) snd.sad();
        else if (payout === 0) AudioSys.tone(200, 0.14, 'triangle', 0.06, 0, 140);
        refresh();
      },
      status, hist, refresh: () => refresh(), liveAct
    };
    function status(t, kind) { stat.textContent = t; stat.className = 'lb-status ' + (kind || ''); }
    function hist(t, kind) { histEl.prepend(h('i', { class: kind || '' }, t)); while (histEl.children.length > 14) histEl.lastChild.remove(); }
    function liveAct() { if (!cur) return; const [lab, dis, cls] = cur.label(); if (actBtn.textContent !== lab) actBtn.textContent = lab; actBtn.disabled = !!dis; actBtn.className = 'lb-act' + (cls ? ' ' + cls : ''); }
    function refresh() {
      bal.textContent = money(G.wallet); sessEl.textContent = (sess.net >= 0 ? '+' : '-') + money(Math.abs(sess.net)).replace('-', ''); sessEl.className = sess.net > 0 ? 'up' : sess.net < 0 ? 'down' : '';
      selEl.textContent = money(p.bet); chips.forEach((c, i) => c.classList.toggle('on', CHIPS[i] === p.bet));
      $$('.lb-tab', tabs).forEach(t => t.classList.toggle('on', curDef && t.dataset.g === curDef.id));
      liveAct();
    }
    function select(id) {
      if (cur && curDef.id === id) return;
      if (cur && cur.busy()) { status('Finish this round first!', 'bad'); snd.no(); return; }
      const def = GAMES.find(gm => gm.id === id) || GAMES[0];
      if (cur) cur.stop(); main.replaceChildren(); opts.replaceChildren(); histEl.replaceChildren();
      curDef = def; p.tab = def.id; main.dataset.g = def.id;
      cur = def.mount(ctx); status(TIPS[def.id] || 'Place your bet.'); refresh(); if (win.sel) snd.chip();
      win.sel = true;
    }
    win.casino = { select, ctx, get game() { return cur; }, get id() { return curDef && curDef.id; } };
    if (document.fonts && document.fonts.load) document.fonts.load('20px "Lilita One"').catch(() => {});
    select(p.tab);
    let last = performance.now();
    const loop = t => { if (!win.el.isConnected) return; const dt = Math.min(0.05, (t - last) / 1000); last = t; if (cur && cur.frame) cur.frame(dt); win.raf = requestAnimationFrame(loop); };
    win.raf = requestAnimationFrame(loop);
    win.tick = setInterval(() => { if (bal.textContent !== money(G.wallet)) refresh(); }, 500);
    win.stopGame = () => { if (cur) cur.stop(); cur = null; };
  }
  const TIPS = { crash: 'Bet, watch the rocket climb, cash out before it pops.', slots: 'Spin three reels of finest office supplies.', plinko: 'Drop balls. Physics decides. Mostly physics.',
    dice: 'Roll over or under your number.', mines: 'Pick a mine count, find gems, cash out before the boom.', coin: 'Heads: The Boss. Tails: Bonk.', keno: 'Pick up to 10 numbers. We draw 10.', roulette: 'Pick a bet on the table and spin.' };

  /* ---------- celebration: confetti + coin burst inside the window ---------- */
  function particles(fx, n, kind, big) {
    const r = fx.getBoundingClientRect(), k = OS.ws || 1, W = r.width / k, H = r.height / k, ox = W / 2, oy = H * 0.55;
    const COLS = ['#ff4fd8', '#7c5cff', '#35e08a', '#ffc93c', '#4dabf7', '#ff6b6b', '#fff'];
    for (let i = 0; i < n; i++) {
      const coin = kind === 'coin', e = h('i', { class: coin ? 'lb-pc' : 'lb-pf' });
      if (!coin) { e.style.background = pick(COLS); e.style.width = rand(5, 9) + 'px'; e.style.height = rand(9, 15) + 'px'; }
      else { const z = rand(14, 22); e.style.width = e.style.height = z + 'px'; }
      e.style.left = (ox + rand(-30, 30)) + 'px'; e.style.top = oy + 'px'; fx.append(e);
      const a = rand(-Math.PI * 0.92, -Math.PI * 0.08), v = rand(big ? 220 : 160, big ? 520 : 380), dx = Math.cos(a) * v, dy = Math.sin(a) * v, fall = H * rand(0.7, 1.1), rot = rand(-720, 720), dur = rand(1300, 2300);
      e.animate([{ transform: 'translate(0,0) rotate(0) scale(.4)', opacity: 1 }, { transform: `translate(${dx * 0.75}px,${dy * 0.8}px) rotate(${rot * 0.4}deg) scale(1)`, opacity: 1, offset: 0.3 },
        { transform: `translate(${dx}px,${dy + fall}px) rotate(${rot}deg) scale(1)`, opacity: 0 }], { duration: dur, easing: 'cubic-bezier(.15,.5,.5,1)', delay: rand(0, big ? 260 : 120) });
      setTimeout(() => e.remove(), dur + 300);
    }
  }
  function coins(n) { const w = OS.wins.get('casino'); if (w && w.fx) particles(w.fx, n, 'coin'); }
  function celebrate(level, payout, profit) {
    const w = OS.wins.get('casino'); if (!w || !w.fx) return;
    particles(w.fx, level > 1 ? 110 : 60, 'conf', level > 1); particles(w.fx, level > 1 ? 36 : 20, 'coin', level > 1);
    const mega = level > 1, ban = h('div', { class: 'lb-ban' + (mega ? ' mega' : '') }, h('b', {}, mega ? 'MEGA WIN!' : 'BIG WIN!'), mega ? null : h('span', {}, '+' + money(payout)));
    w.fx.append(ban); setTimeout(() => ban.remove(), 2400);
    if (mega) OS.cashFx('+' + money(payout));                  // the huge desktop money pop-up for the really big ones
  }
  Net.on('casino:big', d => { if (d && d.name) toast(String(d.name).slice(0, 18) + ' just won ' + money(clamp(+d.amt || 0, 0, 1e9)) + ' on LuckyBonk ' + String(d.game || 'Casino').slice(0, 20) + '!', 'good'); });

  /* shop picture: art(ctx, w, h) — a neon chip stack */
  function art(g, w, ht) {
    const bg = g.createLinearGradient(0, 0, 0, ht); bg.addColorStop(0, '#2a1d66'); bg.addColorStop(1, '#120c2a'); g.fillStyle = bg; g.fillRect(0, 0, w, ht);
    const s = Math.min(w, ht) / 100; g.save(); g.translate(w / 2, ht / 2 + 8 * s);
    [['#7c5cff', 18], ['#ff4fd8', 6], ['#ffc93c', -6]].forEach(([c, y], i) => {
      g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(0, y * s + 4 * s, 30 * s, 11 * s, 0, 0, 6.283); g.fill();
      g.fillStyle = c; g.beginPath(); g.ellipse(0, y * s, 30 * s, 11 * s, 0, 0, 6.283); g.fill();
      g.strokeStyle = '#fff'; g.lineWidth = 2.4 * s; g.setLineDash([5 * s, 6 * s]); g.beginPath(); g.ellipse(0, y * s, 24 * s, 8 * s, 0, 0, 6.283); g.stroke(); g.setLineDash([]);
    });
    g.fillStyle = '#fff'; g.font = `400 ${16 * s}px "Lilita One",sans-serif`; g.textAlign = 'center'; g.fillText('LUCKYBONK', 0, -30 * s); g.restore();
  }

  OS.apps.casino = {
    desktop: true, order: 82, available: owned, title: 'LuckyBonk Casino', icon: 'lb_chip', color: '#6741d9', cls: 'lbwin', w: 640, h: 636, x: 0.3, y: 0.005,
    render, onClose(w) { cancelAnimationFrame(w.raf); clearInterval(w.tick); if (w.stopGame) w.stopGame(); }
  };
  Shop.add({
    id: 'app_casino', tab: 'games', section: 'Software', name: 'LuckyBonk Casino', price: 300, icon: 'lb_chip', color: '#6741d9', sort: 20, art,
    desc: 'The original office casino: Crash, Slots, Plinko, Dice, Mines, Coinflip, Keno and Roulette. Bets come out of your Bonk Pay wallet.',
    owned, buy() { (G.prog.apps = G.prog.apps || {}).casino = true; Game.saveProgress(); if (OS.open) OS.buildIcons(); }
  });

  return { GAMES, KENO, PLK, PAY3, PAY2, REEL, symbols: SYM, art, trombone: () => snd.sad(), open: id => { const w = OS.launch('casino', true); if (w && id && w.casino) w.casino.select(id); return w; } };
})();
