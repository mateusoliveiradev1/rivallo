import { Icon, type GenericIconName } from '@rivallo/icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import { Button } from '../ui/primitives/actions.js';
import { Skeleton } from '../ui/primitives/feedback.js';
import { loadMatchday, playNextMatch, saveMatchdayLineup } from './client.js';
import type { Formation, MatchResult, MatchdayState, Player, TacticalApproach } from './types.js';

import './matchday.css';

interface MatchdayScreenProps {
  readonly serviceOwnership: 'owned' | 'reused';
}

interface NavigationItem {
  readonly label: string;
  readonly icon: GenericIconName;
  readonly active?: boolean;
  readonly badge?: string;
}

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

const approachCopy: Record<TacticalApproach, { title: string; description: string }> = {
  balanced: { title: 'Equilibrado', description: 'Ritmo controlado' },
  frontFoot: { title: 'Protagonista', description: 'Pressão e iniciativa' },
  compact: { title: 'Compacto', description: 'Proteção central' },
};

const formationOptions: readonly Formation[] = ['4-3-3', '4-2-3-1', '4-4-2'];

const navigationGroups: readonly (readonly NavigationItem[])[] = [
  [
    { label: 'Início', icon: 'home' },
    { label: 'Caixa de entrada', icon: 'inbox', badge: '3' },
  ],
  [
    { label: 'Elenco', icon: 'people', active: true },
    { label: 'Táticas', icon: 'tactics' },
    { label: 'Dinâmica', icon: 'dynamics' },
    { label: 'Central de dados', icon: 'data-hub' },
    { label: 'Observação', icon: 'scouting' },
    { label: 'Transferências', icon: 'transfers' },
  ],
  [
    { label: 'Clube', icon: 'club' },
    { label: 'Comissão técnica', icon: 'staff' },
    { label: 'Finanças', icon: 'finances' },
  ],
  [
    { label: 'Calendário', icon: 'schedule' },
    { label: 'Competições', icon: 'competitions' },
    { label: 'Relatórios', icon: 'reports' },
  ],
];

const resultLabel = (result: MatchResult) => {
  if (result.homeGoals > result.awayGoals) return 'Vitória';
  if (result.homeGoals < result.awayGoals) return 'Derrota';
  return 'Empate';
};

