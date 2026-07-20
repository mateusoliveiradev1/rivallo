import { invoke } from '@tauri-apps/api/core';

import {
  validateTableViewState,
  type TableViewColumnState,
  type TableViewFilterClause,
  type TableViewFilterGroup,
  type TableViewFilterNode,
  type TableViewFilterValue,
  type TableViewSortClause,
  type TableViewState,
} from '../table-view/table-view-engine.js';
import { SQUAD_TABLE_SCHEMA } from './squad-table-schema.js';
import type {
  ClubProfileProjection,
  CoachProfileProjection,
  GlobalProfileSearchResult,
  NationProfileProjection,
  PlayerProfileProjection,
} from '../profiles/types.js';
import type {
  Formation,
  MatchdayState,
  TacticalApproach,
  TacticalLibraryCommand,
  TacticalMatchSnapshot,
  TacticalPlanPreview,
  TacticalPlanProposal,
  TacticalPlanUpdate,
  TacticalStrategyPresetSummary,
} from './types.js';

export const loadMatchday = () => invoke<MatchdayState>('matchday_state');

export const saveMatchdayLineup = (
  playerIds: readonly string[],
  formation: Formation,
  approach: TacticalApproach,
) =>
  invoke<MatchdayState>('update_matchday_lineup', {
    playerIds: [...playerIds],
    formation,
    approach,
  });

export const saveTacticalPlan = (proposal: TacticalPlanProposal) =>
  invoke<TacticalPlanUpdate>('update_tactical_plan', { proposal });

export const previewTacticalPlan = (proposal: TacticalPlanProposal) =>
  invoke<TacticalPlanPreview>('preview_tactical_plan', { proposal });

export const loadTacticalStrategyCatalog = () =>
  invoke<readonly TacticalStrategyPresetSummary[]>('tactical_strategy_catalog');

export const loadTacticalMatchSnapshot = (variationId: string) =>
  invoke<TacticalMatchSnapshot>('tactical_match_snapshot', { variationId });

export const updateTacticalLibrary = (command: TacticalLibraryCommand) =>
  invoke<TacticalPlanUpdate>('update_tactical_library', { request: command });

export const playNextMatch = () => invoke<MatchdayState>('play_next_match');

export const loadPlayerProfile = (playerId: string, variationId?: string | null) =>
  invoke<PlayerProfileProjection>('player_profile', {
    playerId,
    variationId: variationId ?? null,
  });

export const previewPlayerProfile = (playerId: string, variationId?: string | null) =>
  invoke<PlayerProfileProjection>('preview_player_profile', {
    playerId,
    variationId: variationId ?? null,
  });

export const loadCoachProfile = (coachId: string) =>
  invoke<CoachProfileProjection>('coach_profile', { coachId });

export const loadClubProfile = (clubId: string) =>
  invoke<ClubProfileProjection>('club_profile', { clubId });

export const loadNationProfile = (nationId: string) =>
  invoke<NationProfileProjection>('nation_profile', { nationId });

export const searchProfiles = (query: string) =>
  invoke<readonly GlobalProfileSearchResult[]>('search_profiles', { query });

export type TableViewMutability = 'immutable' | 'mutable' | 'read-only';
export type TableViewRecoveryReason =
  | 'corrupt_payload'
  | 'future_envelope_version'
  | 'future_schema_version'
  | 'missing_migration_step'
  | 'interrupted_write'
  | 'invalid_payload';

export interface TableViewRepositoryMetadata {
  readonly envelopeVersion: 1;
  readonly revision: number;
}

export interface SavedTableView {
  readonly mutability: TableViewMutability;
  readonly state: TableViewState;
}

export interface LegacyImportReceipt {
  readonly sourceVersion: 2 | 3 | 4;
  readonly sourceFingerprint: string;
  readonly tableId: 'squad.primary';
  readonly schemaVersion: 1;
  readonly ownerScope: 'local-fixed';
  readonly importedViewId: string;
  readonly acceptedRevision: number;
}

