'use strict';
/* OFFICE apps: Settings, Payroll, Memo from the Boss (LegitOS look, styles in css/os.css) */
OS.apps.settings = { desktop: true, order: 99, title: 'Settings', emoji: '⚙️', icon: 'gear', color: '#5f6b7d', direct: () => UI.openSettings() };

OS.apps.payroll = {
  desktop: true, order: 50, title: 'Payroll', emoji: '📊', icon: 'chart', color: '#0d8a52', w: 360, x: 0.05, y: 0.3, cls: 'payroll',
  render(b, w) { this.refresh(b, w); },
  refresh(b) {
    const rows = Game.roster(), week = G.mode === 'week', top = Math.max(1, ...rows.map(p => p.personal));
    const pct = week ? clamp(G.team / Math.max(1, G.quota), 0, 1) : 0;
    const stat = (g, col, label, v) => h('div', { class: 'pay-stat' }, h('i', { class: 'ti', style: { background: col }, html: OS.glyph(g) }), h('b', {}, v), h('small', {}, label));
    b.replaceChildren(
      h('div', { class: 'pay-hero' },
        h('div', { class: 'pay-lab' }, week ? 'Team today' : 'Team total'), h('div', { class: 'pay-big' }, money(G.team)),
        week ? h('div', { class: 'pay-of' }, 'of ' + money(G.quota) + ' quota') : null,
        week ? h('div', { class: 'pay-bar' }, h('i', { style: { width: (pct * 100).toFixed(1) + '%' } })) : null,
        week ? h('div', { class: 'pay-note' }, pct >= 1 ? 'Quota hit. The Boss is almost smiling.' : money(G.quota - G.team) + ' to go before the review') : h('div', { class: 'pay-note' }, 'No quota. Just vibes and invoices.')),
      h('div', { class: 'pay-list' }, rows.map((p, i) => h('div', { class: 'pay-row' + (p.me ? ' me' : '') },
        h('span', { class: 'pay-rank' }, '#' + (i + 1)),
        h('span', { class: 'pay-av', style: { background: p.me ? settings.color : SHIRTS[hashStr(p.name) % SHIRTS.length] } }, (p.name || '?').trim().charAt(0).toUpperCase() || '?'),
        h('div', { class: 'pay-who' }, h('b', {}, p.name + (p.me ? ' (you)' : '')), h('div', { class: 'pay-mini' }, h('i', { style: { width: (Math.max(0, p.personal) / top * 100).toFixed(1) + '%' } }))),
        h('span', { class: 'pay-amt' }, money(p.personal))))),
      h('div', { class: 'pay-stats' }, stat('phone', '#2f7cf6', 'Calls', G.stats.calls), stat('check', '#1fa463', 'Scams', G.stats.scams), stat('warning', '#e5383b', 'Baited', G.stats.baited)),
      week ? h('p', { class: 'muted' }, 'Banked across the whole run: ' + money(G.bank)) : null);
  }
};

/* the Boss's mugshot for the memo header (our own cartoon) */
const OS_BOSS_FACE = '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><rect width="64" height="64" fill="#cfe0f0"/>'
  + '<path d="M10 66 Q12 48 32 48 Q52 48 54 66Z" fill="#2c3445" stroke="#11151f" stroke-width="2.5"/><path d="M28 48 L32 62 L36 48Z" fill="#d6342c" stroke="#11151f" stroke-width="2"/>'
  + '<ellipse cx="32" cy="30" rx="16" ry="18" fill="#e0a97e" stroke="#11151f" stroke-width="2.5"/>'
  + '<path d="M17 24 Q20 10 34 12 Q44 13 47 22 Q38 16 28 19 Q22 20 17 24Z" fill="#6b5a4a" stroke="#11151f" stroke-width="2"/>'
  + '<path d="M21 26 L29 29M43 26 L35 29" stroke="#11151f" stroke-width="3" stroke-linecap="round"/><circle cx="26" cy="32" r="2.2" fill="#11151f"/><circle cx="38" cy="32" r="2.2" fill="#11151f"/>'
  + '<path d="M22 40 Q32 35 42 40 Q32 43 22 40Z" fill="#6b5a4a" stroke="#11151f" stroke-width="1.8"/><path d="M27 44 Q32 42 37 44" fill="none" stroke="#11151f" stroke-width="2" stroke-linecap="round"/></svg>';

OS.apps.memo = {
  desktop: true, order: 60, title: 'Memo from the Boss', emoji: '✉️', icon: 'envelope', color: '#c2410c', w: 380, x: 0.03, y: 0.06, cls: 'memo',
  render(b) {
    const un = Game.unlocked(), week = G.mode === 'week', fresh = week ? un.filter(s => s.unlock === Math.min(G.day, 5)) : [];
    const day = week ? DAYS[(G.day - 1) % 5] : 'Overtime';
    const chip = s => h('span', { class: 'memo-chip', title: s.pitch, onclick: () => OS.launch('sch_' + s.id) }, OS.tile(OS.apps['sch_' + s.id] || s, 'ti'), s.name, h('em', {}, money(s.reward)));
    const body = week ? [
      h('p', {}, 'Team quota today: ', h('b', {}, money(G.quota)), '. Hit it before the performance review or you are all fired.'),
      fresh.length && G.day <= 5 ? h('div', {}, h('div', { class: 'memo-lab' }, G.day === 1 ? 'Your schemes' : 'New today'), h('div', { class: 'memo-chips' }, fresh.map(chip))) : null,
      G.day >= 2 ? h('p', {}, 'Scambaiters have found our number. If a caller is suspiciously keen, hang up.') : h('p', {}, 'Answer the phone, pick a scheme, follow its checklist. The Playbook has tips.'),
      G.day >= 3 ? h('p', {}, 'Some schemes now need the caller\'s PIN. Get them to open NosyViewer, then snoop through their files.') : null
    ] : [
      h('p', {}, 'No quota. No review. The phones never stop.'),
      h('p', {}, 'New schemes unlock as the team total grows. You have ', h('b', {}, un.length + ' of ' + SCHEMES.length), ' so far.')
    ];
    b.replaceChildren(
      h('div', { class: 'memo-head' }, h('div', { class: 'memo-av', html: OS_BOSS_FACE }),
        h('div', { class: 'memo-meta' }, h('div', {}, h('b', {}, 'The Boss'), h('span', { class: 'memo-to' }, '  to All agents')),
          h('div', { class: 'memo-subj' }, week ? day + ': today\'s quota is ' + money(G.quota) : 'Overtime: no quota, no mercy')),
        h('div', { class: 'memo-date' }, OS.clock()[1])),
      h('div', { class: 'memo-body' }, h('div', { class: 'memo-stamp' }, 'URGENT'), body, h('div', { class: 'memo-sign' }, '— The Boss'), h('div', { class: 'memo-role' }, 'Regional Overlord, Totally Legit Inc.')),
      h('div', { class: 'memo-ps' }, AI.available() ? 'P.S. AI callers are on. Say anything you like.' : 'P.S. No AI key set, so callers use the built-in caller brain. Each personality wants something different: listen to them. Add a key in Settings for fully open-ended conversations.'));
  }
};
