'use strict';
/* =====================================================================
   OFFICE — furniture, props, rooms, desk screens, leaderboard, projector,
   wall fans, clock, sunbeams, colour grade and the menu camera.
   Loaded after world.js; buildOffice() runs inside buildWorld().
   Public API: docs/modules/office.md
   ===================================================================== */

/* ---------- picture art (texture atlas cells) ---------- */
const ART = {};
function officeArt() {
  const A = (w, hh, f) => Atlas.cell(w, hh, f);
  const posterDef = [
    ['SYNERGY', 'It\'s a real word. Probably.', '#2f6fd6', 'venn'], ['HUSTLE', 'The phones won\'t answer themselves.', '#d6342c', 'phone'],
    ['TEAMWORK', 'Someone else will do it.', '#25a35a', 'team'], ['QUOTA', 'It\'s not a suggestion.', '#f08a1c', 'chart'],
    ['HANG IN THERE', '...until 5 PM.', '#7b4bd1', 'cat'], ['BELIEVE', 'In the quota.', '#159a9a', 'peak']
  ];
  ART.posters = posterDef.map(p => A(256, 352, (g, w, hh) => drawPoster(g, w, hh, p)));
  ART.boss = A(192, 240, (g, w, hh) => {
    g.fillStyle = '#6b4a2a'; g.fillRect(0, 0, w, hh); g.fillStyle = '#d9b56a'; g.fillRect(8, 8, w - 16, hh - 16); g.fillStyle = '#20314f'; g.fillRect(16, 16, w - 32, hh - 70);
    const cx = w / 2, cy = 92; g.fillStyle = '#f4f4f4'; g.fillRect(cx - 44, cy + 34, 88, 60); g.fillStyle = '#c0261f'; g.beginPath(); g.moveTo(cx - 7, cy + 36); g.lineTo(cx + 7, cy + 36); g.lineTo(cx + 4, cy + 80); g.lineTo(cx - 4, cy + 80); g.fill();
    g.fillStyle = '#e9b98f'; rrect(g, cx - 36, cy - 44, 72, 80, 26); g.fill(); g.fillStyle = '#9a9a9a'; rrect(g, cx - 38, cy - 50, 76, 24, 12); g.fill();
    g.fillStyle = '#222'; g.fillRect(cx - 20, cy - 12, 10, 12); g.fillRect(cx + 10, cy - 12, 10, 12); g.fillStyle = '#6a6a6a'; rrect(g, cx - 20, cy + 6, 40, 9, 4); g.fill();
    g.fillStyle = '#20314f'; g.font = '19px ' + FONT.slab; g.textAlign = 'center'; g.fillText('EMPLOYEE OF', cx, hh - 34); g.fillText('EVERY MONTH', cx, hh - 14);
  });
  ART.exit = A(160, 64, (g, w, hh) => { g.fillStyle = '#0d2a16'; g.fillRect(0, 0, w, hh); g.fillStyle = '#3dff7a'; g.font = '40px ' + FONT.chunky; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('EXIT', w / 2 - 12, hh / 2 + 2); g.beginPath(); g.moveTo(w - 30, 22); g.lineTo(w - 14, 32); g.lineTo(w - 30, 42); g.fill(); });
  ART.logo = A(640, 160, (g, w, hh) => {
    const gr = g.createLinearGradient(0, 0, 0, hh); gr.addColorStop(0, '#3a2618'); gr.addColorStop(1, '#22160e'); g.fillStyle = gr; rrect(g, 0, 0, w, hh, 18); g.fill();
    g.strokeStyle = '#c99a45'; g.lineWidth = 5; rrect(g, 9, 9, w - 18, hh - 18, 12); g.stroke();
    drawEmblem(g, 78, hh / 2, 50); g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    g.fillStyle = '#f2cf7a'; g.font = '62px ' + FONT.slab; g.fillText('TOTALLY LEGIT INC.', 142, 94, 470);
    g.fillStyle = '#d9c3a0'; g.font = '700 24px ' + FONT.menu; g.fillText('Customer Excellence Center  •  est. last Tuesday', 146, 130, 460);
  });
  ART.restroom = A(256, 128, (g, w, hh) => {
    g.fillStyle = '#1f4f7a'; rrect(g, 0, 0, w, hh, 12); g.fill(); g.fillStyle = '#fff'; g.font = '40px ' + FONT.chunky; g.textAlign = 'center'; g.fillText('RESTROOM', w / 2, 56);
    g.save(); g.translate(w / 2, 92); g.rotate(-0.08); g.fillStyle = '#ffd400'; g.fillRect(-120, -18, 240, 36); g.fillStyle = '#111'; for (let x = -120; x < 120; x += 24) { g.beginPath(); g.moveTo(x, -18); g.lineTo(x + 12, -18); g.lineTo(x + 2, 18); g.lineTo(x - 10, 18); g.fill(); }
    g.fillStyle = '#ffd400'; g.fillRect(-92, -13, 184, 26); g.fillStyle = '#c00'; g.font = '24px ' + FONT.chunky; g.fillText('OUT OF ORDER', 0, 9); g.restore();
  });
  ART.cork = A(512, 300, drawCork);
  ART.calendar = A(128, 170, (g, w, hh) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, hh); g.fillStyle = '#d6342c'; g.fillRect(0, 0, w, 38); g.fillStyle = '#fff'; g.font = '22px ' + FONT.chunky; g.textAlign = 'center'; g.fillText('OCTOBER', w / 2, 27);
    g.fillStyle = '#444'; g.font = '11px ' + FONT.ui; for (let i = 0; i < 31; i++) { const x = 10 + (i % 7) * 16, y = 56 + Math.floor(i / 7) * 22; g.fillText(i + 1, x + 6, y); if (i < 3) wobble(g, [[x - 2, y - 12], [x + 14, y + 4]], '#d33', 2, i); }
    g.strokeStyle = '#d33'; g.lineWidth = 2; g.beginPath(); g.arc(10 + 4 * 16 + 6, 56 + 2 * 22 - 4, 9, 0, 7); g.stroke();
  });
  ART.vendCola = A(240, 520, (g, w, hh) => drawVending(g, w, hh, 'BONK COLA', '#c81e1e', ['#d6342c', '#2f6fd6', '#f5b400', '#25a35a', '#f2f2f2', '#7b4bd1'], 'can'));
  ART.vendSnax = A(240, 520, (g, w, hh) => drawVending(g, w, hh, 'SNAX', '#1e5bc8', ['#f08a1c', '#e83e8c', '#25a35a', '#ffd23f', '#8b5a2b', '#00a6c8'], 'bag'));
  ART.copier = A(160, 72, (g, w, hh) => { g.fillStyle = '#5b5e66'; g.fillRect(0, 0, w, hh); g.fillStyle = '#9fe8c0'; rrect(g, 8, 8, 64, 30, 4); g.fill(); g.fillStyle = '#134'; g.font = '700 12px ' + FONT.ui; g.fillText('PAPER JAM', 12, 28); for (let i = 0; i < 9; i++) { g.fillStyle = '#e8e8e8'; rrect(g, 84 + (i % 3) * 24, 8 + Math.floor(i / 3) * 19, 18, 13, 3); g.fill(); } g.fillStyle = '#2bbf4f'; g.beginPath(); g.arc(40, 56, 9, 0, 7); g.fill(); g.fillStyle = '#d33'; g.beginPath(); g.arc(18, 56, 6, 0, 7); g.fill(); });
  ART.micro = A(160, 96, (g, w, hh) => { g.fillStyle = '#e9e7e1'; g.fillRect(0, 0, w, hh); g.fillStyle = '#20232a'; rrect(g, 8, 10, 104, 76, 6); g.fill(); g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.moveTo(14, 16); g.lineTo(60, 16); g.lineTo(30, 80); g.lineTo(14, 80); g.fill(); g.fillStyle = '#1a1a1a'; g.fillRect(120, 12, 32, 16); g.fillStyle = '#5f5'; g.font = '700 12px monospace'; g.fillText('12:00', 121, 25); for (let i = 0; i < 9; i++) { g.fillStyle = '#bbb'; g.fillRect(122 + (i % 3) * 10, 36 + Math.floor(i / 3) * 10, 7, 6); } g.fillStyle = '#999'; g.fillRect(118, 70, 36, 14); });
  ART.coffee = A(96, 128, (g, w, hh) => { g.fillStyle = '#26272c'; g.fillRect(0, 0, w, hh); g.fillStyle = '#c8a46a'; g.font = '18px ' + FONT.chunky; g.textAlign = 'center'; g.fillText('BONK', w / 2, 30); g.fillText('BREW', w / 2, 50); g.fillStyle = '#e33'; g.beginPath(); g.arc(30, 76, 6, 0, 7); g.fill(); g.fillStyle = '#3c3'; g.beginPath(); g.arc(66, 76, 6, 0, 7); g.fill(); g.fillStyle = '#666'; g.fillRect(20, 96, 56, 8); });
  ART.fridgeArt = [0, 1].map(k => A(128, 128, (g, w, hh) => {
    g.fillStyle = '#fbfbf7'; g.fillRect(0, 0, w, hh);
    if (k === 0) { g.fillStyle = '#7ec8ff'; g.fillRect(0, 0, w, 70); g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(100, 24, 14, 0, 7); g.fill(); g.fillStyle = '#d6342c'; g.beginPath(); g.moveTo(30, 60); g.lineTo(60, 34); g.lineTo(90, 60); g.fill(); g.fillStyle = '#c98a3a'; g.fillRect(36, 60, 48, 36); g.fillStyle = '#5a3'; g.fillRect(0, 96, w, 32); scrawl(g, 'WORK', 64, 122, 18, '#123', { align: 'center' }); }
    else { scrawl(g, 'DO NOT EAT', 64, 34, 20, '#c00', { align: 'center' }); scrawl(g, 'MY LUNCH', 64, 62, 20, '#c00', { align: 'center' }); scrawl(g, '- Gary', 80, 100, 18, '#223', { align: 'center' }); }
  }));
  ART.books = A(256, 128, (g, w, hh) => { const r = rng(9); let x = 0; while (x < w) { const bw = 10 + r() * 14, bh = hh * (0.7 + r() * 0.3); g.fillStyle = ['#7a2424', '#24467a', '#2a6a3a', '#c9a24a', '#5a3a6a', '#d0c8b0', '#333'][Math.floor(r() * 7)]; g.fillRect(x, hh - bh, bw - 1, bh); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x + 2, hh - bh + 10, bw - 5, 3); g.fillRect(x + 2, hh - 20, bw - 5, 3); x += bw; } });
  ART.cert = A(160, 120, (g, w, hh) => { g.fillStyle = '#fbf3dc'; g.fillRect(0, 0, w, hh); g.strokeStyle = '#b08a3a'; g.lineWidth = 6; g.strokeRect(6, 6, w - 12, hh - 12); g.fillStyle = '#5a3a1a'; g.textAlign = 'center'; g.font = '13px ' + FONT.slab; g.fillText('CERTIFICATE OF', w / 2, 34); g.font = '15px ' + FONT.slab; g.fillText('TOTAL LEGITNESS', w / 2, 56); g.font = 'italic 11px Georgia, serif'; g.fillText('awarded to: The Boss', w / 2, 78); g.fillStyle = '#c8402a'; g.beginPath(); g.arc(w - 34, hh - 30, 12, 0, 7); g.fill(); });
  ART.rug = A(256, 160, (g, w, hh) => { g.fillStyle = '#6e1f22'; g.fillRect(0, 0, w, hh); g.strokeStyle = '#d9b56a'; g.lineWidth = 6; g.strokeRect(10, 10, w - 20, hh - 20); g.lineWidth = 2; g.strokeRect(22, 22, w - 44, hh - 44); g.fillStyle = 'rgba(217,181,106,.5)'; for (let i = 0; i < 5; i++) { g.save(); g.translate(w / 2, hh / 2); g.rotate(i * Math.PI / 5); g.fillRect(-40, -3, 80, 6); g.restore(); } noiseFill(g, w, hh, 1500, 0.1, 2); });
  ART.elevPanel = A(64, 128, (g, w, hh) => { g.fillStyle = '#9aa0a8'; g.fillRect(0, 0, w, hh); g.fillStyle = '#ddd'; g.beginPath(); g.arc(32, 46, 13, 0, 7); g.arc(32, 82, 13, 0, 7); g.fill(); g.fillStyle = '#f80'; g.beginPath(); g.moveTo(32, 38); g.lineTo(40, 50); g.lineTo(24, 50); g.fill(); g.fillStyle = '#555'; g.beginPath(); g.moveTo(32, 90); g.lineTo(40, 78); g.lineTo(24, 78); g.fill(); });
  ART.floorNum = A(96, 48, (g, w, hh) => { g.fillStyle = '#111'; g.fillRect(0, 0, w, hh); g.fillStyle = '#ff5a2a'; g.font = '34px ' + FONT.chunky; g.textAlign = 'center'; g.fillText('4 ▲', w / 2, 38); });
  ART.lobbySign = A(512, 128, (g, w, hh) => { g.fillStyle = '#efe9df'; g.fillRect(0, 0, w, hh); drawEmblem(g, 62, hh / 2, 40); g.fillStyle = '#2b2118'; g.font = '44px ' + FONT.slab; g.fillText('TOTALLY LEGIT INC.', 112, 66, 380); g.fillStyle = '#7a5a3a'; g.font = '700 22px ' + FONT.menu; g.fillText('Suite 404  →  Please knock (loudly)', 116, 100); });
  ART.clock = A(128, 128, (g, w, hh) => { g.fillStyle = '#fbf8f0'; g.beginPath(); g.arc(64, 64, 62, 0, 7); g.fill(); g.fillStyle = '#222'; g.font = '700 14px ' + FONT.ui; g.textAlign = 'center'; g.textBaseline = 'middle'; for (let i = 1; i <= 12; i++) { const a = i * Math.PI / 6; g.fillText(i, 64 + Math.sin(a) * 48, 64 - Math.cos(a) * 48); } g.font = '8px ' + FONT.ui; g.fillText('TOTALLY LEGIT', 64, 88); });
  ART.ext = A(48, 96, (g, w, hh) => { g.fillStyle = '#e8e2d0'; g.fillRect(0, 0, w, hh); g.fillStyle = '#d33'; g.fillRect(0, 0, w, 20); g.fillStyle = '#222'; g.font = '9px ' + FONT.ui; g.fillText('FIRE', 12, 36); g.fillRect(6, 44, 36, 2); g.fillRect(6, 52, 30, 2); g.fillRect(6, 60, 34, 2); });
  ART.extSign = A(128, 64, (g, w, hh) => { g.fillStyle = '#d81e1e'; g.fillRect(0, 0, w, hh); g.fillStyle = '#fff'; g.font = '22px ' + FONT.chunky; g.textAlign = 'center'; g.fillText('FIRE', 78, 30); g.font = '700 13px ' + FONT.menu; g.fillText('EXTINGUISHER', 78, 50); g.fillRect(14, 14, 14, 38); g.fillRect(18, 8, 8, 8); });
  ART.incident = A(256, 160, (g, w, hh) => { g.fillStyle = '#1d6b3a'; g.fillRect(0, 0, w, hh); g.fillStyle = '#fff'; g.font = '700 18px ' + FONT.menu; g.textAlign = 'center'; g.fillText('DAYS SINCE LAST', w / 2, 30); g.fillText('WORKPLACE INCIDENT', w / 2, 52); g.fillStyle = '#fff'; rrect(g, w / 2 - 50, 64, 100, 80, 8); g.fill(); g.fillStyle = '#d33'; g.font = '70px ' + FONT.chunky; g.fillText('0', w / 2, 132); });
  ART.mugSign = A(224, 128, (g, w, hh) => { g.fillStyle = '#fff7d6'; g.fillRect(0, 0, w, hh); g.strokeStyle = '#d33'; g.lineWidth = 6; g.strokeRect(4, 4, w - 8, hh - 8); g.fillStyle = '#d33'; g.font = '28px ' + FONT.chunky; g.textAlign = 'center'; g.fillText('WASH YOUR MUG', w / 2, 46); g.fillStyle = '#333'; g.font = '700 15px ' + FONT.menu; g.fillText('Your mother does not', w / 2, 78); g.fillText('work here. - Management', w / 2, 100); });
  ART.laptop = [0, 1].map(k => A(128, 80, (g, w, hh) => { g.fillStyle = k ? '#1e3a5f' : '#f2f2f2'; g.fillRect(0, 0, w, hh); if (k) { g.fillStyle = '#ffd23f'; g.fillRect(10, 50, 14, 20); g.fillRect(30, 36, 14, 34); g.fillRect(50, 24, 14, 46); g.fillRect(70, 14, 14, 56); g.fillStyle = '#fff'; g.font = '10px ' + FONT.ui; g.fillText('Q3 SYNERGY', 70, 10); } else { g.fillStyle = '#2f6fd6'; g.fillRect(0, 0, w, 12); g.fillStyle = '#ccc'; for (let i = 0; i < 6; i++) g.fillRect(8, 20 + i * 9, 60 + (i * 17) % 50, 4); } }));
  ART.pizza = A(128, 128, (g, w, hh) => { g.fillStyle = '#d8b88a'; g.fillRect(0, 0, w, hh); g.fillStyle = '#c0261f'; g.font = '22px ' + FONT.chunky; g.textAlign = 'center'; g.fillText('PIZZA', w / 2, 56); g.font = '700 12px ' + FONT.menu; g.fillText('hot & legit', w / 2, 76); g.strokeStyle = 'rgba(80,50,20,.4)'; g.lineWidth = 3; g.beginPath(); g.arc(40, 96, 14, 0, 7); g.stroke(); });
  ART.mat = A(256, 128, (g, w, hh) => { g.fillStyle = '#3a2c26'; g.fillRect(0, 0, w, hh); noiseFill(g, w, hh, 2500, 0.18, 2); g.fillStyle = '#c9a26a'; g.font = '30px ' + FONT.chunky; g.textAlign = 'center'; g.fillText('WELCOME', w / 2, 58); g.font = '700 18px ' + FONT.menu; g.fillText('(back to work)', w / 2, 88); });
  ART.peg = A(256, 160, (g, w, hh) => { g.fillStyle = '#c9a77a'; g.fillRect(0, 0, w, hh); g.fillStyle = 'rgba(60,40,20,.45)'; for (let x = 8; x < w; x += 12) for (let y = 8; y < hh; y += 12) { g.beginPath(); g.arc(x, y, 1.6, 0, 7); g.fill(); } g.fillStyle = '#fff'; g.fillRect(30, 30, 80, 60); g.fillStyle = '#2f6fd6'; g.fillRect(38, 70, 10, 14); g.fillRect(54, 58, 10, 26); g.fillRect(70, 44, 10, 40); g.fillStyle = '#d33'; g.fillRect(86, 76, 10, 8); g.fillStyle = '#fff'; g.fillRect(150, 40, 70, 90); scrawl(g, 'GOALS', 185, 66, 18, '#d33', { align: 'center' }); scrawl(g, '1. $$$', 185, 92, 15, '#223', { align: 'center' }); scrawl(g, '2. ???', 185, 114, 15, '#223', { align: 'center' }); });
  ART.nameplate = A(160, 40, (g, w, hh) => { g.fillStyle = '#c9a44a'; g.fillRect(0, 0, w, hh); g.fillStyle = '#2b2118'; g.font = '22px ' + FONT.slab; g.textAlign = 'center'; g.fillText('THE BOSS', w / 2, 29); });
  ART.mugBoss = A(64, 48, (g, w, hh) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, hh); g.fillStyle = '#c0261f'; g.font = '700 11px ' + FONT.menu; g.textAlign = 'center'; g.fillText("WORLD'S", w / 2, 16); g.fillText('BEST', w / 2, 29); g.fillText('BOSS', w / 2, 42); });
  ART.files = A(128, 32, (g, w, hh) => { g.fillStyle = '#f4f0e0'; g.fillRect(0, 0, w, hh); g.strokeStyle = '#999'; g.strokeRect(1, 1, w - 2, hh - 2); scrawl(g, 'NOT SCAMS', w / 2, 22, 15, '#223', { align: 'center' }); });
  ART.board = A(256, 64, (g, w, hh) => { g.fillStyle = '#20232a'; g.fillRect(0, 0, w, hh); g.fillStyle = '#ffd23f'; g.font = '30px ' + FONT.chunky; g.textAlign = 'center'; g.fillText('REVIEW ROOM', w / 2, 43); });
  ART.breakSign = A(256, 64, (g, w, hh) => { g.fillStyle = '#20232a'; g.fillRect(0, 0, w, hh); g.fillStyle = '#9fe8c0'; g.font = '30px ' + FONT.chunky; g.textAlign = 'center'; g.fillText('BREAK ROOM', w / 2, 43); });
  ART.vent = A(96, 96, (g, w, hh) => { g.fillStyle = '#d9d2c4'; g.fillRect(0, 0, w, hh); g.strokeStyle = '#8f8778'; g.lineWidth = 3; g.strokeRect(3, 3, w - 6, hh - 6); for (let i = 0; i < 7; i++) { g.fillStyle = 'rgba(40,35,30,.55)'; g.fillRect(12, 14 + i * 10, w - 24, 5); } g.fillStyle = 'rgba(60,50,40,.18)'; g.fillRect(0, hh - 30, w, 30); });
  ART.stain = A(64, 64, (g, w) => { g.clearRect(0, 0, w, w); g.strokeStyle = 'rgba(110,60,25,.75)'; g.lineWidth = 4; g.beginPath(); g.arc(32, 32, 22, 0.3, 5.9); g.stroke(); g.lineWidth = 2; g.beginPath(); g.arc(34, 30, 19, 2, 4); g.stroke(); });
  ART.box = A(128, 96, (g, w, hh) => { g.fillStyle = '#c49a62'; g.fillRect(0, 0, w, hh); noiseFill(g, w, hh, 600, 0.08, 2); g.fillStyle = '#d8b47a'; g.fillRect(w / 2 - 10, 0, 20, hh); g.fillStyle = '#4a3420'; g.font = '700 13px ' + FONT.menu; g.textAlign = 'center'; g.fillText('TOTALLY LEGIT', w / 2, 46); g.fillText('DOCUMENTS', w / 2, 62); g.strokeStyle = '#a33'; g.lineWidth = 2; g.strokeRect(20, 72, 88, 16); g.fillStyle = '#a33'; g.font = '700 11px ' + FONT.menu; g.fillText('DO NOT SHRED', w / 2, 84); });
  ART.hole = A(64, 64, (g, w) => { g.fillStyle = '#0d0b09'; g.fillRect(0, 0, w, w); g.fillStyle = '#2a241d'; g.fillRect(6, 6, 20, 52); g.strokeStyle = '#555'; g.lineWidth = 2; g.beginPath(); g.moveTo(40, 0); g.bezierCurveTo(44, 30, 30, 40, 46, 64); g.stroke(); });
  ART.suite = A(384, 96, (g, w, hh) => { const gr = g.createLinearGradient(0, 0, 0, hh); gr.addColorStop(0, '#d9b56a'); gr.addColorStop(1, '#a9853e'); g.fillStyle = gr; rrect(g, 0, 0, w, hh, 10); g.fill(); g.strokeStyle = '#6b4f1e'; g.lineWidth = 4; rrect(g, 6, 6, w - 12, hh - 12, 7); g.stroke(); g.fillStyle = '#2b1d0e'; g.textAlign = 'center'; g.font = '34px ' + FONT.slab; g.fillText('SUITE 404', w / 2, 46); g.font = '700 18px ' + FONT.menu; g.fillText('TOTALLY LEGIT INC.  •  CUSTOMER EXCELLENCE', w / 2, 76, w - 30); });
  ART.knock = A(192, 136, (g, w, hh) => { g.fillStyle = '#fbf7ee'; g.fillRect(0, 0, w, hh); g.fillStyle = '#c62828'; g.fillRect(0, 0, w, 30); g.fillStyle = '#fff'; g.font = '20px ' + FONT.chunky; g.textAlign = 'center'; g.fillText('VISITORS', w / 2, 23); g.fillStyle = '#222'; g.font = '700 17px ' + FONT.menu; g.fillText('Please knock.', w / 2, 60); g.fillStyle = '#c62828'; g.fillText('Police:', w / 2, 88); g.fillStyle = '#222'; g.fillText('please don\'t.', w / 2, 110); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(8, 126, w - 16, 2); });
  ART.keypad = A(48, 80, (g, w, hh) => { g.fillStyle = '#3a3d44'; rrect(g, 0, 0, w, hh, 6); g.fill(); g.fillStyle = '#7fd8a8'; g.fillRect(8, 8, w - 16, 12); for (let i = 0; i < 9; i++) { g.fillStyle = '#c9ccd2'; rrect(g, 8 + (i % 3) * 11, 26 + Math.floor(i / 3) * 12, 9, 9, 2); g.fill(); } g.fillStyle = '#ff3b3b'; g.beginPath(); g.arc(w / 2, 70, 3.5, 0, 7); g.fill(); });
  ART.quiet = A(224, 96, (g, w, hh) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, hh); g.fillStyle = '#20232a'; g.fillRect(0, 0, w, 30); g.fillStyle = '#fff'; g.font = '700 18px ' + FONT.menu; g.textAlign = 'center'; g.fillText('NOTICE', w / 2, 22); g.fillStyle = '#222'; g.font = '700 16px ' + FONT.menu; g.fillText('Smile while dialling.', w / 2, 56); g.fillText('They can hear it.', w / 2, 80); });
}
function drawEmblem(g, x, y, r) {
  g.save(); g.translate(x, y);
  g.fillStyle = '#c99a45'; g.beginPath(); g.moveTo(0, -r); g.lineTo(r * 0.86, -r * 0.55); g.lineTo(r * 0.8, r * 0.25); g.quadraticCurveTo(r * 0.5, r * 0.8, 0, r); g.quadraticCurveTo(-r * 0.5, r * 0.8, -r * 0.8, r * 0.25); g.lineTo(-r * 0.86, -r * 0.55); g.closePath(); g.fill();
  g.fillStyle = '#2b1d12'; g.beginPath(); g.moveTo(0, -r * 0.8); g.lineTo(r * 0.68, -r * 0.43); g.lineTo(r * 0.63, r * 0.2); g.quadraticCurveTo(r * 0.4, r * 0.62, 0, r * 0.8); g.quadraticCurveTo(-r * 0.4, r * 0.62, -r * 0.63, r * 0.2); g.lineTo(-r * 0.68, -r * 0.43); g.closePath(); g.fill();
  g.fillStyle = '#f2cf7a'; g.rotate(-0.6); rrect(g, -r * 0.5, -r * 0.14, r, r * 0.28, r * 0.12); g.fill(); rrect(g, -r * 0.62, -r * 0.3, r * 0.3, r * 0.5, r * 0.1); g.fill(); rrect(g, r * 0.32, -r * 0.3, r * 0.3, r * 0.5, r * 0.1); g.fill();
  g.restore();
}
function drawPoster(g, w, hh, p) {
  const [title, sub, col, art] = p;
  g.fillStyle = '#141824'; g.fillRect(0, 0, w, hh);
  g.fillStyle = col; g.fillRect(14, 14, w - 28, 210);
  const gr = g.createRadialGradient(w / 2, 110, 10, w / 2, 110, 150); gr.addColorStop(0, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(14, 14, w - 28, 210);
  g.save(); g.translate(w / 2, 120); g.fillStyle = '#fff'; g.strokeStyle = '#fff'; g.lineWidth = 8; g.lineCap = g.lineJoin = 'round';
  if (art === 'venn') { g.globalAlpha = 0.85; g.beginPath(); g.arc(-28, 0, 52, 0, 7); g.stroke(); g.beginPath(); g.arc(28, 0, 52, 0, 7); g.stroke(); g.globalAlpha = 1; g.beginPath(); g.moveTo(6, -40); g.lineTo(-12, 6); g.lineTo(6, 6); g.lineTo(-6, 44); g.lineTo(22, -8); g.lineTo(4, -8); g.closePath(); g.fill(); }
  else if (art === 'phone') { g.rotate(-0.3); rrect(g, -50, -16, 100, 32, 14); g.fill(); rrect(g, -62, -10, 34, 52, 12); g.fill(); rrect(g, 28, -10, 34, 52, 12); g.fill(); g.rotate(0.3); for (let i = 0; i < 3; i++) { g.fillRect(-100 + i * 6, -30 + i * 26, 40 - i * 8, 6); } }
  else if (art === 'team') { for (let i = -1; i <= 1; i++) { g.beginPath(); g.arc(i * 50, -40, 13, 0, 7); g.fill(); g.beginPath(); g.moveTo(i * 50, -26); g.lineTo(i * 50, 20); g.moveTo(i * 50 - 22, 50); g.lineTo(i * 50, 20); g.lineTo(i * 50 + 22, 50); g.stroke(); } g.beginPath(); g.moveTo(-75, -10); g.lineTo(75, -10); g.stroke(); g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(0, -78, 22, 0, 7); g.fill(); g.fillStyle = col; g.font = '28px ' + FONT.chunky; g.textAlign = 'center'; g.fillText('$', 0, -68); }
  else if (art === 'chart') { [[-70, 30], [-35, 0], [0, -20], [35, -55]].forEach(([x, y]) => g.fillRect(x - 13, y, 26, 60 - y)); g.beginPath(); g.moveTo(-80, 30); g.lineTo(-20, -10); g.lineTo(20, -20); g.lineTo(70, -80); g.stroke(); g.beginPath(); g.moveTo(52, -84); g.lineTo(74, -84); g.lineTo(72, -62); g.stroke(); }
  else if (art === 'cat') { g.lineWidth = 7; g.beginPath(); g.moveTo(-100, -70); g.lineTo(100, -78); g.stroke(); g.fillStyle = '#fff'; g.beginPath(); g.ellipse(0, 10, 30, 40, 0, 0, 7); g.fill(); g.beginPath(); g.arc(0, -36, 24, 0, 7); g.fill(); g.beginPath(); g.moveTo(-22, -48); g.lineTo(-16, -72); g.lineTo(-4, -56); g.fill(); g.beginPath(); g.moveTo(22, -48); g.lineTo(16, -72); g.lineTo(4, -56); g.fill(); g.lineWidth = 9; g.beginPath(); g.moveTo(-10, -20); g.lineTo(-14, -74); g.moveTo(10, -20); g.lineTo(14, -76); g.stroke(); g.fillStyle = col; g.beginPath(); g.arc(-9, -38, 4, 0, 7); g.arc(9, -38, 4, 0, 7); g.fill(); }
  else if (art === 'peak') { g.beginPath(); g.moveTo(-100, 70); g.lineTo(-20, -50); g.lineTo(20, 0); g.lineTo(45, -25); g.lineTo(100, 70); g.closePath(); g.fill(); g.fillStyle = col; g.beginPath(); g.moveTo(-20, -50); g.lineTo(-38, -22); g.lineTo(-2, -22); g.closePath(); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 4; g.beginPath(); g.moveTo(-20, -50); g.lineTo(-20, -92); g.stroke(); g.fillStyle = '#ffd23f'; g.fillRect(-20, -92, 30, 18); }
  g.restore();
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = (title.length > 9 ? 32 : 46) + 'px ' + FONT.slab; g.fillText(title, w / 2, 278, w - 30);
  g.fillStyle = '#c9cfdd'; g.font = '700 16px ' + FONT.menu; g.fillText(sub, w / 2, 314, w - 30);
  g.strokeStyle = '#2a3042'; g.lineWidth = 10; g.strokeRect(0, 0, w, hh);
}
function drawCork(g, w, hh) {
  g.fillStyle = '#b98b55'; g.fillRect(0, 0, w, hh); noiseFill(g, w, hh, 9000, 0.22, 2);
  const note = (x, y, ww, hh2, rot, col, lines, size) => {
    g.save(); g.translate(x, y); g.rotate(rot); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(-ww / 2 + 4, -hh2 / 2 + 5, ww, hh2); g.fillStyle = col; g.fillRect(-ww / 2, -hh2 / 2, ww, hh2);
    lines.forEach((l, i) => scrawl(g, l[0], 0, -hh2 / 2 + 30 + i * (size + 8), l[1] || size, l[2] || '#222', { align: 'center', seed: i + x }));
    g.fillStyle = '#d33'; g.beginPath(); g.arc(0, -hh2 / 2 + 8, 6, 0, 7); g.fill(); g.restore();
  };
  note(90, 82, 140, 120, -0.06, '#fff', [['PIZZA', 30, '#c00'], ['FRIDAY', 26, '#c00'], ['(cancelled)', 18]], 24);
  note(240, 70, 120, 96, 0.05, '#ffe36e', [['LOST:', 22], ['red stapler', 18], ['ask Milton', 16]], 20);
  note(390, 92, 150, 130, -0.03, '#a8e6ff', [['BONK PAY', 24, '#1d3b8c'], ['TRAINING', 22, '#1d3b8c'], ['Thu 3PM', 20], ['mandatory!!', 16, '#c00']], 22);
  note(110, 222, 150, 110, 0.04, '#ffb7cc', [['KARAOKE', 24, '#7b2a8c'], ['NIGHT', 24, '#7b2a8c'], ['no.', 18]], 24);
  note(265, 214, 120, 110, -0.08, '#fff', [['who keeps', 18], ['stealing my', 18], ['yogurt??', 20, '#c00']], 20);
  g.save(); g.translate(410, 228); g.rotate(0.07); g.fillStyle = '#fff'; g.fillRect(-60, -50, 120, 100); g.fillStyle = '#7ec8ff'; g.fillRect(-52, -42, 104, 70); g.fillStyle = '#5aa05a'; g.fillRect(-52, 8, 104, 20); for (let i = 0; i < 3; i++) { g.fillStyle = SKINS[i * 2]; g.beginPath(); g.arc(-28 + i * 28, -6, 9, 0, 7); g.fill(); g.fillStyle = SHIRTS[i * 2]; g.fillRect(-36 + i * 28, 3, 16, 20); } scrawl(g, 'team building 2019', 0, 44, 12, '#333', { align: 'center' }); g.fillStyle = '#2b7'; g.beginPath(); g.arc(0, -44, 6, 0, 7); g.fill(); g.restore();
  g.strokeStyle = '#7a5a34'; g.lineWidth = 14; g.strokeRect(0, 0, w, hh);
}
function drawVending(g, w, hh, name, col, colors, kind) {
  g.fillStyle = '#15161b'; g.fillRect(0, 0, w, hh);
  g.fillStyle = col; rrect(g, 6, 6, w - 12, 70, 10); g.fill(); g.fillStyle = '#fff'; g.font = '44px ' + FONT.chunky; g.textAlign = 'center'; g.fillText(name, w / 2, 58, w - 30);
  const gr = g.createLinearGradient(0, 90, 0, hh - 60); gr.addColorStop(0, '#2b3a4a'); gr.addColorStop(1, '#1a2028'); g.fillStyle = gr; g.fillRect(12, 88, w - 24, hh - 160);
  for (let row = 0; row < 6; row++) {
    const y = 104 + row * 54; g.fillStyle = '#9aa4ae'; g.fillRect(14, y + 44, w - 28, 4);
    for (let i = 0; i < 5; i++) {
      const x = 22 + i * 42, c = colors[(row + i * 2) % colors.length];
      if (kind === 'can') { g.fillStyle = c; rrect(g, x + 4, y + 4, 26, 40, 5); g.fill(); g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(x + 8, y + 8, 5, 32); g.fillStyle = '#ddd'; g.fillRect(x + 6, y + 2, 22, 4); }
      else { g.fillStyle = c; g.beginPath(); g.moveTo(x + 2, y + 6); g.lineTo(x + 32, y + 6); g.lineTo(x + 30, y + 44); g.lineTo(x + 4, y + 44); g.closePath(); g.fill(); g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.arc(x + 17, y + 24, 7, 0, 7); g.fill(); }
    }
  }
  g.fillStyle = 'rgba(255,255,255,.08)'; g.beginPath(); g.moveTo(12, 88); g.lineTo(90, 88); g.lineTo(30, hh - 72); g.lineTo(12, hh - 72); g.fill();
  g.fillStyle = '#0b0b0e'; g.fillRect(20, hh - 56, w - 40, 40);
}

/* ---------- prop builders ---------- */
const frameAt = (x, z, ry, y) => new THREE.Matrix4().makeRotationY(ry || 0).setPosition(x, y || 0, z);
function crumpleGeo(k) {
  const key = 'crumple' + k; if (_geos[key]) return _geos[key];
  const g = new THREE.IcosahedronGeometry(1, 1), Pa = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < Pa.count; i++) { v.fromBufferAttribute(Pa, i); const h = hashStr((v.x * 100 | 0) + ',' + (v.y * 100 | 0) + ',' + (v.z * 100 | 0) + k), s = 0.72 + (h % 1000) / 1000 * 0.5; Pa.setXYZ(i, v.x * s, v.y * s, v.z * s); }
  g.computeVertexNormals(); return (_geos[key] = g);
}
function paperBall(x, y, z, r, rr) { const s = 0.05 + (r || 0); S.geo('flat', crumpleGeo(Math.floor(rr() * 5)), x, y + s * 0.8, z, rr() < 0.15 ? '#f2e08a' : '#efeadd', { sx: s, sy: s * 0.85, sz: s, ry: rr() * 6, rx: rr() * 6 }); }
function plant(x, z, size, kind) {
  size = size || 1; const r = rng(Math.round(x * 31 + z * 17));
  if (kind === 'tall') {
    S.cyl('solid', 0.24, 0.19, 0.48, x, 0.24, z, '#e9e4da', { seg: 16 }); S.cyl('small', 0.22, 0.22, 0.02, x, 0.46, z, '#4a3424');
    S.cyl('solid', 0.025, 0.035, 1.3, x, 1.1, z, '#6b4a2a', { seg: 6 });
    for (let k = 0; k < 46; k++) { const y = 1.0 + r() * 0.95, a = r() * 6.3; S.geo('two', leafGeo(), x + Math.cos(a) * 0.08, y, z + Math.sin(a) * 0.08, ['#3f8f3a', '#4fa144', '#2f7a34', '#5fb04e'][k % 4], { ry: a + Math.PI / 2, rx: -0.2 - r() * 0.7, sx: 0.32, sy: 0.32, sz: 0.32 }); }
  } else {
    S.cyl('solid', 0.21 * size, 0.15 * size, 0.38 * size, x, 0.19 * size, z, kind === 'grey' ? '#8f8a84' : '#b5683f', { seg: 14 });
    S.cyl('small', 0.19 * size, 0.19 * size, 0.02, x, 0.37 * size, z, '#3b2a1e');
    for (let k = 0; k < 20; k++) { const a = k * 2.4 + r(), up = 0.9 + r() * 0.6; S.geo('two', leafGeo(), x, 0.36 * size, z, ['#5fb04e', '#7cc35a', '#4a9a3e'][k % 3], { ry: a, rx: -(0.35 + r() * 0.75), sx: 0.75 * size * up, sy: 0.75 * size, sz: 0.75 * size * up }); }
  }
  S.col(x - 0.24 * size, x + 0.24 * size, z - 0.24 * size, z + 0.24 * size, 0.5);
  aoDecal(x, z, 0.9 * size, 0.9 * size);
}
/* wall-mounted extinguisher; ry = direction it faces */
function extinguisher(x, z, ry) {
  const p = frameAt(x, z, ry), o = e => Object.assign({ p }, e || {});
  S.box('small', 0.12, 0.06, 0.05, 0, 0.85, 0.025, '#333', o());
  S.cyl('shiny', 0.075, 0.075, 0.46, 0, 0.62, 0.1, '#d81e1e', o({ seg: 16 })); S.rbox('shiny', 0.15, 0.06, 0.15, 0.06, 0, 0.86, 0.1, '#d81e1e', o());
  S.box('shiny', 0.05, 0.08, 0.05, 0, 0.92, 0.1, '#222', o()); S.box('shiny', 0.14, 0.02, 0.03, 0.03, 0.97, 0.1, '#222', o());
  S.box('small', 0.025, 0.36, 0.025, 0.09, 0.72, 0.13, '#1a1a1a', o({ rz: -0.15 })); S.decal(ART.ext, 0.07, 0.14, 0, 0.62, 0.177, o());
  S.decal(ART.extSign, 0.16, 0.08, 0, 1.22, 0.012, o());
}
function bin(x, z) {
  S.cyl('two', 0.21, 0.17, 0.42, x, 0.21, z, '#f2f0ea', { seg: 18, open: true });
  S.cyl('small', 0.17, 0.17, 0.01, x, 0.01, z, '#d8d4ca', { seg: 14 });
  S.geo('shiny', torusGeo(0.21, 0.012), x, 0.42, z, '#f6f4ee', { rx: Math.PI / 2 });
  const r = rng(Math.round(x * 13 + z * 7)); for (let k = 0; k < 3; k++) paperBall(x + (r() - 0.5) * 0.16, 0.18 + k * 0.04, z + (r() - 0.5) * 0.16, 0, r);
  W.bins.push({ x, z }); aoDecal(x, z, 0.6, 0.6);
}
function domeGeo() { return _geos.dome || (_geos.dome = new THREE.SphereGeometry(0.075, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2)); }
function torusGeo(r, t, seg) { const k = 't' + r + '|' + t + '|' + seg; return _geos[k] || (_geos[k] = new THREE.TorusGeometry(r, t, 6, seg || 28)); }
function poster(cell, x, y, z, ry, w, hh) { S.decal(cell, w || 0.8, hh || 1.1, x, y, z, { ry }); }
/* cabinets: base (front +z in frame p) */
function baseCabinet(p, w, col, top) {
  const o = e => Object.assign({ p }, e || {});
  S.box('wood', w, 0.8, 0.58, 0, 0.48, 0, col, o()); S.box('solid', w - 0.04, 0.08, 0.5, 0, 0.04, -0.03, '#2a2422', o());
  S.box('wood', w + 0.04, 0.04, 0.64, 0, 0.9, 0.02, top || '#d9b98a', o());
  const n = Math.max(1, Math.round(w / 0.5));
  for (let i = 0; i < n; i++) { const x = -w / 2 + (i + 0.5) * w / n; S.box('wood', w / n - 0.03, 0.72, 0.02, x, 0.48, 0.3, col, o()); S.box('shiny', 0.02, 0.1, 0.025, x + (i % 2 ? -1 : 1) * (w / n / 2 - 0.06), 0.72, 0.32, '#b8b2a6', o()); }
}
function upperCabinet(p, w, col) {
  const o = e => Object.assign({ p }, e || {}), n = Math.max(1, Math.round(w / 0.5));
  S.box('wood', w, 0.72, 0.34, 0, 0, 0, col, o());
  for (let i = 0; i < n; i++) { const x = -w / 2 + (i + 0.5) * w / n; S.box('wood', w / n - 0.03, 0.68, 0.02, x, 0, 0.18, col, o()); S.box('shiny', 0.02, 0.1, 0.025, x + (i % 2 ? -1 : 1) * (w / n / 2 - 0.06), -0.24, 0.2, '#b8b2a6', o()); }
}
function microwave(p, x, y, z) { const o = e => Object.assign({ p }, e || {}); S.rbox('shiny', 0.5, 0.3, 0.36, 0.02, x, y + 0.15, z, '#ebe9e3', o()); S.decal(ART.micro, 0.48, 0.28, x, y + 0.15, z + 0.181, o()); }
function fridge(x, z, ry) {
  const p = frameAt(x, z, ry), o = e => Object.assign({ p }, e || {});
  S.rbox('shiny', 0.72, 1.86, 0.72, 0.04, 0, 0.93, 0, '#f2eee4', o({ seg: 2 }));
  S.box('small', 0.7, 0.012, 0.01, 0, 1.3, 0.362, '#9a958a', o());
  S.rbox('shiny', 0.035, 0.3, 0.05, 0.015, 0.29, 1.55, 0.38, '#cfcac0', o()); S.rbox('shiny', 0.035, 0.5, 0.05, 0.015, 0.29, 0.92, 0.38, '#cfcac0', o());
  S.decal(ART.fridgeArt[Math.abs(Math.round(x)) % 2], 0.2, 0.2, -0.12, 1.0, 0.363, o({ rz: 0.08 })); S.decal(Atlas.notes[Math.abs(Math.round(x * 3)) % Atlas.notes.length], 0.1, 0.1, 0.1, 1.55, 0.363, o({ rz: -0.1 }));
  S.colL(p, -0.37, 0.37, -0.37, 0.37, 1.86); aoDecal(x, z, 1.1, 1.1, ry);
}
function waterCooler(x, z, ry) {
  const p = frameAt(x, z, ry), o = e => Object.assign({ p }, e || {});
  S.rbox('shiny', 0.34, 0.96, 0.34, 0.03, 0, 0.48, 0, '#f1f1ee', o()); S.box('small', 0.2, 0.12, 0.06, 0, 0.82, 0.17, '#3a3d44', o());
  S.box('shiny', 0.03, 0.04, 0.04, -0.05, 0.86, 0.2, '#2f7dd8', o()); S.box('shiny', 0.03, 0.04, 0.04, 0.05, 0.86, 0.2, '#d6342c', o());
  S.cyl('glass', 0.15, 0.15, 0.36, 0, 1.17, 0, '#8fd3ff', o({ seg: 16 })); S.cyl('glass', 0.13, 0.15, 0.06, 0, 1.38, 0, '#8fd3ff', o({ seg: 16 })); S.cyl('glass', 0.05, 0.05, 0.06, 0, 0.98, 0, '#8fd3ff', o());
  S.cyl('small', 0.04, 0.035, 0.22, 0.21, 0.78, 0, '#e8e8e8', o());
  S.colL(p, -0.2, 0.2, -0.2, 0.2, 1.4); aoDecal(x, z, 0.7, 0.7);
  W.interact.push({ pos: new THREE.Vector3(x, 1.0, z), label: () => 'Get some water', act: () => { SFX.glug(); toast(pick(['Hydrated. Productivity unchanged.', 'Refreshing. The boss is watching.', 'That was water.', 'You feel 2% more legit.'])); } });
}
function vending(x, z, ry, cell, col) {
  const p = frameAt(x, z, ry), o = e => Object.assign({ p }, e || {});
  S.rbox('shiny', 0.95, 1.9, 0.8, 0.03, 0, 0.95, 0, col, o({ seg: 2 }));
  S.decal(cell, 0.62, 1.34, -0.12, 1.06, 0.402, o(), true);
  S.box('shiny', 0.2, 0.5, 0.02, 0.33, 1.2, 0.401, '#2a2c33', o()); S.box('glow', 0.12, 0.05, 0.01, 0.33, 1.38, 0.412, '#7dff8a', o());
  for (let i = 0; i < 9; i++) S.box('small', 0.04, 0.03, 0.01, 0.29 + (i % 3) * 0.04, 1.08 + Math.floor(i / 3) * 0.05, 0.412, '#ddd', o());
  S.box('small', 0.5, 0.14, 0.04, -0.12, 0.22, 0.4, '#0d0d10', o());
  S.colL(p, -0.48, 0.48, -0.4, 0.4, 1.9); aoDecal(x, z, 1.4, 1.2, ry);
  lightPool(x + Math.sin(ry) * 0.9, z + Math.cos(ry) * 0.9, 1.6, 1.6, '#1a1410');
  W.interact.push({ pos: new THREE.Vector3(x + Math.sin(ry) * 0.4, 1.1, z + Math.cos(ry) * 0.4), label: () => 'Buy a snack', act: () => { SFX.popup(); toast(pick(['Bonk Cola acquired. Tastes like ambition.', 'The machine ate your coin. Classic.', 'Snack get. Quota still pending.', 'It is stuck. It will always be stuck.'])); } });
}
function copier(x, z, ry) {
  const p = frameAt(x, z, ry), o = e => Object.assign({ p }, e || {});
  S.rbox('shiny', 1.0, 0.95, 0.68, 0.03, 0, 0.475, 0, '#e4dfd2', o({ seg: 2 })); S.rbox('shiny', 0.86, 0.08, 0.6, 0.02, 0, 0.99, -0.02, '#4b4e56', o());
  S.decal(ART.copier, 0.32, 0.15, 0.25, 1.0, 0.3, o({ rx: -0.9 }));
  S.box('small', 0.36, 0.03, 0.28, -0.62, 0.72, 0, '#d4cfc2', o()); S.box('small', 0.3, 0.02, 0.22, -0.62, 0.75, 0, '#f6f4ee', o());
  for (const y of [0.18, 0.4]) S.box('small', 0.9, 0.01, 0.01, 0, y, 0.342, '#a7a294', o());
  S.colL(p, -0.75, 0.52, -0.34, 0.34, 1.0); aoDecal(x, z, 1.5, 1.0, ry);
  W.interact.push({ pos: new THREE.Vector3(x, 1.0, z), label: () => 'Use the copier', act: () => { SFX.click(); toast(pick(['You photocopied your face. HR has been notified.', 'PAPER JAM. Of course.', '200 copies of a blank page. Nailed it.', 'The copier makes a sound like a dying goose.'])); } });
}
function filingCabinet(x, z, ry, tall) {
  const p = frameAt(x, z, ry), o = e => Object.assign({ p }, e || {}), hh = tall ? 1.32 : 0.72, n = tall ? 4 : 2;
  S.rbox('shiny', 0.46, hh, 0.6, 0.015, 0, hh / 2, 0, '#8d939c', o());
  for (let i = 0; i < n; i++) { const y = hh - (i + 0.5) * hh / n; S.box('small', 0.42, 0.006, 0.01, 0, y - hh / n / 2 + 0.01, 0.301, '#5f646c', o()); S.box('shiny', 0.14, 0.025, 0.03, 0, y + 0.06, 0.31, '#c9ccd2', o()); S.decal(ART.files, 0.11, 0.03, 0, y + 0.12, 0.302, o()); }
  S.colL(p, -0.24, 0.24, -0.3, 0.3, hh); aoDecal(x, z, 0.8, 0.9, ry);
}
function plasticChair(p, col) {
  const o = e => Object.assign({ p }, e || {});
  S.rbox('solid', 0.44, 0.04, 0.42, 0.02, 0, 0.46, 0, col, o()); S.rbox('solid', 0.42, 0.36, 0.035, 0.02, 0, 0.76, 0.2, col, o({ rx: 0.1 }));
  for (const [x, z] of [[-0.19, -0.18], [0.19, -0.18], [-0.19, 0.18], [0.19, 0.18]]) S.cyl('small', 0.012, 0.012, 0.46, x, 0.23, z, '#9a9ca2', o({ seg: 6 }));
}
function fruitGeo() { return _geos.fruit || (_geos.fruit = new THREE.IcosahedronGeometry(1, 1)); }
/* a worn 2-seat couch (front +z in its frame) */
function couch(x, z, ry, col) {
  const p = frameAt(x, z, ry), o = e => Object.assign({ p }, e || {}), w = 1.9;
  S.rbox('fabric', w, 0.24, 0.8, 0.05, 0, 0.26, 0, col, o({ seg: 2 }));
  for (const sd of [-1, 1]) S.rbox('fabric', w / 2 - 0.2, 0.14, 0.6, 0.06, sd * (w / 4 - 0.05), 0.44, 0.08, col, o({ seg: 2, ry: sd * 0.03 }));
  S.rbox('fabric', w - 0.1, 0.5, 0.2, 0.08, 0, 0.6, -0.3, col, o({ seg: 2, rx: -0.08 }));
  for (const sd of [-1, 1]) S.rbox('fabric', 0.2, 0.34, 0.8, 0.08, sd * (w / 2 - 0.1), 0.5, 0, col, o({ seg: 2 }));
  S.rbox('fabric', 0.36, 0.32, 0.12, 0.06, -0.52, 0.62, -0.12, '#e3b23c', o({ rx: -0.3, rz: 0.25 }));   // cushion
  for (const [fx, fz] of [[-0.85, -0.32], [0.85, -0.32], [-0.85, 0.32], [0.85, 0.32]]) S.cyl('small', 0.03, 0.025, 0.14, fx, 0.07, fz, '#2a1d14', o({ seg: 6 }));
  S.colL(p, -w / 2, w / 2, -0.42, 0.4, 0.75); aoDecal(x, z, w + 0.4, 1.1, ry);
}
/* a dark-red table (review room, break room) */
function redTable(x, z, w, d, ry) {
  const p = frameAt(x, z, ry), o = e => Object.assign({ p }, e || {});
  S.rbox('shiny', w, 0.06, d, 0.02, 0, 0.75, 0, '#7a3d3d', o({ seg: 2 })); S.box('shiny', w - 0.06, 0.04, d - 0.06, 0, 0.71, 0, '#4a2224', o());
  const legs = w > 3 ? [-w * 0.3, w * 0.3] : [0];
  for (const lx of legs) { S.box('shiny', 0.2, 0.68, d * 0.5, lx, 0.36, 0, '#1d1b20', o()); S.box('shiny', 0.6, 0.04, d * 0.7, lx, 0.02, 0, '#1d1b20', o()); }
  S.colL(p, -w / 2, w / 2, -d / 2, d / 2, 0.78); aoDecal(x, z, w + 0.6, d + 0.6, ry);
}

