import Phaser from 'phaser';
import { COLORS, INK, INK_SOFT, LINE, SIZE, text } from '../config';
import { bob, press, reduceMotion } from './Motion';
import { audio } from './Audio';
import { parseGarment } from '../state/Extras';
import { paintWearable } from '../objects/Icons';

/**
 * The shared drawing kit.
 *
 * The rule that everything here follows: **anything that sits on top of scenery gets an
 * outline.** The previous version relied on soft fills against soft fills, which is why
 * a green button on green grass, or a wooden lounger on sand, dissolved into its
 * background. One warm near-black line (`COLORS.outline`) around every shape is what
 * makes the whole screen read as drawn rather than laid out.
 */

/**
 * Soft drop shadow under a rounded shape. Depth is what stops flat fills from
 * reading as slabs, so most solid objects get one.
 */
export function shadow(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, w: number, h: number,
  radius = 10, offset = 3, alpha = 0.12
): void {
  g.fillStyle(COLORS.shadow, alpha);
  g.fillRoundedRect(x + offset * 0.4, y + offset, w, h, radius);
}

/** Fill plus outline in one call — the shape every plate, card and sign is built from. */
export function plate(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, w: number, h: number,
  radius: number,
  fill: number,
  fillAlpha = 1,
  line = LINE.base,
  lineAlpha = 1
): void {
  g.fillStyle(fill, fillAlpha);
  g.fillRoundedRect(x, y, w, h, radius);
  g.lineStyle(line, COLORS.outline, lineAlpha);
  g.strokeRoundedRect(x, y, w, h, radius);
}

/** The glossy top band that turns a flat fill into something with a surface. */
export function sheen(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, w: number, h: number,
  radius: number,
  alpha = 0.28
): void {
  g.fillStyle(COLORS.white, alpha);
  // Clamped: a radius over half the band's height makes Phaser draw stray corners outside
  // it, which shows as pale squares behind any near-square button.
  const bandH = h * 0.42;
  g.fillRoundedRect(x + 4, y + 4, w - 8, bandH, Math.min(radius, bandH / 2, (w - 8) / 2));
}

/** A light card surface — used for signs, panels and boards. */
export function panel(
  scene: Phaser.Scene,
  x: number, y: number, w: number, h: number,
  fill: number = COLORS.white,
  radius = 14
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  shadow(g, x - w / 2, y - h / 2, w, h, radius, 4, 0.16);
  plate(g, x - w / 2, y - h / 2, w, h, radius, fill);
  return g;
}

/**
 * Small caption attached to an interactive object.
 *
 * Now a hand-drawn tag rather than a translucent plate: outlined, tilted a degree or
 * two, and carrying a state dot on the left. The dot is what lets a child scan a screen
 * and see which jobs are left without reading a word of Danish — an amber dot means
 * "this one still wants you", a green tick means "done".
 */
export function caption(
  scene: Phaser.Scene,
  x: number, y: number,
  label: string,
  tone: 'idle' | 'done' = 'idle'
): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);
  const done = tone === 'done';

  const t = scene.add.text(0, 0, label, text(SIZE.label, done ? INK_SOFT : INK, 'bold'))
    .setOrigin(0.5);

  const dotW = 18;
  const w = t.width + 30 + dotW;
  const h = t.height + 13;
  t.setX(dotW / 2 + 3);

  const bg = scene.add.graphics();
  shadow(bg, -w / 2, -h / 2, w, h, h / 2, 2, 0.14);
  plate(bg, -w / 2, -h / 2, w, h, h / 2, done ? COLORS.cream : COLORS.white, done ? 0.92 : 1, LINE.thin, done ? 0.5 : 0.85);

  // Drawn into the same Graphics as the plate, and outlined by underlay — one object
  // and no stroked circle. Captions are the most-repeated element in the game.
  const mx = -w / 2 + 16;
  if (done) {
    bg.fillStyle(shade(COLORS.green, -0.4));
    bg.fillCircle(mx, 0, 8.5);
    bg.fillStyle(COLORS.green);
    bg.fillCircle(mx, 0, 7.5);
    bg.lineStyle(2, COLORS.white, 1);
    bg.beginPath();
    bg.moveTo(mx - 3.2, 0);
    bg.lineTo(mx - 1, 2.6);
    bg.lineTo(mx + 3.4, -2.8);
    bg.strokePath();
  } else {
    bg.fillStyle(COLORS.outline, 0.7);
    bg.fillCircle(mx, 0, 7.5);
    bg.fillStyle(COLORS.sun);
    bg.fillCircle(mx, 0, 6.5);
  }

  c.add([bg, t]);

  // A tag pinned by hand is never quite straight. Deterministic from the label so the
  // same caption does not jitter to a new angle on every refresh().
  const lean = ((label.length % 5) - 2) * 0.5;
  c.setAngle(lean);

  return c;
}

/**
 * The chunky button.
 *
 * Built as a face sitting on a darker lip, so pressing it can push the face down onto
 * the lip instead of merely scaling it — the difference between a web control and
 * something a four-year-old wants to poke again.
 */
export function button(
  scene: Phaser.Scene,
  x: number, y: number,
  label: string,
  color: number,
  onClick: () => void,
  w = 210, h = 52,
  size = SIZE.heading
): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);
  const r = h / 2;
  const lip = Math.max(5, Math.round(h * 0.14));

  const base = scene.add.graphics();
  shadow(base, -w / 2, -h / 2, w, h + lip, r, 4, 0.2);
  plate(base, -w / 2, -h / 2 + lip, w, h, r, shade(color, -0.24), 1, LINE.thick);
  c.add(base);

  // Everything that moves on press lives in one child container.
  const face = scene.add.container(0, 0);
  const g = scene.add.graphics();
  plate(g, -w / 2, -h / 2, w, h, r, color, 1, LINE.thick);
  sheen(g, -w / 2, -h / 2, w, h, r);
  const t = scene.add.text(0, 0, label, text(size, '#FFFFFF', 'bold')).setOrigin(0.5);
  t.setShadow(0, 2, 'rgba(74,58,44,0.45)', 0, false, true);
  face.add([g, t]);
  c.add(face);

  c.setSize(w, h + lip);
  c.setInteractive({ useHandCursor: true });

  if (!reduceMotion()) {
    c.on('pointerover', () => scene.tweens.add({ targets: c, scale: 1.05, duration: 130, ease: 'Back.easeOut' }));
    c.on('pointerout', () => scene.tweens.add({ targets: c, scale: 1, duration: 130 }));
  }

  c.on('pointerdown', () => {
    audio.tap();
    if (reduceMotion()) {
      onClick();
      return;
    }
    scene.tweens.add({
      targets: face,
      y: lip,
      duration: 70,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: onClick,
    });
  });

  return c;
}

