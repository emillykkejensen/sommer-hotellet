import { Level } from '../tasks/types';
import { mirror, unmirror } from '../helpers/Native';
import { Profile, findProfile, lastProfileId, migrateLegacySave, saveKeyFor, setLastProfile } from './Profiles';
import { randomOrder } from './Menu';
import type { Area } from './Shop';

export type Chore = 'bedMade' | 'curtainsOpen' | 'flowersPlaced' | 'vacuumed' | 'towelsFolded';

export const CHORES: Chore[] = ['bedMade', 'curtainsOpen', 'flowersPlaced', 'vacuumed', 'towelsFolded'];

/** The three things a guest comes to the hotel to do, in whatever order they fancy. */
export type Place = 'pool' | 'restaurant' | 'room';

/** Where a guest is standing right now. */
export type GuestAt = 'lobby' | Place | 'checkout';

/**
 * How long a guest waits.
 *
 * Three phases, and the numbers are the whole difficulty curve of the game:
 *
 *  - `waiting`   — up to their patience. Do the job inside this and it pays a star.
 *  - `impatient` — a further GRUMPY_MS. The job can still be done, and still has to be, but
 *                  it no longer pays. This is the consequence, and it is deliberately not a
 *                  punishment: nothing is taken away, a star is simply not earned.
 *  - `happy`     — ENJOY_MS of swimming, eating or sleeping, then they move on.
 *
 * A minute is a long time for an adult and about right for a child who has to work out
 * where the job is, walk there, and do it. A restaurant order buys more: three dishes is
 * three trips through the kitchen, and charging the same minute for that would make a big
 * order a punishment rather than a treat.
 */
export const PATIENCE_MS = 60_000;
export const EXTRA_PATIENCE_PER_DISH_MS = 25_000;
export const GRUMPY_MS = 30_000;
export const ENJOY_MS = 12_000;

export type GuestPhase = 'waiting' | 'impatient' | 'happy';

export interface GuestData {
  id: number;
  name: string;
  color: number;
  roomNumber: number | null;
  checkedIn: boolean;
  /** Where they intend to go, in order. Shuffled per guest, so no two stays are alike. */
  plan: Place[];
  /** How far through the plan they are. */
  step: number;
  at: GuestAt;
  /** Epoch ms when they arrived where they are and started waiting. */
  since: number;
  /** Epoch ms when what they were waiting for arrived; null while they are still waiting. */
  settledAt: number | null;
  /** Set once their patience ran out here. Cleared when they move on. */
  gaveUp: boolean;
  /** Which lounger they are lying on, at the pool. */
  lounger: number | null;
  /** What they asked for in the restaurant, and what has been carried out to them. */
  order: string[];
  served: string[];
}

export interface RoomState {
  bedMade: boolean;
  curtainsOpen: boolean;
  flowersPlaced: boolean;
  vacuumed: boolean;
  towelsFolded: boolean;
  guestId: number | null;
  /** Index into ROOM_THEMES. Extra themes are unlocked in the shop. */
  theme: number;
}

export interface KitchenState {
  recipe: string | null;
  added: string[];
  showingDining: boolean;
  /** Cooked dishes waiting on the pass. The player carries these out themselves. */
  ready: string[];
  dishesServed: number;
}

export interface PoolState {
  towels: boolean[];
}

export interface GardenState {
  flowers: boolean[];
  sandcastle: number;
  apples: boolean[];
}

/** 'leg' is the free-play sandbox; 'laer' gates the stars behind a task. */
export type Mode = 'leg' | 'laer';

export interface SkillProgress {
  seen: number;
  correct: number;
  /** Consecutive right answers; three promotes a level. */
  streak: number;
  /** Consecutive wrong answers; two demotes a level. */
  missed: number;
  level: Level;
}

export interface Settings {
  mode: Mode;
  matematik: boolean;
  dansk: boolean;
  /** Guest gibberish when a speech bubble pops. Replaced the Danish read-aloud. */
  voices: boolean;
  sound: boolean;
  music: boolean;
}

/** A job the player finished for a guest, and whether they were quick enough about it. */
export interface JobResult {
  guest: GuestData;
  /** True when the guest had already given up waiting — the job counts, the star does not. */
  late: boolean;
}

