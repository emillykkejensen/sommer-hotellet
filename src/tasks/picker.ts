import Phaser from 'phaser';
import { gameState } from '../state/GameState';
import { Area } from '../state/Shop';
import { FACTORIES } from './content';
import { SKILLS, SkillId, Task, TaskFactory } from './types';

function subjectEnabled(factory: TaskFactory): boolean {
  const subject = SKILLS[factory.skill].subject;
  if (subject === 'matematik') return gameState.settings.matematik;
  return gameState.settings.dansk;
}

/**
 * Picks the next task for a scene.
 *
 * Prefers the least-practised eligible skill, then the factory closest to that skill's
 * current level — so the child stays in the band where they mostly succeed.
 *
 * The level match is deliberately "closest at or below" rather than exact. Not every skill
 * has a factory for every level in every area (rhyming starts in the rooms, but its harder
 * variant also fits the garden), and demanding an exact match left those skills permanently
 * unreachable in some scenes.
 */
export function nextTask(area: Area): Task | null {
  const inArea = FACTORIES.filter(f => f.areas.includes(area) && subjectEnabled(f));
  if (inArea.length === 0) return null;

  const bySkill = new Map<SkillId, TaskFactory[]>();
  for (const factory of inArea) {
    const list = bySkill.get(factory.skill);
    if (list) list.push(factory);
    else bySkill.set(factory.skill, [factory]);
  }

  const candidates: TaskFactory[] = [];
  for (const [skill, factories] of bySkill) {
    const want = gameState.progressFor(skill).level;
    const atOrBelow = factories
      .filter(f => f.level <= want)
      .sort((a, b) => b.level - a.level);
    const chosen = atOrBelow[0] ?? [...factories].sort((a, b) => a.level - b.level)[0];
    candidates.push(chosen);
  }

  const fewestSeen = Math.min(...candidates.map(f => gameState.progressFor(f.skill).seen));
  const leastPractised = candidates.filter(f => gameState.progressFor(f.skill).seen === fewestSeen);

  return Phaser.Utils.Array.GetRandom(leastPractised).make();
}

/** Human-readable skill name, for the grown-up screen. */
export function skillLabel(skill: string): string {
  return SKILLS[skill as SkillId]?.label ?? skill;
}
