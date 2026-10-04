'use strict';
/* =====================================================================
   SCHEME APPS — one window per scheme ('sch_<id>'): seal header, brand card,
   reward, numbered checklist, verification form / PIN entry. Plus the
   Playbook. API reference: docs/modules/phone.md
   ===================================================================== */
OS.glyphs.paw = '<ellipse cx="12" cy="16.2" rx="5.6" ry="4.7"/><circle cx="5.4" cy="10.6" r="2.3"/><circle cx="9.3" cy="6.3" r="2.4"/><circle cx="14.7" cy="6.3" r="2.4"/><circle cx="18.6" cy="10.6" r="2.3"/>';

/* round official-looking seal with the scheme's glyph */
function sealSVG(s) {
  const dots = Array.from({ length: 18 }, (_, i) => { const a = i / 18 * Math.PI * 2; return `<circle cx="${(32 + Math.cos(a) * 26.6).toFixed(1)}" cy="${(32 + Math.sin(a) * 26.6).toFixed(1)}" r="1.25" fill="#fff"/>`; }).join('');
  return `<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="30.5" fill="#fff"/><circle cx="32" cy="32" r="29" fill="${PT.mix(s.color, '#000', 0.25)}"/>${dots}`
    + `<circle cx="32" cy="32" r="23.5" fill="#fff"/><circle cx="32" cy="32" r="21" fill="${s.color}"/><circle cx="32" cy="32" r="21" fill="none" stroke="#fff" stroke-width="1" stroke-dasharray="2 2" opacity=".55"/>`
    + `<g transform="translate(19.5 19.5) scale(1.04)" fill="#fff" stroke="#fff">${OS.glyphs[s.icon] || OS.glyphs.star}</g></svg>`;
}
/* the little picture on the brand card */
function schemeArt(s) {
  const lt = PT.mix(s.color, '#fff', 0.35), dk = PT.mix(s.color, '#000', 0.35);
  const card = (fill, extra) => `<svg viewBox="0 0 84 56"><g transform="rotate(-8 42 28)"><rect x="8" y="8" width="68" height="42" rx="6" fill="${fill}" stroke="${dk}" stroke-width="2"/>${extra}</g></svg>`;
  switch (s.art) {
    case 'card': return card(lt, `<rect x="16" y="20" width="13" height="10" rx="2" fill="#ffd56b" stroke="${dk}" stroke-width="1.2"/><path d="M16 38h10M30 38h10M44 38h10M58 38h8" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/><circle cx="62" cy="20" r="5" fill="#ff8a65" opacity=".9"/><circle cx="68" cy="20" r="5" fill="#ffd56b" opacity=".9"/>`);
    case 'gift': return card(lt, `<path d="M8 29h68M40 8v42" stroke="#ffd56b" stroke-width="5"/><path d="M40 29c-6-10-16-10-14-3 1 3 8 3 14 3zm0 0c6-10 16-10 14-3-1 3-8 3-14 3z" fill="#ffd56b" stroke="${dk}" stroke-width="1.4"/>`);
    case 'id': return card('#f4f1e8', `<rect x="15" y="16" width="18" height="22" rx="2" fill="${lt}"/><circle cx="24" cy="24" r="4.6" fill="#fff"/><path d="M17 37c1-5 4-7 7-7s6 2 7 7z" fill="#fff"/><path d="M39 19h28M39 26h22M39 33h26M15 44h52" stroke="#9aa3b0" stroke-width="2.4" stroke-linecap="round"/><rect x="8" y="8" width="68" height="6" fill="${s.color}"/>`);
    case 'login': return card('#f4f6fa', `<rect x="8" y="8" width="68" height="8" fill="${s.color}"/><rect x="16" y="22" width="52" height="8" rx="2" fill="#fff" stroke="#b9c2cf" stroke-width="1.4"/><rect x="16" y="34" width="52" height="8" rx="2" fill="#fff" stroke="#b9c2cf" stroke-width="1.4"/><path d="M20 38h3M26 38h3M32 38h3M38 38h3M44 38h3" stroke="#3b4656" stroke-width="2.4" stroke-linecap="round"/>`);
    default: return `<svg viewBox="0 0 84 56"><circle cx="50" cy="28" r="23" fill="${lt}" opacity=".5"/><circle cx="50" cy="28" r="17" fill="#fff" opacity=".22"/><g transform="translate(36 14) scale(1.17)" fill="#fff" stroke="#fff">${OS.glyphs[s.icon] || ''}</g></svg>`;
  }
}
/* mask a verified value: keep separators and the last two characters */
const schMask = v => { const s = String(v); let keep = 2; return s.split('').reverse().map(ch => /[a-z0-9]/i.test(ch) ? (keep-- > 0 ? ch : '•') : ch).reverse().join(''); };