export interface TableViewRepositoryState {
  readonly metadata: TableViewRepositoryMetadata;
  readonly tableId: 'squad.primary';
  readonly schemaVersion: 1;
  readonly ownerScope: 'local-fixed';
  readonly activeViewId: string;
  readonly defaultViewId: string;
  readonly views: readonly SavedTableView[];
  readonly legacyImportReceipts: readonly LegacyImportReceipt[];
}

export interface SaveTableViewsRequest {
  readonly state: TableViewRepositoryState;
}

export interface ImportLegacyTablePreferencesRequest {
  readonly sourceVersion: 2 | 3 | 4;
  readonly sourceFingerprint: string;
  readonly state: TableViewState;
}

export interface TableViewSaveReceipt {
  readonly tableId: 'squad.primary';
  readonly schemaVersion: 1;
  readonly ownerScope: 'local-fixed';
  readonly acceptedRevision: number;
}

export type LoadTableViewsOutcome =
  | { readonly status: 'loaded'; readonly state: TableViewRepositoryState }
  | {
      readonly status: 'migrated';
      readonly state: TableViewRepositoryState;
      readonly fromEnvelopeVersion: number;
      readonly toEnvelopeVersion: number;
    }
  | {
      readonly status: 'recovered';
      readonly state: TableViewRepositoryState;
      readonly reason: TableViewRecoveryReason;
    }
  | { readonly status: 'unavailable'; readonly fallback: TableViewRepositoryState }
  | {
      readonly status: 'invalid';
      readonly fallback: TableViewRepositoryState;
      readonly reason: string;
    }
  | { readonly status: 'saveFailed'; readonly fallback: TableViewRepositoryState };

export type SaveTableViewsOutcome =
  | {
      readonly status: 'confirmed';
      readonly state: TableViewRepositoryState;
      readonly receipt: TableViewSaveReceipt;
    }
  | { readonly status: 'invalid'; readonly reason: string }
  | { readonly status: 'unavailable' }
  | { readonly status: 'saveFailed' };

export type ImportLegacyTablePreferencesOutcome =
  | {
      readonly status: 'confirmed';
      readonly state: TableViewRepositoryState;
      readonly receipt: LegacyImportReceipt;
      readonly imported: boolean;
    }
  | { readonly status: 'invalid'; readonly reason: string }
  | { readonly status: 'unavailable' }
  | { readonly status: 'saveFailed' };

const MAX_STABLE_ID_BYTES = 64;
const MAX_VIEW_LABEL_BYTES = 96;
const MAX_SAVED_VIEWS = 32;
const MAX_COLUMNS = 18;
const MAX_SORT_CLAUSES = 3;
const MAX_FILTER_DEPTH = 2;
const MAX_FILTER_CLAUSES = 12;
const MAX_FILTER_CHILDREN = 16;
const MAX_FILTER_TEXT_BYTES = 128;
const MAX_FILTER_LIST_VALUES = 32;
const MAX_LEGACY_RECEIPTS = 16;
const MAX_FINGERPRINT_BYTES = 128;
const MAX_FILTER_NUMBER = 1_000_000_000;
const STABLE_ID_PATTERN = /^[A-Za-z0-9._-]+$/;
const FINGERPRINT_PATTERN = /^[A-Za-z0-9._:-]+$/;
const REASON_CODE_PATTERN = /^table_view\.[a-z0-9_]+$/;

const fail = (context: string, path: string): never => {
  throw new TypeError(`Invalid table-view ${context} at ${path}`);
};

const utf8Length = (value: string): number => new TextEncoder().encode(value).length;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const recordAt = (value: unknown, context: string, path: string): Record<string, unknown> => {
  if (!isRecord(value)) return fail(context, path);
  return value;
};

const arrayAt = (
  value: unknown,
  context: string,
  path: string,
  maximum: number,
): readonly unknown[] => {
  if (!Array.isArray(value) || value.length > maximum) {
    return fail(context, path);
  }
  return value;
};

const stringAt = (value: unknown, context: string, path: string, maximumBytes: number): string => {
  if (typeof value !== 'string' || utf8Length(value) > maximumBytes || value.includes('\u0000')) {
    return fail(context, path);
  }
  return value;
};

