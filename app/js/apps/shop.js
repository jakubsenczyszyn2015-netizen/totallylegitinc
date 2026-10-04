'use strict';
OS.apps.shop = {
  desktop: true, order: 40, title: 'Upgrades', emoji: '🛒', color: '#9333ea', w: 400, h: 540, x: 0.03, y: 0.04,
  render(b, w) { this.refresh(b, w); },
  refresh(b) {
    b.replaceChildren(
      h('div', { class: 'reward' }, h('span', {}, 'Your wallet'), h('b', {}, money(G.wallet))),
      h('p', { class: 'muted' }, 'You keep half of every scam you close. Spend it here. Upgrades are yours alone and are saved with your progress.'),
      ...UPGRADES.map(u => {
        const lv = Game.lvl(u.id), cost = u.cost * (lv + 1), maxed = lv >= u.max;
        return h('div', { class: 'upg' }, h('i', {}, u.emoji),
          h('div', { class: 'grow' }, h('b', {}, u.name + '  '), h('span', { class: 'pips' }, '●'.repeat(lv) + '○'.repeat(u.max - lv)), h('p', { class: 'muted' }, u.desc)),
          h('button', { class: 'btn small good', disabled: maxed || G.wallet < cost, onclick: () => Game.buy(u.id) }, maxed ? 'Maxed' : money(cost)));
      }));
  }
};
