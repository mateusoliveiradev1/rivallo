import type { Position } from '../matchday/types.js';

export type KnowledgeLevel = 'ownClub' | 'wellKnown' | 'partial' | 'limited' | 'unknown';
export type KnowledgeValueKind = 'exact' | 'range' | 'qualitative' | 'unknown';
export type RatingKind =
  'currentAbility' | 'position' | 'role' | 'tacticalFit' | 'contextual' | 'coachRole';
export type RatingFactorImpact = 'positive' | 'neutral' | 'negative' | 'contextOnly';
export type PlayerAttributeCategory = 'outfield' | 'goalkeeper';

export type PlayerAttributeSet =
  | {
      readonly model: 'outfield';
      readonly finishing: number;
      readonly technique: number;
      readonly passing: number;
      readonly tackling: number;
      readonly physical: number;
      readonly pace: number;
    }
  | {
      readonly model: 'goalkeeper';
      readonly reaction: number;
      readonly positioning: number;
      readonly handling: number;
      readonly mobility: number;
      readonly rushingOut: number;
      readonly distribution: number;
    };

export interface KnowledgeValue {
  readonly kind: KnowledgeValueKind;
  readonly value: number | null;
  readonly minimum: number | null;
  readonly maximum: number | null;
  readonly label: string;
}

export interface ScoutingAssessment {
  readonly entityId: string;
  readonly observerClubId: string;
  readonly knowledgeLevel: KnowledgeLevel;
  readonly confidence: number;
  readonly source: string;
  readonly observedAt: number;
  readonly updatedAt: number;
  readonly expiresAt: number | null;
  readonly knownFields: readonly string[];
  readonly estimatedFields: readonly string[];
  readonly hiddenFields: readonly string[];
  readonly assessmentVersion: number;
}

export interface RatingFactor {
  readonly factorId: string;
  readonly label: string;
  readonly value: number;
  readonly weight: number;
  readonly contribution: number;
  readonly impact: RatingFactorImpact;
  readonly explanation: string;
  readonly source: string;
}

export interface ExplainableRating {
  readonly ratingKind: RatingKind;
  readonly contextId: string;
  readonly contextLabel: string;
  readonly realValue: number | null;
  readonly perceived: KnowledgeValue;
  readonly confidence: number;
  readonly source: string;
  readonly updatedAt: number;
  readonly scaleVersion: string;
  readonly factors: readonly RatingFactor[];
  readonly summary: string;
}

export interface PersonIdentity {
  readonly entityId: string;
  readonly fullName: string;
  readonly knownName: string;
  readonly nationality: string;
  readonly birthDate: string;
  readonly age: number;
  readonly clubId: string;
  readonly clubName: string;
  readonly clubShortName: string;
  readonly clubPrimaryColor: string;
}

export interface ContractSummary {
  readonly clubId: string;
  readonly startedAt: string;
  readonly expiresAt: string;
  readonly squadStatus: string;
}

export interface AttributeProjection {
  readonly attributeId: string;
  readonly label: string;
  readonly description: string;
  readonly category: PlayerAttributeCategory;
  readonly perceived: KnowledgeValue;
  readonly confidence: number;
  readonly source: string;
  readonly updatedAt: number;
}

export interface AttributeGroupProjection {
  readonly category: PlayerAttributeCategory;
  readonly label: string;
  readonly attributes: readonly AttributeProjection[];
}

export interface PositionRatingProjection {
  readonly positionId: Position;
  readonly suitability: string;
  readonly rating: ExplainableRating;
}

export interface RoleRatingProjection {
  readonly roleId: string;
  readonly roleLabel: string;
  readonly positionId: Position;
  readonly responsibilities: readonly string[];
  readonly rating: ExplainableRating;
}

export interface PotentialEstimate {
  readonly perceived: KnowledgeValue;
  readonly confidence: number;
  readonly source: string;
  readonly updatedAt: number;
  readonly dynamic: boolean;
  readonly explanation: string;
}

export interface RatingSnapshot {
  readonly snapshotId: string;
  readonly entityId: string;
  readonly ratingKind: RatingKind;
  readonly value: number;
  readonly positionId: Position | null;
  readonly roleId: string | null;
  readonly variationId: string | null;
  readonly familiarity: number | null;
  readonly confidence: number;
  readonly source: string;
  readonly recordedAt: number;
}

export interface AttributeSnapshot {
  readonly snapshotId: string;
  readonly playerId: string;
  readonly attributes: PlayerAttributeSet;
  readonly source: string;
  readonly recordedAt: number;
}

export interface PlayerDevelopmentProjection {
  readonly playerId: string;
  readonly currentAbility: number;
  readonly potentialEstimate: PotentialEstimate;
  readonly attributeHistory: readonly AttributeSnapshot[];
  readonly ratingHistory: readonly RatingSnapshot[];
  readonly personality: string | null;
  readonly professionalism: number | null;
  readonly ambition: number | null;
  readonly status: string;
}

export interface PlayerTrainingProfile {
  readonly playerId: string;
  readonly preferredPosition: Position;
  readonly preferredRoleId: string;
  readonly futureIndividualPlanId: string | null;
  readonly status: string;
}

export interface PlayerStatisticsProjection {
  readonly appearances: number;
  readonly minutes: number | null;
  readonly goals: number;
  readonly assists: number;
  readonly cards: number | null;
  readonly averageRating: number | null;
  readonly source: string;
}