/** Makes any container tappable with the same squash feedback as `button`. */
export function tappable(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.Container,
  w: number, h: number,
  onClick: () => void,
  sound: 'tap' | 'pop' | 'bell' = 'pop'
): void {
  target.setSize(w, h);
  target.setInteractive({ useHandCursor: true });
  const base = target.scale;
  if (!reduceMotion()) {
    target.on('pointerover', () => scene.tweens.add({ targets: target, scale: base * 1.06, duration: 130, ease: 'Back.easeOut' }));
    target.on('pointerout', () => scene.tweens.add({ targets: target, scale: base, duration: 130 }));
  }
  target.on('pointerdown', () => {
    audio[sound]();
    press(scene, target, onClick, 0.9);
  });
}

/**
 * Lightens (`amount` > 0) or darkens a colour.
 *
 * Used for the button lip, the shaded side of every solid, and the pressed state, so
 * those shades are derived from one hue rather than hand-picked per call site — which
 * is what let the old palette drift.
 */
export function shade(color: number, amount: number): number {
  const c = Phaser.Display.Color.IntegerToColor(color);
  const mix = (v: number) => amount >= 0
    ? Math.round(v + (255 - v) * amount)
    : Math.round(v * (1 + amount));
  return Phaser.Display.Color.GetColor(mix(c.red), mix(c.green), mix(c.blue));
}

/** Vertical gradient band — replaces the flat sky and grass fills. */
export function gradientBand(
  scene: Phaser.Scene,
  y: number, h: number,
  top: number, bottom: number
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillGradientStyle(top, top, bottom, bottom, 1);
  g.fillRect(0, y, scene.scale.width, h);
  return g;
}

/**
 * Title banner: a ribbon with folded tails.
 *
 * Scene titles used to be bare outlined text floating in the sky, which is why every
 * screen opened looking like a slide. A banner gives the title somewhere to hang from.
 */
export function ribbon(
  scene: Phaser.Scene,
  x: number, y: number,
  label: string,
  color: number = COLORS.roof,
  size = SIZE.title
): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);

  const t = scene.add.text(0, 0, label, text(size, '#FFFFFF', 'bold')).setOrigin(0.5);
  t.setShadow(0, 2, 'rgba(74,58,44,0.5)', 0, false, true);

  const w = t.width + 56;
  const h = t.height + 16;
  const tail = 22;

  const g = scene.add.graphics();

  // tails first, so the body overlaps their inner ends
  const deep = shade(color, -0.28);
  [-1, 1].forEach(side => {
    const ox = side * (w / 2 - 4);
    g.fillStyle(deep);
    g.beginPath();
    g.moveTo(ox, -h / 2 + 3);
    g.lineTo(ox + side * tail, -h / 2 - 3);
    g.lineTo(ox + side * tail, h / 2 + 7);
    g.lineTo(ox, h / 2 - 3);
    g.closePath();
    g.fillPath();
    g.lineStyle(LINE.base, COLORS.outline);
    g.strokePath();
  });

  shadow(g, -w / 2, -h / 2, w, h, 9, 4, 0.2);
  plate(g, -w / 2, -h / 2, w, h, 9, color, 1, LINE.thick);
  sheen(g, -w / 2, -h / 2, w, h, 8, 0.22);

  c.add([g, t]);
  c.setSize(w + tail * 2, h);
  return c;
}

/**
 * A string of triangular flags. Nothing says "somewhere nice is happening here" for
 * this age group as cheaply as bunting, and it fills the dead sky the old screens had.
 *
 * Every flag is painted into a single Graphics rather than getting its own object. Each
 * Graphics is a separate batch flush in Phaser's WebGL renderer, and thirteen of them
 * animating independently cost more frame time than the ripple was worth — the whole
 * string sways as one instead.
 */
export function bunting(
  scene: Phaser.Scene,
  x1: number, y1: number,
  x2: number, y2: number,
  count = 9,
  sag = 26
): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0);
  const g = scene.add.graphics();
  const palette = [COLORS.red, COLORS.sun, COLORS.teal, COLORS.pink, COLORS.purple, COLORS.green];

  // Quadratic sag, so the line hangs instead of running straight across.
  const at = (t: number) => {
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2 + sag * 2;
    const mt = 1 - t;
    return {
      x: mt * mt * x1 + 2 * mt * t * cx + t * t * x2,
      y: mt * mt * y1 + 2 * mt * t * cy + t * t * y2,
    };
  };

  g.lineStyle(LINE.base, COLORS.outline, 0.75);
  g.beginPath();
  for (let i = 0; i <= 40; i++) {
    const p = at(i / 40);
    if (i === 0) g.moveTo(p.x, p.y);
    else g.lineTo(p.x, p.y);
  }
  g.strokePath();

  for (let i = 0; i < count; i++) {
    const p = at((i + 0.5) / count);
    const col = palette[i % palette.length];
    // Alternating widths stand in for the old per-flag flutter.
    const half = i % 2 === 0 ? 9 : 7;

    g.fillStyle(col);
    g.fillTriangle(p.x - half, p.y, p.x + half, p.y, p.x, p.y + 22);
    g.lineStyle(LINE.thin, COLORS.outline, 0.85);
    g.strokeTriangle(p.x - half, p.y, p.x + half, p.y, p.x, p.y + 22);
    g.fillStyle(COLORS.white, 0.22);
    g.fillTriangle(p.x - half, p.y, p.x, p.y, p.x - half / 2, p.y + 11);
  }

  c.add(g);
  bob(scene, c, 4, 3200);
  return c;
}

/** Chunky progress bar. Reads as a filling tube rather than a row of dots. */
export function progressBar(
  scene: Phaser.Scene,
  x: number, y: number,
  w: number, h: number,
  fraction: number,
  color: number = COLORS.green
): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  const r = h / 2;
  const f = Phaser.Math.Clamp(fraction, 0, 1);

  plate(g, -w / 2, -h / 2, w, h, r, COLORS.white, 0.92, LINE.thin);

  if (f > 0) {
    // Never narrower than its own cap, or the first sliver draws as a lens shape.
    const fw = Math.max(h, w * f);
    g.fillStyle(shade(color, -0.2));
    g.fillRoundedRect(-w / 2, -h / 2, fw, h, r);
    g.fillStyle(color);
    g.fillRoundedRect(-w / 2, -h / 2, fw, h - 3, r);
    g.fillStyle(COLORS.white, 0.35);
    g.fillRoundedRect(-w / 2 + 3, -h / 2 + 2.5, fw - 6, h * 0.32, r);
    g.lineStyle(LINE.thin, COLORS.outline, 1);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, r);
  }

  c.add(g);
  return c;
}

