import '@testing-library/dom';

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MatchdayScreen } from './MatchdayScreen.js';
import type { MatchdayState, Player } from './types.js';

const clientMock = vi.hoisted(() => ({
  loadMatchday: vi.fn(),
  saveMatchdayLineup: vi.fn(),
  playNextMatch: vi.fn(),
}));

vi.mock('./client.js', () => clientMock);

const players: Player[] = [
  ['p1', 'Caio Brandão', 'C. Brandão', 'GK', 76, true],
  ['p2', 'Davi Moura', 'D. Moura', 'RB', 73, true],
  ['p3', 'Iago Serpa', 'I. Serpa', 'CB', 78, true],
  ['p4', 'Breno Vidal', 'B. Vidal', 'CB', 75, true],
  ['p5', 'Nilo Azevedo', 'N. Azevedo', 'LB', 74, true],
  ['p6', 'Tomás Paiva', 'T. Paiva', 'DM', 79, true],
  ['p7', 'Luan Seixas', 'L. Seixas', 'CM', 77, true],
  ['p8', 'Ravi Monteiro', 'R. Monteiro', 'CM', 76, true],
  ['p9', 'Enzo Falcão', 'E. Falcão', 'RW', 78, true],
  ['p10', 'Murilo Braga', 'M. Braga', 'ST', 81, true],
  ['p11', 'Noah Teles', 'N. Teles', 'LW', 77, true],
  ['p12', 'Ícaro Reis', 'Í. Reis', 'GK', 68, false],
].map(([id, name, shortName, position, rating, selected], index): Player => ({
  id: String(id),
  name: String(name),
  shortName: String(shortName),
  shirtNumber: [1, 22, 3, 4, 16, 5, 8, 10, 7, 9, 11, 12][index] ?? index + 1,
  position: position as Player['position'],
  age: 24,
  nationality: 'BRA',
  heightCm: 180,
  preferredFoot: 'right',
  squadRole: selected ? 'firstTeam' : 'prospect',
  rating: Number(rating),
  potentialRating: Number(rating) + 3,
  matchFitness: 92,
  morale: 80,
  condition: 95,
  appearances: selected ? 14 : 2,
  goals: position === 'ST' ? 8 : 0,
  assists: position === 'CM' ? 4 : 1,
  averageRating: 7.12,
  selected: Boolean(selected),
}));

const state: MatchdayState = {
  club: {
    id: 'aurora',
    name: 'Aurora Futebol Clube',
    shortName: 'AUR',
    city: 'Porto Claro',
    primaryColor: '#35c88a',
  },
  opponent: {
    id: 'ferroviario',
    name: 'Ferroviário do Vale',
    shortName: 'FDV',
    city: 'Vale do Norte',
    primaryColor: '#d18a42',
  },
  round: 1,
  players,
  formation: '4-3-3',
  approach: 'balanced',
  record: {
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
  },
  lastResult: null,
};

const playedState: MatchdayState = {
  ...state,
  round: 2,
  record: { ...state.record, played: 1, wins: 1, goalsFor: 2, points: 3 },
  lastResult: {
    round: 1,
    homeClub: state.club.name,
    awayClub: state.opponent.name,
    homeGoals: 2,
    awayGoals: 0,
    possession: 58,
    shots: 12,
    shotsAgainst: 6,
    events: [
      { minute: 14, kind: 'goal', text: 'Gol do Aurora.', forUserClub: true },
      { minute: 90, kind: 'fullTime', text: 'Fim de jogo.', forUserClub: true },
    ],
  },
};

