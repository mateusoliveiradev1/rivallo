import type { Formation, Player, Position } from './types.js';

export interface TacticalSlot {
  readonly id: string;
  readonly label: string;
  readonly role: string;
  readonly x: number;
  readonly y: number;
  readonly naturalPositions: readonly Position[];
  readonly familiarPositions: readonly Position[];
}

export interface PositionFamiliarity {
  readonly label: 'Natural' | 'Familiar' | 'Em adaptação';
  readonly score: 100 | 76 | 42;
  readonly tone: 'natural' | 'familiar' | 'adapting';
}

export type LineupSlots = readonly (string | null)[];
export type PitchArrowKey = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown';

const defensiveFamiliarity: readonly Position[] = ['RB', 'CB', 'LB', 'DM'];
const midfieldFamiliarity: readonly Position[] = ['DM', 'CM', 'AM'];
const wideFamiliarity: readonly Position[] = ['RB', 'LB', 'AM', 'RW', 'LW'];
const attackingFamiliarity: readonly Position[] = ['AM', 'RW', 'LW', 'ST'];

const slot = (
  id: string,
  label: string,
  role: string,
  x: number,
  y: number,
  naturalPositions: readonly Position[],
  familiarPositions: readonly Position[],
): TacticalSlot => ({ id, label, role, x, y, naturalPositions, familiarPositions });

const formationSlots: Record<Formation, readonly TacticalSlot[]> = {
  '4-3-3': [
    slot('gk', 'GOL', 'Goleiro · Apoio', 9, 50, ['GK'], ['GK']),
    slot('rb', 'LD', 'Lateral · Apoio', 30, 84, ['RB'], defensiveFamiliarity),
    slot('rcb', 'ZAG D', 'Zagueiro · Defesa', 24, 62, ['CB'], defensiveFamiliarity),
    slot('lcb', 'ZAG E', 'Zagueiro · Defesa', 24, 38, ['CB'], defensiveFamiliarity),
    slot('lb', 'LE', 'Lateral · Apoio', 30, 16, ['LB'], defensiveFamiliarity),
    slot('dm', 'VOL', 'Volante · Suporte', 48, 50, ['DM'], [...defensiveFamiliarity, 'CM']),
    slot('rcm', 'MC D', 'Meia central · Suporte', 59, 69, ['CM'], midfieldFamiliarity),
    slot('lcm', 'MC E', 'Meia central · Suporte', 59, 31, ['CM'], midfieldFamiliarity),
    slot('rw', 'PD', 'Extremo · Ataque', 80, 78, ['RW'], wideFamiliarity),
    slot('st', 'ATA', 'Atacante · Ataque', 88, 50, ['ST'], attackingFamiliarity),
    slot('lw', 'PE', 'Extremo · Ataque', 80, 22, ['LW'], wideFamiliarity),
  ],
  '4-2-3-1': [
    slot('gk', 'GOL', 'Goleiro · Apoio', 9, 50, ['GK'], ['GK']),
    slot('rb', 'LD', 'Lateral · Apoio', 30, 84, ['RB'], defensiveFamiliarity),
    slot('rcb', 'ZAG D', 'Zagueiro · Defesa', 24, 62, ['CB'], defensiveFamiliarity),
    slot('lcb', 'ZAG E', 'Zagueiro · Defesa', 24, 38, ['CB'], defensiveFamiliarity),
    slot('lb', 'LE', 'Lateral · Apoio', 30, 16, ['LB'], defensiveFamiliarity),
    slot('rdm', 'VOL D', 'Volante · Suporte', 47, 66, ['DM', 'CM'], midfieldFamiliarity),
    slot('ldm', 'VOL E', 'Volante · Suporte', 47, 34, ['DM', 'CM'], midfieldFamiliarity),
    slot('am', 'MEI', 'Armador · Ataque', 66, 50, ['AM'], [...midfieldFamiliarity, 'RW', 'LW']),
    slot('rw', 'PD', 'Extremo · Ataque', 73, 79, ['RW'], wideFamiliarity),
    slot('st', 'ATA', 'Atacante · Ataque', 88, 50, ['ST'], attackingFamiliarity),
    slot('lw', 'PE', 'Extremo · Ataque', 73, 21, ['LW'], wideFamiliarity),
  ],
  '4-4-2': [
    slot('gk', 'GOL', 'Goleiro · Apoio', 9, 50, ['GK'], ['GK']),
    slot('rb', 'LD', 'Lateral · Apoio', 30, 84, ['RB'], defensiveFamiliarity),
    slot('rcb', 'ZAG D', 'Zagueiro · Defesa', 24, 62, ['CB'], defensiveFamiliarity),
    slot('lcb', 'ZAG E', 'Zagueiro · Defesa', 24, 38, ['CB'], defensiveFamiliarity),
    slot('lb', 'LE', 'Lateral · Apoio', 30, 16, ['LB'], defensiveFamiliarity),
    slot('rcm', 'MC D', 'Meia central · Suporte', 52, 65, ['CM', 'DM'], midfieldFamiliarity),
    slot('lcm', 'MC E', 'Meia central · Suporte', 52, 35, ['CM', 'DM'], midfieldFamiliarity),
    slot('rm', 'MD', 'Meia aberto · Apoio', 62, 84, ['RW'], wideFamiliarity),
    slot('rst', 'ATA D', 'Atacante · Ataque', 84, 65, ['ST'], attackingFamiliarity),
    slot('lst', 'ATA E', 'Atacante · Ataque', 84, 35, ['ST'], attackingFamiliarity),
    slot('lm', 'ME', 'Meia aberto · Apoio', 62, 16, ['LW'], wideFamiliarity),
  ],
};

