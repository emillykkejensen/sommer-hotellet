import { test, expect } from '@playwright/test';
import { AT, Game } from './game';

/**
 * One test per scene, each asserting that a tap changed persisted state.
 *
 * Every one of these fails against the pre-fix build: the scenes reset their own
 * progress in create() and then called scene.restart() from the click handler, so the
 * change was erased before it could be drawn.
 */

test('menu reaches the hotel map', async ({ page }) => {
  const game = await Game.open(page);
  await game.start();
  game.expectNoErrors();
});

test('room chores persist and cannot be repeated', async ({ page }) => {
  const game = await Game.open(page);
  await game.start();
  await game.enter('rooms');

  await game.tap(AT.room.bed.x, AT.room.bed.y);
  await game.expectSave(s => s.rooms[0].bedMade, 'bed should stay made').toBe(true);
  await game.expectScreen('RoomScene', 'the room must show the bed as made')
    .toContain('Sengen er redt');

  // Making up a room is preparation: the star comes when a guest has slept in it.
  expect(await game.stars(), 'housework pays nothing by itself').toBe(0);

  // a finished chore stays finished
  await game.tap(AT.room.bed.x, AT.room.bed.y);
  await game.expectSave(s => s.rooms[0].bedMade).toBe(true);

  await game.tap(AT.room.window.x, AT.room.window.y);
  await game.tap(AT.room.vase.x, AT.room.vase.y);
  await game.tap(AT.room.towels.x, AT.room.towels.y);
  await game.tap(AT.room.vacuum.x, AT.room.vacuum.y);

  await game.expectSave(s => s.rooms[0], 'all five chores done').toMatchObject({
    bedMade: true,
    curtainsOpen: true,
    flowersPlaced: true,
    towelsFolded: true,
    vacuumed: true,
  });
  expect(await game.stars(), 'not even a whole room').toBe(0);
  game.expectNoErrors();
});

test('the kitchen keeps its recipe and cooking puts a dish on the pass', async ({ page }) => {
  const game = await Game.open(page);
  await game.start();
  await game.enter('kitchen');

  await game.tap(AT.kitchen.recipe1.x, AT.kitchen.recipe1.y);
  await game.expectSave(s => s.kitchen.recipe, 'recipe selection should stick').toBe('Suppe');
  // selecting a recipe must actually reveal its ingredients on screen
  await game.expectScreen('KitchenScene', 'ingredients should appear').toContain('Gulerod');

  await game.tap(AT.kitchen.ingredient1.x, AT.kitchen.ingredient1.y);
  await game.tap(AT.kitchen.ingredient2.x, AT.kitchen.ingredient2.y);
  await game.tap(AT.kitchen.ingredient3.x, AT.kitchen.ingredient3.y);
  await game.expectSave(s => s.kitchen.added.length, 'three ingredients in the pot').toBe(3);

  // Ingredients are free — the whole recipe is one job, and the stove is what pays for it.
  expect(await game.stars(), 'putting a carrot in a pot is not worth a star').toBe(0);

  await game.expectScreen('KitchenScene', 'a full pot offers to be cooked').toContain('Kog suppe');
  await game.tap(AT.kitchen.cook.x, AT.kitchen.cook.y);

  await game.expectSave(s => s.kitchen.ready, 'the dish is ready for the tables').toEqual(['Suppe']);
  await game.expectSave(s => s.kitchen.recipe, 'and the pot is empty again').toBe(null);
  expect(await game.stars(), 'the star is for the guest who eats it, not the pot').toBe(0);
  game.expectNoErrors();
});

test('the restaurant toggle sticks', async ({ page }) => {
  const game = await Game.open(page);
  await game.start();
  await game.enter('kitchen');

  await game.tap(AT.kitchen.toggle.x, AT.kitchen.toggle.y);
  await game.expectSave(s => s.kitchen.showingDining).toBe(true);
  await game.expectScreen('KitchenScene', 'the restaurant should be on screen')
    .toContain('Restauranten');
  // and only one title, not one stacked on top of the other
  const titles = (await game.visibleText('KitchenScene'))
    .filter(t => t === 'Restauranten' || t === 'Køkkenet');
  expect(titles, 'exactly one scene title').toEqual(['Restauranten']);

  await game.tap(AT.kitchen.toggle.x, AT.kitchen.toggle.y);
  await game.expectSave(s => s.kitchen.showingDining).toBe(false);
  game.expectNoErrors();
});

