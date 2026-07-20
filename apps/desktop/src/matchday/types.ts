export type Position = 'GK' | 'RB' | 'CB' | 'LB' | 'DM' | 'CM' | 'AM' | 'RW' | 'LW' | 'ST';
export type Formation =
  | '4-4-2'
  | '4-4-1-1'
  | '4-3-3'
  | '4-2-3-1'
  | '4-1-4-1'
  | '4-3-1-2'
  | '4-2-2-2'
  | '4-3-2-1'
  | '4-1-2-1-2'
  | '4-2-4'
  | '3-5-2'
  | '3-4-3'
  | '3-4-2-1'
  | '3-1-4-2'
  | '3-2-4-1'
  | '3-4-1-2'
  | '5-3-2'
  | '5-2-3'
  | '5-4-1'
  | '5-2-1-2';
export type TacticalApproach = 'balanced' | 'frontFoot' | 'compact';
export type PreferredFoot = 'left' | 'right';
export type SquadRole = 'keyPlayer' | 'firstTeam' | 'rotation' | 'prospect' | 'backup';

export interface Club {
  readonly id: string;
  readonly name: string;
  readonly shortName: string;
  readonly city: string;
  readonly primaryColor: string;
  readonly countryCode?: string | null;
  readonly competitionName?: string | null;
  readonly stadiumName?: string | null;
}

export interface Player {
  readonly id: string;
  readonly name: string;
  readonly shortName: string;
  readonly shirtNumber: number;
  readonly position: Position;
  readonly age: number;
  readonly nationality: string;
  readonly heightCm: number;
  readonly preferredFoot: PreferredFoot;
  readonly squadRole: SquadRole;
  readonly rating: number;
  readonly potentialRating: number;
  readonly matchFitness: number;
  readonly morale: number;
  readonly condition: number;
  readonly appearances: number;
  readonly goals: number;
  readonly assists: number;
  readonly averageRating: number;
  readonly selected: boolean;
}

export interface MatchEvent {
  readonly minute: number;
  readonly kind: string;
  readonly text: string;
  readonly forUserClub: boolean;
}

export interface MatchResult {
  readonly round: number;
  readonly homeClub: string;
  readonly awayClub: string;
  readonly homeGoals: number;
  readonly awayGoals: number;
  readonly possession: number;
  readonly shots: number;
  readonly shotsAgainst: number;
  readonly events: readonly MatchEvent[];
}

export interface SeasonRecord {
  readonly played: number;
  readonly wins: number;
  readonly draws: number;
  readonly losses: number;
  readonly goalsFor: number;
  readonly goalsAgainst: number;
  readonly points: number;
}

export interface MatchdayState {
  readonly club: Club;
  readonly opponent: Club;
  readonly round: number;
  readonly players: readonly Player[];
  readonly formation: Formation;
  readonly approach: TacticalApproach;
  readonly tacticalLibrary?: TacticalVariationLibrarySnapshot;
  readonly lastTacticalEvent?: TacticalPlanEvent | null;
  readonly record: SeasonRecord;
  readonly lastResult: MatchResult | null;
}

export type TacticalSide = 'left' | 'centre' | 'right';
export type TacticalLine = 'goal' | 'defence' | 'midfield' | 'attack';
export type TacticalZone = 'goal' | 'defensiveThird' | 'middleThird' | 'finalThird';

export interface TacticalPlayerPlacement {
  readonly playerId: string;
  readonly normalizedX: number;
  readonly normalizedY: number;
  readonly positionId: Position;
  readonly roleId: string | null;
  readonly side: TacticalSide;
  readonly line: TacticalLine;
  readonly zone: TacticalZone;
  readonly sourcePresetSlotId: string | null;
  readonly revision: number;
}

export interface CustomFormationIdentity {
  readonly id: string;
  readonly name: string;
  readonly isCustom: boolean;
  readonly origin: string;
  readonly createdAtRevision: number;
  readonly updatedAtRevision: number;
}

export type TacticalStrategyPresetId = 'balanced' | 'protagonist' | 'compact';
export type TacticalGamePhase =
  'base' | 'inPossession' | 'outOfPossession' | 'offensiveTransition' | 'defensiveTransition';
