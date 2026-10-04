# Cams module (`app/js/cams.js`, `app/js/apps/camera.js`, `app/js/apps/cctv.js`, `app/css/camera.css`)

Extra cameras rendered into 2D canvases (the webcam, the security cameras, instant photos), the **Camera**
app, the **CCTV** app and the **Bonk SnapCam** instant camera (`ItemDefs.polaroid`) with its photo props.
Everything is generated in code. Scenario: `tools/scenarios/cams.js` (`CAMS_ONLY=webcam,fx,cctv,photo`).

Load order: `apps/camera.js` and `apps/cctv.js` load before `cams.js`, so they only touch `Cams` lazily.

## Cams — render-to-texture service (`cams.js`)

```js
const cam = Cams.create({
  w: 480, h: 270,        // canvas size (one shared render target + pixel buffer per size)
  fps: 12,               // how often it re-renders while visible
  fov: 60, near: 0.05, far: 60,
  me: true,              // show the local player's own body (W.me is hidden in first person)
  tags: false,           // show name tags (they draw through walls, so off by default)
  alpha: false,          // transparent background (scene.background off, clear alpha 0)
  visible: cam => bool,  // only rendered while this says true (e.g. its window is open and not minimised)
  before: cam => {},     // aim it right before each render; return false to skip this frame
  onFrame: cam => {}     // after each frame: cam.canvas / cam.ctx hold the picture (draw overlays here)
});
cam.set(pos, look)        // [x,y,z] | {x,y,z} | Vector3
cam.cam                   // the THREE.PerspectiveCamera (rotation order YXZ)
cam.canvas, cam.ctx       // the 2D canvas with the latest frame (put it in the DOM or drawImage it)
cam.project(p, out)       // world point -> {x, y (canvas px), z (view depth m), ok (in front + on screen)}
cam.render()              // render now (ignores fps / visibility)
cam.setSize(w, h), cam.on = false (pause), cam.dispose(), cam.frames (count)
Cams.snap({w, h, pos, look | quat, fov, me, near})  // one picture right now -> new canvas (default: the main camera's view)
Cams.people()             // [{pos (Vector3 over the head), text, color, kind: 'me'|'player'|..., av}] for labelling
Cams.labels.push(() => [{pos, text, color, kind}])   // add your own (e.g. police: kind 'police' -> red "INTRUDER" on CCTV)
Cams.roomAt(x, z)         // the W.rooms key a point is in, or null
Cams.talkUntil            // W.t until which your avatar's mouth flaps (set on Bus 'call:line' {who:'you'})
```
How it renders: the main `W.renderer` draws the scene into a `WebGLMultisampleRenderTarget` (4x MSAA on WebGL2)
whose texture encoding is sRGB (same shader variants as the screen, so no recompiles), then
`readRenderTargetPixels` copies it into the canvas (rows flipped). A scheduler in `Loop.addRender` renders the most
overdue visible camera: at most 1 per frame, 2 while the desktop is open (the main 3D render is skipped then).
During a render the first-person view model is hidden, `W.me` is shown or hidden by `me`, and name tags /
talk icons are hidden unless `tags`.

`W.me.talking` is wrapped with a getter (on `world:built`): true while `Voice.talking` (as before) **or** while you
are seated and said a line on the call in the last few seconds (length of the line), so the webcam shows your mouth moving.

## Camera app (`OS.apps.camera`, free, pinned to the taskbar)
Live 480x270 view from the little webcam on top of your monitor looking back at you (`CamApp`): your avatar
typing / leaning back at the desk, the keyboard in front, the cubicle and aisle behind you, teammates walking past
or leaning in. The virtual lens sits just behind the monitor and its near plane (0.2 m) clips the monitor away, which
gives a webcam-like wide framing. `▲ Show` opens a strip of effects (saved in `settings.camFx`):

| id | effect |
|---|---|
| `none` | plain |
| `pro` | **Professional background**: far plane just behind your chair + transparent clear, composited over a blurred fake backdrop (home office, beach, skyline: click again to cycle) and a lower-third with your name. Teammates beyond the chair get cut off like a real virtual background |
| `boss` | **Boss mode**: pixel sunglasses tracked to your head bone, a gold chain with a `$`, gold "BOSS MODE" title |
| `beauty` | **Beauty filter**: soft focus, pink vignette, twinkles, rosy cheeks, floating hearts, "flawless" |
| `potato` | **Potato quality**: 60x34 pixels, 5 fps, wobble, random freezes with "Reconnecting...", bad-signal bars |
| `night` | **Night vision**: green CSS filter, scanlines, noise, crosshair, REC timer |

