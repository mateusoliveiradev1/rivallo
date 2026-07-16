import { Icon } from '@rivallo/icons';
import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, DragEvent, KeyboardEvent } from 'react';

import { Button } from '../ui/primitives/actions.js';
import {
  approachCopy,
  formationOptions,
  positionLabels,
  positionLongLabels,
  type PitchMode,
  type TacticalTool,
} from './matchday-ui.js';
import { PlayerFace } from './PlayerFace.js';
import {
  findDirectionalSlotIndex,
  getFormationSlots,
  getPositionFamiliarity,
  placePlayerInSlot,
  selectedIdsFromSlots,
  type LineupSlots,
  type PitchArrowKey,
} from './tactics-model.js';
import type { Formation, MatchdayState, Player, TacticalApproach } from './types.js';

interface TacticsWorkspaceProps {
  readonly state: MatchdayState;
  readonly formation: Formation;
  readonly approach: TacticalApproach;
  readonly lineupSlots: LineupSlots;
  readonly pitchMode: PitchMode;
  readonly activeTool: TacticalTool;
  readonly focusedPlayerId: string | null;
  readonly dirty: boolean;
  readonly saving: boolean;
  readonly message: string;
  readonly error: string;
  readonly onFormationChange: (formation: Formation) => void;
  readonly onApproachChange: (approach: TacticalApproach) => void;
  readonly onLineupChange: (slots: LineupSlots) => void;
  readonly onPitchModeChange: (mode: PitchMode) => void;
  readonly onActiveToolChange: (tool: TacticalTool) => void;
  readonly onFocusPlayer: (playerId: string) => void;
  readonly onReset: () => void;
  readonly onSave: () => void;
}

interface TeamInstructions {
  readonly buildUp: boolean;
  readonly counterPress: boolean;
  readonly compactBlock: boolean;
  readonly overlap: boolean;
}

const TEAM_INSTRUCTIONS_KEY = 'rivallo.team-instructions.v1';
const defaultInstructions: TeamInstructions = {
  buildUp: true,
  counterPress: true,
  compactBlock: true,
  overlap: false,
};

const pitchPlayerName = (player: Player) => {
  const parts = player.name.trim().split(/\s+/u);
  return parts[parts.length - 1] ?? player.shortName;
};

const compactRole = (role: string) =>
  role.split(' · ')[0]?.replace('Meia central', 'Meia').replace('Meia aberto', 'Meia') ?? role;

const readInstructions = (): TeamInstructions => {
  try {
    const stored = JSON.parse(
      window.localStorage.getItem(TEAM_INSTRUCTIONS_KEY) ?? '{}',
    ) as Partial<TeamInstructions>;
    return {
      buildUp: typeof stored.buildUp === 'boolean' ? stored.buildUp : defaultInstructions.buildUp,
      counterPress:
        typeof stored.counterPress === 'boolean'
          ? stored.counterPress
          : defaultInstructions.counterPress,
      compactBlock:
        typeof stored.compactBlock === 'boolean'
          ? stored.compactBlock
          : defaultInstructions.compactBlock,
      overlap: typeof stored.overlap === 'boolean' ? stored.overlap : defaultInstructions.overlap,
    };
  } catch {
    return defaultInstructions;
  }
};

const instructionOptions: readonly {
  readonly id: keyof TeamInstructions;
  readonly phase: string;
  readonly title: string;
  readonly description: string;
}[] = [
  {
    id: 'buildUp',
    phase: 'Com bola',
    title: 'Construção apoiada',
    description: 'Saída curta com volante oferecendo linha de passe.',
  },
  {
    id: 'overlap',
    phase: 'Com bola',
    title: 'Ultrapassagem dos laterais',
    description: 'Laterais atacam o espaço exterior quando há cobertura.',
  },
  {
    id: 'counterPress',
    phase: 'Transição',
    title: 'Pressão após perda',
    description: 'Reação curta e coordenada ao perder a posse.',
  },
  {
    id: 'compactBlock',
    phase: 'Sem bola',
    title: 'Bloco compacto',
    description: 'Distância curta entre defesa e meio-campo.',
  },
];