export interface ServeResult {
  dish: string;
  /** True when that was the last thing on the guest's order. */
  complete: boolean;
  late: boolean;
}

// Each player's save lives under its own key; see state/Profiles for the layout.
const SAVE_VERSION = 4;

/** Rooms the hotel starts with. The fourth is a shop upgrade. */
export const BASE_ROOM_COUNT = 3;
/** Three to begin with, a fourth from one upgrade, then two more from the second floor. */
export const MAX_ROOM_COUNT = 6;
export const LOUNGER_COUNT = 4;
export const FLOWER_COUNT = 5;
export const APPLE_COUNT = 5;
export const SANDCASTLE_STAGES = 3;
export const MAX_WAITING_GUESTS = 3;
/** Room on the pass. Beyond this the kitchen has cooked more than anyone ordered. */
export const MAX_READY_DISHES = 6;
/** Tables in the restaurant. */
export const TABLE_COUNT = 5;
/** Every recipe has the same number of ingredients; the map's counter relies on it. */
export const RECIPE_STEPS = 3;

const GUEST_NAMES = [
  'Hr. Jensen', 'Fru Hansen', 'Familien Pedersen', 'Fru Larsen',
  'Hr. Nielsen', 'Lille Sofia', 'Familien Sørensen', 'Hr. Andersen',
  'Fru Christensen', 'Familien Møller',
];

const GUEST_COLORS = [
  0xE88E7D, 0x7FC49A, 0x7FAEDD, 0xF2CE72,
  0xEFA57F, 0xB294D4, 0xE896B8, 0x86CFC4,
  0xEFB77F, 0x8FA9E0,
];

const ALL_PLACES: Place[] = ['pool', 'restaurant', 'room'];

function shuffled<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

class GameState {
  stars = 0;
  guests: GuestData[] = [];
  rooms: RoomState[] = [];
  kitchen: KitchenState = this.freshKitchen();
  pool: PoolState = this.freshPool();
  garden: GardenState = this.freshGarden();
  nextGuestId = 0;
  /** Shop items the child has bought, by item id. */
  owned: string[] = [];
  settings: Settings = this.freshSettings();
  skills: Record<string, SkillProgress> = {};
  /**
   * Whose hotel this is. Every save, load and reset goes to this player's key.
   *
   * Null only when there is nobody to be — no players yet — and then nothing is written:
   * the title screen must not invent a save for a child who has not been created.
   */
  profileId: string | null = null;

  constructor() {
    this.rooms = this.freshRooms();
    // A save from before profiles becomes the first player's before anything reads it.
    migrateLegacySave();
    // Until somebody taps a card, wear whoever played last: their sound and music settings
    // are what the title screen should obey.
    this.profileId = lastProfileId();
    this.load();
  }

  // ---------- factories ----------

  private freshRooms(count = BASE_ROOM_COUNT): RoomState[] {
    return Array.from({ length: count }, (_, i) => this.freshRoom(i));
  }

  private freshRoom(index: number): RoomState {
    return {
      bedMade: false,
      curtainsOpen: false,
      flowersPlaced: false,
      vacuumed: false,
      towelsFolded: false,
      guestId: null,
      theme: index % BASE_ROOM_COUNT,
    };
  }

  private freshKitchen(): KitchenState {
    return { recipe: null, added: [], showingDining: false, ready: [], dishesServed: 0 };
  }

  private freshPool(): PoolState {
    return { towels: Array(LOUNGER_COUNT).fill(false) };
  }

  private freshGarden(): GardenState {
    return {
      flowers: Array(FLOWER_COUNT).fill(false),
      sandcastle: 0,
      apples: Array(APPLE_COUNT).fill(false),
    };
  }

  private freshSettings(): Settings {
    return { mode: 'leg', matematik: true, dansk: true, voices: true, sound: true, music: true };
  }

  // ---------- shop ----------

  owns(itemId: string): boolean {
    return this.owned.includes(itemId);
  }

  /** How many rooms the hotel has, counting the upgrade. */
  get roomCount(): number {
    return this.rooms.length;
  }

