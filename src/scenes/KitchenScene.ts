import Phaser from 'phaser';
import { COLORS, INK, INK_SOFT, LINE, SIZE, text } from '../config';
import { gameState } from '../state/GameState';
import {
  showCheckmark, showConfetti, showHearts, showPraise, showSparkle, showStarBurst, showToast,
} from '../objects/FeedbackEffects';
import { addBackButton, addSceneTitle, addSoundToggle, addStarCounter, award } from '../ui/Chrome';
import {
  bunting, caption, drawHead, drawPalm, plate, progressBar, shade, shadow, sheen, tappable,
} from '../helpers/Draw';
import { pulse, reduceMotion } from '../helpers/Motion';
import { sfx } from '../helpers/AudioManager';
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
      { name: 'Sukker', color: 0xF2EAD6, shape: 'round' },
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
    // Three rows, not five. Running the tiles all the way up turned the whole wall into
    // a chessboard and left the recipe cards sitting on top of a busy pattern.
    const rows = 3;
    const top = floorY - rows * tile;
    const cols = Math.ceil(width / tile);
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if ((row + col) % 2 !== 0) continue;
        g.fillStyle(COLORS.waterLight, 0.22);
        g.fillRect(col * tile, top + row * tile, tile, tile);
      }
    }
    g.lineStyle(1, COLORS.stone, 0.4);
    for (let row = 0; row <= rows; row++) g.lineBetween(0, top + row * tile, width, top + row * tile);
    for (let col = 0; col <= cols; col++) g.lineBetween(col * tile, top, col * tile, floorY);

    // floor
    g.fillStyle(COLORS.stone, 0.8);
    g.fillRect(0, floorY, width, height - floorY);
    const ftile = 48;
    for (let row = 0; row * ftile < height - floorY; row++) {
      for (let col = 0; col * ftile < width; col++) {
        if ((row + col) % 2 !== 0) continue;
        g.fillStyle(COLORS.white, 0.32);
        g.fillRect(col * ftile, floorY + row * ftile, ftile, ftile);
      }
    }
    g.fillStyle(COLORS.stoneDeep, 0.55);
    g.fillRect(0, floorY - 4, width, 5);
    g.lineStyle(LINE.thin, COLORS.outline, 0.4);
    g.lineBetween(0, floorY - 4, width, floorY - 4);

    this.bg(g);

    // The upper wall was blank in the old build. A kitchen has things hanging on it.
    // Kept clear of the recipe cards, which occupy nearly the full width at y≈132.
    this.bg(this.drawShelf(158, 268));
    this.bg(this.drawHangingPots(width - 196, 232));
    this.bg(drawPalm(this, width - 52, height * 0.74, 0.95));
  }

  protected buildChrome(): void {
    addBackButton(this);
    addStarCounter(this);
    addSoundToggle(this);
  }

  protected buildDynamic(): void {
    const showingDining = gameState.kitchen.showingDining;
    addSceneTitle(this, showingDining ? 'Spisestuen' : 'Køkkenet',
      showingDining ? COLORS.purple : COLORS.red);
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
    const w = 128;
    const h = 36;
    const lip = 4;
    const c = this.add.container(222, 38);
    const color = showingDining ? COLORS.red : COLORS.green;

    const g = this.add.graphics();
    shadow(g, -w / 2, -h / 2, w, h + lip, h / 2, 2, 0.2);
    plate(g, -w / 2, -h / 2 + lip, w, h, h / 2, shade(color, -0.28), 1, LINE.thin);
    plate(g, -w / 2, -h / 2, w, h, h / 2, color, 1, LINE.base);
    sheen(g, -w / 2, -h / 2, w, h, h / 2, 0.26);

    const t = this.add.text(0, 0, showingDining ? 'Til køkkenet' : 'Til spisestuen',
      text(SIZE.label, '#FFFFFF', 'bold')).setOrigin(0.5);
    t.setShadow(0, 1.5, 'rgba(74,58,44,0.5)', 0, false, true);
    c.add([g, t]);
    this.dyn(c);

    tappable(this, c, w, h + lip, () => {
      gameState.setShowingDining(!showingDining);
      this.refresh();
    });
  }

  private buildCookingArea(): void {
    const { width, height } = this.scale;
    const recipe = this.recipe;
    const added = gameState.kitchen.added;

    this.dyn(this.add.text(width / 2, 84, 'Vælg en opskrift', text(SIZE.body, INK_SOFT, 'bold'))
      .setOrigin(0.5));

    RECIPES.forEach((r, i) => {
      const x = 168 + i * 208;
      this.buildRecipeCard(r, x, 132, r.name === recipe?.name);
    });

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
    const bar = this.add.container(width / 2, height * 0.755);
    bar.add(progressBar(this, 0, 0, 200, 15, added.length / recipe.ingredients.length,
      remaining === 0 ? COLORS.green : recipe.color));
    bar.add(this.add.text(0, 0, `${added.length} / ${recipe.ingredients.length}`,
      text(SIZE.tiny, INK, 'bold')).setOrigin(0.5));
    this.dyn(bar);

    if (remaining === 0) {
      this.buildServeButton(width / 2, height - 34, recipe);
    }
  }

  private buildRecipeCard(recipe: Recipe, x: number, y: number, selected: boolean): void {
    const w = 180;
    const h = 56;
    const lip = selected ? 5 : 3;
    const c = this.add.container(x, y);

    const g = this.add.graphics();
    shadow(g, -w / 2, -h / 2, w, h + lip, 15, selected ? 4 : 2, selected ? 0.22 : 0.14);
    plate(g, -w / 2, -h / 2 + lip, w, h, 15,
      selected ? shade(recipe.color, -0.28) : COLORS.stone, 1, LINE.thin);
    plate(g, -w / 2, -h / 2, w, h, 15, selected ? recipe.color : COLORS.white, 1, LINE.base);
    if (selected) sheen(g, -w / 2, -h / 2, w, h, 13, 0.26);

    // A drawn portion of the dish rather than a colour swatch — a four-year-old cannot
    // read "Pandekager", but they can recognise a stack of pancakes.
    const icon = this.add.graphics().setPosition(-w / 2 + 28, 0);
    this.drawDishIcon(icon, recipe, selected);

    const t = this.add.text(14, 0, recipe.name,
      text(SIZE.body, selected ? '#FFFFFF' : INK, 'bold')).setOrigin(0.5);
    if (selected) t.setShadow(0, 1.5, 'rgba(74,58,44,0.5)', 0, false, true);

    c.add([g, icon, t]);
    this.dyn(c);

    if (selected) return;
    tappable(this, c, w, h + lip, () => {
      gameState.selectRecipe(recipe.name);
      this.refresh();
    });
  }

  /** A little picture of each finished dish, for the recipe cards. */
  private drawDishIcon(g: Phaser.GameObjects.Graphics, recipe: Recipe, onColor: boolean): void {
    const rim = onColor ? COLORS.white : COLORS.outline;

    switch (recipe.name) {
      case 'Suppe':
        g.fillStyle(COLORS.white);
        g.fillEllipse(0, 2, 36, 22);
        g.fillStyle(COLORS.orange);
        g.fillEllipse(0, 0, 28, 15);
        g.lineStyle(LINE.thin, rim, 0.9);
        g.strokeEllipse(0, 2, 36, 22);
        g.fillStyle(COLORS.sun, 0.9);
        g.fillCircle(-5, -1, 3);
        g.fillCircle(5, 2, 2.4);
        break;

      case 'Pandekager':
        [6, 1, -4].forEach((dy, i) => {
          g.fillStyle(i === 2 ? COLORS.sun : shade(COLORS.sun, -0.12));
          g.fillEllipse(0, dy, 34 - i * 2, 12);
          g.lineStyle(LINE.hair, rim, 0.85);
          g.strokeEllipse(0, dy, 34 - i * 2, 12);
        });
        g.fillStyle(COLORS.red);
        g.fillCircle(4, -9, 4);
        break;

      case 'Salat':
        g.fillStyle(COLORS.white);
        g.fillEllipse(0, 4, 38, 20);
        g.lineStyle(LINE.thin, rim, 0.9);
        g.strokeEllipse(0, 4, 38, 20);
        g.fillStyle(COLORS.green);
        g.fillEllipse(-7, -1, 18, 14);
        g.fillEllipse(6, 1, 16, 13);
        g.fillStyle(COLORS.red);
        g.fillCircle(9, -4, 4.5);
        g.fillCircle(-9, -5, 3.5);
        break;

      default: // Is
        g.fillStyle(COLORS.wood);
        g.fillTriangle(-9, 2, 9, 2, 0, 20);
        g.lineStyle(LINE.hair, rim, 0.85);
        g.strokeTriangle(-9, 2, 9, 2, 0, 20);
        g.fillStyle(COLORS.pink);
        g.fillCircle(-4, -3, 8);
        g.fillCircle(5, -2, 7);
        g.fillStyle(COLORS.cream);
        g.fillCircle(1, -11, 7);
        g.lineStyle(LINE.hair, rim, 0.85);
        g.strokeCircle(-4, -3, 8);
        g.strokeCircle(5, -2, 7);
        g.strokeCircle(1, -11, 7);
    }
  }

  private buildIngredient(ing: Ingredient, x: number, y: number, isAdded: boolean): void {
    const c = this.add.container(x, y);
    const w = 158;
    const h = 50;
    const lip = isAdded ? 0 : 4;

    const g = this.add.graphics();
    if (!isAdded) {
      shadow(g, -w / 2, -h / 2, w, h + lip, h / 2, 3, 0.16);
      plate(g, -w / 2, -h / 2 + lip, w, h, h / 2, COLORS.stone, 1, LINE.thin);
    }
    plate(g, -w / 2, -h / 2, w, h, h / 2,
      isAdded ? COLORS.cream : COLORS.white, isAdded ? 0.9 : 1, LINE.base, isAdded ? 0.45 : 1);
    c.add(g);

    c.add(this.drawIngredientIcon(-w / 2 + 28, 0, ing, isAdded));
    c.add(this.add.text(14, 0, ing.name,
      text(SIZE.label, isAdded ? INK_SOFT : INK, 'bold')).setOrigin(0.5));

    if (isAdded) {
      const tick = this.add.graphics().setPosition(w / 2 - 22, 0);
      tick.fillStyle(COLORS.green);
      tick.fillCircle(0, 0, 10);
      tick.lineStyle(LINE.hair, COLORS.outline, 0.85);
      tick.strokeCircle(0, 0, 10);
      tick.lineStyle(2.6, COLORS.white, 1);
      tick.beginPath();
      tick.moveTo(-4.2, 0);
      tick.lineTo(-1.2, 3.4);
      tick.lineTo(4.4, -3.6);
      tick.strokePath();
      c.add(tick);
    }

    this.dyn(c);
    if (isAdded) return;

    tappable(this, c, w, h + lip, () => {
      if (!gameState.addIngredient(ing.name)) return;

      const { width, height } = this.scale;
      const flying = this.drawIngredientIcon(0, 0, ing, false);
      const holder = this.add.container(x - w / 2 + 28, y, [flying]).setDepth(880);

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
          sfx('sizzle');
          showCheckmark(this, width / 2, height * 0.47);
          award(this, 1, width / 2, height * 0.5);
          showStarBurst(this, width / 2, height * 0.5, 4);

          const recipe = this.recipe;
          if (recipe && gameState.kitchen.added.length === recipe.ingredients.length) {
            sfx('success');
            showSparkle(this, width / 2, height * 0.5, 180, 120);
            showPraise(this, width / 2, height * 0.3, `${recipe.name} er klar!`);
            award(this, 2, width / 2, height * 0.5);
          }
          this.refresh();
        },
      });
    });
  }

  private drawIngredientIcon(x: number, y: number, ing: Ingredient, dim: boolean): Phaser.GameObjects.Graphics {
    const g = this.add.graphics().setPosition(x, y);
    const a = dim ? 0.45 : 1;
    const line = dim ? 0.3 : 0.85;

    switch (ing.shape) {
      case 'long':
        g.fillStyle(ing.color, a);
        g.fillEllipse(0, 2, 13, 27);
        g.lineStyle(LINE.hair, COLORS.outline, line);
        g.strokeEllipse(0, 2, 13, 27);
        g.fillStyle(COLORS.grassDeep, a);
        g.fillEllipse(0, -12, 13, 9);
        break;
      case 'leaf':
        g.fillStyle(ing.color, a);
        g.fillEllipse(-4, 0, 19, 23);
        g.fillEllipse(5, 2, 17, 21);
        g.lineStyle(LINE.hair, COLORS.outline, line);
        g.strokeEllipse(-4, 0, 19, 23);
        g.strokeEllipse(5, 2, 17, 21);
        break;
      case 'drop':
        g.fillStyle(ing.color, a);
        g.fillRoundedRect(-8, -11, 17, 24, 4);
        g.fillStyle(COLORS.waterLight, a * 0.75);
        g.fillRoundedRect(-8, -11, 17, 7, 3);
        g.lineStyle(LINE.hair, COLORS.outline, line);
        g.strokeRoundedRect(-8, -11, 17, 24, 4);
        break;
      default:
        g.fillStyle(ing.color, a);
        g.fillCircle(0, 0, 12);
        g.fillStyle(COLORS.white, a * 0.4);
        g.fillCircle(-3.5, -4, 4);
        g.lineStyle(LINE.hair, COLORS.outline, line);
        g.strokeCircle(0, 0, 12);
    }
    return g;
  }

  private buildStove(cx: number, cy: number, recipe: Recipe | null, addedCount: number): void {
    const c = this.add.container(cx, cy);
    const g = this.add.graphics();

    // base cabinet. The previous version drew hob rings at y+30, which is the cabinet
    // front in this straight-on view — they read as two grey dots on the doors.
    shadow(g, -110, 6, 220, 96, 10, 5, 0.2);
    g.fillStyle(COLORS.stoneDeep);
    g.fillRoundedRect(-110, 6, 220, 96, 10);
    g.fillStyle(COLORS.stone);
    g.fillRoundedRect(-104, 14, 208, 82, 8);
    g.lineStyle(LINE.base, COLORS.outline, 0.85);
    g.strokeRoundedRect(-110, 6, 220, 96, 10);

    // two doors with handles
    g.fillStyle(COLORS.white, 0.5);
    g.fillRoundedRect(-98, 20, 92, 70, 6);
    g.fillRoundedRect(6, 20, 92, 70, 6);
    g.lineStyle(LINE.hair, COLORS.outline, 0.5);
    g.strokeRoundedRect(-98, 20, 92, 70, 6);
    g.strokeRoundedRect(6, 20, 92, 70, 6);
    g.fillStyle(COLORS.stoneDeep);
    g.fillRoundedRect(-22, 48, 12, 5, 2.5);
    g.fillRoundedRect(10, 48, 12, 5, 2.5);

    // worktop
    g.fillStyle(COLORS.white);
    g.fillRoundedRect(-116, -4, 232, 17, 8);
    g.fillStyle(COLORS.stoneDeep, 0.4);
    g.fillRect(-116, 9, 232, 4);
    g.lineStyle(LINE.base, COLORS.outline, 0.85);
    g.strokeRoundedRect(-116, -4, 232, 17, 8);

    // pot
    g.fillStyle(0x6E6A66);
    g.fillRoundedRect(-46, -44, 92, 48, { tl: 5, tr: 5, bl: 14, br: 14 });
    g.fillStyle(0x827D78);
    g.fillRoundedRect(-46, -44, 30, 48, { tl: 5, tr: 0, bl: 14, br: 0 });
    g.lineStyle(LINE.base, COLORS.outline, 0.85);
    g.strokeRoundedRect(-46, -44, 92, 48, { tl: 5, tr: 5, bl: 14, br: 14 });
    g.fillStyle(0x5C5854);
    g.fillRoundedRect(-53, -51, 106, 11, 5);
    g.fillRoundedRect(-63, -44, 13, 8, 3.5);
    g.fillRoundedRect(50, -44, 13, 8, 3.5);
    g.lineStyle(LINE.thin, COLORS.outline, 0.85);
    g.strokeRoundedRect(-53, -51, 106, 11, 5);

    // contents rise as ingredients go in
    if (recipe && addedCount > 0) {
      const fill = Phaser.Math.Clamp(addedCount / recipe.ingredients.length, 0, 1);
      const h = 30 * fill;
      g.fillStyle(recipe.color);
      g.fillRoundedRect(-40, -6 - h, 80, h, 4);
      g.fillStyle(COLORS.white, 0.25);
      g.fillEllipse(0, -6 - h, 76, 8);
    }

    c.add(g);
    this.dyn(c);

    if (recipe && addedCount > 0 && !reduceMotion()) {
      for (let i = 0; i < 3; i++) {
        const puff = this.add.circle(cx - 16 + i * 16, cy - 58, 5, COLORS.white, 0.6).setDepth(6);
        this.tweens.add({
          targets: puff,
          y: cy - 104,
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
    const w = 210;
    const h = 48;
    const lip = 6;
    const c = this.add.container(x, y);

    const g = this.add.graphics();
    shadow(g, -w / 2, -h / 2, w, h + lip, h / 2, 4, 0.22);
    plate(g, -w / 2, -h / 2 + lip, w, h, h / 2, shade(COLORS.green, -0.28), 1, LINE.base);
    plate(g, -w / 2, -h / 2, w, h, h / 2, COLORS.green, 1, LINE.thick);
    sheen(g, -w / 2, -h / 2, w, h, h / 2, 0.28);

    const t = this.add.text(0, 0, 'Server maden', text(SIZE.body, '#FFFFFF', 'bold')).setOrigin(0.5);
    t.setShadow(0, 2, 'rgba(74,58,44,0.5)', 0, false, true);
    c.add([g, t]);
    this.dyn(c);

    pulse(this, c, 1.05);

    tappable(this, c, w, h + lip, () => {
      gameState.serveDish();
      gameState.setShowingDining(true);
      award(this, 3, x, y);
      sfx('success');
      showConfetti(this, this.scale.width / 2, this.scale.height * 0.34, 34);
      showToast(this, this.scale.width / 2, this.scale.height * 0.4, `${recipe.name} er serveret`, '#4A7F33');
      this.refresh();
    });
  }

  private buildDiningRoom(): void {
    const { width, height } = this.scale;
    const guests = gameState.getCheckedInGuests();

    // The dining room is a party room; it gets its own bunting.
    this.dyn(bunting(this, 40, 96, width - 40, 104, 11, 12));

    const spots = [
      { x: width * 0.24, y: height * 0.44 },
      { x: width * 0.5, y: height * 0.42 },
      { x: width * 0.76, y: height * 0.44 },
      { x: width * 0.37, y: height * 0.7 },
      { x: width * 0.63, y: height * 0.7 },
    ];

    spots.forEach((spot, i) => {
      const c = this.add.container(spot.x, spot.y);
      const g = this.add.graphics();

      shadow(g, -42, 16, 84, 14, 7, 3, 0.16);
      g.fillStyle(COLORS.woodDeep);
      g.fillRoundedRect(-40, 0, 80, 32, 8);
      g.lineStyle(LINE.thin, COLORS.outline, 0.85);
      g.strokeRoundedRect(-40, 0, 80, 32, 8);
      g.fillStyle(COLORS.woodLight);
      g.fillRoundedRect(-45, -7, 90, 13, 6);
      g.lineStyle(LINE.thin, COLORS.outline, 0.85);
      g.strokeRoundedRect(-45, -7, 90, 13, 6);

      // cloth
      g.fillStyle(COLORS.white, 0.92);
      g.fillRoundedRect(-34, -5, 68, 11, 4);
      g.fillStyle(COLORS.red, 0.35);
      g.fillRect(-34, -1, 68, 2.5);

      // plate and cutlery
      g.fillStyle(COLORS.white);
      g.fillCircle(0, 7, 13);
      g.fillStyle(COLORS.stone, 0.55);
      g.fillCircle(0, 7, 8);
      g.lineStyle(LINE.hair, COLORS.outline, 0.85);
      g.strokeCircle(0, 7, 13);
      g.lineStyle(2, COLORS.stoneDeep, 0.9);
      g.lineBetween(-20, 2, -20, 12);
      g.lineBetween(20, 2, 20, 12);

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
      this.dyn(caption(this, width / 2, 132, 'Der er ingen gæster endnu — hent nogen i lobbyen'));
    } else if (served > 0) {
      showHearts(this, width / 2, height * 0.3);
    }
  }

  // ---------- wall furniture ----------

  /** Open shelf with jars on it. */
  private drawShelf(x: number, y: number): Phaser.GameObjects.Container {
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    const w = 172;

    // jars, drawn before the shelf so they sit on it
    const jars = [
      { dx: -58, h: 34, color: COLORS.orange },
      { dx: -20, h: 44, color: COLORS.green },
      { dx: 18, h: 30, color: COLORS.red },
      { dx: 56, h: 40, color: COLORS.purple },
    ];
    jars.forEach(j => {
      g.fillStyle(COLORS.white, 0.85);
      g.fillRoundedRect(j.dx - 13, -j.h, 26, j.h, 4);
      g.fillStyle(j.color, 0.85);
      g.fillRoundedRect(j.dx - 13, -j.h * 0.6, 26, j.h * 0.6, { tl: 0, tr: 0, bl: 4, br: 4 });
      g.lineStyle(LINE.thin, COLORS.outline, 0.85);
      g.strokeRoundedRect(j.dx - 13, -j.h, 26, j.h, 4);
      g.fillStyle(COLORS.woodDeep);
      g.fillRoundedRect(j.dx - 15, -j.h - 7, 30, 8, 3);
      g.lineStyle(LINE.hair, COLORS.outline, 0.85);
      g.strokeRoundedRect(j.dx - 15, -j.h - 7, 30, 8, 3);
    });

    g.fillStyle(COLORS.wood);
    g.fillRoundedRect(-w / 2, 0, w, 12, 4);
    g.fillStyle(COLORS.woodDeep, 0.5);
    g.fillRect(-w / 2, 8, w, 4);
    g.lineStyle(LINE.base, COLORS.outline, 0.85);
    g.strokeRoundedRect(-w / 2, 0, w, 12, 4);
    // brackets
    [-w / 2 + 20, w / 2 - 20].forEach(bx => {
      g.fillStyle(COLORS.woodDeep);
      g.fillTriangle(bx - 8, 12, bx + 8, 12, bx, 30);
    });

    c.add(g);
    return c;
  }

  /** A rail of hanging pans — the sound of a kitchen, drawn. */
  private drawHangingPots(x: number, y: number): Phaser.GameObjects.Container {
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    const w = 168;

    g.lineStyle(5, COLORS.stoneDeep);
    g.lineBetween(-w / 2, 0, w / 2, 0);
    g.lineStyle(LINE.hair, COLORS.outline, 0.7);
    g.lineBetween(-w / 2, 0, w / 2, 0);
    [-w / 2, w / 2].forEach(ex => {
      g.fillStyle(COLORS.stoneDeep);
      g.fillCircle(ex, 0, 6);
      g.lineStyle(LINE.hair, COLORS.outline, 0.8);
      g.strokeCircle(ex, 0, 6);
    });

    const pans = [
      { dx: -52, r: 21, color: 0x6E6A66 },
      { dx: -4, r: 26, color: 0x827D78 },
      { dx: 50, r: 18, color: COLORS.red },
    ];
    pans.forEach(p => {
      g.lineStyle(2.5, COLORS.stoneDeep);
      g.lineBetween(p.dx, 0, p.dx, 14);
      g.fillStyle(p.color);
      g.fillRoundedRect(p.dx - p.r, 14, p.r * 2, p.r * 1.5, { tl: 3, tr: 3, bl: p.r * 0.6, br: p.r * 0.6 });
      g.lineStyle(LINE.thin, COLORS.outline, 0.85);
      g.strokeRoundedRect(p.dx - p.r, 14, p.r * 2, p.r * 1.5, { tl: 3, tr: 3, bl: p.r * 0.6, br: p.r * 0.6 });
      g.fillStyle(COLORS.white, 0.25);
      g.fillRoundedRect(p.dx - p.r + 4, 18, p.r * 0.6, p.r, 3);
    });

    c.add(g);
    return c;
  }
}
