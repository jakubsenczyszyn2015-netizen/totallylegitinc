'use strict';
/* =====================================================================
   UI — menus, settings, HUD, review
   ===================================================================== */
/* small inline icons for the menus (white glyphs on coloured tiles) */
const UI_IC = {
  phone: '<svg viewBox="0 0 24 24"><path d="M7.2 3.2c.5-.4 1.3-.3 1.7.3l1.9 2.8c.4.6.3 1.3-.2 1.8l-1.3 1.2c.9 1.9 2.4 3.5 4.3 4.5l1.3-1.3c.5-.5 1.2-.6 1.8-.2l2.8 1.9c.6.4.7 1.2.3 1.8l-1.3 1.8c-.6.8-1.7 1.2-2.7.9C10.5 17.4 6.6 13.5 5.3 8.2c-.3-1 .1-2.1.9-2.7z"/></svg>',
  team: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.4"/><circle cx="16.8" cy="9.2" r="2.7"/><path d="M2.6 19.5c.2-3.6 2.9-6 6.4-6s6.2 2.4 6.4 6z"/><path d="M15.2 13.7c.5-.1 1-.2 1.6-.2 2.9 0 4.6 2 4.7 4.9h-4.6c-.2-1.8-.7-3.4-1.7-4.7z"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><path fill-rule="evenodd" d="M10.3 2.5h3.4l.5 2.6 1.6.7 2.2-1.5 2.4 2.4-1.5 2.2.7 1.6 2.6.5v3.4l-2.6.5-.7 1.6 1.5 2.2-2.4 2.4-2.2-1.5-1.6.7-.5 2.6h-3.4l-.5-2.6-1.6-.7-2.2 1.5-2.4-2.4 1.5-2.2-.7-1.6-2.6-.5v-3.4l2.6-.5.7-1.6-1.5-2.2 2.4-2.4 2.2 1.5 1.6-.7zM12 8.6a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8z"/></svg>',
  help: '<svg viewBox="0 0 24 24"><path d="M4 3.5h16c.8 0 1.5.7 1.5 1.5v10.5c0 .8-.7 1.5-1.5 1.5h-8.3L6.5 21v-4H4c-.8 0-1.5-.7-1.5-1.5V5c0-.8.7-1.5 1.5-1.5z"/><path fill="var(--tc,#2a9d5c)" d="M10 8.6c.1-1.3 1-2.1 2.2-2.1 1.3 0 2.2.8 2.2 1.9 0 .9-.5 1.4-1.2 1.8-.5.3-.6.5-.6 1v.3h-1.4v-.4c0-.9.3-1.4 1-1.8.5-.3.7-.5.7-.9 0-.4-.3-.7-.7-.7-.5 0-.8.3-.8.9zm1.1 4.1h1.6v1.5h-1.6z"/></svg>',
  clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="M11 6.5h2.2v5l3.4 2.2-1.1 1.8-4.5-2.8z"/></svg>',
  copy: '<svg viewBox="0 0 24 24"><path d="M8 3h10.5c.8 0 1.5.7 1.5 1.5V16h-2.5V5.5H8z"/><rect x="4" y="7" width="12" height="14" rx="1.6"/></svg>'
};
/* the controls panel: [keys, what] (the same list is in How to play) */
const UI_KEYS = [
  [['W', 'A', 'S', 'D'], 'Walk'], [['Shift'], 'Sprint'], [['Space'], 'Jump'], [['E'], 'Interact / pick up'],
  [['LMB'], 'Use item (hold to spray)'], [['F'], 'Throw'], [['G'], 'Drop'], [['Q', 'RMB'], 'Punch'],
  [['1-6', 'Wheel'], 'Pick item'], [['C'], 'Camera view'], [['V'], 'Push to talk'], [['Esc'], 'Pause']];
function copyText(s) {
  try { if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(s).then(() => true, () => copyFallback(s)); } catch (e) {}
  return Promise.resolve(copyFallback(s));
}
function copyFallback(s) { const t = h('textarea', { value: s, style: { position: 'fixed', opacity: 0 } }); document.body.append(t); t.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (e) {} t.remove(); return ok; }

