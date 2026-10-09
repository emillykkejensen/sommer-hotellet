import { test, expect } from '@playwright/test';
import { AT, Game } from './game';

/**
 * The guest's day.
 *
 * Each guest arrives with a plan — pool, restaurant, room, in a random order — and waits at
 * each stop for the player. What they want floats over their head as a picture; tapping
 * them opens a card with what they say and the buttons that help them. They never move by
 * themselves: when they are done somewhere, the player leads them to the next place.
 *
 * Stars come only from guests: a key, a dish served, a swim or a night's sleep they have
 * had, a bill paid. Laying the towel, cooking the soup and making the bed pay nothing until
 * somebody uses them.
 */

/** Long enough to have run out of patience. */
const IMPATIENT_MS = 70_000;
/** Past the grumpy window too, so the guest gives up on this stop. */
const GAVE_UP_MS = 200_000;

test('a guest arrives with a random plan, gets a key, and waits to be shown the way', async ({ page }) => {
  const game = await Game.open(page);
  await game.start();
  await game.enter('lobby');

  await game.tap(AT.lobby.bell.x, AT.lobby.bell.y);
  await game.expectSave(s => s.guests.length).toBe(1);

  const [arrival] = await game.guests();
  expect(arrival.plan.slice().sort(), 'the plan covers all three stops')
    .toEqual(['pool', 'restaurant', 'room']);

  // A picture first; the words only once the guest is tapped.
  await game.expectScreen('LobbyScene', 'nothing is said until the guest is tapped')
    .not.toContain('Hej! Har I et ledigt værelse til mig?');
  await game.tapGuest(arrival.id);
  await game.expectCard('the card says what they want')
    .toContain('Hej! Har I et ledigt værelse til mig?');

  await game.tapCardAction('Giv nøgle til værelse 1');
  const [checkedIn] = await game.guests();
  expect(checkedIn.checkedIn).toBe(true);
  expect(checkedIn.roomNumber, 'they are given a key').toBe(0);
  expect(checkedIn.at, 'and they stay at the desk until they are shown the way').toBe('lobby');
  expect(await game.stars(), 'a key handed over pays').toBeGreaterThan(0);

  await game.expectCard('the card now offers to lead them').toContain('Følg med mig');
  await game.tapCardAction('Følg med mig');
  const [following] = await game.guests();
  expect(following.at).toBe('following');
  expect(following.heading, 'heading for the first thing on their plan').toBe(following.plan[0]);
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

test('a guest led to the right place is handed over there', async ({ page }) => {
  const game = await Game.openWithSave(page, Game.guestWaitingAt('pool', {
    at: 'following', heading: 'pool',
  }));
  await game.start();

  await game.enter('pool');
  await game.expectSave(s => s.guests[0].at, 'walking into the pool drops them off').toBe('pool');
  expect((await game.guests())[0].heading).toBe(null);
  game.expectNoErrors();
});

test('a guest led to the wrong place says so, and keeps following', async ({ page }) => {
  const game = await Game.openWithSave(page, Game.guestWaitingAt('pool', {
    at: 'following', heading: 'restaurant',
  }));
  await game.start();

  // The complaint is a passing bubble, so read it before the scene settles.
  await game.tapWithoutSettling(AT.map.pool.x, AT.map.pool.y);
  await game.expectScreenText('PoolScene', 'they say where they actually wanted to go')
    .toContain('Nej, jeg skulle i restauranten!');
  await game.waitForScene('PoolScene');
  expect((await game.guests())[0].at, 'and they are still with the player').toBe('following');

  await game.leave();
  await game.enter('kitchen');
  await game.expectSave(s => s.guests[0].at).toBe('restaurant');
  await game.expectSave(s => s.kitchen.showingDining, 'the restaurant opens to seat them').toBe(true);
  game.expectNoErrors();
});

test('a guest never leaves on their own', async ({ page }) => {
  // The old guest walked off to the next stop by themselves, and a child who could not read
  // the bubble saying so just saw somebody vanish.
  const game = await Game.openWithSave(page, Game.guestDoneAt('pool'));
  await game.start();
  await game.enter('pool');

  await game.page.waitForTimeout(3_000);
  const [guest] = await game.guests();
  expect(guest.at, 'still at the pool').toBe('pool');
  expect(guest.done, 'and waiting to be led').toBe(true);
  game.expectNoErrors();
});

test('a towel makes a lounger ready, and the card shows the guest to it', async ({ page }) => {
  const game = await Game.openWithSave(page, Game.guestWaitingAt('pool'));
  await game.start();
  await game.enter('pool');

  await game.tapGuest(0);
  await game.expectCard('nothing to give them yet').toContain('Læg et håndklæde på en solstol.');
  await game.closeCard();

  await game.tap(AT.pool.lounger1.x, AT.pool.lounger1.y);
  await game.expectSave(s => s.pool.towels[0]).toBe(true);
  expect((await game.guests())[0].settledAt, 'a towel alone does not seat anybody').toBe(null);
  expect(await game.stars(), 'and laying it pays nothing').toBe(0);

  await game.helpGuest(0, 'Giv solstol');
  await game.expectSave(s => s.guests[0].lounger, 'they take the lounger').toBe(0);
  await game.expectSave(s => s.guests[0].settledAt, 'and go for a swim').not.toBe(null);
  expect(await game.stars(), 'the star comes when the swim is over').toBe(0);
  game.expectNoErrors();
});

test('a swim is paid for when the guest is led on, and the towel goes with them', async ({ page }) => {
  const game = await Game.openWithSave(page, {
    ...Game.guestWaitingAt('pool', { plan: ['pool', 'room'], settledAt: 1, lounger: 0 }),
    pool: { towels: [true, false, false, false] },
  });
  await game.start();
  await game.enter('pool');
  await game.finishEnjoying(0);

  await game.tapGuest(0);
  await game.expectCard('they say where they want to go next')
    .toContain('Det var dejligt at bade! Nu vil jeg gerne op på mit værelse.');
  await game.tapCardAction('Følg med mig');

  await game.expectSave(s => s.guests[0].at).toBe('following');
  const save = await game.save();
  expect(save.guests[0].heading).toBe('room');
  expect(save.pool.towels[0], 'the lounger needs a fresh towel').toBe(false);
  expect(save.stars, 'the swim pays').toBeGreaterThan(0);
  game.expectNoErrors();
});

test('a guest who waited too long still gets looked after, but pays no star', async ({ page }) => {
  const game = await Game.openWithSave(page, {
    ...Game.guestWaitingAt('pool', { plan: ['pool', 'room'] }),
    pool: { towels: [true, false, false, false] },
  });
  await game.start();
  await game.enter('pool');

  await game.ageGuest(0, IMPATIENT_MS);
  await game.expectSave(s => s.guests[0].gaveUp, 'their patience has run out').toBe(true);
  await game.tapGuest(0);
  await game.expectCard('and they say so').toContain('Jeg har ventet længe!');

  await game.tapCardAction('Giv solstol');
  await game.expectSave(s => s.guests[0].settledAt, 'the job still gets done').not.toBe(null);
  await game.finishEnjoying(0);

  await game.tapGuest(0);
  await game.tapCardAction('Følg med mig');
  await game.expectSave(s => s.guests[0].at).toBe('following');
  expect(await game.stars(), 'a star not earned').toBe(0);
  game.expectNoErrors();
});

test('a guest nobody helps gives up on the stop, but waits to be led on', async ({ page }) => {
  // The consequence must never be a deadlock — and never a disappearance either.
  const game = await Game.openWithSave(page, Game.guestWaitingAt('pool', { plan: ['pool', 'room'] }));
  await game.start();
  await game.enter('pool');

  await game.ageGuest(0, GAVE_UP_MS);
  const [guest] = await game.guests();
  expect(guest.done, 'they gave up on the pool').toBe(true);
  expect(guest.at, 'but they are still standing there').toBe('pool');

  await game.tapGuest(0);
  await game.expectCard().toContain('Jeg gider ikke vente mere.');
  await game.tapCardAction('Følg med mig');
  await game.expectSave(s => s.guests[0].heading).toBe('room');
  expect(await game.stars(), 'giving up costs the star').toBe(0);
  game.expectNoErrors();
});

test('cooking puts a dish ready for the tables, and pays nothing by itself', async ({ page }) => {
  const game = await Game.openWithSave(page, Game.guestWaitingAt('restaurant', { order: ['Suppe'] }));
  await game.start();
  await game.enter('kitchen');

  await game.expectScreen('KitchenScene', 'the order board lists the tables').toContain('Ordrer');
  await game.cookDish();
  await game.expectSave(s => s.kitchen.ready).toEqual(['Suppe']);
  expect((await game.guests())[0].served, 'cooking does not feed anybody').toEqual([]);
  expect(await game.stars(), 'the star is for the guest who gets fed').toBe(0);
  game.expectNoErrors();
});

test('the player serves from the guest\'s card, dish by dish', async ({ page }) => {
  const game = await Game.openWithSave(page, {
    ...Game.guestWaitingAt('restaurant', { order: ['Suppe', 'Is'] }),
    kitchen: { recipe: null, added: [], showingDining: true, ready: ['Suppe', 'Is'], dishesServed: 0 },
  });
  await game.start();
  await game.enter('kitchen');

  await game.tapGuest(0);
  await game.expectCard('the guest asks for both dishes').toContain('Suppe og is, tak!');

  await game.tapCardAction('Server suppe');
  await game.expectSave(s => s.guests[0].served, 'one dish carried out').toEqual(['Suppe']);
  await game.expectSave(s => s.guests[0].settledAt, 'the order is not finished').toBe(null);
  const afterOne = await game.stars();
  expect(afterOne, 'a dish served pays').toBeGreaterThan(0);

  await game.tapCardAction('Server is');
  await game.expectSave(s => s.guests[0].settledAt, 'and now they eat').not.toBe(null);
  await game.expectSave(s => s.kitchen.ready, 'nothing left waiting').toEqual([]);
  expect(await game.stars(), 'a whole order pays more').toBeGreaterThan(afterOne);
  game.expectNoErrors();
});

test('the card only offers what is ready, and says where the rest comes from', async ({ page }) => {
  const game = await Game.openWithSave(page, {
    ...Game.guestWaitingAt('restaurant', { order: ['Pandekager'] }),
    kitchen: { recipe: null, added: [], showingDining: true, ready: ['Suppe'], dishesServed: 0 },
  });
  await game.start();
  await game.enter('kitchen');

  await game.tapGuest(0);
  await game.expectCard().toContain('Pandekager skal laves i køkkenet.');
  expect(await game.cardText(), 'no button for a dish that is not there').not.toContain('Server');
  expect((await game.save()).kitchen.ready, 'the soup stays where it is').toEqual(['Suppe']);
  game.expectNoErrors();
});

test('a guest goes to bed once the room is made up, and the night pays', async ({ page }) => {
  const game = await Game.openWithSave(page, Game.guestWaitingAt('room', { plan: ['room', 'pool'] }));
  await game.start();
  await game.enter('rooms');

  await game.tapGuest(0);
  await game.expectCard().toContain('Jeg er træt. Er værelset gjort klar?');
  await game.expectCard().toContain('Gør værelset klar først.');
  await game.closeCard();

  for (const chore of [AT.room.bed, AT.room.window, AT.room.vase, AT.room.towels, AT.room.vacuum]) {
    await game.tap(chore.x, chore.y);
  }
  expect(await game.stars(), 'housework pays nothing by itself').toBe(0);

  await game.helpGuest(0, 'Put i seng');
  await game.expectSave(s => s.guests[0].settledAt, 'they are asleep').not.toBe(null);
  await game.expectScreen('RoomScene').toContain('Gæst 0 sover');

  await game.finishEnjoying(0);
  await game.tapGuest(0);
  await game.expectCard('awake, and they say where to next')
    .toContain('Godmorgen! Jeg har sovet godt. Nu vil jeg gerne i poolen.');
  await game.tapCardAction('Følg med mig');
  await game.expectSave(s => s.guests[0].at).toBe('following');
  expect(await game.stars(), 'a night slept pays').toBeGreaterThan(0);
  game.expectNoErrors();
});

test('checking out frees the room for the next guest', async ({ page }) => {
  const game = await Game.openWithSave(page, Game.guestWaitingAt('checkout'));
  await game.start();
  await game.enter('lobby');

  await game.tapGuest(0);
  await game.expectCard('they are at the desk to leave').toContain('Vi vil gerne tjekke ud.');
  await game.tapCardAction('Tjek ud');

  await game.expectSave(s => s.guests.length, 'the guest goes home').toBe(0);
  const save = await game.save();
  expect(save.rooms[0].guestId, 'the room is free again').toBe(null);
  expect(save.rooms[0].bedMade, 'and needs making up for the next guest').toBe(false);
  expect(save.stars, 'checking out pays').toBeGreaterThan(0);
  game.expectNoErrors();
});

test('the map points at whoever is waiting, and at which area', async ({ page }) => {
  const game = await Game.openWithSave(page, { ...Game.guestWaitingAt('pool'), stars: 20 });
  await game.start();

  const badges = await game.mapBadges();
  expect(badges, 'exactly one area is flagged').toHaveLength(1);
  expect(badges[0].label, 'one guest waiting there').toBe('1');
  expect(Math.abs(badges[0].x - AT.map.pool.x)).toBeLessThan(100);
  expect(Math.abs(badges[0].y - AT.map.pool.y)).toBeLessThan(50);
  game.expectNoErrors();
});

test('the map is clear when nobody needs anything', async ({ page }) => {
  // The same guest, swimming. A badge that stayed up while everyone was happy would train
  // the player to ignore it.
  const game = await Game.openWithSave(page, {
    ...Game.guestWaitingAt('pool', { settledAt: 1, lounger: 0 }),
    stars: 20,
    pool: { towels: [true, false, false, false] },
  });
  await game.start();

  expect(await game.mapBadges(), 'nothing to flag').toEqual([]);
  game.expectNoErrors();
});

test('a guest following the player is shown on the map, by the place they want', async ({ page }) => {
  const game = await Game.openWithSave(page, Game.guestWaitingAt('pool', {
    at: 'following', heading: 'pool',
  }));
  await game.start();

  await game.expectScreenText('HotelMapScene').toContain('1 følger dig');
  const besidePool = await page.evaluate(([px, py]) => {
    const scene = window.__game.scene.getScene('HotelMapScene') as any;
    return scene.hud.list.some((o: any) =>
      o.type === 'Container' && Math.abs(o.y - py) < 30 && o.x < px && px - o.x < 160);
  }, [AT.map.pool.x, AT.map.pool.y] as const);
  expect(besidePool, 'their face waits beside the pool sign').toBe(true);
  game.expectNoErrors();
});

test('an ice cream is made at the stand and handed over from the card', async ({ page }) => {
  const ice = 'is:vaffel:jordbaer:drys';
  const game = await Game.openWithSave(page, {
    ...Game.guestWaitingAt('pool', { lounger: 0, extras: [ice] }),
    pool: { towels: [true, false, false, false] },
  });
  await game.start();
  await game.enter('pool');

  await game.tapGuest(0);
  await game.expectCard('they ask for exactly this ice').toContain('en jordbæris i vaffel med drys');
  await game.expectCard().toContain('Lav isen i isboden.');
  await game.closeCard();

  await game.tap(AT.pool.iceStand.x, AT.pool.iceStand.y);
  await game.waitForScene('IceCreamScene');
  for (const choice of ['Vaffel', 'Jordbær', 'Drys']) await game.tapLabelled('IceCreamScene', choice);
  await game.tapLabelled('IceCreamScene', 'Læg på disken');
  await game.expectSave(s => s.pool.ices, 'the ice waits on the counter').toEqual([ice]);
  expect(await game.stars(), 'making it pays nothing').toBe(0);

  await game.tap(AT.back.x, AT.back.y);
  await game.waitForScene('PoolScene');
  await game.helpGuest(0, 'Giv isen');
  await game.expectSave(s => s.guests[0].extrasGot).toEqual([ice]);
  await game.expectSave(s => s.guests[0].settledAt, 'that was all they wanted').not.toBe(null);
  expect((await game.save()).pool.ices).toEqual([]);
  expect(await game.stars(), 'handing it over pays').toBeGreaterThan(0);
  game.expectNoErrors();
});

test('the boutique makes clothes, and a guest keeps wearing what they are given', async ({ page }) => {
  const hat = 'toej:solhat:blaa';
  const game = await Game.openWithSave(page, {
    ...Game.guestWaitingAt('pool', { lounger: 0, extras: [hat] }),
    pool: { towels: [true, false, false, false] },
    owned: ['boutique'],
  });
  await game.start();

  await game.enter('boutique');
  for (const choice of ['Solhat', 'Blå']) await game.tapLabelled('BoutiqueScene', choice);
  await game.tapLabelled('BoutiqueScene', 'Læg på hylden');
  await game.expectSave(s => s.boutique.ready).toEqual([hat]);
  await game.leave();

  await game.enter('pool');
  await game.tapGuest(0);
  await game.expectCard().toContain('en blå solhat');
  await game.tapCardAction('Giv solhatten');
  await game.expectSave(s => s.guests[0].wearing, 'they put it on').toBe(hat);
  expect(await game.stars()).toBeGreaterThan(0);
  game.expectNoErrors();
});

test('the boutique is not on the map until it has been bought', async ({ page }) => {
  const game = await Game.openWithSave(page, { stars: 30 });
  await game.start();
  await game.expectScreen('HotelMapScene').not.toContain('Tøjbutik');

  await game.tap(AT.shop.x, AT.shop.y);
  await game.waitForScene('ShopScene');
  await game.tap(AT.shopTabHotel.x, AT.shopTabHotel.y);
  const card = await game.shopCard('Tøjbutik');
  await game.tap(card.x, card.y);
  await game.expectSave(s => s.owned).toContain('boutique');

  await game.tap(AT.back.x, AT.back.y);
  await game.waitForScene('HotelMapScene');
  await game.expectScreen('HotelMapScene').toContain('Tøjbutik');
  game.expectNoErrors();
});
