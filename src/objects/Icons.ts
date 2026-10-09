import Phaser from 'phaser';
import { COLORS, LINE } from '../config';
import type { Destination } from '../state/GameState';
import {
  colourOf, flavourOf, isIce, parseGarment, parseIce,
} from '../state/Extras';
import { shade } from '../helpers/Draw';

/**
 * The game's small pictures.
 *
 * One rule: **a place has one picture, everywhere.** The pool is the same three waves on
 * the map button, in a guest's thought bubble and on the badge of a guest following you
 * there. A child who cannot read "restauranten" can still match a plate to a plate, which
 * is the only reason the map can send a five-year-old anywhere.
 *
 * Every painter draws centred on (0, 0) into a Graphics the caller has already positioned,
 * at roughly a 12px radius times `s`.
 */
export type IconPainter = (g: Phaser.GameObjects.Graphics, s?: number) => void;

const OUT = COLORS.outline;

export function paintBell(g: Phaser.GameObjects.Graphics, s = 1): void {
  g.fillStyle(COLORS.stone);
  g.fillRoundedRect(-11 * s, 6 * s, 22 * s, 4 * s, 2 * s);
  g.fillStyle(COLORS.sunDeep);
  g.fillCircle(0, 0, 10 * s);
  g.fillStyle(COLORS.sun);
  g.fillCircle(-0.5 * s, -1 * s, 8.5 * s);
  g.fillStyle(COLORS.white, 0.6);
  g.fillEllipse(-3 * s, -4 * s, 5 * s, 3 * s);
  g.fillStyle(COLORS.sunDeep);
  g.fillCircle(0, -11 * s, 3 * s);
  g.lineStyle(LINE.hair, OUT, 0.85);
  g.strokeCircle(0, 0, 10 * s);
}

export function paintBed(g: Phaser.GameObjects.Graphics, s = 1): void {
  g.fillStyle(COLORS.wood);
  g.fillRoundedRect(-13 * s, -1 * s, 26 * s, 9 * s, 3 * s);
  g.fillStyle(COLORS.woodDeep);
  g.fillRoundedRect(-14 * s, -8 * s, 5 * s, 16 * s, 2 * s);
  g.fillStyle(COLORS.pink);
  g.fillRoundedRect(-4 * s, -5 * s, 17 * s, 8 * s, 3 * s);
  g.fillStyle(COLORS.white);
  g.fillRoundedRect(-9 * s, -5 * s, 7 * s, 6 * s, 2.5 * s);
  g.lineStyle(LINE.hair, OUT, 0.85);
  g.strokeRoundedRect(-13 * s, -1 * s, 26 * s, 9 * s, 3 * s);
  g.strokeRoundedRect(-4 * s, -5 * s, 17 * s, 8 * s, 3 * s);
}

/** A plate between a fork and a knife — the restaurant, and a guest who wants to order. */
export function paintPlate(g: Phaser.GameObjects.Graphics, s = 1): void {
  g.fillStyle(COLORS.white);
  g.fillCircle(0, 0, 9 * s);
  g.lineStyle(LINE.hair, OUT, 0.85);
  g.strokeCircle(0, 0, 9 * s);
  g.fillStyle(COLORS.stone, 0.7);
  g.fillCircle(0, 0, 5.5 * s);

  g.fillStyle(COLORS.stoneDeep);
  // fork
  g.fillRoundedRect(-14 * s, -3 * s, 2.4 * s, 13 * s, 1.2 * s);
  for (const dx of [-15.2, -13.4, -11.6]) g.fillRect(dx * s, -9 * s, 1.2 * s, 7 * s);
  g.fillRect(-15.2 * s, -3.5 * s, 4.8 * s, 1.6 * s);
  // knife
  g.fillRoundedRect(11.6 * s, -9 * s, 3 * s, 19 * s, 1.5 * s);
}

