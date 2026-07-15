import { Icon, type GenericIconName } from '@rivallo/icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';

import { Button } from '../ui/primitives/actions.js';
import { Skeleton } from '../ui/primitives/feedback.js';
import { loadMatchday, playNextMatch, saveMatchdayLineup } from './client.js';
import type { Formation, MatchResult, MatchdayState, Player, TacticalApproach } from './types.js';

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

type Density = 'compact' | 'standard' | 'comfortable';
type OptionalColumn = 'age' | 'rating' | 'condition' | 'importance';
type WorkspaceView = 'split' | 'squad' | 'tactics';
type SquadFilter = 'all' | 'selected' | 'reserve';
type SortMode = 'default' | 'rating' | 'condition' | 'age';
type RoleFilter = 'all' | 'goalkeepers' | 'defenders' | 'midfielders' | 'attackers';
type StatusFilter = 'all' | 'ready' | 'attention';
type TacticalTool = 'analysis' | 'tactics' | 'instructions' | 'opposition';
type PitchMode = 'roles' | 'condition';

interface UiPreferences {
  readonly sidebarCollapsed: boolean;
  readonly density: Density;
  readonly visibleColumns: readonly OptionalColumn[];
  readonly tableShare: number;
  readonly workspaceView: WorkspaceView;
}

const UI_PREFERENCES_KEY = 'rivallo.squad-ui.v2';
const optionalColumns: readonly OptionalColumn[] = ['age', 'rating', 'condition', 'importance'];
const optionalColumnLabels: Record<OptionalColumn, string> = {
  age: 'Idade',
  rating: 'OVR',
  condition: 'Condição',
  importance: 'Importância',
};

const defaultPreferences = (): UiPreferences => ({
  sidebarCollapsed: typeof window !== 'undefined' && window.innerWidth < 1240,
  density: 'compact',
  visibleColumns: optionalColumns,
  tableShare: 59,
  workspaceView: 'split',
});

const readPreferences = (): UiPreferences => {
  const defaults = defaultPreferences();
  try {
    const raw = window.localStorage.getItem(UI_PREFERENCES_KEY);
    if (!raw) return defaults;
    const stored = JSON.parse(raw) as Partial<UiPreferences>;
    const columns = Array.isArray(stored.visibleColumns)
      ? stored.visibleColumns.filter((column): column is OptionalColumn =>
          optionalColumns.includes(column as OptionalColumn),
        )
      : defaults.visibleColumns;
    return {
      sidebarCollapsed:
        typeof stored.sidebarCollapsed === 'boolean'
          ? stored.sidebarCollapsed
          : defaults.sidebarCollapsed,
      density: ['compact', 'standard', 'comfortable'].includes(String(stored.density))
        ? (stored.density as Density)
        : defaults.density,
      visibleColumns: columns,
      tableShare:
        typeof stored.tableShare === 'number'
          ? Math.min(68, Math.max(48, stored.tableShare))
          : defaults.tableShare,
      workspaceView: ['split', 'squad', 'tactics'].includes(String(stored.workspaceView))
        ? (stored.workspaceView as WorkspaceView)
        : defaults.workspaceView,
    };
  } catch {
    return defaults;
  }
};

const positionLabels: Record<Player['position'], string> = {
  GK: 'GOL',
  RB: 'LD',
  CB: 'ZAG',
  LB: 'LE',
  DM: 'VOL',
  CM: 'MC',
  AM: 'MEI',
  RW: 'PD',
  LW: 'PE',
  ST: 'ATA',
};

const tacticalRoleLabels: Record<Player['position'], string> = {
  GK: 'GOL · Apoio',
  RB: 'LAT · Apoio',
  CB: 'ZAG · Defesa',
  LB: 'LAT · Apoio',
  DM: 'VOL · Suporte',
  CM: 'MC · Suporte',
  AM: 'MEI · Ataque',
  RW: 'EXT · Ataque',
  LW: 'EXT · Ataque',
  ST: 'ATA · Ataque',
};

