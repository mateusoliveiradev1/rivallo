import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  decodeValidationReport,
  exportDataPackageSource,
  loadDataPackageCatalog,
  validateDataPackageSource,
} from './client.js';

const invokeMock = vi.fn();

const source = { manifestJson: '{}', worldJson: null, patchesJson: '[]' };
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