export type TacticalInstructionScope = 'collective' | 'sector' | 'position' | 'role' | 'individual';
export type TacticalInstructionCategory =
  | 'buildUp'
  | 'circulation'
  | 'pressure'
  | 'marking'
  | 'movement'
  | 'finishing'
  | 'transition'
  | 'goalkeeperBehavior'
  | 'risk'
  | 'width'
  | 'compactness'
  | 'creativity';

export interface InPossessionStrategy {
  readonly width: number;
  readonly tempo: number;
  readonly passingRisk: number;
  readonly playersForward: number;
  readonly creativeFreedom: number;
  readonly buildUp: 'direct' | 'supported' | 'patient';
  readonly progression: 'outside' | 'balanced' | 'inside';
}

export interface OutOfPossessionStrategy {
  readonly blockHeight: number;
  readonly defensiveLine: number;
  readonly depth: number;
  readonly pressure: number;
  readonly horizontalCompactness: number;
  readonly verticalCompactness: number;
  readonly duelAggression: number;
  readonly forceDirection: 'inside' | 'neutral' | 'outside';
}

export interface TransitionStrategy {
  readonly speed: number;
  readonly playersForward: number;
  readonly defensiveSecurity: number;
  readonly lossReaction: 'counterPress' | 'balanced' | 'regroup';
  readonly regainReaction: 'counterAttack' | 'balanced' | 'retainPossession';
  readonly goalkeeperDistribution: 'quick' | 'balanced' | 'safe';
}

export interface TacticalStrategyConfig {
  readonly presetId: TacticalStrategyPresetId;
  readonly customized: boolean;
  readonly inPossession: InPossessionStrategy;
  readonly outOfPossession: OutOfPossessionStrategy;
  readonly transitions: TransitionStrategy;
}

export interface TacticalInstruction {
  readonly instructionId: string;
  readonly category: TacticalInstructionCategory;
  readonly scope: TacticalInstructionScope;
  readonly target: string;
  readonly value: string;
  readonly intensity: number;
  readonly description: string;
  readonly expectedEffects: readonly string[];
  readonly requirements: readonly string[];
  readonly incompatibilities: readonly string[];
  readonly precedence: number;
  readonly familiarityImpact: number;
  readonly revision: number;
  readonly enabled: boolean;
}

export interface OpponentKnowledge {
  readonly confidence: number;
  readonly source: string;
  readonly observedAt: number;
  readonly expiresAt: number | null;
  readonly knownFacts: readonly string[];
  readonly unknownFacts: readonly string[];
  readonly threats: readonly string[];
  readonly vulnerabilities: readonly string[];
}

export interface OppositionInstruction {
  readonly instructionId: string;
  readonly scope: TacticalInstructionScope;
  readonly targetId: string;
  readonly pressure: number;
  readonly tightMarking: boolean;
  readonly preferredFoot: string | null;
  readonly blockedLane: string | null;
  readonly protectedZone: string | null;
  readonly expiresAt: number | null;
}

export interface TacticalOppositionPlan {
  readonly opponentId: string | null;
  readonly knowledge: OpponentKnowledge | null;
  readonly instructions: readonly OppositionInstruction[];
}

export interface TacticalModelConfig {
  readonly schemaVersion: 2;
  readonly strategy: TacticalStrategyConfig;
  readonly instructions: readonly TacticalInstruction[];
  readonly opposition: TacticalOppositionPlan;
}

export interface TacticalPhasePlayer {
  readonly playerId: string;
  readonly normalizedX: number;
  readonly normalizedY: number;
  readonly responsibilities: readonly string[];
}

export interface TacticalPhaseStructure {
  readonly phase: TacticalGamePhase;
  readonly players: readonly TacticalPhasePlayer[];
  readonly width: number;
  readonly depth: number;
  readonly compactness: number;
}

export interface TacticalSpatialAnalysis {
  readonly defensiveLine: number;
  readonly midfieldLine: number;
  readonly attackingLine: number;
  readonly width: number;
  readonly depth: number;
  readonly compactness: number;
  readonly leftCorridorPlayers: number;
  readonly centralCorridorPlayers: number;
  readonly rightCorridorPlayers: number;
  readonly emptyCorridors: readonly string[];
  readonly asymmetry: number;
  readonly averagePlayerDistance: number;
  readonly averageSectorDistance: number;
  readonly playersBetweenLines: readonly string[];
  readonly coverPairs: readonly string[];
  readonly buildUpShape: string;
}

