# Props module (`app/js/fx.js`, `app/js/props.js`, `app/js/player.js`, `app/css/hud.css`)

The local player controller and camera, physics props you can pick up and throw, held items with a
hotbar, melee, and every particle / screen effect. Everything is generated in code (canvas textures,
small geometries); no art files.

Load order: `fx.js` (Space, FX, extra SFX) → `props.js` (PropArt, PropTypes, Props, items, hotbar)
→ `player.js` (controller, camera, input, `updateWorld`).

## Controls (for the HUD hint owner)
| key | action |
|---|---|
| `W A S D` / arrows | walk (smooth acceleration) |
| `Shift` | sprint (slight FOV kick) |
| `Space` | jump |
| `E` | interact / **pick up** the prop you look at |
| left click (pointer locked) | **use** the selected item (hold for the soda spray); throws paper / a carried prop |
| `F` | **throw** the selected item (slot 1 = endless paper balls) or the carried prop |
| `G` | drop the carried prop |
| `Q` / right click | **punch** (every third one is a slap) |
| `1`–`6` / mouse wheel | select a hotbar slot |
| `C` | toggle the **third-person** camera (first person is always the default) |

A small key list sits at the bottom right (`#keyhint`); the old `#hud-hint` is moved up above the hotbar.

## FX (`fx.js`)
```js
FX.spawn(kind, pos, opts)   // play locally. pos: Vector3 | [x,y,z] | {x,y,z}. Returns the emitter for 'fire'.
FX.net(kind, pos, opts)     // play locally and on every other player (Net 'fx'). opts must be JSON.
FX.fire(pos, scale, secs)   // cartoon flames that burn for secs (<= 0: until handle.stop()); returns {stop()}
FX.stream({color, width, speed, rate, life, test, onHit, owner})  // liquid stream handle:
                            //   s.set(pos, dir, on) every frame, s.stop() when done (it finishes falling)
FX.decal(pos, size, color, ttl)          // floor splat / puddle / scorch mark
FX.bubble(avatarOrPos, text, secs)       // comic speech bubble over an avatar (one per target)
FX.shake(amount, secs)      // camera shake (~0.2 small hit, 0.7 big). Shakes the desktop (#os) when seated.
FX.flash(color, secs, alpha)             // full-screen flash
FX.tint(color, amount, secs)             // colour grade overlay; secs omitted = stays until FX.tint(null)
FX.particle({layer, pos, vel, ttl, size, color, color2, alpha, frame, gravity, drag, floor})  // one custom particle
FX.clear()                  // everything off (also on 'game:begin' and 'quit')
```
Kinds: `stars` (`{n, scale, orbit: secs}` yellow cartoon stars, ring + sparks; `orbit` adds stars circling a head),
`hit` (small stars), `spray` (`{dir, dur, color}` a temporary stream), `splash`, `fart` (`{dir, scale}` jet +
lingering green cloud + sound), `cough`, `confetti` (`{dir, n}` + pop sound), `smoke`, `puff` (dust ring),
`fire` (`{scale, dur}`), `explosion` (`{scale}` flash, fireball, flames, smoke, debris, sparks, scorch decal,
light pulse, shake by distance, boom), `splat` (`{size, color}`), `coins` (`{n}`), `hearts`.

Every `FX.spawn` (local or from the network) emits **`Bus.emit('fx', kind, pos, opts)`** — listen to react
(props uses it to make people near a fart cough).

Example — the review room on fire when everyone is fired (call on every client, or once with `FX.net`):
```js
for (const p of spots) FX.fire(p, 1.2, 15);
FX.tint('#ff5a2a', 0.45, 15);
```

Performance: three instanced quad layers (`cut` crisp alpha-tested cartoon sprites, `soft` alpha, `add`
glow) hold every particle — 3 draw calls total, no per-frame allocations, capacities 1600/700/700 (oldest
are recycled). One 512² canvas atlas. Streams are one small tube mesh each; decals one InstancedMesh
(120). One shared PointLight (normally off) flickers near fires and flashes for explosions. Particle
colours bypass tone mapping so they stay punchy.

