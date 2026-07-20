import { invoke } from '@tauri-apps/api/core';

import type {
  DataPackageAuthoringSource,
  DataPackageCatalogEntry,
  PackageValidationDiagnostic,
  PackageValidationReport,
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
