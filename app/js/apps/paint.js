'use strict';
/* =====================================================================
   DOODLE PRO — paint app (OS.apps.paint, bought in the shop for $100; replaces the old Doodle).
   Pen, marker, spray, eraser, fill, line / rect / ellipse, palette + picker, undo/redo, and
   "Hang it up!": your painting becomes a framed canvas on your cubicle wall that everyone sees.
   Paintings: the 3D side (Net 'paint:hang' / 'paint:req', shared 'paintings'). API: docs/modules/tools.md
   ===================================================================== */
const Paintings = (() => {
  const MAX = 24, list = new Map(), asked = new Map();
  let R = null;   // shared geometries / materials, made on first use
  function res() {
    if (R) return R;
    const wood = new THREE.MeshLambertMaterial({ color: '#5a3820' }), leg = new THREE.MeshLambertMaterial({ color: '#a8743f' });
    R = { wood, leg, frame: new THREE.BoxGeometry(0.44, 0.34, 0.03), pic: new THREE.PlaneGeometry(0.4, 0.3), lip: new THREE.BoxGeometry(0.46, 0.022, 0.05),
      leg: new THREE.BoxGeometry(0.035, 1.5, 0.035), tray: new THREE.BoxGeometry(0.5, 0.03, 0.08) };
    return R;
  }
  /* picture texture: cream mat, the painting, a little brass plaque with the artist's name */
  function compose(img, name) {
    const c = document.createElement('canvas'); c.width = 320; c.height = 240; const g = c.getContext('2d');
    g.fillStyle = '#f3eee2'; g.fillRect(0, 0, 320, 240);
    g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(13, 12, 296, 186);
    g.drawImage(img, 14, 12, 292, 182);
    g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 1; g.strokeRect(14.5, 12.5, 291, 181);
    const t = String(name || 'Anonymous').slice(0, 20), pw = Math.min(200, 60 + t.length * 7.2), gr = g.createLinearGradient(0, 205, 0, 229);
    gr.addColorStop(0, '#f1d27a'); gr.addColorStop(0.5, '#c9a24a'); gr.addColorStop(1, '#9c7a2c');
    g.fillStyle = gr; g.beginPath(); g.roundRect ? g.roundRect(160 - pw / 2, 205, pw, 24, 4) : g.rect(160 - pw / 2, 205, pw, 24); g.fill();
    g.fillStyle = '#3a2a10'; g.font = '700 13px Roboto, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('by ' + t, 160, 217.5);
    const tex = new THREE.CanvasTexture(c); tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 4; return tex;
  }
  function build(d, tex) {
    const r = res(), grp = new THREE.Group(), mat = new THREE.MeshLambertMaterial({ map: tex, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.22 });
    const art = new THREE.Group(), fr = new THREE.Mesh(r.frame, r.wood), pic = new THREE.Mesh(r.pic, mat);
    pic.position.z = 0.0155; art.add(fr, pic);
    if (d.desk >= 0 && W.desks[d.desk]) {
      const k = W.desks[d.desk]; grp.position.set(k.x, 0, k.z); grp.rotation.y = k.rot;
      art.position.set(-0.61, 1.19, -0.428); art.rotation.z = ((hashStr(d.id) % 100) / 100 - 0.5) * 0.07;
    } else {   // a little easel on the floor
      grp.position.set(d.pos[0], 0, d.pos[1]); grp.rotation.y = d.ry || 0;
      art.position.set(0, 1.22, 0.02); art.rotation.x = -0.16;
      const tray = new THREE.Mesh(r.tray, r.leg); tray.position.set(0, 1.035, 0.07); tray.rotation.x = -0.16;
      const l1 = new THREE.Mesh(r.leg, r.leg), l2 = new THREE.Mesh(r.leg, r.leg), l3 = new THREE.Mesh(r.leg, r.leg);
      l1.position.set(-0.2, 0.74, 0.06); l1.rotation.set(-0.12, 0, -0.1); l2.position.set(0.2, 0.74, 0.06); l2.rotation.set(-0.12, 0, 0.1);
      l3.position.set(0, 0.7, -0.22); l3.rotation.x = 0.32; grp.add(tray, l1, l2, l3);
    }
    grp.add(art); grp.userData.mat = mat; return grp;
  }
  function valid(d) {
    return d && typeof d.id === 'string' && d.id.length < 90 && typeof d.img === 'string' && d.img.startsWith('data:image/jpeg;base64,') && d.img.length < 400000
      && ((Number.isInteger(d.desk) && d.desk >= 0 && d.desk < 400) || (Array.isArray(d.pos) && d.pos.length === 2 && d.pos.every(Number.isFinite)));
  }
  function remove(id) {
    const p = list.get(id); if (!p) return; list.delete(id);
    if (p.group) { W.scene.remove(p.group); p.group.userData.mat.dispose(); }
    if (p.tex) p.tex.dispose();
  }
  function add(d) {
    if (!valid(d) || list.has(d.id)) return;
    d = { id: d.id, img: d.img, name: String(d.name || '').slice(0, 20), desk: Number.isInteger(d.desk) ? d.desk : -1, pos: d.pos, ry: +d.ry || 0, by: d.by };
    d.key = d.desk >= 0 ? 'desk' + d.desk : d.id;
    for (const [id, p] of list) if (p.data.key === d.key) remove(id);   // one painting per desk: the new one replaces it
    while (list.size >= MAX) remove(list.keys().next().value);
    const p = { data: d, group: null, tex: null }; list.set(d.id, p);
    const img = new Image();
    img.onload = () => {
      if (list.get(d.id) !== p || !W.scene) return;
      p.tex = compose(img, d.name); p.group = build(d, p.tex); W.scene.add(p.group);
      Bus.emit('paint:hung', d);
    };
    img.src = d.img;
  }
  /* hang an image (JPEG data URL) at your desk (when seated) or on an easel in front of you */
  function hang(img, opts) {
    opts = opts || {};
    const desk = opts.desk != null ? opts.desk : P.seated && P.seat >= 0 ? P.seat : -1;
    const d = { id: (Net.myId || 'me') + ':' + Date.now().toString(36), img, name: opts.name || settings.name, desk, by: Net.myId };
    if (desk < 0) { const sy = Math.sin(P.yaw), cy = Math.cos(P.yaw); d.pos = [+(P.pos.x - sy * 1.3).toFixed(2), +(P.pos.z - cy * 1.3).toFixed(2)]; d.ry = +P.yaw.toFixed(3); }
    add(d); Net.emit('paint:hang', d); return d;
  }
  Net.on('paint:hang', d => add(d));
  Net.on('paint:req', (d, from) => { const p = d && list.get(d.id); if (p && Net.isHost) Net.emit('paint:hang', p.data, { to: from }); });
  // host-shared list of painting ids: late joiners ask the host for the ones they do not have
  Net.share('paintings', () => list.size ? [...list.keys()] : undefined, ids => {
    if (!Array.isArray(ids)) return; const t = now();
    for (const id of ids) if (typeof id === 'string' && !list.has(id) && !(asked.get(id) > t)) { asked.set(id, t + 6); Net.emit('paint:req', { id }, { host: true }); }
  });
  const clear = () => { for (const id of [...list.keys()]) remove(id); asked.clear(); };
  Bus.on('quit', clear); Bus.on('game:begin', clear);
  return { list, hang, add, remove, clear };
})();

