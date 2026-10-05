# Totally Legit Inc. — architecture

A co-op call-center comedy game: walk around a 3D office with friends, sit at a desk, use a fake
desktop computer, take calls from silly AI/scripted callers and run ridiculous fictional scams
to hit the team quota before the boss's performance review.

Runs as plain HTML/JS in Electron (`npm start`, Windows exe via `npm run dist:win`). No bundler:
`app/index.html` loads classic `<script>` files in order. Top-level `const`/`let`/`function`
declarations are shared globals across all files.

## Files and load order

```
core.js        helpers (h, $, clamp, rand, pick, money…), Store, settings, toast, and the
               extension points: Bus, Loop, Shop, Inv, ItemDefs
audio.js       AudioSys, SFX (procedural sounds), TTS (caller voices), STT (speech input)
net.js         Net — PeerJS multiplayer (host authoritative) + generic messages
voice.js       Voice — proximity voice chat
data.js        SCHEMES, callers (PERSONAS, makeCaller, portraitSVG), BOSS lines, UPGRADES
ai.js          LLM provider calls + prompt building
brain.js       built-in offline caller AI (offlineReply)
world.js       renderer, colour pipeline, static batcher, shell, desks, boss (W, P, Keys, box/mat/canvasTex)
office.js      office build-out: furniture, desk screens, leaderboard, projector, fans, grade, menu camera
avatars.js     character models, animation, name tags, remote-player sync, W.me, avatarOf()
fx.js          particles, decals, screen effects (FX)
props.js       physics props, held items + hotbar, melee, item behaviour (Props)
player.js      local movement, camera, sitting, throwing, interaction (updateWorld)
os.js          LegitOS desktop shell (windows, taskbar, icons, start menu, pop-ups)
apps/office.js      Settings, Payroll, Memo          apps/phone.js     Phone window
apps/schemes.js     scheme apps + Playbook           apps/remote.js    NosyViewer
apps/shop.js        BonkMart Market + Chaos goods    apps/cookie.js    Cosmic Cookie
apps/casino.js      LuckyBonk Casino                 apps/chat.js      Chatterbox
apps/paint.js       Doodle Pro                       apps/browser.js   Browser
apps/antivirus.js   BugBuster                        apps/wallpapers.js Wallpapers
apps/script.js      call Script                      apps/camera.js    Camera (webcam)
apps/cctv.js        CCTV console
call.js        the phone call state machine (Call)
game.js        G (state), Game (day cycle, money, saves)
ui.js          title screen, menus, settings, pause, walking HUD, day card
customize.js   character creator
cams.js        render-to-texture cameras, Bonk SnapCam photos
review.js      performance review room, firing, end reports
clockout.js    clock out early: punch clock, pause / start-menu buttons, multiplayer vote
raid.js        police raids
main.js        input, main loop, boot
```
Styles (`app/css`): `fonts.css`, `style.css` (menus, HUD, toasts), `os.css`, `phone.css`, `shop.css`, `games.css`,
`tools.css`, `camera.css`, `hud.css` (hotbar, key hints, screen effects), `review.css`, `raid.css`, `clockout.css`,
`customize.css`.

### Module docs
Each module documents its public API in `docs/modules/`:
[office](modules/office.md) (world.js + office.js) ·
[avatars](modules/avatars.md) (avatars.js, customize.js) ·
[props](modules/props.md) (fx.js, props.js, player.js, hud.css) ·
[os](modules/os.md) (os.js, apps/office.js, apps/wallpapers.js) ·
[phone](modules/phone.md) (call.js, data.js, brain.js, ai.js, apps/phone.js, schemes.js, remote.js, script.js) ·
[shop](modules/shop.md) (apps/shop.js) ·
[games](modules/games.md) (cookie.js, casino.js) ·
[tools](modules/tools.md) (chat.js, paint.js, browser.js, antivirus.js) ·
[cams](modules/cams.md) (cams.js, camera.js, cctv.js) ·
[review](modules/review.md) (review.js) ·
[ui](modules/ui.md) (ui.js, style.css, clockout.js) ·
raids (raid.js, `docs/modules/raid.md`, written by the raid module).
Scenarios for each live in `tools/scenarios/<module>.js`.

**Rule for top-level code:** at load time a file may only touch things from files loaded before
it — in practice `core.js` registries (`Bus`, `Loop`, `Shop`, `Inv`, `ItemDefs`), `Net.on`,
`OS.apps`, and data constants. Everything else must be looked up lazily inside functions or
event handlers (`Bus.on('boot')`, `Bus.on('world:built')`).

**Patching another module:** prefer events and registries. If you must change behaviour owned by
another file, wrap it from your own file at load time, e.g.
`const _old = UI.showReview; UI.showReview = res => { … }` (only for objects defined earlier in
the load order, or inside `Bus.on('boot', …)`).

## Extension points

