# Review module (`app/js/review.js`, `app/css/review.css`)

The end-of-day performance review, the firing and the end reports. It replaces the old `#review`
overlay: `review.js` loads after `game.js` / `ui.js` and

* replaces `UI.showReview(res)` (called by `Game.enterReview`) with `Review.start(res)`;
* wraps the global `reviewLines(res)` (called by `Game.endDay` on the host / in solo, right before the
  result is broadcast) to add call quotes and career records to `res`, so clients get them in the
  normal `phase: 'review'` message.

`game.js` keeps the flow: `Game.endDay()` (host) → broadcast → everyone runs `Game.enterReview(res)`
→ `seatForReview` + `placeBoss(true, angry)` → `UI.showReview(res)` → `Review.start(res)`.
`Game.nextDay()` / `Game.retryDay()` (host only) start the next shift; `day:start` and `quit` clean the
review up on every client.

## What happens
1. Everyone is re-seated round the red table (`P.review` = seat index, middle seats first: `[4,5,6,7,2,3,0,1]`
   by player order, so the solo player gets a clear view), looking between the projector and The Boss.
   The room lights dim (scene light intensities scaled down; the review room's fill light moves in front
   of the screen and becomes the projector glow), a vignette fades in, the HUD stats hide
   (`body.rv-on`). Players can look around while seated (drag, or click to capture the mouse; ±85° yaw).
2. A four-slide deck plays on `W.projector` (1024×576 canvas, redrawn at ~13 fps only while a slide
   animates):
   * **title** — company emblem, "DAILY PERFORMANCE REVIEW", the day (and week), navy + gold.
   * **calls** — "Call Analysis": three numbered yellow quote boxes "*name* said: “…”" sliding in, and a
     framed live-camera mugshot of The Boss (cartoon, drawn in 2D) with a blinking REC light.
     Missing quotes are filled with coworker gags (shown in italics).
   * **chart** — "AGENT RESULTS": a horizontal bar per agent (shirt colours, today's earnings, a star for
     the top earner) and a team-vs-quota bar with a dashed quota marker.
   * **verdict** — "QUOTA MISSED BY $X / YOU'RE FIRED! / $team OF $quota" (red stamp) or
     "QUOTA MET / SEE YOU TOMORROW." or, on a passed Friday, "PROMOTED!".
3. The Boss talks in subtitles (bottom of the screen, `.rv-sub`) and with TTS when caller voices are
   on (`TTS.speak`, a low slow voice); his mouth flaps (`W.boss.talking`) and he points / facepalms /
   nods. Lines: an intro, call-analysis comments, then `res.lines` from `reviewLines` (game.js; the last
   line is said with the verdict).
4. **Fired:** 12 `FX.fire` patches round the table and walls (burn until the review ends), a red
   `FX.tint`, a flash, `FX.shake`, a boom and a siren for ~7 s, the projector glow turns orange and
   flickers, big blurry CSS flames rise along the bottom of the screen. ~6 s later the
   **termination report** slides in.
   **Passed:** confetti bursts (coins on a Friday), The Boss nods and shrugs, then the
   **employee evaluation** (or the **promotion notice** after day 5, 10, …).
5. Reports (`.rv-sheet`, cream paper, dark-red Alfa Slab One): kicker, big title, subtitle, days worked /
   team haul (or team vs quota) top right, a ranked table (rank, employee + progress bar +
   "top earner • +$X ahead" / "$X behind the leader", then total earned, time / days, avg / day;
   the evaluation shows today, total, avg / day), the employee of the day / week and a team-vs-quota bar
   on the pass sheets, The Boss's last line, and buttons. Host / solo: "Try the day again" + "Main menu"
   (fired) or "Start Tuesday" / "Start week 2" + "Save and quit". Clients: "Waiting for the host" + "Leave".
6. `Space` or the **Skip** button jumps to the verdict, then to the report (local only; the host's buttons
   still drive the day). Pausing in solo pauses the review clock.

