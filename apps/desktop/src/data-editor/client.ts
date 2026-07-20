import { invoke } from '@tauri-apps/api/core';

import type {
  DataPackageAuthoringSource,
  DataPackageCatalogEntry,
  CreatorProjectDraft,
  CreatorProjectMode,
  CreatorProjectRecord,
  CreatorProjectSummary,
  ModAuthoringWorld,
  PackageValidationDiagnostic,
  PackageValidationReport,
  PackageDistributionReceipt,
  PackageHistoryEntry,
  PrivateSandboxSummary,
  RivmodInspection,
  WorldDatabaseSummary,
} from './types.js';

const record = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const nullableString = (value: unknown): string | null =>
  typeof value === 'string' ? value : null;

const decodeDiagnostic = (value: unknown): PackageValidationDiagnostic => {
  const source = record(value);
  if (
    !source ||
    typeof source.code !== 'string' ||
    (source.severity !== 'error' && source.severity !== 'warning') ||
    typeof source.file !== 'string' ||
    typeof source.rule !== 'string' ||
    typeof source.blocking !== 'boolean'
  ) {
    throw new Error('O validador retornou um diagnóstico incompatível.');
  }
  return {
    code: source.code,
    severity: source.severity,
    file: source.file,
    entityId: nullableString(source.entityId),
    field: nullableString(source.field),
    reference: nullableString(source.reference),
    invalidValue: nullableString(source.invalidValue),
    rule: source.rule,
    suggestion: nullableString(source.suggestion),
    blocking: source.blocking,
  };
};

export const decodeValidationReport = (value: unknown): PackageValidationReport => {
  const source = record(value);
  if (!source || typeof source.valid !== 'boolean' || !Array.isArray(source.diagnostics)) {
    throw new Error('O validador retornou um relatório incompatível.');
  }
  return {
    valid: source.valid,
    diagnostics: source.diagnostics.map(decodeDiagnostic),
  };
};

export const loadDataPackageCatalog = async (): Promise<readonly DataPackageCatalogEntry[]> =>
  invoke<DataPackageCatalogEntry[]>('data_package_catalog');

export const loadPrivateDataPackageCatalog = async (): Promise<
  readonly DataPackageCatalogEntry[]
> => invoke<DataPackageCatalogEntry[]>('private_data_package_catalog');

export const runPrivatePackageSandbox = async (
  packageIds: readonly string[],
): Promise<PrivateSandboxSummary> => {
  const resolved = record(await invoke<unknown>('preview_private_package_sandbox', { packageIds }));
  const world = record(resolved?.world);
  if (
    !resolved ||
    !Array.isArray(resolved.packages) ||
    !world ||
    !Array.isArray(world.people) ||
    !Array.isArray(world.clubs) ||
    !Array.isArray(world.competitions)
  ) {
    throw new Error('O sandbox privado retornou um snapshot incompatível.');
  }
  return {
    packages: resolved.packages.length,
    people: world.people.length,
    clubs: world.clubs.length,
    competitions: world.competitions.length,
  };
};

export const loadModAuthoringWorld = async (packageId: string): Promise<ModAuthoringWorld> => {
  const resolved = record(
    await invoke<unknown>('preview_career_composition', { packageIds: [packageId] }),
  );
  const world = record(resolved?.world);
  const matchday = record(world?.matchday);
  const profiles = record(world?.profiles);
  if (
    !world ||
    !Array.isArray(world.clubs) ||
    !Array.isArray(world.nations) ||
    !matchday ||
    !Array.isArray(matchday.players) ||
    !record(matchday.club) ||
    !profiles ||
    !Array.isArray(profiles.players) ||
    !Array.isArray(profiles.coaches)
  ) {
    throw new Error('A base selecionada não pode ser aberta no editor guiado.');
  }
  return {
    clubs: world.clubs,
    players: matchday.players,
    playerProfiles: profiles.players,
    coaches: profiles.coaches,
    nations: world.nations,
    regions: Array.isArray(world.regions) ? world.regions : [],
    cities: Array.isArray(world.cities) ? world.cities : [],
    stadiums: Array.isArray(world.stadiums) ? world.stadiums : [],
    competitions: Array.isArray(world.competitions) ? world.competitions : [],
    activeClubId: record(matchday.club)?.id,
  } as ModAuthoringWorld;
};

