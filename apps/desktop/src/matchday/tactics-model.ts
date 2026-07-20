import type {
  Formation,
  Player,
  Position,
  TacticalLine,
  TacticalPlanProposal,
  TacticalPlanSnapshot,
  TacticalPlayerPlacement,
  TacticalSide,
  TacticalZone,
} from './types.js';

export type FormationFamily = 'backFour' | 'backThree' | 'backFive';
export type LineupSlots = readonly (string | null)[];
export type PitchArrowKey = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown';

export interface TacticalSlot {
  readonly id: string;
  readonly label: string;
  readonly role: string;
  readonly x: number;
  readonly y: number;
  readonly position: Position;
  readonly naturalPositions: readonly Position[];
  readonly familiarPositions: readonly Position[];
  readonly side: TacticalSide;
  readonly line: TacticalLine;
  readonly zone: TacticalZone;
}

export interface FormationPreset {
  readonly id: Formation;
  readonly name: string;
  readonly family: FormationFamily;
  readonly familyLabel: string;
  readonly version: 1;
  readonly description: string;
  readonly tags: readonly string[];
  readonly slots: readonly TacticalSlot[];
}

export interface PositionFamiliarity {
  readonly label: 'Natural' | 'Familiar' | 'Em adaptação';
  readonly score: 100 | 76 | 42;
  readonly tone: 'natural' | 'familiar' | 'adapting';
}

export interface TacticalDraftValidation {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}

export type PresetApplicationMode = 'geometry' | 'suggestion';

export interface PresetApplicationPreview {
  readonly formation: Formation;
  readonly suggestion: TacticalPlanSnapshot;
  readonly geometry: TacticalPlanSnapshot;
  readonly keptPlayerIds: readonly string[];
  readonly repositionedPlayerIds: readonly string[];
  readonly roleChangedPlayerIds: readonly string[];
  readonly ambiguousPlayerIds: readonly string[];
  readonly promotedPlayerIds: readonly string[];
  readonly demotedPlayerIds: readonly string[];
}

const defensiveFamiliarity: readonly Position[] = ['RB', 'CB', 'LB', 'DM'];
const midfieldFamiliarity: readonly Position[] = ['DM', 'CM', 'AM'];
const wideFamiliarity: readonly Position[] = ['RB', 'LB', 'AM', 'RW', 'LW'];
const attackingFamiliarity: readonly Position[] = ['AM', 'RW', 'LW', 'ST'];

const sideFromY = (y: number): TacticalSide => (y < 0.4 ? 'left' : y > 0.6 ? 'right' : 'centre');
const lineFromX = (x: number): TacticalLine =>
  x <= 0.18 ? 'goal' : x <= 0.38 ? 'defence' : x <= 0.7 ? 'midfield' : 'attack';
const zoneFromX = (x: number): TacticalZone =>
  x <= 0.18 ? 'goal' : x <= 0.38 ? 'defensiveThird' : x <= 0.7 ? 'middleThird' : 'finalThird';

const labels: Record<Position, string> = {
  GK: 'GOL',
  RB: 'LD',
  CB: 'ZAG',
  LB: 'LE',
  DM: 'VOL',
  CM: 'MC',
  AM: 'MEI',
  RW: 'PD',
  LW: 'PE',
  ST: 'ATA',
};

const roles: Record<Position, string> = {
  GK: 'Goleiro · Apoio',
  RB: 'Lateral · Apoio',
  CB: 'Zagueiro · Defesa',
  LB: 'Lateral · Apoio',
  DM: 'Volante · Suporte',
  CM: 'Meia central · Suporte',
  AM: 'Armador · Ataque',
  RW: 'Extremo · Ataque',
  LW: 'Extremo · Ataque',
  ST: 'Atacante · Ataque',
};

const familiarityFor = (position: Position): readonly Position[] => {
  if (position === 'GK') return ['GK'];
  if (['RB', 'CB', 'LB'].includes(position)) return defensiveFamiliarity;
  if (position === 'DM' || position === 'CM') return midfieldFamiliarity;
  if (position === 'RW' || position === 'LW') return wideFamiliarity;
  return attackingFamiliarity;
};

type ShapeLine = {
  readonly x: number;
  readonly positions: readonly Position[];
  readonly lane?: 'narrow' | 'wide';
};

const laneCoordinates = (count: number, lane: 'narrow' | 'wide' = 'wide') => {
  if (count === 1) return [0.5];
  const bounds = lane === 'narrow' ? [0.34, 0.66] : [0.14, 0.86];
  return Array.from(
    { length: count },
    (_, index) => bounds[0] + ((bounds[1] - bounds[0]) * index) / (count - 1),
  );
};

