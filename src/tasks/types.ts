import { Area } from '../state/Shop';

export type Subject = 'matematik' | 'dansk';

export type SkillId =
  // matematik
  | 'tælling'
  | 'talgenkendelse'
  | 'plus'
  | 'minus'
  | 'fordobling'
  | 'deling'
  | 'brøker'
  | 'mønstre'
  | 'figurer'
  | 'sortering'
  | 'klokken'
  | 'tallinje'
  // dansk
  | 'bogstavlyd'
  | 'rim'
  | 'ordlæsning'
  | 'stavelser'
  | 'alfabet'
  | 'forlyd'
  | 'bogstavform';

export type Level = 1 | 2 | 3;

export const SKILLS: Record<SkillId, { subject: Subject; label: string }> = {
  'tælling':        { subject: 'matematik', label: 'At tælle' },
  'talgenkendelse': { subject: 'matematik', label: 'Tal-genkendelse' },
  'plus':           { subject: 'matematik', label: 'Plus' },
  'minus':          { subject: 'matematik', label: 'Minus' },
  'fordobling':     { subject: 'matematik', label: 'Dobbelt så mange' },
  'deling':         { subject: 'matematik', label: 'Deling' },
  'brøker':         { subject: 'matematik', label: 'Halve og kvarte' },
  'mønstre':        { subject: 'matematik', label: 'Mønstre' },
  'figurer':        { subject: 'matematik', label: 'Figurer' },
  'sortering':      { subject: 'matematik', label: 'Størrelse' },
  'klokken':        { subject: 'matematik', label: 'Klokken' },
  'tallinje':       { subject: 'matematik', label: 'Tallinje' },
  'bogstavlyd':     { subject: 'dansk',     label: 'Bogstavlyd' },
  'rim':            { subject: 'dansk',     label: 'Rim' },
  'ordlæsning':     { subject: 'dansk',     label: 'At læse ord' },
  'stavelser':      { subject: 'dansk',     label: 'Stavelser' },
  'alfabet':        { subject: 'dansk',     label: 'Alfabetisk orden' },
  'forlyd':         { subject: 'dansk',     label: 'Forlyd' },
  'bogstavform':    { subject: 'dansk',     label: 'Store og små bogstaver' },
};

export const ALL_SKILLS = Object.keys(SKILLS) as SkillId[];

/** The little pictures a counting task can ask the child to tap. */
export type IconKind =
  | 'pancake' | 'apple' | 'towel' | 'flower' | 'key' | 'carrot' | 'cup' | 'clap';

/**
 * Something drawn as an answer option, rather than written.
 *
 * Shapes, fractions and clock faces cannot be words without giving the answer away, so
 * they are described here and drawn by the overlay.
 */
export type Figure =
  | { kind: 'shape'; shape: 'cirkel' | 'firkant' | 'trekant' | 'rektangel' }
  /** A round cake cut into `slices` equal pieces, `left` of them still there. */
  | { kind: 'cake'; slices: number; left?: number }
  /** An analog clock. A fractional hour puts the minute hand on the half. */
  | { kind: 'clock'; hour: number }
  | { kind: 'towel'; size: 1 | 2 | 3 }
  | { kind: 'letter'; text: string };

export type TaskBody =
  /** Tap the icon exactly `target` times. */
  | { template: 'count-taps'; target: number; icon: IconKind }
  /** Pick the one right answer out of a few written options. */
  | { template: 'pick-one'; options: string[]; answer: string; big?: boolean }
  /** Tap digits to build the answer. */
  | { template: 'number-pad'; answer: number }
  /** Tap the swatch that continues the pattern. */
  | { template: 'pattern'; sequence: number[]; options: number[]; answer: number }
  /** Pick the right drawn option. Options arrive pre-shuffled. */
  | { template: 'pick-image'; options: Figure[]; answer: number }
  /** Tap the items in order. `rank` 0 first; the overlay shuffles them on screen. */
  | { template: 'put-in-order'; items: { rank: number; figure: Figure }[]; hint: string }
  /**
   * Turn a dial up or down until it reads `target`.
   *
   * Covers a pool thermometer and a clock with one mechanic: both are "move a number to
   * where it should be", which is a number line the child can feel.
   */
  | {
      template: 'adjust';
      dial: 'thermometer' | 'clock';
      from: number;
      target: number;
      min: number;
      max: number;
      step: number;
      unit?: string;
    };

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
