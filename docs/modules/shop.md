# Shop module: BonkMart Market (`app/js/apps/shop.js`, `app/css/shop.css`)

The in-game store. A free desktop app (`OS.apps.shop`, icon `bag`, orange tile) that renders the
`Shop` registry from `core.js` as **tabs > sections > product cards** with big hold-to-buy buttons.
It also registers its own catalog: scheme licences, phone upgrades, office perks and the Chaos goods
(airstrikes, pizza party, inflatable boss, gold-plated stapler). Scenario: `tools/scenarios/shop.js`.

## The window
- Dark header with the BonkMart wordmark (green price-tag "$" mark, name, yellow `MARKET` tag), "Hello, <name>" and
  the Bonk Pay wallet balance (`G.wallet`).
- Tabs: `scams` Scams, `apps` Business apps, `games` Games & software, `goods` Physical goods.
- Each tab lists its sections (title strip tinted with the tab colour) and a responsive card grid (3 columns in the
  default 820 px window, 5 when maximised).
- Card: picture (see below), name, optional level pips, description, price in red, and the button:
  - yellow **HOLD TO BUY**: press and hold 0.7 s, the button fills up, then it buys (rising charge tone, cash sound,
    a chunky "-$250" pop with a coin burst on the card). Releasing early cancels.
  - red **NEED $X**: not enough money (clicking shakes it).
  - grey **OWNED** (or the item's `ownedLabel`) for owned one-time items.
  - lilac blocked label (e.g. "Party in progress") when `blocked()` returns text.
  - "You have N" chip on the picture for repeatable items you carry (`Inv.count`).
- The window refreshes itself 4x per second while visible (wallet, inventory, owned states). If the set of items
  or their sections changes, the grid is rebuilt (scroll position kept). `OS.refresh()` also updates it.

## Registering an item (any module, at load time)
```js
Shop.add({
  id: 'mace', tab: 'goods', section: 'Weapons & personal safety',   // tab: scams | apps | games | goods
  name: 'Bear Mace', desc: 'A pocket-sized performance review.',    // desc may be a function (dynamic text)
  price: 35,                                                        // number, getter or function (dynamic prices)
  icon: 'shield', color: '#7048e8',                                 // OS.glyphs name, inline '<svg…>' or emoji; picture background
  owned: () => false, repeatable: true,                             // repeatable items never show OWNED
  available: () => true,                                            // false hides the card
  buy() { Inv.give('mace'); },                                      // called AFTER the shop took the money
  sort: 10,                                                         // order inside the tab
  // optional extras understood by BonkMart:
  ownedLabel: 'Maxed out',          // text instead of OWNED (string or function)
  blocked: () => '',                // non-empty string = temporarily not buyable, shown on the button
  level: () => [lv, max],           // level pips under the name
  count: () => n,                   // the "You have N" chip (default for repeatable items: Inv.count(item || id))
  item: 'mace',                     // ItemDefs id when it differs from the shop id
  art(ctx, w, h) {},                // draw the picture on a canvas (380 x 200), cached per id
  svg: '<svg…>',                    // or a picture as SVG markup (string or function)
  model: () => object3D             // or a 3D model to render as the picture
});
```
**Picture priority:** `art` → `svg` → a 3D render of `model()` or `ItemDefs[item || id].model()` (rendered once with
the game renderer into a small render target, cached as a data URL; a glyph tile shows until it is ready) → a glyph
box-art tile for `icon` (glyph name / emoji) → the inline SVG icon.
Section order per tab is fixed for the known sections (`BonkMart.SECTIONS`); unknown sections follow in
registration order. Sections may be functions too.

## API
| call | what it does |
|---|---|
| `BonkMart.open(tab)` | open (or focus) the store on a tab (`'scams'`, `'apps'`, `'games'`, `'goods'`) |
| `BonkMart.buy(id)` | buy an item programmatically through the normal path (checks, payment, `buy()`, pop sounds); returns true on success |
| `BonkMart.state(item)` | `[state, label]`: `buy`, `need`, `owned`, `blocked` |
| `BonkMart.priceOf(item)` | current price (handles getters / functions) |
| `BonkMart.holdMs` | hold duration (700 ms) |
| `BonkMart.calcBadge()` | recompute the badge threshold |

**Buying** (one path for everything): the item must be available, not blocked, not owned (unless repeatable) and
`G.wallet >= price` → `Game.addWallet(-price)` → `item.buy()` (if it throws, the money is refunded) → cash sound →
a toast `"<name> purchased"` unless `buy()` showed its own → `Bus.emit('shop:buy', {id, price, item})` →
`Game.saveProgress()`.

**Badge:** BonkMart remembers the cheapest buyable item you could not afford; when the wallet reaches it,
`OS.badge('shop', true)` (red "!" on the desktop icon and taskbar button). Opening the store clears it.

## Catalog registered here
### Scams tab: scheme licences (`lic_<schemeId>`)
One per scheme in `SCHEMES`, price `reward x 1.5` (rounded to $50, min $150), certificate art in the scheme colour.
Owned licences live in `G.prog.licences = { tax: true, … }`. On `boot` BonkMart wraps `Game.unlocked()` so it returns
the normal list **plus** licensed schemes, in `SCHEMES` order (desktop icons, the phone's scheme picker, the playbook
and the memo all pick them up). Normally unlocked schemes show `INCLUDED` in "Already on your desk".

### Business apps tab
- **Phone upgrades** (`up_<id>`): the classic `UPGRADES` from `data.js` as level-ups, price `cost x (level + 1)`,
  level pips, `MAXED OUT` at max; writes `G.up[id]` exactly like `Game.buy`.
- **Office perks** (`perk_<id>`, one-time, `G.prog.shop.perks`):
  - `poster` Motivational Poster Pack ($350): +5% on every scam (`scam:paid` → `Game.earn` + half to the wallet).
  - `chair` Ergonomic Chair ($250): walk/run speed x1.12 (scales `PC.walk` / `PC.run`, restored on quit / new save).
  - `coffee` Coffee Subscription ($200): a fresh coffee buzz (`P.boost` jump) lasts twice as long.
  - `jazz` Smooth Jazz Ringtone ($180): callers ring 10 s longer before it is a missed call (wraps `Call.ring`).

### Physical goods tab, section "Chaos"
| id | price | effect (everyone sees it) |
|---|---|---|
| `chaos_rival` | $2,500 | "Airstrike the Rival Call Centre": hazard banner, siren, six distant mushroom explosions on the skyline outside the west/south windows, rumbles + screen shake; the buyer earns +$1,000 team money (`Game.earn`). Repeatable. |
| `chaos_strike` | $1,500 | "Airstrike Yourselves": banner + siren + red tint, then ~13 explosions across the office (one near every player) with incoming whistles, flying paper sheets, small fires, scorch marks and paper-ball props (host launches them); anyone within 3.4 m is knocked back and stunned (players fall over), coworkers and the boss react. Repeatable. |
| `chaos_pizza` | $250 | "Pizza Party": stacked + open pizza boxes on the break-room table for 150 s, confetti, everyone's `P.boost` (walk faster); press E at the table for one free slice (another boost). Repeatable (blocked while a party is on). |
| `chaos_boss` | $800 | "Inflatable Boss": a 3 m shiny vinyl boss with flailing tube-man arms in the lobby (NE corner, visible through the glass front doors). Saved in the buyer's `G.prog.shop.boss`. One-time. |
| `chaos_stapler` | $1,200 | "Gold-Plated Stapler": a gold stapler on a red velvet cushion on your desk (the desk you sit at / last sat at), glinting; others see it on your desk. `G.prog.shop.stapler`. One-time. |

`Chaos` (global) runs these: `Chaos.order(k)` (buyer: run locally + broadcast), `Chaos.run(d)`, `Chaos.busy()`
(an airstrike is in the air), `Chaos.st` (`{boss, pizza}`), `Chaos.banner(title, sub, 'blue'?)` (the hazard banner,
reusable for raids etc.), `Chaos.after(sec, fn)` (game-time scheduler). `ChaosArt` builds the models
(`stapler()`, `pizzaBox(open)`, `missile(label, colour)`, `balloonBoss()`), sharing geometry and materials.

## Net
- `Net 'shop:chaos'` `{k: 'strike' | 'rival' | 'pizza' | 'boss', by: name, pts?: [[x, z, t], …]}` — the buyer runs the
  effect and broadcasts it; every client plays it (the airstrike plan, with times, is computed by the buyer so all
  screens match). The host alone launches the paper-ball props (they sync through `prop:throw`).
- `Net.share('chaos')` `{b: 0|1, p: pizzaSecondsLeft}` — late joiners get the inflatable boss and running pizza party.
- `Net.addMe('stapler')` — `deskIndex + 1` of your stapler (0 = none); everyone draws it on that desk.

## Bus
- Emits `shop:buy` `{id, price, item}` after every purchase.
- Listens: `boot` (wraps `Game.unlocked`, `Call.ring`), `game:begin` (reset), `save:loaded` (perks, boss, badge),
  `day:start` (pizza cleared), `quit`, `scam:paid` (posters), `player:sit` (stapler desk).

## DOM / CSS
`.win.bonkmart` window; `.bm-head`, `.bm-tabs`/`.bm-tab.on`, `.bm-scroll`, `.bm-sec`, `.bm-grid`, `.bm-card`
(`.bm-pic`, `.bm-name`, `.bm-desc`, `.bm-price`, `.bm-btn.buy|need|owned|blocked|bought|hold`), `.bm-pop`;
`#bm-alert` (the airstrike banner, `position: fixed`, z-index 9800, above the desktop and the 3D view).
