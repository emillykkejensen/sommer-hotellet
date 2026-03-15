import { COLORS } from '../config';
import { gameState } from '../state/GameState';
import { showStarBurst, showHearts, showCheckmark } from '../objects/FeedbackEffects';
import { addBackButton } from '../ui/BackButton';
import { addStarCounter } from '../ui/StarCounter';

interface Recipe {
  name: string;
  emoji: string;
  ingredients: { name: string; emoji: string; color: number }[];
}

const RECIPES: Recipe[] = [
  {
    name: 'Suppe',
    emoji: '🍲',
    ingredients: [
      { name: 'Gulerod', emoji: '🥕', color: COLORS.orange },
      { name: 'Kartoffel', emoji: '🥔', color: COLORS.cream },
      { name: 'Løg', emoji: '🧅', color: COLORS.yellow },
    ],
  },
  {
    name: 'Pandekager',
    emoji: '🥞',
    ingredients: [
      { name: 'Mel', emoji: '🌾', color: COLORS.cream },
      { name: 'Æg', emoji: '🥚', color: COLORS.white },
      { name: 'Mælk', emoji: '🥛', color: COLORS.white },
    ],
  },
  {
    name: 'Salat',
    emoji: '🥗',
    ingredients: [
      { name: 'Salat', emoji: '🥬', color: COLORS.green },
      { name: 'Tomat', emoji: '🍅', color: COLORS.red },
      { name: 'Agurk', emoji: '🥒', color: COLORS.green },
    ],
  },
  {
    name: 'Is',
    emoji: '🍦',
    ingredients: [
      { name: 'Mælk', emoji: '🥛', color: COLORS.white },
      { name: 'Sukker', emoji: '🍬', color: COLORS.pink },
      { name: 'Jordbær', emoji: '🍓', color: COLORS.red },
    ],
  },
];

export class KitchenScene extends Phaser.Scene {
  private currentRecipe: Recipe | null = null;
  private addedIngredients: Set<string> = new Set();
  private dishReady: boolean = false;
  private showingDining: boolean = false;

  constructor() {
    super({ key: 'KitchenScene' });
  }

  create(): void {
    this.cameras.main.fadeIn(300);
    this.currentRecipe = null;
    this.addedIngredients = new Set();
    this.dishReady = false;
    this.showingDining = false;

    this.drawKitchen();

    addBackButton(this);
    addStarCounter(this);
  }

