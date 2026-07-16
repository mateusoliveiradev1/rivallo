import { Icon, type GenericIconName } from '@rivallo/icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import { Button } from '../ui/primitives/actions.js';
import { Skeleton } from '../ui/primitives/feedback.js';
import { loadMatchday, playNextMatch, saveMatchdayLineup } from './client.js';
import {
  defaultSquadSort,
  optionalColumnLabels,
  optionalColumns,
  positionLabels,
  rolePositions,
  type ActiveScreen,
  type Density,
  type OptionalColumn,
  type PitchMode,
  type RoleFilter,
  type SquadFilter,
  type StatusFilter,
  type TacticalTool,
  type UiPreferences,
} from './matchday-ui.js';
import { RivalloBrand } from './RivalloBrand.js';
import { sortSquadPlayers, type SquadSortState } from './squad-sort.js';
import { SquadWorkspace } from './SquadWorkspace.js';
import {
  addPlayerToFirstOpenSlot,
  createLineupSlots,
  hasSameSelectedPlayers,
  normalizeStoredSlots,
  removePlayerFromSlots,
  selectedIdsFromSlots,
  type LineupSlots,
} from './tactics-model.js';
import { TacticsWorkspace } from './TacticsWorkspace.js';
import type { MatchResult, MatchdayState, Player, TacticalApproach } from './types.js';
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

const UI_PREFERENCES_KEY = 'rivallo.squad-ui.v4';
const LEGACY_UI_PREFERENCES_KEYS = ['rivallo.squad-ui.v3', 'rivallo.squad-ui.v2'] as const;
const TACTICS_LAYOUT_KEY = 'rivallo.tactics-layout.v1';

