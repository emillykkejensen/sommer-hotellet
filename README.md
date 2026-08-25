# Sommer Hotellet

Et hotelspil for børn — tag imod gæster, lav mad, gør værelserne klar. Ingen point at
tabe, ingen måde at ødelægge noget.

A hotel game for children (roughly ages 4–8), in Danish. Run the reception, make up the
rooms, cook in the kitchen, lay towels by the pool and tend the garden.

Guests are the game. Each one checks in, walks a plan of their own — pool, restaurant, room,
in a random order — and waits at each stop for you to do the job that lets them get on with
their day. Keep somebody waiting too long and they get grumpy and the star goes unearned:
nothing is ever taken away, but not everything is given either.

Two modes, set on the grown-up screen:

- **Leg** — free play. Every job pays a star.
- **Lær** — the same jobs, but a finished job raises a short maths or Danish task, and the
  task pays the stars. Stars buy things for the hotel, which is what makes counting to seven
  worth doing.

## Running it

```bash
npm install
npm run dev        # http://localhost:3000
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server with hot reload |
| `npm run build` | Typecheck, then build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` only |
| `npm test` | Playwright tests (starts the dev server itself) |
| `npm run android:sync` | Build, and copy it into the Android project |
| `npm run android:apk` | ...and assemble a release APK (needs JDK 21 and the Android SDK) |
| `npm run icons` | Redraw the launcher icon and splash screens |

Everything is drawn in code with Phaser's `Graphics` API and every sound is synthesised
with Web Audio — there are no image or audio assets, so the game loads instantly and every
colour lives in one palette. Nunito is bundled as a 38 KB variable font rather than fetched,
so the game makes no network requests at all once it is loaded. A test asserts that.

### Scale

`GAME_WIDTH`/`GAME_HEIGHT` in `config.ts` are 880×550, and the canvas is scaled to FIT
whatever it is given — so those two numbers are really a zoom control: a smaller logical
stage means every drawn shape and every label covers more of the screen. They were 960×600,
which put the body text at around 3 mm tall on a phone held at arm's length by a
five-year-old. Shrinking the stage ~9% and putting the `SIZE` type scale up ~12% on top of it
lands everything about a fifth bigger without redrawing a single shape.

Keep the 1.6 aspect ratio if you change them, or the game letterboxes instead of zooming.

## On a phone

Every push to `main` that passes the tests builds an Android APK and puts it on the
[latest release](../../releases/tag/latest) — download it on the phone and tap it. It is the
same web build inside a Capacitor shell, so it plays offline, needs no system permissions —
not even internet access — and runs on Android 7 or newer.

The wrapper adds the five things a WebView does not give for free: landscape lock,
immersive fullscreen, the hardware back button, keep-awake, and a copy of the save in native
storage. It also has the only working exit — an immersive WebView has no system bars and no
address bar, so the title screen's **Afslut** button is the way out. All of it is tested in
a browser by reproducing the conditions, in `tests/native.spec.ts`.

**[docs/ANDROID.md](docs/ANDROID.md)** covers the signing keys, the four repository secrets
and how to build one locally.

## How the code is laid out