const oneOfAt = <Value extends string | number>(
  value: unknown,
  allowed: readonly Value[],
  context: string,
  path: string,
): Value => {
  if (!allowed.includes(value as Value)) {
    fail(context, path);
  }
  return value as Value;
};

const booleanAt = (value: unknown, context: string, path: string): boolean => {
  if (typeof value !== 'boolean') return fail(context, path);
  return value;
};

const finiteAt = (value: unknown, context: string, path: string): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fail(context, path);
  }
  return value;
};

const integerAt = (value: unknown, context: string, path: string, minimum = 0): number => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < minimum) {
    return fail(context, path);
  }
  return value;
};

const stableIdAt = (value: unknown, context: string, path: string): string => {
  const id = stringAt(value, context, path, MAX_STABLE_ID_BYTES);
  if (id.length === 0 || !STABLE_ID_PATTERN.test(id)) fail(context, path);
  return id;
};

const fingerprintAt = (value: unknown, context: string, path: string): string => {
  const fingerprint = stringAt(value, context, path, MAX_FINGERPRINT_BYTES);
  if (fingerprint.length === 0 || !FINGERPRINT_PATTERN.test(fingerprint)) {
    fail(context, path);
  }
  return fingerprint;
};

const reasonAt = (value: unknown, context: string, path: string): string => {
  const reason = stringAt(value, context, path, MAX_FILTER_TEXT_BYTES);
  if (!REASON_CODE_PATTERN.test(reason)) fail(context, path);
  return reason;
};

const decodeFilterValue = (value: unknown, context: string, path: string): TableViewFilterValue => {
  const source = recordAt(value, context, path);
  const kind = oneOfAt(
    source.kind,
    ['text', 'number', 'boolean', 'enum', 'enum-set', 'number-range'] as const,
    context,
    `${path}.kind`,
  );

  switch (kind) {
    case 'text':
    case 'enum':
      return {
        kind,
        value: stringAt(source.value, context, `${path}.value`, MAX_FILTER_TEXT_BYTES),
      };
    case 'number': {
      const number = finiteAt(source.value, context, `${path}.value`);
      if (Math.abs(number) > MAX_FILTER_NUMBER) fail(context, `${path}.value`);
      return { kind, value: number };
    }
    case 'boolean':
      return { kind, value: booleanAt(source.value, context, `${path}.value`) };
    case 'enum-set':
      return {
        kind,
        value: arrayAt(source.value, context, `${path}.value`, MAX_FILTER_LIST_VALUES).map(
          (entry, index) =>
            stringAt(entry, context, `${path}.value.${index}`, MAX_FILTER_TEXT_BYTES),
        ),
      };
    case 'number-range': {
      const min = finiteAt(source.min, context, `${path}.min`);
      const max = finiteAt(source.max, context, `${path}.max`);
      if (Math.abs(min) > MAX_FILTER_NUMBER || Math.abs(max) > MAX_FILTER_NUMBER || min > max) {
        fail(context, path);
      }
      return { kind, min, max };
    }
  }
};

const decodeFilterClause = (
  value: unknown,
  context: string,
  path: string,
): TableViewFilterClause => {
  const source = recordAt(value, context, path);
  if (source.kind !== 'clause') fail(context, `${path}.kind`);
  return {
    kind: 'clause',
    filterId: stableIdAt(source.filterId, context, `${path}.filterId`),
    columnId: stableIdAt(source.columnId, context, `${path}.columnId`),
    operator: stableIdAt(source.operator, context, `${path}.operator`),
    value: decodeFilterValue(source.value, context, `${path}.value`),
    enabled: booleanAt(source.enabled, context, `${path}.enabled`),
  };
};

