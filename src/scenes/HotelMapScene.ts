import Phaser from 'phaser';
import { COLORS, DEPTH, FONT, INK, INK_SOFT, LINE, SIZE, text } from '../config';
import {
  addBirds, badge, bunting, drawBalloon, drawCloud, drawHead, drawPalm, drawStarShape, drawSun,
  drawTree, gradientBand, paintFlower, plate, shade, shadow, sheen, tappable,
} from '../helpers/Draw';
import { addBackButton, addSceneTitle, addStarCounter } from '../ui/Chrome';
import { bob, dur, popIn, reduceMotion, transition } from '../helpers/Motion';
import { flatten } from '../helpers/Flatten';
import { audio } from '../helpers/Audio';
import { BOUTIQUE_ID, Destination, GuestData, gameState } from '../state/GameState';
import { SHOP_ITEMS } from '../state/Shop';
import {
  IconPainter, paintBed, paintBell, paintBoutique, paintGardenFlower, paintPlate,
  paintWaves,
} from '../objects/Icons';
import { playerTag } from '../ui/Players';

interface Area {
  label: string;
  scene: string;
  color: number;
  x: number;
  y: number;
  /** How many guests need the player in there right now. */
  waiting: () => number;
  /** The guests' destination this area is, if any — followers point at it. */
  destination: Destination | null;
  icon: IconPainter;
  /**
   * Which side of the sign a guest waiting to be taken in stands on. Left, unless that would
   * put them on another sign — the boutique sits between the pool and the garden.
   */
  followersAbove?: boolean;
}

