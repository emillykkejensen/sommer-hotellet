import Phaser from 'phaser';
import { COLORS, SIZE, text } from '../config';
import { GuestData, gameState, MAX_WAITING_GUESTS } from '../state/GameState';
import { showHearts, showStarBurst, showToast } from '../objects/FeedbackEffects';
import { addBackButton, addSceneTitle, addStarCounter } from '../ui/Chrome';
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
    g.fillRoundedRect(width / 2 - 230, height * 0.79, 460, 82, 34);
    g.fillStyle(COLORS.sand, 0.35);
    g.fillRoundedRect(width / 2 - 214, height * 0.805, 428, 62, 26);
    g.lineStyle(2, COLORS.red, 0.28);
    g.strokeRoundedRect(width / 2 - 230, height * 0.79, 460, 82, 34);

    this.background.add(g);
    this.background.add(this.drawPottedPlant(72, height * 0.7));
    this.background.add(this.drawPottedPlant(width - 72, height * 0.7));
  }

  protected buildChrome(): void {
    addBackButton(this);
    addStarCounter(this);
    addSceneTitle(this, 'Lobbyen');
  }

  protected buildDynamic(): void {
    const { width, height } = this.scale;

    this.buildKeyBoard(width - 150, height * 0.3);
    this.buildDesk(width / 2, height * 0.62);
    // sits on the desk top, not floating above it
    this.buildBell(width / 2 + 108, height * 0.615);

    placeDecorations(this, 'lobby', this.dynamic);

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

    shadow(g, cx - 170, cy - 6, 340, 78, 10, 4, 0.16);

    g.fillStyle(COLORS.wood);
    g.fillRoundedRect(cx - 170, cy, 340, 72, { tl: 10, tr: 10, bl: 0, br: 0 });
    g.fillStyle(COLORS.woodDeep, 0.35);
    for (let i = 0; i < 5; i++) {
      g.fillRect(cx - 150 + i * 68, cy + 14, 3, 50);
    }
    g.fillStyle(COLORS.woodLight);
    g.fillRoundedRect(cx - 178, cy - 10, 356, 14, 7);

    const sign = this.add.graphics();
    sign.fillStyle(COLORS.white);
    sign.fillRoundedRect(cx - 62, cy + 20, 124, 30, 9);
    sign.lineStyle(2, COLORS.sandDeep, 0.6);
    sign.strokeRoundedRect(cx - 62, cy + 20, 124, 30, 9);

    this.dyn(this.add.container(0, 0, [g, sign]));
    this.dyn(this.add.text(cx, cy + 35, 'RECEPTION', text(SIZE.label, '#A57A51', 'bold')).setOrigin(0.5));

    // ledger on the desk
    const book = this.add.graphics();
    book.fillStyle(COLORS.wallDeep);
    book.fillRoundedRect(cx - 150, cy - 6, 58, 15, 3);
    book.fillStyle(COLORS.white);
    book.fillRoundedRect(cx - 147, cy - 10, 52, 13, 2);
    book.lineStyle(1, COLORS.stoneDeep, 0.5);
    book.lineBetween(cx - 121, cy - 9, cx - 121, cy + 2);
    this.dyn(book);
  }

  private buildKeyBoard(cx: number, cy: number): void {
    const rooms = gameState.roomCount;
    // the board grows with the hotel rather than assuming three hooks
    const halfW = 27 + rooms * 16.5;
    const g = this.add.graphics();

    shadow(g, cx - halfW, cy - 46, halfW * 2, 96, 10, 3, 0.16);
    g.fillStyle(COLORS.woodDeep);
    g.fillRoundedRect(cx - halfW, cy - 46, halfW * 2, 96, 10);
    g.fillStyle(COLORS.wood);
    g.fillRoundedRect(cx - halfW + 5, cy - 41, halfW * 2 - 10, 86, 8);

    const c = this.add.container(0, 0, [g]);

    for (let i = 0; i < rooms; i++) {
      const kx = cx + (i - (rooms - 1) / 2) * 33;
      const ky = cy - 12;

      const hook = this.add.graphics();
      hook.fillStyle(COLORS.stoneDeep);
      hook.fillCircle(kx, ky - 12, 3);
      c.add(hook);

      if (gameState.rooms[i].guestId === null) {
        const key = this.add.graphics();
        key.fillStyle(COLORS.sunDeep);
        key.fillCircle(kx, ky + 2, 8);
        key.fillStyle(COLORS.sun);
        key.fillCircle(kx, ky + 1, 6.5);
        key.fillStyle(COLORS.sunDeep);
        key.fillRect(kx - 1.5, ky + 8, 3, 12);
        key.fillRect(kx - 1.5, ky + 16, 6, 2.5);
        c.add(key);
        c.add(this.add.text(kx, ky + 1, `${i + 1}`, text(SIZE.tiny, '#A57A51', 'bold')).setOrigin(0.5));
      } else {
        const empty = this.add.graphics();
        empty.lineStyle(1.5, COLORS.woodDeep, 0.5);
        empty.strokeCircle(kx, ky + 2, 8);
        c.add(empty);
      }
    }

    c.add(this.add.text(cx, cy + 33, 'Nøgler', text(SIZE.tiny, '#FDF7EA', 'bold')).setOrigin(0.5));
    this.dyn(c);
  }

  private buildBell(x: number, y: number): void {
    const c = this.add.container(x, y);

    const g = this.add.graphics();
    shadow(g, -20, 6, 40, 10, 5, 2, 0.18);
    g.fillStyle(COLORS.stone);
    g.fillRoundedRect(-19, 4, 38, 8, 4);
    g.fillStyle(COLORS.sunDeep);
    g.fillCircle(0, -6, 17);
    g.fillStyle(COLORS.sun);
    g.fillCircle(-1, -8, 15);
    g.fillStyle(COLORS.white, 0.5);
    g.fillEllipse(-6, -14, 9, 6);
    g.fillStyle(COLORS.sunDeep);
    g.fillCircle(0, -24, 4.5);
    c.add(g);

    const full = gameState.getWaitingGuests().length >= MAX_WAITING_GUESTS;
    c.add(caption(this, 0, -46, full ? 'Klokken hviler' : 'Ring på klokken', full ? 'done' : 'idle'));
    this.dyn(c);

    if (full) return;

    tappable(this, c, 54, 46, () => {
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
        const ring = this.add.circle(x, y - 8, 18).setStrokeStyle(2, COLORS.sunDeep, 0.8);
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

  /** Guests stand on the floorboards rather than floating against the wall. */
  private guestSlot(index: number): { x: number; y: number } {
    return { x: 150 + index * 108, y: this.scale.height * 0.72 };
  }

  /** Animated arrival, then the same interactive figure the refresh would have drawn. */
  private walkGuestIn(guest: GuestData, index: number): void {
    const slot = this.guestSlot(index);
    const person = drawPerson(this, -60, slot.y, guest.color, 1.15);
    this.dyn(person);

    this.tweens.add({
      targets: person,
      x: slot.x,
      duration: 780,
      ease: 'Sine.easeOut',
      onComplete: () => {
        showToast(this, slot.x, slot.y - 62, 'Hej!');
        this.refresh();
      },
    });
  }

  private buildGuest(guest: GuestData, index: number, _animated: boolean): void {
    const slot = this.guestSlot(index);
    const c = this.add.container(slot.x, slot.y);

    c.add(drawPerson(this, 0, 0, guest.color, 1.15));
    c.add(caption(this, 0, 56, guest.name));
    this.dyn(c);

    tappable(this, c, 74, 100, () => {
      const room = gameState.checkInGuest(guest.id);

      if (room === null) {
        showToast(this, slot.x, slot.y - 64, 'Alle rum er fyldt', '#B9584A');
        return;
      }

      showStarBurst(this, slot.x, slot.y - 30);
      showHearts(this, slot.x, slot.y - 46);
      showToast(this, slot.x, slot.y - 66, `Værelse ${room + 1}`, '#4A7F33');

      rewardFor(this, 'lobby', {
        after: () => {
          // walk off to the room, then rebuild so the remaining guests close the gap
          this.tweens.add({
            targets: c,
            x: this.scale.width + 70,
            duration: 900,
            delay: 200,
            ease: 'Sine.easeIn',
            onComplete: () => this.refresh(),
          });
        },
      });
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