function schemeApp(s) {
  return {
    title: s.name, emoji: s.emoji, icon: s.icon, color: s.color, w: 420, x: 0.655, y: 0.02, cls: 'scheme', scheme: s,
    render(b, w) { w.vals = {}; w.sig = ''; this.refresh(b, w, true); },
    refresh(b, w, force) {
      const c = Call.cur, st = Call.state, live = st === 'live', mine = !!(c && c.scheme === s), next = mine ? c.steps.indexOf(false) : -1;
      const sig = [st, c ? c.caller.seed : 0, mine, next, mine ? c.steps.join() : '', mine ? Object.keys(c.formOk || {}).join() + '|' + Object.keys(c.formBad || {}).join() : '', mine && c.codeGiven, mine && c.remote, c && c.result, c && c.paid, c && c.scheme ? c.scheme.id : ''].join(';');
      if (!force && sig === w.sig) return;
      w.sig = sig;
      /* keep what is being typed (and the caret) across rebuilds */
      const act = document.activeElement, focusF = act && b.contains(act) && act.dataset ? act.dataset.f : null, caret = focusF ? act.selectionStart : 0;
      const done = mine ? c.steps.filter(Boolean).length : 0, paid = mine && st === 'ended' && c.result === 'paid';
      const kids = [
        h('div', { class: 'sx-head', style: { borderBottomColor: s.color } },
          h('div', { class: 'sx-seal', style: { background: s.color }, html: sealSVG(s) }),
          h('div', { class: 'sx-ht' }, h('h3', {}, s.name), h('p', {}, s.pitch))),
        h('div', { class: 'sx-brand', style: { background: `linear-gradient(135deg,${s.color},${PT.mix(s.color, '#000', 0.3)})` } },
          h('div', {}, h('small', {}, s.brand || 'TOTALLY LEGIT INC.'), h('b', {}, s.name)), h('div', { class: 'sx-art', html: schemeArt(s) })),
        h('div', { class: 'sx-reward' }, h('span', {}, 'Reward: ', h('b', {}, money(s.reward))), h('span', { class: 'sx-pill' + (paid ? ' ok' : '') }, done + ' / ' + s.steps.length + ' done'))
      ];
      if (mine && st === 'ended' && c.result === 'baited') kids.push(h('div', { class: 'sx-banner bad' }, 'That was a scambaiter. You got played.'));
      else if (paid && !s.steps.some(x => x.form)) kids.push(h('div', { class: 'sx-banner ok' }, 'Scam complete — ' + money(c.paid) + ' earned.'));
      kids.push(h('ol', { class: 'sx-steps' }, s.steps.map((x, i) => {
        const ok = mine && c.steps[i], cur = mine && i === next && live;
        return h('li', { class: (ok ? 'done' : '') + (cur ? ' cur' : '') }, h('span', { class: 'n', style: cur ? { background: s.color } : null, html: ok ? OS.glyph('check') : String(i + 1) }), h('span', { class: 't' }, x.t));
      })));
      /* verification form */
      const fi = s.steps.findIndex(x => x.form);
      if (fi >= 0 && mine) {
        const fs = s.steps[fi], open = live && next === fi, nOk = fs.form.filter(f => c.formOk[f.f]).length;
        const banner = paid ? h('div', { class: 'sx-banner ok' }, 'Scam complete — ' + money(c.paid) + ' earned (' + nOk + ' / ' + fs.form.length + ' verified).')
          : open ? h('div', { class: 'sx-banner' }, 'Enter the information for ' + money(s.reward) + '.')
          : h('div', { class: 'sx-banner idle' }, next >= 0 && next < fi && live ? 'Finish the steps above first. Then the caller can read out their details.' : 'No details to enter right now.');
        const verify = f => {
          const inp = b.querySelector('input[data-f="' + f + '"]'); if (!inp) return; w.vals[f] = inp.value;
          if (Call.submitForm({ [f]: inp.value }).bad.length) { const el = b.querySelector('input[data-f="' + f + '"]'); if (el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); el.focus(); } }
        };
        kids.push(h('div', { class: 'sx-form', style: { borderLeftColor: s.color } }, banner, fs.form.map(f => {
          const ok = !!c.formOk[f.f], bad = !ok && c.formBad && c.formBad[f.f];
          const inp = h('input', { class: 'sx-inp' + (bad ? ' bad' : ''), type: 'text', maxLength: f.len + 4, placeholder: f.ph, autocomplete: 'off', spellcheck: false,
            value: ok ? schMask(c.caller[f.f]) : (w.vals[f.f] || ''), disabled: ok || !open, oninput: e => { w.vals[f.f] = e.target.value; }, onkeydown: e => { if (e.key === 'Enter') verify(f.f); } });
          inp.dataset.f = f.f;
          return h('div', { class: 'sx-field' + (ok ? ' ok' : '') },
            h('label', {}, f.label + ' (' + f.ph + ')'),
            h('div', { class: 'sx-frow' }, inp, h('button', { class: 'sx-btn', style: ok ? null : { background: PT.mix(s.color, '#0b1730', 0.45) }, disabled: ok || !open, onclick: () => verify(f.f) }, ok ? 'Verified' : 'Verify')),
            h('div', { class: 'sx-fst' + (bad ? ' bad' : '') }, ok ? 'Verified ✓' : bad ? 'Does not match. Ask them to read it again.' : open ? 'Ask for this, then type what they read out.' : ''));
        })));
      }
      /* NosyViewer + PIN steps */
      if (mine && live && next >= 0 && s.steps[next].remote) {
        kids.push(h('div', { class: 'sx-note', style: { borderLeftColor: s.color } }, h('i', { html: OS.glyph('eye') }),
          h('div', {}, h('b', {}, c.codeGiven ? 'Code received: ' + c.caller.first + ' read it out' : 'Get them to open NosyViewer'),
            h('span', {}, c.codeGiven ? 'Type the code into NosyViewer and press Connect.' : 'Once they open it, they read you a one-time connection code.')),
          h('button', { class: 'sx-btn small', onclick: () => OS.launch('nosy') }, 'NosyViewer')));
      } else if (mine && live && next >= 0 && s.steps[next].pin && !s.steps[next].form) {
        const x = s.steps[next], submit = () => { const inp = b.querySelector('input[data-f="pin"]'); w.vals.pin = inp.value; Call.submitPin(inp.value); };
        const inp = h('input', { class: 'sx-inp', type: 'text', maxLength: x.len || 6, placeholder: x.ph || '0000', autocomplete: 'off', value: w.vals.pin || '', oninput: e => { w.vals.pin = e.target.value; }, onkeydown: e => { if (e.key === 'Enter') submit(); } });
        inp.dataset.f = 'pin';
        kids.push(h('div', { class: 'sx-form', style: { borderLeftColor: s.color } }, h('div', { class: 'sx-banner' }, 'Enter the customer PIN for ' + money(s.reward) + '.'),
          h('div', { class: 'sx-field' }, h('label', {}, 'Customer PIN (0000)'),
            h('div', { class: 'sx-frow' }, inp, h('button', { class: 'sx-btn', style: { background: PT.mix(s.color, '#0b1730', 0.45) }, onclick: submit }, 'Submit')),
            h('div', { class: 'sx-fst' }, 'It is in one of their files. ', h('a', { href: '#', onclick: e => { e.preventDefault(); OS.launch('nosy'); } }, 'Open NosyViewer')))));
      }
      let label = 'No caller on the line', dis = true;
      if (live && !c.scheme) { label = 'Run this on ' + c.caller.first; dis = false; }
      else if (live && mine) label = 'Running on ' + c.caller.first;
      else if (live && !c.steps.some(Boolean)) { label = 'Switch to this scheme'; dis = false; }
      else if (live) label = 'Already running ' + c.scheme.name;
      else if (mine && st === 'ended') label = 'Call ended';
      kids.push(h('button', { class: 'sx-run' + (live && mine ? ' on' : ''), style: dis ? null : { background: s.color }, disabled: dis, onclick: () => Call.setScheme(s.id) }, label));
      kids.push(h('p', { class: 'sx-tip' }, h('b', {}, 'Tip: '), s.tips.join(' ')));
      b.replaceChildren(...kids);
      if (focusF) { const el = b.querySelector('input[data-f="' + focusF + '"]'); if (el && !el.disabled) { el.focus(); try { el.setSelectionRange(caret, caret); } catch (e) {} } }
    }
  };
}
SCHEMES.forEach(s => { OS.apps['sch_' + s.id] = schemeApp(s); });

