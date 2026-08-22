import Phaser from 'phaser';
import { COLORS, INK, INK_SOFT, SIZE, text } from '../config';
import { audio } from './Audio';
import { press, reduceMotion } from './Motion';

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

/** A light card surface — used for signs, panels and boards. */
export function panel(
  scene: Phaser.Scene,
  x: number, y: number, w: number, h: number,
  fill: number = COLORS.white,
  radius = 12
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  shadow(g, x - w / 2, y - h / 2, w, h, radius);
  g.fillStyle(fill);
  g.fillRoundedRect(x - w / 2, y - h / 2, w, h, radius);
  return g;
}

/**
 * Small caption attached to an interactive object. Deliberately light: a hairline
 * translucent plate rather than the opaque white box this replaced, so a screen with
 * six of them does not read as six buttons.
 */
export function caption(
  scene: Phaser.Scene,
  x: number, y: number,
  label: string,
  tone: 'idle' | 'done' = 'idle'
): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);

  const t = scene.add.text(0, 0, label, text(SIZE.label, tone === 'done' ? INK_SOFT : INK, 'semibold'))
    .setOrigin(0.5);

  const w = t.width + 18;
  const h = t.height + 8;

  const bg = scene.add.graphics();
  bg.fillStyle(COLORS.white, tone === 'done' ? 0.55 : 0.82);
  bg.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
  bg.lineStyle(1, COLORS.stoneDeep, 0.35);
  bg.strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);

  c.add([bg, t]);
  return c;
}

/** Rounded pill button. One implementation, used by every scene. */
export function button(
  scene: Phaser.Scene,
  x: number, y: number,
  label: string,
  color: number,
  onClick: () => void,
  w = 200, h = 48,
  size = SIZE.heading
): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);
  const r = h / 2;

  const g = scene.add.graphics();
  shadow(g, -w / 2, -h / 2, w, h, r, 3, 0.16);
  g.fillStyle(color);
  g.fillRoundedRect(-w / 2, -h / 2, w, h, r);
  // top sheen, bottom shade — reads as soft volume without an outline
  g.fillStyle(COLORS.white, 0.22);
  g.fillRoundedRect(-w / 2 + 3, -h / 2 + 3, w - 6, h * 0.42, r);

  const t = scene.add.text(0, 0, label, text(size, '#FFFFFF', 'bold')).setOrigin(0.5);

  c.add([g, t]);
  c.setSize(w, h);
  c.setInteractive({ useHandCursor: true });

  if (!reduceMotion()) {
    c.on('pointerover', () => scene.tweens.add({ targets: c, scale: 1.04, duration: 120 }));
    c.on('pointerout', () => scene.tweens.add({ targets: c, scale: 1, duration: 120 }));
  }
  c.on('pointerdown', () => {
    audio.tap();
    press(scene, c, onClick, 0.94);
  });

  return c;
}

/** Makes any container tappable with the same squash feedback as `button`. */
export function tappable(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.Container,
  w: number, h: number,
  onClick: () => void
): void {
  target.setSize(w, h);
  target.setInteractive({ useHandCursor: true });
  const base = target.scale;
  if (!reduceMotion()) {
    target.on('pointerover', () => scene.tweens.add({ targets: target, scale: base * 1.05, duration: 120 }));
    target.on('pointerout', () => scene.tweens.add({ targets: target, scale: base, duration: 120 }));
  }
  target.on('pointerdown', () => {
    audio.tap();
    press(scene, target, onClick, 0.92);
  });
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

export function drawSun(scene: Phaser.Scene, x: number, y: number, radius = 26): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);

  const rays = scene.add.graphics();
  rays.fillStyle(COLORS.sun, 0.35);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    rays.fillCircle(Math.cos(a) * (radius + 13), Math.sin(a) * (radius + 13), radius * 0.2);
  }

  const glow = scene.add.graphics();
  glow.fillStyle(COLORS.sun, 0.22);
  glow.fillCircle(0, 0, radius * 1.35);

  const body = scene.add.graphics();
  body.fillStyle(COLORS.sunDeep);
  body.fillCircle(0, 1.5, radius);
  body.fillStyle(COLORS.sun);
  body.fillCircle(0, 0, radius);

  c.add([rays, glow, body]);

  scene.tweens.add({ targets: rays, angle: 360, duration: 40000, repeat: -1 });
  scene.tweens.add({
    targets: glow, scale: 1.12, duration: 3000,
    yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
  });

  return c;
}

export function drawCloud(scene: Phaser.Scene, x: number, y: number, scale = 1): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();

  g.fillStyle(COLORS.white, 0.5);
  g.fillCircle(2 * scale, 6 * scale, 22 * scale);
  g.fillCircle(-20 * scale, 10 * scale, 15 * scale);
  g.fillCircle(22 * scale, 10 * scale, 17 * scale);

  g.fillStyle(COLORS.white, 0.92);
  g.fillCircle(0, 0, 22 * scale);
  g.fillCircle(-20 * scale, 6 * scale, 15 * scale);
  g.fillCircle(20 * scale, 6 * scale, 17 * scale);
  g.fillCircle(8 * scale, -12 * scale, 15 * scale);

  c.add(g);
  return c;
}

