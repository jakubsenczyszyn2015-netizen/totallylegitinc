'use strict';
/* =====================================================================
   CLOCK OUT EARLY — end the work day before the review timer runs out.
   Solo: confirm and The Boss starts the review right away.
   Multiplayer: a team vote, decided by the host; more than half of the room must vote yes.
   Ways in: the LegitOS start menu, the pause menu and the time clock in the hallway (E).
   API reference: docs/modules/clockout.md
   ===================================================================== */
const ClockOut = {
  VOTE_SECS: 30, COOLDOWN: 15,
  vote: null,        // the running vote (host-owned, shared): { id, by, name, yes: [ids], no: [ids], left, n, need }
  cool: 0,           // seconds before a new vote may start (host decides, clients see a copy)
  seq: 0, modal: false, closeConfirm: null, _early: null, _key: '', _sec: -1, _seenId: 0,

  /* week shifts only: endless mode has no review to skip to */
  available() { return G.phase === 'day' && G.mode === 'week' && P.review < 0; },
  need(n) { return Math.floor(Math.max(1, n) / 2) + 1; },
  voters() { return Net.active ? [...Net.players.keys()] : [Net.myId]; },
  myVote() { const V = this.vote; return !V ? null : V.yes.includes(Net.myId) ? 'yes' : V.no.includes(Net.myId) ? 'no' : null; },

  /* the one entry point for every button / the time clock */
  ask() {
    if (!this.available()) { toast(G.mode === 'endless' && G.phase === 'day' ? 'Overtime never ends. That is the point of overtime.' : 'You can only clock out during a shift.'); return; }
    if (Net.active && this.vote) { if (this.myVote() !== 'yes') this.cast(true); else toast('You already voted to clock out.'); return; }
    if (Net.active && this.cool > 0) { toast('The team just voted no. Try again in ' + Math.ceil(this.cool) + ' s.', 'bad'); return; }
    this.confirm();
  },
  /* solo: end the day now. multiplayer: ask the host to start a vote (you vote yes) */
  start() {
    if (!this.available()) return;
    if (!Net.active) { this.punchSound(); this.endDay(); return; }
    if (Net.isHost) this.hostReq('start', Net.myId); else Net.emit('clockout', { a: 'start' }, { host: true });
  },
  cast(yes) {
    if (!this.vote || !this.available()) return;
    if (this.myVote() === (yes ? 'yes' : 'no')) return;
    // show it straight away; the host's next snapshot confirms it
    const V = this.vote, me = Net.myId; this.mark(V, me, yes); this._pend = { id: V.id, yes, t: now() };
    SFX.click(); this.render(true);
    if (Net.isHost) this.hostReq(yes ? 'yes' : 'no', me); else Net.emit('clockout', { a: yes ? 'yes' : 'no' }, { host: true });
  },
  mark(V, id, yes) { V.yes = V.yes.filter(i => i !== id); V.no = V.no.filter(i => i !== id); (yes ? V.yes : V.no).push(id); },
  endDay() { this._early = Math.max(0, Math.round(G.timeLeft)); Game.endDay(); this._early = null; },

  /* ----- host side ----- */
  hostReq(a, from) {
    if (!Net.isAuth() || !this.available() || !Net.players.has(from)) return;
    const V = this.vote;
    if (a === 'start') {
      if (V) return this.hostReq('yes', from);
      if (this.cool > 0) return;
      const p = Net.players.get(from);
      this.vote = { id: ++this.seq, by: from, name: String((p && p.name) || 'Someone'), yes: [from], no: [], left: this.VOTE_SECS, n: 0, need: 0 };
      this.check(); if (this.vote) this.render(true);
    } else if (V && (a === 'yes' || a === 'no')) {
      this.mark(V, from, a === 'yes');
      this.check(); if (this.vote) this.render(true);
    }
  },
  check() {
    const V = this.vote; if (!V) return;
    const ids = this.voters(), n = ids.length, need = this.need(n);
    V.yes = V.yes.filter(i => ids.includes(i)); V.no = V.no.filter(i => ids.includes(i)); V.n = n; V.need = need;
    if (V.yes.length >= need) this.finish(true);
    else if (n - V.no.length < need || V.left <= 0) this.finish(false);
  },
  finish(ok) {
    const V = this.vote; this.vote = null;
    const r = { ok, yes: V.yes.length, no: V.no.length, n: V.n, need: V.need, name: V.name, timeout: !ok && V.left <= 0 };
    if (!ok) this.cool = this.COOLDOWN;
    Net.emit('clockout:end', r); this.result(r);
    if (ok) setTimeout(() => { if (Net.isAuth() && this.available()) this.endDay(); }, 1500);
  },
  tick(dt) {
    if (!Net.active) { if (this.vote) { this.vote = null; this.render(); } this.cool = 0; return; }
    if (this.cool > 0) this.cool -= dt;
    const V = this.vote;
    if (V && !this.available()) { this.vote = null; this.render(); return; }   // the day ended (timer, review, quit)
    if (!V) return;
    V.left = Math.max(0, V.left - dt);          // clients run the clock locally between snapshots
    if (Net.isHost) this.check();
    if (this.vote) this.render();
  },
  /* clients: the host's copy arrives with every snapshot */
  applyShared(s) {
    if (Net.isHost) return;
    this.cool = s && s.cool || 0;
    const v = s && s.v;
    if (!v || typeof v !== 'object' || !Array.isArray(v.yes) || !Array.isArray(v.no)) { if (this.vote) { this.vote = null; this.render(); } return; }
    this.vote = { id: v.id | 0, by: String(v.by || ''), name: String(v.name || 'Someone').slice(0, 18), yes: v.yes.map(String), no: v.no.map(String), left: +v.left || 0, n: v.n | 0, need: v.need | 0 };
    // a vote I just cast may not have reached the host yet: keep showing it for a moment
    const pd = this._pend; if (pd && pd.id === this.vote.id && now() - pd.t < 1.5 && this.myVote() !== (pd.yes ? 'yes' : 'no')) this.mark(this.vote, Net.myId, pd.yes);
    this.render();
  },

  /* ----- UI: the vote card (multiplayer) ----- */
  el(id) { let e = document.getElementById(id); if (!e) { e = h('div', { id, class: 'hidden' }); document.body.append(e); } return e; },
  render(force) {
    const V = this.vote, card = this.el('co-vote');
    if (!V) { if (!card.classList.contains('hidden')) card.classList.add('hidden'); this._key = ''; return; }
    if (V.id !== this._seenId) { this._seenId = V.id; if (V.by !== Net.myId) { SFX.popup(); toast(V.name + ' wants to clock out early. F1 yes, F2 no.'); } }
    card.classList.toggle('in-os', !!OS.open);
    const mine = this.myVote(), sec = Math.ceil(V.left);
    const key = V.id + '|' + V.yes.join(',') + '|' + V.no.join(',') + '|' + V.n + '|' + mine + '|' + OS.open + '|' + [...Net.players.values()].map(p => p.name).join(',');
    if (force || key !== this._key) {
      this._key = key; this._sec = -1;
      const pip = id => {
        const p = Net.players.get(id) || {}, st = V.yes.includes(id) ? 'yes' : V.no.includes(id) ? 'no' : 'wait';
        return h('span', { class: 'co-pip ' + st }, h('i', { style: { background: p.color || '#888' } }), h('b', {}, (id === Net.myId ? 'You' : p.name) || 'Agent'),
          h('em', { html: st === 'yes' ? CO_ICONS.yes : st === 'no' ? CO_ICONS.no : '…' }));
      };
      card.replaceChildren(
        h('div', { class: 'co-strip' }, h('span', {}, 'Time card'), h('span', {}, 'Team vote')),
        h('div', { class: 'co-head' }, h('i', { class: 'co-ic', html: CO_ICONS.clock }),
          h('div', {}, h('h3', {}, 'Clock out early?'), h('p', {}, (V.by === Net.myId ? 'You want' : V.name + ' wants') + ' to end the shift and face The Boss now.')),
          h('b', { class: 'co-timer' }, fmtTime(sec))),
        h('div', { class: 'co-pips' }, this.voters().map(pip)),
        h('div', { class: 'co-need' }, h('b', {}, V.yes.length + ' of ' + V.need), ' yes votes needed', V.no.length ? ' · ' + V.no.length + ' said no' : ''),
        h('div', { class: 'co-btns' },
          h('button', { class: 'co-yes' + (mine === 'yes' ? ' on' : ''), onclick: () => this.cast(true) }, h('kbd', {}, 'F1'), mine === 'yes' ? 'You said yes' : 'Yes, clock out'),
          h('button', { class: 'co-no' + (mine === 'no' ? ' on' : ''), onclick: () => this.cast(false) }, h('kbd', {}, 'F2'), mine === 'no' ? 'You said no' : 'No, keep working')),
        h('div', { class: 'co-bar' }, h('i')));
      card.classList.remove('hidden');
    }
    const bar = card.querySelector('.co-bar i'); if (bar) bar.style.transform = 'scaleX(' + clamp(V.left / this.VOTE_SECS, 0, 1).toFixed(3) + ')';
    if (sec !== this._sec) { this._sec = sec; const t = card.querySelector('.co-timer'); if (t) { t.textContent = fmtTime(sec); t.classList.toggle('hurry', sec <= 5); } }
  },
  /* the big stamp when a vote ends */
  result(r) {
    const s = this.el('co-stamp');
    s.className = r.ok ? 'ok' : 'bad';
    s.replaceChildren(h('div', { class: 'co-st' }, r.ok ? 'Clocked out!' : 'Vote failed'),
      h('p', {}, r.ok ? r.yes + ' of ' + r.n + ' said yes. To the review room.' : (r.timeout ? 'Time ran out. ' : '') + r.yes + ' of ' + r.n + ' said yes (' + r.need + ' needed). Back to work.'));
    void s.offsetWidth; s.classList.add('on');
    clearTimeout(this._stT); this._stT = setTimeout(() => s.classList.remove('on'), 2600);
    if (r.ok) this.punchSound(); else SFX.bad();
    this.render();
  },
  punchSound() { AudioSys.noise(0.07, 0.22, 0, 700); AudioSys.tone(180, 0.09, 'square', 0.12, 0.02, 90); AudioSys.tone(1568, 0.25, 'triangle', 0.12, 0.12); },

  /* ----- UI: the confirmation (solo, or before starting a vote) ----- */
  confirm() {
    if (this.modal) return;
    const ov = this.el('co-confirm'), [time] = OS.clock(), met = G.team >= G.quota, short = Math.max(0, G.quota - G.team);
    const n = this.voters().length, mp = Net.active;
    const close = this.closeConfirm = () => { this.modal = false; this.closeConfirm = null; ov.classList.add('hidden'); ov.replaceChildren(); window.removeEventListener('keydown', key, true); };
    const go = () => { close(); this.start(); };
    const key = e => {
      if (e.code === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); close(); }
      else if (e.code === 'Enter' || e.code === 'NumpadEnter') { e.preventDefault(); e.stopImmediatePropagation(); go(); }
    };
    ov.replaceChildren(h('div', { class: 'co-card' },
      h('div', { class: 'co-strip' }, h('span', {}, 'Time card'), h('span', {}, 'Totally Legit Inc.')),
      h('div', { class: 'co-body' },
        h('div', { class: 'co-face', html: this.faceSVG() }),
        h('div', { class: 'co-txt' },
          h('h2', {}, 'Clock out early?'),
          h('p', {}, 'It is ', h('b', {}, time), '. The shift runs until midnight, then The Boss reviews the team.'),
          h('div', { class: 'co-quota ' + (met ? 'met' : 'short') }, met
            ? ['Team ', h('b', {}, money(G.team)), ' of ', money(G.quota), ': quota met. The Boss will allow it.']
            : [h('b', {}, money(short) + ' short'), ' of the ', money(G.quota), ' quota. Clock out now and everyone is fired.']),
          mp ? h('p', { class: 'co-note' }, 'This starts a team vote: more than half the room (' + this.need(n) + ' of ' + n + ') must say yes within ' + this.VOTE_SECS + ' s.') : null)),
      h('div', { class: 'co-acts' },
        h('button', { class: 'btn ' + (met ? 'primary' : 'danger'), onclick: go }, h('kbd', {}, 'Enter'), mp ? 'Start the vote' : 'Clock out'),
        h('button', { class: 'btn', onclick: close }, h('kbd', {}, 'Esc'), 'Keep working'))));
    this.modal = true; ov.classList.remove('hidden'); releaseLock();
    window.addEventListener('keydown', key, true);
  },
  /* the in-game time (week: 4 PM to midnight over the day) as [hours, minutes] */
  hm() {
    if (G.mode !== 'week') { const d = new Date(); return [d.getHours(), d.getMinutes()]; }
    const f = G.phase === 'day' ? clamp(1 - G.timeLeft / Math.max(1, G.dayLen), 0, 1) : G.phase === 'lobby' ? 0 : 1;
    const m = Math.floor(16 * 60 + f * 480); return [Math.floor(m / 60) % 24, m % 60];
  },
  faceSVG() {
    const [hr, mn] = this.hm(), ha = ((hr % 12) + mn / 60) * 30, ma = mn * 6;
    let ticks = ''; for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6, r0 = i % 3 ? 33 : 30; ticks += '<line x1="' + (50 + Math.sin(a) * r0).toFixed(1) + '" y1="' + (50 - Math.cos(a) * r0).toFixed(1) + '" x2="' + (50 + Math.sin(a) * 37).toFixed(1) + '" y2="' + (50 - Math.cos(a) * 37).toFixed(1) + '" stroke-width="' + (i % 3 ? 2 : 3.5) + '"/>'; }
    return '<svg viewBox="0 0 100 124" aria-hidden="true"><rect x="4" y="4" width="92" height="116" rx="12" fill="#d9cdb2" stroke="#3a2f14" stroke-width="4"/>'
      + '<circle cx="50" cy="50" r="41" fill="#fbf7ea" stroke="#3a2f14" stroke-width="4"/><g stroke="#3a2f14" stroke-linecap="round">' + ticks + '</g>'
      + '<line x1="50" y1="50" x2="' + (50 + Math.sin(ha * Math.PI / 180) * 20).toFixed(1) + '" y2="' + (50 - Math.cos(ha * Math.PI / 180) * 20).toFixed(1) + '" stroke="#3a2f14" stroke-width="5.5" stroke-linecap="round"/>'
      + '<line x1="50" y1="50" x2="' + (50 + Math.sin(ma * Math.PI / 180) * 30).toFixed(1) + '" y2="' + (50 - Math.cos(ma * Math.PI / 180) * 30).toFixed(1) + '" stroke="#3a2f14" stroke-width="3.5" stroke-linecap="round"/>'
      + '<circle cx="50" cy="50" r="4.5" fill="#d6342c"/><rect x="22" y="98" width="56" height="9" rx="3" fill="#3a2f14"/><rect x="40" y="88" width="20" height="13" rx="2" fill="#f0dfa8" stroke="#3a2f14" stroke-width="2"/></svg>';
  },

  /* ----- the time clock on the hallway wall (press E) ----- */
  clockLabel() {
    if (!this.available()) return G.phase === 'day' && G.mode === 'endless' ? 'Punch the time clock' : null;
    if (Net.active && this.vote) return this.myVote() === 'yes' ? null : 'Vote yes: clock out early';
    return Net.active ? 'Clock out early (team vote)' : 'Clock out early';
  },
  buildClock() {
    const x = 15.55, z = -1.705, y = 1.42, g = new THREE.Group(); g.position.set(x, y, z);
    const body = new THREE.Mesh(boxGeo(0.34, 0.48, 0.14), mat('#cdbf9f')); body.position.z = 0.07; g.add(body);
    const cv = document.createElement('canvas'); cv.width = 128; cv.height = 180; this.cv = cv;
    this.tex = new THREE.CanvasTexture(cv);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.42), new THREE.MeshLambertMaterial({ map: this.tex })); face.position.set(0, 0, 0.142); g.add(face);
    // the card rack beside it, with a few time cards
    const rack = new THREE.Mesh(boxGeo(0.24, 0.46, 0.05), mat('#6e6a62')); rack.position.set(-0.34, -0.02, 0.025); g.add(rack);
    const cards = new THREE.InstancedMesh(boxGeo(0.07, 0.17, 0.006), mat('#f0dfa8'), 6), m4 = new THREE.Matrix4();
    for (let i = 0; i < 6; i++) { m4.makeRotationZ((i % 3 - 1) * 0.04); m4.setPosition(-0.42 + (i % 3) * 0.08, 0.06 - Math.floor(i / 3) * 0.2 + (i % 2) * 0.02, 0.055); cards.setMatrixAt(i, m4); }
    g.add(cards);
    for (const o of g.children) { o.castShadow = false; o.receiveShadow = false; }
    W.scene.add(g); this.clock3d = g; this.drawClock();
    W.interact.push({ pos: new THREE.Vector3(x, 1.35, z + 0.18), label: () => this.clockLabel(), act: () => {
      if (this.available()) { this.punchSound(); this.ask(); } else { this.punchSound(); toast(pick(['Ka-chunk. Overtime does not end.', 'The clock stamps your card: STILL HERE.', 'Nice try. Endless means endless.'])); }
    } });
  },
  drawClock() {
    const g = this.cv && this.cv.getContext('2d'); if (!g) return;
    const [hr, mn] = this.hm(), key = hr + ':' + mn; if (key === this._ck) return; this._ck = key;
    g.fillStyle = '#e4d8bb'; g.fillRect(0, 0, 128, 180);
    g.fillStyle = '#7a1d14'; g.fillRect(0, 0, 128, 26); g.fillStyle = '#fbf2d8'; g.font = 'bold 15px Karla, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('TIME CLOCK', 64, 14);
    g.fillStyle = '#fbf7ea'; g.strokeStyle = '#3a2f14'; g.lineWidth = 5; g.beginPath(); g.arc(64, 82, 46, 0, Math.PI * 2); g.fill(); g.stroke();
    g.lineCap = 'round';
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6, r0 = i % 3 ? 37 : 33; g.lineWidth = i % 3 ? 2 : 4; g.beginPath(); g.moveTo(64 + Math.sin(a) * r0, 82 - Math.cos(a) * r0); g.lineTo(64 + Math.sin(a) * 41, 82 - Math.cos(a) * 41); g.stroke(); }
    const hand = (a, len, w) => { g.lineWidth = w; g.beginPath(); g.moveTo(64, 82); g.lineTo(64 + Math.sin(a) * len, 82 - Math.cos(a) * len); g.stroke(); };
    hand(((hr % 12) + mn / 60) * Math.PI / 6, 23, 6); hand(mn * Math.PI / 30, 34, 4);
    g.fillStyle = '#d6342c'; g.beginPath(); g.arc(64, 82, 5, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#2a2420'; g.fillRect(24, 140, 80, 10); g.fillStyle = '#f0dfa8'; g.fillRect(52, 128, 24, 16); g.strokeStyle = '#3a2f14'; g.lineWidth = 2; g.strokeRect(52, 128, 24, 16);
    g.fillStyle = '#3a2f14'; g.font = 'bold 11px Karla, sans-serif'; g.fillText('IN        OUT', 64, 165);
    this.tex.needsUpdate = true;
  }
};
const CO_ICONS = {
  clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.5" fill="#fbf7ea" stroke="#3a2f14" stroke-width="2.4"/><path d="M12 6.8V12l3.6 2.2" fill="none" stroke="#3a2f14" stroke-width="2.4" stroke-linecap="round"/></svg>',
  yes: '<svg viewBox="0 0 24 24"><path d="M4.5 12.5l4.8 4.8L19.5 7" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  no: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/></svg>'
};

