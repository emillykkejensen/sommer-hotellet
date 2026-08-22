import Phaser from 'phaser';
import { COLORS } from '../config';
import { APPLE_COUNT, FLOWER_COUNT, gameState, SANDCASTLE_STAGES } from '../state/GameState';
import { showHearts, showSparkle, showStarBurst, showToast } from '../objects/FeedbackEffects';
import { addBackButton, addSceneTitle, addStarCounter, award } from '../ui/Chrome';
import { rewardFor } from '../helpers/Reward';
import { placeDecorations } from './ShopScene';
import { caption, drawCloud, drawFlower, drawHead, drawPerson, drawSun, drawTree, gradientBand, shadow, tappable } from '../helpers/Draw';
import { audio } from '../helpers/Audio';
import { reduceMotion } from '../helpers/Motion';
import { BaseScene } from './BaseScene';

const PETALS = [COLORS.pink, COLORS.red, COLORS.yellow, COLORS.purple, COLORS.white];

export class GardenScene extends BaseScene {
  private swinging = false;

  constructor() {
    super({ key: 'GardenScene' });
  }

  protected buildBackground(): void {
    const { width, height } = this.scale;

    this.background.add(gradientBand(this, 0, height * 0.5, COLORS.skyLight, COLORS.sky));
    this.background.add(gradientBand(this, height * 0.44, height * 0.56, COLORS.grassLight, COLORS.grassDeep));

    drawSun(this, width - 96, 132, 25);
    const cloud = drawCloud(this, 210, 120, 0.68);
    this.tweens.add({ targets: cloud, x: '+=90', duration: 14000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // grass tufts
    const g = this.add.graphics();
    for (let i = 0; i < 40; i++) {
      const gx = Phaser.Math.Between(0, width);
      const gy = Phaser.Math.Between(height * 0.48, height - 6);
      g.lineStyle(2, COLORS.grassDeep, 0.4);
      g.lineBetween(gx, gy, gx - 3, gy - 7);
      g.lineBetween(gx, gy, gx + 3, gy - 6);
    }
    this.background.add(g);

    drawTree(this, 78, height * 0.56, 1.05);
    drawFlower(this, 300, height * 0.93, COLORS.pink, 0.8);
    drawFlower(this, 348, height * 0.9, COLORS.white, 0.7);
    drawFlower(this, 250, height * 0.88, COLORS.purple, 0.7);
    drawFlower(this, 720, height * 0.9, COLORS.sun, 0.8);
    drawFlower(this, 776, height * 0.94, COLORS.pink, 0.7);
    this.addButterflies();
  }

  protected buildChrome(): void {
    addBackButton(this);
    addStarCounter(this);
    addSceneTitle(this, 'Haven & Legepladsen', '#6FAE55');
  }

  protected buildDynamic(): void {
    const { width, height } = this.scale;

    placeDecorations(this, 'garden', this.dynamic);
    this.buildFlowerBed(190, height * 0.6);
    this.buildWateringCan(190, height * 0.86);
    this.buildSandbox(width * 0.5, height * 0.78);
    this.buildSwing(width * 0.72, height * 0.5);
    this.buildAppleTree(width - 112, height * 0.5);
    this.buildPlayers();
  }

  private buildFlowerBed(x: number, y: number): void {
    const watered = gameState.garden.flowers;
    const c = this.add.container(x, y);
    const g = this.add.graphics();

    shadow(g, -104, -14, 208, 50, 14, 3, 0.14);
    g.fillStyle(0x8A6A4C);
    g.fillRoundedRect(-104, -14, 208, 50, 14);
    g.fillStyle(0xA07E5C);
    g.fillRoundedRect(-100, -10, 200, 38, 12);
    c.add(g);

    for (let i = 0; i < FLOWER_COUNT; i++) {
      const fx = -80 + i * 40;
      if (watered[i]) {
        c.add(drawFlower(this, fx, -6, PETALS[i], 1.05));
      } else {
        const sprout = this.add.graphics();
        sprout.lineStyle(2.5, COLORS.grassDeep, 0.75);
        sprout.lineBetween(fx, 8, fx, -2);
        sprout.fillStyle(COLORS.grass, 0.8);
        sprout.fillEllipse(fx - 4, -3, 9, 5);
        sprout.fillEllipse(fx + 4, -5, 9, 5);
        c.add(sprout);
      }
    }

    const done = watered.filter(Boolean).length;
    c.add(caption(this, 0, 50,
      done === FLOWER_COUNT ? 'Blomsterbedet blomstrer' : `Vandet ${done} af ${FLOWER_COUNT}`,
      done === FLOWER_COUNT ? 'done' : 'idle'));

    this.dyn(c);
  }

  private buildWateringCan(x: number, y: number): void {
    const allWatered = gameState.garden.flowers.every(Boolean);
    const c = this.add.container(x, y);
    const g = this.add.graphics();

    shadow(g, -20, 14, 42, 10, 5, 2, 0.14);
    g.fillStyle(COLORS.waterDeep);
    g.fillRoundedRect(-19, -12, 38, 28, 7);
    g.fillStyle(COLORS.water);
    g.fillRoundedRect(-19, -12, 38, 18, 7);
    g.fillStyle(COLORS.white, 0.3);
    g.fillRoundedRect(-15, -9, 9, 20, 4);
    g.lineStyle(5, COLORS.waterDeep);
    g.beginPath();
    g.moveTo(17, -6);
    g.lineTo(31, -18);
    g.strokePath();
    g.lineStyle(4, COLORS.waterDeep);
    g.beginPath();
    g.arc(0, -14, 13, Math.PI, 0, false);
    g.strokePath();
    c.add(g);

    c.add(caption(this, 0, 34, allWatered ? 'Kanden er tom' : 'Vand blomsterne', allWatered ? 'done' : 'idle'));
    this.dyn(c);

    if (allWatered) return;

    tappable(this, c, 66, 56, () => {
      const index = gameState.waterNextFlower();
      if (index === null) return;
      audio.splash();

      const fx = 190 - 80 + index * 40;
      const fy = this.scale.height * 0.6;

      for (let i = 0; i < 5; i++) {
        const drop = this.add.circle(fx + Phaser.Math.Between(-9, 9), fy - 34, 3.5, COLORS.waterLight)
          .setDepth(880);
        this.tweens.add({
          targets: drop,
          y: fy - 4,
          alpha: 0,
          duration: 420,
          delay: i * 80,
          onComplete: () => drop.destroy(),
        });
      }

      const bedDone = gameState.garden.flowers.every(Boolean);
      this.time.delayedCall(320, () => {
        showStarBurst(this, fx, fy - 20);
        rewardFor(this, 'garden', {
          after: () => {
            if (bedDone) {
              showSparkle(this, 190, fy, 220, 90);
              showToast(this, 190, fy - 70, 'Hele bedet blomstrer', '#4A7F33');
              award(this, 2);
            }
            this.refresh();
          },
        });
      });
    });
  }

  private buildSandbox(x: number, y: number): void {
    const level = gameState.garden.sandcastle;
    const c = this.add.container(x, y);
    const g = this.add.graphics();

    shadow(g, -78, -34, 156, 72, 12, 3, 0.14);
    g.fillStyle(COLORS.woodDeep);
    g.fillRoundedRect(-78, -34, 156, 72, 12);
    g.fillStyle(COLORS.sandLight);
    g.fillRoundedRect(-70, -27, 140, 58, 9);
    g.fillStyle(COLORS.sandDeep, 0.35);
    for (let i = 0; i < 14; i++) {
      g.fillCircle(Phaser.Math.Between(-64, 64), Phaser.Math.Between(-22, 26), 2);
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

      if (level >= 2) {
        castle.fillStyle(COLORS.sandDeep);
        castle.fillRoundedRect(-22, -32, 44, 26, 4);
        castle.fillStyle(COLORS.sand);
        castle.fillRoundedRect(-22, -34, 44, 22, 4);
        for (let i = 0; i < 3; i++) castle.fillRect(-22 + i * 17, -40, 10, 7);
        castle.fillStyle(COLORS.woodDeep, 0.45);
        castle.fillRoundedRect(-6, -24, 12, 14, { tl: 6, tr: 6, bl: 0, br: 0 });
      }

      if (level >= SANDCASTLE_STAGES) {
        castle.fillStyle(COLORS.sandDeep);
        castle.fillRoundedRect(-13, -58, 26, 26, 4);
        castle.fillStyle(COLORS.sand);
        castle.fillRoundedRect(-13, -60, 26, 24, 4);
        castle.fillStyle(COLORS.roof);
        castle.fillTriangle(-17, -60, 17, -60, 0, -80);
        castle.lineStyle(2, COLORS.stoneDeep);
        castle.lineBetween(0, -80, 0, -92);
        castle.fillStyle(COLORS.red);
        castle.fillTriangle(0, -92, 0, -82, 15, -87);
      }

      c.add(castle);
    }

    const label = level >= SANDCASTLE_STAGES
      ? 'Sandslottet er færdigt'
      : level === 0 ? 'Byg et sandslot' : `Byg videre — ${level} af ${SANDCASTLE_STAGES}`;
    c.add(caption(this, 0, 52, label, level >= SANDCASTLE_STAGES ? 'done' : 'idle'));

    this.dyn(c);

    if (level >= SANDCASTLE_STAGES) return;

    tappable(this, c, 156, 72, () => {
      if (!gameState.buildSandcastle()) return;
      audio.pop();
      showStarBurst(this, x, y - 22);

      const castleDone = gameState.garden.sandcastle >= SANDCASTLE_STAGES;
      rewardFor(this, 'garden', {
        after: () => {
          if (castleDone) {
            showSparkle(this, x, y - 40, 120, 110);
            showHearts(this, x, y - 60);
            showToast(this, x, y - 96, 'Sikke et slot!', '#4A7F33');
            award(this, 2);
          }
          this.refresh();
        },
      });
    });
  }

  private buildSwing(x: number, y: number): void {
    const c = this.add.container(x, y);

    const frame = this.add.graphics();
    frame.lineStyle(8, COLORS.woodDeep);
    frame.lineBetween(-16, -66, -46, 34);
    frame.lineBetween(16, -66, 46, 34);
    frame.lineBetween(-18, -66, 18, -66);
    frame.lineStyle(4, COLORS.wood);
    frame.lineBetween(-15, -64, -45, 34);
    frame.lineBetween(17, -64, 47, 34);
    c.add(frame);

    const swing = this.add.container(0, -66);
    const ropes = this.add.graphics();
    ropes.lineStyle(2.5, COLORS.woodDeep);
    ropes.lineBetween(-11, 0, -11, 52);
    ropes.lineBetween(11, 0, 11, 52);
    swing.add(ropes);
    const seat = this.add.graphics();
    seat.fillStyle(COLORS.roofDeep);
    seat.fillRoundedRect(-17, 50, 34, 7, 3);
    seat.fillStyle(COLORS.red);
    seat.fillRoundedRect(-17, 49, 34, 5, 2.5);
    swing.add(seat);
    swing.add(drawHead(this, 0, 38, COLORS.purple, 0.85));
    c.add(swing);

    c.add(caption(this, 0, 52, 'Sæt gyngen i gang'));
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
          award(this);
          this.events.emit('starsChanged', gameState.stars);
        },
      });

