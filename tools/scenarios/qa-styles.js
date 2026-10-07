/* QA: styles that clash between modules and unreadable text. Global classes from style.css (.stamp, .dot, .tips)
   leaked into the review report, Chatterbox, the Phone and the Browser; this checks those spots and runs a
   contrast scan (text colour vs the nearest solid background) over every desktop app.
   Run: xvfb-run -a -s "-screen 0 1920x1080x24" ./node_modules/.bin/electron --no-sandbox --enable-unsafe-swiftshader tools/harness.js tools/scenarios/qa-styles.js 1280x720 <outdir> */
module.exports = async page => {
  const Q = require('./qa-lib')(page);
  await page.eval(() => { const T = window.__tli; T.Saves.week = [null, null, null]; T.Saves.endless = null; writeSaves(); T.OS.fastBoot = true; return true; });
  await page.startSolo('week');
  await Q.sit(); await Q.hush();
  await page.eval(() => { const T = window.__tli; T.OS.close('memo', true); T.G.wallet = 99999; for (const it of Shop.items.values()) if (it.tab === 'apps' && /^app_/.test(it.id) && !it.owned()) it.buy(); T.OS.buildIcons(); return true; });

  // ---------- the spots that clashed ----------
  await page.eval(() => { Browser.go('howtobonk.legit/look-busy'); return true; });
  await page.wait(600);
  const tips = await page.eval(() => { const li = document.querySelector('.ht-box.tips li'); if (!li) return null; li.scrollIntoView(); const c = getComputedStyle(li).color.match(/\d+/g).map(Number); return { color: c, lum: (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255 }; });
  Q.check('Browser HowTo tips are dark text on the pale box', tips && tips.lum < 0.45, tips);
  await Q.shot('styles-01-howto-tips');
  await page.eval(() => { window.__tli.OS.close('browser', true); Chat.open('bot:mum'); return true; });
  await page.wait(500);
  const dot = await page.eval(() => { const d = document.querySelector('.cbx-av .dot'); if (!d) return null; const s = getComputedStyle(d), a = d.parentElement.getBoundingClientRect(), r = d.getBoundingClientRect(); return { mr: s.marginRight, sh: s.boxShadow, right: Math.round(a.right - r.right) }; });
  Q.check('Chatterbox presence dot sits on the avatar corner (no global .dot margin / halo)', dot && dot.mr === '0px' && dot.sh === 'none' && dot.right <= 3, dot);
  await Q.shot('styles-02-chatterbox');
  await page.eval(() => { window.__tli.OS.close('chat', true); return true; });
  const chip = await page.eval(() => { const d = document.querySelector('.ph-chip .dot'); return d && { mr: getComputedStyle(d).marginRight, sh: getComputedStyle(d).boxShadow }; });
  Q.check('Phone hands-free dot has no orange halo', chip && chip.mr === '0px' && chip.sh === 'none', chip);

  // ---------- contrast scan over every desktop app ----------
  const apps = await page.eval(() => Object.keys(window.__tli.OS.apps).filter(id => { const d = window.__tli.OS.apps[id]; return d.desktop && !d.direct && (!d.available || d.available()); }));
  const low = [];
  for (const id of apps) {
    await page.eval(id => { window.__tli.OS.launch(id, true); return true; }, id);
    await page.wait(500);
    const r = await page.eval(id => {
      const rgb = s => { const m = s.match(/[\d.]+/g); if (!m) return [0, 0, 0, 0]; const v = m.map(Number); if (/^color\(srgb/.test(s)) for (let i = 0; i < 3; i++) v[i] *= 255; return v; };   // color-mix() computes to color(srgb 0..1)
      const L = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
      const win = document.querySelector('.win[data-app="' + id + '"] .wb'); if (!win) return [];
      const out = [];
      for (const el of win.querySelectorAll('*')) {
        if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 2)) continue;
        const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
        const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || +cs.opacity < 0.3) continue;
        const fg = rgb(cs.color); if (fg.length > 3 && fg[3] < 0.35) continue;
        let bg = null, img = false;
        for (let p = el; p && p !== document.body; p = p.parentElement) {
          const ps = getComputedStyle(p); if (ps.backgroundImage !== 'none') { img = true; break; }
          const b = rgb(ps.backgroundColor); if (b.length < 4 || b[3] > 0.85) { bg = b; break; }
        }
        if (img || !bg) continue;
        const a = L(fg), b = L(bg), ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        if (ratio < 1.6) out.push(id + ': "' + el.textContent.trim().slice(0, 30) + '" ' + ratio.toFixed(2) + ' ' + cs.color + ' on ' + 'rgb(' + bg.slice(0, 3).join(',') + ')');
      }
      return out;
    }, id);
    low.push(...r);
    await page.eval(id => { if (id !== 'phone') window.__tli.OS.close(id, true); return true; }, id);
  }
  Q.log('apps scanned', apps.length);
  Q.check('no unreadable text (contrast < 1.6) in any desktop app', !low.length, low.slice(0, 20));

  // ---------- the termination report's rubber stamp ----------
  await page.eval(() => { const T = window.__tli; T.G.team = 0; T.G.timeLeft = 0.05; return true; });
  await Q.waitFor(() => window.__tli.G.phase === 'review', 8000, 100);
  await page.eval(() => { Review.seek(60); return true; });
  await Q.waitFor(() => Review.state.sheet === 'fired', 8000, 200);
  await page.wait(1500);   // the stamp lands 0.9 s after the sheet
  const st = await page.eval(() => { const e = document.querySelector('.rv-sheet .stamp'); if (!e) return null; return { w: e.offsetWidth, h: e.offsetHeight }; });   // layout size (the bounding box grows with the rotation / landing scale)
  Q.check('TERMINATED is a small stamp, not a box over the table (global .stamp leaked bottom:.5rem)', st && st.h < 70 && st.w < 300, st);
  await Q.shot('styles-03-termination-stamp');
  await Q.done();
};