  /**
   * Grows the hotel to whatever the bought upgrades entitle it to.
   *
   * Each upgrade *adds* capacity rather than setting it, so buying the cheap one first is
   * never wasted — a second floor that jumped straight to six rooms would have made the
   * fourth-room upgrade pointless.
   */
  private growRooms(): void {
    let target = BASE_ROOM_COUNT;
    if (this.owns('room4')) target += 1;
    if (this.owns('floor2')) target += 2;
    target = Math.min(target, MAX_ROOM_COUNT);

    while (this.rooms.length < target) {
      this.rooms.push(this.freshRoom(this.rooms.length));
    }
  }

  /** Themes unlocked for the rooms: the three built in, plus anything bought. */
  unlockedThemes(extras: { id: string; theme: number }[]): number[] {
    const base = Array.from({ length: BASE_ROOM_COUNT }, (_, i) => i);
    const bought = extras.filter(e => this.owns(e.id)).map(e => e.theme);
    return [...base, ...bought];
  }

  setRoomTheme(roomIndex: number, theme: number): void {
    const room = this.rooms[roomIndex];
    if (!room || room.theme === theme) return;
    room.theme = theme;
    this.save();
  }

  canAfford(cost: number): boolean {
    return this.stars >= cost;
  }

  /** Spends the stars and records the purchase. False if unaffordable or already owned. */
  buy(itemId: string, cost: number): boolean {
    if (this.owns(itemId) || this.stars < cost) return false;
    this.stars -= cost;
    this.owned.push(itemId);
    // an upgrade may change the hotel itself, not just decorate it
    this.growRooms();
    this.save();
    return true;
  }

  // ---------- learning ----------

  get isLearning(): boolean {
    return this.settings.mode === 'laer';
  }

  setMode(mode: Mode): void {
    this.settings.mode = mode;
    this.save();
  }

  toggleSetting(key: 'matematik' | 'dansk' | 'voices' | 'sound' | 'music'): void {
    // Never leave both subjects off — there would be nothing to ask.
    if ((key === 'matematik' || key === 'dansk') && this.settings[key]) {
      const other = key === 'matematik' ? 'dansk' : 'matematik';
      if (!this.settings[other]) return;
    }
    this.settings[key] = !this.settings[key];
    this.save();
  }

  progressFor(skill: string): SkillProgress {
    if (!this.skills[skill]) {
      this.skills[skill] = { seen: 0, correct: 0, streak: 0, missed: 0, level: 1 };
    }
    return this.skills[skill];
  }

  /**
   * Records an attempt and moves the level.
   *
   * Three right in a row promotes, two wrong in a row demotes. The level is never shown
   * to the child; it only decides which factory the next task comes from.
   */
  recordAttempt(skill: string, correct: boolean): void {
    const p = this.progressFor(skill);
    p.seen++;
    if (correct) {
      p.correct++;
      p.streak++;
      p.missed = 0;
      if (p.streak >= 3 && p.level < 3) {
        p.level = (p.level + 1) as Level;
        p.streak = 0;
      }
    } else {
      p.streak = 0;
      p.missed++;
      if (p.missed >= 2 && p.level > 1) {
        p.level = (p.level - 1) as Level;
        p.missed = 0;
      }
    }
    this.save();
  }

  /** Skills practised at least once, most-practised first — for the grown-up screen. */
  practised(): { skill: string; progress: SkillProgress }[] {
    return Object.entries(this.skills)
      .filter(([, p]) => p.seen > 0)
      .map(([skill, progress]) => ({ skill, progress }))
      .sort((a, b) => b.progress.seen - a.progress.seen);
  }

  // ---------- stars ----------

  /**
   * Awarding is separate from the star-burst animation on purpose: the effect used to
   * grant the currency, so every decorative flourish inflated the score.
   */
  addStars(count = 1): void {
    this.stars += count;
    this.save();
  }

  // ---------- rooms ----------

  /** Returns true only when the chore was not already done, so rewards cannot be farmed. */
  completeChore(roomIndex: number, chore: Chore): boolean {
    const room = this.rooms[roomIndex];
    if (!room || room[chore]) return false;
    room[chore] = true;
    this.save();
    return true;
  }

