import Phaser from 'phaser';
import { COLORS, DEPTH, INK, SIZE, text } from '../config';
import { GuestData, Place, gameState } from '../state/GameState';
import { recipeColor } from '../state/Menu';
import { audio } from '../helpers/Audio';
import { shadow } from '../helpers/Draw';
import { reduceMotion } from '../helpers/Motion';

/**
 * Everything to do with drawing a guest and hearing them talk.
 *
 * Guests turn up in four different scenes, all of which need the same speech bubble, the
 * same patience bar and the same rules about when a line is spoken. Keeping that here is
 * what stops the lobby and the restaurant drifting into two different-looking hotels.
 */

export type Tone = 'idle' | 'grumpy' | 'happy';

/** Danish for where a guest is off to next. */
export function placeName(place: Place | 'checkout'): string {
  switch (place) {
    case 'pool': return 'poolen';
    case 'restaurant': return 'restauranten';
    case 'room': return 'værelset';
    case 'checkout': return 'receptionen';
  }
}

/**
 * "suppe, salat og is" — a list the way a person would say it.
 *
 * Menu items are capitalised on the recipe cards, which is right there and wrong in a
 * sentence: "Suppe og Is, tak!" reads like two brand names. Lower case throughout, and the
 * caller says whether the list starts a sentence.
 */
export function listDishes(dishes: string[], startsSentence = false): string {
  if (dishes.length === 0) return '';
  const words = dishes.map(d => d.toLowerCase());
  const joined = words.length === 1
    ? words[0]
    : `${words.slice(0, -1).join(', ')} og ${words[words.length - 1]}`;
  return startsSentence ? joined.charAt(0).toUpperCase() + joined.slice(1) : joined;
}

/**
 * The pitch of one guest's gibberish.
 *
 * Derived from the guest id, so Fru Hansen sounds like Fru Hansen every time she turns up
 * and never like Hr. Jensen.
 */
export function guestVoice(guest: GuestData): number {
  return 0.78 + ((guest.id * 7) % 9) * 0.07;
}

export interface GuestLine {
  text: string;
  tone: Tone;
}

/**
 * What a guest is saying right now.
 *
 * A happy guest names where they are going next, which is the only way the player can plan
 * — otherwise finding the guest who needs something means walking the whole hotel.
 */
export function guestLine(guest: GuestData, now = Date.now()): GuestLine {
  const phase = gameState.guestPhase(guest, now);
  const next = gameState.nextPlaceOf(guest);
  const heading = next ? ` Så skal jeg i ${placeName(next)}.` : '';

  if (!guest.checkedIn) {
    return phase === 'impatient'
      ? { text: 'Hallo? Er der nogen i receptionen?', tone: 'grumpy' }
      : { text: `Har I et værelse?${heading}`, tone: 'idle' };
  }

  if (guest.at === 'checkout') {
    return phase === 'impatient'
      ? { text: 'Vi vil gerne betale og komme hjem!', tone: 'grumpy' }
      : { text: 'Vi skal hjem nu — tak for besøget!', tone: 'idle' };
  }

  switch (guest.at) {
    case 'pool':
      if (phase === 'happy') return { text: `Åh, hvor er vandet dejligt!${heading}`, tone: 'happy' };
      return phase === 'impatient'
        ? { text: 'Er der slet ingen solstole med håndklæde?', tone: 'grumpy' }
        : { text: 'Jeg vil bade! Er der en solstol klar?', tone: 'idle' };

    case 'restaurant': {
      if (phase === 'happy') return { text: `Mmm, tak for mad!${heading}`, tone: 'happy' };
      const left = gameState.outstandingOrder(guest);
      return phase === 'impatient'
        ? { text: `Kommer der snart ${listDishes(left)}?`, tone: 'grumpy' }
        : { text: `${listDishes(left, true)}, tak!`, tone: 'idle' };
    }

    case 'room':
      if (phase === 'happy') return { text: `Zzz... godnat.${heading}`, tone: 'happy' };
      return phase === 'impatient'
        ? { text: 'Her er rod! Jeg kan ikke sove.', tone: 'grumpy' }
        : { text: 'Jeg er træt. Er værelset gjort klar?', tone: 'idle' };

    default:
      return { text: '...', tone: 'idle' };
  }
}

const TONE_COLOR: Record<Tone, number> = {
  idle: COLORS.white,
  grumpy: 0xFBE2DC,
  happy: 0xE6F4DE,
};

/**
 * A speech bubble with a tail, pointing down at whoever said it.
 *
 * Drawn rather than toasted: a guest's line has to stay on screen for as long as they are
 * still asking for the thing, or the player has to stand and wait for it to come round
 * again.
 */
