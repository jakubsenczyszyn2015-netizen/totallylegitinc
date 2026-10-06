# Multiplayer: the test rig, what is covered, what was fixed (`app/js/net.js` + every module's `Net.*` use)

Totally Legit Inc. is host-authoritative over PeerJS (WebRTC data channels, plus a voice mesh). The contract is
in `docs/ARCHITECTURE.md` (Net). This page is about checking it with real players: a local rig that runs 2-4 real
game windows against a local PeerJS server, the scenarios that exercise every synced feature, the bugs found
and fixed, and the known limits.

## The rig: `tools/harness-mp.js`

```
xvfb-run -a -s "-screen 0 1920x1080x24" ./node_modules/.bin/electron --no-sandbox --enable-unsafe-swiftshader \
  tools/harness-mp.js tools/scenarios/mp-basic.js [players=2] [1280x720] [outdir]
```
- Starts a local PeerJS server in the Electron main process (`require('peer').PeerServer`, port `9100 + pid % 700`
  or `MP_PEER_PORT` to use one you run yourself), then opens one `BrowserWindow` per player, each with its own
  session partition (`mp-<name>-<pid>`), so storage, settings and saves are separate. Names: Alice (host), Bob,
  Cara, Dev; shirt colours red / green / purple / amber.
- Each window points PeerJS at the local server (`settings.peerHost = '127.0.0.1'`, `peerPort`, `peerPath = '/'`,
  `peerSecure = false`) and uses host ICE candidates only (no STUN: offline DNS lookups slow ICE down).
  A fake microphone (`--use-fake-device-for-media-stream`) lets the voice mesh and the talking indicator run.
- Software WebGL is slow and 2-4 windows share 4 CPUs, so the rig **skips drawing the main canvas** except for the
  few frames before a screenshot (`window.__mpDraw`) and the frame the raid mugshot grabs. Render-to-texture
  passes (webcam, polaroids, CCTV) still run. Game logic and networking keep a decent frame rate.
