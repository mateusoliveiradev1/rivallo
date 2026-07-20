import { Icon } from '@rivallo/icons';
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';

import { Button } from '../ui/primitives/actions.js';
import { Popover } from '../ui/primitives/disclosure.js';
import {
  loadTacticalStrategyCatalog,
  previewPlayerProfile,
  previewTacticalPlan,
} from './client.js';
import { positionLabels, type PitchMode, type TacticalTool } from './matchday-ui.js';
import { TacticalPlayerCardContent, tacticalPrimaryMetric } from './TacticalPlayerCard.js';
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
  TacticalRecommendation,
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
  readonly onOpenProfile: (playerId: string) => void;
  readonly onOpenClub: (clubId: string) => void;
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

const instructionScopeLabels: Record<TacticalInstructionScope, string> = {
  collective: 'Toda a equipe',
  sector: 'Setor',
  position: 'Posição',
  role: 'Função',
  individual: 'Jogador',
};

const instructionCategoryLabels: Record<TacticalInstructionCategory, string> = {
  buildUp: 'Construção',
  circulation: 'Circulação',
  pressure: 'Pressão',
  marking: 'Marcação',
  movement: 'Movimentação',
  finishing: 'Finalização',
  transition: 'Transição',
  goalkeeperBehavior: 'Comportamento do goleiro',
  risk: 'Risco com a bola',
  width: 'Amplitude',
  compactness: 'Compactação',
  creativity: 'Criatividade',
};

const instructionComposerCategories = [
  'buildUp',
  'circulation',
  'pressure',
  'marking',
  'movement',
  'finishing',
  'transition',
  'goalkeeperBehavior',
] as const satisfies readonly TacticalInstructionCategory[];

interface InstructionOption {
  readonly value: string;
  readonly label: string;
  readonly effect: string;
  readonly benefit: string;
  readonly risk: string;
}

const instructionOptions: Record<TacticalInstructionCategory, readonly InstructionOption[]> = {
  buildUp: [
    {
      value: 'supported',
      label: 'Sair com apoios próximos',
      effect: 'A equipe oferece linhas curtas desde a primeira fase da construção.',
      benefit: 'Mais opções seguras para superar a primeira pressão.',
      risk: 'Mais jogadores ficam próximos da própria área.',
    },
    {
      value: 'direct',
      label: 'Buscar a saída direta',
      effect: 'A primeira progressão procura rapidamente a linha mais adiantada.',
      benefit: 'Evita pressão prolongada perto do gol.',
      risk: 'Reduz o controle da segunda bola.',
    },
  ],
  circulation: [
    {
      value: 'supported',
      label: 'Apoios próximos',
      effect: 'Cria linhas de passe curtas e reduz o isolamento do portador.',
      benefit: 'Facilita a conservação da posse sob pressão.',
      risk: 'Pode reduzir a ocupação do lado oposto.',
    },
    {
      value: 'patient',
      label: 'Circular com paciência',
      effect: 'Prioriza retenção e espera por uma vantagem clara antes de progredir.',
      benefit: 'A equipe progride com mais controle.',
      risk: 'Dá tempo para o adversário recompor.',
    },
    {
      value: 'direct',
      label: 'Acelerar a circulação',
      effect: 'Busca a próxima linha mais cedo, aceitando menos tempo para reorganizar apoios.',
      benefit: 'Ataca espaços antes que se fechem.',
      risk: 'Aumenta perdas com a equipe aberta.',
    },
  ],
  risk: [
    {
      value: 'secure',
      label: 'Proteger a posse',
      effect: 'Reduz tentativas de passe de baixa probabilidade em zonas sensíveis.',
      benefit: 'Protege a equipe de perdas centrais.',
      risk: 'Pode tornar a progressão previsível.',
    },
    {
      value: 'balanced',
      label: 'Equilibrar risco',
      effect: 'Alterna segurança e progressão conforme pressão e cobertura disponíveis.',
      benefit: 'Equilibra controle e avanço.',
      risk: 'Exige boa leitura coletiva.',
    },
    {
      value: 'progressive',
      label: 'Buscar passes progressivos',
      effect: 'Aumenta a procura por passes que eliminem linhas, com maior risco de perda.',
      benefit: 'Rompe blocos com menos ações.',
      risk: 'Aumenta a chance de transição adversária.',
    },
  ],
  pressure: [
    {
      value: 'counterPress',
      label: 'Pressionar após a perda',
      effect: 'Prioriza recuperar perto da perda antes de recompor o bloco.',
      benefit: 'Mantém o adversário longe do ataque organizado.',
      risk: 'A primeira pressão superada expõe espaços.',
    },
    {
      value: 'regroup',
      label: 'Recompor o bloco',
      effect: 'Prioriza distâncias defensivas antes de iniciar nova pressão.',
      benefit: 'Protege o centro e a última linha.',
      risk: 'Entrega tempo para o adversário avançar.',
    },
  ],
  width: [
    {
      value: 'stretch',
      label: 'Ocupar os corredores',
      effect: 'Mantém referências abertas para ampliar o campo útil com a bola.',
      benefit: 'Cria espaço entre os defensores adversários.',
      risk: 'Aumenta distâncias para reagir à perda.',
    },
    {
      value: 'narrow',
      label: 'Aproximar por dentro',
      effect: 'Concentra apoios interiores e deixa a amplitude para jogadores designados.',
      benefit: 'Cria superioridade por dentro.',
      risk: 'Pode abandonar um corredor lateral.',
    },
  ],
  compactness: [
    {
      value: 'compactBlock',
      label: 'Encurtar distâncias',
      effect: 'Reduz espaços entre companheiros e protege zonas próximas.',
      benefit: 'Facilita coberturas e pressão conjunta.',
      risk: 'Concede espaço no lado oposto.',
    },
    {
      value: 'balancedDistances',
      label: 'Manter distâncias equilibradas',
      effect: 'Preserva cobertura sem abandonar a capacidade de pressionar fora do bloco.',
      benefit: 'Mantém referências equilibradas.',
      risk: 'Não maximiza uma proteção específica.',
    },
  ],
  creativity: [
    {
      value: 'structured',
      label: 'Respeitar a estrutura',
      effect: 'Prioriza referências coletivas e movimentos previamente coordenados.',
      benefit: 'Mantém a ocupação prevista pelo plano.',
      risk: 'Reduz soluções individuais inesperadas.',
    },
    {
      value: 'expressive',
      label: 'Dar liberdade de decisão',
      effect: 'Permite soluções individuais quando o jogador reconhece uma vantagem.',
      benefit: 'Explora qualidade e leitura individuais.',
      risk: 'Aumenta a variação das posições de apoio.',
    },
  ],
  marking: [
    {
      value: 'zonal',
      label: 'Proteger a zona',
      effect: 'Mantém a referência espacial antes de acompanhar um adversário.',
      benefit: 'Protege a estrutura coletiva.',
      risk: 'Pode conceder recepção entre zonas.',
    },
    {
      value: 'tight',
      label: 'Marcar de perto',
      effect: 'Reduz o tempo do alvo para receber e girar, com risco de abrir espaço às costas.',
      benefit: 'Dificulta a recepção do alvo.',
      risk: 'Pode arrastar o marcador para fora da zona.',
    },
  ],
  movement: [
    {
      value: 'attackSpace',
      label: 'Atacar o espaço livre',
      effect: 'O alvo procura o espaço disponível quando a cobertura está garantida.',
      benefit: 'Cria uma opção de progressão sem bola.',
      risk: 'Pode afastar o jogador da zona de apoio.',
    },
    {
      value: 'offerSupport',
      label: 'Aproximar para apoiar',
      effect: 'O alvo prioriza uma linha de passe curta ao portador.',
      benefit: 'Reduz o isolamento na circulação.',
      risk: 'Diminui a presença em profundidade.',
    },
  ],
  finishing: [
    {
      value: 'patientShot',
      label: 'Esperar a melhor finalização',
      effect: 'A equipe evita chutes contestados quando ainda há opção de passe.',
      benefit: 'Melhora a qualidade média das tentativas.',
      risk: 'Pode desperdiçar janelas curtas de chute.',
    },
    {
      value: 'shootWhenOpen',
      label: 'Finalizar quando houver espaço',
      effect: 'O alvo aproveita rapidamente uma janela limpa de finalização.',
      benefit: 'Transforma espaço em tentativa antes da pressão.',
      risk: 'Pode encerrar ataques com apoio disponível.',
    },
  ],
  transition: [
    {
      value: 'counterPress',
      label: 'Pressionar após a perda',
      effect: 'A primeira reação tenta recuperar a bola perto do local da perda.',
      benefit: 'Interrompe a saída adversária cedo.',
      risk: 'Exige cobertura coordenada atrás da pressão.',
    },
    {
      value: 'regroup',
      label: 'Reorganizar após a perda',
      effect: 'A prioridade é recompor as distâncias antes de pressionar novamente.',
      benefit: 'Protege o centro e a última linha.',
      risk: 'Concede metros para a progressão adversária.',
    },
  ],
  goalkeeperBehavior: [
    {
      value: 'safeDistribution',
      label: 'Distribuir com segurança',
      effect: 'O goleiro prioriza uma opção apoiada e disponível.',
      benefit: 'Reduz perdas na origem da jogada.',
      risk: 'Pode desacelerar uma transição favorável.',
    },
    {
      value: 'quickDistribution',
      label: 'Acelerar a distribuição',
      effect: 'O goleiro procura iniciar a transição antes da recomposição rival.',
      benefit: 'Explora espaços enquanto estão abertos.',
      risk: 'A equipe pode receber sem apoios próximos.',
    },
  ],
};