export function paintWaves(g: Phaser.GameObjects.Graphics, s = 1): void {
  g.fillStyle(COLORS.waterLight);
  g.fillCircle(0, 0, 11 * s);
  g.lineStyle(2.4 * s, COLORS.waterDeep, 0.9);
  [-4, 1, 6].forEach(dy => {
    g.beginPath();
    g.moveTo(-9 * s, dy * s);
    for (let x = -9; x <= 9; x += 3) g.lineTo(x * s, (dy + Math.sin(x * 0.55) * 2) * s);
    g.strokePath();
  });
  g.lineStyle(LINE.hair, OUT, 0.85);
  g.strokeCircle(0, 0, 11 * s);
}

export function paintGardenFlower(g: Phaser.GameObjects.Graphics, s = 1): void {
  g.lineStyle(2.2 * s, COLORS.grassDeep);
  g.beginPath();
  g.moveTo(0, 11 * s);
  g.lineTo(0, 1 * s);
  g.strokePath();
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    g.fillStyle(COLORS.pink);
    g.fillCircle(Math.cos(a) * 5.5 * s, Math.sin(a) * 5.5 * s - 2 * s, 5 * s);
    g.lineStyle(1.2, OUT, 0.6);
    g.strokeCircle(Math.cos(a) * 5.5 * s, Math.sin(a) * 5.5 * s - 2 * s, 5 * s);
  }
  g.fillStyle(COLORS.sun);
  g.fillCircle(0, -2 * s, 3.4 * s);
}

export function paintKey(g: Phaser.GameObjects.Graphics, s = 1): void {
  g.fillStyle(COLORS.sunDeep);
  g.fillCircle(-5 * s, 0, 7 * s);
  g.fillRoundedRect(-1 * s, -2.2 * s, 15 * s, 4.4 * s, 2 * s);
  g.fillRect(8 * s, 1 * s, 3 * s, 5 * s);
  g.fillRect(12 * s, 1 * s, 2.5 * s, 4 * s);
  g.fillStyle(COLORS.sun);
  g.fillCircle(-5.5 * s, -0.5 * s, 5.6 * s);
  g.fillStyle(COLORS.white);
  g.fillCircle(-5 * s, 0, 2.4 * s);
  g.lineStyle(LINE.hair, OUT, 0.85);
  g.strokeCircle(-5 * s, 0, 7 * s);
}

/** A suitcase: going home. */
export function paintSuitcase(g: Phaser.GameObjects.Graphics, s = 1): void {
  g.lineStyle(2.4 * s, COLORS.woodDeep);
  g.strokeRoundedRect(-4.5 * s, -11 * s, 9 * s, 7 * s, 2.5 * s);
  g.fillStyle(COLORS.roof);
  g.fillRoundedRect(-12 * s, -6 * s, 24 * s, 16 * s, 3.5 * s);
  g.fillStyle(COLORS.roofDeep);
  g.fillRect(-12 * s, 1 * s, 24 * s, 2.5 * s);
  g.fillStyle(COLORS.sun);
  g.fillRect(-6.5 * s, -6 * s, 2.5 * s, 16 * s);
  g.fillRect(4 * s, -6 * s, 2.5 * s, 16 * s);
  g.lineStyle(LINE.hair, OUT, 0.9);
  g.strokeRoundedRect(-12 * s, -6 * s, 24 * s, 16 * s, 3.5 * s);
}

/** A striped towel on a sun lounger — what a guest at the pool is waiting for. */
export function paintLounger(g: Phaser.GameObjects.Graphics, s = 1): void {
  g.fillStyle(COLORS.woodDeep);
  g.fillRoundedRect(-13 * s, 2 * s, 3 * s, 7 * s, 1 * s);
  g.fillRoundedRect(10 * s, 2 * s, 3 * s, 7 * s, 1 * s);
  g.fillStyle(COLORS.wood);
  g.fillRoundedRect(-14 * s, -2 * s, 28 * s, 6 * s, 2.5 * s);
  g.fillRoundedRect(-15 * s, -10 * s, 7 * s, 10 * s, 2.5 * s);
  g.fillStyle(COLORS.pink);
  g.fillRoundedRect(-9 * s, -4 * s, 21 * s, 6 * s, 2 * s);
  g.fillStyle(COLORS.white, 0.8);
  g.fillRect(-4 * s, -4 * s, 2.5 * s, 6 * s);
  g.fillRect(3 * s, -4 * s, 2.5 * s, 6 * s);
  g.lineStyle(LINE.hair, OUT, 0.85);
  g.strokeRoundedRect(-14 * s, -2 * s, 28 * s, 6 * s, 2.5 * s);
}

