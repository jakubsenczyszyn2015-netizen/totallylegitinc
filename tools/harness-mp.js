/* Multiplayer test rig: a local PeerJS server + 2-3 game windows (each with its own storage) that host / join a room.
   Usage (from the repo root, or a git worktree of it):
     xvfb-run -a -s "-screen 0 1920x1080x24" ./node_modules/.bin/electron --no-sandbox --enable-unsafe-swiftshader \
       tools/harness-mp.js tools/scenarios/mp-basic.js [players=2] [1280x720] [outdir]
   A scenario is a Node module:  module.exports = async mp => { const [a, b] = mp.pages; await mp.host(); await mp.join(b); ... }
   mp API:
     mp.pages                       one page per player window (see below); pages[0] is the host
     mp.host(mode, slot)            page 0 creates a room ('week' | 'endless') and returns the room code
     mp.join(page)                  that page joins the room (waits for the welcome)
     mp.open(name)                  open one more player window (late join); returns its page
     mp.close(page)                 close a player's window (the player vanishes without saying goodbye)
     mp.startShift()                the host starts the shift; waits until every joined page is in the day phase
     mp.waitFor(page, fn, ms, ...a) poll page.eval(fn, ...a) until it is truthy (throws after ms)
     mp.check(name, ok, detail)     record an assertion (printed as OK / FAIL, a FAIL makes the run exit with 1)
     mp.shotAll(name)               screenshot every open window: <name>-<player>.png
     mp.wait(ms), mp.port, mp.code
   page API (like tools/harness.js): page.name, page.eval(fn, ...args), page.shot(name), page.wait(ms), page.key(code, ms),
     page.sit(desk), page.stand(), page.teleport(x, z, yaw, pitch), page.ring(baiter), page.answer(), page.say(text),
     page.id() (the player's Net id), page.errors / page.logs
   The process exits with code 1 on uncaught page errors or failed checks. */
const { app, BrowserWindow, session } = require('electron');
const path = require('path'), fs = require('fs');
const root = path.join(__dirname, '..');
const argv = process.argv.filter(a => !a.startsWith('--'));
const args = argv.slice(argv.findIndex(a => /harness-mp\.js$/.test(a)) + 1);
const scenarioPath = path.resolve(args[0] || path.join(__dirname, 'scenarios', 'mp-basic.js'));
const NPL = Math.max(1, Math.min(4, +args[1] || 2));
const [W, H] = (args[2] || '1280x720').split('x').map(Number);
const outDir = path.resolve(args[3] || path.join(root, 'tools', 'out-mp'));
fs.mkdirSync(outDir, { recursive: true });
const NAMES = ['Alice', 'Bob', 'Cara', 'Dev'];
const vendor = path.join(root, 'app', 'vendor');
if (!fs.existsSync(path.join(vendor, 'fonts'))) {
  fs.mkdirSync(vendor, { recursive: true });
  try { fs.cpSync('/home/user/totallylegitinc/app/vendor', vendor, { recursive: true }); } catch (e) {}
}
app.setPath('userData', path.join(require('os').tmpdir(), 'tli-mp-' + process.pid));   // never share a profile with another running instance
app.commandLine.appendSwitch('enable-unsafe-swiftshader');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('disable-features', 'WebRtcHideLocalIpsWithMdns');   // plain host ICE candidates between local windows
app.commandLine.appendSwitch('use-fake-device-for-media-stream');                  // a fake microphone so voice calls run too
app.commandLine.appendSwitch('use-fake-ui-for-media-stream');
app.commandLine.appendSwitch('allow-loopback-in-peer-connection');

