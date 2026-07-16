import { describe, expect, it } from 'vitest';

import {
  applyTableViewCommand,
  isTableViewDirty,
  normalizeTableViewState,
  TableViewStateValidationError,
  validateTableViewSchema,
  validateTableViewState,
  type TableViewCommand,
  type TableViewSchema,
  type TableViewState,
} from './table-view-engine.js';

const schemaFixture = (): TableViewSchema => ({
  tableId: 'fixture.players',
  schemaVersion: 1,
  ownerScope: 'local-fixed',
  columns: [
    {
      columnId: 'shirtNumber',
      label: 'Nº',
      required: true,
      requiredReason: 'Identifica a camisa do jogador.',
      defaultVisible: true,
      width: { default: 60, min: 52, max: 80 },
      defaultPinning: { side: 'start', order: 0 },
      capabilities: {
        hideable: false,
        reorderable: true,
        resizable: true,
        pinnable: true,
        sortable: true,
        filterOperators: [],
        groupingModes: [],
      },
    },
    {
      columnId: 'name',
      label: 'Jogador',
      required: true,
      requiredReason: 'Mantém a identidade do jogador visível.',
      defaultVisible: true,
      width: { default: 160, min: 120, max: 240 },
      defaultPinning: { side: 'none', order: null },
      capabilities: {
        hideable: false,
        reorderable: true,
        resizable: true,
        pinnable: true,
        sortable: true,
        filterOperators: [],
        groupingModes: [],
      },
    },
    {
      columnId: 'position',
      label: 'Posição',
      required: false,
      requiredReason: null,
      defaultVisible: true,
      width: { default: 100, min: 80, max: 140 },
      defaultPinning: { side: 'none', order: null },
      capabilities: {
        hideable: true,
        reorderable: true,
        resizable: true,
        pinnable: true,
        sortable: true,
        filterOperators: [
          {
            operator: 'one-of',
            valueKind: 'enum-set',
            allowedValues: ['GK', 'CB', 'CM', 'ST'],
          },
        ],
        groupingModes: [],
      },
    },
    {
      columnId: 'goals',
      label: 'Gols',
      required: false,
      requiredReason: null,
      defaultVisible: true,
      width: { default: 80, min: 64, max: 120 },
      defaultPinning: { side: 'none', order: null },
      capabilities: {
        hideable: true,
        reorderable: true,
        resizable: true,
        pinnable: true,
        sortable: true,
        filterOperators: [
          { operator: 'equals', valueKind: 'number' },
          { operator: 'greater-than', valueKind: 'number' },
        ],
        groupingModes: [],
      },
    },
  ],
  densities: [
    { densityId: 'compact', label: 'Compacta', rowHeight: 44 },
    { densityId: 'standard', label: 'Padrão', rowHeight: 48 },
  ],
  constraints: {
    maxColumns: 4,
    maxPinnedColumns: 2,
    maxPinnedWidthRatio: 0.7,
    maxSortClauses: 2,
    maxFilterDepth: 2,
    maxFilterClauses: 3,
    maxGroupingClauses: 0,
  },
  groupingSupported: false,
  dataWindow: {
    mode: 'client-pagination',
    pageSizeOptions: [25],
    defaultPageSize: 25,
    maxPage: 10,
  },
});

const stateFixture = (): TableViewState => ({
  tableId: 'fixture.players',
  schemaVersion: 1,
  ownerScope: 'local-fixed',
  viewId: 'view.system-default',
  baselineViewId: 'view.system-default',
  provenance: 'system-default',
  label: 'Padrão',
  density: 'compact',
  columns: [
    {
      columnId: 'shirtNumber',
      visible: true,
      width: 60,
      pinning: { side: 'start', order: 0 },
    },
    {
      columnId: 'name',
      visible: true,
      width: 160,
      pinning: { side: 'none', order: null },
    },
    {
      columnId: 'position',
      visible: true,
      width: 100,
      pinning: { side: 'none', order: null },
    },
    {
      columnId: 'goals',
      visible: true,
      width: 80,
      pinning: { side: 'none', order: null },
    },
  ],
  sort: [{ columnId: 'position', direction: 'asc', nulls: 'last' }],
  filter: {
    kind: 'group',
    groupId: 'filters.root',
    logic: 'and',
    children: [],
  },
  grouping: [],
  dataWindow: {
    windowId: 'window.first-page',
    mode: 'client-pagination',
    page: 1,
    pageSize: 25,
  },
});

