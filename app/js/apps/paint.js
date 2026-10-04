'use strict';
OS.apps.doodle = {
  desktop: true, order: 70, title: 'Doodle', emoji: '🎨', color: '#db2777', w: 440, x: 0.25, y: 0.12, cls: 'doodle',
  render(b) {
    const cv = h('canvas', { width: 800, height: 520 }), g = cv.getContext('2d'); let col = '#11151f', size = 6, down = false, lx = 0, ly = 0;
    g.fillStyle = '#fff'; g.fillRect(0, 0, 800, 520); g.lineCap = 'round'; g.lineJoin = 'round';
    const pos = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * 800 / r.width, (e.clientY - r.top) * 520 / r.height]; };
    cv.addEventListener('pointerdown', e => { down = true; [lx, ly] = pos(e); try { cv.setPointerCapture(e.pointerId); } catch (_) {} g.fillStyle = col; g.beginPath(); g.arc(lx, ly, size / 2, 0, 7); g.fill(); });
    cv.addEventListener('pointermove', e => { if (!down) return; const [x, y] = pos(e); g.strokeStyle = col; g.lineWidth = size; g.beginPath(); g.moveTo(lx, ly); g.lineTo(x, y); g.stroke(); lx = x; ly = y; });
    cv.addEventListener('pointerup', () => { down = false; }); cv.addEventListener('pointercancel', () => { down = false; });
    const cols = ['#11151f', '#d6342c', '#f59e0b', '#27c07a', '#3b82f6', '#a855f7', '#ffffff'];
    const pal = h('div', { class: 'pal' }, cols.map(c => h('button', { style: { background: c }, class: c === col ? 'on' : '', title: c, onclick: e => { col = c; $$('button', pal).forEach(x => x.classList.remove('on')); e.currentTarget.classList.add('on'); } })),
      h('input', { type: 'range', min: 2, max: 40, value: 6, style: { width: '6rem' }, title: 'Brush size', oninput: e => { size = +e.target.value; } }),
      h('button', { class: 'btn small', style: { width: 'auto', height: 'auto', borderRadius: '9px' }, onclick: () => { g.fillStyle = '#fff'; g.fillRect(0, 0, 800, 520); } }, 'Clear'));
    b.append(cv, pal);
  }
};
