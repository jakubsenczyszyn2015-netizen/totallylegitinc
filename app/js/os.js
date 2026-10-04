'use strict';
/* =====================================================================
   DESKTOP OS — the computer you sit at
   ===================================================================== */
const WALLPAPER = '<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'
  + '<defs><linearGradient id="wsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff8a5c"/><stop offset=".55" stop-color="#ffd27a"/><stop offset="1" stop-color="#ffe9b0"/></linearGradient></defs>'
  + '<rect width="1600" height="900" fill="url(#wsky)"/><circle cx="1180" cy="430" r="120" fill="#fff3c4"/>'
  + '<path d="M0 560 Q200 470 420 540 T860 520 T1300 500 T1600 540 V900 H0Z" fill="#e58a5a"/>'
  + '<path d="M0 650 Q260 560 520 640 T1040 620 T1600 600 V900 H0Z" fill="#c9684f"/>'
  + '<path d="M0 760 Q300 680 640 750 T1280 730 T1600 760 V900 H0Z" fill="#8f4a52"/>'
  + '<g transform="translate(980 230)"><ellipse rx="46" ry="56" fill="#d6342c" stroke="#0f131d" stroke-width="5"/><path d="M-22 50 L-10 84 H10 L22 50" fill="none" stroke="#0f131d" stroke-width="4"/><rect x="-12" y="84" width="24" height="18" rx="3" fill="#f0dfa8" stroke="#0f131d" stroke-width="4"/></g></svg>';

