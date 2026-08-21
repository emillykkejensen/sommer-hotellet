export type Chore = 'bedMade' | 'curtainsOpen' | 'flowersPlaced' | 'vacuumed' | 'towelsFolded';

export interface GuestData {
  id: number;
  name: string;
  color: number;
  roomNumber: number | null;
  checkedIn: boolean;
}

export interface RoomState {
  bedMade: boolean;
  curtainsOpen: boolean;
  flowersPlaced: boolean;
  vacuumed: boolean;
  towelsFolded: boolean;
  guestId: number | null;
}

export interface KitchenState {
  recipe: string | null;
  added: string[];
  showingDining: boolean;
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

const SAVE_KEY = 'sommer-hotellet-save';
const SAVE_VERSION = 2;

export const ROOM_COUNT = 3;
export const LOUNGER_COUNT = 4;
export const FLOWER_COUNT = 5;
export const APPLE_COUNT = 5;
export const SANDCASTLE_STAGES = 3;
export const MAX_WAITING_GUESTS = 3;

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

class GameState {
  stars = 0;
  guests: GuestData[] = [];
  rooms: RoomState[] = [];
  kitchen: KitchenState = this.freshKitchen();
  pool: PoolState = this.freshPool();
  garden: GardenState = this.freshGarden();
  nextGuestId = 0;

  constructor() {
    this.rooms = this.freshRooms();
    this.load();
  }

  // ---------- factories ----------

  private freshRooms(): RoomState[] {
    return Array.from({ length: ROOM_COUNT }, () => ({
      bedMade: false,
      curtainsOpen: false,
      flowersPlaced: false,
      vacuumed: false,
      towelsFolded: false,
      guestId: null,
    }));
  }

  private freshKitchen(): KitchenState {
    return { recipe: null, added: [], showingDining: false, dishesServed: 0 };
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
    };
    this.guests.push(guest);
    this.save();
    return guest;
  }

  checkInGuest(guestId: number): number | null {
    const guest = this.guests.find(g => g.id === guestId);
    if (!guest || guest.checkedIn) return null;

    const freeRoom = this.rooms.findIndex(r => r.guestId === null);
    if (freeRoom === -1) return null;

    guest.checkedIn = true;
    guest.roomNumber = freeRoom;
    this.rooms[freeRoom].guestId = guestId;
    this.save();
    return freeRoom;
  }

  checkOutGuest(roomNumber: number): void {
    const room = this.rooms[roomNumber];
    if (!room || room.guestId === null) return;
    this.guests = this.guests.filter(g => g.id !== room.guestId);
    room.guestId = null;
    room.bedMade = false;
    room.curtainsOpen = false;
    room.flowersPlaced = false;
    room.vacuumed = false;
    room.towelsFolded = false;
    this.save();
  }

  getCheckedInGuests(): GuestData[] {
    return this.guests.filter(g => g.checkedIn);
  }

  getWaitingGuests(): GuestData[] {
    return this.guests.filter(g => !g.checkedIn);
  }

  hasFreeRoom(): boolean {
    return this.rooms.some(r => r.guestId === null);
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

  serveDish(): void {
    this.kitchen.dishesServed++;
    this.kitchen.recipe = null;
    this.kitchen.added = [];
    this.save();
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

  // ---------- persistence ----------

  reset(): void {
    this.stars = 0;
    this.guests = [];
    this.rooms = this.freshRooms();
    this.kitchen = this.freshKitchen();
    this.pool = this.freshPool();
    this.garden = this.freshGarden();
    this.nextGuestId = 0;
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      // localStorage may be unavailable; in-memory reset is still correct
    }
  }

  save(): void {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        version: SAVE_VERSION,
        stars: this.stars,
        guests: this.guests,
        rooms: this.rooms,
        kitchen: this.kitchen,
        pool: this.pool,
        garden: this.garden,
        nextGuestId: this.nextGuestId,
      }));
    } catch {
      // private browsing or a full quota — the game still plays, it just will not persist
    }
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

    // Version 1 stored scene progress that no longer maps onto this shape. Rather than
    // half-restore it, keep the stars the child earned and start the rooms fresh.
    if (data.version !== SAVE_VERSION) {
      this.stars = typeof data.stars === 'number' ? data.stars : 0;
      this.save();
      return;
    }

    const rooms = data.rooms as RoomState[] | undefined;
    const kitchen = data.kitchen as KitchenState | undefined;
    const pool = data.pool as PoolState | undefined;
    const garden = data.garden as GardenState | undefined;

    this.stars = (data.stars as number) ?? 0;
    this.guests = (data.guests as GuestData[]) ?? [];
    this.nextGuestId = (data.nextGuestId as number) ?? 0;
    this.rooms = rooms?.length === ROOM_COUNT ? rooms : this.freshRooms();
    this.kitchen = { ...this.freshKitchen(), ...kitchen };
    this.pool = pool?.towels?.length === LOUNGER_COUNT ? pool : this.freshPool();
    this.garden = garden?.flowers?.length === FLOWER_COUNT && garden.apples?.length === APPLE_COUNT
      ? garden
      : this.freshGarden();
  }
}

export const gameState = new GameState();
