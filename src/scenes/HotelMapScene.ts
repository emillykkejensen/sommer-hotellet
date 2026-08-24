import Phaser from 'phaser';
import { COLORS, DEPTH, FONT, LINE, SIZE, text } from '../config';
import {
  addBirds, badge, bunting, drawBalloon, drawCloud, drawPalm, drawStarShape,
  drawSun, drawTree, gradientBand, paintFlower, plate, shade, shadow, sheen,
} from '../helpers/Draw';
import { addSceneTitle, addSoundToggle, addStarCounter } from '../ui/Chrome';
import { bob, dur, popIn, reduceMotion, transition } from '../helpers/Motion';
import { flatten } from '../helpers/Flatten';
import { sfx } from '../helpers/AudioManager';
import { Area, gameState } from '../state/GameState';

interface AreaSpec {
  label: string;
  area: Area;
  scene: string;
  color: number;
  x: number;
  y: number;
  icon: (g: Phaser.GameObjects.Graphics) => void;
}

export class HotelMapScene extends Phaser.Scene {
  constructor() {
    super({ key: 'HotelMapScene' });
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.fadeIn(dur(260));

    const horizon = height * 0.56;

    // Static scenery, baked to one texture. See helpers/Flatten.
    const scenery = this.add.container(0, 0);
    scenery.add(gradientBand(this, 0, horizon + 4, COLORS.skyLight, COLORS.sky));
    scenery.add(this.drawHills(horizon));
    scenery.add(gradientBand(this, horizon, height - horizon, COLORS.grassLight, COLORS.grassDeep));
    scenery.add(this.drawPath(horizon));
    scenery.add(drawTree(this, 56, horizon + 32, 0.9));

    const beds = this.add.graphics();
    paintFlower(beds, 146, height * 0.78, COLORS.pink, 0.75);
    paintFlower(beds, width - 148, height * 0.8, COLORS.yellow, 0.75);
    paintFlower(beds, 104, height * 0.9, COLORS.purple, 0.65);
    paintFlower(beds, width - 96, height * 0.92, COLORS.white, 0.65);
    scenery.add(beds);

    // Added before the hotel so the string passes behind the building rather than
    // across its roof and sign.
    scenery.add(bunting(this, 20, 140, width - 20, 148, 13, 14));
    scenery.add(this.drawHotel(width / 2, height * 0.4));
    flatten(this, scenery, DEPTH.background);

    // Live scenery. Sun sits below y=140 so it never sits under the star counter.
    drawSun(this, width - 96, 158, 28);
    addBirds(this, 3, 96, 46);

    const cloud = drawCloud(this, 150, 118, 0.75);
    if (!reduceMotion()) {
      this.tweens.add({ targets: cloud, x: '+=110', duration: 16000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    drawPalm(this, width - 52, horizon + 46, 1.05);
    drawBalloon(this, 122, 214, COLORS.teal, 0.75);

    const areas: AreaSpec[] = [
      {
        label: 'Lobby', area: 'lobby', scene: 'LobbyScene', color: COLORS.orange,
        x: width / 2, y: height * 0.55, icon: g => this.iconBell(g),
      },
      {
        label: 'Værelser', area: 'rooms', scene: 'RoomScene', color: COLORS.purple,
        x: width / 2 - 212, y: height * 0.38, icon: g => this.iconBed(g),
      },
      {
        label: 'Køkken', area: 'kitchen', scene: 'KitchenScene', color: COLORS.red,
        x: width / 2 + 212, y: height * 0.38, icon: g => this.iconPot(g),
      },
      {
        label: 'Pool', area: 'pool', scene: 'PoolScene', color: COLORS.water,
        x: width / 2 - 190, y: height * 0.79, icon: g => this.iconWave(g),
      },
      {
        label: 'Have', area: 'garden', scene: 'GardenScene', color: COLORS.green,
        x: width / 2 + 190, y: height * 0.79, icon: g => this.iconLeaf(g),
      },
    ];
    areas.forEach((a, i) => this.createAreaButton(a, i));

    addSceneTitle(this, 'Sommer Hotellet', COLORS.roof);
    addStarCounter(this);
    addSoundToggle(this, width - 266);
    this.addStatusStrip();
  }

  private drawHills(horizon: number): Phaser.GameObjects.Graphics {
    const { width } = this.scale;
    const g = this.add.graphics();
    g.fillStyle(shade(COLORS.grass, 0.28));
    g.fillEllipse(width * 0.18, horizon + 12, width * 0.7, 170);
    g.fillStyle(shade(COLORS.grass, 0.18));
    g.fillEllipse(width * 0.86, horizon + 18, width * 0.56, 140);
    return g;
  }

  /**
   * The path up to the front door.
   *
   * Tapered — narrow where it meets the door, wide at the bottom of the screen. Drawn as
   * a straight-sided column it read as a pillar holding the hotel up.
   */
  private drawPath(horizon: number): Phaser.GameObjects.Graphics {
    const { width, height } = this.scale;
    const g = this.add.graphics();
    const cx = width / 2;
    const topHalf = 30;
    const botHalf = 74;

    const edge = (y: number) =>
      topHalf + (botHalf - topHalf) * ((y - horizon) / (height - horizon));

    g.fillStyle(COLORS.sandDeep);
    g.fillPoints([
      new Phaser.Geom.Point(cx - topHalf - 5, horizon),
      new Phaser.Geom.Point(cx + topHalf + 5, horizon),
      new Phaser.Geom.Point(cx + botHalf + 6, height),
      new Phaser.Geom.Point(cx - botHalf - 6, height),
    ], true);
    g.fillStyle(COLORS.sand);
    g.fillPoints([
      new Phaser.Geom.Point(cx - topHalf, horizon),
      new Phaser.Geom.Point(cx + topHalf, horizon),
      new Phaser.Geom.Point(cx + botHalf, height),
      new Phaser.Geom.Point(cx - botHalf, height),
    ], true);

    // Paving joints, spaced further apart as the path widens towards the viewer.
    g.lineStyle(LINE.thin, COLORS.sandDeep, 0.85);
    let y = horizon + 22;
    let step = 26;
    let row = 0;
    while (y < height) {
      const half = edge(y);
      g.lineBetween(cx - half, y, cx + half, y);
      const offset = row % 2 === 0 ? -half * 0.35 : half * 0.35;
      g.lineBetween(cx + offset, y, cx + offset, Math.min(height, y + step));
      y += step;
      step += 5;
      row++;
    }

    return g;
  }

  /**
   * A one-line read on the hotel, so the map is not just five buttons.
   *
   * Now a proper plaque with a star on it rather than a floating grey sentence.
   */
  private addStatusStrip(): void {
    const { width, height } = this.scale;
    const waiting = gameState.getWaitingGuests().length;
    const staying = gameState.getCheckedInGuests().length;
    const free = gameState.rooms.filter(r => r.guestId === null).length;

    const parts = [`${staying} gæster bor her`, `${free} ledige værelser`];
    if (waiting > 0) parts.push(`${waiting} venter i lobbyen`);

    const t = this.add.text(0, 0, parts.join('   ·   '), text(SIZE.label, '#5A4E42', 'bold'))
      .setOrigin(0.5);
    const w = t.width + 60;
    const h = t.height + 18;
    t.setX(11);

    const g = this.add.graphics();
    shadow(g, -w / 2, -h / 2, w, h, h / 2, 3, 0.18);
    plate(g, -w / 2, -h / 2, w, h, h / 2, COLORS.cream, 0.97, LINE.thin);
    drawStarShape(g, -w / 2 + 22, 0, 12);

    const c = this.add.container(width / 2, height - 30, [g, t]).setDepth(DEPTH.chrome);
    popIn(this, c, 400);
    bob(this, c, 3, 3000, 700);
  }

  private drawHotel(cx: number, cy: number): Phaser.GameObjects.Container {
    const c = this.add.container(0, 0);
    const g = this.add.graphics();
    const w = 320;
    const h = 190;
    const left = cx - w / 2;
    const top = cy - 84;

    shadow(g, left, top, w, h, 12, 8, 0.2);

    g.fillStyle(COLORS.wall);
    g.fillRoundedRect(left, top, w, h, 12);
    g.fillStyle(COLORS.wallDeep, 0.5);
    g.fillRoundedRect(cx + 112, top, 48, h, { tl: 0, tr: 12, bl: 0, br: 12 });
    g.lineStyle(LINE.thick, COLORS.outline, 0.9);
    g.strokeRoundedRect(left, top, w, h, 12);

    g.fillStyle(COLORS.roofDeep);
    g.fillTriangle(cx - 186, top + 4, cx + 186, top + 4, cx, cy - 166);
    g.fillStyle(COLORS.roof);
    g.fillTriangle(cx - 186, top + 4, cx + 158, top + 4, cx - 14, cy - 160);
    g.lineStyle(LINE.thick, COLORS.outline, 0.9);
    g.beginPath();
    g.moveTo(cx - 186, top + 4);
    g.lineTo(cx, cy - 166);
    g.lineTo(cx + 186, top + 4);
    g.closePath();
    g.strokePath();

    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 5; col++) {
        const wx = cx - 116 + col * 58;
        const wy = cy - 48 + row * 62;
        g.fillStyle(COLORS.window);
        g.fillRoundedRect(wx - 18, wy - 16, 36, 32, 6);
        g.fillStyle(COLORS.white, 0.55);
        g.fillRoundedRect(wx - 18, wy - 16, 16, 32, 6);
        g.lineStyle(LINE.base, COLORS.outline, 0.85);
        g.strokeRoundedRect(wx - 18, wy - 16, 36, 32, 6);
        g.fillStyle(COLORS.roof);
        g.fillRoundedRect(wx - 20, wy + 15, 40, 7, 3);
      }
    }

    g.fillStyle(COLORS.door);
    g.fillRoundedRect(cx - 25, cy + 52, 50, 54, { tl: 14, tr: 14, bl: 0, br: 0 });
    g.lineStyle(LINE.base, COLORS.outline, 0.9);
    g.strokeRoundedRect(cx - 25, cy + 52, 50, 54, { tl: 14, tr: 14, bl: 0, br: 0 });
    g.fillStyle(COLORS.sun);
    g.fillCircle(cx + 14, cy + 80, 3.5);

    const signW = 138;
    const signY = cy - 148;
    g.fillStyle(COLORS.cream);
    g.fillRoundedRect(cx - signW / 2, signY, signW, 32, 9);
    g.lineStyle(LINE.base, COLORS.outline, 0.9);
    g.strokeRoundedRect(cx - signW / 2, signY, signW, 32, 9);
    c.add(g);
    c.add(this.add.text(cx, signY + 16, 'HOTEL', {
      fontFamily: FONT,
      fontSize: '17px',
      color: '#B55345',
      fontStyle: '700',
    }).setOrigin(0.5));
    return c;
  }

  /**
   * An area sign.
   *
   * The old version was a coloured pill with a word on it — five of them, identical
   * apart from hue, telling a child nothing about what was inside or whether anything
   * there needed doing. Each one now carries its own icon and a badge counting the jobs
   * waiting in that area, or a green tick when there is nothing left to do.
   */
  private createAreaButton(spec: AreaSpec, index: number): void {
    const w = 166;
    const h = 56;
    const lip = 6;
    const c = this.add.container(spec.x, spec.y).setDepth(DEPTH.dynamic);

    const base = this.add.graphics();
    shadow(base, -w / 2, -h / 2, w, h + lip, 16, 4, 0.22);
    plate(base, -w / 2, -h / 2 + lip, w, h, 16, shade(spec.color, -0.28), 1, LINE.thick);
    c.add(base);

    const face = this.add.container(0, 0);
    const g = this.add.graphics();
    plate(g, -w / 2, -h / 2, w, h, 16, spec.color, 1, LINE.thick);
    sheen(g, -w / 2, -h / 2, w, h, 14, 0.26);

    // icon in a pale disc, so the glyph reads against any of the five hues
    g.fillStyle(COLORS.cream, 0.95);
    g.fillCircle(-w / 2 + 28, 0, 19);
    g.lineStyle(LINE.thin, COLORS.outline, 0.8);
    g.strokeCircle(-w / 2 + 28, 0, 19);
    face.add(g);

    const icon = this.add.graphics().setPosition(-w / 2 + 28, 0);
    spec.icon(icon);
    face.add(icon);

    const label = this.add.text(22, 0, spec.label, text(SIZE.heading, '#FFFFFF', 'bold')).setOrigin(0.5);
    label.setShadow(0, 2, 'rgba(74,58,44,0.5)', 0, false, true);
    face.add(label);
    c.add(face);

    const todo = gameState.todoIn(spec.area);
    if (todo > 0) {
      const b = badge(this, w / 2 - 6, -h / 2 - 2, `${todo}`, COLORS.red);
      c.add(b);
      if (!reduceMotion()) {
        this.tweens.add({
          targets: b,
          scale: 1.14,
          duration: 780,
          yoyo: true,
          repeat: -1,
          delay: index * 160,
          ease: 'Sine.easeInOut',
        });
      }
    } else {
      const done = this.add.graphics().setPosition(w / 2 - 6, -h / 2 - 2);
      done.fillStyle(COLORS.shadow, 0.2);
      done.fillCircle(1, 2.5, 14);
      done.fillStyle(COLORS.green);
      done.fillCircle(0, 0, 14);
      done.lineStyle(LINE.base, COLORS.outline);
      done.strokeCircle(0, 0, 14);
      done.lineStyle(3, COLORS.white, 1);
      done.beginPath();
      done.moveTo(-5.5, 0);
      done.lineTo(-2, 4.5);
      done.lineTo(6, -4.5);
      done.strokePath();
      c.add(done);
    }

    c.setSize(w, h + lip);
    c.setInteractive({ useHandCursor: true });

    popIn(this, c, 120 + index * 80, 0.5);

    if (!reduceMotion()) {
      // Starts after the entrance pop, or the two fight over y.
      this.time.delayedCall(120 + index * 80 + 360, () => {
        if (!c.active) return;
        this.tweens.add({
          targets: c,
          y: spec.y - 5,
          duration: 1900 + index * 220,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      });
      c.on('pointerover', () => this.tweens.add({ targets: c, scale: 1.07, duration: 130, ease: 'Back.easeOut' }));
      c.on('pointerout', () => this.tweens.add({ targets: c, scale: 1, duration: 130 }));
    }

    c.on('pointerdown', () => {
      sfx('click');
      if (reduceMotion()) {
        transition(this, spec.scene);
        return;
      }
      this.tweens.add({
        targets: face,
        y: lip,
        duration: 70,
        yoyo: true,
        onComplete: () => transition(this, spec.scene),
      });
    });
  }

  // ---------- area icons ----------

  private iconBell(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(COLORS.stone);
    g.fillRoundedRect(-11, 6, 22, 4, 2);
    g.fillStyle(COLORS.sunDeep);
    g.fillCircle(0, 0, 10);
    g.fillStyle(COLORS.sun);
    g.fillCircle(-0.5, -1, 8.5);
    g.fillStyle(COLORS.white, 0.6);
    g.fillEllipse(-3, -4, 5, 3);
    g.fillStyle(COLORS.sunDeep);
    g.fillCircle(0, -11, 3);
    g.lineStyle(LINE.hair, COLORS.outline, 0.85);
    g.strokeCircle(0, 0, 10);
  }

  private iconBed(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(COLORS.wood);
    g.fillRoundedRect(-13, -1, 26, 9, 3);
    g.fillStyle(COLORS.woodDeep);
    g.fillRoundedRect(-14, -8, 5, 16, 2);
    g.fillStyle(COLORS.pink);
    g.fillRoundedRect(-4, -5, 17, 8, 3);
    g.fillStyle(COLORS.white);
    g.fillRoundedRect(-9, -5, 7, 6, 2.5);
    g.lineStyle(LINE.hair, COLORS.outline, 0.85);
    g.strokeRoundedRect(-13, -1, 26, 9, 3);
    g.strokeRoundedRect(-4, -5, 17, 8, 3);
  }

  private iconPot(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(0x827D78);
    g.fillRoundedRect(-10, -3, 20, 13, { tl: 2, tr: 2, bl: 5, br: 5 });
    g.fillStyle(0x5C5854);
    g.fillRoundedRect(-12, -6, 24, 4, 2);
    g.lineStyle(LINE.hair, COLORS.outline, 0.85);
    g.strokeRoundedRect(-10, -3, 20, 13, { tl: 2, tr: 2, bl: 5, br: 5 });
    g.fillStyle(COLORS.white, 0.7);
    g.fillCircle(-4, -11, 3);
    g.fillCircle(2, -13, 2.4);
  }

  private iconWave(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(COLORS.water);
    g.fillCircle(0, 0, 11);
    g.fillStyle(COLORS.waterLight);
    g.fillCircle(0, 0, 11);
    g.lineStyle(2.4, COLORS.waterDeep, 0.9);
    [-4, 1, 6].forEach(dy => {
      g.beginPath();
      g.moveTo(-9, dy);
      for (let x = -9; x <= 9; x += 3) g.lineTo(x, dy + Math.sin(x * 0.55) * 2);
      g.strokePath();
    });
    g.lineStyle(LINE.hair, COLORS.outline, 0.85);
    g.strokeCircle(0, 0, 11);
  }

  private iconLeaf(g: Phaser.GameObjects.Graphics): void {
    g.lineStyle(2.2, COLORS.grassDeep);
    g.beginPath();
    g.moveTo(0, 11);
    g.lineTo(0, 1);
    g.strokePath();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      g.fillStyle(COLORS.pink);
      g.fillCircle(Math.cos(a) * 5.5, Math.sin(a) * 5.5 - 2, 5);
      g.lineStyle(1.2, COLORS.outline, 0.6);
      g.strokeCircle(Math.cos(a) * 5.5, Math.sin(a) * 5.5 - 2, 5);
    }
    g.fillStyle(COLORS.sun);
    g.fillCircle(0, -2, 3.4);
  }
}
