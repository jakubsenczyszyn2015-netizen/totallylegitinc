'use strict';
/* FX — particles and screen effects (spray, smoke, stars, confetti, fire, explosions, shake).
   - particles: three pooled instanced quad layers (cut = crisp cartoon, soft = alpha, add = glow) -> 3 draw calls total
   - liquid streams: camera-facing ribbons that follow ballistic nodes (one draw call per active stream)
   - floor decals (splats, puddles, scorch marks): one InstancedMesh
   - speech bubbles over avatars, screen shake / flash / tint, procedural sounds (added to SFX)
   - Space: shared static collision queries (ground height, solids, rays) used by FX, props and the camera
   See docs/modules/props.md for the public API. */

/* ---------- Space: static collision helpers (desk tops, colliders, floor) ---------- */
const Space = {
  DESK_TOP: 0.77, TALL: 1.25, cells: null, x0: 0, z0: 0, nx: 0, nz: 0, _n: -1, _t: 0, surf: [],
  /* rebuild the grid when colliders change (doors open/close) — cheap, called lazily */
  sync(force) {
    const t = now();
    if (!force && this.cells && W.colliders.length === this._n && t - this._t < 1.5) return;
    this._n = W.colliders.length; this._t = t;
    const surf = [];
    for (const d of W.desks) {
      const s = Math.abs(Math.sin(d.rot || 0)) > 0.5, hw = s ? 0.4 : 0.9, hd = s ? 0.9 : 0.4;
      surf.push({ x0: d.x - hw, x1: d.x + hw, z0: d.z - hd, z1: d.z + hd, y1: this.DESK_TOP, desk: true });
    }
    this.surf = surf;
    let x0 = -14, x1 = 26, z0 = -12, z1 = 12;
    for (const c of W.colliders) { x0 = Math.min(x0, c.x0); x1 = Math.max(x1, c.x1); z0 = Math.min(z0, c.z0); z1 = Math.max(z1, c.z1); }
    this.x0 = Math.floor(x0) - 1; this.z0 = Math.floor(z0) - 1; this.nx = Math.ceil(x1 - this.x0) + 2; this.nz = Math.ceil(z1 - this.z0) + 2;
    const cells = this.cells = new Array(this.nx * this.nz);
    const put = (o, pad) => {
      const a = Math.max(0, Math.floor(o.x0 - pad - this.x0)), b = Math.min(this.nx - 1, Math.floor(o.x1 + pad - this.x0));
      const c = Math.max(0, Math.floor(o.z0 - pad - this.z0)), d = Math.min(this.nz - 1, Math.floor(o.z1 + pad - this.z0));
      for (let i = a; i <= b; i++) for (let j = c; j <= d; j++) { const k = i + j * this.nx; (cells[k] || (cells[k] = [])).push(o); }
    };
    for (const c of W.colliders) put(c, 0.5);
    for (const s of surf) put(s, 0.5);
  },
  at(x, z) { if (!this.cells) this.sync(true); const i = Math.floor(x - this.x0), j = Math.floor(z - this.z0); return (i < 0 || j < 0 || i >= this.nx || j >= this.nz) ? null : this.cells[i + j * this.nx]; },
  top(c) { return c.y1 == null ? ROOM_H : c.y1; },
  overDesk(x, z) { const l = this.at(x, z); if (l) for (const o of l) if (o.desk && x > o.x0 && x < o.x1 && z > o.z0 && z < o.z1) return o; return null; },
  /* highest surface top at (x, z) that is at or below y (+ a little): desk tops, low colliders, the floor */
  ground(x, y, z) {
    const l = this.at(x, z); let g = 0; if (!l) return g;
    for (const o of l) {
      if (x <= o.x0 || x >= o.x1 || z <= o.z0 || z >= o.z1) continue;
      const t = this.top(o); if ((o.desk || t <= this.TALL) && t <= y + 0.06 && t > g) g = t;
    }
    return g;
  },
  /* the collider that blocks a sphere (radius r) at x,y,z, or null. Tall colliders are walls/partitions/desk rows:
     the air above a desk top inside them is free so things can land on desks. */
  solid(x, y, z, r) {
    const l = this.at(x, z); if (!l) return null; r = r || 0;
    for (const o of l) {
      if (o.desk || x <= o.x0 - r || x >= o.x1 + r || z <= o.z0 - r || z >= o.z1 + r) continue;
      const t = this.top(o); if (y - r >= t) continue;
      if (t > this.TALL && y - r > this.DESK_TOP - 0.03 && this.overDesk(x, z)) continue;
      return o;
    }
    return null;
  },
  /* first hit of a ray against collider boxes (padded), the floor and the ceiling; returns distance (<= max) */
  ray(ox, oy, oz, dx, dy, dz, max, pad) {
    let best = max; pad = pad || 0;
    if (dy < -1e-6) best = Math.min(best, (pad - oy) / dy); else if (dy > 1e-6) best = Math.min(best, (ROOM_H - pad - oy) / dy);
    for (const c of W.colliders) {
      const t = this._slab(ox, oy, oz, dx, dy, dz, c.x0 - pad, c.x1 + pad, -1, this.top(c) + pad, c.z0 - pad, c.z1 + pad);
      if (t >= 0 && t < best) best = t;
    }
    return Math.max(0, best);
  },
  _slab(ox, oy, oz, dx, dy, dz, x0, x1, y0, y1, z0, z1) {
    let tn = -Infinity, tf = Infinity;
    const ax = (o, d, a, b) => { if (Math.abs(d) < 1e-9) return o >= a && o <= b; let t1 = (a - o) / d, t2 = (b - o) / d; if (t1 > t2) { const s = t1; t1 = t2; t2 = s; } if (t1 > tn) tn = t1; if (t2 < tf) tf = t2; return tn <= tf; };
    if (!ax(ox, dx, x0, x1) || !ax(oy, dy, y0, y1) || !ax(oz, dz, z0, z1) || tf < 0) return -1;
    return tn < 0 ? 0 : tn;
  }
};

