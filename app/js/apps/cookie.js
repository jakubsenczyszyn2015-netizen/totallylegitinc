'use strict';
OS.apps.clips = {
  desktop: true, order: 80, title: 'Paperclip Empire', emoji: '📎', color: '#0891b2', w: 300, x: 0.72, y: 0.5,
  render(b, w) {
    const out = h('h3', { style: { textAlign: 'center' } }), sub = h('p', { class: 'muted', style: { textAlign: 'center' } }), buy = h('button', { class: 'btn small' });
    const upd = () => { const cost = Math.round(25 * Math.pow(1.5, G.clipBots)); out.textContent = Math.floor(G.clips).toLocaleString('en-US') + ' paperclips'; sub.textContent = G.clipBots + ' interns bending wire (' + G.clipBots + ' per second)'; buy.textContent = 'Hire an intern (' + cost + ' clips)'; buy.disabled = G.clips < cost; };
    buy.onclick = () => { const cost = Math.round(25 * Math.pow(1.5, G.clipBots)); if (G.clips >= cost) { G.clips -= cost; G.clipBots++; SFX.step(); upd(); } };
    b.append(out, h('button', { class: 'clip', title: 'Make a paperclip', onclick: () => { G.clips++; SFX.click(); upd(); } }, '📎'), sub, buy, h('p', { class: 'muted' }, 'This earns no money. The boss can tell.'));
    w.timer = setInterval(upd, 500); upd();
  },
  onClose(w) { clearInterval(w.timer); }
};
