# UI module: menus, HUD, settings + Clock out early

Files: `app/js/ui.js`, `app/css/style.css` (menus, modals, HUD, toasts), `app/js/clockout.js` +
`app/css/clockout.css` (clock out early). Scenarios: `tools/scenarios/ui.js` (`UI_ONLY=menu,settings,hud,lobby`),
`tools/scenarios/clockout.js` (`CO_ONLY=solo,vote`), `tools/scenarios/perf.js` (frame-time probe, see below).

Style family: warm dark-brown panels (`--warm`, `--warm2`), 3px ink outlines (`--ink`) with a solid drop shadow,
cream text (`--cream`), gold / orange accents, `Lilita One` (`--font-c`) for chunky headings and buttons,
`Alfa Slab One` (`--font-d`) for the logo slab, `Karla` (`--font-b`) for body text. Buttons: `.btn`
(`.primary` yellow, `.danger` red, `.good` green, `.small`). Panels: `.panel`, `.modal` (header + `.body`),
`.overlay` (full-screen dim, z 60). Re-use these classes in new screens instead of adding new looks.

## Elements other modules rely on (keep the ids)
| id | what |
|---|---|
| `#menu` | title screen (logo, home buttons, sub-screens `section.screen[data-s=home|solo|multi|how]`, Bonk News ticker) |
| `#menu .home-btns` | the home buttons; avatars.js appends a `.cz-open` "Character" button, `UI.decorate()` gives it the tile look |
| `#pause`, `#pause .body`, `#pause-note`, `#pause-room` | pause menu (avatars.js and clockout.js add buttons to `.body`) |
| `#modal-settings`, `#set-tabs`, `#set-body` | settings modal |
| `#hud`, `#hud-stats`, `#hud-prompt`, `#hud-left`, `#hud-ring`, `#hud-hint`, `#hud-lobby`, `#crosshair` | walking HUD |
| `#daycard` | the "MONDAY / Team quota $400" card |
| `#toasts` | `toast(msg, kind)` (core.js) container; kinds `''`, `'good'`, `'bad'` |
| `#review` | legacy review overlay (review.js replaces `UI.showReview`) |

## API (`UI`)
- `UI.build()` — builds the menu, pause menu, settings modal and the controls panel (called once at boot by main.js).
- `UI.menu(name)` — show a title-screen screen: `'home' | 'solo' | 'multi' | 'how'`.
- `UI.openSettings()` / `UI.closeSettings()` / `UI.settingsOpen` / `UI.tab` (`player|controls|sound|ai|other`).
- `UI.hud()` — refresh the walking HUD (main.js calls it 5×/s; cheap: it only touches the DOM when the HTML changed).
- `UI.dayCard(title, sub)` — the big day card; `$amounts` in `sub` are drawn green. Also opens the controls panel for 14 s.
- `UI.showReview(res)` — replaced by review.js.
- `UI.roomCode(cls)` — a big copyable room-code element (lobby card, pause menu). `copyText(s)` copies with a fallback.
- `UI_KEYS` — the controls list (`[[keys], label]`), shown in the HUD panel, How to play and Settings › Controls.
  Add a row here when you add a control.
- `UI_IC` — small inline SVG icons used by the menus (`phone team gear help clock copy`).

### Walking HUD
- Top right `#hud-stats`: day + week, team / quota with a progress bar (gold when met), "Review in m:ss"
  (pulses red under a minute), your own earnings. Endless mode shows the team total.
- `#hud-prompt`: `[E] label` under the crosshair for `W.cur` (the interactable you look at).
- `#hud-hint`: **the one controls panel** (bottom right). Full after the day card or when `H` is pressed, otherwise
  a small "H Controls" tab. The props module's own `#keyhint` is hidden by style.css (`#hud #keyhint{display:none}`).
- `#hud-left`: room chip + mic chip in multiplayer, coffee boost chip.
- `#hud-lobby`: multiplayer lobby card with the big room code (Copy button), who is here and "Press Enter to start".

## Clock out early (`ClockOut`, clockout.js)
End a **week-mode** shift (`G.phase === 'day'`) before the timer runs out and go straight to the performance review.
Hidden / refused in endless mode, the lobby and the review.

Triggers:
- **Punch clock** on the south hallway wall (x 15.55, between the review-room door and the bench, facing the hallway):
  a chunky "PUNCH-O-MATIC 3000" with a dial that follows the shift (9:00 → 17:00), a time card in the slot (dips in
  when someone punches), a card rack and a yellow "CLOCK OUT" sign. `W.interact` entry: E "Clock out early".
  Built after `world:built` from merged geometry: 4 draw calls; the dial canvas is redrawn in 5-minute steps only
  while the player is within 10 m.
- **Pause menu** button `#pause-clockout` (orange, between Resume and Settings).
- **LegitOS start menu** item `.pm-item.co-pm` above "Quit to main menu" (wraps `OS.renderPower`).
- `F1` / `F2` vote yes / no while a vote runs.

Solo: a confirm box (`#co-confirm`: "Clock out now? The boss reviews you immediately." + time left / team / quota;
Enter = yes, Esc = no), then `Game.endDay()`.

Multiplayer: a **vote**. Any player can start one (confirm box first; the starter counts as yes). Everyone sees the
vote panel `#co-vote` (top centre, z 64: over the HUD, the desktop and the pause menu): "<name> wants to clock out
early", one pip per player (green yes / red no / empty), "2/3 yes · 2 needed", a 30 s countdown ring, Yes (F1) / No
(F2) buttons, then a "CLOCKING OUT!" / "VOTE FAILED" stamp and a toast. A **majority of all current players**
(`floor(n / 2) + 1`) must vote yes; players who do not vote count as no. A failed vote starts a 60 s cooldown.

Host authority:
- Clients send `Net.emit('co:start', {}, {host: true})` and `Net.emit('co:vote', {n, yes}, {host: true})`.
- The host keeps `ClockOut.vote = {n, by, name, yes: [ids], no: [ids], end}`, re-counts 4×/s (players who left are
  removed from the tallies, late joiners count towards the total), decides early when the result is certain, and
  shares the state with `Net.share('clockout')` (`{n, by, name, yes, no, left, total, need}`, or `{cool: s}` during
  the cooldown, or `0`). Late joiners get it in the welcome message and see the running vote.
- Result: `Net.emit('co:result', {n, pass, yes, total, name})`; on a pass the host calls `Game.endDay()` 1.4 s later.
- Refusals for a client (cooldown, wrong phase): `Net.emit('co:msg', {text}, {to: id})`.
- When the shift ended early the host adds a line for The Boss to the review (`reviewLines` wrapper) and sets
  `res.early` (seconds that were left).

`ClockOut` API: `available()`, `request()` (what every button calls), `cast(yes)`, `cooldown()`, `myVote()`,
`view` (current vote as everyone sees it, or null), `result`, `VOTE_S` (30), `COOL_S` (60), `clock` (punch-clock
meshes / canvases). Host internals: `hostStart(id)`, `hostCast(id, yes)`, `hostUpdate()`.

## Performance notes (see `tools/scenarios/perf.js`)
`PERF_Q=low|med|high PERF_ONLY=floor,desk,fire,strike` prints JS ms per frame, render ms, draw calls and triangles
for the heavy scenes plus the six most expensive `Loop` hooks. Software WebGL in the harness is slow: compare JS ms
and draw calls between runs, not fps.
