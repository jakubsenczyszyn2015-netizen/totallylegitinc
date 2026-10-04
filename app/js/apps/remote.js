'use strict';
OS.apps.nosy = {
  desktop: true, order: 30, title: 'NosyViewer', emoji: '👁️', color: '#7c3aed', w: 400, x: 0.03, y: 0.42,
  render(b, w) { w.sel = -1; this.refresh(b, w); },
  refresh(b, w) {
    const c = Call.cur, on = c && c.remote && (Call.state === 'live' || Call.state === 'ended');
    if (!on) { w.sel = -1; b.replaceChildren(h('h3', {}, 'No computer connected'), h('p', { class: 'muted' }, 'Some schemes have a step where the caller lets you into their computer. Once they agree, their files show up here.')); return; }
    b.replaceChildren(h('h3', {}, c.caller.first + "'s computer"),
      h('div', { class: 'files' }, c.caller.files.map((f, i) => h('button', { class: w.sel === i ? 'on' : '', onclick: () => { w.sel = i; SFX.click(); this.refresh(b, w); } }, '📄 ' + f.n))),
      h('div', { class: 'filebody' }, w.sel >= 0 ? c.caller.files[w.sel].c : 'Click a file to open it.'));
  }
};
