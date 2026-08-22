import { Page, expect } from '@playwright/test';
import { GAME_HEIGHT, GAME_WIDTH } from '../src/config';
import { ALL_SKILLS, Level } from '../src/tasks/types';

/**
 * Test harness for driving the Phaser canvas.
 *
 * Everything goes through game coordinates (960x600) rather than screen pixels, so a
 * different viewport does not silently move every click target.
 */
export class Game {
  readonly errors: string[] = [];

  constructor(readonly page: Page) {
    // Uncaught exceptions only. Console resource errors (a blocked webfont CDN, a
    // missing favicon) are environmental and would make the suite fail offline.
    page.on('pageerror', e => this.errors.push(e.message));
    page.on('console', m => {
      if (m.type() !== 'error') return;
      const t = m.text();
      if (/Failed to load resource|net::|ERR_|favicon/.test(t)) return;
      this.errors.push(t);
    });
  }

  static async open(page: Page): Promise<Game> {
    const game = new Game(page);
    // The game honours prefers-reduced-motion by collapsing camera fades and the tap
    // squash. Enabling it here means the suite is not gated on animation time — which
    // matters because software WebGL runs at a few frames a second.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(() => window.localStorage.clear());
    await Game.installAudioSpy(page);
    await page.goto('/');
    await game.waitForScene('MainMenuScene');
    return game;
  }

  /**
   * Counts Web Audio nodes as they are created.
   *
   * Sound cannot be heard in a headless browser, but it can be observed: a passthrough
   * subclass of AudioContext records what the game asks for, which is enough to prove the
   * effects are wired up and that muting really silences them.
   */
  private static async installAudioSpy(page: Page): Promise<void> {
    await page.addInitScript(() => {
      const tally = { contexts: 0, oscillators: 0, buffers: 0 };
      (window as any).__audio = tally;

      const Real = window.AudioContext;
      if (!Real) return;
      window.AudioContext = class extends Real {
        constructor(...args: any[]) {
          super(...(args as []));
          tally.contexts++;
        }
        createOscillator() {
          tally.oscillators++;
          return super.createOscillator();
        }
        createBufferSource() {
          tally.buffers++;
          return super.createBufferSource();
        }
      } as unknown as typeof AudioContext;
    });
  }

  /** Web Audio nodes created so far. */
  async audioTally(): Promise<{ contexts: number; oscillators: number; buffers: number }> {
    return this.page.evaluate(() => ({ ...(window as any).__audio }));
  }

  /** How many sound sources a block of work produced. */
  async countingSounds<T>(work: () => Promise<T>): Promise<{ result: T; sources: number }> {
    const before = await this.audioTally();
    const result = await work();
    const after = await this.audioTally();
    return {
      result,
      sources: after.oscillators - before.oscillators + (after.buffers - before.buffers),
    };
  }

  async tap(gx: number, gy: number): Promise<void> {
    const box = await this.page.locator('canvas').boundingBox();
    if (!box) throw new Error('canvas not found');
    await this.page.mouse.click(
      box.x + (gx / GAME_WIDTH) * box.width,
      box.y + (gy / GAME_HEIGHT) * box.height
    );
    await this.settle();
  }

  /**
   * Waits for the game to stop moving rather than sleeping a fixed time. Software WebGL
   * runs at a few frames a second, and Phaser clamps its delta, so a 220 ms fade can take
   * well over a second of wall clock — a fixed wait fires the next click into the old scene.
   */
  async settle(timeout = 12_000): Promise<void> {
    await this.page.waitForFunction(() => {
      const scenes = window.__game.scene.getScenes(true);
      if (scenes.length === 0) return false;

      // A task overlay runs alongside its room, so more than one active scene is normal —
      // every active scene has to be still, not just the only one.
      for (const raw of scenes) {
        const scene = raw as any;
        const cam = scene.cameras?.main;
        if (cam?.fadeEffect?.isRunning || cam?.flashEffect?.isRunning) return false;

        // ignore ambient loops (clouds, floating buttons); wait only on one-shot tweens
        const busyTweens = scene.tweens.getTweens().some((t: any) => {
          if (t.isPlaying && !t.isPlaying()) return false;
          const loops = t.data?.some?.((d: any) => d.repeat === -1);
          return !loops;
        });
        if (busyTweens) return false;

        // Scenes also defer work with time.delayedCall — a scheduled refresh is not a
        // tween, so waiting only on tweens let the next click land mid-rebuild.
        const pending = (scene.time?._active ?? []) as any[];
        const busyTimers = pending.some((e: any) => !e.loop && !e.repeat && !e.paused);
        if (busyTimers) return false;
      }
      return true;
    }, undefined, { timeout, polling: 100 });
  }