export interface PlayerProfileProjection {
  readonly schemaVersion: number;
  readonly revision: number;
  readonly identity: PersonIdentity;
  readonly shirtNumber: number;
  readonly heightCm: number;
  readonly weightKg: number | null;
  readonly preferredFoot: string;
  readonly squadRole: string;
  readonly naturalPosition: Position;
  readonly currentAbility: ExplainableRating;
  readonly contextualRating: ExplainableRating;
  readonly tacticalFit: ExplainableRating;
  readonly tacticalFamiliarity: number | null;
  readonly positionRatings: readonly PositionRatingProjection[];
  readonly roleRatings: readonly RoleRatingProjection[];
  readonly attributeGroups: readonly AttributeGroupProjection[];
  readonly condition: number | null;
  readonly matchFitness: number | null;
  readonly form: KnowledgeValue;
  readonly potential: PotentialEstimate;
  readonly knowledge: ScoutingAssessment;
  readonly strengths: readonly string[];
  readonly weaknesses: readonly string[];
  readonly alerts: readonly string[];
  readonly contract: ContractSummary | null;
  readonly statistics: PlayerStatisticsProjection;
  readonly ratingHistory: readonly RatingSnapshot[];
  readonly development: PlayerDevelopmentProjection;
  readonly training: PlayerTrainingProfile;
}

export interface CoachDevelopmentProfile {
  readonly coachId: string;
  readonly technicalDevelopment: number;
  readonly physicalDevelopment: number;
  readonly mentalDevelopment: number;
  readonly tacticalDevelopment: number;
  readonly youthDevelopment: number;
  readonly positionAdaptation: number;
  readonly roleTeaching: number;
  readonly motivation: number;
  readonly peopleManagement: number;
  readonly assessmentAccuracy: number;
  readonly specialties: readonly string[];
}

export interface CoachProfileProjection {
  readonly schemaVersion: number;
  readonly revision: number;
  readonly identity: PersonIdentity;
  readonly role: string;
  readonly reputation: KnowledgeValue;
  readonly qualification: string;
  readonly experienceYears: number;
  readonly style: string;
  readonly preferredFormations: readonly string[];
  readonly contextualRating: ExplainableRating;
  readonly categoryRatings: readonly ExplainableRating[];
  readonly knowledge: ScoutingAssessment;
  readonly strengths: readonly string[];
  readonly weaknesses: readonly string[];
  readonly specialties: readonly string[];
  readonly contract: ContractSummary | null;
  readonly careerHistory: readonly string[];
  readonly ratingHistory: readonly RatingSnapshot[];
  readonly development: CoachDevelopmentProfile;
}

export type EntityType = 'player' | 'coach' | 'club' | 'nation';

export interface EntityProfileReference {
  readonly entityId: string;
  readonly entityType: EntityType;
  readonly name: string;
  readonly secondaryLabel: string;
  readonly route: string;
  readonly nationality: string | null;
  readonly clubId: string | null;
  readonly visualCode: string;
  readonly perceivedRating: KnowledgeValue | null;
  readonly contract: ContractSummary | null;
  readonly confidence: number | null;
  readonly knowledgeLevel: KnowledgeLevel;
}

export interface ClubTacticalIdentityProjection {
  readonly formation: string | null;
  readonly mentality: string | null;
  readonly style: string | null;
  readonly pressure: number | null;
  readonly defensiveLine: number | null;
  readonly transition: string | null;
  readonly confidence: number;
  readonly source: string;
  readonly updatedAt: number;
}

export interface ClubProfileProjection {
  readonly schemaVersion: number;
  readonly revision: number;
  readonly entityId: string;
  readonly name: string;
  readonly shortName: string;
  readonly city: string;
  readonly primaryColor: string;
  readonly countryCode: string | null;
  readonly competitionName: string | null;
  readonly stadiumName: string | null;
  readonly currentPosition: number | null;
  readonly nextFixture: string | null;
  readonly form: readonly string[];
  readonly headCoach: EntityProfileReference | null;
  readonly players: readonly EntityProfileReference[];
  readonly staff: readonly EntityProfileReference[];
  readonly tactics: ClubTacticalIdentityProjection | null;
  readonly knowledge: ScoutingAssessment;
}

export interface NationProfileProjection {
  readonly schemaVersion: number;
  readonly revision: number;
  readonly entityId: string;
  readonly name: string;
  readonly code: string;
  readonly confederation: string | null;
  readonly clubs: readonly EntityProfileReference[];
  readonly players: readonly EntityProfileReference[];
  readonly coaches: readonly EntityProfileReference[];
  readonly competitions: readonly string[];
  readonly knowledge: ScoutingAssessment;
}

export interface GlobalProfileSearchResult {
  readonly entityId: string;
  readonly entityType: EntityType;
  readonly name: string;
  readonly secondaryLabel: string;
  readonly route: string;
  readonly knowledgeLevel: KnowledgeLevel;
  readonly context: string;
  readonly visualCode: string;
  readonly confidence: number | null;
}

export type ProfileRoute =
  | { readonly kind: 'player'; readonly entityId: string }
  | { readonly kind: 'coach'; readonly entityId: string }
  | { readonly kind: 'club'; readonly entityId: string }
  | { readonly kind: 'nation'; readonly entityId: string };