### Bus — game events
`Bus.on(name, fn)` returns an unsubscribe function. `Bus.emit(name, ...args)`.

| event | args | when |
|---|---|---|
| `boot` | | after the world, OS and UI are built |
| `world:built` | | right after the office is built (renderer, scene, desks exist) |
| `game:begin` | `{mode, slot}` | a run starts (solo, host or join) |
| `save:loaded` | | a save slot was loaded into `G` / `Inv` |
| `day:start` | `{day, mode, late}` | a shift starts (all players) |
| `review` | `res` | the performance review starts (`res`: day, team, quota, pass, players, lines) |
| `quit` | | back to the main menu |
| `earn` | `amt` | the local player earned (or lost) money |
| `call:ring` / `call:answer` | `call` | the phone rings / is answered |
| `call:line` | `{who: 'you'|'them', text, call}` | a line was said on the call |
| `scam:paid` | `{amt, call, scheme}` | a scam was completed |
| `scam:baited` | `call` | the caller was a scambaiter |
| `call:end` | `{result, call}` | the call ended (`paid`, `baited`, `hung`, `you`, `timeout`, `cut`) |
| `player:sit` / `player:stand` | `deskIndex` / | the local player sat down / stood up |
| `inv:change` | `id, count` | the local inventory changed |

| `quality` | `q` | graphics quality changed (`'low'|'med'|'high'`) |
| `fonts:ready` | | the bundled fonts finished loading (redraw canvas text) |
| `door` | `{id, open}` | a door opened / closed |
| `shop:buy` | `{id, price, item}` | something was bought at BonkMart |

Module events (see the module docs): `prop:bin`, `fx`, `look:change`, `wallpaper`, `review:slide`,
`review:fire`, `review:report`, `review:end`, `call:code`, `call:remote`, `cookie:click`, `cookie:milestone`,
`casino:result`, `chat:prank`, `chat:pranked`, `paint:hang`, `paint:hung`, `antivirus:block`, `antivirus:clean`.

Add new events freely (document them here) — e.g. `raid:start`.

### Loop — per-frame hooks
`Loop.add(fn)` → `fn(dt, t)` every frame after `updateWorld`. `Loop.addRender(fn)` → after the main
render (use for extra cameras). `Loop.remove(fn)`. Errors are logged once and swallowed.

### Net — multiplayer
Host is authoritative; clients send requests, the host decides and relays. Up to 6 players.
- `Net.active`, `Net.isHost`, `Net.myId`, `Net.players` (Map id → `{name, color, x, y, z, ry, seat, talk, personal, ext}`)
- `Net.isAuth()` — true for the host or in singleplayer. Use it to decide who simulates shared things.
- `Net.on(type, (payload, fromId) => …)` — one handler per type.
- `Net.emit(type, payload, {host, to})` — send to everyone else (the host relays client messages).
  **The sender's handler is not called** — apply the change locally first.
  `host: true` delivers only to the host; `to: id` only to that player.
- `Net.share(key, () => state, state => apply)` — host-owned state included in every snapshot
  (~10/s) and in the welcome message. Keep it small.
- `Net.addMe(key, () => value)` — extra per-player data sent with your position; other players
  see it as `Net.players.get(id).ext[key]`. Use for look, held item, pose.
Everything new that others should see (props, effects, raids, chat) **must** sync through these.
In singleplayer `Net.active` is false and `Net.emit` does nothing.

### Shop — store catalog
`Shop.add({ id, tab: 'scams'|'apps'|'games'|'goods', section, name, desc, price, icon, color,
owned(), buy(), repeatable, available(), sort })`. The shop app renders it; it takes the price from
`G.wallet` and calls `buy()`. Items that unlock something should record it in `G.prog`.

### Inv / ItemDefs — things the player carries
`Inv.give(id, n)`, `Inv.take(id, n)`, `Inv.count(id)`, `Inv.all()`. Saved with the slot.
`ItemDefs[id] = { name, icon, desc, use(), equip(), unequip(), model() }` describes behaviour
(the props module drives the hotbar and calls these).

### G.prog — saved progress for any module
`G.prog` is a plain object saved with the save slot (week slot or endless). Namespace your keys:
`G.prog.cookie = {...}`, `G.prog.wallpaper = 'canyon'`. Call `Game.saveProgress()` after changes.

### OS.apps — desktop apps
```
OS.apps.myapp = {
  desktop: true, order: 50, available: () => true,   // show a desktop icon (sorted by order)
  title, emoji, icon, color, w, h, x, y, cls,         // window look and default placement
  render(body, win), refresh(body, win), onClose(win), // build the window / update it (OS.refresh())
  direct() }                                           // instead of a window, just run this
```

