/**
 * Logical game size.
 *
 * The canvas is scaled to FIT whatever it is given, so this is really a zoom control: a
 * smaller logical stage means every drawn shape and every label covers more of the screen.
 * It was 960x600, which on a phone held at arm's length by a five-year-old put the body
 * text at around 3mm tall. Shrinking the stage ~9% and putting the type scale up ~12% on
 * top of it lands everything roughly a fifth bigger without redrawing a single shape.
 *
 * The 1.6 aspect ratio is deliberate — changing it would letterbox instead of zoom.
 */
export const GAME_WIDTH = 880;
export const GAME_HEIGHT = 550;

/**
 * Palette.
 *
 * Backgrounds stay soft — a screen a child looks at for twenty minutes should not
 * vibrate — but everything that sits *on* a background is outlined and a step or two more
 * saturated. Contrast comes from the ink line, not from shouting fills, which is what lets
 * a green button sit on green grass and still read as a button.
 *
 * Every hue keeps its light / base / deep step so shapes can be shaded rather than
 * flat-filled.
 */
export const COLORS = {
  // sky
  sky: 0x9FD6F2,
  skyLight: 0xD9EFFB,
  skyDeep: 0x7CBFE4,

  // ground
  grass: 0x86C963,
  grassLight: 0xA6DC85,
  grassDeep: 0x5FA347,

  sand: 0xF2DCA4,
  sandLight: 0xFAEDCD,
  sandDeep: 0xD9BA7C,

  // water
  water: 0x54B4E2,
  waterLight: 0x93D6F0,
  waterDeep: 0x2F8CC0,

  // wood
  wood: 0xCE9C69,
  woodLight: 0xE3BB8D,
  woodDeep: 0xA0764B,

  // building
  roof: 0xE0715A,
  roofDeep: 0xB55345,
  wall: 0xFDF6E8,
  wallDeep: 0xF0E2C9,
  door: 0xA0764B,
  window: 0xCDEAF7,

  // room wall tints
  wallPink: 0xFCE6E5,
  wallBlue: 0xE4F2FC,
  wallGreen: 0xE9F5E2,

  // accents — a notch punchier than the old set, because they now carry an outline
  red: 0xE8705A,
  orange: 0xF5A249,
  yellow: 0xF8CE55,
  green: 0x74C255,
  pink: 0xF593AC,
  purple: 0xAE87D6,
  teal: 0x54C4B8,
  sun: 0xFFCF52,
  sunDeep: 0xF2AE2C,

  // neutrals — warm, so nothing reads as printer grey
  white: 0xFFFFFF,
  cream: 0xFDF7EA,
  stone: 0xDCD4C7,
  stoneDeep: 0xB5AA9A,
  ink: 0x5A4E42,
  inkSoft: 0x8A7E70,
  shadow: 0x4A3B2E,

  /**
   * The cartoon outline. One warm near-black used for every stroke in the game, so the
   * whole screen reads as drawn by the same hand. Never pure black — black next to
   * pastel looks like a printing error.
   */
  outline: 0x4A3A2C,
};

/** Same values as CSS strings, for Text objects. */
export const INK = '#5A4E42';
export const INK_SOFT = '#8A7E70';
export const INK_ON_DARK = '#FFFFFF';
export const OUTLINE_CSS = '#4A3A2C';

/**
 * Nunito is rounded and has a tall x-height, which reads better at small sizes for
 * early readers than the bold Arial this replaced. Loaded in index.html; BootScene
 * waits for document.fonts before drawing anything.
 */
export const FONT = "Nunito, 'Trebuchet MS', 'Segoe UI', system-ui, sans-serif";

/**
 * Type scale. Every size in the game comes from here, so legibility is one edit.
 *
 * These are ~12% up on the first version, which together with the smaller logical stage
 * makes on-screen text about a fifth larger. `tiny` is the floor: nothing a child has to
 * read is allowed below it.
 */
export const SIZE = {
  display: 49,
  title: 29,
  heading: 21,
  body: 17,
  label: 15,
  tiny: 13,
};

export type Weight = 'regular' | 'semibold' | 'bold';
const WEIGHTS: Record<Weight, string> = { regular: '400', semibold: '600', bold: '700' };