const UI = {
  settingsOpen: false, tab: 'player', mpTab: 'host', hostPick: 'week0', hintUntil: 0, keysOpen: false,

  build() {
    const menu = $('#menu');
    const back = () => h('button', { class: 'btn small back', onclick: () => this.menu('home') }, '← Back');
    const mbtn = (cls, ic, color, label, sub, fn) => { const b = h('button', { class: 'btn mbtn ' + cls, onclick: fn },
      h('i', { class: 'mi', html: UI_IC[ic] }), h('span', { class: 'ml' }, h('b', {}, label), h('small', {}, sub))); b.style.setProperty('--tc', color); return b; };
    const head = (title, kicker) => h('div', { class: 'scr-head' }, back(), h('div', {}, h('small', {}, kicker), h('h2', {}, title)));
    menu.append(h('div', { class: 'menu-col' },
      h('div', { class: 'brand' },
        h('h1', { class: 'logo', 'aria-label': 'Totally Legit Inc.' },
          h('span', { class: 'l1', 'data-t': 'Totally' }, 'Totally'),
          h('span', { class: 'l2' }, h('span', { class: 'lg', 'data-t': 'Legit' }, 'Legit'), h('span', { class: 'inc' }, 'Inc.'))),
        h('span', { class: 'stamp' }, '100% not a scam')),
      h('section', { class: 'screen on', 'data-s': 'home' },
        h('p', { class: 'tagline' }, 'A call center with no ethics at all. Run ridiculous scams on gullible callers, hit the daily quota, and try not to get fired.'),
        h('div', { class: 'home-btns' },
          mbtn('primary', 'phone', '#e8562a', 'Singleplayer', 'Clock in alone. Your week is saved.', () => this.menu('solo')),
          mbtn('', 'team', '#2f7cf6', 'Multiplayer', 'Host or join a room, up to 6 agents', () => this.menu('multi')),
          mbtn('', 'gear', '#6b7489', 'Settings', 'Sound, controls, AI callers, graphics', () => this.openSettings()),
          mbtn('', 'help', '#2a9d5c', 'How to play', 'Controls and Scamming 101', () => this.menu('how'))),
        h('p', { class: 'note', id: 'home-note' })),
      h('section', { class: 'screen', 'data-s': 'solo' }, head('Singleplayer', 'Clock in'), h('div', { id: 'solo-body', class: 'scr-body' })),
      h('section', { class: 'screen', 'data-s': 'multi' }, head('Multiplayer', 'Bring coworkers'), h('div', { id: 'multi-body', class: 'scr-body' })),
      h('section', { class: 'screen how', 'data-s': 'how' }, head('How to play', 'Employee handbook'), this.howBody()),
      h('div', { class: 'foot' }, 'Version ' + VERSION + ' · Totally Legit Inc. is a work of fiction. Please do not scam anyone.' + (Store.persistent ? '' : ' Saves will not persist in this preview; host the file or open it locally.'))),
      h('div', { class: 'ticker', 'aria-hidden': 'true' }, h('b', {}, 'BONK NEWS'), h('div', { class: 'tk-run' }, h('span', {}, this.tickerText()), h('span', {}, this.tickerText()))));

    $('#pause').append(h('div', { class: 'modal pause-m' }, h('header', {}, h('div', {}, h('small', {}, 'Coffee break'), h('h2', {}, 'Paused'))),
      h('div', { class: 'body' },
        h('p', { class: 'note', id: 'pause-note' }),
        h('div', { id: 'pause-room' }),
        h('button', { class: 'btn primary', onclick: () => Game.pause(false) }, 'Resume'),
        h('button', { class: 'btn', onclick: () => this.openSettings() }, 'Settings'),
        h('button', { class: 'btn danger', onclick: () => Game.quit() }, 'Quit to main menu'))));

    $('#modal-settings').append(h('div', { class: 'modal set-m' },
      h('header', {}, h('div', {}, h('small', {}, 'Totally Legit Inc. · employee preferences'), h('h2', {}, 'Settings')), h('button', { class: 'btn small primary', onclick: () => this.closeSettings() }, 'Done')),
      h('div', { class: 'tabs', id: 'set-tabs' }), h('div', { class: 'body', id: 'set-body' })));

    // walking HUD: one controls panel (props' #keyhint is folded into it), and the multiplayer lobby card
    const hint = $('#hud-hint');
    hint.replaceChildren(h('div', { class: 'kh-head' }, h('b', {}, 'Controls'), h('span', {}, h('kbd', {}, 'H'), ' hide')),
      h('div', { class: 'kh-grid' }, UI_KEYS.map(k => h('div', { class: 'kh-row' }, h('span', { class: 'kh-k' }, k[0].map(x => h('kbd', {}, x))), h('span', {}, k[1])))),
      h('div', { class: 'kh-mini' }, h('kbd', {}, 'H'), ' Controls'));
    $('#hud').append(h('div', { id: 'hud-lobby', class: 'hidden' }));
    window.addEventListener('keydown', e => {
      if (e.code !== 'KeyH' || e.repeat || G.phase === 'menu' || /INPUT|TEXTAREA|SELECT/.test((e.target && e.target.tagName) || '')) return;
      const full = this.keysOpen || now() < this.hintUntil; this.keysOpen = !full; this.hintUntil = 0; this.hud();
    });
    const _pause = Game.pause;
    Game.pause = function (on) { const r = _pause.apply(this, arguments); if (on) try { UI.pauseRoom(); } catch (e) {} return r; };
    this.menu('home');
  },
  tickerText() {
    return ['Totally Legit Inc. posts record quarter, declines to explain how', 'Local grandma "very happy" with her new $400 jet ski voucher',
      'BonkMart Market now sells airstrikes in bulk', 'HR reminds staff that the break-room fridge is not a hiding place', 'The Boss names himself Employee of the Month for the 31st month running',
      'Study: 9 out of 10 callers trust anyone who says "totally legit"', 'Rival call center Even More Legit LLC reports a small fire'].join('   ★   ') + '   ★   ';
  },
  howBody() {
    const step = (n, title, txt) => h('li', {}, h('b', { class: 'n' }, n), h('div', {}, h('b', {}, title), h('p', {}, txt)));
    return h('div', { class: 'how-grid' },
      h('div', { class: 'panel' }, h('h3', {}, 'The job'),
        h('ol', { class: 'steps' },
          step(1, 'Sit at a free desk', 'Walk up and press E. Your LegitOS computer boots. The red power button stands you back up.'),
          step(2, 'Answer the phone', 'Pick a scheme on the desktop and talk the caller through its checklist. Type, or use the microphone.'),
          step(3, 'Earn their trust', 'Every step needs enough trust. Be charming and confident, use their name, never be rude.'),
          step(4, 'Get paid, then shop', 'Scams pay the team. You keep a cut in your wallet to spend at BonkMart Market.'),
          step(5, 'Beat the quota', 'Hit the team quota before the performance review, or The Boss fires everyone.'))),
      h('div', { class: 'panel' }, h('h3', {}, 'Controls'),
        h('div', { class: 'keys' }, UI_KEYS.concat([[['H'], 'Show or hide controls'], [['Enter'], 'Start the shift (host)']]).map(k => h('div', { class: 'kh-row' }, h('span', { class: 'kh-k' }, k[0].map(x => h('kbd', {}, x))), h('span', {}, k[1]))))),
      h('div', { class: 'panel tips' }, h('h3', {}, 'Tips from HR'),
        h('ul', {},
          h('li', {}, 'Scambaiters call from day two. If a caller is far too keen, hang up before the last step.'),
          h('li', {}, 'Paper balls go in the bins. Coworkers can be slapped. HR is understaffed.'),
          h('li', {}, 'No AI key? The built-in caller brain works offline. Add an OpenRouter or Groq key in Settings for open-ended conversations.'))));
  },

  menu(name) {
    $$('#menu .screen').forEach(s => s.classList.toggle('on', s.dataset.s === name));
    $('#menu .menu-col').classList.toggle('sub', name !== 'home');
    if (name === 'solo') this.renderSolo();
    if (name === 'multi') this.renderMulti();
    if (name === 'home') {
      const n = $('#home-note'), on = AI.hasKey();
      n.replaceChildren(h('i', { class: 'dot ' + (on ? 'on' : '') }), on ? 'AI callers: ' + PROVIDERS[settings.provider].label + '.' : 'AI callers are off. Callers use the built-in offline brain until you add a key in Settings.');
      queueMicrotask(() => this.decorate());
    }
  },
  /* the avatars module adds a plain "Character" button to the home menu: give it the same tile + subtitle look */
  decorate() {
    const b = $('#menu .home-btns .cz-open'); if (!b || b.querySelector('.ml')) return;
    const ic = b.querySelector('.cz-ic'); b.style.setProperty('--tc', '#8a5cf6');
    b.replaceChildren(h('i', { class: 'mi' }, ic), h('span', { class: 'ml' }, h('b', {}, 'Character'), h('small', {}, 'Hair, glasses, shirt and shoes')));
  },

  weekCard(i, actions) {
    const sv = Saves.week[i], d = sv ? ((sv.day - 1) % 5) : -1;
    return h('div', { class: 'tcard' + (sv ? '' : ' blank') },
      h('div', { class: 'tc-top' }, h('h4', {}, 'Time card'), h('span', { class: 'tc-no' }, '#' + String(i + 1).padStart(2, '0'))),
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
      h('div', { class: 'panel endless' }, h('h3', {}, 'Endless calls'),
        h('p', { class: 'note' }, 'No quota and no review. Calls keep coming, new schemes unlock as your total grows, and the total is saved.'),
        e ? h('div', { class: 'stats' }, h('div', {}, h('small', {}, 'Total so far'), h('b', {}, money(e.total))), h('div', {}, h('small', {}, 'Scams closed'), h('b', {}, String((e.stats && e.stats.scams) || 0))))
          : h('p', {}, 'No overtime worked yet.'),
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
        h('p', { class: 'note' }, 'You get a 5-letter room code to share. Friends can join at any time. Only the host needs an AI key; everyone else\'s callers run through yours.'),
        h('div', { class: 'row' }, go));
    } else {
      const inp = h('input', { class: 'inp code-inp', type: 'text', maxLength: 5, placeholder: 'CODE', autocomplete: 'off', spellcheck: false, onkeydown: e2 => { if (e2.key === 'Enter') go.click(); } });
      const go = h('button', { class: 'btn primary', onclick: async () => {
        busy(go, true); status.className = 'status'; status.textContent = 'Joining…';
        try { await Game.joinRoom(inp.value); }
        catch (err) { status.className = 'status bad'; status.textContent = err.message; busy(go, false); }
      } }, 'Join room');
      panel = h('div', { class: 'panel' }, h('label', { class: 'field' }, h('span', {}, 'Room code from the host'), inp), h('div', { class: 'row' }, go));
    }
    const adv = h('details', { class: 'note adv' }, h('summary', {}, 'Advanced: use your own matchmaking server'),
      h('div', { class: 'row', style: { marginTop: '.5rem' } },
        h('label', { class: 'field grow' }, h('span', {}, 'PeerJS host (blank = public server)'), h('input', { type: 'text', value: settings.peerHost, placeholder: 'my-peer-server.example.com', onchange: e2 => { settings.peerHost = e2.target.value.trim(); saveSettings(); } })),
        h('label', { class: 'field', style: { width: '6rem' } }, h('span', {}, 'Port'), h('input', { type: 'text', value: settings.peerPort, placeholder: '443', onchange: e2 => { settings.peerPort = e2.target.value.trim(); saveSettings(); } })),
        h('label', { class: 'field', style: { width: '7rem' } }, h('span', {}, 'Path'), h('input', { type: 'text', value: settings.peerPath, onchange: e2 => { settings.peerPath = e2.target.value.trim() || '/'; saveSettings(); } })),
        h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: settings.peerSecure, onchange: e2 => { settings.peerSecure = e2.target.checked; saveSettings(); } }), 'HTTPS')));
    body.replaceChildren(seg, panel, status,
      h('p', { class: 'note' }, 'Voice chat is proximity based: teammates get quieter as you walk away. Your browser will ask for the microphone when you connect. Up to 6 players; voice works best with 4 or fewer.'), adv);
  },

  /* ----- room code (lobby card, pause menu) ----- */
  roomCode(cls) {
    const code = Net.room || '', btn = h('button', { class: 'btn small rc-copy', html: UI_IC.copy + '<span>Copy</span>', onclick: e => {
      e.stopPropagation(); copyText(code).then(ok => { btn.lastChild.textContent = ok ? 'Copied!' : 'Copy failed'; setTimeout(() => { btn.lastChild.textContent = 'Copy'; }, 1600); });
    } });
    return h('div', { class: 'rcode ' + (cls || '') }, h('small', {}, 'Room code'), h('div', { class: 'rc-row' }, h('div', { class: 'rc-letters' }, [...code].map(c => h('b', {}, c))), btn));
  },
  pauseRoom() { const el = $('#pause-room'); if (el) el.replaceChildren(...(Net.active && Net.room ? [this.roomCode('in-pause')] : [])); },

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
    /* sliders show their value and fill up to the thumb (--p) */
    const range = (key, min, max, step, after, fmt) => {
      fmt = fmt || (max <= 1.5 ? v => Math.round(v * 100) + '%' : v => String(v));
      const out = h('output', {}, fmt(S[key])), paint = el => el.style.setProperty('--p', ((S[key] - min) / (max - min) * 100) + '%');
      const inp = h('input', { type: 'range', min, max, step, value: S[key], oninput: e => { S[key] = +e.target.value; out.textContent = fmt(S[key]); paint(e.target); save(); after && after(); } });
      paint(inp); return h('div', { class: 'rng' }, inp, out);
    };
    const select = (key, opts, after) => h('select', { onchange: e => { S[key] = e.target.value; save(); after && after(); } }, opts.map(o => h('option', { value: o[0], selected: String(S[key]) === String(o[0]) }, o[1])));
    const check = (key, label, after) => h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!S[key], onchange: e => { S[key] = e.target.checked; save(); after && after(); } }), label);
    let kids = [];
    if (this.tab === 'player') {
      kids = [
        field('Name (shown above your head)', h('input', { type: 'text', maxLength: 18, value: S.name, oninput: e => { S.name = e.target.value.trim().slice(0, 18) || 'Agent'; save(); } })),
        h('div', { class: 'field' }, h('span', {}, 'Shirt colour'), h('div', { class: 'swatches' }, SHIRTS.map(c => h('button', { class: S.color === c ? 'on' : '', style: { background: c }, title: c, onclick: () => { S.color = c; save(); this.renderSettings(); } })))),
        typeof Customize !== 'undefined' ? h('div', { class: 'row' }, h('button', { class: 'btn small', onclick: () => Customize.show() }, 'Open the character creator')) : null];
    } else if (this.tab === 'controls') {
      kids = [field('Mouse sensitivity', range('sens', 0.2, 3, 0.05, null, v => v.toFixed(2) + '×')), check('invertY', 'Invert vertical look'), field('Field of view', range('fov', 55, 100, 1, applyQuality, v => v + '°')),
        h('div', { class: 'keys' }, UI_KEYS.map(k => h('div', { class: 'kh-row' }, h('span', { class: 'kh-k' }, k[0].map(x => h('kbd', {}, x))), h('span', {}, k[1])))),
        h('p', { class: 'note' }, 'Click the game to capture the mouse. If your browser will not capture it, hold the left button and drag to look around. Press H in the office to show the controls.')];
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
      const on = AI.hasKey();
      kids = [h('div', { class: 'ai-card ' + (on ? 'on' : '') }, h('i', { class: 'dot ' + (on ? 'on' : '') }),
          h('div', {}, h('b', {}, on ? 'AI callers are on' : S.provider === 'offline' ? 'Built-in caller brain (offline)' : 'Waiting for a key'),
            h('small', {}, on ? PROVIDERS[S.provider].label + ' · ' + (AI.model() || 'default model') : 'Optional: an OpenRouter, Groq or OpenAI-compatible key gives callers open-ended conversations.'))),
        field('Who plays the callers', select('provider', Object.keys(PROVIDERS).map(k => [k, PROVIDERS[k].label]), () => { S.model = ''; save(); this.renderSettings(); }))];
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
      kids = [field('Graphics quality', select('quality', [['low', 'Low (fastest: no shadows, fewer effects)'], ['med', 'Medium'], ['high', 'High']], applyQuality)), check('npcs', 'Show coworkers at the other desks', applyQuality),
        h('p', { class: 'note' }, 'Low also turns off anti-aliasing the next time the game starts.'),
        h('div', { class: 'row' }, h('button', { class: 'btn small danger', onclick: () => { Saves.week = [null, null, null]; Saves.endless = null; writeSaves(); eraseMsg.textContent = 'All saves erased.'; } }, 'Erase all saves'), eraseMsg),
        h('p', { class: 'note' }, Store.persistent ? 'Saves and settings are kept in this browser.' : 'This window cannot store data, so saves and settings last only until you close it.')];
    }
    body.replaceChildren(...kids.filter(Boolean));
  },

  /* ----- HUD ----- */
  dayCard(title, sub) {
    const c = $('#daycard'), parts = String(sub).split(/(\$[\d,]+)/);
    c.replaceChildren(h('div', { class: 'dc-in' }, h('small', {}, G.mode === 'week' ? 'Day ' + G.day + ' · Week ' + Math.ceil(G.day / 5) : 'Clocked in'), h('h1', { 'data-t': title }, title),
      h('p', {}, parts.map((s, i) => i % 2 ? h('b', {}, s) : s))));
    c.classList.remove('on'); void c.offsetWidth; c.classList.add('on');
    clearTimeout(this._dc); this._dc = setTimeout(() => c.classList.remove('on'), 2600); this.hintUntil = now() + 14;
  },
  setHTML(el, html) { if (el._h !== html) { el._h = html; el.innerHTML = html; } },
  hud() {
    const st = $('#hud-stats'), lobby = G.phase === 'lobby';
    let s;
    if (G.mode === 'week') {
      const pct = Math.min(100, G.team / Math.max(1, G.quota) * 100), met = G.team >= G.quota && G.quota > 0, urgent = G.phase === 'day' && G.timeLeft < 60;
      s = '<div class="hs-day">' + DAYS[(G.day - 1) % 5] + '<small>Week ' + Math.ceil(G.day / 5) + '</small></div>'
        + '<div class="hs-row"><span>Team</span><b class="g">' + money(G.team) + '</b><i>/</i><span>Quota</span><b class="q">' + money(G.quota) + '</b></div>'
        + '<div class="hs-bar' + (met ? ' met' : '') + '"><i style="width:' + pct.toFixed(1) + '%"></i></div>'
        + (G.phase === 'day' ? '<div class="hs-row hs-t' + (urgent ? ' urgent' : '') + '">' + UI_IC.clock + '<span>Review in</span><b>' + fmtTime(G.timeLeft) + '</b></div>'
          : lobby ? '<div class="hs-row hs-t wait"><span>Shift not started</span></div>' : '<div class="hs-row hs-t urgent"><span>Performance review</span></div>')
        + (G.personal > 0 ? '<div class="hs-row hs-me"><span>You</span><b>' + money(G.personal) + '</b></div>' : '');
    } else s = '<div class="hs-day">Overtime<small>Endless</small></div><div class="hs-row"><span>Team total</span><b class="g">' + money(G.team) + '</b></div>'
      + (lobby ? '<div class="hs-row hs-t wait"><span>Shift not started</span></div>' : '<div class="hs-row hs-me"><span>You</span><b>' + money(G.personal) + '</b></div>');
    this.setHTML(st, s);
    const pr = $('#hud-prompt'), lab = W.cur && W.cur.label();
    pr.classList.toggle('hidden', !lab); if (lab) this.setHTML(pr, '<kbd>E</kbd><span>' + lab + '</span>');
    $('#crosshair').classList.toggle('hidden', !Game.canControl());
    $('#hud-ring').classList.toggle('hidden', !(Call.state === 'ringing' && !P.seated));
    const left = [];
    if (Net.active && !lobby) left.push('<div class="chip room">Room <b>' + Net.room + '</b><span>' + Net.players.size + ' online</span></div>');
    if (Net.active) left.push('<div class="chip mic ' + (Voice.talking ? 'live' : 'mute') + '"><i></i>' + (!Voice.real ? 'Mic off' : settings.micMode === 'ptt' ? (Voice.ptt ? 'Talking' : 'Hold V to talk') : settings.micMode === 'off' ? 'Mic off' : (Voice.talking ? 'Talking' : 'Mic on')) + '</div>');
    if (lobby && !Net.active) left.push('<div class="chip">' + (Game.authority() ? 'Press <kbd>Enter</kbd> to start the shift' : 'Waiting for the host to start the shift') + '</div>');
    if (P.boost > 0) left.push('<div class="chip boost">Caffeinated ' + Math.ceil(P.boost) + 's</div>');
    this.setHTML($('#hud-left'), left.join(''));
    // multiplayer lobby card: big room code + who is here
    const lc = $('#hud-lobby'), showL = lobby && Net.active && !G.paused;
    lc.classList.toggle('hidden', !showL);
    if (showL) {
      const key = Net.room + '|' + [...Net.players.values()].map(p => p.name + p.color).join(',') + '|' + Game.authority();
      if (lc._k !== key) {
        lc._k = key;
        lc.replaceChildren(this.roomCode(), h('div', { class: 'lb-ppl' }, h('small', {}, Net.players.size + ' / 6 agents clocked in'),
          h('div', {}, [...Net.players.values()].map(p => h('span', { style: { '--c': p.color || '#ffd23b' } }, p.name || 'Agent')))),
          h('div', { class: 'lb-go' }, Game.authority() ? ['Press ', h('kbd', {}, 'Enter'), ' to start the shift'] : 'Waiting for the host to start the shift…'));
      }
    }
    // controls panel: full for a while after the day card (or after H), then a small tab
    const hint = $('#hud-hint'), canC = Game.canControl();
    hint.classList.toggle('hidden', !canC);
    if (canC) hint.classList.toggle('mini', !(this.keysOpen || now() < this.hintUntil));
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
