import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from './config';
import { audio } from './helpers/Audio';
import { setupNative } from './helpers/Native';
import { BootScene } from './scenes/BootScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { HotelMapScene } from './scenes/HotelMapScene';
import { LobbyScene } from './scenes/LobbyScene';
import { RoomScene } from './scenes/RoomScene';
import { KitchenScene } from './scenes/KitchenScene';
import { PoolScene } from './scenes/PoolScene';
import { GardenScene } from './scenes/GardenScene';
import { ShopScene } from './scenes/ShopScene';
import { SettingsScene } from './scenes/SettingsScene';
import { TaskOverlayScene } from './scenes/TaskOverlayScene';

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
  // All sound is synthesised in helpers/Audio.ts, so Phaser's own sound manager would only
  // create a second, unused AudioContext (and a suspended-autoplay warning) at boot.
  audio: { noAudio: true },
  scene: [
    BootScene,
    MainMenuScene,
    HotelMapScene,
    LobbyScene,
    RoomScene,
    KitchenScene,
    PoolScene,
    GardenScene,
    ShopScene,
    SettingsScene,
    TaskOverlayScene,
  ],
};

const game = new Phaser.Game(config);

// Browsers keep an AudioContext suspended until the player interacts, so build it on the
// very first tap rather than at load.
const unlockAudio = () => {
  audio.unlock();
  window.removeEventListener('pointerdown', unlockAudio);
  window.removeEventListener('keydown', unlockAudio);
};
window.addEventListener('pointerdown', unlockAudio);
window.addEventListener('keydown', unlockAudio);

// Exposed so the Playwright smoke tests can read scene state.
(window as unknown as { __game: Phaser.Game }).__game = game;

// Landscape lock, immersive fullscreen, keep-awake and the hardware back button. Every one
// of these is a no-op in a browser, so the web build is unchanged.
void setupNative(game);