const IGN = /GL Driver|GroupMarkerNotSet|Electron Security Warning|fonts\.g|swiftshader|Autoplay/i;
const sleep = ms => new Promise(r => setTimeout(r, ms));
let nOpen = 0;
function makePage(name, mp) {
  const idx = nOpen++, part = 'mp-' + name.toLowerCase() + '-' + process.pid;
  const ses = session.fromPartition(part);
  ses.setPermissionRequestHandler((wc, perm, cb) => cb(true)); ses.setPermissionCheckHandler(() => true);
  const win = new BrowserWindow({ show: true, x: (idx % 2) * 640, y: Math.floor(idx / 2) * 360, width: W, height: H, useContentSize: true, frame: false,
    webPreferences: { backgroundThrottling: false, partition: part } });
  const page = { name, errors: [], logs: [], win, closed: false };
  win.webContents.on('console-message', (e, level, msg, line, src) => {
    const s = '[' + name + '] ' + (level >= 2 ? 'ERROR ' : '') + msg + (src ? '  @' + path.basename(src) + ':' + line : '');
    page.logs.push(s); if (process.env.MP_LOG) console.log(s);
    if (level >= 2 && !IGN.test(msg)) page.errors.push(s);
  });
  win.webContents.on('render-process-gone', (e, d) => { page.errors.push('[' + name + '] RENDERER GONE ' + JSON.stringify(d)); });
  page.eval = async (fn, ...a) => {
    if (page.closed) throw new Error(name + ' is closed');
    const code = typeof fn === 'function' ? '(' + fn.toString() + ')(...' + JSON.stringify(a) + ')' : fn;
    return win.webContents.executeJavaScript('(async () => { try { return await ' + code + '; } catch (e) { console.error("eval failed: " + (e && e.stack || e)); throw e; } })()');
  };
  page.wait = sleep;
  page.shot = async n => {
    await page.eval(() => { window.__mpDraw = 3; return true; });
    for (let i = 0; i < 100 && await page.eval(() => window.__mpDraw > 0); i++) await sleep(60);
    await sleep(80); const img = await win.webContents.capturePage(); const f = path.join(outDir, n.replace(/\.png$/, '') + '.png'); fs.writeFileSync(f, img.toPNG()); console.log('shot: ' + f); return f; };
  page.key = async (code, ms = 300) => { await page.eval(c => { window.__tli.Keys[c] = true; }, code); await sleep(ms); await page.eval(c => { window.__tli.Keys[c] = false; }, code); };
  page.sit = async desk => {
    const i = await page.eval(d => { const T = window.__tli; const free = T.W.desks.filter(x => !x.npc && !T.Game.deskTaken(x.i)); const pick = d != null ? T.W.desks[d] : free[0]; sitAt(pick.i); return pick.i; }, desk);
    await sleep(900); return i;
  };
  page.stand = async () => { await page.eval(() => { standUp(); return true; }); await sleep(300); };
  page.teleport = async (x, z, yaw = 0, pitch = 0) => { await page.eval((x, z, yaw, pitch) => { const P = window.__tli.P; P.pos.x = x; P.pos.z = z; P.yaw = yaw; P.pitch = pitch; return true; }, x, z, yaw, pitch); await sleep(100); };
  page.ring = async baiter => { await page.eval(b => { window.__tli.Call.ring(b); return true; }, !!baiter); await sleep(200); };
  page.answer = async () => { await page.eval(() => window.__tli.Call.answer().then(() => true)); await sleep(700); };
  page.say = async text => { await page.eval(t => window.__tli.Call.say(t).then(() => true), text); await sleep(400); };
  page.id = () => page.eval(() => window.__tli.Net.myId);
  page.ready = (async () => {
    await win.loadFile(path.join(root, 'app', 'index.html'));
    await sleep(800);
    if (!await page.eval(() => !!window.__tli)) throw new Error(name + ': game did not boot');
    await page.eval((nm, port, idx) => {
      const T = window.__tli, S = T.settings;
      S.tts = false; S.quality = 'low'; S.micMode = 'off'; S.name = nm; S.look = null;
      S.peerHost = '127.0.0.1'; S.peerPort = String(port); S.peerPath = '/'; S.peerSecure = false;
      S.color = ['#ef4444', '#22c55e', '#a855f7', '#f59e0b'][idx % 4];
      saveSettings(); if (typeof applyQuality === 'function') applyQuality(); Avatars.refreshMe();
      // no STUN/TURN on the local rig (their DNS lookups fail offline and slow ICE down): host candidates only
      const o = Net.opts; Net.opts = function () { return Object.assign(o.call(Net), { config: { iceServers: [] } }); };
      // software WebGL is slow and 2-3 windows share the CPU: skip drawing the main canvas except right before a screenshot
      // (render-to-texture passes such as webcam / photo shots still run), so the game logic and the network keep a decent frame rate
      const R = W.renderer, draw = R.render.bind(R); window.__mpDraw = 2;
      R.render = (sc, cam) => { if (window.__mpDraw > 0 || R.getRenderTarget()) draw(sc, cam); };
      Loop.add(() => { if (window.__mpDraw > 0) window.__mpDraw--; });
      return true;
    }, name, mp.port, idx);
  })();
  return page;
}