export interface TacticalParameter {
  readonly parameterId: string;
  readonly value: number;
  readonly explanation: string;
}

export interface ResolvedTacticalStrategy {
  readonly presetId: TacticalStrategyPresetId;
  readonly customized: boolean;
  readonly mentality: string;
  readonly risk: number;
  readonly physicalDemand: number;
  readonly strengths: readonly string[];
  readonly vulnerabilities: readonly string[];
  readonly explicitParameters: readonly TacticalParameter[];
}

export interface ResolvedTacticalInstruction {
  readonly instructionId: string;
  readonly scope: TacticalInstructionScope;
  readonly target: string;
  readonly behavior: string;
  readonly expectedEffects: readonly string[];
  readonly precedence: number;
}

export interface TacticalInstructionConflict {
  readonly conflictId: string;
  readonly instructionIds: readonly string[];
  readonly winnerId: string;
  readonly reason: string;
  readonly resolvedBehavior: string;
}

export interface FamiliarityDimension {
  readonly dimensionId: string;
  readonly score: number;
  readonly explanation: string;
}

export interface PlayerTacticalFamiliarity {
  readonly playerId: string;
  readonly position: number;
  readonly role: number;
  readonly zone: number;
  readonly plan: number;
  readonly responsibilities: number;
  readonly contextual: number;
  readonly explanations: readonly string[];
}

export interface UnitTacticalFamiliarity {
  readonly unitId: string;
  readonly score: number;
  readonly playerIds: readonly string[];
  readonly explanation: string;
}

export interface FamiliarityChange {
  readonly eventId: string;
  readonly previous: number;
  readonly current: number;
  readonly dimensionId: string;
  readonly origin: string;
  readonly occurredAt: number;
  readonly variationId: string;
  readonly playerId: string | null;
  readonly unitId: string | null;
  readonly explanation: string;
}

export interface TacticalFamiliaritySnapshot {
  readonly schemaVersion: 1;
  readonly overall: number;
  readonly collective: readonly FamiliarityDimension[];
  readonly individuals: readonly PlayerTacticalFamiliarity[];
  readonly units: readonly UnitTacticalFamiliarity[];
  readonly history: readonly FamiliarityChange[];
}

export interface TacticalDiagnostic {
  readonly valid: boolean;
  readonly readiness: number;
  readonly strengths: readonly string[];
  readonly vulnerabilities: readonly string[];
  readonly risks: readonly string[];
  readonly alerts: readonly string[];
}

export interface TacticalConfigChange {
  readonly path: string;
  readonly from: number;
  readonly to: number;
}

export interface TacticalRecommendation {
  readonly recommendationId: string;
  readonly reason: string;
  readonly proposedChanges: readonly TacticalConfigChange[];
  readonly benefit: string;
  readonly risk: string;
  readonly affectedPlayers: readonly string[];
  readonly confidence: number;
  readonly origin: string;
  readonly variationId: string;
  readonly planRevision: number;
  readonly staffId: string | null;
  readonly staffRole: string | null;
  readonly staffName: string | null;
  readonly staffSpecialty: string | null;
  readonly staffQuality: number | null;
  readonly planKnowledge: number | null;
  readonly opponentKnowledge: number | null;
}

export interface TacticalMatchSnapshot {
  readonly schemaVersion: 1;
  readonly tacticalPlanId: string;
  readonly variationId: string;
  readonly revision: number;
  readonly starters: readonly string[];
  readonly bench: readonly string[];
  readonly normalizedPlacements: readonly TacticalPlayerPlacement[];
  readonly structures: readonly TacticalPhaseStructure[];
  readonly strategy: ResolvedTacticalStrategy;
  readonly instructions: readonly ResolvedTacticalInstruction[];
  readonly opposition: TacticalOppositionPlan;
  readonly familiarity: TacticalFamiliaritySnapshot;
  readonly spatial: TacticalSpatialAnalysis;
  readonly risks: readonly string[];
  readonly vulnerabilities: readonly string[];
  readonly valid: boolean;
  readonly createdAt: number;
}

