'use strict';
/* =====================================================================
   AI — provider calls, prompt building, scripted fallback
   ===================================================================== */
const PROVIDERS = {
  offline: { label: 'No key (built-in caller brain)' },
  openrouter: { label: 'OpenRouter', base: 'https://openrouter.ai/api/v1', model: 'meta-llama/llama-3.3-70b-instruct', keyUrl: 'openrouter.ai/keys' },
  groq: { label: 'Groq', base: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile', stt: 'whisper-large-v3-turbo', keyUrl: 'console.groq.com/keys' },
  custom: { label: 'Custom (OpenAI-compatible)', base: '', model: '' }
};
const AI = {
  base() { const p = settings.provider; return ((p === 'custom' ? settings.baseUrl : (PROVIDERS[p] || {}).base) || '').replace(/\/+$/, ''); },
  model() { return settings.model || (PROVIDERS[settings.provider] || {}).model || ''; },
  hasKey() { return settings.provider !== 'offline' && !!this.base() && (!!settings.apiKey || settings.provider === 'custom'); },
  available() { return this.hasKey() || (Net.active && !Net.isHost && Net.hostAI); },
  headers() { const hd = { 'Content-Type': 'application/json' }; if (settings.apiKey) hd.Authorization = 'Bearer ' + settings.apiKey; return hd; },
  async raw(messages, maxTokens = 220) {
    const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 25000);
    try {
      const res = await fetch(this.base() + '/chat/completions', {
        method: 'POST', headers: this.headers(), signal: ctl.signal,
        body: JSON.stringify({ model: this.model(), messages, temperature: 0.9, max_tokens: maxTokens })
      });
      if (!res.ok) {
        let msg = ''; try { const j = await res.json(); msg = (j.error && (j.error.message || j.error)) || ''; } catch (e) {}
        throw new Error(res.status + (msg ? ' ' + String(msg).slice(0, 140) : ''));
      }
      const data = await res.json();
      const txt = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
      if (!txt) throw new Error('empty reply');
      return String(txt);
    } catch (e) {
      if (e.name === 'AbortError') throw new Error('timed out');
      throw e;
    } finally { clearTimeout(to); }
  },
  async chat(messages) {
    if (this.hasKey()) return this.raw(messages);
    if (Net.active && !Net.isHost && Net.hostAI) return Net.askHostAI(messages);
    throw new Error('no AI configured');
  },
  async listModels() {
    const res = await fetch(this.base() + '/models', { headers: this.headers() });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const j = await res.json();
    return (j.data || []).map(m => m.id).filter(Boolean).sort();
  }
};