const buildSlots = (formation: Formation, lines: readonly ShapeLine[]): readonly TacticalSlot[] => {
  const result: TacticalSlot[] = [
    {
      id: `${formation}.gk`,
      label: 'GOL',
      role: roles.GK,
      x: 0.08,
      y: 0.5,
      position: 'GK',
      naturalPositions: ['GK'],
      familiarPositions: ['GK'],
      side: 'centre',
      line: 'goal',
      zone: 'goal',
    },
  ];
  for (const [lineIndex, shapeLine] of lines.entries()) {
    const ys = laneCoordinates(shapeLine.positions.length, shapeLine.lane);
    shapeLine.positions.forEach((position, index) => {
      const x = shapeLine.x;
      const y = ys[index] ?? 0.5;
      result.push({
        id: `${formation}.${lineIndex}.${index}.${position.toLowerCase()}`,
        label: `${labels[position]}${shapeLine.positions.filter((item) => item === position).length > 1 ? ` ${index + 1}` : ''}`,
        role: roles[position],
        x,
        y,
        position,
        naturalPositions: [position],
        familiarPositions: familiarityFor(position),
        side: sideFromY(y),
        line: lineFromX(x),
        zone: zoneFromX(x),
      });
    });
  }
  return result;
};

const familyLabels: Record<FormationFamily, string> = {
  backFour: 'Linha de quatro',
  backThree: 'Linha de três',
  backFive: 'Linha de cinco',
};

const preset = (
  id: Formation,
  family: FormationFamily,
  description: string,
  lines: readonly ShapeLine[],
  tags: readonly string[],
): FormationPreset => ({
  id,
  name: id,
  family,
  familyLabel: familyLabels[family],
  version: 1,
  description,
  tags,
  slots: buildSlots(id, lines),
});

const backFour: readonly Position[] = ['LB', 'CB', 'CB', 'RB'];
const backThree: readonly Position[] = ['CB', 'CB', 'CB'];
const backFive: readonly Position[] = ['LB', 'CB', 'CB', 'CB', 'RB'];

