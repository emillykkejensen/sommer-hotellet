import { test, expect } from '@playwright/test';
import { AT, Game } from './game';

/**
 * The task factories are plain data generators, so the Vite dev server can hand them to
 * the page directly. The specifier goes through a variable so TypeScript treats it as a
 * runtime URL rather than a module it should resolve at build time.
 */
const CONTENT = '/src/tasks/content.ts';
const TYPES = '/src/tasks/types.ts';
const FIGURES = '/src/tasks/figures.ts';

/**
 * Generator-level checks over the whole task catalogue.
 *
 * Driving 45 factories through the UI would take twenty minutes; the factories are pure
 * data generators, so the dev server can hand them over and every one can be exercised
 * hundreds of times in a second. This is what catches an unanswerable task — a number
 * whose digits are not on the pad, an answer missing from its own options.
 */
test('every factory generates a well-formed, answerable task', async ({ page }) => {
  const game = await Game.open(page);

  const report = await page.evaluate(async (contentUrl) => {
    const mod: any = await import(/* @vite-ignore */ contentUrl);
    const factories = mod.FACTORIES;
    const problems: string[] = [];
    const templates = new Set<string>();
    const skills = new Set<string>();

    const bad = (where: string, why: string) => problems.push(`${where}: ${why}`);

    for (const factory of factories) {
      const where = `${factory.skill} L${factory.level}`;
      skills.add(factory.skill);

      if (!Array.isArray(factory.areas) || factory.areas.length === 0) {
        bad(where, 'no areas — it can never be picked');
      }

      for (let round = 0; round < 60; round++) {
        const t = factory.make();
        const b = t.body;
        templates.add(b.template);

        if (t.skill !== factory.skill) bad(where, 'skill does not match its factory');
        if (t.level !== factory.level) bad(where, 'level does not match its factory');
        if (!t.prompt || t.prompt.trim().length < 8) bad(where, 'prompt is missing or too short');
        if (/undefined|NaN|\[object/.test(t.prompt)) bad(where, `prompt reads "${t.prompt}"`);
        if (!(t.reward >= 1)) bad(where, 'reward below one star');

        switch (b.template) {
          case 'pick-one': {
            if (b.options.length < 2) bad(where, 'fewer than two options');
            if (!b.options.includes(b.answer)) bad(where, 'the answer is not among the options');
            if (new Set(b.options).size !== b.options.length) bad(where, 'duplicate options');
            if (b.options.some((o: string) => !o || !o.trim())) bad(where, 'blank option');
            break;
          }
          case 'pick-image': {
            if (b.options.length < 2) bad(where, 'fewer than two options');
            if (b.answer < 0 || b.answer >= b.options.length) bad(where, 'answer index out of range');
            // two identical drawings would make the task ambiguous
            const drawn = b.options.map((f: unknown) => JSON.stringify(f));
            if (new Set(drawn).size !== drawn.length) bad(where, 'two options draw the same thing');
            break;
          }
          case 'number-pad': {
            if (!Number.isInteger(b.answer)) bad(where, `answer ${b.answer} is not a whole number`);
            if (b.answer < 0) bad(where, `answer ${b.answer} is negative`);
            // the display holds three digits and the pad only has 0-9
            if (String(b.answer).length > 3) bad(where, `answer ${b.answer} is too long to type`);
            break;
          }
          case 'count-taps': {
            if (!Number.isInteger(b.target) || b.target < 1) bad(where, `target ${b.target} invalid`);
            if (b.target > 10) bad(where, `target ${b.target} needs more pips than fit`);
            break;
          }
          case 'pattern': {
            if (b.sequence.length < 3) bad(where, 'sequence too short to show a pattern');
            if (!b.options.includes(b.answer)) bad(where, 'the answer is not among the options');
            if (new Set(b.options).size !== b.options.length) bad(where, 'duplicate options');
            break;
          }
          case 'put-in-order': {
            const ranks = b.items.map((i: any) => i.rank).sort((x: number, y: number) => x - y);
            const expected = b.items.map((_: unknown, i: number) => i);
            if (b.items.length < 2) bad(where, 'fewer than two items to order');
            if (JSON.stringify(ranks) !== JSON.stringify(expected)) {
              bad(where, `ranks are ${JSON.stringify(ranks)}, expected ${JSON.stringify(expected)}`);
            }
            const drawn = b.items.map((i: any) => JSON.stringify(i.figure));
            if (new Set(drawn).size !== drawn.length) bad(where, 'two items draw the same thing');
            if (!b.hint) bad(where, 'no hint about which way to order');
            break;
          }
          case 'adjust': {
            if (!(b.min < b.max)) bad(where, 'empty range');
            if (b.step <= 0) bad(where, 'non-positive step');
            if (b.from < b.min || b.from > b.max) bad(where, `start ${b.from} outside the range`);
            if (b.target < b.min || b.target > b.max) bad(where, `target ${b.target} outside the range`);
            if (b.from === b.target) bad(where, 'starts on the answer, so there is nothing to do');
            const distance = Math.abs(b.target - b.from);
            const steps = distance / b.step;
            if (Math.abs(steps - Math.round(steps)) > 1e-9) {
              bad(where, `target is ${distance} away, which is not a whole number of ${b.step} steps`);
            }
            if (Math.round(steps) > 12) bad(where, `${Math.round(steps)} taps is too many`);
            break;
          }
          default:
            bad(where, `unknown template "${(b as any).template}"`);
        }
      }
    }

    return {
      factories: factories.length,
      skills: [...skills].sort(),
      templates: [...templates].sort(),
      problems: [...new Set(problems)],
    };
  }, CONTENT);

  console.log(`${report.factories} factories, ${report.skills.length} skills, templates: ${report.templates.join(', ')}`);
  expect(report.problems, 'generated tasks must all be answerable').toEqual([]);
  expect(report.factories).toBeGreaterThanOrEqual(45);
  game.expectNoErrors();
});

test('every skill is reachable in at least one scene', async ({ page }) => {
  await Game.open(page);

  const unreachable = await page.evaluate(async ([contentUrl, typesUrl]) => {
    const content: any = await import(/* @vite-ignore */ contentUrl);
    const types: any = await import(/* @vite-ignore */ typesUrl);

    const areas = ['lobby', 'rooms', 'kitchen', 'pool', 'garden'];
    const missing: string[] = [];

    for (const skill of types.ALL_SKILLS) {
      const factories = content.FACTORIES.filter((f: any) => f.skill === skill);
      if (factories.length === 0) {
        missing.push(`${skill}: no factory at all`);
        continue;
      }
      // level 1 has to exist somewhere, or a fresh child can never start the skill
      if (!factories.some((f: any) => f.level === 1)) {
        missing.push(`${skill}: no level 1`);
      }
      const covered = new Set<string>(factories.flatMap((f: any) => f.areas as string[]));
      if (![...covered].some(a => areas.includes(a))) {
        missing.push(`${skill}: not offered in any real scene`);
      }
    }
    return missing;
  }, [CONTENT, TYPES] as const);

  expect(unreachable, 'every skill needs a way in').toEqual([]);
});

test('the new templates can each be solved in the game', async ({ page }) => {
  // Force one skill at a time so a known template comes up.
  const cases = [
    { skill: 'figurer', area: 'garden' as const, tap: AT.garden.sandbox, template: 'pick-image' },
    { skill: 'sortering', area: 'pool' as const, tap: AT.pool.lounger1, template: 'put-in-order' },
    { skill: 'tallinje', area: 'pool' as const, tap: AT.pool.lounger2, template: 'adjust' },
  ];

  for (const c of cases) {
    const game = await Game.openWithSave(page, {
      settings: { mode: 'laer', matematik: true, dansk: true, speak: false, sound: false },
      skills: Game.focusSkill(c.skill),
    });
    await game.start();
    await game.enter(c.area);
    await game.tap(c.tap.x, c.tap.y);

    expect(await game.waitForTask(), `${c.skill} should raise a task`).toBe(true);
    const solved = await game.solveTask();
    expect(solved.template, `${c.skill} should use the ${c.template} template`).toBe(c.template);
    expect(solved.skill).toBe(c.skill);
    game.expectNoErrors();
  }
});

test('reading tasks show pictures, not the same word twice', async ({ page }) => {
  const game = await Game.openWithSave(page, {
    settings: { mode: 'laer', matematik: false, dansk: true, speak: false, sound: false, music: false },
    skills: Game.focusSkill('ordlæsning'),
  });
  await game.start();
  await game.enter('kitchen');

  // selecting a recipe and adding an ingredient is the kitchen's reward action
  await game.tap(AT.kitchen.recipe1.x, AT.kitchen.recipe1.y);
  await game.tap(AT.kitchen.ingredient1.x, AT.kitchen.ingredient1.y);

  expect(await game.waitForTask(), 'a reading task should appear').toBe(true);
  const solved = await game.solveTask();
  expect(solved.skill).toBe('ordlæsning');
  expect(solved.template, 'level 1 reads a word and picks the picture').toBe('pick-image');
  game.expectNoErrors();
});

test('every drawable noun renders and can be asked for', async ({ page }) => {
  const game = await Game.open(page);

  const report = await page.evaluate(async ([figuresUrl, contentUrl]) => {
    const figures: any = await import(/* @vite-ignore */ figuresUrl);
    const content: any = await import(/* @vite-ignore */ contentUrl);
    const nouns: string[] = [...figures.DRAWABLE_NOUNS];

    // every noun a reading task can name must have a drawing
    const scene = window.__game.scene.getScenes(true)[0] as any;
    const undrawable: string[] = [];
    for (const noun of nouns) {
      try {
        const container = figures.drawFigure(scene, { kind: 'noun', noun });
        if (!container || container.list.length === 0) undrawable.push(noun);
        container?.destroy();
      } catch (e) {
        undrawable.push(`${noun} (${(e as Error).message})`);
      }
    }

    // and the reading factory must only ever name nouns from that list
    const offList: string[] = [];
    const reading = content.FACTORIES.filter(
      (f: any) => f.skill === 'ordlæsning' && f.level === 1
    );
    for (const factory of reading) {
      for (let i = 0; i < 60; i++) {
        const task = factory.make();
        for (const option of task.body.options ?? []) {
          if (option.kind === 'noun' && !nouns.includes(option.noun)) offList.push(option.noun);
        }
      }
    }

    return { nouns, undrawable, offList: [...new Set(offList)] };
  }, [FIGURES, CONTENT] as const);

  expect(report.undrawable, 'every noun needs a drawing').toEqual([]);
  expect(report.offList, 'a reading task must not name a noun it cannot draw').toEqual([]);
  expect(report.nouns.length, 'the reading vocabulary').toBeGreaterThanOrEqual(16);
  game.expectNoErrors();
});
