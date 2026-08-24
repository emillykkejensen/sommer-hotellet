import Phaser from 'phaser';
import { COLORS, LINE, SIZE, text } from '../config';
import { APPLE_COUNT, FLOWER_COUNT, gameState, SANDCASTLE_STAGES } from '../state/GameState';
import {
  showConfetti, showHearts, showPraise, showSparkle, showStarBurst, showToast,
} from '../objects/FeedbackEffects';
import { addBackButton, addSceneTitle, addSoundToggle, addStarCounter, award } from '../ui/Chrome';
import {
  addBirds, caption, drawCloud, drawHead, drawSun, drawTree, gradientBand, paintFlower,
  progressBar, shadow, tappable,
} from '../helpers/Draw';
import { bob, reduceMotion } from '../helpers/Motion';
import { sfx } from '../helpers/AudioManager';
import { BaseScene } from './BaseScene';

const PETALS = [COLORS.pink, COLORS.red, COLORS.yellow, COLORS.purple, COLORS.white];

export class GardenScene extends BaseScene {
  private swinging = false;

  constructor() {
    super({ key: 'GardenScene' });
  }

  protected buildBackground(): void {
    const { width, height } = this.scale;

    this.bg(gradientBand(this, 0, height * 0.5, COLORS.skyLight, COLORS.sky));

    // A hedge along the horizon, so the garden has a back wall instead of the grass
    // simply stopping at a colour change.
    this.bg(this.drawHedge(height * 0.46));

    this.bg(gradientBand(this, height * 0.48, height * 0.52, COLORS.grassLight, COLORS.grassDeep));

    // grass tufts and static flowers, all in one Graphics
    const g = this.add.graphics();
    for (let i = 0; i < 40; i++) {
      const gx = Phaser.Math.Between(0, width);
      const gy = Phaser.Math.Between(height * 0.5, height - 6);
      g.lineStyle(2, COLORS.grassDeep, 0.5);
      g.lineBetween(gx, gy, gx - 3, gy - 7);
      g.lineBetween(gx, gy, gx + 3, gy - 6);
    }
    paintFlower(g, 300, height * 0.93, COLORS.pink, 0.8);
    paintFlower(g, 348, height * 0.9, COLORS.white, 0.7);
    paintFlower(g, 250, height * 0.88, COLORS.purple, 0.7);
    paintFlower(g, 720, height * 0.9, COLORS.sun, 0.8);
    paintFlower(g, 776, height * 0.94, COLORS.pink, 0.7);
    this.bg(g);

    this.bg(drawTree(this, 78, height * 0.58, 1.05));
    this.bg(this.drawBench(width * 0.085, height * 0.84));
  }