  isRoomClean(roomIndex: number): boolean {
    const r = this.rooms[roomIndex];
    return !!r && r.bedMade && r.curtainsOpen && r.flowersPlaced && r.vacuumed && r.towelsFolded;
  }

  // ---------- guests ----------

  createGuest(): GuestData | null {
    if (this.getWaitingGuests().length >= MAX_WAITING_GUESTS) return null;
    const id = this.nextGuestId++;
    const guest: GuestData = {
      id,
      name: GUEST_NAMES[id % GUEST_NAMES.length],
      color: GUEST_COLORS[id % GUEST_COLORS.length],
      roomNumber: null,
      checkedIn: false,
      plan: shuffled(ALL_PLACES),
      step: 0,
      at: 'lobby',
      since: Date.now(),
      settledAt: null,
      gaveUp: false,
      lounger: null,
      order: [],
      served: [],
    };
    this.guests.push(guest);
    this.save();
    return guest;
  }

  /**
   * Hands over a key and sends the guest off on the first thing in their plan.
   *
   * Returns the room and whether the guest had already lost patience at the desk, so the
   * lobby knows whether the check-in earns anything.
   */
  checkInGuest(guestId: number): { room: number; late: boolean } | null {
    const guest = this.guests.find(g => g.id === guestId);
    if (!guest || guest.checkedIn) return null;

    const freeRoom = this.rooms.findIndex(r => r.guestId === null);
    if (freeRoom === -1) return null;

    const late = guest.gaveUp;
    guest.checkedIn = true;
    guest.roomNumber = freeRoom;
    this.rooms[freeRoom].guestId = guestId;
    this.arriveAt(guest, guest.plan[0], Date.now());
    this.save();
    return { room: freeRoom, late };
  }

  /** Sends the guest home and frees the room for whoever is next at the desk. */
  checkOutGuest(guestId: number): { late: boolean } | null {
    const guest = this.guests.find(g => g.id === guestId);
    if (!guest || guest.at !== 'checkout') return null;

    const late = guest.gaveUp;
    if (guest.roomNumber !== null) {
      const room = this.rooms[guest.roomNumber];
      if (room) {
        room.guestId = null;
        room.bedMade = false;
        room.curtainsOpen = false;
        room.flowersPlaced = false;
        room.vacuumed = false;
        room.towelsFolded = false;
      }
    }
    this.guests = this.guests.filter(g => g.id !== guest.id);
    this.save();
    return { late };
  }

  getCheckedInGuests(): GuestData[] {
    return this.guests.filter(g => g.checkedIn);
  }

  getWaitingGuests(): GuestData[] {
    return this.guests.filter(g => !g.checkedIn);
  }

  /** Guests standing in one part of the hotel, in a stable order so nobody jumps about. */
  guestsAt(at: GuestAt): GuestData[] {
    return this.guests.filter(g => g.checkedIn && g.at === at);
  }

  guestInRoom(roomIndex: number): GuestData | null {
    const room = this.rooms[roomIndex];
    if (!room || room.guestId === null) return null;
    return this.guests.find(g => g.id === room.guestId) ?? null;
  }

  hasFreeRoom(): boolean {
    return this.rooms.some(r => r.guestId === null);
  }

  // ---------- waiting ----------

  /** How long this guest will wait where they are, before the star is off the table. */
  patienceMsFor(guest: GuestData): number {
    if (guest.at !== 'restaurant') return PATIENCE_MS;
    return PATIENCE_MS + Math.max(0, guest.order.length - 1) * EXTRA_PATIENCE_PER_DISH_MS;
  }

  guestPhase(guest: GuestData, now = Date.now()): GuestPhase {
    if (guest.settledAt !== null) return 'happy';
    return now - guest.since > this.patienceMsFor(guest) ? 'impatient' : 'waiting';
  }

  /** How much of a guest's patience is left, 1 down to 0. */
  patienceLeft(guest: GuestData, now = Date.now()): number {
    if (guest.settledAt !== null) return 1;
    const left = 1 - (now - guest.since) / this.patienceMsFor(guest);
    return Math.max(0, Math.min(1, left));
  }

