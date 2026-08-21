import Phaser from 'phaser';
import { COLORS } from '../config';
import { gameState, LOUNGER_COUNT } from '../state/GameState';
import { showHearts, showSparkle, showSplash, showStarBurst, showToast } from '../objects/FeedbackEffects';
import { addBackButton, addSceneTitle, addStarCounter, award } from '../ui/Chrome';
import { caption, drawHead, drawSun, gradientBand, shadow, tappable } from '../helpers/Draw';
import { BaseScene } from './BaseScene';

export class PoolScene extends BaseScene {
  private sliding = false;

  constructor() {
    super({ key: 'PoolScene' });
  }

  protected buildBackground(): void {
    const { width, height } = this.scale;

    this.background.add(gradientBand(this, 0, height * 0.34, COLORS.skyLight, COLORS.sky));
    this.background.add(gradientBand(this, height * 0.3, height * 0.7, COLORS.sandLight, COLORS.sandDeep));

    drawSun(this, width - 68, 124, 24);

    // scattered pebbles for texture
    const g = this.add.graphics();
    for (let i = 0; i < 26; i++) {
      g.fillStyle(COLORS.sandDeep, 0.4);
      g.fillCircle(
        Phaser.Math.Between(10, width - 10),
        Phaser.Math.Between(height * 0.34, height - 8),
        Phaser.Math.Between(2, 4)
      );
    }
    this.background.add(g);
    this.background.add(this.drawPool(width / 2, height * 0.55));
  }

  protected buildChrome(): void {
    addBackButton(this);
    addStarCounter(this);
    addSceneTitle(this, 'Swimmingpoolen', '#3E96C4');
  }

  protected buildDynamic(): void {
    const { width, height } = this.scale;

    this.buildLoungers();
    this.buildSlide(width - 198, height * 0.42);
    this.buildDrinkBar(268, height * 0.9);
    this.buildSwimmers();

    const laid = gameState.pool.towels.filter(Boolean).length;
    const allLaid = laid === LOUNGER_COUNT;
    this.dyn(caption(this, width / 2, height - 24,
      allLaid ? 'Alle solstole er klar' : `Læg håndklæder på solstolene — ${laid} af ${LOUNGER_COUNT}`,
      allLaid ? 'done' : 'idle'));
  }

  private drawPool(cx: number, cy: number): Phaser.GameObjects.Container {
    const c = this.add.container(0, 0);
    const g = this.add.graphics();

    shadow(g, cx - 200, cy - 88, 400, 176, 28, 5, 0.16);
    g.fillStyle(COLORS.white);
    g.fillRoundedRect(cx - 200, cy - 88, 400, 176, 28);
    g.fillStyle(COLORS.stone, 0.5);
    g.fillRoundedRect(cx - 200, cy - 88, 400, 176, 28);
    g.fillStyle(COLORS.white);
    g.fillRoundedRect(cx - 193, cy - 81, 386, 162, 24);
    g.fillStyle(COLORS.waterDeep);
    g.fillRoundedRect(cx - 182, cy - 70, 364, 140, 20);
    g.fillStyle(COLORS.water);
    g.fillRoundedRect(cx - 182, cy - 70, 364, 126, 20);
    g.fillStyle(COLORS.waterLight, 0.45);
    g.fillEllipse(cx - 62, cy - 32, 124, 28);
    g.fillEllipse(cx + 74, cy + 10, 90, 22);
    g.fillStyle(COLORS.white, 0.25);
    g.fillEllipse(cx - 100, cy - 50, 52, 13);
    c.add(g);


    // animated surface line
    const wave = this.add.graphics();
    c.add(wave);
    let offset = 0;
    this.time.addEvent({
      delay: 90,
      loop: true,
      callback: () => {
        if (!wave.active) return;
        wave.clear();
        wave.lineStyle(2, COLORS.white, 0.28);
        wave.beginPath();
        wave.moveTo(cx - 168, cy);
        for (let x = cx - 168; x <= cx + 168; x += 10) {
          wave.lineTo(x, cy + Math.sin((x + offset) * 0.045) * 5);
        }
        wave.strokePath();
        offset += 14;
      },
    });

    const zone = this.add.zone(cx, cy, 356, 132).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', (p: Phaser.Input.Pointer) => showSplash(this, p.worldX, p.worldY));
    c.add(zone);

    return c;
  }

