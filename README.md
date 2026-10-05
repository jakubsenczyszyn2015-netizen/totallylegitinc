# Totally Legit Inc.

A co-op 3D call-center comedy game. Clock in at a cheap office at sunset, sit at your cubicle, boot
LegitOS and take calls from gullible (and occasionally suspicious) callers. Talk them through absurd,
entirely fictional schemes, hit the team quota before The Boss's performance review, and spend your cut
at BonkMart Market on airstrikes, whoopee cushions and cookie-clicker upgrades. Miss the quota and the
review room catches fire. Play alone or with up to 6 friends online.

Everything (the office, the characters, the desktop, the icons, the sounds) is generated in code: three.js
geometry, canvas textures, inline SVG, CSS and Web Audio. There are no art files.

## How to play
1. **Sit at a free desk** (walk up, press **E**). Your LegitOS computer boots.
2. **Answer the phone** when it rings, open a scheme from the desktop and talk the caller through its checklist.
   Type, or use your microphone.
3. **Earn their trust**: be charming and confident, use their name, never be rude. Every step needs enough trust.
   Scambaiters call from day two: if a caller is far too keen, hang up before the last step.
4. **Get paid**: scams pay the team; you keep a cut in your wallet for BonkMart Market.
5. **Beat the quota** before the timer runs out (or **clock out early** at the punch clock in the hallway, from the
   pause menu or the LegitOS start menu; in multiplayer everyone votes and the majority decides). Then The Boss
   reviews you.

Modes: **Work week** (Monday to Friday, three save slots, quota rises each day) and **Endless calls** (no quota,
no review, the total is saved). Between calls: Cosmic Cookie, LuckyBonk Casino, Chatterbox, Doodle Pro, the
Camera / CCTV apps, the Bonk SnapCam and a lot of throwable office supplies.

## Controls
| | |
|---|---|
| W A S D | walk |
| Shift | sprint |
| Space | jump |
| E | interact / pick up / sit |
| Left click | use the held item (hold to spray) |
| F / G | throw / drop |
| Q or right click | punch |
| 1–6, mouse wheel | pick a hotbar item |
| C | third-person camera |
| V | push to talk (multiplayer, if set to push-to-talk) |
| H | show / hide the controls panel |
| Esc | pause |
| F1 / F2 | vote yes / no on a clock-out vote |
| Enter | start the shift (host, in the lobby) |
| F11 | fullscreen (desktop app) |

Click the game to capture the mouse. At the desk the mouse drives the LegitOS desktop; the red power button
(start menu) stands you back up.

## Run it
- From source: `npm install && npm start` (Electron; `npm run vendor` copies three.js, PeerJS and the fonts into `app/vendor`).
- Windows exe: `npm run dist:win` on Windows (portable exe + installer in `dist/`), or download the latest build from
  GitHub **Actions → Build Windows exe → Artifacts**.
- `app/index.html` also runs in a browser if `app/vendor` exists (host the folder; some browsers block pointer lock or
  storage for `file://` pages).

## Multiplayer
One player picks **Multiplayer → Host a room** and shares the 5-letter room code (big and copyable in the lobby
and the pause menu); the others choose **Join a room** and type it. Up to 6 players, friends can join any time.
The host's game is the authority (quota, timer, callers, votes). Voice chat is proximity based. Matchmaking uses
the public PeerJS server, so online play needs internet; you can point it at your own PeerJS server under
**Advanced** on the multiplayer screen.

## AI callers (optional)
Callers work offline with the built-in caller brain. For fully open-ended conversations add an API key in
**Settings → AI callers** (OpenRouter, Groq or any OpenAI-compatible endpoint, including local servers). The key is
stored only on your machine; in multiplayer only the host needs one.

## For developers
- `docs/ARCHITECTURE.md` — load order, module contracts and extension points (`Bus`, `Loop`, `Net`, `Shop`, `Inv`,
  `ItemDefs`, `OS.apps`, `G.prog`), art direction and originality rules. Module APIs are in `docs/modules/`.
- Headless test harness with screenshots: `xvfb-run -a ./node_modules/.bin/electron --no-sandbox
  --enable-unsafe-swiftshader tools/harness.js tools/scenarios/smoke.js 1280x720 tools/out`
  (`tools/scenarios/` has one scenario per module, `perf.js` measures frame time).

Totally Legit Inc. is a work of fiction and a parody. The scams are absurd and fictional; please do not scam anyone.

*Made with AI assistance: the code, the generated art and these docs were written with the help of Claude (Anthropic).*
