/* Multiplayer apps: Chatterbox DMs between players (only the addressee gets them), typing indicator, the Chatterbox Gold
   prank (pop-up storm for the victim, gloating toast for the sender), the LuckyBonk casino big-win broadcast, CCTV name
   tags + "on site" list for remote players, and the AI relay code paths (client without a key uses the host's key).
   Run: tools/harness-mp.js tools/scenarios/mp-apps.js 3 1280x720 <outdir>   (2 players works too) */
module.exports = async mp => {
  const [A, B] = mp.pages, C = mp.pages[2], all = mp.pages;
  await mp.host('week', 0); await mp.join(B); if (C) await mp.join(C);
  await mp.startShift();
  const ids = {}; for (const p of all) ids[p.name] = await p.id();
  for (const p of all) await p.eval(() => { window.__toasts = []; const o = toast; toast = (m, k) => { window.__toasts.push(typeof m === 'string' ? m : m.textContent); return o(m, k); }; return true; });
  const toasts = p => p.eval(() => window.__toasts.splice(0));
  const deskA = await A.sit(), deskB = await B.sit();
  if (C) await C.sit();
  await mp.wait(600);

  // ---- Chatterbox: Alice DMs Bob, Bob answers; Cara gets nothing
  await A.eval(id => { Chat.open(id); return true; }, ids.Bob);
  await mp.wait(300);
  mp.check('Alice lists Bob as an online contact', await A.eval(id => Chat.contacts().includes(id), ids.Bob));
  await A.eval(() => { const w = OS.wins.get('chat'); w.ui.inp.value = 'psst, the boss is asleep'; w.ui.inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })); return true; });
  await mp.wait(800);
  const thB = await B.eval(id => (Chat.threads.get(id) || []).map(m => m.text), ids.Alice);
  mp.check('Bob received Alice\'s DM', thB.includes('psst, the boss is asleep'), thB);
  mp.check('Bob has an unread badge for Alice', (await B.eval(id => Chat.unread.get(id), ids.Alice)) === 1);
  mp.check('Bob got a Chatterbox toast', (await toasts(B)).some(t => /Alice/.test(t) && /boss is asleep/.test(t)));
  if (C) mp.check('Cara did not get the DM', (await C.eval(id => (Chat.threads.get(id) || []).length, ids.Alice)) === 0);
  await B.eval(id => { Chat.open(id); return true; }, ids.Alice);
  await mp.wait(400);
  mp.check('Bob\'s unread badge cleared after reading', !(await B.eval(id => Chat.unread.get(id), ids.Alice)));
  await A.eval(() => { const w = OS.wins.get('chat'); w.ui.inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' })); return true; });
  await mp.wait(700);
  mp.check('Bob sees Alice typing', await B.eval(() => !!document.querySelector('.cbxwin .cbx-m.typing')));
  await B.eval(id => { Chat.send(id, 'nice. pass me a jet ski lead'); return true; }, ids.Alice);
  await mp.wait(800);
  mp.check('Alice received Bob\'s answer', (await A.eval(id => (Chat.threads.get(id) || []).map(m => m.text), ids.Bob)).includes('nice. pass me a jet ski lead'));
  await A.shot('a01-alice-chatterbox');

  // ---- Chatterbox Gold: Alice pranks Bob, Bob clicks the gift
  await A.eval(id => { Chat.gold(id); return true; }, ids.Bob);
  await mp.wait(800);
  const gift = await B.eval(id => { const m = (Chat.threads.get(id) || []).filter(x => x.gift && !x.me).pop(); return m && { id: m.id, claimed: !!m.claimed }; }, ids.Alice);
  mp.check('Bob received the Chatterbox Gold gift card', gift && !gift.claimed, gift);
  const pop0 = await B.eval(() => OS.popups || 0);
  await B.eval((id, g) => { Chat.claim(id, g); return true; }, ids.Alice, gift && gift.id);
  await mp.wait(1200);
  mp.check('Bob\'s screen fills with pop-ups', (await B.eval(() => OS.popups || 0)) > pop0, await B.eval(() => OS.popups));
  mp.check('Alice told Bob fell for it', (await toasts(A)).some(t => /fell for your free gift/.test(t)));
  mp.check('Alice\'s gift card shows as claimed', await A.eval(id => (Chat.threads.get(id) || []).some(m => m.gift && m.me && m.claimed), ids.Bob));
  await B.shot('a02-bob-pranked');
  await B.eval(() => { OS.clearPopups && OS.clearPopups(); return true; });

  // ---- LuckyBonk: Bob hits a mega win, everyone hears about it
  await B.eval(() => { (G.prog.apps = G.prog.apps || {}).casino = true; G.wallet = 500; const w = Casino.open('slots'); w.casino.ctx.pay(50, 12, 'Jackpot'); return true; }).catch(e => mp.check('casino opened on Bob', false, e.message));
  await mp.wait(800);
  mp.check('host toast: Bob won big on LuckyBonk', (await toasts(A)).some(t => /Bob just won \$600 on LuckyBonk/.test(t)));
  if (C) mp.check('Cara toast: Bob won big on LuckyBonk', (await toasts(C)).some(t => /Bob just won/.test(t)));
  await B.eval(() => { OS.close('casino', true); return true; }).catch(() => {});

  // ---- CCTV: Alice sees remote players tagged with their names, and where they are
  if (C) { await C.stand(); await C.teleport(17.5, 0.4, -Math.PI / 2, 0); }
  await A.eval(() => { (G.prog.apps = G.prog.apps || {}).cctv = true; OS.buildIcons(); OS.launch('cctv'); return true; });
  await mp.wait(1500);
  const ppl = await A.eval(() => Cams.people().filter(p => p.kind === 'player').map(p => p.text));
  mp.check('CCTV labels the remote players by name', ppl.includes('Bob') && (!C || ppl.includes('Cara')), ppl);
  const who = await A.eval(() => [...document.querySelectorAll('.cc-who')].map(e => e.textContent));
  mp.check('CCTV "on site" lists Bob at his desk', who.some(t => t === 'BobDesk ' + (deskB + 1)), who);
  if (C) mp.check('CCTV "on site" lists Cara by room', who.some(t => /^Cara/.test(t) && !/Somewhere/.test(t)), who);
  if (C) { await C.teleport(-2.5, 0.2, Math.PI / 2, 0); }   // Cara walks onto the call floor, in view of CAM 01
  await A.eval(() => { CCTV.sel = 'floor'; CCTV.setMode('one'); Call.wait = 999; if (Call.state === 'ringing') Call.decline(); Call.wait = 999; return true; });
  await mp.wait(1500);
  await A.shot('a03-alice-cctv');

  // ---- AI relay: the host has no key -> clients use the offline caller brain, and asking the host fails cleanly
  mp.check('client without a key and a keyless host: AI not available (offline brain)', (await B.eval(() => AI.available())) === false);
  const noKey = await B.eval(() => Net.askHostAI([{ role: 'user', content: 'hi' }]).then(t => 'ok:' + t, e => 'err:' + e.message));
  mp.check('relay to a keyless host answers with an error, no throw', /^err:.*no AI key/.test(noKey), noKey);
  // the host gets a key (stubbed, no real API call): a client's AI.chat goes through the host
  await A.eval(() => { window.__raw = AI.raw; window.__key = [settings.provider, settings.apiKey]; settings.provider = 'groq'; settings.apiKey = 'test-key'; AI.raw = async msgs => 'HOST AI says hi (' + msgs.length + ' msgs, ' + msgs[0].role + ')'; return AI.hasKey(); });
  await mp.waitFor(B, () => Net.hostAI, 3000).catch(() => {});
  mp.check('client learns that the host now has a key (snapshots)', await B.eval(() => Net.hostAI));
  mp.check('client with a keyed host: AI available', await B.eval(() => AI.available()));
  const relayed = await B.eval(() => AI.chat([{ role: 'evil', content: 'x'.repeat(9000) }, { role: 'user', content: 'hello' }]).then(t => t, e => 'err:' + e.message));
  mp.check('client AI.chat answered through the host relay (roles + lengths sanitised)', relayed === 'HOST AI says hi (2 msgs, user)', relayed);
  // a real call on Bob with the relay on: the host's (stubbed) AI fails -> scripted replies, no page error
  await A.eval(() => { AI.raw = async () => { throw new Error('quota exceeded'); }; return true; });
  await B.eval(() => { settings.lang = 'en-US'; return true; });
  await B.ring(false); await B.answer();
  await B.say('Hello, this is Steve from the prize office. You won a jet ski!');
  const callSt = await B.eval(() => ({ st: Call.state, n: Call.cur ? Call.cur.history.length : 0 }));
  mp.check('Bob\'s call keeps going on scripted replies when the host AI fails', callSt.st === 'live' && callSt.n >= 2, callSt);
  await B.eval(() => { Call.hangup(); return true; });
  B.errors = B.errors.filter(e => !/AI caller error/.test(e));   // the expected console.warn from Call.aiFail
  await A.eval(() => { AI.raw = window.__raw; settings.provider = window.__key[0]; settings.apiKey = window.__key[1]; return true; });
  await mp.waitFor(B, () => !Net.hostAI, 3000).catch(() => {});
  mp.check('client learns that the host dropped the key', !(await B.eval(() => Net.hostAI)));
};