  async activeScenes(): Promise<string[]> {
    return this.page.evaluate(() =>
      window.__game.scene.getScenes(true).map(s => s.scene.key)
    );
  }

  async waitForScene(key: string): Promise<void> {
    await expect
      .poll(() => this.activeScenes(), { timeout: 20_000, message: `waiting for ${key}` })
      .toContain(key);
    await this.settle();
  }

  /** Tap a map area and wait until its scene is actually up. */
  async enter(area: keyof typeof AT.map): Promise<void> {
    const target = AT.map[area];
    const scene = SCENE_FOR_AREA[area];
    await this.tap(target.x, target.y);
    await this.waitForScene(scene);
  }

  async leave(): Promise<void> {
    await this.tap(AT.back.x, AT.back.y);
    await this.waitForScene('HotelMapScene');
  }

  async start(): Promise<void> {
    await this.tap(AT.playButton.x, AT.playButton.y);
    await this.waitForScene('HotelMapScene');
  }

  /** Poll the save file, so a slow renderer means a slower pass rather than a failure. */
  expectSave(read: (save: any) => unknown, message?: string) {
    return expect.poll(async () => read(await this.save()), { timeout: 12_000, message });
  }

  /** Reads the persisted save, which is the game's single source of truth. */
  async save(): Promise<any> {
    return this.page.evaluate(() => {
      const raw = window.localStorage.getItem('sommer-hotellet-save');
      return raw ? JSON.parse(raw) : null;
    });
  }

  async stars(): Promise<number> {
    return (await this.save())?.stars ?? 0;
  }

  /**
   * Every Text string currently on screen in a scene, containers included.
   *
   * Asserting on the save file alone is not enough: the original bug's worst symptom was
   * that state changed but nothing on screen did. Reading the rendered labels back closes
   * that loop without resorting to pixel comparison.
   */
  async visibleText(sceneKey: string): Promise<string[]> {
    return this.page.evaluate((key) => {
      const out: string[] = [];
      const walk = (objs: any[]) => {
        for (const o of objs) {
          if (!o) continue;
          if (o.type === 'Text' && typeof o.text === 'string' && o.visible) out.push(o.text);
          if (Array.isArray(o.list)) walk(o.list);
        }
      };
      const scene = window.__game.scene.getScene(key) as any;
      walk(scene.children.list);
      return out;
    }, sceneKey);
  }

  /** Polls the on-screen labels, so a slow renderer means a slower pass. */
  expectScreen(sceneKey: string, message?: string) {
    return expect.poll(() => this.visibleText(sceneKey), { timeout: 12_000, message });
  }

  /** Reads a live field off a running scene — used to prove state is not being reset. */
  async sceneField<T>(sceneKey: string, field: string): Promise<T> {
    return this.page.evaluate(
      ([k, f]) => (window.__game.scene.getScene(k) as any)[f],
      [sceneKey, field] as const
    );
  }

  /* ------------------------------------------------------------- tasks --- */

  async taskOpen(): Promise<boolean> {
    return (await this.activeScenes()).includes('TaskOverlayScene');
  }