const rejectionCode = (
  schema: TableViewSchema,
  state: TableViewState,
  command: TableViewCommand,
) => {
  const result = applyTableViewCommand(schema, state, command);
  expect(result.accepted).toBe(false);
  expect(result.state).toBe(state);
  if (result.accepted) throw new Error('Expected a rejected command');
  return result.event.reason.code;
};

describe('Table View Engine schema and state validation', () => {
  it('retains stable semantic identities while keeping translated labels as metadata', () => {
    const schema = schemaFixture();
    const state = stateFixture();

    expect(validateTableViewSchema(schema)).toEqual({ valid: true });
    expect(validateTableViewState(schema, state)).toEqual({ valid: true });
    expect(normalizeTableViewState(schema, state)).toMatchObject({
      tableId: 'fixture.players',
      schemaVersion: 1,
      ownerScope: 'local-fixed',
      viewId: 'view.system-default',
      baselineViewId: 'view.system-default',
      columns: schema.columns.map(({ columnId }) => ({ columnId })),
      filter: { groupId: 'filters.root' },
      dataWindow: { windowId: 'window.first-page' },
    });

    const translatedSchema = {
      ...schema,
      columns: schema.columns.map((column) => ({
        ...column,
        label: `translated:${column.label}`,
      })),
      densities: schema.densities.map((density) => ({
        ...density,
        label: `translated:${density.label}`,
      })),
    };

    expect(normalizeTableViewState(translatedSchema, state)).toEqual(
      normalizeTableViewState(schema, state),
    );
  });

  it('rejects invalid and duplicate schema identities and invalid schema geometry', () => {
    const schema = schemaFixture();
    const duplicateColumn = {
      ...schema,
      columns: [...schema.columns, schema.columns[0]],
      constraints: { ...schema.constraints, maxColumns: 5 },
    };
    const invalidWidth = {
      ...schema,
      columns: schema.columns.map((column, index) =>
        index === 0
          ? { ...column, width: { ...column.width, default: Number.POSITIVE_INFINITY } }
          : column,
      ),
    };
    const labelAsIdentity = { ...schema, tableId: 'Tabela de jogadores' };

    expect(validateTableViewSchema(duplicateColumn)).toMatchObject({
      valid: false,
      reason: { code: 'duplicate-column-id' },
    });
    expect(validateTableViewSchema(invalidWidth)).toMatchObject({
      valid: false,
      reason: { code: 'invalid-column-width' },
    });
    expect(validateTableViewSchema(labelAsIdentity)).toMatchObject({
      valid: false,
      reason: { code: 'invalid-identity' },
    });
  });

  it.each([
    [
      'table identity',
      (state: TableViewState) => ({ ...state, tableId: 'unknown.table' }),
      'table-id-mismatch',
    ],
    [
      'duplicate columns',
      (state: TableViewState) => ({
        ...state,
        columns: [...state.columns.slice(0, -1), state.columns[0]],
      }),
      'duplicate-column-id',
    ],
    [
      'unknown columns',
      (state: TableViewState) => ({
        ...state,
        columns: [
          ...state.columns.slice(0, -1),
          { ...state.columns.at(-1)!, columnId: 'translated:Gols' },
        ],
      }),
      'unknown-column-id',
    ],
    [
      'hidden required columns',
      (state: TableViewState) => ({
        ...state,
        columns: state.columns.map((column) =>
          column.columnId === 'name' ? { ...column, visible: false } : column,
        ),
      }),
      'required-column-hidden',
    ],
    [
      'non-finite widths',
      (state: TableViewState) => ({
        ...state,
        columns: state.columns.map((column) =>
          column.columnId === 'goals' ? { ...column, width: Number.NaN } : column,
        ),
      }),
      'invalid-column-width',
    ],
    [
      'out-of-bound widths',
      (state: TableViewState) => ({
        ...state,
        columns: state.columns.map((column) =>
          column.columnId === 'goals' ? { ...column, width: 121 } : column,
        ),
      }),
      'column-width-out-of-bounds',
    ],
    [
      'unsupported density',
      (state: TableViewState) => ({ ...state, density: 'translated:Compacta' }),
      'unsupported-density',
    ],
  ])('rejects invalid %s without accepting partial state', (_name, changeState, code) => {
    const result = validateTableViewState(schemaFixture(), changeState(stateFixture()));
    expect(result).toMatchObject({ valid: false, reason: { code } });
  });

  it('rejects invalid pin order, count, and aggregate width', () => {
    const schema = schemaFixture();
    const state = stateFixture();
    const duplicateOrder: TableViewState = {
      ...state,
      columns: state.columns.map((column) =>
        column.columnId === 'name'
          ? { ...column, pinning: { side: 'start', order: 0 } }
          : column,
      ),
    };
    const excessiveCount: TableViewState = {
      ...state,
      columns: state.columns.map((column, index) => ({
        ...column,
        pinning:
          index < 3
            ? { side: 'start' as const, order: index }
            : { side: 'none' as const, order: null },
      })),
    };
    const excessiveWidth: TableViewState = {
      ...state,
      columns: state.columns.map((column, index) => ({
        ...column,
        visible: index < 2,
        pinning:
          index < 2
            ? { side: 'start' as const, order: index }
            : { side: 'none' as const, order: null },
      })),
    };

    expect(validateTableViewState(schema, duplicateOrder)).toMatchObject({
      valid: false,
      reason: { code: 'invalid-pin-order' },
    });
    expect(validateTableViewState(schema, excessiveCount)).toMatchObject({
      valid: false,
      reason: { code: 'pinned-column-limit-exceeded' },
    });
    expect(validateTableViewState(schema, excessiveWidth)).toMatchObject({
      valid: false,
      reason: { code: 'pinned-width-limit-exceeded' },
    });
  });

  it('rejects unsupported, duplicate, and excessive sort descriptors', () => {
    const schema = schemaFixture();
    const state = stateFixture();

    expect(
      validateTableViewState(schema, {
        ...state,
        sort: [{ columnId: 'translated:Gols', direction: 'desc', nulls: 'last' }],
      }),
    ).toMatchObject({ valid: false, reason: { code: 'unknown-column-id' } });
    expect(
      validateTableViewState(schema, {
        ...state,
        sort: [
          { columnId: 'goals', direction: 'desc', nulls: 'last' },
          { columnId: 'goals', direction: 'asc', nulls: 'last' },
        ],
      }),
    ).toMatchObject({ valid: false, reason: { code: 'duplicate-sort-column' } });
    expect(
      validateTableViewState(schema, {
        ...state,
        sort: [
          { columnId: 'goals', direction: 'desc', nulls: 'last' },
          { columnId: 'position', direction: 'asc', nulls: 'last' },
          { columnId: 'name', direction: 'asc', nulls: 'last' },
        ],
      }),
    ).toMatchObject({ valid: false, reason: { code: 'sort-limit-exceeded' } });
  });

  it('rejects unknown operators, incompatible values, duplicate IDs, depth, and clause bounds', () => {
    const schema = schemaFixture();
    const state = stateFixture();
    const clause = {
      kind: 'clause' as const,
      filterId: 'filter.goals',
      columnId: 'goals',
      operator: 'greater-than',
      value: { kind: 'number' as const, value: 0 },
      enabled: true,
    };

    expect(
      validateTableViewState(schema, {
        ...state,
        filter: {
          ...state.filter,
          children: [{ ...clause, operator: 'translated:Maior que' }],
        },
      }),
    ).toMatchObject({ valid: false, reason: { code: 'unsupported-filter-operator' } });
    expect(
      validateTableViewState(schema, {
        ...state,
        filter: {
          ...state.filter,
          children: [{ ...clause, value: { kind: 'text', value: 'zero' } }],
        },
      }),
    ).toMatchObject({ valid: false, reason: { code: 'incompatible-filter-value' } });
    expect(
      validateTableViewState(schema, {
        ...state,
        filter: { ...state.filter, children: [clause, { ...clause }] },
      }),
    ).toMatchObject({ valid: false, reason: { code: 'duplicate-filter-id' } });
    expect(
      validateTableViewState(schema, {
        ...state,
        filter: {
          ...state.filter,
          children: [
            {
              kind: 'group',
              groupId: 'filters.nested',
              logic: 'or',
              children: [
                {
                  kind: 'group',
                  groupId: 'filters.too-deep',
                  logic: 'and',
                  children: [clause],
                },
              ],
            },
          ],
        },
      }),
    ).toMatchObject({ valid: false, reason: { code: 'filter-depth-exceeded' } });
    expect(
      validateTableViewState(schema, {
        ...state,
        filter: {
          ...state.filter,
          children: [
            clause,
            { ...clause, filterId: 'filter.goals.two' },
            { ...clause, filterId: 'filter.goals.three' },
            { ...clause, filterId: 'filter.goals.four' },
          ],
        },
      }),
    ).toMatchObject({ valid: false, reason: { code: 'filter-clause-limit-exceeded' } });
  });

  it('rejects grouping and invalid data-window descriptors', () => {
    const schema = schemaFixture();
    const state = stateFixture();

    expect(
      validateTableViewState(schema, {
        ...state,
        grouping: [{ groupId: 'group.position', columnId: 'position', mode: 'value' }],
      }),
    ).toMatchObject({ valid: false, reason: { code: 'grouping-unsupported' } });
    expect(
      validateTableViewState(schema, {
        ...state,
        dataWindow: { ...state.dataWindow, pageSize: 50 },
      }),
    ).toMatchObject({ valid: false, reason: { code: 'invalid-data-window' } });
  });
});

