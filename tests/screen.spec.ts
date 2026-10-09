import { test, expect, Page } from '@playwright/test';
import { Game } from './game';

/**
 * The game fills whatever screen it is given.
 *
 * It used to be a fixed 880×550 stage scaled to fit, which on a phone — about twice as wide
 * as it is tall — left a band of empty sky down each side. The stage now takes the screen's
 * own shape: wider on a phone, taller on a tablet, and exactly 880×550 at the 1.6 the scenes
 * were drawn for, which is what every other test runs at.
 */

async function stage(page: Page): Promise<{ width: number; height: number }> {
  return page.evaluate(() => ({
    width: window.__game.scale.gameSize.width,
    height: window.__game.scale.gameSize.height,
  }));
}

async function canvasBox(page: Page) {
  const box = await page.locator('canvas').boundingBox();
  if (!box) throw new Error('no canvas');
  return box;
}

test('on a phone held sideways the game fills the screen edge to edge', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  const game = await Game.open(page);

  const box = await canvasBox(page);
  expect(Math.abs(box.width - 844), 'no band down either side').toBeLessThan(3);
  expect(Math.abs(box.height - 390)).toBeLessThan(3);

  const size = await stage(page);
  expect(size.height, 'the height the scenes were drawn for').toBe(550);
  expect(size.width, 'and the width of the phone').toBeGreaterThan(1150);
  game.expectNoErrors();
});

test('on a tablet the game fills the screen top to bottom', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  const game = await Game.open(page);

  const box = await canvasBox(page);
  expect(Math.abs(box.width - 1024)).toBeLessThan(3);
  expect(Math.abs(box.height - 768)).toBeLessThan(3);
  expect(await stage(page)).toEqual({ width: 880, height: 660 });
  game.expectNoErrors();
});

test('every scene lays itself out at a phone\'s shape', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  const game = await Game.openWithSave(page, {
    ...Game.guestWaitingAt('pool', { extras: ['is:vaffel:citron:drys'] }),
    owned: ['boutique'],
  });
  await game.start();

  for (const key of [
    'LobbyScene', 'RoomScene', 'KitchenScene', 'PoolScene', 'GardenScene',
    'IceCreamScene', 'BoutiqueScene', 'ShopScene', 'SettingsScene', 'HotelMapScene',
  ]) {
    await page.evaluate((k) => {
      const active = window.__game.scene.getScenes(true)[0];
      active.scene.start(k);
    }, key);
    await game.waitForScene(key);

    // Nothing interactive may hang off the edge of the wider stage.
    const outside = await page.evaluate((k) => {
      const scene = window.__game.scene.getScene(k) as any;
      const { width, height } = scene.scale;
      const off: string[] = [];
      const walk = (objs: any[], ox: number, oy: number) => {
        for (const o of objs || []) {
          if (!o) continue;
          const x = ox + (o.x || 0);
          const y = oy + (o.y || 0);
          if (o.input?.enabled && (x < 0 || x > width || y < 0 || y > height)) {
            off.push(`${o.type} at ${Math.round(x)},${Math.round(y)}`);
          }
          if (Array.isArray(o.list)) walk(o.list, x, y);
        }
      };
      walk(scene.children.list, 0, 0);
      return off;
    }, key);
    expect(outside, `${key}: everything tappable is on screen`).toEqual([]);
  }
  game.expectNoErrors();
});

test('turning the screen lays the game out again', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  const game = await Game.open(page);
  await game.start();
  expect((await stage(page)).width).toBeGreaterThan(1150);

  await page.setViewportSize({ width: 1200, height: 750 });
  await expect.poll(() => stage(page), { timeout: 15_000 }).toEqual({ width: 880, height: 550 });
  await game.waitForScene('HotelMapScene');

  const box = await canvasBox(page);
  expect(Math.abs(box.width - 1200)).toBeLessThan(3);
  game.expectNoErrors();
});
