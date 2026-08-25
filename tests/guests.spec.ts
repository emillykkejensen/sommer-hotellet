import { test, expect } from '@playwright/test';
import { AT, Game } from './game';

/**
 * The guest's day.
 *
 * Guests used to be scenery: they were checked in, and then they stood in the lobby, or
 * floated in the pool, or sat at a table, forever, wanting nothing. Now each one arrives
 * with a plan — pool, restaurant, room, in a random order — walks it a step at a time, and
 * waits at each stop for the player to do the job that lets them get on with it.
 *
 * These tests are about that loop: the plan, the ordering, the serving, and the fact that
 * making somebody wait costs the star rather than costing nothing.
 */

/** Long enough to have run out of patience, short of walking away. */
const IMPATIENT_MS = 70_000;
/** Past the grumpy window too, so the guest gives up on this stop entirely. */
const WALKED_OFF_MS = 200_000;

test('a guest arrives with a random plan and works through it', async ({ page }) => {
  const game = await Game.open(page);
  await game.start();
  await game.enter('lobby');

  await game.tap(AT.lobby.bell.x, AT.lobby.bell.y);
  await game.expectSave(s => s.guests.length).toBe(1);

  const [arrival] = await game.guests();
  expect(arrival.plan.slice().sort(), 'the plan covers all three stops')
    .toEqual(['pool', 'restaurant', 'room']);
  expect(arrival.step).toBe(0);

  await game.tap(AT.lobby.guest1.x, AT.lobby.guest1.y);
  const [checkedIn] = await game.guests();
  expect(checkedIn.checkedIn).toBe(true);
  expect(checkedIn.at, 'they go straight to the first thing on the list')
    .toBe(checkedIn.plan[0]);
  expect(checkedIn.roomNumber, 'and they are given a key').toBe(0);
  game.expectNoErrors();
});

test('plans are not all the same', async ({ page }) => {
  // Three guests all doing pool-restaurant-room in that order would make the hotel a
  // conveyor belt. Generated at the state level, so this checks the generator rather than
  // one unlucky run of the UI.
  const game = await Game.open(page);
  await game.start();

  const plans = await page.evaluate(() => {
    const state = window.__state;
    const seen = new Set<string>();
    for (let i = 0; i < 60; i++) {
      state.guests = [];
      const guest = state.createGuest();
      seen.add(guest!.plan.join('>'));
    }
    state.guests = [];
    return [...seen];
  });

  expect(plans.length, 'guests should not all want the same day').toBeGreaterThan(2);
  for (const plan of plans) {
    expect(plan.split('>').sort()).toEqual(['pool', 'restaurant', 'room']);
  }
  game.expectNoErrors();
});

test('a guest waiting at the pool is settled by the towel that makes a lounger ready', async ({ page }) => {
  const game = await Game.openWithSave(page, Game.guestWaitingAt('pool'));
  await game.start();
  await game.enter('pool');

  await game.expectScreen('PoolScene', 'the guest says what they are waiting for')
    .toContain('Jeg vil bade! Er der en solstol klar?');
  expect((await game.guests())[0].settledAt, 'nothing to lie on yet').toBe(null);

  const before = await game.stars();
  await game.tap(AT.pool.lounger1.x, AT.pool.lounger1.y);

  await game.expectSave(s => s.guests[0].lounger, 'they take the lounger').toBe(0);
  await game.expectSave(s => s.guests[0].settledAt, 'and stop waiting').not.toBe(null);
  expect(await game.stars(), 'looking after a guest pays').toBeGreaterThan(before);
  game.expectNoErrors();
});

test('a guest who has waited too long still gets served, but pays no star', async ({ page }) => {
  const game = await Game.openWithSave(page, Game.guestWaitingAt('pool'));
  await game.start();
  await game.enter('pool');

  await game.ageGuest(0, IMPATIENT_MS);
  await game.expectSave(s => s.guests[0].gaveUp, 'their patience has run out').toBe(true);
  await game.expectScreen('PoolScene', 'and they say so')
    .toContain('Er der slet ingen solstole med håndklæde?');

  const before = await game.stars();
  await game.tapWithoutSettling(AT.pool.lounger1.x, AT.pool.lounger1.y);

  // The toast destroys itself after a couple of seconds, so read it before settling.
  await game.expectScreenText('PoolScene', 'the game says why there was no star')
    .toContain('ventede for længe — ingen stjerne');
  await game.settle();

  // the job still gets done — the hotel is never left broken
  await game.expectSave(s => s.guests[0].settledAt).not.toBe(null);
  expect(await game.stars(), 'a star not earned').toBe(before);
  game.expectNoErrors();
});

