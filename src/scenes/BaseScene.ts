import Phaser from 'phaser';
import { DEPTH } from '../config';
import { dur, transition } from '../helpers/Motion';

/**
 * Every interactive scene builds in three layers:
 *
 *   background  drawn once in buildBackground(); never touched again
 *   dynamic     everything that reflects state, rebuilt by refresh()
 *   effects     star bursts and toasts, added straight to the scene at DEPTH.effects
 *
 * This replaces `this.scene.restart()`, which the scenes previously used as a redraw.
 * Restarting re-ran create(), which reset the very state the click handler had just
 * written, and destroyed the reward animation mid-tween. Refreshing one container
 * leaves both intact.
 */
export abstract class BaseScene extends Phaser.Scene {
  protected background!: Phaser.GameObjects.Container;
  protected dynamic!: Phaser.GameObjects.Container;

  create(): void {
    this.cameras.main.fadeIn(dur(260));

    this.background = this.add.container(0, 0).setDepth(DEPTH.background);
    this.dynamic = this.add.container(0, 0).setDepth(DEPTH.dynamic);

    this.buildBackground();
    this.buildChrome();
    this.refresh();
  }

  /** Static scenery. Runs once per scene start. */
  protected abstract buildBackground(): void;

  /** Everything derived from GameState. Safe to call on every interaction. */
  protected abstract buildDynamic(): void;

  /** Back button, star counter, title — added above both layers. */
  protected abstract buildChrome(): void;

  protected refresh(): void {
    this.dynamic.removeAll(true);
    this.buildDynamic();
  }

  /** Adds a game object to the rebuildable layer. */
  protected dyn<T extends Phaser.GameObjects.GameObject>(obj: T): T {
    this.dynamic.add(obj);
    return obj;
  }

  protected goTo(key: string): void {
    transition(this, key);
  }
}
