import { COLORS } from '../config';
import { drawSun, drawCloud, drawTree, drawFlower } from '../helpers/DrawUtils';
import { addStarCounter } from '../ui/StarCounter';

export class HotelMapScene extends Phaser.Scene {
  constructor() {
    super({ key: 'HotelMapScene' });
  }

  create(): void {
    const { width, height } = this.scale;

    this.cameras.main.fadeIn(300);
    this.cameras.main.setBackgroundColor(COLORS.sky);

    // Sun and clouds
    drawSun(this, width - 80, 65, 30);
    const c1 = drawCloud(this, 120, 50, 0.8);
    this.tweens.add({ targets: c1, x: '+=100', duration: 10000, yoyo: true, repeat: -1 });

    // Ground
    const ground = this.add.graphics();
    ground.fillStyle(COLORS.grass);
    ground.fillRect(0, height * 0.55, width, height * 0.45);

    // Path
    ground.fillStyle(COLORS.sand);
    ground.fillRect(width / 2 - 25, height * 0.55, 50, height * 0.45);

    // Hotel building in the background
    this.drawHotelBuilding(width / 2, height * 0.32);

    // Trees
    drawTree(this, 60, height * 0.58, 0.8);
    drawTree(this, width - 50, height * 0.56, 0.9);

    // Flowers
    drawFlower(this, 120, height * 0.68, COLORS.pink, 0.8);
    drawFlower(this, width - 120, height * 0.7, COLORS.yellow, 0.8);

    // Clickable areas (buttons over the hotel)
    this.createAreaButton(width / 2, height * 0.42, '🛎️ Lobby', 'LobbyScene', COLORS.orange, 140);
    this.createAreaButton(width / 2 - 170, height * 0.28, '🛏️ Værelser', 'RoomScene', COLORS.purple, 130);
    this.createAreaButton(width / 2 + 170, height * 0.28, '🍳 Køkken', 'KitchenScene', COLORS.red, 130);
    this.createAreaButton(width / 2 - 140, height * 0.7, '🏊 Pool', 'PoolScene', COLORS.water, 120);
    this.createAreaButton(width / 2 + 140, height * 0.7, '🌻 Have', 'GardenScene', COLORS.green, 120);

    // Title at top
    this.add.text(width / 2, 22, 'Sommer Hotellet', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '28px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      stroke: '#CC4444',
      strokeThickness: 3,
    }).setOrigin(0.5);

    addStarCounter(this);
  }

  private drawHotelBuilding(cx: number, cy: number): void {
    const g = this.add.graphics();

    // Main building shadow
    g.fillStyle(0x000000, 0.1);
    g.fillRect(cx - 148, cy - 78, 296, 178);

    // Main building
    g.fillStyle(COLORS.cream);
    g.fillRect(cx - 150, cy - 80, 300, 180);

    // Roof
    g.fillStyle(COLORS.roof);
    g.fillTriangle(cx - 170, cy - 80, cx + 170, cy - 80, cx, cy - 155);
    g.fillStyle(COLORS.roofDark);
    g.fillTriangle(cx - 170, cy - 80, cx, cy - 80, cx - 85, cy - 118);

    // Windows - 3 rows
    g.fillStyle(COLORS.window);
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 5; col++) {
        const wx = cx - 110 + col * 55;
        const wy = cy - 55 + row * 55;
        g.fillRect(wx - 12, wy - 12, 24, 20);
        g.lineStyle(1, COLORS.white);
        g.strokeRect(wx - 12, wy - 12, 24, 20);
      }
    }

    // Door
    g.fillStyle(COLORS.door);
    g.fillRoundedRect(cx - 20, cy + 50, 40, 50, { tl: 10, tr: 10, bl: 0, br: 0 });
    g.fillStyle(COLORS.sunYellow);
    g.fillCircle(cx + 10, cy + 75, 3);

    // Sign
    g.fillStyle(COLORS.white);
    g.fillRoundedRect(cx - 55, cy - 135, 110, 28, 6);
    this.add.text(cx, cy - 121, '☀️ HOTEL ☀️', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      color: '#CC4444',
      fontStyle: 'bold',
    }).setOrigin(0.5);
  }

  private createAreaButton(
    x: number, y: number, label: string,
    targetScene: string, color: number, btnWidth: number = 140
  ): void {
    const container = this.add.container(x, y);

    const bg = this.add.graphics();
    bg.fillStyle(color, 0.9);
    bg.fillRoundedRect(-btnWidth / 2, -22, btnWidth, 44, 14);
    bg.lineStyle(3, 0xFFFFFF, 0.5);
    bg.strokeRoundedRect(-btnWidth / 2, -22, btnWidth, 44, 14);
    container.add(bg);

    const text = this.add.text(0, 0, label, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(text);

    container.setSize(btnWidth, 44);
    container.setInteractive({ useHandCursor: true });

    // Gentle float animation
    this.tweens.add({
      targets: container,
      y: y - 3,
      duration: 1500 + Math.random() * 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    container.on('pointerdown', () => {
      this.tweens.add({
        targets: container,
        scale: 0.9,
        duration: 100,
        yoyo: true,
        onComplete: () => {
          this.cameras.main.fadeOut(250, 0, 0, 0);
          this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start(targetScene);
          });
        },
      });
    });
  }
}