  /** The overlay launches behind a short delay, so poll rather than check once. */
  async waitForTask(timeout = 8_000): Promise<boolean> {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      if (await this.taskOpen()) {
        await this.settle();
        return true;
      }
      await this.page.waitForTimeout(120);
    }
    return false;
  }

  /**
   * Interactive targets in the task overlay, with their hit boxes.
   *
   * Used to assert that no two controls sit on top of each other — the number pad shipped
   * with Slet and Svar covering the 5 and the 0, which made those digits untappable.
   */
  async taskControls(): Promise<{ label: string | null; x: number; y: number; w: number; h: number }[]> {
    const all = (await this.readTask()).hits;
    // drop the full-canvas scrim
    return all.filter(h => h.w > 0 && h.w < 400);
  }

  /** Reads the live task, including where its interactive targets are on screen. */
  private async readTask(): Promise<{
    body: any;
    skill: string;
    prompt: string;
    /** Options already ruled out by a wrong answer — the scene stops drawing them. */
    ruledOut: string[];
    hits: { x: number; y: number; label: string | null; w: number; h: number; rank: number | null }[];
  }> {
    const info = await this.page.evaluate(() => {
      const scene = window.__game.scene.getScene('TaskOverlayScene') as any;
      if (!scene?.scene.isActive()) return null;

      const hits: any[] = [];
      const walk = (objs: any[], ox: number, oy: number) => {
        for (const o of objs || []) {
          if (!o) continue;
          const x = ox + (o.x || 0);
          const y = oy + (o.y || 0);
          if (o.input) {
            hits.push({
              x, y,
              label: o.list?.find?.((c: any) => c.type === 'Text')?.text ?? null,
              w: o.input.hitArea?.width ?? 0,
              h: o.input.hitArea?.height ?? 0,
              // put-in-order stashes the correct position on the container
              rank: o.getData?.('rank') ?? null,
            });
          }
          if (Array.isArray(o.list)) walk(o.list, x, y);
        }
      };
      walk(scene.children.list, 0, 0);
      return {
        body: scene.task.body,
        skill: scene.task.skill,
        prompt: scene.task.prompt,
        ruledOut: [...(scene.ruledOut ?? [])],
        hits,
      };
    });
    if (!info) throw new Error('no task open');
    return info;
  }

  /** Answers the open task correctly and waits for it to close. */
  async solveTask(): Promise<{ template: string; skill: string }> {
    const { body, skill, hits, ruledOut } = await this.readTask();
    await this.tapTaskAnswer(body, hits, true, ruledOut);
    await this.page.waitForFunction(
      () => !window.__game.scene.getScenes(true).some(s => s.scene.key === 'TaskOverlayScene'),
      undefined,
      { timeout: 20_000 }
    );
    await this.settle();
    return { template: body.template, skill };
  }

  /** Answers wrong once. The overlay must stay open — there is no fail state. */
  async answerTaskWrong(): Promise<void> {
    const { body, hits, ruledOut } = await this.readTask();
    await this.tapTaskAnswer(body, hits, false, ruledOut);
  }

  private async tapTaskAnswer(
    body: any,
    hits: any[],
    correct: boolean,
    ruledOut: string[]
  ): Promise<void> {
    // The scrim covers the whole canvas and the speaker is small; the answer targets sit
    // between those two sizes.
    const inBody = hits.filter(h => h.w > 45 && h.w < 240);

    switch (body.template) {
      case 'pick-one': {
        const target = correct
          ? inBody.find(h => h.label === body.answer)
          : inBody.find(h => h.label !== null && h.label !== body.answer);
        if (!target) throw new Error(`pick-one target missing (${correct ? 'right' : 'wrong'})`);
        await this.tap(target.x, target.y);
        return;
      }
      case 'count-taps': {
        const icon = inBody.find(h => h.label === null && h.w >= 100);
        if (!icon) throw new Error('count-taps icon missing');
        const taps = correct ? body.target : body.target + 1;
        for (let i = 0; i < taps; i++) await this.tap(icon.x, icon.y);
        return;
      }
      case 'number-pad': {
        const digits = String(correct ? body.answer : body.answer + 1);
        for (const d of digits) {
          const key = inBody.find(h => h.label === d);
          if (!key) throw new Error(`digit ${d} missing`);
          await this.tap(key.x, key.y);
        }
        const submit = inBody.find(h => h.label === 'Svar');
        if (!submit) throw new Error('submit missing');
        await this.tap(submit.x, submit.y);
        return;
      }
      case 'pick-image': {
        // Drawn options carry no label, so they are matched by position among the options
        // still on screen — a ruled-out option is no longer drawn.
        const cards = inBody.filter(h => h.label === null && h.w === 128);
        const liveIndexes = (body.options as unknown[])
          .map((_, i) => i)
          .filter(i => !ruledOut.includes(String(i)));
        const position = correct
          ? liveIndexes.indexOf(body.answer)
          : liveIndexes.findIndex(i => i !== body.answer);
        const card = cards[position];
        if (!card) throw new Error(`pick-image card missing at position ${position}`);
        await this.tap(card.x, card.y);
        return;
      }
      case 'put-in-order': {
        const cards = inBody.filter(h => h.rank !== null);
        if (cards.length !== body.items.length) {
          throw new Error(`put-in-order: ${cards.length} cards for ${body.items.length} items`);
        }
        if (!correct) {
          // tapping anything other than rank 0 first is the wrong move
          const wrong = cards.find(h => h.rank !== 0);
          if (!wrong) throw new Error('put-in-order: no wrong card to tap');
          await this.tap(wrong.x, wrong.y);
          return;
        }
        for (const card of [...cards].sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))) {
          await this.tap(card.x, card.y);
        }
        return;
      }
      case 'adjust': {
        // There is no wrong answer here — the dial is either there yet or not — so a
        // "wrong" request is a mistake in the test, not a thing the child can do.
        if (!correct) throw new Error('the adjust template has no wrong answer');
        const steps = Math.round(Math.abs(body.target - body.from) / body.step);
        const glyph = body.target > body.from ? '+' : '−';
        const stepper = inBody.find(h => h.label === glyph);
        if (!stepper) throw new Error(`adjust: no "${glyph}" button`);
        for (let i = 0; i < steps; i++) await this.tap(stepper.x, stepper.y);
        return;
      }
      case 'pattern': {
        // The swatches carry no label, so they have to be matched by position — and the
        // scene stops drawing an option once it has been ruled out, so index into the
        // options still on screen rather than the original list.
        const swatches = inBody.filter(h => h.label === null && h.w === 64);
        const live = (body.options as number[]).filter(o => !ruledOut.includes(String(o)));
        const index = correct
          ? live.indexOf(body.answer)
          : live.findIndex(o => o !== body.answer);
        const target = swatches[index];
        if (!target) {
          throw new Error(
            `pattern swatch missing: wanted ${correct ? 'right' : 'wrong'} at index ${index} ` +
            `of ${live.length} live options, found ${swatches.length} swatches`
          );
        }
        await this.tap(target.x, target.y);
        return;
      }
      default:
        throw new Error(`unknown template ${body.template}`);
    }
  }

  /* ------------------------------------------------------------ helpers --- */

  /** Finds a shop card by the item name printed on it. */
  async shopCard(name: string): Promise<{ x: number; y: number }> {
    const card = await this.page.evaluate((itemName) => {
      const scene = window.__game.scene.getScene('ShopScene') as any;
      const found: any[] = [];
      const walk = (objs: any[], ox: number, oy: number) => {
        for (const o of objs || []) {
          if (!o) continue;
          const x = ox + (o.x || 0);
          const y = oy + (o.y || 0);
          if (o.input && o.input.hitArea?.width === 168) {
            const labels = (o.list || [])
              .filter((c: any) => c.type === 'Text')
              .map((c: any) => c.text);
            if (labels.includes(itemName)) found.push({ x, y });
          }
          if (Array.isArray(o.list)) walk(o.list, x, y);
        }
      };
      walk(scene.children.list, 0, 0);
      return found[0] ?? null;
    }, name);
    if (!card) throw new Error(`shop card not found: ${name}`);
    return card;
  }

  /**
   * A skills seed that makes the picker reach for one skill.
   *
   * The picker prefers the least-practised eligible skill, so everything else is marked
   * well practised. Reading the list from the source rather than restating it means adding
   * a skill to the catalogue cannot silently break a test's assumption about which task
   * will come up.
   */
  static focusSkill(skill: string, level: Level = 1): Record<string, unknown> {
    const skills: Record<string, unknown> = {};
    for (const id of ALL_SKILLS) {
      skills[id] = id === skill
        ? { seen: 0, correct: 0, streak: 0, missed: 0, level }
        : { seen: 50, correct: 50, streak: 0, missed: 0, level: 1 };
    }
    return skills;
  }

  /** Seeds a save before the page loads, to reach a state without grinding for it. */
  static async openWithSave(page: Page, patch: Record<string, unknown>): Promise<Game> {
    const game = new Game(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await Game.installAudioSpy(page);
    await page.addInitScript((seed) => {
      window.localStorage.setItem('sommer-hotellet-save', JSON.stringify(seed));
    }, {
      version: 3,
      stars: 0,
      guests: [],
      rooms: Array.from({ length: 3 }, () => ({
        bedMade: false, curtainsOpen: false, flowersPlaced: false,
        vacuumed: false, towelsFolded: false, guestId: null,
      })),
      kitchen: { recipe: null, added: [], showingDining: false, dishesServed: 0 },
      pool: { towels: [false, false, false, false] },
      garden: { flowers: [false, false, false, false, false], sandcastle: 0, apples: [false, false, false, false, false] },
      nextGuestId: 0,
      owned: [],
      settings: { mode: 'leg', matematik: true, dansk: true, speak: false },
      skills: {},
      ...patch,
    });
    await page.goto('/');
    await game.waitForScene('MainMenuScene');
    return game;
  }

  expectNoErrors(): void {
    expect(this.errors, `page errors: ${this.errors.join(' | ')}`).toEqual([]);
  }
}