const progressionLabels = {
  outside: 'pelos corredores',
  balanced: 'por dentro e por fora',
  inside: 'pelo corredor central',
} as const;

type StrategySection = 'inPossession' | 'outOfPossession' | 'transitions';

interface StrategySliderDefinition {
  readonly field: string;
  readonly label: string;
  readonly low: string;
  readonly high: string;
  readonly help: string;
  readonly benefit: string;
  readonly risk: string;
}

const strategySliderSections: readonly {
  readonly id: StrategySection;
  readonly title: string;
  readonly controls: readonly StrategySliderDefinition[];
}[] = [
  {
    id: 'inPossession',
    title: 'Com a bola',
    controls: [
      {
        field: 'width',
        label: 'Amplitude',
        low: 'Fechada',
        high: 'Muito ampla',
        help: 'Define quanto a estrutura com a bola ocupa os corredores.',
        benefit: 'Abre linhas de passe e alonga o bloco adversário.',
        risk: 'Aumenta distâncias para reagir após a perda.',
      },
      {
        field: 'tempo',
        label: 'Ritmo',
        low: 'Paciente',
        high: 'Muito rápido',
        help: 'Define a velocidade das decisões, sem criar deslocamentos fictícios.',
        benefit: 'Acelera a exploração de uma vantagem.',
        risk: 'Reduz o tempo disponível para apoiar.',
      },
      {
        field: 'passingRisk',
        label: 'Risco dos passes',
        low: 'Seguro',
        high: 'Muito agressivo',
        help: 'Define a tolerância a passes de menor probabilidade.',
        benefit: 'Pode eliminar mais linhas com uma ação.',
        risk: 'Eleva a exposição após a perda.',
      },
      {
        field: 'playersForward',
        label: 'Presença à frente',
        low: 'Protegida',
        high: 'Muito alta',
        help: 'Define quantos jogadores ocupam zonas ofensivas na projeção.',
        benefit: 'Aumenta opções próximas da área.',
        risk: 'Reduz a proteção atrás da bola.',
      },
      {
        field: 'creativeFreedom',
        label: 'Liberdade criativa',
        low: 'Estruturada',
        high: 'Muito livre',
        help: 'Define a autonomia para decidir, sem mover jogadores por si só.',
        benefit: 'Permite soluções individuais inesperadas.',
        risk: 'Reduz a previsibilidade dos apoios.',
      },
    ],
  },
  {
    id: 'outOfPossession',
    title: 'Sem a bola',
    controls: [
      {
        field: 'blockHeight',
        label: 'Altura do bloco',
        low: 'Baixa',
        high: 'Muito alta',
        help: 'Define onde a equipe inicia sua proteção e pressão.',
        benefit: 'Aproxima o bloco do campo adversário.',
        risk: 'Concede espaço atrás da primeira pressão.',
      },
      {
        field: 'defensiveLine',
        label: 'Linha defensiva',
        low: 'Recuada',
        high: 'Muito alta',
        help: 'Afeta principalmente a última linha na projeção defensiva.',
        benefit: 'Encurta o campo para sustentar a pressão.',
        risk: 'Aumenta o espaço atacável às costas.',
      },
      {
        field: 'depth',
        label: 'Profundidade',
        low: 'Curta',
        high: 'Muito longa',
        help: 'Define a distância longitudinal ocupada pelo bloco.',
        benefit: 'Pode cobrir mais zonas do campo.',
        risk: 'Pode abrir espaço entre setores.',
      },
      {
        field: 'pressure',
        label: 'Intensidade da pressão',
        low: 'Contida',
        high: 'Muito intensa',
        help: 'Define a frequência de ações de pressão, sem mover cards arbitrariamente.',
        benefit: 'Reduz o tempo de decisão rival.',
        risk: 'Eleva a exigência física e o risco de desencaixe.',
      },
      {
        field: 'horizontalCompactness',
        label: 'Compactação horizontal',
        low: 'Aberta',
        high: 'Muito fechada',
        help: 'Aproxima ou afasta os corredores defensivos.',
        benefit: 'Protege zonas centrais e coberturas.',
        risk: 'Pode liberar o lado oposto.',
      },
      {
        field: 'verticalCompactness',
        label: 'Compactação vertical',
        low: 'Alongada',
        high: 'Muito curta',
        help: 'Aproxima ou afasta defesa, meio e ataque.',
        benefit: 'Reduz espaço entre as linhas.',
        risk: 'Pode diminuir a cobertura em profundidade.',
      },
      {
        field: 'duelAggression',
        label: 'Agressividade nos duelos',
        low: 'Contida',
        high: 'Muito agressiva',
        help: 'Define a postura no duelo, sem alterar a geometria sozinho.',
        benefit: 'Dificulta o domínio do adversário.',
        risk: 'Aumenta faltas e ações fora de tempo.',
      },
    ],
  },
  {
    id: 'transitions',
    title: 'Transições',
    controls: [
      {
        field: 'speed',
        label: 'Velocidade',
        low: 'Controlada',
        high: 'Muito rápida',
        help: 'Define a urgência da transição, sem deslocamento fictício isolado.',
        benefit: 'Explora espaços antes da recomposição.',
        risk: 'Reduz tempo para formar apoios.',
      },
      {
        field: 'playersForward',
        label: 'Jogadores avançando',
        low: 'Poucos',
        high: 'Muitos',
        help: 'Projeta os apoios ofensivos e a segurança restante.',
        benefit: 'Aumenta opções na transição ofensiva.',
        risk: 'Diminui a proteção contra uma nova perda.',
      },
      {
        field: 'defensiveSecurity',
        label: 'Segurança defensiva',
        low: 'Arriscada',
        high: 'Muito protegida',
        help: 'Define quanta cobertura permanece atrás da transição.',
        benefit: 'Protege a equipe contra a perda seguinte.',
        risk: 'Reduz presença no avanço.',
      },
    ],
  },
];

const qualitativeScore = (value: number) =>
  value < 30
    ? 'Muito baixa'
    : value < 45
      ? 'Baixa'
      : value < 60
        ? 'Equilibrada'
        : value < 75
          ? 'Alta'
          : 'Muito alta';

