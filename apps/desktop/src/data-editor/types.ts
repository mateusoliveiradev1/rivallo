export type ValidationSeverity = 'error' | 'warning';
export type DataPackageType = 'base' | 'mod';
export type PackageVisibility = 'public' | 'privateDevelopment';

export interface PackageValidationDiagnostic {
  readonly code: string;
  readonly severity: ValidationSeverity;
  readonly file: string;
  readonly entityId: string | null;
  readonly field: string | null;
  readonly reference: string | null;
  readonly invalidValue: string | null;
  readonly rule: string;
  readonly suggestion: string | null;
  readonly blocking: boolean;
}

export interface PackageValidationReport {
  readonly valid: boolean;
  readonly diagnostics: readonly PackageValidationDiagnostic[];
}

export interface PackageManifestSummary {
  readonly packageId: string;
  readonly name: string;
  readonly version: string;
  readonly schemaVersion: number;
  readonly gameVersionCompatibility: string;
  readonly author: string;
  readonly description: string;
  readonly contentType: DataPackageType;
  readonly loadOrderHint: number;
  readonly visibility: PackageVisibility;
  readonly checksum: string;
  readonly dependencies?: readonly {
    readonly packageId: string;
    readonly versionRequirement: string;
    readonly optional: boolean;
  }[];
  readonly conflicts?: readonly { readonly packageId: string; readonly reason: string }[];
  readonly provenance?: {
    readonly source: string;
    readonly rights: string;
    readonly createdAt: string;
    readonly notes?: string | null;
  };
}

export interface DataPackageCatalogEntry {
  readonly manifest: PackageManifestSummary;
  readonly active: boolean;
  readonly validation: PackageValidationReport;
  readonly catalogScope: 'public' | 'privateDevelopment' | 'uat';
  readonly selectable: boolean;
}

export interface PrivateSandboxSummary {
  readonly packages: number;
  readonly people: number;
  readonly clubs: number;
  readonly competitions: number;
}

export type CreatorProjectMode = 'quickMod' | 'dataStudio';
export type CreatorProjectStatus =
  'draft' | 'modified' | 'valid' | 'validWithWarnings' | 'blocked' | 'exported';

export interface CreatorProjectSummary {
  readonly projectId: string;
  readonly name: string;
  readonly mode: CreatorProjectMode;
  readonly status: CreatorProjectStatus;
  readonly basePackageId: string;
  readonly packageId: string;
  readonly version: string;
  readonly updatedAt: number;
  readonly lastExportedAt: number | null;
  readonly entityCount: number;
}

export interface CreatorProjectDraft {
  readonly projectId: string;
  readonly name: string;
  readonly mode: CreatorProjectMode;
  readonly basePackageId: string;
  readonly source: DataPackageAuthoringSource;
}

export interface CreatorProjectRecord extends CreatorProjectSummary {
  readonly schemaVersion: number;
  readonly createdAt: number;
  readonly revision: number;
  readonly source: DataPackageAuthoringSource;
}

export interface PackageDistributionReceipt {
  readonly packageId: string;
  readonly name: string;
  readonly version: string;
  readonly path: string;
  readonly size: number;
  readonly sha256: string;
  readonly status: string;
}

export interface RivmodInspection {
  readonly receipt: PackageDistributionReceipt;
  readonly validation: PackageValidationReport;
  readonly dependencies: readonly string[];
  readonly conflicts: readonly string[];
  readonly updateFromVersion: string | null;
  readonly downgrade: boolean;
}

export interface PackageHistoryEntry {
  readonly packageId: string;
  readonly version: string;
  readonly name: string;
  readonly archivedAt: number;
}

export interface DataPackageAuthoringSource {
  readonly manifestJson: string;
  readonly worldJson: string | null;
  readonly patchesJson: string | null;
  readonly assets: readonly AuthoringAssetUpload[];
}