export interface TacticalModelSnapshot {
  readonly schemaVersion: 2;
  readonly config: TacticalModelConfig;
  readonly structures: readonly TacticalPhaseStructure[];
  readonly spatial: TacticalSpatialAnalysis;
  readonly resolvedStrategy: ResolvedTacticalStrategy;
  readonly resolvedInstructions: readonly ResolvedTacticalInstruction[];
  readonly instructionConflicts: readonly TacticalInstructionConflict[];
  readonly opposition: TacticalOppositionPlan;
  readonly familiarity: TacticalFamiliaritySnapshot;
  readonly diagnostic: TacticalDiagnostic;
  readonly recommendations: readonly TacticalRecommendation[];
  readonly matchSnapshot: TacticalMatchSnapshot;
}

export interface TacticalComparisonChange {
  readonly changeId: string;
  readonly label: string;
  readonly before: string;
  readonly after: string;
  readonly cause: string;
  readonly expectedConsequences: readonly string[];
}

export interface TacticalComparison {
  readonly fromRevision: number;
  readonly toRevision: number;
  readonly changes: readonly TacticalComparisonChange[];
  readonly familiarityBefore: number;
  readonly familiarityAfter: number;
  readonly affectedPlayers: readonly string[];
  readonly risksCreated: readonly string[];
  readonly risksReduced: readonly string[];
}

export interface TacticalPlanPreview {
  readonly model: TacticalModelSnapshot;
  readonly comparison: TacticalComparison | null;
}

export interface TacticalStrategyPresetSummary {
  readonly presetId: TacticalStrategyPresetId;
  readonly config: TacticalStrategyConfig;
  readonly resolved: ResolvedTacticalStrategy;
}

export interface TacticalPlanSnapshot {
  readonly schemaVersion: 4;
  readonly variationId: string;
  readonly name: string;
  readonly sourcePresetId: Formation | null;
  readonly formation: Formation;
  readonly placements: readonly TacticalPlayerPlacement[];
  readonly bench: readonly string[];
  readonly customFormation: CustomFormationIdentity;
  readonly tacticalModel?: TacticalModelSnapshot;
  readonly revision: number;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface TacticalVariationLibrarySnapshot {
  readonly schemaVersion: 1;
  readonly revision: number;
  readonly activeVariationId: string;
  readonly primaryVariationId: string;
  readonly variations: readonly TacticalPlanSnapshot[];
}

export interface TacticalPlanProposal extends Omit<
  TacticalPlanSnapshot,
  'schemaVersion' | 'revision' | 'createdAt' | 'updatedAt' | 'tacticalModel'
> {
  readonly expectedRevision: number;
  readonly tacticalConfig?: TacticalModelConfig;
  readonly approach: TacticalApproach;
}

export type TacticalPlanEvent =
  | {
      readonly kind: 'variationSaved';
      readonly variationId: string;
      readonly acceptedRevision: number;
    }
  | {
      readonly kind: 'conflictDetected';
      readonly variationId: string;
      readonly expectedRevision: number;
      readonly actualRevision: number;
    }
  | {
      readonly kind: 'variationActivated';
      readonly variationId: string;
      readonly acceptedLibraryRevision: number;
    }
  | {
      readonly kind: 'primaryVariationChanged';
      readonly variationId: string;
      readonly acceptedLibraryRevision: number;
    }
  | {
      readonly kind: 'variationDeleted';
      readonly variationId: string;
      readonly activeVariationId: string;
      readonly acceptedLibraryRevision: number;
    };

export type TacticalLibraryCommand =
  | {
      readonly kind: 'activate';
      readonly expectedLibraryRevision: number;
      readonly variationId: string;
    }
  | {
      readonly kind: 'setPrimary';
      readonly expectedLibraryRevision: number;
      readonly variationId: string;
    }
  | {
      readonly kind: 'delete';
      readonly expectedLibraryRevision: number;
      readonly variationId: string;
    };

export interface TacticalPlanUpdate {
  readonly state: MatchdayState;
  readonly event: TacticalPlanEvent;
}
