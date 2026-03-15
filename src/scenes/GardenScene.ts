import { COLORS } from '../config';
import { gameState } from '../state/GameState';
import { showStarBurst, showHearts, showSparkle } from '../objects/FeedbackEffects';
import { drawSun, drawCloud, drawTree, drawFlower } from '../helpers/DrawUtils';
import { addBackButton } from '../ui/BackButton';
import { addStarCounter } from '../ui/StarCounter';

export class GardenScene extends Phaser.Scene {
  private flowersWatered: boolean[] = [false, false, false, false, false];
  private sandcastleLevel: number = 0;
  private swingActive: boolean = false;

  constructor() {
    super({ key: 'GardenScene' });
  }

  create(): void {
    const { width, height } = this.scale;

    this.cameras.main.fadeIn(300);
    this.flowersWatered = [false, false, false, false, false];
    this.sandcastleLevel = 0;
    this.swingActive = false;

    // Sky
    this.cameras.main.setBackgroundColor(COLORS.sky);
    drawSun(this, width - 80, 60, 30);
    const cloud = drawCloud(this, 200, 55, 0.7);
    this.tweens.add({ targets: cloud, x: '+=80', duration: 8000, yoyo: true, repeat: -1 });

    // Ground
    this.add.graphics()
      .fillStyle(COLORS.grass)
      .fillRect(0, height * 0.45, width, height * 0.55);

    // Title
    this.add.text(width / 2, 70, '🌻 Haven & Legepladsen', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '24px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      stroke: '#27AE60',
      strokeThickness: 3,
    }).setOrigin(0.5);

    // Trees
    drawTree(this, 50, height * 0.48, 1);
    drawTree(this, width - 40, height * 0.46, 0.9);

    // Flower bed
    this.drawFlowerBed(width * 0.2, height * 0.55);

    // Sandbox with sandcastle
    this.drawSandbox(width * 0.5, height * 0.72);

    // Swing
    this.drawSwing(width * 0.78, height * 0.5);

    // Apple tree
    this.drawAppleTree(width - 130, height * 0.5);

    // Butterflies
    this.addButterflies(width, height);

    // Watering can
    this.drawWateringCan(width * 0.15, height * 0.75);

