import Phaser from 'phaser';
import { DRAWABLE_NOUNS } from './figures';
import { Figure, SKILLS, SkillId, Task, TaskFactory } from './types';

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

/** Shuffles drawn options and reports where the right one landed. */
function figureOptions(answer: Figure, distractors: Figure[]): { options: Figure[]; answer: number } {
  const options = Phaser.Utils.Array.Shuffle([answer, ...distractors]);
  return { options, answer: options.indexOf(answer) };
}

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
    skill: 'talgenkendelse', level: 2, areas: ['lobby', 'rooms', 'boutique'],
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
      // Three distinct colours. Building the options as [b, a, 2, 3].slice(0, 3) used to
      // repeat a colour whenever a or b happened to be 2, which put two identical swatches
      // on screen — both counted as correct, which teaches nothing.
      const [a, b, c] = Phaser.Utils.Array.Shuffle([0, 1, 2, 3]).slice(0, 3);
      const seq = [a, b, a, b, a];
      return task('mønstre', 1,
        'Blomsterne står i et mønster. Hvilken farve mangler?',
        { template: 'pattern', sequence: seq, options: Phaser.Utils.Array.Shuffle([a, b, c]), answer: b });
    },
  },
  {
    skill: 'mønstre', level: 2, areas: ['garden', 'rooms', 'boutique'],
    make: () => {
      const [a, b, c] = Phaser.Utils.Array.Shuffle([0, 1, 2, 3]).slice(0, 3);
      const seq = [a, a, b, a, a];
      return task('mønstre', 2,
        'Hvilken farve kommer nu i mønstret?',
        { template: 'pattern', sequence: seq, options: Phaser.Utils.Array.Shuffle([b, a, c]), answer: b });
    },
  },
  {
    // Was the garden's, back when the garden asked questions. Nobody stays in the garden,
    // so nothing there pays or asks any more; towels are folded in the rooms and laid out
    // at the pool, so it lives there now.
    skill: 'mønstre', level: 3, areas: ['rooms', 'pool'],
    make: () => {
      const start = between(1, 3);
      const step = between(2, 3);
      const seq = [start, start + step, start + step * 2];
      return task('mønstre', 3,
        `Vi folder ${seq.join(', ')} håndklæder … hvor mange i næste stak?`,
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
    skill: 'bogstavlyd', level: 1, areas: ['lobby', 'rooms', 'boutique'],
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
    skill: 'bogstavlyd', level: 2, areas: ['kitchen', 'pool', 'garden', 'boutique'],
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
    skill: 'rim', level: 1, areas: ['rooms', 'lobby', 'boutique'],
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
    skill: 'ordlæsning', level: 1, areas: ['kitchen', 'pool', 'rooms', 'boutique'],
    make: () => {
      // Word to *picture*. Matching a written word against the same written word only
      // tests visual discrimination; reading it and finding the thing is the real skill.
      const [answer, ...rest] = Phaser.Utils.Array.Shuffle([...DRAWABLE_NOUNS]);
      const { options, answer: index } = figureOptions(
        { kind: 'noun', noun: answer },
        rest.slice(0, 2).map(n => ({ kind: 'noun', noun: n }) as Figure)
      );
      return task('ordlæsning', 1,
        `Gæsten har skrevet "${answer}". Tryk på billedet.`,
        { template: 'pick-image', options, answer: index });
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

/* --------------------------------------------------- doubling and sharing --- */

const shareFactories: TaskFactory[] = [
  {
    skill: 'fordobling', level: 1, areas: ['kitchen', 'pool'],
    make: () => {
      const n = between(1, 5);
      return task('fordobling', 1,
        `Der kommer dobbelt så mange gæster som i går. I går var der ${n}. Hvor mange i dag?`,
        { template: 'pick-one', options: numberOptions(n * 2, 2), answer: String(n * 2), big: true });
    },
  },
  {
    skill: 'fordobling', level: 2, areas: ['kitchen', 'pool'],
    make: () => {
      const n = between(4, 12);
      return task('fordobling', 2,
        `Opskriften er til ${n} personer. Vi skal lave dobbelt så meget. Til hvor mange?`,
        { template: 'number-pad', answer: n * 2 }, 3);
    },
  },
  {
    skill: 'deling', level: 1, areas: ['kitchen'],
    make: () => {
      const each = between(1, 3);
      const guests = between(2, 3);
      return task('deling', 1,
        `${guests} gæster skal have lige mange pandekager. Der er ${each * guests}. Hvor mange får hver?`,
        { template: 'pick-one', options: numberOptions(each, 2), answer: String(each), big: true });
    },
  },
  {
    skill: 'deling', level: 2, areas: ['kitchen', 'lobby'],
    make: () => {
      const each = between(2, 5);
      const guests = between(3, 4);
      return task('deling', 2,
        `Der er ${each * guests} boller og ${guests} borde. Hvor mange boller til hvert bord?`,
        { template: 'number-pad', answer: each }, 3);
    },
  },
];

/* ------------------------------------------------------------- fractions --- */

const fractionFactories: TaskFactory[] = [
  {
    skill: 'brøker', level: 1, areas: ['kitchen'],
    make: () => {
      const slices = pick([2, 4] as const);
      const wrong = slices === 2 ? [4, 3] : [2, 3];
      const { options, answer } = figureOptions(
        { kind: 'cake', slices },
        wrong.map(w => ({ kind: 'cake', slices: w }) as Figure)
      );
      const word = slices === 2 ? 'to lige store stykker' : 'fire lige store stykker';
      return task('brøker', 1,
        `Kagen skal deles i ${word}. Hvilken kage er rigtig?`,
        { template: 'pick-image', options, answer });
    },
  },
  {
    skill: 'brøker', level: 2, areas: ['kitchen'],
    make: () => {
      const slices = pick([2, 4] as const);
      const left = slices / 2;
      const { options, answer } = figureOptions(
        { kind: 'cake', slices, left },
        [
          { kind: 'cake', slices, left: slices },
          { kind: 'cake', slices, left: 1 },
        ].filter(f => (f as any).left !== left) as Figure[]
      );
      return task('brøker', 2,
        'Gæsterne har spist halvdelen af kagen. Hvilken kage er der halvdelen af?',
        { template: 'pick-image', options, answer }, 3);
    },
  },
  {
    skill: 'brøker', level: 3, areas: ['kitchen'],
    make: () => {
      const slices = 4;
      const eaten = between(1, 3);
      return task('brøker', 3,
        `Kagen var delt i ${slices} stykker, og ${eaten} er spist. Hvor mange er der tilbage?`,
        { template: 'number-pad', answer: slices - eaten }, 3);
    },
  },
];

/* ---------------------------------------------------- shapes and ordering --- */

const SHAPES = ['cirkel', 'firkant', 'trekant', 'rektangel'] as const;

const shapeFactories: TaskFactory[] = [
  {
    skill: 'figurer', level: 1, areas: ['garden', 'rooms'],
    make: () => {
      const [target, ...rest] = Phaser.Utils.Array.Shuffle([...SHAPES]);
      const { options, answer } = figureOptions(
        { kind: 'shape', shape: target },
        rest.slice(0, 2).map(sh => ({ kind: 'shape', shape: sh }) as Figure)
      );
      return task('figurer', 1,
        `Sandslottet skal have en ${target}. Hvilken er det?`,
        { template: 'pick-image', options, answer });
    },
  },
  {
    skill: 'figurer', level: 2, areas: ['garden', 'rooms'],
    make: () => {
      const [target, ...rest] = Phaser.Utils.Array.Shuffle([...SHAPES]);
      const corners: Record<string, number> = { cirkel: 0, trekant: 3, firkant: 4, rektangel: 4 };
      const distractors = rest.filter(sh => corners[sh] !== corners[target]).slice(0, 2);
      const { options, answer } = figureOptions(
        { kind: 'shape', shape: target },
        distractors.map(sh => ({ kind: 'shape', shape: sh }) as Figure)
      );
      const n = corners[target];
      return task('figurer', 2,
        n === 0 ? 'Hvilken figur har slet ingen hjørner?' : `Hvilken figur har ${n} hjørner?`,
        { template: 'pick-image', options, answer }, 3);
    },
  },
  {
    skill: 'sortering', level: 1, areas: ['rooms', 'pool'],
    make: () => task('sortering', 1,
      'Læg håndklæderne i stakken. Tryk på det mindste først.',
      {
        template: 'put-in-order',
        hint: 'mindst → størst',
        items: [
          { rank: 0, figure: { kind: 'towel', size: 1 } },
          { rank: 1, figure: { kind: 'towel', size: 2 } },
          { rank: 2, figure: { kind: 'towel', size: 3 } },
        ],
      }),
  },
  {
    skill: 'sortering', level: 2, areas: ['rooms', 'pool'],
    make: () => task('sortering', 2,
      'Nu den anden vej: tryk på det største håndklæde først.',
      {
        template: 'put-in-order',
        hint: 'størst → mindst',
        items: [
          { rank: 0, figure: { kind: 'towel', size: 3 } },
          { rank: 1, figure: { kind: 'towel', size: 2 } },
          { rank: 2, figure: { kind: 'towel', size: 1 } },
        ],
      }, 3),
  },
];

/* ------------------------------------------------------- clock and scales --- */

const dialFactories: TaskFactory[] = [
  {
    skill: 'tallinje', level: 1, areas: ['pool'],
    make: () => {
      const target = between(22, 27);
      const from = target + pick([-4, -3, 3, 4]);
      return task('tallinje', 1,
        `Poolen skal være ${target} grader. Skru på termometret.`,
        { template: 'adjust', dial: 'thermometer', from, target, min: 15, max: 32, step: 1 });
    },
  },
  {
    skill: 'tallinje', level: 2, areas: ['pool'],
    make: () => {
      const target = between(18, 30);
      const from = Phaser.Math.Clamp(target + pick([-7, -6, 6, 7]), 15, 32);
      return task('tallinje', 2,
        `I dag skal poolen være ${target} grader.`,
        { template: 'adjust', dial: 'thermometer', from, target, min: 15, max: 32, step: 1 }, 3);
    },
  },
  {
    skill: 'klokken', level: 1, areas: ['rooms', 'kitchen'],
    make: () => {
      const target = between(6, 11);
      const from = ((target + between(2, 5) - 1) % 12) + 1;
      return task('klokken', 1,
        `Morgenmaden starter klokken ${target}. Sæt uret.`,
        { template: 'adjust', dial: 'clock', from, target, min: 1, max: 12, step: 1 });
    },
  },
  {
    skill: 'klokken', level: 2, areas: ['rooms', 'kitchen'],
    make: () => {
      const hour = between(2, 9);
      const { options, answer } = figureOptions(
        { kind: 'clock', hour },
        [
          { kind: 'clock', hour: (hour % 12) + 1 },
          { kind: 'clock', hour: hour + 0.5 },
        ] as Figure[]
      );
      return task('klokken', 2,
        `Hvilket ur viser klokken ${hour}?`,
        { template: 'pick-image', options, answer }, 3);
    },
  },
  {
    skill: 'klokken', level: 3, areas: ['rooms', 'kitchen'],
    make: () => {
      // Danish half hours run backwards: "halv otte" is 7:30
      const spoken = between(2, 10);
      const value = spoken - 0.5;
      const from = spoken - 0.5 + pick([-2, -1, 1, 2]);
      return task('klokken', 3,
        `Frokosten er halv ${spoken === 1 ? 'et' : spoken}. Sæt uret til halv ${spoken}.`,
        {
          template: 'adjust', dial: 'clock',
          from: Math.max(1, from), target: value,
          min: 1, max: 12.5, step: 0.5,
        }, 4);
    },
  },
];

/* ---------------------------------------------------------- more Danish --- */

const SYLLABLES: [string, number][] = [
  ['Sofia', 3], ['Jensen', 2], ['Pedersen', 3], ['Hansen', 2],
  ['Andersen', 3], ['Møller', 2], ['Christensen', 3], ['Larsen', 2],
];

const moreDanskFactories: TaskFactory[] = [
  {
    skill: 'stavelser', level: 1, areas: ['lobby', 'rooms'],
    make: () => {
      const [name, count] = pick(SYLLABLES.filter(([, n]) => n === 2));
      return task('stavelser', 1,
        `Klap stavelserne i "${name}". Tryk én gang for hver.`,
        { template: 'count-taps', target: count, icon: 'clap' });
    },
  },
  {
    skill: 'stavelser', level: 2, areas: ['lobby', 'rooms', 'garden', 'boutique'],
    make: () => {
      const [name, count] = pick(SYLLABLES);
      return task('stavelser', 2,
        `Hvor mange stavelser er der i "${name}"? Klap dem.`,
        { template: 'count-taps', target: count, icon: 'clap' }, 3);
    },
  },
  {
    skill: 'alfabet', level: 1, areas: ['lobby'],
    make: () => {
      const start = between(0, 20);
      const letters = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','X','Y','Z'];
      const three = [letters[start], letters[start + 1], letters[start + 2]];
      return task('alfabet', 1,
        'Hæng nøglerne op i alfabetisk orden.',
        {
          template: 'put-in-order',
          hint: 'A først',
          items: three.map((letter, i) => ({ rank: i, figure: { kind: 'letter', text: letter } as Figure })),
        });
    },
  },
  {
    skill: 'alfabet', level: 2, areas: ['lobby'],
    make: () => {
      const letters = Phaser.Utils.Array.Shuffle(
        ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','R','S','T','U','V']
      ).slice(0, 3).sort();
      return task('alfabet', 2,
        'Gæsterne skal skrives i gæstebogen i alfabetisk orden.',
        {
          template: 'put-in-order',
          hint: 'A først',
          items: letters.map((letter, i) => ({ rank: i, figure: { kind: 'letter', text: letter } as Figure })),
        }, 3);
    },
  },
  {
    skill: 'forlyd', level: 1, areas: ['pool', 'rooms'],
    make: () => {
      const letter = pick(LETTERS);
      const [a, b] = Phaser.Utils.Array.Shuffle([...LETTER_WORDS[letter]]).slice(0, 2);
      const others = Phaser.Utils.Array.Shuffle(LETTERS.filter(l => l !== letter))
        .slice(0, 2)
        .map(l => pick(LETTER_WORDS[l]));
      return task('forlyd', 1,
        `"${a}" ligger i den blå kurv. Hvilket ord starter med samme lyd?`,
        { template: 'pick-one', options: options(b, others), answer: b });
    },
  },
  {
    skill: 'forlyd', level: 2, areas: ['pool', 'kitchen'],
    make: () => {
      const letter = pick(LETTERS);
      const same = Phaser.Utils.Array.Shuffle([...LETTER_WORDS[letter]]).slice(0, 2);
      const odd = pick(LETTER_WORDS[pick(LETTERS.filter(l => l !== letter))]);
      return task('forlyd', 2,
        'Ét ord hører ikke til i kurven. Hvilket?',
        { template: 'pick-one', options: options(odd, same), answer: odd }, 3);
    },
  },
  {
    skill: 'bogstavform', level: 1, areas: ['rooms', 'lobby'],
    make: () => {
      const letter = pick(LETTERS);
      const others = Phaser.Utils.Array.Shuffle(LETTERS.filter(l => l !== letter)).slice(0, 2);
      return task('bogstavform', 1,
        `På skiltet står ${letter}. Hvilket lille bogstav passer til?`,
        {
          template: 'pick-one',
          options: options(letter.toLowerCase(), others.map(l => l.toLowerCase())),
          answer: letter.toLowerCase(),
          big: true,
        });
    },
  },
  {
    skill: 'bogstavform', level: 2, areas: ['rooms', 'garden'],
    make: () => {
      const letter = pick(LETTERS);
      const others = Phaser.Utils.Array.Shuffle(LETTERS.filter(l => l !== letter)).slice(0, 2);
      return task('bogstavform', 2,
        `Nøglen er mærket med ${letter.toLowerCase()}. Hvilket stort bogstav er det?`,
        { template: 'pick-one', options: options(letter, others), answer: letter, big: true }, 3);
    },
  },
];

/**
 * The boutique's own: shopping is where money and colours come up naturally. The rest of
 * what it asks is borrowed from factories whose wording fits anywhere in the hotel.
 */
const boutiqueFactories: TaskFactory[] = [
  {
    skill: 'mønstre', level: 1, areas: ['boutique'],
    make: () => {
      const [a, b, c] = Phaser.Utils.Array.Shuffle([0, 1, 2, 3]).slice(0, 3);
      return task('mønstre', 1,
        'Kasketterne hænger i et mønster. Hvilken farve mangler?',
        { template: 'pattern', sequence: [a, b, a, b, a], options: Phaser.Utils.Array.Shuffle([a, b, c]), answer: b });
    },
  },
  {
    skill: 'plus', level: 2, areas: ['boutique'],
    make: () => {
      const a = between(2, 7);
      const b = between(1, 10 - a);
      return task('plus', 2,
        `En kasket koster ${a} kroner, og solbriller koster ${b}. Hvad koster de tilsammen?`,
        { template: 'number-pad', answer: a + b }, 3);
    },
  },
  {
    skill: 'minus', level: 3, areas: ['boutique'],
    make: () => {
      const price = between(3, 9) * 5;
      const paid = price + between(1, 4) * 5;
      return task('minus', 3,
        `Solhatten koster ${price} kroner. Gæsten betaler med ${paid}. Hvor meget skal de have tilbage?`,
        { template: 'number-pad', answer: paid - price }, 4);
    },
  },
];

export const FACTORIES: TaskFactory[] = [
  ...countingFactories,
  ...numberFactories,
  ...patternFactories,
  ...shareFactories,
  ...fractionFactories,
  ...shapeFactories,
  ...dialFactories,
  ...danskFactories,
  ...moreDanskFactories,
  ...boutiqueFactories,
];
