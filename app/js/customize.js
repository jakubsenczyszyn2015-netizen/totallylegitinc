'use strict';
/* CUSTOMIZE — character creator: a live 3D turntable preview (own small WebGLRenderer) and look options.
   Saves to settings.look (and keeps settings.color = shirt colour). Opened from the main menu and the pause menu.
   API: Customize.show(), Customize.close(), Customize.apply(look), Customize.preview (the preview avatar). */
const Customize = {
  el: null, isOpen: false, preview: null, renderer: null, scene: null, camera: null, raf: 0, rotY: Math.PI - 0.4, spin: true, zoom: 0, zoomT: 0, drag: null, look: null, t0: 0, lastAct: 0,

  build() {
    if (this.el) return;
    const O = AV_OPT, sec = (title, body) => h('section', { class: 'cz-sec' }, h('h4', {}, title), body);
    const swatches = (key, list, names) => h('div', { class: 'cz-sw', 'data-k': key }, list.map((c, i) => h('button', { class: 'cz-dot', style: { background: c }, title: names ? names[i] : c, 'data-v': c, onclick: () => this.set(key, c) })));
    const chips = (key, list) => h('div', { class: 'cz-chips', 'data-k': key }, list.map(o => h('button', { class: 'cz-chip', 'data-v': o[0], onclick: () => this.set(key, o[0]) }, o[1])));
    this.nameInp = h('input', { class: 'cz-name', type: 'text', maxLength: 18, placeholder: 'Your name', oninput: e => { settings.name = e.target.value.trim().slice(0, 18) || 'Agent'; saveSettings(); if (this.preview) this.preview.setName(settings.name); } });
    this.canvas = h('canvas', { class: 'cz-gl' });
    const emote = (label, act) => h('button', { class: 'cz-emote', onclick: () => this.preview && this.preview.play(act) }, label);
    const mood = (label, m) => h('button', { class: 'cz-emote', onclick: () => this.preview && this.preview.setMood(m, 3) }, label);
    const stage = h('div', { class: 'cz-stage' },
      h('div', { class: 'cz-note n1' }, 'STAY', h('br'), 'AWAKE'), h('div', { class: 'cz-note n2' }, 'smile!', h('br'), 'you\'re on', h('br'), 'camera'), h('div', { class: 'cz-note n3' }, 'quota', h('br'), '= $$$'),
      this.canvas,
      h('div', { class: 'cz-zoom' }, h('button', { class: 'cz-emote', onclick: () => { this.zoomT = this.zoomT ? 0 : 1; } }, 'Zoom')),
      h('div', { class: 'cz-hint' }, 'Drag to spin'),
      h('div', { class: 'cz-acts' }, emote('Wave', 'wave'), emote('Cheer', 'cheer'), emote('Dance', 'dance'), emote('Facepalm', 'facepalm'), emote('Point', 'point'), emote('Shrug', 'shrug'), emote('Fart', 'fart'),
        h('span', { class: 'cz-sep' }), mood('Happy', 'happy'), mood('Angry', 'angry'), mood('Sad', 'sad'), mood('Shocked', 'surprised')));
    const opts = h('div', { class: 'cz-opts' },
      sec('Name on your badge', this.nameInp),
      sec('Skin tone', swatches('skin', O.skins.map(s => s[1]), O.skins.map(s => s[0]))),
      sec('Hair', chips('hair', O.hairs)),
      sec('Hair colour', swatches('hairColor', O.hairCols)),
      sec('Facial hair', chips('facial', O.facials)),
      sec('Glasses', chips('glasses', O.glasses)),
      sec('Build', chips('build', O.builds)),
      sec('Shirt', swatches('shirt', O.shirts)),
      sec('Trousers', swatches('pants', O.pants)),
      sec('Shoes', swatches('shoes', O.shoes)),
      h('div', { class: 'cz-row' },
        h('button', { class: 'btn small', onclick: () => { this.apply(lookFromSeed((Math.random() * 1e9) | 0)); if (this.preview) this.preview.play(pick(['cheer', 'wave', 'shrug'])); } }, 'Randomise'),
        h('button', { class: 'btn small', onclick: () => this.apply(lookFromSeed(hashStr(settings.name || 'me'))) }, 'From my name')));
    this.el = h('div', { id: 'cz', class: 'cz hidden', onpointerdown: e => { if (e.target === this.el) this.close(); } },
      h('div', { class: 'cz-win', role: 'dialog', 'aria-label': 'Character creator' },
        h('header', { class: 'cz-head' }, h('div', {}, h('h2', {}, 'Character'), h('span', { class: 'cz-sub' }, 'Totally Legit Inc. employee file')),
          h('button', { class: 'btn small primary', onclick: () => this.close() }, 'Done')),
        h('div', { class: 'cz-main' }, stage, opts)));
    document.body.append(this.el);
    // spin by dragging, zoom with the wheel
    this.canvas.addEventListener('pointerdown', e => { this.drag = { x: e.clientX, r: this.rotY }; this.spin = false; try { this.canvas.setPointerCapture(e.pointerId); } catch (_) {} });
    this.canvas.addEventListener('pointermove', e => { if (this.drag) this.rotY = this.drag.r + (e.clientX - this.drag.x) * 0.012; });
    const up = () => { this.drag = null; }; this.canvas.addEventListener('pointerup', up); this.canvas.addEventListener('pointercancel', up);
    this.canvas.addEventListener('wheel', e => { e.preventDefault(); this.zoomT = clamp(this.zoomT + (e.deltaY < 0 ? 0.25 : -0.25), 0, 1); }, { passive: false });
    window.addEventListener('keydown', e => { if (this.isOpen && e.code === 'Escape') { e.stopPropagation(); e.preventDefault(); this.close(); } }, true);
    window.addEventListener('resize', () => { if (this.isOpen) this.resize(); });
  },

  initGL() {
    if (this.renderer) return;
    try { this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true }); } catch (e) { this.renderer = null; return; }
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    const S = this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(26, 1, 0.1, 30);
    S.add(new THREE.HemisphereLight(0xfff1dc, 0x485070, 0.62));
    const key = new THREE.DirectionalLight(0xffdcb0, 0.62); key.position.set(2.5, 4, 3.5); S.add(key);
    const rim = new THREE.DirectionalLight(0x9cc4ff, 0.45); rim.position.set(-3, 2.5, -3); S.add(rim);
    S.add(new THREE.AmbientLight(0xffffff, 0.06));
    // a round patch of checkered office carpet that fades out
    const tex = canvasTex(256, 256, (g, w) => {
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { g.fillStyle = (x + y) % 2 ? '#3b4462' : '#323a55'; g.fillRect(x * w / 8, y * w / 8, w / 8, w / 8); }
      for (let i = 0; i < 1800; i++) { g.fillStyle = 'rgba(' + (Math.random() < 0.5 ? '255,255,255,' : '0,0,0,') + (Math.random() * 0.08) + ')'; g.fillRect(Math.random() * w, Math.random() * w, 2, 2); }
      const gr = g.createRadialGradient(w / 2, w / 2, w * 0.18, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,1)');
      g.globalCompositeOperation = 'destination-out'; g.fillStyle = gr; g.fillRect(0, 0, w, w);
    });
    const floor = new THREE.Mesh(new THREE.CircleGeometry(1.6, 40), new THREE.MeshLambertMaterial({ map: tex, transparent: true, depthWrite: false })); floor.rotation.x = -Math.PI / 2; S.add(floor);
  },
  resize() {
    if (!this.renderer) return;
    const w = this.canvas.clientWidth || 400, hh = this.canvas.clientHeight || 500;
    this.renderer.setSize(w, hh, false); this.camera.aspect = w / hh; this.camera.updateProjectionMatrix();
  },

  show() {
    this.build(); this.initGL();
    this.look = normLook(Avatars.myLook()); this.nameInp.value = settings.name || '';
    this.el.classList.remove('hidden'); this.isOpen = true; releaseLock && releaseLock();
    if (this.renderer) {
      if (!this.preview) { this.preview = buildAvatar({ look: this.look, name: settings.name }); this.scene.add(this.preview.group); }
      else { this.preview.setLook(this.look); this.preview.setName(settings.name); }
      this.resize(); this.t0 = performance.now(); this.spin = true; this.rotY = Math.PI - 0.4; this.preview.group.rotation.y = this.rotY; this.preview.play('wave');
      cancelAnimationFrame(this.raf); this.raf = requestAnimationFrame(() => this.frame());
    }
    this.sync();
  },
  close() {
    if (!this.isOpen) return;
    this.isOpen = false; this.el.classList.add('hidden'); cancelAnimationFrame(this.raf);
    saveSettings(); Avatars.refreshMe(); Bus.emit('look:change', settings.look);
  },
  frame() {
    if (!this.isOpen) return;
    const t = (performance.now() - this.t0) / 1000, av = this.preview;
    if (this.spin) this.rotY = Math.PI + Math.sin(t * 0.35) * 0.7;
    av.group.rotation.y = lerp(av.group.rotation.y, this.rotY, 0.25);
    poseAvatar(av, false, t, 0);
    if (t - this.lastAct > 9 && !av.act) { this.lastAct = t; av.play(pick(['wave', 'nod', 'shrug', 'cheer', 'point'])); }
    this.zoom = lerp(this.zoom, this.zoomT, 0.12);
    const z = this.zoom, cam = this.camera;
    cam.position.set(0, lerp(1.3, 1.56, z), lerp(5.7, 2.4, z)); cam.lookAt(0, lerp(1.08, 1.5, z), 0);
    av.tag.visible = !!settings.name && z < 0.5;
    this.renderer.render(this.scene, cam);
    this.raf = requestAnimationFrame(() => this.frame());
  },

  set(key, v) { const L = Object.assign({}, this.look, { [key]: v }); this.apply(L); if (this.preview && !this.preview.act && Math.random() < 0.5) this.preview.play('nod'); },
  /* apply a look: preview, settings (saved), W.me, option highlights */
  apply(L) {
    this.look = normLook(L); delete this.look.boss;
    settings.look = Object.assign({}, this.look); settings.color = this.look.shirt; saveSettings();
    if (this.preview) this.preview.setLook(this.look);
    Avatars.refreshMe(); this.sync();
  },
  sync() {
    if (!this.el) return;
    $$('[data-k]', this.el).forEach(g => { const k = g.dataset.k; $$('[data-v]', g).forEach(b => b.classList.toggle('on', b.dataset.v === this.look[k])); });
  }
};

