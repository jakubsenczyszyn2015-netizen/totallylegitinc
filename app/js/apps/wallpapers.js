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
  const CANYON = [[150, 62, 32], [170, 76, 40], [184, 88, 46], [162, 70, 36], [192, 100, 56], [178, 82, 42], [198, 112, 64], [168, 74, 38]], _cp = [0, 0, 0];
  /* [u (x/z), z, half-width as a fraction of z, depth radius, height] */
  const CANYON_ROCKS = [[-0.43, 1150, 0.13, 260, 92], [0.26, 1500, 0.07, 260, 185], [0.43, 2100, 0.12, 420, 140], [-0.2, 3600, 0.11, 600, 150],
    [0.03, 4600, 0.085, 600, 170], [0.15, 4000, 0.04, 240, 160], [-0.56, 2700, 0.14, 520, 130], [0.66, 3300, 0.13, 520, 150], [-0.08, 6000, 0.07, 700, 190]];
  const canyonPal = hgt => { const b = hgt / 9.5, bi = Math.floor(b), t = sstep(0.72, 1, b - bi), c0 = CANYON[bi & 7], c1 = CANYON[(bi + 1) & 7]; _cp[0] = mix(c0[0], c1[0], t); _cp[1] = mix(c0[1], c1[1], t); _cp[2] = mix(c0[2], c1[2], t); return _cp; };

  /* ---------- sky ---------- */
  function* paintSky(g, c) {
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
    for (const cl of S.clouds || []) yield* clouds(g, c, cl);
    if (S.sun && S.sun.r) {   // the disc goes in front of thin cloud
      const sx = S.sun.x * W, sy = S.sun.y * H, r = S.sun.r * W, rg = g.createRadialGradient(sx, sy, 0, sx, sy, r * 2.2);
      rg.addColorStop(0, '#fffef6'); rg.addColorStop(0.42, S.sun.disc || '#fff2c8'); rg.addColorStop(0.5, 'rgba(255,220,160,.55)'); rg.addColorStop(1, 'rgba(255,200,140,0)');
      g.fillStyle = rg; g.beginPath(); g.arc(sx, sy, r * 2.2, 0, 7); g.fill();
    }
  }
  /* a cloud layer on a plane above the camera, lit from the sun's screen position */
  function* clouds(g, c, C) {
    const { W, hz, f } = c, s = C.res || 0.5, w = Math.ceil(W * s), hh = Math.ceil(hz * s), fs = f * s, hzs = hz * s;
    if (hh < 2) return;
    const cv = mkCanvas(w, hh), cg = cv.getContext('2d'), im = cg.createImageData(w, hh), d = im.data, N = Noise(C.seed);
    const dark = hex(C.dark), lit = hex(C.lit), glow = C.glow ? hex(C.glow) : null, haze = hex(C.haze || '#ffffff');
    const sunx = C.sunX * w, suny = C.sunY * hh, sc = C.scale, cover = C.cover, soft = C.soft || 0.25, alt = C.alt || 1000, sq = C.squash || 1;
    const ox = C.ox || 0, oz = C.oz || 0, oct = C.oct || 6, lk = C.lk || 5, al = C.alpha == null ? 1 : C.alpha, top = C.top || 0, warp = C.warp || 0, clump = C.clump || 0;
    /* density: domain-warped fbm (billowy shapes), coverage varied by a broad noise (clumps and gaps) */
    const dens = (wx, wz, o) => {
      const X = wx * sc, Z = wz * sc * sq, q = warp ? N.fbm(X * 0.45 + 5.2, Z * 0.45 - 1.7, 3) * warp : 0;
      return N.fbm(X + q, Z - q, o) + (clump ? N(X * 0.18 + 11, Z * 0.18) * clump : 0);
    };
    for (let y = 0; y < hh; y++) {
      if (!(y & 3)) yield;
      const dy = hzs - y; if (dy < 1) continue;
      const dist = alt * fs / dy, fade = sstep(0, (C.fade || 0.1) * hzs, dy) * (top ? sstep(0, top * hzs, y) : 1), hk = (1 - sstep(0, (C.hazeH || 0.5) * hzs, dy)) * (C.hazeK || 0.7);
      for (let x = 0; x < w; x++) {
        const u = (x - w / 2) / fs, wx = u * dist + ox, wz = dist + oz;
        const n = dens(wx, wz, oct);
        const a = sstep(cover, cover + soft, n) * fade; if (a <= 0.004) continue;
        let lx = sunx - x, ly = suny - y; const ll = Math.hypot(lx, ly) || 1; lx /= ll; ly /= ll;
        const x2 = x + lx * 2.5, y2 = Math.min(hzs - 1.2, y + ly * 2.5), d2 = alt * fs / (hzs - y2), u2 = (x2 - w / 2) / fs;
        const n2 = dens(u2 * d2 + ox, d2 + oz, oct - 2);
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
  function* terrain(img, c) {
    const { W, H, hz, f, sc } = c, T = sc.terrain, N = Noise(T.seed), camH = T.camH;
    const NU = Math.ceil(W / 2) + 2, NZ = Math.max(90, Math.round((T.steps || 440) * Math.min(1, W / 1200) ** 0.5)), z0 = T.near || 5, z1 = T.far || 8000;
    const zs = new Float32Array(NZ), lz = Math.log(z1 / z0), us = new Float32Array(NU), du = 2 / f;
    for (let j = 0; j < NZ; j++) zs[j] = z0 * Math.exp(lz * j / (NZ - 1));
    for (let i = 0; i < NU; i++) us[i] = (i * 2 - 1 - W / 2) / f;
    const hm = new Float32Array(NU * NZ);
    for (let j = 0; j < NZ; j++) { if (!(j & 3)) yield; const z = zs[j], fp = z * du; for (let i = 0; i < NU; i++) hm[j * NU + i] = T.height(N, us[i] * z, z, fp); }
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
    const col = new Float32Array(NU * NZ * 3), aux = new Float32Array(NU * NZ * 3), o = [0, 0, 0, 0], L = sc.water ? sc.water.level : -1e9, sun = T.sun, sunC = T.sunCol, amb = T.amb, gr = T.grain == null ? 0.07 : T.grain;
    for (let j = 0; j < NZ; j++) {
      if (!(j & 7)) yield;
      const z = zs[j], ja = Math.max(0, j - 1), jb = Math.min(NZ - 1, j + 1), dz = zs[jb] - zs[ja];
      for (let i = 0; i < NU; i++) {
        const k = j * NU + i, h = hm[k]; if (h < L) continue;
        const ia = Math.max(0, i - 1), ib = Math.min(NU - 1, i + 1);
        const gxw = (hm[j * NU + ib] - hm[j * NU + ia]) / ((us[ib] - us[ia]) * z), gzw = (hm[jb * NU + i] - hm[ja * NU + i]) / dz;
        const il = 1 / Math.sqrt(gxw * gxw + 1 + gzw * gzw), nx = -gxw * il, ny = il, nz = -gzw * il, x = us[i] * z;
        o[3] = gr; T.color(h, nx, ny, nz, x, z, N, o);
        const lam = Math.max(0, nx * sun[0] + ny * sun[1] + nz * sun[2]) * (sh ? sh[k] : 1), hemi = 0.55 + 0.45 * ny;
        let r = o[0] * (sunC[0] * lam + amb[0] * hemi), gg = o[1] * (sunC[1] * lam + amb[1] * hemi), b = o[2] * (sunC[2] * lam + amb[2] * hemi);
        const fk = 1 - Math.exp(-z * T.fog * Math.exp(-Math.max(0, h) / (T.fogH || 1e9)));
        r = mix(r, fogC[i * 3], fk); gg = mix(gg, fogC[i * 3 + 1], fk); b = mix(b, fogC[i * 3 + 2], fk);
        col[k * 3] = r; col[k * 3 + 1] = gg; col[k * 3 + 2] = b;
        aux[k * 3] = o[3] * (1 - fk); aux[k * 3 + 1] = ny; aux[k * 3 + 2] = 1 - fk;   // texture amount, normal y, un-fogged share
      }
    }
    // soften lighting flicker on cliff faces: blur steep cells sideways
    if (T.faceBlur) {
      const tmp = new Float32Array(NU * 3), R = T.faceBlur;
      for (let j = 0; j < NZ; j++) {
        const base = j * NU; tmp.set(col.subarray(base * 3, (base + NU) * 3));
        for (let i = R; i < NU - R; i++) {
          if (aux[(base + i) * 3 + 1] > 0.55 || hm[base + i] < L) continue;
          let r = 0, g2 = 0, b = 0, n = 0;
          for (let q = -R; q <= R; q++) { const kk = i + q; if (hm[base + kk] < L || aux[(base + kk) * 3 + 1] > 0.75) continue; r += tmp[kk * 3]; g2 += tmp[kk * 3 + 1]; b += tmp[kk * 3 + 2]; n++; }
          if (n) { col[(base + i) * 3] = r / n; col[(base + i) * 3 + 1] = g2 / n; col[(base + i) * 3 + 2] = b / n; }
        }
      }
    }
    // march every screen column front to back (y-buffer), shading spans between consecutive samples
    const u32 = new Uint32Array(d8.buffer), mask = c.mask = c.mask || new Uint8Array(W * H), TX = texTile(), face = T.face, fm = [1, 1, 1], fz = face ? new Float32Array(W * H) : null, fh = face ? new Float32Array(W * H) : null;
    for (let x = 0; x < W; x++) {
      if (!(x & 31)) yield;
      const fi = (x + 1) / 2, i0 = Math.min(NU - 2, fi | 0), t = fi - i0, ux = (x - W / 2) / f;
      let ybuf = H, lastJ = -9, pr = 0, pg = 0, pb = 0, pw = false;
      for (let j = 0; j < NZ; j++) {
        const k0 = j * NU + i0, k1 = k0 + 1;
        let h = hm[k0] + (hm[k1] - hm[k0]) * t; const wet = h < L; if (wet) h = L;
        const zj = zs[j], y = hz + (camH - h) * f / zj;
        if (y >= ybuf) continue;
        let r = 0, gg = 0, b = 0, tx = 0, ny = 1, vis = 1;
        if (!wet) {
          const w0 = hm[k0] < L ? 0 : 1 - t, w1 = hm[k1] < L ? 0 : t, ws = w0 + w1 || 1, a0 = w0 / ws, a1 = w1 / ws;
          r = col[k0 * 3] * a0 + col[k1 * 3] * a1; gg = col[k0 * 3 + 1] * a0 + col[k1 * 3 + 1] * a1; b = col[k0 * 3 + 2] * a0 + col[k1 * 3 + 2] * a1;
          tx = aux[k0 * 3] * a0 + aux[k1 * 3] * a1; ny = aux[k0 * 3 + 1] * a0 + aux[k1 * 3 + 1] * a1; vis = aux[k0 * 3 + 2] * a0 + aux[k1 * 3 + 2] * a1;
        }
        const yt = Math.max(0, Math.ceil(y)), yb = Math.min(H, ybuf), smooth = lastJ === j - 1 && pw === wet, span = yb - yt, steep = face && !wet && ny < (T.faceNy || 0.6);
        for (let yy = yt; yy < yb; yy++) {
          const p = yy * W + x;
          if (wet) { mask[p] = 1; continue; }
          const q = smooth && span > 1 ? (yy - yt) / span : 0;
          const nn = 1 + (TX[((yy & 255) << 8) | (x & 255)] - 0.5) * tx * 2 + (((Math.imul(p, 2654435761) >>> 8) & 255) / 255 - 0.5) * 0.05;
          let R = (r + (pr - r) * q) * nn, Gc = (gg + (pg - gg) * q) * nn, B = (b + (pb - b) * q) * nn;
          if (steep) { fz[p] = zj; fh[p] = h; } else if (fz) fz[p] = 0;
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
    if (face) yield* faces(u32, fz, fh, c, N, T, camH);
    c.grid = { hm, zs, NU, NZ, camH, L };
  }
  /* cliff faces: blur sideways (kills per-column lighting flicker, keeps horizontal strata), then paint strata per pixel */
  function* faces(u32, fz, fh, c, N, T, camH) {
    const { W, H, hz, f } = c, r = Math.max(2, Math.round(4 * W / 1280)), row = new Uint32Array(W), fm = [1, 1, 1];
    for (let y = 0; y < H; y++) {
      if (!(y & 15)) yield;
      const o = y * W; row.set(u32.subarray(o, o + W));
      for (let x = 0; x < W; x++) {
        const z = fz[o + x]; if (!z) continue;
        let R = 0, G = 0, B = 0, n = 0, nc = 0, zz = 0, hh = 0;
        for (let q = Math.max(0, x - r * 2), e = Math.min(W - 1, x + r * 2); q <= e; q++) {
          const z2 = fz[o + q]; if (!z2 || Math.abs(z2 - z) > z * 0.12) continue; zz += z2; hh += fh[o + q]; n++;
          if (q < x - r || q > x + r) continue; const v = row[q]; R += v & 255; G += (v >> 8) & 255; B += (v >> 16) & 255; nc++;
        }
        zz /= n; hh /= n; R /= nc; G /= nc; B /= nc; n = 1;
        const hp = camH - (y - hz) * zz / f, vis = Math.exp(-zz * T.fog);
        T.face(hp, hh, (x - W / 2) / f * zz, zz, N, fm);
        const m0 = 1 + (clamp01((fm[0] - 0.55) / 0.8) * 0.8 + 0.55 - 1) * vis, m1 = 1 + (clamp01((fm[1] - 0.55) / 0.8) * 0.8 + 0.55 - 1) * vis, m2 = 1 + (clamp01((fm[2] - 0.55) / 0.8) * 0.8 + 0.55 - 1) * vis;
        u32[o + x] = 0xff000000 | (Math.min(255, B / n * m2) << 16) | (Math.min(255, G / n * m1) << 8) | Math.min(255, R / n * m0);
      }
    }
  }
  /* smooth 2px-scale noise tile for foliage / rock speckle */
  let _tex = null;
  function texTile() {
    if (_tex) return _tex;
    const R = rng(77), n = 128, g = new Float32Array(n * n), t = _tex = new Float32Array(65536);
    for (let i = 0; i < n * n; i++) g[i] = R();
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
      const gx = x / 2, gy = y / 2, x0 = gx | 0, y0 = gy | 0, fx = gx - x0, fy = gy - y0, x1 = (x0 + 1) & 127, y1 = (y0 + 1) & 127;
      const a = g[y0 * n + x0], b = g[y0 * n + x1], c = g[y1 * n + x0], d = g[y1 * n + x1];
      t[y * 256 + x] = a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
    }
    return t;
  }

  /* ---------- water: per-column mirror about the far shore, rippled, fresnel-mixed with the deep colour ---------- */
  function* water(img, c) {
    const { W, H, hz, f, sc, mask } = c, Wt = sc.water, N = Noise(Wt.seed || 7), u32 = new Uint32Array(img.data.buffer), src = u32.slice();
    const camH = sc.terrain ? sc.terrain.camH - Wt.level : Wt.camH, deep = hex(Wt.deep), amp = Wt.amp * H / 900, k = Wt.k, rf = Wt.refl || 0.9, shd = Wt.shade || 0.1, f0 = Wt.f0 == null ? 0.3 : Wt.f0;
    const rowZ = new Float32Array(H), rowF = new Float32Array(H);
    for (let y = hz; y < H; y++) { const dy = Math.max(0.6, y - hz); rowZ[y] = camH * f / dy; const ang = Math.atan(dy / f); rowF[y] = f0 + (1 - f0) * Math.pow(1 - Math.sin(ang), 5); }
    const GL = Wt.glit, TX = texTile(), gc = GL ? hex(GL.col) : null, gx0 = GL ? GL.x * W : 0;
    const G = c.grid, mir = new Float32Array(H);   // per pixel of a column: the row to mirror about
    for (let x = 0; x < W; x++) {
      if (!(x & 15)) yield;
      let top = -1; for (let y = hz; y < H; y++) if (mask[y * W + x]) { top = y; break; }
      if (top < 0) continue;
      if (G) {
        // which object does each water pixel reflect? paint reflected spans far to near (near wins); mirror about that object's waterline
        mir.fill(hz, top, H);
        const fi = (x + 1) / 2, i0 = Math.min(G.NU - 2, fi | 0), t = fi - i0, wl0 = (G.camH - G.L) * f;
        for (let j = G.NZ - 1; j >= 0; j--) {
          const k0 = j * G.NU + i0, hh = G.hm[k0] + (G.hm[k0 + 1] - G.hm[k0]) * t; if (hh <= G.L) continue;
          const z = G.zs[j], wl = hz + wl0 / z, yr = Math.min(H, Math.ceil(wl + (hh - G.L) * f / z));
          for (let yy = Math.max(top, Math.ceil(wl)); yy < yr; yy++) mir[yy] = wl;
        }
      } else mir.fill(top - 0.5, top, H);
      const ux = (x - W / 2) / f;
      for (let y = top; y < H; y++) {
        const p = y * W + x; if (!mask[p]) continue;
        const z = rowZ[y], wx = ux * z, near = (y - hz) / (H - hz), fp = z / f, y0 = mir[y];
        const n1 = N.fbm(wx * k, z * k * 4, 4, fp * k * 2), n2 = N.fbm(wx * k * 0.7 + 50, z * k * 3, 3, fp * k * 2);
        const a = amp * (0.3 + 0.7 * near);
        let ym = Math.round(2 * y0 - y + n1 * a * 2.2), xm = Math.round(x + n2 * a * 0.9);
        xm = xm < 0 ? 0 : xm >= W ? W - 1 : xm; ym = ym < 0 ? 0 : ym >= H ? H - 1 : ym;
        if (mask[ym * W + xm]) ym = Math.max(0, Math.min(hz - 1, 2 * hz - y));
        const s = src[ym * W + xm], F = rowF[y], sh = 1 + n1 * shd;
        const sd = Wt.shore && y - top < Wt.shore * H / 720 ? 0.55 : 1;
        let r = ((s & 255) * rf * F + deep[0] * (1 - F)) * sh, g = (((s >> 8) & 255) * rf * F + deep[1] * (1 - F)) * sh, b = (((s >> 16) & 255) * rf * F + deep[2] * (1 - F)) * sh;
        r *= sd; g *= sd; b *= sd;
        if (GL) {   // sun glitter: a path of sparkles under the sun that widens toward the camera
          const dx = (x - gx0) / (W * GL.w * (0.12 + near * 2.2)), band = Math.exp(-dx * dx), sp = TX[((y & 255) << 8) | ((x * 3) & 255)] * 0.6 + (n1 * 0.5 + 0.5) * 0.4;
          const gk = band * (Math.max(0, sp - 0.5) * GL.k + 0.18) * (1 - near * 0.5); r += gc[0] * gk; g += gc[1] * gk; b += gc[2] * gk;
        }
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

  function* paintScene(sc, W, H) {
    const cv = mkCanvas(W, H), g = cv.getContext('2d', { willReadFrequently: true });
    const hz = Math.round(H * sc.horizon), f = (W / 2) / Math.tan((sc.fov || 60) * Math.PI / 360), c = { W, H, hz, f, sc, mask: null };
    yield* paintSky(g, c);
    if (sc.paint2d) sc.paint2d(g, c);
    if (sc.terrain || sc.water) {
      const img = g.getImageData(0, 0, W, H);
      if (sc.terrain) yield* terrain(img, c);
      if (sc.water) { if (!c.mask) { c.mask = new Uint8Array(W * H); c.mask.fill(1, (hz + 1) * W); } yield* water(img, c); }
      g.putImageData(img, 0, 0);
    }
    if (sc.post) sc.post(g, c);
    finish(g, c);
    return cv;
  }

  /* ===================================================================== scenes */
  const SCENES = [
    { id: 'canyon', name: 'Canyon Lake', horizon: 0.58, fov: 50,
      sky: { stops: [[0, '#18223a'], [0.35, '#2f3b58'], [0.66, '#7a6676'], [0.87, '#e39663'], [1, '#ffcf88']],
        sun: { x: 1.1, y: 0.56, glows: [[0.8, 'rgba(255,160,80,.55)'], [0.32, 'rgba(255,214,150,.65)']] },
        clouds: [{ seed: 11, scale: 0.0011, cover: -0.08, soft: 0.2, alt: 900, dark: '#222a3e', lit: '#d58c68', glow: '#ff9446', glowK: 2.6, sunX: 1.15, sunY: 1.2, haze: '#f0a777', hazeH: 0.3, hazeK: 0.8, lk: 5, oct: 6, warp: 0.55, clump: 0.4, squash: 1.2, fade: 0.06 }] },
      terrain: { seed: 5, camH: 22, near: 6, far: 16000, steps: 520, fog: 0.00014, fogH: 900, grain: 0.1, faceNy: 0.4,
        sun: norm3([0.9, 0.18, -0.3]), sunCol: [1.85, 1.1, 0.62], amb: [0.26, 0.29, 0.44], shadows: true, shadowSoft: 5,
        height(N, x, z, fp) {   // hand-placed mesas and buttes around the lake
          let best = -9, top = 0;
          for (const B of CANYON_ROCKS) {
            const dx = (x - B[0] * B[1]) / (B[2] * B[1]), dz = (z - B[1]) / B[3];
            if (dx > 2.2 || dx < -2.2 || dz > 2.2 || dz < -2.2) continue;
            const m = 1 - Math.sqrt(dx * dx + dz * dz) + 0.42 * N.fbm(x * 0.006 + B[4], z * 0.006, 5, fp * 0.012) + 0.14 * N.fbm(x * 0.03, z * 0.03 + B[4], 3, fp * 0.06);
            if (m > best) { best = m; top = B[4]; }
          }
          const far = sstep(6500, 8000, z);
          if (far > 0 && far - 0.4 + 0.25 * N(x * 0.0007, 2.5) > best) { best = far - 0.4 + 0.25 * N(x * 0.0007, 2.5); top = 260; }
          const cliff = sstep(0.0, 0.05, best), talus = sstep(-0.42, 0.02, best);
          let hh = top * (0.64 * cliff + 0.36 * Math.pow(talus, 1.6)) * (1 + 0.08 * N(x * 0.002, z * 0.002));
          hh += N.fbm(x * 0.03, z * 0.03, 4, fp * 0.06) * 5 * talus * (1 - cliff * 0.7) + N.fbm(x * 0.2, z * 0.2, 2, fp * 0.4) * 1.5 * talus;
          return hh - 4 + (1 - talus) * 2.5 * N(x * 0.01, z * 0.01);
        },
        color(h, nx, ny, nz, x, z, N, o) {
          const c = canyonPal(h + N(x * 0.006, z * 0.006) * 6); o[0] = c[0]; o[1] = c[1]; o[2] = c[2];
          if (h > 150 && ny < 0.6) mixc(o, [226, 186, 146], sstep(150, 200, h) * 0.6);
          const flat = sstep(0.78, 0.95, ny); if (flat > 0) mixc(o, [178 + N(x * .05, z * .05) * 34, 132, 90], flat * 0.7);
          if (h < 5) { const w = 0.5 + Math.max(0, h) * 0.1; o[0] *= w; o[1] *= w; o[2] *= w; }
          o[3] = 0.08 + flat * 0.06;
        },
        face(hp, h, x, z, N, m) {   // sandstone strata and desert-varnish streaks down the cliffs
          const w = N(x * 0.01, z * 0.01) * 6, a = canyonPal(hp + w), ar = a[0], ag = a[1], ab = a[2], b = canyonPal(h + w);
          const v = 1 - 0.14 * sstep(0.2, 0.8, N(x * 0.025 + z * 0.01, hp * 0.006)), cap = sstep(0.62, 0.8, hp / Math.max(1, h)) * (h > 120 ? 0.35 : 0.12);
          m[0] = (ar / b[0]) * v * (1 + cap * 0.28); m[1] = (ag / b[1]) * v * (1 + cap * 0.62); m[2] = (ab / b[2]) * (v * 0.3 + 0.7) * (1 + cap * 0.9);
        } },
      water: { level: 0, deep: '#121e26', amp: 1.6, k: 0.06, f0: 0.32, refl: 0.88, shade: 0.08 } },

    { id: 'alpine', name: 'Alpine Falls', horizon: 0.56, fov: 54,
      sky: { stops: [[0, '#1d4c8c'], [0.5, '#4f86c4'], [0.88, '#a3c4e1'], [1, '#d9e6ef']],
        sun: { x: 0.08, y: 0.08, glows: [[0.5, 'rgba(255,250,235,.32)']] },
        clouds: [{ seed: 21, scale: 0.0013, cover: 0.26, soft: 0.2, alt: 1500, dark: '#9aaec6', lit: '#ffffff', sunX: 0.05, sunY: -0.2, haze: '#dbe7f1', hazeH: 0.4, hazeK: 0.5, lk: 7, warp: 0.4, clump: 0.3, alpha: 0.95 }] },
      terrain: { seed: 8, camH: 420, near: 20, far: 26000, steps: 560, fog: 0.00006, fogH: 2200, grain: 0.12, faceBlur: 2, fogTint: [196, 214, 232, 0.35],
        sun: norm3([-0.7, 0.55, 0.25]), sunCol: [1.6, 1.5, 1.34], amb: [0.34, 0.4, 0.54], shadows: true, shadowSoft: 30,
        height(N, x, z, fp) {
          const px = x + 700, pz = z - 9500, pyr = Math.max(0, 1 - (Math.abs(px) * 0.9 + Math.abs(pz) * 0.6 + Math.abs(px + pz * 0.3) * 0.25) / 4300);
          let hh = 3300 * Math.pow(pyr, 1.25) * (0.82 + 0.35 * N.ridge(x * 0.0006, z * 0.0006, 6, fp * 0.0012));
          hh = Math.max(hh, 1900 * Math.max(0, N.ridge(x * 0.00028 + 7, z * 0.00028, 6, fp * 0.0006) - 0.12) * sstep(5000, 11000, z));
          hh += 330 * (N.fbm(x * 0.0011, z * 0.0011, 5, fp * 0.0022) + 0.4) * sstep(150, 900, z) + 30 * N.fbm(x * 0.012, z * 0.012, 3, fp * 0.024);
          const wx = 230 + 0.13 * z + 70 * N.fbm(z * 0.002, 3.1, 3), wall = sstep(wx, wx + 60, x) * sstep(450, 700, z) * (1 - sstep(3800, 5600, z));
          if (wall > 0) hh = Math.max(hh, wall * (1150 + 120 * N.fbm(x * 0.003, z * 0.003, 4)) + wall * 25 * N.fbm(x * 0.06, z * 0.02, 3, fp * 0.06));
          return hh - 60;
        },
        color(h, nx, ny, nz, x, z, N, o) {
          const g = 0.82 + 0.28 * N(x * 0.02, z * 0.02) + 0.14 * N(x * 0.13, z * 0.13);
          o[0] = 124 * g; o[1] = 120 * g; o[2] = 114 * g;
          const strata = 0.5 + 0.5 * Math.sin(h * 0.045 + N(x * 0.004, z * 0.004) * 5); o[0] *= 0.8 + strata * 0.3; o[1] *= 0.8 + strata * 0.27; o[2] *= 0.8 + strata * 0.24;
          if (h > 900 && ny < 0.35) { o[0] *= 1.06; o[1] *= 0.98; o[2] *= 0.88; }
          const forest = (1 - sstep(500, 1000, h + N(x * 0.003, z * 0.003) * 250)) * sstep(0.5, 0.75, ny);
          if (forest > 0) mixc(o, [30 + 14 * N(x * 0.05, z * 0.05), 58 + 22 * N(x * 0.04, z * 0.04), 34], forest);
          const meadow = (1 - sstep(220, 520, h)) * sstep(0.9, 0.98, ny); if (meadow > 0) mixc(o, [92, 118, 54], meadow * 0.7);
          const snow = sstep(1700, 2100, h + N(x * 0.002, z * 0.002) * 380 + ny * 600) * sstep(0.3, 0.55, ny);
          if (snow > 0) mixc(o, [240, 244, 250], snow);
          o[3] = forest > 0.5 ? 0.36 : snow > 0.5 ? 0.05 : 0.16;
        },
        face(hp, h, x, z, N, m) {   // rock strata, cracks and mossy ledges on cliffs
          const st = 0.78 + 0.34 * (0.5 + 0.5 * Math.sin(hp * 0.035 + N(x * 0.004, z * 0.004) * 5)), cr = 1 - 0.35 * sstep(0.35, 0.75, N(x * 0.3 + z * 0.12, hp * 0.004)), dt = 1 + 0.12 * N(x * 0.08 + z * 0.05, hp * 0.04);
          const moss = 0, v = st * cr * dt;
          m[0] = v * (1 - moss * 0.45); m[1] = v * (1 - moss * 0.1); m[2] = v * (1 - moss * 0.5);
        } },
      post(g, c) {   // a waterfall down the cliff on the right
        const { W, H, hz, f } = c, T = c.sc.terrain, N = Noise(T.seed), zc = 2350, xc = 230 + 0.13 * zc + 70 * N.fbm(zc * 0.002, 3.1, 3) + 28;
        const sx = W / 2 + xc / zc * f, top = hz + (T.camH - 1085) * f / zc, bot = hz + (T.camH - 110) * f / zc, len = bot - top, R = rng(3), w = W * 0.011, wb = w * 2.6;
        g.save();
        g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgba(110,112,120,.55)';
        g.beginPath(); g.moveTo(sx - w * 0.9, top); g.lineTo(sx + w * 0.9, top); g.lineTo(sx + wb * 0.8, bot); g.lineTo(sx - wb * 0.8, bot); g.fill();
        g.globalCompositeOperation = 'screen'; g.lineCap = 'round';
        for (let i = 0; i < 220; i++) {
          const t = R(), x0 = sx + (t - 0.5) * w * 1.6, x1 = sx + (t - 0.5) * wb * 1.5 + (R() - 0.5) * w * 0.6, a = 0.04 + R() * 0.16 * (1 - Math.abs(t - 0.5));
          const gr = g.createLinearGradient(0, top, 0, bot); gr.addColorStop(0, 'rgba(235,242,250,0)'); gr.addColorStop(0.04, 'rgba(235,242,250,' + a + ')'); gr.addColorStop(0.8, 'rgba(235,242,250,' + a * 1.3 + ')'); gr.addColorStop(1, 'rgba(235,242,250,0)');
          g.strokeStyle = gr; g.lineWidth = 0.6 + R() * 1.8 * W / 1280; g.setLineDash([len * (0.05 + R() * 0.3), len * R() * 0.06]);
          const wob = (R() - 0.5) * w * 0.5;
          g.beginPath(); g.moveTo(x0, top); g.bezierCurveTo(x0 + wob, top + len * 0.3, mix(x0, x1, 0.6) - wob, top + len * 0.7, x1, bot); g.stroke();
        }
        g.setLineDash([]);
        for (let i = 0; i < 4; i++) { const r = w * (2.5 + i * 2.4), my = bot - w * (i * 1.1 + 0.5), mist = g.createRadialGradient(sx, my, 0, sx, my, r); mist.addColorStop(0, 'rgba(236,243,250,' + (0.5 - i * 0.1) + ')'); mist.addColorStop(1, 'rgba(236,243,250,0)'); g.fillStyle = mist; g.fillRect(sx - r, my - r, r * 2, r * 2); }
        g.restore();
      } },

    { id: 'ocean', name: 'Ocean Sunset', horizon: 0.6, fov: 58,
      sky: { stops: [[0, '#251f4c'], [0.35, '#5d3a70'], [0.66, '#c95c6b'], [0.86, '#ff9858'], [1, '#ffd38a']],
        sun: { x: 0.62, y: 0.57, r: 0.02, disc: '#fff0b8', glows: [[0.65, 'rgba(255,140,70,.5)'], [0.2, 'rgba(255,226,150,.8)']] },
        clouds: [{ seed: 31, scale: 0.001, cover: 0.02, soft: 0.2, alt: 1100, dark: '#3e2c58', lit: '#ff9d76', glow: '#ffb35c', glowK: 4, sunX: 0.62, sunY: 1.15, haze: '#ffae78', hazeH: 0.3, hazeK: 0.75, lk: 6, warp: 0.5, clump: 0.4, squash: 1.3, fade: 0.08 }] },
      terrain: { seed: 12, camH: 6, near: 3, far: 14000, steps: 460, fog: 0.00028, fogH: 300, farWater: true, grain: 0.09,
        sun: norm3([0.15, 0.1, 1]), sunCol: [1.4, 0.82, 0.5], amb: [0.34, 0.26, 0.42], shadows: false,
        height(N, x, z, fp) {
          const edge = -90 - 0.28 * z + 70 * N.fbm(z * 0.002, 1.5, 4, fp * 0.004);
          const land = sstep(edge + 40, edge - 30, x) * sstep(120, 260, z);
          const isl = Math.max(0, N.fbm(x * 0.0007 + 3, z * 0.0007, 4) - 0.32) * 500 * sstep(4500, 7000, z) * sstep(-0.05, 0.1, x / z);
          return -5 + land * (38 + 50 * N.fbm(x * 0.003, z * 0.003, 5, fp * 0.006) + 10 * N.fbm(x * 0.03, z * 0.03, 3, fp * 0.06)) + isl;
        },
        color(h, nx, ny, nz, x, z, N, o) {
          o[0] = 96 + 26 * N(x * 0.03, z * 0.03); o[1] = 78; o[2] = 70;
          const grass = sstep(0.72, 0.9, ny) * sstep(14, 26, h); if (grass > 0) mixc(o, [64, 80, 42], grass * 0.85);
        } },
      water: { level: 0, deep: '#121630', amp: 9, k: 0.12, f0: 0.12, refl: 0.92, shade: 0.12, glit: { x: 0.62, w: 0.05, k: 5, col: '#ffd890' } } },

    { id: 'forest', name: 'Forest Lake', horizon: 0.5, fov: 64,
      sky: { stops: [[0, '#2f69b0'], [0.5, '#6fa3d8'], [0.88, '#bcd6ec'], [1, '#e2edf4']],
        sun: { x: 0.82, y: 0.08, glows: [[0.45, 'rgba(255,248,225,.35)']] },
        clouds: [{ seed: 41, scale: 0.0015, cover: 0.22, soft: 0.16, alt: 1100, dark: '#7f8ea6', lit: '#ffffff', sunX: 0.85, sunY: -0.2, haze: '#dfe9f1', hazeH: 0.45, hazeK: 0.55, lk: 8, oct: 6, warp: 0.4, clump: 0.35 }] },
      terrain: { seed: 17, camH: 2.6, near: 3, far: 16000, steps: 520, fog: 0.00009, fogH: 2500, faceBlur: 2, grain: 0.11, fogTint: [196, 214, 230, 0.35],
        sun: norm3([0.55, 0.62, 0.4]), sunCol: [1.45, 1.36, 1.15], amb: [0.32, 0.4, 0.52], shadows: true, shadowSoft: 6,
        height(N, x, z, fp) {
          const shore = 650 + 260 * N.fbm(x * 0.0011, 4.2, 4) + Math.abs(x) * 0.25;
          const land = sstep(shore - 60, shore + 120, z);
          let hh = land * (35 + 140 * Math.max(0, N.fbm(x * 0.0012, z * 0.0012, 5, fp * 0.0024) + 0.25));
          hh += 2300 * Math.max(0, N.ridge(x * 0.00028, z * 0.00028, 6, fp * 0.0006) - 0.18) * sstep(4500, 8000, z);
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
          if (h < 2) { o[0] *= 0.7; o[1] *= 0.7; o[2] *= 0.7; }
          o[3] = rock > 0.5 ? (snow > 0.5 ? 0.05 : 0.14) : 0.42;
        },
        face(hp, h, x, z, N, m) { const v = (0.85 + 0.25 * (0.5 + 0.5 * Math.sin(hp * 0.03 + N(x * 0.003, z * 0.003) * 4))) * (1 - 0.3 * sstep(0.4, 0.8, N(x * 0.2 + z * 0.08, hp * 0.004))); m[0] = m[1] = m[2] = v; } },
      water: { level: 0, deep: '#0f2026', amp: 1.2, k: 0.06, f0: 0.35, refl: 0.78, shade: 0.06, shore: 2 } },

    { id: 'city', name: 'City at Dusk', horizon: 0.64, fov: 60, vignette: 0.4, font: '24px "Lilita One"',
      sky: { stops: [[0, '#141d47'], [0.38, '#3a3a7a'], [0.7, '#9a4f86'], [0.9, '#f07e6a'], [1, '#ffb27a']],
        sun: { x: 0.3, y: 0.66, glows: [[0.55, 'rgba(255,140,90,.45)']] },
        clouds: [{ seed: 51, scale: 0.0009, cover: 0.12, soft: 0.3, alt: 1500, dark: '#2c2a5c', lit: '#ff9a88', glow: '#ff8050', glowK: 3, sunX: 0.3, sunY: 1.1, haze: '#e88a7a', hazeH: 0.3, lk: 4, squash: 3, alpha: 0.9 }] },
      water: { level: 0, camH: 12, deep: '#0d1026', amp: 3.2, k: 0.05, f0: 0.25, refl: 0.92, shade: 0.12 },
      paint2d(g, c) {
        const { W, H, hz } = c, R = rng(7), u = W / 1600;
        const win = (x, top, w, bot, lit, a, cw, ch) => {
          for (let wy = top + ch * 1.2; wy < bot - ch; wy += ch * 1.65) {
            const floorOn = R() < 0.18;
            for (let wx = x + cw; wx < x + w - cw * 1.2; wx += cw * 1.8) if (floorOn ? R() < 0.9 : R() < lit) {
              const t = R(); g.fillStyle = t < 0.6 ? 'rgba(255,208,130,' + a + ')' : t < 0.85 ? 'rgba(255,238,205,' + a + ')' : 'rgba(165,205,255,' + a + ')'; g.fillRect(wx, wy, cw, ch * 0.72);
            }
          }
        };
        const tower = (x, w, top, L) => {
          const kind = R(), bot = hz + 2;
          if (kind < L.glass) {   // glass tower reflecting the dusk sky, floors as thin lines
            const gr = g.createLinearGradient(0, top, 0, bot); gr.addColorStop(0, L.glassTop); gr.addColorStop(0.55, L.col); gr.addColorStop(1, L.edge); g.fillStyle = gr; g.fillRect(x, top, w, bot - top);
            g.fillStyle = 'rgba(0,0,0,.18)'; for (let fy = top + 4 * u; fy < bot; fy += 5 * u) g.fillRect(x, fy, w, Math.max(1, 0.8 * u));
            g.fillStyle = 'rgba(255,190,150,.12)'; g.fillRect(x, top, w * 0.18, bot - top);
            if (L.winA > 0.5) win(x, top, w, bot, L.lit * 0.5, L.winA * 0.8, Math.max(2, 5 * u), Math.max(2, 5 * u));
          } else {
            const gr = g.createLinearGradient(x, 0, x + w, 0); gr.addColorStop(0, L.rim); gr.addColorStop(0.12, L.col); gr.addColorStop(1, L.edge); g.fillStyle = gr; g.fillRect(x, top, w, bot - top);
            if (L.winA > 0) win(x, top, w, bot, L.lit, L.winA, Math.max(2, 6.5 * u), Math.max(2, 8.5 * u));
          }
          const r = R();
          g.fillStyle = L.edge;
          if (r < 0.18) { g.fillRect(x + w * 0.25, top - w * 0.25, w * 0.5, w * 0.25); g.fillRect(x + w * 0.48, top - w * 0.9, Math.max(1, w * 0.04), w * 0.65); beacon(x + w * 0.5, top - w * 0.9); }
          else if (r < 0.3) { g.beginPath(); g.moveTo(x, top); g.lineTo(x + w / 2, top - w * 0.7); g.lineTo(x + w, top); g.fill(); }
          else if (r < 0.4 && L.winA > 0.5) { g.fillStyle = 'rgba(255,214,140,.85)'; g.fillRect(x + w * 0.1, top + 2 * u, w * 0.8, 3 * u); }
        };
        const beacon = (x, y) => { const rg = g.createRadialGradient(x, y, 0, x, y, 6 * u); rg.addColorStop(0, 'rgba(255,70,60,1)'); rg.addColorStop(1, 'rgba(255,70,60,0)'); g.fillStyle = rg; g.fillRect(x - 6 * u, y - 6 * u, 12 * u, 12 * u); };
        const layer = (L) => {
          let x = -30 * u;
          while (x < W + 30 * u) {
            const w = (L.wmin + R() * (L.wmax - L.wmin)) * u, center = 1 - Math.abs(x / W - 0.45) * 0.9;
            const hgt = (L.lo + R() * (L.hi - L.lo)) * u * (0.45 + 0.75 * center) * (R() < 0.07 ? 1.55 : 1);
            tower(x, w, hz - L.base * u - hgt, L); x += w + (R() < 0.3 ? R() * 14 * u : 0);
          }
        };
        const haze = (a, h2) => { const hg = g.createLinearGradient(0, hz - h2 * u, 0, hz); hg.addColorStop(0, 'rgba(236,132,118,0)'); hg.addColorStop(1, 'rgba(236,132,118,' + a + ')'); g.fillStyle = hg; g.fillRect(0, hz - h2 * u, W, h2 * u); };
        layer({ base: 6, lo: 70, hi: 210, wmin: 26, wmax: 80, col: '#6d5893', edge: '#5d4c84', rim: '#8c6c98', glassTop: '#9a6c96', glass: 0.25, lit: 0.08, winA: 0.3 }); haze(0.55, 360);
        layer({ base: 3, lo: 90, hi: 300, wmin: 34, wmax: 100, col: '#3a3266', edge: '#2c2754', rim: '#6a4a78', glassTop: '#8a5a86', glass: 0.3, lit: 0.18, winA: 0.7 }); haze(0.2, 260);
        // landmarks: a needle spire and a gold-crowned tower
        const sx = W * 0.38, st = hz - 520 * u; g.fillStyle = '#1b1838'; g.fillRect(sx - 18 * u, st + 70 * u, 36 * u, hz - st); g.beginPath(); g.moveTo(sx - 18 * u, st + 70 * u); g.lineTo(sx, st); g.lineTo(sx + 18 * u, st + 70 * u); g.fill();
        g.fillRect(sx - 1.5 * u, st - 70 * u, 3 * u, 72 * u); beacon(sx, st - 70 * u); win(sx - 18 * u, st + 80 * u, 36 * u, hz, 0.3, 0.9, Math.max(2, 4 * u), Math.max(2, 6 * u));
        const cx = W * 0.6, ct = hz - 400 * u; g.fillStyle = '#1d1a3c'; g.fillRect(cx - 34 * u, ct, 68 * u, hz - ct); g.fillRect(cx - 24 * u, ct - 40 * u, 48 * u, 40 * u); g.fillRect(cx - 14 * u, ct - 70 * u, 28 * u, 30 * u);
        const gold = g.createLinearGradient(0, ct - 70 * u, 0, ct); gold.addColorStop(0, 'rgba(255,220,140,.95)'); gold.addColorStop(1, 'rgba(255,170,80,.25)'); g.fillStyle = gold;
        for (let i = 0; i < 5; i++) g.fillRect(cx - 22 * u + i * 10 * u, ct - 38 * u, 3 * u, 36 * u);
        g.fillRect(cx - 12 * u, ct - 68 * u, 24 * u, 3 * u); g.fillRect(cx - 1 * u, ct - 120 * u, 2 * u, 52 * u); beacon(cx, ct - 120 * u);
        win(cx - 34 * u, ct, 68 * u, hz, 0.32, 0.95, Math.max(2, 5 * u), Math.max(2, 7 * u));
        layer({ base: 0, lo: 40, hi: 190, wmin: 46, wmax: 130, col: '#19173a', edge: '#121030', rim: '#3a2a52', glassTop: '#3f2f5e', glass: 0.25, lit: 0.26, winA: 0.95 });
        // a bridge running off to the right
        g.strokeStyle = '#100e26'; g.fillStyle = '#100e26'; g.lineWidth = 3 * u;
        const by = hz - 14 * u, p1 = W * 0.8, p2 = W * 0.98; g.fillRect(W * 0.72, by, W * 0.3, 6 * u);
        for (const px of [p1, p2]) { g.fillRect(px - 4 * u, by - 120 * u, 8 * u, 126 * u); g.lineWidth = 1 * u; for (let k = 1; k <= 7; k++) { g.beginPath(); g.moveTo(px, by - 116 * u); g.lineTo(px - k * 14 * u, by); g.moveTo(px, by - 116 * u); g.lineTo(px + k * 14 * u, by); g.stroke(); } beacon(px, by - 122 * u); }
        for (let x2 = W * 0.72; x2 < W; x2 += 9 * u) { g.fillStyle = 'rgba(255,214,150,.9)'; g.fillRect(x2, by - 1.5 * u, 2 * u, 2 * u); }
        // embankment with a few lamps
        g.fillStyle = '#0b0a1a'; g.fillRect(0, hz - 5 * u, W, 6 * u);
        for (let x2 = 14 * u; x2 < W * 0.72; x2 += (28 + R() * 30) * u) { const rg = g.createRadialGradient(x2, hz - 8 * u, 0, x2, hz - 8 * u, 7 * u); rg.addColorStop(0, 'rgba(255,214,150,.95)'); rg.addColorStop(1, 'rgba(255,200,130,0)'); g.fillStyle = rg; g.fillRect(x2 - 7 * u, hz - 15 * u, 14 * u, 14 * u); }
        // a neon rooftop sign for our favourite brand
        g.save(); g.font = Math.round(24 * u) + 'px "Lilita One",sans-serif'; g.textAlign = 'center'; g.shadowColor = '#ff4fb0'; g.shadowBlur = 16 * u; g.fillStyle = '#ffd6f0'; g.fillText('BONKMART', W * 0.2, hz - 205 * u); g.restore();
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

  /* run a painter generator to the end now, or in ~10 ms slices so the game keeps running */
  const runSync = gen => { let r; do { r = gen.next(); } while (!r.done); return r.value; };
  const runAsync = gen => new Promise((res, rej) => {
    const step = () => { try { const t = performance.now(); let r; do { r = gen.next(); if (r.done) return res(r.value); } while (performance.now() - t < 10); setTimeout(step, 0); } catch (e) { rej(e); } };
    step();
  });
  const cache = new Map(), pending = new Map();
  function keep(key, cv) { cache.set(key, cv); if (cache.size > 3) cache.delete(cache.keys().next().value); }
  function sizeFor() { const w = clamp(Math.round(innerWidth), 1280, 1920), ar = clamp(innerWidth / Math.max(1, innerHeight), 1.25, 2.4); return [w, Math.round(w / ar)]; }
  const API = {
    list: SCENES, def: 'canyon',
    has(id) { return SCENES.some(s => s.id === id); },
    current() { return API.has(settings.wallpaper) ? settings.wallpaper : API.def; },
    /* returns a canvas (or svg) element; full-screen renders are cached */
    render(id, w, h) {
      const sc = SCENES.find(s => s.id === id) || SCENES[0];
      if (sc.svg) return logoSVG();
      if (sc.font && document.fonts && !document.fonts.check(sc.font)) document.fonts.load(sc.font).then(() => { for (const k of [...cache.keys()]) if (k.startsWith(sc.id + '|')) cache.delete(k); if (OS.wallId === sc.id) { OS.wallId = null; OS.setWallpaper(sc.id); } }).catch(() => {});
      if (w) return runSync(paintScene(sc, w, h));
      const [W, H] = sizeFor(), key = sc.id + '|' + W + 'x' + H;
      let cv = cache.get(key);
      if (!cv) { const t0 = performance.now(); cv = runSync(paintScene(sc, W, H)); API.lastMs = Math.round(performance.now() - t0); keep(key, cv); }
      else { cache.delete(key); cache.set(key, cv); }
      return cv;
    },
    /* full-screen render without freezing the game: resolves with the element (cached ones resolve at once) */
    renderAsync(id) {
      const sc = SCENES.find(s => s.id === id) || SCENES[0];
      if (sc.svg) return Promise.resolve(logoSVG());
      const [W, H] = sizeFor(), key = sc.id + '|' + W + 'x' + H;
      if (cache.has(key)) return Promise.resolve(API.render(sc.id));
      if (!pending.has(key)) {
        const t0 = performance.now();
        pending.set(key, runAsync(paintScene(sc, W, H)).then(cv => { API.lastMs = Math.round(performance.now() - t0); keep(key, cv); pending.delete(key); return cv; }, e => { pending.delete(key); throw e; }));
      }
      return pending.get(key);
    },
    set(id) { if (!API.has(id)) return Promise.resolve(); settings.wallpaper = id; saveSettings(); OS.wallId = null; Bus.emit('wallpaper', id); return OS.setWallpaper(id); }
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
        Wallpapers.set(sc.id).then(() => card.classList.remove('busy'), () => card.classList.remove('busy'));
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
