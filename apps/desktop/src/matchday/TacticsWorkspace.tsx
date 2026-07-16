import { Icon } from '@rivallo/icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, DragEvent, KeyboardEvent, MouseEvent } from 'react';

import { Button } from '../ui/primitives/actions.js';
import { approachCopy, positionLabels, type PitchMode, type TacticalTool } from './matchday-ui.js';
import { PlayerFace } from './PlayerFace.js';
import {
  applyPresetToPlan,
  findNearestStarter,
  formationPresets,
  getPositionFamiliarity,
  movePlayerFreely,
  renameCustomFormation,
  reorderBench,
  substitutePlayers,
  swapStarters,
  validateTacticalDraft,
  type FormationFamily,
} from './tactics-model.js';
import type {
  Formation,
  MatchdayState,
  Player,
  TacticalApproach,
  TacticalPlanSnapshot,
} from './types.js';

interface TacticsWorkspaceProps {
  readonly state: MatchdayState;
  readonly draft: TacticalPlanSnapshot;
  readonly approach: TacticalApproach;
  readonly pitchMode: PitchMode;
  readonly activeTool: TacticalTool;
  readonly focusedPlayerId: string | null;
  readonly dirty: boolean;
  readonly saving: boolean;
  readonly canUndo: boolean;
  readonly message: string;
  readonly error: string;
  readonly onDraftChange: (draft: TacticalPlanSnapshot) => void;
  readonly onApproachChange: (approach: TacticalApproach) => void;
  readonly onPitchModeChange: (mode: PitchMode) => void;
  readonly onActiveToolChange: (tool: TacticalTool) => void;
  readonly onFocusPlayer: (playerId: string) => void;
  readonly onUndo: () => void;
  readonly onDiscard: () => void;
  readonly onSave: () => void;
}

interface DragSession {
  readonly playerId: string;
  readonly origin: 'field' | 'bench';
}

interface DragOverlayPosition {
  readonly x: number;
  readonly y: number;
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
    description: 'Preferência visual preservada; o efeito esportivo pertence à Fase 06.3.',
  },
  {
    id: 'overlap',
    phase: 'Com bola',
    title: 'Ultrapassagem dos laterais',
    description: 'Preferência visual preservada; ainda não é consumida pelo motor.',
  },
  {
    id: 'counterPress',
    phase: 'Transição',
    title: 'Pressão após perda',
    description: 'Preferência visual preservada; ainda não é consumida pelo motor.',
  },
  {
    id: 'compactBlock',
    phase: 'Sem bola',
    title: 'Bloco compacto',
    description: 'Preferência visual preservada; ainda não é consumida pelo motor.',
  },
];

const tacticalTools: readonly [TacticalTool, TacticalTool, string][] = [
  ['analysis', 'analysis', 'Análise'],
  ['tactics', 'tactics', 'Estratégia'],
  ['instructions', 'instructions', 'Instruções'],
  ['opposition', 'opposition', 'Oposição'],
];

const familyOrder: readonly FormationFamily[] = ['backFour', 'backThree', 'backFive'];
const clamp = (value: number, min = 0.035, max = 0.965) => Math.min(max, Math.max(min, value));
const average = (values: readonly number[]) =>
  Math.round(values.reduce((total, value) => total + value, 0) / Math.max(values.length, 1));

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

const pitchPlayerName = (player: Player) => {
  const parts = player.name.trim().split(/\s+/u);
  return parts[parts.length - 1] ?? player.shortName;
};

const compactRole = (role: string | null) =>
  role?.split(' · ')[0]?.replace('Meia central', 'Meia').replace('Meia aberto', 'Meia') ??
  'Função livre';

