import Phaser from 'phaser';
import { COLORS, INK, INK_SOFT, SIZE, text } from '../config';
import { gameState } from '../state/GameState';
import { showCheckmark, showHearts, showSparkle, showStarBurst, showToast } from '../objects/FeedbackEffects';
import { addBackButton, addSceneTitle, addStarCounter, award } from '../ui/Chrome';
import { rewardFor } from '../helpers/Reward';
import { placeDecorations } from './ShopScene';
import { caption, drawHead, shadow, tappable } from '../helpers/Draw';
import { audio } from '../helpers/Audio';
import { BaseScene } from './BaseScene';

interface Ingredient {
  name: string;
  color: number;
  shape: 'round' | 'long' | 'leaf' | 'drop';
}

interface Recipe {
  name: string;
  color: number;
  ingredients: Ingredient[];
}

const RECIPES: Recipe[] = [
  {
    name: 'Suppe',
    color: COLORS.orange,
    ingredients: [
      { name: 'Gulerod', color: 0xE8944F, shape: 'long' },
      { name: 'Kartoffel', color: 0xD8C08A, shape: 'round' },
      { name: 'Løg', color: 0xE8D9A8, shape: 'round' },
    ],
  },
  {
    name: 'Pandekager',
    color: COLORS.sun,
    ingredients: [
      { name: 'Mel', color: 0xF2EAD6, shape: 'round' },
      { name: 'Æg', color: 0xFBF3E4, shape: 'round' },
      { name: 'Mælk', color: 0xFFFFFF, shape: 'drop' },
    ],
  },
  {
    name: 'Salat',
    color: COLORS.green,
    ingredients: [
      { name: 'Salat', color: 0x8CC96E, shape: 'leaf' },
      { name: 'Tomat', color: 0xE07A63, shape: 'round' },
      { name: 'Agurk', color: 0x7CBE6A, shape: 'long' },
    ],
  },
  {
    name: 'Is',
    color: COLORS.pink,
    ingredients: [
      { name: 'Mælk', color: 0xFFFFFF, shape: 'drop' },
      { name: 'Sukker', color: 0xF6EEF4, shape: 'round' },
      { name: 'Jordbær', color: 0xE0687A, shape: 'round' },
    ],
  },
];

export class KitchenScene extends BaseScene {
  constructor() {
    super({ key: 'KitchenScene' });
  }

  private get recipe(): Recipe | null {
    return RECIPES.find(r => r.name === gameState.kitchen.recipe) ?? null;
  }

