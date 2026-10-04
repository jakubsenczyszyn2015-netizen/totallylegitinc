'use strict';
/* =====================================================================
   GAME — state, day cycle, saves
   ===================================================================== */
const G = { phase: 'menu', mode: 'week', slot: 0, day: 1, quota: 0, team: 0, personal: 0, bank: 0, timeLeft: 0, dayLen: 300, paused: false,
  stats: { calls: 0, scams: 0, baited: 0, hung: 0 }, clips: 0, clipBots: 0, result: null, startedAt: 0, wallet: 0, up: {},
  /* prog: free-form per-save progress any module can use (owned apps, cookie counts, wallpaper…). Saved with the slot. */
  prog: {} };

function reviewLines(res) {
  const L = [], pct = res.team / Math.max(1, res.quota);
  L.push(DAYS[(res.day - 1) % 5] + '. Quota was ' + money(res.quota) + '. You brought in ' + money(res.team) + '.');
  L.push(pick(pct >= 1.5 ? BOSS.great : pct >= 1 ? BOSS.ok : pct >= 0.7 ? BOSS.close : BOSS.bad));
  if (res.players.length > 1) {
    const top = res.players[0], zero = res.players.filter(p => p.personal <= 0);
    if (top.personal > 0) L.push(top.name + ' carried this floor with ' + money(top.personal) + '.');
    if (zero.length) L.push(zero[0].name + ', I have seen houseplants generate more revenue.');
  }
  if (res.pass && res.week) L.push(BOSS.week[0]);
  L.push(pick(res.pass ? BOSS.pass : BOSS.fail));
  return L;
}

