# Sommer Hotellet — evaluation and educational roadmap

Reviewed at commit `252e301` on `claude/summer-hotel-game-59WLL`.
3,048 lines, TypeScript + Phaser 3.90, 8 scenes.

Findings 01–04, 06 and 07 were reproduced by driving the built game in headless
Chromium and reading scene state out of the live Phaser instance. The rest come
from reading the source. **No game code was changed while producing this review.**

---

## Status

Everything below has since been built. This document is kept as the original review of
`252e301` — the findings, the reasoning and the roadmap as they stood before any of it was
fixed — so it is deliberately written in the present tense about a version of the game that
no longer exists. `README.md` describes what the game actually does now.

All sixteen findings are fixed and every row of the "Suggested order" table at the bottom is
shipped: redraw in place, smoke tests, sound, the polish pass, the star shop, the task engine,
and the content — 19 skills across 45 factories, seven interaction templates, 20 things to
buy.

Two of the recommendations below have since been reversed by playtesting, and the reasoning
here is the wrong half of the argument in both cases:

- **"Read-aloud is not optional."** It was built with `speechSynthesis`, and then removed.
  On any device with a flat `da-DK` voice it sounded like a station announcement, and it read
  out text the target child cannot read anyway. Guests babble nonsense syllables instead.
- **"No wrong answers, ever."** A wrong tap costing nothing meant the fastest way through any
  task was to tap every option in turn, which teaches only that tapping everything works. A
  task now closes without paying after three misses — nothing is taken away, but not
  everything is given either.

The other thing that changed is that a task is raised by a *finished job* rather than by
every tap, and that guests now walk a plan and lose patience. `README.md` describes what the
game actually does now.

---

## Summary

`npm run build` is clean and the art has a consistent, sunny personality that suits
a 4–8-year-old. The problem is not the drawing code — it is that every interaction
ends in `this.scene.restart()`, while every scene's `create()` begins by resetting
its own state fields. The two cancel each other out.

Verified in a real browser: **selecting a recipe, toggling the dining room, laying
pool towels, watering the flower bed, and building the sandcastle all do nothing
visible** — while still paying out stars. A child can tap the same deck chair five
times, collect five stars, and watch nothing happen.

## Worth keeping

- **No fail states anywhere.** Nothing is timed or lost, nothing says "wrong". Correct
  for this age band; it should survive the addition of school-type tasks.
- **Everything is drawn in code.** No image assets means instant loads, no licensing,
  trivially recolourable themes.
- **The scene graph maps to a child's mental model** — lobby, rooms, kitchen, pool,
  garden. Already the right skeleton to hang lessons on, one subject per room.
- **Danish throughout,** including the guest names.
- **A complete sound engine already exists.** `AudioManager` synthesises bell, splash,
  sparkle, sizzle and a success arpeggio with no audio files. It is imported by nothing.

---

## Critical — verified broken

### 01. `create()` wipes the state that click handlers just set

`KitchenScene`, `PoolScene` and `GardenScene` keep progress in instance fields and
reset those fields at the top of `create()`. Their handlers set a field and then call
`this.scene.restart()`, which runs `create()` again — erasing the change before it is
ever drawn. Recipe selection, the kitchen/dining toggle, pool towels, flower watering
and the sandcastle are all non-functional.

Only `RoomScene` escapes, because its five chores live in `gameState.rooms[]`.

```
Live scene state after clicking "Suppe", then the dining-room toggle:
  KitchenScene -> { currentRecipe: null, added: [], showingDining: false }
  PoolScene    -> towelStates: [false, false, false, false]   (after tapping lounger 1)
  GardenScene  -> flowersWatered: [false x5]  sandcastleLevel: 0  (after 4 taps)
```

### 02. `scene.restart()` is being used as a render call

Root cause of the above, and it damages more than state. Tearing down the whole scene
on every tap also destroys the reward animation created microseconds earlier: in
`RoomScene`, `showStarBurst()` starts an 800 ms tween and `restart()` follows on the
same line, so the child never sees the stars they just earned.

It is also unreliable. Instrumenting `create()` showed a single tap producing two full
scene rebuilds, and the room renders a stale generation — the save file says
`curtainsOpen: true, flowersPlaced: true` while the screen still shows drawn curtains
and an empty vase.

