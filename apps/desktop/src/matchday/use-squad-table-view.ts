import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  importLegacyTablePreferences,
  loadTableViews,
  saveTableViews,
  type ImportLegacyTablePreferencesOutcome,
  type LegacyImportReceipt,
  type LoadTableViewsOutcome,
  type SaveTableViewsOutcome,
  type SavedTableView,
  type TableViewRepositoryState,
} from './client.js';
import {
  browserLegacySquadPreferenceAdapter,
  type LegacySquadPreferenceAdapter,
  type LegacySquadTablePreferences,
} from './legacy-squad-preferences.js';
import { SQUAD_SYSTEM_VIEW, SQUAD_TABLE_SCHEMA } from './squad-table-schema.js';
import {
  applyTableViewCommand,
  isTableViewDirty,
  normalizeTableViewState,
  type TableViewAnnouncement,
  type TableViewCommand,
  type TableViewCommandResult,
  type TableViewEvent,
  type TableViewFocusTarget,
  type TableViewRejectionReason,
  type TableViewState,
} from '../table-view/table-view-engine.js';

export type SquadTableViewRepositoryStatus =
  | {
      readonly status: 'loading';
      readonly heading: 'Carregando visualizações do elenco…';
    }
  | {
      readonly status: 'loaded';
      readonly heading: 'Visualizações do elenco carregadas';
    }
  | {
      readonly status: 'migrated';
      readonly heading: 'Visualizações do elenco atualizadas';
      readonly fromEnvelopeVersion: number;
      readonly toEnvelopeVersion: number;
    }
  | {
      readonly status: 'recovered';
      readonly heading:
        | 'Uma visualização corrompida foi isolada'
        | 'Esta visualização exige uma versão mais recente'
        | 'Visualizações do elenco recuperadas';
      readonly reason: LoadTableViewsOutcome extends infer Outcome
        ? Outcome extends { readonly status: 'recovered'; readonly reason: infer Reason }
          ? Reason
          : never
        : never;
    }
  | {
      readonly status: 'unavailable';
      readonly heading: 'Visualizações personalizadas indisponíveis';
    }
  | {
      readonly status: 'invalid';
      readonly heading: 'Não foi possível carregar suas visualizações';
      readonly reason: string;
    }
  | {
      readonly status: 'save-failed';
      readonly heading: 'Não foi possível carregar suas visualizações';
    };

export type SquadTableViewLegacyStatus =
  | { readonly status: 'pending' }
  | { readonly status: 'none' }
  | {
      readonly status: 'invalid';
      readonly heading: 'Preferências antigas não puderam ser importadas';
      readonly reason: Extract<
        LegacySquadTablePreferences,
        { readonly status: 'invalid' }
      >['reason'];
    }
  | { readonly status: 'importing' }
  | {
      readonly status: 'imported';
      readonly heading: 'Preferências antigas importadas';
      readonly receipt: LegacyImportReceipt;
      readonly retired: boolean;
    }
  | {
      readonly status: 'already-imported';
      readonly heading: 'Preferências antigas importadas';
      readonly receipt: LegacyImportReceipt;
      readonly retired: boolean;
    }
  | {
      readonly status: 'deferred';
      readonly heading: 'Visualizações personalizadas indisponíveis';
    }
  | {
      readonly status: 'failed';
      readonly heading: 'Preferências antigas não puderam ser importadas';
      readonly reason: 'invalid' | 'unavailable' | 'save-failed' | 'exception';
      readonly detail?: string;
    };

export type SquadTableViewPersistenceFailure =
  'invalid' | 'unavailable' | 'save-failed' | 'exception';

export type SquadTableViewPersistenceStatus =
  | { readonly status: 'idle' }
  | {
      readonly status: 'saving';
      readonly intent: SquadTableViewMutationIntent;
      readonly heading: 'Salvando visualização…';
    }
  | {
      readonly status: 'confirmed';
      readonly intent: SquadTableViewMutationIntent;
      readonly acceptedRevision: number;
    }
  | {
      readonly status: 'failed';
      readonly intent: SquadTableViewMutationIntent;
      readonly reason: SquadTableViewPersistenceFailure;
      readonly heading: 'Não foi possível salvar a visualização';
      readonly detail?: string;
    };

export type SquadTableViewCommandStatus =
  | { readonly status: 'idle' }
  | {
      readonly status: 'accepted';
      readonly event: Extract<TableViewEvent, { readonly type: 'accepted' }>;
    }
  | {
      readonly status: 'rejected';
      readonly heading: 'Este ajuste não pode ser aplicado';
      readonly reason: TableViewRejectionReason;
      readonly event: Extract<TableViewEvent, { readonly type: 'rejected' }>;
    };

export type SquadTableViewTransitionDecision = 'save' | 'discard' | 'cancel';

