import {
  normalizeTableViewState,
  type TableViewColumnState,
  type TableViewFilterNode,
  type TableViewFilterValue,
  type TableViewState,
} from '../table-view/table-view-engine.js';
import type { ImportLegacyTablePreferencesRequest, LegacyImportReceipt } from './client.js';
import { SQUAD_SYSTEM_VIEW, SQUAD_TABLE_SCHEMA, type SquadColumnId } from './squad-table-schema.js';

export interface LegacyPreferenceStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type LegacyPreferenceInvalidReason =
  | 'corrupt'
  | 'invalid-density'
  | 'invalid-columns'
  | 'unknown-only'
  | 'unbounded'
  | 'storage-unavailable';

export type LegacySquadTablePreferences =
  | {
      readonly status: 'none';
      readonly fallback: TableViewState;
    }
  | {
      readonly status: 'invalid';
      readonly sourceVersion: 2 | 3 | 4;
      readonly sourceFingerprint: string;
      readonly reason: LegacyPreferenceInvalidReason;
      readonly fallback: TableViewState;
    }
  | {
      readonly status: 'ready';
      readonly sourceKey: string;
      readonly request: ImportLegacyTablePreferencesRequest;
    };

const MAX_RAW_BYTES = 64 * 1024;
const MAX_LEGACY_COLUMNS = 64;
const MAX_LEGACY_COLUMN_ID_BYTES = 64;
const TABLE_FIELDS = new Set(['density', 'visibleColumns']);
const REQUIRED_COLUMN_IDS: ReadonlySet<string> = new Set(
  SQUAD_TABLE_SCHEMA.columns.filter(({ required }) => required).map(({ columnId }) => columnId),
);
const OPTIONAL_COLUMN_IDS: ReadonlySet<string> = new Set(
  SQUAD_TABLE_SCHEMA.columns.filter(({ required }) => !required).map(({ columnId }) => columnId),
);
const REMOVED_LEGACY_COLUMN_IDS = new Set(['importance', 'removedColumn']);
const ALL_OPTIONAL_COLUMN_IDS = SQUAD_TABLE_SCHEMA.columns
  .filter(({ required }) => !required)
  .map(({ columnId }) => columnId);

const LEGACY_SOURCES = [
  {
    version: 4,
    key: 'rivallo.squad-ui.v4',
    knownColumns: ALL_OPTIONAL_COLUMN_IDS,
  },
  {
    version: 3,
    key: 'rivallo.squad-ui.v3',
    knownColumns: ALL_OPTIONAL_COLUMN_IDS.filter((columnId) => columnId !== 'averageRating'),
  },
  {
    version: 2,
    key: 'rivallo.squad-ui.v2',
    knownColumns: ['age', 'rating', 'condition'],
  },
] as const;

const encoder = new TextEncoder();

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const cloneFilterValue = (value: TableViewFilterValue): TableViewFilterValue => {
  switch (value.kind) {
    case 'enum-set':
      return { kind: value.kind, value: [...value.value] };
    case 'number-range':
      return { kind: value.kind, min: value.min, max: value.max };
    case 'text':
      return { kind: value.kind, value: value.value };
    case 'number':
      return { kind: value.kind, value: value.value };
    case 'boolean':
      return { kind: value.kind, value: value.value };
    case 'enum':
      return { kind: value.kind, value: value.value };
  }
};

const cloneFilterGroup = (
  group: Extract<TableViewFilterNode, { readonly kind: 'group' }>,
): Extract<TableViewFilterNode, { readonly kind: 'group' }> => ({
  kind: group.kind,
  groupId: group.groupId,
  logic: group.logic,
  children: group.children.map(cloneFilterNode),
});

const cloneFilterNode = (node: TableViewFilterNode): TableViewFilterNode =>
  node.kind === 'clause'
    ? {
        kind: node.kind,
        filterId: node.filterId,
        columnId: node.columnId,
        operator: node.operator,
        value: cloneFilterValue(node.value),
        enabled: node.enabled,
      }
    : cloneFilterGroup(node);

const cloneState = (state: TableViewState): TableViewState => ({
  tableId: state.tableId,
  schemaVersion: state.schemaVersion,
  ownerScope: state.ownerScope,
  viewId: state.viewId,
  baselineViewId: state.baselineViewId,
  provenance: state.provenance,
  label: state.label,
  density: state.density,
  columns: state.columns.map((column) => ({
    columnId: column.columnId,
    visible: column.visible,
    width: column.width,
    pinning: { ...column.pinning },
  })),
  sort: state.sort.map((sort) => ({ ...sort })),
  filter: cloneFilterGroup(state.filter),
  grouping: state.grouping.map((grouping) => ({ ...grouping })),
  dataWindow: { ...state.dataWindow },
});

