import Phaser from 'phaser';
import { DEPTH } from '../config';
import { gameState } from '../state/GameState';
import { dur, transition } from '../helpers/Motion';

/** How often guests get a chance to move on with their day. */
const GUEST_TICK_MS = 500;

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
 *
 * Scenes also run the guest clock. A guest who is waiting for a towel while the player is
 * in the garden still has to run out of patience, so time moves in whatever scene happens
 * to be open — and the scene redraws only when the clock actually changed something.
 */
export abstract class BaseScene extends Phaser.Scene {
  protected background!: Phaser.GameObjects.Container;
  protected dynamic!: Phaser.GameObjects.Container;

  /**
   * Per-frame updates that must survive a refresh, e.g. a patience bar draining.
   *
   * Redrawing the dynamic layer at frame rate would restart every ambient tween in the
   * scene, so anything that moves continuously registers an updater instead.
   */
  private updaters: (() => void)[] = [];

  create(): void {
    this.cameras.main.fadeIn(dur(260));

    this.background = this.add.container(0, 0).setDepth(DEPTH.background);
    this.dynamic = this.add.container(0, 0).setDepth(DEPTH.dynamic);

    this.buildBackground();
    this.buildChrome();
    this.refresh();

    this.time.addEvent({
      delay: GUEST_TICK_MS,
      loop: true,
      callback: () => {
        if (gameState.tickGuests()) this.refresh();
      },
    });
  }

  update(): void {
    for (const tick of this.updaters) tick();
  }

  /** Static scenery. Runs once per scene start. */
  protected abstract buildBackground(): void;

  /** Everything derived from GameState. Safe to call on every interaction. */
  protected abstract buildDynamic(): void;

  /** Back button, star counter, title — added above both layers. */
  protected abstract buildChrome(): void;

  protected refresh(): void {
    this.updaters.length = 0;
    this.dynamic.removeAll(true);
    this.buildDynamic();
  }

  /** Adds a game object to the rebuildable layer. */
  protected dyn<T extends Phaser.GameObjects.GameObject>(obj: T): T {
    this.dynamic.add(obj);
    return obj;
  }

  /** Registers something that has to be updated every frame until the next refresh. */
  protected everyFrame(tick: () => void): void {
    this.updaters.push(tick);
  }

  protected goTo(key: string): void {
    transition(this, key);
  }
}
