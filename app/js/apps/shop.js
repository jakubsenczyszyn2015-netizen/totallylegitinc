'use strict';
/* =====================================================================
   BONKMART MARKET — the in-game store (OS.apps.shop).
   Renders the Shop registry (core.js) as tabs > sections > product cards with hold-to-buy buttons,
   and registers its own catalog: scheme licences, phone upgrades, office perks and the Chaos goods
   (airstrikes, pizza party, inflatable boss, gold-plated stapler). API: docs/modules/shop.md
   ===================================================================== */

/* ---------- item helpers (every field of a Shop item except id/name/buy is optional) ---------- */
const bmVal = (v, it) => typeof v === 'function' ? v.call(it) : v;
const bmPrice = it => Math.max(0, Math.round(+bmVal(it.price, it) || 0));
const bmTry = (f, d) => { try { return f(); } catch (e) { return d; } };
const bmOwned = it => bmTry(() => !!(it.owned && it.owned()), false);
const bmAvail = it => bmTry(() => !it.available || it.available() !== false, false);
const bmBlocked = it => bmTry(() => (it.blocked && it.blocked()) || '', '');
const bmCount = it => bmTry(() => it.count ? it.count() : it.repeatable ? Inv.count(it.item || it.id) : 0, 0);
const bmBuyable = it => bmAvail(it) && !bmBlocked(it) && !(bmOwned(it) && !it.repeatable);
const bmEsc = s => String(s == null ? '' : s).replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));

/* ---------- picture art: SVG box art, 3D model thumbnails ---------- */
const BMArt = {
  n: 0,
  rays(op) { let s = ''; for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, b = a + Math.PI / 16; s += `M95 50L${(95 + Math.cos(a) * 140).toFixed(1)} ${(50 + Math.sin(a) * 140).toFixed(1)}L${(95 + Math.cos(b) * 140).toFixed(1)} ${(50 + Math.sin(b) * 140).toFixed(1)}z`; } return `<path d="${s}" fill="#fff" opacity="${op || 0.12}"/>`; },
  wrap(inner) { return '<svg viewBox="0 0 190 100" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">' + inner + '</svg>'; },
  /* a chunky app-tile box art for a glyph (upgrades, software) */
  glyph(g, col) {
    const gl = OS_GLYPHS[g] || OS_GLYPHS.star;
    return this.wrap(this.rays() + `<g transform="translate(95 51) rotate(-7)"><rect x="-31" y="-27" width="62" height="62" rx="15" fill="#10131b" opacity=".3"/>
      <rect x="-31" y="-33" width="62" height="62" rx="15" fill="#fff" stroke="#151a26" stroke-width="3.5"/>
      <g transform="translate(-21 -23) scale(1.75)" fill="${col}" stroke="${col}">${gl}</g></g>
      <circle cx="40" cy="22" r="3" fill="#fff" opacity=".7"/><circle cx="150" cy="76" r="4" fill="#fff" opacity=".55"/><path d="M152 18l2.4 5.6 5.6 2.4-5.6 2.4-2.4 5.6-2.4-5.6-5.6-2.4 5.6-2.4z" fill="#fff" opacity=".85"/>`);
  },
  /* a scheme licence certificate with an APPROVED-ISH stamp */
  licence(s) {
    const g = OS_GLYPHS[OS_EMOJI_GLYPH[s.emoji]] || OS_GLYPHS.doc, nm = bmEsc(s.name.toUpperCase()), long = nm.length > 13;
    return this.wrap(this.rays(0.1) + `<g transform="translate(95 51) rotate(-4)">
      <rect x="-64" y="-34" width="128" height="76" rx="6" fill="#10131b" opacity=".28"/>
      <rect x="-64" y="-40" width="128" height="76" rx="6" fill="#fbf5e2" stroke="#151a26" stroke-width="3"/>
      <path d="M-62.5 -24V-33.5a5 5 0 0 1 5-5h115a5 5 0 0 1 5 5V-24z" fill="${s.color}"/><path d="M-64 -24H64" stroke="#151a26" stroke-width="2.5"/>
      <text x="0" y="-27.5" text-anchor="middle" font-family="Lilita One,sans-serif" font-size="10.5" letter-spacing="1.6" fill="#fff" stroke="#151a26" stroke-width=".6">OFFICIAL SCHEME LICENCE</text>
      <circle cx="-41" cy="2" r="15.5" fill="${s.color}" stroke="#151a26" stroke-width="2.6"/>
      <g transform="translate(-50.6 -7.6) scale(.8)" fill="#fff" stroke="#fff">${g}</g>
      <text x="-19" y="-5" font-family="Lilita One,sans-serif" font-size="${long ? 8.4 : 10}" fill="#1d2433" ${long ? 'textLength="74" lengthAdjust="spacingAndGlyphs"' : ''}>${nm}</text>
      <path d="M-19 2h70M-19 8h62M-19 14h48" stroke="#cfc6aa" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M-56 27c6-5 10 3 16-2s9 2 14-1" fill="none" stroke="#2b3550" stroke-width="1.6" stroke-linecap="round"/>
      <g transform="translate(37 22) rotate(-15)" opacity=".92"><rect x="-27" y="-8.5" width="54" height="17" rx="3" fill="#fbf5e2" stroke="#d6342c" stroke-width="2.4"/>
      <text x="0" y="4" text-anchor="middle" font-family="Lilita One,sans-serif" font-size="9.5" fill="#d6342c" letter-spacing=".6">APPROVED-ISH</text></g></g>`);
  },
  /* office perks: little flat cartoon illustrations */
  perk(id) {
    const k = '#151a26', u = 'bm' + (++this.n);
    const A = {
      poster: `<g transform="translate(66 50) rotate(-7)"><rect x="-27" y="-38" width="54" height="72" rx="2" fill="${k}"/><rect x="-23" y="-34" width="46" height="46" fill="#3b5bdb"/>
        <path d="M-23 12l14-20 9 10 7-8 16 18z" fill="#d0ebff"/><circle cx="10" cy="-20" r="6" fill="#ffd43b"/><text x="0" y="26" text-anchor="middle" font-family="Alfa Slab One,serif" font-size="9.5" fill="#fff">HUSTLE</text></g>
        <g transform="translate(116 52) rotate(5)"><rect x="-30" y="-42" width="60" height="80" rx="2" fill="${k}"/><defs><linearGradient id="${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7b2ff7"/><stop offset=".6" stop-color="#ff6b3d"/><stop offset="1" stop-color="#ffd166"/></linearGradient></defs>
        <rect x="-26" y="-38" width="52" height="52" fill="url(#${u})"/><path d="M-26 14l16-26 10 12 8-10 18 24z" fill="#2b1a3d"/><path d="M-2 -22c4-4 8-4 11 0-3-1-7-1-11 0zM-2 -22c-3-3-7-3-10 0 3-1 6-1 10 0z" fill="${k}"/>
        <text x="0" y="29" text-anchor="middle" font-family="Alfa Slab One,serif" font-size="10" fill="#ffd166">SYNERGY</text></g>`,
      chair: `<g transform="translate(95 50)" stroke="${k}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">
        <path d="M-6 6v20M-26 34l20-8 20 8M-6 26l-2 10" fill="none"/><circle cx="-27" cy="37" r="4" fill="#495057"/><circle cx="15" cy="37" r="4" fill="#495057"/><circle cx="-7" cy="39" r="4" fill="#495057"/>
        <rect x="-30" y="-2" width="48" height="11" rx="5" fill="#fff"/><path d="M8 -2c8-12 10-26 6-40-1-3-4-4-7-3l-4 2c-3 2-3 5-2 8 3 10 2 22-3 33z" fill="#fff"/>
        <path d="M-30 4h-6v-10" fill="none"/><path d="M18 -14c5 2 9 1 12-2M22 -26c4 1 7 0 9-2" fill="none" stroke="#ffd43b" stroke-width="2.5"/></g>`,
      coffee: `<g transform="translate(95 52)" stroke="${k}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">
        <rect x="8" y="-22" width="44" height="52" rx="4" fill="#d9b98b"/><path d="M8 -10h44" fill="none"/><text x="30" y="8" text-anchor="middle" font-family="Lilita One,sans-serif" font-size="10" fill="#7a3d1c" stroke="none">BONK</text><text x="30" y="19" text-anchor="middle" font-family="Lilita One,sans-serif" font-size="10" fill="#7a3d1c" stroke="none">BEANS</text>
        <path d="M-40 -6h38v26c0 8-6 14-14 14h-10c-8 0-14-6-14-14z" fill="#fff"/><path d="M-2 2h5c6 0 6 14 0 14h-5" fill="none"/><path d="M-37 -2h32" stroke="#6b3a1e" stroke-width="5"/>
        <path d="M-30 -14c-4-5 4-8 0-14M-20 -14c-4-5 4-8 0-14M-10 -14c-4-5 4-8 0-14" fill="none" stroke="#fff" stroke-width="2.6" opacity=".9"/>
        <circle cx="-21" cy="12" r="6" fill="#ff8787" stroke="none"/><text x="-21" y="15.5" text-anchor="middle" font-family="Lilita One,sans-serif" font-size="9" fill="#fff" stroke="none">x2</text></g>`,
      jazz: `<g transform="translate(92 54)" stroke="${k}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">
        <path d="M-40 4c0-10 6-14 14-14h40c8 0 14 4 14 14l4 22H-44z" fill="#ff922b"/><path d="M-44 -18c0-8 6-12 14-12h48c8 0 14 4 14 12v4c0 4-3 6-6 6H-38c-3 0-6-2-6-6z" fill="#ffa94d"/>
        <rect x="-22" y="6" width="28" height="14" rx="3" fill="#fff"/><path d="M-30 -16h18l3 3h10l3-3h18" fill="none" stroke="${k}" stroke-width="3"/>
        <path d="M-26 -12h16M2 -12h16" stroke="${k}" stroke-width="6"/><path d="M-10 -12h12" stroke="${k}" stroke-width="2"/></g>
        <g fill="#fff" stroke="${k}" stroke-width="2.5"><path d="M128 40V18l14-4v20"/><circle cx="125" cy="40" r="4.5"/><circle cx="139" cy="35" r="4.5"/><path d="M150 62V46l10-3v14" fill="none"/><circle cx="147" cy="62" r="3.6"/><circle cx="157" cy="58" r="3.6"/><path d="M40 30V14" fill="none"/><circle cx="37" cy="31" r="4"/></g>`
    };
    return this.wrap(this.rays() + (A[id] || ''));
  }
};

