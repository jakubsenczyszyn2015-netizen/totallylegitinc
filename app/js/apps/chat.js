'use strict';
/* =====================================================================
   CHATTERBOX — "The world's most secure messaging app" (OS.apps.chat, free).
   Chat with teammates (Net 'chat') and silly bot contacts, unread badges,
   toasts, and the Chatterbox Gold gift-card prank. API: docs/modules/tools.md
   ===================================================================== */
const Chat = (() => {
  const S40 = s => '<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">' + s + '</svg>';
  const LOGO = S40('<circle cx="20" cy="20" r="19" fill="#7a45e6"/><circle cx="20" cy="20" r="19" fill="url(#cbg)"/><defs><radialGradient id="cbg" cx=".3" cy=".25" r=".9"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>'
    + '<path d="M9 13c0-2.6 2-4.6 4.6-4.6h12.8c2.6 0 4.6 2 4.6 4.6v8.6c0 2.6-2 4.6-4.6 4.6H18.5l-6.2 5v-5H13.6C11 26.2 9 24.2 9 21.6z" fill="#fff"/>'
    + '<circle cx="16" cy="16.6" r="2.1" fill="#2a1a57"/><circle cx="24" cy="16.6" r="2.1" fill="#2a1a57"/><circle cx="16.7" cy="15.9" r=".7" fill="#fff"/><circle cx="24.7" cy="15.9" r=".7" fill="#fff"/>'
    + '<path d="M15.6 20.4q4.4 3.6 8.8 0" stroke="#ff4f7b" stroke-width="2.2" fill="none" stroke-linecap="round"/>');
  const SEND = '<svg viewBox="0 0 24 24"><path d="M3.4 20.6 21 12 3.4 3.4l.1 6.7L15 12 3.5 13.9z" fill="#fff"/></svg>';
  const FACES = {
    it: S40('<rect width="40" height="40" fill="#2f9e8f"/><rect x="7" y="9" width="26" height="18" rx="3" fill="#20242c" stroke="#0e1015" stroke-width="1.6"/><rect x="9.5" y="11.5" width="21" height="13" rx="1.5" fill="#7cf0c9"/>'
      + '<circle cx="16" cy="17" r="1.6" fill="#13342b"/><circle cx="24" cy="17" r="1.6" fill="#13342b"/><path d="M15.5 21.4h9" stroke="#13342b" stroke-width="1.6" stroke-linecap="round"/><path d="M17 27h6l1.6 5h-9.2z" fill="#20242c"/>'
      + '<path d="M27.8 23.8l5.6 5.6a2 2 0 0 1-2.8 2.8L25 26.6a4.2 4.2 0 0 1-5.2-5.6l2.6 2.6 2-2-2.6-2.6a4.2 4.2 0 0 1 5.6 5.2z" fill="#ffd43b" stroke="#6b4b00" stroke-width="1"/>'),
    mum: S40('<rect width="40" height="40" fill="#f7b0c8"/><path d="M5 41q1-11 15-11t15 11z" fill="#9b59d0"/><path d="M14 31q6 4 12 0" stroke="#fff" stroke-width="1.6" fill="none" stroke-dasharray="1.2 1.4" stroke-linecap="round"/>'
      + '<g fill="#8a5a3a"><circle cx="11" cy="15" r="5"/><circle cx="14" cy="9.5" r="5"/><circle cx="20" cy="7.5" r="5.2"/><circle cx="26" cy="9.5" r="5"/><circle cx="29" cy="15" r="5"/><circle cx="10.5" cy="21" r="4"/><circle cx="29.5" cy="21" r="4"/></g>'
      + '<ellipse cx="20" cy="19" rx="8.6" ry="9.6" fill="#c98d63"/><circle cx="16.2" cy="18" r="3" fill="none" stroke="#7a2d5c" stroke-width="1.3"/><circle cx="23.8" cy="18" r="3" fill="none" stroke="#7a2d5c" stroke-width="1.3"/><path d="M19.2 18h1.6" stroke="#7a2d5c" stroke-width="1.2"/>'
      + '<circle cx="16.2" cy="18.2" r="1.1" fill="#2a1a10"/><circle cx="23.8" cy="18.2" r="1.1" fill="#2a1a10"/><path d="M16.4 23.2q3.6 3 7.2 0" stroke="#a3283e" stroke-width="1.6" fill="none" stroke-linecap="round"/><circle cx="13.6" cy="22" r="1.6" fill="#ff6f8f" opacity=".45"/><circle cx="26.4" cy="22" r="1.6" fill="#ff6f8f" opacity=".45"/>'),
    lord: S40('<rect width="40" height="40" fill="#e9c46a"/><path d="M4 41q1-11 16-11t16 11z" fill="#1d2433"/><path d="M17 30l3 6 3-6z" fill="#fff"/><path d="M18.4 31.5h3.2l-1.6 3z" fill="#c92a2a"/>'
      + '<ellipse cx="20" cy="21" rx="8.4" ry="9.2" fill="#f1c7a5"/><rect x="11" y="3" width="18" height="11" rx="1" fill="#14161c"/><rect x="11" y="10.4" width="18" height="2.2" fill="#7a1f2b"/><rect x="7.5" y="13" width="25" height="2.6" rx="1.3" fill="#14161c"/>'
      + '<circle cx="16.4" cy="20" r="1.2" fill="#14161c"/><circle cx="23.6" cy="20" r="3.1" fill="#dff3ff" fill-opacity=".55" stroke="#c9a227" stroke-width="1.3"/><circle cx="23.6" cy="20" r="1.2" fill="#14161c"/><path d="M26.6 21.5q1.6 4 .4 9" stroke="#c9a227" stroke-width=".8" fill="none"/>'
      + '<path d="M12.6 25.6q3.6-3 7.4-.6 3.8-2.4 7.4.6-3.4 1.6-7.4.4-4 1.2-7.4-.4z" fill="#f4f1ea" stroke="#9a948a" stroke-width=".8"/>'),
    bank: S40('<rect width="40" height="40" fill="#3d7bd9"/><path d="M6 15 20 6l14 9z" fill="#f4f1ea" stroke="#1d2433" stroke-width="1.4" stroke-linejoin="round"/><text x="20" y="14.4" text-anchor="middle" font-family="Roboto,sans-serif" font-weight="900" font-size="6.5" fill="#2f9e44">$</text>'
      + '<rect x="7" y="15" width="26" height="2.6" fill="#f4f1ea" stroke="#1d2433" stroke-width="1.2"/><g fill="#f4f1ea" stroke="#1d2433" stroke-width="1.1"><rect x="9" y="18" width="3.4" height="11"/><rect x="15" y="18" width="3.4" height="11"/><rect x="21.6" y="18" width="3.4" height="11"/><rect x="27.6" y="18" width="3.4" height="11"/></g>'
      + '<rect x="6" y="29" width="28" height="3" fill="#f4f1ea" stroke="#1d2433" stroke-width="1.2"/><ellipse cx="16.7" cy="22.4" rx="2.6" ry="2.1" fill="#fff" stroke="#1d2433" stroke-width="1"/><ellipse cx="23.3" cy="22.4" rx="2.6" ry="2.1" fill="#fff" stroke="#1d2433" stroke-width="1"/>'
      + '<circle cx="18" cy="22.8" r="1.1" fill="#1d2433"/><circle cx="24.6" cy="22.8" r="1.1" fill="#1d2433"/><path d="M14.2 19.6l4.6.8M25.8 19.6l-4.6.8" stroke="#1d2433" stroke-width="1.2" stroke-linecap="round"/>')
  };
  const say = x => typeof x === 'function' ? x() : x;
  const BOTS = [
    { id: 'bot:boss', name: 'The Boss', status: 'In a meeting about meetings', face: () => OS_BOSS_FACE, every: [90, 180],
      any: ['Less typing, more dialing.', 'Is this about the quota? It had better be about the quota.', 'I don\'t read messages. I had an assistant for that. I fired the assistant.',
        'Noted. Filed. Ignored.', 'Do you know what I see when I look at you? A cost centre.', 'Put it in an email. Then delete the email.', 'k.'],
      rules: [[/raise|money|pay|salary|bonus/i, ['A raise? Hit the quota three days in a row and I will consider considering it.', 'Money is a reward for results. Your results are a reward for nobody.']],
        [/sick|home|leave|holiday|vacation|break|tired/i, ['You can rest when the quota is met. Or when you\'re fired. Whichever comes first.', 'Breaks are a myth invented by people with jobs elsewhere.']],
        [/quota|target/i, [() => G.mode === 'week' ? 'The quota is the quota. Today it is ' + money(G.quota) + '. You are at ' + money(G.team) + '. Do the maths.' : 'There is no quota in overtime. There is only more.']],
        [/sorry|oops|my bad/i, ['Sorry doesn\'t pay the electricity bill.']],
        [/^(hi|hey|hello|yo|sup)\b/i, ['Don\'t "hi" me. Hi the phone.', 'Hello. Your phone misses you.']]],
      gold: ['Did you just send your BOSS a "free gift"? I\'m adding this to your performance review. In red pen.', 'I have forwarded this to IT, HR and your mother.'],
      idle: ['Reminder: the quota is not a suggestion.', 'Why is your phone not ringing? Make it ring.', 'Whoever microwaved fish in the break room: you\'re fired. Spiritually.', 'I can see you on the CCTV. Smile less, dial more.'] },
    { id: 'bot:it', name: 'IT Department', status: 'Have you tried turning it off and on?', face: () => FACES.it, every: [200, 360],
      any: ['Have you tried turning it off and on again?', () => 'Ticket #' + randi(1000, 9999) + ' created. Expected response time: 6 to 8 business years.', 'Please describe the problem in exactly three words.',
        'That\'s a user problem. The user is you.', 'We\'ve escalated this to the intern. The intern is on lunch. Since March.'],
      rules: [[/virus|popup|pop-up|pop up|malware|hack/i, ['Pop-ups? Buy BugBuster from BonkMart. Or close them faster. Your choice.', 'Did you click a free gift? We told you not to click free gifts.']],
        [/password|login|pin/i, ['Your password is "password". We changed it to "password1" for security.']],
        [/slow|lag|frozen|crash/i, ['Your computer is slow because you\'re watching it. Look away.', 'Have you tried yelling at it? Works for us.']],
        [/printer|print/i, ['The printer is haunted. We don\'t go near the printer.']]],
      gold: [() => 'Nice try. We invented that prank. Ticket #' + randi(1000, 9999) + ' opened against you.'],
      idle: ['Scheduled maintenance tonight: we will be unplugging things to see what happens.', 'Reminder: never click a free gift. Unless it\'s from us. It\'s never from us.'] },
    { id: 'bot:mum', name: 'Mum', status: 'Online (do you ever call?)', face: () => FACES.mum, every: [120, 260], clicks: true,
      any: ['Are you eating properly?', 'Your cousin got promoted again. Just saying.', 'Call me on your break. Do you get breaks?', 'I told the neighbours you work in finance.',
        'Love you sweetheart xx', 'Wear a jumper, it\'s cold in those offices.', 'Did you get the parcel? It\'s socks.'],
      rules: [[/^(hi|hey|hello)\b/i, ['Hello darling! Are you wearing a jumper?']], [/money|loan|rent|pay/i, ['Money? Again? Is this job even paying you?']],
        [/love|miss/i, ['Love you more!! xxx']], [/job|work|boss|scam/i, ['Is it a REAL job? Auntie Brenda says call centres are all scams.', 'Is your boss nice? He sounds loud.']]],
      gold: ['Ooh, a free gift! I clicked it. Now my screen is full of little windows. Is this the internet?', 'Thank you darling! I clicked claim and the computer is beeping. Should I unplug the house?'],
      idle: ['Did you take your lunch? I put a note in it.', 'Your father says hello. He doesn\'t, but he would.', 'How do I make the letters bigger', 'I sent you a link about vitamins. Did you read it?'] },
    { id: 'bot:lord', name: 'Lord Bonkington III', status: 'Online from his yacht', face: () => FACES.lord, every: [150, 300], clicks: true,
      any: ['Greetings, dear friend! I require your help moving my fortune of 40 million Bonk Bucks.', 'Simply send a small fee of $50 in assorted coupons and the fortune is yours. Pip pip!',
        'My butler shall handle the paperwork. He is very trustworthy. He is also a goat.', 'Splendid! Splendid! I\'m told I own a yacht.', 'Do write back quickly, old sport. The fortune is getting restless.'],
      rules: [[/no\b|scam|fake|liar|nope/i, ['A SCAM?! How dare you. I am deeply offended. Now, about that fee...']], [/yes|ok|sure|deal/i, ['Marvellous! Please send $50 in assorted coupons and one (1) sandwich.']]],
      gold: ['A GIFT! For me?! How frightfully generous! *clicks* ...oh dear. My monocle has 37 pop-ups.'],
      idle: ['Dear friend, you have been selected to inherit my third-best castle.', 'Urgent: my yacht is stuck in a smaller yacht. Please advise.'] },
    { id: 'bot:bank', name: 'Totally Real Bank', status: 'Verified ✓ (we checked ourselves)', face: () => FACES.bank, every: [140, 280], sendsGold: true,
      any: ['Dear valued customer, your account has been very suspended. Please reply with your password to unsuspend it.', 'This is definitely the bank. Not a man in a basement. We are a bank.',
        'For security, please confirm your password, your PIN and your favourite sandwich.', 'Thank you for banking with us. Please do not call the real bank.'],
      rules: [[/password|pin|code/i, ['Thank you! We have also changed it to 1234 for your convenience.']], [/scam|fake|real/i, ['We are a totally real bank. It says so in our name.']]],
      gold: ['Ha. Amateurs. We sent that one in 2009.'],
      idle: ['Congratulations, your account has won a prize! Claim your gift below.'] }
  ];
  const BOT = {}; BOTS.forEach(b => { BOT[b.id] = b; });

  const threads = new Map(), unread = new Map(), names = new Map(), typing = new Map(), lastGold = new Map(), timers = new Map();
  let gen = 0; const later = (fn, ms) => { const g = gen; setTimeout(() => { if (g === gen && G.phase !== 'menu') fn(); }, ms); };   // dropped after quitting to the menu
  let sel = null, seq = 0, badgeN = -1;
  const isBot = id => !!BOT[id];
  const mid = () => (Net.myId || 'me') + ':' + Date.now().toString(36) + ':' + (++seq);
  const clockT = () => { try { return OS.clock()[0]; } catch (e) { return ''; } };
  const thread = id => { let t = threads.get(id); if (!t) threads.set(id, t = []); return t; };
  const nameOf = id => BOT[id] ? BOT[id].name : (Net.players.get(id) && Net.players.get(id).name) || names.get(id) || 'Agent';
  const online = id => isBot(id) || Net.players.has(id);

  /* tiny cartoon portrait of a teammate from their look (skin, hair, shirt) */
  function personFace(id) {
    const p = Net.players.get(id); let L = null;
    try { L = p && p.ext && p.ext.look ? unpackLook(p.ext.look) : null; } catch (e) { L = null; }
    const shirt = (L && L.shirt) || (p && p.color) || SHIRTS[hashStr(String(id)) % SHIRTS.length], skin = (L && L.skin) || '#e0a97e', hc = (L && L.hairColor) || '#3a281c', hs = (L && L.hair) || 'short';
    const hair = hs === 'bald' ? '' : hs === 'afro' ? '<circle cx="20" cy="15" r="11.5" fill="' + hc + '"/>'
      : /long|bun|ponytail/.test(hs) ? '<path d="M10 30V17a10 10 0 0 1 20 0v13h-4V18H14v12z" fill="' + hc + '"/>' : '<path d="M11.2 18.5a8.8 9.6 0 0 1 17.6 0q-3-5-8.8-5t-8.8 5z" fill="' + hc + '"/>';
    return S40('<rect width="40" height="40" fill="#cfd6ea"/><path d="M5 41q1-11 15-11t15 11z" fill="' + shirt + '"/>' + hair
      + '<ellipse cx="20" cy="20" rx="8.6" ry="9.6" fill="' + skin + '"/>' + (hs !== 'bald' && hs !== 'afro' ? '<path d="M11.4 18.2a8.6 9.6 0 0 1 17.2 0q-3.2-4.2-8.6-4.2t-8.6 4.2z" fill="' + hc + '"/>' : '')
      + '<circle cx="16.6" cy="19.6" r="1.3" fill="#1d1410"/><circle cx="23.4" cy="19.6" r="1.3" fill="#1d1410"/><path d="M16.6 24q3.4 2.6 6.8 0" stroke="#1d1410" stroke-width="1.5" fill="none" stroke-linecap="round"/>'
      + '<path d="M10.6 20a9.4 10 0 0 1 18.8 0" stroke="#22252c" stroke-width="1.6" fill="none"/><rect x="9" y="18.6" width="3" height="5" rx="1.4" fill="#22252c"/><path d="M11 23.4q1 4.6 5.4 4.8" stroke="#22252c" stroke-width="1.2" fill="none"/>');
  }
  const faceOf = id => BOT[id] ? BOT[id].face() : personFace(id);
  function contacts() {
    const ids = [];
    for (const id of Net.players.keys()) if (id !== Net.myId) ids.push(id);
    for (const id of threads.keys()) if (!isBot(id) && !ids.includes(id)) ids.push(id);   // teammates who left keep their thread
    return ids.concat(BOTS.map(b => b.id));
  }
  const total = () => { let n = 0; for (const v of unread.values()) n += v; return n; };
  function syncBadge() { const n = total(); if (n === badgeN) return; badgeN = n; OS.badge('chat', n > 0 ? n : false); }
  function win() { const w = OS.wins.get('chat'); return w && w.ui ? w : null; }
  const visible = w => w && OS.open && !w.el.classList.contains('min');

  /* ----- messages ----- */
  function push(cid, m, quiet) {
    m.id = m.id || mid(); m.t = m.t || clockT();
    const t = thread(cid); t.push(m); if (t.length > 80) t.splice(0, t.length - 80);
    if (!isBot(cid) && Net.players.get(cid)) names.set(cid, Net.players.get(cid).name);
    const w = win(), seen = visible(w) && sel === cid;
    if (!m.me && !m.sys && !seen) {
      unread.set(cid, (unread.get(cid) || 0) + 1); syncBadge();
      if (!quiet) {
        AudioSys.tone(880, 0.07, 'sine', 0.12); AudioSys.tone(1320, 0.12, 'sine', 0.1, 0.07);
        if (!visible(w)) toast(h('span', { class: 'cbx-toast' }, h('i', { html: faceOf(cid) }), h('span', {}, h('b', {}, nameOf(cid)), m.gift ? 'sent you a gift! Click to claim.' : m.text)));
      }
    } else if (!m.me && !m.sys && !quiet) AudioSys.tone(990, 0.06, 'sine', 0.08);
    if (w) { drawContacts(w); if (sel === cid) drawMsgs(w); }
    return m;
  }
  function send(cid, text) {
    text = String(text || '').trim().slice(0, 300); if (!text || !cid) return;
    const m = push(cid, { me: true, text }); SFX.click();
    if (isBot(cid)) botAnswer(cid, text);
    else Net.emit('chat', { k: 'm', id: m.id, text }, { to: cid });
  }
  function gold(cid) {
    if (!cid) return;
    const last = lastGold.get(cid) || 0;
    if (now() - last < 12) { toast('Easy, prankster. Let the last gift land first.'); return; }
    lastGold.set(cid, now());
    const m = push(cid, { me: true, gift: 'gold' }); SFX.popup();
    if (isBot(cid)) {
      const b = BOT[cid];
      botType(cid, rand(1.6, 3), () => {
        if (b.clicks) { m.claimed = true; push(cid, { sys: true, text: b.name + ' claimed your Chatterbox Gold.' }, true); }
        push(cid, { text: say(pick(b.gold)) });
      });
    } else Net.emit('chat', { k: 'gold', id: m.id }, { to: cid });
  }
  /* the recipient clicks a gift card: pop-up storm + mockery, and the sender hears about it */
  function claim(cid, m) {
    if (!m || m.me || m.claimed) return;
    m.claimed = true;
    const who = nameOf(cid), blocked = typeof BugBuster !== 'undefined' && BugBuster.shielded();
    if (OS.open) { OS.virus(blocked ? 10 : 12); setTimeout(() => OS.cashFx('PRANKED!', true), 250); }
    SFX.bad();
    if (isBot(cid)) later(() => push(cid, { text: cid === 'bot:bank' ? 'Thank you for claiming. Your computer now belongs to us. Have a nice day.' : 'Gotcha.' }), 1400);
    else { Net.emit('chat', { k: 'claim', id: m.id }, { to: cid }); later(() => push(cid, { text: pick(['GOTCHA', 'lmao you clicked it', 'never click the free gift. never.', 'enjoy your premium pop-ups']), auto: true }, true), 900); }
    push(cid, { sys: true, text: 'Chatterbox Gold does not exist. ' + who + ' got you' + (blocked ? ' (BugBuster ate the pop-ups).' : '.') }, true);
    Bus.emit('chat:pranked', { from: cid });
  }
  function claimed(cid, id) {
    const m = thread(cid).find(x => x.id === id && x.me && x.gift); if (!m || m.claimed) return;
    m.claimed = true; const who = nameOf(cid);
    push(cid, { sys: true, text: who + ' clicked your Chatterbox Gold. Their screen is now 80% pop-ups.' }, true);
    toast(h('span', { class: 'cbx-toast' }, h('i', { html: faceOf(cid) }), h('span', {}, h('b', {}, 'Chatterbox Gold'), who + ' fell for your free gift! Their screen is a pop-up storm.')), 'good'); SFX.cash();
    Bus.emit('chat:prank', { to: cid });
  }

  /* ----- bots ----- */
  function botType(cid, secs, fn) {
    typing.set(cid, now() + secs + 1); const w = win(); if (w && sel === cid) drawMsgs(w);
    const g = gen; setTimeout(() => { typing.delete(cid); if (G.phase === 'menu' || g !== gen) return; fn(); const w2 = win(); if (w2 && sel === cid) drawMsgs(w2); }, secs * 1000);
  }
  function botLine(b, text) {
    let pool = null;
    for (const [re, lines] of b.rules || []) if (re.test(text)) { pool = lines; break; }
    pool = pool || b.any; let i = Math.floor(Math.random() * pool.length);
    if (pool.length > 1 && pool[i] === b._last) i = (i + 1) % pool.length;
    b._last = pool[i]; return say(pool[i]);
  }
  function botAnswer(cid, text) {
    const b = BOT[cid]; if (b._busy) return; b._busy = true;
    setTimeout(() => botType(cid, rand(1.2, 2.6), () => {
      b._busy = false; push(cid, { text: botLine(b, text) });
      if (Math.random() < 0.22) botType(cid, rand(1.4, 2.4), () => push(cid, { text: say(pick(b.idle)) }));
    }), rand(400, 1100));
  }
  function botIdle(b) {
    if (b.sendsGold && !thread(b.id).some(m => m.gift && !m.me && !m.claimed)) { push(b.id, { text: say(pick(b.idle)) }); push(b.id, { gift: 'gold' }, true); }
    else push(b.id, { text: say(pick(b.idle.concat(b.any))) });
  }
  function resetTimers() { for (const b of BOTS) timers.set(b.id, rand(b.every[0], b.every[1]) * (b.id === 'bot:boss' ? 0.35 : 1)); }
  Loop.add(dt => {
    if (G.phase !== 'day' || (G.paused && !Net.active)) return;
    for (const b of BOTS) { const t = timers.get(b.id) - dt; if (t <= 0) { timers.set(b.id, rand(b.every[0], b.every[1])); botIdle(b); } else timers.set(b.id, t); }
  });
  Bus.on('day:start', e => {
    resetTimers();
    if (e && e.day === 1 && !e.late && !thread('bot:mum').length) push('bot:mum', { text: 'Good luck on your first day sweetheart! Be nice to people on the phone xx' }, true);
  });
  Bus.on('scam:paid', () => { if (Math.random() < 0.25) later(() => push('bot:boss', { text: pick(['Good. Now do it again. Faster.', 'Adequate.', 'I saw that. I am not impressed yet.']) }), 2500); });
  Bus.on('scam:baited', () => { if (Math.random() < 0.5) later(() => push('bot:boss', { text: pick(['You got baited. On a recorded line. Wonderful.', 'A scambaiter? Again? I\'m printing this one out.']) }), 2500); });
  let itT = 0;
  setInterval(() => { if (OS.open && OS.popups >= 6 && now() - itT > 240) { itT = now(); push('bot:it', { text: 'We noticed ' + OS.popups + ' pop-ups on your machine. Unrelated: please stop clicking things.' }); } }, 3000);
  Bus.on('quit', () => { gen++; for (const x of BOTS) x._busy = false; threads.clear(); unread.clear(); typing.clear(); sel = null; badgeN = -1; syncBadge(); });

  Net.on('chat', (p, from) => {
    if (!p || typeof p !== 'object' || !from || isBot(from)) return;
    const id = typeof p.id === 'string' ? p.id.slice(0, 60) : mid();
    if (p.k === 'm') { typing.delete(from); push(from, { id, text: String(p.text || '').slice(0, 300) }); }
    else if (p.k === 'gold') push(from, { id, gift: 'gold' });
    else if (p.k === 'claim') claimed(from, id);
    else if (p.k === 'typing') { typing.set(from, now() + 3); const w = win(); if (w && sel === from) drawMsgs(w); }
  });

  /* ----- window ----- */
  function drawContacts(w) {
    const q = w.ui.search.value.trim().toLowerCase();
    w.ui.list.replaceChildren(...contacts().filter(id => !q || nameOf(id).toLowerCase().includes(q)).map(id => {
      const n = unread.get(id) || 0, b = BOT[id], on = online(id);
      return h('button', { class: 'cbx-c' + (id === sel ? ' on' : '') + (b ? ' bot' : ''), onclick: () => select(id) },
        h('i', { class: 'cbx-av', html: faceOf(id) }, h('em', { class: 'dot' + (on ? '' : ' off') })),
        h('span', { class: 'cbx-cn' }, h('b', {}, nameOf(id)), h('small', {}, b ? (id === 'bot:boss' ? 'Busy' : 'Online') : on ? 'Online' : 'Offline')),
        n ? h('em', { class: 'cbx-un' }, n > 9 ? '9+' : n) : null);
    }));
    w.ui.sig = contacts().join(',') + '|' + Net.players.size;
  }
  function msgEl(cid, m) {
    if (m.sys) return h('div', { class: 'cbx-sys' }, m.text);
    const who = m.me ? 'You' : nameOf(cid);
    if (m.gift) {
      const card = h('div', { class: 'cbx-gift' + (m.claimed ? ' used' : '') + (m.me ? ' mine' : ''), onclick: () => { if (!m.me && !m.claimed) { claim(cid, m); const w = win(); if (w) drawMsgs(w); } } },
        h('i', { class: 'cbx-glogo', html: LOGO }),
        h('div', {}, h('b', {}, 'CHATTERBOX GOLD'), h('em', {}, '1 MONTH • FREE'),
          h('small', {}, m.me ? (m.claimed ? 'They clicked it. Heh heh.' : 'Waiting for them to click...') : m.claimed ? 'Claimed. That was a mistake.' : 'Exclusive gift • CLICK TO CLAIM')));
      return h('div', { class: 'cbx-m gift' + (m.me ? ' me' : '') }, h('div', { class: 'cbx-gh' }, m.me ? 'YOU SENT A CHATTERBOX GOLD GIFT' : 'YOU RECEIVED A CHATTERBOX GOLD GIFT'), card, h('small', { class: 'cbx-t' }, m.t));
    }
    return h('div', { class: 'cbx-m' + (m.me ? ' me' : '') }, m.me ? null : h('i', { class: 'cbx-mav', html: faceOf(cid) }),
      h('div', { class: 'cbx-bub' }, m.me ? null : h('b', {}, who), h('span', {}, m.text), h('small', { class: 'cbx-t' }, m.t)));
  }
  function drawMsgs(w) {
    const u = w.ui, cid = sel; if (!cid) return;
    const b = BOT[cid], on = online(cid);
    u.head.replaceChildren(h('i', { class: 'cbx-av big', html: faceOf(cid) }, h('em', { class: 'dot' + (on ? '' : ' off') })),
      h('div', {}, h('b', {}, nameOf(cid)), h('small', {}, b ? b.status : on ? 'Online now' : 'Offline')),
      h('span', { class: 'cbx-lock', html: OS.glyph('lock') + '<span>End-to-end encrypted*</span>', title: '*encrypted with a Caesar cipher of 0' }));
    const list = thread(cid), tp = typing.get(cid) > now();
    u.msgs.replaceChildren(...(list.length ? [] : [h('div', { class: 'cbx-empty' }, h('i', { html: faceOf(cid) }), h('b', {}, 'Say hi to ' + nameOf(cid) + '!'), h('span', {}, b ? 'Messages are definitely private.' : 'Or send them a free gift. Totally safe.'))]),
      ...list.map(m => msgEl(cid, m)), ...(tp ? [h('div', { class: 'cbx-m typing' }, h('i', { class: 'cbx-mav', html: faceOf(cid) }), h('div', { class: 'cbx-bub' }, h('i'), h('i'), h('i')))] : []));
    u.msgs.scrollTop = u.msgs.scrollHeight;
    u.inp.placeholder = 'Message ' + nameOf(cid);
  }
  function select(id) {
    sel = id; unread.delete(id); syncBadge();
    const w = win(); if (w) { drawContacts(w); drawMsgs(w); }
  }
  function submit(w) { const v = w.ui.inp.value; w.ui.inp.value = ''; send(sel, v); w.ui.inp.focus(); }
  let typT = 0;
  OS.apps.chat = {
    desktop: true, order: 30, title: 'Chatterbox', icon: 'chat', color: '#7a45e6', w: 600, h: 490, x: 0.02, y: 0.03, cls: 'cbxwin',
    render(b, w) {
      const u = w.ui = {};
      b.append(
        h('div', { class: 'cbx-top' }, h('i', { class: 'cbx-logo', html: LOGO }), h('div', {}, h('b', {}, 'Chatterbox'), h('span', {}, 'The world\'s most secure messaging app.'))),
        h('div', { class: 'cbx-body' },
          h('div', { class: 'cbx-side' }, h('div', { class: 'cbx-lab' }, 'Contacts'),
            u.search = h('input', { class: 'cbx-search', placeholder: 'Search contacts', spellcheck: false, oninput: () => drawContacts(w) }),
            u.list = h('div', { class: 'cbx-list' })),
          h('div', { class: 'cbx-conv' }, u.head = h('div', { class: 'cbx-head' }), u.msgs = h('div', { class: 'cbx-msgs' }),
            h('div', { class: 'cbx-comp' },
              h('button', { class: 'cbx-gold', title: 'Send a FREE Chatterbox Gold gift (wink)', html: OS.glyph('gift') + '<span>GOLD</span>', onclick: () => gold(sel) }),
              u.inp = h('input', { class: 'cbx-inp', maxLength: 300, spellcheck: false, placeholder: 'Type a message',
                onkeydown: e => { if (e.key === 'Enter') submit(w); else if (!isBot(sel) && now() - typT > 2.5) { typT = now(); Net.emit('chat', { k: 'typing' }, { to: sel }); } } }),
              h('button', { class: 'cbx-send', title: 'Send', html: SEND, onclick: () => submit(w) })))));
      if (!sel || !contacts().includes(sel)) sel = contacts().find(id => unread.get(id)) || contacts()[0];
      select(sel);
      w.timer = setInterval(() => {
        if (!w.el.isConnected) return;
        if (w.ui.sig !== contacts().join(',') + '|' + Net.players.size) drawContacts(w);
        if (visible(w) && unread.get(sel)) select(sel);
        else if (sel && typing.has(sel) && typing.get(sel) < now()) { typing.delete(sel); drawMsgs(w); }
      }, 1000);
    },
    onClose(w) { clearInterval(w.timer); }
  };
  OS.pinned.push('chat');

  return {
    BOTS, threads, unread, contacts, send, gold, select, nameOf,
    /* deliver a message as if `from` (a bot id or player id) sent it: Chat.receive('bot:mum', 'Hi!') */
    receive: (from, text, gift) => push(from, gift ? { gift: 'gold' } : { text: String(text) }),
    claim: (cid, id) => claim(cid, thread(cid).find(m => m.id === id) || thread(cid).filter(m => m.gift && !m.me && !m.claimed).pop()),
    open(cid) { if (cid) sel = cid; return OS.launch('chat'); },
    unreadTotal: total
  };
})();
