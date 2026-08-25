import { test, expect } from '@playwright/test';
import { GAME_WIDTH } from '../src/config';
import { AT, Game } from './game';

/** Served by the dev server at runtime, so the specifier goes through a variable. */
const SHOP = '/src/state/Shop.ts';

/**
 * The star shop and the task layer.
 *
 * These two features are one loop: tasks are the only thing that pays well, and the shop
 * is the only thing that spends. Testing them apart would miss the point.
 */

/** A garden one watering short of a finished flower bed — the job that raises a task. */
const ALMOST_WATERED = {
  garden: {
    flowers: [true, true, true, true, false],
    sandcastle: 0,
    apples: [false, false, false, false, false],
  },
};

/** A sandcastle one storey short of finished. */
const ALMOST_BUILT = {
  garden: {
    flowers: [false, false, false, false, false],
    sandcastle: 2,
    apples: [false, false, false, false, false],
  },
};

test('free play pays stars without raising a task', async ({ page }) => {
  const game = await Game.openWithSave(page, {
    settings: { mode: 'leg', matematik: true, dansk: true, voices: false },
  });
  await game.start();
  await game.enter('pool');

  await game.tap(AT.pool.lounger1.x, AT.pool.lounger1.y);
  await game.expectSave(s => s.pool.towels[0]).toBe(true);
  expect(await game.taskOpen()).toBe(false);
  expect(await game.stars()).toBeGreaterThan(0);
  game.expectNoErrors();
});

test('a single tap never raises a task — only a finished job does', async ({ page }) => {
  // Every chore used to ask a question, so making up one room asked five and cooking one
  // bowl of soup asked three. Taps pay a plain star now; the job asks.
  const game = await Game.openWithSave(page, {
    settings: { mode: 'laer', matematik: true, dansk: true, voices: false },
  });
  await game.start();
  await game.enter('rooms');

  await game.tap(AT.room.bed.x, AT.room.bed.y);
  await game.expectSave(s => s.rooms[0].bedMade, 'the chore still happens').toBe(true);
  expect(await game.taskOpen(), 'one chore is not a job').toBe(false);
  expect(await game.stars(), 'and it still pays something').toBeGreaterThan(0);
  game.expectNoErrors();
});

test('Lær mode raises a task, and solving it pays and records the skill', async ({ page }) => {
  const game = await Game.openWithSave(page, {
    ...ALMOST_WATERED,
    settings: { mode: 'laer', matematik: true, dansk: true, voices: false },
  });
  await game.start();
  await game.enter('garden');

  const before = await game.stars();
  await game.tap(AT.garden.wateringCan.x, AT.garden.wateringCan.y);
  expect(await game.waitForTask(), 'finishing the bed should raise a task').toBe(true);

  // the world already changed; the task decides the stars
  expect((await game.save()).garden.flowers.filter(Boolean)).toHaveLength(5);
  expect(await game.stars()).toBe(before);

  const { skill } = await game.solveTask();
  await game.expectSave(s => s.stars, 'a solved task pays').toBeGreaterThan(1);
  await game.expectSave(s => s.skills[skill]?.correct, 'the attempt is recorded').toBe(1);
  game.expectNoErrors();
});

test('a wrong answer costs a try and pays less, but does not end the task', async ({ page }) => {
  // Pinned to the pattern template, which has a genuine wrong answer. Counting tasks
  // succeed the moment the target is reached, so "answer it wrong" is not a state a
  // settled test can reach there.
  const game = await Game.openWithSave(page, {
    ...ALMOST_BUILT,
    settings: { mode: 'laer', matematik: true, dansk: true, voices: false },
    skills: Game.focusSkill('mønstre'),
  });
  await game.start();
  await game.enter('garden');

  await game.tap(AT.garden.sandbox.x, AT.garden.sandbox.y);
  expect(await game.waitForTask()).toBe(true);
  expect(await game.triesLeft(), 'three tries to begin with').toBe(3);

  await game.answerTaskWrong();
  expect(await game.taskOpen(), 'one wrong answer must not end the task').toBe(true);
  expect(await game.triesLeft(), 'but it costs a try').toBe(2);

  const { skill } = await game.solveTask();
  const save = await game.save();
  expect(save.stars, 'a stumble still pays').toBeGreaterThanOrEqual(1);
  expect(save.skills[skill].seen).toBe(1);
  expect(save.skills[skill].correct, 'a first-try miss does not count as mastered').toBe(0);
  game.expectNoErrors();
});

