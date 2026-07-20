import { Icon } from '@rivallo/icons';
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';

import { Button } from '../ui/primitives/actions.js';
import { Popover } from '../ui/primitives/disclosure.js';
import { loadTacticalStrategyCatalog, previewTacticalPlan } from './client.js';
import { positionLabels, type PitchMode, type TacticalTool } from './matchday-ui.js';
import { PlayerFace } from './PlayerFace.js';
import {
  applyPresetToPlan,
  findNearestStarter,
  formationPresets,
  movePlayerFreely,
  previewPresetApplication,
  reorderBench,
  substitutePlayers,
  swapStarters,
  validateTacticalDraft,
  toTacticalPlanProposal,
  type FormationFamily,
} from './tactics-model.js';
import type {
  Formation,
  MatchdayState,
  Player,
  TacticalApproach,
  TacticalGamePhase,
  TacticalInstruction,
  TacticalInstructionCategory,
  TacticalInstructionScope,
  TacticalModelConfig,
  TacticalPlanPreview,
  TacticalPlanSnapshot,
  TacticalStrategyPresetId,
  TacticalStrategyPresetSummary,
  TacticalVariationLibrarySnapshot,
} from './types.js';

interface TacticsWorkspaceProps {
  readonly state: MatchdayState;
  readonly library: TacticalVariationLibrarySnapshot;
  readonly draft: TacticalPlanSnapshot;
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
  readonly onCreateVariation: (
    mode: 'preset' | 'current' | 'duplicate',
    name: string,
  ) => Promise<boolean>;
  readonly onDeleteVariation: (variationId: string) => Promise<boolean>;
  readonly onRenameVariation: (name: string) => Promise<boolean>;
  readonly onSetPrimaryVariation: (variationId: string) => Promise<boolean>;
  readonly onSwitchVariation: (variationId: string) => Promise<boolean>;
}

type VariationNameMode = 'preset' | 'current' | 'duplicate' | 'rename';

interface DragSession {
  readonly playerId: string;
  readonly origin: 'field' | 'bench';
}

interface PointerDragSession extends DragSession {
  readonly pointerId: number;
  readonly source: HTMLButtonElement;
  readonly sourceRect: DOMRect;
  pitchRect: DOMRect;
  benchRect: DOMRect | null;
  readonly overlay: HTMLDivElement;
  readonly overlayOriginX: number;
  readonly overlayOriginY: number;
  readonly overlayScaleX: number;
  readonly overlayScaleY: number;
  readonly destinationLabel: HTMLSpanElement;
  readonly previousUserSelect: string;
  readonly startX: number;
  readonly startY: number;
  readonly grabOffsetX: number;
  readonly grabOffsetY: number;
  active: boolean;
  animationFrame: number | null;
  destination: DragDestination;
  dropTarget: HTMLElement | null;
  latestClientX: number;
  latestClientY: number;
  overlayLeft: number;
  overlayTop: number;
}

type DragDestination =
  | { readonly kind: 'field' }
  | { readonly kind: 'player'; readonly playerId: string }
  | { readonly kind: 'bench' }
  | { readonly kind: 'outside' };

interface TacticalDragMetrics {
  authoritativeValidations: number;
  collisionCalculations: number;
  fieldCardRenders: number;
  layoutReads: number;
  pointerMoves: number;
  readinessCalculations: number;
  reactStateUpdates: number;
  persistenceCalls: number;
  tooltipCreations: number;
  draggedCardRenders: number;
  inspectorRenders: number;
  workspaceRenders: number;
}

declare global {
  interface Window {
    __RIVALLO_TACTICS_DRAG_METRICS__?: TacticalDragMetrics;
  }
}

const recordDragMetric = (metric: keyof TacticalDragMetrics, amount = 1) => {
  const metrics = window.__RIVALLO_TACTICS_DRAG_METRICS__;
  if (metrics) metrics[metric] += amount;
};

const phaseOptions: readonly { readonly id: TacticalGamePhase; readonly label: string }[] = [
  { id: 'base', label: 'Posição base' },
  { id: 'inPossession', label: 'Com posse' },
  { id: 'outOfPossession', label: 'Sem posse' },
  { id: 'offensiveTransition', label: 'Transição +' },
  { id: 'defensiveTransition', label: 'Transição −' },
];

const presetApproach: Record<TacticalStrategyPresetId, TacticalApproach> = {
  balanced: 'balanced',
  protagonist: 'frontFoot',
  compact: 'compact',
};

const presetLabels: Record<TacticalStrategyPresetId, string> = {
  balanced: 'Equilibrada',
  protagonist: 'Protagonista',
  compact: 'Compacta',
};

const scoreOptions = [30, 45, 60, 75, 90] as const;

const tacticalTools: readonly [TacticalTool, TacticalTool, string][] = [
  ['analysis', 'analysis', 'Análise'],
  ['tactics', 'tactics', 'Estratégia'],
  ['instructions', 'instructions', 'Instruções'],
  ['opposition', 'opposition', 'Oposição'],
];

