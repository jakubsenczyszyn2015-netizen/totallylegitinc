/* Phone scenario: caller portraits, the Phone mid-call in each mood, scheme form states (empty, partly verified,
   complete), the NosyViewer connect flow and the Script app.
   Run: xvfb-run -a -s "-screen 0 1920x1080x24" ./node_modules/.bin/electron --no-sandbox --enable-unsafe-swiftshader tools/harness.js tools/scenarios/phone.js 1280x720 <outdir>
   Optional env PHONE_SHOTS=portraits,moods,forms,nosy,script to run only some parts. */
module.exports = async page => {
  const only = (process.env.PHONE_SHOTS || '').split(',').filter(Boolean), want = k => !only.length || only.includes(k);
  const T = 'window.__tli';
  await page.eval(() => { window.__tli.OS.fastBoot = true; return true; });
  await page.startSolo('week');
  await page.eval(() => { const T = window.__tli; T.G.day = 5; T.G.timeLeft = 280; return true; });
  await page.sit();
  // keep the phone quiet unless we ring it ourselves
  const hush = () => page.eval(() => { const T = window.__tli; T.Call.stopRing(); T.Call.state = 'idle'; T.Call.cur = null; T.Call.wait = 1e9; T.OS.reset(); T.OS.show(); T.OS.close('memo', true); return true; });
  await hush(); await page.wait(400);
  const ring = async (type, scheme) => {
    await page.eval((type) => { const T = window.__tli; T.Call.ring(false, type); return true; }, type);
    await page.wait(150);
    await page.eval(() => window.__tli.Call.answer().then(() => true));
    await page.wait(600);
    if (scheme) await page.eval(s => { const T = window.__tli; T.Call.setScheme(s); T.Call.cur.trust = 70; return true; }, scheme);
  };
  // windows tidy: put the phone in the middle, scheme app on the right
  const place = (id, x, y) => page.eval((id, x, y) => { const w = window.__tli.OS.wins.get(id); if (w) { w.el.style.left = x + 'px'; w.el.style.top = y + 'px'; window.__tli.OS.focus(w); } return !!w; }, id, x, y);

  if (want('portraits')) {
    await page.eval(() => {
      const ids = ['granny', 'astro', 'crypto', 'influencer', 'captain', 'cowboy', 'chef', 'gamer', 'tinfoil', 'knitter', 'gym', 'diva', 'scientist', 'regular', 'regular', 'regular'];
      const moods = ['trusting', 'angry', 'neutral', 'trusting', 'wary', 'angry', 'neutral', 'trusting', 'wary', 'neutral', 'trusting', 'neutral', 'angry', 'wary', 'neutral', 'trusting'];
      const g = document.createElement('div'); g.id = 'ptgal';
      g.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#0b0e14;display:grid;grid-template-columns:repeat(8,1fr);gap:8px;padding:10px;font-family:Roboto,sans-serif';
      ids.forEach((id, i) => { const c = makeCaller(4, false, id); const d = document.createElement('div'); d.className = 'ph-panel ph-caller'; d.style.cssText = 'display:flex;flex-direction:column';
        d.innerHTML = '<div class="ph-name" style="font-size:10px;padding:6px 3px">' + c.full.toUpperCase() + '</div><div class="ph-pic" style="height:250px"><div class="pt" style="width:150px;height:150px">' + portraitSVG(c, moods[i], false) + '</div></div><div style="color:#9fb0c8;font-size:11px;text-align:center;padding:4px">' + c.typeLabel + ' · ' + moods[i] + '</div>'; g.append(d); });
      document.body.append(g); return true; });
    await page.wait(1800);
    await page.shot('phone-01-portraits');
    await page.eval(() => { document.getElementById('ptgal').remove(); return true; });
  }

  if (want('moods')) {
    await page.eval(() => { const T = window.__tli; T.Call.ring(false, 'granny'); return true; });
    await page.wait(500);
    await page.shot('phone-02-ringing');
    await page.eval(() => window.__tli.Call.answer().then(() => true));
    await page.wait(600);
    await page.eval(() => { window.__tli.Call.setScheme('card'); return true; });
    await place('sch_card', 846, 10);
    const name = await page.eval(() => window.__tli.Call.cur.caller.first);
    for (const l of ['Hi ' + name + ', my name is Steve from Bonk Pay security, reference 55.', 'I am afraid your card has been compromised by fraud.', 'Don\'t worry, I can secure it right now if we verify it.']) {
      if (await page.eval(() => window.__tli.Call.state) !== 'live') break;
      await page.say(l);
    }
    const res = await page.eval(() => { const c = window.__tli.Call.cur; return { st: window.__tli.Call.state, steps: c.steps, trust: c.trust, lines: c.history.length }; });
    console.log('card call: ' + JSON.stringify(res));
    // each mood + each status line
    const mood = async (trust, extra, name) => {
      await page.eval((trust, extra) => {
        const T = window.__tli, c = T.Call.cur; c.trust = trust; c.waiting = false; c.busy = false; T.STT.active = false; Phone.talkUntil = 0; if (Phone.wave) Phone.wave.still = 0;
        Phone.typing(false); if (extra === 'wait') { c.waiting = c.busy = true; Phone.typing(true); }
        if (extra === 'talk') Phone.talkUntil = performance.now() + 4000;
        if (extra === 'listen') T.STT.active = true;
        T.OS.refresh(); return true; }, trust, extra);
      await page.wait(1500);
      await page.shot(name);
    };
    await mood(12, 'wait', 'phone-03-angry-waiting');
    await mood(36, 'talk', 'phone-04-suspicious-speaking');
    await mood(57, 'listen', 'phone-05-neutral-listening');
    await mood(84, '', 'phone-06-trusting');
    await page.eval(() => { const T = window.__tli; T.STT.active = false; Phone.typing(false); T.Call.cur.busy = T.Call.cur.waiting = false; T.OS.refresh(); return true; });
  }

  if (want('forms')) {
    await hush();
    await ring('astro', 'idv');
    await place('sch_idv', 846, 10);
    await page.wait(300);
    await page.shot('phone-07-form-empty');
    // jump to the form step, verify one field, mistype the other
    const f = await page.eval(() => { const T = window.__tli, c = T.Call.cur; c.steps[0] = c.steps[1] = true; T.OS.refresh();
      const r1 = T.Call.submitForm({ ctz: c.caller.ctz }); const r2 = T.Call.submitForm({ dob: '01/01/1900' }); return { r1, r2, ctz: c.caller.ctz }; });
    console.log('form verify: ' + JSON.stringify(f));
    await page.wait(500);
    await page.shot('phone-08-form-partial');
    await page.eval(() => { const T = window.__tli, c = T.Call.cur; T.Call.submitForm({ dob: c.caller.dob }); return true; });
    await page.wait(2700);
    await page.shot('phone-09-form-complete');
    const fr = await page.eval(() => ({ st: window.__tli.Call.state, res: window.__tli.Call.cur && window.__tli.Call.cur.result }));
    console.log('form result: ' + JSON.stringify(fr));
    // a 3-field form, partly done
    await hush();
    await ring('crypto', 'bonkweb');
    await place('sch_bonkweb', 846, 10);
    await page.eval(() => { const T = window.__tli, c = T.Call.cur; c.steps[0] = c.steps[1] = true; T.Call.submitForm({ user: c.caller.user }); T.OS.refresh();
      const inp = document.querySelector('.win.scheme input[data-f="pass"]'); if (inp) { inp.value = c.caller.pass.slice(0, 5); inp.dispatchEvent(new Event('input')); inp.focus(); } return true; });
    await page.wait(400);
    await page.shot('phone-10-form-bonkweb');
  }

  if (want('nosy')) {
    await hush();
    await ring('tinfoil', 'support');
    await place('sch_support', 846, 10);
    // the offline brain: the remote step should make the caller read out a code
    const br = await page.eval(() => { const T = window.__tli, c = T.Call.cur; c.steps[0] = true; c.trust = 92;
      let r = null; for (let i = 0; i < 6 && !(r && r.steps_done.length); i++) r = offlineReply(c, 'Please open NosyViewer on your computer so I can connect and fix the screen. Thank you, ' + c.caller.first + '!');
      return { r, code: c.caller.nosy, has: r.say.includes(c.caller.nosy) }; });
    console.log('brain remote: ' + JSON.stringify(br));
    await page.eval(() => { const T = window.__tli, c = T.Call.cur; T.Call.apply(c, { say: 'Fine. I opened the viewer thing.', trust_delta: 3, steps_done: [1], hangup: false }); return true; });
    await page.wait(1600);
    await page.eval(() => { const T = window.__tli, c = T.Call.cur, el = document.querySelector('.nv-code'); if (el) { el.value = c.caller.nosy; el.dispatchEvent(new Event('input')); } return !!el; });
    await page.wait(200);
    await page.shot('phone-11-nosy-code');
    await page.eval(() => { const b = document.querySelector('.nv-go'); b && b.click(); return true; });
    await page.wait(500);
    await page.shot('phone-12-nosy-connecting');
    await page.wait(1500);
    const pinIdx = await page.eval(() => window.__tli.Call.cur.caller.files.findIndex(f => /PIN: \d/.test(f.c) && !/NOT/.test(f.n)));
    await page.eval(i => { const b = document.querySelectorAll('.nv-file')[i]; b && b.click(); return true; }, pinIdx);
    await page.wait(300);
    await page.shot('phone-13-nosy-desktop');
    const pr = await page.eval(() => { const T = window.__tli, c = T.Call.cur; T.Call.submitPin(c.caller.pin); return { steps: c.steps, res: c.result }; });
    console.log('pin: ' + JSON.stringify(pr));
    await page.wait(2600);
  }

  if (want('script')) {
    await hush();
    await ring('diva', 'petpass');
    await page.eval(() => { const T = window.__tli, c = T.Call.cur; c.steps[0] = true; c.trust = 40; T.OS.launch('script'); T.OS.refresh(); return true; });
    await place('sch_petpass', 846, 10);
    await place('script', 6, 10);
    await page.wait(400);
    // click a suggested line: it lands in the phone input
    const pasted = await page.eval(() => { const b = document.querySelector('.sc-step.cur .sc-line'); b && b.click(); return Phone.r.inp.value; });
    console.log('script paste: ' + pasted);
    await page.wait(200);
    await page.shot('phone-14-script');
    await page.eval(() => { const t = [...document.querySelectorAll('.sc-tab')].find(x => x.textContent === 'Notes'); t && t.click(); const ta = document.querySelector('.sc-notes'); if (ta) { ta.value = 'Divas love compliments. Never mention the critics.'; ta.dispatchEvent(new Event('input')); } return true; });
    await page.wait(900);
    const saved = await page.eval(() => window.__tli.G.prog.script && window.__tli.G.prog.script.notes);
    console.log('notes saved: ' + saved);
    await page.shot('phone-15-script-notes');
  }
};
