import Phaser from 'phaser';
import { COLORS, DEPTH, INK, INK_SOFT, SIZE, text } from '../config';
import { gameState } from '../state/GameState';
import { SHOP_ITEMS, SHOP_UPGRADES, ShopItem, ShopUpgrade } from '../state/Shop';
import { showSparkle, showToast } from '../objects/FeedbackEffects';
import { addBackButton, addSceneTitle, addStarCounter } from '../ui/Chrome';
import { gradientBand, shadow, tappable } from '../helpers/Draw';
import { audio } from '../helpers/Audio';
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
type Tab = 'ting' | 'hotellet';

export class ShopScene extends BaseScene {
  private tab: Tab = 'ting';

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

    const total = SHOP_ITEMS.length + SHOP_UPGRADES.length;
    const owned = [...SHOP_ITEMS, ...SHOP_UPGRADES].filter(i => gameState.owns(i.id)).length;
    this.dyn(this.add.text(width / 2, 104,
      owned === total
        ? 'Du har købt alt til hotellet!'
        : 'Brug dine stjerner på noget til hotellet',
      text(SIZE.body, INK_SOFT, 'semibold')).setOrigin(0.5));

    this.buildTabs(width / 2, 140);

    // Both grids size themselves from the catalogue, so adding an item reflows the shelf
    // rather than pushing a card off the bottom of the screen.
    if (this.tab === 'ting') {
      const cols = Math.ceil(SHOP_ITEMS.length / 2);
      const cardW = Math.min(168, Math.floor((width - 40) / cols) - 8);
      const cardH = 146;
      const stepX = cardW + 8;
      const startX = width / 2 - ((cols - 1) * stepX) / 2;
      SHOP_ITEMS.forEach((item, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        this.buildCard(item, startX + col * stepX, 262 + row * (cardH + 16), cardW, cardH);
      });
      this.dyn(this.add.text(width / 2, height - 20,
        'Tingene dukker op i rummene, når du har købt dem',
        text(SIZE.tiny, INK_SOFT, 'semibold')).setOrigin(0.5));
      return;
    }

