export function addBackButton(scene: Phaser.Scene, targetScene: string = 'HotelMapScene'): Phaser.GameObjects.Container {
  const container = scene.add.container(50, 40);

  const bg = scene.add.graphics();
  bg.fillStyle(0xFFFFFF, 0.85);
  bg.fillRoundedRect(-35, -20, 70, 40, 12);
  bg.lineStyle(2, 0xCCCCCC);
  bg.strokeRoundedRect(-35, -20, 70, 40, 12);
  container.add(bg);

  const arrow = scene.add.text(0, 0, '← Tilbage', {
    fontFamily: 'Arial, sans-serif',
    fontSize: '14px',
    color: '#555555',
    fontStyle: 'bold',
  }).setOrigin(0.5);
  container.add(arrow);

  container.setSize(70, 40);
  container.setInteractive({ useHandCursor: true });
  container.on('pointerdown', () => {
    scene.cameras.main.fadeOut(200, 0, 0, 0);
    scene.cameras.main.once('camerafadeoutcomplete', () => {
      scene.scene.start(targetScene);
    });
  });

  container.setScrollFactor(0);
  container.setDepth(1000);

  return container;
}
