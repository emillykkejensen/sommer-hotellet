import Phaser from 'phaser';
import { COLORS, LINE, SIZE, text } from '../config';
import { GuestData, gameState, MAX_WAITING_GUESTS, ROOM_COUNT } from '../state/GameState';
import { showConfetti, showHearts, showPraise, showStarBurst, showToast } from '../objects/FeedbackEffects';
import { addBackButton, addSceneTitle, addSoundToggle, addStarCounter, award } from '../ui/Chrome';
import { caption, drawPalm, drawPerson, plate, shade, shadow, tappable } from '../helpers/Draw';
import { bob, pulse, reduceMotion } from '../helpers/Motion';
import { sfx } from '../helpers/AudioManager';
import { BaseScene } from './BaseScene';

export class LobbyScene extends BaseScene {
  constructor() {
    super({ key: 'LobbyScene' });
  }

  protected buildBackground(): void {
    const { width, height } = this.scale;
    const g = this.add.graphics();
    const railY = height * 0.5;
    const floorY = height * 0.74;

    // wall — striped paper above the rail, panelled wainscot below it
    g.fillStyle(COLORS.cream);
    g.fillRect(0, 0, width, floorY);
    g.fillStyle(COLORS.sand, 0.26);
    for (let i = 0; i < width; i += 54) {
      g.fillRect(i, 0, 26, railY);
    }

    g.fillStyle(COLORS.wallDeep);
    g.fillRect(0, railY + 8, width, floorY - railY - 8);
    // Shallow panelling: a highlight and a shade line per panel rather than a full
    // outline, which read as a row of empty picture frames.
    for (let i = 20; i < width; i += 92) {
      g.fillStyle(COLORS.white, 0.35);
      g.fillRect(i, railY + 24, 64, 2);
      g.fillRect(i, railY + 24, 2, floorY - railY - 48);
      g.fillStyle(COLORS.woodDeep, 0.16);
      g.fillRect(i, floorY - 26, 64, 2);
      g.fillRect(i + 62, railY + 24, 2, floorY - railY - 48);
    }

    // dado rail
    g.fillStyle(COLORS.woodLight);
    g.fillRect(0, railY, width, 10);
    g.fillStyle(COLORS.woodDeep, 0.5);
    g.fillRect(0, railY + 8, width, 3);
    g.lineStyle(LINE.hair, COLORS.outline, 0.45);
    g.lineBetween(0, railY, width, railY);
    g.lineBetween(0, railY + 10, width, railY + 10);

    // floor
    g.fillStyle(COLORS.woodDeep);
    g.fillRect(0, floorY, width, height - floorY);
    g.fillStyle(COLORS.wood);
    for (let i = -40; i < width; i += 96) {
      g.fillRect(i + 4, floorY + 4, 88, height - floorY);
    }
    g.lineStyle(LINE.thin, COLORS.outline, 0.4);
    g.lineBetween(0, floorY, width, floorY);

    // Rug. Opaque, so it reads as a rug lying on the boards rather than as a stain on
    // them — the old translucent red over wood came out muddy brown.
    const rugY = height * 0.845;
    g.fillStyle(COLORS.shadow, 0.12);
    g.fillRoundedRect(width / 2 - 228, rugY + 5, 460, 82, 34);
    g.fillStyle(COLORS.roof);
    g.fillRoundedRect(width / 2 - 230, rugY, 460, 82, 34);
    g.fillStyle(COLORS.cream);
    g.fillRoundedRect(width / 2 - 222, rugY + 8, 444, 66, 30);
    g.fillStyle(COLORS.sand, 0.75);
    g.fillRoundedRect(width / 2 - 206, rugY + 20, 412, 42, 20);
    // A row of small diamonds. Circles in a contrasting colour read as a running track.
    g.fillStyle(COLORS.roof, 0.35);
    for (let i = 0; i < 8; i++) {
      const dx = width / 2 - 154 + i * 44;
      g.fillTriangle(dx - 7, rugY + 41, dx + 7, rugY + 41, dx, rugY + 30);
      g.fillTriangle(dx - 7, rugY + 41, dx + 7, rugY + 41, dx, rugY + 52);
    }
    g.lineStyle(LINE.thin, COLORS.outline, 0.55);
    g.strokeRoundedRect(width / 2 - 230, rugY, 460, 82, 34);
    g.strokeRoundedRect(width / 2 - 214, rugY + 13, 428, 56, 26);

    this.bg(g);

    // The bare upper wall was the emptiest part of the old build — three quarters of the
    // screen was blank wallpaper. It now carries the things a hotel lobby wall carries.
    // Laid out around the two fixed obstacles: the key board on the right of the wall,
    // and the star counter in the top-right corner.
    this.bg(this.drawSconce(64, 186));
    this.bg(this.drawSeaPicture(228, 212));
    this.bg(this.drawWelcomeSign(560, 200));
    this.bg(this.drawSconce(width - 42, 186));
    this.bg(drawPalm(this, 62, height * 0.79, 1.05));
    this.bg(drawPalm(this, width - 54, height * 0.8, 1.15));
    this.bg(this.drawTrolley(width - 176, height * 0.84));
  }

