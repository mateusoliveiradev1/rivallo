import type {
  TacticalFamiliaritySnapshot,
  TacticalModelConfig,
  TacticalModelSnapshot,
  TacticalPlanSnapshot,
  TacticalStrategyPresetSummary,
} from './types.js';

export const tacticalConfigFixture = (): TacticalModelConfig => ({
  schemaVersion: 2,
  strategy: {
    presetId: 'balanced',
    customized: false,
    inPossession: {
      width: 55,
      tempo: 50,
      passingRisk: 45,
      playersForward: 50,
      creativeFreedom: 50,
      buildUp: 'supported',
      progression: 'balanced',
    },
    outOfPossession: {
      blockHeight: 50,
      defensiveLine: 50,
      depth: 50,
      pressure: 50,
      horizontalCompactness: 60,
      verticalCompactness: 60,
      duelAggression: 50,
      forceDirection: 'neutral',
    },
    transitions: {
      speed: 50,
      playersForward: 50,
      defensiveSecurity: 60,
      lossReaction: 'balanced',
      regainReaction: 'balanced',
      goalkeeperDistribution: 'balanced',
    },
  },
  instructions: [],
  opposition: { opponentId: null, knowledge: null, instructions: [] },
});

const resolvedStrategyFixture = (config = tacticalConfigFixture().strategy) => ({
  presetId: config.presetId,
  customized: config.customized,
  mentality:
    config.presetId === 'protagonist'
      ? 'Positiva'
      : config.presetId === 'compact'
        ? 'Cautelosa'
        : 'Equilibrada',
  risk: 48,
  physicalDemand: 50,
  strengths: ['estrutura equilibrada entre as fases'],
  vulnerabilities: [] as string[],
  explicitParameters: [
    { parameterId: 'width', value: config.inPossession.width, explanation: 'Amplitude-alvo.' },
    {
      parameterId: 'pressure',
      value: config.outOfPossession.pressure,
      explanation: 'Intensidade da pressão.',
    },
  ],
});

export const tacticalStrategyCatalogFixture = (): readonly TacticalStrategyPresetSummary[] =>
  (['balanced', 'protagonist', 'compact'] as const).map((presetId) => {
    const baseConfig = tacticalConfigFixture();
    const config: TacticalModelConfig = {
      ...baseConfig,
      strategy: {
        ...baseConfig.strategy,
        presetId,
        inPossession: {
          ...baseConfig.strategy.inPossession,
          width: presetId === 'protagonist' ? 75 : presetId === 'compact' ? 45 : 55,
        },
      },
    };
    return {
      presetId,
      config: config.strategy,
      resolved: resolvedStrategyFixture(config.strategy),
    };
  });

export const attachTacticalModelFixture = (plan: TacticalPlanSnapshot): TacticalPlanSnapshot => {
  const config = tacticalConfigFixture();
  const structures = (
    [
      'base',
      'inPossession',
      'outOfPossession',
      'offensiveTransition',
      'defensiveTransition',
    ] as const
  ).map((phase) => ({
    phase,
    players: plan.placements.map((placement) => ({
      playerId: placement.playerId,
      normalizedX: placement.normalizedX,
      normalizedY: placement.normalizedY,
      responsibilities: ['estrutura da variação'],
    })),
    width: 68,
    depth: 79,
    compactness: 72,
  }));
  const familiarity: TacticalFamiliaritySnapshot = {
    schemaVersion: 1,
    overall: 84,
    collective: [
      { dimensionId: 'baseStructure', score: 86, explanation: 'Estrutura conhecida.' },
      { dimensionId: 'continuity', score: 82, explanation: 'Continuidade do XI.' },
    ],
    individuals: plan.placements.map(({ playerId }) => ({
      playerId,
      position: 90,
      role: 84,
      zone: 86,
      plan: 84,
      responsibilities: 82,
      contextual: 85,
      explanations: ['responsabilidades conhecidas'],
    })),
    units: [],
    history: [],
  };
  const spatial = {
    defensiveLine: 27,
    midfieldLine: 55,
    attackingLine: 83,
    width: 68,
    depth: 79,
    compactness: 72,
    leftCorridorPlayers: 3,
    centralCorridorPlayers: 5,
    rightCorridorPlayers: 3,
    emptyCorridors: [],
    asymmetry: 0,
    averagePlayerDistance: 35,
    averageSectorDistance: 28,
    playersBetweenLines: [],
    coverPairs: [],
    buildUpShape: 'back4',
  };
  const resolvedStrategy = resolvedStrategyFixture(config.strategy);
  const diagnostic = {
    valid: true,
    readiness: 82,
    strengths: ['ocupação equilibrada dos corredores'],
    vulnerabilities: [] as string[],
    risks: [] as string[],
    alerts: [] as string[],
  };
  const matchSnapshot = {
    schemaVersion: 1 as const,
    tacticalPlanId: plan.variationId,
    variationId: plan.variationId,
    revision: plan.revision,
    starters: plan.placements.map(({ playerId }) => playerId),
    bench: plan.bench,
    normalizedPlacements: plan.placements,
    structures,
    strategy: resolvedStrategy,
    instructions: [],
    opposition: config.opposition,
    familiarity,
    spatial,
    risks: [],
    vulnerabilities: [],
    valid: true,
    createdAt: plan.updatedAt,
  };
  const tacticalModel: TacticalModelSnapshot = {
    schemaVersion: 2,
    config,
    structures,
    spatial,
    resolvedStrategy,
    resolvedInstructions: [],
    instructionConflicts: [],
    opposition: config.opposition,
    familiarity,
    diagnostic,
    recommendations: [],
    matchSnapshot,
  };
  return { ...plan, schemaVersion: 4, tacticalModel };
};
