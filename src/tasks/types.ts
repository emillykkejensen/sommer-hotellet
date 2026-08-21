import { Area } from '../state/Shop';

export type Subject = 'matematik' | 'dansk';

export type SkillId =
  | 'tælling'
  | 'talgenkendelse'
  | 'plus'
  | 'minus'
  | 'mønstre'
  | 'bogstavlyd'
  | 'rim'
  | 'ordlæsning';

export type Level = 1 | 2 | 3;

export const SKILLS: Record<SkillId, { subject: Subject; label: string }> = {
  tælling:        { subject: 'matematik', label: 'At tælle' },
  talgenkendelse: { subject: 'matematik', label: 'Tal-genkendelse' },
  plus:           { subject: 'matematik', label: 'Plus' },
  minus:          { subject: 'matematik', label: 'Minus' },
  mønstre:        { subject: 'matematik', label: 'Mønstre' },
  bogstavlyd:     { subject: 'dansk',     label: 'Bogstavlyd' },
  rim:            { subject: 'dansk',     label: 'Rim' },
  ordlæsning:     { subject: 'dansk',     label: 'At læse ord' },
};

export const ALL_SKILLS = Object.keys(SKILLS) as SkillId[];

/** The little pictures a counting task can ask the child to tap. */
export type IconKind = 'pancake' | 'apple' | 'towel' | 'flower' | 'key' | 'carrot' | 'cup';

export type TaskBody =
  /** Tap the icon exactly `target` times. */
  | { template: 'count-taps'; target: number; icon: IconKind }
  /** Pick the one right answer out of a few. */
  | { template: 'pick-one'; options: string[]; answer: string; big?: boolean }
  /** Tap digits to build the answer. */
  | { template: 'number-pad'; answer: number }
  /** Tap the swatch that continues the pattern. */
  | { template: 'pattern'; sequence: number[]; options: number[]; answer: number };

export interface Task {
  skill: SkillId;
  subject: Subject;
  level: Level;
  /** Shown on screen and spoken aloud. Written in-world, never as a worksheet. */
  prompt: string;
  /** Optional shorter line spoken instead of the prompt, when the prompt reads long. */
  spoken?: string;
  body: TaskBody;
  /** Stars paid for a correct answer. */
  reward: number;
}

export interface TaskFactory {
  skill: SkillId;
  level: Level;
  /** Which scenes this task makes sense in. */
  areas: Area[];
  make: () => Task;
}
