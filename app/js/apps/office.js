'use strict';
OS.apps.settings = { desktop: true, order: 99, title: 'Settings', emoji: '⚙️', color: '#64748b', direct: () => UI.openSettings() };

OS.apps.payroll = {
  desktop: true, order: 50, title: 'Payroll', emoji: '📊', color: '#0d8a52', w: 340, x: 0.05, y: 0.3,
  render(b, w) { this.refresh(b, w); },
  refresh(b) {
    const rows = Game.roster();
    b.replaceChildren(
      h('table', { class: 'pay' }, h('tr', {}, h('th', {}, 'Agent'), h('th', {}, G.mode === 'week' ? 'Today' : 'This shift')), rows.map(p => h('tr', {}, h('td', {}, p.name + (p.me ? ' (you)' : '')), h('td', {}, money(p.personal))))),
      h('p', {}, h('b', {}, G.mode === 'week' ? 'Team ' + money(G.team) + ' of ' + money(G.quota) + ' quota' : 'Team total ' + money(G.team))),
      h('p', { class: 'muted' }, 'Calls taken: ' + G.stats.calls + '.  Scams closed: ' + G.stats.scams + '.  Times baited: ' + G.stats.baited + '.'),
      G.mode === 'week' ? h('p', { class: 'muted' }, 'Banked across the whole run: ' + money(G.bank)) : null);
  }
};

OS.apps.memo = {
  desktop: true, order: 60, title: 'Memo from the Boss', emoji: '✉️', color: '#b45309', w: 400, x: 0.04, y: 0.06,
  render(b) {
    const un = Game.unlocked(), fresh = G.mode === 'week' ? un.filter(s => s.unlock === Math.min(G.day, 5)) : [];
    if (G.mode === 'week') {
      b.append(h('h3', {}, DAYS[(G.day - 1) % 5] + ', week ' + Math.ceil(G.day / 5)),
        h('p', {}, 'Team quota today: ', h('b', {}, money(G.quota)), '. Hit it before the performance review or you are all fired.'),
        fresh.length && G.day <= 5 ? h('p', {}, (G.day === 1 ? 'Your schemes: ' : 'New today: '), h('b', {}, fresh.map(s => s.emoji + ' ' + s.name).join(', ')), '.') : null,
        G.day >= 2 ? h('p', {}, 'Scambaiters have found our number. If a caller is suspiciously keen, hang up.') : h('p', {}, 'Answer the phone, pick a scheme, follow its checklist. The Playbook has tips.'),
        G.day >= 3 ? h('p', {}, 'Some schemes now need the caller\'s PIN. Get them to open NosyViewer, then snoop through their files.') : null);
    } else {
      b.append(h('h3', {}, 'Overtime'), h('p', {}, 'No quota. No review. The phones never stop.'), h('p', {}, 'New schemes unlock as the team total grows. You have ', h('b', {}, un.length + ' of ' + SCHEMES.length), ' so far.'));
    }
    b.append(h('p', { class: 'muted' }, AI.available() ? 'AI callers are on. Say anything you like.' : 'No AI key set, so callers use the built-in caller brain. Each personality wants something different: listen to them. Add a key in Settings for fully open-ended conversations.'),
      h('p', { class: 'muted', style: { textAlign: 'right' } }, '— Management'));
  }
};