    addBackButton(this);
    addStarCounter(this);
  }

  private drawFlowerBed(x: number, y: number): void {
    // Flower bed soil
    const bed = this.add.graphics();
    bed.fillStyle(COLORS.brown, 0.6);
    bed.fillRoundedRect(x - 80, y - 10, 160, 40, 10);
    bed.lineStyle(2, COLORS.brown, 0.4);
    bed.strokeRoundedRect(x - 80, y - 10, 160, 40, 10);

    const flowerColors = [COLORS.pink, COLORS.red, COLORS.yellow, COLORS.purple, COLORS.orange];

    for (let i = 0; i < 5; i++) {
      const fx = x - 60 + i * 30;
      const fy = y;

      if (this.flowersWatered[i]) {
        // Bloomed flower
        drawFlower(this, fx, fy - 15, flowerColors[i], 1.2);
      } else {
        // Small seed/sprout
        const sprout = this.add.graphics();
        sprout.fillStyle(COLORS.green, 0.5);
        sprout.fillRect(fx - 1, fy - 5, 2, 8);
        sprout.fillCircle(fx, fy - 6, 3);

        // Label
        this.add.text(fx, fy + 15, '🌱', { fontSize: '14px' }).setOrigin(0.5);
      }
    }

    this.add.text(x, y + 35, this.flowersWatered.every(f => f) ? '✅ Alle blomster vandet!' : '💧 Vand blomsterne!', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      color: '#555',
      fontStyle: 'bold',
      backgroundColor: '#FFFFFFCC',
      padding: { x: 4, y: 2 },
    }).setOrigin(0.5);
  }

  private drawWateringCan(x: number, y: number): void {
    const container = this.add.container(x, y);

    const can = this.add.graphics();
    // Can body
    can.fillStyle(COLORS.water);
    can.fillRoundedRect(-15, -10, 30, 25, 5);
    // Spout
    can.lineStyle(3, COLORS.water);
    can.lineBetween(15, -5, 25, -15);
    // Handle
    can.lineStyle(3, COLORS.water);
    can.beginPath();
    can.arc(0, -15, 12, -Math.PI, 0, false);
    can.strokePath();
    container.add(can);

    container.add(this.add.text(0, 22, '💧 Vandkande', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '11px',
      color: '#3498DB',
      fontStyle: 'bold',
    }).setOrigin(0.5));

    container.setSize(50, 40);
    container.setInteractive({ useHandCursor: true });
    container.on('pointerdown', () => {
      // Water the next unwatered flower
      const nextFlower = this.flowersWatered.findIndex(f => !f);
      if (nextFlower !== -1) {
        this.flowersWatered[nextFlower] = true;
        gameState.flowersWatered++;
        gameState.save();

        const fx = this.scale.width * 0.2 - 60 + nextFlower * 30;
        const fy = this.scale.height * 0.55;

        // Water drops animation
        for (let i = 0; i < 4; i++) {
          const drop = this.add.text(
            fx + Phaser.Math.Between(-10, 10),
            fy - 20,
            '💧',
            { fontSize: '14px' }
          ).setOrigin(0.5);

          this.tweens.add({
            targets: drop,
            y: fy,
            alpha: 0,
            duration: 400,
            delay: i * 100,
            onComplete: () => drop.destroy(),
          });
        }

        showStarBurst(this, fx, fy - 20);

        // Refresh scene to show bloomed flower
        this.time.delayedCall(600, () => this.scene.restart());
      }
    });
  }

  private drawSandbox(x: number, y: number): void {
    // Sandbox frame
    const box = this.add.graphics();
    box.fillStyle(COLORS.sand);
    box.fillRoundedRect(x - 60, y - 30, 120, 60, 8);
    box.lineStyle(3, COLORS.wood);
    box.strokeRoundedRect(x - 60, y - 30, 120, 60, 8);

    // Sandcastle (builds up with taps)
    if (this.sandcastleLevel > 0) {
      const castle = this.add.graphics();
      castle.fillStyle(COLORS.sand);

      if (this.sandcastleLevel >= 1) {
        // Base
        castle.fillRect(x - 25, y - 5, 50, 25);
      }
      if (this.sandcastleLevel >= 2) {
        // Middle
        castle.fillRect(x - 18, y - 20, 36, 18);
      }
      if (this.sandcastleLevel >= 3) {
        // Top tower
        castle.fillRect(x - 10, y - 35, 20, 18);
        // Flag
        castle.lineStyle(2, COLORS.red);
        castle.lineBetween(x, y - 35, x, y - 48);
        castle.fillStyle(COLORS.red);
        castle.fillTriangle(x, y - 48, x, y - 40, x + 10, y - 44);

        // Windows
        castle.fillStyle(COLORS.brown, 0.5);
        castle.fillRect(x - 4, y - 30, 8, 8);
        castle.fillRect(x - 14, y - 14, 6, 6);
        castle.fillRect(x + 8, y - 14, 6, 6);
      }
    }

    const label = this.add.text(x, y + 38, this.sandcastleLevel >= 3 ? '🏰 Sandslot færdigt!' : '🏖️ Byg sandslot', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      color: '#555',
      fontStyle: 'bold',
      backgroundColor: '#FFFFFFCC',
      padding: { x: 4, y: 2 },
    }).setOrigin(0.5);

    if (this.sandcastleLevel < 3) {
      const zone = this.add.zone(x, y, 120, 60).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => {
        this.sandcastleLevel++;
        showStarBurst(this, x, y - 20);

        if (this.sandcastleLevel >= 3) {
          showSparkle(this, x, y - 20, 80, 60);
          showHearts(this, x, y - 40);
        }

        this.scene.restart();
      });
    }
  }

  private drawSwing(x: number, y: number): void {
    const container = this.add.container(x, y);

    // Swing frame (A-frame)
    const frame = this.add.graphics();
    frame.lineStyle(4, COLORS.wood);
    // Left pole
    frame.lineBetween(-30, -60, -20, 20);
    // Right pole
    frame.lineBetween(30, -60, 20, 20);
    // Top bar
    frame.lineBetween(-30, -60, 30, -60);
    container.add(frame);

    // Swing seat and ropes
    const swing = this.add.container(0, 0);
    const ropes = this.add.graphics();
    ropes.lineStyle(2, COLORS.brown);
    ropes.lineBetween(-10, -60, -10, -10);
    ropes.lineBetween(10, -60, 10, -10);
    swing.add(ropes);

    // Seat
    const seat = this.add.graphics();
    seat.fillStyle(COLORS.red);
    seat.fillRect(-15, -12, 30, 6);
    swing.add(seat);

    // Kid emoji on swing
    const kid = this.add.text(0, -22, '👧', { fontSize: '18px' }).setOrigin(0.5);
    swing.add(kid);

    container.add(swing);

    const label = this.add.text(0, 30, '🎪 Gynge!', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      color: '#555',
      fontStyle: 'bold',
      backgroundColor: '#FFFFFFCC',
      padding: { x: 4, y: 2 },
    }).setOrigin(0.5);
    container.add(label);

    container.setSize(60, 90);
    container.setInteractive({ useHandCursor: true });
    container.on('pointerdown', () => {
      if (this.swingActive) return;
      this.swingActive = true;

      // Swinging animation
      this.tweens.add({
        targets: swing,
        angle: { from: -25, to: 25 },
        duration: 600,
        yoyo: true,
        repeat: 4,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          swing.setAngle(0);
          this.swingActive = false;
          showHearts(this, x, y - 40);
          showStarBurst(this, x, y - 50);
        },
      });

      // Happy sounds text
      const sounds = ['Whee!', 'Højere!', 'Juhuu!'];
      sounds.forEach((s, i) => {
        this.time.delayedCall(i * 700, () => {
          const txt = this.add.text(x + Phaser.Math.Between(-30, 30), y - 70, s, {
            fontFamily: 'Arial, sans-serif',
            fontSize: '14px',
            color: '#E74C3C',
            fontStyle: 'bold',
          }).setOrigin(0.5);
          this.tweens.add({
            targets: txt,
            y: txt.y - 30,
            alpha: 0,
            duration: 600,
            onComplete: () => txt.destroy(),
          });
        });
      });
    });
  }

  private drawAppleTree(x: number, y: number): void {
    // Tree
    const trunk = this.add.graphics();
    trunk.fillStyle(COLORS.brown);
    trunk.fillRect(x - 10, y - 10, 20, 50);
    const leaves = this.add.graphics();
    leaves.fillStyle(COLORS.green);
    leaves.fillCircle(x, y - 30, 35);
    leaves.fillCircle(x - 20, y - 15, 25);
    leaves.fillCircle(x + 20, y - 15, 25);

    // Apples
    const applePositions = [
      { x: x - 15, y: y - 40 },
      { x: x + 10, y: y - 35 },
      { x: x - 5, y: y - 20 },
      { x: x + 20, y: y - 18 },
      { x: x - 20, y: y - 25 },
    ];

    let applesLeft = 5;

    applePositions.forEach((pos) => {
      const apple = this.add.text(pos.x, pos.y, '🍎', { fontSize: '16px' }).setOrigin(0.5);
      apple.setInteractive({ useHandCursor: true });
      apple.on('pointerdown', () => {
        // Apple falls
        this.tweens.add({
          targets: apple,
          y: y + 40,
          angle: 180,
          duration: 400,
          ease: 'Bounce.easeOut',
          onComplete: () => {
            apple.destroy();
            applesLeft--;
            showStarBurst(this, pos.x, pos.y);
            if (applesLeft === 0) {
              showSparkle(this, x, y - 20, 80, 80);
              this.add.text(x, y + 55, '🧺 Alle æbler plukket!', {
                fontFamily: 'Arial, sans-serif',
                fontSize: '12px',
                color: '#27AE60',
                fontStyle: 'bold',
                backgroundColor: '#FFFFFFCC',
                padding: { x: 4, y: 2 },
              }).setOrigin(0.5);
            }
          },
        });
      });
    });

    this.add.text(x, y + 55, '🍎 Pluk æbler', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      color: '#555',
      fontStyle: 'bold',
      backgroundColor: '#FFFFFFCC',
      padding: { x: 4, y: 2 },
    }).setOrigin(0.5);
  }

  private addButterflies(width: number, height: number): void {
    const butterflies = ['🦋', '🦋', '🦋'];
    butterflies.forEach((_, i) => {
      const bfly = this.add.text(
        Phaser.Math.Between(100, width - 100),
        Phaser.Math.Between(height * 0.3, height * 0.5),
        '🦋',
        { fontSize: '18px' }
      ).setOrigin(0.5);

      // Random floating path
      this.tweens.add({
        targets: bfly,
        x: Phaser.Math.Between(50, width - 50),
        y: Phaser.Math.Between(height * 0.25, height * 0.55),
        duration: 3000 + i * 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      // Scale wiggle for wing flapping
      this.tweens.add({
        targets: bfly,
        scaleX: { from: 1, to: -1 },
        duration: 300,
        yoyo: true,
        repeat: -1,
      });
    });
  }
}