export const loadWorldDatabaseSummary = async (): Promise<WorldDatabaseSummary> => {
  const status = record(await invoke<unknown>('world_database_status'));
  const fingerprint = record(status?.fingerprint);
  const packages = Array.isArray(status?.packages) ? status.packages : [];
  const base = packages.map(record).find((manifest) => manifest?.contentType === 'base');
  if (
    !status ||
    typeof status.schemaVersion !== 'number' ||
    !fingerprint ||
    typeof fingerprint.algorithm !== 'string' ||
    typeof fingerprint.value !== 'string' ||
    !base ||
    typeof base.packageId !== 'string' ||
    typeof base.version !== 'string'
  ) {
    throw new Error('O runtime retornou um status mundial incompatível.');
  }
  return {
    packageId: base.packageId,
    version: base.version,
    schemaVersion: status.schemaVersion,
    fingerprintAlgorithm: fingerprint.algorithm,
    worldFingerprint: fingerprint.value,
  };
};

export const validateDataPackageSource = async (
  source: DataPackageAuthoringSource,
): Promise<PackageValidationReport> =>
  decodeValidationReport(await invoke<unknown>('validate_data_package_source', { source }));

export const exportDataPackageSource = async (
  source: DataPackageAuthoringSource,
): Promise<PackageValidationReport> => {
  try {
    return decodeValidationReport(await invoke<unknown>('export_data_package_source', { source }));
  } catch (error) {
    try {
      return decodeValidationReport(error);
    } catch {
      throw error;
    }
  }
};

export const loadCreatorProjects = async (): Promise<readonly CreatorProjectSummary[]> =>
  invoke<CreatorProjectSummary[]>('creator_projects');

export const loadCreatorProject = async (projectId: string): Promise<CreatorProjectRecord> =>
  invoke<CreatorProjectRecord>('creator_project', { projectId });

export const saveCreatorProject = async (
  draft: CreatorProjectDraft,
): Promise<CreatorProjectRecord> => invoke<CreatorProjectRecord>('save_creator_project', { draft });

export const deleteCreatorProject = async (projectId: string): Promise<void> =>
  invoke<void>('delete_creator_project', { projectId });

export const forkCreatorPackage = async (options: {
  readonly packageId: string;
  readonly projectId: string;
  readonly name: string;
  readonly mode: CreatorProjectMode;
  readonly nextVersion?: string | null;
  readonly duplicatePackageId?: string | null;
}): Promise<CreatorProjectRecord> => invoke<CreatorProjectRecord>('fork_creator_package', options);

export const chooseRivmodSavePath = async (): Promise<string | null> =>
  invoke<string | null>('creator_choose_save_path');

export const chooseRivmodOpenPath = async (): Promise<string | null> =>
  invoke<string | null>('creator_choose_open_path');

export const exportRivmod = async (
  source: DataPackageAuthoringSource,
  destination: string,
  projectId: string | null,
): Promise<PackageDistributionReceipt> =>
  invoke<PackageDistributionReceipt>('export_rivmod', { source, destination, projectId });

export const inspectRivmod = async (path: string): Promise<RivmodInspection> =>
  invoke<RivmodInspection>('inspect_rivmod', { bundleLocation: path });

export const installRivmod = async (path: string): Promise<PackageDistributionReceipt> =>
  invoke<PackageDistributionReceipt>('install_rivmod', { bundleLocation: path });

export const loadPackageHistory = async (
  packageId: string,
): Promise<readonly PackageHistoryEntry[]> =>
  invoke<PackageHistoryEntry[]>('creator_package_history', { packageId });

export const rollbackPackage = async (
  packageId: string,
  version: string,
): Promise<PackageDistributionReceipt> =>
  invoke<PackageDistributionReceipt>('rollback_creator_package', { packageId, version });