const approachCopy: Record<TacticalApproach, { title: string; description: string }> = {
  balanced: { title: 'Equilibrado', description: 'Ritmo controlado e ocupação estável' },
  frontFoot: { title: 'Protagonista', description: 'Pressão alta e iniciativa com a bola' },
  compact: { title: 'Compacto', description: 'Proteção do corredor central e bloco médio' },
};

const formationOptions: readonly Formation[] = ['4-3-3', '4-2-3-1', '4-4-2'];

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

const rolePositions: Record<Exclude<RoleFilter, 'all'>, readonly Player['position'][]> = {
  goalkeepers: ['GK'],
  defenders: ['RB', 'CB', 'LB'],
  midfielders: ['DM', 'CM', 'AM'],
  attackers: ['RW', 'LW', 'ST'],
};

const resultLabel = (result: MatchResult) => {
  if (result.homeGoals > result.awayGoals) return 'Vitória';
  if (result.homeGoals < result.awayGoals) return 'Derrota';
  return 'Empate';
};

function RivalloMark({ compact = false }: { readonly compact?: boolean }) {
  return (
    <span
      aria-label="Rivallo"
      className="rivallo-mark"
      data-compact={compact || undefined}
      role="img"
    >
      <svg aria-hidden="true" viewBox="0 0 48 58">
        <path className="rivallo-mark__crown" d="M13 10 17 5l7 5 7-5 4 5" />
        <path className="rivallo-mark__shield" d="M8 14h32v19c0 10-7 16-16 20C15 49 8 43 8 33Z" />
        <path className="rivallo-mark__inner" d="M14 20h20v12c0 6-4 10-10 13-6-3-10-7-10-13Z" />
        <text x="24" y="37" textAnchor="middle">
          R
        </text>
      </svg>
      {!compact && <strong>Rivallo</strong>}
    </span>
  );
}

interface TacticalPitchProps {
  readonly formation: Formation;
  readonly mode: PitchMode;
  readonly players: readonly Player[];
  readonly squad: readonly Player[];
  readonly onRemove: (player: Player) => void;
  readonly onFocus: (player: Player) => void;
}

function TacticalPitch({ formation, mode, players, squad, onRemove, onFocus }: TacticalPitchProps) {
  return (
    <ol
      className="tactical-pitch"
      data-formation={formation}
      aria-label={`Escalação no ${formation}`}
    >
      <li className="pitch-markings" aria-hidden="true">
        <i className="pitch-markings__half" />
        <i className="pitch-markings__circle" />
        <i className="pitch-markings__spot" />
        <i className="pitch-markings__box pitch-markings__box--north" />
        <i className="pitch-markings__six pitch-markings__six--north" />
        <i className="pitch-markings__goal pitch-markings__goal--north" />
        <i className="pitch-markings__box pitch-markings__box--south" />
        <i className="pitch-markings__six pitch-markings__six--south" />
        <i className="pitch-markings__goal pitch-markings__goal--south" />
      </li>
      {players.map((player, index) => (
        <li
          className="pitch-player"
          data-goalkeeper={player.position === 'GK' || undefined}
          data-slot={index + 1}
          key={player.id}
        >
          <button
            onClick={() => {
              onFocus(player);
              onRemove(player);
            }}
            title={`Retirar ${player.name} dos titulares`}
            type="button"
          >
            <span className="pitch-player__figure" aria-hidden="true">
              <i />
              <b>{squad.findIndex((candidate) => candidate.id === player.id) + 1}</b>
            </span>
            <strong>{player.shortName}</strong>
            <small>
              {mode === 'condition'
                ? `${player.condition}% pronto`
                : tacticalRoleLabels[player.position]}
            </small>
          </button>
        </li>
      ))}
    </ol>
  );
}