const decodeFilterNode = (
  value: unknown,
  context: string,
  path: string,
  depth: number,
  clauseCounter: { count: number },
): TableViewFilterNode => {
  if (depth > MAX_FILTER_DEPTH) fail(context, path);
  const source = recordAt(value, context, path);
  if (source.kind === 'clause') {
    clauseCounter.count += 1;
    if (clauseCounter.count > MAX_FILTER_CLAUSES) fail(context, path);
    return decodeFilterClause(source, context, path);
  }
  if (source.kind !== 'group') fail(context, `${path}.kind`);
  return decodeFilterGroup(source, context, path, depth, clauseCounter);
};

const decodeFilterGroup = (
  value: unknown,
  context: string,
  path: string,
  depth = 1,
  clauseCounter = { count: 0 },
): TableViewFilterGroup => {
  if (depth > MAX_FILTER_DEPTH) fail(context, path);
  const source = recordAt(value, context, path);
  if (source.kind !== 'group') fail(context, `${path}.kind`);
  return {
    kind: 'group',
    groupId: stableIdAt(source.groupId, context, `${path}.groupId`),
    logic: oneOfAt(source.logic, ['and', 'or'] as const, context, `${path}.logic`),
    children: arrayAt(source.children, context, `${path}.children`, MAX_FILTER_CHILDREN).map(
      (child, index) =>
        decodeFilterNode(child, context, `${path}.children.${index}`, depth + 1, clauseCounter),
    ),
  };
};

const decodeColumn = (value: unknown, context: string, path: string): TableViewColumnState => {
  const source = recordAt(value, context, path);
  const pinning = recordAt(source.pinning, context, `${path}.pinning`);
  const side = oneOfAt(
    pinning.side,
    ['none', 'start', 'end'] as const,
    context,
    `${path}.pinning.side`,
  );
  const order =
    pinning.order === null ? null : integerAt(pinning.order, context, `${path}.pinning.order`);

  if ((side === 'none') !== (order === null)) fail(context, `${path}.pinning`);

  return {
    columnId: stableIdAt(source.columnId, context, `${path}.columnId`),
    visible: booleanAt(source.visible, context, `${path}.visible`),
    width: finiteAt(source.width, context, `${path}.width`),
    pinning: { side, order },
  };
};

const decodeSort = (value: unknown, context: string, path: string): TableViewSortClause => {
  const source = recordAt(value, context, path);
  return {
    columnId: stableIdAt(source.columnId, context, `${path}.columnId`),
    direction: oneOfAt(source.direction, ['asc', 'desc'] as const, context, `${path}.direction`),
    nulls: oneOfAt(source.nulls, ['first', 'last'] as const, context, `${path}.nulls`),
  };
};

const decodeTableViewState = (value: unknown, context: string, path: string): TableViewState => {
  const source = recordAt(value, context, path);
  if (source.tableId !== 'squad.primary') fail(context, `${path}.tableId`);
  if (source.schemaVersion !== 1) fail(context, `${path}.schemaVersion`);
  if (source.ownerScope !== 'local-fixed') fail(context, `${path}.ownerScope`);

  const grouping = arrayAt(source.grouping, context, `${path}.grouping`, 0);
  const dataWindow = recordAt(source.dataWindow, context, `${path}.dataWindow`);
  const state: TableViewState = {
    tableId: 'squad.primary',
    schemaVersion: 1,
    ownerScope: 'local-fixed',
    viewId: stableIdAt(source.viewId, context, `${path}.viewId`),
    baselineViewId: stableIdAt(source.baselineViewId, context, `${path}.baselineViewId`),
    provenance: oneOfAt(
      source.provenance,
      ['system-default', 'user-owned', 'shared-read-only'] as const,
      context,
      `${path}.provenance`,
    ),
    label: stringAt(source.label, context, `${path}.label`, MAX_VIEW_LABEL_BYTES),
    density: oneOfAt(
      source.density,
      ['compact', 'standard', 'comfortable'] as const,
      context,
      `${path}.density`,
    ),
    columns: arrayAt(source.columns, context, `${path}.columns`, MAX_COLUMNS).map((column, index) =>
      decodeColumn(column, context, `${path}.columns.${index}`),
    ),
    sort: arrayAt(source.sort, context, `${path}.sort`, MAX_SORT_CLAUSES).map((sort, index) =>
      decodeSort(sort, context, `${path}.sort.${index}`),
    ),
    filter: decodeFilterGroup(source.filter, context, `${path}.filter`),
    grouping: grouping as readonly [],
    dataWindow: {
      windowId: stableIdAt(dataWindow.windowId, context, `${path}.dataWindow.windowId`),
      mode: oneOfAt(
        dataWindow.mode,
        ['client-pagination'] as const,
        context,
        `${path}.dataWindow.mode`,
      ),
      page: integerAt(dataWindow.page, context, `${path}.dataWindow.page`, 1),
      pageSize: integerAt(dataWindow.pageSize, context, `${path}.dataWindow.pageSize`, 1),
    },
  };

  const validation = validateTableViewState(SQUAD_TABLE_SCHEMA, state);
  if (!validation.valid) fail(context, `${path}.${validation.reason.path}`);
  return state;
};

