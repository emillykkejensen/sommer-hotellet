import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from './config';
import { BootScene } from './scenes/BootScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { HotelMapScene } from './scenes/HotelMapScene';
import { LobbyScene } from './scenes/LobbyScene';
import { RoomScene } from './scenes/RoomScene';
import { KitchenScene } from './scenes/KitchenScene';
import { PoolScene } from './scenes/PoolScene';
import { GardenScene } from './scenes/GardenScene';
import { installAudioUnlock } from './helpers/AudioManager';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  backgroundColor: `#${COLORS.skyLight.toString(16).padStart(6, '0')}`,
  roundPixels: true,
  scene: [
    BootScene,
    MainMenuScene,
    HotelMapScene,
    LobbyScene,
    RoomScene,
    KitchenScene,
    PoolScene,
    GardenScene,
  ],
};

// Browsers only let an AudioContext start inside a user gesture, so the sound engine
// listens for the first tap anywhere on the page rather than trying to start itself.
installAudioUnlock();

const game = new Phaser.Game(config);

// Exposed so the Playwright smoke tests can read scene state.
(window as unknown as { __game: Phaser.Game }).__game = game;