app.whenReady().then(async () => {
  const { PeerServer } = require('peer');
  const port = +process.env.MP_PEER_PORT || 9100 + (process.pid % 700);
  let server = null;
  if (!process.env.MP_PEER_PORT) await new Promise(res => { const ps = PeerServer({ port, host: '127.0.0.1', path: '/', allow_discovery: false }, s => { server = s; res(); }); ps.on('error', e => console.log('peer server error: ' + (e && e.message))); setTimeout(res, 5000); });
  process.on('uncaughtException', e => console.log('MAIN ERROR: ' + (e && e.stack || e)));
  const mp = { pages: [], port, code: '', checks: [], wait: sleep };
  mp.check = (name, ok, detail) => { mp.checks.push({ name, ok: !!ok }); console.log((ok ? 'OK   ' : 'FAIL ') + name + (detail !== undefined ? '  ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : '')); return !!ok; };
  mp.waitFor = async (page, fn, ms = 10000, ...a) => {
    const t0 = Date.now(); let v;
    while (Date.now() - t0 < ms) { try { v = await page.eval(fn, ...a); } catch (e) { v = null; } if (v) return v; await sleep(150); }
    throw new Error(page.name + ': timed out waiting for ' + fn.toString().slice(0, 140));
  };
  mp.open = async name => { const p = makePage(name || NAMES[mp.pages.length] || ('P' + mp.pages.length), mp); mp.pages.push(p); await p.ready; return p; };
  mp.close = async page => { page.closed = true; try { page.win.destroy(); } catch (e) {} await sleep(300); };
  mp.host = async (mode = 'week', slot = 0) => {
    const h = mp.pages[0];
    for (let i = 0; ; i++) {   // a busy machine can miss the 15 s signalling timeout: try again
      try { await h.eval((m, s) => window.__tli.Game.startHost(m, s).then(() => true), mode, slot); break; }
      catch (e) { if (i >= 2) throw e; console.log('host attempt ' + (i + 1) + ' failed: ' + e.message); h.errors.length = 0; }
    }
    mp.code = await h.eval(() => window.__tli.Net.room);
    await h.eval(() => { const dc = document.getElementById('daycard'); if (dc) dc.classList.remove('on'); return true; });
    console.log('room: ' + mp.code + ' (peer server on :' + port + ')');
    return mp.code;
  };
  mp.join = async page => {
    for (let i = 0; ; i++) {
      try { await page.eval(c => window.__tli.Game.joinRoom(c).then(() => true), mp.code); break; }
      catch (e) { if (i >= 2) throw e; console.log(page.name + ' join attempt ' + (i + 1) + ' failed: ' + e.message); page.errors.length = 0; }
    }
    await mp.waitFor(mp.pages[0], id => window.__tli.Net.players.has(id), 8000, await page.id());
    await sleep(300);
  };
  mp.startShift = async () => {
    await mp.pages[0].eval(() => { window.__tli.Game.startShift(); return true; });
    for (const p of mp.pages) if (!p.closed && await p.eval(() => window.__tli.Net.active)) await mp.waitFor(p, () => window.__tli.G.phase === 'day', 8000);
    await sleep(400);
  };
  mp.shotAll = async n => { for (const p of mp.pages) if (!p.closed) await p.shot(n + '-' + p.name.toLowerCase()); };
  let code = 0;
  try {
    for (let i = 0; i < NPL; i++) mp.pages.push(makePage(NAMES[i], mp));
    await Promise.all(mp.pages.map(p => p.ready));
    const scenario = require(scenarioPath);
    await scenario(mp);
  } catch (e) { console.log('SCENARIO FAILED: ' + (e && e.stack || e)); code = 1; }
  const errs = [].concat(...mp.pages.map(p => p.errors));
  if (errs.length) { console.log('PAGE ERRORS (' + errs.length + '):\n  ' + [...new Set(errs)].slice(0, 40).join('\n  ')); code = 1; }
  else console.log('PAGE ERRORS: none');
  const bad = mp.checks.filter(c => !c.ok);
  console.log('CHECKS: ' + (mp.checks.length - bad.length) + '/' + mp.checks.length + ' passed' + (bad.length ? '  FAILED: ' + bad.map(c => c.name).join(', ') : ''));
  if (bad.length) code = 1;
  try { if (server) server.close(); } catch (e) {}
  app.exit(code);
});
