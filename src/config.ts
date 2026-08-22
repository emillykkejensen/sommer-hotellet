export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 600;

/**
 * Palette. Softer and less saturated than a primary-colour set: every hue has a
 * light / base / deep step so shapes can be shaded instead of outlined, which is
 * what keeps them from reading as flat slabs.
 */
export const COLORS = {
  // sky
  sky: 0xA9DAF0,
  skyLight: 0xD6EDF8,
  skyDeep: 0x8CC9E6,

  // ground
  grass: 0x8CC96E,
  grassLight: 0xA5D98A,
  grassDeep: 0x6FAE55,

  sand: 0xF0DCA8,
  sandLight: 0xF8EBCB,
  sandDeep: 0xDCC087,

  // water
  water: 0x62B6DE,
  waterLight: 0x9AD3EC,
  waterDeep: 0x3E96C4,

  // wood
  wood: 0xC99A6B,
  woodLight: 0xDDB68B,
  woodDeep: 0xA57A51,

  // building
  roof: 0xD9705C,
  roofDeep: 0xB9584A,
  wall: 0xFBF3E4,
  wallDeep: 0xEFE2CB,
  door: 0xA57A51,
  window: 0xCDE9F5,

  // room wall tints
  wallPink: 0xFBE7E6,
  wallBlue: 0xE6F2FB,
  wallGreen: 0xEAF4E4,

  // accents
  red: 0xE07A63,
  orange: 0xEFA95F,
  yellow: 0xF6D06A,
  green: 0x7CBE6A,
  pink: 0xF2A0B5,
  purple: 0xB294D4,
  sun: 0xFBCF63,
  sunDeep: 0xF0B93F,

  // neutrals — warm, so nothing reads as printer grey
  white: 0xFFFFFF,
  cream: 0xFDF7EA,
  stone: 0xD8D0C4,
  stoneDeep: 0xB3A899,
  ink: 0x5A4E42,
  inkSoft: 0x8A7E70,
  shadow: 0x4A3B2E,
};

/** Same values as CSS strings, for Text objects. */
export const INK = '#5A4E42';
export const INK_SOFT = '#8A7E70';
export const INK_ON_DARK = '#FFFFFF';

/**
 * Nunito is rounded and has a tall x-height, which reads better at small sizes for
 * early readers than the bold Arial this replaced. Loaded in index.html; BootScene
 * waits for document.fonts before drawing anything.
 */
export const FONT = "Nunito, 'Trebuchet MS', 'Segoe UI', system-ui, sans-serif";

export const SIZE = {
  display: 44,
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
 * Room looks. The first three ship with the hotel; the rest are unlocked in the shop, so
 * the order here is also the unlock order and must stay stable — saves store the index.
 */
export const ROOM_THEMES = [
  { name: 'Solskin', wall: COLORS.wallPink, accent: COLORS.pink, duvet: 0xF6B9C6, cushion: 0xF2A0B5 },
  { name: 'Havet', wall: COLORS.wallBlue, accent: COLORS.water, duvet: 0x9AD3EC, cushion: 0x62B6DE },
  { name: 'Skoven', wall: COLORS.wallGreen, accent: COLORS.green, duvet: 0xB4DBA5, cushion: 0x7CBE6A },
  { name: 'Ørkenen', wall: 0xFBEFD9, accent: COLORS.orange, duvet: 0xF3CE93, cushion: 0xE8A863 },
  { name: 'Stjernenat', wall: 0xE4E3F5, accent: COLORS.purple, duvet: 0xC6BDE8, cushion: 0x9B8ACC },
  { name: 'Havfruen', wall: 0xDDF3F1, accent: 0x4FB3A6, duvet: 0xA6DED6, cushion: 0x4FB3A6 },
  { name: 'Solnedgang', wall: 0xFCE8DE, accent: 0xE8795F, duvet: 0xF7BFA3, cushion: 0xE8795F },
];

/** Shared depths so effects always draw above a refreshed layer. */
export const DEPTH = {
  background: 0,
  dynamic: 10,
  chrome: 800,
  effects: 900,
};
