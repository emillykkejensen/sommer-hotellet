export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 600;

/**
 * Palette.
 *
 * Backgrounds stay soft — a screen a child looks at for twenty minutes should not
 * vibrate — but everything that sits *on* a background is now outlined and a step or
 * two more saturated. Contrast comes from the ink line, not from shouting fills, which
 * is what lets a green button sit on green grass and still read as a button.
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

export const SIZE = {
  display: 52,
  title: 26,
  heading: 19,
  body: 15,
  label: 13,
  tiny: 11,
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

export const ROOM_THEMES = [
  { name: 'Solskin', wall: COLORS.wallPink, accent: COLORS.pink, duvet: 0xF6B9C6, cushion: 0xF593AC },
  { name: 'Havet', wall: COLORS.wallBlue, accent: COLORS.water, duvet: 0x93D6F0, cushion: 0x54B4E2 },
  { name: 'Skoven', wall: COLORS.wallGreen, accent: COLORS.green, duvet: 0xB4DBA5, cushion: 0x74C255 },
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
 * Stars used to accumulate into a number that meant nothing. A rank ladder gives the
 * counter something to fill up and a moment to celebrate, without adding a way to lose
 * anything or a wall to get stuck behind — it is a read-out of effort, not a gate.
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
  /** 0–1 through the current rank; 1 when the last rank is reached. */
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
