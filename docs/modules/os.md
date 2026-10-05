# OS module: LegitOS (desktop shell)

Files: `app/js/os.js`, `app/css/os.css`, `app/js/apps/office.js` (Settings, Payroll, Memo),
`app/js/apps/wallpapers.js` (wallpaper painter + Wallpapers app). Scenario: `tools/scenarios/os.js`.

LegitOS is the full-screen desktop you get when seated at a desk (`sitAt` -> camera zoom -> `OS.show()`).
It has a boot screen, a procedural photo wallpaper, a column grid of desktop icons, white windows,
a dark taskbar with money/quota/review stats and a clock, an incoming-call card, big money pop-ups
and fake alert pop-ups.

## Registering an app

```js
OS.apps.myapp = {
  desktop: true, order: 50, available: () => true,  // desktop icon (sorted by order); hidden when available() is false
  title: 'My App', color: '#2f9e44',                 // window title and tile colour
  icon: 'cookie',                                    // a glyph name from OS.glyphs, or raw '<svg …>' markup
  emoji: '🍪',                                       // fallback; common emojis are mapped to a glyph automatically
  w: 420, h: 520,                                    // window size in px (h optional = auto height)
  x: 0.3, y: 0.05,                                   // default position as a fraction of the desktop area
  cls: 'myapp',                                      // extra class on the window (.win.myapp) for your CSS
  top: true,                                         // optional: stays above the fake alert pop-ups (BugBuster uses it)
  render(body, win) {}, refresh(body, win) {}, onClose(win) {},
  direct() {}                                        // instead of a window, just run this (e.g. Settings)
};
```

- Window ids are the app ids. The Phone window is `'phone'`, scheme apps are `'sch_<scheme id>'`.
- `render` gets the window body (`.wb`, white, padded, flex column, scrolls) and the window object
  `win = { id, el, body, def, tb, maxBtn }`. Store your timers on `win` and clear them in `onClose`.
- `refresh` is called by `OS.refresh()` (the call code calls it on every call state change).
- Unlocked schemes automatically get desktop icons after the regular apps.
- The shell copes with any number of icons: they flow in columns from the top-left (~6 rows at 720p).

### Glyphs

`OS.glyphs` (24x24, drawn white on the tile). Available names:
`phone camera globe script doc book bag cart shield cookie dice chat palette image card gift bank id
monitor trophy virus bug envelope chart gear power eye clip cash coin lock key user users star bolt heart
music clipboard folder search cctv receipt crown refresh box calc gamepad warning x check plus door home
briefcase wifi clock calendar flame pencil megaphone tv mic speaker smile target trash grid sun cloud
download rocket hand pizza skull`.
Add your own at load time: `OS.glyphs.slots = '<path d="…"/>'` (white fill/stroke is inherited;
use `fill="none" stroke-width="2"` for line icons).
Helpers: `OS.glyph(name)` -> `<svg>` string, `OS.tile(def, cls)` -> a coloured tile element (`<i>`),
`OS.iconHTML(def)` -> the tile's inner markup.

## Shell API

