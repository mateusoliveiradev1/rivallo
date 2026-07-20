import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { TableViewState } from '../table-view/table-view-engine.js';
import { SQUAD_SYSTEM_VIEW } from './squad-table-schema.js';
import {
  importLegacyTablePreferences,
  loadClubProfile,
  loadCoachProfile,
  loadNationProfile,
  loadPlayerProfile,
  loadTacticalMatchSnapshot,
  loadTacticalStrategyCatalog,
  loadMatchday,
  loadTableViews,
  playNextMatch,
  previewPlayerProfile,
  previewTacticalPlan,
  saveMatchdayLineup,
  saveTacticalPlan,
  saveTableViews,
  searchProfiles,
  updateTacticalLibrary,
  type ImportLegacyTablePreferencesRequest,
  type LegacyImportReceipt,
  type TableViewRepositoryState,
} from './client.js';
import type { TacticalPlanProposal } from './types.js';

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

  it('sends the complete versioned tactical proposal through one atomic command', async () => {
    invoke.mockResolvedValue({ state: { round: 1 }, event: { kind: 'variationSaved' } });
    const proposal: TacticalPlanProposal = {
      expectedRevision: 4,
      variationId: 'tactical-variation.primary',
      name: 'Assimetria Aurora',
      sourcePresetId: '4-3-3',
      formation: '4-3-3',
      placements: Array.from({ length: 11 }, (_, index) => ({
        playerId: `player.${index + 1}`,
        normalizedX: index === 0 ? 0.08 : 0.2 + index * 0.06,
        normalizedY: 0.1 + (index % 5) * 0.18,
        positionId: index === 0 ? ('GK' as const) : ('CM' as const),
        roleId: null,
        side: 'centre' as const,
        line: index === 0 ? ('goal' as const) : ('midfield' as const),
        zone: index === 0 ? ('goal' as const) : ('middleThird' as const),
        sourcePresetSlotId: null,
        revision: 4,
      })),
      bench: ['player.12'],
      customFormation: {
        id: 'formation.primary',
        name: 'Assimetria Aurora',
        isCustom: true,
        origin: 'manager',
        createdAtRevision: 0,
        updatedAtRevision: 4,
      },
      approach: 'balanced',
    };

    await saveTacticalPlan(proposal);

    expect(invoke).toHaveBeenCalledWith('update_tactical_plan', { proposal });
  });

  it('sends versioned lifecycle commands through the tactical library boundary', async () => {
    invoke.mockResolvedValue({ state: { round: 1 }, event: { kind: 'variationActivated' } });
    const command = {
      kind: 'activate' as const,
      expectedLibraryRevision: 7,
      variationId: 'tactical-variation.laterais-altos',
    };

    await updateTacticalLibrary(command);

    expect(invoke).toHaveBeenCalledWith('update_tactical_library', { request: command });
  });

  it('exposes authoritative preview, preset catalog and immutable match snapshot commands', async () => {
    invoke.mockResolvedValue({});
    const proposal = { variationId: 'tactical-variation.primary' } as TacticalPlanProposal;

    await previewTacticalPlan(proposal);
    await loadTacticalStrategyCatalog();
    await loadTacticalMatchSnapshot('tactical-variation.primary');

    expect(invoke.mock.calls).toEqual([
      ['preview_tactical_plan', { proposal }],
      ['tactical_strategy_catalog'],
      ['tactical_match_snapshot', { variationId: 'tactical-variation.primary' }],
    ]);
  });

  it('opens global profiles and searches through typed Tauri commands', async () => {
    invoke.mockResolvedValue({});

    await loadPlayerProfile('player.7', 'tactical-variation.primary');
    await previewPlayerProfile('player.7', 'tactical-variation.primary');
    await loadCoachProfile('coach.aurora.1');
    await loadClubProfile('aurora-fc');
    await loadNationProfile('bra');
    await searchProfiles('martín');

    expect(invoke.mock.calls).toEqual([
      ['player_profile', { playerId: 'player.7', variationId: 'tactical-variation.primary' }],
      [
        'preview_player_profile',
        { playerId: 'player.7', variationId: 'tactical-variation.primary' },
      ],
      ['coach_profile', { coachId: 'coach.aurora.1' }],
      ['club_profile', { clubId: 'aurora-fc' }],
      ['nation_profile', { nationId: 'bra' }],
      ['search_profiles', { query: 'martín' }],
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

  it('accepts a durable legacy-import receipt after its imported view was deleted', async () => {
    const imported = importedRepositoryState();
    const state = {
      ...imported.state,
      metadata: { ...imported.state.metadata, revision: 2 },
      activeViewId: 'squad.view.system-default',
      views: imported.state.views.filter(
        ({ state: viewState }) => viewState.viewId !== imported.receipt.importedViewId,
      ),
    };
    invoke.mockResolvedValue({ status: 'loaded', state });

    await expect(loadTableViews()).resolves.toEqual({ status: 'loaded', state });
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
