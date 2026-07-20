import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { MainMenu } from './MainMenu.js';
import type { CareerSlotSummary } from './types.js';

const lastCareer: CareerSlotSummary = {
  careerId: 'career.test',
  displayName: 'Projeto Aurora',
  managerId: 'coach.test',
  managerName: 'Lia Torres',
  clubId: 'aurora',
  clubName: 'Aurora Futebol Clube',
  clubShortName: 'AUR',
  clubPrimaryColor: '#237a57',
  currentDate: '2026-01-10',
  seasonRef: 'season.2026',
  baseName: 'Base oficial Rivallo',
  basePackageId: 'official.rivallo.foundation',
  basePackageVersion: '1.0.0',
  modCount: 0,
  worldFingerprint: 'fingerprint',
  createdAt: 1,
  updatedAt: 2,
  lastPlayedAt: 3,
  lastContext: {
    route: '/career/career.test',
    activeScreen: 'squad',
    activeTab: null,
    variationId: null,
    scrollTop: 0,
  },
  saveRevision: 1,
  integrity: 'valid',
  saveState: 'saved',
  sportingState: 'awaitingCompetitionInitialization',
  backupCount: 1,
};

const actions = () => ({
  onContinue: vi.fn(),
  onNewCareer: vi.fn(),
  onLoadCareer: vi.fn(),
  onMods: vi.fn(),
  onSettings: vi.fn(),
  onDataEditor: vi.fn(),
  onExit: vi.fn(),
});

describe('MainMenu', () => {
  it('makes Continue dominant and opens only the selected valid slot', async () => {
    const callbacks = actions();
    const user = userEvent.setup();
    render(<MainMenu {...callbacks} lastCareer={lastCareer} opening={false} slotCount={1} />);

    expect(screen.getByRole('heading', { name: 'Sua carreira espera por você.' })).toBeInstanceOf(
      HTMLHeadingElement,
    );
    await user.click(screen.getByRole('button', { name: 'Continuar carreira' }));
    expect(callbacks.onContinue).toHaveBeenCalledWith('career.test');
    expect(callbacks.onNewCareer).not.toHaveBeenCalled();
  });

  it('promotes New Career when no slot exists', async () => {
    const callbacks = actions();
    const user = userEvent.setup();
    render(<MainMenu {...callbacks} lastCareer={null} opening={false} slotCount={0} />);

    expect(screen.getByRole('heading', { name: 'Comece uma história no futebol.' })).toBeInstanceOf(
      HTMLHeadingElement,
    );
    await user.click(screen.getByRole('button', { name: 'Nova carreira' }));
    expect(callbacks.onNewCareer).toHaveBeenCalledOnce();
  });

  it('keeps a corrupt indexed career visible without allowing Continue', () => {
    const callbacks = actions();
    render(
      <MainMenu
        {...callbacks}
        lastCareer={{ ...lastCareer, integrity: 'corrupt' }}
        opening={false}
        slotCount={1}
      />,
    );

    expect(screen.getByText('Última carreira requer atenção')).toBeInstanceOf(HTMLElement);
    expect(
      (screen.getByRole('button', { name: 'Continuar carreira' }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });
});