  protected buildAmbient(): void {
    const { width } = this.scale;
    this.amb(this.drawClock(width / 2, 142));
    this.amb(this.drawCeilingFan(300, 86));
    this.amb(this.drawCeilingFan(660, 86));
  }

  protected buildChrome(): void {
    addBackButton(this);
    addStarCounter(this);
    addSoundToggle(this);
    addSceneTitle(this, 'Lobbyen', COLORS.orange);
  }

  protected buildDynamic(): void {
    const { width, height } = this.scale;

    this.buildKeyBoard(width - 150, height * 0.3);
    // The desk used to sit at 0.62, which put its whole base above the floor line — it
    // read as a counter hung on the wall. It now stands on the floorboards.
    this.buildDesk(width / 2, height * 0.7);
    // sits on the desk top, not floating above it
    this.buildBell(width / 2 + 108, height * 0.665);

    gameState.getWaitingGuests().forEach((guest, i) => this.buildGuest(guest, i, false));

    this.buildHint();
  }

  private buildHint(): void {
    const { width, height } = this.scale;
    const waiting = gameState.getWaitingGuests().length;
    const free = gameState.hasFreeRoom();

    let message: string;
    if (!free && waiting > 0) {
      // The old build silently did nothing here, which reads as a broken game.
      message = 'Alle værelser er fyldt — tjek en gæst ud under Værelser';
    } else if (waiting === 0) {
      message = 'Tryk på klokken for at kalde en gæst';
    } else if (waiting >= MAX_WAITING_GUESTS) {
      message = 'Der venter tre gæster — tryk på en for at give dem et værelse';
    } else {
      message = 'Tryk på en gæst for at tjekke dem ind';
    }

    this.dyn(caption(this, width / 2, height - 26, message));
  }

