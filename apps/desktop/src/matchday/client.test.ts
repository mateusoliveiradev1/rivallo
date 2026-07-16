import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { TableViewState } from '../table-view/table-view-engine.js';
import { SQUAD_SYSTEM_VIEW } from './squad-table-schema.js';
import {
  importLegacyTablePreferences,
  loadMatchday,
  loadTableViews,
  playNextMatch,
  saveMatchdayLineup,
  saveTableViews,
  type ImportLegacyTablePreferencesRequest,
  type LegacyImportReceipt,
  type TableViewRepositoryState,
} from './client.js';

const invoke = vi.hoisted(() => vi.fn());

vi.mock('@tauri-apps/api/core', () => ({ invoke }));

const clone = <Value>(value: Value): Value => JSON.parse(JSON.stringify(value)) as Value;

type DeepMutable<Value> = Value extends readonly (infer Entry)[]
  ? DeepMutable<Entry>[]
  : Value extends object
    ? { -readonly [Key in keyof Value]: DeepMutable<Value[Key]> }
    : Value;

const systemView = (): DeepMutable<TableViewState> =>
  clone(SQUAD_SYSTEM_VIEW) as DeepMutable<TableViewState>;

const repositoryState = (): DeepMutable<TableViewRepositoryState> => ({
  metadata: {
    envelopeVersion: 1,
    revision: 0,
  },
  tableId: 'squad.primary',
  schemaVersion: 1,
  ownerScope: 'local-fixed',
  activeViewId: 'squad.view.system-default',
  defaultViewId: 'squad.view.system-default',
  views: [
    {
      mutability: 'immutable',
      state: systemView(),
    },
  ],
  legacyImportReceipts: [],
});

const importedView = (): DeepMutable<TableViewState> => ({
  ...systemView(),
  viewId: 'squad.user.legacy-v3',
  baselineViewId: 'squad.view.system-default',
  provenance: 'user-owned',
  label: 'Importada',
  density: 'standard',
});

const importedRepositoryState = () => {
  const state = repositoryState();
  const receipt: DeepMutable<LegacyImportReceipt> = {
    sourceVersion: 3,
    sourceFingerprint: 'fnv1a64:legacy-v3',
    tableId: 'squad.primary',
    schemaVersion: 1,
    ownerScope: 'local-fixed',
    importedViewId: 'squad.user.legacy-v3',
    acceptedRevision: 1,
  };

  return {
    state: {
      ...state,
      metadata: { ...state.metadata, revision: 1 },
      activeViewId: 'squad.user.legacy-v3',
      views: [
        ...state.views,
        {
          mutability: 'mutable',
          state: importedView(),
        },
      ],
      legacyImportReceipts: [receipt],
    },
    receipt,
  };
};

describe('existing matchday client commands', () => {
  beforeEach(() => {
    invoke.mockReset();
  });

  it('keeps the exact existing command names and payloads', async () => {
    invoke.mockResolvedValue({ round: 1 });

    await loadMatchday();
    await saveMatchdayLineup(['player.1', 'player.2'], '4-3-3', 'balanced');
    await playNextMatch();

    expect(invoke.mock.calls).toEqual([
      ['matchday_state'],
      [
        'update_matchday_lineup',
        {
          playerIds: ['player.1', 'player.2'],
          formation: '4-3-3',
          approach: 'balanced',
        },
      ],
      ['play_next_match'],
    ]);
  });
});