export interface AuthoringAssetUpload {
  readonly id: string;
  readonly entityId: string;
  readonly kind:
    | 'clubCrest'
    | 'playerPortrait'
    | 'coachPortrait'
    | 'staffPortrait'
    | 'competitionLogo'
    | 'nationFlag'
    | 'stadiumImage';
  readonly path: string;
  readonly mediaType: 'image/png' | 'image/jpeg' | 'image/webp';
  readonly bytes: readonly number[];
  readonly provenance: string;
  readonly rights: string;
}

export interface WorldDatabaseSummary {
  readonly packageId: string;
  readonly version: string;
  readonly schemaVersion: number;
  readonly fingerprintAlgorithm: string;
  readonly worldFingerprint: string;
}

export interface ModAuthoringWorld {
  readonly clubs: readonly Club[];
  readonly people?: readonly FactualPerson[];
  readonly players: readonly Player[];
  readonly playerProfiles: readonly AuthoringPlayerProfile[];
  readonly coaches: readonly AuthoringCoachProfile[];
  readonly nations: readonly {
    readonly id: string;
    readonly name: string;
    readonly iso2: string;
    readonly iso3?: string;
    readonly aliases?: readonly string[];
    readonly confederationId?: string | null;
    readonly flagAssetId?: string | null;
  }[];
  readonly regions?: readonly {
    readonly id: string;
    readonly nationId: string;
    readonly name: string;
  }[];
  readonly cities?: readonly {
    readonly id: string;
    readonly nationId: string;
    readonly regionId?: string | null;
    readonly name: string;
  }[];
  readonly stadiums?: readonly {
    readonly id: string;
    readonly name: string;
    readonly cityId: string;
    readonly ownerClubId?: string | null;
    readonly capacity: number;
    readonly assetId?: string | null;
  }[];
  readonly competitions?: readonly StudioCompetition[];
  readonly activeClubId: string;
}

export interface StudioCompetitionStage {
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
  readonly groupCount: number;
  readonly legs: number;
  readonly advanceCount: number;
  readonly eliminateCount: number;
  readonly pointsForWin?: number | null;
  readonly pointsForDraw?: number | null;
  readonly pointsForLoss?: number | null;
  readonly tieBreakers: readonly string[];
  readonly extraTime: boolean;
  readonly penalties: boolean;
  readonly neutralVenue: boolean;
}

export interface StudioPlayerRegistration {
  readonly registrationId?: string | null;
  readonly playerId: string;
  readonly clubId: string;
  readonly shirtNumber: number | null;
  readonly contractReference: string | null;
  readonly eligible: boolean;
}

export type PersonRoleKind = 'player' | 'coach' | 'staffMember';
export type PreferredFoot = 'left' | 'right' | 'both';
export type ProvenanceVerificationStatus = 'pending' | 'verified' | 'disputed';

export interface FactualPersonRole {
  readonly roleId: string;
  readonly kind: PersonRoleKind;
  readonly clubId: string | null;
  readonly title: string | null;
}

export interface FactualProvenance {
  readonly source: string;
  readonly sourceRecordId: string | null;
  readonly observedAt: string | null;
  readonly verificationStatus: ProvenanceVerificationStatus;
  readonly fields: readonly string[];
}

export interface FactualPersonReadiness {
  readonly identity: 'partialFactualIdentity' | 'verifiedFactualIdentity';
  readonly structural: 'structurallyValid' | 'structurallyBlocked';
  readonly runtimeProfile: 'runtimeProfileBlocked' | 'runtimeProfileAvailable';
  readonly evaluation: 'awaitingEvaluation' | 'evaluated' | 'notApplicable';
  readonly gameplay: 'gameplayBlocked' | 'gameplayReady';
  readonly blockers: readonly string[];
}

