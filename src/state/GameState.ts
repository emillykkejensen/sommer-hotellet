import { Level } from '../tasks/types';
import { mirrorSave } from '../helpers/Native';
import { randomOrder } from './Menu';
import { isGarment, isIce, randomGarment, randomIce } from './Extras';
import type { Area } from './Shop';

export type Chore = 'bedMade' | 'curtainsOpen' | 'flowersPlaced' | 'vacuumed' | 'towelsFolded';

export const CHORES: Chore[] = ['bedMade', 'curtainsOpen', 'flowersPlaced', 'vacuumed', 'towelsFolded'];

/** The three things a guest comes to the hotel to do, in whatever order they fancy. */
export type Place = 'pool' | 'restaurant' | 'room';

/** Where a guest can be led: one of their stops, or back to the desk to check out. */
export type Destination = Place | 'checkout';

/**
 * Where a guest is right now.
 *
 * 'following' is walking with the player. Guests never change place on their own any more —
 * a guest who was there a moment ago and is simply gone, because they read out that they
 * were off to the pool, is exactly what a child who cannot read yet finds baffling. Moving
 * is something the player does, by leading them.
 */
export type GuestAt = 'lobby' | Place | 'checkout' | 'following';

/**
 * How long a guest waits.
 *
 * The phases, and the numbers are the whole difficulty curve of the game:
 *
 *  - `waiting`   — up to their patience. Do the job inside this and it pays.
 *  - `impatient` — past it. The job can still be done, and still has to be, but it no
 *                  longer pays. This is the consequence, and it is deliberately not a
 *                  punishment: nothing is taken away, a star is simply not earned.
 *  - `happy`     — ENJOY_MS of swimming, eating or sleeping.
 *  - `ready`     — finished here, or given up after a further GRUMPY_MS, and waiting to be
 *                  led on. There is no clock on this one: a guest who is content to wait
 *                  costs nothing, and one who has given up has already cost the star.
 *
 * A minute is a long time for an adult and about right for a child who has to work out
 * where the job is, walk there, and do it. Every extra thing asked for buys more time:
 * three dishes is three trips through the kitchen, and charging the same minute for that
 * would make a big order a punishment rather than a treat.
 */
export const PATIENCE_MS = 60_000;
export const EXTRA_PATIENCE_PER_ITEM_MS = 25_000;
export const GRUMPY_MS = 30_000;
export const ENJOY_MS = 12_000;

export type GuestPhase = 'waiting' | 'impatient' | 'happy' | 'ready';

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
  /** While following the player: where they want to be taken. */
  heading: Destination | null;
  /** Epoch ms when they arrived where they are and started waiting. */
  since: number;
  /** Epoch ms when what they were waiting for arrived; null while they are still waiting. */
  settledAt: number | null;
  /** Finished here — enjoyed it, or gave up on it — and waiting to be led on. */
  done: boolean;
  /** Set once their patience ran out here. Cleared when they move on. */
  gaveUp: boolean;
  /** Which lounger is theirs, at the pool. */
  lounger: number | null;
  /** In their bed, in their room. */
  inBed: boolean;
  /** What they asked for in the restaurant, and what has been carried out to them. */
  order: string[];
  served: string[];
  /** An ice cream or something to wear, asked for at this stop, and what has arrived. */
  extras: string[];
  extrasGot: string[];
  /** What they were given at the boutique; they keep it on for the rest of their stay. */
  wearing: string | null;
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
  /** Ice creams made at the stand, waiting on its counter to be handed over. */
  ices: string[];
}

export interface BoutiqueState {
  /** Things made in the boutique, waiting on the shelf to be handed over. */
  ready: string[];
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
  /** True when that was the last thing they were waiting for here. */
  settled: boolean;
}

export interface ServeResult {
  dish: string;
  /** True when that was the last thing on the guest's order. */
  complete: boolean;
  late: boolean;
}

/** A guest setting off behind the player, and what they are leaving behind them. */
export interface LeadResult {
  guest: GuestData;
  from: GuestAt;
  heading: Destination;
  /** They had what they came for here — a swim, a meal, a night's sleep. */
  enjoyed: boolean;
  late: boolean;
}

