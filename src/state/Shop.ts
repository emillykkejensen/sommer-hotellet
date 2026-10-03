import Phaser from 'phaser';
import { COLORS } from '../config';
import { plate, shadow } from '../helpers/Draw';
import { LINE } from '../config';
import { paintGarment } from '../objects/Icons';

export type Area = 'lobby' | 'rooms' | 'kitchen' | 'pool' | 'garden';

export interface ShopItem {
  id: string;
  name: string;
  cost: number;
  area: Area;
  /** Where it belongs in its scene, as a fraction of the scene size. */
  spot: { x: number; y: number };
  /** Drawn both as the shop preview and as the real thing in the scene. */
  draw: (scene: Phaser.Scene) => Phaser.GameObjects.Container;
}

/**
 * Something that changes the hotel rather than decorating it — a fourth room, a new look
 * for the rooms. These are the second tier of the star sink: once the nine decorations are
 * bought there is still something worth saving for.
 */
export interface ShopUpgrade {
  id: string;
  name: string;
  blurb: string;
  cost: number;
  /** Preview drawing, shown on the shop card. */
  draw: (scene: Phaser.Scene) => Phaser.GameObjects.Container;
}

/* ---------------------------------------------------------------- pieces --- */

function cat(scene: Phaser.Scene): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0);
  const g = scene.add.graphics();

  g.fillStyle(COLORS.shadow, 0.12);
  g.fillEllipse(0, 15, 44, 10);

  // curled body
  g.fillStyle(0xE8A863);
  g.fillEllipse(0, 4, 42, 24);
  g.fillStyle(0xD99450);
  g.fillEllipse(14, 6, 20, 14);

  // tail
  g.lineStyle(6, 0xD99450);
  g.beginPath();
  g.arc(18, 2, 12, Phaser.Math.DegToRad(300), Phaser.Math.DegToRad(80), false);
  g.strokePath();

  // head
  g.fillStyle(0xE8A863);
  g.fillCircle(-15, -6, 13);
  g.fillTriangle(-25, -16, -19, -4, -27, -3);
  g.fillTriangle(-6, -16, -12, -4, -4, -3);
  g.fillStyle(0xF2C593);
  g.fillTriangle(-24, -14, -20, -6, -26, -5);

  // face
  g.fillStyle(COLORS.ink);
  g.fillCircle(-19, -7, 1.7);
  g.fillCircle(-11, -7, 1.7);
  g.fillStyle(COLORS.pink);
  g.fillCircle(-15, -3, 1.8);
  g.lineStyle(1, COLORS.ink, 0.55);
  g.lineBetween(-24, -4, -30, -6);
  g.lineBetween(-24, -2, -30, -1);
  g.lineBetween(-6, -4, 0, -6);
  g.lineBetween(-6, -2, 0, -1);

  c.add(g);
  scene.tweens.add({ targets: c, y: '-=2', duration: 2400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  return c;
}

function floorLamp(scene: Phaser.Scene): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0);
  const g = scene.add.graphics();

  g.fillStyle(COLORS.shadow, 0.12);
  g.fillEllipse(0, 52, 40, 10);
  g.fillStyle(COLORS.woodDeep);
  g.fillRoundedRect(-16, 44, 32, 9, 4);
  g.fillStyle(COLORS.stoneDeep);
  g.fillRoundedRect(-3, -26, 6, 72, 3);

  // shade
  g.fillStyle(0xE8C97A);
  g.fillTriangle(-26, -26, 26, -26, 17, -62);
  g.fillTriangle(-26, -26, 17, -62, -17, -62);
  g.fillStyle(COLORS.sun, 0.35);
  g.fillEllipse(0, -24, 50, 10);

  c.add(g);
  return c;
}

