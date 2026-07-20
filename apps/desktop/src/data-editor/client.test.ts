import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  decodeValidationReport,
  exportDataPackageSource,
  loadDataPackageCatalog,
  loadPrivateDataPackageCatalog,
  loadWorldDatabaseSummary,
  runPrivatePackageSandbox,
  validateDataPackageSource,
} from './client.js';

const invokeMock = vi.fn();

const source = { manifestJson: '{}', worldJson: null, patchesJson: '[]', assets: [] };
const report = {
  valid: false,
  diagnostics: [
    {
      code: 'package.reference_missing',
      severity: 'error',
      file: 'data/patches.json',
      entityId: 'club.example',
      field: 'stadiumId',
      reference: 'stadium.missing',
      invalidValue: null,
      rule: 'Toda referência deve apontar para uma entidade existente.',
      suggestion: 'Adicione o estádio ou corrija stadiumId.',
      blocking: true,
    },
  ],
} as const;

describe('data editor client', () => {
  beforeEach(() => {
    invokeMock.mockReset();
    Object.assign(window, { __TAURI_INTERNALS__: { invoke: invokeMock } });
  });

  it('uses the dedicated catalog and validation commands', async () => {
    invokeMock.mockResolvedValueOnce([]).mockResolvedValueOnce(report);
    await expect(loadDataPackageCatalog()).resolves.toEqual([]);
    await expect(validateDataPackageSource(source)).resolves.toEqual(report);
    expect(invokeMock).toHaveBeenNthCalledWith(1, 'data_package_catalog', {}, undefined);
    expect(invokeMock).toHaveBeenNthCalledWith(
      2,
      'validate_data_package_source',
      { source },
      undefined,
    );
  });

  it('keeps private discovery and sandbox behind dedicated commands', async () => {
    invokeMock.mockResolvedValueOnce([]).mockResolvedValueOnce({
      packages: [{ packageId: 'dev.synthetic' }],
      world: { people: [{}], clubs: [{}, {}], competitions: [] },
    });

    await expect(loadPrivateDataPackageCatalog()).resolves.toEqual([]);
    await expect(runPrivatePackageSandbox(['dev.synthetic'])).resolves.toEqual({
      packages: 1,
      people: 1,
      clubs: 2,
      competitions: 0,
    });
    expect(invokeMock).toHaveBeenNthCalledWith(1, 'private_data_package_catalog', {}, undefined);
    expect(invokeMock).toHaveBeenNthCalledWith(
      2,
      'preview_private_package_sandbox',
      { packageIds: ['dev.synthetic'] },
      undefined,
    );
  });

  it('decodes the active base and world fingerprint from the runtime status', async () => {
    invokeMock.mockResolvedValue({
      schemaVersion: 1,
      packages: [
        {
          packageId: 'official.rivallo.foundation',
          version: '1.0.0',
          contentType: 'base',
        },
      ],
      fingerprint: { algorithm: 'fnv1a64', value: 'e581b5521d09cf7b' },
    });

    await expect(loadWorldDatabaseSummary()).resolves.toEqual({
      packageId: 'official.rivallo.foundation',
      version: '1.0.0',
      schemaVersion: 1,
      fingerprintAlgorithm: 'fnv1a64',
      worldFingerprint: 'e581b5521d09cf7b',
    });
    expect(invokeMock).toHaveBeenCalledWith('world_database_status', {}, undefined);
  });

  it('preserves structured validation diagnostics returned as an export rejection', async () => {
    invokeMock.mockRejectedValue(report);
    await expect(exportDataPackageSource(source)).resolves.toEqual(report);
  });

  it('rejects malformed reports instead of hiding a boundary incompatibility', () => {
    expect(() => decodeValidationReport({ valid: true, diagnostics: [{}] })).toThrow(
      'diagnóstico incompatível',
    );
  });
});