test('pool towels persist per lounger and cannot be repeated', async ({ page }) => {
  const game = await Game.open(page);
  await game.start();
  await game.enter('pool');

  await game.tap(AT.pool.lounger1.x, AT.pool.lounger1.y);
  await game.expectSave(s => s.pool.towels[0], 'towel should stay on lounger 1').toBe(true);
  await game.expectScreen('PoolScene', 'the lounger must be drawn as ready')
    .toContain('Klar');
  await game.expectScreen('PoolScene', 'the counter must reflect one towel')
    .toContain('Læg håndklæder på solstolene — 1 af 4');
  const afterOne = await game.stars();

  // the original bug: five taps on one lounger paid five stars — and now a towel pays
  // nothing at all until somebody lies on it
  expect(afterOne).toBe(0);
  await game.tap(AT.pool.lounger1.x, AT.pool.lounger1.y);
  await game.tap(AT.pool.lounger1.x, AT.pool.lounger1.y);
  expect(await game.stars()).toBe(afterOne);
  expect((await game.save()).pool.towels.filter(Boolean)).toHaveLength(1);

  await game.tap(AT.pool.lounger2.x, AT.pool.lounger2.y);
  await game.expectSave(s => s.pool.towels.filter(Boolean).length).toBe(2);
  game.expectNoErrors();
});

test('garden watering and sandcastle accumulate', async ({ page }) => {
  const game = await Game.open(page);
  await game.start();
  await game.enter('garden');

  await game.tap(AT.garden.wateringCan.x, AT.garden.wateringCan.y);
  await game.tap(AT.garden.wateringCan.x, AT.garden.wateringCan.y);
  await game.expectSave(s => s.garden.flowers.filter(Boolean).length, 'two flowers watered').toBe(2);
  await game.expectScreen('GardenScene', 'the flower bed must show progress')
    .toContain('Vandet 2 af 5');

  await game.tap(AT.garden.sandbox.x, AT.garden.sandbox.y);
  await game.tap(AT.garden.sandbox.x, AT.garden.sandbox.y);
  await game.expectSave(s => s.garden.sandcastle, 'castle reaches stage 2').toBe(2);
  await game.expectScreen('GardenScene', 'the sandbox must show progress')
    .toContain('Byg videre — 2 af 3');
  game.expectNoErrors();
});

test('lobby check-in assigns a room and the guest waits to be shown the way', async ({ page }) => {
  const game = await Game.open(page);
  await game.start();
  await game.enter('lobby');

  await game.tap(AT.lobby.bell.x, AT.lobby.bell.y);
  await game.expectSave(s => s.guests.length, 'bell summons a guest').toBe(1);

  const arrival = (await game.guests())[0];
  expect(arrival.at, 'a new guest waits at the desk').toBe('lobby');
  expect(arrival.plan, 'and turns up with a plan for the day').toContain('room');

  await game.helpGuest(arrival.id, 'Giv nøgle til værelse 1');
  await game.expectSave(s => s.guests[0]?.checkedIn, 'guest checks in').toBe(true);

  const save = await game.save();
  expect(save.rooms[0].guestId).toBe(save.guests[0].id);
  // They stay put with their key until the player leads them — nobody walks off alone.
  expect(save.guests[0].at).toBe('lobby');
  expect(save.guests[0].done).toBe(true);
  game.expectNoErrors();
});

test('progress survives leaving and re-entering a scene', async ({ page }) => {
  const game = await Game.open(page);
  await game.start();

  await game.enter('pool');
  await game.tap(AT.pool.lounger1.x, AT.pool.lounger1.y);
  await game.expectSave(s => s.pool.towels[0]).toBe(true);

  await game.leave();
  await game.enter('pool');

  // the towel is still there, still drawn, and re-entering does not re-award it
  expect((await game.save()).pool.towels[0]).toBe(true);
  await game.expectScreen('PoolScene', 'the towel must still be drawn after re-entering')
    .toContain('Klar');
  const stars = await game.stars();
  await game.tap(AT.pool.lounger1.x, AT.pool.lounger1.y);
  expect(await game.stars()).toBe(stars);
  game.expectNoErrors();
});

test('every scene loads without a renderer error', async ({ page }) => {
  const game = await Game.open(page);
  await game.start();

  for (const area of ['lobby', 'rooms', 'kitchen', 'pool', 'garden'] as const) {
    await game.enter(area);
    await game.leave();
  }

  game.expectNoErrors();
});

test('the title screen has a way out of the game', async ({ page }) => {
  // A browser will not let a page close its own tab, so on the web the button says goodbye
  // instead. Either way there has to be something to press: the Android build runs
  // fullscreen with the system bars hidden, and had no exit at all.
  const game = await Game.open(page);

  await game.expectScreen('MainMenuScene', 'an exit button on the title screen')
    .toContain('Afslut');

  await game.tap(AT.exitButton.x, AT.exitButton.y);
  await game.expectScreen('MainMenuScene', 'a farewell rather than a dead button')
    .toContain('Tak for i dag!');

  // and it is not a trap — the game can be resumed
  await game.expectScreen('MainMenuScene').toContain('Spil videre');
  game.expectNoErrors();
});
