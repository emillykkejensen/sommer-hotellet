import Phaser from 'phaser';
import { COLORS, INK_SOFT, SIZE, text } from '../config';
import { primeVoices } from '../helpers/Speech';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(COLORS.skyLight);

    // da-DK voices load asynchronously in some browsers
    primeVoices();

    const label = this.add.text(width / 2, height / 2 + 46, 'Indlæser...', text(SIZE.body, INK_SOFT))
      .setOrigin(0.5);

    // three bouncing dots
    for (let i = 0; i < 3; i++) {
      const dot = this.add.circle(width / 2 - 18 + i * 18, height / 2, 7, COLORS.sunDeep);
      this.tweens.add({
        targets: dot,
        y: height / 2 - 14,
        duration: 380,
        delay: i * 120,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    // Phaser measures text against whatever font is available at draw time, so wait for
    // the webfont before the first scene lays anything out.
    const ready = document.fonts?.ready ?? Promise.resolve();
    Promise.race([ready, new Promise(r => setTimeout(r, 2500))]).then(() => {
      label.destroy();
      this.scene.start('MainMenuScene');
    });
  }
}