export const SAVE_KEY = 'sommer-hotellet-save';
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
/** Room on the ice cream stand's counter. */
export const MAX_ICES = 3;
/** Room on the boutique's shelf. */
export const MAX_GARMENTS = 4;
/** The shop upgrade that opens the boutique. */
export const BOUTIQUE_ID = 'boutique';
/** How often a guest at the pool fancies an ice cream, or something from the boutique. */
const ICE_CHANCE = 0.5;
const GARMENT_CHANCE = 0.45;
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

/** `items` with one occurrence of each of `taken` removed — two soups ordered, one served, one left. */
function without(items: string[], taken: string[]): string[] {
  const left = [...items];
  for (const item of taken) {
    const at = left.indexOf(item);
    if (at !== -1) left.splice(at, 1);
  }
  return left;
}

class GameState {
  stars = 0;
  guests: GuestData[] = [];
  rooms: RoomState[] = [];
  kitchen: KitchenState = this.freshKitchen();
  pool: PoolState = this.freshPool();
  garden: GardenState = this.freshGarden();
  boutique: BoutiqueState = this.freshBoutique();
  nextGuestId = 0;
  /** Shop items the child has bought, by item id. */
  owned: string[] = [];
  settings: Settings = this.freshSettings();
  skills: Record<string, SkillProgress> = {};

  constructor() {
    this.rooms = this.freshRooms();
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
    return { towels: Array(LOUNGER_COUNT).fill(false), ices: [] };
  }