```
src/
  config.ts              palette, type scale, room themes, shared depths
  main.ts                Phaser game config and scene list
  state/GameState.ts     all persisted progress, and the guest clock; the single source of truth
  state/Menu.ts          the four recipes, and what a guest orders from them
  state/Shop.ts          the decoration catalogue, and how each piece is drawn
  tasks/
    types.ts             Task, TaskBody, Figure, the skill list
    content.ts           task factories — generated, not listed
    figures.ts           drawn answer options: shapes, cakes, clocks, thermometer
    picker.ts            which task comes next, and at which level
  scenes/
    BaseScene.ts         the three-layer background/dynamic/effects pattern
    BootScene.ts         waits for the webfont, then hands over to the menu
    MainMenuScene.ts     title screen, and the way out of the game
    HotelMapScene.ts     the hub; five areas, the shop, the grown-up screen, waiting badges
    LobbyScene.ts        bell, check-in, check-out, key board
    RoomScene.ts         three rooms, five chores each, and the guest asleep in one
    KitchenScene.ts      recipes, the stove, the pass — and the restaurant, where you serve
    PoolScene.ts         loungers, slide, drinks
    GardenScene.ts       flower bed, sandbox, swing, apple tree
    ShopScene.ts         spend stars; also places bought pieces into the scenes
    SettingsScene.ts     mode, subjects, sound, guest voices, progress, reset
    TaskOverlayScene.ts  the task card, and its four interaction templates
  helpers/
    Draw.ts              shared shapes: panels, captions, buttons, people, scenery
    Motion.ts            prefers-reduced-motion handling
    Reward.ts            the single reward path every action goes through
    Audio.ts             synthesised sound effects, music and guest gibberish
  objects/
    FeedbackEffects.ts   star bursts, hearts, sparkles, toasts
    Guests.ts            what a guest says, their speech bubble and their patience bar
  ui/Chrome.ts           back button, star counter, scene titles
tests/
  game.ts                canvas-driving harness, click targets, task solver, audio spy
  smoke.spec.ts          one test per scene
  learn.spec.ts          the shop and the task layer
  guests.spec.ts         the guest's day: plans, orders, serving, patience
  sound.spec.ts          the audio contract
  native.spec.ts         the conditions the Android build runs under
  tasks.spec.ts          every factory generates an answerable task
```

CI runs typecheck, build and the full suite on every push
(`.github/workflows/ci.yml`), and uploads Playwright traces and screenshots when a test
fails. There are deliberately **no retries**: this suite drives a canvas, and a retry would
paper over exactly the timing bugs worth knowing about — both CI failures so far were real
nondeterminism in the tests, not infrastructure.

### The layer pattern

Scenes never restart themselves to redraw. `BaseScene` gives every scene three layers:

- **background** — built once in `buildBackground()`, never touched again
- **dynamic** — everything derived from `GameState`, rebuilt wholesale by `refresh()`
- **effects** — added straight to the scene at `DEPTH.effects`, so a `refresh()` cannot
  destroy a reward animation that is still playing

An interaction therefore looks like: mutate `gameState`, play the feedback, call
`refresh()`. Calling `this.scene.restart()` from a click handler is what broke the
kitchen, pool and garden previously — it re-ran `create()`, which reset the same fields
the handler had just written.

### State and rewards

All progress lives in `src/state/GameState.ts` and is persisted to `localStorage` under
`sommer-hotellet-save` with a `version` field. Mutators that represent a one-time
achievement return a boolean:

```ts
if (!gameState.layTowel(i)) return;   // already done — no reward
award(this);                          // grants the star and animates the counter
```

Rewards are granted by the state transition, never by the tap, so nothing can be farmed
by tapping the same object repeatedly.

`gameState.reset()` clears everything; it is wired to "Start forfra" on the grown-up screen.

### The guest's day

A guest is a small state machine, and `GameState` owns all of it.

```ts
plan: ['restaurant', 'room', 'pool']   // shuffled per guest
step: 0                                // how far along
at:   'restaurant'                     // where they are standing
since: 1690000000000                   // when they got there and started waiting
settledAt: null                        // when what they wanted arrived
gaveUp: false                          // patience spent, star forfeit
order: ['Suppe', 'Is']                 // what they asked for at the table
served: ['Suppe']                      // what has been carried out
```

Each stop has one need, and each need is met by a player action in a different scene:

| Stop | What they want | What the player does | Where |
| --- | --- | --- | --- |
| — | a key | tap the guest at the desk | Lobbyen |
| `pool` | a lounger with a towel on it | lay a towel | Poolen |
| `restaurant` | everything on their order | cook it, then carry it out | Køkkenet → Restauranten |
| `room` | a room that is actually made up | all five chores | Værelserne |
| — | to pay and go home | tap them at the desk | Lobbyen |

