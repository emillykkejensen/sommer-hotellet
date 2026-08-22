import Phaser from 'phaser';
import { COLORS, INK, text } from '../config';
import { Figure, IconKind } from './types';

/**
 * Draws an answer option that cannot be written down.
 *
 * A shape task whose options were the words "cirkel" and "trekant" would test reading, not
 * shape recognition; a fraction task needs to show the cut. Everything here returns a
 * container centred on its own origin, sized to fit roughly a 96px box at scale 1.
 */
export function drawFigure(scene: Phaser.Scene, figure: Figure): Phaser.GameObjects.Container {
  switch (figure.kind) {
    case 'shape': return drawShape(scene, figure.shape);
    case 'cake': return drawCake(scene, figure.slices, figure.left ?? figure.slices);
    case 'clock': return drawClock(scene, figure.hour);
    case 'towel': return drawTowel(scene, figure.size);
    case 'letter': return drawLetter(scene, figure.text);
    case 'noun': return drawNoun(scene, figure.noun as DrawableNoun);
  }
}

/**
 * The nouns a reading task can show as a picture.
 *
 * Word-to-picture is the real reading exercise; matching a written word to the same word
 * only tests visual discrimination. The list is deliberately short — every entry has to be
 * drawable and unmistakable at 128px, which rules out most nouns.
 */
export const DRAWABLE_NOUNS = ['sol', 'hus', 'kat', 'fisk', 'is', 'blomst', 'nøgle', 'kop'] as const;
export type DrawableNoun = (typeof DRAWABLE_NOUNS)[number];

function drawNoun(scene: Phaser.Scene, noun: DrawableNoun): Phaser.GameObjects.Container {
  switch (noun) {
    case 'nøgle': return drawIcon(scene, 'key', 1.5);
    case 'kop': return drawIcon(scene, 'cup', 1.5);
    case 'blomst': return drawIcon(scene, 'flower', 1.4);
    case 'sol': return drawSunFace(scene);
    case 'hus': return drawHouse(scene);
    case 'kat': return drawCatFace(scene);
    case 'fisk': return drawFish(scene);
    case 'is': return drawIceCream(scene);
  }
}

function drawSunFace(scene: Phaser.Scene): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0);
  const g = scene.add.graphics();
  g.fillStyle(COLORS.sun, 0.4);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    g.fillCircle(Math.cos(a) * 38, Math.sin(a) * 38, 7);
  }
  g.fillStyle(COLORS.sunDeep);
  g.fillCircle(0, 2, 26);
  g.fillStyle(COLORS.sun);
  g.fillCircle(0, 0, 25);
  g.fillStyle(COLORS.ink, 0.8);
  g.fillCircle(-8, -4, 2.6);
  g.fillCircle(8, -4, 2.6);
  g.lineStyle(2.4, COLORS.ink, 0.75);
  g.beginPath();
  g.arc(0, 3, 9, 0.3, Math.PI - 0.3, false);
  g.strokePath();
  c.add(g);
  return c;
}

function drawHouse(scene: Phaser.Scene): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0);
  const g = scene.add.graphics();
  g.fillStyle(COLORS.wall);
  g.fillRoundedRect(-30, -8, 60, 44, 4);
  g.fillStyle(COLORS.wallDeep, 0.5);
  g.fillRoundedRect(18, -8, 12, 44, { tl: 0, tr: 4, bl: 0, br: 4 });
  g.fillStyle(COLORS.roofDeep);
  g.fillTriangle(-38, -8, 38, -8, 0, -42);
  g.fillStyle(COLORS.roof);
  g.fillTriangle(-38, -8, 30, -8, -4, -38);
  g.fillStyle(COLORS.door);
  g.fillRoundedRect(-8, 14, 17, 22, { tl: 6, tr: 6, bl: 0, br: 0 });
  g.fillStyle(COLORS.window);
  g.fillRoundedRect(-24, 2, 13, 12, 3);
  g.lineStyle(2, COLORS.wallDeep);
  g.strokeRoundedRect(-24, 2, 13, 12, 3);
  c.add(g);
  return c;
}