OS.apps.playbook = {
  desktop: true, order: 20, title: 'Playbook', emoji: '📒', icon: 'book', color: '#2563eb', w: 420, h: 540, x: 0.02, y: 0.04, cls: 'playbook',
  render(b) {
    b.append(
      h('div', { class: 'pb-hero' }, h('b', {}, 'How a call works'),
        h('ol', {}, h('li', {}, 'Answer the phone and pick a scheme.'), h('li', {}, 'Talk the caller through each step of its checklist. Steps only count when their trust is high enough.'),
          h('li', {}, 'Form schemes: ask for each detail and verify what they read out. NosyViewer schemes: get their connection code, connect, then find their PIN.'))),
      h('p', {}, 'Charm, confidence and using their name raise trust. Rudeness and pushing too fast lower it. At zero they hang up. Finish at 80% trust or more for a 20% bonus.'),
      h('p', { class: 'muted' }, 'Every caller is different: listen to their personality. The Script app has suggested lines for every step.'),
      h('p', { class: 'muted' }, 'Watch out for scambaiters. If a caller seems far too keen and keeps asking you to repeat things, hang up before the last step.'),
      h('div', { class: 'pb-lab' }, 'Your schemes'),
      ...Game.unlocked().map(s => h('div', { class: 'pb-row', onclick: () => OS.launch('sch_' + s.id) },
        h('div', { class: 'pb-seal', html: sealSVG(s) }),
        h('div', { class: 'grow' }, h('b', {}, s.name), h('span', {}, s.pitch)), h('em', {}, money(s.reward)))));
  }
};