const initials = (name: string) =>
  name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('');

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
  const [squadFilter, setSquadFilter] = useState<'all' | 'selected' | 'reserve'>('all');
  const [positionFilter, setPositionFilter] = useState<'all' | Player['position']>('all');
  const resultDialogRef = useRef<HTMLDialogElement>(null);
  const resultReturnFocusRef = useRef<HTMLButtonElement>(null);

  const syncDraft = (nextState: MatchdayState) => {
    setState(nextState);
    setSelectedIds(
      nextState.players.filter((player) => player.selected).map((player) => player.id),
    );
    setFormation(nextState.formation);
    setApproach(nextState.approach);
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
    return state.players.filter((player) => {
      const selected = selectedIds.includes(player.id);
      const matchesView =
        squadFilter === 'all' ||
        (squadFilter === 'selected' && selected) ||
        (squadFilter === 'reserve' && !selected);
      const matchesPosition = positionFilter === 'all' || player.position === positionFilter;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        player.name.toLocaleLowerCase('pt-BR').includes(normalizedQuery) ||
        positionLabels[player.position].toLocaleLowerCase('pt-BR').includes(normalizedQuery);
      return matchesView && matchesPosition && matchesQuery;
    });
  }, [positionFilter, query, selectedIds, squadFilter, state]);

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
  const averageRating = Math.round(
    selectedPlayers.reduce((total, player) => total + player.rating, 0) /
      Math.max(selectedPlayers.length, 1),
  );
  const averageCondition = Math.round(
    selectedPlayers.reduce((total, player) => total + player.condition, 0) /
      Math.max(selectedPlayers.length, 1),
  );

  return (
    <div className="manager-shell">
      <aside className="manager-sidebar">
        <div className="manager-brand">
          <span className="manager-brand__mark" aria-hidden="true">
            R
          </span>
          <span className="manager-brand__word">Rivallo</span>
        </div>

        <nav aria-label="Navegação principal" className="manager-navigation">
          {navigationGroups.map((group, groupIndex) => (
            <div className="manager-navigation__group" key={groupIndex}>
              {group.map((item) => (
                <button
                  aria-current={item.active ? 'page' : undefined}
                  className="manager-navigation__item"
                  disabled={!item.active}
                  key={item.label}
                  title={item.active ? item.label : `${item.label} — em breve`}
                  type="button"
                >
                  <Icon name={item.icon} size={20} />
                  <span>{item.label}</span>
                  {item.badge && <b>{item.badge}</b>}
                  {!item.active && <i>Em breve</i>}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="manager-sidebar__footer">
          <button disabled title="Configurações — em breve" type="button">
            <Icon name="settings" size={20} />
            <span>Configurações</span>
          </button>
          <button aria-label="Recolher navegação" disabled title="Em breve" type="button">
            <Icon name="collapse-navigation" size={20} />
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
              <span>ELENCO</span>
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
              <span>Visualização</span>
              <select
                aria-label="Visualização do elenco"
                onChange={(event) => setSquadFilter(event.target.value as typeof squadFilter)}
                value={squadFilter}
              >
                <option value="all">Todos</option>
                <option value="selected">Titulares</option>
                <option value="reserve">Reservas</option>
              </select>
            </label>
            <label className="toolbar-control">
              <span>Posição</span>
              <select
                aria-label="Filtrar por posição"
                onChange={(event) => setPositionFilter(event.target.value as typeof positionFilter)}
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
            <span className="squad-toolbar__summary">
              <strong>{selectedCount}/11</strong> no time titular
            </span>
            <button
              className="toolbar-disabled"
              disabled
              title="Colunas personalizadas — em breve"
              type="button"
            >
              <Icon name="columns" size={16} /> Colunas
            </button>
          </section>

          <div className="squad-workspace">
            <section className="squad-list" aria-labelledby="players-title">
              <header className="squad-list__header">
                <div>
                  <h2 id="players-title">{visiblePlayers.length} jogadores</h2>
                  <span>{state.club.name} · plantel principal</span>
                </div>
                <span className="squad-list__legend">
                  <i /> Titular
                </span>
              </header>
              <div className="squad-table-wrap">
                <table className="squad-table">
                  <thead>
                    <tr>
                      <th scope="col">XI</th>
                      <th scope="col">#</th>
                      <th scope="col">Jogador</th>
                      <th scope="col">Pos.</th>
                      <th scope="col">Idade</th>
                      <th scope="col">OVR</th>
                      <th scope="col">Condição</th>
                      <th scope="col">Importância</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visiblePlayers.map((player) => {
                      const selected = selectedIds.includes(player.id);
                      const squadNumber =
                        state.players.findIndex((candidate) => candidate.id === player.id) + 1;
                      const importance = selected
                        ? 'Titular'
                        : player.rating >= 75
                          ? 'Rotação'
                          : 'Opção';
                      return (
                        <tr data-selected={selected || undefined} key={player.id}>
                          <td>
                            <input
                              aria-label={`${selected ? 'Retirar' : 'Escalar'} ${player.name}`}
                              checked={selected}
                              onChange={() => togglePlayer(player)}
                              type="checkbox"
                            />
                          </td>
                          <td className="squad-number">{squadNumber}</td>
                          <th scope="row">
                            <span className="player-avatar" aria-hidden="true">
                              {initials(player.name)}
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
                          <td>{player.age}</td>
                          <td>
                            <strong className="rating-value">{player.rating}</strong>
                          </td>
                          <td>
                            <span className="condition-cell">
                              <Icon name="condition" size={16} />
                              <strong>{player.condition}%</strong>
                            </span>
                          </td>
                          <td>
                            <span className="importance-label" data-level={importance}>
                              {importance}
                            </span>
                          </td>
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
                <div>
                  <span>VISÃO TÁTICA</span>
                  <h2 id="tactical-title">Onze inicial</h2>
                </div>
                <label>
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
              </header>

              <div className="tactical-zone__body">
                <ol
                  className="tactical-pitch"
                  data-formation={formation}
                  aria-label={`Escalação no ${formation}`}
                >
                  {selectedPlayers.map((player) => (
                    <li className="pitch-player" key={player.id}>
                      <button
                        onClick={() => togglePlayer(player)}
                        title={`Retirar ${player.name} dos titulares`}
                      >
                        <span className="pitch-player__figure">
                          <i aria-hidden="true" />
                          <b>
                            {state.players.findIndex((candidate) => candidate.id === player.id) + 1}
                          </b>
                        </span>
                        <span className="pitch-player__name">{player.shortName}</span>
                        <small>{positionLabels[player.position]}</small>
                      </button>
                    </li>
                  ))}
                </ol>

                <aside aria-label="Ferramentas táticas" className="tactical-tools">
                  <div aria-current="page">
                    <Icon name="tactics" size={20} />
                    <span>Tática</span>
                  </div>
                  <button disabled title="Análise — em breve" type="button">
                    <Icon name="analysis" size={20} />
                    <span>Análise</span>
                  </button>
                  <button disabled title="Instruções — em breve" type="button">
                    <Icon name="instructions" size={20} />
                    <span>Instruções</span>
                  </button>
                  <button disabled title="Oposição — em breve" type="button">
                    <Icon name="opposition" size={20} />
                    <span>Oposição</span>
                  </button>
                </aside>
              </div>

              <footer className="tactical-zone__footer">
                <div className="tactical-metrics">
                  <span>
                    <small>OVR DO XI</small>
                    <strong>{averageRating}</strong>
                  </span>
                  <span>
                    <small>CONDIÇÃO</small>
                    <strong>{averageCondition}%</strong>
                  </span>
                  <span>
                    <small>FORMAÇÃO</small>
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
