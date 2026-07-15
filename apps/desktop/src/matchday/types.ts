export type Position = 'GK' | 'RB' | 'CB' | 'LB' | 'DM' | 'CM' | 'AM' | 'RW' | 'LW' | 'ST';
export type Formation = '4-3-3' | '4-2-3-1' | '4-4-2';
export type TacticalApproach = 'balanced' | 'frontFoot' | 'compact';

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
  readonly position: Position;
  readonly age: number;
  readonly rating: number;
  readonly condition: number;
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
