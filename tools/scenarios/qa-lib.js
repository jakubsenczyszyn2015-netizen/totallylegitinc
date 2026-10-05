/* Shared helpers for the QA scenarios (tools/scenarios/qa-*.js). Not a scenario itself.
   const Q = require('./qa-lib')(page);  Q.check('name', cond, info); ... await Q.done();
   done() prints a summary and throws if a check failed, so the harness exits with code 1. */
module.exports = page => {
  const fails = [], t0 = Date.now();
  const Q = {
    fails,
    check(name, ok, info) {
      console.log((ok ? 'ok   ' : 'FAIL ') + name + (info !== undefined ? '  ' + (typeof info === 'string' ? info : JSON.stringify(info)) : ''));
      if (!ok) fails.push(name); return !!ok;
    },
    /* screenshot after two fresh frames (software GL under load can lag a second behind the game state) */
    async shot(name) { await page.eval(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(() => r(true), 50))))); return page.shot(name); },
    log(...a) { console.log('     ' + a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' ')); },
    /* real key events (the game's keydown/keyup listeners), not just the Keys map */
    async press(code, ms = 80, target) {
      await page.eval((c, tg) => { const el = tg ? document.querySelector(tg) : window; (el || window).dispatchEvent(new KeyboardEvent('keydown', { code: c, key: c === 'Escape' ? 'Escape' : c === 'Enter' ? 'Enter' : c.replace(/^Key|^Digit/, '').toLowerCase(), bubbles: true })); return true; }, code, target || null);
      await page.wait(ms);
      await page.eval(c => { window.dispatchEvent(new KeyboardEvent('keyup', { code: c, bubbles: true })); return true; }, code);
    },
    /* click the first element matching sel (optionally whose text matches re) */
    async click(sel, re, wait = 250) {
      const ok = await page.eval((s, r) => { const els = [...document.querySelectorAll(s)].filter(e => !r || new RegExp(r, 'i').test(e.textContent)); const e = els[0]; if (!e) return false;
        if (e.dispatchEvent) { e.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true })); e.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); e.dispatchEvent(new MouseEvent('mouseup', { bubbles: true })); } e.click(); return true; }, sel, re ? re.source || re : null);
      if (wait) await page.wait(wait);
      return ok;
    },
    async visible(sel) { return page.eval(s => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05; }, sel); },
    /* elements matching sel that stick out of the viewport */
    async offscreen(sel) { return page.eval(s => [...document.querySelectorAll(s)].filter(e => { const r = e.getBoundingClientRect(); return r.width && (r.right > innerWidth + 2 || r.bottom > innerHeight + 2 || r.left < -2 || r.top < -2); }).map(e => (e.id || e.className || e.tagName) + ' ' + Math.round(e.getBoundingClientRect().right) + 'x' + Math.round(e.getBoundingClientRect().bottom)), sel); },
    /* a quiet desk: no automatic rings, every window closed except what you open */
    async hush() { return page.eval(() => { const T = window.__tli; T.Call.stopRing(); T.Call.state = 'idle'; T.Call.cur = null; T.Call.wait = 1e9; return true; }); },
    /* ring a caller archetype and answer through the incoming-call card */
    async ringAnswer(type, baiter) {
      await page.eval((ty, b) => { const T = window.__tli; T.Call.ring(!!b, ty || undefined); T.Call.ringLeft = 60; return true; }, type || null, !!baiter);
      await page.wait(500);
      const card = await page.eval(() => { const c = document.querySelector('#os-modal .ringcard .nm'); return c ? c.textContent : null; });
      await Q.click('#os-modal .ringcard .rb.yes', null, 900);
      return card;
    },
    state() { return page.eval(() => { const T = window.__tli, c = T.Call.cur; return { st: T.Call.state, res: c && c.result, steps: c && c.steps, trust: c && c.trust, turns: c && c.turns }; }); },
    /* play the running scheme like a player: say the Script lines for the current step, type form details and
       NosyViewer codes / PINs through the UI. Returns the final call state. */
    async play(maxTurns = 18) {
      let turns = 0;
      while (turns < maxTurns) {
        const s = await page.eval(() => {
          const T = window.__tli, c = T.Call.cur; if (!c || T.Call.state !== 'live') return { st: T.Call.state };
          const i = c.steps.indexOf(false); if (i < 0) return { st: 'done' };
          const st = c.scheme.steps[i]; return { st: 'live', i, busy: c.busy, form: st.form ? st.form.map(f => f.f) : null, pin: !!st.pin && !st.form, remote: !!st.remote, code: c.codeGiven, line: (st.lines || ['Okay.'])[c.turns % (st.lines || ['x']).length].replace(/\{first\}/g, c.caller.first).replace(/\{agent\}/g, T.settings.name).replace(/\{pet\}/g, c.caller.pet.name) };
        });
        if (s.st !== 'live') return Q.state();
        if (s.busy) { await page.wait(400); continue; }
        if (s.form) {
          // ask for the details, then type what they read out into the scheme window
          await page.say(s.line); turns++;
          await page.eval(fs => { const T = window.__tli, c = T.Call.cur; if (!c) return; for (const f of fs) { const inp = document.querySelector('.win.scheme input[data-f="' + f + '"]'); if (!inp || inp.disabled) continue; inp.value = c.caller[f]; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = inp.parentElement.querySelector('.sx-btn'); if (b && !b.disabled) b.click(); } return true; }, s.form);
          await page.wait(500); continue;
        }
        if (s.remote && s.code) {
          await page.eval(() => { const T = window.__tli, c = T.Call.cur; T.OS.launch('nosy', true); const el = document.querySelector('.nv-code'); if (el) { el.value = c.caller.nosy; el.dispatchEvent(new Event('input', { bubbles: true })); } const b = document.querySelector('.nv-go'); if (b) b.click(); return true; });
          await page.wait(1800); continue;
        }
        if (s.pin) {
          // find the PIN in the caller's files (NosyViewer), then type it into the scheme window
          await page.eval(() => { const T = window.__tli, c = T.Call.cur; T.OS.launch('nosy', true); const i = c.caller.files.findIndex(f => /PIN: \d/.test(f.c) && !/NOT/.test(f.n)); const b = document.querySelectorAll('.nv-file')[i]; if (b) b.click(); return true; });
          await page.wait(400);
          await page.eval(() => { const T = window.__tli, c = T.Call.cur; T.OS.launch('sch_' + c.scheme.id, true); const st = c.scheme.steps[c.steps.indexOf(false)]; const inp = document.querySelector('.win.scheme input[data-f="pin"]'); if (inp) { inp.value = c.caller[st.field || 'pin']; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = inp.parentElement.querySelector('.sx-btn'); if (b) b.click(); } return true; });
          await page.wait(500); continue;
        }
        await page.say(s.line); turns++;
      }
      return Q.state();
    },
    /* after sitting: wait for the camera move, the desktop and the end of the boot screen */
    async desktop(ms = 15000) { return Q.waitFor(() => window.__tli.OS.open && document.querySelector('#os-boot').classList.contains('hidden'), ms, 250); },
    async sit(desk) { await page.sit(desk); return Q.desktop(); },
    async waitFor(fn, ms = 6000, step = 250, ...args) {
      const end = Date.now() + ms; let v;
      while (Date.now() < end) { v = await page.eval(fn, ...args); if (v) return v; await page.wait(step); }
      return v;
    },
    async done() {
      console.log('QA SUMMARY: ' + (fails.length ? fails.length + ' failed: ' + fails.join(', ') : 'all checks passed') + ' (' + Math.round((Date.now() - t0) / 1000) + ' s)');
      if (fails.length) throw new Error(fails.length + ' QA checks failed');
    }
  };
  return Q;
};
