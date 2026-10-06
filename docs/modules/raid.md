# Raid module: police raids, team heat, cartoon self-defence (`app/js/raid.js`, `app/css/raid.css`)

Every closed scam makes noise. Enough noise and the police come through the front door: sirens, red/blue
light through the windows, cartoon cops chasing whoever is nearest. Fight back with BonkMart's
"Weapons & personal safety" range, hide, or get booked in the lobby. Scenario: `tools/scenarios/raid.js`.

## Heat
- Host-owned team meter `Raid.heat` (0..100), shared with `Net.share('raid')`.
- Rises on every `scam:paid` (`6 + amount / 30`, 6..26 per scam) and on `scam:baited` (+18). Clients add it
  locally and tell the host (`raid:heat`). Cools by 0.1/s while no raid is on. Halved at the start of each day.
- From **day 2** (week mode; endless: 150 s after the start), never in the first 20 s of a day or the last 45 s
  before the review, and at least 90 s after the previous raid, the host checks once a second:
  heat 100 = raid now; heat >= 70 = a growing chance (up to 3.5 %/s); heat >= 30 = a rare random check (0.12 %/s).
  Not while a BonkMart airstrike is in the air (`Chaos.busy()`).
- HUD gauge `#raid-heat` (top right, under the shift stats, while walking): flame badge, segmented bar,
  "Chill / Warm / Hot / Raid risk! / SIRENS!" + %; pulses red from 70. During a raid it turns into the raid
  timer with one cop icon per officer (dizzy ones tilted, fled ones greyed).
- LegitOS taskbar pill `#tb-heat` (between the Bonk Pay wallet and the stats): flame, mini bar, %;
  flashes red/blue with the time left during a raid.

## Raid flow
1. `raid:go` → everyone: sirens (`RaidSnd`), the "POLICE RAID!" banner (`#raid-alert`), red/blue edge glow
   (`#raid-glow`), additive red/blue light pools through the west + south windows, round the main door and in
   the lobby (`RaidLights`, two merged meshes), coworkers dive under their desks, The Boss crouches behind his.
