# Avatars module (`app/js/avatars.js`, `app/js/customize.js`, `app/css/customize.css`)

Chunky cartoon characters: big egg head with a canvas-drawn face, small polo-shirt torso with a
name badge, belt and trousers, floppy noodle arms with mitten hands, short legs and chunky shoes,
a headset with a mic boom. Hair, facial hair, glasses, build and colours come from a **look**.
Everything is generated in code (no art files).

## Proportions (for cameras and props)
Chunky cartoon proportions: a big egg head (about 0.55 m tall), short legs. Standing: feet at y 0,
hips 0.74, shoulders 1.14, eyes 1.53, top of the head 1.76 (afro/quiff a
little more), name tag at 2.1. Seated at a desk: hips 0.59, eyes about 1.38. For exact positions use the
bones (`av.head.getWorldPosition(v)`), they follow every animation. The body is modelled with long
legs and squashed between ankle and hip at build time (`AV_LEG`); everything else is unaffected.

## How an avatar is built (performance)
Each avatar is about **5 draw calls**: one `SkinnedMesh` body (17 bones, vertex colours, one
shared Lambert material), the head (`av.headMat`), the face decal (per-avatar 256x256 canvas,
redrawn only when the expression changes), and one merged mesh for hair + beard + headset +
glasses. Plus a blob shadow, the name tag sprite (players only) and the talk icon (only when
talking). Body and accessory geometries are cached per look and reference-counted, so identical
looks share them and geometries nobody uses any more are freed (the creator does not leak). Each
avatar keeps one `THREE.Skeleton` for its whole life, even across `setLook`.
Roughly 5-7k triangles per avatar. Face canvases are CPU canvases (`willReadFrequently`) so
uploading them never stalls the GPU.

## Building and animating

```js
const av = buildAvatar({ look, name, boss, headset });   // all optional
W.scene.add(av.group);                                    // feet at y = 0, faces -Z
poseAvatar(av, sit, t, speed);                            // call every frame
```

* `opts.look` — a look object (below) or its packed string. Without it a random look is made from
  `opts.name` (or a sequence number), and the old options still work: `opts.shirt`, `opts.skin`,
  `opts.hair` (hair colour) override it. `opts.boss` makes The Boss (big, suit and tie, grumpy,
  receding grey hair, big moustache, no headset). `opts.headset === false` hides the headset.
* `poseAvatar(av, sit, t, speed)`: `sit` is `false` (stand / walk / run, by `speed` in m/s; jumping
  and falling come from `av.group.position.y`), `true` or `'desk'` (typing at a desk, with
  occasional head turns and leaning back with hands behind the head), or `'review'` (seated, hands
  on the table). Transitions blend smoothly. Hidden avatars are skipped (except `W.me`).
* Seated avatars are placed at the chair (`desk.seat`, rotation `desk.rot`; review seats rotation
  `-PI/2`) and the pose itself moves the body down onto the seat and forward to the keyboard.

### Avatar object
| field / method | |
|---|---|
| `group` | `THREE.Group` to place/rotate (feet at y 0, faces -Z) |
| `head`, `chest`, `handL`, `handR`, `armL/armR` (shoulders), `legL/legR` | bones — attach props to `handR` (it follows the hand: palm faces the thigh, fingers point down -Y in the bind pose) |
| `headMat` | the head's material. Tinting it works (`placeBoss` makes the boss red-faced); the face decal is separate so the eyes stay white |
| `tag` | name tag sprite (`tag.userData.set(text)`), `setName(text)` also toggles visibility |
| `talk` | the green speaker sprite (shown by `updateAvatars` for talking remote players) |
| `talking` | set true to flap the mouth (`W.me` follows `Voice.talking`, remote players their talk flag) |
| `look` | the current look (read-only, use `setLook`) |
| `setLook(look)` | rebuild in place (same group, bones and headMat, so attached props stay attached) |
| `play(action, opts)` | one-shot action (list below). `opts.dur` (seconds), `opts.hold` (0..1: freeze at that point of the action until `stop()`, e.g. `play('spray', {hold: 0.5})` while spraying), `opts.loop` (repeat, e.g. `dance`) |
| `stop()` | end the current action (blends out) |
| `stun(sec)` | dizzy wobble + yellow stars spinning round the head + spiral eyes |
| `setMood(m, sec)` | face: `neutral`, `happy`, `angry`, `sad`, `surprised` (also `grumpy`, `joy`, `dizzy`). With `sec` it reverts afterwards |
| `act` | the running action `{name, t, d}` or null |
| `dispose()` | remove and free the per-avatar textures |

