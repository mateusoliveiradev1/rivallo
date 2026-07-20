import {
  normalizeTableViewState,
  type TableViewColumnCapabilities,
  type TableViewColumnSchema,
  type TableViewFilterClause,
  type TableViewFilterGroup,
  type TableViewFilterNode,
  type TableViewFilterOperatorSchema,
  type TableViewSchema,
  type TableViewState,
} from '../table-view/table-view-engine.js';
import type { RoleFilter, SquadFilter, StatusFilter } from './matchday-ui.js';
import { createSquadPlayerComparator, POSITION_SORT_ORDER, type SortKey } from './squad-sort.js';
import type { Player, Position } from './types.js';

export const SQUAD_COLUMN_IDS = [
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
] as const satisfies readonly SortKey[];

export type SquadColumnId = (typeof SQUAD_COLUMN_IDS)[number];

const numericFilterOperators: readonly TableViewFilterOperatorSchema[] = [
  { operator: 'equals', valueKind: 'number' },
  { operator: 'greater-than', valueKind: 'number' },
  { operator: 'greater-than-or-equal', valueKind: 'number' },
  { operator: 'less-than', valueKind: 'number' },
  { operator: 'less-than-or-equal', valueKind: 'number' },
];

const capabilities = ({
  hideable,
  pinnable,
  filterOperators = [],
}: {
  readonly hideable: boolean;
  readonly pinnable: boolean;
  readonly filterOperators?: readonly TableViewFilterOperatorSchema[];
}): TableViewColumnCapabilities => ({
  hideable,
  reorderable: true,
  resizable: true,
  pinnable,
  sortable: true,
  filterOperators,
  groupingModes: [],
});

const column = ({
  columnId,
  label,
  required,
  requiredReason = null,
  width,
  pinning = { side: 'none', order: null },
  pinningLocked = false,
  filterOperators = [],
}: {
  readonly columnId: SquadColumnId;
  readonly label: string;
  readonly required: boolean;
  readonly requiredReason?: string | null;
  readonly width: TableViewColumnSchema['width'];
  readonly pinning?: TableViewColumnSchema['defaultPinning'];
  readonly pinningLocked?: boolean;
  readonly filterOperators?: readonly TableViewFilterOperatorSchema[];
}): TableViewColumnSchema => ({
  columnId,
  label,
  required,
  requiredReason,
  defaultVisible: true,
  width,
  defaultPinning: pinning,
  pinningLocked,
  capabilities: capabilities({
    hideable: !required,
    pinnable: !pinningLocked,
    filterOperators,
  }),
});

const enumSetOperator = (
  allowedValues: readonly string[],
): readonly TableViewFilterOperatorSchema[] => [
  {
    operator: 'one-of',
    valueKind: 'enum-set',
    allowedValues,
  },
];

