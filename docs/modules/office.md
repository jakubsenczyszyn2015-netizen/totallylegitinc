# Office module (world.js + office.js)

The 3D office: renderer and colour pipeline, the building (floor plan, walls, windows, doors,
lights), the cubicles and desks, furniture and props, the animated desk screens, the wall
leaderboard, the review-room projector, wall fans, sunbeams, the CSS colour grade and the
main-menu camera.

- `world.js` — engine side: colour pipeline, helpers, the static batcher (`S`, `Batch`), the texture
  atlas (`Atlas`), materials, the shell (floors, walls, windows, doors, lights), desks, boss, whiteboard.
- `office.js` — content: picture art, furniture and props for every room, desk screens, leaderboard,
  projector, fans, clock, sunbeams + dust, colour grade, menu camera.

Everything is built inside `initWorld()` → `buildWorld()`, before `Bus.emit('world:built')`.

## Floor plan

```
 z = -9 (south, windows)                                      x = 20 (east)
 +--------------------------------------+--------------------+ - - - - +
 |                                      |  review room       |         |
 |   main call floor                    |  (red table,       |         |
 |   4 pods x 12 desks                  |   projector on     |         |
 |   (rows along z, players face +-x)   |   the east wall)   |         |
 |                                      +---door-------------+         |
 | west windows   cross aisle z = 0     |  hallway  -> main door ->| lobby |
 | (sunset)                             +--------+-----door--+         |
 |                       leaderboard    | break  |  boss     |         |
 |                       on the x=10    | room   |  office   |         |
 |                       wall (south)   |        |           |         |
 +--------------------------------------+--------+-----------+ - - - - +
 x = -12                             x = 10    x = 16             z = 9 (north)
```

| export | value |
|---|---|
| `W.bounds` | `{x0:-11.6, x1:19.6, z0:-8.6, z1:8.6}` — walkable clamp; identical to the clamp in player.js, so nothing has to change there (the outer walls did not move). |
| `W.rooms` | `{floor, hall, review, break, boss, lobby}` each `{x0,x1,z0,z1}` (lobby is outside the main door, beyond `W.bounds`). |
| `W.spawn.players` | 6 × `{x, z, yaw}` around (8, 0) facing west down the floor (same spot `resetPlayer()` uses). |
| `W.spawn.police` | 6 × `{x, z}` in the lobby just outside the main door. |
| `ROOM_H` | 3.2 (ceiling height). |

## Doors

`W.doors.main` (double glass doors at x = 20, z = 0, swing inwards) and `W.doors.boss`.
The lobby side of the main door has a "SUITE 404" plaque, a keypad and a "Police: please don't." sign;
the lobby (x 20.2–24.5, z ±2.5) has fake elevator doors, a bench and a plant — the police spawn there.

```js
W.doors.main.open(sync)    // sync = true also tells everyone else (Net.emit 'office:door')
W.doors.main.close(sync)
W.doors.main.toggle(sync)
W.doors.main.set(open, sync)
W.doors.main.isOpen        // boolean
W.doors.main.pos           // {x: 20, z: 0}   inside: {x: 18.8, z: 0}, outside: {x: 21.4, z: 0}
```
A closed door is a collider; an open one is not. Players can press E on doors. Door state is
host-shared (`Net.share('doors')`) and changes are relayed with `Net.emit('office:door', {id, open})`.
Bus event: `door` → `{id, open}`.
For a raid, call `W.doors.main.open(true)` on the host (or `open()` on every client).

## Desks

`W.desks[i]` = `{ i, x, z, rot, npc, seat:{x,z}, eye:{x,y,z}, stand:{x,z}, screen:{x,y,z,w,h} }`
- 48 desks in 4 cubicle pods (x = 6.4, 1.4, -3.6, -8.6): 40 player desks + 8 NPC desks (`npc: true`,
  a seated coworker from `buildAvatar` is in `W.npcs` with `n.desk = i`, posed by avatars.js).
  Desk 0 is the closest free desk to the spawn (pod at x = 6.4, facing west).
- The player faces local −z (`camera.rotation.y = rot`); the monitor is 0.8 m in front of `eye`
  (y = 1.2), its screen centre is `screen`.
- Colliders: one per pod row (desks + partition) and one per side partition.

### Desk screens
```js
W.setDeskScreen(i, mode)   // force 'saver' | 'ring' | 'desktop' | 'off' | 'boot'; null = back to automatic
W.deskScreen(i)            // current mode
```
Automatic modes (re-evaluated 5×/s and on call/sit/stand events): NPC desks → `desktop`; the local
player's desk → `ring` while `Call.state === 'ringing'`, `desktop` while seated there; a desk with
another player in it (`Net.players.get(id).seat`) → `desktop`, or `ring` when their phone rings
(every player publishes `ext.ring` via `Net.addMe('ring')`); free desks → animated screensavers
(7 kinds: rainbow swirl, lava blobs, starfield, plasma, waves, square tunnel, bouncing company logo).
When an idle desk becomes occupied it shows the LegitOS `boot` screen (logo + spinner) for ~2 s
before `desktop` (you see it during the sit-down zoom; others see it when you sit).
All screens are one `InstancedMesh` reading cells of one 1024×512 canvas atlas (4×3 cells of 256×156,
updated at ~10 fps), so they cost one draw call.

## Leaderboard (main floor, x = 10 wall)
`W.leaderboard = { canvas (1024×576), tex, mesh, update(force) }` — redraws from `Game.roster()`,
`G.team`, `G.quota`, `G.timeLeft` once a second (only when something changed) and on `earn` /
`day:start`. Dark red, "{ 1st }" ranks, "Keep pushing.".