const decodeReceipt = (value: unknown, context: string, path: string): LegacyImportReceipt => {
  const source = recordAt(value, context, path);
  if (source.tableId !== 'squad.primary') fail(context, `${path}.tableId`);
  if (source.schemaVersion !== 1) fail(context, `${path}.schemaVersion`);
  if (source.ownerScope !== 'local-fixed') fail(context, `${path}.ownerScope`);
  return {
    sourceVersion: oneOfAt(
      source.sourceVersion,
      [2, 3, 4] as const,
      context,
      `${path}.sourceVersion`,
    ),
    sourceFingerprint: fingerprintAt(
      source.sourceFingerprint,
      context,
      `${path}.sourceFingerprint`,
    ),
    tableId: 'squad.primary',
    schemaVersion: 1,
    ownerScope: 'local-fixed',
    importedViewId: stableIdAt(source.importedViewId, context, `${path}.importedViewId`),
    acceptedRevision: integerAt(source.acceptedRevision, context, `${path}.acceptedRevision`),
  };
};

const decodeRepositoryState = (
  value: unknown,
  context: string,
  path: string,
): TableViewRepositoryState => {
  const source = recordAt(value, context, path);
  const metadata = recordAt(source.metadata, context, `${path}.metadata`);
  if (metadata.envelopeVersion !== 1) {
    fail(context, `${path}.metadata.envelopeVersion`);
  }
  if (source.tableId !== 'squad.primary') fail(context, `${path}.tableId`);
  if (source.schemaVersion !== 1) fail(context, `${path}.schemaVersion`);
  if (source.ownerScope !== 'local-fixed') fail(context, `${path}.ownerScope`);

  const views = arrayAt(source.views, context, `${path}.views`, MAX_SAVED_VIEWS).map(
    (view, index): SavedTableView => {
      const entry = recordAt(view, context, `${path}.views.${index}`);
      const mutability = oneOfAt(
        entry.mutability,
        ['immutable', 'mutable', 'read-only'] as const,
        context,
        `${path}.views.${index}.mutability`,
      );
      const state = decodeTableViewState(entry.state, context, `${path}.views.${index}.state`);
      const expectedMutability: TableViewMutability =
        state.provenance === 'system-default'
          ? 'immutable'
          : state.provenance === 'user-owned'
            ? 'mutable'
            : 'read-only';
      if (mutability !== expectedMutability) {
        fail(context, `${path}.views.${index}.mutability`);
      }
      return { mutability, state };
    },
  );
  if (views.length === 0) fail(context, `${path}.views`);

  const viewIds = new Set(views.map(({ state }) => state.viewId));
  if (viewIds.size !== views.length) fail(context, `${path}.views`);
  for (const [index, view] of views.entries()) {
    if (!viewIds.has(view.state.baselineViewId)) {
      fail(context, `${path}.views.${index}.state.baselineViewId`);
    }
  }

  const activeViewId = stableIdAt(source.activeViewId, context, `${path}.activeViewId`);
  const defaultViewId = stableIdAt(source.defaultViewId, context, `${path}.defaultViewId`);
  if (!viewIds.has(activeViewId)) fail(context, `${path}.activeViewId`);
  if (!viewIds.has(defaultViewId)) fail(context, `${path}.defaultViewId`);

  const revision = integerAt(metadata.revision, context, `${path}.metadata.revision`);
  const legacyImportReceipts = arrayAt(
    source.legacyImportReceipts,
    context,
    `${path}.legacyImportReceipts`,
    MAX_LEGACY_RECEIPTS,
  ).map((receipt, index) =>
    decodeReceipt(receipt, context, `${path}.legacyImportReceipts.${index}`),
  );
  const receiptKeys = new Set<string>();
  for (const [index, receipt] of legacyImportReceipts.entries()) {
    const key = `${receipt.sourceVersion}:${receipt.sourceFingerprint}`;
    if (receiptKeys.has(key) || receipt.acceptedRevision > revision) {
      fail(context, `${path}.legacyImportReceipts.${index}`);
    }
    receiptKeys.add(key);
  }

  return {
    metadata: { envelopeVersion: 1, revision },
    tableId: 'squad.primary',
    schemaVersion: 1,
    ownerScope: 'local-fixed',
    activeViewId,
    defaultViewId,
    views,
    legacyImportReceipts,
  };
};