function teddy(scene: Phaser.Scene): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0);
  const g = scene.add.graphics();

  g.fillStyle(0xC89B6E);
  g.fillCircle(-13, -14, 7);
  g.fillCircle(13, -14, 7);
  g.fillStyle(0xE0B888);
  g.fillCircle(-13, -14, 4);
  g.fillCircle(13, -14, 4);

  g.fillStyle(0xC89B6E);
  g.fillEllipse(0, 14, 32, 30);
  g.fillCircle(0, -8, 15);
  g.fillStyle(0xE0B888);
  g.fillEllipse(0, 18, 18, 18);
  g.fillEllipse(0, -4, 12, 9);

  // limbs
  g.fillStyle(0xC89B6E);
  g.fillEllipse(-17, 12, 11, 16);
  g.fillEllipse(17, 12, 11, 16);
  g.fillEllipse(-9, 28, 12, 11);
  g.fillEllipse(9, 28, 12, 11);

  g.fillStyle(COLORS.ink);
  g.fillCircle(-5, -8, 1.8);
  g.fillCircle(5, -8, 1.8);
  g.fillCircle(0, -3, 2.2);

  c.add(g);
  return c;
}

function wallPicture(scene: Phaser.Scene): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0);
  const g = scene.add.graphics();

  shadow(g, -34, -26, 68, 52, 4, 3, 0.16);
  g.fillStyle(COLORS.woodDeep);
  g.fillRoundedRect(-34, -26, 68, 52, 4);
  g.fillStyle(COLORS.wall);
  g.fillRect(-29, -21, 58, 42);

  // a little seaside scene
  g.fillStyle(COLORS.skyLight);
  g.fillRect(-29, -21, 58, 24);
  g.fillStyle(COLORS.water);
  g.fillRect(-29, 3, 58, 8);
  g.fillStyle(COLORS.sand);
  g.fillRect(-29, 11, 58, 10);
  g.fillStyle(COLORS.sun);
  g.fillCircle(16, -13, 6);
  g.fillStyle(COLORS.white, 0.9);
  g.fillCircle(-14, -14, 5);
  g.fillCircle(-7, -12, 4);

  c.add(g);
  return c;
}

function herbPots(scene: Phaser.Scene): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0);
  const g = scene.add.graphics();

  // shelf, so the pots read as standing on something wherever they are placed
  shadow(g, -54, 18, 108, 9, 4, 3, 0.16);
  g.fillStyle(COLORS.woodDeep);
  g.fillRoundedRect(-54, 18, 108, 9, 4);
  g.fillStyle(COLORS.wood);
  g.fillRoundedRect(-54, 17, 108, 6, 3);
  g.fillStyle(COLORS.woodDeep, 0.7);
  g.fillRoundedRect(-40, 27, 7, 8, 2);
  g.fillRoundedRect(33, 27, 7, 8, 2);

  [-30, 0, 30].forEach((dx, i) => {
    g.fillStyle(i === 1 ? COLORS.roof : COLORS.orange);
    g.fillRoundedRect(dx - 11, 2, 22, 16, { tl: 2, tr: 2, bl: 6, br: 6 });
    g.fillStyle(COLORS.white, 0.25);
    g.fillRoundedRect(dx - 11, 2, 8, 16, { tl: 2, tr: 0, bl: 5, br: 0 });
    g.fillStyle(COLORS.grassDeep);
    g.fillEllipse(dx - 5, -6, 12, 20);
    g.fillEllipse(dx + 5, -4, 12, 18);
    g.fillStyle(COLORS.grass);
    g.fillEllipse(dx, -10, 13, 22);
  });

  c.add(g);
  return c;
}

