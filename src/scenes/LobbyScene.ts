import Phaser from 'phaser';
import { COLORS, SIZE, text } from '../config';
import { GuestData, gameState, MAX_WAITING_GUESTS } from '../state/GameState';
import { showHearts, showStarBurst, showToast } from '../objects/FeedbackEffects';
import { drawPatienceBar, drawSpeechBubble, guestLine, sayOnce } from '../objects/Guests';
import { addBackButton, addSceneTitle, addStarCounter, award } from '../ui/Chrome';
import { rewardFor } from '../helpers/Reward';
import { placeDecorations } from './ShopScene';
import { caption, drawPerson, shadow, tappable } from '../helpers/Draw';
import { audio } from '../helpers/Audio';
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
  }

  protected buildChrome(): void {
    addBackButton(this);
    addStarCounter(this);
    addSceneTitle(this, 'Lobbyen');
  }

  protected buildDynamic(): void {
    const { width, height } = this.scale;

    this.buildKeyBoard(width - 132, height * 0.28);
    this.buildDesk(width / 2, height * 0.6);
    // sits on the desk top, not floating above it
    this.buildBell(width / 2 + 104, height * 0.588);

    placeDecorations(this, 'lobby', this.dynamic);

    gameState.getWaitingGuests().forEach((guest, i) => this.buildArrival(guest, i));
    gameState.guestsAt('checkout').forEach((guest, i) => this.buildDeparture(guest, i));

    this.buildHint();
  }

  private buildHint(): void {
    const { width, height } = this.scale;
    const waiting = gameState.getWaitingGuests().length;
    const leaving = gameState.guestsAt('checkout').length;
    const free = gameState.hasFreeRoom();

    let message: string;
    if (leaving > 0) {
      message = leaving === 1
        ? 'En gæst vil tjekke ud — tryk på dem'
        : `${leaving} gæster vil tjekke ud — tryk på dem`;
    } else if (!free && waiting > 0) {
      message = 'Alle værelser er fyldt — gæsterne skal tjekke ud først';
    } else if (waiting === 0) {
      message = 'Tryk på klokken for at kalde en gæst';
    } else if (waiting >= MAX_WAITING_GUESTS) {
      message = 'Der venter tre gæster — tryk på en for at give dem et værelse';
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

    const full = gameState.getWaitingGuests().length >= MAX_WAITING_GUESTS;
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
      this.walkGuestIn(guest, gameState.getWaitingGuests().length - 1);
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

  /**
   * A guest at the desk, and the bubble that says what they want.
   *
   * The bubble alternates between two heights so three guests standing side by side can all
   * be read at once.
   */
  private buildGuest(
    guest: GuestData,
    slot: { x: number; y: number },
    row: number,
    onTap: () => void
  ): void {
    const c = this.add.container(slot.x, slot.y);
    c.add(drawPerson(this, 0, 0, guest.color, 1.25));
    c.add(caption(this, 0, 58, guest.name));
    this.dyn(c);

    const line = guestLine(guest);
    sayOnce(guest, line);
    this.dyn(drawSpeechBubble(this, slot.x, slot.y - 62 - row * 46, line.text, line.tone, 150));

    const bar = drawPatienceBar(this, slot.x, slot.y + 80, guest);
    this.dyn(bar.object);
    this.everyFrame(bar.update);

    tappable(this, c, 80, 108, onTap);
  }

  private buildArrival(guest: GuestData, index: number): void {
    const slot = this.arrivalSlot(index);

    this.buildGuest(guest, slot, index % 2, () => {
      const result = gameState.checkInGuest(guest.id);

      if (result === null) {
        showToast(this, slot.x, slot.y - 64, 'Alle rum er fyldt', '#B9584A');
        return;
      }

      showToast(this, slot.x, slot.y - 66, `Værelse ${result.room + 1}`, '#4A7F33');

      if (result.late) {
        // They stood at the desk too long. The key is still theirs; the star is not.
        showToast(this, slot.x, slot.y - 104, 'De ventede for længe — ingen stjerne', '#B9584A');
        this.time.delayedCall(400, () => this.refresh());
        return;
      }

      showStarBurst(this, slot.x, slot.y - 30);
      showHearts(this, slot.x, slot.y - 46);
      rewardFor(this, 'lobby', { after: () => this.refresh() });
    });
  }

  private buildDeparture(guest: GuestData, index: number): void {
    const slot = this.departureSlot(index);

    // Departures take the opposite row to arrivals, so a full desk — three checking in and
    // three checking out — still reads as six separate bubbles.
    this.buildGuest(guest, slot, (index + 1) % 2, () => {
      const result = gameState.checkOutGuest(guest.id);
      if (result === null) return;

      audio.sparkle();
      if (result.late) {
        showToast(this, slot.x, slot.y - 70, 'De ventede for længe — ingen stjerne', '#B9584A');
      } else {
        showStarBurst(this, slot.x, slot.y - 30);
        showHearts(this, slot.x, slot.y - 46);
        showToast(this, slot.x, slot.y - 70, `${guest.name} siger tak for besøget`, '#4A7F33');
        // Checking out is not a task: one question per guest is plenty, and the check-in
        // already asked it.
        award(this, 2);
      }
      this.refresh();
    });
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