const fallbackState = (): TableViewState => cloneState(SQUAD_SYSTEM_VIEW);

const fingerprint = (raw: string): string => {
  let hash = 0x811c9dc5;
  for (const byte of encoder.encode(raw)) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `fnv1a32:${hash.toString(16).padStart(8, '0')}`;
};

const invalid = (
  version: 2 | 3 | 4,
  raw: string,
  reason: LegacyPreferenceInvalidReason,
): LegacySquadTablePreferences => ({
  status: 'invalid',
  sourceVersion: version,
  sourceFingerprint: fingerprint(raw),
  reason,
  fallback: fallbackState(),
});

const readNewestSource = (
  storage: LegacyPreferenceStorage,
):
  | {
      readonly version: 2 | 3 | 4;
      readonly key: string;
      readonly raw: string;
      readonly knownColumns: readonly string[];
    }
  | null
  | { readonly unavailableVersion: 2 | 3 | 4 } => {
  for (const source of LEGACY_SOURCES) {
    try {
      const raw = storage.getItem(source.key);
      if (raw !== null) return { ...source, raw };
    } catch {
      return { unavailableVersion: source.version };
    }
  }
  return null;
};

const decodeDensity = (value: unknown): TableViewState['density'] | 'invalid' => {
  if (value === undefined) return SQUAD_SYSTEM_VIEW.density;
  return value === 'compact' || value === 'standard' || value === 'comfortable' ? value : 'invalid';
};

const decodeVisibleColumns = (
  value: unknown,
  knownColumns: readonly string[],
):
  | {
      readonly recognized: readonly SquadColumnId[];
      readonly knownColumns: ReadonlySet<string>;
    }
  | LegacyPreferenceInvalidReason => {
  if (value === undefined) {
    return {
      recognized: knownColumns.filter((columnId) =>
        OPTIONAL_COLUMN_IDS.has(columnId),
      ) as SquadColumnId[],
      knownColumns: new Set(knownColumns),
    };
  }
  if (!Array.isArray(value) || value.length > MAX_LEGACY_COLUMNS) {
    return 'unbounded';
  }

  const recognized: SquadColumnId[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (typeof entry !== 'string' || encoder.encode(entry).length > MAX_LEGACY_COLUMN_ID_BYTES) {
      return 'invalid-columns';
    }
    if (seen.has(entry)) continue;
    seen.add(entry);
    if (OPTIONAL_COLUMN_IDS.has(entry)) {
      recognized.push(entry as SquadColumnId);
    }
  }

  if (
    value.length > 0 &&
    recognized.length === 0 &&
    [...seen].every(
      (columnId) => REMOVED_LEGACY_COLUMN_IDS.has(columnId) || !OPTIONAL_COLUMN_IDS.has(columnId),
    )
  ) {
    return 'unknown-only';
  }

  return {
    recognized,
    knownColumns: new Set(knownColumns),
  };
};

const materializeColumns = (
  recognized: readonly SquadColumnId[],
  knownColumns: ReadonlySet<string>,
): readonly TableViewColumnState[] => {
  const recognizedSet: ReadonlySet<string> = new Set(recognized);
  const orderedIds = [
    ...SQUAD_TABLE_SCHEMA.columns
      .filter(({ required }) => required)
      .map(({ columnId }) => columnId),
    ...recognized,
    ...SQUAD_TABLE_SCHEMA.columns
      .map(({ columnId }) => columnId)
      .filter((columnId) => !REQUIRED_COLUMN_IDS.has(columnId) && !recognizedSet.has(columnId)),
  ];

  return orderedIds.map((columnId) => {
    const schemaColumn = SQUAD_TABLE_SCHEMA.columns.find(
      (candidate) => candidate.columnId === columnId,
    );
    if (schemaColumn === undefined) {
      throw new Error(`Missing owning squad schema column: ${columnId}`);
    }
    const visible =
      schemaColumn.required ||
      recognizedSet.has(columnId) ||
      (!knownColumns.has(columnId) && schemaColumn.defaultVisible);
    return {
      columnId,
      visible,
      width: schemaColumn.width.default,
      pinning: { ...schemaColumn.defaultPinning },
    };
  });
};

const legacyViewId = (version: 2 | 3 | 4, sourceFingerprint: string): string =>
  `squad.user.legacy-v${version}-${sourceFingerprint.slice(sourceFingerprint.indexOf(':') + 1)}`;

