import Phaser from 'phaser';

/**
 * Respect the OS "reduce motion" setting. Some children are motion-sensitive, and the
 * game leans on camera fades and squash-and-stretch for almost every interaction.
 *
 * Note this is queried live rather than cached, so toggling the OS setting takes effect
 * without a reload.
 */
export function reduceMotion(): boolean {
  return typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

/** Animation duration, collapsed to zero when the player asked for less motion. */
export function dur(ms: number): number {
  return reduceMotion() ? 0 : ms;
}

/** Scene change, with or without the cross-fade. */
export function transition(scene: Phaser.Scene, key: string, ms = 220): void {
  if (reduceMotion()) {
    scene.scene.start(key);
    return;
  }
  scene.cameras.main.fadeOut(ms, 0, 0, 0);
  scene.cameras.main.once('camerafadeoutcomplete', () => scene.scene.start(key));
}

/** The squash a control does when tapped. The callback always runs. */
export function press(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.Container,
  onClick: () => void,
  scale = 0.93
): void {
  if (reduceMotion()) {
    onClick();
    return;
  }
  scene.tweens.add({
    targets: target,
    scale: target.scale * scale,
    duration: 80,
    yoyo: true,
    onComplete: onClick,
  });
}