    const upgradeCols = Math.ceil(SHOP_UPGRADES.length / 2);
    const cardW = 212;
    const cardH = 168;
    const stepX = cardW + 16;
    const startX = width / 2 - ((upgradeCols - 1) * stepX) / 2;
    SHOP_UPGRADES.forEach((upgrade, i) => {
      const col = i % upgradeCols;
      const row = Math.floor(i / upgradeCols);
      this.buildUpgradeCard(upgrade, startX + col * stepX, 236 + row * (cardH + 12), cardW, cardH);
    });
    this.dyn(this.add.text(width / 2, height - 20,
      'Temaer vælges inde på værelserne',
      text(SIZE.tiny, INK_SOFT, 'semibold')).setOrigin(0.5));
  }

  /** Two shelves: things that decorate, and upgrades that change the hotel. */
  private buildTabs(cx: number, y: number): void {
    const tabs: { id: Tab; label: string; count: number; owned: number }[] = [
      {
        id: 'ting', label: 'Ting',
        count: SHOP_ITEMS.length,
        owned: SHOP_ITEMS.filter(i => gameState.owns(i.id)).length,
      },
      {
        id: 'hotellet', label: 'Hotellet',
        count: SHOP_UPGRADES.length,
        owned: SHOP_UPGRADES.filter(i => gameState.owns(i.id)).length,
      },
    ];

    tabs.forEach((tab, i) => {
      const active = tab.id === this.tab;
      const w = 176;
      const h = 40;
      const x = cx + (i - 0.5) * (w + 14);
      const c = this.add.container(x, y);

      const g = this.add.graphics();
      if (active) shadow(g, -w / 2, -h / 2, w, h, h / 2, 3, 0.18);
      g.fillStyle(active ? COLORS.sunDeep : COLORS.white, active ? 1 : 0.85);
      g.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
      if (!active) {
        g.lineStyle(2, COLORS.stoneDeep, 0.35);
        g.strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);
      }
      c.add(g);
      c.add(this.add.text(-14, 0, tab.label,
        text(SIZE.body, active ? '#FFFFFF' : INK, 'bold')).setOrigin(0.5));
      c.add(this.add.text(w / 2 - 30, 0, `${tab.owned}/${tab.count}`,
        text(SIZE.tiny, active ? '#FFF6DD' : INK_SOFT, 'bold')).setOrigin(0.5));

      this.dyn(c);
      if (active) return;
      tappable(this, c, w, h, () => {
        this.tab = tab.id;
        this.refresh();
      });
    });
  }

  private buildUpgradeCard(upgrade: ShopUpgrade, x: number, y: number, w: number, h: number): void {
    const isOwned = gameState.owns(upgrade.id);
    const affordable = gameState.canAfford(upgrade.cost);
    const c = this.add.container(x, y);

    const g = this.add.graphics();
    shadow(g, -w / 2, -h / 2, w, h, 18, 4, isOwned ? 0.1 : 0.16);
    g.fillStyle(COLORS.white, isOwned ? 0.72 : 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 18);
    g.lineStyle(2.5, isOwned ? COLORS.green : COLORS.stoneDeep, isOwned ? 0.8 : 0.35);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, 18);
    c.add(g);

    const preview = upgrade.draw(this);
    preview.setScale(0.86).setPosition(0, -26);
    c.add(preview);

    c.add(this.add.text(0, h / 2 - 62, upgrade.name, text(SIZE.body, INK, 'bold')).setOrigin(0.5));
    c.add(this.add.text(0, h / 2 - 41, upgrade.blurb,
      { ...text(SIZE.tiny, INK_SOFT, 'semibold'), wordWrap: { width: w - 40 }, align: 'center' })
      .setOrigin(0.5));

    if (isOwned) {
      const badge = this.add.graphics();
      badge.fillStyle(COLORS.green);
      badge.fillRoundedRect(-38, h / 2 - 30, 76, 22, 11);
      c.add(badge);
      c.add(this.add.text(0, h / 2 - 19, 'Købt', text(SIZE.tiny, '#FFFFFF', 'bold')).setOrigin(0.5));
      this.dyn(c);
      return;
    }

    const tag = this.add.container(0, h / 2 - 18);
    const tg = this.add.graphics();
    tg.fillStyle(affordable ? COLORS.sun : COLORS.stone);
    tg.fillRoundedRect(-40, -13, 80, 26, 13);
    tag.add(tg);
    tag.add(this.add.star(-20, 0, 5, 4.5, 9, affordable ? COLORS.white : COLORS.stoneDeep));
    tag.add(this.add.text(7, 0, `${upgrade.cost}`,
      text(SIZE.body, affordable ? '#5A4E42' : '#8A7E70', 'bold')).setOrigin(0.5));
    c.add(tag);

    if (!affordable) c.setAlpha(0.72);
    this.dyn(c);

    tappable(this, c, w, h, () => {
      if (!gameState.buy(upgrade.id, upgrade.cost)) {
        const short = upgrade.cost - gameState.stars;
        audio.denied();
        const message = `Du mangler ${short} ${short === 1 ? 'stjerne' : 'stjerner'}`;
        showToast(this, x, y - h / 2 - 8, message, '#B9584A');
        return;
      }
      audio.purchase();
      showSparkle(this, x, y, w, h);
      showToast(this, x, y - h / 2 - 8, `${upgrade.name} er købt!`, '#4A7F33');
      this.events.emit('starsChanged', gameState.stars);
      this.refresh();
    });
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
    c.add(this.add.text(0, -h / 2 + 15, AREA_LABEL[item.area],
      text(SIZE.tiny, INK_SOFT, 'bold')).setOrigin(0.5));

    // the item itself, drawn small — scaled to whatever width the shelf gave the card
    const preview = item.draw(this);
    preview.setScale(Math.min(0.62, (w - 30) / 150)).setPosition(0, -8);
    c.add(preview);

    const label = this.add.text(0, h / 2 - 44, item.name, text(SIZE.label, INK, 'bold'))
      .setOrigin(0.5);
    if (label.width > w - 12) label.setFontSize(SIZE.tiny);
    c.add(label);

    if (isOwned) {
      const badge = this.add.graphics();
      badge.fillStyle(COLORS.green);
      badge.fillRoundedRect(-34, h / 2 - 30, 68, 21, 10.5);
      c.add(badge);
      c.add(this.add.text(0, h / 2 - 20, 'Købt', text(SIZE.tiny, '#FFFFFF', 'bold')).setOrigin(0.5));
      this.dyn(c);
      return;
    }

    // price tag
    const tag = this.add.container(0, h / 2 - 19);
    const tg = this.add.graphics();
    tg.fillStyle(affordable ? COLORS.sun : COLORS.stone);
    tg.fillRoundedRect(-36, -12, 72, 24, 12);
    tag.add(tg);
    const star = this.add.star(-18, 0, 5, 4, 8, affordable ? COLORS.white : COLORS.stoneDeep);
    tag.add(star);
    tag.add(this.add.text(7, 0, `${item.cost}`,
      text(SIZE.body, affordable ? '#5A4E42' : '#8A7E70', 'bold')).setOrigin(0.5));
    c.add(tag);

    if (!affordable) c.setAlpha(0.72);
    this.dyn(c);

    tappable(this, c, w, h, () => {
      if (!gameState.buy(item.id, item.cost)) {
        const short = item.cost - gameState.stars;
        audio.denied();
        const message = `Du mangler ${short} ${short === 1 ? 'stjerne' : 'stjerner'}`;
        showToast(this, x, y - h / 2 - 8, message, '#B9584A');
        return;
      }
      audio.purchase();
      showSparkle(this, x, y, w, h);
      showToast(this, x, y - h / 2 - 8, `${item.name} er købt!`, '#4A7F33');
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