export const formationPresets: readonly FormationPreset[] = [
  preset(
    '4-4-2',
    'backFour',
    'Duas linhas claras e dupla de ataque.',
    [
      { x: 0.27, positions: backFour },
      { x: 0.57, positions: ['LW', 'CM', 'CM', 'RW'] },
      { x: 0.84, positions: ['ST', 'ST'], lane: 'narrow' },
    ],
    ['equilíbrio', 'dupla de ataque'],
  ),
  preset(
    '4-4-1-1',
    'backFour',
    'Bloco estável com apoio entre as linhas.',
    [
      { x: 0.27, positions: backFour },
      { x: 0.55, positions: ['LW', 'CM', 'CM', 'RW'] },
      { x: 0.73, positions: ['AM'] },
      { x: 0.88, positions: ['ST'] },
    ],
    ['apoio', 'bloco médio'],
  ),
  preset(
    '4-3-3',
    'backFour',
    'Amplitude alta e meio-campo em triângulo.',
    [
      { x: 0.27, positions: backFour },
      { x: 0.52, positions: ['CM', 'DM', 'CM'], lane: 'narrow' },
      { x: 0.84, positions: ['LW', 'ST', 'RW'] },
    ],
    ['amplitude', 'pressão'],
  ),
  preset(
    '4-2-3-1',
    'backFour',
    'Duplo volante e três apoios atrás do atacante.',
    [
      { x: 0.27, positions: backFour },
      { x: 0.47, positions: ['DM', 'DM'], lane: 'narrow' },
      { x: 0.69, positions: ['LW', 'AM', 'RW'] },
      { x: 0.88, positions: ['ST'] },
    ],
    ['duplo volante', 'entrelinhas'],
  ),
  preset(
    '4-1-4-1',
    'backFour',
    'Volante único protegendo uma linha ampla de meio.',
    [
      { x: 0.27, positions: backFour },
      { x: 0.45, positions: ['DM'] },
      { x: 0.64, positions: ['LW', 'CM', 'CM', 'RW'] },
      { x: 0.88, positions: ['ST'] },
    ],
    ['controle', 'volante'],
  ),
  preset(
    '4-3-1-2',
    'backFour',
    'Losango central com armador e dois atacantes.',
    [
      { x: 0.27, positions: backFour },
      { x: 0.5, positions: ['CM', 'DM', 'CM'], lane: 'narrow' },
      { x: 0.69, positions: ['AM'] },
      { x: 0.86, positions: ['ST', 'ST'], lane: 'narrow' },
    ],
    ['losango', 'centro'],
  ),
  preset(
    '4-2-2-2',
    'backFour',
    'Dois volantes, dois meias e dupla de referência.',
    [
      { x: 0.27, positions: backFour },
      { x: 0.48, positions: ['DM', 'DM'], lane: 'narrow' },
      { x: 0.67, positions: ['AM', 'AM'], lane: 'narrow' },
      { x: 0.86, positions: ['ST', 'ST'], lane: 'narrow' },
    ],
    ['quadrado central', 'dupla de ataque'],
  ),
  preset(
    '4-3-2-1',
    'backFour',
    'Árvore de Natal compacta por dentro.',
    [
      { x: 0.27, positions: backFour },
      { x: 0.5, positions: ['CM', 'DM', 'CM'], lane: 'narrow' },
      { x: 0.7, positions: ['AM', 'AM'], lane: 'narrow' },
      { x: 0.88, positions: ['ST'] },
    ],
    ['compacto', 'entrelinhas'],
  ),
  preset(
    '4-1-2-1-2',
    'backFour',
    'Losango clássico com largura dos laterais.',
    [
      { x: 0.27, positions: backFour },
      { x: 0.44, positions: ['DM'] },
      { x: 0.58, positions: ['CM', 'CM'], lane: 'narrow' },
      { x: 0.72, positions: ['AM'] },
      { x: 0.87, positions: ['ST', 'ST'], lane: 'narrow' },
    ],
    ['losango', 'laterais'],
  ),
  preset(
    '4-2-4',
    'backFour',
    'Estrutura agressiva com quatro homens na última linha.',
    [
      { x: 0.27, positions: backFour },
      { x: 0.52, positions: ['CM', 'CM'], lane: 'narrow' },
      { x: 0.85, positions: ['LW', 'ST', 'ST', 'RW'] },
    ],
    ['agressiva', 'amplitude'],
  ),
  preset(
    '3-5-2',
    'backThree',
    'Três zagueiros, alas e dupla de ataque.',
    [
      { x: 0.25, positions: backThree, lane: 'narrow' },
      { x: 0.57, positions: ['LW', 'CM', 'DM', 'CM', 'RW'] },
      { x: 0.86, positions: ['ST', 'ST'], lane: 'narrow' },
    ],
    ['alas', 'dupla de ataque'],
  ),
  preset(
    '3-4-3',
    'backThree',
    'Saída com três e amplitude em duas alturas.',
    [
      { x: 0.25, positions: backThree, lane: 'narrow' },
      { x: 0.56, positions: ['LW', 'CM', 'CM', 'RW'] },
      { x: 0.84, positions: ['LW', 'ST', 'RW'] },
    ],
    ['amplitude', 'saída de três'],
  ),
  preset(
    '3-4-2-1',
    'backThree',
    'Dois meias interiores apoiando uma referência.',
    [
      { x: 0.25, positions: backThree, lane: 'narrow' },
      { x: 0.54, positions: ['LW', 'CM', 'CM', 'RW'] },
      { x: 0.71, positions: ['AM', 'AM'], lane: 'narrow' },
      { x: 0.88, positions: ['ST'] },
    ],
    ['entrelinhas', 'alas'],
  ),
  preset(
    '3-1-4-2',
    'backThree',
    'Volante fixo, linha de quatro e dois atacantes.',
    [
      { x: 0.24, positions: backThree, lane: 'narrow' },
      { x: 0.42, positions: ['DM'] },
      { x: 0.62, positions: ['LW', 'CM', 'CM', 'RW'] },
      { x: 0.87, positions: ['ST', 'ST'], lane: 'narrow' },
    ],
    ['volante', 'alas'],
  ),
  preset(
    '3-2-4-1',
    'backThree',
    'Base de cinco na construção e quatro apoios altos.',
    [
      { x: 0.24, positions: backThree, lane: 'narrow' },
      { x: 0.45, positions: ['DM', 'DM'], lane: 'narrow' },
      { x: 0.69, positions: ['LW', 'AM', 'AM', 'RW'] },
      { x: 0.88, positions: ['ST'] },
    ],
    ['construção', 'ocupação alta'],
  ),
  preset(
    '3-4-1-2',
    'backThree',
    'Losango alto com alas e dupla ofensiva.',
    [
      { x: 0.24, positions: backThree, lane: 'narrow' },
      { x: 0.54, positions: ['LW', 'CM', 'CM', 'RW'] },
      { x: 0.7, positions: ['AM'] },
      { x: 0.87, positions: ['ST', 'ST'], lane: 'narrow' },
    ],
    ['armador', 'dupla de ataque'],
  ),
  preset(
    '5-3-2',
    'backFive',
    'Linha de cinco protegida por trio central.',
    [
      { x: 0.27, positions: backFive },
      { x: 0.57, positions: ['CM', 'DM', 'CM'], lane: 'narrow' },
      { x: 0.86, positions: ['ST', 'ST'], lane: 'narrow' },
    ],
    ['proteção', 'transição'],
  ),
  preset(
    '5-2-3',
    'backFive',
    'Segurança atrás com três referências abertas.',
    [
      { x: 0.27, positions: backFive },
      { x: 0.54, positions: ['CM', 'CM'], lane: 'narrow' },
      { x: 0.84, positions: ['LW', 'ST', 'RW'] },
    ],
    ['amplitude', 'transição'],
  ),
  preset(
    '5-4-1',
    'backFive',
    'Duas linhas compactas e uma referência.',
    [
      { x: 0.27, positions: backFive },
      { x: 0.59, positions: ['LW', 'CM', 'CM', 'RW'] },
      { x: 0.88, positions: ['ST'] },
    ],
    ['compacto', 'bloco baixo'],
  ),
  preset(
    '5-2-1-2',
    'backFive',
    'Dois médios, um armador e dupla de saída.',
    [
      { x: 0.27, positions: backFive },
      { x: 0.52, positions: ['CM', 'CM'], lane: 'narrow' },
      { x: 0.69, positions: ['AM'] },
      { x: 0.87, positions: ['ST', 'ST'], lane: 'narrow' },
    ],
    ['armador', 'dupla de ataque'],
  ),
];