export function drawSpeechBubble(
  scene: Phaser.Scene,
  x: number, y: number,
  line: string,
  tone: Tone = 'idle',
  maxWidth = 190
): Phaser.GameObjects.Container {
  const t = scene.add.text(0, 0, line, {
    ...text(SIZE.label, INK, 'semibold'),
    wordWrap: { width: maxWidth },
    align: 'center',
  }).setOrigin(0.5);

  const w = Math.max(76, t.width + 26);
  const h = t.height + 18;

  const g = scene.add.graphics();
  shadow(g, -w / 2, -h / 2, w, h, 14, 3, 0.16);
  g.fillStyle(TONE_COLOR[tone], 0.97);
  g.fillRoundedRect(-w / 2, -h / 2, w, h, 14);
  g.lineStyle(2, tone === 'grumpy' ? COLORS.red : COLORS.stoneDeep, tone === 'grumpy' ? 0.5 : 0.32);
  g.strokeRoundedRect(-w / 2, -h / 2, w, h, 14);
  // tail
  g.fillStyle(TONE_COLOR[tone], 0.97);
  g.fillTriangle(-9, h / 2 - 1, 9, h / 2 - 1, 0, h / 2 + 12);

  const c = scene.add.container(x, y - h / 2, [g, t]);

  // A grumpy line shakes a little, so it reads as a complaint without a red cross.
  if (tone === 'grumpy' && !reduceMotion()) {
    scene.tweens.add({
      targets: c,
      angle: { from: -2.5, to: 2.5 },
      duration: 220,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  return c;
}

/**
 * Says a line out loud, but only once.
 *
 * `refresh()` redraws every guest whenever anything at all changes, and babbling on each
 * redraw would turn the lobby into a parrot house. The key identifies the *situation*, not
 * the redraw, so the sound plays when the situation is new and never again.
 */
const spoken = new Set<string>();

/**
 * When the next line may start.
 *
 * Walking into the lobby with three guests in it used to play three babbles on the same
 * frame, which came out as one noise. Lines queue up instead and take turns.
 */
let freeAt = 0;
const TURN_MS = 900;

function nextTurn(now: number): number {
  const at = Math.max(now, freeAt);
  freeAt = at + TURN_MS;
  return (at - now) / 1000;
}

export function bubbleKey(guest: GuestData, now = Date.now()): string {
  return `${guest.id}:${guest.at}:${guest.step}:${gameState.guestPhase(guest, now)}`;
}

export function sayOnce(guest: GuestData, line: GuestLine, now = Date.now()): void {
  const key = bubbleKey(guest, now);
  if (spoken.has(key)) return;
  // A long session visits a lot of situations; the set is only there to stop repeats.
  if (spoken.size > 400) spoken.clear();
  spoken.add(key);

  const delay = nextTurn(now);
  // Roughly one syllable per two words, so a long order sounds longer than "Godnat".
  const words = line.text.split(/\s+/).length;
  if (line.tone === 'grumpy') audio.grumble(guestVoice(guest), delay);
  else audio.babble(Math.max(2, Math.min(7, Math.round(words * 0.8))), guestVoice(guest), delay);
}

/** Forgets what has been said, so guest 0 speaks again after a reset. */
export function forgetSpeech(): void {
  spoken.clear();
  freeAt = 0;
}

/**
 * The patience bar under a waiting guest.
 *
 * Returns its own updater rather than being redrawn by `refresh()`: the bar has to move
 * every frame, and rebuilding the whole dynamic layer at that rate would restart every
 * ambient tween in the scene.
 */
export function drawPatienceBar(
  scene: Phaser.Scene,
  x: number, y: number,
  guest: GuestData,
  w = 62
): { object: Phaser.GameObjects.Graphics; update: () => void } {
  const g = scene.add.graphics().setPosition(x, y);
  const h = 8;

  const update = () => {
    if (!g.active) return;
    const left = gameState.patienceLeft(guest);
    const phase = gameState.guestPhase(guest);
    g.clear();

    if (phase === 'happy') return;

    g.fillStyle(COLORS.white, 0.85);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    g.lineStyle(1.5, COLORS.stoneDeep, 0.4);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);

    const fill = phase === 'impatient' ? 0 : left;
    if (fill > 0) {
      const tint = fill > 0.5 ? COLORS.green : fill > 0.22 ? COLORS.sun : COLORS.red;
      g.fillStyle(tint);
      g.fillRoundedRect(-w / 2 + 2, -h / 2 + 2, (w - 4) * fill, h - 4, (h - 4) / 2);
    } else {
      // out of patience: an empty red bar, so it is obvious the star has gone
      g.fillStyle(COLORS.red, 0.55);
      g.fillRoundedRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4, (h - 4) / 2);
    }
  };

  update();
  return { object: g, update };
}

/** A plated dish — used on the pass, in an order and on a table. */
export function drawDish(
  scene: Phaser.Scene,
  dish: string,
  scale = 1
): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0);
  const g = scene.add.graphics();
  const s = scale;

  g.fillStyle(COLORS.shadow, 0.12);
  g.fillEllipse(0, 8 * s, 34 * s, 8 * s);
  g.fillStyle(COLORS.white);
  g.fillEllipse(0, 3 * s, 34 * s, 13 * s);
  g.fillStyle(COLORS.stone, 0.4);
  g.fillEllipse(0, 3 * s, 24 * s, 9 * s);
  g.fillStyle(recipeColor(dish));
  g.fillEllipse(0, 0, 21 * s, 12 * s);
  g.fillStyle(COLORS.white, 0.35);
  g.fillEllipse(-5 * s, -2 * s, 8 * s, 4 * s);

  c.add(g);
  return c;
}

/** Small coloured pip standing for one dish, for a compact order list. */
export function drawOrderPips(
  scene: Phaser.Scene,
  dishes: string[],
  spacing = 20
): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0);
  dishes.forEach((dish, i) => {
    const pip = scene.add.circle((i - (dishes.length - 1) / 2) * spacing, 0, 8, recipeColor(dish));
    pip.setStrokeStyle(2, COLORS.white, 0.9);
    c.add(pip);
  });
  return c;
}

/** Little "zzz" over a sleeping guest. */
export function drawSleepZs(scene: Phaser.Scene, x: number, y: number): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y).setDepth(DEPTH.dynamic);
  [0, 1, 2].forEach(i => {
    const z = scene.add.text(i * 11, -i * 13, 'z', text(SIZE.label + i * 3, '#8A7E70', 'bold'))
      .setOrigin(0.5)
      .setAlpha(0.85);
    c.add(z);
    if (!reduceMotion()) {
      scene.tweens.add({
        targets: z,
        y: z.y - 8,
        alpha: 0.3,
        duration: 1400,
        delay: i * 380,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  });
  return c;
}
