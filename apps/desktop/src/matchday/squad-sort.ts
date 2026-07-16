import type { Position } from './types.js';

export type SortKey =
  | 'shirtNumber'
  | 'info'
  | 'name'
  | 'position'
  | 'age'
  | 'nationality'
  | 'heightCm'
  | 'preferredFoot'
  | 'squadRole'
  | 'rating'
  | 'potentialRating'
  | 'matchFitness'
  | 'morale'
  | 'condition'
  | 'appearances'
  | 'goals'
  | 'assists'
  | 'averageRating';

export type SortDirection = 'asc' | 'desc';

export interface SquadSortState {
  readonly key: SortKey;
  readonly direction: SortDirection;
}

/** The minimum player shape required by the squad table sorter. */
export interface SortableSquadPlayer {
  readonly shirtNumber: number;
  readonly selected: boolean;
  readonly name: string;
  readonly position: Position;
  readonly age: number;
  readonly nationality: string;
  readonly heightCm: number;
  readonly preferredFoot: string;
  readonly squadRole: string;
  readonly rating: number;
  readonly potentialRating: number;
  readonly matchFitness: number;
  readonly morale: number;
  readonly condition: number;
  readonly appearances: number;
  readonly goals: number;
  readonly assists: number;
  readonly averageRating: number;
}

export const POSITION_SORT_ORDER: readonly Position[] = [
  'GK',
  'RB',
  'CB',
  'LB',
  'DM',
  'CM',
  'AM',
  'RW',
  'LW',
  'ST',
];

const positionRank = new Map(POSITION_SORT_ORDER.map((position, index) => [position, index]));
const textCollator = new Intl.Collator('pt-BR', {
  numeric: true,
  sensitivity: 'base',
});

const numericKeys = new Set<SortKey>([
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
]);

const textKeys = new Set<SortKey>(['name', 'nationality', 'preferredFoot', 'squadRole']);

const compareNames = (left: SortableSquadPlayer, right: SortableSquadPlayer) =>
  textCollator.compare(left.name, right.name);

const getPhysicalStateRank = (player: SortableSquadPlayer) => {
  const readiness = Math.min(player.matchFitness, player.condition);
  if (readiness >= 90) return 0;
  if (readiness >= 75) return 1;
  return 2;
};

/**
 * Groups the information column by lineup status, then physical readiness.
 * Lower values mean a starter closer to full readiness; reserves follow starters.
 */
export const getPlayerInfoSortValue = (player: SortableSquadPlayer) =>
  (player.selected ? 0 : 3) + getPhysicalStateRank(player);

const compareByKey = (left: SortableSquadPlayer, right: SortableSquadPlayer, key: SortKey) => {
  if (key === 'info') {
    return getPlayerInfoSortValue(left) - getPlayerInfoSortValue(right);
  }

  if (key === 'position') {
    return (
      (positionRank.get(left.position) ?? Number.MAX_SAFE_INTEGER) -
      (positionRank.get(right.position) ?? Number.MAX_SAFE_INTEGER)
    );
  }

  if (numericKeys.has(key)) {
    return (left[key] as number) - (right[key] as number);
  }

  if (textKeys.has(key)) {
    return textCollator.compare(left[key] as string, right[key] as string);
  }

  return 0;
};

export const createSquadPlayerComparator = <T extends SortableSquadPlayer>(
  key: SortKey,
  direction: SortDirection,
) => {
  const directionFactor = direction === 'asc' ? 1 : -1;

  return (left: T, right: T) => {
    const primaryResult = compareByKey(left, right, key);
    if (primaryResult !== 0) return primaryResult * directionFactor;
    return compareNames(left, right);
  };
};

/** Returns a sorted copy and never mutates the server-owned player array. */
export const sortSquadPlayers = <T extends SortableSquadPlayer>(
  players: readonly T[],
  key: SortKey,
  direction: SortDirection,
): T[] => [...players].sort(createSquadPlayerComparator<T>(key, direction));