  /** What a guest is still waiting for, or null when they are being looked after. */
  needOf(guest: GuestData): Place | 'checkin' | 'checkout' | null {
    if (guest.settledAt !== null) return null;
    if (guest.at === 'lobby') return 'checkin';
    if (guest.at === 'checkout') return 'checkout';
    return guest.at;
  }

  /** Dishes ordered but not yet carried out, as a list (so two soups read as two). */
  outstandingOrder(guest: GuestData): string[] {
    const left = [...guest.order];
    for (const dish of guest.served) {
      const at = left.indexOf(dish);
      if (at !== -1) left.splice(at, 1);
    }
    return left;
  }

  /**
   * Moves the clock on for every guest.
   *
   * Called on a slow loop by whichever scene is open, so guests keep living their day while
   * the player is somewhere else in the hotel. Returns true when something actually
   * changed, so a scene only redraws when there is something new to draw.
   */
  tickGuests(now = Date.now()): boolean {
    let changed = false;

    for (const guest of this.guests) {
      const patience = this.patienceMsFor(guest);

      if (!guest.checkedIn) {
        // Nobody at the desk ever walks out — that would just make a guest vanish. They
        // only get impatient, which costs the check-in its star.
        if (!guest.gaveUp && now - guest.since > patience) {
          guest.gaveUp = true;
          changed = true;
        }
        continue;
      }

      if (guest.at === 'checkout') {
        if (!guest.gaveUp && now - guest.since > patience) {
          guest.gaveUp = true;
          changed = true;
        }
        continue;
      }

      // A need can be met without the player doing anything here — a room that was already
      // clean when they walked in, a lounger free and made up.
      if (guest.settledAt === null && this.tryToSettle(guest, now)) {
        changed = true;
        continue;
      }

      if (guest.settledAt === null) {
        if (!guest.gaveUp && now - guest.since > patience) {
          guest.gaveUp = true;
          changed = true;
        }
        // Still nothing after the grumpy window: give up on this and go do the next thing.
        if (now - guest.since > patience + GRUMPY_MS) {
          this.advance(guest, now);
          changed = true;
        }
        continue;
      }

      if (now - guest.settledAt > ENJOY_MS) {
        this.advance(guest, now);
        changed = true;
      }
    }

    if (changed) this.save();
    return changed;
  }

  /** True when the guest's need at their current place is already met. */
  private tryToSettle(guest: GuestData, now: number): boolean {
    switch (guest.at) {
      case 'pool': {
        const lounger = this.freeLounger();
        if (lounger === null) return false;
        guest.lounger = lounger;
        guest.settledAt = now;
        return true;
      }
      case 'restaurant':
        // Food is carried out by the player, never conjured — settling happens in serveTo().
        return false;
      case 'room':
        if (guest.roomNumber === null || !this.isRoomClean(guest.roomNumber)) return false;
        guest.settledAt = now;
        return true;
      default:
        return false;
    }
  }

  /** A made-up lounger nobody is lying on. */
  private freeLounger(): number | null {
    const taken = new Set(
      this.guests.filter(g => g.at === 'pool' && g.lounger !== null).map(g => g.lounger)
    );
    for (let i = 0; i < LOUNGER_COUNT; i++) {
      if (this.pool.towels[i] && !taken.has(i)) return i;
    }
    return null;
  }

  private arriveAt(guest: GuestData, at: GuestAt, now: number): void {
    guest.at = at;
    guest.since = now;
    guest.settledAt = null;
    guest.gaveUp = false;
    guest.lounger = null;
    if (at === 'restaurant') {
      guest.order = randomOrder();
      guest.served = [];
    } else {
      guest.order = [];
      guest.served = [];
    }
  }

  private advance(guest: GuestData, now: number): void {
    guest.step++;
    if (guest.step >= guest.plan.length) {
      this.arriveAt(guest, 'checkout', now);
      return;
    }
    this.arriveAt(guest, guest.plan[guest.step], now);
  }

  /** Where the guest is heading after this, for their speech bubble. */
  nextPlaceOf(guest: GuestData): Place | 'checkout' | null {
    if (!guest.checkedIn) return guest.plan[0] ?? null;
    if (guest.at === 'checkout') return null;
    const next = guest.plan[guest.step + 1];
    return next ?? 'checkout';
  }

