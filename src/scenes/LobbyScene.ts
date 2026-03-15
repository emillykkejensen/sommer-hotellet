import { COLORS } from '../config';
import { gameState } from '../state/GameState';
import { drawPerson } from '../helpers/DrawUtils';
import { showStarBurst, showHearts } from '../objects/FeedbackEffects';
import { addBackButton } from '../ui/BackButton';
import { addStarCounter } from '../ui/StarCounter';

export class LobbyScene extends Phaser.Scene {
  private guestContainers: Phaser.GameObjects.Container[] = [];

  constructor() {
    super({ key: 'LobbyScene' });
  }

  create(): void {
    const { width, height } = this.scale;

    this.cameras.main.fadeIn(300);
    this.guestContainers = [];

    // Floor
    this.add.graphics()
      .fillStyle(COLORS.wood)
      .fillRect(0, height * 0.7, width, height * 0.3);

    // Floor pattern
    const floorPattern = this.add.graphics();
    floorPattern.fillStyle(COLORS.woodLight, 0.3);
    for (let i = 0; i < width; i += 80) {
      floorPattern.fillRect(i, height * 0.7, 40, height * 0.3);
    }

    // Wall
    this.add.graphics()
      .fillStyle(COLORS.cream)
      .fillRect(0, 0, width, height * 0.7);

    // Wall decoration - striped wallpaper
    const wallDeco = this.add.graphics();
    wallDeco.lineStyle(1, COLORS.orange, 0.1);
    for (let i = 0; i < width; i += 30) {
      wallDeco.lineBetween(i, 0, i, height * 0.7);
    }

    // Reception desk
    this.drawReceptionDesk(width / 2, height * 0.65);

    // Key board on wall
    this.drawKeyBoard(width - 120, height * 0.35);

    // Bell on desk
    this.createBell(width / 2, height * 0.55);

    // Show waiting guests
    this.showWaitingGuests();

    // Welcome sign
    this.add.text(width / 2, 40, '🛎️ Velkommen til Lobbyen!', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '26px',
      color: '#8B4513',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Instructions
    this.add.text(width / 2, height * 0.82, 'Tryk på klokken for at kalde en ny gæst!', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '16px',
      color: '#FFFFFF',
      fontStyle: 'italic',
    }).setOrigin(0.5);

    addBackButton(this);
    addStarCounter(this);
  }

