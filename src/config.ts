export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;

export const COLORS = {
  sky: 0x87CEEB,
  grass: 0x7EC850,
  sand: 0xF4D03F,
  water: 0x3498DB,
  waterLight: 0x5DADE2,
  wood: 0x8B6914,
  woodLight: 0xA0782C,
  wall: 0xFFF8DC,
  wallPink: 0xFFE4E1,
  wallBlue: 0xE0F0FF,
  wallGreen: 0xE8F5E9,
  roof: 0xCC4444,
  roofDark: 0xAA3333,
  door: 0x6B4226,
  window: 0xADD8E6,
  white: 0xFFFFFF,
  black: 0x000000,
  red: 0xE74C3C,
  orange: 0xF39C12,
  yellow: 0xF1C40F,
  green: 0x27AE60,
  pink: 0xFF69B4,
  purple: 0x9B59B6,
  brown: 0x8B4513,
  grey: 0x95A5A6,
  greyLight: 0xBDC3C7,
  cream: 0xFFFDD0,
  sunYellow: 0xFFD700,
};

export const FONT_STYLE = {
  fontFamily: 'Arial, sans-serif',
  fontSize: '24px',
  color: '#333333',
};

export const TITLE_STYLE = {
  fontFamily: 'Arial, sans-serif',
  fontSize: '48px',
  color: '#CC4444',
  fontStyle: 'bold',
};

export const BUTTON_STYLE = {
  fontFamily: 'Arial, sans-serif',
  fontSize: '28px',
  color: '#FFFFFF',
  fontStyle: 'bold',
};

export const ROOM_THEMES = [
  { name: 'Rum 1 - Solskin', wall: COLORS.wallPink, accent: COLORS.pink, bedColor: 0xFF9999 },
  { name: 'Rum 2 - Havet', wall: COLORS.wallBlue, accent: COLORS.water, bedColor: 0x99CCFF },
  { name: 'Rum 3 - Skoven', wall: COLORS.wallGreen, accent: COLORS.green, bedColor: 0x99CC99 },
];
