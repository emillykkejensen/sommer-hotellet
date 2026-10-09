/**
 * The two things a guest can ask for besides the stop itself: an ice cream from the stand
 * by the pool, and something to wear from the boutique.
 *
 * Both are built the way a dish is cooked — pick the parts, put the finished thing on the
 * counter — and both are handed over from the guest's card. They live here as data, with
 * no Phaser in sight, because GameState has to be able to make an order and match a
 * delivery against it, and GameState is also read by the test harness outside a browser.
 *
 * Items travel as string keys ("is:vaffel:jordbaer:drys", "toej:solhat:roed") so a request,
 * a counter and a save file can all hold them without a second shape to keep in step. The
 * ids are ASCII on purpose; the Danish is in the names.
 */

/* ------------------------------------------------------------------ ice cream --- */

export interface Choice {
  id: string;
  name: string;
}

export interface Flavour extends Choice {
  /** The colour of the scoop. */
  color: number;
  /** The whole word for an ice cream of this flavour: "jordbæris". */
  ice: string;
}

export const HOLDERS: Choice[] = [
  { id: 'vaffel', name: 'Vaffel' },
  { id: 'baeger', name: 'Bæger' },
];

export const FLAVOURS: Flavour[] = [
  { id: 'jordbaer', name: 'Jordbær', color: 0xF4A3B8, ice: 'jordbæris' },
  { id: 'vanilje', name: 'Vanilje', color: 0xFBEFCF, ice: 'vaniljeis' },
  { id: 'chokolade', name: 'Chokolade', color: 0xA06A48, ice: 'chokoladeis' },
  { id: 'citron', name: 'Citron', color: 0xF6E072, ice: 'citronis' },
];

export const TOPPINGS: Choice[] = [
  { id: 'drys', name: 'Drys' },
  { id: 'kirsebaer', name: 'Kirsebær' },
];

export interface IceSpec {
  holder: string;
  flavour: string;
  topping: string;
}

export function iceKey(spec: IceSpec): string {
  return `is:${spec.holder}:${spec.flavour}:${spec.topping}`;
}

export function isIce(key: string): boolean {
  return key.startsWith('is:');
}

export function parseIce(key: string): IceSpec | null {
  const [kind, holder, flavour, topping] = key.split(':');
  if (kind !== 'is' || !holder || !flavour || !topping) return null;
  return { holder, flavour, topping };
}

export function flavourOf(id: string): Flavour {
  return FLAVOURS.find(f => f.id === id) ?? FLAVOURS[0];
}

/** "en jordbæris i vaffel med drys" — how a guest asks for it. */
export function icePhrase(key: string): string {
  const spec = parseIce(key);
  if (!spec) return 'en is';
  const holder = spec.holder === 'baeger' ? 'i bæger' : 'i vaffel';
  const topping = spec.topping === 'kirsebaer' ? 'med kirsebær' : 'med drys';
  return `en ${flavourOf(spec.flavour).ice} ${holder} ${topping}`;
}

export function randomIce(): string {
  const pick = <T>(list: T[]) => list[Math.floor(Math.random() * list.length)];
  return iceKey({
    holder: pick(HOLDERS).id,
    flavour: pick(FLAVOURS).id,
    topping: pick(TOPPINGS).id,
  });
}

/* ------------------------------------------------------------------- clothes --- */

/** Danish adjectives agree with the noun, so each thing says which form it takes. */
type Agreement = 'en' | 'pl';

export interface Garment extends Choice {
  agreement: Agreement;
  /** The thing itself, definite — "solhatten" — for "Giv solhatten". */
  definite: string;
  /** Lower case, for the middle of a sentence. */
  noun: string;
}

export interface Colour {
  id: string;
  color: number;
  /** The adjective for an en-word and for a plural: "en rød solhat", "røde solbriller". */
  en: string;
  pl: string;
}

export const GARMENTS: Garment[] = [
  { id: 'solhat', name: 'Solhat', noun: 'solhat', definite: 'solhatten', agreement: 'en' },
  { id: 'kasket', name: 'Kasket', noun: 'kasket', definite: 'kasketten', agreement: 'en' },
  { id: 'solbriller', name: 'Solbriller', noun: 'solbriller', definite: 'solbrillerne', agreement: 'pl' },
  { id: 'krans', name: 'Blomsterkrans', noun: 'blomsterkrans', definite: 'blomsterkransen', agreement: 'en' },
];

export const COLOURS: Colour[] = [
  { id: 'roed', color: 0xE8705A, en: 'rød', pl: 'røde' },
  { id: 'blaa', color: 0x5B9BE0, en: 'blå', pl: 'blå' },
  { id: 'gul', color: 0xF8CE55, en: 'gul', pl: 'gule' },
  { id: 'groen', color: 0x74C255, en: 'grøn', pl: 'grønne' },
  { id: 'lilla', color: 0xAE87D6, en: 'lilla', pl: 'lilla' },
];

export interface GarmentSpec {
  kind: string;
  colour: string;
}

export function garmentKey(spec: GarmentSpec): string {
  return `toej:${spec.kind}:${spec.colour}`;
}

export function isGarment(key: string): boolean {
  return key.startsWith('toej:');
}

export function parseGarment(key: string): GarmentSpec | null {
  const [kind, garment, colour] = key.split(':');
  if (kind !== 'toej' || !garment || !colour) return null;
  return { kind: garment, colour };
}

export function garmentOf(id: string): Garment {
  return GARMENTS.find(g => g.id === id) ?? GARMENTS[0];
}

export function colourOf(id: string): Colour {
  return COLOURS.find(c => c.id === id) ?? COLOURS[0];
}

/** "en rød solhat", "grønne solbriller". */
export function garmentPhrase(key: string): string {
  const spec = parseGarment(key);
  if (!spec) return 'noget tøj';
  const garment = garmentOf(spec.kind);
  const colour = colourOf(spec.colour);
  return garment.agreement === 'pl'
    ? `${colour.pl} ${garment.noun}`
    : `en ${colour.en} ${garment.noun}`;
}

export function randomGarment(): string {
  const pick = <T>(list: T[]) => list[Math.floor(Math.random() * list.length)];
  return garmentKey({ kind: pick(GARMENTS).id, colour: pick(COLOURS).id });
}

/* -------------------------------------------------------------------- shared --- */

/** How a guest names the thing in a sentence. */
export function extraPhrase(key: string): string {
  return isIce(key) ? icePhrase(key) : garmentPhrase(key);
}

/** The label on the button that hands it over: "Giv isen", "Giv solbrillerne". */
export function giveLabel(key: string): string {
  if (isIce(key)) return 'Giv isen';
  const spec = parseGarment(key);
  return `Giv ${spec ? garmentOf(spec.kind).definite : 'tøjet'}`;
}