describe('Table View Engine command reduction', () => {
  it('accepts every supported intent immutably with deterministic focus and announcement events', () => {
    const schema = schemaFixture();
    const baseline = stateFixture();
    let state = baseline;

    const commands: readonly TableViewCommand[] = [
      { type: 'column.visibility', columnId: 'goals', visible: false },
      { type: 'column.reorder', columnId: 'goals', toIndex: 2 },
      { type: 'column.resize', columnId: 'goals', width: 10 },
      { type: 'column.pin', columnId: 'name', side: 'end', order: 0 },
      { type: 'column.pin', columnId: 'name', side: 'none' },
      { type: 'density.set', density: 'standard' },
      {
        type: 'sort.set',
        sort: [
          { columnId: 'goals', direction: 'desc', nulls: 'last' },
          { columnId: 'name', direction: 'asc', nulls: 'last' },
        ],
      },
      {
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
      },
      {
        type: 'view.propose',
        viewId: 'view.scorers',
        baselineViewId: 'view.system-default',
        provenance: 'user-owned',
        label: 'Artilheiros',
      },
      {
        type: 'data-window.set',
        dataWindow: {
          windowId: 'window.second-page',
          mode: 'client-pagination',
          page: 2,
          pageSize: 25,
        },
      },
    ];

    for (const command of commands) {
      const previous = state;
      const result = applyTableViewCommand(schema, state, command);
      expect(result.accepted).toBe(true);
      expect(result.state).not.toBe(previous);
      expect(previous).toEqual(state);
      if (!result.accepted) throw new Error(result.event.reason.code);
      expect(result.event).toMatchObject({
        type: 'accepted',
        commandType: command.type,
        announcement: { messageId: command.type },
      });
      expect(result.event.focus).not.toBeNull();
      state = result.state;
    }

    expect(state.columns.find(({ columnId }) => columnId === 'goals')).toMatchObject({
      visible: false,
      width: 64,
      pinning: { side: 'none', order: null },
    });
    expect(state.columns.map(({ columnId }) => columnId)).toEqual([
      'shirtNumber',
      'name',
      'goals',
      'position',
    ]);
    expect(state.density).toBe('standard');
    expect(state.sort).toHaveLength(2);
    expect(state.viewId).toBe('view.scorers');
    expect(state.dataWindow.windowId).toBe('window.second-page');
    expect(isTableViewDirty(schema, state, baseline)).toBe(true);
  });

  it('resets configuration to the named baseline while retaining proposed view identity', () => {
    const schema = schemaFixture();
    const baseline = stateFixture();
    const changed = applyTableViewCommand(schema, baseline, {
      type: 'density.set',
      density: 'standard',
    });
    if (!changed.accepted) throw new Error(changed.event.reason.code);
    const proposed = applyTableViewCommand(schema, changed.state, {
      type: 'view.propose',
      viewId: 'view.custom',
      baselineViewId: baseline.viewId,
      provenance: 'user-owned',
      label: 'Minha visão',
    });
    if (!proposed.accepted) throw new Error(proposed.event.reason.code);

    const reset = applyTableViewCommand(schema, proposed.state, {
      type: 'view.reset',
      baseline,
    });

    expect(reset.accepted).toBe(true);
    if (!reset.accepted) throw new Error(reset.event.reason.code);
    expect(reset.state).toMatchObject({
      viewId: 'view.custom',
      baselineViewId: 'view.system-default',
      provenance: 'user-owned',
      label: 'Minha visão',
      density: 'compact',
    });
    expect(isTableViewDirty(schema, reset.state, baseline)).toBe(false);
  });

  it('rejects stale or invalid commands atomically with concrete reasons', () => {
    const schema = schemaFixture();
    const state = stateFixture();

    expect(
      rejectionCode(schema, state, {
        type: 'column.visibility',
        columnId: 'name',
        visible: false,
      }),
    ).toBe('required-column-hidden');
    expect(
      rejectionCode(schema, state, {
        type: 'column.reorder',
        columnId: 'goals',
        toIndex: 99,
      }),
    ).toBe('invalid-column-index');
    expect(
      rejectionCode(schema, state, {
        type: 'column.resize',
        columnId: 'goals',
        width: Number.NaN,
      }),
    ).toBe('invalid-column-width');
    expect(
      rejectionCode(schema, state, {
        type: 'column.pin',
        columnId: 'name',
        side: 'start',
        order: 2,
      }),
    ).toBe('invalid-pin-order');
    expect(
      rejectionCode(schema, state, {
        type: 'density.set',
        density: 'translated:Padrão',
      }),
    ).toBe('unsupported-density');
    expect(
      rejectionCode(schema, state, {
        type: 'grouping.set',
        grouping: [{ groupId: 'group.position', columnId: 'position', mode: 'value' }],
      }),
    ).toBe('grouping-unsupported');
  });
});