const presetById = new Map(formationPresets.map((item) => [item.id, item] as const));

export const getFormationPreset = (formation: Formation) => {
  const result = presetById.get(formation);
  if (!result) throw new Error(`Preset tático ausente: ${formation}`);
  return result;
};

export const getFormationSlots = (formation: Formation) => getFormationPreset(formation).slots;

const placementFromSlot = (
  player: Player,
  slot: TacticalSlot,
  revision: number,
): TacticalPlayerPlacement => ({
  playerId: player.id,
  normalizedX: slot.x,
  normalizedY: slot.y,
  positionId: slot.position,
  roleId: slot.role,
  side: slot.side,
  line: slot.line,
  zone: slot.zone,
  sourcePresetSlotId: slot.id,
  revision,
});

const naturalSideFor = (position: Position): TacticalSide | null => {
  if (position === 'LB' || position === 'LW') return 'left';
  if (position === 'RB' || position === 'RW') return 'right';
  return null;
};

const assignmentCost = (
  player: Player,
  current: TacticalPlayerPlacement | null,
  slot: TacticalSlot,
  mode: PresetApplicationMode,
) => {
  if ((player.position === 'GK') !== (slot.position === 'GK')) return 1_000_000;
  const distance = current
    ? Math.hypot(current.normalizedX - slot.x, current.normalizedY - slot.y)
    : 0.5;
  if (mode === 'geometry') {
    return distance * 10_000 + (current?.positionId === slot.position ? 0 : 1);
  }
  const familiarity = slot.naturalPositions.includes(player.position)
    ? 0
    : slot.familiarPositions.includes(player.position)
      ? 1_200
      : 7_000;
  const nominalPosition = current?.positionId === slot.position ? 0 : 180;
  const naturalSide = naturalSideFor(player.position);
  const side = naturalSide === null || naturalSide === slot.side ? 0 : 650;
  const currentSide = !current || current.side === slot.side ? 0 : 90;
  const currentLine = !current || current.line === slot.line ? 0 : 120;
  const benchPromotion = current ? 0 : 350;
  return (
    familiarity +
    nominalPosition +
    side +
    currentSide +
    currentLine +
    benchPromotion +
    distance * 500
  );
};

