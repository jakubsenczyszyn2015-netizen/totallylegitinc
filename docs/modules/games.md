# Games module: Cosmic Cookie + LuckyBonk Casino

Files: `app/js/apps/cookie.js`, `app/js/apps/casino.js`, `app/css/games.css`. Scenario: `tools/scenarios/games.js`.
Both are **purchasable desktop apps** (BonkMart, tab `games`, section `Software`). Each file registers its own app
and its own shop item. CSS prefixes: `.ck-*` (cookie), `.lb-*` (casino). Do not use `cz-` (the character creator owns it)
or a bare `.win` class inside a window (that is the OS window class).

## Cosmic Cookie (`OS.apps.cookie`, $150)

An idle clicker. It replaces the old Paperclip Empire app (`OS.apps.clips` is gone; `G.clips` in game.js is now unused).

- Big chunky SVG cookie that squishes on click, with `+N` floating numbers and crumbs. Rotating sunburst, star field,
  cookie rain whose density follows production.
- Progress bar to the next **milestone** (lifetime mass 100, 1k, 10k… named Crumb Collector → Cookie Deity). Each milestone gives +5% production.
- Tabs: **Automation** (10 units, Intern → Cookie Singularity; BUY 1 / BUY 10 / MAX, price ×1.15 per unit owned; every 25 owned = a
  new tier that doubles that unit), **Click Power** (one-off upgrades: clicks ×N or +% of CPS per click), **Boosts** (Golden Cookie Lure,
  Frenzy ×7 30 s, Click Frenzy ×10 15 s, Sugar Rush ×2 2 min; cost = minutes of production, with cooldowns), **Synergies** (10 unit pairs;
  need 10 of each; A +3% per B owned, B +1% per A owned).
- Golden cookies drift across the stage every 1–2.5 min while the window is open: Lucky lump, Frenzy or Click Frenzy.
- **LIFETIME COOKIE MASS** in big-number words (`77.946 Thousand`, Million … Decillion) plus the raw number.
- Keeps baking while the window is closed (a `Loop` hook), saves to `G.prog.cookie` every ~10 s (`Game.saveProgress()`) and on close.
- Cookies are never money, except the joke **Sell to the break room** button: all cookies (min 1,000) → `Game.addWallet(1)`, 2 min cooldown.

### API (`Cookie` global)

| member | |
|---|---|
| `Cookie.state()` | the save object `G.prog.cookie` = `{ c, life, clicks, units: {id: n}, up: {id: 1}, syn: {id: 1}, b: {frenzy, clickf, rush: secs left}, cd: {id: secs}, ms, golden, sold }` |
| `Cookie.rate()` / `Cookie.click()` | cookies per second (with boosts) / cookies per click |
| `Cookie.buyUnit(id, n)` | buy `n` units (or `'max'`) if affordable; returns true on success |
| `Cookie.dirty()` | call after editing `state()` by hand (clears the production cache) |
| `Cookie.UNITS`, `CLICKS`, `BOOSTS`, `SYN` | catalog arrays |
| `Cookie.named(n, round)`, `fmt(n)`, `short(n)` | number formatting: `'77.946 Thousand'`, `'4,200'`/`'1.234 Million'`, `'1.54M'` |
| `Cookie.cookieSVG(gold)`, `Cookie.art(ctx, w, h)` | cookie artwork (SVG string) / shop picture painter |

Window hooks (on the `win` object while open): `win.gold()` spawns a golden cookie, `win.banner(big, small)` shows a banner.

Glyphs added to `OS.glyphs`: `ck_intern ck_micro ck_grandma ck_farm ck_mine ck_cartel ck_printer ck_moon ck_toaster ck_sing ck_mouse ck_mitt ck_kbd ck_mug`.

## LuckyBonk Casino (`OS.apps.casino`, $300)

Dark purple neon "LUCKYBONK — ORIGINAL OFFICE CASINO" window: header with SESSION net and PERSONAL BALANCE (the Bonk Pay wallet),
8 game tabs, a game panel + ROUND STATUS side panel (status, game options, history pills), a wager bar (chips $10 $20 $50 $100 $250 +
custom amount, SELECTED $x, one big action button) and a responsible-ish joke footer.