/** The arrow a guest who wants to go somewhere puts in front of the place. */
export function paintArrow(g: Phaser.GameObjects.Graphics, s = 1): void {
  g.fillStyle(COLORS.green);
  g.fillRoundedRect(-9 * s, -3 * s, 11 * s, 6 * s, 2 * s);
  g.fillTriangle(1 * s, -8 * s, 1 * s, 8 * s, 10 * s, 0);
  g.lineStyle(LINE.hair, OUT, 0.9);
  g.strokePoints([
    new Phaser.Geom.Point(-9 * s, -3 * s),
    new Phaser.Geom.Point(1 * s, -3 * s),
    new Phaser.Geom.Point(1 * s, -8 * s),
    new Phaser.Geom.Point(10 * s, 0),
    new Phaser.Geom.Point(1 * s, 8 * s),
    new Phaser.Geom.Point(1 * s, 3 * s),
    new Phaser.Geom.Point(-9 * s, 3 * s),
  ], true, true);
}

/* -------------------------------------------------------------- ice cream --- */

/**
 * An ice cream. With a key it is that exact ice — holder, flavour and topping — which is
 * how a guest's order and the thing on the counter can be matched by eye.
 */
export function paintIce(g: Phaser.GameObjects.Graphics, s = 1, key?: string): void {
  const spec = key ? parseIce(key) : null;
  paintIceParts(
    g, s,
    spec?.holder ?? 'vaffel',
    spec ? flavourOf(spec.flavour).color : 0xF4A3B8,
    spec?.topping ?? 'drys'
  );
}

/**
 * An ice cream built up a part at a time — the stand shows it taking shape as the parts are
 * picked, so anything not picked yet is simply left out.
 */
export function paintIceParts(
  g: Phaser.GameObjects.Graphics,
  s: number,
  holder: string | null,
  scoop: number | null,
  topping: string | null
): void {
  if (holder === 'baeger') {
    const cup = [
      new Phaser.Geom.Point(-9 * s, 1 * s),
      new Phaser.Geom.Point(9 * s, 1 * s),
      new Phaser.Geom.Point(6 * s, 13 * s),
      new Phaser.Geom.Point(-6 * s, 13 * s),
    ];
    g.fillStyle(COLORS.water);
    g.fillPoints(cup, true);
    g.fillStyle(COLORS.white, 0.75);
    g.fillRect(-4 * s, 1 * s, 2.5 * s, 12 * s);
    g.fillRect(2 * s, 1 * s, 2.5 * s, 12 * s);
    g.lineStyle(LINE.hair, OUT, 0.9);
    g.strokePoints(cup, true, true);
  } else if (holder === 'vaffel') {
    g.fillStyle(0xE3B271);
    g.fillTriangle(-8 * s, 0, 8 * s, 0, 0, 15 * s);
    g.lineStyle(1 * s, 0xB98446, 0.9);
    g.lineBetween(-5 * s, 1 * s, 2 * s, 11 * s);
    g.lineBetween(5 * s, 1 * s, -2 * s, 11 * s);
    g.lineStyle(LINE.hair, OUT, 0.9);
    g.strokeTriangle(-8 * s, 0, 8 * s, 0, 0, 15 * s);
  }

  if (scoop !== null) {
    g.fillStyle(shade(scoop, -0.18));
    g.fillCircle(0, -4 * s, 9 * s);
    g.fillStyle(scoop);
    g.fillCircle(-0.6 * s, -5 * s, 8 * s);
    g.fillStyle(COLORS.white, 0.4);
    g.fillCircle(-3.5 * s, -8 * s, 2.4 * s);
    g.lineStyle(LINE.hair, OUT, 0.85);
    g.strokeCircle(0, -4 * s, 9 * s);
  }

  // A topping needs something to sit on; without a scoop it sits where the scoop will go.
  if (topping === 'kirsebaer') {
    g.lineStyle(1.3 * s, COLORS.grassDeep);
    g.lineBetween(0.5 * s, -14 * s, 3 * s, -19 * s);
    g.fillStyle(COLORS.red);
    g.fillCircle(0, -13 * s, 3.6 * s);
    g.fillStyle(COLORS.white, 0.5);
    g.fillCircle(-1 * s, -14 * s, 1.1 * s);
    g.lineStyle(LINE.hair, OUT, 0.7);
    g.strokeCircle(0, -13 * s, 3.6 * s);
  } else if (topping === 'drys') {
    const dots: [number, number, number][] = [
      [-4, -8, COLORS.red], [2, -10, COLORS.teal], [4, -5, COLORS.purple],
      [-2, -3, COLORS.sun], [-6, -4, COLORS.green], [1, -6, COLORS.white],
    ];
    for (const [dx, dy, col] of dots) {
      g.fillStyle(col);
      g.fillRoundedRect((dx - 1) * s, (dy - 0.6) * s, 2.4 * s, 1.3 * s, 0.6 * s);
    }
  }
}