describe('MatchdayScreen', () => {
  beforeEach(() => {
    window.localStorage.clear();
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1920 });
    clientMock.loadMatchday.mockReset().mockResolvedValue(state);
    clientMock.saveMatchdayLineup.mockReset().mockResolvedValue(state);
    clientMock.playNextMatch.mockReset().mockResolvedValue(playedState);
  });

  it('loads the real squad workspace and exposes eleven selected players', async () => {
    render(<MatchdayScreen serviceOwnership="owned" />);
    expect(await screen.findByRole('heading', { name: 'Visão geral do elenco' })).toBeInstanceOf(
      HTMLHeadingElement,
    );
    expect(
      within(screen.getByRole('table')).getAllByRole('button', { name: /Retirar/u }),
    ).toHaveLength(11);
    expect((screen.getByRole('button', { name: 'Continuar' }) as HTMLButtonElement).disabled).toBe(
      false,
    );
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    expect(
      within(screen.getByRole('table')).getAllByRole('button', { name: /Retirar|Escalar/u }),
    ).toHaveLength(12);
    expect(within(screen.getByRole('table')).getAllByLabelText('Brasil, código BRA')).toHaveLength(
      12,
    );
    expect(
      within(screen.getByLabelText('Resumo de Caio Brandão')).getByLabelText('Brasil, código BRA'),
    ).toBeInstanceOf(HTMLElement);
  });

  it('keeps an unknown nationality readable in the real table and dossier', async () => {
    clientMock.loadMatchday.mockResolvedValue({
      ...state,
      players: state.players.map((player, index) =>
        index === 0 ? { ...player, nationality: 'código-corrompido-comprido' } : player,
      ),
    });

    render(<MatchdayScreen serviceOwnership="owned" />);
    await screen.findByRole('heading', { name: 'Visão geral do elenco' });

    const playerRow = screen.getByRole('row', { name: /Caio Brandão/u });
    expect(within(playerRow).getByLabelText('Nacionalidade não identificada').textContent).toBe(
      '—',
    );
    expect(playerRow.querySelector('.rv-nationality__flag')).toBeNull();
    expect(
      within(screen.getByLabelText('Resumo de Caio Brandão')).getByLabelText(
        'Nacionalidade não identificada',
      ).textContent,
    ).toBe('—');
  });

  it('lets the manager replace the goalkeeper and save a valid XI', async () => {
    render(<MatchdayScreen serviceOwnership="owned" />);
    await screen.findByRole('heading', { name: '12 jogadores' });
    fireEvent.click(screen.getByRole('button', { name: 'Retirar Caio Brandão' }));
    fireEvent.click(screen.getByRole('button', { name: 'Escalar Ícaro Reis' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar escalação' }));
    await waitFor(() => expect(clientMock.saveMatchdayLineup).toHaveBeenCalledOnce());
    const [selectedIds] = clientMock.saveMatchdayLineup.mock.calls[0] as [string[]];
    expect(selectedIds).toHaveLength(11);
    expect(selectedIds).toContain('p12');
    expect(selectedIds).not.toContain('p1');
  });

  it('plays through Rust and presents the persisted match result', async () => {
    render(<MatchdayScreen serviceOwnership="owned" />);
    await screen.findByRole('heading', { name: '12 jogadores' });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(await screen.findByRole('dialog', { name: '2 × 0' })).toBeInstanceOf(HTMLElement);
    expect(screen.getByText('Vitória · Rodada 1')).toBeInstanceOf(HTMLElement);
    expect(clientMock.saveMatchdayLineup).toHaveBeenCalledOnce();
    expect(clientMock.playNextMatch).toHaveBeenCalledOnce();
  });

  it('collapses the navigation and persists real interface preferences', async () => {
    render(<MatchdayScreen serviceOwnership="owned" />);
    await screen.findByRole('heading', { name: 'Visão geral do elenco' });

    fireEvent.click(screen.getByRole('button', { name: 'Recolher navegação' }));
    expect(screen.getByRole('button', { name: 'Expandir navegação' })).toBeInstanceOf(
      HTMLButtonElement,
    );
    fireEvent.click(screen.getByRole('button', { name: /Alterar densidade da tabela/u }));
    fireEvent.click(screen.getByRole('button', { name: 'Densidade confortável' }));

    await waitFor(() => {
      const stored = window.localStorage.getItem('rivallo.squad-ui.v4');
      expect(stored).toContain('"sidebarCollapsed":true');
      expect(stored).toContain('"density":"comfortable"');
    });
  });

  it('restores an intentionally minimal optional-column view without treating it as corrupt', async () => {
    window.localStorage.setItem(
      'rivallo.squad-ui.v4',
      JSON.stringify({ density: 'standard', visibleColumns: [] }),
    );

    render(<MatchdayScreen serviceOwnership="owned" />);
    await screen.findByRole('heading', { name: 'Visão geral do elenco' });

    expect(screen.queryByRole('button', { name: /Ordenar por idade/u })).toBeNull();
    expect(
      screen.getByRole('button', { name: /Alterar densidade da tabela: Padrão/u }),
    ).toBeInstanceOf(HTMLButtonElement);

    fireEvent.click(screen.getByRole('button', { name: 'Configurar colunas' }));
    expect(screen.getByRole('button', { name: /Idade.*Oculta/u })).toBeInstanceOf(
      HTMLButtonElement,
    );
  });

  it('migrates valid legacy column identifiers without restoring unknown columns', async () => {
    window.localStorage.setItem(
      'rivallo.squad-ui.v3',
      JSON.stringify({ density: 'standard', visibleColumns: ['age', 'removedColumn'] }),
    );

    render(<MatchdayScreen serviceOwnership="owned" />);
    await screen.findByRole('heading', { name: 'Visão geral do elenco' });

    expect(screen.getByRole('button', { name: /Ordenar por idade/u })).toBeInstanceOf(
      HTMLButtonElement,
    );
    expect(screen.queryByRole('button', { name: /Ordenar por potencial/u })).toBeNull();
    await waitFor(() =>
      expect(window.localStorage.getItem('rivallo.squad-ui.v4')).toContain(
        '"visibleColumns":["age"]',
      ),
    );
  });

  it('restores default columns when a legacy view contains only unknown identifiers', async () => {
    window.localStorage.setItem(
      'rivallo.squad-ui.v3',
      JSON.stringify({ density: 'standard', visibleColumns: ['removedColumn'] }),
    );

    render(<MatchdayScreen serviceOwnership="owned" />);
    await screen.findByRole('heading', { name: 'Visão geral do elenco' });

    expect(screen.getByRole('button', { name: /Ordenar por idade/u })).toBeInstanceOf(
      HTMLButtonElement,
    );
    expect(screen.getByRole('button', { name: /Ordenar por potencial/u })).toBeInstanceOf(
      HTMLButtonElement,
    );
    await waitFor(() => {
      const stored = JSON.parse(window.localStorage.getItem('rivallo.squad-ui.v4') ?? '{}') as {
        visibleColumns?: unknown[];
      };
      expect(stored.visibleColumns?.length).toBeGreaterThan(0);
    });
  });

  it('closes table view popovers without stale layers and restores focus across repeated use', async () => {
    const user = userEvent.setup();
    render(<MatchdayScreen serviceOwnership="owned" />);
    await screen.findByRole('heading', { name: 'Visão geral do elenco' });

    let densityTrigger = screen.getByRole('button', { name: /Alterar densidade da tabela/u });
    for (let cycle = 0; cycle < 3; cycle += 1) {
      await user.click(densityTrigger);
      expect(screen.getByRole('dialog', { name: 'Densidade do elenco' })).toBeInstanceOf(
        HTMLElement,
      );
      await user.keyboard('{Escape}');
      await waitFor(() =>
        expect(screen.queryByRole('dialog', { name: 'Densidade do elenco' })).toBeNull(),
      );
      expect(document.activeElement).toBe(densityTrigger);
    }

    await user.click(densityTrigger);
    await user.click(
      within(screen.getByRole('dialog', { name: 'Densidade do elenco' })).getByRole('button', {
        name: 'Fechar contexto',
      }),
    );
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Densidade do elenco' })).toBeNull(),
    );
    expect(document.activeElement).toBe(densityTrigger);

    await user.click(densityTrigger);
    await user.click(screen.getByRole('button', { name: 'Densidade confortável' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Densidade do elenco' })).toBeNull(),
    );
    densityTrigger = screen.getByRole('button', { name: /Alterar densidade da tabela/u });
    expect(densityTrigger.getAttribute('aria-label')).toContain('Confortável');
    expect(document.activeElement).toBe(densityTrigger);

    const columnsTrigger = screen.getByRole('button', { name: 'Configurar colunas' });
    await user.click(columnsTrigger);
    const columnsPopover = screen.getByRole('dialog', { name: 'Colunas visíveis' });
    await user.click(within(columnsPopover).getByRole('button', { name: /Idade.*Visível/u }));
    expect(screen.getByRole('dialog', { name: 'Colunas visíveis' })).toBeInstanceOf(HTMLElement);
    await user.keyboard('{Escape}');
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Colunas visíveis' })).toBeNull(),
    );
    expect(document.activeElement).toBe(columnsTrigger);

    await user.click(columnsTrigger);
    await user.click(screen.getByRole('heading', { name: '12 jogadores' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Colunas visíveis' })).toBeNull(),
    );
    expect(document.activeElement).toBe(columnsTrigger);
    expect(document.body.style.overflow).toBe('');
    expect(document.body.style.pointerEvents).toBe('');
    expect(document.querySelectorAll('.rv-popover')).toHaveLength(0);
  });

  it('opens Tactics as a dedicated screen and substitutes through the accessible field flow', async () => {
    render(<MatchdayScreen serviceOwnership="owned" />);
    await screen.findByRole('heading', { name: 'Visão geral do elenco' });

    fireEvent.click(screen.getByRole('button', { name: 'Táticas' }));
    expect(screen.getByRole('heading', { name: 'Plano de jogo' })).toBeInstanceOf(
      HTMLHeadingElement,
    );
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.getByLabelText('Escalação no 4-3-3')).toBeInstanceOf(HTMLElement);

    fireEvent.click(screen.getByRole('button', { name: 'Selecionar reserva Ícaro Reis' }));
    fireEvent.click(screen.getByRole('button', { name: /^GOL: Caio Brandão/u }));
    expect(screen.getByRole('button', { name: /^GOL: Ícaro Reis/u })).toBeInstanceOf(
      HTMLButtonElement,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Salvar plano' }));
    await waitFor(() => expect(clientMock.saveMatchdayLineup).toHaveBeenCalledOnce());
    const [selectedIds] = clientMock.saveMatchdayLineup.mock.calls[0] as [string[]];
    expect(selectedIds).toContain('p12');
    expect(selectedIds).not.toContain('p1');
  });
});