/* 3D thumbnails: render a model once with the game renderer into a small render target, keep a data URL */
const BMThumb = {
  cache: new Map(), queue: [], busy: false, W: 380, H: 200,
  get(key, make, cb) {
    if (this.cache.has(key)) return this.cache.get(key);
    this.queue.push({ key, make, cb }); this.pump(); return null;
  },
  pump() {
    if (this.busy || !this.queue.length) return; this.busy = true;
    setTimeout(() => {
      const j = this.queue.shift();
      if (!this.cache.has(j.key)) { let url = null; try { url = this.render(j.make()); } catch (e) { console.warn('BonkMart thumbnail failed', e); } this.cache.set(j.key, url); }
      try { j.cb(this.cache.get(j.key)); } catch (e) {}
      this.busy = false; this.pump();
    }, 20);
  },
  render(obj) {
    const R = W.renderer; if (!R || !obj) return null;
    const w = this.W * 2, hh = this.H * 2;
    if (!this.scene) {
      const s = this.scene = new THREE.Scene();
      s.add(new THREE.HemisphereLight(0xfff6ea, 0x4a4f63, 0.95));
      const k = new THREE.DirectionalLight(0xffffff, 0.95); k.position.set(2.5, 4, 5); s.add(k);
      const r = new THREE.DirectionalLight(0xcfe0ff, 0.5); r.position.set(-4, 1, -3); s.add(r);
      this.cam = new THREE.PerspectiveCamera(24, this.W / this.H, 0.01, 100);
      this.rt = new THREE.WebGLRenderTarget(w, hh); this.rt.texture.encoding = THREE.sRGBEncoding;
      this.px = new Uint8Array(w * hh * 4);
      this.cv = h('canvas', { width: w, height: hh }); this.out = h('canvas', { width: this.W, height: this.H });
    }
    const piv = new THREE.Group(), o = obj.userData.thumb || {}; piv.add(obj); this.scene.add(piv);
    const b0 = new THREE.Box3().setFromObject(piv), s0 = b0.getSize(new THREE.Vector3());
    const ry = o.ry != null ? o.ry : (s0.z > s0.x * 1.3 ? -Math.PI / 2 + 0.4 : -0.55);
    piv.rotation.set(o.rx != null ? o.rx : 0.32, ry, o.rz || 0, 'YXZ'); piv.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(piv), c = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3());
    piv.position.sub(c); piv.updateMatrixWorld(true);
    const t = Math.tan(this.cam.fov * Math.PI / 360), d = Math.max(sz.y / 2 / t, sz.x / 2 / t / this.cam.aspect) * (o.zoom || 1.3) + sz.z / 2;
    this.cam.position.set(0, 0, d); this.cam.lookAt(0, 0, 0); this.cam.near = d / 40; this.cam.far = d * 4; this.cam.updateProjectionMatrix();
    const prev = R.getRenderTarget(), cc = R.getClearColor(new THREE.Color()), ca = R.getClearAlpha();
    try {
      R.setRenderTarget(this.rt); R.setClearColor(0x000000, 0); R.clear(); R.render(this.scene, this.cam);
      R.readRenderTargetPixels(this.rt, 0, 0, w, hh, this.px);
    } finally { R.setRenderTarget(prev); R.setClearColor(cc, ca); this.scene.remove(piv); }
    const g = this.cv.getContext('2d'), img = g.createImageData(w, hh), row = w * 4;
    for (let y = 0; y < hh; y++) img.data.set(this.px.subarray((hh - 1 - y) * row, (hh - y) * row), y * row);
    g.putImageData(img, 0, 0);
    const go = this.out.getContext('2d'); go.clearRect(0, 0, this.W, this.H); go.imageSmoothingQuality = 'high'; go.drawImage(this.cv, 0, 0, this.W, this.H);
    return this.out.toDataURL('image/png');
  }
};

