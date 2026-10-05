/* Headless test harness: boots the game in Electron, runs a scenario, takes screenshots.
   Usage (from the repo root, or a git worktree of it):
     xvfb-run -a ./node_modules/.bin/electron --no-sandbox --enable-unsafe-swiftshader tools/harness.js tools/scenarios/smoke.js [1600x900] [outdir]
   A scenario is a Node module:  module.exports = async page => { await page.startSolo(); await page.shot('desk'); }
   page API:
     page.eval(fnOrString, ...args)  run code in the game page (a function is serialised; args must be JSON) and return its result
     page.shot(name)                 save a PNG screenshot to <outdir>/<name>.png (default outdir: tools/out)
     page.wait(ms)                   let the game run for a while
     page.key(code, ms)              hold a key (e.g. 'KeyW') for ms milliseconds
     page.startSolo(mode)            start a solo shift ('week' or 'endless') and dismiss the day card
     page.sit(desk)                  sit at a free desk (index into W.desks; default: first free) and open the computer
     page.stand()                    stand up from the desk
     page.teleport(x, z, yaw, pitch) move the player
     page.ring(baiter)               make the phone ring now;  page.answer()  answer it
     page.say(text)                  say something to the caller and wait for the reply
     page.errors / page.logs         console errors / all console lines collected so far
   The process exits with code 1 if the page threw uncaught errors. */
const { app, BrowserWindow } = require('electron');
const path = require('path'), fs = require('fs');
const root = path.join(__dirname, '..');
const argv = process.argv.filter(a => !a.startsWith('--'));
const args = argv.slice(argv.findIndex(a => /harness\.js$/.test(a)) + 1);
const scenarioPath = path.resolve(args[0] || path.join(__dirname, 'scenarios', 'smoke.js'));
const [W, H] = (args[1] || '1600x900').split('x').map(Number);
const outDir = path.resolve(args[2] || path.join(root, 'tools', 'out'));
fs.mkdirSync(outDir, { recursive: true });
// git worktrees have no app/vendor (it is generated): copy it from the main checkout or node_modules
const vendor = path.join(root, 'app', 'vendor');
if (!fs.existsSync(path.join(vendor, 'fonts'))) {
  fs.mkdirSync(vendor, { recursive: true });
  const cands = ['/home/user/totallylegitinc/node_modules'];
  for (const nm of cands) {
    try { fs.cpSync(path.join(path.dirname(nm), 'app', 'vendor'), vendor, { recursive: true }); if (fs.existsSync(path.join(vendor, 'fonts'))) break; } catch (e) {}
  }
}
// a private profile per run, so parallel runs never share saves / settings (localStorage) or lock each other's storage
const profile = path.join(require('os').tmpdir(), 'tli-harness-' + process.pid); app.setPath('userData', profile);
app.commandLine.appendSwitch('enable-unsafe-swiftshader');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: true, x: 0, y: 0, width: W, height: H, useContentSize: true, frame: false, webPreferences: { backgroundThrottling: false } });
  const page = { errors: [], logs: [], win };
  const IGN = /GL Driver|GroupMarkerNotSet|Electron Security Warning|fonts\.g|swiftshader|Autoplay/i;
  win.webContents.on('console-message', (e, level, msg, line, src) => {
    const s = (level >= 2 ? 'ERROR ' : '') + msg + (src ? '  @' + path.basename(src) + ':' + line : '');
    page.logs.push(s); if (level >= 2 && !IGN.test(msg)) page.errors.push(s);
  });
  win.webContents.on('render-process-gone', (e, d) => { page.errors.push('RENDERER GONE ' + JSON.stringify(d)); });
  page.eval = async (fn, ...a) => {
    const code = typeof fn === 'function' ? '(' + fn.toString() + ')(...' + JSON.stringify(a) + ')' : fn;
    return win.webContents.executeJavaScript('(async () => { try { return await ' + code + '; } catch (e) { console.error("eval failed: " + (e && e.stack || e)); throw e; } })()');
  };
  page.wait = ms => new Promise(r => setTimeout(r, ms));
  page.shot = async name => { const img = await win.webContents.capturePage(); const f = path.join(outDir, name.replace(/\.png$/, '') + '.png'); fs.writeFileSync(f, img.toPNG()); console.log('shot: ' + f); return f; };
  page.key = async (code, ms = 300) => { await page.eval(c => { window.__tli.Keys[c] = true; }, code); await page.wait(ms); await page.eval(c => { window.__tli.Keys[c] = false; }, code); };
  page.startSolo = async (mode = 'week') => {
    await page.eval(m => { const T = window.__tli; T.Game.startSolo(m, 2); const dc = document.getElementById('daycard'); if (dc) dc.classList.add('hidden'); return true; }, mode);
    await page.wait(600);
  };
  page.sit = async desk => {
    await page.eval(d => { const T = window.__tli; const free = T.W.desks.filter(x => !x.npc && !T.Game.deskTaken(x.i)); const pick = d != null ? T.W.desks[d] : free[0]; sitAt(pick.i); return pick.i; }, desk);
    await page.wait(900);
  };
  page.stand = async () => { await page.eval(() => { standUp(); return true; }); await page.wait(300); };
  page.teleport = async (x, z, yaw = 0, pitch = 0) => { await page.eval((x, z, yaw, pitch) => { const P = window.__tli.P; P.pos.x = x; P.pos.z = z; P.yaw = yaw; P.pitch = pitch; return true; }, x, z, yaw, pitch); await page.wait(100); };
  page.ring = async baiter => { await page.eval(b => { window.__tli.Call.ring(b); return true; }, !!baiter); await page.wait(200); };
  page.answer = async () => { await page.eval(() => window.__tli.Call.answer().then(() => true)); await page.wait(700); };
  page.say = async text => { await page.eval(t => window.__tli.Call.say(t).then(() => true), text); await page.wait(400); };
  let code = 0;
  try {
    await win.loadFile(path.join(root, 'app', 'index.html'));
    await page.wait(800);
    const ok = await page.eval(() => !!window.__tli);
    if (!ok) throw new Error('game did not boot (window.__tli missing)');
    // tests should not be stopped by speech synthesis or the end-of-day timer unless they want to be
    await page.eval(() => { const T = window.__tli; T.settings.tts = false; return true; });
    const scenario = require(scenarioPath);
    await scenario(page);
  } catch (e) { console.log('SCENARIO FAILED: ' + (e && e.stack || e)); code = 1; }
  if (page.errors.length) { console.log('PAGE ERRORS (' + page.errors.length + '):\n  ' + [...new Set(page.errors)].slice(0, 30).join('\n  ')); code = 1; }
  else console.log('PAGE ERRORS: none');
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) {}
  app.exit(code);
});
