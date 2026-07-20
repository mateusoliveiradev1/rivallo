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
}