describe('Table View Engine canonical normalization and dirty comparison', () => {
  it('canonicalizes unordered filters and typed set values while preserving ordered arrays', () => {
    const schema = schemaFixture();
    const base = stateFixture();
    const goals = {
      kind: 'clause' as const,
      filterId: 'filter.goals',
      columnId: 'goals',
      operator: 'greater-than',
      value: { kind: 'number' as const, value: 0 },
      enabled: true,
    };
    const positions = {
      kind: 'clause' as const,
      filterId: 'filter.positions',
      columnId: 'position',
      operator: 'one-of',
      value: { kind: 'enum-set' as const, value: ['ST', 'GK', 'ST'] },
      enabled: true,
    };
    const left: TableViewState = {
      ...base,
      filter: { ...base.filter, children: [goals, positions] },
    };
    const right = {
      announcement: 'transient copy must be discarded',
      ...base,
      filter: {
        children: [
          { ...positions, value: { kind: 'enum-set' as const, value: ['GK', 'ST'] } },
          goals,
        ],
        logic: 'and' as const,
        groupId: 'filters.root',
        kind: 'group' as const,
      },
    } as TableViewState & { readonly announcement: string };

    const normalized = normalizeTableViewState(schema, left);
    expect(normalized.filter.children.map((child) =>
      child.kind === 'clause' ? child.filterId : child.groupId,
    )).toEqual(['filter.goals', 'filter.positions']);
    expect(
      normalized.filter.children.find(
        (child) => child.kind === 'clause' && child.filterId === 'filter.positions',
      ),
    ).toMatchObject({ value: { kind: 'enum-set', value: ['GK', 'ST'] } });
    expect(normalized.columns.map(({ columnId }) => columnId)).toEqual(
      left.columns.map(({ columnId }) => columnId),
    );
    expect(isTableViewDirty(schema, left, right)).toBe(false);
  });

  it('treats ordered sort or column changes as dirty and exposes typed invalid-state errors', () => {
    const schema = schemaFixture();
    const baseline = stateFixture();
    const reordered: TableViewState = {
      ...baseline,
      columns: [baseline.columns[1], baseline.columns[0], ...baseline.columns.slice(2)],
    };
    const resorted: TableViewState = {
      ...baseline,
      sort: [{ columnId: 'goals', direction: 'desc', nulls: 'last' }],
    };

    expect(isTableViewDirty(schema, reordered, baseline)).toBe(true);
    expect(isTableViewDirty(schema, resorted, baseline)).toBe(true);
    expect(() =>
      normalizeTableViewState(schema, {
        ...baseline,
        density: 'unknown',
      }),
    ).toThrow(TableViewStateValidationError);
  });
});
