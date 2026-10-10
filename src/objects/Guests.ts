import Phaser from 'phaser';
import { COLORS, DEPTH, INK, LINE, SIZE, text } from '../config';
import { Destination, GuestData, gameState } from '../state/GameState';
import { extraPhrase, garmentPhrase, giveLabel, isIce } from '../state/Extras';
import { recipeColor } from '../state/Menu';
import { audio } from '../helpers/Audio';
import { plate, shadow } from '../helpers/Draw';
import {
  destinationIcon, paintArrow, paintBed, paintExtra, paintKey, paintLounger, paintPlate,
  paintSuitcase,
} from './Icons';
import { reduceMotion } from '../helpers/Motion';

/**
 * Everything to do with drawing a guest and hearing them talk.
 *
 * Guests turn up in four different scenes, all of which need the same speech bubble, the
 * same patience bar and the same rules about when a line is spoken. Keeping that here is
 * what stops the lobby and the restaurant drifting into two different-looking hotels.
 */

export type Tone = 'idle' | 'grumpy' | 'happy';

/** Danish for a place, for a hint: "Gå til poolen". */
export function placeName(place: Destination): string {
  switch (place) {
    case 'pool': return 'poolen';
    case 'restaurant': return 'restauranten';
    case 'room': return 'værelset';
    case 'boutique': return 'tøjbutikken';
    case 'checkout': return 'lobbyen';
  }
}