/* ---------- wall fans, wall clock (animated) ---------- */
const FANS = [];
function wallFan(x, y, z, ry) {
  const p = frameAt(x, z, ry, y), o = e => Object.assign({ p }, e || {});
  S.box('shiny', 0.11, 0.17, 0.03, 0, 0, 0.015, '#e7ddc8', o()); S.box('shiny', 0.04, 0.04, 0.18, 0, -0.04, 0.1, '#d9cfb8', o());
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; W.scene.add(g);
  const head = new THREE.Group(); head.position.z = 0.2; g.add(head);
  const it = [], add = (geo, x2, y2, z2, col, e) => it.push(geo, xf(x2, y2, z2, e), col), C = '#ece2cc';
  add(cylGeo(0.07, 0.07, 0.14, 14), 0, 0, -0.02, '#e7ddc8', { rx: Math.PI / 2 }); add(rboxGeo(0.12, 0.12, 0.06, 0.04), 0, 0, -0.1, '#e1d6be');
  add(torusGeo(0.2, 0.008, 30), 0, 0, 0.11, C); add(torusGeo(0.19, 0.007, 30), 0, 0, 0.0, C); add(cylGeo(0.035, 0.035, 0.012, 12), 0, 0, 0.115, '#c9a24a', { rx: Math.PI / 2 });
  for (let k = 0; k < 14; k++) { const a = k * Math.PI / 7; add(boxGeo(0.006, 0.2, 0.006), Math.sin(a) * 0.1, Math.cos(a) * 0.1, 0.11, C, { rz: -a }); add(boxGeo(0.006, 0.006, 0.11), Math.sin(a) * 0.195, Math.cos(a) * 0.195, 0.055, C); }
  const hm = new THREE.Mesh(mergeGeos(it), Batch.g.shiny.m); head.add(hm);
  const bl = []; for (let k = 0; k < 3; k++) { const a = k * Math.PI * 2 / 3; bl.push(rboxGeo(0.09, 0.15, 0.012, 0.004), xf(Math.sin(a) * 0.095, Math.cos(a) * 0.095, 0, { rz: -a, ry: 0.35 }), '#f4ecd8'); }
  const blades = new THREE.Mesh(mergeGeos(bl), Batch.g.shiny.m); blades.position.z = 0.055; head.add(blades);
  FANS.push({ head, blades, base: 0, ph: Math.random() * 6, sp: 14 + Math.random() * 4 });
}
let CLOCK = null;
function wallClock(x, y, z, ry) {
  S.geo('shiny', torusGeo(0.2, 0.025, 32), x, y, z, '#2a2a2e', { ry }); S.decal(ART.clock, 0.4, 0.4, x + Math.sin(ry) * 0.012, y, z + Math.cos(ry) * 0.012, { ry });
  const g = new THREE.Group(); g.position.set(x + Math.sin(ry) * 0.025, y, z + Math.cos(ry) * 0.025); g.rotation.y = ry; W.scene.add(g);
  const hand = (len, wid, col, zz) => { const pv = new THREE.Group(); pv.position.z = zz; g.add(pv); const m = new THREE.Mesh(boxGeo(wid, len, 0.006), mat(col)); m.position.y = len / 2 - 0.02; pv.add(m); return pv; };
  CLOCK = { h: hand(0.1, 0.018, '#222', 0.004), m: hand(0.15, 0.012, '#222', 0.008), s: hand(0.16, 0.005, '#d33', 0.012) };
}

