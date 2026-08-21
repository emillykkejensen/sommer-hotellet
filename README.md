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
  state/Shop.ts          the decoration catalogue, and how each piece is drawn
  tasks/
    types.ts             Task, TaskBody, the skill list
    content.ts           task factories — generated, not listed
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
    AudioManager.ts      Web Audio sound effects (not yet wired up — see below)
  objects/FeedbackEffects.ts   star bursts, hearts, sparkles, toasts
  ui/Chrome.ts           back button, star counter, scene titles
tests/
  game.ts                canvas-driving harness, click targets, task solver
  smoke.spec.ts          one test per scene
  learn.spec.ts          the shop and the task layer
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

Four interaction templates cover all of it: `count-taps`, `pick-one`, `number-pad` and
`pattern`. Adding content means adding a factory, not a scene.

`tasks/picker.ts` chooses the least-practised eligible skill, then the factory closest to
that skill's current level *at or below it* — not an exact match, because not every skill
has a factory for every level in every area, and requiring exactness left some skills
permanently unreachable in some scenes.

Difficulty moves on its own: three right in a row promotes, two wrong demotes
(`GameState.recordAttempt`). The level is never shown to the child.

**There is no fail state.** A wrong answer wobbles the object, speaks a hint, and takes one
wrong option off the board. The child always finishes and always leaves with at least one
star; only a first-try answer counts as mastery for the level machinery.

### Read-aloud

`helpers/Speech.ts` speaks every prompt in Danish via `speechSynthesis`. If no `da-*` voice
exists it stays silent rather than reading Danish with an English voice. The grown-up
screen hides the toggle when the browser cannot speak at all.

### The shop

`state/Shop.ts` is the catalogue. Each item owns both its drawing and its spot in its
scene, so the same function renders the shop preview and the real thing:

```ts
{ id: 'birdbath', name: 'Fuglebad', cost: 11, area: 'garden',
  spot: { x: 0.72, y: 0.87 }, draw: birdBath }
```

Scenes call `placeDecorations(this, 'garden', this.dynamic)` in their `buildDynamic()`, so
bought pieces come back on every refresh with no per-scene bookkeeping.

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

The harness waits for the game to stop moving rather than sleeping a fixed time — under
software WebGL, Phaser's clamped frame delta stretches a 220 ms fade past a second, and a
fixed wait fires the next click into the old scene.

## Not done yet

- **`AudioManager` is not wired up.** It synthesises a bell, splash, sparkle, sizzle and
  a success arpeggio with no audio files, and nothing imports it. It needs a first-gesture
  unlock for the `AudioContext` and a mute toggle.
- **No sound.** `AudioManager` is the only piece of the original review still outstanding.
- **The shop is the only sink.** Nine items, and once they are all bought stars accumulate
  again. A second tier — new room themes, a second floor — would extend the loop.
- **Task coverage is uneven.** Money and clock tasks from `docs/EVALUATION.md` are not
  built yet, and the Danish side leans on word recognition because drawn pictures for
  every noun would be a lot of art.
