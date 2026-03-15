import { COLORS } from '../config';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor(COLORS.sky);

    const loadingText = this.add.text(width / 2, height / 2, 'Indlæser...', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '28px',
      color: '#FFFFFF',
    }).setOrigin(0.5);

    // Small delay so the player sees the loading screen
    this.time.delayedCall(500, () => {
      loadingText.destroy();
      this.scene.start('MainMenuScene');
    });
  }
}
