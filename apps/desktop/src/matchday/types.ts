export type Position = 'GK' | 'RB' | 'CB' | 'LB' | 'DM' | 'CM' | 'AM' | 'RW' | 'LW' | 'ST';
export type Formation = '4-3-3' | '4-2-3-1' | '4-4-2';
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
  readonly record: SeasonRecord;
  readonly lastResult: MatchResult | null;
}
