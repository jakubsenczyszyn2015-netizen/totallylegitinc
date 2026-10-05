/* Performance probe: frame time, JS time per frame (with a breakdown of the heaviest Loop hooks), draw calls and
   triangles in the heavy scenes: the call floor with every NPC, the desktop with several windows (Camera + CCTV),
   the review fire and a self-airstrike.  PERF_Q=low|med|high sets the quality, PERF_ONLY=floor,desk,fire,strike
   runs some scenes, PERF_MS sets the sample length.  Software WebGL in the harness is slow and the machine may be
   shared, so compare JS ms / draw calls between runs rather than absolute fps. */
module.exports = async page => {
  const ev = page.eval, Q = process.env.PERF_Q || 'med', MS = +process.env.PERF_MS || 3000;
  const want = k => !process.env.PERF_ONLY || process.env.PERF_ONLY.split(',').includes(k);
  const shotDir = process.env.PERF_SHOTS !== '0';
  await ev(q => {
    const T = window.__tli, R = T.W.renderer; R.info.autoReset = false;
    const S = window.__perf = { on: false, n: 0, js: 0, dt: 0, last: 0, calls: 0, tris: 0, uw: 0, rw: 0, hooks: new Map(), worst: 0 };
    const key = f => f.__k || (f.__k = (f.name || '') + ' ' + f.toString().slice(0, 70).replace(/\s+/g, ' '));
    const of = window.frame;
    window.frame = ts => {
      R.info.reset();
      if (!S.on) return of(ts);
      const t0 = performance.now(); if (S.last) S.dt += ts - S.last; S.last = ts;
      of(ts);
      const d = performance.now() - t0; S.js += d; S.worst = Math.max(S.worst, d); S.n++; S.calls += R.info.render.calls; S.tris += R.info.render.triangles;
    };
    const ou = window.updateWorld; window.updateWorld = (dt, t) => { const t0 = performance.now(); ou(dt, t); if (S.on) S.uw += performance.now() - t0; };
    const orw = window.renderWorld; window.renderWorld = () => { const t0 = performance.now(); orw(); if (S.on) S.rw += performance.now() - t0; };
    const oc = T.Loop._call;
    T.Loop._call = function (list, dt, t) {
      if (!S.on) return oc.call(this, list, dt, t);
      for (const f of list) { const t0 = performance.now(); oc.call(this, [f], dt, t); const k = key(f); S.hooks.set(k, (S.hooks.get(k) || 0) + performance.now() - t0); }
    };
    T.settings.quality = q; applyQuality(); return true;
  }, Q);
  const measure = async name => {
    await ev(() => { const S = window.__perf; Object.assign(S, { on: true, n: 0, js: 0, dt: 0, last: 0, calls: 0, tris: 0, uw: 0, rw: 0, worst: 0 }); S.hooks.clear(); return true; });
    await page.wait(MS);
    const r = await ev(() => {
      const S = window.__perf, n = Math.max(1, S.n), R = window.__tli.W.renderer; S.on = false;
      const hooks = [...S.hooks].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => (v / n).toFixed(2) + 'ms ' + k);
      return { frames: S.n, frameMs: +(S.dt / Math.max(1, S.n - 1)).toFixed(1), jsMs: +(S.js / n).toFixed(2), worstJs: +S.worst.toFixed(1), updateWorld: +(S.uw / n).toFixed(2), render: +(S.rw / n).toFixed(2),
        calls: Math.round(S.calls / n), tris: Math.round(S.tris / n), textures: R.info.memory.textures, geometries: R.info.memory.geometries, programs: (R.info.programs || []).length, hooks };
    });
    console.log('PERF [' + Q + '] ' + name + ' ' + JSON.stringify(r, null, 1).replace(/\n\s*/g, ' '));
    if (shotDir) await page.shot('perf-' + Q + '-' + name);
    return r;
  };
  await page.startSolo('week');
  await ev(() => { const T = window.__tli; T.G.timeLeft = 9999; return true; });
  if (want('floor')) {
    // the cross aisle looking down the call floor: every NPC and most desks in view
    await page.teleport(4.5, 0.3, Math.PI / 2, -0.12);
    await page.wait(500);
    await measure('floor');
  }
  if (want('desk')) {
    await page.sit();
    await ev(() => { const T = window.__tli; T.Call.ring(false); return true; });
    await page.wait(300);
    await ev(() => { const T = window.__tli; T.OS.launch('phone'); T.OS.launch('camera'); T.OS.launch('cctv'); T.OS.launch('cookie'); return true; });
    await page.wait(1200);
    await measure('desk');
    await ev(() => { const T = window.__tli; T.Call.decline(); [...T.OS.wins.keys()].forEach(k => T.OS.close(k)); return true; });
    await page.stand();
  }
  if (want('fire')) {
    await ev(() => { const T = window.__tli; T.G.team = 50; T.Game.endDay(); return true; });
    await page.wait(400);
    await ev(() => { Review.seek(Review.state.marks.verdict + 0.05); return true; });
    await page.wait(2600);
    await measure('fire');
    await ev(() => { window.__tli.Game.retryDay(); const dc = document.getElementById('daycard'); if (dc) dc.classList.remove('on'); window.__tli.G.timeLeft = 9999; return true; });
    await page.wait(800);
  }
  if (want('strike')) {
    await page.sit(0);
    await ev(() => { const T = window.__tli; T.G.wallet = 3000; return BonkMart.buy('chaos_strike'); });
    await page.stand();
    await page.teleport(3.2, 0.3, Math.PI / 2, -0.05);
    await ev(() => { const T = window.__tli; window.__hold = T.Loop.add(() => { const P = T.P; P.stunT = 0; P.kx = P.kz = 0; P.pos.x = 3.2; P.pos.z = 0.3; P.pos.y = 0; }); return true; });
    await ev(() => new Promise(res => { const L = Chaos.last, t = L.t0 + L.pts[0][2]; const f = () => (Chaos.t >= t ? res(true) : setTimeout(f, 20)); f(); }));
    await measure('strike');
    await ev(() => { window.__tli.Loop.remove(window.__hold); return true; });
  }
};
