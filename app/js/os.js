'use strict';
/* =====================================================================
   DESKTOP OS — "LegitOS", the computer you sit at.
   Windows, taskbar, desktop icons, boot screen, incoming-call card,
   money pop-ups and fake virus alerts. Apps register in OS.apps (apps/*.js).
   API reference: docs/modules/os.md
   ===================================================================== */

/* ---------- glyphs: white 24x24 SVG icons for app tiles (add your own: OS.glyphs.name = '<path…/>') ---------- */
const OS_GLYPHS = (() => {
  const n = v => Math.round(v * 100) / 100;
  const RR = (x, y, w, h, r) => `M${n(x + r)} ${n(y)}h${n(w - 2 * r)}a${r} ${r} 0 0 1 ${r} ${r}v${n(h - 2 * r)}a${r} ${r} 0 0 1 ${-r} ${r}h${n(2 * r - w)}a${r} ${r} 0 0 1 ${-r} ${-r}v${n(2 * r - h)}a${r} ${r} 0 0 1 ${r} ${-r}z`;
  const CI = (cx, cy, r) => `M${n(cx - r)} ${n(cy)}a${r} ${r} 0 1 0 ${n(2 * r)} 0a${r} ${r} 0 1 0 ${n(-2 * r)} 0z`;
  const P = d => `<path fill-rule="evenodd" d="${d}"/>`;      // filled; overlapping sub-paths cut holes
  const F = d => `<path d="${d}"/>`;                            // filled; sub-paths merge
  const S = (d, w = 2) => `<path d="${d}" fill="none" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const poly = pts => 'M' + pts.map(p => n(p[0]) + ' ' + n(p[1])).join('L') + 'z';
  const ring = (k, f) => { const o = []; for (let i = 0; i < k; i++) o.push(f(i * Math.PI * 2 / k, i)); return o; };
  const gear = () => { const pts = []; ring(8, a => { for (const [r, o] of [[7, -.3], [9.7, -.17], [9.7, .17], [7, .3]]) pts.push([12 + Math.cos(a + o * Math.PI / 4) * r, 12 + Math.sin(a + o * Math.PI / 4) * r]); }); return P(poly(pts) + CI(12, 12, 3.2)); };
  const star = () => F(poly(ring(10, (a, i) => { a -= Math.PI / 2; const r = i % 2 ? 4.3 : 10; return [12 + Math.cos(a) * r, 12.8 + Math.sin(a) * r]; })));
  const virus = () => S(ring(8, a => `M${n(12 + Math.cos(a) * 5)} ${n(12 + Math.sin(a) * 5)}L${n(12 + Math.cos(a) * 8.2)} ${n(12 + Math.sin(a) * 8.2)}`).join(''), 2)
    + F(ring(8, a => CI(12 + Math.cos(a) * 8.7, 12 + Math.sin(a) * 8.7, 1.5)).join('')) + P(CI(12, 12, 5.8) + CI(10.1, 10.6, 1.4) + CI(14.1, 13.7, 1.1) + CI(13.8, 9.5, .7));
  const sun = () => F(CI(12, 12, 4.6)) + S(ring(8, a => `M${n(12 + Math.cos(a) * 7.3)} ${n(12 + Math.sin(a) * 7.3)}L${n(12 + Math.cos(a) * 9.8)} ${n(12 + Math.sin(a) * 9.8)}`).join(''), 2);
  return {
    phone: P('M5 3h3.5l1.5 4.5-2.2 1.6c1.2 2.6 3.2 4.6 5.8 5.8l1.6-2.2 4.5 1.5v3.5c0 1.2-1 2.2-2.2 2.2C10.5 19.9 4.1 13.5 3 6.3 3 4.4 3.8 3 5 3z') + S('M14.5 3.2a6.3 6.3 0 0 1 6.3 6.3M14.5 6.6a2.9 2.9 0 0 1 2.9 2.9', 1.9),
    camera: P(RR(2, 6.5, 20, 14, 3) + CI(12, 13.5, 4.7) + CI(18.3, 9.6, .9)) + F('M8 6.6l1.6-2.6h4.8L16 6.6z' + CI(12, 13.5, 2.6)),
    globe: '<g fill="none" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3.4 9h17.2M3.4 15h17.2"/></g>',
    script: P(RR(4.5, 2.5, 15, 19, 2.5) + 'M8 7h8v1.8H8zM8 10.6h8v1.8H8zM8 14.2h5.5V16H8z'),
    doc: P('M5 2.5h9.5l4.5 4.5v14.5H5z' + 'M8 11h8v1.6H8zM8 14.2h8v1.6H8zM8 17.4h5v1.6H8z') + F('M14.5 2.5V7H19z'),
    book: P('M2.5 5.2c3.2-1.3 6.3-1.1 8.8.8v14.3c-2.6-1.7-5.6-1.9-8.8-.8zM21.5 5.2c-3.2-1.3-6.3-1.1-8.8.8v14.3c2.6-1.7 5.6-1.9 8.8-.8z'),
    bag: F('M4.5 8.5h15l-1 12a1.7 1.7 0 0 1-1.7 1.5H7.2a1.7 1.7 0 0 1-1.7-1.5z') + S('M9 8.5V7a3 3 0 0 1 6 0v1.5', 1.9),
    cart: S('M2.5 4h2.6l2.3 10.5h10.2l2.2-7.5H6', 2) + F(CI(9, 19, 1.6) + CI(17, 19, 1.6)),
    shield: P('M12 2.5l8 3v6.2c0 4.9-3.4 8.6-8 9.8-4.6-1.2-8-4.9-8-9.8V5.5z' + 'M7.6 12.2l1.5-1.5 2 2 4.6-4.6 1.5 1.5-6.1 6.1z'),
    cookie: P('M12 3a9 9 0 1 0 9 9 3 3 0 0 1-3-3 3 3 0 0 1-3-3 3 3 0 0 1-3-3z' + CI(8.5, 9.5, 1.3) + CI(13.5, 14.5, 1.4) + CI(8, 15, 1.1) + CI(12.4, 10.6, .9) + CI(17, 15.6, .9)),
    dice: P(RR(3.5, 3.5, 17, 17, 3.5) + CI(8, 8, 1.6) + CI(16, 8, 1.6) + CI(12, 12, 1.6) + CI(8, 16, 1.6) + CI(16, 16, 1.6)),
    chat: P(RR(2.5, 4, 19, 13, 3.5) + CI(7.5, 10.5, 1.3) + CI(12, 10.5, 1.3) + CI(16.5, 10.5, 1.3)) + F('M6.5 16.9v4.6l5.2-4.6z'),
    palette: P('M12 3a9 9 0 0 0 0 18c1.4 0 2.1-.9 2.1-1.9 0-1.2-1-1.5-1-2.6 0-1 .8-1.6 1.8-1.6H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z' + CI(7.3, 11.2, 1.5) + CI(9.6, 7.1, 1.5) + CI(14.6, 7.1, 1.5) + CI(17.2, 11, 1.5)),
    image: P(RR(2.5, 4, 19, 16, 2.5) + 'M5 17.5l4.6-5.6 3.2 3.7 2.2-2.4 4 4.3z' + CI(15.6, 8.8, 1.8)),
    card: P(RR(2, 5, 20, 14, 2.5) + 'M2 8.3h20v2.8H2z' + 'M5 14.5h6v1.8H5z'),
    gift: P('M3 7h18v3.5H3zM4.2 11.5h15.6V21H4.2zM11 7h2v3.5h-2zM11 11.5h2V21h-2z') + F('M12 6.6C10.8 3.4 6.8 3 6.8 5.2c0 1.4 2.6 1.4 5.2 1.4zM12 6.6c1.2-3.2 5.2-3.6 5.2-1.4 0 1.4-2.6 1.4-5.2 1.4z'),
    bank: P('M12 2.5l9.5 5v1.8h-19V7.5z' + CI(12, 6.7, 1.2)) + F('M4.5 10.5h3v7h-3zM10.5 10.5h3v7h-3zM16.5 10.5h3v7h-3zM2.5 18.5h19V21h-19z'),
    id: P(RR(2, 5, 20, 14, 2.5) + CI(8, 10.3, 2.2) + 'M4.6 16.3c.4-2.1 1.8-3.2 3.4-3.2s3 1.1 3.4 3.2z' + 'M13.5 8.8h6v1.7h-6zM13.5 12.1h6v1.7h-6zM13.5 15.3h4v1.7h-4z'),
    monitor: P(RR(2, 3.5, 20, 13.5, 2) + RR(4, 5.5, 16, 9.5, .8)) + F('M10.5 17h3v2.5h-3z' + RR(7, 19.3, 10, 1.9, .9)) + F('M9.5 7.2l5.8 3-2.5.8 1.5 2.5-1.1.7-1.5-2.5-1.9 1.8z'),
    trophy: F('M7 3h10v5.5a5 5 0 0 1-10 0zM11 13h2v4.2h-2z' + RR(7.5, 17, 9, 3.8, 1.2)) + S('M7 5H4.3v1.3A3.4 3.4 0 0 0 7.4 9.9M17 5h2.7v1.3a3.4 3.4 0 0 1-3.1 3.6', 1.8),
    virus: virus(),
    bug: P('M12 7.4c3.4 0 5.6 2.8 5.6 6.6S15.4 21 12 21s-5.6-3.2-5.6-7S8.6 7.4 12 7.4z' + 'M11.3 9.6h1.4V20h-1.4z') + F(CI(12, 5.4, 2.7)) + S('M6.4 11.5 3 9.6M6.2 14.5H2.6M6.6 17.6l-3 1.8M17.6 11.5 21 9.6M17.8 14.5h3.6M17.4 17.6l3 1.8', 1.7),
    envelope: P(RR(2.5, 5, 19, 14, 2) + 'M4.6 7.6l7.4 5.9 7.4-5.9v2.2l-7.4 5.9-7.4-5.9z'),
    chart: F('M4 13h3.6v7H4zM10.2 8.5h3.6V20h-3.6zM16.4 4h3.6v16h-3.6z'),
    gear: gear(),
    power: S('M7.2 6.6a7.6 7.6 0 1 0 9.6 0M12 3.2v8', 2.6),
    eye: P('M1.8 12c2.6-4.6 6.1-7.2 10.2-7.2s7.6 2.6 10.2 7.2c-2.6 4.6-6.1 7.2-10.2 7.2S4.4 16.6 1.8 12z' + CI(12, 12, 4.3)) + F(CI(12, 12, 2.2)),
    clip: S('M16 7v8.8a4 4 0 0 1-8 0V6.2a2.6 2.6 0 0 1 5.2 0v9.3a1.2 1.2 0 0 1-2.4 0V7.5', 1.9),
    cash: P(RR(2, 6, 20, 12, 2) + CI(12, 12, 2.9) + CI(5.6, 9.2, 1) + CI(18.4, 14.8, 1)),
    coin: P(CI(12, 12, 9.4) + CI(12, 12, 7.4)) + '<text x="12" y="16.7" text-anchor="middle" font-size="12.5" font-family="Lilita One,sans-serif" stroke="none">$</text>',
    lock: P(RR(4.5, 10.5, 15, 11, 2.4) + 'M12 13.2a1.8 1.8 0 0 1 .9 3.4v2h-1.8v-2a1.8 1.8 0 0 1 .9-3.4z') + S('M8 10.5V8a4 4 0 0 1 8 0v2.5', 2.3),
    key: P(CI(7.5, 12, 4.8) + CI(7.5, 12, 1.8)) + F('M11.5 10.8h10v2.4h-1.8v3h-2.4v-3h-1.6v2.2h-2.4v-2.2h-1.8z'),
    user: F(CI(12, 7.8, 4.2) + 'M3.8 21c.3-4.6 3.8-7.4 8.2-7.4s7.9 2.8 8.2 7.4z'),
    users: F(CI(9, 8.2, 3.6) + 'M2 20.5c.3-4 3.2-6.4 7-6.4s6.7 2.4 7 6.4z' + CI(16.6, 7.6, 2.9) + 'M17.4 13.2c2.8.3 4.5 2.4 4.7 5.6h-4.5c-.3-2.2-1-4-2.4-5.3.6-.2 1.4-.3 2.2-.3z'),
    star: star(),
    bolt: F('M13.6 2 4.8 13.6h6.1L9.8 22l9.4-12.2h-6.2z'),
    heart: F('M12 21.2S3.2 15.8 3.2 9.6A4.8 4.8 0 0 1 12 7a4.8 4.8 0 0 1 8.8 2.6c0 6.2-8.8 11.6-8.8 11.6z'),
    music: F('M8.5 5.6 19.5 3v12.2h-2V7.4l-7 1.6v8.6h-2z' + CI(6.3, 17.6, 2.7) + CI(17.3, 15.2, 2.7)),
    clipboard: P(RR(4.5, 4, 15, 18, 2.2) + 'M8 10h8v1.7H8zM8 13.5h8v1.7H8zM8 17h5v1.7H8z') + F(RR(8.5, 2, 7, 4.2, 1.2)),
    folder: F('M2.5 6.5A1.7 1.7 0 0 1 4.2 4.8h5.3l2.1 2.3h8.2a1.7 1.7 0 0 1 1.7 1.7v9.4a1.7 1.7 0 0 1-1.7 1.7H4.2a1.7 1.7 0 0 1-1.7-1.7z'),
    search: '<circle cx="10.5" cy="10.5" r="6.2" fill="none" stroke-width="2.6"/>' + S('M15.2 15.2 20.5 20.5', 3),
    cctv: P('M2.5 10.2 14.6 5.6l2.1 5.6-12.1 4.6z' + CI(6.2, 11.9, 1.5)) + F('M2 8.9 14.2 4.3l.5 1.3L2.5 10.2z') + S('M15.8 8.6l3.8-1.4M19.8 3.5v8', 2) + F(CI(13.4, 9.9, .8)),
    receipt: P('M5.5 2.5h13v19l-2.2-1.6-2.2 1.6-2.1-1.6-2.1 1.6-2.2-1.6-2.2 1.6z' + 'M8.5 7h7v1.7h-7zM8.5 10.5h7v1.7h-7zM8.5 14h4.5v1.7H8.5z'),
    crown: F('M3 7.5l4.6 4.2L12 4.5l4.4 7.2L21 7.5l-1.8 11H4.8zM4.8 19.6h14.4v1.9H4.8z'),
    refresh: S('M19.5 12a7.5 7.5 0 0 1-13.2 4.9M4.5 12a7.5 7.5 0 0 1 13.2-4.9', 2.3) + F('M18.8 3.2v5.6h-5.6zM5.2 20.8v-5.6h5.6z'),
    box: '<path d="M12 2.5 21 7l-9 4.5L3 7z"/><path d="M3 8.3l8.3 4.2v9.4L3 17.7z" opacity=".78"/><path d="M21 8.3l-8.3 4.2v9.4l8.3-4.2z" opacity=".58"/>',
    calc: P(RR(5, 2.5, 14, 19, 2.4) + 'M7.5 5h9v3.6h-9z' + [12, 15.3, 18.6].map(y => CI(8.6, y, 1.1) + CI(12, y, 1.1) + CI(15.4, y, 1.1)).join('')),
    gamepad: P('M7 7h10a5 5 0 0 1 4.8 6.4l-1.3 4.2a2.5 2.5 0 0 1-4.3.9L14 16.5h-4l-2.2 2a2.5 2.5 0 0 1-4.3-.9l-1.3-4.2A5 5 0 0 1 7 7z' + 'M7.7 9.4h1.6v1.4h1.4v1.6H9.3v1.4H7.7v-1.4H6.3v-1.6h1.4z' + CI(15.6, 10.4, 1.1) + CI(17.6, 12.6, 1.1)),
    warning: P('M12 2.6 22.4 20.6H1.6z' + 'M11 8.8h2v6.4h-2z' + CI(12, 17.6, 1.25)),
    x: S('M6 6l12 12M18 6 6 18', 3),
    check: S('M4.5 12.5l4.8 4.8L19.5 7', 3),
    plus: F('M9.8 3.5h4.4v6.3h6.3v4.4h-6.3v6.3H9.8v-6.3H3.5V9.8h6.3z'),
    door: P('M6 3h9.5A1.5 1.5 0 0 1 17 4.5V20H6z' + CI(13.6, 12.4, 1.1)) + F('M3.5 20h17v1.8h-17z'),
    home: F('M12 3l9.5 8.2h-2.7V21h-4.6v-6h-4.4v6H5.2v-9.8H2.5z'),
    briefcase: P(RR(2.5, 7, 19, 13.5, 2.2) + 'M2.5 12.6h19V14h-19z') + S('M9 7V5.3A1.3 1.3 0 0 1 10.3 4h3.4A1.3 1.3 0 0 1 15 5.3V7', 1.9),
    wifi: S('M2.8 9a13 13 0 0 1 18.4 0M6 12.4a8.4 8.4 0 0 1 12 0M9.2 15.7a3.8 3.8 0 0 1 5.6 0', 2.3) + F(CI(12, 19, 1.6)),
    clock: P(CI(12, 12, 9.5) + CI(12, 12, 7.6)) + S('M12 7.5V12l3 2', 2),
    calendar: P(RR(3, 4.5, 18, 16.5, 2.2) + 'M3 8.5h18v1.6H3zM6.5 12.5h3v3h-3zM10.5 12.5h3v3h-3zM14.5 12.5h3v3h-3z') + S('M8 2.8v3.4M16 2.8v3.4', 2),
    flame: F('M12 2.5c.8 3.4 5.8 5.8 5.8 11.1A5.8 5.8 0 0 1 6.2 13.6c0-2.6 1.4-4.1 2.4-5 .2 1.8 1 3 2.2 3.6C10.4 8.6 11 5.2 12 2.5z'),
    pencil: F('M15.6 3.6l4.8 4.8L9 19.8l-5.8 1 1-5.8z'),
    megaphone: F('M3 9.5h3.5L17 4v16L6.5 14.5H3zM7 15.5h3l1 5H8z') + S('M19.6 9.4a3.6 3.6 0 0 1 0 5.2', 1.8),
    tv: P(RR(2.5, 6, 19, 13, 2) + RR(4.5, 8, 15, 9, 1)) + S('M8.5 2.8 12 6l3.5-3.2', 1.8),
    mic: F(RR(9, 2.5, 6, 11, 3)) + S('M5.8 11a6.2 6.2 0 0 0 12.4 0M12 17.4V21', 2),
    speaker: F('M3.5 9h4L13 4.5v15L7.5 15h-4z') + S('M16.3 8.8a4.6 4.6 0 0 1 0 6.4M19 6.2a8.3 8.3 0 0 1 0 11.6', 1.9),
    smile: P(CI(12, 12, 9.5) + CI(8.8, 9.8, 1.4) + CI(15.2, 9.8, 1.4) + 'M7.4 13.3h9.2a4.6 4.6 0 0 1-9.2 0z'),
    target: P(CI(12, 12, 9.4) + CI(12, 12, 7) + CI(12, 12, 4.5) + CI(12, 12, 2.2)),
    trash: F('M4 5.5h16v2H4zM9 3h6v2H9z') + P('M5.5 8.5h13l-1 12a1.6 1.6 0 0 1-1.6 1.5H8.1a1.6 1.6 0 0 1-1.6-1.5z' + 'M9.2 11h1.6v8H9.2zM13.2 11h1.6v8h-1.6z'),
    grid: F(RR(3, 3, 8, 8, 1.6) + RR(13, 3, 8, 8, 1.6) + RR(3, 13, 8, 8, 1.6) + RR(13, 13, 8, 8, 1.6)),
    sun: sun(),
    cloud: F('M6.5 19a4.5 4.5 0 0 1-.6-9 6 6 0 0 1 11.5-1.5A5 5 0 0 1 17.5 19z'),
    download: F('M10.6 3h2.8v8.2h3.4L12 16.2l-4.8-5H10.6zM3.5 18.5h17V21h-17z'),
    rocket: P('M12 2.2c3.6 2.4 5.2 6.2 5 10.6l-2.2 4.6H9.2L7 12.8c-.2-4.4 1.4-8.2 5-10.6z' + CI(12, 9.2, 1.9)) + F('M7.4 13.6 4 17.5l1 3 3.6-2.2zM16.6 13.6 20 17.5l-1 3-3.6-2.2zM10.2 18.4h3.6L12 22z'),
    hand: F('M8 11V5.2a1.4 1.4 0 0 1 2.8 0V10h.4V3.8a1.4 1.4 0 0 1 2.8 0V10h.4V5a1.4 1.4 0 0 1 2.8 0v5.6h.3V8a1.4 1.4 0 0 1 2.8 0v6.6c0 4-2.8 7-6.8 7-2.6 0-4.2-1-5.6-3l-3.6-5a1.5 1.5 0 0 1 2.2-2z'),
    pizza: P('M12 21.5 3 5.5c5.6-3 12.4-3 18 0z' + CI(10, 9, 1.4) + CI(14.2, 10.8, 1.2) + CI(11.6, 14.2, 1.1)),
    skull: P('M12 2.8c4.6 0 8 3.2 8 7.6 0 2.6-1.2 4.4-3 5.4v3.4H7v-3.4c-1.8-1-3-2.8-3-5.4 0-4.4 3.4-7.6 8-7.6z' + CI(8.8, 10.6, 2) + CI(15.2, 10.6, 2) + 'M11.2 14h1.6l.6 1.8h-2.8z') + F('M8 19.8h8V21.5H8z')
  };
})();
/* emoji -> glyph, so apps that only set `emoji` still get a crisp tile */
const OS_EMOJI_GLYPH = {
  '📞': 'phone', '☎️': 'phone', '📱': 'phone', '📒': 'book', '📓': 'book', '📖': 'book', '📜': 'script', '📝': 'script', '📄': 'doc', '👁️': 'eye', '👁': 'eye', '🛒': 'cart', '🛍️': 'bag',
  '📎': 'clip', '🎨': 'palette', '✉️': 'envelope', '📧': 'envelope', '📨': 'envelope', '📊': 'chart', '📈': 'chart', '⚙️': 'gear', '💳': 'card', '🎁': 'gift', '🏦': 'bank', '🏆': 'trophy',
  '🦠': 'virus', '💸': 'cash', '💰': 'cash', '💵': 'cash', '🪙': 'coin', '🧾': 'receipt', '👑': 'crown', '🔁': 'refresh', '🖥️': 'monitor', '💻': 'monitor', '🐧': 'heart', '🔐': 'lock',
  '🔒': 'lock', '🔑': 'key', '📦': 'box', '🧮': 'calc', '🍪': 'cookie', '🎲': 'dice', '🎰': 'dice', '💬': 'chat', '🖼️': 'image', '🌄': 'image', '🪪': 'id', '🛡️': 'shield', '📷': 'camera',
  '📸': 'camera', '🌐': 'globe', '🐞': 'bug', '🐛': 'bug', '📹': 'cctv', '🎮': 'gamepad', '🏠': 'home', '⏰': 'clock', '📅': 'calendar', '🔥': 'flame', '✏️': 'pencil', '📣': 'megaphone',
  '📺': 'tv', '🎵': 'music', '⭐': 'star', '⚡': 'bolt', '❤️': 'heart', '👥': 'users', '👤': 'user', '🗑️': 'trash', '🚀': 'rocket', '🍕': 'pizza', '☁️': 'cloud', '🎤': 'mic', '🔊': 'speaker'
};

/* LegitOS mascot: a winking desk phone with a halo (our own art) */
const OS_LOGO = '<svg class="lglogo" viewBox="0 0 200 186" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'
  + '<ellipse cx="100" cy="20" rx="42" ry="10" fill="none" stroke="#ffd84a" stroke-width="7"/>'
  + '<path d="M46 98 Q50 84 70 84 H130 Q150 84 154 98 L168 150 Q171 170 151 170 H49 Q29 170 32 150Z" fill="#ff7a3c" stroke="#1d1410" stroke-width="6" stroke-linejoin="round"/>'
  + '<path d="M56 160 H144" stroke="#d9541f" stroke-width="5" stroke-linecap="round"/>'
  + '<path d="M26 72 Q24 44 56 42 H144 Q176 44 174 72 Q174 88 160 88 H146 Q139 88 137 80 L133 67 H67 L63 80 Q61 88 54 88 H40 Q26 88 26 72Z" fill="#ff8f4f" stroke="#1d1410" stroke-width="6" stroke-linejoin="round"/>'
  + '<path d="M44 54 Q60 49 78 50" stroke="#ffc59a" stroke-width="5" stroke-linecap="round" fill="none"/>'
  + '<ellipse cx="78" cy="116" rx="11" ry="13" fill="#fff" stroke="#1d1410" stroke-width="5"/><circle cx="81" cy="118" r="5.5" fill="#1d1410"/><circle cx="83" cy="115" r="2" fill="#fff"/>'
  + '<path d="M110 119 Q121 107 132 119" fill="none" stroke="#1d1410" stroke-width="6" stroke-linecap="round"/>'
  + '<path d="M72 137 Q100 162 130 135 Q127 152 100 155 Q78 153 72 137Z" fill="#7a1f12" stroke="#1d1410" stroke-width="5" stroke-linejoin="round"/>'
  + '<path d="M90 151 Q100 146 110 151" fill="none" stroke="#ff6b6b" stroke-width="4" stroke-linecap="round"/>'
  + '<circle cx="60" cy="135" r="7" fill="#ff4f6a" opacity=".5"/><circle cx="142" cy="133" r="7" fill="#ff4f6a" opacity=".5"/></svg>';

const OS_WIN_BTN = {
  min: '<svg viewBox="0 0 16 16"><path d="M3 8.5h10" stroke="currentColor" stroke-width="2.2"/></svg>',
  max: '<svg viewBox="0 0 16 16"><rect x="3" y="3" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
  restore: '<svg viewBox="0 0 16 16"><path d="M5.5 5.5V3h7.5v7.5h-2.5" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="3" y="5.5" width="7.5" height="7.5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
  x: '<svg viewBox="0 0 16 16"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>'
};

const OS = {
  open: false, wins: new Map(), z: 20, apps: {}, popups: 0, popN: 0, memoDay: -1,
  glyphs: OS_GLYPHS, logoSVG: OS_LOGO,
  pinned: ['phone', 'playbook', 'nosy'],   // taskbar apps shown even when closed (push your app id to pin it)
  badges: new Map(), attn: new Set(), sel: null, bootKey: null, ringFor: null, wallId: null, st: null,

  build() {
    const el = $('#os');
    el.append(
      h('div', { id: 'os-wall' }),
      h('div', { id: 'os-icons' }),
      h('div', { id: 'os-wins' }),
      h('div', { id: 'os-modal' }),
      h('div', { id: 'os-fx' }),
      h('div', { id: 'powermenu', class: 'hidden' }),
      h('div', { id: 'os-ctx', class: 'hidden' }),
      h('div', { id: 'taskbar' },
        h('button', { id: 'tb-power', class: 'tbtn', title: 'Start: stand up, settings, quit', onclick: () => OS.power() }, h('i', { class: 'tile', html: this.glyph('power') })),
        h('div', { id: 'tb-run' }),
        h('div', { id: 'tb-tray' },
          h('div', { id: 'tb-wallet', title: 'Your Bonk Pay wallet: half of every scam you close' }, h('i', { html: this.glyph('card') }), h('span')),
          h('div', { id: 'tb-stats' }), h('div', { id: 'tb-clock' }),
          h('button', { id: 'tb-desk', title: 'Show desktop', onclick: () => this.showDesktop() }))),
      h('div', { id: 'os-boot', class: 'hidden' },
        h('div', { class: 'bootin' }, h('div', { class: 'glow' }), h('div', { html: OS_LOGO }),
          h('div', { class: 'word' }, 'Legit', h('span', {}, 'OS')),
          h('div', { class: 'bar' }, h('i')),
          h('div', { class: 'msg' })),
        h('div', { class: 'copy' }, '© Totally Legit Inc. · Definitely not malware'))
    );
    const st = this.st = {};
    $('#tb-stats').append(
      h('div', {}, st.per = h('span', { class: 'g' })),
      h('div', {}, st.team = h('span', { class: 'g' }), st.sl = h('span', { class: 'w' }, ' / '), st.quota = h('span', { class: 'q' })),
      h('div', {}, st.rev = h('span', { class: 'r' })));
    $('#tb-clock').append(st.time = h('div', { class: 'tm' }), st.date = h('div', { class: 'dt' }));
    st.wal = $('#tb-wallet span');
    el.addEventListener('pointerdown', e => {
      if (!e.target.closest('#powermenu') && !e.target.closest('#tb-power')) this.power(false);
      if (!e.target.closest('#os-ctx')) this.ctx(false);
      if (e.target.id === 'os-wall' || e.target.closest('#os-wall') || e.target.id === 'os-icons') this.select(null);
    });
    el.addEventListener('contextmenu', e => { if (e.target.closest('#os-wall') || e.target.id === 'os-icons') { e.preventDefault(); this.ctx(true, e.clientX, e.clientY); } });
    this.rescale(); window.addEventListener('resize', () => { this.rescale(); this.fit(); });
    Bus.on('call:ring', () => this.ringSync());
    Bus.on('call:answer', () => this.ringSync());
  },
  power(on) {
    const m = $('#powermenu'); if (!m) return;
    const show = on === undefined ? m.classList.contains('hidden') : !!on;
    if (show) this.renderPower();
    m.classList.toggle('hidden', !show); $('#tb-power').classList.toggle('active', show);
  },
  renderPower() {
    const item = (g, col, label, sub, fn, cls) => h('button', { class: 'pm-item ' + (cls || ''), onclick: () => { this.power(false); SFX.click(); fn(); } },
      h('i', { class: 'ti', style: { background: col }, html: this.glyph(g) }), h('span', {}, h('b', {}, label), h('small', {}, sub)));
    const nm = (settings.name || 'Agent').trim() || 'Agent';
    $('#powermenu').replaceChildren(
      h('div', { class: 'pm-head' }, h('div', { class: 'pm-av', style: { background: settings.color } }, nm.charAt(0).toUpperCase()),
        h('div', {}, h('b', {}, nm), h('small', {}, 'Agent · Desk ' + (P.seat >= 0 ? P.seat + 1 : '—') + ' · Totally Legit Inc.'))),
      h('div', { class: 'pm-list' },
        item('door', '#2f7cf6', 'Stand up', 'Leave the desk and walk around', () => standUp()),
        this.apps.wallpapers ? item('image', '#7048e8', 'Wallpapers', 'Make this desk feel like a holiday', () => this.launch('wallpapers')) : null,
        item('gear', '#5f6b7d', 'Settings', 'Sound, controls, AI callers', () => UI.openSettings()),
        item('power', '#e5383b', 'Quit to main menu', 'Progress is saved at the end of each day', () => Game.confirmQuit(), 'quit')),
      h('div', { class: 'pm-foot' }, h('span', { html: this.glyph('shield') }), 'LegitOS 4.20 · Genuine. Probably.'));
  },
  ctx(on, x, y) {
    const m = $('#os-ctx'); if (!m) return;
    if (!on) { m.classList.add('hidden'); return; }
    const item = (label, fn) => h('button', { onclick: () => { this.ctx(false); fn(); } }, label);
    m.replaceChildren(
      this.apps.wallpapers ? item('Change wallpaper…', () => this.launch('wallpapers')) : null,
      item('Refresh', () => { SFX.click(); this.buildIcons(); }),
      item('Show desktop', () => this.showDesktop()),
      h('hr'), item('Stand up', () => standUp()));
    m.classList.remove('hidden');
    const r = $('#os').getBoundingClientRect();
    m.style.left = Math.min(x, r.width - m.offsetWidth - 4) + 'px'; m.style.top = Math.min(y, r.height - m.offsetHeight - 4) + 'px';
  },

  show() {
    this.open = true; $('#os').classList.remove('hidden'); $('#hud').classList.add('hidden');
    this.boot();
    this.buildIcons(); this.taskbar(); this.stats();
    if (!this.wins.has('phone')) this.launch('phone', true);
    if (this.memoDay !== G.day + '|' + G.mode && G.phase !== 'lobby') { this.memoDay = G.day + '|' + G.mode; this.close('memo', true); this.launch('memo', true); }
    this.refresh();
  },
  hide() {
    this.open = false; $('#os').classList.add('hidden'); if (G.phase !== 'menu') $('#hud').classList.remove('hidden');
    this.power(false); this.ctx(false); this.ringFor = null; $('#os-modal').replaceChildren();
    clearTimeout(this.bootT); $('#os-boot').classList.add('hidden');
  },
  reset() {
    for (const id of [...this.wins.keys()]) this.close(id, true);
    $$('#os-wins .popup').forEach(p => p.remove()); this.popups = 0; this.memoDay = -1; this.bootKey = null; this.sel = null;
    $('#os-fx').replaceChildren(); $('#os-modal').replaceChildren(); this.ringFor = null;
  },

  /* ----- boot screen: full the first time you sit down in a shift, quick after that ----- */
  boot() {
    const key = G.mode + '|' + G.slot + '|' + G.day, quick = this.bootKey === key, b = $('#os-boot'), dur = quick ? 300 : 1200;
    this.bootKey = key; clearTimeout(this.bootT);
    b.classList.remove('hidden', 'out', 'quick'); if (quick) b.classList.add('quick');
    b.style.setProperty('--bt', dur + 'ms');
    $('.msg', b).textContent = quick ? 'Welcome back, ' + settings.name : pick(['Loading quota…', 'Polishing scripts…', 'Untangling phone cords…', 'Calibrating sincerity…', 'Installing ethics… skipped']);
    const i = $('.bar i', b); i.style.animation = 'none'; void i.offsetWidth; i.style.animation = '';
    const lg = $('.bootin', b); lg.style.animation = 'none'; void lg.offsetWidth; lg.style.animation = '';
    if (!quick && typeof AudioSys !== 'undefined') { [523, 659, 784, 1047].forEach((f, k) => AudioSys.tone(f, 0.35, 'sine', 0.07, 0.25 + k * 0.11)); }
    // paint the wallpaper while the boot screen covers the desktop (the bar animates on the compositor)
    requestAnimationFrame(() => setTimeout(() => { if (this.open) this.setWallpaper(settings.wallpaper); }, 30));
    this.bootT = setTimeout(() => { b.classList.add('out'); this.bootT = setTimeout(() => b.classList.add('hidden'), 400); }, dur);
  },
  /* wallpaper: drawn by apps/wallpapers.js (Wallpapers.render returns a canvas or svg element) */
  setWallpaper(id) {
    const wall = $('#os-wall'); if (!wall || typeof Wallpapers === 'undefined') return;
    const key = Wallpapers.has(id) ? id : Wallpapers.def;
    if (this.wallId === key && wall.firstChild) return;
    try { wall.replaceChildren(Wallpapers.render(key)); this.wallId = key; } catch (e) { console.error('wallpaper failed', e); }
  },

  /* ----- icons ----- */
  glyph(name) { const g = OS_GLYPHS[name]; return g ? '<svg viewBox="0 0 24 24" aria-hidden="true">' + g + '</svg>' : ''; },
  iconHTML(d) {
    const ic = d && d.icon;
    if (typeof ic === 'string') { if (OS_GLYPHS[ic]) return this.glyph(ic); if (ic.trim().startsWith('<svg')) return ic; }
    const g = d && OS_EMOJI_GLYPH[d.emoji]; if (g) return this.glyph(g);
    return '<span class="emo">' + String((d && (d.emoji || ic)) || '?').replace(/[<>&"]/g, '') + '</span>';
  },
  /* a coloured rounded-square tile with the app's glyph: OS.tile(def, 'class') */
  tile(d, cls) { return h('i', { class: cls || 'tile', style: { backgroundColor: (d && d.color) || '#5f6b7d' }, html: this.iconHTML(d) }); },
  badgeEl(id) { const b = this.badges.get(id); return b ? h('b', { class: 'badge' }, b) : null; },
  /* red notification badge on an app's desktop icon and taskbar button: OS.badge('shop', true | 3 | '!' | false) */
  badge(id, on) {
    if (on || on === 0) this.badges.set(id, on === true ? '!' : String(on)); else this.badges.delete(id);
    if (this.open) { this.buildIcons(); this.taskbar(); }
  },
  /* make an app's taskbar button blink for attention (the phone does this by itself while ringing) */
  attention(id, on) { if (on) this.attn.add(id); else this.attn.delete(id); this.taskbar(); },
  desktopIds() {
    return Object.keys(this.apps).filter(id => { const d = this.apps[id]; return d.desktop && (!d.available || d.available()); })
      .sort((a, b) => (this.apps[a].order || 50) - (this.apps[b].order || 50))
      .concat(Game.unlocked().map(s => 'sch_' + s.id)).filter(id => this.apps[id]);
  },
  buildIcons() {
    /* every app with desktop: true shows an icon, ordered by `order`, unless its available() says no; then the unlocked schemes */
    const box = $('#os-icons'); if (!box) return;
    box.replaceChildren(...this.desktopIds().map(id => {
      const d = this.apps[id];
      const b = h('button', { class: 'icon' + (this.wins.has(id) ? ' open' : '') + (this.sel === id ? ' sel' : ''), title: d.title, onclick: () => { this.select(id); this.launch(id); } },
        h('span', { class: 'tw' }, this.tile(d, 'tile'), this.badgeEl(id)), h('span', { class: 'lbl' }, d.title));
      b.dataset.id = id; return b;
    }));
  },
  select(id) { this.sel = id; $$('#os-icons .icon').forEach(e => e.classList.toggle('sel', e.dataset.id === id)); },

  /* ----- windows ----- */
  launch(id, quiet) {
    const def = this.apps[id]; if (!def) return null;
    if (!quiet) SFX.open();
    if (def.direct) { def.direct(); return null; }
    let w = this.wins.get(id);
    if (w) { w.el.classList.remove('min'); this.focus(w); this.taskbar(); return w; }
    const el = h('div', { class: 'win ' + (def.cls || ''), style: { width: (def.w || 380) + 'px', height: def.h ? def.h + 'px' : 'auto' } });
    el.dataset.app = id;
    const maxBtn = h('button', { class: 'wbtn', title: 'Maximise', html: OS_WIN_BTN.max, onclick: e => { e.stopPropagation(); this.maximise(id); } });
    const tb = h('div', { class: 'tb', ondblclick: e => { if (!e.target.closest('button')) this.maximise(id); } },
      this.tile(def, 'ti'), h('span', { class: 't' }, def.title),
      h('button', { class: 'wbtn', title: 'Minimise', html: OS_WIN_BTN.min, onclick: e => { e.stopPropagation(); this.minimise(id); } }), maxBtn,
      h('button', { class: 'wbtn x', title: 'Close', html: OS_WIN_BTN.x, onclick: e => { e.stopPropagation(); SFX.click(); this.close(id); } }));
    const body = h('div', { class: 'wb' }); el.append(tb, body); $('#os-wins').append(el);
    w = { id, el, body, def, tb, maxBtn }; this.wins.set(id, w);
    const area = this.area(), n = this.wins.size;
    const x = def.x != null ? def.x * area.width : 110 + ((n * 36) % 280), y = def.y != null ? def.y * area.height : 24 + ((n * 30) % 170);
    el.style.left = x + 'px'; el.style.top = y + 'px';
    this.drag(w, tb); el.addEventListener('pointerdown', () => this.focus(w));
    def.render(body, w); this.clampWin(w); this.focus(w); this.taskbar(); return w;
  },
  close(id, instant) {
    const w = this.wins.get(id); if (!w) return;
    this.wins.delete(id);
    if (w.def.onClose) w.def.onClose(w);
    if (!instant && this.open && !w.el.classList.contains('min')) { w.el.classList.add('closing'); setTimeout(() => w.el.remove(), 150); } else w.el.remove();
    if (this.sel === id) this.sel = null;
    this.taskbar();
  },
  minimise(id) { const w = this.wins.get(id); if (!w) return; w.el.classList.add('min'); w.el.classList.remove('focus'); const t = this.topWin(); if (t) this.focus(t); this.taskbar(); },
  maximise(id) {
    const w = this.wins.get(id); if (!w) return;
    const on = w.el.classList.toggle('max'); w.maxBtn.innerHTML = on ? OS_WIN_BTN.restore : OS_WIN_BTN.max; w.maxBtn.title = on ? 'Restore' : 'Maximise';
    this.focus(w);
  },
  showDesktop() {
    const vis = [...this.wins.values()].filter(w => !w.el.classList.contains('min'));
    if (vis.length) { vis.forEach(w => w.el.classList.add('min')); this._hidden = vis.map(w => w.id); }
    else { (this._hidden || []).forEach(id => { const w = this.wins.get(id); if (w) w.el.classList.remove('min'); }); this._hidden = null; const t = this.topWin(); if (t) this.focus(t); }
    this.taskbar();
  },
  topWin() { let best = null; for (const w of this.wins.values()) if (!w.el.classList.contains('min') && (!best || +w.el.style.zIndex > +best.el.style.zIndex)) best = w; return best; },
  focus(w) {
    if (!w) return;
    if (+w.el.style.zIndex !== this.z || !w.el.classList.contains('focus')) {
      if (this.z > 4000) { this.z = 20; [...this.wins.values()].sort((a, b) => a.el.style.zIndex - b.el.style.zIndex).forEach(o => { o.el.style.zIndex = ++this.z; }); }
      w.el.style.zIndex = ++this.z;
      for (const o of this.wins.values()) o.el.classList.toggle('focus', o === w);
      this.taskbar();
    }
  },
  /* windows, pop-ups and the call card are laid out at 720p and scaled to the screen (OS.ws), so every resolution looks the same */
  ws: 1,
  rescale() { this.ws = clamp(innerHeight / 720, 0.75, 2.5); const o = $('#os'); if (o) o.style.setProperty('--ws', this.ws); },
  area() { const a = $('#os-wins'); return a ? { width: a.offsetWidth, height: a.offsetHeight } : { width: innerWidth, height: innerHeight }; },
  clampWin(w) {
    const a = this.area(), el = w.el, ww = el.offsetWidth, wh = el.offsetHeight;
    el.style.left = clamp(el.offsetLeft, 4, Math.max(4, a.width - ww - 4)) + 'px';
    el.style.top = clamp(el.offsetTop, 4, Math.max(4, a.height - wh - 4)) + 'px';
  },
  fit() {
    if (!this.open) return; const a = this.area();
    for (const w of this.wins.values()) { const el = w.el; el.style.left = clamp(el.offsetLeft, -el.offsetWidth + 90, a.width - 90) + 'px'; el.style.top = clamp(el.offsetTop, 0, Math.max(0, a.height - 40)) + 'px'; }
  },
  drag(w, tb) {
    let sx, sy, ox, oy, on = false;
    tb.addEventListener('pointerdown', e => { if (e.target.closest('button') || w.el.classList.contains('max') || e.button !== 0) return; on = true; sx = e.clientX; sy = e.clientY; ox = w.el.offsetLeft; oy = w.el.offsetTop; w.el.classList.add('drag'); try { tb.setPointerCapture(e.pointerId); } catch (_) {} });
    tb.addEventListener('pointermove', e => {
      if (!on) return; const a = this.area();
      w.el.style.left = clamp(ox + (e.clientX - sx) / this.ws, -w.el.offsetWidth + 90, a.width - 90) + 'px';
      w.el.style.top = clamp(oy + (e.clientY - sy) / this.ws, 0, Math.max(0, a.height - 40)) + 'px';
    });
    const end = () => { on = false; w.el.classList.remove('drag'); }; tb.addEventListener('pointerup', end); tb.addEventListener('pointercancel', end);
  },
  /* re-render the contents of every open window that depends on the call */
  refresh() { if (!this.open) return; for (const w of this.wins.values()) if (w.def.refresh) w.def.refresh(w.body, w); this.ringSync(); this.taskbar(); },

  /* ----- incoming call card (Phone keeps its own buttons too) ----- */
  ringSync() {
    const m = $('#os-modal'); if (!m) return;
    const c = this.open && Call.state === 'ringing' ? Call.cur : null;
    if (c === this.ringFor) return;
    this.ringFor = c;
    if (!c) { $$('.ringcard', m).forEach(o => { o.classList.add('out'); setTimeout(() => o.remove(), 200); }); return; }
    m.replaceChildren(h('div', { class: 'ringcard' },
      h('div', { class: 'pic' }, h('span', { class: 'pulse' }), h('span', { class: 'pulse p2' }), h('div', { class: 'face', html: portraitSVG(c.caller, 'neutral', false) })),
      h('div', { class: 'nm' }, c.caller.name),
      h('div', { class: 'sub' }, 'Incoming Call', h('span', { class: 'dots' }, h('i', {}, '.'), h('i', {}, '.'), h('i', {}, '.'))),
      c.flag ? h('div', { class: 'flag', html: this.glyph('warning') + '<span>Bait Detector: smells like a scambaiter</span>' }) : null,
      h('div', { class: 'btns' },
        h('button', { class: 'rb no', title: 'Decline', html: this.glyph('x'), onclick: () => { SFX.click(); Call.decline(); } }),
        h('button', { class: 'rb yes', title: 'Answer', html: this.glyph('phone'), onclick: () => { Call.answer(); this.launch('phone', true); } }))));
  },

  /* ----- taskbar ----- */
  taskbar() {
    const run = $('#tb-run'); if (!run) return;
    const ok = id => { const d = this.apps[id]; return d && (!d.available || d.available()); };
    const pinned = this.pinned.filter(ok), ids = pinned.concat([...this.wins.keys()].filter(i => !pinned.includes(i))), top = this.topWin();
    run.replaceChildren(...ids.map(id => {
      const d = this.apps[id], w = this.wins.get(id); if (!d) return null;
      const alert = this.attn.has(id) || (id === 'phone' && Call.state === 'ringing');
      const b = h('button', { class: 'tbtn' + (w ? ' open' : '') + (w && w === top ? ' active' : '') + (alert ? ' alert' : ''), title: d.title,
        onclick: () => { if (w && w === this.topWin()) this.minimise(id); else this.launch(id); } }, this.tile(d, 'tile'), this.badgeEl(id));
      b.dataset.id = id; return b;
    }).filter(Boolean));
    $$('#os-icons .icon').forEach(e => e.classList.toggle('open', this.wins.has(e.dataset.id)));
  },
  stats() {
    const s = this.st; if (!s) return;
    const set = (e, t, cls) => { if (e.textContent !== t) e.textContent = t; if (cls != null && e.className !== cls) e.className = cls; };
    set(s.per, 'Personal ' + money(G.personal)); set(s.wal, money(G.wallet));
    set(s.team, 'Team ' + money(G.team));
    const week = G.mode === 'week';
    s.sl.hidden = s.quota.hidden = !week;
    if (week) {
      set(s.quota, 'Quota ' + money(G.quota));
      if (G.phase === 'day') set(s.rev, 'Performance review ' + fmtTime(G.timeLeft), 'r' + (G.timeLeft <= 30 ? ' hurry' : ''));
      else if (G.phase === 'lobby') set(s.rev, 'Shift not started', 'q');
      else set(s.rev, 'Performance review now', 'r hurry');
    } else set(s.rev, G.phase === 'lobby' ? 'Shift not started' : 'Overtime', G.phase === 'lobby' ? 'q' : 'o');
    const [t, d] = this.clock(); set(s.time, t); set(s.date, d);
  },
  /* in-game clock: the shift runs 4 PM to midnight; day 1 is Monday, Aug 24, 2026. Endless uses the real clock. */
  clock() {
    const f12 = (hr, m) => ((hr + 11) % 12 + 1) + ':' + String(m).padStart(2, '0') + (hr >= 12 ? ' PM' : ' AM');
    const fd = d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()] + ', ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
    if (G.mode !== 'week') { const d = new Date(); return [f12(d.getHours(), d.getMinutes()), fd(d)]; }
    const f = G.phase === 'day' ? clamp(1 - G.timeLeft / Math.max(1, G.dayLen), 0, 1) : G.phase === 'lobby' ? -0.01 : 1;
    const mins = Math.floor(16 * 60 + f * 8 * 60), day = Math.max(1, G.day || 1);
    return [f12(Math.floor(mins / 60) % 24, mins % 60), fd(new Date(2026, 7, 24 + Math.floor((day - 1) / 5) * 7 + (day - 1) % 5))];
  },

  /* ----- big money pop-up: OS.cashFx('+$250') / OS.cashFx('BAITED', true) ----- */
  cashFx(text, bad) {
    const fx = $('#os-fx'); if (!fx) return;
    const sp = [];
    for (let i = 0; i < 12; i++) sp.push(h('i', { class: 'sp' + (i % 3 ? '' : ' big'), style: '--a:' + Math.round(i * 30 + rand(-10, 10)) + 'deg;--d:' + rand(15, 27).toFixed(1) + 'vh;animation-delay:' + rand(0.05, 0.18).toFixed(2) + 's' }));
    const off = fx.children.length ? 'margin-top:' + (fx.children.length * 7) + 'vh' : '';
    const e = h('div', { class: 'cashfx' + (bad ? ' bad' : ''), style: off }, h('div', { class: 'glow' }), ...sp,
      h('span', { class: 'o1' }, text), h('span', { class: 'o2' }, text), h('span', { class: 'f' }, text), h('span', { class: 'shine' }, text));
    fx.append(e); setTimeout(() => e.remove(), 1800);
  },

  /* ----- fake alert pop-ups: OS.popup() or OS.popup({ title, head, text, icon, color, ok, bar }) ----- */
  POPS: [
    { title: 'System Alert', head: 'Your computer has 47 feelings', text: 'Remove feelings now? This cannot be undone.', icon: 'warning', color: '#f08c00', ok: 'Remove' },
    { title: 'Congratulations!!!', head: 'You are the 1,000,000th employee!', text: 'Click OK to claim absolutely nothing.', icon: 'trophy', color: '#f59f00', ok: 'Claim', flash: true },
    { title: 'Desk Upgrade', head: 'FREE desk upgrade', text: 'Your desk has been upgraded to: same desk.', icon: 'gift', color: '#e8590c', ok: 'Wow' },
    { title: 'Singles Nearby', head: 'Hot staplers in your area', text: 'They want to meet you. They are lonely. They are staplers.', icon: 'heart', color: '#e64980', ok: 'Meet them' },
    { title: 'Warning', head: 'A scambaiter is laughing at you', text: 'Right now. Out loud. With friends.', icon: 'smile', color: '#d6342c', ok: 'Rude', flash: true },
    { title: 'Downloader 3000', head: 'Downloading more quota…', text: 'Estimated time remaining: forever.', icon: 'download', color: '#1c7ed6', ok: 'Wait', bar: true },
    { title: 'You Won!', head: 'Congratulations, you won a virus!', text: 'It is shiny. It is yours. It is already installed.', icon: 'virus', color: '#2f9e44', ok: 'Yay', flash: true },
    { title: 'Chatterbox Gold', head: 'FREE Chatterbox Gold!!', text: 'One month of premium chatting. Click to claim, obviously.', icon: 'chat', color: '#7048e8', ok: 'Claim' },
    { title: 'RAM Doubler Pro', head: 'Download more RAM', text: 'Your RAM is lonely. Give it a friend.', icon: 'monitor', color: '#0c8599', ok: 'Download', bar: true },
    { title: 'Bonk Pay', head: 'Your account is too happy', text: 'Please verify your sadness to continue.', icon: 'card', color: '#1971c2', ok: 'Verify' },
    { title: 'HR Reminder', head: 'Mandatory fun in 5 minutes', text: 'Attendance is tracked. Fun is measured.', icon: 'calendar', color: '#5f3dc4', ok: 'Sigh' },
    { title: 'Critical Error', head: 'Error: everything is fine', text: 'Nothing is wrong. That is what is wrong.', icon: 'skull', color: '#c92a2a', ok: 'OK', flash: true }
  ],
  popup(o) {
    const m = Object.assign({}, pick(this.POPS), o || {}), area = this.area(), W = 330;
    const closeIt = more => { if (!el.isConnected) return; el.remove(); this.popups--; SFX.click(); if (more && Math.random() < 0.3) this.popup(); };
    const el = h('div', { class: 'win popup focus' + (m.flash ? ' flash' : ''), style: { width: W + 'px', left: rand(10, Math.max(20, area.width - W - 10)) + 'px', top: rand(10, Math.max(20, area.height - 230)) + 'px', zIndex: 8000 + (++this.popN % 900) } },
      h('div', { class: 'tb' }, h('i', { class: 'ti', style: { background: m.color }, html: this.glyph('warning') }), h('span', { class: 't' }, m.title),
        h('button', { class: 'wbtn x', title: 'Close', html: OS_WIN_BTN.x, onclick: () => closeIt(false) })),
      h('div', { class: 'pb' },
        h('i', { class: 'pic', style: { background: m.color }, html: this.glyph(OS_GLYPHS[m.icon] ? m.icon : 'warning') }),
        h('div', { class: 'ptx' }, h('b', {}, m.head), h('span', {}, m.text), m.bar ? h('div', { class: 'pbar' }, h('i')) : null)),
      h('div', { class: 'pbtns' },
        h('button', { class: 'pbtn', onclick: () => closeIt(true) }, 'Cancel'),
        h('button', { class: 'pbtn go', style: { background: m.color }, onclick: () => closeIt(true) }, m.ok || 'OK')));
    el.addEventListener('pointerdown', () => { el.style.zIndex = 8000 + (++this.popN % 900); });
    $('#os-wins').append(el); this.popups++; SFX.popup();
    return el;
  },
  virus(n) { for (let i = 0; i < n; i++) setTimeout(() => { if (G.phase !== 'menu') this.popup(); }, i * 170); }
};