/** Where a guest says they want to go: "Nu vil jeg gerne i poolen." */
function goingTo(place: Destination): string {
  switch (place) {
    case 'pool': return 'i poolen';
    case 'restaurant': return 'i restauranten';
    case 'room': return 'op på mit værelse';
    case 'boutique': return 'i tøjbutikken';
    case 'checkout': return 'i lobbyen og tjekke ud';
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
  return listWords(dishes.map(d => d.toLowerCase()), startsSentence);
}

function listWords(words: string[], startsSentence = false): string {
  if (words.length === 0) return '';
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

/** What a guest at the pool still wants, in words: "en solstol og en citronis i bæger med drys". */
function poolWants(guest: GuestData): string {
  const items: string[] = [];
  if (guest.lounger === null) items.push('en solstol');
  for (const key of gameState.outstandingExtras(guest)) items.push(extraPhrase(key));
  return listWords(items);
}

/**
 * What a guest says when the player taps them.
 *
 * The line is only shown once they are tapped — on screen a guest carries a picture of what
 * they want, which is what a child who cannot read yet actually uses. The words are for the
 * grown-up reading along, and for the child who can.
 */
export function guestLine(guest: GuestData, now = Date.now()): GuestLine {
  const phase = gameState.guestPhase(guest, now);
  const next = gameState.nextPlaceOf(guest);

  if (guest.at === 'following') {
    return { text: `Jeg skal ${goingTo(guest.heading ?? 'checkout')}. Vis mig vejen!`, tone: 'happy' };
  }

  if (!guest.checkedIn) {
    return phase === 'impatient'
      ? { text: 'Hallo? Er der ikke nogen, der kan hjælpe mig?', tone: 'grumpy' }
      : { text: 'Hej! Har I et ledigt værelse til mig?', tone: 'idle' };
  }

  if (guest.at === 'checkout') {
    return phase === 'impatient'
      ? { text: 'Vi vil gerne betale og komme hjem!', tone: 'grumpy' }
      : { text: 'Vi vil gerne tjekke ud. Tak for besøget!', tone: 'idle' };
  }

  if (phase === 'ready') {
    const onward = next ? `Nu vil jeg gerne ${goingTo(next)}.` : '';
    if (guest.at === 'lobby') return { text: `Tak for nøglen! ${onward}`, tone: 'happy' };
    if (guest.settledAt === null) {
      // they gave up on this stop
      const reason = guest.at === 'room'
        ? 'Jeg kan ikke sove i det rod.'
        : 'Jeg gider ikke vente mere.';
      return { text: `${reason} ${next ? `Jeg vil hellere ${goingTo(next)}.` : ''}`, tone: 'grumpy' };
    }
    const thanks = guest.at === 'pool' ? 'Det var dejligt at bade!'
      : guest.at === 'restaurant' ? 'Tak for mad!'
      : guest.at === 'boutique' ? 'Tak! Den vil jeg have på hele ferien.'
      : 'Godmorgen! Jeg har sovet godt.';
    return { text: `${thanks} ${onward}`, tone: 'happy' };
  }

  switch (guest.at) {
    case 'pool': {
      if (phase === 'happy') return { text: 'Åh, hvor er vandet dejligt!', tone: 'happy' };
      const wants = poolWants(guest);
      if (phase === 'impatient') return { text: `Jeg har ventet længe! Jeg mangler ${wants}.`, tone: 'grumpy' };
      if (guest.lounger !== null) return { text: `Tak for solstolen! Nu mangler jeg bare ${wants}.`, tone: 'idle' };
      const extras = gameState.outstandingExtras(guest).map(extraPhrase);
      return extras.length === 0
        ? { text: 'Jeg vil bade! Er der en solstol klar?', tone: 'idle' }
        : { text: `Jeg vil bade! Må jeg få en solstol og ${listWords(extras)}?`, tone: 'idle' };
    }

    case 'restaurant': {
      if (phase === 'happy') return { text: 'Mmm, hvor smager det godt!', tone: 'happy' };
      const left = gameState.outstandingOrder(guest);
      return phase === 'impatient'
        ? { text: `Kommer der snart ${listDishes(left)}?`, tone: 'grumpy' }
        : { text: `${listDishes(left, true)}, tak!`, tone: 'idle' };
    }

    case 'boutique': {
      if (phase === 'happy') return { text: 'Se mig! Er den ikke flot?', tone: 'happy' };
      const wants = listWords(gameState.outstandingExtras(guest).map(garmentPhrase));
      return phase === 'impatient'
        ? { text: `Jeg har ventet længe på ${wants}!`, tone: 'grumpy' }
        : { text: `Hej! Jeg vil gerne købe ${wants}.`, tone: 'idle' };
    }

    case 'room':
      if (phase === 'happy') return { text: 'Zzz... godnat.', tone: 'happy' };
      return phase === 'impatient'
        ? { text: 'Her er rod! Jeg kan ikke sove.', tone: 'grumpy' }
        : { text: 'Jeg er træt. Er værelset gjort klar?', tone: 'idle' };

    default:
      return { text: '...', tone: 'idle' };
  }
}

/* ---------------------------------------------------------- thought bubbles --- */

/** One picture in a thought bubble. */
export type ThoughtIcon = (g: Phaser.GameObjects.Graphics, s: number) => void;

export interface Thought {
  icons: ThoughtIcon[];
  /** `want` waits for a job, `ready` wants to be led somewhere, `grumpy` has waited too long. */
  tone: 'want' | 'ready' | 'grumpy';
}

/**
 * The picture over a guest's head: what they want, before anybody has asked them.
 *
 * Null while they are happily getting on with it — a bubble over everybody would make the
 * ones that need you impossible to spot.
 */
export function guestThought(guest: GuestData, now = Date.now()): Thought | null {
  const phase = gameState.guestPhase(guest, now);
  if (phase === 'happy' || guest.at === 'following') return null;

  if (phase === 'ready') {
    const next = gameState.nextPlaceOf(guest);
    if (!next) return null;
    const place = destinationIcon(next);
    return {
      icons: [(g, s) => place(g, s), (g, s) => paintArrow(g, s * 0.8)],
      tone: guest.settledAt === null ? 'grumpy' : 'ready',
    };
  }

  const tone = phase === 'impatient' ? 'grumpy' : 'want';
  if (!guest.checkedIn) return { icons: [(g, s) => paintKey(g, s)], tone };
  if (guest.at === 'checkout') return { icons: [(g, s) => paintSuitcase(g, s)], tone };

  const icons: ThoughtIcon[] = [];
  switch (guest.at) {
    case 'pool':
      if (guest.lounger === null) icons.push((g, s) => paintLounger(g, s));
      for (const key of gameState.outstandingExtras(guest)) icons.push((g, s) => paintExtra(g, s, key));
      break;
    case 'boutique':
      // The very thing, in its colour: the bubble is the order a pre-reader copies from.
      for (const key of gameState.outstandingExtras(guest)) icons.push((g, s) => paintExtra(g, s * 1.25, key));
      break;
    case 'restaurant':
      icons.push((g, s) => paintPlate(g, s));
      break;
    case 'room':
      icons.push((g, s) => paintBed(g, s));
      break;
  }
  return icons.length > 0 ? { icons, tone } : null;
}

const THOUGHT_FILL: Record<Thought['tone'], number> = {
  want: COLORS.white,
  ready: 0xE6F4DE,
  grumpy: 0xFBE2DC,
};

/**
 * A thought bubble, its tail of little circles pointing down at the guest at (x, y).
 *
 * Deliberately a different shape from the speech bubble it replaced: this is the guest
 * *wanting* something, not saying it. Tapping the guest is what gets the words.
 */
export function drawThought(
  scene: Phaser.Scene,
  x: number, y: number,
  thought: Thought,
  scale = 1
): Phaser.GameObjects.Container {
  const s = scale;
  const n = thought.icons.length;
  const cell = 34 * s;
  const w = Math.max(46 * s, n * cell + 14 * s);
  const h = 42 * s;

  const g = scene.add.graphics();
  shadow(g, -w / 2, -h / 2, w, h, h / 2, 3, 0.16);
  plate(g, -w / 2, -h / 2, w, h, h / 2, THOUGHT_FILL[thought.tone], 1, LINE.thin);
  // the tail: two shrinking circles down towards the head
  for (const [dx, dy, r] of [[-6, h / 2 + 7 * s, 5 * s], [-11, h / 2 + 16 * s, 3 * s]] as const) {
    g.fillStyle(THOUGHT_FILL[thought.tone]);
    g.fillCircle(dx * s, dy, r);
    g.lineStyle(LINE.hair, COLORS.outline, 0.9);
    g.strokeCircle(dx * s, dy, r);
  }

  const c = scene.add.container(x, y - h / 2 - 20 * s, [g]);
  c.setData({ w, h });
  thought.icons.forEach((paint, i) => {
    const icon = scene.add.graphics().setPosition((i - (n - 1) / 2) * cell, 0);
    paint(icon, 0.95 * s);
    c.add(icon);
  });

  if (!reduceMotion()) {
    if (thought.tone === 'grumpy') {
      scene.tweens.add({
        targets: c, angle: { from: -3, to: 3 },
        duration: 220, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    } else {
      scene.tweens.add({
        targets: c, y: c.y - 4, duration: 900 + (x % 300),
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }
  }
  return c;
}

/* ------------------------------------------------------------------ the card --- */

export type ActionKind = 'checkin' | 'lead' | 'lounger' | 'bed' | 'serve' | 'extra' | 'checkout';

export interface CardAction {
  kind: ActionKind;
  label: string;
  /** The dish or item the action is about, when there is a choice. */
  arg?: string;
}

/** One thing on a guest's list, and whether it has arrived. */
export type CardWant =
  | { kind: 'icon'; paint: ThoughtIcon; done: boolean }
  | { kind: 'dish'; dish: string; done: boolean };

export interface CardModel {
  line: GuestLine;
  wants: CardWant[];
  actions: CardAction[];
  /** What to do when there is nothing to press yet: "Lav maden i køkkenet". */
  hint: string | null;
}

/**
 * What the card shows for a guest: what they say, what they want, and what can be done
 * for them right now.
 *
 * An action only appears when it would work. A child should never press "Server suppe" and
 * be told there is no soup — the card says where the soup comes from instead.
 */
export function guestCard(guest: GuestData, now = Date.now()): CardModel {
  const line = guestLine(guest, now);
  const phase = gameState.guestPhase(guest, now);
  const wants: CardWant[] = [];
  const actions: CardAction[] = [];
  let hint: string | null = null;

  const next = gameState.nextPlaceOf(guest);

  if (guest.at === 'following') {
    if (next) wants.push({ kind: 'icon', paint: destinationIcon(next), done: false });
    hint = next ? `Gå til ${placeName(next)} — så følger jeg med.` : null;
    return { line, wants, actions, hint };
  }

  if (!guest.checkedIn) {
    wants.push({ kind: 'icon', paint: paintKey, done: false });
    const free = gameState.rooms.findIndex(r => r.guestId === null);
    if (free === -1) hint = 'Alle værelser er optaget. En gæst skal tjekke ud først.';
    else actions.push({ kind: 'checkin', label: `Giv nøgle til værelse ${free + 1}` });
    return { line, wants, actions, hint };
  }

  if (guest.at === 'checkout') {
    wants.push({ kind: 'icon', paint: paintSuitcase, done: false });
    actions.push({ kind: 'checkout', label: 'Tjek ud' });
    return { line, wants, actions, hint };
  }

  if (phase === 'ready') {
    if (next) wants.push({ kind: 'icon', paint: destinationIcon(next), done: false });
    actions.push({ kind: 'lead', label: 'Følg med mig' });
    return { line, wants, actions, hint };
  }

  switch (guest.at) {
    case 'pool': {
      wants.push({ kind: 'icon', paint: paintLounger, done: guest.lounger !== null });
      for (const key of guest.extras) {
        wants.push({
          kind: 'icon',
          paint: (g, s) => paintExtra(g, s, key),
          done: !gameState.outstandingExtras(guest).includes(key),
        });
      }
      if (phase === 'happy') break;

      const missing: string[] = [];
      if (guest.lounger === null) {
        if (gameState.freeLounger() !== null) actions.push({ kind: 'lounger', label: 'Giv solstol' });
        else missing.push('Læg et håndklæde på en solstol');
      }
      for (const key of new Set(gameState.outstandingExtras(guest))) {
        if (gameState.extraReady(key)) actions.push({ kind: 'extra', label: giveLabel(key), arg: key });
        else missing.push(isIce(key) ? 'Lav isen i isboden' : 'Lav tøjet i tøjbutikken');
      }
      if (missing.length > 0) hint = `${missing.join('. ')}.`;
      break;
    }

    case 'restaurant': {
      const left = gameState.outstandingOrder(guest);
      const served = [...guest.served];
      for (const dish of guest.order) {
        const at = served.indexOf(dish);
        const done = at !== -1;
        if (done) served.splice(at, 1);
        wants.push({ kind: 'dish', dish, done });
      }
      if (phase === 'happy') break;

      for (const dish of new Set(left)) {
        if (gameState.kitchen.ready.includes(dish)) {
          actions.push({ kind: 'serve', label: `Server ${dish.toLowerCase()}`, arg: dish });
        }
      }
      const notReady = [...new Set(left)].filter(d => !gameState.kitchen.ready.includes(d));
      if (notReady.length > 0) hint = `${listDishes(notReady, true)} skal laves i køkkenet.`;
      break;
    }

    case 'boutique': {
      for (const key of guest.extras) {
        wants.push({
          kind: 'icon',
          paint: (g, s) => paintExtra(g, s * 1.25, key),
          done: !gameState.outstandingExtras(guest).includes(key),
        });
      }
      if (phase === 'happy') break;
      for (const key of new Set(gameState.outstandingExtras(guest))) {
        if (gameState.extraReady(key)) actions.push({ kind: 'extra', label: giveLabel(key), arg: key });
        else hint = 'Lav det her i butikken, og læg det på hylden.';
      }
      break;
    }

    case 'room': {
      wants.push({ kind: 'icon', paint: paintBed, done: guest.inBed });
      if (phase === 'happy') break;
      if (guest.roomNumber !== null && gameState.isRoomClean(guest.roomNumber)) {
        actions.push({ kind: 'bed', label: 'Put i seng' });
      } else {
        hint = 'Gør værelset klar først.';
      }
      break;
    }
  }

  return { line, wants, actions, hint };
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

    if (phase === 'happy' || phase === 'ready') return;

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
