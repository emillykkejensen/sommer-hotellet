import Phaser from 'phaser';
import { COLORS, DEPTH, INK, INK_SOFT, SIZE, text } from '../config';
import { gameState } from '../state/GameState';
import { SHOP_ITEMS, ShopItem } from '../state/Shop';
import { showSparkle, showToast } from '../objects/FeedbackEffects';
import { addBackButton, addSceneTitle, addStarCounter } from '../ui/Chrome';
import { gradientBand, shadow, tappable } from '../helpers/Draw';
import { speak } from '../helpers/Speech';
import { BaseScene } from './BaseScene';

const AREA_LABEL: Record<ShopItem['area'], string> = {
  lobby: 'Lobbyen',
  rooms: 'Værelserne',
  kitchen: 'Køkkenet',
  pool: 'Poolen',
  garden: 'Haven',
};

/**
 * The star sink. Without somewhere for stars to go there is no reason to earn the next
 * one — which is also the reason a maths task can feel worth solving.
 */
export class ShopScene extends BaseScene {
  constructor() {
    super({ key: 'ShopScene' });
  }

  protected buildBackground(): void {
    const { width, height } = this.scale;
    this.background.add(gradientBand(this, 0, height, COLORS.cream, COLORS.sandLight));

    // bunting across the top
    const g = this.add.graphics();
    const colors = [COLORS.red, COLORS.sun, COLORS.water, COLORS.green, COLORS.purple];
    g.lineStyle(2, COLORS.woodDeep, 0.4);
    g.beginPath();
    g.moveTo(0, 68);
    for (let x = 0; x <= width; x += 20) g.lineTo(x, 68 + Math.sin(x * 0.02) * 7);
    g.strokePath();
    for (let i = 0; i * 52 < width; i++) {
      const x = 26 + i * 52;
      const y = 68 + Math.sin(x * 0.02) * 7;
      g.fillStyle(colors[i % colors.length], 0.9);
      g.fillTriangle(x - 14, y, x + 14, y, x, y + 26);
    }
    this.background.add(g);
  }

  protected buildChrome(): void {
    addBackButton(this);
    addStarCounter(this);
    addSceneTitle(this, 'Stjernebutikken');
  }

  protected buildDynamic(): void {
    const { width, height } = this.scale;

    const owned = SHOP_ITEMS.filter(i => gameState.owns(i.id)).length;
    this.dyn(this.add.text(width / 2, 112,
      owned === SHOP_ITEMS.length
        ? 'Du har købt alt til hotellet!'
        : 'Brug dine stjerner på noget til hotellet',
      text(SIZE.body, INK_SOFT, 'semibold')).setOrigin(0.5));

    const cols = 5;
    const cardW = 168;
    const cardH = 168;
    const gapX = 12;
    const gapY = 18;
    const startX = width / 2 - ((cols - 1) * (cardW + gapX)) / 2;

    SHOP_ITEMS.forEach((item, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      this.buildCard(item, startX + col * (cardW + gapX), 232 + row * (cardH + gapY), cardW, cardH);
    });

    this.dyn(this.add.text(width / 2, height - 22,
      'Tingene dukker op i rummene, når du har købt dem',
      text(SIZE.tiny, INK_SOFT, 'semibold')).setOrigin(0.5));
  }

  private buildCard(item: ShopItem, x: number, y: number, w: number, h: number): void {
    const isOwned = gameState.owns(item.id);
    const affordable = gameState.canAfford(item.cost);

    const c = this.add.container(x, y);

    const g = this.add.graphics();
    shadow(g, -w / 2, -h / 2, w, h, 18, 4, isOwned ? 0.1 : 0.16);
    g.fillStyle(COLORS.white, isOwned ? 0.72 : 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 18);
    g.lineStyle(2.5, isOwned ? COLORS.green : COLORS.stoneDeep, isOwned ? 0.8 : 0.35);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, 18);
    c.add(g);

    // area label
    c.add(this.add.text(0, -h / 2 + 18, AREA_LABEL[item.area],
      text(SIZE.tiny, INK_SOFT, 'bold')).setOrigin(0.5));

    // the item itself, drawn small
    const preview = item.draw(this);
    preview.setScale(0.72).setPosition(0, -4);
    c.add(preview);

    c.add(this.add.text(0, h / 2 - 46, item.name, text(SIZE.label, INK, 'bold')).setOrigin(0.5));

    if (isOwned) {
      const badge = this.add.graphics();
      badge.fillStyle(COLORS.green);
      badge.fillRoundedRect(-38, h / 2 - 32, 76, 22, 11);
      c.add(badge);
      c.add(this.add.text(0, h / 2 - 21, 'Købt', text(SIZE.tiny, '#FFFFFF', 'bold')).setOrigin(0.5));
      this.dyn(c);
      return;
    }

    // price tag
    const tag = this.add.container(0, h / 2 - 20);
    const tg = this.add.graphics();
    tg.fillStyle(affordable ? COLORS.sun : COLORS.stone);
    tg.fillRoundedRect(-40, -13, 80, 26, 13);
    tag.add(tg);
    const star = this.add.star(-20, 0, 5, 4.5, 9, affordable ? COLORS.white : COLORS.stoneDeep);
    tag.add(star);
    tag.add(this.add.text(7, 0, `${item.cost}`,
      text(SIZE.body, affordable ? '#5A4E42' : '#8A7E70', 'bold')).setOrigin(0.5));
    c.add(tag);

    if (!affordable) c.setAlpha(0.72);
    this.dyn(c);

    tappable(this, c, w, h, () => {
      if (!gameState.buy(item.id, item.cost)) {
        const short = item.cost - gameState.stars;
        const message = `Du mangler ${short} ${short === 1 ? 'stjerne' : 'stjerner'}`;
        showToast(this, x, y - h / 2 - 8, message, '#B9584A');
        speak(message);
        return;
      }
      showSparkle(this, x, y, w, h);
      showToast(this, x, y - h / 2 - 8, `${item.name} er købt!`, '#4A7F33');
      speak(`${item.name} er købt`);
      this.events.emit('starsChanged', gameState.stars);
      this.refresh();
    });
  }
}

/** Places every bought decoration belonging to an area. Called by each scene's refresh. */
export function placeDecorations(
  scene: Phaser.Scene,
  area: ShopItem['area'],
  layer: Phaser.GameObjects.Container
): void {
  const { width, height } = scene.scale;
  for (const item of SHOP_ITEMS) {
    if (item.area !== area || !gameState.owns(item.id)) continue;
    const piece = item.draw(scene);
    piece.setPosition(width * item.spot.x, height * item.spot.y);
    piece.setDepth(DEPTH.dynamic);
    layer.add(piece);
  }
}
