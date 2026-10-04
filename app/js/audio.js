'use strict';
/* =====================================================================
   AUDIO
   ===================================================================== */
const AudioSys = {
  ctx: null, master: null, sfx: null, voice: null,
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination);
    this.sfx = this.ctx.createGain(); this.sfx.connect(this.master);
    this.voice = this.ctx.createGain(); this.voice.connect(this.master);
    this.applyVolumes();
  },
  resume() { this.init(); if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {}); },
  applyVolumes() {
    if (!this.ctx) return;
    this.master.gain.value = settings.master; this.sfx.gain.value = settings.sfx; this.voice.gain.value = settings.voice;
  },
  tone(freq, dur, type = 'sine', vol = 0.2, when = 0, slideTo = 0) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + when, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(this.sfx); o.start(t0); o.stop(t0 + dur + 0.03);
  },
  noise(dur, vol = 0.15, when = 0, freq = 1200) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + when, n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = this.ctx.createBufferSource(); s.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq;
    const g = this.ctx.createGain(); g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(this.sfx); s.start(t0);
  }
};
const SFX = {
  click() { AudioSys.tone(700, 0.05, 'square', 0.06); },
  open() { AudioSys.tone(520, 0.07, 'triangle', 0.1); AudioSys.tone(780, 0.09, 'triangle', 0.1, 0.06); },
  ring() { for (let i = 0; i < 2; i++) { AudioSys.tone(880, 0.16, 'sine', 0.16, i * 0.22); AudioSys.tone(1100, 0.16, 'sine', 0.12, i * 0.22); } },
  pickup() { AudioSys.tone(440, 0.08, 'sine', 0.15); AudioSys.tone(660, 0.12, 'sine', 0.15, 0.08); },
  hang() { AudioSys.tone(480, 0.12, 'sine', 0.15); AudioSys.tone(320, 0.2, 'sine', 0.15, 0.12); },
  step() { AudioSys.tone(880, 0.09, 'triangle', 0.16); AudioSys.tone(1320, 0.16, 'triangle', 0.16, 0.09); },
  cash() { [988, 1319, 1568, 2093].forEach((f, i) => AudioSys.tone(f, 0.22, 'triangle', 0.18, i * 0.07)); AudioSys.noise(0.25, 0.08, 0, 5000); },
  bad() { AudioSys.tone(220, 0.25, 'sawtooth', 0.14, 0, 110); AudioSys.tone(160, 0.35, 'sawtooth', 0.14, 0.2, 80); },
  popup() { AudioSys.tone(1200, 0.06, 'square', 0.07); AudioSys.tone(900, 0.08, 'square', 0.07, 0.07); },
  throw() { AudioSys.noise(0.12, 0.12, 0, 900); },
  bounce() { AudioSys.noise(0.04, 0.05, 0, 500); },
  bin() { AudioSys.tone(660, 0.1, 'triangle', 0.15); AudioSys.tone(990, 0.18, 'triangle', 0.15, 0.1); },
  glug() { for (let i = 0; i < 3; i++) AudioSys.tone(180 + i * 40, 0.12, 'sine', 0.18, i * 0.14, 90); },
  sip() { AudioSys.noise(0.35, 0.1, 0, 2600); },
  pass() { [523, 659, 784, 1047].forEach((f, i) => AudioSys.tone(f, 0.3, 'triangle', 0.18, i * 0.13)); },
  fired() { [392, 349, 311, 196].forEach((f, i) => AudioSys.tone(f, 0.4, 'sawtooth', 0.13, i * 0.25)); },
  join() { AudioSys.tone(600, 0.1, 'sine', 0.12); AudioSys.tone(900, 0.14, 'sine', 0.12, 0.1); }
};

/* ---------- caller speech (browser voices) ---------- */
const TTS = {
  voices: [], speaking: false,
  load() { try { this.voices = window.speechSynthesis ? speechSynthesis.getVoices() : []; } catch (e) { this.voices = []; } },
  speak(text, caller, onend) {
    let done = false; const fin = () => { if (done) return; done = true; this.speaking = false; onend && onend(); };
    if (!settings.tts || !window.speechSynthesis || settings.callerVoice <= 0) return fin();
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const pre = settings.lang.slice(0, 2).toLowerCase();
      const vs = this.voices.filter(v => v.lang && v.lang.toLowerCase().startsWith(pre));
      if (vs.length) u.voice = vs[caller.seed % vs.length];
      u.lang = settings.lang; u.pitch = caller.pitch; u.rate = caller.rate;
      u.volume = clamp(settings.callerVoice * settings.master, 0, 1);
      u.onend = fin; u.onerror = fin;
      this.speaking = true; speechSynthesis.speak(u);
      setTimeout(fin, 3000 + text.length * 110);   // safety net: some browsers never fire onend
    } catch (e) { fin(); }
  },
  stop() { try { window.speechSynthesis && speechSynthesis.cancel(); } catch (e) {} this.speaking = false; }
};
if (window.speechSynthesis) { TTS.load(); try { speechSynthesis.addEventListener('voiceschanged', () => TTS.load()); } catch (e) {} }

