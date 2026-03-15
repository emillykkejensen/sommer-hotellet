import { COLORS } from '../config';
import { gameState } from '../state/GameState';
import { showStarBurst, showSplash, showHearts } from '../objects/FeedbackEffects';
import { drawSun, drawPerson } from '../helpers/DrawUtils';
import { addBackButton } from '../ui/BackButton';
import { addStarCounter } from '../ui/StarCounter';

export class PoolScene extends Phaser.Scene {
  private towelStates: boolean[] = [false, false, false, false];
  private slideUsed: boolean = false;

  constructor() {
    super({ key: 'PoolScene' });
  }

  create(): void {
    const { width, height } = this.scale;

    this.cameras.main.fadeIn(300);
    this.towelStates = [false, false, false, false];
    this.slideUsed = false;

    // Sky
    this.cameras.main.setBackgroundColor(COLORS.sky);
    drawSun(this, width - 70, 60, 28);

    // Ground
    const ground = this.add.graphics();
    ground.fillStyle(COLORS.sand);
    ground.fillRect(0, height * 0.3, width, height * 0.7);

    // Title
    this.add.text(width / 2, 70, '🏊 Swimmingpoolen', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '24px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      stroke: '#3498DB',
      strokeThickness: 3,
    }).setOrigin(0.5);

    // Pool
    this.drawPool(width / 2, height * 0.52);

    // Loungers
    this.drawLoungers(width, height);

    // Water slide
    this.drawWaterSlide(width * 0.8, height * 0.35);

    // Drink bar
    this.drawDrinkBar(100, height * 0.85);

    // Guests in pool
    this.drawPoolGuests(width, height);

