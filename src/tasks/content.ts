import Phaser from 'phaser';
import { SKILLS, SkillId, Task, TaskFactory } from './types';

/**
 * Tasks are generated rather than listed, so a child never runs out and never sees the
 * same numbers twice in a row. Each factory owns one skill at one level.
 */

const pick = <T>(arr: readonly T[]): T => Phaser.Utils.Array.GetRandom(arr as T[]);
const between = (min: number, max: number) => Phaser.Math.Between(min, max);

/** Shuffles, then guarantees the answer is present. */
function options(answer: string, distractors: string[], count = 3): string[] {
  const opts = [answer, ...distractors.filter(d => d !== answer)].slice(0, count);
  return Phaser.Utils.Array.Shuffle(opts);
}

function numberOptions(answer: number, spread = 3): string[] {
  const set = new Set<string>([String(answer)]);
  let guard = 0;
  while (set.size < 3 && guard++ < 40) {
    const candidate = answer + between(-spread, spread);
    if (candidate >= 0) set.add(String(candidate));
  }
  return Phaser.Utils.Array.Shuffle([...set]);
}

const task = (skill: SkillId, level: 1 | 2 | 3, prompt: string, body: Task['body'], reward = 2): Task => ({
  skill,
  subject: SKILLS[skill].subject,
  level,
  prompt,
  body,
  reward,
});

/* ------------------------------------------------------------- matematik --- */

const GUESTS = ['Fru Hansen', 'Hr. Jensen', 'Familien Møller', 'Lille Sofia', 'Hr. Andersen'];

const countingFactories: TaskFactory[] = [
  {
    skill: 'tælling', level: 1, areas: ['kitchen', 'garden', 'pool'],
    make: () => {
      const n = between(2, 5);
      const [icon, thing] = pick([
        ['pancake', 'pandekager'], ['apple', 'æbler'], ['carrot', 'gulerødder'],
      ] as const);
      return task('tælling', 1,
        `${pick(GUESTS)} vil have ${n} ${thing}. Tryk ${n} gange.`,
        { template: 'count-taps', target: n, icon });
    },
  },
  {
    skill: 'tælling', level: 2, areas: ['kitchen', 'garden', 'pool'],
    make: () => {
      const n = between(6, 9);
      const [icon, thing] = pick([
        ['apple', 'æbler'], ['towel', 'håndklæder'], ['flower', 'blomster'],
      ] as const);
      return task('tælling', 2,
        `Vi skal have ${n} ${thing} klar. Tryk ${n} gange.`,
        { template: 'count-taps', target: n, icon });
    },
  },
  {
    skill: 'tælling', level: 3, areas: ['kitchen', 'garden'],
    make: () => {
      const per = between(2, 4);
      const groups = between(2, 3);
      return task('tælling', 3,
        `${groups} borde skal have ${per} kopper hver. Hvor mange kopper i alt?`,
        { template: 'number-pad', answer: per * groups }, 3);
    },
  },
];

