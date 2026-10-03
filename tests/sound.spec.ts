import { test, expect } from '@playwright/test';
import { AT, Game } from './game';

/**
 * Sound is synthesised, so there are no files to assert on and nothing to hear in a
 * headless browser. What can be verified is the contract around it: the context is not
 * built until the player interacts, exactly one is ever built, actions really do produce
 * sound, and muting really does silence it.
 */

/**
 * Guest gibberish lives well below every other cue.
 *
 * The babble is a sawtooth at roughly 120-190 Hz; the lowest note anything else plays is
 * the 165 Hz tail of `denied`, and no effect starts below 196. So a scheduled pitch under
 * 160 means a guest opened their mouth, and nothing else does.
 */
const isBabble = (pitch: number) => pitch < 160;

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
    settings: { mode: 'leg', matematik: true, dansk: true, voices: false, sound: false },
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
    ...Game.guestDoneAt('room'),
    settings: { mode: 'laer', matematik: true, dansk: true, voices: false, sound: true },
    skills: Game.focusSkill('mønstre'),
  });
  await game.start();
  await game.enter('rooms');

  await game.helpGuest(0, 'Følg med mig');
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

test('a guest speaking plays gibberish, and it can be switched off on its own', async ({ page }) => {
  // This replaced Danish speech synthesis: nonsense syllables carry "somebody is talking to
  // you" without reading out a Danish sentence in whatever voice the device happens to have.
  const game = await Game.openWithSave(page, {
    ...Game.guestWaitingAt('pool'),
    settings: { mode: 'leg', matematik: true, dansk: true, voices: true, sound: true, music: false },
  });
  await game.start();

  const spoke = await game.countingSounds(() => game.enter('pool'));
  expect(spoke.pitches.filter(isBabble).length, 'the waiting guest should say something')
    .toBeGreaterThan(1);

  // and they answer when tapped
  const answered = await game.countingSounds(() => game.tapGuest(0));
  expect(answered.pitches.filter(isBabble).length, 'tapping a guest makes them talk')
    .toBeGreaterThan(1);
  game.expectNoErrors();
});

test('guest voices off leaves the rest of the sound alone', async ({ page }) => {
  const game = await Game.openWithSave(page, {
    ...Game.guestWaitingAt('pool'),
    settings: { mode: 'leg', matematik: true, dansk: true, voices: false, sound: true, music: false },
  });
  await game.start();

  const quiet = await game.countingSounds(() => game.enter('pool'));
  expect(quiet.pitches.filter(isBabble), 'nobody should babble with voices off').toEqual([]);

  // effects still work
  const laid = await game.countingSounds(() => game.tap(AT.pool.lounger1.x, AT.pool.lounger1.y));
  expect(laid.sources, 'laying a towel is still audible').toBeGreaterThan(1);
  game.expectNoErrors();
});

test('the game never touches the browser speech synthesiser', async ({ page }) => {
  // The Danish read-aloud is gone. It sounded like a station announcement on any device
  // with a flat da-DK voice, and it read out text the target child cannot read anyway.
  await page.addInitScript(() => {
    (window as any).__spoke = 0;
    const synth = window.speechSynthesis;
    if (!synth) return;
    const real = synth.speak.bind(synth);
    synth.speak = (u: SpeechSynthesisUtterance) => {
      (window as any).__spoke++;
      return real(u);
    };
  });

  const game = await Game.openWithSave(page, {
    ...Game.guestWaitingAt('pool'),
    settings: { mode: 'laer', matematik: true, dansk: true, voices: true, sound: true, music: false },
  });
  await game.start();
  await game.enter('pool');
  await game.tap(AT.pool.lounger1.x, AT.pool.lounger1.y);
  await game.helpGuest(0, 'Giv solstol');

  expect(await page.evaluate(() => (window as any).__spoke),
    'nothing should reach speechSynthesis').toBe(0);
  game.expectNoErrors();
});

test('the music plays on its own bus and can be switched off alone', async ({ page }) => {
  const game = await Game.openWithSave(page, {
    settings: { mode: 'leg', matematik: true, dansk: true, voices: false, sound: true, music: true },
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
    settings: { mode: 'leg', matematik: true, dansk: true, voices: false, sound: false, music: true },
  });
  await game.start();
  await game.enter('garden');

  // sound off is the master switch: music must not build a context behind it
  expect((await game.audioTally()).contexts, 'no context at all').toBe(0);
  game.expectNoErrors();
});
