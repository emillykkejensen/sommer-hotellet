import { COLORS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { drawSun, drawCloud, createButton } from '../helpers/DrawUtils';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create(): void {
    const { width, height } = this.scale;

    this.cameras.main.fadeIn(400);
    this.cameras.main.setBackgroundColor(COLORS.sky);

    // Sky gradient effect
    const skyGrad = this.add.graphics();
    skyGrad.fillGradientStyle(0x87CEEB, 0x87CEEB, 0xB0E0E6, 0xB0E0E6);
    skyGrad.fillRect(0, 0, width, height * 0.6);

    // Sun
    drawSun(this, width - 100, 80, 35);

    // Clouds
    const cloud1 = drawCloud(this, 150, 70, 1);
    this.tweens.add({ targets: cloud1, x: '+=200', duration: 15000, yoyo: true, repeat: -1 });
    const cloud2 = drawCloud(this, 500, 100, 0.7);
    this.tweens.add({ targets: cloud2, x: '-=150', duration: 12000, yoyo: true, repeat: -1 });

    // Ground
    const ground = this.add.graphics();
    ground.fillStyle(COLORS.grass);
    ground.fillRect(0, height * 0.65, width, height * 0.35);

    // Simple hotel building
    this.drawHotel(width / 2, height * 0.45);

    // Title
    const titleShadow = this.add.text(width / 2 + 3, height * 0.12 + 3, 'Sommer Hotellet', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '52px',
      color: '#993333',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const title = this.add.text(width / 2, height * 0.12, 'Sommer Hotellet', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '52px',
      color: '#CC4444',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(width / 2, height * 0.19, '☀️ Fordi der altid er sommer her! ☀️', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      color: '#FFFFFF',
    }).setOrigin(0.5);

    // Gentle title bounce
    this.tweens.add({
      targets: [title, titleShadow],
      y: '-=5',
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Play button
    createButton(this, width / 2, height * 0.85, '🏨  Spil!', COLORS.green, () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('HotelMapScene');
      });
    }, 220, 60);

    // Small flowers on the ground
    for (let i = 0; i < 8; i++) {
      const fx = Phaser.Math.Between(50, width - 50);
      const fy = Phaser.Math.Between(height * 0.72, height * 0.92);
      this.drawSmallFlower(fx, fy);
    }
  }

  private drawHotel(cx: number, cy: number): void {
    const g = this.add.graphics();

    // Main building
    g.fillStyle(COLORS.cream);
    g.fillRect(cx - 120, cy - 80, 240, 160);

    // Roof
    g.fillStyle(COLORS.roof);
    g.fillTriangle(cx - 140, cy - 80, cx + 140, cy - 80, cx, cy - 150);

    // Windows
    g.fillStyle(COLORS.window);
    const windowPositions = [
      [-70, -40], [-20, -40], [30, -40], [80, -40],
      [-70, 20], [-20, 20], [30, 20], [80, 20],
    ];
    for (const [wx, wy] of windowPositions) {
      g.fillRect(cx + wx - 15, cy + wy - 15, 30, 25);
      // Window frame
      g.lineStyle(2, COLORS.white);
      g.strokeRect(cx + wx - 15, cy + wy - 15, 30, 25);
      g.lineBetween(cx + wx, cy + wy - 15, cx + wx, cy + wy + 10);
    }

    // Door
    g.fillStyle(COLORS.door);
    g.fillRect(cx - 18, cy + 40, 36, 40);
    g.fillStyle(COLORS.sunYellow);
    g.fillCircle(cx + 10, cy + 60, 3);

    // Hotel sign
    g.fillStyle(COLORS.white);
    g.fillRoundedRect(cx - 50, cy - 120, 100, 25, 5);
    this.add.text(cx, cy - 108, 'HOTEL', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '16px',
      color: '#CC4444',
      fontStyle: 'bold',
    }).setOrigin(0.5);
  }

  private drawSmallFlower(x: number, y: number): void {
    const colors = [COLORS.pink, COLORS.red, COLORS.yellow, COLORS.purple, COLORS.orange];
    const color = Phaser.Utils.Array.GetRandom(colors);

    const g = this.add.graphics();
    // Stem
    g.lineStyle(2, COLORS.green);
    g.lineBetween(x, y, x, y - 12);
    // Petals
    g.fillStyle(color);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      g.fillCircle(x + Math.cos(a) * 4, y - 12 + Math.sin(a) * 4, 3);
    }
    g.fillStyle(COLORS.yellow);
    g.fillCircle(x, y - 12, 2);
  }
}