function parasol(scene: Phaser.Scene): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0);
  const g = scene.add.graphics();

  g.fillStyle(COLORS.shadow, 0.1);
  g.fillEllipse(0, 56, 44, 10);
  g.fillStyle(COLORS.woodDeep);
  g.fillRoundedRect(-3, -34, 6, 90, 3);

  // Alternating canopy panels fanned from the apex down to a drooping rim. Parametrising
  // by x keeps the rim below the apex; going round by angle sent the panels upward.
  const r = 54;
  const apexY = -68;
  const rimY = (x: number) => -40 + 9 * (x / r) ** 2;
  const panels = 6;
  for (let i = 0; i < panels; i++) {
    const x0 = -r + (2 * r * i) / panels;
    const x1 = -r + (2 * r * (i + 1)) / panels;
    g.fillStyle(i % 2 === 0 ? COLORS.red : COLORS.cream);
    g.fillTriangle(0, apexY, x0, rimY(x0), x1, rimY(x1));
  }
  // rim shading so the scallops read
  g.fillStyle(COLORS.roofDeep, 0.25);
  for (let i = 0; i < panels; i += 2) {
    const x0 = -r + (2 * r * i) / panels;
    const x1 = -r + (2 * r * (i + 1)) / panels;
    g.fillTriangle(x0, rimY(x0), x1, rimY(x1), (x0 + x1) / 2, rimY((x0 + x1) / 2) + 5);
  }
  g.fillStyle(COLORS.roofDeep);
  g.fillCircle(0, apexY + 3, 4);

  c.add(g);
  return c;
}

function flamingoRing(scene: Phaser.Scene): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0);
  const g = scene.add.graphics();

  g.fillStyle(0xF08FB0);
  g.fillEllipse(0, 6, 62, 34);
  g.fillStyle(COLORS.water, 0.45);
  g.fillEllipse(0, 8, 30, 16);
  g.fillStyle(0xF8B4CC);
  g.fillEllipse(-6, 1, 46, 18);

  // neck and head
  g.fillStyle(0xF08FB0);
  g.fillRoundedRect(-26, -30, 9, 32, 4.5);
  g.fillCircle(-22, -34, 9);
  g.fillStyle(COLORS.ink);
  g.fillCircle(-24, -36, 1.6);
  g.fillStyle(COLORS.sunDeep);
  g.fillTriangle(-30, -32, -30, -37, -39, -33);

  c.add(g);
  scene.tweens.add({ targets: c, angle: 4, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  return c;
}

function birdBath(scene: Phaser.Scene): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0);
  const g = scene.add.graphics();

  g.fillStyle(COLORS.shadow, 0.12);
  g.fillEllipse(0, 40, 46, 11);
  g.fillStyle(COLORS.stoneDeep);
  g.fillRoundedRect(-18, 30, 36, 10, 4);
  g.fillRoundedRect(-7, -4, 14, 36, 4);
  g.fillStyle(COLORS.stone);
  g.fillEllipse(0, -8, 56, 20);
  g.fillStyle(COLORS.waterLight);
  g.fillEllipse(0, -8, 44, 13);
  g.fillStyle(COLORS.white, 0.5);
  g.fillEllipse(-9, -10, 16, 5);

  // a small bird on the rim
  g.fillStyle(0x7FA8D8);
  g.fillEllipse(20, -16, 17, 13);
  g.fillCircle(26, -22, 6);
  g.fillStyle(COLORS.ink);
  g.fillCircle(28, -23, 1.4);
  g.fillStyle(COLORS.sunDeep);
  g.fillTriangle(31, -22, 31, -20, 36, -21);

  c.add(g);
  return c;
}

function gardenBench(scene: Phaser.Scene): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0);
  const g = scene.add.graphics();

  g.fillStyle(COLORS.shadow, 0.12);
  g.fillEllipse(0, 30, 84, 11);

  g.fillStyle(COLORS.woodDeep);
  g.fillRoundedRect(-38, 6, 8, 24, 3);
  g.fillRoundedRect(30, 6, 8, 24, 3);
  g.fillRoundedRect(-36, -30, 7, 38, 3);
  g.fillRoundedRect(29, -30, 7, 38, 3);

  g.fillStyle(COLORS.wood);
  g.fillRoundedRect(-42, 0, 84, 9, 4);
  g.fillRoundedRect(-38, -14, 76, 7, 3);
  g.fillRoundedRect(-38, -26, 76, 7, 3);

  c.add(g);
  return c;
}

