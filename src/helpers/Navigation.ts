import type Phaser from 'phaser';
import { transition } from './Motion';

/**
 * Where "back" goes from each scene.
 *
 * The on-screen back arrow already knows its target, so rather than keeping a second copy
 * of the map, `addBackButton` records it here and Android's hardware back button asks the
 * same question. One source of truth means the two buttons can never disagree.
 */
const targets = new WeakMap<Phaser.Scene, string>();

export function setBackTarget(scene: Phaser.Scene, target: string): void {
  targets.set(scene, target);
}

export function backTargetOf(scene: Phaser.Scene): string | null {
  return targets.get(scene) ?? null;
}

export type BackResult = 'moved' | 'busy' | 'exit';

/**
 * What the hardware back button should do right now.
 *
 * - `busy`: a task is open. There is no cancel on screen either — a task is finished by
 *   answering it, and the chore that raised it has already been done, so letting back
 *   dismiss it would quietly eat the stars it owes.
 * - `moved`: the active scene has somewhere to go back to.
 * - `exit`: we are on the title screen, so back means leave the app.
 */
export function goBack(game: Phaser.Game): BackResult {
  const active = game.scene.getScenes(true);

  if (active.some(scene => scene.scene.key === 'TaskOverlayScene')) return 'busy';

  for (const scene of active) {
    const target = backTargetOf(scene);
    if (target) {
      transition(scene, target, 180);
      return 'moved';
    }
  }
  return 'exit';
}