The review runs on its own clock (`Loop`, review seconds), the same on every client because every client
starts it from the same `res`.

## Data added to the review result (`res`)
Added by the host in `reviewLines` (so they are broadcast with the result):

| field | |
|---|---|
| `res.quotes` | up to 3 `{name, text}` — the best lines players said on calls today, one per player first |
| `res.recs` | per player `{name, today, total, days, secs, color}` — `total/days/secs` include today (career over the save slot) |
| `res.days` | days worked (`G.day`) |
| `res.haul` | `G.bank + G.team` at the end of the day (banked so far + today) |
| `res.secs` | seconds worked today |

Old results without these still work (the report falls back to `res.players`).

### Call quotes
Every client scores its own `call:line` (`who: 'you'`) lines during the day (length, `!`, CAPS, scammy
words, "not a scam", mild insults → funnier). The host keeps a pool (6 per player, 40 total); a client keeps
its best 4 and sends each new one to the host: **Net `review:line`** `{t: text, s: score}` (`host: true`).
The pool resets on `day:start`.

### Career records — `G.prog.review`
`G.prog.review = { career: { [playerName]: { e: totalEarned, d: daysWorked, s: secondsWorked } } }`,
updated on the host only when the day is passed (it is saved by `Game.saveWeek` right after), so a
retried day is never counted twice. The termination report adds the failed day on top without saving it.

## API
```js
Review.start(res)        // what UI.showReview(res) now does
Review.stop()            // clean up (also on day:start / quit)
Review.skip()            // jump to the verdict, then to the report (local)
Review.seek(t)           // jump the review clock to t seconds, running every event on the way (tests)
Review.on                // true while a review is showing
Review.state             // {on, t, slide, fired, sheet: 'fired'|'eval'|'promo'|null, verdictAt, sheetAt,
                         //  marks: {title, calls, chart, verdict, sheet}}
Review.quotes()          // the quote candidates (host: everyone's pool; client: your own best lines)
Review.addQuote(text, name)   // add a candidate by hand (e.g. a chat or prank line worth roasting)
Review.drawBoss(g, cx, cy, s, angry)            // cartoon Boss mugshot on any 2D canvas (s = half head height)
Review.bossCam(g, x, y, w, h, angry, t, label)  // the same in a "REC" camera frame with a height chart
Review.slides            // the slide painters {title, calls, chart, verdict}(g, w, h, t, res)
Review.scoreLine(text)   // the quote score
```

## Bus events (emitted)
| event | args | when |
|---|---|---|
| `review:slide` | `name, res` | a slide is shown (`title`, `calls`, `chart`, `verdict`) |
| `review:fire` | `res` | the review room bursts into flames (fired) |
| `review:report` | `res, kind` | the report sheet is shown (`fired`, `eval`, `promo`) |
| `review:end` | | the review was cleaned up (next day, retry or quit) |

## Net messages
| type | payload | |
|---|---|---|
| `review:line` | `{t, s}` | client → host: a call line worth quoting and its score |

## DOM / CSS
Everything lives in `#review` (`class="rv-root"`, full screen, `pointer-events: none` except the sheet and
the skip button): `.rv-dim`, `.rv-top` (slide dots), `.rv-sub`, `.rv-skip`, `.rv-hint`, `.rv-flames`,
`.rv-back`, `.rv-sheet.fired|eval|promo`. `game.js` still hides `#review` on `enterDay` / `quit`.
The old `.rv` overlay styles are gone; a few shared rules that lived at the end of `review.css`
(`.formbox`, `.upg`, the small-screen / reduced-motion media queries) are kept.

## Testing
`tools/scenarios/review.js` (`REVIEW_ONLY=a,b,c,d`): A) solo day with call lines, quota missed → every
slide, the fire, looking around, the termination report, "Try the day again"; B) four agents pass →
chart, verdict confetti, evaluation, "Next day"; C) four agents fired as seen by a client (waiting for the
host); D) Friday passed → promotion. It asserts the quotes reach `res`, the retry restarts the day and
the next day advances.