/* ----- wiring ----- */
Net.share('clockout', () => ({ v: ClockOut.vote, cool: Math.ceil(ClockOut.cool) }), s => ClockOut.applyShared(s));
Net.on('clockout', (p, from) => { if (p && ['start', 'yes', 'no'].includes(p.a)) ClockOut.hostReq(p.a, from); });
Net.on('clockout:end', r => { ClockOut.vote = null; if (r && typeof r === 'object') ClockOut.result({ ok: !!r.ok, yes: r.yes | 0, no: r.no | 0, n: r.n | 0, need: r.need | 0, name: String(r.name || ''), timeout: !!r.timeout }); });
Loop.add(dt => { ClockOut.tick(dt); if (ClockOut.cv && G.phase !== 'menu' && (ClockOut._dt = (ClockOut._dt || 0) + dt) > 1) { ClockOut._dt = 0; ClockOut.drawClock(); } });
/* F1 / F2 vote while a vote is open (works at the desk and on foot) */
window.addEventListener('keydown', e => { if (ClockOut.vote && (e.code === 'F1' || e.code === 'F2') && !e.repeat) { e.preventDefault(); ClockOut.cast(e.code === 'F1'); } });
/* the review says when you left early (host / solo, before the result is broadcast) */
if (typeof reviewLines === 'function') {
  const _rl = reviewLines;
  reviewLines = function (res) {
    const L = _rl(res);
    if (ClockOut._early != null) {
      res.early = ClockOut._early; const mins = Math.max(1, Math.round(res.early / 60));
      L.splice(1, 0, res.pass ? pick(['You clocked out ' + mins + ' minutes early. The numbers are there, so I will allow it.', 'Leaving early and still on quota. I hate that I respect it.'])
        : pick(['You clocked out ' + mins + ' minutes early. With the quota missed. Bold.', 'You left early AND missed quota. That takes real commitment to failure.']));
    }
    return L;
  };
}
/* no walking or looking around while the confirmation is up */
{ const _cc = Game.canControl; Game.canControl = function () { return !ClockOut.modal && _cc.call(this); }; }
Bus.on('world:built', () => { try { ClockOut.buildClock(); } catch (e) { console.error('time clock', e); } });
Bus.on('boot', () => {
  // the LegitOS start menu gets a "Clock out early" item above "Quit to main menu"
  const _rp = OS.renderPower;
  OS.renderPower = function () {
    _rp.apply(this, arguments);
    if (!ClockOut.available()) return;
    const list = $('#powermenu .pm-list'); if (!list) return;
    const V = ClockOut.vote, mp = Net.active;
    const it = h('button', { class: 'pm-item co-pm', onclick: () => { OS.power(false); SFX.click(); ClockOut.ask(); } },
      h('i', { class: 'ti', style: { background: '#e8590c' }, html: OS.glyph('clock') }),
      h('span', {}, h('b', {}, V ? 'Vote: clock out early' : 'Clock out early'), h('small', {}, mp ? (V ? 'Your team is voting right now' : 'Start a team vote to end the shift') : 'Skip to the performance review')));
    list.insertBefore(it, list.querySelector('.pm-item.quit'));
  };
  // the pause menu gets a button under "Resume"
  const body = $('#pause .body') || $('#pause .modal') || $('#pause');
  const btn = h('button', { class: 'btn co-pause hidden', onclick: () => ClockOut.ask() }, 'Clock out early');
  const first = body.querySelector('.btn'); if (first && first.nextSibling) body.insertBefore(btn, first.nextSibling); else body.append(btn);
  const _pause = Game.pause;
  Game.pause = function (on) {
    if (ClockOut.modal) return;   // Esc closes the confirmation instead
    _pause.apply(this, arguments);
    btn.classList.toggle('hidden', !(on && ClockOut.available()));
    btn.textContent = !Net.active ? 'Clock out early' : ClockOut.vote ? 'Vote yes: clock out early' : 'Vote to clock out early';
  };
});
Bus.on('quit', () => { ClockOut.vote = null; ClockOut.cool = 0; ClockOut.render(); if (ClockOut.closeConfirm) ClockOut.closeConfirm(); });
Bus.on('review', () => { if (ClockOut.closeConfirm) ClockOut.closeConfirm(); });
Bus.on('day:start', () => ClockOut.drawClock());