const DoodlePro = (() => {
  const ID = 'paint', CW = 640, CH = 400;
  const owned = () => !!(G.prog.apps && G.prog.apps[ID]);
  const SV = d => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>';
  const IC = {
    pen: SV('<path d="M4.5 19.5l1.1-4.3L16.2 4.6a1.9 1.9 0 0 1 2.7 0l.5.5a1.9 1.9 0 0 1 0 2.7L8.8 18.4z"/><path d="M14.4 6.4l3.2 3.2"/><path d="M4.5 19.5l1.1-4.3 3.2 3.2z" fill="currentColor"/>'),
    marker: SV('<path d="M9.6 15.8 7.8 14l8.6-8.6a1.5 1.5 0 0 1 2.1 0l1.6 1.6a1.5 1.5 0 0 1 0 2.1z"/><path d="M7.8 14 5 16.8v1.8l-1.4 1.4h3.6l1-1h1.4l2-2" fill="currentColor"/>'),
    spray: SV('<rect x="5.5" y="9" width="8" height="12" rx="1.6"/><path d="M7.5 9V6.2h4V9M11.5 6.2h2.2"/><g fill="currentColor" stroke="none"><circle cx="17.5" cy="4.6" r="1"/><circle cx="20" cy="7" r="1"/><circle cx="18.6" cy="9.6" r="1"/><circle cx="21" cy="3.6" r=".9"/><circle cx="21.2" cy="10.6" r=".8"/></g>'),
    eraser: SV('<path d="M3.6 16.4 12.8 7.2a1.8 1.8 0 0 1 2.5 0l3.5 3.5a1.8 1.8 0 0 1 0 2.5L12 20H7.2z"/><path d="M8.6 11.4l6 6M11 20h9.4"/>'),
    fill: SV('<path d="M4.8 11.2 11.6 4.4l6.8 6.8-6.8 6.8z"/><path d="M4.8 11.2h13.6" opacity=".55"/><path d="M19.8 14.2s-2.1 2.5-2.1 3.8a2.1 2.1 0 0 0 4.2 0c0-1.3-2.1-3.8-2.1-3.8z" fill="currentColor"/>'),
    line: SV('<path d="M5 19 19 5"/><circle cx="5" cy="19" r="1.6" fill="currentColor"/><circle cx="19" cy="5" r="1.6" fill="currentColor"/>'),
    rect: SV('<rect x="4" y="6" width="16" height="12" rx="1"/>'),
    ellipse: SV('<ellipse cx="12" cy="12" rx="8.5" ry="6.2"/>'),
    undo: SV('<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>'),
    redo: SV('<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>'),
    clear: SV('<path d="M5 7h14M10 7V4.6h4V7M7 7l1 13h8l1-13"/>'),
    hang: SV('<path d="M8.5 6.5 12 3l3.5 3.5"/><rect x="3.5" y="6.5" width="17" height="14" rx="1.2"/><path d="m6.5 17.5 4-4.5 3 3 2-2 2.5 3.5" /><circle cx="15.5" cy="10.5" r="1.3" fill="currentColor"/>')
  };
  const TOOLS = [['pen', 'Pen'], ['marker', 'Marker'], ['spray', 'Spray'], ['eraser', 'Eraser'], ['fill', 'Fill bucket'], ['line', 'Line'], ['rect', 'Rectangle'], ['ellipse', 'Ellipse']];
  const PAL = ['#11151f', '#5c6370', '#a0a7b4', '#ffffff', '#7a1f12', '#d6342c', '#ff7a3c', '#f59e0b', '#ffd43b', '#9be15d', '#27c07a', '#0c8599', '#3b82f6', '#1e3a8a',
    '#5f3dc4', '#a855f7', '#e64980', '#ff8fab', '#f2c4a0', '#c98d63', '#8a5a3a', '#4a2c18', '#2f9e44', '#155e3a', '#74c0fc', '#d0bfff', '#ffe8cc', '#e9ecef'];
  // the drawing survives closing the window (for this session)
  const S = { cv: null, tool: 'pen', col: '#11151f', size: 8, filled: false, undo: [], redo: [], title: 'Untitled masterpiece', dirty: false };
  function canvas() {
    if (!S.cv) { S.cv = h('canvas', { width: CW, height: CH, class: 'dp-cv' }); const g = S.cv.getContext('2d', { willReadFrequently: true }); g.fillStyle = '#fff'; g.fillRect(0, 0, CW, CH); }
    return S.cv;
  }
  const ctx = () => canvas().getContext('2d', { willReadFrequently: true });
  function snap() { S.undo.push(ctx().getImageData(0, 0, CW, CH)); if (S.undo.length > 20) S.undo.shift(); S.redo.length = 0; S.dirty = true; }
  function undo() { if (!S.undo.length) return; const g = ctx(); S.redo.push(g.getImageData(0, 0, CW, CH)); g.putImageData(S.undo.pop(), 0, 0); SFX.click(); }
  function redo() { if (!S.redo.length) return; const g = ctx(); S.undo.push(g.getImageData(0, 0, CW, CH)); g.putImageData(S.redo.pop(), 0, 0); SFX.click(); }
  function clearAll() { snap(); const g = ctx(); g.fillStyle = '#fff'; g.fillRect(0, 0, CW, CH); AudioSys.noise(0.25, 0.08, 0, 2500); }
  const hex2 = c => { const n = parseInt(c.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  /* scanline flood fill with a little tolerance (anti-aliased edges) */
  function flood(x, y, col) {
    x |= 0; y |= 0; if (x < 0 || y < 0 || x >= CW || y >= CH) return;
    const g = ctx(), im = g.getImageData(0, 0, CW, CH), d = im.data, i0 = (y * CW + x) * 4, [r, gg, b] = hex2(col);
    const tr = d[i0], tg = d[i0 + 1], tb = d[i0 + 2];
    if (Math.abs(tr - r) + Math.abs(tg - gg) + Math.abs(tb - b) < 6) return;
    snap();
    const TOL = 90, seen = new Uint8Array(CW * CH), match = p => !seen[p] && Math.abs(d[p * 4] - tr) + Math.abs(d[p * 4 + 1] - tg) + Math.abs(d[p * 4 + 2] - tb) <= TOL;
    const st = [x, y];
    while (st.length) {
      const sy = st.pop(); let sx = st.pop(), p = sy * CW + sx;
      while (sx > 0 && match(p - 1)) { sx--; p--; }
      let up = false, dn = false;
      for (; sx < CW && match(p); sx++, p++) {
        seen[p] = 1; d[p * 4] = r; d[p * 4 + 1] = gg; d[p * 4 + 2] = b; d[p * 4 + 3] = 255;
        if (sy > 0) { const m = match(p - CW); if (m && !up) { st.push(sx, sy - 1); up = true; } else if (!m) up = false; }
        if (sy < CH - 1) { const m = match(p + CW); if (m && !dn) { st.push(sx, sy + 1); dn = true; } else if (!m) dn = false; }
      }
    }
    g.putImageData(im, 0, 0); AudioSys.tone(420, 0.12, 'sine', 0.1, 0, 760);
  }
  function shape(g, tool, x0, y0, x1, y1) {
    g.beginPath();
    if (tool === 'line') { g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); return; }
    if (tool === 'rect') g.rect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0));
    else g.ellipse((x0 + x1) / 2, (y0 + y1) / 2, Math.abs(x1 - x0) / 2 + 0.01, Math.abs(y1 - y0) / 2 + 0.01, 0, 0, Math.PI * 2);
    if (S.filled) g.fill(); g.stroke();
  }
  function sprayAt(x, y) {
    const g = ctx(), r = S.size * 1.6 + 4, n = 10 + S.size * 1.5; g.fillStyle = S.col;
    for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, d = r * Math.sqrt(Math.random()); g.fillRect(x + Math.cos(a) * d, y + Math.sin(a) * d, 1.4, 1.4); }
  }
  /* a small JPEG of the canvas, for hanging (sent over the network) */
  function jpeg(w, q) { const c = document.createElement('canvas'); c.width = w || 320; c.height = Math.round((w || 320) * CH / CW); const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(canvas(), 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', q || 0.82); }
  function hang(btn) {
    const d = Paintings.hang(jpeg(320, 0.82));
    SFX.pass(); toast(d.desk >= 0 ? 'Your masterpiece now hangs in your cubicle. Stand up and admire it.' : 'Your masterpiece is on an easel in front of you.', 'good');
    if (btn) { btn.classList.add('done'); btn.lastChild.textContent = 'Hung!'; setTimeout(() => { btn.classList.remove('done'); btn.lastChild.textContent = 'Hang it up!'; }, 1800); }
    Bus.emit('paint:hang', d);
  }

  function render(b, w) {
    const cv = canvas(), ov = h('canvas', { width: CW, height: CH, class: 'dp-ov' }), og = ov.getContext('2d');
    const u = w.ui = {};
    const toolBtn = ([id, name]) => h('button', { class: 'dp-tool' + (S.tool === id ? ' on' : ''), title: name, html: IC[id], onclick: () => setTool(id) });
    const setTool = id => { S.tool = id; $$('.dp-tool', b).forEach((e, i) => e.classList.toggle('on', TOOLS[i][0] === id)); u.stage.dataset.tool = id; status(); SFX.click(); };
    const setCol = c => { S.col = c; u.cur.style.background = c; u.pick.value = c; $$('.dp-sw', b).forEach(e => e.classList.toggle('on', e.dataset.c === c)); dot(); };
    const dot = () => { const s = Math.max(3, Math.min(30, S.size * (S.tool === 'marker' ? 2 : 1))); u.dot.style.width = u.dot.style.height = s + 'px'; u.dot.style.background = S.tool === 'eraser' ? '#fff' : S.col; u.sz.textContent = S.size + ' px'; };
    const status = () => { u.st.textContent = TOOLS.find(t => t[0] === S.tool)[1] + ' · ' + S.size + ' px'; dot(); };
    b.append(
      h('div', { class: 'dp-top' },
        h('div', { class: 'dp-brand' }, h('i', { html: OS.glyph('palette') }), h('b', {}, 'Doodle', h('span', {}, 'Pro'))),
        h('div', { class: 'dp-grp' }, h('button', { class: 'dp-ib', title: 'Undo (Ctrl+Z)', html: IC.undo, onclick: undo }), h('button', { class: 'dp-ib', title: 'Redo (Ctrl+Y)', html: IC.redo, onclick: redo }),
          h('button', { class: 'dp-ib', title: 'Clear the canvas', html: IC.clear, onclick: clearAll })),
        h('div', { class: 'dp-grp dp-size' }, h('span', { class: 'dp-dotw' }, u.dot = h('i')),
          h('input', { type: 'range', min: 1, max: 48, value: S.size, title: 'Brush size', oninput: e => { S.size = +e.target.value; status(); } }), u.sz = h('small')),
        h('div', { class: 'dp-grp dp-fillt' }, h('button', { class: 'dp-tg' + (S.filled ? '' : ' on'), onclick: e => { S.filled = false; e.currentTarget.classList.add('on'); e.currentTarget.nextSibling.classList.remove('on'); } }, 'Outline'),
          h('button', { class: 'dp-tg' + (S.filled ? ' on' : ''), onclick: e => { S.filled = true; e.currentTarget.classList.add('on'); e.currentTarget.previousSibling.classList.remove('on'); } }, 'Filled')),
        u.hang = h('button', { class: 'dp-hang', title: 'Frame it and hang it on your cubicle wall (everyone can see it)', onclick: () => hang(u.hang) }, h('i', { html: IC.hang }), h('span', {}, 'Hang it up!'))),
      h('div', { class: 'dp-mid' },
        h('div', { class: 'dp-tools' }, TOOLS.map(toolBtn)),
        u.stage = h('div', { class: 'dp-stage' }, h('div', { class: 'dp-paper' }, cv, ov))),
      h('div', { class: 'dp-pal' },
        h('label', { class: 'dp-cur', title: 'Pick any colour' }, u.cur = h('i'), u.pick = h('input', { type: 'color', value: S.col, oninput: e => setCol(e.target.value) })),
        h('div', { class: 'dp-sws' }, PAL.map(c => { const e = h('button', { class: 'dp-sw', style: { background: c }, title: c, onclick: () => setCol(c) }); e.dataset.c = c; return e; }))),
      h('div', { class: 'dp-status' }, u.st = h('span'), h('span', {}, CW + ' × ' + CH + ' px'), u.xy = h('span', {}, ''),
        h('span', { class: 'dp-ttl' }, '"', u.title = h('input', { value: S.title, maxLength: 28, spellcheck: false, oninput: e => { S.title = e.target.value; } }), '" by ' + settings.name)));
    u.stage.dataset.tool = S.tool; setCol(S.col); status();

    // drawing
    let down = false, x0 = 0, y0 = 0, lx = 0, ly = 0, sprayT = null;
    const pos = e => { const r = ov.getBoundingClientRect(); return [(e.clientX - r.left) * CW / r.width, (e.clientY - r.top) * CH / r.height]; };
    const brush = g => { g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = g.fillStyle = S.tool === 'eraser' ? '#ffffff' : S.col; g.lineWidth = S.tool === 'marker' ? S.size * 2 : S.tool === 'eraser' ? S.size * 1.6 : S.size; };
    ov.addEventListener('pointerdown', e => {
      if (e.button !== 0) return; e.preventDefault(); [x0, y0] = pos(e); lx = x0; ly = y0;
      if (S.tool === 'fill') { flood(x0, y0, S.col); return; }
      down = true; try { ov.setPointerCapture(e.pointerId); } catch (_) {}
      snap(); og.clearRect(0, 0, CW, CH); ov.style.opacity = S.tool === 'marker' ? 0.5 : 1;
      if (S.tool === 'spray') { sprayAt(x0, y0); sprayT = setInterval(() => sprayAt(lx, ly), 30); AudioSys.noise(0.2, 0.04, 0, 6000); return; }
      if (['pen', 'marker', 'eraser'].includes(S.tool)) { brush(og); og.beginPath(); og.arc(x0, y0, og.lineWidth / 2, 0, 7); og.fill(); }
    });
    ov.addEventListener('pointermove', e => {
      const [x, y] = pos(e); u.xy.textContent = Math.round(clamp(x, 0, CW)) + ', ' + Math.round(clamp(y, 0, CH));
      if (!down) return;
      if (S.tool === 'spray') { lx = x; ly = y; return; }
      if (['pen', 'marker', 'eraser'].includes(S.tool)) { brush(og); og.beginPath(); og.moveTo(lx, ly); og.lineTo(x, y); og.stroke(); lx = x; ly = y; return; }
      og.clearRect(0, 0, CW, CH); brush(og); shape(og, S.tool, x0, y0, x, y); lx = x; ly = y;
    });
    const end = () => {
      if (!down) return; down = false; clearInterval(sprayT); sprayT = null;
      if (S.tool !== 'spray') { const g = ctx(); g.save(); g.globalAlpha = S.tool === 'marker' ? 0.5 : 1; g.drawImage(ov, 0, 0); g.restore(); }
      og.clearRect(0, 0, CW, CH); ov.style.opacity = 1;
    };
    ov.addEventListener('pointerup', end); ov.addEventListener('pointercancel', end); ov.addEventListener('pointerleave', () => { u.xy.textContent = ''; });
    w.key = e => {
      if (!w.el.classList.contains('focus') || !OS.open || /INPUT|TEXTAREA/.test(e.target.tagName)) return;
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      else if ((e.ctrlKey || e.metaKey) && k === 'y') { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', w.key);
  }

  OS.apps[ID] = {
    desktop: true, order: 72, available: owned, title: 'Doodle Pro', icon: 'palette', color: '#d6336c', w: 700, h: 560, x: 0.12, y: 0.03, cls: 'dpwin',
    render, onClose(w) { window.removeEventListener('keydown', w.key); }
  };
  delete OS.apps.doodle;

  function art(g, w, hh) {
    g.fillStyle = '#fff4e6'; g.fillRect(0, 0, w, hh);
    const s = Math.min(w, hh) / 100; g.save(); g.translate(w / 2, hh / 2); g.scale(s, s);
    g.fillStyle = '#c98d63'; g.strokeStyle = '#5a3820'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(-34, -6); g.bezierCurveTo(-40, -36, 10, -44, 32, -26); g.bezierCurveTo(48, -12, 40, 10, 24, 8); g.bezierCurveTo(12, 6, 10, 20, 18, 28); g.bezierCurveTo(8, 42, -30, 34, -34, -6); g.fill(); g.stroke();
    [['#d6342c', -20, -18], ['#ffd43b', -2, -26], ['#27c07a', 16, -20], ['#3b82f6', -24, 4], ['#a855f7', -12, 20]].forEach(([c, x, y]) => { g.fillStyle = c; g.beginPath(); g.arc(x, y, 6.5, 0, 7); g.fill(); g.lineWidth = 1.5; g.stroke(); });
    g.fillStyle = '#fff4e6'; g.beginPath(); g.ellipse(22, -4, 6, 5, 0, 0, 7); g.fill(); g.stroke();
    g.rotate(-0.7); g.fillStyle = '#e8b04a'; g.fillRect(18, 18, 9, 34); g.strokeRect(18, 18, 9, 34); g.fillStyle = '#9aa3b1'; g.fillRect(18, 10, 9, 9); g.fillStyle = '#d6336c'; g.beginPath(); g.moveTo(18, 10); g.quadraticCurveTo(22.5, -6, 27, 10); g.fill();
    g.restore();
  }
  Shop.add({
    id: 'app_' + ID, tab: 'games', section: 'Software', name: 'Doodle Pro', price: 100, icon: 'palette', color: '#d6336c', sort: 30, art,
    desc: 'Professional painting software for unprofessional people. Brushes, buckets, shapes, and a button that hangs your art in the office for all to judge.',
    owned, buy() { (G.prog.apps = G.prog.apps || {})[ID] = true; Game.saveProgress(); if (OS.open) OS.buildIcons(); }
  });

  return { state: S, canvas, jpeg, hang: () => hang(null), undo, redo, clear: clearAll, flood, art,
    /* draw programmatically (tests): DoodlePro.stroke('pen', [[x, y], ...], '#d6342c', 8) */
    stroke(tool, pts, col, size) {
      const o = { tool: S.tool, col: S.col, size: S.size }; S.tool = tool; if (col) S.col = col; if (size) S.size = size; snap();
      const g = ctx(); g.save(); g.lineCap = g.lineJoin = 'round'; g.strokeStyle = g.fillStyle = tool === 'eraser' ? '#fff' : S.col; g.lineWidth = tool === 'marker' ? S.size * 2 : S.size; g.globalAlpha = tool === 'marker' ? 0.5 : 1;
      if (tool === 'spray') pts.forEach(p => sprayAt(p[0], p[1]));
      else if (['line', 'rect', 'ellipse'].includes(tool)) shape(g, tool, pts[0][0], pts[0][1], pts[1][0], pts[1][1]);
      else { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke(); }
      g.restore(); Object.assign(S, o);
    } };
})();