Waiting has three phases, and they are the whole difficulty curve:

- **waiting** — up to a minute (`PATIENCE_MS`; a restaurant order buys 25 s per extra dish,
  because three dishes is three trips through the kitchen). Do the job inside this and it
  pays.
- **impatient** — 30 s more. The bubble turns pink and shakes, the patience bar empties, and
  the job still has to be done — it just no longer pays. This is the consequence, and it is
  deliberately not a punishment: nothing is taken away, a star is simply not earned.
- **happy** — 12 s of swimming, eating or sleeping, then they move on to the next stop.

A guest nobody helps **gives up on that stop and moves on** rather than blocking the hotel.
That matters: a consequence that can deadlock the game is a bug, not a difficulty setting.

The same rule applies to the kitchen. A cooked dish goes on the *pass* (`kitchen.ready`) and
stays there until somebody carries it out, and the pass holds six — so cooking six bowls of
soup nobody ordered would otherwise stop the stove until a guest happened to want soup.
Tapping a plate on the pass scrapes it, which pays nothing and costs nothing.

`gameState.tickGuests()` moves every guest's clock on. `BaseScene` calls it twice a second
and only calls `refresh()` when it reports something actually changed, so guests keep living
their day while the player is in another room without a scene rebuilding at 2 Hz for nothing.
`HotelMapScene` runs the same tick and turns it into a red badge over whichever area has
somebody waiting — otherwise finding the guest who needs you means walking all five rooms.

Patience is wall-clock time, so `load()` deliberately rewinds every guest's `since` to now.
Closing the game is not a mistake a child should be charged for, and a save reopened the next
morning would otherwise have the whole hotel storming out on the first tick.

### The reward path

Every action in the game pays out through one function, `helpers/Reward.ts`:

```ts
rewardFor(this, 'garden', { after: () => this.refresh() });
```

In Leg mode that awards a star. In Lær mode the action has *already* happened — the flower
is watered, the bed is made — and then a task appears, phrased in the world, and pays the
stars. `after` runs once the reward settles, so the scene refreshes at the right moment
either way.

**A task is raised by a finished job, never by a tap.** Every chore used to raise one, which
meant making up a single room asked five questions and cooking one bowl of soup asked three —
the child was doing arithmetic to fetch a carrot. Taps pay a plain star; jobs ask:

| Job | Task? |
| --- | --- |
| check a guest in | yes |
| cook a dish (the whole recipe, at the stove) | yes |
| finish a room a guest is waiting to sleep in | yes |
| lay the towel that seats a waiting guest | yes |
| finish the flower bed, the sandcastle, the apple basket | yes |
| one chore, one ingredient, one towel, one apple | no — a plain star |
| carry a dish out to the guest who ordered it | no — a plain star, and the payoff |

That is roughly one question per guest per stop, against one per tap before.

### Tasks

Tasks are **generated**, not listed. `tasks/content.ts` holds one factory per skill per
level, so a child never runs out and never sees the same numbers twice running:

```ts
{
  skill: 'tælling', level: 1, areas: ['kitchen', 'garden', 'pool'],
  make: () => task('tælling', 1,
    `${pick(GUESTS)} vil have ${n} ${thing}. Tryk ${n} gange.`,
    { template: 'count-taps', target: n, icon }),
}
```

45 factories across 19 skills. Adding content means adding a factory, not a scene.

