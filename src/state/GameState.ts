export interface GuestData {
  id: number;
  name: string;
  color: number;
  roomNumber: number | null;
  mood: 'glad' | 'sulten' | 'søvnig' | 'neutral';
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
  currentDish: string | null;
  dishesServed: number;
}

const GUEST_NAMES = [
  'Hr. Jensen', 'Fru Hansen', 'Familien Pedersen', 'Fru Larsen',
  'Hr. & Fru Nielsen', 'Lille Sofia', 'Familien Sørensen', 'Hr. Andersen',
  'Fru Christensen', 'Familien Møller',
];

const GUEST_COLORS = [
  0xFF6B6B, 0x6BCB77, 0x4D96FF, 0xFFD93D,
  0xFF8E71, 0xC06BFF, 0xFF6BB5, 0x6BFFE0,
  0xFFB86B, 0x6B9FFF,
];

class GameState {
  stars: number = 0;
  guests: GuestData[] = [];
  rooms: RoomState[] = [];
  kitchen: KitchenState = { currentDish: null, dishesServed: 0 };
  poolTowelsLaid: number = 0;
  flowersWatered: number = 0;
  nextGuestId: number = 0;

  constructor() {
    this.rooms = [
      this.createFreshRoom(),
      this.createFreshRoom(),
      this.createFreshRoom(),
    ];
    this.load();
  }

  private createFreshRoom(): RoomState {
    return {
      bedMade: false,
      curtainsOpen: false,
      flowersPlaced: false,
      vacuumed: false,
      towelsFolded: false,
      guestId: null,
    };
  }

  addStars(count: number): void {
    this.stars += count;
    this.save();
  }

  createGuest(): GuestData {
    const id = this.nextGuestId++;
    const guest: GuestData = {
      id,
      name: GUEST_NAMES[id % GUEST_NAMES.length],
      color: GUEST_COLORS[id % GUEST_COLORS.length],
      roomNumber: null,
      mood: 'neutral',
      checkedIn: false,
    };
    this.guests.push(guest);
    this.save();
    return guest;
  }

  checkInGuest(guestId: number): number | null {
    const guest = this.guests.find(g => g.id === guestId);
    if (!guest) return null;

    const freeRoom = this.rooms.findIndex(r => r.guestId === null);
    if (freeRoom === -1) return null;

    guest.checkedIn = true;
    guest.roomNumber = freeRoom;
    guest.mood = 'glad';
    this.rooms[freeRoom].guestId = guestId;
    this.save();
    return freeRoom;
  }

  checkOutGuest(roomNumber: number): void {
    const room = this.rooms[roomNumber];
    if (room.guestId !== null) {
      this.guests = this.guests.filter(g => g.id !== room.guestId);
      room.guestId = null;
      // Reset room
      room.bedMade = false;
      room.curtainsOpen = false;
      room.flowersPlaced = false;
      room.vacuumed = false;
      room.towelsFolded = false;
      this.save();
    }
  }

  isRoomClean(roomIndex: number): boolean {
    const r = this.rooms[roomIndex];
    return r.bedMade && r.curtainsOpen && r.flowersPlaced && r.vacuumed && r.towelsFolded;
  }

  getCheckedInGuests(): GuestData[] {
    return this.guests.filter(g => g.checkedIn);
  }

  getWaitingGuests(): GuestData[] {
    return this.guests.filter(g => !g.checkedIn);
  }

  save(): void {
    try {
      const data = {
        stars: this.stars,
        guests: this.guests,
        rooms: this.rooms,
        kitchen: this.kitchen,
        poolTowelsLaid: this.poolTowelsLaid,
        flowersWatered: this.flowersWatered,
        nextGuestId: this.nextGuestId,
      };
      localStorage.setItem('sommer-hotellet-save', JSON.stringify(data));
    } catch {
      // localStorage might not be available
    }
  }

  load(): void {
    try {
      const saved = localStorage.getItem('sommer-hotellet-save');
      if (saved) {
        const data = JSON.parse(saved);
        this.stars = data.stars ?? 0;
        this.guests = data.guests ?? [];
        this.rooms = data.rooms ?? [this.createFreshRoom(), this.createFreshRoom(), this.createFreshRoom()];
        this.kitchen = data.kitchen ?? { currentDish: null, dishesServed: 0 };
        this.poolTowelsLaid = data.poolTowelsLaid ?? 0;
        this.flowersWatered = data.flowersWatered ?? 0;
        this.nextGuestId = data.nextGuestId ?? 0;
      }
    } catch {
      // Start fresh
    }
  }
}

export const gameState = new GameState();