test('a guest nobody helps moves on rather than blocking the hotel', async ({ page }) => {
  // The consequence must never be a deadlock: a guest who is ignored gives up on that stop
  // and goes to the next thing, so the hotel keeps running and the player has simply lost
  // the star.
  const game = await Game.openWithSave(page, Game.guestWaitingAt('pool', {
    plan: ['pool', 'room'],
  }));
  await game.start();
  await game.enter('pool');

  await game.ageGuest(0, WALKED_OFF_MS);

  const [guest] = await game.guests();
  expect(guest.step, 'they gave up on the pool').toBe(1);
  expect(guest.at, 'and went to the next thing on the list').toBe('room');
  expect(guest.gaveUp, 'with a fresh temper at the new stop').toBe(false);
  game.expectNoErrors();
});

test('a guest in the restaurant orders, and the order has to be cooked', async ({ page }) => {
  const game = await Game.openWithSave(page, {
    ...Game.guestWaitingAt('restaurant', { order: ['Suppe'] }),
    kitchen: { recipe: null, added: [], showingDining: false, ready: [], dishesServed: 0 },
  });
  await game.start();
  await game.enter('kitchen');

  // the kitchen shows what the restaurant is waiting for
  await game.expectScreen('KitchenScene', 'the order board lists the tables').toContain('Ordrer');

  await game.cookDish();
  await game.expectSave(s => s.kitchen.ready, 'the soup is cooked, not served').toEqual(['Suppe']);
  expect((await game.guests())[0].served, 'cooking does not feed anybody by itself').toEqual([]);
  game.expectNoErrors();
});

test('the player carries the food out, and finishing the order feeds the guest', async ({ page }) => {
  const game = await Game.openWithSave(page, {
    ...Game.guestWaitingAt('restaurant', { order: ['Suppe', 'Is'] }),
    kitchen: { recipe: null, added: [], showingDining: true, ready: ['Suppe', 'Is'], dishesServed: 0 },
  });
  await game.start();
  await game.enter('kitchen');

  await game.expectScreen('KitchenScene', 'the guest asks for both dishes')
    .toContain('Suppe og is, tak!');

  const before = await game.stars();
  await game.tap(AT.kitchen.table1.x, AT.kitchen.table1.y);
  await game.expectSave(s => s.guests[0].served, 'one dish carried out').toEqual(['Suppe']);
  await game.expectSave(s => s.guests[0].settledAt, 'but the order is not finished').toBe(null);

  await game.tap(AT.kitchen.table1.x, AT.kitchen.table1.y);
  await game.expectSave(s => s.guests[0].served.length, 'both dishes carried out').toBe(2);
  await game.expectSave(s => s.guests[0].settledAt, 'and now they eat').not.toBe(null);
  await game.expectSave(s => s.kitchen.ready, 'the pass is empty again').toEqual([]);
  expect(await game.stars(), 'serving pays').toBeGreaterThan(before);
  game.expectNoErrors();
});

test('a guest cannot be served a dish that is not ready', async ({ page }) => {
  const game = await Game.openWithSave(page, {
    ...Game.guestWaitingAt('restaurant', { order: ['Pandekager'] }),
    kitchen: { recipe: null, added: [], showingDining: true, ready: ['Suppe'], dishesServed: 0 },
  });
  await game.start();
  await game.enter('kitchen');

  await game.tapWithoutSettling(AT.kitchen.table1.x, AT.kitchen.table1.y);
  await game.expectScreenText('KitchenScene', 'the game says what is missing')
    .toContain('Pandekager er ikke klar endnu');
  await game.settle();
  expect((await game.save()).kitchen.ready, 'and the soup stays on the pass').toEqual(['Suppe']);
  expect((await game.guests())[0].served).toEqual([]);
  game.expectNoErrors();
});

