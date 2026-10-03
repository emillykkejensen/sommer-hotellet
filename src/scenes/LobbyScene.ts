import Phaser from 'phaser';
import { COLORS, DEPTH, LINE, SIZE, text } from '../config';
import { Destination, GuestData, gameState, MAX_WAITING_GUESTS } from '../state/GameState';
import { CardAction } from '../objects/Guests';
import { paintKey } from '../objects/Icons';
import { addBackButton, addSceneTitle, addStarCounter } from '../ui/Chrome';
import { placeDecorations } from './ShopScene';
import { caption, drawPerson, plate, shadow, tappable } from '../helpers/Draw';
import { audio } from '../helpers/Audio';
import { dur, reduceMotion } from '../helpers/Motion';
import { BaseScene } from './BaseScene';

export class LobbyScene extends BaseScene {
  constructor() {
    super({ key: 'LobbyScene' });
  }

  protected buildBackground(): void {
    const { width, height } = this.scale;
    const g = this.add.graphics();

    // wall
    g.fillStyle(COLORS.cream);
    g.fillRect(0, 0, width, height * 0.74);
    g.fillStyle(COLORS.sand, 0.22);
    for (let i = 0; i < width; i += 54) {
      g.fillRect(i, 0, 26, height * 0.74);
    }

    // dado rail
    g.fillStyle(COLORS.woodLight, 0.6);
    g.fillRect(0, height * 0.52, width, 8);

    // floor
    g.fillStyle(COLORS.woodDeep);
    g.fillRect(0, height * 0.74, width, height * 0.26);
    g.fillStyle(COLORS.wood);
    for (let i = -40; i < width; i += 96) {
      g.fillRect(i + 4, height * 0.74 + 4, 88, height * 0.26);
    }

    // rug
    g.fillStyle(COLORS.red, 0.18);
    g.fillRoundedRect(width / 2 - 210, height * 0.8, 420, 74, 30);
    g.fillStyle(COLORS.sand, 0.35);
    g.fillRoundedRect(width / 2 - 196, height * 0.815, 392, 56, 24);
    g.lineStyle(2, COLORS.red, 0.28);
    g.strokeRoundedRect(width / 2 - 210, height * 0.8, 420, 74, 30);

    this.background.add(g);
    this.background.add(this.drawPottedPlant(48, height * 0.7));
    this.background.add(this.drawPottedPlant(width - 48, height * 0.7));

    // The bare upper wall was the emptiest part of the screen — three quarters of it was
    // blank wallpaper. It now carries the things a hotel lobby wall carries, laid out
    // around the key board on the right and the star counter above it.
    this.background.add(this.drawSconce(46, 168));
    this.background.add(this.drawSeaPicture(196, 192));
    this.background.add(this.drawWelcomeSign(width / 2 + 34, 176));
  }

  /** Scenery that moves under its own power, so it must stay out of the bake. */
  protected buildAmbient(): void {
    const { width } = this.scale;
    this.amb(this.drawClock(width / 2 + 184, 128));
    this.amb(this.drawCeilingFan(width / 2 - 172, 92));
    this.amb(this.drawCeilingFan(width / 2 + 120, 92));
  }

  protected buildChrome(): void {
    addBackButton(this);
    addStarCounter(this);
    addSceneTitle(this, 'Lobbyen');
  }

  /** Guests who are finished with their stay are led back here to check out. */
  protected serves(): Destination {
    return 'checkout';
  }

  protected buildDynamic(): void {
    const { width, height } = this.scale;

    this.buildKeyBoard(width - 132, height * 0.28);
    this.buildDesk(width / 2, height * 0.6);
    // sits on the desk top, not floating above it
    this.buildBell(width / 2 + 104, height * 0.588);

    placeDecorations(this, 'lobby', this.dynamic);

    gameState.lobbyGuests().forEach((guest, i) => this.buildGuest(guest, this.arrivalSlot(i)));
    gameState.guestsAt('checkout').forEach((guest, i) => this.buildGuest(guest, this.departureSlot(i)));

    this.buildHint();
  }