/** Small round count badge — "3 jobs left" on a map button. */
export function badge(
  scene: Phaser.Scene,
  x: number, y: number,
  label: string,
  color: number = COLORS.red
): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  const r = 14;

  g.fillStyle(COLORS.shadow, 0.2);
  g.fillCircle(1, 2.5, r);
  g.fillStyle(color);
  g.fillCircle(0, 0, r);
  g.fillStyle(COLORS.white, 0.3);
  g.fillCircle(-4, -5, r * 0.42);
  g.lineStyle(LINE.base, COLORS.outline);
  g.strokeCircle(0, 0, r);

  c.add([g, scene.add.text(0, 0, label, text(SIZE.label, '#FFFFFF', 'bold')).setOrigin(0.5)]);
  return c;
}

/** A five-pointed star drawn to the same spec everywhere: gold, shaded, outlined. */
export function drawStarShape(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number,
  radius: number,
  outline = true
): void {
  g.fillStyle(COLORS.sunDeep);
  g.fillPoints(starPoints(x, y + radius * 0.12, radius), true);
  g.fillStyle(COLORS.sun);
  g.fillPoints(starPoints(x, y, radius), true);
  if (outline) {
    g.lineStyle(LINE.thin, COLORS.outline, 0.9);
    g.strokePoints(starPoints(x, y, radius), true, true);
  }
}

function starPoints(cx: number, cy: number, radius: number): Phaser.Geom.Point[] {
  const pts: Phaser.Geom.Point[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? radius : radius * 0.46;
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    pts.push(new Phaser.Geom.Point(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
  }
  return pts;
}

export function drawSun(scene: Phaser.Scene, x: number, y: number, radius = 26): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);

  const rays = scene.add.graphics();
  // Tapered spikes rather than dots — a ring of circles read as a cog.
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const inner = radius + 4;
    const outer = radius + (i % 2 === 0 ? 20 : 13);
    const spread = 0.1;
    rays.fillStyle(COLORS.sun, 0.55);
    rays.fillTriangle(
      Math.cos(a - spread) * inner, Math.sin(a - spread) * inner,
      Math.cos(a + spread) * inner, Math.sin(a + spread) * inner,
      Math.cos(a) * outer, Math.sin(a) * outer
    );
  }

  const glow = scene.add.graphics();
  glow.fillStyle(COLORS.sun, 0.25);
  glow.fillCircle(0, 0, radius * 1.4);

  const body = scene.add.graphics();
  body.fillStyle(COLORS.sunDeep);
  body.fillCircle(0, 2, radius);
  body.fillStyle(COLORS.sun);
  body.fillCircle(0, 0, radius);
  body.lineStyle(LINE.base, COLORS.outline, 0.75);
  body.strokeCircle(0, 0, radius);
  body.fillStyle(COLORS.white, 0.4);
  body.fillEllipse(-radius * 0.33, -radius * 0.38, radius * 0.55, radius * 0.4);

  // A face. This is a hotel run by a four-year-old; the sun is allowed to be pleased.
  // Drawn into the body rather than its own object — it never animates separately.
  const face = body;
  face.fillStyle(COLORS.outline, 0.75);
  face.fillCircle(-radius * 0.3, -radius * 0.1, radius * 0.1);
  face.fillCircle(radius * 0.3, -radius * 0.1, radius * 0.1);
  face.lineStyle(radius * 0.09, COLORS.outline, 0.7);
  face.beginPath();
  face.arc(0, radius * 0.06, radius * 0.42, 0.35, Math.PI - 0.35, false);
  face.strokePath();
  face.fillStyle(COLORS.roof, 0.28);
  face.fillCircle(-radius * 0.56, radius * 0.2, radius * 0.16);
  face.fillCircle(radius * 0.56, radius * 0.2, radius * 0.16);

  c.add([rays, glow, body]);

  if (!reduceMotion()) {
    scene.tweens.add({ targets: rays, angle: 360, duration: 34000, repeat: -1 });
    scene.tweens.add({
      targets: glow, scale: 1.14, duration: 3000,
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
  }

  return c;
}

export function drawCloud(scene: Phaser.Scene, x: number, y: number, scale = 1): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  const s = scale;

  g.fillStyle(COLORS.skyDeep, 0.28);
  g.fillCircle(2 * s, 8 * s, 22 * s);
  g.fillCircle(-20 * s, 11 * s, 15 * s);
  g.fillCircle(22 * s, 11 * s, 17 * s);

  g.fillStyle(COLORS.white, 0.97);
  g.fillCircle(0, 0, 22 * s);
  g.fillCircle(-20 * s, 6 * s, 15 * s);
  g.fillCircle(20 * s, 6 * s, 17 * s);
  g.fillCircle(8 * s, -12 * s, 15 * s);

  c.add(g);
  return c;
}

