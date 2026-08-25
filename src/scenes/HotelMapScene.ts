import Phaser from 'phaser';
import { COLORS, DEPTH, FONT, INK_SOFT, SIZE, text } from '../config';
import { drawCloud, drawFlower, drawSun, drawTree, gradientBand, shadow } from '../helpers/Draw';
import { addBackButton, addSceneTitle, addStarCounter } from '../ui/Chrome';
import { dur, press, reduceMotion, transition } from '../helpers/Motion';
import { GuestAt, gameState } from '../state/GameState';
import { SHOP_ITEMS } from '../state/Shop';
import { tappable } from '../helpers/Draw';

interface Area {
  label: string;
  scene: string;
  color: number;
  x: number;
  y: number;
  /** Which guests are waiting for something here. */
  waitingAt: GuestAt[];
}

export class HotelMapScene extends Phaser.Scene {
  /** Rebuilt whenever the guest clock moves — badges and the status line. */
  private hud!: Phaser.GameObjects.Container;
  private areas: Area[] = [];

  constructor() {
    super({ key: 'HotelMapScene' });
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.fadeIn(dur(260));

    gradientBand(this, 0, height * 0.62, COLORS.skyLight, COLORS.sky);
    gradientBand(this, height * 0.56, height * 0.44, COLORS.grassLight, COLORS.grassDeep);

    // Sun sits below the star counter rather than under it.
    drawSun(this, width - 96, 150, 27);
    const cloud = drawCloud(this, 150, 118, 0.78);
    this.tweens.add({ targets: cloud, x: '+=110', duration: 16000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // path
    const path = this.add.graphics();
    path.fillStyle(COLORS.sandDeep, 0.55);
    path.fillRoundedRect(width / 2 - 34, height * 0.56, 68, height * 0.44, 6);
    path.fillStyle(COLORS.sand, 0.8);
    path.fillRoundedRect(width / 2 - 29, height * 0.56, 58, height * 0.44, 6);

    this.drawHotel(width / 2, height * 0.42);

    drawTree(this, 54, height * 0.66, 0.9);
    drawTree(this, width - 50, height * 0.63, 1);
    drawFlower(this, 138, height * 0.79, COLORS.pink, 0.8);
    drawFlower(this, width - 132, height * 0.81, COLORS.yellow, 0.8);
    drawFlower(this, 100, height * 0.91, COLORS.purple, 0.7);
    drawFlower(this, width - 92, height * 0.93, COLORS.white, 0.7);

    this.areas = [
      { label: 'Lobby', scene: 'LobbyScene', color: COLORS.orange,
        x: width / 2, y: height * 0.55, waitingAt: ['lobby', 'checkout'] },
      { label: 'Værelser', scene: 'RoomScene', color: COLORS.purple,
        x: width / 2 - 200, y: height * 0.37, waitingAt: ['room'] },
      { label: 'Køkken', scene: 'KitchenScene', color: COLORS.red,
        x: width / 2 + 200, y: height * 0.37, waitingAt: ['restaurant'] },
      { label: 'Pool', scene: 'PoolScene', color: COLORS.water,
        x: width / 2 - 178, y: height * 0.79, waitingAt: ['pool'] },
      { label: 'Have', scene: 'GardenScene', color: COLORS.green,
        x: width / 2 + 178, y: height * 0.79, waitingAt: [] },
    ];
    this.areas.forEach((a, i) => this.createAreaButton(a, i));

    // The map is one step in from the title screen, and there was no way back on screen —
    // only Android's hardware button, which a browser and a tablet do not have.
    addBackButton(this, 'MainMenuScene', 'Forside');

    addSceneTitle(this, 'Sommer Hotellet', '#B9584A');
    addStarCounter(this);
    this.addShopButton();
    this.addSettingsButton();

    this.hud = this.add.container(0, 0).setDepth(DEPTH.chrome - 1);
    this.refreshHud();

    // Guests keep living their day on the map too, so the badges stay honest.
    this.time.addEvent({
      delay: 500,
      loop: true,
      callback: () => {
        if (gameState.tickGuests()) this.refreshHud();
      },
    });
  }

  /** Entry to the star shop, sitting under the counter it spends from. */
  private addShopButton(): void {
    const x = this.scale.width - 74;
    const c = this.add.container(x, 86).setDepth(DEPTH.chrome);

    const w = 124;
    const h = 38;
    const g = this.add.graphics();
    shadow(g, -w / 2, -h / 2, w, h, h / 2, 2, 0.16);
    g.fillStyle(COLORS.sunDeep);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    g.fillStyle(COLORS.white, 0.22);
    g.fillRoundedRect(-w / 2 + 3, -h / 2 + 3, w - 6, h * 0.42, h / 2);
    c.add(g);
    c.add(this.add.text(0, 0, 'Butik', text(SIZE.label, '#FFFFFF', 'bold')).setOrigin(0.5));

    const unbought = SHOP_ITEMS.filter(i => !gameState.owns(i.id) && gameState.canAfford(i.cost));
    if (unbought.length > 0) {
      const dot = this.add.circle(w / 2 - 10, -h / 2 + 8, 7, COLORS.red);
      dot.setStrokeStyle(2, COLORS.white);
      c.add(dot);
      this.tweens.add({ targets: dot, scale: 1.25, duration: 700, yoyo: true, repeat: -1 });
    }

    tappable(this, c, w, h, () => transition(this, 'ShopScene'));
  }

  /** Small, quiet, and out of a child's way. */
  private addSettingsButton(): void {
    const c = this.add.container(56, 86).setDepth(DEPTH.chrome);

    const g = this.add.graphics();
    shadow(g, -38, -19, 76, 38, 19, 2, 0.14);
    g.fillStyle(COLORS.white, 0.9);
    g.fillRoundedRect(-38, -19, 76, 38, 19);
    c.add(g);
    c.add(this.add.text(0, 0, gameState.isLearning ? 'Lær' : 'Voksne',
      text(SIZE.label, INK_SOFT, 'bold')).setOrigin(0.5));

    if (gameState.isLearning) {
      const pip = this.add.circle(29, -12, 5, COLORS.green);
      pip.setStrokeStyle(1.5, COLORS.white);
      c.add(pip);
    }

    tappable(this, c, 76, 38, () => transition(this, 'SettingsScene'));
  }

  /**
   * Everything that changes while the player is standing on the map.
   *
   * A badge on an area means somebody in there is waiting for something, which is the only
   * way to find the guest who needs you without walking through all five rooms.
   */
  private refreshHud(): void {
    this.hud.removeAll(true);
    for (const area of this.areas) this.addAreaBadge(area);
    this.addStatusStrip();
  }

  private addAreaBadge(area: Area): void {
    const waiting = area.waitingAt.reduce((sum, at) => sum + this.waitingCount(at), 0);
    if (waiting === 0) return;

    const x = area.x + 62;
    const y = area.y - 24;
    const dot = this.add.circle(x, y, 15, COLORS.red).setStrokeStyle(3, COLORS.white);
    const label = this.add.text(x, y, `${waiting}`, text(SIZE.label, '#FFFFFF', 'bold'))
      .setOrigin(0.5);
    this.hud.add([dot, label]);

    if (!reduceMotion()) {
      this.tweens.add({ targets: dot, scale: 1.18, duration: 620, yoyo: true, repeat: -1 });
    }
  }

  private waitingCount(at: GuestAt): number {
    if (at === 'lobby') return gameState.getWaitingGuests().length;
    return gameState.guestsAt(at).filter(g => g.settledAt === null).length;
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

    this.hud.add(this.add.container(width / 2, height - 26, [g, t]));
  }

  private drawHotel(cx: number, cy: number): void {
    const g = this.add.graphics();

    shadow(g, cx - 146, cy - 76, 292, 170, 10, 7, 0.16);

    g.fillStyle(COLORS.wall);
    g.fillRoundedRect(cx - 146, cy - 76, 292, 170, 10);
    g.fillStyle(COLORS.wallDeep, 0.45);
    g.fillRoundedRect(cx + 104, cy - 76, 42, 170, { tl: 0, tr: 10, bl: 0, br: 10 });

    g.fillStyle(COLORS.roofDeep);
    g.fillTriangle(cx - 168, cy - 72, cx + 168, cy - 72, cx, cy - 150);
    g.fillStyle(COLORS.roof);
    g.fillTriangle(cx - 168, cy - 72, cx + 144, cy - 72, cx - 13, cy - 144);

    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 5; col++) {
        const wx = cx - 104 + col * 52;
        const wy = cy - 44 + row * 56;
        g.fillStyle(COLORS.window);
        g.fillRoundedRect(wx - 16, wy - 14, 32, 28, 5);
        g.fillStyle(COLORS.white, 0.5);
        g.fillRoundedRect(wx - 16, wy - 14, 14, 28, 5);
        g.lineStyle(2, COLORS.wallDeep);
        g.strokeRoundedRect(wx - 16, wy - 14, 32, 28, 5);
      }
    }

    g.fillStyle(COLORS.door);
    g.fillRoundedRect(cx - 24, cy + 46, 48, 48, { tl: 12, tr: 12, bl: 0, br: 0 });
    g.fillStyle(COLORS.sun);
    g.fillCircle(cx + 13, cy + 72, 3);

    const signW = 138;
    g.fillStyle(COLORS.white);
    g.fillRoundedRect(cx - signW / 2, cy - 130, signW, 32, 9);
    this.add.text(cx, cy - 114, 'HOTEL', {
      fontFamily: FONT,
      fontSize: '18px',
      color: '#C05B49',
      fontStyle: '700',
    }).setOrigin(0.5);
  }

  private createAreaButton(area: Area, index: number): void {
    const w = 142;
    const h = 50;
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