function wallClock(scene: Phaser.Scene): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0);
  const g = scene.add.graphics();

  shadow(g, -26, -26, 52, 52, 26, 3, 0.16);
  g.fillStyle(COLORS.woodDeep);
  g.fillCircle(0, 0, 26);
  g.fillStyle(COLORS.white);
  g.fillCircle(0, 0, 21);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    g.fillStyle(COLORS.ink, i % 3 === 0 ? 0.7 : 0.28);
    g.fillCircle(Math.cos(a) * 16, Math.sin(a) * 16, i % 3 === 0 ? 1.8 : 1.1);
  }
  g.lineStyle(3, COLORS.ink, 0.8);
  g.lineBetween(0, 0, 0, -10);
  g.lineStyle(2.2, COLORS.roof, 0.9);
  g.lineBetween(0, 0, 8, 6);
  g.fillStyle(COLORS.ink);
  g.fillCircle(0, 0, 2.4);

  c.add(g);
  return c;
}

function bedsideLamp(scene: Phaser.Scene): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0);
  const g = scene.add.graphics();

  shadow(g, -18, 26, 36, 8, 4, 3, 0.14);
  g.fillStyle(COLORS.woodDeep);
  g.fillRoundedRect(-24, 14, 48, 16, 4);
  g.fillStyle(COLORS.wood);
  g.fillRoundedRect(-24, 12, 48, 6, 3);
  g.fillStyle(COLORS.stoneDeep);
  g.fillRoundedRect(-2.5, -6, 5, 20, 2);
  g.fillStyle(0xF2D08A);
  g.fillTriangle(-18, -6, 18, -6, 11, -30);
  g.fillTriangle(-18, -6, 11, -30, -11, -30);
  g.fillStyle(COLORS.sun, 0.35);
  g.fillEllipse(0, -4, 36, 8);

  c.add(g);
  return c;
}

function cakeStand(scene: Phaser.Scene): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0);
  const g = scene.add.graphics();

  shadow(g, -22, 20, 44, 8, 4, 3, 0.14);
  g.fillStyle(COLORS.stone);
  g.fillEllipse(0, 22, 40, 9);
  g.fillRoundedRect(-3, 2, 6, 20, 3);
  g.fillStyle(COLORS.white);
  g.fillEllipse(0, 2, 60, 12);
  g.fillStyle(COLORS.stone, 0.5);
  g.fillEllipse(0, 4, 60, 9);

  // a cake with a slice taken out
  g.fillStyle(0xE8A9B8);
  g.fillEllipse(0, -10, 44, 20);
  g.fillRoundedRect(-22, -18, 44, 10, 3);
  g.fillStyle(0xF6C9D3);
  g.fillEllipse(0, -19, 44, 12);
  g.fillStyle(0xC0455C);
  g.fillCircle(-9, -21, 3.4);
  g.fillCircle(4, -19, 3.4);
  g.fillCircle(13, -22, 3);

  c.add(g);
  return c;
}

