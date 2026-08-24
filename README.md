# Sommer Hotellet

Et roligt hotelspil for børn — byg, ryd op, og tag imod gæster. Ingen tid, ingen point
at tabe, ingen måde at gøre noget forkert.

A calm hotel game for children (roughly ages 4–8), in Danish. Run the reception, make up
the rooms, cook in the kitchen, lay towels by the pool and tend the garden. Nothing is
timed and nothing can be lost.

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
| `npm test` | Playwright smoke tests (starts the dev server itself) |

Everything is drawn in code with Phaser's `Graphics` API — there are no image assets, so
the game loads instantly and every colour lives in one palette. The only external asset is
the Nunito webfont, and the game falls back to a system stack if it cannot be fetched.
Sound is synthesised at runtime through the Web Audio API, so there are no audio files
either.

## How the code is laid out

```
src/
  config.ts              palette, type scale, room themes, depths, star ranks
  main.ts                Phaser game config, scene list, audio unlock
  state/GameState.ts     all persisted progress; the single source of truth
  scenes/
    BaseScene.ts         the four-layer background/ambient/dynamic/effects pattern
    BootScene.ts         waits for the webfont, then hands over to the menu
    MainMenuScene.ts     title screen and "start forfra"
    HotelMapScene.ts     the hub; five areas, each with a jobs-left badge
    LobbyScene.ts        bell, guests, check-in, key board
    RoomScene.ts         three rooms, five chores each
    KitchenScene.ts      recipes, ingredients, dining room
    PoolScene.ts         loungers, slide, drinks
    GardenScene.ts       flower bed, sandbox, swing, apple tree
  helpers/
    Draw.ts              shared shapes: plates, captions, buttons, people, scenery
    Motion.ts            prefers-reduced-motion handling, entrance and idle animation
    Flatten.ts           bakes static scenery to a texture (see below)
    AudioManager.ts      synthesised sound effects, unlock and mute
  objects/FeedbackEffects.ts   star bursts, confetti, praise pops, toasts, rank-ups
  ui/Chrome.ts           back button, star badge, sound toggle, scene titles
tests/
  game.ts                canvas-driving harness and click targets
  smoke.spec.ts          one test per scene
```

### The layer pattern

Scenes never restart themselves to redraw. `BaseScene` gives every scene four layers:

- **background** — static scenery, built once in `buildBackground()` and then **baked
  into a single texture**; the vector objects are destroyed
- **ambient** — scenery that moves under its own power (sun, clouds, birds, butterflies,
  ceiling fans), built once in `buildAmbient()` and never rebuilt
- **dynamic** — everything derived from `GameState`, rebuilt wholesale by `refresh()`
- **effects** — added straight to the scene at `DEPTH.effects`, so a `refresh()` cannot
  destroy a reward animation that is still playing

An interaction therefore looks like: mutate `gameState`, play the feedback, call
`refresh()`. Calling `this.scene.restart()` from a click handler is what broke the
kitchen, pool and garden previously — it re-ran `create()`, which reset the same fields
the handler had just written.

The rule when adding to a scene: **if it never changes, put it in `background`; if it
moves, put it in `ambient`; if it reflects state, put it in `dynamic`.** Getting this
wrong is silent — something animated in `background` simply freezes, because it has been
baked into a picture.

### Why the background gets baked

`Graphics` is not a cached display object. Phaser's renderer walks and re-tessellates the
whole command list of every `Graphics` object on every frame, so scenery costs the same
whether or not it has changed since it was drawn. The outlined art style roughly doubles
that command count — every plate is a fill plus a stroke.

`helpers/Flatten.ts` draws the static layer once into a `RenderTexture` and throws the
vector objects away, turning an unbounded pile of per-frame geometry into one textured
quad. On the title screen this took the frame rate from 8 fps to 19 under the software
WebGL renderer the tests run against.

### The visual language

One rule holds the art together: **anything sitting on top of scenery gets an outline**,
always the same warm near-black (`COLORS.outline`), never pure black. The previous version
relied on soft fills against soft fills, which is why a green button on green grass and a
wooden lounger on sand both dissolved into their backgrounds. Contrast comes from the ink
line, so the fills themselves can stay gentle.

Buttons are built as a face sitting on a darker lip, and pressing one pushes the face down
onto the lip rather than merely scaling it.

### Stars, ranks and feedback

Rewards are granted by the state transition, never by the tap, so nothing can be farmed by
tapping the same object repeatedly. `award(scene, count, x, y)` grants the stars, plays the
counter animation, and — given a position — flies the earned star from the thing that
produced it to the counter, which is the clearest way to explain the currency to somebody
who cannot yet read the label.

Stars feed a rank ladder (`RANKS` in `config.ts`). It is a read-out of effort, not a gate:
there is nothing to unlock, nothing to fail, and no way to go backwards. Reaching a new
rank plays a short celebration that clears itself.

Confetti and the big praise pop are reserved for finishing a whole job — a complete room,
every lounger, the finished sandcastle — so they stay a treat rather than wallpaper.

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

`gameState.reset()` clears everything; it is wired to "Start forfra" on the title screen.

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
something on screen, update its entry in `AT` — the lobby bell, the lobby guests and the
kitchen's dining toggle all moved during the UI overhaul and `AT` moved with them.

The harness waits for the game to stop moving rather than sleeping a fixed time — under
software WebGL, Phaser's clamped frame delta stretches a 220 ms fade past a second, and a
fixed wait fires the next click into the old scene.

## Sound

`helpers/AudioManager.ts` synthesises every effect through the Web Audio API — a desk
bell, a splash, sparkles, a sizzle, a rising blip per star and two arpeggios. There are no
audio files.

Two things it needed before it could be connected to anything:

- **An unlock.** Browsers create an `AudioContext` suspended and only resume it inside a
  user gesture, so `installAudioUnlock()` in `main.ts` listens for the first tap on the
  page. Calls made before that are dropped rather than queued.
- **A mute the player can find.** Every scene carries a sound toggle; the preference is
  persisted under `sommer-hotellet-muted`. A children's game that makes noise with no
  visible off switch gets muted at the operating system instead.

## Not done yet

- **Stars have no sink.** They now feed a rank ladder, which gives the counter something to
  fill, but they still buy nothing. See `docs/EVALUATION.md` for the proposed shop and the
  Danish/maths task layer that would spend them.
- **The richer art costs frame time.** Measured under the software WebGL renderer the test
  suite uses, the interiors run roughly a quarter slower than the flat version did; the
  title screen, which had the most static scenery to bake, runs slightly faster. On any
  device with a GPU all of it is comfortably at the frame cap. Baking the *dynamic* layer
  between refreshes would recover most of the difference, but it would cost the press and
  hover animation on every tappable object, which is not a trade worth making for a game
  whose whole point is that it feels good to poke.