test('running out of tries closes the task and pays nothing', async ({ page }) => {
  // The consequence. Before this, guessing every option in turn always worked and always
  // paid, so the fastest way through a task was not to read it.
  // Pinned to mønstre level 3, which is a number pad: a pick-one or a pattern runs out of
  // wrong answers to give before the third miss, because each one is taken off the board.
  const game = await Game.openWithSave(page, {
    ...ALMOST_BUILT,
    settings: { mode: 'laer', matematik: true, dansk: true, voices: false },
    skills: Game.focusSkill('mønstre', 3),
  });
  await game.start();
  await game.enter('garden');

  await game.tap(AT.garden.sandbox.x, AT.garden.sandbox.y);
  expect(await game.waitForTask()).toBe(true);
  const before = await game.stars();

  await game.answerTaskWrong();
  await game.answerTaskWrong();
  expect(await game.taskOpen(), 'still open on the second miss').toBe(true);
  await game.answerTaskWrong();

  await game.waitForTaskToClose();
  expect(await game.stars(), 'three misses pays nothing').toBe(before);

  const save = await game.save();
  // focusSkill marks every other skill as well practised, so name the one under test
  expect(save.skills['mønstre'].seen, 'the attempt is still recorded').toBe(1);
  expect(save.skills['mønstre'].correct).toBe(0);

  // and the sandcastle the child built is still built — the world is never rolled back
  expect(save.garden.sandcastle).toBe(3);
  game.expectNoErrors();
});

test('three right in a row promotes a skill to the next level', async ({ page }) => {
  const game = await Game.openWithSave(page, {
    stars: 0,
    settings: { mode: 'laer', matematik: true, dansk: false, voices: false },
    // One tælling task away from a promotion, with every other skill marked well
    // practised so the picker reliably reaches for it.
    skills: {
      ...Game.focusSkill('tælling'),
      'tælling': { seen: 0, correct: 0, streak: 2, missed: 0, level: 1 },
    },
  });
  await game.start();
  await game.enter('kitchen');

  // cooking is the repeatable job, so it is the repeatable way to be asked something
  let promoted = false;
  for (let i = 0; i < 5 && !promoted; i++) {
    await game.cookDish();
    if (!(await game.waitForTask())) continue;
    const { skill } = await game.solveTask();
    if (skill === 'tælling') {
      promoted = (await game.save()).skills['tælling'].level === 2;
    }
  }
  expect(promoted, 'a third correct answer should promote the level').toBe(true);
  game.expectNoErrors();
});

test('every number-pad key is reachable', async ({ page }) => {
  const game = await Game.openWithSave(page, {
    settings: { mode: 'laer', matematik: true, dansk: false, voices: false },
    // minus at level 2 uses the number pad; every other skill is marked well practised so
    // the picker (least-practised first) reaches for it
    skills: Game.focusSkill('minus', 2),
  });
  await game.start();
  await game.enter('kitchen');

  await game.cookDish();
  expect(await game.waitForTask()).toBe(true);

  const controls = await game.taskControls();
  const digits = controls.filter(c => c.label !== null && /^[0-9]$/.test(c.label));
  expect(digits.map(d => d.label).sort(), 'all ten digits must be present')
    .toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);

  // nothing may cover anything else
  const boxes = controls.filter(c => c.label !== null);
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i];
      const b = boxes[j];
      const overlaps =
        Math.abs(a.x - b.x) * 2 < a.w + b.w &&
        Math.abs(a.y - b.y) * 2 < a.h + b.h;
      expect(overlaps, `"${a.label}" and "${b.label}" overlap`).toBe(false);
    }
  }

  await game.solveTask();
  game.expectNoErrors();
});

test('the shop spends stars and the item shows up in its scene', async ({ page }) => {
  const game = await Game.openWithSave(page, { stars: 20 });
  await game.start();

  await game.tap(AT.shop.x, AT.shop.y);
  await game.waitForScene('ShopScene');

  const bath = await game.shopCard('Fuglebad');
  await game.tap(bath.x, bath.y);

  await game.expectSave(s => s.owned, 'the purchase is recorded').toContain('birdbath');
  await game.expectSave(s => s.stars, 'stars are spent').toBe(9);
  await game.expectScreen('ShopScene', 'the card should read as bought').toContain('Købt');

  // and it is actually placed in the garden
  await game.tap(AT.back.x, AT.back.y);
  await game.waitForScene('HotelMapScene');
  await game.enter('garden');
  const before = await game.page.evaluate(() =>
    (window.__game.scene.getScene('GardenScene') as any).dynamic.list.length
  );
  expect(before).toBeGreaterThan(0);
  game.expectNoErrors();
});

