'use strict';
/* REVIEW — the end-of-day performance review, the firing and the end reports.
   Everyone is seated in the review room, the lights dim and The Boss presents a projector slideshow
   (title, call analysis, agent results, verdict) with subtitles (+ TTS). Fired: the room bursts into flames
   and the termination report slides in. Passed: confetti and the employee evaluation (or the promotion
   notice after a full week). Replaces the old #review overlay by wrapping UI.showReview; the host adds
   quotes and career records to the review result by wrapping reviewLines (called by Game.endDay).
   API: see docs/modules/review.md. */
const Review = (() => {
  const SEAT_PREF = [6, 7, 4, 5, 2, 3, 0, 1];            // front seats first: a clear view of the screen (no chair backs in the way)
  const SCR = { x: 19.94, y: 1.8, z0: -7.4, z1: -3.4 };  // the projector screen (office.md)
  const BOSS_VOICE = { seed: 11, pitch: 0.55, rate: 0.92 };
  const PAL = ['#3b82f6', '#e8590c', '#2f9e44', '#c2255c', '#7048e8', '#f08c00', '#0c8599', '#5c940d'];
  const FIRE_SPOTS = [[14.6, 0.8, -5.3, 0.75], [19.4, 0, -5.95, 0.85], [19.35, 0, -4.6, 0.75], [19.25, 0, -2.85, 1.3], [19.3, 0, -8.35, 1.25],
    [18.2, 0, -3.3, 1.0], [17.4, 0, -8.5, 1.05], [12.5, 0, -8.4, 1.1], [11.0, 0, -3.0, 1.2], [15.9, 0, -2.9, 0.95], [19.05, 0, -6.55, 0.8], [18.7, 0, -4.4, 0.75]];
  const LINES = {
    intro: ['Sit. Down. This will not take long.', 'Phones down. Eyes on the screen.', 'Welcome to your daily performance review. Try to look ashamed.', 'I made slides. Nobody leaves until I have shown you the slides.'],
    calls: ['I listen to every call. Every. Single. One.', 'Let us review some highlights from today\'s calls.', 'Quality assurance flagged a few of your calls. By flagged I mean framed.'],
    react: ['Who SAYS that?', 'I am having these printed and hung in the lobby.', 'Legal has asked me to stop playing these at parties.', 'My therapist is going to hear about this one.'],
    silent: 'Nobody said anything worth quoting today. I am not sure that is better.',
    filler: [['Gary from Accounts', 'Is the printer supposed to smell like that?'], ['Desk 31', 'Hello? Hello? I think my headset is a banana.'], ['The intern', 'Do we get paid in money or in exposure?']]
  };
  const R = { on: false, res: null, t: 0, ev: [], slide: null, drawT: 0, dimK: 1, dimDir: 0, lights: null, proj: null, fires: [], fired: false,
    alarmT: null, fireT: 0, subT: 0, sheet: null, yaw0: 0, el: {}, tv: 0, sheetAt: 0, marks: null };
  const pool = [], mine = [];   // quote candidates: host pool {id, name, text, s}; a client's own best lines

  /* ---------- quotes: lines players said on calls ---------- */
  const QW = /\b(jet ?skis?|gift ?cards?|crypto|bitcoin|prizes?|lottery|won|winner|grandma|granny|nephew|prince|password|pin|bank|wire|fees?|urgent|police|tax|virus|refund|warranty|bonk|legit|trust|totally|definitely|honest(ly)?|scam|money|cash|dollars|pay|card|code|secret|boss|free|million|billion|lawyer|arrest|computer|hacked|duck|banana|llama|unicorn|pizza|cat|dog|yacht|castle|lizard)\b/gi;
  function clean(t) { t = String(t || '').replace(/\s+/g, ' ').trim(); return t.length > 150 ? t.slice(0, 147).trim() + '…' : t; }
  function scoreLine(t) {
    if (t.length < 8) return 0;
    let s = Math.min(t.length, 110) / 40 - (t.length > 140 ? 1 : 0);
    s += Math.min(3, (t.match(/!/g) || []).length) * 0.5 + Math.min(2, (t.match(/\?/g) || []).length) * 0.25;
    s += Math.min(3, (t.match(/\b[A-Z]{3,}\b/g) || []).length) * 0.6 + Math.min(4, (t.match(QW) || []).length) * 0.7;
    if (/not a scam|totally legit|trust me|100%|i promise|pinky/i.test(t)) s += 2;
    if (/\b(stupid|idiot|dumb|shut up|moron|loser)\b/i.test(t)) s += 1.5;
    return s + Math.random() * 0.6;
  }
  function addQuote(id, name, text, s) {
    if (!text || pool.some(q => q.text === text)) return;
    pool.push({ id, name, text, s });
    const own = pool.filter(q => q.id === id).sort((a, b) => a.s - b.s);
    if (own.length > 6) pool.splice(pool.indexOf(own[0]), 1);
    if (pool.length > 40) { pool.sort((a, b) => b.s - a.s); pool.length = 40; }
  }
  /* best three, one per player first */
  function pickQuotes() {
    const by = pool.slice().sort((a, b) => b.s - a.s), out = [], used = new Set();
    for (const q of by) if (out.length < 3 && !used.has(q.id)) { used.add(q.id); out.push(q); }
    for (const q of by) if (out.length < 3 && !out.includes(q)) out.push(q);
    return out.map(q => ({ name: q.name, text: q.text }));
  }
  Bus.on('call:line', l => {
    if (!l || l.who !== 'you' || G.phase !== 'day') return;
    const text = clean(l.text), s = scoreLine(text); if (s <= 0) return;
    if (Game.authority()) return addQuote(Net.myId, settings.name, text, s);
    mine.push({ text, s }); mine.sort((a, b) => b.s - a.s);
    if (mine.length > 4) mine.length = 4;
    if (mine.some(q => q.text === text)) Net.emit('review:line', { t: text, s: +s.toFixed(2) }, { host: true });
  });
  Net.on('review:line', (d, from) => {
    if (!Game.authority() || !d || typeof d.t !== 'string') return;
    const p = Net.players.get(from); addQuote(from, p ? p.name : 'Someone', clean(d.t), clamp(+d.s || 0, 0, 20));
  });
  Bus.on('day:start', () => { pool.length = 0; mine.length = 0; });
  Bus.on('game:begin', () => { pool.length = 0; mine.length = 0; });

  /* ---------- the host adds quotes + career records to the result (reviewLines runs inside Game.endDay) ---------- */
  function colorOf(name) {
    if (!Net.active) return settings.color;
    for (const [id, p] of Net.players) if (p.name === name) return id === Net.myId ? settings.color : p.color;
    return null;
  }
  function enrich(res) {
    const pr = G.prog.review || (G.prog.review = { career: {} }), car = pr.career || (pr.career = {});
    const spent = Math.max(1, Math.round(G.dayLen - Math.max(0, G.timeLeft)));
    res.quotes = pickQuotes();
    res.recs = res.players.map(p => { const c = car[p.name] || { e: 0, d: 0, s: 0 }; return { name: p.name, today: p.personal, total: c.e + p.personal, days: c.d + 1, secs: c.s + spent, color: colorOf(p.name) }; });
    res.days = G.day; res.haul = G.bank + G.team; res.secs = spent;
    if (res.pass) for (const r of res.recs) car[r.name] = { e: r.total, d: r.days, s: r.secs };   // saved by Game.saveWeek right after
  }
  if (typeof reviewLines === 'function') {
    const _rl = reviewLines;
    reviewLines = function (res) { try { enrich(res); } catch (e) { console.error('review enrich', e); } return _rl(res); };
  }
  /* fill whatever an older host did not send */
  function recsOf(res) {
    const recs = (res.recs && res.recs.length ? res.recs : res.players.map(p => ({ name: p.name, today: p.personal, total: p.personal, days: 1, secs: G.dayLen })))
      .map((r, i) => Object.assign({}, r, { color: r.color || PAL[i % PAL.length] }));
    return recs.sort((a, b) => b.total - a.total);
  }

  /* ---------- canvas helpers ---------- */
  const ease = k => 1 - Math.pow(1 - clamp(k, 0, 1), 3);
  const back = k => { k = clamp(k, 0, 1); const c = 1.9; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
  function wrap(g, text, maxW, maxLines) {
    const words = String(text).split(' '), out = []; let cur = '';
    for (const w of words) { const t = cur ? cur + ' ' + w : w; if (g.measureText(t).width > maxW && cur) { out.push(cur); cur = w; } else cur = t; }
    if (cur) out.push(cur);
    if (out.length > maxLines) { out.length = maxLines; let l = out[maxLines - 1]; while (l.length > 3 && g.measureText(l + '…').width > maxW) l = l.slice(0, -1); out[maxLines - 1] = l.replace(/[\s,.;:]+$/, '') + '…'; }
    return out;
  }
  function spaced(g, text, x, y, sp) {   // letter-spaced text centred on x
    let w = 0; for (const ch of text) w += g.measureText(ch).width + sp; w -= sp;
    let cx = x - w / 2; const al = g.textAlign; g.textAlign = 'left';
    for (const ch of text) { g.fillText(ch, cx, y); cx += g.measureText(ch).width + sp; }
    g.textAlign = al;
  }
  function rr(g, x, y, w, h, r) { if (typeof rrect === 'function') return rrect(g, x, y, w, h, r); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function ell(g, x, y, rx, ry, rot) { g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2); g.fill(); }

  /* The Boss as a cartoon mugshot: head centre (cx, cy), s = half the head height in px */
  function drawBoss(g, cx, cy, s, angry) {
    const skin = angry ? '#e2553f' : '#e9b98f', dark = angry ? '#b3361f' : '#c48f66', hair = '#a3a3a3';
    g.save(); g.translate(cx, cy); g.lineJoin = g.lineCap = 'round';
    // suit, shirt, tie, lapels
    g.fillStyle = '#2d3140'; g.beginPath(); g.moveTo(-s * 1.6, s * 2.6); g.quadraticCurveTo(-s * 1.55, s * 1.05, -s * 0.5, s * 0.9); g.lineTo(s * 0.5, s * 0.9); g.quadraticCurveTo(s * 1.55, s * 1.05, s * 1.6, s * 2.6); g.closePath(); g.fill();
    g.fillStyle = '#f4f2ea'; g.beginPath(); g.moveTo(-s * 0.45, s * 0.86); g.lineTo(0, s * 1.85); g.lineTo(s * 0.45, s * 0.86); g.closePath(); g.fill();
    g.fillStyle = '#b3201b'; g.beginPath(); g.moveTo(-s * 0.11, s * 0.96); g.lineTo(s * 0.11, s * 0.96); g.lineTo(s * 0.18, s * 1.6); g.lineTo(0, s * 1.86); g.lineTo(-s * 0.18, s * 1.6); g.closePath(); g.fill();
    g.fillStyle = '#20232d'; for (const k of [-1, 1]) { g.beginPath(); g.moveTo(k * s * 0.5, s * 0.9); g.lineTo(k * s * 0.08, s * 1.95); g.lineTo(k * s * 0.7, s * 1.4); g.closePath(); g.fill(); }
    g.fillStyle = dark; g.fillRect(-s * 0.3, s * 0.55, s * 0.6, s * 0.42);
    // ears, head
    g.fillStyle = skin; for (const k of [-1, 1]) ell(g, k * s * 0.84, s * 0.06, s * 0.17, s * 0.25);
    g.fillStyle = dark; for (const k of [-1, 1]) ell(g, k * s * 0.85, s * 0.06, s * 0.07, s * 0.13);
    g.fillStyle = skin; ell(g, 0, 0, s * 0.84, s);
    g.strokeStyle = 'rgba(40,10,0,.35)'; g.lineWidth = s * 0.05; g.beginPath(); g.ellipse(0, 0, s * 0.84, s, 0, 0, Math.PI * 2); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.28)'; ell(g, -s * 0.28, -s * 0.66, s * 0.26, s * 0.12, -0.45);
    g.fillStyle = angry ? 'rgba(150,20,0,.35)' : 'rgba(230,110,90,.35)'; for (const k of [-1, 1]) ell(g, k * s * 0.5, s * 0.3, s * 0.16, s * 0.1);
    // receding grey hair on the sides
    g.fillStyle = hair; for (const k of [-1, 1]) { ell(g, k * s * 0.74, -s * 0.22, s * 0.2, s * 0.42, k * 0.28); ell(g, k * s * 0.62, -s * 0.52, s * 0.14, s * 0.2, k * 0.6); }
    // brows, eyes, nose
    g.strokeStyle = '#6e6e6e'; g.lineWidth = s * 0.14;
    for (const k of [-1, 1]) { g.beginPath(); g.moveTo(k * s * 0.56, -s * (angry ? 0.42 : 0.34)); g.lineTo(k * s * 0.12, -s * (angry ? 0.2 : 0.3)); g.stroke(); }
    g.fillStyle = '#fff'; for (const k of [-1, 1]) ell(g, k * s * 0.33, -s * 0.08, s * 0.17, s * (angry ? 0.11 : 0.14));
    g.fillStyle = '#1a1410'; for (const k of [-1, 1]) ell(g, k * s * 0.3, -s * 0.06, s * 0.075, s * 0.075);
    g.strokeStyle = '#2a1a14'; g.lineWidth = s * 0.06; for (const k of [-1, 1]) { rr(g, k * s * 0.33 - s * 0.24, -s * 0.24, s * 0.48, s * 0.34, s * 0.07); g.stroke(); }
    g.beginPath(); g.moveTo(-s * 0.09, -s * 0.1); g.lineTo(s * 0.09, -s * 0.1); g.moveTo(-s * 0.57, -s * 0.12); g.lineTo(-s * 0.8, -s * 0.06); g.moveTo(s * 0.57, -s * 0.12); g.lineTo(s * 0.8, -s * 0.06); g.stroke();
    g.fillStyle = dark; ell(g, 0, s * 0.2, s * 0.19, s * 0.16);
    g.fillStyle = 'rgba(255,255,255,.3)'; ell(g, -s * 0.06, s * 0.14, s * 0.06, s * 0.04);
    // big moustache, frown
    g.fillStyle = '#8f8f8f';
    for (const k of [-1, 1]) { g.beginPath(); g.moveTo(0, s * 0.32); g.bezierCurveTo(k * s * 0.28, s * 0.22, k * s * 0.58, s * 0.3, k * s * 0.66, s * 0.6); g.bezierCurveTo(k * s * 0.42, s * 0.5, k * s * 0.2, s * 0.54, 0, s * 0.47); g.fill(); }
    g.strokeStyle = '#4a1a12'; g.lineWidth = s * 0.06; g.beginPath(); g.arc(0, s * 0.92, s * 0.24, Math.PI * 1.22, Math.PI * 1.78); g.stroke();
    g.restore();
  }
  /* a framed "live camera" picture of The Boss */
  function bossCam(g, x, y, w, h, angry, t, label) {
    g.save(); g.fillStyle = 'rgba(0,0,0,.3)'; rr(g, x + 6, y + 8, w, h, 8); g.fill();
    g.fillStyle = '#17171b'; rr(g, x, y, w, h, 8); g.fill();
    const ix = x + 8, iy = y + 8, iw = w - 16, ih = h - 16;
    g.save(); rr(g, ix, iy, iw, ih, 4); g.clip();
    const gr = g.createLinearGradient(0, iy, 0, iy + ih); gr.addColorStop(0, angry ? '#7a4a44' : '#5f7d84'); gr.addColorStop(1, angry ? '#4a2622' : '#3c5458'); g.fillStyle = gr; g.fillRect(ix, iy, iw, ih);
    g.strokeStyle = 'rgba(255,255,255,.16)'; g.lineWidth = 2; g.fillStyle = 'rgba(255,255,255,.3)'; g.font = '700 ' + Math.round(ih * 0.045) + 'px ' + FONT.ui; g.textAlign = 'left';
    for (let i = 0; i < 6; i++) { const ly = iy + ih * (0.12 + i * 0.15); g.beginPath(); g.moveTo(ix, ly); g.lineTo(ix + iw, ly); g.stroke(); g.fillText((7 - i) + "'", ix + 6, ly - 4); }
    drawBoss(g, ix + iw / 2, iy + ih * 0.45, ih * 0.24, angry);
    g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(ix, iy, iw, ih * 0.11);
    g.fillStyle = (t * 1.6) % 1 < 0.6 ? '#ff3b30' : '#6a1a16'; ell(g, ix + ih * 0.06, iy + ih * 0.055, ih * 0.022, ih * 0.022);
    g.fillStyle = '#fff'; g.font = '700 ' + Math.round(ih * 0.05) + 'px ' + FONT.ui; g.textBaseline = 'middle'; g.fillText(label || 'REC  CAM 07 · THE BOSS', ix + ih * 0.11, iy + ih * 0.057);
    const vg = g.createRadialGradient(ix + iw / 2, iy + ih / 2, ih * 0.3, ix + iw / 2, iy + ih / 2, ih * 0.85); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.45)'); g.fillStyle = vg; g.fillRect(ix, iy, iw, ih);
    g.restore(); g.restore();
  }
  function footer(g, w, h, n, dark) {
    g.textBaseline = 'alphabetic'; g.font = '700 15px ' + FONT.menu; g.fillStyle = dark ? 'rgba(255,255,255,.45)' : 'rgba(40,30,10,.55)';
    g.textAlign = 'left'; g.fillText('TOTALLY LEGIT INC.  ·  CONFIDENTIAL  ·  DO NOT FORWARD TO THE AUTHORITIES', 40, h - 18);
    g.textAlign = 'right'; g.fillText(n + ' / 4', w - 40, h - 18);
  }

  /* ---------- slides (1024 x 576 projector canvas) ---------- */
  const SLIDES = {
    title(g, w, h, lt, res) {
      let gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#22305a'); gr.addColorStop(1, '#0e1426'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(255,255,255,.035)'; for (let i = -h; i < w; i += 44) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 22, 0); g.lineTo(i + 22 + h, h); g.lineTo(i + h, h); g.fill(); }
      g.fillStyle = '#f2cf7a'; g.fillRect(0, 0, w, 10); g.fillRect(0, h - 10, w, 10);
      const k = back(lt / 0.7);
      if (typeof drawEmblem === 'function') { g.save(); g.translate(w / 2, 150); g.scale(k, k); drawEmblem(g, 0, 0, 78); g.restore(); }
      g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.globalAlpha = ease((lt - 0.2) / 0.5);
      g.fillStyle = '#f2cf7a'; g.font = '62px ' + FONT.slab; g.fillText('DAILY PERFORMANCE REVIEW', w / 2, 306, w - 80);
      const wk = Math.ceil(res.day / 5), day = DAYS[(res.day - 1) % 5].toUpperCase();
      g.fillStyle = '#fff'; g.font = '54px ' + FONT.chunky; g.fillText('—  ' + day + (wk > 1 ? ', WEEK ' + wk : '') + '  —', w / 2, 376);
      g.fillStyle = 'rgba(242,207,122,.35)'; g.fillRect(w / 2 - 240, 408, 480, 3);
      g.fillStyle = '#a9b6d6'; g.font = '700 25px ' + FONT.menu; g.fillText('Presented by The Boss  ·  Attendance mandatory  ·  Enthusiasm also mandatory', w / 2, 456, w - 120);
      g.globalAlpha = 1; footer(g, w, h, 1, true);
    },
    calls(g, w, h, lt, res) {
      let gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#e6d352'); gr.addColorStop(1, '#cbb535'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      gr = g.createRadialGradient(w * 0.45, h * 0.45, 40, w * 0.45, h * 0.45, w * 0.7); gr.addColorStop(0, 'rgba(255,255,230,.35)'); gr.addColorStop(1, 'rgba(255,255,230,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillStyle = '#2a2208'; g.font = '52px ' + FONT.chunky; g.fillText('Call Analysis', 40, 78);
      g.font = '700 15px ' + FONT.menu; g.fillStyle = 'rgba(42,34,8,.7)'; g.textAlign = 'right'; g.fillText('RECORDED FOR QUALITY, TRAINING AND BLACKMAIL PURPOSES', w - 40, 76);
      g.fillStyle = '#2a2208'; g.fillRect(40, 96, w - 80, 3);
      const Q = R.quotes;
      Q.forEach((q, i) => {
        const a = clamp((lt - 0.4 - i * 1.15) / 0.45, 0, 1); if (a <= 0) return;
        const x = 40 - (1 - ease(a)) * 70, y = 118 + i * 142, bw = 596, bh = 128;
        g.globalAlpha = a; g.fillStyle = 'rgba(60,45,0,.25)'; rr(g, x + 6, y + 7, bw, bh, 12); g.fill();
        g.fillStyle = q.filler ? '#f3e7a4' : '#ffd93d'; rr(g, x, y, bw, bh, 12); g.fill(); g.strokeStyle = '#3a2e08'; g.lineWidth = 3; g.stroke();
        g.fillStyle = '#2a2208'; ell(g, x + 40, y + 64, 23, 23); g.fillStyle = '#ffd93d'; g.font = '28px ' + FONT.chunky; g.textAlign = 'center'; g.fillText(String(i + 1), x + 40, y + 74);
        g.textAlign = 'left'; g.fillStyle = '#5a4508'; g.font = '700 21px ' + FONT.ui; g.fillText(q.name + ' said:', x + 78, y + 34, bw - 100);
        g.fillStyle = '#231b04'; g.font = (q.filler ? 'italic ' : '') + '500 23px ' + FONT.ui;
        wrap(g, '“' + q.text + '”', bw - 100, 3).forEach((l, j) => g.fillText(l, x + 78, y + 64 + j * 27));
        g.globalAlpha = 1;
      });
      bossCam(g, 664, 116, 320, 316, false, lt);
      g.textAlign = 'center'; g.fillStyle = '#2a2208'; g.font = '25px ' + FONT.chunky; g.fillText('The Boss. Listening. Always listening.', 824, 470);
      g.font = '700 17px ' + FONT.menu; g.fillStyle = 'rgba(42,34,8,.72)'; g.fillText(Q.filter(q => !q.filler).length ? 'Every call is monitored. Especially yours.' : 'No quotable calls. Concerning.', 824, 498);
      footer(g, w, h, 2);
    },
    chart(g, w, h, lt, res) {
      g.fillStyle = '#f4ecda'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#7a1d14'; g.fillRect(0, 0, w, 92); g.fillStyle = '#5c120c'; g.fillRect(0, 92, w, 6);
      g.textBaseline = 'alphabetic'; g.textAlign = 'left'; g.fillStyle = '#fff3d6'; g.font = '44px ' + FONT.slab; g.fillText('AGENT RESULTS', 40, 64);
      g.textAlign = 'right'; g.fillStyle = '#ffcf6a'; g.font = '36px ' + FONT.chunky; g.fillText(DAYS[(res.day - 1) % 5].toUpperCase(), w - 40, 62);
      const recs = R.recs.slice(0, 6), max = Math.max(1, ...recs.map(r => r.today)), n = recs.length;
      const top = 124, rowH = Math.min(64, 288 / Math.max(1, n)), bx = 300, bwMax = 520;
      recs.forEach((r, i) => {
        const y = top + i * rowH, bh = Math.min(40, rowH * 0.66), cy = y + rowH / 2, k = ease((lt - 0.3 - i * 0.18) / 1.3);
        g.textAlign = 'right'; g.fillStyle = '#3d1d0f'; g.font = Math.round(Math.min(32, bh * 0.85)) + 'px ' + FONT.chunky; g.textBaseline = 'middle';
        g.fillText(r.name, bx - 18, cy + 1, 230);
        g.fillStyle = '#e4d8bd'; rr(g, bx, cy - bh / 2, bwMax, bh, bh / 2.6); g.fill();
        const bw = Math.max(bh * 0.8, bwMax * (r.today / max) * k);
        if (r.today > 0 || k > 0) { g.fillStyle = r.color; rr(g, bx, cy - bh / 2, bw, bh, bh / 2.6); g.fill(); g.strokeStyle = '#3d1d0f'; g.lineWidth = 3; g.stroke(); g.fillStyle = 'rgba(255,255,255,.25)'; rr(g, bx + 6, cy - bh / 2 + 4, Math.max(0, bw - 12), bh * 0.28, bh * 0.14); g.fill(); }
        g.textAlign = 'left'; g.fillStyle = r.today > 0 ? '#1f6b2a' : '#9a3a1a'; g.font = Math.round(Math.min(30, bh * 0.8)) + 'px ' + FONT.chunky;
        g.fillText(money(Math.round(r.today * k)), bx + bw + 14, cy + 1);
        if (i === 0 && r.today > 0 && n > 1) { g.font = Math.round(Math.min(32, bh * 0.85)) + 'px ' + FONT.chunky; const nw = Math.min(230, g.measureText(r.name).width); g.fillStyle = '#e0a61a'; g.font = '30px ' + FONT.chunky; g.textAlign = 'right'; g.fillText('★', bx - 26 - nw, cy); }
      });
      // team vs quota
      const ty = 448, tx = 160, tw = 760, th = 44, scale = Math.max(res.quota, res.team, 1), k2 = ease((lt - 0.9) / 1.4);
      g.textBaseline = 'middle'; g.textAlign = 'left'; g.fillStyle = '#3d1d0f'; g.font = '32px ' + FONT.chunky; g.fillText('TEAM', 40, ty + th / 2 + 1);
      g.fillStyle = '#e4d8bd'; rr(g, tx, ty, tw, th, 14); g.fill();
      const fw = Math.max(28, tw * (res.team / scale) * k2);
      g.fillStyle = res.pass ? '#2fa84f' : '#d9542b'; rr(g, tx, ty, fw, th, 14); g.fill(); g.strokeStyle = '#3d1d0f'; g.lineWidth = 3; g.stroke();
      g.fillStyle = '#fff'; g.font = '28px ' + FONT.chunky; g.textAlign = fw > 140 ? 'right' : 'left'; g.fillText(money(Math.round(res.team * k2)), fw > 140 ? tx + fw - 14 : tx + fw + 12, ty + th / 2 + 1);
      if (fw <= 140) { g.fillStyle = '#3d1d0f'; g.fillText(money(Math.round(res.team * k2)), tx + fw + 12, ty + th / 2 + 1); }
      const qx = tx + tw * (res.quota / scale);
      g.strokeStyle = '#3d1d0f'; g.lineWidth = 4; g.setLineDash([8, 6]); g.beginPath(); g.moveTo(qx, ty - 22); g.lineTo(qx, ty + th + 8); g.stroke(); g.setLineDash([]);
      g.fillStyle = '#7a1d14'; g.font = '22px ' + FONT.chunky; g.textAlign = qx > tx + tw - 90 ? 'right' : 'center'; g.textBaseline = 'alphabetic'; g.fillText('QUOTA ' + money(res.quota), qx, ty - 28);
      footer(g, w, h, 3);
    },
    verdict(g, w, h, lt, res) {
      const pass = res.pass, promo = pass && res.week;
      let gr = g.createRadialGradient(w / 2, h * 0.48, 30, w / 2, h * 0.48, w * 0.72);
      gr.addColorStop(0, pass ? (promo ? '#4a3a12' : '#17532f') : '#4a120b'); gr.addColorStop(1, pass ? (promo ? '#1a1306' : '#07190e') : '#120403'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(255,255,255,.03)'; for (let i = 0; i < h; i += 6) g.fillRect(0, i, w, 2);
      g.textAlign = 'center'; g.textBaseline = 'alphabetic';
      const miss = Math.max(0, res.quota - res.team);
      g.fillStyle = pass ? '#cfe9d6' : '#f0d6c8'; g.font = '700 32px ' + FONT.ui;
      spaced(g, pass ? (promo ? 'FIVE DAYS. ZERO FIRINGS.' : 'QUOTA MET') : 'QUOTA MISSED BY ' + money(miss), w / 2, 196, 4);
      const k = clamp(lt / 0.32, 0, 1), sc = 2.4 - 1.4 * ease(k);
      g.save(); g.translate(w / 2, 318); g.rotate(-0.035 * k); g.scale(sc, sc); g.globalAlpha = k;
      const big = pass ? (promo ? 'PROMOTED!' : 'SEE YOU TOMORROW.') : "YOU'RE FIRED!";
      g.font = (pass && !promo ? 88 : 124) + 'px ' + FONT.slab; g.lineJoin = 'round'; g.lineWidth = 12; g.strokeStyle = pass ? (promo ? '#2a1c04' : '#062612') : '#2a0503';
      g.strokeText(big, 0, 0, w - 90); g.fillStyle = pass ? (promo ? '#ffd23f' : '#58f08a') : '#ff2a1a'; g.fillText(big, 0, 0, w - 90);
      g.restore(); g.globalAlpha = 1;
      g.fillStyle = pass ? '#bfe6c9' : '#e6b8a6'; g.font = '700 30px ' + FONT.ui; spaced(g, money(res.team) + ' OF ' + money(res.quota), w / 2, 404, 2);
      if (promo) { g.fillStyle = '#f2cf7a'; g.font = '30px ' + FONT.chunky; g.fillText('Everyone is now a Senior Associate. The pay is the same.', w / 2, 462, w - 100); }
      bossCam(g, w - 200, 26, 170, 150, !pass, lt, 'REC  THE BOSS');
      footer(g, w, h, 4, true);
    }
  };
  function drawSlide() { const s = R.slide; if (!s || !W.projector) return; const lt = R.t - s.t0; W.projector.draw((g, w, h) => SLIDES[s.name](g, w, h, lt, R.res)); }
  function showSlide(name, anim) {
    R.slide = { name, t0: R.t, anim: anim || 0 }; R.drawT = R.t; drawSlide();
    R.el.dots && [...R.el.dots.children].forEach((d, i) => d.classList.toggle('on', i === ['title', 'calls', 'chart', 'verdict'].indexOf(name)));
    Bus.emit('review:slide', name, R.res);
  }

  /* ---------- lights ---------- */
  function grabLights() {
    R.lights = []; R.proj = null; let best = null, bd = 1.2;
    W.scene.traverse(o => {
      if (!o.isLight || o.intensity <= 0) return;
      if (o.isPointLight) { const d = Math.hypot(o.position.x - 15, o.position.z + 5.4); if (d < bd) { bd = d; best = o; } }
      R.lights.push({ l: o, i: o.intensity, f: o.isDirectionalLight ? 0.22 : o.isPointLight ? 0.35 : 0.42 });
    });
    if (best) {   // the review room's own fill light becomes the projector's glow
      R.lights = R.lights.filter(x => x.l !== best);
      R.proj = { l: best, pos: best.position.clone(), col: best.color.clone(), i: best.intensity, d: best.distance };
      best.position.set(18.3, 1.9, -5.6); best.color.set('#cfdcff'); best.distance = 8; best.intensity = 0;
    }
  }
  function applyDim(k) {
    const e = k * k * (3 - 2 * k);
    for (const x of R.lights) x.l.intensity = x.i * lerp(1, x.f, e);
    if (R.proj) R.proj.l.intensity = (R.fired ? 1.5 : 1.0) * e;
  }
  function restoreLights() {
    if (R.lights) for (const x of R.lights) x.l.intensity = x.i;
    if (R.proj) { const p = R.proj; p.l.position.copy(p.pos); p.l.color.copy(p.col); p.l.intensity = p.i; p.l.distance = p.d; }
    R.lights = null; R.proj = null;
  }

  /* ---------- sound ---------- */
  function siren() { AudioSys.tone(620, 0.45, 'square', 0.055, 0, 980); AudioSys.tone(980, 0.42, 'square', 0.05, 0.47, 620); }
  function boom() { if (SFX.boom) SFX.boom(); else AudioSys.noise(0.6, 0.3, 0, 200); }

  /* ---------- subtitles ---------- */
  const sayDur = t => clamp(1.5 + t.length * 0.055, 2.6, 6.8);
  function say(text) {
    if (!text || !R.el.sub) return;
    R.el.subTxt.textContent = text; R.el.sub.classList.remove('on'); void R.el.sub.offsetWidth; R.el.sub.classList.add('on');
    R.subT = R.t + sayDur(text); if (W.boss) W.boss.talking = true;
    TTS.speak(text, BOSS_VOICE);
  }
  function hideSub() { R.subT = 0; if (R.el.sub) R.el.sub.classList.remove('on'); if (W.boss) W.boss.talking = false; }

  /* ---------- the review ---------- */
  function buildUI() {
    const root = $('#review'); root.className = 'rv-root'; root.classList.remove('hidden');
    const dots = h('span', { class: 'rv-dots' }, [0, 1, 2, 3].map(() => h('i')));
    R.el = { root, dots,
      dim: h('div', { class: 'rv-dim' }),
      top: h('div', { class: 'rv-top' }, h('b', {}, 'Performance review'), h('span', {}, DAYS[(R.res.day - 1) % 5]), dots),
      subTxt: h('span', { class: 'txt' }), sub: null,
      skip: h('button', { class: 'rv-skip', onclick: () => api.skip() }, 'Skip ', h('kbd', {}, 'Space')),
      hint: h('div', { class: 'rv-hint' }, 'Drag or click to look around') };
    R.el.sub = h('div', { class: 'rv-sub' }, h('span', { class: 'who' }, 'The Boss'), R.el.subTxt);
    root.replaceChildren(R.el.dim, R.el.top, R.el.sub, R.el.skip, R.el.hint);
    requestAnimationFrame(() => R.el.dim && R.el.dim.classList.add('on'));
    document.body.classList.add('rv-on');
  }
  function at(t, fn) { R.ev.push({ t, fn }); }
  /* run fn after dt seconds of review time (keeps the queue sorted; pauses with the game) */
  function later(dt, fn) { const res = R.res, e = { t: R.t + dt, fn: () => { if (R.on && R.res === res) fn(); } }; let i = R.ev.length; while (i > 0 && R.ev[i - 1].t > e.t) i--; R.ev.splice(i, 0, e); }
  function start(res) {
    stop(true);
    R.on = true; R.res = res; R.t = 0; R.ev = []; R.slide = null; R.fired = false; R.fires = []; R.alarmT = null; R.sheet = null;
    R.recs = recsOf(res);
    const real = (res.quotes || []).slice(0, 3);
    R.quotes = real.concat(shuffle(LINES.filler.slice()).slice(0, 3 - real.length).map(f => ({ name: f[0], text: f[1], filler: true })));
    // seat: front seats first, facing the screen (and The Boss)
    const idx = P.review >= 0 ? P.review : 0;
    seatForReview(SEAT_PREF[idx % SEAT_PREF.length]);
    aim();
    if (W.boss) { W.boss.talking = false; placeBoss(true, false); }   // calm until the verdict
    buildUI(); grabLights(); R.dimK = 0;
    // timeline
    let t = 0.2;
    R.marks = { title: t };
    at(t, () => showSlide('title', 0.9)); const intro = pick(LINES.intro); at(t + 0.6, () => say(intro));
    t += Math.max(4.6, sayDur(intro) + 1.1);
    R.marks.calls = t; at(t, () => showSlide('calls', 0.5 + R.quotes.length * 1.15 + 0.5));
    const c1 = real.length ? pick(LINES.calls) : LINES.silent; at(t + 0.4, () => say(c1));
    at(t + 1.2, () => W.boss && W.boss.play('point'));
    const c2 = pick(LINES.react); if (real.length) at(t + 0.6 + sayDur(c1) + 0.3, () => say(c2));
    t += Math.max(8.5, 0.9 + sayDur(c1) + (real.length ? sayDur(c2) + 0.5 : 0));
    R.marks.chart = t; at(t, () => showSlide('chart', 2.5));
    const lines = (res.lines || []).slice(0, -1); let lt = t + 0.4;
    for (const l of lines) { at(lt, () => say(l)); lt += sayDur(l) + 0.25; }
    t = Math.max(t + 6.5, lt + 0.3);
    R.tv = R.marks.verdict = t;
    at(t, () => verdict());
    R.sheetAt = R.marks.sheet = t + (res.pass ? 5.2 : 6.2);
    at(R.sheetAt, () => showSheet());
    R.ev.sort((x, y) => x.t - y.t);
  }
  /* face the screen, with The Boss in view too when the field of view allows it */
  function aim() {
    const cam = W.camera, hf = Math.atan(Math.tan(cam.fov * Math.PI / 360) * cam.aspect) - 0.06, dx = SCR.x - P.pos.x;
    const ang = (x, z) => Math.atan2(z - P.pos.z, x - P.pos.x);
    const sL = ang(SCR.x, SCR.z0), sR = ang(SCR.x, SCR.z1), bA = ang(BOSS_REVIEW.x, BOSS_REVIEW.z) - 0.2;
    const c = clamp((Math.min(bA, sL) + sR) / 2, sR - hf, sL + hf);
    P.yaw = R.yaw0 = Math.atan2(-Math.cos(c), -Math.sin(c)); P.pitch = Math.atan2(SCR.y - 1.35, Math.hypot(dx, SCR.z0 / 2 + SCR.z1 / 2 - P.pos.z)) * 0.75;
  }
  function verdict() {
    const res = R.res; showSlide('verdict', 1.2);
    const last = (res.lines || [])[res.lines ? res.lines.length - 1 : 0]; if (last) later(0.5, () => say(last));
    if (res.pass) {
      SFX.pass();
      later(0.6, () => {
        FX.spawn('confetti', [18.4, 0.9, -5.4], { dir: [-0.3, 1, 0], n: 140 });
        FX.spawn('confetti', [19.2, 1.2, -3.6], { dir: [-0.6, 1, -0.3], n: 70 }); FX.spawn('confetti', [19.2, 1.2, -7.2], { dir: [-0.6, 1, 0.3], n: 70 });
        FX.flash('#eaffd8', 0.5, 0.3); if (W.boss) W.boss.play('nod');
        if (res.week) FX.spawn('coins', [17.4, 0.9, -5.4], { n: 30 });
      });
      later(2.6, () => W.boss && W.boss.play(res.week ? 'cheer' : 'shrug'));
    } else {
      SFX.fired(); placeBoss(true, true);
      later(0.9, ignite);
    }
  }
  function ignite() {
    R.fired = true; R.fireT = R.t; R.alarmT = R.t;
    FIRE_SPOTS.forEach((s, i) => later(i * 0.11, () => { const f = FX.fire([s[0], s[1], s[2]], s[3], 900); if (f) R.fires.push(f); }));
    FX.flash('#ffb070', 0.6, 0.55); FX.shake(0.7, 1.4); FX.tint('#ff4a1a', 0.48); boom();
    if (R.proj) R.proj.l.color.set('#ff9a50');
    if (R.el.root) R.el.root.append(R.el.flames = flames());
    if (W.boss) W.boss.play('facepalm');
    Avatars.setMood('surprised', 8);
    Bus.emit('review:fire', R.res);
  }
  /* big blurry foreground flames along the bottom of the screen (CSS) */
  function flames() {
    const path = 'M50 4C58 26 84 40 82 70C80 92 66 104 50 104C34 104 18 92 18 70C18 52 30 44 34 28C40 40 44 44 48 46C46 30 44 18 50 4Z';
    const inner = 'M50 40C55 54 68 62 66 80C65 92 58 100 50 100C42 100 35 92 35 82C35 70 42 66 45 56C47 62 49 64 50 66C50 58 48 50 50 40Z';
    const el = h('div', { class: 'rv-flames' });
    for (let i = 0; i < 14; i++) {
      const edge = Math.abs(i - 6.5) / 6.5, f = h('i', { html: '<svg viewBox="0 0 100 108" preserveAspectRatio="none"><path d="' + path + '" fill="#ff5a14"/><path d="' + inner + '" fill="#ffc83a"/></svg>' });
      f.style.left = (i * 7.4 - 6 + rand(-2.5, 2.5)) + '%'; f.style.height = (rand(9, 17) + edge * 20) + 'vh'; f.style.width = (rand(8, 12) + edge * 6) + 'vw';
      f.style.animationDelay = -rand(0, 1.2) + 's'; f.style.animationDuration = rand(0.45, 0.85) + 's'; f.style.opacity = (0.45 + edge * 0.45).toFixed(2);
      el.append(f);
    }
    return el;
  }

  /* ---------- report sheets (ref: a ranked table on cream paper) ---------- */
  const fmtDays = d => d + (d === 1 ? ' DAY' : ' DAYS');
  const fmtDur = s => s >= 3600 ? Math.floor(s / 3600) + ':' + fmtTime(s % 3600).padStart(5, '0') : fmtTime(s);
  function sheetRows(kind) {
    const recs = R.recs, lead = recs[0] ? recs[0].total : 0, me = settings.name;
    return recs.map((r, i) => {
      const gap = i === 0 ? (recs[1] ? lead - recs[1].total : 0) : lead - r.total;
      const note = i === 0 ? (recs.length > 1 ? 'Top earner  •  +' + money(gap) + ' ahead' : 'Top earner  •  uncontested') : money(gap) + ' behind the leader';
      const pct = lead > 0 ? clamp(r.total / lead, 0.02, 1) : 0.02;
      const cell = (cap, v, cls) => h('div', { class: 'cell' }, h('div', { class: 'cap' }, cap), h('div', { class: 'v ' + (cls || '') }, v));
      const cells = kind === 'eval'
        ? [cell('Today', money(r.today), 'money'), cell('Total earned', money(r.total), 'money'), cell('Avg / day', money(r.total / Math.max(1, r.days)))]
        : [cell('Total earned', money(r.total), 'money'), cell('Time / days', fmtDur(r.secs) + ' / ' + r.days + 'D'), cell('Avg / day', money(r.total / Math.max(1, r.days)))];
      const bar = h('div', { class: 'bar' }, h('b')); requestAnimationFrame(() => setTimeout(() => { bar.firstChild.style.width = (pct * 100).toFixed(1) + '%'; }, 250 + i * 120));
      return h('div', { class: 'row' + (i === 0 ? ' top' : ''), style: { animationDelay: (0.35 + i * 0.1) + 's' } },
        h('div', { class: 'rank' }, '#' + (i + 1)),
        h('div', { class: 'who' }, h('div', { class: 'nm' }, r.name, r.name === me ? h('i', { class: 'you' }, 'you') : null), h('div', { class: 'note' }, note), bar),
        cells);
    });
  }
  const SEAL = '<svg viewBox="0 0 120 120"><g fill="#c99a2e">' + Array.from({ length: 16 }, (_, i) => '<circle cx="' + (60 + Math.cos(i / 16 * 6.283) * 46).toFixed(1) + '" cy="' + (60 + Math.sin(i / 16 * 6.283) * 46).toFixed(1) + '" r="13"/>').join('') + '</g><circle cx="60" cy="60" r="46" fill="#e2b23e" stroke="#9a6f12" stroke-width="3"/><circle cx="60" cy="60" r="36" fill="none" stroke="#9a6f12" stroke-width="2" stroke-dasharray="3 4"/><path d="M60 34l7.6 15.4 17 2.5-12.3 12 2.9 16.9L60 72.8l-15.2 8 2.9-16.9-12.3-12 17-2.5z" fill="#fff6d8" stroke="#9a6f12" stroke-width="2.5" stroke-linejoin="round"/></svg>';
  const ROSETTE = '<svg viewBox="0 0 80 110"><path d="M22 58L10 104l16-8 8 14 10-44z" fill="#b3201b"/><path d="M58 58l12 46-16-8-8 14-10-44z" fill="#d6342c"/>' + Array.from({ length: 14 }, (_, i) => '<circle cx="' + (40 + Math.cos(i / 14 * 6.283) * 28).toFixed(1) + '" cy="' + (40 + Math.sin(i / 14 * 6.283) * 28).toFixed(1) + '" r="9" fill="#e0a61a"/>').join('') + '<circle cx="40" cy="40" r="28" fill="#ffd23f" stroke="#9a6f12" stroke-width="3"/><text x="40" y="49" text-anchor="middle" font-family="Alfa Slab One, Georgia, serif" font-size="26" fill="#7a4a06">#1</text></svg>';
  function showSheet() {
    if (!R.on || R.sheet) return;
    const res = R.res, pass = res.pass, promo = pass && res.week, kind = pass ? (promo ? 'promo' : 'eval') : 'fired';
    const day = DAYS[(res.day - 1) % 5], next = DAYS[res.day % 5], wk = Math.ceil(res.day / 5);
    const days = res.days || res.day, haul = res.haul != null ? res.haul : res.team, host = Game.authority();
    const right = kind === 'eval'
      ? [h('div', { class: 'big money' }, money(res.team)), h('div', { class: 'cap' }, 'Team total'), h('div', { class: 'big' }, money(res.quota)), h('div', { class: 'cap' }, 'Quota (' + Math.round(100 * res.team / Math.max(1, res.quota)) + '% hit)')]
      : [h('div', { class: 'big' }, kind === 'promo' ? 'WEEK ' + wk : fmtDays(days)), h('div', { class: 'cap' }, kind === 'promo' ? 'Completed' : 'Days worked'), h('div', { class: 'big money' }, money(haul)), h('div', { class: 'cap' }, kind === 'promo' ? 'Banked so far' : 'Team haul')];
    const T = {
      fired: ['Totally Legit Inc. termination report', "EVERYONE'S FIRED", 'Your complete employment record, ranked against the rest of the call floor.'],
      eval: ['Totally Legit Inc. employee evaluation  ·  ' + day, 'YOU SURVIVED ' + day.toUpperCase(), 'Today\'s numbers, ranked. The Boss would like you to know he is not impressed.'],
      promo: ['Totally Legit Inc. official notice of promotion', 'PROMOTED!', 'A full week without getting fired. Everyone is now a Senior Associate. The pay is the same.']
    }[kind];
    let extra = null;
    if (kind !== 'fired') {
      const best = R.recs.slice().sort((a, b) => (kind === 'eval' ? b.today - a.today : b.total - a.total))[0];
      const pct = clamp(res.team / Math.max(1, res.quota), 0, 2), sc = Math.max(1, pct);
      const fill = h('b'); requestAnimationFrame(() => setTimeout(() => { fill.style.width = (100 * pct / sc).toFixed(1) + '%'; }, 300));
      extra = h('div', { class: 'rv-extra' },
        best ? h('div', { class: 'eotd' }, h('div', { class: 'ros', html: ROSETTE }), h('div', {}, h('div', { class: 'cap' }, kind === 'promo' ? 'Employee of the week' : 'Employee of the day'),
          h('div', { class: 'nm' }, best.name), h('div', { class: 'note' }, '+' + money(kind === 'eval' ? best.today : best.total) + (kind === 'eval' ? ' today' : ' this run') + '  •  Prize: a firm handshake (pending)'))) : null,
        h('div', { class: 'qbar' }, h('div', { class: 'cap' }, 'Team vs quota'), h('div', { class: 'track' }, fill, h('i', { style: { left: (100 / sc).toFixed(1) + '%' } })),
          h('div', { class: 'qv' }, h('span', { class: 'money' }, money(res.team)), ' of ', money(res.quota))));
    }
    const btn = (label, fn, cls) => h('button', { class: 'rv-btn ' + (cls || ''), onclick: fn }, label);
    const acts = host
      ? (pass ? [btn(promo ? 'Start week ' + (wk + 1) : 'Start ' + next, () => Game.nextDay(), 'primary'), btn('Save and quit', () => Game.quit())]
        : [btn('Try the day again', () => Game.retryDay(), 'primary'), btn('Main menu', () => Game.quit())])
      : [h('span', { class: 'wait' }, h('i', { class: 'spin' }), 'Waiting for the host'), btn('Leave', () => Game.quit())];
    const last = (res.lines || [])[(res.lines || []).length - 1] || '';
    const sheet = h('div', { class: 'rv-sheet ' + kind },
      kind === 'promo' ? h('div', { class: 'seal', html: SEAL }) : null,
      kind === 'fired' ? h('div', { class: 'stamp' }, 'Terminated') : null,
      h('header', {}, h('div', { class: 'l' }, h('div', { class: 'kick' }, T[0]), h('h1', {}, T[1]), h('p', { class: 'sub' }, T[2])), h('div', { class: 'r' }, right)),
      extra,
      h('div', { class: 'cols' }, h('span', {}, 'Rank'), h('span', {}, kind === 'fired' ? 'Former employee' : 'Employee'), h('span', {}, kind === 'eval' ? 'Today' : 'Run results')),
      h('div', { class: 'rows' }, sheetRows(kind)),
      h('footer', {}, h('p', { class: 'quote' }, last ? h('b', {}, 'The Boss: ') : null, last), h('div', { class: 'acts' }, acts)));
    R.sheet = sheet;
    R.el.root.append(h('div', { class: 'rv-back ' + kind }), sheet);
    R.el.skip.classList.add('gone'); R.el.hint.classList.add('gone'); R.el.top.classList.add('gone');
    releaseLock(); P.drag = false;
    if (pass) SFX.cash(); else SFX.bad();
    Bus.emit('review:report', res, kind);
  }

  /* ---------- per frame ---------- */
  Loop.add(dt => {
    if (!R.on) return;
    // seated eye height (player.js keeps the review camera at 1.2 m): sit up and lean back a little to see over the table
    if (P.review >= 0 && !P.cam) { const c = W.camera.position; c.y += 0.15; c.x += Math.sin(P.yaw) * 0.2; c.z += Math.cos(P.yaw) * 0.2; }
    if (G.paused && !Net.active) return;
    R.t += dt;
    while (R.ev.length && R.ev[0].t <= R.t) { const e = R.ev.shift(); try { e.fn(); } catch (er) { console.error('review step', er); } }
    if (R.dimK < 1) { R.dimK = Math.min(1, R.dimK + dt / 1.6); applyDim(R.dimK); }
    else if (R.fired && R.proj) R.proj.l.intensity = 1.3 + Math.sin(R.t * 17) * 0.15 + Math.sin(R.t * 7.3) * 0.2;
    const s = R.slide; if (s && R.t - s.t0 <= s.anim + 0.1 && R.t - R.drawT >= 0.075) { R.drawT = R.t; drawSlide(); }
    else if (s && R.t - R.drawT >= 0.5 && (s.name === 'calls' || s.name === 'verdict')) { R.drawT = R.t; drawSlide(); }   // blinking REC light
    if (R.subT && R.t >= R.subT) hideSub();
    if (R.alarmT != null && R.t >= R.alarmT) { siren(); R.alarmT = R.t - R.fireT < 7 ? R.alarmT + 1.0 : null; }
  });

  /* look around while seated (the normal mouse look only runs while you can walk) */
  const lookOK = () => R.on && !R.sheet && G.phase === 'review' && P.review >= 0 && !G.paused && !UI.settingsOpen;
  document.addEventListener('mousemove', e => {
    if (!lookOK() || !(P.locked || P.drag)) return;
    let dy = P.yaw - e.movementX * 0.0022 * settings.sens - R.yaw0; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    P.yaw = R.yaw0 + clamp(dy, -1.5, 1.5);
    P.pitch = clamp(P.pitch - e.movementY * 0.0022 * settings.sens * (settings.invertY ? -1 : 1), -0.9, 0.9);
    if (R.el.hint) R.el.hint.classList.add('gone');
  });
  Bus.on('boot', () => {
    const c = $('#gl'); if (!c) return;
    c.addEventListener('click', () => { if (lookOK() && !P.locked) { try { const r = c.requestPointerLock && c.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) {} } });
  });
  window.addEventListener('keydown', e => {
    if (!R.on || R.sheet || G.paused) return;
    const tag = e.target && e.target.tagName; if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (e.code === 'Space' && !e.repeat) { e.preventDefault(); api.skip(); }
  });

  /* ---------- clean-up (next day, retry, quit) ---------- */
  function stop(quiet) {
    const was = R.on;
    R.on = false; R.ev = []; R.slide = null; R.alarmT = null;
    for (const f of R.fires) if (f && f.stop) f.stop(); R.fires = [];
    if (R.fired) FX.tint(null); R.fired = false;
    restoreLights(); hideSub(); TTS.stop();
    if (W.projector && was) W.projector.clear();
    document.body.classList.remove('rv-on');
    const root = $('#review'); if (root && was) { root.replaceChildren(); root.classList.add('hidden'); }
    R.el = {}; R.sheet = null;
    if (was && !quiet) Bus.emit('review:end');
  }
  Bus.on('day:start', () => stop());
  Bus.on('quit', () => stop());

  /* the old overlay is replaced: Game.enterReview → UI.showReview(res) → Review.start(res) */
  UI.showReview = res => { try { start(res); } catch (e) { console.error('review start', e); } };

  const api = {
    start, stop,
    /* jump to the verdict (or straight to the report if the verdict is already up). Local only. */
    skip() {
      if (!R.on || R.sheet) return;
      if (R.t < R.tv - 0.05) { R.ev = R.ev.filter(e => e.t >= R.tv); R.t = R.tv - 0.01; hideSub(); TTS.stop(); if (R.dimK < 1) { R.dimK = 1; applyDim(1); } }
      else { R.ev = []; showSheet(); }
    },
    /* jump the review clock to t seconds (runs every event on the way; for tests) */
    seek(t) {
      if (!R.on) return;
      while (R.ev.length && R.ev[0].t <= t) { const e = R.ev.shift(); R.t = e.t; try { e.fn(); } catch (er) { console.error('review step', er); } }
      R.t = Math.max(R.t, t); if (R.dimK < 1) { R.dimK = 1; applyDim(1); } drawSlide();
    },
    get on() { return R.on; },
    get state() { return { on: R.on, t: R.t, slide: R.slide && R.slide.name, fired: R.fired, sheet: R.sheet ? R.sheet.className.split(' ')[1] : null, verdictAt: R.tv, sheetAt: R.sheetAt, marks: R.marks }; },
    /* call-analysis candidates (host: everyone's; client: your own best lines) */
    quotes: () => (Game.authority() ? pool : mine).slice(),
    addQuote(text, name) { const t = clean(text); if (t) addQuote('x' + hashStr(t), name || settings.name, t, scoreLine(t) + 1); },
    drawBoss, bossCam, slides: SLIDES, scoreLine
  };
  return api;
})();
