import Phaser from 'phaser';
import { COLORS } from '../config';
import { shadow } from '../helpers/Draw';

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

/* ---------------------------------------------------------------- catalogue --- */

export const SHOP_ITEMS: ShopItem[] = [
  { id: 'cat',      name: 'Hotelkatten',   cost: 6,  area: 'lobby',   spot: { x: 0.33, y: 0.59 }, draw: cat },
  { id: 'lamp',     name: 'Gulvlampe',     cost: 10, area: 'lobby',   spot: { x: 0.82, y: 0.68 }, draw: floorLamp },
  { id: 'teddy',    name: 'Bamse',         cost: 8,  area: 'rooms',   spot: { x: 0.29, y: 0.78 }, draw: teddy },
  { id: 'picture',  name: 'Billede',       cost: 12, area: 'rooms',   spot: { x: 0.5,  y: 0.28 }, draw: wallPicture },
  { id: 'herbs',    name: 'Krydderurter',  cost: 9,  area: 'kitchen', spot: { x: 0.16, y: 0.52 }, draw: herbPots },
  { id: 'parasol',  name: 'Parasol',       cost: 14, area: 'pool',    spot: { x: 0.2,  y: 0.42 }, draw: parasol },
  { id: 'flamingo', name: 'Flamingoring',  cost: 18, area: 'pool',    spot: { x: 0.62, y: 0.56 }, draw: flamingoRing },
  { id: 'birdbath', name: 'Fuglebad',      cost: 11, area: 'garden',  spot: { x: 0.72, y: 0.87 }, draw: birdBath },
  { id: 'bench',    name: 'Havebænk',      cost: 16, area: 'garden',  spot: { x: 0.35, y: 0.9  }, draw: gardenBench },
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

export const SHOP_UPGRADES: ShopUpgrade[] = [
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
];

/** Which theme index each theme upgrade unlocks. */
export const THEME_UNLOCKS: { id: string; theme: number }[] = [
  { id: 'theme-desert', theme: 3 },
  { id: 'theme-night', theme: 4 },
];
