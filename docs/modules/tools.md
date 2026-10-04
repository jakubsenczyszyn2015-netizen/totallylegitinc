# Tools module: Chatterbox, Doodle Pro, Browser, BugBuster

Files: `app/js/apps/chat.js`, `app/js/apps/paint.js`, `app/js/apps/browser.js`, `app/js/apps/antivirus.js`,
`app/css/tools.css`. Scenario: `tools/scenarios/tools.js` (`TOOLS_ONLY=chat,paint,browser,av`).

Four desktop apps. Everything is drawn in code (inline SVG, canvas, CSS); no art files.

| app id | title | price | globals |
|---|---|---|---|
| `chat` | Chatterbox (purple messenger, pinned to the taskbar) | free | `Chat` |
| `paint` | Doodle Pro (replaces the old `doodle` app) | $100, shop tab `games` / `Software` | `DoodlePro`, `Paintings` |
| `browser` | Bonk Browser (pinned to the taskbar) | free | `Browser` |
| `antivirus` | BugBuster | $200, shop tab `games` / `Software` | `BugBuster` |

The purchasable apps follow the wave-2 convention: `available: () => !!(G.prog.apps && G.prog.apps[ID])`
and their own `Shop.add({ id: 'app_paint' | 'app_antivirus', tab: 'games', section: 'Software', ... })`,
with `icon` (OS glyph), `color` and `art(ctx, w, h)` (a canvas picture for the shop card).

## Chatterbox (`Chat`)

A purple chat app (header "Chatterbox — The world's most secure messaging app."), a contacts sidebar
with search, online dots and unread counters, a conversation pane with bubbles, avatars, timestamps
(in-game clock) and a typing indicator, an input + send button and the red **GOLD** gift button.

Contacts: every teammate in `Net.players` (portrait drawn from their `ext.look`: skin, hair, shirt;
teammates who left keep their thread, shown offline) plus five bots: **The Boss**, **IT Department**,
**Mum**, **Lord Bonkington III**, **Totally Real Bank**. Bots answer with canned lines after a typing
delay (keyword rules first: raise, quota, virus, password...), send idle messages now and then during a
shift, react to `scam:paid` / `scam:baited`, and the bank sometimes sends its own Chatterbox Gold.

Unread messages: `OS.badge('chat', n)` on the desktop icon and taskbar button, a ping sound and, when
the window is closed or minimised (or you are away from the desk), a `toast` with the sender's face.

**Chatterbox Gold prank:** GOLD sends a "CHATTERBOX GOLD — 1 MONTH • FREE — click to claim" gift card.
When the recipient clicks it, their desktop gets `OS.virus(12)` and a red "PRANKED!" `OS.cashFx`, a
mocking reply, and the sender gets a toast + cash sound ("Kim fell for your Chatterbox Gold!").
Sending is rate-limited to one gift per contact per 12 s. Bots react to gifts (some click them).

```js
Chat.open(contactId)            // open the app on a contact ('bot:mum', a player id...)
Chat.send(contactId, text)      // send as the local player (bots answer, teammates get Net 'chat')
Chat.gold(contactId)            // send a Chatterbox Gold gift
Chat.receive(fromId, text, gift)  // deliver a message as if fromId sent it (gift = true: a gift card)
Chat.claim(contactId, msgId?)   // click a received gift (the latest unclaimed one without msgId)
Chat.select(contactId), Chat.contacts(), Chat.nameOf(id), Chat.unreadTotal()
Chat.threads                    // Map contactId -> [{id, t, text, me, sys, gift, claimed}]
Chat.unread                     // Map contactId -> count
Chat.BOTS                       // bot definitions {id, name, status, face(), any, rules, gold, idle, every}
```
Bot ids: `bot:boss`, `bot:it`, `bot:mum`, `bot:lord`, `bot:bank`.

Net message `chat` (always sent `{to: playerId}`):
`{k: 'm', id, text}` a message, `{k: 'gold', id}` a gift, `{k: 'claim', id}` the recipient clicked
your gift `id`, `{k: 'typing'}` (at most every 2.5 s while typing).

Bus events: `chat:pranked` `{from}` (you clicked a gift), `chat:prank` `{to}` (someone clicked yours).

## Doodle Pro (`DoodlePro`) and hung paintings (`Paintings`)

A 640×400 canvas with tools pen, marker (wide, 50% alpha), spray, eraser, fill bucket (scanline flood
fill with tolerance), line, rectangle and ellipse (outline / filled toggle), brush size slider with a
preview dot, a 28-colour palette plus a full colour picker, undo / redo (20 steps, Ctrl+Z / Ctrl+Y /
Ctrl+Shift+Z), clear, a title field and the yellow **Hang it up!** button. The drawing survives
closing the window (for the session).

**Hang it up!** turns the painting into a small JPEG (320×200, ~20 KB data URL), and:
- seated at a desk: a framed canvas (dark wood frame, cream mat, brass plaque "Title" by Name) hangs
  on the left side of that desk's partition (one painting per desk: a new one replaces the old one);
- standing: a wooden easel with the painting appears up to 1.3 m in front of you, clear of walls.

Everyone sees it: `Net.emit('paint:hang', data)`; the host also shares the list of painting ids
(`Net.share('paintings')`) and late joiners request missing ones with `paint:req` (the host answers
with `paint:hang` to that player). At most 24 paintings exist; the oldest is removed first.
Paintings are cleared on `game:begin` / `quit`.

