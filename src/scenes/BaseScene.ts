import Phaser from 'phaser';
import { DEPTH } from '../config';
import { gameState } from '../state/GameState';
import { dur, transition } from '../helpers/Motion';
import { flatten } from '../helpers/Flatten';

/** How often guests get a chance to move on with their day. */
const GUEST_TICK_MS = 500;

/**
 * Every interactive scene builds in four layers:
 *
 *   background  static scenery, built once in buildBackground() and then **baked into a
 *               single texture** — see helpers/Flatten for why
 *   ambient     scenery that moves under its own power: sun, clouds, birds, butterflies,
 *               ceiling fans. Built once in buildAmbient(); never rebuilt, never flattened
 *   dynamic     everything that reflects state, rebuilt by refresh()
 *   effects     star bursts and toasts, added straight to the scene at DEPTH.effects
 *
 * The background/dynamic split replaces `this.scene.restart()`, which the scenes
 * previously used as a redraw. Restarting re-ran create(), which reset the very state the
 * click handler had just written, and destroyed the reward animation mid-tween. Refreshing
 * one container leaves both intact.
 *
 * The background/ambient split is what makes the outlined art style affordable. Phaser
 * re-tessellates every Graphics command list every frame, and an outlined scene has
 * roughly twice the commands of a flat-filled one; baking the static half to a texture cut
 * a title screen from 8 fps to 19 under software WebGL. The rule for scene authors:
 * **if it never changes, put it in `background`; if it moves, put it in `ambient`.**
 * Getting this wrong is silent — something animated in `background` simply freezes,
 * because it has been baked into a picture.
 *
 * Scenes also run the guest clock. A guest who is waiting for a towel while the player is
 * in the garden still has to run out of patience, so time moves in whatever scene happens
 * to be open — and the scene redraws only when the clock actually changed something.
 */
export abstract class BaseScene extends Phaser.Scene {
  protected background!: Phaser.GameObjects.Container;
  protected ambient!: Phaser.GameObjects.Container;
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
    this.ambient = this.add.container(0, 0).setDepth(DEPTH.ambient);
    this.dynamic = this.add.container(0, 0).setDepth(DEPTH.dynamic);

    this.buildBackground();

    // The container is consumed here. It is replaced with an empty one so a late add from
    // a subclass renders in the right place instead of throwing — it just will not get
    // the benefit of the bake.
    flatten(this, this.background, DEPTH.background);
    this.background = this.add.container(0, 0).setDepth(DEPTH.background);

    this.buildAmbient();
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

  /** Static scenery. Runs once per scene start, then gets baked to a texture. */
  protected abstract buildBackground(): void;

  /** Scenery that animates itself. Runs once per scene start. Optional. */
  protected buildAmbient(): void {
    // most scenes have none
  }

  /** Everything derived from GameState. Safe to call on every interaction. */
  protected abstract buildDynamic(): void;

  /** Back button, star counter, title — added above every other layer. */
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

  /** Adds a game object to the static, baked layer. */
  protected bg<T extends Phaser.GameObjects.GameObject>(obj: T): T {
    this.background.add(obj);
    return obj;
  }

  /** Adds a game object to the animated scenery layer. */
  protected amb<T extends Phaser.GameObjects.GameObject>(obj: T): T {
    this.ambient.add(obj);
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