export function drawTree(scene: Phaser.Scene, x: number, y: number, scale = 1): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();

  g.fillStyle(COLORS.shadow, 0.1);
  g.fillEllipse(4 * scale, 22 * scale, 46 * scale, 12 * scale);

  g.fillStyle(COLORS.woodDeep);
  g.fillRoundedRect(-7 * scale, -18 * scale, 14 * scale, 40 * scale, 5 * scale);
  g.fillStyle(COLORS.wood);
  g.fillRoundedRect(-7 * scale, -18 * scale, 8 * scale, 40 * scale, 4 * scale);

  g.fillStyle(COLORS.grassDeep);
  g.fillCircle(3 * scale, -36 * scale, 29 * scale);
  g.fillCircle(-17 * scale, -22 * scale, 21 * scale);
  g.fillCircle(19 * scale, -22 * scale, 21 * scale);

  g.fillStyle(COLORS.grass);
  g.fillCircle(0, -40 * scale, 26 * scale);
  g.fillCircle(-16 * scale, -25 * scale, 18 * scale);
  g.fillCircle(16 * scale, -25 * scale, 18 * scale);

  g.fillStyle(COLORS.grassLight, 0.55);
  g.fillCircle(-8 * scale, -48 * scale, 11 * scale);

  c.add(g);
  return c;
}

export function drawFlower(
  scene: Phaser.Scene,
  x: number, y: number,
  petal: number = COLORS.pink,
  scale = 1
): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();

  g.lineStyle(2.5 * scale, COLORS.grassDeep);
  g.beginPath();
  g.moveTo(0, 20 * scale);
  g.lineTo(0, 2 * scale);
  g.strokePath();

  g.fillStyle(COLORS.grass);
  g.fillEllipse(-6 * scale, 12 * scale, 10 * scale, 5 * scale);

  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    g.fillStyle(petal, 0.95);
    g.fillCircle(Math.cos(a) * 6 * scale, Math.sin(a) * 6 * scale, 5.5 * scale);
  }
  g.fillStyle(COLORS.sun);
  g.fillCircle(0, 0, 3.5 * scale);

  c.add(g);
  return c;
}

/** Guest / staff figure. Rounded, soft-outlined, warm ink instead of black. */
export function drawPerson(
  scene: Phaser.Scene,
  x: number, y: number,
  bodyColor: number,
  scale = 1
): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  const s = scale;

  g.fillStyle(COLORS.shadow, 0.1);
  g.fillEllipse(0, 36 * s, 40 * s, 10 * s);

  // legs
  g.fillStyle(COLORS.ink, 0.55);
  g.fillRoundedRect(-9 * s, 24 * s, 7 * s, 14 * s, 3 * s);
  g.fillRoundedRect(2 * s, 24 * s, 7 * s, 14 * s, 3 * s);

  // arms behind the torso, so the silhouette reads wide
  g.fillStyle(bodyColor);
  g.fillRoundedRect(-24 * s, -4 * s, 9 * s, 26 * s, 4.5 * s);
  g.fillRoundedRect(15 * s, -4 * s, 9 * s, 26 * s, 4.5 * s);
  g.fillStyle(0xF6D9BE);
  g.fillCircle(-19.5 * s, 21 * s, 4.5 * s);
  g.fillCircle(19.5 * s, 21 * s, 4.5 * s);

  // torso
  g.fillStyle(bodyColor);
  g.fillRoundedRect(-17 * s, -8 * s, 34 * s, 34 * s, 11 * s);
  // collar
  g.fillStyle(COLORS.white, 0.55);
  g.fillRoundedRect(-9 * s, -9 * s, 18 * s, 6 * s, 3 * s);

  // neck + head
  g.fillStyle(0xF6D9BE);
  g.fillRoundedRect(-4 * s, -14 * s, 8 * s, 8 * s, 3 * s);
  g.fillCircle(0, -24 * s, 14 * s);
  // hair
  g.fillStyle(COLORS.ink, 0.75);
  g.slice(0, -24 * s, 14.5 * s, Phaser.Math.DegToRad(180), Phaser.Math.DegToRad(360), false);
  g.fillPath();

  // face
  g.fillStyle(COLORS.ink);
  g.fillCircle(-4.5 * s, -26 * s, 1.8 * s);
  g.fillCircle(4.5 * s, -26 * s, 1.8 * s);
  g.lineStyle(1.6 * s, COLORS.ink, 0.8);
  g.beginPath();
  g.arc(0, -21 * s, 5 * s, 0.25, Math.PI - 0.25, false);
  g.strokePath();

  // cheeks
  g.fillStyle(COLORS.pink, 0.4);
  g.fillCircle(-9 * s, -21 * s, 3.2 * s);
  g.fillCircle(9 * s, -21 * s, 3.2 * s);

  c.add(g);
  return c;
}

/** Head-and-shoulders only — for guests seen behind a table or in the pool. */
export function drawHead(
  scene: Phaser.Scene,
  x: number, y: number,
  bodyColor: number,
  scale = 1
): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  const s = scale;

  g.fillStyle(bodyColor);
  g.fillRoundedRect(-11 * s, -2 * s, 22 * s, 12 * s, 5 * s);
  g.fillStyle(0xF6D9BE);
  g.fillCircle(0, -9 * s, 11 * s);
  g.fillStyle(COLORS.ink);
  g.fillCircle(-3.5 * s, -10 * s, 1.5 * s);
  g.fillCircle(3.5 * s, -10 * s, 1.5 * s);
  g.lineStyle(1.4 * s, COLORS.ink, 0.8);
  g.beginPath();
  g.arc(0, -6 * s, 3.6 * s, 0.25, Math.PI - 0.25, false);
  g.strokePath();
  g.fillStyle(COLORS.pink, 0.4);
  g.fillCircle(-6.5 * s, -6 * s, 2.4 * s);
  g.fillCircle(6.5 * s, -6 * s, 2.4 * s);

  c.add(g);
  return c;
}