export const SQUAD_TABLE_SCHEMA: TableViewSchema = {
  tableId: 'squad.primary',
  schemaVersion: 1,
  ownerScope: 'local-fixed',
  columns: [
    column({
      columnId: 'shirtNumber',
      label: 'Nº',
      required: true,
      requiredReason: 'Obrigatória para manter a numeração real do plantel.',
      width: { default: 56, min: 48, max: 72 },
      pinning: { side: 'start', order: 0 },
      pinningLocked: true,
    }),
    column({
      columnId: 'info',
      label: 'XI',
      required: true,
      requiredReason: 'Obrigatória para escalar ou retirar jogadores do XI.',
      width: { default: 56, min: 48, max: 72 },
      pinning: { side: 'start', order: 1 },
      pinningLocked: true,
      filterOperators: enumSetOperator(['selected', 'reserve']),
    }),
    column({
      columnId: 'name',
      label: 'Jogador',
      required: true,
      requiredReason: 'Obrigatória para identificar cada jogador.',
      width: { default: 240, min: 200, max: 360 },
      pinning: { side: 'start', order: 2 },
      pinningLocked: true,
      filterOperators: [{ operator: 'contains', valueKind: 'text' }],
    }),
    column({
      columnId: 'position',
      label: 'POS',
      required: true,
      requiredReason: 'Obrigatória para manter a posição principal visível.',
      width: { default: 80, min: 72, max: 104 },
      filterOperators: enumSetOperator(POSITION_SORT_ORDER),
    }),
    column({
      columnId: 'age',
      label: 'Idade',
      required: false,
      width: { default: 64, min: 56, max: 80 },
      filterOperators: numericFilterOperators,
    }),
    column({
      columnId: 'nationality',
      label: 'NAT',
      required: false,
      width: { default: 96, min: 80, max: 144 },
      filterOperators: enumSetOperator(['BRA', 'URU', 'ARG', 'POR']),
    }),
    column({
      columnId: 'heightCm',
      label: 'Altura',
      required: false,
      width: { default: 80, min: 72, max: 104 },
      filterOperators: numericFilterOperators,
    }),
    column({
      columnId: 'preferredFoot',
      label: 'Pé',
      required: false,
      width: { default: 88, min: 72, max: 120 },
      filterOperators: enumSetOperator(['left', 'right']),
    }),
    column({
      columnId: 'squadRole',
      label: 'Função',
      required: false,
      width: { default: 128, min: 112, max: 176 },
      filterOperators: enumSetOperator([
        'keyPlayer',
        'firstTeam',
        'rotation',
        'prospect',
        'backup',
      ]),
    }),
    column({
      columnId: 'rating',
      label: 'OVR atual',
      required: false,
      width: { default: 88, min: 80, max: 112 },
      filterOperators: numericFilterOperators,
    }),
    column({
      columnId: 'potentialRating',
      label: 'Potencial estimado',
      required: false,
      width: { default: 136, min: 128, max: 168 },
      filterOperators: numericFilterOperators,
    }),
    column({
      columnId: 'matchFitness',
      label: 'Ritmo',
      required: false,
      width: { default: 96, min: 80, max: 120 },
      filterOperators: numericFilterOperators,
    }),
    column({
      columnId: 'morale',
      label: 'Moral',
      required: false,
      width: { default: 80, min: 72, max: 104 },
      filterOperators: numericFilterOperators,
    }),
    column({
      columnId: 'condition',
      label: 'Cond.',
      required: false,
      width: { default: 88, min: 72, max: 112 },
      filterOperators: numericFilterOperators,
    }),
    column({
      columnId: 'appearances',
      label: 'Jogos',
      required: false,
      width: { default: 72, min: 56, max: 88 },
      filterOperators: numericFilterOperators,
    }),
    column({
      columnId: 'goals',
      label: 'Gols',
      required: false,
      width: { default: 64, min: 56, max: 80 },
      filterOperators: numericFilterOperators,
    }),
    column({
      columnId: 'assists',
      label: 'Assist.',
      required: false,
      width: { default: 72, min: 56, max: 88 },
      filterOperators: numericFilterOperators,
    }),
    column({
      columnId: 'averageRating',
      label: 'Média',
      required: false,
      width: { default: 80, min: 64, max: 96 },
      filterOperators: numericFilterOperators,
    }),
  ],
  densities: [
    { densityId: 'compact', label: 'Compacta', rowHeight: 44 },
    { densityId: 'standard', label: 'Padrão', rowHeight: 48 },
    { densityId: 'comfortable', label: 'Confortável', rowHeight: 54 },
  ],
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
};

export const SQUAD_SYSTEM_VIEW: TableViewState = {
  tableId: SQUAD_TABLE_SCHEMA.tableId,
  schemaVersion: SQUAD_TABLE_SCHEMA.schemaVersion,
  ownerScope: SQUAD_TABLE_SCHEMA.ownerScope,
  viewId: 'squad.view.system-default',
  baselineViewId: 'squad.view.system-default',
  provenance: 'system-default',
  label: 'Padrão',
  density: 'compact',
  columns: SQUAD_TABLE_SCHEMA.columns.map((columnSchema) => ({
    columnId: columnSchema.columnId,
    visible: columnSchema.defaultVisible,
    width: columnSchema.width.default,
    pinning: columnSchema.defaultPinning,
  })),
  sort: [{ columnId: 'position', direction: 'asc', nulls: 'last' }],
  filter: {
    kind: 'group',
    groupId: 'filters.root',
    logic: 'and',
    children: [],
  },
  grouping: [],
  dataWindow: {
    windowId: 'squad.window.page-1',
    mode: 'client-pagination',
    page: 1,
    pageSize: 25,
  },
};

export interface SquadDurableFilterSelection {
  readonly lineup: SquadFilter;
  readonly sector: RoleFilter;
  readonly status: StatusFilter;
  readonly positions: readonly Position[];
}

const sectorPositions: Record<Exclude<RoleFilter, 'all'>, readonly Position[]> = {
  goalkeepers: ['GK'],
  defenders: ['RB', 'CB', 'LB'],
  midfielders: ['DM', 'CM', 'AM'],
  attackers: ['RW', 'LW', 'ST'],
};

const numberClause = (
  filterId: string,
  columnId: Extract<SquadColumnId, 'matchFitness' | 'condition'>,
  operator: 'greater-than-or-equal' | 'less-than',
  value: number,
): TableViewFilterClause => ({
  kind: 'clause',
  filterId,
  columnId,
  operator,
  value: { kind: 'number', value },
  enabled: true,
});

