import Phaser from 'phaser';
import { COLORS, INK, INK_SOFT, LINE, SIZE, text } from '../config';
import { GuestData } from '../state/GameState';
import { showCheckmark, showSparkle, showToast } from '../objects/FeedbackEffects';
import { addBackButton, addSceneTitle, addStarCounter } from '../ui/Chrome';
import { caption, plate, shade, shadow, tappable } from '../helpers/Draw';
import { audio } from '../helpers/Audio';
import { BaseScene } from './BaseScene';

/** One of the choices in a step: a picture, and a word under it. */
export interface MakerOption {
  id: string;
  name: string;
  /** Draws the option as it would turn out, given what else has been picked so far. */
  paint: (g: Phaser.GameObjects.Graphics, picked: Record<string, string>) => void;
}

export interface MakerStep {
  id: string;
  title: string;
  options: MakerOption[];
}

/**
 * A place where something is put together for a guest: the ice cream stand and the
 * boutique.
 *
 * Both work the way the kitchen does — pick the parts, watch the thing take shape, put it
 * on the counter — so they share one layout. On the left, what guests are waiting for, as
 * pictures to copy; in the middle, a row per choice; on the right, the thing being made and
 * the counter it goes on. Making it pays nothing: the star is for the guest who gets it.
 */
export abstract class MakerScene extends BaseScene {
  /** What has been picked so far, by step id. Not saved: half an ice cream is not progress. */
  private picked: Record<string, string> = {};

  protected abstract readonly title: string;
  protected abstract readonly titleColor: number;
  protected abstract readonly backTo: string;
  protected abstract readonly steps: MakerStep[];
  /** "Læg på disken". */
  protected abstract readonly makeLabel: string;
  /** "Disken er fuld". */
  protected abstract readonly fullLabel: string;
  /** "Klar til gæsterne". */
  protected abstract readonly counterLabel: string;
  protected abstract readonly capacity: number;

  /** The finished thing's key, from a complete set of picks. */
  protected abstract compose(picked: Record<string, string>): string;
  /** Adds what has been picked so far, big, to the preview stand. */
  protected abstract fillPreview(c: Phaser.GameObjects.Container, picked: Record<string, string>): void;
  /** Draws a finished thing, small, for the counter and the wish list. */
  protected abstract paintItem(g: Phaser.GameObjects.Graphics, key: string, s: number): void;
  /** What sits on the counter now. */
  protected abstract counter(): string[];
  protected abstract produce(key: string): boolean;
  protected abstract scrap(index: number): boolean;
  /** Guests waiting for something made here, with what they want. */
  protected abstract wishes(): { guest: GuestData; key: string }[];
  /** "Isen er klar" — said when the thing lands on the counter. */
  protected abstract madeMessage(key: string): string;

  init(): void {
    this.picked = {};
  }

  protected buildBackground(): void {
    const { width, height } = this.scale;
    const g = this.add.graphics();
    g.fillStyle(COLORS.cream);
    g.fillRect(0, 0, width, height);
    // a soft striped wallpaper in the place's own colour
    g.fillStyle(shade(this.titleColor, 0.82), 0.6);
    for (let x = 0; x < width; x += 44) g.fillRect(x, 0, 22, height * 0.8);
    g.fillStyle(COLORS.woodLight);
    g.fillRect(0, height * 0.8, width, height * 0.2);
    g.fillStyle(COLORS.wood, 0.5);
    for (let x = -30; x < width; x += 90) g.fillRect(x, height * 0.8 + 6, 4, height * 0.2);
    this.background.add(g);
  }

  protected buildChrome(): void {
    addBackButton(this, this.backTo);
    addStarCounter(this);
    addSceneTitle(this, this.title, this.titleColor);
  }

  protected buildDynamic(): void {
    const { width, height } = this.scale;
    this.buildWishes(96, height * 0.48);
    this.steps.forEach((step, i) => this.buildStep(step, 156 + i * 120));
    this.buildPreview(width - 112, height * 0.36);
    this.buildCounter(width - 112, height * 0.7);
    this.buildMakeButton(width / 2 + 40, height - 40);
  }

