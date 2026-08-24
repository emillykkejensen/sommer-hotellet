import Phaser from 'phaser';
import { COLORS, LINE } from '../config';
import { gameState, LOUNGER_COUNT } from '../state/GameState';
import {
  showConfetti, showHearts, showPraise, showSparkle, showSplash, showStarBurst, showToast,
} from '../objects/FeedbackEffects';
import { addBackButton, addSceneTitle, addSoundToggle, addStarCounter, award } from '../ui/Chrome';
import {
  addBirds, caption, drawHead, drawPalm, drawSun, gradientBand, progressBar,
  shadow, tappable,
} from '../helpers/Draw';
import { bob, reduceMotion } from '../helpers/Motion';
import { sfx } from '../helpers/AudioManager';
import { BaseScene } from './BaseScene';

export class PoolScene extends BaseScene {
  private sliding = false;

  constructor() {
    super({ key: 'PoolScene' });
  }

  protected buildBackground(): void {
    const { width, height } = this.scale;

    this.bg(gradientBand(this, 0, height * 0.34, COLORS.skyLight, COLORS.sky));

    // A strip of sea on the horizon: this is a summer hotel, and the old version's
    // beach ran straight into the sky.
    this.bg(this.drawSea(height * 0.28, 30));

    this.bg(gradientBand(this, height * 0.3, height * 0.7, COLORS.sandLight, COLORS.sandDeep));

    // scattered pebbles and shells for texture
    const g = this.add.graphics();
    for (let i = 0; i < 26; i++) {
      g.fillStyle(COLORS.sandDeep, 0.45);
      g.fillCircle(
        Phaser.Math.Between(10, width - 10),
        Phaser.Math.Between(height * 0.34, height - 8),
        Phaser.Math.Between(2, 4)
      );
    }
    for (let i = 0; i < 5; i++) {
      const sx = Phaser.Math.Between(30, width - 30);
      const sy = Phaser.Math.Between(height * 0.36, height - 14);
      g.fillStyle(COLORS.cream);
      g.fillEllipse(sx, sy, 13, 10);
      g.lineStyle(1, COLORS.sandDeep, 0.8);
      for (let r = -2; r <= 2; r++) g.lineBetween(sx, sy + 4, sx + r * 3.5, sy - 4);
    }
    this.bg(g);

    this.bg(this.drawPoolBasin(width / 2, height * 0.55));
    // Up out of the way of the first lounger, whose position the tests pin.
    this.bg(drawPalm(this, 58, height * 0.35, 1.2));
  }

  protected buildAmbient(): void {
    const { width, height } = this.scale;
    drawSun(this, width - 74, 128, 26);
    addBirds(this, 2, 60, 34);
    this.addWaterSurface(width / 2, height * 0.55);
    // No umbrella: the right-hand sand it was meant to fill is taken by the slide tower
    // and two loungers, and every position that cleared them collided with the palm or
    // the sun instead. The scene has enough going on without it.
    this.amb(this.drawBeachBall(258, height * 0.36));
  }

  protected buildChrome(): void {
    addBackButton(this);
    addStarCounter(this);
    addSoundToggle(this);
    addSceneTitle(this, 'Swimmingpoolen', COLORS.water);
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

    const bar = this.add.container(width / 2, height - 52);
    bar.add(progressBar(this, 0, 0, 210, 14, laid / LOUNGER_COUNT,
      allLaid ? COLORS.green : COLORS.water));
    this.dyn(bar);
  }

  /** Distant sea with a bobbing sailing boat on it. */
  private drawSea(y: number, h: number): Phaser.GameObjects.Graphics {
    const { width } = this.scale;
    const g = this.add.graphics();

    g.fillStyle(COLORS.waterDeep);
    g.fillRect(0, y, width, h);
    g.fillStyle(COLORS.water);
    g.fillRect(0, y + 5, width, h - 5);

    g.lineStyle(2, COLORS.waterLight, 0.7);
    for (let i = 0; i < 7; i++) {
      const sx = 40 + i * 140;
      const sy = y + 10 + (i % 3) * 7;
      g.beginPath();
      g.moveTo(sx, sy);
      for (let dx = 0; dx <= 44; dx += 4) g.lineTo(sx + dx, sy + Math.sin(dx * 0.3) * 2.2);
      g.strokePath();
    }

    // a boat, small and far away
    const bx = width * 0.72;
    g.fillStyle(COLORS.white);
    g.fillTriangle(bx, y + 2, bx, y - 20, bx + 15, y + 2);
    g.lineStyle(LINE.hair, COLORS.outline, 0.8);
    g.strokeTriangle(bx, y + 2, bx, y - 20, bx + 15, y + 2);
    g.fillStyle(COLORS.red);
    g.fillTriangle(bx - 12, y + 3, bx + 17, y + 3, bx + 11, y + 10);
    g.lineStyle(LINE.hair, COLORS.outline, 0.8);
    g.strokeTriangle(bx - 12, y + 3, bx + 17, y + 3, bx + 11, y + 10);

    return g;
  }

