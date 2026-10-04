'use strict';
/* =====================================================================
   NOSYVIEWER — the pretend remote-desktop app. When a scheme reaches its
   NosyViewer step the caller reads out a one-time connection code; the agent
   types it in, connects, and snoops through the caller's (fake) mini desktop
   to find their customer PIN. API reference: docs/modules/phone.md
   ===================================================================== */
const Nosy = {
  /* caller desktop wallpapers by archetype (small SVG scenes, 160x100) */
  WALL: { granny: 'stars', astro: 'space', crypto: 'chart', influencer: 'hearts', captain: 'sea', cowboy: 'desert', chef: 'hills', gamer: 'grid', tinfoil: 'pigeons', knitter: 'knit', gym: 'hills', diva: 'curtain', scientist: 'space', regular: 'hills' },
  wall(id) {
    const W = (bg, body) => `<svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="nvg-${id}" x1="0" y1="0" x2="0" y2="1">${bg.map((c, i) => `<stop offset="${i / (bg.length - 1)}" stop-color="${c}"/>`).join('')}</linearGradient></defs><rect width="160" height="100" fill="url(#nvg-${id})"/>${body}</svg>`;
    const stars = n => Array.from({ length: n }, (_, i) => `<circle cx="${(i * 37.3) % 160}" cy="${(i * 23.7) % 70}" r="${i % 3 ? 0.5 : 0.9}" fill="#fff" opacity="${0.5 + (i % 4) * 0.12}"/>`).join('');
    switch (id) {
      case 'stars': return W(['#1b1440', '#4b2a7a', '#a0558f'], stars(40) + '<circle cx="124" cy="24" r="11" fill="#fff3c4"/><circle cx="129" cy="21" r="10" fill="#2c1d58"/><path d="M0 86Q40 74 80 84T160 80V100H0Z" fill="#1d1236"/>');
      case 'space': return W(['#050816', '#14204a', '#2b3a7a'], stars(46) + '<circle cx="112" cy="58" r="24" fill="#f08c4a"/><ellipse cx="112" cy="58" rx="40" ry="8" fill="none" stroke="#ffd6a0" stroke-width="3" transform="rotate(-14 112 58)"/><circle cx="104" cy="50" r="5" fill="#d96d2b" opacity=".6"/><circle cx="34" cy="26" r="6" fill="#9ad0ff"/>');
      case 'chart': return W(['#06140d', '#0d2a1b'], '<path d="M0 20H160M0 40H160M0 60H160M0 80H160M40 0V100M80 0V100M120 0V100" stroke="#1d4a32" stroke-width=".6"/><path d="M6 86L28 74L44 80L66 52L82 60L104 30L120 38L150 8" fill="none" stroke="#3cff8f" stroke-width="3" stroke-linejoin="round"/><path d="M144 6l8-2-2 8z" fill="#3cff8f"/><text x="12" y="20" font-size="11" font-family="Lilita One,sans-serif" fill="#3cff8f">TO THE MOON</text>');
      case 'hearts': return W(['#ff9ac6', '#ffc6e0', '#ffe3c2'], Array.from({ length: 9 }, (_, i) => `<path transform="translate(${(i * 47) % 150 + 6} ${(i * 29) % 80 + 8}) scale(${0.6 + (i % 3) * 0.3})" d="M8 14S0 9 0 4a4 4 0 0 1 8-1 4 4 0 0 1 8 1c0 5-8 10-8 10z" fill="#fff" opacity=".7"/>`).join(''));
      case 'sea': return W(['#7cc8f2', '#bfe6f7', '#fbe3b0'], '<circle cx="118" cy="30" r="12" fill="#fff4b0"/><rect y="62" width="160" height="38" fill="#2f8fc9"/><path d="M0 70q10-3 20 0t20 0 20 0 20 0 20 0 20 0 20 0 20 0" fill="none" stroke="#9fd8f5" stroke-width="1.2"/><path d="M50 62h34l-6 8H56z" fill="#fff"/><path d="M66 60V30l16 28z" fill="#fff"/><path d="M64 58V36L52 56z" fill="#ffd8a8"/>');
      case 'desert': return W(['#ff9a5a', '#ffcf7a', '#ffe6a8'], '<circle cx="80" cy="56" r="20" fill="#fff1b8" opacity=".9"/><path d="M0 70L30 50L40 52L60 66H160V100H0Z" fill="#c65a2e"/><path d="M100 70V40h10v12h8V46h6v18h-14v6z" fill="#3d7a3a"/><rect y="74" width="160" height="26" fill="#e8964a"/>');
      case 'grid': return W(['#12002b', '#4a0a6e', '#ff3d8b'], '<circle cx="80" cy="52" r="18" fill="#ffcc3d"/><rect y="58" width="160" height="42" fill="#12002b"/>' + Array.from({ length: 9 }, (_, i) => `<path d="M80 58L${i * 20} 100" stroke="#ff3dd0" stroke-width=".7"/>`).join('') + '<path d="M0 64H160M0 72H160M0 84H160" stroke="#ff3dd0" stroke-width=".7"/>');
      case 'pigeons': return W(['#5b6473', '#8d96a3', '#c4c9cf'], Array.from({ length: 8 }, (_, i) => `<path transform="translate(${(i * 41) % 150 + 4} ${(i * 17) % 50 + 10})" d="M0 4q4-4 8 0q4-4 8 0" fill="none" stroke="#2b2f36" stroke-width="1.6"/>`).join('') + '<ellipse cx="120" cy="22" rx="14" ry="4" fill="#9aa3ad"/><ellipse cx="120" cy="19" rx="6" ry="4" fill="#cfe8ff"/><path d="M110 26l-6 14h32l-6-14z" fill="#e8ff8a" opacity=".4"/>');
      case 'knit': return W(['#b5523b', '#b5523b'], Array.from({ length: 7 }, (_, r) => `<path d="${Array.from({ length: 17 }, (_, i) => (i ? 'L' : 'M') + i * 10 + ' ' + (r * 15 + (i % 2 ? 8 : 0))).join('')}" fill="none" stroke="${['#f4e3c1', '#2f6b5a', '#f2b544'][r % 3]}" stroke-width="5"/>`).join(''));
      case 'curtain': return W(['#2a0610', '#5a0d1e'], '<path d="M0 0H50Q40 50 54 100H0Z" fill="#a3122e"/><path d="M160 0H110Q120 50 106 100H160Z" fill="#a3122e"/><path d="M10 0V100M24 0V100M38 0Q30 50 42 100M150 0V100M136 0V100M122 0Q130 50 118 100" stroke="#7a0b21" stroke-width="2"/><ellipse cx="80" cy="92" rx="30" ry="6" fill="#fff3c4" opacity=".55"/><path d="M80 0L60 92H100Z" fill="#fff3c4" opacity=".14"/><path d="M0 0H160V10Q80 18 0 10Z" fill="#c9a227"/>');
      default: return W(['#ffb36b', '#ff8a7a', '#8a6fd1'], '<circle cx="46" cy="44" r="14" fill="#fff0b8"/><path d="M0 70Q40 46 80 64T160 58V100H0Z" fill="#6b4fa8"/><path d="M0 84Q50 66 100 82T160 76V100H0Z" fill="#4a3582"/>');
    }
  },
  fileIcon(f) {
    const k = f.kind || 'txt', col = { txt: '#ffffff', img: '#20c997', xls: '#2f9e44', dir: '#fcc419' }[k];
    const g = { txt: 'doc', img: 'image', xls: 'grid', dir: 'folder' }[k];
    return h('i', { class: 'nv-ic ' + k, style: { background: k === 'txt' ? '#fff' : col }, html: OS.glyph(g) });
  },
  /* the file viewer inside the caller's desktop */
  viewer(c, f, close) {
    const k = f.kind || 'txt', app = { txt: 'Notepad', img: 'Photos', xls: 'Sheets', dir: 'Files' }[k];
    let body;
    if (k === 'img') body = h('div', { class: 'nv-photos' }, [0, 1, 2, 3].map(i => h('div', { html: this.petPic(c.pet, i) })), h('p', {}, f.c));
    else if (k === 'xls') body = h('div', { class: 'nv-xls' }, f.c.split('\n').map(r => h('div', {}, r.split(/\s{2,}/).map(x => h('span', {}, x)))));
    else body = h('pre', {}, f.c);
    return h('div', { class: 'nv-win' }, h('div', { class: 'nv-wt' }, this.fileIcon(f), h('span', {}, f.n + ' - ' + app), h('button', { title: 'Close', html: OS_WIN_BTN.x, onclick: close })), h('div', { class: 'nv-wb ' + k }, body));
  },
  petPic(pet, i) {
    const col = ['#f4a259', '#c9c9c9', '#7a5c3e', '#ffffff'][(hashStr(pet.name) + i) % 4], tilt = [-8, 6, -3, 10][i];
    return `<svg viewBox="0 0 60 50"><rect width="60" height="50" fill="${['#bde0fe', '#ffd6e0', '#d8f3dc', '#fff3bf'][i]}"/><g transform="rotate(${tilt} 30 30)"><ellipse cx="30" cy="40" rx="16" ry="10" fill="${col}" stroke="#14171f" stroke-width="2"/><circle cx="30" cy="24" r="12" fill="${col}" stroke="#14171f" stroke-width="2"/><path d="M20 16l2-9 6 6M40 16l-2-9-6 6" fill="${col}" stroke="#14171f" stroke-width="2" stroke-linejoin="round"/><circle cx="26" cy="23" r="1.8" fill="#14171f"/><circle cx="34" cy="23" r="1.8" fill="#14171f"/><path d="M28 28q2 2 4 0" fill="none" stroke="#14171f" stroke-width="1.5"/></g></svg>`;
  }
};