/** Two wing strokes — the cheapest possible bird, and it fills a lot of empty sky. */
export function drawBird(scene: Phaser.Scene, x: number, y: number, scale = 1): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y).setScale(scale);
  const g = scene.add.graphics();
  g.lineStyle(2.4, COLORS.outline, 0.55);
  g.beginPath();
  g.moveTo(-11, 0);
  g.lineTo(-5, -6);
  g.lineTo(0, -1);
  g.lineTo(5, -6);
  g.lineTo(11, 0);
  g.strokePath();
  c.add(g);

  if (!reduceMotion()) {
    scene.tweens.add({
      targets: g,
      scaleY: { from: 1, to: 0.45 },
      duration: 420,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }
  return c;
}

/**
 * Sends a few birds drifting across the top of an outdoor scene. Slow enough to be
 * scenery, not slow enough to look frozen.
 */
export function addBirds(scene: Phaser.Scene, count = 3, topY = 70, band = 60): Phaser.GameObjects.Container[] {
  const { width } = scene.scale;
  const out: Phaser.GameObjects.Container[] = [];
  for (let i = 0; i < count; i++) {
    const y = topY + (i / Math.max(1, count - 1)) * band;
    const b = drawBird(scene, -40 - i * 120, y, 0.7 + (i % 2) * 0.35);
    out.push(b);
    if (reduceMotion()) {
      b.setX(160 + i * 240);
      continue;
    }
    scene.tweens.add({
      targets: b,
      x: width + 60,
      duration: 26000 + i * 7000,
      repeat: -1,
      delay: i * 5200,
      ease: 'Linear',
    });
    scene.tweens.add({
      targets: b,
      y: y + 16,
      duration: 3400 + i * 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }
  return out;
}

export function drawTree(scene: Phaser.Scene, x: number, y: number, scale = 1): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  const s = scale;

  g.fillStyle(COLORS.shadow, 0.12);
  g.fillEllipse(4 * s, 22 * s, 50 * s, 13 * s);

  g.fillStyle(COLORS.woodDeep);
  g.fillRoundedRect(-7 * s, -18 * s, 14 * s, 40 * s, 5 * s);
  g.fillStyle(COLORS.wood);
  g.fillRoundedRect(-7 * s, -18 * s, 8 * s, 40 * s, 4 * s);
  g.lineStyle(LINE.thin * s, COLORS.outline, 0.75);
  g.strokeRoundedRect(-7 * s, -18 * s, 14 * s, 40 * s, 5 * s);

  g.fillStyle(COLORS.grassDeep);
  g.fillCircle(3 * s, -36 * s, 29 * s);
  g.fillCircle(-17 * s, -22 * s, 21 * s);
  g.fillCircle(19 * s, -22 * s, 21 * s);

  g.fillStyle(COLORS.grass);
  g.fillCircle(0, -40 * s, 26 * s);
  g.fillCircle(-16 * s, -25 * s, 18 * s);
  g.fillCircle(16 * s, -25 * s, 18 * s);

  g.fillStyle(COLORS.grassLight, 0.6);
  g.fillCircle(-8 * s, -48 * s, 11 * s);

  // One outline traced around the outside of the canopy lumps, not each lump.
  g.lineStyle(LINE.base * s, COLORS.outline, 0.7);
  g.strokeCircle(3 * s, -36 * s, 29 * s);
  g.strokeCircle(-17 * s, -22 * s, 21 * s);
  g.strokeCircle(19 * s, -22 * s, 21 * s);

  c.add(g);
  return c;
}

/**
 * Paints a flower into an existing Graphics.
 *
 * The `paint*` half of this module exists so a scene can batch a whole field of scenery
 * into one Graphics object. Eleven separate flower objects on the title screen cost
 * eleven draw calls to say the same thing one costs.
 */
export function paintFlower(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number,
  petal: number = COLORS.pink,
  scale = 1
): void {
  const s = scale;

  g.lineStyle(2.8 * s, COLORS.grassDeep);
  g.beginPath();
  g.moveTo(x, y + 20 * s);
  g.lineTo(x, y + 2 * s);
  g.strokePath();

  g.fillStyle(COLORS.grassDeep);
  g.fillEllipse(x - 6 * s, y + 12 * s, 12.5 * s, 7.5 * s);
  g.fillStyle(COLORS.grass);
  g.fillEllipse(x - 6 * s, y + 12 * s, 11 * s, 6 * s);

  // Outlined by underlay rather than by stroking each petal: a stroked circle costs
  // Phaser a full triangle strip round the rim, and these flowers are redrawn every
  // frame in the garden's dynamic layer. Two fills beat a fill plus a stroke, and at
  // this size the result is indistinguishable.
  const ring = shade(COLORS.outline, 0.28);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    const px = x + Math.cos(a) * 6.5 * s;
    const py = y + Math.sin(a) * 6.5 * s;
    g.fillStyle(ring, 0.75);
    g.fillCircle(px, py, 7 * s);
  }
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    g.fillStyle(petal, 1);
    g.fillCircle(x + Math.cos(a) * 6.5 * s, y + Math.sin(a) * 6.5 * s, 6 * s);
  }
  g.fillStyle(ring, 0.75);
  g.fillCircle(x, y, 5 * s);
  g.fillStyle(COLORS.sun);
  g.fillCircle(x, y, 4 * s);
}

/** A flower as its own object — for the ones that have to appear, move or be tapped. */
export function drawFlower(
  scene: Phaser.Scene,
  x: number, y: number,
  petal: number = COLORS.pink,
  scale = 1
): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  paintFlower(g, 0, 0, petal, scale);
  c.add(g);
  return c;
}

/**
 * Scatters decorative flowers across a band of ground, all into one Graphics.
 *
 * `rng` is passed a 0-1 position so callers can keep a deterministic layout if they
 * want one; by default the placement is random per scene start.
 */
export function scatterFlowers(
  scene: Phaser.Scene,
  count: number,
  topY: number, bottomY: number,
  scale = 0.6,
  margin = 36
): Phaser.GameObjects.Graphics {
  const { width } = scene.scale;
  const g = scene.add.graphics();
  const petals = [COLORS.pink, COLORS.yellow, COLORS.purple, COLORS.white];
  for (let i = 0; i < count; i++) {
    paintFlower(
      g,
      Phaser.Math.Between(margin, width - margin),
      Phaser.Math.Between(topY, bottomY),
      petals[i % petals.length],
      scale
    );
  }
  return g;
}

/* ------------------------------------------------------------------- people --- */

/**
 * What a guest looks like, beyond the colour they are known by.
 *
 * The body colour is the guest's identity — the order board and the patience bar match it —
 * so it always stays the shirt or dress. Everything else is derived from a seed (the guest
 * id), so a lobby of three is three people rather than one person three times, and the same
 * guest looks the same in every room they walk into.
 *
 * Each trait cycles on a different length (6 styles, 5 skin tones, 7 hair slots, 4 outfits),
 * so neighbouring ids never share a hair style and the full combination only comes round
 * again after hundreds of guests.
 */
interface Look {
  skin: number;
  hair: number;
  /** Every silver-haired guest, and the odd other one. */
  glasses: boolean;
  style: HairStyle;
  outfit: 'trousers' | 'shorts' | 'dress';
  trousers: number;
  shoes: number;
  blush: number;
  blushAlpha: number;
}

type HairStyle = 'short' | 'bob' | 'curly' | 'bun' | 'pigtails' | 'sunhat';

const HAIR_STYLES: HairStyle[] = ['short', 'bob', 'curly', 'bun', 'pigtails', 'sunhat'];
/** Light to dark, all warm. The darkest stays light enough for the eyes to read against. */
const SKIN_TONES = [0xFCE3CC, 0xF2C9A2, 0xDDA678, 0xB97F52, 0x8E5B3B];
/** Brown, near-black, chestnut, ginger, blond, silver. Never black. */
const HAIR_COLORS = [0x6E452B, 0x413026, 0xA4683A, 0xCF8744, 0xE6C26C, 0xD5CEC4];
const TROUSERS = [0x5D7BA6, 0x7B5E49, 0x626A78, 0xAD9268];
const SHOES = [0x7A5038, COLORS.red, COLORS.white];

