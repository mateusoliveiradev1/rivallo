import { describe, expect, it } from 'vitest';

import type { Player } from './types.js';
import {
  applyPresetToPlan,
  createLineupSlots,
  createTacticalPlan,
  findDirectionalSlotIndex,
  formationPresets,
  getFormationSlots,
  getPositionFamiliarity,
  hasSameSelectedPlayers,
  movePlayerFreely,
  normalizeStoredSlots,
  placePlayerInSlot,
  previewPresetApplication,
  selectedIdsFromSlots,
  substitutePlayers,
  swapStarters,
  validateTacticalDraft,
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
    const up = findDirectionalSlotIndex(slots, 6, 'ArrowUp');
    const down = findDirectionalSlotIndex(slots, 6, 'ArrowDown');
    expect(up).not.toBeNull();
    expect(down).not.toBeNull();
    expect(slots[up ?? 0]?.y).toBeLessThan(slots[6]?.y ?? 0);
    expect(slots[down ?? 0]?.y).toBeGreaterThan(slots[6]?.y ?? 0);
    const rightmost = slots.reduce(
      (best, slot, index) => (slot.x > (slots[best]?.x ?? 0) ? index : best),
      0,
    );
    expect(findDirectionalSlotIndex(slots, rightmost, 'ArrowRight')).toBeNull();
  });

  it('ships twenty unique curated presets with normalized eleven-player geometry', () => {
    expect(formationPresets).toHaveLength(20);
    expect(new Set(formationPresets.map(({ id }) => id)).size).toBe(20);
    expect(new Set(formationPresets.map(({ family }) => family))).toEqual(
      new Set(['backFour', 'backThree', 'backFive']),
    );
    for (const preset of formationPresets) {
      expect(preset.version).toBe(1);
      expect(preset.slots).toHaveLength(11);
      expect(new Set(preset.slots.map(({ id }) => id)).size).toBe(11);
      expect(preset.slots.every(({ x, y }) => x >= 0 && x <= 1 && y >= 0 && y <= 1)).toBe(true);
      expect(preset.slots.filter(({ position }) => position === 'GK')).toHaveLength(1);
    }
  });

  it('treats presets as editable starts and keeps substitutions atomic across field and bench', () => {
    const plan = createTacticalPlan(players, '4-3-3');
    const changedPreset = applyPresetToPlan(plan, '3-4-2-1', players);
    expect(changedPreset.sourcePresetId).toBe('3-4-2-1');
    expect(changedPreset.placements).toHaveLength(11);

    const swapped = swapStarters(changedPreset, 'p2', 'p3');
    expect(new Set(swapped.placements.map(({ playerId }) => playerId))).toEqual(
      new Set(changedPreset.placements.map(({ playerId }) => playerId)),
    );
    const substituted = substitutePlayers(swapped, 'p1', 'p12');
    expect(substituted.placements.map(({ playerId }) => playerId)).toContain('p12');
    expect(substituted.bench).toContain('p1');
    expect(validateTacticalDraft(substituted, players).valid).toBe(true);
  });

  it('assigns preset slots deterministically by positional compatibility instead of array index', () => {
    const positionalPlayers = getFormationSlots('4-3-3').map((slot, index) => ({
      ...players[index]!,
      id: `positional-${index}`,
      position: slot.position,
      selected: true,
    }));
    const reserveStriker = {
      ...players[11]!,
      id: 'reserve-striker',
      position: 'ST' as const,
      selected: false,
    };
    const availablePlayers = [...positionalPlayers, reserveStriker];
    const plan = createTacticalPlan(availablePlayers, '4-3-3');
    const shuffled = { ...plan, placements: [...plan.placements].reverse() };
    const expected = applyPresetToPlan(plan, '4-4-2', availablePlayers);
    const actual = applyPresetToPlan(shuffled, '4-4-2', availablePlayers);
    const assignment = (snapshot: typeof actual) =>
      Object.fromEntries(
        snapshot.placements.map(({ playerId, sourcePresetSlotId }) => [
          sourcePresetSlotId,
          playerId,
        ]),
      );
    expect(assignment(actual)).toEqual(assignment(expected));
    const goalkeeperId = actual.placements.find(({ positionId }) => positionId === 'GK')?.playerId;
    expect(positionalPlayers.find(({ id }) => id === goalkeeperId)?.position).toBe('GK');
    const centreBacks = actual.placements.filter(
      ({ playerId }) => positionalPlayers.find(({ id }) => id === playerId)?.position === 'CB',
    );
    expect(centreBacks.every(({ line }) => line === 'defence')).toBe(true);
    const leftBack = actual.placements.find(
      ({ playerId }) => positionalPlayers.find(({ id }) => id === playerId)?.position === 'LB',
    );
    const rightBack = actual.placements.find(
      ({ playerId }) => positionalPlayers.find(({ id }) => id === playerId)?.position === 'RB',
    );
    expect(leftBack?.side).toBe('left');
    expect(rightBack?.side).toBe('right');
    expect(actual.placements.map(({ playerId }) => playerId)).toContain(reserveStriker.id);
    expect(actual.bench).not.toContain(reserveStriker.id);
  });

  it('previews suggestion and geometry modes without changing the starters or bench', () => {
    const plan = createTacticalPlan(players, '4-3-3');
    const preview = previewPresetApplication(plan, '4-4-2', players);
    expect(preview.suggestion.formation).toBe('4-4-2');
    expect(preview.geometry.formation).toBe('4-4-2');
    expect(new Set(preview.suggestion.placements.map(({ playerId }) => playerId))).toEqual(
      new Set(plan.placements.map(({ playerId }) => playerId)),
    );
    expect(preview.suggestion.bench).toEqual(plan.bench);
  });

  it('preserves precise free coordinates and allows unusual or overlapping tactical choices', () => {
    const plan = createTacticalPlan(players, '4-3-3');
    const goalkeeperId = plan.placements.find(({ playerId }) => playerId === 'p1')!.playerId;
    const moved = movePlayerFreely(plan, goalkeeperId, 0.873_421, 0.517_389);
    const crowded = movePlayerFreely(moved, moved.placements[1]!.playerId, 0.873_421, 0.517_389);
    expect(crowded.placements.find(({ playerId }) => playerId === goalkeeperId)).toMatchObject({
      normalizedX: 0.873_421,
      normalizedY: 0.517_389,
    });
    expect(validateTacticalDraft(crowded, players)).toEqual({
      valid: true,
      errors: [],
      warnings: [],
    });
  });
});