/* ---------- procedural sounds (SFX lives in audio.js; these are added from here) ---------- */
const FXSnd = {
  buf: null,
  ok() { return !!(AudioSys.ctx && AudioSys.sfx); },
  noiseBuf() { const c = AudioSys.ctx; if (!this.buf) { const n = c.sampleRate * 2, b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; this.buf = b; } return this.buf; },
  /* volume by distance from the camera (pos may be null = full volume) */
  vol(pos) { if (!pos || !W.camera) return 1; const p = W.camera.position, d = Math.hypot(pos.x - p.x, pos.y - p.y, pos.z - p.z); return clamp(1.15 - d / 16, 0, 1); },
  env(g, t0, v, a, dur) { g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, v), t0 + a); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); },
  tone(f0, f1, dur, type, v, when, lp) {
    if (!this.ok() || v < 0.004) return; const c = AudioSys.ctx, t0 = c.currentTime + (when || 0), o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t0); if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    this.env(g, t0, v, 0.008, dur); let n = o;
    if (lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; o.connect(f); n = f; }
    n.connect(g); g.connect(AudioSys.sfx); o.start(t0); o.stop(t0 + dur + 0.05);
  },
  noise(dur, v, when, f0, f1, type, q) {
    if (!this.ok() || v < 0.004) return; const c = AudioSys.ctx, t0 = c.currentTime + (when || 0), s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noiseBuf(); s.loop = true; f.type = type || 'bandpass'; f.Q.value = q || 1; f.frequency.setValueAtTime(f0, t0); if (f1 && f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    this.env(g, t0, v, 0.006, dur); s.connect(f); f.connect(g); g.connect(AudioSys.sfx); s.start(t0, Math.random() * 1.5); s.stop(t0 + dur + 0.05);
  },
  /* a looping noise source (spray hiss, fire crackle). Returns {set(vol), stop()} */
  loop(f, type, q) {
    if (!this.ok()) return { set() {}, stop() {} };
    const c = AudioSys.ctx, s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noiseBuf(); s.loop = true; fl.type = type || 'highpass'; fl.frequency.value = f; fl.Q.value = q || 0.7; g.gain.value = 0.0001;
    s.connect(fl); fl.connect(g); g.connect(AudioSys.sfx); s.start();
    return { set(v) { g.gain.setTargetAtTime(Math.max(0.0001, v), c.currentTime, 0.05); }, stop() { g.gain.setTargetAtTime(0.0001, c.currentTime, 0.06); setTimeout(() => { try { s.stop(); s.disconnect(); } catch (e) {} }, 400); } };
  }
};
Object.assign(SFX, {
  step2(hard, pos) { const v = (hard ? 0.09 : 0.055) * FXSnd.vol(pos); FXSnd.noise(0.07, v, 0, rand(260, 380), 120, 'lowpass', 0.8); FXSnd.tone(rand(70, 95), 50, 0.06, 'sine', v * 0.9); },
  land(pos) { const v = 0.14 * FXSnd.vol(pos); FXSnd.noise(0.12, v, 0, 300, 90, 'lowpass', 0.7); FXSnd.tone(90, 45, 0.12, 'sine', v); },
  whoosh(pos) { FXSnd.noise(0.18, 0.12 * FXSnd.vol(pos), 0, 600, 2400, 'bandpass', 1.4); },
  punch(pos) { const v = FXSnd.vol(pos); FXSnd.tone(160, 50, 0.16, 'sine', 0.35 * v); FXSnd.noise(0.08, 0.25 * v, 0, 1800, 500, 'lowpass', 0.8); FXSnd.tone(900, 300, 0.05, 'square', 0.04 * v); },
  slap(pos) { const v = FXSnd.vol(pos); FXSnd.noise(0.09, 0.35 * v, 0, 3200, 1600, 'bandpass', 0.7); FXSnd.tone(420, 180, 0.07, 'triangle', 0.12 * v); },
  bonk(pos) { const v = FXSnd.vol(pos); FXSnd.tone(620, 300, 0.12, 'triangle', 0.16 * v); FXSnd.tone(930, 460, 0.1, 'sine', 0.08 * v, 0.02); },
  pop(pos) { const v = FXSnd.vol(pos); FXSnd.noise(0.06, 0.4 * v, 0, 2500, 800, 'bandpass', 0.6); FXSnd.tone(1400, 500, 0.08, 'square', 0.06 * v); [1568, 2093, 2637].forEach((f, i) => FXSnd.tone(f, f, 0.12, 'triangle', 0.05 * v, 0.06 + i * 0.05)); },
  fart(pos, len) {
    if (!FXSnd.ok()) return; const v = 0.32 * FXSnd.vol(pos); if (v < 0.004) return;
    const c = AudioSys.ctx, t0 = c.currentTime, d = len || rand(0.7, 1.1), o = c.createOscillator(), lfo = c.createOscillator(), lg = c.createGain(), f = c.createBiquadFilter(), g = c.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(rand(85, 110), t0); o.frequency.exponentialRampToValueAtTime(rand(48, 60), t0 + d);
    lfo.type = 'square'; lfo.frequency.setValueAtTime(rand(18, 26), t0); lfo.frequency.linearRampToValueAtTime(rand(9, 13), t0 + d); lg.gain.value = 22;
    lfo.connect(lg); lg.connect(o.frequency); f.type = 'lowpass'; f.frequency.value = 520; f.Q.value = 4;
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(v, t0 + 0.04); g.gain.setValueAtTime(v, t0 + d * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    o.connect(f); f.connect(g); g.connect(AudioSys.sfx); o.start(t0); lfo.start(t0); o.stop(t0 + d + 0.05); lfo.stop(t0 + d + 0.05);
    FXSnd.noise(d * 0.8, v * 0.25, 0.02, 400, 200, 'lowpass', 1);
  },
  whoopee(pos) { SFX.fart(pos, 1.3); FXSnd.tone(300, 120, 0.25, 'square', 0.04 * FXSnd.vol(pos), 1.1); },
  cough(pos) { const v = 0.2 * FXSnd.vol(pos); for (let i = 0; i < 3; i++) { FXSnd.noise(0.13, v, i * 0.22, 900, 500, 'bandpass', 1.2); FXSnd.tone(180, 120, 0.1, 'sawtooth', v * 0.25, i * 0.22, 800); } },
  splat(pos) { FXSnd.noise(0.12, 0.12 * FXSnd.vol(pos), 0, 900, 300, 'lowpass', 1); },
  boom(pos) { const v = FXSnd.vol(pos); FXSnd.tone(110, 32, 0.9, 'sine', 0.5 * v); FXSnd.noise(1.2, 0.45 * v, 0, 1400, 120, 'lowpass', 0.7); FXSnd.noise(0.15, 0.3 * v, 0, 4000, 1500, 'bandpass', 0.5); },
  coin(pos) { const v = FXSnd.vol(pos); [1319, 1760, 2093, 2637].forEach((f, i) => FXSnd.tone(f, f, 0.14, 'square', 0.035 * v, i * 0.06)); },
  ow(pos) { const v = FXSnd.vol(pos); FXSnd.tone(520, 300, 0.22, 'triangle', 0.1 * v, 0.03); },
  crackle(pos) { const v = FXSnd.vol(pos) * 0.08; for (let i = 0; i < 3; i++) FXSnd.noise(0.02, v * rand(0.4, 1), rand(0, 0.25), rand(1500, 4000), 0, 'bandpass', 2); }
});

/* ---------- particles, streams, decals, bubbles, screen effects ---------- */
const FX = (() => {
  const A = 4;   // atlas is 4x4 cells of 128 px
  const FR = { soft: 0, drop: 1, star: 2, puff: 3, flame: 4, flame2: 5, tongue: 6, spark: 7, rect: 8, curl: 9, coin: 10, ring: 11, heart: 12, chunk: 13, smoke: 14, fireball: 15 };
  // per-particle flags
  const FLOOR = 1, SPLAT = 2, FLUTTER = 4, FLICK = 8, ORBIT = 16, DIE = 32, REST = 64, WALL = 128;
  const K = 30;  // floats per particle
  const _col = new Map();
  function rgb(c) {
    if (Array.isArray(c)) return c; let v = _col.get(c); if (v) return v;
    let s = String(c || '#ffffff').replace('#', ''); if (s.length === 3) s = s.split('').map(x => x + x).join('');
    const n = parseInt(s, 16) || 0; v = [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; _col.set(c, v); return v;
  }
  const V = (p) => !p ? { x: 0, y: 0, z: 0 } : Array.isArray(p) ? { x: +p[0] || 0, y: +p[1] || 0, z: +p[2] || 0 } : p;

  /* ----- textures (drawn once) ----- */
  function star(g, cx, cy, ro, ri, n) { g.beginPath(); for (let i = 0; i < n * 2; i++) { const r = i % 2 ? ri : ro, a = -Math.PI / 2 + i * Math.PI / n; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } g.closePath(); }
  function flamePath(g, cx, base, w, hs) {
    // several licking tongues of different heights over a rounded base
    g.beginPath(); g.moveTo(cx - w, base);
    const n = hs.length;
    for (let i = 0; i < n; i++) {
      const x0 = cx - w + (2 * w) * i / n, x1 = cx - w + (2 * w) * (i + 1) / n, xm = (x0 + x1) / 2 + (i % 2 ? 4 : -4), top = base - hs[i];
      g.quadraticCurveTo(x0 - 2, base - hs[i] * 0.45, xm, top);
      g.quadraticCurveTo(x1 + 2, base - hs[i] * 0.4, x1, base - (i < n - 1 ? hs[i] * 0.22 : 0));
    }
    g.quadraticCurveTo(cx + w * 0.9, base + w * 0.32, cx, base + w * 0.34); g.quadraticCurveTo(cx - w * 0.9, base + w * 0.32, cx - w, base); g.closePath();
  }
  function atlasTex() {
    const S = 128, c = document.createElement('canvas'); c.width = c.height = S * A; const g = c.getContext('2d');
    const cell = (i, fn) => { g.save(); g.translate((i % A) * S, Math.floor(i / A) * S); g.beginPath(); g.rect(2, 2, S - 4, S - 4); g.clip(); fn(g, S); g.restore(); };
    const radial = (g, stops, r) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, r || 60); stops.forEach(s => gr.addColorStop(s[0], s[1])); g.fillStyle = gr; g.fillRect(0, 0, S, S); };
    cell(FR.soft, g => radial(g, [[0, 'rgba(255,255,255,1)'], [0.35, 'rgba(255,255,255,.7)'], [1, 'rgba(255,255,255,0)']]));
    cell(FR.drop, g => { g.fillStyle = '#d6d6d6'; g.beginPath(); g.arc(64, 64, 52, 0, 7); g.fill(); g.fillStyle = '#ffffff'; g.beginPath(); g.arc(58, 56, 40, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,1)'; g.beginPath(); g.ellipse(46, 42, 13, 9, -0.6, 0, 7); g.fill(); });
    cell(FR.star, g => {
      g.lineJoin = 'round'; star(g, 64, 68, 56, 25, 5); g.lineWidth = 14; g.strokeStyle = '#b55a00'; g.stroke();
      const gr = g.createLinearGradient(0, 14, 0, 120); gr.addColorStop(0, '#fff7b0'); gr.addColorStop(0.45, '#ffd629'); gr.addColorStop(1, '#f39a00'); g.fillStyle = gr; g.fill();
      g.lineWidth = 6; g.strokeStyle = '#ffd629'; star(g, 64, 68, 50, 22, 5); g.stroke(); g.fillStyle = gr; g.fill();
      g.fillStyle = 'rgba(255,255,255,.75)'; g.beginPath(); g.ellipse(50, 50, 9, 5, -0.7, 0, 7); g.fill();
    });
    cell(FR.puff, g => {
      const blobs = [[64, 70, 34], [38, 72, 24], [90, 72, 25], [52, 48, 26], [78, 50, 24], [64, 88, 24]];
      g.fillStyle = 'rgba(0,0,0,.07)'; blobs.forEach(b => { g.beginPath(); g.arc(b[0], b[1] + 2, b[2] + 2, 0, 7); g.fill(); });
      const gr = g.createLinearGradient(0, 24, 0, 116); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#c9c9c9'); g.fillStyle = gr;
      blobs.forEach(b => { g.beginPath(); g.arc(b[0], b[1], b[2], 0, 7); g.fill(); });
      g.fillStyle = 'rgba(255,255,255,.8)'; g.beginPath(); g.arc(50, 46, 11, 0, 7); g.fill();
    });
    const fl = (g, hs, w) => {
      g.lineJoin = 'round'; flamePath(g, 64, 104, w, hs); g.fillStyle = '#e8340c'; g.fill(); g.lineWidth = 3; g.strokeStyle = '#a81f06'; g.stroke();
      flamePath(g, 64, 106, w * 0.74, hs.map(x => x * 0.74)); g.fillStyle = '#ff8a1c'; g.fill();
      flamePath(g, 64, 108, w * 0.46, hs.map(x => x * 0.5)); g.fillStyle = '#ffd94a'; g.fill();
      flamePath(g, 64, 110, w * 0.22, hs.map(x => x * 0.28).slice(0, 2)); g.fillStyle = '#fff6c8'; g.fill();
    };
    cell(FR.flame, g => fl(g, [58, 92, 66, 80], 46));
    cell(FR.flame2, g => fl(g, [76, 60, 96, 58], 46));
    cell(FR.tongue, g => fl(g, [98], 30));
    cell(FR.spark, g => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 56); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.save(); g.translate(64, 64); g.scale(0.32, 1); g.translate(-64, -64); g.fillRect(0, 0, S, S); g.restore(); });
    cell(FR.rect, g => { g.fillStyle = '#ffffff'; g.fillRect(34, 22, 60, 84); g.fillStyle = 'rgba(0,0,0,.16)'; g.fillRect(34, 72, 60, 34); });
    cell(FR.curl, g => { g.lineWidth = 16; g.lineCap = 'round'; g.strokeStyle = '#fff'; g.beginPath(); g.moveTo(24, 30); g.bezierCurveTo(110, 30, 18, 70, 64, 74); g.bezierCurveTo(110, 78, 40, 104, 104, 100); g.stroke(); });
    cell(FR.coin, g => {
      g.fillStyle = '#9c6408'; g.beginPath(); g.arc(64, 66, 52, 0, 7); g.fill();
      g.fillStyle = '#ffc928'; g.beginPath(); g.arc(64, 62, 50, 0, 7); g.fill();
      g.strokeStyle = '#e09a12'; g.lineWidth = 6; g.beginPath(); g.arc(64, 62, 38, 0, 7); g.stroke();
      g.fillStyle = '#c9800c'; g.font = 'bold 56px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('$', 66, 66);
      g.fillStyle = '#fff1a6'; g.fillText('$', 63, 62); g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.ellipse(42, 36, 12, 6, -0.7, 0, 7); g.fill();
    });
    cell(FR.ring, g => { g.strokeStyle = '#fff'; g.lineWidth = 12; g.shadowColor = '#fff'; g.shadowBlur = 10; g.beginPath(); g.arc(64, 64, 46, 0, 7); g.stroke(); });
    cell(FR.heart, g => { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(64, 104); g.bezierCurveTo(10, 64, 26, 18, 64, 42); g.bezierCurveTo(102, 18, 118, 64, 64, 104); g.fill(); });
    cell(FR.chunk, g => { g.fillStyle = '#9a9a9a'; g.beginPath(); [[30, 40], [70, 22], [104, 50], [96, 96], [52, 106], [22, 78]].forEach(p => g.lineTo(p[0], p[1])); g.closePath(); g.fill(); g.fillStyle = '#ffffff'; g.beginPath(); [[36, 44], [70, 30], [96, 52], [70, 70], [34, 70]].forEach(p => g.lineTo(p[0], p[1])); g.closePath(); g.fill(); });
    cell(FR.smoke, g => { g.filter = 'blur(6px)'; g.fillStyle = '#fff'; [[64, 70, 32], [42, 70, 22], [86, 70, 22], [56, 50, 22], [76, 52, 20]].forEach(b => { g.beginPath(); g.arc(b[0], b[1], b[2], 0, 7); g.fill(); }); g.filter = 'none'; });
    cell(FR.fireball, g => radial(g, [[0, 'rgba(255,255,240,1)'], [0.25, 'rgba(255,230,110,1)'], [0.55, 'rgba(255,140,30,.95)'], [0.8, 'rgba(230,60,10,.6)'], [1, 'rgba(160,30,0,0)']]));
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.LinearEncoding; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; return t;
  }
  function splatTex() {
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); g.fillStyle = '#fff';
    let s = 7; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    g.beginPath(); for (let i = 0; i <= 24; i++) { const a = i / 24 * Math.PI * 2, rr = 34 + r() * 12 + (i % 3 === 0 ? r() * 10 : 0); g.lineTo(64 + Math.cos(a) * rr, 64 + Math.sin(a) * rr); } g.fill();
    for (let i = 0; i < 9; i++) { const a = r() * 7, d = 48 + r() * 12, rr = 3 + r() * 6; g.beginPath(); g.arc(64 + Math.cos(a) * d, 64 + Math.sin(a) * d, rr, 0, 7); g.fill(); }
    const t = new THREE.CanvasTexture(c); return t;
  }

  /* ----- particle layers ----- */
  const VS = `
    attribute vec3 iPos; attribute vec3 iVel; attribute vec4 iCol; attribute vec4 iMisc;
    varying vec2 vUv; varying vec4 vCol;
    void main() {
      vec4 mv = viewMatrix * vec4(iPos, 1.0);
      float s = iMisc.x; vec2 c = position.xy * s;
      if (iMisc.w > 0.0) {
        vec3 vv = (viewMatrix * vec4(iVel, 0.0)).xyz; float l = length(vv.xy);
        if (l > 0.0001) { vec2 d = vv.xy / l; vec2 n = vec2(-d.y, d.x); c = d * position.y * s * (1.0 + iMisc.w * l * 20.0) + n * position.x * s; }
      } else { float cs = cos(iMisc.y), sn = sin(iMisc.y); c = vec2(c.x * cs - c.y * sn, c.x * sn + c.y * cs); }
      mv.xy += c; gl_Position = projectionMatrix * mv;
      float f = iMisc.z; vUv = (vec2(mod(f, 4.0), 3.0 - floor(f / 4.0)) + uv) / 4.0; vCol = iCol;
    }`;
  const FS = `
    uniform sampler2D map; uniform float cut; varying vec2 vUv; varying vec4 vCol;
    void main() { vec4 c = texture2D(map, vUv) * vCol; if (cut > 0.0) { if (c.a < cut) discard; c.a = 1.0; } else if (c.a < 0.004) discard; gl_FragColor = c; }`;
  function Layer(cap, mode, tex) {
    const geo = new THREE.InstancedBufferGeometry(), q = new THREE.PlaneGeometry(1, 1);
    geo.index = q.index; geo.setAttribute('position', q.attributes.position); geo.setAttribute('uv', q.attributes.uv);
    const mk = n => { const a = new THREE.InstancedBufferAttribute(new Float32Array(cap * n), n); a.setUsage(THREE.DynamicDrawUsage); return a; };
    const L = { cap, n: 0, d: new Float32Array(cap * K), aPos: mk(3), aVel: mk(3), aCol: mk(4), aMisc: mk(4), geo };
    geo.setAttribute('iPos', L.aPos); geo.setAttribute('iVel', L.aVel); geo.setAttribute('iCol', L.aCol); geo.setAttribute('iMisc', L.aMisc); geo.instanceCount = 0;
    const m = new THREE.ShaderMaterial({ uniforms: { map: { value: tex }, cut: { value: mode === 'cut' ? 0.5 : 0 } }, vertexShader: VS, fragmentShader: FS,
      transparent: mode !== 'cut', depthWrite: mode === 'cut', blending: mode === 'add' ? THREE.AdditiveBlending : THREE.NormalBlending });
    L.mesh = new THREE.Mesh(geo, m); L.mesh.frustumCulled = false; L.mesh.renderOrder = mode === 'cut' ? 2 : mode === 'soft' ? 20 : 21;
    return L;
  }
  let ready = false, layers = null, CUT, SOFT, ADD, dec = null, light = null;
  let lowQ = false; Bus.on('quality', q => { lowQ = q === 'low'; });   // low quality: half the particle budget and fire emission
  const streams = [], emitters = [], bubbles = [];
  /* scratch particle description, filled by p() and consumed by add() (no per-particle allocations) */
  const Q = {};
  function p(x, y, z) {
    Q.x = x; Q.y = y; Q.z = z; Q.vx = Q.vy = Q.vz = 0; Q.ttl = 1; Q.s0 = 0.2; Q.s1 = 0.2; Q.grow = 0; Q.rot = Math.random() * 6.28; Q.rv = 0;
    Q.c0 = Q.c1 = null; Q.a0 = 1; Q.a1 = 1; Q.grav = 0; Q.drag = 0; Q.fr = 0; Q.str = 0; Q.fl = 0; Q.e0 = Math.random() * 100; Q.e1 = 0; Q.bounce = 0.3; Q.delay = 0; Q.L = CUT; return Q;
  }
  function add() {
    const L = Q.L; if (!L) return -1;
    if (lowQ && L === SOFT && Q.ttl > 1.5 && Math.random() < 0.5) return -1;   // low: half of the big lingering smoke / gas puffs (overdraw)
    const cap = lowQ ? L.cap >> 1 : L.cap;
    let i = L.n; if (i >= cap) i = Math.floor(Math.random() * cap); else L.n++;   // full: overwrite a random one
    const d = L.d, o = i * K, c0 = rgb(Q.c0 || '#ffffff'), c1 = rgb(Q.c1 || Q.c0 || '#ffffff');
    d[o] = Q.x; d[o + 1] = Q.y; d[o + 2] = Q.z; d[o + 3] = Q.vx; d[o + 4] = Q.vy; d[o + 5] = Q.vz; d[o + 6] = -Q.delay; d[o + 7] = Q.ttl;
    d[o + 8] = Q.s0; d[o + 9] = Q.s1; d[o + 10] = Q.grow; d[o + 11] = Q.rot; d[o + 12] = Q.rv;
    d[o + 13] = c0[0]; d[o + 14] = c0[1]; d[o + 15] = c0[2]; d[o + 16] = Q.a0; d[o + 17] = c1[0]; d[o + 18] = c1[1]; d[o + 19] = c1[2]; d[o + 20] = Q.a1;
    d[o + 21] = Q.grav; d[o + 22] = Q.drag; d[o + 23] = Q.fr; d[o + 24] = Q.str; d[o + 25] = Q.fl; d[o + 26] = Q.e0; d[o + 27] = Q.e1; d[o + 28] = Q.bounce; d[o + 29] = 0;
    return i;
  }
  const backOut = t => { const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
  let splatT = 0;
  function stepLayer(L, dt) {
    const d = L.d, P3 = L.aPos.array, V3 = L.aVel.array, C4 = L.aCol.array, M4 = L.aMisc.array;
    let i = 0;
    while (i < L.n) {
      const o = i * K; let age = d[o + 6] += dt; const ttl = d[o + 7];
      if (age >= ttl) { kill(L, i); continue; }
      const fl = d[o + 25];
      let x = d[o], y = d[o + 1], z = d[o + 2];
      if (age < 0) { M4[i * 4] = 0; P3[i * 3] = x; P3[i * 3 + 1] = -50; P3[i * 3 + 2] = z; i++; continue; }
      if (fl & ORBIT) {
        d[o + 27] += d[o + 12] * dt; const a = d[o + 27], r = d[o + 3];
        x += Math.cos(a) * r; z += Math.sin(a) * r; y += Math.sin(age * 5 + d[o + 26]) * 0.03;
      } else if (!(d[o + 29] > 0)) {   // [29] = resting on the ground
        let vx = d[o + 3], vy = d[o + 4], vz = d[o + 5];
        vy -= d[o + 21] * 9.8 * dt; const dr = Math.max(0, 1 - d[o + 22] * dt); vx *= dr; vy *= dr; vz *= dr;
        if (fl & FLUTTER) { const e = d[o + 26]; vx += Math.sin(age * 7 + e) * dt * 3; vz += Math.cos(age * 6 + e * 1.7) * dt * 3; if (vy < -0.9) vy = -0.9; }
        x += vx * dt; y += vy * dt; z += vz * dt;
        if (fl & (FLOOR | SPLAT | DIE)) {
          const gy = y < 1.4 ? Space.ground(x, y + 0.1, z) : 0;
          if (y < gy + 0.012) {
            if (fl & SPLAT) { if (now() - splatT > 0.03) { splatT = now(); decal(x, gy, z, rand(0.12, 0.22), [d[o + 13], d[o + 14], d[o + 15]], 30); } kill(L, i); continue; }
            if (fl & DIE) { kill(L, i); continue; }
            y = gy + 0.012;
            if (vy < -0.8) { vy = -vy * d[o + 28]; vx *= 0.7; vz *= 0.7; d[o + 12] *= 0.6; }
            else { vy = 0; vx *= 0.82; vz *= 0.82; d[o + 12] *= 0.85; if (fl & REST) { d[o + 29] = 1; d[o + 12] = 0; vx = vz = 0; } }
          }
        }
        if ((fl & WALL) && Space.solid(x, y, z, 0)) { kill(L, i); continue; }
        d[o] = x; d[o + 1] = y; d[o + 2] = z; d[o + 3] = vx; d[o + 4] = vy; d[o + 5] = vz;
        d[o + 11] += d[o + 12] * dt;
      }
      const t = age / ttl, g = d[o + 10];
      let s = d[o + 8] + (d[o + 9] - d[o + 8]) * t; if (g > 0 && t < g) s *= backOut(t / g);
      if ((fl & REST) && t > 0.85) s *= (1 - t) / 0.15;
      let fr = d[o + 23]; if (fl & FLICK) { fr = (Math.floor(age * 11 + d[o + 26]) & 1) ? FR.flame : FR.flame2; s *= 1 + Math.sin(age * 31 + d[o + 26]) * 0.07; }
      const j3 = i * 3, j4 = i * 4;
      P3[j3] = x; P3[j3 + 1] = y; P3[j3 + 2] = z; V3[j3] = d[o + 3]; V3[j3 + 1] = d[o + 4]; V3[j3 + 2] = d[o + 5];
      C4[j4] = d[o + 13] + (d[o + 17] - d[o + 13]) * t; C4[j4 + 1] = d[o + 14] + (d[o + 18] - d[o + 14]) * t; C4[j4 + 2] = d[o + 15] + (d[o + 19] - d[o + 15]) * t; C4[j4 + 3] = d[o + 16] + (d[o + 20] - d[o + 16]) * t;
      M4[j4] = s; M4[j4 + 1] = d[o + 11]; M4[j4 + 2] = fr; M4[j4 + 3] = d[o + 24];
      i++;
    }
    L.geo.instanceCount = L.n;
    L.aPos.updateRange.count = L.aVel.updateRange.count = L.n * 3; L.aCol.updateRange.count = L.aMisc.updateRange.count = L.n * 4;
    L.aPos.needsUpdate = L.aVel.needsUpdate = L.aCol.needsUpdate = L.aMisc.needsUpdate = true;
  }
  function kill(L, i) {
    const last = --L.n; if (i === last) return;
    L.d.copyWithin(i * K, last * K, last * K + K);
  }

  /* ----- floor decals (one InstancedMesh, ring buffer) ----- */
  let cmOn = null;
  const DEC = 120, _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _sc = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0), _c = new THREE.Color();
  function makeDecals() {
    const g = new THREE.PlaneGeometry(1, 1); g.rotateX(-Math.PI / 2);
    const m = new THREE.MeshLambertMaterial({ map: splatTex(), alphaTest: 0.5, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
    const im = new THREE.InstancedMesh(g, m, DEC); im.frustumCulled = false; im.renderOrder = 1;
    _m4.makeScale(0, 0, 0); for (let i = 0; i < DEC; i++) { im.setMatrixAt(i, _m4); im.setColorAt(i, _c.set('#ffffff')); }
    return { im, i: 0, list: new Array(DEC).fill(null) };
  }
  function decal(x, y, z, size, color, ttl) {
    if (!dec) return; const k = dec.i; dec.i = (k + 1) % DEC;
    const col = Array.isArray(color) ? color : rgb(color);
    dec.list[k] = { x, y: y + 0.004 + k * 0.00002, z, s: size, r: Math.random() * 6.28, t: 0, ttl: ttl || 30, grow: 0 };
    // instance colours are linear when the renderer's colour management is on (hex setters convert, setRGB does not)
    if (cmOn == null) cmOn = new THREE.Color('#808080').r < 0.4;
    _c.setRGB(col[0], col[1], col[2]); if (cmOn) _c.convertSRGBToLinear();
    dec.im.setColorAt(k, _c); dec.im.instanceColor.needsUpdate = true; setDec(k);
  }
  function setDec(k) {
    const e = dec.list[k]; let s = 0;
    if (e) { const g = Math.min(1, e.grow / 0.12), f = e.t > e.ttl - 2 ? Math.max(0, (e.ttl - e.t) / 2) : 1; s = e.s * (0.4 + 0.6 * g) * f; }
    _q.setFromAxisAngle(_up, e ? e.r : 0); _sc.set(s, 1, s); _m4.compose(_v.set(e ? e.x : 0, e ? e.y : -9, e ? e.z : 0), _q, _sc); dec.im.setMatrixAt(k, _m4);
  }
  function stepDecals(dt) {
    let ch = false;
    for (let k = 0; k < DEC; k++) {
      const e = dec.list[k]; if (!e) continue;
      e.t += dt; if (e.grow < 0.12) { e.grow += dt; setDec(k); ch = true; }
      if (e.t > e.ttl) { dec.list[k] = null; setDec(k); ch = true; } else if (e.t > e.ttl - 2) { setDec(k); ch = true; }
    }
    if (ch) dec.im.instanceMatrix.needsUpdate = true;
  }
  const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3();

  /* ----- liquid streams (a lit tube along ballistic nodes, so it reads from any angle) ----- */
  const SVS = `varying vec3 vN; varying vec3 vV; void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = -mv.xyz; gl_Position = projectionMatrix * mv; }`;
  const SFS = `uniform vec3 color; varying vec3 vN; varying vec3 vV;
    void main() { vec3 n = normalize(vN), v = normalize(vV); float d = max(dot(n, normalize(vec3(-0.3, 0.8, 0.5))), 0.0); float rim = pow(1.0 - max(dot(n, v), 0.0), 2.0);
      vec3 c = color * (0.86 + 0.32 * d) + vec3(1.0, 0.96, 0.85) * pow(max(dot(reflect(-normalize(vec3(-0.3, 0.8, 0.5)), n), v), 0.0), 10.0) * 0.5 - color * rim * 0.12; gl_FragColor = vec4(c, 1.0); }`;
  const SN = 110, SR = 6;   // nodes per stream, sides of the tube
  function Stream(o) {
    o = o || {};
    const s = { color: o.color || '#ff9418', puddle: o.puddle, w: o.width || 0.042, speed: o.speed || 7.5, rate: o.rate || 75, on: false, dead: false, life: o.life || 0,
      pos: new THREE.Vector3(), dir: new THREE.Vector3(0, 0, -1), ppos: new THREE.Vector3(), pdir: new THREE.Vector3(0, 0, -1), has: false, acc: 0, test: o.test || null, onHit: o.onHit || null,
      nx: new Float32Array(SN * 3), nv: new Float32Array(SN * 3), age: new Float32Array(SN), alive: new Uint8Array(SN), head: 0, cnt: 0, hitT: 0, decT: 0, wt: Math.random() * 9, snd: null, owner: o.owner };
    // one independent tube section per segment so a broken stream leaves real gaps
    const V = SR * 2, geo = new THREE.BufferGeometry(), idx = [];
    for (let i = 0; i < SN - 1; i++) { const b0 = i * V; for (let k = 0; k < SR; k++) { const a0 = b0 + k, a1 = b0 + (k + 1) % SR, c0 = a0 + SR, c1 = a1 + SR; idx.push(a0, c0, a1, a1, c0, c1); } }
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SN * V * 3), 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(SN * V * 3), 3).setUsage(THREE.DynamicDrawUsage));
    geo.setIndex(idx); geo.setDrawRange(0, 0);
    s.ring = new Float32Array(SN * SR * 6); s.ok = new Uint8Array(SN);
    const c = rgb(s.color);
    s.mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({ uniforms: { color: { value: new THREE.Vector3(c[0], c[1], c[2]) } }, vertexShader: SVS, fragmentShader: SFS }));
    s.mesh.frustumCulled = false; s.mesh.renderOrder = 3; W.scene.add(s.mesh);
    /* set the nozzle position/direction every frame; on = emitting */
    s.set = (p, d, on) => { if (p) s.pos.set(p.x, p.y, p.z); if (d) s.dir.set(d.x, d.y, d.z).normalize(); if (on && !s.on) { s.has = false; } s.on = !!on; return s; };
    s.stop = () => { s.on = false; s.life = 0; s.ending = true; };
    streams.push(s); return s;
  }
  /* nodes fly on exact parabolas from where they left the nozzle: p = p0 + v0 t - g t^2 / 2 (smooth at any frame rate) */
  function emitNode(s, x, y, z, pre, f) {
    const i = s.head; s.head = (i + 1) % SN; if (s.cnt < SN) s.cnt++;
    _v.copy(s.pdir).lerp(s.dir, f).normalize();   // the aim turns smoothly within the frame too
    const j = 0.003, sp = s.speed * (1 + Math.sin(s.wt * 9.3) * 0.025), wt = s.wt;   // smooth hose wobble, tiny per-node noise
    const wx = Math.sin(wt * 7 + 1.3) * 0.006 + Math.sin(wt * 3.1) * 0.006, wy = Math.cos(wt * 5.3) * 0.006, wz = Math.sin(wt * 6.1 + 4) * 0.006;
    const vx = (_v.x + wx + rand(-j, j)) * sp, vy = (_v.y + wy + rand(-j, j)) * sp, vz = (_v.z + wz + rand(-j, j)) * sp;
    s.nv[i * 3] = vx; s.nv[i * 3 + 1] = vy; s.nv[i * 3 + 2] = vz; s.nx[i * 3] = x; s.nx[i * 3 + 1] = y; s.nx[i * 3 + 2] = z; s.age[i] = pre; s.alive[i] = 1;
    if (Math.random() < 0.2) {   // stray droplets breaking off the stream
      p(x, y, z); Q.vx = vx * rand(0.8, 1.05) + rand(-0.5, 0.5); Q.vy = vy * rand(0.8, 1.05) + rand(-0.3, 0.6); Q.vz = vz * rand(0.8, 1.05) + rand(-0.5, 0.5);
      Q.ttl = 2; Q.s0 = rand(0.03, 0.055); Q.s1 = Q.s0 * 0.8; Q.c0 = s.color; Q.grav = 1; Q.fl = SPLAT | WALL; Q.fr = FR.drop; add();
    }
  }
  function splash(x, y, z, color, n, up) {
    for (let k = 0; k < n; k++) {
      p(x, y + 0.02, z); const a = Math.random() * 6.28, sp = rand(0.6, 1.8);
      Q.vx = Math.cos(a) * sp; Q.vz = Math.sin(a) * sp; Q.vy = rand(1.2, 2.6) * (up || 1); Q.ttl = 0.7; Q.s0 = rand(0.025, 0.05); Q.s1 = 0.02; Q.c0 = color; Q.grav = 1; Q.fl = DIE; Q.fr = FR.drop; add();
    }
  }
  function stepStream(s, dt) {
    if (s.life > 0) { s.life -= dt; if (s.life <= 0) s.on = false; }
    for (let k = 0; k < s.cnt; k++) { const i = (s.head - 1 - k + SN) % SN; if (s.alive[i]) s.age[i] += dt; }
    if (s.on) {
      if (!s.has) { s.ppos.copy(s.pos); s.pdir.copy(s.dir); s.has = true; }
      s.acc += dt * s.rate; let n = Math.floor(s.acc); s.acc -= n; n = Math.min(n, 12);
      for (let k = 0; k < n; k++) { const f = (k + 1) / n; s.wt += 1 / s.rate; emitNode(s, lerp(s.ppos.x, s.pos.x, f), lerp(s.ppos.y, s.pos.y, f), lerp(s.ppos.z, s.pos.z, f), dt * (1 - f), f); }
      s.ppos.copy(s.pos); s.pdir.copy(s.dir);
      if (!s.snd) s.snd = FXSnd.loop(2600, 'highpass'); s.snd.set(0.07 * FXSnd.vol(s.pos));
    } else if (s.snd) { s.snd.stop(); s.snd = null; }
    // where is every node now? (exact parabola) + collisions
    let alive = 0; const t = now(), cp = s.cp || (s.cp = new Float32Array(SN * 3));
    for (let k = 0; k < s.cnt; k++) {
      const i = (s.head - 1 - k + SN) % SN; if (!s.alive[i]) continue;
      const a = s.age[i], i3 = i * 3; if (a > 3) { s.alive[i] = 0; continue; }
      const x = cp[i3] = s.nx[i3] + s.nv[i3] * a, y = cp[i3 + 1] = s.nx[i3 + 1] + s.nv[i3 + 1] * a - 4.9 * a * a, z = cp[i3 + 2] = s.nx[i3 + 2] + s.nv[i3 + 2] * a;
      let hit = false, gy = 0;
      if (y < 1.4) { gy = Space.ground(x, y + 0.15, z); if (y <= gy) hit = 'floor'; }
      if (!hit && Space.solid(x, y, z, 0)) hit = 'wall';
      if (!hit && s.test && a > 0.04 && s.test(x, y, z, s)) hit = 'body';
      if (hit) {
        s.alive[i] = 0;
        if (t - s.hitT > 0.05) {
          s.hitT = t; splash(x, Math.max(y, gy), z, s.color, hit === 'floor' ? 3 : 2, hit === 'floor' ? 1 : 0.5);
          if (hit === 'floor' && t - s.decT > 0.14) { s.decT = t; decal(x + rand(-0.06, 0.06), gy, z + rand(-0.06, 0.06), rand(0.32, 0.5), s.puddle || s.color, 40); }
          if (s.onHit) s.onHit(hit, x, y, z);
        }
        continue;
      }
      alive++;
    }
    if (!s.on && !alive && s.cnt) { s.cnt = 0; }
    // build the tube (oldest -> newest): a ring of vertices per live node, a section per pair of live neighbours
    const G = s.mesh.geometry, PA = G.attributes.position, NA = G.attributes.normal, pa = PA.array, na = NA.array, rg = s.ring;
    let n = 0;
    for (let k = s.cnt - 1; k >= 0; k--, n++) {
      const i = (s.head - 1 - k + SN) % SN, i3 = i * 3;
      s.ok[n] = s.alive[i]; if (!s.alive[i]) continue;
      const a = s.age[i], x = s.cp[i3], y = s.cp[i3 + 1], z = s.cp[i3 + 2];
      _v.set(s.nv[i3], s.nv[i3 + 1] - 9.8 * a, s.nv[i3 + 2]).normalize();             // tangent
      if (Math.abs(_v.y) > 0.97) _v2.set(1, 0, 0); else _v2.set(0, 1, 0);
      _v3.crossVectors(_v, _v2).normalize(); _v2.crossVectors(_v3, _v).normalize();      // side, up
      const r = s.w * 0.5 * Math.min(1, 0.6 + a * 5) * (1 + Math.sin(a * 30 + i * 0.4) * 0.1);
      for (let q = 0; q < SR; q++) {
        const an = q / SR * 6.2832, cs = Math.cos(an), sn = Math.sin(an), o = (n * SR + q) * 6;
        const ex = _v3.x * cs + _v2.x * sn, ey = _v3.y * cs + _v2.y * sn, ez = _v3.z * cs + _v2.z * sn;
        rg[o] = x + ex * r; rg[o + 1] = y + ey * r; rg[o + 2] = z + ez * r; rg[o + 3] = ex; rg[o + 4] = ey; rg[o + 5] = ez;
      }
    }
    let q = 0; const RV = SR * 6;
    for (let k = 0; k < n - 1; k++) {
      if (!s.ok[k] || !s.ok[k + 1]) continue;
      const o = q * SR * 2 * 3, A = k * RV;
      for (let j = 0; j < SR * 2; j++) { const src = A + j * 6, d = o + j * 3; pa[d] = rg[src]; pa[d + 1] = rg[src + 1]; pa[d + 2] = rg[src + 2]; na[d] = rg[src + 3]; na[d + 1] = rg[src + 4]; na[d + 2] = rg[src + 5]; }
      q++;
    }
    PA.updateRange.count = NA.updateRange.count = q * SR * 6; PA.needsUpdate = NA.needsUpdate = true; G.setDrawRange(0, q * SR * 6);
    if (s.ending && !s.on && !alive) s.dead = true;
  }

  /* ----- emitters (fire) ----- */
  function Fire(pos, scale, secs, o) {
    o = o || {};
    const e = { x: pos.x, y: pos.y, z: pos.z, sc: scale || 1, t: 0, dur: secs == null ? 10 : secs, acc: [0, 0, 0, 0, 0], snd: 0, smoke: o.smoke !== false, dead: false, kind: 'fire' };
    e.stop = () => { e.dur = e.dur <= 0 ? e.t + 0.01 : Math.min(e.dur, e.t + 0.01); };
    emitters.push(e); return e;
  }
  function stepFire(e, dt) {
    e.t += dt; const on = e.dur <= 0 || e.t < e.dur;   // dur <= 0: burn until stop()
    if (!on) { e.dead = true; return; }
    const sc = e.sc, k = Math.min(1, e.t * 3) * (e.dur > 0 ? Math.min(1, (e.dur - e.t) * 1.5) : 1) * (lowQ ? 0.5 : 1);
    const emit = (j, rate, fn) => { e.acc[j] += dt * rate * k; while (e.acc[j] >= 1) { e.acc[j]--; fn(); } };
    emit(0, 16 * Math.sqrt(sc) + 6, () => {   // big flame patches
      const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * 0.32 * sc;
      p(e.x + Math.cos(a) * r, e.y + 0.18 * sc, e.z + Math.sin(a) * r); Q.vy = rand(0.5, 0.9) * Math.sqrt(sc); Q.vx = rand(-0.1, 0.1); Q.vz = rand(-0.1, 0.1);
      Q.ttl = rand(0.45, 0.75); Q.s0 = rand(0.45, 0.7) * sc; Q.s1 = 0.12 * sc; Q.grow = 0.25; Q.rot = rand(-0.12, 0.12); Q.c0 = '#ffffff'; Q.c1 = '#ffc0a0'; Q.fl = FLICK; Q.fr = FR.flame; add();
    });
    emit(1, 10 * sc + 4, () => {   // licking tongues
      const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * 0.4 * sc;
      p(e.x + Math.cos(a) * r, e.y + 0.1 * sc, e.z + Math.sin(a) * r); Q.vy = rand(0.9, 1.5) * Math.sqrt(sc); Q.ttl = rand(0.35, 0.6); Q.s0 = rand(0.2, 0.34) * sc; Q.s1 = 0.04 * sc; Q.grow = 0.2; Q.rot = rand(-0.2, 0.2); Q.fr = FR.tongue; Q.c1 = '#ffd0b0'; add();
    });
    emit(2, 7, () => { p(e.x, e.y + 0.3 * sc, e.z); Q.L = ADD; Q.ttl = 0.5; Q.s0 = 1.5 * sc; Q.s1 = 1.7 * sc; Q.c0 = '#ff7a1a'; Q.a0 = 0.28; Q.a1 = 0; Q.fr = FR.soft; add(); });
    emit(3, 5 * sc, () => { p(e.x + rand(-0.3, 0.3) * sc, e.y + 0.3 * sc, e.z + rand(-0.3, 0.3) * sc); Q.L = ADD; Q.vy = rand(1.4, 2.6); Q.vx = rand(-0.4, 0.4); Q.vz = rand(-0.4, 0.4); Q.drag = 0.6; Q.ttl = rand(0.7, 1.3); Q.s0 = 0.05; Q.s1 = 0.015; Q.c0 = '#ffd36a'; Q.a1 = 0; Q.fr = FR.spark; Q.str = 0.04; add(); });
    if (e.smoke) emit(4, 2.6, () => { p(e.x + rand(-0.2, 0.2) * sc, e.y + 0.75 * sc, e.z + rand(-0.2, 0.2) * sc); Q.L = SOFT; Q.vy = rand(0.4, 0.7); Q.grav = -0.02; Q.ttl = rand(1.8, 2.6); Q.s0 = 0.35 * sc; Q.s1 = 1.3 * sc; Q.rv = rand(-0.5, 0.5); Q.c0 = '#4a403a'; Q.c1 = '#2a2624'; Q.a0 = 0.45; Q.a1 = 0; Q.fr = FR.smoke; add(); });
    e.snd -= dt; if (e.snd <= 0) { e.snd = rand(0.15, 0.4); _v.set(e.x, e.y, e.z); SFX.crackle(_v); }
  }

  /* ----- speech bubbles ----- */
  function bubble(target, text, secs) {
    if (!ready) return; let b = bubbles.find(x => x.target === target && x.t < x.dur) || bubbles.find(x => x.t >= x.dur) || (bubbles.length < 8 ? null : bubbles.reduce((a, c) => a.t > c.t ? a : c));
    if (!b) {
      const c = document.createElement('canvas'); c.width = 512; c.height = 256; const tex = new THREE.CanvasTexture(c);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: true, depthWrite: false })); sp.renderOrder = 30; sp.visible = false; W.scene.add(sp);   // depth-tested: walls hide what is said next door
      b = { c, g: c.getContext('2d'), tex, sp, t: 0, dur: 0 }; bubbles.push(b);
    }
    const g = b.g; g.clearRect(0, 0, 512, 256);
    let fs = 64; g.font = fs + 'px "Lilita One", "Alfa Slab One", sans-serif'; while (g.measureText(text).width > 420 && fs > 30) { fs -= 4; g.font = fs + 'px "Lilita One", "Alfa Slab One", sans-serif'; }
    const tw = Math.min(460, g.measureText(text).width + 60), bh = fs + 50, x0 = (512 - tw) / 2, y0 = 150 - bh;
    g.lineJoin = 'round'; g.lineWidth = 10; g.strokeStyle = '#141824'; g.fillStyle = '#ffffff';
    rrect(g, x0, y0, tw, bh, 30); g.stroke(); g.beginPath(); g.moveTo(236, 146); g.lineTo(222, 196); g.lineTo(272, 146); g.closePath(); g.stroke(); g.fill(); rrect(g, x0, y0, tw, bh, 30); g.fill();
    g.fillStyle = '#141824'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 256, y0 + bh / 2 + 3);
    b.tex.needsUpdate = true; b.target = target; b.t = 0; b.dur = secs || 2.2; b.sp.visible = true; b.lift = 0;
  }
  function stepBubbles(dt) {
    for (const b of bubbles) {
      if (b.t >= b.dur) { b.sp.visible = false; continue; }
      b.t += dt; const tg = b.target;
      if (tg && tg.head) { tg.head.getWorldPosition(_v); _v.y += 0.62 * (tg.group.scale.y || 1); } else if (tg && tg.group) { tg.group.getWorldPosition(_v); _v.y += 2.3 * (tg.group.scale.y || 1); } else if (tg) _v.set(tg.x, tg.y, tg.z);
      const k = Math.min(1, b.t / 0.18), pop = backOut(k), fade = Math.min(1, (b.dur - b.t) / 0.3);
      b.sp.position.set(_v.x, _v.y + b.t * 0.12, _v.z); b.sp.scale.set(1.0 * pop, 0.5 * pop, 1); b.sp.material.opacity = fade;
      if (b.t >= b.dur) b.sp.visible = false;
    }
  }

  /* ----- screen effects ----- */
  const scr = { shake: 0, shakeT: 0, shakeD: 0.01, flash: null, tint: null, tintT: 0, os: false };
  function el(id) { let e = document.getElementById(id); if (!e) { e = document.createElement('div'); e.id = id; document.body.append(e); } return e; }
  function stepScreen(dt, t) {
    const cam = W.camera; if (!cam) return;
    if (scr.shakeT > 0) {
      scr.shakeT -= dt; const k = Math.max(0, scr.shakeT / scr.shakeD), a = scr.shake * k * k;
      const ox = (Math.sin(t * 71) + Math.sin(t * 37) * 0.6) * a, oy = (Math.sin(t * 83 + 1) + Math.sin(t * 29) * 0.5) * a;
      cam.position.x += ox * 0.06; cam.position.y += oy * 0.06; cam.rotation.z += Math.sin(t * 61) * a * 0.025; cam.rotation.x += oy * 0.01;
      const os = document.getElementById('os'); if (os && typeof OS !== 'undefined' && OS.open) { os.style.transform = 'translate(' + (ox * 14).toFixed(1) + 'px,' + (oy * 14).toFixed(1) + 'px)'; scr.os = true; }
      if (scr.shakeT <= 0) { scr.shake = 0; if (scr.os) { scr.os = false; if (os) os.style.transform = ''; } }
    }
    if (scr.tint && scr.tint.until && t > scr.tint.until) { tint(null); }
    if (light) {
      light.intensity = Math.max(0, light.intensity - dt * (light.userData.decay || 6));
      if (light.intensity < 0.05 && emitters.length) {   // flicker near the closest fire
        let best = null, bd = 12; for (const e of emitters) { const d = Math.hypot(e.x - cam.position.x, e.z - cam.position.z); if (d < bd) { bd = d; best = e; } }
        if (best) { light.position.set(best.x, best.y + 0.8, best.z); light.color.set('#ff8a2a'); light.intensity = (0.8 + Math.sin(t * 23) * 0.15 + Math.sin(t * 9) * 0.2) * Math.min(1.5, best.sc); light.userData.decay = 0; }
      }
    }
  }
  function shake(amount, secs) { if (amount > scr.shake * Math.max(0, scr.shakeT / scr.shakeD)) { scr.shake = amount; scr.shakeT = scr.shakeD = secs || 0.4; } }
  function flash(color, secs, alpha) {
    const e = el('fx-flash'); e.style.transition = 'none'; e.style.background = color || '#ffffff'; e.style.opacity = alpha == null ? 0.75 : alpha;
    void e.offsetWidth; e.style.transition = 'opacity ' + (secs || 0.25) + 's ease-out'; e.style.opacity = 0;
  }
  function tint(color, amount, secs) {
    const e = el('fx-tint');
    if (!color) { scr.tint = null; e.style.opacity = 0; return; }
    e.style.setProperty('--tint', color); e.style.opacity = amount == null ? 0.35 : amount;
    scr.tint = { color, until: secs > 0 ? (W.t || 0) + secs : 0 };
  }

  /* ----- presets ----- */
  const PAL = ['#ff3b6b', '#ffd23b', '#3bc9ff', '#7cf05b', '#b46bff', '#ff8a2b', '#ffffff', '#ff5bd1'];
  const kinds = {
    stars(c, o) {
      const n = clamp(o.n || 7, 1, 16), sc = o.scale || 1;
      for (let i = 0; i < n; i++) {
        const a = i / n * 6.28 + rand(-0.3, 0.3), sp = rand(1.8, 3) * sc;
        p(c.x, c.y, c.z); Q.vx = Math.cos(a) * sp; Q.vz = Math.sin(a) * sp; Q.vy = rand(1.2, 2.8) * sc; Q.drag = 2.2; Q.grav = 0.3;
        Q.ttl = rand(0.7, 1.0); Q.s0 = rand(0.2, 0.28) * sc; Q.s1 = 0.06 * sc; Q.grow = 0.18; Q.rv = rand(-7, 7); Q.fr = FR.star; add();
      }
      p(c.x, c.y, c.z); Q.L = ADD; Q.ttl = 0.22; Q.s0 = 0.15 * sc; Q.s1 = 1.0 * sc; Q.c0 = '#fff2a0'; Q.a1 = 0; Q.fr = FR.ring; add();
      p(c.x, c.y, c.z); Q.L = ADD; Q.ttl = 0.12; Q.s0 = 0.9 * sc; Q.s1 = 0.5 * sc; Q.c0 = '#ffffff'; Q.a0 = 0.8; Q.a1 = 0; Q.fr = FR.soft; add();
      for (let i = 0; i < 7; i++) { const a = Math.random() * 6.28, b = rand(-0.6, 0.9); p(c.x, c.y, c.z); Q.L = ADD; Q.vx = Math.cos(a) * 6; Q.vz = Math.sin(a) * 6; Q.vy = b * 5; Q.drag = 6; Q.ttl = 0.22; Q.s0 = 0.07 * sc; Q.s1 = 0.02; Q.str = 0.05; Q.c0 = '#fff6c0'; Q.a1 = 0; Q.fr = FR.spark; add(); }
      if (o.orbit) for (let i = 0; i < 3; i++) { p(c.x, c.y + 0.05, c.z); Q.fl = ORBIT; Q.vx = 0.3 * sc; Q.e1 = i * 2.09; Q.rv = 5; Q.ttl = Math.min(8, o.orbit); Q.s0 = Q.s1 = 0.15 * sc; Q.grow = 0.1; Q.fr = FR.star; add(); }
    },
    hit(c, o) { kinds.stars(c, Object.assign({ n: 4, scale: 0.8 }, o)); },
    spray(c, o) { const d = V(o.dir || [0, 0.3, -1]); Stream({ color: o.color, life: clamp(o.dur || 1.2, 0.1, 6) }).set(c, d, true); },
    splash(c, o) { splash(c.x, c.y, c.z, o.color || '#ff9418', clamp(o.n || 8, 1, 30), o.up || 1); },
    fart(c, o) {
      const d = V(o.dir || [0, 0, 1]), sc = o.scale || 1;
      for (let i = 0; i < 9; i++) {   // the jet
        p(c.x, c.y, c.z); Q.L = SOFT; const sp = rand(1.5, 3.2); Q.vx = d.x * sp + rand(-0.3, 0.3); Q.vy = d.y * sp + rand(-0.2, 0.3); Q.vz = d.z * sp + rand(-0.3, 0.3);
        Q.drag = 2.6; Q.ttl = rand(0.9, 1.5); Q.s0 = 0.12 * sc; Q.s1 = 0.55 * sc; Q.delay = i * 0.03; Q.c0 = '#b5e04a'; Q.c1 = '#8ab832'; Q.a0 = 0.95; Q.a1 = 0; Q.rv = rand(-1, 1); Q.fr = FR.puff; add();
      }
      const cx = c.x + d.x * 0.7 * sc, cy = c.y + 0.15, cz = c.z + d.z * 0.7 * sc;
      for (let i = 0; i < 18; i++) {   // the lingering cloud
        const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * 0.6 * sc;
        p(cx + Math.cos(a) * r, cy + rand(-0.2, 0.5) * sc, cz + Math.sin(a) * r); Q.L = SOFT;
        Q.vx = Math.cos(a) * rand(0.1, 0.4) + d.x * 0.3; Q.vz = Math.sin(a) * rand(0.1, 0.4) + d.z * 0.3; Q.vy = rand(0, 0.15); Q.drag = 0.8; Q.grav = -0.004;
        Q.ttl = rand(5, 7.5); Q.s0 = rand(0.3, 0.5) * sc; Q.s1 = rand(1.0, 1.5) * sc; Q.grow = 0.08; Q.delay = 0.1 + i * 0.015; Q.rv = rand(-0.35, 0.35);
        Q.c0 = i % 4 === 0 ? '#93c232' : '#b4e04a'; Q.c1 = '#a6cc44'; Q.a0 = 0.85; Q.a1 = 0; Q.fr = FR.puff; add();
      }
      if (o.sound !== false) SFX.fart(c);
    },
    cough(c, o) { const d = V(o.dir || [0, 0, -1]); for (let i = 0; i < 4; i++) { p(c.x, c.y, c.z); Q.L = SOFT; Q.vx = d.x * 1.2 + rand(-0.2, 0.2); Q.vy = rand(0, 0.3); Q.vz = d.z * 1.2 + rand(-0.2, 0.2); Q.drag = 3; Q.ttl = 0.9; Q.delay = i * 0.2; Q.s0 = 0.08; Q.s1 = 0.3; Q.c0 = '#c9d6a0'; Q.a0 = 0.8; Q.a1 = 0; Q.fr = FR.puff; add(); } },
    confetti(c, o) {
      const d = V(o.dir || [0, 1, 0]), n = clamp(o.n || 80, 4, 160), sc = o.scale || 1;
      for (let i = 0; i < n; i++) {
        p(c.x, c.y, c.z); const sp = rand(3.5, 8) * sc, s = 0.45;
        Q.vx = (d.x + rand(-s, s)) * sp; Q.vy = (d.y + rand(-s, s)) * sp + 1; Q.vz = (d.z + rand(-s, s)) * sp;
        Q.drag = rand(2.2, 3.2); Q.grav = 0.32; Q.ttl = rand(3, 4.5); Q.s0 = Q.s1 = rand(0.05, 0.08) * sc; Q.rv = rand(-14, 14);
        Q.c0 = PAL[i % PAL.length]; Q.fl = FLUTTER | FLOOR | REST; Q.bounce = 0.1; Q.fr = Math.random() < 0.7 ? FR.rect : FR.curl; add();
      }
      p(c.x, c.y, c.z); Q.L = ADD; Q.ttl = 0.14; Q.s0 = 0.6; Q.s1 = 0.3; Q.c0 = '#fff6d0'; Q.a1 = 0; Q.fr = FR.soft; add();
      for (let i = 0; i < 5; i++) { p(c.x, c.y, c.z); Q.L = SOFT; Q.vx = d.x * 1.5 + rand(-0.5, 0.5); Q.vy = d.y * 1.5 + rand(-0.3, 0.5); Q.vz = d.z * 1.5 + rand(-0.5, 0.5); Q.drag = 4; Q.ttl = 0.5; Q.s0 = 0.06; Q.s1 = 0.22; Q.c0 = '#f0ebe0'; Q.a0 = 0.55; Q.a1 = 0; Q.fr = FR.puff; add(); }
      if (o.sound !== false) SFX.pop(c);
    },
    smoke(c, o) {
      const n = clamp(o.n || 9, 1, 40), sc = o.scale || 1;
      for (let i = 0; i < n; i++) { p(c.x + rand(-0.25, 0.25) * sc, c.y + rand(0, 0.3) * sc, c.z + rand(-0.25, 0.25) * sc); Q.L = SOFT; Q.vx = rand(-0.3, 0.3); Q.vy = rand(0.3, 0.8); Q.vz = rand(-0.3, 0.3); Q.drag = 0.8; Q.grav = -0.03; Q.ttl = rand(2.2, 3.6); Q.delay = i * 0.05; Q.s0 = 0.3 * sc; Q.s1 = rand(1.0, 1.5) * sc; Q.rv = rand(-0.6, 0.6); Q.c0 = o.color || '#8c8784'; Q.c1 = '#5a5654'; Q.a0 = 0.7; Q.a1 = 0; Q.fr = FR.smoke; add(); }
    },
    puff(c, o) {
      const sc = o.scale || 1;
      for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28; p(c.x, c.y + 0.05, c.z); Q.L = SOFT; Q.vx = Math.cos(a) * 1.6 * sc; Q.vz = Math.sin(a) * 1.6 * sc; Q.vy = rand(0.1, 0.4); Q.drag = 4; Q.ttl = 0.6; Q.s0 = 0.12 * sc; Q.s1 = 0.45 * sc; Q.c0 = o.color || '#e2dccf'; Q.a0 = 0.75; Q.a1 = 0; Q.fr = FR.puff; add(); }
    },
    fire(c, o) { return Fire(c, o.scale || 1, o.dur == null ? 10 : o.dur, o); },
    explosion(c, o) {
      const sc = o.scale || 1;
      p(c.x, c.y, c.z); Q.L = ADD; Q.ttl = 0.22; Q.s0 = 4 * sc; Q.s1 = 2.4 * sc; Q.c0 = '#fff4c0'; Q.a1 = 0; Q.fr = FR.soft; add();
      p(c.x, c.y + 0.1, c.z); Q.L = ADD; Q.ttl = 0.32; Q.s0 = 0.4 * sc; Q.s1 = 4.5 * sc; Q.c0 = '#ffd890'; Q.a0 = 0.9; Q.a1 = 0; Q.fr = FR.ring; add();
      for (let i = 0; i < 8; i++) { const a = Math.random() * 6.28, sp = rand(1, 2.5) * sc; p(c.x, c.y + 0.2 * sc, c.z); Q.L = ADD; Q.vx = Math.cos(a) * sp; Q.vz = Math.sin(a) * sp; Q.vy = rand(0.5, 2) * sc; Q.drag = 5; Q.ttl = rand(0.35, 0.55); Q.s0 = 0.8 * sc; Q.s1 = 2.8 * sc; Q.grow = 0.2; Q.c0 = '#ffe9a0'; Q.c1 = '#ff6a1a'; Q.a1 = 0; Q.fr = FR.fireball; add(); }
      for (let i = 0; i < 12; i++) { p(c.x + rand(-0.2, 0.2) * sc, c.y + rand(-0.1, 0.3) * sc, c.z + rand(-0.2, 0.2) * sc); Q.L = SOFT; const a = Math.random() * 6.28, sp = rand(1.5, 4) * sc; Q.vx = Math.cos(a) * sp; Q.vz = Math.sin(a) * sp; Q.vy = rand(0.5, 3) * sc; Q.drag = 4; Q.ttl = rand(0.5, 0.9); Q.s0 = 0.5 * sc; Q.s1 = rand(1.6, 2.4) * sc; Q.grow = 0.15; Q.c0 = '#fff8d0'; Q.c1 = '#ff4a12'; Q.a0 = 1; Q.a1 = 0; Q.fr = FR.fireball; add(); }
      for (let i = 0; i < 18; i++) { const a = Math.random() * 6.28, sp = rand(2, 6) * sc; p(c.x, c.y + 0.1, c.z); Q.vx = Math.cos(a) * sp; Q.vz = Math.sin(a) * sp; Q.vy = rand(1, 5) * sc; Q.drag = 3.5; Q.ttl = rand(0.4, 0.7); Q.s0 = rand(0.6, 1.0) * sc; Q.s1 = 0.1; Q.grow = 0.2; Q.fl = FLICK; Q.fr = FR.flame; add(); }
      for (let i = 0; i < 16; i++) { const a = Math.random() * 6.28, sp = rand(1, 3) * sc; p(c.x, c.y + rand(0, 0.5) * sc, c.z); Q.L = SOFT; Q.vx = Math.cos(a) * sp; Q.vz = Math.sin(a) * sp; Q.vy = rand(0.8, 2.2) * sc; Q.drag = 1.4; Q.grav = -0.05; Q.ttl = rand(2.5, 4); Q.delay = rand(0.05, 0.25); Q.s0 = 0.6 * sc; Q.s1 = rand(2.0, 2.8) * sc; Q.rv = rand(-0.5, 0.5); Q.c0 = '#3a3431'; Q.c1 = '#24201e'; Q.a0 = 0.85; Q.a1 = 0; Q.fr = FR.smoke; add(); }
      for (let i = 0; i < 16; i++) { const a = Math.random() * 6.28, sp = rand(3, 8) * sc; p(c.x, c.y + 0.2, c.z); Q.vx = Math.cos(a) * sp; Q.vz = Math.sin(a) * sp; Q.vy = rand(3, 7) * sc; Q.grav = 1; Q.ttl = rand(2, 3); Q.s0 = Q.s1 = rand(0.07, 0.15) * sc; Q.rv = rand(-12, 12); Q.c0 = pick(['#5a5048', '#3d3a38', '#8a7a68', '#c8b89c']); Q.fl = FLOOR | REST; Q.bounce = 0.35; Q.fr = FR.chunk; add(); }
      for (let i = 0; i < 26; i++) { const a = Math.random() * 6.28, sp = rand(6, 13) * sc; p(c.x, c.y + 0.2, c.z); Q.L = ADD; Q.vx = Math.cos(a) * sp; Q.vz = Math.sin(a) * sp; Q.vy = rand(1, 8) * sc; Q.grav = 0.7; Q.drag = 1.5; Q.ttl = rand(0.4, 0.9); Q.s0 = 0.06; Q.s1 = 0.02; Q.str = 0.05; Q.c0 = '#ffe08a'; Q.c1 = '#ff7a1a'; Q.a1 = 0.2; Q.fl = FLOOR; Q.bounce = 0.4; Q.fr = FR.spark; add(); }
      decal(c.x, Space.ground(c.x, c.y, c.z), c.z, 1.7 * sc, '#1c1714', 45);
      if (light) { light.position.set(c.x, c.y + 0.6, c.z); light.color.set('#ffb060'); light.intensity = 4 * sc; light.userData.decay = 7; }
      const cam = W.camera.position, dd = Math.hypot(c.x - cam.x, c.y - cam.y, c.z - cam.z);
      if (dd < 16) shake(0.9 * sc * (1 - dd / 16) + 0.15, 0.6);
      if (dd < 9) flash('#fff2c8', 0.35, 0.6 * (1 - dd / 9));
      if (o.sound !== false) SFX.boom(c);
    },
    splat(c, o) { decal(c.x, o.y != null ? o.y : Space.ground(c.x, c.y + 0.1, c.z), c.z, o.size || 0.5, o.color || '#ff9418', o.ttl || 35); },
    coins(c, o) {
      const n = clamp(o.n || 16, 1, 60);
      for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, sp = rand(0.8, 2.4); p(c.x, c.y, c.z); Q.vx = Math.cos(a) * sp; Q.vz = Math.sin(a) * sp; Q.vy = rand(3.5, 6); Q.grav = 1; Q.ttl = rand(1.6, 2.4); Q.s0 = Q.s1 = 0.14; Q.rv = rand(-9, 9); Q.fl = FLOOR | REST; Q.bounce = 0.45; Q.fr = FR.coin; add(); }
      for (let i = 0; i < 8; i++) { p(c.x + rand(-0.3, 0.3), c.y + rand(0, 0.6), c.z + rand(-0.3, 0.3)); Q.L = ADD; Q.ttl = rand(0.4, 0.8); Q.delay = rand(0, 0.4); Q.s0 = 0.16; Q.s1 = 0; Q.c0 = '#fff3a0'; Q.fr = FR.star; add(); }
      if (o.sound !== false) SFX.coin(c);
    },
    hearts(c, o) { for (let i = 0; i < (o.n || 5); i++) { p(c.x + rand(-0.2, 0.2), c.y, c.z + rand(-0.2, 0.2)); Q.vy = rand(0.6, 1.2); Q.vx = rand(-0.3, 0.3); Q.vz = rand(-0.3, 0.3); Q.ttl = 1.4; Q.delay = i * 0.12; Q.s0 = 0.16; Q.s1 = 0.05; Q.grow = 0.2; Q.c0 = '#ff4f7a'; Q.fr = FR.heart; Q.rot = 0; add(); } }
  };

  function init() {
    if (ready || !W.scene) return;
    const tex = atlasTex();
    CUT = Layer(1600, 'cut', tex); SOFT = Layer(700, 'soft', tex); ADD = Layer(700, 'add', tex); layers = [CUT, SOFT, ADD];
    for (const L of layers) W.scene.add(L.mesh);
    dec = makeDecals(); W.scene.add(dec.im);
    light = new THREE.PointLight(0xffa040, 0, 9, 2); light.userData.decay = 6; W.scene.add(light);
    el('fx-tint'); el('fx-flash');
    ready = true;
  }
  Bus.on('world:built', init);
  Bus.on('quit', () => api.clear());
  Bus.on('game:begin', () => api.clear());

  function update(dt, t) {
    if (!ready) return;
    Space.sync();
    for (let i = emitters.length - 1; i >= 0; i--) { stepFire(emitters[i], dt); if (emitters[i].dead) emitters.splice(i, 1); }
    for (let i = streams.length - 1; i >= 0; i--) { const s = streams[i]; stepStream(s, dt); if (s.dead) { if (s.snd) s.snd.stop(); W.scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); streams.splice(i, 1); } }
    for (const L of layers) stepLayer(L, dt);
    stepDecals(dt); stepBubbles(dt); stepScreen(dt, t);
  }
  Loop.add(update);

  const api = {
    FR, kinds, Space,
    /* play an effect locally: FX.spawn('stars', pos, {n, scale, orbit}); returns the emitter for 'fire' */
    spawn(kind, pos, opts) {
      if (!ready || !kinds[kind]) return null; const c = V(pos), o = opts || {}; let r = null;
      try { r = kinds[kind](c, o) || null; } catch (e) { console.error('FX ' + kind, e); }
      Bus.emit('fx', kind, c, o); return r;
    },
    /* play locally and on every other player's screen */
    net(kind, pos, opts) {
      const c = V(pos), r = this.spawn(kind, c, opts);
      if (typeof Net !== 'undefined') Net.emit('fx', { k: kind, p: [+c.x.toFixed(2), +c.y.toFixed(2), +c.z.toFixed(2)], o: opts || null });
      return r;
    },
    fire(pos, scale, secs, opts) { return ready ? Fire(V(pos), scale || 1, secs == null ? 10 : secs, opts) : null; },
    stream: Stream,
    decal(pos, size, color, ttl) { const c = V(pos); decal(c.x, c.y, c.z, size, color, ttl); },
    bubble, shake, flash, tint,
    /* low-level: add one particle. FX.particle({layer:'cut'|'soft'|'add', pos, vel, ttl, size:[s0,s1], color, color2, alpha:[a0,a1], frame, gravity, drag}) */
    particle(o) {
      if (!ready) return; const c = V(o.pos), v = V(o.vel); p(c.x, c.y, c.z); Q.L = o.layer === 'soft' ? SOFT : o.layer === 'add' ? ADD : CUT;
      Q.vx = v.x; Q.vy = v.y; Q.vz = v.z; Q.ttl = o.ttl || 1; const s = [].concat(o.size || 0.2); Q.s0 = s[0]; Q.s1 = s[1] == null ? s[0] : s[1];
      Q.c0 = o.color || '#ffffff'; Q.c1 = o.color2 || Q.c0; const a = [].concat(o.alpha == null ? 1 : o.alpha); Q.a0 = a[0]; Q.a1 = a[1] == null ? a[0] : a[1];
      Q.fr = typeof o.frame === 'string' ? FR[o.frame] || 0 : o.frame || 0; Q.grav = o.gravity || 0; Q.drag = o.drag || 0; Q.fl = o.floor ? FLOOR : 0; add();
    },
    clear() {
      if (!ready) return;
      for (const L of layers) { L.n = 0; L.geo.instanceCount = 0; }
      emitters.length = 0;
      for (const s of streams) { if (s.snd) s.snd.stop(); W.scene.remove(s.mesh); } streams.length = 0;
      for (let k = 0; k < DEC; k++) { dec.list[k] = null; setDec(k); } dec.im.instanceMatrix.needsUpdate = true;
      for (const b of bubbles) { b.t = b.dur; b.sp.visible = false; }
      tint(null); scr.shakeT = 0;
    },
    get ready() { return ready; },
    stats() { return ready ? { cut: CUT.n, soft: SOFT.n, add: ADD.n, streams: streams.length, fires: emitters.length } : null; }
  };
  return api;
})();
Net.on('fx', d => {
  if (!d || typeof d.k !== 'string' || !FX.kinds[d.k] || !Array.isArray(d.p) || d.p.length !== 3 || !d.p.every(Number.isFinite)) return;
  const o = d.o && typeof d.o === 'object' ? d.o : {};
  for (const k in o) if (typeof o[k] === 'string') o[k] = o[k].slice(0, 40); else if (typeof o[k] === 'number' && !Number.isFinite(o[k])) o[k] = 0;
  if (o.n) o.n = clamp(+o.n || 1, 1, 160); if (o.scale) o.scale = clamp(+o.scale || 1, 0.1, 4); if (o.dur) o.dur = clamp(+o.dur || 1, 0, 60);
  FX.spawn(d.k, d.p, o);
});