const enumSetClause = (
  filterId: string,
  columnId: Extract<SquadColumnId, 'info' | 'position'>,
  value: readonly string[],
): TableViewFilterClause => ({
  kind: 'clause',
  filterId,
  columnId,
  operator: 'one-of',
  value: { kind: 'enum-set', value },
  enabled: true,
});

export const createSquadDurableFilter = ({
  lineup,
  sector,
  status,
  positions,
}: SquadDurableFilterSelection): TableViewFilterGroup => {
  const children: TableViewFilterNode[] = [];

  if (lineup !== 'all') {
    children.push(enumSetClause('filter.lineup', 'info', [lineup]));
  }
  if (sector !== 'all') {
    children.push(enumSetClause('filter.sector', 'position', sectorPositions[sector]));
  }
  if (status !== 'all') {
    children.push({
      kind: 'group',
      groupId: `filters.status-${status}`,
      logic: status === 'ready' ? 'and' : 'or',
      children:
        status === 'ready'
          ? [
              numberClause('filter.status-fitness', 'matchFitness', 'greater-than-or-equal', 90),
              numberClause('filter.status-condition', 'condition', 'greater-than-or-equal', 90),
            ]
          : [
              numberClause('filter.status-fitness', 'matchFitness', 'less-than', 90),
              numberClause('filter.status-condition', 'condition', 'less-than', 90),
            ],
    });
  }
  if (positions.length > 0) {
    const selectedPositions = POSITION_SORT_ORDER.filter((position) =>
      positions.includes(position),
    );
    children.push(enumSetClause('filter.positions', 'position', selectedPositions));
  }

  return {
    kind: 'group',
    groupId: 'filters.root',
    logic: 'and',
    children,
  };
};

export const SQUAD_DURABLE_FILTER_DEFAULTS: SquadDurableFilterSelection = {
  lineup: 'all',
  sector: 'all',
  status: 'all',
  positions: [],
};

const sameValues = (left: readonly string[], right: readonly string[]): boolean =>
  left.length === right.length && left.every((value) => right.includes(value));

export const readSquadDurableFilter = (
  filter: TableViewFilterGroup,
): SquadDurableFilterSelection => {
  let lineup: SquadFilter = 'all';
  let sector: RoleFilter = 'all';
  let status: StatusFilter = 'all';
  let positions: readonly Position[] = [];

  for (const node of filter.children) {
    if (
      node.kind === 'clause' &&
      node.filterId === 'filter.lineup' &&
      node.value.kind === 'enum-set'
    ) {
      const candidate = node.value.value[0];
      if (candidate === 'selected' || candidate === 'reserve') lineup = candidate;
      continue;
    }
    if (
      node.kind === 'clause' &&
      node.filterId === 'filter.sector' &&
      node.value.kind === 'enum-set'
    ) {
      const matchingSector = Object.entries(sectorPositions).find(([, values]) =>
        sameValues(values, node.value.kind === 'enum-set' ? node.value.value : []),
      )?.[0] as Exclude<RoleFilter, 'all'> | undefined;
      if (matchingSector !== undefined) sector = matchingSector;
      continue;
    }
    if (
      node.kind === 'clause' &&
      node.filterId === 'filter.positions' &&
      node.value.kind === 'enum-set'
    ) {
      positions = POSITION_SORT_ORDER.filter((position) =>
        node.value.kind === 'enum-set' ? node.value.value.includes(position) : false,
      );
      continue;
    }
    if (node.kind === 'group' && node.groupId === 'filters.status-ready') {
      status = 'ready';
      continue;
    }
    if (node.kind === 'group' && node.groupId === 'filters.status-attention') {
      status = 'attention';
    }
  }

  return { lineup, sector, status, positions };
};

const isSquadQuickFilterNode = (node: TableViewFilterNode): boolean =>
  (node.kind === 'clause' &&
    ['filter.lineup', 'filter.sector', 'filter.positions'].includes(node.filterId)) ||
  (node.kind === 'group' &&
    ['filters.status-ready', 'filters.status-attention'].includes(node.groupId));

export const mergeSquadDurableFilter = (
  filter: TableViewFilterGroup,
  selection: SquadDurableFilterSelection,
): TableViewFilterGroup => {
  const quickFilter = createSquadDurableFilter(selection);
  return {
    ...filter,
    children: [
      ...filter.children.filter((node) => !isSquadQuickFilterNode(node)),
      ...quickFilter.children,
    ],
  };
};

const normalizeSearchText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('pt-BR')
    .trim();