function drawCatFace(scene: Phaser.Scene): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0);
  const g = scene.add.graphics();
  g.fillStyle(0xE8A863);
  g.fillTriangle(-24, -30, -8, -6, -30, -4);
  g.fillTriangle(24, -30, 8, -6, 30, -4);
  g.fillStyle(0xF2C593);
  g.fillTriangle(-21, -25, -11, -9, -25, -8);
  g.fillTriangle(21, -25, 11, -9, 25, -8);
  g.fillStyle(0xE8A863);
  g.fillCircle(0, 2, 27);
  g.fillStyle(COLORS.ink);
  g.fillEllipse(-10, -3, 5, 8);
  g.fillEllipse(10, -3, 5, 8);
  g.fillStyle(COLORS.pink);
  g.fillTriangle(-4, 8, 4, 8, 0, 13);
  g.lineStyle(2, COLORS.ink, 0.6);
  g.beginPath();
  g.arc(-5, 15, 5, 0, Math.PI, false);
  g.strokePath();
  g.beginPath();
  g.arc(5, 15, 5, 0, Math.PI, false);
  g.strokePath();
  g.lineStyle(1.8, COLORS.ink, 0.5);
  for (const dy of [-2, 2, 6]) {
    g.lineBetween(-16, dy + 10, -34, dy + 6);
    g.lineBetween(16, dy + 10, 34, dy + 6);
  }
  c.add(g);
  return c;
}

function drawFish(scene: Phaser.Scene): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0);
  const g = scene.add.graphics();
  g.fillStyle(COLORS.waterDeep);
  g.fillTriangle(20, 0, 40, -16, 40, 16);
  g.fillStyle(COLORS.water);
  g.fillEllipse(-2, 0, 62, 38);
  g.fillStyle(COLORS.waterLight, 0.7);
  g.fillEllipse(-8, 4, 40, 22);
  g.fillStyle(COLORS.waterDeep);
  g.fillTriangle(0, -18, 14, -30, 16, -14);
  g.fillStyle(COLORS.white);
  g.fillCircle(-18, -5, 6);
  g.fillStyle(COLORS.ink);
  g.fillCircle(-19, -5, 3);
  c.add(g);
  return c;
}

function drawIceCream(scene: Phaser.Scene): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0);
  const g = scene.add.graphics();
  g.fillStyle(0xD9A96B);
  g.fillTriangle(-15, 2, 15, 2, 0, 42);
  g.lineStyle(1.5, 0xB98A50, 0.7);
  for (let i = -1; i <= 1; i++) g.lineBetween(i * 8, 4, i * 5, 36);
  g.fillStyle(0xF2A0B5);
  g.fillCircle(-8, -8, 14);
  g.fillStyle(0xFBF3E4);
  g.fillCircle(9, -6, 13);
  g.fillStyle(0xB4DBA5);
  g.fillCircle(0, -24, 13);
  g.fillStyle(COLORS.red);
  g.fillCircle(1, -35, 4);
  c.add(g);
  return c;
}