    addBackButton(this);
    addStarCounter(this);
  }

  private drawPool(cx: number, cy: number): void {
    const g = this.add.graphics();

    // Pool border
    g.fillStyle(COLORS.greyLight);
    g.fillRoundedRect(cx - 155, cy - 65, 310, 130, 20);

    // Pool water
    g.fillStyle(COLORS.water);
    g.fillRoundedRect(cx - 145, cy - 55, 290, 110, 15);

    // Water shimmer
    g.fillStyle(COLORS.waterLight, 0.4);
    g.fillEllipse(cx - 40, cy - 20, 80, 20);
    g.fillEllipse(cx + 50, cy + 10, 60, 15);

    // Make pool interactive (splash!)
    const poolZone = this.add.zone(cx, cy, 280, 100).setInteractive({ useHandCursor: true });
    poolZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      showSplash(this, pointer.x, pointer.y);
    });

    // Water wave animation
    const wave = this.add.graphics();
    let offset = 0;
    this.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => {
        wave.clear();
        wave.lineStyle(2, COLORS.waterLight, 0.3);
        wave.beginPath();
        wave.moveTo(cx - 140, cy);
        for (let x = cx - 140; x <= cx + 140; x += 10) {
          wave.lineTo(x, cy + Math.sin((x + offset) * 0.05) * 5);
        }
        wave.strokePath();
        offset += 15;
      },
    });
  }

  private drawLoungers(width: number, height: number): void {
    const positions = [
      { x: 80, y: height * 0.4 },
      { x: 80, y: height * 0.55 },
      { x: width - 80, y: height * 0.4 },
      { x: width - 80, y: height * 0.55 },
    ];

    positions.forEach((pos, i) => {
      const container = this.add.container(pos.x, pos.y);

      // Lounger
      const lounger = this.add.graphics();
      lounger.fillStyle(COLORS.wood);
      lounger.fillRect(-25, -5, 50, 20);
      lounger.fillRect(-20, -15, 10, 12);
      // Legs
      lounger.fillRect(-22, 15, 4, 8);
      lounger.fillRect(18, 15, 4, 8);
      container.add(lounger);

      if (this.towelStates[i]) {
        // Towel on lounger
        const towel = this.add.graphics();
        towel.fillStyle(i % 2 === 0 ? COLORS.pink : COLORS.water, 0.7);
        towel.fillRect(-22, -3, 44, 16);
        // Stripes
        towel.fillStyle(COLORS.white, 0.4);
        towel.fillRect(-22, 1, 44, 3);
        towel.fillRect(-22, 8, 44, 3);
        container.add(towel);

        container.add(this.add.text(0, 28, '✅', { fontSize: '16px' }).setOrigin(0.5));
      } else {
        const label = this.add.text(0, 28, '🏖️ Håndklæde', {
          fontFamily: 'Arial, sans-serif',
          fontSize: '10px',
          color: '#555',
          fontStyle: 'bold',
          backgroundColor: '#FFFFFFCC',
          padding: { x: 3, y: 2 },
        }).setOrigin(0.5);
        container.add(label);

        container.setSize(55, 35);
        container.setInteractive({ useHandCursor: true });
        container.on('pointerdown', () => {
          this.towelStates[i] = true;
          gameState.poolTowelsLaid++;
          gameState.save();
          showStarBurst(this, pos.x, pos.y);
          this.scene.restart();
        });
      }
    });
  }

  private drawWaterSlide(x: number, y: number): void {
    const container = this.add.container(x, y);

    // Slide structure
    const slide = this.add.graphics();
    // Ladder
    slide.fillStyle(COLORS.grey);
    slide.fillRect(-5, -40, 10, 80);
    slide.fillRect(-12, -35, 24, 5);
    slide.fillRect(-12, -20, 24, 5);
    slide.fillRect(-12, -5, 24, 5);

    // Slide
    slide.fillStyle(COLORS.red);
    slide.lineStyle(6, COLORS.red);
    slide.beginPath();
    slide.moveTo(0, -40);
    slide.lineTo(-60, 30);
    slide.strokePath();
    // Slide rails
    slide.lineStyle(3, COLORS.yellow);
    slide.beginPath();
    slide.moveTo(3, -40);
    slide.lineTo(-57, 30);
    slide.strokePath();
    slide.beginPath();
    slide.moveTo(-3, -40);
    slide.lineTo(-63, 30);
    slide.strokePath();
    container.add(slide);

    const label = this.add.text(-30, 45, '🎢 Rutsjebane!', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      color: '#E74C3C',
      fontStyle: 'bold',
      backgroundColor: '#FFFFFFCC',
      padding: { x: 4, y: 2 },
    }).setOrigin(0.5);
    container.add(label);

    container.setSize(80, 100);
    container.setInteractive({ useHandCursor: true });
    container.on('pointerdown', () => {
      if (this.slideUsed) return;
      this.slideUsed = true;

      // Animate a figure going down the slide
      const slider = this.add.text(x, y - 40, '😄', { fontSize: '24px' }).setOrigin(0.5);
      this.tweens.add({
        targets: slider,
        x: x - 60,
        y: y + 30,
        duration: 600,
        ease: 'Power2',
        onComplete: () => {
          showSplash(this, x - 60, y + 30);
          showStarBurst(this, x - 60, y + 10);

          const wee = this.add.text(x - 30, y - 20, 'Wheee! 🎉', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '18px',
            color: '#E74C3C',
            fontStyle: 'bold',
          }).setOrigin(0.5);

          this.tweens.add({
            targets: [slider, wee],
            alpha: 0,
            delay: 800,
            duration: 500,
            onComplete: () => {
              slider.destroy();
              wee.destroy();
              this.slideUsed = false;
            },
          });
        },
      });
    });
  }

  private drawDrinkBar(x: number, y: number): void {
    const g = this.add.graphics();

    // Bar counter
    g.fillStyle(COLORS.wood);
    g.fillRoundedRect(x - 50, y - 15, 100, 30, 8);

    // Drinks
    const drinks = ['🧃', '🍹', '🥤', '🍨'];
    drinks.forEach((drink, i) => {
      const dx = x - 30 + i * 22;
      const drinkText = this.add.text(dx, y - 25, drink, { fontSize: '20px' }).setOrigin(0.5);

      drinkText.setInteractive({ useHandCursor: true });
      drinkText.on('pointerdown', () => {
        showHearts(this, dx, y - 40);
        this.tweens.add({
          targets: drinkText,
          scale: 1.3,
          duration: 150,
          yoyo: true,
        });
      });
    });

    this.add.text(x, y + 22, '🍹 Drinks', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      color: '#555',
      fontStyle: 'bold',
    }).setOrigin(0.5);
  }

  private drawPoolGuests(width: number, height: number): void {
    const guests = gameState.getCheckedInGuests();
    const poolPositions = [
      { x: width / 2 - 60, y: height * 0.5 },
      { x: width / 2 + 30, y: height * 0.48 },
      { x: width / 2 - 20, y: height * 0.55 },
    ];

    guests.slice(0, 3).forEach((guest, i) => {
      const pos = poolPositions[i];
      // Just show head (swimming)
      const head = this.add.graphics();
      head.fillStyle(0xFFDBAC);
      head.fillCircle(pos.x, pos.y, 10);
      head.fillStyle(guest.color);
      head.fillRoundedRect(pos.x - 8, pos.y - 12, 16, 6, 3);
      // Eyes
      head.fillStyle(COLORS.black);
      head.fillCircle(pos.x - 3, pos.y - 2, 1.5);
      head.fillCircle(pos.x + 3, pos.y - 2, 1.5);
      // Smile
      head.lineStyle(1, COLORS.black);
      head.beginPath();
      head.arc(pos.x, pos.y + 2, 3, 0.2, Math.PI - 0.2, false);
      head.strokePath();

      // Bobbing animation
      this.tweens.add({
        targets: head,
        y: '-=3',
        duration: 1000 + i * 200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });
  }
}
