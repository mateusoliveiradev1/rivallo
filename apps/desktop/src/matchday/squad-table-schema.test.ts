import { describe, expect, it } from 'vitest';

import {
  applyTableViewCommand,
  isTableViewDirty,
  normalizeTableViewState,
  type TableViewCommand,
  type TableViewState,
} from '../table-view/table-view-engine.js';
import {
  applySquadTableView,
  createSquadDurableFilter,
  SQUAD_COLUMN_IDS,
  SQUAD_SYSTEM_VIEW,
  SQUAD_TABLE_SCHEMA,
} from './squad-table-schema.js';
import { POSITION_SORT_ORDER } from './squad-sort.js';
import type { Player, Position } from './types.js';

const player = (id: string, name: string, overrides: Partial<Player> = {}): Player => ({
  id,
  name,
  shortName: name,
  shirtNumber: 10,
  position: 'CM',
  age: 25,
  nationality: 'BRA',
  heightCm: 180,
  preferredFoot: 'right',
  squadRole: 'rotation',
  rating: 75,
  potentialRating: 80,
  matchFitness: 92,
  morale: 80,
  condition: 95,
  appearances: 12,
  goals: 0,
  assists: 4,
  averageRating: 7.1,
  selected: false,
  ...overrides,
});

const players: readonly Player[] = [
  player('player.st', 'Bruno', {
    shirtNumber: 9,
    position: 'ST',
    goals: 8,
    selected: true,
  }),
  player('player.gk', 'Caio', {
    shirtNumber: 1,
    position: 'GK',
    matchFitness: 88,
    condition: 96,
  }),
  player('player.cb', 'Davi', {
    shirtNumber: 4,
    position: 'CB',
    goals: 1,
    matchFitness: 95,
    condition: 95,
  }),
  player('player.cm', 'Álvaro', {
    shirtNumber: 8,
    position: 'CM',
    goals: 8,
    selected: true,
  }),
  player('player.lw', 'Enzo', {
    shirtNumber: 11,
    position: 'LW',
    goals: 0,
    condition: 70,
  }),
];

const dispatch = (state: TableViewState, command: TableViewCommand) => {
  const result = applyTableViewCommand(SQUAD_TABLE_SCHEMA, state, command);
  if (!result.accepted) throw new Error(result.event.reason.code);
  return result.state;
};

