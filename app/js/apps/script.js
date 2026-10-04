'use strict';
/* =====================================================================
   SCRIPT — the call-script notebook: who is on the line and what they like,
   suggested lines for every step of the running scheme (click a line to
   paste it into the Phone), and free notes + your own lines saved in
   G.prog.script. API reference: docs/modules/phone.md
   ===================================================================== */
const Script = {
  OPENERS: ['Hi {first}, my name is {agent}. How are you today?', 'Thanks for calling, {first}! What can I do for you?', 'Hello {first}, lovely to speak to you. I\'m {agent}.'],
  /* lines that play to each personality when trust is slipping */
  RECOVER: {
    sweet: ['Please don\'t worry, {first}. I\'m here to help you, I promise.', 'You\'re very kind to take the time, thank you so much.'],
    grumpy: ['Short version: I fix it, you get back to your show.', 'Straight to the point: two minutes and we\'re done.'],
    paranoid: ['This is official. Reference number 4471, Department 9.', 'I understand. I can give you my employee number: 55-210.'],
    busy: ['Bottom line: this protects your assets. Quick win.', 'High value, low effort. Let\'s leverage it.'],
    confused: ['It\'s simple. I fix it. You relax.', 'Don\'t worry, {first}. Easy peasy. One small thing.'],
    hype: ['This is AMAZING news, {first}! Seriously exciting!', 'Wow, you\'re going to love this. It\'s huge!'],
    auditor: ['Exactly three steps, four minutes, reference 5521. Sharp question, by the way.', 'Good point, {first}. You\'re clearly very thorough.'],
    dramatic: ['{first}, what a magnificent voice! Let me tell you a story.', 'Imagine it: the drama, the stakes! You\'re the star of this story.'],
    baiter: ['Sorry, I have to put you on hold. Forever.', 'Is anyone else listening to this call?']
  },
  TASTE_WORDS: { polite: 'manners', empathy: 'reassurance', name: 'hearing their name', compliment: 'compliments', urgency: 'urgency', authority: 'official stuff', jargon: 'business talk', excite: 'excitement', threat: 'threats', story: 'stories', detail: 'numbers and details', concise: 'short sentences', long: 'long speeches', simple: 'simple words' },
  st() { const s = G.prog.script = G.prog.script || {}; s.notes = s.notes || ''; s.mine = s.mine || []; return s; },
  fill(t) {
    const c = Call.cur && Call.cur.caller;
    return t.replace(/\{first\}/g, c ? c.first : 'there').replace(/\{agent\}/g, settings.name || 'Agent').replace(/\{pet\}/g, c ? c.pet.name : 'your pet');
  },
  use(t) { SFX.click(); Phone.paste(this.fill(t)); },
  line(t, cls) { return h('button', { class: 'sc-line ' + (cls || ''), title: 'Paste into the Phone', onclick: () => this.use(t) }, h('span', {}, '“' + this.fill(t) + '”'), h('i', { html: '<svg viewBox="0 0 24 24"><path d="M4 12h12M11 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>' })); },
  likes(c) {
    const t = TASTE[c.baiter ? 'baiter' : c.persona.id] || {}, ks = Object.keys(t).filter(k => this.TASTE_WORDS[k]);
    return { like: ks.filter(k => t[k] > 1).sort((a, b) => t[b] - t[a]).slice(0, 3).map(k => this.TASTE_WORDS[k]), hate: ks.filter(k => t[k] < -1).sort((a, b) => t[a] - t[b]).slice(0, 2).map(k => this.TASTE_WORDS[k]) };
  },
  save() { clearTimeout(this.saveT); this.saveT = setTimeout(() => Game.saveProgress(), 600); }
};

