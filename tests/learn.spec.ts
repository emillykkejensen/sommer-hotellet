import { test, expect } from '@playwright/test';
import { AT, Game } from './game';

/**
 * The star shop and the task layer.
 *
 * These two features are one loop: tasks are the only thing that pays well, and the shop
 * is the only thing that spends. Testing them apart would miss the point.
 */

test('free play pays stars without raising a task', async ({ page }) => {
  const game = await Game.openWithSave(page, { settings: { mode: 'leg', matematik: true, dansk: true, speak: false } });
  await game.start();
  await game.enter('pool');

  await game.tap(AT.pool.lounger1.x, AT.pool.lounger1.y);
  await game.expectSave(s => s.pool.towels[0]).toBe(true);
  expect(await game.taskOpen()).toBe(false);
  expect(await game.stars()).toBeGreaterThan(0);
  game.expectNoErrors();
});

test('the grown-up screen switches to Lær and it sticks', async ({ page }) => {
  const game = await Game.openWithSave(page, {});
  await game.start();

  await game.tap(AT.settings.x, AT.settings.y);
  await game.waitForScene('SettingsScene');
  await game.tap(AT.settingsModeLaer.x, AT.settingsModeLaer.y);
  await game.expectSave(s => s.settings.mode, 'mode should persist').toBe('laer');

  await game.tap(AT.settingsModeLeg.x, AT.settingsModeLeg.y);
  await game.expectSave(s => s.settings.mode).toBe('leg');
  game.expectNoErrors();
});

test('Lær mode raises a task, and solving it pays and records the skill', async ({ page }) => {
  const game = await Game.openWithSave(page, {
    settings: { mode: 'laer', matematik: true, dansk: true, speak: false },
  });
  await game.start();
  await game.enter('garden');

  await game.tap(AT.garden.wateringCan.x, AT.garden.wateringCan.y);
  expect(await game.waitForTask(), 'a task should appear in Lær mode').toBe(true);

  // the world already changed; the task decides the stars
  expect((await game.save()).garden.flowers.filter(Boolean)).toHaveLength(1);
  expect(await game.stars()).toBe(0);

  const { skill } = await game.solveTask();
  await game.expectSave(s => s.stars, 'a solved task pays').toBeGreaterThan(1);
  await game.expectSave(s => s.skills[skill]?.correct, 'the attempt is recorded').toBe(1);
  game.expectNoErrors();
});

test('a wrong answer never ends the task and still pays', async ({ page }) => {
  // Pinned to the pattern template, which has a genuine wrong answer. Counting tasks
  // succeed the moment the target is reached, so "answer it wrong" is not a state a
  // settled test can reach there.
  const game = await Game.openWithSave(page, {
    settings: { mode: 'laer', matematik: true, dansk: true, speak: false },
    skills: Game.focusSkill('mønstre'),
  });
  await game.start();
  await game.enter('garden');

  await game.tap(AT.garden.sandbox.x, AT.garden.sandbox.y);
  expect(await game.waitForTask()).toBe(true);

  await game.answerTaskWrong();
  // no fail state: the card is still up and the child can carry on
  expect(await game.taskOpen(), 'the task must stay open after a wrong answer').toBe(true);

  const { skill } = await game.solveTask();
  const save = await game.save();
  expect(save.stars, 'a stumble still pays at least one star').toBeGreaterThanOrEqual(1);
  expect(save.skills[skill].seen).toBe(1);
  expect(save.skills[skill].correct, 'a first-try miss does not count as mastered').toBe(0);
  game.expectNoErrors();
});

test('three right in a row promotes a skill to the next level', async ({ page }) => {
  const game = await Game.openWithSave(page, {
    stars: 0,
    settings: { mode: 'laer', matematik: true, dansk: false, speak: false },
    // One tælling task away from a promotion, with every other skill marked well
    // practised so the picker reliably reaches for it.
    skills: {
      ...Game.focusSkill('tælling'),
      'tælling': { seen: 0, correct: 0, streak: 2, missed: 0, level: 1 },
    },
  });
  await game.start();
  await game.enter('garden');

  // water flowers until a counting task comes up and is solved
  let promoted = false;
  for (let i = 0; i < 5 && !promoted; i++) {
    await game.tap(AT.garden.wateringCan.x, AT.garden.wateringCan.y);
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
    settings: { mode: 'laer', matematik: true, dansk: false, speak: false },
    // minus at level 2 uses the number pad; every other skill is marked well practised so
    // the picker (least-practised first) reaches for it
    skills: Game.focusSkill('minus', 2),
    rooms: Array.from({ length: 3 }, () => ({
      bedMade: false, curtainsOpen: false, flowersPlaced: false,
      vacuumed: false, towelsFolded: false, guestId: null,
    })),
  });
  await game.start();
  await game.enter('rooms');

  await game.tap(AT.room.bed.x, AT.room.bed.y);
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
    settings: { mode: 'laer', matematik: true, dansk: true, speak: false },
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

  const room4 = await game.shopCard('Fjerde værelse', 224);
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
  const desert = await game.shopCard('Ørken-tema', 224);
  await game.tap(desert.x, desert.y);
  await game.expectSave(s => s.owned).toContain('theme-desert');

  await game.tap(AT.back.x, AT.back.y);
  await game.waitForScene('HotelMapScene');
  await game.enter('rooms');

  // Swatches are centred on x = width - 132 and spaced 34 apart; with the three built-in
  // themes plus the one just bought there are four, and the new one is last.
  const swatchAt = (index: number, count: number) => ({
    x: 960 - 132 + (index - (count - 1) / 2) * 34,
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

test('an older save without themes or a fourth room still loads', async ({ page }) => {
  // a version 3 save written before either upgrade existed
  const game = await Game.openWithSave(page, {
    stars: 5,
    rooms: [
      { bedMade: true, curtainsOpen: false, flowersPlaced: false, vacuumed: false, towelsFolded: false, guestId: null },
      { bedMade: false, curtainsOpen: false, flowersPlaced: false, vacuumed: false, towelsFolded: false, guestId: null },
      { bedMade: false, curtainsOpen: false, flowersPlaced: false, vacuumed: false, towelsFolded: false, guestId: null },
    ],
  });
  await game.start();
  await game.enter('rooms');

  // the chore it had done survives, and every room gets a theme
  await game.expectScreen('RoomScene').toContain('Sengen er redt');
  const save = await game.save();
  expect(save.rooms).toHaveLength(3);
  expect(save.rooms.map((r: any) => r.theme)).toEqual([0, 1, 2]);
  game.expectNoErrors();
});