function beachBall(scene: Phaser.Scene): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0);
  const g = scene.add.graphics();

  shadow(g, -22, 18, 44, 9, 5, 3, 0.14);
  g.fillStyle(COLORS.white);
  g.fillCircle(0, 0, 26);

  // alternating panels
  const panels = [COLORS.red, COLORS.sun, COLORS.water, COLORS.green];
  panels.forEach((tint, i) => {
    const from = (i / panels.length) * Math.PI * 2 - Math.PI / 2;
    const to = ((i + 0.5) / panels.length) * Math.PI * 2 - Math.PI / 2;
    g.fillStyle(tint, 0.92);
    g.beginPath();
    g.moveTo(0, 0);
    g.arc(0, 0, 26, from, to, false);
    g.closePath();
    g.fillPath();
  });
  g.fillStyle(COLORS.white);
  g.fillCircle(0, 0, 6);
  g.fillStyle(COLORS.white, 0.45);
  g.fillEllipse(-9, -12, 12, 7);

  c.add(g);
  scene.tweens.add({ targets: c, y: '-=4', duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  return c;
}

function birdHouse(scene: Phaser.Scene): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0);
  const g = scene.add.graphics();

  g.fillStyle(COLORS.woodDeep);
  g.fillRoundedRect(-3, 6, 6, 44, 3);
  g.fillStyle(COLORS.shadow, 0.1);
  g.fillEllipse(0, 50, 26, 7);

  shadow(g, -24, -30, 48, 40, 5, 3, 0.16);
  g.fillStyle(COLORS.wood);
  g.fillRoundedRect(-24, -30, 48, 40, 4);
  g.fillStyle(COLORS.woodDeep);
  g.fillRoundedRect(14, -30, 10, 40, { tl: 0, tr: 4, bl: 0, br: 4 });
  g.fillStyle(COLORS.roofDeep);
  g.fillTriangle(-30, -30, 30, -30, 0, -54);
  g.fillStyle(COLORS.roof);
  g.fillTriangle(-30, -30, 22, -30, -4, -50);
  g.fillStyle(0x6B4A2E);
  g.fillCircle(-2, -12, 9);
  g.fillStyle(COLORS.woodDeep);
  g.fillRoundedRect(-4, -2, 4, 10, 2);

  // a small bird on the perch
  g.fillStyle(0xE8A863);
  g.fillEllipse(14, 2, 15, 11);
  g.fillCircle(19, -3, 5.5);
  g.fillStyle(COLORS.ink);
  g.fillCircle(21, -4, 1.3);
  g.fillStyle(COLORS.sunDeep);
  g.fillTriangle(24, -4, 24, -1, 29, -3);

  c.add(g);
  return c;
}

/* ---------------------------------------------------------------- catalogue --- */

export const SHOP_ITEMS: ShopItem[] = [
  { id: 'cat',      name: 'Hotelkatten',   cost: 6,  area: 'lobby',   spot: { x: 0.33, y: 0.59 }, draw: cat },
  { id: 'lamp',     name: 'Gulvlampe',     cost: 10, area: 'lobby',   spot: { x: 0.82, y: 0.68 }, draw: floorLamp },
  { id: 'teddy',    name: 'Bamse',         cost: 8,  area: 'rooms',   spot: { x: 0.29, y: 0.82 }, draw: teddy },
  { id: 'picture',  name: 'Billede',       cost: 12, area: 'rooms',   spot: { x: 0.5,  y: 0.28 }, draw: wallPicture },
  { id: 'herbs',    name: 'Krydderurter',  cost: 9,  area: 'kitchen', spot: { x: 0.16, y: 0.52 }, draw: herbPots },
  { id: 'parasol',  name: 'Parasol',       cost: 14, area: 'pool',    spot: { x: 0.2,  y: 0.42 }, draw: parasol },
  { id: 'flamingo', name: 'Flamingoring',  cost: 18, area: 'pool',    spot: { x: 0.62, y: 0.56 }, draw: flamingoRing },
  { id: 'birdbath', name: 'Fuglebad',      cost: 11, area: 'garden',  spot: { x: 0.72, y: 0.87 }, draw: birdBath },
  { id: 'bench',    name: 'Havebænk',      cost: 16, area: 'garden',  spot: { x: 0.35, y: 0.9  }, draw: gardenBench },

  // second wave, priced above the first so there is still something to save for
  { id: 'clock',    name: 'Vægur',         cost: 20, area: 'lobby',   spot: { x: 0.2,  y: 0.24 }, draw: wallClock },
  { id: 'lamp2',    name: 'Natlampe',      cost: 22, area: 'rooms',   spot: { x: 0.62, y: 0.78 }, draw: bedsideLamp },
  { id: 'cakestand', name: 'Kagefad',      cost: 24, area: 'kitchen', spot: { x: 0.86, y: 0.7  }, draw: cakeStand },
  { id: 'ball',     name: 'Badebold',      cost: 21, area: 'pool',    spot: { x: 0.38, y: 0.52 }, draw: beachBall },
  { id: 'birdhouse', name: 'Fuglehus',     cost: 26, area: 'garden',  spot: { x: 0.66, y: 0.78 }, draw: birdHouse },
];

