import Phaser from 'phaser';
import { COLORS, INK, INK_SOFT, LINE, ROOM_THEMES, SIZE, text } from '../config';
import { Chore, gameState, ROOM_COUNT } from '../state/GameState';
import {
  showCheckmark, showConfetti, showPraise, showSparkle, showStarBurst, showToast,
} from '../objects/FeedbackEffects';
import { addBackButton, addSoundToggle, addStarCounter, award } from '../ui/Chrome';
import {
  caption, paintFlower, plate, progressBar, shade, shadow, sheen, tappable,
} from '../helpers/Draw';
import { reduceMotion, wobble } from '../helpers/Motion';
import { sfx } from '../helpers/AudioManager';
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

    const floor = this.add.graphics();

    // floor
    floor.fillStyle(COLORS.woodDeep);
    floor.fillRect(0, floorY, width, height - floorY);
    floor.fillStyle(COLORS.wood);
    for (let i = -30; i < width; i += 104) {
      floor.fillRoundedRect(i + 4, floorY + 5, 96, height - floorY, 3);
    }
    // skirting board
    floor.fillStyle(COLORS.wall);
    floor.fillRect(0, floorY - 10, width, 11);
    floor.fillStyle(COLORS.wallDeep, 0.7);
    floor.fillRect(0, floorY - 2, width, 3);
    floor.lineStyle(LINE.thin, COLORS.outline, 0.45);
    floor.lineBetween(0, floorY - 10, width, floorY - 10);
    floor.lineBetween(0, floorY + 1, width, floorY + 1);

    // rug, so the lower third reads as part of the room
    floor.fillStyle(COLORS.shadow, 0.1);
    floor.fillEllipse(width / 2, height * 0.925, 430, 96);
    floor.fillStyle(COLORS.cream);
    floor.fillEllipse(width / 2, height * 0.915, 420, 90);
    floor.fillStyle(COLORS.sand, 0.6);
    floor.fillEllipse(width / 2, height * 0.915, 330, 66);
    floor.fillStyle(COLORS.cream);
    floor.fillEllipse(width / 2, height * 0.915, 230, 42);
    floor.lineStyle(LINE.thin, COLORS.outline, 0.45);
    floor.strokeEllipse(width / 2, height * 0.915, 420, 90);
    floor.strokeEllipse(width / 2, height * 0.915, 330, 66);

    this.bg(floor);
  }

  protected buildChrome(): void {
    addBackButton(this);
    addStarCounter(this);
    addSoundToggle(this);
  }

  protected buildDynamic(): void {
    const { width, height } = this.scale;
    const theme = ROOM_THEMES[this.currentRoom];
    const room = gameState.rooms[this.currentRoom];

    // Wall — in the dynamic layer because its tint follows the selected room, so it
    // cannot be baked with the rest of the scenery. Kept to a handful of draw commands
    // for that reason: a solid field, a dotted paper border and a picture rail, rather
    // than the twenty-one striped rects it used to be.
    const wall = this.add.graphics();
    wall.fillStyle(theme.wall);
    wall.fillRect(0, 0, width, height * 0.76);
    wall.fillStyle(COLORS.white, 0.5);
    wall.fillRect(0, 132, width, 6);
    wall.fillStyle(theme.accent, 0.3);
    wall.fillRect(0, 138, width, 4);
    // A pair of banded stripes rather than a field of dots: the dot loop was forty-four
    // fill commands re-issued on every frame, for wallpaper nobody looks at.
    wall.fillStyle(theme.accent, 0.14);
    wall.fillRect(0, 160, width, 14);
    wall.fillStyle(theme.accent, 0.09);
    wall.fillRect(0, 182, width, 7);
    this.dyn(wall);

    // Wall furniture has to live here too, or the tinted wall would cover it.
    this.dyn(this.buildWallArt(width / 2 - 250, height * 0.34, theme));
    this.dyn(this.buildBedsideLamp(width / 2 - 190, height * 0.615));

    this.buildRoomTabs();

    this.dyn(this.add.text(width / 2, 82, `Rum ${this.currentRoom + 1} · ${theme.name}`,
      text(SIZE.heading, INK_SOFT, 'bold')).setOrigin(0.5));

    const specs = this.choreSpecs(theme);
    for (const spec of specs) {
      this.buildChore(spec, room[spec.key]);
    }

    if (room.guestId !== null) {
      this.buildGuestBar(room.guestId);
    } else {
      const clean = gameState.isRoomClean(this.currentRoom);
      this.dyn(caption(this, width / 2, height - 26,
        clean ? 'Værelset er klar til en gæst' : 'Gør værelset klar',
        clean ? 'done' : 'idle'));
    }

    const cleanCount = specs.filter(s => room[s.key]).length;
    this.buildProgress(width / 2, 110, cleanCount, specs.length);

    if (gameState.isRoomClean(this.currentRoom)) {
      this.time.delayedCall(220, () => showSparkle(this, width / 2, height * 0.42, width * 0.7, height * 0.42));
    }
  }

  private choreSpecs(theme: typeof ROOM_THEMES[0]): ChoreSpec[] {
    const { width, height } = this.scale;
    return [
      {
        key: 'bedMade',
        todo: 'Red sengen', done: 'Sengen er redt',
        x: width / 2 - 40, y: height * 0.57,
        hitW: 190, hitH: 78, labelY: 58,
        draw: (c, done) => this.drawBed(c, theme, done),
      },
      {
        key: 'curtainsOpen',
        todo: 'Åbn gardinerne', done: 'Gardinerne er åbne',
        x: width - 132, y: height * 0.33,
        hitW: 108, hitH: 92, labelY: 64,
        draw: (c, done) => this.drawWindow(c, done),
      },
      {
        key: 'flowersPlaced',
        todo: 'Sæt blomster', done: 'Blomsterne står klar',
        x: 126, y: height * 0.52,
        hitW: 84, hitH: 96, labelY: 60,
        draw: (c, done) => this.drawVase(c, done),
      },
      {
        key: 'towelsFolded',
        todo: 'Fold håndklæderne', done: 'Håndklæderne er foldet',
        x: width / 2 + 212, y: height * 0.6,
        hitW: 92, hitH: 62, labelY: 46,
        draw: (c, done) => this.drawTowels(c, done),
      },
      {
        key: 'vacuumed',
        todo: 'Støvsug', done: 'Der er støvsuget',
        x: width - 176, y: height * 0.85,
        hitW: 132, hitH: 74, labelY: 50,
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
      award(this, 1, spec.x, spec.y - 10);
      showStarBurst(this, spec.x, spec.y - 10);
      showCheckmark(this, spec.x, spec.y - 36);

      const finished = gameState.isRoomClean(this.currentRoom);
      if (finished) {
        sfx('success');
        // Aimed at the middle of the room, not the top of the screen: at 0.24 the word
        // landed on the progress bar and the room tabs.
        showConfetti(this, this.scale.width / 2, this.scale.height * 0.38, 32);
        showPraise(this, this.scale.width / 2, this.scale.height * 0.42);
        award(this, 2, spec.x, spec.y - 10);
      }
      this.refresh();
    });
  }

  /**
   * Cleaning progress.
   *
   * Five dots said "something out of something" without saying what. A filling bar with
   * the count on it is readable at a glance and gives the last tap somewhere to land.
   */
  private buildProgress(x: number, y: number, done: number, total: number): void {
    const c = this.add.container(x, y);
    c.add(progressBar(this, 0, 0, 190, 16, done / total, done === total ? COLORS.green : COLORS.sun));
    const t = this.add.text(0, 0, `${done} / ${total}`, text(SIZE.tiny, INK, 'bold')).setOrigin(0.5);
    c.add(t);
    this.dyn(c);
    if (done === total) wobble(this, c);
  }

  private buildRoomTabs(): void {
    const { width } = this.scale;
    for (let i = 0; i < ROOM_COUNT; i++) {
      const isActive = i === this.currentRoom;
      const theme = ROOM_THEMES[i];
      const w = 96;
      const h = 38;
      const lip = 4;
      const x = width / 2 - 104 + i * 104;

      const c = this.add.container(x, 38);
      const g = this.add.graphics();
      if (isActive) {
        shadow(g, -w / 2, -h / 2, w, h + lip, h / 2, 2, 0.2);
        plate(g, -w / 2, -h / 2 + lip, w, h, h / 2, shade(theme.accent, -0.3), 1, LINE.thin);
        plate(g, -w / 2, -h / 2, w, h, h / 2, theme.accent, 1, LINE.base);
        sheen(g, -w / 2, -h / 2, w, h, h / 2, 0.26);
      } else {
        plate(g, -w / 2, -h / 2, w, h, h / 2, COLORS.white, 0.9, LINE.thin, 0.6);
      }

      const label = this.add.text(0, 0, `Rum ${i + 1}`,
        text(SIZE.label, isActive ? '#FFFFFF' : INK, 'bold')).setOrigin(0.5);
      if (isActive) label.setShadow(0, 1.5, 'rgba(74,58,44,0.5)', 0, false, true);

      c.add([g, label]);

      // A pip for an occupied room, a tick for one that is already spotless — the tabs
      // now say which room wants attention before you open it.
      const occupied = gameState.rooms[i].guestId !== null;
      const clean = gameState.isRoomClean(i);
      if (occupied || clean) {
        const marker = this.add.graphics().setPosition(w / 2 - 12, -h / 2 + 3);
        if (clean) {
          marker.fillStyle(COLORS.green);
          marker.fillCircle(0, 0, 8);
          marker.lineStyle(LINE.hair, COLORS.outline, 0.85);
          marker.strokeCircle(0, 0, 8);
          marker.lineStyle(2.2, COLORS.white, 1);
          marker.beginPath();
          marker.moveTo(-3.4, 0);
          marker.lineTo(-1, 2.8);
          marker.lineTo(3.6, -3);
          marker.strokePath();
        } else {
          marker.fillStyle(isActive ? COLORS.white : COLORS.orange);
          marker.fillCircle(0, 0, 5);
          marker.lineStyle(LINE.hair, COLORS.outline, 0.7);
          marker.strokeCircle(0, 0, 5);
        }
        c.add(marker);
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

  private buildGuestBar(guestId: number): void {
    const { width, height } = this.scale;
    const guest = gameState.guests.find(g => g.id === guestId);
    if (!guest) return;

    const t = this.add.text(0, 0, `Gæst: ${guest.name}`, text(SIZE.label, INK, 'bold')).setOrigin(0.5);
    const w = t.width + 46;
    const h = t.height + 18;
    t.setX(8);
    const g = this.add.graphics();
    shadow(g, -w / 2, -h / 2, w, h, h / 2, 2, 0.16);
    plate(g, -w / 2, -h / 2, w, h, h / 2, COLORS.white, 0.97, LINE.thin);
    g.fillStyle(guest.color);
    g.fillCircle(-w / 2 + 17, 0, 8);
    g.lineStyle(LINE.hair, COLORS.outline, 0.85);
    g.strokeCircle(-w / 2 + 17, 0, 8);

    this.dyn(this.add.container(width / 2 - 60, height - 30, [g, t]));

    // check out
    const bw = 118;
    const bh = 38;
    const lip = 4;
    const btn = this.add.container(width - 96, height - 30);
    const bg = this.add.graphics();
    shadow(bg, -bw / 2, -bh / 2, bw, bh + lip, bh / 2, 2, 0.2);
    plate(bg, -bw / 2, -bh / 2 + lip, bw, bh, bh / 2, shade(COLORS.red, -0.28), 1, LINE.thin);
    plate(bg, -bw / 2, -bh / 2, bw, bh, bh / 2, COLORS.red, 1, LINE.base);
    sheen(bg, -bw / 2, -bh / 2, bw, bh, bh / 2, 0.26);
    const bt = this.add.text(0, 0, 'Tjek ud', text(SIZE.label, '#FFFFFF', 'bold')).setOrigin(0.5);
    bt.setShadow(0, 1.5, 'rgba(74,58,44,0.5)', 0, false, true);
    btn.add([bg, bt]);
    this.dyn(btn);

    tappable(this, btn, bw, bh + lip, () => {
      gameState.checkOutGuest(this.currentRoom);
      showToast(this, width / 2, height * 0.45, `${guest.name} siger tak for besøget`);
      this.refresh();
    });
  }

  // ---------- wall furniture ----------

  /** A framed picture, keyed to the room's theme so the three rooms feel distinct. */
  private buildWallArt(x: number, y: number, theme: typeof ROOM_THEMES[0]): Phaser.GameObjects.Container {
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    const w = 96;
    const h = 76;

    shadow(g, -w / 2, -h / 2, w, h, 5, 3, 0.18);
    g.fillStyle(COLORS.woodDeep);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 5);
    g.fillStyle(COLORS.cream);
    g.fillRect(-w / 2 + 7, -h / 2 + 7, w - 14, h - 14);

    // three soft hills in the room's accent — abstract enough to suit any of the themes
    g.fillStyle(theme.accent, 0.55);
    g.fillCircle(-14, 12, 20);
    g.fillStyle(theme.accent, 0.8);
    g.fillCircle(10, 16, 24);
    g.fillStyle(COLORS.sun);
    g.fillCircle(16, -12, 8);

    g.lineStyle(LINE.base, COLORS.outline, 0.85);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, 5);
    g.strokeRect(-w / 2 + 7, -h / 2 + 7, w - 14, h - 14);

    c.add(g);
    return c;
  }

  /** Bedside lamp with a warm pool of light. */
  private buildBedsideLamp(x: number, y: number): Phaser.GameObjects.Container {
    const c = this.add.container(x, y);
    const g = this.add.graphics();

    // table
    g.fillStyle(COLORS.shadow, 0.12);
    g.fillEllipse(0, 48, 52, 11);
    g.fillStyle(COLORS.woodDeep);
    g.fillRoundedRect(-24, 16, 48, 32, 4);
    g.fillStyle(COLORS.wood);
    g.fillRoundedRect(-27, 12, 54, 8, 4);
    g.lineStyle(LINE.thin, COLORS.outline, 0.85);
    g.strokeRoundedRect(-24, 16, 48, 32, 4);
    g.strokeRoundedRect(-27, 12, 54, 8, 4);
    g.lineStyle(LINE.hair, COLORS.outline, 0.4);
    g.lineBetween(-24, 30, 24, 30);

    // light spill
    g.fillStyle(COLORS.sun, 0.18);
    g.fillTriangle(-26, 12, 26, 12, 0, -18);

    // lamp
    g.lineStyle(3, COLORS.stoneDeep);
    g.lineBetween(0, 12, 0, -8);
    g.fillStyle(COLORS.sunDeep);
    g.fillTriangle(-17, -8, 17, -8, 11, -30);
    g.fillStyle(COLORS.sun);
    g.fillTriangle(-15, -9, 15, -9, 10, -28);
    g.lineStyle(LINE.thin, COLORS.outline, 0.85);
    g.strokePoints([
      new Phaser.Geom.Point(-17, -8),
      new Phaser.Geom.Point(-11, -30),
      new Phaser.Geom.Point(11, -30),
      new Phaser.Geom.Point(17, -8),
    ], true, true);

    c.add(g);
    return c;
  }

  // ---------- chore art ----------

  private drawBed(c: Phaser.GameObjects.Container, theme: typeof ROOM_THEMES[0], made: boolean): void {
    const g = this.add.graphics();

    shadow(g, -86, 26, 176, 16, 8, 3, 0.16);

    // frame + headboard
    g.fillStyle(COLORS.woodDeep);
    g.fillRoundedRect(-94, -34, 24, 66, 8);
    g.fillStyle(COLORS.wood);
    g.fillRoundedRect(-91, -31, 18, 60, 6);
    g.lineStyle(LINE.base, COLORS.outline, 0.85);
    g.strokeRoundedRect(-94, -34, 24, 66, 8);

    g.fillStyle(COLORS.wood);
    g.fillRoundedRect(-86, -6, 176, 38, 8);
    g.fillStyle(COLORS.woodDeep, 0.35);
    g.fillRect(-86, 20, 176, 12);
    g.lineStyle(LINE.base, COLORS.outline, 0.85);
    g.strokeRoundedRect(-86, -6, 176, 38, 8);

    // mattress
    g.fillStyle(COLORS.white);
    g.fillRoundedRect(-82, -14, 168, 30, 7);
    g.lineStyle(LINE.thin, COLORS.outline, 0.7);
    g.strokeRoundedRect(-82, -14, 168, 30, 7);

    if (made) {
      g.fillStyle(theme.duvet);
      g.fillRoundedRect(-46, -15, 132, 31, 8);
      // turned-down sheet
      g.fillStyle(COLORS.white, 0.95);
      g.fillRoundedRect(-46, -15, 132, 11, 5);
      g.fillStyle(theme.cushion, 0.6);
      g.fillRoundedRect(-46, -5, 132, 3, 1.5);
      g.lineStyle(LINE.thin, COLORS.outline, 0.7);
      g.strokeRoundedRect(-46, -15, 132, 31, 8);
      // pillow
      g.fillStyle(COLORS.white);
      g.fillRoundedRect(-82, -15, 44, 28, 11);
      g.lineStyle(LINE.thin, COLORS.outline, 0.7);
      g.strokeRoundedRect(-82, -15, 44, 28, 11);
      // folded throw at the foot
      g.fillStyle(theme.cushion);
      g.fillRoundedRect(46, -13, 38, 27, 7);
      g.fillStyle(COLORS.white, 0.28);
      g.fillRoundedRect(46, -13, 38, 9, 5);
      g.lineStyle(LINE.thin, COLORS.outline, 0.7);
      g.strokeRoundedRect(46, -13, 38, 27, 7);
    } else {
      g.fillStyle(theme.duvet, 0.9);
      g.fillRoundedRect(-30, -6, 62, 24, 9);
      g.fillRoundedRect(22, -16, 54, 28, 11);
      g.lineStyle(LINE.thin, COLORS.outline, 0.55);
      g.strokeRoundedRect(-30, -6, 62, 24, 9);
      g.strokeRoundedRect(22, -16, 54, 28, 11);
      g.fillStyle(COLORS.white, 0.92);
      g.fillRoundedRect(-78, -6, 34, 20, 8);
      g.strokeRoundedRect(-78, -6, 34, 20, 8);
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
      g.fillStyle(COLORS.grassDeep, 0.5);
      g.fillEllipse(-20, 18, 40, 12);
      g.fillStyle(COLORS.sun);
      g.fillCircle(22, -18, 11);
      g.fillStyle(COLORS.white, 0.9);
      g.fillCircle(-18, -20, 9);
      g.fillCircle(-8, -17, 7);
      // pulled-back curtains
      g.fillStyle(COLORS.roof);
      g.fillRoundedRect(-45, -35, 15, 70, 4);
      g.fillRoundedRect(30, -35, 15, 70, 4);
      g.lineStyle(LINE.thin, COLORS.outline, 0.7);
      g.strokeRoundedRect(-45, -35, 15, 70, 4);
      g.strokeRoundedRect(30, -35, 15, 70, 4);
    } else {
      g.fillStyle(COLORS.roof);
      g.fillRoundedRect(-45, -35, 44, 70, 4);
      g.fillRoundedRect(1, -35, 44, 70, 4);
      g.fillStyle(COLORS.roofDeep, 0.4);
      for (let i = 0; i < 4; i++) {
        g.fillRect(-42 + i * 11, -35, 4, 70);
        g.fillRect(4 + i * 11, -35, 4, 70);
      }
      g.lineStyle(LINE.thin, COLORS.outline, 0.7);
      g.strokeRoundedRect(-45, -35, 44, 70, 4);
      g.strokeRoundedRect(1, -35, 44, 70, 4);
    }

    // frame and rail on top of whatever is behind them
    g.lineStyle(LINE.base, COLORS.outline, 0.85);
    g.strokeRoundedRect(-52, -42, 104, 84, 8);
    g.strokeRoundedRect(-45, -35, 90, 70, 5);

    g.fillStyle(COLORS.woodDeep);
    g.fillRoundedRect(-58, -48, 116, 8, 4);
    g.lineStyle(LINE.hair, COLORS.outline, 0.85);
    g.strokeRoundedRect(-58, -48, 116, 8, 4);

    c.add(g);
  }

  private drawVase(c: Phaser.GameObjects.Container, hasFlowers: boolean): void {
    const g = this.add.graphics();

    shadow(g, -26, 34, 52, 12, 6, 3, 0.16);
    g.fillStyle(COLORS.woodDeep);
    g.fillRoundedRect(-22, 14, 44, 32, 5);
    g.fillStyle(COLORS.wood);
    g.fillRoundedRect(-27, 10, 54, 9, 4);
    g.lineStyle(LINE.thin, COLORS.outline, 0.85);
    g.strokeRoundedRect(-22, 14, 44, 32, 5);
    g.strokeRoundedRect(-27, 10, 54, 9, 4);

    g.fillStyle(COLORS.purple);
    g.fillRoundedRect(-11, -12, 22, 24, { tl: 4, tr: 4, bl: 9, br: 9 });
    g.fillStyle(COLORS.white, 0.3);
    g.fillRoundedRect(-11, -12, 8, 24, { tl: 4, tr: 0, bl: 8, br: 0 });
    g.lineStyle(LINE.thin, COLORS.outline, 0.85);
    g.strokeRoundedRect(-11, -12, 22, 24, { tl: 4, tr: 4, bl: 9, br: 9 });

    if (hasFlowers) {
      const colors = [COLORS.pink, COLORS.yellow, COLORS.white];
      [-9, 0, 9].forEach((dx, i) => {
        g.lineStyle(2.5, COLORS.grassDeep);
        g.beginPath();
        g.moveTo(dx * 0.4, -10);
        g.lineTo(dx, -28 - i * 4);
        g.strokePath();
        paintFlower(g, dx, -30 - i * 4, colors[i], 0.85);
      });
    }

    c.add(g);
  }

  private drawTowels(c: Phaser.GameObjects.Container, folded: boolean): void {
    const g = this.add.graphics();

    // A stool for them to sit on. Without it the pile floated against the wallpaper.
    g.fillStyle(COLORS.shadow, 0.12);
    g.fillEllipse(0, 44, 62, 12);
    g.fillStyle(COLORS.woodDeep);
    g.fillRoundedRect(-28, 22, 56, 20, 4);
    g.fillStyle(COLORS.wood);
    g.fillRoundedRect(-31, 18, 62, 9, 4);
    g.lineStyle(LINE.thin, COLORS.outline, 0.85);
    g.strokeRoundedRect(-28, 22, 56, 20, 4);
    g.strokeRoundedRect(-31, 18, 62, 9, 4);

    if (folded) {
      shadow(g, -26, 14, 52, 8, 4, 2, 0.14);
      const shades = [COLORS.white, 0xEFF5F8, COLORS.waterLight];
      shades.forEach((tone, i) => {
        g.fillStyle(tone);
        g.fillRoundedRect(-24 + i * 2, 8 - i * 11, 48 - i * 4, 10, 4);
        g.lineStyle(LINE.hair, COLORS.outline, 0.7);
        g.strokeRoundedRect(-24 + i * 2, 8 - i * 11, 48 - i * 4, 10, 4);
      });
      // a folded ribbon on the top towel, the way a hotel leaves them
      g.fillStyle(COLORS.pink);
      g.fillRect(-6, -14, 5, 10);
      g.lineStyle(1, COLORS.outline, 0.6);
      g.strokeRect(-6, -14, 5, 10);
    } else {
      // Previously a second graphics object was created in world coordinates, never
      // parented and never destroyed, so it stayed on screen as a stray white sliver.
      // a tumbled pile, not a pale smudge
      g.fillStyle(0xEFF5F8);
      g.fillRoundedRect(-24, 6, 40, 13, 6);
      g.lineStyle(LINE.thin, COLORS.outline, 0.7);
      g.strokeRoundedRect(-24, 6, 40, 13, 6);
      g.fillStyle(COLORS.waterLight);
      g.fillRoundedRect(-32, -4, 44, 15, 7);
      g.strokeRoundedRect(-32, -4, 44, 15, 7);
      g.fillStyle(COLORS.white);
      g.fillRoundedRect(-12, -14, 46, 15, 7);
      g.strokeRoundedRect(-12, -14, 46, 15, 7);
    }

    c.add(g);
  }

  private drawVacuum(c: Phaser.GameObjects.Container, cleaned: boolean): void {
    const g = this.add.graphics();

    if (cleaned) {
      // A clean patch of floor, with a couple of sparkles to say why it is clean.
      g.fillStyle(COLORS.white, 0.35);
      g.fillEllipse(0, 8, 116, 28);
      g.fillStyle(COLORS.white, 0.85);
      [[-30, 0], [8, 10], [32, -4]].forEach(([sx, sy]) => {
        g.fillTriangle(sx - 5, sy, sx + 5, sy, sx, sy - 9);
        g.fillTriangle(sx - 5, sy, sx + 5, sy, sx, sy + 9);
      });
    } else {
      g.fillStyle(COLORS.shadow, 0.18);
      const spots: [number, number, number][] = [
        [-46, 4, 6], [-24, 14, 4], [-6, -2, 7], [16, 12, 5], [38, 2, 6], [50, 16, 4],
      ];
      for (const [sx, sy, r] of spots) g.fillCircle(sx, sy, r);

      // vacuum body
      g.fillStyle(COLORS.roofDeep);
      g.fillRoundedRect(-17, -32, 34, 24, 9);
      g.fillStyle(COLORS.red);
      g.fillRoundedRect(-17, -32, 34, 15, 8);
      g.lineStyle(LINE.thin, COLORS.outline, 0.85);
      g.strokeRoundedRect(-17, -32, 34, 24, 9);
      g.fillStyle(COLORS.stoneDeep);
      g.fillRoundedRect(-3, -12, 6, 22, 3);
      g.fillStyle(COLORS.stone);
      g.fillRoundedRect(-15, 8, 30, 12, 5);
      g.lineStyle(LINE.thin, COLORS.outline, 0.85);
      g.strokeRoundedRect(-15, 8, 30, 12, 5);
    }

    c.add(g);

    if (cleaned || reduceMotion()) return;
    // The one hint of motion on an untouched chore: the vacuum handle rocks a little.
    this.tweens.add({
      targets: g,
      angle: { from: -2, to: 2 },
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }
}
