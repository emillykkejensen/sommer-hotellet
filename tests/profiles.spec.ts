import { test, expect } from '@playwright/test';
import { GAME_WIDTH } from '../src/config';
import { AT, Game, LEGACY_SAVE_KEY, PROFILES_KEY, TestProfile, saveKeyFor } from './game';

/**
 * Player profiles: several children on one tablet, each with a hotel of their own.
 *
 * What matters is what a child would notice — that their name and animal stick, that their
 * stars are theirs and nobody else's, that picking their card puts them back exactly where
 * they stopped, and that a save from before profiles existed is not lost.
 */

const ALMA: TestProfile = { id: 'a', name: 'Alma', avatar: 'kat' };
const BO: TestProfile = { id: 'b', name: 'Bo', avatar: 'frø' };

const PROFILES_URL = '/src/state/Profiles.ts';

/** Types a word on the new-player keyboard, one key at a time. */
async function typeName(game: Game, word: string): Promise<void> {
  for (const letter of word) {
    await game.tapTarget('ProfileScene', { label: letter });
  }
}

/** The labels on one player's title-screen card. */
async function cardLabels(game: Game, id: string): Promise<string[]> {
  const card = (await game.targets('MainMenuScene')).find(t => t.data.profile === id);
  return card?.labels ?? [];
}

/** Both taps of a two-tap button on the grown-up screen: arm it, see it armed, confirm. */
async function confirmTwice(game: Game, action: 'reset' | 'delete', armedText: string): Promise<void> {
  const target = (await game.targets('SettingsScene')).find(t => t.data.action === action);
  if (!target) throw new Error(`no ${action} button`);
  // Not settled in between: settling waits out the four seconds the button stays armed.
  await game.tapWithoutSettling(target.x, target.y);
  await game.expectScreenText('SettingsScene', 'the button asks to be tapped again')
    .toContain(armedText);
  await game.tap(target.x, target.y);
}

test('a new player is made on the on-screen keyboard, and their name and animal stick', async ({ page }) => {
  const game = await Game.openWithStorage(page, {});

  await game.expectScreen('MainMenuScene').toContain('Hvem spiller?');
  await game.expectScreen('MainMenuScene', 'with nobody yet, there is a card to add somebody')
    .toContain('Ny spiller');
  expect(await page.evaluate(() => Object.keys(window.localStorage)),
    'the title screen must not invent a save before anybody exists').toEqual([]);

  await game.tapTarget('MainMenuScene', { data: { profile: 'new' } });
  await game.waitForScene('ProfileScene');

  await game.tapTarget('ProfileScene', { data: { avatar: 'ræv' } });
  // a slip, and the delete key to take it back
  await typeName(game, 'EMIX');
  await game.tapTarget('ProfileScene', { data: { key: 'delete' } });
  await typeName(game, 'L');
  await game.expectScreen('ProfileScene', 'typed in capitals, written like a name')
    .toContain('Emil');

  await game.tapTarget('ProfileScene', { label: 'Færdig' });
  await game.waitForScene('HotelMapScene');

  const index = await game.profiles();
  expect(index?.profiles).toEqual([{ id: expect.any(String), name: 'Emil', avatar: 'ræv' }]);
  const id = index!.profiles[0].id;
  expect(index?.last, 'the new player is the one playing').toBe(id);
  await game.expectScreen('HotelMapScene', 'the map says whose hotel it is').toContain('Emil');

  // Their hotel is their own save, under their own key.
  await game.enter('pool');
  await game.tap(AT.pool.lounger1.x, AT.pool.lounger1.y);
  await game.expectSave(s => s.pool.towels[0]).toBe(true);
  expect((await game.stored(saveKeyFor(id)))?.pool.towels[0]).toBe(true);

  // Close the game and open it again.
  await page.reload();
  await game.waitForScene('MainMenuScene');
  expect(await cardLabels(game, id), 'the card is still there, with the star on it')
    .toEqual(expect.arrayContaining(['Emil', '1']));
  await game.pickPlayer('Emil');
  await game.expectSave(s => s.pool.towels).toEqual([true, false, false, false]);
  game.expectNoErrors();
});

