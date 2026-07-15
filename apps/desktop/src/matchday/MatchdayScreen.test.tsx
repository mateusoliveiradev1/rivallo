import '@testing-library/dom';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
].map(([id, name, shortName, position, rating, selected]) => ({
  id: String(id),
  name: String(name),
  shortName: String(shortName),
  position: position as Player['position'],
  age: 24,
  rating: Number(rating),
  condition: 95,
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
    clientMock.loadMatchday.mockReset().mockResolvedValue(state);
    clientMock.saveMatchdayLineup.mockReset().mockResolvedValue(state);
    clientMock.playNextMatch.mockReset().mockResolvedValue(playedState);
  });

  it('loads the real squad workspace and exposes eleven selected players', async () => {
    render(<MatchdayScreen serviceOwnership="owned" />);
    expect(
      await screen.findByRole('heading', { name: 'Prepare o Aurora para a rodada 1' }),
    ).toBeInstanceOf(HTMLHeadingElement);
    expect(screen.getByText('11/11 jogadores selecionados')).toBeInstanceOf(HTMLElement);
    expect(
      (screen.getByRole('button', { name: 'Jogar partida' }) as HTMLButtonElement).disabled,
    ).toBe(false);
    expect(screen.getAllByRole('checkbox')).toHaveLength(12);
  });

  it('lets the manager replace the goalkeeper and save a valid XI', async () => {
    render(<MatchdayScreen serviceOwnership="owned" />);
    await screen.findByText('Elenco disponível');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Retirar Caio Brandão' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Escalar Ícaro Reis' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar escalação' }));
    await waitFor(() => expect(clientMock.saveMatchdayLineup).toHaveBeenCalledOnce());
    const [selectedIds] = clientMock.saveMatchdayLineup.mock.calls[0] as [string[]];
    expect(selectedIds).toHaveLength(11);
    expect(selectedIds).toContain('p12');
    expect(selectedIds).not.toContain('p1');
  });

  it('plays through Rust and presents the persisted match result', async () => {
    render(<MatchdayScreen serviceOwnership="owned" />);
    await screen.findByText('Elenco disponível');
    fireEvent.click(screen.getByRole('button', { name: 'Jogar partida' }));
    expect(await screen.findByRole('dialog', { name: '2 × 0' })).toBeInstanceOf(HTMLElement);
    expect(screen.getByText('Vitória · Rodada 1')).toBeInstanceOf(HTMLElement);
    expect(clientMock.saveMatchdayLineup).toHaveBeenCalledOnce();
    expect(clientMock.playNextMatch).toHaveBeenCalledOnce();
  });
});