function lookFor(seed: number): Look {
  const n = Math.abs(Math.trunc(seed)) || 0;
  const skinIndex = [1, 3, 0, 4, 2][n % 5];
  let hairIndex = [0, 4, 1, 2, 5, 3, 1][n % 7];
  // On the two darkest tones chestnut, ginger or blond hair has too little contrast to read
  // as hair at all — it turns into a bald head. They get near-black (or a dark brown on the
  // lighter of the two); silver stays, because it reads against anything.
  const dark = skinIndex >= 3;
  if (dark && hairIndex !== 5) hairIndex = skinIndex === 3 && n % 2 === 0 ? 0 : 1;
  return {
    skin: SKIN_TONES[skinIndex],
    hair: HAIR_COLORS[hairIndex],
    glasses: hairIndex === 5 || n % 12 === 7,
    style: HAIR_STYLES[n % HAIR_STYLES.length],
    outfit: (['trousers', 'dress', 'shorts', 'trousers'] as const)[n % 4],
    trousers: TROUSERS[(n >> 1) % TROUSERS.length],
    shoes: SHOES[n % SHOES.length],
    // Pink blush disappears on darker skin; a warmer red still reads as rosy.
    blush: dark ? COLORS.red : COLORS.pink,
    blushAlpha: dark ? 0.4 : 0.5,
  };
}

/**
 * A guest's look, with anything they were given at the boutique taking the place of what
 * they came with: a sun hat or a cap goes on instead of their own sun hat, and sunglasses
 * instead of their glasses.
 */
function dressedLook(seed: number, wearing: string | null): Look {
  const base = lookFor(seed);
  const kind = wearing ? parseGarment(wearing)?.kind : undefined;
  if (!kind) return base;
  if (kind === 'solbriller') return { ...base, glasses: false };
  return base.style === 'sunhat' ? { ...base, style: 'short' } : base;
}

/** The boutique's gift, on its own Graphics above the eyes so sunglasses cover them. */
function dressUp(
  scene: Phaser.Scene,
  wearing: string | null,
  head: { x: number; y: number; r: number },
  eyeY: number
): Phaser.GameObjects.Graphics | null {
  if (!wearing) return null;
  const worn = scene.add.graphics();
  paintWearable(worn, wearing, head.x, head.y, head.r, eyeY);
  return worn;
}

/**
 * Outline width for people, as an underlay.
 *
 * A person is a dozen small parts, and stroking each one is what made the old figure
 * expensive: forty of them on screen cost about three times the frame time these do under
 * software WebGL. Instead every part is filled twice: once in the outline colour grown by
 * this much, then in its own colour. Parts drawn later lay their ink over earlier ones, so a
 * sleeve gets a line where it crosses the shirt and a chin gets one against the collar,
 * with no stroke anywhere.
 */
const PERSON_INK = 1.9;
const PERSON_INK_ALPHA = 0.9;

type Pt = { x: number; y: number };

/** A closed, smooth loop through control points given in units of `r` around (cx, cy). */
function smoothLoop(ctrl: readonly number[], cx: number, cy: number, r: number, steps = 4): Pt[] {
  const n = ctrl.length / 2;
  const px = (i: number) => cx + ctrl[((i + n) % n) * 2] * r;
  const py = (i: number) => cy + ctrl[((i + n) % n) * 2 + 1] * r;
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const x0 = px(i - 1), x1 = px(i), x2 = px(i + 1), x3 = px(i + 2);
    const y0 = py(i - 1), y1 = py(i), y2 = py(i + 1), y3 = py(i + 2);
    for (let k = 0; k < steps; k++) {
      // Catmull-Rom: passes through every control point, so the shapes are easy to tune.
      const t = k / steps, t2 = t * t, t3 = t2 * t;
      out.push({
        x: 0.5 * (2 * x1 + (x2 - x0) * t + (2 * x0 - 5 * x1 + 4 * x2 - x3) * t2 + (3 * x1 - x0 - 3 * x2 + x3) * t3),
        y: 0.5 * (2 * y1 + (y2 - y0) * t + (2 * y0 - 5 * y1 + 4 * y2 - y3) * t2 + (3 * y1 - y0 - 3 * y2 + y3) * t3),
      });
    }
  }
  return out;
}

/** A polygon with each corner rounded off: one [x, y, radius] per corner. */
function roundPoly(corners: readonly (readonly [number, number, number])[]): Pt[] {
  const out: Pt[] = [];
  const n = corners.length;
  for (let i = 0; i < n; i++) {
    const [px, py] = corners[(i + n - 1) % n];
    const [x, y, r] = corners[i];
    const [nx, ny] = corners[(i + 1) % n];
    const d1 = Math.hypot(px - x, py - y) || 1;
    const d2 = Math.hypot(nx - x, ny - y) || 1;
    const k1 = Math.min(r, d1 / 2) / d1;
    const k2 = Math.min(r, d2 / 2) / d2;
    const ax = x + (px - x) * k1, ay = y + (py - y) * k1;
    const bx = x + (nx - x) * k2, by = y + (ny - y) * k2;
    for (let k = 0; k <= 4; k++) {
      const t = k / 4, m = 1 - t;
      out.push({ x: m * m * ax + 2 * m * t * x + t * t * bx, y: m * m * ay + 2 * m * t * y + t * t * by });
    }
  }
  return out;
}

/** A limb: a rounded bar from one point to another, `w` wide either side. */
function capsule(x1: number, y1: number, x2: number, y2: number, w: number): Pt[] {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const out: Pt[] = [];
  for (let k = 0; k <= 6; k++) {
    const t = a - Math.PI / 2 + (k / 6) * Math.PI;
    out.push({ x: x2 + Math.cos(t) * w, y: y2 + Math.sin(t) * w });
  }
  for (let k = 0; k <= 6; k++) {
    const t = a + Math.PI / 2 + (k / 6) * Math.PI;
    out.push({ x: x1 + Math.cos(t) * w, y: y1 + Math.sin(t) * w });
  }
  return out;
}

function oval(cx: number, cy: number, rx: number, ry: number, n = 20): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    out.push({ x: cx + Math.cos(t) * rx, y: cy + Math.sin(t) * ry });
  }
  return out;
}

/** Grows (or, negative, shrinks) a closed polygon by `d`, mitring each corner. */
function inflate(pts: readonly Pt[], d: number): Pt[] {
  const n = pts.length;
  let area = 0;
  for (let i = 0; i < n; i++) {
    const p = pts[i], q = pts[(i + 1) % n];
    area += p.x * q.y - q.x * p.y;
  }
  const side = area > 0 ? 1 : -1;
  return pts.map((p, i) => {
    const a = pts[(i + n - 1) % n], b = pts[(i + 1) % n];
    let ex = p.x - a.x, ey = p.y - a.y;
    let l = Math.hypot(ex, ey) || 1;
    ex /= l; ey /= l;
    let fx = b.x - p.x, fy = b.y - p.y;
    l = Math.hypot(fx, fy) || 1;
    fx /= l; fy /= l;
    const n1x = ey * side, n1y = -ex * side;
    const n2x = fy * side, n2y = -fx * side;
    const k = d / Math.max(0.35, 1 + n1x * n2x + n1y * n2y);
    return { x: p.x + (n1x + n2x) * k, y: p.y + (n1y + n2y) * k };
  });
}

