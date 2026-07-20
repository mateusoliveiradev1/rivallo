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

  it('edits an existing registration in place and only exposes applicable toolbar actions', () => {
    const onUpsert = vi.fn();
    const registrationWorld = {
      ...world,
      clubs: [
        {
          id: 'club.one',
          name: 'Clube Um',
          shortName: 'CU',
          city: 'Cidade Um',
          primaryColor: '#237a57',
        },
      ],
      activeClubId: 'club.one',
      playerProfiles: [
        {
          identity: {
            entityId: 'player.one',
            fullName: 'Jogador Um',
            knownName: 'Jogador Um',
            clubId: 'club.one',
          },
        },
      ],
      competitions: [
        {
          id: 'competition.one',
          name: 'Liga Um',
          shortName: 'Liga',
          nationId: 'nation.br',
          baseSeasonId: 'season.one',
          seasons: [
            {
              id: 'season.one',
              competitionId: 'competition.one',
              label: '2026',
              startDate: '2026-01-01',
              endDate: '2026-12-31',
              participantClubIds: ['club.one'],
              stages: [],
              rules: {},
              registrationWindows: [],
              calendarConstraints: {},
              playerRegistrations: [
                {
                  playerId: 'player.one',
                  clubId: 'club.one',
                  shirtNumber: 10,
                  contractReference: null,
                  eligible: true,
                },
              ],
            },
          ],
        },
      ],
    } as unknown as ModAuthoringWorld;

    render(
      <DataStudio
        author="Lia"
        changes={[]}
        initialEntity="registration:season.one:player.one"
        initialModule="registrations"
        onBatch={vi.fn()}
        onRollback={vi.fn()}
        onUpsert={onUpsert}
        onValidate={vi.fn().mockResolvedValue(undefined)}
        report={null}
        world={registrationWorld}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Editar inscrição' })).toBeInstanceOf(HTMLElement);
    const toolbar = screen.getByRole('toolbar', { name: 'Ações de Inscrições' });
    expect(within(toolbar).queryByRole('button', { name: 'Duplicar' })).toBeNull();
    expect(within(toolbar).getByRole('button', { name: 'Excluir' })).toBeInstanceOf(HTMLElement);

    fireEvent.change(screen.getByRole('spinbutton', { name: 'Número opcional' }), {
      target: { value: '11' },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: /Elegível para jogar/u }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(onUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'registration:season.one:player.one',
        operation: 'edit',
        targetId: 'competition.one',
        patches: [
          expect.objectContaining({
            entity: expect.objectContaining({
              value: expect.objectContaining({
                seasons: [
                  expect.objectContaining({
                    playerRegistrations: [
                      expect.objectContaining({ shirtNumber: 11, eligible: false }),
                    ],
                  }),
                ],
              }),
            }),
          }),
        ],
      }),
    );
  });
});
