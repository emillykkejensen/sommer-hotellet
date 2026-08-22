import Phaser from 'phaser';
import { COLORS, INK, text } from '../config';
import { Figure } from './types';

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
  }
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