export const readLegacySquadTablePreferences = (
  storage: LegacyPreferenceStorage,
): LegacySquadTablePreferences => {
  const source = readNewestSource(storage);
  if (source === null) return { status: 'none', fallback: fallbackState() };
  if ('unavailableVersion' in source) {
    return invalid(source.unavailableVersion, '', 'storage-unavailable');
  }

  const rawBytes = encoder.encode(source.raw).length;
  if (rawBytes > MAX_RAW_BYTES) {
    return invalid(source.version, source.raw, 'unbounded');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(source.raw) as unknown;
  } catch {
    return invalid(source.version, source.raw, 'corrupt');
  }
  if (!isRecord(parsed)) {
    return invalid(source.version, source.raw, 'corrupt');
  }

  const density = decodeDensity(parsed.density);
  if (density === 'invalid') {
    return invalid(source.version, source.raw, 'invalid-density');
  }
  const columns = decodeVisibleColumns(parsed.visibleColumns, source.knownColumns);
  if (typeof columns === 'string') {
    return invalid(source.version, source.raw, columns);
  }

  const sourceFingerprint = fingerprint(source.raw);
  const state = normalizeTableViewState(SQUAD_TABLE_SCHEMA, {
    ...fallbackState(),
    viewId: legacyViewId(source.version, sourceFingerprint),
    baselineViewId: SQUAD_SYSTEM_VIEW.viewId,
    provenance: 'user-owned',
    label: 'Preferências anteriores',
    density,
    columns: materializeColumns(columns.recognized, columns.knownColumns),
  });

  return {
    status: 'ready',
    sourceKey: source.key,
    request: {
      sourceVersion: source.version,
      sourceFingerprint,
      state,
    },
  };
};

const receiptMatches = (
  preferences: Extract<LegacySquadTablePreferences, { readonly status: 'ready' }>,
  receipt: LegacyImportReceipt | null,
): receipt is LegacyImportReceipt =>
  receipt !== null &&
  receipt.sourceVersion === preferences.request.sourceVersion &&
  receipt.sourceFingerprint === preferences.request.sourceFingerprint &&
  receipt.tableId === 'squad.primary' &&
  receipt.schemaVersion === 1 &&
  receipt.ownerScope === 'local-fixed' &&
  receipt.importedViewId === preferences.request.state.viewId &&
  Number.isSafeInteger(receipt.acceptedRevision) &&
  receipt.acceptedRevision >= 0;

const withoutTableFields = (payload: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(Object.entries(payload).filter(([key]) => !TABLE_FIELDS.has(key)));

export const retireConfirmedLegacyTablePreferences = (
  storage: LegacyPreferenceStorage,
  preferences: LegacySquadTablePreferences,
  receipt: LegacyImportReceipt | null,
): boolean => {
  if (preferences.status !== 'ready' || !receiptMatches(preferences, receipt)) {
    return false;
  }

  let raw: string | null;
  try {
    raw = storage.getItem(preferences.sourceKey);
  } catch {
    return false;
  }
  if (
    raw === null ||
    encoder.encode(raw).length > MAX_RAW_BYTES ||
    fingerprint(raw) !== preferences.request.sourceFingerprint
  ) {
    return false;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return false;
  }
  if (!isRecord(parsed)) return false;

  const remaining = withoutTableFields(parsed);
  const currentKey = LEGACY_SOURCES[0].key;
  try {
    if (preferences.sourceKey !== currentKey && storage.getItem(currentKey) !== null) {
      return false;
    }

    if (Object.keys(remaining).length > 0) {
      storage.setItem(currentKey, JSON.stringify(remaining));
    } else if (preferences.sourceKey === currentKey) {
      storage.removeItem(currentKey);
    }

    for (const source of LEGACY_SOURCES.slice(1)) {
      storage.removeItem(source.key);
    }
    return true;
  } catch {
    return false;
  }
};

export interface LegacySquadPreferenceAdapter {
  read(): LegacySquadTablePreferences;
  retire(preferences: LegacySquadTablePreferences, receipt: LegacyImportReceipt | null): boolean;
}

const unavailableBrowserStorage: LegacyPreferenceStorage = {
  getItem() {
    throw new Error('Browser preference storage is unavailable');
  },
  setItem() {
    throw new Error('Browser preference storage is unavailable');
  },
  removeItem() {
    throw new Error('Browser preference storage is unavailable');
  },
};

const browserStorage = (): LegacyPreferenceStorage =>
  typeof window === 'undefined' ? unavailableBrowserStorage : window.localStorage;

export const browserLegacySquadPreferenceAdapter: LegacySquadPreferenceAdapter = {
  read: () => readLegacySquadTablePreferences(browserStorage()),
  retire: (preferences, receipt) =>
    retireConfirmedLegacyTablePreferences(browserStorage(), preferences, receipt),
};
