import { test, expect } from '@playwright/test';
import { AT, Game } from './game';

/**
 * The conditions the Android build runs under, tested in a browser.
 *
 * A WebView is not Chrome: it has no Web Speech API, it has a hardware back button, and it
 * has no network. Each of those is reproducible here — remove `speechSynthesis`, call the
 * back handler directly, watch for outbound requests — so the app-only behaviour is covered
 * by the same suite as everything else rather than only by installing it on a phone.
 */

const NAVIGATION = '/src/helpers/Navigation.ts';

/** Hides `speechSynthesis` the way an Android WebView does: the property simply is not there. */
async function hideSpeechSynthesis(page: import('@playwright/test').Page): Promise<void> {
  await page.addInitScript(() => {
    for (const name of ['speechSynthesis', 'SpeechSynthesisUtterance']) {
      Object.defineProperty(window, name, { configurable: true, get: () => undefined });
    }
  });
}

test('a task still pays when the browser has no speech synthesis', async ({ page }) => {
  // Read-aloud is on, and the API it wants does not exist. Nothing may throw, and the task
  // has to behave exactly as it does with a voice — silence is a missing nicety, not a bug.
  await hideSpeechSynthesis(page);

  const game = await Game.openWithSave(page, {
    settings: { mode: 'laer', matematik: true, dansk: true, speak: true, sound: false, music: false },
    skills: Game.focusSkill('mønstre'),
  });

  expect(
    await page.evaluate(() => typeof window.speechSynthesis),
    'the test must actually be running without the API'
  ).toBe('undefined');

  await game.start();
  await game.enter('garden');
  await game.tap(AT.garden.sandbox.x, AT.garden.sandbox.y);

  expect(await game.waitForTask(), 'a task should still be raised').toBe(true);
  await game.solveTask();
  await game.expectSave(s => s.stars, 'the task should still pay').toBeGreaterThan(0);
  game.expectNoErrors();
});

test('a wrong answer speaks its hint silently rather than throwing', async ({ page }) => {
  await hideSpeechSynthesis(page);

  const game = await Game.openWithSave(page, {
    settings: { mode: 'laer', matematik: true, dansk: true, speak: true, sound: false, music: false },
    skills: Game.focusSkill('mønstre'),
  });
  await game.start();
  await game.enter('garden');
  await game.tap(AT.garden.sandbox.x, AT.garden.sandbox.y);
  expect(await game.waitForTask()).toBe(true);

  // `miss()` calls speak() with the hint; that path must survive the API being absent.
  await game.answerTaskWrong();
  expect(await game.taskOpen(), 'the task stays open after a wrong answer').toBe(true);
  await game.solveTask();
  game.expectNoErrors();
});

test('the hardware back button goes where the on-screen arrow goes', async ({ page }) => {
  const game = await Game.openWithSave(page, {
    settings: { mode: 'leg', matematik: true, dansk: true, speak: false, sound: false, music: false },
  });

  const back = () =>
    page.evaluate(async (url) => {
      const nav: any = await import(/* @vite-ignore */ url);
      return nav.goBack(window.__game) as string;
    }, NAVIGATION);

  // On the title screen there is nowhere to go, which is the only case that closes the app.
  expect(await back(), 'the title screen is the way out').toBe('exit');

  await game.start();
  await game.enter('lobby');
  expect(await back(), 'the lobby has somewhere to go back to').toBe('moved');
  await game.waitForScene('HotelMapScene');

  expect(await back(), 'the map goes back to the menu').toBe('moved');
  await game.waitForScene('MainMenuScene');
  expect(await back(), 'and then out').toBe('exit');
});

test('back cannot skip a task that has already been earned', async ({ page }) => {
  // The chore is done by the time the task appears, so dismissing it would eat the stars
  // it owes. There is no cancel on screen either.
  const game = await Game.openWithSave(page, {
    settings: { mode: 'laer', matematik: true, dansk: true, speak: false, sound: false, music: false },
    skills: Game.focusSkill('mønstre'),
  });
  await game.start();
  await game.enter('garden');
  await game.tap(AT.garden.sandbox.x, AT.garden.sandbox.y);
  expect(await game.waitForTask()).toBe(true);

  const result = await page.evaluate(async (url) => {
    const nav: any = await import(/* @vite-ignore */ url);
    return nav.goBack(window.__game) as string;
  }, NAVIGATION);

  expect(result, 'a task in progress holds the back button').toBe('busy');
  expect(await game.taskOpen(), 'and the task is still there').toBe(true);
  game.expectNoErrors();
});

test('nothing is fetched from the network, so the app works offline', async ({ page }) => {
  // The APK ships without the INTERNET permission. Anything the game reaches for at run
  // time would simply fail there, so the web build must not reach for anything either — a
  // re-added font CDN link is exactly the kind of change that would pass every other test.
  const offsite: string[] = [];
  page.on('request', request => {
    const { hostname } = new URL(request.url());
    if (hostname !== 'localhost' && hostname !== '127.0.0.1' && hostname !== '::1') {
      offsite.push(request.url());
    }
  });

  const game = await Game.open(page);
  await game.start();
  await game.enter('lobby');
  await game.leave();
  await game.enter('kitchen');

  expect(offsite, 'the game must not talk to anything but its own origin').toEqual([]);

  // And the bundled font has to actually be in use — falling back to Trebuchet silently
  // would keep this test green while every label in the game changed width.
  const fontLoaded = await page.evaluate(() => document.fonts.check('700 16px Nunito'));
  expect(fontLoaded, 'Nunito should be loaded from the bundle').toBe(true);
  game.expectNoErrors();
});