test('an empty name becomes the next free "Spiller N", on an animal nobody has', async ({ page }) => {
  const game = await Game.openWithStorage(page, Game.players([
    ALMA,
    { id: 's1', name: 'Spiller 1', avatar: 'hund' },
  ]));

  await game.tapTarget('MainMenuScene', { data: { profile: 'new' } });
  await game.waitForScene('ProfileScene');
  await game.tapTarget('ProfileScene', { label: 'Færdig' });
  await game.waitForScene('HotelMapScene');

  const index = await game.profiles();
  expect(index?.profiles).toHaveLength(3);
  expect(index?.profiles[2]).toMatchObject({ name: 'Spiller 2', avatar: 'kanin' });
  game.expectNoErrors();
});

test('the new-player screen has a way back, and leaving it creates nobody', async ({ page }) => {
  const game = await Game.open(page);
  await game.tapTarget('MainMenuScene', { data: { profile: 'new' } });
  await game.waitForScene('ProfileScene');
  await typeName(game, 'OLE');

  await game.tap(AT.back.x, AT.back.y);
  await game.waitForScene('MainMenuScene');
  expect((await game.profiles())?.profiles).toEqual([Game.PLAYER]);
  game.expectNoErrors();
});

test('two players keep their own stars, settings and hotel, and each picks up where they left off', async ({ page }) => {
  const game = await Game.openWithStorage(page, Game.players([ALMA, BO]));

  // Alma lays one towel.
  await game.pickPlayer('Alma');
  await game.enter('pool');
  await game.tap(AT.pool.lounger1.x, AT.pool.lounger1.y);
  await game.expectSave(s => s.pool.towels).toEqual([true, false, false, false]);
  const almaStars = await game.stars();
  expect(almaStars).toBeGreaterThan(0);
  await game.leave();
  await game.tap(AT.back.x, AT.back.y);
  await game.waitForScene('MainMenuScene');
  expect(await cardLabels(game, ALMA.id)).toContain(`${almaStars}`);

  // Bo starts from nothing — none of Alma's stars, none of her towels — lays two of his
  // own, and switches his hotel to Lær.
  await game.pickPlayer('Bo');
  expect(await game.stars(), 'Bo has not earned anything yet').toBe(0);
  await game.enter('pool');
  await game.tap(AT.pool.lounger3.x, AT.pool.lounger3.y);
  await game.tap(AT.pool.lounger4.x, AT.pool.lounger4.y);
  await game.expectSave(s => s.pool.towels).toEqual([false, false, true, true]);
  const boStars = await game.stars();
  await game.leave();
  await game.tap(AT.settings.x, AT.settings.y);
  await game.waitForScene('SettingsScene');
  await game.expectScreen('SettingsScene', 'the grown-up screen says whose it is').toContain('Bo');
  await game.tap(AT.settingsModeLaer.x, AT.settingsModeLaer.y);
  await game.expectSave(s => s.settings.mode).toBe('laer');

  expect((await game.stored(saveKeyFor(ALMA.id))).settings.mode, 'Alma is still in Leg')
    .toBe('leg');
  expect((await game.stored(saveKeyFor(ALMA.id))).stars).toBe(almaStars);

  // Close the game and open it again; each child finds their own hotel.
  await page.reload();
  await game.waitForScene('MainMenuScene');
  expect(await cardLabels(game, ALMA.id)).toContain(`${almaStars}`);
  expect(await cardLabels(game, BO.id)).toContain(`${boStars}`);

  await game.pickPlayer('Alma');
  await game.expectSave(s => s.pool.towels).toEqual([true, false, false, false]);
  await game.expectScreen('HotelMapScene', 'Alma plays without tasks').toContain('Voksne');
  await game.expectScreen('HotelMapScene').toContain('Alma');
  await game.tap(AT.back.x, AT.back.y);
  await game.waitForScene('MainMenuScene');

  await game.pickPlayer('Bo');
  await game.expectSave(s => s.pool.towels).toEqual([false, false, true, true]);
  await game.expectSave(s => s.stars).toBe(boStars);
  await game.expectScreen('HotelMapScene', 'Bo is learning').toContain('Lær');
  expect((await game.profiles())?.last).toBe(BO.id);
  game.expectNoErrors();
});