const defaultPreferences = (): UiPreferences => ({
  sidebarCollapsed: typeof window !== 'undefined' && window.innerWidth < 1240,
  density: 'compact',
  visibleColumns: optionalColumns,
  activeScreen: 'squad',
  showPlayerDetails: typeof window === 'undefined' || window.innerWidth >= 1120,
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
    const columns =
      currentRaw && Array.isArray(stored.visibleColumns)
        ? stored.visibleColumns.filter((column): column is OptionalColumn =>
            optionalColumns.includes(column as OptionalColumn),
          )
        : defaults.visibleColumns;
    const activeScreen: ActiveScreen =
      stored.activeScreen === 'tactics' || stored.workspaceView === 'tactics' ? 'tactics' : 'squad';
    return {
      sidebarCollapsed:
        typeof stored.sidebarCollapsed === 'boolean'
          ? stored.sidebarCollapsed
          : defaults.sidebarCollapsed,
      density: ['compact', 'standard', 'comfortable'].includes(String(stored.density))
        ? (stored.density as Density)
        : defaults.density,
      visibleColumns: columns.length > 0 ? columns : defaults.visibleColumns,
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
  const [formation, setFormation] = useState<MatchdayState['formation']>('4-3-3');
  const [approach, setApproach] = useState<TacticalApproach>('balanced');
  const [busyAction, setBusyAction] = useState<'save' | 'play' | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [resultOpen, setResultOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [squadFilter, setSquadFilter] = useState<SquadFilter>('all');
  const [squadSort, setSquadSort] = useState<SquadSortState>(defaultSquadSort);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [positionFilter, setPositionFilter] = useState<'all' | Player['position']>('all');
  const [positionFilterVisible, setPositionFilterVisible] = useState(false);
  const [focusedPlayerId, setFocusedPlayerId] = useState<string | null>(null);
  const [activeTacticalTool, setActiveTacticalTool] = useState<TacticalTool>('tactics');
  const [preferences, setPreferences] = useState<UiPreferences>(readPreferences);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsDialogRef = useRef<HTMLDialogElement>(null);
  const settingsReturnFocusRef = useRef<HTMLButtonElement>(null);
  const resultDialogRef = useRef<HTMLDialogElement>(null);
  const resultReturnFocusRef = useRef<HTMLButtonElement>(null);

  const selectedIds = useMemo(() => selectedIdsFromSlots(lineupSlots), [lineupSlots]);

  useEffect(() => {
    try {
      window.localStorage.setItem(UI_PREFERENCES_KEY, JSON.stringify(preferences));
    } catch {
      // Preferences remain active for this session when storage is unavailable.
    }
  }, [preferences]);

  const applyServerState = (
    nextState: MatchdayState,
    preferredSlots?: LineupSlots,
    persistLayout = false,
  ) => {
    const serverSlots = createLineupSlots(nextState.players);
    const serverIds = selectedIdsFromSlots(serverSlots);
    const normalizedPreferred = preferredSlots
      ? normalizeStoredSlots(preferredSlots, nextState.players)
      : null;
    const stored = readStoredLineup(nextState.players);
    const layout =
      normalizedPreferred && hasSameSelectedPlayers(normalizedPreferred, serverIds)
        ? normalizedPreferred
        : stored && hasSameSelectedPlayers(stored, serverIds)
          ? stored
          : serverSlots;

    setState(nextState);
    setLineupSlots(layout);
    setSavedLineupSlots(layout);
    setFormation(nextState.formation);
    setApproach(nextState.approach);
    setFocusedPlayerId(
      (current) =>
        current ?? nextState.players.find((player) => serverIds.includes(player.id))?.id ?? null,
    );
    if (persistLayout) {
      try {
        window.localStorage.setItem(TACTICS_LAYOUT_KEY, JSON.stringify(layout));
      } catch {
        // The saved server selection remains authoritative if local layout storage is unavailable.
      }
    }
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

  const setActiveScreen = (activeScreen: ActiveScreen) =>
    updatePreference('activeScreen', activeScreen);

  const toggleColumn = (column: OptionalColumn) => {
    const visible = preferences.visibleColumns.includes(column);
    updatePreference(
      'visibleColumns',
      visible
        ? preferences.visibleColumns.filter((candidate) => candidate !== column)
        : [...preferences.visibleColumns, column],
    );
  };

  const resetTableView = () =>
    setPreferences((current) => ({
      ...current,
      density: 'compact',
      visibleColumns: optionalColumns,
    }));

  const resetPreferences = () => setPreferences(defaultPreferences());

  const clearFilters = () => {
    setQuery('');
    setSquadFilter('all');
    setSquadSort(defaultSquadSort);
    setRoleFilter('all');
    setStatusFilter('all');
    setPositionFilter('all');
    setPositionFilterVisible(false);
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

  const saveLineup = async () => {
    setBusyAction('save');
    setMessage('');
    setError('');
    try {
      const nextState = await saveMatchdayLineup(selectedIds, formation, approach);
      applyServerState(nextState, lineupSlots, true);
      setMessage('Plano de jogo salvo no dispositivo.');
      return nextState;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
      return null;
    } finally {
      setBusyAction(null);
    }
  };

  const playMatch = async () => {
    setBusyAction('play');
    setMessage('');
    setError('');
    try {
      const savedState = await saveMatchdayLineup(selectedIds, formation, approach);
      applyServerState(savedState, lineupSlots, true);
      const nextState = await playNextMatch();
      applyServerState(nextState, lineupSlots, true);
      setResultOpen(true);
      setMessage(`Rodada ${nextState.round - 1} concluída e salva.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusyAction(null);
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

  const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR');
  const filteredPlayers = state.players.filter((player) => {
    const selected = selectedIds.includes(player.id);
    const matchesSquad =
      squadFilter === 'all' ||
      (squadFilter === 'selected' && selected) ||
      (squadFilter === 'reserve' && !selected);
    const matchesRole = roleFilter === 'all' || rolePositions[roleFilter].includes(player.position);
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'ready' && player.condition >= 90) ||
      (statusFilter === 'attention' && player.condition < 90);
    const matchesPosition =
      !positionFilterVisible || positionFilter === 'all' || player.position === positionFilter;
    const matchesQuery =
      normalizedQuery.length === 0 ||
      player.name.toLocaleLowerCase('pt-BR').includes(normalizedQuery) ||
      positionLabels[player.position].toLocaleLowerCase('pt-BR').includes(normalizedQuery);
    return matchesSquad && matchesRole && matchesStatus && matchesPosition && matchesQuery;
  });
  const visiblePlayers = sortSquadPlayers(
    filteredPlayers.map((player) => ({
      ...player,
      selected: selectedIds.includes(player.id),
    })),
    squadSort.key,
    squadSort.direction,
  );

  const dirty =
    formation !== state.formation ||
    approach !== state.approach ||
    lineupSlots.join('|') !== savedLineupSlots.join('|');
  const canPlay = selectedIds.length === 11 && busyAction === null;
  const lastResult = state.lastResult;

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
                const active = item.id === preferences.activeScreen;
                return (
                  <button
                    aria-current={active ? 'page' : undefined}
                    aria-label={preferences.sidebarCollapsed ? item.label : undefined}
                    className="manager-navigation__item"
                    disabled={!item.available}
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
          <button
            aria-label={preferences.sidebarCollapsed ? 'Expandir navegação' : 'Recolher navegação'}
            onClick={() => updatePreference('sidebarCollapsed', !preferences.sidebarCollapsed)}
            title={preferences.sidebarCollapsed ? 'Expandir navegação' : 'Recolher navegação'}
            type="button"
          >
            <Icon
              name={preferences.sidebarCollapsed ? 'expand-navigation' : 'collapse-navigation'}
              size={20}
            />
          </button>
        </div>
      </aside>

      <div className="manager-surface">
        <header className="manager-topbar" data-tauri-drag-region>
          <label
            className="global-search"
            data-disabled={preferences.activeScreen === 'tactics' || undefined}
            title={
              preferences.activeScreen === 'tactics'
                ? 'A busca do elenco fica disponível na tela de Elenco.'
                : undefined
            }
          >
            <Icon name="search" size={16} />
            <span className="sr-only">
              {preferences.activeScreen === 'tactics'
                ? 'Busca disponível na tela de Elenco'
                : 'Buscar jogador no elenco'}
            </span>
            <input
              disabled={preferences.activeScreen === 'tactics'}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={
                preferences.activeScreen === 'tactics' ? 'Busca no Elenco' : 'Buscar jogador'
              }
              type="search"
              value={query}
            />
          </label>
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
          {preferences.activeScreen === 'squad' ? (
            <SquadWorkspace
              dirty={dirty}
              error={error}
              focusedPlayerId={focusedPlayerId}
              message={message}
              onClearFilters={clearFilters}
              onDensityChange={(density) => updatePreference('density', density)}
              onFocusPlayer={setFocusedPlayerId}
              onPositionFilterChange={setPositionFilter}
              onPositionFilterVisibleChange={setPositionFilterVisible}
              onResetView={resetTableView}
              onRoleFilterChange={setRoleFilter}
              onSave={() => void saveLineup()}
              onSortChange={setSquadSort}
              onSquadFilterChange={setSquadFilter}
              onStatusFilterChange={setStatusFilter}
              onToggleColumn={toggleColumn}
              onTogglePlayer={togglePlayer}
              players={visiblePlayers}
              positionFilter={positionFilter}
              positionFilterVisible={positionFilterVisible}
              preferences={preferences}
              query={query}
              roleFilter={roleFilter}
              saving={busyAction === 'save'}
              selectedIds={selectedIds}
              sortState={squadSort}
              squadFilter={squadFilter}
              state={state}
              statusFilter={statusFilter}
            />
          ) : (
            <TacticsWorkspace
              activeTool={activeTacticalTool}
              approach={approach}
              dirty={dirty}
              error={error}
              focusedPlayerId={focusedPlayerId}
              formation={formation}
              lineupSlots={lineupSlots}
              message={message}
              onActiveToolChange={setActiveTacticalTool}
              onApproachChange={setApproach}
              onFocusPlayer={setFocusedPlayerId}
              onFormationChange={setFormation}
              onLineupChange={(slots) => {
                setLineupSlots(slots);
                setError('');
                setMessage('');
              }}
              onPitchModeChange={(pitchMode) => updatePreference('pitchMode', pitchMode)}
              onReset={() => {
                setLineupSlots(savedLineupSlots);
                setFormation(state.formation);
                setApproach(state.approach);
                setMessage('Alterações desfeitas.');
                setError('');
              }}
              onSave={() => void saveLineup()}
              pitchMode={preferences.pitchMode}
              saving={busyAction === 'save'}
              state={state}
            />
          )}
        </main>
      </div>

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
            <h3>Densidade do elenco</h3>
            <div className="preference-options">
              {(['compact', 'standard', 'comfortable'] as const).map((density) => (
                <button
                  aria-pressed={preferences.density === density}
                  key={density}
                  onClick={() => updatePreference('density', density)}
                  type="button"
                >
                  {density === 'compact'
                    ? 'Compacta'
                    : density === 'standard'
                      ? 'Padrão'
                      : 'Confortável'}
                </button>
              ))}
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
          <section>
            <h3>Colunas visíveis</h3>
            <div className="preference-options preference-options--columns">
              {optionalColumns.map((column) => (
                <button
                  aria-pressed={preferences.visibleColumns.includes(column)}
                  key={column}
                  onClick={() => toggleColumn(column)}
                  type="button"
                >
                  {optionalColumnLabels[column]}
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
