import Phaser from 'phaser';
import { COLORS, DEPTH, FONT, LINE, rankFor, SIZE, text, textOutlined } from '../config';
import {
  addBirds, bunting, button, drawBalloon, drawCloud, drawPalm, drawStarShape,
  drawSun, gradientBand, plate, scatterFlowers, shade, shadow,
} from '../helpers/Draw';
import { addSoundToggle } from '../ui/Chrome';
import { gameState } from '../state/GameState';
import { bob, dur, popIn, reduceMotion, transition } from '../helpers/Motion';
import { flatten } from '../helpers/Flatten';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.fadeIn(dur(400));

    const horizon = height * 0.66;

    // Everything that never moves goes into one container and is baked to a single
    // texture below. See helpers/Flatten.
    const scenery = this.add.container(0, 0);
    scenery.add(gradientBand(this, 0, horizon + 4, COLORS.skyLight, COLORS.sky));
    scenery.add(this.drawHills(horizon));
    scenery.add(gradientBand(this, horizon, height - horizon, COLORS.grassLight, COLORS.grassDeep));
    // Bunting is added before the hotel so the string passes behind the building, which
    // is where a line strung between two palms would actually go.
    scenery.add(bunting(this, 70, horizon - 42, width - 70, horizon - 32, 11, 18));
    scenery.add(this.drawHotel(width / 2, height * 0.53));
    scenery.add(scatterFlowers(this, 9, horizon + 30, height - 20, 0.78, 30));
    flatten(this, scenery, DEPTH.background);

    // ...and everything with a pulse of its own stays a live object.
    drawSun(this, width - 116, 142, 34);
    addBirds(this, 3, 88, 54);

    const c1 = drawCloud(this, 150, 84, 1);
    const c2 = drawCloud(this, 660, 132, 0.68);
    if (!reduceMotion()) {
      this.tweens.add({ targets: c1, x: '+=180', duration: 22000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.tweens.add({ targets: c2, x: '-=140', duration: 18000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    drawPalm(this, 78, horizon + 34, 1.15);
    drawPalm(this, width - 74, horizon + 44, 1.3);

    drawBalloon(this, 188, 226, COLORS.red, 0.9);
    drawBalloon(this, width - 196, 248, COLORS.teal, 0.8);

    this.addTitle(width / 2, height * 0.14);

    const play = button(this, width / 2, height * 0.86, 'Spil', COLORS.green,
      () => transition(this, 'HotelMapScene', 280), 232, 64, SIZE.title);
    this.addPlayGlow(play);

    addSoundToggle(this, width - 46, 44);

    if (gameState.stars > 0) {
      // Top left, where the interiors put the back button — the only corner the title
      // screen leaves empty.
      this.addSaveBadge(0, 44);
      // A parent needs a way out of a stuck save that is not devtools.
      this.addResetLink(width / 2, height - 22);
    }

  }

  /** Two soft humps behind the horizon, so the ground has depth rather than an edge. */
  private drawHills(horizon: number): Phaser.GameObjects.Graphics {
    const { width } = this.scale;
    const g = this.add.graphics();
    // Opaque rather than layered translucent humps: large alpha-blended fills are the
    // most expensive thing a scene like this can do, and the colours read the same.
    g.fillStyle(shade(COLORS.grass, 0.26));
    g.fillEllipse(width * 0.22, horizon + 12, width * 0.72, 180);
    g.fillStyle(shade(COLORS.grass, 0.16));
    g.fillEllipse(width * 0.84, horizon + 16, width * 0.6, 150);
    return g;
  }

  /**
   * The title.
   *
   * Bounces in one word at a time and then breathes. The old title was static outlined
   * text that had finished arriving before the camera had finished fading in, so nobody
   * ever saw it appear.
   */
  private addTitle(cx: number, cy: number): void {
    const title = this.add.text(cx, cy, 'Sommer Hotellet', {
      fontFamily: FONT,
      fontSize: `${SIZE.display}px`,
      color: '#FFFFFF',
      fontStyle: '700',
      stroke: '#B55345',
      strokeThickness: 9,
    }).setOrigin(0.5);
    title.setShadow(0, 5, 'rgba(74,58,44,0.35)', 0, false, true);

    const sub = this.add.text(cx, cy + 46, 'Fordi der altid er sommer her',
      textOutlined(SIZE.body + 1, '#FFFFFF', '#4A3A2C', 4)).setOrigin(0.5);

    popIn(this, title, 120, 0.4);
    popIn(this, sub, 320, 0.6);

    if (reduceMotion()) return;

    this.tweens.add({
      targets: [title, sub],
      y: '-=7',
      duration: 2400,
      delay: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // A slow tilt, so the title is never quite at rest.
    this.tweens.add({
      targets: title,
      angle: { from: -1.4, to: 1.4 },
      duration: 3800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  /**
   * The play button's entrance and idle breath.
   *
   * An earlier version put a translucent white halo behind it to lift it off the grass.
   * With the button now carrying a dark outline the halo was doing nothing except
   * reading as a grubby patch of lawn, so it is gone.
   */
  private addPlayGlow(play: Phaser.GameObjects.Container): void {
    popIn(this, play, 520, 0.5);

    if (reduceMotion()) return;
    // Starts after the entrance pop, or the two tweens fight over the same scale.
    this.time.delayedCall(900, () => {
      if (!play.active) return;
      this.tweens.add({
        targets: play,
        scale: 1.04,
        duration: 1100,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });
  }

  /** "You have been here before" — the saved star count and rank, on the title screen. */
  private addSaveBadge(left: number, y: number): void {
    const info = rankFor(gameState.stars);

    const t = this.add.text(0, 0, `${gameState.stars} stjerner · ${info.name}`,
      text(SIZE.label, '#5A4E42', 'bold')).setOrigin(0, 0.5);

    const w = t.width + 62;
    const h = 40;
    const c = this.add.container(left + 14 + w / 2, y);
    t.setX(-w / 2 + 42);

    const g = this.add.graphics();
    shadow(g, -w / 2, -h / 2, w, h, h / 2, 3, 0.18);
    plate(g, -w / 2, -h / 2, w, h, h / 2, COLORS.cream, 0.96, LINE.thin);
    drawStarShape(g, -w / 2 + 23, 0, 13);

    c.add([g, t]);
    popIn(this, c, 680);
    bob(this, c, 3, 2800, 900);
  }

  private addResetLink(x: number, y: number): void {
    const label = this.add.text(x, y, 'Start forfra', textOutlined(SIZE.tiny, '#FFFFFF', '#4A3A2C', 3))
      .setOrigin(0.5)
      .setAlpha(0.8)
      .setInteractive({ useHandCursor: true });

    label.on('pointerover', () => label.setAlpha(1));
    label.on('pointerout', () => label.setAlpha(0.8));
    label.on('pointerdown', () => {
      if (label.getData('confirming')) {
        gameState.reset();
        this.scene.restart();
        return;
      }
      label.setData('confirming', true);
      label.setText('Tryk igen for at slette');
      this.time.delayedCall(3000, () => {
        if (label.active) {
          label.setData('confirming', false);
          label.setText('Start forfra');
        }
      });
    });
  }

  /**
   * The hotel itself. Returns everything as one container so the caller can bake it
   * into the flattened scenery — the building never changes, only the flag on top does.
   */
  private drawHotel(cx: number, cy: number): Phaser.GameObjects.Container {
    const c = this.add.container(0, 0);
    const g = this.add.graphics();
    const w = 276;
    const h = 172;
    const left = cx - w / 2;
    const top = cy - 78;

    shadow(g, left, top, w, h, 12, 7, 0.18);

    // body
    g.fillStyle(COLORS.wall);
    g.fillRoundedRect(left, top, w, h, 12);
    g.fillStyle(COLORS.wallDeep, 0.55);
    g.fillRoundedRect(cx + 92, top, 46, h, { tl: 0, tr: 12, bl: 0, br: 12 });
    g.lineStyle(LINE.thick, COLORS.outline, 0.9);
    g.strokeRoundedRect(left, top, w, h, 12);

    // roof
    g.fillStyle(COLORS.roofDeep);
    g.fillTriangle(cx - 158, top + 4, cx + 158, top + 4, cx, cy - 156);
    g.fillStyle(COLORS.roof);
    g.fillTriangle(cx - 158, top + 4, cx + 134, top + 4, cx - 12, cy - 150);
    g.lineStyle(LINE.thick, COLORS.outline, 0.9);
    g.beginPath();
    g.moveTo(cx - 158, top + 4);
    g.lineTo(cx, cy - 156);
    g.lineTo(cx + 158, top + 4);
    g.closePath();
    g.strokePath();

    // windows, warm-lit so the hotel reads as open rather than empty
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 4; col++) {
        const wx = cx - 90 + col * 60;
        const wy = cy - 42 + row * 58;
        g.fillStyle(COLORS.sun, 0.55);
        g.fillRoundedRect(wx - 19, wy - 17, 38, 34, 6);
        g.fillStyle(COLORS.window, 0.85);
        g.fillRoundedRect(wx - 19, wy - 17, 38, 34, 6);
        g.fillStyle(COLORS.white, 0.55);
        g.fillRoundedRect(wx - 19, wy - 17, 17, 34, 6);
        g.lineStyle(LINE.base, COLORS.outline, 0.85);
        g.strokeRoundedRect(wx - 19, wy - 17, 38, 34, 6);
        g.lineStyle(LINE.hair, COLORS.outline, 0.5);
        g.lineBetween(wx, wy - 17, wx, wy + 17);

        // window box
        g.fillStyle(COLORS.roof);
        g.fillRoundedRect(wx - 21, wy + 16, 42, 8, 3);
        g.lineStyle(LINE.hair, COLORS.outline, 0.7);
        g.strokeRoundedRect(wx - 21, wy + 16, 42, 8, 3);
      }
    }

    // striped awning over the door
    const aw = 96;
    for (let i = 0; i < 6; i++) {
      g.fillStyle(i % 2 === 0 ? COLORS.red : COLORS.cream);
      g.fillRect(cx - aw / 2 + i * (aw / 6), cy + 30, aw / 6, 16);
    }
    g.fillStyle(COLORS.roofDeep, 0.25);
    g.fillRect(cx - aw / 2, cy + 42, aw, 4);
    g.lineStyle(LINE.base, COLORS.outline, 0.9);
    g.strokeRoundedRect(cx - aw / 2, cy + 30, aw, 16, 3);

    // door
    g.fillStyle(COLORS.door);
    g.fillRoundedRect(cx - 24, cy + 46, 48, 52, { tl: 14, tr: 14, bl: 0, br: 0 });
    g.fillStyle(COLORS.white, 0.16);
    g.fillRoundedRect(cx - 24, cy + 46, 20, 52, { tl: 14, tr: 0, bl: 0, br: 0 });
    g.lineStyle(LINE.base, COLORS.outline, 0.9);
    g.strokeRoundedRect(cx - 24, cy + 46, 48, 52, { tl: 14, tr: 14, bl: 0, br: 0 });
    g.fillStyle(COLORS.sun);
    g.fillCircle(cx + 13, cy + 74, 3.5);

    // door mat
    g.fillStyle(COLORS.wood);
    g.fillRoundedRect(cx - 30, cy + 96, 60, 10, 4);
    g.lineStyle(LINE.hair, COLORS.outline, 0.8);
    g.strokeRoundedRect(cx - 30, cy + 96, 60, 10, 4);

    // sign
    const signW = 128;
    const signY = cy - 130;
    g.fillStyle(COLORS.cream);
    g.fillRoundedRect(cx - signW / 2, signY, signW, 32, 9);
    g.lineStyle(LINE.base, COLORS.outline, 0.9);
    g.strokeRoundedRect(cx - signW / 2, signY, signW, 32, 9);

    c.add(g);
    c.add(this.add.text(cx, signY + 16, 'HOTEL', {
      fontFamily: FONT,
      fontSize: '17px',
      color: '#B55345',
      fontStyle: '700',
    }).setOrigin(0.5));

    return c;
  }

}