export function text(
  size: number,
  color: string = INK,
  weight: Weight = 'semibold'
): Phaser.Types.GameObjects.Text.TextStyle {
  return { fontFamily: FONT, fontSize: `${size}px`, color, fontStyle: WEIGHTS[weight] };
}

/**
 * Outlined text. Used for anything sitting on scenery rather than on a plate — the
 * stroke is what keeps a white title legible over both a bright sky and a dark tree.
 */
export function textOutlined(
  size: number,
  color = '#FFFFFF',
  stroke = OUTLINE_CSS,
  thickness = 6
): Phaser.Types.GameObjects.Text.TextStyle {
  return { ...text(size, color, 'bold'), stroke, strokeThickness: thickness };
}

/** Stroke weights, so the outline stays consistent across every shape in the game. */
export const LINE = {
  hair: 1.5,
  thin: 2,
  base: 2.5,
  thick: 3.5,
  heavy: 5,
};

/**
 * Room looks. The first three ship with the hotel; the rest are unlocked in the shop, so
 * the order here is also the unlock order and must stay stable — saves store the index.
 */
export const ROOM_THEMES = [
  { name: 'Solskin', wall: COLORS.wallPink, accent: COLORS.pink, duvet: 0xF6B9C6, cushion: COLORS.pink },
  { name: 'Havet', wall: COLORS.wallBlue, accent: COLORS.water, duvet: 0x93D6F0, cushion: COLORS.water },
  { name: 'Skoven', wall: COLORS.wallGreen, accent: COLORS.green, duvet: 0xB4DBA5, cushion: COLORS.green },
  { name: 'Ørkenen', wall: 0xFBEFD9, accent: COLORS.orange, duvet: 0xF3CE93, cushion: 0xE8A863 },
  { name: 'Stjernenat', wall: 0xE4E3F5, accent: COLORS.purple, duvet: 0xC6BDE8, cushion: 0x9B8ACC },
  { name: 'Havfruen', wall: 0xDDF3F1, accent: 0x4FB3A6, duvet: 0xA6DED6, cushion: 0x4FB3A6 },
  { name: 'Solnedgang', wall: 0xFCE8DE, accent: 0xE8795F, duvet: 0xF7BFA3, cushion: 0xE8795F },
];

/** Shared depths so effects always draw above a refreshed layer. */
export const DEPTH = {
  background: 0,
  /** Scenery that animates itself, above the baked background and below game state. */
  ambient: 5,
  dynamic: 10,
  chrome: 800,
  effects: 900,
  overlay: 950,
};

/**
 * Star ranks.
 *
 * A ladder for the star counter to fill. It is a read-out of effort, not a gate — nothing
 * to unlock, nothing to fail, no way to go backwards. The shop is what stars are actually
 * spent on; this is just the counter having something to say.
 */
export const RANKS = [
  { at: 0, name: 'Nybegynder' },
  { at: 8, name: 'Hotelhjælper' },
  { at: 20, name: 'Receptionist' },
  { at: 36, name: 'Hotelchef' },
  { at: 56, name: 'Sommerstjerne' },
  { at: 80, name: 'Superstjerne' },
];

export interface RankInfo {
  index: number;
  name: string;
  /** 0-1 through the current rank; 1 when the last rank is reached. */
  progress: number;
  starsInto: number;
  starsNeeded: number;
  isMax: boolean;
}

export function rankFor(stars: number): RankInfo {
  let index = 0;
  for (let i = 0; i < RANKS.length; i++) {
    if (stars >= RANKS[i].at) index = i;
  }
  const isMax = index === RANKS.length - 1;
  const from = RANKS[index].at;
  const to = isMax ? from : RANKS[index + 1].at;
  const span = to - from;
  // Clamped by hand rather than with Phaser.Math: this module is imported by the
  // Playwright harness, which runs in Node with no DOM for Phaser to attach to.
  const progress = span > 0 ? Math.min(1, Math.max(0, (stars - from) / span)) : 1;
  return {
    index,
    name: RANKS[index].name,
    progress: isMax ? 1 : progress,
    starsInto: stars - from,
    starsNeeded: isMax ? 0 : span,
    isMax,
  };
}

/** Shown in a big bouncy pop when something is finished. Rotated so it never nags. */
export const PRAISE = ['Flot!', 'Sådan!', 'Godt gået!', 'Super!', 'Hurra!', 'Fint klaret!'];