/* ---------- the store app ---------- */
const BonkMart = {
  TABS: [
    { id: 'scams', name: 'Scams', col: '#c2414b' },
    { id: 'apps', name: 'Business apps', col: '#18a39a' },
    { id: 'games', name: 'Games & software', col: '#8a63d2' },
    { id: 'goods', name: 'Physical goods', col: '#ff5c93' }
  ],
  /* section order per tab; unknown sections follow in registration order */
  SECTIONS: { scams: ['Available licences', 'Already on your desk'], apps: ['Phone upgrades', 'Office perks'], games: ['Software', 'Games'], goods: ['Snacks & pranks', 'Gadgets', 'Weapons & personal safety', 'Chaos'] },
  tab: 'goods', win: null, sig: '', cards: new Map(), holdMs: 700, popUntil: 0, lastSig: '',
  badgeAt: Infinity, seenWallet: -1, base: null,

  open(tab) { if (tab) this.tab = tab; const had = OS.wins.has('shop'), w = OS.launch('shop'); if (w && had) this.build(w.body, true); return w; },
  buy(id) { const it = Shop.get(id); return it ? this.purchase(it) : false; },
  priceOf: bmPrice, stateOf(it) { return this.state(it); },

  state(it) {
    if (!bmAvail(it)) return ['blocked', 'Unavailable'];
    if (bmOwned(it) && !it.repeatable) return ['owned', bmVal(it.ownedLabel, it) || 'Owned'];
    const b = bmBlocked(it); if (b) return ['blocked', b];
    const p = bmPrice(it); return G.wallet < p ? ['need', 'Need ' + money(p)] : ['buy', 'Hold to buy'];
  },
  items(tab) {
    const out = [];
    for (const it of Shop.list(tab)) { if (!bmAvail(it) && !it.showLocked) continue; out.push({ it, sec: bmVal(it.section, it) || 'More stuff' }); }
    return out;
  },
  sections(tab) {
    const list = this.items(tab), order = (this.SECTIONS[tab] || []).slice();
    for (const x of list) if (!order.includes(x.sec)) order.push(x.sec);
    return order.map(name => ({ name, items: list.filter(x => x.sec === name).map(x => x.it) })).filter(s => s.items.length);
  },

  /* ----- DOM ----- */
  build(body, force) {
    if (!body) return;
    const secs = this.sections(this.tab), sig = this.tab + '|' + secs.map(s => s.name + ':' + s.items.map(i => i.id).join(',')).join('/');
    if (!force && sig === this.sig && body.querySelector('.bm-head')) return this.update(body);
    const old = body.querySelector('.bm-scroll'), keep = old && this.sig.split('|')[0] === this.tab ? old.scrollTop : 0;
    this.sig = sig; this.cards.clear();
    const tabCol = (this.TABS.find(t => t.id === this.tab) || this.TABS[0]).col;
    const head = h('div', { class: 'bm-head' },
      h('div', { class: 'bm-logo' }, h('i', { class: 'bm-mark', html: BM_MARK }), h('b', {}, 'BonkMart'), h('span', { class: 'bm-tag' }, 'MARKET')),
      h('div', { class: 'bm-hello' }, h('span', {}, 'Hello, ' + (settings.name || 'Agent')), h('span', { class: 'bm-wallet', title: 'Your Bonk Pay wallet: half of every scam you close' }, h('i', { html: OS.glyph('card') }), h('small', {}, 'Bonk Pay'), h('b', { class: 'bm-bal' }, money(G.wallet)))));
    const tabs = h('div', { class: 'bm-tabs' }, this.TABS.map(t => h('button', {
      class: 'bm-tab' + (t.id === this.tab ? ' on' : ''), style: { '--tc': t.col },
      onclick: () => { if (this.tab === t.id) return; SFX.click(); this.tab = t.id; this.build(body, true); }
    }, t.name)));
    const scroll = h('div', { class: 'bm-scroll', style: { '--tc': tabCol } });
    if (!secs.length) scroll.append(h('div', { class: 'bm-empty' }, h('i', { html: OS.glyph('box') }), h('b', {}, 'Out of stock'), h('span', {}, 'The intern is restocking this aisle. Check back after your next scam.')));
    for (const s of secs) {
      scroll.append(h('div', { class: 'bm-sec' }, h('span', {}, s.name)));
      scroll.append(h('div', { class: 'bm-grid' }, s.items.map(it => this.card(it))));
    }
    scroll.append(h('div', { class: 'bm-foot' }, 'BonkMart Market · All sales final · Prices include a small convenience fee for your convenience'));
    body.replaceChildren(head, tabs, scroll);
    scroll.scrollTop = keep;
    this.update(body);
  },
  card(it) {
    const pic = this.pic(it), fill = h('i', { class: 'bm-fill' }), lbl = h('span', { class: 'bm-lbl' });
    const btn = h('button', { class: 'bm-btn' }, fill, lbl);
    const pips = it.level ? h('div', { class: 'bm-pips' }) : null, cnt = h('span', { class: 'bm-cnt hidden' });
    const price = h('div', { class: 'bm-price' }), desc = h('p', { class: 'bm-desc' });
    const el = h('div', { class: 'bm-card' }, h('div', { class: 'bm-picw' }, pic, cnt), h('b', { class: 'bm-name' }, bmVal(it.name, it)), pips, desc, price, btn);
    const c = { it, el, btn, lbl, fill, price, desc, pips, cnt, st: '', hold: null };
    let down = false;
    const start = e => { if (e && e.button) return; down = true; this.holdStart(c); };
    const stop = () => { if (!down) return; down = false; this.holdCancel(c); };
    btn.addEventListener('pointerdown', start); btn.addEventListener('pointerup', stop); btn.addEventListener('pointerleave', stop); btn.addEventListener('pointercancel', stop);
    btn.addEventListener('keydown', e => { if ((e.code === 'Enter' || e.code === 'Space') && !e.repeat) { e.preventDefault(); start(); } });
    btn.addEventListener('keyup', e => { if (e.code === 'Enter' || e.code === 'Space') stop(); });
    this.cards.set(it.id, c); this.upCard(c);
    return el;
  },
  pic(it) {
    const box = h('div', { class: 'bm-pic', style: { backgroundColor: bmVal(it.color, it) || '#5f6b7d' } });
    const img = url => { if (!url) return; const im = h('img', { class: 'bm-3d', src: url, alt: '', draggable: false }); box.replaceChildren(im); box.classList.add('has3d'); };
    if (typeof it.art === 'function') {   // canvas art: art(ctx, w, h)
      let url = BMThumb.cache.get('art:' + it.id);
      if (url === undefined) { url = null; try { const cv = h('canvas', { width: 380, height: 200 }); it.art(cv.getContext('2d'), 380, 200); url = cv.toDataURL(); } catch (e) { console.warn('shop art', e); } BMThumb.cache.set('art:' + it.id, url); }
      if (url) { box.append(h('img', { class: 'bm-art', src: url, alt: '', draggable: false })); return box; }
    }
    if (it.svg) { box.innerHTML = bmVal(it.svg, it); return box; }
    const ic = it.icon, gname = typeof ic === 'string' && OS_GLYPHS[ic] ? ic : (!ic || typeof ic !== 'string' || !ic.trim().startsWith('<svg')) && OS_EMOJI_GLYPH[it.emoji];
    if (gname) box.innerHTML = BMArt.glyph(gname, bmVal(it.color, it) || '#5f6b7d');
    else box.append(h('div', { class: 'bm-ico', html: OS.iconHTML(it) }));
    const def = ItemDefs[it.item || it.id], make = typeof it.model === 'function' ? () => it.model() : def && typeof def.model === 'function' ? () => def.model() : null;
    if (make) { const url = BMThumb.get('m:' + it.id, make, img); if (url) img(url); }
    return box;
  },
  update(body) {
    body = body || (this.win && this.win.body); if (!body) return;
    const bal = body.querySelector('.bm-bal'); if (bal) bal.textContent = money(G.wallet);
    for (const c of this.cards.values()) this.upCard(c);
  },
  upCard(c) {
    if (c.done) return;
    const it = c.it, [st, label] = this.state(it), key = st + label;
    if (c.key !== key) {
      c.key = key; c.st = st; c.btn.className = 'bm-btn ' + st + (c.hold ? ' hold' : ''); c.lbl.textContent = label;
      c.btn.disabled = st === 'owned' || st === 'blocked'; c.el.classList.toggle('owned', st === 'owned');
      if (st !== 'buy' && c.hold) this.holdCancel(c);
    }
    const p = bmPrice(it), ptxt = p ? money(p) : 'Free'; if (c.price.textContent !== ptxt) c.price.textContent = ptxt;
    const d = bmVal(it.desc, it) || ''; if (c.desc.textContent !== d) c.desc.textContent = d;
    if (c.pips) { const [lv, mx] = it.level(), k = lv + '/' + mx; if (c.pips.dataset.k !== k) { c.pips.dataset.k = k; c.pips.replaceChildren(...Array.from({ length: mx }, (_, i) => h('i', { class: i < lv ? 'on' : '' })), h('span', {}, 'Level ' + lv + ' / ' + mx)); } }
    const n = bmCount(it), nt = n ? 'You have ' + n : ''; if (c.cnt.textContent !== nt) { c.cnt.textContent = nt; c.cnt.classList.toggle('hidden', !n); }
  },
  nudge(c) { c.btn.classList.remove('shake'); void c.btn.offsetWidth; c.btn.classList.add('shake'); },

  /* ----- hold to buy ----- */
  holdStart(c) {
    this.upCard(c);
    if (c.st === 'need') { SFX.bad(); this.nudge(c); return; }
    if (c.st !== 'buy' || c.hold) return;
    c.fill.style.transitionDuration = this.holdMs + 'ms'; c.btn.classList.add('hold'); c.lbl.textContent = 'Keep holding…';
    c.snd = bmCharge(this.holdMs / 1000);
    c.hold = setTimeout(() => { c.hold = null; c.fill.style.transitionDuration = ''; c.btn.classList.remove('hold'); if (c.snd) c.snd.stop(true); c.snd = null; this.complete(c); }, this.holdMs);
  },
  holdCancel(c) {
    if (!c.hold) return; clearTimeout(c.hold); c.hold = null; c.fill.style.transitionDuration = ''; c.btn.classList.remove('hold');
    if (c.snd) { c.snd.stop(); c.snd = null; } c.key = ''; this.upCard(c);
  },
  complete(c) {
    const p = bmPrice(c.it);
    if (!this.purchase(c.it)) { c.key = ''; this.upCard(c); return; }
    c.done = true; c.btn.className = 'bm-btn bought'; c.lbl.textContent = 'Purchased!'; c.btn.disabled = true;
    this.pop(c.el, p ? '-' + money(p) : 'FREE!');
    this.popUntil = now() + 1.1;
    setTimeout(() => { c.done = false; c.key = ''; this.upCard(c); }, 900);
  },
  pop(el, text) {
    const sp = []; for (let i = 0; i < 10; i++) sp.push(h('i', { class: 'bm-coin', style: '--a:' + Math.round(i * 36 + rand(-12, 12)) + 'deg;--d:' + Math.round(rand(55, 95)) + 'px;animation-delay:' + rand(0, 0.08).toFixed(2) + 's' }));
    const e = h('div', { class: 'bm-pop' }, ...sp, h('span', { class: 'o' }, text), h('span', { class: 'f' }, text));
    el.append(e); el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); setTimeout(() => e.remove(), 1300);
  },
  /* pay and deliver. Returns true on success */
  purchase(it) {
    if (!it || !bmAvail(it) || bmBlocked(it) || (bmOwned(it) && !it.repeatable) || G.phase === 'menu') return false;
    const p = bmPrice(it);
    if (G.wallet < p) { SFX.bad(); toast('Not enough money in your Bonk Pay wallet. Close more scams.', 'bad'); return false; }
    const tl = $('#toasts'), n0 = tl ? tl.childElementCount : 0;
    Game.addWallet(-p);
    try { it.buy(); } catch (e) { console.error('BonkMart: buy() failed for ' + it.id, e); Game.addWallet(p); toast('Payment declined by Bonk Pay. You were refunded.', 'bad'); return false; }
    SFX.cash(); FXSnd.noise(0.12, 0.08, 0.05, 3000, 6000, 'highpass');
    if (tl && tl.childElementCount === n0) toast(bmVal(it.name, it) + ' purchased' + (p ? ' for ' + money(p) : '') + '.', 'good');
    Bus.emit('shop:buy', { id: it.id, price: p, item: it });
    Game.saveProgress();
    this.calcBadge(); this.update();
    return true;
  },

  /* ----- badge: something new became affordable ----- */
  calcBadge() {
    let t = Infinity;
    for (const it of Shop.items.values()) { if (!bmBuyable(it)) continue; const p = bmPrice(it); if (p > G.wallet && p < t) t = p; }
    this.badgeAt = t; this.seenWallet = G.wallet;
  },
  visible() { const w = OS.wins.get('shop'); return !!(w && OS.open && !w.el.classList.contains('min')); },
  tick() {
    if (G.phase === 'menu') return;
    if (this.seenWallet < 0) this.calcBadge();
    if (G.wallet !== this.seenWallet) {
      const up = G.wallet > this.seenWallet; this.seenWallet = G.wallet;
      if (up && G.wallet >= this.badgeAt) { if (!this.visible()) OS.badge('shop', true); this.calcBadge(); }
      else if (!up) this.calcBadge();
    }
    if (this.visible()) {
      const body = this.win.body, secs = this.sections(this.tab), sig = this.tab + '|' + secs.map(s => s.name + ':' + s.items.map(i => i.id).join(',')).join('/');
      if (sig !== this.sig && now() > this.popUntil && !this.anyHold()) this.build(body, true); else this.update(body);
    }
  },
  anyHold() { for (const c of this.cards.values()) if (c.hold) return true; return false; }
};
/* the BonkMart mark: a tilted green price tag with a dollar sign */
const BM_MARK = '<svg viewBox="0 0 40 40"><g transform="rotate(-18 20 20)"><path d="M8 9h16l9 11-9 11H8a3 3 0 0 1-3-3V12a3 3 0 0 1 3-3z" fill="#2fd16a" stroke="#0b1a10" stroke-width="2.6" stroke-linejoin="round"/>'
  + '<circle cx="26.5" cy="20" r="2.6" fill="#0b1a10"/><text x="15" y="26.5" text-anchor="middle" font-family="Lilita One,sans-serif" font-size="17" fill="#fff" stroke="#0b1a10" stroke-width="1">$</text></g></svg>';
/* a rising "charging" tone while you hold the buy button */
function bmCharge(dur) {
  if (typeof FXSnd === 'undefined' || !FXSnd.ok()) return null;
  try {
    const c = AudioSys.ctx, o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain(), t = c.currentTime;
    o.type = 'triangle'; o2.type = 'sine'; o.frequency.setValueAtTime(240, t); o.frequency.exponentialRampToValueAtTime(880, t + dur); o2.frequency.setValueAtTime(480, t); o2.frequency.exponentialRampToValueAtTime(1760, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + 0.06);
    o.connect(g); o2.connect(g); g.connect(AudioSys.sfx); o.start(t); o2.start(t); o.stop(t + dur + 0.2); o2.stop(t + dur + 0.2);
    return { stop() { try { const n = c.currentTime; g.gain.cancelScheduledValues(n); g.gain.setTargetAtTime(0.0001, n, 0.02); o.stop(n + 0.12); o2.stop(n + 0.12); } catch (e) {} } };
  } catch (e) { return null; }
}