test('a save from before profiles becomes "Spiller 1", stars and all', async ({ page }) => {
  const game = await Game.openWithStorage(page, {
    [LEGACY_SAVE_KEY]: Game.saveWith({ stars: 17, owned: ['birdbath'] }),
  });

  const index = await game.profiles();
  expect(index?.profiles).toEqual([{ id: expect.any(String), name: 'Spiller 1', avatar: 'kat' }]);
  const id = index!.profiles[0].id;
  expect(index?.last).toBe(id);
  expect(await game.stored(LEGACY_SAVE_KEY), 'moved, not copied').toBeNull();
  expect((await game.stored(saveKeyFor(id))).stars).toBe(17);
  expect(await cardLabels(game, id)).toEqual(expect.arrayContaining(['Spiller 1', '17']));

  await game.pickPlayer('Spiller 1');
  await game.expectSave(s => s.stars).toBe(17);
  await game.expectSave(s => s.owned).toEqual(['birdbath']);
  await game.expectScreen('HotelMapScene', 'the counter shows the stars carried over').toContain('17');
  game.expectNoErrors();
});

test('even a save from an older version keeps its stars through the move', async ({ page }) => {
  // load() keeps only the stars of a save it cannot read, so the move must not lose them
  // either — it hands the bytes over untouched.
  const game = await Game.openWithStorage(page, {
    [LEGACY_SAVE_KEY]: { version: 2, stars: 9, rooms: 'whatever the old shape was' },
  });
  await game.pickPlayer('Spiller 1');
  await game.expectSave(s => s.stars).toBe(9);
  await game.expectSave(s => s.version).toBe(4);
  game.expectNoErrors();
});

test('Start forfra starts this player over, and nobody else', async ({ page }) => {
  const game = await Game.openWithStorage(page, {
    ...Game.players([ALMA, BO]),
    [saveKeyFor(ALMA.id)]: Game.saveWith({ stars: 5 }),
    [saveKeyFor(BO.id)]: Game.saveWith({ stars: 8 }),
  });

  await game.pickPlayer('Bo');
  await game.tap(AT.settings.x, AT.settings.y);
  await game.waitForScene('SettingsScene');
  await confirmTwice(game, 'reset', 'Tryk igen — Bo starter forfra');

  await expect.poll(() => game.stars(), { message: "Bo's stars are gone" }).toBe(0);
  expect((await game.stored(saveKeyFor(ALMA.id))).stars, "Alma's are not").toBe(5);
  expect((await game.profiles())?.profiles, 'Bo is still a player').toEqual([ALMA, BO]);
  game.expectNoErrors();
});

test('Slet spiller removes that player and their hotel, and goes back to the cards', async ({ page }) => {
  const game = await Game.openWithStorage(page, {
    ...Game.players([ALMA, BO]),
    [saveKeyFor(ALMA.id)]: Game.saveWith({ stars: 5 }),
    [saveKeyFor(BO.id)]: Game.saveWith({ stars: 8 }),
  });

  await game.pickPlayer('Bo');
  await game.tap(AT.settings.x, AT.settings.y);
  await game.waitForScene('SettingsScene');
  await confirmTwice(game, 'delete', 'Tryk igen for at slette Bo');
  await game.waitForScene('MainMenuScene');

  const index = await game.profiles();
  expect(index?.profiles).toEqual([ALMA]);
  expect(index?.last, 'nobody is the last player any more').toBeNull();
  expect(await game.stored(saveKeyFor(BO.id)), "Bo's hotel is gone").toBeNull();
  expect((await game.stored(saveKeyFor(ALMA.id))).stars, "Alma's is not").toBe(5);
  expect(await page.evaluate(() => window.__state.profileId)).toBeNull();

  const labels = await game.visibleText('MainMenuScene');
  expect(labels).toContain('Alma');
  expect(labels).not.toContain('Bo');
  game.expectNoErrors();
});

