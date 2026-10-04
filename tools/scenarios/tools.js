/* Tools scenario: Chatterbox (bots, teammate, Gold prank), Doodle Pro (drawing + hung painting), Browser sites, BugBuster.
   Run: xvfb-run -a -s "-screen 0 1920x1080x24" ./node_modules/.bin/electron --no-sandbox --enable-unsafe-swiftshader tools/harness.js tools/scenarios/tools.js 1280x720 <outdir>
   Optional env TOOLS_ONLY=chat,paint,browser,av to run only some parts. */
module.exports = async page => {
  const only = (process.env.TOOLS_ONLY || '').split(',').filter(Boolean), want = k => !only.length || only.includes(k);
  const ok = (cond, msg) => { console.log((cond ? 'OK   ' : 'FAIL ') + msg); if (!cond) page.errors.push('ASSERT ' + msg); };
  await page.startSolo('week');
  await page.eval(() => { const T = window.__tli; T.OS.fastBoot = true; T.G.timeLeft = 230; T.G.personal = 350; T.G.team = 350; T.G.wallet = 500; window.__fc = 0; T.Loop.addRender(() => { window.__fc++; }); return true; });
  // rendering is slow in the harness: finish the sit-down zoom at once and wait for the desktop
  const desk = async seat => {
    await page.eval(d => { const T = window.__tli, free = T.W.desks.filter(x => !x.npc && !T.Game.deskTaken(x.i)); sitAt(d != null ? d : free[0].i); if (T.P.cam) T.P.cam.t = 0.999; return true; }, seat);
    for (let i = 0; i < 150 && !(await page.eval(() => window.__tli.OS.open)); i++) await page.wait(100);
    await page.wait(300);
    await page.eval(() => { const T = window.__tli; if (T.Call.state === 'ringing') T.Call.decline(); T.Call.state = 'idle'; T.Call.wait = 1e9; T.OS.close('memo', true); T.OS.minimise('phone'); return true; });
  };
  const frames = async n => { const f0 = await page.eval(() => window.__fc); for (let i = 0; i < 300 && (await page.eval(() => window.__fc)) < f0 + n; i++) await page.wait(100); };
  await desk();
  await page.wait(300);
  const clean = () => page.eval(() => { const T = window.__tli; [...T.OS.wins.keys()].forEach(id => T.OS.close(id, true)); T.OS.clearPopups(); document.getElementById('os-fx').replaceChildren(); document.querySelectorAll('#toasts .toast').forEach(t => t.remove()); return true; });

  if (want('chat')) {
    const r0 = await page.eval(() => { const T = window.__tli; return { app: !!T.OS.apps.chat, pinned: T.OS.pinned.includes('chat'), contacts: Chat.contacts(), unread: Chat.unreadTotal() }; });
    ok(r0.app && r0.pinned && r0.contacts.length === 5, 'chat app registered, pinned, 5 bot contacts: ' + JSON.stringify(r0));
    await page.eval(() => { Chat.open('bot:mum'); Chat.send('bot:mum', 'Hi mum! Work is going great.'); return true; });
    await page.wait(4200);
    await page.eval(() => { Chat.select('bot:boss'); Chat.send('bot:boss', 'Can I get a raise?'); return true; });
    await page.wait(1500);
    await page.shot('chat-01-boss-typing');
    await page.wait(3000);
    const r1 = await page.eval(() => ({ mum: Chat.threads.get('bot:mum').length, boss: Chat.threads.get('bot:boss').map(m => m.text) }));
    ok(r1.mum >= 2 && r1.boss.length >= 2, 'bots replied: ' + JSON.stringify(r1));
    await page.shot('chat-02-boss');
    // the bank sends a Chatterbox Gold gift; claim it -> pop-up storm + PRANKED
    await page.eval(() => { Chat.receive('bot:bank', 'Congratulations, your account has won a prize! Claim your gift below.'); Chat.receive('bot:bank', null, true); return true; });
    await page.wait(300);
    const badge = await page.eval(() => document.querySelector('#taskbar .tbtn[data-id="chat"] .badge') && document.querySelector('#taskbar .tbtn[data-id="chat"] .badge').textContent);
    ok(+badge >= 2, 'taskbar badge shows the unread messages: ' + badge);
    await page.eval(() => { Chat.select('bot:bank'); return true; });
    await page.wait(400);
    await page.shot('chat-03-gift');
    await page.eval(() => { document.querySelector('.cbx-gift:not(.mine)').click(); return true; });
    await page.wait(750);
    await page.shot('chat-04-pranked');
    await page.wait(1600);
    const r2 = await page.eval(() => ({ pops: window.__tli.OS.popups, sys: Chat.threads.get('bot:bank').filter(m => m.sys).length }));
    ok(r2.pops >= 8 && r2.sys === 1, 'claiming the gift caused a pop-up storm: ' + JSON.stringify(r2));
    await page.eval(() => { window.__tli.OS.clearPopups(); return true; });
    // a teammate (fake remote player through the real Net handler): message, we send Gold, they click it
    await page.eval(() => {
      const T = window.__tli; T.Net.players.set('p2', { name: 'Kim', color: '#e64980', ext: { look: 'c98d63|bun|1d1410|none|round|e64980|39415a|1a1c22|avg' } });
      T.Net.handlers.get('chat')({ k: 'm', id: 'k1', text: 'are you seeing this caller?? he wants to pay in coupons' }, 'p2');
      Chat.select('p2'); Chat.send('p2', 'lol yes. here, have a present'); Chat.gold('p2'); return true;
    });
    await page.wait(800);
    await page.eval(() => { const T = window.__tli, g = Chat.threads.get('p2').find(m => m.gift && m.me); T.Net.handlers.get('chat')({ k: 'claim', id: g.id }, 'p2'); return true; });
    await page.wait(500);
    const r3 = await page.eval(() => Chat.threads.get('p2').map(m => (m.me ? 'me:' : '') + (m.gift ? 'GIFT' + (m.claimed ? '(claimed)' : '') : m.text)));
    ok(r3.some(s => s.includes('GIFT(claimed)')), 'teammate claimed our gift: ' + JSON.stringify(r3));
    await page.shot('chat-05-teammate');
    // closed app: a new message shows a toast and a desktop badge
    await page.eval(() => { const T = window.__tli; T.OS.close('chat', true); Chat.receive('bot:lord', 'Dear friend, you have been selected to inherit my third-best castle.'); return true; });
    await page.wait(400);
    await page.shot('chat-06-toast');
    await page.eval(() => { window.__tli.Net.players.delete('p2'); return true; });
    await clean();
  }

  if (want('paint')) {
    const r0 = await page.eval(() => { const T = window.__tli; return { shop: !!T.Shop.get('app_paint'), avail: T.OS.apps.paint.available(), doodle: !!T.OS.apps.doodle }; });
    ok(r0.shop && !r0.avail && !r0.doodle, 'Doodle Pro is a shop item, locked until bought, old doodle app gone: ' + JSON.stringify(r0));
    await page.eval(() => { const T = window.__tli; T.Shop.get('app_paint').buy(); T.OS.launch('paint', true); return true; });
    await page.wait(300);
    // draw a little sunset scene through the real tools
    await page.eval(() => {
      const D = DoodlePro; D.flood(10, 10, '#74c0fc');
      D.stroke('rect', [[0, 250], [640, 400]], '#2f9e44', 4); D.flood(300, 330, '#69db7c');
      D.state.filled = true; D.stroke('ellipse', [[470, 50], [570, 150]], '#ffd43b', 6); D.state.filled = false;
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; D.stroke('line', [[520 + Math.cos(a) * 62, 100 + Math.sin(a) * 62], [520 + Math.cos(a) * 85, 100 + Math.sin(a) * 85]], '#f59f00', 5); }
      D.state.filled = true; D.stroke('rect', [[120, 190], [290, 320]], '#e8590c', 4); D.state.filled = false; D.stroke('rect', [[120, 190], [290, 320]], '#7a1f12', 5);
      D.stroke('pen', [[105, 195], [205, 110], [305, 195]], '#7a1f12', 9); D.flood(205, 160, '#d6342c');
      D.state.filled = true; D.stroke('rect', [[185, 250], [225, 320]], '#5c3a24', 3); D.stroke('rect', [[240, 220], [275, 250]], '#e7f5ff', 3); D.state.filled = false;
      D.stroke('marker', [[20, 60], [80, 40], [140, 60], [200, 40]], '#ffffff', 14); D.stroke('marker', [[300, 90], [350, 70], [400, 90]], '#ffffff', 12);
      D.stroke('spray', [[380, 330], [400, 320], [420, 335], [440, 325], [460, 330]], '#155e3a', 10);
      D.stroke('pen', [[400, 300], [400, 250]], '#11151f', 5); D.stroke('ellipse', [[385, 220], [415, 250]], '#11151f', 5); D.stroke('pen', [[380, 270], [420, 270]], '#11151f', 5);
      D.stroke('pen', [[400, 300], [385, 330]], '#11151f', 5); D.stroke('pen', [[400, 300], [415, 330]], '#11151f', 5);
      D.undo(); D.redo(); return true;
    });
    await page.wait(300);
    await page.shot('paint-01-drawing');
    const r1 = await page.eval(() => { const T = window.__tli; DoodlePro.hang(); return { seat: T.P.seat, n: Paintings.list.size }; });
    await page.wait(600);
    const r2 = await page.eval(() => { const p = [...Paintings.list.values()][0]; return { n: Paintings.list.size, mesh: !!(p && p.group && p.group.parent), desk: p && p.data.desk }; });
    ok(r2.n === 1 && r2.mesh && r2.desk === r1.seat, 'painting hung on the desk partition: ' + JSON.stringify(r2));
    await page.shot('paint-02-hung-btn');
    await clean();
    // look at it in the office
    await page.stand();
    await page.eval(seat => {
      const T = window.__tli, d = T.W.desks[seat], s = Math.sin(d.rot), c = Math.cos(d.rot);
      const at = (lx, ly, lz) => [d.x + lx * Math.cos(d.rot) + lz * Math.sin(d.rot), ly, d.z - lx * Math.sin(d.rot) + lz * Math.cos(d.rot)];
      T.W.camOverride = { pos: at(-0.25, 1.45, 0.75), look: at(-0.55, 1.15, -0.45) }; return [s, c];
    }, r1.seat);
    await frames(4);
    await page.shot('paint-03-office');
    // a remote player's painting arrives over the network + an easel in front of us
    await page.eval(seat => {
      const T = window.__tli, d = T.W.desks[seat];
      T.W.camOverride = null; T.P.pos.x = d.stand.x; T.P.pos.z = d.stand.z + 0.0; T.P.yaw = d.rot + Math.PI; T.P.pitch = -0.12;
      const img = DoodlePro.jpeg(160, 0.7); Paintings.hang(img, { desk: -1, name: 'Easel Test' });
      T.Net.handlers.get('paint:hang')({ id: 'p2:x', img, name: 'Kim', desk: seat + 1 }, 'p2'); return true;
    }, r1.seat);
    await frames(4);
    const r3 = await page.eval(() => Paintings.list.size);
    ok(r3 === 3, 'easel + remote painting added: ' + r3);
    await page.shot('paint-04-easel');
    await desk(r1.seat);
  }

  if (want('browser')) {
    await page.eval(() => { window.__tli.OS.launch('browser', true); return true; });
    await page.wait(500);
    await page.shot('br-01-search');
    const sites = [['br-02-results', 'how to look busy at work'], ['br-03-news', 'dailybonk.news'], ['br-04-article', 'dailybonk.news/quota'], ['br-05-intranet', 'intranet.totallylegit.inc'],
      ['br-06-video', 'vidbonk.tv/watch?v=cat'], ['br-07-howto', 'howtobonk.legit/look-busy'], ['br-09-404', 'free-money.legit'], ['br-10-newtab', 'bonk://newtab']];
    for (const [name, url] of sites) {
      await page.eval(u => { Browser.go(u); return true; }, url);
      await page.wait(name === 'br-06-video' ? 1800 : 450);
      await page.shot(name);
      if (name === 'br-07-howto') { await page.eval(() => { document.querySelector('.bw-view').scrollTop = 900; return true; }); await page.wait(200); await page.shot('br-08-howto-steps'); }
    }
    await page.eval(() => { Browser.go('vidbonk.tv/watch?v=stapler'); return true; });
    await page.wait(1500);
    await page.shot('br-11-stapler');
    const r = await page.eval(() => { Browser.back(); const a = Browser.current(); Browser.fwd(); return { back: a, fwd: Browser.current(), tabs: Browser.tabs.length }; });
    ok(r.back === 'bonk://newtab' && r.fwd === 'vidbonk.tv/watch?v=stapler', 'back/forward: ' + JSON.stringify(r));
    await clean();
  }

  if (want('av')) {
    const r0 = await page.eval(() => { const T = window.__tli; return { shop: !!T.Shop.get('app_antivirus'), avail: T.OS.apps.antivirus.available() }; });
    ok(r0.shop && !r0.avail, 'BugBuster is a locked shop item: ' + JSON.stringify(r0));
    await page.eval(() => { const T = window.__tli; T.Shop.get('app_antivirus').buy(); T.OS.virus(6); return true; });
    await page.wait(1300);
    await page.eval(() => { window.__tli.OS.launch('antivirus', true); return true; });
    await page.wait(400);
    await page.shot('av-01-risk');
    await page.eval(() => { document.querySelector('.bb-scan').click(); return true; });
    await page.wait(3600);
    await page.shot('av-02-scanning');
    await page.wait(3600);
    await page.shot('av-03-results');
    await page.eval(() => { document.querySelector('.bb-q').click(); return true; });
    await page.wait(700);
    const r1 = await page.eval(() => ({ pops: window.__tli.OS.popups, shield: BugBuster.shielded() }));
    ok(r1.pops === 0 && r1.shield, 'quarantine cleared pop-ups and raised the shield: ' + JSON.stringify(r1));
    await page.shot('av-04-clean');
    await page.eval(() => { window.__tli.OS.virus(5); return true; });
    await page.wait(1800);
    const r2 = await page.eval(() => ({ pops: window.__tli.OS.popups, blocked: BugBuster.blocked }));
    ok(r2.pops === 0 && r2.blocked === 5, 'shield blocked the next storm: ' + JSON.stringify(r2));
    await page.eval(() => { document.querySelector('.bb-scan.small').click(); return true; });
    await page.wait(300);
    await page.shot('av-05-shield');
  }
};