const playerColumnValue = (player: Player, columnId: string): string | number | boolean => {
  if (columnId === 'info') return player.selected ? 'selected' : 'reserve';
  if (columnId === 'name') return player.name;
  const sortKey = columnId as Exclude<SquadColumnId, 'info' | 'name'>;
  return player[sortKey];
};

const clauseMatchesPlayer = (player: Player, clause: TableViewFilterClause) => {
  if (!clause.enabled) return true;
  const actual = playerColumnValue(player, clause.columnId);

  switch (clause.operator) {
    case 'equals':
      return clause.value.kind === 'number' && actual === clause.value.value;
    case 'greater-than':
      return (
        clause.value.kind === 'number' && typeof actual === 'number' && actual > clause.value.value
      );
    case 'greater-than-or-equal':
      return (
        clause.value.kind === 'number' && typeof actual === 'number' && actual >= clause.value.value
      );
    case 'less-than':
      return (
        clause.value.kind === 'number' && typeof actual === 'number' && actual < clause.value.value
      );
    case 'less-than-or-equal':
      return (
        clause.value.kind === 'number' && typeof actual === 'number' && actual <= clause.value.value
      );
    case 'contains':
      return (
        clause.value.kind === 'text' &&
        typeof actual === 'string' &&
        normalizeSearchText(actual).includes(normalizeSearchText(clause.value.value))
      );
    case 'one-of':
      return (
        clause.value.kind === 'enum-set' &&
        typeof actual === 'string' &&
        clause.value.value.includes(actual)
      );
    default:
      return false;
  }
};

const filterNodeMatchesPlayer = (player: Player, node: TableViewFilterNode): boolean => {
  if (node.kind === 'clause') return clauseMatchesPlayer(player, node);
  if (node.children.length === 0) return true;
  return node.logic === 'and'
    ? node.children.every((child) => filterNodeMatchesPlayer(player, child))
    : node.children.some((child) => filterNodeMatchesPlayer(player, child));
};

export interface SquadTablePipelineOptions {
  readonly nameQuery?: string;
  readonly focusedPlayerId?: string | null;
  readonly selectedPlayerIds?: readonly string[];
}

export interface SquadTablePipelineResult<T extends Player> {
  readonly rows: readonly T[];
  readonly totalRows: number;
  readonly focusedPlayerId: string | null;
  readonly selectedPlayerIds: readonly string[];
}

export const applySquadTableView = <T extends Player>(
  players: readonly T[],
  state: TableViewState,
  options: SquadTablePipelineOptions = {},
): SquadTablePipelineResult<T> => {
  const normalizedState = normalizeTableViewState(SQUAD_TABLE_SCHEMA, state);
  const nameQuery = normalizeSearchText(options.nameQuery ?? '');
  const filtered = players.filter(
    (candidate) =>
      filterNodeMatchesPlayer(candidate, normalizedState.filter) &&
      (nameQuery.length === 0 || normalizeSearchText(candidate.name).includes(nameQuery)),
  );

  const nameNeutralPlayers = new Map(
    filtered.map((candidate) => [candidate.id, { ...candidate, name: '' }]),
  );
  const clauseComparators = normalizedState.sort.map((clause) => ({
    columnId: clause.columnId,
    compare: createSquadPlayerComparator<Player>(clause.columnId as SortKey, clause.direction),
  }));
  const nameTieBreaker = createSquadPlayerComparator<Player>('name', 'asc');
  const sorted = [...filtered].sort((left, right) => {
    for (const clause of clauseComparators) {
      const comparison =
        clause.columnId === 'name'
          ? clause.compare(left, right)
          : clause.compare(nameNeutralPlayers.get(left.id)!, nameNeutralPlayers.get(right.id)!);
      if (comparison !== 0) return comparison;
    }
    return clauseComparators.length === 0 ? 0 : nameTieBreaker(left, right);
  });

  const start = (normalizedState.dataWindow.page - 1) * normalizedState.dataWindow.pageSize;
  const rows = sorted.slice(start, start + normalizedState.dataWindow.pageSize) as T[];
  const knownPlayerIds = new Set(players.map(({ id }) => id));
  const selectedPlayerIds = (
    options.selectedPlayerIds ?? players.filter(({ selected }) => selected).map(({ id }) => id)
  ).filter((playerId) => knownPlayerIds.has(playerId));
  const focusedPlayerId =
    options.focusedPlayerId !== undefined &&
    options.focusedPlayerId !== null &&
    knownPlayerIds.has(options.focusedPlayerId)
      ? options.focusedPlayerId
      : null;

  return {
    rows,
    totalRows: sorted.length,
    focusedPlayerId,
    selectedPlayerIds,
  };
};
