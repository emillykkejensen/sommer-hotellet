import Phaser from 'phaser';
import { COLORS, DEPTH, FONT, SIZE, text } from '../config';
import { drawCloud, drawFlower, drawSun, drawTree, gradientBand, shadow } from '../helpers/Draw';
import { addSceneTitle, addStarCounter } from '../ui/Chrome';
import { dur, press, reduceMotion, transition } from '../helpers/Motion';
import { gameState } from '../state/GameState';

interface Area {
  label: string;
  scene: string;
  color: number;
  x: number;
  y: number;
}

export class HotelMapScene extends Phaser.Scene {
  constructor() {
    super({ key: 'HotelMapScene' });
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.fadeIn(dur(260));

    gradientBand(this, 0, height * 0.62, COLORS.skyLight, COLORS.sky);
    gradientBand(this, height * 0.56, height * 0.44, COLORS.grassLight, COLORS.grassDeep);

    // Sun sits below y=140 so it never sits under the star counter.
    drawSun(this, width - 96, 148, 26);
    const cloud = drawCloud(this, 150, 120, 0.75);
    this.tweens.add({ targets: cloud, x: '+=110', duration: 16000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // path
    const path = this.add.graphics();
    path.fillStyle(COLORS.sandDeep, 0.55);
    path.fillRoundedRect(width / 2 - 34, height * 0.56, 68, height * 0.44, 6);
    path.fillStyle(COLORS.sand, 0.8);
    path.fillRoundedRect(width / 2 - 29, height * 0.56, 58, height * 0.44, 6);

    this.drawHotel(width / 2, height * 0.42);

    drawTree(this, 62, height * 0.66, 0.85);
    drawTree(this, width - 58, height * 0.63, 0.95);
    drawFlower(this, 150, height * 0.78, COLORS.pink, 0.75);
    drawFlower(this, width - 145, height * 0.8, COLORS.yellow, 0.75);
    drawFlower(this, 108, height * 0.9, COLORS.purple, 0.65);
    drawFlower(this, width - 100, height * 0.92, COLORS.white, 0.65);

    const areas: Area[] = [
      { label: 'Lobby',    scene: 'LobbyScene',   color: COLORS.orange, x: width / 2,       y: height * 0.55 },
      { label: 'Værelser', scene: 'RoomScene',    color: COLORS.purple, x: width / 2 - 212, y: height * 0.38 },
      { label: 'Køkken',   scene: 'KitchenScene', color: COLORS.red,    x: width / 2 + 212, y: height * 0.38 },
      { label: 'Pool',     scene: 'PoolScene',    color: COLORS.water,  x: width / 2 - 190, y: height * 0.79 },
      { label: 'Have',     scene: 'GardenScene',  color: COLORS.green,  x: width / 2 + 190, y: height * 0.79 },
    ];
    areas.forEach((a, i) => this.createAreaButton(a, i));

    addSceneTitle(this, 'Sommer Hotellet', '#B9584A');
    addStarCounter(this);
    this.addStatusStrip();
  }

  /** A one-line read on the hotel, so the map is not just five buttons. */
  private addStatusStrip(): void {
    const { width, height } = this.scale;
    const waiting = gameState.getWaitingGuests().length;
    const staying = gameState.getCheckedInGuests().length;
    const free = gameState.rooms.filter(r => r.guestId === null).length;

    const parts = [`${staying} gæster bor her`, `${free} ledige værelser`];
    if (waiting > 0) parts.push(`${waiting} venter i lobbyen`);

    const t = this.add.text(0, 0, parts.join('   ·   '), text(SIZE.label, '#5A4E42', 'semibold'))
      .setOrigin(0.5);
    const w = t.width + 30;
    const h = t.height + 14;

    const g = this.add.graphics();
    shadow(g, -w / 2, -h / 2, w, h, h / 2, 2, 0.12);
    g.fillStyle(COLORS.white, 0.9);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);

    this.add.container(width / 2, height - 28, [g, t]).setDepth(DEPTH.chrome);
  }

  private drawHotel(cx: number, cy: number): void {
    const g = this.add.graphics();

    shadow(g, cx - 158, cy - 82, 316, 184, 10, 7, 0.16);

    g.fillStyle(COLORS.wall);
    g.fillRoundedRect(cx - 158, cy - 82, 316, 184, 10);
    g.fillStyle(COLORS.wallDeep, 0.45);
    g.fillRoundedRect(cx + 112, cy - 82, 46, 184, { tl: 0, tr: 10, bl: 0, br: 10 });

    g.fillStyle(COLORS.roofDeep);
    g.fillTriangle(cx - 182, cy - 78, cx + 182, cy - 78, cx, cy - 162);
    g.fillStyle(COLORS.roof);
    g.fillTriangle(cx - 182, cy - 78, cx + 156, cy - 78, cx - 14, cy - 156);

    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 5; col++) {
        const wx = cx - 112 + col * 56;
        const wy = cy - 48 + row * 60;
        g.fillStyle(COLORS.window);
        g.fillRoundedRect(wx - 17, wy - 15, 34, 30, 5);
        g.fillStyle(COLORS.white, 0.5);
        g.fillRoundedRect(wx - 17, wy - 15, 15, 30, 5);
        g.lineStyle(2, COLORS.wallDeep);
        g.strokeRoundedRect(wx - 17, wy - 15, 34, 30, 5);
      }
    }

    g.fillStyle(COLORS.door);
    g.fillRoundedRect(cx - 24, cy + 52, 48, 50, { tl: 12, tr: 12, bl: 0, br: 0 });
    g.fillStyle(COLORS.sun);
    g.fillCircle(cx + 13, cy + 78, 3);

    const signW = 130;
    g.fillStyle(COLORS.white);
    g.fillRoundedRect(cx - signW / 2, cy - 140, signW, 30, 9);
    this.add.text(cx, cy - 125, 'HOTEL', {
      fontFamily: FONT,
      fontSize: '16px',
      color: '#C05B49',
      fontStyle: '700',
    }).setOrigin(0.5);
  }

  private createAreaButton(area: Area, index: number): void {
    const w = 132;
    const h = 46;
    const c = this.add.container(area.x, area.y).setDepth(DEPTH.dynamic);

    const g = this.add.graphics();
    shadow(g, -w / 2, -h / 2, w, h, h / 2, 3, 0.18);
    g.fillStyle(area.color);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    g.fillStyle(COLORS.white, 0.24);
    g.fillRoundedRect(-w / 2 + 3, -h / 2 + 3, w - 6, h * 0.42, h / 2);

    const label = this.add.text(0, 0, area.label, text(SIZE.heading, '#FFFFFF', 'bold')).setOrigin(0.5);

    c.add([g, label]);
    c.setSize(w, h);
    c.setInteractive({ useHandCursor: true });

    if (!reduceMotion()) {
      this.tweens.add({
        targets: c,
        y: area.y - 4,
        duration: 1800 + index * 220,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      c.on('pointerover', () => this.tweens.add({ targets: c, scale: 1.06, duration: 130 }));
      c.on('pointerout', () => this.tweens.add({ targets: c, scale: 1, duration: 130 }));
    }

    c.on('pointerdown', () => press(this, c, () => transition(this, area.scene), 0.92));
  }
}