export function MatchdayScreen({ serviceOwnership }: MatchdayScreenProps) {
  const [state, setState] = useState<MatchdayState | null>(null);
  const [selectedIds, setSelectedIds] = useState<readonly string[]>([]);
  const [formation, setFormation] = useState<Formation>('4-3-3');
  const [approach, setApproach] = useState<TacticalApproach>('balanced');
  const [busyAction, setBusyAction] = useState<'save' | 'play' | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [resultOpen, setResultOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [squadFilter, setSquadFilter] = useState<SquadFilter>('all');
  const [sortMode, setSortMode] = useState<SortMode>('default');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [positionFilter, setPositionFilter] = useState<'all' | Player['position']>('all');
  const [positionFilterVisible, setPositionFilterVisible] = useState(false);
  const [focusedPlayerId, setFocusedPlayerId] = useState<string | null>(null);
  const [activeTacticalTool, setActiveTacticalTool] = useState<TacticalTool>('tactics');
  const [pitchMode, setPitchMode] = useState<PitchMode>('roles');
  const [preferences, setPreferences] = useState<UiPreferences>(readPreferences);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const resultDialogRef = useRef<HTMLDialogElement>(null);
  const resultReturnFocusRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(UI_PREFERENCES_KEY, JSON.stringify(preferences));
    } catch {
      // Preferences remain available for this session when storage is unavailable.
    }
  }, [preferences]);

  const syncDraft = (nextState: MatchdayState) => {
    setState(nextState);
    setSelectedIds(
      nextState.players.filter((player) => player.selected).map((player) => player.id),
    );
    setFormation(nextState.formation);
    setApproach(nextState.approach);
    setFocusedPlayerId(
      (current) => current ?? nextState.players.find((player) => player.selected)?.id ?? null,
    );
  };

  useEffect(() => {
    let active = true;
    void loadMatchday()
      .then((nextState) => {
        if (active) syncDraft(nextState);
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

  const restoreResultFocus = () => {
    setResultOpen(false);
    window.requestAnimationFrame(() => resultReturnFocusRef.current?.focus());
  };

  const closeResult = () => {
    const dialog = resultDialogRef.current;
    if (dialog && typeof dialog.close === 'function') dialog.close();
    else restoreResultFocus();
  };

  const selectedPlayers = useMemo(
    () => state?.players.filter((player) => selectedIds.includes(player.id)) ?? [],
    [selectedIds, state],
  );

  const visiblePlayers = useMemo(() => {
    if (!state) return [];
    const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR');
    const players = state.players.filter((player) => {
      const selected = selectedIds.includes(player.id);
      const matchesSquad =
        squadFilter === 'all' ||
        (squadFilter === 'selected' && selected) ||
        (squadFilter === 'reserve' && !selected);
      const matchesRole =
        roleFilter === 'all' || rolePositions[roleFilter].includes(player.position);
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

    return [...players].sort((first, second) => {
      if (sortMode === 'rating') return second.rating - first.rating;
      if (sortMode === 'condition') return second.condition - first.condition;
      if (sortMode === 'age') return first.age - second.age;
      return state.players.indexOf(first) - state.players.indexOf(second);
    });
  }, [
    positionFilter,
    positionFilterVisible,
    query,
    roleFilter,
    selectedIds,
    sortMode,
    squadFilter,
    state,
    statusFilter,
  ]);

  const dirty = Boolean(
    state &&
    (formation !== state.formation ||
      approach !== state.approach ||
      selectedIds.join('|') !==
        state.players
          .filter((player) => player.selected)
          .map((player) => player.id)
          .join('|')),
  );

  const togglePlayer = (player: Player) => {
    setMessage('');
    setError('');
    setSelectedIds((current) => {
      if (current.includes(player.id)) return current.filter((id) => id !== player.id);
      if (current.length >= 11) {
        setError('Retire um titular antes de adicionar outro jogador.');
        return current;
      }
      return [...current, player.id];
    });
  };

  const saveLineup = async () => {
    setBusyAction('save');
    setMessage('');
    setError('');
    try {
      const nextState = await saveMatchdayLineup(selectedIds, formation, approach);
      syncDraft(nextState);
      setMessage('Escalação salva no dispositivo.');
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
      syncDraft(savedState);
      const nextState = await playNextMatch();
      syncDraft(nextState);
      setResultOpen(true);
      setMessage(`Rodada ${nextState.round - 1} concluída e salva.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusyAction(null);
    }
  };

  const clearFilters = () => {
    setQuery('');
    setSquadFilter('all');
    setSortMode('default');
    setRoleFilter('all');
    setStatusFilter('all');
    setPositionFilter('all');
    setPositionFilterVisible(false);
  };

  const updatePreference = <Key extends keyof UiPreferences>(key: Key, value: UiPreferences[Key]) =>
    setPreferences((current) => ({ ...current, [key]: value }));

  const toggleColumn = (column: OptionalColumn) => {
    const visible = preferences.visibleColumns.includes(column);
    updatePreference(
      'visibleColumns',
      visible
        ? preferences.visibleColumns.filter((candidate) => candidate !== column)
        : [...preferences.visibleColumns, column],
    );
  };

  const resetPreferences = () => setPreferences(defaultPreferences());

  const focusRowFromKeyboard = (event: KeyboardEvent<HTMLTableRowElement>, player: Player) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    setFocusedPlayerId(player.id);
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

  const selectedCount = selectedIds.length;
  const canPlay = selectedCount === 11 && busyAction === null;
  const lastResult = state.lastResult;
  const focusedPlayer =
    state.players.find((player) => player.id === focusedPlayerId) ?? state.players[0];
  const averageRating = Math.round(
    selectedPlayers.reduce((total, player) => total + player.rating, 0) /
      Math.max(selectedPlayers.length, 1),
  );
  const averageCondition = Math.round(
    selectedPlayers.reduce((total, player) => total + player.condition, 0) /
      Math.max(selectedPlayers.length, 1),
  );
  const readiness =
    selectedCount === 11 ? Math.round(averageCondition * 0.7 + averageRating * 0.3) : 0;
  const hasActiveFilters =
    query.length > 0 ||
    squadFilter !== 'all' ||
    sortMode !== 'default' ||
    roleFilter !== 'all' ||
    statusFilter !== 'all' ||
    positionFilterVisible;
  const activeNavigation = preferences.workspaceView === 'tactics' ? 'tactics' : 'squad';
  const workspaceStyle = {
    '--table-share': `${preferences.tableShare}%`,
  } as CSSProperties;

  return (
    <div
      className="manager-shell"
      data-sidebar-collapsed={preferences.sidebarCollapsed || undefined}
    >
      <aside className="manager-sidebar">
        <div className="manager-brand">
          <RivalloMark compact={preferences.sidebarCollapsed} />
        </div>

        <nav aria-label="Navegação principal" className="manager-navigation">
          {navigationGroups.map((group, groupIndex) => (
            <div className="manager-navigation__group" key={groupIndex}>
              {group.map((item) => {
                const active = item.id === activeNavigation;
                return (
                  <button
                    aria-current={active ? 'page' : undefined}
                    aria-label={preferences.sidebarCollapsed ? item.label : undefined}
                    className="manager-navigation__item"
                    disabled={!item.available}
                    key={item.id}
                    onClick={() => {
                      if (item.id === 'squad') updatePreference('workspaceView', 'split');
                      if (item.id === 'tactics') updatePreference('workspaceView', 'tactics');
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

        <div className="manager-sidebar__footer">
          <button onClick={() => setSettingsOpen((open) => !open)} type="button">
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
        <header className="manager-topbar">
          <label className="global-search">
            <Icon name="search" size={16} />
            <span className="sr-only">Buscar jogador no elenco</span>
            <input
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar jogador"
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
        </header>

        <main className="squad-screen">
          <header className="squad-screen__header">
            <div>
              <span>‹ &nbsp; ELENCO</span>
              <h1>Visão geral do elenco</h1>
            </div>
            <div
              className="next-fixture"
              aria-label={`${state.club.name} contra ${state.opponent.name}`}
            >
              <span>Próximo jogo · Rodada {state.round}</span>
              <strong>
                {state.club.shortName} <i>20:30</i> {state.opponent.shortName}
              </strong>
            </div>
          </header>

          <nav aria-label="Seções do elenco" className="squad-tabs">
            <button aria-current="page" type="button">
              Jogadores
            </button>
            <button disabled title="Em breve" type="button">
              Internacional
            </button>
            <button disabled title="Em breve" type="button">
              Empréstimos
            </button>
            <button disabled title="Em breve" type="button">
              Numeração
            </button>
            <button disabled title="Em breve" type="button">
              Planejamento
            </button>
          </nav>

          <section aria-label="Filtros do elenco" className="squad-toolbar">
            <label className="toolbar-control toolbar-control--accent">
              <Icon name="filter" size={16} />
              <span>Filtro rápido</span>
              <select
                aria-label="Filtro rápido"
                onChange={(event) => setSquadFilter(event.target.value as SquadFilter)}
                value={squadFilter}
              >
                <option value="all">Todos</option>
                <option value="selected">Titulares</option>
                <option value="reserve">Reservas</option>
              </select>
            </label>
            <label className="toolbar-control">
              <span>Visão</span>
              <select
                aria-label="Ordenar elenco"
                onChange={(event) => setSortMode(event.target.value as SortMode)}
                value={sortMode}
              >
                <option value="default">Padrão</option>
                <option value="rating">Maior OVR</option>
                <option value="condition">Melhor condição</option>
                <option value="age">Mais jovens</option>
              </select>
            </label>
            <label className="toolbar-control">
              <span>Setor</span>
              <select
                aria-label="Filtrar por setor"
                onChange={(event) => setRoleFilter(event.target.value as RoleFilter)}
                value={roleFilter}
              >
                <option value="all">Todos</option>
                <option value="goalkeepers">Goleiros</option>
                <option value="defenders">Defesa</option>
                <option value="midfielders">Meio-campo</option>
                <option value="attackers">Ataque</option>
              </select>
            </label>
            <label className="toolbar-control">
              <span>Status</span>
              <select
                aria-label="Filtrar por condição"
                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                value={statusFilter}
              >
                <option value="all">Todos</option>
                <option value="ready">Prontos</option>
                <option value="attention">Atenção</option>
              </select>
            </label>
            {positionFilterVisible && (
              <label className="toolbar-control toolbar-control--removable">
                <span>Posição</span>
                <select
                  aria-label="Filtrar por posição"
                  onChange={(event) =>
                    setPositionFilter(event.target.value as typeof positionFilter)
                  }
                  value={positionFilter}
                >
                  <option value="all">Todas</option>
                  {Object.entries(positionLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button
              className="toolbar-button"
              disabled={!hasActiveFilters}
              onClick={clearFilters}
              type="button"
            >
              <Icon name="close" size={16} />
              Limpar
            </button>
            <button
              className="toolbar-button toolbar-button--primary"
              onClick={() => {
                if (positionFilterVisible) setPositionFilter('all');
                setPositionFilterVisible((visible) => !visible);
              }}
              type="button"
            >
              <Icon name={positionFilterVisible ? 'close' : 'add'} size={16} />
              {positionFilterVisible ? 'Remover filtro' : 'Adicionar filtro'}
            </button>
          </section>

          <div
            className="squad-workspace"
            data-density={preferences.density}
            data-layout={preferences.workspaceView}
            style={workspaceStyle}
          >
            <section className="squad-list" aria-labelledby="players-title">
              <header className="squad-list__header">
                <div>
                  <h2 id="players-title">{visiblePlayers.length} jogadores</h2>
                  <span>{state.club.name} · plantel principal</span>
                </div>
                <div className="table-personalization">
                  <span>Densidade</span>
                  {(['compact', 'standard', 'comfortable'] as const).map((density) => (
                    <button
                      aria-label={`Densidade ${density === 'compact' ? 'compacta' : density === 'standard' ? 'padrão' : 'confortável'}`}
                      aria-pressed={preferences.density === density}
                      className="density-button"
                      key={density}
                      onClick={() => updatePreference('density', density)}
                      type="button"
                    >
                      <i data-lines={density} />
                    </button>
                  ))}
                  <details className="column-picker">
                    <summary>
                      <Icon name="columns" size={16} />
                      Colunas
                    </summary>
                    <div className="column-picker__menu">
                      <strong>Colunas visíveis</strong>
                      {optionalColumns.map((column) => (
                        <button
                          aria-pressed={preferences.visibleColumns.includes(column)}
                          key={column}
                          onClick={() => toggleColumn(column)}
                          type="button"
                        >
                          <span>{optionalColumnLabels[column]}</span>
                          <b>
                            {preferences.visibleColumns.includes(column) ? 'Visível' : 'Oculta'}
                          </b>
                        </button>
                      ))}
                    </div>
                  </details>
                  <button className="reset-view" onClick={resetPreferences} type="button">
                    Restaurar
                  </button>
                </div>
              </header>

              <div className="squad-table-wrap">
                <table className="squad-table">
                  <thead>
                    <tr>
                      <th scope="col">INF</th>
                      <th scope="col">#</th>
                      <th scope="col">Jogador</th>
                      <th scope="col">Pos.</th>
                      {preferences.visibleColumns.includes('age') && (
                        <th className="column-age" scope="col">
                          Idade
                        </th>
                      )}
                      {preferences.visibleColumns.includes('rating') && (
                        <th className="column-rating" scope="col">
                          OVR
                        </th>
                      )}
                      {preferences.visibleColumns.includes('condition') && (
                        <th className="column-condition" scope="col">
                          Condição
                        </th>
                      )}
                      {preferences.visibleColumns.includes('importance') && (
                        <th className="column-importance" scope="col">
                          Papel
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {visiblePlayers.map((player) => {
                      const selected = selectedIds.includes(player.id);
                      const focused = player.id === focusedPlayerId;
                      const squadNumber =
                        state.players.findIndex((candidate) => candidate.id === player.id) + 1;
                      const importance = selected
                        ? 'Titular'
                        : player.rating >= 75
                          ? 'Rotação'
                          : 'Opção';
                      return (
                        <tr
                          aria-selected={focused}
                          data-focused={focused || undefined}
                          key={player.id}
                          onClick={() => setFocusedPlayerId(player.id)}
                          onKeyDown={(event) => focusRowFromKeyboard(event, player)}
                          tabIndex={0}
                        >
                          <td>
                            <button
                              aria-label={`${selected ? 'Retirar' : 'Escalar'} ${player.name}`}
                              aria-pressed={selected}
                              className="lineup-toggle"
                              onClick={(event) => {
                                event.stopPropagation();
                                setFocusedPlayerId(player.id);
                                togglePlayer(player);
                              }}
                              title={
                                selected
                                  ? 'Titular — clique para retirar'
                                  : 'Reserva — clique para escalar'
                              }
                              type="button"
                            >
                              {selected ? 'XI' : '+'}
                            </button>
                          </td>
                          <td className="squad-number">{squadNumber}</td>
                          <th scope="row">
                            <span className="player-portrait" aria-hidden="true">
                              <i />
                            </span>
                            <span className="player-identity">
                              <strong>{player.name}</strong>
                              <small>{selected ? 'Time titular' : 'Plantel principal'}</small>
                            </span>
                          </th>
                          <td>
                            <span className="position-badge">
                              {positionLabels[player.position]}
                            </span>
                          </td>
                          {preferences.visibleColumns.includes('age') && (
                            <td className="column-age">{player.age}</td>
                          )}
                          {preferences.visibleColumns.includes('rating') && (
                            <td className="column-rating">
                              <strong className="rating-value">{player.rating}</strong>
                            </td>
                          )}
                          {preferences.visibleColumns.includes('condition') && (
                            <td className="column-condition">
                              <span
                                className="condition-cell"
                                data-attention={player.condition < 90 || undefined}
                              >
                                <i aria-hidden="true">
                                  <b
                                    style={
                                      { '--condition': `${player.condition}%` } as CSSProperties
                                    }
                                  />
                                </i>
                                <strong>{player.condition}%</strong>
                              </span>
                            </td>
                          )}
                          {preferences.visibleColumns.includes('importance') && (
                            <td className="column-importance">
                              <span className="importance-label" data-level={importance}>
                                {importance}
                              </span>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {visiblePlayers.length === 0 && (
                  <div className="squad-empty">
                    <Icon name="search" size={20} />
                    <strong>Nenhum jogador encontrado</strong>
                    <span>Ajuste a busca ou os filtros acima.</span>
                  </div>
                )}
              </div>
              <footer className="squad-list__footer">
                <span>
                  <i className="legend-status legend-status--starter" /> Titular
                </span>
                <span>
                  <i className="legend-status legend-status--rotation" /> Rotação
                </span>
                <span>
                  <i className="legend-status legend-status--option" /> Opção
                </span>
                <span className="squad-list__autosave">
                  {error ||
                    message ||
                    (dirty ? 'Alterações ainda não salvas' : 'Escalação salva localmente')}
                </span>
              </footer>
            </section>

            <section className="tactical-zone" aria-labelledby="tactical-title">
              <header className="tactical-zone__header">
                <label className="tactical-view-select">
                  <span>Visão tática</span>
                  <select
                    aria-label="Visão tática"
                    onChange={(event) => setPitchMode(event.target.value as PitchMode)}
                    value={pitchMode}
                  >
                    <option value="roles">Funções</option>
                    <option value="condition">Condição</option>
                  </select>
                </label>
                <label className="formation-select">
                  <span>Formação</span>
                  <select
                    aria-label="Formação"
                    onChange={(event) => setFormation(event.target.value as Formation)}
                    value={formation}
                  >
                    {formationOptions.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </label>
                <button
                  aria-label="Editar estratégia"
                  className="edit-tactics"
                  onClick={() => setActiveTacticalTool('tactics')}
                  type="button"
                >
                  <Icon name="edit" size={16} />
                </button>
                <div className="readiness-meter">
                  <span>
                    Prontidão <strong>{readiness}%</strong>
                  </span>
                  <i>
                    <b style={{ width: `${readiness}%` }} />
                  </i>
                </div>
              </header>

              <div className="tactical-zone__body">
                <TacticalPitch
                  formation={formation}
                  mode={pitchMode}
                  onFocus={(player) => setFocusedPlayerId(player.id)}
                  onRemove={togglePlayer}
                  players={selectedPlayers}
                  squad={state.players}
                />
                <aside aria-label="Ferramentas táticas" className="tactical-side">
                  <nav className="tactical-tools">
                    {(
                      [
                        ['analysis', 'analysis', 'Análise'],
                        ['tactics', 'tactics', 'Tática'],
                        ['instructions', 'instructions', 'Instruções'],
                        ['opposition', 'opposition', 'Oposição'],
                      ] as const
                    ).map(([tool, icon, label]) => (
                      <button
                        aria-pressed={activeTacticalTool === tool}
                        key={tool}
                        onClick={() => setActiveTacticalTool(tool)}
                        type="button"
                      >
                        <Icon name={icon} size={20} />
                        <span>{label}</span>
                      </button>
                    ))}
                  </nav>
                  <section className="tactical-inspector" aria-live="polite">
                    {activeTacticalTool === 'analysis' && (
                      <>
                        <span>Jogador em foco</span>
                        <h3>{focusedPlayer?.shortName}</h3>
                        <dl>
                          <div>
                            <dt>OVR</dt>
                            <dd>{focusedPlayer?.rating}</dd>
                          </div>
                          <div>
                            <dt>Condição</dt>
                            <dd>{focusedPlayer?.condition}%</dd>
                          </div>
                        </dl>
                      </>
                    )}
                    {activeTacticalTool === 'tactics' && (
                      <>
                        <span>Estilo tático</span>
                        <h3>{approachCopy[approach].title}</h3>
                        <p>{approachCopy[approach].description}.</p>
                      </>
                    )}
                    {activeTacticalTool === 'instructions' && (
                      <>
                        <span>Instruções</span>
                        <h3>{formation}</h3>
                        <ul>
                          <li>Construção apoiada</li>
                          <li>Bloco coordenado</li>
                          <li>Pressão após perda</li>
                        </ul>
                      </>
                    )}
                    {activeTacticalTool === 'opposition' && (
                      <>
                        <span>Próximo rival</span>
                        <h3>{state.opponent.shortName}</h3>
                        <p>
                          {state.opponent.name}, rodada {state.round}.
                        </p>
                      </>
                    )}
                  </section>
                  <button
                    className="team-report-button"
                    onClick={() => setActiveTacticalTool('analysis')}
                    type="button"
                  >
                    <Icon name="reports" size={16} />
                    Relatório
                  </button>
                </aside>
              </div>

              <footer className="tactical-zone__footer">
                <div className="tactical-metrics">
                  <span>
                    <small>OVR do XI</small>
                    <strong>{averageRating}</strong>
                  </span>
                  <span>
                    <small>Condição</small>
                    <strong>{averageCondition}%</strong>
                  </span>
                  <span>
                    <small>Formação</small>
                    <strong>{formation}</strong>
                  </span>
                </div>
                <fieldset className="approach-options">
                  <legend>Estratégia</legend>
                  {(Object.keys(approachCopy) as TacticalApproach[]).map((option) => (
                    <label data-selected={approach === option || undefined} key={option}>
                      <input
                        checked={approach === option}
                        name="approach"
                        onChange={() => setApproach(option)}
                        type="radio"
                      />
                      <span>
                        <strong>{approachCopy[option].title}</strong>
                        <small>{approachCopy[option].description}</small>
                      </span>
                    </label>
                  ))}
                </fieldset>
                <Button
                  className="save-lineup-button"
                  leadingIcon="save"
                  loading={busyAction === 'save'}
                  loadingLabel="Salvando…"
                  onClick={() => void saveLineup()}
                  variant="secondary"
                >
                  Salvar escalação
                </Button>
              </footer>
            </section>
          </div>
        </main>
      </div>

      {settingsOpen && (
        <aside aria-labelledby="personalization-title" className="personalization-panel">
          <header>
            <div>
              <span>Interface</span>
              <h2 id="personalization-title">Personalizar elenco</h2>
            </div>
            <button
              aria-label="Fechar personalização"
              onClick={() => setSettingsOpen(false)}
              type="button"
            >
              <Icon name="close" size={20} />
            </button>
          </header>
          <section>
            <h3>Área de trabalho</h3>
            <div className="preference-options">
              {(['split', 'squad', 'tactics'] as const).map((view) => (
                <button
                  aria-pressed={preferences.workspaceView === view}
                  key={view}
                  onClick={() => updatePreference('workspaceView', view)}
                  type="button"
                >
                  {view === 'split' ? 'Dividida' : view === 'squad' ? 'Só elenco' : 'Só tática'}
                </button>
              ))}
            </div>
          </section>
          <section>
            <h3>Densidade da tabela</h3>
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
            <label htmlFor="table-share">
              Largura do elenco <strong>{preferences.tableShare}%</strong>
            </label>
            <input
              id="table-share"
              max="68"
              min="48"
              onChange={(event) => updatePreference('tableShare', Number(event.target.value))}
              type="range"
              value={preferences.tableShare}
            />
          </section>
          <section>
            <h3>Colunas</h3>
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
            <Button onClick={() => setSettingsOpen(false)} variant="primary">
              Concluir
            </Button>
          </footer>
        </aside>
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

      <span
        className="service-indicator"
        title={`Serviço local ${serviceOwnership === 'owned' ? 'iniciado pelo Rivallo' : 'reutilizado'}`}
      >
        <i /> Local
      </span>
    </div>
  );
}