export interface FactualPerson {
  readonly personId: string;
  readonly externalIds: readonly { readonly source: string; readonly externalId: string }[];
  readonly fullName: string;
  readonly knownName: string | null;
  readonly birthDate: string | null;
  readonly heightCm: number | null;
  readonly weightKg: number | null;
  readonly preferredFoot: PreferredFoot | null;
  readonly nationalityId: string | null;
  readonly secondNationalityId: string | null;
  readonly detailedPosition: Player['position'] | null;
  readonly shirtNumber: number | null;
  readonly contract: {
    readonly clubId: string;
    readonly startedAt: string | null;
    readonly expiresAt: string | null;
    readonly squadStatus: string | null;
  } | null;
  readonly roles: readonly FactualPersonRole[];
  readonly provenance: readonly FactualProvenance[];
  readonly readiness: FactualPersonReadiness;
}

export interface StudioCompetition {
  readonly id: string;
  readonly name: string;
  readonly shortName: string;
  readonly nationId: string;
  readonly category?: string | null;
  readonly level?: number | null;
  readonly description?: string | null;
  readonly primaryColor?: string | null;
  readonly secondaryColor?: string | null;
  readonly logoAssetId?: string | null;
  readonly baseSeasonId?: string | null;
  readonly seasons: readonly {
    readonly id: string;
    readonly competitionId: string;
    readonly label: string;
    readonly startDate: string;
    readonly endDate: string;
    readonly participantClubIds: readonly string[];
    readonly stages: readonly StudioCompetitionStage[];
    readonly rules: Readonly<Record<string, unknown>>;
    readonly registrationWindows: readonly {
      readonly startDate: string;
      readonly endDate: string;
    }[];
    readonly calendarConstraints: Readonly<Record<string, unknown>>;
    readonly playerRegistrations: readonly StudioPlayerRegistration[];
  }[];
}
import type { Club, Player } from '../matchday/types.js';
import type { PlayerAttributeSet } from '../profiles/types.js';

export interface AuthoringIdentity {
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

export interface AuthoringPlayerProfile {
  readonly identity: AuthoringIdentity;
  readonly shirtNumber: number;
  readonly heightCm: number;
  readonly weightKg: number | null;
  readonly preferredFoot: string;
  readonly squadRole: string;
  readonly naturalPosition: Player['position'];
  readonly attributes: PlayerAttributeSet;
  readonly internalPotential: number;
  readonly contract: {
    readonly clubId: string;
    readonly startedAt: string;
    readonly expiresAt: string;
    readonly squadStatus: string;
  } | null;
}

export interface AuthoringCoachProfile {
  readonly identity: AuthoringIdentity;
  readonly role: string;
  readonly reputation: number;
  readonly qualification: string;
  readonly experienceYears: number;
  readonly style: string;
  readonly preferredFormations: readonly string[];
  readonly attributes: Readonly<Record<string, number>>;
  readonly specialties: readonly string[];
  readonly contract: AuthoringPlayerProfile['contract'];
}

export interface GeneratedPackagePatch {
  readonly operation: 'add' | 'replace' | 'remove';
  readonly entityKind:
    | 'club'
    | 'person'
    | 'matchdayPlayer'
    | 'playerProfile'
    | 'externalPlayer'
    | 'coach'
    | 'nation'
    | 'region'
    | 'city'
    | 'stadium'
    | 'competition'
    | 'asset';
  readonly targetId: string;
  readonly entity?: { readonly kind: string; readonly value: unknown };
  readonly reason: string;
}

export interface CommunityChange {
  readonly id: string;
  readonly kind:
    | 'club'
    | 'player'
    | 'coach'
    | 'staff'
    | 'nation'
    | 'region'
    | 'city'
    | 'stadium'
    | 'competition'
    | 'season'
    | 'registration'
    | 'contract'
    | 'translation'
    | 'asset';
  readonly operation: 'create' | 'edit' | 'duplicate' | 'delete';
  readonly targetId: string;
  readonly label: string;
  readonly summary: string;
  readonly patches: readonly GeneratedPackagePatch[];
  readonly asset: AuthoringAssetUpload | null;
}