  private buildDesk(cx: number, cy: number): void {
    const g = this.add.graphics();

    shadow(g, cx - 172, cy - 6, 344, 80, 10, 5, 0.2);

    // carcass
    g.fillStyle(COLORS.wood);
    g.fillRoundedRect(cx - 170, cy, 340, 74, { tl: 10, tr: 10, bl: 0, br: 0 });
    g.fillStyle(COLORS.woodDeep, 0.28);
    g.fillRect(cx - 170, cy + 52, 340, 22);
    g.lineStyle(LINE.base, COLORS.outline, 0.85);
    g.strokeRoundedRect(cx - 170, cy, 340, 74, { tl: 10, tr: 10, bl: 0, br: 0 });

    // front panels
    g.lineStyle(LINE.hair, COLORS.outline, 0.35);
    for (let i = 0; i < 4; i++) {
      g.strokeRoundedRect(cx - 152 + i * 78, cy + 12, 62, 38, 5);
    }

    // counter top, overhanging on both sides
    g.fillStyle(COLORS.woodLight);
    g.fillRoundedRect(cx - 180, cy - 12, 360, 16, 8);
    g.fillStyle(COLORS.white, 0.25);
    g.fillRoundedRect(cx - 176, cy - 10, 352, 5, 2.5);
    g.lineStyle(LINE.base, COLORS.outline, 0.85);
    g.strokeRoundedRect(cx - 180, cy - 12, 360, 16, 8);

    this.dyn(g);

    // RECEPTION sign, hung on the front of the desk
    const sign = this.add.graphics();
    plate(sign, cx - 64, cy + 20, 128, 32, 9, COLORS.cream, 1, LINE.base);
    this.dyn(sign);
    this.dyn(this.add.text(cx, cy + 36, 'RECEPTION', text(SIZE.label, '#A0764B', 'bold')).setOrigin(0.5));

    // ledger, open on the counter
    const book = this.add.graphics();
    book.fillStyle(COLORS.wallDeep);
    book.fillRoundedRect(cx - 152, cy - 10, 62, 16, 3);
    book.fillStyle(COLORS.white);
    book.fillRoundedRect(cx - 149, cy - 15, 56, 14, 2);
    book.lineStyle(LINE.hair, COLORS.outline, 0.7);
    book.strokeRoundedRect(cx - 149, cy - 15, 56, 14, 2);
    book.lineBetween(cx - 121, cy - 14, cx - 121, cy - 2);
    book.lineStyle(1, COLORS.stoneDeep, 0.6);
    [-11, -7].forEach(dy => {
      book.lineBetween(cx - 144, cy + dy, cx - 126, cy + dy);
      book.lineBetween(cx - 116, cy + dy, cx - 98, cy + dy);
    });
    this.dyn(book);

    // a small vase, so the counter is not two objects on a plank
    const vase = this.add.graphics().setPosition(cx - 40, cy - 12);
    vase.fillStyle(COLORS.teal);
    vase.fillRoundedRect(-8, -14, 16, 18, { tl: 3, tr: 3, bl: 7, br: 7 });
    vase.lineStyle(LINE.hair, COLORS.outline, 0.8);
    vase.strokeRoundedRect(-8, -14, 16, 18, { tl: 3, tr: 3, bl: 7, br: 7 });
    [[-6, -24], [0, -28], [6, -23]].forEach(([px, py], i) => {
      vase.lineStyle(1.8, COLORS.grassDeep, 0.9);
      vase.lineBetween(0, -14, px, py);
      vase.fillStyle([COLORS.pink, COLORS.sun, COLORS.white][i]);
      vase.fillCircle(px, py, 4.5);
      vase.lineStyle(1.2, COLORS.outline, 0.6);
      vase.strokeCircle(px, py, 4.5);
    });
    this.dyn(vase);
  }

  private buildKeyBoard(cx: number, cy: number): void {
    const g = this.add.graphics();

    shadow(g, cx - 62, cy - 48, 124, 100, 12, 4, 0.2);
    g.fillStyle(COLORS.woodDeep);
    g.fillRoundedRect(cx - 62, cy - 48, 124, 100, 12);
    g.fillStyle(COLORS.wood);
    g.fillRoundedRect(cx - 56, cy - 42, 112, 88, 9);
    g.lineStyle(LINE.base, COLORS.outline, 0.85);
    g.strokeRoundedRect(cx - 62, cy - 48, 124, 100, 12);

    const c = this.add.container(0, 0, [g]);

    for (let i = 0; i < ROOM_COUNT; i++) {
      const kx = cx - 33 + i * 33;
      const ky = cy - 12;

      const hook = this.add.graphics();
      hook.fillStyle(COLORS.stoneDeep);
      hook.fillCircle(kx, ky - 13, 3.5);
      hook.lineStyle(1.2, COLORS.outline, 0.7);
      hook.strokeCircle(kx, ky - 13, 3.5);
      c.add(hook);

      if (gameState.rooms[i].guestId === null) {
        const key = this.add.graphics();
        key.lineStyle(1.5, COLORS.outline, 0.5);
        key.lineBetween(kx, ky - 13, kx, ky - 6);
        key.fillStyle(COLORS.sunDeep);
        key.fillCircle(kx, ky + 2, 8.5);
        key.fillStyle(COLORS.sun);
        key.fillCircle(kx, ky + 1, 7);
        key.fillStyle(COLORS.sunDeep);
        key.fillRect(kx - 1.5, ky + 8, 3, 12);
        key.fillRect(kx - 1.5, ky + 16, 6, 2.5);
        key.lineStyle(LINE.hair, COLORS.outline, 0.85);
        key.strokeCircle(kx, ky + 1, 7.5);
        c.add(key);
        c.add(this.add.text(kx, ky + 1, `${i + 1}`, text(SIZE.tiny, '#A0764B', 'bold')).setOrigin(0.5));
      } else {
        const empty = this.add.graphics();
        empty.lineStyle(LINE.thin, COLORS.woodDeep, 0.7);
        empty.strokeCircle(kx, ky + 2, 8);
        c.add(empty);
      }
    }

    const label = this.add.graphics();
    plate(label, cx - 34, cy + 24, 68, 20, 10, COLORS.cream, 0.95, LINE.hair);
    c.add(label);
    c.add(this.add.text(cx, cy + 34, 'Nøgler', text(SIZE.tiny, '#5A4E42', 'bold')).setOrigin(0.5));
    this.dyn(c);
  }

