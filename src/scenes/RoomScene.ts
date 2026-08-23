import Phaser from 'phaser';
import { COLORS, INK, INK_SOFT, ROOM_THEMES, SIZE, text } from '../config';
import { Chore, GuestData, gameState } from '../state/GameState';
import { THEME_UNLOCKS } from '../state/Shop';
import { showCheckmark, showSparkle, showStarBurst, showToast } from '../objects/FeedbackEffects';
import { drawPatienceBar, drawSleepZs, drawSpeechBubble, guestLine, sayOnce } from '../objects/Guests';
import { addBackButton, addStarCounter, award } from '../ui/Chrome';
import { rewardFor } from '../helpers/Reward';
import { placeDecorations } from './ShopScene';
import { caption, drawFlower, drawHead, drawPerson, shadow, tappable } from '../helpers/Draw';
import { audio } from '../helpers/Audio';
import { dur } from '../helpers/Motion';
import { BaseScene } from './BaseScene';

interface ChoreSpec {
  key: Chore;
  todo: string;
  done: string;
  x: number;
  y: number;
  hitW: number;
  hitH: number;
  labelY: number;
  draw: (c: Phaser.GameObjects.Container, isDone: boolean) => void;
}

export class RoomScene extends BaseScene {
  private currentRoom = 0;

  constructor() {
    super({ key: 'RoomScene' });
  }

  protected buildBackground(): void {
    const { width, height } = this.scale;

    const floorY = height * 0.76;

    // floor
    const floor = this.add.graphics();
    floor.fillStyle(COLORS.woodDeep);
    floor.fillRect(0, floorY, width, height - floorY);
    floor.fillStyle(COLORS.wood);
    for (let i = -30; i < width; i += 104) {
      floor.fillRoundedRect(i + 4, floorY + 5, 96, height - floorY, 3);
    }
    // skirting board
    floor.fillStyle(COLORS.wall);
    floor.fillRect(0, floorY - 9, width, 10);
    floor.fillStyle(COLORS.wallDeep, 0.6);
    floor.fillRect(0, floorY - 2, width, 3);

    // rug, so the lower third reads as part of the room
    floor.fillStyle(COLORS.shadow, 0.08);
    floor.fillEllipse(width / 2, height * 0.92, 430, 96);
    floor.fillStyle(COLORS.cream, 0.75);
    floor.fillEllipse(width / 2, height * 0.915, 420, 90);
    floor.fillStyle(COLORS.sand, 0.5);
    floor.fillEllipse(width / 2, height * 0.915, 330, 66);
    floor.fillStyle(COLORS.cream, 0.8);
    floor.fillEllipse(width / 2, height * 0.915, 230, 42);
    this.background.add(floor);
  }

  protected buildChrome(): void {
    addBackButton(this);
    addStarCounter(this);
  }

  protected buildDynamic(): void {
    const { width, height } = this.scale;
    const room = gameState.rooms[this.currentRoom];
    const theme = ROOM_THEMES[room.theme] ?? ROOM_THEMES[0];

    // wall — sits in the dynamic layer because its tint follows the selected room
    const wall = this.add.graphics();
    wall.fillStyle(theme.wall);
    wall.fillRect(0, 0, width, height * 0.76);
    wall.fillStyle(COLORS.white, 0.3);
    for (let i = 0; i < width; i += 46) {
      wall.fillRect(i, 0, 22, height * 0.76);
    }
    // picture rail
    wall.fillStyle(theme.accent, 0.22);
    wall.fillRect(0, 128, width, 5);
    this.dyn(wall);

    this.buildRoomTabs();

    this.dyn(this.add.text(width / 2, 78, `Rum ${this.currentRoom + 1} · ${theme.name}`,
      text(SIZE.heading, INK_SOFT, 'bold')).setOrigin(0.5));

    // to the right of the room name, so the swatches are not mistaken for another
    // row of progress dots
    this.buildThemePicker(width - 142, 78);

    const specs = this.choreSpecs(theme);
    for (const spec of specs) {
      this.buildChore(spec, room[spec.key]);
    }

    const guest = gameState.guestInRoom(this.currentRoom);
    const sleeping = guest && guest.at === 'room' ? guest : null;
    if (sleeping) this.buildRoomGuest(sleeping);

    this.dyn(caption(this, width / 2, height - 22, this.roomHint(guest, sleeping), 
      gameState.isRoomClean(this.currentRoom) ? 'done' : 'idle'));

    placeDecorations(this, 'rooms', this.dynamic);

    const cleanCount = specs.filter(s => room[s.key]).length;
    this.buildProgressDots(width / 2, 104, cleanCount, specs.length);
  }

