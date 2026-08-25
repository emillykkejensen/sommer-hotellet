import Phaser from 'phaser';
import { COLORS, DEPTH, INK, SIZE, text } from '../config';
import { gameState } from '../state/GameState';
import { shadow } from '../helpers/Draw';
import { audio } from '../helpers/Audio';
import { press, reduceMotion, transition } from '../helpers/Motion';
import { setBackTarget } from '../helpers/Navigation';

/** Back arrow, top left. */
export function addBackButton(
  scene: Phaser.Scene,
  target = 'HotelMapScene',
  caption = 'Tilbage'
): Phaser.GameObjects.Container {
  // Android's hardware back button reads this, so the two buttons cannot drift apart.
  setBackTarget(scene, target);

  const label = scene.add.text(0, 0, caption, text(SIZE.label, INK, 'bold')).setOrigin(0, 0.5);

  // Sized from the measured label, so the word never spills past the pill or collides
  // with the arrow the way a hardcoded width did.
  const arrowW = 24;
  const padding = 14;
  const w = padding + arrowW + label.width + padding;
  const h = 42;

  const c = scene.add.container(14 + w / 2, 34).setDepth(DEPTH.chrome).setScrollFactor(0);

  const g = scene.add.graphics();
  shadow(g, -w / 2, -h / 2, w, h, h / 2, 2, 0.14);
  g.fillStyle(COLORS.white, 0.94);
  g.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);

  const ax = -w / 2 + padding;
  const arrow = scene.add.graphics();
  arrow.lineStyle(3, COLORS.ink, 0.85);
  arrow.beginPath();
  arrow.moveTo(ax + 7, -5);
  arrow.lineTo(ax, 0);
  arrow.lineTo(ax + 7, 5);
  arrow.strokePath();
  arrow.beginPath();
  arrow.moveTo(ax, 0);
  arrow.lineTo(ax + arrowW - 4, 0);
  arrow.strokePath();

  label.setPosition(ax + arrowW, 0);

  c.add([g, arrow, label]);
  c.setSize(w, h);
  c.setInteractive({ useHandCursor: true });
  if (!reduceMotion()) {
    c.on('pointerover', () => scene.tweens.add({ targets: c, scale: 1.06, duration: 120 }));
    c.on('pointerout', () => scene.tweens.add({ targets: c, scale: 1, duration: 120 }));
  }
  c.on('pointerdown', () => press(scene, c, () => transition(scene, target, 180), 0.92));

  return c;
}

/**
 * Star counter, top right.
 *
 * The listener is removed on shutdown. Phaser does not clear user listeners off
 * scene.events itself, so the previous version left a closure from every past scene
 * generation writing to a destroyed Text object — which crashed the WebGL renderer.
 */
export function addStarCounter(scene: Phaser.Scene): Phaser.GameObjects.Container {
  const x = scene.scale.width - 74;
  const c = scene.add.container(x, 34).setDepth(DEPTH.chrome).setScrollFactor(0);

  const g = scene.add.graphics();
  shadow(g, -56, -22, 112, 44, 22, 2, 0.14);
  g.fillStyle(COLORS.white, 0.94);
  g.fillRoundedRect(-56, -22, 112, 44, 22);

  const star = scene.add.star(-32, 0, 5, 7, 15, COLORS.sun);
  star.setStrokeStyle(1.5, COLORS.sunDeep);

  const count = scene.add.text(11, 0, `${gameState.stars}`, text(SIZE.title - 4, INK, 'bold'))
    .setOrigin(0.5);

  c.add([g, star, count]);

  const onChange = (value: number) => {
    count.setText(`${value}`);
    scene.tweens.add({ targets: c, scale: 1.16, duration: 140, yoyo: true, ease: 'Sine.easeOut' });
    scene.tweens.add({ targets: star, angle: star.angle + 180, duration: 420, ease: 'Cubic.easeOut' });
  };

  scene.events.on('starsChanged', onChange);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off('starsChanged', onChange));

  return c;
}

/** Grants stars, plays the counter animation, and keeps the two concerns separate. */
export function award(scene: Phaser.Scene, count = 1): void {
  gameState.addStars(count);
  audio.star(count);
  scene.events.emit('starsChanged', gameState.stars);
}

/**
 * Centred scene title.
 *
 * Outdoor scenes get white with a tinted outline so it reads against sky; interiors get
 * plain ink, because white-on-cream with a grey outline just looks muddy.
 */
export function addSceneTitle(
  scene: Phaser.Scene,
  label: string,
  outline?: string,
  y = 34
): Phaser.GameObjects.Text {
  const style: Phaser.Types.GameObjects.Text.TextStyle = outline
    ? { ...text(SIZE.title, '#FFFFFF', 'bold'), stroke: outline, strokeThickness: 5 }
    : text(SIZE.title, INK, 'bold');

  return scene.add.text(scene.scale.width / 2, y, label, style)
    .setOrigin(0.5)
    .setDepth(DEPTH.chrome);
}
