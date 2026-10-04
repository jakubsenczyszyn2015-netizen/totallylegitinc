'use strict';
OS.apps.playbook = {
  desktop: true, order: 20, title: 'Playbook', emoji: '📒', color: '#2563eb', w: 420, h: 520, x: 0.02, y: 0.05,
  render(b) {
    b.append(h('h3', {}, 'How a call works'),
      h('p', {}, 'Answer the phone, pick a scheme, then lie your way through each step on its checklist. Steps only count when their trust is high enough.'),
      h('p', {}, 'Charm, confidence and using their name raise trust. Rudeness and pushing too fast lower it. At zero they hang up.'),
      h('p', {}, 'Finish with trust at 80% or more for a 20% bonus.'),
      h('p', { class: 'muted' }, 'Watch out for scambaiters. If a caller seems far too keen and keeps asking you to repeat things, hang up before the last step.'),
      h('h3', {}, 'Your schemes'),
      ...Game.unlocked().map(s => h('div', {}, h('p', {}, h('b', {}, s.emoji + ' ' + s.name + ' — ' + money(s.reward))), h('p', { class: 'muted' }, s.pitch), h('ul', { style: { margin: '.2rem 0 .5rem', paddingLeft: '1.1rem' } }, s.tips.map(t => h('li', {}, t))))));
  }
};

function schemeApp(s) {
  return {
    title: s.name, emoji: s.emoji, color: s.color, w: 360, x: 0.66, y: 0.03, scheme: s,
    render(b, w) { this.refresh(b, w); },
    refresh(b) {
      const c = Call.cur, live = Call.state === 'live', mine = c && c.scheme === s, next = mine ? c.steps.indexOf(false) : -1;
      const kids = [
        h('div', { class: 'sch-head' }, h('i', { style: { background: s.color } }, s.emoji), h('div', {}, h('h3', {}, s.name), h('p', { class: 'muted' }, s.pitch))),
        h('div', { class: 'reward' }, h('span', {}, 'Reward'), h('b', {}, money(s.reward)))
      ];
      if (mine && Call.state === 'ended' && c.result === 'paid') kids.push(h('div', { class: 'banner' }, 'Scam complete — ' + money(c.paid) + ' earned.'));
      if (mine && Call.state === 'ended' && c.result === 'baited') kids.push(h('div', { class: 'banner bad' }, 'That was a scambaiter. You got played.'));
      kids.push(h('ol', { class: 'steps' }, s.steps.map((st, i) => h('li', { class: (mine && c.steps[i] ? 'done' : '') + (mine && i === next && live ? ' cur' : '') }, h('span', { class: 'n' }, mine && c.steps[i] ? '✓' : i + 1), h('span', {}, st.t)))));
      if (mine && live && next >= 0 && s.steps[next].form) {
        const st = s.steps[next], vals = {}; b.querySelectorAll('input.entry').forEach(i => { vals[i.dataset.f] = i.value; });
        const submit = () => { const v = {}; b.querySelectorAll('input.entry').forEach(i => { v[i.dataset.f] = i.value; }); Call.submitForm(v); };
        kids.push(h('div', { class: 'formbox' }, st.form.map(f => {
          const ok = !!c.formOk[f.f], inp = h('input', { class: 'inp entry', type: 'text', maxLength: f.len, placeholder: f.ph, autocomplete: 'off', value: ok ? c.caller[f.f] : (vals[f.f] || ''), disabled: ok, onkeydown: e => { if (e.key === 'Enter') submit(); } });
          inp.dataset.f = f.f; return h('label', {}, f.label + (ok ? '  ✓' : ''), inp);
        }), h('button', { class: 'btn small good', onclick: submit }, st.btn || 'Submit details')),
          h('p', { class: 'muted' }, 'Ask for each detail, then type in what they read out.'));
      } else if (mine && live && next >= 0 && s.steps[next].pin) {
        const st = s.steps[next], old = b.querySelector('input.entry'), keep = old && old.dataset.step === String(next) ? old.value : '';
        const inp = h('input', { class: 'inp entry', type: 'text', maxLength: st.len || 4, placeholder: st.ph || '4-digit PIN', value: keep, onkeydown: e => { if (e.key === 'Enter') Call.submitPin(inp.value); } });
        inp.dataset.step = next;
        kids.push(h('div', { class: 'row' }, h('div', { class: 'grow' }, inp), h('button', { class: 'btn small good', onclick: () => Call.submitPin(inp.value) }, st.field ? 'Submit' : 'Submit PIN')),
          h('p', { class: 'muted' }, st.field ? 'Ask them to read it out, then type it in here.' : 'Open NosyViewer and look through their files.'));
      }
      let label = 'No caller on the line', dis = true;
      if (live && !c.scheme) { label = 'Run this on ' + c.caller.first; dis = false; }
      else if (live && mine) { label = 'Running this now'; }
      else if (live && !c.steps.some(Boolean)) { label = 'Switch to this'; dis = false; }
      else if (live) { label = 'Already running ' + c.scheme.name; }
      kids.push(h('button', { class: 'btn primary', disabled: dis, onclick: () => Call.setScheme(s.id) }, label));
      kids.push(h('p', { class: 'muted' }, 'Tip: ' + s.tips.join(' ')));
      b.replaceChildren(...kids);
    }
  };
}
SCHEMES.forEach(s => { OS.apps['sch_' + s.id] = schemeApp(s); });