test('six players fill the row, all on the stage, and there is no room for a seventh', async ({ page }) => {
  const six: TestProfile[] = ['kat', 'hund', 'kanin', 'bjørn', 'ræv', 'løve']
    .map((avatar, i) => ({ id: `p${i}`, name: `Wilhelmine${i}`.slice(0, 10), avatar }));
  const game = await Game.openWithStorage(page, Game.players(six));

  const cards = (await game.targets('MainMenuScene')).filter(t => t.data.profile);
  expect(cards.map(c => c.data.profile)).toEqual(six.map(p => p.id));
  expect(await game.visibleText('MainMenuScene')).not.toContain('Ny spiller');
  for (const card of cards) {
    expect(card.x - card.w / 2, 'inside the left edge').toBeGreaterThanOrEqual(0);
    expect(card.x + card.w / 2, 'inside the right edge').toBeLessThanOrEqual(GAME_WIDTH);
  }
  game.expectNoErrors();
});

test('players come back from the native copy when web storage has been lost', async ({ page }) => {
  // The browser has no native store, so the restore is handed a pretend one — the same
  // function the Android build runs at boot, with Preferences swapped for a dictionary.
  const game = await Game.openWithStorage(page, {});

  const mirrored = {
    [PROFILES_KEY]: JSON.stringify({ version: 1, profiles: [ALMA, BO], last: BO.id }),
    [saveKeyFor(ALMA.id)]: JSON.stringify(Game.saveWith({ stars: 4 })),
    [saveKeyFor(BO.id)]: JSON.stringify(Game.saveWith({ stars: 6 })),
  };
  const restored = await page.evaluate(async ([url, store]) => {
    const profiles: any = await import(/* @vite-ignore */ url);
    // and in a real browser, with nothing native to read, it does nothing at all
    const untouched = await profiles.restoreFromMirror();
    const did = await profiles.restoreFromMirror(async (key: string) => store[key] ?? null);
    // once there is an index it never runs again, so it cannot overwrite anything newer
    const again = await profiles.restoreFromMirror(async () => { throw new Error('read'); });
    return { untouched, did, again };
  }, [PROFILES_URL, mirrored] as const);
  expect(restored).toEqual({ untouched: false, did: true, again: false });

  await page.reload();
  await game.waitForScene('MainMenuScene');
  expect(await cardLabels(game, ALMA.id)).toEqual(expect.arrayContaining(['Alma', '4']));
  expect(await cardLabels(game, BO.id)).toEqual(expect.arrayContaining(['Bo', '6']));
  await game.pickPlayer('Bo');
  await game.expectSave(s => s.stars).toBe(6);
  game.expectNoErrors();
});

test('a native copy from before profiles is put back as "Spiller 1"', async ({ page }) => {
  const game = await Game.openWithStorage(page, {});

  const restored = await page.evaluate(async ([url, legacy]) => {
    const profiles: any = await import(/* @vite-ignore */ url);
    return profiles.restoreFromMirror(async (key: string) => (key === 'save' ? legacy : null));
  }, [PROFILES_URL, JSON.stringify(Game.saveWith({ stars: 23 }))] as const);
  expect(restored).toBe(true);

  const index = await game.profiles();
  expect(index?.profiles.map(p => p.name)).toEqual(['Spiller 1']);
  expect((await game.stored(saveKeyFor(index!.profiles[0].id))).stars).toBe(23);
  expect(await game.stored(LEGACY_SAVE_KEY)).toBeNull();
  game.expectNoErrors();
});