const numberFactories: TaskFactory[] = [
  {
    skill: 'talgenkendelse', level: 1, areas: ['lobby', 'rooms'],
    make: () => {
      const n = between(1, 3);
      return task('talgenkendelse', 1,
        `Gæsten skal bo på værelse ${n}. Tryk på nøglen med ${n}.`,
        { template: 'pick-one', options: options(String(n), ['1', '2', '3']), answer: String(n), big: true });
    },
  },
  {
    skill: 'talgenkendelse', level: 2, areas: ['lobby', 'rooms'],
    make: () => {
      const n = between(4, 10);
      return task('talgenkendelse', 2,
        `Der kommer ${n} gæster. Tryk på tallet ${n}.`,
        { template: 'pick-one', options: numberOptions(n, 2), answer: String(n), big: true });
    },
  },
  {
    skill: 'plus', level: 1, areas: ['lobby', 'kitchen'],
    make: () => {
      const a = between(1, 3);
      const b = between(1, 3);
      return task('plus', 1,
        `Der kommer ${a} voksne og ${b} børn. Hvor mange nøgler skal du hente?`,
        { template: 'pick-one', options: numberOptions(a + b, 2), answer: String(a + b), big: true });
    },
  },
  {
    skill: 'plus', level: 2, areas: ['lobby', 'kitchen', 'pool'],
    make: () => {
      const a = between(2, 7);
      const b = between(1, 10 - a);
      return task('plus', 2,
        `Vi har dækket ${a} borde, og nu ${b} mere. Hvor mange i alt?`,
        { template: 'number-pad', answer: a + b }, 3);
    },
  },
  {
    skill: 'plus', level: 3, areas: ['kitchen', 'pool'],
    make: () => {
      const a = between(5, 12);
      const b = between(3, 8);
      return task('plus', 3,
        `Der var ${a} gæster til morgenmad og ${b} kom senere. Hvor mange spiste der?`,
        { template: 'number-pad', answer: a + b }, 3);
    },
  },
  {
    skill: 'minus', level: 1, areas: ['lobby', 'rooms'],
    make: () => {
      const a = between(3, 5);
      const b = between(1, a - 1);
      return task('minus', 1,
        `Der var ${a} gæster, og ${b} rejste hjem. Hvor mange er tilbage?`,
        { template: 'pick-one', options: numberOptions(a - b, 2), answer: String(a - b), big: true });
    },
  },
  {
    skill: 'minus', level: 2, areas: ['lobby', 'rooms', 'kitchen'],
    make: () => {
      const a = between(6, 12);
      const b = between(2, a - 1);
      return task('minus', 2,
        `Vi bagte ${a} boller, og gæsterne spiste ${b}. Hvor mange er der nu?`,
        { template: 'number-pad', answer: a - b }, 3);
    },
  },
  {
    skill: 'minus', level: 3, areas: ['lobby', 'kitchen'],
    make: () => {
      const price = between(3, 9) * 5;
      const paid = price + between(1, 4) * 5;
      return task('minus', 3,
        `Værelset koster ${price} kroner. Gæsten giver dig ${paid}. Hvor meget skal du give tilbage?`,
        { template: 'number-pad', answer: paid - price }, 4);
    },
  },
];

const patternFactories: TaskFactory[] = [
  {
    skill: 'mønstre', level: 1, areas: ['garden', 'rooms'],
    make: () => {
      const [a, b] = Phaser.Utils.Array.Shuffle([0, 1, 2, 3]).slice(0, 2);
      const seq = [a, b, a, b, a];
      return task('mønstre', 1,
        'Blomsterne står i et mønster. Hvilken farve mangler?',
        { template: 'pattern', sequence: seq, options: Phaser.Utils.Array.Shuffle([b, a, 2, 3].slice(0, 3)), answer: b });
    },
  },
  {
    skill: 'mønstre', level: 2, areas: ['garden', 'rooms'],
    make: () => {
      const [a, b, c] = Phaser.Utils.Array.Shuffle([0, 1, 2, 3]).slice(0, 3);
      const seq = [a, a, b, a, a];
      return task('mønstre', 2,
        'Hvilken farve kommer nu i mønstret?',
        { template: 'pattern', sequence: seq, options: Phaser.Utils.Array.Shuffle([b, a, c]), answer: b });
    },
  },
  {
    skill: 'mønstre', level: 3, areas: ['garden'],
    make: () => {
      const start = between(1, 3);
      const step = between(2, 3);
      const seq = [start, start + step, start + step * 2];
      return task('mønstre', 3,
        `Vi planter ${seq.join(', ')} … hvor mange i næste række?`,
        { template: 'number-pad', answer: start + step * 3 }, 3);
    },
  },
];

/* ----------------------------------------------------------------- dansk --- */

const LETTER_WORDS: Record<string, string[]> = {
  S: ['sol', 'sok', 'sæbe', 'sand'],
  M: ['mad', 'mælk', 'mus', 'måne'],
  B: ['bil', 'bog', 'bord', 'ballon'],
  K: ['kat', 'kop', 'kage', 'ko'],
  H: ['hus', 'hat', 'hånd', 'hest'],
  T: ['tog', 'tomat', 'tand', 'te'],
  F: ['fisk', 'fod', 'fugl', 'far'],
  L: ['lys', 'lampe', 'løg', 'let'],
};
const LETTERS = Object.keys(LETTER_WORDS);

const RHYMES: [string, string, string[]][] = [
  ['hat', 'kat', ['sol', 'bil', 'mus']],
  ['hus', 'mus', ['tog', 'kat', 'bog']],
  ['sol', 'bol', ['fisk', 'hat', 'ko']],
  ['bog', 'tog', ['sæbe', 'mus', 'hat']],
  ['mand', 'sand', ['kop', 'lys', 'bil']],
  ['kage', 'lage', ['fisk', 'sol', 'tand']],
];

