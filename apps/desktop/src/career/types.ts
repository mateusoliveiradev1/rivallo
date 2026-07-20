import type { DataPackageCatalogEntry, PackageManifestSummary } from '../data-editor/types.js';
import type { Club, MatchdayState } from '../matchday/types.js';

export type AssistanceProfile = 'guided' | 'balanced' | 'fullControl';
export type CareerIntegrity = 'valid' | 'recovered' | 'corrupt' | 'incompatible';
export type CareerSaveState = 'saved' | 'pending' | 'saving' | 'failed' | 'readOnly';

export interface CareerRouteContext {
  readonly route: string;
  readonly activeScreen: string | null;
  readonly activeTab: string | null;
  readonly variationId: string | null;
  readonly scrollTop: number;
}

export interface CareerSlotSummary {
  readonly careerId: string;
  readonly displayName: string;
  readonly managerId: string;
  readonly managerName: string;
  readonly clubId: string;
  readonly clubName: string;
  readonly clubShortName: string;
  readonly clubPrimaryColor: string;
  readonly currentDate: string;
  readonly seasonRef: string;
  readonly baseName: string;
  readonly basePackageId: string;
  readonly basePackageVersion: string;
  readonly modCount: number;
  readonly worldFingerprint: string;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly lastPlayedAt: number;
  readonly lastContext: CareerRouteContext;
  readonly saveRevision: number;
  readonly integrity: CareerIntegrity;
  readonly saveState: CareerSaveState;
  readonly sportingState: string;
  readonly backupCount: number;
}

export interface CareerPortrait {
  readonly mimeType: string;
  readonly bytes: readonly number[];
}

export interface CareerWorldSnapshot {
  readonly basePackageId: string;
  readonly basePackageVersion: string;
  readonly schemaVersion: number;
  readonly activeMods: readonly string[];
  readonly modVersions: readonly string[];
  readonly loadOrder: readonly string[];
  readonly packageHashes: readonly string[];
  readonly worldFingerprint: string;
  readonly fingerprintAlgorithm: string;
  readonly gameVersion: string;
  readonly createdAt: number;
}

export interface CareerSlot {
  readonly schemaVersion: number;
  readonly careerId: string;
  readonly operationId: string;
  readonly displayName: string;
  readonly managerId: string;
  readonly managerName: string;
  readonly clubId: string;
  readonly clubName: string;
  readonly clubShortName: string;
  readonly clubPrimaryColor: string;
  readonly baseSnapshot: CareerWorldSnapshot;
  readonly currentDate: string;
  readonly seasonRef: string;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly lastPlayedAt: number;
  readonly lastContext: CareerRouteContext;
  readonly saveRevision: number;
  readonly assistance: AssistanceProfile;
  readonly integrity: CareerIntegrity;
  readonly saveState: CareerSaveState;
  readonly sportingState: string;
  readonly matchday: MatchdayState;
  readonly portraitAsset: string | null;
}

export interface CareerFailure {
  readonly code: string;
  readonly message: string;
  readonly details: readonly string[];
}

export interface WorldNation {
  readonly id: string;
  readonly name: string;
  readonly iso2: string;
}

export interface WorldCoach {
  readonly identity: {
    readonly entityId: string;
    readonly fullName: string;
    readonly knownName: string;
    readonly nationality: string;
    readonly birthDate: string;
    readonly age: number;
    readonly clubId: string;
  };
  readonly role: string;
  readonly reputation: number;
  readonly qualification: string;
  readonly experienceYears: number;
  readonly style: string;
  readonly preferredFormations: readonly string[];
  readonly specialties: readonly string[];
  readonly attributes: CoachAttributes;
}

export interface WorldPlayerProfile {
  readonly identity: { readonly entityId: string; readonly clubId: string };
  readonly naturalPosition: string;
}

