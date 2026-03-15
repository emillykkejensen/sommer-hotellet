import { COLORS, ROOM_THEMES } from '../config';
import { gameState } from '../state/GameState';
import { showStarBurst, showCheckmark, showSparkle } from '../objects/FeedbackEffects';
import { addBackButton } from '../ui/BackButton';
import { addStarCounter } from '../ui/StarCounter';

export class RoomScene extends Phaser.Scene {
  private currentRoom: number = 0;

  constructor() {
    super({ key: 'RoomScene' });
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.fadeIn(300);

    // Room selector tabs at top
    this.createRoomTabs(width, height);

    // Draw the current room
    this.drawRoom();

    addBackButton(this);
    addStarCounter(this);
  }

  private createRoomTabs(width: number, _height: number): void {
    for (let i = 0; i < 3; i++) {
      const tabX = width / 2 - 120 + i * 120;
      const theme = ROOM_THEMES[i];
      const isActive = i === this.currentRoom;

      const tab = this.add.container(tabX, 35);

      const bg = this.add.graphics();
      bg.fillStyle(isActive ? theme.accent : COLORS.grey, isActive ? 1 : 0.5);
      bg.fillRoundedRect(-50, -16, 100, 32, 10);
      if (isActive) {
        bg.lineStyle(2, COLORS.white);
        bg.strokeRoundedRect(-50, -16, 100, 32, 10);
      }
      tab.add(bg);

      const label = this.add.text(0, 0, `🛏️ Rum ${i + 1}`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        color: '#FFFFFF',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      tab.add(label);

      if (!isActive) {
        tab.setSize(100, 32);
        tab.setInteractive({ useHandCursor: true });
        tab.on('pointerdown', () => {
          this.currentRoom = i;
          this.scene.restart();
        });
      }
    }
  }

  private drawRoom(): void {
    const { width, height } = this.scale;
    const theme = ROOM_THEMES[this.currentRoom];
    const room = gameState.rooms[this.currentRoom];

    // Floor
    this.add.graphics()
      .fillStyle(COLORS.wood)
      .fillRect(0, height * 0.7, width, height * 0.3);

    // Wall
    this.add.graphics()
      .fillStyle(theme.wall)
      .fillRect(0, 55, width, height * 0.65);

    // Window
    this.drawWindow(width - 130, height * 0.3, room.curtainsOpen);

    // Bed
    this.drawBed(width / 2 - 80, height * 0.55, theme, room.bedMade);

    // Flowers
    this.drawFlowerVase(130, height * 0.45, room.flowersPlaced);

    // Vacuum / clean floor
    this.drawVacuum(width - 100, height * 0.75, room.vacuumed);

    // Towels
    this.drawTowels(width / 2 + 130, height * 0.52, room.towelsFolded);

    // Guest info
    if (room.guestId !== null) {
      const guest = gameState.guests.find(g => g.id === room.guestId);
      if (guest) {
        this.add.text(width / 2, height - 30, `Gæst: ${guest.name}`, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '16px',
          color: '#FFFFFF',
          fontStyle: 'bold',
          backgroundColor: '#00000066',
          padding: { x: 8, y: 4 },
        }).setOrigin(0.5);
      }

      // Check out button
      const checkOutBtn = this.add.container(width - 90, height - 30);
      const coBg = this.add.graphics();
      coBg.fillStyle(COLORS.red, 0.8);
      coBg.fillRoundedRect(-60, -16, 120, 32, 10);
      checkOutBtn.add(coBg);
      checkOutBtn.add(this.add.text(0, 0, '👋 Tjek ud', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        color: '#FFFFFF',
        fontStyle: 'bold',
      }).setOrigin(0.5));
      checkOutBtn.setSize(120, 32);
      checkOutBtn.setInteractive({ useHandCursor: true });
      checkOutBtn.on('pointerdown', () => {
        gameState.checkOutGuest(this.currentRoom);
        this.scene.restart();
      });
    }

    // Room complete check
    if (gameState.isRoomClean(this.currentRoom)) {
      this.time.delayedCall(300, () => {
        showSparkle(this, width / 2, height / 2, width * 0.8, height * 0.5);
      });
    }