  private drawReceptionDesk(cx: number, cy: number): void {
    const g = this.add.graphics();

    // Desk front
    g.fillStyle(COLORS.wood);
    g.fillRoundedRect(cx - 150, cy, 300, 60, { tl: 10, tr: 10, bl: 0, br: 0 });

    // Desk top
    g.fillStyle(COLORS.woodLight);
    g.fillRect(cx - 155, cy - 5, 310, 12);

    // "Reception" sign on desk
    g.fillStyle(COLORS.white);
    g.fillRoundedRect(cx - 55, cy + 15, 110, 28, 6);
    this.add.text(cx, cy + 29, 'RECEPTION', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      color: '#8B4513',
      fontStyle: 'bold',
    }).setOrigin(0.5);
  }

  private drawKeyBoard(cx: number, cy: number): void {
    const g = this.add.graphics();

    // Board
    g.fillStyle(COLORS.wood);
    g.fillRoundedRect(cx - 50, cy - 40, 100, 80, 8);

    // Key hooks
    for (let i = 0; i < 3; i++) {
      const kx = cx - 25 + i * 25;
      const ky = cy - 15;

      // Hook
      g.lineStyle(2, COLORS.grey);
      g.lineBetween(kx, ky - 10, kx, ky);

      const room = gameState.rooms[i];
      if (room.guestId === null) {
        // Key is here (room is empty)
        g.fillStyle(COLORS.sunYellow);
        g.fillCircle(kx, ky + 5, 8);
        g.fillRect(kx - 2, ky + 5, 4, 12);

        this.add.text(kx, ky + 5, `${i + 1}`, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '10px',
          color: '#8B4513',
          fontStyle: 'bold',
        }).setOrigin(0.5);
      }
    }

    // Label
    this.add.text(cx, cy + 35, 'Nøgler', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      color: '#FFFFFF',
    }).setOrigin(0.5);
  }

  private createBell(x: number, y: number): void {
    const container = this.add.container(x, y);

    // Bell base
    const bell = this.add.graphics();
    bell.fillStyle(COLORS.sunYellow);
    bell.fillCircle(0, -8, 18);
    bell.fillStyle(0xDAA520);
    bell.fillRect(-12, -2, 24, 6);
    bell.fillStyle(COLORS.sunYellow);
    bell.fillCircle(0, -22, 5);
    container.add(bell);

    // "Ding" text (hidden initially)
    const dingText = this.add.text(0, -45, '🔔 Ding!', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      color: '#DAA520',
      fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);
    container.add(dingText);

    container.setSize(40, 35);
    container.setInteractive({ useHandCursor: true });

    container.on('pointerdown', () => {
      // Ring animation
      this.tweens.add({
        targets: container,
        angle: { from: -10, to: 10 },
        duration: 80,
        yoyo: true,
        repeat: 3,
        onComplete: () => {
          container.setAngle(0);
        },
      });

      // Ding text
      dingText.setAlpha(1);
      this.tweens.add({
        targets: dingText,
        y: dingText.y - 20,
        alpha: 0,
        duration: 600,
        onComplete: () => {
          dingText.y = -45;
        },
      });

      // Create a new guest
      this.spawnGuest();
    });
  }

  private spawnGuest(): void {
    const { width, height } = this.scale;
    const waitingGuests = gameState.getWaitingGuests();

    // Max 3 waiting guests at a time
    if (waitingGuests.length >= 3) return;

    const guest = gameState.createGuest();
    const guestX = 100 + waitingGuests.length * 90;
    const guestY = height * 0.6;

    // Guest walks in from the left
    const person = drawPerson(this, -50, guestY, guest.color);
    this.guestContainers.push(person);

    this.tweens.add({
      targets: person,
      x: guestX,
      duration: 800,
      ease: 'Power2',
      onComplete: () => {
        // Name label
        const nameLabel = this.add.text(guestX, guestY + 35, guest.name, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '11px',
          color: '#333333',
          fontStyle: 'bold',
          backgroundColor: '#FFFFFF',
          padding: { x: 4, y: 2 },
        }).setOrigin(0.5);

        // Speech bubble
        const bubble = this.add.text(guestX, guestY - 55, '💬 Hej!', {
          fontFamily: 'Arial, sans-serif',
          fontSize: '14px',
          color: '#333333',
          backgroundColor: '#FFFFFF',
          padding: { x: 6, y: 4 },
        }).setOrigin(0.5);

        this.tweens.add({
          targets: bubble,
          alpha: 0,
          delay: 1500,
          duration: 500,
          onComplete: () => bubble.destroy(),
        });

        // Make guest clickable to check in
        person.setSize(40, 60);
        person.setInteractive({ useHandCursor: true });
        person.on('pointerdown', () => {
          const roomNum = gameState.checkInGuest(guest.id);
          if (roomNum !== null) {
            showHearts(this, guestX, guestY - 40);
            showStarBurst(this, guestX, guestY - 60);

            // Guest leaves to room
            const checkInText = this.add.text(guestX, guestY - 55, `✅ Rum ${roomNum + 1}!`, {
              fontFamily: 'Arial, sans-serif',
              fontSize: '16px',
              color: '#27AE60',
              fontStyle: 'bold',
              backgroundColor: '#FFFFFF',
              padding: { x: 6, y: 4 },
            }).setOrigin(0.5);

            this.tweens.add({
              targets: [person, nameLabel, checkInText],
              x: width + 50,
              duration: 1000,
              delay: 800,
              ease: 'Power2',
              onComplete: () => {
                person.destroy();
                nameLabel.destroy();
                checkInText.destroy();
                this.guestContainers = this.guestContainers.filter(c => c !== person);
              },
            });
          } else {
            // No free rooms
            const noRoom = this.add.text(guestX, guestY - 55, '😅 Ingen ledige rum!', {
              fontFamily: 'Arial, sans-serif',
              fontSize: '14px',
              color: '#E74C3C',
              backgroundColor: '#FFFFFF',
              padding: { x: 6, y: 4 },
            }).setOrigin(0.5);

            this.tweens.add({
              targets: noRoom,
              alpha: 0,
              delay: 1500,
              duration: 500,
              onComplete: () => noRoom.destroy(),
            });
          }
        });
      },
    });
  }

  private showWaitingGuests(): void {
    const { height } = this.scale;
    const waiting = gameState.getWaitingGuests();

    waiting.forEach((guest, i) => {
      const guestX = 100 + i * 90;
      const guestY = height * 0.6;
      const person = drawPerson(this, guestX, guestY, guest.color);
      this.guestContainers.push(person);

      this.add.text(guestX, guestY + 35, guest.name, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '11px',
        color: '#333333',
        fontStyle: 'bold',
        backgroundColor: '#FFFFFF',
        padding: { x: 4, y: 2 },
      }).setOrigin(0.5);

      person.setSize(40, 60);
      person.setInteractive({ useHandCursor: true });
      person.on('pointerdown', () => {
        const roomNum = gameState.checkInGuest(guest.id);
        if (roomNum !== null) {
          showHearts(this, guestX, guestY - 40);
          showStarBurst(this, guestX, guestY - 60);

          const checkInText = this.add.text(guestX, guestY - 55, `✅ Rum ${roomNum + 1}!`, {
            fontFamily: 'Arial, sans-serif',
            fontSize: '16px',
            color: '#27AE60',
            fontStyle: 'bold',
            backgroundColor: '#FFFFFF',
            padding: { x: 6, y: 4 },
          }).setOrigin(0.5);

          this.tweens.add({
            targets: person,
            x: this.scale.width + 50,
            duration: 1000,
            delay: 800,
            ease: 'Power2',
            onComplete: () => {
              person.destroy();
              checkInText.destroy();
            },
          });
        }
      });
    });
  }
}
