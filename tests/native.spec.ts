import { test, expect } from '@playwright/test';
import { AT, Game } from './game';

/**
 * The conditions the Android build runs under, tested in a browser.
 *
 * A WebView is not Chrome: it has a hardware back button, no address bar to leave by, and
 * no network. Each of those is reproducible here — call the back handler directly, press the
 * exit button, watch for outbound requests — so the app-only behaviour is covered by the
 * same suite as everything else rather than only by installing it on a phone.
 */

const NAVIGATION = '/src/helpers/Navigation.ts';

test('the hardware back button goes where the on-screen arrow goes', async ({ page }) => {
  const game = await Game.openWithSave(page, {
    settings: { mode: 'leg', matematik: true, dansk: true, voices: false, sound: false, music: false },
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

test('the map has an on-screen way back, not only the hardware button', async ({ page }) => {
  // The map used to be reachable only forwards: a browser tab has no back button and the
  // Android build hides the system bars, so a child who opened the game was stuck in it.
  const game = await Game.openWithSave(page, {});
  await game.start();

  await game.expectScreen('HotelMapScene', 'a way back to the title screen').toContain('Forside');
  await game.tap(AT.back.x, AT.back.y);
  await game.waitForScene('MainMenuScene');
  game.expectNoErrors();
});

test('back cannot skip a task that has already been earned', async ({ page }) => {
  // The chore is done by the time the task appears, so dismissing it would eat the stars
  // it owes. There is no cancel on screen either.
  const game = await Game.openWithSave(page, {
    ...Game.guestDoneAt('room'),
    settings: { mode: 'laer', matematik: true, dansk: true, voices: false, sound: false, music: false },
    skills: Game.focusSkill('mønstre'),
  });
  await game.start();
  await game.enter('rooms');
  await game.helpGuest(0, 'Følg med mig');
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
