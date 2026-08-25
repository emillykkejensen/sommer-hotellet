import Phaser from 'phaser';
import { COLORS, DEPTH, FONT, INK, INK_SOFT, SIZE, text } from '../config';
import { button, drawCloud, drawFlower, drawSun, gradientBand, shadow } from '../helpers/Draw';
import { audio } from '../helpers/Audio';
import { canExit, exitApp } from '../helpers/Native';
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

    this.drawHotel(width / 2, height * 0.52);

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


    for (let i = 0; i < 9; i++) {
      drawFlower(
        this,
        Phaser.Math.Between(40, width - 40),
        Phaser.Math.Between(height * 0.76, height * 0.95),
        Phaser.Utils.Array.GetRandom([COLORS.pink, COLORS.yellow, COLORS.purple, COLORS.white]),
        0.62
      );
    }

    button(this, width / 2, height * 0.82, 'Spil', COLORS.green,
      () => transition(this, 'HotelMapScene', 280), 234, 62, SIZE.title);

    // There was no way out of the game at all: a browser tab has no back, and the Android
    // build runs fullscreen with the system bars hidden.
    button(this, width / 2, height * 0.93, 'Afslut', COLORS.stoneDeep,
      () => this.leave(), 168, 42, SIZE.label);

  }

  /**
   * Leaving the game.
   *
   * On Android this closes the app, which is the only way out of a fullscreen, immersive
   * WebView. A browser will not let a page close a tab it did not open, so there the
   * button says goodbye and stops the music instead of silently doing nothing.
   */
  private leave(): void {
    if (canExit()) {
      exitApp();
      return;
    }

    audio.stopMusic();
    this.showFarewell();
  }

  private showFarewell(): void {
    const { width, height } = this.scale;

    const scrim = this.add.rectangle(0, 0, width, height, 0x2A2118, 0.55)
      .setOrigin(0)
      .setDepth(DEPTH.chrome)
      .setInteractive();

    const pw = 430;
    const ph = 210;
    const panel = this.add.container(width / 2, height / 2).setDepth(DEPTH.chrome + 10);

    const g = this.add.graphics();
    shadow(g, -pw / 2, -ph / 2, pw, ph, 24, 8, 0.28);
    g.fillStyle(COLORS.white);
    g.fillRoundedRect(-pw / 2, -ph / 2, pw, ph, 24);
    panel.add(g);

    panel.add(this.add.text(0, -58, 'Tak for i dag!', text(SIZE.title, INK, 'bold')).setOrigin(0.5));
    panel.add(this.add.text(0, -14, 'Du kan lukke fanen nu.', {
      ...text(SIZE.body, INK_SOFT, 'semibold'),
      wordWrap: { width: pw - 60 },
      align: 'center',
    }).setOrigin(0.5));

    const back = button(this, 0, 52, 'Spil videre', COLORS.green, () => {
      scrim.destroy();
      panel.destroy();
      audio.syncMusic();
    }, 200, 48, SIZE.body);
    panel.add(back);
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
