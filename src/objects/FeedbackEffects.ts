import { COLORS } from '../config';
import { gameState } from '../state/GameState';

export function showStarBurst(scene: Phaser.Scene, x: number, y: number, count: number = 1): void {
  gameState.addStars(count);

  for (let i = 0; i < 5; i++) {
    const star = scene.add.text(
      x + Phaser.Math.Between(-30, 30),
      y + Phaser.Math.Between(-20, 20),
      '⭐',
      { fontSize: '28px' }
    ).setOrigin(0.5);

    scene.tweens.add({
      targets: star,
      y: star.y - 80,
      alpha: 0,
      scale: 1.5,
      duration: 800,
      delay: i * 100,
      ease: 'Power2',
      onComplete: () => star.destroy(),
    });
  }

  // Update star counter if it exists
  scene.events.emit('starsChanged', gameState.stars);
}

export function showHearts(scene: Phaser.Scene, x: number, y: number): void {
  for (let i = 0; i < 3; i++) {
    const heart = scene.add.text(
      x + Phaser.Math.Between(-20, 20),
      y,
      '❤️',
      { fontSize: '24px' }
    ).setOrigin(0.5);

    scene.tweens.add({
      targets: heart,
      y: heart.y - 60,
      alpha: 0,
      scale: 1.3,
      duration: 700,
      delay: i * 150,
      ease: 'Power2',
      onComplete: () => heart.destroy(),
    });
  }
}

export function showSparkle(scene: Phaser.Scene, x: number, y: number, width: number = 100, height: number = 100): void {
  const sparkles = ['✨', '💫', '⭐'];
  for (let i = 0; i < 8; i++) {
    const sparkle = scene.add.text(
      x + Phaser.Math.Between(-width / 2, width / 2),
      y + Phaser.Math.Between(-height / 2, height / 2),
      Phaser.Utils.Array.GetRandom(sparkles),
      { fontSize: '20px' }
    ).setOrigin(0.5).setAlpha(0);

    scene.tweens.add({
      targets: sparkle,
      alpha: 1,
      scale: { from: 0.3, to: 1.2 },
      duration: 400,
      delay: i * 80,
      yoyo: true,
      onComplete: () => sparkle.destroy(),
    });
  }
}

export function showSplash(scene: Phaser.Scene, x: number, y: number): void {
  for (let i = 0; i < 6; i++) {
    const drop = scene.add.graphics();
    drop.fillStyle(COLORS.waterLight, 0.8);
    drop.fillCircle(0, 0, Phaser.Math.Between(3, 8));
    drop.setPosition(x, y);

    const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
    const distance = Phaser.Math.Between(30, 60);

    scene.tweens.add({
      targets: drop,
      x: x + Math.cos(angle) * distance,
      y: y + Math.sin(angle) * distance - 20,
      alpha: 0,
      duration: 500,
      ease: 'Power2',
      onComplete: () => drop.destroy(),
    });
  }

  // Splash text
  const splash = scene.add.text(x, y - 20, '💦', { fontSize: '32px' }).setOrigin(0.5);
  scene.tweens.add({
    targets: splash,
    y: y - 60,
    alpha: 0,
    scale: 1.5,
    duration: 600,
    onComplete: () => splash.destroy(),
  });
}

export function showCheckmark(scene: Phaser.Scene, x: number, y: number): void {
  const check = scene.add.text(x, y, '✅', { fontSize: '36px' }).setOrigin(0.5).setScale(0);

  scene.tweens.add({
    targets: check,
    scale: 1,
    duration: 300,
    ease: 'Back.easeOut',
    onComplete: () => {
      scene.tweens.add({
        targets: check,
        alpha: 0,
        y: y - 40,
        delay: 600,
        duration: 400,
        onComplete: () => check.destroy(),
      });
    },
  });
}