/* ---------- desk screens: one instanced mesh, one animated atlas ---------- */
/* atlas cells (4 x 3 of 256x156 in a 1024x512 canvas): 0-3 savers (swirl, lava, stars, plasma), 4 ring, 5 desktop, 6 desktop (NPC),
   7 off, 8 boot, 9-11 savers (waves, tunnel, bouncing logo) */
const SCR = { CW: 256, CH: 156, TH: 512, modes: ['saver', 'ring', 'desktop', 'off', 'boot'], cell: { ring: 4, desktop: 5, desktop2: 6, off: 7, boot: 8 }, savers: [0, 1, 2, 3, 9, 10, 11],
  mesh: null, attr: null, canvas: null, g: null, tex: null, cur: [], force: [], auto: [], boot: [], t: 0, stars: null, spiral: null, plasma: null };
function buildScreens() {
  const n = W.desks.length; SCR.canvas = document.createElement('canvas'); SCR.canvas.width = SCR.CW * 4; SCR.canvas.height = SCR.TH; SCR.g = SCR.canvas.getContext('2d');
  SCR.tex = new THREE.CanvasTexture(SCR.canvas); SCR.tex.anisotropy = 4;
  const geo = new THREE.PlaneGeometry(0.61, 0.37); SCR.attr = new THREE.InstancedBufferAttribute(new Float32Array(n * 2), 2); geo.setAttribute('aCell', SCR.attr);
  const m = new THREE.MeshBasicMaterial({ map: SCR.tex, toneMapped: false });
  m.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec2 aCell;').replace('#include <uv_vertex>', '#include <uv_vertex>\nvUv = vUv * vec2(0.25, ' + (SCR.CH / SCR.TH).toFixed(6) + ') + aCell;'); };
  m.customProgramCacheKey = () => 'deskScreens';
  SCR.mesh = new THREE.InstancedMesh(geo, m, n); SCR.mesh.name = 'deskScreens';
  const q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 1, 0), M = new THREE.Matrix4();
  W.desks.forEach(d => { q.setFromAxisAngle(up, d.rot); M.compose(new THREE.Vector3(d.screen.x, d.screen.y, d.screen.z), q, one); SCR.mesh.setMatrixAt(d.i, M); SCR.cur[d.i] = null; setScreenCell(d.i, d.npc ? 'desktop' : 'saver'); });
  SCR.mesh.instanceMatrix.needsUpdate = true; SCR.mesh.frustumCulled = false; W.scene.add(SCR.mesh);
  // static cells
  drawDesktop(SCR.g, SCR.CW, SCR.CH, 0); drawDesktop(SCR.g, SCR.CW * 2, SCR.CH, 1); drawOff(SCR.g, SCR.CW * 3, SCR.CH);
  SCR.spiral = canvasOnly(360, 360, drawSpiral);
  SCR.plasma = canvasOnly(64, 39, () => {});
  const r = rng(77); SCR.stars = Array.from({ length: 90 }, () => [r() * 2 - 1, r() * 2 - 1, r()]);
  drawScreens(0);
}
function canvasOnly(w, hh, f) { const c = document.createElement('canvas'); c.width = w; c.height = hh; f(c.getContext('2d'), w, hh); return c; }
function setScreenCell(i, mode) {
  if (SCR.cur[i] === mode) return; SCR.cur[i] = mode;
  const d = W.desks[i]; let c = mode === 'saver' ? SCR.savers[(i * 5 + (i >> 2)) % SCR.savers.length] : mode === 'desktop' ? (d && d.npc ? 6 : 5) : SCR.cell[mode]; if (c == null) c = 7;
  SCR.attr.setXY(i, (c % 4) * 0.25, 1 - (Math.floor(c / 4) + 1) * SCR.CH / SCR.TH); SCR.attr.needsUpdate = true;
}
/* public: force a desk screen mode ('saver' | 'ring' | 'desktop' | 'off' | 'boot'); null hands it back to the automatic logic */
W.setDeskScreen = (i, mode) => { if (!W.desks[i]) return; SCR.force[i] = mode || null; if (mode) setScreenCell(i, mode); else SCR.cur[i] = null; };
W.deskScreen = i => SCR.cur[i];
let _myDesk = -1;
Bus.on('player:sit', i => { _myDesk = i; setTimeout(autoScreens, 0); });
for (const e of ['player:stand', 'call:ring', 'call:answer', 'call:end', 'day:start']) Bus.on(e, () => setTimeout(autoScreens, 0));
Bus.on('quit', () => { _myDesk = -1; });
Net.addMe('ring', () => (typeof Call !== 'undefined' && Call.state === 'ringing') ? 1 : 0);
function autoScreens() {
  const ringing = typeof Call !== 'undefined' && Call.state === 'ringing' && G.phase !== 'menu';
  const occ = {}, now = performance.now() / 1000;
  if (Net.active) for (const [id, p] of Net.players) if (id !== Net.myId && p.seat >= 0) occ[p.seat] = p.ext && p.ext.ring ? 'ring' : 'desktop';
  for (const d of W.desks) {
    const i = d.i; if (SCR.force[i]) continue;
    let m = d.npc ? 'desktop' : 'saver';
    if (occ[i]) m = occ[i];
    if (i === _myDesk) { if (ringing) m = 'ring'; else if (P.seated && P.seat === i) m = 'desktop'; }
    // someone just sat down at an idle computer: show the LegitOS boot screen for a moment
    const was = SCR.auto[i]; SCR.auto[i] = m;
    if (m === 'desktop' && !d.npc && (was === 'saver' || was === 'off')) SCR.boot[i] = now + 2.2;
    setScreenCell(i, m === 'desktop' && SCR.boot[i] > now ? 'boot' : m);
  }
}
function drawSpiral(g, w, hh) {
  const cx = w / 2, cy = hh / 2;
  for (let a = 0; a < 360; a += 3) { g.fillStyle = 'hsl(' + (a * 2 % 360) + ',95%,62%)'; g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, w * 0.75, a * Math.PI / 180, (a + 3.5) * Math.PI / 180); g.fill(); }
  for (let r = 4; r < w * 0.72; r += 1.5) { const a = r * 0.06; g.fillStyle = 'rgba(255,255,255,' + (0.5 + 0.5 * Math.sin(r * 0.15)) * 0.45 + ')'; g.beginPath(); g.arc(cx + Math.cos(a) * 2, cy + Math.sin(a) * 2, r, a, a + 1.6); g.arc(cx, cy, r + 1.2, a + 1.6, a, true); g.fill(); }
}
function drawScreens(t) {
  const g = SCR.g, W_ = SCR.CW, H_ = SCR.CH;
  // 0: rotating rainbow swirl
  g.save(); g.beginPath(); g.rect(0, 0, W_, H_); g.clip(); g.translate(W_ / 2, H_ / 2); g.rotate(t * 1.1); g.filter = 'hue-rotate(' + Math.round(t * 50 % 360) + 'deg)'; g.drawImage(SCR.spiral, -180, -180); g.filter = 'none'; g.restore();
  // 1: lava blobs
  g.save(); g.beginPath(); g.rect(W_, 0, W_, H_); g.clip(); g.fillStyle = '#1a0b2e'; g.fillRect(W_, 0, W_, H_); g.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 6; k++) { const x = W_ + W_ / 2 + Math.sin(t * (0.5 + k * 0.17) + k) * W_ * 0.38, y = H_ / 2 + Math.cos(t * (0.4 + k * 0.13) + k * 2) * H_ * 0.36, r = 40 + 14 * Math.sin(t + k); const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, ['#ff3cac', '#2bd2ff', '#2bff88', '#ffcc33', '#a35bff', '#ff6b3c'][k]); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
  g.restore();
  // 2: starfield warp
  g.save(); g.beginPath(); g.rect(W_ * 2, 0, W_, H_); g.clip(); g.fillStyle = 'rgba(5,6,20,1)'; g.fillRect(W_ * 2, 0, W_, H_);
  for (const s of SCR.stars) { s[2] -= 0.012; if (s[2] <= 0.02) { s[0] = Math.random() * 2 - 1; s[1] = Math.random() * 2 - 1; s[2] = 1; } const k = 0.45 / s[2], x = W_ * 2.5 + s[0] * k * W_ * 0.5, y = H_ / 2 + s[1] * k * H_ * 0.5, sz = (1 - s[2]) * 3.2; g.fillStyle = 'hsl(' + ((s[0] * 300 + 200) | 0) + ',80%,' + (60 + (1 - s[2]) * 40) + '%)'; g.fillRect(x, y, sz, sz); }
  g.restore();
  // 3: plasma waves
  const pg = SCR.plasma.getContext('2d'), img = pg.createImageData(64, 39), dd = img.data;
  for (let y = 0; y < 39; y++) for (let x = 0; x < 64; x++) {
    const v = Math.sin(x * 0.16 + t * 1.3) + Math.sin(y * 0.21 - t) + Math.sin((x + y) * 0.1 + t * 0.7) + Math.sin(Math.hypot(x - 32, y - 20) * 0.25 - t * 1.6), o = (y * 64 + x) * 4;
    dd[o] = 128 + 127 * Math.sin(v * 1.6); dd[o + 1] = 128 + 127 * Math.sin(v * 1.6 + 2.1); dd[o + 2] = 128 + 127 * Math.sin(v * 1.6 + 4.2); dd[o + 3] = 255;
  }
  pg.putImageData(img, 0, 0); g.imageSmoothingEnabled = true; g.drawImage(SCR.plasma, W_ * 3, 0, W_, H_);
  // 4: incoming call (big green phone)
  const x0 = 0, y0 = H_; g.save(); g.beginPath(); g.rect(x0, y0, W_, H_); g.clip();
  g.fillStyle = '#29b84a'; g.fillRect(x0, y0, W_, H_);
  const cx = x0 + W_ / 2, cy = y0 + H_ * 0.44;
  for (let k = 0; k < 3; k++) { const ph = (t * 0.9 + k / 3) % 1; g.strokeStyle = 'rgba(255,255,255,' + (0.5 * (1 - ph)) + ')'; g.lineWidth = 6; g.beginPath(); g.arc(cx, cy, 30 + ph * 70, 0, 7); g.stroke(); }
  g.translate(cx, cy); g.rotate(Math.sin(t * 22) * 0.22 * (Math.sin(t * 3) > 0 ? 1 : 0.15) - 0.5); g.fillStyle = '#fff';
  rrect(g, -38, -12, 76, 24, 11); g.fill(); rrect(g, -46, -6, 28, 40, 10); g.fill(); rrect(g, 18, -6, 28, 40, 10); g.fill(); g.restore();
  g.fillStyle = '#fff'; g.font = '24px ' + FONT.chunky; g.textAlign = 'center'; g.fillText('INCOMING CALL', cx, y0 + H_ - 18);
  drawBoot(g, 0, H_ * 2, t);
  // 9: rainbow waves
  const y2 = H_ * 2; g.save(); g.beginPath(); g.rect(W_, y2, W_, H_); g.clip(); g.fillStyle = '#12082a'; g.fillRect(W_, y2, W_, H_);
  for (let k = 0; k < 7; k++) { g.fillStyle = 'hsl(' + ((t * 70 + k * 48) % 360 | 0) + ',90%,60%)'; g.beginPath(); g.moveTo(W_, y2 + H_); for (let x = 0; x <= W_; x += 16) g.lineTo(W_ + x, y2 + 18 + k * 20 + Math.sin(x * 0.03 + t * 2.2 + k * 0.7) * 12 + Math.sin(x * 0.011 - t * 1.3) * 8); g.lineTo(W_ * 2, y2 + H_); g.fill(); }
  g.restore();
  // 10: rotating square tunnel
  g.save(); g.beginPath(); g.rect(W_ * 2, y2, W_, H_); g.clip(); g.fillStyle = '#05040c'; g.fillRect(W_ * 2, y2, W_, H_); g.translate(W_ * 2.5, y2 + H_ / 2);
  for (let k = 11; k >= 0; k--) { const f = ((k + t * 1.6) % 12) / 12, sz = f * f * W_ * 1.5; g.save(); g.rotate(t * 0.6 + f * 2.4); g.strokeStyle = 'hsl(' + ((k * 30 + t * 90) % 360 | 0) + ',95%,' + (35 + f * 30 | 0) + '%)'; g.lineWidth = 2 + f * 12; g.strokeRect(-sz / 2, -sz / 2, sz, sz); g.restore(); }
  g.restore();
  // 11: bouncing company logo
  g.save(); g.beginPath(); g.rect(W_ * 3, y2, W_, H_); g.clip(); g.fillStyle = '#0a0a12'; g.fillRect(W_ * 3, y2, W_, H_);
  const tri = (v, m) => { v = v % (2 * m); return v < m ? v : 2 * m - v; }, bx = W_ * 3 + 8 + tri(t * 46, W_ - 132), by = y2 + 8 + tri(t * 31, H_ - 46), hue = Math.floor(t * 46 / (W_ - 132) + t * 31 / (H_ - 46)) * 67 % 360;
  drawEmblem(g, bx + 16, by + 19, 16); g.fillStyle = 'hsl(' + hue + ',90%,62%)'; g.font = '17px ' + FONT.chunky; g.textAlign = 'left'; g.fillText('TOTALLY', bx + 38, by + 17); g.fillText('LEGIT', bx + 38, by + 35);
  g.restore();
  SCR.tex.needsUpdate = true;
}
/* LegitOS boot screen (shown for a moment when someone sits down) */
function drawBoot(g, x0, y0, t) {
  const w = SCR.CW, hh = SCR.CH; g.save(); g.beginPath(); g.rect(x0, y0, w, hh); g.clip();
  const gr = g.createRadialGradient(x0 + w / 2, y0 + hh * 0.42, 4, x0 + w / 2, y0 + hh * 0.42, w * 0.7); gr.addColorStop(0, '#1d3f73'); gr.addColorStop(1, '#070f1f'); g.fillStyle = gr; g.fillRect(x0, y0, w, hh);
  const cx = x0 + w / 2, cy = y0 + 52; g.fillStyle = '#f5c542'; rrect(g, cx - 24, cy - 24, 48, 48, 12); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(cx - 13, cy + 1); g.lineTo(cx - 4, cy + 10); g.lineTo(cx + 14, cy - 10); g.lineTo(cx + 9, cy - 15); g.lineTo(cx - 4, cy - 1); g.lineTo(cx - 8, cy - 5); g.closePath(); g.fill();
  g.fillStyle = '#fff'; g.font = '24px ' + FONT.chunky; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillText('LegitOS', cx, y0 + 104);
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 - Math.PI / 2, on = ((Math.floor(t * 10) - k) % 8 + 8) % 8; g.fillStyle = 'rgba(255,255,255,' + (0.2 + (on < 3 ? (3 - on) * 0.26 : 0)) + ')'; g.beginPath(); g.arc(cx + Math.cos(a) * 11, y0 + 126 + Math.sin(a) * 11, 2.2, 0, 7); g.fill(); }
  g.fillStyle = 'rgba(200,215,255,.55)'; g.font = '700 9px ' + FONT.ui; g.fillText('Loading synergy...', cx, y0 + 151);
  g.restore();
}
function drawDesktop(g, x0, y0, v) {
  const w = SCR.CW, hh = SCR.CH;
  g.save(); g.translate(x0, y0); g.beginPath(); g.rect(0, 0, w, hh); g.clip();
  const gr = g.createLinearGradient(0, 0, 0, hh); gr.addColorStop(0, v ? '#4a7fc0' : '#f7a35c'); gr.addColorStop(0.6, v ? '#9fc6e8' : '#ffd9a0'); gr.addColorStop(1, v ? '#3c6e4a' : '#6b8f5a'); g.fillStyle = gr; g.fillRect(0, 0, w, hh);
  g.fillStyle = v ? '#2e5a3a' : '#5a6f86'; g.beginPath(); g.moveTo(0, hh * 0.78); g.lineTo(w * 0.25, hh * 0.45); g.lineTo(w * 0.42, hh * 0.66); g.lineTo(w * 0.62, hh * 0.38); g.lineTo(w, hh * 0.76); g.lineTo(w, hh); g.lineTo(0, hh); g.fill();
  const ic = ['#27c07a', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7', '#14b8a6'];
  ic.forEach((c, i) => { g.fillStyle = c; rrect(g, 7, 6 + i * 21, 16, 16, 4); g.fill(); g.fillStyle = 'rgba(255,255,255,.9)'; g.fillRect(12, 11 + i * 21, 6, 6); });
  const wx = v ? 40 : 60, wy = 12, ww = v ? 190 : 150, wh = 108;
  g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(wx + 3, wy + 4, ww, wh); g.fillStyle = '#fff'; g.fillRect(wx, wy, ww, wh); g.fillStyle = v ? '#1d8a4a' : '#27c07a'; g.fillRect(wx, wy, ww, 13);
  g.fillStyle = '#fff'; g.font = '700 9px ' + FONT.ui; g.fillText(v ? 'Spreadsheet.xls' : 'Phone', wx + 5, wy + 10);
  if (v) { g.strokeStyle = '#ccd'; g.lineWidth = 1; for (let r = 0; r < 9; r++) { g.beginPath(); g.moveTo(wx, wy + 22 + r * 10); g.lineTo(wx + ww, wy + 22 + r * 10); g.stroke(); } for (let c = 0; c < 6; c++) { g.beginPath(); g.moveTo(wx + 20 + c * 30, wy + 13); g.lineTo(wx + 20 + c * 30, wy + wh); g.stroke(); } g.fillStyle = '#2b7'; for (let r = 0; r < 8; r++) g.fillRect(wx + 24, wy + 15 + r * 10, 10 + (r * 13) % 22, 5); }
  else { g.fillStyle = '#e8f6ee'; g.fillRect(wx + 6, wy + 18, ww - 12, 14); g.fillStyle = '#27c07a'; g.fillRect(wx + 6, wy + 18, (ww - 12) * 0.65, 14); g.fillStyle = '#2a7a8a'; g.fillRect(wx + 6, wy + 36, 46, 46); g.fillStyle = '#f6d3b3'; g.beginPath(); g.arc(wx + 29, wy + 56, 13, 0, 7); g.fill(); for (let k = 0; k < 4; k++) { g.fillStyle = k % 2 ? '#dfe7ff' : '#eaeaea'; rrect(g, wx + 58 + (k % 2) * 16, wy + 38 + k * 15, 70, 11, 4); g.fill(); } g.fillStyle = '#ef4444'; rrect(g, wx + 6, wy + 88, 50, 14, 5); g.fill(); }
  g.fillStyle = '#16181f'; g.fillRect(0, hh - 14, w, 14); for (let i = 0; i < 5; i++) { g.fillStyle = ic[i]; rrect(g, 24 + i * 16, hh - 12, 11, 10, 2); g.fill(); }
  g.fillStyle = '#27c07a'; g.font = '700 8px ' + FONT.ui; g.fillText('$1,250', w - 74, hh - 4); g.fillStyle = '#ddd'; g.fillText('4:20 PM', w - 36, hh - 4);
  g.restore();
}
function drawOff(g, x0, y0) { const w = SCR.CW, hh = SCR.CH, gr = g.createLinearGradient(x0, y0, x0 + w, y0 + hh); gr.addColorStop(0, '#16181d'); gr.addColorStop(0.45, '#22252c'); gr.addColorStop(0.5, '#2c3038'); gr.addColorStop(0.56, '#1b1d22'); gr.addColorStop(1, '#0e0f12'); g.fillStyle = gr; g.fillRect(x0, y0, w, hh); }

/* ---------- big wall leaderboard (dark red, "Keep pushing.") ---------- */
function buildLeaderboard() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 576;
  const tex = new THREE.CanvasTexture(c); tex.anisotropy = 8;
  const x = 9.9, y = 1.95, z = -5.4, w = 3.6, hh = 2.025;
  S.rbox('shiny', 0.08, hh + 0.14, w + 0.14, 0.02, x + 0.04, y, z, '#17141a');
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, hh), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  mesh.position.set(x - 0.005, y, z); mesh.rotation.y = -Math.PI / 2; W.scene.add(mesh);
  S.geo('pool', boxGeoFlat(), 9.915, y, z, '#5a1208', { sx: 2.4, sz: w + 1.8, rz: Math.PI / 2 });
  lightPool(x - 1.0, z, 2.6, 4.4, '#3a0c06');
  let sig = '';
  W.leaderboard = {
    canvas: c, tex, mesh,
    update(force) {
      const roster = Game.roster(), s = JSON.stringify(roster) + G.team + G.quota + Math.ceil(G.timeLeft) + G.phase;
      if (!force && s === sig) return; sig = s; drawLeaderboard(c.getContext('2d'), c.width, c.height, roster); tex.needsUpdate = true;
    }
  };
  W.leaderboard.update(true);
}
function drawLeaderboard(g, w, hh, roster) {
  let gr = g.createLinearGradient(0, 0, 0, hh); gr.addColorStop(0, '#5e0b0e'); gr.addColorStop(1, '#2c0507'); g.fillStyle = gr; g.fillRect(0, 0, w, hh);
  gr = g.createRadialGradient(w / 2, hh * 0.4, 50, w / 2, hh * 0.4, w * 0.7); gr.addColorStop(0, 'rgba(255,80,60,.18)'); gr.addColorStop(1, 'rgba(0,0,0,.25)'); g.fillStyle = gr; g.fillRect(0, 0, w, hh);
  g.fillStyle = 'rgba(255,255,255,.035)'; for (let y = 0; y < hh; y += 4) g.fillRect(0, y, w, 1);
  g.textBaseline = 'alphabetic'; g.textAlign = 'left'; g.fillStyle = '#ffd36b'; g.font = '64px ' + FONT.chunky; g.fillText('LEADERBOARD', 48, 86);
  g.textAlign = 'right'; g.fillStyle = '#ff9b8a'; g.font = '700 26px ' + FONT.menu; g.fillText(G.phase === 'menu' ? 'TOTALLY LEGIT INC.' : 'TODAY\'S EARNERS', w - 48, 80);
  g.fillStyle = 'rgba(255,211,107,.6)'; g.fillRect(48, 104, w - 96, 4);
  const ranks = ['1st', '2nd', '3rd', '4th', '5th', '6th'], rc = ['#ffd23f', '#e9e4dc', '#ee9a5a', '#d9a0a0'];
  const list = G.phase === 'menu' ? [] : roster.slice(0, 4);
  if (list.length) while (list.length < 3) list.push({ name: '', personal: 0, empty: true });
  if (!list.length) { g.textAlign = 'center'; g.fillStyle = '#ffb3a8'; g.font = '44px ' + FONT.slab; g.fillText('Shift starts soon.', w / 2, 290); g.font = 'italic 700 28px ' + FONT.menu; g.fillText('Keep pushing.', w / 2, 345); }
  list.forEach((p, k) => {
    const y = 176 + k * 92;
    if (p.me) { g.fillStyle = 'rgba(255,255,255,.07)'; rrect(g, 36, y - 56, w - 72, 84, 12); g.fill(); }
    if (p.empty) { g.textAlign = 'left'; g.fillStyle = 'rgba(255,190,170,.35)'; g.font = '46px ' + FONT.slab; g.fillText('{ ' + ranks[k] + ' }', 52, y); g.font = 'italic 700 30px ' + FONT.menu; g.fillText('Keep pushing.', 300, y - 4); return; }
    g.textAlign = 'left'; g.fillStyle = rc[k] || '#d9a0a0'; g.font = '46px ' + FONT.slab; g.fillText('{ ' + ranks[k] + ' }', 52, y);
    const col = p.color || SHIRTS[hashStr(p.name || '?') % SHIRTS.length]; g.fillStyle = col; g.beginPath(); g.arc(300, y - 15, 28, 0, 7); g.fill(); g.fillStyle = '#fff'; g.font = '32px ' + FONT.chunky; g.textAlign = 'center'; g.fillText((p.name || '?')[0].toUpperCase(), 300, y - 3);
    g.textAlign = 'left'; g.fillStyle = '#fff'; g.font = '800 38px ' + FONT.menu; g.fillText(p.name || 'Agent', 346, y - 10, 380);
    g.fillStyle = '#ffb3a8'; g.font = 'italic 700 22px ' + FONT.menu; g.fillText(k === 0 && p.personal > 0 ? 'Crushing it.' : 'Keep pushing.', 348, y + 18);
    g.textAlign = 'right'; g.fillStyle = '#8dff8a'; g.font = '50px ' + FONT.chunky; g.fillText(money(p.personal || 0), w - 56, y + 2);
  });
  g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, hh - 72, w, 72);
  g.textAlign = 'left'; g.font = '34px ' + FONT.chunky; g.fillStyle = '#8dff8a'; g.fillText('TEAM ' + money(G.team), 48, hh - 24);
  if (G.mode === 'week' && G.phase !== 'menu') { g.fillStyle = '#ffd23f'; g.fillText('QUOTA ' + money(G.quota), 380, hh - 24); g.textAlign = 'right'; g.fillStyle = '#ff7b6b'; g.fillText('REVIEW ' + fmtTime(G.timeLeft), w - 48, hh - 24); }
  else { g.textAlign = 'right'; g.fillStyle = '#ffd23f'; g.fillText(G.phase === 'menu' ? 'KEEP PUSHING.' : 'OVERTIME', w - 48, hh - 24); }
}