  private buildLoungers(): void {
    const { width, height } = this.scale;
    const spots = [
      { x: 92, y: height * 0.5 },
      { x: 92, y: height * 0.73 },
      { x: width - 92, y: height * 0.68 },
      { x: width - 92, y: height * 0.88 },
    ];

    spots.forEach((spot, i) => {
      const hasTowel = gameState.pool.towels[i];
      const c = this.add.container(spot.x, spot.y);
      const g = this.add.graphics();

      shadow(g, -32, 18, 64, 10, 5, 2, 0.14);
      g.fillStyle(COLORS.woodDeep);
      g.fillRoundedRect(-30, -4, 60, 22, 6);
      g.fillStyle(COLORS.wood);
      g.fillRoundedRect(-30, -4, 60, 12, 6);
      g.fillStyle(COLORS.woodDeep);
      g.fillRoundedRect(-27, -20, 13, 17, 5);
      g.fillRoundedRect(-26, 18, 5, 9, 2);
      g.fillRoundedRect(21, 18, 5, 9, 2);
      c.add(g);

      if (hasTowel) {
        const towel = this.add.graphics();
        const shade = i % 2 === 0 ? COLORS.pink : COLORS.waterLight;
        towel.fillStyle(shade);
        towel.fillRoundedRect(-27, -6, 54, 17, 4);
        towel.fillStyle(COLORS.white, 0.55);
        towel.fillRect(-27, -2, 54, 3.5);
        towel.fillRect(-27, 5, 54, 3.5);
        c.add(towel);
      }

      c.add(caption(this, 0, hasTowel ? 34 : 36,
        hasTowel ? 'Klar' : 'Læg håndklæde', hasTowel ? 'done' : 'idle'));
      this.dyn(c);

      if (hasTowel) return;

      tappable(this, c, 76, 54, () => {
        if (!gameState.layTowel(i)) return;
        award(this);
        showStarBurst(this, spot.x, spot.y - 6);

        if (gameState.pool.towels.every(Boolean)) {
          showSparkle(this, width / 2, height * 0.55, 300, 140);
          showToast(this, width / 2, height * 0.3, 'Alle solstole er klar', '#4A7F33');
          award(this, 2);
        }
        this.refresh();
      });
    });
  }

  private buildSlide(x: number, y: number): void {
    const c = this.add.container(x, y);
    const g = this.add.graphics();

    // tower
    g.fillStyle(COLORS.stoneDeep);
    g.fillRoundedRect(24, -60, 13, 122, 6);
    g.fillStyle(COLORS.stone);
    g.fillRoundedRect(-2, -60, 13, 122, 6);
    for (let i = 0; i < 4; i++) {
      g.fillStyle(COLORS.stoneDeep);
      g.fillRoundedRect(-2, -46 + i * 26, 39, 6, 3);
    }
    // platform
    g.fillStyle(COLORS.roofDeep);
    g.fillRoundedRect(-14, -70, 62, 11, 5);

    // flume
    g.lineStyle(17, COLORS.roofDeep);
    g.beginPath();
    g.moveTo(-6, -62);
    g.lineTo(-96, 44);
    g.strokePath();
    g.lineStyle(11, COLORS.red);
    g.beginPath();
    g.moveTo(-6, -62);
    g.lineTo(-96, 44);
    g.strokePath();
    g.lineStyle(3, COLORS.white, 0.5);
    g.beginPath();
    g.moveTo(-9, -62);
    g.lineTo(-99, 44);
    g.strokePath();

    c.add(g);
    c.add(caption(this, 2, 100, 'Prøv rutsjebanen'));
    this.dyn(c);

    tappable(this, c, 120, 140, () => {
      if (this.sliding) return;
      this.sliding = true;

      const rider = this.add.container(x - 6, y - 62, [drawHead(this, 0, 0, COLORS.yellow, 0.9)])
        .setDepth(870);

      this.tweens.add({
        targets: rider,
        x: x - 96,
        y: y + 44,
        angle: -40,
        duration: 620,
        ease: 'Quad.easeIn',
        onComplete: () => {
          showSplash(this, x - 100, y + 52);
          showStarBurst(this, x - 100, y + 30, 4);
          showToast(this, x - 110, y - 10, 'Juhuu!', '#B9584A');
          award(this);
          this.events.emit('starsChanged', gameState.stars);
          this.tweens.add({
            targets: rider,
            alpha: 0,
            duration: 320,
            delay: 260,
            onComplete: () => {
              rider.destroy();
              this.sliding = false;
            },
          });
        },
      });
    });
  }