const tacticalTools: readonly [
  TacticalTool,
  'analysis' | 'tactics' | 'instructions' | 'opposition',
  string,
][] = [
  ['analysis', 'analysis', 'Análise'],
  ['tactics', 'tactics', 'Estratégia'],
  ['instructions', 'instructions', 'Instruções'],
  ['opposition', 'opposition', 'Oposição'],
];

const average = (values: readonly number[]) =>
  Math.round(values.reduce((total, value) => total + value, 0) / Math.max(values.length, 1));

export function TacticsWorkspace({
  state,
  formation,
  approach,
  lineupSlots,
  pitchMode,
  activeTool,
  focusedPlayerId,
  dirty,
  saving,
  message,
  error,
  onFormationChange,
  onApproachChange,
  onLineupChange,
  onPitchModeChange,
  onActiveToolChange,
  onFocusPlayer,
  onReset,
  onSave,
}: TacticsWorkspaceProps) {
  const [pickedPlayerId, setPickedPlayerId] = useState<string | null>(null);
  const [draggedPlayerId, setDraggedPlayerId] = useState<string | null>(null);
  const [dropSlotIndex, setDropSlotIndex] = useState<number | null>(null);
  const [interactionMessage, setInteractionMessage] = useState('');
  const [instructions, setInstructions] = useState<TeamInstructions>(readInstructions);
  const tacticalSlots = getFormationSlots(formation);
  const selectedIds = selectedIdsFromSlots(lineupSlots);
  const playerById = useMemo(
    () => new Map(state.players.map((player) => [player.id, player] as const)),
    [state.players],
  );
  const selectedPlayers = selectedIds
    .map((playerId) => playerById.get(playerId))
    .filter((player): player is Player => Boolean(player));
  const reserves = state.players.filter((player) => !selectedIds.includes(player.id));
  const focusedPlayer =
    state.players.find((player) => player.id === focusedPlayerId) ??
    selectedPlayers[0] ??
    state.players[0];
  const focusedSlotIndex = lineupSlots.indexOf(focusedPlayer.id);
  const focusedSlot = focusedSlotIndex >= 0 ? tacticalSlots[focusedSlotIndex] : null;
  const focusedFit = focusedSlot
    ? getPositionFamiliarity(focusedPlayer.position, focusedSlot)
    : null;
  const fitScores = tacticalSlots.map((slot, index) => {
    const playerId = lineupSlots[index];
    const player = playerId ? playerById.get(playerId) : undefined;
    return player ? getPositionFamiliarity(player.position, slot).score : 0;
  });
  const formationFit = average(fitScores);
  const averageCondition = average(selectedPlayers.map((player) => player.condition));
  const readiness = Math.round(formationFit * 0.45 + averageCondition * 0.55);
  const adaptingCount = fitScores.filter((score) => score < 70).length;
  const attentionCount = selectedPlayers.filter((player) => player.condition < 90).length;

  useEffect(() => {
    try {
      window.localStorage.setItem(TEAM_INSTRUCTIONS_KEY, JSON.stringify(instructions));
    } catch {
      // Instructions remain active for the session if storage is unavailable.
    }
  }, [instructions]);

  const describeMove = (playerId: string, targetIndex: number, previousSlots: LineupSlots) => {
    const player = playerById.get(playerId);
    const previousIndex = previousSlots.indexOf(playerId);
    const replacedId = previousSlots[targetIndex];
    const replaced = replacedId ? playerById.get(replacedId) : undefined;
    if (!player) return 'Escalação atualizada.';
    if (previousIndex >= 0 && replaced)
      return `${player.shortName} e ${replaced.shortName} trocaram de posição.`;
    if (replaced) return `${player.shortName} entrou no lugar de ${replaced.shortName}.`;
    return `${player.shortName} foi posicionado em ${tacticalSlots[targetIndex].label}.`;
  };

  const movePlayer = (playerId: string, targetIndex: number) => {
    const next = placePlayerInSlot(lineupSlots, playerId, targetIndex);
    if (next === lineupSlots) return;
    onLineupChange(next);
    onFocusPlayer(playerId);
    setInteractionMessage(describeMove(playerId, targetIndex, lineupSlots));
    setPickedPlayerId(null);
    setDraggedPlayerId(null);
    setDropSlotIndex(null);
  };

  const choosePlayer = (playerId: string) => {
    if (pickedPlayerId === playerId) {
      setPickedPlayerId(null);
      setInteractionMessage('Seleção cancelada.');
      return;
    }
    const player = playerById.get(playerId);
    setPickedPlayerId(playerId);
    onFocusPlayer(playerId);
    setInteractionMessage(
      `${player?.shortName ?? 'Jogador'} selecionado. Escolha um slot no campo.`,
    );
  };

  const activateSlot = (targetIndex: number, currentPlayerId: string | null) => {
    if (pickedPlayerId && pickedPlayerId !== currentPlayerId) {
      movePlayer(pickedPlayerId, targetIndex);
      return;
    }
    if (currentPlayerId) choosePlayer(currentPlayerId);
  };

  const handleDrop = (event: DragEvent<HTMLElement>, targetIndex: number) => {
    event.preventDefault();
    const playerId = event.dataTransfer.getData('text/plain') || draggedPlayerId;
    if (playerId) movePlayer(playerId, targetIndex);
  };

  const handlePitchKeyboard = (
    event: KeyboardEvent<HTMLButtonElement>,
    playerId: string,
    slotIndex: number,
  ) => {
    if (!event.altKey) return;
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const target = findDirectionalSlotIndex(tacticalSlots, slotIndex, event.key as PitchArrowKey);
    if (target === null) {
      setInteractionMessage('Não há outro slot nessa direção.');
      return;
    }
    movePlayer(playerId, target);
  };

  const beginDrag = (event: DragEvent<HTMLElement>, playerId: string) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', playerId);
    setDraggedPlayerId(playerId);
    onFocusPlayer(playerId);
  };

  const toggleInstruction = (id: keyof TeamInstructions) =>
    setInstructions((current) => ({ ...current, [id]: !current[id] }));

  return (
    <section className="screen-view tactics-view" aria-labelledby="tactics-screen-title">
      <header className="screen-heading tactics-heading">
        <div>
          <span>TÁTICAS · PLANO PRINCIPAL</span>
          <h1 id="tactics-screen-title">Plano de jogo</h1>
        </div>
        <div
          className="fixture-summary"
          aria-label={`${state.club.name} contra ${state.opponent.name}`}
        >
          <span>Preparação · Rodada {state.round}</span>
          <strong>
            {state.club.shortName} <i>20:30</i> {state.opponent.shortName}
          </strong>
        </div>
      </header>

      <section aria-label="Comandos táticos" className="tactics-commandbar">
        <label className="tactics-select">
          <span>Formação</span>
          <select
            aria-label="Formação"
            onChange={(event) => onFormationChange(event.target.value as Formation)}
            value={formation}
          >
            {formationOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
        <label className="tactics-select">
          <span>Leitura do campo</span>
          <select
            aria-label="Leitura do campo"
            onChange={(event) => onPitchModeChange(event.target.value as PitchMode)}
            value={pitchMode}
          >
            <option value="roles">Funções</option>
            <option value="condition">Condição</option>
            <option value="familiarity">Encaixe</option>
          </select>
        </label>
        <div className="tactics-readiness" aria-label={`Prontidão combinada ${readiness}%`}>
          <div>
            <span>Prontidão do plano</span>
            <strong>{readiness}%</strong>
          </div>
          <i aria-hidden="true">
            <b style={{ '--readiness': `${readiness}%` } as CSSProperties} />
          </i>
        </div>
        <span className="tactics-commandbar__spacer" />
        <button className="toolbar-action" disabled={!dirty} onClick={onReset} type="button">
          <Icon name="retry" size={16} /> Desfazer alterações
        </button>
        <Button
          disabled={!dirty}
          leadingIcon="save"
          loading={saving}
          loadingLabel="Salvando…"
          onClick={onSave}
          variant="primary"
        >
          Salvar plano
        </Button>
      </section>

      <div className="tactics-layout">
        <section className="pitch-workspace" aria-labelledby="pitch-title">
          <header className="pitch-workspace__header">
            <div>
              <h2 id="pitch-title">Campo tático</h2>
              <p>Arraste para trocar. No teclado, selecione dois jogadores ou use Alt + setas.</p>
            </div>
            <span
              className="pitch-save-state"
              data-dirty={dirty || undefined}
              data-error={Boolean(error) || undefined}
              role={error ? 'alert' : 'status'}
              title={error || message || undefined}
            >
              {error || message || (dirty ? 'Alterações não salvas' : 'Plano salvo localmente')}
            </span>
          </header>

          <div className="pitch-stage">
            <ol
              aria-label={`Escalação no ${formation}`}
              className="tactics-pitch"
              data-dragging={Boolean(draggedPlayerId) || undefined}
              data-pitch-mode={pitchMode}
            >
              <li aria-hidden="true" className="pitch-markings">
                <i className="pitch-markings__half" />
                <i className="pitch-markings__circle" />
                <i className="pitch-markings__spot" />
                <i className="pitch-markings__box pitch-markings__box--left" />
                <i className="pitch-markings__six pitch-markings__six--left" />
                <i className="pitch-markings__goal pitch-markings__goal--left" />
                <i className="pitch-markings__box pitch-markings__box--right" />
                <i className="pitch-markings__six pitch-markings__six--right" />
                <i className="pitch-markings__goal pitch-markings__goal--right" />
              </li>
              {tacticalSlots.map((slot, slotIndex) => {
                const playerId = lineupSlots[slotIndex];
                const player = playerId ? playerById.get(playerId) : undefined;
                const playerIndex = player
                  ? state.players.findIndex((candidate) => candidate.id === player.id)
                  : -1;
                const fit = player ? getPositionFamiliarity(player.position, slot) : null;
                const style = {
                  '--slot-x': `${slot.x}%`,
                  '--slot-y': `${slot.y}%`,
                } as CSSProperties;
                const secondary =
                  player && pitchMode === 'condition'
                    ? `Físico ${player.condition}%`
                    : player && pitchMode === 'familiarity'
                      ? `${fit?.score}% ${fit?.label}`
                      : compactRole(slot.role);
                const meterValue = pitchMode === 'condition' ? player?.condition : fit?.score;
                return (
                  <li
                    className="pitch-slot"
                    data-condition-attention={
                      pitchMode === 'condition' && player && player.condition < 90
                        ? true
                        : undefined
                    }
                    data-drop-active={dropSlotIndex === slotIndex || undefined}
                    data-fit={pitchMode === 'familiarity' ? fit?.tone : undefined}
                    key={slot.id}
                    onDragEnter={() => setDropSlotIndex(slotIndex)}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = 'move';
                    }}
                    onDrop={(event) => handleDrop(event, slotIndex)}
                    style={style}
                  >
                    <span className="pitch-slot__position">{slot.label}</span>
                    {player ? (
                      <button
                        aria-label={`${slot.label}: ${player.name}, ${fit?.label}. Selecione para mover.`}
                        aria-pressed={pickedPlayerId === player.id}
                        className="pitch-player-card"
                        draggable
                        onClick={() => activateSlot(slotIndex, player.id)}
                        onDragEnd={() => {
                          setDraggedPlayerId(null);
                          setDropSlotIndex(null);
                        }}
                        onDragStart={(event) => beginDrag(event, player.id)}
                        onKeyDown={(event) => handlePitchKeyboard(event, player.id, slotIndex)}
                        type="button"
                      >
                        <span className="pitch-player-card__face">
                          <PlayerFace decorative index={playerIndex} name={player.name} size={44} />
                          <b>{player.shirtNumber}</b>
                        </span>
                        <span className="pitch-player-card__copy">
                          <strong>{pitchPlayerName(player)}</strong>
                          <small>{secondary}</small>
                        </span>
                        <i aria-hidden="true">
                          <b style={{ '--fit': `${meterValue ?? 0}%` } as CSSProperties} />
                        </i>
                      </button>
                    ) : (
                      <button
                        aria-label={`Posição ${slot.label} vazia${pickedPlayerId ? ', selecionar como destino' : ''}`}
                        className="pitch-empty-slot"
                        onClick={() => activateSlot(slotIndex, null)}
                        type="button"
                      >
                        <Icon name="add" size={20} />
                        <span>{slot.label}</span>
                      </button>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>

          <section className="bench-tray" aria-labelledby="bench-title">
            <header>
              <div>
                <h3 id="bench-title">Banco e reservas</h3>
                <span>{reserves.length} disponíveis</span>
              </div>
              <p>
                {pickedPlayerId
                  ? 'Agora escolha o destino no campo.'
                  : 'Arraste uma reserva sobre um titular para substituir.'}
              </p>
            </header>
            <ul>
              {reserves.map((player) => {
                const playerIndex = state.players.findIndex(
                  (candidate) => candidate.id === player.id,
                );
                return (
                  <li key={player.id}>
                    <button
                      aria-label={`Selecionar reserva ${player.name}`}
                      aria-pressed={pickedPlayerId === player.id}
                      className="bench-player"
                      draggable
                      onClick={() => choosePlayer(player.id)}
                      onDragEnd={() => {
                        setDraggedPlayerId(null);
                        setDropSlotIndex(null);
                      }}
                      onDragStart={(event) => beginDrag(event, player.id)}
                      type="button"
                    >
                      <PlayerFace decorative index={playerIndex} name={player.name} size={44} />
                      <span>
                        <strong>{player.shortName}</strong>
                        <small>
                          {positionLabels[player.position]} · {player.condition}%
                        </small>
                      </span>
                      <b>{player.rating}</b>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
          <span className="sr-only" aria-live="polite">
            {interactionMessage}
          </span>
        </section>

        <aside className="tactics-inspector" aria-label="Inspector tático">
          <nav aria-label="Ferramentas táticas" className="tactics-tool-nav">
            {tacticalTools.map(([tool, icon, label]) => (
              <button
                aria-pressed={activeTool === tool}
                key={tool}
                onClick={() => onActiveToolChange(tool)}
                type="button"
              >
                <Icon name={icon} size={20} />
                <span>{label}</span>
              </button>
            ))}
          </nav>

          <div className="tactics-inspector__content" aria-live="polite">
            {activeTool === 'analysis' && (
              <>
                <header className="inspector-heading">
                  <span>Diagnóstico do plano</span>
                  <h2>{readiness}% pronto</h2>
                  <p>Encaixe posicional e condição atual do XI.</p>
                </header>
                <dl className="diagnostic-metrics">
                  <div>
                    <dt>Encaixe na formação</dt>
                    <dd>{formationFit}%</dd>
                    <i>
                      <b style={{ '--metric': `${formationFit}%` } as CSSProperties} />
                    </i>
                  </div>
                  <div>
                    <dt>Condição do XI</dt>
                    <dd>{averageCondition}%</dd>
                    <i>
                      <b style={{ '--metric': `${averageCondition}%` } as CSSProperties} />
                    </i>
                  </div>
                </dl>
                <section className="diagnostic-list">
                  <h3>Pontos de atenção</h3>
                  <button
                    disabled={adaptingCount === 0}
                    onClick={() => onPitchModeChange('familiarity')}
                    type="button"
                  >
                    <Icon name={adaptingCount > 0 ? 'warning' : 'success'} size={16} />
                    <span>
                      <strong>
                        {adaptingCount > 0
                          ? `${adaptingCount} encaixes frágeis`
                          : 'Posições bem encaixadas'}
                      </strong>
                      <small>
                        {adaptingCount > 0
                          ? 'Veja os slots destacados no campo.'
                          : 'Nenhum jogador fora do perfil atual.'}
                      </small>
                    </span>
                  </button>
                  <button
                    disabled={attentionCount === 0}
                    onClick={() => onPitchModeChange('condition')}
                    type="button"
                  >
                    <Icon name={attentionCount > 0 ? 'warning' : 'success'} size={16} />
                    <span>
                      <strong>
                        {attentionCount > 0
                          ? `${attentionCount} jogadores abaixo de 90%`
                          : 'XI fisicamente pronto'}
                      </strong>
                      <small>
                        {attentionCount > 0
                          ? 'Compare a condição antes de confirmar.'
                          : 'Condição estável para o próximo jogo.'}
                      </small>
                    </span>
                  </button>
                </section>
              </>
            )}

            {activeTool === 'tactics' && (
              <>
                <header className="inspector-heading">
                  <span>Estratégia coletiva</span>
                  <h2>{approachCopy[approach].title}</h2>
                  <p>{approachCopy[approach].description}</p>
                </header>
                <fieldset className="strategy-options">
                  <legend>Escolha a mentalidade</legend>
                  {(Object.keys(approachCopy) as TacticalApproach[]).map((option) => (
                    <label data-selected={approach === option || undefined} key={option}>
                      <input
                        checked={approach === option}
                        name="approach"
                        onChange={() => onApproachChange(option)}
                        type="radio"
                      />
                      <span>
                        <strong>{approachCopy[option].title}</strong>
                        <small>{approachCopy[option].description}</small>
                      </span>
                      <b>{approachCopy[option].mentality}</b>
                    </label>
                  ))}
                </fieldset>
              </>
            )}

            {activeTool === 'instructions' && (
              <>
                <header className="inspector-heading">
                  <span>Instruções da equipe</span>
                  <h2>Comportamentos</h2>
                  <p>Ative apenas princípios que o elenco deve executar.</p>
                </header>
                <div className="instruction-list">
                  {instructionOptions.map((instruction) => (
                    <button
                      aria-pressed={instructions[instruction.id]}
                      key={instruction.id}
                      onClick={() => toggleInstruction(instruction.id)}
                      type="button"
                    >
                      <span>
                        <small>{instruction.phase}</small>
                        <strong>{instruction.title}</strong>
                        <em>{instruction.description}</em>
                      </span>
                      <i aria-hidden="true">
                        <b />
                      </i>
                    </button>
                  ))}
                </div>
              </>
            )}

            {activeTool === 'opposition' && (
              <>
                <header className="inspector-heading">
                  <span>Próximo adversário</span>
                  <h2>{state.opponent.name}</h2>
                  <p>Rodada {state.round} · preparação pré-jogo.</p>
                </header>
                <section className="opposition-summary">
                  <span
                    className="opposition-crest"
                    style={{ '--opponent-color': state.opponent.primaryColor } as CSSProperties}
                  >
                    {state.opponent.shortName}
                  </span>
                  <dl>
                    <div>
                      <dt>Local</dt>
                      <dd>Casa</dd>
                    </div>
                    <div>
                      <dt>Horário</dt>
                      <dd>20:30</dd>
                    </div>
                    <div>
                      <dt>Competição</dt>
                      <dd>Liga Horizonte</dd>
                    </div>
                  </dl>
                </section>
                <p className="opposition-note">
                  <Icon name="information" size={16} /> O relatório detalhado da oposição será
                  alimentado pela observação quando esse módulo estiver disponível.
                </p>
              </>
            )}
          </div>

          <section
            className="focused-player-card"
            aria-label={`Jogador em foco: ${focusedPlayer.name}`}
          >
            <PlayerFace
              decorative
              index={state.players.findIndex((player) => player.id === focusedPlayer.id)}
              name={focusedPlayer.name}
              size={64}
            />
            <div>
              <span>Jogador em foco</span>
              <strong>{focusedPlayer.name}</strong>
              <small>
                {positionLongLabels[focusedPlayer.position]} · OVR {focusedPlayer.rating}
              </small>
            </div>
            <b data-fit={focusedFit?.tone}>
              {focusedFit?.score ?? '—'}
              <small>{focusedFit?.label ?? 'Reserva'}</small>
            </b>
          </section>
        </aside>
      </div>
    </section>
  );
}