/** How wide an area sign is. Wide enough for "Restaurant" next to its icon. */
const AREA_W = 176;

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

    const horizon = height * 0.56;

    // Static scenery, baked to one texture. See helpers/Flatten.
    const scenery = this.add.container(0, 0);
    scenery.add(gradientBand(this, 0, horizon + 4, COLORS.skyLight, COLORS.sky));
    scenery.add(this.drawHills(horizon));
    scenery.add(gradientBand(this, horizon, height - horizon, COLORS.grassLight, COLORS.grassDeep));
    scenery.add(this.drawPath(horizon));
    scenery.add(drawTree(this, 52, horizon + 34, 0.9));

    const beds = this.add.graphics();
    paintFlower(beds, 132, height * 0.79, COLORS.pink, 0.8);
    paintFlower(beds, width - 128, height * 0.81, COLORS.yellow, 0.8);
    paintFlower(beds, 96, height * 0.91, COLORS.purple, 0.7);
    paintFlower(beds, width - 88, height * 0.93, COLORS.white, 0.7);
    scenery.add(beds);

    // Added before the hotel so the string passes behind the building rather than across
    // its roof and sign.
    scenery.add(bunting(this, 16, 132, width - 16, 140, 12, 13));
    scenery.add(this.drawHotel(width / 2, height * 0.42));
    flatten(this, scenery, DEPTH.background);

    // Live scenery, clear of the shop button in the top right.
    drawSun(this, width - 62, 196, 26);
    addBirds(this, 3, 92, 42);
    drawPalm(this, width - 46, horizon + 48, 1);
    drawBalloon(this, 112, 226, COLORS.teal, 0.72);

    const cloud = drawCloud(this, 140, 112, 0.78);
    if (!reduceMotion()) {
      this.tweens.add({ targets: cloud, x: '+=110', duration: 16000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    // Each sign carries the same word and the same picture the guests use for the place, so
    // a guest who wants "restauranten" — and shows a plate — sends you to the plate.
    const needs = (at: GuestData['at']) => () =>
      gameState.guestsAt(at).filter(g => gameState.needsPlayer(g)).length;
    this.areas = [
      { label: 'Lobby', scene: 'LobbyScene', color: COLORS.orange,
        x: width / 2, y: height * 0.55, destination: 'checkout', icon: paintBell,
        waiting: () => gameState.lobbyGuests().length + gameState.guestsAt('checkout').length },
      { label: 'Værelser', scene: 'RoomScene', color: COLORS.purple,
        x: width / 2 - 200, y: height * 0.37, destination: 'room', icon: paintBed,
        waiting: needs('room') },
      { label: 'Restaurant', scene: 'KitchenScene', color: COLORS.red,
        x: width / 2 + 200, y: height * 0.37, destination: 'restaurant', icon: paintPlate,
        waiting: needs('restaurant') },
      { label: 'Pool', scene: 'PoolScene', color: COLORS.water,
        x: width / 2 - 190, y: height * 0.79, destination: 'pool', icon: paintWaves,
        waiting: needs('pool') },
      { label: 'Have', scene: 'GardenScene', color: COLORS.green,
        x: width / 2 + 190, y: height * 0.79, destination: null, icon: paintGardenFlower,
        waiting: () => 0 },
    ];
    if (gameState.owns(BOUTIQUE_ID)) {
      this.areas.push({ label: 'Tøjbutik', scene: 'BoutiqueScene', color: COLORS.pink,
        x: width / 2, y: height * 0.79, destination: 'boutique', followersAbove: true,
        icon: (g, s) => paintBoutique(g, (s ?? 1) * 1.15),
        waiting: needs('boutique') });
    }
    this.areas.forEach((a, i) => this.createAreaButton(a, i));

    // The map is one step in from the title screen, and there was no way back on screen —
    // only Android's hardware button, which a browser and a tablet do not have.
    const back = addBackButton(this, 'MainMenuScene', 'Forside');

    const title = addSceneTitle(this, 'Sommer Hotellet', COLORS.roof);
    this.addPlayerTag(back, title);
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

  private drawHills(horizon: number): Phaser.GameObjects.Graphics {
    const { width } = this.scale;
    const g = this.add.graphics();
    g.fillStyle(shade(COLORS.grass, 0.28));
    g.fillEllipse(width * 0.18, horizon + 12, width * 0.7, 160);
    g.fillStyle(shade(COLORS.grass, 0.18));
    g.fillEllipse(width * 0.86, horizon + 18, width * 0.56, 132);
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
    const topHalf = 28;
    const botHalf = 68;

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
    let y = horizon + 20;
    let step = 24;
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
   * Whose hotel this is: the player's animal and name, right beside the way back to the
   * cards. Two siblings taking turns otherwise have no way to tell their hotels apart.
   * It fills the gap between the back button and the title, and shrinks a long name to fit.
   */
  private addPlayerTag(back: Phaser.GameObjects.Container, title: Phaser.GameObjects.Container): void {
    const profile = gameState.profile;
    if (!profile) return;
    const left = back.x + back.width / 2 + 8;
    const titleLeft = title.x - (title.width * title.scaleX) / 2;
    playerTag(this, profile, left, back.y, titleLeft - 8 - left).setDepth(DEPTH.chrome);
  }

  /** Entry to the star shop, sitting under the counter it spends from. */
  private addShopButton(): void {
    const w = 156;
    const h = 38;
    const lip = 4;
    const c = this.add.container(this.scale.width - 90, 98).setDepth(DEPTH.chrome);

    const g = this.add.graphics();
    shadow(g, -w / 2, -h / 2, w, h + lip, h / 2, 3, 0.2);
    plate(g, -w / 2, -h / 2 + lip, w, h, h / 2, shade(COLORS.sunDeep, -0.3), 1, LINE.thin);
    plate(g, -w / 2, -h / 2, w, h, h / 2, COLORS.sunDeep, 1, LINE.base);
    sheen(g, -w / 2, -h / 2, w, h, h / 2, 0.28);
    c.add(g);

    const t = this.add.text(12, 0, 'Stjernebutik', text(SIZE.label, '#FFFFFF', 'bold')).setOrigin(0.5);
    t.setShadow(0, 1.5, 'rgba(74,58,44,0.5)', 0, false, true);
    c.add(t);

    const star = this.add.graphics().setPosition(-w / 2 + 24, 0);
    drawStarShape(star, 0, 0, 11);
    c.add(star);

    const unbought = SHOP_ITEMS.filter(i => !gameState.owns(i.id) && gameState.canAfford(i.cost));
    if (unbought.length > 0) {
      const dot = badge(this, w / 2 - 6, -h / 2 - 2, `${unbought.length}`, COLORS.red);
      c.add(dot);
      if (!reduceMotion()) {
        this.tweens.add({ targets: dot, scale: 1.18, duration: 700, yoyo: true, repeat: -1 });
      }
    }

    tappable(this, c, w, h + lip, () => transition(this, 'ShopScene'), 'tap');
  }

  /** Small, quiet, and out of a child's way. */
  private addSettingsButton(): void {
    const w = 82;
    const h = 36;
    const c = this.add.container(58, 98).setDepth(DEPTH.chrome);

    const g = this.add.graphics();
    shadow(g, -w / 2, -h / 2, w, h, h / 2, 2, 0.16);
    plate(g, -w / 2, -h / 2, w, h, h / 2, COLORS.cream, 0.95, LINE.thin);
    c.add(g);
    c.add(this.add.text(0, 0, gameState.isLearning ? 'Lær' : 'Voksne',
      text(SIZE.label, INK_SOFT, 'bold')).setOrigin(0.5));

    if (gameState.isLearning) {
      const pip = this.add.graphics().setPosition(w / 2 - 9, -h / 2 + 6);
      pip.fillStyle(COLORS.green);
      pip.fillCircle(0, 0, 6);
      pip.lineStyle(LINE.hair, COLORS.outline, 0.85);
      pip.strokeCircle(0, 0, 6);
      c.add(pip);
    }

    tappable(this, c, w, h, () => transition(this, 'SettingsScene'), 'tap');
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
    this.addFollowers();
    this.addStatusStrip();
  }

  /**
   * The guests walking with the player, standing by the sign of the place they want to go.
   *
   * This is the whole of the navigation for a child leading a guest: find the face, tap
   * the sign it is pointing at.
   */
  private addFollowers(): void {
    const byArea = new Map<Area, GuestData[]>();
    for (const guest of gameState.followers()) {
      const area = this.areas.find(a => a.destination !== null && a.destination === guest.heading);
      if (!area) continue;
      byArea.set(area, [...(byArea.get(area) ?? []), guest]);
    }

    for (const [area, guests] of byArea) {
      guests.forEach((guest, i) => {
        const x = area.followersAbove
          ? area.x + (i - (guests.length - 1) / 2) * 44
          : area.x - AREA_W / 2 - 30 - i * 44;
        const y = area.followersAbove ? area.y - 62 : area.y - 2;
        const c = this.add.container(x, y);
        const g = this.add.graphics();
        shadow(g, -20, -20, 40, 40, 20, 3, 0.2);
        plate(g, -20, -20, 40, 40, 20, COLORS.white, 1, LINE.base);
        c.add(g);
        c.add(drawHead(this, 0, 8, guest.color, 0.9, guest.id, guest.wearing));
        this.hud.add(c);
        if (!reduceMotion()) {
          this.tweens.add({ targets: c, x: x + 7, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        }
      });

      // a ring round the sign they are waiting to go through
      const ring = this.add.graphics().setPosition(area.x, area.y);
      ring.lineStyle(4, COLORS.sun, 0.9);
      ring.strokeRoundedRect(-AREA_W / 2 - 8, -34, AREA_W + 16, 72, 22);
      this.hud.add(ring);
      if (!reduceMotion()) {
        this.tweens.add({ targets: ring, alpha: 0.25, duration: 600, yoyo: true, repeat: -1 });
      }

    }
  }

  private addAreaBadge(area: Area): void {
    const waiting = area.waiting();
    if (waiting === 0) return;

    const x = area.x + 78;
    const y = area.y - 26;

    // Disc and label go into the hud as siblings rather than inside a container: the test
    // harness reads badges as the top-level Text objects here, and the status strip below
    // stays nested precisely so it is not mistaken for one.
    const disc = this.add.graphics().setPosition(x, y);
    disc.fillStyle(COLORS.shadow, 0.2);
    disc.fillCircle(1, 2.5, 15);
    disc.fillStyle(COLORS.red);
    disc.fillCircle(0, 0, 15);
    disc.fillStyle(COLORS.white, 0.3);
    disc.fillCircle(-4, -5, 6);
    disc.lineStyle(LINE.base, COLORS.outline);
    disc.strokeCircle(0, 0, 15);

    const label = this.add.text(x, y, `${waiting}`, text(SIZE.label, '#FFFFFF', 'bold'))
      .setOrigin(0.5);
    label.setShadow(0, 1.5, 'rgba(74,58,44,0.5)', 0, false, true);

    this.hud.add([disc, label]);

    if (!reduceMotion()) {
      this.tweens.add({ targets: [disc, label], scale: 1.18, duration: 620, yoyo: true, repeat: -1 });
    }
  }

  /**
   * A one-line read on the hotel, so the map is not just five buttons.
   *
   * A proper plaque with a star on it rather than a floating grey sentence.
   */
  private addStatusStrip(): void {
    const { width, height } = this.scale;
    const waiting = gameState.getWaitingGuests().length;
    const staying = gameState.getCheckedInGuests().length;
    const free = gameState.rooms.slice(0, gameState.roomCount).filter(r => r.guestId === null).length;

    const following = gameState.followers().length;
    const parts = [`${staying} gæster bor her`, `${free} ledige værelser`];
    if (waiting > 0) parts.push(`${waiting} venter i lobbyen`);
    if (following > 0) parts.push(`${following} følger dig`);

    const t = this.add.text(0, 0, parts.join('   ·   '), text(SIZE.label, INK, 'bold'))
      .setOrigin(0.5);
    const w = t.width + 58;
    const h = t.height + 16;
    t.setX(10);

    const g = this.add.graphics();
    shadow(g, -w / 2, -h / 2, w, h, h / 2, 3, 0.18);
    plate(g, -w / 2, -h / 2, w, h, h / 2, COLORS.cream, 0.97, LINE.thin);
    drawStarShape(g, -w / 2 + 21, 0, 11);

    const c = this.add.container(width / 2, height - 28, [g, t]);
    this.hud.add(c);
    bob(this, c, 3, 3000, 700);
  }

  private drawHotel(cx: number, cy: number): Phaser.GameObjects.Container {
    const c = this.add.container(0, 0);
    const g = this.add.graphics();
    const w = 292;
    const h = 170;
    const left = cx - w / 2;
    const top = cy - 76;

    shadow(g, left, top, w, h, 12, 7, 0.2);

    g.fillStyle(COLORS.wall);
    g.fillRoundedRect(left, top, w, h, 12);
    g.fillStyle(COLORS.wallDeep, 0.5);
    g.fillRoundedRect(cx + 104, top, 42, h, { tl: 0, tr: 12, bl: 0, br: 12 });
    g.lineStyle(LINE.thick, COLORS.outline, 0.9);
    g.strokeRoundedRect(left, top, w, h, 12);

    g.fillStyle(COLORS.roofDeep);
    g.fillTriangle(cx - 168, top + 4, cx + 168, top + 4, cx, cy - 150);
    g.fillStyle(COLORS.roof);
    g.fillTriangle(cx - 168, top + 4, cx + 144, top + 4, cx - 13, cy - 144);
    g.lineStyle(LINE.thick, COLORS.outline, 0.9);
    g.beginPath();
    g.moveTo(cx - 168, top + 4);
    g.lineTo(cx, cy - 150);
    g.lineTo(cx + 168, top + 4);
    g.closePath();
    g.strokePath();

    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 5; col++) {
        const wx = cx - 104 + col * 52;
        const wy = cy - 44 + row * 56;
        g.fillStyle(COLORS.window);
        g.fillRoundedRect(wx - 16, wy - 15, 32, 30, 6);
        g.fillStyle(COLORS.white, 0.55);
        g.fillRoundedRect(wx - 16, wy - 15, 14, 30, 6);
        g.lineStyle(LINE.base, COLORS.outline, 0.85);
        g.strokeRoundedRect(wx - 16, wy - 15, 32, 30, 6);
        g.fillStyle(COLORS.roof);
        g.fillRoundedRect(wx - 18, wy + 14, 36, 7, 3);
      }
    }

    g.fillStyle(COLORS.door);
    g.fillRoundedRect(cx - 24, cy + 46, 48, 48, { tl: 13, tr: 13, bl: 0, br: 0 });
    g.lineStyle(LINE.base, COLORS.outline, 0.9);
    g.strokeRoundedRect(cx - 24, cy + 46, 48, 48, { tl: 13, tr: 13, bl: 0, br: 0 });
    g.fillStyle(COLORS.sun);
    g.fillCircle(cx + 13, cy + 72, 3.5);

    const signW = 138;
    const signY = cy - 130;
    g.fillStyle(COLORS.cream);
    g.fillRoundedRect(cx - signW / 2, signY, signW, 32, 9);
    g.lineStyle(LINE.base, COLORS.outline, 0.9);
    g.strokeRoundedRect(cx - signW / 2, signY, signW, 32, 9);

    c.add(g);
    c.add(this.add.text(cx, signY + 16, 'HOTEL', {
      fontFamily: FONT,
      fontSize: '18px',
      color: '#B55345',
      fontStyle: '700',
    }).setOrigin(0.5));
    return c;
  }

  /**
   * An area sign.
   *
   * The old version was a coloured pill with a word on it — five of them, identical apart
   * from hue, telling a child nothing about what was inside. Each one now carries its own
   * icon, and the guest badge lands on the corner.
   */
  private createAreaButton(area: Area, index: number): void {
    const w = AREA_W;
    const h = 52;
    const lip = 6;
    const c = this.add.container(area.x, area.y).setDepth(DEPTH.dynamic);

    const base = this.add.graphics();
    shadow(base, -w / 2, -h / 2, w, h + lip, 16, 4, 0.22);
    plate(base, -w / 2, -h / 2 + lip, w, h, 16, shade(area.color, -0.28), 1, LINE.thick);
    c.add(base);

    const face = this.add.container(0, 0);
    const g = this.add.graphics();
    plate(g, -w / 2, -h / 2, w, h, 16, area.color, 1, LINE.thick);
    sheen(g, -w / 2, -h / 2, w, h, 14, 0.26);

    // icon in a pale disc, so the glyph reads against any of the five hues
    g.fillStyle(COLORS.cream, 0.95);
    g.fillCircle(-w / 2 + 27, 0, 18);
    g.lineStyle(LINE.thin, COLORS.outline, 0.8);
    g.strokeCircle(-w / 2 + 27, 0, 18);
    face.add(g);

    const icon = this.add.graphics().setPosition(-w / 2 + 27, 0);
    area.icon(icon);
    face.add(icon);

    const labelX = (-w / 2 + 54 + w / 2 - 10) / 2;
    const label = this.add.text(labelX, 0, area.label, text(SIZE.heading, '#FFFFFF', 'bold')).setOrigin(0.5);
    label.setShadow(0, 2, 'rgba(74,58,44,0.5)', 0, false, true);
    const room = w - 64;
    if (label.width > room) label.setScale(room / label.width);
    face.add(label);
    c.add(face);

    c.setSize(w, h + lip);
    c.setInteractive({ useHandCursor: true });

    popIn(this, c, 120 + index * 70, 0.5);

    if (!reduceMotion()) {
      // Starts after the entrance pop, or the two fight over y.
      this.time.delayedCall(120 + index * 70 + 360, () => {
        if (!c.active) return;
        this.tweens.add({
          targets: c,
          y: area.y - 5,
          duration: 1800 + index * 220,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      });
      c.on('pointerover', () => this.tweens.add({ targets: c, scale: 1.06, duration: 130, ease: 'Back.easeOut' }));
      c.on('pointerout', () => this.tweens.add({ targets: c, scale: 1, duration: 130 }));
    }

    c.on('pointerdown', () => {
      audio.tap();
      if (reduceMotion()) {
        transition(this, area.scene);
        return;
      }
      this.tweens.add({
        targets: face,
        y: lip,
        duration: 70,
        yoyo: true,
        onComplete: () => transition(this, area.scene),
      });
    });
  }
}