/** The countable things a counting task can ask a child to tap. */
export function drawIcon(
  scene: Phaser.Scene,
  kind: IconKind,
  scale = 1
): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0).setScale(scale);
  const g = scene.add.graphics();

  switch (kind) {
    case 'pancake':
      g.fillStyle(COLORS.woodDeep, 0.25);
      g.fillEllipse(0, 10, 46, 12);
      g.fillStyle(0xE0B36B);
      g.fillEllipse(0, 4, 46, 18);
      g.fillStyle(0xEFC77F);
      g.fillEllipse(0, 0, 46, 18);
      g.fillStyle(0xC98A3E, 0.55);
      g.fillEllipse(-8, -2, 16, 7);
      g.fillStyle(COLORS.sun);
      g.fillRoundedRect(-7, -9, 14, 7, 3);
      break;
    case 'apple':
      g.fillStyle(COLORS.roofDeep);
      g.fillCircle(0, 3, 19);
      g.fillStyle(COLORS.red);
      g.fillCircle(0, 1, 18);
      g.fillStyle(COLORS.white, 0.4);
      g.fillEllipse(-7, -6, 9, 6);
      g.lineStyle(4, COLORS.woodDeep);
      g.lineBetween(0, -16, 2, -25);
      g.fillStyle(COLORS.grass);
      g.fillEllipse(10, -24, 16, 9);
      break;
    case 'towel':
      g.fillStyle(COLORS.waterLight);
      g.fillRoundedRect(-24, -14, 48, 28, 7);
      g.fillStyle(COLORS.white, 0.75);
      g.fillRect(-24, -6, 48, 5);
      g.fillRect(-24, 3, 48, 5);
      g.lineStyle(2, COLORS.waterDeep, 0.4);
      g.strokeRoundedRect(-24, -14, 48, 28, 7);
      break;
    case 'flower':
      g.lineStyle(4, COLORS.grassDeep);
      g.lineBetween(0, 24, 0, 2);
      g.fillStyle(COLORS.grass);
      g.fillEllipse(-9, 16, 15, 8);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
        g.fillStyle(COLORS.pink);
        g.fillCircle(Math.cos(a) * 11, Math.sin(a) * 11 - 4, 9);
      }
      g.fillStyle(COLORS.sun);
      g.fillCircle(0, -4, 6);
      break;
    case 'key':
      g.fillStyle(COLORS.sunDeep);
      g.fillCircle(0, -10, 14);
      g.fillStyle(COLORS.sun);
      g.fillCircle(0, -11, 11);
      g.fillStyle(COLORS.white);
      g.fillCircle(0, -11, 4);
      g.fillStyle(COLORS.sunDeep);
      g.fillRoundedRect(-3, 0, 6, 26, 2);
      g.fillRoundedRect(-3, 14, 11, 4, 2);
      g.fillRoundedRect(-3, 21, 9, 4, 2);
      break;
    case 'carrot':
      g.fillStyle(0xE8944F);
      g.fillTriangle(-11, -12, 11, -12, 0, 24);
      g.fillStyle(0xD97F3C, 0.5);
      g.fillTriangle(2, -12, 11, -12, 0, 24);
      g.fillStyle(COLORS.grassDeep);
      g.fillEllipse(-7, -18, 12, 14);
      g.fillEllipse(7, -18, 12, 14);
      g.fillStyle(COLORS.grass);
      g.fillEllipse(0, -22, 12, 16);
      break;
    case 'clap': {
      // Two hands meeting. Each is drawn in its own rotated container — a flat pair of
      // rounded rectangles read as two beige slabs, not as hands.
      const impact = scene.add.graphics();
      impact.lineStyle(3, COLORS.sunDeep, 0.9);
      for (let i = -1; i <= 1; i++) {
        const a = Phaser.Math.DegToRad(i * 34);
        impact.lineBetween(Math.cos(a) * 26, Math.sin(a) * 26 - 4, Math.cos(a) * 38, Math.sin(a) * 38 - 4);
        impact.lineBetween(-Math.cos(a) * 26, Math.sin(a) * 26 - 4, -Math.cos(a) * 38, Math.sin(a) * 38 - 4);
      }
      c.add(impact);

      for (const side of [-1, 1] as const) {
        const hand = scene.add.graphics();
        // palm
        hand.fillStyle(0xE8C4A2);
        hand.fillRoundedRect(-11, -16, 22, 34, { tl: 10, tr: 10, bl: 6, br: 6 });
        hand.fillStyle(0xF6D9BE);
        hand.fillRoundedRect(-11, -16, 15, 34, { tl: 9, tr: 0, bl: 5, br: 0 });
        // finger creases, so it is not one solid shape
        hand.lineStyle(1.5, 0xD2A681, 0.8);
        for (let f = 0; f < 3; f++) hand.lineBetween(-8, -8 + f * 8, 8, -8 + f * 8);
        // thumb
        hand.fillStyle(0xE8C4A2);
        hand.fillRoundedRect(6, 4, 13, 9, 4.5);
        hand.lineStyle(1.5, 0xD2A681, 0.6);
        hand.strokeRoundedRect(-11, -16, 22, 34, 8);

        const holder = scene.add.container(side * 13, 0, [hand]);
        holder.setAngle(side * 14);
        holder.setScale(side, 1);
        c.add(holder);
      }
      break;
    }
    case 'cup':
      g.fillStyle(COLORS.shadow, 0.12);
      g.fillEllipse(0, 20, 34, 8);
      g.fillStyle(COLORS.white);
      g.fillRoundedRect(-15, -14, 30, 34, { tl: 3, tr: 3, bl: 11, br: 11 });
      g.fillStyle(COLORS.waterLight, 0.85);
      g.fillRoundedRect(-12, -2, 24, 19, { tl: 0, tr: 0, bl: 9, br: 9 });
      g.lineStyle(4, COLORS.white);
      g.beginPath();
      g.arc(17, 2, 9, Phaser.Math.DegToRad(-70), Phaser.Math.DegToRad(70), false);
      g.strokePath();
      break;
  }

  c.add(g);
  return c;
}