const familyOrder: readonly FormationFamily[] = ['backFour', 'backThree', 'backFive'];
const POINTER_DRAG_THRESHOLD = 4;
const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const average = (values: readonly number[]) =>
  Math.round(values.reduce((total, value) => total + value, 0) / Math.max(values.length, 1));

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
  library,
  draft,
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
  onCreateVariation,
  onDeleteVariation,
  onRenameVariation,
  onSetPrimaryVariation,
  onSwitchVariation,
}: TacticsWorkspaceProps) {
  recordDragMetric('workspaceRenders');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [formationPickerOpen, setFormationPickerOpen] = useState(false);
  const [formationQuery, setFormationQuery] = useState('');
  const [pendingFormation, setPendingFormation] = useState<Formation | null>(null);
  const [variationPickerOpen, setVariationPickerOpen] = useState(false);
  const [variationNameMode, setVariationNameMode] = useState<VariationNameMode | null>(null);
  const [variationName, setVariationName] = useState('');
  const [variationActionBusy, setVariationActionBusy] = useState(false);
  const [pendingVariationId, setPendingVariationId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [interactionMessage, setInteractionMessage] = useState('');
  const [interactionError, setInteractionError] = useState('');
  const [selectedPhase, setSelectedPhase] = useState<TacticalGamePhase>('base');
  const [advancedStrategyOpen, setAdvancedStrategyOpen] = useState(false);
  const [strategyCatalog, setStrategyCatalog] = useState<readonly TacticalStrategyPresetSummary[]>(
    [],
  );
  const [pendingStrategyPreset, setPendingStrategyPreset] =
    useState<TacticalStrategyPresetSummary | null>(null);
  const [semanticPreview, setSemanticPreview] = useState<TacticalPlanPreview | null>(null);
  const [semanticBusy, setSemanticBusy] = useState(false);
  const semanticOperationRef = useRef(0);
  const [instructionScope, setInstructionScope] = useState<TacticalInstructionScope>('collective');
  const [instructionCategory, setInstructionCategory] =
    useState<TacticalInstructionCategory>('circulation');
  const [instructionValue, setInstructionValue] = useState('supported');
  const pitchRef = useRef<HTMLOListElement>(null);
  const benchRef = useRef<HTMLElement>(null);
  const pointerSessionRef = useRef<PointerDragSession | null>(null);
  const pointerCleanupRef = useRef<() => void>(() => undefined);
  const suppressClickRef = useRef<string | null>(null);

  const playerById = useMemo(
    () => new Map(state.players.map((player) => [player.id, player] as const)),
    [state.players],
  );
  const validation = useMemo(() => {
    recordDragMetric('authoritativeValidations');
    return validateTacticalDraft(draft, state.players);
  }, [draft, state.players]);
  const activePreset =
    formationPresets.find(({ id }) => id === draft.formation) ?? formationPresets[0];
  const pendingFormationPreview = useMemo(
    () =>
      pendingFormation ? previewPresetApplication(draft, pendingFormation, state.players) : null,
    [draft, pendingFormation, state.players],
  );
  const normalizedFormationQuery = normalizeSearch(formationQuery);
  const filteredFormationPresets = formationPresets.filter((preset) => {
    if (!normalizedFormationQuery) return true;
    return normalizeSearch(
      [preset.name, preset.description, preset.familyLabel, ...preset.tags].join(' '),
    ).includes(normalizedFormationQuery);
  });
  const focusedPlayer =
    selectedPlayerId && focusedPlayerId === selectedPlayerId
      ? playerById.get(selectedPlayerId)
      : undefined;
  const selectedPlayer = selectedPlayerId ? playerById.get(selectedPlayerId) : undefined;
  const averageCondition = average(
    draft.placements.map(({ playerId }) => playerById.get(playerId)?.condition ?? 0),
  );
  const model = semanticPreview?.model ?? draft.tacticalModel;
  if (!model) throw new Error('O plano tático não possui a projeção autoritativa da Fase 06.3.');
  const readiness = model.diagnostic.readiness;
  const activePhase =
    model.structures.find(({ phase }) => phase === selectedPhase) ?? model.structures[0];
  const phasePlayerById = new Map(
    activePhase?.players.map((player) => [player.playerId, player] as const) ?? [],
  );

  useEffect(() => {
    let active = true;
    void loadTacticalStrategyCatalog()
      .then((catalog) => {
        if (active) setStrategyCatalog(catalog);
      })
      .catch(() => {
        if (active) setInteractionError('O catálogo de estratégia não pôde ser carregado.');
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(
    () => () => {
      pointerCleanupRef.current();
    },
    [],
  );

  useEffect(() => {
    semanticOperationRef.current += 1;
    setSemanticPreview(null);
    setSemanticBusy(false);
    setSelectedPhase('base');
  }, [draft.variationId]);

  useEffect(() => {
    if (!dirty) {
      semanticOperationRef.current += 1;
      setSemanticPreview(null);
      setSemanticBusy(false);
    }
  }, [dirty, draft.revision]);

  const announce = (text: string, rejected = false) => {
    setInteractionMessage(rejected ? '' : text);
    setInteractionError(rejected ? text : '');
  };

  const invalidateSemanticPreview = () => {
    semanticOperationRef.current += 1;
    setSemanticPreview(null);
    setSemanticBusy(false);
  };

  const applyTacticalConfig = async (tacticalConfig: TacticalModelConfig, text: string) => {
    const operation = ++semanticOperationRef.current;
    setSemanticBusy(true);
    setInteractionError('');
    try {
      const nextApproach = presetApproach[tacticalConfig.strategy.presetId];
      const candidate = {
        ...draft,
        tacticalModel: { ...model, config: tacticalConfig },
      };
      const preview = await previewTacticalPlan(toTacticalPlanProposal(candidate, nextApproach));
      if (operation !== semanticOperationRef.current) return;
      setSemanticPreview(preview);
      onApproachChange(nextApproach);
      onDraftChange({ ...draft, tacticalModel: preview.model });
      announce(text);
    } catch (reason) {
      if (operation !== semanticOperationRef.current) return;
      announce(reason instanceof Error ? reason.message : String(reason), true);
    } finally {
      if (operation === semanticOperationRef.current) setSemanticBusy(false);
    }
  };

  const refreshTacticalProjection = async (candidate: TacticalPlanSnapshot, text: string) => {
    const operation = ++semanticOperationRef.current;
    const candidateModel = candidate.tacticalModel ?? model;
    const nextApproach = presetApproach[candidateModel.config.strategy.presetId];
    setSemanticBusy(true);
    setInteractionError('');
    try {
      const preview = await previewTacticalPlan(
        toTacticalPlanProposal({ ...candidate, tacticalModel: candidateModel }, nextApproach),
      );
      if (operation !== semanticOperationRef.current) return;
      setSemanticPreview(preview);
      announce(`${text} Diagnóstico e familiaridade recalculados.`);
    } catch (reason) {
      if (operation !== semanticOperationRef.current) return;
      const detail = reason instanceof Error ? reason.message : String(reason);
      announce(
        `A alteração foi mantida, mas o diagnóstico não pôde ser atualizado: ${detail}`,
        true,
      );
    } finally {
      if (operation === semanticOperationRef.current) setSemanticBusy(false);
    }
  };

  const updateStrategyScore = (
    section: 'inPossession' | 'outOfPossession' | 'transitions',
    field: string,
    value: number,
  ) => {
    const strategy = model.config.strategy;
    const nextSection = { ...strategy[section], [field]: value };
    void applyTacticalConfig(
      {
        ...model.config,
        strategy: { ...strategy, customized: true, [section]: nextSection },
      },
      'Estratégia personalizada; consequências recalculadas pelo modelo tático.',
    );
  };

  const toggleInstruction = (instruction: TacticalInstruction) => {
    void applyTacticalConfig(
      {
        ...model.config,
        instructions: model.config.instructions.filter(
          ({ instructionId }) => instructionId !== instruction.instructionId,
        ),
      },
      `${instruction.description} removida desta variação.`,
    );
  };

  const addInstruction = () => {
    const placement = selectedPlayerId
      ? draft.placements.find(({ playerId }) => playerId === selectedPlayerId)
      : undefined;
    const target =
      instructionScope === 'collective'
        ? 'team'
        : instructionScope === 'sector'
          ? 'midfield'
          : instructionScope === 'position'
            ? (placement?.positionId ?? 'CM')
            : instructionScope === 'role'
              ? (placement?.roleId ?? 'default')
              : selectedPlayerId;
    if (!target) {
      announce('Selecione um jogador antes de criar uma instrução individual.', true);
      return;
    }
    const ordinal = model.config.instructions.length + 1;
    const instruction: TacticalInstruction = {
      instructionId: `${instructionScope}.${instructionCategory}.${draft.revision}.${ordinal}`,
      category: instructionCategory,
      scope: instructionScope,
      target,
      value: instructionValue.trim() || 'balanced',
      intensity: 60,
      description: `${instructionCategory} em escopo ${instructionScope} para ${target}`,
      expectedEffects: ['comportamento resolvido conforme escopo e precedência'],
      requirements: [],
      incompatibilities: [],
      precedence: 0,
      familiarityImpact: -2,
      revision: draft.revision,
    };
    void applyTacticalConfig(
      { ...model.config, instructions: [...model.config.instructions, instruction] },
      `Instrução ${instruction.instructionId} adicionada à variação.`,
    );
  };

  const commit = (next: TacticalPlanSnapshot, text: string, preserveSelection = false) => {
    recordDragMetric('authoritativeValidations');
    const nextValidation = validateTacticalDraft(next, state.players);
    if (!nextValidation.valid) {
      announce(nextValidation.errors[0] ?? 'Esse destino não é válido.', true);
      return false;
    }
    invalidateSemanticPreview();
    onDraftChange(next);
    if (!preserveSelection) setSelectedPlayerId(null);
    announce(text);
    void refreshTacticalProjection(next, text);
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

  const pointFromRect = (clientX: number, clientY: number, rect: DOMRect | null) => {
    if (!rect || rect.width <= 0 || rect.height <= 0) return null;
    return {
      x: clamp((clientX - rect.left) / rect.width),
      y: clamp((clientY - rect.top) / rect.height),
    };
  };

  const pointFromClient = (clientX: number, clientY: number) => {
    recordDragMetric('layoutReads');
    return pointFromRect(clientX, clientY, pitchRef.current?.getBoundingClientRect() ?? null);
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
  };

  const containsClientPoint = (rect: DOMRect | null, clientX: number, clientY: number) =>
    Boolean(
      rect &&
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom,
    );

  const resolveDragDestination = (
    session: PointerDragSession,
    clientX: number,
    clientY: number,
  ): DragDestination => {
    const hit = document.elementFromPoint?.(clientX, clientY);
    const playerTarget = hit?.closest<HTMLElement>('[data-tactical-player-id]');
    const playerId = playerTarget?.dataset.tacticalPlayerId;
    if (playerId && playerId !== session.playerId) return { kind: 'player', playerId };
    if (containsClientPoint(session.pitchRect, clientX, clientY)) return { kind: 'field' };
    if (containsClientPoint(session.benchRect, clientX, clientY)) return { kind: 'bench' };
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

  const updateDragFeedback = (session: PointerDragSession, destination: DragDestination) => {
    session.dropTarget?.removeAttribute('data-drop-active');
    session.dropTarget = null;
    session.destination = destination;
    pitchRef.current?.toggleAttribute('data-drop-valid', destination.kind === 'field');
    benchRef.current?.toggleAttribute('data-drop-invalid', destination.kind === 'bench');

    if (destination.kind === 'player') {
      const target = [...document.querySelectorAll<HTMLElement>('[data-tactical-player-id]')].find(
        ({ dataset }) => dataset.tacticalPlayerId === destination.playerId,
      );
      session.dropTarget = target?.closest<HTMLElement>('li') ?? null;
      session.dropTarget?.setAttribute('data-drop-active', 'true');
      session.destinationLabel.textContent = `Trocar com ${playerById.get(destination.playerId)?.shortName ?? 'jogador'}`;
    } else if (destination.kind === 'field') {
      session.destinationLabel.textContent =
        session.origin === 'field' ? 'Posição livre' : 'Substituir titular mais próximo';
    } else if (destination.kind === 'bench') {
      session.destinationLabel.textContent = 'Solte sobre uma reserva';
    } else {
      session.destinationLabel.textContent = 'Fora da área · solte para cancelar';
    }
  };

  const updateDragOverlayPosition = (
    session: PointerDragSession,
    clientX: number,
    clientY: number,
  ) => {
    session.overlayLeft = clientX - session.grabOffsetX;
    session.overlayTop = clientY - session.grabOffsetY;
    const localX = (session.overlayLeft - session.overlayOriginX) / session.overlayScaleX;
    const localY = (session.overlayTop - session.overlayOriginY) / session.overlayScaleY;
    session.overlay.style.transform = `translate3d(${localX}px, ${localY}px, 0)`;
  };

  const latestPointerCoordinates = (pointerEvent: PointerEvent) => {
    const samples = pointerEvent.getCoalescedEvents?.() ?? [];
    const latest = samples.at(-1) ?? pointerEvent;
    return { clientX: latest.clientX, clientY: latest.clientY };
  };

  const flushPointerFrame = (session: PointerDragSession) => {
    session.animationFrame = null;
    updateDragOverlayPosition(session, session.latestClientX, session.latestClientY);
    updateDragFeedback(
      session,
      resolveDragDestination(session, session.latestClientX, session.latestClientY),
    );
  };

  const activatePointerSession = (session: PointerDragSession) => {
    if (session.active) return;
    session.active = true;
    session.overlay.hidden = false;
    session.source.setAttribute('aria-grabbed', 'true');
    session.source.setAttribute('data-drag-source', 'true');
    pitchRef.current?.setAttribute('data-dragging', 'true');
    if (session.origin === 'field') benchRef.current?.setAttribute('data-dragging', 'true');
  };

  const createDragOverlay = (source: HTMLButtonElement, sourceRect: DOMRect) => {
    const overlay = document.createElement('div');
    overlay.className = 'tactical-drag-overlay';
    overlay.style.width = '100px';
    overlay.style.height = '100px';
    overlay.style.pointerEvents = 'none';
    overlay.style.transition = 'none';
    overlay.style.animation = 'none';
    overlay.style.transform = 'none';
    overlay.style.visibility = 'hidden';
    const card = source.cloneNode(true) as HTMLButtonElement;
    card.classList.add('tactical-drag-overlay__card');
    card.removeAttribute('data-tactical-player-id');
    card.removeAttribute('data-tactical-player-origin');
    card.removeAttribute('aria-pressed');
    card.removeAttribute('aria-label');
    card.tabIndex = -1;
    card.disabled = true;
    const destinationLabel = document.createElement('span');
    destinationLabel.className = 'tactical-drag-overlay__destination';
    destinationLabel.textContent = 'Movendo jogador';
    overlay.append(card, destinationLabel);
    document.body.append(overlay);
    const calibrationRect = overlay.getBoundingClientRect();
    const overlayScaleX = calibrationRect.width > 0 ? calibrationRect.width / 100 : 1;
    const overlayScaleY = calibrationRect.height > 0 ? calibrationRect.height / 100 : 1;
    const overlayOriginX = calibrationRect.left;
    const overlayOriginY = calibrationRect.top;
    overlay.style.width = `${sourceRect.width / overlayScaleX}px`;
    overlay.style.height = `${sourceRect.height / overlayScaleY}px`;
    overlay.style.transform = `translate3d(${(sourceRect.left - overlayOriginX) / overlayScaleX}px, ${(sourceRect.top - overlayOriginY) / overlayScaleY}px, 0)`;
    overlay.style.visibility = '';
    overlay.hidden = true;
    return {
      destinationLabel,
      overlay,
      overlayOriginX,
      overlayOriginY,
      overlayScaleX,
      overlayScaleY,
    };
  };

  const beginPointerDrag = (
    event: ReactPointerEvent<HTMLButtonElement>,
    playerId: string,
    origin: 'field' | 'bench',
  ) => {
    if (
      saving ||
      selectedPhase !== 'base' ||
      !event.isPrimary ||
      (event.pointerType === 'mouse' && event.button !== 0)
    )
      return;
    event.preventDefault();
    event.currentTarget.focus();
    pointerCleanupRef.current();
    const measuredSourceRect = event.currentTarget.getBoundingClientRect();
    const fallbackWidth = origin === 'field' ? 128 : 208;
    const fallbackHeight = origin === 'field' ? 72 : 68;
    const sourceRect =
      measuredSourceRect.width > 0 && measuredSourceRect.height > 0
        ? measuredSourceRect
        : new DOMRect(
            event.clientX - fallbackWidth / 2,
            event.clientY - fallbackHeight / 2,
            fallbackWidth,
            fallbackHeight,
          );
    const pitchRect = pitchRef.current?.getBoundingClientRect();
    const benchRect = benchRef.current?.getBoundingClientRect() ?? null;
    recordDragMetric('layoutReads', 4);
    if (!pitchRect) return;
    const {
      destinationLabel,
      overlay,
      overlayOriginX,
      overlayOriginY,
      overlayScaleX,
      overlayScaleY,
    } = createDragOverlay(event.currentTarget, sourceRect);

    const session: PointerDragSession = {
      playerId,
      origin,
      pointerId: event.pointerId,
      source: event.currentTarget,
      sourceRect,
      pitchRect,
      benchRect,
      overlay,
      overlayOriginX,
      overlayOriginY,
      overlayScaleX,
      overlayScaleY,
      destinationLabel,
      previousUserSelect: document.documentElement.style.userSelect,
      startX: event.clientX,
      startY: event.clientY,
      grabOffsetX: sourceRect.width > 0 ? event.clientX - sourceRect.left : 0,
      grabOffsetY: sourceRect.height > 0 ? event.clientY - sourceRect.top : 0,
      active: false,
      animationFrame: null,
      destination: { kind: 'outside' },
      dropTarget: null,
      latestClientX: event.clientX,
      latestClientY: event.clientY,
      overlayLeft: sourceRect.left,
      overlayTop: sourceRect.top,
    };
    pointerSessionRef.current = session;
    document.documentElement.style.userSelect = 'none';
    event.currentTarget.setPointerCapture?.(event.pointerId);

    const handlePointerMove = (pointerEvent: PointerEvent) => {
      if (pointerEvent.pointerId !== session.pointerId) return;
      recordDragMetric('pointerMoves');
      const latest = latestPointerCoordinates(pointerEvent);
      session.latestClientX = latest.clientX;
      session.latestClientY = latest.clientY;
      const distance = Math.hypot(latest.clientX - session.startX, latest.clientY - session.startY);
      if (!session.active && distance < POINTER_DRAG_THRESHOLD) return;
      pointerEvent.preventDefault();
      if (!session.active) {
        updateDragOverlayPosition(session, latest.clientX, latest.clientY);
        activatePointerSession(session);
      }
      if (session.animationFrame === null) {
        session.animationFrame = window.requestAnimationFrame(() => flushPointerFrame(session));
      }
    };

    const handlePointerUp = (pointerEvent: PointerEvent) => {
      if (pointerEvent.pointerId !== session.pointerId) return;
      const latest = latestPointerCoordinates(pointerEvent);
      session.latestClientX = latest.clientX;
      session.latestClientY = latest.clientY;
      const distance = Math.hypot(latest.clientX - session.startX, latest.clientY - session.startY);
      if (!session.active && distance >= POINTER_DRAG_THRESHOLD) {
        updateDragOverlayPosition(session, latest.clientX, latest.clientY);
        activatePointerSession(session);
      }
      if (!session.active) {
        finishDrag();
        return;
      }
      pointerEvent.preventDefault();
      if (session.animationFrame !== null) {
        window.cancelAnimationFrame(session.animationFrame);
        session.animationFrame = null;
      }
      session.pitchRect = pitchRef.current?.getBoundingClientRect() ?? session.pitchRect;
      session.benchRect = benchRef.current?.getBoundingClientRect() ?? session.benchRect;
      flushPointerFrame(session);
      suppressClickRef.current = session.playerId;
      const destination = session.destination;
      const canonicalClientX = session.overlayLeft + session.sourceRect.width / 2;
      const canonicalClientY = session.overlayTop + session.sourceRect.height / 2;
      finishDrag();
      setSelectedPlayerId(null);
      onFocusPlayer(session.playerId);
      if (destination.kind === 'player') {
        applyPlayerDrop(session, destination.playerId);
      } else if (destination.kind === 'field') {
        const point = pointFromRect(canonicalClientX, canonicalClientY, session.pitchRect);
        if (point) applyFieldPoint(session.playerId, point);
        else announce('Não foi possível calcular o destino no campo.', true);
      } else if (destination.kind === 'bench') {
        announce('O banco está completo. Solte o titular sobre uma reserva para trocar.', true);
      } else {
        announce('Movimento cancelado fora da área tática. O plano anterior foi preservado.');
      }
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
      if (session.animationFrame !== null) window.cancelAnimationFrame(session.animationFrame);
      session.animationFrame = null;
      session.dropTarget?.removeAttribute('data-drop-active');
      session.source.removeAttribute('aria-grabbed');
      session.source.removeAttribute('data-drag-source');
      pitchRef.current?.removeAttribute('data-dragging');
      pitchRef.current?.removeAttribute('data-drop-valid');
      benchRef.current?.removeAttribute('data-dragging');
      benchRef.current?.removeAttribute('data-drop-invalid');
      session.overlay.remove();
      document.documentElement.style.userSelect = session.previousUserSelect;
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
    if (selectedPhase !== 'base') return;
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

  const applyFormation = (
    formation: Formation,
    baseDraft = draft,
    mode: 'geometry' | 'suggestion' = 'suggestion',
  ) => {
    if (formation === baseDraft.formation && !baseDraft.customFormation.isCustom) return true;
    try {
      onDraftChange(applyPresetToPlan(baseDraft, formation, state.players, mode));
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
    setFormationPickerOpen(false);
    setPendingFormation(formation);
  };

  const restoreSourcePreset = () => {
    if (!draft.sourcePresetId) return;
    if (dirty && !window.confirm('Restaurar o preset de origem e descartar a forma livre atual?'))
      return;
    onDraftChange(applyPresetToPlan(draft, draft.sourcePresetId, state.players));
    announce(`Preset ${draft.sourcePresetId} restaurado.`);
  };

  const openVariationNameDialog = (mode: VariationNameMode) => {
    const defaults: Record<VariationNameMode, string> = {
      preset: `${draft.formation} Base`,
      current: `${draft.name} Variação`,
      duplicate: `${draft.name} Cópia`,
      rename: draft.name,
    };
    setVariationName(defaults[mode]);
    setVariationNameMode(mode);
    setVariationPickerOpen(false);
  };

  const normalizedVariationName = variationName.trim();
  const variationNameTaken = library.variations.some(
    (variation) =>
      variation.name.toLocaleLowerCase('pt-BR') ===
        normalizedVariationName.toLocaleLowerCase('pt-BR') &&
      (variationNameMode !== 'rename' || variation.variationId !== draft.variationId),
  );
  const variationNameError =
    normalizedVariationName.length === 0
      ? 'Informe um nome para a variação.'
      : normalizedVariationName.length > 80
        ? 'Use no máximo 80 caracteres.'
        : variationNameTaken
          ? 'Já existe uma variação com esse nome.'
          : '';

  const submitVariationName = async () => {
    if (!variationNameMode || variationNameError) return;
    setVariationActionBusy(true);
    const succeeded =
      variationNameMode === 'rename'
        ? await onRenameVariation(normalizedVariationName)
        : await onCreateVariation(variationNameMode, normalizedVariationName);
    setVariationActionBusy(false);
    if (succeeded) setVariationNameMode(null);
  };

  const switchVariation = async (variationId: string) => {
    if (variationId === library.activeVariationId || saving) return;
    setVariationPickerOpen(false);
    if (dirty) {
      setPendingVariationId(variationId);
      return;
    }
    setVariationActionBusy(true);
    await onSwitchVariation(variationId);
    setVariationActionBusy(false);
  };

  const completePendingSwitch = async (saveFirst: boolean) => {
    if (!pendingVariationId) return;
    setVariationActionBusy(true);
    if (saveFirst) {
      const saved = await onSave();
      if (!saved) {
        setVariationActionBusy(false);
        return;
      }
    } else {
      invalidateSemanticPreview();
      onDiscard();
    }
    const switched = await onSwitchVariation(pendingVariationId);
    setVariationActionBusy(false);
    if (switched) setPendingVariationId(null);
  };

  const deleteVariation = async () => {
    if (!pendingDeleteId) return;
    setVariationActionBusy(true);
    const deleted = await onDeleteVariation(pendingDeleteId);
    setVariationActionBusy(false);
    if (deleted) setPendingDeleteId(null);
  };

  const activeIsPrimary = library.primaryVariationId === draft.variationId;
  const primaryVariation = library.variations.find(
    ({ variationId }) => variationId === library.primaryVariationId,
  );
  const secondaryVariations = library.variations.filter(
    ({ variationId }) => variationId !== library.primaryVariationId,
  );
  const primaryReplacement = [...secondaryVariations]
    .filter(({ variationId }) => variationId !== draft.variationId)
    .sort(
      (left, right) =>
        right.updatedAt - left.updatedAt || left.variationId.localeCompare(right.variationId),
    )[0];
  const pendingVariation = library.variations.find(
    ({ variationId }) => variationId === pendingVariationId,
  );
  const pendingDelete = library.variations.find(
    ({ variationId }) => variationId === pendingDeleteId,
  );
  const pendingDeleteReplacement = library.variations.find(
    ({ variationId }) => variationId !== pendingDeleteId,
  );

  const statusText =
    error ||
    interactionError ||
    message ||
    (saving
      ? 'Salvando plano…'
      : !validation.valid
        ? 'Proposta inválida — corrija antes de salvar'
        : dirty
          ? `${draft.name} modificada — ainda não salva`
          : `${draft.name} salva no dispositivo`);

  return (
    <section
      aria-labelledby="tactics-screen-title"
      className="screen-view tactics-view"
      onKeyDownCapture={(event) => {
        if (event.key !== 'Escape' || (!selectedPlayerId && !pointerSessionRef.current?.active))
          return;
        event.preventDefault();
        setSelectedPlayerId(null);
        finishDrag();
        announce('Movimento cancelado. O plano anterior foi preservado.');
      }}
    >
      <header className="screen-heading tactics-heading">
        <div className="variation-heading">
          <span>TÁTICAS · {activeIsPrimary ? 'VARIAÇÃO PRINCIPAL' : 'VARIAÇÃO SECUNDÁRIA'}</span>
          <div className="variation-heading__title">
            <h1 id="tactics-screen-title">Plano de jogo</h1>
            <Popover
              align="start"
              closeLabel="Fechar variações"
              contentClassName="variation-picker__popover"
              initialFocusId={`variation-${library.activeVariationId}`}
              onOpenChange={setVariationPickerOpen}
              open={variationPickerOpen}
              title="Variações da formação"
              triggerAccessibleLabel={`Variação ativa: ${draft.name}. Alternar ou gerenciar`}
              triggerClassName="variation-picker__trigger"
              triggerContent={
                <>
                  <strong>{draft.name}</strong>
                  <span className="variation-picker__status">{dirty ? 'Modificada' : 'Salva'}</span>
                  <span aria-hidden="true">⌄</span>
                </>
              }
              triggerDisabled={saving || variationActionBusy}
              triggerLabel="Gerenciar"
            >
              <div aria-label="Variações salvas" className="variation-picker__list" role="listbox">
                <section aria-labelledby="primary-plan-label" role="group">
                  <h3 id="primary-plan-label">Plano principal</h3>
                  {primaryVariation && (
                    <button
                      aria-selected={primaryVariation.variationId === library.activeVariationId}
                      className="variation-picker__option"
                      id={`variation-${primaryVariation.variationId}`}
                      onClick={() => void switchVariation(primaryVariation.variationId)}
                      role="option"
                      type="button"
                    >
                      <span>
                        <strong>{primaryVariation.name}</strong>
                        <small>
                          {primaryVariation.formation} · revisão {primaryVariation.revision} ·{' '}
                          {new Date(primaryVariation.updatedAt).toLocaleDateString('pt-BR')}
                        </small>
                      </span>
                      <em>Principal</em>
                      {primaryVariation.variationId === library.activeVariationId && (
                        <Icon name="check" size={16} />
                      )}
                    </button>
                  )}
                </section>
                <section aria-labelledby="secondary-plans-label" role="group">
                  <h3 id="secondary-plans-label">Variações personalizadas</h3>
                  {secondaryVariations.length === 0 ? (
                    <p className="variation-picker__empty">Nenhuma variação secundária.</p>
                  ) : (
                    secondaryVariations.map((variation) => {
                      const isActive = variation.variationId === library.activeVariationId;
                      return (
                        <button
                          aria-selected={isActive}
                          className="variation-picker__option"
                          id={`variation-${variation.variationId}`}
                          key={variation.variationId}
                          onClick={() => void switchVariation(variation.variationId)}
                          role="option"
                          type="button"
                        >
                          <span>
                            <strong>{variation.name}</strong>
                            <small>
                              {variation.formation} · revisão {variation.revision} ·{' '}
                              {new Date(variation.updatedAt).toLocaleDateString('pt-BR')}
                            </small>
                          </span>
                          <span />
                          {isActive && <Icon name="check" size={16} />}
                        </button>
                      );
                    })
                  )}
                </section>
                <section
                  aria-labelledby="system-presets-label"
                  className="variation-picker__presets"
                  role="group"
                >
                  <h3 id="system-presets-label">Presets do sistema</h3>
                  <p>{formationPresets.length} estruturas disponíveis no seletor Formação.</p>
                </section>
              </div>
              <div className="variation-picker__actions">
                <button onClick={() => openVariationNameDialog('preset')} type="button">
                  Nova do preset
                </button>
                <button onClick={() => openVariationNameDialog('current')} type="button">
                  Salvar como
                </button>
              </div>
              <details className="variation-picker__management">
                <summary>Mais ações</summary>
                <div>
                  <button onClick={() => openVariationNameDialog('duplicate')} type="button">
                    Duplicar
                  </button>
                  <button onClick={() => openVariationNameDialog('rename')} type="button">
                    Renomear
                  </button>
                  <button
                    disabled={activeIsPrimary && !primaryReplacement}
                    onClick={() => {
                      const nextPrimaryId = activeIsPrimary
                        ? primaryReplacement?.variationId
                        : draft.variationId;
                      if (!nextPrimaryId) return;
                      setVariationPickerOpen(false);
                      void onSetPrimaryVariation(nextPrimaryId);
                    }}
                    title={
                      activeIsPrimary && primaryReplacement
                        ? `${primaryReplacement.name} será o novo plano principal.`
                        : undefined
                    }
                    type="button"
                  >
                    {activeIsPrimary ? 'Tornar secundária' : 'Definir principal'}
                  </button>
                  <button
                    disabled={dirty || library.variations.length === 1}
                    onClick={() => {
                      setVariationPickerOpen(false);
                      setPendingDeleteId(draft.variationId);
                    }}
                    title={dirty ? 'Salve ou restaure as alterações antes de excluir.' : undefined}
                    type="button"
                  >
                    Excluir
                  </button>
                </div>
              </details>
            </Popover>
          </div>
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
        <fieldset className="phase-selector">
          <legend>Fase do jogo</legend>
          {phaseOptions.map((phase) => (
            <button
              aria-pressed={selectedPhase === phase.id}
              key={phase.id}
              onClick={() => {
                setSelectedPhase(phase.id);
                setSelectedPlayerId(null);
                announce(
                  phase.id === 'base'
                    ? 'Posição base editável restaurada.'
                    : `${phase.label}: projeção derivada; a posição base não foi alterada.`,
                );
              }}
              type="button"
            >
              {phase.label}
            </button>
          ))}
        </fieldset>
        <label className="tactics-select">
          <span>Leitura do campo</span>
          <select
            aria-label="Leitura do campo"
            onChange={(event) => onPitchModeChange(event.target.value as PitchMode)}
            value={pitchMode}
          >
            <option value="roles">Posição nominal</option>
            <option value="condition">Condição</option>
            <option value="familiarity">Familiaridade</option>
          </select>
        </label>
        <div className="tactics-readiness" aria-label={`Prontidão tática ${readiness}%`}>
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
          onClick={() => {
            invalidateSemanticPreview();
            onUndo();
          }}
          type="button"
        >
          <Icon name="retry" size={16} /> Desfazer última
        </button>
        <button
          className="toolbar-action"
          disabled={!dirty || saving}
          onClick={() => {
            invalidateSemanticPreview();
            onDiscard();
          }}
          type="button"
        >
          Restaurar salvo
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
          if (!open && !variationActionBusy) setVariationNameMode(null);
        }}
        open={variationNameMode !== null}
      >
        <AlertDialogPrimitive.Portal>
          <AlertDialogPrimitive.Overlay className="rv-modal-backdrop" />
          <AlertDialogPrimitive.Content className="rv-dialog rv-alert-dialog variation-name-dialog">
            <AlertDialogPrimitive.Title>
              {variationNameMode === 'rename' ? 'Renomear variação' : 'Nome da nova variação'}
            </AlertDialogPrimitive.Title>
            <AlertDialogPrimitive.Description className="rv-dialog__description">
              {variationNameMode === 'preset'
                ? `Cria uma geometria limpa a partir do preset ${draft.formation}.`
                : variationNameMode === 'current'
                  ? 'Cria uma identidade nova preservando exatamente o campo, titulares e banco atuais.'
                  : variationNameMode === 'duplicate'
                    ? 'Duplica esta variação com revisão e datas independentes.'
                    : 'O novo nome será salvo apenas nesta variação.'}
            </AlertDialogPrimitive.Description>
            <label className="variation-name-dialog__field">
              <span>Nome</span>
              <input
                aria-describedby={variationNameError ? 'variation-name-error' : undefined}
                autoComplete="off"
                autoFocus
                maxLength={80}
                onChange={(event) => setVariationName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !variationNameError) {
                    event.preventDefault();
                    void submitVariationName();
                  }
                }}
                value={variationName}
              />
            </label>
            <p
              aria-live="polite"
              className="variation-name-dialog__error"
              id="variation-name-error"
            >
              {variationNameError}
            </p>
            <div className="rv-dialog__actions">
              <AlertDialogPrimitive.Cancel asChild>
                <Button disabled={variationActionBusy} variant="secondary">
                  Cancelar
                </Button>
              </AlertDialogPrimitive.Cancel>
              <Button
                disabled={Boolean(variationNameError)}
                loading={variationActionBusy}
                loadingLabel="Salvando…"
                onClick={() => void submitVariationName()}
                variant="primary"
              >
                {variationNameMode === 'rename' ? 'Salvar nome' : 'Criar variação'}
              </Button>
            </div>
          </AlertDialogPrimitive.Content>
        </AlertDialogPrimitive.Portal>
      </AlertDialogPrimitive.Root>

      <AlertDialogPrimitive.Root
        onOpenChange={(open) => {
          if (!open && !variationActionBusy) setPendingVariationId(null);
        }}
        open={pendingVariationId !== null}
      >
        <AlertDialogPrimitive.Portal>
          <AlertDialogPrimitive.Overlay className="rv-modal-backdrop" />
          <AlertDialogPrimitive.Content className="rv-dialog rv-alert-dialog variation-switch-dialog">
            <AlertDialogPrimitive.Title>
              Trocar para {pendingVariation?.name}?
            </AlertDialogPrimitive.Title>
            <AlertDialogPrimitive.Description className="rv-dialog__description">
              {draft.name} possui alterações pendentes. Salve esta variação, restaure a última
              versão salva ou cancele a troca.
            </AlertDialogPrimitive.Description>
            <div className="rv-dialog__actions variation-switch-dialog__actions">
              <AlertDialogPrimitive.Cancel asChild>
                <Button disabled={variationActionBusy} variant="secondary">
                  Cancelar
                </Button>
              </AlertDialogPrimitive.Cancel>
              <Button
                disabled={variationActionBusy}
                onClick={() => void completePendingSwitch(false)}
                variant="secondary"
              >
                Restaurar e trocar
              </Button>
              <Button
                loading={variationActionBusy}
                loadingLabel="Salvando…"
                onClick={() => void completePendingSwitch(true)}
                variant="primary"
              >
                Salvar e trocar
              </Button>
            </div>
          </AlertDialogPrimitive.Content>
        </AlertDialogPrimitive.Portal>
      </AlertDialogPrimitive.Root>

      <AlertDialogPrimitive.Root
        onOpenChange={(open) => {
          if (!open && !variationActionBusy) setPendingDeleteId(null);
        }}
        open={pendingDeleteId !== null}
      >
        <AlertDialogPrimitive.Portal>
          <AlertDialogPrimitive.Overlay className="rv-modal-backdrop" />
          <AlertDialogPrimitive.Content className="rv-dialog rv-alert-dialog variation-delete-dialog">
            <AlertDialogPrimitive.Title>Excluir {pendingDelete?.name}?</AlertDialogPrimitive.Title>
            <AlertDialogPrimitive.Description className="rv-dialog__description">
              Campo, titulares, banco e histórico de revisão desta variação serão removidos. As
              outras variações permanecem intactas.
              {pendingDelete?.variationId === library.primaryVariationId &&
                pendingDeleteReplacement &&
                ` ${pendingDeleteReplacement.name} assumirá como plano principal.`}
            </AlertDialogPrimitive.Description>
            <div className="rv-dialog__actions">
              <AlertDialogPrimitive.Cancel asChild>
                <Button disabled={variationActionBusy} variant="secondary">
                  Cancelar
                </Button>
              </AlertDialogPrimitive.Cancel>
              <Button
                loading={variationActionBusy}
                loadingLabel="Excluindo…"
                onClick={() => void deleteVariation()}
                variant="destructive-proof"
              >
                Excluir variação
              </Button>
            </div>
          </AlertDialogPrimitive.Content>
        </AlertDialogPrimitive.Portal>
      </AlertDialogPrimitive.Root>

      <AlertDialogPrimitive.Root
        onOpenChange={(open) => {
          if (!open) setPendingFormation(null);
        }}
        open={pendingFormation !== null}
      >
        <AlertDialogPrimitive.Portal>
          <AlertDialogPrimitive.Overlay className="rv-modal-backdrop" />
          <AlertDialogPrimitive.Content className="rv-dialog rv-alert-dialog formation-change-dialog">
            <AlertDialogPrimitive.Title>Aplicar {pendingFormation}?</AlertDialogPrimitive.Title>
            <AlertDialogPrimitive.Description className="rv-dialog__description">
              Confira a alocação antes de alterar a geometria desta variação.
              {dirty && ' Há alterações pendentes; cancele e salve se quiser preservá-las.'}
            </AlertDialogPrimitive.Description>
            {pendingFormationPreview && (
              <dl className="formation-change-preview">
                <div>
                  <dt>Titulares mantidos</dt>
                  <dd>
                    {pendingFormationPreview.suggestion.placements.length -
                      pendingFormationPreview.promotedPlayerIds.length}
                  </dd>
                </div>
                <div>
                  <dt>Reposicionados</dt>
                  <dd>{pendingFormationPreview.repositionedPlayerIds.length}</dd>
                </div>
                <div>
                  <dt>Funções alteradas</dt>
                  <dd>{pendingFormationPreview.roleChangedPlayerIds.length}</dd>
                </div>
                <div>
                  <dt>Banco / promovidos</dt>
                  <dd>
                    {pendingFormationPreview.demotedPlayerIds.length} /{' '}
                    {pendingFormationPreview.promotedPlayerIds.length}
                  </dd>
                </div>
              </dl>
            )}
            <div className="rv-dialog__actions formation-change-dialog__actions">
              <AlertDialogPrimitive.Cancel asChild>
                <Button variant="secondary">Cancelar</Button>
              </AlertDialogPrimitive.Cancel>
              <AlertDialogPrimitive.Action asChild>
                <Button
                  onClick={() => {
                    if (pendingFormation) applyFormation(pendingFormation, draft, 'geometry');
                  }}
                  variant="secondary"
                >
                  Manter jogadores
                </Button>
              </AlertDialogPrimitive.Action>
              <AlertDialogPrimitive.Action asChild>
                <Button
                  onClick={() => {
                    if (pendingFormation) applyFormation(pendingFormation, draft, 'suggestion');
                  }}
                  variant="primary"
                >
                  Aplicar sugestão
                </Button>
              </AlertDialogPrimitive.Action>
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
              <span>
                <strong>{draft.name}</strong>
                <small>Origem: {draft.sourcePresetId ?? 'sem preset'}</small>
              </span>
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
              data-pitch-mode={pitchMode}
              onClick={(event) => {
                if (
                  selectedPhase !== 'base' ||
                  !selectedPlayerId ||
                  event.target !== event.currentTarget
                )
                  return;
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
                recordDragMetric('fieldCardRenders');
                if (pointerSessionRef.current?.playerId === player.id) {
                  recordDragMetric('draggedCardRenders');
                }
                const playerIndex = state.players.findIndex(({ id }) => id === player.id);
                const playerFamiliarity = model.familiarity.individuals.find(
                  ({ playerId }) => playerId === player.id,
                );
                const phasePoint =
                  selectedPhase === 'base' ? undefined : phasePlayerById.get(player.id);
                const style = {
                  '--slot-x': `${(phasePoint?.normalizedX ?? placement.normalizedX) * 100}%`,
                  '--slot-y': `${(phasePoint?.normalizedY ?? placement.normalizedY) * 100}%`,
                } as CSSProperties;
                const secondary =
                  pitchMode === 'condition'
                    ? `Físico ${player.condition}%`
                    : pitchMode === 'familiarity'
                      ? `${playerFamiliarity?.contextual ?? 0}% plano`
                      : positionLabels[player.position];
                const meterValue =
                  pitchMode === 'condition'
                    ? player.condition
                    : (playerFamiliarity?.contextual ?? 0);
                return (
                  <li
                    className="pitch-slot"
                    data-condition-attention={
                      pitchMode === 'condition' && player.condition < 90 ? true : undefined
                    }
                    key={player.id}
                    style={style}
                  >
                    <span className="pitch-slot__position">
                      {positionLabels[placement.positionId]}
                    </span>
                    <button
                      aria-label={`${positionLabels[placement.positionId]}: ${player.name}, OVR ${player.rating}, condição ${player.condition}%, familiaridade ${playerFamiliarity?.contextual ?? 0}%. ${selectedPhase === 'base' ? 'Selecione para mover.' : 'Projeção derivada, somente leitura.'}`}
                      aria-pressed={selectedPlayerId === player.id}
                      className="pitch-player-card"
                      data-tactical-player-id={player.id}
                      data-tactical-player-origin="field"
                      disabled={saving || semanticBusy}
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
                      <span
                        aria-label={`OVR ${player.rating}`}
                        className="pitch-player-card__rating"
                      >
                        <small>OVR</small>
                        <b>{player.rating}</b>
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

          <section aria-labelledby="bench-title" className="bench-tray" ref={benchRef}>
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
                    <li key={player.id}>
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
                            {positionLabels[player.position]} · {player.condition}% · Disponível
                          </small>
                        </span>
                        <b aria-label={`OVR ${player.rating}`}>{player.rating}</b>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <span aria-atomic="true" aria-live="polite" className="sr-only" role="status">
            {interactionMessage}
          </span>
          <span aria-atomic="true" aria-live="assertive" className="sr-only" role="alert">
            {interactionError}
          </span>
        </section>

        <aside aria-label="Inspector tático" className="tactics-inspector">
          {window.__RIVALLO_TACTICS_DRAG_METRICS__ && (recordDragMetric('inspectorRenders'), null)}
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
                  <span>Diagnóstico autoritativo</span>
                  <h2>
                    {model.diagnostic.valid ? 'Plano pronto para salvar' : 'Correção necessária'}
                  </h2>
                  <p>
                    Prontidão {readiness}% · familiaridade {model.familiarity.overall}%. Estrutura,
                    riscos e consequências vêm da mesma variação.
                  </p>
                </header>
                <dl className="diagnostic-metrics">
                  <div>
                    <dt>Familiaridade</dt>
                    <dd>{model.familiarity.overall}%</dd>
                    <i>
                      <b style={{ '--metric': `${model.familiarity.overall}%` } as CSSProperties} />
                    </i>
                  </div>
                  <div>
                    <dt>Condição do XI</dt>
                    <dd>{averageCondition}%</dd>
                    <i>
                      <b style={{ '--metric': `${averageCondition}%` } as CSSProperties} />
                    </i>
                  </div>
                  <div>
                    <dt>Largura / profundidade</dt>
                    <dd>
                      {model.spatial.width} / {model.spatial.depth}
                    </dd>
                  </div>
                  <div>
                    <dt>Compactação</dt>
                    <dd>{model.spatial.compactness}%</dd>
                  </div>
                </dl>
                <section className="diagnostic-list">
                  <h3>Erros técnicos</h3>
                  {validation.errors.map((item) => (
                    <p className="tactical-alert" key={item}>
                      {item}
                    </p>
                  ))}
                  {validation.warnings.slice(0, 4).map((item) => (
                    <p key={item}>{item}</p>
                  ))}
                  {validation.errors.length === 0 && validation.warnings.length === 0 && (
                    <p>Nenhum erro técnico; riscos táticos não bloqueiam a criatividade.</p>
                  )}
                </section>
                <section className="diagnostic-list">
                  <h3>Riscos e vulnerabilidades</h3>
                  {[...model.diagnostic.risks, ...model.diagnostic.vulnerabilities].map((item) => (
                    <p className="tactical-risk" key={item}>
                      <strong>Risco salvável</strong> {item}
                    </p>
                  ))}
                  {model.diagnostic.risks.length + model.diagnostic.vulnerabilities.length ===
                    0 && <p>Nenhuma vulnerabilidade relevante identificada.</p>}
                </section>
                <section className="diagnostic-list">
                  <h3>Pontos fortes</h3>
                  {model.diagnostic.strengths.map((item) => (
                    <p key={item}>{item}</p>
                  ))}
                </section>
                {semanticPreview?.comparison && (
                  <section className="tactical-comparison" aria-label="Comparação antes e depois">
                    <h3>Antes e depois</h3>
                    <p>
                      Familiaridade: {semanticPreview.comparison.familiarityBefore}% →{' '}
                      {semanticPreview.comparison.familiarityAfter}%
                    </p>
                    {semanticPreview.comparison.changes.map((change) => (
                      <article key={change.changeId}>
                        <strong>
                          {change.label}: {change.before} → {change.after}
                        </strong>
                        <small>{change.cause}</small>
                        {change.expectedConsequences.map((effect) => (
                          <span key={effect}>{effect}</span>
                        ))}
                      </article>
                    ))}
                  </section>
                )}
                {model.recommendations.length > 0 && (
                  <section className="tactical-recommendations">
                    <h3>Recomendações da comissão</h3>
                    {model.recommendations.map((recommendation) => (
                      <article key={recommendation.recommendationId}>
                        <strong>{recommendation.reason}</strong>
                        <p>Benefício: {recommendation.benefit}</p>
                        <p>
                          Risco: {recommendation.risk} · confiança {recommendation.confidence}%
                        </p>
                        <button
                          disabled={semanticBusy || recommendation.proposedChanges.length !== 1}
                          onClick={() => {
                            const change = recommendation.proposedChanges[0];
                            if (change?.path === 'strategy.outOfPossession.compactness')
                              updateStrategyScore('outOfPossession', 'compactness', change.to);
                          }}
                          type="button"
                        >
                          Aplicar recomendação
                        </button>
                      </article>
                    ))}
                  </section>
                )}
              </>
            )}
            {activeTool === 'tactics' && (
              <>
                <header className="inspector-heading">
                  <span>
                    Estratégia coletiva{' '}
                    {model.resolvedStrategy.customized ? 'personalizada' : 'por preset'}
                  </span>
                  <h2>{model.resolvedStrategy.mentality}</h2>
                  <p>
                    Risco {model.resolvedStrategy.risk}% · exigência{' '}
                    {model.resolvedStrategy.physicalDemand}% · familiaridade{' '}
                    {model.familiarity.overall}%.
                  </p>
                </header>
                <fieldset className="strategy-options">
                  <legend>Preset rápido e transparente</legend>
                  {strategyCatalog.map((preset) => (
                    <button
                      aria-pressed={
                        model.config.strategy.presetId === preset.presetId &&
                        !model.config.strategy.customized
                      }
                      disabled={saving || semanticBusy}
                      key={preset.presetId}
                      onClick={() => setPendingStrategyPreset(preset)}
                      type="button"
                    >
                      <span>
                        <strong>{presetLabels[preset.presetId]}</strong>
                        <b>
                          Risco {preset.resolved.risk}% · exigência {preset.resolved.physicalDemand}
                          %
                        </b>
                        <small>
                          + {preset.resolved.strengths[0] ?? 'equilíbrio entre fases'} · −{' '}
                          {preset.resolved.vulnerabilities[0] ?? 'sem vulnerabilidade dominante'}
                        </small>
                      </span>
                    </button>
                  ))}
                </fieldset>
                {pendingStrategyPreset && (
                  <section className="preset-impact" role="alert">
                    <h3>Aplicar {presetLabels[pendingStrategyPreset.presetId]}?</h3>
                    <p>
                      Altera largura, ritmo, risco de passe, bloco, linha, pressão, compactação e
                      transições. Sua personalização atual fica protegida até confirmar.
                    </p>
                    <dl>
                      <div>
                        <dt>Linha defensiva</dt>
                        <dd>
                          {model.config.strategy.outOfPossession.defensiveLine} →{' '}
                          {pendingStrategyPreset.config.outOfPossession.defensiveLine}
                        </dd>
                      </div>
                      <div>
                        <dt>Pressão</dt>
                        <dd>
                          {model.config.strategy.outOfPossession.pressure} →{' '}
                          {pendingStrategyPreset.config.outOfPossession.pressure}
                        </dd>
                      </div>
                    </dl>
                    <div>
                      <Button
                        onClick={() => {
                          const preset = pendingStrategyPreset;
                          setPendingStrategyPreset(null);
                          void applyTacticalConfig(
                            { ...model.config, strategy: preset.config },
                            `${presetLabels[preset.presetId]} aplicada; revise o impacto antes de salvar.`,
                          );
                        }}
                        variant="primary"
                      >
                        Confirmar preset
                      </Button>
                      <Button onClick={() => setPendingStrategyPreset(null)} variant="secondary">
                        Manter personalização
                      </Button>
                    </div>
                  </section>
                )}
                <section className="strategy-summary">
                  <h3>Consequências atuais</h3>
                  {model.resolvedStrategy.strengths.map((item) => (
                    <p key={item}>+ {item}</p>
                  ))}
                  {model.resolvedStrategy.vulnerabilities.map((item) => (
                    <p key={item}>− {item}</p>
                  ))}
                </section>
                <button
                  className="advanced-strategy-toggle"
                  aria-expanded={advancedStrategyOpen}
                  onClick={() => setAdvancedStrategyOpen((open) => !open)}
                  type="button"
                >
                  Personalizar estratégia
                </button>
                {advancedStrategyOpen && (
                  <div className="advanced-strategy">
                    {(
                      [
                        [
                          'inPossession',
                          'Com a bola',
                          [
                            ['width', 'Amplitude'],
                            ['tempo', 'Ritmo'],
                            ['passingRisk', 'Risco dos passes'],
                            ['playersForward', 'Presença à frente'],
                          ],
                        ],
                        [
                          'outOfPossession',
                          'Sem a bola',
                          [
                            ['blockHeight', 'Altura do bloco'],
                            ['defensiveLine', 'Linha defensiva'],
                            ['pressure', 'Pressão'],
                            ['compactness', 'Compactação'],
                            ['duelAggression', 'Duelos'],
                          ],
                        ],
                        [
                          'transitions',
                          'Transições',
                          [
                            ['speed', 'Velocidade'],
                            ['playersForward', 'Jogadores avançando'],
                            ['defensiveSecurity', 'Segurança defensiva'],
                          ],
                        ],
                      ] as const
                    ).map(([section, title, controls]) => (
                      <fieldset key={section}>
                        <legend>{title}</legend>
                        {controls.map(([field, label]) => (
                          <label key={field}>
                            <span>{label}</span>
                            <select
                              disabled={semanticBusy}
                              onChange={(event) =>
                                updateStrategyScore(section, field, Number(event.target.value))
                              }
                              value={
                                (
                                  model.config.strategy[section] as unknown as Record<
                                    string,
                                    number
                                  >
                                )[field]
                              }
                            >
                              {scoreOptions.map((score) => (
                                <option key={score} value={score}>
                                  {score}
                                </option>
                              ))}
                            </select>
                          </label>
                        ))}
                      </fieldset>
                    ))}
                  </div>
                )}
              </>
            )}
            {activeTool === 'instructions' && (
              <>
                <header className="inspector-heading">
                  <span>Precedência resolvida</span>
                  <h2>Instruções da equipe</h2>
                  <p>
                    Individual → função → posição → setor → coletiva → preset. Conflitos nunca são
                    silenciosos.
                  </p>
                </header>
                <div className="instruction-list">
                  {model.config.instructions.map((instruction) => (
                    <button
                      aria-pressed="true"
                      disabled={semanticBusy}
                      key={instruction.instructionId}
                      onClick={() => toggleInstruction(instruction)}
                      type="button"
                    >
                      <span>
                        <small>
                          {instruction.scope} · {instruction.category}
                        </small>
                        <strong>{instruction.description}</strong>
                        <em>{instruction.expectedEffects.join(' · ')}</em>
                      </span>
                      <i aria-hidden="true">
                        <b />
                      </i>
                    </button>
                  ))}
                </div>
                <fieldset className="instruction-composer">
                  <legend>Adicionar instrução</legend>
                  <label>
                    Escopo
                    <select
                      value={instructionScope}
                      onChange={(event) =>
                        setInstructionScope(event.target.value as TacticalInstructionScope)
                      }
                    >
                      {(['collective', 'sector', 'position', 'role', 'individual'] as const).map(
                        (scope) => (
                          <option key={scope} value={scope}>
                            {scope}
                          </option>
                        ),
                      )}
                    </select>
                  </label>
                  <label>
                    Categoria
                    <select
                      value={instructionCategory}
                      onChange={(event) =>
                        setInstructionCategory(event.target.value as TacticalInstructionCategory)
                      }
                    >
                      {(
                        [
                          'circulation',
                          'risk',
                          'pressure',
                          'width',
                          'compactness',
                          'creativity',
                          'marking',
                        ] as const
                      ).map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Comportamento
                    <input
                      value={instructionValue}
                      onChange={(event) => setInstructionValue(event.target.value)}
                    />
                  </label>
                  <Button
                    disabled={
                      semanticBusy || (instructionScope === 'individual' && !selectedPlayerId)
                    }
                    onClick={addInstruction}
                    variant="secondary"
                  >
                    Adicionar sem aplicar silenciosamente
                  </Button>
                </fieldset>
                {model.instructionConflicts.map((conflict) => (
                  <article className="instruction-conflict" key={conflict.conflictId} role="alert">
                    <strong>Conflito resolvido: {conflict.winnerId}</strong>
                    <p>{conflict.reason}</p>
                    <small>Comportamento final: {conflict.resolvedBehavior}</small>
                  </article>
                ))}
              </>
            )}
            {activeTool === 'opposition' && (
              <>
                <header className="inspector-heading">
                  <span>Próximo adversário</span>
                  <h2>{state.opponent.name}</h2>
                  <p>
                    Plano de oposição persistido nesta variação, com origem, confiança e expiração.
                  </p>
                </header>
                {model.opposition.knowledge ? (
                  <section className="opposition-knowledge">
                    <strong>Confiança {model.opposition.knowledge.confidence}%</strong>
                    <p>Fonte: {model.opposition.knowledge.source}</p>
                    <h3>Conhecido</h3>
                    {model.opposition.knowledge.knownFacts.map((fact) => (
                      <p key={fact}>{fact}</p>
                    ))}
                    <h3>Desconhecido</h3>
                    {model.opposition.knowledge.unknownFacts.map((fact) => (
                      <p key={fact}>{fact}</p>
                    ))}
                  </section>
                ) : (
                  <p className="opposition-note">
                    <Icon name="information" size={16} /> Nenhum relatório autoritativo disponível.
                    A informação chegará por scouting na Fase 06.4; nenhum dado foi inventado.
                  </p>
                )}
                {model.opposition.instructions.map((instruction) => (
                  <article className="opposition-instruction" key={instruction.instructionId}>
                    <strong>
                      {instruction.scope}: {instruction.targetId}
                    </strong>
                    <p>
                      Pressão {instruction.pressure}% · marcação{' '}
                      {instruction.tightMarking ? 'próxima' : 'normal'}
                    </p>
                  </article>
                ))}
              </>
            )}
          </div>
          <footer className="tactics-focus-player">
            {focusedPlayer ? (
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
                    {activeTool === 'analysis' &&
                      `${positionLabels[focusedPlayer.position]} · familiaridade ${model.familiarity.individuals.find(({ playerId }) => playerId === focusedPlayer.id)?.contextual ?? 0}%`}
                    {activeTool === 'tactics' &&
                      `Condição ${focusedPlayer.condition}% · exigência ${model.resolvedStrategy.physicalDemand}%`}
                    {activeTool === 'instructions' &&
                      `${model.resolvedInstructions.filter(({ target }) => target === 'team' || target === focusedPlayer.id).length} instruções aplicadas`}
                    {activeTool === 'opposition' &&
                      `${model.opposition.instructions.filter(({ targetId }) => targetId === focusedPlayer.id).length} responsabilidades de oposição`}
                  </b>
                </span>
              </>
            ) : (
              <span className="tactics-focus-team">
                <small>Contexto da equipe</small>
                <strong>Nenhum jogador selecionado</strong>
                <b>
                  {activeTool === 'analysis'
                    ? `Familiaridade coletiva ${model.familiarity.overall}%`
                    : activeTool === 'tactics'
                      ? `${model.resolvedStrategy.mentality} · risco ${model.resolvedStrategy.risk}%`
                      : activeTool === 'instructions'
                        ? `${model.resolvedInstructions.length} instruções resolvidas`
                        : model.opposition.knowledge
                          ? `Relatório com ${model.opposition.knowledge.confidence}% de confiança`
                          : 'Sem relatório de oposição'}
                </b>
              </span>
            )}
          </footer>
        </aside>
      </div>
    </section>
  );
}