function shift(pts: readonly Pt[], dx: number, dy: number): Pt[] {
  return pts.map(p => ({ x: p.x + dx, y: p.y + dy }));
}

/** The outline underlay for a group of shapes that should share one silhouette. */
function ink(g: Phaser.GameObjects.Graphics, shapes: readonly Pt[][], o: number): void {
  g.fillStyle(COLORS.outline, PERSON_INK_ALPHA);
  for (const p of shapes) g.fillPoints(inflate(p, o), true);
}

function fill(g: Phaser.GameObjects.Graphics, shapes: readonly Pt[][], color: number, alpha = 1): void {
  g.fillStyle(color, alpha);
  for (const p of shapes) g.fillPoints(p, true);
}

/** Ink, then fill: one outlined part. */
function part(g: Phaser.GameObjects.Graphics, shapes: readonly Pt[][], color: number, o: number): void {
  ink(g, shapes, o);
  fill(g, shapes, color);
}

/** Clothing is shaded the way every other solid is: a darker side, the lit face inset. */
function cloth(g: Phaser.GameObjects.Graphics, shape: Pt[], color: number, o: number, s: number): void {
  ink(g, [shape], o);
  fill(g, [shape], shade(color, -0.16));
  fill(g, [shift(inflate(shape, -1.5 * s), -1.1 * s, -0.9 * s)], color);
}

interface Hair {
  /** Behind everything — drawn before the body, so shoulders sit in front of it. */
  back: Pt[][];
  /** Over the forehead. */
  front: Pt[][];
  /** Whether the front reaches outside the face and so needs its own outline. */
  frontInked: boolean;
  /** Drawn last, outlined on its own: hats and hair ties. */
  extras?: (g: Phaser.GameObjects.Graphics, o: number) => void;
}

/*
 * Hair shapes, as control points in units of the head's radius around its centre (y down).
 * The face is an ellipse 1 wide and 0.93 tall in these units; eyes sit just below centre.
 */
const SHORT_HAIR = [
  -1.02, 0.12, -1.1, -0.4, -0.86, -0.88, -0.34, -1.13, 0.3, -1.14, 0.86, -0.9, 1.1, -0.42,
  1.03, 0.08, 0.86, -0.24, 0.54, -0.46, 0.1, -0.5, -0.3, -0.66, -0.78, -0.42,
];
const BOB_BACK = [
  -1.16, 0.78, -1.27, 0.05, -1.13, -0.68, -0.62, -1.1, 0, -1.18, 0.62, -1.1, 1.13, -0.68,
  1.27, 0.05, 1.16, 0.78, 0.62, 0.86, -0.62, 0.86,
];
const BOB_FRINGE = [
  -1.06, -0.05, -1.04, -0.58, -0.62, -1.02, 0, -1.12, 0.62, -1.02, 1.04, -0.58, 1.06, -0.05,
  0.88, -0.34, 0.44, -0.4, 0, -0.37, -0.44, -0.4, -0.88, -0.34,
];
const PARTED_HAIR = [
  -1.04, 0.04, -1.1, -0.45, -0.8, -0.92, 0, -1.14, 0.8, -0.92, 1.1, -0.45, 1.04, 0.04,
  0.86, -0.3, 0.46, -0.52, 0, -0.64, -0.46, -0.52, -0.86, -0.3,
];
const UNDER_HAT = [
  -1.1, 0.4, -1.16, -0.3, -0.86, -0.84, 0, -1.02, 0.86, -0.84, 1.16, -0.3, 1.1, 0.4,
  0.55, 0.3, -0.55, 0.3,
];

/** Straw for the sun hat. */
const STRAW = 0xF1D38E;
/** Inside of an open, smiling mouth: a warm dark red, not the outline brown. */
const MOUTH = 0x8A3F33;

function hairFor(look: Look, bodyColor: number, cx: number, cy: number, r: number): Hair {
  const at = (ctrl: readonly number[]) => smoothLoop(ctrl, cx, cy, r);
  switch (look.style) {
    case 'short':
      return { back: [], front: [at(SHORT_HAIR)], frontInked: true };
    case 'bob':
      return { back: [at(BOB_BACK)], front: [at(BOB_FRINGE)], frontInked: false };
    case 'curly': {
      // One scalloped outline rather than a ring of circles: the same look, one shape.
      const lobes = 11;
      const ring: Pt[] = [];
      for (let i = 0; i < 66; i++) {
        const t = (i / 66) * Math.PI * 2;
        const k = 1 + 0.11 * (Math.abs(Math.sin((t * lobes) / 2)) - 0.6);
        ring.push({ x: cx + Math.cos(t) * 1.24 * r * k, y: cy - 0.1 * r + Math.sin(t) * 1.08 * r * k });
      }
      const curls = [[-0.66, -0.6], [-0.23, -0.8], [0.23, -0.8], [0.66, -0.6]]
        .map(([x, y]) => oval(cx + x * r, cy + y * r, 0.31 * r, 0.31 * r, 12));
      return { back: [ring], front: curls, frontInked: false };
    }
    case 'bun':
      return { back: [oval(cx, cy - 1.0 * r, 0.3 * r, 0.28 * r, 14)], front: [at(PARTED_HAIR)], frontInked: true };
    case 'pigtails':
      return {
        back: [-1, 1].map(side => oval(cx + side * 1.2 * r, cy + 0.14 * r, 0.3 * r, 0.4 * r, 14)),
        front: [at(PARTED_HAIR)],
        frontInked: true,
        extras: (g, o) => part(
          g,
          [-1, 1].map(side => oval(cx + side * 0.98 * r, cy - 0.16 * r, 0.13 * r, 0.13 * r, 10)),
          shade(bodyColor, -0.25),
          o * 0.7
        ),
      };
    case 'sunhat':
      return {
        back: [at(UNDER_HAT)],
        front: [],
        frontInked: false,
        extras: (g, o) => {
          const crown = oval(cx, cy - 0.86 * r, 0.8 * r, 0.46 * r, 18);
          const brim = oval(cx, cy - 0.5 * r, 1.46 * r, 0.26 * r, 22);
          part(g, [crown], STRAW, o);
          fill(g, [oval(cx, cy - 0.62 * r, 0.8 * r, 0.16 * r, 14)], shade(bodyColor, -0.2));
          part(g, [brim], shade(STRAW, -0.08), o);
          g.fillStyle(COLORS.white, 0.35);
          g.fillEllipse(cx - 0.3 * r, cy - 1.0 * r, 0.42 * r, 0.16 * r);
        },
      };
  }
}

/**
 * A face, its hair and anything on its head, into `g`. Returns the eye line, which is where
 * the separate eyes object goes so that squashing it reads as a blink.
 */