export type SquadTableViewTransitionStatus =
  | { readonly status: 'idle' }
  | {
      readonly status: 'blocked';
      readonly target: 'screen' | string;
      readonly heading: 'Alterações não salvas';
    }
  | { readonly status: 'cancelled'; readonly target: 'screen' | string }
  | {
      readonly status: 'proceeding';
      readonly target: 'screen' | string;
      readonly decision: 'save' | 'discard' | 'clean';
    };

export type SquadTableViewMutationIntent =
  'save' | 'activate' | 'create' | 'duplicate' | 'rename' | 'delete' | 'set-default';

export type SquadTableViewBlockedReason =
  | 'busy'
  | 'dirty'
  | 'invalid-name'
  | 'name-required'
  | 'not-found'
  | 'read-only'
  | 'repository-unavailable';

export type SquadTableViewActionResult =
  | {
      readonly status: 'confirmed';
      readonly intent: SquadTableViewMutationIntent;
      readonly acceptedRevision: number;
    }
  | { readonly status: 'discarded' }
  | { readonly status: 'clean' }
  | { readonly status: 'cancelled' }
  | { readonly status: 'blocked'; readonly reason: SquadTableViewBlockedReason }
  | {
      readonly status: 'failed';
      readonly reason: SquadTableViewPersistenceFailure;
    }
  | { readonly status: 'ignored' };

export interface SquadTableViewTransientState {
  readonly customizerOpen: boolean;
  readonly focus: TableViewFocusTarget | null;
  readonly announcement: TableViewAnnouncement | null;
}

export interface SquadTableViewCapabilities {
  readonly canPersist: boolean;
  readonly canCreate: boolean;
  readonly canDuplicate: boolean;
  readonly canRename: boolean;
  readonly canDelete: boolean;
  readonly canSetDefault: boolean;
  readonly canReset: boolean;
}

export interface SquadTableViewControllerDependencies {
  readonly load: typeof loadTableViews;
  readonly save: typeof saveTableViews;
  readonly importLegacy: typeof importLegacyTablePreferences;
  readonly legacy: LegacySquadPreferenceAdapter;
  readonly createViewId: () => string;
}

export interface UseSquadTableViewOptions {
  readonly dependencies?: SquadTableViewControllerDependencies;
}

export interface SquadTableViewController {
  readonly repositoryStatus: SquadTableViewRepositoryStatus;
  readonly legacyStatus: SquadTableViewLegacyStatus;
  readonly persistenceStatus: SquadTableViewPersistenceStatus;
  readonly commandStatus: SquadTableViewCommandStatus;
  readonly transitionStatus: SquadTableViewTransitionStatus;
  readonly repository: TableViewRepositoryState;
  readonly views: readonly SavedTableView[];
  readonly activeViewId: string;
  readonly defaultViewId: string;
  readonly proposal: TableViewState;
  readonly baseline: TableViewState;
  readonly dirty: boolean;
  readonly dirtyText: 'Alterações não salvas' | null;
  readonly transient: SquadTableViewTransientState;
  readonly capabilities: SquadTableViewCapabilities;
  readonly dispatch: (command: TableViewCommand) => TableViewCommandResult;
  readonly reload: () => Promise<void>;
  readonly save: (name?: string) => Promise<SquadTableViewActionResult>;
  readonly retry: () => Promise<SquadTableViewActionResult>;
  readonly discard: () => SquadTableViewActionResult;
  readonly reset: () => TableViewCommandResult;
  readonly guardTransition: (
    decision?: SquadTableViewTransitionDecision,
    saveAsName?: string,
  ) => Promise<SquadTableViewActionResult>;
  readonly activate: (
    viewId: string,
    decision?: SquadTableViewTransitionDecision,
    saveAsName?: string,
  ) => Promise<SquadTableViewActionResult>;
  readonly create: (name: string) => Promise<SquadTableViewActionResult>;
  readonly duplicate: (viewId: string, name?: string) => Promise<SquadTableViewActionResult>;
  readonly rename: (viewId: string, name: string) => Promise<SquadTableViewActionResult>;
  readonly delete: (viewId: string) => Promise<SquadTableViewActionResult>;
  readonly setDefault: (viewId: string) => Promise<SquadTableViewActionResult>;
  readonly setCustomizerOpen: (open: boolean) => void;
  readonly clearAnnouncement: () => void;
}

let fallbackViewId = 0;

const createStableViewId = (): string => {
  const randomId = globalThis.crypto?.randomUUID?.();
  if (randomId !== undefined) return `squad.user.${randomId}`;
  fallbackViewId += 1;
  return `squad.user.local-${Date.now().toString(36)}-${fallbackViewId.toString(36)}`;
};

const defaultDependencies: SquadTableViewControllerDependencies = {
  load: loadTableViews,
  save: saveTableViews,
  importLegacy: importLegacyTablePreferences,
  legacy: browserLegacySquadPreferenceAdapter,
  createViewId: createStableViewId,
};

const normalizedSystemView = (): TableViewState =>
  normalizeTableViewState(SQUAD_TABLE_SCHEMA, SQUAD_SYSTEM_VIEW);