  // ---------- kitchen ----------

  selectRecipe(name: string): void {
    this.kitchen.recipe = name;
    this.kitchen.added = [];
    this.save();
  }

  addIngredient(name: string): boolean {
    if (!this.kitchen.recipe || this.kitchen.added.includes(name)) return false;
    this.kitchen.added.push(name);
    this.save();
    return true;
  }

  /** True when the pot holds a whole recipe and there is room on the pass for it. */
  canCook(ingredientCount: number): boolean {
    return this.kitchen.recipe !== null
      && this.kitchen.added.length >= ingredientCount
      && this.kitchen.ready.length < MAX_READY_DISHES;
  }

  /**
   * Turns the full pot into a finished dish on the pass.
   *
   * Cooking is the one thing in the kitchen that pays: putting a carrot in a pot is not a
   * job, making dinner is. Serving it is a separate act, done by the player in the
   * restaurant, because handing a plate to the person who asked for it is the whole point.
   */
  cookDish(): string | null {
    const dish = this.kitchen.recipe;
    if (!dish || this.kitchen.ready.length >= MAX_READY_DISHES) return null;
    this.kitchen.ready.push(dish);
    this.kitchen.recipe = null;
    this.kitchen.added = [];
    this.save();
    return dish;
  }

  /** Everything on the pass that at least one seated guest is still waiting for. */
  wantedDishes(): string[] {
    const wanted = new Set(this.guestsAt('restaurant').flatMap(g => this.outstandingOrder(g)));
    return this.kitchen.ready.filter(d => wanted.has(d));
  }

  /** Dishes every seated guest is still waiting for, so the kitchen knows what to cook. */
  openOrders(): string[] {
    return this.guestsAt('restaurant').flatMap(g => this.outstandingOrder(g));
  }

  /**
   * Carries one dish from the pass to a guest.
   *
   * Null when there is nothing on the pass that this guest asked for — the caller turns
   * that into "she is still waiting for pancakes" rather than an error.
   */
  serveTo(guestId: number): ServeResult | null {
    const guest = this.guests.find(g => g.id === guestId);
    if (!guest || guest.at !== 'restaurant' || guest.settledAt !== null) return null;

    const wants = this.outstandingOrder(guest);
    const dish = this.kitchen.ready.find(d => wants.includes(d));
    if (!dish) return null;

    this.kitchen.ready.splice(this.kitchen.ready.indexOf(dish), 1);
    guest.served.push(dish);
    this.kitchen.dishesServed++;

    const complete = this.outstandingOrder(guest).length === 0;
    const late = guest.gaveUp;
    if (complete) guest.settledAt = Date.now();

    this.save();
    return { dish, complete, late };
  }

  /** Bins one dish off the pass, so a kitchen full of food nobody wants is not a dead end. */
  scrapeDish(dish: string): boolean {
    const at = this.kitchen.ready.indexOf(dish);
    if (at === -1) return false;
    this.kitchen.ready.splice(at, 1);
    this.save();
    return true;
  }

  setShowingDining(showing: boolean): void {
    this.kitchen.showingDining = showing;
    this.save();
  }

  // ---------- pool ----------

  layTowel(index: number): boolean {
    if (this.pool.towels[index]) return false;
    this.pool.towels[index] = true;
    this.save();
    return true;
  }

  /**
   * Puts every waiting guest who can now have a lounger onto one.
   *
   * Returns the guests that were seated, so the pool knows whether the towel that was just
   * laid actually helped anybody — and whether it was laid in time.
   */
  seatPoolGuests(now = Date.now()): JobResult[] {
    const seated: JobResult[] = [];
    for (const guest of this.guestsAt('pool')) {
      if (guest.settledAt !== null) continue;
      const late = guest.gaveUp;
      if (!this.tryToSettle(guest, now)) continue;
      seated.push({ guest, late });
    }
    if (seated.length > 0) this.save();
    return seated;
  }

  /** Tucks in the guest waiting in a room that has just been finished. */
  settleRoomGuest(roomIndex: number, now = Date.now()): JobResult | null {
    const guest = this.guestInRoom(roomIndex);
    if (!guest || guest.at !== 'room' || guest.settledAt !== null) return null;
    const late = guest.gaveUp;
    if (!this.tryToSettle(guest, now)) return null;
    this.save();
    return { guest, late };
  }