OS.apps.nosy = {
  desktop: true, order: 30, title: 'NosyViewer', emoji: '👁️', icon: 'eye', color: '#7048e8', w: 414, h: 440, x: 0.003, y: 0.3, cls: 'nosy',
  render(b, w) { w.sel = -1; w.code = ''; w.msg = ''; w.sig = ''; this.refresh(b, w, true); },
  onClose(w) { clearTimeout(w.connT); },
  refresh(b, w, force) {
    const c0 = Call.cur; if (c0 && w.seed !== c0.caller.seed) { w.seed = c0.caller.seed; w.sel = -1; w.msg = ''; w.code = ''; }
    const c = Call.cur, st = Call.state, on = !!(c && c.remote && (st === 'live' || st === 'ended')), connecting = on && w.connectUntil > performance.now();
    const step = c && c.scheme ? c.scheme.steps[c.steps.indexOf(false)] : null, wantCode = !!(st === 'live' && step && step.remote);
    const sig = [on, connecting, w.sel, c ? c.caller.seed : 0, wantCode, c && c.codeGiven, st, w.msg].join(';');
    if (!force && sig === w.sig) return; w.sig = sig;
    const head = h('div', { class: 'nv-head' }, h('div', { class: 'nv-logo', html: OS.glyph('eye') }), h('div', {}, h('b', {}, 'NosyViewer'), h('span', {}, on ? 'Connected to ' + c.caller.first + '\'s computer.' : 'Connect to the caller\'s computer.')),
      on ? h('div', { class: 'nv-live' }, h('i'), connecting ? 'CONNECTING' : 'LIVE') : null);
    if (connecting) {
      b.replaceChildren(head, h('div', { class: 'nv-conn' }, h('div', { class: 'nv-spin' }), h('b', {}, 'Connecting to ' + c.caller.nosy + '…'), h('span', {}, pick(['Negotiating sincerity…', 'Asking the router nicely…', 'Wiping crumbs off their keyboard…'])), h('div', { class: 'nv-pbar' }, h('i'))));
      return;
    }
    if (on) {
      const files = c.caller.files, f = w.sel >= 0 ? files[w.sel] : null, pinStep = st === 'live' && step && step.pin;
      const [tm] = OS.clock();
      b.replaceChildren(head,
        h('div', { class: 'nv-bar' }, h('span', { html: OS.glyph('monitor') }), c.caller.first + '\'s PC · ' + c.caller.nosy,
          h('em', {}, pinStep ? 'Find the customer PIN, then enter it in the ' + c.scheme.name + ' window.' : 'View only. Be nosy.'),
          pinStep ? h('button', { onclick: () => OS.launch('sch_' + c.scheme.id) }, 'Enter PIN') : null),
        h('div', { class: 'nv-screen' },
          h('div', { class: 'nv-wall', html: Nosy.wall(Nosy.WALL[c.caller.type] || 'hills') }),
          h('div', { class: 'nv-icons' }, files.map((x, i) => h('button', { class: 'nv-file' + (w.sel === i ? ' on' : ''), title: x.n, onclick: () => { w.sel = i; SFX.click(); this.refresh(b, w); } }, Nosy.fileIcon(x), h('span', {}, x.n))),
            h('button', { class: 'nv-file', title: 'Trash', onclick: () => toast('The trash is full of other trash.') }, h('i', { class: 'nv-ic trash', html: OS.glyph('trash') }), h('span', {}, 'Trash'))),
          f ? Nosy.viewer(c.caller, f, () => { w.sel = -1; this.refresh(b, w); }) : null,
          h('div', { class: 'nv-tb' }, h('i', { html: OS.glyph('home') }), h('span', {}, c.caller.first + '\'s PC'), h('b', {}, tm))));
      return;
    }
    /* the connect screen */
    const inp = h('input', { class: 'nv-code', type: 'text', placeholder: '000-000', maxLength: 9, autocomplete: 'off', spellcheck: false, value: w.code || '',
      oninput: e => { w.code = e.target.value; }, onkeydown: e => { if (e.key === 'Enter') go(); } });
    const go = () => {
      w.code = inp.value;
      if (!(Call.state === 'live' && Call.cur && Call.cur.scheme)) { w.msg = 'No caller to connect to. Run a NosyViewer scheme first.'; SFX.bad(); return this.refresh(b, w); }
      const cc = Call.cur, sp = cc.scheme.steps[cc.steps.indexOf(false)];
      if (!sp || !sp.remote) { w.msg = cc.remote ? 'Already connected.' : 'This scheme does not need NosyViewer right now.'; SFX.bad(); return this.refresh(b, w); }
      if (!callNorm(w.code)) { w.msg = 'Type the code the caller reads out.'; return this.refresh(b, w); }
      w.msg = '';
      if (Call.connectRemote(w.code)) { w.connectUntil = performance.now() + 1500; w.code = ''; w.sel = -1; this.refresh(b, w, true); clearTimeout(w.connT); w.connT = setTimeout(() => this.refresh(b, w, true), 1520); }
      else { w.msg = 'That code did not work. Ask ' + cc.caller.first + ' to read it again.'; this.refresh(b, w, true); const el = b.querySelector('.nv-code'); if (el) el.classList.add('shake'); }
    };
    const hint = w.msg || (st !== 'live' ? 'No caller on the line.' : wantCode ? (c.codeGiven ? c.caller.first + ' read out a code. Type it in exactly.' : 'Get ' + c.caller.first + ' to open NosyViewer. They will read you a code.') : 'Waiting for a NosyViewer step.');
    b.replaceChildren(head, h('div', { class: 'nv-main' },
      h('div', { class: 'nv-left' },
        h('h2', {}, 'Enter caller\'s connection code'),
        h('p', {}, 'Enter the one-time code exactly as the caller reads it.'),
        h('label', {}, 'Caller connection code'), inp,
        h('button', { class: 'nv-go', onclick: go }, 'Connect'),
        h('div', { class: 'nv-hint' + (w.msg ? ' bad' : wantCode && c.codeGiven ? ' good' : '') }, hint)),
      h('div', { class: 'nv-side' }, h('small', {}, 'Remote support'), h('b', {}, 'Connect safely'),
        h('ol', {}, h('li', {}, 'Ask the caller for their NosyViewer connection code.'), h('li', {}, 'Enter the one-time connection code they read aloud.'), h('li', {}, 'Keep the call open while the remote desktop connects.')))));
    if (wantCode && c.codeGiven && document.activeElement === document.body) setTimeout(() => inp.isConnected && inp.focus(), 0);
  }
};
