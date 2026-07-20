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
  readonly kind: 'clubCrest' | 'playerPortrait' | 'coachPortrait';
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
  readonly players: readonly Player[];
  readonly playerProfiles: readonly AuthoringPlayerProfile[];
  readonly coaches: readonly AuthoringCoachProfile[];
  readonly nations: readonly {
    readonly id: string;
    readonly name: string;
    readonly iso2: string;
  }[];
  readonly activeClubId: string;
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
  readonly operation: 'add' | 'replace';
  readonly entityKind: 'club' | 'matchdayPlayer' | 'playerProfile' | 'externalPlayer' | 'coach';
  readonly targetId: string;
  readonly entity: { readonly kind: string; readonly value: unknown };
  readonly reason: string;
}

export interface CommunityChange {
  readonly id: string;
  readonly kind: 'club' | 'player' | 'coach';
  readonly operation: 'create' | 'edit';
  readonly targetId: string;
  readonly label: string;
  readonly summary: string;
  readonly patches: readonly GeneratedPackagePatch[];
  readonly asset: AuthoringAssetUpload | null;
}