| Skill | Levels | Template(s) |
| --- | --- | --- |
| `tælling` | 1–3 | count-taps, number-pad |
| `talgenkendelse` | 1–2 | pick-one |
| `plus` | 1–3 | pick-one, number-pad |
| `minus` | 1–3 | pick-one, number-pad (level 3 is money and change) |
| `fordobling` | 1–2 | pick-one, number-pad |
| `deling` | 1–2 | pick-one, number-pad |
| `brøker` | 1–3 | pick-image (cut cakes), number-pad |
| `mønstre` | 1–3 | pattern, number-pad |
| `figurer` | 1–2 | pick-image (shapes) |
| `sortering` | 1–2 | put-in-order (towel sizes) |
| `klokken` | 1–3 | adjust (clock), pick-image (level 3 is Danish half hours) |
| `tallinje` | 1–2 | adjust (pool thermometer) |
| `bogstavlyd` | 1–3 | pick-one |
| `rim` | 1–2 | pick-one |
| `ordlæsning` | 1–2 | pick-image (word to picture), pick-one (reads a sentence) |
| `stavelser` | 1–2 | count-taps (clap the name) |
| `alfabet` | 1–2 | put-in-order (letters) |
| `forlyd` | 1–2 | pick-one |
| `bogstavform` | 1–2 | pick-one |

Seven interaction templates cover all of it:

| Template | Interaction | Used for |
| --- | --- | --- |
| `count-taps` | tap an object N times, pips fill as you go | counting, syllables |
| `pick-one` | choose one written option of three | arithmetic, letters, words |
| `number-pad` | type an answer on a 0–9 pad | larger sums, change |
| `pattern` | tap the colour that continues a row | patterns |
| `pick-image` | choose one *drawn* option | shapes, fractions, clock faces |
| `put-in-order` | tap items in sequence | size, alphabetical order |
| `adjust` | turn a dial up or down to a target | thermometer, clock |

`pick-image` exists because some answers cannot be words without giving themselves away —
a shape task whose options read "cirkel" and "trekant" tests reading, not shapes. Those
options are described as `Figure` values and drawn by `tasks/figures.ts`, which also holds
the sixteen drawable nouns that let a reading task show a picture rather than the same word
twice: `sol`, `hus`, `kat`, `fisk`, `is`, `blomst`, `nøgle`, `kop`, `bil`, `bog`, `hat`,
`sok`, `mus`, `tog`, `måne`, `kage`. The list is bounded by what stays unmistakable at
128px, and a test asserts a reading task can never name a noun with no drawing.

`adjust` covers the thermometer and the clock with one mechanic, because both are the same
idea: move a number to where it should be. It has no wrong answer — the dial is either
there yet or it is not.

`tasks/picker.ts` chooses the least-practised eligible skill, then the factory closest to
that skill's current level *at or below it* — not an exact match, because not every skill
has a factory for every level in every area, and requiring exactness left some skills
permanently unreachable in some scenes.

Difficulty moves on its own: three right in a row promotes, two wrong demotes
(`GameState.recordAttempt`). The level is never shown to the child.

**Three tries.** A wrong answer wobbles the object, shows a hint, takes one wrong option off
the board, and costs a try — three pips on the card say so from the moment it opens. Right
first time pays in full, a stumble pays less, and running out of tries closes the card
without paying. Only a first-try answer counts as mastery for the level machinery.

There is still no fail state in the sense that matters: nothing is taken away, the chore that
raised the task has already happened, and the hotel is never rolled back. But there is now a
cost to not reading the question — before this, tapping every option in turn always worked
and always paid, so the fastest way through a task was to ignore it.

### Sound and music

`helpers/Audio.ts` synthesises everything with Web Audio — no files, so nothing to
download or license. Each sound is built from two primitives, a shaped `note()` and a
filtered `noise()`, and everything routes through one gain node and a
`DynamicsCompressor` so a child tapping fast cannot stack the effects into distortion.

```ts
audio.pop();        // a job finished
audio.bell();       // reception bell: a struck partial stack
audio.success();    // a task answered right
audio.nudge();      // answered wrong — a nudge, not a buzzer
```

Two rules worth keeping:

- **The context is built on the first gesture, never at boot.** Browsers start an
  AudioContext suspended, and `unlock()` (wired to the first `pointerdown` in `main.ts`)
  is what makes the first sound audible. Phaser's own sound manager is switched off with
  `audio: { noAudio: true }` — it would otherwise build a second, unused context.
