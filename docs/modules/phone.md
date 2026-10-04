# Phone module: calls, callers, scheme apps, NosyViewer, Script

Files: `app/js/call.js` (call engine), `app/js/data.js` (schemes, caller cast, portraits), `app/js/brain.js`
(offline caller AI), `app/js/ai.js` (LLM prompt), `app/js/apps/phone.js` (Phone window),
`app/js/apps/schemes.js` (scheme apps + Playbook), `app/js/apps/remote.js` (NosyViewer),
`app/js/apps/script.js` (Script notebook), `app/css/phone.css`. Scenario: `tools/scenarios/phone.js`.

## Call engine (`Call`)

States: `off → idle → ringing → live → ended → idle …` (`Call.state`). The current call is `Call.cur`.

| call | what it does |
|---|---|
| `Call.ring(baiter?, typeId?)` | ring now. `typeId` forces a caller archetype (see `CALLER_TYPES`), handy in tests |
| `Call.answer()` / `Call.decline()` | pick up (opens the Phone if the desktop is up) / reject |
| `Call.say(text)` | the agent says a line; the reply comes from the LLM (if configured) or `offlineReply` |
| `Call.apply(call, reply)` | apply a reply `{ say, trust_delta, steps_done: [0-based], hangup }` |
| `Call.setScheme(id)` | run a scheme on the caller (opens its window) |
| `Call.submitForm({ field: value })` | verify form fields; returns `{ ok: [fields], bad: [fields] }` |
| `Call.submitPin(value)` | check a PIN step (the customer PIN found in NosyViewer) |
| `Call.connectRemote(code)` | NosyViewer: connect with the code the caller read out; `true` on success |
| `Call.finish(call)`, `Call.hangup()`, `Call.end(result)`, `Call.reset()`, `Call.shut()` | as before |

`Call.cur` fields: `caller`, `trust` (0-100), `scheme`, `steps` (bools), `history` (`{who: 'you'|'them'|'sys', text}`),
`turns`, `busy`, `waiting` (true while waiting for the caller's reply), `codeGiven` (the caller read out the
NosyViewer code), `remote` (connected), `formOk` / `formBad` (`{field: true}`), `flag` (Bait Detector), `result`, `paid`.

### Bus events

Existing: `call:ring`, `call:answer`, `call:line`, `scam:paid`, `scam:baited`, `call:end` (see ARCHITECTURE.md).
New:

| event | args | when |
|---|---|---|
| `call:code` | `call` | the caller read out their NosyViewer connection code |
| `call:remote` | `call` | the agent connected to the caller's computer |

No new Net messages: calls are local to each player (the LLM relay for clients is unchanged: `Net.askHostAI`).

### The NosyViewer flow

A scheme step with `remote: true` (`STEP_REMOTE`) is judged like a normal step, but when the caller agrees they read
out a one-time code (`caller.nosy`, e.g. `029-527`) instead of the step completing. `Call.apply` sets
`call.codeGiven`, appends the code to the reply if the LLM forgot it, emits `call:code` and opens NosyViewer.
The step completes when the agent types the code into NosyViewer (`Call.connectRemote`). The next step (`STEP_PIN`)
asks for the customer PIN, which sits in one of `caller.files` (there is also a decoy "old PIN" file).

## Callers (`makeCaller(dayN, baiter?, typeId?)`)

`CALLER_TYPES` is the cast: `granny` (wizard hat), `astro` (Commander, space helmet), `crypto` (shades, chain),
`influencer` (hoops, ring light), `captain` (yacht captain hat, beard), `cowboy`, `chef` (toque), `gamer` (cap),
`tinfoil` (tinfoil hat), `knitter` (flat cap, yarn), `gym` (headband, tank top), `diva` (tiara, boa),
`scientist` (Dr., goggles), `regular` (random look). Each type maps to a persona and adds a nickname pool,
greeting lines, quirks with their own lines, a voice tweak, a look and a file for their desktop.

