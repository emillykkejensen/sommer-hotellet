import Phaser from 'phaser';
import { COLORS, INK, INK_SOFT, SIZE, text } from '../config';
import {
  Destination, GuestData, MAX_READY_DISHES, TABLE_COUNT, gameState,
} from '../state/GameState';
import { Ingredient, RECIPES, Recipe, recipeNamed } from '../state/Menu';
import { showCheckmark, showSparkle, showToast } from '../objects/FeedbackEffects';
import { CardAction, drawDish, drawOrderPips, listDishes } from '../objects/Guests';
import { addBackButton, addSceneTitle, addStarCounter } from '../ui/Chrome';
import { placeDecorations } from './ShopScene';
import { caption, drawHead, shadow, tappable } from '../helpers/Draw';
import { audio } from '../helpers/Audio';
import { dur } from '../helpers/Motion';
import { BaseScene } from './BaseScene';

export class KitchenScene extends BaseScene {
  constructor() {
    super({ key: 'KitchenScene' });
  }

  private get recipe(): Recipe | null {
    return recipeNamed(gameState.kitchen.recipe ?? '');
  }

  protected buildBackground(): void {
    const { width, height } = this.scale;
    const g = this.add.graphics();

    g.fillStyle(COLORS.cream);
    g.fillRect(0, 0, width, height * 0.66);

    // Tiled splashback, indexed off integer rows and columns and run down to the floor
    // line — the original loop tested pixel coordinates starting at a fractional row, so
    // no tile ever drew and the wall rendered flat white.
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

  /** Guests are led here to eat. Bringing one in opens the restaurant, so they can sit. */
  protected serves(): Destination {
    return 'restaurant';
  }

  protected onArrivals(_arrived: GuestData[]): void {
    gameState.setShowingDining(true);
  }

  protected buildDynamic(): void {
    const showingDining = gameState.kitchen.showingDining;
    // In the dynamic layer, not straight on the scene: the title changes with the toggle,
    // and adding it outside the layer stacked a new one on top on every refresh.
    this.dyn(addSceneTitle(this, showingDining ? 'Restauranten' : 'Køkkenet'));
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
    const w = 148;
    const h = 38;
    const c = this.add.container(200, 34);

    const g = this.add.graphics();
    shadow(g, -w / 2, -h / 2, w, h, h / 2, 2, 0.14);
    g.fillStyle(showingDining ? COLORS.red : COLORS.green);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    g.fillStyle(COLORS.white, 0.22);
    g.fillRoundedRect(-w / 2 + 3, -h / 2 + 3, w - 6, h * 0.42, h / 2);

    c.add([g, this.add.text(0, 0, showingDining ? 'Til køkkenet' : 'Til restauranten',
      text(SIZE.label, '#FFFFFF', 'bold')).setOrigin(0.5)]);

    // A guest is sitting there waiting for food and the player is in the kitchen: say so
    // on the door rather than making them go and look.
    const hungry = gameState.guestsAt('restaurant').filter(g2 => gameState.needsPlayer(g2)).length;
    if (!showingDining && hungry > 0) {
      const dot = this.add.circle(w / 2 - 10, -h / 2 + 8, 9, COLORS.red).setStrokeStyle(2, COLORS.white);
      c.add([dot, this.add.text(w / 2 - 10, -h / 2 + 8, `${hungry}`,
        text(SIZE.tiny, '#FFFFFF', 'bold')).setOrigin(0.5)]);
      this.tweens.add({ targets: dot, scale: 1.22, duration: 700, yoyo: true, repeat: -1 });
    }

    this.dyn(c);

    tappable(this, c, w, h, () => {
      gameState.setShowingDining(!showingDining);
      this.refresh();
    });
  }

  /* ------------------------------------------------------------------ cooking --- */

  private buildCookingArea(): void {
    const { width, height } = this.scale;
    const recipe = this.recipe;
    const added = gameState.kitchen.added;

    this.dyn(this.add.text(width / 2, 76, 'Vælg en ret og lav den',
      text(SIZE.body, INK_SOFT, 'semibold')).setOrigin(0.5));

    // a row lower than the title, so a guest following you in has room under the back button
    RECIPES.forEach((r, i) =>
      this.buildRecipeCard(r, width / 2 + (i - (RECIPES.length - 1) / 2) * 205, 146, r.name === recipe?.name));

    placeDecorations(this, 'kitchen', this.dynamic);
    this.buildOrderBoard(104, height * 0.5);
    this.buildStove(width / 2, height * 0.54, recipe, added.length);
    this.buildPass(width - 96, height * 0.48);

    if (!recipe) {
      this.dyn(caption(this, width / 2, height - 26,
        'Tryk på en ret, læg ingredienserne i gryden, og kog maden'));
      return;
    }

    // ingredient shelf
    recipe.ingredients.forEach((ing, i) => {
      const x = width / 2 - 200 + i * 200;
      this.buildIngredient(ing, x, height * 0.8, added.includes(ing.name));
    });

    this.buildProgressPips(width / 2, height * 0.71, added.length, recipe.ingredients.length);

    const missing = recipe.ingredients.length - added.length;
    if (missing > 0) {
      this.dyn(caption(this, width / 2, height - 26,
        missing === 1 ? 'Én ingrediens mangler' : `${missing} ingredienser mangler`));
    } else {
      this.buildCookButton(width / 2, height - 32, recipe);
    }
  }

  private buildRecipeCard(recipe: Recipe, x: number, y: number, selected: boolean): void {
    const w = 164;
    const h = 56;
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
    const swatch = this.add.circle(-w / 2 + 24, 0, 12, selected ? COLORS.white : recipe.color);
    swatch.setStrokeStyle(2, selected ? COLORS.white : COLORS.stoneDeep, selected ? 0.9 : 0.35);

    const label = this.add.text(11, 0, recipe.name,
      text(SIZE.body, selected ? '#FFFFFF' : INK, 'bold')).setOrigin(0.5);
    if (label.width > w - 52) label.setFontSize(SIZE.label);

    c.add([g, swatch, label]);

    // how many seated guests are waiting for this dish right now
    const wanted = gameState.openOrders().filter(d => d === recipe.name).length;
    if (wanted > 0) {
      const badge = this.add.circle(w / 2 - 14, -h / 2 + 12, 11, COLORS.red)
        .setStrokeStyle(2, COLORS.white);
      c.add([badge, this.add.text(w / 2 - 14, -h / 2 + 12, `${wanted}`,
        text(SIZE.tiny, '#FFFFFF', 'bold')).setOrigin(0.5)]);
    }

    this.dyn(c);

    if (selected) return;
    tappable(this, c, w, h, () => {
      gameState.selectRecipe(recipe.name);
      this.refresh();
    });
  }

  /** What the restaurant is waiting for, so the kitchen is not cooking blind. */
  private buildOrderBoard(cx: number, cy: number): void {
    const seated = gameState.guestsAt('restaurant');
    const w = 150;
    const rows = Math.max(1, seated.length);
    const h = 44 + rows * 30;

    const c = this.add.container(cx, cy);
    const g = this.add.graphics();
    shadow(g, -w / 2, -h / 2, w, h, 12, 3, 0.14);
    g.fillStyle(COLORS.white, 0.94);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 12);
    g.lineStyle(2, COLORS.stoneDeep, 0.3);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, 12);
    // a clipboard bar across the top
    g.fillStyle(COLORS.roof, 0.85);
    g.fillRoundedRect(-w / 2, -h / 2, w, 26, { tl: 12, tr: 12, bl: 0, br: 0 });
    c.add(g);