### Extra sounds (added to `SFX`)
`step2(hard)`, `land`, `whoosh`, `punch`, `slap`, `bonk`, `pop`, `fart(pos, len)`, `whoopee`, `cough`,
`splat`, `boom`, `coin`, `ow`, `crackle`. Each takes an optional world position for distance falloff.
`FXSnd.loop(freq, type)` → `{set(vol), stop()}` for looping noise.

### Space — static collision queries (shared)
```js
Space.ground(x, y, z)       // highest surface top at or below y: desk tops (from W.desks), low colliders, floor 0
Space.solid(x, y, z, r)     // the collider blocking a sphere there, or null (air above desk tops is free)
Space.ray(ox,oy,oz, dx,dy,dz, max, pad)  // distance to the first collider box / floor / ceiling
Space.overDesk(x, z)        // desk-top footprint under a point
```
Colliders taller than 1.25 m act as walls; lower ones are boxes you can land on. A grid is rebuilt when
`W.colliders` changes (doors).

## Props (`props.js`)
```js
Props.spawn(type, [x,y,z], [vx,vy,vz], {id, item, rest, ry, local, spin})   // local only
Props.launch(type, o, v, {id, item})     // spawn/relaunch and sync to everyone (Net 'prop:throw')
Props.remove(body), Props.clear()
Props.pickup(body), Props.drop(), Props.throwSel()
Props.carry                              // {type, id, item} while carrying, else null
Props.bodies, Props.byId                 // live bodies {id, type, pos, vel, rest, item, m, ...}
PropTypes[type] = { name, r, bounce, fric, roll, box, item, model() }   // register new prop kinds
```
Built-in types: `paper` (instanced, scores in `W.bins`), `box`, `can` (empty soda can), `soda`, `beans`,
`whoopee`, `confetti`, `item` (any other module's item, model from `ItemDefs[id].model()`; picking it up
gives the item back). Bodies are spheres (boxes settle flat) stepped at a fixed 120 Hz, so every client
computes the same flight from the same spawn message. They bounce off the floor, desk tops, walls,
colliders and the ceiling, roll, and sleep when still. Resting props are host-shared
(`Net.share('props')`) for late joiners and drift correction. `W.balls` still lists the paper balls
(`{m, life, local}`) for the avatars module's throw animation. 14 paper balls and 2 boxes are scattered
on the floor when a run starts (host).

Bus events: `prop:bin` (body) when your paper ball lands in a bin.
Net messages: `prop:throw` `{id, t, i, o, v, s}`, `prop:take` `{id}`.

## Items, hotbar, held items
* Hotbar: slot 1 is always `paper` (endless), slots 2–6 are `Inv.all()` items that have an `ItemDefs`
  entry (`hotbar: false` hides one). `Props.select(i)`, `Props.cycle(dir)`, `Props.sel`, `Props.slots`.
* Extended `ItemDefs` contract (all optional except `name`):
```js
ItemDefs.myItem = {
  name, desc, icon,          // icon: inline SVG markup (preferred) or an emoji / short text
  hint: 'Click to honk',     // shown under the name when selected
  model() { return mesh },   // new Object3D, item-sized in metres, shares geometry/materials; userData.nozzle = Vector3 (optional)
  use(ctx),                  // left click. ctx = {pos (hand), dir (aim), eye, yaw, pitch}. Take it from Inv yourself if it is consumed.
  hold: true, useHold(dt, ctx), useEnd(ctx),   // hold-to-use items
  fx: 'spray',               // others see a soda stream from your hand while you hold it
  equip(), unequip(),        // selected / deselected
  prop: 'soda',              // PropTypes key thrown by F (default 'item'); throwable: false to forbid
};
```
* Your selected item is drawn in first person (half-size view model, a hand gripping it, a fist for
  punches) and in your avatar's right hand (`av.handR`, or `av.armR` on the old avatar) for everyone:
  `Net.addMe('held', → {i, u, p})` (`i` item id or `prop:<type>` when carrying, `u` 1 while using,
  `p` pitch). `Props.heldId()`.
