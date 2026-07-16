import '@testing-library/dom';
import { act, renderHook, waitFor } from '@testing-library/react';
import { StrictMode, type PropsWithChildren } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type {
  ImportLegacyTablePreferencesOutcome,
  LegacyImportReceipt,
  LoadTableViewsOutcome,
  SaveTableViewsOutcome,
  TableViewRepositoryState,
} from './client.js';
import type { LegacySquadTablePreferences } from './legacy-squad-preferences.js';
import { SQUAD_SYSTEM_VIEW } from './squad-table-schema.js';
import {
  useSquadTableView,
  type SquadTableViewControllerDependencies,
} from './use-squad-table-view.js';
import type { TableViewState } from '../table-view/table-view-engine.js';

const clone = <Value,>(value: Value): Value => structuredClone(value);

const repositoryState = (
  activeState: TableViewState = SQUAD_SYSTEM_VIEW,
  otherViews: TableViewRepositoryState['views'] = [],
): TableViewRepositoryState => ({
  metadata: { envelopeVersion: 1, revision: 0 },
  tableId: 'squad.primary',
  schemaVersion: 1,
  ownerScope: 'local-fixed',
  activeViewId: activeState.viewId,
  defaultViewId: SQUAD_SYSTEM_VIEW.viewId,
  views: [
    {
      mutability:
        activeState.provenance === 'system-default'
          ? 'immutable'
          : activeState.provenance === 'user-owned'
            ? 'mutable'
            : 'read-only',
      state: clone(activeState),
    },
    ...otherViews,
  ],
  legacyImportReceipts: [],
});

const confirmedSave = (
  state: TableViewRepositoryState,
): Extract<SaveTableViewsOutcome, { status: 'confirmed' }> => {
  const confirmedState = {
    ...state,
    metadata: {
      ...state.metadata,
      revision: state.metadata.revision + 1,
    },
  };
  return {
    status: 'confirmed',
    state: confirmedState,
    receipt: {
      tableId: 'squad.primary',
      schemaVersion: 1,
      ownerScope: 'local-fixed',
      acceptedRevision: confirmedState.metadata.revision,
    },
  };
};

const noLegacyPreferences = (): LegacySquadTablePreferences => ({
  status: 'none',
  fallback: clone(SQUAD_SYSTEM_VIEW),
});

const dependencies = (
  overrides: Partial<SquadTableViewControllerDependencies> = {},
): SquadTableViewControllerDependencies => ({
  load: vi.fn().mockResolvedValue({
    status: 'loaded',
    state: repositoryState(),
  } satisfies LoadTableViewsOutcome),
  save: vi.fn(async ({ state }) => confirmedSave(state)),
  importLegacy: vi.fn(),
  legacy: {
    read: vi.fn(noLegacyPreferences),
    retire: vi.fn(() => true),
  },
  createViewId: vi.fn(() => 'squad.user.generated'),
  ...overrides,
});

const deferred = <Value,>() => {
  let resolve!: (value: Value) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<Value>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
};

const strictWrapper = ({ children }: PropsWithChildren) => <StrictMode>{children}</StrictMode>;

