# Sommer Hotellet

Et roligt hotelspil for børn — byg, ryd op, og tag imod gæster. Ingen tid, ingen point
at tabe, ingen måde at gøre noget forkert.

A calm hotel game for children (roughly ages 4–8), in Danish. Run the reception, make up
the rooms, cook in the kitchen, lay towels by the pool and tend the garden. Nothing is
timed and nothing can be lost.

Two modes, set on the grown-up screen:

- **Leg** — free play. Every job pays a star.
- **Lær** — the same jobs, but each one raises a short maths or Danish task, and the task
  pays the stars. Stars buy things for the hotel, which is what makes counting to seven
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

## On a phone

Every push to `main` that passes the tests builds an Android APK and puts it on the
[latest release](../../releases/tag/latest) — download it on the phone and tap it. It is the
same web build inside a Capacitor shell, so it plays offline, asks for no permissions, and
needs Android 7 or newer.

The wrapper adds the six things a WebView does not give for free: read-aloud through
Android's own text-to-speech (a WebView has no `speechSynthesis` at all), landscape lock,
immersive fullscreen, the hardware back button, keep-awake, and a copy of the save in native
storage. All six are tested in a browser by reproducing the conditions, in
`tests/native.spec.ts`.

**[docs/ANDROID.md](docs/ANDROID.md)** covers the signing keys, the four repository secrets
and how to build one locally.

## How the code is laid out

```
src/
  config.ts              palette, type scale, room themes, shared depths
  main.ts                Phaser game config and scene list
  state/GameState.ts     all persisted progress; the single source of truth
  state/Shop.ts          the decoration catalogue, and how each piece is drawn
  tasks/
    types.ts             Task, TaskBody, Figure, the skill list
    content.ts           task factories — generated, not listed
    figures.ts           drawn answer options: shapes, cakes, clocks, thermometer
    picker.ts            which task comes next, and at which level
  scenes/
    BaseScene.ts         the three-layer background/dynamic/effects pattern
    BootScene.ts         waits for the webfont, then hands over to the menu
    MainMenuScene.ts     title screen and "start forfra"
    HotelMapScene.ts     the hub; five areas, the shop, the grown-up screen
    LobbyScene.ts        bell, guests, check-in, key board
    RoomScene.ts         three rooms, five chores each
    KitchenScene.ts      recipes, ingredients, dining room
    PoolScene.ts         loungers, slide, drinks
    GardenScene.ts       flower bed, sandbox, swing, apple tree
    ShopScene.ts         spend stars; also places bought pieces into the scenes
    SettingsScene.ts     mode, subjects, read-aloud, progress, reset
    TaskOverlayScene.ts  the task card, and its four interaction templates
  helpers/
    Draw.ts              shared shapes: panels, captions, buttons, people, scenery
    Motion.ts            prefers-reduced-motion handling
    Reward.ts            the single reward path every action goes through
    Speech.ts            da-DK read-aloud
    Audio.ts             synthesised sound effects
  objects/FeedbackEffects.ts   star bursts, hearts, sparkles, toasts
  ui/Chrome.ts           back button, star counter, scene titles
tests/
  game.ts                canvas-driving harness, click targets, task solver, audio spy
  smoke.spec.ts          one test per scene
  learn.spec.ts          the shop and the task layer
  sound.spec.ts          the audio contract
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

`gameState.reset()` clears everything; it is wired to "Start forfra" on the title screen and
on the grown-up screen.

### The reward path

Every action in the game pays out through one function, `helpers/Reward.ts`:

```ts
rewardFor(this, 'garden', { after: () => this.refresh() });
```

In Leg mode that awards a star. In Lær mode the action has *already* happened — the flower
is watered, the bed is made — and then a task appears, phrased in the world, and pays the
stars. Chores are free; tasks pay. `after` runs once the reward settles, so the scene
refreshes at the right moment either way.

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

**There is no fail state.** A wrong answer wobbles the object, speaks a hint, and takes one
wrong option off the board. The child always finishes and always leaves with at least one
star; only a first-try answer counts as mastery for the level machinery.

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

### Read-aloud

`helpers/Speech.ts` speaks every prompt in Danish via `speechSynthesis`. If no `da-*` voice
exists it stays silent rather than reading Danish with an English voice, and the grown-up
screen hides the toggle when the browser cannot speak at all.

Two details make the difference between usable and irritating:

- **Voice choice.** `da-DK` beats a generic `da`, and a local voice beats a network one — a
  network voice is usually better but stalls on a slow connection, and a prompt that arrives
  two seconds late is worse than a flatter one that arrives now.
- **Pacing.** The prompt is split at sentence punctuation and queued as separate
  utterances, so "Der kommer 2 voksne og 3 børn. Hvor mange nøgler skal du hente?" reads as
  two sentences rather than one breathless run. Longer prompts get a slower rate.

This is synthesis, not narration. A recorded voice would be warmer, but that is a few
hundred audio files to write, record and ship.

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

Click targets are expressed in **game coordinates** (960×600) in `tests/game.ts` and
scaled to the canvas, so a different viewport does not move every target. When you move
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
without grinding for it.

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
- **Read-aloud is synthesised**, not recorded. Better voice selection and pacing help, but a
  real narrator would need audio files.
- **The suite is slow in software rendering.** Around fifteen minutes with no GPU; roughly
  ten on CI. `test.slow()` marks the one test that buys the whole catalogue.
- **Read-aloud in the app depends on the phone.** Android's text-to-speech only has the
  voices the device has installed; with no Danish one the speaker button goes quiet rather
  than reading Danish in English.
- **No iOS.** Capacitor would do it, but an IPA needs macOS and a paid Apple account.
- **The Gradle build is only exercised on CI.** Nothing here builds an APK as part of `npm
  test`, so a change to `android/` is verified by the Android job, not locally.
