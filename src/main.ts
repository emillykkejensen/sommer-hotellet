import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { HotelMapScene } from './scenes/HotelMapScene';
import { LobbyScene } from './scenes/LobbyScene';
import { RoomScene } from './scenes/RoomScene';
import { KitchenScene } from './scenes/KitchenScene';
import { PoolScene } from './scenes/PoolScene';
import { GardenScene } from './scenes/GardenScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 800,
  height: 600,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  backgroundColor: '#87CEEB',
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
  input: {
    activePointers: 3,
  },
};

new Phaser.Game(config);
