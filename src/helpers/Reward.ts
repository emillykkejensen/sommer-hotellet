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
 *
 * Tasks are raised by a *finished job* — a dish cooked, a room made up, a guest checked in
 * — never by a single tap. Asking a question for every carrot that went in the pot turned
 * cooking one bowl of soup into three sums, which is how a game becomes homework.
 */
export function rewardFor(
  scene: Phaser.Scene,
  area: Area,
  options: { base?: number; after?: () => void; from?: { x: number; y: number } } = {}
): void {
  const base = options.base ?? 1;
  const after = options.after;
  // Where the earned star flies from. In free play that is the thing that was just
  // finished; a task pays from the middle of the screen, because by then the task card is
  // what the child is looking at, not the bed.
  const from = options.from;

  if (!gameState.isLearning) {
    award(scene, base, from?.x, from?.y);
    after?.();
    return;
  }

  const task = nextTask(area);
  if (!task) {
    award(scene, base, from?.x, from?.y);
    after?.();
    return;
  }

  runTask(scene, task, ({ stars }) => {
    // A task the child ran out of tries on pays nothing, and `award(0)` would still play
    // the chime and bounce the counter.
    if (stars > 0) award(scene, stars, scene.scale.width / 2, scene.scale.height / 2);
    after?.();
  });
}