  /** What guests are waiting for, so the child has something to copy. */
  private buildWishes(cx: number, cy: number): void {
    const wishes = this.wishes();
    const w = 152;
    const rows = Math.max(1, Math.min(4, wishes.length));
    const h = 48 + rows * 58;
    const c = this.add.container(cx, cy);

    const g = this.add.graphics();
    shadow(g, -w / 2, -h / 2, w, h, 14, 3, 0.16);
    plate(g, -w / 2, -h / 2, w, h, 14, COLORS.white, 0.96, LINE.base);
    g.fillStyle(this.titleColor);
    g.fillRoundedRect(-w / 2 + 2, -h / 2 + 2, w - 4, 28, { tl: 12, tr: 12, bl: 0, br: 0 });
    c.add(g);
    c.add(this.add.text(0, -h / 2 + 16, 'Ønsker', text(SIZE.label, '#FFFFFF', 'bold')).setOrigin(0.5));

    if (wishes.length === 0) {
      c.add(this.add.text(0, 12, 'Ingen gæster\nventer lige nu', {
        ...text(SIZE.tiny, INK_SOFT, 'semibold'), align: 'center',
      }).setOrigin(0.5));
    } else {
      wishes.slice(0, 4).forEach(({ guest, key }, i) => {
        const y = -h / 2 + 64 + i * 58;
        const dot = this.add.circle(-w / 2 + 22, y, 9, guest.color).setStrokeStyle(2, COLORS.white);
        c.add(dot);
        const pic = this.add.graphics().setPosition(16, y);
        this.paintItem(pic, key, 1.5);
        c.add(pic);
        if (this.counter().includes(key)) {
          const tick = this.add.graphics().setPosition(w / 2 - 18, y + 12);
          tick.fillStyle(COLORS.green);
          tick.fillCircle(0, 0, 8);
          tick.lineStyle(2.2, COLORS.white);
          tick.beginPath();
          tick.moveTo(-3.5, 0);
          tick.lineTo(-1, 3);
          tick.lineTo(4, -3);
          tick.strokePath();
          c.add(tick);
        }
      });
    }
    this.dyn(c);
  }

  /** One row of choices: the question on a tag, then a card per option. */
  /** Where the rows of choices start: centred in the room between the wish list and the preview. */
  private stepsLeft(): number {
    const widest = Math.max(...this.steps.map(st => {
      const n = st.options.length;
      return n * (n > 4 ? 78 : 88) + (n - 1) * (n > 4 ? 10 : 14);
    }));
    return Math.max(200, Math.round((this.scale.width - 20) / 2 - widest / 2));
  }

  private buildStep(step: MakerStep, y: number): void {
    const startX = this.stepsLeft();
    const title = caption(this, 0, y - 60, step.title, this.picked[step.id] ? 'done' : 'idle');
    title.setX(startX + title.getBounds().width / 2);
    this.dyn(title);

    const n = step.options.length;
    const size = n > 4 ? 78 : 88;
    const gap = n > 4 ? 10 : 14;
    step.options.forEach((option, i) => {
      const x = startX + size / 2 + i * (size + gap);
      const chosen = this.picked[step.id] === option.id;
      const c = this.add.container(x, y);

      const g = this.add.graphics();
      shadow(g, -size / 2, -size / 2, size, size, 18, chosen ? 4 : 2, chosen ? 0.2 : 0.12);
      plate(g, -size / 2, -size / 2, size, size, 18,
        chosen ? shade(this.titleColor, 0.55) : COLORS.white, 1,
        chosen ? LINE.thick : LINE.thin, chosen ? 1 : 0.55);
      c.add(g);

      const pic = this.add.graphics().setPosition(0, -8);
      option.paint(pic, { ...this.picked, [step.id]: option.id });
      c.add(pic);

      const label = this.add.text(0, size / 2 - 15, option.name, text(SIZE.tiny, INK, 'bold')).setOrigin(0.5);
      if (label.width > size - 8) label.setScale((size - 8) / label.width);
      c.add(label);

      this.dyn(c);
      tappable(this, c, size, size, () => {
        this.picked = { ...this.picked, [step.id]: option.id };
        this.refresh();
      }, 'pop');
    });
  }

