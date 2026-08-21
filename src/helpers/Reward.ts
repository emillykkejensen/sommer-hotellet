import Phaser from 'phaser';
import { gameState } from '../state/GameState';
import { Area } from '../state/Shop';
import { nextTask } from '../tasks/picker';
import { runTask } from '../scenes/TaskOverlayScene';
import { award } from '../ui/Chrome';

/**
 * The single reward path for every action in the game.
 *
 * In free play the action just pays a star. In "Lær" mode the action still completes — the
 * bed still gets made, the towel still goes down — and then a task appears, phrased in the
 * world, and pays the stars. Chores are free, tasks pay.
 *
 * `after` runs once the reward has settled, so scenes can refresh at the right moment.
 */
export function rewardFor(
  scene: Phaser.Scene,
  area: Area,
  options: { base?: number; after?: () => void } = {}
): void {
  const base = options.base ?? 1;
  const after = options.after;

  if (!gameState.isLearning) {
    award(scene, base);
    after?.();
    return;
  }

  const task = nextTask(area);
  if (!task) {
    award(scene, base);
    after?.();
    return;
  }

  runTask(scene, task, ({ stars }) => {
    award(scene, stars);
    after?.();
  });
}