```js
DoodlePro.hang()                 // hang the current drawing (as the button does)
DoodlePro.jpeg(w, quality)       // data URL of the drawing
DoodlePro.canvas()               // the 640x400 drawing canvas
DoodlePro.stroke(tool, points, colour, size)  // draw programmatically ('pen', 'marker', 'spray', 'eraser',
                                 //   'line'/'rect'/'ellipse' use points[0..1]); DoodlePro.state.filled for filled shapes
DoodlePro.flood(x, y, colour), DoodlePro.undo(), DoodlePro.redo(), DoodlePro.clear()
DoodlePro.state                  // {tool, col, size, filled, title, ...}

Paintings.hang(jpegDataURL, {desk, name, title})  // desk index, or -1 for an easel in front of the player
Paintings.add(data)              // local only: {id, img, name, title, desk} or {id, img, name, title, pos:[x,z], ry}
Paintings.remove(id), Paintings.clear(), Paintings.list   // Map id -> {data, group, tex}
```
Net messages: `paint:hang` (the data above, validated: JPEG data URL < 400 KB), `paint:req` `{id}`.
Bus events: `paint:hung` (data) when a painting appears in the scene, `paint:hang` (data) when you hang one.

Performance: frame / easel geometries and the wood materials are shared; each painting adds one
320×240 canvas texture and one material (disposed on removal).

## Browser (`Browser`)

"Bonk Browser": tabs (new / close / switch, favicon spinner while loading), back / forward / reload /
home, an address bar (type a URL, or anything else to search BonkSearch), a bookmarks bar, a loading bar.
Sites (all links between them work):

| url | site |
|---|---|
| `bonk://newtab` | new tab page: search box + tiles |
| `bonksearch.legit` | BonkSearch home ("I'm Feeling Legit" opens a random site) |
| `bonksearch.legit/search?q=...` | joke results (keyword hits + generated ones), featured snippet, a sponsored "hot staplers" ad |
| `dailybonk.news` | The Daily Bonk front page |
| `dailybonk.news/quota` | the article "Local call center hits quota, nobody knows how" (quotes live team money, quota and the top agent) |
| `intranet.totallylegit.inc` | Employee Portal: live quota bar, employee of the moment, team leaderboard (`Game.roster()`, refreshed every second), Boss announcements, cafeteria menu |
| `vidbonk.tv/watch?v=cat|stapler|ball|hum` | VidBonk with a looping canvas cartoon (cat vs mug, stapler backflip, paper-ball trick shot, 10 h of light hum), comments, recommendations; `x1..x3` are "unavailable" |
| `howtobonk.legit/look-busy` | "How to Look Busy at Work: 7 Steps (with Pictures)" with SVG illustrations |
| anything else | 404 "This page has been scammed." |

```js
Browser.go(url)            // open the browser if needed and navigate the current tab
Browser.newTab(url)        // open a new tab
Browser.back(), Browser.fwd(), Browser.current()   // current tab's url
Browser.SITES              // {key: {host, match(u), title(u), fav, render(u, tab)}}: add your own site
Browser.route(url), Browser.norm(input), Browser.VIDS, Browser.drawVid(ctx, id, t, w, h)
```
Adding a site from another module: `Browser.SITES.mysite = { host: 'my.site', title: () => 'My Site',
fav: { g: 'star', c: '#e64980' }, render: (u, tab) => h('div', {}, '...') }` (`u = {host, path, q}`;
set `tab.live = fn` to be called once a second while the tab is visible).

## BugBuster (`BugBuster`)

Dark antivirus window with a home screen (status hero: protected / at risk / probably fine, stats,
Real-time Shield row), **Scan now** (6.5 s: animated progress ring, phases, scrolling file names, silly
threats popping in: Trojan.Kazoo, Worm.Stapler, Spyware.BossCam, Backdoor.Fridge...; plus
`Popup.Storm` when pop-ups are open and `Trojan.ChatterboxGold` after you clicked a gift), a results list
with severity bars, and **Quarantine all**: `OS.clearPopups()`, squashed-bug animation and a 3-minute
**shield**.

The shield wraps `OS.popup` (so also `OS.virus`): while it is up, new pop-ups are swallowed (a toast
says how many were blocked). Pass `{force: true}` to `OS.popup` to show one anyway.

```js
BugBuster.shielded()       // true while the shield is up
BugBuster.left()           // seconds of shield left
BugBuster.shield(sec)      // raise it (default 180 s);  BugBuster.off()
BugBuster.blocked          // pop-ups blocked this session
BugBuster.THREATS, BugBuster.art, BugBuster.logo
```
Saved: `G.prog.antivirus = {squashed, scans}`.
Bus events: `antivirus:clean` `{threats, popups}`, `antivirus:block` (the blocked popup's opts).

## Testing

`tools/scenarios/tools.js`: chat with Mum and The Boss (typing indicator, replies), the bank's Gold gift
claimed (pop-up storm + PRANKED), a fake teammate through the real `chat` Net handler (message, our
Gold gift claimed), toast + badge with the app closed; Doodle Pro bought, a drawing made with the real
tools, hung on the desk partition, viewed in the office, an easel + a remote painting via `paint:hang`;
every browser site + back/forward; BugBuster scan, results, quarantine and a blocked storm.
The scenario un-buys the apps at the start and the end (the harness profile is shared between runs).