`CamApp.POS / LOOK / FOV / NEAR` (desk-local placement), `CamApp.setFx(id)`, `CamApp.cam` (the Cams camera).

## CCTV app (`OS.apps.cctv`, $400 in BonkMart: tab `games`, section `Software`, item `app_cctv`)
`available()` is `G.prog.apps.cctv`. A dark security console (`CCTV`): 2x2 grid of grainy black-and-white feeds
(Entrance / lobby outside the main door, Call floor, Break room, Review room) from `W.cctvSpots`, 320x180 at 4 fps
each; click one for a 640x360 feed at 10 fps with a bar of all 6 cameras (+ Hallway, Call floor west); `AUTO`
cycles the big view every 5 s; `GRID` goes back. Each feed: camera name, in-game timestamp, blinking REC, scanlines,
animated grain, vignette. People are boxed with corner brackets and their name (you in green, teammates in yellow,
`kind: 'police'` labels in red), only when the camera has a clear line of sight (`Space.ray`). Status tag per feed:
`MOTION` (someone in view), `DOOR OPEN` (entrance feed while `W.doors.main.isOpen`), `INTRUDER` (a police label in
view, red flashing border) or a custom alert. The footer lists who is where ("ON SITE: Dana · Break room").
The floor cameras pan slowly.

```js
CCTV.alert('lobby', 'POLICE AT THE DOOR', 8)   // red flashing tag + border on that feed (badges the app icon if closed)
CCTV.sel = 'break'; CCTV.setMode('one')        // show one camera big ('grid' for all)
```
Spot ids: `lobby floor floorW hall break review` (from office.js).

## Bonk SnapCam (`ItemDefs.polaroid`, BonkMart tab `goods`, section `Gadgets`, $80 for 5 shots)
`Inv.count('polaroid')` is the number of shots left (the hotbar shows it). Left click: renders your current view
(`Cams.snap`, 224x224, your own body only in third person), prints a polaroid card (256x312: cream frame, warm
instant-film grade, vignette, orange date stamp, a handwritten caption that names who is in the shot:
"Dana, hard at work", "The Boss (burn after viewing)", or the room), white screen flash (`FX.flash`), shutter
"ka-chick" + flash whine + ejection motor, then the photo is launched out of the camera front as a physics prop.
`throwable: false` (F does nothing with the camera). The just-taken photo slides in at the bottom right of the HUD
("Developing...", shots left). Photos develop over ~5 s (fade up from murky brown) on everyone's screen.

### Photo props (`PropTypes.photo`)
A thin card (0.14 x 0.17 m) that lies flat; `Props.step` is wrapped so photos in the air get strong drag, reduced
gravity, a side-to-side flutter and rocking spin (fixed-step, deterministic on every client). They land on desks
and floors, can be picked up (E, "Pick up the photo (by Dana)"), carried, thrown (F) and dropped (G) like any prop
(the prop id is the photo id). While you carry a photo it is shown big at the bottom right of the HUD.

```js
Photos.get(id)            // {id, card (canvas), cv (displayed canvas), tex, by, cap, dev (0..1 developed), url}
Photos.add(id, canvasOrDataURL, {by, cap})
Photos.card(pictureCanvas, caption, stamp)   // print a card
SnapCam.use()             // take a picture as the local player (the item's use)
```

### Net messages
| type | payload | |
|---|---|---|
| `cam:photo` | `{id, img (JPEG dataURL ~15-25 KB), by, cap, p?:[x,y,z]}` | sent before the prop's `prop:throw`; everyone stores the picture, shows a flash glint at `p` |
| `cam:photoReq` | `{id}` (to the host) | a client saw a photo prop it has no picture for (late join); the host answers `cam:photo` to that player |
The host keeps the last 32 photos' dataURLs for late joiners. Photo textures are kept while a prop uses them
(LRU of 32 otherwise) and cleared on `game:begin` / `quit`.

## Bus events
None new. Listens to `call:line` (mouth flaps), `world:built`, `game:begin`, `quit`.

## Performance notes
- One render target per size (480x270 webcam, 320x180 grid, 640x360 big, 224x224 snap), reused by every camera.
- Cameras only render while their window is visible and not minimised; grid feeds 4 fps each, webcam 12 fps.
- Effects are 2D canvas overlays + CSS filters on the canvas (GPU), backdrops drawn once and cached.
- The photo prop shares one box geometry and edge/back materials; only the front material is per photo.