  private freshBoutique(): BoutiqueState {
    return { ready: [] };
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
    if (this.lobbyGuests().length >= MAX_WAITING_GUESTS) return null;
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
      heading: null,
      since: Date.now(),
      settledAt: null,
      done: false,
      gaveUp: false,
      lounger: null,
      inBed: false,
      order: [],
      served: [],
      extras: [],
      extrasGot: [],
      wearing: null,
    };
    this.guests.push(guest);
    this.save();
    return guest;
  }

  /**
   * Hands over a key.
   *
   * The guest stays at the desk afterwards, ready to be shown the way to the first thing on
   * their plan — the player leads them there. Returns the room and whether they had already
   * lost patience at the desk, so the lobby knows whether the check-in earns anything.
   */
  checkInGuest(guestId: number): { room: number; late: boolean } | null {
    const guest = this.guestById(guestId);
    if (!guest || guest.checkedIn) return null;

    const freeRoom = this.rooms.findIndex(r => r.guestId === null);
    if (freeRoom === -1) return null;

    const late = guest.gaveUp;
    const now = Date.now();
    guest.checkedIn = true;
    guest.roomNumber = freeRoom;
    guest.settledAt = now;
    guest.done = true;
    this.rooms[freeRoom].guestId = guestId;
    this.save();
    return { room: freeRoom, late };
  }

  /** Sends the guest home and frees the room for whoever is next at the desk. */
  checkOutGuest(guestId: number): { late: boolean } | null {
    const guest = this.guestById(guestId);
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

  guestById(guestId: number): GuestData | null {
    return this.guests.find(g => g.id === guestId) ?? null;
  }

  getCheckedInGuests(): GuestData[] {
    return this.guests.filter(g => g.checkedIn);
  }

  /** Guests at the desk who have not been given a key yet. */
  getWaitingGuests(): GuestData[] {
    return this.guests.filter(g => !g.checkedIn);
  }

  /**
   * Everybody standing at the front desk on their way in — still waiting for a key, or
   * holding one and waiting to be shown the way. The bell will not call more than fit.
   */
  lobbyGuests(): GuestData[] {
    return this.guests.filter(g => g.at === 'lobby');
  }

  /** Guests standing in one part of the hotel, in a stable order so nobody jumps about. */
  guestsAt(at: GuestAt): GuestData[] {
    return this.guests.filter(g => g.checkedIn && g.at === at);
  }

  /** Guests walking with the player, in the order they set off. */
  followers(): GuestData[] {
    return this.guests.filter(g => g.at === 'following');
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
    const extraDishes = guest.at === 'restaurant' ? Math.max(0, guest.order.length - 1) : 0;
    return PATIENCE_MS + (extraDishes + guest.extras.length) * EXTRA_PATIENCE_PER_ITEM_MS;
  }

  guestPhase(guest: GuestData, now = Date.now()): GuestPhase {
    if (guest.done || guest.at === 'following') return 'ready';
    if (guest.settledAt !== null) return 'happy';
    return now - guest.since > this.patienceMsFor(guest) ? 'impatient' : 'waiting';
  }

  /** How much of a guest's patience is left, 1 down to 0. */
  patienceLeft(guest: GuestData, now = Date.now()): number {
    if (guest.settledAt !== null || guest.done) return 1;
    const left = 1 - (now - guest.since) / this.patienceMsFor(guest);
    return Math.max(0, Math.min(1, left));
  }

  /**
   * True when this guest is waiting on the player: for a job, a key, a bill, or to be led
   * somewhere. The map puts its badges on exactly these.
   */
  needsPlayer(guest: GuestData, now = Date.now()): boolean {
    if (guest.at === 'following') return false;
    return this.guestPhase(guest, now) !== 'happy';
  }

  /** Dishes ordered but not yet carried out, as a list (so two soups read as two). */
  outstandingOrder(guest: GuestData): string[] {
    return without(guest.order, guest.served);
  }

  /** Ice creams and clothes asked for here and not yet handed over. */
  outstandingExtras(guest: GuestData): string[] {
    return without(guest.extras, guest.extrasGot);
  }

  /**
   * Moves the clock on for every guest.
   *
   * Called on a slow loop by whichever scene is open, so guests keep living their day while
   * the player is somewhere else in the hotel. Returns true when something actually
   * changed, so a scene only redraws when there is something new to draw.
   *
   * Time can make a guest impatient, finish their swim or their meal, or make them give up
   * on a stop — but it never moves them. Whatever happens, they are still standing where
   * the player left them.
   */
  tickGuests(now = Date.now()): boolean {
    let changed = false;

    for (const guest of this.guests) {
      if (guest.at === 'following' || guest.done) continue;
      const patience = this.patienceMsFor(guest);

      if (!guest.checkedIn || guest.at === 'checkout') {
        // Nobody at the desk ever walks out — that would just make a guest vanish. They
        // only get impatient, which costs the check-in or check-out its star.
        if (!guest.gaveUp && now - guest.since > patience) {
          guest.gaveUp = true;
          changed = true;
        }
        continue;
      }

      if (guest.settledAt !== null) {
        if (now - guest.settledAt > ENJOY_MS) {
          guest.done = true;
          changed = true;
        }
        continue;
      }

      if (!guest.gaveUp && now - guest.since > patience) {
        guest.gaveUp = true;
        changed = true;
      }
      // Still nothing after the grumpy window: they give up on this stop and want to be
      // taken to the next one. A consequence that left them waiting here for ever would be
      // a deadlock, not a difficulty setting.
      if (now - guest.since > patience + GRUMPY_MS) {
        guest.done = true;
        changed = true;
      }
    }

    if (changed) this.save();
    return changed;
  }

  /** Everything this guest came here for has arrived: from now on they are enjoying it. */
  private settleIfComplete(guest: GuestData, now: number): void {
    if (guest.settledAt !== null || !this.primaryMet(guest)) return;
    if (this.outstandingExtras(guest).length > 0) return;
    guest.settledAt = now;
  }

  /** The thing the stop is for: a lounger, a whole meal, a bed. */
  private primaryMet(guest: GuestData): boolean {
    switch (guest.at) {
      case 'pool': return guest.lounger !== null;
      case 'room': return guest.inBed;
      case 'restaurant': return this.outstandingOrder(guest).length === 0;
      default: return false;
    }
  }

  /** A guest still waiting for something here, who has not given up on it. */
  private stillWaiting(guest: GuestData | null, at: GuestAt): guest is GuestData {
    return !!guest && guest.at === at && guest.settledAt === null && !guest.done;
  }

  private arriveAt(guest: GuestData, at: GuestAt, now: number): void {
    guest.at = at;
    guest.heading = null;
    guest.since = now;
    guest.settledAt = null;
    guest.done = false;
    guest.gaveUp = false;
    guest.lounger = null;
    guest.inBed = false;
    guest.order = at === 'restaurant' ? randomOrder() : [];
    guest.served = [];
    guest.extras = at === 'pool' ? this.poolWishes(guest) : [];
    guest.extrasGot = [];
  }

  /** What a guest at the pool fancies besides somewhere to lie down. */
  private poolWishes(guest: GuestData): string[] {
    const wishes: string[] = [];
    if (Math.random() < ICE_CHANCE) wishes.push(randomIce());
    // Only once the boutique is open, and only once per stay: they keep it on.
    if (this.owns(BOUTIQUE_ID) && !guest.wearing && Math.random() < GARMENT_CHANCE) {
      wishes.push(randomGarment());
    }
    return wishes;
  }

  /** Where the guest wants to be taken next. */
  nextPlaceOf(guest: GuestData): Destination | null {
    if (!guest.checkedIn) return guest.plan[0] ?? null;
    if (guest.at === 'following') return guest.heading;
    if (guest.at === 'checkout') return null;
    if (guest.at === 'lobby') return guest.plan[0] ?? 'checkout';
    return guest.plan[guest.step + 1] ?? 'checkout';
  }

  /**
   * The guest sets off behind the player.
   *
   * Only a guest who is finished where they are will come. Their lounger goes back to the
   * pool — and the towel goes with them, so the next guest needs a fresh one, the same way
   * a room needs making up again after check-out.
   */
  leadGuest(guestId: number, now = Date.now()): LeadResult | null {
    const guest = this.guestById(guestId);
    if (!guest || !guest.checkedIn || !guest.done) return null;
    if (guest.at === 'following' || guest.at === 'checkout') return null;

    const heading = this.nextPlaceOf(guest);
    if (!heading) return null;

    const from = guest.at;
    const enjoyed = guest.settledAt !== null;
    const late = guest.gaveUp;

    if (from !== 'lobby') guest.step++;
    if (guest.lounger !== null) this.pool.towels[guest.lounger] = false;

    guest.at = 'following';
    guest.heading = heading;
    guest.since = now;
    guest.settledAt = null;
    guest.done = false;
    guest.gaveUp = false;
    guest.lounger = null;
    guest.inBed = false;
    guest.order = [];
    guest.served = [];
    guest.extras = [];
    guest.extrasGot = [];
    this.save();
    return { guest, from, heading, enjoyed, late };
  }

  /**
   * Hands over every follower who was heading here.
   *
   * The restaurant is the one place that can be full: a guest who finds every table taken
   * keeps following rather than standing in the doorway.
   */
  dropOff(destination: Destination, now = Date.now()): { arrived: GuestData[]; refused: GuestData[] } {
    const arrived: GuestData[] = [];
    const refused: GuestData[] = [];
    for (const guest of this.followers()) {
      if (guest.heading !== destination) continue;
      if (destination === 'restaurant' && this.guestsAt('restaurant').length >= TABLE_COUNT) {
        refused.push(guest);
        continue;
      }
      this.arriveAt(guest, destination, now);
      arrived.push(guest);
    }
    if (arrived.length > 0) this.save();
    return { arrived, refused };
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

  /** True when the pot holds a whole recipe and there is room on the shelf for it. */
  canCook(ingredientCount: number): boolean {
    return this.kitchen.recipe !== null
      && this.kitchen.added.length >= ingredientCount
      && this.kitchen.ready.length < MAX_READY_DISHES;
  }

  /**
   * Turns the full pot into a finished dish, ready for the tables.
   *
   * Cooking pays nothing by itself — the star is for the guest who gets fed, not for the
   * pot. Serving is a separate act, done by the player in the restaurant, because handing
   * a plate to the person who asked for it is the whole point.
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

  /** Everything ready that at least one seated guest is still waiting for. */
  wantedDishes(): string[] {
    const wanted = new Set(this.guestsAt('restaurant').flatMap(g => this.outstandingOrder(g)));
    return this.kitchen.ready.filter(d => wanted.has(d));
  }

  /** Dishes seated guests are still waiting for, so the kitchen knows what to cook. */
  openOrders(): string[] {
    return this.guestsAt('restaurant')
      .filter(g => !g.done)
      .flatMap(g => this.outstandingOrder(g));
  }

  /**
   * Carries one dish out to a guest.
   *
   * `dish` picks which one, when the card offers a choice; without it the first ready dish
   * they asked for goes. Null when nothing ready is on their order.
   */
  serveTo(guestId: number, dish?: string): ServeResult | null {
    const guest = this.guestById(guestId);
    if (!this.stillWaiting(guest, 'restaurant')) return null;

    const wants = this.outstandingOrder(guest);
    const chosen = dish ?? this.kitchen.ready.find(d => wants.includes(d));
    if (!chosen || !wants.includes(chosen) || !this.kitchen.ready.includes(chosen)) return null;

    this.kitchen.ready.splice(this.kitchen.ready.indexOf(chosen), 1);
    guest.served.push(chosen);
    this.kitchen.dishesServed++;

    const late = guest.gaveUp;
    this.settleIfComplete(guest, Date.now());
    const complete = this.outstandingOrder(guest).length === 0;

    this.save();
    return { dish: chosen, complete, late };
  }

  /** Bins one dish, so a kitchen full of food nobody wants is not a dead end. */
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

  /** Laying a towel is preparation, not service: it pays nothing until a guest uses it. */
  layTowel(index: number): boolean {
    if (this.pool.towels[index]) return false;
    this.pool.towels[index] = true;
    this.save();
    return true;
  }

  /** A made-up lounger nobody has claimed. */
  freeLounger(): number | null {
    const taken = new Set(
      this.guests.filter(g => g.at === 'pool' && g.lounger !== null).map(g => g.lounger)
    );
    for (let i = 0; i < LOUNGER_COUNT; i++) {
      if (this.pool.towels[i] && !taken.has(i)) return i;
    }
    return null;
  }

  /** Shows a waiting guest to a lounger with a towel on it. */
  giveLounger(guestId: number, now = Date.now()): JobResult | null {
    const guest = this.guestById(guestId);
    if (!this.stillWaiting(guest, 'pool') || guest.lounger !== null) return null;
    const lounger = this.freeLounger();
    if (lounger === null) return null;

    guest.lounger = lounger;
    this.settleIfComplete(guest, now);
    this.save();
    return { guest, late: guest.gaveUp, settled: guest.settledAt !== null };
  }

  /** Puts an ice cream on the stand's counter. */
  makeIce(key: string): boolean {
    if (this.pool.ices.length >= MAX_ICES) return false;
    this.pool.ices.push(key);
    this.save();
    return true;
  }

  scrapeIce(index: number): boolean {
    if (index < 0 || index >= this.pool.ices.length) return false;
    this.pool.ices.splice(index, 1);
    this.save();
    return true;
  }

  // ---------- bedtime ----------

  /** Tucks a waiting guest into their bed — once the room is actually made up. */
  putToBed(guestId: number, now = Date.now()): JobResult | null {
    const guest = this.guestById(guestId);
    if (!this.stillWaiting(guest, 'room') || guest.roomNumber === null) return null;
    if (!this.isRoomClean(guest.roomNumber)) return null;

    guest.inBed = true;
    this.settleIfComplete(guest, now);
    this.save();
    return { guest, late: guest.gaveUp, settled: guest.settledAt !== null };
  }

  // ---------- boutique ----------

  makeGarment(key: string): boolean {
    if (!this.owns(BOUTIQUE_ID) || this.boutique.ready.length >= MAX_GARMENTS) return false;
    this.boutique.ready.push(key);
    this.save();
    return true;
  }

  scrapeGarment(index: number): boolean {
    if (index < 0 || index >= this.boutique.ready.length) return false;
    this.boutique.ready.splice(index, 1);
    this.save();
    return true;
  }

  /** Clothes guests are still waiting for, so the boutique knows what to make. */
  wantedGarments(): string[] {
    return this.guests
      .filter(g => g.checkedIn && !g.done && g.at !== 'following')
      .flatMap(g => this.outstandingExtras(g))
      .filter(isGarment);
  }

  /** Ice creams guests are still waiting for. */
  wantedIces(): string[] {
    return this.guestsAt('pool')
      .filter(g => !g.done)
      .flatMap(g => this.outstandingExtras(g))
      .filter(isIce);
  }

  /** True when the thing this guest asked for is made and waiting on its counter. */
  extraReady(key: string): boolean {
    return (isIce(key) ? this.pool.ices : this.boutique.ready).includes(key);
  }

  /** Hands an ice cream or a piece of clothing to the guest who asked for it. */
  giveExtra(guestId: number, key: string, now = Date.now()): JobResult | null {
    const guest = this.guestById(guestId);
    if (!guest || guest.settledAt !== null || guest.done || guest.at === 'following') return null;
    if (!this.outstandingExtras(guest).includes(key)) return null;

    const counter = isIce(key) ? this.pool.ices : this.boutique.ready;
    const at = counter.indexOf(key);
    if (at === -1) return null;

    counter.splice(at, 1);
    guest.extrasGot.push(key);
    if (isGarment(key)) guest.wearing = key;
    this.settleIfComplete(guest, now);
    this.save();
    return { guest, late: guest.gaveUp, settled: guest.settledAt !== null };
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
   * cannot drift out of sync with them.
   */
  todoIn(area: Area): number {
    switch (area) {
      case 'lobby':
        // Either there are guests at the desk, or the bell is worth ringing.
        return this.lobbyGuests().length + this.guestsAt('checkout').length > 0
          ? this.lobbyGuests().length + this.guestsAt('checkout').length
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

  reset(): void {
    this.stars = 0;
    this.guests = [];
    this.rooms = this.freshRooms();
    this.kitchen = this.freshKitchen();
    this.pool = this.freshPool();
    this.garden = this.freshGarden();
    this.boutique = this.freshBoutique();
    this.nextGuestId = 0;
    this.owned = [];
    this.settings = this.freshSettings();
    this.skills = {};
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      // localStorage may be unavailable; in-memory reset is still correct
    }
  }

  save(): void {
    const json = JSON.stringify({
      version: SAVE_VERSION,
      stars: this.stars,
      guests: this.guests,
      rooms: this.rooms,
      kitchen: this.kitchen,
      pool: this.pool,
      garden: this.garden,
      boutique: this.boutique,
      nextGuestId: this.nextGuestId,
      owned: this.owned,
      settings: this.settings,
      skills: this.skills,
    });

    try {
      localStorage.setItem(SAVE_KEY, json);
    } catch {
      // private browsing or a full quota — the game still plays, it just will not persist
    }

    // On Android the same bytes go to native storage as well, which survives the WebView
    // having its web data cleared. No-op in a browser.
    mirrorSave(json);
  }

  load(): void {
    let data: Record<string, unknown> | null = null;
    try {
      const raw = localStorage.getItem(SAVE_KEY);
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
    const boutique = data.boutique as BoutiqueState | undefined;
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
    // The ice counter and the boutique arrived after version 4 did; both are additive, so a
    // save without them simply starts them empty rather than costing anybody their hotel.
    this.pool = pool?.towels?.length === LOUNGER_COUNT
      ? { ...this.freshPool(), ...pool, ices: Array.isArray(pool.ices) ? pool.ices : [] }
      : this.freshPool();
    this.boutique = Array.isArray(boutique?.ready) ? { ready: boutique.ready } : this.freshBoutique();
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
    const list = <T>(v: T[] | undefined) => (Array.isArray(v) ? v : []);
    return (raw as Partial<GuestData>[])
      .filter((g): g is GuestData => !!g && typeof g.id === 'number')
      .map(g => ({
        ...g,
        plan: Array.isArray(g.plan) && g.plan.length > 0 ? g.plan : shuffled(ALL_PLACES),
        step: typeof g.step === 'number' ? g.step : 0,
        at: g.at ?? (g.checkedIn ? 'room' : 'lobby'),
        heading: g.heading ?? null,
        since: now,
        settledAt: g.settledAt === null || g.settledAt === undefined ? null : now,
        done: g.done === true,
        gaveUp: false,
        lounger: g.lounger ?? null,
        inBed: g.inBed === true,
        order: list(g.order),
        served: list(g.served),
        extras: list(g.extras),
        extrasGot: list(g.extrasGot),
        wearing: g.wearing ?? null,
      }));
  }
}

export const gameState = new GameState();