  private buildBell(x: number, y: number): void {
    const c = this.add.container(x, y);

    const g = this.add.graphics();
    shadow(g, -21, 6, 42, 10, 5, 2, 0.2);
    g.fillStyle(COLORS.stone);
    g.fillRoundedRect(-20, 4, 40, 9, 4.5);
    g.lineStyle(LINE.hair, COLORS.outline, 0.85);
    g.strokeRoundedRect(-20, 4, 40, 9, 4.5);
    g.fillStyle(COLORS.sunDeep);
    g.fillCircle(0, -6, 18);
    g.fillStyle(COLORS.sun);
    g.fillCircle(-1, -8, 15.5);
    g.fillStyle(COLORS.white, 0.6);
    g.fillEllipse(-6, -15, 10, 6);
    g.lineStyle(LINE.base, COLORS.outline, 0.9);
    g.strokeCircle(0, -6, 18);
    g.fillStyle(COLORS.sunDeep);
    g.fillCircle(0, -25, 5);
    g.lineStyle(LINE.hair, COLORS.outline, 0.85);
    g.strokeCircle(0, -25, 5);
    c.add(g);

    const full = gameState.getWaitingGuests().length >= MAX_WAITING_GUESTS;
    c.add(caption(this, 0, -48, full ? 'Klokken hviler' : 'Ring på klokken', full ? 'done' : 'idle'));
    this.dyn(c);

    if (full) return;

    // The bell is the one thing on this screen that starts the loop, so it is the one
    // thing allowed to ask for attention.
    if (gameState.getWaitingGuests().length === 0) pulse(this, c, 1.07);

    tappable(this, c, 58, 50, () => {
      sfx('bell');
      if (!reduceMotion()) {
        this.tweens.add({
          targets: c,
          angle: { from: -9, to: 9 },
          duration: 70,
          yoyo: true,
          repeat: 3,
          onComplete: () => c.setAngle(0),
        });
      }

      // ripple rings
      for (let i = 0; i < 2; i++) {
        const ring = this.add.circle(x, y - 8, 18).setStrokeStyle(2.5, COLORS.sunDeep, 0.85);
        this.tweens.add({
          targets: ring,
          scale: 2.4,
          alpha: 0,
          duration: 640,
          delay: i * 160,
          onComplete: () => ring.destroy(),
        });
      }

      const guest = gameState.createGuest();
      if (!guest) return;
      this.walkGuestIn(guest, gameState.getWaitingGuests().length - 1);
    }, 'bell');
  }

  /** Guests stand on the floorboards rather than floating against the wall. */
  private guestSlot(index: number): { x: number; y: number } {
    return { x: 150 + index * 108, y: this.scale.height * 0.76 };
  }

  /** Animated arrival, then the same interactive figure the refresh would have drawn. */
  private walkGuestIn(guest: GuestData, index: number): void {
    const slot = this.guestSlot(index);
    const person = drawPerson(this, -60, slot.y, guest.color, 1.15);
    this.dyn(person);

    // A little bounce per step, so they walk in rather than slide in.
    if (!reduceMotion()) {
      this.tweens.add({
        targets: person,
        y: slot.y - 7,
        duration: 190,
        yoyo: true,
        repeat: 3,
        ease: 'Sine.easeInOut',
      });
    }

    this.tweens.add({
      targets: person,
      x: slot.x,
      duration: 780,
      ease: 'Sine.easeOut',
      onComplete: () => {
        person.setY(slot.y);
        showToast(this, slot.x, slot.y - 62, 'Hej!');
        this.refresh();
      },
    });
  }