test('a guest waiting to sleep is settled by the room being finished', async ({ page }) => {
  const game = await Game.openWithSave(page, {
    ...Game.guestWaitingAt('room'),
    settings: { mode: 'leg', matematik: true, dansk: true, voices: false, sound: true, music: false },
  });
  await game.start();
  await game.enter('rooms');

  await game.expectScreen('RoomScene', 'the guest is standing there waiting')
    .toContain('Jeg er træt. Er værelset gjort klar?');

  await game.tap(AT.room.bed.x, AT.room.bed.y);
  expect((await game.guests())[0].settledAt, 'one chore is not a finished room').toBe(null);

  await game.tap(AT.room.window.x, AT.room.window.y);
  await game.tap(AT.room.vase.x, AT.room.vase.y);
  await game.tap(AT.room.towels.x, AT.room.towels.y);

  // A guest only sleeps for ENJOY_MS before moving on, and settling the scene after the
  // last chore can eat most of that under software rendering — so read the screen first.
  await game.tapWithoutSettling(AT.room.vacuum.x, AT.room.vacuum.y);
  await game.expectScreenText('RoomScene', 'and they say goodnight').toContain('Zzz... godnat.');
  await game.expectSave(s => s.guests[0].settledAt, 'a finished room puts them to bed')
    .not.toBe(null);
  await game.settle();
  game.expectNoErrors();
});

test('checking out frees the room for the next guest', async ({ page }) => {
  const game = await Game.openWithSave(page, Game.guestWaitingAt('checkout'));
  await game.start();
  await game.enter('lobby');

  await game.expectScreen('LobbyScene', 'they are at the desk to leave')
    .toContain('Vi skal hjem nu — tak for besøget!');

  const before = await game.stars();
  await game.tap(AT.lobby.leaving1.x, AT.lobby.leaving1.y);

  await game.expectSave(s => s.guests.length, 'the guest goes home').toBe(0);
  const save = await game.save();
  expect(save.rooms[0].guestId, 'the room is free again').toBe(null);
  expect(save.rooms[0].bedMade, 'and needs making up for the next guest').toBe(false);
  expect(save.stars, 'checking out pays').toBeGreaterThan(before);
  game.expectNoErrors();
});

test('a happy guest says where they are going next', async ({ page }) => {
  // Without this the player has to walk all five rooms to find out who needs something.
  const game = await Game.openWithSave(page, Game.guestWaitingAt('room', {
    plan: ['room', 'pool'],
  }));
  await game.start();
  await game.enter('rooms');

  for (const chore of [AT.room.bed, AT.room.window, AT.room.vase, AT.room.towels]) {
    await game.tap(chore.x, chore.y);
  }
  await game.tapWithoutSettling(AT.room.vacuum.x, AT.room.vacuum.y);

  await game.expectScreenText('RoomScene', 'the sleeping guest names the next stop')
    .toContain('Zzz... godnat. Så skal jeg i poolen.');
  await game.settle();
  game.expectNoErrors();
});

test('the map points at whoever is waiting, and at which area', async ({ page }) => {
  const game = await Game.openWithSave(page, { ...Game.guestWaitingAt('pool'), stars: 20 });
  await game.start();

  const badges = await game.mapBadges();
  expect(badges, 'exactly one area is flagged').toHaveLength(1);
  expect(badges[0].label, 'one guest waiting there').toBe('1');
  // and it is over the pool, not over some other area
  expect(Math.abs(badges[0].x - AT.map.pool.x)).toBeLessThan(90);
  expect(Math.abs(badges[0].y - AT.map.pool.y)).toBeLessThan(50);
  game.expectNoErrors();
});

test('the map is clear when nobody needs anything', async ({ page }) => {
  // The same guest, already on a lounger. A badge that stayed up while everyone was happy
  // would train the player to ignore it.
  const game = await Game.openWithSave(page, {
    ...Game.guestWaitingAt('pool', { settledAt: 1, lounger: 0 }),
    stars: 20,
    pool: { towels: [true, false, false, false] },
  });
  await game.start();

  expect(await game.mapBadges(), 'nothing to flag').toEqual([]);
  game.expectNoErrors();
});
