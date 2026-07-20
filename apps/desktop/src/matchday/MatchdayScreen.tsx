import { Icon, type GenericIconName } from '@rivallo/icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import { TableViewStatus } from '../ui/DataTable/index.js';
import { ProfileScreen } from '../profiles/ProfileScreen.js';
import type { GlobalProfileSearchResult, ProfileRoute } from '../profiles/types.js';
import { Button } from '../ui/primitives/actions.js';
import { Tooltip } from '../ui/primitives/disclosure.js';
import { Skeleton, Status } from '../ui/primitives/feedback.js';
import { Toast } from '../ui/primitives/toast.js';
import {
  loadMatchday,
  playNextMatch,
  saveTacticalPlan,
  searchProfiles,
  updateTacticalLibrary,
} from './client.js';
import {
  defaultSquadSort,
  type ActiveScreen,
  type Density,
  type PitchMode,
  type RoleFilter,
  type SquadFilter,
  type StatusFilter,
  type TacticalTool,
  type UiPreferences,
} from './matchday-ui.js';
import { RivalloBrand } from './RivalloBrand.js';
import type { SortKey, SquadSortState } from './squad-sort.js';
import {
  applySquadTableView,
  createSquadDurableFilter,
  mergeSquadDurableFilter,
  readSquadDurableFilter,
  SQUAD_TABLE_SCHEMA,
} from './squad-table-schema.js';
import {
  SavedViewDeleteDialog,
  SavedViewDirtyDialog,
  SavedViewNameDialog,
  SavedViewSelector,
  type SavedViewNameDialogMode,
} from './SavedViewSelector.js';
import { SquadWorkspace } from './SquadWorkspace.js';
import {
  addPlayerToFirstOpenSlot,
  createLineupSlots,
  forkTacticalVariation,
  hasSameSelectedPlayers,
  normalizeStoredSlots,
  removePlayerFromSlots,
  selectedIdsFromSlots,
  syncPlanWithLineupSlots,
  toTacticalPlanProposal,
  validateTacticalDraft,
  variationFromPreset,
  type LineupSlots,
} from './tactics-model.js';
import { TacticsWorkspace } from './TacticsWorkspace.js';
import type {
  MatchResult,
  MatchdayState,
  Player,
  TacticalApproach,
  TacticalPlanSnapshot,
} from './types.js';
import { useSquadTableView, type SquadTableViewCommandStatus } from './use-squad-table-view.js';
import { WindowControls } from './WindowControls.js';

import './matchday.css';

interface MatchdayScreenProps {
  readonly serviceOwnership: 'owned' | 'reused';
}

interface NavigationItem {
  readonly id: string;
  readonly label: string;
  readonly icon: GenericIconName;
  readonly badge?: string;
  readonly available?: boolean;
}

type SavedViewTransitionTarget =
  | {
      readonly kind: 'view';
      readonly viewId: string;
      readonly name: string;
    }
  | {
      readonly kind: 'screen';
      readonly screen: 'tactics';
      readonly name: 'Táticas';
    }
  | {
      readonly kind: 'delete';
      readonly viewId: string;
      readonly viewName: string;
      readonly fallbackViewId: string;
      readonly name: string;
    };

interface SavedViewNameDialogState {
  readonly mode: SavedViewNameDialogMode;
  readonly viewId: string;
  readonly previousName: string;
  readonly initialValue: string;
  readonly continuation?: SavedViewTransitionTarget;
}

interface SavedViewDeleteDialogState {
  readonly viewId: string;
  readonly viewName: string;
  readonly fallbackViewId: string;
  readonly fallbackName: string;
}

interface SavedViewRetryContext {
  readonly successMessage: string;
  readonly afterSave?: SavedViewTransitionTarget;
  readonly continuationId?: number;
}

type RejectedSquadTableViewCommand = Extract<
  SquadTableViewCommandStatus,
  { readonly status: 'rejected' }
>;

export function describeTableViewRejection(
  reason: RejectedSquadTableViewCommand['reason'],
  focus: RejectedSquadTableViewCommand['event']['focus'],
): string {
  const column =
    focus?.kind === 'column'
      ? SQUAD_TABLE_SCHEMA.columns.find(({ columnId }) => columnId === focus.columnId)
      : undefined;
  const subject =
    focus?.kind === 'column'
      ? (column?.label ?? 'Coluna da tabela')
      : focus?.kind === 'view'
        ? 'Visualização da tabela'
        : 'Tabela do elenco';

  let constraint: string;
  switch (reason.code) {
    case 'unknown-column-id':
      constraint = 'a coluna solicitada não está disponível nesta visualização';
      break;
    case 'missing-column-id':
    case 'invalid-required-column':
      constraint = 'uma coluna obrigatória está ausente';
      break;
    case 'required-column-hidden':
      constraint = 'esta coluna é obrigatória e não pode ser ocultada';
      break;
    case 'invalid-column-width':
    case 'column-width-out-of-bounds':
      constraint =
        column === undefined
          ? 'a largura precisa respeitar os limites permitidos'
          : `a largura deve ficar entre ${column.width.min} e ${column.width.max} pixels`;
      break;
    case 'column-visibility-unsupported':
      constraint = 'a visibilidade desta coluna não pode ser alterada';
      break;
    case 'column-resize-unsupported':
      constraint = 'esta coluna não permite ajuste de largura';
      break;
    case 'invalid-pin-order':
    case 'pinned-column-limit-exceeded':
    case 'pinned-width-limit-exceeded':
      constraint = 'a posição fixada ultrapassa os limites da tabela';
      break;
    case 'invalid-density':
    case 'unsupported-density':
      constraint = 'a densidade escolhida não está disponível';
      break;
    case 'sort-limit-exceeded':
    case 'duplicate-sort-column':
    case 'sort-unsupported':
    case 'invalid-sort-clause':
      constraint = 'a ordenação escolhida não é permitida para esta tabela';
      break;
    case 'invalid-filter-group':
    case 'duplicate-filter-id':
    case 'duplicate-filter-group-id':
    case 'filter-depth-exceeded':
    case 'filter-clause-limit-exceeded':
    case 'unsupported-filter-operator':
    case 'incompatible-filter-value':
      constraint = 'o filtro escolhido não é compatível com esta tabela';
      break;
    case 'invalid-view-label':
      constraint = 'o nome da visualização precisa ter entre 1 e 80 caracteres';
      break;
    case 'invalid-data-window':
    case 'invalid-data-window-schema':
      constraint = 'a página solicitada está fora dos limites disponíveis';
      break;
    case 'table-id-mismatch':
    case 'schema-version-mismatch':
    case 'owner-scope-mismatch':
    case 'invalid-schema-version':
      constraint = 'a configuração pertence a uma versão incompatível desta tabela';
      break;
    default:
      constraint = 'o ajuste não respeita os limites desta visualização';
  }

  return `${subject}: ${constraint}. A configuração anterior foi mantida.`;
}

const UI_PREFERENCES_KEY = 'rivallo.squad-ui.v4';
const LEGACY_UI_PREFERENCES_KEYS = ['rivallo.squad-ui.v3', 'rivallo.squad-ui.v2'] as const;
const TACTICS_LAYOUT_KEY = 'rivallo.tactics-layout.v1';

export const parseProfileRoute = (pathname: string): ProfileRoute | null => {
  const match = /^\/(players|coaches)\/([^/]+)\/?$/u.exec(pathname);
  if (!match?.[1] || !match[2]) return null;
  return {
    kind: match[1] === 'players' ? 'player' : 'coach',
    entityId: decodeURIComponent(match[2]),
  };
};

const profilePath = (route: ProfileRoute) =>
  `/${route.kind === 'player' ? 'players' : 'coaches'}/${encodeURIComponent(route.entityId)}`;

const defaultPreferences = (): UiPreferences => ({
  sidebarCollapsed: typeof window !== 'undefined' && window.innerWidth < 1240,
  activeScreen: 'squad',
  showPlayerDetails: true,
  pitchMode: 'roles',
});