Every bet is `Game.addWallet(-bet)` up front; wins pay `Game.addWallet(floor(bet × multiplier))`. RNG is `Math.random`, outcomes are
decided when the round starts (so closing the window mid-round settles it fairly: crash cashes out at the current multiplier, mines cash
out or refund, everything else pays its already-decided result).

| game | rules | house edge |
|---|---|---|
| Crash | multiplier `e^(0.13 t)`; pop point `0.97 / (1 - r)` (3% pop on the pad); cash out any time, optional auto cash out | 3% |
| Slots | 3 reels, office symbols (Paperclip, Boss Mug, Desk Phone, Power Tie, Red Stapler, Bonk Coin); 3 of a kind on the middle line pays 5–600×, first two reels 2–5× | ~5% |
| Plinko | 10 rows, 11 buckets `22 3 1.5 1.1 0.9 0.4 0.9 1.1 1.5 3 22`; path is 10 fair left/right bounces, animated peg by peg; many balls at once | ~4% |
| Dice | roll 0–99.99 over/under a slider target (2–98); pays `98 / chance` | 2% |
| Mines | 5×5, 1/3/5/10/24 bombs; after k gems pays `0.97 × C(25,k) / C(25−m,k)`; cash out any time | 3% |
| Coinflip | Heads (The Boss) / Tails (Bonk), 3D flip; pays 1.96× | 2% |
| Keno | pick 1–10 of 40, 10 drawn one by one; paytable `Casino.KENO[picks][hits]` | ~5% |
| Roulette | European wheel (37 pockets), one bet per spin on a felt table: number 36×, dozens 3×, red/black/odd/even/halves 2× | 2.7% |

Wins: coin burst (small), confetti + coins + "BIG WIN!" banner (≥3× or ≥$150 profit), "MEGA WIN!" + `OS.cashFx('+$x')` (≥10× or ≥$500 profit).
Losses: a sad trombone (a filtered brass "wah wah wah waaah", throttled to one per 3 s; plinko misses get a soft thud).

### API (`Casino` global)

| member | |
|---|---|
| `Casino.open(gameId)` | open the casino window on a game (`crash slots plinko dice mines coin keno roulette`), returns the window |
| `Casino.GAMES` | game definitions `{ id, name, icon, mount(ctx) }` |
| `Casino.KENO`, `PLK`, `PAY3`, `PAY2`, `REEL` | paytables |
| `Casino.symbols` | slot symbol SVG strings by id |
| `Casino.trombone()` | play the sad trombone |
| `Casino.art(ctx, w, h)` | shop picture painter |

While open, `win.casino = { select(id), ctx, game, id }` (scenarios use it). `G.prog.casino` keeps per-save preferences:
`{ tab, bet, auto, lastCrash, dice: {t, over}, mines, side, keno: [numbers], rbet, wagered, won }`.

Glyphs added to `OS.glyphs`: `lb_chip lb_cherry lb_plinko lb_wheel lb_bomb lb_coins`.

## Events and messages

| name | kind | payload | when |
|---|---|---|---|
| `cookie:click` | Bus | cookies gained | the big cookie was clicked |
| `cookie:milestone` | Bus | `{ n, name }` | a lifetime milestone was reached |
| `casino:result` | Bus | `{ game, bet, payout, mult }` | any casino round settled (payout 0 = lost) |
| `casino:big` | Net | `{ name, amt, game }` | a player hit a ≥10× / ≥$500-profit win; everyone else gets a toast |

## Shop items

`app_cookie` ($150, icon `cookie`, `#c2702a`) and `app_casino` ($300, icon `lb_chip`, `#6741d9`), tab `games`, section `Software`,
each with `art(ctx, w, h)`. `buy()` sets `G.prog.apps[id] = true`, saves and rebuilds the desktop icons; `available()` of the apps checks the same flag.