const initialRepositoryState = (): TableViewRepositoryState => {
  const systemView = normalizedSystemView();
  return {
    metadata: { envelopeVersion: 1, revision: 0 },
    tableId: 'squad.primary',
    schemaVersion: 1,
    ownerScope: 'local-fixed',
    activeViewId: systemView.viewId,
    defaultViewId: systemView.viewId,
    views: [{ mutability: 'immutable', state: systemView }],
    legacyImportReceipts: [],
  };
};

const activeSavedView = (repository: TableViewRepositoryState): SavedTableView => {
  const active = repository.views.find(({ state }) => state.viewId === repository.activeViewId);
  if (active !== undefined) return active;
  const system = repository.views.find(({ state }) => state.provenance === 'system-default');
  return system ?? repository.views[0] ?? initialRepositoryState().views[0]!;
};

const matchingLegacyReceipt = (
  repository: TableViewRepositoryState,
  preferences: Extract<LegacySquadTablePreferences, { readonly status: 'ready' }>,
): LegacyImportReceipt | null =>
  repository.legacyImportReceipts.find(
    (receipt) =>
      receipt.sourceVersion === preferences.request.sourceVersion &&
      receipt.sourceFingerprint === preferences.request.sourceFingerprint &&
      receipt.importedViewId === preferences.request.state.viewId,
  ) ?? null;

const importReceiptMatches = (
  outcome: Extract<ImportLegacyTablePreferencesOutcome, { readonly status: 'confirmed' }>,
  preferences: Extract<LegacySquadTablePreferences, { readonly status: 'ready' }>,
): boolean =>
  outcome.receipt.sourceVersion === preferences.request.sourceVersion &&
  outcome.receipt.sourceFingerprint === preferences.request.sourceFingerprint &&
  outcome.receipt.importedViewId === preferences.request.state.viewId &&
  outcome.state.legacyImportReceipts.some(
    (receipt) =>
      receipt.sourceVersion === outcome.receipt.sourceVersion &&
      receipt.sourceFingerprint === outcome.receipt.sourceFingerprint &&
      receipt.importedViewId === outcome.receipt.importedViewId &&
      receipt.acceptedRevision === outcome.receipt.acceptedRevision,
  );

const repositoryStateFromOutcome = (outcome: LoadTableViewsOutcome): TableViewRepositoryState =>
  'state' in outcome ? outcome.state : outcome.fallback;

const repositoryStatusFromOutcome = (
  outcome: LoadTableViewsOutcome,
): SquadTableViewRepositoryStatus => {
  switch (outcome.status) {
    case 'loaded':
      return { status: 'loaded', heading: 'Visualizações do elenco carregadas' };
    case 'migrated':
      return {
        status: 'migrated',
        heading: 'Visualizações do elenco atualizadas',
        fromEnvelopeVersion: outcome.fromEnvelopeVersion,
        toEnvelopeVersion: outcome.toEnvelopeVersion,
      };
    case 'recovered':
      return {
        status: 'recovered',
        heading:
          outcome.reason === 'corrupt_payload'
            ? 'Uma visualização corrompida foi isolada'
            : outcome.reason === 'future_envelope_version' ||
                outcome.reason === 'future_schema_version'
              ? 'Esta visualização exige uma versão mais recente'
              : 'Visualizações do elenco recuperadas',
        reason: outcome.reason,
      };
    case 'unavailable':
      return {
        status: 'unavailable',
        heading: 'Visualizações personalizadas indisponíveis',
      };
    case 'invalid':
      return {
        status: 'invalid',
        heading: 'Não foi possível carregar suas visualizações',
        reason: outcome.reason,
      };
    case 'saveFailed':
      return {
        status: 'save-failed',
        heading: 'Não foi possível carregar suas visualizações',
      };
  }
};

const writableLoadOutcome = (outcome: LoadTableViewsOutcome): boolean =>
  outcome.status === 'loaded' || outcome.status === 'migrated' || outcome.status === 'recovered';

const failedImportStatus = (
  outcome: Exclude<ImportLegacyTablePreferencesOutcome, { readonly status: 'confirmed' }>,
): SquadTableViewLegacyStatus => ({
  status: 'failed',
  heading: 'Preferências antigas não puderam ser importadas',
  reason:
    outcome.status === 'saveFailed'
      ? 'save-failed'
      : outcome.status === 'unavailable'
        ? 'unavailable'
        : 'invalid',
  ...('reason' in outcome ? { detail: outcome.reason } : {}),
});

const saveFailure = (
  outcome: Exclude<SaveTableViewsOutcome, { readonly status: 'confirmed' }>,
): {
  readonly reason: Exclude<SquadTableViewPersistenceFailure, 'exception'>;
  readonly detail?: string;
} =>
  outcome.status === 'invalid'
    ? { reason: 'invalid', detail: outcome.reason }
    : outcome.status === 'unavailable'
      ? { reason: 'unavailable' }
      : { reason: 'save-failed' };