export function TacticsWorkspace({
  state,
  draft,
  approach,
  pitchMode,
  activeTool,
  focusedPlayerId,
  dirty,
  saving,
  canUndo,
  message,
  error,
  onDraftChange,
  onApproachChange,
  onPitchModeChange,
  onActiveToolChange,
  onFocusPlayer,
  onUndo,
  onDiscard,
  onSave,
}: TacticsWorkspaceProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [dragSession, setDragSession] = useState<DragSession | null>(null);
  const [dragOverlay, setDragOverlay] = useState<DragOverlayPosition | null>(null);
  const [dropTargetPlayerId, setDropTargetPlayerId] = useState<string | null>(null);
  const [interactionMessage, setInteractionMessage] = useState('');
  const [interactionError, setInteractionError] = useState('');
  const [instructions, setInstructions] = useState<TeamInstructions>(readInstructions);
  const dropHandledRef = useRef(false);
  const pitchRef = useRef<HTMLOListElement>(null);

  const playerById = useMemo(
    () => new Map(state.players.map((player) => [player.id, player] as const)),
    [state.players],
  );
  const validation = useMemo(
    () => validateTacticalDraft(draft, state.players),
    [draft, state.players],
  );
  const focusedPlayer =
    state.players.find((player) => player.id === focusedPlayerId) ??
    playerById.get(draft.placements[0]?.playerId ?? '') ??
    state.players[0];
  const selectedPlayer = selectedPlayerId ? playerById.get(selectedPlayerId) : undefined;
  const fitScores = draft.placements.map((placement) => {
    const player = playerById.get(placement.playerId);
    return player ? getPositionFamiliarity(player.position, placement).score : 0;
  });
  const formationFit = average(fitScores);
  const averageCondition = average(
    draft.placements.map(({ playerId }) => playerById.get(playerId)?.condition ?? 0),
  );
  const readiness = Math.round(formationFit * 0.45 + averageCondition * 0.55);

  useEffect(() => {
    try {
      window.localStorage.setItem(TEAM_INSTRUCTIONS_KEY, JSON.stringify(instructions));
    } catch {
      // The preference remains active for the session when storage is unavailable.
    }
  }, [instructions]);

  useEffect(
    () => () => {
      setDragSession(null);
      setDragOverlay(null);
      setDropTargetPlayerId(null);
    },
    [],
  );

  const announce = (text: string, rejected = false) => {
    setInteractionMessage(rejected ? '' : text);
    setInteractionError(rejected ? text : '');
  };

  const commit = (next: TacticalPlanSnapshot, text: string) => {
    const nextValidation = validateTacticalDraft(next, state.players);
    if (!nextValidation.valid) {
      announce(nextValidation.errors[0] ?? 'Esse destino não é válido.', true);
      return false;
    }
    onDraftChange(next);
    setSelectedPlayerId(null);
    announce(text);
    return true;
  };

  const choosePlayer = (playerId: string) => {
    if (saving) return;
    if (!selectedPlayerId) {
      setSelectedPlayerId(playerId);
      onFocusPlayer(playerId);
      announce(
        `${playerById.get(playerId)?.shortName ?? 'Jogador'} selecionado. Escolha outro jogador ou use Alt + setas no campo.`,
      );
      return;
    }
    if (selectedPlayerId === playerId) {
      setSelectedPlayerId(null);
      announce('Seleção cancelada.');
      return;
    }

    const firstIsStarter = draft.placements.some(
      ({ playerId: candidate }) => candidate === selectedPlayerId,
    );
    const targetIsStarter = draft.placements.some(
      ({ playerId: candidate }) => candidate === playerId,
    );
    const firstName = playerById.get(selectedPlayerId)?.shortName ?? 'Jogador';
    const targetName = playerById.get(playerId)?.shortName ?? 'jogador';
    if (firstIsStarter && targetIsStarter) {
      commit(
        swapStarters(draft, selectedPlayerId, playerId),
        `${firstName} e ${targetName} trocaram de posição.`,
      );
    } else if (firstIsStarter) {
      commit(
        substitutePlayers(draft, selectedPlayerId, playerId),
        `${targetName} entrou; ${firstName} foi para o banco.`,
      );
    } else if (targetIsStarter) {
      commit(
        substitutePlayers(draft, playerId, selectedPlayerId),
        `${firstName} entrou; ${targetName} foi para o banco.`,
      );
    } else {
      commit(
        reorderBench(draft, selectedPlayerId, playerId),
        `${firstName} foi reposicionado no banco.`,
      );
    }
  };

  const pointFromEvent = (
    event: Pick<DragEvent<HTMLElement> | MouseEvent<HTMLElement>, 'clientX' | 'clientY'>,
  ) => {
    const rect = pitchRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: clamp((event.clientX - rect.left) / rect.width),
      y: clamp((event.clientY - rect.top) / rect.height),
    };
  };

  const applyFieldPoint = (playerId: string, point: { readonly x: number; readonly y: number }) => {
    const player = playerById.get(playerId);
    const sourceIsStarter = draft.placements.some(({ playerId: id }) => id === playerId);
    if (!player) {
      announce('O jogador selecionado não está mais disponível neste plano.', true);
      return false;
    }
    if (sourceIsStarter) {
      return commit(
        movePlayerFreely(draft, playerId, point.x, point.y),
        `${player.shortName} foi movido para uma coordenada livre.`,
      );
    }
    const nearest = findNearestStarter(draft, point.x, point.y);
    const replaced = nearest ? playerById.get(nearest.playerId) : undefined;
    if (!nearest || !replaced) {
      announce('Não foi possível encontrar um titular válido para a substituição.', true);
      return false;
    }
    return commit(
      substitutePlayers(draft, nearest.playerId, playerId, point),
      `${player.shortName} entrou neste espaço; ${replaced.shortName} foi para o banco.`,
    );
  };

  const beginDrag = (
    event: DragEvent<HTMLElement>,
    playerId: string,
    origin: 'field' | 'bench',
  ) => {
    if (saving) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', playerId);
    dropHandledRef.current = false;
    setDragSession({ playerId, origin });
    setSelectedPlayerId(null);
    onFocusPlayer(playerId);
    announce(
      `${playerById.get(playerId)?.shortName ?? 'Jogador'} em movimento, origem ${origin === 'field' ? 'campo' : 'banco'}.`,
    );
  };

  const finishDrag = (cancelled = false) => {
    if (cancelled && dragSession && !dropHandledRef.current) {
      announce('Movimento cancelado. O plano anterior foi preservado.');
    }
    setDragSession(null);
    setDragOverlay(null);
    setDropTargetPlayerId(null);
  };

  const cancelUnfinishedDrag = () => finishDrag(true);

  const dropOnField = (event: DragEvent<HTMLOListElement>) => {
    event.preventDefault();
    if (!dragSession || dropTargetPlayerId) return;
    const point = pointFromEvent(event);
    if (!point) return;
    dropHandledRef.current = true;
    applyFieldPoint(dragSession.playerId, point);
    finishDrag();
  };

  const dropOnPlayer = (event: DragEvent<HTMLElement>, targetPlayerId: string) => {
    event.preventDefault();
    event.stopPropagation();
    dropHandledRef.current = true;
    if (!dragSession || dragSession.playerId === targetPlayerId) {
      finishDrag();
      return;
    }
    const sourceName = playerById.get(dragSession.playerId)?.shortName ?? 'Jogador';
    const targetName = playerById.get(targetPlayerId)?.shortName ?? 'jogador';
    const sourceIsStarter = draft.placements.some(
      ({ playerId }) => playerId === dragSession.playerId,
    );
    const targetIsStarter = draft.placements.some(({ playerId }) => playerId === targetPlayerId);
    const next = sourceIsStarter
      ? targetIsStarter
        ? swapStarters(draft, dragSession.playerId, targetPlayerId)
        : substitutePlayers(draft, dragSession.playerId, targetPlayerId)
      : targetIsStarter
        ? substitutePlayers(draft, targetPlayerId, dragSession.playerId)
        : reorderBench(draft, dragSession.playerId, targetPlayerId);
    const text =
      sourceIsStarter === targetIsStarter
        ? `${sourceName} e ${targetName} trocaram de lugar.`
        : sourceIsStarter
          ? `${targetName} entrou; ${sourceName} foi para o banco.`
          : `${sourceName} entrou; ${targetName} foi para o banco.`;
    commit(next, text);
    finishDrag();
  };

  const handlePlayerKeyboard = (event: KeyboardEvent<HTMLButtonElement>, playerId: string) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setSelectedPlayerId(null);
      announce('Movimento cancelado.');
      return;
    }
    if (!event.altKey || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key))
      return;
    const placement = draft.placements.find((item) => item.playerId === playerId);
    if (!placement) return;
    event.preventDefault();
    const step = event.shiftKey ? 0.05 : 0.025;
    const x =
      event.key === 'ArrowLeft'
        ? placement.normalizedX - step
        : event.key === 'ArrowRight'
          ? placement.normalizedX + step
          : placement.normalizedX;
    const y =
      event.key === 'ArrowUp'
        ? placement.normalizedY - step
        : event.key === 'ArrowDown'
          ? placement.normalizedY + step
          : placement.normalizedY;
    commit(
      movePlayerFreely(draft, playerId, clamp(x), clamp(y)),
      `${playerById.get(playerId)?.shortName ?? 'Jogador'} foi movido com o teclado.`,
    );
  };

  const selectFormation = (formation: Formation) => {
    if (formation === draft.formation && !draft.customFormation.isCustom) return;
    if (dirty && !window.confirm('Aplicar este preset e descartar as alterações ainda não salvas?'))
      return;
    try {
      onDraftChange(applyPresetToPlan(draft, formation, state.players));
      setSelectedPlayerId(null);
      announce(`Preset ${formation} aplicado como ponto de partida editável.`);
    } catch (reason) {
      announce(reason instanceof Error ? reason.message : String(reason), true);
    }
  };

  const restoreSourcePreset = () => {
    if (!draft.sourcePresetId) return;
    if (dirty && !window.confirm('Restaurar o preset de origem e descartar a forma livre atual?'))
      return;
    onDraftChange(applyPresetToPlan(draft, draft.sourcePresetId, state.players));
    announce(`Preset ${draft.sourcePresetId} restaurado.`);
  };

  const statusText =
    error ||
    interactionError ||
    message ||
    (saving
      ? 'Salvando plano…'
      : !validation.valid
        ? 'Proposta inválida — corrija antes de salvar'
        : dirty
          ? 'Plano modificado — ainda não salvo'
          : 'Plano salvo no dispositivo');

  return (
    <section
      aria-labelledby="tactics-screen-title"
      className="screen-view tactics-view"
      onKeyDownCapture={(event) => {
        if (event.key !== 'Escape' || (!selectedPlayerId && !dragSession)) return;
        event.preventDefault();
        setSelectedPlayerId(null);
        setDragSession(null);
        setDragOverlay(null);
        setDropTargetPlayerId(null);
        announce('Movimento cancelado. O plano anterior foi preservado.');
      }}
    >
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
        <label className="tactics-select tactics-select--formation">
          <span>Formação</span>
          <select
            aria-label="Formação"
            disabled={saving}
            onChange={(event) => selectFormation(event.target.value as Formation)}
            value={draft.formation}
          >
            {familyOrder.map((family) => {
              const options = formationPresets.filter((item) => item.family === family);
              return (
                <optgroup key={family} label={options[0]?.familyLabel}>
                  {options.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name} · {option.description}
                    </option>
                  ))}
                </optgroup>
              );
            })}
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
        <button
          className="toolbar-action"
          disabled={!canUndo || saving}
          onClick={onUndo}
          type="button"
        >
          <Icon name="retry" size={16} /> Desfazer última
        </button>
        <button
          className="toolbar-action"
          disabled={!dirty || saving}
          onClick={onDiscard}
          type="button"
        >
          Descartar
        </button>
        <Button
          disabled={!dirty || !validation.valid}
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
              <h2 id="pitch-title">Campo tático livre</h2>
              <p>
                Arraste para mover ou trocar. No teclado, selecione dois jogadores ou use Alt +
                setas.
              </p>
            </div>
            <span
              className="pitch-save-state"
              data-dirty={dirty || undefined}
              data-error={Boolean(error || interactionError || !validation.valid) || undefined}
              role={error || interactionError || !validation.valid ? 'alert' : 'status'}
              title={statusText}
            >
              {statusText}
            </span>
          </header>

          {draft.customFormation.isCustom && (
            <div className="custom-formation-bar">
              <label>
                <span>Formação personalizada</span>
                <input
                  aria-label="Nome da formação personalizada"
                  disabled={saving}
                  maxLength={80}
                  onChange={(event) =>
                    onDraftChange(renameCustomFormation(draft, event.target.value))
                  }
                  value={draft.customFormation.name}
                />
              </label>
              <span>Origem: {draft.sourcePresetId ?? 'sem preset'}</span>
              <button
                disabled={!draft.sourcePresetId || saving}
                onClick={restoreSourcePreset}
                type="button"
              >
                Restaurar preset
              </button>
            </div>
          )}

          <div className="pitch-stage">
            <ol
              aria-label={`Escalação no ${draft.formation}`}
              className="tactics-pitch"
              data-dragging={Boolean(dragSession) || undefined}
              data-pitch-mode={pitchMode}
              onClick={(event) => {
                if (!selectedPlayerId || event.target !== event.currentTarget) return;
                const point = pointFromEvent(event);
                if (point) applyFieldPoint(selectedPlayerId, point);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
                if (event.clientX > 0 && event.clientY > 0)
                  setDragOverlay({ x: event.clientX, y: event.clientY });
              }}
              onDrop={dropOnField}
              ref={pitchRef}
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
              {draft.placements.map((placement) => {
                const player = playerById.get(placement.playerId);
                if (!player) return null;
                const playerIndex = state.players.findIndex(({ id }) => id === player.id);
                const fit = getPositionFamiliarity(player.position, placement);
                const style = {
                  '--slot-x': `${placement.normalizedX * 100}%`,
                  '--slot-y': `${placement.normalizedY * 100}%`,
                } as CSSProperties;
                const secondary =
                  pitchMode === 'condition'
                    ? `Físico ${player.condition}%`
                    : pitchMode === 'familiarity'
                      ? `${fit.score}% ${fit.label}`
                      : compactRole(placement.roleId);
                const meterValue = pitchMode === 'condition' ? player.condition : fit.score;
                return (
                  <li
                    className="pitch-slot"
                    data-condition-attention={
                      pitchMode === 'condition' && player.condition < 90 ? true : undefined
                    }
                    data-drag-source={dragSession?.playerId === player.id || undefined}
                    data-drop-active={dropTargetPlayerId === player.id || undefined}
                    data-fit={pitchMode === 'familiarity' ? fit.tone : undefined}
                    key={player.id}
                    onDragEnter={() => setDropTargetPlayerId(player.id)}
                    onDragLeave={() => setDropTargetPlayerId(null)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => dropOnPlayer(event, player.id)}
                    style={style}
                  >
                    <span className="pitch-slot__position">
                      {positionLabels[placement.positionId]}
                    </span>
                    <button
                      aria-label={`${positionLabels[placement.positionId]}: ${player.name}, ${fit.label}. Selecione para mover.`}
                      aria-pressed={selectedPlayerId === player.id}
                      className="pitch-player-card"
                      disabled={saving}
                      draggable={!saving}
                      onClick={(event) => {
                        event.stopPropagation();
                        choosePlayer(player.id);
                      }}
                      onDrag={(event) => {
                        if (event.clientX > 0 && event.clientY > 0)
                          setDragOverlay({ x: event.clientX, y: event.clientY });
                      }}
                      onDragEnd={cancelUnfinishedDrag}
                      onDragStart={(event) => beginDrag(event, player.id, 'field')}
                      onKeyDown={(event) => handlePlayerKeyboard(event, player.id)}
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
                        <b style={{ '--fit': `${meterValue}%` } as CSSProperties} />
                      </i>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>

          <section
            aria-labelledby="bench-title"
            className="bench-tray"
            data-dragging={dragSession?.origin === 'field' || undefined}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              dropHandledRef.current = true;
              if (dragSession?.origin === 'field') {
                announce(
                  'O banco está completo. Solte o titular sobre uma reserva para trocar.',
                  true,
                );
              }
              finishDrag();
            }}
          >
            <header>
              <div>
                <h3 id="bench-title">Banco e reservas</h3>
                <span>{draft.bench.length} de 7 vagas</span>
              </div>
              <p>
                {selectedPlayerId
                  ? `Selecionado: ${selectedPlayer?.shortName ?? 'jogador'}. Escolha o destino.`
                  : 'Arraste entre campo e banco para substituir; arraste reservas para reordenar.'}
              </p>
            </header>
            {draft.bench.length === 0 ? (
              <p className="bench-empty">
                O banco está vazio. Selecione um titular e escolha este destino.
              </p>
            ) : (
              <ul>
                {draft.bench.map((playerId) => {
                  const player = playerById.get(playerId);
                  if (!player) return null;
                  const playerIndex = state.players.findIndex(({ id }) => id === player.id);
                  return (
                    <li
                      data-drag-source={dragSession?.playerId === player.id || undefined}
                      data-drop-active={dropTargetPlayerId === player.id || undefined}
                      key={player.id}
                      onDragEnter={() => setDropTargetPlayerId(player.id)}
                      onDragLeave={() => setDropTargetPlayerId(null)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => dropOnPlayer(event, player.id)}
                    >
                      <button
                        aria-label={`Selecionar reserva ${player.name}`}
                        aria-pressed={selectedPlayerId === player.id}
                        className="bench-player"
                        disabled={saving}
                        draggable={!saving}
                        onClick={() => choosePlayer(player.id)}
                        onDrag={(event) => {
                          if (event.clientX > 0 && event.clientY > 0)
                            setDragOverlay({ x: event.clientX, y: event.clientY });
                        }}
                        onDragEnd={cancelUnfinishedDrag}
                        onDragStart={(event) => beginDrag(event, player.id, 'bench')}
                        type="button"
                      >
                        <PlayerFace decorative index={playerIndex} name={player.name} size={44} />
                        <span>
                          <strong>{player.shortName}</strong>
                          <small>
                            {positionLabels[player.position]} · Condição {player.condition}%
                          </small>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {dragSession && dragOverlay && (
            <div
              aria-hidden="true"
              className="tactical-drag-overlay"
              style={{ left: dragOverlay.x, top: dragOverlay.y }}
            >
              <strong>{playerById.get(dragSession.playerId)?.shortName}</strong>
              <span>
                {dropTargetPlayerId
                  ? `Trocar com ${playerById.get(dropTargetPlayerId)?.shortName}`
                  : dragSession.origin === 'field'
                    ? 'Mover para coordenada livre'
                    : 'Substituir o jogador mais próximo'}
              </span>
            </div>
          )}

          <span aria-atomic="true" aria-live="polite" className="sr-only" role="status">
            {interactionMessage}
          </span>
          <span aria-atomic="true" aria-live="assertive" className="sr-only" role="alert">
            {interactionError}
          </span>
        </section>

        <aside aria-label="Inspector tático" className="tactics-inspector">
          <nav aria-label="Ferramentas táticas" className="tactics-tool-nav">
            {tacticalTools.map(([tool, icon, label]) => (
              <button
                aria-pressed={activeTool === tool}
                key={tool}
                onClick={() => onActiveToolChange(tool)}
                type="button"
              >
                <Icon name={icon} size={20} /> <span>{label}</span>
              </button>
            ))}
          </nav>
          <div className="tactics-inspector__content" aria-live="polite">
            {activeTool === 'analysis' && (
              <>
                <header className="inspector-heading">
                  <span>Análise estrutural</span>
                  <h2>{validation.valid ? 'Plano tecnicamente válido' : 'Correção necessária'}</h2>
                  <p>
                    Esta fase valida estrutura, escalação e geometria; leitura tática profunda chega
                    na 06.3. Prontidão combinada: {readiness}% pronto.
                  </p>
                </header>
                <dl className="diagnostic-metrics">
                  <div>
                    <dt>Encaixe posicional</dt>
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
                  <h3>Alertas técnicos</h3>
                  {validation.errors.map((item) => (
                    <p className="tactical-alert" key={item}>
                      {item}
                    </p>
                  ))}
                  {validation.warnings.slice(0, 4).map((item) => (
                    <p key={item}>{item}</p>
                  ))}
                  {validation.errors.length === 0 && validation.warnings.length === 0 && (
                    <p>Nenhum alerta estrutural.</p>
                  )}
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
                    <label key={option}>
                      <input
                        checked={approach === option}
                        disabled={saving}
                        name="tactical-approach"
                        onChange={() => onApproachChange(option)}
                        type="radio"
                      />
                      <span>
                        <strong>{approachCopy[option].title}</strong>
                        <b>{approachCopy[option].mentality}</b>
                        <small>{approachCopy[option].description}</small>
                      </span>
                    </label>
                  ))}
                </fieldset>
              </>
            )}
            {activeTool === 'instructions' && (
              <>
                <header className="inspector-heading">
                  <span>Preferências preservadas</span>
                  <h2>Instruções da equipe</h2>
                  <p>
                    Os controles permanecem disponíveis, mas o efeito esportivo será formalizado na
                    Fase 06.3.
                  </p>
                </header>
                <div className="instruction-list">
                  {instructionOptions.map((option) => (
                    <label key={option.id}>
                      <input
                        checked={instructions[option.id]}
                        onChange={() =>
                          setInstructions((current) => ({
                            ...current,
                            [option.id]: !current[option.id],
                          }))
                        }
                        type="checkbox"
                      />
                      <span>
                        <small>{option.phase}</small>
                        <strong>{option.title}</strong>
                        <b>{option.description}</b>
                      </span>
                    </label>
                  ))}
                </div>
              </>
            )}
            {activeTool === 'opposition' && (
              <>
                <header className="inspector-heading">
                  <span>Próximo adversário</span>
                  <h2>{state.opponent.name}</h2>
                  <p>
                    Oposição detalhada depende do módulo de observação e permanece fora da Fase
                    06.2.
                  </p>
                </header>
                <p className="opposition-note">
                  <Icon name="information" size={16} /> Nenhum relatório autoritativo disponível.
                </p>
              </>
            )}
          </div>
          <footer className="tactics-focus-player">
            {focusedPlayer && (
              <>
                <PlayerFace
                  decorative
                  index={state.players.findIndex(({ id }) => id === focusedPlayer.id)}
                  name={focusedPlayer.name}
                  size={48}
                />
                <span>
                  <small>Jogador em foco</small>
                  <strong>{focusedPlayer.name}</strong>
                  <b>
                    {positionLabels[focusedPlayer.position]} · Condição {focusedPlayer.condition}%
                  </b>
                </span>
              </>
            )}
          </footer>
        </aside>
      </div>
    </section>
  );
}