  private choreSpecs(theme: typeof ROOM_THEMES[0]): ChoreSpec[] {
    const { width, height } = this.scale;
    return [
      {
        key: 'bedMade',
        todo: 'Red sengen', done: 'Sengen er redt',
        x: width / 2 - 40, y: height * 0.57,
        hitW: 190, hitH: 78, labelY: 56,
        draw: (c, done) => this.drawBed(c, theme, done),
      },
      {
        key: 'curtainsOpen',
        todo: 'Åbn gardinerne', done: 'Gardinerne er åbne',
        x: width - 132, y: height * 0.33,
        hitW: 108, hitH: 92, labelY: 62,
        draw: (c, done) => this.drawWindow(c, done),
      },
      {
        key: 'flowersPlaced',
        todo: 'Sæt blomster', done: 'Blomsterne står klar',
        x: 126, y: height * 0.52,
        hitW: 84, hitH: 96, labelY: 58,
        draw: (c, done) => this.drawVase(c, done),
      },
      {
        key: 'towelsFolded',
        todo: 'Fold håndklæderne', done: 'Håndklæderne er foldet',
        x: width / 2 + 212, y: height * 0.6,
        hitW: 92, hitH: 62, labelY: 44,
        draw: (c, done) => this.drawTowels(c, done),
      },
      {
        key: 'vacuumed',
        todo: 'Støvsug', done: 'Der er støvsuget',
        x: width - 176, y: height * 0.85,
        // caption above, so it clears the guest bar and the check-out button
        hitW: 132, hitH: 74, labelY: -52,
        draw: (c, done) => this.drawVacuum(c, done),
      },
    ];
  }

  private buildChore(spec: ChoreSpec, isDone: boolean): void {
    const c = this.add.container(spec.x, spec.y);
    spec.draw(c, isDone);
    c.add(caption(this, 0, spec.labelY, isDone ? spec.done : spec.todo, isDone ? 'done' : 'idle'));
    this.dyn(c);

    if (isDone) return;

    tappable(this, c, spec.hitW, spec.hitH, () => {
      if (!gameState.completeChore(this.currentRoom, spec.key)) return;
      audio.pop();
      showStarBurst(this, spec.x, spec.y - 10);
      showCheckmark(this, spec.x, spec.y - 34);

      /*
       * One chore is a tap, not a job.
       *
       * Every single chore used to raise a task, so making up one room asked five
       * questions. A tap pays a plain star now; the *room being finished* is the job, and
       * that is what asks — and only when somebody is actually waiting to sleep in it.
       */
      if (!gameState.isRoomClean(this.currentRoom)) {
        award(this, 1);
        this.refresh();
        return;
      }
      this.finishRoom();
    });
  }

  /** The last chore in a room: the job that pays, and the only one that asks. */
  private finishRoom(): void {
    const { width, height } = this.scale;
    const settled = gameState.settleRoomGuest(this.currentRoom);

    showSparkle(this, width / 2, height * 0.42, width * 0.7, height * 0.42);

    if (settled) {
      if (settled.late) {
        showToast(this, width / 2, height * 0.28,
          `${settled.guest.name} ventede for længe — ingen stjerne`, '#B9584A');
        this.time.delayedCall(dur(300), () => this.refresh());
        return;
      }
      showToast(this, width / 2, height * 0.28, 'Værelset er klar — godnat!', '#4A7F33');
      rewardFor(this, 'rooms', { base: 2, after: () => this.refresh() });
      return;
    }

    // Made up before anybody asked for it. Worth doing, worth a star, not worth a question.
    showToast(this, width / 2, height * 0.28, 'Værelset er klar til en gæst', '#4A7F33');
    award(this, 3);
    this.refresh();
  }

  private roomHint(guest: GuestData | null, sleeping: GuestData | null): string {
    const clean = gameState.isRoomClean(this.currentRoom);
    if (sleeping) {
      if (sleeping.settledAt !== null) return `${sleeping.name} sover`;
      return clean ? `${sleeping.name} lægger sig` : `${sleeping.name} venter — gør værelset klar`;
    }
    if (guest) return `${guest.name} bor her, men er et andet sted i hotellet`;
    return clean ? 'Værelset er klar til en gæst' : 'Gør værelset klar';
  }

