import Phaser from 'phaser';
import { COLORS, DEPTH, INK, INK_SOFT, SIZE, text } from '../config';
import { gameState } from '../state/GameState';
import { IconKind, Task, TaskBody } from '../tasks/types';
import { showCheckmark, showStarBurst, showToast } from '../objects/FeedbackEffects';
import { shadow, tappable } from '../helpers/Draw';
import { audio } from '../helpers/Audio';
import { dur, reduceMotion } from '../helpers/Motion';
import { speak, stopSpeaking } from '../helpers/Speech';

export interface TaskOverlayData {
  task: Task;
  /** Called once, after the child has finished — always, right or wrong. */
  onDone: (result: { correct: boolean; stars: number }) => void;
}

const PATTERN_COLORS = [COLORS.pink, COLORS.sun, COLORS.water, COLORS.purple];

/**
 * The task layer. Launched with scene.launch() so the room stays visible behind it and no
 * scene is ever rebuilt.
 *
 * There is no fail state: a wrong tap wobbles, speaks a hint, and takes one wrong option
 * off the board. The child always finishes, and always gets at least one star.
 */
export class TaskOverlayScene extends Phaser.Scene {
  private task!: Task;
  private onDone!: TaskOverlayData['onDone'];
  private attempts = 0;
  private taps = 0;
  private finished = false;
  private ruledOut: string[] = [];
  private answerDigits = '';

