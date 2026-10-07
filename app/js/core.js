'use strict';
/* =====================================================================
   TOTALLY LEGIT INC. — a co-op call center game
   Single-file build. Sections: core, audio, data, ai, world, os, call,
   net, game.
   ===================================================================== */
const VERSION = '0.1';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

function h(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  if (attrs) for (const k in attrs) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k in e && k !== 'list') { try { e[k] = v; } catch (_) { e.setAttribute(k, v); } }
    else e.setAttribute(k, v);
  }
  for (const c of kids.flat(3)) {
    if (c == null || c === false) continue;
    e.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return e;
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a = 1, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const money = n => (n < 0 ? '-$' : '$') + Math.abs(Math.round(n)).toLocaleString('en-US');
const now = () => performance.now() / 1000;
function hashStr(s) { let x = 2166136261; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return x >>> 0; }
function fmtTime(sec) { sec = Math.max(0, Math.ceil(sec)); return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'); }
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function loadScript(urls) {
  return new Promise((res, rej) => {
    const list = [].concat(urls); let i = 0;
    const next = () => {
      if (i >= list.length) return rej(new Error('Could not load ' + list[0]));
      const s = document.createElement('script'); s.src = list[i++];
      s.onload = () => res(); s.onerror = () => { s.remove(); next(); };
      document.head.append(s);
    };
    next();
  });
}

/* ---------- storage (falls back to memory when the browser blocks it) ---------- */
const Store = (() => {
  const mem = {}; let ok = false;
  try { localStorage.setItem('__tli', '1'); localStorage.removeItem('__tli'); ok = true; } catch (e) { ok = false; }
  return {
    persistent: ok,
    get(k, d) { try { const v = ok ? localStorage.getItem(k) : mem[k]; return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { const s = JSON.stringify(v); try { if (ok) localStorage.setItem(k, s); else mem[k] = s; } catch (e) { mem[k] = s; } },
    del(k) { try { if (ok) localStorage.removeItem(k); } catch (e) {} delete mem[k]; }
  };
})();

const SET_KEY = 'tli_settings_v1', SAVE_KEY = 'tli_saves_v1';
const SHIRTS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#a855f7', '#ec4899', '#14b8a6', '#f97316', '#64748b', '#eab308'];
const DEF_SETTINGS = {
  name: '', color: SHIRTS[0], sens: 1, invertY: false, fov: 72,
  master: 0.8, sfx: 0.8, voice: 1, callerVoice: 0.9, tts: true, micMode: 'open',
  provider: 'offline', apiKey: '', baseUrl: '', model: '', sttMode: 'auto', lang: 'en-US', handsFree: false,
  quality: 'med', npcs: true, dayLen: 300,
  peerHost: '', peerPort: '', peerPath: '/', peerSecure: true
};
const settings = Object.assign({}, DEF_SETTINGS, Store.get(SET_KEY, {}));
if (!settings.name) { settings.name = 'Agent ' + randi(100, 999); settings.color = pick(SHIRTS); }
function saveSettings() { Store.set(SET_KEY, settings); }

const Saves = Object.assign({ week: [null, null, null], endless: null }, Store.get(SAVE_KEY, {}));
function writeSaves() { Store.set(SAVE_KEY, Saves); }

const LANGS = {
  'en-US': 'English', 'en-GB': 'English (UK)', 'pl-PL': 'Polish', 'es-ES': 'Spanish', 'de-DE': 'German',
  'fr-FR': 'French', 'it-IT': 'Italian', 'pt-BR': 'Portuguese', 'nl-NL': 'Dutch', 'tr-TR': 'Turkish',
  'uk-UA': 'Ukrainian', 'ja-JP': 'Japanese'
};

function toast(msg, kind = '') {
  const box = $('#toasts'), t = h('div', { class: 'toast ' + kind }, msg);
  box.append(t);
  /* at most 5 on screen (a burst of purchases or unlocks used to stack up off the top): the oldest go first */
  const live = [...box.children].filter(e => !e.classList.contains('out'));
  for (let i = 0; i < live.length - 5; i++) { const o = live[i]; o.classList.add('out'); setTimeout(() => o.remove(), 400); }
  setTimeout(() => t.classList.add('out'), 3400);
  setTimeout(() => t.remove(), 3900);
}

/* =====================================================================
   EXTENSION POINTS — shared registries. Safe to use at load time from
   any file (core.js loads first). See docs/ARCHITECTURE.md.
   ===================================================================== */
/* Bus: game-wide events.  Bus.on('scam:paid', e => ...); Bus.emit('scam:paid', {...}) */
const Bus = {
  map: new Map(),
  on(evt, fn) { if (!this.map.has(evt)) this.map.set(evt, new Set()); this.map.get(evt).add(fn); return () => this.off(evt, fn); },
  off(evt, fn) { const s = this.map.get(evt); if (s) s.delete(fn); },
  emit(evt, ...args) {
    const s = this.map.get(evt); if (!s) return;
    for (const fn of [...s]) { try { fn(...args); } catch (e) { console.error('Bus handler for "' + evt + '" failed', e); } }
  }
};
/* Loop: per-frame hooks. Loop.add(fn) runs fn(dt, t) every frame after the world updates;
   Loop.addRender(fn) runs after the main 3D render (extra cameras, render targets). */
const Loop = {
  fns: [], renders: [],
  add(fn) { this.fns.push(fn); return fn; },
  addRender(fn) { this.renders.push(fn); return fn; },
  remove(fn) { this.fns = this.fns.filter(f => f !== fn); this.renders = this.renders.filter(f => f !== fn); },
  _call(list, dt, t) {
    for (const f of list) { try { f(dt, t); } catch (e) { if (!f._errLogged) { f._errLogged = true; console.error('Loop hook failed', e); } } }
  },
  run(dt, t) { this._call(this.fns, dt, t); },
  runRender(dt, t) { this._call(this.renders, dt, t); }
};
/* Shop: the store catalog. The shop app renders it; any module can add items at load time.
   Shop.add({ id, tab: 'scams'|'apps'|'games'|'goods', name, desc, price, icon, color, section,
              owned() -> bool, buy() (called after the price is paid), repeatable, available() -> bool, sort }) */
const Shop = {
  items: new Map(),
  add(it) { this.items.set(it.id, it); return it; },
  get(id) { return this.items.get(id); },
  list(tab) { return [...this.items.values()].filter(i => !tab || i.tab === tab).sort((a, b) => (a.sort || 0) - (b.sort || 0)); }
};
/* Inv: items the local player owns, saved with progress.  Inv.give('mace'); Inv.count('mace'); Inv.take('mace').
   What an item does lives in ItemDefs[id] (registered by whichever module owns that item). */
const ItemDefs = {};
const Inv = {
  items: {},
  give(id, n = 1) { this.items[id] = (this.items[id] || 0) + n; Bus.emit('inv:change', id, this.items[id]); },
  take(id, n = 1) { if ((this.items[id] || 0) < n) return false; this.items[id] -= n; if (!this.items[id]) delete this.items[id]; Bus.emit('inv:change', id, this.items[id] || 0); return true; },
  count(id) { return this.items[id] || 0; },
  all() { return Object.keys(this.items).filter(id => this.items[id] > 0); },
  load(obj) { this.items = Object.assign({}, obj || {}); Bus.emit('inv:change', null, 0); },
  dump() { return Object.assign({}, this.items); }
};
