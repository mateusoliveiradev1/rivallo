import {
  applyTableViewCommand,
  normalizeTableViewState,
  type TableViewColumnCapabilities,
  type TableViewSchema,
  type TableViewState,
} from '../../table-view/table-view-engine.js';
import type { TableDefinition, TablePreferencesAdapter } from './data-table-types.js';

export interface FinanceFixtureRow {
  readonly id: string;
  readonly account: string;
  readonly amount: number;
  readonly note: string;
  readonly owner: string;
}

const capabilities = (
  overrides: Partial<TableViewColumnCapabilities> = {},
): TableViewColumnCapabilities => ({
  hideable: true,
  reorderable: true,
  resizable: true,
  pinnable: true,
  sortable: true,
  filterOperators: [],
  groupingModes: [],
  ...overrides,
});

export const FINANCE_FIXTURE_SCHEMA: TableViewSchema = {
  tableId: 'fixture.finance-ledger',
  schemaVersion: 1,
  ownerScope: 'fixture-local',
  columns: [
    {
      columnId: 'account',
      label: 'Conta',
      required: true,
      requiredReason: 'Obrigatória para identificar o lançamento financeiro.',
      defaultVisible: true,
      width: { default: 220, min: 160, max: 320 },
      defaultPinning: { side: 'start', order: 0 },
      pinningLocked: true,
      capabilities: capabilities({ hideable: false, pinnable: false }),
    },
    {
      columnId: 'amount',
      label: 'Valor',
      required: false,
      requiredReason: null,
      defaultVisible: true,
      width: { default: 120, min: 96, max: 180 },
      defaultPinning: { side: 'none', order: null },
      capabilities: capabilities(),
    },
    {
      columnId: 'note',
      label: 'Observação',
      required: false,
      requiredReason: null,
      defaultVisible: true,
      width: { default: 240, min: 160, max: 360 },
      defaultPinning: { side: 'none', order: null },
      capabilities: capabilities({ sortable: false }),
    },
    {
      columnId: 'owner',
      label: 'Responsável',
      required: false,
      requiredReason: null,
      defaultVisible: true,
      width: { default: 160, min: 120, max: 240 },
      defaultPinning: { side: 'none', order: null },
      capabilities: capabilities({ pinnable: false }),
    },
  ],
  densities: [
    { densityId: 'compact', label: 'Compacta', rowHeight: 40 },
    { densityId: 'standard', label: 'Padrão', rowHeight: 46 },
  ],
  constraints: {
    maxColumns: 4,
    maxPinnedColumns: 2,
    maxPinnedWidthRatio: 0.65,
    maxSortClauses: 2,
    maxFilterDepth: 1,
    maxFilterClauses: 4,
    maxGroupingClauses: 0,
  },
  groupingSupported: false,
  dataWindow: {
    mode: 'client-pagination',
    pageSizeOptions: [10],
    defaultPageSize: 10,
    maxPage: 1,
  },
};

export const FINANCE_FIXTURE_VIEW: TableViewState = {
  tableId: FINANCE_FIXTURE_SCHEMA.tableId,
  schemaVersion: FINANCE_FIXTURE_SCHEMA.schemaVersion,
  ownerScope: FINANCE_FIXTURE_SCHEMA.ownerScope,
  viewId: 'fixture.finance.default',
  baselineViewId: 'fixture.finance.default',
  provenance: 'system-default',
  label: 'Visão financeira',
  density: 'compact',
  columns: FINANCE_FIXTURE_SCHEMA.columns.map((column) => ({
    columnId: column.columnId,
    visible: column.defaultVisible,
    width: column.width.default,
    pinning: column.defaultPinning,
  })),
  sort: [],
  filter: {
    kind: 'group',
    groupId: 'fixture.filters',
    logic: 'and',
    children: [],
  },
  grouping: [],
  dataWindow: {
    windowId: 'fixture.finance.page-1',
    mode: 'client-pagination',
    page: 1,
    pageSize: 10,
  },
};

export const FINANCE_FIXTURE_DEFINITION: TableDefinition<FinanceFixtureRow> = {
  tableId: FINANCE_FIXTURE_SCHEMA.tableId,
  schemaVersion: FINANCE_FIXTURE_SCHEMA.schemaVersion,
  label: 'Lançamentos financeiros',
  schema: FINANCE_FIXTURE_SCHEMA,
  columns: [
    {
      columnId: 'account',
      label: 'Conta',
      shortLabel: 'Conta',
      description: 'Conta do plano financeiro',
      responsivePriority: 1,
      render: (row) => row.account,
    },
    {
      columnId: 'amount',
      label: 'Valor',
      shortLabel: 'Valor',
      description: 'Valor do lançamento',
      align: 'end',
      responsivePriority: 2,
      render: (row) => row.amount.toLocaleString('pt-BR'),
    },
    {
      columnId: 'note',
      label: 'Observação',
      shortLabel: 'Observação',
      description: 'Observação operacional',
      responsivePriority: 4,
      render: (row) => row.note,
    },
    {
      columnId: 'owner',
      label: 'Responsável',
      shortLabel: 'Responsável',
      description: 'Responsável pelo lançamento',
      responsivePriority: 3,
      render: (row) => row.owner,
    },
  ],
};

export const createFinanceFixtureAdapter = (
  state: TableViewState,
  update: (state: TableViewState) => void,
): TablePreferencesAdapter => ({
  state,
  baseline: FINANCE_FIXTURE_VIEW,
  dispatch: (command) => {
    const result = applyTableViewCommand(FINANCE_FIXTURE_SCHEMA, state, command);
    if (result.accepted) update(result.state);
    return result;
  },
});

export interface FixturePreferenceStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

const fixturePreferenceKey = (tableId: string) => `rivallo.table-preferences.${tableId}`;

export const persistFinanceFixtureView = (
  store: FixturePreferenceStore,
  state: TableViewState,
): void => {
  store.set(fixturePreferenceKey(FINANCE_FIXTURE_SCHEMA.tableId), JSON.stringify(state));
};

export const restoreFinanceFixtureView = (store: FixturePreferenceStore): TableViewState => {
  const serialized = store.get(fixturePreferenceKey(FINANCE_FIXTURE_SCHEMA.tableId));
  if (serialized === null) return FINANCE_FIXTURE_VIEW;
  return normalizeTableViewState(FINANCE_FIXTURE_SCHEMA, JSON.parse(serialized) as TableViewState);
};