### Actions
`throw`, `punch`, `slap`, `wave`, `point`, `cheer`, `facepalm`, `drink` (hand to mouth, head
tilts back), `spray` (right arm held out), `fart` (squat and lean, strained face then relief),
`hit` (recoil), `fall` (knocked over backwards, lies dizzy with stars, gets up), `dance`, `shrug`,
`nod`. Actions only override the body parts they use, so legs keep walking while you wave.
`AV_ACTIONS` lists them. Each action also sets a matching face for its duration.

## Players and multiplayer
* `W.me` — the local player's body, built from `settings.look`, hidden by default (first person).
  It follows `P` every frame (desk seat / review seat / position and yaw). The third-person
  camera and webcam just make it visible.
* `avatarOf(id)` — the avatar of any player id (`'me'` or `Net.myId` = `W.me`), or null.
* `W.avatars` — Map id -> `{av, ...}` of remote players, managed by `syncAvatars` / `updateAvatars`.
* Looks sync through `Net.addMe('look', ...)` as a packed string (`p.ext.look`); remote avatars
  rebuild when it changes. Mood syncs through `p.ext.mood`.
* Actions sync with net messages:

```js
Avatars.act('wave');                 // local player does it, everyone sees it
Avatars.actOn(playerId, 'hit');      // make any player's avatar do it (e.g. the one you punched)
Avatars.stunOn(playerId, 3);         // stars for 3 seconds, on every screen
Avatars.setMood('happy', 3);         // local player's face (synced)
```
  Net message types: `av:act` `{id?, a, o?}` and `av:stun` `{id?, s}` (id defaults to the sender).
* Automatic reactions (no wiring needed): whoever throws a paper ball plays `throw`
  (detected from `W.balls`); the local player cheers on `scam:paid`, facepalms on `scam:baited`,
  gets angry when a caller hangs up, smiles on `call:answer`. Coworkers at desks fidget now and
  then; the boss points angrily when his face is red.

## Looks

```js
{ skin: '#f2c4a0', hair: 'short', hairColor: '#3a281c', facial: 'none', glasses: 'none',
  shirt: '#3b82f6', pants: '#39415a', shoes: '#1a1c22', build: 'avg', badge: true }
```
* `hair`: `bald buzz short sidepart curly quiff afro long bun ponytail mohawk fringe` (receding)
* `facial`: `none stubble mustache bigmustache goatee beard`; `glasses`: `none round square shades`
* `build`: `slim avg big`
* Options with display names: `AV_OPT` (`skins`, `hairCols`, `shirts`, `pants`, `shoes`, `hairs`,
  `facials`, `glasses`, `builds`). Skin tones are a natural range plus a few cartoon ones.
* `lookFromSeed(n)` stable random look, `normLook(l)` validate/fill, `packLook(l)` / `unpackLook(s)`
  compact network string. `Avatars.myLook()` returns the local look (creates it from the name hash
  on first use). After changing `settings.look` yourself call `Avatars.refreshMe()`.
* `settings.color` is kept equal to the shirt colour (the Settings shirt swatches still work and
  update the look).

## Name tags
`makeLabelSprite(text, big)` -> sprite with big white `Alfa Slab One` text, dark outline and drop
shadow, drawn on top of the world so teammates are easy to find. `updateAvatars` scales tags up a
little with distance so they stay readable and fades them out far away. `sprite.userData.set(text)`.

## Character creator (`customize.js`)
`Customize.show()` / `Customize.close()`: a "Character" button on the main menu and in the pause
menu (inserted before their Settings button on `boot`, and re-checked whenever `UI.menu('home')` or
`Game.pause(true)` runs, so a menu that re-renders keeps it). Live 3D turntable preview (own small `WebGLRenderer`, drag to spin, wheel/Zoom for a face
close-up, emote and mood test buttons) and options for name, skin, hair style and colour, facial
hair, glasses, build, shirt, trousers and shoes, plus Randomise. Saves to `settings.look`
immediately, updates `W.me` (and so the network look). Emits `Bus` event `look:change` (look) on
close. `Customize.apply(look)` sets a look programmatically; `Customize.preview` is the preview
avatar.

## Testing
`tools/scenarios/avatars.js` (set `AV_ONLY=creator,line,gallery,walk,sit,boss,net,me` to run parts):
creator panel (default, changed, face zoom), 8 characters plus `W.me` in poses/actions/moods,
close-ups, a gallery of every hair style / facial hair / glasses option (front and back),
walking/running/jumping, desks top-down and close, review room, the boss (calm and red-faced),
fake remote players through the real sync path (asserts the results), and the local player seated.
