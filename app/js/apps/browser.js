'use strict';
/* =====================================================================
   BROWSER — "Bonk Browser" (OS.apps.browser, free): tabs, address bar, back/forward,
   bookmarks and a handful of silly sites: BonkSearch, The Daily Bonk, the company
   intranet (live quota + leaderboard), VidBonk (looping canvas cartoons),
   HowToBonk ("How to look busy") and a 404 page. API: docs/modules/tools.md
   ===================================================================== */
const Browser = (() => {
  const NEWTAB = 'bonk://newtab', SEARCH = 'bonksearch.legit', NEWS = 'dailybonk.news', INTRA = 'intranet.totallylegit.inc', VID = 'vidbonk.tv', HOW = 'howtobonk.legit/look-busy';
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const PLAY = '<svg viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5z" fill="#fff"/></svg>';
  const FAV = {
    newtab: { g: 'globe', c: '#5f6b7d' }, search: { g: 'search', c: '#ff6b2c' }, news: { t: 'B', c: '#7a1f2b' }, intra: { g: 'briefcase', c: '#1e3a8a' },
    vid: { svg: PLAY, c: '#e8442e' }, how: { g: 'bolt', c: '#0c8599' }, err: { g: 'warning', c: '#868e96' }
  };
  const favEl = f => h('i', { class: 'bw-fav', style: { background: f.c }, html: f.svg || (f.g ? OS.glyph(f.g) : '<b>' + f.t + '</b>') });

  /* ----- url handling ----- */
  function norm(raw) {
    let s = String(raw || '').trim(); if (!s) return NEWTAB;
    if (/^bonk:\/\//i.test(s)) return s.toLowerCase();
    s = s.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
    if (/\s/.test(s) || !/^[^/]+\.[a-z]{2,}/i.test(s)) return SEARCH + '/search?q=' + encodeURIComponent(String(raw).trim());
    return s.replace(/\/$/, '');
  }
  function parse(url) {
    const i = url.indexOf('/'), host = url.startsWith('bonk://') ? url : i < 0 ? url : url.slice(0, i), rest = url.startsWith('bonk://') ? '' : i < 0 ? '' : url.slice(i);
    const qi = rest.indexOf('?'), path = qi < 0 ? rest : rest.slice(0, qi), q = {};
    if (qi >= 0) rest.slice(qi + 1).split('&').forEach(kv => { const [k, v] = kv.split('='); try { q[k] = decodeURIComponent((v || '').replace(/\+/g, ' ')); } catch (e) { q[k] = v; } });
    return { host: host.toLowerCase(), path: path.toLowerCase(), q };
  }
  const shown = url => url.startsWith('bonk://') ? (url === NEWTAB ? '' : url) : 'https://' + url;

  /* ----- tabs ----- */
  const tabs = [], B = { cur: 0, seq: 0 };
  const tab = () => tabs[B.cur];
  function newTab(url, bg) { const t = { id: ++B.seq, hist: [], i: -1, title: 'New Tab', fav: FAV.newtab }; tabs.push(t); if (!bg) B.cur = tabs.length - 1; go(url || NEWTAB, t); return t; }
  function closeTab(t) {
    const i = tabs.indexOf(t); if (i < 0) return; tabs.splice(i, 1);
    if (!tabs.length) { newTab(NEWTAB); return; }
    if (B.cur > i || B.cur >= tabs.length) B.cur--;
    draw();
  }
  function go(raw, t, noPush) {
    t = t || tab(); const url = norm(raw);
    if (!noPush) { t.hist.length = t.i + 1; t.hist.push(url); t.i = t.hist.length - 1; }
    t.loadT = now(); if (t === tab()) draw(true); else drawTabs();
  }
  const back = () => { const t = tab(); if (t.i > 0) { t.i--; go(t.hist[t.i], t, true); } };
  const fwd = () => { const t = tab(); if (t.i < t.hist.length - 1) { t.i++; go(t.hist[t.i], t, true); } };
  const A = (url, ...kids) => h('a', { class: 'bw-a', href: '#', onclick: e => { e.preventDefault(); SFX.click(); go(url); } }, ...kids);

  /* ----- sites ----- */
  const SITES = {};
  function route(url) {
    const u = parse(url);
    for (const k in SITES) { const s = SITES[k]; if (s.host === u.host && (!s.match || s.match(u))) return { s, u }; }
    return { s: SITES.e404, u };
  }

  // BonkSearch
  const LOGO_COLS = ['#ff6b2c', '#ffb703', '#2fb36a', '#3b82f6', '#a855f7', '#ff6b2c', '#2fb36a', '#ffb703', '#3b82f6', '#e64980'];
  const bonkLogo = big => h('div', { class: 'bs-logo' + (big ? ' big' : '') }, ...'BonkSearch'.split('').map((c, i) => h('span', { style: { color: LOGO_COLS[i] } }, c)));
  const searchBox = (val, big) => {
    const inp = h('input', { value: val || '', spellcheck: false, placeholder: 'Search the legit web', onkeydown: e => { if (e.key === 'Enter' && inp.value.trim()) go(SEARCH + '/search?q=' + encodeURIComponent(inp.value.trim())); } });
    return h('div', { class: 'bs-box' + (big ? ' big' : '') }, h('i', { html: OS.glyph('search') }), inp);
  };
  const lucky = () => go(pick([NEWS + '/quota', INTRA, VID + '/watch?v=cat', HOW, VID + '/watch?v=stapler', 'geocities.legit/free-money']));
  SITES.searchHome = { host: SEARCH, match: u => u.path !== '/search', title: () => 'BonkSearch', fav: FAV.search,
    render: () => {
      const box = searchBox('', true);
      return h('div', { class: 'bs-home' }, bonkLogo(true), box,
        h('div', { class: 'bs-btns' }, h('button', { onclick: () => { const v = $('input', box).value.trim(); if (v) go(SEARCH + '/search?q=' + encodeURIComponent(v)); } }, 'Bonk Search'), h('button', { onclick: lucky }, 'I\'m Feeling Legit')),
        h('div', { class: 'bs-trend' }, 'Trending: ', A(SEARCH + '/search?q=how to look busy', 'how to look busy'), ' · ', A(SEARCH + '/search?q=call center quota', 'call center quota news'), ' · ', A(SEARCH + '/search?q=cat vs mug', 'cat vs mug')),
        h('div', { class: 'bs-foot' }, 'BonkSearch offered in: ', h('b', {}, 'English'), ' · Corporate · Pirate · Whisper'));
    } };
  const RES = [
    { k: /busy|lazy|look|slack|work/i, url: HOW, t: 'How to Look Busy at Work: 7 Steps (with Pictures) - HowToBonk', d: 'Frown at your screen. Carry a clipboard. Sigh at regular intervals. A complete guide to appearing productive while doing absolutely nothing.', snip: true },
    { k: /quota|call ?cent|news|totally|legit|local/i, url: NEWS + '/quota', t: 'Local call center hits quota, nobody knows how - The Daily Bonk', d: 'Staff at Totally Legit Inc. reportedly "just kept talking" until the numbers went up. Experts are baffled. The Boss is "almost smiling".' },
    { k: /cat|mug|video|funny|watch/i, url: VID + '/watch?v=cat', t: 'Office cat destroys mug for the 400th time (LOOP) - VidBonk', d: '4.8M views · The mug had a family. Watch until the end (it loops, there is no end).' },
    { k: /stapler|backflip|flip|olymp/i, url: VID + '/watch?v=stapler', t: 'Stapler does a backflip (NOT CLICKBAIT) - VidBonk', d: '2.1M views · It actually does it. We checked.' },
    { k: /boss|leader|intranet|portal|team|payroll|cafeteria|lunch/i, url: INTRA, t: 'Employee Portal - Totally Legit Inc.', d: 'Today\'s quota, the team leaderboard, announcements from The Boss and the cafeteria menu. Please do not eat the loaf.' },
    { k: /scam|legal|illegal|police|raid|law/i, url: 'lawyers-r-us.legit/is-it-a-scam', t: 'Is it a scam if you call it a "scheme"? Lawyers explain', d: 'Short answer: yes. Long answer: also yes, but it costs $400 an hour.' },
    { k: /virus|popup|pop-up|antivirus|malware|bug/i, url: 'bugbuster.legit', t: 'BugBuster Antivirus - squash pop-up storms in seconds', d: 'Detects 100% of the bugs it made up. Available now at BonkMart Market.' },
    { k: /ram|download|faster|speed/i, url: 'downloadmoreram.legit', t: 'Download more RAM (free, safe, 100% real)', d: 'Over 9 billion downloads. Your computer will thank you, in pop-ups.' },
    { k: /chatterbox|gold|gift|free|prize|win/i, url: 'free-chatterbox-gold.legit', t: 'FREE Chatterbox Gold generator 2026 (WORKING!!!)', d: 'Do not click this. We are begging you. It is the same prank everyone sends.' }
  ];
  SITES.search = { host: SEARCH, match: u => u.path === '/search', title: u => (u.q.q || '') + ' - BonkSearch', fav: FAV.search,
    render: u => {
      const q = (u.q.q || '').slice(0, 80), hit = RES.filter(r => r.k.test(q)).slice(0, 3), Q = esc(q);
      const gen = [
        { url: NEWS, t: 'Top 10 ' + q + ' facts that will get you fired (number 7 will get you fired)', d: 'You won\'t believe number 4. Your boss won\'t believe number 7. HR has asked us to remove number 9.' },
        { url: VID + '/watch?v=ball', t: 'Watch: office worker reacts to "' + q + '" (gone wrong)', d: '880K views · He did not expect that. Neither did the bin.' },
        { url: INTRA, t: q + ' policy - Totally Legit Inc. intranet', d: 'Section 4.2: "' + q + '" is permitted during breaks. There are no breaks.' },
        { url: 'explainedbadly.legit/' + encodeURIComponent(q.toLowerCase().replace(/\s+/g, '-')), t: q + ': everything you need to know, explained badly', d: 'We asked a man at a bus stop. He had opinions.' }
      ];
      const list = hit.concat(gen).slice(0, 6);
      const words = Q.split(/\s+/).filter(w => w.length > 2).map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), hl = words.length ? new RegExp('(' + words.join('|') + ')', 'gi') : null;
      const res = r => h('div', { class: 'bs-r' },
        h('div', { class: 'bs-site' }, favEl(route(norm(r.url)).s.fav || FAV.err), h('div', {}, h('b', {}, parse(norm(r.url)).host), h('small', {}, shown(norm(r.url))))),
        A(r.url, h('h3', {}, r.t)), h('p', { html: hl ? esc(r.d).replace(hl, '<b>$1</b>') : esc(r.d) }));
      const snip = hit.find(r => r.snip);
      return h('div', { class: 'bs-res' },
        h('div', { class: 'bs-head' }, A(SEARCH, bonkLogo(false)), searchBox(q)),
        h('div', { class: 'bs-tabs' }, ['All', 'Images', 'News', 'Videos', 'Excuses'].map((t, i) => h('span', { class: i ? '' : 'on' }, t))),
        h('div', { class: 'bs-list' },
          h('div', { class: 'bs-count' }, 'About ' + (3 + (hashStr(q) % 9)) + ' results (0.000' + (1 + hashStr(q) % 8) + ' seconds) · 2 of them are ads'),
          snip ? h('div', { class: 'bs-snip' }, h('b', {}, 'Featured snippet'), h('ol', {}, ['Frown at your screen', 'Carry a clipboard everywhere', 'Type loudly', 'Sigh at regular intervals']
            .map(s => h('li', {}, s))), A(HOW, 'How to Look Busy at Work - HowToBonk')) : null,
          h('div', { class: 'bs-r ad' }, h('div', { class: 'bs-site' }, h('em', {}, 'Sponsored'), h('div', {}, h('b', {}, 'hotstaplers.legit'))), A('hotstaplers.legit', h('h3', {}, 'Hot staplers in your area want to talk about ' + (q || 'you'))), h('p', {}, 'They are lonely. They are staplers. Click to meet them.')),
          list.map(res),
          h('div', { class: 'bs-pages' }, h('span', { class: 'bs-pl' }, 'Bo', ...'oooooo'.split('').map((o, i) => h('span', { class: i ? '' : 'on' }, o)), 'nk'))));
    } };

  // The Daily Bonk
  const NEWS_ART = '<svg viewBox="0 0 320 170" xmlns="http://www.w3.org/2000/svg"><rect width="320" height="170" fill="#ffd8a8"/><circle cx="262" cy="40" r="22" fill="#ffec99"/>'
    + '<path d="M0 120h40V70h30v50h18V50h40v70h12V84h28v36h14V60h34v60h20V78h26v42h58v50H0z" fill="#e8a87c" opacity=".7"/>'
    + '<rect x="96" y="44" width="128" height="96" fill="#2c3e66" stroke="#1d2433" stroke-width="3"/><rect x="88" y="36" width="144" height="14" fill="#1d2433"/>'
    + '<text x="160" y="47" text-anchor="middle" font-family="Alfa Slab One,serif" font-size="10" fill="#ffd43b">TOTALLY LEGIT INC.</text>'
    + '<g fill="#ffe8a3">' + [0, 1, 2, 3].map(r => [0, 1, 2, 3, 4].map(c => '<rect x="' + (106 + c * 23) + '" y="' + (58 + r * 19) + '" width="14" height="11"/>').join('')).join('') + '</g>'
    + '<path d="M40 150 120 104l30 18 80-70" fill="none" stroke="#2f9e44" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/><path d="M212 44h26v26z" fill="#2f9e44"/>'
    + '<text x="56" y="92" font-family="Lilita One,sans-serif" font-size="30" fill="#d6342c" stroke="#fff" stroke-width="1.5">?</text><text x="250" y="110" font-family="Lilita One,sans-serif" font-size="34" fill="#d6342c" stroke="#fff" stroke-width="1.5">?</text>'
    + '<rect y="150" width="320" height="20" fill="#495057"/><path d="M0 160h320" stroke="#fff" stroke-width="2" stroke-dasharray="14 10"/></svg>';
  const thumb = (bg, g) => h('i', { class: 'dn-th', style: { background: bg }, html: OS.glyph(g) });
  const masthead = () => h('div', { class: 'dn-mast' },
    h('div', { class: 'dn-mtop' }, h('span', {}, OS.clock()[1]), h('span', {}, 'Weather: 22° and suspicious'), h('span', {}, 'Subscribe for $0.99 (forever)')),
    A(NEWS, h('h1', {}, 'The Daily Bonk')), h('div', { class: 'dn-tag' }, 'All the news that fits. Some that doesn\'t.'),
    h('nav', {}, ['News', 'Business', 'Local', 'Sport', 'Weather', 'Opinions nobody asked for'].map((n, i) => i === 2 ? A(NEWS + '/quota', n) : h('span', {}, n))));
  SITES.news = { host: NEWS, match: u => !u.path, title: () => 'The Daily Bonk - All the news that fits', fav: FAV.news,
    render: () => h('div', { class: 'dn' }, masthead(),
      h('div', { class: 'dn-grid' },
        h('div', { class: 'dn-main' },
          h('div', { class: 'dn-lead' }, A(NEWS + '/quota', h('div', { class: 'dn-hero', html: NEWS_ART }), h('h2', {}, 'Local call center hits quota, nobody knows how')),
            h('p', { class: 'dn-std' }, 'Staff at Totally Legit Inc. reportedly "just kept talking" until the numbers went up. Experts baffled; The Boss "almost smiling".'),
            h('div', { class: 'dn-by' }, 'By Pat Inkwell · ' + OS.clock()[0])),
          h('div', { class: 'dn-sec' },
            [['#4dabf7', 'monitor', 'Man who clicked "yes" to every pop-up now owns 14 toolbars', 'bugbuster.legit'], ['#ff8787', 'clip', 'Stapler shortage enters third week; morale "stapled to the floor"', 'staplers.legit'],
              ['#ffd43b', 'megaphone', 'Area boss describes himself as "fun"; area employees describe nothing, out of fear', NEWS + '/boss'], ['#69db7c', 'phone', 'Study: 9 out of 10 cold calls now answered by a dog', NEWS + '/dogs']]
              .map(([c, g, t, url]) => h('div', { class: 'dn-s' }, thumb(c, g), A(url, h('h4', {}, t)))))),
        h('div', { class: 'dn-side' },
          h('div', { class: 'dn-box' }, h('h5', {}, 'Most read'), h('ol', {}, ['Local call center hits quota, nobody knows how', 'Office cat destroys mug, again', 'Is "circle back" a threat? Linguists weigh in', 'Fridge yoghurt mystery: arrests made'].map((t, i) => h('li', {}, i ? t : A(NEWS + '/quota', t))))),
          h('div', { class: 'dn-box dn-wx' }, h('h5', {}, 'Weather'), h('div', { class: 'dn-wxb' }, h('i', { html: OS.glyph('sun') }), h('b', {}, '22°')), h('small', {}, 'Sunny with a 40% chance of quota')),
          A('downloadmoreram.legit', h('div', { class: 'dn-ad' }, h('small', {}, 'Advertisement'), h('b', {}, 'DOWNLOAD MORE RAM'), h('span', {}, 'Free! Safe! Real!*'), h('em', {}, '*none of these')))))) };
  SITES.newsStory = { host: NEWS, match: u => u.path === '/quota', title: () => 'Local call center hits quota, nobody knows how - The Daily Bonk', fav: FAV.news,
    render: () => {
      const week = G.mode === 'week', team = money(G.team), quota = money(G.quota), top = Game.roster()[0];
      return h('div', { class: 'dn' }, masthead(),
        h('article', { class: 'dn-art' }, h('div', { class: 'dn-kick' }, 'LOCAL · BUSINESS'),
          h('h2', {}, 'Local call center hits quota, nobody knows how'),
          h('div', { class: 'dn-by' }, 'By Pat Inkwell, Senior Quota Correspondent · Updated ' + OS.clock()[0]),
          h('div', { class: 'dn-hero', html: NEWS_ART }), h('small', { class: 'dn-cap' }, 'Totally Legit Inc. headquarters, Suite 404. Artist\'s impression (the artist was not allowed inside).'),
          h('p', {}, 'Employees at Totally Legit Inc., the call center that describes itself as "totally legit", stunned the business world this week by hitting their daily quota, a feat insiders say was "statistically unlikely" and "probably a clerical error".'),
          h('p', {}, week ? 'Figures leaked to The Daily Bonk show the team bringing in ' + team + ' against a quota of ' + quota + '. "I am not surprised," said The Boss, who was visibly surprised.' : 'Figures leaked to The Daily Bonk show the team brought in ' + team + ' in overtime. "There is no quota," said The Boss. "There is only more."'),
          h('blockquote', {}, '"I just followed the checklist," said ' + (top && top.name ? top.name : 'one agent') + ', before being dragged back to their desk by the ear.'),
          h('p', {}, 'Experts remain divided. Some credit the company\'s strict "no breaks, no questions" policy; others point to a stapler that appears in several company photos looking "suspiciously motivated".'),
          h('p', {}, 'At press time, the company\'s phones were still ringing.'),
          h('div', { class: 'dn-rel' }, h('b', {}, 'Related: '), A(VID + '/watch?v=cat', 'Office cat destroys mug (video)'), ' · ', A(HOW, 'How to look busy at work'), ' · ', A(INTRA, 'Totally Legit Inc. careers'))));
    } };

  // Intranet
  const MENU = ['Mystery Loaf', 'Soup of Yesterday', 'Beige Pasta', 'Sandwich (vintage)', 'Quota Quiche', 'Salad (decorative)', 'Fish (do NOT microwave)', 'Cake for someone\'s birthday (not yours)', 'Crisps, one (1)', 'Tea, lukewarm'];
  const INTRA_LOGO = '<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="18.5" fill="#ffd43b" stroke="#fff" stroke-width="2"/><text x="20" y="25.5" text-anchor="middle" font-family="Alfa Slab One,serif" font-size="13" fill="#1e3a8a">TLI</text></svg>';
  function intraCards() {
    const week = G.mode === 'week', rows = Game.roster(), topP = Math.max(1, ...rows.map(r => r.personal)), pct = week ? clamp(G.team / Math.max(1, G.quota), 0, 1) : 0, top = rows[0];
    const medal = i => h('i', { class: 'in-md m' + i }, i < 3 ? ['1st', '2nd', '3rd'][i] : '#' + (i + 1));
    return [
      h('div', { class: 'in-card in-quota' }, h('h4', {}, week ? DAYS[(G.day - 1) % 5] + '\'s quota' : 'Overtime'),
        h('div', { class: 'in-big' }, money(G.team), week ? h('small', {}, ' / ' + money(G.quota)) : null),
        week ? h('div', { class: 'in-bar' }, h('i', { style: { width: (pct * 100).toFixed(1) + '%' } })) : null,
        h('div', { class: 'in-sub' }, week ? (pct >= 1 ? 'Quota met. The Boss is almost smiling.' : money(G.quota - G.team) + ' to go · Performance review in ' + fmtTime(G.timeLeft)) : 'No quota. Just vibes and invoices.')),
      h('div', { class: 'in-card in-eom' }, h('h4', {}, 'Employee of the moment'), h('div', { class: 'in-eomb' }, h('i', { html: OS.glyph('trophy') }),
        h('div', {}, h('b', {}, top && top.personal > 0 ? top.name : 'Nobody. Yet.'), h('small', {}, top && top.personal > 0 ? money(top.personal) + ' today' : 'Close a scam to get your face on this card.')))),
      h('div', { class: 'in-card in-lb' }, h('h4', {}, 'Team leaderboard'), h('div', { class: 'in-rows' }, rows.map((r, i) => h('div', { class: 'in-row' + (r.me ? ' me' : '') }, medal(i),
        h('b', {}, r.name + (r.me ? ' (you)' : '')), h('span', { class: 'in-mini' }, h('i', { style: { width: (Math.max(0, r.personal) / topP * 100).toFixed(1) + '%' } })), h('em', {}, money(r.personal))))))
    ];
  }
  SITES.intra = { host: INTRA, match: u => !u.path, title: () => 'Employee Portal - Totally Legit Inc.', fav: FAV.intra,
    render: (u, t) => {
      const live = h('div', { class: 'in-live' }, intraCards()), sig = () => [G.team, G.quota, Math.ceil(G.timeLeft), Game.roster().map(r => r.name + r.personal).join()].join('|');
      let last = sig(); t.live = () => { const s = sig(); if (s !== last) { last = s; live.replaceChildren(...intraCards()); } };
      const menu = [0, 1, 2].map(k => MENU[(G.day * 3 + k * 7) % MENU.length]);
      return h('div', { class: 'in' },
        h('div', { class: 'in-top' }, h('i', { class: 'in-logo', html: INTRA_LOGO }), h('div', {}, h('b', {}, 'Totally Legit Inc.'), h('small', {}, 'Employee Portal · Suite 404')),
          h('nav', {}, h('span', { class: 'on' }, 'Home'), A(INTRA + '/policies', 'Policies'), A(INTRA + '/hr', 'HR'), h('a', { class: 'bw-a', href: '#', onclick: e => { e.preventDefault(); OS.launch('payroll'); } }, 'Payroll'))),
        h('div', { class: 'in-hi' }, h('h2', {}, (OS.clock()[0].includes('AM') ? 'Good morning, ' : 'Good evening, ') + settings.name + '.'), h('p', {}, 'Remember: a smile can be heard on the phone. So can crying. Please choose smiling.')),
        live,
        h('div', { class: 'in-two' },
          h('div', { class: 'in-card' }, h('h4', {}, 'Announcements from The Boss'), h('ul', { class: 'in-ann' },
            h('li', {}, h('b', {}, 'Mandatory fun Friday'), ' is cancelled due to fun.'), h('li', {}, h('b', {}, 'Whoever keeps hanging paintings:'), ' they are actually quite good. Stop it.'),
            h('li', {}, h('b', {}, 'Reminder:'), ' Chatterbox Gold is not real. Stop clicking it. IT is crying.'))),
          h('div', { class: 'in-card' }, h('h4', {}, 'Cafeteria today'), h('ul', { class: 'in-menu' }, menu.map((m, i) => h('li', {}, h('span', {}, m), h('em', {}, money([4, 6, 3][i]))))),
            h('small', { class: 'in-note' }, 'Ethics policy: ', A(INTRA + '/ethics', 'read here'), ' (page not found)'))));
    } };

  // VidBonk
  const VIDS = [
    { v: 'cat', t: 'Office cat destroys mug for the 400th time (LOOP)', ch: 'DeskCats Daily', views: '4,823,112', len: 5 },
    { v: 'stapler', t: 'Stapler does a backflip (NOT CLICKBAIT)', ch: 'Office Olympics', views: '2,104,880', len: 3 },
    { v: 'ball', t: 'Paper ball trick shots that got me fired', ch: 'BinBallers', views: '880,421', len: 2.5 },
    { v: 'hum', t: '10 hours of fluorescent light hum (relaxing)', ch: 'Ambience Inc.', views: '14,002,393', len: 36000 },
    { v: 'x1', t: 'Boss falls asleep in meeting (GONE WRONG)', ch: 'Totally Legit Leaks', views: '3', len: 0 },
    { v: 'x2', t: 'How to hold a phone: a beginner\'s tutorial', ch: 'Learn With Gary', views: '12', len: 0 },
    { v: 'x3', t: 'ASMR: printer jam (45 minutes)', ch: 'Whisper Office', views: '991,002', len: 0 }
  ];
  const COMMENTS = [['Kim', 'Who else is watching this at work instead of making calls?', 412], ['dave_from_accounts', 'my boss is literally behind me right now', 288],
    ['Mugsy', 'the mug had a family', 1204], ['NotABot99', 'I have watched this 400 times. Worth it. Quota can wait.', 96], ['The Boss', 'Get back to work.', 3]];
  function drawVid(g, v, t, W, H) {
    g.save(); g.lineJoin = g.lineCap = 'round';
    const ink = '#1d1410', blob = (x, y, rx, ry, c, lw) => { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill(); if (lw) { g.lineWidth = lw; g.strokeStyle = ink; g.stroke(); } };
    if (v === 'cat') {
      const L = 5, p = (t % L) / L, gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#ffcf99'); gr.addColorStop(1, '#f59f6b'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      g.fillStyle = 'rgba(255,255,255,.25)'; for (let i = 0; i < 5; i++) g.fillRect(40 + i * 90, 30, 50, 70);
      g.fillStyle = '#8a5a3a'; g.fillRect(70, 190, W - 70, 16); g.fillStyle = '#6b4426'; g.fillRect(70, 206, W - 70, 70); g.strokeStyle = ink; g.lineWidth = 3; g.strokeRect(70, 190, W - 66, 16);
      // mug
      let mx = 210, my = 190, mr = 0, ma = 1;
      if (p > 0.35 && p <= 0.55) mx = 210 - (p - 0.35) / 0.2 * 140;
      else if (p > 0.55 && p <= 0.78) { const q = (p - 0.55) / 0.23; mx = 70 - q * 40; my = 190 + q * q * 160; mr = -q * 4; }
      else if (p > 0.78) { mx = 210; ma = p > 0.94 ? (p - 0.94) / 0.06 : 0; }
      if (ma > 0) {
        g.save(); g.globalAlpha = ma; g.translate(mx, my); g.rotate(mr);
        g.fillStyle = '#fff'; g.strokeStyle = ink; g.lineWidth = 3; g.beginPath(); g.roundRect(-18, -44, 36, 44, 5); g.fill(); g.stroke();
        g.beginPath(); g.arc(20, -24, 10, -1.3, 1.3); g.stroke(); g.fillStyle = '#d6342c'; g.font = '700 14px Roboto'; g.textAlign = 'center'; g.fillText('♥', 0, -16);
        if (p < 0.35 || p > 0.94) { g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 2.5; for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(-8 + k * 8, -50); g.quadraticCurveTo(-14 + k * 8 + Math.sin(t * 4 + k) * 5, -62, -8 + k * 8, -74); g.stroke(); } }
        g.restore();
      }
      if (p > 0.66 && p < 0.84) { g.save(); g.translate(70, 236); g.rotate(-0.12); g.fillStyle = '#ffd43b'; g.strokeStyle = ink; g.lineWidth = 3; g.beginPath(); for (let k = 0; k < 16; k++) { const a = k / 16 * 6.283, r = k % 2 ? 26 : 50; g.lineTo(Math.cos(a) * r * 1.4, Math.sin(a) * r * 0.8); } g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#d6342c'; g.font = '400 26px "Lilita One"'; g.textAlign = 'center'; g.fillText('CRASH!', 0, 9); g.restore(); }
      // cat
      const cx = 360, smug = p > 0.72, paw = p < 0.35 ? 300 - Math.sin(p / 0.35 * Math.PI) * 30 : p <= 0.55 ? 300 - (p - 0.35) / 0.2 * 150 + (p > 0.5 ? 0 : 0) : p < 0.7 ? 150 + (p - 0.55) / 0.15 * 150 : 300;
      g.strokeStyle = '#7d828b'; g.lineWidth = 10; g.beginPath(); g.moveTo(cx + 50, 180); g.quadraticCurveTo(cx + 110, 150 + Math.sin(t * 3) * 12, cx + 92, 100 + Math.sin(t * 3 + 1) * 10); g.stroke();
      blob(cx, 150, 52, 44, '#9aa0a8', 3);
      g.strokeStyle = '#6c727b'; g.lineWidth = 4; for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(cx - 20 + k * 18, 112); g.lineTo(cx - 14 + k * 18, 128); g.stroke(); }
      g.fillStyle = '#9aa0a8'; g.strokeStyle = ink; g.lineWidth = 3; g.beginPath(); g.moveTo(cx - 10, 152); g.quadraticCurveTo(paw + 30, 160, paw, 178); g.lineTo(paw + 6, 186); g.quadraticCurveTo(paw + 40, 176, cx + 10, 176); g.fill(); g.stroke(); blob(paw, 182, 12, 8, '#b6bbc2', 3);
      blob(cx - 20, 84, 40, 36, '#9aa0a8', 3);
      [[-50, -1], [10, 1]].forEach(([o, s]) => { g.fillStyle = '#9aa0a8'; g.beginPath(); g.moveTo(cx - 20 + o, 66); g.lineTo(cx - 20 + o + 12 * s + 8, 34); g.lineTo(cx - 20 + o + 26, 58); g.fill(); g.stroke(); });
      if (smug) { g.strokeStyle = ink; g.lineWidth = 3.5; [[-36, 1], [-6, 1]].forEach(([o]) => { g.beginPath(); g.moveTo(cx + o - 8, 82); g.lineTo(cx + o + 8, 82); g.stroke(); }); }
      else { blob(cx - 34, 82, 7, 9, '#c5f36b', 2); blob(cx - 6, 82, 7, 9, '#c5f36b', 2); blob(cx - 33, 83, 2.5, 6, ink); blob(cx - 5, 83, 2.5, 6, ink); }
      g.fillStyle = '#ff8fab'; g.beginPath(); g.moveTo(cx - 24, 94); g.lineTo(cx - 16, 94); g.lineTo(cx - 20, 99); g.fill();
      g.strokeStyle = ink; g.lineWidth = 2; g.beginPath(); g.moveTo(cx - 20, 99); g.quadraticCurveTo(cx - 26, 106, cx - 31, 102); g.moveTo(cx - 20, 99); g.quadraticCurveTo(cx - 14, 106, cx - 9, 102); g.stroke();
      g.lineWidth = 1.5; [[-1, 92], [-1, 98], [1, 92], [1, 98]].forEach(([s, y]) => { g.beginPath(); g.moveTo(cx - 20 + s * 14, y); g.lineTo(cx - 20 + s * 44, y + (y - 95) * 2); g.stroke(); });
    } else if (v === 'stapler') {
      const L = 3, p = (t % L) / L, gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#4dabf7'); gr.addColorStop(1, '#1c7ed6'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      g.fillStyle = 'rgba(255,255,255,.18)'; for (let i = 0; i < 12; i++) { g.beginPath(); g.moveTo(W / 2, -20); g.lineTo(i * 44 - 20, H); g.lineTo(i * 44 + 2, H); g.fill(); }
      g.fillStyle = '#c0d6e8'; g.fillRect(0, 222, W, 50); g.strokeStyle = ink; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 222); g.lineTo(W, 222); g.stroke();
      let y = 0, rot = 0, sq = 1;
      if (p < 0.2) sq = 1 - Math.sin(p / 0.2 * Math.PI) * 0.25;
      else if (p < 0.7) { const q = (p - 0.2) / 0.5; y = -Math.sin(q * Math.PI) * 120; rot = -q * Math.PI * 2; }
      else if (p < 0.8) sq = 1 - Math.sin((p - 0.7) / 0.1 * Math.PI) * 0.3;
      g.save(); blob(W / 2, 224, 70 + y * 0.2, 8, 'rgba(0,0,0,.18)'); g.translate(W / 2, 220 + y - 26 * sq); g.rotate(rot); g.scale(2 - sq, sq);
      g.fillStyle = '#343a40'; g.strokeStyle = ink; g.lineWidth = 3; g.beginPath(); g.roundRect(-70, 8, 140, 18, 6); g.fill(); g.stroke();
      g.fillStyle = '#e03131'; g.beginPath(); g.moveTo(-70, 6); g.quadraticCurveTo(-74, -22, -40, -24); g.lineTo(66, -16); g.quadraticCurveTo(76, -6, 66, 6); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(-10, -14, 40, 4, -0.06, 0, 7); g.fill();
      blob(-30, -6, 9, 11, '#fff', 2.5); blob(-6, -4, 9, 11, '#fff', 2.5); blob(-28, -5, 4, 5, ink); blob(-4, -3, 4, 5, ink);
      g.strokeStyle = ink; g.lineWidth = 3; g.beginPath(); g.arc(-18, 2, 6, 0.2, Math.PI - 0.2); g.stroke(); g.restore();
      if (p > 0.72 && p < 0.84) for (let k = 0; k < 6; k++) { const a = Math.PI + k / 5 * Math.PI, q = (p - 0.72) / 0.12; blob(W / 2 + Math.cos(a) * (60 + q * 70), 218 + Math.sin(a) * 18 * q, 12 * (1 - q) + 3, 9 * (1 - q) + 2, 'rgba(255,255,255,.75)'); }
      if (p > 0.8) {
        g.font = '400 44px "Lilita One"'; g.textAlign = 'center'; g.lineWidth = 7; g.strokeStyle = ink; g.strokeText('WOW!', W / 2, 70); g.fillStyle = '#ffd43b'; g.fillText('WOW!', W / 2, 70);
        ['9.8', '10', '10'].forEach((s, k) => { const x = 110 + k * 130; g.fillStyle = '#fff'; g.strokeStyle = ink; g.lineWidth = 3; g.beginPath(); g.roundRect(x - 26, 96, 52, 36, 5); g.fill(); g.stroke(); g.fillStyle = ink; g.font = '400 24px "Lilita One"'; g.fillText(s, x, 122); });
      }
    } else if (v === 'ball') {
      const L = 2.5, p = (t % L) / L, n = Math.floor(t / L) + 1, gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#f8e1c4'); gr.addColorStop(1, '#e9b98a'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      g.fillStyle = '#3b4252'; g.fillRect(0, 230, W, 40); for (let i = 0; i < 12; i++) { g.fillStyle = i % 2 ? '#323846' : '#3b4252'; g.fillRect(i * 40, 230, 40, 40); }
      g.fillStyle = '#c7ccd4'; g.strokeStyle = ink; g.lineWidth = 3; g.beginPath(); g.moveTo(370, 170); g.lineTo(440, 170); g.lineTo(432, 240); g.lineTo(378, 240); g.closePath(); g.fill(); g.stroke(); blob(405, 170, 35, 8, '#9aa1ab', 3);
      g.fillStyle = '#ffd8b0'; g.beginPath(); g.ellipse(60, 160, 26, 18, -0.4, 0, 7); g.fill(); g.stroke(); g.fillStyle = '#3b82f6'; g.fillRect(-10, 156, 50, 30); g.strokeRect(-10, 156, 50, 30);
      if (p < 0.75) { const q = p / 0.75, bx = 70 + q * 335, by = 145 - Math.sin(q * Math.PI) * 120 + q * 30; g.save(); g.translate(bx, by); g.rotate(t * 9); blob(0, 0, 14, 13, '#fbfbf7', 3); g.strokeStyle = '#9aa1ab'; g.lineWidth = 2; g.beginPath(); g.moveTo(-8, -3); g.lineTo(2, 4); g.lineTo(9, -5); g.moveTo(-4, 8); g.lineTo(4, 1); g.stroke(); g.restore(); }
      if (p > 0.75) { g.font = '400 46px "Lilita One"'; g.textAlign = 'center'; g.lineWidth = 7; g.strokeStyle = ink; g.strokeText('SWISH!', 300, 110); g.fillStyle = '#69db7c'; g.fillText('SWISH!', 300, 110); }
      g.font = '400 22px "Lilita One"'; g.textAlign = 'left'; g.fillStyle = '#fff'; g.lineWidth = 5; g.strokeStyle = ink; g.strokeText('SHOTS: ' + n + ' / ' + n, 16, 34); g.fillText('SHOTS: ' + n + ' / ' + n, 16, 34);
    } else if (v === 'hum') {
      g.fillStyle = '#d9d4c7'; g.fillRect(0, 0, W, H); g.strokeStyle = '#b9b2a2'; g.lineWidth = 2;
      for (let x = 0; x < W; x += 80) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); } for (let y = 0; y < H; y += 60) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
      const fl = Math.sin(t * 37) * Math.sin(t * 13.3) > 0.82 ? 0.25 : 1;
      g.fillStyle = '#8f8a7e'; g.fillRect(156, 96, 168, 78); g.fillStyle = 'rgba(255,253,235,' + fl + ')'; g.fillRect(162, 102, 156, 66);
      g.fillStyle = 'rgba(255,250,210,' + 0.35 * fl + ')'; g.beginPath(); g.ellipse(240, 135, 200, 110, 0, 0, 7); g.fill();
      g.font = '400 18px "Lilita One"'; g.fillStyle = 'rgba(60,55,45,.6)'; g.textAlign = 'center'; g.fillText('bzzzzzzzzzzzzzzz', 240, 225);
    } else { g.fillStyle = '#212529'; g.fillRect(0, 0, W, H); }
    g.restore();
  }
  function vidThumb(v) {
    const c = h('canvas', { width: 160, height: 90, class: 'vb-th' }), g = c.getContext('2d');
    if (v.len) { g.scale(160 / 480, 90 / 270); drawVid(g, v.v, { cat: 2.2, stapler: 1.2, ball: 1.0, hum: 0 }[v.v] || 0, 480, 270); }
    else { const gr = g.createLinearGradient(0, 0, 160, 90); gr.addColorStop(0, ['#5f3dc4', '#0c8599', '#e8590c'][hashStr(v.v) % 3]); gr.addColorStop(1, '#1d2433'); g.fillStyle = gr; g.fillRect(0, 0, 160, 90); g.fillStyle = 'rgba(255,255,255,.85)'; g.font = '400 30px "Lilita One"'; g.textAlign = 'center'; g.fillText('?', 80, 58); }
    return c;
  }
  SITES.vid = { host: VID, title: u => (VIDS.find(x => x.v === u.q.v) || VIDS[0]).t + ' - VidBonk', fav: FAV.vid,
    render: (u, t) => {
      const v = VIDS.find(x => x.v === u.q.v) || VIDS[0], cv = h('canvas', { width: 480, height: 270, class: 'vb-cv' }), g = cv.getContext('2d');
      let paused = false, tt = 0, last = performance.now(), liked = false, subbed = false;
      const bar = h('i'), time = h('span', { class: 'vb-time' }), pp = h('button', { class: 'vb-pp', html: OS_PAUSE, onclick: () => toggle() });
      const toggle = () => { paused = !paused; pp.innerHTML = paused ? PLAY : OS_PAUSE; player.classList.toggle('paused', paused); };
      const player = h('div', { class: 'vb-player' }, cv, v.len ? null : h('div', { class: 'vb-na' }, h('i', { html: OS.glyph('warning') }), h('b', {}, 'This video is unavailable in your cubicle.'), h('span', {}, 'The Boss has blocked it. He is in it.')),
        h('div', { class: 'vb-big', html: PLAY }),
        h('div', { class: 'vb-ctl' }, h('div', { class: 'vb-bar' }, bar), pp, h('i', { class: 'vb-ic', html: OS.glyph('speaker') }), time, h('em', {}, 'HD'), h('i', { class: 'vb-ic', html: OS.glyph('grid'), onclick: () => toast('Full screen is a premium feature. Premium is sold out.') })));
      cv.addEventListener('click', () => v.len && toggle());
      const fmt = s => s >= 3600 ? Math.floor(s / 3600) + ':' + String(Math.floor(s / 60) % 60).padStart(2, '0') + ':' + String(Math.floor(s) % 60).padStart(2, '0') : fmtTime(Math.floor(s));
      const frame = () => {
        if (!cv.isConnected) return;
        const nowMs = performance.now(), dt = Math.min(0.1, (nowMs - last) / 1000); last = nowMs;
        const wv = OS.wins.get('browser'), vis = OS.open && wv && !wv.el.classList.contains('min');
        if (vis && v.len) {
          if (!paused) tt += dt;
          drawVid(g, v.v, tt, 480, 270);
          const L = v.len, p = v.v === 'hum' ? tt / L : (tt % L) / L; bar.style.width = (p * 100).toFixed(2) + '%';
          time.textContent = fmt(v.v === 'hum' ? tt : tt % L) + ' / ' + fmt(L);
        } else if (!v.len) drawVid(g, 'none', 0, 480, 270);
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
      return h('div', { class: 'vb' },
        h('div', { class: 'vb-top' }, A(VID, h('span', { class: 'vb-logo' }, h('i', { html: PLAY }), 'VidBonk')), searchBox(''), h('i', { class: 'vb-me' }, (settings.name || 'A').charAt(0).toUpperCase())),
        h('div', { class: 'vb-grid' },
          h('div', { class: 'vb-main' }, player,
            h('h2', {}, v.t),
            h('div', { class: 'vb-meta' }, h('i', { class: 'vb-chav', style: { background: ['#e8590c', '#7048e8', '#0c8599', '#2f9e44'][hashStr(v.ch) % 4] } }, v.ch.charAt(0)),
              h('div', { class: 'vb-ch' }, h('b', {}, v.ch), h('small', {}, (hashStr(v.ch) % 900 + 12) + 'K subscribers')),
              h('button', { class: 'vb-sub', onclick: e => { subbed = !subbed; e.currentTarget.classList.toggle('on', subbed); e.currentTarget.textContent = subbed ? 'Subscribed' : 'Subscribe'; } }, 'Subscribe'),
              h('div', { class: 'vb-likes' }, h('button', { onclick: e => { liked = !liked; e.currentTarget.classList.toggle('on', liked); e.currentTarget.lastChild.textContent = liked ? '48K' : '47K'; } }, h('i', { html: OS.glyph('heart') }), h('span', {}, '47K')),
                h('button', { onclick: () => toast('Shared with The Boss. Oops.') }, h('i', { html: OS.glyph('megaphone') }), h('span', {}, 'Share')))),
            h('div', { class: 'vb-desc' }, h('b', {}, v.views + ' views · ' + (1 + hashStr(v.t) % 11) + ' hours ago'), h('p', {}, 'Filmed entirely during work hours. No mugs were harmed (several mugs were harmed).')),
            h('div', { class: 'vb-com' }, h('b', {}, COMMENTS.length + ' comments'), COMMENTS.map(([n, c, l]) => h('div', { class: 'vb-c' }, h('i', { style: { background: SHIRTS[hashStr(n) % SHIRTS.length] } }, n.charAt(0).toUpperCase()),
              h('div', {}, h('b', {}, '@' + n.replace(/\s/g, '').toLowerCase()), h('p', {}, c), h('small', {}, '♥ ' + l)))))),
          h('div', { class: 'vb-side' }, VIDS.filter(x => x !== v).map(x => A(VID + '/watch?v=' + x.v, h('div', { class: 'vb-rec' }, h('span', { class: 'vb-thw' }, vidThumb(x), h('em', {}, x.len >= 3600 ? '10:00:00' : x.len ? '0:0' + Math.ceil(x.len) : '?:??')),
            h('div', {}, h('b', {}, x.t), h('small', {}, x.ch), h('small', {}, x.views + ' views'))))))));
    } };
  const OS_PAUSE = '<svg viewBox="0 0 24 24"><path d="M7 5h3.6v14H7zM13.4 5H17v14h-3.6z" fill="#fff"/></svg>';

  // HowToBonk
  const SK = ['#f2c4a0', '#c98d63', '#8a5a3a', '#e0a97e', '#5c3a24'];
  function person(x, y, o) {   // a chunky cartoon worker, feet at y
    o = o || {}; const sk = o.skin || SK[0], sh = o.shirt || '#3b82f6', hr = o.hair || '#3a281c', m = o.mood || 'focus', s = o.s || 1;
    const eyes = m === 'sigh' ? '<path d="M-10 -66q4 3 8 0M3 -66q4 3 8 0" stroke="#1d1410" stroke-width="2.5" fill="none" stroke-linecap="round"/>'
      : m === 'smug' ? '<path d="M-11 -67h8M3 -67h8" stroke="#1d1410" stroke-width="3" stroke-linecap="round"/>' : '<circle cx="-6" cy="-67" r="3" fill="#1d1410"/><circle cx="7" cy="-67" r="3" fill="#1d1410"/>';
    const brow = m === 'frown' ? '<path d="M-12 -76l9 4M13 -76l-9 4" stroke="#1d1410" stroke-width="3" stroke-linecap="round"/>' : '';
    const mouth = m === 'frown' ? '<path d="M-6 -54q6-5 12 0" stroke="#1d1410" stroke-width="3" fill="none" stroke-linecap="round"/>' : m === 'smug' ? '<path d="M-5 -56q8 4 12-3" stroke="#1d1410" stroke-width="3" fill="none" stroke-linecap="round"/>'
      : m === 'sigh' ? '<ellipse cx="1" cy="-55" rx="4" ry="5" fill="#7a1f12" stroke="#1d1410" stroke-width="2"/>' : m === 'talk' ? '<path d="M-7 -57q7 9 14 0z" fill="#7a1f12" stroke="#1d1410" stroke-width="2.5"/>' : '<path d="M-5 -55h10" stroke="#1d1410" stroke-width="3" stroke-linecap="round"/>';
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')' + (o.tilt ? ' rotate(' + o.tilt + ')' : '') + '">'
      + '<path d="M-14 0v-22M14 0v-22" stroke="#39415a" stroke-width="9" stroke-linecap="round"/>'
      + '<path d="M-22 -18q-2-24 22-24t22 24z" fill="' + sh + '" stroke="#1d1410" stroke-width="3"/>'
      + '<ellipse cx="0" cy="-64" rx="23" ry="25" fill="' + sk + '" stroke="#1d1410" stroke-width="3"/>'
      + '<path d="M-23 -66q0-24 23-24t23 24q-8-12-23-12t-23 12z" fill="' + hr + '" stroke="#1d1410" stroke-width="2.5"/>' + brow + eyes + mouth + (o.extra || '') + '</g>';
  }
  const fig = (bg, body) => '<svg viewBox="0 0 240 140" xmlns="http://www.w3.org/2000/svg"><rect width="240" height="140" rx="10" fill="' + bg + '"/>' + body + '</svg>';
  const monitor = (x, y, inner) => '<g transform="translate(' + x + ' ' + y + ')"><rect x="-40" y="-56" width="80" height="54" rx="5" fill="#2b2f3a" stroke="#1d1410" stroke-width="3"/><rect x="-34" y="-50" width="68" height="42" fill="#e7f5ff"/>' + inner + '<path d="M-6 -2h12l4 12h-20z" fill="#2b2f3a"/></g>';
  const sheet = '<g stroke="#74c0fc" stroke-width="1.5">' + [0, 1, 2, 3, 4].map(r => '<path d="M-34 ' + (-44 + r * 8) + 'h68"/>').join('') + '<path d="M-14 -50v42M6 -50v42"/></g>';
  const STEPS = [
    ['Frown at your screen.', 'Nothing says "deep in a complex problem" like a furrowed brow. For bonus points, slowly shake your head and whisper "who did this".',
      fig('#fff3bf', '<path d="M0 118h240" stroke="#c9a94a" stroke-width="5"/>' + person(78, 118, { mood: 'frown', shirt: '#e64980', skin: SK[1] }) + monitor(170, 116, sheet) + '<path d="M104 46q4-8 8 0q0 6-4 6t-4-6z" fill="#74c0fc" stroke="#1d1410" stroke-width="1.5"/>')],
    ['Carry a clipboard everywhere.', 'A person with a clipboard is never questioned. It does not matter what is on it. Ours has a drawing of a horse.',
      fig('#d3f9d8', person(120, 128, { mood: 'smug', shirt: '#2f9e44', skin: SK[2], extra: '<rect x="-16" y="-44" width="30" height="38" rx="3" fill="#c98d63" stroke="#1d1410" stroke-width="2.5"/><rect x="-11" y="-38" width="20" height="28" fill="#fff"/><rect x="-6" y="-47" width="10" height="6" rx="2" fill="#adb5bd" stroke="#1d1410" stroke-width="2"/><path d="M-7 -30h12M-7 -24h12M-7 -18h8" stroke="#495057" stroke-width="1.5"/>' })
        + '<path d="M48 70h28M40 84h32M50 98h22" stroke="#2f9e44" stroke-width="4" stroke-linecap="round" opacity=".6"/>')],
    ['Type loudly.', 'Productivity is measured in decibels. Hammer the keys like the keyboard owes you money.',
      fig('#e7f5ff', '<rect x="40" y="96" width="160" height="30" rx="6" fill="#dee2e6" stroke="#1d1410" stroke-width="3"/>' + [0, 1, 2].map(r => [0, 1, 2, 3, 4, 5, 6, 7, 8].map(c => '<rect x="' + (50 + c * 16.5) + '" y="' + (100 + r * 8) + '" width="13" height="6" rx="1.5" fill="#fff" stroke="#868e96"/>').join('')).join('')
        + '<circle cx="92" cy="94" r="13" fill="' + SK[3] + '" stroke="#1d1410" stroke-width="3"/><circle cx="150" cy="90" r="13" fill="' + SK[3] + '" stroke="#1d1410" stroke-width="3"/><path d="M70 82l-8-8M174 78l8-8M80 76l-4-12M164 72l4-12" stroke="#1d1410" stroke-width="3" stroke-linecap="round"/>'
        + '<text x="120" y="48" text-anchor="middle" font-family="Lilita One,sans-serif" font-size="30" fill="#d6342c" stroke="#1d1410" stroke-width="1.2">CLACK CLACK</text>')],
    ['Sigh at regular intervals.', 'A long, theatrical sigh every 7 minutes tells everyone you carry the weight of the whole company. You do not.',
      fig('#f3d9fa', person(84, 130, { mood: 'sigh', shirt: '#7048e8', skin: SK[0], hair: '#e8b04a' }) + '<path d="M118 44q-4-22 22-24 10-14 30-6 22-4 26 14 18 6 6 24-6 14-30 10-14 10-34 2-22 2-20-20z" fill="#fff" stroke="#1d1410" stroke-width="3"/><text x="160" y="50" text-anchor="middle" font-family="Lilita One,sans-serif" font-size="24" fill="#5f3dc4">*sigh*</text><circle cx="114" cy="66" r="5" fill="#fff" stroke="#1d1410" stroke-width="2.5"/><circle cx="106" cy="78" r="3" fill="#fff" stroke="#1d1410" stroke-width="2"/>')],
    ['Walk fast, holding papers.', 'Speed implies urgency. Urgency implies importance. Never walk slowly unless you are walking away from a meeting.',
      fig('#ffe8cc', person(110, 130, { mood: 'focus', shirt: '#e8590c', skin: SK[4], tilt: 10, extra: '<rect x="12" y="-46" width="22" height="16" fill="#fff" stroke="#1d1410" stroke-width="2" transform="rotate(-12)"/>' })
        + '<rect x="160" y="30" width="20" height="14" fill="#fff" stroke="#1d1410" stroke-width="2" transform="rotate(20 170 37)"/><rect x="186" y="60" width="18" height="13" fill="#fff" stroke="#1d1410" stroke-width="2" transform="rotate(-25 195 66)"/><path d="M30 70h36M24 86h40M34 102h30" stroke="#e8590c" stroke-width="4" stroke-linecap="round" opacity=".55"/>')],
    ['Say "let\'s circle back" in every sentence.', 'Nobody knows what it means. That is its power. Pair it with "bandwidth" for maximum effect.',
      fig('#c5f6fa', person(80, 130, { mood: 'talk', shirt: '#0c8599', skin: SK[1], extra: '<path d="M18 -82q12 2 10 16l-6 16q-2 6-8 4" fill="none" stroke="#1d1410" stroke-width="6" stroke-linecap="round"/><path d="M18 -82q12 2 10 16l-6 16q-2 6-8 4" fill="none" stroke="#343a40" stroke-width="3" stroke-linecap="round"/>' })
        + '<path d="M120 22h104q8 0 8 8v34q0 8-8 8h-80l-14 14v-14h-10q-8 0-8-8V30q0-8 8-8z" fill="#fff" stroke="#1d1410" stroke-width="3"/><text x="172" y="44" text-anchor="middle" font-family="Lilita One,sans-serif" font-size="15" fill="#0b7285">Let\'s circle</text><text x="172" y="62" text-anchor="middle" font-family="Lilita One,sans-serif" font-size="15" fill="#0b7285">back on that!</text>')],
    ['Keep three spreadsheets open.', 'One spreadsheet is work. Two is a project. Three is leadership. They can all be the same spreadsheet.',
      fig('#fff0f6', monitor(120, 124, '<rect x="-30" y="-46" width="40" height="26" fill="#fff" stroke="#adb5bd"/><rect x="-18" y="-38" width="40" height="26" fill="#fff" stroke="#adb5bd"/><rect x="-6" y="-30" width="38" height="20" fill="#fff" stroke="#adb5bd"/><path d="M-2 -14l8-6 7 3 9-8" stroke="#e64980" stroke-width="2" fill="none"/>') + '<text x="200" y="40" font-family="Lilita One,sans-serif" font-size="26" fill="#e64980">x3</text>')]
  ];
  SITES.how = { host: 'howtobonk.legit', match: u => !u.path || u.path === '/look-busy', title: () => 'How to Look Busy at Work: 7 Steps (with Pictures) - HowToBonk', fav: FAV.how,
    render: () => {
      let fb;
      const step = (s, i) => h('div', { class: 'ht-step' }, h('div', { class: 'ht-fig', html: s[2] }), h('div', { class: 'ht-txt' }, h('i', {}, i + 1), h('p', {}, h('b', {}, s[0]), ' ', s[1])));
      return h('div', { class: 'ht' },
        h('div', { class: 'ht-top' }, A(HOW, h('span', { class: 'ht-logo' }, h('i', { html: OS.glyph('bolt') }), 'HowTo', h('b', {}, 'Bonk'))), searchBox(''), h('span', { class: 'ht-nav' }, 'Random article · Write an article · Log in')),
        h('div', { class: 'ht-body' },
          h('div', { class: 'ht-crumb' }, 'Home › Work › Pretending'),
          h('h1', {}, 'How to Look Busy at Work'),
          h('div', { class: 'ht-meta' }, h('span', { class: 'ht-badge', html: OS.glyph('check') + '<span>Expert-ish</span>' }), 'Co-authored by The Boss\'s Nephew · Updated 3 minutes ago · 1,204,551 views'),
          h('p', { class: 'ht-intro' }, 'Looking busy is a skill. Being busy is a different skill, and frankly an overrated one. Follow these simple steps and nobody will ever suspect you spent the afternoon watching a cat knock a mug off a desk.'),
          h('h2', {}, h('span', {}, 'Method 1'), 'At your desk'), STEPS.slice(0, 4).map((s, i) => step(s, i)),
          h('h2', {}, h('span', {}, 'Method 2'), 'Around the office'), STEPS.slice(4).map((s, i) => step(s, i + 4)),
          h('div', { class: 'ht-box tips' }, h('h3', {}, 'Tips'), h('ul', {}, h('li', {}, 'Keep a half-eaten sandwich on your desk. It implies you had no time to finish it.'), h('li', {}, 'Leave a jacket on your chair at all times. You are always "in a meeting".'))),
          h('div', { class: 'ht-box warn' }, h('h3', {}, 'Warnings'), h('ul', {}, h('li', {}, 'Do not look TOO busy. The Boss might give you more work.'), h('li', {}, 'Never sigh during a performance review. It is noted.'))),
          h('div', { class: 'ht-box need' }, h('h3', {}, 'Things you\'ll need'), h('ul', {}, ['A clipboard', 'A serious face', 'Three spreadsheets (one is fine)', 'Stamina for sighing'].map(x => h('li', {}, x)))),
          fb = h('div', { class: 'ht-fb' }, h('b', {}, 'Was this article helpful?'), h('button', { onclick: () => fb.replaceChildren(h('b', {}, 'Thanks! Your feedback has been carefully ignored.')) }, 'Yes'), h('button', { onclick: () => fb.replaceChildren(h('b', {}, 'Noted. We have forwarded your complaint to the bin.')) }, 'No')),
          h('div', { class: 'ht-rel' }, h('h3', {}, 'Related articles'), ['How to hide from your boss in plain sight', 'How to microwave fish without getting fired', 'How to win an argument with a printer'].map(t => A('howtobonk.legit/' + t.toLowerCase().replace(/[^a-z]+/g, '-'), t)))));
    } };

  // 404 + new tab
  SITES.e404 = { host: '', title: () => '404 - Page scammed', fav: FAV.err,
    render: u => h('div', { class: 'e4' },
      h('div', { class: 'e4-pic', html: '<svg viewBox="0 0 160 130" xmlns="http://www.w3.org/2000/svg"><rect x="20" y="10" width="120" height="84" rx="8" fill="#343a40" stroke="#1d1410" stroke-width="4"/><rect x="30" y="20" width="100" height="62" rx="3" fill="#a5d8ff"/>'
        + '<path d="M50 38l14 14M64 38 50 52" stroke="#1d1410" stroke-width="5" stroke-linecap="round"/><circle cx="104" cy="45" r="7" fill="#1d1410"/><path d="M60 72q20-12 40 0" stroke="#1d1410" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M118 52q4 8 0 12q-4-4 0-12z" fill="#4dabf7"/>'
        + '<path d="M70 94h20l6 18H64z" fill="#495057" stroke="#1d1410" stroke-width="3"/><rect x="48" y="110" width="64" height="8" rx="3" fill="#495057" stroke="#1d1410" stroke-width="3"/></svg>' }),
      h('h1', {}, '404'), h('h2', {}, 'This page has been scammed.'),
      h('p', {}, 'The page ', h('code', {}, shown(u.host + u.path)), ' does not exist, never existed, or was deleted by The Boss to "save space".'),
      h('div', { class: 'e4-btns' }, h('button', { onclick: () => back() }, 'Go back'), h('button', { class: 'go', onclick: () => go(SEARCH) }, 'Back to safety'))) };
  SITES.newtab = { host: NEWTAB, title: () => 'New Tab', fav: FAV.newtab,
    render: () => {
      const tiles = [[SEARCH, 'BonkSearch', FAV.search], [NEWS, 'Daily Bonk', FAV.news], [INTRA, 'Intranet', FAV.intra], [VID, 'VidBonk', FAV.vid], [HOW, 'HowToBonk', FAV.how], ['free-money.legit', 'Free money', FAV.err]];
      return h('div', { class: 'nt' }, h('div', { class: 'nt-logo' }, h('i', { html: OS.glyph('globe') }), h('b', {}, 'Bonk ', h('span', {}, 'Browser'))), searchBox('', true),
        h('div', { class: 'nt-tiles' }, tiles.map(([url, n, f]) => A(url, h('span', { class: 'nt-t' }, h('span', { class: 'nt-ti' }, favEl(f)), h('small', {}, n))))),
        h('div', { class: 'nt-tip' }, 'Tip: Bonk Browser blocks 0% of ads. We believe in freedom.'));
    } };

  /* ----- window ----- */
  let W = null;   // the open window
  function drawTabs() {
    if (!W) return;
    W.ui.tabs.replaceChildren(...tabs.map((t, i) => h('div', { class: 'bw-tab' + (i === B.cur ? ' on' : '') + (now() - (t.loadT || 0) < 0.5 ? ' load' : ''), title: t.title, onclick: () => { B.cur = i; draw(); } },
      favEl(t.fav), h('span', {}, t.title), h('button', { class: 'bw-x', title: 'Close tab', html: OS_WIN_BTN.x, onclick: e => { e.stopPropagation(); closeTab(t); } }))),
    h('button', { class: 'bw-new', title: 'New tab', html: OS.glyph('plus'), onclick: () => newTab(NEWTAB) }));
  }
  function draw(loaded) {
    if (!W) return; const t = tab(), url = t.hist[t.i] || NEWTAB, { s, u } = route(url);
    t.title = s.title(u); t.fav = s.fav; t.live = null; t.url = url;
    const u2 = W.ui; u2.addr.value = shown(url); u2.lock.style.visibility = url.startsWith('bonk://') ? 'hidden' : '';
    u2.back.disabled = t.i <= 0; u2.fwd.disabled = t.i >= t.hist.length - 1;
    const page = h('div', { class: 'bw-page' });
    try { page.append(s.render(u, t)); } catch (e) { console.error('browser page failed', e); page.append(SITES.e404.render(u)); }
    u2.view.replaceChildren(page); u2.view.scrollTop = 0;
    if (loaded) { u2.prog.classList.remove('go'); void u2.prog.offsetWidth; u2.prog.classList.add('go'); }
    $('.t', W.tb).textContent = t.title + ' - Bonk Browser';
    drawTabs();
  }
  const BM = [[SEARCH, 'BonkSearch', FAV.search], [NEWS, 'Daily Bonk', FAV.news], [INTRA, 'Intranet', FAV.intra], [VID, 'VidBonk', FAV.vid], [HOW, 'HowToBonk', FAV.how]];
  OS.apps.browser = {
    desktop: true, order: 35, title: 'Browser', icon: 'globe', color: '#1c7ed6', w: 800, h: 580, x: 0.08, y: 0.02, cls: 'bwwin',
    render(b, w) {
      W = w; const u = w.ui = {};
      const nav = (g, title, fn, svg) => h('button', { class: 'bw-nb', title, html: svg || OS.glyph(g), onclick: fn });
      b.append(
        u.tabs = h('div', { class: 'bw-tabs' }),
        h('div', { class: 'bw-bar' },
          u.back = nav(null, 'Back', back, '<svg viewBox="0 0 24 24"><path d="M19 12H6M11 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>'),
          u.fwd = nav(null, 'Forward', fwd, '<svg viewBox="0 0 24 24"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>'),
          nav('refresh', 'Reload', () => draw(true)), nav('home', 'Home', () => go(NEWTAB)),
          h('div', { class: 'bw-addr' }, u.lock = h('i', { html: OS.glyph('lock') }),
            u.addr = h('input', { spellcheck: false, placeholder: 'Search BonkSearch or type a web address', onkeydown: e => { if (e.key === 'Enter') { go(u.addr.value); u.addr.blur(); } }, onfocus: e => e.target.select() }),
            h('i', { class: 'bw-star', html: OS.glyph('star'), onclick: () => toast('Bookmarked. We will never speak of it again.') })),
          h('i', { class: 'bw-me', style: { background: settings.color } }, (settings.name || 'A').charAt(0).toUpperCase())),
        u.prog = h('div', { class: 'bw-prog' }),
        h('div', { class: 'bw-bm' }, BM.map(([url, n, f]) => h('button', { onclick: () => go(url) }, favEl(f), n))),
        u.view = h('div', { class: 'bw-view' }));
      if (!tabs.length) { newTab(SEARCH, true); newTab(NEWS, true); newTab(INTRA, true); B.cur = 0; }
      draw();
      w.timer = setInterval(() => { if (!w.el.isConnected) return; const t = tab(); if (t && t.live && OS.open && !w.el.classList.contains('min')) t.live(); }, 1000);
    },
    onClose(w) { clearInterval(w.timer); if (W === w) W = null; }
  };
  OS.pinned.push('browser');
  Bus.on('quit', () => { tabs.length = 0; B.cur = 0; });

  return { tabs, go: url => { if (!W) OS.launch('browser'); go(url); }, newTab: url => { if (!W) OS.launch('browser'); return newTab(url); }, back, fwd, norm, route, SITES, VIDS, drawVid, current: () => tab() && tab().url };
})();