describe('useSquadTableView', () => {
  it('keeps a valid geometry-preserving system view while loading, then exposes the durable baseline', async () => {
    const pendingLoad = deferred<LoadTableViewsOutcome>();
    const load = vi.fn(() => pendingLoad.promise);
    const { result } = renderHook(() =>
      useSquadTableView({ dependencies: dependencies({ load }) }),
    );

    expect(result.current.repositoryStatus).toEqual({
      status: 'loading',
      heading: 'Carregando visualizações do elenco…',
    });
    expect(result.current.proposal).toEqual(SQUAD_SYSTEM_VIEW);
    expect(result.current.baseline).toEqual(SQUAD_SYSTEM_VIEW);
    expect(result.current.dirty).toBe(false);

    pendingLoad.resolve({ status: 'loaded', state: repositoryState() });

    await waitFor(() => expect(result.current.repositoryStatus.status).toBe('loaded'));
    expect(result.current.activeViewId).toBe(SQUAD_SYSTEM_VIEW.viewId);
    expect(result.current.defaultViewId).toBe(SQUAD_SYSTEM_VIEW.viewId);
    expect(result.current.dirtyText).toBeNull();
  });

  it('reduces commands into immediate normalized previews and retains prior state on rejection', async () => {
    const { result } = renderHook(() => useSquadTableView({ dependencies: dependencies() }));
    await waitFor(() => expect(result.current.repositoryStatus.status).toBe('loaded'));

    act(() => {
      result.current.dispatch({ type: 'density.set', density: 'standard' });
    });

    expect(result.current.proposal.density).toBe('standard');
    expect(result.current.dirty).toBe(true);
    expect(result.current.dirtyText).toBe('Alterações não salvas');

    const retained = result.current.proposal;
    act(() => {
      result.current.dispatch({
        type: 'column.resize',
        columnId: 'unknown-column',
        width: Number.POSITIVE_INFINITY,
      });
    });

    expect(result.current.proposal).toBe(retained);
    expect(result.current.commandStatus.status).toBe('rejected');
    if (result.current.commandStatus.status === 'rejected') {
      expect(result.current.commandStatus.reason).toMatchObject({
        code: 'unknown-column-id',
        path: 'command.columnId',
      });
      expect(result.current.commandStatus.heading).toBe('Este ajuste não pode ser aplicado');
    }
  });

  it('keeps a dirty proposal after save failure and advances the baseline only after retry confirmation', async () => {
    const save = vi
      .fn<SquadTableViewControllerDependencies['save']>()
      .mockResolvedValueOnce({ status: 'saveFailed' })
      .mockImplementation(async ({ state }) => confirmedSave(state));
    const { result } = renderHook(() =>
      useSquadTableView({ dependencies: dependencies({ save }) }),
    );
    await waitFor(() => expect(result.current.repositoryStatus.status).toBe('loaded'));

    act(() => {
      result.current.dispatch({ type: 'density.set', density: 'comfortable' });
    });

    await act(async () => {
      expect((await result.current.save('Ajustes do elenco')).status).toBe('failed');
    });

    expect(result.current.proposal.density).toBe('comfortable');
    expect(result.current.baseline.density).toBe('compact');
    expect(result.current.dirty).toBe(true);
    expect(result.current.persistenceStatus).toMatchObject({
      status: 'failed',
      reason: 'save-failed',
      heading: 'Não foi possível salvar a visualização',
    });

    await act(async () => {
      expect((await result.current.retry()).status).toBe('confirmed');
    });

    expect(save).toHaveBeenCalledTimes(2);
    expect(result.current.baseline.density).toBe('comfortable');
    expect(result.current.dirty).toBe(false);
    expect(result.current.persistenceStatus.status).toBe('confirmed');
  });

  it('does not let a confirmed save erase a newer in-memory proposal', async () => {
    const pendingSave = deferred<SaveTableViewsOutcome>();
    const save = vi.fn<SquadTableViewControllerDependencies['save']>(() => pendingSave.promise);
    const { result } = renderHook(() =>
      useSquadTableView({ dependencies: dependencies({ save }) }),
    );
    await waitFor(() => expect(result.current.repositoryStatus.status).toBe('loaded'));

    act(() => {
      result.current.dispatch({ type: 'density.set', density: 'standard' });
    });
    let savePromise!: ReturnType<typeof result.current.save>;
    act(() => {
      savePromise = result.current.save('Ajustes do elenco');
    });
    await waitFor(() => expect(result.current.persistenceStatus.status).toBe('saving'));

    act(() => {
      result.current.dispatch({ type: 'density.set', density: 'comfortable' });
    });
    const submittedState = save.mock.calls[0]?.[0].state;
    expect(submittedState).toBeDefined();

    await act(async () => {
      pendingSave.resolve(confirmedSave(submittedState!));
      await savePromise;
    });

    expect(result.current.baseline.density).toBe('standard');
    expect(result.current.proposal.density).toBe('comfortable');
    expect(result.current.dirty).toBe(true);
  });

  it('loads before one StrictMode legacy import and retires only after the matching receipt is confirmed', async () => {
    const events: string[] = [];
    const importedState: TableViewState = {
      ...clone(SQUAD_SYSTEM_VIEW),
      viewId: 'squad.user.legacy-v3-abcd',
      baselineViewId: SQUAD_SYSTEM_VIEW.viewId,
      provenance: 'user-owned',
      label: 'Preferências importadas',
      density: 'standard',
    };
    const preferences: LegacySquadTablePreferences = {
      status: 'ready',
      sourceKey: 'rivallo.squad-ui.v3',
      request: {
        sourceVersion: 3,
        sourceFingerprint: 'fnv1a32:abcd1234',
        state: importedState,
      },
    };
    const receipt: LegacyImportReceipt = {
      sourceVersion: 3,
      sourceFingerprint: 'fnv1a32:abcd1234',
      tableId: 'squad.primary',
      schemaVersion: 1,
      ownerScope: 'local-fixed',
      importedViewId: importedState.viewId,
      acceptedRevision: 1,
    };
    const importedRepository: TableViewRepositoryState = {
      ...repositoryState(),
      metadata: { envelopeVersion: 1, revision: 1 },
      activeViewId: importedState.viewId,
      views: [...repositoryState().views, { mutability: 'mutable', state: importedState }],
      legacyImportReceipts: [receipt],
    };
    const pendingImport = deferred<ImportLegacyTablePreferencesOutcome>();
    const load = vi.fn(async () => {
      events.push('load');
      return { status: 'loaded', state: repositoryState() } satisfies LoadTableViewsOutcome;
    });
    const legacy = {
      read: vi.fn(() => {
        events.push('legacy-read');
        return preferences;
      }),
      retire: vi.fn(() => {
        events.push('legacy-retire');
        return true;
      }),
    };
    const importLegacy = vi.fn(() => {
      events.push('legacy-import');
      return pendingImport.promise;
    });

    const { result } = renderHook(
      () =>
        useSquadTableView({
          dependencies: dependencies({ importLegacy, legacy, load }),
        }),
      { wrapper: strictWrapper },
    );

    await waitFor(() => expect(importLegacy).toHaveBeenCalledOnce());
    expect(load).toHaveBeenCalledOnce();
    expect(legacy.read).toHaveBeenCalledOnce();
    expect(events.slice(0, 3)).toEqual(['load', 'legacy-read', 'legacy-import']);
    expect(legacy.retire).not.toHaveBeenCalled();

    pendingImport.resolve({
      status: 'confirmed',
      state: importedRepository,
      receipt,
      imported: true,
    });

    await waitFor(() => expect(result.current.legacyStatus.status).toBe('imported'));
    expect(legacy.retire).toHaveBeenCalledOnce();
    expect(legacy.retire).toHaveBeenCalledWith(preferences, receipt);
    expect(result.current.activeViewId).toBe(importedState.viewId);
    expect(result.current.proposal.density).toBe('standard');
  });

  it('retires a previously confirmed legacy source without importing it again', async () => {
    const importedState: TableViewState = {
      ...clone(SQUAD_SYSTEM_VIEW),
      viewId: 'squad.user.legacy-v4-existing',
      baselineViewId: SQUAD_SYSTEM_VIEW.viewId,
      provenance: 'user-owned',
      label: 'Importada',
    };
    const preferences: LegacySquadTablePreferences = {
      status: 'ready',
      sourceKey: 'rivallo.squad-ui.v4',
      request: {
        sourceVersion: 4,
        sourceFingerprint: 'fnv1a32:existing',
        state: importedState,
      },
    };
    const receipt: LegacyImportReceipt = {
      sourceVersion: 4,
      sourceFingerprint: 'fnv1a32:existing',
      tableId: 'squad.primary',
      schemaVersion: 1,
      ownerScope: 'local-fixed',
      importedViewId: importedState.viewId,
      acceptedRevision: 4,
    };
    const loadedState: TableViewRepositoryState = {
      ...repositoryState(),
      metadata: { envelopeVersion: 1, revision: 4 },
      views: [...repositoryState().views, { mutability: 'mutable', state: importedState }],
      legacyImportReceipts: [receipt],
    };
    const importLegacy = vi.fn();
    const legacy = {
      read: vi.fn(() => preferences),
      retire: vi.fn(() => true),
    };

    const { result } = renderHook(() =>
      useSquadTableView({
        dependencies: dependencies({
          importLegacy,
          legacy,
          load: vi.fn().mockResolvedValue({ status: 'loaded', state: loadedState }),
        }),
      }),
    );

    await waitFor(() => expect(result.current.legacyStatus.status).toBe('already-imported'));
    expect(importLegacy).not.toHaveBeenCalled();
    expect(legacy.retire).toHaveBeenCalledWith(preferences, receipt);
  });

  it.each([
    {
      outcome: {
        status: 'recovered',
        state: repositoryState(),
        reason: 'future_schema_version',
      } satisfies LoadTableViewsOutcome,
      expectedStatus: 'recovered',
      expectedHeading: 'Esta visualização exige uma versão mais recente',
    },
    {
      outcome: {
        status: 'unavailable',
        fallback: repositoryState(),
      } satisfies LoadTableViewsOutcome,
      expectedStatus: 'unavailable',
      expectedHeading: 'Visualizações personalizadas indisponíveis',
    },
    {
      outcome: {
        status: 'invalid',
        fallback: repositoryState(),
        reason: 'table_view.invalid_payload',
      } satisfies LoadTableViewsOutcome,
      expectedStatus: 'invalid',
      expectedHeading: 'Não foi possível carregar suas visualizações',
    },
  ])(
    'keeps the system view usable for $expectedStatus repository outcomes',
    async ({ expectedHeading, expectedStatus, outcome }) => {
      const { result } = renderHook(() =>
        useSquadTableView({
          dependencies: dependencies({ load: vi.fn().mockResolvedValue(outcome) }),
        }),
      );

      await waitFor(() => expect(result.current.repositoryStatus.status).toBe(expectedStatus));
      expect(result.current.repositoryStatus.heading).toBe(expectedHeading);
      expect(result.current.proposal.tableId).toBe('squad.primary');
      expect(result.current.proposal.columns).toHaveLength(18);
      expect(JSON.stringify(result.current.repositoryStatus)).not.toMatch(/offline|network/i);
    },
  );

  it('ignores an older load completion after an explicit reload wins', async () => {
    const first = deferred<LoadTableViewsOutcome>();
    const second = deferred<LoadTableViewsOutcome>();
    const standardView = { ...clone(SQUAD_SYSTEM_VIEW), density: 'standard' };
    const load = vi
      .fn<SquadTableViewControllerDependencies['load']>()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const { result } = renderHook(() =>
      useSquadTableView({ dependencies: dependencies({ load }) }),
    );

    act(() => {
      void result.current.reload();
    });
    second.resolve({ status: 'loaded', state: repositoryState(standardView) });
    await waitFor(() => expect(result.current.proposal.density).toBe('standard'));

    first.resolve({ status: 'loaded', state: repositoryState() });
    await act(async () => {
      await first.promise;
    });

    expect(result.current.proposal.density).toBe('standard');
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('guards dirty view and screen transitions with explicit save, discard, or cancel decisions', async () => {
    const otherView: TableViewState = {
      ...clone(SQUAD_SYSTEM_VIEW),
      viewId: 'squad.user.other',
      baselineViewId: SQUAD_SYSTEM_VIEW.viewId,
      provenance: 'user-owned',
      label: 'Outra visão',
      density: 'comfortable',
    };
    const stateWithOtherView = repositoryState(SQUAD_SYSTEM_VIEW, [
      { mutability: 'mutable', state: otherView },
    ]);
    const { result } = renderHook(() =>
      useSquadTableView({
        dependencies: dependencies({
          load: vi.fn().mockResolvedValue({ status: 'loaded', state: stateWithOtherView }),
        }),
      }),
    );
    await waitFor(() => expect(result.current.repositoryStatus.status).toBe('loaded'));

    act(() => {
      result.current.dispatch({ type: 'density.set', density: 'standard' });
    });
    await act(async () => {
      expect((await result.current.activate(otherView.viewId)).status).toBe('blocked');
      expect((await result.current.guardTransition()).status).toBe('blocked');
      expect((await result.current.guardTransition('cancel')).status).toBe('cancelled');
    });
    expect(result.current.proposal.density).toBe('standard');

    await act(async () => {
      expect((await result.current.activate(otherView.viewId, 'discard')).status).toBe('confirmed');
    });
    expect(result.current.activeViewId).toBe(otherView.viewId);
    expect(result.current.proposal.density).toBe('comfortable');
    expect(result.current.dirty).toBe(false);
  });

  it('supports provenance-aware create, duplicate, rename, default, reset, and delete transitions', async () => {
    const ids = ['squad.user.created', 'squad.user.duplicate'];
    const { result } = renderHook(() =>
      useSquadTableView({
        dependencies: dependencies({
          createViewId: vi.fn(() => ids.shift() ?? 'squad.user.extra'),
        }),
      }),
    );
    await waitFor(() => expect(result.current.repositoryStatus.status).toBe('loaded'));

    await act(async () => {
      expect((await result.current.create('Minha visão')).status).toBe('confirmed');
    });
    expect(result.current.activeViewId).toBe('squad.user.created');
    expect(result.current.proposal.provenance).toBe('user-owned');

    act(() => {
      result.current.dispatch({ type: 'density.set', density: 'standard' });
    });
    await act(async () => {
      expect((await result.current.save()).status).toBe('confirmed');
      expect((await result.current.duplicate('squad.user.created', 'Cópia')).status).toBe(
        'confirmed',
      );
      expect((await result.current.rename('squad.user.duplicate', 'Renomeada')).status).toBe(
        'confirmed',
      );
      expect((await result.current.setDefault('squad.user.duplicate')).status).toBe('confirmed');
    });
    expect(result.current.defaultViewId).toBe('squad.user.duplicate');
    expect(result.current.proposal.label).toBe('Renomeada');

    act(() => {
      result.current.dispatch({ type: 'density.set', density: 'comfortable' });
      result.current.reset();
    });
    expect(result.current.proposal.density).toBe('standard');

    await act(async () => {
      expect((await result.current.delete('squad.user.duplicate')).status).toBe('confirmed');
    });
    expect(result.current.views.some(({ state }) => state.viewId === 'squad.user.duplicate')).toBe(
      false,
    );
    expect(result.current.activeViewId).toBe('squad.view.system-default');
    expect(result.current.defaultViewId).toBe('squad.view.system-default');
  });

  it('never persists implicitly when an unmounted controller has a dirty proposal', async () => {
    const save = vi.fn<SquadTableViewControllerDependencies['save']>();
    const { result, unmount } = renderHook(() =>
      useSquadTableView({ dependencies: dependencies({ save }) }),
    );
    await waitFor(() => expect(result.current.repositoryStatus.status).toBe('loaded'));

    act(() => {
      result.current.dispatch({ type: 'density.set', density: 'standard' });
    });
    expect(result.current.dirty).toBe(true);

    unmount();
    expect(save).not.toHaveBeenCalled();
  });
});
