'use strict';
/* =====================================================================
   WALLPAPERS — procedural "photo" landscapes for the LegitOS desktop
   (sky gradient + lit perspective clouds + a heightfield terrain raycaster
   with sun light, cast shadows and haze + mirror-water with ripples + grain),
   and the Wallpapers app. The choice is saved in settings.wallpaper.
   Wallpapers.render(id[, w, h]) -> <canvas>/<svg> element (full size is cached).
   ===================================================================== */
const Wallpapers = (() => {
  /* ---------- seeded random + gradient noise ---------- */
  function rng(seed) { let a = (seed >>> 0) || 1; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function Noise(seed) {
    const R = rng(seed), p = new Uint8Array(512), gx = new Float32Array(256), gy = new Float32Array(256);
    for (let i = 0; i < 256; i++) { p[i] = i; const a = R() * Math.PI * 2; gx[i] = Math.cos(a); gy[i] = Math.sin(a); }
    for (let i = 255; i > 0; i--) { const j = (R() * (i + 1)) | 0, t = p[i]; p[i] = p[j]; p[j] = t; }
    for (let i = 0; i < 256; i++) p[i + 256] = p[i];
    const n2 = (x, y) => {
      const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, X = xi & 255, Y = yi & 255;
      const a = p[p[X] + Y], b = p[p[X + 1] + Y], c = p[p[X] + Y + 1], d = p[p[X + 1] + Y + 1];
      const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10), v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);
      const n00 = gx[a] * xf + gy[a] * yf, n10 = gx[b] * (xf - 1) + gy[b] * yf, n01 = gx[c] * xf + gy[c] * (yf - 1), n11 = gx[d] * (xf - 1) + gy[d] * (yf - 1);
      const x0 = n00 + u * (n10 - n00), x1 = n01 + u * (n11 - n01);
      return (x0 + v * (x1 - x0)) * 1.42;
    };
    /* fractal sum of `oct` octaves; stops once the wavelength is below `minW` (level of detail) */
    n2.fbm = (x, y, oct, minW) => { let s = 0, a = 1, f = 1, t = 0; for (let i = 0; i < oct; i++) { if (minW && 1 / f < minW) break; s += a * n2(x * f + i * 17.3, y * f - i * 9.1); t += a; a *= 0.5; f *= 2.03; } return t ? s / t : 0; };
    /* ridged multifractal: sharp crests for alpine peaks */
    n2.ridge = (x, y, oct, minW) => { let s = 0, a = 0.5, f = 1, w = 1; for (let i = 0; i < oct; i++) { if (minW && 1 / f < minW) break; let r = 1 - Math.abs(n2(x * f + i * 31.7, y * f + i * 7.9)); r *= r * w; w = Math.min(1, r * 2); s += r * a; a *= 0.5; f *= 2.01; } return s; };
    return n2;
  }
  const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
  const sstep = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  const mix = (a, b, t) => a + (b - a) * t;
  const hex = s => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
  const mkCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const norm3 = v => { const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; };
  const mixc = (o, c, t) => { o[0] += (c[0] - o[0]) * t; o[1] += (c[1] - o[1]) * t; o[2] += (c[2] - o[2]) * t; };
  let grainTile = null;

  /* ---------- sky ---------- */
  function paintSky(g, c) {
    const { W, H, hz, sc } = c, S = sc.sky;
    const gr = g.createLinearGradient(0, 0, 0, hz);
    S.stops.forEach(([o, col]) => gr.addColorStop(o, col));
    g.fillStyle = gr; g.fillRect(0, 0, W, hz + 1);
    g.fillStyle = S.stops[S.stops.length - 1][1]; g.fillRect(0, hz, W, H - hz);
    if (S.sun) {
      const sx = S.sun.x * W, sy = S.sun.y * H;
      g.globalCompositeOperation = 'screen';
      for (const [r, col] of S.sun.glows) { const rg = g.createRadialGradient(sx, sy, 0, sx, sy, r * W); rg.addColorStop(0, col); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(0, 0, W, hz + 1); }
      g.globalCompositeOperation = 'source-over';
    }
    (S.clouds || []).forEach(cl => clouds(g, c, cl));
    if (S.sun && S.sun.r) {   // the disc goes in front of thin cloud
      const sx = S.sun.x * W, sy = S.sun.y * H, r = S.sun.r * W, rg = g.createRadialGradient(sx, sy, 0, sx, sy, r * 2.2);
      rg.addColorStop(0, '#fffef6'); rg.addColorStop(0.42, S.sun.disc || '#fff2c8'); rg.addColorStop(0.5, 'rgba(255,220,160,.55)'); rg.addColorStop(1, 'rgba(255,200,140,0)');
      g.fillStyle = rg; g.beginPath(); g.arc(sx, sy, r * 2.2, 0, 7); g.fill();
    }
  }
  /* a cloud layer on a plane above the camera, lit from the sun's screen position */
  function clouds(g, c, C) {
    const { W, hz, f } = c, s = C.res || 0.5, w = Math.ceil(W * s), hh = Math.ceil(hz * s), fs = f * s, hzs = hz * s;
    if (hh < 2) return;
    const cv = mkCanvas(w, hh), cg = cv.getContext('2d'), im = cg.createImageData(w, hh), d = im.data, N = Noise(C.seed);
    const dark = hex(C.dark), lit = hex(C.lit), glow = C.glow ? hex(C.glow) : null, haze = hex(C.haze || '#ffffff');
    const sunx = C.sunX * w, suny = C.sunY * hh, sc = C.scale, cover = C.cover, soft = C.soft || 0.25, alt = C.alt || 1000, sq = C.squash || 1;
    const ox = C.ox || 0, oz = C.oz || 0, oct = C.oct || 6, lk = C.lk || 5, al = C.alpha == null ? 1 : C.alpha, top = C.top || 0;
    for (let y = 0; y < hh; y++) {
      const dy = hzs - y; if (dy < 1) continue;
      const dist = alt * fs / dy, fade = sstep(0, (C.fade || 0.1) * hzs, dy) * (top ? sstep(0, top * hzs, y) : 1), hk = (1 - sstep(0, (C.hazeH || 0.5) * hzs, dy)) * (C.hazeK || 0.7);
      for (let x = 0; x < w; x++) {
        const u = (x - w / 2) / fs, wx = u * dist + ox, wz = dist + oz;
        const n = N.fbm(wx * sc, wz * sc * sq, oct);
        const a = sstep(cover, cover + soft, n) * fade; if (a <= 0.004) continue;
        let lx = sunx - x, ly = suny - y; const ll = Math.hypot(lx, ly) || 1; lx /= ll; ly /= ll;
        const x2 = x + lx * 2.5, y2 = Math.min(hzs - 1.2, y + ly * 2.5), d2 = alt * fs / (hzs - y2), u2 = (x2 - w / 2) / fs;
        const n2 = N.fbm((u2 * d2 + ox) * sc, (d2 + oz) * sc * sq, oct - 2);
        const light = clamp01(0.5 + (n - n2) * lk), thick = sstep(cover, cover + soft * 2.4, n), k = clamp01(light * 0.8 + (1 - thick) * 0.38);
        let r = mix(dark[0], lit[0], k), gg = mix(dark[1], lit[1], k), b = mix(dark[2], lit[2], k);
        if (glow) { const sx = (x - sunx) / w, sy = (y - suny) / hh * 0.7, gk = Math.exp(-(sx * sx + sy * sy) * (C.glowK || 6)) * (1 - thick * 0.55); r += glow[0] * gk; gg += glow[1] * gk; b += glow[2] * gk; }
        r = mix(r, haze[0], hk); gg = mix(gg, haze[1], hk); b = mix(b, haze[2], hk);
        const i = (y * w + x) * 4; d[i] = r; d[i + 1] = gg; d[i + 2] = b; d[i + 3] = a * al * 255;
      }
    }
    cg.putImageData(im, 0, 0);
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(cv, 0, 0, W, hz);
  }

  /* ---------- terrain: heightfield sampled on a perspective grid (column angle x log depth) ---------- */
  function terrain(img, c) {
    const { W, H, hz, f, sc } = c, T = sc.terrain, N = Noise(T.seed), camH = T.camH;
    const NU = Math.ceil(W / 2) + 2, NZ = Math.max(90, Math.round((T.steps || 440) * Math.min(1, W / 1200) ** 0.5)), z0 = T.near || 5, z1 = T.far || 8000;
    const zs = new Float32Array(NZ), lz = Math.log(z1 / z0), us = new Float32Array(NU), du = 2 / f;
    for (let j = 0; j < NZ; j++) zs[j] = z0 * Math.exp(lz * j / (NZ - 1));
    for (let i = 0; i < NU; i++) us[i] = (i * 2 - 1 - W / 2) / f;
    const hm = new Float32Array(NU * NZ);
    for (let j = 0; j < NZ; j++) { const z = zs[j], fp = z * du; for (let i = 0; i < NU; i++) hm[j * NU + i] = T.height(N, us[i] * z, z, fp); }
    // cast shadows by sweeping each depth row from the sun's side
    let sh = null;
    if (T.shadows) {
      sh = new Float32Array(NU * NZ).fill(1); const sx = T.sun[0], tanE = T.sun[1] / Math.max(0.05, Math.hypot(T.sun[0], T.sun[2])), soft = T.shadowSoft || 4;
      for (let j = 0; j < NZ; j++) {
        const step = du * zs[j] * tanE; let lev = -1e9;
        for (let q = 0; q < NU; q++) { const i = sx > 0 ? NU - 1 - q : q, k = j * NU + i, h = hm[k]; lev -= step; if (h >= lev) lev = h; else sh[k] = clamp01(1 - (lev - h) / soft); }
      }
    }
    // haze colour = the sky just above the horizon, per screen column
    const d8 = img.data, fogC = new Float32Array(NU * 3), fr = Math.max(0, hz - Math.round(H * 0.012));
    for (let i = 0; i < NU; i++) { const x = clamp01((i * 2 - 1) / (W - 1)) * (W - 1) | 0, k = (fr * W + x) * 4; fogC[i * 3] = d8[k]; fogC[i * 3 + 1] = d8[k + 1]; fogC[i * 3 + 2] = d8[k + 2]; }
    if (T.fogTint) { const t = T.fogTint; for (let i = 0; i < NU; i++) for (let q = 0; q < 3; q++) fogC[i * 3 + q] = mix(fogC[i * 3 + q], t[q], t[3]); }
    const col = new Float32Array(NU * NZ * 3), o = [0, 0, 0], L = sc.water ? sc.water.level : -1e9, sun = T.sun, sunC = T.sunCol, amb = T.amb;
    for (let j = 0; j < NZ; j++) {
      const z = zs[j], ja = Math.max(0, j - 1), jb = Math.min(NZ - 1, j + 1), dz = zs[jb] - zs[ja];
      for (let i = 0; i < NU; i++) {
        const k = j * NU + i, h = hm[k]; if (h < L) continue;
        const ia = Math.max(0, i - 1), ib = Math.min(NU - 1, i + 1);
        const gxw = (hm[j * NU + ib] - hm[j * NU + ia]) / ((us[ib] - us[ia]) * z), gzw = (hm[jb * NU + i] - hm[ja * NU + i]) / dz;
        const il = 1 / Math.sqrt(gxw * gxw + 1 + gzw * gzw), nx = -gxw * il, ny = il, nz = -gzw * il, x = us[i] * z;
        T.color(h, nx, ny, nz, x, z, N, o);
        const lam = Math.max(0, nx * sun[0] + ny * sun[1] + nz * sun[2]) * (sh ? sh[k] : 1), hemi = 0.55 + 0.45 * ny;
        let r = o[0] * (sunC[0] * lam + amb[0] * hemi), gg = o[1] * (sunC[1] * lam + amb[1] * hemi), b = o[2] * (sunC[2] * lam + amb[2] * hemi);
        const fk = 1 - Math.exp(-z * T.fog * Math.exp(-Math.max(0, h) / (T.fogH || 1e9)));
        r = mix(r, fogC[i * 3], fk); gg = mix(gg, fogC[i * 3 + 1], fk); b = mix(b, fogC[i * 3 + 2], fk);
        col[k * 3] = r; col[k * 3 + 1] = gg; col[k * 3 + 2] = b;
      }
    }
    // march every screen column front to back (y-buffer), shading spans between consecutive samples
    const u32 = new Uint32Array(d8.buffer), mask = c.mask = c.mask || new Uint8Array(W * H), gr = T.grain == null ? 0.07 : T.grain;
    for (let x = 0; x < W; x++) {
      const fi = (x + 1) / 2, i0 = Math.min(NU - 2, fi | 0), t = fi - i0;
      let ybuf = H, lastJ = -9, pr = 0, pg = 0, pb = 0, pw = false;
      for (let j = 0; j < NZ; j++) {
        const k0 = j * NU + i0, k1 = k0 + 1;
        let h = hm[k0] + (hm[k1] - hm[k0]) * t; const wet = h < L; if (wet) h = L;
        const y = hz + (camH - h) * f / zs[j];
        if (y >= ybuf) continue;
        let r = 0, gg = 0, b = 0;
        if (!wet) {
          const w0 = hm[k0] < L ? 0 : 1 - t, w1 = hm[k1] < L ? 0 : t, ws = w0 + w1 || 1;
          r = (col[k0 * 3] * w0 + col[k1 * 3] * w1) / ws; gg = (col[k0 * 3 + 1] * w0 + col[k1 * 3 + 1] * w1) / ws; b = (col[k0 * 3 + 2] * w0 + col[k1 * 3 + 2] * w1) / ws;
        }
        const yt = Math.max(0, Math.ceil(y)), yb = Math.min(H, ybuf), smooth = lastJ === j - 1 && pw === wet, span = yb - yt;
        for (let yy = yt; yy < yb; yy++) {
          const p = yy * W + x;
          if (wet) { mask[p] = 1; continue; }
          const q = smooth && span > 1 ? (yy - yt) / span : 0, nn = 1 + (((Math.imul(p, 2654435761) >>> 8) & 255) / 255 - 0.5) * gr;
          const R = (r + (pr - r) * q) * nn, Gc = (gg + (pg - gg) * q) * nn, B = (b + (pb - b) * q) * nn;
          mask[p] = 0; u32[p] = 0xff000000 | (Math.min(255, B) << 16) | (Math.min(255, Gc) << 8) | Math.min(255, R);
        }
        ybuf = Math.min(ybuf, yt); lastJ = j; pr = r; pg = gg; pb = b; pw = wet;
        if (ybuf <= 0) break;
      }
      // beyond the far plane: open water (seen to the horizon) or haze
      for (let yy = hz; yy < ybuf; yy++) {
        const p = yy * W + x;
        if (sc.water && T.farWater) mask[p] = 1;
        else { const i = Math.min(NU - 1, i0); u32[p] = 0xff000000 | (fogC[i * 3 + 2] << 16) | (fogC[i * 3 + 1] << 8) | fogC[i * 3]; }
      }
    }
  }

  /* ---------- water: per-column mirror about the far shore, rippled, fresnel-mixed with the deep colour ---------- */
  function water(img, c) {
    const { W, H, hz, f, sc, mask } = c, Wt = sc.water, N = Noise(Wt.seed || 7), u32 = new Uint32Array(img.data.buffer), src = u32.slice();
    const camH = sc.terrain ? sc.terrain.camH - Wt.level : Wt.camH, deep = hex(Wt.deep), amp = Wt.amp * H / 900, k = Wt.k, rf = Wt.refl || 0.9, shd = Wt.shade || 0.1, f0 = Wt.f0 == null ? 0.3 : Wt.f0;
    const rowZ = new Float32Array(H), rowF = new Float32Array(H);
    for (let y = hz; y < H; y++) { const dy = Math.max(0.6, y - hz); rowZ[y] = camH * f / dy; const ang = Math.atan(dy / f); rowF[y] = f0 + (1 - f0) * Math.pow(1 - Math.sin(ang), 5); }
    const sparkle = Wt.sparkle || 0;
    for (let x = 0; x < W; x++) {
      let y0 = -1; for (let y = hz; y < H; y++) if (mask[y * W + x]) { y0 = y; break; }
      if (y0 < 0) continue;
      const ux = (x - W / 2) / f;
      for (let y = y0; y < H; y++) {
        const p = y * W + x; if (!mask[p]) continue;
        const z = rowZ[y], wx = ux * z, near = (y - hz) / (H - hz), fp = z / f;
        const n1 = N.fbm(wx * k, z * k * 4, 4, fp * k * 2), n2 = N.fbm(wx * k * 0.7 + 50, z * k * 3, 3, fp * k * 2);
        const a = amp * (0.3 + 0.7 * near);
        let ym = Math.round(2 * y0 - y - 1 + n1 * a * 2.2), xm = Math.round(x + n2 * a * 0.9);
        xm = xm < 0 ? 0 : xm >= W ? W - 1 : xm; ym = ym < 0 ? 0 : ym >= H ? H - 1 : ym;
        if (mask[ym * W + xm]) ym = Math.max(0, Math.min(hz - 1, 2 * hz - y));
        const s = src[ym * W + xm], F = rowF[y], sh = 1 + n1 * shd;
        let r = ((s & 255) * rf * F + deep[0] * (1 - F)) * sh, g = (((s >> 8) & 255) * rf * F + deep[1] * (1 - F)) * sh, b = (((s >> 16) & 255) * rf * F + deep[2] * (1 - F)) * sh;
        if (sparkle && n1 > 0.42) { const sp = (n1 - 0.42) * sparkle * (1 - near); r += sp; g += sp * 0.9; b += sp * 0.7; }
        u32[p] = 0xff000000 | (Math.min(255, Math.max(0, b)) << 16) | (Math.min(255, Math.max(0, g)) << 8) | Math.min(255, Math.max(0, r));
      }
    }
  }

  /* ---------- finishing: vignette + film grain ---------- */
  function finish(g, c) {
    const { W, H, sc } = c;
    const vg = g.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.3, W / 2, H * 0.5, Math.hypot(W, H) * 0.62);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,' + (sc.vignette == null ? 0.32 : sc.vignette) + ')');
    g.fillStyle = vg; g.fillRect(0, 0, W, H);
    if (!grainTile) { grainTile = mkCanvas(128, 128); const gg = grainTile.getContext('2d'), im = gg.createImageData(128, 128), R = rng(99); for (let i = 0; i < im.data.length; i += 4) { const v = 128 + (R() - 0.5) * 200; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; } gg.putImageData(im, 0, 0); }
    g.globalAlpha = sc.grain == null ? 0.05 : sc.grain; g.globalCompositeOperation = 'overlay'; g.fillStyle = g.createPattern(grainTile, 'repeat'); g.fillRect(0, 0, W, H);
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  }

  function paintScene(sc, W, H) {
    const cv = mkCanvas(W, H), g = cv.getContext('2d', { willReadFrequently: true });
    const hz = Math.round(H * sc.horizon), f = (W / 2) / Math.tan((sc.fov || 60) * Math.PI / 360), c = { W, H, hz, f, sc, mask: null };
    paintSky(g, c);
    if (sc.paint2d) sc.paint2d(g, c);
    if (sc.terrain || sc.water) {
      const img = g.getImageData(0, 0, W, H);
      if (sc.terrain) terrain(img, c);
      if (sc.water) { if (!c.mask) { c.mask = new Uint8Array(W * H); c.mask.fill(1, (hz + 1) * W); } water(img, c); }
      g.putImageData(img, 0, 0);
    }
    if (sc.post) sc.post(g, c);
    finish(g, c);
    return cv;
  }

  /* ===================================================================== scenes */
  const SCENES = [
    { id: 'canyon', name: 'Canyon Lake', horizon: 0.6, fov: 64,
      sky: { stops: [[0, '#1c2740'], [0.3, '#34415e'], [0.62, '#7c6a78'], [0.86, '#e09a68'], [1, '#ffd08c']],
        sun: { x: 1.08, y: 0.52, glows: [[0.75, 'rgba(255,170,90,.55)'], [0.3, 'rgba(255,214,150,.6)']] },
        clouds: [{ seed: 11, scale: 0.0011, cover: -0.02, soft: 0.42, alt: 1400, dark: '#262f45', lit: '#c98a72', glow: '#ff8a40', glowK: 3.5, sunX: 1.1, sunY: 1.05, haze: '#f2a878', hazeH: 0.35, lk: 4, oct: 6, squash: 1.6 }] },
      terrain: { seed: 5, camH: 9, near: 4, far: 9000, steps: 480, fog: 0.00022, fogH: 260, grain: 0.09,
        sun: norm3([0.9, 0.2, 0.25]), sunCol: [1.75, 1.08, 0.66], amb: [0.3, 0.33, 0.48], shadows: true, shadowSoft: 5,
        height(N, x, z, fp) {
          const s = 0.0016;
          let m = N.fbm(x * s, z * s, 6, fp * s * 2) + 0.28 * N.fbm(x * s * 5 + 40, z * s * 5, 3, fp * s * 10);
          m += 0.5 * sstep(1800, 4200, z) - 0.55 * Math.exp(-(x * x) / 1.9e6 - ((z - 900) ** 2) / 1.6e6) + 0.45 * sstep(-500, -1400, x - z * 0.05) * sstep(300, 900, z);
          const cl = sstep(0.02, 0.09, m), top = 60 + 55 * N.fbm(x * 0.0007 + 9, z * 0.0007, 3) + 40 * sstep(2500, 6000, z);
          let hh = cl * top; const st = 14, tt = hh / st, fl = Math.floor(tt); hh = (fl + sstep(0.55, 1, tt - fl)) * st * 0.6 + hh * 0.4;
          hh += N.fbm(x * 0.03, z * 0.03, 4, fp * 0.06) * 3.5 * cl + N.fbm(x * 0.15, z * 0.15, 2, fp * 0.3) * 1.2 * cl;
          return hh - 4 + (1 - cl) * 2.5 * N(x * 0.01, z * 0.01);
        },
        color(h, nx, ny, nz, x, z, N, o) {
          const P = [[148, 62, 32], [176, 82, 42], [198, 104, 56], [160, 70, 36], [210, 128, 74], [226, 158, 106], [190, 98, 52], [236, 196, 152]];
          const b = (h + N(x * 0.005, z * 0.005) * 7) / 8.5, bi = Math.floor(b), kk = b - bi, c0 = P[(bi & 7)], c1 = P[((bi + 1) & 7)], t = sstep(0.7, 1, kk);
          o[0] = mix(c0[0], c1[0], t); o[1] = mix(c0[1], c1[1], t); o[2] = mix(c0[2], c1[2], t);
          const streak = sstep(0.2, 0.6, N(x * 0.09, h * 0.012)) * (1 - ny) * 0.35; o[0] *= 1 - streak; o[1] *= 1 - streak; o[2] *= 1 - streak * 0.8;
          const flat = sstep(0.82, 0.96, ny); if (flat > 0) mixc(o, [188 + N(x * .05, z * .05) * 30, 140, 96], flat * 0.75);
          if (h < 4) { const w = 0.55 + h * 0.1; o[0] *= w; o[1] *= w; o[2] *= w; }
        } },
      water: { level: 0, deep: '#16242c', amp: 2.2, k: 0.05, f0: 0.3, refl: 0.86, shade: 0.1 } },

    { id: 'alpine', name: 'Alpine Falls', horizon: 0.5, fov: 62,
      sky: { stops: [[0, '#1f4f8f'], [0.45, '#4b82c2'], [0.85, '#9cc0e0'], [1, '#d5e4ef']],
        sun: { x: 0.12, y: 0.12, glows: [[0.5, 'rgba(255,250,235,.35)']] },
        clouds: [{ seed: 21, scale: 0.0016, cover: 0.2, soft: 0.3, alt: 1600, dark: '#9fb3c9', lit: '#ffffff', sunX: 0.1, sunY: 0.05, haze: '#dde8f1', hazeH: 0.4, hazeK: 0.5, lk: 6, alpha: 0.85, squash: 1.4 }] },
      terrain: { seed: 8, camH: 520, near: 30, far: 20000, steps: 520, fog: 0.000055, fogH: 1800, grain: 0.1, fogTint: [200, 216, 232, 0.4],
        sun: norm3([-0.75, 0.5, 0.3]), sunCol: [1.55, 1.45, 1.3], amb: [0.36, 0.42, 0.55], shadows: true, shadowSoft: 25,
        height(N, x, z, fp) {
          const px = x + 900, pz = z - 7600, r2 = (px * px + pz * pz * 0.8) / 1.6e7;
          let hh = 3200 * Math.exp(-r2 * 1.2) * (0.55 + 0.6 * N.ridge(x * 0.00042, z * 0.00042, 7, fp * 0.0008));
          hh += 1500 * N.ridge(x * 0.0003 + 7, z * 0.0003, 6, fp * 0.0006) * sstep(3000, 9000, z);
          hh += 260 * N.fbm(x * 0.0012, z * 0.0012, 5, fp * 0.0024) + 40 * N.fbm(x * 0.01, z * 0.01, 3, fp * 0.02);
          const wall = sstep(-160, 80, x - z * 0.46 + 260 * N.fbm(z * 0.0015, 3, 3)) * sstep(500, 900, z) * (1 - sstep(3600, 5200, z));
          hh = Math.max(hh, wall * (1500 + 260 * N.fbm(x * 0.002, z * 0.002, 5, fp * 0.004)) + 60 * N.fbm(x * 0.03, z * 0.03, 3, fp * 0.06) * wall);
          return hh - 80;
        },
        color(h, nx, ny, nz, x, z, N, o) {
          const g = 0.85 + 0.3 * N(x * 0.02, z * 0.02) + 0.15 * N(x * 0.15, z * 0.15), steep = 1 - ny;
          o[0] = 128 * g; o[1] = 124 * g; o[2] = 118 * g;
          const strata = 0.5 + 0.5 * Math.sin(h * 0.02 + N(x * 0.004, z * 0.004) * 4); o[0] *= 0.85 + strata * 0.25; o[1] *= 0.85 + strata * 0.22; o[2] *= 0.85 + strata * 0.2;
          const forest = (1 - sstep(300, 1050, h + N(x * 0.003, z * 0.003) * 260)) * sstep(0.45, 0.75, ny);
          if (forest > 0) mixc(o, [34 + 14 * N(x * 0.05, z * 0.05), 64 + 20 * N(x * 0.04, z * 0.04), 36], forest);
          const meadow = (1 - sstep(200, 600, h)) * sstep(0.85, 0.97, ny); if (meadow > 0) mixc(o, [96, 120, 58], meadow * 0.7);
          const snow = sstep(1450, 1900, h + N(x * 0.002, z * 0.002) * 420 + ny * 500) * sstep(0.32, 0.6, ny);
          if (snow > 0) mixc(o, [238, 242, 248], snow);
          if (steep > 0.75 && h > 600) { const d = 0.8; o[0] *= d; o[1] *= d; o[2] *= d; }
        } },
      post(g, c) {   // a waterfall down the cliff on the right
        const { W, H, hz, f } = c, T = c.sc.terrain, zc = 1500, xc = zc * 0.46 - 120, sx = W / 2 + xc / zc * f, top = hz + (T.camH - 1250) * f / zc, bot = hz + (T.camH - 40) * f / zc;
        const R = rng(3), w = W * 0.012;
        g.save(); g.globalCompositeOperation = 'screen';
        for (let i = 0; i < 70; i++) { const ox = (R() - 0.5) * w, wob = (R() - 0.5) * w * 0.8; g.strokeStyle = 'rgba(235,242,250,' + (0.05 + R() * 0.12) + ')'; g.lineWidth = 1 + R() * w * 0.25; g.beginPath(); g.moveTo(sx + ox, top + R() * 20); g.bezierCurveTo(sx + ox + wob, mix(top, bot, 0.35), sx + ox - wob, mix(top, bot, 0.7), sx + ox * 1.6 + wob, bot); g.stroke(); }
        const mist = g.createRadialGradient(sx, bot, 0, sx, bot, w * 6); mist.addColorStop(0, 'rgba(240,246,252,.55)'); mist.addColorStop(1, 'rgba(240,246,252,0)'); g.fillStyle = mist; g.fillRect(sx - w * 6, bot - w * 6, w * 12, w * 12);
        g.restore();
      } },

    { id: 'ocean', name: 'Ocean Sunset', horizon: 0.6, fov: 62,
      sky: { stops: [[0, '#2a2453'], [0.35, '#6b3f74'], [0.65, '#d0606a'], [0.85, '#ff9a5c'], [1, '#ffd08a']],
        sun: { x: 0.6, y: 0.565, r: 0.022, disc: '#fff0b8', glows: [[0.6, 'rgba(255,150,80,.5)'], [0.18, 'rgba(255,230,160,.75)']] },
        clouds: [{ seed: 31, scale: 0.0013, cover: 0.08, soft: 0.35, alt: 1500, dark: '#4a3462', lit: '#ff9e78', glow: '#ffb060', glowK: 5, sunX: 0.6, sunY: 1.1, haze: '#ffb07a', hazeH: 0.35, lk: 5, squash: 2.2 }] },
      terrain: { seed: 12, camH: 7, near: 4, far: 12000, steps: 420, fog: 0.0003, fogH: 400, farWater: true, grain: 0.08,
        sun: norm3([0.1, 0.12, 1]), sunCol: [1.5, 0.9, 0.55], amb: [0.36, 0.28, 0.42], shadows: false,
        height(N, x, z, fp) {
          const edge = -z * 0.62 - 260 + 220 * N.fbm(z * 0.0012, 1.5, 4, fp * 0.002);
          const land = sstep(edge + 120, edge - 40, x) * sstep(250, 500, z);
          const isl = Math.max(0, N.fbm(x * 0.0009 + 3, z * 0.0009, 4) - 0.3) * 600 * sstep(3500, 6000, z);
          return -6 + land * (55 + 70 * N.fbm(x * 0.002, z * 0.002, 5, fp * 0.004) + 14 * N.fbm(x * 0.02, z * 0.02, 3, fp * 0.04)) + isl;
        },
        color(h, nx, ny, nz, x, z, N, o) {
          o[0] = 104 + 30 * N(x * 0.03, z * 0.03); o[1] = 86; o[2] = 74;
          const grass = sstep(0.7, 0.9, ny) * sstep(20, 40, h); if (grass > 0) mixc(o, [70, 86, 44], grass * 0.8);
        } },
      water: { level: 0, deep: '#1b1f3a', amp: 6, k: 0.07, f0: 0.18, refl: 0.95, shade: 0.18, sparkle: 260 } },

    { id: 'forest', name: 'Forest Lake', horizon: 0.5, fov: 64,
      sky: { stops: [[0, '#2f69b0'], [0.5, '#6fa3d8'], [0.88, '#bcd6ec'], [1, '#e2edf4']],
        sun: { x: 0.82, y: 0.08, glows: [[0.45, 'rgba(255,248,225,.35)']] },
        clouds: [{ seed: 41, scale: 0.0024, cover: 0.12, soft: 0.22, alt: 1100, dark: '#8796ad', lit: '#ffffff', sunX: 0.85, sunY: -0.2, haze: '#dfe9f1', hazeH: 0.45, hazeK: 0.55, lk: 7, oct: 6, squash: 1.1, top: 0.0 }] },
      terrain: { seed: 17, camH: 2.6, near: 3, far: 16000, steps: 520, fog: 0.00011, fogH: 500, grain: 0.11, fogTint: [196, 214, 230, 0.35],
        sun: norm3([0.55, 0.62, 0.4]), sunCol: [1.45, 1.36, 1.15], amb: [0.32, 0.4, 0.52], shadows: true, shadowSoft: 6,
        height(N, x, z, fp) {
          const shore = 650 + 260 * N.fbm(x * 0.0011, 4.2, 4) + Math.abs(x) * 0.25;
          const land = sstep(shore - 60, shore + 120, z);
          let hh = land * (35 + 140 * Math.max(0, N.fbm(x * 0.0012, z * 0.0012, 5, fp * 0.0024) + 0.25));
          hh += 1800 * Math.max(0, N.ridge(x * 0.00028, z * 0.00028, 6, fp * 0.0006) - 0.18) * sstep(4500, 8000, z);
          const trees = land * sstep(2, 8, hh) * (1 - sstep(700, 1000, hh)) * sstep(0, 0.4, 1 - z / 9000);
          hh += trees * (9 + 6 * N.fbm(x * 0.12, z * 0.12, 3, fp * 0.24)) * (0.8 + 0.4 * N(x * 0.02, z * 0.02));
          return hh - 3;
        },
        color(h, nx, ny, nz, x, z, N, o) {
          const v = N(x * 0.06, z * 0.06), v2 = N(x * 0.013, z * 0.013);
          o[0] = 30 + 12 * v + 10 * v2; o[1] = 62 + 18 * v + 14 * v2; o[2] = 34 + 6 * v;
          if (v2 > 0.35) mixc(o, [96, 104, 40], (v2 - 0.35) * 1.2);
          const rock = sstep(700, 1000, h); if (rock > 0) mixc(o, [118 + 20 * v, 116 + 20 * v, 114 + 18 * v], rock);
          const snow = sstep(1150, 1450, h + v2 * 250) * sstep(0.4, 0.7, ny); if (snow > 0) mixc(o, [236, 242, 250], snow);
          if (h < 1.5) { o[0] = 92; o[1] = 84; o[2] = 66; }
        } },
      water: { level: 0, deep: '#13262b', amp: 1.2, k: 0.06, f0: 0.4, refl: 0.9, shade: 0.06 } },

    { id: 'city', name: 'City at Dusk', horizon: 0.64, fov: 60, vignette: 0.4,
      sky: { stops: [[0, '#141d47'], [0.38, '#3a3a7a'], [0.7, '#9a4f86'], [0.9, '#f07e6a'], [1, '#ffb27a']],
        sun: { x: 0.3, y: 0.66, glows: [[0.55, 'rgba(255,140,90,.45)']] },
        clouds: [{ seed: 51, scale: 0.0009, cover: 0.12, soft: 0.3, alt: 1500, dark: '#2c2a5c', lit: '#ff9a88', glow: '#ff8050', glowK: 3, sunX: 0.3, sunY: 1.1, haze: '#e88a7a', hazeH: 0.3, lk: 4, squash: 3, alpha: 0.9 }] },
      water: { level: 0, camH: 12, deep: '#0d1026', amp: 3.2, k: 0.05, f0: 0.25, refl: 0.92, shade: 0.12 },
      paint2d(g, c) {
        const { W, H, hz } = c, R = rng(7), u = W / 1600;
        const layer = (base, lo, hi, wmin, wmax, col, edge, lit, winA) => {
          let x = -20 * u;
          while (x < W + 20 * u) {
            const w = (wmin + R() * (wmax - wmin)) * u, hgt = (lo + R() * (hi - lo)) * u * (0.6 + 0.4 * Math.sin(x / W * 3.1 + 0.3) ** 2) * (R() < 0.08 ? 1.6 : 1), top = hz - base * u - hgt;
            const gr = g.createLinearGradient(x, top, x + w, top); gr.addColorStop(0, col); gr.addColorStop(1, edge); g.fillStyle = gr; g.fillRect(x, top, w, hz - top + 2);
            if (R() < 0.3) { g.fillRect(x + w * 0.3, top - hgt * 0.08, w * 0.4, hgt * 0.08); if (R() < 0.5) { g.fillRect(x + w * 0.47, top - hgt * 0.22, Math.max(1, w * 0.05), hgt * 0.14); g.fillStyle = 'rgba(255,60,50,.95)'; g.beginPath(); g.arc(x + w * 0.5, top - hgt * 0.22, 2.2 * u, 0, 7); g.fill(); } }
            if (winA > 0) {
              const cw = Math.max(2, 7 * u), ch = Math.max(2, 9 * u);
              for (let wy = top + ch; wy < hz - ch; wy += ch * 1.6) { const floorOn = R() < 0.25; for (let wx = x + cw * 0.8; wx < x + w - cw; wx += cw * 1.7) { if (floorOn ? R() < 0.85 : R() < lit) { const t = R(); g.fillStyle = t < 0.6 ? 'rgba(255,214,140,' + winA + ')' : t < 0.85 ? 'rgba(255,240,210,' + winA + ')' : 'rgba(170,210,255,' + winA + ')'; g.fillRect(wx, wy, cw, ch * 0.75); } } }
            }
            x += w + R() * 6 * u;
          }
        };
        const haze = a => { const hg = g.createLinearGradient(0, hz - 320 * u, 0, hz); hg.addColorStop(0, 'rgba(240,140,120,0)'); hg.addColorStop(1, 'rgba(240,140,120,' + a + ')'); g.fillStyle = hg; g.fillRect(0, hz - 320 * u, W, 320 * u); };
        layer(4, 60, 230, 30, 90, '#5a4a86', '#4b3f78', 0.12, 0.35); haze(0.45);
        layer(2, 80, 300, 40, 110, '#2e2a5a', '#25214c', 0.2, 0.75); haze(0.18);
        layer(0, 40, 200, 50, 140, '#171633', '#110f28', 0.28, 0.95);
        g.fillStyle = '#0c0b1c'; g.fillRect(0, hz - 6 * u, W, 7 * u);
        for (let x = 10 * u; x < W; x += 34 * u) { const rg = g.createRadialGradient(x, hz - 9 * u, 0, x, hz - 9 * u, 12 * u); rg.addColorStop(0, 'rgba(255,200,120,.9)'); rg.addColorStop(1, 'rgba(255,200,120,0)'); g.fillStyle = rg; g.fillRect(x - 12 * u, hz - 21 * u, 24 * u, 24 * u); }
        // a neon rooftop sign for our favourite brand
        g.save(); g.font = 'bold ' + Math.round(26 * u) + 'px "Lilita One",sans-serif'; g.textAlign = 'center'; g.shadowColor = '#ff4fb0'; g.shadowBlur = 18 * u; g.fillStyle = '#ffd1ee'; g.fillText('BONKMART', W * 0.72, hz - 230 * u); g.restore();
      } },

    { id: 'logo', name: 'Totally Legit Inc.', svg: true }
  ];

  /* company wallpaper: vector, crisp at any size */
  let svgN = 0;
  function logoSVG() {
    const id = 'wpl' + (++svgN);
    let rays = ''; for (let i = 0; i < 24; i++) { const a0 = i * Math.PI / 12, a1 = a0 + Math.PI / 24; rays += `<path d="M800 380L${(800 + Math.cos(a0) * 1600).toFixed(0)} ${(380 + Math.sin(a0) * 1600).toFixed(0)}L${(800 + Math.cos(a1) * 1600).toFixed(0)} ${(380 + Math.sin(a1) * 1600).toFixed(0)}Z"/>`; }
    const logo = OS.logoSVG.replace('<svg class="lglogo"', '<svg x="630" y="105" width="340" height="316"');
    const el = document.createElement('div');
    el.innerHTML = `<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;display:block">
      <defs><radialGradient id="${id}b" cx="50%" cy="42%" r="75%"><stop offset="0" stop-color="#4fe07a"/><stop offset=".45" stop-color="#17a24a"/><stop offset="1" stop-color="#05391a"/></radialGradient>
      <pattern id="${id}d" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="9" cy="9" r="2.6" fill="#003311"/></pattern>
      <radialGradient id="${id}v" cx="50%" cy="45%" r="70%"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></radialGradient></defs>
      <rect width="1600" height="900" fill="url(#${id}b)"/><g fill="#fff" opacity=".07">${rays}</g><rect width="1600" height="900" fill="url(#${id}d)" opacity=".13"/>
      <ellipse cx="800" cy="440" rx="190" ry="26" fill="#022a12" opacity=".35"/>${logo}
      <text x="800" y="580" text-anchor="middle" font-family="Alfa Slab One,serif" font-size="104" fill="#ffe14a" stroke="#0f131d" stroke-width="16" stroke-linejoin="round" paint-order="stroke">TOTALLY LEGIT INC.</text>
      <text x="800" y="650" text-anchor="middle" font-family="Lilita One,sans-serif" font-size="40" fill="#ffffff" stroke="#0b3d1c" stroke-width="8" stroke-linejoin="round" paint-order="stroke">We are definitely a real company</text>
      <rect width="1600" height="900" fill="url(#${id}v)"/></svg>`;
    return el.firstElementChild;
  }

  const cache = new Map();
  function sizeFor() { const w = clamp(Math.round(innerWidth), 1280, 1920), ar = clamp(innerWidth / Math.max(1, innerHeight), 1.25, 2.4); return [w, Math.round(w / ar)]; }
  const API = {
    list: SCENES, def: 'canyon',
    has(id) { return SCENES.some(s => s.id === id); },
    current() { return API.has(settings.wallpaper) ? settings.wallpaper : API.def; },
    /* returns a canvas (or svg) element; full-screen renders are cached */
    render(id, w, h) {
      const sc = SCENES.find(s => s.id === id) || SCENES[0];
      if (sc.svg) return logoSVG();
      if (w) return paintScene(sc, w, h);
      const [W, H] = sizeFor(), key = sc.id + '|' + W + 'x' + H;
      let cv = cache.get(key);
      if (!cv) { const t0 = performance.now(); cv = paintScene(sc, W, H); API.lastMs = Math.round(performance.now() - t0); cache.set(key, cv); if (cache.size > 3) cache.delete(cache.keys().next().value); }
      else { cache.delete(key); cache.set(key, cv); }
      return cv;
    },
    set(id) { if (!API.has(id)) return; settings.wallpaper = id; saveSettings(); OS.wallId = null; OS.setWallpaper(id); Bus.emit('wallpaper', id); }
  };
  return API;
})();