function paintHead(
  g: Phaser.GameObjects.Graphics,
  hair: Hair,
  look: Look,
  cx: number, cy: number, r: number,
  o: number
): number {
  const face = oval(cx, cy, r, r * 0.93, 24);

  // One ink pass for the face and a fringe that pokes out past it, so the hairline on the
  // forehead is a change of colour rather than a line drawn across the face.
  ink(g, hair.frontInked ? [face, ...hair.front] : [face], o);
  fill(g, [face], look.skin);
  fill(g, hair.front, look.hair);
  if (look.style !== 'sunhat') {
    g.fillStyle(COLORS.white, 0.22);
    g.fillEllipse(cx - 0.42 * r, cy - 0.86 * r, 0.5 * r, 0.18 * r);
  }

  // cheeks, and an open smile — a filled shape stays a smile at sizes where a thin
  // stroked arc breaks up into pixels
  g.fillStyle(look.blush, look.blushAlpha);
  g.fillEllipse(cx - 0.6 * r, cy + 0.36 * r, 0.38 * r, 0.24 * r);
  g.fillEllipse(cx + 0.6 * r, cy + 0.36 * r, 0.38 * r, 0.24 * r);
  g.fillStyle(MOUTH);
  g.slice(cx, cy + 0.36 * r, 0.21 * r, 0, Math.PI, false);
  g.fillPath();

  // HEAD.eyeY says the same for drawHead; keep the two in step.
  const eyeY = cy + 0.06 * r;
  if (look.glasses) {
    // Round frames around the eye line; they stay put while the eyes blink inside them.
    // The one place a person is stroked, and only the few guests who wear them pay for it.
    const lens = 0.25 * r;
    g.fillStyle(COLORS.white, 0.3);
    g.fillCircle(cx - 0.36 * r, eyeY, lens);
    g.fillCircle(cx + 0.36 * r, eyeY, lens);
    g.lineStyle(Math.max(1.2, 0.09 * r), COLORS.outline, 0.9);
    g.strokeCircle(cx - 0.36 * r, eyeY, lens);
    g.strokeCircle(cx + 0.36 * r, eyeY, lens);
    g.lineBetween(cx - 0.11 * r, eyeY - 0.04 * r, cx + 0.11 * r, eyeY - 0.04 * r);
  }

  hair.extras?.(g, o);
  return eyeY;
}

/** Eyes into their own Graphics, centred on (0, 0) so a scaleY squash closes them. */
function paintEyes(eyes: Phaser.GameObjects.Graphics, r: number): void {
  eyes.fillStyle(COLORS.outline);
  eyes.fillEllipse(-0.36 * r, 0, 0.21 * r, 0.28 * r);
  eyes.fillEllipse(0.36 * r, 0, 0.21 * r, 0.28 * r);
  eyes.fillStyle(COLORS.white, 0.95);
  eyes.fillCircle(-0.39 * r, -0.06 * r, 0.055 * r);
  eyes.fillCircle(0.33 * r, -0.06 * r, 0.055 * r);
}

/**
 * Guest / staff figure.
 *
 * Proportioned like a picture-book child — a big round head on a small tapered body, about
 * 1 : 1.5 — because the old square torso with arms out to the side read as a block. Anchored
 * at the middle: the head tops out near -38·scale, the shoes and shadow end near +38, and
 * nothing but a sun hat's brim or a pigtail reaches past ±20.
 *
 * `seed` picks skin, hair and outfit (see `lookFor`); pass the guest id so a guest looks
 * the same everywhere. The eyes are a separate Graphics positioned on the eye line, so
 * collapsing its scaleY reads as a blink rather than as the whole face squashing.
 */
export function drawPerson(
  scene: Phaser.Scene,
  x: number, y: number,
  bodyColor: number,
  scale = 1,
  seed = 0,
  wearing: string | null = null
): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  const s = scale;
  const o = PERSON_INK * s;
  const look = dressedLook(seed, wearing);
  const head = { x: 0, y: -21.5 * s, r: 14 * s };
  const hair = hairFor(look, bodyColor, head.x, head.y, head.r);

  g.fillStyle(COLORS.shadow, 0.12);
  g.fillEllipse(0, 35.5 * s, 32 * s, 8 * s);

  part(g, hair.back, look.hair, o);

  // legs, then shorts over them, then shoes over their ends
  const bareLegs = look.outfit !== 'trousers';
  for (const side of [-1, 1]) {
    part(g, [capsule(side * 4.6 * s, 6 * s, side * 5 * s, 31 * s, 3.3 * s)], bareLegs ? look.skin : look.trousers, o);
    if (look.outfit === 'shorts') {
      part(g, [capsule(side * 4.8 * s, 8 * s, side * 5.4 * s, 18 * s, 4.3 * s)], look.trousers, o);
    }
  }
  for (const side of [-1, 1]) {
    const shoe = oval(side * 6.4 * s, 33 * s, 5 * s, 2.9 * s, 14);
    part(g, [shoe], look.shoes, o);
    g.fillStyle(COLORS.white, 0.35);
    g.fillEllipse(side * 6.4 * s - 1.6 * s, 32 * s, 3.4 * s, 1.4 * s);
  }

  // Arms hang just outside the shirt and behind it, so the shirt's ink separates them.
  // The hand is part of the same silhouette as the arm: one round end, no wrist line.
  for (const side of [-1, 1]) {
    part(g, [
      capsule(side * 8.6 * s, -4.5 * s, side * 13 * s, 8.5 * s, 2.8 * s),
      oval(side * 13.6 * s, 10.5 * s, 3.4 * s, 3.4 * s, 12),
    ], look.skin, o);
    part(g, [capsule(side * 9 * s, -4.5 * s, side * 11 * s, 0.5 * s, 4 * s)], shade(bodyColor, -0.08), o);
  }

  // A tapered shirt, or an A-line dress that comes down over the knees.
  const dress = look.outfit === 'dress';
  const hem = dress ? 21 : 14;
  const flare = dress ? 16 : 12.6;
  const shirt = roundPoly([
    [-9.4 * s, -9.5 * s, 5 * s], [9.4 * s, -9.5 * s, 5 * s],
    [flare * s, hem * s, 3 * s], [-flare * s, hem * s, 3 * s],
  ]);
  cloth(g, shirt, bodyColor, o, s);
  if (dress) {
    // a few polka dots and a round white collar
    g.fillStyle(COLORS.white, 0.5);
    for (const [dx, dy] of [[-6, 6], [5, 3], [0.5, 12], [-9.5, 16], [9.5, 15]]) {
      g.fillCircle(dx * s, dy * s, 1.4 * s);
    }
    g.fillStyle(COLORS.white, 0.95);
    g.fillEllipse(-3.2 * s, -7.6 * s, 6.4 * s, 3.8 * s);
    g.fillEllipse(3.2 * s, -7.6 * s, 6.4 * s, 3.8 * s);
  } else {
    // a little V of neck at the collar
    g.fillStyle(look.skin);
    g.fillTriangle(-2.8 * s, -9.6 * s, 2.8 * s, -9.6 * s, 0, -4.6 * s);
  }

  const eyeY = paintHead(g, hair, look, head.x, head.y, head.r, o);
  const eyes = scene.add.graphics().setPosition(0, eyeY);
  paintEyes(eyes, head.r);

  c.add([g, eyes]);
  const worn = dressUp(scene, wearing, head, eyeY);
  if (worn) c.add(worn);
  blink(scene, eyes);
  return c;
}