/* ---------- projector (review room) ---------- */
function buildProjector() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 576;
  const tex = new THREE.CanvasTexture(c); tex.anisotropy = 8;
  const x = 19.94, y = 1.8, z = -5.4, w = 4.0, hh = 2.25;
  S.box('shiny', 0.02, hh + 0.12, w + 0.12, x + 0.03, y, z, '#e9e6df'); S.rbox('shiny', 0.14, 0.12, w + 0.4, 0.04, x - 0.02, y + hh / 2 + 0.14, z, '#2a2a2e');
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, hh), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  mesh.position.set(x - 0.01, y, z); mesh.rotation.y = -Math.PI / 2; W.scene.add(mesh);
  // the projector hanging from the ceiling + its beam
  const px = 15.2, py = 2.82, pz = -5.4;
  S.box('small', 0.04, ROOM_H - py - 0.08, 0.04, px, (ROOM_H + py) / 2, pz, '#333'); S.rbox('shiny', 0.42, 0.14, 0.36, 0.04, px, py, pz, '#e8e6e0', { seg: 2 });
  S.cyl('shiny', 0.06, 0.06, 0.04, px + 0.22, py, pz, '#222', { rz: Math.PI / 2 }); S.cyl('glow', 0.045, 0.045, 0.01, px + 0.245, py, pz, '#fff6e0', { rz: Math.PI / 2 });
  const lx = px + 0.25, cs = [[z - w / 2, y + hh / 2], [z + w / 2, y + hh / 2], [z + w / 2, y - hh / 2], [z - w / 2, y - hh / 2]];
  const pos = [], col = [];
  for (let k = 0; k < 4; k++) { const a = cs[k], b = cs[(k + 1) % 4]; pos.push(lx, py, pz, x - 0.03, a[1], a[0], x - 0.03, b[1], b[0]); col.push(0.007, 0.0065, 0.0055, 0, 0, 0, 0, 0, 0); }
  const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); bg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const beam = new THREE.Mesh(bg, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, fog: false }));
  beam.renderOrder = 3; W.scene.add(beam);
  S.geo('pool', boxGeoFlat(), 19.988, y, z, '#4a4036', { sx: hh + 1.4, sz: w + 1.6, rz: Math.PI / 2 });
  W.projector = {
    canvas: c, tex, mesh, beam, w: c.width, h: c.height,
    draw(fn) { this._idle = fn === drawIdleSlide; const g = c.getContext('2d'); g.save(); try { fn(g, c.width, c.height); } finally { g.restore(); } tex.needsUpdate = true; },
    clear() { this.draw(drawIdleSlide); }
  };
  W.projector.clear();
}
function drawIdleSlide(g, w, hh) {
  let gr = g.createLinearGradient(0, 0, w, hh); gr.addColorStop(0, '#1f2b4a'); gr.addColorStop(1, '#0f1526'); g.fillStyle = gr; g.fillRect(0, 0, w, hh);
  g.fillStyle = 'rgba(255,255,255,.04)'; for (let i = -hh; i < w; i += 40) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 20, 0); g.lineTo(i + 20 + hh, hh); g.lineTo(i + hh, hh); g.fill(); }
  drawEmblem(g, w / 2, 200, 96);
  g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillStyle = '#f2cf7a'; g.font = '78px ' + FONT.slab; g.fillText('TOTALLY LEGIT INC.', w / 2, 388);
  g.fillStyle = '#c9d3ea'; g.font = '700 30px ' + FONT.menu; g.fillText('Customer Excellence Since Last Tuesday', w / 2, 438);
  g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(w / 2 - 260, 470, 520, 2);
  g.fillStyle = '#8f9bb8'; g.font = '700 22px ' + FONT.menu; g.fillText('QUARTERLY SYNERGY REVIEW  •  PLEASE SILENCE YOUR PHONES (KIDDING, KEEP DIALLING)', w / 2, 512, w - 80);
}