Caller fields: `first`, `last`, `name` (`first last`, unchanged), `nick`, `title`, **`full`** (`COMMANDER ROSA "MOONBOOTS" VALDEZ`
style, use it for display), `type`, `typeLabel`, `about`, `persona` (`PERSONAS` entry; new persona `dramatic`),
`L` (persona lines merged with the type's), `quirk`, `quirkL`, `pet` (`{name, kind}`), `age`, `baiter`, `pitch`, `rate`,
`seed`, `files` (`{n, c, kind: 'txt'|'img'|'xls'|'dir'}`), `pin`, `nosy`, the form details (`card exp cvc gift giftpin acct
bankpin otp ctz dob user pass bcode paw petmid`) and `look` (for portraits).

### Portraits

`portraitSVG(caller, mood, talking?)` returns an SVG string (viewBox 120×120, transparent background).
`mood`: `angry | wary | neutral | trusting` (`moodOf(trust)`). Faces vary in shape, skin tone, hair style and colour,
glasses, beards, freckles, wrinkles, lashes, lipstick; each archetype adds its accessories. The mouth is drawn twice
(`.mo-a` mood mouth, `.mo-b` open): put the SVG inside an element with class `pt` and toggle class `talk` on it to make
the caller speak (CSS flips the mouths; no re-render). `MOOD_LABEL` / `MOOD_COLOR` give the Phone's mood word and colour
(`Angry` red, `Suspicious` orange, `Neutral` blue, `Trusting` green). `PT.mix(a, b, t)` mixes two hex colours.

## Schemes (`SCHEMES`)

Sorted by unlock day (`Game.unlocked()` slices the list). Step fields: `t`, `k` (keywords for the offline brain), `min`
(trust), `lines` (Script suggestions, `{first} {agent} {pet}` placeholders), `form` (fields from `F`), `pin`, `remote`.
Scheme fields: `id name emoji icon color brand art unlock reward pitch steps tips`.
New form schemes: **ID Verifier** (`idv`: Citizen Number `CTZ-0000-00` + date of birth), **Bonk Bank Online**
(`bonkweb`: username, password, `BNK-0000` text code), **Pet Passport Office** (`petpass`: `PAW-0000-00` + the pet's middle name).
`F.<field>` = `{ f, label, ph (format hint), len, say, k, reveal(caller) }`.

## Apps

| id | what |
|---|---|
| `phone` | the Phone window (`Phone`), pinned |
| `sch_<id>` | one scheme app per scheme (`schemeApp(s)`): seal header, brand card, `Reward` + `n / m done`, numbered checklist, form with per-field Verify ("Verified ✓", masked values), PIN entry, NosyViewer note |
| `nosy` | NosyViewer (`Nosy`): connect screen with instructions panel, then the caller's mini desktop and file viewer, pinned |
| `script` | Script notebook (`Script`): caller card (likes/hates from the persona), suggested lines per step (click pastes into the Phone), recovery lines, Notes + My lines saved in `G.prog.script = { notes, mine: [] }`; pinned (inserted after `phone` in `OS.pinned`) |
| `playbook` | how-to + scheme list (opens scheme apps) |

### Phone API

`Phone.render(body, win)`, `Phone.refresh()`, `Phone.bubble(who, text, name)`, `Phone.typing(on)`, `Phone.rebuildLog()`,
`Phone.alive()` (unchanged), plus:
- `Phone.paste(text)` — put text in the Phone input and focus it (opens the Phone).
- `Phone.talk(text)` — animate the portrait mouth and the waveform as if the caller were speaking (used when the
  voice is off; real TTS is detected through `TTS.speaking`). `Phone.talking()` tells whether they are.
- `Phone.r` holds the DOM refs (`r.inp` is the input, as before).

The waveform strip under the portrait shows blue bars while the caller speaks, orange while your mic listens
(`STT.active`), dots when silent. The status line shows `MESSAGE SENT - WAITING` (`call.waiting`), `SPEAKING`,
`LISTENING...`, `INCOMING CALL...` and the call result.

Other helpers: `sealSVG(scheme)` (round seal with the scheme glyph), `schemeArt(scheme)`, `callNorm(value)`
(normalise typed codes), `OS.glyphs.paw` (added by schemes.js).
