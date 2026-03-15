import { gameState } from '../state/GameState';

export function addStarCounter(scene: Phaser.Scene): Phaser.GameObjects.Container {
  const container = scene.add.container(scene.scale.width - 80, 40);

  const bg = scene.add.graphics();
  bg.fillStyle(0xFFFFFF, 0.85);
  bg.fillRoundedRect(-50, -18, 100, 36, 12);
  bg.lineStyle(2, 0xFFD700);
  bg.strokeRoundedRect(-50, -18, 100, 36, 12);
  container.add(bg);

  const starIcon = scene.add.text(-35, 0, '⭐', { fontSize: '20px' }).setOrigin(0.5);
  container.add(starIcon);

  const countText = scene.add.text(5, 0, `${gameState.stars}`, {
    fontFamily: 'Arial, sans-serif',
    fontSize: '20px',
    color: '#333333',
    fontStyle: 'bold',
  }).setOrigin(0.5);
  container.add(countText);

  // Listen for star changes
  scene.events.on('starsChanged', (newCount: number) => {
    countText.setText(`${newCount}`);
    scene.tweens.add({
      targets: container,
      scale: 1.2,
      duration: 150,
      yoyo: true,
    });
  });

  container.setScrollFactor(0);
  container.setDepth(1000);

  return container;
}