export interface WorldCompetition {
  readonly id: string;
  readonly name: string;
  readonly shortName: string;
  readonly nationId: string;
  readonly regionId?: string | null;
  readonly category?: string | null;
  readonly level?: number | null;
  readonly description?: string | null;
  readonly primaryColor?: string | null;
  readonly secondaryColor?: string | null;
  readonly baseSeasonId?: string | null;
  readonly seasons: readonly {
    readonly id: string;
    readonly label: string;
    readonly startDate: string;
    readonly endDate: string;
    readonly participantClubIds: readonly string[];
    readonly rules?: CompetitionRules;
    readonly stages?: readonly CompetitionStage[];
    readonly registrationWindows?: readonly {
      readonly startDate: string;
      readonly endDate: string;
    }[];
    readonly calendarConstraints?: {
      readonly preferredWeekdays: readonly number[];
      readonly kickoffTimes: readonly string[];
      readonly minimumRestDays: number;
      readonly blockedDates: readonly string[];
      readonly neutralVenue: boolean;
    };
    readonly playerRegistrations?: readonly {
      readonly playerId: string;
      readonly clubId: string;
      readonly shirtNumber?: number | null;
      readonly contractReference?: string | null;
      readonly eligible: boolean;
    }[];
  }[];
}

export interface CompetitionRules {
  readonly pointsForWin: number;
  readonly pointsForDraw: number;
  readonly pointsForLoss: number;
  readonly participantCount: number;
  readonly rounds: number;
  readonly legs: number;
  readonly tieBreakers: readonly string[];
  readonly minimumRosterSize?: number;
  readonly minimumGoalkeepers?: number;
  readonly starters?: number;
  readonly benchSize?: number;
  readonly substitutions?: number;
  readonly extraTime?: boolean;
  readonly penalties?: boolean;
  readonly foreignPlayerLimit?: number | null;
  readonly minimumHomegrownPlayers?: number | null;
  readonly promotionSlots?: number;
  readonly relegationSlots?: number;
}

export interface CompetitionStage {
  readonly id: string;
  readonly name: string;
  readonly order: number;
  readonly kind:
    | 'roundRobin'
    | 'doubleRoundRobin'
    | 'groups'
    | 'knockout'
    | 'twoLeggedKnockout'
    | 'singleFinal'
    | 'qualifying';
  readonly participantCount: number;
  readonly groupCount?: number;
  readonly legs?: number;
  readonly advanceCount?: number;
  readonly eliminateCount?: number;
  readonly tieBreakers?: readonly string[];
  readonly extraTime?: boolean;
  readonly penalties?: boolean;
  readonly neutralVenue?: boolean;
}

export interface ResolvedWorldDatabase {
  readonly schemaVersion: number;
  readonly packages: readonly PackageManifestSummary[];
  readonly fingerprint: {
    readonly algorithm: string;
    readonly value: string;
    readonly schemaVersion: number;
    readonly packageOrder: readonly string[];
  };
  readonly coverage: {
    readonly clubs: number;
    readonly players: number;
    readonly coaches: number;
    readonly nations: number;
    readonly competitions: number;
    readonly assets: number;
  };
  readonly validation: { readonly valid: boolean; readonly diagnostics: readonly unknown[] };
  readonly world: {
    readonly clubs: readonly Club[];
    readonly matchday: MatchdayState;
    readonly nations: readonly WorldNation[];
    readonly competitions: readonly WorldCompetition[];
    readonly profiles: {
      readonly players: readonly WorldPlayerProfile[];
      readonly coaches: readonly WorldCoach[];
    };
  };
}

export interface ClubReadinessProjection {
  readonly clubId: string;
  readonly seasonId: string;
  readonly status: 'available' | 'availableWithWarnings' | 'blocked';
  readonly requirements: readonly {
    readonly code: string;
    readonly label: string;
    readonly satisfied: boolean;
    readonly blocking: boolean;
    readonly current: number | null;
    readonly required: number | null;
    readonly editorModule: string;
    readonly suggestion: string;
  }[];
}

export interface CoachAttributes {
  tactical: number;
  preparation: number;
  adaptability: number;
  decisionMaking: number;
  technicalDevelopment: number;
  physicalDevelopment: number;
  mentalDevelopment: number;
  tacticalDevelopment: number;
  youthDevelopment: number;
  motivation: number;
  communication: number;
  discipline: number;
  peopleManagement: number;
  abilityJudgement: number;
  potentialJudgement: number;
}