export const getFormationSlots = (formation: Formation) => formationSlots[formation];

export const findDirectionalSlotIndex = (
  slots: readonly TacticalSlot[],
  sourceIndex: number,
  key: PitchArrowKey,
): number | null => {
  const source = slots[sourceIndex];
  if (!source) return null;

  const horizontal = key === 'ArrowLeft' || key === 'ArrowRight';
  const positive = key === 'ArrowRight' || key === 'ArrowDown';
  let best: { readonly index: number; readonly score: number } | null = null;

  for (const [index, candidate] of slots.entries()) {
    if (index === sourceIndex) continue;
    const deltaX = candidate.x - source.x;
    const deltaY = candidate.y - source.y;
    const primaryDelta = horizontal ? deltaX : deltaY;
    if ((positive && primaryDelta <= 0) || (!positive && primaryDelta >= 0)) continue;

    const perpendicularDelta = horizontal ? Math.abs(deltaY) : Math.abs(deltaX);
    const score = Math.hypot(deltaX, deltaY) + perpendicularDelta * 0.5;
    if (!best || score < best.score) best = { index, score };
  }

  return best?.index ?? null;
};

export const createLineupSlots = (players: readonly Player[]): LineupSlots => {
  const selected = players.filter((player) => player.selected).map((player) => player.id);
  return Array.from({ length: 11 }, (_, index) => selected[index] ?? null);
};

export const selectedIdsFromSlots = (slots: LineupSlots) =>
  slots.filter((playerId): playerId is string => playerId !== null);

export const hasSameSelectedPlayers = (
  slots: LineupSlots,
  selectedPlayerIds: readonly string[],
) => {
  const fromSlots = selectedIdsFromSlots(slots);
  if (fromSlots.length !== selectedPlayerIds.length) return false;
  const selected = new Set(selectedPlayerIds);
  return fromSlots.every((playerId) => selected.has(playerId));
};

export const normalizeStoredSlots = (
  candidate: unknown,
  players: readonly Player[],
): LineupSlots | null => {
  if (!Array.isArray(candidate) || candidate.length !== 11) return null;
  const playerIds = new Set(players.map((player) => player.id));
  const seen = new Set<string>();
  const normalized = candidate.map((value) => {
    if (value === null) return null;
    if (typeof value !== 'string' || !playerIds.has(value) || seen.has(value)) return undefined;
    seen.add(value);
    return value;
  });
  return normalized.some((value) => value === undefined)
    ? null
    : (normalized as readonly (string | null)[]);
};

export const placePlayerInSlot = (
  slots: LineupSlots,
  playerId: string,
  targetIndex: number,
): LineupSlots => {
  if (targetIndex < 0 || targetIndex >= 11) return slots;
  const next = [...slots];
  const sourceIndex = next.indexOf(playerId);
  const targetPlayer = next[targetIndex] ?? null;

  if (sourceIndex === targetIndex) return slots;
  if (sourceIndex >= 0) {
    next[sourceIndex] = targetPlayer;
    next[targetIndex] = playerId;
    return next;
  }

  next[targetIndex] = playerId;
  return next;
};

export const removePlayerFromSlots = (slots: LineupSlots, playerId: string): LineupSlots =>
  slots.map((candidate) => (candidate === playerId ? null : candidate));

export const addPlayerToFirstOpenSlot = (slots: LineupSlots, playerId: string): LineupSlots => {
  if (slots.includes(playerId)) return slots;
  const openIndex = slots.indexOf(null);
  if (openIndex < 0) return slots;
  return placePlayerInSlot(slots, playerId, openIndex);
};

export const getPositionFamiliarity = (
  position: Position,
  tacticalSlot: TacticalSlot,
): PositionFamiliarity => {
  if (tacticalSlot.naturalPositions.includes(position)) {
    return { label: 'Natural', score: 100, tone: 'natural' };
  }
  if (tacticalSlot.familiarPositions.includes(position)) {
    return { label: 'Familiar', score: 76, tone: 'familiar' };
  }
  return { label: 'Em adaptação', score: 42, tone: 'adapting' };
};
