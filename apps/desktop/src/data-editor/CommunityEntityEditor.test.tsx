import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CommunityEntityEditor } from './CommunityEntityEditor.js';
import type { CommunityChange, ModAuthoringWorld } from './types.js';

const world: ModAuthoringWorld = {
  clubs: [
    {
      id: 'aurora-fc',
      name: 'Aurora Futebol Clube',
      shortName: 'AUR',
      city: 'Aurora',
      primaryColor: '#237a57',
      countryCode: 'BRA',
      competitionName: 'Liga Nacional',
      stadiumName: 'Estádio Aurora',
    },
  ],
  players: [
    {
      id: 'p1',
      name: 'Caio Brandão',
      shortName: 'Caio',
      shirtNumber: 8,
      position: 'CM',
      age: 20,
      nationality: 'BRA',
      heightCm: 180,
      preferredFoot: 'right',
      squadRole: 'firstTeam',
      rating: 72,
      potentialRating: 82,
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
};

const lastChange = (onUpsert: ReturnType<typeof vi.fn>) =>
  onUpsert.mock.calls.at(-1)?.[0] as CommunityChange;

describe('CommunityEntityEditor', () => {
  it('creates a goalkeeper with the correct profile model and coherent potential', () => {
    const onUpsert = vi.fn();
    render(<CommunityEntityEditor author="Lia" onUpsert={onUpsert} world={world} />);

    fireEvent.click(screen.getByRole('tab', { name: 'Jogador' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Nome completo' }), {
      target: { value: 'Marina Souza' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Nome conhecido' }), {
      target: { value: 'Marina' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: 'Posição' }), {
      target: { value: 'GK' },
    });
    fireEvent.change(screen.getByRole('slider', { name: 'Nível atual' }), {
      target: { value: '80' },
    });
    expect((screen.getByRole('slider', { name: 'Potencial' }) as HTMLInputElement).value).toBe(
      '80',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar jogador ao mod' }));

    const change = lastChange(onUpsert);
    expect(change.patches.map((item) => item.entityKind)).toEqual([
      'matchdayPlayer',
      'playerProfile',
    ]);
    const profile = change.patches[1]?.entity.value as {
      attributes: Record<string, number | string>;
      internalPotential: number;
    };
    expect(profile.attributes.model).toBe('goalkeeper');
    expect(profile.attributes).toHaveProperty('handling', 50);
    expect(profile.attributes).not.toHaveProperty('finishing');
    expect(profile.internalPotential).toBe(80);
  });

  it('persists the club history summary in the canonical club patch', () => {
    const onUpsert = vi.fn();
    render(<CommunityEntityEditor author="Lia" onUpsert={onUpsert} world={world} />);

    fireEvent.change(screen.getByRole('textbox', { name: 'Nome completo' }), {
      target: { value: 'Clube do Vale' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Sigla' }), {
      target: { value: 'CDV' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Cidade' }), {
      target: { value: 'Vale Verde' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'História do clube' }), {
      target: { value: 'Fundado pela comunidade ferroviária, representa a identidade do vale.' },
    });
    expect(screen.getByLabelText('Prévia da história do clube').textContent).toContain(
      'representa a identidade do vale',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar clube ao mod' }));

    const club = lastChange(onUpsert).patches[0]?.entity.value as {
      historySummary: string | null;
    };
    expect(club.historySummary).toBe(
      'Fundado pela comunidade ferroviária, representa a identidade do vale.',
    );
  });

  it('edits an existing matchday player without losing the active club fallback', () => {
    const onUpsert = vi.fn();
    render(<CommunityEntityEditor author="Lia" onUpsert={onUpsert} world={world} />);

    fireEvent.click(screen.getByRole('tab', { name: 'Jogador' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Editar existente' }));
    const club = screen.getByRole('combobox', { name: 'Clube' }) as HTMLSelectElement;
    expect(club.disabled).toBe(true);
    expect(club.value).toBe('aurora-fc');
    fireEvent.click(screen.getByRole('button', { name: 'Salvar edição do jogador' }));

    const change = lastChange(onUpsert);
    expect(change.operation).toBe('edit');
    expect(change.targetId).toBe('p1');
    expect(change.patches.map((item) => [item.operation, item.entityKind])).toEqual([
      ['replace', 'matchdayPlayer'],
      ['replace', 'playerProfile'],
    ]);
  });

  it('creates a coach with a photo embedded in the community package', async () => {
    const onUpsert = vi.fn();
    render(<CommunityEntityEditor author="Lia" onUpsert={onUpsert} world={world} />);

    fireEvent.click(screen.getByRole('tab', { name: 'Treinador' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Nome completo' }), {
      target: { value: 'Beatriz Lima' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Nome conhecido' }), {
      target: { value: 'Bia Lima' },
    });
    const image = new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], 'bia.png', {
      type: 'image/png',
    });
    fireEvent.change(screen.getByLabelText('Adicionar imagem'), { target: { files: [image] } });
    await waitFor(() => expect(screen.getByText('Trocar imagem')).toBeInstanceOf(HTMLElement));
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar treinador ao mod' }));

    const change = lastChange(onUpsert);
    expect(change.patches).toHaveLength(1);
    expect(change.patches[0]?.entityKind).toBe('coach');
    expect(change.asset).toMatchObject({
      kind: 'coachPortrait',
      entityId: 'community.lia.coach.bia-lima',
      mediaType: 'image/png',
      path: 'assets/coachPortrait/community-lia-coach-bia-lima.png',
    });
    expect(change.asset?.bytes).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  });
});