const decodeRecoveryReason = (
  value: unknown,
  context: string,
  path: string,
): TableViewRecoveryReason =>
  oneOfAt(
    value,
    [
      'corrupt_payload',
      'future_envelope_version',
      'future_schema_version',
      'missing_migration_step',
      'interrupted_write',
      'invalid_payload',
    ] as const,
    context,
    path,
  );

const decodeLoadOutcome = (value: unknown): LoadTableViewsOutcome => {
  const context = 'response';
  const source = recordAt(value, context, '$');
  const status = oneOfAt(
    source.status,
    ['loaded', 'migrated', 'recovered', 'unavailable', 'invalid', 'saveFailed'] as const,
    context,
    '$.status',
  );

  switch (status) {
    case 'loaded':
      return {
        status,
        state: decodeRepositoryState(source.state, context, '$.state'),
      };
    case 'migrated': {
      const fromEnvelopeVersion = integerAt(
        source.fromEnvelopeVersion,
        context,
        '$.fromEnvelopeVersion',
      );
      const toEnvelopeVersion = integerAt(source.toEnvelopeVersion, context, '$.toEnvelopeVersion');
      if (fromEnvelopeVersion >= toEnvelopeVersion) {
        fail(context, '$.fromEnvelopeVersion');
      }
      return {
        status,
        state: decodeRepositoryState(source.state, context, '$.state'),
        fromEnvelopeVersion,
        toEnvelopeVersion,
      };
    }
    case 'recovered':
      return {
        status,
        state: decodeRepositoryState(source.state, context, '$.state'),
        reason: decodeRecoveryReason(source.reason, context, '$.reason'),
      };
    case 'unavailable':
      return {
        status,
        fallback: decodeRepositoryState(source.fallback, context, '$.fallback'),
      };
    case 'invalid':
      return {
        status,
        fallback: decodeRepositoryState(source.fallback, context, '$.fallback'),
        reason: reasonAt(source.reason, context, '$.reason'),
      };
    case 'saveFailed':
      return {
        status,
        fallback: decodeRepositoryState(source.fallback, context, '$.fallback'),
      };
  }
};

const decodeSaveReceipt = (
  value: unknown,
  state: TableViewRepositoryState,
  context: string,
  path: string,
): TableViewSaveReceipt => {
  const source = recordAt(value, context, path);
  if (source.tableId !== 'squad.primary') fail(context, `${path}.tableId`);
  if (source.schemaVersion !== 1) fail(context, `${path}.schemaVersion`);
  if (source.ownerScope !== 'local-fixed') fail(context, `${path}.ownerScope`);
  const acceptedRevision = integerAt(source.acceptedRevision, context, `${path}.acceptedRevision`);
  if (acceptedRevision !== state.metadata.revision) {
    fail(context, `${path}.acceptedRevision`);
  }
  return {
    tableId: 'squad.primary',
    schemaVersion: 1,
    ownerScope: 'local-fixed',
    acceptedRevision,
  };
};