describe('table-view client commands', () => {
  beforeEach(() => {
    invoke.mockReset();
  });

  it('loads and runtime-decodes a bounded repository outcome', async () => {
    const state = repositoryState();
    invoke.mockResolvedValue({ status: 'loaded', state });

    await expect(loadTableViews()).resolves.toEqual({ status: 'loaded', state });
    expect(invoke).toHaveBeenCalledWith('load_table_views');
  });

  it.each([
    [
      'nested identity',
      (value: ReturnType<typeof repositoryState>) => {
        value.views[0]!.state.viewId = '../outside';
      },
    ],
    [
      'provenance',
      (value: ReturnType<typeof repositoryState>) => {
        Reflect.set(value.views[0]!.state, 'provenance', 'administrator');
      },
    ],
    [
      'column bound',
      (value: ReturnType<typeof repositoryState>) => {
        Reflect.set(value.views[0]!.state.columns[0]!, 'width', Number.POSITIVE_INFINITY);
      },
    ],
    [
      'typed filter value',
      (value: ReturnType<typeof repositoryState>) => {
        Reflect.set(value.views[0]!.state.filter, 'children', [
          {
            kind: 'clause',
            filterId: 'filter.goals',
            columnId: 'goals',
            operator: 'greater-than',
            value: { kind: 'number', value: 'many' },
            enabled: true,
          },
        ]);
      },
    ],
    [
      'oversized view collection',
      (value: ReturnType<typeof repositoryState>) => {
        value.views = Array.from({ length: 33 }, () => value.views[0]!);
      },
    ],
  ])('rejects a malformed %s from invoke', async (_label, mutate) => {
    const state = repositoryState();
    mutate(state);
    invoke.mockResolvedValue({ status: 'loaded', state });

    await expect(loadTableViews()).rejects.toThrow(/table-view response/i);
  });

  it('saves a deeply copied request and decodes its durable receipt', async () => {
    const state = repositoryState();
    const confirmedState = {
      ...repositoryState(),
      metadata: { envelopeVersion: 1, revision: 1 },
    };
    const receipt = {
      tableId: 'squad.primary',
      schemaVersion: 1,
      ownerScope: 'local-fixed',
      acceptedRevision: 1,
    };
    invoke.mockResolvedValue({
      status: 'confirmed',
      state: confirmedState,
      receipt,
    });

    await expect(saveTableViews({ state })).resolves.toEqual({
      status: 'confirmed',
      state: confirmedState,
      receipt,
    });

    const [, payload] = invoke.mock.calls[0]!;
    expect(invoke).toHaveBeenCalledWith('save_table_views', {
      request: { state },
    });
    expect(payload).not.toBeUndefined();
    expect(payload.request).not.toBe(state);
    expect(payload.request.state.views).not.toBe(state.views);
    expect(payload.request.state.views[0].state.columns).not.toBe(state.views[0]!.state.columns);
    expect(payload.request.state.views[0].state.filter).not.toBe(state.views[0]!.state.filter);
  });

  it.each([
    { status: 'invalid', reason: 'table_view.unknown_column_id' },
    { status: 'unavailable' },
    { status: 'saveFailed' },
  ])('preserves a typed save error outcome: $status', async (outcome) => {
    invoke.mockResolvedValue(outcome);

    await expect(saveTableViews({ state: repositoryState() })).resolves.toEqual(outcome);
  });

  it('imports copied legacy intent and validates the confirmed durable receipt', async () => {
    const request: ImportLegacyTablePreferencesRequest = {
      sourceVersion: 3,
      sourceFingerprint: 'fnv1a64:legacy-v3',
      state: importedView(),
    };
    const imported = importedRepositoryState();
    invoke.mockResolvedValue({
      status: 'confirmed',
      state: imported.state,
      receipt: imported.receipt,
      imported: true,
    });

    await expect(importLegacyTablePreferences(request)).resolves.toEqual({
      status: 'confirmed',
      state: imported.state,
      receipt: imported.receipt,
      imported: true,
    });
    expect(invoke).toHaveBeenCalledWith('import_legacy_table_preferences', {
      request,
    });

    const [, payload] = invoke.mock.calls[0]!;
    expect(payload.request).not.toBe(request);
    expect(payload.request.state).not.toBe(request.state);
    expect(payload.request.state.columns).not.toBe(request.state.columns);
  });

  it('rejects a mismatched or malformed import receipt', async () => {
    const imported = importedRepositoryState();
    invoke.mockResolvedValue({
      status: 'confirmed',
      state: imported.state,
      receipt: {
        ...imported.receipt,
        sourceFingerprint: 'fnv1a64:other',
      },
      imported: true,
    });

    await expect(
      importLegacyTablePreferences({
        sourceVersion: 3,
        sourceFingerprint: 'fnv1a64:legacy-v3',
        state: importedView(),
      }),
    ).rejects.toThrow(/table-view response/i);
  });
});