declare global {
  interface Window {
    __game: import('phaser').Game;
  }
}

const SCENE_FOR_AREA = {
  lobby: 'LobbyScene',
  rooms: 'RoomScene',
  kitchen: 'KitchenScene',
  pool: 'PoolScene',
  garden: 'GardenScene',
} as const;

/** Game-coordinate click targets, kept next to the scenes they belong to. */
export const AT = {
  playButton: { x: GAME_WIDTH / 2, y: GAME_HEIGHT * 0.86 },
  back: { x: 52, y: 38 },

  map: {
    lobby: { x: GAME_WIDTH / 2, y: GAME_HEIGHT * 0.55 },
    rooms: { x: GAME_WIDTH / 2 - 212, y: GAME_HEIGHT * 0.38 },
    kitchen: { x: GAME_WIDTH / 2 + 212, y: GAME_HEIGHT * 0.38 },
    pool: { x: GAME_WIDTH / 2 - 190, y: GAME_HEIGHT * 0.79 },
    garden: { x: GAME_WIDTH / 2 + 190, y: GAME_HEIGHT * 0.79 },
  },

  room: {
    bed: { x: GAME_WIDTH / 2 - 40, y: GAME_HEIGHT * 0.57 },
    window: { x: GAME_WIDTH - 132, y: GAME_HEIGHT * 0.33 },
    vase: { x: 126, y: GAME_HEIGHT * 0.52 },
    towels: { x: GAME_WIDTH / 2 + 212, y: GAME_HEIGHT * 0.6 },
    vacuum: { x: GAME_WIDTH - 176, y: GAME_HEIGHT * 0.85 },
    tab2: { x: GAME_WIDTH / 2, y: 38 },
  },

  kitchen: {
    toggle: { x: 190, y: 38 },
    recipe1: { x: 168, y: 132 },
    ingredient1: { x: GAME_WIDTH / 2 - 208, y: GAME_HEIGHT * 0.82 },
    ingredient2: { x: GAME_WIDTH / 2, y: GAME_HEIGHT * 0.82 },
    ingredient3: { x: GAME_WIDTH / 2 + 208, y: GAME_HEIGHT * 0.82 },
  },

  pool: {
    lounger1: { x: 92, y: GAME_HEIGHT * 0.5 },
    lounger2: { x: 92, y: GAME_HEIGHT * 0.73 },
  },

  garden: {
    wateringCan: { x: 190, y: GAME_HEIGHT * 0.86 },
    sandbox: { x: GAME_WIDTH * 0.5, y: GAME_HEIGHT * 0.78 },
  },

  lobby: {
    bell: { x: GAME_WIDTH / 2 + 108, y: GAME_HEIGHT * 0.615 },
    guest1: { x: 150, y: GAME_HEIGHT * 0.72 },
  },

  shop: { x: GAME_WIDTH - 74, y: 84 },
  settings: { x: 52, y: 84 },
  settingsModeLaer: { x: GAME_WIDTH / 2 + 158, y: 158 },
  settingsModeLeg: { x: GAME_WIDTH / 2 - 158, y: 158 },

  // the toggle grid, laid out 2x2
  toggleMath: { x: GAME_WIDTH / 2 - 134, y: 250 },
  toggleDansk: { x: GAME_WIDTH / 2 + 134, y: 250 },
  toggleSound: { x: GAME_WIDTH / 2 - 134, y: 306 },
  toggleSpeak: { x: GAME_WIDTH / 2 + 134, y: 306 },
} as const;
