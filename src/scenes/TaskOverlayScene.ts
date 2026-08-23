import Phaser from 'phaser';
import { COLORS, DEPTH, INK, INK_SOFT, SIZE, text } from '../config';
import { gameState } from '../state/GameState';
import { Task, TaskBody } from '../tasks/types';
import { clockLabel, drawClock, drawFigure, drawIcon, drawThermometer } from '../tasks/figures';
import { showCheckmark, showStarBurst, showToast } from '../objects/FeedbackEffects';
import { shadow, tappable } from '../helpers/Draw';
import { audio } from '../helpers/Audio';
import { dur, reduceMotion } from '../helpers/Motion';

export interface TaskOverlayData {
  task: Task;
  /** Called once, after the child has finished — always, right or wrong. */
  onDone: (result: { correct: boolean; stars: number }) => void;
}

const PATTERN_COLORS = [COLORS.pink, COLORS.sun, COLORS.water, COLORS.purple];

/**
 * How many wrong answers a task survives.
 *
 * The first version had no ceiling: a wrong tap cost nothing, so the fastest way through
 * any task was to tap everything until something worked, and a child who did that learned
 * only that tapping everything works. Three tries is the consequence — not a fail screen,
 * not a lost life, and nothing taken away, just a task that closes without paying.
 */
const MAX_MISSES = 3;

