# Clock out early (`app/js/clockout.js`, `app/css/clockout.css`)

End a work-week shift before the review timer runs out. Solo: confirm and The Boss starts the
performance review right away. Multiplayer: a **team vote** that the host decides; more than half
of the room must vote yes (2 of 2, 2 of 3, 3 of 4, 3 of 5, 4 of 6) within 30 s.

Only during the `day` phase of a **week** shift (`ClockOut.available()`); endless mode has no review
to skip to (the time clock just stamps your card with a joke).

## Ways in
- **Time clock** on the hallway wall between the review-room door and the bench (x 15.55, z -1.7):
  a beige punch clock whose face shows the in-game time, with a card rack. Press **E**
  ("Clock out early" / "Clock out early (team vote)" / "Vote yes: clock out early" during a vote).
- **LegitOS start menu**: "Clock out early" above "Quit to main menu" (wraps `OS.renderPower`).
- **Pause menu**: a "Clock out early" button under "Resume" (inserted at boot; wraps `Game.pause`).

All of them call `ClockOut.ask()`, which opens a time-card confirmation (in-game time, team vs quota:
green "quota met" or red "$X short ... everyone is fired"). **Enter** confirms, **Esc** cancels (Esc does
not toggle the pause menu while it is up). While it is open the player cannot walk (`Game.canControl`
is wrapped) and the pointer lock is released.

## The vote (multiplayer)
- Confirming starts a vote with you as the first yes. Everyone sees a manila **vote card**: who asked,
  one chip per player (yes / no / pending), "N of M yes votes needed", a countdown and a timer bar,
  and **F1 Yes** / **F2 No** buttons (keys work on foot and at the desk). On foot it sits top centre;
  at the desk it pops up bottom right above the taskbar, clear of the Phone window.
- Asking again while a vote runs votes yes. You can change your vote until it ends.
- The host recounts every frame against the current room (`Net.players`): players who leave are
  dropped and late joiners can vote. The vote passes as soon as the yes votes reach the majority,
  fails as soon as it can no longer pass, or after 30 s.
- A big stamp shows the result on every screen ("CLOCKED OUT!" / "VOTE FAILED"). A pass ends the day
  on the host 1.5 s later (`Game.endDay()` -> the normal review broadcast). A failed vote starts a
  15 s cooldown before anyone can ask again.

## The review
`ClockOut.endDay()` records the seconds that were left, and a `reviewLines` wrapper (host / solo, before
the result is broadcast) adds `res.early` (seconds left when the team clocked out) and a Boss line about
leaving early (different for a pass and a fail). Nothing else changes: an early day that misses the
quota is a normal firing, an early pass is saved like any other day.

## API
```js
ClockOut.available()     // true during a week shift's day phase (not in the review)
ClockOut.ask()           // the entry point: confirmation (solo / start a vote) or vote yes if one is running
ClockOut.start()         // skip the confirmation: solo ends the day, multiplayer asks the host for a vote
ClockOut.cast(yes)       // vote in the running vote
ClockOut.vote            // the running vote or null: { id, by, name, yes: [ids], no: [ids], left, n, need }
ClockOut.cool            // seconds before a new vote may start
ClockOut.need(n)         // yes votes needed in a room of n (more than half)
ClockOut.VOTE_SECS, ClockOut.COOLDOWN   // 30, 15 (host side)
ClockOut.modal           // true while the confirmation is open
```

## Net
| type | payload | |
|---|---|---|
| `clockout` | `{a: 'start' \| 'yes' \| 'no'}` | client -> host (`host: true`): start a vote / vote |
| `clockout:end` | `{ok, yes, no, n, need, name, timeout}` | host -> everyone: the result (stamp) |
| share `clockout` | `{v: vote \| null, cool}` | host-owned vote state in every snapshot (late joiners get it in the welcome) |

## DOM
`#co-confirm` (overlay, z 64: above the pause menu), `#co-vote` (z 66, `.in-os` at the desk), `#co-stamp` (z 67).
All created lazily on `document.body`; toasts (z 70) stay on top.

## Testing
- `tools/scenarios/qa-clockout.js` (solo, `tools/harness.js`): the time clock, Esc / Enter, the start menu,
  the pause menu, `res.early` and the Boss line, the save after an early pass, endless mode.
- `tools/scenarios/qa-clockout-mp.js` (3 players, needs the multiplayer rig `tools/harness-mp.js`): a pass
  (host asks, client F1), a fail (client asks, two no votes, cooldown), a timeout, and a voter quitting
  mid-vote (recount to 2 of 2).