### Avatars
`buildAvatar(opts)` → `av` with `av.group` (THREE.Group, feet at y=0, faces −Z), `av.tag`
(name sprite), `av.play(action)`, `av.stun(sec)`. `poseAvatar(av, sit, t, speed)` animates.
`W.me` is the local player's own avatar (hidden in first person). `avatarOf(id)` returns the
avatar for any player id (yourself included). `W.avatars` holds remote players.

### World
`W.scene`, `W.camera`, `W.renderer`, `W.desks[i]` (`{i, x, z, rot, npc, seat, eye, stand, screen}`),
`W.colliders` (axis-aligned boxes `{x0,x1,z0,z1,y1}` used by `blocked(x, z)`), `W.interact`
(`{pos, label(), act()}` — press E; `label()` returning null hides the prompt), `W.bins`, `REVIEW_SEATS`,
`placeBoss()`, `setBoard(lines)`, `W.rooms`, `W.spawn`, `W.doors.main/boss`, `W.leaderboard`, `W.projector`,
`W.setDeskScreen(i, mode)`, `W.camOverride`, `W.setCeiling(v)`, `W.updateShadows()` (see [office](modules/office.md)).
`P` is the local player (`pos`, `yaw`, `pitch`, `seated`, `seat`, `review`, `speed`).

### Other module APIs (details in the module docs)
- `FX` particles / decals / screen effects, `Props` physics props and held items ([props](modules/props.md)).
- `OS` — `OS.apps`, `OS.launch/close/refresh`, `OS.glyphs`, `OS.popup`, `OS.power()` start menu ([os](modules/os.md)).
- `Cams.create()` render-to-texture cameras, `Photos` ([cams](modules/cams.md)); `Review` ([review](modules/review.md)).
- `UI` menus / HUD, `ClockOut` clock out early + the multiplayer vote ([ui](modules/ui.md)).

### Performance rules
Share geometries and materials (`boxGeo`, `mat`, `rboxGeo`, `mergeGeos`), batch static geometry through `S.*`
during the build, use `InstancedMesh` for repeated things, keep canvas textures small and redraw them only when
they change and only while they can be seen, avoid allocations in per-frame code, and skip work for hidden things
(the main 3D render is skipped while the desktop covers the screen). `settings.quality === 'low'` turns off
shadows, the CSS colour grade, anti-aliasing and halves particle budgets; check `tools/scenarios/perf.js`.

## Art direction

Warm, chunky, cartoony, a bit grimy — a cheap call center at sunset.
- **Lighting:** warm orange-amber key light from window blinds, warm fluorescent tubes, soft
  shadows, slight orange colour grade over everything.
- **Office:** rows of cubicles with dark navy fabric partitions, light beige desks, chunky CRT-ish
  monitors (with a little webcam on top) showing colourful psychedelic screensavers, desk phones,
  keyboards, white office chairs, sticky notes with doodles ("STAY AWAKE", "Focus!"), white bins,
  crumpled paper on a dark checkered carpet, drop-ceiling tiles, wall fans, window blinds,
  plants, fire extinguishers. A break room (fridges, microwaves, cabinets, coffee, cork board,
  whiteboard "Daily Targets", dark-red meeting table) and a review room with a projector screen.
- **Characters:** big round heads, small bodies, noodle arms, chunky shoes, headsets with a mic
  boom, a name badge. Smooth shapes, flat/toon shading, expressive cartoon faces. Big white
  chunky-serif name tags floating over players.
- **Desktop OS:** full-screen desktop with a photo-like landscape wallpaper, rounded-square
  colourful app icons with white glyphs, white windows with a title bar and min/max/close,
  a dark taskbar with pinned apps and the money/quota/review timer, and a clock.
- **UI type:** `Roboto` for the OS, `Lilita One` / `Alfa Slab One` for big chunky headings and
  money pop-ups, `Karla` for menus (all bundled in `app/vendor/fonts`, see `css/fonts.css`).

### Originality rules (important)
This game is our own. Take the *ideas and feel* of the genre, never another game's assets or names.
- Never copy or recreate another game's logos, names, characters, textures or models.
  Use our universe: **Totally Legit Inc.**, the **Bonk** brand (Bonk Bank, BonkMart), LegitOS.
- No accent jokes, no ethnic or national stereotypes. Characters have varied skin tones and looks.
- Scams stay absurd and fictional (fake brands, silly fees, invented card formats). Never teach
  real-world scam techniques. Weapons are cartoon slapstick (stars, knockback, confetti), no gore.

## Testing

Use the headless harness (screenshots you can look at, console errors, scripted play):
```
xvfb-run -a -s "-screen 0 1920x1080x24" ./node_modules/.bin/electron --no-sandbox \
  --enable-unsafe-swiftshader tools/harness.js tools/scenarios/smoke.js 1600x900 tools/out
```
See the header of `tools/harness.js` for the scenario API. `tools/scenarios/smoke.js` must keep
passing (a full call to "paid", no page errors). Write your own scenarios for your feature.