export function itemsFor(area: Area): ShopItem[] {
  return SHOP_ITEMS.filter(i => i.area === area);
}

/* ---------------------------------------------------------------- upgrades --- */

function fourthRoomPreview(scene: Phaser.Scene): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0);
  const g = scene.add.graphics();

  // three keys on hooks, and a fourth hook waiting
  for (let i = 0; i < 4; i++) {
    const x = -33 + i * 22;
    g.fillStyle(COLORS.stoneDeep);
    g.fillCircle(x, -22, 2.5);
    if (i < 3) {
      g.fillStyle(COLORS.sunDeep);
      g.fillCircle(x, -10, 7);
      g.fillStyle(COLORS.sun);
      g.fillCircle(x, -11, 5.5);
      g.fillStyle(COLORS.sunDeep);
      g.fillRect(x - 1.2, -4, 2.4, 11);
      g.fillRect(x - 1.2, 3, 5, 2);
    } else {
      g.lineStyle(2, COLORS.roof, 0.9);
      g.strokeCircle(x, -10, 7);
      g.lineBetween(x - 4, 2, x + 4, 2);
      g.lineBetween(x, -2, x, 6);
    }
  }

  g.fillStyle(COLORS.woodDeep);
  g.fillRoundedRect(-46, 12, 92, 9, 4);
  c.add(g);
  return c;
}

function themePreview(themeIndex: number, wall: number, accent: number, duvet: number) {
  return (scene: Phaser.Scene): Phaser.GameObjects.Container => {
    const c = scene.add.container(0, 0);
    const g = scene.add.graphics();

    // a little room: wall, floor, bed
    g.fillStyle(wall);
    g.fillRoundedRect(-42, -30, 84, 44, 5);
    g.fillStyle(COLORS.white, 0.3);
    for (let i = 0; i < 5; i++) g.fillRect(-42 + i * 18, -30, 8, 44);
    g.fillStyle(COLORS.woodDeep);
    g.fillRoundedRect(-42, 14, 84, 16, { tl: 0, tr: 0, bl: 5, br: 5 });
    g.fillStyle(COLORS.wood);
    g.fillRect(-40, 16, 80, 12);

    g.fillStyle(COLORS.woodDeep);
    g.fillRoundedRect(-26, -2, 52, 18, 4);
    g.fillStyle(duvet);
    g.fillRoundedRect(-16, -4, 42, 16, 4);
    g.fillStyle(COLORS.white);
    g.fillRoundedRect(-26, -4, 14, 13, 4);
    g.fillStyle(accent);
    g.fillCircle(28, -20, 6);

    c.add(g);
    c.setData('theme', themeIndex);
    return c;
  };
}

function secondFloorPreview(scene: Phaser.Scene): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0);
  const g = scene.add.graphics();

  shadow(g, -44, -34, 88, 68, 6, 4, 0.16);
  g.fillStyle(COLORS.wall);
  g.fillRoundedRect(-44, -34, 88, 68, 6);
  g.fillStyle(COLORS.wallDeep, 0.45);
  g.fillRect(-44, -2, 88, 4);

  // the new upper storey, picked out in the accent colour
  g.fillStyle(COLORS.roof, 0.16);
  g.fillRoundedRect(-44, -34, 88, 32, { tl: 6, tr: 6, bl: 0, br: 0 });

  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      const wx = -28 + col * 28;
      const wy = -20 + row * 30;
      g.fillStyle(COLORS.window);
      g.fillRoundedRect(wx - 9, wy - 8, 18, 16, 3);
      g.lineStyle(2, row === 0 ? COLORS.roof : COLORS.wallDeep);
      g.strokeRoundedRect(wx - 9, wy - 8, 18, 16, 3);
    }
  }

  g.fillStyle(COLORS.roofDeep);
  g.fillTriangle(-52, -34, 52, -34, 0, -58);
  g.fillStyle(COLORS.roof);
  g.fillTriangle(-52, -34, 40, -34, -6, -54);

  c.add(g);
  return c;
}

