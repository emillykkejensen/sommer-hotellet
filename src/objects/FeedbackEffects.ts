import Phaser from 'phaser';
import { COLORS, DEPTH, SIZE, text } from '../config';

/**
 * These are purely visual. They live above the dynamic layer (DEPTH.effects) so a
 * refresh() never destroys a reward animation that is still playing — which is what
 * used to happen when every tap restarted the scene.
 */

export function showStarBurst(scene: Phaser.Scene, x: number, y: number, count = 5): void {
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 - Math.PI / 2;
    const star = scene.add.star(x, y, 5, 4, 9, COLORS.sun)
      .setDepth(DEPTH.effects)
      .setScale(0);

    scene.tweens.add({
      targets: star,
      x: x + Math.cos(a) * Phaser.Math.Between(26, 46),
      y: y + Math.sin(a) * Phaser.Math.Between(26, 46) - 18,
      scale: { from: 0.4, to: 1.15 },
      angle: Phaser.Math.Between(-140, 140),
      alpha: { from: 1, to: 0 },
      duration: 700,
      delay: i * 45,
      ease: 'Cubic.easeOut',
      onComplete: () => star.destroy(),
    });
  }
}

export function showHearts(scene: Phaser.Scene, x: number, y: number): void {
  for (let i = 0; i < 3; i++) {
    const g = scene.add.graphics().setDepth(DEPTH.effects);
    g.fillStyle(COLORS.pink);
    g.fillCircle(-3.5, -2, 4);
    g.fillCircle(3.5, -2, 4);
    g.fillTriangle(-7, 0, 7, 0, 0, 8);
    g.setPosition(x + Phaser.Math.Between(-16, 16), y);

    scene.tweens.add({
      targets: g,
      y: y - 54,
      x: g.x + Phaser.Math.Between(-12, 12),
      scale: { from: 0.6, to: 1.2 },
      alpha: 0,
      duration: 900,
      delay: i * 130,
      ease: 'Sine.easeOut',
      onComplete: () => g.destroy(),
    });
  }
}

export function showSparkle(scene: Phaser.Scene, x: number, y: number, w = 100, h = 100): void {
  for (let i = 0; i < 9; i++) {
    const s = scene.add.star(
      x + Phaser.Math.Between(-w / 2, w / 2),
      y + Phaser.Math.Between(-h / 2, h / 2),
      4, 1.5, 7, COLORS.white
    ).setDepth(DEPTH.effects).setAlpha(0);

    scene.tweens.add({
      targets: s,
      alpha: { from: 0, to: 0.95 },
      scale: { from: 0.3, to: 1.1 },
      angle: 90,
      duration: 380,
      delay: i * 70,
      yoyo: true,
      onComplete: () => s.destroy(),
    });
  }
}

export function showSplash(scene: Phaser.Scene, x: number, y: number): void {
  const ring = scene.add.ellipse(x, y, 10, 5)
    .setStrokeStyle(2, COLORS.white, 0.9)
    .setDepth(DEPTH.effects);
  scene.tweens.add({
    targets: ring,
    scaleX: 6, scaleY: 6, alpha: 0,
    duration: 550, ease: 'Cubic.easeOut',
    onComplete: () => ring.destroy(),
  });

  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i - 3) * 0.34;
    const drop = scene.add.circle(x, y, Phaser.Math.Between(3, 6), COLORS.waterLight)
      .setDepth(DEPTH.effects);
    scene.tweens.add({
      targets: drop,
      x: x + Math.cos(a) * Phaser.Math.Between(28, 56),
      y: y + Math.sin(a) * Phaser.Math.Between(30, 58),
      alpha: 0,
      scale: 0.4,
      duration: 520,
      ease: 'Quad.easeOut',
      onComplete: () => drop.destroy(),
    });
  }
}

/** A soft tick, drawn rather than an emoji, so it matches the rest of the art. */
export function showCheckmark(scene: Phaser.Scene, x: number, y: number): void {
  const c = scene.add.container(x, y).setDepth(DEPTH.effects).setScale(0);

  const disc = scene.add.graphics();
  disc.fillStyle(COLORS.green);
  disc.fillCircle(0, 0, 17);
  disc.fillStyle(COLORS.white, 0.25);
  disc.fillCircle(-4, -5, 9);

  const tick = scene.add.graphics();
  tick.lineStyle(3.5, COLORS.white, 1);
  tick.beginPath();
  tick.moveTo(-7, 0);
  tick.lineTo(-2, 5.5);
  tick.lineTo(8, -6);
  tick.strokePath();

  c.add([disc, tick]);

  scene.tweens.add({
    targets: c,
    scale: 1,
    duration: 280,
    ease: 'Back.easeOut',
    onComplete: () => {
      scene.tweens.add({
        targets: c,
        alpha: 0,
        y: y - 30,
        delay: 520,
        duration: 380,
        onComplete: () => c.destroy(),
      });
    },
  });
}

/** Short floating message, e.g. a guest speaking. */
export function showToast(
  scene: Phaser.Scene,
  x: number, y: number,
  message: string,
  color = '#5A4E42'
): void {
  const t = scene.add.text(0, 0, message, text(SIZE.body, color, 'bold')).setOrigin(0.5);
  const w = t.width + 24;
  const h = t.height + 14;

  const bg = scene.add.graphics();
  bg.fillStyle(COLORS.shadow, 0.12);
  bg.fillRoundedRect(-w / 2 + 1, -h / 2 + 3, w, h, h / 2);
  bg.fillStyle(COLORS.white, 0.97);
  bg.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);

  const c = scene.add.container(x, y, [bg, t]).setDepth(DEPTH.effects).setScale(0.7);

  scene.tweens.add({ targets: c, scale: 1, duration: 220, ease: 'Back.easeOut' });
  scene.tweens.add({
    targets: c,
    y: y - 26,
    alpha: 0,
    delay: 1300,
    duration: 500,
    onComplete: () => c.destroy(),
  });
}