const decodeMutationFailure = (
  source: Record<string, unknown>,
  status: 'invalid' | 'unavailable' | 'saveFailed',
  context: string,
): Exclude<SaveTableViewsOutcome, { readonly status: 'confirmed' }> => {
  if (status === 'invalid') {
    return { status, reason: reasonAt(source.reason, context, '$.reason') };
  }
  return { status };
};

const decodeSaveOutcome = (value: unknown): SaveTableViewsOutcome => {
  const context = 'response';
  const source = recordAt(value, context, '$');
  const status = oneOfAt(
    source.status,
    ['confirmed', 'invalid', 'unavailable', 'saveFailed'] as const,
    context,
    '$.status',
  );
  if (status !== 'confirmed') {
    return decodeMutationFailure(source, status, context);
  }
  const state = decodeRepositoryState(source.state, context, '$.state');
  return {
    status,
    state,
    receipt: decodeSaveReceipt(source.receipt, state, context, '$.receipt'),
  };
};

const decodeImportOutcome = (
  value: unknown,
  request: ImportLegacyTablePreferencesRequest,
): ImportLegacyTablePreferencesOutcome => {
  const context = 'response';
  const source = recordAt(value, context, '$');
  const status = oneOfAt(
    source.status,
    ['confirmed', 'invalid', 'unavailable', 'saveFailed'] as const,
    context,
    '$.status',
  );
  if (status !== 'confirmed') {
    return decodeMutationFailure(source, status, context);
  }
  const state = decodeRepositoryState(source.state, context, '$.state');
  const receipt = decodeReceipt(source.receipt, context, '$.receipt');
  if (
    receipt.sourceVersion !== request.sourceVersion ||
    receipt.sourceFingerprint !== request.sourceFingerprint ||
    receipt.importedViewId !== request.state.viewId ||
    !state.legacyImportReceipts.some(
      (candidate) =>
        candidate.sourceVersion === receipt.sourceVersion &&
        candidate.sourceFingerprint === receipt.sourceFingerprint &&
        candidate.importedViewId === receipt.importedViewId &&
        candidate.acceptedRevision === receipt.acceptedRevision,
    )
  ) {
    fail(context, '$.receipt');
  }
  return {
    status,
    state,
    receipt,
    imported: booleanAt(source.imported, context, '$.imported'),
  };
};

const decodeImportRequest = (
  request: ImportLegacyTablePreferencesRequest,
): ImportLegacyTablePreferencesRequest => {
  const sourceVersion = oneOfAt(
    request.sourceVersion,
    [2, 3, 4] as const,
    'import request',
    '$.sourceVersion',
  );
  const state = decodeTableViewState(request.state, 'import request', '$.state');
  if (state.provenance !== 'user-owned') {
    fail('import request', '$.state.provenance');
  }
  return {
    sourceVersion,
    sourceFingerprint: fingerprintAt(
      request.sourceFingerprint,
      'import request',
      '$.sourceFingerprint',
    ),
    state,
  };
};

export const loadTableViews = async (): Promise<LoadTableViewsOutcome> =>
  decodeLoadOutcome(await invoke<unknown>('load_table_views'));

export const saveTableViews = async (
  request: SaveTableViewsRequest,
): Promise<SaveTableViewsOutcome> => {
  const copiedRequest: SaveTableViewsRequest = {
    state: decodeRepositoryState(request.state, 'save request', '$.state'),
  };
  return decodeSaveOutcome(await invoke<unknown>('save_table_views', { request: copiedRequest }));
};

export const importLegacyTablePreferences = async (
  request: ImportLegacyTablePreferencesRequest,
): Promise<ImportLegacyTablePreferencesOutcome> => {
  const copiedRequest = decodeImportRequest(request);
  return decodeImportOutcome(
    await invoke<unknown>('import_legacy_table_preferences', {
      request: copiedRequest,
    }),
    copiedRequest,
  );
};