```
One pointer-down on the sandbox, create() instrumented:
  log: [ "create#1", "create#2" ]   <- two rebuilds, one tap
  sandcastleLevel: 0                <- increment lost in the second rebuild
```

**Fix:** redraw in place. Keep references to the graphics objects and `clear()` +
redraw, or hold each chore's "done"/"not done" visuals in a container and flip
`setVisible()`. Reserve `restart()` for actually restarting.

### 03. A stale event listener crashes the renderer

`addStarCounter()` registers `scene.events.on('starsChanged', …)` and never
unregisters it. Phaser does not clear user listeners on scene shutdown, so after a
restart the old closure still fires and calls `setText()` on a destroyed `Text`. The
next frame throws inside the WebGL renderer:
`TypeError: Cannot read properties of null (reading 'glTexture')`, fired repeatedly
across the pool, garden and room scenes in a two-minute session.

```
Listener count on RoomScene.events:
  fresh scene       -> 1
  after 1 restart   -> 2   <- previous generation still subscribed
```

**Fix:** tear down on `Phaser.Scenes.Events.SHUTDOWN` — better, read the count from
`gameState` on create instead of pushing events across scene generations.

### 04. Rewards are not idempotent, so stars can be farmed

Because towel state never persists, the same deck chair can be tapped forever and
pays out every time. Five taps on *one* lounger produced `poolTowelsLaid: 5` and five
stars with no change on screen. Same for the watering can.

```
localStorage after five taps on lounger 1:
  { "stars": 5, "poolTowelsLaid": 5, … }   <- four towels exist in total
```

**Fix:** award on the state transition (`false` -> `true`), not on the tap.

### 05. A visual effect owns the game economy

`showStarBurst()` in `FeedbackEffects.ts` calls `gameState.addStars()` as its first
line. Currency is a side effect of playing an animation, so every decorative flourish
inflates the score and no reward can be shown without paying it. Split into
`awardStars(n)` (mutates state) and `showStarBurst()` (only draws).

---

## Visible defects

### 06. The kitchen floor tiles never draw

The checkerboard loop starts at `y = height * 0.65` — that is 390, so `y / 40` is 9.75
and `(x/40 + y/40) % 2 === 0` is never true. The floor renders flat white. Loop over
integer row/column indices and multiply into pixels.

### 07. Stray graphics leak in `RoomScene.drawTowels()`

The messy-towel branch creates `towel2` in *world* coordinates, never adds it to the
container and never destroys it, so it renders detached from the towel pile and
survives as a white sliver. `towel.setAngle(15)` also rotates the entire graphics
object around its own origin rather than the drawn shape.

### 08. Overlapping labels and clipped objects at 800x600

The star counter sits on top of the sun in the garden and pool, and on top of the
"Spisestue" button in the kitchen. "Gynge!" collides with "Pluk æbler". The vacuum in
`RoomScene` is drawn at `width - 100` and clips the right edge. The bottom third of the
kitchen and room scenes is empty. The apple tree draws "Alle æbler plukket!" at exactly
the coordinates of the permanent "Pluk æbler" label, so the two strings overlap; apples
do not persist.

### 09. The lobby can dead-end with no hint

With three rooms occupied and three guests waiting, the bell silently does nothing and
tapping a guest shows "Ingen ledige rum" — with no indication that the way out is to
check someone out from a different screen. Surface a prompt, or let the guest walk to
the room screen when tapped.

### 10. Every scene relies on `Phaser` as an implicit global

Eleven files use `Phaser.Scene`, `Phaser.Math` etc. without importing Phaser. It
compiles because the type definitions are global, and runs because the UMD bundle
assigns `window.Phaser` as a side effect of `main.ts`. Switch to the ESM build, enable
tree-shaking, or load a scene from a test harness and all eleven break at once.

---

## Structure and craft

### 11. The game is silent — quick win

164 lines of working Web Audio synthesis sit unused. For pre-readers, sound carries more
feedback than any animation. Wire `audioManager` into the existing effects, gate the
first `AudioContext` on a user gesture, add a mute toggle. An afternoon of work for the
largest single gain in feel.

### 12. Duplication that will multiply with every new room

`LobbyScene.spawnGuest()` and `showWaitingGuests()` repeat ~50 lines of identical
check-in logic. `RoomScene`'s five chores are the same function five times and want a
single `createChore(config)` helper. Every scene hand-rolls its buttons instead of
calling the `createButton()` that already exists.

