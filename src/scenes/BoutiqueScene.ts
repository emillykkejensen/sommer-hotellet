import Phaser from 'phaser';
import { COLORS, DEPTH, SIZE, text } from '../config';
import { Destination, GuestData, MAX_GARMENTS, gameState } from '../state/GameState';
import { COLOURS, GARMENTS, garmentKey, garmentOf, isGarment, parseGarment } from '../state/Extras';
import { paintGarment, paintWearable } from '../objects/Icons';
import { CardAction } from '../objects/Guests';
import { HEAD, drawHead, drawPerson } from '../helpers/Draw';
import { dur, reduceMotion } from '../helpers/Motion';
import { MakerScene, MakerStep } from './MakerScene';

/** A pale grey for a thing whose colour has not been picked yet. */
const UNDYED = 0xE6E1D8;

/**
 * The boutique, bought in the star shop.
 *
 * It is a stop on a guest's day like the pool or the restaurant: once it is open, many
 * guests want to go shopping, and the player leads them here. Each comes in wanting one
 * thing — a sun hat, a cap, sunglasses, a flower crown — in a colour, shown over their
 * head. It is made here, a thing and then a colour, put on the shelf and handed over from
 * their card. They keep it on for the rest of their stay, so the hotel fills up with
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

  protected serves(): Destination {
    return 'boutique';
  }

  /**
   * The customers, standing on the shop floor to the left of the till.
   *
   * They take the place of the ice stand's wish list: each one's thought bubble already
   * shows exactly the thing they want, in its colour, which is the picture to copy.
   */
  protected buildWishes(): void {
    const { height } = this.scale;
    const here = gameState.guestsAt('boutique');
    if (here.length === 0) {
      super.buildWishes(96, height * 0.48);
      return;
    }

    const left = 62;
    const right = 300;
    const step = here.length > 1 ? Math.min(96, (right - left) / (here.length - 1)) : 0;
    here.forEach((guest, i) => {
      const x = here.length === 1 ? 110 : left + i * step;
      const y = height * 0.8;
      const c = this.add.container(x, y);
      c.add(drawPerson(this, 0, 0, guest.color, 1.05, guest.id, guest.wearing));
      const name = this.add.text(0, 50, guest.name, text(SIZE.tiny, '#5A4E42', 'bold')).setOrigin(0.5);
      if (name.width > 92) name.setScale(92 / name.width);
      c.add(name);
      // A bigger bubble than elsewhere: it is the pattern to copy, and a pair of sunglasses
      // at the usual size is a smudge.
      this.addGuest(guest, c, { w: 70, h: 96, thoughtY: -44, barY: 66, thoughtScale: 1.3 });
    });
  }

  /** The thing leaves the shelf and lands on the guest. */
  protected animateDelivery(_guest: GuestData, action: CardAction, spot: { x: number; y: number }): void {
    if (action.kind !== 'extra' || !action.arg || !isGarment(action.arg) || reduceMotion()) return;
    const from = this.counterSpot();
    const item = this.add.graphics().setPosition(from.x, from.y + 10).setDepth(DEPTH.effects);
    paintGarment(item, 1.6, action.arg);
    this.tweens.add({
      targets: item,
      x: spot.x,
      y: spot.y - 30,
      duration: dur(480),
      ease: 'Cubic.easeInOut',
      onComplete: () => item.destroy(),
    });
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