  // ---------- garden ----------

  /** Waters the next dry flower and returns its index, or null when the bed is done. */
  waterNextFlower(): number | null {
    const next = this.garden.flowers.findIndex(f => !f);
    if (next === -1) return null;
    this.garden.flowers[next] = true;
    this.save();
    return next;
  }

  buildSandcastle(): boolean {
    if (this.garden.sandcastle >= SANDCASTLE_STAGES) return false;
    this.garden.sandcastle++;
    this.save();
    return true;
  }

  pickApple(index: number): boolean {
    if (this.garden.apples[index]) return false;
    this.garden.apples[index] = true;
    this.save();
    return true;
  }

  allApplesPicked(): boolean {
    return this.garden.apples.every(a => a);
  }

  // ---------- what still wants doing ----------

  /**
   * How many jobs are left in an area.
   *
   * Derived, never stored — it is a read of the same state the scenes draw from, so it
   * cannot drift out of sync with them. The hotel map uses it to put a number on each
   * area, which is what turns five identical buttons into a place with things going on.
   */
  todoIn(area: Area): number {
    switch (area) {
      case 'lobby':
        // Either there are guests to check in, or the bell is worth ringing.
        return this.getWaitingGuests().length > 0
          ? this.getWaitingGuests().length
          : (this.hasFreeRoom() ? 1 : 0);

      case 'rooms':
        // Only over the rooms the hotel actually has — the shop can buy more.
        return this.rooms.slice(0, this.roomCount)
          .reduce((sum, room) => sum + CHORES.filter(c => !room[c]).length, 0);

      case 'kitchen':
        if (!this.kitchen.recipe) return 1;
        return RECIPE_STEPS - this.kitchen.added.length + 1;

      case 'pool':
        return this.pool.towels.filter(t => !t).length;

      case 'garden':
        return this.garden.flowers.filter(f => !f).length
          + (SANDCASTLE_STAGES - this.garden.sandcastle)
          + this.garden.apples.filter(a => !a).length;
    }
  }

  // ---------- persistence ----------

  /** The active player's save key; null before there is anyone to save for. */
  private get saveKey(): string | null {
    return this.profileId ? saveKeyFor(this.profileId) : null;
  }

  /** The active player's name and face, or null before anyone has been created. */
  get profile(): Profile | null {
    return findProfile(this.profileId);
  }

  /**
   * Makes `id` the player whose hotel this is, and puts their hotel on the table.
   *
   * Memory is emptied first: `load()` only fills in what a save has, so a player with no
   * save yet would otherwise sit down in the previous child's hotel.
   */
  loadProfile(id: string | null): void {
    this.profileId = id;
    this.clear();
    this.load();
    if (id) setLastProfile(id);
  }

  /** "Start forfra": this player's hotel goes back to the beginning. Nobody else's does. */
  reset(): void {
    this.clear();
    const key = this.saveKey;
    if (!key) return;
    try {
      localStorage.removeItem(key);
    } catch {
      // localStorage may be unavailable; in-memory reset is still correct
    }
    // or the native copy would put the old hotel back the next time web storage is lost
    unmirror(key);
  }

  /** An empty hotel in memory. Touches nothing on disk. */
  private clear(): void {
    this.stars = 0;
    this.guests = [];
    this.rooms = this.freshRooms();
    this.kitchen = this.freshKitchen();
    this.pool = this.freshPool();
    this.garden = this.freshGarden();
    this.nextGuestId = 0;
    this.owned = [];
    this.settings = this.freshSettings();
    this.skills = {};
  }

  save(): void {
    const key = this.saveKey;
    if (!key) return;

    const json = JSON.stringify({
      version: SAVE_VERSION,
      stars: this.stars,
      guests: this.guests,
      rooms: this.rooms,
      kitchen: this.kitchen,
      pool: this.pool,
      garden: this.garden,
      nextGuestId: this.nextGuestId,
      owned: this.owned,
      settings: this.settings,
      skills: this.skills,
    });

    try {
      localStorage.setItem(key, json);
    } catch {
      // private browsing or a full quota — the game still plays, it just will not persist
    }

    // On Android the same bytes go to native storage as well, which survives the WebView
    // having its web data cleared. No-op in a browser.
    mirror(key, json);
  }

