'use strict';
/* CAMERA app — the little webcam on top of your monitor, looking back at you: your own avatar typing at the
   desk, the cubicle behind you and anyone walking past or leaning in. "▲ Show" opens a strip of silly webcam
   effects. Rendering goes through Cams (cams.js, loaded later: only used lazily). */
const CamApp = {
  cam: null, win: null, cv: null, g: null, tiny: null, bgs: {}, fxT: 0, freeze: 0, sparks: null, _p: {}, _q: {}, _v: null,
  W: 480, H: 270, POS: [-0.012, 1.63, -0.44], LOOK: [0, 1.12, 0.8], FOV: 70, NEAR: 0.32,
  FX: [
    { id: 'none', name: 'No effect', svg: '<circle cx="24" cy="24" r="14" fill="none" stroke="#fff" stroke-width="4"/><path d="M14 34L34 14" stroke="#fff" stroke-width="4" stroke-linecap="round"/>' },
    { id: 'pro', name: 'Professional background', svg: '<rect x="7" y="9" width="34" height="30" rx="3" fill="#8a5a3a"/><rect x="10" y="12" width="28" height="7" fill="#d9a066"/><rect x="11" y="13" width="4" height="6" fill="#e5383b"/><rect x="16" y="13" width="3" height="6" fill="#2f7cf6"/><rect x="20" y="14" width="5" height="5" fill="#ffd23b"/><rect x="10" y="22" width="28" height="7" fill="#d9a066"/><circle cx="31" cy="26" r="3" fill="#3fa34d"/><rect x="12" y="23" width="9" height="6" fill="#fff"/><circle cx="24" cy="36" r="7" fill="#f2c4a0"/>' },
    { id: 'boss', name: 'Boss mode', svg: '<path d="M8 20h32v4H8z" fill="#111"/><path d="M10 22h12v8H12zM26 22h12l-2 8H26z" fill="#111"/><path d="M13 24h3v2h-3zM29 24h3v2h-3z" fill="#fff"/><path d="M12 36q12 8 24 0" fill="none" stroke="#ffcf3a" stroke-width="3.5" stroke-dasharray="3 2"/>' },
    { id: 'beauty', name: 'Beauty filter', svg: '<path d="M24 8l3 9 9 3-9 3-3 9-3-9-9-3 9-3z" fill="#ffd1e8"/><path d="M36 28l1.6 4.4L42 34l-4.4 1.6L36 40l-1.6-4.4L30 34l4.4-1.6z" fill="#fff"/><path d="M14 30c-3-3-8 0-5 4l5 5 5-5c3-4-2-7-5-4z" fill="#ff5b9a"/>' },
    { id: 'potato', name: 'Potato quality', svg: '<ellipse cx="24" cy="25" rx="15" ry="12" fill="#c9965a"/><circle cx="18" cy="22" r="1.6" fill="#7a5530"/><circle cx="28" cy="29" r="1.8" fill="#7a5530"/><circle cx="31" cy="20" r="1.3" fill="#7a5530"/><rect x="8" y="8" width="5" height="5" fill="#fff" opacity=".7"/><rect x="35" y="35" width="5" height="5" fill="#fff" opacity=".7"/>' },
    { id: 'night', name: 'Night vision', svg: '<circle cx="16" cy="24" r="8" fill="none" stroke="#7dff6a" stroke-width="4"/><circle cx="32" cy="24" r="8" fill="none" stroke="#7dff6a" stroke-width="4"/><path d="M24 22v4" stroke="#7dff6a" stroke-width="3"/><circle cx="16" cy="24" r="3" fill="#7dff6a"/><circle cx="32" cy="24" r="3" fill="#7dff6a"/>' }
  ],
  fx() { return settings.camFx && this.FX.some(f => f.id === settings.camFx) ? settings.camFx : 'none'; },
  BGS: ['Home office', 'Beach', 'Skyline'],
  setFx(id) {
    settings.camFx = id; saveSettings(); this.fxT = W.t || 0; SFX.click(); this.freeze = 0;
    if (id === 'pro') this.bgIdx = ((this.bgIdx || 0) + (this._lastFx === 'pro' ? 1 : 0)) % 3;   // click again: next backdrop
    this._lastFx = id;
    if (this.win) { this.win.el.dataset.fx = id; this.win.el.querySelectorAll('.cam-chip').forEach(c => c.classList.toggle('on', c.dataset.fx === id)); this.showBadge(id); }
  },
  showBadge(id) { const n = this.FX.find(f => f.id === id); this.badge.textContent = id === 'none' ? '' : id === 'pro' ? 'Background: ' + this.BGS[this.bgIdx || 0] : n.name; this.badge.classList.toggle('show', id !== 'none'); },
  visible() { const w = this.win; return !!(w && OS.open && P.seated && !P.cam && OS.wins.get('camera') === w && !w.el.classList.contains('min')); },
  ensure() {
    if (this.cam || typeof Cams === 'undefined') return this.cam;
    this.cam = Cams.create({ w: this.W, h: this.H, fps: 12, fov: this.FOV, near: 0.03, me: true, tags: false, visible: () => this.visible(), before: c => this.place(c), onFrame: c => this.draw(c) });
    this._v = new THREE.Vector3(); return this.cam;
  },
  /* aim from the webcam on top of the monitor (desk-local (0, 1.39, -0.21), facing the chair). The virtual lens sits a bit
     behind and above it, looking down at you, and the near plane clips the monitor away */
  place(c) {
    const d = W.desks[P.seat]; if (!P.seated || !d) return false;
    const s = Math.sin(d.rot), co = Math.cos(d.rot), v = this._v, fx = this.fx();
    const A = this.POS, B = this.LOOK;
    c.cam.position.set(d.x + co * A[0] + s * A[2], A[1], d.z - s * A[0] + co * A[2]);
    v.set(d.x + co * B[0] + s * B[2], B[1], d.z - s * B[0] + co * B[2]); c.cam.lookAt(v);
    if (fx === 'potato') c.cam.rotation.z += Math.sin(W.t * 1.7) * 0.02;
    const far = fx === 'pro' ? 1.95 : 40; if (c.cam.far !== far || c.cam.near !== this.NEAR) { c.cam.far = far; c.cam.near = this.NEAR; c.cam.updateProjectionMatrix(); }
    c.alpha = fx === 'pro'; c.fps = fx === 'potato' ? 5 : 12;
    if (fx === 'potato' && this.freeze > 0) { this.freeze--; return false; }
    if (fx === 'potato' && Math.random() < 0.03) this.freeze = 6 + Math.floor(Math.random() * 8);
    return true;
  },
  /* compose the frame + effect overlays on the visible canvas */
  draw(c) {
    const g = this.g, w = this.W, hh = this.H, fx = this.fx(), t = W.t || 0; if (!g) return;
    g.save(); g.imageSmoothingEnabled = true; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.filter = 'none';
    if (fx === 'pro') { g.drawImage(this.backdrop(this.bgIdx || 0), 0, 0, w, hh); g.drawImage(c.canvas, 0, 0); }
    else if (fx === 'potato') {
      if (!this.tiny) { this.tiny = document.createElement('canvas'); this.tiny.width = 60; this.tiny.height = 34; }
      const tg = this.tiny.getContext('2d'); tg.drawImage(c.canvas, 0, 0, 60, 34); g.imageSmoothingEnabled = false; g.drawImage(this.tiny, 0, 0, w, hh);
    } else g.drawImage(c.canvas, 0, 0);
    g.restore();
    if (fx === 'boss') this.drawBoss(g, c, t);
    else if (fx === 'beauty') this.drawBeauty(g, c, t);
    else if (fx === 'night') this.drawNight(g, t);
    else if (fx === 'potato') this.drawPotato(g, t);
    else if (fx === 'pro') {   // a lower third, like a real meeting app
      g.save(); g.fillStyle = 'rgba(12,16,28,.62)'; g.beginPath(); g.roundRect(10, hh - 46, 300, 34, 5); g.fill(); g.fillStyle = '#ffb02e'; g.fillRect(10, hh - 46, 4, 34);
      g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillStyle = '#fff'; g.font = '700 14px Roboto, sans-serif'; g.fillText(settings.name || 'Agent', 22, hh - 30);
      g.fillStyle = '#c9d2e3'; g.font = '500 10px Roboto, sans-serif'; g.fillText('Senior Trust Associate · Totally Legit Inc.', 22, hh - 17); g.restore();
    }
  },
  /* head / chest points of your avatar in canvas pixels */
  pt(c, bone, x, y, z, out) { const v = this._v; bone.localToWorld(v.set(x, y, z)); return c.project(v, out); },
  drawBoss(g, c, t) {
    const me = W.me; if (!me) return;
    const L = this.pt(c, me.head, -0.17, 0.3, -0.2, this._p), R = this.pt(c, me.head, 0.17, 0.3, -0.2, this._q);
    if (L.ok && R.ok) {
      const cx = (L.x + R.x) / 2, cy = (L.y + R.y) / 2, ww = Math.hypot(R.x - L.x, R.y - L.y) * 1.08, a = Math.atan2(R.y - L.y, R.x - L.x), u = ww / 16;
      g.save(); g.translate(cx, cy); g.rotate(a); g.fillStyle = '#0d0d0f';
      // pixel shades: a bar and two chunky lenses with white glints
      g.fillRect(-8 * u, -2 * u, 16 * u, u); g.fillRect(-7 * u, -u, 6 * u, 2 * u); g.fillRect(-6 * u, u, 4 * u, u); g.fillRect(1 * u, -u, 6 * u, 2 * u); g.fillRect(2 * u, u, 4 * u, u);
      g.fillRect(-9 * u, -2 * u, u, u); g.fillRect(8 * u, -2 * u, u, u);
      g.fillStyle = '#fff'; g.fillRect(-6 * u, -u, u, u); g.fillRect(-5 * u, 0, u, u); g.fillRect(2 * u, -u, u, u); g.fillRect(3 * u, 0, u, u);
      g.restore();
    }
    // gold chain across the chest
    const a1 = this.pt(c, me.chest, -0.13, 0.26, -0.11, {}), a2 = this.pt(c, me.chest, 0, 0.1, -0.2, {}), a3 = this.pt(c, me.chest, 0.13, 0.26, -0.11, {});
    if (a1.ok && a3.ok) {
      const n = 14, r = Math.max(2.5, Math.hypot(a3.x - a1.x, a3.y - a1.y) / 30);
      for (let i = 0; i <= n; i++) {
        const k = i / n, x = (1 - k) * (1 - k) * a1.x + 2 * k * (1 - k) * (a2.x * 2 - (a1.x + a3.x) / 2) + k * k * a3.x, y = (1 - k) * (1 - k) * a1.y + 2 * k * (1 - k) * (a2.y * 2 - (a1.y + a3.y) / 2) + k * k * a3.y;
        g.beginPath(); g.ellipse(x, y, r * 1.3, r, i % 2 ? 0.6 : -0.6, 0, 7); g.fillStyle = i % 2 ? '#ffcf3a' : '#f2a91e'; g.fill(); g.lineWidth = 1; g.strokeStyle = '#8a5a00'; g.stroke();
      }
      const k = 0.5, mx = (a1.x + a3.x) / 4 + a2.x / 2 + (a2.x - (a1.x + a3.x) / 2) * 0.5, my = (1 - k) * (1 - k) * a1.y + 2 * k * (1 - k) * (a2.y * 2 - (a1.y + a3.y) / 2) + k * k * a3.y;
      g.save(); g.font = '900 ' + Math.round(r * 5) + 'px "Lilita One", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'top'; g.fillStyle = '#ffcf3a'; g.strokeStyle = '#6b4300'; g.lineWidth = 2; g.strokeText('$', mx, my + r); g.fillText('$', mx, my + r); g.restore();
    }
    const w = this.W, hh = this.H;
    g.save(); g.font = '32px "Lilita One", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.lineJoin = 'round'; g.lineWidth = 7; g.strokeStyle = '#1a1205'; g.strokeText('BOSS MODE', w / 2, hh - 14);
    const gr = g.createLinearGradient(0, hh - 44, 0, hh - 14); gr.addColorStop(0, '#fff3a0'); gr.addColorStop(0.5, '#ffcf3a'); gr.addColorStop(1, '#e89a10'); g.fillStyle = gr; g.fillText('BOSS MODE', w / 2, hh - 14); g.restore();
  },
  drawBeauty(g, c, t) {
    const w = this.W, hh = this.H, me = W.me;
    const vg = g.createRadialGradient(w / 2, hh / 2, hh * 0.35, w / 2, hh / 2, w * 0.62); vg.addColorStop(0, 'rgba(255,170,210,0)'); vg.addColorStop(1, 'rgba(255,140,200,.55)'); g.fillStyle = vg; g.fillRect(0, 0, w, hh);
    if (!this.sparks) this.sparks = Array.from({ length: 16 }, () => [Math.random(), Math.random(), Math.random() * 6, 0.6 + Math.random()]);
    g.save(); g.fillStyle = '#fff';
    for (const s of this.sparks) {
      const k = 0.5 + 0.5 * Math.sin(t * 3 * s[3] + s[2]), x = s[0] * w, y = s[1] * hh, r = 3 + k * 7; g.globalAlpha = 0.25 + k * 0.75;
      g.beginPath(); g.moveTo(x, y - r); g.quadraticCurveTo(x, y, x + r, y); g.quadraticCurveTo(x, y, x, y + r); g.quadraticCurveTo(x, y, x - r, y); g.quadraticCurveTo(x, y, x, y - r); g.fill();
    }
    g.restore();
    if (me) {   // rosy cheeks + floating hearts round the face
      const L = this.pt(c, me.head, -0.12, 0.22, -0.2, this._p), R = this.pt(c, me.head, 0.12, 0.22, -0.2, this._q);
      if (L.ok && R.ok) {
        const r = Math.hypot(R.x - L.x, R.y - L.y) * 0.22; g.save(); g.fillStyle = 'rgba(255,80,130,.32)'; g.filter = 'blur(3px)';
        [L, R].forEach(p => { g.beginPath(); g.ellipse(p.x, p.y, r * 1.3, r * 0.8, 0, 0, 7); g.fill(); }); g.restore();
        g.save(); g.font = Math.round(r * 2.2) + 'px sans-serif'; g.textAlign = 'center';
        const side = R.x < L.x ? -1 : 1;   // hearts float up beside the head (the webcam sees you mirrored)
        for (let i = 0; i < 3; i++) { const k = (t * 0.35 + i / 3) % 1; g.globalAlpha = Math.sin(k * Math.PI); g.fillStyle = '#ff4f8f'; this.heart(g, R.x + side * r * (4.2 + Math.sin(t * 2 + i)), R.y - k * r * 9, r * 0.9); }
        g.restore();
      }
    }
    g.save(); g.font = '24px "Lilita One", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.lineWidth = 5; g.lineJoin = 'round'; g.strokeStyle = '#c2185b'; g.fillStyle = '#fff';
    g.strokeText('✦ flawless ✦', w / 2, hh - 14); g.fillText('✦ flawless ✦', w / 2, hh - 14); g.restore();
  },
  heart(g, x, y, s) { g.beginPath(); g.moveTo(x, y + s * 0.9); g.bezierCurveTo(x - s * 1.6, y - s * 0.2, x - s * 0.6, y - s * 1.3, x, y - s * 0.4); g.bezierCurveTo(x + s * 0.6, y - s * 1.3, x + s * 1.6, y - s * 0.2, x, y + s * 0.9); g.fill(); },
  drawNight(g, t) {
    const w = this.W, hh = this.H;
    g.save(); g.fillStyle = 'rgba(0,0,0,.22)'; for (let y = 0; y < hh; y += 3) g.fillRect(0, y, w, 1);
    g.fillStyle = 'rgba(255,255,255,.18)'; for (let i = 0; i < 260; i++) g.fillRect(Math.random() * w, Math.random() * hh, 1.5, 1.5);
    const vg = g.createRadialGradient(w / 2, hh / 2, hh * 0.25, w / 2, hh / 2, w * 0.55); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(0.8, 'rgba(0,0,0,.55)'); vg.addColorStop(1, 'rgba(0,0,0,.95)'); g.fillStyle = vg; g.fillRect(0, 0, w, hh);
    g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1.5; const cx = w / 2, cy = hh / 2;
    g.beginPath(); g.moveTo(cx - 18, cy); g.lineTo(cx - 6, cy); g.moveTo(cx + 6, cy); g.lineTo(cx + 18, cy); g.moveTo(cx, cy - 18); g.lineTo(cx, cy - 6); g.moveTo(cx, cy + 6); g.lineTo(cx, cy + 18); g.stroke();
    g.font = '700 12px "Roboto Mono", Consolas, monospace'; g.fillStyle = '#fff'; g.textBaseline = 'bottom'; g.textAlign = 'left';
    g.fillText('NV-3000  IR ON  GAIN +24dB', 14, hh - 12); g.textAlign = 'right'; g.fillText((Math.floor(t * 2) % 2 ? '● ' : '  ') + 'REC ' + fmtTime(t), w - 14, hh - 12); g.restore();
  },
  drawPotato(g, t) {
    const w = this.W, hh = this.H;
    const y0 = hh - 36; g.save(); g.fillStyle = 'rgba(0,0,0,.55)'; g.beginPath(); g.roundRect(10, y0, 150, 26, 6); g.fill();
    for (let i = 0; i < 4; i++) { g.fillStyle = i < 1 ? '#ff5252' : 'rgba(255,255,255,.3)'; g.fillRect(20 + i * 7, y0 + 19 - i * 4, 5, 4 + i * 4); }
    g.font = '700 12px Roboto, sans-serif'; g.fillStyle = '#fff'; g.textBaseline = 'middle'; g.textAlign = 'left'; g.fillText('Poor connection', 54, y0 + 13);
    if (this.freeze > 0) { g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(0, 0, w, hh); g.fillStyle = '#fff'; g.font = '700 16px Roboto, sans-serif'; g.textAlign = 'center'; g.fillText('Reconnecting' + '...'.slice(0, 1 + Math.floor(t * 3) % 3), w / 2, hh / 2); }
    g.restore();
  },
  /* fake "professional" backgrounds (drawn once, slightly blurred like the real thing) */
  backdrop(i) {
    if (this.bgs[i]) return this.bgs[i];
    const w = this.W, hh = this.H, c = document.createElement('canvas'); c.width = w; c.height = hh; const g = c.getContext('2d'), r = rng(31 + i * 7);
    if (i === 0) {   // home office: bookshelf, plant, framed diploma
      g.fillStyle = '#d9c7a8'; g.fillRect(0, 0, w, hh); g.fillStyle = '#c7b08c'; g.fillRect(0, hh * 0.78, w, hh);
      g.fillStyle = '#6b4226'; g.fillRect(250, 20, 210, 230);
      for (let s = 0; s < 4; s++) { const y = 30 + s * 56; g.fillStyle = '#4a2c18'; g.fillRect(258, y, 194, 48); let x = 262; while (x < 440) { const bw = 8 + r() * 14, bh = 30 + r() * 16; g.fillStyle = ['#c0392b', '#2f6fd6', '#e8b33a', '#2b9a5a', '#8e44ad', '#ecf0f1', '#d35400'][Math.floor(r() * 7)]; g.fillRect(x, y + 48 - bh, bw, bh); x += bw + 2; } g.fillStyle = '#7d5232'; g.fillRect(254, y + 48, 202, 6); }
      g.fillStyle = '#fbf6e8'; g.fillRect(40, 40, 120, 86); g.strokeStyle = '#a2742e'; g.lineWidth = 7; g.strokeRect(40, 40, 120, 86); g.fillStyle = '#7a2f2f'; g.font = '700 12px Georgia, serif'; g.textAlign = 'center'; g.fillText('CERTIFIED', 100, 72); g.fillText('TRUSTWORTHY', 100, 90); g.beginPath(); g.arc(100, 108, 8, 0, 7); g.fillStyle = '#d4a017'; g.fill();
      g.fillStyle = '#b5653a'; g.fillRect(170, 180, 50, 60); for (let k = 0; k < 9; k++) { g.save(); g.translate(195, 182); g.rotate(-1.3 + k * 0.32); g.fillStyle = k % 2 ? '#3f8f3a' : '#56ab48'; g.beginPath(); g.ellipse(0, -40, 9, 40, 0, 0, 7); g.fill(); g.restore(); }
    } else if (i === 1) {   // tropical beach
      let gr = g.createLinearGradient(0, 0, 0, hh); gr.addColorStop(0, '#5bc0f8'); gr.addColorStop(0.55, '#bfe9ff'); gr.addColorStop(0.56, '#1fa2c9'); gr.addColorStop(0.72, '#5fd0d8'); gr.addColorStop(0.73, '#f3dca2'); gr.addColorStop(1, '#e8c47c'); g.fillStyle = gr; g.fillRect(0, 0, w, hh);
      g.fillStyle = '#fff7c2'; g.beginPath(); g.arc(380, 60, 28, 0, 7); g.fill();
      for (const [x, s] of [[60, 1], [430, -1]]) { g.strokeStyle = '#7a5230'; g.lineWidth = 10; g.beginPath(); g.moveTo(x, hh); g.quadraticCurveTo(x + s * 30, hh * 0.6, x + s * 10, 70); g.stroke(); for (let k = 0; k < 6; k++) { g.save(); g.translate(x + s * 10, 70); g.rotate(k * 1.05); g.fillStyle = '#2f9a48'; g.beginPath(); g.ellipse(36, 0, 38, 8, 0.3, 0, 7); g.fill(); g.restore(); } }
      g.fillStyle = '#fff'; [[150, 50], [250, 80]].forEach(([x, y]) => { g.beginPath(); g.ellipse(x, y, 30, 10, 0, 0, 7); g.ellipse(x + 20, y - 6, 20, 9, 0, 0, 7); g.fill(); });
    } else {   // corporate HQ skyline
      let gr = g.createLinearGradient(0, 0, 0, hh); gr.addColorStop(0, '#1e3a6e'); gr.addColorStop(1, '#f39c5a'); g.fillStyle = gr; g.fillRect(0, 0, w, hh);
      for (let k = 0; k < 16; k++) { const bw = 24 + r() * 30, bh = 60 + r() * 150, x = k * 32 - 10; g.fillStyle = '#16213a'; g.fillRect(x, hh - bh, bw, bh); g.fillStyle = 'rgba(255,214,120,.8)'; for (let yy = hh - bh + 8; yy < hh - 8; yy += 12) for (let xx = x + 5; xx < x + bw - 5; xx += 9) if (r() < 0.45) g.fillRect(xx, yy, 4, 6); }
      g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(0, 0, w, hh); g.strokeStyle = 'rgba(40,30,30,.85)'; g.lineWidth = 10; g.strokeRect(0, 0, w, hh); g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, hh); g.stroke();
    }
    const out = document.createElement('canvas'); out.width = w; out.height = hh; const og = out.getContext('2d'); og.filter = 'blur(2.5px)'; og.drawImage(c, -6, -6, w + 12, hh + 12);
    return (this.bgs[i] = out);
  },
  render(b, win) {
    this.win = win; this.ensure(); b.classList.add('cam-body'); win.el.dataset.fx = this.fx();
    this.cv = h('canvas', { class: 'cam-cv', width: this.W, height: this.H }); this.g = this.cv.getContext('2d');
    this.g.fillStyle = '#0b0c10'; this.g.fillRect(0, 0, this.W, this.H); this.g.fillStyle = '#8b93a5'; this.g.font = '600 14px Roboto, sans-serif'; this.g.textAlign = 'center'; this.g.fillText('Starting camera…', this.W / 2, this.H / 2);
    this.badge = h('div', { class: 'cam-badge' });
    const strip = h('div', { class: 'cam-fx' }, ...this.FX.map(f => h('button', { class: 'cam-chip' + (f.id === this.fx() ? ' on' : ''), 'data-fx': f.id, title: f.name, onclick: () => this.setFx(f.id) },
      h('i', { html: '<svg viewBox="0 0 48 48">' + f.svg + '</svg>' }), h('span', {}, f.name))));
    const tab = h('button', { class: 'cam-tab', onclick: () => { const on = win.el.classList.toggle('fxopen'); tab.innerHTML = on ? '&#9660; Hide' : '&#9650; Show'; SFX.click(); if (OS.clampWin) OS.clampWin(win); } }, '▲ Show');
    b.append(h('div', { class: 'cam-view' }, this.cv, h('div', { class: 'cam-live' }, h('i'), 'LIVE'), this.badge), h('div', { class: 'cam-bar' }, tab), strip);
    this.showBadge(this.fx());
    if (this.cam) { this.cam.on = true; this.cam.last = -1e9; }
  },
  close(win) { if (this.win === win) this.win = null; }
};
OS.apps.camera = {
  desktop: true, order: 15, available: () => true, title: 'Camera', icon: 'camera', emoji: '📷', color: '#1f2329',
  w: 560, x: 0.555, y: 0.03, cls: 'camwin',
  render: (b, w) => CamApp.render(b, w), onClose: w => CamApp.close(w)
};
if (!OS.pinned.includes('camera')) OS.pinned.push('camera');