const validViewName = (name: string | undefined): string | null => {
  const normalized = name?.trim() ?? '';
  return normalized.length > 0 && normalized.length <= 80 ? normalized : null;
};

export function useSquadTableView(
  options: UseSquadTableViewOptions = {},
): SquadTableViewController {
  const dependenciesRef = useRef(options.dependencies ?? defaultDependencies);
  const mountedRef = useRef(false);
  const loadStartedRef = useRef(false);
  const loadRequestRef = useRef(0);
  const legacyImportKeysRef = useRef(new Set<string>());
  const mutationRequestRef = useRef(0);
  const inFlightMutationRef = useRef<{
    readonly id: number;
    readonly intent: SquadTableViewMutationIntent;
  } | null>(null);
  const failedCandidateRef = useRef<{
    readonly intent: SquadTableViewMutationIntent;
    readonly state: TableViewRepositoryState;
    readonly preview: TableViewState | null;
  } | null>(null);
  const writableRef = useRef(false);

  const initialRepository = useMemo(initialRepositoryState, []);
  const initialView = useMemo(() => activeSavedView(initialRepository).state, [initialRepository]);
  const [repository, setRepository] = useState<TableViewRepositoryState>(initialRepository);
  const repositoryRef = useRef(repository);
  const [proposal, setProposalState] = useState<TableViewState>(initialView);
  const proposalRef = useRef(proposal);
  const proposalVersionRef = useRef(0);
  const [baseline, setBaselineState] = useState<TableViewState>(initialView);
  const baselineRef = useRef(baseline);
  const [repositoryStatus, setRepositoryStatus] = useState<SquadTableViewRepositoryStatus>({
    status: 'loading',
    heading: 'Carregando visualizações do elenco…',
  });
  const [legacyStatus, setLegacyStatus] = useState<SquadTableViewLegacyStatus>({
    status: 'pending',
  });
  const [persistenceStatus, setPersistenceStatus] = useState<SquadTableViewPersistenceStatus>({
    status: 'idle',
  });
  const [commandStatus, setCommandStatus] = useState<SquadTableViewCommandStatus>({
    status: 'idle',
  });
  const [transitionStatus, setTransitionStatus] = useState<SquadTableViewTransitionStatus>({
    status: 'idle',
  });
  const [transient, setTransient] = useState<SquadTableViewTransientState>({
    customizerOpen: false,
    focus: null,
    announcement: null,
  });

  const updateRepository = useCallback((next: TableViewRepositoryState) => {
    repositoryRef.current = next;
    setRepository(next);
  }, []);

  const updateProposal = useCallback((next: TableViewState) => {
    proposalRef.current = next;
    proposalVersionRef.current += 1;
    setProposalState(next);
  }, []);

  const updateBaseline = useCallback((next: TableViewState) => {
    baselineRef.current = next;
    setBaselineState(next);
  }, []);

  const applyRepositoryState = useCallback(
    (next: TableViewRepositoryState, options: { readonly preserveProposal?: boolean } = {}) => {
      updateRepository(next);
      const active = normalizeTableViewState(SQUAD_TABLE_SCHEMA, activeSavedView(next).state);
      updateBaseline(active);
      if (!options.preserveProposal) updateProposal(active);
    },
    [updateBaseline, updateProposal, updateRepository],
  );

  const inspectLegacyPreferences = useCallback(
    async (
      loadedRepository: TableViewRepositoryState,
      loadRequestId: number,
      allowImport: boolean,
    ) => {
      let preferences: LegacySquadTablePreferences;
      try {
        preferences = dependenciesRef.current.legacy.read();
      } catch {
        if (!mountedRef.current || loadRequestId !== loadRequestRef.current) return;
        setLegacyStatus({
          status: 'invalid',
          heading: 'Preferências antigas não puderam ser importadas',
          reason: 'storage-unavailable',
        });
        return;
      }
      if (!mountedRef.current || loadRequestId !== loadRequestRef.current) return;

      if (preferences.status === 'none') {
        setLegacyStatus({ status: 'none' });
        return;
      }
      if (preferences.status === 'invalid') {
        setLegacyStatus({
          status: 'invalid',
          heading: 'Preferências antigas não puderam ser importadas',
          reason: preferences.reason,
        });
        return;
      }

      const existingReceipt = matchingLegacyReceipt(loadedRepository, preferences);
      if (existingReceipt !== null) {
        const retired = dependenciesRef.current.legacy.retire(preferences, existingReceipt);
        if (!mountedRef.current || loadRequestId !== loadRequestRef.current) return;
        setLegacyStatus({
          status: 'already-imported',
          heading: 'Preferências antigas importadas',
          receipt: existingReceipt,
          retired,
        });
        return;
      }

      if (!allowImport) {
        setLegacyStatus({
          status: 'deferred',
          heading: 'Visualizações personalizadas indisponíveis',
        });
        return;
      }

      const importKey = `${preferences.request.sourceVersion}:${preferences.request.sourceFingerprint}`;
      if (legacyImportKeysRef.current.has(importKey)) return;
      legacyImportKeysRef.current.add(importKey);
      setLegacyStatus({ status: 'importing' });
      const proposalVersion = proposalVersionRef.current;

      try {
        const outcome = await dependenciesRef.current.importLegacy(preferences.request);
        if (!mountedRef.current || loadRequestId !== loadRequestRef.current) return;
        if (outcome.status !== 'confirmed') {
          legacyImportKeysRef.current.delete(importKey);
          setLegacyStatus(failedImportStatus(outcome));
          return;
        }
        if (!importReceiptMatches(outcome, preferences)) {
          legacyImportKeysRef.current.delete(importKey);
          setLegacyStatus({
            status: 'failed',
            heading: 'Preferências antigas não puderam ser importadas',
            reason: 'invalid',
            detail: 'table_view.legacy_receipt_mismatch',
          });
          return;
        }

        writableRef.current = true;
        applyRepositoryState(outcome.state, {
          preserveProposal: proposalVersionRef.current !== proposalVersion,
        });
        const retired = dependenciesRef.current.legacy.retire(preferences, outcome.receipt);
        if (!mountedRef.current || loadRequestId !== loadRequestRef.current) return;
        setLegacyStatus({
          status: 'imported',
          heading: 'Preferências antigas importadas',
          receipt: outcome.receipt,
          retired,
        });
      } catch (reason) {
        legacyImportKeysRef.current.delete(importKey);
        if (!mountedRef.current || loadRequestId !== loadRequestRef.current) return;
        setLegacyStatus({
          status: 'failed',
          heading: 'Preferências antigas não puderam ser importadas',
          reason: 'exception',
          detail: reason instanceof Error ? reason.message : String(reason),
        });
      }
    },
    [applyRepositoryState],
  );

  const reload = useCallback(async () => {
    const requestId = ++loadRequestRef.current;
    setRepositoryStatus({
      status: 'loading',
      heading: 'Carregando visualizações do elenco…',
    });
    setLegacyStatus({ status: 'pending' });

    try {
      const outcome = await dependenciesRef.current.load();
      if (!mountedRef.current || requestId !== loadRequestRef.current) return;
      const nextRepository = repositoryStateFromOutcome(outcome);
      writableRef.current = writableLoadOutcome(outcome);
      applyRepositoryState(nextRepository, {
        preserveProposal: isTableViewDirty(
          SQUAD_TABLE_SCHEMA,
          proposalRef.current,
          baselineRef.current,
        ),
      });
      setRepositoryStatus(repositoryStatusFromOutcome(outcome));
      await inspectLegacyPreferences(nextRepository, requestId, writableLoadOutcome(outcome));
    } catch {
      if (!mountedRef.current || requestId !== loadRequestRef.current) return;
      const fallback = initialRepositoryState();
      writableRef.current = false;
      applyRepositoryState(fallback, {
        preserveProposal: isTableViewDirty(
          SQUAD_TABLE_SCHEMA,
          proposalRef.current,
          baselineRef.current,
        ),
      });
      setRepositoryStatus({
        status: 'unavailable',
        heading: 'Visualizações personalizadas indisponíveis',
      });
      await inspectLegacyPreferences(fallback, requestId, false);
    }
  }, [applyRepositoryState, inspectLegacyPreferences]);

  useEffect(() => {
    mountedRef.current = true;
    if (!loadStartedRef.current) {
      loadStartedRef.current = true;
      void reload();
    }
    return () => {
      mountedRef.current = false;
    };
  }, [reload]);

  const dispatch = useCallback(
    (command: TableViewCommand): TableViewCommandResult => {
      const result = applyTableViewCommand(SQUAD_TABLE_SCHEMA, proposalRef.current, command);
      if (result.accepted) {
        updateProposal(result.state);
        setCommandStatus({ status: 'accepted', event: result.event });
        setTransient((current) => ({
          ...current,
          focus: result.event.focus,
          announcement: result.event.announcement,
        }));
      } else {
        setCommandStatus({
          status: 'rejected',
          heading: 'Este ajuste não pode ser aplicado',
          reason: result.event.reason,
          event: result.event,
        });
        setTransient((current) => ({
          ...current,
          focus: result.event.focus,
          announcement: result.event.announcement,
        }));
      }
      return result;
    },
    [updateProposal],
  );

  const persistCandidate = useCallback(
    async (
      intent: SquadTableViewMutationIntent,
      candidate: TableViewRepositoryState,
      preview: TableViewState | null,
    ): Promise<SquadTableViewActionResult> => {
      if (!writableRef.current) {
        return { status: 'blocked', reason: 'repository-unavailable' };
      }
      if (inFlightMutationRef.current !== null) {
        return { status: 'blocked', reason: 'busy' };
      }
      if (preview !== null) updateProposal(preview);

      const requestId = ++mutationRequestRef.current;
      inFlightMutationRef.current = { id: requestId, intent };
      failedCandidateRef.current = null;
      const submittedProposalVersion = proposalVersionRef.current;
      setPersistenceStatus({
        status: 'saving',
        intent,
        heading: 'Salvando visualização…',
      });

      try {
        const outcome = await dependenciesRef.current.save({ state: candidate });
        if (
          !mountedRef.current ||
          inFlightMutationRef.current?.id !== requestId ||
          inFlightMutationRef.current.intent !== intent
        ) {
          return { status: 'ignored' };
        }
        if (outcome.status !== 'confirmed') {
          const failure = saveFailure(outcome);
          failedCandidateRef.current = { intent, state: candidate, preview };
          setPersistenceStatus({
            status: 'failed',
            intent,
            reason: failure.reason,
            heading: 'Não foi possível salvar a visualização',
            ...(failure.detail === undefined ? {} : { detail: failure.detail }),
          });
          return { status: 'failed', reason: failure.reason };
        }

        applyRepositoryState(outcome.state, {
          preserveProposal: proposalVersionRef.current !== submittedProposalVersion,
        });
        setPersistenceStatus({
          status: 'confirmed',
          intent,
          acceptedRevision: outcome.receipt.acceptedRevision,
        });
        return {
          status: 'confirmed',
          intent,
          acceptedRevision: outcome.receipt.acceptedRevision,
        };
      } catch (reason) {
        if (
          !mountedRef.current ||
          inFlightMutationRef.current?.id !== requestId ||
          inFlightMutationRef.current.intent !== intent
        ) {
          return { status: 'ignored' };
        }
        failedCandidateRef.current = { intent, state: candidate, preview };
        setPersistenceStatus({
          status: 'failed',
          intent,
          reason: 'exception',
          heading: 'Não foi possível salvar a visualização',
          detail: reason instanceof Error ? reason.message : String(reason),
        });
        return { status: 'failed', reason: 'exception' };
      } finally {
        if (inFlightMutationRef.current?.id === requestId) {
          inFlightMutationRef.current = null;
        }
      }
    },
    [applyRepositoryState, updateProposal],
  );

  const save = useCallback(
    async (name?: string): Promise<SquadTableViewActionResult> => {
      const currentRepository = repositoryRef.current;
      const active = activeSavedView(currentRepository);
      const normalizedProposal = normalizeTableViewState(SQUAD_TABLE_SCHEMA, proposalRef.current);

      if (active.mutability === 'mutable') {
        const state: TableViewState = {
          ...normalizedProposal,
          viewId: active.state.viewId,
          baselineViewId: active.state.baselineViewId,
          provenance: 'user-owned',
          label: active.state.label,
        };
        const candidate: TableViewRepositoryState = {
          ...currentRepository,
          views: currentRepository.views.map((view) =>
            view.state.viewId === active.state.viewId ? { mutability: 'mutable', state } : view,
          ),
        };
        return persistCandidate('save', candidate, state);
      }

      const label = validViewName(name);
      if (label === null) return { status: 'blocked', reason: 'name-required' };
      const viewId = dependenciesRef.current.createViewId();
      const state = normalizeTableViewState(SQUAD_TABLE_SCHEMA, {
        ...normalizedProposal,
        viewId,
        baselineViewId: active.state.viewId,
        provenance: 'user-owned',
        label,
      });
      const candidate: TableViewRepositoryState = {
        ...currentRepository,
        activeViewId: viewId,
        views: [...currentRepository.views, { mutability: 'mutable', state }],
      };
      return persistCandidate('save', candidate, state);
    },
    [persistCandidate],
  );

  const retry = useCallback(async (): Promise<SquadTableViewActionResult> => {
    const failed = failedCandidateRef.current;
    if (failed === null) return { status: 'blocked', reason: 'not-found' };
    return persistCandidate(failed.intent, failed.state, failed.preview);
  }, [persistCandidate]);

  const discard = useCallback((): SquadTableViewActionResult => {
    updateProposal(baselineRef.current);
    setTransitionStatus({
      status: 'proceeding',
      target: 'screen',
      decision: 'discard',
    });
    return { status: 'discarded' };
  }, [updateProposal]);

  const reset = useCallback((): TableViewCommandResult => {
    const resetBaseline =
      repositoryRef.current.views.find(
        ({ state }) => state.viewId === proposalRef.current.baselineViewId,
      )?.state ?? baselineRef.current;
    return dispatch({ type: 'view.reset', baseline: resetBaseline });
  }, [dispatch]);

  const guardTransition = useCallback(
    async (
      decision?: SquadTableViewTransitionDecision,
      saveAsName?: string,
    ): Promise<SquadTableViewActionResult> => {
      const dirty = isTableViewDirty(SQUAD_TABLE_SCHEMA, proposalRef.current, baselineRef.current);
      if (!dirty) {
        setTransitionStatus({
          status: 'proceeding',
          target: 'screen',
          decision: 'clean',
        });
        return { status: 'clean' };
      }
      if (decision === undefined) {
        setTransitionStatus({
          status: 'blocked',
          target: 'screen',
          heading: 'Alterações não salvas',
        });
        return { status: 'blocked', reason: 'dirty' };
      }
      if (decision === 'cancel') {
        setTransitionStatus({ status: 'cancelled', target: 'screen' });
        return { status: 'cancelled' };
      }
      if (decision === 'discard') return discard();

      const result = await save(saveAsName);
      if (result.status === 'confirmed') {
        setTransitionStatus({
          status: 'proceeding',
          target: 'screen',
          decision: 'save',
        });
      }
      return result;
    },
    [discard, save],
  );

  const activate = useCallback(
    async (
      viewId: string,
      decision?: SquadTableViewTransitionDecision,
      saveAsName?: string,
    ): Promise<SquadTableViewActionResult> => {
      const targetBeforeGuard = repositoryRef.current.views.find(
        ({ state }) => state.viewId === viewId,
      );
      if (targetBeforeGuard === undefined) {
        return { status: 'blocked', reason: 'not-found' };
      }
      if (isTableViewDirty(SQUAD_TABLE_SCHEMA, proposalRef.current, baselineRef.current)) {
        if (decision === undefined) {
          setTransitionStatus({
            status: 'blocked',
            target: viewId,
            heading: 'Alterações não salvas',
          });
          return { status: 'blocked', reason: 'dirty' };
        }
        if (decision === 'cancel') {
          setTransitionStatus({ status: 'cancelled', target: viewId });
          return { status: 'cancelled' };
        }
        if (decision === 'discard') {
          updateProposal(baselineRef.current);
        } else {
          const saved = await save(saveAsName);
          if (saved.status !== 'confirmed') return saved;
        }
      }

      const currentRepository = repositoryRef.current;
      const target = currentRepository.views.find(({ state }) => state.viewId === viewId);
      if (target === undefined) return { status: 'blocked', reason: 'not-found' };
      const candidate = { ...currentRepository, activeViewId: viewId };
      const result = await persistCandidate(
        'activate',
        candidate,
        normalizeTableViewState(SQUAD_TABLE_SCHEMA, target.state),
      );
      if (result.status === 'confirmed') {
        setTransitionStatus({
          status: 'proceeding',
          target: viewId,
          decision: decision === 'discard' ? 'discard' : 'clean',
        });
      }
      return result;
    },
    [persistCandidate, save, updateProposal],
  );

  const create = useCallback(
    async (name: string): Promise<SquadTableViewActionResult> => {
      if (isTableViewDirty(SQUAD_TABLE_SCHEMA, proposalRef.current, baselineRef.current)) {
        return { status: 'blocked', reason: 'dirty' };
      }
      const label = validViewName(name);
      if (label === null) return { status: 'blocked', reason: 'invalid-name' };
      const currentRepository = repositoryRef.current;
      const system = currentRepository.views.find(
        ({ state }) => state.provenance === 'system-default',
      );
      if (system === undefined) return { status: 'blocked', reason: 'not-found' };
      const viewId = dependenciesRef.current.createViewId();
      const state = normalizeTableViewState(SQUAD_TABLE_SCHEMA, {
        ...system.state,
        viewId,
        baselineViewId: system.state.viewId,
        provenance: 'user-owned',
        label,
      });
      const candidate: TableViewRepositoryState = {
        ...currentRepository,
        activeViewId: viewId,
        views: [...currentRepository.views, { mutability: 'mutable', state }],
      };
      return persistCandidate('create', candidate, state);
    },
    [persistCandidate],
  );

  const duplicate = useCallback(
    async (viewId: string, name?: string): Promise<SquadTableViewActionResult> => {
      if (isTableViewDirty(SQUAD_TABLE_SCHEMA, proposalRef.current, baselineRef.current)) {
        return { status: 'blocked', reason: 'dirty' };
      }
      const currentRepository = repositoryRef.current;
      const source = currentRepository.views.find(({ state }) => state.viewId === viewId);
      if (source === undefined) return { status: 'blocked', reason: 'not-found' };
      const label = validViewName(name ?? `${source.state.label} — cópia`);
      if (label === null) return { status: 'blocked', reason: 'invalid-name' };
      const duplicateId = dependenciesRef.current.createViewId();
      const state = normalizeTableViewState(SQUAD_TABLE_SCHEMA, {
        ...source.state,
        viewId: duplicateId,
        baselineViewId: source.state.viewId,
        provenance: 'user-owned',
        label,
      });
      const candidate: TableViewRepositoryState = {
        ...currentRepository,
        activeViewId: duplicateId,
        views: [...currentRepository.views, { mutability: 'mutable', state }],
      };
      return persistCandidate('duplicate', candidate, state);
    },
    [persistCandidate],
  );

  const rename = useCallback(
    async (viewId: string, name: string): Promise<SquadTableViewActionResult> => {
      if (isTableViewDirty(SQUAD_TABLE_SCHEMA, proposalRef.current, baselineRef.current)) {
        return { status: 'blocked', reason: 'dirty' };
      }
      const label = validViewName(name);
      if (label === null) return { status: 'blocked', reason: 'invalid-name' };
      const currentRepository = repositoryRef.current;
      const target = currentRepository.views.find(({ state }) => state.viewId === viewId);
      if (target === undefined) return { status: 'blocked', reason: 'not-found' };
      if (target.mutability !== 'mutable') {
        return { status: 'blocked', reason: 'read-only' };
      }
      const renamed = normalizeTableViewState(SQUAD_TABLE_SCHEMA, {
        ...target.state,
        label,
      });
      const candidate: TableViewRepositoryState = {
        ...currentRepository,
        views: currentRepository.views.map((view) =>
          view.state.viewId === viewId ? { ...view, state: renamed } : view,
        ),
      };
      return persistCandidate(
        'rename',
        candidate,
        currentRepository.activeViewId === viewId ? renamed : proposalRef.current,
      );
    },
    [persistCandidate],
  );

  const setDefault = useCallback(
    async (viewId: string): Promise<SquadTableViewActionResult> => {
      const currentRepository = repositoryRef.current;
      if (!currentRepository.views.some(({ state }) => state.viewId === viewId)) {
        return { status: 'blocked', reason: 'not-found' };
      }
      return persistCandidate('set-default', { ...currentRepository, defaultViewId: viewId }, null);
    },
    [persistCandidate],
  );

  const deleteView = useCallback(
    async (viewId: string): Promise<SquadTableViewActionResult> => {
      if (isTableViewDirty(SQUAD_TABLE_SCHEMA, proposalRef.current, baselineRef.current)) {
        return { status: 'blocked', reason: 'dirty' };
      }
      const currentRepository = repositoryRef.current;
      const target = currentRepository.views.find(({ state }) => state.viewId === viewId);
      if (target === undefined) return { status: 'blocked', reason: 'not-found' };
      if (target.mutability !== 'mutable') {
        return { status: 'blocked', reason: 'read-only' };
      }
      const system = currentRepository.views.find(
        ({ state }) => state.provenance === 'system-default',
      );
      if (system === undefined) return { status: 'blocked', reason: 'not-found' };

      const remainingViews = currentRepository.views
        .filter(({ state }) => state.viewId !== viewId)
        .map((view): SavedTableView =>
          view.state.baselineViewId === viewId
            ? {
                ...view,
                state: normalizeTableViewState(SQUAD_TABLE_SCHEMA, {
                  ...view.state,
                  baselineViewId: system.state.viewId,
                }),
              }
            : view,
        );
      const activeViewId =
        currentRepository.activeViewId === viewId
          ? currentRepository.defaultViewId !== viewId &&
            remainingViews.some(({ state }) => state.viewId === currentRepository.defaultViewId)
            ? currentRepository.defaultViewId
            : system.state.viewId
          : currentRepository.activeViewId;
      const defaultViewId =
        currentRepository.defaultViewId === viewId
          ? system.state.viewId
          : currentRepository.defaultViewId;
      const candidate: TableViewRepositoryState = {
        ...currentRepository,
        activeViewId,
        defaultViewId,
        views: remainingViews,
        legacyImportReceipts: currentRepository.legacyImportReceipts.filter(
          ({ importedViewId }) => importedViewId !== viewId,
        ),
      };
      const preview = activeSavedView(candidate).state;
      return persistCandidate('delete', candidate, preview);
    },
    [persistCandidate],
  );

  const setCustomizerOpen = useCallback((open: boolean) => {
    setTransient((current) => ({ ...current, customizerOpen: open }));
  }, []);

  const clearAnnouncement = useCallback(() => {
    setTransient((current) => ({ ...current, announcement: null }));
  }, []);

  const dirty = isTableViewDirty(SQUAD_TABLE_SCHEMA, proposal, baseline);
  const active = activeSavedView(repository);
  const saving = persistenceStatus.status === 'saving';
  const capabilities: SquadTableViewCapabilities = {
    canPersist: writableRef.current && !saving,
    canCreate: writableRef.current && !saving && !dirty,
    canDuplicate: writableRef.current && !saving && !dirty,
    canRename: writableRef.current && !saving && !dirty && active.mutability === 'mutable',
    canDelete: writableRef.current && !saving && !dirty && active.mutability === 'mutable',
    canSetDefault: writableRef.current && !saving,
    canReset: !saving && dirty,
  };

  return {
    repositoryStatus,
    legacyStatus,
    persistenceStatus,
    commandStatus,
    transitionStatus,
    repository,
    views: repository.views,
    activeViewId: repository.activeViewId,
    defaultViewId: repository.defaultViewId,
    proposal,
    baseline,
    dirty,
    dirtyText: dirty ? 'Alterações não salvas' : null,
    transient,
    capabilities,
    dispatch,
    reload,
    save,
    retry,
    discard,
    reset,
    guardTransition,
    activate,
    create,
    duplicate,
    rename,
    delete: deleteView,
    setDefault,
    setCustomizerOpen,
    clearAnnouncement,
  };
}