const OS = {
  open: false, wins: new Map(), z: 20, apps: {}, popups: 0, popN: 0, memoDay: -1,

  build() {
    const el = $('#os');
    el.append(
      h('div', { id: 'os-wall', html: WALLPAPER }),
      h('div', { id: 'os-icons' }),
      h('div', { id: 'os-wins' }),
      h('div', { id: 'os-fx' }),
      h('div', { id: 'powermenu', class: 'hidden' },
        h('button', { class: 'btn small', onclick: () => { OS.power(false); standUp(); } }, 'Stand up'),
        h('button', { class: 'btn small', onclick: () => { OS.power(false); UI.openSettings(); } }, 'Settings'),
        h('button', { class: 'btn small danger', onclick: () => { OS.power(false); Game.confirmQuit(); } }, 'Quit to main menu')),
      h('div', { id: 'taskbar' },
        h('button', { id: 'tb-power', class: 'tbtn', title: 'Stand up, settings, quit', onclick: () => OS.power() }, '⏻'),
        h('div', { id: 'tb-run' }),
        h('div', { id: 'tb-stats' }),
        h('div', { id: 'tb-clock' }))
    );
    el.addEventListener('pointerdown', e => { if (!e.target.closest('#powermenu') && !e.target.closest('#tb-power')) OS.power(false); });
  },
  power(on) { const m = $('#powermenu'); m.classList.toggle('hidden', on === undefined ? !m.classList.contains('hidden') : !on); },

  show() {
    this.open = true; $('#os').classList.remove('hidden'); $('#hud').classList.add('hidden');
    this.buildIcons(); this.taskbar(); this.stats();
    if (!this.wins.has('phone')) this.launch('phone', true);
    if (this.memoDay !== G.day + '|' + G.mode && G.phase !== 'lobby') { this.memoDay = G.day + '|' + G.mode; this.close('memo'); this.launch('memo', true); }
    this.refresh();
  },
  hide() { this.open = false; $('#os').classList.add('hidden'); if (G.phase !== 'menu') $('#hud').classList.remove('hidden'); this.power(false); },
  reset() { for (const id of [...this.wins.keys()]) this.close(id); $$('#os-wins .popup').forEach(p => p.remove()); this.popups = 0; this.memoDay = -1; $('#os-fx').replaceChildren(); },

  buildIcons() {
    /* every app with desktop: true shows an icon, ordered by `order`, unless its available() says no */
    const ids = Object.keys(this.apps).filter(id => { const d = this.apps[id]; return d.desktop && (!d.available || d.available()); })
      .sort((a, b) => (this.apps[a].order || 50) - (this.apps[b].order || 50))
      .concat(Game.unlocked().map(s => 'sch_' + s.id));
    $('#os-icons').replaceChildren(...ids.map(id => {
      const d = this.apps[id];
      return h('button', { class: 'icon', onclick: () => this.launch(id) }, h('i', { style: { background: d.color } }, d.emoji), d.title);
    }));
  },

  launch(id, quiet) {
    if (!quiet) SFX.open();
    const def = this.apps[id]; if (!def) return null;
    if (def.direct) { def.direct(); return null; }
    let w = this.wins.get(id);
    if (w) { w.el.classList.remove('min'); this.focus(w); this.taskbar(); return w; }
    const el = h('div', { class: 'win ' + (def.cls || ''), style: { width: def.w + 'px', height: def.h ? def.h + 'px' : 'auto' } });
    const tb = h('div', { class: 'tb', style: { background: def.color } },
      h('span', {}, def.emoji), h('span', { class: 't' }, def.title),
      h('button', { title: 'Minimise', onclick: e => { e.stopPropagation(); el.classList.add('min'); this.taskbar(); } }, '–'),
      h('button', { class: 'x', title: 'Close', onclick: e => { e.stopPropagation(); this.close(id); } }, '×'));
    const body = h('div', { class: 'wb' }); el.append(tb, body); $('#os-wins').append(el);
    w = { id, el, body, def }; this.wins.set(id, w);
    const area = $('#os-wins').getBoundingClientRect(), n = this.wins.size;
    const x = def.x != null ? def.x * area.width : 110 + ((n * 36) % 280), y = def.y != null ? def.y * area.height : 24 + ((n * 30) % 170);
    el.style.left = clamp(x, 4, Math.max(4, area.width - def.w - 4)) + 'px';
    el.style.top = clamp(y, 4, Math.max(4, area.height - (def.h || 320) - 4)) + 'px';
    this.drag(w, tb); el.addEventListener('pointerdown', () => this.focus(w));
    def.render(body, w); this.focus(w); this.taskbar(); return w;
  },
  close(id) { const w = this.wins.get(id); if (!w) return; if (w.def.onClose) w.def.onClose(w); w.el.remove(); this.wins.delete(id); this.taskbar(); },
  focus(w) { w.el.style.zIndex = ++this.z; },
  drag(w, tb) {
    let sx, sy, ox, oy, on = false;
    tb.addEventListener('pointerdown', e => { if (e.target.tagName === 'BUTTON') return; on = true; sx = e.clientX; sy = e.clientY; ox = w.el.offsetLeft; oy = w.el.offsetTop; try { tb.setPointerCapture(e.pointerId); } catch (_) {} });
    tb.addEventListener('pointermove', e => {
      if (!on) return; const area = $('#os-wins').getBoundingClientRect();
      w.el.style.left = clamp(ox + e.clientX - sx, -w.el.offsetWidth + 90, area.width - 70) + 'px';
      w.el.style.top = clamp(oy + e.clientY - sy, 0, area.height - 40) + 'px';
    });
    const end = () => { on = false; }; tb.addEventListener('pointerup', end); tb.addEventListener('pointercancel', end);
  },
  /* re-render the contents of every open window that depends on the call */
  refresh() { if (!this.open) return; for (const w of this.wins.values()) if (w.def.refresh) w.def.refresh(w.body, w); this.taskbar(); },

  taskbar() {
    const run = $('#tb-run'); if (!run) return;
    const pinned = ['phone', 'playbook', 'nosy'], ids = pinned.concat([...this.wins.keys()].filter(i => !pinned.includes(i)));
    run.replaceChildren(...ids.map(id => {
      const d = this.apps[id], w = this.wins.get(id);
      return h('button', { class: 'tbtn' + (w ? ' open' : '') + (id === 'phone' && Call.state === 'ringing' ? ' alert' : ''), title: d.title, style: { background: d.color },
        onclick: () => { if (w && !w.el.classList.contains('min') && +w.el.style.zIndex === this.z) { w.el.classList.add('min'); this.taskbar(); } else this.launch(id); } }, d.emoji);
    }));
  },
  stats() {
    const s = $('#tb-stats'); if (!s) return;
    if (G.mode === 'week') {
      s.innerHTML = '<span class="g">Personal ' + money(G.personal) + '</span> &nbsp;<span class="q">Wallet ' + money(G.wallet) + '</span><br><span class="g">Team ' + money(G.team) + '</span> / <span class="q">Quota ' + money(G.quota) + '</span><br>'
        + (G.phase === 'day' ? '<span class="r">Performance review ' + fmtTime(G.timeLeft) + '</span>' : G.phase === 'lobby' ? '<span class="q">Shift not started</span>' : '<span class="r">Review time</span>');
    } else {
      s.innerHTML = '<span class="g">Personal ' + money(G.personal) + '</span> &nbsp;<span class="q">Wallet ' + money(G.wallet) + '</span><br><span class="g">Team total ' + money(G.team) + '</span><br><span class="q">' + (G.phase === 'lobby' ? 'Shift not started' : 'Endless shift') + '</span>';
    }
    let clock;
    if (G.mode === 'week') { const f = clamp(1 - G.timeLeft / G.dayLen, 0, 1), mins = Math.floor(9 * 60 + f * 8 * 60), hr = Math.floor(mins / 60), m = mins % 60; clock = ((hr + 11) % 12 + 1) + ':' + String(m).padStart(2, '0') + (hr >= 12 ? ' PM' : ' AM'); }
    else { const d = new Date(); clock = d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0'); }
    $('#tb-clock').innerHTML = clock + '<br>' + (G.mode === 'week' ? DAYS[(G.day - 1) % 5].slice(0, 3) + ', week ' + Math.ceil(G.day / 5) : 'Overtime');
  },

  cashFx(text, bad) { const e = h('div', { class: 'cashfx' + (bad ? ' bad' : '') }, text); $('#os-fx').append(e); setTimeout(() => e.remove(), 1800); },
  popup() {
    const M = [['You are the 1,000,000th employee!', 'Click OK to claim nothing.'], ['Your computer has 47 feelings', 'Remove feelings now?'], ['FREE desk upgrade', 'Your desk has been upgraded to: same desk.'],
      ['Hot staplers in your area', 'They want to meet you.'], ['Warning', 'A scambaiter is laughing at you.'], ['Download more quota', 'Estimated time: forever.'], ['Congratulations', 'You have won a virus.']];
    const m = pick(M), area = $('#os-wins').getBoundingClientRect();
    const closeIt = () => { if (!el.isConnected) return; el.remove(); this.popups--; SFX.click(); };
    const el = h('div', { class: 'win popup', style: { width: '250px', left: rand(10, Math.max(20, area.width - 270)) + 'px', top: rand(10, Math.max(20, area.height - 190)) + 'px', zIndex: 8000 + (++this.popN) } },
      h('div', { class: 'tb', style: { background: '#d6342c' } }, h('span', { class: 't' }, '⚠ Totally real alert'), h('button', { class: 'x', onclick: closeIt }, '×')),
      h('div', { class: 'wb' }, h('b', {}, m[0]), h('span', {}, m[1]), h('button', { class: 'btn small', onclick: () => { closeIt(); if (Math.random() < 0.3) this.popup(); } }, 'OK')));
    $('#os-wins').append(el); this.popups++; SFX.popup();
  },
  virus(n) { for (let i = 0; i < n; i++) setTimeout(() => { if (G.phase !== 'menu') this.popup(); }, i * 170); }
};