/* --------------------------------------------------------------- clothes --- */

/**
 * Something to wear, drawn around a head.
 *
 * The same painter dresses a guest and draws the shop's icon — given a head at (cx, cy)
 * with radius r and the eye line at `eyeY`, everything lands where it belongs. The icon
 * version passes an imaginary head, so a solhat in the shop is the very same solhat the
 * guest walks around in.
 */
export function paintWearable(
  g: Phaser.GameObjects.Graphics,
  key: string,
  cx: number, cy: number, r: number,
  eyeY = cy - r * 0.1,
  tint?: number
): void {
  const spec = parseGarment(key);
  if (!spec) return;
  const col = tint ?? colourOf(spec.colour).color;
  const deep = shade(col, -0.3);
  const line = Math.max(1.2, r * 0.1);

  switch (spec.kind) {
    case 'solhat': {
      // brim, then crown, then band
      g.fillStyle(deep);
      g.fillEllipse(cx, cy - r * 0.62, r * 2.7, r * 0.72);
      g.fillStyle(col);
      g.fillEllipse(cx, cy - r * 0.68, r * 2.6, r * 0.62);
      g.lineStyle(line, COLORS.outline, 0.85);
      g.strokeEllipse(cx, cy - r * 0.65, r * 2.7, r * 0.72);
      g.fillStyle(col);
      g.slice(cx, cy - r * 0.68, r * 0.95, Math.PI, Math.PI * 2, false);
      g.fillPath();
      g.fillStyle(COLORS.white, 0.85);
      g.fillRect(cx - r * 0.95, cy - r * 0.86, r * 1.9, r * 0.2);
      g.lineStyle(line, COLORS.outline, 0.85);
      g.beginPath();
      g.arc(cx, cy - r * 0.68, r * 0.95, Math.PI, Math.PI * 2, false);
      g.strokePath();
      break;
    }
    case 'kasket': {
      g.fillStyle(col);
      g.slice(cx, cy - r * 0.32, r * 1.04, Math.PI, Math.PI * 2, false);
      g.fillPath();
      g.fillStyle(deep);
      g.fillEllipse(cx + r * 0.85, cy - r * 0.34, r * 1.3, r * 0.36);
      g.fillStyle(COLORS.white);
      g.fillCircle(cx, cy - r * 1.32, r * 0.13);
      g.lineStyle(line, COLORS.outline, 0.85);
      g.beginPath();
      g.arc(cx, cy - r * 0.32, r * 1.04, Math.PI, Math.PI * 2, false);
      g.closePath();
      g.strokePath();
      g.strokeEllipse(cx + r * 0.85, cy - r * 0.34, r * 1.3, r * 0.36);
      break;
    }
    case 'solbriller': {
      const lx = r * 0.42;
      const lw = r * 0.62;
      const lh = r * 0.46;
      g.fillStyle(COLORS.ink, 0.92);
      g.fillRoundedRect(cx - lx - lw / 2, eyeY - lh / 2, lw, lh, lh * 0.45);
      g.fillRoundedRect(cx + lx - lw / 2, eyeY - lh / 2, lw, lh, lh * 0.45);
      g.lineStyle(Math.max(1.6, r * 0.13), col, 1);
      g.strokeRoundedRect(cx - lx - lw / 2, eyeY - lh / 2, lw, lh, lh * 0.45);
      g.strokeRoundedRect(cx + lx - lw / 2, eyeY - lh / 2, lw, lh, lh * 0.45);
      g.lineBetween(cx - lx + lw / 2, eyeY - lh * 0.15, cx + lx - lw / 2, eyeY - lh * 0.15);
      g.fillStyle(COLORS.white, 0.55);
      g.fillCircle(cx - lx - lw * 0.18, eyeY - lh * 0.12, r * 0.07);
      g.fillCircle(cx + lx - lw * 0.18, eyeY - lh * 0.12, r * 0.07);
      break;
    }
    case 'krans': {
      // a ring of flowers resting on the hair, leaves between them
      const ry = cy - r * 0.7;
      for (let i = 0; i < 7; i++) {
        const t = i / 6;
        const x = cx - r * 0.95 + t * r * 1.9;
        const y = ry - Math.sin(t * Math.PI) * r * 0.32;
        g.fillStyle(COLORS.grassDeep);
        g.fillEllipse(x + r * 0.14, y + r * 0.08, r * 0.3, r * 0.18);
      }
      for (let i = 0; i < 5; i++) {
        const t = i / 4;
        const x = cx - r * 0.85 + t * r * 1.7;
        const y = ry - Math.sin(t * Math.PI) * r * 0.32;
        g.fillStyle(deep);
        g.fillCircle(x, y, r * 0.24);
        g.fillStyle(col);
        g.fillCircle(x - r * 0.02, y - r * 0.02, r * 0.2);
        g.fillStyle(COLORS.sun);
        g.fillCircle(x, y, r * 0.08);
      }
      break;
    }
  }
}