const readPreferences = (): UiPreferences => {
  const defaults = defaultPreferences();
  try {
    const currentRaw = window.localStorage.getItem(UI_PREFERENCES_KEY);
    const raw =
      currentRaw ??
      LEGACY_UI_PREFERENCES_KEYS.map((key) => window.localStorage.getItem(key)).find(Boolean);
    if (!raw) return defaults;
    const stored = JSON.parse(raw) as Partial<UiPreferences> & { workspaceView?: string };
    const activeScreen: ActiveScreen =
      stored.activeScreen === 'tactics' || stored.workspaceView === 'tactics' ? 'tactics' : 'squad';
    return {
      sidebarCollapsed:
        typeof stored.sidebarCollapsed === 'boolean'
          ? stored.sidebarCollapsed
          : defaults.sidebarCollapsed,
      activeScreen,
      showPlayerDetails:
        typeof stored.showPlayerDetails === 'boolean'
          ? stored.showPlayerDetails
          : defaults.showPlayerDetails,
      pitchMode: ['roles', 'condition', 'familiarity'].includes(String(stored.pitchMode))
        ? (stored.pitchMode as PitchMode)
        : defaults.pitchMode,
    };
  } catch {
    return defaults;
  }
};

const writePreferences = (preferences: UiPreferences): void => {
  try {
    const targetKey =
      [UI_PREFERENCES_KEY, ...LEGACY_UI_PREFERENCES_KEYS].find(
        (key) => window.localStorage.getItem(key) !== null,
      ) ?? UI_PREFERENCES_KEY;
    const raw = window.localStorage.getItem(targetKey);
    const parsed = raw === null ? null : (JSON.parse(raw) as unknown);
    const current =
      typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    window.localStorage.setItem(targetKey, JSON.stringify({ ...current, ...preferences }));
  } catch {
    // Preferences remain active for this session when storage is unavailable.
  }
};

const navigationGroups: readonly (readonly NavigationItem[])[] = [
  [
    { id: 'home', label: 'Início', icon: 'home' },
    { id: 'inbox', label: 'Caixa de entrada', icon: 'inbox', badge: '3' },
  ],
  [
    { id: 'squad', label: 'Elenco', icon: 'people', available: true },
    { id: 'tactics', label: 'Táticas', icon: 'tactics', available: true },
    { id: 'dynamics', label: 'Dinâmica', icon: 'dynamics' },
    { id: 'data', label: 'Central de dados', icon: 'data-hub' },
    { id: 'scouting', label: 'Observação', icon: 'scouting' },
    { id: 'transfers', label: 'Transferências', icon: 'transfers' },
  ],
  [
    { id: 'club', label: 'Clube', icon: 'club' },
    { id: 'staff', label: 'Comissão técnica', icon: 'staff' },
    { id: 'finances', label: 'Finanças', icon: 'finances' },
  ],
  [
    { id: 'schedule', label: 'Calendário', icon: 'schedule' },
    { id: 'competitions', label: 'Competições', icon: 'competitions' },
    { id: 'reports', label: 'Relatórios', icon: 'reports' },
  ],
];

const resultLabel = (result: MatchResult) => {
  if (result.homeGoals > result.awayGoals) return 'Vitória';
  if (result.homeGoals < result.awayGoals) return 'Derrota';
  return 'Empate';
};

const readStoredLineup = (players: readonly Player[]): LineupSlots | null => {
  try {
    return normalizeStoredSlots(
      JSON.parse(window.localStorage.getItem(TACTICS_LAYOUT_KEY) ?? 'null'),
      players,
    );
  } catch {
    return null;
  }
};

