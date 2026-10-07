# QA: playtest report (single player)

The game played end to end in the harness like a player would: real key events (`keydown` / `keyup` on the
window), clicks on the real buttons, typing into the real inputs, and checks on the game state after each step.
Multiplayer has its own rig and report: [multiplayer](multiplayer.md).

## Scenarios (`tools/scenarios/qa-*.js`)

```
timeout 300 xvfb-run -a -s "-screen 0 1920x1080x24" ./node_modules/.bin/electron --no-sandbox \
  --enable-unsafe-swiftshader tools/harness.js tools/scenarios/qa-day.js 1280x720 <outdir>
```
Every scenario ends with `QA SUMMARY: all checks passed` and `PAGE ERRORS: none` (exit code 0), or lists the failed
checks (exit code 1). Times are with software WebGL on a shared 4-CPU box (another builder running at the same time).

| scenario | what it plays | checks | time |
|---|---|---|---|
| `qa-day.js` | Main menu → Singleplayer → Start a week → walk to a desk, E to sit (boot screen) → calls from several archetypes answered on the incoming-call card (full name with nickname): a card scheme, a prize scheme, a scambaiter (BAITED stamp, pop-up storm, money lost, banner in the scheme window), hanging up, declining → the day ends → review (no verdict face before the verdict slide) → pass → evaluation → Tuesday → ID Verifier form scheme → a short day → fired (fire, surprised faces) → termination report → retry → a licence bought in BonkMart → Tech Support with the NosyViewer code read out + the PIN found in the caller's files → pause → main menu (clean) → the time card shows Tuesday | 43 | 3.5 min |
| `qa-week.js` | Friday through the Phone window only (scheme dropdown, Script lines, Enter), an insulted caller hanging up, Space skips the review, the promotion notice, week 2 (bigger quota), Save and quit → time card → Continue | 20 | 2 min |
| `qa-endless.js` | Endless unlocks from the menu, calls by themselves, team total saved at once, unlock toasts + icons, no review, quit → Continue restores total / wallet / inventory / stats / progress, reset total | 12 | 1.5 min |
| `qa-economy.js` | Earn money; every BonkMart tab; hold-to-buy (early release cancels); every catalog item buys for its price and ends owned; upgrades maxed; bought apps get icons; every chaos good; the 9-slot hotbar; every hotbar item used; used-up items saved; perks restored on quit and re-applied on continue | 20 | 3 min |
| `qa-apps.js` | Every desktop app opens, does its main thing and closes; maximise / minimise / restore / drag; every app at once (taskbar fits); show desktop; pop-up storm on screen + BugBuster above it, quarantine, shield; start menu; context menu; Settings app | 58 | 1 min |
| `qa-walk.js` | Walk / sprint / walls / jump / third person; punching and slapping coworkers; paper into a bin (dropped and aimed with the crosshair); pick up / carry / throw / drop a box; coffee (boost + HUD chip), water cooler, snack machine, copier; both doors; the boss office (punch The Boss); the break room; frame times + draw calls | 28 | 3 min |
| `qa-reset.js` | Every app open + a live call; stand up mid-call and sit back; the day ends mid-call with BonkMart, a fire and a tint; quit from the review (nothing left over); a new game starts clean; Esc pause stops the clock; quality low / high / med, FOV, volume, every settings tab fits; the character creator; 1920x1080 ⇄ 1280x720 resize; saves and the look survive a page reload | 18 | 2.5 min |
| `qa-raid.js` | Heat from scams, a raid while seated ("officer incoming" + stand up, hidden behind the solo pause menu), solo pause freezes the raid, an arrest (fine maths, mugshot, release), repelling (hazard pay + team bonus), losing (petty cash), the day ending mid-raid, quitting while busted, a clean new game (door closed) | 21 | 1.5 min |
| `qa-edge.js` | More kinds of items than hotbar slots (scroll on to reach them all); Esc at the desk (pause menu over the windows) and back; three days back to back (no leaked Loop hooks, Bus handlers, cameras, textures, scene objects or DOM); the day ending with a call ringing, the clock-out box and BonkMart open; quitting mid-raid, mid-call, with the webcam on and a chat reply pending → endless starts clean | 16 | 2.5 min |
| `qa-styles.js` | Global menu classes leaking into apps (the review's TERMINATED stamp, Chatterbox presence dots, the Phone hands-free dot, Browser tips) + a contrast scan of every text element in every desktop app | 5 | 30 s |
| `qa-pause.js` | The wall clock follows the shift; a solo pause freezes the world (a box in mid-air, a chaos delivery on its way, the coffee boost, the clock) and the hotbar / heat HUD hide, then everything carries on; speech bubbles are hidden by walls; the rival airstrike is blocked in the last seconds; a "Hold to buy" still held when the shift ends buys nothing | 9 | 3 min |
| `qa-monkey.js` | Monkey test (seeded, `QA_SEED`, `QA_ROUNDS`): every app owned, then rounds of 40 random clicks / typing / selects / canvas drags on the desktop, LuckyBonk bets, BonkMart hold-to-buys, random rings and lines, then standing up, random movement keys, item keys, punches, throws, and sitting back; no page errors, money finite and never negative, the shift still running | 3 per round | 1.5 min (8 rounds, 320 actions) |
| `qa-creator.js` | Character creator preview colours (sRGB like the game), light and dark skin tones | 1 | 15 s |
| `qa-games.js` | LuckyBonk: one round of every game through the real buttons (wallet = start − bets + payouts from `casino:result`); every game closed mid-round (settled once, nothing paid twice, no error when its animation ends); a solo pause mid-crash (the rocket waits); the shift ending mid-round (the round still settles while the desktop is hidden); quitting mid-flip (the save has the settled wallet). Cosmic Cookie bakes with its window closed, not in the menu, and its units survive quit + continue | 24 | 2 min |
| `qa-misc.js` | Walking into The Boss / a seated coworker (you stay 0.75 m out), a burst of 12 toasts (5 on screen), the form scheme's box after a scambaiter, the raid banner under the solo pause menu, the motivational posters bonus of a scam closed in the last second | 7 | 30 s |
| `qa-soak.js` | A long endless session (`QA_SOAK` rounds of 3 calls, random schemes played like a player, stand / sit, police raids re-seat you): DOM size, scene objects, GPU geometries / textures and Loop hooks stay flat, no errors | 6 | 4 min |

`qa-lib.js` holds the shared helpers (`Q.check`, `Q.shot` that waits for fresh frames and freezes the loop on a
finished frame, `Q.gw` waits in game time, `Q.press` real key events, `Q.click`, `Q.play` plays a scheme like a
player: Script lines, form details, NosyViewer codes, PINs; `Q.fast` skips 3D drawing while logic runs).

Also re-run in this wave: `smoke.js` (call reaches "paid", no page errors) and the module scenarios
(`ui clockout props review shop games`), `qa-apps` / `qa-styles` again at 1920x1080. In the final pass every `qa-*`
scenario was run again after the last fixes (all checks passed, no page errors).

## Bugs found and fixed

| # | bug | fix |
|---|---|---|
| 1 | Dead Paperclip Empire state: `G.clips += G.clipBots * dt` every tick | removed from game.js |
| 2 | Faces turned happy / surprised as soon as the review started (gave the verdict away) | review.js emits `review:verdict` when the verdict slide shows; avatars.js reacts to that |
| 3 | Incoming-call card showed `caller.name` | shows `caller.full` (with the nickname) |
| 4 | Scheme window said "No details to enter right now" after a scam was complete / baited until the call ended | shows "Scam complete" / the scambaiter banner as soon as the result is in |
| 5 | Taskbar buttons ran off the taskbar with many windows (unreachable windows) | buttons shrink |
| 6 | Used-up / picked-up items were not saved; quitting mid-day refilled them | saved (debounced on `inv:change`), and quitting mid-day saves first |
| 7 | The phone kept ringing out loud while the solo game was paused | quiet while paused |
| 8 | BugBuster opened under the pop-up storm it is meant to clean | new optional OS app flag `top` |
| 9 | Character creator preview was much darker than the game (linear output) | sRGB + ACES like the game |
| 10 | Pausing a solo game did not pause a police raid (cops kept chasing and arresting) | raid frozen, siren quiet |
| 11 | A cop leaving through the main door could get stuck on the frame forever | exit target inside the doorway |
| 12 | The main door a raid burst open stayed open into the next shift and a new game | doors reset on `game:begin`, main door closed on `day:start` |
| 13 | With a full hotbar, bought / picked-up items were unreachable | 9 slots (keys 1-9), new items move to the front (`Props.toFront`) |
| 14 | In first person thrown things passed ~25 cm right of the crosshair (a paper ball could never land in an aimed-at bin) | `aimDir` converges on the point under the crosshair |
| 15 | With more than 8 kinds of items the extra ones (e.g. the polaroid once you own the raid weapons) could never be selected | scrolling past the last slot rotates the hidden items in; a `+N` chip on the hotbar (`Props.hidden()`) |
| 16 | A Chatterbox reply or boss message still pending when you quit landed in the next game (toast in the menu, stale unread badge); a bot quit mid-reply never answered again | pending chat timers are dropped on quit, bots' busy flags reset |
| 17 | The review's TERMINATED stamp was a huge box over the report table (the menu's global `.stamp` leaked `bottom:.5rem` + an inset shadow) | review.css resets those properties |
| 18 | Chatterbox presence dots and the Phone hands-free dot got the menu's global `.dot` margin and orange halo | tools.css / phone.css reset them |
| 19 | Browser "HowToBonk" tips were near-invisible cream text on a pale green box (global `.tips li` colour) | tools.css sets a dark colour |
| 20 | A solo pause only stopped the clock, calls and raids: particles, physics props, BonkMart chaos goods in flight (an airstrike landed while paused) and the coffee boost kept running | main.js gives `updateWorld` and the Loop `dt = 0` while solo-paused (documented in ARCHITECTURE) |
| 21 | ...after which the hotbar and the raid heat HUD stayed on screen over the pause menu (their visibility throttles count `dt`) | they count `dt \|\| 1/60` |
| 22 | The seated "OFFICER INCOMING / Stand up & run" warning (z 9790) stayed over the solo pause menu and its button stood you up while paused | hidden while solo-paused |
| 23 | Speech bubbles drew through walls (The Boss's lines readable from the hall and the break room) | bubbles are depth-tested (name tags still show through walls on purpose: teammates, cops) |
| 24 | Holding "Hold to buy" in BonkMart while the shift ended completed the purchase during the review | purchases are refused in the review phase |
| 25 | "Airstrike the Rival Call Centre" bought in the last seconds of a shift took $2500 but its +$1000 team bonus landed during the review (lost) | blocked in the last 10 s of a week shift |
| 26 | The CCTV "!" badge a raid left on the desktop carried over into the next game | cleared on `game:begin` |
| 27 | The office wall clock showed the real local time while the LegitOS taskbar runs the shift from 4 PM to midnight | in a work week the wall clock shows the shift time (seconds hand stays real) |
| 28 | The "Scam complete" banner of non-form schemes (Tech Support, ...) sat flush against the window edges | same margins as the baited banner |
| 29 | LuckyBonk: closing the window (or the shift ending / quitting) mid **coin flip** paid the flip twice (`stop()` paid it, then the flip animation's `onfinish` paid again: Web Animations keep running on a removed element); mid **slots** spin it threw `Cannot destructure property 'b' of 'spin'` | the finish handlers ignore a round `stop()` already settled (casino.js) |
| 30 | LuckyBonk rounds kept running under the solo pause menu: a crash rocket popped (bet lost) while you could not reach Cash out | the casino loop gets `dt = 0` while solo-paused |
| 31 | Doodle Pro's spray-can timer (30 ms) ran forever when the window closed while the mouse was down (shift end, quit) | it stops once the canvas is gone |
| 32 | Toasts stacked without limit: buying a batch of BonkMart goods or a burst of unlocks filled the screen and ran off the top at 720p | at most 5 on screen, the oldest fade first (core.js `toast`) |
| 33 | After a scambaiter read out fake details, the form scheme's box said "No details to enter right now." under fields marked Verified | "Fake details from a scambaiter. Nothing earned (n / n "verified")." in red |
| 34 | You could walk right into The Boss (camera inside his head) and into seated coworkers (they are not collider boxes) | the player is kept 0.75 m from them (`pushOut` in player.js) |
| 35 | The motivational posters bonus (+5 %) was paid 0.6 s after a scam, so a scam closed in the last moments of a shift lost it to the review | paid at once (only the toast waits) |
| 36 | The "POLICE RAID!" banner times out in game time, so a solo pause right after a raid started left it hanging over the pause menu | it hides while solo-paused (raid.js `RaidUI.tick`) |
| 37 | The HR welcome-kit toast said "Press 1-6" for items that sit in hotbar slots 2-5 | "Press 2-5" |

Scenario flakes fixed along the way: the endless scenario's first call could be a random scambaiter (never pays);
the solo-screen fade-in needs longer under load; `qa-styles` parsed `color(srgb …)` colours wrongly; `qa-pause` now waits
for the paused hotbar / heat HUD to hide (their throttle counts frames while paused, and software GL under load runs at 1-2 fps).

## Known issues / not fixed

- **Owned by the polish finisher (not edited here):**
  - `app/js/clockout.js` `ClockOut.tick`: the hallway punch clock's dial runs **9:00 → 17:00** over the shift, while the
    LegitOS taskbar clock (`OS.clock`, os.js) and now the wall clock run **4 PM → midnight**. Suggest
    `hr = 16 + 8 * f` (and `G.phase === 'review' ? 24`) in `ClockOut.tick`.
  - `app/css/style.css` defines unscoped `.dot` (lines 62-63), `.stamp` (85, 88, 299) and `.tips li` (174-176) for the
    menus. They leak into every module that uses the same class names (fixed above by local resets in review.css,
    tools.css, phone.css). Scoping them (`#menu .stamp`, `.how .tips li`, `#menu .dot`...) would stop future clashes.
  - `app/js/ui.js` line 18 (`UI_KEYS`, the walking controls panel and How to play): "1-6 / Wheel — Pick item", but the
    hotbar has 9 slots (keys 1-9, see props.md and the hotbar key hint). Should read `'1-9'`.
  - `app/css/style.css` / ui.js main menu at 1280x720: the "Version 0.1 · … work of fiction" line sits flush against the
    BONK NEWS ticker (no gap; it would be covered with a slightly taller menu). A bit more bottom padding on the menu column would fix it.
- Design notes, not changed: a player arrested while seated is released at the front door with 9 s of immunity and is
  re-arrested every ~10 s if they just stand there (a 75 s raid can fine an idle player ~7 times; running away works).
  The mugshot booking officer + backdrop are built on the first arrest and kept hidden for reuse (~40 scene objects, not a leak).
  LuckyBonk windows stay open (hidden) during the review like every other window, so a round in flight settles during the review.
- The hotbar shows at most 9 slots; everything is reachable by scrolling, keys 1-9 only reach the visible ones.