/* "Character" buttons on the main menu and the pause menu: inserted before their Settings button (re-checked
   whenever those menus are shown, so a menu that re-renders keeps the button) */
function czButtons() {
  const add = (root, cls, withIcon) => {
    if (!root || $('.' + cls, root)) return;
    const set = $$('button', root).find(b => /settings/i.test(b.textContent));
    const b = h('button', { class: 'btn ' + cls, onclick: () => Customize.show() }, withIcon ? h('span', { class: 'cz-ic', 'aria-hidden': 'true' }) : null, 'Character');
    if (set) set.parentNode.insertBefore(b, set); else { const box = $('.home-btns', root) || $('.body', root); if (box) box.append(b); }
  };
  add($('#menu'), 'cz-open', true); add($('#pause'), 'cz-open-p', false);
}
Bus.on('boot', czButtons);
if (typeof UI !== 'undefined' && UI.menu) { const _menu = UI.menu; UI.menu = function (name) { const r = _menu.apply(this, arguments); if (name === 'home') try { czButtons(); } catch (e) {} return r; }; }
if (typeof Game !== 'undefined' && Game.pause) { const _pause = Game.pause; Game.pause = function (on) { const r = _pause.apply(this, arguments); if (on) try { czButtons(); } catch (e) {} return r; }; }