  /**
   * The guest who came here to sleep.
   *
   * Waiting, they stand by the door and say so. Once the room is finished they are in the
   * bed with a "zzz" over them, which is the clearest possible sign the job is done.
   */
  private buildRoomGuest(guest: GuestData): void {
    const { width, height } = this.scale;

    if (guest.settledAt !== null) {
      const bedX = width / 2 - 40;
      const bedY = height * 0.57;
      const c = this.add.container(bedX - 62, bedY - 12);
      c.add(drawHead(this, 0, 0, guest.color, 0.95));
      this.dyn(c);
      this.dyn(drawSleepZs(this, bedX - 26, bedY - 34));

      const line = guestLine(guest);
      sayOnce(guest, line);
      this.dyn(drawSpeechBubble(this, bedX + 60, bedY - 62, line.text, line.tone, 170));
      return;
    }

    const x = 214;
    const y = height * 0.63;
    const c = this.add.container(x, y);
    c.add(drawPerson(this, 0, 0, guest.color, 1.05));
    this.dyn(c);

    const line = guestLine(guest);
    sayOnce(guest, line);
    this.dyn(drawSpeechBubble(this, x + 8, y - 54, line.text, line.tone, 160));

    const bar = drawPatienceBar(this, x, y + 52, guest);
    this.dyn(bar.object);
    this.everyFrame(bar.update);
  }

  private buildProgressDots(x: number, y: number, done: number, total: number): void {
    const c = this.add.container(x, y);
    for (let i = 0; i < total; i++) {
      const dx = (i - (total - 1) / 2) * 20;
      const dot = this.add.circle(dx, 0, 6, i < done ? COLORS.green : COLORS.white);
      dot.setStrokeStyle(1.5, i < done ? COLORS.green : COLORS.stoneDeep);
      c.add(dot);
    }
    this.dyn(c);
  }

