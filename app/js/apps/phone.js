'use strict';
/* ---------- Phone ---------- */
const Phone = {
  r: null,
  render(body) {
    const r = this.r = {};
    body.append(
      h('div', { class: 'trust' }, h('div', { class: 'top' }, h('span', {}, 'Caller trust'), r.mood = h('span', {}, '')), h('div', { class: 'bar' }, r.bar = h('i'))),
      h('div', { class: 'caller' }, r.nm = h('div', { class: 'nm' }), r.face = h('div', { class: 'face' }),
        r.ring = h('div', { class: 'ringbtns hidden' },
          h('button', { class: 'btn small good', onclick: () => Call.answer() }, 'Answer'),
          h('button', { class: 'btn small danger', onclick: () => Call.decline() }, 'Decline'))),
      r.log = h('div', { class: 'log' }),
      h('div', { class: 'ctl' }, r.sel = h('select', { title: 'Which scheme to run', onchange: () => { if (r.sel.value) Call.setScheme(r.sel.value); } })),
      h('div', { class: 'inrow' },
        r.inp = h('input', { type: 'text', placeholder: 'Say something…', maxLength: 400, onkeydown: e => { if (e.key === 'Enter') this.send(); } }),
        r.say = h('button', { class: 'btn small primary', onclick: () => this.send() }, 'Say')),
      h('div', { class: 'ctl' },
        r.hang = h('button', { class: 'btn small danger grow', onclick: () => Call.hangup() }, 'Hang up'),
        r.spk = h('button', { class: 'btn small', title: 'Caller voice on or off', onclick: () => { settings.tts = !settings.tts; if (!settings.tts) TTS.stop(); saveSettings(); this.refresh(); } }, '🔊'),
        r.mic = h('button', { class: 'btn small', title: 'Talk to the caller with your microphone', onclick: () => Call.toggleMic() }, '🎤'),
        r.hf = h('button', { class: 'btn small', title: 'Hands-free: keep listening after every reply', onclick: () => { settings.handsFree = !settings.handsFree; saveSettings(); this.refresh(); if (settings.handsFree && Call.state === 'live' && !Call.cur.busy) Call.listen(); } }, 'Hands-free'))
    );
    this.rebuildLog(); this.refresh();
  },
  alive() { return this.r && this.r.log.isConnected; },
  send() { const v = this.r.inp.value; this.r.inp.value = ''; Call.say(v); },
  bubble(who, text, name) {
    if (!this.alive()) return;
    const b = h('div', { class: 'bub ' + who }, who === 'sys' ? text : [h('b', {}, who === 'you' ? settings.name : name || 'Caller'), text]);
    $$('.typing', this.r.log).forEach(t => t.remove());
    this.r.log.append(b); this.r.log.scrollTop = this.r.log.scrollHeight;
  },
  typing(on) {
    if (!this.alive()) return; $$('.typing', this.r.log).forEach(t => t.remove());
    if (on) { this.r.log.append(h('div', { class: 'bub them typing' }, '…')); this.r.log.scrollTop = this.r.log.scrollHeight; }
  },
  rebuildLog() {
    if (!this.alive()) return; this.r.log.replaceChildren();
    const c = Call.cur; if (c && Call.state !== 'ringing') c.history.forEach(m => this.bubble(m.who, m.text, c.caller.name));
  },
  refresh() {
    if (!this.alive()) return;
    const r = this.r, st = Call.state, c = Call.cur, live = st === 'live';
    const showCaller = c && (st === 'ringing' || st === 'live' || st === 'ended');
    if (showCaller) {
      const mood = moodOf(c.trust);
      r.nm.textContent = c.caller.name.toUpperCase() + (c.flag ? '  ⚠' : '');
      r.face.innerHTML = portraitSVG(c.caller, mood, live && TTS.speaking);
      r.mood.textContent = st === 'ringing' ? 'Incoming call' : MOOD_LABEL[mood] + '  ' + Math.round(c.trust) + '%';
      r.mood.style.color = st === 'ringing' ? '#fff' : MOOD_COLOR[mood];
      r.bar.style.width = (st === 'ringing' ? 0 : c.trust) + '%'; r.bar.style.background = MOOD_COLOR[mood];
    } else {
      r.nm.textContent = st === 'idle' ? 'LINE OPEN' : 'PHONES OFF';
      r.face.innerHTML = '<div class="wait">' + (st === 'idle' ? 'Waiting for the next caller…' : G.phase === 'lobby' ? 'Calls start when the shift starts.' : 'No calls right now.') + '</div>';
      r.mood.textContent = ''; r.bar.style.width = '0%';
    }
    r.ring.classList.toggle('hidden', st !== 'ringing');
    const opts = [h('option', { value: '' }, 'Pick a scheme…')].concat(Game.unlocked().map(s => h('option', { value: s.id }, s.emoji + ' ' + s.name + '  (' + money(s.reward) + ')')));
    r.sel.replaceChildren(...opts); r.sel.value = c && c.scheme ? c.scheme.id : '';
    r.sel.disabled = !live || (c.scheme && c.steps.some(Boolean));
    r.inp.disabled = !live; r.say.disabled = !live || c.busy; r.hang.disabled = !live;
    r.inp.placeholder = live ? (STT.active ? 'Listening…' : 'Say something…') : '';
    r.spk.classList.toggle('on', !!settings.tts); r.hf.classList.toggle('on', !!settings.handsFree);
    r.mic.classList.toggle('rec', STT.active); r.mic.disabled = !live;
  }
};

OS.apps.phone = { desktop: true, order: 10, title: 'Phone', emoji: '📞', color: '#1f9d55', w: 370, h: 610, x: 0.33, y: 0.02, cls: 'phone', render: b => Phone.render(b), refresh: () => Phone.refresh() };
