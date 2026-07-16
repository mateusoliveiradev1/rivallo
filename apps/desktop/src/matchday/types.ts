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
  readonly tacticalPlan?: TacticalPlanSnapshot;
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

export interface TacticalPlanSnapshot {
  readonly schemaVersion: 2;
  readonly planId: string;
  readonly name: string;
  readonly sourcePresetId: Formation | null;
  readonly formation: Formation;
  readonly placements: readonly TacticalPlayerPlacement[];
  readonly bench: readonly string[];
  readonly customFormation: CustomFormationIdentity;
  readonly revision: number;
}

export interface TacticalPlanProposal extends Omit<
  TacticalPlanSnapshot,
  'schemaVersion' | 'revision'
> {
  readonly expectedRevision: number;
  readonly approach: TacticalApproach;
}

export type TacticalPlanEvent =
  | { readonly kind: 'planSaved'; readonly planId: string; readonly acceptedRevision: number }
  | {
      readonly kind: 'conflictDetected';
      readonly planId: string;
      readonly expectedRevision: number;
      readonly actualRevision: number;
    };

export interface TacticalPlanUpdate {
  readonly state: MatchdayState;
  readonly event: TacticalPlanEvent;
}