export type CoachBackground =
  | 'professionalPlayer'
  | 'amateurPlayer'
  | 'tacticalAnalyst'
  | 'youthDeveloper'
  | 'peopleManager'
  | 'beginner'
  | 'balanced';

export type CoachArchetype =
  | 'balanced'
  | 'strategist'
  | 'peopleManager'
  | 'youthDeveloper'
  | 'analyst'
  | 'formerPlayer'
  | 'matchPreparer';

export interface CoachAttributeBudgetLine {
  readonly attributeId: keyof CoachAttributes;
  readonly value: number;
  readonly cost: number;
  readonly nextCost: number | null;
  readonly cap: number;
}

export interface CoachCreationEvaluation {
  readonly schemaVersion: number;
  readonly costModelVersion: string;
  readonly budget: number;
  readonly usedPoints: number;
  readonly remainingPoints: number;
  readonly attributeCap: number;
  readonly capReason: string;
  readonly highAttributeLimit: number;
  readonly highAttributeCount: number;
  readonly specialtyLimit: number;
  readonly contextualRating: number;
  readonly reputationCap: number;
  readonly experienceCap: number;
  readonly balanceLabel:
    'Perfil equilibrado' | 'Especialista' | 'Muito concentrado' | 'Configuração inválida';
  readonly strengths: readonly string[];
  readonly limitations: readonly string[];
  readonly attributeLines: readonly CoachAttributeBudgetLine[];
  readonly valid: boolean;
  readonly errors: readonly string[];
}

export interface PortraitUpload {
  readonly fileName: string;
  readonly mimeType: string;
  readonly bytes: readonly number[];
  readonly derivatives: Readonly<Record<string, readonly number[]>>;
}

export interface CoachCreatorDraft {
  firstName: string;
  lastName: string;
  knownName: string;
  nationality: string;
  secondaryNationality: string | null;
  birthplace: string | null;
  birthDate: string;
  age: number;
  languages: string[];
  background: CoachBackground;
  archetype: CoachArchetype;
  qualification: string;
  experienceYears: number;
  reputation: number;
  style: string;
  preferredFormations: string[];
  specialties: string[];
  attributes: CoachAttributes;
  appearance: PortraitRecipe;
  portrait: PortraitUpload | null;
}

export interface PortraitFeatureLocks {
  face: boolean;
  hair: boolean;
  clothing: boolean;
  accessories: boolean;
  background: boolean;
}

export interface PortraitRecipe {
  seed: number;
  rendererVersion: number;
  presentation: string;
  ageBand: string;
  skinTone: number;
  faceShape: string;
  faceWidth: number;
  jaw: string;
  chin: string;
  eyeShape: string;
  eyeColor: string;
  eyebrowStyle: string;
  noseStyle: string;
  mouthStyle: string;
  earStyle: string;
  hairStyle: string;
  hairColor: string;
  facialHair: string;
  moustache: string;
  bodyHairColor: string;
  wrinkles: number;
  marks: string;
  glasses: boolean;
  accessories: string[];
  clothing: string;
  clothingColor: string;
  background: string;
  lighting: string;
  preset: string;
  locks: PortraitFeatureLocks;
}

export type CareerCoachChoice =
  | { readonly mode: 'existing'; readonly coachId: string }
  | { readonly mode: 'created'; readonly draft: CoachCreatorDraft };

export interface CreateCareerRequest {
  readonly displayName: string;
  readonly selectedPackageIds: readonly string[];
  readonly clubId: string;
  readonly seasonRef: string;
  readonly currentDate: string;
  readonly assistance: AssistanceProfile;
  readonly coach: CareerCoachChoice;
  readonly operationId: string;
}

export interface SaveCareerRequest {
  readonly careerId: string;
  readonly expectedRevision: number;
  readonly context: CareerRouteContext;
  readonly operationId: string;
  readonly createBackup: boolean;
}

export interface CareerBootData {
  readonly catalog: readonly DataPackageCatalogEntry[];
  readonly slots: readonly CareerSlotSummary[];
  readonly lastCareer: CareerSlotSummary | null;
}
