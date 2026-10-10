import Phaser from 'phaser';
import { COLORS, DEPTH, LINE } from '../config';
import { Destination, GuestData, gameState } from '../state/GameState';
import { dur, reduceMotion, transition } from '../helpers/Motion';
import { flatten } from '../helpers/Flatten';
import { drawHead, plate, shadow, tappable } from '../helpers/Draw';
import { audio } from '../helpers/Audio';
import { rewardFor } from '../helpers/Reward';
import { award } from '../ui/Chrome';
import { Area } from '../state/Shop';
import {
  CardAction, drawPatienceBar, drawSpeechBubble, drawThought, guestCard, guestLine,
  guestThought, guestVoice, placeName, sayOnce,
} from '../objects/Guests';
import { drawGuestCard } from '../objects/GuestCard';
import { destinationIcon } from '../objects/Icons';
import { showHearts, showStarBurst, showToast } from '../objects/FeedbackEffects';

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

  /** Whose card is open, if anybody's. Survives a refresh; the card is redrawn from it. */
  private cardGuestId: number | null = null;
  private card: Phaser.GameObjects.Container | null = null;
  private followerLayer!: Phaser.GameObjects.Container;

  /** Where each guest on screen was drawn this refresh — for effects, and the card. */
  protected spots = new Map<number, { x: number; y: number }>();

  /** A guest who has just set off behind the player: their chip flies in from here. */
  private chipFrom: { id: number; x: number; y: number } | null = null;

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

    this.followerLayer = this.add.container(0, 0).setDepth(DEPTH.chrome);
    this.cardGuestId = null;
    this.card = null;
    this.chipFrom = null;
    this.takeInFollowers();
    this.refresh();

    // Tapping empty floor closes the card. Tapping anything else leaves it open — a lounger,
    // a dish, another guest — because the card updates itself to match.
    this.input.on('pointerdown', (_p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (this.cardGuestId !== null && over.length === 0) this.closeCard();
    });

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
    this.spots.clear();
    this.dynamic.removeAll(true);
    this.buildDynamic();
    this.renderFollowers();
    this.renderCard(false);
  }

  /* ------------------------------------------------------------- guests --- */

  /**
   * Which followers this scene takes in. The lobby takes guests who are leaving, the pool
   * takes swimmers, and so on; a scene that is nobody's destination returns null.
   */
  protected serves(): Destination | null {
    return null;
  }

  /** Called with the guests just handed over on arrival, before the first draw. */
  protected onArrivals(_arrived: GuestData[]): void {
    // most scenes need do nothing
  }

  /**
   * Hands over the followers who were heading here, and lets the others say so.
   *
   * A guest following you into the wrong place says where they actually wanted to go, out
   * loud — the player is the one doing the leading, so getting it wrong should be a friendly
   * nudge, not a silent dead end.
   */
  private takeInFollowers(): void {
    const here = this.serves();
    if (!here) return;

    const { arrived, refused } = gameState.dropOff(here);
    if (arrived.length > 0) {
      this.onArrivals(arrived);
      audio.sparkle();
      const names = arrived.map(g => g.name);
      const message = names.length === 1 ? `${names[0]} er her nu` : `${names.length} gæster er her nu`;
      this.time.delayedCall(dur(300), () => showToast(this, this.scale.width / 2, 132, message, '#4A7F33'));
    }

    const wrong = gameState.followers().filter(g => !refused.includes(g));
    const complaints: { guest: GuestData; text: string }[] = [
      ...refused.map(guest => ({ guest, text: 'Alle borde er optaget. Jeg venter lidt.' })),
      ...wrong.map(guest => ({
        guest,
        text: `Nej, jeg skulle i ${placeName(guest.heading ?? 'checkout')}!`,
      })),
    ];
    complaints.forEach(({ guest, text }, i) => {
      this.time.delayedCall(dur(450) + i * 900, () => this.chipSays(guest, text));
    });
  }

  /** A follower's line, in a bubble next to their chip, for a couple of seconds. */
  private chipSays(guest: GuestData, line: string): void {
    const index = gameState.followers().findIndex(g => g.id === guest.id);
    if (index === -1) return;
    const slot = this.followerSlot(index);
    const bubble = drawSpeechBubble(this, slot.x + 118, slot.y + 66, line, 'grumpy', 190);
    bubble.setDepth(DEPTH.effects);
    audio.babble(4, guestVoice(guest));
    this.tweens.add({
      targets: bubble,
      alpha: 0,
      delay: 2600,
      duration: 400,
      onComplete: () => bubble.destroy(),
    });
  }

  /** Where the n-th follower's chip sits: in a row under the back button. */
  protected followerSlot(index: number): { x: number; y: number } {
    return { x: 36 + index * 50, y: 96 };
  }

  /**
   * The guests walking with the player, as faces under the back button.
   *
   * Each carries the picture of where they want to go — the same picture the map puts on
   * that place's sign — so following the faces is following the plan.
   */
  private renderFollowers(): void {
    this.followerLayer.removeAll(true);
    gameState.followers().forEach((guest, i) => {
      const slot = this.followerSlot(i);
      const c = this.add.container(slot.x, slot.y).setData('guestId', guest.id);

      const g = this.add.graphics();
      shadow(g, -21, -21, 42, 42, 21, 3, 0.2);
      plate(g, -21, -21, 42, 42, 21, COLORS.white, 1, LINE.base);
      c.add(g);
      c.add(drawHead(this, 0, 9, guest.color, 0.95, guest.id, guest.wearing));

      if (guest.heading) {
        const badge = this.add.graphics().setPosition(15, 15);
        badge.fillStyle(COLORS.cream);
        badge.fillCircle(0, 0, 12);
        badge.lineStyle(LINE.hair, COLORS.outline, 0.9);
        badge.strokeCircle(0, 0, 12);
        destinationIcon(guest.heading)(badge, 0.7);
        c.add(badge);
      }

      this.followerLayer.add(c);
      this.spots.set(guest.id, slot);
      tappable(this, c, 46, 46, () => this.openCard(guest.id), 'tap');

      if (this.chipFrom?.id === guest.id && !reduceMotion()) {
        const to = { x: c.x, y: c.y };
        c.setPosition(this.chipFrom.x, this.chipFrom.y).setScale(1.6);
        this.tweens.add({ targets: c, x: to.x, y: to.y, scale: 1, duration: 520, ease: 'Cubic.easeInOut' });
      }
    });
    this.chipFrom = null;
  }

  /**
   * Puts a drawn guest on stage: tap for their card, a thought bubble while they want
   * something, and a patience bar while the clock is running on them.
   */
  protected addGuest(
    guest: GuestData,
    figure: Phaser.GameObjects.Container,
    opts: { w: number; h: number; thoughtY: number; barY?: number; thoughtScale?: number }
  ): void {
    figure.setData('guestId', guest.id);
    this.dyn(figure);
    this.spots.set(guest.id, { x: figure.x, y: figure.y });

    const thought = guestThought(guest);
    if (thought) {
      sayOnce(guest, guestLine(guest));
      const bubble = drawThought(this, figure.x, figure.y + opts.thoughtY, thought, opts.thoughtScale ?? 1);
      this.dyn(bubble);
      // The bubble is the biggest thing about a guest who wants something, so it opens the
      // card too — a child taps what they are looking at.
      bubble.setData('guestId', guest.id);
      tappable(this, bubble, bubble.getData('w'), bubble.getData('h'), () => this.openCard(guest.id), 'tap');
    }

    const phase = gameState.guestPhase(guest);
    if (opts.barY !== undefined && (phase === 'waiting' || phase === 'impatient')) {
      const bar = drawPatienceBar(this, figure.x, figure.y + opts.barY, guest);
      this.dyn(bar.object);
      this.everyFrame(bar.update);
    }

    tappable(this, figure, opts.w, opts.h, () => this.openCard(guest.id), 'tap');
  }

  protected openCard(guestId: number): void {
    const guest = gameState.guestById(guestId);
    if (!guest) return;
    const fresh = this.cardGuestId !== guestId;
    this.cardGuestId = guestId;
    if (fresh) {
      // The guest answers when spoken to: roughly a syllable for every word on the card.
      const words = guestLine(guest).text.split(/\s+/).length;
      audio.babble(Math.max(2, Math.min(7, Math.round(words * 0.7))), guestVoice(guest));
    }
    this.renderCard(fresh);
  }

  protected closeCard(): void {
    this.cardGuestId = null;
    this.card?.destroy();
    this.card = null;
  }

  private renderCard(animate: boolean): void {
    this.card?.destroy();
    this.card = null;
    if (this.cardGuestId === null) return;

    const guest = gameState.guestById(this.cardGuestId);
    // gone home, led away, or simply not drawn in this scene any more
    if (!guest || !this.spots.has(guest.id)) {
      this.cardGuestId = null;
      return;
    }
    this.card = drawGuestCard(
      this, guest, guestCard(guest),
      action => this.runAction(guest.id, action),
      () => this.closeCard(),
      animate
    );
  }

  /** What the scene's guests are rewarded under in Lær mode, by where they were. */
  private areaFor(at: GuestData['at']): Area {
    switch (at) {
      case 'pool': return 'pool';
      case 'room': return 'rooms';
      case 'restaurant': return 'kitchen';
      case 'boutique': return 'boutique';
      default: return 'lobby';
    }
  }

  /** A plate flying to a table, a key changing hands. Scenes override for their own. */
  protected animateDelivery(_guest: GuestData, _action: CardAction, _spot: { x: number; y: number }): void {
    // nothing by default
  }

  /**
   * Does what a card button says.
   *
   * Every star in the hotel is paid from here, and only for something done *for a guest*:
   * a key, a dish on the table, an ice cream in their hand, a swim or a night's sleep they
   * have had, a bill paid. Making the bed, cooking the soup and laying the towel are how
   * you get there — they pay when somebody actually uses them.
   */
  private runAction(guestId: number, action: CardAction): void {
    const guest = gameState.guestById(guestId);
    if (!guest) return;
    const { width, height } = this.scale;
    const spot = this.spots.get(guestId) ?? { x: width / 2, y: height * 0.45 };
    const toastY = Math.max(130, spot.y - 90);
    const lateToast = () =>
      showToast(this, spot.x, toastY, 'De ventede for længe — ingen stjerne', '#B9584A');
    const done = () => this.refresh();

    switch (action.kind) {
      case 'checkin': {
        const result = gameState.checkInGuest(guest.id);
        if (!result) return;
        audio.pop();
        showToast(this, spot.x, toastY, `Værelse ${result.room + 1}`, '#4A7F33');
        this.animateDelivery(guest, action, spot);
        if (result.late) {
          this.time.delayedCall(dur(250), () => lateToast());
          done();
          return;
        }
        showStarBurst(this, spot.x, spot.y - 30);
        showHearts(this, spot.x, spot.y - 46);
        rewardFor(this, 'lobby', { from: spot, after: done });
        return;
      }

      case 'lead': {
        const result = gameState.leadGuest(guest.id);
        if (!result) return;
        audio.pop();
        this.closeCard();
        this.chipFrom = { id: guest.id, x: spot.x, y: spot.y };

        const stayed = result.from === 'pool' || result.from === 'room';
        if (stayed && result.enjoyed) {
          if (result.late) {
            lateToast();
            done();
            return;
          }
          // The stop is paid for now, when it is over: a night slept, a swim had.
          showHearts(this, spot.x, spot.y - 40);
          showToast(this, spot.x, toastY,
            result.from === 'room' ? 'Tak for en dejlig nat!' : 'Tak for badet!', '#4A7F33');
          rewardFor(this, this.areaFor(result.from), { base: 2, from: spot, after: done });
          return;
        }
        done();
        return;
      }

      case 'lounger': {
        const result = gameState.giveLounger(guest.id);
        if (!result) return;
        audio.pop();
        showHearts(this, spot.x, spot.y - 40);
        this.animateDelivery(guest, action, spot);
        done();
        return;
      }

      case 'bed': {
        const result = gameState.putToBed(guest.id);
        if (!result) return;
        audio.sparkle();
        this.animateDelivery(guest, action, spot);
        done();
        return;
      }

      case 'serve': {
        const result = gameState.serveTo(guest.id, action.arg);
        if (!result) return;
        audio.serve();
        this.animateDelivery(guest, action, spot);
        this.time.delayedCall(dur(360), () => {
          if (result.late) {
            lateToast();
            done();
          } else if (result.complete) {
            showStarBurst(this, spot.x, spot.y - 20, 6);
            showHearts(this, spot.x, spot.y - 40);
            showToast(this, spot.x, toastY, 'Tak for mad!', '#4A7F33');
            rewardFor(this, 'kitchen', { base: 2, from: spot, after: done });
          } else {
            showStarBurst(this, spot.x, spot.y - 20, 4);
            award(this, 1, spot.x, spot.y);
            done();
          }
        });
        return;
      }

      case 'extra': {
        if (!action.arg) return;
        const shopping = guest.at === 'boutique';
        const result = gameState.giveExtra(guest.id, action.arg);
        if (!result) return;
        audio.serve();
        this.animateDelivery(guest, action, spot);
        if (result.late) {
          lateToast();
        } else if (shopping && result.settled) {
          // What they came into the shop for, like a whole meal at a table: it pays like one,
          // and in Lær mode it asks.
          showStarBurst(this, spot.x, spot.y - 20, 6);
          showHearts(this, spot.x, spot.y - 40);
          showToast(this, spot.x, toastY, 'Tak, den er flot!', '#4A7F33');
          rewardFor(this, 'boutique', { base: 2, from: spot, after: done });
          return;
        } else {
          showStarBurst(this, spot.x, spot.y - 20, 4);
          showHearts(this, spot.x, spot.y - 40);
          award(this, 1, spot.x, spot.y);
        }
        done();
        return;
      }

      case 'checkout': {
        const result = gameState.checkOutGuest(guest.id);
        if (!result) return;
        audio.sparkle();
        this.closeCard();
        if (result.late) {
          lateToast();
        } else {
          showStarBurst(this, spot.x, spot.y - 30);
          showHearts(this, spot.x, spot.y - 46);
          showToast(this, spot.x, toastY, `${guest.name} siger tak for besøget`, '#4A7F33');
          // Checking out is not a task: the stay has asked its questions already.
          award(this, 2, spot.x, spot.y);
        }
        done();
        return;
      }
    }
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