OS.apps.wallpapers = {
  desktop: true, order: 85, title: 'Wallpapers', emoji: '🖼️', icon: 'image', color: '#7048e8', w: 620, x: 0.3, y: 0.06, cls: 'wallapp',
  render(b, w) {
    const cards = Wallpapers.list.map(sc => {
      const th = h('div', { class: 'wp-th' });
      const card = h('button', { class: 'wp-card' + (sc.id === Wallpapers.current() ? ' on' : ''), title: sc.name, onclick: () => {
        if (card.classList.contains('on')) return;
        SFX.click(); cards.forEach(x => x.classList.toggle('on', x === card)); card.classList.add('busy');
        setTimeout(() => { Wallpapers.set(sc.id); card.classList.remove('busy'); }, 40);
      } }, th, h('span', { class: 'wp-nm' }, sc.name), h('i', { class: 'wp-ok', html: OS.glyph('check') }));
      card.th = th; card.sc = sc; return card;
    });
    b.replaceChildren(
      h('div', { class: 'wp-head' }, h('i', { class: 'ti', style: { background: '#7048e8' }, html: OS.glyph('image') }),
        h('div', {}, h('h3', {}, 'Choose a wallpaper'), h('p', { class: 'muted' }, 'Hand-picked views from places you will never get a day off to visit.'))),
      h('div', { class: 'wp-grid' }, cards));
    // thumbnails one at a time so the window opens instantly
    let k = 0; const next = () => { if (!b.isConnected || k >= cards.length) return; const cd = cards[k++]; cd.th.replaceChildren(Wallpapers.render(cd.sc.id, 256, 144)); setTimeout(next, 0); };
    setTimeout(next, 60);
  }
};
