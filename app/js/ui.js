'use strict';
/* =====================================================================
   UI — menus, settings, HUD, review
   ===================================================================== */
const UI = {
  settingsOpen: false, tab: 'player', mpTab: 'host', hostPick: 'week0', hintUntil: 0,

  build() {
    const menu = $('#menu');
    const back = () => h('button', { class: 'btn small back', onclick: () => this.menu('home') }, '← Back');
    menu.append(h('div', { class: 'menu-col' },
      h('div', {}, h('h1', { class: 'logo' }, 'Totally', h('br'), 'Legit ', h('span', { class: 'inc' }, 'Inc.')), h('span', { class: 'stamp' }, '100% not a scam')),
      h('section', { class: 'screen on', 'data-s': 'home' },
        h('p', { class: 'tagline' }, 'A call center with no ethics at all. Run ridiculous scams on gullible callers, hit the daily quota, and try not to get fired.'),
        h('div', { class: 'home-btns' },
          h('button', { class: 'btn primary', onclick: () => this.menu('solo') }, 'Singleplayer'),
          h('button', { class: 'btn', onclick: () => this.menu('multi') }, 'Multiplayer'),
          h('button', { class: 'btn', onclick: () => this.openSettings() }, 'Settings'),
          h('button', { class: 'btn', onclick: () => this.menu('how') }, 'How to play')),
        h('p', { class: 'note', id: 'home-note' })),
      h('section', { class: 'screen', 'data-s': 'solo' }, back(), h('h2', {}, 'Singleplayer'), h('div', { id: 'solo-body', style: { display: 'flex', flexDirection: 'column', gap: '1rem' } })),
      h('section', { class: 'screen', 'data-s': 'multi' }, back(), h('h2', {}, 'Multiplayer'), h('div', { id: 'multi-body', style: { display: 'flex', flexDirection: 'column', gap: '1rem' } })),
      h('section', { class: 'screen how', 'data-s': 'how' }, back(), h('h2', {}, 'How to play'),
        h('ul', {},
          h('li', {}, h('kbd', {}, 'W'), ' ', h('kbd', {}, 'A'), ' ', h('kbd', {}, 'S'), ' ', h('kbd', {}, 'D'), ' to walk, mouse to look, ', h('kbd', {}, 'Shift'), ' to run, ', h('kbd', {}, 'Space'), ' to jump.'),
          h('li', {}, h('kbd', {}, 'E'), ' to sit at a free desk. Your computer opens. The red power button stands you back up.'),
          h('li', {}, 'Answer the phone, pick a scheme, and talk the caller through its checklist. Type, or press the microphone and speak.'),
          h('li', {}, 'Each step needs enough trust. Be charming. Be confident. Use their name. Do not be rude.'),
          h('li', {}, 'You keep half of every scam in your wallet. Spend it in the Upgrades app on your desktop.'),
          h('li', {}, 'In a work week, the team must hit the quota before the performance review. Miss it and everyone is fired.'),
          h('li', {}, 'Scambaiters call from day two. If someone is far too keen, hang up before the last step.'),
          h('li', {}, h('kbd', {}, 'F'), ' or click to throw paper. There are bins. ', h('kbd', {}, 'V'), ' is push-to-talk if you turn that on. ', h('kbd', {}, 'Esc'), ' pauses.'),
          h('li', {}, 'Without an AI key the callers use scripted replies. Add an OpenRouter or Groq key in Settings for real conversations.'))),
      h('div', { class: 'foot' }, 'Version ' + VERSION + (Store.persistent ? '' : '. Saves will not persist in this preview; host the file or open it locally.'))));

    $('#pause').append(h('div', { class: 'modal' }, h('header', {}, h('h2', {}, 'Paused')),
      h('div', { class: 'body' },
        h('p', { class: 'note', id: 'pause-note' }),
        h('button', { class: 'btn primary', onclick: () => Game.pause(false) }, 'Resume'),
        h('button', { class: 'btn', onclick: () => this.openSettings() }, 'Settings'),
        h('button', { class: 'btn danger', onclick: () => Game.quit() }, 'Quit to main menu'))));

    $('#modal-settings').append(h('div', { class: 'modal' },
      h('header', {}, h('h2', {}, 'Settings'), h('button', { class: 'btn small', onclick: () => this.closeSettings() }, 'Done')),
      h('div', { class: 'tabs', id: 'set-tabs' }), h('div', { class: 'body', id: 'set-body' })));
    this.menu('home');
  },

  menu(name) {
    $$('#menu .screen').forEach(s => s.classList.toggle('on', s.dataset.s === name));
    if (name === 'solo') this.renderSolo();
    if (name === 'multi') this.renderMulti();
    if (name === 'home') $('#home-note').textContent = AI.hasKey() ? 'AI callers: ' + PROVIDERS[settings.provider].label + '.' : 'AI callers are off. Callers use scripted replies until you add a key in Settings.';
  },

  weekCard(i, actions) {
    const sv = Saves.week[i], d = sv ? ((sv.day - 1) % 5) : -1;
    return h('div', { class: 'tcard' },
      h('h4', {}, 'Time card ' + (i + 1)),
      sv ? h('div', { class: 'big' }, 'Week ' + Math.ceil(sv.day / 5)) : h('div', { class: 'big' }, 'Blank'),
      h('div', { class: 'days' }, DAYS.map((n, k) => h('span', { class: sv ? (k < d ? 'done' : k === d ? 'now' : '') : '' }, n.slice(0, 2)))),
      h('div', { class: 'sub' }, sv ? 'Next: ' + DAYS[d] + '. Banked ' + money(sv.bank) + '.' : 'No shifts worked yet.'),
      h('div', { class: 'acts' }, actions(sv)));
  },
  dayLenField() {
    return h('label', { class: 'field', style: { maxWidth: '16rem' } }, h('span', {}, 'Day length for new weeks'),
      h('select', { onchange: e => { settings.dayLen = +e.target.value; saveSettings(); } },
        [[180, 'Short (3 minutes)'], [300, 'Normal (5 minutes)'], [480, 'Long (8 minutes)']].map(o => h('option', { value: o[0], selected: settings.dayLen === o[0] }, o[1]))));
  },
  renderSolo() {
    const e = Saves.endless;
    $('#solo-body').replaceChildren(
      h('div', { class: 'panel' }, h('h3', {}, 'Work week'),
        h('p', { class: 'note' }, 'Monday to Friday. Hit the quota before each performance review or you are fired. Progress saves after every day you survive.'),
        h('div', { class: 'cards' }, [0, 1, 2].map(i => this.weekCard(i, sv => sv
          ? [h('button', { class: 'btn small primary', onclick: () => Game.startSolo('week', i) }, 'Continue'), h('button', { class: 'btn small', onclick: () => { Saves.week[i] = null; writeSaves(); this.renderSolo(); } }, 'Erase')]
          : [h('button', { class: 'btn small primary', onclick: () => Game.startSolo('week', i) }, 'Start a week')]))),
        this.dayLenField()),
      h('div', { class: 'panel' }, h('h3', {}, 'Endless calls'),
        h('p', { class: 'note' }, 'No quota and no review. Calls keep coming, new schemes unlock as your total grows, and the total is saved.'),
        h('p', {}, e ? 'Total so far: ' + money(e.total) + '. Scams closed: ' + ((e.stats && e.stats.scams) || 0) + '.' : 'No overtime worked yet.'),
        h('div', { class: 'row' },
          h('button', { class: 'btn primary', onclick: () => Game.startSolo('endless', 0) }, e ? 'Continue endless' : 'Start endless'),
          e ? h('button', { class: 'btn small', onclick: () => { Saves.endless = null; writeSaves(); this.renderSolo(); } }, 'Reset total') : null)));
  },
  renderMulti() {
    const body = $('#multi-body'), status = h('p', { class: 'status', id: 'mp-status' });
    const seg = h('div', { class: 'seg' },
      h('button', { class: this.mpTab === 'host' ? 'on' : '', onclick: () => { this.mpTab = 'host'; this.renderMulti(); } }, 'Host a room'),
      h('button', { class: this.mpTab === 'join' ? 'on' : '', onclick: () => { this.mpTab = 'join'; this.renderMulti(); } }, 'Join a room'));
    const busy = (btn, on) => { btn.disabled = on; };
    let panel;
    if (this.mpTab === 'host') {
      const e = Saves.endless;
      const opts = [0, 1, 2].map(i => { const sv = Saves.week[i]; return ['week' + i, 'Work week, time card ' + (i + 1) + (sv ? ' (week ' + Math.ceil(sv.day / 5) + ', ' + DAYS[(sv.day - 1) % 5] + ')' : ' (new)')]; }).concat([['endless', 'Endless calls' + (e ? ' (' + money(e.total) + ' so far)' : '')]]);
      const go = h('button', { class: 'btn primary', onclick: async () => {
        busy(go, true); status.className = 'status'; status.textContent = 'Opening a room…';
        try { const p = this.hostPick; await Game.startHost(p === 'endless' ? 'endless' : 'week', p === 'endless' ? 0 : +p.slice(4)); }
        catch (err) { status.className = 'status bad'; status.textContent = err.message; busy(go, false); }
      } }, 'Create room');
      panel = h('div', { class: 'panel' },
        h('label', { class: 'field' }, h('span', {}, 'What to play (uses your saves)'), h('select', { onchange: e2 => { this.hostPick = e2.target.value; } }, opts.map(o => h('option', { value: o[0], selected: this.hostPick === o[0] }, o[1])))),
        this.dayLenField(),
        h('p', { class: 'note' }, 'You get a room code to share. Friends can join at any time. Only the host needs an AI key; everyone else\'s callers run through yours.'),
        h('div', { class: 'row' }, go));
    } else {
      const inp = h('input', { class: 'inp code-inp', type: 'text', maxLength: 5, placeholder: 'CODE', autocomplete: 'off', onkeydown: e2 => { if (e2.key === 'Enter') go.click(); } });
      const go = h('button', { class: 'btn primary', onclick: async () => {
        busy(go, true); status.className = 'status'; status.textContent = 'Joining…';
        try { await Game.joinRoom(inp.value); }
        catch (err) { status.className = 'status bad'; status.textContent = err.message; busy(go, false); }
      } }, 'Join room');
      panel = h('div', { class: 'panel' }, h('label', { class: 'field' }, h('span', {}, 'Room code from the host'), inp), h('div', { class: 'row' }, go));
    }
    const adv = h('details', { class: 'note' }, h('summary', {}, 'Advanced: use your own matchmaking server'),
      h('div', { class: 'row', style: { marginTop: '.5rem' } },
        h('label', { class: 'field grow' }, h('span', {}, 'PeerJS host (blank = public server)'), h('input', { type: 'text', value: settings.peerHost, placeholder: 'my-peer-server.example.com', onchange: e2 => { settings.peerHost = e2.target.value.trim(); saveSettings(); } })),
        h('label', { class: 'field', style: { width: '6rem' } }, h('span', {}, 'Port'), h('input', { type: 'text', value: settings.peerPort, placeholder: '443', onchange: e2 => { settings.peerPort = e2.target.value.trim(); saveSettings(); } })),
        h('label', { class: 'field', style: { width: '7rem' } }, h('span', {}, 'Path'), h('input', { type: 'text', value: settings.peerPath, onchange: e2 => { settings.peerPath = e2.target.value.trim() || '/'; saveSettings(); } })),
        h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: settings.peerSecure, onchange: e2 => { settings.peerSecure = e2.target.checked; saveSettings(); } }), 'HTTPS')));
    body.replaceChildren(seg, panel, status,
      h('p', { class: 'note' }, 'Voice chat is proximity based: teammates get quieter as you walk away. Your browser will ask for the microphone when you connect. Up to 6 players; voice works best with 4 or fewer.'), adv);
  },

  /* ----- settings ----- */
  openSettings() { this.settingsOpen = true; $('#modal-settings').classList.remove('hidden'); releaseLock(); this.renderSettings(); },
  closeSettings() {
    this.settingsOpen = false; $('#modal-settings').classList.add('hidden'); saveSettings();
    if (G.phase === 'menu') this.menu($$('#menu .screen.on')[0].dataset.s); else { OS.refresh(); if (OS.wins.has('memo')) { OS.close('memo'); OS.launch('memo', true); } }
  },
  renderSettings() {
    const tabs = [['player', 'Player'], ['controls', 'Controls'], ['sound', 'Sound and voice'], ['ai', 'AI callers'], ['other', 'Graphics and data']];
    $('#set-tabs').replaceChildren(...tabs.map(t => h('button', { class: this.tab === t[0] ? 'on' : '', onclick: () => { this.tab = t[0]; this.renderSettings(); } }, t[1])));
    const S = settings, save = saveSettings, body = $('#set-body');
    const field = (label, ctl, extra) => h('label', { class: 'field' }, h('span', {}, label), ctl, extra);
    const range = (key, min, max, step, after) => h('input', { type: 'range', min, max, step, value: S[key], oninput: e => { S[key] = +e.target.value; save(); after && after(); } });
    const select = (key, opts, after) => h('select', { onchange: e => { S[key] = e.target.value; save(); after && after(); } }, opts.map(o => h('option', { value: o[0], selected: String(S[key]) === String(o[0]) }, o[1])));
    const check = (key, label, after) => h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!S[key], onchange: e => { S[key] = e.target.checked; save(); after && after(); } }), label);
    let kids = [];
    if (this.tab === 'player') {
      kids = [
        field('Name (shown above your head)', h('input', { type: 'text', maxLength: 18, value: S.name, oninput: e => { S.name = e.target.value.trim().slice(0, 18) || 'Agent'; save(); } })),
        h('div', { class: 'field' }, h('span', {}, 'Shirt colour'), h('div', { class: 'swatches' }, SHIRTS.map(c => h('button', { class: S.color === c ? 'on' : '', style: { background: c }, title: c, onclick: () => { S.color = c; save(); this.renderSettings(); } }))))];
    } else if (this.tab === 'controls') {
      kids = [field('Mouse sensitivity', range('sens', 0.2, 3, 0.05)), check('invertY', 'Invert vertical look'), field('Field of view', range('fov', 55, 100, 1, applyQuality)),
        h('p', { class: 'note' }, 'Click the game to capture the mouse. If your browser will not capture it, hold the left button and drag to look around.')];
    } else if (this.tab === 'sound') {
      const micMsg = h('span', { class: 'note' });
      kids = [field('Master volume', range('master', 0, 1, 0.01, () => AudioSys.applyVolumes())), field('Sound effects', range('sfx', 0, 1, 0.01, () => { AudioSys.applyVolumes(); SFX.click(); })),
        field('Teammate voices', range('voice', 0, 1.5, 0.01, () => AudioSys.applyVolumes())), field('Caller voice', range('callerVoice', 0, 1, 0.01)),
        check('tts', 'Callers speak out loud (uses your browser\'s built-in voices)'),
        field('Your microphone in multiplayer', select('micMode', [['open', 'Always on'], ['ptt', 'Push to talk (hold V)'], ['off', 'Off']], () => { Voice.applyMode(); if (Net.active && S.micMode !== 'off' && !Voice.real) Voice.getMic(true); })),
        h('div', { class: 'row' }, h('button', { class: 'btn small', onclick: async () => { AudioSys.resume(); const s = await Voice.getMic(true); micMsg.textContent = s ? 'Microphone is working.' : 'No microphone access. Check the browser permission for this page.'; } }, 'Test microphone'), micMsg)];
    } else if (this.tab === 'ai') {
      const P0 = PROVIDERS[S.provider] || {}, msg = h('p', { class: 'status' }), dl = h('datalist', { id: 'model-list' });
      const keyInp = h('input', { type: 'password', value: S.apiKey, placeholder: S.provider === 'custom' ? 'Optional for local servers' : 'Paste your key', autocomplete: 'off', oninput: e => { S.apiKey = e.target.value.trim(); save(); } });
      const modelInp = h('input', { type: 'text', value: S.model, placeholder: P0.model || 'model id', oninput: e => { S.model = e.target.value.trim(); save(); } }); modelInp.setAttribute('list', 'model-list');
      kids = [field('Who plays the callers', select('provider', Object.keys(PROVIDERS).map(k => [k, PROVIDERS[k].label]), () => { S.model = ''; save(); this.renderSettings(); }))];
      if (S.provider !== 'offline') {
        if (S.provider === 'custom') kids.push(field('Base URL (ends in /v1)', h('input', { type: 'text', value: S.baseUrl, placeholder: 'https://example.com/v1', oninput: e => { S.baseUrl = e.target.value.trim(); save(); } })));
        kids.push(
          field('API key' + (P0.keyUrl ? ' (get one at ' + P0.keyUrl + ')' : ''), h('div', { class: 'row' }, h('div', { class: 'grow' }, keyInp), h('button', { class: 'btn small', onclick: e => { e.preventDefault(); keyInp.type = keyInp.type === 'password' ? 'text' : 'password'; } }, 'Show'))),
          field('Model' + (P0.model ? ' (blank uses ' + P0.model + ')' : ''), h('div', { class: 'row' }, h('div', { class: 'grow' }, modelInp, dl),
            h('button', { class: 'btn small', onclick: async e => { e.preventDefault(); msg.className = 'status'; msg.textContent = 'Loading models…'; try { const list = await AI.listModels(); dl.replaceChildren(...list.map(id => h('option', { value: id }))); msg.className = 'status ok'; msg.textContent = list.length + ' models loaded. Start typing in the model box to pick one.'; } catch (er) { msg.className = 'status bad'; msg.textContent = 'Could not load models: ' + er.message; } } }, 'Load models'))),
          h('div', { class: 'row' }, h('button', { class: 'btn small good', onclick: async () => {
            msg.className = 'status'; msg.textContent = 'Testing…';
            try { const t = await AI.raw([{ role: 'user', content: 'Reply with one short friendly sentence.' }], 40); msg.className = 'status ok'; msg.textContent = 'Working. The model said: ' + t.trim().slice(0, 90); }
            catch (er) { msg.className = 'status bad'; msg.textContent = 'Failed: ' + er.message + (/fetch|network/i.test(er.message) ? '. If this is a preview window, outside requests are blocked; host the file or open it locally.' : ''); }
          } }, 'Test connection')), msg,
          h('p', { class: 'note warn' }, 'Your key is stored only in this browser. Never put a key inside the file you upload to GitHub. In multiplayer only the host needs one.'));
      } else kids.push(h('p', { class: 'note' }, 'The built-in caller brain works offline: it reads what you mean, remembers the call, catches you changing your story and judges you the way each personality would. An AI key gives callers fully open-ended conversations.'));
      kids.push(
        field('Call language', select('lang', Object.keys(LANGS).map(k => [k, LANGS[k]]))),
        field('Talking to callers with your microphone', select('sttMode', [['auto', 'Automatic'], ['browser', 'Browser speech recognition (Chrome, Edge)'], ['whisper', 'Whisper through your Groq or custom key'], ['off', 'Off, I will type']])),
        h('p', { class: 'note' }, 'Voice input right now: ' + ({ browser: 'browser speech recognition', whisper: 'Whisper through your API key', none: 'not available with these settings' })[STT.mode()] + '. Scripted callers only understand English.'));
    } else {
      const eraseMsg = h('span', { class: 'note' });
      kids = [field('Graphics quality', select('quality', [['low', 'Low'], ['med', 'Medium'], ['high', 'High']], applyQuality)), check('npcs', 'Show coworkers at the other desks', applyQuality),
        h('div', { class: 'row' }, h('button', { class: 'btn small danger', onclick: () => { Saves.week = [null, null, null]; Saves.endless = null; writeSaves(); eraseMsg.textContent = 'All saves erased.'; } }, 'Erase all saves'), eraseMsg),
        h('p', { class: 'note' }, Store.persistent ? 'Saves and settings are kept in this browser.' : 'This window cannot store data, so saves and settings last only until you close it.')];
    }
    body.replaceChildren(...kids.filter(Boolean));
  },

  /* ----- HUD ----- */
  dayCard(title, sub) {
    const c = $('#daycard'); c.replaceChildren(h('h1', {}, title), h('p', {}, sub)); c.classList.add('on');
    clearTimeout(this._dc); this._dc = setTimeout(() => c.classList.remove('on'), 2600); this.hintUntil = now() + 14;
  },
  hud() {
    const st = $('#hud-stats');
    if (G.mode === 'week') st.innerHTML = DAYS[(G.day - 1) % 5] + '<br><span class="g">Team ' + money(G.team) + '</span> / <span class="q">' + money(G.quota) + '</span><br>'
      + (G.phase === 'day' ? '<span class="r">Review in ' + fmtTime(G.timeLeft) + '</span>' : G.phase === 'lobby' ? '<span class="q">Shift not started</span>' : '<span class="r">Performance review</span>');
    else st.innerHTML = 'Overtime<br><span class="g">Team total ' + money(G.team) + '</span><br>' + (G.phase === 'lobby' ? '<span class="q">Shift not started</span>' : 'You ' + money(G.personal));
    const pr = $('#hud-prompt'), lab = W.cur && W.cur.label();
    pr.classList.toggle('hidden', !lab); if (lab) pr.innerHTML = '<kbd>E</kbd> ' + lab;
    $('#crosshair').classList.toggle('hidden', !Game.canControl());
    $('#hud-ring').classList.toggle('hidden', !(Call.state === 'ringing' && !P.seated));
    const left = [];
    if (Net.active) {
      left.push('<div class="chip room">Room <b>' + Net.room + '</b> &nbsp; ' + Net.players.size + ' online</div>');
      left.push('<div class="chip ' + (Voice.talking ? 'live' : 'mute') + '">' + (!Voice.real ? 'Mic off' : settings.micMode === 'ptt' ? (Voice.ptt ? 'Talking' : 'Hold V to talk') : settings.micMode === 'off' ? 'Mic off' : (Voice.talking ? 'Talking' : 'Mic on')) + '</div>');
    }
    if (G.phase === 'lobby') left.push('<div class="chip">' + (Game.authority() ? 'Press <kbd>Enter</kbd> to start the shift' : 'Waiting for the host to start the shift') + '</div>');
    if (P.boost > 0) left.push('<div class="chip">Caffeinated ' + Math.ceil(P.boost) + 's</div>');
    const html = left.join(''); const hl = $('#hud-left'); if (hl._h !== html) { hl._h = html; hl.innerHTML = html; }
    $('#hud-hint').classList.toggle('hidden', !(now() < this.hintUntil && Game.canControl()));
  },

  /* ----- review ----- */
  showReview(res) {
    const el = $('#review'); el.classList.remove('hidden');
    const lines = h('div', { class: 'lines' }), verdict = h('div', { class: 'verdict ' + (res.pass ? 'pass' : 'fail') }, res.pass ? 'Quota met' : 'Fired'), acts = h('div', { class: 'row' });
    const table = h('table', {}, res.players.map(p => h('tr', {}, h('td', {}, p.name), h('td', {}, money(p.personal)))), h('tr', {}, h('td', {}, h('b', {}, 'Team / quota')), h('td', {}, h('b', {}, money(res.team) + ' / ' + money(res.quota)))));
    el.replaceChildren(h('div', { class: 'rv' }, h('h2', {}, 'Performance review'), verdict, lines, table, acts));
    res.lines.forEach((l, i) => setTimeout(() => { if (G.result !== res) return; lines.append(h('p', {}, l)); SFX.click(); }, 500 + i * 1250));
    setTimeout(() => {
      if (G.result !== res) return;
      verdict.classList.add('on'); res.pass ? SFX.pass() : SFX.fired();
      if (Game.authority()) acts.append(
        res.pass ? h('button', { class: 'btn primary', onclick: () => Game.nextDay() }, 'Start ' + DAYS[res.day % 5]) : h('button', { class: 'btn primary', onclick: () => Game.retryDay() }, 'Beg for another chance (retry ' + DAYS[(res.day - 1) % 5] + ')'),
        h('button', { class: 'btn', onclick: () => Game.quit() }, res.pass ? 'Save and quit' : 'Quit to main menu'));
      else acts.append(h('span', { class: 'note', style: { color: 'inherit' } }, 'Waiting for the host…'), h('button', { class: 'btn small', onclick: () => Game.quit() }, 'Leave'));
    }, 600 + res.lines.length * 1250);
  }
};
