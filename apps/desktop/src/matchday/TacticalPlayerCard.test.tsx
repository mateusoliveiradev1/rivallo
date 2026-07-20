import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TacticalPlayerCardContent, tacticalPrimaryMetric } from './TacticalPlayerCard.js';
import type { PitchMode } from './matchday-ui.js';
import type { Player } from './types.js';

const player: Player = {
  id: 'p-card',
  name: 'Alexandre Constantinopolitano de Oliveira',
  shortName: 'A. Constantinopolitano',
  shirtNumber: 100,
  position: 'CM',
  age: 24,
  nationality: 'BRA',
  heightCm: 181,
  preferredFoot: 'right',
  squadRole: 'firstTeam',
  rating: 100,
  potentialRating: 104,
  matchFitness: 91,
  morale: 82,
  condition: 73,
  appearances: 10,
  goals: 2,
  assists: 4,
  averageRating: 7.1,
  selected: true,
};

const renderCard = (mode: PitchMode, contextualRating?: string) => {
  const metric = tacticalPrimaryMetric({
    mode,
    player,
    familiarity: 64,
    contextualRating,
  });
  const view = render(
    <button data-primary-metric={metric.kind} type="button">
      <TacticalPlayerCardContent
        displayName={player.shortName}
        metric={metric}
        player={player}
        playerIndex={0}
        positionLabel="MC"
      />
    </button>,
  );
  return { ...view, metric };
};

describe('TacticalPlayerCardContent', () => {
  it('keeps portrait, shirt number and primary metric in dedicated sibling regions', () => {
    const { container } = renderCard('roles');
    const portrait = container.querySelector('[data-card-region="portrait"]');
    const shirt = container.querySelector('[data-card-region="shirt-number"]');
    const metric = container.querySelector('[data-card-region="primary-metric"]');

    expect(portrait).toBeInstanceOf(HTMLElement);
    expect(shirt).toBeInstanceOf(HTMLElement);
    expect(metric).toBeInstanceOf(HTMLElement);
    expect(portrait?.contains(metric)).toBe(false);
    expect(shirt?.contains(metric)).toBe(false);
    expect(screen.getByLabelText('Camisa 100')).toBeInstanceOf(HTMLElement);
    expect(screen.getByLabelText('OVR 100')).toBeInstanceOf(HTMLElement);
  });

  it.each([
    ['roles', undefined, 'ability', 'OVR 100'],
    ['context', '77', 'context', 'No plano atual: 77'],
    ['familiarity', undefined, 'familiarity', 'Familiaridade com o plano: 64%'],
    ['condition', undefined, 'condition', 'Condição física: 73%'],
  ] as const)('renders one semantic primary metric in %s mode', (mode, context, kind, label) => {
    const { container } = renderCard(mode, context);

    expect(container.querySelectorAll('[data-card-region="primary-metric"]')).toHaveLength(1);
    expect(
      container.querySelector('[data-primary-metric]')?.getAttribute('data-primary-metric'),
    ).toBe(kind);
    expect(screen.getByLabelText(label)).toBeInstanceOf(HTMLElement);
    expect(screen.queryByText(String(player.potentialRating))).toBeNull();
  });

  it('preserves the full long name as a tooltip when the visible name truncates', () => {
    renderCard('roles');
    expect(screen.getByTitle(player.name).textContent).toBe(player.shortName);
  });
});