- **Nothing sounds like being told off.** A wrong answer gets two soft descending notes.
  There is no buzzer anywhere in the game.

`tap()` fires from `button()` and `tappable()`, so every control is acknowledged without
each scene wiring it up. Mute lives in settings and is persisted.

The background music is **generative, not a loop**. A tune a child replays for weeks becomes
unbearable for whoever else is in the room, so instead a warm pad moves through four chords
drawn from one pentatonic set, with occasional single notes over the top. It never repeats
exactly and has no hook to get stuck in anyone's head. It sits on its own gain bus well
under the effects, has its own toggle, and `sound` is the master switch above it.

Tests seed `music: false`, because a continuous pad would show up in the Web Audio node
counts that the sound tests assert on.

### Guest voices

Guests babble. Not Danish — nonsense syllables, the way people did on the phone in the
original GTA.

```ts
audio.babble(5, guestVoice(guest));   // a sentence's worth
audio.grumble(guestVoice(guest));     // a complaint: lower and slower
```

A sawtooth through a narrow bandpass is the cheapest thing that reads as a voice rather than
a beep — the filter picks out a band the way a mouth does — and gliding both the pitch and
the band across each syllable gives it the shape of a spoken sound. Syllable count comes from
the length of the line, so a three-dish order sounds longer than "Godnat", and `guestVoice()`
derives a pitch from the guest id, so Fru Hansen sounds like Fru Hansen every time.

This replaced Danish `speechSynthesis` read-aloud, which is gone. Two reasons: on any device
with a flat `da-DK` voice it sounded like a station announcement, and it was reading out text
the target child cannot read anyway. Gibberish carries the same information a pre-reader
actually needs — somebody is talking to you, and roughly how much they have to say — and it
is funny, which a five-year-old cares about more than diction. A test asserts the game never
reaches `speechSynthesis` at all.

Lines are spoken **once per situation**, not once per redraw: `refresh()` rebuilds every
guest whenever anything changes, and `objects/Guests.ts` keys the sound on
`guest:place:step:phase` so a redraw is silent. Lines also queue — walking into a lobby with
three guests in it plays three babbles in turn rather than one noise.

### The shop

`state/Shop.ts` is the catalogue, on two shelves.

**Ting** are decorations. Each owns both its drawing and its spot in its scene, so the same
function renders the shop preview and the real thing:

```ts
{ id: 'birdbath', name: 'Fuglebad', cost: 11, area: 'garden',
  spot: { x: 0.72, y: 0.87 }, draw: birdBath }
```

Scenes call `placeDecorations(this, 'garden', this.dynamic)` in their `buildDynamic()`, so
bought pieces come back on every refresh with no per-scene bookkeeping.

**Hotellet** are upgrades that change the game rather than dress it: four extra room themes
(22–34 stars), a fourth room (32), and a second floor with two more (48). Together with
fourteen decorations that is twenty things to save for, priced 6 to 48.

Room capacity is no longer a constant. `BASE_ROOM_COUNT` is what the hotel ships with,
`MAX_ROOM_COUNT` the ceiling, and `gameState.roomCount` what it actually has; the room tabs
and the lobby key board size themselves from it. Upgrades **add** capacity rather than
setting it, so buying the cheap one first is never wasted — a second floor that jumped
straight to six would have made the fourth-room upgrade pointless.

Themes are an index into `ROOM_THEMES` stored per room, so **the order of that array is part
of the save format** — append, never reorder.

Both shop grids compute their columns from the catalogue length, so adding an item reflows
the shelf instead of pushing a card off the bottom of the screen.

`GameState.load()` normalises what it reads (a room without a theme gets one, a save
predating the upgrade grows if it was bought) and writes the result straight back, so a
migration runs once rather than on every boot.

### Reduced motion