describe('Elenco table schema', () => {
  it('freezes the exact local-fixed identity, bounds, density, and one-page client window', () => {
    expect(SQUAD_TABLE_SCHEMA).toMatchObject({
      tableId: 'squad.primary',
      schemaVersion: 1,
      ownerScope: 'local-fixed',
      constraints: {
        maxColumns: 18,
        maxPinnedColumns: 4,
        maxPinnedWidthRatio: 0.5,
        maxSortClauses: 3,
        maxFilterDepth: 2,
        maxFilterClauses: 12,
        maxGroupingClauses: 0,
      },
      groupingSupported: false,
      dataWindow: {
        mode: 'client-pagination',
        pageSizeOptions: [25],
        defaultPageSize: 25,
        maxPage: 1,
      },
      densities: [
        { densityId: 'compact', rowHeight: 44 },
        { densityId: 'standard', rowHeight: 48 },
        { densityId: 'comfortable', rowHeight: 54 },
      ],
    });
    expect(SQUAD_SYSTEM_VIEW).toMatchObject({
      tableId: 'squad.primary',
      schemaVersion: 1,
      ownerScope: 'local-fixed',
      provenance: 'system-default',
      density: 'compact',
      grouping: [],
      dataWindow: {
        mode: 'client-pagination',
        page: 1,
        pageSize: 25,
      },
    });
  });

  it('declares all 18 stable columns with exact labels, widths, required state, and pins', () => {
    expect(SQUAD_COLUMN_IDS).toEqual([
      'shirtNumber',
      'info',
      'name',
      'position',
      'age',
      'nationality',
      'heightCm',
      'preferredFoot',
      'squadRole',
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
    expect(
      SQUAD_TABLE_SCHEMA.columns.map(
        ({ columnId, label, required, requiredReason, defaultVisible, width, defaultPinning }) => ({
          columnId,
          label,
          required,
          requiredReason,
          defaultVisible,
          width,
          defaultPinning,
        }),
      ),
    ).toEqual([
      {
        columnId: 'shirtNumber',
        label: 'Nº',
        required: true,
        requiredReason: 'Obrigatória para manter a numeração real do plantel.',
        defaultVisible: true,
        width: { default: 56, min: 48, max: 72 },
        defaultPinning: { side: 'start', order: 0 },
      },
      {
        columnId: 'info',
        label: 'XI',
        required: true,
        requiredReason: 'Obrigatória para escalar ou retirar jogadores do XI.',
        defaultVisible: true,
        width: { default: 56, min: 48, max: 72 },
        defaultPinning: { side: 'start', order: 1 },
      },
      {
        columnId: 'name',
        label: 'Jogador',
        required: true,
        requiredReason: 'Obrigatória para identificar cada jogador.',
        defaultVisible: true,
        width: { default: 240, min: 200, max: 360 },
        defaultPinning: { side: 'start', order: 2 },
      },
      {
        columnId: 'position',
        label: 'POS',
        required: true,
        requiredReason: 'Obrigatória para manter a posição principal visível.',
        defaultVisible: true,
        width: { default: 80, min: 72, max: 104 },
        defaultPinning: { side: 'none', order: null },
      },
      {
        columnId: 'age',
        label: 'Idade',
        required: false,
        requiredReason: null,
        defaultVisible: true,
        width: { default: 64, min: 56, max: 80 },
        defaultPinning: { side: 'none', order: null },
      },
      {
        columnId: 'nationality',
        label: 'NAT',
        required: false,
        requiredReason: null,
        defaultVisible: true,
        width: { default: 96, min: 80, max: 144 },
        defaultPinning: { side: 'none', order: null },
      },
      {
        columnId: 'heightCm',
        label: 'Altura',
        required: false,
        requiredReason: null,
        defaultVisible: true,
        width: { default: 80, min: 72, max: 104 },
        defaultPinning: { side: 'none', order: null },
      },
      {
        columnId: 'preferredFoot',
        label: 'Pé',
        required: false,
        requiredReason: null,
        defaultVisible: true,
        width: { default: 88, min: 72, max: 120 },
        defaultPinning: { side: 'none', order: null },
      },
      {
        columnId: 'squadRole',
        label: 'Função',
        required: false,
        requiredReason: null,
        defaultVisible: true,
        width: { default: 128, min: 112, max: 176 },
        defaultPinning: { side: 'none', order: null },
      },
      {
        columnId: 'rating',
        label: 'CA',
        required: false,
        requiredReason: null,
        defaultVisible: true,
        width: { default: 64, min: 56, max: 80 },
        defaultPinning: { side: 'none', order: null },
      },
      {
        columnId: 'potentialRating',
        label: 'PA',
        required: false,
        requiredReason: null,
        defaultVisible: true,
        width: { default: 64, min: 56, max: 80 },
        defaultPinning: { side: 'none', order: null },
      },
      {
        columnId: 'matchFitness',
        label: 'Ritmo',
        required: false,
        requiredReason: null,
        defaultVisible: true,
        width: { default: 96, min: 80, max: 120 },
        defaultPinning: { side: 'none', order: null },
      },
      {
        columnId: 'morale',
        label: 'Moral',
        required: false,
        requiredReason: null,
        defaultVisible: true,
        width: { default: 80, min: 72, max: 104 },
        defaultPinning: { side: 'none', order: null },
      },
      {
        columnId: 'condition',
        label: 'Cond.',
        required: false,
        requiredReason: null,
        defaultVisible: true,
        width: { default: 88, min: 72, max: 112 },
        defaultPinning: { side: 'none', order: null },
      },
      {
        columnId: 'appearances',
        label: 'Jogos',
        required: false,
        requiredReason: null,
        defaultVisible: true,
        width: { default: 72, min: 56, max: 88 },
        defaultPinning: { side: 'none', order: null },
      },
      {
        columnId: 'goals',
        label: 'Gols',
        required: false,
        requiredReason: null,
        defaultVisible: true,
        width: { default: 64, min: 56, max: 80 },
        defaultPinning: { side: 'none', order: null },
      },
      {
        columnId: 'assists',
        label: 'Assist.',
        required: false,
        requiredReason: null,
        defaultVisible: true,
        width: { default: 72, min: 56, max: 88 },
        defaultPinning: { side: 'none', order: null },
      },
      {
        columnId: 'averageRating',
        label: 'Média',
        required: false,
        requiredReason: null,
        defaultVisible: true,
        width: { default: 80, min: 64, max: 96 },
        defaultPinning: { side: 'none', order: null },
      },
    ]);
  });

  it('separates operation capabilities from labels and locks the three fixed start pins', () => {
    const byId = Object.fromEntries(
      SQUAD_TABLE_SCHEMA.columns.map((column) => [column.columnId, column]),
    );

    expect(byId.shirtNumber.capabilities).toMatchObject({
      hideable: false,
      reorderable: true,
      resizable: true,
      pinnable: false,
      sortable: true,
      filterOperators: [],
    });
    expect(byId.shirtNumber.pinningLocked).toBe(true);
    expect(byId.info.capabilities.filterOperators).toEqual([
      {
        operator: 'one-of',
        valueKind: 'enum-set',
        allowedValues: ['selected', 'reserve'],
      },
    ]);
    expect(byId.info.pinningLocked).toBe(true);
    expect(byId.name.capabilities.filterOperators).toEqual([
      { operator: 'contains', valueKind: 'text' },
    ]);
    expect(byId.name.pinningLocked).toBe(true);
    expect(byId.position.capabilities).toMatchObject({
      hideable: false,
      pinnable: true,
      sortable: true,
      filterOperators: [
        {
          operator: 'one-of',
          valueKind: 'enum-set',
          allowedValues: POSITION_SORT_ORDER,
        },
      ],
      groupingModes: [],
    });
    for (const columnId of SQUAD_COLUMN_IDS.slice(4)) {
      expect(byId[columnId].capabilities).toMatchObject({
        hideable: true,
        reorderable: true,
        resizable: true,
        pinnable: true,
        sortable: true,
        groupingModes: [],
      });
    }
    expect(
      byId.goals.capabilities.filterOperators.map(({ operator, valueKind }) => ({
        operator,
        valueKind,
      })),
    ).toEqual([
      { operator: 'equals', valueKind: 'number' },
      { operator: 'greater-than', valueKind: 'number' },
      { operator: 'greater-than-or-equal', valueKind: 'number' },
      { operator: 'less-than', valueKind: 'number' },
      { operator: 'less-than-or-equal', valueKind: 'number' },
    ]);
  });

  it('keeps localized labels outside persisted identity and semantic dirty comparison', () => {
    const translatedSchema = {
      ...SQUAD_TABLE_SCHEMA,
      columns: SQUAD_TABLE_SCHEMA.columns.map((column) => ({
        ...column,
        label: `English:${column.columnId}`,
      })),
      densities: SQUAD_TABLE_SCHEMA.densities.map((density) => ({
        ...density,
        label: `English:${density.densityId}`,
      })),
    };

    expect(normalizeTableViewState(translatedSchema, SQUAD_SYSTEM_VIEW)).toEqual(
      normalizeTableViewState(SQUAD_TABLE_SCHEMA, SQUAD_SYSTEM_VIEW),
    );
    expect(isTableViewDirty(translatedSchema, SQUAD_SYSTEM_VIEW, SQUAD_SYSTEM_VIEW)).toBe(false);
  });
});

describe('Elenco ordinary football pipeline', () => {
  it('preserves GOL-to-ATA default order and stable player IDs', () => {
    const result = applySquadTableView(players, SQUAD_SYSTEM_VIEW, {
      focusedPlayerId: 'player.st',
      selectedPlayerIds: ['player.cm', 'player.st'],
    });

    const positionRanks = result.rows.map(({ position }) => POSITION_SORT_ORDER.indexOf(position));
    expect(positionRanks).toEqual([...positionRanks].sort((left, right) => left - right));
    expect(result.rows.map(({ id }) => id)).toEqual([
      'player.gk',
      'player.cb',
      'player.cm',
      'player.lw',
      'player.st',
    ]);
    expect(result.focusedPlayerId).toBe('player.st');
    expect(result.selectedPlayerIds).toEqual(['player.cm', 'player.st']);
    expect(result.rows.find(({ id }) => id === 'player.st')?.selected).toBe(true);
  });

  it('normalizes Todos/Titulares/Reservas, Setor, Status, and optional Posição as durable filters', () => {
    const all = createSquadDurableFilter({
      lineup: 'all',
      sector: 'all',
      status: 'all',
      positions: [],
    });
    expect(all.children).toEqual([]);

    const starters = dispatch(SQUAD_SYSTEM_VIEW, {
      type: 'filter.set',
      filter: createSquadDurableFilter({
        lineup: 'selected',
        sector: 'all',
        status: 'all',
        positions: [],
      }),
    });
    expect(applySquadTableView(players, starters).rows.map(({ id }) => id)).toEqual([
      'player.cm',
      'player.st',
    ]);

    const reserves = dispatch(SQUAD_SYSTEM_VIEW, {
      type: 'filter.set',
      filter: createSquadDurableFilter({
        lineup: 'reserve',
        sector: 'all',
        status: 'all',
        positions: [],
      }),
    });
    expect(applySquadTableView(players, reserves).rows.every(({ selected }) => !selected)).toBe(
      true,
    );

    const defendersReady = dispatch(SQUAD_SYSTEM_VIEW, {
      type: 'filter.set',
      filter: createSquadDurableFilter({
        lineup: 'all',
        sector: 'defenders',
        status: 'ready',
        positions: [],
      }),
    });
    expect(applySquadTableView(players, defendersReady).rows.map(({ id }) => id)).toEqual([
      'player.cb',
    ]);

    const attention = dispatch(SQUAD_SYSTEM_VIEW, {
      type: 'filter.set',
      filter: createSquadDurableFilter({
        lineup: 'all',
        sector: 'all',
        status: 'attention',
        positions: ['GK', 'LW'],
      }),
    });
    expect(applySquadTableView(players, attention).rows.map(({ id }) => id)).toEqual([
      'player.gk',
      'player.lw',
    ]);
  });

  it('keeps the global player-name query explicitly transient', () => {
    const before = normalizeTableViewState(SQUAD_TABLE_SCHEMA, SQUAD_SYSTEM_VIEW);
    const result = applySquadTableView(players, SQUAD_SYSTEM_VIEW, {
      nameQuery: 'álv',
    });

    expect(result.rows.map(({ id }) => id)).toEqual(['player.cm']);
    expect(normalizeTableViewState(SQUAD_TABLE_SCHEMA, SQUAD_SYSTEM_VIEW)).toEqual(before);
    expect(SQUAD_SYSTEM_VIEW).not.toHaveProperty('nameQuery');
  });

  it('creates Mostrar somente gols only through ordinary engine commands', () => {
    let scorersView = SQUAD_SYSTEM_VIEW;
    for (const columnId of SQUAD_COLUMN_IDS) {
      const column = SQUAD_TABLE_SCHEMA.columns.find(
        (candidate) => candidate.columnId === columnId,
      )!;
      if (!column.required && columnId !== 'goals') {
        scorersView = dispatch(scorersView, {
          type: 'column.visibility',
          columnId,
          visible: false,
        });
      }
    }
    scorersView = dispatch(scorersView, {
      type: 'sort.set',
      sort: [
        { columnId: 'goals', direction: 'desc', nulls: 'last' },
        { columnId: 'name', direction: 'asc', nulls: 'last' },
      ],
    });
    scorersView = dispatch(scorersView, {
      type: 'filter.set',
      filter: {
        kind: 'group',
        groupId: 'filters.root',
        logic: 'and',
        children: [
          {
            kind: 'clause',
            filterId: 'filter.goals',
            columnId: 'goals',
            operator: 'greater-than',
            value: { kind: 'number', value: 0 },
            enabled: true,
          },
        ],
      },
    });
    scorersView = dispatch(scorersView, {
      type: 'view.propose',
      viewId: 'squad.view.scorers',
      baselineViewId: SQUAD_SYSTEM_VIEW.viewId,
      provenance: 'user-owned',
      label: 'Mostrar somente gols',
    });

    expect(
      scorersView.columns.filter(({ visible }) => visible).map(({ columnId }) => columnId),
    ).toEqual(['shirtNumber', 'info', 'name', 'position', 'goals']);
    expect(scorersView.sort).toEqual([
      { columnId: 'goals', direction: 'desc', nulls: 'last' },
      { columnId: 'name', direction: 'asc', nulls: 'last' },
    ]);
    expect(scorersView.filter).toMatchObject({
      children: [
        {
          filterId: 'filter.goals',
          columnId: 'goals',
          operator: 'greater-than',
          value: { kind: 'number', value: 0 },
          enabled: true,
        },
      ],
    });
    expect(scorersView.grouping).toEqual([]);
    expect(scorersView).not.toHaveProperty('goalsOnly');

    const result = applySquadTableView(players, scorersView, {
      focusedPlayerId: 'player.st',
      selectedPlayerIds: ['player.cm', 'player.st'],
    });
    expect(result.rows.map(({ id }) => id)).toEqual(['player.cm', 'player.st', 'player.cb']);
    expect(result.rows.map(({ goals }) => goals)).toEqual([8, 8, 1]);
    expect(result.focusedPlayerId).toBe('player.st');
    expect(result.selectedPlayerIds).toEqual(['player.cm', 'player.st']);
  });

  it('keeps selection and focus keyed by player.id across sort, filter, and column order', () => {
    let state = dispatch(SQUAD_SYSTEM_VIEW, {
      type: 'column.reorder',
      columnId: 'goals',
      toIndex: 4,
    });
    state = dispatch(state, {
      type: 'sort.set',
      sort: [{ columnId: 'goals', direction: 'desc', nulls: 'last' }],
    });
    state = dispatch(state, {
      type: 'filter.set',
      filter: createSquadDurableFilter({
        lineup: 'all',
        sector: 'all',
        status: 'all',
        positions: ['CM', 'ST'],
      }),
    });

    const result = applySquadTableView(players, state, {
      focusedPlayerId: 'player.cm',
      selectedPlayerIds: ['player.st', 'player.cm'],
    });
    expect(result.rows.map(({ id }) => id).sort()).toEqual(['player.cm', 'player.st']);
    expect(result.focusedPlayerId).toBe('player.cm');
    expect(result.selectedPlayerIds).toEqual(['player.st', 'player.cm']);
    expect(result.rows.map(({ id, selected }) => ({ id, selected }))).toEqual([
      { id: 'player.cm', selected: true },
      { id: 'player.st', selected: true },
    ]);
  });

  it('keeps position values aligned with the full football order contract', () => {
    const reversedPlayers = POSITION_SORT_ORDER.toReversed().map((position, index) =>
      player(`position.${position}`, `Jogador ${index}`, { position }),
    );

    expect(
      applySquadTableView(reversedPlayers, SQUAD_SYSTEM_VIEW).rows.map(({ position }) => position),
    ).toEqual(POSITION_SORT_ORDER as readonly Position[]);
  });
});