| call | what it does |
|---|---|
| `OS.build()` | builds the DOM once at boot (main.js) |
| `OS.show()` / `OS.hide()` | open / close the desktop (show plays the boot screen, opens the Phone and the day's Memo) |
| `OS.reset()` | closes every window and pop-up (new game / quit) |
| `OS.launch(id, quiet)` | opens (or restores and focuses) an app window, returns `win`; `quiet` skips the sound |
| `OS.close(id, instant)` | closes a window (animated unless `instant`) |
| `OS.minimise(id)`, `OS.maximise(id)` | minimise / toggle maximise |
| `OS.focus(win)` | bring to front |
| `OS.refresh()` | re-run every open window's `refresh`, sync the call card and taskbar |
| `OS.taskbar()`, `OS.stats()`, `OS.buildIcons()` | redraw those parts (stats is called ~5x/s by main.js) |
| `OS.wins` | `Map` id -> `win` of open windows; `OS.open` is true while the desktop is up |
| `OS.badge(id, on)` | red badge on an app's desktop icon and taskbar button: `true` shows "!", a number/string shows that, `false` clears |
| `OS.attention(id, on)` | make an app's taskbar button blink (the phone blinks by itself while ringing) |
| `OS.pinned` | array of app ids always shown in the taskbar (default `['phone', 'playbook', 'nosy']`); push yours |
| `OS.cashFx(text, bad)` | huge chunky money pop-up over the desktop (`'+$250'`; `bad` = red, e.g. `'BAITED'`) |
| `OS.popup(opts)` | a cheesy fake-alert window. `opts` optional: `{ title, head, text, icon, color, ok, bar, flash }` |
| `OS.virus(n)` | a storm of `n` pop-ups; `OS.popups` counts the open ones (`#os-wins .popup` elements) |
| `OS.clearPopups()` | removes every pop-up, returns how many there were (antivirus scan) |
| `OS.fastBoot` | set `true` to skip the boot screen (test scenarios) |
| `OS.power(on)` | open/close the start menu (Stand up, Wallpapers, Settings, Quit to main menu) |
| `OS.clock()` | `['4:37 PM', 'Mon, Aug 24, 2026']` in-game time and date (see below) |
| `OS.setWallpaper(id)` | show a wallpaper (normally use `Wallpapers.set(id)`) |
| `OS.logoSVG` | the LegitOS mascot (a winking desk phone with a halo) as an SVG string |

DOM ids other modules may rely on: `#os`, `#os-wall`, `#os-icons`, `#os-wins` (windows and pop-ups),
`#os-modal` (call card), `#os-fx` (money pop-ups), `#taskbar`, `#tb-run`, `#tb-stats`, `#tb-clock`, `#powermenu`.
Z order inside `#os`: windows 20+, pop-ups 8000+, taskbar 8600, call card 9000, start menu 9200, money 9500, boot 9900.

### Clock and date

Week mode: the shift runs from 4:00 PM to midnight over the day length; day 1 is Monday, Aug 24, 2026,
and each further day advances on weekdays (day 6 = Monday, Aug 31). Endless mode shows the real clock and date.

### Taskbar stats

`PERSONAL $x` (green), `TEAM $x / QUOTA $y` (green / yellow), `PERFORMANCE REVIEW m:ss` (red, blinks in
the last 30 s). Endless mode: `TEAM $x` and `OVERTIME`. A Bonk Pay pill on the left of the stats shows `G.wallet`.

## Boot screen

`OS.show()` shows a black monitor boot screen with the LegitOS logo and a loading bar: 1.2 s the first time
you sit down in a shift (key: mode, slot, day), 0.3 s after that. The wallpaper is painted while it is up
(the boot waits for it, at most 4 s).

**Test scenarios:** `page.sit()` waits ~0.9 s, so a screenshot taken right after it shows the boot screen.
Either wait ~1.8 s more, or run `window.__tli.OS.fastBoot = true` before sitting down.

## Incoming call card

Shown automatically while `Call.state === 'ringing'` and the desktop is open (driven by `Bus 'call:ring'`
and `OS.refresh()`): round portrait (`portraitSVG(caller, 'neutral')`), name, "Incoming Call...",
red decline (`Call.decline()`) and green answer (`Call.answer()` + `OS.launch('phone')`).

## Wallpapers

`Wallpapers` (global, apps/wallpapers.js):
- `Wallpapers.list` — scenes `{ id, name }`: `canyon` (default), `alpine`, `ocean`, `forest`, `city`, `logo`.
- `Wallpapers.set(id)` — saves `settings.wallpaper` (`saveSettings()`), emits `Bus 'wallpaper'` (id) and repaints
  the desktop; returns a Promise that resolves when the new wallpaper is on screen.
- `Wallpapers.current()` — the selected id.
- `Wallpapers.renderAsync(id)` — Promise of the full-screen element, painted in ~10 ms slices so the game keeps running (cached, max 3).
- `Wallpapers.render(id, w, h)` — synchronous `<canvas>`/`<svg>` element; pass `w, h` for a thumbnail.
- `OS.setWallpaper(id)` returns the same kind of Promise.

Each landscape is painted procedurally (no image files): sky gradient + sun glow, a lit perspective cloud
layer, a heightfield terrain raycaster with sun light, cast shadows, haze and per-pixel cliff strata,
physically mirrored water with ripples and sun glitter, then vignette and film grain. A full-screen
render takes ~0.3-1 s of time-sliced work, done while the boot screen is up (the boot waits for it: min 1.2 s, max 4 s).

The **Wallpapers** app (`OS.apps.wallpapers`) shows thumbnails; also reachable from the start menu and
by right-clicking the desktop.

## Office apps (apps/office.js)

- `settings` — opens the settings modal (`direct`).
- `payroll` — team total vs quota with a progress bar, ranked agents with bars, calls/scams/baited stats.
- `memo` — an email from The Boss for the day: quota, today's schemes as clickable chips, tips.

## Events

- Listens: `call:ring`, `call:answer`.
- Emits: `wallpaper` (id) when the wallpaper changes.