  private buildGuest(guest: GuestData, index: number, _animated: boolean): void {
    const slot = this.guestSlot(index);
    const c = this.add.container(slot.x, slot.y);

    c.add(drawPerson(this, 0, 0, guest.color, 1.15));
    c.add(caption(this, 0, 58, guest.name));
    this.dyn(c);

    // Waiting guests shift their weight — nobody stands perfectly still.
    bob(this, c, 3, 1800 + index * 240, index * 300);

    tappable(this, c, 74, 100, () => {
      const room = gameState.checkInGuest(guest.id);

      if (room === null) {
        showToast(this, slot.x, slot.y - 64, 'Alle rum er fyldt', '#B55345');
        return;
      }

      award(this, 1, slot.x, slot.y - 30);
      showStarBurst(this, slot.x, slot.y - 30);
      showHearts(this, slot.x, slot.y - 46);
      showToast(this, slot.x, slot.y - 66, `Værelse ${room + 1}`, '#4A7F33');
      sfx('success');

      if (!gameState.hasFreeRoom()) {
        // The hotel is full: every room has somebody in it, which is worth a moment.
        showConfetti(this, this.scale.width / 2, this.scale.height * 0.3, 30);
        showPraise(this, this.scale.width / 2, this.scale.height * 0.44, 'Hotellet er fuldt!');
      }

      // walk off to the room, then rebuild so the remaining guests close the gap
      this.tweens.add({
        targets: c,
        x: this.scale.width + 70,
        duration: 900,
        delay: 700,
        ease: 'Sine.easeIn',
        onComplete: () => this.refresh(),
      });
    });
  }

  // ---------- wall furniture ----------

