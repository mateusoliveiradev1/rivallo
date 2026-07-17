import { Icon } from '@rivallo/icons';
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';

import { Button } from '../ui/primitives/actions.js';
import { Popover } from '../ui/primitives/disclosure.js';
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
  readonly onSave: () => Promise<TacticalPlanSnapshot | null>;
}

interface DragSession {
  readonly playerId: string;
  readonly origin: 'field' | 'bench';
}

interface PointerDragSession extends DragSession {
  readonly pointerId: number;
  readonly source: HTMLButtonElement;
  readonly startX: number;
  readonly startY: number;
  readonly grabOffsetX: number;
  readonly grabOffsetY: number;
  active: boolean;
}

type DragDestination =
  | { readonly kind: 'field' }
  | { readonly kind: 'player'; readonly playerId: string }
  | { readonly kind: 'bench' }
  | { readonly kind: 'outside' };

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
const POINTER_DRAG_THRESHOLD = 6;
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

const normalizeSearch = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/gu, '')
    .toLocaleLowerCase('pt-BR')
    .trim();

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
  const [dragDestination, setDragDestination] = useState<DragDestination>({ kind: 'outside' });
  const [formationPickerOpen, setFormationPickerOpen] = useState(false);
  const [formationQuery, setFormationQuery] = useState('');
  const [pendingFormation, setPendingFormation] = useState<Formation | null>(null);
  const [formationSaving, setFormationSaving] = useState(false);
  const [interactionMessage, setInteractionMessage] = useState('');
  const [interactionError, setInteractionError] = useState('');
  const [instructions, setInstructions] = useState<TeamInstructions>(readInstructions);
  const pitchRef = useRef<HTMLOListElement>(null);
  const benchRef = useRef<HTMLElement>(null);
  const dragOverlayRef = useRef<HTMLDivElement>(null);
  const pointerSessionRef = useRef<PointerDragSession | null>(null);
  const pointerCleanupRef = useRef<() => void>(() => undefined);
  const suppressClickRef = useRef<string | null>(null);

  const playerById = useMemo(
    () => new Map(state.players.map((player) => [player.id, player] as const)),
    [state.players],
  );
  const validation = useMemo(
    () => validateTacticalDraft(draft, state.players),
    [draft, state.players],
  );
  const activePreset =
    formationPresets.find(({ id }) => id === draft.formation) ?? formationPresets[0];
  const normalizedFormationQuery = normalizeSearch(formationQuery);
  const filteredFormationPresets = formationPresets.filter((preset) => {
    if (!normalizedFormationQuery) return true;
    return normalizeSearch(
      [preset.name, preset.description, preset.familyLabel, ...preset.tags].join(' '),
    ).includes(normalizedFormationQuery);
  });
  const focusedPlayer =
    state.players.find((player) => player.id === focusedPlayerId) ??
    playerById.get(draft.placements[0]?.playerId ?? '') ??
    state.players[0];
  const selectedPlayer = selectedPlayerId ? playerById.get(selectedPlayerId) : undefined;
  const draggedPlayer = dragSession ? playerById.get(dragSession.playerId) : undefined;
  const draggedPlacement = dragSession
    ? draft.placements.find(({ playerId }) => playerId === dragSession.playerId)
    : undefined;
  const draggedPlayerIndex = draggedPlayer
    ? state.players.findIndex(({ id }) => id === draggedPlayer.id)
    : -1;
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
      pointerCleanupRef.current();
    },
    [],
  );

  const announce = (text: string, rejected = false) => {
    setInteractionMessage(rejected ? '' : text);
    setInteractionError(rejected ? text : '');
  };

  const commit = (next: TacticalPlanSnapshot, text: string, preserveSelection = false) => {
    const nextValidation = validateTacticalDraft(next, state.players);
    if (!nextValidation.valid) {
      announce(nextValidation.errors[0] ?? 'Esse destino não é válido.', true);
      return false;
    }
    onDraftChange(next);
    if (!preserveSelection) setSelectedPlayerId(null);
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

  const pointFromClient = (clientX: number, clientY: number) => {
    const rect = pitchRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return null;
    return {
      x: clamp((clientX - rect.left) / rect.width),
      y: clamp((clientY - rect.top) / rect.height),
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

  const finishDrag = () => {
    pointerCleanupRef.current();
    pointerCleanupRef.current = () => undefined;
    pointerSessionRef.current = null;
    setDragSession(null);
    setDragOverlay(null);
    setDropTargetPlayerId(null);
    setDragDestination({ kind: 'outside' });
  };

  const resolveDragDestination = (clientX: number, clientY: number): DragDestination => {
    const hit = document.elementFromPoint?.(clientX, clientY);
    const playerTarget = hit?.closest<HTMLElement>('[data-tactical-player-id]');
    const playerId = playerTarget?.dataset.tacticalPlayerId;
    if (playerId) return { kind: 'player', playerId };

    const containsPoint = (element: Element | null) => {
      if (!element) return false;
      const rect = element.getBoundingClientRect();
      return (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      );
    };
    if (containsPoint(pitchRef.current)) return { kind: 'field' };
    if (containsPoint(benchRef.current)) return { kind: 'bench' };
    return { kind: 'outside' };
  };

  const applyPlayerDrop = (session: DragSession, targetPlayerId: string) => {
    if (session.playerId === targetPlayerId) {
      announce('O jogador permaneceu no mesmo lugar. Nenhuma alteração foi feita.');
      return;
    }
    const sourceName = playerById.get(session.playerId)?.shortName ?? 'Jogador';
    const targetName = playerById.get(targetPlayerId)?.shortName ?? 'jogador';
    const sourceIsStarter = draft.placements.some(({ playerId }) => playerId === session.playerId);
    const targetIsStarter = draft.placements.some(({ playerId }) => playerId === targetPlayerId);
    const next = sourceIsStarter
      ? targetIsStarter
        ? swapStarters(draft, session.playerId, targetPlayerId)
        : substitutePlayers(draft, session.playerId, targetPlayerId)
      : targetIsStarter
        ? substitutePlayers(draft, targetPlayerId, session.playerId)
        : reorderBench(draft, session.playerId, targetPlayerId);
    const text =
      sourceIsStarter === targetIsStarter
        ? `${sourceName} e ${targetName} trocaram de lugar.`
        : sourceIsStarter
          ? `${targetName} entrou; ${sourceName} foi para o banco.`
          : `${sourceName} entrou; ${targetName} foi para o banco.`;
    commit(next, text);
  };

  const updateDragFeedback = (destination: DragDestination) => {
    setDragDestination((current) => {
      if (current.kind !== destination.kind) return destination;
      if (
        current.kind === 'player' &&
        destination.kind === 'player' &&
        current.playerId !== destination.playerId
      )
        return destination;
      return current;
    });
    const nextPlayerId = destination.kind === 'player' ? destination.playerId : null;
    setDropTargetPlayerId((current) => (current === nextPlayerId ? current : nextPlayerId));
  };

  const updateDragOverlayPosition = (
    session: PointerDragSession,
    clientX: number,
    clientY: number,
  ) => {
    const x = clientX - session.grabOffsetX;
    const y = clientY - session.grabOffsetY;
    const overlay = dragOverlayRef.current;
    if (!overlay) {
      setDragOverlay({ x, y });
      return;
    }
    overlay.style.setProperty('--drag-x', `${x}px`);
    overlay.style.setProperty('--drag-y', `${y}px`);
  };

  const beginPointerDrag = (
    event: ReactPointerEvent<HTMLButtonElement>,
    playerId: string,
    origin: 'field' | 'bench',
  ) => {
    if (saving || !event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
    event.preventDefault();
    event.currentTarget.focus();
    pointerCleanupRef.current();
    const sourceRect = event.currentTarget.getBoundingClientRect();

    const session: PointerDragSession = {
      playerId,
      origin,
      pointerId: event.pointerId,
      source: event.currentTarget,
      startX: event.clientX,
      startY: event.clientY,
      grabOffsetX: sourceRect.width > 0 ? event.clientX - sourceRect.left : 0,
      grabOffsetY: sourceRect.height > 0 ? event.clientY - sourceRect.top : 0,
      active: false,
    };
    pointerSessionRef.current = session;
    event.currentTarget.setPointerCapture?.(event.pointerId);

    const handlePointerMove = (pointerEvent: PointerEvent) => {
      if (pointerEvent.pointerId !== session.pointerId) return;
      const distance = Math.hypot(
        pointerEvent.clientX - session.startX,
        pointerEvent.clientY - session.startY,
      );
      if (!session.active && distance < POINTER_DRAG_THRESHOLD) return;
      pointerEvent.preventDefault();
      if (!session.active) {
        session.active = true;
        setDragSession({ playerId: session.playerId, origin: session.origin });
        setSelectedPlayerId(null);
        onFocusPlayer(session.playerId);
        announce(
          `${playerById.get(session.playerId)?.shortName ?? 'Jogador'} em movimento. Solte no campo ou sobre outro jogador; Escape cancela.`,
        );
      }
      updateDragOverlayPosition(session, pointerEvent.clientX, pointerEvent.clientY);
      updateDragFeedback(resolveDragDestination(pointerEvent.clientX, pointerEvent.clientY));
    };

    const handlePointerUp = (pointerEvent: PointerEvent) => {
      if (pointerEvent.pointerId !== session.pointerId) return;
      if (!session.active) {
        finishDrag();
        return;
      }
      pointerEvent.preventDefault();
      suppressClickRef.current = session.playerId;
      const destination = resolveDragDestination(pointerEvent.clientX, pointerEvent.clientY);
      if (destination.kind === 'player') {
        applyPlayerDrop(session, destination.playerId);
      } else if (destination.kind === 'field') {
        const point = pointFromClient(pointerEvent.clientX, pointerEvent.clientY);
        if (point) applyFieldPoint(session.playerId, point);
        else announce('Não foi possível calcular o destino no campo.', true);
      } else if (destination.kind === 'bench') {
        announce('O banco está completo. Solte o titular sobre uma reserva para trocar.', true);
      } else {
        announce('Movimento cancelado fora da área tática. O plano anterior foi preservado.');
      }
      finishDrag();
      window.setTimeout(() => {
        if (suppressClickRef.current === session.playerId) suppressClickRef.current = null;
      }, 0);
    };

    const handlePointerCancel = (pointerEvent: PointerEvent) => {
      if (pointerEvent.pointerId !== session.pointerId) return;
      if (session.active) announce('Movimento cancelado. O plano anterior foi preservado.');
      finishDrag();
    };

    window.addEventListener('pointermove', handlePointerMove, { capture: true, passive: false });
    window.addEventListener('pointerup', handlePointerUp, { capture: true, passive: false });
    window.addEventListener('pointercancel', handlePointerCancel, { capture: true });
    pointerCleanupRef.current = () => {
      window.removeEventListener('pointermove', handlePointerMove, true);
      window.removeEventListener('pointerup', handlePointerUp, true);
      window.removeEventListener('pointercancel', handlePointerCancel, true);
      if (session.source.hasPointerCapture?.(session.pointerId)) {
        session.source.releasePointerCapture?.(session.pointerId);
      }
    };
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
    const nextX = clamp(x);
    const nextY = clamp(y);
    if (nextX === placement.normalizedX && nextY === placement.normalizedY) {
      announce('Movimento inválido: o jogador já está no limite permitido do campo.', true);
      return;
    }
    const horizontal = Math.round(nextX * 100);
    const vertical = Math.round(nextY * 100);
    commit(
      movePlayerFreely(draft, playerId, nextX, nextY),
      `${playerById.get(playerId)?.shortName ?? 'Jogador'} foi movido com o teclado para ${horizontal}% do comprimento e ${vertical}% da largura.`,
      true,
    );
  };

  const applyFormation = (formation: Formation, baseDraft = draft) => {
    if (formation === baseDraft.formation && !baseDraft.customFormation.isCustom) return true;
    try {
      onDraftChange(applyPresetToPlan(baseDraft, formation, state.players));
      setSelectedPlayerId(null);
      setFormationPickerOpen(false);
      setFormationQuery('');
      setPendingFormation(null);
      announce(`Preset ${formation} aplicado como ponto de partida editável.`);
      return true;
    } catch (reason) {
      announce(reason instanceof Error ? reason.message : String(reason), true);
      return false;
    }
  };

  const selectFormation = (formation: Formation) => {
    if (formation === draft.formation && !draft.customFormation.isCustom) {
      setFormationPickerOpen(false);
      return;
    }
    if (dirty) {
      setFormationPickerOpen(false);
      setPendingFormation(formation);
      return;
    }
    applyFormation(formation);
  };

  const saveBeforeApplyingFormation = async () => {
    if (!pendingFormation) return;
    setFormationSaving(true);
    const savedDraft = await onSave();
    setFormationSaving(false);
    if (!savedDraft) {
      announce('Não foi possível salvar o plano atual. O novo preset não foi aplicado.', true);
      return;
    }
    applyFormation(pendingFormation, savedDraft);
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
        if (
          event.key !== 'Escape' ||
          (!selectedPlayerId && !dragSession && !pointerSessionRef.current?.active)
        )
          return;
        event.preventDefault();
        setSelectedPlayerId(null);
        finishDrag();
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
        <div className="formation-picker">
          <span className="formation-picker__label">Formação</span>
          <Popover
            align="start"
            closeLabel="Fechar formações"
            contentClassName="formation-picker__popover"
            initialFocusId="formation-search"
            onOpenChange={(open) => {
              setFormationPickerOpen(open);
              if (!open) setFormationQuery('');
            }}
            open={formationPickerOpen}
            title="Escolher formação"
            triggerAccessibleLabel={`Formação: ${draft.formation}. Abrir biblioteca`}
            triggerClassName="formation-picker__trigger"
            triggerContent={
              <>
                <strong>{draft.formation}</strong>
                <span aria-hidden="true">⌄</span>
              </>
            }
            triggerDisabled={saving}
            triggerLabel={draft.formation}
          >
            <div className="formation-picker__search">
              <Icon name="search" size={16} />
              <input
                aria-label="Buscar formação"
                autoComplete="off"
                id="formation-search"
                onChange={(event) => setFormationQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== 'ArrowDown') return;
                  event.preventDefault();
                  document.querySelector<HTMLButtonElement>('.formation-picker__option')?.focus();
                }}
                placeholder="Buscar por nome ou estilo"
                type="search"
                value={formationQuery}
              />
            </div>
            <div
              aria-label="Formações disponíveis"
              className="formation-picker__list"
              onKeyDown={(event) => {
                if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
                const options = [
                  ...event.currentTarget.querySelectorAll<HTMLButtonElement>(
                    '.formation-picker__option',
                  ),
                ];
                if (options.length === 0) return;
                event.preventDefault();
                const index = options.indexOf(document.activeElement as HTMLButtonElement);
                const nextIndex =
                  event.key === 'Home'
                    ? 0
                    : event.key === 'End'
                      ? options.length - 1
                      : event.key === 'ArrowDown'
                        ? (index + 1 + options.length) % options.length
                        : (index - 1 + options.length) % options.length;
                options[nextIndex]?.focus();
              }}
              role="listbox"
            >
              {familyOrder.map((family) => {
                const options = filteredFormationPresets.filter(
                  (preset) => preset.family === family,
                );
                if (options.length === 0) return null;
                return (
                  <section className="formation-picker__family" key={family}>
                    <h4>{options[0]?.familyLabel}</h4>
                    {options.map((option) => (
                      <button
                        aria-selected={option.id === draft.formation}
                        className="formation-picker__option"
                        key={option.id}
                        onClick={() => selectFormation(option.id)}
                        role="option"
                        type="button"
                      >
                        <span className="formation-picker__option-copy">
                          <strong>{option.name}</strong>
                          <small>{option.description}</small>
                        </span>
                        <span aria-hidden="true" className="formation-preview">
                          {option.slots.map((slot) => (
                            <i
                              key={slot.id}
                              style={
                                {
                                  '--preview-x': `${slot.x * 100}%`,
                                  '--preview-y': `${slot.y * 100}%`,
                                } as CSSProperties
                              }
                            />
                          ))}
                        </span>
                        {option.id === draft.formation && <Icon name="check" size={16} />}
                      </button>
                    ))}
                  </section>
                );
              })}
              {filteredFormationPresets.length === 0 && (
                <p className="formation-picker__empty">Nenhuma formação encontrada.</p>
              )}
            </div>
          </Popover>
          <small title={activePreset?.description}>{activePreset?.description}</small>
        </div>
        <label className="tactics-select">
          <span>Leitura do campo</span>
          <select
            aria-label="Leitura do campo"
            onChange={(event) => onPitchModeChange(event.target.value as PitchMode)}
            value={pitchMode}
          >
            <option value="roles">Posição nominal</option>
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
          onClick={() => void onSave()}
          variant="primary"
        >
          Salvar plano
        </Button>
      </section>

      <AlertDialogPrimitive.Root
        onOpenChange={(open) => {
          if (!open && !formationSaving) setPendingFormation(null);
        }}
        open={pendingFormation !== null}
      >
        <AlertDialogPrimitive.Portal>
          <AlertDialogPrimitive.Overlay className="rv-modal-backdrop" />
          <AlertDialogPrimitive.Content className="rv-dialog rv-alert-dialog formation-change-dialog">
            <AlertDialogPrimitive.Title>Aplicar {pendingFormation}?</AlertDialogPrimitive.Title>
            <AlertDialogPrimitive.Description className="rv-dialog__description">
              Este preset substitui os ajustes livres ainda não salvos. Você pode salvar o plano
              atual antes, aplicar sem salvar ou cancelar.
            </AlertDialogPrimitive.Description>
            <div className="rv-dialog__actions formation-change-dialog__actions">
              <AlertDialogPrimitive.Cancel asChild>
                <Button disabled={formationSaving} variant="secondary">
                  Cancelar
                </Button>
              </AlertDialogPrimitive.Cancel>
              <AlertDialogPrimitive.Action asChild>
                <Button
                  disabled={formationSaving}
                  onClick={() => {
                    if (pendingFormation) applyFormation(pendingFormation);
                  }}
                  variant="secondary"
                >
                  Aplicar sem salvar
                </Button>
              </AlertDialogPrimitive.Action>
              <Button
                disabled={formationSaving}
                loading={formationSaving}
                loadingLabel="Salvando plano…"
                onClick={() => void saveBeforeApplyingFormation()}
                variant="primary"
              >
                Salvar atual e aplicar
              </Button>
            </div>
          </AlertDialogPrimitive.Content>
        </AlertDialogPrimitive.Portal>
      </AlertDialogPrimitive.Root>

      <div className="tactics-layout">
        <section className="pitch-workspace" aria-labelledby="pitch-title">
          <header className="pitch-workspace__header">
            <div>
              <h2 id="pitch-title">Campo tático livre</h2>
              <p>
                Clique para selecionar; arraste para mover ou trocar. Alt + setas reposiciona e
                Escape cancela.
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
              data-drop-valid={dragDestination.kind === 'field' || undefined}
              data-pitch-mode={pitchMode}
              onClick={(event) => {
                if (!selectedPlayerId || event.target !== event.currentTarget) return;
                const point = pointFromClient(event.clientX, event.clientY);
                if (point) applyFieldPoint(selectedPlayerId, point);
              }}
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
                      : positionLabels[player.position];
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
                    style={style}
                  >
                    <span className="pitch-slot__position">
                      {positionLabels[placement.positionId]}
                    </span>
                    <button
                      aria-label={`${positionLabels[placement.positionId]}: ${player.name}, ${fit.label}. Selecione para mover.`}
                      aria-pressed={selectedPlayerId === player.id}
                      className="pitch-player-card"
                      data-tactical-player-id={player.id}
                      data-tactical-player-origin="field"
                      disabled={saving}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (suppressClickRef.current === player.id) return;
                        choosePlayer(player.id);
                      }}
                      onKeyDown={(event) => handlePlayerKeyboard(event, player.id)}
                      onPointerDown={(event) => beginPointerDrag(event, player.id, 'field')}
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
            data-drop-invalid={dragDestination.kind === 'bench' || undefined}
            ref={benchRef}
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
                    >
                      <button
                        aria-label={`Selecionar reserva ${player.name}`}
                        aria-pressed={selectedPlayerId === player.id}
                        className="bench-player"
                        data-tactical-player-id={player.id}
                        data-tactical-player-origin="bench"
                        disabled={saving}
                        onClick={() => {
                          if (suppressClickRef.current === player.id) return;
                          choosePlayer(player.id);
                        }}
                        onPointerDown={(event) => beginPointerDrag(event, player.id, 'bench')}
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

          {dragSession && dragOverlay && draggedPlayer && (
            <div
              aria-hidden="true"
              className="tactical-drag-overlay"
              data-origin={dragSession.origin}
              ref={dragOverlayRef}
              style={
                {
                  '--drag-x': `${dragOverlay.x}px`,
                  '--drag-y': `${dragOverlay.y}px`,
                } as CSSProperties
              }
            >
              <span className="tactical-drag-overlay__face">
                <PlayerFace
                  decorative
                  index={draggedPlayerIndex}
                  name={draggedPlayer.name}
                  size={44}
                />
                <b>{draggedPlayer.shirtNumber}</b>
              </span>
              <span className="tactical-drag-overlay__copy">
                <strong>{pitchPlayerName(draggedPlayer)}</strong>
                <small>
                  {positionLabels[draggedPlacement?.positionId ?? draggedPlayer.position]} ·
                  Condição {draggedPlayer.condition}%
                </small>
              </span>
              <span className="tactical-drag-overlay__destination">
                {dragDestination.kind === 'player'
                  ? `Trocar com ${playerById.get(dragDestination.playerId)?.shortName}`
                  : dragDestination.kind === 'field'
                    ? dragSession.origin === 'field'
                      ? 'Mover para coordenada livre'
                      : 'Substituir o titular mais próximo'
                    : dragDestination.kind === 'bench'
                      ? 'Solte sobre uma reserva'
                      : 'Fora da área — solte para cancelar'}
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
