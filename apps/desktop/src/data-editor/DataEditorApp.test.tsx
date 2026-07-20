import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DataEditorApp } from './DataEditorApp.js';

const clientMock = vi.hoisted(() => ({
  exportDataPackageSource: vi.fn(),
  loadDataPackageCatalog: vi.fn(),
  loadWorldDatabaseSummary: vi.fn(),
  validateDataPackageSource: vi.fn(),
}));

vi.mock('./client.js', () => clientMock);

const validReport = { valid: true, diagnostics: [] } as const;

describe('DataEditorApp', () => {
  beforeEach(() => {
    clientMock.exportDataPackageSource.mockReset().mockResolvedValue(validReport);
    clientMock.loadDataPackageCatalog.mockReset().mockResolvedValue([
      {
        manifest: {
          packageId: 'official.rivallo.foundation',
          name: 'Rivallo Foundation',
          version: '1.0.0',
        },
        active: true,
        validation: validReport,
      },
    ]);
    clientMock.loadWorldDatabaseSummary.mockReset().mockResolvedValue({
      packageId: 'official.rivallo.foundation',
      version: '1.0.0',
      schemaVersion: 1,
      fingerprintAlgorithm: 'fnv1a64',
      worldFingerprint: 'e581b5521d09cf7b',
    });
    clientMock.validateDataPackageSource.mockReset().mockResolvedValue({
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
          rule: 'Referência ausente.',
          suggestion: 'Corrija o ID.',
          blocking: true,
        },
      ],
    });
  });

  it('lists the package catalog and exposes complete validation diagnostics', async () => {
    render(<DataEditorApp />);
    expect(await screen.findByText('Rivallo Foundation')).toBeInstanceOf(HTMLElement);
    expect(screen.getByText('Base ativa')).toBeInstanceOf(HTMLElement);
    expect(screen.getByText('Snapshot ativo')).toBeInstanceOf(HTMLElement);
    expect(screen.getAllByText('official.rivallo.foundation')).toHaveLength(2);
    expect(screen.getByText('e581b5521d09cf7b')).toBeInstanceOf(HTMLElement);

    fireEvent.click(screen.getByRole('button', { name: 'Validar' }));
    expect(await screen.findByText('package.reference_missing')).toBeInstanceOf(HTMLElement);
    expect(screen.getByText('club.example')).toBeInstanceOf(HTMLElement);
    expect(screen.getByText('stadiumId')).toBeInstanceOf(HTMLElement);
    expect(screen.getByText('stadium.missing')).toBeInstanceOf(HTMLElement);
    expect(screen.getByText(/Corrija o ID/u)).toBeInstanceOf(HTMLElement);
  });

  it('states explicitly that exporting a mod does not activate it', async () => {
    render(<DataEditorApp />);
    fireEvent.click(screen.getByRole('button', { name: 'Exportar pacote' }));
    await waitFor(() => {
      expect(screen.getByText(/não foi ativado em nenhuma carreira/u)).toBeInstanceOf(HTMLElement);
    });
    expect(clientMock.loadDataPackageCatalog).toHaveBeenCalledTimes(2);
  });
});