  /** A framed seascape. The lobby wall needed something on it at eye height. */
  private drawSeaPicture(x: number, y: number): Phaser.GameObjects.Container {
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    const w = 148;
    const h = 106;

    shadow(g, -w / 2, -h / 2, w, h, 6, 4, 0.2);
    g.fillStyle(COLORS.woodDeep);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 6);
    g.fillStyle(COLORS.wood);
    g.fillRoundedRect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8, 4);

    // the picture itself
    const iw = w - 22;
    const ih = h - 22;
    g.fillStyle(COLORS.skyLight);
    g.fillRect(-iw / 2, -ih / 2, iw, ih * 0.52);
    g.fillStyle(COLORS.water);
    g.fillRect(-iw / 2, -ih / 2 + ih * 0.52, iw, ih * 0.3);
    g.fillStyle(COLORS.sand);
    g.fillRect(-iw / 2, -ih / 2 + ih * 0.82, iw, ih * 0.18);
    g.fillStyle(COLORS.sun);
    g.fillCircle(iw / 2 - 22, -ih / 2 + 18, 11);
    g.fillStyle(COLORS.white, 0.7);
    [0.6, 0.72].forEach(f => {
      g.fillEllipse(-iw / 4, -ih / 2 + ih * f, iw * 0.5, 4);
      g.fillEllipse(iw / 5, -ih / 2 + ih * (f + 0.06), iw * 0.4, 3.5);
    });
    g.fillStyle(COLORS.roof);
    g.fillTriangle(-6, -ih / 2 + ih * 0.86, 14, -ih / 2 + ih * 0.86, 4, -ih / 2 + ih * 0.7);

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
    const w = 176;
    const h = 58;

    g.lineStyle(LINE.thin, COLORS.outline, 0.7);
    g.lineBetween(-w / 2 + 20, -h / 2, -w / 2 + 34, -h / 2 - 20);
    g.lineBetween(w / 2 - 20, -h / 2, w / 2 - 34, -h / 2 - 20);

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

  /** Wall light. Two of these do more for the room than any amount of wallpaper. */
  private drawSconce(x: number, y: number): Phaser.GameObjects.Container {
    const c = this.add.container(x, y);
    const g = this.add.graphics();

    // the pool of light on the wall, above and below the shade
    g.fillStyle(COLORS.sun, 0.16);
    g.fillTriangle(-30, -46, 30, -46, 0, -4);
    g.fillTriangle(-26, 44, 26, 44, 0, 2);

    g.lineStyle(3, COLORS.woodDeep);
    g.lineBetween(0, -2, 0, 10);
    g.fillStyle(COLORS.sunDeep);
    g.fillTriangle(-19, -2, 19, -2, 12, -24);
    g.fillStyle(COLORS.sun);
    g.fillTriangle(-17, -3, 17, -3, 11, -22);
    g.lineStyle(LINE.thin, COLORS.outline, 0.85);
    g.strokePoints([
      new Phaser.Geom.Point(-19, -2),
      new Phaser.Geom.Point(-12, -24),
      new Phaser.Geom.Point(12, -24),
      new Phaser.Geom.Point(19, -2),
    ], true, true);
    g.fillStyle(COLORS.woodDeep);
    g.fillRoundedRect(-7, 8, 14, 7, 3);
    g.lineStyle(LINE.hair, COLORS.outline, 0.85);
    g.strokeRoundedRect(-7, 8, 14, 7, 3);

    c.add(g);
    return c;
  }

  /** Luggage trolley. Says "hotel" faster than another plant would. */
  private drawTrolley(x: number, y: number): Phaser.GameObjects.Container {
    const c = this.add.container(x, y);
    const g = this.add.graphics();

    g.fillStyle(COLORS.shadow, 0.12);
    g.fillEllipse(0, 44, 76, 12);

    // frame
    g.lineStyle(5, COLORS.stoneDeep);
    g.strokeRoundedRect(-30, -46, 60, 88, 8);
    g.lineStyle(4, COLORS.stone);
    g.lineBetween(-30, -44, 30, -44);

    // base
    g.fillStyle(COLORS.woodDeep);
    g.fillRoundedRect(-34, 30, 68, 10, 4);
    g.lineStyle(LINE.hair, COLORS.outline, 0.85);
    g.strokeRoundedRect(-34, 30, 68, 10, 4);

    // cases
    g.fillStyle(COLORS.roof);
    g.fillRoundedRect(-26, 4, 52, 26, 5);
    g.fillStyle(COLORS.roofDeep, 0.4);
    g.fillRect(-26, 14, 52, 5);
    g.lineStyle(LINE.thin, COLORS.outline, 0.85);
    g.strokeRoundedRect(-26, 4, 52, 26, 5);

    g.fillStyle(COLORS.purple);
    g.fillRoundedRect(-20, -16, 40, 21, 5);
    g.fillStyle(shade(COLORS.purple, -0.25), 0.5);
    g.fillRect(-20, -8, 40, 4);
    g.lineStyle(LINE.thin, COLORS.outline, 0.85);
    g.strokeRoundedRect(-20, -16, 40, 21, 5);

    // wheels
    [-20, 20].forEach(dx => {
      g.fillStyle(COLORS.outline, 0.75);
      g.fillCircle(dx, 42, 6);
      g.fillStyle(COLORS.stoneDeep);
      g.fillCircle(dx, 42, 3);
    });

    c.add(g);
    return c;
  }

  /** Wall clock with a hand that actually sweeps. */
  private drawClock(x: number, y: number): Phaser.GameObjects.Container {
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    const r = 30;

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
      g.fillCircle(Math.cos(a) * (r - 11), Math.sin(a) * (r - 11), i % 3 === 0 ? 2 : 1.3);
    }

    // hour hand is fixed; the long hand is the one that moves
    g.lineStyle(3, COLORS.outline, 0.8);
    g.lineBetween(0, 0, 9, -9);
    c.add(g);

    const hand = this.add.graphics();
    hand.lineStyle(2.2, COLORS.red, 0.95);
    hand.lineBetween(0, 4, 0, -20);
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
      blades.fillEllipse(30, 0, 54, 13);
      blades.lineStyle(LINE.hair, COLORS.outline, 0.7);
      blades.strokeEllipse(30, 0, 54, 13);
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
}