  /**
   * The pool basin — static, so it goes into the baked scenery. Only the moving surface
   * line and the tap zone stay live; see `addWaterSurface`.
   */
  private drawPoolBasin(cx: number, cy: number): Phaser.GameObjects.Graphics {
    const g = this.add.graphics();

    shadow(g, cx - 200, cy - 88, 400, 176, 28, 6, 0.2);

    // coping stones round the edge
    g.fillStyle(COLORS.stone);
    g.fillRoundedRect(cx - 200, cy - 88, 400, 176, 28);
    g.fillStyle(COLORS.white);
    g.fillRoundedRect(cx - 193, cy - 81, 386, 162, 24);
    g.lineStyle(LINE.base, COLORS.outline, 0.85);
    g.strokeRoundedRect(cx - 200, cy - 88, 400, 176, 28);
    // joints between the slabs
    g.lineStyle(LINE.hair, COLORS.stoneDeep, 0.9);
    for (let i = 1; i < 10; i++) {
      const px = cx - 200 + i * 40;
      g.lineBetween(px, cy - 88, px, cy - 81);
      g.lineBetween(px, cy + 81, px, cy + 88);
    }

    // water
    g.fillStyle(COLORS.waterDeep);
    g.fillRoundedRect(cx - 182, cy - 70, 364, 140, 20);
    g.fillStyle(COLORS.water);
    g.fillRoundedRect(cx - 182, cy - 70, 364, 126, 20);
    g.fillStyle(COLORS.waterLight, 0.5);
    g.fillEllipse(cx - 62, cy - 32, 124, 28);
    g.fillEllipse(cx + 74, cy + 10, 90, 22);
    g.fillStyle(COLORS.white, 0.3);
    g.fillEllipse(cx - 100, cy - 50, 52, 13);
    g.lineStyle(LINE.base, COLORS.outline, 0.7);
    g.strokeRoundedRect(cx - 182, cy - 70, 364, 140, 20);

    // tiled waterline
    g.fillStyle(COLORS.waterLight, 0.8);
    for (let i = 0; i < 22; i++) {
      g.fillRect(cx - 178 + i * 16.5, cy - 68, 11, 5);
    }

    // ladder at the near edge
    const lx = cx + 120;
    g.lineStyle(4.5, COLORS.stone);
    g.lineBetween(lx, cy + 70, lx, cy + 92);
    g.lineBetween(lx + 22, cy + 70, lx + 22, cy + 92);
    g.lineStyle(3.5, COLORS.stoneDeep);
    g.lineBetween(lx, cy + 78, lx + 22, cy + 78);
    g.lineBetween(lx, cy + 88, lx + 22, cy + 88);

    return g;
  }