  protected buildAmbient(): void {
    const { width } = this.scale;
    drawSun(this, width - 96, 132, 26);
    addBirds(this, 3, 70, 44);

    const cloud = drawCloud(this, 210, 116, 0.68);
    if (!reduceMotion()) {
      this.tweens.add({ targets: cloud, x: '+=90', duration: 14000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    this.addButterflies();
  }

  protected buildChrome(): void {
    addBackButton(this);
    addStarCounter(this);
    addSoundToggle(this);
    addSceneTitle(this, 'Haven & Legepladsen', COLORS.green);
  }

  protected buildDynamic(): void {
    const { width, height } = this.scale;

    this.buildFlowerBed(190, height * 0.6);
    this.buildWateringCan(190, height * 0.86);
    this.buildSandbox(width * 0.5, height * 0.78);
    this.buildSwing(width * 0.72, height * 0.5);
    this.buildAppleTree(width - 112, height * 0.5);
    this.buildPlayers();
    this.buildProgress(width / 2, height - 26);
  }

  /**
   * One bar for the whole garden.
   *
   * The three jobs here each had their own counter and nothing tied them together, so
   * there was no sense of the garden as a place that could be finished.
   */
  private buildProgress(x: number, y: number): void {
    const watered = gameState.garden.flowers.filter(Boolean).length;
    const apples = gameState.garden.apples.filter(Boolean).length;
    const done = watered + apples + gameState.garden.sandcastle;
    const total = FLOWER_COUNT + APPLE_COUNT + SANDCASTLE_STAGES;

    const c = this.add.container(x, y);
    c.add(progressBar(this, 0, 0, 240, 16, done / total, done === total ? COLORS.green : COLORS.sun));
    c.add(this.add.text(0, 0, done === total ? 'Haven er helt færdig' : `${done} / ${total} gjort`,
      text(SIZE.tiny, '#5A4E42', 'bold')).setOrigin(0.5));
    this.dyn(c);
  }

  private buildFlowerBed(x: number, y: number): void {
    const watered = gameState.garden.flowers;
    const c = this.add.container(x, y);
    const g = this.add.graphics();

    shadow(g, -104, -14, 208, 50, 14, 4, 0.16);
    g.fillStyle(0x8A6A4C);
    g.fillRoundedRect(-104, -14, 208, 50, 14);
    g.fillStyle(0xA07E5C);
    g.fillRoundedRect(-100, -10, 200, 38, 12);
    g.lineStyle(LINE.base, COLORS.outline, 0.85);
    g.strokeRoundedRect(-104, -14, 208, 50, 14);
    // a few stones along the front edge
    for (let i = 0; i < 7; i++) {
      g.fillStyle(COLORS.stone);
      g.fillEllipse(-88 + i * 29, 33, 22, 11);
      g.lineStyle(LINE.hair, COLORS.outline, 0.7);
      g.strokeEllipse(-88 + i * 29, 33, 22, 11);
    }

    for (let i = 0; i < FLOWER_COUNT; i++) {
      const fx = -80 + i * 40;
      if (watered[i]) {
        paintFlower(g, fx, -6, PETALS[i], 1.05);
      } else {
        g.lineStyle(2.5, COLORS.grassDeep, 0.85);
        g.lineBetween(fx, 8, fx, -2);
        g.fillStyle(COLORS.grass, 0.9);
        g.fillEllipse(fx - 4, -3, 10, 6);
        g.fillEllipse(fx + 4, -5, 10, 6);
        g.lineStyle(LINE.hair, COLORS.outline, 0.5);
        g.strokeEllipse(fx - 4, -3, 10, 6);
        g.strokeEllipse(fx + 4, -5, 10, 6);
      }
    }
    c.add(g);

    const done = watered.filter(Boolean).length;
    c.add(caption(this, 0, 54,
      done === FLOWER_COUNT ? 'Blomsterbedet blomstrer' : `Vandet ${done} af ${FLOWER_COUNT}`,
      done === FLOWER_COUNT ? 'done' : 'idle'));

    this.dyn(c);
  }

  private buildWateringCan(x: number, y: number): void {
    const allWatered = gameState.garden.flowers.every(Boolean);
    const c = this.add.container(x, y);
    const g = this.add.graphics();

    shadow(g, -20, 14, 42, 10, 5, 2, 0.16);
    g.fillStyle(COLORS.waterDeep);
    g.fillRoundedRect(-19, -12, 38, 28, 7);
    g.fillStyle(COLORS.water);
    g.fillRoundedRect(-19, -12, 38, 18, 7);
    g.fillStyle(COLORS.white, 0.35);
    g.fillRoundedRect(-15, -9, 9, 20, 4);
    g.lineStyle(LINE.thin, COLORS.outline, 0.85);
    g.strokeRoundedRect(-19, -12, 38, 28, 7);
    // spout
    g.lineStyle(6, COLORS.waterDeep);
    g.beginPath();
    g.moveTo(17, -6);
    g.lineTo(31, -18);
    g.strokePath();
    g.lineStyle(LINE.hair, COLORS.outline, 0.7);
    g.beginPath();
    g.moveTo(17, -6);
    g.lineTo(31, -18);
    g.strokePath();
    // rose on the end of the spout
    g.fillStyle(COLORS.waterDeep);
    g.fillCircle(32, -19, 5);
    g.lineStyle(LINE.hair, COLORS.outline, 0.8);
    g.strokeCircle(32, -19, 5);
    // handle
    g.lineStyle(5, COLORS.waterDeep);
    g.beginPath();
    g.arc(0, -14, 13, Math.PI, 0, false);
    g.strokePath();
    c.add(g);

    c.add(caption(this, 0, 36, allWatered ? 'Kanden er tom' : 'Vand blomsterne', allWatered ? 'done' : 'idle'));
    this.dyn(c);

    if (allWatered) return;

    // A gentle tilt, so the one thing that starts this screen's job asks to be picked up.
    if (!reduceMotion()) {
      this.tweens.add({
        targets: c,
        angle: { from: -3, to: 3 },
        duration: 1500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    tappable(this, c, 66, 56, () => {
      const index = gameState.waterNextFlower();
      if (index === null) return;

      const fx = 190 - 80 + index * 40;
      const fy = this.scale.height * 0.6;

      for (let i = 0; i < 6; i++) {
        const drop = this.add.circle(fx + Phaser.Math.Between(-9, 9), fy - 34, 3.5, COLORS.waterLight)
          .setStrokeStyle(1, COLORS.waterDeep, 0.7)
          .setDepth(880);
        this.tweens.add({
          targets: drop,
          y: fy - 4,
          alpha: 0,
          duration: 420,
          delay: i * 70,
          onComplete: () => drop.destroy(),
        });
      }

      award(this, 1, fx, fy - 20);
      this.time.delayedCall(320, () => {
        showStarBurst(this, fx, fy - 20);
        if (gameState.garden.flowers.every(Boolean)) {
          sfx('success');
          showSparkle(this, 190, fy, 220, 90);
          showConfetti(this, 190, fy - 40, 28);
          showPraise(this, 190, fy - 96, 'Hele bedet blomstrer!');
          award(this, 2, fx, fy - 20);
        }
        this.refresh();
      });
    });
  }

  private buildSandbox(x: number, y: number): void {
    const level = gameState.garden.sandcastle;
    const c = this.add.container(x, y);
    const g = this.add.graphics();

    shadow(g, -78, -34, 156, 72, 12, 4, 0.16);
    g.fillStyle(COLORS.woodDeep);
    g.fillRoundedRect(-78, -34, 156, 72, 12);
    g.fillStyle(COLORS.sandLight);
    g.fillRoundedRect(-70, -27, 140, 58, 9);
    g.lineStyle(LINE.base, COLORS.outline, 0.85);
    g.strokeRoundedRect(-78, -34, 156, 72, 12);
    g.fillStyle(COLORS.sandDeep, 0.4);
    for (let i = 0; i < 14; i++) {
      g.fillCircle(Phaser.Math.Between(-64, 64), Phaser.Math.Between(-22, 26), 2);
    }
    // a bucket and spade in the corner, so an empty sandbox is still a sandbox
    if (level === 0) {
      g.fillStyle(COLORS.red);
      g.fillRoundedRect(38, 2, 26, 22, { tl: 2, tr: 2, bl: 8, br: 8 });
      g.lineStyle(LINE.thin, COLORS.outline, 0.85);
      g.strokeRoundedRect(38, 2, 26, 22, { tl: 2, tr: 2, bl: 8, br: 8 });
      g.lineStyle(2, COLORS.outline, 0.6);
      g.beginPath();
      g.arc(51, 2, 13, Math.PI, 0, true);
      g.strokePath();
      g.lineStyle(4, COLORS.water);
      g.lineBetween(-58, 24, -46, -6);
      g.fillStyle(COLORS.water);
      g.fillTriangle(-50, -6, -38, -6, -44, -18);
      g.lineStyle(LINE.hair, COLORS.outline, 0.8);
      g.strokeTriangle(-50, -6, -38, -6, -44, -18);
    }
    c.add(g);

    if (level > 0) {
      const castle = this.add.graphics();
      castle.fillStyle(COLORS.woodDeep, 0.35);
      castle.fillEllipse(0, 26, 76, 12);
      castle.fillStyle(COLORS.sandDeep);
      castle.fillRoundedRect(-34, -6, 68, 30, 4);
      castle.fillStyle(COLORS.sand);
      castle.fillRoundedRect(-34, -8, 68, 26, 4);
      // crenellations
      for (let i = 0; i < 4; i++) {
        castle.fillRect(-34 + i * 19, -14, 11, 8);
      }
      castle.lineStyle(LINE.thin, COLORS.outline, 0.8);
      castle.strokeRoundedRect(-34, -8, 68, 26, 4);

      if (level >= 2) {
        castle.fillStyle(COLORS.sandDeep);
        castle.fillRoundedRect(-22, -32, 44, 26, 4);
        castle.fillStyle(COLORS.sand);
        castle.fillRoundedRect(-22, -34, 44, 22, 4);
        for (let i = 0; i < 3; i++) castle.fillRect(-22 + i * 17, -40, 10, 7);
        castle.lineStyle(LINE.thin, COLORS.outline, 0.8);
        castle.strokeRoundedRect(-22, -34, 44, 22, 4);
        castle.fillStyle(COLORS.woodDeep, 0.5);
        castle.fillRoundedRect(-6, -24, 12, 14, { tl: 6, tr: 6, bl: 0, br: 0 });
      }

      if (level >= SANDCASTLE_STAGES) {
        castle.fillStyle(COLORS.sandDeep);
        castle.fillRoundedRect(-13, -58, 26, 26, 4);
        castle.fillStyle(COLORS.sand);
        castle.fillRoundedRect(-13, -60, 26, 24, 4);
        castle.lineStyle(LINE.thin, COLORS.outline, 0.8);
        castle.strokeRoundedRect(-13, -60, 26, 24, 4);
        castle.fillStyle(COLORS.roof);
        castle.fillTriangle(-17, -60, 17, -60, 0, -80);
        castle.lineStyle(LINE.thin, COLORS.outline, 0.85);
        castle.strokeTriangle(-17, -60, 17, -60, 0, -80);
        castle.lineStyle(2, COLORS.outline, 0.8);
        castle.lineBetween(0, -80, 0, -92);
        castle.fillStyle(COLORS.red);
        castle.fillTriangle(0, -92, 0, -82, 15, -87);
      }

      c.add(castle);
    }

    const label = level >= SANDCASTLE_STAGES
      ? 'Sandslottet er færdigt'
      : level === 0 ? 'Byg et sandslot' : `Byg videre — ${level} af ${SANDCASTLE_STAGES}`;
    c.add(caption(this, 0, 54, label, level >= SANDCASTLE_STAGES ? 'done' : 'idle'));

    this.dyn(c);

    if (level >= SANDCASTLE_STAGES) return;

    tappable(this, c, 156, 72, () => {
      if (!gameState.buildSandcastle()) return;
      award(this, 1, x, y - 22);
      showStarBurst(this, x, y - 22);

      if (gameState.garden.sandcastle >= SANDCASTLE_STAGES) {
        sfx('success');
        showSparkle(this, x, y - 40, 120, 110);
        showConfetti(this, x, y - 70, 30);
        showHearts(this, x, y - 60);
        showPraise(this, x, y - 110, 'Sikke et slot!');
        award(this, 2, x, y - 22);
      }
      this.refresh();
    });
  }

  private buildSwing(x: number, y: number): void {
    const c = this.add.container(x, y);

    const frame = this.add.graphics();
    frame.lineStyle(9, COLORS.outline, 0.85);
    frame.lineBetween(-16, -66, -46, 34);
    frame.lineBetween(16, -66, 46, 34);
    frame.lineBetween(-18, -66, 18, -66);
    frame.lineStyle(7, COLORS.woodDeep);
    frame.lineBetween(-16, -66, -46, 34);
    frame.lineBetween(16, -66, 46, 34);
    frame.lineBetween(-18, -66, 18, -66);
    frame.lineStyle(3, COLORS.wood);
    frame.lineBetween(-15, -64, -45, 34);
    frame.lineBetween(17, -64, 47, 34);
    c.add(frame);

    const swing = this.add.container(0, -66);
    const ropes = this.add.graphics();
    ropes.lineStyle(3, COLORS.outline, 0.75);
    ropes.lineBetween(-11, 0, -11, 52);
    ropes.lineBetween(11, 0, 11, 52);
    swing.add(ropes);
    const seat = this.add.graphics();
    seat.fillStyle(COLORS.roofDeep);
    seat.fillRoundedRect(-18, 50, 36, 8, 3);
    seat.fillStyle(COLORS.red);
    seat.fillRoundedRect(-18, 48, 36, 6, 3);
    seat.lineStyle(LINE.thin, COLORS.outline, 0.85);
    seat.strokeRoundedRect(-18, 48, 36, 10, 3);
    swing.add(seat);
    swing.add(drawHead(this, 0, 38, COLORS.purple, 0.85));
    c.add(swing);

    c.add(caption(this, 0, 54, 'Sæt gyngen i gang'));
    this.dyn(c);

    tappable(this, c, 84, 116, () => {
      if (this.swinging) return;
      this.swinging = true;

      this.tweens.add({
        targets: swing,
        angle: { from: -26, to: 26 },
        duration: 620,
        yoyo: true,
        repeat: 3,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          swing.setAngle(0);
          this.swinging = false;
          showHearts(this, x, y - 40);
          showStarBurst(this, x, y - 56, 4);
          award(this, 1, x, y - 56);
        },
      });

      ['Højere!', 'Juhuu!'].forEach((word, i) => {
        this.time.delayedCall(i * 1100 + 300, () => showToast(this, x + (i ? 34 : -34), y - 84, word, '#B55345'));
      });
    });
  }

  private buildAppleTree(x: number, y: number): void {
    const picked = gameState.garden.apples;
    const c = this.add.container(x, y);
    const g = this.add.graphics();

    g.fillStyle(COLORS.shadow, 0.12);
    g.fillEllipse(0, 74, 70, 15);
    g.fillStyle(COLORS.woodDeep);
    g.fillRoundedRect(-9, 4, 18, 70, 4);
    g.fillStyle(COLORS.wood);
    g.fillRoundedRect(-9, 4, 8, 70, 3);
    g.lineStyle(LINE.thin, COLORS.outline, 0.85);
    g.strokeRoundedRect(-9, 4, 18, 70, 4);

    g.fillStyle(COLORS.grassDeep);
    g.fillCircle(3, -32, 42);
    g.fillCircle(-26, -8, 27);
    g.fillCircle(30, -8, 27);
    g.fillStyle(COLORS.grass);
    g.fillCircle(0, -38, 38);
    g.fillCircle(-25, -12, 24);
    g.fillCircle(27, -12, 24);
    g.fillStyle(COLORS.grassLight, 0.55);
    g.fillCircle(-12, -52, 15);
    g.lineStyle(LINE.base, COLORS.outline, 0.7);
    g.strokeCircle(3, -32, 42);
    g.strokeCircle(-26, -8, 27);
    g.strokeCircle(30, -8, 27);
    c.add(g);

    const spots = [
      { x: -22, y: -50 }, { x: 14, y: -44 }, { x: -6, y: -22 },
      { x: 28, y: -18 }, { x: -30, y: -20 },
    ];

    for (let i = 0; i < APPLE_COUNT; i++) {
      if (picked[i]) continue;
      const spot = spots[i];
      const apple = this.add.container(spot.x, spot.y);
      const ag = this.add.graphics();
      ag.fillStyle(COLORS.roofDeep);
      ag.fillCircle(0, 1, 9.5);
      ag.fillStyle(COLORS.red);
      ag.fillCircle(0, 0, 9);
      ag.fillStyle(COLORS.white, 0.45);
      ag.fillCircle(-3, -3, 2.6);
      ag.lineStyle(LINE.thin, COLORS.outline, 0.85);
      ag.strokeCircle(0, 0, 9);
      ag.lineStyle(2, COLORS.woodDeep);
      ag.lineBetween(0, -8, 1, -14);
      ag.fillStyle(COLORS.grass);
      ag.fillEllipse(5, -13, 8, 5);
      apple.add(ag);
      c.add(apple);

      // Ripe apples hang heavy and sway a little; it also marks them as tappable.
      bob(this, apple, 2.5, 1700 + i * 210, i * 180);

      apple.setSize(26, 26);
      apple.setInteractive({ useHandCursor: true });
      apple.on('pointerdown', () => {
        if (!gameState.pickApple(i)) return;
        sfx('pop');
        award(this, 1, x + spot.x, y + spot.y);

        // Detach into a world-space container so the fall survives the refresh.
        const falling = this.add.container(x + spot.x, y + spot.y, [
          this.add.graphics()
            .fillStyle(COLORS.red).fillCircle(0, 0, 9)
            .fillStyle(COLORS.white, 0.45).fillCircle(-3, -3, 2.6)
            .lineStyle(LINE.thin, COLORS.outline, 0.85).strokeCircle(0, 0, 9),
        ]).setDepth(880);

        this.tweens.add({
          targets: falling,
          y: y + 56,
          angle: 200,
          duration: 520,
          ease: 'Bounce.easeOut',
          onComplete: () => {
            this.tweens.add({
              targets: falling,
              alpha: 0,
              duration: 260,
              onComplete: () => falling.destroy(),
            });
          },
        });

        showStarBurst(this, x + spot.x, y + spot.y, 4);

        if (gameState.allApplesPicked()) {
          sfx('success');
          showSparkle(this, x, y - 30, 110, 110);
          showConfetti(this, x - 40, y - 60, 28);
          showPraise(this, x - 60, y - 110, 'Kurven er fuld!');
          award(this, 2, x + spot.x, y + spot.y);
        }
        this.refresh();
      });
    }

    // basket at the foot of the trunk, offset so the two shapes stay legible
    const basket = this.add.graphics();
    const pickedCount = picked.filter(Boolean).length;
    // On the right of the trunk: on the left it landed underneath the swing's caption.
    for (let i = 0; i < Math.min(pickedCount, 3); i++) {
      basket.fillStyle(COLORS.red);
      basket.fillCircle(34 + i * 13, 50, 6.5);
      basket.lineStyle(LINE.hair, COLORS.outline, 0.85);
      basket.strokeCircle(34 + i * 13, 50, 6.5);
      basket.fillStyle(COLORS.white, 0.4);
      basket.fillCircle(32 + i * 13, 48, 2);
    }
    basket.fillStyle(COLORS.woodDeep);
    basket.fillRoundedRect(28, 52, 46, 24, { tl: 2, tr: 2, bl: 10, br: 10 });
    basket.fillStyle(COLORS.wood);
    basket.fillRoundedRect(30, 54, 42, 20, { tl: 2, tr: 2, bl: 9, br: 9 });
    basket.lineStyle(LINE.hair, COLORS.woodDeep, 0.7);
    for (let i = 1; i < 4; i++) basket.lineBetween(30 + i * 10, 55, 30 + i * 10, 72);
    basket.lineBetween(30, 62, 72, 62);
    basket.fillStyle(COLORS.woodDeep);
    basket.fillRoundedRect(26, 48, 50, 8, 3.5);
    basket.lineStyle(LINE.thin, COLORS.outline, 0.85);
    basket.strokeRoundedRect(28, 52, 46, 24, { tl: 2, tr: 2, bl: 10, br: 10 });
    basket.strokeRoundedRect(26, 48, 50, 8, 3.5);
    c.add(basket);

    // The completion message used to be drawn on top of the permanent label.
    // Pulled left of the trunk: centred on it, the label ran off the right edge.
    c.add(caption(this, -48, 100,
      gameState.allApplesPicked() ? 'Alle æbler er plukket' : `Pluk æbler — ${pickedCount} af ${APPLE_COUNT}`,
      gameState.allApplesPicked() ? 'done' : 'idle'));

    this.dyn(c);
  }

  private buildPlayers(): void {
    const { height } = this.scale;
    const guests = gameState.getCheckedInGuests().slice(0, 2);
    guests.forEach((guest, i) => {
      const c = this.add.container(330 + i * 84, height * 0.52);
      c.add(drawHead(this, 0, 0, guest.color, 0.85));
      this.dyn(c);
      bob(this, c, 6, 1100 + i * 240);
    });
  }

  // ---------- scenery ----------

  /** A clipped hedge along the back of the garden. */
  private drawHedge(y: number): Phaser.GameObjects.Graphics {
    const { width } = this.scale;
    const g = this.add.graphics();

    g.fillStyle(COLORS.grassDeep);
    g.fillRoundedRect(-10, y, width + 20, 62, 18);
    // lumpy top edge, so it reads as a hedge rather than a green wall
    for (let x = 6; x < width + 10; x += 34) {
      g.fillCircle(x, y + 6, 21);
    }
    g.fillStyle(COLORS.grass, 0.55);
    for (let x = 18; x < width; x += 34) {
      g.fillCircle(x, y + 2, 13);
    }
    g.lineStyle(LINE.thin, COLORS.outline, 0.4);
    g.lineBetween(0, y + 58, width, y + 58);

    return g;
  }

  /** A garden bench. Nobody sits on it; it is there so the lawn is not empty. */
  private drawBench(x: number, y: number): Phaser.GameObjects.Container {
    const c = this.add.container(x, y);
    const g = this.add.graphics();

    g.fillStyle(COLORS.shadow, 0.12);
    g.fillEllipse(0, 32, 96, 14);

    // legs
    g.fillStyle(COLORS.woodDeep);
    g.fillRoundedRect(-38, 4, 9, 28, 3);
    g.fillRoundedRect(29, 4, 9, 28, 3);
    g.lineStyle(LINE.hair, COLORS.outline, 0.8);
    g.strokeRoundedRect(-38, 4, 9, 28, 3);
    g.strokeRoundedRect(29, 4, 9, 28, 3);

    // seat and back slats
    [[-6, COLORS.wood], [-20, COLORS.woodLight], [-34, COLORS.wood]].forEach(([dy, col]) => {
      g.fillStyle(col as number);
      g.fillRoundedRect(-46, dy as number, 92, 10, 4);
      g.lineStyle(LINE.hair, COLORS.outline, 0.8);
      g.strokeRoundedRect(-46, dy as number, 92, 10, 4);
    });
    g.fillStyle(COLORS.woodDeep);
    g.fillRoundedRect(-42, -38, 8, 42, 3);
    g.fillRoundedRect(34, -38, 8, 42, 3);
    g.lineStyle(LINE.hair, COLORS.outline, 0.8);
    g.strokeRoundedRect(-42, -38, 8, 42, 3);
    g.strokeRoundedRect(34, -38, 8, 42, 3);

    c.add(g);
    return c;
  }

  private addButterflies(): void {
    const { width, height } = this.scale;
    for (let i = 0; i < 3; i++) {
      const b = this.add.container(
        Phaser.Math.Between(120, width - 160),
        Phaser.Math.Between(height * 0.3, height * 0.46)
      );
      const g = this.add.graphics();
      const tint = [COLORS.sun, COLORS.pink, COLORS.white][i % 3];
      // Wings need to be clearly wider than the body, or the whole thing reads as a
      // vertical sliver at this size.
      g.fillStyle(tint, 1);
      g.fillEllipse(-10, -4, 20, 17);
      g.fillEllipse(10, -4, 20, 17);
      g.fillStyle(tint, 0.75);
      g.fillEllipse(-8, 7, 15, 13);
      g.fillEllipse(8, 7, 15, 13);
      g.lineStyle(LINE.hair, COLORS.outline, 0.6);
      g.strokeEllipse(-10, -4, 20, 17);
      g.strokeEllipse(10, -4, 20, 17);
      g.fillStyle(COLORS.white, 0.55);
      g.fillCircle(-11, -6, 3);
      g.fillCircle(11, -6, 3);
      g.fillStyle(COLORS.outline, 0.8);
      g.fillRoundedRect(-1.5, -9, 3, 19, 1.5);
      g.lineStyle(1.2, COLORS.outline, 0.6);
      g.lineBetween(-1, -9, -5, -14);
      g.lineBetween(1, -9, 5, -14);
      b.add(g);
      this.amb(b);

      if (reduceMotion()) continue;

      this.tweens.add({
        targets: b,
        x: Phaser.Math.Between(90, width - 120),
        y: Phaser.Math.Between(height * 0.26, height * 0.5),
        duration: 4000 + i * 1100,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      this.tweens.add({
        targets: g,
        scaleX: { from: 1, to: 0.78 },
        duration: 300,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }
}