OS.apps.shop = {
  desktop: true, order: 40, title: 'BonkMart', icon: 'bag', emoji: '🛍️', color: '#f59f00', w: 820, h: 590, x: 0.05, y: 0.03, cls: 'bonkmart',
  render(b, w) { BonkMart.win = w; OS.badge('shop', false); BonkMart.calcBadge(); BonkMart.build(b, true); },
  refresh(b) { BonkMart.build(b); },
  onClose() { BonkMart.win = null; for (const c of BonkMart.cards.values()) BonkMart.holdCancel(c); BonkMart.cards.clear(); BonkMart.sig = ''; }
};
Loop.add((() => { let acc = 0; return dt => { acc += dt; if (acc < 0.25) return; acc = 0; BonkMart.tick(); }; })());

/* =====================================================================
   CATALOG — scheme licences, phone upgrades, office perks
   ===================================================================== */
const bmProg = k => { const p = G.prog.shop || (G.prog.shop = {}); return k ? (p[k] || (p[k] = {})) : p; };

/* ----- Scams tab: licences unlock a scheme before its normal day (G.prog.licences) ----- */
const bmLicensed = id => !!(G.prog.licences && G.prog.licences[id]);
const bmBaseUnlocked = s => (BonkMart.base ? BonkMart.base() : Game.unlocked()).includes(s);
SCHEMES.forEach((s, i) => Shop.add({
  id: 'lic_' + s.id, tab: 'scams', name: s.name, color: s.color, emoji: s.emoji, sort: i,
  section() { return bmOwned(this) ? 'Already on your desk' : 'Available licences'; },
  price: Math.max(150, Math.round(s.reward * 1.5 / 50) * 50),
  svg: () => BMArt.licence(s),
  desc() {
    const when = G.mode === 'week' ? 'Normally unlocks on ' + DAYS[Math.min(4, s.unlock - 1)] + '.' : 'Normally unlocks when the team earns more.';
    return s.pitch + ' Pays ' + money(s.reward) + ' a pop. ' + (bmLicensed(s.id) ? 'Licensed. Frame it.' : bmBaseUnlocked(s) ? 'Already part of your toolkit.' : when);
  },
  owned: () => bmLicensed(s.id) || bmBaseUnlocked(s),
  ownedLabel: () => bmLicensed(s.id) ? 'Licensed' : 'Included',
  buy() {
    (G.prog.licences = G.prog.licences || {})[s.id] = true; Game.saveProgress();
    toast('Licence granted: ' + s.name + '. Its app is on your desktop.', 'good');
    if (OS.open) { OS.buildIcons(); OS.refresh(); }
  }
}));

/* ----- Business apps tab: the classic upgrades as level-ups ----- */
const BM_UP = {
  tongue: ['chat', '#e64980', 'Vocal coaching from a man who once sold sand to a beach.'],
  dial: ['phone', '#2f9e44', 'A dialer so fast it calls people before they are born.'],
  comm: ['cash', '#f08c00', 'We renegotiated your commission. Legal is still crying.'],
  skin: ['shield', '#1971c2', 'Emotional armour, rated for grannies and angry uncles.'],
  patience: ['music', '#7048e8', 'Twelve hours of pan flute covers. Nobody has ever hung up during the solo.'],
  detect: ['search', '#0c8599', 'A magnifying glass app. It squints at callers for you.'],
  av: ['bug', '#c92a2a', 'Antivirus Lite. Mostly vibes, a little bit of firewall.']
};
UPGRADES.forEach((u, i) => {
  const a = BM_UP[u.id] || ['star', '#5f6b7d', ''];
  Shop.add({
    id: 'up_' + u.id, tab: 'apps', section: 'Phone upgrades', name: u.name, icon: a[0], color: a[1], sort: 10 + i,
    desc: (a[2] ? a[2] + ' ' : '') + u.desc,
    get price() { return u.cost * (Game.lvl(u.id) + 1); },
    level: () => [Game.lvl(u.id), u.max],
    owned: () => Game.lvl(u.id) >= u.max, ownedLabel: 'Maxed out',
    buy() { G.up[u.id] = Game.lvl(u.id) + 1; toast(u.name + ' is now level ' + G.up[u.id] + '.', 'good'); Game.saveProgress(); if (OS.open) OS.refresh(); }
  });
});

/* ----- Business apps tab: office perks (G.prog.shop.perks) ----- */
const bmPerk = id => !!(G.prog.shop && G.prog.shop.perks && G.prog.shop.perks[id]);
const BM_PERKS = [
  { id: 'poster', name: 'Motivational Poster Pack', price: 350, color: '#5c7cfa', desc: 'Six laminated posters of mountains, eagles and the word SYNERGY. Scientifically proven: every scam pays 5% more.' },
  { id: 'chair', name: 'Ergonomic Chair', price: 250, color: '#20c997', desc: 'Lumbar support so good your spine remembers how to walk. You move 12% faster everywhere.' },
  { id: 'coffee', name: 'Coffee Subscription', price: 200, color: '#a0522d', desc: 'Premium Bonk Beans delivered to the break room monthly. Every coffee buzz lasts twice as long.' },
  { id: 'jazz', name: 'Smooth Jazz Ringtone', price: 180, color: '#be4bdb', desc: 'Callers enjoy it so much they let your phone ring 10 seconds longer before giving up.' }
];
BM_PERKS.forEach((p, i) => Shop.add({
  id: 'perk_' + p.id, tab: 'apps', section: 'Office perks', name: p.name, desc: p.desc, price: p.price, color: p.color, icon: 'star', sort: 30 + i,
  svg: () => BMArt.perk(p.id), owned: () => bmPerk(p.id),
  buy() { bmProg('perks')[p.id] = true; Game.saveProgress(); bmApplyPerks(); toast(p.name + ' installed. ' + ({ poster: 'Feel the synergy.', chair: 'Your back says thank you.', coffee: 'Double the buzz.', jazz: 'Smooth.' })[p.id], 'good'); }
}));
const BM_PC = {};
function bmApplyPerks() {
  if (typeof PC === 'undefined') return;
  if (BM_PC.walk == null) { BM_PC.walk = PC.walk; BM_PC.run = PC.run; }
  const k = bmPerk('chair') ? 1.12 : 1; PC.walk = BM_PC.walk * k; PC.run = BM_PC.run * k;
}
/* posters: +5% on every scam */
Bus.on('scam:paid', e => {
  if (!bmPerk('poster') || !e || !(e.amt > 0)) return;
  const bonus = Math.max(5, Math.round(e.amt * 0.05 / 5) * 5);
  setTimeout(() => { if (G.phase === 'menu') return; Game.earn(bonus); Game.addWallet(Math.round(bonus * 0.5)); toast('Motivational posters: +' + money(bonus) + ' synergy bonus.', 'good'); }, 600);
});
/* coffee subscription: a fresh coffee buzz (a jump of P.boost) lasts twice as long */
Loop.add((() => { let last = 0; return () => {
  if (typeof P === 'undefined') return; const b = P.boost || 0;
  if (b > last + 30 && bmPerk('coffee') && !Chaos.noDouble) P.boost = b * 2;
  Chaos.noDouble = false; last = P.boost || 0;
}; })());

/* =====================================================================
   CHAOS — physical goods with big shared effects
   Net: 'shop:chaos' {k: 'strike'|'rival'|'pizza'|'boss', by, pts?}; share 'chaos' {b, p}; addMe 'stapler'
   ===================================================================== */
const RIVAL = 'Even More Legit LLC', RIVAL_BONUS = 1000;
const BOSS_SPOT = { x: 23.35, z: 1.55, ry: -Math.PI / 2 - 0.45 };   // lobby, NE corner, facing the glass doors
const PIZZA_SPOT = { x: 13.4, z: 5.0, y: 0.82 };                       // the break-room table (on the old box)

