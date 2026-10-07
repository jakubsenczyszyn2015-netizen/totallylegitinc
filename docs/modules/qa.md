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
checks (exit code 1). Times are with software WebGL on a shared 4-CPU box.

| scenario | what it plays | checks | time |
|---|---|---|---|
| `qa-day.js` | Main menu → Singleplayer → Start a week → walk to a desk, E to sit (boot screen) → calls from several archetypes answered on the incoming-call card (full name with nickname): a card scheme, a prize scheme, a scambaiter (BAITED stamp, pop-up storm, money lost, banner in the scheme window), hanging up, declining → the day ends → review (no verdict face before the verdict slide) → pass → evaluation → Tuesday → ID Verifier form scheme → a short day → fired (fire, surprised faces) → termination report → retry → a licence bought in BonkMart → Tech Support with the NosyViewer code read out + the PIN found in the caller's files → pause → main menu (clean) → the time card shows Tuesday | 45 | 2.5 min |
| `qa-week.js` | Friday through the Phone window only (scheme dropdown, Script lines, Enter), an insulted caller hanging up, Space skips the review, the promotion notice, week 2 (bigger quota), Save and quit → time card → Continue | 14 | 2 min |
| `qa-endless.js` | Endless unlocks from the menu, calls by themselves, team total saved at once, unlock toasts + icons, no review, quit → Continue restores total / wallet / inventory / stats / progress, reset total | 11 | 1 min |
| `qa-economy.js` | Earn money; every BonkMart tab; hold-to-buy (early release cancels); every catalog item buys for its price and ends owned; upgrades maxed; bought apps get icons; every chaos good; the 9-slot hotbar; every hotbar item used; used-up items saved; perks restored on quit and re-applied on continue | 20 | 2.5 min |
| `qa-apps.js` | Every desktop app opens, does its main thing and closes; maximise / minimise / restore / drag; every app at once (taskbar fits); show desktop; pop-up storm on screen + BugBuster above it, quarantine, shield; start menu; context menu; Settings app | 40+ | 1 min |
| `qa-walk.js` | Walk / sprint / walls / jump / third person; punching and slapping coworkers; paper into a bin (dropped and aimed with the crosshair); pick up / carry / throw / drop a box; coffee (boost + HUD chip), water cooler, snack machine, copier; both doors; the boss office (punch The Boss); the break room; frame times + draw calls | 27 | 2 min |
| `qa-reset.js` | Every app open + a live call; stand up mid-call and sit back; the day ends mid-call with BonkMart, a fire and a tint; quit from the review (nothing left over); a new game starts clean; Esc pause stops the clock; quality low / high / med, FOV, volume, every settings tab fits; the character creator; 1920x1080 ⇄ 1280x720 resize; saves and the look survive a page reload | 18 | 2.5 min |
| `qa-raid.js` | Heat from scams, a raid while seated ("officer incoming" + stand up), solo pause freezes the raid, an arrest (fine maths, mugshot, release), repelling (hazard pay + team bonus), losing (petty cash), the day ending mid-raid, quitting while busted, a clean new game (door closed) | 19 | 1 min |
| `qa-edge.js` | More kinds of items than hotbar slots (scroll on to reach them all); Esc at the desk (pause menu over the windows) and back; three days back to back (no leaked Loop hooks, Bus handlers, cameras, textures, scene objects or DOM); the day ending with a call ringing, the clock-out box and BonkMart open; quitting mid-raid, mid-call, with the webcam on and a chat reply pending → endless starts clean | 14 | 1.5 min |
| `qa-creator.js` | Character creator preview colours (sRGB like the game), light and dark skin tones | 1 | 15 s |

`qa-lib.js` holds the shared helpers (`Q.check`, `Q.shot` that waits for fresh frames and freezes the loop on a
finished frame, `Q.gw` waits in game time, `Q.press` real key events, `Q.click`, `Q.play` plays a scheme like a
player: Script lines, form details, NosyViewer codes, PINs; `Q.fast` skips 3D drawing while logic runs).

Also re-run in this wave: `smoke.js` (call reaches "paid", no page errors) and the module scenarios
(`os phone props shop games tools cams review raid office avatars ui clockout`).

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

## Known issues / not fixed

- Solo pause stops the clock, calls, raids and chat bots, but not cosmetic simulation: particles, physics props,
  BonkMart chaos goods already in flight (an airstrike lands while paused) and the coffee boost keep running.
- Speech bubbles and name tags draw through walls (sprites without depth test), e.g. The Boss's "Did you just...?"
  is visible from the break room.
- Holding "Hold to buy" in BonkMart while the shift ends completes the purchase during the review.
- The hotbar shows at most 9 slots; everything is reachable by scrolling, keys 1-9 only reach the visible ones.
