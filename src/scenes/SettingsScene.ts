import { COLORS, INK, INK_SOFT, SIZE, text } from '../config';
import { gameState, Mode } from '../state/GameState';
import { skillLabel } from '../tasks/picker';
import { SKILLS, SkillId } from '../tasks/types';
import { addBackButton, addSceneTitle } from '../ui/Chrome';
import { gradientBand, shadow, tappable } from '../helpers/Draw';
import { audio } from '../helpers/Audio';
import { canSpeak } from '../helpers/Speech';
import { BaseScene } from './BaseScene';

/**
 * The grown-up screen. Deliberately plain and text-heavy — it is for a parent, not for
 * the child, and it is the thing that makes an adult keep the game installed.
 */
export class SettingsScene extends BaseScene {
  constructor() {
    super({ key: 'SettingsScene' });
  }

  private confirmingReset = false;

  protected buildBackground(): void {
    const { height } = this.scale;
    this.background.add(gradientBand(this, 0, height, COLORS.wall, COLORS.wallDeep));
  }

  protected buildChrome(): void {
    addBackButton(this);
    addSceneTitle(this, 'For de voksne');
  }

  protected buildDynamic(): void {
    const { width } = this.scale;

    this.buildModeChoice(width / 2, 126);
    this.buildToggles(width / 2, 250);
    this.buildProgress(width / 2, 358);
    this.buildReset(width / 2, this.scale.height - 40);
  }

  /* ------------------------------------------------------------------ mode --- */

  private buildModeChoice(cx: number, y: number): void {
    this.dyn(this.add.text(cx, y - 34, 'Hvordan skal spillet virke?',
      text(SIZE.body, INK_SOFT, 'bold')).setOrigin(0.5));

    const modes: { mode: Mode; title: string; blurb: string }[] = [
      { mode: 'leg', title: 'Leg', blurb: 'Fri leg. Ingen opgaver.' },
      { mode: 'laer', title: 'Lær', blurb: 'Små regne- og danskopgaver giver stjernerne.' },
    ];

    modes.forEach((m, i) => {
      const active = gameState.settings.mode === m.mode;
      const w = 300;
      const h = 82;
      const x = cx - 158 + i * 316;
      const c = this.add.container(x, y + 32);

      const g = this.add.graphics();
      shadow(g, -w / 2, -h / 2, w, h, 16, active ? 4 : 2, active ? 0.18 : 0.1);
      g.fillStyle(active ? COLORS.green : COLORS.white, active ? 1 : 0.9);
      g.fillRoundedRect(-w / 2, -h / 2, w, h, 16);
      if (!active) {
        g.lineStyle(2, COLORS.stoneDeep, 0.35);
        g.strokeRoundedRect(-w / 2, -h / 2, w, h, 16);
      }
      c.add(g);

      c.add(this.add.text(0, -14, m.title,
        text(SIZE.heading, active ? '#FFFFFF' : INK, 'bold')).setOrigin(0.5));
      c.add(this.add.text(0, 14, m.blurb, {
        ...text(SIZE.tiny, active ? '#F4FBF1' : INK_SOFT, 'semibold'),
        wordWrap: { width: w - 36 },
        align: 'center',
      }).setOrigin(0.5));

      this.dyn(c);
      if (active) return;
      tappable(this, c, w, h, () => {
        gameState.setMode(m.mode);
        this.refresh();
      });
    });
  }

  /* --------------------------------------------------------------- toggles --- */

  private buildToggles(cx: number, y: number): void {
    const items: { key: 'matematik' | 'dansk' | 'speak' | 'sound'; label: string; available: boolean }[] = [
      { key: 'matematik', label: 'Tal-opgaver', available: true },
      { key: 'dansk', label: 'Dansk-opgaver', available: true },
      { key: 'sound', label: 'Lyd', available: audio.available() },
      { key: 'speak', label: 'Læs op', available: canSpeak() },
    ];

    // 2x2 — four of these in one row would not fit the panel width
    items.forEach((item, i) => {
      const on = gameState.settings[item.key] && item.available;
      const w = 250;
      const x = cx + (i % 2 === 0 ? -134 : 134);
      const rowY = y + Math.floor(i / 2) * 56;
      const c = this.add.container(x, rowY);

      const g = this.add.graphics();
      g.fillStyle(COLORS.white, 0.9);
      g.fillRoundedRect(-w / 2, -22, w, 44, 22);
      g.lineStyle(2, COLORS.stoneDeep, 0.3);
      g.strokeRoundedRect(-w / 2, -22, w, 44, 22);

      // switch
      const trackX = w / 2 - 52;
      g.fillStyle(on ? COLORS.green : COLORS.stone);
      g.fillRoundedRect(trackX, -11, 42, 22, 11);
      g.fillStyle(COLORS.white);
      g.fillCircle(trackX + (on ? 31 : 11), 0, 8.5);
      c.add(g);

      c.add(this.add.text(-w / 2 + 20, 0, item.label,
        text(SIZE.label, item.available ? INK : INK_SOFT, 'bold')).setOrigin(0, 0.5));

      this.dyn(c);
      if (!item.available) {
        c.setAlpha(0.6);
        return;
      }
      tappable(this, c, w, 44, () => {
        gameState.toggleSetting(item.key);
        if (item.key === 'sound' && gameState.settings.sound) {
          // let the grown-up hear what they just switched on
          audio.unlock();
          audio.pop();
        }
        this.refresh();
      });
    });

    if (!canSpeak()) {
      this.dyn(this.add.text(cx, y + 118,
        'Denne browser kan ikke læse op',
        text(SIZE.tiny, INK_SOFT, 'semibold')).setOrigin(0.5));
    }
  }