const assignPlayersToSlots = (
  draft: TacticalPlanSnapshot,
  slots: readonly TacticalSlot[],
  players: readonly Player[],
  mode: PresetApplicationMode,
) => {
  const playerById = new Map(players.map((player) => [player.id, player] as const));
  const currentByPlayer = new Map(
    draft.placements.map((placement) => [placement.playerId, placement] as const),
  );
  const candidateIds =
    mode === 'geometry'
      ? draft.placements.map(({ playerId }) => playerId)
      : [...new Set([...draft.placements.map(({ playerId }) => playerId), ...draft.bench])];
  const candidates = candidateIds
    .map((playerId) => ({
      current: currentByPlayer.get(playerId) ?? null,
      player: playerById.get(playerId),
    }))
    .filter(
      (candidate): candidate is { current: TacticalPlayerPlacement | null; player: Player } =>
        candidate.player !== undefined,
    )
    .sort((left, right) => left.player.id.localeCompare(right.player.id));
  if (candidates.length < slots.length) {
    throw new Error('O preset não pode ser aplicado sem onze jogadores válidos.');
  }

  const rowCount = slots.length;
  const columnCount = candidates.length;
  const rowPotential = Array.from({ length: rowCount + 1 }, () => 0);
  const columnPotential = Array.from({ length: columnCount + 1 }, () => 0);
  const columnMatch = Array.from({ length: columnCount + 1 }, () => 0);
  const previousColumn = Array.from({ length: columnCount + 1 }, () => 0);

  for (let row = 1; row <= rowCount; row += 1) {
    columnMatch[0] = row;
    let column = 0;
    const minimum = Array.from({ length: columnCount + 1 }, () => Number.POSITIVE_INFINITY);
    const used = Array.from({ length: columnCount + 1 }, () => false);
    do {
      used[column] = true;
      const matchedRow = columnMatch[column]!;
      let delta = Number.POSITIVE_INFINITY;
      let nextColumn = 0;
      for (let candidateColumn = 1; candidateColumn <= columnCount; candidateColumn += 1) {
        if (used[candidateColumn]) continue;
        const candidate = candidates[candidateColumn - 1]!;
        const cost =
          assignmentCost(candidate.player, candidate.current, slots[matchedRow - 1]!, mode) -
          rowPotential[matchedRow]! -
          columnPotential[candidateColumn]!;
        if (cost < minimum[candidateColumn]!) {
          minimum[candidateColumn] = cost;
          previousColumn[candidateColumn] = column;
        }
        if (minimum[candidateColumn]! < delta) {
          delta = minimum[candidateColumn]!;
          nextColumn = candidateColumn;
        }
      }
      for (let candidateColumn = 0; candidateColumn <= columnCount; candidateColumn += 1) {
        if (used[candidateColumn]) {
          rowPotential[columnMatch[candidateColumn]!] += delta;
          columnPotential[candidateColumn] -= delta;
        } else {
          minimum[candidateColumn] -= delta;
        }
      }
      column = nextColumn;
    } while (columnMatch[column] !== 0);
    do {
      const nextColumn = previousColumn[column]!;
      columnMatch[column] = columnMatch[nextColumn]!;
      column = nextColumn;
    } while (column !== 0);
  }

  const assignment = Array.from({ length: rowCount }, () => -1);
  for (let column = 1; column <= columnCount; column += 1) {
    const row = columnMatch[column]!;
    if (row > 0 && row <= rowCount) assignment[row - 1] = column - 1;
  }
  if (assignment.some((candidateIndex) => candidateIndex < 0)) {
    throw new Error('Não foi possível calcular uma escalação compatível.');
  }
  return assignment.map((candidateIndex) => candidates[candidateIndex]!);
};

export const createTacticalPlan = (
  players: readonly Player[],
  formation: Formation,
): TacticalPlanSnapshot => {
  const selected = players.filter((player) => player.selected).slice(0, 11);
  const selectedIds = new Set(selected.map((player) => player.id));
  const presetDefinition = getFormationPreset(formation);
  const createdAt = Date.now();
  const initial: TacticalPlanSnapshot = {
    schemaVersion: 4,
    variationId: 'tactical-variation.primary',
    name: formation,
    sourcePresetId: formation,
    formation,
    placements: presetDefinition.slots.map((slot, index) =>
      placementFromSlot(selected[index] ?? players[index], slot, 0),
    ),
    bench: players
      .filter((player) => !selectedIds.has(player.id))
      .slice(0, 7)
      .map((player) => player.id),
    customFormation: {
      id: 'formation.primary',
      name: formation,
      isCustom: false,
      origin: 'legacy-migration',
      createdAtRevision: 0,
      updatedAtRevision: 0,
    },
    revision: 0,
    createdAt,
    updatedAt: createdAt,
  };
  return applyPresetToPlan(initial, formation, players, 'suggestion');
};