/* ----- models (shared geometry/materials, all built lazily) ----- */
const ChaosArt = {
  M: {},
  m(key, make) { return this.M[key] || (this.M[key] = make()); },
  phong(col, o) { return this.m('ph' + col + JSON.stringify(o || {}), () => new THREE.MeshPhongMaterial(Object.assign({ color: col, shininess: 40, specular: 0x222222 }, o || {}))); },
  tex(key, w, hh, draw) { return this.m('tx' + key, () => { const t = canvasTexLocal(w, hh, draw); return t; }); },
  gold() { return this.m('gold', () => new THREE.MeshPhongMaterial({ color: '#e9a92a', specular: '#fff0b8', shininess: 85, emissive: '#3a2400' })); },

  stapler() {
    const g = new THREE.Group(), gold = this.gold(), dark = this.phong('#2b2622'), velvet = this.phong('#a3182f', { shininess: 6 });
    const geo = (k, f) => this.m('g' + k, f);
    const cush = new THREE.Mesh(geo('cush', () => rboxGeo(0.27, 0.03, 0.12, 0.012, 2)), velvet); cush.position.y = 0.015; g.add(cush);
    const base = new THREE.Mesh(geo('sb', () => rboxGeo(0.2, 0.02, 0.055, 0.008, 2)), gold); base.position.set(0, 0.04, 0); g.add(base);
    const arm = new THREE.Group(); arm.position.set(0.085, 0.052, 0); arm.rotation.z = 0.07; g.add(arm);
    const top = new THREE.Mesh(geo('st', () => rboxGeo(0.19, 0.034, 0.046, 0.014, 3)), gold); top.position.set(-0.088, 0.02, 0); arm.add(top);
    const nose = new THREE.Mesh(geo('sn', () => rboxGeo(0.03, 0.012, 0.04, 0.005, 1)), dark); nose.position.set(-0.17, 0.0, 0); arm.add(nose);
    const hinge = new THREE.Mesh(geo('sh', () => new THREE.CylinderGeometry(0.014, 0.014, 0.06, 12)), dark); hinge.rotation.x = Math.PI / 2; hinge.position.set(0.09, 0.055, 0); g.add(hinge);
    const plate = new THREE.Mesh(geo('sp', () => new THREE.PlaneGeometry(0.07, 0.022)), this.m('platem', () => new THREE.MeshBasicMaterial({ map: this.tex('plate', 128, 40, (c, w, hh) => { c.fillStyle = '#d9a72a'; c.fillRect(0, 0, w, hh); c.fillStyle = '#4a3000'; c.font = 'bold 20px Roboto, sans-serif'; c.textAlign = 'center'; c.fillText('EMPLOYEE', w / 2, 18); c.fillText('OF THE MONTH', w / 2, 36); }) })));
    plate.position.set(0, 0.016, 0.0605); g.add(plate);
    g.userData.thumb = { ry: -0.5, rx: 0.35, zoom: 1.15 };
    return g;
  },
  pizzaTex() {
    return this.tex('pizza', 256, 256, (c, w) => {
      c.fillStyle = '#d6a04e'; c.beginPath(); c.arc(128, 128, 126, 0, 7); c.fill();
      c.fillStyle = '#c4462c'; c.beginPath(); c.arc(128, 128, 108, 0, 7); c.fill();
      c.fillStyle = '#f5c242'; c.beginPath(); for (let i = 0; i < 40; i++) { const a = i / 40 * 6.283, r = 100 + Math.sin(i * 2.7) * 5; c.lineTo(128 + Math.cos(a) * r, 128 + Math.sin(a) * r); } c.fill();
      c.fillStyle = 'rgba(255,230,140,.7)'; for (let i = 0; i < 30; i++) { const a = rand(6.28), r = rand(90); c.beginPath(); c.arc(128 + Math.cos(a) * r, 128 + Math.sin(a) * r, rand(4, 10), 0, 7); c.fill(); }
      for (let i = 0; i < 13; i++) { const a = i * 2.4, r = 22 + (i * 37) % 70; const x = 128 + Math.cos(a) * r, y = 128 + Math.sin(a) * r; c.fillStyle = '#a8261f'; c.beginPath(); c.arc(x, y, 13, 0, 7); c.fill(); c.fillStyle = '#7e1a15'; for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(x + rand(-6, 6), y + rand(-6, 6), 1.6, 0, 7); c.fill(); } }
      c.fillStyle = '#3f8f3a'; for (let i = 0; i < 12; i++) { c.save(); c.translate(128 + rand(-80, 80), 128 + rand(-80, 80)); c.rotate(rand(6)); c.fillRect(-4, -2, 8, 4); c.restore(); }
      c.strokeStyle = 'rgba(120,60,20,.55)'; c.lineWidth = 2.5; for (let i = 0; i < 4; i++) { const a = i * Math.PI / 4; c.beginPath(); c.moveTo(128 + Math.cos(a) * 124, 128 + Math.sin(a) * 124); c.lineTo(128 - Math.cos(a) * 124, 128 - Math.sin(a) * 124); c.stroke(); }
      // one slice already gone
      c.fillStyle = '#d9b98b'; c.beginPath(); c.moveTo(128, 128); c.arc(128, 128, 128, -Math.PI / 4, 0); c.closePath(); c.fill();
    });
  },
  pizzaBox(open) {
    const g = new THREE.Group(), card = this.phong('#d9b98b', { shininess: 4 }), geo = (k, f) => this.m('g' + k, f);
    const tray = new THREE.Mesh(geo('tray', () => new THREE.BoxGeometry(0.4, 0.035, 0.4)), card); tray.position.y = 0.0175; g.add(tray);
    const lidMat = this.m('lidm', () => [card, card, new THREE.MeshLambertMaterial({ map: this.tex('lid', 256, 256, (c, w, hh) => {
      c.fillStyle = '#e0c194'; c.fillRect(0, 0, w, hh); c.strokeStyle = '#c33'; c.lineWidth = 8; c.strokeRect(14, 14, w - 28, hh - 28);
      c.fillStyle = '#c62f2f'; c.beginPath(); c.arc(w / 2, 92, 44, 0, 7); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(w / 2 - 16, 80, 16, 0, 7); c.arc(w / 2 + 16, 80, 16, 0, 7); c.arc(w / 2, 70, 18, 0, 7); c.fill(); c.fillRect(w / 2 - 22, 82, 44, 22);
      c.fillStyle = '#c62f2f'; c.textAlign = 'center'; c.font = '44px "Lilita One", sans-serif'; c.fillText('BONK PIZZA', w / 2, 178); c.font = 'bold 20px Roboto, sans-serif'; c.fillText('HOT · FRESH · LEGIT', w / 2, 210);
    }) }), card, card, card]);
    if (open) {
      const pz = new THREE.Mesh(geo('pz', () => new THREE.CylinderGeometry(0.175, 0.175, 0.014, 28)), this.m('pzm', () => [this.phong('#d6a04e'), new THREE.MeshLambertMaterial({ map: this.pizzaTex() }), this.phong('#d6a04e')]));
      pz.position.y = 0.04; pz.rotation.y = 0.6; g.add(pz);
      const hinge = new THREE.Group(); hinge.position.set(0, 0.035, -0.2); hinge.rotation.x = -1.95; g.add(hinge);
      const lid = new THREE.Mesh(geo('lid', () => new THREE.BoxGeometry(0.4, 0.012, 0.4)), lidMat); lid.position.set(0, 0.006, 0.2); hinge.add(lid);
    } else {
      const lid = new THREE.Mesh(geo('lid', () => new THREE.BoxGeometry(0.4, 0.012, 0.4)), lidMat); lid.position.y = 0.041; g.add(lid);
    }
    g.userData.thumb = { ry: -0.35, rx: 0.5, zoom: 1.12 };
    return g;
  },
  missile(label, col) {
    const g = new THREE.Group(), geo = (k, f) => this.m('g' + k, f), red = this.phong(col || '#e03131', { shininess: 60 });
    const body = new THREE.Mesh(geo('mb', () => new THREE.CylinderGeometry(0.07, 0.07, 0.62, 20, 1, false)), this.m('mism' + label, () => new THREE.MeshPhongMaterial({ shininess: 60, specular: 0x333333, map: this.tex('mis' + label, 256, 128, (c, w, hh) => {
      c.fillStyle = '#f4f1ea'; c.fillRect(0, 0, w, hh); c.fillStyle = col || '#e03131'; c.fillRect(0, 0, w, 14); c.fillRect(0, hh - 30, w, 12);
      c.fillStyle = '#1d2433'; c.font = '34px "Lilita One", sans-serif'; c.textAlign = 'center'; c.save(); c.translate(w * 0.75, hh / 2 + 4); c.rotate(-Math.PI / 2); c.fillText(label, 0, 12); c.restore();
      c.save(); c.translate(w * 0.25, hh / 2 + 4); c.rotate(-Math.PI / 2); c.fillText(label, 0, 12); c.restore();
    }) })));
    g.add(body);
    const nose = new THREE.Mesh(geo('mn', () => new THREE.ConeGeometry(0.07, 0.2, 20)), red); nose.position.y = 0.41; g.add(nose);
    const fin = geo('mf', () => { const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(0.11, -0.06); s.lineTo(0.11, -0.12); s.lineTo(0, -0.1); s.closePath(); return new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: false }); });
    for (let i = 0; i < 4; i++) { const f = new THREE.Mesh(fin, red), p = new THREE.Group(); f.position.set(0.06, -0.2, -0.006); p.add(f); p.rotation.y = i * Math.PI / 2; g.add(p); }
    const fl = new THREE.Mesh(geo('mfl', () => new THREE.ConeGeometry(0.055, 0.22, 14)), this.m('flm', () => new THREE.MeshBasicMaterial({ color: '#ffb347', toneMapped: false })));
    fl.position.y = -0.42; fl.rotation.x = Math.PI; g.add(fl);
    const fl2 = new THREE.Mesh(geo('mfl2', () => new THREE.ConeGeometry(0.03, 0.14, 12)), this.m('flm2', () => new THREE.MeshBasicMaterial({ color: '#fff6c8', toneMapped: false })));
    fl2.position.y = -0.37; fl2.rotation.x = Math.PI; g.add(fl2);
    const w = new THREE.Group(); w.add(g); g.rotation.z = -1.0;
    w.userData.thumb = { ry: 0, rx: 0, zoom: 1.2 };
    return w;
  },
  /* the inflatable boss: shiny vinyl, a body that sways, tube-man arms. Feet at y 0, faces -Z, ~2.9 m */
  balloonBoss() {
    const g = new THREE.Group(), geo = (k, f) => this.m('g' + k, f), vinyl = o => new THREE.MeshPhongMaterial(Object.assign({ shininess: 70, specular: 0x555555 }, o));
    const bodyTex = this.tex('bbody', 512, 256, (c, w, hh) => {
      c.fillStyle = '#2b3245'; c.fillRect(0, 0, w, hh);
      c.fillStyle = '#4a5068'; c.fillRect(0, hh * 0.62, w, hh);   // trousers
      c.fillStyle = '#1c2130'; c.fillRect(0, hh * 0.6, w, 8);      // belt
      c.fillStyle = '#d4a62a'; c.fillRect(w / 2 - 10, hh * 0.6 - 2, 20, 12);
      const cx = w / 2;   // u = 0.5 faces -Z (front)
      c.fillStyle = '#f4f1ea'; c.beginPath(); c.moveTo(cx - 46, 0); c.lineTo(cx + 46, 0); c.lineTo(cx, hh * 0.5); c.fill();
      c.fillStyle = '#d6342c'; c.beginPath(); c.moveTo(cx - 9, 6); c.lineTo(cx + 9, 6); c.lineTo(cx + 14, hh * 0.42); c.lineTo(cx, hh * 0.5); c.lineTo(cx - 14, hh * 0.42); c.fill();
      c.fillStyle = '#f5c518'; c.beginPath(); c.arc(cx + 62, 70, 24, 0, 7); c.fill(); c.fillStyle = '#7a4a00'; c.font = '26px "Lilita One", sans-serif'; c.textAlign = 'center'; c.fillText('#1', cx + 62, 79);
      c.fillStyle = '#ffffff'; c.font = '30px "Alfa Slab One", serif'; c.fillText('BOSS', cx - 2, hh * 0.56);
      c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 3; for (const x of [w * 0.25, w * 0.75]) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, hh); c.stroke(); }   // seams
    });
    const body = new THREE.Mesh(geo('bb', () => { const pts = []; const prof = [[0.0, 0.28], [0.12, 0.34], [0.4, 0.42], [0.75, 0.5], [1.05, 0.56], [1.35, 0.55], [1.6, 0.5], [1.78, 0.42], [1.88, 0.26], [1.93, 0.0]]; for (const [y, r] of prof) pts.push(new THREE.Vector2(r, y)); return new THREE.LatheGeometry(pts, 28); }), vinyl({ map: bodyTex }));
    body.position.y = 0.3;
    const faceTex = this.tex('bface', 512, 256, (c, w, hh) => {
      c.fillStyle = '#f0b48a'; c.fillRect(0, 0, w, hh);
      c.fillStyle = '#b9b9b9'; c.fillRect(0, 0, w, hh * 0.13); for (const x of [w * 0.5, w]) { c.beginPath(); c.ellipse(x, hh * 0.3, 70, 50, 0, 0, 7); c.fill(); }   // grey sides, bald top
      const cx = w * 0.75, cy = hh * 0.55;   // u = 0.75 faces -Z
      c.fillStyle = '#fff'; for (const s of [-1, 1]) { c.beginPath(); c.ellipse(cx + s * 26, cy - 18, 17, 21, 0, 0, 7); c.fill(); }
      c.fillStyle = '#1b1b22'; for (const s of [-1, 1]) { c.beginPath(); c.arc(cx + s * 24, cy - 14, 8, 0, 7); c.fill(); }
      c.fillStyle = '#fff'; for (const s of [-1, 1]) { c.beginPath(); c.arc(cx + s * 24 + 3, cy - 18, 3, 0, 7); c.fill(); }
      c.strokeStyle = '#5a5a5a'; c.lineWidth = 9; c.lineCap = 'round'; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(cx + s * 10, cy - 40); c.lineTo(cx + s * 44, cy - 50); c.stroke(); }
      c.fillStyle = '#d98a63'; c.beginPath(); c.ellipse(cx, cy + 6, 13, 11, 0, 0, 7); c.fill();
      c.fillStyle = '#6e6e6e'; c.beginPath(); c.moveTo(cx, cy + 14); c.bezierCurveTo(cx + 30, cy + 8, cx + 52, cy + 22, cx + 58, cy + 36); c.bezierCurveTo(cx + 36, cy + 30, cx + 16, cy + 30, cx, cy + 26); c.bezierCurveTo(cx - 16, cy + 30, cx - 36, cy + 30, cx - 58, cy + 36); c.bezierCurveTo(cx - 52, cy + 22, cx - 30, cy + 8, cx, cy + 14); c.fill();
      c.strokeStyle = '#7a2d22'; c.lineWidth = 5; c.beginPath(); c.arc(cx, cy + 22, 26, 0.25 * Math.PI, 0.75 * Math.PI); c.stroke();
      c.fillStyle = 'rgba(255,90,90,.35)'; for (const s of [-1, 1]) { c.beginPath(); c.arc(cx + s * 50, cy + 10, 12, 0, 7); c.fill(); }
      c.fillStyle = '#e8a37c'; for (const x of [w * 0.5 - 4, w - 4]) { c.beginPath(); c.ellipse(x, cy - 4, 12, 22, 0, 0, 7); c.fill(); }   // ears
    });
    const head = new THREE.Mesh(geo('bh', () => new THREE.SphereGeometry(0.46, 28, 20)), vinyl({ map: faceTex }));
    head.position.y = 0.3 + 1.93 + 0.36; head.scale.set(1, 1.08, 1);
    const knot = new THREE.Mesh(geo('bk', () => new THREE.SphereGeometry(0.06, 10, 8)), vinyl({ color: '#f0b48a' })); knot.position.y = head.position.y + 0.5;
    const baseM = this.phong('#2a2b30', { shininess: 20 });
    const base = new THREE.Mesh(geo('bbase', () => new THREE.CylinderGeometry(0.42, 0.48, 0.3, 24)), baseM); base.position.y = 0.15;
    const grill = new THREE.Mesh(geo('bgr', () => new THREE.CylinderGeometry(0.3, 0.3, 0.02, 20)), this.phong('#55575e')); grill.position.y = 0.31;
    const sleeve = vinyl({ color: '#2b3245' }), hand = vinyl({ color: '#f0b48a' });
    const arm = s => {
      const p = new THREE.Group(); p.position.set(s * 0.46, 0.3 + 1.62, 0);
      const tube = new THREE.Mesh(geo('ba', () => { const t = new THREE.CylinderGeometry(0.12, 0.15, 0.95, 14); t.translate(0, -0.475, 0); return t; }), sleeve); p.add(tube);
      const cuff = new THREE.Mesh(geo('bc', () => new THREE.SphereGeometry(0.15, 14, 10)), hand); cuff.position.y = -0.97; p.add(cuff);
      const thumb = new THREE.Mesh(geo('bt', () => new THREE.SphereGeometry(0.065, 10, 8)), hand); thumb.position.set(s * 0.07, -1.04, -0.1); p.add(thumb);
      p.rotation.z = s * 2.3; return p;
    };
    const aL = arm(-1), aR = arm(1);
    g.add(base, grill, body, head, knot, aL, aR);
    g.userData = { body, head, aL, aR, thumb: { ry: Math.PI + 0.45, rx: 0.08, zoom: 1.15 } };
    return g;
  }
};
/* small CanvasTexture helper (sRGB, mipmapped) */
function canvasTexLocal(w, hh, draw) { const cv = h('canvas', { width: w, height: hh }); draw(cv.getContext('2d'), w, hh); const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; return t; }