* Items registered here (Shop tab `goods`, section `Snacks & pranks`, `repeatable`, icon = inline SVG,
  `emoji` also set): `soda` (Bonk Soda, $60: hold to spray an orange stream, 4 s per can, puddles,
  soaks people, empty can drops), `beans` (Bottomless Beans, $40: fart cloud, people within 4 m cough with
  a green tint, NPCs complain), `whoopee` (Whoopee Cushion, $35: place on the chair you look at or on the
  floor; pops when someone sits / steps on it; on an NPC's chair it pops at once), `confetti` (Party
  Popper, $20). New saves get a welcome kit (`G.prog.props.kit`).
* Net: `whoopee` `{id, p, d}`, `whoopee:pop` `{id, n?}`, `soak` `{id}` (to the victim).

## Melee and reactions
`Props.punch()` — short cone (1.75 m, ~55°). Plays `punch`/`slap` on your avatar (`Net 'act'`), a fist jab
in first person, knocks props away.
* Players: `Net 'hit'` `{id, d:[dx,dz], f, s, sl, y}` to everyone. Everyone shows stars and plays `hit` +
  `stun(s)` on the victim's avatar; the victim applies its own knockback (`P.kx/kz`, small hop, stun,
  flash, shake). Seated players only get stars.
* NPCs / The Boss: `Net 'npc'` `{n, k}` (`n` = index in `W.npcs`, -1 = boss; `k` = `hit`, `soak`,
  `fart`, `bonk`, `whoopee`) → stars, animation, mood and a speech bubble ("Ow!", "That is going in your
  review.").
* Thrown props that hit someone bonk them (`Net 'bonk'` `{id}`).
* `Props.act(name)` plays an avatar action locally and sends `Net 'act'` `{a}`; receivers call
  `avatarOf(from).play(a)`.

## Player controller and camera (`player.js`)
Public functions kept: `blocked, lookAngles, startCam, sitAt, standUp, seatForReview, leaveReview,
resetPlayer, tryThrow, spawnBall, releaseLock (world.js), updateWorld, renderWorld`.
New `P` fields: `vx, vz` (walk velocity), `kx, kz` (knockback), `stunT`, `third` (third-person on),
`boom` (current camera distance), `fovK`, `dip`. `setThird(on)`, `spawnSpot()`, `freeSpot(x, z)`.
* Spawning uses `W.spawn.players[i]` (by player order) and clamping `W.bounds` when the office module
  provides them.
* Third person: a boom behind/above the right shoulder that slides in when `Space.ray` hits a collider,
  the floor or the ceiling, and eases back out. `W.me` is shown only while the boom is long enough.
  Interaction picking uses the head, so `E` works the same in both views.
* Footsteps on every stride (`SFX.step2`), landing thud + camera dip, sprint FOV kick, strafe roll,
  dizzy wobble while stunned.

## HUD (`hud.css`)
`#hotbar` (bottom centre: name + hint label, 6 chunky slots with key number, count and soda level),
`#keyhint` (bottom right), `#fx-flash`, `#fx-tint`. `body.hb-on` is set while the hotbar shows (toasts move up).

## Testing
`tools/scenarios/props.js` (`PROPS_ONLY=hotbar,spray,bin,punch,fart,third,pickup,whoopee,confetti,net,fx`):
hotbar, soda spray + puddles, paper balls into a bin (asserts a score), punching an NPC, fart cloud,
third person, picking up / carrying / throwing a box, whoopee cushions, party popper, a fake remote
player through the real Net handlers (held soda stream, punch, incoming hit knockback, remote fart and
throw), fire + red tint, explosion, confetti + coins. Screenshots freeze the frame loop while capturing.
