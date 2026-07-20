import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DataEditorApp } from './DataEditorApp.js';

const clientMock = vi.hoisted(() => ({
  chooseRivmodOpenPath: vi.fn(),
  chooseRivmodSavePath: vi.fn(),
  deleteCreatorProject: vi.fn(),
  exportRivmod: vi.fn(),
  exportDataPackageSource: vi.fn(),
  forkCreatorPackage: vi.fn(),
  inspectRivmod: vi.fn(),
  installRivmod: vi.fn(),
  loadDataPackageCatalog: vi.fn(),
  loadCreatorProject: vi.fn(),
  loadCreatorProjects: vi.fn(),
  loadModAuthoringWorld: vi.fn(),
  loadPackageHistory: vi.fn(),
  loadWorldDatabaseSummary: vi.fn(),
  rollbackPackage: vi.fn(),
  saveCreatorProject: vi.fn(),
  validateDataPackageSource: vi.fn(),
}));
const careerClientMock = vi.hoisted(() => ({ exitApplication: vi.fn() }));

vi.mock('./client.js', () => clientMock);
vi.mock('../career/client.js', () => careerClientMock);

const validReport = { valid: true, diagnostics: [] } as const;

describe('DataEditorApp', () => {
  beforeEach(() => {
    careerClientMock.exitApplication.mockReset().mockResolvedValue(undefined);
    clientMock.exportDataPackageSource.mockReset().mockResolvedValue(validReport);
    clientMock.loadCreatorProjects.mockReset().mockResolvedValue([]);
    clientMock.loadDataPackageCatalog.mockReset().mockResolvedValue([
      {
        manifest: {
          packageId: 'official.rivallo.foundation',
          name: 'Rivallo Foundation',
          version: '1.0.0',
          contentType: 'base',
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
    clientMock.loadModAuthoringWorld.mockReset().mockResolvedValue({
      clubs: [
        {
          id: 'aurora-fc',
          name: 'Aurora Futebol Clube',
          shortName: 'AUR',
          city: 'Aurora',
          primaryColor: '#237a57',
        },
      ],
      players: [
        {
          id: 'p1',
          name: 'Caio Brandão',
          shortName: 'Caio',
          shirtNumber: 1,
          position: 'GK',
          age: 20,
          nationality: 'Brasil',
          heightCm: 184,
          preferredFoot: 'right',
          squadRole: 'firstTeam',
          rating: 77,
          potentialRating: 80,
          matchFitness: 100,
          morale: 75,
          condition: 100,
          appearances: 0,
          goals: 0,
          assists: 0,
          averageRating: 0,
          selected: true,
        },
      ],
      playerProfiles: [],
      coaches: [],
      nations: [{ id: 'nation.brazil', name: 'Brasil', iso2: 'BRA' }],
      activeClubId: 'aurora-fc',
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
    expect(screen.getByText(/Base imutável · v1.0.0/u)).toBeInstanceOf(HTMLElement);
    expect(screen.queryByRole('textbox', { name: /manifest.json/u })).toBeNull();

    fireEvent.change(screen.getByRole('textbox', { name: 'Seu nome ou apelido' }), {
      target: { value: 'Lia' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'O que este mod faz?' }), {
      target: { value: 'Atualiza o clube para a nova temporada.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(await screen.findByRole('heading', { name: 'O que você quer mudar?' })).toBeInstanceOf(
      HTMLElement,
    );
    fireEvent.click(screen.getByRole('radio', { name: 'Editar existente' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar edição do clube' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Validar mod' }));
    expect(await screen.findByText('package.reference_missing')).toBeInstanceOf(HTMLElement);
    expect(screen.getByText('club.example')).toBeInstanceOf(HTMLElement);
    expect(screen.getByText('stadiumId')).toBeInstanceOf(HTMLElement);
    expect(screen.getByText('stadium.missing')).toBeInstanceOf(HTMLElement);
    expect(screen.getByText(/Corrija o ID/u)).toBeInstanceOf(HTMLElement);
  });

  it('states explicitly that exporting a mod does not activate it', async () => {
    render(<DataEditorApp />);
    await screen.findByText('Rivallo Foundation');
    fireEvent.change(screen.getByRole('textbox', { name: 'Seu nome ou apelido' }), {
      target: { value: 'Lia' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'O que este mod faz?' }), {
      target: { value: 'Atualiza o clube para a nova temporada.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Editar existente' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar edição do clube' }));
    expect(screen.getByRole('status').classList.contains('data-editor-toast')).toBe(true);
    expect(screen.getByText('Rascunho atualizado')).toBeInstanceOf(HTMLElement);
    expect(screen.getAllByText(/foi adicionado ao mod/u)).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Exportar mod' }));
    await waitFor(() => {
      expect(
        screen.getByText(/disponível para seleção ao criar uma nova carreira/u),
      ).toBeInstanceOf(HTMLElement);
    });
    expect(clientMock.loadDataPackageCatalog).toHaveBeenCalledTimes(2);
  });

  it('opens project and installed-mod actions in unclipped accessible menus', async () => {
    const user = userEvent.setup();
    clientMock.loadCreatorProjects.mockResolvedValue([
      {
        projectId: 'project.meu-mod',
        name: 'Meu projeto',
        mode: 'quickMod',
        status: 'draft',
        basePackageId: 'official.rivallo.foundation',
        packageId: 'community.lia.meu-mod',
        version: '1.0.0',
        updatedAt: 1,
        lastExportedAt: null,
        entityCount: 2,
      },
    ]);
    clientMock.loadDataPackageCatalog.mockResolvedValue([
      {
        manifest: {
          packageId: 'official.rivallo.foundation',
          name: 'Rivallo Foundation',
          version: '1.0.0',
          contentType: 'base',
        },
        active: true,
        validation: validReport,
      },
      {
        manifest: {
          packageId: 'community.lia.meu-mod',
          name: 'Meu mod instalado',
          version: '1.0.0',
          contentType: 'mod',
        },
        active: false,
        validation: validReport,
      },
    ]);

    render(<DataEditorApp />);
    await screen.findByText('Meu projeto');

    await user.click(screen.getByRole('button', { name: 'Ações de Meu projeto' }));
    const projectMenu = await screen.findByRole('menu', { name: 'Ações de Meu projeto' });
    expect(screen.getByRole('menuitem', { name: 'Continuar edição' })).toBeInstanceOf(HTMLElement);
    expect(document.querySelector('.data-editor-catalog')?.contains(projectMenu)).toBe(false);

    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByRole('menuitem', { name: 'Continuar edição' })).toBeNull();
    });

    await user.click(screen.getByRole('button', { name: 'Ações de Meu mod instalado' }));
    expect(await screen.findByRole('menuitem', { name: 'Criar nova versão' })).toBeInstanceOf(
      HTMLElement,
    );
    expect(screen.getByRole('menuitem', { name: 'Ver histórico e rollback' })).toBeInstanceOf(
      HTMLElement,
    );
  });

  it('rejects a custom mod version that is not higher than the installed version', async () => {
    const user = userEvent.setup();
    clientMock.loadDataPackageCatalog.mockResolvedValue([
      {
        manifest: {
          packageId: 'official.rivallo.foundation',
          name: 'Rivallo Foundation',
          version: '1.0.0',
          contentType: 'base',
        },
        active: true,
        validation: validReport,
      },
      {
        manifest: {
          packageId: 'community.lia.meu-mod',
          name: 'Meu mod instalado',
          version: '1.2.0',
          contentType: 'mod',
        },
        active: false,
        validation: validReport,
      },
    ]);

    render(<DataEditorApp />);
    await screen.findByText('Meu mod instalado');
    await user.click(screen.getByRole('button', { name: 'Ações de Meu mod instalado' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Criar nova versão' }));
    await user.click(screen.getByRole('radio', { name: /Personalizada/u }));
    await user.type(screen.getByRole('textbox', { name: 'Nova versão' }), '1.2.0');
    await user.type(
      screen.getByRole('textbox', { name: 'Notas da versão' }),
      'Correções internas.',
    );
    await user.click(screen.getByRole('button', { name: 'Criar projeto da nova versão' }));

    expect(await screen.findByText('A nova versão precisa ser superior a 1.2.0.')).toBeInstanceOf(
      HTMLElement,
    );
    expect(clientMock.forkCreatorPackage).not.toHaveBeenCalled();
  });

  it('suppresses the browser prompt on a confirmed branded exit', async () => {
    render(<DataEditorApp />);
    await screen.findByText('Rivallo Foundation');
    fireEvent.change(screen.getByRole('textbox', { name: 'Seu nome ou apelido' }), {
      target: { value: 'Lia' },
    });

    const accidentalUnload = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(accidentalUnload);
    expect(accidentalUnload.defaultPrevented).toBe(true);

    fireEvent(window, new Event('rivallo:window-close-requested', { cancelable: true }));
    const dialog = screen.getByRole('alertdialog', { name: 'Descartar o mod não exportado?' });
    expect(dialog).toBeInstanceOf(HTMLElement);
    fireEvent.click(screen.getByRole('button', { name: 'Descartar e sair' }));
    expect(careerClientMock.exitApplication).toHaveBeenCalledOnce();

    const confirmedUnload = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(confirmedUnload);
    expect(confirmedUnload.defaultPrevented).toBe(false);
  });
});
