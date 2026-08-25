import Phaser from 'phaser';
import { COLORS, LINE, SIZE, text } from '../config';
import { GuestData, gameState, LOUNGER_COUNT } from '../state/GameState';
import { showHearts, showSparkle, showSplash, showStarBurst, showToast } from '../objects/FeedbackEffects';
import { drawPatienceBar, drawSpeechBubble, guestLine, sayOnce } from '../objects/Guests';
import { addBackButton, addSceneTitle, addStarCounter, award } from '../ui/Chrome';
import { rewardFor } from '../helpers/Reward';
import { placeDecorations } from './ShopScene';
import { addBirds, caption, drawHead, drawPerson, drawSun, gradientBand, shadow, tappable } from '../helpers/Draw';
import { audio } from '../helpers/Audio';
import { dur, reduceMotion } from '../helpers/Motion';
import { BaseScene } from './BaseScene';

export class PoolScene extends BaseScene {
  private sliding = false;

  constructor() {
    super({ key: 'PoolScene' });
  }

  private loungerSpot(index: number): { x: number; y: number } {
    const { width, height } = this.scale;
    // Two down each side, the right-hand pair pushed lower so their captions clear the
    // water slide's.
    const left = index < 2;
    return {
      x: left ? 88 : width - 88,
      y: height * (left ? (index === 0 ? 0.44 : 0.72) : (index === 2 ? 0.58 : 0.86)),
    };
  }

  protected buildBackground(): void {
    const { width, height } = this.scale;

    this.background.add(gradientBand(this, 0, height * 0.34, COLORS.skyLight, COLORS.sky));
    this.background.add(gradientBand(this, height * 0.3, height * 0.7, COLORS.sandLight, COLORS.sandDeep));

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
    this.background.add(this.drawPoolBasin(width / 2, height * 0.53));
  }

  /**
   * Scenery that moves under its own power, so it must not be baked into the background
   * texture: the sun, the water surface, and the zone that turns a tap into a splash.
   */
  protected buildAmbient(): void {
    const { width, height } = this.scale;
    drawSun(this, 96, 118, 26);
    addBirds(this, 2, 58, 32);
    this.addWaterSurface(width / 2, height * 0.53);
    this.amb(this.drawBeachBall(228, height * 0.33));
  }

  protected buildChrome(): void {
    addBackButton(this);
    addStarCounter(this);
    addSceneTitle(this, 'Swimmingpoolen', COLORS.water);
  }

  protected buildDynamic(): void {
    const { width, height } = this.scale;

    placeDecorations(this, 'pool', this.dynamic);
    this.buildLoungers();
    this.buildSlide(width - 180, height * 0.28);
    this.buildDrinkBar(170, height * 0.93);
    this.buildSwimmers();
    this.buildWaitingGuests();

    const laid = gameState.pool.towels.filter(Boolean).length;
    const waiting = gameState.guestsAt('pool').filter(g => g.settledAt === null).length;

    let message: string;
    if (waiting > 0) {
      message = laid === LOUNGER_COUNT
        ? 'Alle solstole er taget — en gæst må vente'
        : 'En gæst venter — læg et håndklæde på en solstol';
    } else if (laid === LOUNGER_COUNT) {
      message = 'Alle solstole er klar';
    } else {
      message = `Læg håndklæder på solstolene — ${laid} af ${LOUNGER_COUNT}`;
    }

    this.dyn(caption(this, width / 2, height - 18, message,
      waiting === 0 && laid === LOUNGER_COUNT ? 'done' : 'idle'));
  }

  private drawPoolBasin(cx: number, cy: number): Phaser.GameObjects.Container {
    const c = this.add.container(0, 0);
    const g = this.add.graphics();

    shadow(g, cx - 196, cy - 86, 392, 172, 28, 5, 0.16);
    g.fillStyle(COLORS.white);
    g.fillRoundedRect(cx - 196, cy - 86, 392, 172, 28);
    g.fillStyle(COLORS.stone, 0.5);
    g.fillRoundedRect(cx - 196, cy - 86, 392, 172, 28);
    g.fillStyle(COLORS.white);
    g.fillRoundedRect(cx - 189, cy - 79, 378, 158, 24);
    g.fillStyle(COLORS.waterDeep);
    g.fillRoundedRect(cx - 178, cy - 68, 356, 136, 20);
    g.fillStyle(COLORS.water);
    g.fillRoundedRect(cx - 178, cy - 68, 356, 122, 20);
    g.fillStyle(COLORS.waterLight, 0.45);
    g.fillEllipse(cx - 60, cy - 31, 120, 27);
    g.fillEllipse(cx + 72, cy + 10, 88, 21);
    g.fillStyle(COLORS.white, 0.25);
    g.fillEllipse(cx - 98, cy - 49, 50, 13);
    c.add(g);

    return c;
  }