  /**
   * The animated water surface and the tap-to-splash zone.
   *
   * Kept out of the baked layer for the obvious reason, and kept as one redrawn
   * Graphics on a timer rather than a per-frame update.
   */
  private addWaterSurface(cx: number, cy: number): void {
    const wave = this.add.graphics().setDepth(6);
    let offset = 0;
    this.time.addEvent({
      delay: 90,
      loop: true,
      callback: () => {
        if (!wave.active) return;
        wave.clear();
        wave.lineStyle(2.5, COLORS.white, 0.35);
        [0, 34].forEach((band, i) => {
          wave.beginPath();
          wave.moveTo(cx - 168, cy + band);
          for (let x = cx - 168; x <= cx + 168; x += 10) {
            wave.lineTo(x, cy + band + Math.sin((x + offset + i * 60) * 0.045) * 5);
          }
          wave.strokePath();
        });
        offset += 14;
      },
    });
    this.amb(wave);

    const zone = this.add.zone(cx, cy, 356, 132).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', (p: Phaser.Input.Pointer) => {
      showSplash(this, p.worldX, p.worldY);
      sfx('splash');
    });
    this.amb(zone);
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

      shadow(g, -32, 18, 64, 10, 5, 2, 0.16);
      // seat and backrest
      g.fillStyle(COLORS.woodDeep);
      g.fillRoundedRect(-30, -4, 60, 22, 6);
      g.fillStyle(COLORS.wood);
      g.fillRoundedRect(-30, -4, 60, 13, 6);
      g.lineStyle(LINE.thin, COLORS.outline, 0.85);
      g.strokeRoundedRect(-30, -4, 60, 22, 6);
      g.fillStyle(COLORS.woodDeep);
      g.fillRoundedRect(-28, -21, 14, 18, 5);
      g.lineStyle(LINE.thin, COLORS.outline, 0.85);
      g.strokeRoundedRect(-28, -21, 14, 18, 5);
      // feet
      g.fillStyle(COLORS.woodDeep);
      g.fillRoundedRect(-26, 18, 5, 10, 2);
      g.fillRoundedRect(21, 18, 5, 10, 2);
      c.add(g);

      if (hasTowel) {
        const towel = this.add.graphics();
        const tone = i % 2 === 0 ? COLORS.pink : COLORS.waterLight;
        towel.fillStyle(tone);
        towel.fillRoundedRect(-27, -7, 54, 18, 4);
        towel.fillStyle(COLORS.white, 0.6);
        towel.fillRect(-27, -3, 54, 3.5);
        towel.fillRect(-27, 4, 54, 3.5);
        towel.lineStyle(LINE.thin, COLORS.outline, 0.8);
        towel.strokeRoundedRect(-27, -7, 54, 18, 4);
        c.add(towel);
      }

      c.add(caption(this, 0, hasTowel ? 34 : 36,
        hasTowel ? 'Klar' : 'Læg håndklæde', hasTowel ? 'done' : 'idle'));
      this.dyn(c);

      if (hasTowel) return;

      tappable(this, c, 76, 54, () => {
        if (!gameState.layTowel(i)) return;
        award(this, 1, spot.x, spot.y - 6);
        showStarBurst(this, spot.x, spot.y - 6);

        if (gameState.pool.towels.every(Boolean)) {
          sfx('success');
          showSparkle(this, width / 2, height * 0.55, 300, 140);
          showConfetti(this, width / 2, height * 0.38, 30);
          showPraise(this, width / 2, height * 0.3);
          showToast(this, width / 2, height * 0.36, 'Alle solstole er klar', '#4A7F33');
          award(this, 2, spot.x, spot.y - 6);
        }
        this.refresh();
      });
    });
  }

  private buildSlide(x: number, y: number): void {
    const c = this.add.container(x, y);
    const g = this.add.graphics();

    // tower legs
    g.fillStyle(COLORS.stoneDeep);
    g.fillRoundedRect(24, -60, 14, 122, 6);
    g.fillStyle(COLORS.stone);
    g.fillRoundedRect(-2, -60, 14, 122, 6);
    g.lineStyle(LINE.thin, COLORS.outline, 0.8);
    g.strokeRoundedRect(24, -60, 14, 122, 6);
    g.strokeRoundedRect(-2, -60, 14, 122, 6);
    // ladder rungs
    for (let i = 0; i < 4; i++) {
      g.fillStyle(COLORS.stoneDeep);
      g.fillRoundedRect(-2, -46 + i * 26, 40, 7, 3.5);
      g.lineStyle(LINE.hair, COLORS.outline, 0.8);
      g.strokeRoundedRect(-2, -46 + i * 26, 40, 7, 3.5);
    }
    // platform
    g.fillStyle(COLORS.roofDeep);
    g.fillRoundedRect(-14, -72, 64, 12, 5);
    g.lineStyle(LINE.thin, COLORS.outline, 0.85);
    g.strokeRoundedRect(-14, -72, 64, 12, 5);

    // flume, drawn as a thick stroke sandwich
    g.lineStyle(19, COLORS.outline, 0.85);
    g.beginPath();
    g.moveTo(-6, -62);
    g.lineTo(-96, 44);
    g.strokePath();
    g.lineStyle(15, COLORS.roofDeep);
    g.beginPath();
    g.moveTo(-6, -62);
    g.lineTo(-96, 44);
    g.strokePath();
    g.lineStyle(9, COLORS.red);
    g.beginPath();
    g.moveTo(-6, -62);
    g.lineTo(-96, 44);
    g.strokePath();
    g.lineStyle(3, COLORS.white, 0.55);
    g.beginPath();
    g.moveTo(-10, -62);
    g.lineTo(-100, 44);
    g.strokePath();

    c.add(g);
    c.add(caption(this, 2, 102, 'Prøv rutsjebanen'));
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
          sfx('splash');
          showSplash(this, x - 100, y + 52);
          showStarBurst(this, x - 100, y + 30, 4);
          showToast(this, x - 110, y - 10, 'Juhuu!', '#B55345');
          award(this, 1, x - 100, y + 30);
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

    shadow(g, -66, -14, 132, 34, 8, 3, 0.2);
    g.fillStyle(COLORS.woodDeep);
    g.fillRoundedRect(-66, -14, 132, 34, 8);
    g.lineStyle(LINE.thin, COLORS.outline, 0.85);
    g.strokeRoundedRect(-66, -14, 132, 34, 8);
    g.fillStyle(COLORS.woodLight);
    g.fillRoundedRect(-70, -21, 140, 13, 6);
    g.lineStyle(LINE.thin, COLORS.outline, 0.85);
    g.strokeRoundedRect(-70, -21, 140, 13, 6);
    // a straw roof edge, so the bar reads as a beach bar
    g.fillStyle(COLORS.sand);
    for (let i = 0; i < 9; i++) {
      g.fillTriangle(-66 + i * 15, -21, -52 + i * 15, -21, -59 + i * 15, -13);
    }
    c.add(g);

    const drinks = [
      { color: COLORS.orange, x: -44 },
      { color: COLORS.pink, x: -15 },
      { color: COLORS.green, x: 14 },
      { color: COLORS.purple, x: 43 },
    ];

    drinks.forEach(d => {
      const glass = this.add.graphics();
      glass.fillStyle(COLORS.white, 0.8);
      glass.fillRoundedRect(-10, -17, 20, 33, { tl: 3, tr: 3, bl: 9, br: 9 });
      glass.fillStyle(d.color);
      glass.fillRoundedRect(-8, -5, 16, 19, { tl: 0, tr: 0, bl: 7, br: 7 });
      glass.fillStyle(COLORS.white, 0.65);
      glass.fillRoundedRect(-8, -15, 6, 26, 3);
      glass.lineStyle(LINE.thin, COLORS.outline, 0.85);
      glass.strokeRoundedRect(-10, -17, 20, 33, { tl: 3, tr: 3, bl: 9, br: 9 });
      // straw and a slice of fruit on the rim
      glass.fillStyle(COLORS.red);
      glass.fillRoundedRect(2, -27, 3.5, 14, 1.75);
      glass.fillStyle(COLORS.sun);
      glass.fillCircle(-9, -18, 5);
      glass.lineStyle(LINE.hair, COLORS.outline, 0.8);
      glass.strokeCircle(-9, -18, 5);

      const holder = this.add.container(d.x, -42, [glass]);
      holder.setSize(30, 46);
      holder.setInteractive({ useHandCursor: true });
      holder.on('pointerdown', () => {
        sfx('pop');
        showHearts(this, x + d.x, y - 58);
        this.tweens.add({ targets: holder, scale: 1.3, duration: 140, yoyo: true });
      });
      c.add(holder);
    });

    c.add(caption(this, 0, 32, 'Drinks'));
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
      ring.fillCircle(0, 6, 22);
      ring.fillStyle(COLORS.red);
      ring.fillCircle(0, 6, 20);
      ring.fillStyle(COLORS.white);
      ring.fillCircle(0, 6, 11);
      ring.fillStyle(COLORS.water, 0.6);
      ring.fillCircle(0, 6, 9);
      ring.lineStyle(LINE.thin, COLORS.outline, 0.85);
      ring.strokeCircle(0, 6, 21);
      ring.strokeCircle(0, 6, 10);
      c.add(ring);
      c.add(drawHead(this, 0, -4, guest.color, 0.8));

      this.dyn(c);
      bob(this, c, 4, 1500 + i * 260);
    });
  }

  // ---------- ambient props ----------

  /** A beach ball that never stops bouncing gently. */
  private drawBeachBall(x: number, y: number): Phaser.GameObjects.Container {
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    const r = 18;

    g.fillStyle(COLORS.white);
    g.fillCircle(0, 0, r);
    const wedges = [COLORS.red, COLORS.sun, COLORS.water, COLORS.green];
    wedges.forEach((col, i) => {
      g.fillStyle(col);
      g.slice(0, 0, r, (i / 4) * Math.PI * 2, ((i + 0.5) / 4) * Math.PI * 2, false);
      g.fillPath();
    });
    g.fillStyle(COLORS.white, 0.45);
    g.fillCircle(-6, -7, 5);
    g.lineStyle(LINE.thin, COLORS.outline, 0.85);
    g.strokeCircle(0, 0, r);

    c.add(g);

    if (!reduceMotion()) {
      this.tweens.add({
        targets: c,
        y: y - 34,
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeOut',
      });
      this.tweens.add({ targets: c, angle: 360, duration: 5000, repeat: -1, ease: 'Linear' });
    }
    return c;
  }
}