/* ----- the effects ----- */
const Chaos = {
  st: { boss: false, pizza: 0 }, t: 0, sched: [], busyUntil: 0, noDouble: false, localT: -9,
  bossObj: null, bossT: 0, boxes: null, inter: null, slice: false, staplers: new Map(), lastDesk: -1, stT: 0, glintT: 0,
  after(sec, fn) { this.sched.push({ t: this.t + sec, fn }); },
  busy() { return this.t < this.busyUntil; },
  who(by) { return by || settings.name || 'Someone'; },

  /* buyer side: run it here and tell everyone */
  order(k) {
    const d = { k, by: settings.name };
    if (k === 'strike') d.pts = this.plan();
    this.localT = this.t; this.run(d, true);
    Net.emit('shop:chaos', d);
  },
  run(d, mine) {
    if (!d || typeof d.k !== 'string') return;
    if (d.k === 'strike') this.strike(d, mine);
    else if (d.k === 'rival') this.rival(d, mine);
    else if (d.k === 'pizza') this.pizza(d, mine);
    else if (d.k === 'boss') this.boss(true, d);
  },

  /* a red/yellow hazard banner across the screen (works on the desktop and in 3D) */
  banner(title, sub, col) {
    let el = $('#bm-alert'); if (el) el.remove();
    el = h('div', { id: 'bm-alert', class: col || '' }, h('div', { class: 'bm-al-in' }, h('b', {}, title), h('span', {}, sub)));
    document.body.append(el); setTimeout(() => el.remove(), 3600);
  },
  siren(n, v) { for (let i = 0; i < n; i++) { FXSnd.tone(520, 980, 0.55, 'sawtooth', v, i * 1.1, 1600); FXSnd.tone(980, 520, 0.55, 'sawtooth', v, i * 1.1 + 0.55, 1600); } },

  /* ----- airstrike on the office ----- */
  plan() {
    const pts = [], R = W.rooms || {}, ppl = [];
    const at = (seat, x, z) => (seat >= 0 && W.desks[seat] ? [W.desks[seat].seat.x, W.desks[seat].seat.z] : [x, z]);
    ppl.push(P.seated ? at(P.seat) : [P.pos.x, P.pos.z]);
    if (Net.active) for (const [id, p] of Net.players) if (id !== Net.myId) ppl.push(at(p.seat, p.x, p.z));
    for (const [x, z] of ppl) { const a = rand(6.283), r = rand(1.3, 2.3); pts.push([x + Math.cos(a) * r, z + Math.sin(a) * r]); }
    const rects = [R.floor, R.floor, R.floor, R.hall, R.break, R.review].filter(Boolean);
    while (pts.length < 13 && rects.length) { const r = pick(rects); pts.push([rand(r.x0 + 0.9, r.x1 - 0.9), rand(r.z0 + 0.9, r.z1 - 0.9)]); }
    shuffle(pts); let t = 3.6;
    return pts.map(p => { const o = [+p[0].toFixed(2), +p[1].toFixed(2), +t.toFixed(2)]; t += rand(0.22, 0.42); return o; });
  },
  strike(d, mine) {
    const pts = (Array.isArray(d.pts) ? d.pts : []).slice(0, 24).filter(p => Array.isArray(p) && p.length >= 3).map(p => [clamp(+p[0] || 0, -30, 30), clamp(+p[1] || 0, -30, 30), clamp(+p[2] || 0, 0, 20)]);
    if (!pts.length) return;
    const end = Math.max(...pts.map(p => p[2])); this.busyUntil = this.t + end + 2; this._ouch = false;
    this.banner('INCOMING AIRSTRIKE', (mine ? 'You' : this.who(d.by)) + ' ordered it from BonkMart. Take cover!');
    toast((mine ? 'Airstrike ordered. Stand up and watch the show!' : this.who(d.by) + ' ordered an airstrike on the office. Duck!'), 'bad');
    this.siren(3, 0.045); FX.tint('#ff3b2a', 0.12, end + 1.5);
    pts.forEach((p, i) => {
      this.after(Math.max(0, p[2] - 0.75), () => FXSnd.tone(2100, 420, 0.75, 'sine', 0.07 * FXSnd.vol({ x: p[0], y: 1, z: p[1] }) + 0.01));
      this.after(p[2], () => this.boom(p[0], p[1], i));
    });
    this.after(end + 1.6, () => { toast(pick(['Airstrike complete. HR is drafting an email.', 'All clear. Someone sweep up the paperwork.', 'Workplace incident report #4,021 filed.']), 'good'); });
  },
  boom(x, z, i) {
    const y = Space.ground(x, 2.6, z) + 0.2;
    FX.spawn('explosion', [x, y, z], { scale: 1.15 });
    for (let k = 0; k < 14; k++) { const a = rand(6.283), sp = rand(1.5, 4.5); FX.particle({ layer: 'cut', pos: [x, y + 0.3, z], vel: [Math.cos(a) * sp, rand(3, 7.5), Math.sin(a) * sp], ttl: rand(2.6, 4.2), size: rand(0.09, 0.14), color: k % 5 ? '#f4f0e4' : '#ffe38a', frame: 'rect', gravity: 0.22, drag: 1.7, floor: true }); }
    if (i % 4 === 1) FX.fire([x, y, z], 0.75, 7);
    if (Net.isAuth() && typeof Props !== 'undefined') for (let k = 0; k < 2; k++) { const a = rand(6.283), sp = rand(2.5, 5), b = Props.launch('paper', [x, y + 0.5, z], [Math.cos(a) * sp, rand(4, 7), Math.sin(a) * sp]); if (b) { b.t = 0.6; b.life = 15.4; } }   // (life < 15.5: nobody plays a throw animation)
    this.knock(x, y, z, 3.4);
  },
  knock(x, y, z, R) {
    const seated = P.seated || P.review >= 0, me = seated && W.me ? W.me.group.position : P.pos, d = Math.hypot(me.x - x, me.z - z);
    if (d < R && G.phase !== 'menu') {
      const k = 1 - d / R;
      if (!seated) { const nx = (me.x - x) / (d || 1), nz = (me.z - z) / (d || 1); P.kx = nx * (5 + 9 * k); P.kz = nz * (5 + 9 * k); P.vy = Math.max(P.vy || 0, 3 + 4 * k); P.stunT = Math.max(P.stunT || 0, 0.8 + 1.4 * k); }
      if (W.me) { if (W.me.stun) W.me.stun(1 + 1.6 * k); if (W.me.play) W.me.play(!seated && k > 0.45 ? 'fall' : 'hit'); }
      FX.flash('#ffffff', 0.3, 0.25 + 0.4 * k);
      if (!this._ouch) { this._ouch = true; toast(pick(['You got blown up. Workplace incident logged.', 'KABOOM. You are fine. Probably.', 'Your eyebrows are gone. Keep dialling.']), 'bad'); }
    }
    const react = (av, seatedAv, lines) => {
      if (!av || !av.group || !av.group.visible) return; const p = av.group.position, dd = Math.hypot(p.x - x, p.z - z); if (dd > R) return;
      if (av.play) av.play(!seatedAv && dd < R * 0.55 ? 'fall' : 'hit'); if (av.stun) av.stun(1.2 + (1 - dd / R) * 1.5); if (av.setMood) av.setMood('surprised', 3);
      if (lines && Math.random() < 0.6) FX.bubble(av, pick(lines), 2.2);
    };
    if (W.avatars) for (const a of W.avatars.values()) react(a.av, false, null);
    for (const n of W.npcs || []) react(n, true, ['MY EYEBROWS!', 'Was that in the budget?', 'I quit! (I will be back Monday)', 'Not again!', 'My stapler!']);
    react(W.boss, false, ['WHO ORDERED THAT?!', 'That is coming out of your bonus.', 'My office!']);
  },

  /* ----- airstrike on the rival call centre (distant, outside the windows) ----- */
  rival(d, mine) {
    this.busyUntil = this.t + 7;
    this.banner('AIRSTRIKE AUTHORISED', 'Target: ' + RIVAL + ', across the street. Look out the windows!', 'blue');
    toast((mine ? 'Missiles away!' : this.who(d.by) + ' bombed ' + RIVAL + '!') + ' Watch the west windows.', 'good');
    this.siren(2, 0.025);
    for (let i = 0; i < 6; i++) this.after(2.2 + i * 0.5 + rand(0, 0.15), () => this.farBoom(i));
    this.after(5.8, () => {
      toast('Direct hit! ' + RIVAL + '\'s customers are calling us now. +' + money(RIVAL_BONUS) + ' for the team.', 'good');
      if (mine) { Game.earn(RIVAL_BONUS); SFX.cash(); if (OS.open) OS.cashFx('+' + money(RIVAL_BONUS)); }
    });
  },
  farBoom(i) {
    const west = i % 3 !== 2, c = west ? [-16.3, rand(0.6, 1.4), rand(-7.5, 7.5)] : [rand(-9, 7), rand(0.6, 1.4), -14.3], sc = rand(1.8, 2.5);
    FX.particle({ layer: 'add', pos: c, ttl: 0.4, size: [5 * sc, 2.5 * sc], color: '#fff3c8', alpha: [1, 0], frame: 'soft' });
    for (let k = 0; k < 10; k++) FX.particle({ layer: 'add', pos: [c[0] + rand(-0.4, 0.4) * sc, c[1] + rand(0, 0.6) * sc, c[2] + rand(-0.4, 0.4) * sc], vel: [rand(-0.6, 0.6) * sc, rand(0.8, 2.6) * sc, rand(-0.6, 0.6) * sc], ttl: rand(0.8, 1.4), size: [0.8 * sc, 2.4 * sc], color: '#ffe39a', color2: '#ff4d12', alpha: [1, 0], frame: 'fireball', drag: 1.4 });
    for (let k = 0; k < 14; k++) FX.particle({ layer: 'soft', pos: [c[0] + rand(-0.3, 0.3) * sc, c[1] + rand(0, 1.2) * sc, c[2] + rand(-0.3, 0.3) * sc], vel: [rand(-0.3, 0.3), rand(0.9, 2.4) * sc * 0.6, rand(-0.3, 0.3)], ttl: rand(4, 6.5), size: [1.1 * sc, 3.2 * sc], color: '#55443c', color2: '#2a2220', alpha: [0.85, 0], frame: 'smoke', drag: 0.5, gravity: -0.03 });
    this.after(0.4, () => { FXSnd.noise(1.8, 0.32, 0, 220, 50, 'lowpass', 0.8); FXSnd.tone(62, 28, 1.4, 'sine', 0.32); FX.shake(0.2 + Math.random() * 0.12, 0.9); });
    FX.flash('#ffc070', 0.7, 0.16);
  },

  /* ----- pizza party ----- */
  pizza(d, mine) {
    this.st.pizza = 150; this.slice = false; this.boxesOn(true);
    FX.spawn('confetti', [PIZZA_SPOT.x, PIZZA_SPOT.y + 0.35, PIZZA_SPOT.z], { dir: [0, 1, 0], n: 70 });
    FXSnd.tone(988, 988, 0.35, 'triangle', 0.12); FXSnd.tone(784, 784, 0.5, 'triangle', 0.12, 0.32);   // ding-dong
    this.noDouble = true; P.boost = Math.max(P.boost || 0, 40);
    toast((mine ? 'Pizza party ordered!' : this.who(d.by) + ' ordered a pizza party!') + ' Everyone walks faster for a bit. Free slices in the break room.', 'good');
    for (const n of W.npcs || []) if (Math.random() < 0.3) FX.bubble(n, pick(['PIZZA!', 'Is it pineapple?', 'Best. Job. Ever.', 'Does this count as a raise?']), 2.4);
  },
  boxesOn(on) {
    if (!W.scene) return;
    if (on && !this.boxes) {
      const g = new THREE.Group(), s = PIZZA_SPOT;
      for (let k = 0; k < 2; k++) { const b = ChaosArt.pizzaBox(false); b.position.set(0, k * 0.047, 0); b.rotation.y = k * 0.12 - 0.05; g.add(b); }
      const top = ChaosArt.pizzaBox(true); top.position.set(0, 0.094, 0); top.rotation.y = 0.2; g.add(top);
      const side = ChaosArt.pizzaBox(true); side.position.set(0.4, 0, -0.06); side.rotation.y = -0.08; g.add(side);
      g.position.set(s.x, s.y, s.z); W.scene.add(g); this.boxes = g;
      this.inter = { pos: new THREE.Vector3(s.x + 0.2, 1.0, s.z), label: () => this.st.pizza > 0 && !this.slice ? 'Grab a slice of pizza' : null, act: () => { this.slice = true; SFX.sip(); this.noDouble = true; P.boost = Math.max(P.boost || 0, 45); toast('Pizza power! You walk faster for a while.', 'good'); } };
      W.interact.push(this.inter);
    } else if (!on && this.boxes) {
      W.scene.remove(this.boxes); this.boxes = null;
      const i = W.interact.indexOf(this.inter); if (i >= 0) W.interact.splice(i, 1); this.inter = null;
    }
  },

  /* ----- inflatable boss in the lobby ----- */
  boss(on, d) {
    if (!W.scene) return;
    if (on && !this.bossObj) {
      const b = this.bossObj = ChaosArt.balloonBoss(); b.position.set(BOSS_SPOT.x, 0, BOSS_SPOT.z); b.rotation.y = BOSS_SPOT.ry;
      W.scene.add(b); this.st.boss = true; this.bossT = d && d.quiet ? 9 : 0;
      if (d && !d.quiet) { FXSnd.noise(2.2, 0.08, 0, 900, 2400, 'bandpass', 0.8); toast((d.mine ? 'Your' : this.who(d.by) + '\'s') + ' inflatable boss is up in the lobby. Peek through the front doors.', 'good'); }
    } else if (!on && this.bossObj) { W.scene.remove(this.bossObj); this.bossObj = null; this.st.boss = false; }
  },
  bossAnim(dt, t) {
    const b = this.bossObj; if (!b) return; this.bossT += dt;
    const u = b.userData, inf = Math.min(1, this.bossT / 2.4), e = inf >= 1 ? 1 : 1 - Math.pow(1 - inf, 3) * Math.cos(inf * 9);
    b.scale.set(0.55 + 0.45 * e, Math.max(0.05, e) * (1 + Math.sin(t * 2.1) * 0.012), 0.55 + 0.45 * e);
    b.rotation.z = Math.sin(t * 1.3) * 0.05; b.rotation.x = Math.sin(t * 0.9 + 1) * 0.035;
    u.head.rotation.z = Math.sin(t * 1.7) * 0.08; u.head.rotation.x = Math.sin(t * 1.1) * 0.05;
    u.aL.rotation.z = -2.3 + Math.sin(t * 3.1) * 0.55 + Math.sin(t * 7.3) * 0.12; u.aL.rotation.x = Math.sin(t * 2.3) * 0.3;
    u.aR.rotation.z = 2.3 + Math.sin(t * 2.7 + 2) * 0.55 + Math.sin(t * 6.1) * 0.12; u.aR.rotation.x = Math.sin(t * 1.9 + 1) * 0.3;
  },

  /* ----- gold-plated staplers on owners' desks ----- */
  hasStapler() { return !!(G.prog.shop && G.prog.shop.stapler); },
  myDesk() { return this.hasStapler() ? (P.seated ? P.seat : this.lastDesk) : -1; },
  staplerTick(dt) {
    this.stT += dt; if (this.stT < 0.3 || !W.scene) return; this.stT = 0;
    const want = new Set(), mine = this.myDesk(); if (mine >= 0) want.add(mine);
    if (Net.active) for (const [id, p] of Net.players) if (id !== Net.myId && p.ext && +p.ext.stapler > 0) want.add((+p.ext.stapler | 0) - 1);
    for (const [di, m] of this.staplers) if (!want.has(di)) { W.scene.remove(m); this.staplers.delete(di); }
    for (const di of want) {
      const d = W.desks[di]; if (!d || this.staplers.has(di)) continue;
      const m = ChaosArt.stapler(), c = Math.cos(d.rot), s = Math.sin(d.rot), lx = -0.36, lz = -0.12;
      m.position.set(d.x + c * lx + s * lz, 0.768, d.z - s * lx + c * lz); m.rotation.y = d.rot + 0.4; W.scene.add(m); this.staplers.set(di, m);
    }
    // a little glint now and then
    this.glintT += 0.3;
    if (this.glintT > 1.5 && W.camera) { this.glintT = 0; for (const m of this.staplers.values()) if (m.position.distanceTo(W.camera.position) < 7) FX.particle({ layer: 'add', pos: [m.position.x + rand(-0.06, 0.06), m.position.y + 0.09, m.position.z + rand(-0.04, 0.04)], ttl: 0.6, size: [0.02, 0.1], color: '#fff6c0', alpha: [1, 0], frame: 'star' }); }
  },

  tick(dt, t) {
    this.t += dt;
    if (this.sched.length) { const due = this.sched.filter(s => s.t <= this.t); if (due.length) { this.sched = this.sched.filter(s => s.t > this.t); for (const s of due) { try { s.fn(); } catch (e) { console.error('BonkMart chaos', e); } } } }
    if (this.st.pizza > 0) { this.st.pizza -= dt; if (this.st.pizza <= 0) { this.st.pizza = 0; this.boxesOn(false); } }
    this.bossAnim(dt, t); this.staplerTick(dt);
  },
  reset() { this.sched = []; this.busyUntil = 0; this.st.pizza = 0; this.boxesOn(false); this.boss(false); for (const m of this.staplers.values()) if (W.scene) W.scene.remove(m); this.staplers.clear(); this.lastDesk = -1; }
};
Loop.add((dt, t) => Chaos.tick(dt, t));
Net.on('shop:chaos', (d, from) => { if (d && typeof d.k === 'string') Chaos.run(Object.assign({}, d, { by: typeof d.by === 'string' ? d.by.slice(0, 24) : '' }), false); });
Net.share('chaos', () => ({ b: Chaos.st.boss ? 1 : 0, p: Math.round(Chaos.st.pizza) }), s => {
  if (!s || Net.isHost || Chaos.t - Chaos.localT < 3) return;
  if (s.b && !Chaos.st.boss) Chaos.boss(true, { quiet: true });
  if (s.p > 0 && !Chaos.boxes) { Chaos.st.pizza = s.p; Chaos.boxesOn(true); } else if (!(s.p > 0) && Chaos.boxes) { Chaos.st.pizza = 0; Chaos.boxesOn(false); }
});
Net.addMe('stapler', () => Chaos.myDesk() + 1);
Bus.on('player:sit', i => { Chaos.lastDesk = i; });

