import { COLORS } from '../config';

/**
 * The menu.
 *
 * This used to live inside `KitchenScene`, but a guest sitting in the restaurant has to be
 * able to order from it, and `GameState` cannot import a scene. So the food is data now,
 * and both the kitchen and the guests read it from here.
 */

export interface Ingredient {
  name: string;
  color: number;
  shape: 'round' | 'long' | 'leaf' | 'drop';
}

export interface Recipe {
  name: string;
  color: number;
  ingredients: Ingredient[];
}

export const RECIPES: Recipe[] = [
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

export function recipeNamed(name: string): Recipe | null {
  return RECIPES.find(r => r.name === name) ?? null;
}

export function recipeColor(name: string): number {
  return recipeNamed(name)?.color ?? COLORS.stone;
}

/**
 * What a guest asks for when they sit down.
 *
 * Mostly one or two dishes: three is the treat that makes a child groan and then get on
 * with it, and four would mean cooking for longer than a five-year-old will stay with it.
 * Repeats are allowed — two of the same thing is a perfectly ordinary order, and it makes
 * the counting in the kitchen worth doing.
 */
export function randomOrder(): string[] {
  const roll = Math.random();
  const count = roll < 0.45 ? 1 : roll < 0.85 ? 2 : 3;
  return Array.from({ length: count }, () => RECIPES[Math.floor(Math.random() * RECIPES.length)].name);
}