/* ---------- sunbeams + dust ---------- */
function buildSunbeams() {
  const sp = W.sun.position, tg = W.sun.target.position, D = new THREE.Vector3().subVectors(tg, sp).normalize();
  const pos = [], col = [], hit = (x, y, z) => { const s = y / -D.y; return [x + D.x * s, 0.01, z + D.z * s]; };
  for (const [a, b, y0, y1, k] of [[-8.1, -4.9, 0.95, 2.55, 0.6], [-3.8, -0.6, 0.95, 2.55, 1], [0.6, 3.8, 0.95, 2.55, 0.45], [4.9, 8.1, 0.95, 2.55, 0.8]]) {
    const x = -11.98, Wc = [[x, y1, a], [x, y1, b], [x, y0, b], [x, y0, a]], Fc = Wc.map(p => hit(p[0], p[1], p[2]));
    const quad = (i, j) => { const A = Wc[i], B = Wc[j], C = Fc[j], E = Fc[i]; pos.push(...A, ...B, ...C, ...A, ...C, ...E); const c1 = 0.07 * k, c0 = 0.0; col.push(c1, c1 * 0.62, c1 * 0.3, c1, c1 * 0.62, c1 * 0.3, c0, c0, c0, c1, c1 * 0.62, c1 * 0.3, c0, c0, c0, c0, c0, c0); };
    quad(0, 1); quad(1, 2); quad(2, 3); quad(3, 0);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, fog: false }));
  m.renderOrder = 3; W.scene.add(m); W.sunbeams = m;
  // dust motes drifting in the light
  const n = 220, dp = new Float32Array(n * 3), r = rng(5); DUST.base = [];
  for (let i = 0; i < n; i++) { const t = r(), y = 0.3 + r() * 2.3, z = -8.5 + r() * 17, s = (2.55 - y) / -D.y * t; dp[i * 3] = -11.9 + D.x * s + r() * 0.4; dp[i * 3 + 1] = y; dp[i * 3 + 2] = z; DUST.base.push(dp[i * 3], y, z, r() * 6); }
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  const dot = canvasTex(32, 32, (gg, w) => { const gr = gg.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); gg.fillStyle = gr; gg.fillRect(0, 0, w, w); });
  DUST.pts = new THREE.Points(dg, new THREE.PointsMaterial({ size: 0.03, map: dot, color: 0xffc890, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  W.scene.add(DUST.pts);
}
const DUST = { pts: null, base: null };

/* ---------- the build ---------- */
function buildOffice() {
  const PI = Math.PI;
  // --- ceiling lights (ceiling layer: W.setCeiling(false) hides them with the tiles) ---
  S.layer = 'ceil';
  for (const x of [-10.2, -7.2, -4.2, -1.2, 1.8, 4.8, 7.8]) for (const z of [-6.3, -2.7, 2.7, 6.3]) troffer(x, z);
  for (const x of [11.7, 14.7, 17.7]) troffer(x, 0, 'x');
  troffer(18, 5.4, 'z'); troffer(22.4, 0, 'z');
  pendant(13, 5.1, 1.8, 'x'); pendant(13, 7.4, 1.4, 'x');
  pendant(13.6, -3.4, 1.6, 'x'); pendant(13.6, -7.4, 1.6, 'x'); pendant(17.2, -3.4, 1.4, 'x'); pendant(17.2, -7.4, 1.4, 'x');
  for (const [x, z] of [[-9.0, -4.5], [-3.6, 4.2], [1.8, -6.6], [6.6, 1.2], [-6.6, 0.6], [12.6, 0], [15.3, -4.2], [13.2, 6.6]]) S.decal(ART.vent, 0.55, 0.55, x, ROOM_H - 0.003, z, { rx: PI / 2 });
  S.decal(ART.hole, 0.6, 0.6, -10.5, ROOM_H - 0.004, 7.5, { rx: PI / 2 }); S.box('small', 0.01, 0.5, 0.01, -10.4, ROOM_H - 0.25, 7.5, '#222'); S.box('small', 0.01, 0.35, 0.01, -10.62, ROOM_H - 0.18, 7.42, '#a33');
  S.layer = null;

  // --- main floor ---
  // north wall (z = 9): posters, filing cabinets, printer, copier, clock, fake restroom door
  poster(ART.posters[0], -9.4, 1.75, 8.985, PI); poster(ART.posters[2], -5.8, 1.75, 8.985, PI); poster(ART.posters[5], -0.6, 1.75, 8.985, PI);
  wallClock(1.9, 2.42, 8.98, PI);
  filingCabinet(-11.0, 8.6, PI, true); filingCabinet(-10.45, 8.6, PI, true); filingCabinet(-7.6, 8.6, PI, false); filingCabinet(-3.6, 8.6, PI, false); filingCabinet(3.4, 8.6, PI, true);
  copier(5.4, 8.5, PI);
  S.decal(ART.calendar, 0.32, 0.42, -7.6, 1.35, 8.985, { ry: PI });
  // restroom door (painted shut)
  S.box('shiny', 1.0, 2.15, 0.05, 8.3, 1.075, 8.97, COL.door); S.box('solid', 1.16, 0.08, 0.04, 8.3, 2.19, 8.96, COL.trim);
  for (const x of [7.76, 8.84]) S.box('solid', 0.08, 2.23, 0.04, x, 1.11, 8.96, COL.trim);
  S.box('shiny', 0.12, 0.03, 0.06, 7.95, 1.0, 8.93, '#d6c27a'); S.decal(ART.restroom, 0.5, 0.25, 8.3, 1.6, 8.94, { ry: PI });
  // south wall (between windows): posters, fan
  poster(ART.posters[1], -5.8, 1.75, -8.985, 0); poster(ART.posters[3], 4.5, 1.75, -8.985, 0); poster(ART.posters[4], 9.2, 1.75, -8.985, 0, 0.7, 0.96);
  // west wall piers: fan + extinguisher
  extinguisher(-11.99, -4.35, PI / 2);
  // east (x = 10) wall: the leaderboard (built below), notice, extinguisher, water cooler, vending
  S.decal(ART.quiet, 0.56, 0.24, 9.915, 1.55, 6.9, { ry: -PI / 2 }); poster(ART.boss, 9.915, 1.7, 4.9, -PI / 2, 0.6, 0.75);
  extinguisher(9.92, 2.4, -PI / 2);
  // plants, bins
  plant(-11.45, 8.45, 1.1); plant(-11.45, -8.45, 1, 'tall'); plant(9.45, 8.45, 1, 'tall'); plant(9.45, -8.45, 1.1);
  plant(-5.8, 8.55, 0.9, 'grey'); plant(4.4, -8.55, 0.9);
  for (const [x, z] of [[-0.6, 7.7], [-5.8, -7.75], [-11.55, 3.5], [4.2, -7.3], [4.25, 7.4], [9.5, 2.0], [-5.8, 2.6]]) bin(x, z);
  // litter: crumpled paper and stray sheets on the carpet
  const rr = rng(1234), clear = (x, z) => { for (const c of W.colliders) if (x > c.x0 - 0.15 && x < c.x1 + 0.15 && z > c.z0 - 0.15 && z < c.z1 + 0.15) return false; return Math.hypot(x - 8, z) > 1.2; };
  for (let k = 0, n = 0; k < 400 && n < 46; k++) { const x = -11.8 + rr() * 21.6, z = -8.8 + rr() * 17.6; if (!clear(x, z)) continue; n++; paperBall(x, 0, z, (rr() - 0.5) * 0.02, rr); }
  for (let k = 0, n = 0; k < 300 && n < 18; k++) { const x = -11.8 + rr() * 21.6, z = -8.8 + rr() * 17.6; if (!clear(x, z)) continue; n++; S.box('small', 0.21, 0.002, 0.297, x, 0.004, z, rr() < 0.3 ? '#fff4b8' : '#f2eee3', { ry: rr() * 6, rx: (rr() - 0.5) * 0.06 }); }
  // wall fans
  wallFan(-11.98, 2.55, 0, PI / 2); wallFan(-3.2, 2.6, 8.98, PI); wallFan(-0.6, 2.62, -8.98, 0); wallFan(9.92, 2.6, -2.35, -PI / 2);
  wallFan(12.0, 2.55, -1.885, PI); wallFan(18.0, 2.55, -1.885, PI); wallFan(10.08, 2.55, 7.4, PI / 2);

  // --- hallway ---
  S.decal(ART.logo, 2.4, 0.6, 17.3, 1.85, -1.705, {});
  S.decal(ART.exit, 0.4, 0.16, 19.94, 2.5, 0, { ry: -PI / 2 }, true); S.box('small', 0.05, 0.2, 0.44, 19.97, 2.5, 0, '#e9e4dc');
  S.decal(ART.board, 0.7, 0.18, 14.0, 2.5, -1.705, {}); S.decal(ART.breakSign, 0.7, 0.18, 12.3, 2.7, 1.705, { ry: PI });
  S.decal(ART.mat, 1.4, 0.8, 19.1, 0.012, 0, { rx: -PI / 2, rz: PI / 2 });
  vending(14.95, 1.32, PI, ART.vendCola, '#b81c1c'); vending(15.95, 1.32, PI, ART.vendSnax, '#1d4fa8');
  copier(11.3, -1.35, 0); waterCooler(12.6, -1.55, 0);
  // bench + plant
  S.rbox('wood', 1.5, 0.06, 0.42, 0.02, 17.2, 0.45, -1.48, '#8a5a3a'); for (const x of [16.6, 17.8]) S.box('shiny', 0.05, 0.42, 0.36, x, 0.21, -1.48, '#2a2a2e'); S.col(16.45, 17.95, -1.72, -1.27, 0.5);
  plant(19.45, -1.35, 0.9); extinguisher(19.99, 1.35, -PI / 2);

  // --- review room (dark, projector, red table) ---
  redTable(15.4, -5.4, 4.6, 1.5, 0);
  REVIEW_SEATS.forEach(s => officeChair(frameAt(s[0], s[1], -PI / 2), '#6c6c78'));
  for (const s of REVIEW_SEATS) aoDecal(s[0], s[1], 0.8, 0.8);
  S.decal(ART.laptop[1], 0.3, 0.19, 14.2, 0.9, -5.0, { ry: PI / 2 + 0.3, rx: -0.15 }, true); S.box('shiny', 0.32, 0.015, 0.22, 14.08, 0.79, -5.0, '#3a3c44', { ry: 0.3 });
  S.decal(ART.peg, 1.9, 1.2, 10.115, 1.6, -5.4, { ry: PI / 2 }); S.box('wood', 0.03, 1.28, 1.98, 10.095, 1.6, -5.4, '#6b4a2a');
  plant(10.55, -8.45, 1); plant(19.45, -8.5, 0.9, 'grey'); plant(10.55, -2.35, 0.8, 'grey');
  extinguisher(10.09, -3.2, PI / 2); bin(19.5, -2.3);
  S.decal(ART.incident, 0.5, 0.31, 12.2, 1.6, -8.985, {});

  // --- break room ---
  const cab = '#a29e98';
  baseCabinet(frameAt(12.15, 8.6, PI), 4.0, cab, '#ddd0b8');
  upperCabinet(frameAt(11.7, 8.82, PI, 1.95), 3.1, cab);
  S.col(10.1, 14.2, 8.25, 9, 0.92); aoDecal(12.15, 8.4, 4.4, 1.2);
  // sink
  S.box('shiny', 0.6, 0.02, 0.4, 12.6, 0.905, 8.55, '#8f969e'); S.box('small', 0.5, 0.01, 0.32, 12.6, 0.91, 8.55, '#5f666e');
  S.cyl('shiny', 0.018, 0.018, 0.3, 12.6, 1.06, 8.8, '#c9ccd2', { seg: 8 }); S.box('shiny', 0.03, 0.03, 0.2, 12.6, 1.2, 8.72, '#c9ccd2');
  microwave(frameAt(10.55, 8.62, PI), 0, 0.92, 0); microwave(frameAt(11.15, 8.62, PI), 0, 0.92, 0);
  // coffee machine (interactable)
  S.rbox('shiny', 0.28, 0.42, 0.3, 0.02, 13.5, 1.13, 8.62, '#25262b'); S.decal(ART.coffee, 0.2, 0.26, 13.5, 1.2, 8.468, { ry: PI });
  S.cyl('glass', 0.07, 0.065, 0.14, 13.5, 0.99, 8.52, '#cfe8f0'); S.cyl('small', 0.06, 0.06, 0.07, 13.5, 0.96, 8.52, '#3a2010');
  for (const [x, c] of [[13.82, '#f4f1ea'], [13.95, '#d6342c'], [13.88, '#3b82f6']]) S.cyl('small', 0.038, 0.034, 0.09, x, 0.965, 8.45 + (x * 10 % 1) * 0.1, c);
  W.interact.push({ pos: new THREE.Vector3(13.5, 1.15, 8.45), label: () => P.boost > 0 ? null : 'Drink coffee', act: () => { SFX.sip(); P.boost = 45; toast('Caffeinated. You walk faster for a bit.', 'good'); } });
  S.cyl('small', 0.06, 0.06, 0.24, 14.0, 1.12, 8.8, '#f4f4f0', { rz: PI / 2 }); // paper towels
  // toaster, dish rack, kettle
  S.rbox('shiny', 0.27, 0.17, 0.16, 0.04, 11.85, 1.005, 8.64, '#c9ccd2'); for (const dx of [-0.05, 0.05]) S.box('small', 0.035, 0.01, 0.12, 11.85 + dx, 1.09, 8.64, '#222');
  S.box('small', 0.42, 0.02, 0.3, 13.0, 0.93, 8.62, '#c9ccd2'); for (let k = 0; k < 5; k++) S.cyl('small', 0.1, 0.1, 0.012, 12.84 + k * 0.07, 1.03, 8.64, ['#f4f1ea', '#e8e2d4', '#7ec8ff'][k % 3], { rz: PI / 2, seg: 16 });
  S.cyl('shiny', 0.07, 0.08, 0.2, 14.0, 1.02, 8.5, '#2b2b2e'); S.box('shiny', 0.03, 0.12, 0.03, 14.09, 1.04, 8.5, '#2b2b2e');
  S.decal(ART.mugSign, 0.45, 0.26, 13.85, 1.65, 8.98, { ry: PI });
  fridge(14.62, 8.5, PI); fridge(15.38, 8.5, PI);
  // whiteboard ("Daily Targets") on the east wall
  const bw = 2.5, bh = 1.4;
  S.box('shiny', 0.04, bh + 0.1, bw + 0.1, 15.9, 1.6, 5.1, '#5b4a3a'); S.box('shiny', 0.08, 0.03, 1.0, 15.85, 0.88, 5.1, '#8a8f99');
  const wb = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), new THREE.MeshLambertMaterial({ map: W.boardTex })); wb.position.set(15.876, 1.6, 5.1); wb.rotation.y = -PI / 2; W.scene.add(wb); W.board = wb;
  for (const [z, c] of [[4.85, '#1d2a6b'], [4.95, '#c62828'], [5.05, '#222']]) S.cyl('small', 0.009, 0.009, 0.12, 15.83, 0.905, z, c, { rz: PI / 2 });
  extinguisher(15.92, 2.6, -PI / 2); plant(15.5, 6.95, 0.85);
  // cork board on the navy accent wall
  S.box('wood', 0.03, 1.3, 2.3, 10.1, 1.6, 5.0, '#7a5a34'); S.decal(ART.cork, 2.2, 1.22, 10.12, 1.6, 5.0, { ry: PI / 2 });
  // table + chairs + clutter
  redTable(13.0, 5.1, 2.1, 1.05, 0);
  for (const [x, z, ry] of [[12.45, 4.25, 0], [13.55, 4.25, 0.15], [12.45, 5.95, PI], [13.55, 5.95, PI - 0.2], [14.35, 5.1, -PI / 2 + 0.2]]) plasticChair(frameAt(x, z, ry + PI), '#efece6');
  S.decal(ART.laptop[0], 0.3, 0.19, 12.6, 0.9, 5.25, { ry: PI - 0.2, rx: 0.15 }, true); S.box('shiny', 0.32, 0.015, 0.22, 12.6, 0.79, 5.38, '#9aa0a8', { ry: -0.2 });
  S.box('small', 0.36, 0.04, 0.36, 13.4, 0.8, 5.0, '#d8b88a', { ry: 0.3 }); S.decal(ART.pizza, 0.35, 0.35, 13.4, 0.822, 5.0, { rx: -PI / 2, rz: 0.3 });
  S.cyl('small', 0.035, 0.03, 0.1, 13.75, 0.83, 5.35, '#f4f1ea'); S.cyl('small', 0.035, 0.03, 0.1, 12.2, 0.83, 4.85, '#3b82f6');
  // fruit bowl nobody touches
  S.cyl('small', 0.15, 0.08, 0.07, 12.95, 0.815, 4.85, '#e9e4da', { seg: 16 });
  for (const [dx, dz, c] of [[-0.05, 0, '#f08a1c'], [0.05, 0.03, '#d6342c'], [0, -0.06, '#f08a1c'], [0.02, 0.0, '#9bc53d']]) S.geo('small', fruitGeo(), 12.95 + dx, 0.88 + (c === '#9bc53d' ? 0.05 : 0), 4.85 + dz, c, { sx: 0.045, sy: 0.045, sz: 0.045 });
  // a tired couch under the cork board
  couch(10.55, 5.0, PI / 2, '#4f8a86');
  waterCooler(10.45, 2.45, PI / 2); bin(15.55, 2.3); S.cyl('two', 0.22, 0.18, 0.5, 15.55, 0.25, 7.65, '#2f7dd8', { seg: 16, open: true }); W.bins.push({ x: 15.55, z: 7.65 });
  for (let k = 0; k < 4; k++) paperBall(11 + rr() * 4, 0, 3 + rr() * 3, 0, rr);

  // --- boss office ---
  const bp = frameAt(18, 6.35, 0), bo = e => Object.assign({ p: bp }, e || {});
  S.rbox('wood', 1.8, 0.06, 0.85, 0.02, 0, 0.76, 0, '#6b4226', bo({ seg: 2 })); S.box('wood', 1.7, 0.66, 0.05, 0, 0.4, -0.38, '#5a361e', bo());
  for (const s of [-1, 1]) S.box('wood', 0.45, 0.7, 0.78, s * 0.64, 0.36, 0, '#5a361e', bo());
  S.colL(bp, -0.9, 0.9, -0.43, 0.43, 0.8); aoDecal(18, 6.35, 2.3, 1.3);
  // the monitor faces the boss (+z)
  S.rbox('shiny', 0.6, 0.38, 0.05, 0.02, -0.3, 1.1, 0.15, '#222', bo({ ry: PI })); S.box('shiny', 0.05, 0.2, 0.04, -0.3, 0.86, 0.18, '#222', bo());
  S.decal(ART.nameplate, 0.32, 0.08, 0.35, 0.83, -0.36, bo({ ry: PI, rx: 0.3 })); S.box('wood', 0.34, 0.06, 0.08, 0.35, 0.81, -0.33, '#3a2414', bo());
  S.cyl('small', 0.045, 0.04, 0.1, 0.55, 0.84, 0.12, '#ffffff', bo()); S.decal(ART.mugBoss, 0.07, 0.06, 0.55, 0.84, 0.164, bo());
  S.cyl('shiny', 0.03, 0.05, 0.16, -0.75, 0.87, -0.15, '#d9b23a', bo()); S.cyl('shiny', 0.07, 0.03, 0.1, -0.75, 1.0, -0.15, '#d9b23a', bo());
  S.decal(ART.rug, 2.6, 1.7, 18, 0.008, 5.6, { rx: -PI / 2 });
  officeChair(frameAt(18.75, 7.75, 0.5), '#3a2620');
  for (const x of [17.45, 18.55]) plasticChair(frameAt(x, 5.05, PI), '#6b2a26');
  S.decal(ART.laptop[1], 0.54, 0.32, -0.3, 1.1, 0.177, bo(), true);
  // bookshelf
  const sp = frameAt(19.75, 3.4, -PI / 2), so = e => Object.assign({ p: sp }, e || {});
  S.box('wood', 1.3, 1.9, 0.36, 0, 0.95, 0, '#5a361e', so());
  for (let k = 0; k < 4; k++) { S.box('wood', 1.22, 0.03, 0.32, 0, 0.25 + k * 0.46, 0.01, '#6b4226', so()); S.decal(ART.books, k === 2 ? 0.7 : 1.15, 0.34, k === 2 ? -0.24 : 0, 0.44 + k * 0.46, 0.15, so()); }
  S.cyl('shiny', 0.04, 0.06, 0.2, 0.36, 1.48, 0.05, '#d9b23a', so());
  S.colL(sp, -0.66, 0.66, -0.2, 0.2, 1.9);
  S.decal(ART.cert, 0.48, 0.36, 16.1, 1.75, 5.4, { ry: PI / 2 }); S.decal(ART.boss, 0.5, 0.62, 16.1, 1.75, 3.4, { ry: PI / 2 });
  plant(19.45, 8.45, 1, 'tall'); filingCabinet(16.45, 8.6, PI, false);
  S.rbox('shiny', 0.5, 0.55, 0.5, 0.02, 17.2, 0.275, 8.6, '#3a3d44'); S.cyl('shiny', 0.06, 0.06, 0.03, 17.2, 0.35, 8.34, '#c9a24a', { rx: PI / 2 }); S.col(16.95, 17.45, 8.35, 8.85, 0.55);

  // --- lobby outside the main door ---
  for (const z of [-1.1, 1.1]) {
    S.box('shiny', 0.04, 2.2, 1.0, 24.4, 1.1, z, '#b9bec6'); S.box('small', 0.01, 2.2, 0.012, 24.375, 1.1, z, '#5c626a');
    S.box('shiny', 0.06, 2.34, 0.08, 24.39, 1.17, z - 0.54, '#8a9098'); S.box('shiny', 0.06, 2.34, 0.08, 24.39, 1.17, z + 0.54, '#8a9098'); S.box('shiny', 0.06, 0.08, 1.16, 24.39, 2.3, z, '#8a9098');
    S.decal(ART.floorNum, 0.3, 0.15, 24.355, 2.5, z, { ry: -PI / 2 }, true);
  }
  S.decal(ART.elevPanel, 0.1, 0.2, 24.41, 1.2, 0, { ry: -PI / 2 }, true);
  S.decal(ART.lobbySign, 1.6, 0.4, 22.4, 1.75, 2.41, { ry: PI }); plant(24.0, -2.05, 0.9);
  // the outside of the main door: suite plaque, a polite sign, a keypad
  S.decal(ART.suite, 1.2, 0.3, 20.215, 2.66, 0, { ry: PI / 2 }); S.decal(ART.knock, 0.42, 0.3, 20.215, 1.5, 1.45, { ry: PI / 2 });
  S.box('shiny', 0.03, 0.17, 0.11, 20.215, 1.3, -1.18, '#2a2c33'); S.decal(ART.keypad, 0.09, 0.15, 20.232, 1.3, -1.18, { ry: PI / 2 }, true);
  // a hard waiting bench nobody waits on
  S.rbox('wood', 1.4, 0.06, 0.4, 0.02, 22.6, 0.45, -2.22, '#8a5a3a'); for (const x of [22.05, 23.15]) S.box('shiny', 0.05, 0.42, 0.34, x, 0.21, -2.22, '#2a2a2e'); S.col(21.9, 23.3, -2.45, -2.0, 0.5);
  S.box('small', 0.22, 0.01, 0.3, 22.3, 0.485, -2.2, '#d6342c', { ry: 0.2 }); S.box('small', 0.2, 0.012, 0.28, 22.85, 0.488, -2.25, '#2f6fd6', { ry: -0.3 });   // magazines

  // --- grime and odds and ends ---
  // security cameras (spots for the CCTV app)
  W.cctvSpots = [
    { id: 'floor', label: 'Call floor', pos: [8.6, 3.0, -8.4], look: [-4, 0.6, 2] }, { id: 'floorW', label: 'Call floor (west)', pos: [-11.4, 3.0, 8.4], look: [0, 0.5, -3] },
    { id: 'hall', label: 'Hallway', pos: [10.6, 2.95, -1.4], look: [20, 0.8, 0.4] }, { id: 'break', label: 'Break room', pos: [10.6, 2.95, 2.3], look: [15, 0.6, 7.5] },
    { id: 'review', label: 'Review room', pos: [10.6, 2.95, -8.4], look: [19, 0.8, -4] }, { id: 'lobby', label: 'Entrance', pos: [23.9, 2.95, 2.0], look: [20, 0.6, -0.5] }];
  S.layer = 'ceil';
  for (const c of W.cctvSpots) { const [x, y, z] = c.pos; S.box('shiny', 0.14, 0.05, 0.14, x, ROOM_H - 0.025, z, '#e8e4dc'); S.geo('shiny', domeGeo(), x, ROOM_H - 0.05, z, '#1c1d22', { rx: PI }); S.box('glow', 0.012, 0.012, 0.012, x + 0.06, ROOM_H - 0.07, z, '#ff2a2a'); }
  S.layer = null;
  // cardboard boxes by the copier and in the hallway corner
  for (const [x, y, z, ry] of [[6.5, 0.2, 8.55, 0.1], [6.55, 0.6, 8.6, -0.15], [7.1, 0.2, 8.6, 0.3], [-11.5, 0.2, -2.4, 1.4], [-11.45, 0.6, -2.35, 1.2]]) { S.box('solid', 0.5, 0.4, 0.38, x, y, z, '#c49a62', { ry }); S.decal(ART.box, 0.4, 0.3, x + Math.sin(ry) * 0.192, y, z + Math.cos(ry) * 0.192, { ry: ry }); }
  S.col(6.2, 7.4, 8.3, 8.9, 0.8); S.col(-11.8, -11.2, -2.7, -2.1, 0.8);
  // a toppled chair and a lonely mug on the floor
  officeChair(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(PI / 2 - 0.12, 0.6, 0, 'YXZ')).setPosition(-11.2, 0.27, 6.6));
  S.cyl('small', 0.042, 0.038, 0.1, -10.8, 0.042, 5.9, '#d6342c', { rz: PI / 2, ry: 0.7 });
  // coffee rings on some desks
  W.desks.forEach(d => { if (d.i % 3 === 1) { const p = frameAt(d.x, d.z, d.rot); S.decal(ART.stain, 0.09, 0.09, 0.4 - (d.i % 5) * 0.12, 0.7685, 0.25, { p, rx: -PI / 2 }); } });

  // --- dynamic pieces ---
  buildScreens(); buildLeaderboard(); buildProjector(); buildSunbeams();
}

