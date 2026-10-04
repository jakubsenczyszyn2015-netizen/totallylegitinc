'use strict';
/* =====================================================================
   BUGBUSTER — antivirus (OS.apps.antivirus, bought in the shop for $200).
   Scan with a progress ring, silly threats, "Quarantine all" closes every
   pop-up and turns on a 3-minute shield that blocks new OS.popup()s.
   API: docs/modules/tools.md
   ===================================================================== */
const BugBuster = (() => {
  const ID = 'antivirus', SHIELD = 180, SCAN = 6.5, RING = 2 * Math.PI * 54;
  const owned = () => !!(G.prog.apps && G.prog.apps[ID]);
  const prog = () => (G.prog.antivirus = G.prog.antivirus || { squashed: 0, scans: 0 });
  let until = 0, blocked = 0, burst = 0, burstT = null, last = '';
  const shielded = () => now() < until;
  const left = () => Math.max(0, until - now());

  /* the shield: wrap OS.popup (OS.virus calls it too) */
  const _popup = OS.popup;
  OS.popup = function (o) {
    if (shielded() && !(o && o.force)) {
      blocked++; burst++;
      if (!burstT) burstT = setTimeout(() => { toast(h('span', { class: 'bb-toast', html: OS.glyph('shield') + '<span>BugBuster blocked ' + (burst > 1 ? burst + ' pop-ups' : 'a pop-up') + '</span>' }), 'good'); burst = 0; burstT = null; }, 700);
      Bus.emit('antivirus:block', o || null);
      return h('div');
    }
    return _popup.call(this, o);
  };

  const LOGO = '<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="bbsh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9cf05a"/><stop offset="1" stop-color="#22a35a"/></linearGradient></defs>'
    + '<path d="M24 3 41 9v13c0 11-7.4 19.2-17 23C14.4 41.2 7 33 7 22V9z" fill="url(#bbsh)" stroke="#0b1a12" stroke-width="2.4" stroke-linejoin="round"/>'
    + '<path d="M24 7.5 37 12v10c0 8.6-5.6 15-13 18.3z" fill="#fff" opacity=".18"/>'
    + '<g stroke="#0b1a12" stroke-width="1.8" stroke-linecap="round"><path d="M20 16.5 17 12.5M28 16.5l3-4M16.5 23.5h-4M31.5 23.5h4M17 29l-3.4 2.6M31 29l3.4 2.6"/></g>'
    + '<ellipse cx="24" cy="25.5" rx="7.4" ry="8.6" fill="#e5383b" stroke="#0b1a12" stroke-width="2"/><path d="M24 17v17" stroke="#0b1a12" stroke-width="1.6"/><circle cx="24" cy="17.6" r="4" fill="#0b1a12"/>'
    + '<circle cx="22.4" cy="17" r="1.1" fill="#fff"/><circle cx="25.6" cy="17" r="1.1" fill="#fff"/><circle cx="20.6" cy="25" r="1.5" fill="#0b1a12"/><circle cx="27.4" cy="28" r="1.5" fill="#0b1a12"/><circle cx="21.4" cy="30.4" r="1.1" fill="#0b1a12"/>'
    + '<circle cx="24" cy="25" r="13.5" fill="none" stroke="#fff" stroke-width="3.2"/><path d="M14.5 15.5 33.5 34.5" stroke="#fff" stroke-width="3.2" stroke-linecap="round"/></svg>';
  const THREATS = [
    ['Trojan.Kazoo', 'Trojan', 'C:\\LegitOS\\Music\\definitely_not_kazoo.exe', 3, 'Plays a kazoo at 3 AM'],
    ['Worm.Stapler', 'Worm', 'C:\\Desk\\Drawer\\stapler.sys', 2, 'Staples your files together'],
    ['Adware.HotStaplers', 'Adware', 'C:\\Users\\You\\Popups\\lonely.dll', 1, 'Hot staplers in your area'],
    ['PUP.RamDoubler', 'PUP', 'C:\\Program Files\\MoreRAM\\more.exe', 1, 'Downloads more RAM (it does not)'],
    ['Spyware.BossCam', 'Spyware', 'C:\\LegitOS\\System\\watching.ocx', 3, 'Reports your typing speed to The Boss'],
    ['Rootkit.CoffeeBreak', 'Rootkit', 'C:\\Boot\\kettle.bin', 2, 'Hides 14 coffee breaks from your timesheet'],
    ['Virus.MondayBlues', 'Virus', 'C:\\Calendar\\monday.dat', 2, 'Spreads Monday to the rest of the week'],
    ['Keylogger.Mum', 'Spyware', 'C:\\Users\\You\\AppData\\mum.js', 2, 'Forwards every message to Mum'],
    ['Riskware.Toolbar14', 'PUP', 'C:\\Browser\\Toolbars\\14\\toolbar.exe', 1, 'Installs toolbar number 15'],
    ['Hoax.EverythingIsFine', 'Hoax', 'C:\\LegitOS\\fine.txt', 1, 'Insists that everything is fine'],
    ['Exploit.ReplyAll', 'Exploit', 'C:\\Mail\\reply_all.vbs', 3, 'Replies all. To everyone. Forever.'],
    ['Backdoor.Fridge', 'Backdoor', 'C:\\Break Room\\fridge\\yoghurt.exe', 2, 'Someone else\'s yoghurt with network access']
  ];
  const PHASES = ['Checking for updates', 'Scanning memory', 'Scanning startup items', 'Scanning registry', 'Scanning files', 'Scanning vibes'];
  const DIRS = ['C:\\LegitOS\\System\\', 'C:\\Users\\You\\Desktop\\', 'C:\\Program Files\\Bonk\\', 'C:\\Quota\\', 'C:\\Users\\You\\Downloads\\', 'C:\\Break Room\\'];
  const FILES = ['quota.dll', 'excuses.txt', 'sincerity.exe', 'headset.sys', 'call_script.doc', 'cat.gif', 'lunch.bak', 'boss_face.png', 'ethics.tmp', 'stapler.ini', 'payroll.xls', 'nap.mp3'];

  function threatsNow() {
    const n = randi(3, 5), list = shuffle(THREATS.slice()).slice(0, n).map(t => ({ name: t[0], type: t[1], path: t[2], sev: t[3], desc: t[4] }));
    if (typeof Chat !== 'undefined' && [...Chat.threads.values()].some(th => th.some(m => m.gift && m.claimed && !m.me))) list.unshift({ name: 'Trojan.ChatterboxGold', type: 'Trojan', path: 'C:\\Users\\You\\Chatterbox\\free_gift.exe', sev: 3, desc: 'It was never free' });
    if (OS.popups > 0) list.unshift({ name: 'Popup.Storm', type: 'Adware', path: 'On your screen right now (' + OS.popups + ' windows)', sev: 3, desc: 'Close them all. Please.', pops: OS.popups });
    return list;
  }
  const fmtLeft = () => fmtTime(left());

  /* ----- views ----- */
  function view(w, mode) {
    w.mode = mode; clearInterval(w.tick); w.tick = null;
    const b = w.ui.main; b.className = 'bb-main ' + mode;
    if (mode === 'home') home(w, b); else if (mode === 'scan') scan(w, b); else if (mode === 'result') result(w, b); else clean(w, b);
  }
  function stat(label, val, g) { return h('div', { class: 'bb-stat' }, h('i', { html: OS.glyph(g) }), h('b', {}, val), h('small', {}, label)); }
  function home(w, b) {
    const draw = () => {
      const on = shielded(), risk = OS.popups > 0, p = prog();
      b.replaceChildren(
        h('div', { class: 'bb-hero ' + (on ? 'ok' : risk ? 'bad' : 'meh') },
          h('div', { class: 'bb-ring' }, h('i', { html: OS.glyph(on ? 'shield' : risk ? 'warning' : 'bug') })),
          h('div', { class: 'bb-hx' },
            h('b', {}, on ? 'You are protected' : risk ? 'At risk!' : 'Probably fine'),
            h('span', {}, on ? 'Real-time Shield is blocking pop-ups for another ' + fmtLeft() + '.' : risk ? OS.popups + ' suspicious pop-up' + (OS.popups > 1 ? 's are' : ' is') + ' on your screen right now.' : 'No scan yet today. Bugs love that.'))),
        h('button', { class: 'bb-scan', onclick: () => view(w, 'scan') }, h('i', { html: OS.glyph('search') }), 'Scan now'),
        h('div', { class: 'bb-stats' }, stat('Bugs squashed', p.squashed, 'bug'), stat('Pop-ups blocked', blocked, 'shield'), stat('Last scan', last || 'Never', 'clock')),
        h('div', { class: 'bb-row' + (on ? ' on' : '') }, h('i', { html: OS.glyph(on ? 'check' : 'x') }),
          h('div', {}, h('b', {}, 'Real-time Shield'), h('small', {}, on ? 'ON · ' + fmtLeft() + ' left' : 'OFF · quarantine threats to switch it on for 3:00')),
          h('em', { class: 'bb-pill' }, on ? 'ON' : 'OFF')));
    };
    draw(); w.tick = setInterval(() => { if (w.el.isConnected) draw(); }, 1000);
  }
  function scan(w, b) {
    const found = threatsNow(), at = found.map((t, i) => (i + 0.6 + Math.random() * 0.6) / (found.length + 1)), shown = [];
    let t0 = now(), ring, pct, ph, file, cnt, list;
    b.replaceChildren(
      h('div', { class: 'bb-big', html: '<svg viewBox="0 0 128 128"><defs><linearGradient id="bbring" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b6f55b"/><stop offset="1" stop-color="#1fbf73"/></linearGradient></defs>'
        + '<circle cx="64" cy="64" r="54" fill="none" stroke="rgba(255,255,255,.09)" stroke-width="12"/><circle class="arc" cx="64" cy="64" r="54" fill="none" stroke="url(#bbring)" stroke-width="12" stroke-linecap="round" stroke-dasharray="' + RING.toFixed(1) + '" stroke-dashoffset="' + RING.toFixed(1) + '" transform="rotate(-90 64 64)"/></svg>' },
        pct = h('b', {}, '0%'), h('small', {}, 'scanned')),
      ph = h('div', { class: 'bb-ph' }, PHASES[0]), file = h('div', { class: 'bb-file' }, '…'),
      cnt = h('div', { class: 'bb-cnt' }, 'Threats found: 0'),
      list = h('div', { class: 'bb-live' }),
      h('button', { class: 'bb-cancel', onclick: () => view(w, 'home') }, 'Cancel'));
    ring = $('.arc', b);
    AudioSys.tone(660, 0.08, 'triangle', 0.08);
    w.tick = setInterval(() => {
      if (!w.el.isConnected) return;
      const f = clamp((now() - t0) / SCAN, 0, 1), e = f < 0.5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2;
      ring.setAttribute('stroke-dashoffset', (RING * (1 - e)).toFixed(1)); pct.textContent = Math.floor(e * 100) + '%';
      ph.textContent = PHASES[Math.min(PHASES.length - 1, Math.floor(f * PHASES.length))] + '…';
      file.textContent = pick(DIRS) + pick(FILES);
      found.forEach((t, i) => { if (!shown[i] && f >= at[i]) { shown[i] = true; list.prepend(h('div', { class: 'bb-hit' }, h('i', { html: OS.glyph('bug') }), h('b', {}, t.name), h('small', {}, t.type))); cnt.textContent = 'Threats found: ' + shown.filter(Boolean).length; cnt.classList.add('red'); AudioSys.tone(300, 0.12, 'square', 0.06); } });
      if (f >= 1) { const p = prog(); p.scans++; last = OS.clock()[0]; w.found = found; Game.saveProgress(); view(w, 'result'); }
    }, 90);
  }
  function result(w, b) {
    const found = w.found || [];
    const sevs = s => h('span', { class: 'bb-sev s' + s }, h('i'), h('i'), h('i'));
    b.replaceChildren(
      h('div', { class: 'bb-banner' }, h('i', { html: OS.glyph('skull') }), h('div', {}, h('b', {}, found.length + ' threats found'), h('small', {}, pick(['Your computer is basically a petri dish.', 'Impressive. Most people need weeks to collect this many.', 'Have you been clicking free gifts?'])))),
      h('div', { class: 'bb-list' }, found.map(t => h('label', { class: 'bb-t' }, h('input', { type: 'checkbox', checked: true }),
        h('div', {}, h('b', {}, t.name, h('em', {}, t.type)), h('small', {}, t.desc), h('code', {}, t.path)), sevs(t.sev)))),
      h('div', { class: 'bb-btns' },
        h('button', { class: 'bb-ign', onclick: () => { toast('Ignoring threats. Bold strategy.'); view(w, 'home'); } }, 'Ignore'),
        h('button', { class: 'bb-q', onclick: () => quarantine(w) }, h('i', { html: OS.glyph('shield') }), 'Quarantine all')));
  }
  function quarantine(w) {
    const found = w.found || [], n = found.length, pops = OS.clearPopups();
    const p = prog(); p.squashed += n; Game.saveProgress();
    until = now() + SHIELD; w.cleared = { n, pops }; w.found = null;
    SFX.pass(); Bus.emit('antivirus:clean', { threats: n, popups: pops });
    view(w, 'clean');
  }
  function clean(w, b) {
    const c = w.cleared || { n: 0, pops: 0 }, splats = [];
    for (let i = 0; i < 7; i++) splats.push(h('i', { class: 'bb-splat', style: { left: (8 + i * 13 + rand(-3, 3)) + '%', top: rand(8, 70) + '%', animationDelay: (0.1 + i * 0.07).toFixed(2) + 's', transform: 'rotate(' + randi(-40, 40) + 'deg)' }, html: OS.glyph('bug') }));
    const tm = h('b', {}, fmtLeft());
    b.replaceChildren(h('div', { class: 'bb-done' }, ...splats,
      h('div', { class: 'bb-check', html: '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="29" fill="#1fbf73"/><path d="M18 33l9 9 19-20" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></svg>' }),
      h('h2', {}, 'All clear!'),
      h('p', {}, c.n + ' threats quarantined' + (c.pops ? ', ' + c.pops + ' pop-up' + (c.pops > 1 ? 's' : '') + ' closed' : '') + '.'),
      h('div', { class: 'bb-shield' }, h('i', { html: OS.glyph('shield') }), h('span', {}, 'Real-time Shield active'), tm),
      h('button', { class: 'bb-scan small', onclick: () => view(w, 'home') }, 'Done')));
    w.tick = setInterval(() => { if (w.el.isConnected) tm.textContent = fmtLeft(); }, 1000);
  }

  OS.apps[ID] = {
    desktop: true, order: 74, available: owned, title: 'BugBuster', icon: 'bug', color: '#1f9d55', w: 470, h: 540, x: 0.5, y: 0.04, cls: 'bbwin',
    render(b, w) {
      w.ui = {};
      b.append(
        h('div', { class: 'bb-top' }, h('i', { class: 'bb-logo', html: LOGO }), h('div', {}, h('b', {}, 'Bug', h('span', {}, 'Buster')), h('small', {}, 'Antivirus · Free Edition (forever)')),
          h('button', { class: 'bb-prem', onclick: () => toast('Premium is sold out. Forever. Sorry.') }, 'Go Premium')),
        w.ui.main = h('div', { class: 'bb-main' }),
        h('div', { class: 'bb-foot' }, h('span', {}, 'Definitions: v' + (G.day || 1) + '.0.420'), h('span', {}, 'Not affiliated with any real bugs.')));
      view(w, 'home');
    },
    onClose(w) { clearInterval(w.tick); }
  };

  /* shop item art: the logo drawn with canvas paths */
  function art(g, w, hh) {
    const gr = g.createLinearGradient(0, 0, 0, hh); gr.addColorStop(0, '#163a2a'); gr.addColorStop(1, '#0b1a12'); g.fillStyle = gr; g.fillRect(0, 0, w, hh);
    g.save(); g.translate(w / 2, hh / 2); const s = Math.min(w, hh) / 60; g.scale(s, s); g.translate(-24, -25);
    g.lineJoin = 'round'; g.lineCap = 'round';
    const sh = new Path2D('M24 3 41 9v13c0 11-7.4 19.2-17 23C14.4 41.2 7 33 7 22V9z'), sg = g.createLinearGradient(0, 3, 0, 45); sg.addColorStop(0, '#9cf05a'); sg.addColorStop(1, '#22a35a');
    g.fillStyle = sg; g.fill(sh); g.strokeStyle = '#06110b'; g.lineWidth = 2.4; g.stroke(sh);
    g.strokeStyle = '#0b1a12'; g.lineWidth = 1.8; g.beginPath(); [[20, 16.5, 17, 12.5], [28, 16.5, 31, 12.5], [16.5, 23.5, 12.5, 23.5], [31.5, 23.5, 35.5, 23.5], [17, 29, 13.6, 31.6], [31, 29, 34.4, 31.6]].forEach(l => { g.moveTo(l[0], l[1]); g.lineTo(l[2], l[3]); }); g.stroke();
    g.fillStyle = '#e5383b'; g.beginPath(); g.ellipse(24, 25.5, 7.4, 8.6, 0, 0, 7); g.fill(); g.lineWidth = 2; g.stroke();
    g.fillStyle = '#0b1a12'; g.beginPath(); g.arc(24, 17.6, 4, 0, 7); g.fill(); [[20.6, 25, 1.5], [27.4, 28, 1.5], [21.4, 30.4, 1.1]].forEach(c => { g.beginPath(); g.arc(c[0], c[1], c[2], 0, 7); g.fill(); });
    g.strokeStyle = '#fff'; g.lineWidth = 3.2; g.beginPath(); g.arc(24, 25, 13.5, 0, 7); g.stroke(); g.beginPath(); g.moveTo(14.5, 15.5); g.lineTo(33.5, 34.5); g.stroke();
    g.restore();
  }
  Shop.add({
    id: 'app_' + ID, tab: 'games', section: 'Software', name: 'BugBuster', price: 200, icon: 'bug', color: '#1f9d55', sort: 40, art,
    desc: 'Antivirus that squashes pop-up storms and shields you from new ones for 3 minutes. Detects 100% of the bugs it made up.',
    owned, buy() { (G.prog.apps = G.prog.apps || {})[ID] = true; Game.saveProgress(); if (OS.open) OS.buildIcons(); }
  });
  Bus.on('quit', () => { until = 0; blocked = 0; last = ''; });

  return { shielded, left, shield(sec) { until = now() + (sec == null ? SHIELD : sec); }, off() { until = 0; }, get blocked() { return blocked; }, THREATS, art, logo: LOGO };
})();