export function MatchdayScreen({ serviceOwnership }: MatchdayScreenProps) {
  const [state, setState] = useState<MatchdayState | null>(null);
  const [lineupSlots, setLineupSlots] = useState<LineupSlots>(() => Array(11).fill(null));
  const [savedLineupSlots, setSavedLineupSlots] = useState<LineupSlots>(() => Array(11).fill(null));
  const [tacticalDraft, setTacticalDraft] = useState<TacticalPlanSnapshot | null>(null);
  const [savedTacticalPlan, setSavedTacticalPlan] = useState<TacticalPlanSnapshot | null>(null);
  const [tacticalHistory, setTacticalHistory] = useState<readonly TacticalPlanSnapshot[]>([]);
  const [formation, setFormation] = useState<MatchdayState['formation']>('4-3-3');
  const [approach, setApproach] = useState<TacticalApproach>('balanced');
  const [busyAction, setBusyAction] = useState<'save' | 'play' | 'library' | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [resultOpen, setResultOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [profileRoute, setProfileRoute] = useState<ProfileRoute | null>(() =>
    typeof window === 'undefined' ? null : parseProfileRoute(window.location.pathname),
  );
  const [profileSearchResults, setProfileSearchResults] = useState<
    readonly GlobalProfileSearchResult[]
  >([]);
  const [profileSearchOpen, setProfileSearchOpen] = useState(false);
  const [profileSearchBusy, setProfileSearchBusy] = useState(false);
  const [positionFilterControlVisible, setPositionFilterControlVisible] = useState(false);
  const [focusedPlayerId, setFocusedPlayerId] = useState<string | null>(null);
  const [activeTacticalTool, setActiveTacticalTool] = useState<TacticalTool>('tactics');
  const [preferences, setPreferences] = useState<UiPreferences>(readPreferences);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsDialogRef = useRef<HTMLDialogElement>(null);
  const settingsReturnFocusRef = useRef<HTMLButtonElement>(null);
  const resultDialogRef = useRef<HTMLDialogElement>(null);
  const resultReturnFocusRef = useRef<HTMLButtonElement>(null);
  const tableView = useSquadTableView();
  const [savedViewAnnouncement, setSavedViewAnnouncement] = useState('');
  const [savedViewNameDialog, setSavedViewNameDialog] = useState<SavedViewNameDialogState | null>(
    null,
  );
  const [savedViewDeleteDialog, setSavedViewDeleteDialog] =
    useState<SavedViewDeleteDialogState | null>(null);
  const [savedViewDirtyTarget, setSavedViewDirtyTarget] =
    useState<SavedViewTransitionTarget | null>(null);
  const [savedViewFailureVisible, setSavedViewFailureVisible] = useState(false);
  const savedViewFailureHeadingRef = useRef<HTMLHeadingElement>(null);
  const savedViewRetryRef = useRef<SavedViewRetryContext | null>(null);
  const savedViewContinuationRef = useRef(0);
  const tacticalSaveOperationRef = useRef(0);
  const profileSearchOperationRef = useRef(0);

  const selectedIds = useMemo(() => selectedIdsFromSlots(lineupSlots), [lineupSlots]);
  const durableFilters = useMemo(
    () => readSquadDurableFilter(tableView.proposal.filter),
    [tableView.proposal.filter],
  );
  const squadFilter = durableFilters.lineup;
  const roleFilter = durableFilters.sector;
  const statusFilter = durableFilters.status;
  const positionFilter: 'all' | Player['position'] = durableFilters.positions[0] ?? 'all';
  const positionFilterVisible = positionFilterControlVisible || durableFilters.positions.length > 0;
  const primarySort = tableView.proposal.sort[0];
  const squadSort: SquadSortState =
    primarySort === undefined
      ? defaultSquadSort
      : {
          key: primarySort.columnId as SortKey,
          direction: primarySort.direction,
        };
  const density = tableView.proposal.density as Density;

  useEffect(() => {
    const handlePopState = () => setProfileRoute(parseProfileRoute(window.location.pathname));
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 2) {
      profileSearchOperationRef.current += 1;
      setProfileSearchResults([]);
      setProfileSearchBusy(false);
      return;
    }
    const operation = ++profileSearchOperationRef.current;
    setProfileSearchBusy(true);
    const timer = window.setTimeout(() => {
      void searchProfiles(normalizedQuery)
        .then((results) => {
          if (operation === profileSearchOperationRef.current) setProfileSearchResults(results);
        })
        .catch(() => {
          if (operation === profileSearchOperationRef.current) setProfileSearchResults([]);
        })
        .finally(() => {
          if (operation === profileSearchOperationRef.current) setProfileSearchBusy(false);
        });
    }, 180);
    return () => {
      window.clearTimeout(timer);
      profileSearchOperationRef.current += 1;
    };
  }, [query]);

  useEffect(() => {
    if (
      tableView.legacyStatus.status === 'pending' ||
      tableView.legacyStatus.status === 'importing'
    ) {
      return;
    }
    writePreferences(preferences);
  }, [preferences, tableView.legacyStatus.status]);

  useEffect(() => {
    if (tableView.persistenceStatus.status === 'failed') {
      setSavedViewFailureVisible(true);
      return;
    }
    if (
      tableView.persistenceStatus.status === 'saving' ||
      tableView.persistenceStatus.status === 'confirmed'
    ) {
      setSavedViewFailureVisible(false);
    }
  }, [tableView.persistenceStatus]);

  useEffect(() => {
    if (savedViewFailureVisible) savedViewFailureHeadingRef.current?.focus();
  }, [savedViewFailureVisible]);

  const applyServerState = (nextState: MatchdayState, preferredSlots?: LineupSlots) => {
    const serverSlots = createLineupSlots(nextState.players);
    const serverIds = selectedIdsFromSlots(serverSlots);
    if (serverIds.length < 11) {
      setState(nextState);
      setLineupSlots(serverSlots);
      setSavedLineupSlots(serverSlots);
      setTacticalDraft(null);
      setSavedTacticalPlan(null);
      setTacticalHistory([]);
      setFormation(nextState.formation);
      setApproach(nextState.approach);
      setFocusedPlayerId(null);
      return;
    }
    const normalizedPreferred = preferredSlots
      ? normalizeStoredSlots(preferredSlots, nextState.players)
      : null;
    const stored = readStoredLineup(nextState.players);
    const legacyLayout =
      normalizedPreferred && hasSameSelectedPlayers(normalizedPreferred, serverIds)
        ? normalizedPreferred
        : stored && hasSameSelectedPlayers(stored, serverIds)
          ? stored
          : serverSlots;
    const library = nextState.tacticalLibrary;
    if (!library) {
      setState(nextState);
      setLineupSlots(legacyLayout);
      setSavedLineupSlots(legacyLayout);
      setTacticalDraft(null);
      setSavedTacticalPlan(null);
      setTacticalHistory([]);
      setFormation(nextState.formation);
      setApproach(nextState.approach);
      setFocusedPlayerId(null);
      setError('A carreira não possui uma biblioteca tática autoritativa. Recarregue para migrar.');
      return;
    }
    const plan =
      library.variations.find(({ variationId }) => variationId === library.activeVariationId) ??
      library.variations[0];
    if (!plan) {
      setError('A biblioteca tática não possui variações válidas.');
      return;
    }
    const layout = plan.placements.map(({ playerId }) => playerId);

    setState({ ...nextState, tacticalLibrary: library });
    setLineupSlots(layout);
    setSavedLineupSlots(layout);
    setTacticalDraft(plan);
    setSavedTacticalPlan(plan);
    setTacticalHistory([]);
    setFormation(plan.formation);
    setApproach(nextState.approach);
    setFocusedPlayerId(
      (current) =>
        current ?? nextState.players.find((player) => serverIds.includes(player.id))?.id ?? null,
    );
  };

  useEffect(() => {
    let active = true;
    void loadMatchday()
      .then((nextState) => {
        if (active) applyServerState(nextState);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : String(reason));
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const dialog = resultDialogRef.current;
    if (!resultOpen || !dialog || dialog.open) return;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }, [resultOpen]);

  useEffect(() => {
    const dialog = settingsDialogRef.current;
    if (!settingsOpen || !dialog || dialog.open) return;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }, [settingsOpen]);

  const updatePreference = <Key extends keyof UiPreferences>(key: Key, value: UiPreferences[Key]) =>
    setPreferences((current) => ({ ...current, [key]: value }));

  const activeSavedView =
    tableView.views.find(({ state: viewState }) => viewState.viewId === tableView.activeViewId) ??
    tableView.views[0]!;

  const focusSavedViewSelector = () => {
    const focus = () => {
      document.querySelector<HTMLButtonElement>('.saved-view-selector__trigger')?.focus();
    };
    queueMicrotask(focus);
    window.requestAnimationFrame(focus);
  };

  const focusNavigationItem = (screen: ActiveScreen) => {
    const focus = () => {
      document.querySelector<HTMLButtonElement>(`[data-navigation-id="${screen}"]`)?.focus();
    };
    queueMicrotask(focus);
    window.requestAnimationFrame(focus);
  };

  const focusTableConfiguration = () => {
    const focus = () => {
      document.querySelector<HTMLButtonElement>('[aria-label="Configurar tabela"]')?.focus();
    };
    queueMicrotask(focus);
    window.requestAnimationFrame(focus);
  };

  const beginSavedViewContinuation = () => {
    savedViewContinuationRef.current += 1;
    return savedViewContinuationRef.current;
  };

  const isCurrentSavedViewContinuation = (continuationId: number) =>
    savedViewContinuationRef.current === continuationId;

  const cancelSavedViewContinuation = () => {
    savedViewContinuationRef.current += 1;
    savedViewRetryRef.current = null;
  };

  const finishSavedViewAction = (announcement: string) => {
    savedViewRetryRef.current = null;
    setSavedViewFailureVisible(false);
    setSavedViewAnnouncement(announcement);
    focusSavedViewSelector();
  };

  const finishScreenTransition = (screen: ActiveScreen, announcement: string) => {
    savedViewRetryRef.current = null;
    setSavedViewFailureVisible(false);
    setSavedViewAnnouncement(announcement);
    updatePreference('activeScreen', screen);
    focusNavigationItem(screen);
  };

  const performViewActivation = async (
    viewId: string,
    name: string,
    decision?: 'save' | 'discard',
  ) => {
    const successMessage = `Visualização “${name}” aberta.`;
    savedViewRetryRef.current = { successMessage };
    const result = await tableView.activate(viewId, decision);
    if (result.status === 'confirmed') finishSavedViewAction(successMessage);
    return result;
  };

  const performViewDeletion = async (
    target: Extract<SavedViewTransitionTarget, { kind: 'delete' }>,
  ) => {
    const successMessage = `Visualização “${target.viewName}” excluída. “${target.name}” foi aberta.`;
    savedViewRetryRef.current = { successMessage };
    const result = await tableView.delete(target.viewId);
    if (result.status === 'confirmed') finishSavedViewAction(successMessage);
    return result;
  };

  const continueAfterSavedView = async (
    target: SavedViewTransitionTarget,
    continuationId: number,
  ) => {
    if (!isCurrentSavedViewContinuation(continuationId)) return;
    if (target.kind === 'view') {
      await performViewActivation(target.viewId, target.name);
      return;
    }
    if (target.kind === 'screen') {
      finishScreenTransition(target.screen, `Alterações salvas. ${target.name} aberta.`);
      return;
    }
    await performViewDeletion(target);
  };

  const retrySavedViewMutation = async () => {
    const context = savedViewRetryRef.current;
    const result = await tableView.retry();
    if (result.status !== 'confirmed') return;

    if (
      context?.afterSave !== undefined &&
      context.continuationId !== undefined &&
      result.intent === 'save'
    ) {
      if (!isCurrentSavedViewContinuation(context.continuationId)) return;
      await continueAfterSavedView(context.afterSave, context.continuationId);
      return;
    }
    finishSavedViewAction(context?.successMessage ?? 'Visualização salva.');
  };

  const submitSavedViewName = async (name: string) => {
    const dialog = savedViewNameDialog;
    if (dialog === null) return;

    let successMessage: string;
    let action: ReturnType<typeof tableView.create>;
    if (dialog.mode === 'create') {
      successMessage = `Visualização “${name}” criada.`;
      action = tableView.create(name);
    } else if (dialog.mode === 'duplicate') {
      successMessage = `Visualização “${name}” criada.`;
      action = tableView.duplicate(dialog.viewId, name);
    } else if (dialog.mode === 'rename') {
      successMessage = `Visualização “${dialog.previousName}” renomeada para “${name}”.`;
      action = tableView.rename(dialog.viewId, name);
    } else {
      successMessage = `Visualização “${name}” criada para edição.`;
      action = tableView.save(name);
    }

    const continuationId =
      dialog.continuation === undefined ? undefined : beginSavedViewContinuation();
    savedViewRetryRef.current = {
      successMessage,
      ...(dialog.continuation === undefined || continuationId === undefined
        ? {}
        : { afterSave: dialog.continuation, continuationId }),
    };
    const result = await action;
    if (result.status === 'confirmed') {
      setSavedViewNameDialog(null);
      if (dialog.continuation !== undefined && continuationId !== undefined) {
        if (!isCurrentSavedViewContinuation(continuationId)) return;
        await continueAfterSavedView(dialog.continuation, continuationId);
      } else {
        finishSavedViewAction(successMessage);
      }
    } else if (result.status === 'failed') {
      setSavedViewNameDialog(null);
    }
  };

  const requestViewActivation = (viewId: string) => {
    const target = tableView.views.find(({ state: viewState }) => viewState.viewId === viewId);
    if (target === undefined) return;
    if (tableView.dirty) {
      setSavedViewDirtyTarget({ kind: 'view', viewId, name: target.state.label });
      return;
    }
    void performViewActivation(viewId, target.state.label);
  };

  const requestCreateView = () => {
    setSavedViewNameDialog({
      mode: 'create',
      viewId: activeSavedView.state.viewId,
      previousName: activeSavedView.state.label,
      initialValue: '',
    });
  };

  const requestDuplicateView = (viewId: string) => {
    const source = tableView.views.find(({ state: viewState }) => viewState.viewId === viewId);
    if (source === undefined) return;
    const saveDirtyImmutable =
      tableView.dirty &&
      (source.state.provenance !== 'user-owned' || source.mutability !== 'mutable');
    setSavedViewNameDialog({
      mode: saveDirtyImmutable ? 'save-as' : 'duplicate',
      viewId,
      previousName: source.state.label,
      initialValue: saveDirtyImmutable ? '' : `${source.state.label} — cópia`,
    });
  };

  const requestRenameView = (viewId: string) => {
    const target = tableView.views.find(({ state: viewState }) => viewState.viewId === viewId);
    if (target === undefined) return;
    setSavedViewNameDialog({
      mode: 'rename',
      viewId,
      previousName: target.state.label,
      initialValue: target.state.label,
    });
  };

  const deleteFallback = (viewId: string) =>
    tableView.views.find(
      ({ state: viewState }) =>
        viewState.viewId === tableView.defaultViewId && viewState.viewId !== viewId,
    ) ??
    tableView.views.find(
      ({ state: viewState }) =>
        viewState.provenance === 'system-default' && viewState.viewId !== viewId,
    ) ??
    tableView.views.find(({ state: viewState }) => viewState.viewId !== viewId);

  const requestDeleteView = (viewId: string) => {
    const target = tableView.views.find(({ state: viewState }) => viewState.viewId === viewId);
    const fallback = deleteFallback(viewId);
    if (target === undefined || fallback === undefined) return;
    setSavedViewDeleteDialog({
      viewId,
      viewName: target.state.label,
      fallbackViewId: fallback.state.viewId,
      fallbackName: fallback.state.label,
    });
  };

  const confirmDeleteView = () => {
    const dialog = savedViewDeleteDialog;
    if (dialog === null) return;
    setSavedViewDeleteDialog(null);
    const target: Extract<SavedViewTransitionTarget, { kind: 'delete' }> = {
      kind: 'delete',
      viewId: dialog.viewId,
      viewName: dialog.viewName,
      fallbackViewId: dialog.fallbackViewId,
      name: dialog.fallbackName,
    };
    if (tableView.dirty) {
      setSavedViewDirtyTarget(target);
      return;
    }
    void performViewDeletion(target);
  };

  const setDefaultView = async (viewId: string) => {
    const target = tableView.views.find(({ state: viewState }) => viewState.viewId === viewId);
    if (target === undefined) return;
    const successMessage = `“${target.state.label}” definida como visualização padrão.`;
    savedViewRetryRef.current = { successMessage };
    const result = await tableView.setDefault(viewId);
    if (result.status === 'confirmed') finishSavedViewAction(successMessage);
  };

  const saveActiveView = async () => {
    const successMessage = `Visualização “${activeSavedView.state.label}” salva.`;
    savedViewRetryRef.current = { successMessage };
    const result = await tableView.save();
    if (result.status === 'confirmed') {
      finishSavedViewAction(successMessage);
      return true;
    }
    return false;
  };

  const restoreActiveView = async () => {
    const resetResult = tableView.reset();
    if (!resetResult.accepted) return;
    const successMessage = `Visualização “${activeSavedView.state.label}” restaurada.`;
    savedViewRetryRef.current = { successMessage };
    const result = await tableView.save();
    if (result.status === 'confirmed') finishSavedViewAction(successMessage);
  };

  const continueCurrentView = () => {
    const target = savedViewDirtyTarget;
    cancelSavedViewContinuation();
    setSavedViewDirtyTarget(null);
    if (target?.kind === 'screen') focusNavigationItem(target.screen);
    else focusSavedViewSelector();
  };

  const discardAndContinue = async () => {
    const target = savedViewDirtyTarget;
    if (target === null) return;
    setSavedViewDirtyTarget(null);
    if (target.kind === 'view') {
      await performViewActivation(target.viewId, target.name, 'discard');
      return;
    }
    if (target.kind === 'screen') {
      const result = await tableView.guardTransition('discard');
      if (result.status === 'discarded') {
        finishScreenTransition(target.screen, `Ajustes descartados. ${target.name} aberta.`);
      }
      return;
    }
    tableView.discard();
    await performViewDeletion(target);
  };

  const saveAndContinue = async () => {
    const target = savedViewDirtyTarget;
    if (target === null) return;

    if (
      activeSavedView.state.provenance !== 'user-owned' ||
      activeSavedView.mutability !== 'mutable'
    ) {
      setSavedViewDirtyTarget(null);
      setSavedViewNameDialog({
        mode: 'save-as',
        viewId: activeSavedView.state.viewId,
        previousName: activeSavedView.state.label,
        initialValue: '',
        continuation: target,
      });
      return;
    }

    const successMessage =
      target.kind === 'view'
        ? `Visualização “${target.name}” aberta.`
        : target.kind === 'screen'
          ? `Alterações salvas. ${target.name} aberta.`
          : `Visualização “${target.viewName}” excluída. “${target.name}” foi aberta.`;
    const continuationId = beginSavedViewContinuation();
    savedViewRetryRef.current = { successMessage, afterSave: target, continuationId };
    const result = await tableView.save();
    if (result.status !== 'confirmed') return;
    if (!isCurrentSavedViewContinuation(continuationId)) return;
    setSavedViewDirtyTarget(null);
    await continueAfterSavedView(target, continuationId);
  };

  const openProfile = (route: ProfileRoute) => {
    window.history.pushState({ rivalloProfile: true }, '', profilePath(route));
    setProfileRoute(route);
    setProfileSearchOpen(false);
    setQuery('');
  };

  const returnFromProfile = () => {
    if (window.history.state?.rivalloProfile === true) {
      window.history.back();
      return;
    }
    window.history.replaceState(null, '', '/');
    setProfileRoute(null);
  };

  const closeProfileForWorkspace = () => {
    if (!profileRoute) return;
    window.history.replaceState(null, '', '/');
    setProfileRoute(null);
  };

  const setActiveScreen = (activeScreen: ActiveScreen) => {
    if (busyAction !== null) return;
    if (preferences.activeScreen === 'squad' && activeScreen !== 'squad' && tableView.dirty) {
      setSavedViewDirtyTarget({ kind: 'screen', screen: 'tactics', name: 'Táticas' });
      return;
    }
    closeProfileForWorkspace();
    updatePreference('activeScreen', activeScreen);
  };

  const updateDurableFilters = (
    changes: Partial<{
      readonly lineup: SquadFilter;
      readonly sector: RoleFilter;
      readonly status: StatusFilter;
      readonly positions: readonly Player['position'][];
    }>,
  ) => {
    const current = readSquadDurableFilter(tableView.proposal.filter);
    tableView.dispatch({
      type: 'filter.set',
      filter: mergeSquadDurableFilter(tableView.proposal.filter, {
        ...current,
        ...changes,
      }),
    });
  };

  const setSquadFilter = (lineup: SquadFilter) => updateDurableFilters({ lineup });
  const setRoleFilter = (sector: RoleFilter) => updateDurableFilters({ sector });
  const setStatusFilter = (status: StatusFilter) => updateDurableFilters({ status });
  const setPositionFilter = (position: 'all' | Player['position']) =>
    updateDurableFilters({ positions: position === 'all' ? [] : [position] });
  const setPositionFilterVisible = (visible: boolean) => {
    setPositionFilterControlVisible(visible);
    if (!visible) updateDurableFilters({ positions: [] });
  };
  const setSquadSort = (sort: SquadSortState) => {
    tableView.dispatch({
      type: 'sort.set',
      sort: [{ columnId: sort.key, direction: sort.direction, nulls: 'last' }],
    });
  };

  const resetPreferences = () => setPreferences(defaultPreferences());

  const clearFilters = () => {
    setQuery('');
    tableView.dispatch({
      type: 'filter.set',
      filter: createSquadDurableFilter({
        lineup: 'all',
        sector: 'all',
        status: 'all',
        positions: [],
      }),
    });
    setSquadSort(defaultSquadSort);
    setPositionFilterControlVisible(false);
  };

  const togglePlayer = (player: Player) => {
    setMessage('');
    setError('');
    if (selectedIds.includes(player.id)) {
      setLineupSlots((current) => removePlayerFromSlots(current, player.id));
      setMessage(`${player.shortName} foi retirado do XI.`);
      return;
    }
    if (selectedIds.length >= 11) {
      setError('O XI já está completo. Substitua um titular na tela de Táticas.');
      return;
    }
    setLineupSlots((current) => addPlayerToFirstOpenSlot(current, player.id));
    setMessage(`${player.shortName} foi adicionado ao primeiro espaço livre.`);
  };

  const persistTacticalCandidate = async (
    candidate: TacticalPlanSnapshot,
    successMessage: string,
    action: 'save' | 'play' = 'save',
  ) => {
    if (!state) return null;
    const validation = validateTacticalDraft(candidate, state.players);
    if (!validation.valid) {
      setError(validation.errors[0] ?? 'O plano tático é inválido.');
      return null;
    }
    const operation = ++tacticalSaveOperationRef.current;
    setBusyAction(action);
    setMessage('');
    setError('');
    try {
      const update = await saveTacticalPlan(toTacticalPlanProposal(candidate, approach));
      if (operation !== tacticalSaveOperationRef.current) return null;
      applyServerState(update.state);
      const library = update.state.tacticalLibrary;
      const saved = library?.variations.find(
        ({ variationId }) => variationId === library.activeVariationId,
      );
      setMessage(`${successMessage} · revisão ${saved?.revision ?? candidate.revision + 1}.`);
      return saved ?? null;
    } catch (reason) {
      if (operation !== tacticalSaveOperationRef.current) return null;
      const detail = reason instanceof Error ? reason.message : String(reason);
      setError(
        detail.includes('tactical_plan_conflict')
          ? 'Conflito de versão: o plano salvo é mais recente. Descarte ou recarregue antes de tentar novamente.'
          : detail,
      );
      return null;
    } finally {
      if (operation === tacticalSaveOperationRef.current) setBusyAction(null);
    }
  };

  const saveLineup = async () => {
    if (!state || !tacticalDraft) return null;
    const candidate = syncPlanWithLineupSlots(tacticalDraft, lineupSlots, state.players);
    return persistTacticalCandidate(candidate, `${candidate.name} salva no dispositivo`);
  };

  const runTacticalLibraryCommand = async (
    kind: 'activate' | 'setPrimary' | 'delete',
    variationId: string,
    successMessage: string,
  ) => {
    const library = state?.tacticalLibrary;
    if (!library) return false;
    const operation = ++tacticalSaveOperationRef.current;
    setBusyAction('library');
    setMessage('');
    setError('');
    try {
      const update = await updateTacticalLibrary({
        kind,
        variationId,
        expectedLibraryRevision: library.revision,
      });
      if (operation !== tacticalSaveOperationRef.current) return false;
      applyServerState(update.state);
      setMessage(successMessage);
      return true;
    } catch (reason) {
      if (operation !== tacticalSaveOperationRef.current) return false;
      const detail = reason instanceof Error ? reason.message : String(reason);
      setError(
        detail.includes('tactical_library_conflict')
          ? 'A biblioteca mudou desde a última leitura. Recarregue antes de continuar.'
          : detail,
      );
      return false;
    } finally {
      if (operation === tacticalSaveOperationRef.current) setBusyAction(null);
    }
  };

  const createVariation = async (mode: 'preset' | 'current' | 'duplicate', name: string) => {
    if (!state || !tacticalDraft) return false;
    const base = syncPlanWithLineupSlots(tacticalDraft, lineupSlots, state.players);
    const candidate =
      mode === 'preset'
        ? variationFromPreset(base, state.players, name)
        : forkTacticalVariation(base, name, mode);
    return Boolean(
      await persistTacticalCandidate(candidate, `${name} criada como variação independente`),
    );
  };

  const renameVariation = async (name: string) => {
    if (!tacticalDraft) return false;
    const candidate = {
      ...tacticalDraft,
      name,
      customFormation: { ...tacticalDraft.customFormation, name },
    };
    return Boolean(await persistTacticalCandidate(candidate, `Variação renomeada para ${name}`));
  };

  const playMatch = async () => {
    if (!state || !tacticalDraft) return;
    const candidate = syncPlanWithLineupSlots(tacticalDraft, lineupSlots, state.players);
    const validation = validateTacticalDraft(candidate, state.players);
    if (!validation.valid) {
      setError(validation.errors[0] ?? 'O plano tático é inválido.');
      return;
    }
    const operation = ++tacticalSaveOperationRef.current;
    setBusyAction('play');
    setMessage('');
    setError('');
    try {
      const saved = await saveTacticalPlan(toTacticalPlanProposal(candidate, approach));
      if (operation !== tacticalSaveOperationRef.current) return;
      applyServerState(saved.state);
      const nextState = await playNextMatch();
      if (operation !== tacticalSaveOperationRef.current) return;
      applyServerState(nextState);
      setResultOpen(true);
      setMessage(`Rodada ${nextState.round - 1} concluída e salva.`);
    } catch (reason) {
      if (operation === tacticalSaveOperationRef.current)
        setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      if (operation === tacticalSaveOperationRef.current) setBusyAction(null);
    }
  };

  const restoreResultFocus = () => {
    setResultOpen(false);
    window.requestAnimationFrame(() => resultReturnFocusRef.current?.focus());
  };

  const closeResult = () => {
    const dialog = resultDialogRef.current;
    if (dialog && typeof dialog.close === 'function') dialog.close();
    else restoreResultFocus();
  };

  const restoreSettingsFocus = () => {
    setSettingsOpen(false);
    window.requestAnimationFrame(() => settingsReturnFocusRef.current?.focus());
  };

  const closeSettings = () => {
    const dialog = settingsDialogRef.current;
    if (dialog && typeof dialog.close === 'function') dialog.close();
    else restoreSettingsFocus();
  };

  if (error && !state) {
    return (
      <main className="matchday-boot-error">
        <Icon decorative={false} label="Erro" name="danger" size={24} />
        <h1>Não foi possível abrir a carreira</h1>
        <p>{error}</p>
        <Button onClick={() => window.location.reload()} variant="primary">
          Tentar novamente
        </Button>
      </main>
    );
  }

  if (!state) {
    return (
      <main className="matchday-loading" aria-label="Carregando primeira carreira">
        <Skeleton lines={5} />
      </main>
    );
  }

  const tableResult = applySquadTableView(
    state.players.map((player) => ({
      ...player,
      selected: selectedIds.includes(player.id),
    })),
    tableView.proposal,
    {
      nameQuery: query,
      focusedPlayerId,
      selectedPlayerIds: selectedIds,
    },
  );
  const visiblePlayers = tableResult.rows;

  const tacticalDirty =
    tacticalDraft !== null &&
    savedTacticalPlan !== null &&
    JSON.stringify(tacticalDraft) !== JSON.stringify(savedTacticalPlan);
  const dirty =
    formation !== state.formation ||
    approach !== state.approach ||
    tacticalDirty ||
    lineupSlots.join('|') !== savedLineupSlots.join('|');
  const canPlay =
    selectedIds.length === 11 &&
    tacticalDraft !== null &&
    validateTacticalDraft(
      syncPlanWithLineupSlots(tacticalDraft, lineupSlots, state.players),
      state.players,
    ).valid &&
    busyAction === null;
  const lastResult = state.lastResult;
  const systemSavedView = tableView.views.find(
    ({ state: viewState }) => viewState.provenance === 'system-default',
  );

  const useSystemSavedView = () => {
    if (systemSavedView === undefined) return;
    if (systemSavedView.state.viewId === tableView.activeViewId) {
      finishSavedViewAction('Visualização padrão pronta para uso.');
      return;
    }
    requestViewActivation(systemSavedView.state.viewId);
  };

  const savedViewRepositoryFeedback = (() => {
    if (tableView.commandStatus.status === 'rejected') {
      return (
        <Status headingLevel={3} label="Este ajuste não pode ser aplicado" variant="danger">
          <p>
            {describeTableViewRejection(
              tableView.commandStatus.reason,
              tableView.commandStatus.event.focus,
            )}
          </p>
          <Button onClick={focusTableConfiguration} variant="secondary">
            Revisar ajuste da coluna
          </Button>
        </Status>
      );
    }

    if (tableView.repositoryStatus.status === 'loading') {
      return (
        <Status headingLevel={3} label="Carregando visualizações do elenco…" variant="loading">
          <p>A tabela será exibida assim que as configurações locais forem validadas.</p>
        </Status>
      );
    }

    if (
      tableView.repositoryStatus.status === 'invalid' ||
      tableView.repositoryStatus.status === 'save-failed'
    ) {
      return (
        <Status
          headingLevel={3}
          label="Não foi possível carregar suas visualizações"
          variant="danger"
        >
          <p>
            O elenco foi aberto com a visualização padrão. Tente carregar novamente sem sair desta
            tela.
          </p>
          <Button leadingIcon="retry" onClick={() => void tableView.reload()} variant="secondary">
            Tentar carregar visualizações
          </Button>
        </Status>
      );
    }

    if (tableView.repositoryStatus.status === 'unavailable') {
      return (
        <Status
          headingLevel={3}
          label="Visualizações personalizadas indisponíveis"
          variant="danger"
        >
          <p>
            O elenco continua utilizável na visualização padrão, mas novas alterações não podem ser
            gravadas agora.
          </p>
          <Button leadingIcon="retry" onClick={() => void tableView.reload()} variant="secondary">
            Tentar reconectar ao repositório
          </Button>
        </Status>
      );
    }

    if (tableView.repositoryStatus.status === 'recovered') {
      if (
        tableView.repositoryStatus.reason === 'future_envelope_version' ||
        tableView.repositoryStatus.reason === 'future_schema_version'
      ) {
        return (
          <Status
            headingLevel={3}
            label="Esta visualização exige uma versão mais recente"
            variant="warning"
          >
            <p>
              Ela foi isolada para evitar perda de configuração. A visualização padrão foi aberta
              com segurança.
            </p>
            <Button onClick={useSystemSavedView} variant="secondary">
              Usar visualização padrão
            </Button>
          </Status>
        );
      }

      if (tableView.repositoryStatus.reason === 'interrupted_write') {
        return (
          <Status headingLevel={3} label="Visualizações do elenco recuperadas" variant="warning">
            <p>
              Uma gravação interrompida foi reconciliada e a última configuração válida foi
              preservada.
            </p>
            <Button onClick={useSystemSavedView} variant="secondary">
              Revisar visualização padrão
            </Button>
          </Status>
        );
      }

      return (
        <Status headingLevel={3} label="Uma visualização corrompida foi isolada" variant="warning">
          <p>
            A configuração inválida não foi aplicada. O elenco e os jogadores não foram alterados.
          </p>
          <Button onClick={useSystemSavedView} variant="secondary">
            Revisar visualização padrão
          </Button>
        </Status>
      );
    }

    if (tableView.legacyStatus.status === 'invalid' || tableView.legacyStatus.status === 'failed') {
      return (
        <Status
          headingLevel={3}
          label="Preferências antigas não puderam ser importadas"
          variant="warning"
        >
          <p>
            Os dados antigos foram mantidos para diagnóstico e o elenco voltou à visualização
            padrão.
          </p>
          <Button onClick={useSystemSavedView} variant="secondary">
            Usar visualização padrão
          </Button>
        </Status>
      );
    }

    if (tableView.legacyStatus.status === 'importing') {
      return (
        <Status headingLevel={3} label="Importando preferências antigas…" variant="loading">
          <p>As preferências antigas serão retiradas somente após a confirmação do repositório.</p>
        </Status>
      );
    }

    return null;
  })();

  const savedViewMigrationFeedback =
    tableView.legacyStatus.status === 'imported' ||
    tableView.legacyStatus.status === 'already-imported' ? (
      <div className="saved-view-migration-feedback">
        <Toast
          message="Densidade e colunas compatíveis agora estão protegidas no repositório de visualizações."
          title="Preferências antigas importadas"
          tone="positive"
        />
        <Button onClick={focusTableConfiguration} variant="secondary">
          Revisar visualização importada
        </Button>
      </div>
    ) : tableView.repositoryStatus.status === 'migrated' ? (
      <Toast
        message="Suas visualizações foram atualizadas e a configuração válida foi preservada."
        title="Visualizações do elenco atualizadas"
        tone="positive"
      />
    ) : null;

  const savedViewHeader = (
    <div className="saved-view-lifecycle-host">
      <div className="saved-view-lifecycle">
        <SavedViewSelector
          activeViewId={tableView.activeViewId}
          busy={tableView.persistenceStatus.status === 'saving'}
          defaultViewId={tableView.defaultViewId}
          dirty={tableView.dirty}
          disabled={tableView.repositoryStatus.status === 'loading'}
          mutationsDisabled={!tableView.capabilities.canPersist}
          onActivate={requestViewActivation}
          onCreate={requestCreateView}
          onDelete={requestDeleteView}
          onDuplicate={requestDuplicateView}
          onRename={requestRenameView}
          onReset={() => void restoreActiveView()}
          onSave={() => void saveActiveView()}
          onSetDefault={(viewId) => void setDefaultView(viewId)}
          views={tableView.views}
        />
      </div>
      <p aria-atomic="true" className="sr-only" role="status">
        {savedViewAnnouncement}
      </p>
      {savedViewRepositoryFeedback}
      {savedViewMigrationFeedback}
      {savedViewFailureVisible && tableView.persistenceStatus.status === 'failed' && (
        <section className="saved-view-failure">
          <Status label="Falha ao gravar visualização" variant="danger">
            <h3 ref={savedViewFailureHeadingRef} tabIndex={-1}>
              Não foi possível salvar a visualização
            </h3>
            <p>Seus ajustes continuam nesta tela e ainda não foram gravados neste dispositivo.</p>
          </Status>
          <div className="saved-view-failure__actions">
            <Button
              leadingIcon="retry"
              onClick={() => void retrySavedViewMutation()}
              variant="secondary"
            >
              Tentar salvar visualização
            </Button>
            <Button
              onClick={() => {
                setSavedViewFailureVisible(false);
                focusSavedViewSelector();
              }}
              variant="secondary"
            >
              Continuar sem salvar
            </Button>
          </div>
        </section>
      )}
    </div>
  );

  return (
    <div
      className="manager-shell"
      data-sidebar-collapsed={preferences.sidebarCollapsed || undefined}
    >
      <aside className="manager-sidebar">
        <div className="manager-brand">
          <RivalloBrand compact={preferences.sidebarCollapsed} />
        </div>
        <nav aria-label="Navegação principal" className="manager-navigation">
          {navigationGroups.map((group, groupIndex) => (
            <div className="manager-navigation__group" key={groupIndex}>
              {group.map((item) => {
                const active = !profileRoute && item.id === preferences.activeScreen;
                return (
                  <button
                    aria-current={active ? 'page' : undefined}
                    aria-label={preferences.sidebarCollapsed ? item.label : undefined}
                    className="manager-navigation__item"
                    data-navigation-id={item.id}
                    disabled={!item.available || busyAction !== null}
                    key={item.id}
                    onClick={() => {
                      if (item.id === 'squad' || item.id === 'tactics') setActiveScreen(item.id);
                    }}
                    title={item.available ? item.label : `${item.label} — em breve`}
                    type="button"
                  >
                    <Icon name={item.icon} size={20} />
                    <span>{item.label}</span>
                    {item.badge && <b>{item.badge}</b>}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
        <div
          className="manager-sidebar__status"
          title={`Serviço local ${serviceOwnership === 'owned' ? 'iniciado pelo Rivallo' : 'reutilizado'}`}
        >
          <i /> <span>Carreira local</span>
        </div>
        <div className="manager-sidebar__footer">
          <button
            aria-label="Personalizar"
            onClick={(event) => {
              settingsReturnFocusRef.current = event.currentTarget;
              setSettingsOpen(true);
            }}
            ref={settingsReturnFocusRef}
            type="button"
          >
            <Icon name="settings" size={20} />
            <span>Personalizar</span>
          </button>
          <Tooltip
            content={preferences.sidebarCollapsed ? 'Expandir navegação' : 'Recolher navegação'}
          >
            <button
              aria-label={
                preferences.sidebarCollapsed ? 'Expandir navegação' : 'Recolher navegação'
              }
              onClick={() => updatePreference('sidebarCollapsed', !preferences.sidebarCollapsed)}
              type="button"
            >
              <Icon
                name={preferences.sidebarCollapsed ? 'expand-navigation' : 'collapse-navigation'}
                size={20}
              />
            </button>
          </Tooltip>
        </div>
      </aside>

      <div className="manager-surface">
        <header className="manager-topbar" data-tauri-drag-region>
          <div
            className="global-search-wrap"
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setProfileSearchOpen(false);
            }}
          >
            <label className="global-search">
              <Icon name="search" size={16} />
              <span className="sr-only">Buscar jogadores e treinadores</span>
              <input
                aria-controls="global-profile-results"
                aria-expanded={profileSearchOpen && query.trim().length >= 2}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setProfileSearchOpen(true);
                }}
                onFocus={() => setProfileSearchOpen(true)}
                placeholder="Buscar jogador ou treinador"
                type="search"
                value={query}
              />
              {profileSearchBusy && (
                <Icon className="global-search__busy" name="loading" size={16} />
              )}
            </label>
            {profileSearchOpen && query.trim().length >= 2 && (
              <div className="global-profile-results" id="global-profile-results">
                {profileSearchBusy ? (
                  <span>Buscando perfis…</span>
                ) : profileSearchResults.length === 0 ? (
                  <span>Nenhum perfil encontrado.</span>
                ) : (
                  <ul>
                    {profileSearchResults.map((result) => (
                      <li key={result.entityId}>
                        <button
                          onClick={() =>
                            openProfile({
                              kind: result.entityType,
                              entityId: result.entityId,
                            })
                          }
                          type="button"
                        >
                          <Icon
                            name={result.entityType === 'player' ? 'people' : 'staff'}
                            size={16}
                          />
                          <span>
                            <strong>{result.name}</strong>
                            <small>{result.secondaryLabel}</small>
                          </span>
                          <em>{result.entityType === 'player' ? 'Jogador' : 'Treinador'}</em>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
          <div className="manager-topbar__time">
            <strong>TER 15 JUL 2026</strong>
            <span>09:15</span>
          </div>
          <div className="manager-topbar__weather" title="Condições do próximo jogo">
            <Icon name="weather" size={20} />
            <strong>18 °C</strong>
          </div>
          <div className="manager-topbar__club">
            <span
              className="club-crest"
              style={{ '--club-color': state.club.primaryColor } as CSSProperties}
            >
              {state.club.shortName}
            </span>
            <span>
              <strong>{state.club.name}</strong>
              <small>Liga Horizonte · {state.record.points} pts</small>
            </span>
          </div>
          <Button
            className="continue-button"
            disabled={!canPlay}
            leadingIcon="next"
            loading={busyAction === 'play'}
            loadingLabel="Simulando…"
            onClick={(event) => {
              resultReturnFocusRef.current = event.currentTarget;
              void playMatch();
            }}
            variant="primary"
          >
            Continuar
          </Button>
          <WindowControls />
        </header>

        <main className="manager-main">
          {profileRoute ? (
            <ProfileScreen
              onBack={returnFromProfile}
              onNavigate={openProfile}
              route={profileRoute}
              variationId={state.tacticalLibrary?.activeVariationId}
            />
          ) : preferences.activeScreen === 'squad' ? (
            <>
              <SquadWorkspace
                density={density}
                dirty={dirty}
                error={error}
                focusedPlayerId={focusedPlayerId}
                message={message}
                onClearFilters={clearFilters}
                onDensityChange={(nextDensity) =>
                  tableView.dispatch({ type: 'density.set', density: nextDensity })
                }
                onFocusPlayer={setFocusedPlayerId}
                onOpenProfile={(playerId) => openProfile({ kind: 'player', entityId: playerId })}
                onPositionFilterChange={setPositionFilter}
                onPositionFilterVisibleChange={setPositionFilterVisible}
                onRoleFilterChange={setRoleFilter}
                onSave={() => void saveLineup()}
                onSortChange={setSquadSort}
                onSquadFilterChange={setSquadFilter}
                onStatusFilterChange={setStatusFilter}
                onTogglePlayer={togglePlayer}
                players={visiblePlayers}
                positionFilter={positionFilter}
                positionFilterVisible={positionFilterVisible}
                query={query}
                roleFilter={roleFilter}
                saving={busyAction === 'save'}
                selectedIds={selectedIds}
                showPlayerDetails={preferences.showPlayerDetails}
                sortState={squadSort}
                squadFilter={squadFilter}
                state={state}
                statusFilter={statusFilter}
                tableHeader={savedViewHeader}
                tableViewBaseline={tableView.baseline}
                tableViewDirty={tableView.dirty}
                tableViewLoading={tableView.repositoryStatus.status === 'loading'}
                tableViewPersistenceStatus={tableView.persistenceStatus}
                tableViewRepositoryStatus={tableView.repositoryStatus}
                tableViewState={tableView.proposal}
                tableViewStatus={
                  <TableViewStatus
                    dirty={tableView.dirty}
                    isDefault={tableView.activeViewId === tableView.defaultViewId}
                    provenance={activeSavedView.state.provenance}
                  />
                }
                onSaveTableView={saveActiveView}
                onTableViewCommand={tableView.dispatch}
              />
            </>
          ) : tacticalDraft && savedTacticalPlan && state.tacticalLibrary ? (
            <TacticsWorkspace
              activeTool={activeTacticalTool}
              canUndo={tacticalHistory.length > 0}
              draft={tacticalDraft}
              dirty={dirty}
              error={error}
              focusedPlayerId={focusedPlayerId}
              message={message}
              library={state.tacticalLibrary}
              onActiveToolChange={setActiveTacticalTool}
              onApproachChange={setApproach}
              onDiscard={() => {
                setTacticalDraft(savedTacticalPlan);
                setLineupSlots(savedTacticalPlan.placements.map(({ playerId }) => playerId));
                setFormation(savedTacticalPlan.formation);
                setApproach(state.approach);
                setTacticalHistory([]);
                setMessage('Alterações descartadas; último plano salvo restaurado.');
                setError('');
              }}
              onDraftChange={(nextDraft) => {
                setTacticalHistory([tacticalDraft]);
                setTacticalDraft(nextDraft);
                setLineupSlots(nextDraft.placements.map(({ playerId }) => playerId));
                setFormation(nextDraft.formation);
                setError('');
                setMessage('');
              }}
              onCreateVariation={createVariation}
              onDeleteVariation={(variationId) =>
                runTacticalLibraryCommand(
                  'delete',
                  variationId,
                  'Variação excluída; as demais foram preservadas.',
                )
              }
              onFocusPlayer={setFocusedPlayerId}
              onOpenProfile={(playerId) => openProfile({ kind: 'player', entityId: playerId })}
              onPitchModeChange={(pitchMode) => updatePreference('pitchMode', pitchMode)}
              onRenameVariation={renameVariation}
              onSave={saveLineup}
              onSetPrimaryVariation={(variationId) =>
                runTacticalLibraryCommand(
                  'setPrimary',
                  variationId,
                  'Variação definida como principal.',
                )
              }
              onSwitchVariation={(variationId) =>
                runTacticalLibraryCommand(
                  'activate',
                  variationId,
                  `Variação ${state.tacticalLibrary?.variations.find((item) => item.variationId === variationId)?.name ?? ''} restaurada.`,
                )
              }
              onUndo={() => {
                const previous = tacticalHistory.at(-1);
                if (!previous) return;
                setTacticalDraft(previous);
                setLineupSlots(previous.placements.map(({ playerId }) => playerId));
                setFormation(previous.formation);
                setTacticalHistory([]);
                setMessage('Última alteração desfeita.');
                setError('');
              }}
              pitchMode={preferences.pitchMode}
              saving={busyAction !== null}
              state={state}
            />
          ) : (
            <Skeleton aria-label="Carregando plano tático" lines={8} />
          )}
        </main>
      </div>

      {savedViewNameDialog && (
        <SavedViewNameDialog
          busy={tableView.persistenceStatus.status === 'saving'}
          initialValue={savedViewNameDialog.initialValue}
          key={`${savedViewNameDialog.mode}:${savedViewNameDialog.viewId}`}
          mode={savedViewNameDialog.mode}
          onDismiss={() => {
            cancelSavedViewContinuation();
            setSavedViewNameDialog(null);
            focusSavedViewSelector();
          }}
          onSubmit={(name) => void submitSavedViewName(name)}
        />
      )}

      {savedViewDeleteDialog && (
        <SavedViewDeleteDialog
          busy={tableView.persistenceStatus.status === 'saving'}
          onConfirm={confirmDeleteView}
          onDismiss={() => {
            cancelSavedViewContinuation();
            setSavedViewDeleteDialog(null);
            focusSavedViewSelector();
          }}
          viewName={savedViewDeleteDialog.viewName}
        />
      )}

      {savedViewDirtyTarget && (
        <SavedViewDirtyDialog
          busy={tableView.persistenceStatus.status === 'saving'}
          onContinue={continueCurrentView}
          onDiscard={() => void discardAndContinue()}
          onSave={() => void saveAndContinue()}
          targetName={savedViewDirtyTarget.name}
        />
      )}

      {settingsOpen && (
        <dialog
          aria-labelledby="personalization-title"
          className="personalization-panel"
          onClose={restoreSettingsFocus}
          ref={settingsDialogRef}
        >
          <header>
            <div>
              <span>Interface</span>
              <h2 id="personalization-title">Personalizar Rivallo</h2>
            </div>
            <button aria-label="Fechar personalização" onClick={closeSettings} type="button">
              <Icon name="close" size={20} />
            </button>
          </header>
          <section>
            <h3>Navegação</h3>
            <div className="preference-options">
              <button
                aria-pressed={!preferences.sidebarCollapsed}
                onClick={() => updatePreference('sidebarCollapsed', false)}
                type="button"
              >
                Expandida
              </button>
              <button
                aria-pressed={preferences.sidebarCollapsed}
                onClick={() => updatePreference('sidebarCollapsed', true)}
                type="button"
              >
                Compacta
              </button>
            </div>
          </section>
          <section>
            <h3>Painel do jogador</h3>
            <div className="preference-options">
              <button
                aria-pressed={preferences.showPlayerDetails}
                onClick={() => updatePreference('showPlayerDetails', true)}
                type="button"
              >
                Visível
              </button>
              <button
                aria-pressed={!preferences.showPlayerDetails}
                onClick={() => updatePreference('showPlayerDetails', false)}
                type="button"
              >
                Oculto
              </button>
            </div>
          </section>
          <section>
            <h3>Leitura do campo</h3>
            <div className="preference-options">
              {(['roles', 'condition', 'familiarity'] as const).map((mode) => (
                <button
                  aria-pressed={preferences.pitchMode === mode}
                  key={mode}
                  onClick={() => updatePreference('pitchMode', mode)}
                  type="button"
                >
                  {mode === 'roles' ? 'Funções' : mode === 'condition' ? 'Condição' : 'Encaixe'}
                </button>
              ))}
            </div>
          </section>
          <footer>
            <Button leadingIcon="retry" onClick={resetPreferences} variant="secondary">
              Restaurar padrão
            </Button>
            <Button onClick={closeSettings} variant="primary">
              Concluir
            </Button>
          </footer>
        </dialog>
      )}

      {resultOpen && lastResult && (
        <dialog
          aria-labelledby="result-title"
          className="result-dialog"
          onClose={restoreResultFocus}
          ref={resultDialogRef}
        >
          <section className="result-sheet">
            <header>
              <span>
                {resultLabel(lastResult)} · Rodada {lastResult.round}
              </span>
              <h2 id="result-title">
                {lastResult.homeGoals} <small>×</small> {lastResult.awayGoals}
              </h2>
              <p>
                {lastResult.homeClub} · {lastResult.awayClub}
              </p>
            </header>
            <div className="result-stats">
              <span>
                <strong>{lastResult.possession}%</strong> posse
              </span>
              <span>
                <strong>{lastResult.shots}</strong> finalizações
              </span>
              <span>
                <strong>{lastResult.shotsAgainst}</strong> sofridas
              </span>
              <span>
                <strong>{state.record.points}</strong> pontos
              </span>
            </div>
            <ol className="event-feed">
              {lastResult.events.map((event, index) => (
                <li data-own={event.forUserClub || undefined} key={`${event.minute}-${index}`}>
                  <time>{event.minute}'</time>
                  <span>{event.text}</span>
                </li>
              ))}
            </ol>
            <Button onClick={closeResult} variant="primary">
              Preparar próxima rodada
            </Button>
          </section>
        </dialog>
      )}
    </div>
  );
}
