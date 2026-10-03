import Phaser from 'phaser';
import { COLORS } from '../config';
import { GuestData, MAX_ICES, gameState } from '../state/GameState';
import { FLAVOURS, HOLDERS, TOPPINGS, flavourOf, iceKey, isIce } from '../state/Extras';
import { paintIce, paintIceParts } from '../objects/Icons';
import { MakerScene, MakerStep } from './MakerScene';

/** What has been picked, as the parts the ice drawing takes. */
function parts(picked: Record<string, string>): [string | null, number | null, string | null] {
  return [
    picked.holder ?? null,
    picked.flavour ? flavourOf(picked.flavour).color : null,
    picked.topping ?? null,
  ];
}

/**
 * The ice cream stand by the pool.
 *
 * Three choices — cone or cup, a flavour, a topping — which is a recipe a five-year-old can
 * hold in their head, and twice as many ices as there are guests who will ask for one, so
 * matching the picture is the job rather than luck.
 */
export class IceCreamScene extends MakerScene {
  protected readonly title = 'Isboden';
  protected readonly titleColor = COLORS.pink;
  protected readonly backTo = 'PoolScene';
  protected readonly makeLabel = 'Læg på disken';
  protected readonly fullLabel = 'Disken er fuld';
  protected readonly counterLabel = 'Klar til gæsterne';
  protected readonly capacity = MAX_ICES;

  protected readonly steps: MakerStep[] = [
    {
      id: 'holder',
      title: 'Vaffel eller bæger?',
      options: HOLDERS.map(h => ({
        id: h.id,
        name: h.name,
        paint: (g, picked) => {
          const [, scoop, topping] = parts(picked);
          paintIceParts(g, 2.2, h.id, scoop, topping);
        },
      })),
    },
    {
      id: 'flavour',
      title: 'Hvilken smag?',
      options: FLAVOURS.map(f => ({
        id: f.id,
        name: f.name,
        paint: (g, picked) => {
          const [holder, , topping] = parts(picked);
          paintIceParts(g, 2.2, holder, f.color, topping);
        },
      })),
    },
    {
      id: 'topping',
      title: 'Hvad skal der på?',
      options: TOPPINGS.map(t => ({
        id: t.id,
        name: t.name,
        paint: (g, picked) => {
          const [holder, scoop] = parts(picked);
          paintIceParts(g, 2.2, holder, scoop ?? COLORS.cream, t.id);
        },
      })),
    },
  ];

  constructor() {
    super({ key: 'IceCreamScene' });
  }

  protected compose(picked: Record<string, string>): string {
    return iceKey({ holder: picked.holder, flavour: picked.flavour, topping: picked.topping });
  }

  protected fillPreview(c: Phaser.GameObjects.Container, picked: Record<string, string>): void {
    const [holder, scoop, topping] = parts(picked);
    const g = this.add.graphics().setPosition(0, 4);
    paintIceParts(g, 4.4, holder, scoop, topping);
    c.add(g);
  }

  protected paintItem(g: Phaser.GameObjects.Graphics, key: string, s: number): void {
    paintIce(g, s, key);
  }

  protected counter(): string[] {
    return gameState.pool.ices;
  }

  protected produce(key: string): boolean {
    return gameState.makeIce(key);
  }

  protected scrap(index: number): boolean {
    return gameState.scrapeIce(index);
  }

  protected wishes(): { guest: GuestData; key: string }[] {
    return gameState.guestsAt('pool')
      .filter(g => !g.done)
      .flatMap(guest => gameState.outstandingExtras(guest).filter(isIce).map(key => ({ guest, key })));
  }

  protected madeMessage(): string {
    return 'Isen er klar';
  }
}