const Game = {
  quotaFor(day, n) {
    const base = 400 + 300 * (day - 1) + 25 * (day - 1) * (day - 1);
    return Math.max(100, Math.round(base * (1 + 0.7 * (Math.max(1, n) - 1)) * (G.dayLen / 300) / 50) * 50);
  },
  unlockCount() { return G.mode === 'week' ? SCHEMES.filter(s => s.unlock <= G.day).length : clamp(6 + Math.floor(G.team / 600), 6, SCHEMES.length); },
  unlocked() { return SCHEMES.slice(0, this.unlockCount()); },
  canControl() { return (G.phase === 'day' || G.phase === 'lobby') && !P.seated && !G.paused && !P.cam && P.review < 0 && !UI.settingsOpen; },
  deskTaken(i) { for (const [id, p] of Net.players) if (id !== Net.myId && p.seat === i) return true; return false; },
  roster() {
    if (!Net.active) return [{ name: settings.name, personal: G.personal, me: true }];
    return [...Net.players].map(([id, p]) => ({ name: p.name, personal: id === Net.myId ? G.personal : (p.personal || 0), me: id === Net.myId })).sort((a, b) => b.personal - a.personal);
  },
  netState() { return { phase: G.phase, mode: G.mode, day: G.day, quota: G.quota, team: G.team, timeLeft: Math.round(G.timeLeft * 10) / 10, dayLen: G.dayLen, bank: G.bank }; },
  authority() { return !Net.active || Net.isHost; },
  /* upgrades: each player has their own wallet (half of every scam) and upgrade levels */
  lvl(id) { return G.up[id] || 0; },
  addWallet(n) { G.wallet = Math.max(0, G.wallet + n); this.saveProgress(); OS.stats(); },
  buy(id) {
    const u = UPGRADES.find(x => x.id === id), lv = this.lvl(id); if (!u || lv >= u.max) return;
    const cost = u.cost * (lv + 1); if (G.wallet < cost) return;
    G.wallet -= cost; G.up[id] = lv + 1; SFX.cash(); toast(u.name + ' is now level ' + (lv + 1) + '.', 'good');
    this.saveProgress(); OS.refresh(); OS.stats();
  },
  saveProgress() {
    if (!this.authority() || G.phase === 'menu') return;
    if (G.mode === 'week') { const sv = Saves.week[G.slot]; if (sv) { sv.wallet = G.wallet; sv.up = Object.assign({}, G.up); sv.inv = Inv.dump(); sv.prog = JSON.parse(JSON.stringify(G.prog)); writeSaves(); } }
    else this.saveEndless();
  },

  /* ----- starting ----- */
  begin(mode, slot) {
    resetPlayer(); OS.reset(); OS.hide(); Call.reset();
    G.mode = mode; G.slot = slot | 0; G.paused = false; G.personal = 0; G.team = 0; G.bank = 0; G.day = 1; G.quota = 0; G.timeLeft = 0;
    G.clips = 0; G.clipBots = 0; G.wallet = 0; G.up = {}; G.prog = {}; Inv.load({}); G.stats = { calls: 0, scams: 0, baited: 0, hung: 0 }; G.result = null; G.startedAt = now();
    $('#menu').classList.add('hidden'); $('#hud').classList.remove('hidden'); $('#review').classList.add('hidden'); $('#pause').classList.add('hidden');
    AudioSys.resume(); Bus.emit('game:begin', { mode, slot: G.slot });
  },
  loadSave() {
    if (G.mode === 'week') {
      const sv = Saves.week[G.slot];
      if (sv) { G.day = sv.day || 1; G.bank = sv.bank || 0; G.dayLen = sv.dayLen || settings.dayLen; Object.assign(G.stats, sv.stats || {}); G.wallet = sv.wallet || 0; G.up = Object.assign({}, sv.up); Inv.load(sv.inv); G.prog = Object.assign({}, sv.prog); }
      else { G.dayLen = settings.dayLen; this.saveWeek(1); }
    } else {
      const sv = Saves.endless; G.dayLen = 1; G.timeLeft = 0;
      if (sv) { G.team = sv.total || 0; Object.assign(G.stats, sv.stats || {}); G.wallet = sv.wallet || 0; G.up = Object.assign({}, sv.up); Inv.load(sv.inv); G.prog = Object.assign({}, sv.prog); }
    }
    Bus.emit('save:loaded');
  },
  saveWeek(day) { Saves.week[G.slot] = { day, bank: G.bank, dayLen: G.dayLen, stats: Object.assign({}, G.stats), wallet: G.wallet, up: Object.assign({}, G.up), inv: Inv.dump(), prog: JSON.parse(JSON.stringify(G.prog)), updated: Date.now() }; writeSaves(); },
  saveEndless() { Saves.endless = { total: G.team, stats: Object.assign({}, G.stats), wallet: G.wallet, up: Object.assign({}, G.up), inv: Inv.dump(), prog: JSON.parse(JSON.stringify(G.prog)), updated: Date.now() }; writeSaves(); },

  startSolo(mode, slot) { this.begin(mode, slot); this.loadSave(); this.startDay(); },
  async startHost(mode, slot) {
    const code = await Net.host();
    this.begin(mode, slot); this.loadSave();
    G.phase = 'lobby'; G.quota = G.mode === 'week' ? this.quotaFor(G.day, 1) : 0; G.timeLeft = G.dayLen;
    this.boardText(); toast('Room ' + code + ' is open. Share the code with your friends.', 'good');
  },
  async joinRoom(code) {
    const w = await Net.join(code);
    this.begin(w.g.mode, 0); this.applyNet(w.g);
    if (w.g.phase === 'day') { G.phase = 'day'; this.enterDay(true); } else { G.phase = 'lobby'; this.boardText(); if (w.g.phase === 'review') toast('A review is in progress. You will join the next day.'); }
  },
  startShift() { if (G.phase === 'lobby' && this.authority()) this.startDay(); },

  /* ----- day cycle (host / singleplayer decide, everyone runs enterDay) ----- */
  startDay() {
    G.phase = 'day';
    if (G.mode === 'week') { G.team = 0; G.quota = this.quotaFor(G.day, Net.active ? Net.players.size : 1); G.timeLeft = G.dayLen; }
    Net.broadcast({ t: 'phase', phase: 'day', g: this.netState() });
    this.enterDay();
  },
  enterDay(late) {
    leaveReview(); $('#review').classList.add('hidden'); G.result = null; placeBoss(false);
    if (G.mode === 'week' && !late) G.personal = 0;
    Call.reset(); this.boardText(); if (OS.open) OS.show();
    if (G.mode === 'week') UI.dayCard(DAYS[(G.day - 1) % 5], 'Team quota ' + money(G.quota));
    else UI.dayCard('Overtime', 'No quota. The phones never stop.');
    Bus.emit('day:start', { day: G.day, mode: G.mode, late: !!late });
  },
  boardText() {
    setBoard(G.mode === 'week'
      ? ['Daily targets', DAYS[(G.day - 1) % 5] + ': ' + money(G.quota), '1. Smile while dialling', '2. Do not get baited', '3. Teamwork :)']
      : ['Overtime', 'Team total: ' + money(G.team), 'No quota today', 'Go home never']);
  },
  endDay() {
    const players = this.roster().map(p => ({ name: p.name, personal: p.personal }));
    const res = { day: G.day, team: G.team, quota: G.quota, pass: G.team >= G.quota, week: G.day % 5 === 0, players };
    res.lines = reviewLines(res);
    if (res.pass) { G.bank += G.team; this.saveWeek(G.day + 1); }
    G.phase = 'review';
    Net.broadcast({ t: 'phase', phase: 'review', res, g: this.netState() });
    this.enterReview(res);
  },
  enterReview(res) {
    G.result = res; G.paused = false; $('#pause').classList.add('hidden');
    Call.shut(); TTS.stop();
    const ids = [...Net.players.keys()].sort(), idx = Net.active ? Math.max(0, ids.indexOf(Net.myId)) : 0;
    seatForReview(idx); placeBoss(true, !res.pass); UI.showReview(res);
    Bus.emit('review', res);
  },
  nextDay() { if (!this.authority() || G.phase !== 'review') return; G.day++; this.startDay(); },
  retryDay() { if (!this.authority() || G.phase !== 'review') return; this.startDay(); },

  /* ----- money ----- */
  earn(amt) {
    G.personal = Math.max(0, G.personal + amt); Bus.emit('earn', amt);
    if (Net.active && !Net.isHost) { Net.sendEarn(amt); G.team = Math.max(0, G.team + amt); }
    else this.addTeam(amt, Net.myId);
    OS.stats();
  },
  addTeam(amt, fromId) {       // host / singleplayer only
    const before = this.unlockCount();
    G.team = Math.max(0, G.team + amt);
    if (Net.active) {
      const p = Net.players.get(fromId), name = p ? p.name : 'Someone';
      if (fromId !== Net.myId) { if (amt > 0) G.stats.scams++; toast(amt >= 0 ? name + ' closed a scam: +' + money(amt) : name + ' got baited: ' + money(amt), amt >= 0 ? 'good' : 'bad'); }
      Net.broadcast({ t: 'evt', k: 'earn', id: fromId, name, amt });
    }
    if (G.mode === 'endless') { this.saveEndless(); this.boardText(); }
    this.checkUnlock(before);
  },
  checkUnlock(before) {
    const n = this.unlockCount(); if (n <= before) return;
    for (let i = before; i < n; i++) toast('New scheme unlocked: ' + SCHEMES[i].emoji + ' ' + SCHEMES[i].name, 'good');
    if (OS.open) { OS.buildIcons(); OS.refresh(); }
  },

  /* ----- client side of the network ----- */
  applyNet(g) {
    if (!g) return; const before = G.phase === 'menu' ? 99 : this.unlockCount();
    G.mode = g.mode; G.day = g.day; G.quota = g.quota; G.team = g.team; G.timeLeft = g.timeLeft; G.dayLen = g.dayLen; G.bank = g.bank;
    this.checkUnlock(before);
  },
  /* safety net: if a phase message was missed, catch up from the regular snapshots */
  syncPhase(g) { if (g && g.phase === 'day' && G.phase === 'lobby') { G.phase = 'day'; this.enterDay(true); } },
  onPhase(d) {
    this.applyNet(d.g);
    if (d.phase === 'day') { G.phase = 'day'; this.enterDay(); }
    else if (d.phase === 'review') { if (G.phase === 'lobby') return; G.phase = 'review'; this.enterReview(d.res); }
  },

  tick(dt) {
    if (G.phase === 'menu') return;
    if (G.phase === 'day' && G.mode === 'week') {
      if (this.authority()) { if (!(G.paused && !Net.active)) { G.timeLeft -= dt; if (G.timeLeft <= 0) { G.timeLeft = 0; this.endDay(); } } }
      else G.timeLeft = Math.max(0, G.timeLeft - dt);
    }
    if (!(G.paused && !Net.active)) Call.tick(dt);
    G.clips += G.clipBots * dt;
  },
  pause(on) {
    if (G.phase === 'menu') return;
    G.paused = on; $('#pause').classList.toggle('hidden', !on);
    $('#pause-note').textContent = Net.active ? 'The shift keeps running in multiplayer.' : (G.mode === 'week' ? 'The clock is stopped.' : '');
    if (on) releaseLock();
  },
  confirmQuit() { this.pause(true); },
  quit() {
    Net.leave(); Call.reset(); OS.reset(); OS.hide(); releaseLock(); TTS.stop();
    G.phase = 'menu'; G.paused = false; G.result = null; P.seated = false; P.review = -1; P.cam = null;
    ['#hud', '#review', '#pause'].forEach(s => $(s).classList.add('hidden'));
    $('#menu').classList.remove('hidden'); UI.menu('home'); placeBoss(false);
    for (const b of W.balls) W.scene.remove(b.m); W.balls.length = 0;
    Bus.emit('quit');
  }
};
