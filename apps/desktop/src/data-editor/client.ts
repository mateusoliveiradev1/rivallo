import { invoke } from '@tauri-apps/api/core';

import type {
  DataPackageAuthoringSource,
  DataPackageCatalogEntry,
  ModAuthoringWorld,
  PackageValidationDiagnostic,
  PackageValidationReport,
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