/* ---------- speech-to-text: browser recognition or Whisper over the API ---------- */
const STT = {
  active: false, rec: null, mr: null, chunks: [],
  SR: window.SpeechRecognition || window.webkitSpeechRecognition || null,
  mode() {
    const m = settings.sttMode;
    const whisperOK = (settings.provider === 'groq' || settings.provider === 'custom') && AI.hasKey() && !!window.MediaRecorder;
    if (m === 'off') return 'none';
    if (m === 'browser') return this.SR ? 'browser' : 'none';
    if (m === 'whisper') return whisperOK ? 'whisper' : 'none';
    return this.SR ? 'browser' : (whisperOK ? 'whisper' : 'none');
  },
  async start(onInterim, onFinal, onErr) {
    if (this.active) return;
    this._cancel = false;
    const mode = this.mode();
    if (mode === 'none') { onErr && onErr('Voice input is not available in this browser. Type instead, or use Chrome/Edge, or a Groq key.'); return; }
    this.active = true;
    if (mode === 'browser') {
      const r = new this.SR(); this.rec = r; let finalText = '', sent = false;
      r.lang = settings.lang; r.interimResults = true; r.continuous = false; r.maxAlternatives = 1;
      r.onresult = e => {
        let interim = ''; finalText = '';
        for (let i = 0; i < e.results.length; i++) { const t = e.results[i][0].transcript; if (e.results[i].isFinal) finalText += t; else interim += t; }
        onInterim && onInterim(finalText + interim);
      };
      r.onerror = e => { if (e.error !== 'no-speech' && e.error !== 'aborted') onErr && onErr('Mic error: ' + e.error); };
      r.onend = () => { this.active = false; this.rec = null; if (!sent) { sent = true; onFinal && onFinal(this._cancel ? '' : finalText.trim()); } };
      try { r.start(); } catch (e) { this.active = false; onErr && onErr('Could not start listening.'); }
    } else {
      try {
        const stream = await Voice.getMic(true);
        if (!stream) throw new Error('no mic');
        const mr = new MediaRecorder(stream); this.mr = mr; this.chunks = [];
        mr.ondataavailable = e => { if (e.data && e.data.size) this.chunks.push(e.data); };
        mr.onstop = async () => {
          this.active = false; this.mr = null;
          try {
            const blob = new Blob(this.chunks, { type: mr.mimeType || 'audio/webm' });
            if (blob.size < 1200) return onFinal && onFinal('');
            onInterim && onInterim('(transcribing...)');
            const fd = new FormData();
            fd.append('file', blob, 'speech.webm');
            fd.append('model', (PROVIDERS[settings.provider] || {}).stt || 'whisper-large-v3-turbo');
            fd.append('language', settings.lang.slice(0, 2));
            const res = await fetch(AI.base() + '/audio/transcriptions', { method: 'POST', headers: { Authorization: 'Bearer ' + settings.apiKey }, body: fd });
            if (!res.ok) throw new Error('transcription failed (' + res.status + ')');
            const j = await res.json(); onFinal && onFinal(String(j.text || '').trim());
          } catch (e) { onErr && onErr(e.message); onFinal && onFinal(''); }
        };
        mr.start();
      } catch (e) { this.active = false; onErr && onErr('Microphone not available.'); }
    }
  },
  stop() {
    if (this.rec) { try { this.rec.stop(); } catch (e) {} }
    if (this.mr && this.mr.state !== 'inactive') { try { this.mr.stop(); } catch (e) {} }
  },
  abort() {
    this._cancel = true;
    if (this.rec) { try { this.rec.abort(); } catch (e) {} }
    if (this.mr && this.mr.state !== 'inactive') { this.chunks = []; try { this.mr.stop(); } catch (e) {} }
    this.active = false;
  }
};
