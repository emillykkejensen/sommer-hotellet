import { COLORS } from '../config';

export function drawRoundedRect(
  graphics: Phaser.GameObjects.Graphics,
  x: number, y: number, w: number, h: number,
  color: number, radius: number = 10
): void {
  graphics.fillStyle(color);
  graphics.fillRoundedRect(x, y, w, h, radius);
}

export function drawPerson(
  scene: Phaser.Scene,
  x: number, y: number,
  bodyColor: number,
  scale: number = 1
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);

  // Body
  const body = scene.add.graphics();
  body.fillStyle(bodyColor);
  body.fillRoundedRect(-15 * scale, -10 * scale, 30 * scale, 40 * scale, 8 * scale);
  container.add(body);

  // Head
  const head = scene.add.graphics();
  head.fillStyle(0xFFDBAC); // skin tone
  head.fillCircle(0, -25 * scale, 15 * scale);
  container.add(head);

  // Eyes
  const leftEye = scene.add.graphics();
  leftEye.fillStyle(COLORS.black);
  leftEye.fillCircle(-5 * scale, -28 * scale, 2.5 * scale);
  container.add(leftEye);

  const rightEye = scene.add.graphics();
  rightEye.fillStyle(COLORS.black);
  rightEye.fillCircle(5 * scale, -28 * scale, 2.5 * scale);
  container.add(rightEye);

  // Smile
  const smile = scene.add.graphics();
  smile.lineStyle(2 * scale, COLORS.black);
  smile.beginPath();
  smile.arc(0, -22 * scale, 6 * scale, 0.2, Math.PI - 0.2, false);
  smile.strokePath();
  container.add(smile);

  return container;
}

export function drawSun(
  scene: Phaser.Scene,
  x: number, y: number, radius: number = 40
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);

  // Rays
  const rays = scene.add.graphics();
  rays.lineStyle(4, COLORS.sunYellow, 0.6);
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const innerR = radius + 5;
    const outerR = radius + 20;
    rays.lineBetween(
      Math.cos(angle) * innerR, Math.sin(angle) * innerR,
      Math.cos(angle) * outerR, Math.sin(angle) * outerR
    );
  }
  container.add(rays);

  // Sun body
  const sun = scene.add.graphics();
  sun.fillStyle(COLORS.sunYellow);
  sun.fillCircle(0, 0, radius);
  container.add(sun);

  // Happy face
  const face = scene.add.graphics();
  face.fillStyle(COLORS.black);
  face.fillCircle(-10, -8, 4);
  face.fillCircle(10, -8, 4);
  face.lineStyle(3, COLORS.black);
  face.beginPath();
  face.arc(0, 2, 12, 0.2, Math.PI - 0.2, false);
  face.strokePath();
  container.add(face);

  // Animate rays rotation
  scene.tweens.add({
    targets: rays,
    angle: 360,
    duration: 20000,
    repeat: -1,
  });

  return container;
}

export function drawCloud(
  scene: Phaser.Scene,
  x: number, y: number, scale: number = 1
): Phaser.GameObjects.Graphics {
  const cloud = scene.add.graphics();
  cloud.fillStyle(COLORS.white, 0.9);
  cloud.fillCircle(x, y, 25 * scale);
  cloud.fillCircle(x - 20 * scale, y + 5 * scale, 18 * scale);
  cloud.fillCircle(x + 20 * scale, y + 5 * scale, 20 * scale);
  cloud.fillCircle(x + 10 * scale, y - 10 * scale, 18 * scale);
  return cloud;
}

export function drawTree(
  scene: Phaser.Scene,
  x: number, y: number, scale: number = 1
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);

  const trunk = scene.add.graphics();
  trunk.fillStyle(COLORS.brown);
  trunk.fillRect(-8 * scale, -20 * scale, 16 * scale, 40 * scale);
  container.add(trunk);

  const leaves = scene.add.graphics();
  leaves.fillStyle(COLORS.green);
  leaves.fillCircle(0, -40 * scale, 30 * scale);
  leaves.fillCircle(-15 * scale, -25 * scale, 22 * scale);
  leaves.fillCircle(15 * scale, -25 * scale, 22 * scale);
  container.add(leaves);

  return container;
}

export function drawFlower(
  scene: Phaser.Scene,
  x: number, y: number,
  petalColor: number = COLORS.pink,
  scale: number = 1
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);

  // Stem
  const stem = scene.add.graphics();
  stem.lineStyle(3 * scale, COLORS.green);
  stem.lineBetween(0, 0, 0, 20 * scale);
  container.add(stem);

  // Petals
  const petals = scene.add.graphics();
  petals.fillStyle(petalColor);
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    petals.fillCircle(
      Math.cos(angle) * 6 * scale,
      Math.sin(angle) * 6 * scale - 2 * scale,
      5 * scale
    );
  }
  container.add(petals);

  // Center
  const center = scene.add.graphics();
  center.fillStyle(COLORS.yellow);
  center.fillCircle(0, -2 * scale, 4 * scale);
  container.add(center);

  return container;
}

export function createButton(
  scene: Phaser.Scene,
  x: number, y: number,
  text: string,
  color: number,
  onClick: () => void,
  width: number = 200,
  height: number = 50
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);

  const bg = scene.add.graphics();
  bg.fillStyle(color);
  bg.fillRoundedRect(-width / 2, -height / 2, width, height, 15);
  // Lighter border
  bg.lineStyle(3, 0xFFFFFF, 0.4);
  bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 15);
  container.add(bg);

  const label = scene.add.text(0, 0, text, {
    fontFamily: 'Arial, sans-serif',
    fontSize: '24px',
    color: '#FFFFFF',
    fontStyle: 'bold',
  }).setOrigin(0.5);
  container.add(label);

  container.setSize(width, height);
  container.setInteractive({ useHandCursor: true });
  container.on('pointerdown', () => {
    scene.tweens.add({
      targets: container,
      scaleX: 0.95,
      scaleY: 0.95,
      duration: 80,
      yoyo: true,
      onComplete: onClick,
    });
  });

  return container;
}