    // Room name
    this.add.text(width / 2, 70, theme.name, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '20px',
      color: '#555555',
      fontStyle: 'bold',
    }).setOrigin(0.5);
  }

  private drawWindow(x: number, y: number, isOpen: boolean): void {
    const container = this.add.container(x, y);

    // Window frame
    const frame = this.add.graphics();
    frame.fillStyle(COLORS.white);
    frame.fillRect(-45, -35, 90, 70);

    if (isOpen) {
      // Blue sky through window
      frame.fillStyle(COLORS.sky);
      frame.fillRect(-40, -30, 80, 60);
      // Sun
      frame.fillStyle(COLORS.sunYellow);
      frame.fillCircle(15, -10, 12);
    } else {
      // Curtains closed
      frame.fillStyle(COLORS.red, 0.7);
      frame.fillRect(-40, -30, 38, 60);
      frame.fillRect(2, -30, 38, 60);
      // Curtain lines
      frame.lineStyle(1, COLORS.roofDark, 0.3);
      for (let i = 0; i < 5; i++) {
        frame.lineBetween(-38 + i * 8, -30, -38 + i * 8, 30);
        frame.lineBetween(4 + i * 8, -30, 4 + i * 8, 30);
      }
    }
    container.add(frame);

    // Label
    const label = this.add.text(0, 45, isOpen ? '☀️ Åben' : '🪟 Åbn gardiner', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      color: '#555',
      fontStyle: 'bold',
      backgroundColor: '#FFFFFFCC',
      padding: { x: 4, y: 2 },
    }).setOrigin(0.5);
    container.add(label);

    if (!isOpen) {
      container.setSize(90, 80);
      container.setInteractive({ useHandCursor: true });
      container.on('pointerdown', () => {
        gameState.rooms[this.currentRoom].curtainsOpen = true;
        gameState.save();
        showStarBurst(this, x, y);
        showCheckmark(this, x, y);
        this.scene.restart();
      });
    }
  }

  private drawBed(x: number, y: number, theme: typeof ROOM_THEMES[0], isMade: boolean): void {
    const container = this.add.container(x, y);

    // Bed frame
    const bed = this.add.graphics();
    bed.fillStyle(COLORS.wood);
    bed.fillRoundedRect(-60, -15, 160, 50, 8);

    // Mattress
    bed.fillStyle(COLORS.white);
    bed.fillRect(-55, -10, 150, 35);

    if (isMade) {
      // Nice made bed with duvet
      bed.fillStyle(theme.bedColor);
      bed.fillRoundedRect(-55, -5, 150, 28, 5);
      // Pillow
      bed.fillStyle(COLORS.white);
      bed.fillRoundedRect(-50, -8, 35, 20, 8);
    } else {
      // Messy bed
      bed.fillStyle(theme.bedColor, 0.6);
      bed.fillRect(-45, 0, 60, 20);
      bed.fillRect(10, -5, 50, 25);
      // Messy pillow
      bed.fillStyle(COLORS.white, 0.7);
      bed.fillRoundedRect(-50, -5, 30, 18, 6);
    }
    container.add(bed);

    const label = this.add.text(20, 45, isMade ? '✅ Redt' : '🛏️ Red sengen', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      color: '#555',
      fontStyle: 'bold',
      backgroundColor: '#FFFFFFCC',
      padding: { x: 4, y: 2 },
    }).setOrigin(0.5);
    container.add(label);

    if (!isMade) {
      container.setSize(160, 60);
      container.setInteractive({ useHandCursor: true });
      container.on('pointerdown', () => {
        gameState.rooms[this.currentRoom].bedMade = true;
        gameState.save();
        showStarBurst(this, x + 20, y);
        showCheckmark(this, x + 20, y - 20);
        this.scene.restart();
      });
    }
  }

  private drawFlowerVase(x: number, y: number, hasFlowers: boolean): void {
    const container = this.add.container(x, y);

    // Table
    const table = this.add.graphics();
    table.fillStyle(COLORS.wood);
    table.fillRect(-20, 10, 40, 30);
    table.fillRect(-25, 8, 50, 6);
    container.add(table);

    // Vase
    const vase = this.add.graphics();
    vase.fillStyle(COLORS.purple, 0.8);
    vase.fillRoundedRect(-10, -15, 20, 25, 5);
    vase.fillRect(-6, -18, 12, 8);
    container.add(vase);

    if (hasFlowers) {
      const flowers = this.add.graphics();
      const flowerColors = [COLORS.pink, COLORS.yellow, COLORS.red];
      for (let i = 0; i < 3; i++) {
        const fx = -8 + i * 8;
        const fy = -30 - i * 5;
        // Stem
        flowers.lineStyle(2, COLORS.green);
        flowers.lineBetween(fx, -18, fx, fy);
        // Petals
        flowers.fillStyle(flowerColors[i]);
        flowers.fillCircle(fx, fy, 5);
        flowers.fillStyle(COLORS.yellow);
        flowers.fillCircle(fx, fy, 2);
      }
      container.add(flowers);
    }

    const label = this.add.text(0, 50, hasFlowers ? '✅ Blomster' : '🌸 Sæt blomster', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      color: '#555',
      fontStyle: 'bold',
      backgroundColor: '#FFFFFFCC',
      padding: { x: 4, y: 2 },
    }).setOrigin(0.5);
    container.add(label);

    if (!hasFlowers) {
      container.setSize(50, 70);
      container.setInteractive({ useHandCursor: true });
      container.on('pointerdown', () => {
        gameState.rooms[this.currentRoom].flowersPlaced = true;
        gameState.save();
        showStarBurst(this, x, y - 20);
        showCheckmark(this, x, y - 30);
        this.scene.restart();
      });
    }
  }

  private drawVacuum(x: number, y: number, isVacuumed: boolean): void {
    const container = this.add.container(x, y);

    if (!isVacuumed) {
      // Dirt spots on floor
      const dirt = this.add.graphics();
      dirt.fillStyle(COLORS.brown, 0.3);
      for (let i = 0; i < 6; i++) {
        dirt.fillCircle(
          Phaser.Math.Between(-60, 60),
          Phaser.Math.Between(-20, 20),
          Phaser.Math.Between(3, 8)
        );
      }
      container.add(dirt);

      // Vacuum cleaner icon
      const vacuum = this.add.graphics();
      vacuum.fillStyle(COLORS.red);
      vacuum.fillRoundedRect(-12, -25, 24, 20, 6);
      vacuum.fillStyle(COLORS.grey);
      vacuum.fillRect(-3, -5, 6, 25);
      vacuum.fillRoundedRect(-10, 15, 20, 10, 4);
      container.add(vacuum);
    }

    const label = this.add.text(0, 35, isVacuumed ? '✅ Støvsuget' : '🧹 Støvsug', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      color: isVacuumed ? '#555' : '#FFF',
      fontStyle: 'bold',
      backgroundColor: isVacuumed ? '#FFFFFFCC' : '#00000066',
      padding: { x: 4, y: 2 },
    }).setOrigin(0.5);
    container.add(label);

    if (!isVacuumed) {
      container.setSize(120, 60);
      container.setInteractive({ useHandCursor: true });
      container.on('pointerdown', () => {
        gameState.rooms[this.currentRoom].vacuumed = true;
        gameState.save();
        showStarBurst(this, x, y);
        showCheckmark(this, x, y - 20);
        this.scene.restart();
      });
    }
  }

  private drawTowels(x: number, y: number, isFolded: boolean): void {
    const container = this.add.container(x, y);

    const towel = this.add.graphics();
    if (isFolded) {
      // Neatly folded towels
      towel.fillStyle(COLORS.white);
      towel.fillRoundedRect(-20, -5, 40, 12, 3);
      towel.fillStyle(0xE8E8E8);
      towel.fillRoundedRect(-18, 8, 36, 10, 3);
      towel.lineStyle(1, COLORS.water, 0.5);
      towel.strokeRoundedRect(-20, -5, 40, 12, 3);
    } else {
      // Messy towels on floor
      towel.fillStyle(COLORS.white, 0.8);
      towel.fillRect(-25, -5, 30, 8);
      towel.setAngle(15);
      const towel2 = this.add.graphics();
      towel2.fillStyle(0xE8E8E8, 0.8);
      towel2.fillRect(x - 10, y + 5, 25, 8);
      towel2.setAngle(-10);
    }
    container.add(towel);

    const label = this.add.text(0, 30, isFolded ? '✅ Foldet' : '🧺 Fold håndklæder', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      color: '#555',
      fontStyle: 'bold',
      backgroundColor: '#FFFFFFCC',
      padding: { x: 4, y: 2 },
    }).setOrigin(0.5);
    container.add(label);

    if (!isFolded) {
      container.setSize(60, 40);
      container.setInteractive({ useHandCursor: true });
      container.on('pointerdown', () => {
        gameState.rooms[this.currentRoom].towelsFolded = true;
        gameState.save();
        showStarBurst(this, x, y);
        showCheckmark(this, x, y - 15);
        this.scene.restart();
      });
    }
  }
}