  private buildHint(): void {
    const { width, height } = this.scale;
    const waiting = gameState.getWaitingGuests().length;
    const ready = gameState.lobbyGuests().filter(g => g.checkedIn).length;
    const leaving = gameState.guestsAt('checkout').length;
    const free = gameState.hasFreeRoom();

    let message: string;
    if (leaving > 0) {
      message = leaving === 1
        ? 'En gæst vil tjekke ud — tryk på dem'
        : `${leaving} gæster vil tjekke ud — tryk på dem`;
    } else if (ready > 0 && waiting === 0) {
      message = 'Tryk på gæsten, og vis dem vej';
    } else if (!free && waiting > 0) {
      message = 'Alle værelser er optaget — en gæst skal tjekke ud først';
    } else if (waiting === 0 && ready === 0) {
      message = 'Tryk på klokken for at kalde en gæst';
    } else if (gameState.lobbyGuests().length >= MAX_WAITING_GUESTS) {
      message = 'Der er fuldt ved skranken — hjælp gæsterne først';
    } else {
      message = 'Tryk på en gæst for at tjekke dem ind';
    }

    this.dyn(caption(this, width / 2, height - 22, message));
  }

  private buildDesk(cx: number, cy: number): void {
    const g = this.add.graphics();

    shadow(g, cx - 165, cy - 6, 330, 76, 10, 4, 0.16);

    g.fillStyle(COLORS.wood);
    g.fillRoundedRect(cx - 165, cy, 330, 70, { tl: 10, tr: 10, bl: 0, br: 0 });
    g.fillStyle(COLORS.woodDeep, 0.35);
    for (let i = 0; i < 5; i++) {
      g.fillRect(cx - 145 + i * 66, cy + 14, 3, 48);
    }
    g.fillStyle(COLORS.woodLight);
    g.fillRoundedRect(cx - 173, cy - 10, 346, 14, 7);

    const sign = this.add.graphics();
    sign.fillStyle(COLORS.white);
    sign.fillRoundedRect(cx - 68, cy + 18, 136, 32, 9);
    sign.lineStyle(2, COLORS.sandDeep, 0.6);
    sign.strokeRoundedRect(cx - 68, cy + 18, 136, 32, 9);

    this.dyn(this.add.container(0, 0, [g, sign]));
    this.dyn(this.add.text(cx, cy + 34, 'RECEPTION', text(SIZE.label, '#A57A51', 'bold')).setOrigin(0.5));

    // ledger on the desk
    const book = this.add.graphics();
    book.fillStyle(COLORS.wallDeep);
    book.fillRoundedRect(cx - 148, cy - 6, 62, 16, 3);
    book.fillStyle(COLORS.white);
    book.fillRoundedRect(cx - 145, cy - 11, 56, 14, 2);
    book.lineStyle(1, COLORS.stoneDeep, 0.5);
    book.lineBetween(cx - 117, cy - 10, cx - 117, cy + 2);
    this.dyn(book);
  }

  private buildKeyBoard(cx: number, cy: number): void {
    const rooms = gameState.roomCount;
    // the board grows with the hotel rather than assuming three hooks
    const halfW = 30 + rooms * 18;
    const g = this.add.graphics();

    shadow(g, cx - halfW, cy - 50, halfW * 2, 104, 10, 3, 0.16);
    g.fillStyle(COLORS.woodDeep);
    g.fillRoundedRect(cx - halfW, cy - 50, halfW * 2, 104, 10);
    g.fillStyle(COLORS.wood);
    g.fillRoundedRect(cx - halfW + 5, cy - 45, halfW * 2 - 10, 94, 8);

    const c = this.add.container(0, 0, [g]);

    for (let i = 0; i < rooms; i++) {
      const kx = cx + (i - (rooms - 1) / 2) * 36;
      const ky = cy - 12;

      const hook = this.add.graphics();
      hook.fillStyle(COLORS.stoneDeep);
      hook.fillCircle(kx, ky - 14, 3.5);
      c.add(hook);

      if (gameState.rooms[i].guestId === null) {
        const key = this.add.graphics();
        key.fillStyle(COLORS.sunDeep);
        key.fillCircle(kx, ky + 2, 10);
        key.fillStyle(COLORS.sun);
        key.fillCircle(kx, ky + 1, 8.5);
        key.fillStyle(COLORS.sunDeep);
        key.fillRect(kx - 2, ky + 9, 4, 14);
        key.fillRect(kx - 2, ky + 19, 7, 3);
        c.add(key);
        c.add(this.add.text(kx, ky + 1, `${i + 1}`, text(SIZE.tiny, '#A57A51', 'bold')).setOrigin(0.5));
      } else {
        const empty = this.add.graphics();
        empty.lineStyle(1.5, COLORS.woodDeep, 0.5);
        empty.strokeCircle(kx, ky + 2, 10);
        c.add(empty);
      }
    }

    c.add(this.add.text(cx, cy + 38, 'Nøgler', text(SIZE.tiny, '#FDF7EA', 'bold')).setOrigin(0.5));
    this.dyn(c);
  }