const strategyChangeLabel = (path: string) => {
  const field = path.split('.').at(-1);
  return (
    strategySliderSections
      .flatMap(({ controls }) => controls)
      .find((control) => control.field === field)?.label ?? 'Parâmetro tático'
  );
};

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
  onOpenProfile,
  onOpenClub,
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
  const [openStrategySection, setOpenStrategySection] = useState<StrategySection>('inPossession');
  const [strategyCatalog, setStrategyCatalog] = useState<readonly TacticalStrategyPresetSummary[]>(
    [],
  );
  const [pendingStrategyPreset, setPendingStrategyPreset] =
    useState<TacticalStrategyPresetSummary | null>(null);
  const [semanticPreview, setSemanticPreview] = useState<TacticalPlanPreview | null>(null);
  const [comparisonDismissed, setComparisonDismissed] = useState(false);
  const [semanticBusy, setSemanticBusy] = useState(false);
  const [sliderDraftValues, setSliderDraftValues] = useState<Record<string, number>>({});
  const [selectedRecommendation, setSelectedRecommendation] =
    useState<TacticalRecommendation | null>(null);
  const [recommendationPreview, setRecommendationPreview] = useState<TacticalPlanPreview | null>(
    null,
  );
  const [ignoredRecommendationIds, setIgnoredRecommendationIds] = useState<readonly string[]>([]);
  const [staleRecommendation, setStaleRecommendation] = useState(false);
  const [recommendationBusy, setRecommendationBusy] = useState(false);
  const [contextualRatings, setContextualRatings] = useState<Readonly<Record<string, string>>>({});
  const semanticOperationRef = useRef(0);
  const tacticalConfigRef = useRef<TacticalModelConfig | null>(null);
  const sliderPreviewTimerRef = useRef<number | null>(null);
  const [instructionScope, setInstructionScope] = useState<TacticalInstructionScope>('collective');
  const [instructionCategory, setInstructionCategory] =
    useState<TacticalInstructionCategory>('buildUp');
  const [instructionValue, setInstructionValue] = useState('supported');
  const [editingInstructionId, setEditingInstructionId] = useState<string | null>(null);
  const [impactInstructionId, setImpactInstructionId] = useState<string | null>(null);
  const advancedControlsRef = useRef<HTMLDivElement>(null);
  const inspectorBodyRef = useRef<HTMLDivElement>(null);
  const inspectorScrollRef = useRef<Record<TacticalTool, number>>({
    analysis: 0,
    tactics: 0,
    instructions: 0,
    opposition: 0,
  });
  const pitchRef = useRef<HTMLOListElement>(null);
  const benchRef = useRef<HTMLElement>(null);
  const pointerSessionRef = useRef<PointerDragSession | null>(null);
  const pointerCleanupRef = useRef<() => void>(() => undefined);
  const suppressClickRef = useRef<string | null>(null);
  const pendingContextualRatingsRef = useRef<Readonly<Record<string, string>> | null>(null);

  const playerById = useMemo(
    () => new Map(state.players.map((player) => [player.id, player] as const)),
    [state.players],
  );
  const tacticalPlayerIds = useMemo(
    () =>
      Array.from(new Set([...draft.placements.map(({ playerId }) => playerId), ...draft.bench])),
    [draft.bench, draft.placements],
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
  const baseModel = semanticPreview?.model ?? draft.tacticalModel;
  if (!baseModel)
    throw new Error('O plano tático não possui a projeção autoritativa da Fase 06.3.');
  const model = recommendationPreview?.model ?? baseModel;
  const focusedPlayerFamiliarity = focusedPlayer
    ? (model.familiarity.individuals.find(({ playerId }) => playerId === focusedPlayer.id)
        ?.contextual ?? 0)
    : 0;
  const focusedPlayerMetric = focusedPlayer
    ? tacticalPrimaryMetric({
        mode: pitchMode,
        player: focusedPlayer,
        familiarity: focusedPlayerFamiliarity,
        contextualRating: contextualRatings[focusedPlayer.id],
      })
    : null;
  const savedVariation = library.variations.find(
    ({ variationId }) => variationId === draft.variationId,
  );
  const savedModel = savedVariation?.tacticalModel ?? draft.tacticalModel;
  if (!tacticalConfigRef.current) tacticalConfigRef.current = baseModel.config;
  const readiness = model.diagnostic.readiness;
  const activePhase =
    model.structures.find(({ phase }) => phase === selectedPhase) ?? model.structures[0];
  const savedActivePhase =
    savedModel?.structures.find(({ phase }) => phase === selectedPhase) ??
    savedModel?.structures[0];
  const phasePlayerById = new Map(
    activePhase?.players.map((player) => [player.playerId, player] as const) ?? [],
  );
  const savedPhasePlayerById = new Map(
    savedActivePhase?.players.map((player) => [player.playerId, player] as const) ?? [],
  );
  const selectedInstruction =
    instructionOptions[instructionCategory].find(({ value }) => value === instructionValue) ??
    instructionOptions[instructionCategory][0];
  const inspectorSummary = {
    analysis: {
      eyebrow: 'Diagnóstico autoritativo',
      title: model.diagnostic.valid ? 'Plano pronto para salvar' : 'Correção necessária',
      detail: `Prontidão ${readiness}% · familiaridade ${model.familiarity.overall}%. Estrutura, riscos e consequências vêm da mesma variação.`,
    },
    tactics: {
      eyebrow: `Estratégia coletiva ${model.resolvedStrategy.customized ? 'personalizada' : 'por preset'}`,
      title: model.resolvedStrategy.mentality,
      detail: `Risco ${model.resolvedStrategy.risk}% · exigência ${model.resolvedStrategy.physicalDemand}% · familiaridade ${model.familiarity.overall}%.`,
    },
    instructions: {
      eyebrow: `${model.config.instructions.filter(({ enabled }) => enabled).length} instruções ativas`,
      title: 'Comportamentos orientados',
      detail: 'Adicione, revise e compare responsabilidades. A proposta só persiste ao salvar.',
    },
    opposition: {
      eyebrow: 'Próximo adversário',
      title: state.opponent.name,
      detail: 'Plano de oposição persistido nesta variação, com origem, confiança e expiração.',
    },
  }[activeTool];
  const primaryRisk =
    model.diagnostic.risks[0] ??
    model.diagnostic.vulnerabilities[0] ??
    'Nenhum risco dominante identificado';
  const activeComparison = comparisonDismissed
    ? null
    : (recommendationPreview?.comparison ?? semanticPreview?.comparison);
  const visibleRecommendations = model.recommendations.filter(
    ({ recommendationId }) => !ignoredRecommendationIds.includes(recommendationId),
  );
  const affectedSectors = activeComparison
    ? Array.from(
        new Set(
          activeComparison.changes.map(({ changeId }) => {
            if (['width', 'playersForward'].includes(changeId)) return 'Ataque';
            if (['tempo', 'passingRisk', 'creativeFreedom'].includes(changeId)) return 'Construção';
            if (
              [
                'blockHeight',
                'defensiveLine',
                'depth',
                'horizontalCompactness',
                'verticalCompactness',
              ].includes(changeId)
            )
              return 'Bloco defensivo';
            return 'Equipe';
          }),
        ),
      )
    : [];
  const affectedPlayerNames = activeComparison
    ? activeComparison.affectedPlayers
        .map((playerId) => playerById.get(playerId)?.shortName)
        .filter((name): name is string => Boolean(name))
        .slice(0, 3)
        .join(', ')
    : '';

  useEffect(() => {
    let active = true;
    void Promise.allSettled(
      tacticalPlayerIds.map(async (playerId) => {
        const profile = await previewPlayerProfile(playerId, draft.variationId);
        return [playerId, profile.contextualRating.perceived.label] as const;
      }),
    ).then((results) => {
      if (!active) return;
      const nextRatings = Object.fromEntries(
        results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : [])),
      );
      if (pointerSessionRef.current) pendingContextualRatingsRef.current = nextRatings;
      else setContextualRatings(nextRatings);
    });
    return () => {
      active = false;
    };
  }, [draft.variationId, tacticalPlayerIds]);

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
      if (sliderPreviewTimerRef.current !== null) {
        window.clearTimeout(sliderPreviewTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    tacticalConfigRef.current = baseModel.config;
  }, [baseModel.config]);

  useEffect(() => {
    semanticOperationRef.current += 1;
    setSemanticPreview(null);
    setSemanticBusy(false);
    setSelectedPhase('base');
    setSliderDraftValues({});
    setSelectedRecommendation(null);
    setRecommendationPreview(null);
    setIgnoredRecommendationIds([]);
    setEditingInstructionId(null);
  }, [draft.variationId]);

  useEffect(() => {
    if (!dirty) {
      semanticOperationRef.current += 1;
      setSemanticPreview(null);
      setSemanticBusy(false);
      setSliderDraftValues({});
    }
  }, [dirty, draft.revision]);

  useEffect(() => {
    setComparisonDismissed(false);
  }, [semanticPreview]);

  const announce = (text: string, rejected = false) => {
    setInteractionMessage(rejected ? '' : text);
    setInteractionError(rejected ? text : '');
  };

  const switchInspectorTool = (tool: TacticalTool) => {
    if (inspectorBodyRef.current) {
      inspectorScrollRef.current[activeTool] = inspectorBodyRef.current.scrollTop;
    }
    onActiveToolChange(tool);
    window.requestAnimationFrame(() => {
      if (inspectorBodyRef.current) {
        inspectorBodyRef.current.scrollTop = inspectorScrollRef.current[tool];
      }
    });
  };

  const invalidateSemanticPreview = () => {
    semanticOperationRef.current += 1;
    setSemanticPreview(null);
    setSemanticBusy(false);
  };

  const applyTacticalConfig = async (tacticalConfig: TacticalModelConfig, text: string) => {
    const operation = ++semanticOperationRef.current;
    tacticalConfigRef.current = tacticalConfig;
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
      tacticalConfigRef.current = model.config;
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

  const updateStrategyScore = (section: StrategySection, field: string, value: number) => {
    if (section === 'inPossession' && ['width', 'playersForward'].includes(field)) {
      setSelectedPhase('inPossession');
    } else if (
      section === 'outOfPossession' &&
      [
        'blockHeight',
        'defensiveLine',
        'depth',
        'horizontalCompactness',
        'verticalCompactness',
      ].includes(field)
    ) {
      setSelectedPhase('outOfPossession');
    } else if (section === 'transitions' && field === 'playersForward') {
      setSelectedPhase('offensiveTransition');
    } else if (section === 'transitions' && field === 'defensiveSecurity') {
      setSelectedPhase('defensiveTransition');
    }
    const currentConfig = tacticalConfigRef.current ?? model.config;
    const strategy = currentConfig.strategy;
    const nextSection = { ...strategy[section], [field]: value };
    void applyTacticalConfig(
      {
        ...currentConfig,
        strategy: { ...strategy, customized: true, [section]: nextSection },
      },
      'Estratégia personalizada; consequências recalculadas pelo modelo tático.',
    );
  };

  const sliderKey = (section: StrategySection, field: string) => `${section}.${field}`;

  const strategyScore = (
    config: TacticalModelConfig | undefined,
    section: StrategySection,
    field: string,
  ) =>
    Number(
      (config?.strategy[section] as unknown as Record<string, number | string> | undefined)?.[
        field
      ] ?? 50,
    );

  const scheduleStrategyPreview = (section: StrategySection, field: string, value: number) => {
    const key = sliderKey(section, field);
    setSliderDraftValues((values) => ({ ...values, [key]: value }));
    if (sliderPreviewTimerRef.current !== null) {
      window.clearTimeout(sliderPreviewTimerRef.current);
    }
    sliderPreviewTimerRef.current = window.setTimeout(() => {
      sliderPreviewTimerRef.current = null;
      updateStrategyScore(section, field, value);
    }, 140);
  };

  const commitStrategyPreview = (section: StrategySection, field: string, value: number) => {
    const alreadyCurrent =
      strategyScore(tacticalConfigRef.current ?? model.config, section, field) === value;
    if (sliderPreviewTimerRef.current !== null) {
      window.clearTimeout(sliderPreviewTimerRef.current);
      sliderPreviewTimerRef.current = null;
    }
    if (alreadyCurrent) return;
    updateStrategyScore(section, field, value);
  };

  const restoreStrategyScore = (section: StrategySection, field: string) => {
    const savedValue = strategyScore(savedModel?.config, section, field);
    const key = sliderKey(section, field);
    setSliderDraftValues((values) => ({ ...values, [key]: savedValue }));
    commitStrategyPreview(section, field, savedValue);
    announce(
      `${
        strategySliderSections
          .flatMap(({ controls }) => controls)
          .find((control) => control.field === field)?.label ?? 'Valor'
      } restaurado ao estado salvo.`,
    );
  };

  const updateProgression = (progression: 'outside' | 'balanced' | 'inside') => {
    const currentConfig = tacticalConfigRef.current ?? model.config;
    const strategy = currentConfig.strategy;
    setSelectedPhase('inPossession');
    void applyTacticalConfig(
      {
        ...currentConfig,
        strategy: {
          ...strategy,
          customized: true,
          inPossession: { ...strategy.inPossession, progression },
        },
      },
      `Progressão ${progressionLabels[progression]} adicionada à proposta sem deslocar a posição base.`,
    );
  };

  const removeInstruction = (instruction: TacticalInstruction) => {
    const currentConfig = tacticalConfigRef.current ?? model.config;
    void applyTacticalConfig(
      {
        ...currentConfig,
        instructions: currentConfig.instructions.filter(
          ({ instructionId }) => instructionId !== instruction.instructionId,
        ),
      },
      `${instruction.description} removida desta variação.`,
    );
  };

  const toggleInstruction = (instruction: TacticalInstruction) => {
    const currentConfig = tacticalConfigRef.current ?? model.config;
    void applyTacticalConfig(
      {
        ...currentConfig,
        instructions: currentConfig.instructions.map((candidate) =>
          candidate.instructionId === instruction.instructionId
            ? { ...candidate, enabled: !candidate.enabled }
            : candidate,
        ),
      },
      `${instruction.description} ${instruction.enabled ? 'desativada' : 'ativada'} na proposta.`,
    );
  };

  const editInstruction = (instruction: TacticalInstruction) => {
    setEditingInstructionId(instruction.instructionId);
    setInstructionScope(instruction.scope);
    setInstructionCategory(instruction.category);
    setInstructionValue(instruction.value);
    window.requestAnimationFrame(() =>
      inspectorBodyRef.current?.querySelector<HTMLElement>('.instruction-composer select')?.focus(),
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
    const currentConfig = tacticalConfigRef.current ?? model.config;
    const ordinal = currentConfig.instructions.length + 1;
    const existingInstruction = currentConfig.instructions.find(
      ({ instructionId }) => instructionId === editingInstructionId,
    );
    const instruction: TacticalInstruction = {
      instructionId:
        existingInstruction?.instructionId ??
        `${instructionScope}.${instructionCategory}.${draft.revision}.${ordinal}`,
      category: instructionCategory,
      scope: instructionScope,
      target,
      value: selectedInstruction?.value ?? 'balanced',
      intensity: 60,
      description: `${selectedInstruction?.label ?? 'Instrução'} — ${instructionScopeLabels[instructionScope]}`,
      expectedEffects: [selectedInstruction?.effect ?? 'Efeito resolvido conforme precedência.'],
      requirements: [],
      incompatibilities: [],
      precedence: 0,
      familiarityImpact: -2,
      revision: draft.revision,
      enabled: existingInstruction?.enabled ?? true,
    };
    const instructions = existingInstruction
      ? currentConfig.instructions.map((candidate) =>
          candidate.instructionId === existingInstruction.instructionId ? instruction : candidate,
        )
      : [...currentConfig.instructions, instruction];
    setEditingInstructionId(null);
    void applyTacticalConfig(
      { ...currentConfig, instructions },
      `${selectedInstruction?.label ?? 'Instrução'} ${existingInstruction ? 'atualizada' : 'adicionada'} à proposta.`,
    );
  };

  const recommendationValue = (config: TacticalModelConfig, path: string) => {
    const [, section, field] = path.split('.');
    if (!section || !field || !['inPossession', 'outOfPossession', 'transitions'].includes(section))
      return null;
    return strategyScore(config, section as StrategySection, field);
  };

  const applyRecommendationChanges = (
    config: TacticalModelConfig,
    recommendation: TacticalRecommendation,
  ) => {
    let next = config;
    for (const change of recommendation.proposedChanges) {
      const [, section, field] = change.path.split('.');
      if (
        !section ||
        !field ||
        !['inPossession', 'outOfPossession', 'transitions'].includes(section)
      )
        continue;
      const typedSection = section as StrategySection;
      const strategy = next.strategy;
      next = {
        ...next,
        strategy: {
          ...strategy,
          customized: true,
          [typedSection]: { ...strategy[typedSection], [field]: change.to },
        },
      };
    }
    return next;
  };

  const openRecommendation = async (recommendation: TacticalRecommendation) => {
    setStaleRecommendation(false);
    setSelectedRecommendation(recommendation);
    setRecommendationBusy(true);
    const currentConfig = tacticalConfigRef.current ?? baseModel.config;
    try {
      const previewConfig = applyRecommendationChanges(currentConfig, recommendation);
      const nextApproach = presetApproach[previewConfig.strategy.presetId];
      const candidate = {
        ...draft,
        tacticalModel: { ...baseModel, config: previewConfig },
      };
      const preview = await previewTacticalPlan(toTacticalPlanProposal(candidate, nextApproach));
      setRecommendationPreview(preview);
      const firstPath = recommendation.proposedChanges[0]?.path;
      if (firstPath?.includes('inPossession')) setSelectedPhase('inPossession');
      if (firstPath?.includes('outOfPossession')) setSelectedPhase('outOfPossession');
      if (firstPath?.includes('transitions')) setSelectedPhase('offensiveTransition');
    } catch (reason) {
      announce(
        reason instanceof Error ? reason.message : 'A recomendação não pôde ser visualizada.',
        true,
      );
    } finally {
      setRecommendationBusy(false);
    }
  };

  const closeRecommendation = () => {
    setSelectedRecommendation(null);
    setRecommendationPreview(null);
    setStaleRecommendation(false);
  };

  const applyRecommendation = () => {
    if (!selectedRecommendation) return;
    const currentConfig = tacticalConfigRef.current ?? model.config;
    const currentValuesMatch = selectedRecommendation.proposedChanges.every(
      (change) => recommendationValue(currentConfig, change.path) === change.from,
    );
    if (
      selectedRecommendation.variationId !== draft.variationId ||
      selectedRecommendation.planRevision !== draft.revision ||
      !currentValuesMatch
    ) {
      setStaleRecommendation(true);
      return;
    }
    const firstPath = selectedRecommendation.proposedChanges[0]?.path;
    if (firstPath?.includes('inPossession')) setSelectedPhase('inPossession');
    if (firstPath?.includes('outOfPossession')) setSelectedPhase('outOfPossession');
    if (firstPath?.includes('transitions')) setSelectedPhase('offensiveTransition');
    const nextConfig = applyRecommendationChanges(currentConfig, selectedRecommendation);
    closeRecommendation();
    void applyTacticalConfig(
      nextConfig,
      'Recomendação aplicada à proposta. Revise a comparação antes de salvar.',
    );
  };

  const recalculateRecommendation = () => {
    closeRecommendation();
    void refreshTacticalProjection(
      { ...draft, tacticalModel: model },
      'Recomendação reavaliada para o estado atual.',
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
    const pendingContextualRatings = pendingContextualRatingsRef.current;
    if (pendingContextualRatings) {
      pendingContextualRatingsRef.current = null;
      setContextualRatings(pendingContextualRatings);
    }
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
          <p className="variation-heading__meta">
            <span>Formação {draft.formation}</span>
            <span>
              {phaseOptions.find(({ id }) => id === selectedPhase)?.label ?? 'Posição base'}
            </span>
            <span>Prontidão {readiness}%</span>
            <span title={primaryRisk}>Alerta: {primaryRisk}</span>
          </p>
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
            <option value="roles">Capacidade atual</option>
            <option value="context">Avaliação no contexto</option>
            <option value="familiarity">Familiaridade</option>
            <option value="condition">Condição</option>
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

      <AlertDialogPrimitive.Root
        onOpenChange={(open) => {
          if (!open && !recommendationBusy) closeRecommendation();
        }}
        open={selectedRecommendation !== null}
      >
        <AlertDialogPrimitive.Portal>
          <AlertDialogPrimitive.Overlay className="rv-modal-backdrop" />
          <AlertDialogPrimitive.Content className="rv-dialog rv-alert-dialog recommendation-dialog">
            <AlertDialogPrimitive.Title>Revisar recomendação</AlertDialogPrimitive.Title>
            <AlertDialogPrimitive.Description className="rv-dialog__description">
              Visualize o efeito no campo e compare os valores antes de aplicar à proposta.
            </AlertDialogPrimitive.Description>
            {selectedRecommendation && (
              <div className="recommendation-dialog__body">
                <header>
                  <span>{selectedRecommendation.origin}</span>
                  <strong>{selectedRecommendation.reason}</strong>
                  <small>Confiança {selectedRecommendation.confidence}%</small>
                </header>
                {staleRecommendation ? (
                  <section className="recommendation-stale" role="alert">
                    <strong>Esta recomendação foi criada para uma versão anterior do plano.</strong>
                    <p>Recalcule ou descarte antes de continuar. Nenhum valor foi aplicado.</p>
                  </section>
                ) : (
                  <>
                    <dl className="recommendation-metadata">
                      <div>
                        <dt>Variação</dt>
                        <dd>{selectedRecommendation.variationId}</dd>
                      </div>
                      <div>
                        <dt>Revisão do plano</dt>
                        <dd>{selectedRecommendation.planRevision}</dd>
                      </div>
                      <div>
                        <dt>Familiaridade</dt>
                        <dd>
                          {recommendationPreview?.comparison
                            ? `${recommendationPreview.comparison.familiarityBefore}% → ${recommendationPreview.comparison.familiarityAfter}%`
                            : 'Calculando…'}
                        </dd>
                      </div>
                    </dl>
                    <section className="recommendation-changes">
                      <h3>Parâmetros afetados</h3>
                      {selectedRecommendation.proposedChanges.map((change) => (
                        <p key={change.path}>
                          <span>
                            {recommendationPreview?.comparison?.changes.find(({ changeId }) =>
                              change.path.endsWith(changeId),
                            )?.label ?? strategyChangeLabel(change.path)}
                          </span>
                          <strong>
                            {change.from} → {change.to}
                          </strong>
                        </p>
                      ))}
                    </section>
                    <div className="recommendation-impact">
                      <p>+ {selectedRecommendation.benefit}</p>
                      <p>− {selectedRecommendation.risk}</p>
                      <p>Setores: {affectedSectors.join(' · ') || 'estrutura coletiva'}</p>
                      <p>
                        Jogadores:{' '}
                        {selectedRecommendation.affectedPlayers
                          .map((playerId) => playerById.get(playerId)?.shortName)
                          .filter(Boolean)
                          .slice(0, 5)
                          .join(', ') || 'equipe'}
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
            <div className="rv-dialog__actions recommendation-dialog__actions">
              {staleRecommendation ? (
                <>
                  <Button onClick={recalculateRecommendation} variant="primary">
                    Recalcular
                  </Button>
                  <Button
                    onClick={() => {
                      if (selectedRecommendation) {
                        setIgnoredRecommendationIds((ids) => [
                          ...ids,
                          selectedRecommendation.recommendationId,
                        ]);
                      }
                      closeRecommendation();
                    }}
                    variant="secondary"
                  >
                    Descartar
                  </Button>
                </>
              ) : (
                <Button
                  disabled={recommendationBusy || !recommendationPreview}
                  loading={recommendationBusy}
                  loadingLabel="Calculando…"
                  onClick={applyRecommendation}
                  variant="primary"
                >
                  Aplicar à proposta
                </Button>
              )}
              {!staleRecommendation && (
                <Button
                  onClick={() => {
                    if (selectedRecommendation) {
                      setIgnoredRecommendationIds((ids) => [
                        ...ids,
                        selectedRecommendation.recommendationId,
                      ]);
                    }
                    closeRecommendation();
                  }}
                  variant="secondary"
                >
                  Ignorar
                </Button>
              )}
              <AlertDialogPrimitive.Cancel asChild>
                <Button disabled={recommendationBusy} variant="secondary">
                  Cancelar
                </Button>
              </AlertDialogPrimitive.Cancel>
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
              {selectedPhase === 'inPossession' && (
                <li
                  aria-label={`Indicadores comportamentais: progressão ${progressionLabels[model.config.strategy.inPossession.progression]}, ritmo ${model.config.strategy.inPossession.tempo}, risco dos passes ${model.config.strategy.inPossession.passingRisk} e liberdade criativa ${model.config.strategy.inPossession.creativeFreedom}. Estes indicadores não deslocam jogadores.`}
                  className="pitch-behavior-cues"
                  data-progression={model.config.strategy.inPossession.progression}
                >
                  <span className="pitch-behavior-cues__left" aria-hidden="true" />
                  <span className="pitch-behavior-cues__center" aria-hidden="true" />
                  <span className="pitch-behavior-cues__right" aria-hidden="true" />
                  <p>
                    <strong>
                      Progressão {progressionLabels[model.config.strategy.inPossession.progression]}
                    </strong>
                    <small>
                      Ritmo {model.config.strategy.inPossession.tempo} · risco{' '}
                      {model.config.strategy.inPossession.passingRisk} · liberdade{' '}
                      {model.config.strategy.inPossession.creativeFreedom}
                    </small>
                  </p>
                </li>
              )}
              {activeComparison &&
                selectedPhase !== 'base' &&
                draft.placements.map((placement) => {
                  const savedPoint = savedPhasePlayerById.get(placement.playerId);
                  if (!savedPoint) return null;
                  return (
                    <li
                      aria-hidden="true"
                      className="pitch-saved-ghost"
                      key={`saved-${placement.playerId}`}
                      style={
                        {
                          '--slot-x': `${savedPoint.normalizedX * 100}%`,
                          '--slot-y': `${savedPoint.normalizedY * 100}%`,
                        } as CSSProperties
                      }
                    >
                      <span />
                    </li>
                  );
                })}
              {draft.placements.map((placement) => {
                const player = playerById.get(placement.playerId);
                if (!player) return null;
                recordDragMetric('fieldCardRenders');
                if (pointerSessionRef.current?.playerId === player.id) {
                  recordDragMetric('draggedCardRenders');
                }
                const playerFamiliarity = model.familiarity.individuals.find(
                  ({ playerId }) => playerId === player.id,
                );
                const phasePoint =
                  selectedPhase === 'base' ? undefined : phasePlayerById.get(player.id);
                const style = {
                  '--slot-x': `${(phasePoint?.normalizedX ?? placement.normalizedX) * 100}%`,
                  '--slot-y': `${(phasePoint?.normalizedY ?? placement.normalizedY) * 100}%`,
                } as CSSProperties;
                const metric = tacticalPrimaryMetric({
                  mode: pitchMode,
                  player,
                  familiarity: playerFamiliarity?.contextual ?? 0,
                  contextualRating: contextualRatings[player.id],
                });
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
                      aria-label={`${positionLabels[placement.positionId]}: ${player.name}, camisa ${player.shirtNumber}, ${metric.accessibleLabel}, condição física ${player.condition}%. ${selectedPhase === 'base' ? 'Selecione para mover.' : 'Projeção derivada, somente leitura.'}`}
                      aria-pressed={selectedPlayerId === player.id}
                      className="pitch-player-card"
                      data-card-variant="field"
                      data-primary-metric={metric.kind}
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
                      <TacticalPlayerCardContent
                        displayName={pitchPlayerName(player)}
                        metric={metric}
                        player={player}
                        positionLabel={positionLabels[placement.positionId]}
                      />
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
                  const familiarity =
                    model.familiarity.individuals.find(
                      ({ playerId: candidateId }) => candidateId === player.id,
                    )?.contextual ?? 0;
                  const metric = tacticalPrimaryMetric({
                    mode: pitchMode,
                    player,
                    familiarity,
                    contextualRating: contextualRatings[player.id],
                  });
                  return (
                    <li key={player.id}>
                      <button
                        aria-description={`Camisa ${player.shirtNumber}, ${positionLabels[player.position]}, ${metric.accessibleLabel}, condição física ${player.condition}%`}
                        aria-label={`Selecionar reserva ${player.name}`}
                        aria-pressed={selectedPlayerId === player.id}
                        className="bench-player"
                        data-card-variant="bench"
                        data-primary-metric={metric.kind}
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
                        <TacticalPlayerCardContent
                          displayName={player.shortName}
                          metric={metric}
                          player={player}
                          positionLabel={positionLabels[player.position]}
                        />
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
          <nav aria-label="Ferramentas táticas" className="tactics-tool-nav" role="tablist">
            {tacticalTools.map(([tool, icon, label]) => (
              <button
                aria-controls={`tactics-panel-${tool}`}
                aria-selected={activeTool === tool}
                id={`tactics-tab-${tool}`}
                key={tool}
                onClick={() => switchInspectorTool(tool)}
                onKeyDown={(event) => {
                  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
                  event.preventDefault();
                  const index = tacticalTools.findIndex(([candidate]) => candidate === tool);
                  const nextIndex =
                    event.key === 'Home'
                      ? 0
                      : event.key === 'End'
                        ? tacticalTools.length - 1
                        : event.key === 'ArrowRight'
                          ? (index + 1) % tacticalTools.length
                          : (index - 1 + tacticalTools.length) % tacticalTools.length;
                  const nextTool = tacticalTools[nextIndex]?.[0];
                  if (!nextTool) return;
                  switchInspectorTool(nextTool);
                  window.requestAnimationFrame(() =>
                    document.getElementById(`tactics-tab-${nextTool}`)?.focus(),
                  );
                }}
                role="tab"
                tabIndex={activeTool === tool ? 0 : -1}
                type="button"
              >
                <Icon name={icon} size={20} /> <span>{label}</span>
              </button>
            ))}
          </nav>
          <header className="inspector-heading tactics-inspector__summary" aria-live="polite">
            <span>{inspectorSummary.eyebrow}</span>
            <h2>{inspectorSummary.title}</h2>
            <p>{inspectorSummary.detail}</p>
          </header>
          <div
            aria-labelledby={`tactics-tab-${activeTool}`}
            className="tactics-inspector__body tactics-inspector__content"
            id={`tactics-panel-${activeTool}`}
            ref={inspectorBodyRef}
            role="tabpanel"
            tabIndex={0}
          >
            {activeTool === 'analysis' && (
              <>
                <section className="analysis-decision">
                  <span>Prontidão tática</span>
                  <strong>
                    {readiness >= 80 ? 'Muito boa' : readiness >= 65 ? 'Boa' : 'Em adaptação'} —{' '}
                    {readiness}%
                  </strong>
                  <p>Condição do XI {averageCondition}% · análise do modelo tático</p>
                </section>
                <div className="analysis-priorities">
                  <section>
                    <h3>Pontos fortes</h3>
                    {(model.diagnostic.strengths.length > 0
                      ? model.diagnostic.strengths
                      : ['Estrutura sem vantagem dominante identificada.']
                    )
                      .slice(0, 3)
                      .map((item) => (
                        <p key={item}>+ {item}</p>
                      ))}
                  </section>
                  <section>
                    <h3>Pontos de atenção</h3>
                    {([...model.diagnostic.risks, ...model.diagnostic.vulnerabilities].length > 0
                      ? [...model.diagnostic.risks, ...model.diagnostic.vulnerabilities]
                      : ['Nenhum risco dominante identificado.']
                    )
                      .slice(0, 3)
                      .map((item) => (
                        <p key={item}>− {item}</p>
                      ))}
                  </section>
                </div>
                {(validation.errors.length > 0 || validation.warnings.length > 0) && (
                  <section className="analysis-blockers" role="alert">
                    <h3>Antes de salvar</h3>
                    {[...validation.errors, ...validation.warnings].slice(0, 4).map((item) => (
                      <p key={item}>{item}</p>
                    ))}
                  </section>
                )}
                <details className="familiarity-details">
                  <summary>
                    <span>
                      <strong>Familiaridade geral</strong>
                      <small>
                        {activeComparison
                          ? `${activeComparison.familiarityBefore}% → ${activeComparison.familiarityAfter}%`
                          : `${model.familiarity.overall}% · sem alteração significativa`}
                      </small>
                    </span>
                    <span>Ver dimensões</span>
                  </summary>
                  {activeComparison && (
                    <div className="familiarity-reasons">
                      <strong>Por que mudou</strong>
                      {activeComparison.changes.slice(0, 3).map((change) => (
                        <p key={change.changeId}>{change.cause}</p>
                      ))}
                    </div>
                  )}
                  <dl className="diagnostic-metrics">
                    {model.familiarity.collective.map((dimension) => (
                      <div key={dimension.dimensionId}>
                        <dt>{dimension.explanation}</dt>
                        <dd>{dimension.score}%</dd>
                        <i>
                          <b style={{ '--metric': `${dimension.score}%` } as CSSProperties} />
                        </i>
                      </div>
                    ))}
                  </dl>
                </details>
                <section className="tactical-recommendations">
                  <header>
                    <div>
                      <h3>Decisões assistidas</h3>
                      <p>Análise do modelo tático</p>
                    </div>
                    <span>{visibleRecommendations.length}</span>
                  </header>
                  {visibleRecommendations.length === 0 ? (
                    <div className="tactics-empty-state">
                      <strong>Nenhum ajuste prioritário</strong>
                      <p>O modelo não identificou uma recomendação segura para este plano.</p>
                    </div>
                  ) : (
                    visibleRecommendations.map((recommendation) => {
                      const change = recommendation.proposedChanges[0];
                      return (
                        <article key={recommendation.recommendationId}>
                          <small>{recommendation.origin}</small>
                          <strong>{recommendation.reason}</strong>
                          {change && (
                            <b>
                              {change.from} → {change.to}
                            </b>
                          )}
                          <p>+ {recommendation.benefit}</p>
                          <p>− {recommendation.risk}</p>
                          <footer>
                            <span>Confiança {recommendation.confidence}%</span>
                            <button
                              disabled={semanticBusy}
                              onClick={() => void openRecommendation(recommendation)}
                              type="button"
                            >
                              Ver alterações
                            </button>
                          </footer>
                        </article>
                      );
                    })
                  )}
                </section>
              </>
            )}
            {activeTool === 'tactics' && (
              <>
                <section className="strategy-overview">
                  <header>
                    <div>
                      <span>Plano atual</span>
                      <strong>{model.resolvedStrategy.mentality}</strong>
                    </div>
                    <b>{model.config.strategy.customized ? 'Personalizada' : 'Preset'}</b>
                  </header>
                  <dl>
                    <div>
                      <dt>Risco</dt>
                      <dd>{model.resolvedStrategy.risk}%</dd>
                    </div>
                    <div>
                      <dt>Exigência física</dt>
                      <dd>{model.resolvedStrategy.physicalDemand}%</dd>
                    </div>
                    <div>
                      <dt>Familiaridade</dt>
                      <dd>{model.familiarity.overall}%</dd>
                    </div>
                  </dl>
                  <p>+ {model.resolvedStrategy.strengths[0] ?? 'estrutura equilibrada'}</p>
                  <p>− {model.resolvedStrategy.vulnerabilities[0] ?? primaryRisk}</p>
                </section>
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
                        Aplicar à proposta
                      </Button>
                      <Button onClick={() => setPendingStrategyPreset(null)} variant="secondary">
                        Cancelar e manter personalização
                      </Button>
                    </div>
                  </section>
                )}
                <button
                  className="advanced-strategy-toggle"
                  aria-expanded={advancedStrategyOpen}
                  onClick={() => setAdvancedStrategyOpen((open) => !open)}
                  type="button"
                >
                  Personalizar estratégia
                </button>
                {advancedStrategyOpen && (
                  <div className="advanced-strategy" ref={advancedControlsRef}>
                    {strategySliderSections.map(({ id: section, title, controls }) => {
                      const open = openStrategySection === section;
                      const summary = controls
                        .slice(0, 3)
                        .map(
                          ({ field, label }) =>
                            `${label} ${qualitativeScore(strategyScore(model.config, section, field)).toLocaleLowerCase('pt-BR')}`,
                        )
                        .join(' · ');
                      return (
                        <section
                          className="strategy-phase"
                          data-open={open || undefined}
                          key={section}
                        >
                          <button
                            aria-controls={`strategy-phase-${section}`}
                            aria-expanded={open}
                            className="strategy-phase__trigger"
                            onClick={() => setOpenStrategySection(section)}
                            type="button"
                          >
                            <span>
                              <strong>{title}</strong>
                              <small>{summary}</small>
                            </span>
                            <span aria-hidden="true">⌄</span>
                          </button>
                          <div hidden={!open} id={`strategy-phase-${section}`}>
                            {controls.map((control) => {
                              const key = sliderKey(section, control.field);
                              const value =
                                sliderDraftValues[key] ??
                                strategyScore(model.config, section, control.field);
                              const savedValue = strategyScore(
                                savedModel?.config,
                                section,
                                control.field,
                              );
                              const changed = value !== savedValue;
                              return (
                                <div
                                  className="tactical-slider"
                                  data-changed={changed || undefined}
                                  key={control.field}
                                >
                                  <header>
                                    <label htmlFor={`strategy-${key}`}>
                                      <strong>{control.label}</strong>
                                      <span>
                                        {value} — {qualitativeScore(value)}
                                      </span>
                                    </label>
                                    <button
                                      disabled={!changed || saving}
                                      onClick={() => restoreStrategyScore(section, control.field)}
                                      title={`Restaurar ${control.label.toLocaleLowerCase('pt-BR')} ao valor salvo ${savedValue}`}
                                      type="button"
                                    >
                                      Restaurar
                                    </button>
                                  </header>
                                  <div className="tactical-slider__track">
                                    <input
                                      aria-label={control.label}
                                      aria-describedby={`strategy-help-${key}`}
                                      aria-valuemax={100}
                                      aria-valuemin={0}
                                      aria-valuenow={value}
                                      aria-valuetext={`${value}, ${qualitativeScore(value)}`}
                                      disabled={saving}
                                      id={`strategy-${key}`}
                                      max="100"
                                      min="0"
                                      onBlur={() =>
                                        commitStrategyPreview(section, control.field, value)
                                      }
                                      onChange={(event) =>
                                        scheduleStrategyPreview(
                                          section,
                                          control.field,
                                          Number(event.target.value),
                                        )
                                      }
                                      onKeyUp={(event) =>
                                        commitStrategyPreview(
                                          section,
                                          control.field,
                                          Number(event.currentTarget.value),
                                        )
                                      }
                                      onPointerUp={(event) =>
                                        commitStrategyPreview(
                                          section,
                                          control.field,
                                          Number(event.currentTarget.value),
                                        )
                                      }
                                      step="1"
                                      style={
                                        {
                                          '--proposal-value': `${value}%`,
                                          '--saved-value': `${savedValue}%`,
                                        } as CSSProperties
                                      }
                                      type="range"
                                      value={value}
                                    />
                                    <i
                                      aria-hidden="true"
                                      className="tactical-slider__saved"
                                      style={{ '--saved-value': `${savedValue}%` } as CSSProperties}
                                    />
                                  </div>
                                  <div className="tactical-slider__extremes" aria-hidden="true">
                                    <span>{control.low}</span>
                                    <span>{control.high}</span>
                                  </div>
                                  <p id={`strategy-help-${key}`}>{control.help}</p>
                                  <div className="tactical-slider__impact">
                                    <span>+ {control.benefit}</span>
                                    <span>− {control.risk}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </section>
                      );
                    })}
                    <fieldset className="behavioral-strategy">
                      <legend>Leitura comportamental</legend>
                      <label>
                        <span>Tipo de progressão</span>
                        <select
                          disabled={semanticBusy}
                          onChange={(event) =>
                            updateProgression(
                              event.target.value as 'outside' | 'balanced' | 'inside',
                            )
                          }
                          value={model.config.strategy.inPossession.progression}
                        >
                          <option value="outside">Pelos corredores</option>
                          <option value="balanced">Por dentro e por fora</option>
                          <option value="inside">Pelo corredor central</option>
                        </select>
                      </label>
                      <p>
                        Ritmo, risco dos passes, liberdade criativa e progressão aparecem como
                        corredores e consequências explicáveis no campo; não reposicionam jogadores.
                      </p>
                    </fieldset>
                  </div>
                )}
              </>
            )}
            {activeTool === 'instructions' && (
              <>
                <div className="instruction-list">
                  {model.config.instructions.length === 0 ? (
                    <div className="tactics-empty-state">
                      <strong>Nenhuma instrução específica</strong>
                      <p>
                        O preset coletivo continua valendo. Use o fluxo abaixo para orientar um
                        comportamento.
                      </p>
                    </div>
                  ) : (
                    model.config.instructions.map((instruction) => {
                      const option = instructionOptions[instruction.category].find(
                        ({ value }) => value === instruction.value,
                      );
                      const conflict = model.instructionConflicts.find(({ instructionIds }) =>
                        instructionIds.includes(instruction.instructionId),
                      );
                      return (
                        <article
                          className="instruction-card"
                          data-disabled={!instruction.enabled || undefined}
                          key={instruction.instructionId}
                        >
                          <header>
                            <span>
                              <small>
                                {instructionScopeLabels[instruction.scope]} ·{' '}
                                {instructionCategoryLabels[instruction.category]}
                              </small>
                              <strong>{option?.label ?? instruction.description}</strong>
                            </span>
                            <b>{instruction.enabled ? 'Ativa' : 'Desativada'}</b>
                          </header>
                          <p>{option?.effect ?? instruction.expectedEffects.join(' · ')}</p>
                          <div className="instruction-card__impact">
                            <span>+ {option?.benefit ?? instruction.expectedEffects[0]}</span>
                            <span>
                              − {option?.risk ?? 'Requer adaptação às novas responsabilidades.'}
                            </span>
                          </div>
                          {conflict && (
                            <strong className="instruction-card__conflict">
                              Conflito resolvido
                            </strong>
                          )}
                          {impactInstructionId === instruction.instructionId && (
                            <div className="instruction-card__details">
                              <span>Origem: proposta do usuário</span>
                              <span>
                                Familiaridade: {instruction.familiarityImpact} pontos potenciais
                              </span>
                              <span>Precedência: {instructionScopeLabels[instruction.scope]}</span>
                            </div>
                          )}
                          <footer>
                            <button onClick={() => editInstruction(instruction)} type="button">
                              Editar
                            </button>
                            <button onClick={() => toggleInstruction(instruction)} type="button">
                              {instruction.enabled ? 'Desativar' : 'Ativar'}
                            </button>
                            <button
                              aria-expanded={impactInstructionId === instruction.instructionId}
                              onClick={() =>
                                setImpactInstructionId((current) =>
                                  current === instruction.instructionId
                                    ? null
                                    : instruction.instructionId,
                                )
                              }
                              type="button"
                            >
                              Ver impacto
                            </button>
                            <button onClick={() => removeInstruction(instruction)} type="button">
                              Remover
                            </button>
                          </footer>
                        </article>
                      );
                    })
                  )}
                </div>
                <fieldset className="instruction-composer">
                  <legend>{editingInstructionId ? 'Editar instrução' : 'Nova instrução'}</legend>
                  <label>
                    <span>1. Aplicar a</span>
                    <select
                      value={instructionScope}
                      onChange={(event) =>
                        setInstructionScope(event.target.value as TacticalInstructionScope)
                      }
                    >
                      {(['collective', 'sector', 'position', 'role', 'individual'] as const).map(
                        (scope) => (
                          <option key={scope} value={scope}>
                            {instructionScopeLabels[scope]}
                          </option>
                        ),
                      )}
                    </select>
                  </label>
                  <label>
                    <span>2. Categoria</span>
                    <select
                      value={instructionCategory}
                      onChange={(event) => {
                        const category = event.target.value as TacticalInstructionCategory;
                        setInstructionCategory(category);
                        setInstructionValue(instructionOptions[category][0]?.value ?? 'balanced');
                      }}
                    >
                      {instructionComposerCategories.map((category) => (
                        <option key={category} value={category}>
                          {instructionCategoryLabels[category]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>3. Instrução</span>
                    <select
                      value={instructionValue}
                      onChange={(event) => setInstructionValue(event.target.value)}
                    >
                      {instructionOptions[instructionCategory].map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="instruction-composer__effect">
                    <strong>4. Efeito esperado</strong>
                    <p>{selectedInstruction?.effect}</p>
                    <span>+ {selectedInstruction?.benefit}</span>
                    <span>− {selectedInstruction?.risk}</span>
                    <small>Familiaridade: adaptação estimada de 2 pontos.</small>
                  </div>
                  <p className="instruction-composer__persistence">
                    A instrução entra na proposta atual e só é persistida ao salvar o plano.
                  </p>
                  <Button
                    disabled={
                      semanticBusy || (instructionScope === 'individual' && !selectedPlayerId)
                    }
                    onClick={addInstruction}
                    variant="secondary"
                  >
                    {editingInstructionId ? 'Atualizar instrução' : 'Adicionar instrução'}
                  </Button>
                  {editingInstructionId && (
                    <button
                      className="instruction-composer__cancel"
                      onClick={() => setEditingInstructionId(null)}
                      type="button"
                    >
                      Cancelar edição
                    </button>
                  )}
                </fieldset>
                <details className="instruction-precedence">
                  <summary>Como as instruções são resolvidas</summary>
                  <p>
                    Jogador → função → posição → setor → equipe → preset. O domínio registra qual
                    comportamento prevalece em cada conflito.
                  </p>
                </details>
                {model.instructionConflicts.map((conflict) => (
                  <article className="instruction-conflict" key={conflict.conflictId} role="alert">
                    <strong>
                      Conflito resolvido:{' '}
                      {model.config.instructions.find(
                        ({ instructionId }) => instructionId === conflict.winnerId,
                      )?.description ?? 'instrução de maior precedência'}
                    </strong>
                    <p>{conflict.reason}</p>
                    <small>Comportamento final: {conflict.resolvedBehavior}</small>
                  </article>
                ))}
              </>
            )}
            {activeTool === 'opposition' && (
              <>
                <section className="opposition-overview">
                  <span
                    className="club-crest"
                    style={{ '--club-color': state.opponent.primaryColor } as CSSProperties}
                  >
                    {state.opponent.shortName}
                  </span>
                  <div>
                    <small>Próximo adversário · rodada {state.round}</small>
                    <strong>{state.opponent.name}</strong>
                    <p>Competição nacional · preparação do plano atual</p>
                  </div>
                  <Button onClick={() => onOpenClub(state.opponent.id)} variant="secondary">
                    Abrir perfil do clube
                  </Button>
                </section>
                {model.opposition.knowledge ? (
                  <section className="opposition-knowledge">
                    <strong>Confiança {model.opposition.knowledge.confidence}%</strong>
                    <p>Fonte: {model.opposition.knowledge.source}</p>
                    <p>
                      Atualizado em{' '}
                      {new Date(model.opposition.knowledge.observedAt).toLocaleDateString('pt-BR')}
                    </p>
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
                  <section className="opposition-note">
                    <Icon name="information" size={20} />
                    <div>
                      <strong>Sem relatório disponível</strong>
                      <p>
                        Não existe informação autoritativa sobre este adversário. Nenhum dado foi
                        inventado.
                      </p>
                      <small>
                        Um futuro relatório de observação poderá preencher origem, confiança, data e
                        fatos conhecidos.
                      </small>
                    </div>
                  </section>
                )}
                <h3 className="opposition-instructions-title">Instruções persistidas</h3>
                {model.opposition.instructions.length === 0 && (
                  <div className="tactics-empty-state">
                    <strong>Nenhuma instrução de oposição</strong>
                    <p>O plano permanece neutro enquanto não há informação confiável.</p>
                  </div>
                )}
                {model.opposition.instructions.map((instruction) => (
                  <article className="opposition-instruction" key={instruction.instructionId}>
                    <strong>
                      {instructionScopeLabels[instruction.scope]}: {instruction.targetId}
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
          {activeComparison && (
            <section
              aria-label="Comparação entre salvo e proposta"
              aria-live="polite"
              className="tactics-proposal"
            >
              <div className="tactics-proposal__summary">
                <strong>Salvo r{activeComparison.fromRevision}</strong>
                <span aria-hidden="true">→</span>
                <strong>Proposta atual</strong>
                <small>
                  {affectedSectors.join(' · ') || 'Equipe'} ·{' '}
                  {activeComparison.affectedPlayers.length} jogadores
                  {affectedPlayerNames ? ` (${affectedPlayerNames})` : ''} · familiaridade{' '}
                  {activeComparison.familiarityBefore}% → {activeComparison.familiarityAfter}%
                </small>
                <small>
                  {activeComparison.changes
                    .slice(0, 2)
                    .map((change) => `${change.label}: ${change.before} → ${change.after}`)
                    .join(' · ')}
                </small>
                <small>
                  Benefícios: {model.resolvedStrategy.strengths[0] ?? 'equilíbrio preservado'} ·
                  Riscos: {activeComparison.risksCreated[0] ?? 'nenhum novo risco dominante'}
                </small>
              </div>
              <div className="tactics-proposal__actions">
                <button
                  onClick={() =>
                    announce('A proposta atual foi mantida no rascunho; nada foi salvo ainda.')
                  }
                  type="button"
                >
                  Aplicar à proposta
                </button>
                <button
                  onClick={() => {
                    setAdvancedStrategyOpen(true);
                    window.setTimeout(
                      () =>
                        advancedControlsRef.current?.querySelector<HTMLElement>('input')?.focus(),
                      0,
                    );
                  }}
                  type="button"
                >
                  Continuar editando
                </button>
                <button
                  onClick={() => {
                    invalidateSemanticPreview();
                    setSliderDraftValues({});
                    onDiscard();
                  }}
                  type="button"
                >
                  Restaurar salvo
                </button>
                <button onClick={() => setComparisonDismissed(true)} type="button">
                  Cancelar comparação
                </button>
                <button
                  disabled={!dirty || !validation.valid || saving}
                  onClick={() => void onSave()}
                  type="button"
                >
                  Salvar plano
                </button>
              </div>
            </section>
          )}
          <footer className="tactics-focus-player">
            {focusedPlayer && focusedPlayerMetric ? (
              <>
                <div
                  aria-label={`${focusedPlayer.name}, ${focusedPlayerMetric.accessibleLabel}`}
                  className="tactical-player-card tactical-player-card--focus"
                  data-card-variant="focus"
                  data-primary-metric={focusedPlayerMetric.kind}
                >
                  <TacticalPlayerCardContent
                    displayName={focusedPlayer.shortName}
                    metric={focusedPlayerMetric}
                    player={focusedPlayer}
                    positionLabel={positionLabels[focusedPlayer.position]}
                  />
                </div>
                <span className="tactics-focus-player__detail">
                  <small>Jogador em foco</small>
                  <strong>{focusedPlayerMetric.accessibleLabel}</strong>
                  <b>
                    {activeTool === 'analysis' &&
                      `${positionLabels[focusedPlayer.position]} · familiaridade com o plano ${focusedPlayerFamiliarity}%`}
                    {activeTool === 'tactics' &&
                      `${activeComparison?.affectedPlayers.includes(focusedPlayer.id) ? 'Afetado pela proposta' : 'Sem impacto individual relevante'} · condição ${focusedPlayer.condition}%`}
                    {activeTool === 'instructions' &&
                      `${model.resolvedInstructions.filter(({ target }) => target === 'team' || target === focusedPlayer.id).length} instruções aplicadas`}
                    {activeTool === 'opposition' &&
                      `${model.opposition.instructions.filter(({ targetId }) => targetId === focusedPlayer.id).length} responsabilidades de oposição`}
                  </b>
                </span>
                <Button
                  className="tactics-focus-player__profile"
                  onClick={() => onOpenProfile(focusedPlayer.id)}
                  variant="secondary"
                >
                  Abrir perfil
                </Button>
              </>
            ) : (
              <span className="tactics-focus-team">
                <small>Contexto atual</small>
                <strong>Visão da equipe</strong>
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