  /** The thing being made, big, on a little stand. */
  private buildPreview(cx: number, cy: number): void {
    const c = this.add.container(cx, cy);
    const g = this.add.graphics();
    shadow(g, -80, -88, 160, 176, 24, 4, 0.16);
    plate(g, -80, -88, 160, 176, 24, COLORS.white, 0.95, LINE.base);
    g.fillStyle(shade(this.titleColor, 0.7));
    g.fillEllipse(0, 62, 112, 22);
    c.add(g);

    this.fillPreview(c, this.picked);
    this.dyn(c);
  }

  /** What has been made, waiting for its guest. Tapping one throws it away. */
  private buildCounter(cx: number, cy: number): void {
    const items = this.counter();
    const w = 196;
    const h = 92;
    const c = this.add.container(cx, cy);
    const g = this.add.graphics();
    shadow(g, -w / 2, -h / 2, w, h, 12, 3, 0.16);
    plate(g, -w / 2, -h / 2, w, h, 12, COLORS.woodDeep, 1, LINE.base);
    g.fillStyle(COLORS.wood);
    g.fillRoundedRect(-w / 2 + 5, -h / 2 + 24, w - 10, h - 29, 8);
    c.add(g);
    c.add(this.add.text(0, -h / 2 + 13, this.counterLabel, text(SIZE.tiny, '#FDF7EA', 'bold')).setOrigin(0.5));

    if (items.length === 0) {
      c.add(this.add.text(0, 14, 'tom', text(SIZE.tiny, '#FDF7EA', 'semibold')).setOrigin(0.5).setAlpha(0.7));
    }
    this.dyn(c);

    const step = (w - 20) / this.capacity;
    items.forEach((key, i) => {
      const x = cx - w / 2 + 10 + step * (i + 0.5);
      const slot = this.add.container(x, cy + 14);
      const pic = this.add.graphics();
      this.paintItem(pic, key, 1.25);
      slot.add(pic);
      this.dyn(slot);
      tappable(this, slot, step - 4, 60, () => {
        if (!this.scrap(i)) return;
        audio.pop();
        showToast(this, cx, cy - h / 2 - 18, 'Smidt ud', '#B9584A');
        this.refresh();
      });
    });
  }

  private buildMakeButton(x: number, y: number): void {
    const complete = this.steps.every(s => this.picked[s.id]);
    const full = this.counter().length >= this.capacity;
    const ready = complete && !full;

    const label = full ? this.fullLabel : this.makeLabel;
    const w = 240;
    const h = 50;
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    shadow(g, -w / 2, -h / 2, w, h, h / 2, 3, 0.2);
    plate(g, -w / 2, -h / 2, w, h, h / 2, ready ? COLORS.green : COLORS.stone, 1, LINE.thick);
    g.fillStyle(COLORS.white, 0.24);
    g.fillRoundedRect(-w / 2 + 4, -h / 2 + 4, w - 8, h * 0.4, h / 2);
    c.add(g);
    c.add(this.add.text(0, 0, label, text(SIZE.body, ready ? '#FFFFFF' : INK_SOFT, 'bold')).setOrigin(0.5));
    this.dyn(c);

    if (!ready) return;
    this.tweens.add({ targets: c, scale: 1.05, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    tappable(this, c, w, h, () => {
      const key = this.compose(this.picked);
      if (!this.produce(key)) return;
      const { width, height } = this.scale;
      audio.sparkle();
      showSparkle(this, width - 112, height * 0.36, 160, 170);
      showCheckmark(this, width - 112, height * 0.36 - 40);
      showToast(this, width - 112, height * 0.36 - 110, this.madeMessage(key), '#4A7F33');
      this.picked = {};
      this.refresh();
    });
  }
}