  /* -------------------------------------------------------------- progress --- */

  private buildProgress(cx: number, y: number): void {
    const practised = gameState.practised();

    this.dyn(this.add.text(cx, y, 'Øvet indtil nu', text(SIZE.body, INK_SOFT, 'bold')).setOrigin(0.5));

    if (practised.length === 0) {
      this.dyn(this.add.text(cx, y + 34,
        'Ingen opgaver løst endnu. Slå "Lær" til, og stjernerne kommer fra opgaverne.',
        { ...text(SIZE.label, INK_SOFT, 'semibold'), wordWrap: { width: 520 }, align: 'center' })
        .setOrigin(0.5));
      return;
    }

    // Two columns. The catalogue is 19 skills deep, so this is the most-practised slice
    // rather than the whole list, with a count of what is not shown.
    const shown = 10;
    const rows = practised.slice(0, shown);
    rows.forEach(({ skill, progress }, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = cx - 250 + col * 500;
      const ry = y + 32 + row * 32;

      const c = this.add.container(x, ry);
      const subject = SKILLS[skill as SkillId]?.subject ?? 'matematik';
      const tint = subject === 'matematik' ? COLORS.water : COLORS.green;

      const g = this.add.graphics();
      g.fillStyle(COLORS.white, 0.75);
      g.fillRoundedRect(-160, -14, 320, 28, 14);
      g.fillStyle(tint, 0.9);
      g.fillCircle(-146, 0, 5);
      c.add(g);

      c.add(this.add.text(-132, 0, skillLabel(skill), text(SIZE.label, INK, 'semibold'))
        .setOrigin(0, 0.5));

      // three dots for the level the child has reached
      for (let d = 0; d < 3; d++) {
        const dot = this.add.circle(72 + d * 16, 0, 5, d < progress.level ? tint : COLORS.stone);
        c.add(dot);
      }

      c.add(this.add.text(152, 0, `${progress.correct}/${progress.seen}`,
        text(SIZE.tiny, INK_SOFT, 'bold')).setOrigin(1, 0.5));

      this.dyn(c);
    });

    const hidden = practised.length - rows.length;
    if (hidden > 0) {
      const lastRow = Math.ceil(rows.length / 2);
      this.dyn(this.add.text(cx, y + 34 + lastRow * 32,
        `og ${hidden} ${hidden === 1 ? 'færdighed' : 'færdigheder'} mere`,
        text(SIZE.tiny, INK_SOFT, 'semibold')).setOrigin(0.5));
    }
  }

  /* ----------------------------------------------------------------- reset --- */

  private buildReset(cx: number, y: number): void {
    const label = this.confirmingReset ? 'Tryk igen for at slette alt' : 'Start forfra';
    const c = this.add.container(cx, y);

    const t = this.add.text(0, 0, label,
      text(SIZE.label, this.confirmingReset ? '#B9584A' : INK_SOFT, 'bold')).setOrigin(0.5);
    const w = t.width + 40;

    const g = this.add.graphics();
    g.fillStyle(COLORS.white, 0.8);
    g.fillRoundedRect(-w / 2, -18, w, 36, 18);
    g.lineStyle(2, this.confirmingReset ? COLORS.red : COLORS.stoneDeep, 0.45);
    g.strokeRoundedRect(-w / 2, -18, w, 36, 18);

    c.add([g, t]);
    this.dyn(c);

    tappable(this, c, w, 36, () => {
      if (this.confirmingReset) {
        gameState.reset();
        this.confirmingReset = false;
        this.refresh();
        return;
      }
      this.confirmingReset = true;
      this.refresh();
      this.time.delayedCall(4000, () => {
        if (this.scene.isActive() && this.confirmingReset) {
          this.confirmingReset = false;
          this.refresh();
        }
      });
    });
  }
}