/** The shop's picture of a piece of clothing, on an imaginary head. */
export function paintGarment(g: Phaser.GameObjects.Graphics, s = 1, key?: string, tint?: number): void {
  const spec = key ? parseGarment(key) : null;
  const kind = spec?.kind ?? 'solhat';
  const r = 10 * s;
  // the imaginary head sits lower for a hat, so the hat ends up centred
  const cy = kind === 'solbriller' ? 0 : kind === 'krans' ? 6 * s : 8 * s;
  paintWearable(g, key ?? 'toej:solhat:roed', 0, cy, r, kind === 'solbriller' ? 0 : undefined, tint);
}

/** An ice cream or a piece of clothing, whichever the key names. */
export function paintExtra(g: Phaser.GameObjects.Graphics, s: number, key: string): void {
  if (isIce(key)) paintIce(g, s, key);
  else paintGarment(g, s, key);
}

/* ---------------------------------------------------------------- places --- */

/** The picture for each place a guest can be taken to. */
export function destinationIcon(dest: Destination): IconPainter {
  switch (dest) {
    case 'pool': return paintWaves;
    case 'restaurant': return paintPlate;
    case 'room': return paintBed;
    case 'checkout': return paintBell;
  }
}

/** The boutique: a sun hat. */
export const paintBoutique: IconPainter = (g, s = 1) => paintGarment(g, s, 'toej:solhat:lilla');