function drawShape(
  scene: Phaser.Scene,
  shape: 'cirkel' | 'firkant' | 'trekant' | 'rektangel'
): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0);
  const g = scene.add.graphics();
  const fill = COLORS.water;
  const edge = COLORS.waterDeep;

  g.fillStyle(fill);
  g.lineStyle(3, edge, 0.7);

  switch (shape) {
    case 'cirkel':
      g.fillCircle(0, 0, 34);
      g.strokeCircle(0, 0, 34);
      break;
    case 'firkant':
      g.fillRoundedRect(-32, -32, 64, 64, 6);
      g.strokeRoundedRect(-32, -32, 64, 64, 6);
      break;
    case 'rektangel':
      g.fillRoundedRect(-42, -24, 84, 48, 6);
      g.strokeRoundedRect(-42, -24, 84, 48, 6);
      break;
    case 'trekant':
      g.fillTriangle(0, -36, 38, 30, -38, 30);
      g.beginPath();
      g.moveTo(0, -36);
      g.lineTo(38, 30);
      g.lineTo(-38, 30);
      g.closePath();
      g.strokePath();
      break;
  }

  c.add(g);
  return c;
}

/** A cake seen from above, cut into equal slices, with `left` of them remaining. */
function drawCake(scene: Phaser.Scene, slices: number, left: number): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0);
  const g = scene.add.graphics();
  const r = 36;

  // plate
  g.fillStyle(COLORS.stone, 0.5);
  g.fillCircle(0, 2, r + 7);
  g.fillStyle(COLORS.white);
  g.fillCircle(0, 0, r + 5);

  for (let i = 0; i < slices; i++) {
    const from = (i / slices) * Math.PI * 2 - Math.PI / 2;
    const to = ((i + 1) / slices) * Math.PI * 2 - Math.PI / 2;
    const present = i < left;

    g.fillStyle(present ? 0xE8A9B8 : COLORS.stone, present ? 1 : 0.28);
    g.beginPath();
    g.moveTo(0, 0);
    g.arc(0, 0, r, from, to, false);
    g.closePath();
    g.fillPath();

    if (present) {
      // a berry, so a full cake still reads as cake rather than a pink disc
      const mid = (from + to) / 2;
      g.fillStyle(0xC0455C);
      g.fillCircle(Math.cos(mid) * r * 0.55, Math.sin(mid) * r * 0.55, 4);
    }
  }

  // cut lines
  g.lineStyle(2.5, COLORS.white, 0.95);
  for (let i = 0; i < slices; i++) {
    const a = (i / slices) * Math.PI * 2 - Math.PI / 2;
    g.lineBetween(0, 0, Math.cos(a) * r, Math.sin(a) * r);
  }
  g.lineStyle(2.5, 0xC0455C, 0.35);
  g.strokeCircle(0, 0, r);

  c.add(g);
  return c;
}

/** An analog clock. A fractional hour (8.5) puts the minute hand on the half. */
export function drawClock(scene: Phaser.Scene, hour: number): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0);
  const g = scene.add.graphics();
  const r = 40;

  g.fillStyle(COLORS.shadow, 0.12);
  g.fillCircle(1, 4, r);
  g.fillStyle(COLORS.woodDeep);
  g.fillCircle(0, 0, r);
  g.fillStyle(COLORS.white);
  g.fillCircle(0, 0, r - 5);

  // hour ticks, with 12/3/6/9 heavier so the face is readable
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    const major = i % 3 === 0;
    g.fillStyle(COLORS.ink, major ? 0.75 : 0.3);
    g.fillCircle(Math.cos(a) * (r - 12), Math.sin(a) * (r - 12), major ? 2.6 : 1.6);
  }

  const wholeHour = Math.floor(hour);
  const minutes = Math.round((hour - wholeHour) * 60);

  // hour hand advances between the numerals as the minutes pass
  const hourAngle = ((wholeHour % 12) + minutes / 60) / 12 * Math.PI * 2 - Math.PI / 2;
  const minuteAngle = (minutes / 60) * Math.PI * 2 - Math.PI / 2;

  g.lineStyle(5, COLORS.ink, 0.85);
  g.lineBetween(0, 0, Math.cos(hourAngle) * (r - 20), Math.sin(hourAngle) * (r - 20));
  g.lineStyle(3.5, COLORS.roof, 0.9);
  g.lineBetween(0, 0, Math.cos(minuteAngle) * (r - 11), Math.sin(minuteAngle) * (r - 11));
  g.fillStyle(COLORS.ink, 0.85);
  g.fillCircle(0, 0, 3.5);

  c.add(g);
  return c;
}