const newVariationId = () => {
  const uuid = globalThis.crypto?.randomUUID?.();
  return `tactical-variation.${uuid ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`}`;
};

export const forkTacticalVariation = (
  draft: TacticalPlanSnapshot,
  name: string,
  origin: 'current' | 'duplicate' | 'preset',
): TacticalPlanSnapshot => {
  const createdAt = Date.now();
  const variationId = newVariationId();
  return {
    ...draft,
    variationId,
    name: name.trim(),
    placements: draft.placements.map((placement) => ({ ...placement, revision: 0 })),
    bench: [...draft.bench],
    customFormation: {
      ...draft.customFormation,
      id: `formation.${variationId}`,
      name: name.trim(),
      origin,
      createdAtRevision: 0,
      updatedAtRevision: 0,
    },
    revision: 0,
    createdAt,
    updatedAt: createdAt,
  };
};

export const variationFromPreset = (
  draft: TacticalPlanSnapshot,
  players: readonly Player[],
  name: string,
): TacticalPlanSnapshot =>
  forkTacticalVariation(applyPresetToPlan(draft, draft.formation, players), name, 'preset');

export const applyPresetToPlan = (
  draft: TacticalPlanSnapshot,
  formation: Formation,
  players: readonly Player[],
  mode: PresetApplicationMode = 'suggestion',
): TacticalPlanSnapshot => {
  const slots = getFormationSlots(formation);
  const assignments = assignPlayersToSlots(draft, slots, players, mode);
  const placements = slots.map((slot, index) =>
    placementFromSlot(assignments[index]!.player, slot, draft.revision),
  );
  const assignedIds = new Set(placements.map(({ playerId }) => playerId));
  const demoted = draft.placements
    .map(({ playerId }) => playerId)
    .filter((playerId) => !assignedIds.has(playerId));
  const bench = draft.bench
    .map((playerId) => {
      if (!assignedIds.has(playerId)) return playerId;
      return demoted.shift() ?? null;
    })
    .filter((playerId): playerId is string => playerId !== null);
  bench.push(...demoted);
  return {
    ...draft,
    sourcePresetId: formation,
    formation,
    placements,
    bench: bench.slice(0, 7),
    customFormation: {
      ...draft.customFormation,
      name: draft.name,
      isCustom: false,
      origin: 'preset',
    },
  };
};

export const previewPresetApplication = (
  draft: TacticalPlanSnapshot,
  formation: Formation,
  players: readonly Player[],
): PresetApplicationPreview => {
  const suggestion = applyPresetToPlan(draft, formation, players, 'suggestion');
  const geometry = applyPresetToPlan(draft, formation, players, 'geometry');
  const currentByPlayer = new Map(
    draft.placements.map((placement) => [placement.playerId, placement] as const),
  );
  const keptPlayerIds: string[] = [];
  const repositionedPlayerIds: string[] = [];
  const roleChangedPlayerIds: string[] = [];
  for (const placement of suggestion.placements) {
    const current = currentByPlayer.get(placement.playerId);
    if (!current) continue;
    if (
      Math.abs(current.normalizedX - placement.normalizedX) < 0.000_001 &&
      Math.abs(current.normalizedY - placement.normalizedY) < 0.000_001
    ) {
      keptPlayerIds.push(placement.playerId);
    } else {
      repositionedPlayerIds.push(placement.playerId);
    }
    if (current.positionId !== placement.positionId) roleChangedPlayerIds.push(placement.playerId);
  }
  const ambiguousPlayerIds = suggestion.placements
    .filter((placement) => {
      const slot = getFormationSlots(formation).find(
        ({ id }) => id === placement.sourcePresetSlotId,
      );
      if (!slot) return false;
      const compatible = draft.placements.filter((current) => {
        const player = players.find(({ id }) => id === current.playerId);
        return player && slot.naturalPositions.includes(player.position);
      });
      return compatible.length > 1;
    })
    .map(({ playerId }) => playerId);
  const suggestedIds = new Set(suggestion.placements.map(({ playerId }) => playerId));
  const promotedPlayerIds = draft.bench.filter((playerId) => suggestedIds.has(playerId));
  const demotedPlayerIds = draft.placements
    .map(({ playerId }) => playerId)
    .filter((playerId) => !suggestedIds.has(playerId));
  return {
    formation,
    suggestion,
    geometry,
    keptPlayerIds,
    repositionedPlayerIds,
    roleChangedPlayerIds,
    ambiguousPlayerIds: [...new Set(ambiguousPlayerIds)],
    promotedPlayerIds,
    demotedPlayerIds,
  };
};

const customIdentity = (draft: TacticalPlanSnapshot) => ({
  ...draft.customFormation,
  name: draft.customFormation.isCustom
    ? draft.customFormation.name
    : `Minha ${draft.sourcePresetId ?? draft.formation}`,
  isCustom: true,
  origin: draft.customFormation.isCustom ? draft.customFormation.origin : 'manager',
});

export const movePlayerFreely = (
  draft: TacticalPlanSnapshot,
  playerId: string,
  normalizedX: number,
  normalizedY: number,
): TacticalPlanSnapshot => ({
  ...draft,
  placements: draft.placements.map((placement) =>
    placement.playerId === playerId
      ? {
          ...placement,
          normalizedX,
          normalizedY,
          side: sideFromY(normalizedY),
          line: lineFromX(normalizedX),
          zone: zoneFromX(normalizedX),
          sourcePresetSlotId: null,
        }
      : placement,
  ),
  customFormation: customIdentity(draft),
});

export const swapStarters = (
  draft: TacticalPlanSnapshot,
  sourcePlayerId: string,
  targetPlayerId: string,
): TacticalPlanSnapshot => {
  const source = draft.placements.find((item) => item.playerId === sourcePlayerId);
  const target = draft.placements.find((item) => item.playerId === targetPlayerId);
  if (!source || !target || sourcePlayerId === targetPlayerId) return draft;
  return {
    ...draft,
    placements: draft.placements.map((placement) => {
      if (placement.playerId === sourcePlayerId) {
        return { ...target, playerId: sourcePlayerId, positionId: target.positionId };
      }
      if (placement.playerId === targetPlayerId) {
        return { ...source, playerId: targetPlayerId, positionId: source.positionId };
      }
      return placement;
    }),
    customFormation: customIdentity(draft),
  };
};

export const substitutePlayers = (
  draft: TacticalPlanSnapshot,
  starterId: string,
  reserveId: string,
  dropCoordinate?: { readonly x: number; readonly y: number },
): TacticalPlanSnapshot => {
  const starter = draft.placements.find((item) => item.playerId === starterId);
  const reserveIndex = draft.bench.indexOf(reserveId);
  if (!starter || reserveIndex < 0) return draft;
  const bench = [...draft.bench];
  bench[reserveIndex] = starterId;
  const x = dropCoordinate?.x ?? starter.normalizedX;
  const y = dropCoordinate?.y ?? starter.normalizedY;
  return {
    ...draft,
    placements: draft.placements.map((placement) =>
      placement.playerId === starterId
        ? {
            ...placement,
            playerId: reserveId,
            normalizedX: x,
            normalizedY: y,
            side: sideFromY(y),
            line: lineFromX(x),
            zone: zoneFromX(x),
            sourcePresetSlotId: null,
          }
        : placement,
    ),
    bench,
    customFormation: customIdentity(draft),
  };
};

export const reorderBench = (
  draft: TacticalPlanSnapshot,
  sourcePlayerId: string,
  targetPlayerId: string,
): TacticalPlanSnapshot => {
  const sourceIndex = draft.bench.indexOf(sourcePlayerId);
  const targetIndex = draft.bench.indexOf(targetPlayerId);
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return draft;
  const bench = [...draft.bench];
  [bench[sourceIndex], bench[targetIndex]] = [bench[targetIndex], bench[sourceIndex]];
  return { ...draft, bench };
};

export const renameCustomFormation = (
  draft: TacticalPlanSnapshot,
  name: string,
): TacticalPlanSnapshot => ({
  ...draft,
  name,
  customFormation: { ...customIdentity(draft), name },
});

export const selectedIdsFromPlan = (draft: TacticalPlanSnapshot) =>
  draft.placements.map((placement) => placement.playerId);

export const syncPlanWithLineupSlots = (
  draft: TacticalPlanSnapshot,
  slots: LineupSlots,
  players: readonly Player[],
): TacticalPlanSnapshot => {
  const desired = selectedIdsFromSlots(slots);
  if (desired.length !== 11 || new Set(desired).size !== 11) return draft;
  const desiredSet = new Set(desired);
  const previousBench = draft.bench.filter((playerId) => !desiredSet.has(playerId));
  const removedStarters = draft.placements
    .map(({ playerId }) => playerId)
    .filter((playerId) => !desiredSet.has(playerId));
  const remainingPlayers = players
    .map(({ id }) => id)
    .filter((playerId) => !desiredSet.has(playerId));
  const bench = [...new Set([...previousBench, ...removedStarters, ...remainingPlayers])].slice(
    0,
    7,
  );
  return {
    ...draft,
    placements: draft.placements.map((placement, index) => ({
      ...placement,
      playerId: desired[index] ?? placement.playerId,
    })),
    bench,
  };
};

export const validateTacticalDraft = (
  draft: TacticalPlanSnapshot,
  players: readonly Player[],
): TacticalDraftValidation => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const playerById = new Map(players.map((player) => [player.id, player] as const));
  const allIds = [...selectedIdsFromPlan(draft), ...draft.bench];
  if (draft.schemaVersion !== 4) errors.push('Versão do plano incompatível.');
  if (draft.placements.length !== 11) errors.push('O campo precisa de exatamente 11 titulares.');
  if (draft.bench.length > 7) errors.push('O banco excede o limite de 7 jogadores.');
  if (new Set(allIds).size !== allIds.length)
    errors.push('Um jogador aparece mais de uma vez no plano.');
  if (allIds.some((playerId) => !playerById.has(playerId)))
    errors.push('O plano referencia um jogador inexistente.');
  if (
    draft.placements.some(
      ({ normalizedX, normalizedY }) =>
        !Number.isFinite(normalizedX) ||
        !Number.isFinite(normalizedY) ||
        normalizedX < 0 ||
        normalizedX > 1 ||
        normalizedY < 0 ||
        normalizedY > 1,
    )
  )
    errors.push('Há jogador fora dos limites do campo.');
  const goalkeepers = draft.placements.filter(
    ({ playerId }) => playerById.get(playerId)?.position === 'GK',
  );
  if (goalkeepers.length !== 1) errors.push('A escalação precisa de exatamente um goleiro.');
  return { valid: errors.length === 0, errors: [...new Set(errors)], warnings };
};

export const toTacticalPlanProposal = (
  draft: TacticalPlanSnapshot,
  approach: TacticalPlanProposal['approach'],
): TacticalPlanProposal => ({
  expectedRevision: draft.revision,
  variationId: draft.variationId,
  name: draft.name,
  sourcePresetId: draft.sourcePresetId,
  formation: draft.formation,
  placements: draft.placements,
  bench: draft.bench,
  customFormation: draft.customFormation,
  tacticalConfig: draft.tacticalModel?.config,
  approach,
});

export const findNearestStarter = (
  draft: TacticalPlanSnapshot,
  normalizedX: number,
  normalizedY: number,
) =>
  draft.placements.reduce<TacticalPlayerPlacement | null>((nearest, placement) => {
    if (!nearest) return placement;
    const candidateDistance = Math.hypot(
      placement.normalizedX - normalizedX,
      placement.normalizedY - normalizedY,
    );
    const nearestDistance = Math.hypot(
      nearest.normalizedX - normalizedX,
      nearest.normalizedY - normalizedY,
    );
    return candidateDistance < nearestDistance ? placement : nearest;
  }, null);

export const findDirectionalSlotIndex = (
  slots: readonly Pick<TacticalSlot, 'x' | 'y'>[],
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

export const createLineupSlots = (players: readonly Player[]): LineupSlots =>
  Array.from(
    { length: 11 },
    (_, index) => players.filter((player) => player.selected)[index]?.id ?? null,
  );

export const selectedIdsFromSlots = (slots: LineupSlots) =>
  slots.filter((playerId): playerId is string => playerId !== null);

export const hasSameSelectedPlayers = (slots: LineupSlots, selectedPlayerIds: readonly string[]) =>
  selectedIdsFromSlots(slots).length === selectedPlayerIds.length &&
  selectedIdsFromSlots(slots).every((playerId) => selectedPlayerIds.includes(playerId));

export const normalizeStoredSlots = (
  candidate: unknown,
  players: readonly Player[],
): LineupSlots | null => {
  if (!Array.isArray(candidate) || candidate.length !== 11) return null;
  const validIds = new Set(players.map((player) => player.id));
  const seen = new Set<string>();
  const normalized = candidate.map((value) => {
    if (value === null) return null;
    if (typeof value !== 'string' || !validIds.has(value) || seen.has(value)) return undefined;
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
  if (sourceIndex >= 0) next[sourceIndex] = targetPlayer;
  next[targetIndex] = playerId;
  return next;
};

export const removePlayerFromSlots = (slots: LineupSlots, playerId: string): LineupSlots =>
  slots.map((candidate) => (candidate === playerId ? null : candidate));

export const addPlayerToFirstOpenSlot = (slots: LineupSlots, playerId: string): LineupSlots => {
  if (slots.includes(playerId)) return slots;
  const openIndex = slots.indexOf(null);
  return openIndex < 0 ? slots : placePlayerInSlot(slots, playerId, openIndex);
};

export const getPositionFamiliarity = (
  position: Position,
  tacticalSlot:
    Pick<TacticalSlot, 'naturalPositions' | 'familiarPositions'> | TacticalPlayerPlacement,
): PositionFamiliarity => {
  const naturalPositions =
    'naturalPositions' in tacticalSlot ? tacticalSlot.naturalPositions : [tacticalSlot.positionId];
  const familiarPositions =
    'familiarPositions' in tacticalSlot
      ? tacticalSlot.familiarPositions
      : familiarityFor(tacticalSlot.positionId);
  if (naturalPositions.includes(position)) return { label: 'Natural', score: 100, tone: 'natural' };
  if (familiarPositions.includes(position))
    return { label: 'Familiar', score: 76, tone: 'familiar' };
  return { label: 'Em adaptação', score: 42, tone: 'adapting' };
};