/**
 * The task layer. Launched with scene.launch() so the room stays visible behind it and no
 * scene is ever rebuilt.
 *
 * A wrong tap wobbles, shows a hint, and takes one wrong option off the board — and costs
 * a try. Answering right on the first go pays in full; stumbling pays less; running out of
 * tries pays nothing and closes the card. The chore that raised the task has already
 * happened either way, so the hotel is never left broken by a wrong answer.
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
  private strikes!: Phaser.GameObjects.Container;

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
    const TALL: TaskBody['template'][] = ['number-pad', 'count-taps', 'adjust'];
    const ph = template === 'number-pad' ? 452 : TALL.includes(template) ? 400 : 306;
    const tall = TALL.includes(template);
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

    this.buildStrikes(pw / 2 - 52, -ph / 2 + 37);

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

  }

  private accent(): number {
    return this.task.subject === 'matematik' ? COLORS.water : COLORS.green;
  }

  /**
   * Tries left, as three pips.
   *
   * A consequence a child cannot see coming is just an unpleasant surprise, so the cost of
   * a wrong answer is on the card from the moment it opens.
   */
  private buildStrikes(x: number, y: number): void {
    this.strikes = this.add.container(x, y);
    this.panel.add(this.strikes);
    this.drawStrikes();
  }

  private drawStrikes(): void {
    this.strikes.removeAll(true);
    const left = MAX_MISSES - this.attempts;
    for (let i = 0; i < MAX_MISSES; i++) {
      const alive = i < left;
      const pip = this.add.circle((i - 1) * 21, 0, alive ? 8 : 6,
        alive ? this.accent() : COLORS.stone);
      pip.setStrokeStyle(2, alive ? this.accent() : COLORS.stoneDeep, alive ? 1 : 0.5);
      this.strikes.add(pip);
    }
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
      case 'pick-image': return this.buildPickImage(b);
      case 'put-in-order': return this.buildPutInOrder(b);
      case 'adjust': return this.buildAdjust(b);
    }
  }

  private buildCountTaps(b: Extract<TaskBody, { template: 'count-taps' }>): void {
    // a big tappable thing, plus a row of pips that fills as the child counts
    const target = b.target;

    const stack = this.add.container(0, -6);
    const icon = drawIcon(this, b.icon, 1.9);
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
        // Small pause so the child can see the last pip land — but re-check the count when
        // it fires. Tapping once more in that window used to reset the pips, say "one too
        // many", and then succeed anyway.
        this.time.delayedCall(dur(260), () => {
          if (this.taps === target) this.succeed();
        });
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

  /** Pick the right drawing: a shape, a cut cake, a clock face. */
  private buildPickImage(b: Extract<TaskBody, { template: 'pick-image' }>): void {
    const live = b.options
      .map((figure, index) => ({ figure, index }))
      .filter(o => !this.ruledOut.includes(String(o.index)));

    const size = 128;
    const gap = 26;
    const totalW = live.length * size + (live.length - 1) * gap;

    live.forEach((option, i) => {
      const x = -totalW / 2 + size / 2 + i * (size + gap);
      const c = this.add.container(x, 16);

      const g = this.add.graphics();
      shadow(g, -size / 2, -size / 2, size, size, 18, 4, 0.16);
      g.fillStyle(COLORS.white);
      g.fillRoundedRect(-size / 2, -size / 2, size, size, 18);
      g.lineStyle(2.5, this.accent(), 0.45);
      g.strokeRoundedRect(-size / 2, -size / 2, size, size, 18);
      c.add(g);
      c.add(drawFigure(this, option.figure));
      this.body.add(c);

      tappable(this, c, size, size, () => {
        if (this.finished) return;
        if (option.index === b.answer) {
          this.succeed();
        } else {
          this.ruledOut.push(String(option.index));
          this.wobble(c);
          this.miss('Ikke helt. Se godt på dem, og prøv igen.');
          this.time.delayedCall(dur(420), () => this.buildBody());
        }
      });
    });
  }

  /**
   * Tap the items in order — smallest first, or alphabetically.
   *
   * A wrong tap resets the run rather than ending anything, so the child can start the
   * sequence again without losing the task.
   */
  private buildPutInOrder(b: Extract<TaskBody, { template: 'put-in-order' }>): void {
    // Shuffled once per attempt, seeded off nothing — a fresh order each retry is fine
    // and keeps the child from just repeating a remembered position.
    const shuffled = Phaser.Utils.Array.Shuffle([...b.items]);
    let nextRank = 0;
    const taken: Phaser.GameObjects.Container[] = [];

    const size = 118;
    const gap = 22;
    const totalW = shuffled.length * size + (shuffled.length - 1) * gap;

    this.body.add(this.add.text(0, -76, b.hint, text(SIZE.label, INK_SOFT, 'semibold'))
      .setOrigin(0.5));

    shuffled.forEach((item, i) => {
      const x = -totalW / 2 + size / 2 + i * (size + gap);
      const c = this.add.container(x, 18);

      const g = this.add.graphics();
      shadow(g, -size / 2, -size / 2, size, size, 18, 4, 0.16);
      g.fillStyle(COLORS.white);
      g.fillRoundedRect(-size / 2, -size / 2, size, size, 18);
      g.lineStyle(2.5, this.accent(), 0.45);
      g.strokeRoundedRect(-size / 2, -size / 2, size, size, 18);
      c.add(g);
      c.add(drawFigure(this, item.figure));

      const badge = this.add.text(0, size / 2 - 20, '', text(SIZE.label, '#FFFFFF', 'bold'))
        .setOrigin(0.5);
      c.add(badge);
      c.setData('rank', item.rank);
      c.setData('badge', badge);
      this.body.add(c);

      tappable(this, c, size, size, () => {
        if (this.finished || c.getData('done')) return;

        if (item.rank !== nextRank) {
          this.wobble(c);
          this.miss(nextRank === 0
            ? 'Start med den første.'
            : 'Ikke den. Prøv en anden.');
          // clear the run so the child can start over
          nextRank = 0;
          taken.forEach(t => {
            t.setData('done', false);
            t.setAlpha(1);
            (t.getData('badge') as Phaser.GameObjects.Text).setText('');
          });
          taken.length = 0;
          return;
        }

        nextRank++;
        c.setData('done', true);
        c.setAlpha(0.55);
        badge.setText(`${nextRank}`);
        taken.push(c);

        const ring = this.add.graphics();
        ring.fillStyle(this.accent());
        ring.fillCircle(0, size / 2 - 20, 13);
        c.addAt(ring, c.list.length - 1);

        if (nextRank === b.items.length) {
          this.time.delayedCall(dur(260), () => this.succeed());
        }
      });
    });
  }

  /** Turn a dial to a target: the pool thermometer, or the breakfast clock. */
  private buildAdjust(b: Extract<TaskBody, { template: 'adjust' }>): void {
    let value = b.from;

    // The dial is the whole task, so it gets the space: a 40px clock face in a 680px card
    // was unreadable.
    const dial = this.add.container(0, -24).setScale(1.5);
    this.body.add(dial);

    const reading = this.add.text(0, 74, '', text(SIZE.title - 2, INK, 'bold')).setOrigin(0.5);
    this.body.add(reading);

    const render = () => {
      dial.removeAll(true);
      dial.add(b.dial === 'clock'
        ? drawClock(this, value)
        : drawThermometer(this, value, b.min, b.max));
      reading.setText(b.dial === 'clock'
        ? `Klokken er ${clockLabel(value)}`
        : `${value} ${b.unit ?? 'grader'}`);
    };

    const stepBy = (delta: number) => {
      if (this.finished) return;
      const next = Phaser.Math.Clamp(value + delta, b.min, b.max);
      if (next === value) return;
      value = Math.round(next / b.step) * b.step;
      render();

      if (Math.abs(value - b.target) < b.step / 2) {
        this.time.delayedCall(dur(320), () => this.succeed());
      }
    };

    this.buildStepButton(-150, 74, '−', () => stepBy(-b.step));
    this.buildStepButton(150, 74, '+', () => stepBy(b.step));

    render();
  }

  private buildStepButton(x: number, y: number, glyph: string, onTap: () => void): void {
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    shadow(g, -34, -28, 68, 56, 18, 3, 0.18);
    g.fillStyle(this.accent());
    g.fillRoundedRect(-34, -28, 68, 56, 18);
    g.fillStyle(COLORS.white, 0.22);
    g.fillRoundedRect(-31, -25, 62, 24, 14);
    c.add([g, this.add.text(0, -2, glyph, text(38, '#FFFFFF', 'bold')).setOrigin(0.5)]);
    this.body.add(c);
    tappable(this, c, 68, 56, onTap);
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
    if (this.finished) return;
    this.attempts++;
    this.drawStrikes();

    if (this.attempts >= MAX_MISSES) {
      this.giveUp();
      return;
    }

    audio.nudge();
    const left = MAX_MISSES - this.attempts;
    this.hint.setText(left === 1 ? `${hint} Du har ét forsøg tilbage.` : hint);
  }

  /**
   * Out of tries. The card closes and pays nothing.
   *
   * Deliberately gentle in wording and in sound — the point is that the star did not
   * happen, not that the child did something wrong.
   */
  private giveUp(): void {
    if (this.finished) return;
    this.finished = true;

    gameState.recordAttempt(this.task.skill, false);
    audio.denied();
    this.hint.setText('Den var svær. Vi prøver en anden en næste gang.');
    this.body.list.forEach(child => {
      const c = child as Phaser.GameObjects.Container;
      if (c.setAlpha) c.setAlpha(0.45);
    });

    this.time.delayedCall(dur(1400), () => {
      const done = this.onDone;
      this.scene.stop();
      done({ correct: false, stars: 0 });
    });
  }

  private succeed(): void {
    if (this.finished) return;
    this.finished = true;

    // First time right pays in full; after a stumble it pays less. Running out of tries
    // pays nothing, but that path never reaches here.
    const stars = Math.max(1, this.task.reward - this.attempts);
    const firstTry = this.attempts === 0;

    gameState.recordAttempt(this.task.skill, firstTry);

    this.hint.setText(firstTry ? 'Rigtigt!' : 'Rigtigt — godt du blev ved!');
    audio.success();
    showCheckmark(this, this.scale.width / 2, this.scale.height / 2 + 30);
    showStarBurst(this, this.scale.width / 2, this.scale.height / 2 - 20, 6);

    this.time.delayedCall(dur(900), () => {
      const done = this.onDone;
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