/* ---------- per-frame: fans, clock, screens, leaderboard, dust ---------- */
let _scrT = 0, _autoT = 0, _lbT = 0, _tzT = -1, _tz = 0;
Loop.add((dt, t) => {
  for (const f of FANS) { f.blades.rotation.z -= dt * f.sp; f.head.rotation.y = Math.sin(t * 0.45 + f.ph) * 0.55; }
  if (CLOCK) {   // local time without a Date object per frame (the time-zone offset is refreshed once a minute)
    if (t - _tzT > 60 || _tzT < 0) { _tzT = t; _tz = new Date().getTimezoneOffset() * 60000; }
    const ms = Date.now() - _tz, s = ms / 1000 % 60, m = ms / 60000 % 60, h = ms / 3600000 % 12;
    CLOCK.s.rotation.z = -s / 60 * Math.PI * 2; CLOCK.m.rotation.z = -m / 60 * Math.PI * 2; CLOCK.h.rotation.z = -h / 12 * Math.PI * 2;
  }
  if (!SCR.mesh) return;
  const hid = OS.open && P.seated && !P.cam;   // the desktop covers the 3D view (the main render is skipped)
  // the screen atlas (1024x512 canvas + upload): 10x a second, 5x on low quality, not while hidden or in the review room
  _scrT += dt; if (_scrT > (settings.quality === 'low' ? 0.2 : 0.1)) { _scrT = 0; SCR.t = t; if (!hid && P.review < 0) drawScreens(t); }
  _autoT += dt; if (_autoT > 0.2) { _autoT = 0; autoScreens(); }
  _lbT += dt; if (_lbT > 1 && W.leaderboard && !hid && P.review < 0) { _lbT = 0; W.leaderboard.update(); }   // 1024x576 redraw with the countdown
  if (DUST.pts && !hid) {
    const a = DUST.pts.geometry.attributes.position, b = DUST.base;
    for (let i = 0; i < a.count; i++) { const k = i * 4; a.array[i * 3] = b[k] + Math.sin(t * 0.13 + b[k + 3]) * 0.25; a.array[i * 3 + 1] = b[k + 1] + Math.sin(t * 0.21 + b[k + 3] * 2) * 0.15; a.array[i * 3 + 2] = b[k + 2] + Math.cos(t * 0.11 + b[k + 3]) * 0.25; }
    a.needsUpdate = true;
  }
});
Bus.on('fonts:ready', () => { if (SCR.g) { drawDesktop(SCR.g, SCR.CW, SCR.CH, 0); drawDesktop(SCR.g, SCR.CW * 2, SCR.CH, 1); } if (W.leaderboard) W.leaderboard.update(true); if (W.projector && W.projector._idle) W.projector.clear(); });
Bus.on('day:start', () => { if (W.leaderboard) W.leaderboard.update(true); });
Bus.on('earn', () => { if (W.leaderboard) W.leaderboard.update(true); });