### 13. Dead declarations describing features that were never built

`FONT_STYLE`, `TITLE_STYLE`, `BUTTON_STYLE` and `drawRoundedRect()` have zero call
sites. `GAME_WIDTH`/`GAME_HEIGHT` are imported but unused — `main.ts` hardcodes 800 and
600. `GuestData.mood` declares four states and only ever holds two.
`KitchenState.currentDish` and `dishReady` are written and never read.

### 14. No tests, and these bugs were exactly the testable kind

One Playwright smoke test per scene — tap the thing, assert the state changed — would
have caught every critical finding above in under a second each. No README, no linter,
no CI either.

### 15. The save file has no version, and no way to start over

`load()` swallows every error, so the first schema change will silently half-restore old
saves. Add a `version` field and migrate on read. There is also no "Start forfra"
button; a stuck save currently requires devtools.

### 16. Stars accumulate toward nothing

There is no sink. Nothing to buy, nothing to unlock, no reason to earn the next one. The
most important design gap, and the hinge the educational layer hangs on.

---

## The educational layer

**Yes — and the setting is doing most of the work already.** Running a hotel *is*
counting, sorting, measuring, reading and writing.

The mistake to avoid is a quiz. If a math question pops up over the room and blocks
progress, it reads as homework in a costume and the child stops opening the game. The
version that works is **diegetic**: the task *is* the hotel job, and solving it changes
the hotel. The guest asks for three pancakes; you count out three; the guest eats and
smiles. No question was ever asked.

That framing also solves finding 16. Invert the economy: **chores are free, tasks pay,
and stars buy things for the hotel** — a parasol for the pool, a new bedspread, a cat in
the lobby, a flamingo float. Counting to seven now has a purpose the child holds an
opinion about. That reward loop is the engine; the arithmetic is what turns it.

### Architecture — keep tasks out of the world code

One overlay scene launched with `scene.launch()` rather than `start()`, so the room stays
visible and dimmed behind it and no scene is ever rebuilt. Tasks become data, and about
five interaction templates cover nearly all the content below.

```ts
// One shape for every task. Content becomes data, not code —
// which means a parent can add tasks without touching a scene.
interface Task {
  id:       string;
  subject:  'matematik' | 'dansk';
  skill:    SkillId;          // 'tælling' | 'plus' | 'bogstavlyd' | 'rim' | …
  level:    1 | 2 | 3;
  prompt:   string;           // shown AND spoken
  template: 'tap-n-times' | 'pick-one' | 'drag-match'
          | 'put-in-order' | 'number-pad';
  payload:  unknown;          // template-specific
  reward:   { stars: number; worldEffect: () => void };
}

// Mastery lives next to the save, so difficulty follows the child.
interface SkillProgress { seen: number; correct: number; level: 1|2|3; streak: number; }
// 3 correct in a row -> promote.  2 wrong -> demote.  Never a score, never a fail.
```

**Read-aloud is not optional.** The target child cannot read the Danish prompt.
`speechSynthesis` with `lang = 'da-DK'` costs nothing, ships no assets, and has real
voices on iOS, macOS, Android and Windows. Auto-speak on open plus a replay button. This
also fixes the accessibility gap that exists today, where all instruction is 10–14px
Danish text.