  private panel!: Phaser.GameObjects.Container;
  private body!: Phaser.GameObjects.Container;
  private hint!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'TaskOverlayScene' });
  }

  init(data: TaskOverlayData): void {
    this.task = data.task;
    this.onDone = data.onDone;
    this.attempts = 0;
    this.taps = 0;
    this.finished = false;
    this.ruledOut = [];
    this.answerDigits = '';
  }

  create(): void {
    const { width, height } = this.scale;

    // dim the scene behind, and swallow taps that miss the card
    const scrim = this.add.rectangle(0, 0, width, height, 0x2A2118, 0.42)
      .setOrigin(0)
      .setDepth(DEPTH.chrome)
      .setInteractive();
    scrim.on('pointerdown', () => {});

    const pw = 680;
    // A pick-one row needs far less height than a number pad; a fixed card left a short
    // task floating in empty white.
    const template = this.task.body.template;
    const ph = template === 'number-pad' ? 452 : template === 'count-taps' ? 400 : 330;
    const tall = template === 'number-pad' || template === 'count-taps';
    this.panel = this.add.container(width / 2, height / 2).setDepth(DEPTH.chrome + 10);

    const card = this.add.graphics();
    shadow(card, -pw / 2, -ph / 2, pw, ph, 26, 8, 0.28);
    card.fillStyle(COLORS.white);
    card.fillRoundedRect(-pw / 2, -ph / 2, pw, ph, 26);
    card.fillStyle(this.accent(), 0.14);
    card.fillRoundedRect(-pw / 2, -ph / 2, pw, 74, { tl: 26, tr: 26, bl: 0, br: 0 });
    this.panel.add(card);

    // subject chip
    const chip = this.add.text(-pw / 2 + 30, -ph / 2 + 37,
      this.task.subject === 'matematik' ? 'Tal' : 'Ord',
      text(SIZE.tiny, '#FFFFFF', 'bold')).setOrigin(0, 0.5);
    const chipBg = this.add.graphics();
    chipBg.fillStyle(this.accent());
    chipBg.fillRoundedRect(-pw / 2 + 22, -ph / 2 + 26, chip.width + 16, 22, 11);
    this.panel.add([chipBg, chip]);

    // prompt
    const prompt = this.add.text(0, -ph / 2 + 37, this.task.prompt, {
      ...text(SIZE.heading, INK, 'bold'),
      wordWrap: { width: pw - 190 },
      align: 'center',
    }).setOrigin(0.5);
    this.panel.add(prompt);

    this.addSpeakerButton(pw / 2 - 44, -ph / 2 + 37);

    this.hint = this.add.text(0, ph / 2 - 34, '', text(SIZE.label, INK_SOFT, 'semibold'))
      .setOrigin(0.5);
    this.panel.add(this.hint);

    this.body = this.add.container(0, tall ? 24 : 6);
    this.panel.add(this.body);
    this.buildBody();

    if (!reduceMotion()) {
      this.panel.setScale(0.86).setAlpha(0);
      this.tweens.add({ targets: this.panel, scale: 1, alpha: 1, duration: 260, ease: 'Back.easeOut' });
    }

    this.time.delayedCall(dur(320), () => speak(this.task.spoken ?? this.task.prompt));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, stopSpeaking);
  }

  private accent(): number {
    return this.task.subject === 'matematik' ? COLORS.water : COLORS.green;
  }

  private addSpeakerButton(x: number, y: number): void {
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    g.fillStyle(this.accent(), 0.16);
    g.fillCircle(0, 0, 21);
    // speaker cone plus two waves
    g.fillStyle(this.accent());
    g.fillRoundedRect(-9, -5, 5, 10, 2);
    g.fillTriangle(-4, -9, -4, 9, 3, 0);
    g.lineStyle(2, this.accent(), 0.9);
    g.beginPath();
    g.arc(4, 0, 6, Phaser.Math.DegToRad(-55), Phaser.Math.DegToRad(55), false);
    g.strokePath();
    g.beginPath();
    g.arc(4, 0, 10, Phaser.Math.DegToRad(-50), Phaser.Math.DegToRad(50), false);
    g.strokePath();
    c.add(g);
    this.panel.add(c);

    tappable(this, c, 44, 44, () => speak(this.task.spoken ?? this.task.prompt));
  }

  /* ----------------------------------------------------------------- icons --- */

  /** The countable things. Drawn rather than emoji, to match the rest of the game. */
  private drawIcon(kind: IconKind, scale = 1): Phaser.GameObjects.Container {
    const c = this.add.container(0, 0).setScale(scale);
    const g = this.add.graphics();

    switch (kind) {
      case 'pancake':
        g.fillStyle(COLORS.woodDeep, 0.25);
        g.fillEllipse(0, 10, 46, 12);
        g.fillStyle(0xE0B36B);
        g.fillEllipse(0, 4, 46, 18);
        g.fillStyle(0xEFC77F);
        g.fillEllipse(0, 0, 46, 18);
        g.fillStyle(0xC98A3E, 0.55);
        g.fillEllipse(-8, -2, 16, 7);
        g.fillStyle(COLORS.sun);
        g.fillRoundedRect(-7, -9, 14, 7, 3);
        break;
      case 'apple':
        g.fillStyle(COLORS.roofDeep);
        g.fillCircle(0, 3, 19);
        g.fillStyle(COLORS.red);
        g.fillCircle(0, 1, 18);
        g.fillStyle(COLORS.white, 0.4);
        g.fillEllipse(-7, -6, 9, 6);
        g.lineStyle(4, COLORS.woodDeep);
        g.lineBetween(0, -16, 2, -25);
        g.fillStyle(COLORS.grass);
        g.fillEllipse(10, -24, 16, 9);
        break;
      case 'towel':
        g.fillStyle(COLORS.waterLight);
        g.fillRoundedRect(-24, -14, 48, 28, 7);
        g.fillStyle(COLORS.white, 0.75);
        g.fillRect(-24, -6, 48, 5);
        g.fillRect(-24, 3, 48, 5);
        g.lineStyle(2, COLORS.waterDeep, 0.4);
        g.strokeRoundedRect(-24, -14, 48, 28, 7);
        break;
      case 'flower':
        g.lineStyle(4, COLORS.grassDeep);
        g.lineBetween(0, 24, 0, 2);
        g.fillStyle(COLORS.grass);
        g.fillEllipse(-9, 16, 15, 8);
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
          g.fillStyle(COLORS.pink);
          g.fillCircle(Math.cos(a) * 11, Math.sin(a) * 11 - 4, 9);
        }
        g.fillStyle(COLORS.sun);
        g.fillCircle(0, -4, 6);
        break;
      case 'key':
        g.fillStyle(COLORS.sunDeep);
        g.fillCircle(0, -10, 14);
        g.fillStyle(COLORS.sun);
        g.fillCircle(0, -11, 11);
        g.fillStyle(COLORS.white);
        g.fillCircle(0, -11, 4);
        g.fillStyle(COLORS.sunDeep);
        g.fillRoundedRect(-3, 0, 6, 26, 2);
        g.fillRoundedRect(-3, 14, 11, 4, 2);
        g.fillRoundedRect(-3, 21, 9, 4, 2);
        break;
      case 'carrot':
        g.fillStyle(0xE8944F);
        g.fillTriangle(-11, -12, 11, -12, 0, 24);
        g.fillStyle(0xD97F3C, 0.5);
        g.fillTriangle(2, -12, 11, -12, 0, 24);
        g.fillStyle(COLORS.grassDeep);
        g.fillEllipse(-7, -18, 12, 14);
        g.fillEllipse(7, -18, 12, 14);
        g.fillStyle(COLORS.grass);
        g.fillEllipse(0, -22, 12, 16);
        break;
      case 'cup':
        g.fillStyle(COLORS.shadow, 0.12);
        g.fillEllipse(0, 20, 34, 8);
        g.fillStyle(COLORS.white);
        g.fillRoundedRect(-15, -14, 30, 34, { tl: 3, tr: 3, bl: 11, br: 11 });
        g.fillStyle(COLORS.waterLight, 0.85);
        g.fillRoundedRect(-12, -2, 24, 19, { tl: 0, tr: 0, bl: 9, br: 9 });
        g.lineStyle(4, COLORS.white);
        g.beginPath();
        g.arc(17, 2, 9, Phaser.Math.DegToRad(-70), Phaser.Math.DegToRad(70), false);
        g.strokePath();
        break;
    }

    c.add(g);
    return c;
  }

  /* ------------------------------------------------------------- templates --- */

  private buildBody(): void {
    this.body.removeAll(true);
    const b: TaskBody = this.task.body;

    switch (b.template) {
      case 'count-taps': return this.buildCountTaps(b);
      case 'pick-one': return this.buildPickOne(b);
      case 'number-pad': return this.buildNumberPad(b);
      case 'pattern': return this.buildPattern(b);
    }
  }

  private buildCountTaps(b: Extract<TaskBody, { template: 'count-taps' }>): void {
    // a big tappable thing, plus a row of pips that fills as the child counts
    const target = b.target;

    const stack = this.add.container(0, -6);
    const icon = this.drawIcon(b.icon, 1.9);
    stack.add(icon);
    this.body.add(stack);

    const pips: Phaser.GameObjects.Arc[] = [];
    const spacing = Math.min(46, 420 / target);
    for (let i = 0; i < target; i++) {
      const pip = this.add.circle((i - (target - 1) / 2) * spacing, 78, 13, COLORS.white);
      pip.setStrokeStyle(2.5, COLORS.stoneDeep);
      pips.push(pip);
      this.body.add(pip);
    }

    const counter = this.add.text(0, 118, `0 af ${target}`, text(SIZE.body, INK_SOFT, 'bold'))
      .setOrigin(0.5);
    this.body.add(counter);

    tappable(this, stack, 130, 130, () => {
      if (this.finished) return;
      this.taps++;

      if (this.taps <= target) {
        const pip = pips[this.taps - 1];
        pip.setFillStyle(this.accent());
        pip.setStrokeStyle(2.5, this.accent());
        if (!reduceMotion()) {
          this.tweens.add({ targets: pip, scale: 1.4, duration: 130, yoyo: true });
        }
      }
      counter.setText(`${this.taps} af ${target}`);

      if (this.taps === target) {
        // small pause so the child can see the last pip land
        this.time.delayedCall(dur(260), () => this.succeed());
      } else if (this.taps > target) {
        // overshot: reset rather than fail
        this.taps = 0;
        counter.setText(`0 af ${target}`);
        pips.forEach(p => {
          p.setFillStyle(COLORS.white);
          p.setStrokeStyle(2.5, COLORS.stoneDeep);
        });
        this.miss('Det var en for mange. Prøv igen — tæl langsomt.');
      }
    });
  }

  private buildPickOne(b: Extract<TaskBody, { template: 'pick-one' }>): void {
    const live = b.options.filter(o => !this.ruledOut.includes(o));
    const size = b.big ? 104 : 176;
    const gap = b.big ? 34 : 24;
    const totalW = live.length * size + (live.length - 1) * gap;

    live.forEach((option, i) => {
      const x = -totalW / 2 + size / 2 + i * (size + gap);
      const c = this.add.container(x, 22);

      const g = this.add.graphics();
      shadow(g, -size / 2, -44, size, 88, 18, 4, 0.16);
      g.fillStyle(COLORS.white);
      g.fillRoundedRect(-size / 2, -44, size, 88, 18);
      g.lineStyle(2.5, this.accent(), 0.5);
      g.strokeRoundedRect(-size / 2, -44, size, 88, 18);

      const label = this.add.text(0, 0, option,
        text(b.big ? 46 : SIZE.title, INK, 'bold')).setOrigin(0.5);
      if (!b.big && label.width > size - 26) label.setFontSize(SIZE.heading);

      c.add([g, label]);
      this.body.add(c);

      tappable(this, c, size, 88, () => {
        if (this.finished) return;
        if (option === b.answer) {
          this.succeed();
        } else {
          this.ruledOut.push(option);
          this.wobble(c);
          this.miss(this.ruledOut.length === 1
            ? 'Ikke helt. Prøv en af de andre.'
            : 'Prøv igen — du er tæt på.');
          this.time.delayedCall(dur(420), () => this.buildBody());
        }
      });
    });
  }

  private buildNumberPad(b: Extract<TaskBody, { template: 'number-pad' }>): void {
    const display = this.add.text(0, -96, '?', text(52, INK, 'bold')).setOrigin(0.5);
    const tray = this.add.graphics();
    tray.fillStyle(this.accent(), 0.1);
    tray.fillRoundedRect(-90, -124, 180, 58, 14);
    this.body.add([tray, display]);

    const refresh = () => display.setText(this.answerDigits === '' ? '?' : this.answerDigits);

    // Two rows of five, then the actions on their own row. Squeezing Slet and Svar in
    // beside the digits put them on top of the 5 and the 0, so those two were untappable.
    const keyW = 76;
    const keyH = 50;
    const stepX = 95;
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

    keys.forEach((key, i) => {
      const col = i % 5;
      const row = Math.floor(i / 5);
      const c = this.add.container(-2 * stepX + col * stepX, -30 + row * 60);

      const g = this.add.graphics();
      shadow(g, -keyW / 2, -keyH / 2, keyW, keyH, 14, 3, 0.14);
      g.fillStyle(COLORS.white);
      g.fillRoundedRect(-keyW / 2, -keyH / 2, keyW, keyH, 14);
      g.lineStyle(2, this.accent(), 0.4);
      g.strokeRoundedRect(-keyW / 2, -keyH / 2, keyW, keyH, 14);
      c.add([g, this.add.text(0, 0, key, text(SIZE.title, INK, 'bold')).setOrigin(0.5)]);
      this.body.add(c);

      tappable(this, c, keyW, keyH, () => {
        if (this.finished) return;
        if (this.answerDigits.length >= 3) this.answerDigits = '';
        this.answerDigits += key;
        refresh();
      });
    });

    // clear + check, on their own row below the digits
    const actionY = 96;
    const clear = this.add.container(-84, actionY);
    const cg = this.add.graphics();
    shadow(cg, -66, -25, 132, 50, 14, 3, 0.14);
    cg.fillStyle(COLORS.stone);
    cg.fillRoundedRect(-66, -25, 132, 50, 14);
    clear.add([cg, this.add.text(0, 0, 'Slet', text(SIZE.body, INK, 'bold')).setOrigin(0.5)]);
    this.body.add(clear);
    tappable(this, clear, 132, 50, () => {
      this.answerDigits = '';
      refresh();
    });

    const check = this.add.container(84, actionY);
    const kg = this.add.graphics();
    shadow(kg, -66, -25, 132, 50, 14, 3, 0.18);
    kg.fillStyle(COLORS.green);
    kg.fillRoundedRect(-66, -25, 132, 50, 14);
    kg.fillStyle(COLORS.white, 0.22);
    kg.fillRoundedRect(-63, -22, 126, 21, 12);
    check.add([kg, this.add.text(0, 0, 'Svar', text(SIZE.body, '#FFFFFF', 'bold')).setOrigin(0.5)]);
    this.body.add(check);

    tappable(this, check, 132, 50, () => {
      if (this.finished || this.answerDigits === '') return;
      if (Number(this.answerDigits) === b.answer) {
        this.succeed();
      } else {
        this.wobble(display);
        this.answerDigits = '';
        refresh();
        this.miss(this.attempts >= 2
          ? `Tæt på. Prøv at tælle på fingrene.`
          : 'Ikke helt. Prøv igen.');
      }
    });
  }

  private buildPattern(b: Extract<TaskBody, { template: 'pattern' }>): void {
    // the sequence so far, then a gap
    const cells = [...b.sequence, -1];
    const spacing = 74;
    cells.forEach((value, i) => {
      const x = (i - (cells.length - 1) / 2) * spacing;
      const c = this.add.container(x, -34);
      if (value === -1) {
        const g = this.add.graphics();
        g.lineStyle(3, COLORS.stoneDeep, 0.7);
        g.strokeRoundedRect(-26, -26, 52, 52, 14);
        c.add(g);
        c.add(this.add.text(0, 0, '?', text(SIZE.title, INK_SOFT, 'bold')).setOrigin(0.5));
      } else {
        const g = this.add.graphics();
        g.fillStyle(PATTERN_COLORS[value]);
        g.fillRoundedRect(-26, -26, 52, 52, 14);
        c.add(g);
      }
      this.body.add(c);
    });

    const live = b.options.filter(o => !this.ruledOut.includes(String(o)));
    const totalW = live.length * 84 - 20;
    live.forEach((value, i) => {
      const x = -totalW / 2 + 32 + i * 84;
      const c = this.add.container(x, 66);
      const g = this.add.graphics();
      shadow(g, -32, -32, 64, 64, 16, 4, 0.16);
      g.fillStyle(PATTERN_COLORS[value]);
      g.fillRoundedRect(-32, -32, 64, 64, 16);
      g.lineStyle(2.5, COLORS.white, 0.8);
      g.strokeRoundedRect(-32, -32, 64, 64, 16);
      c.add(g);
      this.body.add(c);

      tappable(this, c, 64, 64, () => {
        if (this.finished) return;
        if (value === b.answer) {
          this.succeed();
        } else {
          this.ruledOut.push(String(value));
          this.wobble(c);
          this.miss('Se på rækken igen — hvad gentager sig?');
          this.time.delayedCall(dur(420), () => this.buildBody());
        }
      });
    });
  }

  /* --------------------------------------------------------------- outcome --- */

  private wobble(target: Phaser.GameObjects.GameObject & { x: number }): void {
    if (reduceMotion()) return;
    const home = target.x;
    this.tweens.add({
      targets: target,
      x: home - 9,
      duration: 60,
      yoyo: true,
      repeat: 2,
      onComplete: () => { target.x = home; },
    });
  }

  private miss(hint: string): void {
    this.attempts++;
    audio.nudge();
    this.hint.setText(hint);
    speak(hint);
  }

  private succeed(): void {
    if (this.finished) return;
    this.finished = true;

    // First time right pays in full; after a stumble it still pays, just less. There is
    // no zero — the child always leaves a task better off than they arrived.
    const stars = this.attempts === 0 ? this.task.reward : Math.max(1, this.task.reward - 1);
    const firstTry = this.attempts === 0;

    gameState.recordAttempt(this.task.skill, firstTry);

    this.hint.setText(firstTry ? 'Rigtigt!' : 'Rigtigt — godt du blev ved!');
    audio.success();
    showCheckmark(this, this.scale.width / 2, this.scale.height / 2 + 30);
    showStarBurst(this, this.scale.width / 2, this.scale.height / 2 - 20, 6);
    speak(firstTry ? 'Rigtigt!' : 'Rigtigt. Godt du blev ved.');

    this.time.delayedCall(dur(900), () => {
      const done = this.onDone;
      stopSpeaking();
      this.scene.stop();
      done({ correct: firstTry, stars });
    });
  }
}

/**
 * Opens a task over the current scene, or pays the plain reward when there is nothing to
 * ask (free-play mode, or both subjects switched off).
 */
export function runTask(
  scene: Phaser.Scene,
  task: Task | null,
  onDone: (result: { correct: boolean; stars: number }) => void
): void {
  if (!task) {
    onDone({ correct: true, stars: 1 });
    return;
  }
  scene.scene.launch('TaskOverlayScene', { task, onDone } satisfies TaskOverlayData);
}

export { showToast };
