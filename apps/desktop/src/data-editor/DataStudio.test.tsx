import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DataStudio } from './DataStudio.js';
import type { ModAuthoringWorld } from './types.js';

const world: ModAuthoringWorld = {
  clubs: [],
  players: [],
  playerProfiles: [],
  coaches: [],
  nations: [{ id: 'nation.br', name: 'Brasil', iso2: 'BR', iso3: 'BRA' }],
  regions: [],
  cities: [],
  stadiums: [],
  competitions: [],
  activeClubId: '',
};

describe('DataStudio integrated authoring workspace', () => {
  it('creates a city visually from an actionable empty state with the consistent toolbar', () => {
    const onUpsert = vi.fn();
    render(
      <DataStudio
        author="Lia"
        changes={[]}
        onBatch={vi.fn()}
        onRollback={vi.fn()}
        onUpsert={onUpsert}
        onValidate={vi.fn().mockResolvedValue(undefined)}
        report={null}
        world={world}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cidades' }));
    expect(screen.getByRole('heading', { name: 'Nenhuma cidade' })).toBeInstanceOf(HTMLElement);
    const toolbar = screen.getByRole('toolbar', { name: 'Ações de Cidades' });
    expect(toolbar).toBeInstanceOf(HTMLElement);
    for (const action of ['Criar novo', 'Importar', 'Exportar CSV', 'Filtros']) {
      expect(within(toolbar).getByRole('button', { name: action })).toBeInstanceOf(HTMLElement);
    }

    fireEvent.click(screen.getAllByRole('button', { name: 'Criar novo' })[0]!);
    fireEvent.change(screen.getByRole('textbox', { name: 'Nome' }), {
      target: { value: 'Porto Claro' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: 'Nação' }), {
      target: { value: 'nation.br' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar rascunho' }));

    expect(onUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'city', operation: 'create', label: 'Porto Claro' }),
    );
  });

  it('offers real staff creation instead of an import-only placeholder', () => {
    render(
      <DataStudio
        author="Lia"
        changes={[]}
        initialModule="staff"
        onBatch={vi.fn()}
        onRollback={vi.fn()}
        onUpsert={vi.fn()}
        onValidate={vi.fn().mockResolvedValue(undefined)}
        report={null}
        world={world}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Nenhum membro da comissão' })).toBeInstanceOf(
      HTMLElement,
    );
    fireEvent.click(screen.getAllByRole('button', { name: 'Criar novo' })[0]!);
    expect(screen.getByRole('heading', { name: 'Novo profissional' })).toBeInstanceOf(HTMLElement);
  });
});