test('an item you cannot afford is not sold', async ({ page }) => {
  const game = await Game.openWithSave(page, { stars: 3 });
  await game.start();

  await game.tap(AT.shop.x, AT.shop.y);
  await game.waitForScene('ShopScene');

  const flamingo = await game.shopCard('Flamingoring');   // costs 18
  await game.tap(flamingo.x, flamingo.y);

  const save = await game.save();
  expect(save.owned).not.toContain('flamingo');
  expect(save.stars).toBe(3);
  // still on sale — the card shows its price rather than "Købt"
  await game.expectScreen('ShopScene').not.toContain('Købt');
  game.expectNoErrors();
});

test('turning both subjects off leaves at least one on', async ({ page }) => {
  const game = await Game.openWithSave(page, {
    settings: { mode: 'laer', matematik: true, dansk: true, voices: false },
  });
  await game.start();
  await game.tap(AT.settings.x, AT.settings.y);
  await game.waitForScene('SettingsScene');

  await game.tap(AT.toggleMath.x, AT.toggleMath.y);
  await game.expectSave(s => s.settings.matematik).toBe(false);

  // dansk is now the only subject left; it must refuse to switch off
  await game.tap(AT.toggleDansk.x, AT.toggleDansk.y);
  const save = await game.save();
  expect(save.settings.dansk, 'the last subject cannot be switched off').toBe(true);
  game.expectNoErrors();
});

/**
 * The second tier of the star sink: upgrades that change the hotel rather than decorate it.
 */

test('the fourth room upgrade adds a real room everywhere', async ({ page }) => {
  const game = await Game.openWithSave(page, { stars: 40 });
  await game.start();

  // three rooms to begin with
  await game.enter('rooms');
  await game.expectScreen('RoomScene').not.toContain('Rum 4');
  await game.leave();

  await game.tap(AT.shop.x, AT.shop.y);
  await game.waitForScene('ShopScene');
  await game.tap(AT.shopTabHotel.x, AT.shopTabHotel.y);

  const room4 = await game.shopCard('Fjerde værelse');
  await game.tap(room4.x, room4.y);

  await game.expectSave(s => s.owned, 'the upgrade is recorded').toContain('room4');
  await game.expectSave(s => s.rooms.length, 'the hotel actually gains a room').toBe(4);
  await game.expectSave(s => s.stars, 'it costs 32 stars').toBe(8);

  // and it shows up in both scenes that care about the room count
  await game.tap(AT.back.x, AT.back.y);
  await game.waitForScene('HotelMapScene');
  await game.enter('rooms');
  await game.expectScreen('RoomScene', 'a fourth tab').toContain('Rum 4');
  await game.leave();
  await game.enter('lobby');
  await game.expectScreen('LobbyScene', 'a fourth key on the board').toContain('4');
  game.expectNoErrors();
});

test('a bought theme becomes selectable in the rooms', async ({ page }) => {
  const game = await Game.openWithSave(page, { stars: 30 });
  await game.start();

  // no picker while there is nothing to pick
  await game.enter('rooms');
  await game.expectScreen('RoomScene').toContain('Rum 1 · Solskin');
  await game.leave();

  await game.tap(AT.shop.x, AT.shop.y);
  await game.waitForScene('ShopScene');
  await game.tap(AT.shopTabHotel.x, AT.shopTabHotel.y);
  const desert = await game.shopCard('Ørken-tema');
  await game.tap(desert.x, desert.y);
  await game.expectSave(s => s.owned).toContain('theme-desert');

  await game.tap(AT.back.x, AT.back.y);
  await game.waitForScene('HotelMapScene');
  await game.enter('rooms');

  // Swatches are centred on x = width - 132 and spaced 34 apart; with the three built-in
  // themes plus the one just bought there are four, and the new one is last.
  const swatchAt = (index: number, count: number) => ({
    x: GAME_WIDTH - 132 + (index - (count - 1) / 2) * 34,
    y: 78,
  });
  const swatch = swatchAt(3, 4);
  await game.tap(swatch.x, swatch.y);
  await game.expectSave(s => s.rooms[0].theme, 'the room keeps its new look').toBe(3);
  await game.expectScreen('RoomScene').toContain('Rum 1 · Ørkenen');

  // and only that room changed
  expect((await game.save()).rooms[1].theme).toBe(1);
  game.expectNoErrors();
});