OS.apps.script = {
  desktop: true, order: 15, title: 'Script', emoji: '📜', icon: 'script', color: '#1c7ed6', w: 400, h: 560, x: 0.003, y: 0.02, cls: 'script',
  render(b, w) { w.tab = w.tab || 'lines'; w.prev = null; w.sig = ''; this.refresh(b, w, true); },
  refresh(b, w, force) {
    const c = Call.cur, st = Call.state, live = st === 'live', s = c && c.scheme ? c.scheme : (w.prev ? schemeById(w.prev) : null), mine = !!(c && c.scheme);
    const next = mine ? c.steps.indexOf(false) : -1, low = live && c.trust < 45;
    const sig = [w.tab, st, c ? c.caller.seed : 0, s ? s.id : '', mine ? c.steps.join() : '', low, mine && c.codeGiven].join(';');
    if (!force && sig === w.sig) return; w.sig = sig;
    const tab = (id, label) => h('button', { class: 'sc-tab' + (w.tab === id ? ' on' : ''), onclick: () => { w.tab = id; this.refresh(b, w, true); } }, label);
    const head = h('div', { class: 'sc-head' }, h('div', {}, h('b', {}, 'Call Script'), h('span', {}, mine ? 'Running: ' + c.scheme.name + ' on ' + c.caller.first : live ? 'On the line: ' + c.caller.first + '. Pick a scheme.' : 'No call right now.')),
      h('div', { class: 'sc-tabs' }, tab('lines', 'Lines'), tab('notes', 'Notes')));
    const page = h('div', { class: 'sc-page' });
    if (w.tab === 'notes') {
      const S = Script.st();
      const ta = h('textarea', { class: 'sc-notes', placeholder: 'Notes for later. What worked, who to avoid, Gerald the penguin\'s birthday…', spellcheck: false, value: S.notes, oninput: e => { S.notes = e.target.value.slice(0, 4000); Script.save(); } });
      const add = h('input', { class: 'sc-add', type: 'text', placeholder: 'Write a line you like to use, press Enter', maxLength: 200,
        onkeydown: e => { if (e.key === 'Enter' && add.value.trim()) { S.mine.push(add.value.trim()); S.mine = S.mine.slice(-20); add.value = ''; Script.save(); this.refresh(b, w, true); b.querySelector('.sc-add').focus(); } } });
      page.append(h('div', { class: 'sc-lab' }, 'Notes'), ta, h('div', { class: 'sc-lab' }, 'My lines'), add,
        S.mine.length ? h('div', { class: 'sc-lines' }, S.mine.map((t, i) => h('div', { class: 'sc-mine' }, Script.line(t), h('button', { class: 'sc-x', title: 'Delete', html: OS_WIN_BTN.x, onclick: () => { S.mine.splice(i, 1); Script.save(); this.refresh(b, w, true); } })))) : h('p', { class: 'sc-empty' }, 'Lines you save here can be pasted into any call. Use {first} for the caller\'s name.'));
      b.replaceChildren(head, page); return;
    }
    if (c && (live || st === 'ended' || st === 'ringing')) {
      const lk = Script.likes(c.caller);
      page.append(h('div', { class: 'sc-who' }, h('div', { class: 'sc-face', html: portraitSVG(c.caller, 'neutral', false) }),
        h('div', { class: 'grow' }, h('b', {}, c.caller.full), h('span', {}, c.caller.typeLabel + ' · ' + c.caller.persona.label + ', age ' + c.caller.age),
          h('span', { class: 'lk' }, h('em', {}, 'Likes: '), lk.like.join(', ') || 'nothing much'), lk.hate.length ? h('span', { class: 'lk bad' }, h('em', {}, 'Hates: '), lk.hate.join(', ')) : null)));
    }
    if (!s) {
      page.append(h('div', { class: 'sc-lab' }, 'Openers'), h('div', { class: 'sc-lines' }, Script.OPENERS.map(t => Script.line(t))),
        h('div', { class: 'sc-lab' }, 'Preview a scheme'), h('div', { class: 'sc-chips' }, Game.unlocked().map(x => h('button', { class: 'sc-chip', style: { '--c': x.color }, onclick: () => { w.prev = x.id; this.refresh(b, w, true); } }, h('i', { html: OS.glyph(x.icon) }), x.name))));
    } else {
      if (!mine) page.append(h('div', { class: 'sc-prev' }, h('span', {}, 'Previewing ' + s.name), h('button', { onclick: () => { w.prev = null; this.refresh(b, w, true); } }, 'Back')));
      if (!mine || next === 0) page.append(h('div', { class: 'sc-lab' }, 'Openers'), h('div', { class: 'sc-lines' }, Script.OPENERS.slice(0, 2).map(t => Script.line(t))));
      s.steps.forEach((x, i) => {
        const done = mine && c.steps[i], cur = mine && i === next;
        const lines = (x.remote && mine && c.codeGiven) ? ['Could you read me that code again, slowly?', 'I\'m typing it in now. Can you see the little arrow?'] : (x.lines || []);
        page.append(h('div', { class: 'sc-step' + (done ? ' done' : '') + (cur ? ' cur' : '') },
          h('div', { class: 'sc-st' }, h('span', { class: 'n', style: cur ? { background: s.color } : null, html: done ? OS.glyph('check') : String(i + 1) }), h('b', {}, x.t)),
          done ? null : h('div', { class: 'sc-lines' }, lines.map(t => Script.line(t, cur ? 'hot' : '')))));
      });
    }
    if (live) page.append(h('div', { class: 'sc-lab' + (low ? ' warn' : '') }, low ? 'Trust is slipping: try one of these' : 'If trust slips'), h('div', { class: 'sc-lines' }, (Script.RECOVER[c.caller.baiter ? 'baiter' : c.caller.persona.id] || Script.RECOVER.sweet).map(t => Script.line(t))));
    b.replaceChildren(head, page);
    const hot = page.querySelector('.sc-step.cur'); if (hot && force !== true) hot.scrollIntoView({ block: 'nearest' });
  }
};
OS.pinned.splice(1, 0, 'script');
