import Phaser from 'phaser';
import { COLORS, FONT, INK_SOFT, SIZE, text } from '../config';
import { button, drawCloud, drawFlower, drawSun, gradientBand, shadow } from '../helpers/Draw';
import { gameState } from '../state/GameState';
import { dur, transition } from '../helpers/Motion';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.fadeIn(dur(400));

    gradientBand(this, 0, height * 0.72, COLORS.skyLight, COLORS.sky);
    gradientBand(this, height * 0.68, height * 0.32, COLORS.grassLight, COLORS.grassDeep);

    drawSun(this, width - 110, 150, 30);

    const c1 = drawCloud(this, 170, 96, 1);
    this.tweens.add({ targets: c1, x: '+=180', duration: 22000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const c2 = drawCloud(this, 640, 128, 0.68);
    this.tweens.add({ targets: c2, x: '-=140', duration: 18000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.drawHotel(width / 2, height * 0.5);

    const title = this.add.text(width / 2, height * 0.15, 'Sommer Hotellet', {
      fontFamily: FONT,
      fontSize: `${SIZE.display}px`,
      color: '#FFFFFF',
      fontStyle: '700',
      stroke: '#C05B49',
      strokeThickness: 7,
    }).setOrigin(0.5);

    const sub = this.add.text(width / 2, height * 0.235, 'Fordi der altid er sommer her', {
      fontFamily: FONT,
      fontSize: `${SIZE.body}px`,
      color: '#FFFFFF',
      fontStyle: '600',
      stroke: '#8CC9E6',
      strokeThickness: 3,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: [title, sub],
      y: '-=6',
      duration: 2200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    button(this, width / 2, height * 0.86, 'Spil', COLORS.green,
      () => transition(this, 'HotelMapScene', 280), 210, 58, SIZE.title);

    // A parent needs a way out of a stuck save that is not devtools.
    if (gameState.stars > 0) {
      this.addResetLink(width / 2, height - 26);
    }

    for (let i = 0; i < 9; i++) {
      drawFlower(
        this,
        Phaser.Math.Between(40, width - 40),
        Phaser.Math.Between(height * 0.76, height * 0.95),
        Phaser.Utils.Array.GetRandom([COLORS.pink, COLORS.yellow, COLORS.purple, COLORS.white]),
        0.62
      );
    }
  }

  private addResetLink(x: number, y: number): void {
    const label = this.add.text(x, y, 'Start forfra', text(SIZE.tiny, '#FFFFFF', 'semibold'))
      .setOrigin(0.5)
      .setAlpha(0.75)
      .setInteractive({ useHandCursor: true });

    label.on('pointerover', () => label.setAlpha(1));
    label.on('pointerout', () => label.setAlpha(0.75));
    label.on('pointerdown', () => {
      if (label.getData('confirming')) {
        gameState.reset();
        this.scene.restart();
        return;
      }
      label.setData('confirming', true);
      label.setText('Tryk igen for at slette');
      this.time.delayedCall(3000, () => {
        if (label.active) {
          label.setData('confirming', false);
          label.setText('Start forfra');
        }
      });
    });
  }

  private drawHotel(cx: number, cy: number): void {
    const g = this.add.graphics();

    shadow(g, cx - 130, cy - 78, 260, 168, 10, 6, 0.14);

    // body
    g.fillStyle(COLORS.wall);
    g.fillRoundedRect(cx - 130, cy - 78, 260, 168, 10);
    g.fillStyle(COLORS.wallDeep, 0.5);
    g.fillRoundedRect(cx + 92, cy - 78, 38, 168, { tl: 0, tr: 10, bl: 0, br: 10 });

    // roof
    g.fillStyle(COLORS.roofDeep);
    g.fillTriangle(cx - 152, cy - 74, cx + 152, cy - 74, cx, cy - 152);
    g.fillStyle(COLORS.roof);
    g.fillTriangle(cx - 152, cy - 74, cx + 130, cy - 74, cx - 12, cy - 146);

    // windows
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 4; col++) {
        const wx = cx - 84 + col * 56;
        const wy = cy - 44 + row * 58;
        g.fillStyle(COLORS.window);
        g.fillRoundedRect(wx - 17, wy - 15, 34, 30, 5);
        g.fillStyle(COLORS.white, 0.5);
        g.fillRoundedRect(wx - 17, wy - 15, 15, 30, 5);
        g.lineStyle(2, COLORS.wallDeep);
        g.strokeRoundedRect(wx - 17, wy - 15, 34, 30, 5);
      }
    }

    // door with awning
    g.fillStyle(COLORS.door);
    g.fillRoundedRect(cx - 22, cy + 42, 44, 48, { tl: 12, tr: 12, bl: 0, br: 0 });
    g.fillStyle(COLORS.sun);
    g.fillCircle(cx + 12, cy + 66, 3);
    g.fillStyle(COLORS.roof);
    g.fillRoundedRect(cx - 34, cy + 34, 68, 12, 6);

    // sign
    const signW = 116;
    g.fillStyle(COLORS.white);
    g.fillRoundedRect(cx - signW / 2, cy - 128, signW, 28, 8);
    this.add.text(cx, cy - 114, 'HOTEL', {
      fontFamily: FONT,
      fontSize: '15px',
      color: '#C05B49',
      fontStyle: '700',
    }).setOrigin(0.5);

    this.add.text(cx, cy + 108, 'Tryk på Spil for at komme ind', text(SIZE.tiny, INK_SOFT))
      .setOrigin(0.5)
      .setAlpha(0);
  }
}