  protected buildBackground(): void {
    const { width, height } = this.scale;
    const g = this.add.graphics();

    g.fillStyle(COLORS.cream);
    g.fillRect(0, 0, width, height * 0.66);

    // Tiled splashback. The old loop indexed the checker test off pixel coordinates
    // starting at a fractional row (390 / 40 = 9.75), so `% 2 === 0` was never true and
    // no tile ever drew. Indexing off integer row/col and running the band down to the
    // floor line fixes both the missing tiles and the band floating in mid-wall.
    const floorY = Math.round(height * 0.66);
    const tile = 42;
    const rows = 5;
    const top = floorY - rows * tile;
    const cols = Math.ceil(width / tile);
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if ((row + col) % 2 !== 0) continue;
        g.fillStyle(COLORS.waterLight, 0.26);
        g.fillRect(col * tile, top + row * tile, tile, tile);
      }
    }
    g.lineStyle(1, COLORS.stone, 0.45);
    for (let row = 0; row <= rows; row++) g.lineBetween(0, top + row * tile, width, top + row * tile);
    for (let col = 0; col <= cols; col++) g.lineBetween(col * tile, top, col * tile, floorY);

    // floor
    g.fillStyle(COLORS.stone, 0.75);
    g.fillRect(0, floorY, width, height - floorY);
    const ftile = 48;
    for (let row = 0; row * ftile < height - floorY; row++) {
      for (let col = 0; col * ftile < width; col++) {
        if ((row + col) % 2 !== 0) continue;
        g.fillStyle(COLORS.white, 0.4);
        g.fillRect(col * ftile, floorY + row * ftile, ftile, ftile);
      }
    }
    g.fillStyle(COLORS.stoneDeep, 0.5);
    g.fillRect(0, floorY - 3, width, 4);

    this.background.add(g);
  }

  protected buildChrome(): void {
    addBackButton(this);
    addStarCounter(this);
  }

  protected buildDynamic(): void {
    const showingDining = gameState.kitchen.showingDining;
    addSceneTitle(this, showingDining ? 'Spisestuen' : 'Køkkenet');
    this.buildToggle();

    if (showingDining) {
      this.buildDiningRoom();
    } else {
      this.buildCookingArea();
    }
  }

  /** Moved to the left, next to the back button — it used to sit under the star counter. */
  private buildToggle(): void {
    const showingDining = gameState.kitchen.showingDining;
    const w = 118;
    const h = 34;
    const c = this.add.container(190, 38);

    const g = this.add.graphics();
    shadow(g, -w / 2, -h / 2, w, h, h / 2, 2, 0.14);
    g.fillStyle(showingDining ? COLORS.red : COLORS.green);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    g.fillStyle(COLORS.white, 0.22);
    g.fillRoundedRect(-w / 2 + 3, -h / 2 + 3, w - 6, h * 0.42, h / 2);

    c.add([g, this.add.text(0, 0, showingDining ? 'Til køkkenet' : 'Til spisestuen',
      text(SIZE.label, '#FFFFFF', 'bold')).setOrigin(0.5)]);
    this.dyn(c);

    tappable(this, c, w, h, () => {
      gameState.setShowingDining(!showingDining);
      this.refresh();
    });
  }

  private buildCookingArea(): void {
    const { width, height } = this.scale;
    const recipe = this.recipe;
    const added = gameState.kitchen.added;

    this.dyn(this.add.text(width / 2, 82, 'Vælg en opskrift', text(SIZE.body, INK_SOFT, 'semibold'))
      .setOrigin(0.5));

    RECIPES.forEach((r, i) => {
      const x = 168 + i * 208;
      this.buildRecipeCard(r, x, 132, r.name === recipe?.name);
    });

    placeDecorations(this, 'kitchen', this.dynamic);
    this.buildStove(width / 2, height * 0.56, recipe, added.length);

    if (!recipe) {
      this.dyn(caption(this, width / 2, height - 34,
        'Tryk på en ret, og læg så ingredienserne i gryden'));
      return;
    }

    // ingredient shelf
    recipe.ingredients.forEach((ing, i) => {
      const x = width / 2 - 208 + i * 208;
      this.buildIngredient(ing, x, height * 0.82, added.includes(ing.name));
    });

    const remaining = recipe.ingredients.length - added.length;
    this.buildProgressPips(width / 2, height * 0.755, added.length, recipe.ingredients.length);

    if (remaining === 0) {
      this.buildServeButton(width / 2, height - 34, recipe);
    }
  }

  private buildRecipeCard(recipe: Recipe, x: number, y: number, selected: boolean): void {
    const w = 176;
    const h = 52;
    const c = this.add.container(x, y);

    const g = this.add.graphics();
    shadow(g, -w / 2, -h / 2, w, h, 14, selected ? 4 : 2, selected ? 0.2 : 0.12);
    g.fillStyle(selected ? recipe.color : COLORS.white, selected ? 1 : 0.92);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 14);
    if (selected) {
      g.fillStyle(COLORS.white, 0.24);
      g.fillRoundedRect(-w / 2 + 3, -h / 2 + 3, w - 6, h * 0.4, 12);
    } else {
      g.lineStyle(1.5, COLORS.stoneDeep, 0.45);
      g.strokeRoundedRect(-w / 2, -h / 2, w, h, 14);
    }

    // On a selected card the swatch would be the same hue as the fill, so invert it.
    const swatch = this.add.circle(-w / 2 + 26, 0, 12, selected ? COLORS.white : recipe.color);
    swatch.setStrokeStyle(2, selected ? COLORS.white : COLORS.stoneDeep, selected ? 0.9 : 0.35);

    c.add([g, swatch, this.add.text(10, 0, recipe.name,
      text(SIZE.body, selected ? '#FFFFFF' : INK, 'bold')).setOrigin(0.5)]);
    this.dyn(c);

    if (selected) return;
    tappable(this, c, w, h, () => {
      gameState.selectRecipe(recipe.name);
      this.refresh();
    });
  }

  private buildIngredient(ing: Ingredient, x: number, y: number, isAdded: boolean): void {
    const c = this.add.container(x, y);
    const w = 150;
    const h = 46;

    const g = this.add.graphics();
    if (!isAdded) shadow(g, -w / 2, -h / 2, w, h, h / 2, 3, 0.14);
    g.fillStyle(COLORS.white, isAdded ? 0.5 : 0.96);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    g.lineStyle(1.5, isAdded ? COLORS.green : COLORS.stoneDeep, isAdded ? 0.8 : 0.4);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    c.add(g);

    c.add(this.drawIngredientIcon(-w / 2 + 26, 0, ing, isAdded));
    c.add(this.add.text(12, 0, ing.name,
      text(SIZE.label, isAdded ? INK_SOFT : INK, 'bold')).setOrigin(0.5));

    if (isAdded) {
      const tick = this.add.graphics();
      tick.lineStyle(2.5, COLORS.green);
      tick.beginPath();
      tick.moveTo(w / 2 - 26, 0);
      tick.lineTo(w / 2 - 21, 5);
      tick.lineTo(w / 2 - 12, -5);
      tick.strokePath();
      c.add(tick);
    }

    this.dyn(c);
    if (isAdded) return;

    tappable(this, c, w, h, () => {
      if (!gameState.addIngredient(ing.name)) return;

      const { width, height } = this.scale;
      const flying = this.drawIngredientIcon(0, 0, ing, false);
      const holder = this.add.container(x - w / 2 + 26, y, [flying]).setDepth(880);

      this.tweens.add({
        targets: holder,
        x: width / 2,
        y: height * 0.5,
        scale: 0.6,
        angle: 220,
        duration: 460,
        ease: 'Cubic.easeIn',
        onComplete: () => {
          holder.destroy();
          audio.sizzle();
          showCheckmark(this, width / 2, height * 0.47);
          showStarBurst(this, width / 2, height * 0.5, 4);

          const recipe = this.recipe;
          const dishDone = !!recipe && gameState.kitchen.added.length === recipe.ingredients.length;
          rewardFor(this, 'kitchen', {
            after: () => {
              if (dishDone && recipe) {
                showSparkle(this, width / 2, height * 0.5, 180, 120);
                showToast(this, width / 2, height * 0.36, `${recipe.name} er klar`, '#4A7F33');
                award(this, 2);
              }
              this.refresh();
            },
          });
        },
      });
    });
  }

  private drawIngredientIcon(x: number, y: number, ing: Ingredient, dim: boolean): Phaser.GameObjects.Graphics {
    const g = this.add.graphics().setPosition(x, y);
    const a = dim ? 0.45 : 1;

    switch (ing.shape) {
      case 'long':
        g.fillStyle(ing.color, a);
        g.fillEllipse(0, 2, 12, 26);
        g.fillStyle(COLORS.grassDeep, a);
        g.fillEllipse(0, -12, 12, 8);
        break;
      case 'leaf':
        g.fillStyle(ing.color, a);
        g.fillEllipse(-4, 0, 18, 22);
        g.fillEllipse(5, 2, 16, 20);
        break;
      case 'drop':
        g.fillStyle(ing.color, a);
        g.fillRoundedRect(-8, -11, 16, 23, 4);
        g.fillStyle(COLORS.waterLight, a * 0.7);
        g.fillRoundedRect(-8, -11, 16, 6, 3);
        break;
      default:
        g.fillStyle(ing.color, a);
        g.fillCircle(0, 0, 11);
        g.fillStyle(COLORS.white, a * 0.35);
        g.fillCircle(-3.5, -4, 4);
    }
    return g;
  }

  private buildProgressPips(x: number, y: number, done: number, total: number): void {
    const c = this.add.container(x, y);
    for (let i = 0; i < total; i++) {
      const dx = (i - (total - 1) / 2) * 26;
      const pip = this.add.circle(dx, 0, 8, i < done ? COLORS.green : COLORS.white);
      pip.setStrokeStyle(2, i < done ? COLORS.green : COLORS.stoneDeep);
      c.add(pip);
    }
    this.dyn(c);
  }

  private buildStove(cx: number, cy: number, recipe: Recipe | null, addedCount: number): void {
    const c = this.add.container(cx, cy);
    const g = this.add.graphics();

    // base cabinet. The previous version drew hob rings at y+30, which is the cabinet
    // front in this straight-on view — they read as two grey dots on the doors.
    shadow(g, -110, 6, 220, 96, 10, 4, 0.16);
    g.fillStyle(COLORS.stoneDeep);
    g.fillRoundedRect(-110, 6, 220, 96, 10);
    g.fillStyle(COLORS.stone);
    g.fillRoundedRect(-104, 14, 208, 82, 8);

    // two doors with handles
    g.fillStyle(COLORS.white, 0.4);
    g.fillRoundedRect(-98, 20, 92, 70, 6);
    g.fillRoundedRect(6, 20, 92, 70, 6);
    g.fillStyle(COLORS.stoneDeep, 0.8);
    g.fillRoundedRect(-20, 48, 10, 4, 2);
    g.fillRoundedRect(10, 48, 10, 4, 2);

    // worktop
    g.fillStyle(COLORS.white, 0.85);
    g.fillRoundedRect(-116, -4, 232, 16, 8);
    g.fillStyle(COLORS.stoneDeep, 0.35);
    g.fillRect(-116, 9, 232, 3);

    // pot
    g.fillStyle(0x6E6A66);
    g.fillRoundedRect(-46, -44, 92, 48, { tl: 5, tr: 5, bl: 14, br: 14 });
    g.fillStyle(0x827D78);
    g.fillRoundedRect(-46, -44, 30, 48, { tl: 5, tr: 0, bl: 14, br: 0 });
    g.fillStyle(0x5C5854);
    g.fillRoundedRect(-53, -50, 106, 10, 5);
    g.fillRoundedRect(-62, -44, 12, 7, 3);
    g.fillRoundedRect(50, -44, 12, 7, 3);

    // contents rise as ingredients go in
    if (recipe && addedCount > 0) {
      const fill = Phaser.Math.Clamp(addedCount / recipe.ingredients.length, 0, 1);
      const h = 30 * fill;
      g.fillStyle(recipe.color, 0.85);
      g.fillRoundedRect(-40, -6 - h, 80, h, 4);
      g.fillStyle(COLORS.white, 0.2);
      g.fillEllipse(0, -6 - h, 76, 7);
    }

    c.add(g);
    this.dyn(c);

    if (recipe && addedCount > 0) {
      for (let i = 0; i < 3; i++) {
        const puff = this.add.circle(cx - 16 + i * 16, cy - 56, 5, COLORS.white, 0.55).setDepth(6);
        this.tweens.add({
          targets: puff,
          y: cy - 100,
          scale: 2.1,
          alpha: 0,
          duration: 1900,
          delay: i * 480,
          repeat: -1,
          ease: 'Sine.easeOut',
        });
        this.dyn(puff);
      }
    }
  }

  private buildServeButton(x: number, y: number, recipe: Recipe): void {
    const w = 200;
    const h = 44;
    const c = this.add.container(x, y);

    const g = this.add.graphics();
    shadow(g, -w / 2, -h / 2, w, h, h / 2, 3, 0.2);
    g.fillStyle(COLORS.green);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    g.fillStyle(COLORS.white, 0.24);
    g.fillRoundedRect(-w / 2 + 3, -h / 2 + 3, w - 6, h * 0.42, h / 2);

    c.add([g, this.add.text(0, 0, 'Server maden', text(SIZE.body, '#FFFFFF', 'bold')).setOrigin(0.5)]);
    this.dyn(c);

    this.tweens.add({ targets: c, scale: 1.05, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    tappable(this, c, w, h, () => {
      gameState.serveDish();
      gameState.setShowingDining(true);
      audio.sparkle();
      award(this, 3);
      showToast(this, this.scale.width / 2, this.scale.height * 0.4, `${recipe.name} er serveret`, '#4A7F33');
      this.refresh();
    });
  }

  private buildDiningRoom(): void {
    const { width, height } = this.scale;
    const guests = gameState.getCheckedInGuests();

    const spots = [
      { x: width * 0.24, y: height * 0.42 },
      { x: width * 0.5, y: height * 0.4 },
      { x: width * 0.76, y: height * 0.42 },
      { x: width * 0.37, y: height * 0.68 },
      { x: width * 0.63, y: height * 0.68 },
    ];

    spots.forEach((spot, i) => {
      const c = this.add.container(spot.x, spot.y);
      const g = this.add.graphics();

      shadow(g, -42, 16, 84, 14, 7, 3, 0.14);
      g.fillStyle(COLORS.woodDeep);
      g.fillRoundedRect(-40, 0, 80, 30, 8);
      g.fillStyle(COLORS.woodLight);
      g.fillRoundedRect(-44, -6, 88, 12, 6);

      // cloth
      g.fillStyle(COLORS.white, 0.85);
      g.fillRoundedRect(-34, -4, 68, 10, 4);

      // plate
      g.fillStyle(COLORS.white);
      g.fillCircle(0, 6, 13);
      g.fillStyle(COLORS.stone, 0.5);
      g.fillCircle(0, 6, 8);

      c.add(g);

      if (i < guests.length) {
        c.add(drawHead(this, 0, -24, guests[i].color, 1));
      }

      this.dyn(c);
    });

    const served = gameState.kitchen.dishesServed;
    this.dyn(caption(this, width / 2, height - 32,
      served === 0 ? 'Ingen retter serveret endnu' : `${served} retter serveret`,
      served === 0 ? 'idle' : 'done'));

    if (guests.length === 0) {
      this.dyn(caption(this, width / 2, 84, 'Der er ingen gæster endnu — hent nogen i lobbyen'));
    } else if (served > 0) {
      showHearts(this, width / 2, height * 0.3);
    }
  }
}
