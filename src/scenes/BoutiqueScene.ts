import Phaser from 'phaser';
import { COLORS } from '../config';
import { GuestData, MAX_GARMENTS, gameState } from '../state/GameState';
import { COLOURS, GARMENTS, garmentKey, garmentOf, isGarment, parseGarment } from '../state/Extras';
import { paintGarment, paintWearable } from '../objects/Icons';
import { HEAD, drawHead } from '../helpers/Draw';
import { MakerScene, MakerStep } from './MakerScene';

/** A pale grey for a thing whose colour has not been picked yet. */
const UNDYED = 0xE6E1D8;

/**
 * The boutique, bought in the star shop.
 *
 * A guest at the pool sometimes asks for something to wear — a sun hat, a cap, sunglasses,
 * a flower crown — in a colour. It is made here, a thing and then a colour, and handed over
 * from their card. They keep it on for the rest of their stay, so the hotel fills up with
 * guests wearing the child's work.
 */
export class BoutiqueScene extends MakerScene {
  protected readonly title = 'Tøjbutikken';
  protected readonly titleColor = COLORS.purple;
  protected readonly backTo = 'HotelMapScene';
  protected readonly makeLabel = 'Læg på hylden';
  protected readonly fullLabel = 'Hylden er fuld';
  protected readonly counterLabel = 'Klar til gæsterne';
  protected readonly capacity = MAX_GARMENTS;

  protected readonly steps: MakerStep[] = [
    {
      id: 'kind',
      title: 'Hvad skal du lave?',
      options: GARMENTS.map(garment => ({
        id: garment.id,
        name: garment.name,
        paint: (g, picked) => this.paintChoice(g, garment.id, picked.colour),
      })),
    },
    {
      id: 'colour',
      title: 'Hvilken farve?',
      options: COLOURS.map(colour => ({
        id: colour.id,
        name: colour.en.charAt(0).toUpperCase() + colour.en.slice(1),
        paint: (g, picked) => this.paintChoice(g, picked.kind ?? 'solhat', colour.id),
      })),
    },
  ];

  constructor() {
    super({ key: 'BoutiqueScene' });
  }

  private paintChoice(g: Phaser.GameObjects.Graphics, kind: string, colour?: string): void {
    paintGarment(g, 3, garmentKey({ kind, colour: colour ?? 'roed' }), colour ? undefined : UNDYED);
  }

  protected compose(picked: Record<string, string>): string {
    return garmentKey({ kind: picked.kind, colour: picked.colour });
  }

  /** The thing on a head, so it is obvious which way up a cap goes. */
  protected fillPreview(c: Phaser.GameObjects.Container, picked: Record<string, string>): void {
    const s = 3.4;
    c.add(drawHead(this, 0, 30, COLORS.teal, s));
    if (!picked.kind) return;
    const key = garmentKey({ kind: picked.kind, colour: picked.colour ?? 'roed' });
    const g = this.add.graphics();
    paintWearable(g, key, 0, 30 + HEAD.cy * s, HEAD.r * s, 30 + HEAD.eyeY * s,
      picked.colour ? undefined : UNDYED);
    c.add(g);
  }

  /** Clothes are drawn half as big again as an ice, or a pair of sunglasses is a smudge. */
  protected paintItem(g: Phaser.GameObjects.Graphics, key: string, s: number): void {
    paintGarment(g, s * 1.5, key);
  }

  protected counter(): string[] {
    return gameState.boutique.ready;
  }

  protected produce(key: string): boolean {
    return gameState.makeGarment(key);
  }

  protected scrap(index: number): boolean {
    return gameState.scrapeGarment(index);
  }

  protected wishes(): { guest: GuestData; key: string }[] {
    return gameState.guests
      .filter(g => g.checkedIn && !g.done && g.at !== 'following')
      .flatMap(guest => gameState.outstandingExtras(guest).filter(isGarment).map(key => ({ guest, key })));
  }

  protected madeMessage(key: string): string {
    const spec = parseGarment(key);
    const name = spec ? garmentOf(spec.kind).name : 'Tøjet';
    return spec && garmentOf(spec.kind).agreement === 'pl' ? `${name} er klar` : `${name}en er klar`;
  }
}