  private buildDrinkBar(x: number, y: number): void {
    const c = this.add.container(x, y);
    const g = this.add.graphics();

    shadow(g, -66, -14, 132, 34, 8, 3, 0.16);
    g.fillStyle(COLORS.woodDeep);
    g.fillRoundedRect(-66, -14, 132, 34, 8);
    g.fillStyle(COLORS.woodLight);
    g.fillRoundedRect(-70, -20, 140, 12, 6);
    c.add(g);

    const drinks = [
      { color: COLORS.orange, x: -44 },
      { color: COLORS.pink, x: -15 },
      { color: COLORS.green, x: 14 },
      { color: COLORS.purple, x: 43 },
    ];

    drinks.forEach(d => {
      const glass = this.add.graphics();
      glass.fillStyle(COLORS.white, 0.7);
      glass.fillRoundedRect(-10, -17, 20, 33, { tl: 3, tr: 3, bl: 9, br: 9 });
      glass.fillStyle(d.color, 0.92);
      glass.fillRoundedRect(-8, -5, 16, 19, { tl: 0, tr: 0, bl: 7, br: 7 });
      glass.fillStyle(COLORS.white, 0.6);
      glass.fillRoundedRect(-8, -15, 6, 26, 3);
      // straw
      glass.fillStyle(COLORS.red);
      glass.fillRoundedRect(2, -26, 3, 13, 1.5);

      const holder = this.add.container(d.x, -40, [glass]);
      holder.setSize(30, 46);
      holder.setInteractive({ useHandCursor: true });
      holder.on('pointerdown', () => {
        showHearts(this, x + d.x, y - 56);
        this.tweens.add({ targets: holder, scale: 1.3, duration: 140, yoyo: true });
      });
      c.add(holder);
    });

    c.add(caption(this, 0, 30, 'Drinks'));
    this.dyn(c);
  }

  private buildSwimmers(): void {
    const { width, height } = this.scale;
    const guests = gameState.getCheckedInGuests().slice(0, 3);
    const spots = [
      { x: width / 2 - 82, y: height * 0.53 },
      { x: width / 2 + 30, y: height * 0.5 },
      { x: width / 2 - 16, y: height * 0.6 },
    ];

    guests.forEach((guest, i) => {
      const spot = spots[i];
      const c = this.add.container(spot.x, spot.y);

      // ring float
      const ring = this.add.graphics();
      ring.fillStyle(COLORS.white);
      ring.fillCircle(0, 6, 21);
      ring.fillStyle(COLORS.red);
      ring.fillCircle(0, 6, 19);
      ring.fillStyle(COLORS.white);
      ring.fillCircle(0, 6, 11);
      ring.fillStyle(COLORS.water, 0.55);
      ring.fillCircle(0, 6, 9);
      c.add(ring);
      c.add(drawHead(this, 0, -4, guest.color, 0.8));

      this.dyn(c);

      this.tweens.add({
        targets: c,
        y: spot.y - 4,
        duration: 1500 + i * 260,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });
  }
}