  /**
   * The animated water surface and the tap-to-splash zone.
   *
   * Kept out of the baked layer for the obvious reason — a baked wave does not move, and a
   * baked zone is destroyed along with the container it was drawn from.
   */
  private addWaterSurface(cx: number, cy: number): void {
    // animated surface line
    const wave = this.add.graphics();
    this.amb(wave);
    let offset = 0;
    this.time.addEvent({
      delay: 90,
      loop: true,
      callback: () => {
        if (!wave.active) return;
        wave.clear();
        wave.lineStyle(2, COLORS.white, 0.28);
        wave.beginPath();
        wave.moveTo(cx - 164, cy);
        for (let x = cx - 164; x <= cx + 164; x += 10) {
          wave.lineTo(x, cy + Math.sin((x + offset) * 0.045) * 5);
        }
        wave.strokePath();
        offset += 14;
      },
    });

    const zone = this.add.zone(cx, cy, 348, 128).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', (p: Phaser.Input.Pointer) => {
      audio.splash();
      showSplash(this, p.worldX, p.worldY);
    });
    this.amb(zone);

  }

  /** A beach ball that never stops bouncing gently. */
  private drawBeachBall(x: number, y: number): Phaser.GameObjects.Container {
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    const r = 17;

    g.fillStyle(COLORS.white);
    g.fillCircle(0, 0, r);
    [COLORS.red, COLORS.sun, COLORS.water, COLORS.green].forEach((col, i) => {
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
        targets: c, y: y - 32, duration: 900,
        yoyo: true, repeat: -1, ease: 'Sine.easeOut',
      });
      this.tweens.add({ targets: c, angle: 360, duration: 5000, repeat: -1, ease: 'Linear' });
    }
    return c;
  }

  private buildLoungers(): void {
    for (let i = 0; i < LOUNGER_COUNT; i++) {
      const spot = this.loungerSpot(i);
      const hasTowel = gameState.pool.towels[i];
      const taken = gameState.guestsAt('pool').some(g => g.lounger === i);

      const c = this.add.container(spot.x, spot.y);
      const g = this.add.graphics();

      shadow(g, -34, 20, 68, 11, 5, 2, 0.14);
      g.fillStyle(COLORS.woodDeep);
      g.fillRoundedRect(-32, -4, 64, 24, 6);
      g.fillStyle(COLORS.wood);
      g.fillRoundedRect(-32, -4, 64, 13, 6);
      g.fillStyle(COLORS.woodDeep);
      g.fillRoundedRect(-29, -22, 14, 19, 5);
      g.fillRoundedRect(-28, 20, 6, 10, 2.5);
      g.fillRoundedRect(22, 20, 6, 10, 2.5);
      c.add(g);

      if (hasTowel) {
        const towel = this.add.graphics();
        const shade = i % 2 === 0 ? COLORS.pink : COLORS.waterLight;
        towel.fillStyle(shade);
        towel.fillRoundedRect(-29, -7, 58, 19, 4);
        towel.fillStyle(COLORS.white, 0.55);
        towel.fillRect(-29, -2, 58, 4);
        towel.fillRect(-29, 6, 58, 4);
        c.add(towel);
      }

      if (taken) {
        // a sunhat left on the chair, so an occupied lounger reads as occupied
        const hat = this.add.graphics();
        hat.fillStyle(COLORS.sun);
        hat.fillEllipse(6, 0, 30, 13);
        hat.fillStyle(COLORS.sunDeep);
        hat.fillEllipse(6, -4, 16, 11);
        c.add(hat);
      }

      c.add(caption(this, 0, 40,
        taken ? 'I brug' : hasTowel ? 'Klar' : 'Læg håndklæde',
        hasTowel ? 'done' : 'idle'));
      this.dyn(c);

      if (hasTowel) continue;

      tappable(this, c, 84, 60, () => this.layTowel(i, spot));
    }
  }

  /**
   * Laying a towel.
   *
   * If somebody is standing there waiting for a lounger, this is the job "make the pool
   * ready for a guest" and it raises the task — unless they have already been waiting past
   * their patience, in which case it still gets done and simply does not pay.
   */
  private layTowel(index: number, spot: { x: number; y: number }): void {
    if (!gameState.layTowel(index)) return;
    const { width, height } = this.scale;
    audio.pop();
    showStarBurst(this, spot.x, spot.y - 8);

    const seated = gameState.seatPoolGuests();
    const served = seated[0];

    if (served) {
      showHearts(this, spot.x, spot.y - 30);
      if (served.late) {
        showToast(this, width / 2, height * 0.24,
          `${served.guest.name} ventede for længe — ingen stjerne`, '#B9584A');
        this.time.delayedCall(dur(300), () => this.refresh());
        return;
      }
      rewardFor(this, 'pool', { after: () => this.refresh() });
      return;
    }

    // Nobody waiting: this is getting ahead of the guests rather than serving one, so it
    // pays a plain star and never asks a question.
    const allDone = gameState.pool.towels.every(Boolean);
    if (allDone) {
      showSparkle(this, width / 2, height * 0.53, 300, 140);
      showToast(this, width / 2, height * 0.26, 'Alle solstole er klar', '#4A7F33');
      award(this, 2);
    } else {
      award(this, 1);
    }
    this.refresh();
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
    c.add(caption(this, 2, 88, 'Prøv rutsjebanen'));
    this.dyn(c);

    tappable(this, c, 120, 140, () => {
      if (this.sliding) return;
      this.sliding = true;

      const rider = this.add.container(x - 6, y - 62, [drawHead(this, 0, 0, COLORS.yellow, 0.95)])
        .setDepth(870);

      this.tweens.add({
        targets: rider,
        x: x - 96,
        y: y + 44,
        angle: -40,
        duration: 620,
        ease: 'Quad.easeIn',
        onComplete: () => {
          audio.splash();
          showSplash(this, x - 100, y + 52);
          showStarBurst(this, x - 100, y + 30, 4);
          showToast(this, x - 110, y - 10, 'Juhuu!', '#B9584A');
          award(this);
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

    shadow(g, -68, -14, 136, 34, 8, 3, 0.16);
    g.fillStyle(COLORS.woodDeep);
    g.fillRoundedRect(-68, -14, 136, 34, 8);
    g.fillStyle(COLORS.woodLight);
    g.fillRoundedRect(-72, -20, 144, 12, 6);
    c.add(g);

    const drinks = [
      { color: COLORS.orange, x: -45 },
      { color: COLORS.pink, x: -15 },
      { color: COLORS.green, x: 15 },
      { color: COLORS.purple, x: 45 },
    ];

    drinks.forEach(d => {
      const glass = this.add.graphics();
      glass.fillStyle(COLORS.white, 0.7);
      glass.fillRoundedRect(-11, -18, 22, 35, { tl: 3, tr: 3, bl: 10, br: 10 });
      glass.fillStyle(d.color, 0.92);
      glass.fillRoundedRect(-9, -5, 18, 20, { tl: 0, tr: 0, bl: 8, br: 8 });
      glass.fillStyle(COLORS.white, 0.6);
      glass.fillRoundedRect(-9, -16, 6, 27, 3);
      // straw
      glass.fillStyle(COLORS.red);
      glass.fillRoundedRect(2, -28, 3.5, 14, 1.75);

      const holder = this.add.container(d.x, -42, [glass]);
      holder.setSize(32, 48);
      holder.setInteractive({ useHandCursor: true });
      holder.on('pointerdown', () => {
        showHearts(this, x + d.x, y - 58);
        this.tweens.add({ targets: holder, scale: 1.3, duration: 140, yoyo: true });
      });
      c.add(holder);
    });

    // No caption: four coloured glasses on a bar need no label, and one here would sit on
    // top of the nearest lounger's.
    this.dyn(c);
  }

  /** Guests who got a lounger, floating about in the water. */
  private buildSwimmers(): void {
    const { width, height } = this.scale;
    const swimming = gameState.guestsAt('pool').filter(g => g.settledAt !== null);

    // Spread along the pool and staggered front to back, so that four speech bubbles can
    // all be read at once rather than stacking into one white block.
    const cx = width / 2;
    const cy = height * 0.53;
    const spots = [0, 1, 2, 3].map(i => ({
      x: cx - 140 + i * 93,
      y: cy + (i % 2 === 0 ? -34 : 20),
    }));

    swimming.forEach((guest, i) => {
      const spot = spots[i % spots.length];
      const c = this.add.container(spot.x, spot.y);

      // ring float
      const ring = this.add.graphics();
      ring.fillStyle(COLORS.white);
      ring.fillCircle(0, 6, 23);
      ring.fillStyle(COLORS.red);
      ring.fillCircle(0, 6, 21);
      ring.fillStyle(COLORS.white);
      ring.fillCircle(0, 6, 12);
      ring.fillStyle(COLORS.water, 0.55);
      ring.fillCircle(0, 6, 10);
      c.add(ring);
      c.add(drawHead(this, 0, -4, guest.color, 0.9));
      this.dyn(c);

      const line = guestLine(guest);
      sayOnce(guest, line);
      this.dyn(drawSpeechBubble(this, spot.x, spot.y - 32, line.text, line.tone, 116));

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

  /** Guests standing at the poolside with nowhere to lie down. */
  private buildWaitingGuests(): void {
    const { width, height } = this.scale;
    const waiting = gameState.guestsAt('pool').filter(g => g.settledAt === null);

    waiting.forEach((guest: GuestData, i) => {
      const x = width / 2 - (waiting.length - 1) * 58 + i * 116;
      const y = height * 0.78;

      const c = this.add.container(x, y);
      c.add(drawPerson(this, 0, 0, guest.color, 1.05));
      c.add(this.add.text(0, 50, guest.name, text(SIZE.tiny, '#5A4E42', 'bold')).setOrigin(0.5));
      this.dyn(c);

      const line = guestLine(guest);
      sayOnce(guest, line);
      this.dyn(drawSpeechBubble(this, x, y - 54, line.text, line.tone, 150));

      const bar = drawPatienceBar(this, x, y + 66, guest);
      this.dyn(bar.object);
      this.everyFrame(bar.update);
    });
  }
}
