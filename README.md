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

## How the code is laid out

```
src/
  config.ts              palette, type scale, room themes, shared depths
  main.ts                Phaser game config and scene list
  state/GameState.ts     all persisted progress; the single source of truth
  scenes/
    BaseScene.ts         the three-layer background/dynamic/effects pattern
    BootScene.ts         waits for the webfont, then hands over to the menu
    MainMenuScene.ts     title screen and "start forfra"
    HotelMapScene.ts     the hub; five areas
    LobbyScene.ts        bell, guests, check-in, key board
    RoomScene.ts         three rooms, five chores each
    KitchenScene.ts      recipes, ingredients, dining room
    PoolScene.ts         loungers, slide, drinks
    GardenScene.ts       flower bed, sandbox, swing, apple tree
  helpers/
    Draw.ts              shared shapes: panels, captions, buttons, people, scenery
    Motion.ts            prefers-reduced-motion handling
    AudioManager.ts      Web Audio sound effects (not yet wired up — see below)
  objects/FeedbackEffects.ts   star bursts, hearts, sparkles, toasts
  ui/Chrome.ts           back button, star counter, scene titles
tests/
  game.ts                canvas-driving harness and click targets
  smoke.spec.ts          one test per scene
```

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
something on screen, update its entry in `AT`.

The harness waits for the game to stop moving rather than sleeping a fixed time — under
software WebGL, Phaser's clamped frame delta stretches a 220 ms fade past a second, and a
fixed wait fires the next click into the old scene.

## Not done yet

- **`AudioManager` is not wired up.** It synthesises a bell, splash, sparkle, sizzle and
  a success arpeggio with no audio files, and nothing imports it. It needs a first-gesture
  unlock for the `AudioContext` and a mute toggle.
- **Stars have no sink.** They accumulate and buy nothing. See `docs/EVALUATION.md` for
  the proposed shop and the Danish/maths task layer that would spend them.
