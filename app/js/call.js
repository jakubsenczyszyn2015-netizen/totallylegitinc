'use strict';
/* =====================================================================
   CALLS — the phone call state machine (Call).
   States: off → idle → ringing → live → ended → idle …
   API reference: docs/modules/phone.md
   ===================================================================== */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const callNorm = x => String(x || '').replace(/[^a-z0-9]/gi, '').toUpperCase();
const Call = {
  state: 'off', cur: null, wait: 0, ringLeft: 0, endLeft: 0, ringIv: null,

  reset() { this.stopRing(); STT.abort(); TTS.stop(); this.state = 'off'; this.cur = null; Phone.rebuildLog(); OS.refresh(); },
  dial() { return 1 - 0.25 * Game.lvl('dial'); },
  stopRing() { if (this.ringIv) { clearInterval(this.ringIv); this.ringIv = null; } },
  /* called when the day ends while a call is in progress */
  shut() { if (this.state === 'live') this.end('cut'); this.stopRing(); STT.abort(); this.state = 'off'; OS.refresh(); },

  tick(dt) {
    if (G.phase !== 'day') return;
    if (this.state === 'off') { this.state = 'idle'; this.wait = rand(2, 4) * this.dial(); OS.refresh(); }
    if (this.state === 'idle') { if (P.seated && OS.open) { this.wait -= dt; if (this.wait <= 0) this.ring(); } }
    else if (this.state === 'ringing') { this.ringLeft -= dt; if (this.ringLeft <= 0) { toast('Missed call.'); this.decline(); } }
    else if (this.state === 'ended') { this.endLeft -= dt; if (this.endLeft <= 0) { this.state = 'idle'; this.wait = rand(2.5, 6) * this.dial(); OS.refresh(); } }
  },
  /* ring(baiter, typeId): typeId picks a caller archetype (CALLER_TYPES id), mostly for tests */
  ring(forceBaiter, typeId) {
    const dayN = G.mode === 'week' ? G.day : 2 + Math.min(4, Math.floor(G.team / 1500));
    const caller = makeCaller(dayN, forceBaiter, typeId);
    this.cur = { caller, trust: clamp(caller.trust0 + 6 * Game.lvl('tongue'), 5, 90), scheme: null, steps: [], history: [], turns: 0, maxTurns: 24 + 8 * Game.lvl('patience'), busy: false, waiting: false,
      remote: false, codeGiven: false, formOk: {}, formBad: {}, result: null, paid: 0,
      flag: caller.baiter && Math.random() < [0, 0.6, 1][Game.lvl('detect')] };
    Bus.emit('call:ring', this.cur);
    this.state = 'ringing'; this.ringLeft = 18; SFX.ring(); this.stopRing(); this.ringIv = setInterval(() => SFX.ring(), 1700);
    Phone.rebuildLog(); OS.refresh();
  },
  decline() { if (this.state !== 'ringing') return; this.stopRing(); this.state = 'idle'; this.wait = rand(2, 4.5) * this.dial(); this.cur = null; Phone.rebuildLog(); OS.refresh(); },
  async answer() {
    if (this.state !== 'ringing') return;
    this.stopRing(); SFX.pickup(); this.state = 'live'; const c = this.cur; G.stats.calls++; Bus.emit('call:answer', c);
    if (!OS.wins.has('phone') && OS.open) OS.launch('phone', true);
    Phone.rebuildLog(); Phone.bubble('sys', 'Call connected'); if (c.flag) { const m = 'Bait Detector: this one smells like a scambaiter.'; c.history.push({ who: 'sys', text: m }); Phone.bubble('sys', m); }
    c.busy = c.waiting = true; Phone.typing(true); OS.refresh();
    let line = null;
    if (AI.available() && !settings.lang.startsWith('en')) { try { line = parseTurn(await AI.chat(buildMessages(c, true))).say; } catch (e) { this.aiFail(c, e); } }
    else await sleep(450);
    if (this.cur !== c || this.state !== 'live') return;
    if (!line) line = pick(c.caller.baiter ? BAITER_L.greet : (c.caller.L || c.caller.persona.L).greet).replace(/\{me\}/g, c.caller.first);
    c.busy = c.waiting = false; this.themSay(c, line); OS.refresh();
    if (Phone.alive()) Phone.r.inp.focus();
  },
  aiFail(c, e) { console.warn('AI caller error', e); if (!c.aiWarned) { c.aiWarned = true; toast('AI caller unavailable (' + (e.message || 'error') + '). Using scripted replies for this call.', 'bad'); } },
  themSay(c, text) {
    c.history.push({ who: 'them', text }); Bus.emit('call:line', { who: 'them', text, call: c }); Phone.typing(false); Phone.bubble('them', text, c.caller.name);
    TTS.speak(text, c.caller, () => { Phone.refresh(); if (settings.handsFree && this.cur === c && this.state === 'live' && !c.busy) this.listen(); });
    Phone.talk(text); Phone.refresh();
  },
  async say(text) {
    const c = this.cur; text = String(text || '').trim();
    if (this.state !== 'live' || !text) return;
    if (c.busy) { if (Phone.alive()) Phone.r.inp.value = text; return; }
    c.history.push({ who: 'you', text }); Bus.emit('call:line', { who: 'you', text, call: c }); c.turns++; c.busy = c.waiting = true;
    Phone.bubble('you', text); Phone.typing(true); Phone.refresh();
    let r = null;
    if (AI.available()) { try { r = parseTurn(await AI.chat(buildMessages(c))); } catch (e) { this.aiFail(c, e); } }
    if (!r) { await sleep(rand(500, 1100)); r = offlineReply(c, text); }
    if (this.cur !== c || this.state !== 'live') return;
    c.busy = c.waiting = false; this.apply(c, r);
  },
  apply(c, r) {
    c.trust = clamp(c.trust + (r.trust_delta < 0 ? Math.round(r.trust_delta * (1 - 0.2 * Game.lvl('skin'))) : r.trust_delta), 0, 100);
    let progressed = false, code = false;
    if (c.scheme) for (const idx of r.steps_done) {
      const next = c.steps.indexOf(false); if (next < 0 || idx !== next) continue;
      const st = c.scheme.steps[next]; if (st.pin || c.trust < st.min - 12) continue;
      /* the remote step only completes when the agent connects with the code the caller reads out */
      if (st.remote) { if (!c.codeGiven) { c.codeGiven = true; code = true; } break; }
      c.steps[next] = true; progressed = true;
    }
    if (progressed) SFX.step();
    let say = r.say;
    if (code && !callNorm(say).includes(callNorm(c.caller.nosy))) say += ' It says my connection code is ' + c.caller.nosy + '.';
    this.themSay(c, say);
    if (code) { SFX.step(); Bus.emit('call:code', c); toast(c.caller.first + ' read out a NosyViewer code. Type it in to connect.', 'good'); OS.launch('nosy', true); }
    if (c.scheme && !c.steps.includes(false)) { this.finish(c); }
    else if (r.hangup || c.trust <= 0) { c.busy = true; setTimeout(() => { if (this.cur === c) this.end('hung'); }, 1500); }
    else if (c.turns >= c.maxTurns) { c.busy = true; setTimeout(() => { if (this.cur === c) this.end('timeout'); }, 1500); }
    OS.refresh();
  },
  setScheme(id) {
    const c = this.cur, s = schemeById(id); if (this.state !== 'live' || !s || (c.scheme && c.steps.some(Boolean)) || c.scheme === s) return;
    c.scheme = s; c.steps = s.steps.map(() => false); c.formOk = {}; c.formBad = {}; c.codeGiven = false; c.remote = false;
    c.history.push({ who: 'sys', text: 'Running: ' + s.name }); Phone.bubble('sys', 'Running: ' + s.name);
    OS.launch('sch_' + s.id, true); OS.refresh();
  },
  /* NosyViewer: connect to the caller's computer with the code they read out. Returns true on success. */
  connectRemote(code) {
    const c = this.cur; if (this.state !== 'live' || !c || !c.scheme) return false;
    const next = c.steps.indexOf(false), st = next >= 0 ? c.scheme.steps[next] : null;
    if (!st || !st.remote) return false;
    if (!callNorm(code) || callNorm(code) !== callNorm(c.caller.nosy)) { SFX.bad(); c.trust = clamp(c.trust - 3, 0, 100); OS.refresh(); return false; }
    c.steps[next] = true; c.remote = true; c.codeGiven = true; SFX.step(); Bus.emit('call:remote', c);
    if (!c.busy) this.themSay(c, pick(['Ooh! The mouse is moving by itself! Is that you?', 'It says "connected". I can see a little arrow. Hello, little arrow!', 'Oh! My screen just blinked. Are you in?']));
    OS.refresh(); return true;
  },
  submitPin(v) {
    const c = this.cur; if (this.state !== 'live' || !c.scheme || c.busy) return;
    const next = c.steps.indexOf(false); if (next < 0 || !c.scheme.steps[next].pin) return;
    const st = c.scheme.steps[next];
    if (callNorm(v) && callNorm(v) === callNorm(c.caller[st.field || 'pin'])) {
      c.steps[next] = true; SFX.step();
      if (!c.steps.includes(false)) { this.themSay(c, pick(st.field ? ['Did that go through? Lovely.', 'All done? Well, that was easy.'] : ['Ooh, that is the one! How did you know?', 'Yes! That is my PIN. You are very good at this.'])); this.finish(c); }
    } else { SFX.bad(); toast(st.field ? 'That does not match. Ask them to read it out again.' : 'Wrong PIN. Check their files in NosyViewer.', 'bad'); c.trust = clamp(c.trust - 4, 0, 100); }
    OS.refresh();
  },
  /* verify form fields: vals = { field: typedValue }. Returns { ok: [fields], bad: [fields] } */
  submitForm(vals) {
    const out = { ok: [], bad: [] }, c = this.cur; if (this.state !== 'live' || !c.scheme || c.busy) return out;
    const next = c.steps.indexOf(false), st = next >= 0 ? c.scheme.steps[next] : null; if (!st || !st.form) return out;
    c.formBad = c.formBad || {};
    for (const f of st.form) {
      if (c.formOk[f.f]) continue; const v = callNorm(vals[f.f]); if (!v) continue;
      if (v === callNorm(c.caller[f.f])) { c.formOk[f.f] = true; delete c.formBad[f.f]; out.ok.push(f.f); } else { c.formBad[f.f] = true; out.bad.push(f.f); }
    }
    if (out.ok.length) SFX.step();
    if (out.bad.length) { SFX.bad(); toast(out.bad.length + (out.bad.length === 1 ? ' detail does' : ' details do') + ' not match. Ask them to read it out again.', 'bad'); c.trust = clamp(c.trust - 4, 0, 100); }
    if (!out.ok.length && !out.bad.length) toast('Type in what the caller reads out first.');
    if (st.form.every(f => c.formOk[f.f])) { c.steps[next] = true; if (!c.steps.includes(false)) { this.themSay(c, pick(['Did that go through? Lovely.', 'All done? Well, that was easy.'])); this.finish(c); } }
    OS.refresh(); return out;
  },
  finish(c) {
    c.busy = true;
    if (c.caller.baiter) {
      setTimeout(() => {
        if (this.cur !== c || this.state !== 'live') return;
        this.themSay(c, pick(GOTCHA)); c.result = 'baited'; Bus.emit('scam:baited', c); SFX.bad(); OS.cashFx('BAITED', true); G.stats.baited++;
        Game.earn(-Math.min(100 - 40 * Game.lvl('av'), G.personal)); OS.virus(7 - 3 * Game.lvl('av'));
        setTimeout(() => { if (this.cur === c) this.end('baited'); }, 2600);
      }, 1200);
    } else {
      const amt = Math.round(c.scheme.reward * (c.trust >= 80 ? 1.2 : 1) * (1 + 0.1 * Game.lvl('comm')) / 10) * 10;
      c.result = 'paid'; c.paid = amt; Bus.emit('scam:paid', { amt, call: c, scheme: c.scheme }); SFX.cash(); OS.cashFx('+' + money(amt)); G.stats.scams++; Game.earn(amt); Game.addWallet(Math.round(amt * 0.5));
      if (c.trust >= 80) toast('Trust bonus: +20%', 'good');
      setTimeout(() => { if (this.cur === c) this.end('paid'); }, 2300);
    }
    OS.refresh();
  },
  hangup() { if (this.state === 'live') this.end('you'); },
  end(result) {
    const c = this.cur; if (!c || this.state !== 'live') return;
    this.state = 'ended'; this.endLeft = 3.4; c.result = c.result || result; c.busy = c.waiting = false; STT.abort();
    const msg = { hung: c.caller.first + ' hung up.', you: 'You hung up.', cut: 'The boss pulled the plug. Review time.', paid: 'Call complete.', baited: 'They hung up, laughing.', timeout: c.caller.first + ' had to go.' }[result] || 'Call ended.';
    if (result === 'hung' || result === 'timeout') { SFX.hang(); G.stats.hung++; }
    if (result === 'you' || result === 'cut') { SFX.hang(); TTS.stop(); }
    c.history.push({ who: 'sys', text: msg }); Phone.bubble('sys', msg); OS.refresh();
    Bus.emit('call:end', { result: c.result, call: c });
  },
  listen() {
    if (this.state !== 'live' || STT.active) return; const c = this.cur;
    STT.start(
      txt => { if (Phone.alive()) Phone.r.inp.value = txt; },
      txt => {
        if (Phone.alive()) Phone.r.inp.value = ''; Phone.refresh();
        if (this.cur !== c || this.state !== 'live') return;
        if (txt) this.say(txt);
        else if (settings.handsFree && !c.busy && !TTS.speaking && STT.mode() === 'browser') setTimeout(() => { if (this.cur === c && this.state === 'live' && !c.busy) this.listen(); }, 500);
      },
      err => { toast(err, 'bad'); if (settings.handsFree) { settings.handsFree = false; saveSettings(); } Phone.refresh(); });
    setTimeout(() => Phone.refresh(), 60);
  },
  toggleMic() { if (STT.active) STT.stop(); else this.listen(); }
};