## Projector (review room, east wall)
```js
W.projector.draw((ctx, w, h) => { ... })   // draw a slide on the 1024×576 canvas; texture updates itself
W.projector.clear()                        // back to the idle company-logo slide
W.projector.mesh / .tex / .canvas / .beam
```
The screen (4.0 × 2.25 m, centre x = 19.94, y = 1.8, z = −5.4) faces west (−x); everyone in `REVIEW_SEATS` faces +x towards it. `BOSS_REVIEW` stands
beside the screen, not in front of it.

## Review room, boss
- `REVIEW_SEATS`: 8 `[x, z]` seats round the red table (all face +x / the projector).
- `BOSS_DAY` (behind his desk in the boss office, facing the door) and `BOSS_REVIEW`; `placeBoss(review, angry)`.
- `setBoard(lines)`: the "Daily Targets" whiteboard in the break room (first line is the title, second
  in red), drawn in marker. `W.board` is its mesh, `W.boardCanvas` / `W.boardTex` the canvas.

## Interactables (`W.interact`, press E)
Sit at desk (player desks), water coolers (hallway + break room), coffee machine (speed boost, as
before), vending machines, copiers, main door, boss door.

Break room contents: two fridges, base + upper cabinets with sink, two microwaves, toaster, dish rack,
kettle, coffee machine, red table with plastic chairs, fruit bowl, a couch under the cork board,
water cooler, whiteboard, plant, extinguisher, bins.

## Other exports
- `W.bins` — 10 paper-ball bins `{x, z}` (rim at 0.42 m, radius 0.2 m).
- `W.cctvSpots` — `[{id, label, pos:[x,y,z], look:[x,y,z]}]` ceiling security-camera domes (built
  into the scene) for the CCTV app / cams.js.
- `W.camOverride = {pos:[x,y,z], look:[x,y,z]}` pins the camera after the player update (cutscenes,
  screenshots); set it to `null` to release. In the main menu the office runs its own slow glide.
- `W.setCeiling(visible)` shows/hides the drop ceiling with everything on it (tiles, light panels,
  pendants, vents, security-camera domes) — for top-down / spectator / overview cameras (ref03 style).
  `W.layers.ceil` holds those meshes. The ceiling stays in the shadow map, so sunlight is unchanged.
- `W.sun` (the DirectionalLight), `W.sunbeams`, `W.updateShadows()`.
- `W.anim` — array of `fn(dt)` called every frame (door swings use it).
- Bus events emitted: `world:built`, `quality` (q), `fonts:ready`, `door`.

## Rendering pipeline (read this if you make materials or textures)
- `renderer.outputEncoding = sRGBEncoding`, `toneMapping = ACESFilmicToneMapping`.
- **Colour management is on**: `THREE.Color` hex / CSS / HSL setters treat input as sRGB and store
  linear (getters return sRGB again), like modern three.js. Write colours as usual (`'#ff8800'`).
  Raw `setRGB()` values are linear.
- `new THREE.CanvasTexture()` defaults to `encoding = sRGBEncoding`. Other textures you load
  yourself should set `tex.encoding = THREE.sRGBEncoding` if they hold colours.
- `SpriteMaterial` defaults to `toneMapped: false` (crisp name tags). For UI-like emissive things
  (screens, signs, particles) pass `toneMapped: false` to MeshBasicMaterial too.
- Render targets stay linear (correct for using them as textures in the scene). If you read pixels
  back into a 2D canvas, set `rt.texture.encoding = THREE.sRGBEncoding` first.
- Custom `ShaderMaterial`s get linear colour uniforms and no tone mapping / encoding unless they
  include the three.js chunks.
- Shadows: one directional sun light, `shadowMap.autoUpdate = false` (the sun never moves). Static
  geometry casts; avatars use their own blob shadows. If you add or move big shadow-casting objects
  call `W.updateShadows()`. Quality: low = no shadows, med = 1024 PCF, high = 2048 soft.
- A CSS grade sits on top of the 3D canvas: `#gl` filter (saturate/contrast), `#gl-grade` vignette
  and `#gl-tint` warm soft-light overlay (z-index 1, below the HUD/OS). Disabled on low quality
  (`body.q-low`).

## Building more static stuff (for other modules)
All static geometry should go through the batcher so it merges into one mesh per material:
```js
S.box(key, w, h, d, x, y, z, colour, { rx, ry, rz, sx, sy, sz, p: parentMatrix4 })
S.rbox(key, w, h, d, radius, x, y, z, colour, o)   // chunky rounded box
S.cyl(key, rTop, rBottom, h, x, y, z, colour, o)
S.geo(key, geometry, x, y, z, colour, o)
S.decal(Atlas.cell(w, h, drawFn), w, h, x, y, z, o, glow)   // picture from the shared atlas
S.col(x0, x1, z0, z1, y1)                                   // collider
S.layer = 'ceil'; ...; S.layer = null                      // put what you build in between on the ceiling layer
```
Keys: `solid` (lambert, casts), `small` (no shadow), `shiny` (phong, casts), `two` (double sided),
`glow` (unlit), `glass`, `wall`, `fabric`, `wood`, `carpet`, `lino`, `planks`, `ceil`, `atlas`, `atlasGlow`,
`pool` (additive light pool), `ao` (multiply contact shadow). This only works during the build
(`buildOffice()`); after `world:built` create normal meshes (share geometries/materials).
`rboxGeo(w,h,d,r,seg)`, `cylGeo`, `mergeGeos(items)`, `rng(seed)`, `scrawl()` (marker text),
`wobble()` (hand-drawn line) and `FONT` are also global.