- Host/join retry up to three times (a busy machine can miss PeerJS's 15 s signalling timeout).
- Exit code 1 on any console error/warning in any window (`PAGE ERRORS`) or any failed check (`CHECKS`).
  Set `MP_LOG=1` to echo every window's console.

Scenario API (a scenario is `module.exports = async mp => { … }`):

| | |
|---|---|
| `mp.pages` | one page per window, `pages[0]` hosts |
| `mp.host(mode, slot)` | page 0 creates a room (`'week'`/`'endless'`), returns the code (`mp.code`) |
| `mp.join(page)` | that page joins and the host has registered it |
| `mp.open(name)` / `mp.close(page)` | open a window late (late join) / destroy one (no goodbye: a crash) |
| `mp.startShift()` | the host starts the shift, waits until every joined page is in the day |
| `mp.waitFor(page, fn, ms, ...args)` | poll `page.eval(fn)` until truthy (throws after `ms`) |
| `mp.check(name, ok, detail)` | an assertion, printed `OK` / `FAIL` |
| `mp.shotAll(name)`, `mp.wait(ms)` | |
| `page.eval/shot/wait/key/sit/stand/teleport/ring/answer/say/id()` | like `tools/harness.js`; `page.errors` can be filtered for expected warnings |

## Scenarios (all pass, `PAGE ERRORS: none`)

| scenario | players | checks | covers |
|---|---|---|---|
| `mp-basic.js` | 3 | 32 | lobby + "waiting for the host", spawn spots apart, day start on every client, quota scaled by team size, remote avatars with their own look + name tag, talking indicator (open mic), voice mesh, position sync, walk animation, sitting, desks taken, desk screens (boot, ring), money: team total + toasts + roster ranks + live Payroll + wall leaderboard, desk race |
| `mp-props.js` | 3 | 36 | paper ball flight + landing spot, punch (right victim, knockback away from the puncher, stars, toast), soda spray stream + soak, fart cloud + cough, whoopee cushion on a chair, box pickup/carry/throw (same landing spot), SnapCam photo (identical image everywhere), Doodle Pro painting, pizza party + inflatable boss + airstrike (same plan), trophy stapler, doors |
| `mp-apps.js` | 3 | 28 | Chatterbox DMs (only the addressee), unread badge, toast, typing indicator, Chatterbox Gold prank (pop-up storm, gloat toast, claimed card), LuckyBonk big-win broadcast, CCTV name tags + "on site" list, AI relay (keyless host, host key learnt from snapshots, relayed `AI.chat` with sanitised roles/lengths, host AI failure falls back to scripted replies), a whole scam on a client with the offline caller brain reaching everyone's team total |
| `mp-review.js` | 3 | 33 | end of day on every client, everyone pulled out of their desk chair into distinct review chairs (remote avatars too), identical review result, Call Analysis quotes from every player, slides + verdict + fire on every client, report: host buttons vs "Waiting for the host", clients cannot restart, Try the day again, Start Tuesday |
| `mp-session.js` | 2 + late | 30 | late join mid-day (day/clock/team, avatars, taken desks, paper balls on the floor, photo picture, painting, pizza, door), quit + reconnect, a client's window dying, joining during a review (lobby, then next day), host quits (clean menu), host's window dying |
| `mp-raid.js` | 2 + late | 25 | client scam heats the host's meter, raid start with the same cops everywhere, door burst, late joiner walks into a raid, a client's hit knocks a cop out, arrest by the host's cop (fine, busted card, cuffs seen by others, teammate toast, mugshot shows only you), release, raid repelled (hazard pay for all, team bonus), late join while cops walk out |
| `mp-guards.js` | 3 | 12 | a misbehaving client sends junk through all 30 message types, a fake raid, absurd positions and huge extras: host + other client keep running, clamp and ignore |

Typical run: 1-3 minutes each. Never run two rigs (or a rig and `tools/harness.js`) at once on a 4-CPU box.

## Bugs found and fixed

| bug | fix (file) |
|---|---|
| Late joiners saw no props on the floor (paper balls, boxes, photos): the welcome's shared state was applied before `Game.begin` cleared the world, and the props version gate then ignored every later snapshot | apply the welcome state after `begin` (`game.js`, `net.js`); a cleared prop world forgets the last version (`props.js`) |
| A crashed client lingered for 30 s+ (frozen avatar, desk taken); after a host crash clients sat in a dead game for 30 s+ | timer-driven watchdog: keep-alives every 1.5 s, peers silent for 12 s are dropped / the host is declared lost (`net.js`) |
| Clients were never told when a teammate joined or left (only the host got toasts) | "X joined" / "X left" toasts from the snapshot roster (`net.js`) |
| A late joiner arriving while cops walked out after a raid got holes in the cop list: `Raid.update` threw every frame | build every cop from the snapshot, hidden if already gone (`raid.js`) |
| Two players booked at the same moment stood inside each other in the mugshot | while you are booked, whoever else stands on the spot is hidden (`raid.js`) |
| Any client could start a police raid / arrest / end it for everyone by sending the host-only message (the host relays) | `Net.fromHost(from)` guard on raid:go/end/arrest/block/spook (`net.js`, `raid.js`) |
| The host's AI key availability was only sent at join: a key added (or removed) later never reached clients | `ai` flag in every snapshot (`net.js`) |
| Untrusted client data kept as-is: Infinity/NaN or huge positions, any colour string, unbounded per-player extras rebroadcast to everyone, unlimited AI relay requests on the host's key, a malformed message could throw in the host's receive handler | host clamps positions/seat/personal, validates colours, keeps only registered `addMe` keys with capped sizes, max 3 AI requests in flight per client, receive handler wrapped (`net.js`) |
| Remote payloads not clamped: `av:act` options (endless loops / durations), thrown prop origin/spin/id, punch knockback direction (fling across the map), whoopee positions, fx positions + option strings, casino toast text | clamps in `avatars.js`, `props.js`, `fx.js`, `apps/casino.js` |
| Two players sitting down at the same desk at the same moment shared it | the higher id stands up with a toast (`game.js`) |
| (earlier, same branch) joiners could spawn inside the host (sorted ids), Payroll did not update live for teammates' earnings, Payroll/leaderboard ignored player colours, the talking indicator flickered off between voice samples | `player.js`, `apps/office.js`, `office.js`, `game.js`, `voice.js` |

## Messages at a glance
Core (net.js, not relayable by clients): `hello`/`welcome`/`full`, `pos` (client → host, ~15/s), `snap` (host → all,
10/s: players, `Game.netState()`, `Net.share` state, `ai`), `phase` (day / review), `evt` (earn toasts), `earn`,
`throw` (legacy paper ball), `ai`/`air` (AI relay), `ka` (keep-alive). Module messages go through `t: 'x'` and
`Net.on/emit` (relayed by the host; `from` is set by the host, so it cannot be spoofed by clients):
`av:act`, `av:stun`, `fx`, `prop:throw`, `prop:take`, `hit`, `bonk`, `soak`, `act`, `npc`, `whoopee`, `whoopee:pop`,
`cam:photo`, `cam:photoReq`, `paint:hang`, `paint:req`, `chat`, `casino:big`, `shop:chaos`, `office:door`,
`review:line`, `raid:*`. Shared state: `props`, `paintings`, `chaos`, `doors`, `raid`. Per-player extras (`addMe`):
`look`, `mood`, `held`, `photo`, `stapler`, `ring`.

Rules of thumb for new synced features: apply locally first, then `Net.emit`; decisions that only the host may take
check `Net.isAuth()` before acting and `Net.fromHost(from)` in the handler; clamp every number and cap every string
from a payload; anything a late joiner must see belongs in `Net.share` (small) or behind a request to the host
(like `cam:photoReq` / `paint:req`); state that `game:begin` clears must be re-applied after it.

## Known limits
- **Matchmaking depends on the public PeerJS server** (`0.peerjs.com`) unless a host is set in Settings
  (PeerJS host / port / path / HTTPS). WebRTC needs STUN to cross NATs; players behind strict/symmetric NATs or
  corporate firewalls may fail to connect (no TURN server of our own).
- Clients' progress (wallet, BonkMart purchases, apps, inventory, `G.prog`) is not saved: saves belong to the host.
- Player names are not made unique: two players called the same share a career record in the review and both rows
  say "you".
- A prop carried by a player who leaves vanishes with them.
- Reconnecting gives you a new peer id: Chatterbox threads and personal earnings for the day start fresh (the team
  total keeps your money).
- The quota is set when the day starts; players joining mid-day do not raise it.
- A bare `null` sent over the data channel throws inside PeerJS's own receive code on the host (one console error,
  the connection survives). Not ours to fix.
- `VERSION` is not checked on join (the room prefix `tli-v1-` is the only protocol guard).
- Not covered by the rig: the PeerJS signalling server dropping mid-game (`peer.reconnect()` path), real packet loss.
