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
    expect(screen.getByText('380')).toBeInstanceOf(HTMLElement);
    expect(screen.getByText('38')).toBeInstanceOf(HTMLElement);
    for (const checkbox of screen.getAllByRole('checkbox')) fireEvent.click(checkbox);
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
});