  load(): void {
    const key = this.saveKey;
    if (!key) return;

    let data: Record<string, unknown> | null = null;
    try {
      const raw = localStorage.getItem(key);
      data = raw ? JSON.parse(raw) : null;
    } catch {
      data = null;
    }
    if (!data) return;

    // Older saves stored guests without a plan and a kitchen without a pass, neither of
    // which maps onto this shape. Rather than half-restore them, keep the stars the child
    // earned and let the hotel start its day again.
    if (data.version !== SAVE_VERSION) {
      this.stars = typeof data.stars === 'number' ? data.stars : 0;
      this.save();
      return;
    }

    const rooms = data.rooms as RoomState[] | undefined;
    const kitchen = data.kitchen as KitchenState | undefined;
    const pool = data.pool as PoolState | undefined;
    const garden = data.garden as GardenState | undefined;
    const settings = data.settings as Partial<Settings> | undefined;

    this.stars = (data.stars as number) ?? 0;
    this.guests = this.restoreGuests(data.guests);
    this.nextGuestId = (data.nextGuestId as number) ?? 0;
    this.owned = Array.isArray(data.owned) ? (data.owned as string[]) : [];
    // Only known keys, so a setting that has been renamed away cannot come back to life.
    this.settings = {
      ...this.freshSettings(),
      ...(settings?.mode ? { mode: settings.mode } : {}),
      ...(typeof settings?.matematik === 'boolean' ? { matematik: settings.matematik } : {}),
      ...(typeof settings?.dansk === 'boolean' ? { dansk: settings.dansk } : {}),
      ...(typeof settings?.voices === 'boolean' ? { voices: settings.voices } : {}),
      ...(typeof settings?.sound === 'boolean' ? { sound: settings.sound } : {}),
      ...(typeof settings?.music === 'boolean' ? { music: settings.music } : {}),
    };
    this.skills = (data.skills as Record<string, SkillProgress>) ?? {};
    // A save may predate the fourth-room upgrade, or carry rooms without a theme.
    this.rooms = Array.isArray(rooms) && rooms.length >= BASE_ROOM_COUNT
      && rooms.length <= MAX_ROOM_COUNT
      ? rooms.map((room, i) => ({ ...this.freshRoom(i), ...room }))
      : this.freshRooms();
    this.growRooms();

    this.kitchen = { ...this.freshKitchen(), ...kitchen };
    if (!Array.isArray(this.kitchen.ready)) this.kitchen.ready = [];
    this.pool = pool?.towels?.length === LOUNGER_COUNT ? pool : this.freshPool();
    this.garden = garden?.flowers?.length === FLOWER_COUNT && garden.apples?.length === APPLE_COUNT
      ? garden
      : this.freshGarden();

    // Write the normalised shape straight back, so a migration runs once rather than on
    // every boot and the file on disk always matches what the game is holding.
    this.save();
  }

  /**
   * Guests, with their clocks wound back to now.
   *
   * Patience is measured in real time, so a save reopened the next morning would otherwise
   * have every guest storming out on the first tick. Closing the game is not a mistake a
   * child should be charged for.
   */
  private restoreGuests(raw: unknown): GuestData[] {
    if (!Array.isArray(raw)) return [];
    const now = Date.now();
    return (raw as GuestData[])
      .filter(g => g && typeof g.id === 'number')
      .map(g => ({
        ...g,
        plan: Array.isArray(g.plan) && g.plan.length > 0 ? g.plan : shuffled(ALL_PLACES),
        step: typeof g.step === 'number' ? g.step : 0,
        at: g.at ?? (g.checkedIn ? 'room' : 'lobby'),
        since: now,
        settledAt: g.settledAt === null || g.settledAt === undefined ? null : now,
        gaveUp: false,
        lounger: g.lounger ?? null,
        order: Array.isArray(g.order) ? g.order : [],
        served: Array.isArray(g.served) ? g.served : [],
      }));
  }
}

export const gameState = new GameState();