/**
 * Where `drawHead` puts the head, in unscaled units: its centre, its radius and the eye
 * line — for drawing something over a head that is not a guest's own, like the boutique's
 * dummy.
 */
export const HEAD = { cy: -9.2, r: 11.2, eyeY: -9.2 + 0.06 * 11.2 };

/** Head-and-shoulders only — for guests seen behind a table, in the pool or in bed. */
export function drawHead(
  scene: Phaser.Scene,
  x: number, y: number,
  bodyColor: number,
  scale = 1,
  seed = 0,
  wearing: string | null = null
): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  const s = scale;
  const o = PERSON_INK * s;
  const look = dressedLook(seed, wearing);
  const head = { x: 0, y: HEAD.cy * s, r: HEAD.r * s };
  const hair = hairFor(look, bodyColor, head.x, head.y, head.r);

  part(g, hair.back, look.hair, o);

  const shoulders = roundPoly([
    [-7.6 * s, -2.5 * s, 4 * s], [7.6 * s, -2.5 * s, 4 * s],
    [12.5 * s, 10 * s, 2.5 * s], [-12.5 * s, 10 * s, 2.5 * s],
  ]);
  cloth(g, shoulders, bodyColor, o, s);
  g.fillStyle(look.skin);
  g.fillTriangle(-2.4 * s, -2.6 * s, 2.4 * s, -2.6 * s, 0, 2.6 * s);

  const eyeY = paintHead(g, hair, look, head.x, head.y, head.r, o);
  const eyes = scene.add.graphics().setPosition(0, eyeY);
  paintEyes(eyes, head.r);

  c.add([g, eyes]);
  const worn = dressUp(scene, wearing, head, eyeY);
  if (worn) c.add(worn);
  blink(scene, eyes);
  return c;
}

/**
 * Random slow blinking.
 *
 * Rescheduled per blink rather than run as a repeating tween so a crowd of guests never
 * falls into lockstep, which reads as uncanny rather than alive.
 */
function blink(scene: Phaser.Scene, eyes: Phaser.GameObjects.Graphics): void {
  if (reduceMotion()) return;
  const next = () => {
    if (!eyes.active) return;
    scene.time.delayedCall(Phaser.Math.Between(2200, 6000), () => {
      if (!eyes.active) return;
      scene.tweens.add({
        targets: eyes,
        scaleY: 0.1,
        duration: 70,
        yoyo: true,
        onComplete: next,
      });
    });
  };
  next();
}

/**
 * Potted palm. Used to break up the wide empty walls in the interiors, which were the
 * flattest part of the old build.
 *
 * Pot and all five fronds go into one Graphics, using the canvas-transform commands to
 * place the rotated fronds. Giving each frond its own object and its own sway tween was
 * six draw calls and five tweens per plant, which is not what a background plant should
 * cost; the whole plant leans as one instead.
 */
export function drawPalm(scene: Phaser.Scene, x: number, y: number, scale = 1): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y).setScale(scale);
  const g = scene.add.graphics();

  // fronds first, so the pot's rim overlaps their stems
  [-62, -30, 0, 30, 62].forEach((deg, i) => {
    g.save();
    g.translateCanvas(0, 2);
    g.rotateCanvas(Phaser.Math.DegToRad(deg));
    g.fillStyle(i % 2 === 0 ? COLORS.grassDeep : COLORS.grass);
    g.fillEllipse(0, -30, 19, 58);
    g.lineStyle(LINE.thin, COLORS.outline, 0.6);
    g.strokeEllipse(0, -30, 19, 58);
    g.restore();
  });

  g.fillStyle(COLORS.shadow, 0.14);
  g.fillEllipse(0, 44, 56, 13);

  // pot
  g.fillStyle(COLORS.roofDeep);
  g.fillRoundedRect(-23, 8, 46, 38, { tl: 4, tr: 4, bl: 13, br: 13 });
  g.fillStyle(COLORS.roof);
  g.fillRoundedRect(-23, 8, 20, 38, { tl: 4, tr: 0, bl: 13, br: 0 });
  g.lineStyle(LINE.base, COLORS.outline, 0.85);
  g.strokeRoundedRect(-23, 8, 46, 38, { tl: 4, tr: 4, bl: 13, br: 13 });
  g.fillStyle(COLORS.wallDeep);
  g.fillRoundedRect(-27, 2, 54, 12, 5);
  g.lineStyle(LINE.base, COLORS.outline, 0.85);
  g.strokeRoundedRect(-27, 2, 54, 12, 5);

  c.add(g);

  if (!reduceMotion()) {
    scene.tweens.add({
      targets: c,
      angle: { from: -1.6, to: 1.6 },
      duration: 3600 + (Math.abs(x) % 700),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  return c;
}

/**
 * A floating balloon on a string. Purely decorative; one or two per outdoor scene is
 * enough to make the sky feel occupied.
 */
export function drawBalloon(
  scene: Phaser.Scene,
  x: number, y: number,
  color: number = COLORS.red,
  scale = 1
): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y).setScale(scale);
  const g = scene.add.graphics();

  g.lineStyle(1.6, COLORS.outline, 0.5);
  g.beginPath();
  g.moveTo(0, 20);
  g.lineTo(3, 34);
  g.lineTo(-2, 46);
  g.strokePath();

  g.fillStyle(shade(color, -0.2));
  g.fillEllipse(0, 0, 34, 42);
  g.fillStyle(color);
  g.fillEllipse(-1.5, -1.5, 31, 39);
  g.lineStyle(LINE.base, COLORS.outline, 0.85);
  g.strokeEllipse(0, 0, 34, 42);
  g.fillStyle(COLORS.white, 0.4);
  g.fillEllipse(-8, -10, 9, 12);
  g.fillStyle(shade(color, -0.3));
  g.fillTriangle(-4, 20, 4, 20, 0, 26);

  c.add(g);
  bob(scene, c, 9, 2600 + (x % 400));
  return c;
}