  private buildBell(x: number, y: number): void {
    const c = this.add.container(x, y);

    const g = this.add.graphics();
    shadow(g, -23, 7, 46, 11, 6, 2, 0.18);
    g.fillStyle(COLORS.stone);
    g.fillRoundedRect(-22, 5, 44, 9, 4.5);
    g.fillStyle(COLORS.sunDeep);
    g.fillCircle(0, -7, 20);
    g.fillStyle(COLORS.sun);
    g.fillCircle(-1, -9, 17.5);
    g.fillStyle(COLORS.white, 0.5);
    g.fillEllipse(-7, -16, 10, 7);
    g.fillStyle(COLORS.sunDeep);
    g.fillCircle(0, -28, 5);
    c.add(g);

    const full = gameState.lobbyGuests().length >= MAX_WAITING_GUESTS;
    c.add(caption(this, 0, -52, full ? 'Klokken hviler' : 'Ring på klokken', full ? 'done' : 'idle'));
    this.dyn(c);

    if (full) return;

    tappable(this, c, 62, 52, () => {
      audio.bell();
      this.tweens.add({
        targets: c,
        angle: { from: -9, to: 9 },
        duration: 70,
        yoyo: true,
        repeat: 3,
        onComplete: () => c.setAngle(0),
      });

      // ripple rings
      for (let i = 0; i < 2; i++) {
        const ring = this.add.circle(x, y - 9, 20).setStrokeStyle(2, COLORS.sunDeep, 0.8);
        this.tweens.add({
          targets: ring,
          scale: 2.2,
          alpha: 0,
          duration: 620,
          delay: i * 160,
          onComplete: () => ring.destroy(),
        });
      }

      const guest = gameState.createGuest();
      if (!guest) return;
      this.walkGuestIn(guest, gameState.lobbyGuests().length - 1);
    });
  }

  /** Arrivals queue up on the left, departures wait on the right. */
  private arrivalSlot(index: number): { x: number; y: number } {
    return { x: 118 + index * 128, y: this.scale.height * 0.72 };
  }

  private departureSlot(index: number): { x: number; y: number } {
    return { x: this.scale.width - 128 - index * 128, y: this.scale.height * 0.76 };
  }

  /** Animated arrival, then the same interactive figure the refresh would have drawn. */
  private walkGuestIn(guest: GuestData, index: number): void {
    const slot = this.arrivalSlot(index);
    const person = drawPerson(this, -60, slot.y, guest.color, 1.25);
    this.dyn(person);

    this.tweens.add({
      targets: person,
      x: slot.x,
      duration: 780,
      ease: 'Sine.easeOut',
      onComplete: () => this.refresh(),
    });
  }

  /** A guest at the desk: what they want floats over their head; tap them to talk. */
  private buildGuest(guest: GuestData, slot: { x: number; y: number }): void {
    const c = this.add.container(slot.x, slot.y);
    c.add(drawPerson(this, 0, 0, guest.color, 1.25));
    c.add(caption(this, 0, 58, guest.name));
    this.addGuest(guest, c, { w: 80, h: 108, thoughtY: -52, barY: 80 });
  }

  /** The key leaves its hook and flies to the guest who has just been given it. */
  protected animateDelivery(_guest: GuestData, action: CardAction, spot: { x: number; y: number }): void {
    if (action.kind !== 'checkin' || reduceMotion()) return;
    const { width, height } = this.scale;
    const key = this.add.graphics().setPosition(width - 132, height * 0.28).setDepth(DEPTH.effects);
    paintKey(key, 1.4);
    this.tweens.add({
      targets: key,
      x: spot.x,
      y: spot.y - 10,
      angle: 360,
      duration: dur(520),
      ease: 'Cubic.easeInOut',
      onComplete: () => key.destroy(),
    });
  }