test('an older save from before the guest flow still loads, keeping the stars', async ({ page }) => {
  // A version 3 save: guests with no plan, a kitchen with no pass. Rather than
  // half-restoring a hotel that cannot work, the stars are kept and the day starts again.
  const game = await Game.openWithSave(page, {
    version: 3,
    stars: 17,
    guests: [{ id: 0, name: 'Hr. Jensen', color: 0xE88E7D, roomNumber: 0, checkedIn: true }],
    kitchen: { recipe: 'Suppe', added: ['Gulerod'], showingDining: false, dishesServed: 4 },
  });
  await game.start();

  const save = await game.save();
  expect(save.version, 'the save is migrated in place').toBe(4);
  expect(save.stars, 'the stars a child earned are never taken away').toBe(17);
  expect(save.guests, 'guests without a plan cannot be resumed').toEqual([]);
  expect(save.kitchen.ready, 'and the pass starts empty').toEqual([]);
  game.expectNoErrors();
});

test('room upgrades stack, so the cheaper one is never wasted', async ({ page }) => {
  const game = await Game.openWithSave(page, { stars: 100 });
  await game.start();
  await game.tap(AT.shop.x, AT.shop.y);
  await game.waitForScene('ShopScene');
  await game.tap(AT.shopTabHotel.x, AT.shopTabHotel.y);

  // the second floor adds two rooms to whatever the hotel already has
  const floor = await game.shopCard('Første sal');
  await game.tap(floor.x, floor.y);
  await game.expectSave(s => s.rooms.length, 'three plus two').toBe(5);

  const room4 = await game.shopCard('Fjerde værelse');
  await game.tap(room4.x, room4.y);
  await game.expectSave(s => s.rooms.length, 'and one more on top').toBe(6);

  // six is the ceiling
  await game.expectSave(s => s.stars).toBe(100 - 48 - 32);
  await game.tap(AT.back.x, AT.back.y);
  await game.waitForScene('HotelMapScene');
  await game.enter('rooms');
  await game.expectScreen('RoomScene', 'six tabs').toContain('Rum 6');
  await game.leave();
  await game.enter('lobby');
  await game.expectScreen('LobbyScene', 'six keys on the board').toContain('6');
  game.expectNoErrors();
});

test('every shop entry can be bought and shows as bought', async ({ page }) => {
  // Twenty purchases plus a sweep of all five scenes; the default budget is for a test
  // that taps a handful of times.
  test.slow();

  const game = await Game.openWithSave(page, { stars: 500 });
  await game.start();

  const catalogue = await page.evaluate(async (shopUrl) => {
    const mod: any = await import(/* @vite-ignore */ shopUrl);
    return {
      things: mod.SHOP_ITEMS.map((i: any) => i.name) as string[],
      upgrades: mod.SHOP_UPGRADES.map((i: any) => i.name) as string[],
    };
  }, SHOP);
  expect(catalogue.things.length + catalogue.upgrades.length,
    'the catalogue should be worth saving for').toBeGreaterThanOrEqual(20);

  await game.tap(AT.shop.x, AT.shop.y);
  await game.waitForScene('ShopScene');

  for (const name of catalogue.things) {
    const card = await game.shopCard(name);
    await game.tap(card.x, card.y);
  }
  await game.tap(AT.shopTabHotel.x, AT.shopTabHotel.y);
  for (const name of catalogue.upgrades) {
    const card = await game.shopCard(name);
    await game.tap(card.x, card.y);
  }

  const save = await game.save();
  expect(save.owned).toHaveLength(catalogue.things.length + catalogue.upgrades.length);
  await game.expectScreen('ShopScene').toContain('Du har købt alt til hotellet!');

  // and nothing throws while every scene renders its full set of decorations
  await game.tap(AT.back.x, AT.back.y);
  await game.waitForScene('HotelMapScene');
  for (const area of ['lobby', 'rooms', 'kitchen', 'pool', 'garden'] as const) {
    await game.enter(area);
    await game.leave();
  }
  game.expectNoErrors();
});