      ['Højere!', 'Juhuu!'].forEach((word, i) => {
        this.time.delayedCall(i * 1100 + 300, () => showToast(this, x + (i ? 34 : -34), y - 84, word, '#B9584A'));
      });
    });
  }

  private buildAppleTree(x: number, y: number): void {
    const picked = gameState.garden.apples;
    const c = this.add.container(x, y);
    const g = this.add.graphics();

    g.fillStyle(COLORS.shadow, 0.1);
    g.fillEllipse(0, 74, 66, 14);
    g.fillStyle(COLORS.woodDeep);
    g.fillRoundedRect(-8, 4, 16, 70, 4);
    g.fillStyle(COLORS.wood);
    g.fillRoundedRect(-8, 4, 7, 70, 3);
    g.fillStyle(COLORS.grassDeep);
    g.fillCircle(3, -32, 42);
    g.fillCircle(-26, -8, 27);
    g.fillCircle(30, -8, 27);
    g.fillStyle(COLORS.grass);
    g.fillCircle(0, -38, 38);
    g.fillCircle(-25, -12, 24);
    g.fillCircle(27, -12, 24);
    g.fillStyle(COLORS.grassLight, 0.5);
    g.fillCircle(-12, -52, 15);
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
      ag.fillCircle(0, 1, 9);
      ag.fillStyle(COLORS.red);
      ag.fillCircle(0, 0, 8.5);
      ag.fillStyle(COLORS.white, 0.4);
      ag.fillCircle(-3, -3, 2.5);
      ag.lineStyle(2, COLORS.woodDeep);
      ag.lineBetween(0, -8, 1, -13);
      apple.add(ag);
      c.add(apple);

      apple.setSize(24, 24);
      apple.setInteractive({ useHandCursor: true });
      apple.on('pointerdown', () => {
        if (!gameState.pickApple(i)) return;
        audio.pop();
        award(this);

        // Detach into a world-space container so the fall survives the refresh.
        const falling = this.add.container(x + spot.x, y + spot.y, [
          this.add.graphics()
            .fillStyle(COLORS.red).fillCircle(0, 0, 8.5)
            .fillStyle(COLORS.white, 0.4).fillCircle(-3, -3, 2.5),
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
          showSparkle(this, x, y - 30, 110, 110);
          showToast(this, x - 40, y - 80, 'Kurven er fuld', '#4A7F33');
          award(this, 2);
        }
        this.refresh();
      });
    }

    // basket at the foot of the trunk, offset so the two shapes stay legible
    const basket = this.add.graphics();
    const pickedCount = picked.filter(Boolean).length;
    for (let i = 0; i < Math.min(pickedCount, 3); i++) {
      basket.fillStyle(COLORS.red);
      basket.fillCircle(-58 + i * 13, 50, 6);
      basket.fillStyle(COLORS.white, 0.35);
      basket.fillCircle(-60 + i * 13, 48, 2);
    }
    basket.fillStyle(COLORS.woodDeep);
    basket.fillRoundedRect(-74, 52, 46, 24, { tl: 2, tr: 2, bl: 10, br: 10 });
    basket.fillStyle(COLORS.wood);
    basket.fillRoundedRect(-72, 54, 42, 20, { tl: 2, tr: 2, bl: 9, br: 9 });
    basket.lineStyle(1.5, COLORS.woodDeep, 0.55);
    for (let i = 1; i < 4; i++) basket.lineBetween(-72 + i * 10, 55, -72 + i * 10, 72);
    basket.lineBetween(-72, 62, -30, 62);
    basket.fillStyle(COLORS.woodDeep);
    basket.fillRoundedRect(-76, 48, 50, 7, 3);
    c.add(basket);

    // The completion message used to be drawn on top of the permanent label.
    c.add(caption(this, 6, 96,
      gameState.allApplesPicked() ? 'Alle æbler er plukket' : `Pluk æbler — ${pickedCount} af ${APPLE_COUNT}`,
      gameState.allApplesPicked() ? 'done' : 'idle'));

    this.dyn(c);
  }

  private buildPlayers(): void {
    const { height } = this.scale;
    const guests = gameState.getCheckedInGuests().slice(0, 2);
    guests.forEach((guest, i) => {
      // standing figures, not the head-and-shoulders crop used behind tables and water
      const c = this.add.container(322 + i * 88, height * 0.56);
      c.add(drawPerson(this, 0, 0, guest.color, 0.78));
      this.dyn(c);
      this.tweens.add({
        targets: c,
        y: c.y - 6,
        duration: 1100 + i * 240,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });
  }

  private addButterflies(): void {
    const { width, height } = this.scale;
    for (let i = 0; i < 3; i++) {
      const b = this.add.container(
        Phaser.Math.Between(120, width - 160),
        Phaser.Math.Between(height * 0.3, height * 0.46)
      );
      const g = this.add.graphics();
      const tint = Phaser.Utils.Array.GetRandom([COLORS.sun, COLORS.pink, COLORS.white]);
      // Wings need to be clearly wider than the body, or the whole thing reads as a
      // vertical sliver at this size.
      g.fillStyle(tint, 0.95);
      g.fillEllipse(-10, -4, 20, 17);
      g.fillEllipse(10, -4, 20, 17);
      g.fillStyle(tint, 0.7);
      g.fillEllipse(-8, 7, 15, 13);
      g.fillEllipse(8, 7, 15, 13);
      g.fillStyle(COLORS.white, 0.5);
      g.fillCircle(-11, -6, 3);
      g.fillCircle(11, -6, 3);
      g.fillStyle(COLORS.ink, 0.75);
      g.fillRoundedRect(-1.5, -9, 3, 19, 1.5);
      g.lineStyle(1.2, COLORS.ink, 0.6);
      g.lineBetween(-1, -9, -5, -14);
      g.lineBetween(1, -9, 5, -14);
      b.add(g);
      this.background.add(b);

      this.tweens.add({
        targets: b,
        x: Phaser.Math.Between(90, width - 120),
        y: Phaser.Math.Between(height * 0.26, height * 0.5),
        duration: 4000 + i * 1100,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      if (!reduceMotion()) {
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
}