Keep two modes — **Leg** (today's sandbox, no tasks) and **Lær** (tasks gate the stars) —
with a small parent screen for mode and age band. The free play is why a child opens the
game; do not spend it.

### What each room can teach

#### Lobbyen — `LobbyScene.ts`

*Matematik*
- The guest's card shows a numeral — fetch the matching key from the board. `talgenkendelse 1–10`
- "2 voksne og 3 børn kommer. Hvor mange nøgler?" `plus, konkret`
- On check-out: "Der var 5 gæster, 2 rejser hjem." `minus`
- The till: the room costs 30 kr, the guest pays with a 50. Danish coins, real denominations. `penge, byttepenge`

*Dansk*
- Sign the guest book: which letter does "Hansen" start with? `bogstavlyd`
- Clap the syllables of the name — Pe-der-sen is three. `stavelser`
- Hang the keys in alphabetical order by guest name. `alfabetisk orden`

#### Køkkenet — `KitchenScene.ts`

*Matematik*
- Give recipes real quantities — 3 gulerødder, 2 kartofler, 1 løg — and count the taps. Smallest possible change to the existing mechanic. `tælling, én-til-én`
- "Dobbelt så mange gæster i dag." `fordobling`
- Cut the cake into 4 equal pieces, then give 2 away. `brøker: halve, kvarte`
- 8 pandekager, 4 gæster, lige mange til hver. `division ved deling`

*Dansk*
- A written shopping list — mælk, æg, mel — read it and pick those three off the shelf. `ordlæsning`
- A room-service note arrives: "Jeg vil gerne have en is." `sætningslæsning`

#### Værelserne — `RoomScene.ts`

*Matematik*
- "Familien er 4 personer — find værelset med 4 senge." `antal -> talsymbol`
- Fold towels into small / medium / large stacks. `sortering, størrelse`
- Breakfast is at 8 — set the clock on the nightstand. `klokken, hel og halv`

*Dansk*
- Door signs are blank: drag KØKKEN, POOL, HAVE onto the right doors. `ordbilleder`
- Lost and found — the guest lost a *hat*. What rhymes with it? `rim`
- Match the big letter on the sign to the small letter on the key. `store/små bogstaver`

#### Poolen — `PoolScene.ts`

*Matematik*
- Lay a towel on all 4 loungers — and make it persist, which fixes finding 01 at the same time. `tælling til 4`
- Turn the thermometer up until the pool reads 25 degrees. `tallinje, tælle opad`
- Three guests, three drinks — but one wants two. `én-til-én, plus`

*Dansk*
- Sort the laundry basket: everything starting with the S sound in the blue basket. `forlyd`
- Spell the short, phonetic words on the pool sign — sol, is, bad. `lydrette ord`

#### Haven — `GardenScene.ts`

*Matematik*
- "Pluk 7 æbler til æblekagen" — with a visible tally, and gentle feedback at 6 or 8. `tælling, mængde`
- Build the sandcastle from named shapes: firkant, trekant, cirkel. `geometriske figurer`
- Plant the flower bed in a pattern — rød, gul, rød, gul, … `mønstre`

*Dansk*
- Seed packets are labelled — plant the one that says *rose*. `ordlæsning`
- Name what the butterfly landed on, then find its first letter. `bogstavlyd`

### Rules to hold the line on

Educational games usually fail on these five, not on content.

1. **No wrong answers, ever.** A wrong tap wobbles the object, speaks a hint, and narrows
   the choices on the retry. No red cross, no lost life, no score penalty. A five-year-old
   who fails once closes the app.
2. **Five to fifteen seconds.** One question, one tap or one count. If a task needs a
   paragraph of setup, it belongs to an older child than this hotel is built for.
3. **The world must change.** Counting three carrots has to produce soup. The reward is the
   hotel getting better — never a points popup over a frozen screen.
4. **Difficulty follows the child.** Three right in a row moves up a level, two wrong moves
   down. Never surface the level.
5. **Give the parent one screen.** "Øvet i dag: tælling ✓✓✓, bogstavlyd ✓✓". Cheap to build,
   and it is what makes an adult keep the game installed.

---

## Suggested order

The first two rows are prerequisites, not preferences — a task overlay built on top of
`scene.restart()` will inherit every bug in the critical list.

| Step | Work | Fixes | Rough size |
| --- | --- | --- | --- |
| Redraw in place | Remove `scene.restart()` from all interaction handlers; move scene-local progress into `GameState`; award on state transition only. | 01–05 | ~1 day |
| Smoke tests | One Playwright test per scene: tap, assert state changed, assert no page errors. | 14 | ~½ day |
| Sound + speech | Wire up `AudioManager`; add `speechSynthesis` read-aloud and a mute toggle. | 11 | ~½ day |
| Polish pass | Tile loop, leaked towel graphics, label collisions, lobby dead-end, explicit Phaser imports, save versioning, reset button. | 06–10, 15 | ~1 day |
| Star shop | Give stars a sink: buyable decorations per room. The reward loop the tasks plug into. | 16 | ~1 day |
| Task engine | `TaskOverlayScene`, the five interaction templates, skill progress and adaptive level. | — | ~2 days |
| Content | Task data per room, starting with kitchen quantities and the lobby key board — the two that need the least new art. | — | ongoing |