  private buildRoomTabs(): void {
    const { width } = this.scale;
    const rooms = gameState.roomCount;
    for (let i = 0; i < rooms; i++) {
      const isActive = i === this.currentRoom;
      const theme = ROOM_THEMES[gameState.rooms[i].theme] ?? ROOM_THEMES[0];
      const w = 90;
      const h = 36;
      const x = width / 2 + (i - (rooms - 1) / 2) * 98;

      const c = this.add.container(x, 38);
      const g = this.add.graphics();
      if (isActive) {
        shadow(g, -w / 2, -h / 2, w, h, h / 2, 2, 0.16);
        g.fillStyle(theme.accent);
      } else {
        g.fillStyle(COLORS.white, 0.7);
      }
      g.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);

      const occupied = gameState.rooms[i].guestId !== null;
      const guest = gameState.guestInRoom(i);
      const waiting = !!guest && guest.at === 'room' && guest.settledAt === null;
      const label = this.add.text(0, 0, `Rum ${i + 1}`,
        text(SIZE.label, isActive ? '#FFFFFF' : INK, 'bold')).setOrigin(0.5);

      c.add([g, label]);

      // A guest waiting to sleep may be in a room the player is not looking at, and there
      // is nothing else on this screen to say so.
      if (waiting) {
        const dot = this.add.circle(w / 2 - 10, -h / 2 + 8, 8, COLORS.red)
          .setStrokeStyle(2, COLORS.white);
        c.add(dot);
        this.tweens.add({ targets: dot, scale: 1.2, duration: 700, yoyo: true, repeat: -1 });
      } else if (occupied) {
        const pip = this.add.circle(w / 2 - 11, -h / 2 + 9, 4.5, isActive ? COLORS.white : COLORS.orange);
        c.add(pip);
      }

      this.dyn(c);

      if (!isActive) {
        tappable(this, c, w, h, () => {
          this.currentRoom = i;
          this.refresh();
        });
      }
    }
  }

  /**
   * Swatches for the room's look. Hidden until a theme has been bought — three fixed
   * choices per room is not a decision worth putting on screen.
   */
  private buildThemePicker(cx: number, y: number): void {
    const unlocked = gameState.unlockedThemes(THEME_UNLOCKS);
    if (unlocked.length <= 3) return;

    const current = gameState.rooms[this.currentRoom].theme;
    const spacing = unlocked.length > 5 ? 30 : 34;

    unlocked.forEach((themeIndex, i) => {
      const theme = ROOM_THEMES[themeIndex];
      if (!theme) return;
      const x = cx + (i - (unlocked.length - 1) / 2) * spacing;
      const chosen = themeIndex === current;

      const c = this.add.container(x, y);
      const g = this.add.graphics();
      if (chosen) shadow(g, -13, -13, 26, 26, 13, 2, 0.2);
      g.fillStyle(theme.accent);
      g.fillCircle(0, 0, chosen ? 13 : 10);
      g.lineStyle(chosen ? 3 : 1.5, COLORS.white, chosen ? 1 : 0.7);
      g.strokeCircle(0, 0, chosen ? 13 : 10);
      c.add(g);
      this.dyn(c);

      if (chosen) return;
      tappable(this, c, 30, 30, () => {
        gameState.setRoomTheme(this.currentRoom, themeIndex);
        this.refresh();
      });
    });
  }

  // ---------- chore art ----------

  private drawBed(c: Phaser.GameObjects.Container, theme: typeof ROOM_THEMES[0], made: boolean): void {
    const g = this.add.graphics();

    shadow(g, -86, 26, 176, 16, 8, 3, 0.14);

    // frame + headboard
    g.fillStyle(COLORS.woodDeep);
    g.fillRoundedRect(-92, -30, 22, 62, 8);
    g.fillStyle(COLORS.wood);
    g.fillRoundedRect(-86, -6, 176, 38, 8);

    // mattress
    g.fillStyle(COLORS.white);
    g.fillRoundedRect(-82, -14, 168, 30, 7);

    if (made) {
      g.fillStyle(theme.duvet);
      g.fillRoundedRect(-46, -15, 132, 31, 8);
      // turned-down sheet
      g.fillStyle(COLORS.white, 0.9);
      g.fillRoundedRect(-46, -15, 132, 10, 5);
      g.fillStyle(theme.cushion, 0.5);
      g.fillRoundedRect(-46, -6, 132, 3, 1.5);
      // pillow
      g.fillStyle(COLORS.white);
      g.fillRoundedRect(-82, -14, 42, 26, 10);
      g.lineStyle(1.5, COLORS.stoneDeep, 0.3);
      g.strokeRoundedRect(-82, -14, 42, 26, 10);
      // folded throw at the foot
      g.fillStyle(theme.cushion);
      g.fillRoundedRect(46, -13, 38, 27, 7);
      g.fillStyle(COLORS.white, 0.25);
      g.fillRoundedRect(46, -13, 38, 9, 5);
    } else {
      g.fillStyle(theme.duvet, 0.85);
      g.fillRoundedRect(-30, -6, 62, 24, 9);
      g.fillRoundedRect(22, -16, 54, 28, 11);
      g.fillStyle(COLORS.white, 0.85);
      g.fillRoundedRect(-78, -6, 34, 20, 8);
    }

    c.add(g);
  }

  private drawWindow(c: Phaser.GameObjects.Container, open: boolean): void {
    const g = this.add.graphics();

    g.fillStyle(COLORS.wallDeep);
    g.fillRoundedRect(-52, -42, 104, 84, 8);
    g.fillStyle(COLORS.window);
    g.fillRoundedRect(-45, -35, 90, 70, 5);

    if (open) {
      g.fillStyle(COLORS.sky);
      g.fillRoundedRect(-45, -35, 90, 70, 5);
      g.fillStyle(COLORS.grass);
      g.fillRect(-45, 16, 90, 19);
      g.fillStyle(COLORS.sun);
      g.fillCircle(22, -18, 11);
      g.fillStyle(COLORS.white, 0.85);
      g.fillCircle(-18, -20, 9);
      g.fillCircle(-8, -17, 7);
      // pulled-back curtains
      g.fillStyle(COLORS.roof, 0.85);
      g.fillRoundedRect(-45, -35, 14, 70, 4);
      g.fillRoundedRect(31, -35, 14, 70, 4);
    } else {
      g.fillStyle(COLORS.roof, 0.9);
      g.fillRoundedRect(-45, -35, 44, 70, 4);
      g.fillRoundedRect(1, -35, 44, 70, 4);
      g.fillStyle(COLORS.roofDeep, 0.35);
      for (let i = 0; i < 4; i++) {
        g.fillRect(-42 + i * 11, -35, 4, 70);
        g.fillRect(4 + i * 11, -35, 4, 70);
      }
    }

    // rail
    g.fillStyle(COLORS.woodDeep);
    g.fillRoundedRect(-56, -46, 112, 7, 3.5);

    c.add(g);
  }

  private drawVase(c: Phaser.GameObjects.Container, hasFlowers: boolean): void {
    const g = this.add.graphics();

    shadow(g, -26, 34, 52, 12, 6, 3, 0.14);
    g.fillStyle(COLORS.woodDeep);
    g.fillRoundedRect(-22, 14, 44, 30, 5);
    g.fillStyle(COLORS.wood);
    g.fillRoundedRect(-27, 10, 54, 8, 4);

    g.fillStyle(COLORS.purple, 0.9);
    g.fillRoundedRect(-11, -12, 22, 24, { tl: 4, tr: 4, bl: 9, br: 9 });
    g.fillStyle(COLORS.white, 0.25);
    g.fillRoundedRect(-11, -12, 8, 24, { tl: 4, tr: 0, bl: 8, br: 0 });

    c.add(g);

    if (hasFlowers) {
      const colors = [COLORS.pink, COLORS.yellow, COLORS.white];
      [-9, 0, 9].forEach((dx, i) => {
        const stem = this.add.graphics();
        stem.lineStyle(2.5, COLORS.grassDeep);
        stem.beginPath();
        stem.moveTo(dx * 0.4, -10);
        stem.lineTo(dx, -28 - i * 4);
        stem.strokePath();
        c.add(stem);
        c.add(drawFlower(this, dx, -30 - i * 4, colors[i], 0.85));
      });
    }
  }

  private drawTowels(c: Phaser.GameObjects.Container, folded: boolean): void {
    const g = this.add.graphics();

    if (folded) {
      shadow(g, -26, 14, 52, 8, 4, 2, 0.12);
      const shades = [COLORS.white, 0xF2F6F8, COLORS.waterLight];
      shades.forEach((shade, i) => {
        g.fillStyle(shade);
        g.fillRoundedRect(-24 + i * 2, 6 - i * 11, 48 - i * 4, 10, 4);
        g.lineStyle(1, COLORS.stoneDeep, 0.35);
        g.strokeRoundedRect(-24 + i * 2, 6 - i * 11, 48 - i * 4, 10, 4);
      });
    } else {
      // Previously a second graphics object was created in world coordinates, never
      // parented and never destroyed, so it stayed on screen as a stray white sliver.
      shadow(g, -32, 14, 64, 12, 6, 2, 0.12);
      // a tumbled pile, not a pale smudge
      g.fillStyle(COLORS.waterLight);
      g.fillRoundedRect(-32, 4, 44, 15, 7);
      g.lineStyle(1.5, COLORS.waterDeep, 0.35);
      g.strokeRoundedRect(-32, 4, 44, 15, 7);
      g.fillStyle(COLORS.white);
      g.fillRoundedRect(-14, -6, 46, 15, 7);
      g.lineStyle(1.5, COLORS.stoneDeep, 0.35);
      g.strokeRoundedRect(-14, -6, 46, 15, 7);
      g.fillStyle(0xF2F6F8);
      g.fillRoundedRect(-22, 14, 40, 13, 6);
      g.lineStyle(1.5, COLORS.stoneDeep, 0.3);
      g.strokeRoundedRect(-22, 14, 40, 13, 6);
    }

    c.add(g);
  }

  private drawVacuum(c: Phaser.GameObjects.Container, cleaned: boolean): void {
    const g = this.add.graphics();

    if (cleaned) {
      g.fillStyle(COLORS.white, 0.3);
      g.fillEllipse(0, 8, 110, 26);
    } else {
      g.fillStyle(COLORS.shadow, 0.16);
      const spots: [number, number, number][] = [
        [-46, 4, 6], [-24, 14, 4], [-6, -2, 7], [16, 12, 5], [38, 2, 6], [50, 16, 4],
      ];
      for (const [sx, sy, r] of spots) g.fillCircle(sx, sy, r);

      // vacuum body
      g.fillStyle(COLORS.roofDeep);
      g.fillRoundedRect(-16, -30, 32, 22, 9);
      g.fillStyle(COLORS.red);
      g.fillRoundedRect(-16, -30, 32, 14, 8);
      g.fillStyle(COLORS.stoneDeep);
      g.fillRoundedRect(-3, -12, 6, 22, 3);
      g.fillStyle(COLORS.stone);
      g.fillRoundedRect(-14, 8, 28, 11, 5);
    }

    c.add(g);
  }
}