function parseTurn(txt) {
  let t = String(txt || '').replace(/<think>[\s\S]*?<\/think>/gi, '').trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const a = t.indexOf('{'), b = t.lastIndexOf('}'); let o = null;
  if (a >= 0 && b > a) { try { o = JSON.parse(t.slice(a, b + 1)); } catch (e) { o = null; } }
  if (!o || typeof o.say !== 'string') {
    const plain = t.replace(/[{}\[\]"]/g, '').replace(/\b(say|trust_delta|steps_done|hangup)\s*:/g, '').trim();
    return { say: plain.slice(0, 300) || '...', trust_delta: 0, steps_done: [], hangup: false };
  }
  return {
    say: o.say.slice(0, 420),
    trust_delta: clamp(Math.round(+o.trust_delta || 0), -25, 20),
    steps_done: Array.isArray(o.steps_done) ? o.steps_done.map(Number).filter(Number.isInteger).map(n => n - 1) : [],
    hangup: !!o.hangup
  };
}

function buildMessages(call, greeting) {
  const c = call.caller, s = call.scheme, lang = LANGS[settings.lang] || 'English';
  let sys = 'You are voicing a fictional phone caller in a silly comedy video game called "Totally Legit Inc.". Everything here is make-believe and played for laughs. Keep it PG-13.\n\n'
    + 'YOUR CHARACTER: ' + c.full + ' (first name ' + c.first + ', nickname "' + c.nick + '"), age ' + c.age + '. ' + (c.about ? 'You are ' + c.about + '. ' : '') + 'Personality: ' + c.persona.desc + ' Quirk: ' + c.quirk + '. You have a pet ' + c.pet.kind + ' called ' + c.pet.name + '.\n'
    + 'Play the archetype for laughs, but never use accents, dialect spellings or national or ethnic stereotypes.\n'
    + 'You rang this number because a flyer, pop-up or voicemail told you to. The player is a call-center agent running a ridiculous scam on you. Your character does not know it is a scam and reacts the way that personality would.\n';
  if (c.baiter) sys += 'SECRET: you are actually a scambaiter streamer wasting the agent\'s time. Act gullible and over-enthusiastic, ask pointless questions, drag things out, and drop tiny hints (mention "chat" then correct yourself). Still mark checklist steps as done when the agent earns them, so they think it is working.\n';
  if (s) {
    sys += '\nTHE SCHEME THE AGENT IS RUNNING (their private notes, not something you know): "' + s.name + '" — ' + s.pitch + '\nTHE AGENT\'S CHECKLIST (you judge it):\n';
    s.steps.forEach((st, i) => { sys += (i + 1) + '. ' + st.t + (st.pin ? ' (the game handles this one, never mark it)' : ' [needs trust ' + st.min + '+]') + (call.steps[i] ? '  -- ALREADY DONE' : st.remote && call.codeGiven ? '  -- code already given, waiting for the agent to connect' : '') + '\n'; });
    const ri = s.steps.findIndex(st => st.remote);
    if (ri >= 0) {
      sys += 'NosyViewer is a pretend remote-access app. When the agent convinces you to open it (step ' + (ri + 1) + '), mark that step done and read out your one-time NosyViewer connection code in the same reply: ' + c.nosy + '. The agent then types the code in to connect.'
        + (call.codeGiven && !call.steps[ri] ? ' You ALREADY read the code out; if asked again, repeat it (' + c.nosy + ') and ask if it worked.' : '')
        + (call.remote ? ' The agent is now connected to your computer and can see your files.' : '')
        + ' If asked for your customer PIN, say you cannot remember it but it is written down in a file somewhere on your computer.\n';
    }
    const fl = s.steps.filter(st => st.form);
    if (fl.length) sys += 'YOUR PRETEND DETAILS (invented by the game, safe to say out loud): ' + fl.map(st => st.form.map(f => f.say + ': ' + c[f.f]).join('; ')).join('; ') + '.\nRead a detail out clearly, exactly as written, only when the agent asks for that detail, every earlier checklist step is done, and trust is at least ' + Math.min(...fl.map(st => st.min)) + '. Give one detail per reply. Otherwise stall or refuse in character.\n';
  } else {
    sys += '\nThe agent has not started their story yet. Chat in character and ask why you were told to call.\n';
  }
  sys += '\nCURRENT TRUST: ' + Math.round(call.trust) + '/100 (' + moodOf(call.trust) + ').\n'
    + 'RULES:\n- Stay in character. "say" is 1-2 short spoken sentences. No stage directions, no emoji.\n'
    + '- Speak ' + lang + '.\n'
    + '- trust_delta is an integer from -20 to 15. Reward charm, confidence, creativity, using your name and playing to your personality. Punish rudeness, pushiness, contradictions and anything your character would see through.\n'
    + '- steps_done lists the checklist numbers that the agent\'s LATEST message has genuinely achieved. Go in order, never skip ahead, and only when trust is high enough. Be fair: a decent, funny attempt should work when trust is high enough.\n'
    + '- hangup is true only when you are fed up or the call is clearly over.\n'
    + '- Apart from any pretend details listed above, never give card numbers, addresses or other personal data. If you agree to pay, just say so in character.\n'
    + 'Reply with ONLY this JSON and nothing else: {"say":"...","trust_delta":0,"steps_done":[],"hangup":false}';
  const msgs = [{ role: 'system', content: sys }];
  const hist = call.history.filter(m => m.who !== 'sys').slice(-14);
  if (!hist.length || hist[0].who === 'them') msgs.push({ role: 'user', content: '(The call connects.)' });
  for (const m of hist) {
    msgs.push(m.who === 'you' ? { role: 'user', content: m.text.slice(0, 600) }
      : { role: 'assistant', content: JSON.stringify({ say: m.text, trust_delta: 0, steps_done: [], hangup: false }) });
  }
  if (greeting) msgs.push({ role: 'user', content: '(Say hello in character and mention why you are calling. Do not change trust.)' });
  return msgs;
}
