import { describe, expect, it } from 'vitest';

import {
  getPlayerInfoSortValue,
  POSITION_SORT_ORDER,
  sortSquadPlayers,
  type SortableSquadPlayer,
  type SortKey,
} from './squad-sort.js';

type TextSortKey = Extract<SortKey, 'name' | 'nationality' | 'preferredFoot' | 'squadRole'>;

const player = (
  name: string,
  overrides: Partial<SortableSquadPlayer> = {},
): SortableSquadPlayer => ({
  shirtNumber: 10,
  selected: false,
  name,
  position: 'CM',
  age: 25,
  nationality: 'Brasil',
  heightCm: 180,
  preferredFoot: 'Direito',
  squadRole: 'Rotação',
  rating: 75,
  potentialRating: 80,
  matchFitness: 92,
  morale: 80,
  condition: 95,
  appearances: 12,
  goals: 3,
  assists: 4,
  averageRating: 7.1,
  ...overrides,
});

describe('squad sorting', () => {
  it('orders positions from goalkeeper through defence, midfield and attack', () => {
    const players = POSITION_SORT_ORDER.toReversed().map((position, index) =>
      player(`Jogador ${index}`, { position }),
    );

    expect(sortSquadPlayers(players, 'position', 'asc').map(({ position }) => position)).toEqual(
      POSITION_SORT_ORDER,
    );
    expect(sortSquadPlayers(players, 'position', 'desc').map(({ position }) => position)).toEqual(
      POSITION_SORT_ORDER.toReversed(),
    );
  });

  it('breaks equal-position ties by player name in both directions', () => {
    const players = [player('Zeca', { position: 'CB' }), player('André', { position: 'CB' })];

    expect(sortSquadPlayers(players, 'position', 'asc').map(({ name }) => name)).toEqual([
      'André',
      'Zeca',
    ]);
    expect(sortSquadPlayers(players, 'position', 'desc').map(({ name }) => name)).toEqual([
      'André',
      'Zeca',
    ]);
  });

  it.each<SortKey>([
    'shirtNumber',
    'age',
    'heightCm',
    'rating',
    'potentialRating',
    'matchFitness',
    'morale',
    'condition',
    'appearances',
    'goals',
    'assists',
    'averageRating',
  ])('sorts the numeric %s column in either direction', (key) => {
    const lower = player('Menor', { [key]: 1 });
    const higher = player('Maior', { [key]: 99 });

    expect(sortSquadPlayers([higher, lower], key, 'asc').map(({ name }) => name)).toEqual([
      'Menor',
      'Maior',
    ]);
    expect(sortSquadPlayers([lower, higher], key, 'desc').map(({ name }) => name)).toEqual([
      'Maior',
      'Menor',
    ]);
  });

  it.each<TextSortKey>(['name', 'nationality', 'preferredFoot', 'squadRole'])(
    'sorts the textual %s column with Portuguese collation',
    (key) => {
      const first = player('Primeiro', { [key]: 'Águia' });
      const second = player('Segundo', { [key]: 'Zebra' });

      expect(sortSquadPlayers([second, first], key, 'asc').map((entry) => entry[key])).toEqual([
        'Águia',
        'Zebra',
      ]);
      expect(sortSquadPlayers([first, second], key, 'desc').map((entry) => entry[key])).toEqual([
        'Zebra',
        'Águia',
      ]);
    },
  );

  it('derives INF from lineup status and the weakest physical metric', () => {
    const starterReady = player('Titular pronto', { selected: true });
    const starterAttention = player('Titular em atenção', {
      selected: true,
      matchFitness: 88,
    });
    const reserveReady = player('Reserva pronto');
    const reserveCritical = player('Reserva crítico', { condition: 70 });

    expect(getPlayerInfoSortValue(starterReady)).toBe(0);
    expect(getPlayerInfoSortValue(starterAttention)).toBe(1);
    expect(getPlayerInfoSortValue(reserveReady)).toBe(3);
    expect(getPlayerInfoSortValue(reserveCritical)).toBe(5);
    expect(
      sortSquadPlayers(
        [reserveCritical, reserveReady, starterAttention, starterReady],
        'info',
        'asc',
      ).map(({ name }) => name),
    ).toEqual(['Titular pronto', 'Titular em atenção', 'Reserva pronto', 'Reserva crítico']);
  });

  it('returns a sorted copy without mutating the source array', () => {
    const source = [player('Bia', { shirtNumber: 2 }), player('Ana', { shirtNumber: 1 })];

    const sorted = sortSquadPlayers(source, 'shirtNumber', 'asc');

    expect(sorted).not.toBe(source);
    expect(sorted.map(({ name }) => name)).toEqual(['Ana', 'Bia']);
    expect(source.map(({ name }) => name)).toEqual(['Bia', 'Ana']);
  });
});