/** Three graded towel sizes, for ordering by size. */
function drawTowel(scene: Phaser.Scene, size: 1 | 2 | 3): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0);
  const g = scene.add.graphics();
  // The old 48/66/84 spread was too subtle inside a 118px card — three towels that all
  // look the same size make an ordering task guesswork.
  const w = [0, 34, 60, 88][size];
  const h = [0, 20, 34, 50][size];

  g.fillStyle(COLORS.shadow, 0.1);
  g.fillRoundedRect(-w / 2 + 2, -h / 2 + 4, w, h, 7);
  g.fillStyle(COLORS.waterLight);
  g.fillRoundedRect(-w / 2, -h / 2, w, h, 7);
  g.fillStyle(COLORS.white, 0.8);
  g.fillRect(-w / 2, -h / 5, w, Math.max(2, h / 9));
  g.fillRect(-w / 2, h / 8, w, Math.max(2, h / 9));
  g.lineStyle(2, COLORS.waterDeep, 0.4);
  g.strokeRoundedRect(-w / 2, -h / 2, w, h, 7);

  c.add(g);
  return c;
}

function drawLetter(scene: Phaser.Scene, letter: string): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0);
  c.add(scene.add.text(0, 0, letter, text(46, INK, 'bold')).setOrigin(0.5));
  return c;
}

/** The pool thermometer, for the adjust template. */
export function drawThermometer(
  scene: Phaser.Scene,
  value: number,
  min: number,
  max: number
): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0);
  const g = scene.add.graphics();
  const h = 116;
  const bulb = 15;

  g.fillStyle(COLORS.white);
  g.fillRoundedRect(-11, -h / 2, 22, h - bulb, 11);
  g.fillCircle(0, h / 2 - bulb + 4, bulb);
  g.lineStyle(2.5, COLORS.stoneDeep, 0.5);
  g.strokeRoundedRect(-11, -h / 2, 22, h - bulb, 11);
  g.strokeCircle(0, h / 2 - bulb + 4, bulb);

  const ratio = Phaser.Math.Clamp((value - min) / (max - min), 0, 1);
  const trackTop = -h / 2 + 8;
  const trackBottom = h / 2 - bulb - 4;
  const fillTop = trackBottom - (trackBottom - trackTop) * ratio;

  // cool below, warm above — the colour is a second cue for the same number
  const warm = ratio > 0.55;
  g.fillStyle(warm ? COLORS.red : COLORS.water);
  g.fillRoundedRect(-5, fillTop, 10, trackBottom - fillTop, 5);
  g.fillCircle(0, h / 2 - bulb + 4, bulb - 5);

  // scale marks
  g.lineStyle(2, COLORS.stoneDeep, 0.45);
  for (let i = 0; i <= 5; i++) {
    const y = trackTop + ((trackBottom - trackTop) * i) / 5;
    g.lineBetween(12, y, 20, y);
  }

  c.add(g);
  return c;
}

/** Reads a clock value the way a Danish child would say it. */
export function clockLabel(hour: number): string {
  const whole = Math.floor(hour);
  const isHalf = Math.abs(hour - whole - 0.5) < 0.01;
  // "halv otte" is 7:30 in Danish — the half *before* eight
  return isHalf ? `halv ${danishHour(whole + 1)}` : `${danishHour(whole)}`;
}

const HOUR_WORDS = [
  'tolv', 'et', 'to', 'tre', 'fire', 'fem', 'seks',
  'syv', 'otte', 'ni', 'ti', 'elleve', 'tolv',
];

function danishHour(hour: number): string {
  const h = ((hour - 1) % 12) + 1;
  return HOUR_WORDS[h] ?? String(h);
}
