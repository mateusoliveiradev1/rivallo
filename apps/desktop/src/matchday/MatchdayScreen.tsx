import { Icon } from '@rivallo/icons';
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
  balanced: { title: 'Equilibrado', description: 'Ritmo controlado e ocupação estável.' },
  frontFoot: { title: 'Protagonista', description: 'Pressão mais alta e maior volume ofensivo.' },
  compact: { title: 'Compacto', description: 'Bloco mais baixo e proteção do espaço central.' },
};

const formationOptions: readonly Formation[] = ['4-3-3', '4-2-3-1', '4-4-2'];

const resultLabel = (result: MatchResult) => {
  if (result.homeGoals > result.awayGoals) return 'Vitória';
  if (result.homeGoals < result.awayGoals) return 'Derrota';
  return 'Empate';
};

export function MatchdayScreen({ serviceOwnership }: MatchdayScreenProps) {
  const [state, setState] = useState<MatchdayState | null>(null);
  const [selectedIds, setSelectedIds] = useState<readonly string[]>([]);
  const [formation, setFormation] = useState<Formation>('4-3-3');
  const [approach, setApproach] = useState<TacticalApproach>('balanced');
  const [busyAction, setBusyAction] = useState<'save' | 'play' | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [resultOpen, setResultOpen] = useState(false);
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

  const closeResult = () => {
    const dialog = resultDialogRef.current;
    if (dialog && typeof dialog.close === 'function') dialog.close();
    else restoreResultFocus();
  };

  const restoreResultFocus = () => {
    setResultOpen(false);
    window.requestAnimationFrame(() => resultReturnFocusRef.current?.focus());
  };

  const selectedPlayers = useMemo(
    () => state?.players.filter((player) => selectedIds.includes(player.id)) ?? [],
    [selectedIds, state],
  );
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

  return (
    <div className="game-shell">
      <aside className="game-nav">
        <div className="game-brand">
          <span className="game-brand__mark" aria-hidden="true">
            R
          </span>
          <span>
            <strong>Rivallo</strong>
            <small>First playable</small>
          </span>
        </div>

        <nav aria-label="Navegação principal" className="game-nav__items">
          <a aria-current="page" className="game-nav__item game-nav__item--active" href="#matchday">
            <Icon name="workspace" size={20} />
            Dia de jogo
          </a>
          <a className="game-nav__item" href="#squad">
            <Icon name="people" size={20} />
            Elenco
          </a>
          <span aria-disabled="true" className="game-nav__item game-nav__item--disabled">
            <Icon name="schedule" size={20} />
            Calendário
            <small>Em breve</small>
          </span>
        </nav>

        <div className="game-nav__club">
          <span
            className="club-crest"
            style={{ '--club-color': state.club.primaryColor } as CSSProperties}
          >
            {state.club.shortName}
          </span>
          <span>
            <strong>{state.club.name}</strong>
            <small>{state.club.city}</small>
          </span>
        </div>
      </aside>

      <div className="game-surface">
        <header className="game-topbar">
          <div>
            <span className="game-topbar__competition">Liga Horizonte · Rodada {state.round}</span>
            <strong>
              {state.club.shortName} × {state.opponent.shortName}
            </strong>
          </div>
          <div className="game-topbar__record" aria-label="Campanha na temporada">
            <span>
              <b>{state.record.points}</b> pts
            </span>
            <span>{state.record.wins}V</span>
            <span>{state.record.draws}E</span>
            <span>{state.record.losses}D</span>
          </div>
          <span
            className="service-chip"
            title={`Serviço local ${serviceOwnership === 'owned' ? 'iniciado pelo Rivallo' : 'reutilizado'}`}
          >
            <span aria-hidden="true" /> Local
          </span>
        </header>

        <main className="matchday" id="matchday">
          <header className="matchday-header">
            <div>
              <p>Próximo compromisso</p>
              <h1>Prepare o Aurora para a rodada {state.round}</h1>
              <span>Casa · Estádio do Farol · Condições estáveis</span>
            </div>
            <div
              className="fixture-lockup"
              aria-label={`${state.club.name} contra ${state.opponent.name}`}
            >
              <span className="fixture-club">
                <span
                  className="club-crest club-crest--large"
                  style={{ '--club-color': state.club.primaryColor } as CSSProperties}
                >
                  {state.club.shortName}
                </span>
                <strong>{state.club.shortName}</strong>
              </span>
              <span className="fixture-lockup__versus">20:30</span>
              <span className="fixture-club">
                <span
                  className="club-crest club-crest--large"
                  style={{ '--club-color': state.opponent.primaryColor } as CSSProperties}
                >
                  {state.opponent.shortName}
                </span>
                <strong>{state.opponent.shortName}</strong>
              </span>
            </div>
          </header>

          <div className="matchday-workspace">
            <section className="lineup-panel" aria-labelledby="lineup-title">
              <header className="panel-header">
                <div>
                  <h2 id="lineup-title">Onze inicial</h2>
                  <p>{selectedCount}/11 jogadores selecionados</p>
                </div>
                <label className="compact-select">
                  <span>Formação</span>
                  <select
                    value={formation}
                    onChange={(event) => setFormation(event.target.value as Formation)}
                  >
                    {formationOptions.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </label>
              </header>

              <ol
                className="tactical-board"
                data-formation={formation}
                aria-label={`Escalação no ${formation}`}
              >
                {selectedPlayers.map((player) => (
                  <li className="tactical-player" data-position={player.position} key={player.id}>
                    <button
                      onClick={() => togglePlayer(player)}
                      title={`Retirar ${player.name} dos titulares`}
                    >
                      <span>{positionLabels[player.position]}</span>
                      <strong>{player.shortName}</strong>
                    </button>
                  </li>
                ))}
              </ol>

              <div className="tactical-summary">
                <span>
                  OVR do XI{' '}
                  <strong>
                    {Math.round(
                      selectedPlayers.reduce((total, player) => total + player.rating, 0) /
                        Math.max(selectedPlayers.length, 1),
                    )}
                  </strong>
                </span>
                <span>
                  Condição{' '}
                  <strong>
                    {Math.round(
                      selectedPlayers.reduce((total, player) => total + player.condition, 0) /
                        Math.max(selectedPlayers.length, 1),
                    )}
                    %
                  </strong>
                </span>
              </div>
            </section>

            <section className="squad-panel" id="squad" aria-labelledby="squad-title">
              <header className="panel-header">
                <div>
                  <h2 id="squad-title">Elenco disponível</h2>
                  <p>Escolha titulares diretamente na lista.</p>
                </div>
              </header>
              <div className="squad-table-wrap">
                <table className="squad-table">
                  <thead>
                    <tr>
                      <th scope="col">XI</th>
                      <th scope="col">Jogador</th>
                      <th scope="col">Pos.</th>
                      <th scope="col">Idade</th>
                      <th scope="col">OVR</th>
                      <th scope="col">Condição</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.players.map((player) => {
                      const selected = selectedIds.includes(player.id);
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
                          <th scope="row">
                            <span className="player-name">{player.name}</span>
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
                            <span className="condition-value">{player.condition}%</span>
                            <span className="condition-track" aria-hidden="true">
                              <span style={{ width: `${player.condition}%` }} />
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <section className="approach-panel" aria-labelledby="approach-title">
            <header>
              <h2 id="approach-title">Estratégia</h2>
              <p>Uma escolha simples que já influencia a simulação.</p>
            </header>
            <div className="approach-options">
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
            </div>
            <div className="matchday-actions">
              <span className="matchday-feedback" role="status" aria-live="polite">
                {error ||
                  message ||
                  (dirty ? 'Alterações ainda não salvas.' : 'Escalação salva localmente.')}
              </span>
              <Button
                loading={busyAction === 'save'}
                loadingLabel="Salvando…"
                onClick={() => void saveLineup()}
                variant="secondary"
              >
                Salvar escalação
              </Button>
              <Button
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
                Jogar partida
              </Button>
            </div>
          </section>
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
    </div>
  );
}