  private drawKitchen(): void {
    const { width, height } = this.scale;

    // Floor (tile pattern)
    const floor = this.add.graphics();
    floor.fillStyle(COLORS.white);
    floor.fillRect(0, height * 0.65, width, height * 0.35);
    floor.fillStyle(COLORS.greyLight, 0.3);
    for (let x = 0; x < width; x += 40) {
      for (let y = height * 0.65; y < height; y += 40) {
        if ((x / 40 + y / 40) % 2 === 0) {
          floor.fillRect(x, y, 40, 40);
        }
      }
    }

    // Wall
    this.add.graphics()
      .fillStyle(COLORS.cream)
      .fillRect(0, 0, width, height * 0.65);

    // Title
    this.add.text(width / 2, 70, '🍳 Køkkenet', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '24px',
      color: '#8B4513',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Toggle kitchen/dining button
    const toggleBtn = this.add.container(width - 100, 70);
    const tbBg = this.add.graphics();
    tbBg.fillStyle(this.showingDining ? COLORS.orange : COLORS.green, 0.9);
    tbBg.fillRoundedRect(-50, -16, 100, 32, 10);
    toggleBtn.add(tbBg);
    toggleBtn.add(this.add.text(0, 0, this.showingDining ? '🍳 Køkken' : '🍽️ Spisestue', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '13px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5));
    toggleBtn.setSize(100, 32);
    toggleBtn.setInteractive({ useHandCursor: true });
    toggleBtn.on('pointerdown', () => {
      this.showingDining = !this.showingDining;
      this.scene.restart();
    });

    if (this.showingDining) {
      this.drawDiningRoom();
    } else {
      this.drawCookingArea();
    }
  }

  private drawCookingArea(): void {
    const { width, height } = this.scale;

    // Stove/counter
    const counter = this.add.graphics();
    counter.fillStyle(COLORS.grey);
    counter.fillRect(width / 2 - 80, height * 0.45, 160, 80);
    counter.fillStyle(COLORS.greyLight);
    counter.fillRect(width / 2 - 85, height * 0.44, 170, 10);

    // Pot on stove
    const pot = this.add.graphics();
    pot.fillStyle(0x666666);
    pot.fillRoundedRect(width / 2 - 35, height * 0.38, 70, 40, 8);
    pot.fillStyle(0x555555);
    pot.fillRect(width / 2 - 40, height * 0.37, 80, 8);
    // Handles
    pot.fillStyle(0x444444);
    pot.fillRect(width / 2 - 45, height * 0.4, 8, 6);
    pot.fillRect(width / 2 + 37, height * 0.4, 8, 6);

    // Show steam if cooking
    if (this.addedIngredients.size > 0) {
      for (let i = 0; i < 3; i++) {
        const steam = this.add.text(
          width / 2 - 15 + i * 15,
          height * 0.34,
          '~',
          { fontSize: '20px', color: '#CCCCCC' }
        ).setOrigin(0.5);
        this.tweens.add({
          targets: steam,
          y: height * 0.28,
          alpha: 0,
          duration: 1500,
          delay: i * 300,
          repeat: -1,
        });
      }
    }

    // Recipe selector
    this.add.text(width / 2, height * 0.15, 'Vælg en opskrift:', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '16px',
      color: '#555',
    }).setOrigin(0.5);

    RECIPES.forEach((recipe, i) => {
      const rx = 100 + i * (width - 200) / 3;
      const ry = height * 0.23;
      const isSelected = this.currentRecipe?.name === recipe.name;

      const btn = this.add.container(rx, ry);
      const bg = this.add.graphics();
      bg.fillStyle(isSelected ? COLORS.green : COLORS.greyLight, isSelected ? 1 : 0.7);
      bg.fillRoundedRect(-40, -18, 80, 36, 10);
      btn.add(bg);
      btn.add(this.add.text(0, 0, `${recipe.emoji} ${recipe.name}`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '13px',
        color: isSelected ? '#FFFFFF' : '#333',
        fontStyle: 'bold',
      }).setOrigin(0.5));
      btn.setSize(80, 36);
      btn.setInteractive({ useHandCursor: true });
      btn.on('pointerdown', () => {
        this.currentRecipe = recipe;
        this.addedIngredients = new Set();
        this.dishReady = false;
        this.scene.restart();
      });
    });

    // Ingredients shelf
    if (this.currentRecipe) {
      this.add.text(80, height * 0.55, 'Ingredienser:', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        color: '#555',
        fontStyle: 'bold',
      });

      this.currentRecipe.ingredients.forEach((ing, i) => {
        const ix = 100 + i * 100;
        const iy = height * 0.63;
        const isAdded = this.addedIngredients.has(ing.name);

        const ingContainer = this.add.container(ix, iy);

        const ingBg = this.add.graphics();
        ingBg.fillStyle(isAdded ? COLORS.green : ing.color, isAdded ? 0.3 : 0.8);
        ingBg.fillRoundedRect(-35, -18, 70, 36, 8);
        ingContainer.add(ingBg);

        ingContainer.add(this.add.text(0, 0, `${ing.emoji} ${ing.name}`, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '12px',
          color: '#333',
          fontStyle: 'bold',
        }).setOrigin(0.5));

        if (!isAdded) {
          ingContainer.setSize(70, 36);
          ingContainer.setInteractive({ useHandCursor: true });
          ingContainer.on('pointerdown', () => {
            this.addedIngredients.add(ing.name);

            // Ingredient flies to pot
            const flyEmoji = this.add.text(ix, iy, ing.emoji, { fontSize: '24px' }).setOrigin(0.5);
            this.tweens.add({
              targets: flyEmoji,
              x: width / 2,
              y: height * 0.38,
              scale: 0.5,
              duration: 400,
              ease: 'Power2',
              onComplete: () => {
                flyEmoji.destroy();
                showCheckmark(this, width / 2, height * 0.35);

                // Check if all ingredients added
                if (this.currentRecipe && this.addedIngredients.size === this.currentRecipe.ingredients.length) {
                  this.time.delayedCall(500, () => this.completeDish());
                } else {
                  this.scene.restart();
                }
              },
            });
          });
        }
      });

      // Progress indicator
      const progress = `${this.addedIngredients.size}/${this.currentRecipe.ingredients.length}`;
      this.add.text(width / 2, height * 0.55, progress, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        color: '#555',
        fontStyle: 'bold',
      }).setOrigin(0.5);
    }
  }

  private completeDish(): void {
    if (!this.currentRecipe) return;

    const { width, height } = this.scale;

    this.dishReady = true;
    gameState.kitchen.currentDish = this.currentRecipe.name;
    gameState.save();

    // Show completed dish
    const dishDisplay = this.add.text(
      width / 2, height * 0.35,
      this.currentRecipe.emoji,
      { fontSize: '48px' }
    ).setOrigin(0.5).setScale(0);

    this.tweens.add({
      targets: dishDisplay,
      scale: 1,
      duration: 500,
      ease: 'Back.easeOut',
    });

    showStarBurst(this, width / 2, height * 0.3, 2);
    showHearts(this, width / 2, height * 0.25);

    const doneText = this.add.text(
      width / 2, height * 0.75,
      `${this.currentRecipe.emoji} ${this.currentRecipe.name} er klar!`,
      {
        fontFamily: 'Arial, sans-serif',
        fontSize: '22px',
        color: '#27AE60',
        fontStyle: 'bold',
        backgroundColor: '#FFFFFF',
        padding: { x: 10, y: 6 },
      }
    ).setOrigin(0.5);

    // Serve button
    const serveBtn = this.add.container(width / 2, height * 0.85);
    const sBg = this.add.graphics();
    sBg.fillStyle(COLORS.green);
    sBg.fillRoundedRect(-70, -18, 140, 36, 12);
    serveBtn.add(sBg);
    serveBtn.add(this.add.text(0, 0, '🍽️ Server maden!', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '16px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5));
    serveBtn.setSize(140, 36);
    serveBtn.setInteractive({ useHandCursor: true });
    serveBtn.on('pointerdown', () => {
      gameState.kitchen.dishesServed++;
      gameState.kitchen.currentDish = null;
      this.currentRecipe = null;
      this.addedIngredients = new Set();
      this.dishReady = false;
      gameState.save();
      this.showingDining = true;
      this.scene.restart();
    });
  }

  private drawDiningRoom(): void {
    const { width, height } = this.scale;

    // Title
    this.add.text(width / 2, height * 0.15, '🍽️ Spisestuen', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '22px',
      color: '#8B4513',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Draw dining tables with guests
    const tables = [
      { x: width * 0.25, y: height * 0.4 },
      { x: width * 0.5, y: height * 0.4 },
      { x: width * 0.75, y: height * 0.4 },
      { x: width * 0.35, y: height * 0.65 },
      { x: width * 0.65, y: height * 0.65 },
    ];

    const checkedInGuests = gameState.getCheckedInGuests();

    tables.forEach((table, i) => {
      // Table
      const t = this.add.graphics();
      t.fillStyle(COLORS.wood);
      t.fillRoundedRect(table.x - 30, table.y - 10, 60, 40, 8);
      t.fillStyle(COLORS.woodLight);
      t.fillRoundedRect(table.x - 32, table.y - 12, 64, 8, 4);

      // Plate
      t.fillStyle(COLORS.white);
      t.fillCircle(table.x, table.y + 8, 12);
      t.lineStyle(1, COLORS.greyLight);
      t.strokeCircle(table.x, table.y + 8, 12);

      // Guest at table (if any)
      if (i < checkedInGuests.length) {
        const guest = checkedInGuests[i];
        // Simple guest head above table
        const head = this.add.graphics();
        head.fillStyle(0xFFDBAC);
        head.fillCircle(table.x, table.y - 25, 12);
        head.fillStyle(guest.color);
        head.fillRoundedRect(table.x - 10, table.y - 18, 20, 8, 3);
        // Eyes
        head.fillStyle(COLORS.black);
        head.fillCircle(table.x - 4, table.y - 27, 2);
        head.fillCircle(table.x + 4, table.y - 27, 2);
        // Smile
        head.lineStyle(1.5, COLORS.black);
        head.beginPath();
        head.arc(table.x, table.y - 23, 4, 0.2, Math.PI - 0.2, false);
        head.strokePath();
      }
    });

    // Stats
    this.add.text(width / 2, height * 0.88, `Retter serveret: ${gameState.kitchen.dishesServed} 🍽️`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '16px',
      color: '#555',
      fontStyle: 'bold',
      backgroundColor: '#FFFFFFCC',
      padding: { x: 8, y: 4 },
    }).setOrigin(0.5);
  }
}
