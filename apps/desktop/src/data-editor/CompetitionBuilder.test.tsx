import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CompetitionBuilder } from './CompetitionBuilder.js';
import type { ModAuthoringWorld } from './types.js';

const world: ModAuthoringWorld = {
  clubs: Array.from({ length: 20 }, (_, index) => ({
    id: `club.${index + 1}`,
    name: `Clube ${index + 1}`,
    shortName: `C${index + 1}`,
    city: 'Cidade',
    primaryColor: '#123b32',
  })),
  players: [],
  playerProfiles: [],
  coaches: [],
  nations: [{ id: 'nation.brazil', name: 'Brasil', iso2: 'BRA' }],
  regions: [],
  cities: [],
  stadiums: [],
  competitions: [],
  activeClubId: 'club.1',
};

describe('CompetitionBuilder', () => {
  it('models a 20-team double round robin as 38 rounds and 380 expected matches', () => {
    const onUpsert = vi.fn();
    render(<CompetitionBuilder author="Lia" onUpsert={onUpsert} world={world} />);
    fireEvent.click(screen.getByRole('radio', { name: /Criar nova temporada/u }));
    for (const checkbox of screen.getAllByRole('checkbox')) fireEvent.click(checkbox);
    expect(screen.getByText('380')).toBeInstanceOf(HTMLElement);
    expect(screen.getByText('38')).toBeInstanceOf(HTMLElement);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar competição' }));
    const change = onUpsert.mock.calls[0]?.[0] as {
      patches: Array<{
        entity: {
          value: { seasons: Array<{ rules: { rounds: number; participantCount: number } }> };
        };
      }>;
    };
    expect(change.patches[0]?.entity.value.seasons[0]?.rules).toMatchObject({
      rounds: 38,
      participantCount: 20,
    });
  });

  it('accepts Brasileirão as the competition short name without forcing an acronym', () => {
    const onUpsert = vi.fn();
    render(<CompetitionBuilder author="Lia" onUpsert={onUpsert} world={world} />);
    fireEvent.change(screen.getByRole('textbox', { name: /Nome curto ou sigla/u }), {
      target: { value: 'Brasileirão' },
    });
    for (const checkbox of screen.getAllByRole('checkbox')) fireEvent.click(checkbox);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar competição' }));

    const change = onUpsert.mock.calls[0]?.[0] as {
      patches: Array<{ entity: { value: { shortName: string } } }>;
    };
    expect(change.patches[0]?.entity.value.shortName).toBe('Brasileirão');
  });

  it('saves a competition draft without a silently-created season and exposes every template', () => {
    const onUpsert = vi.fn();
    render(<CompetitionBuilder author="Lia" onUpsert={onUpsert} world={world} />);

    for (const label of [
      'Liga · turno único',
      'Liga · turno e returno',
      'Mata-mata',
      'Mata-mata ida e volta',
      'Grupos',
      'Grupos + mata-mata',
      'Múltiplos estágios',
      'Template vazio',
    ]) {
      expect(screen.getByRole('radio', { name: label })).toBeInstanceOf(HTMLElement);
    }

    fireEvent.click(screen.getByRole('button', { name: 'Salvar competição' }));
    const change = onUpsert.mock.calls[0]?.[0] as {
      patches: Array<{
        entity: { value: { baseSeasonId: string | null; seasons: unknown[] } };
      }>;
    };
    expect(change.patches[0]?.entity.value).toMatchObject({ baseSeasonId: null, seasons: [] });
  });

  it('creates a season only after an explicit choice and remains idempotent on repeated save', () => {
    const onUpsert = vi.fn();
    render(<CompetitionBuilder author="Lia" onUpsert={onUpsert} world={world} />);

    expect(screen.getByText('Nenhuma temporada será criada')).toBeInstanceOf(HTMLElement);
    fireEvent.click(screen.getByRole('radio', { name: /Criar nova temporada/u }));
    expect(
      screen.getByText('A temporada 2026 será criada e vinculada a esta competição.'),
    ).toBeInstanceOf(HTMLElement);

    fireEvent.click(screen.getByRole('button', { name: 'Salvar competição' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar competição' }));

    for (const call of onUpsert.mock.calls) {
      const value = call[0].patches[0].entity.value as {
        baseSeasonId: string;
        seasons: Array<{ id: string; participantClubIds: string[]; rules: object }>;
      };
      expect(value.seasons).toHaveLength(1);
      expect(value.seasons[0]?.id).toBe(value.baseSeasonId);
      expect(value.seasons[0]?.participantClubIds).toEqual([]);
      expect(value.seasons[0]?.rules).not.toHaveProperty('fixtures');
    }
  });

  it('updates an existing season in place and replaces a renamed draft-owned season', () => {
    const initialCompetition = {
      id: 'community.lia.competition.liga-teste',
      name: 'Liga Teste',
      shortName: 'LT',
      nationId: 'nation.brazil',
      baseSeasonId: 'community.lia.competition.liga-teste.season.2026',
      seasons: [
        {
          id: 'community.lia.competition.liga-teste.season.2026',
          competitionId: 'community.lia.competition.liga-teste',
          label: '2026',
          startDate: '2026-01-01',
          endDate: '2026-12-31',
          participantClubIds: [],
          stages: [],
          rules: {},
          registrationWindows: [],
          calendarConstraints: {},
          playerRegistrations: [],
        },
      ],
    };
    const onUpsert = vi.fn();
    render(
      <CompetitionBuilder
        author="Lia"
        initialCompetition={initialCompetition}
        onUpsert={onUpsert}
        world={{ ...world, competitions: [initialCompetition] }}
      />,
    );

    expect(
      screen.getByRole('radio', { name: /Usar temporada existente/u }).getAttribute('aria-checked'),
    ).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Salvar competição' }));
    const updated = onUpsert.mock.calls[0]?.[0].patches[0].entity.value;
    expect(updated.seasons).toHaveLength(1);
    expect(updated.seasons[0].id).toBe(initialCompetition.baseSeasonId);

    fireEvent.click(screen.getByRole('radio', { name: /Criar nova temporada/u }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Temporada' }), {
      target: { value: '2027' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar competição' }));
    const renamed = onUpsert.mock.calls[1]?.[0].patches[0].entity.value;
    expect(renamed.seasons).toHaveLength(1);
    expect(renamed.seasons[0]).toMatchObject({
      id: 'community.lia.competition.liga-teste.season.2027',
      label: '2027',
    });
    expect(renamed.baseSeasonId).toBe('community.lia.competition.liga-teste.season.2027');
  });
});