const danskFactories: TaskFactory[] = [
  {
    skill: 'bogstavlyd', level: 1, areas: ['lobby', 'rooms'],
    make: () => {
      const letter = pick(LETTERS);
      const word = pick(LETTER_WORDS[letter]);
      const others = Phaser.Utils.Array.Shuffle(LETTERS.filter(l => l !== letter)).slice(0, 2);
      return task('bogstavlyd', 1,
        `Hvilket bogstav starter "${word}" med?`,
        { template: 'pick-one', options: options(letter, others), answer: letter, big: true });
    },
  },
  {
    skill: 'bogstavlyd', level: 2, areas: ['kitchen', 'pool', 'garden'],
    make: () => {
      const letter = pick(LETTERS);
      const word = pick(LETTER_WORDS[letter]);
      const others = Phaser.Utils.Array.Shuffle(LETTERS.filter(l => l !== letter))
        .slice(0, 2)
        .map(l => pick(LETTER_WORDS[l]));
      return task('bogstavlyd', 2,
        `Hvilket ord starter med ${letter}?`,
        { template: 'pick-one', options: options(word, others), answer: word });
    },
  },
  {
    skill: 'bogstavlyd', level: 3, areas: ['kitchen', 'garden'],
    make: () => {
      const letter = pick(LETTERS);
      const word = pick(LETTER_WORDS[letter]);
      const last = word[word.length - 1].toUpperCase();
      const others = Phaser.Utils.Array.Shuffle(LETTERS.filter(l => l !== last)).slice(0, 2);
      return task('bogstavlyd', 3,
        `Hvilket bogstav slutter "${word}" med?`,
        { template: 'pick-one', options: options(last, others), answer: last, big: true }, 3);
    },
  },
  {
    skill: 'rim', level: 1, areas: ['rooms', 'lobby'],
    make: () => {
      const [word, rhyme, others] = pick(RHYMES);
      return task('rim', 1,
        `Gæsten har mistet sin ${word}. Hvad rimer på "${word}"?`,
        { template: 'pick-one', options: options(rhyme, others), answer: rhyme });
    },
  },
  {
    skill: 'rim', level: 2, areas: ['rooms', 'garden'],
    make: () => {
      const [word, rhyme, others] = pick(RHYMES);
      return task('rim', 2,
        `Find ordet der IKKE rimer på "${word}".`,
        { template: 'pick-one', options: options(others[0], [rhyme, word]), answer: others[0] }, 3);
    },
  },
  {
    skill: 'ordlæsning', level: 1, areas: ['kitchen', 'pool'],
    make: () => {
      const letter = pick(LETTERS);
      const word = pick(LETTER_WORDS[letter]);
      const others = Phaser.Utils.Array.Shuffle(LETTERS.filter(l => l !== letter))
        .slice(0, 2)
        .map(l => pick(LETTER_WORDS[l]));
      // Level 1 is word *matching* — the word is on show and the child finds it again.
      // Level 2 below is real reading: the answer is only findable by reading the sentence.
      return task('ordlæsning', 1,
        `Find ordet "${word}" på indkøbssedlen.`,
        { template: 'pick-one', options: options(word, others), answer: word });
    },
  },
  {
    skill: 'ordlæsning', level: 2, areas: ['kitchen', 'rooms'],
    make: () => {
      const pairs: [string, string][] = [
        ['Jeg vil gerne have en is.', 'is'],
        ['Må jeg få et glas mælk?', 'mælk'],
        ['Vi mangler en pude.', 'pude'],
        ['Kan jeg få lidt mad?', 'mad'],
        ['Jeg leder efter min hat.', 'hat'],
      ];
      const [sentence, answer] = pick(pairs);
      const others = Phaser.Utils.Array.Shuffle(['sok', 'bog', 'tog', 'kat', 'sol'].filter(w => w !== answer)).slice(0, 2);
      return task('ordlæsning', 2,
        `Gæsten skriver: "${sentence}" Hvad skal du hente?`,
        { template: 'pick-one', options: options(answer, others), answer }, 3);
    },
  },
];

export const FACTORIES: TaskFactory[] = [
  ...countingFactories,
  ...numberFactories,
  ...patternFactories,
  ...danskFactories,
];
