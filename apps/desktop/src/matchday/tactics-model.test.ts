import { describe, expect, it } from 'vitest';

import type { Player } from './types.js';
import {
  createLineupSlots,
  findDirectionalSlotIndex,
  getFormationSlots,
  getPositionFamiliarity,
  hasSameSelectedPlayers,
  normalizeStoredSlots,
  placePlayerInSlot,
  selectedIdsFromSlots,
} from './tactics-model.js';

const players: Player[] = Array.from({ length: 12 }, (_, index): Player => ({
  id: `p${index + 1}`,
  name: `Jogador ${index + 1}`,
  shortName: `J. ${index + 1}`,
  shirtNumber: [1, 22, 3, 4, 16, 5, 8, 10, 7, 9, 11, 12][index] ?? index + 1,
  position: index === 0 || index === 11 ? 'GK' : index < 5 ? 'CB' : index < 8 ? 'CM' : 'ST',
  age: 20 + index,
  nationality: 'BRA',
  heightCm: 180,
  preferredFoot: 'right',
  squadRole: index < 11 ? 'firstTeam' : 'prospect',
  rating: 70 + index,
  potentialRating: 74 + index,
  matchFitness: 92,
  morale: 80,
  condition: 90,
  appearances: 12,
  goals: 0,
  assists: 0,
  averageRating: 7.1,
  selected: index < 11,
}));

describe('tactics model', () => {
  it('creates eleven stable lineup slots from the persisted selection', () => {
    const slots = createLineupSlots(players);
    expect(slots).toHaveLength(11);
    expect(selectedIdsFromSlots(slots)).toEqual(players.slice(0, 11).map((player) => player.id));
  });

  it('swaps two starters without losing either player', () => {
    const slots = createLineupSlots(players);
    const moved = placePlayerInSlot(slots, 'p11', 2);
    expect(moved[2]).toBe('p11');
    expect(moved[10]).toBe('p3');
    expect(new Set(selectedIdsFromSlots(moved))).toEqual(new Set(selectedIdsFromSlots(slots)));
  });

  it('replaces a starter when a reserve is dropped on an occupied slot', () => {
    const slots = createLineupSlots(players);
    const moved = placePlayerInSlot(slots, 'p12', 0);
    expect(moved[0]).toBe('p12');
    expect(selectedIdsFromSlots(moved)).not.toContain('p1');
    expect(selectedIdsFromSlots(moved)).toHaveLength(11);
  });

  it('accepts stored ordering only when it is valid and unique', () => {
    const slots = createLineupSlots(players);
    expect(normalizeStoredSlots(slots, players)).toEqual(slots);
    expect(normalizeStoredSlots([...slots.slice(0, 10), 'p1'], players)).toBeNull();
    expect(
      hasSameSelectedPlayers(
        slots,
        players.slice(0, 11).map((player) => player.id),
      ),
    ).toBe(true);
  });

  it('distinguishes natural, familiar and adapting positional fits', () => {
    const [goalkeeper, rightBack] = getFormationSlots('4-3-3');
    expect(getPositionFamiliarity('GK', goalkeeper).label).toBe('Natural');
    expect(getPositionFamiliarity('CB', rightBack).label).toBe('Familiar');
    expect(getPositionFamiliarity('ST', rightBack).label).toBe('Em adaptação');
  });

  it('moves by the geometric arrow direction instead of array order', () => {
    const slots = getFormationSlots('4-3-3');
    expect(findDirectionalSlotIndex(slots, 5, 'ArrowUp')).toBe(7);
    expect(findDirectionalSlotIndex(slots, 5, 'ArrowDown')).toBe(6);
    expect(findDirectionalSlotIndex(slots, 9, 'ArrowRight')).toBeNull();
  });
});