/* ----- Physical goods > Chaos ----- */
[
  { id: 'chaos_rival', name: 'Airstrike the Rival Call Centre', price: 2500, color: '#4dabf7', repeatable: true, sort: 400,
    desc: 'One full missile barrage on ' + RIVAL + ' across the street. Their customers start calling us. +' + money(RIVAL_BONUS) + ' for the team.',
    blocked: () => Chaos.busy() ? 'Missiles in the air…' : '', model: () => ChaosArt.missile('RIVAL', '#e03131'), buy() { Chaos.order('rival'); } },
  { id: 'chaos_strike', name: 'Airstrike Yourselves', price: 1500, color: '#ff8c42', repeatable: true, sort: 401,
    desc: 'Orders a full missile barrage on your own office. Team morale may vary. The paperwork will not.',
    blocked: () => Chaos.busy() ? 'Missiles in the air…' : '', model: () => ChaosArt.missile('OOPS', '#f08c00'), buy() { Chaos.order('strike'); } },
  { id: 'chaos_pizza', name: 'Pizza Party', price: 250, color: '#ffd43b', repeatable: true, sort: 402,
    desc: 'Three large pizzas, in lieu of a raise. Everyone walks faster for a bit and there are free slices in the break room.',
    blocked: () => Chaos.st.pizza > 0 ? 'Party in progress' : '', model: () => ChaosArt.pizzaBox(true), buy() { Chaos.order('pizza'); } },
  { id: 'chaos_boss', name: 'Inflatable Boss', price: 800, color: '#9775fa', sort: 403,
    desc: 'A three-metre vinyl boss for the lobby. Waves at visitors, scares the police and never asks for a status report.',
    owned: () => Chaos.st.boss, ownedLabel: 'In the lobby', model: () => ChaosArt.balloonBoss(),
    buy() { bmProg().boss = true; Chaos.localT = Chaos.t; Chaos.boss(true, { by: settings.name, mine: true }); Net.emit('shop:chaos', { k: 'boss', by: settings.name }); } },
  { id: 'chaos_stapler', name: 'Gold-Plated Stapler', price: 1200, color: '#51cf66', sort: 404,
    desc: 'Does exactly what a normal stapler does, but with confidence. Displayed on your desk for the whole floor to envy.',
    owned: () => Chaos.hasStapler(), ownedLabel: 'On your desk', model: () => ChaosArt.stapler(),
    buy() { bmProg().stapler = true; Game.saveProgress(); toast('The Gold-Plated Stapler now sits on your desk. Everyone saw.', 'good'); } }
].forEach(o => Shop.add(Object.assign({ tab: 'goods', section: 'Chaos', icon: 'flame' }, o)));

