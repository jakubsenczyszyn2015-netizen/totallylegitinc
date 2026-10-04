'use strict';
/* =====================================================================
   PHONE — the call window: caller trust, caller banner + portrait with a
   live voice waveform and status line, chat log, input, Hang Up / speaker /
   mic. Works with the OS incoming-call card or on its own (Answer/Decline
   buttons over the portrait). API reference: docs/modules/phone.md
   ===================================================================== */
const Phone = {
  r: null, talkUntil: 0, wave: null, faceKey: '', optKey: '',
  render(body, win) {
    const r = this.r = { win };
    const sq = (cls, title, glyph, fn) => h('button', { class: 'ph-sq ' + cls, title, html: OS.glyph(glyph), onclick: fn });
    body.append(
      h('div', { class: 'ph-panel ph-trust' },
        h('div', { class: 'ph-trow' }, h('b', {}, 'Caller trust'), r.mood = h('span', { class: 'ph-mood' })),
        h('div', { class: 'ph-brow' }, h('div', { class: 'ph-bar' }, r.bar = h('i')), r.pct = h('span', { class: 'ph-pct' }))),
      h('div', { class: 'ph-panel ph-caller' },
        r.nm = h('div', { class: 'ph-name' }),
        r.pic = h('div', { class: 'ph-pic' }, r.face = h('div', { class: 'pt' }), r.flag = h('div', { class: 'ph-flag hidden', html: OS.glyph('warning') + '<span>Bait Detector: smells like a scambaiter</span>' }),
          r.ring = h('div', { class: 'ph-ring hidden' },
            h('button', { class: 'ph-rb no', title: 'Decline', html: OS.glyph('x'), onclick: () => { SFX.click(); Call.decline(); } }),
            h('button', { class: 'ph-rb yes', title: 'Answer', html: OS.glyph('phone'), onclick: () => Call.answer() }))),
        r.strip = h('div', { class: 'ph-strip' }, r.cv = h('canvas', { width: 672, height: 56 }), r.st = h('div', { class: 'ph-st' }))),
      r.log = h('div', { class: 'ph-panel ph-log' }),
      h('div', { class: 'ph-tools' },
        h('div', { class: 'ph-selw' }, r.sel = h('select', { title: 'Which scheme to run on this caller', onchange: () => { if (r.sel.value) Call.setScheme(r.sel.value); } })),
        r.hf = h('button', { class: 'ph-chip', title: 'Hands-free: keep listening after every reply', onclick: () => { settings.handsFree = !settings.handsFree; saveSettings(); this.refresh(); if (settings.handsFree && Call.state === 'live' && !Call.cur.busy) Call.listen(); } }, h('i', { class: 'dot' }), 'Hands-free'),
        h('button', { class: 'ph-chip', title: 'Open the call script', onclick: () => OS.launch('script') }, h('span', { class: 'g', html: OS.glyph('script') }), 'Script')),
      h('div', { class: 'ph-in' },
        r.inp = h('input', { type: 'text', placeholder: '', maxLength: 400, spellcheck: false, onkeydown: e => { if (e.key === 'Enter') this.send(); } }),
        r.say = h('button', { class: 'ph-send', title: 'Say it', html: '<svg viewBox="0 0 24 24"><path d="M3 20.5 21.5 12 3 3.5l.02 6.6L15 12 3.02 13.9z"/></svg>', onclick: () => this.send() })),
      h('div', { class: 'ph-btns' },
        r.hang = h('button', { class: 'ph-hang', onclick: () => Call.hangup() }, 'Hang Up'),
        r.spk = sq('spk', 'Caller voice on or off', 'speaker', () => { settings.tts = !settings.tts; if (!settings.tts) TTS.stop(); saveSettings(); this.refresh(); }),
        r.mic = sq('mic', 'Talk to the caller with your microphone', 'mic', () => Call.toggleMic()))
    );
    this.faceKey = ''; this.optKey = ''; this.wave = null;
    clearInterval(win.waveIv); win.waveIv = setInterval(() => this.tick(), 70);
    this.rebuildLog(); this.refresh(); this.draw();
  },
  alive() { return !!(this.r && this.r.log.isConnected); },
  send() { if (!this.alive()) return; const v = this.r.inp.value; this.r.inp.value = ''; Call.say(v); },
  /* paste a line into the input (used by the Script app) */
  paste(text) {
    OS.launch('phone', true);
    if (!this.alive()) return; this.r.inp.value = text; this.r.inp.focus(); this.r.inp.setSelectionRange(text.length, text.length);
  },
  /* the caller's mouth and the waveform move while they "speak": real TTS, or simulated when the voice is off */
  talk(text) { if (!TTS.speaking) this.talkUntil = performance.now() + clamp(String(text || '').length * 55, 900, 5200); },
  talking() { return TTS.speaking || performance.now() < this.talkUntil; },
  bubble(who, text, name) {
    if (!this.alive()) return;
    const c = Call.cur, nm = who === 'you' ? (settings.name || 'You') : (c && c.caller.full) || name || 'Caller';
    const b = who === 'sys' ? h('div', { class: 'bub sys' }, text) : h('div', { class: 'bub ' + who }, h('b', { class: 'tag' }, nm), h('span', { class: 'tx' }, text));
    $$('.typing', this.r.log).forEach(t => t.remove());
    this.r.log.append(b); this.r.log.scrollTop = this.r.log.scrollHeight;
  },
  typing(on) {
    if (!this.alive()) return; $$('.typing', this.r.log).forEach(t => t.remove());
    if (on) { this.r.log.append(h('div', { class: 'bub them typing' }, h('i'), h('i'), h('i'))); this.r.log.scrollTop = this.r.log.scrollHeight; }
  },
  rebuildLog() {
    if (!this.alive()) return; this.r.log.replaceChildren();
    const c = Call.cur; if (c && Call.state !== 'ringing') c.history.forEach(m => this.bubble(m.who, m.text, c.caller.name));
  },
  face(key, html) { if (this.faceKey === key) return; this.faceKey = key; this.r.face.innerHTML = html; },
  status() {
    const r = this.r, st = Call.state, c = Call.cur; let t = '', cls = '';
    if (st === 'ringing') { t = 'Incoming call...'; cls = 'band ring'; }
    else if (st === 'live' && c) {
      if (STT.active) { t = 'Listening...'; cls = 'lis'; }
      else if (c.waiting) { t = 'Message sent - waiting'; cls = 'band wait'; }
      else if (this.talking()) { t = 'Speaking'; cls = 'talk'; }
    } else if (st === 'ended' && c) {
      t = { paid: 'Scam complete', baited: 'Baited!', hung: 'They hung up', timeout: 'They had to go', you: 'Call ended', cut: 'Call cut' }[c.result] || 'Call ended';
      cls = 'band ' + (c.result === 'paid' ? 'paid' : c.result === 'baited' ? 'bad' : 'end');
    }
    if (r.st.textContent !== t) r.st.textContent = t;
    if (r.st.className !== 'ph-st ' + cls) r.st.className = 'ph-st ' + cls;
  },
  refresh() {
    if (!this.alive()) return;
    const r = this.r, st = Call.state, c = Call.cur, live = st === 'live', ring = st === 'ringing';
    const show = c && (ring || live || st === 'ended');
    if (show) {
      const mood = moodOf(c.trust);
      r.mood.textContent = ring ? 'Incoming' : MOOD_LABEL[mood]; r.mood.style.color = ring ? '#7ee2a8' : MOOD_COLOR[mood];
      r.pct.textContent = ring ? '' : Math.round(c.trust) + '%';
      r.bar.style.width = (ring ? 0 : c.trust) + '%'; r.bar.style.background = MOOD_COLOR[mood];
      r.nm.textContent = c.caller.full.toUpperCase();
      this.face(c.caller.seed + ':' + (ring ? 'neutral' : mood), portraitSVG(c.caller, ring ? 'neutral' : mood, false));
      r.flag.classList.toggle('hidden', !c.flag);
    } else {
      r.mood.textContent = ''; r.pct.textContent = ''; r.bar.style.width = '0%';
      r.nm.textContent = st === 'idle' ? 'LINE OPEN' : 'PHONES OFF';
      const msg = st === 'idle' ? 'Waiting for the next caller' : G.phase === 'lobby' ? 'Calls start when the shift starts' : 'No calls right now';
      this.face('idle:' + msg, '<div class="ph-wait"><i>' + OS.glyph('phone') + '</i><span>' + msg + (st === 'idle' ? '<em>.</em><em>.</em><em>.</em>' : '') + '</span></div>');
      r.flag.classList.add('hidden');
    }
    r.pic.classList.toggle('ringing', ring);
    r.ring.classList.toggle('hidden', !ring);
    const un = Game.unlocked(), key = un.map(s => s.id).join();
    if (key !== this.optKey) {
      this.optKey = key;
      r.sel.replaceChildren(h('option', { value: '' }, 'Pick a scheme…'), ...un.map(s => h('option', { value: s.id }, s.name + '  ·  ' + money(s.reward))));
    }
    r.sel.value = c && c.scheme ? c.scheme.id : '';
    r.sel.disabled = !live || !!(c.scheme && c.steps.some(Boolean));
    r.inp.disabled = !live; r.say.disabled = !live || c.busy; r.hang.disabled = !live;
    r.inp.placeholder = live ? (STT.active ? 'Listening…' : c.busy ? 'Waiting for ' + c.caller.first + '…' : 'Type to talk to ' + c.caller.first + '…') : ring ? 'Answer the call first' : '';
    r.spk.classList.toggle('off', !settings.tts); r.hf.classList.toggle('on', !!settings.handsFree);
    r.mic.classList.toggle('rec', STT.active); r.mic.disabled = !live;
    this.status();
  },
  /* waveform: newest sample on the right; flat dots when silent */
  tick() {
    if (!this.alive()) return;
    const talk = this.talking(), lis = STT.active, w = this.wave || (this.wave = { a: new Float32Array(42), k: new Uint8Array(42), v: 0, still: 0 });
    const tk = !!talk && Call.state === 'live';
    if (tk !== this._talk) { this._talk = tk; this.r.face.classList.toggle('talk', tk); this.status(); }
    if (lis !== this._lis) { this._lis = lis; this.status(); }
    const act = tk || lis;
    if (!act && w.still > w.a.length) return;
    w.a.copyWithin(0, 1); w.k.copyWithin(0, 1);
    w.v = act ? clamp(w.v * 0.35 + rand(0.12, 1) * 0.75, 0.12, 1) : 0;
    w.a[w.a.length - 1] = w.v; w.k[w.k.length - 1] = tk ? 1 : lis ? 2 : 0;
    w.still = act ? 0 : w.still + 1;
    this.draw();
  },
  draw() {
    const cv = this.r && this.r.cv; if (!cv) return;
    const g = cv.getContext('2d'), W = cv.width, H = cv.height, w = this.wave, n = w ? w.a.length : 42, step = W / n;
    g.clearRect(0, 0, W, H);
    for (let i = 0; i < n; i++) {
      const a = w ? w.a[i] : 0, k = w ? w.k[i] : 0, x = Math.round(i * step + step * 0.25);
      if (a < 0.05) { g.fillStyle = '#3d5675'; g.fillRect(x + 1, H - 12, 6, 6); continue; }
      const bh = Math.max(8, a * (H - 8));
      g.fillStyle = k === 2 ? '#ff7d47' : '#4fa3ff'; g.fillRect(x, H - 6 - bh, Math.round(step * 0.5), bh);
    }
  }
};

OS.apps.phone = {
  desktop: true, order: 10, title: 'Phone', emoji: '📞', icon: 'phone', color: '#1f9d55', w: 352, h: 632, x: 0.33, y: 0.01, cls: 'phone',
  render: (b, w) => Phone.render(b, w), refresh: () => Phone.refresh(), onClose: w => clearInterval(w.waveIv)
};