2. After 1.25 s `W.doors.main` bursts open (dust, smoke, "BAM!", screen shake near it).
3. If BonkMart's **Inflatable Boss** stands in the lobby (`Chaos.st.boss`), every officer first turns to it and salutes
   for ~1.1 s ("Sorry, sir! Didn't see you there!"): it "scares the police" as its shop text promises.
   Cops (`2 + players`, max 6) run in from `W.spawn.police` and chase the nearest standing player, or a seated
   one (they go to the desk's aisle spot). Steering: BFS distance fields on a 0.4 m grid over the office and
   lobby built from `W.colliders` (`RaidNav`, rebuilt when the colliders change), plus a little separation.
   Seated players do not see the office (the desktop covers it), so LegitOS shows `#raid-near` ("OFFICER INCOMING!",
   distance, a "Stand up & run" button that stands you up and grabs the pointer) while an officer is within 9 m of your desk.
4. A tag (0.8 m, 0.95 m for seated players) = **arrest**: the victim is cuffed (stun, cuffs on the avatar
   for everyone), fined 25 % of their Bonk Pay wallet (min $40, never more than they have), teleported to the
   lobby for a 3.8 s mugshot cut-scene (height chart, a booking officer, camera shutter, a "BUSTED!" stamp, the
   charge sheet and a polaroid of the actual frame), then released at the front door. Cops ignore that player
   for 9 s. A held **riot shield** facing the cop blocks the tag and bounces them off.
5. Cops have 4 HP. Hits stun them (hit / facepalm animation, stars); at 0 HP they fall over dizzy for 3 s and
   then run out of the building ("Retreat!").
6. The raid ends when every cop has fled (**win**: +$150 hazard pay to every wallet, team bonus $150 per cop to
   `G.team` on the host, confetti, fanfare, green banner) or after 75 s (**lose**: each player loses 10 % of
   their wallet as "petty cash"). Either way the heat resets to 0. The door closes after the last cop leaves.
7. A new day, the review and quitting abort a raid silently.

Cop look (`copLook(seed)`): `buildAvatar` with a navy uniform, a peaked cap with a gold badge, a star badge +
radio on the chest, "POLICE" on the back, aviator shades (72 %), a big moustache (45 %), varied skin tones and
builds. Their name tag says POLICE (smaller, blue tint).

## Weapons (BonkMart goods, section "Weapons & personal safety")
All are `ItemDefs` driven by the props hotbar (left click = use, F = throw it). Each also works on teammates
(mild knockback through props' `hit` message) and coworkers (`Props.npcNet`). Shop ids are `w_<id>`.

| item id | name | price | use |
|---|---|---|---|
| `mace` | Bear Mace | $120 (repeatable) | cone of orange spray 3.6 m; 8 bursts per can; cops stunned 2.6 s, victims get an orange tint + cough |
| `taser` | Motivational Taser | $260 | crackling bolt to the first target under the crosshair (7 m), 1.6 s recharge; 3 s stun |
| `foam` | Conflict Resolution Foam Blaster | $320 | six foam darts with spread (instanced darts, stick in the floor) |
| `shield` | Customer Support Riot Shield | $280 | blocks arrests from the front while held; click = shove |
| `sniper` | Remote-Work Nerf Sniper | $480 | hold to zoom (FOV 26, scope overlay), release to fire one fast dart (3 damage) |
| `stress` | Stress-Ball Launcher | $220 | launches smiley stress balls (a physics prop, `PropTypes.stressball`) |
| `hammer` | Inflatable Hammer | $90 | melee, huge knockback, "BOING!" |
| `baton` | Batton (Definitely Spelled Right) | $160 | melee, 1.4 damage |

Punches (Q) also land on cops (0.5 damage). Durable weapons show "In your hotbar" while you carry one. A bought
weapon that would not fit the hotbar (5 item slots) is moved to the front of the inventory.
Models are generated in code (`RaidArt`, merged vertex-coloured geometry + one shared label atlas), modelled in
the avatar hand frame; the first-person view model is re-posed per weapon (`W_VM`, by wrapping `VM.setItem`).

## API
```js
Raid.start(k)          // host / solo: start a raid now (k cops, default 2 + players). Returns false if one is on.
Raid.finish(ok)        // host: end it (ok = repelled)
Raid.abort()           // drop everything silently
Raid.addHeat(a)        // any client (forwarded to the host); Raid.setHeat(v) host only
Raid.heat, Raid.on, Raid.left (seconds), Raid.cops ([{i, x, z, st, hp, av}]; st: 0 entering, 1 chasing,
  2 stunned, 3 dizzy, 4 leaving, 5 gone, 6 arresting)
Raid.hitCop(cop, dmg, stun, kx, kz, kind)   // damage a cop from any client (forwarded to the host)
Raid.camLabels()       // [{pos, text, color, kind, av}] for camera overlays (CCTV)
RaidW.strike(hit, w, dx, dz)   // apply a weapon hit to a target ({kind: 'cop'|'player'|'npc', ref, x, z, top})
RaidW.targets()        // cops + Props._targets in one list
RAID                   // tuning constants (heat, cop speed, fines, bonuses)
```
FX kinds added: `FX.spawn/net('word', pos, {w, c, s})` (comic word sprite: "ZAP!", "BOING!"), `'mace'` (`{dir}`),
`'zap'` (`{to: [x,y,z]}` taser bolt + sparks + sound).

## Bus events
- Emits `raid:start` `{n, cops}`, `raid:end` `{ok, n}`, `raid:arrest` `{id, me}`, `raid:heat` (heat).
- Listens `world:built`, `boot`, `scam:paid`, `scam:baited`, `game:begin`, `day:start`, `review`, `quit`.

## Net
| type | payload | |
|---|---|---|
| `Net.share('raid')` | `{h, on, n, s, l, c: [[x, z, ry, st, hp], …]}` | host, ~10 Hz: heat, raid state, cop snapshots (clients interpolate) |
| `raid:go` | `{n, k, s}` | host → all: a raid starts (number, cop count, look seed) |
| `raid:end` | `{n, ok, k}` | host → all |
| `raid:heat` | `{a}` | client → host: heat to add |
| `raid:hit` | `{c, d, s, kb: [x, z], k}` | client → host: a weapon hit cop `c` |
| `raid:arrest` | `{id, c}` | host → all: cop `c` arrested player `id` (the victim applies its own fine) |
| `raid:block` | `{id, c}` | host → all: a riot shield bounced cop `c` |
| `raid:spook` | `{c}` | host → all: cop `c` salutes the inflatable boss in the lobby (wave + bubble) |
| `raid:shot` | `{k: 'foam'\|'sniper', o, v: [[vx,vy,vz], …]}` | shooter → all: darts (visual; only the shooter tests hits) |
| `raid:ouch` | `{id, k: 'mace'\|'zap'}` | to the victim: tint / flash + toast |
Weapon effects use `FX.net`, props' `hit` / `npc` messages and `Avatars.act` (all already synced).

## DOM
`#raid-heat` (in `#hud`), `#tb-heat` (in `#tb-tray`), `#raid-alert` (z 9800), `#raid-glow` (z 11), `#raid-bust` (z 60),
`#raid-scope` (z 4), `#raid-near` (z 9790, only while seated during a raid). `body.raid-busted` hides the hotbar, key hints and crosshair during the mugshot.

## Testing
`tools/scenarios/raid.js` (`RAID_ONLY=banner,heat,shop,raid,arrest,end,lineup,desk,spook,net`; the whole run takes
over 15 minutes on a loaded machine, so run it in parts): HUD gauge (warm, raid risk), the
taskbar pill and the weapons in BonkMart, a forced raid (door burst, cops coming in, chase in third person, mace,
taser, foam darts, coworkers ducking, The Boss hiding, sniper scope), an arrest with the mugshot (asserts the fine),
hammer hits, dizzy cops, the "raid repelled" banner, weapons in first and third person, the seated "officer incoming"
warning, officers saluting the inflatable boss, and the multiplayer handlers (client snapshot, teammate cuffs, a client's hit on the host).
`RAID.tag = 0` makes cops harmless for screenshots.