/* ----- wiring ----- */
Bus.on('boot', () => {
  // licences: Game.unlocked() = the normal list plus licensed schemes (in SCHEMES order)
  const base = Game.unlocked; BonkMart.base = () => base.call(Game);
  Game.unlocked = function () { const b = base.call(this), lic = G.prog && G.prog.licences; return lic ? SCHEMES.filter(s => b.includes(s) || lic[s.id]) : b; };
  // jazz ringtone: callers ring 10 s longer
  if (typeof Call !== 'undefined') { const ring = Call.ring; Call.ring = function (...a) { const r = ring.apply(this, a); if (bmPerk('jazz') && this.state === 'ringing') this.ringLeft += 10; return r; }; }
  bmApplyPerks();
});
Bus.on('game:begin', () => { Chaos.reset(); OS.badge('shop', false); BonkMart.seenWallet = -1; BonkMart.badgeAt = Infinity; });
Bus.on('save:loaded', () => { bmApplyPerks(); BonkMart.calcBadge(); if (bmProg().boss) Chaos.boss(true, { quiet: true }); });
Bus.on('day:start', () => { Chaos.st.pizza = 0; Chaos.boxesOn(false); bmApplyPerks(); });
Bus.on('quit', () => { Chaos.reset(); BM_PC.walk != null && typeof PC !== 'undefined' && (PC.walk = BM_PC.walk, PC.run = BM_PC.run); });