/* ---------- warm colour grade over the 3D view (CSS: filter + vignette + tint) ---------- */
Bus.on('world:built', () => {
  const st = document.createElement('style');
  st.textContent = '#gl{filter:saturate(1.12) contrast(1.05)}body.q-low #gl{filter:none}' +
    '#gl-grade{position:fixed;inset:0;pointer-events:none;z-index:1;background:radial-gradient(ellipse 75% 70% at 50% 46%,rgba(0,0,0,0) 55%,rgba(28,10,0,.42) 100%)}' +
    '#gl-tint{position:fixed;inset:0;pointer-events:none;z-index:1;background:linear-gradient(180deg,rgba(255,150,70,.10),rgba(255,120,50,.06));mix-blend-mode:soft-light}' +
    'body.q-low #gl-tint{display:none}';
  document.head.append(st);
  const gl = $('#gl'); gl.after(h('div', { id: 'gl-tint' })); gl.after(h('div', { id: 'gl-grade' }));
  document.body.classList.toggle('q-low', settings.quality === 'low');
});
Bus.on('quality', q => document.body.classList.toggle('q-low', q === 'low'));

/* ---------- main-menu camera: a slow glide over the warm call floor ---------- */
/* W.camOverride = { pos: [x, y, z], look: [x, y, z] } pins the camera (cutscenes, screenshots); null releases it */
Loop.add((dt, t) => {
  if (!W.camera) return;
  const o = W.camOverride; if (o) { W.camera.position.set(o.pos[0], o.pos[1], o.pos[2]); W.camera.lookAt(o.look[0], o.look[1], o.look[2]); return; }
  if (G.phase !== 'menu') return;
  const c = W.camera, k = t * 0.045;
  c.position.set(9.2 + Math.sin(k) * 0.35, 2.6 + Math.sin(k * 1.7) * 0.06, -7.6 + Math.sin(k * 0.8) * 0.6);
  c.rotation.set(0, 0, 0); c.lookAt(-3 + Math.sin(k * 0.6) * 2, 0.55, 1.4 + Math.cos(k * 0.7) * 1.5);
});
