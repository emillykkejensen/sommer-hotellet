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
  // Pinned to the pattern template: it has a real wrong answer that leaves the task open,
  // which is exactly what this test needs to hear.
  const game = await Game.openWithSave(page, {
    settings: { mode: 'laer', matematik: true, dansk: true, speak: false, sound: true },
    skills: Game.focusSkill('mønstre'),
  });
  await game.start();
  await game.enter('garden');

  await game.tap(AT.garden.sandbox.x, AT.garden.sandbox.y);
  expect(await game.waitForTask()).toBe(true);

  // Identified by pitch, not by node count. Comparing how many sources two different
  // answers start compares two whole code paths — the reward chime lands inside the window
  // or just after it depending on how fast the renderer is — and 392/330 belong to the
  // nudge and 523/659 to the success arpeggio, so the cue itself can be named.
  const wrong = await game.countingSounds(() => game.answerTaskWrong());
  expect(wrong.pitches, 'a wrong answer plays the two-note nudge')
    .toEqual(expect.arrayContaining([392, 330]));
  expect(wrong.pitches, 'and never the success arpeggio').not.toContain(523);

  const right = await game.countingSounds(() => game.solveTask());
  expect(right.pitches, 'a correct answer plays the rising arpeggio')
    .toEqual(expect.arrayContaining([523, 659, 784]));
  expect(right.pitches, 'and never the nudge').not.toContain(330);
  game.expectNoErrors();
});

test('the music plays on its own bus and can be switched off alone', async ({ page }) => {
  const game = await Game.openWithSave(page, {
    settings: { mode: 'leg', matematik: true, dansk: true, speak: false, sound: true, music: true },
  });

  // nothing before the first gesture, music included
  expect((await game.audioTally()).contexts).toBe(0);

  await game.start();
  // the pad is six voices per bar, so unlocking should produce more than a lone tap
  const afterUnlock = await game.audioTally();
  expect(afterUnlock.oscillators, 'the pad should start with the first tap').toBeGreaterThan(3);

  // turning music off leaves effects working
  await game.tap(AT.settings.x, AT.settings.y);
  await game.waitForScene('SettingsScene');
  await game.tap(AT.toggleMusic.x, AT.toggleMusic.y);
  await game.expectSave(s => s.settings.music, 'the choice persists').toBe(false);
  expect((await game.save()).settings.sound, 'effects stay on').toBe(true);

  await game.tap(AT.back.x, AT.back.y);
  await game.waitForScene('HotelMapScene');
  await game.enter('lobby');

  const rung = await game.countingSounds(() => game.tap(AT.lobby.bell.x, AT.lobby.bell.y));
  expect(rung.sources, 'the bell still rings with music off').toBeGreaterThan(1);
  game.expectNoErrors();
});

test('music stays silent when all sound is off', async ({ page }) => {
  const game = await Game.openWithSave(page, {
    settings: { mode: 'leg', matematik: true, dansk: true, speak: false, sound: false, music: true },
  });
  await game.start();
  await game.enter('garden');

  // sound off is the master switch: music must not build a context behind it
  expect((await game.audioTally()).contexts, 'no context at all').toBe(0);
  game.expectNoErrors();
});