  // ---------- wall furniture ----------

  /** A framed seascape. The lobby wall needed something on it at eye height. */
  private drawSeaPicture(x: number, y: number): Phaser.GameObjects.Container {
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    const w = 138;
    const h = 100;

    shadow(g, -w / 2, -h / 2, w, h, 6, 4, 0.2);
    g.fillStyle(COLORS.woodDeep);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 6);
    g.fillStyle(COLORS.wood);
    g.fillRoundedRect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8, 4);

    const iw = w - 22;
    const ih = h - 22;
    g.fillStyle(COLORS.skyLight);
    g.fillRect(-iw / 2, -ih / 2, iw, ih * 0.52);
    g.fillStyle(COLORS.water);
    g.fillRect(-iw / 2, -ih / 2 + ih * 0.52, iw, ih * 0.3);
    g.fillStyle(COLORS.sand);
    g.fillRect(-iw / 2, -ih / 2 + ih * 0.82, iw, ih * 0.18);
    g.fillStyle(COLORS.sun);
    g.fillCircle(iw / 2 - 20, -ih / 2 + 17, 10);
    g.fillStyle(COLORS.white, 0.7);
    [0.6, 0.72].forEach(f => {
      g.fillEllipse(-iw / 4, -ih / 2 + ih * f, iw * 0.5, 4);
      g.fillEllipse(iw / 5, -ih / 2 + ih * (f + 0.06), iw * 0.4, 3.5);
    });
    g.fillStyle(COLORS.roof);
    g.fillTriangle(-6, -ih / 2 + ih * 0.86, 13, -ih / 2 + ih * 0.86, 4, -ih / 2 + ih * 0.7);

    g.lineStyle(LINE.base, COLORS.outline, 0.85);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, 6);
    g.strokeRect(-iw / 2, -ih / 2, iw, ih);

    c.add(g);
    return c;
  }

  /** "Velkommen" on a hanging board, so the room greets you in its own language. */
  private drawWelcomeSign(x: number, y: number): Phaser.GameObjects.Container {
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    const w = 166;
    const h = 54;

    g.lineStyle(LINE.thin, COLORS.outline, 0.7);
    g.lineBetween(-w / 2 + 20, -h / 2, -w / 2 + 32, -h / 2 - 18);
    g.lineBetween(w / 2 - 20, -h / 2, w / 2 - 32, -h / 2 - 18);

    shadow(g, -w / 2, -h / 2, w, h, 12, 4, 0.2);
    plate(g, -w / 2, -h / 2, w, h, 12, COLORS.teal, 1, LINE.thick);
    g.fillStyle(COLORS.white, 0.24);
    g.fillRoundedRect(-w / 2 + 5, -h / 2 + 5, w - 10, h * 0.38, 9);

    c.add(g);
    const t = this.add.text(0, 0, 'Velkommen', text(SIZE.heading, '#FFFFFF', 'bold')).setOrigin(0.5);
    t.setShadow(0, 2, 'rgba(74,58,44,0.5)', 0, false, true);
    c.add(t);
    return c;
  }

  /** Wall light. It does more for the room than any amount of wallpaper. */
  private drawSconce(x: number, y: number): Phaser.GameObjects.Container {
    const c = this.add.container(x, y);
    const g = this.add.graphics();

    // the pool of light on the wall, above and below the shade
    g.fillStyle(COLORS.sun, 0.16);
    g.fillTriangle(-28, -44, 28, -44, 0, -4);
    g.fillTriangle(-24, 42, 24, 42, 0, 2);

    g.lineStyle(3, COLORS.woodDeep);
    g.lineBetween(0, -2, 0, 10);
    g.fillStyle(COLORS.sunDeep);
    g.fillTriangle(-18, -2, 18, -2, 11, -23);
    g.fillStyle(COLORS.sun);
    g.fillTriangle(-16, -3, 16, -3, 10, -21);
    g.lineStyle(LINE.thin, COLORS.outline, 0.85);
    g.strokePoints([
      new Phaser.Geom.Point(-18, -2),
      new Phaser.Geom.Point(-11, -23),
      new Phaser.Geom.Point(11, -23),
      new Phaser.Geom.Point(18, -2),
    ], true, true);
    g.fillStyle(COLORS.woodDeep);
    g.fillRoundedRect(-7, 8, 14, 7, 3);
    g.lineStyle(LINE.hair, COLORS.outline, 0.85);
    g.strokeRoundedRect(-7, 8, 14, 7, 3);

    c.add(g);
    return c;
  }

  /** Wall clock with a hand that actually sweeps. */
  private drawClock(x: number, y: number): Phaser.GameObjects.Container {
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    const r = 28;

    g.fillStyle(COLORS.shadow, 0.18);
    g.fillCircle(1, 3, r);
    g.fillStyle(COLORS.woodDeep);
    g.fillCircle(0, 0, r);
    g.fillStyle(COLORS.cream);
    g.fillCircle(0, 0, r - 5);
    g.lineStyle(LINE.base, COLORS.outline, 0.9);
    g.strokeCircle(0, 0, r);
    g.strokeCircle(0, 0, r - 5);

    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.fillStyle(COLORS.outline, i % 3 === 0 ? 0.8 : 0.4);
      g.fillCircle(Math.cos(a) * (r - 10), Math.sin(a) * (r - 10), i % 3 === 0 ? 2 : 1.3);
    }

    // hour hand is fixed; the long hand is the one that moves
    g.lineStyle(3, COLORS.outline, 0.8);
    g.lineBetween(0, 0, 8, -8);
    c.add(g);

    const hand = this.add.graphics();
    hand.lineStyle(2.2, COLORS.red, 0.95);
    hand.lineBetween(0, 4, 0, -19);
    hand.fillStyle(COLORS.outline);
    hand.fillCircle(0, 0, 2.6);
    c.add(hand);

    if (!reduceMotion()) {
      this.tweens.add({ targets: hand, angle: 360, duration: 60000, repeat: -1, ease: 'Linear' });
    }
    return c;
  }

  /** Ceiling fan. One rotating object does more for a still room than ten static props. */
  private drawCeilingFan(x: number, y: number): Phaser.GameObjects.Container {
    const c = this.add.container(x, y);

    const rod = this.add.graphics();
    rod.lineStyle(4, COLORS.stoneDeep);
    rod.lineBetween(0, -y, 0, 0);
    rod.fillStyle(COLORS.stoneDeep);
    rod.fillCircle(0, 0, 7);
    rod.lineStyle(LINE.hair, COLORS.outline, 0.8);
    rod.strokeCircle(0, 0, 7);
    c.add(rod);

    const blades = this.add.graphics();
    // Seen from below and slightly to the side, so the blades are flattened ellipses.
    for (let i = 0; i < 4; i++) {
      blades.save();
      blades.rotateCanvas((i / 4) * Math.PI * 2);
      blades.fillStyle(COLORS.wood);
      blades.fillEllipse(28, 0, 50, 12);
      blades.lineStyle(LINE.hair, COLORS.outline, 0.7);
      blades.strokeEllipse(28, 0, 50, 12);
      blades.restore();
    }
    c.add(blades);

    if (!reduceMotion()) {
      // Slow: a fast fan on a 2D scene reads as a strobe.
      this.tweens.add({ targets: blades, angle: 360, duration: 5200, repeat: -1, ease: 'Linear' });
      this.tweens.add({
        targets: blades, scaleY: 0.86, duration: 2600,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }
    return c;
  }

  private drawPottedPlant(x: number, y: number): Phaser.GameObjects.Container {
    const c = this.add.container(x, y);
    const g = this.add.graphics();

    shadow(g, -24, 32, 48, 12, 6, 3, 0.14);
    g.fillStyle(COLORS.roofDeep);
    g.fillRoundedRect(-22, 6, 44, 38, { tl: 4, tr: 4, bl: 12, br: 12 });
    g.fillStyle(COLORS.roof);
    g.fillRoundedRect(-24, 2, 48, 12, 5);

    g.fillStyle(COLORS.grassDeep);
    g.fillEllipse(-14, -14, 22, 44);
    g.fillEllipse(14, -12, 22, 40);
    g.fillStyle(COLORS.grass);
    g.fillEllipse(0, -26, 24, 52);
    g.fillEllipse(-9, -8, 18, 34);

    c.add(g);
    return c;
  }
}
