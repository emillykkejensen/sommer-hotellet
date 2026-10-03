import Phaser from 'phaser';
import { COLORS, DEPTH, INK, LINE, SIZE, text } from '../config';
import { GuestData } from '../state/GameState';
import { button, caption, drawHead, plate, shade, shadow } from '../helpers/Draw';
import { reduceMotion } from '../helpers/Motion';
import { audio } from '../helpers/Audio';
import { CardAction, CardModel, drawDish } from './Guests';

/** How tall the card is. Scenes keep their important controls clear of it where they can. */
export const CARD_HEIGHT = 124;
const MARGIN = 10;

/**
 * The guest card: what a guest says, what they want, and the buttons that do it.
 *
 * It slides up from the bottom rather than opening beside the guest. The same place every
 * time means a child learns where to look; the full width leaves room for buttons big enough
 * for a small finger; and it never lands on top of the guest at the next table.
 *
 * The card is a picture of `CardModel` and nothing else — what an action does lives with the
 * scene, so the card cannot drift into making decisions of its own.
 */
export function drawGuestCard(
  scene: Phaser.Scene,
  guest: GuestData,
  model: CardModel,
  onAction: (action: CardAction) => void,
  onClose: () => void,
  animate: boolean
): Phaser.GameObjects.Container {
  const { width, height } = scene.scale;
  const cw = width - MARGIN * 2;
  const ch = CARD_HEIGHT;
  const cy = height - MARGIN - ch / 2;

  const c = scene.add.container(width / 2, cy).setDepth(DEPTH.chrome + 20).setName('guestCard');

  const bg = scene.add.graphics();
  shadow(bg, -cw / 2, -ch / 2, cw, ch, 22, 6, 0.24);
  plate(bg, -cw / 2, -ch / 2, cw, ch, 22, COLORS.cream, 1, LINE.thick);
  // a band in the guest's own colour down the left, behind their face
  bg.fillStyle(shade(guest.color, 0.55));
  bg.fillRoundedRect(-cw / 2 + 6, -ch / 2 + 6, 92, ch - 12, { tl: 17, bl: 17, tr: 8, br: 8 });
  c.add(bg);

  // The card swallows taps on its own background, so pressing between two buttons does not
  // fall through to a lounger underneath — or count as tapping "away" and close it.
  c.setSize(cw, ch);
  c.setInteractive();

  // face and name
  const faceX = -cw / 2 + 52;
  const disc = scene.add.graphics();
  disc.fillStyle(COLORS.white);
  disc.fillCircle(faceX, -12, 31);
  disc.lineStyle(LINE.base, COLORS.outline, 0.9);
  disc.strokeCircle(faceX, -12, 31);
  c.add(disc);
  c.add(drawHead(scene, faceX, 2, guest.color, 1.6));
  const name = scene.add.text(faceX, ch / 2 - 17, guest.name, text(SIZE.tiny, INK, 'bold'))
    .setOrigin(0.5);
  if (name.width > 86) name.setScale(86 / name.width);
  c.add(name);

  // what they want, top right, ticked off as it arrives
  const cell = 48;
  const wantsW = model.wants.length * cell;
  const wantsRight = cw / 2 - 54;
  model.wants.forEach((want, i) => {
    const x = wantsRight - wantsW + cell / 2 + i * cell;
    const y = -ch / 2 + 30;
    const holder = scene.add.container(x, y);
    const back = scene.add.graphics();
    back.fillStyle(COLORS.white, want.done ? 0.6 : 1);
    back.fillCircle(0, 0, 21);
    back.lineStyle(LINE.thin, want.done ? COLORS.green : COLORS.stoneDeep, want.done ? 1 : 0.5);
    back.strokeCircle(0, 0, 21);
    holder.add(back);

    if (want.kind === 'dish') {
      holder.add(drawDish(scene, want.dish, 0.95).setPosition(0, -2));
    } else {
      const g = scene.add.graphics();
      want.paint(g, 1.12);
      holder.add(g);
    }
    if (want.done) {
      holder.setAlpha(0.75);
      const tick = scene.add.graphics().setPosition(14, 14);
      tick.fillStyle(COLORS.green);
      tick.fillCircle(0, 0, 9);
      tick.lineStyle(LINE.hair, COLORS.outline, 0.9);
      tick.strokeCircle(0, 0, 9);
      tick.lineStyle(2.4, COLORS.white);
      tick.beginPath();
      tick.moveTo(-4, 0);
      tick.lineTo(-1, 3.4);
      tick.lineTo(4.4, -3.2);
      tick.strokePath();
      holder.add(tick);
    }
    c.add(holder);
  });

  // what they say
  const textX = -cw / 2 + 112;
  const textW = Math.max(220, wantsRight - wantsW - textX - 12);
  const line = scene.add.text(textX, -ch / 2 + 12, model.line.text, {
    ...text(SIZE.body, INK, 'bold'),
    wordWrap: { width: textW },
  });
  if (line.height > 50) line.setFontSize(SIZE.label);
  c.add(line);

  // the buttons, or what to do instead
  const rowY = ch / 2 - 29;
  if (model.actions.length > 0) {
    let x = textX;
    for (const action of model.actions) {
      const probe = scene.add.text(0, 0, action.label, text(SIZE.body, '#FFFFFF', 'bold'));
      const w = Math.min(250, Math.max(150, probe.width + 44));
      probe.destroy();
      const b = button(scene, x + w / 2, rowY, action.label,
        action.kind === 'lead' ? COLORS.teal : COLORS.green,
        () => onAction(action), w, 42, SIZE.body);
      c.add(b);
      x += w + 12;
    }
  } else if (model.hint) {
    const hint = caption(scene, 0, rowY, model.hint);
    hint.setX(textX + hint.getBounds().width / 2);
    c.add(hint);
  }

  // close
  const close = scene.add.container(cw / 2 - 24, -ch / 2 + 24);
  const cg = scene.add.graphics();
  cg.fillStyle(COLORS.white);
  cg.fillCircle(0, 0, 17);
  cg.lineStyle(LINE.base, COLORS.outline, 0.85);
  cg.strokeCircle(0, 0, 17);
  cg.lineStyle(3.2, COLORS.inkSoft);
  cg.lineBetween(-6, -6, 6, 6);
  cg.lineBetween(6, -6, -6, 6);
  close.add(cg);
  close.setSize(44, 44);
  close.setInteractive({ useHandCursor: true });
  close.on('pointerdown', () => {
    audio.tap();
    onClose();
  });
  c.add(close);

  if (animate && !reduceMotion()) {
    c.setY(cy + 40).setAlpha(0);
    scene.tweens.add({ targets: c, y: cy, alpha: 1, duration: 170, ease: 'Back.easeOut' });
  }

  return c;
}
