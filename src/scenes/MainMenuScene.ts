import Phaser from 'phaser';
import { COLORS, DEPTH, FONT, INK, INK_SOFT, LINE, OUTLINE_CSS, SIZE, text, textOutlined } from '../config';
import {
  addBirds, bunting, button, drawBalloon, drawCloud, drawPalm, drawStarShape, drawSun,
  gradientBand, plate, scatterFlowers, shade, shadow, sheen,
} from '../helpers/Draw';
import { audio } from '../helpers/Audio';
import { canExit, exitApp } from '../helpers/Native';
import { dur, popIn, pulse, reduceMotion, transition } from '../helpers/Motion';
import { flatten } from '../helpers/Flatten';
import { listProfiles, MAX_PROFILES, Profile, starsOf } from '../state/Profiles';
import { avatarTint, drawAvatar, switchPlayer } from '../ui/Players';

/** Six of these and their gaps fit across the stage with a margin to spare. */
const CARD_W = 124;
const CARD_H = 124;
const CARD_GAP = 14;
/** The hotel is drawn a size down, so the row of players fits on the grass below it. */
const HOTEL_SCALE = 0.78;

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenuScene' });
  }

  /** Set once a card has been tapped, so a second tap during the fade cannot switch again. */
  private leaving = false;

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.fadeIn(dur(400));
    this.leaving = false;

    // Higher than it was, and the hotel a size smaller, to leave the grass free for a row
    // of player cards.
    const horizon = height * 0.61;

    // Everything that never moves goes into one container and is baked to a single
    // texture. See helpers/Flatten.
    const scenery = this.add.container(0, 0);
    scenery.add(gradientBand(this, 0, horizon + 4, COLORS.skyLight, COLORS.sky));
    scenery.add(this.drawHills(horizon));
    scenery.add(gradientBand(this, horizon, height - horizon, COLORS.grassLight, COLORS.grassDeep));
    // Added before the hotel so the string passes behind the building.
    scenery.add(bunting(this, 62, horizon - 40, width - 62, horizon - 30, 11, 16));
    // Drawn around the origin and then placed, so it can be scaled as one piece. Its door
    // mat sits on the horizon.
    scenery.add(this.drawHotel(0, 0).setScale(HOTEL_SCALE).setPosition(width / 2, horizon - 90 * HOTEL_SCALE));
    scenery.add(scatterFlowers(this, 9, horizon + 24, height - 16, 0.7, 28));
    flatten(this, scenery, DEPTH.background);

    // ...and everything with a pulse of its own stays a live object.
    drawSun(this, width - 96, 132, 28);
    addBirds(this, 3, 84, 48);

    const c1 = drawCloud(this, 150, 88, 0.92);
    const c2 = drawCloud(this, 600, 120, 0.66);
    if (!reduceMotion()) {
      this.tweens.add({ targets: c1, x: '+=160', duration: 22000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.tweens.add({ targets: c2, x: '-=130', duration: 18000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    drawPalm(this, 64, horizon + 18, 1.05);
    drawPalm(this, width - 60, horizon + 26, 1.18);
    drawBalloon(this, 168, 214, COLORS.red, 0.82);
    drawBalloon(this, width - 176, 232, COLORS.teal, 0.74);

    this.addTitle(width / 2, height * 0.15);
    this.addPlayers(horizon);

    // There was no way out of the game at all: a browser tab has no back, and the Android
    // build runs fullscreen with the system bars hidden. Top left, where every other screen
    // keeps its way out, so the bottom of the screen is free for the players.
    const exitW = 116;
    button(this, 14 + exitW / 2, 38, 'Afslut', COLORS.stoneDeep,
      () => this.leave(), exitW, 40, SIZE.label).setDepth(DEPTH.chrome);
  }

  /* --------------------------------------------------------------- players --- */

  /**
   * "Hvem spiller?" and a card per player.
   *
   * This replaced a single "Spil" button. Several children share one tablet, and each card
   * opens that child's own hotel exactly as they left it — so the first thing the game asks
   * is whose turn it is, with a face to find rather than a name to read.
   */
  private addPlayers(horizon: number): void {
    const { width } = this.scale;
    const profiles = listProfiles();

    const ask = this.add.text(width / 2, horizon + 32, 'Hvem spiller?',
      textOutlined(SIZE.title, '#FFFFFF', OUTLINE_CSS, 7)).setOrigin(0.5);
    popIn(this, ask, 380, 0.6);

    const cards: (Profile | null)[] = [...profiles];
    if (profiles.length < MAX_PROFILES) cards.push(null);

    const rowW = cards.length * CARD_W + (cards.length - 1) * CARD_GAP;
    const y = horizon + 32 + 90;
    cards.forEach((profile, i) => {
      const x = width / 2 - rowW / 2 + CARD_W / 2 + i * (CARD_W + CARD_GAP);
      const card = profile ? this.profileCard(x, y, profile) : this.newPlayerCard(x, y);
      card.setData('slot', i);
      popIn(this, card, 460 + i * 70, 0.5);
      // With nobody to pick yet, the one card there is gets the gentle pulse "Spil" had.
      if (!profile && profiles.length === 0 && !reduceMotion()) {
        this.time.delayedCall(900, () => card.active && pulse(this, card, 1.05));
      }
    });
  }

  private profileCard(x: number, y: number, profile: Profile): Phaser.GameObjects.Container {
    const tint = avatarTint(profile.avatar);
    const { card, face } = this.cardShell(x, y, tint, () => {
      switchPlayer(profile.id);
      transition(this, 'HotelMapScene', 280);
    });

    face.add(drawAvatar(this, profile.avatar, 0, -22, 32));

    const name = this.add.text(0, 24, profile.name, text(SIZE.body + 1, INK, 'bold')).setOrigin(0.5);
    if (name.width > CARD_W - 16) name.setScale((CARD_W - 16) / name.width);
    face.add(name);

    // the star count, so a child can see their own hotel's progress before they pick it
    const stars = this.add.text(0, 46, `${starsOf(profile.id)}`, text(SIZE.label, INK_SOFT, 'bold'))
      .setOrigin(0, 0.5);
    const starR = 8;
    const pairW = starR * 2 + 5 + stars.width;
    const star = this.add.graphics();
    drawStarShape(star, -pairW / 2 + starR, 45, starR);
    stars.setX(-pairW / 2 + starR * 2 + 5);
    face.add([star, stars]);

    card.setData('profile', profile.id);
    return card;
  }

  private newPlayerCard(x: number, y: number): Phaser.GameObjects.Container {
    const { card, face } = this.cardShell(x, y, COLORS.cream, () => transition(this, 'ProfileScene'));

    const plus = this.add.graphics();
    plus.fillStyle(shade(COLORS.green, -0.3));
    plus.fillCircle(0, -20, 30);
    plus.fillStyle(COLORS.green);
    plus.fillCircle(0, -22, 30);
    plus.lineStyle(LINE.base, COLORS.outline);
    plus.strokeCircle(0, -22, 30);
    plus.fillStyle(COLORS.white);
    plus.fillRoundedRect(-4.5, -38, 9, 32, 4.5);
    plus.fillRoundedRect(-16, -26.5, 32, 9, 4.5);
    face.add(plus);

    face.add(this.add.text(0, 32, 'Ny spiller', text(SIZE.body + 1, INK, 'bold')).setOrigin(0.5));
    card.setData('profile', 'new');
    return card;
  }

  /**
   * A card built like the chunky button: a face sitting on a darker lip, which a tap pushes
   * down rather than merely squashing.
   */
  private cardShell(
    x: number, y: number,
    tint: number,
    onPick: () => void
  ): { card: Phaser.GameObjects.Container; face: Phaser.GameObjects.Container } {
    const w = CARD_W;
    const h = CARD_H;
    const lip = 6;
    const r = 20;
    const card = this.add.container(x, y).setDepth(DEPTH.dynamic);

    const base = this.add.graphics();
    shadow(base, -w / 2, -h / 2, w, h + lip, r, 5, 0.22);
    plate(base, -w / 2, -h / 2 + lip, w, h, r, shade(tint, -0.25), 1, LINE.thick);
    card.add(base);

    const face = this.add.container(0, 0);
    const g = this.add.graphics();
    plate(g, -w / 2, -h / 2, w, h, r, tint, 1, LINE.thick);
    sheen(g, -w / 2, -h / 2, w, h, r - 2, 0.3);
    face.add(g);
    card.add(face);

    card.setSize(w, h + lip);
    card.setInteractive({ useHandCursor: true });
    if (!reduceMotion()) {
      card.on('pointerover', () => this.tweens.add({ targets: card, scale: 1.05, duration: 130, ease: 'Back.easeOut' }));
      card.on('pointerout', () => this.tweens.add({ targets: card, scale: 1, duration: 130 }));
    }
    card.on('pointerdown', () => {
      if (this.leaving) return;
      this.leaving = true;
      audio.tap();
      if (reduceMotion()) {
        onPick();
        return;
      }
      this.tweens.add({ targets: face, y: lip, duration: 70, yoyo: true, ease: 'Quad.easeOut', onComplete: onPick });
    });

    return { card, face };
  }

  /** Two soft humps behind the horizon, so the ground has depth rather than an edge. */
  private drawHills(horizon: number): Phaser.GameObjects.Graphics {
    const { width } = this.scale;
    const g = this.add.graphics();
    // Opaque rather than layered translucent humps: large alpha-blended fills are the most
    // expensive thing a scene like this can do, and the colours read the same.
    g.fillStyle(shade(COLORS.grass, 0.26));
    g.fillEllipse(width * 0.22, horizon + 12, width * 0.72, 170);
    g.fillStyle(shade(COLORS.grass, 0.16));
    g.fillEllipse(width * 0.84, horizon + 16, width * 0.6, 140);
    return g;
  }

  /**
   * The title.
   *
   * Bounces in and then breathes. The old title was static outlined text that had finished
   * arriving before the camera had finished fading in, so nobody ever saw it appear.
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

    const sub = this.add.text(cx, cy + 44, 'Fordi der altid er sommer her',
      textOutlined(SIZE.body, '#FFFFFF', '#4A3A2C', 4)).setOrigin(0.5);

    popIn(this, title, 120, 0.4);
    popIn(this, sub, 300, 0.6);

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
   * Leaving the game.
   *
   * On Android this closes the app, which is the only way out of a fullscreen, immersive
   * WebView. A browser will not let a page close a tab it did not open, so there the
   * button says goodbye and stops the music instead of silently doing nothing.
   */
  private leave(): void {
    if (canExit()) {
      exitApp();
      return;
    }

    audio.stopMusic();
    this.showFarewell();
  }

  private showFarewell(): void {
    const { width, height } = this.scale;

    const scrim = this.add.rectangle(0, 0, width, height, 0x2A2118, 0.55)
      .setOrigin(0)
      .setDepth(DEPTH.chrome)
      .setInteractive();

    const pw = 430;
    const ph = 210;
    const panel = this.add.container(width / 2, height / 2).setDepth(DEPTH.chrome + 10);

    const g = this.add.graphics();
    shadow(g, -pw / 2, -ph / 2, pw, ph, 24, 8, 0.28);
    plate(g, -pw / 2, -ph / 2, pw, ph, 24, COLORS.white, 1, LINE.thick);
    panel.add(g);

    panel.add(this.add.text(0, -58, 'Tak for i dag!', text(SIZE.title, INK, 'bold')).setOrigin(0.5));
    panel.add(this.add.text(0, -14, 'Du kan lukke fanen nu.', {
      ...text(SIZE.body, INK_SOFT, 'semibold'),
      wordWrap: { width: pw - 60 },
      align: 'center',
    }).setOrigin(0.5));

    const back = button(this, 0, 52, 'Spil videre', COLORS.green, () => {
      scrim.destroy();
      panel.destroy();
      audio.syncMusic();
    }, 200, 48, SIZE.body);
    panel.add(back);
  }

  /**
   * The hotel itself. Returns everything as one container so the caller can bake it into
   * the flattened scenery.
   */
  private drawHotel(cx: number, cy: number): Phaser.GameObjects.Container {
    const c = this.add.container(0, 0);
    const g = this.add.graphics();
    const w = 264;
    const h = 168;
    const left = cx - w / 2;
    const top = cy - 78;

    shadow(g, left, top, w, h, 12, 7, 0.18);

    // body
    g.fillStyle(COLORS.wall);
    g.fillRoundedRect(left, top, w, h, 12);
    g.fillStyle(COLORS.wallDeep, 0.55);
    g.fillRoundedRect(cx + 90, top, 42, h, { tl: 0, tr: 12, bl: 0, br: 12 });
    g.lineStyle(LINE.thick, COLORS.outline, 0.9);
    g.strokeRoundedRect(left, top, w, h, 12);

    // roof
    g.fillStyle(COLORS.roofDeep);
    g.fillTriangle(cx - 152, top + 4, cx + 152, top + 4, cx, cy - 152);
    g.fillStyle(COLORS.roof);
    g.fillTriangle(cx - 152, top + 4, cx + 130, top + 4, cx - 12, cy - 146);
    g.lineStyle(LINE.thick, COLORS.outline, 0.9);
    g.beginPath();
    g.moveTo(cx - 152, top + 4);
    g.lineTo(cx, cy - 152);
    g.lineTo(cx + 152, top + 4);
    g.closePath();
    g.strokePath();

    // windows, warm-lit so the hotel reads as open rather than empty
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 4; col++) {
        const wx = cx - 84 + col * 56;
        const wy = cy - 44 + row * 58;
        g.fillStyle(COLORS.sun, 0.5);
        g.fillRoundedRect(wx - 17, wy - 16, 34, 32, 6);
        g.fillStyle(COLORS.window, 0.85);
        g.fillRoundedRect(wx - 17, wy - 16, 34, 32, 6);
        g.fillStyle(COLORS.white, 0.55);
        g.fillRoundedRect(wx - 17, wy - 16, 15, 32, 6);
        g.lineStyle(LINE.base, COLORS.outline, 0.85);
        g.strokeRoundedRect(wx - 17, wy - 16, 34, 32, 6);
        g.lineStyle(LINE.hair, COLORS.outline, 0.5);
        g.lineBetween(wx, wy - 16, wx, wy + 16);
        // window box
        g.fillStyle(COLORS.roof);
        g.fillRoundedRect(wx - 19, wy + 15, 38, 8, 3);
        g.lineStyle(LINE.hair, COLORS.outline, 0.7);
        g.strokeRoundedRect(wx - 19, wy + 15, 38, 8, 3);
      }
    }

    // striped awning over the door
    const aw = 88;
    for (let i = 0; i < 6; i++) {
      g.fillStyle(i % 2 === 0 ? COLORS.red : COLORS.cream);
      g.fillRect(cx - aw / 2 + i * (aw / 6), cy + 30, aw / 6, 15);
    }
    g.lineStyle(LINE.base, COLORS.outline, 0.9);
    g.strokeRoundedRect(cx - aw / 2, cy + 30, aw, 15, 3);

    // door
    g.fillStyle(COLORS.door);
    g.fillRoundedRect(cx - 22, cy + 45, 44, 45, { tl: 13, tr: 13, bl: 0, br: 0 });
    g.fillStyle(COLORS.white, 0.16);
    g.fillRoundedRect(cx - 22, cy + 45, 18, 45, { tl: 13, tr: 0, bl: 0, br: 0 });
    g.lineStyle(LINE.base, COLORS.outline, 0.9);
    g.strokeRoundedRect(cx - 22, cy + 45, 44, 45, { tl: 13, tr: 13, bl: 0, br: 0 });
    g.fillStyle(COLORS.sun);
    g.fillCircle(cx + 12, cy + 68, 3.5);

    // door mat
    g.fillStyle(COLORS.wood);
    g.fillRoundedRect(cx - 28, cy + 88, 56, 9, 4);
    g.lineStyle(LINE.hair, COLORS.outline, 0.8);
    g.strokeRoundedRect(cx - 28, cy + 88, 56, 9, 4);

    // sign
    const signW = 118;
    const signY = cy - 128;
    g.fillStyle(COLORS.cream);
    g.fillRoundedRect(cx - signW / 2, signY, signW, 29, 9);
    g.lineStyle(LINE.base, COLORS.outline, 0.9);
    g.strokeRoundedRect(cx - signW / 2, signY, signW, 29, 9);

    c.add(g);
    c.add(this.add.text(cx, signY + 15, 'HOTEL', {
      fontFamily: FONT,
      fontSize: '16px',
      color: '#B55345',
      fontStyle: '700',
    }).setOrigin(0.5));

    return c;
  }
}