    c.add(this.add.text(0, -h / 2 + 13, 'Ordrer', text(SIZE.label, '#FFFFFF', 'bold')).setOrigin(0.5));

    if (seated.length === 0) {
      c.add(this.add.text(0, 6, 'Ingen gæster\nved bordene', {
        ...text(SIZE.tiny, INK_SOFT, 'semibold'), align: 'center',
      }).setOrigin(0.5));
    } else {
      seated.forEach((guest, i) => {
        const y = -h / 2 + 44 + i * 30;
        const left = gameState.outstandingOrder(guest);
        const dot = this.add.circle(-w / 2 + 18, y, 7, guest.color).setStrokeStyle(1.5, COLORS.white);
        c.add(dot);
        if (left.length === 0) {
          c.add(this.add.text(-w / 2 + 34, y, 'spiser', text(SIZE.tiny, INK_SOFT, 'semibold'))
            .setOrigin(0, 0.5));
        } else {
          const pips = drawOrderPips(this, left, 19);
          pips.setPosition(-w / 2 + 40 + (left.length - 1) * 9.5, y);
          c.add(pips);
        }
      });
    }

    this.dyn(c);
  }

  /** The pass: dishes cooked and waiting to be carried out. */
  private buildPass(cx: number, cy: number): void {
    const ready = gameState.kitchen.ready;
    const w = 132;
    const h = 168;

    const c = this.add.container(cx, cy);
    const g = this.add.graphics();
    shadow(g, -w / 2, -h / 2, w, h, 10, 3, 0.14);
    g.fillStyle(COLORS.woodDeep);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 10);
    g.fillStyle(COLORS.wood);
    g.fillRoundedRect(-w / 2 + 5, -h / 2 + 5, w - 10, h - 10, 8);
    // two shelves
    g.fillStyle(COLORS.woodDeep, 0.5);
    for (const y of [-h / 2 + 62, -h / 2 + 118]) g.fillRect(-w / 2 + 5, y, w - 10, 4);
    c.add(g);

    c.add(this.add.text(0, -h / 2 + 18, 'Klar til bordene',
      text(SIZE.tiny, '#FDF7EA', 'bold')).setOrigin(0.5));

    /*
     * Tapping a plate scrapes it.
     *
     * Without this the pass is a dead end: six dishes nobody ordered fills it, the stove
     * refuses to cook, and a child who cooked six bowls of soup has to wait for a guest who
     * happens to want soup. Throwing food away pays nothing, which is the right price.
     */
    ready.slice(0, MAX_READY_DISHES).forEach((dish, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const plate = drawDish(this, dish, 0.9);
      plate.setPosition(-28 + col * 56, -h / 2 + 48 + row * 56);
      c.add(plate);

      const slot = this.add.container(cx - 28 + col * 56, cy - h / 2 + 48 + row * 56);
      this.dyn(slot);
      tappable(this, slot, 52, 48, () => {
        if (!gameState.scrapeDish(dish)) return;
        audio.pop();
        showToast(this, cx, cy - h / 2 - 16, `${dish} smidt ud`, '#B9584A');
        this.refresh();
      });
    });

    if (ready.length === 0) {
      c.add(this.add.text(0, 12, 'tom', text(SIZE.tiny, '#FDF7EA', 'semibold'))
        .setOrigin(0.5).setAlpha(0.7));
    }

    this.dyn(c);
  }

  private buildIngredient(ing: Ingredient, x: number, y: number, isAdded: boolean): void {
    const c = this.add.container(x, y);
    const w = 168;
    const h = 50;

    const g = this.add.graphics();
    if (!isAdded) shadow(g, -w / 2, -h / 2, w, h, h / 2, 3, 0.14);
    g.fillStyle(COLORS.white, isAdded ? 0.5 : 0.96);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    g.lineStyle(1.5, isAdded ? COLORS.green : COLORS.stoneDeep, isAdded ? 0.8 : 0.4);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    c.add(g);

    c.add(this.drawIngredientIcon(-w / 2 + 28, 0, ing, isAdded));
    c.add(this.add.text(12, 0, ing.name,
      text(SIZE.label, isAdded ? INK_SOFT : INK, 'bold')).setOrigin(0.5));

    if (isAdded) {
      const tick = this.add.graphics();
      tick.lineStyle(3, COLORS.green);
      tick.beginPath();
      tick.moveTo(w / 2 - 28, 0);
      tick.lineTo(w / 2 - 22, 6);
      tick.lineTo(w / 2 - 12, -6);
      tick.strokePath();
      c.add(tick);
    }

    this.dyn(c);
    if (isAdded) return;

    /*
     * Putting something in the pot is free.
     *
     * It used to raise a task and pay stars, which meant cooking one bowl of soup asked
     * three questions — the child was doing arithmetic to fetch a carrot. The whole recipe
     * is one job now, and the job is paid for once, at the stove.
     */
    tappable(this, c, w, h, () => {
      if (!gameState.addIngredient(ing.name)) return;

      const { width, height } = this.scale;
      const flying = this.drawIngredientIcon(0, 0, ing, false);
      const holder = this.add.container(x - w / 2 + 28, y, [flying]).setDepth(880);

      this.tweens.add({
        targets: holder,
        x: width / 2,
        y: height * 0.48,
        scale: 0.6,
        angle: 220,
        duration: 460,
        ease: 'Cubic.easeIn',
        onComplete: () => {
          holder.destroy();
          audio.sizzle();
          this.refresh();
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
        g.fillEllipse(0, 2, 13, 29);
        g.fillStyle(COLORS.grassDeep, a);
        g.fillEllipse(0, -13, 13, 9);
        break;
      case 'leaf':
        g.fillStyle(ing.color, a);
        g.fillEllipse(-4, 0, 20, 24);
        g.fillEllipse(6, 2, 18, 22);
        break;
      case 'drop':
        g.fillStyle(ing.color, a);
        g.fillRoundedRect(-9, -12, 18, 25, 4);
        g.fillStyle(COLORS.waterLight, a * 0.7);
        g.fillRoundedRect(-9, -12, 18, 7, 3);
        break;
      default:
        g.fillStyle(ing.color, a);
        g.fillCircle(0, 0, 12);
        g.fillStyle(COLORS.white, a * 0.35);
        g.fillCircle(-4, -4.5, 4.5);
    }
    return g;
  }

  private buildProgressPips(x: number, y: number, done: number, total: number): void {
    const c = this.add.container(x, y);
    for (let i = 0; i < total; i++) {
      const dx = (i - (total - 1) / 2) * 28;
      const pip = this.add.circle(dx, 0, 9, i < done ? COLORS.green : COLORS.white);
      pip.setStrokeStyle(2, i < done ? COLORS.green : COLORS.stoneDeep);
      c.add(pip);
    }
    this.dyn(c);
  }

  private buildStove(cx: number, cy: number, recipe: Recipe | null, addedCount: number): void {
    const c = this.add.container(cx, cy);
    const g = this.add.graphics();

    // base cabinet
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
    g.fillRoundedRect(-50, -48, 100, 52, { tl: 5, tr: 5, bl: 15, br: 15 });
    g.fillStyle(0x827D78);
    g.fillRoundedRect(-50, -48, 32, 52, { tl: 5, tr: 0, bl: 15, br: 0 });
    g.fillStyle(0x5C5854);
    g.fillRoundedRect(-58, -55, 116, 11, 5.5);
    g.fillRoundedRect(-68, -48, 13, 8, 3);
    g.fillRoundedRect(55, -48, 13, 8, 3);

    // contents rise as ingredients go in
    if (recipe && addedCount > 0) {
      const fill = Phaser.Math.Clamp(addedCount / recipe.ingredients.length, 0, 1);
      const h = 32 * fill;
      g.fillStyle(recipe.color, 0.85);
      g.fillRoundedRect(-44, -6 - h, 88, h, 4);
      g.fillStyle(COLORS.white, 0.2);
      g.fillEllipse(0, -6 - h, 84, 8);
    }

    c.add(g);
    this.dyn(c);

    if (recipe && addedCount > 0) {
      for (let i = 0; i < 3; i++) {
        const puff = this.add.circle(cx - 17 + i * 17, cy - 62, 5.5, COLORS.white, 0.55).setDepth(6);
        this.tweens.add({
          targets: puff,
          y: cy - 108,
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

  /**
   * The one paid job in the kitchen.
   *
   * Cooking is what raises the task, and the finished dish lands on the pass rather than in
   * front of a guest — carrying it out is a separate act, done in the restaurant, by the
   * player.
   */
  private buildCookButton(x: number, y: number, recipe: Recipe): void {
    const full = gameState.kitchen.ready.length >= MAX_READY_DISHES;
    const w = 232;
    const h = 48;
    const c = this.add.container(x, y);

    const g = this.add.graphics();
    shadow(g, -w / 2, -h / 2, w, h, h / 2, 3, 0.2);
    g.fillStyle(full ? COLORS.stone : COLORS.green);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    g.fillStyle(COLORS.white, 0.24);
    g.fillRoundedRect(-w / 2 + 3, -h / 2 + 3, w - 6, h * 0.42, h / 2);

    c.add([g, this.add.text(0, 0, full ? 'Ikke plads til mere mad' : `Kog ${recipe.name.toLowerCase()}`,
      text(SIZE.body, '#FFFFFF', 'bold')).setOrigin(0.5)]);
    this.dyn(c);

    if (full) return;

    this.tweens.add({ targets: c, scale: 1.05, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    tappable(this, c, w, h, () => {
      const dish = gameState.cookDish();
      if (!dish) return;

      const { width, height } = this.scale;
      audio.sparkle();
      showCheckmark(this, width / 2, height * 0.44);
      showSparkle(this, width / 2, height * 0.48, 190, 130);
      showToast(this, width / 2, height * 0.32, `${dish} er klar til bordene`, '#4A7F33');

      // Cooking is how a guest gets fed, not the feeding: the star comes at the table.
      this.refresh();
    });
  }

  /* --------------------------------------------------------------- restaurant --- */

  private buildDiningRoom(): void {
    const { width, height } = this.scale;
    const seated = gameState.guestsAt('restaurant');

    const spots = [
      { x: width * 0.24, y: height * 0.38 },
      { x: width * 0.5, y: height * 0.34 },
      { x: width * 0.76, y: height * 0.38 },
      { x: width * 0.35, y: height * 0.63 },
      { x: width * 0.65, y: height * 0.63 },
    ];

    for (let i = 0; i < TABLE_COUNT; i++) {
      this.buildTable(spots[i], seated[i] ?? null);
    }

    this.buildServingCounter(width / 2, height - 68);

    const open = gameState.openOrders().length;
    const ready = seated.filter(g => gameState.guestPhase(g) === 'ready').length;
    let hint: string;
    if (seated.length === 0) {
      hint = 'Ingen gæster ved bordene endnu';
    } else if (ready > 0 && open === 0) {
      hint = 'Tryk på gæsten, og vis dem vej';
    } else if (open === 0) {
      hint = 'Alle har fået deres mad';
    } else if (gameState.wantedDishes().length > 0) {
      hint = 'Tryk på en gæst for at servere maden';
    } else {
      hint = `${listDishes([...new Set(gameState.openOrders())], true)} skal laves i køkkenet`;
    }
    this.dyn(caption(this, width / 2, height - 20, hint,
      seated.length > 0 && open === 0 ? 'done' : 'idle'));
  }

  private buildTable(
    spot: { x: number; y: number },
    guest: GuestData | null
  ): void {
    const c = this.add.container(spot.x, spot.y);
    const g = this.add.graphics();

    shadow(g, -46, 18, 92, 15, 8, 3, 0.14);
    g.fillStyle(COLORS.woodDeep);
    g.fillRoundedRect(-44, 0, 88, 33, 8);
    g.fillStyle(COLORS.woodLight);
    g.fillRoundedRect(-48, -7, 96, 13, 6);

    // cloth
    g.fillStyle(COLORS.white, 0.85);
    g.fillRoundedRect(-38, -5, 76, 11, 4);

    // plate
    g.fillStyle(COLORS.white);
    g.fillCircle(0, 7, 14);
    g.fillStyle(COLORS.stone, 0.5);
    g.fillCircle(0, 7, 9);

    c.add(g);

    if (!guest) {
      this.dyn(c);
      return;
    }

    c.add(drawHead(this, 0, -30, guest.color, 1.5, guest.id, guest.wearing));

    // what has already been carried out to them
    guest.served.forEach((dish, i) => {
      const plate = drawDish(this, dish, 0.62);
      plate.setPosition(-24 + i * 24, 6);
      c.add(plate);
    });

    this.addGuest(guest, c, { w: 96, h: 92, thoughtY: -50, barY: 44 });
  }

  protected animateDelivery(_guest: GuestData, action: CardAction, spot: { x: number; y: number }): void {
    if (action.kind === 'serve' && action.arg) this.flyDish(action.arg, spot);
  }

  /** The plate travelling from the pass to the table. */
  private flyDish(dish: string, spot: { x: number; y: number }): void {
    const { width, height } = this.scale;
    const plate = drawDish(this, dish, 0.9).setDepth(880);
    plate.setPosition(width / 2, height - 74);

    this.tweens.add({
      targets: plate,
      x: spot.x,
      y: spot.y + 6,
      duration: dur(340),
      ease: 'Sine.easeOut',
      onComplete: () => plate.destroy(),
    });
  }

  /** The hatch the finished dishes come through, drawn where the player taps from. */
  private buildServingCounter(cx: number, cy: number): void {
    const ready = gameState.kitchen.ready;
    const w = 340;
    const h = 54;

    const c = this.add.container(cx, cy);
    const g = this.add.graphics();
    shadow(g, -w / 2, -h / 2, w, h, 10, 3, 0.16);
    g.fillStyle(COLORS.woodDeep);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 10);
    g.fillStyle(COLORS.woodLight);
    g.fillRoundedRect(-w / 2 - 6, -h / 2 - 8, w + 12, 15, 7);
    c.add(g);

    if (ready.length === 0) {
      c.add(this.add.text(0, 6, 'Ingen mad klar — lav noget i køkkenet',
        text(SIZE.tiny, '#FDF7EA', 'bold')).setOrigin(0.5));
    } else {
      ready.slice(0, MAX_READY_DISHES).forEach((dish, i) => {
        const plate = drawDish(this, dish, 0.85);
        plate.setPosition((i - (Math.min(ready.length, MAX_READY_DISHES) - 1) / 2) * 52, 2);
        c.add(plate);
      });
    }

    this.dyn(c);
  }
}