`helpers/Motion.ts` checks `prefers-reduced-motion`. When set, camera fades and the
tap-squash collapse to zero and ambient loops (clouds, floating buttons, butterfly wings)
do not start. `transition()` and `press()` are the two entry points — use them rather
than hand-rolling a fade or a squash tween.

## Tests

`npm test` drives the real canvas in Chromium and asserts against the save file, which is
the only thing that actually matters:

```ts
await game.enter('pool');
await game.tap(AT.pool.lounger1.x, AT.pool.lounger1.y);
await game.expectSave(s => s.pool.towels[0]).toBe(true);
```

Click targets are expressed in **game coordinates** in `tests/game.ts`, read off
`GAME_WIDTH`/`GAME_HEIGHT` rather than hardcoded, and scaled to the canvas — so neither a
different viewport nor a change to the logical stage size moves every target. When you move
something on screen, update its entry in `AT`.

The harness can also drive a task end to end — it reads the live answer off the scene and
taps the right target, so `learn.spec.ts` can assert on what a solved task pays:

```ts
await game.tap(AT.garden.wateringCan.x, AT.garden.wateringCan.y);
expect(await game.waitForTask()).toBe(true);
const { skill } = await game.solveTask();
await game.expectSave(s => s.skills[skill].correct).toBe(1);
```

`Game.openWithSave(page, patch)` seeds a save before the page loads, to reach a state
without grinding for it, and `Game.guestWaitingAt('pool')` seeds the whole guest-plus-room
shape for the common case of somebody standing there waiting.

Patience is the one thing a save cannot seed, because `load()` deliberately rewinds every
guest's clock. `game.ageGuest(0, 70_000)` reaches a grumpy guest instead by winding the clock
back on the live `GameState` — the dev server hands the page the very same module singleton
the game is running on, so this drives the real code path rather than a copy of it.

The task factories are pure generators, so `tasks.spec.ts` skips the UI entirely and pulls
them straight off the dev server to exercise every one 60 times:

```ts
const mod = await import(/* @vite-ignore */ '/src/tasks/content.ts');
for (const factory of mod.FACTORIES) { /* assert the task is answerable */ }
```

That is what catches an unanswerable task — an answer missing from its own options, a
number whose digits are not on the pad, a dial whose target is not a whole number of steps
away. Driving 45 factories through the canvas would take twenty minutes; this takes a
second.

The harness waits for the game to stop moving rather than sleeping a fixed time — under
software WebGL, Phaser's clamped frame delta stretches a 220 ms fade past a second, and a
fixed wait fires the next click into the old scene.

## Known limits

Not bugs, but worth knowing before picking up the next piece of work.

- **Twenty things to buy, then the sink is full again.** Six rooms is the ceiling
  (`MAX_ROOM_COUNT`) because the tabs and key board stop fitting beyond that; going further
  needs a different navigation, not another upgrade.
- **Sixteen drawable nouns** caps the reading vocabulary. More needs more drawings.
- **Nothing is read aloud.** Guests babble, but a task prompt is text, so a pre-reader needs
  a grown-up nearby for the wordier ones. Recorded narration would fix it and would mean a
  few hundred audio files.
- **Patience is one number for everybody.** A four-year-old and a seven-year-old get the same
  minute. It wants to be a setting on the grown-up screen.
- **Guests only ever want three things.** The plan is a shuffle of pool, restaurant and room,
  so every stay visits all three. Partial plans and repeat visits would vary it.
- **The suite is slow in software rendering.** Around twenty minutes with no GPU; roughly
  twelve on CI. `test.slow()` marks the one test that buys the whole catalogue.
- **The exit button cannot close a browser tab.** No page can, so on the web it says goodbye
  and offers to carry on; only the Android build actually exits.
- **No iOS.** Capacitor would do it, but an IPA needs macOS and a paid Apple account.
- **The Gradle build is only exercised on CI.** Nothing here builds an APK as part of `npm
  test`, so a change to `android/` is verified by the Android job, not locally.