/** A little shop front with a striped awning and a hat in the window. */
function boutiquePreview(scene: Phaser.Scene): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0);
  const g = scene.add.graphics();

  shadow(g, -46, -24, 92, 56, 8, 4, 0.16);
  plate(g, -46, -24, 92, 56, 8, COLORS.wall, 1, LINE.base);
  for (let i = 0; i < 6; i++) {
    g.fillStyle(i % 2 === 0 ? COLORS.purple : COLORS.white);
    g.fillRect(-50 + i * (100 / 6), -38, 100 / 6, 15);
  }
  g.lineStyle(LINE.thin, COLORS.outline, 0.85);
  g.strokeRect(-50, -38, 100, 15);
  // window and door
  plate(g, -38, -14, 44, 30, 5, COLORS.window, 1, LINE.thin);
  g.fillStyle(COLORS.door);
  g.fillRoundedRect(14, -12, 22, 44, { tl: 10, tr: 10, bl: 0, br: 0 });
  g.lineStyle(LINE.thin, COLORS.outline, 1);
  g.strokeRoundedRect(14, -12, 22, 44, { tl: 10, tr: 10, bl: 0, br: 0 });
  c.add(g);

  const hat = scene.add.graphics().setPosition(-16, 2);
  paintGarment(hat, 1.2, 'toej:solhat:roed');
  c.add(hat);
  return c;
}

export const SHOP_UPGRADES: ShopUpgrade[] = [
  {
    id: 'boutique',
    name: 'Tøjbutik',
    blurb: 'Tøj til gæsterne',
    cost: 16,
    draw: boutiquePreview,
  },
  {
    id: 'theme-desert',
    name: 'Ørken-tema',
    blurb: 'Et nyt look til værelserne',
    cost: 22,
    draw: themePreview(3, 0xFBEFD9, COLORS.orange, 0xF3CE93),
  },
  {
    id: 'theme-night',
    name: 'Stjernenat-tema',
    blurb: 'Et nyt look til værelserne',
    cost: 26,
    draw: themePreview(4, 0xE4E3F5, COLORS.purple, 0xC6BDE8),
  },
  {
    id: 'room4',
    name: 'Fjerde værelse',
    blurb: 'Plads til en gæst mere',
    cost: 32,
    draw: fourthRoomPreview,
  },
  {
    id: 'theme-mermaid',
    name: 'Havfrue-tema',
    blurb: 'Et nyt look til værelserne',
    cost: 30,
    draw: themePreview(5, 0xDDF3F1, 0x4FB3A6, 0xA6DED6),
  },
  {
    id: 'theme-sunset',
    name: 'Solnedgang-tema',
    blurb: 'Et nyt look til værelserne',
    cost: 34,
    draw: themePreview(6, 0xFCE8DE, 0xE8795F, 0xF7BFA3),
  },
  {
    id: 'floor2',
    name: 'Første sal',
    blurb: 'To værelser mere ovenpå',
    cost: 48,
    draw: secondFloorPreview,
  },
];

/** Which theme index each theme upgrade unlocks. Indexes match ROOM_THEMES. */
export const THEME_UNLOCKS: { id: string; theme: number }[] = [
  { id: 'theme-desert', theme: 3 },
  { id: 'theme-night', theme: 4 },
  { id: 'theme-mermaid', theme: 5 },
  { id: 'theme-sunset', theme: 6 },
];
