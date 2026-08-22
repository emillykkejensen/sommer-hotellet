import { test, expect } from '@playwright/test';
import { AT, Game } from './game';

/**
 * Sound is synthesised, so there are no files to assert on and nothing to hear in a
 * headless browser. What can be verified is the contract around it: the context is not
 * built until the player interacts, exactly one is ever built, actions really do produce
 * sound, and muting really does silence it.
 */

test('no AudioContext exists until the player interacts', async ({ page }) => {
  const game = await Game.open(page);

  // the menu is up and nothing has been tapped
  expect((await game.audioTally()).contexts, 'nothing should build an AudioContext at boot')
    .toBe(0);

  await game.start();
  expect((await game.audioTally()).contexts, 'the first tap builds exactly one').toBe(1);
  game.expectNoErrors();
});

test('one AudioContext serves the whole session', async ({ page }) => {
  const game = await Game.open(page);
  await game.start();

  for (const area of ['lobby', 'pool', 'garden'] as const) {
    await game.enter(area);
    await game.leave();
  }

  expect((await game.audioTally()).contexts, 'the context is reused, not rebuilt').toBe(1);
  game.expectNoErrors();
});

test('the reception bell makes a sound, and muting silences it', async ({ page }) => {
  const game = await Game.open(page);
  await game.start();
  await game.enter('lobby');

  const rung = await game.countingSounds(() => game.tap(AT.lobby.bell.x, AT.lobby.bell.y));
  expect(rung.sources, 'ringing the bell should produce sound').toBeGreaterThan(1);

  // mute
  await game.leave();
  await game.tap(AT.settings.x, AT.settings.y);
  await game.waitForScene('SettingsScene');
  await game.tap(AT.toggleSound.x, AT.toggleSound.y);
  await game.expectSave(s => s.settings.sound, 'the mute should persist').toBe(false);

  await game.tap(AT.back.x, AT.back.y);
  await game.waitForScene('HotelMapScene');
  await game.enter('lobby');

  const muted = await game.countingSounds(() => game.tap(AT.lobby.bell.x, AT.lobby.bell.y));
  expect(muted.sources, 'a muted bell should produce nothing').toBe(0);
  game.expectNoErrors();
});

test('finishing a chore is audible', async ({ page }) => {
  const game = await Game.open(page);
  await game.start();
  await game.enter('rooms');

  const made = await game.countingSounds(() => game.tap(AT.room.bed.x, AT.room.bed.y));
  expect(made.sources, 'making the bed should play the tap and the reward').toBeGreaterThan(1);
  game.expectNoErrors();
});

test('a muted game still plays normally', async ({ page }) => {
  const game = await Game.openWithSave(page, {
    settings: { mode: 'leg', matematik: true, dansk: true, speak: false, sound: false },
  });
  await game.start();
  await game.enter('pool');

  await game.tap(AT.pool.lounger1.x, AT.pool.lounger1.y);
  await game.expectSave(s => s.pool.towels[0], 'muting must not affect gameplay').toBe(true);
  expect((await game.audioTally()).contexts, 'a muted game builds no context at all').toBe(0);
  game.expectNoErrors();
});

test('a task plays feedback for both a right and a wrong answer', async ({ page }) => {
  const game = await Game.openWithSave(page, {
    settings: { mode: 'laer', matematik: true, dansk: true, speak: false, sound: true },
  });
  await game.start();
  await game.enter('garden');

  await game.tap(AT.garden.sandbox.x, AT.garden.sandbox.y);
  expect(await game.waitForTask()).toBe(true);

  const wrong = await game.countingSounds(() => game.answerTaskWrong());
  expect(wrong.sources, 'a wrong answer should be acknowledged').toBeGreaterThan(1);

  const right = await game.countingSounds(() => game.solveTask());
  expect(right.sources, 'a correct answer should play the success arpeggio')
    .toBeGreaterThan(wrong.sources);
  game.expectNoErrors();
});
