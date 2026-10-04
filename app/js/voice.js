'use strict';
/* =====================================================================
   VOICE — microphone + proximity playback of teammates
   ===================================================================== */
const Voice = {
  stream: null, real: false, nodes: new Map(), analyser: null, buf: null, talking: false, ptt: false,

  /* connect with a silent track straight away so you can hear the team, then swap in the real mic once the browser allows it */
  start() {
    this.silent();
    if (settings.micMode !== 'off' && !this.real) this.getMic(true).then(s => { if (!s && Net.active) toast('No microphone access. You can still hear your team.', 'bad'); });
  },
  getMic(force) {
    if (this.stream && (this.real || !force)) return Promise.resolve(this.stream);
    if (settings.micMode === 'off' && !force) return Promise.resolve(this.silent());
    if (!this._pending) this._pending = (async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('unsupported');
        const s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
        const had = this.stream; this.setStream(s, true); if (had) Net.swapTrack(s);
        return s;
      } catch (e) { return null; } finally { this._pending = null; }
    })();
    return this._pending.then(s => s || (force ? null : this.silent()));
  },
  silent() { if (this.stream) return this.stream; AudioSys.init(); const d = AudioSys.ctx.createMediaStreamDestination(); this.setStream(d.stream, false); return d.stream; },
  setStream(s, real) {
    this.stream = s; this.real = real; AudioSys.init();
    if (real && AudioSys.ctx) { try { const src = AudioSys.ctx.createMediaStreamSource(s); this.analyser = AudioSys.ctx.createAnalyser(); this.analyser.fftSize = 512; src.connect(this.analyser); this.buf = new Uint8Array(this.analyser.fftSize); } catch (e) { this.analyser = null; } }
    this.applyMode();
  },
  applyMode() {
    if (!this.stream) return;
    const on = this.real && (settings.micMode === 'open' || (settings.micMode === 'ptt' && this.ptt));
    this.stream.getAudioTracks().forEach(t => { t.enabled = on; });
  },
  attach(id, stream) {
    this.detach(id); AudioSys.init(); const ctx = AudioSys.ctx; if (!ctx) return;
    const el = new Audio(); el.srcObject = stream; el.muted = true; const pr = el.play(); if (pr && pr.catch) pr.catch(() => {});   // Chrome needs the stream attached to an element
    const src = ctx.createMediaStreamSource(stream), pan = ctx.createPanner();
    pan.panningModel = 'HRTF'; pan.distanceModel = 'linear'; pan.refDistance = 2; pan.maxDistance = 17; pan.rolloffFactor = 1;
    src.connect(pan); pan.connect(AudioSys.voice); this.nodes.set(id, { el, src, pan, stream });
  },
  detach(id) { const n = this.nodes.get(id); if (!n) return; try { n.src.disconnect(); n.pan.disconnect(); n.el.srcObject = null; } catch (e) {} this.nodes.delete(id); },
  detachAll() { for (const id of [...this.nodes.keys()]) this.detach(id); },
  update() {
    const ctx = AudioSys.ctx; if (!ctx) return;
    if (this.nodes.size) {
      const c = W.camera, L = ctx.listener, yaw = c.rotation.y, pitch = c.rotation.x;
      const fx = -Math.sin(yaw) * Math.cos(pitch), fy = Math.sin(pitch), fz = -Math.cos(yaw) * Math.cos(pitch);
      if (L.positionX) { L.positionX.value = c.position.x; L.positionY.value = c.position.y; L.positionZ.value = c.position.z; L.forwardX.value = fx; L.forwardY.value = fy; L.forwardZ.value = fz; L.upX.value = 0; L.upY.value = 1; L.upZ.value = 0; }
      else { L.setPosition(c.position.x, c.position.y, c.position.z); L.setOrientation(fx, fy, fz, 0, 1, 0); }
      for (const [id, n] of this.nodes) {
        const a = W.avatars.get(id); if (!a) continue; const p = a.av.group.position;
        if (n.pan.positionX) { n.pan.positionX.value = p.x; n.pan.positionY.value = 1.6; n.pan.positionZ.value = p.z; } else n.pan.setPosition(p.x, 1.6, p.z);
      }
    }
    if (this.analyser && this.real) {
      this.analyser.getByteTimeDomainData(this.buf); let m = 0;
      for (let i = 0; i < this.buf.length; i += 4) m = Math.max(m, Math.abs(this.buf[i] - 128));
      const tr = this.stream.getAudioTracks()[0]; this.talking = !!(tr && tr.enabled) && m > 9;
    } else this.talking = false;
  }
};
