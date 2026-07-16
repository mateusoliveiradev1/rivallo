import '@testing-library/dom';

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { describeTableViewRejection, MatchdayScreen } from './MatchdayScreen.js';
import type {
  ImportLegacyTablePreferencesRequest,
  LoadTableViewsOutcome,
  SavedTableView,
  SaveTableViewsOutcome,
  SaveTableViewsRequest,
  TableViewRepositoryState,
} from './client.js';
import { SavedViewSelector } from './SavedViewSelector.js';
import { createSquadDurableFilter, SQUAD_SYSTEM_VIEW } from './squad-table-schema.js';
import type { MatchdayState, Player } from './types.js';

const clientMock = vi.hoisted(() => ({
  loadMatchday: vi.fn(),
  saveMatchdayLineup: vi.fn(),
  playNextMatch: vi.fn(),
  loadTableViews: vi.fn(),
  saveTableViews: vi.fn(),
  importLegacyTablePreferences: vi.fn(),
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

const tableRepositoryState = (
  activeState = structuredClone(SQUAD_SYSTEM_VIEW),
): TableViewRepositoryState => ({
  metadata: { envelopeVersion: 1, revision: 0 },
  tableId: 'squad.primary',
  schemaVersion: 1,
  ownerScope: 'local-fixed',
  activeViewId: activeState.viewId,
  defaultViewId: SQUAD_SYSTEM_VIEW.viewId,
  views: [
    {
      mutability: activeState.provenance === 'user-owned' ? 'mutable' : 'immutable',
      state: activeState,
    },
  ],
  legacyImportReceipts: [],
});

const lifecycleSystemView = (): SavedTableView => ({
  mutability: 'immutable',
  state: {
    ...structuredClone(SQUAD_SYSTEM_VIEW),
    label: 'Padrão do elenco',
  },
});

const lifecycleUserView = (
  viewId: string,
  label: string,
  density: SavedTableView['state']['density'] = 'standard',
): SavedTableView => ({
  mutability: 'mutable',
  state: {
    ...structuredClone(SQUAD_SYSTEM_VIEW),
    viewId,
    baselineViewId: SQUAD_SYSTEM_VIEW.viewId,
    provenance: 'user-owned',
    label,
    density,
  },
});

const lifecycleSharedView = (): SavedTableView => ({
  mutability: 'read-only',
  state: {
    ...structuredClone(SQUAD_SYSTEM_VIEW),
    viewId: 'squad.shared.staff',
    baselineViewId: SQUAD_SYSTEM_VIEW.viewId,
    provenance: 'shared-read-only',
    label: 'Leitura da comissão',
    density: 'comfortable',
  },
});

const lifecycleRepositoryState = (
  activeViewId = 'squad.user.analysis',
  defaultViewId = SQUAD_SYSTEM_VIEW.viewId,
): TableViewRepositoryState => ({
  metadata: { envelopeVersion: 1, revision: 0 },
  tableId: 'squad.primary',
  schemaVersion: 1,
  ownerScope: 'local-fixed',
  activeViewId,
  defaultViewId,
  views: [
    lifecycleSystemView(),
    lifecycleUserView('squad.user.analysis', 'Minha análise'),
    lifecycleUserView('squad.user.rotation', 'Rotação do elenco', 'compact'),
    lifecycleSharedView(),
  ],
  legacyImportReceipts: [],
});

const deferred = <Value,>() => {
  let resolve!: (value: Value | PromiseLike<Value>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<Value>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
};

const confirmedTableViewSave = (
  candidate: TableViewRepositoryState,
): Extract<SaveTableViewsOutcome, { readonly status: 'confirmed' }> => {
  const confirmedState = {
    ...candidate,
    metadata: {
      ...candidate.metadata,
      revision: candidate.metadata.revision + 1,
    },
  };
  return {
    status: 'confirmed',
    state: confirmedState,
    receipt: {
      tableId: 'squad.primary',
      schemaVersion: 1,
      ownerScope: 'local-fixed',
      acceptedRevision: confirmedState.metadata.revision,
    },
  };
};

const expectOnlyNonTablePreferences = (storageKey: string): void => {
  const raw = window.localStorage.getItem(storageKey);
  expect(raw).not.toBeNull();

  const stored = JSON.parse(raw ?? '{}') as Record<string, unknown>;
  expect(stored).toMatchObject({
    activeScreen: 'squad',
    pitchMode: 'roles',
    showPlayerDetails: true,
    sidebarCollapsed: false,
  });
  expect(stored).not.toHaveProperty('density');
  expect(stored).not.toHaveProperty('visibleColumns');
};

const renderMatchdayWithViews = async (repository: TableViewRepositoryState) => {
  const user = userEvent.setup();
  clientMock.loadTableViews.mockResolvedValue({ status: 'loaded', state: repository });
  render(<MatchdayScreen serviceOwnership="owned" />);
  await screen.findByRole('heading', { name: 'Visão geral do elenco' });
  await screen.findByRole('button', { name: /Visualização da tabela:/u });
  return user;
};

const openSavedViewSelector = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: /Visualização da tabela:/u }));
  return screen.getByRole('dialog', { name: 'Visualização da tabela' });
};

const changeDensity = async (
  user: ReturnType<typeof userEvent.setup>,
  density: 'compacta' | 'padrão' | 'confortável',
) => {
  await user.click(screen.getByRole('button', { name: /Alterar densidade da tabela/u }));
  await user.click(screen.getByRole('button', { name: `Densidade ${density}` }));
};

describe('MatchdayScreen', () => {
  beforeEach(() => {
    window.localStorage.clear();
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1920 });
    clientMock.loadMatchday.mockReset().mockResolvedValue(state);
    clientMock.saveMatchdayLineup.mockReset().mockResolvedValue(state);
    clientMock.playNextMatch.mockReset().mockResolvedValue(playedState);
    clientMock.loadTableViews.mockReset().mockResolvedValue({
      status: 'loaded',
      state: tableRepositoryState(),
    });
    clientMock.saveTableViews
      .mockReset()
      .mockImplementation(async ({ state: candidate }: SaveTableViewsRequest) => {
        const confirmedState = {
          ...candidate,
          metadata: {
            ...candidate.metadata,
            revision: candidate.metadata.revision + 1,
          },
        };
        return {
          status: 'confirmed',
          state: confirmedState,
          receipt: {
            tableId: 'squad.primary',
            schemaVersion: 1,
            ownerScope: 'local-fixed',
            acceptedRevision: confirmedState.metadata.revision,
          },
        };
      });
    clientMock.importLegacyTablePreferences
      .mockReset()
      .mockImplementation(async (request: ImportLegacyTablePreferencesRequest) => {
        const receipt = {
          sourceVersion: request.sourceVersion,
          sourceFingerprint: request.sourceFingerprint,
          tableId: 'squad.primary' as const,
          schemaVersion: 1 as const,
          ownerScope: 'local-fixed' as const,
          importedViewId: request.state.viewId,
          acceptedRevision: 1,
        };
        return {
          status: 'confirmed',
          state: {
            ...tableRepositoryState(),
            metadata: { envelopeVersion: 1, revision: 1 },
            activeViewId: request.state.viewId,
            views: [
              ...tableRepositoryState().views,
              { mutability: 'mutable', state: request.state },
            ],
            legacyImportReceipts: [receipt],
          },
          receipt,
          imported: true,
        };
      });
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

  it('renders durable table descriptors while keeping the player-name query transient', async () => {
    const durableView = {
      ...structuredClone(SQUAD_SYSTEM_VIEW),
      density: 'standard',
      columns: SQUAD_SYSTEM_VIEW.columns.map((column) =>
        column.columnId === 'age' ? { ...column, visible: false } : { ...column },
      ),
      sort: [{ columnId: 'age', direction: 'asc', nulls: 'last' }] as const,
      filter: createSquadDurableFilter({
        lineup: 'selected',
        sector: 'midfielders',
        status: 'ready',
        positions: ['CM'],
      }),
    };
    clientMock.loadTableViews.mockResolvedValue({
      status: 'loaded',
      state: tableRepositoryState(durableView),
    });

    render(<MatchdayScreen serviceOwnership="owned" />);

    await screen.findByRole('heading', { name: 'Visão geral do elenco' });
    await waitFor(() =>
      expect(screen.getAllByRole('heading').map((heading) => heading.textContent)).toContain(
        '2 jogadores',
      ),
    );
    expect(clientMock.loadTableViews).toHaveBeenCalledOnce();
    expect((screen.getByLabelText('Filtro rápido') as HTMLSelectElement).value).toBe('selected');
    expect((screen.getByLabelText('Filtrar por setor') as HTMLSelectElement).value).toBe(
      'midfielders',
    );
    expect((screen.getByLabelText('Filtrar por condição') as HTMLSelectElement).value).toBe(
      'ready',
    );
    expect((screen.getByLabelText('Filtrar por posição') as HTMLSelectElement).value).toBe('CM');
    expect((screen.getByLabelText('Ordenar elenco') as HTMLSelectElement).value).toBe('age');
    expect(
      screen.getByRole('button', { name: /Alterar densidade da tabela: Padrão/u }),
    ).toBeInstanceOf(HTMLButtonElement);
    expect(screen.queryByRole('button', { name: /Ordenar por Idade/u })).toBeNull();

    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar jogador no elenco' }), {
      target: { value: 'Luan' },
    });

    expect(await screen.findByRole('heading', { name: '1 jogadores' })).toBeInstanceOf(
      HTMLHeadingElement,
    );
    expect(clientMock.saveTableViews).not.toHaveBeenCalled();
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
      expect(stored).not.toContain('"density"');
      expect(stored).not.toContain('"visibleColumns"');
    });
  });

  it('restores an intentionally minimal optional-column view without treating it as corrupt', async () => {
    window.localStorage.setItem(
      'rivallo.squad-ui.v4',
      JSON.stringify({ density: 'standard', visibleColumns: [] }),
    );

    render(<MatchdayScreen serviceOwnership="owned" />);
    await screen.findByRole('heading', { name: 'Visão geral do elenco' });

    expect(screen.queryByRole('button', { name: /Ordenar por Idade/u })).toBeNull();
    expect(
      screen.getByRole('button', { name: /Alterar densidade da tabela: Padrão/u }),
    ).toBeInstanceOf(HTMLButtonElement);

    fireEvent.click(screen.getByRole('button', { name: 'Configurar tabela' }));
    expect(screen.getByRole('button', { name: 'Mostrar Idade' })).toBeInstanceOf(HTMLButtonElement);
    await waitFor(() => expect(clientMock.importLegacyTablePreferences).toHaveBeenCalledOnce());
    expectOnlyNonTablePreferences('rivallo.squad-ui.v4');
  });

  it('migrates valid legacy column identifiers without restoring unknown columns', async () => {
    window.localStorage.setItem(
      'rivallo.squad-ui.v3',
      JSON.stringify({ density: 'standard', visibleColumns: ['age', 'removedColumn'] }),
    );

    render(<MatchdayScreen serviceOwnership="owned" />);
    await screen.findByRole('heading', { name: 'Visão geral do elenco' });

    expect(screen.getByRole('button', { name: /Ordenar por Idade/u })).toBeInstanceOf(
      HTMLButtonElement,
    );
    expect(screen.queryByRole('button', { name: /Ordenar por PA/u })).toBeNull();
    await waitFor(() => expect(clientMock.importLegacyTablePreferences).toHaveBeenCalledOnce());
    expect(window.localStorage.getItem('rivallo.squad-ui.v3')).toBeNull();
    expectOnlyNonTablePreferences('rivallo.squad-ui.v4');
  });

  it('restores default columns when a legacy view contains only unknown identifiers', async () => {
    window.localStorage.setItem(
      'rivallo.squad-ui.v3',
      JSON.stringify({ density: 'standard', visibleColumns: ['removedColumn'] }),
    );

    render(<MatchdayScreen serviceOwnership="owned" />);
    await screen.findByRole('heading', { name: 'Visão geral do elenco' });

    expect(screen.getByRole('button', { name: /Ordenar por Idade/u })).toBeInstanceOf(
      HTMLButtonElement,
    );
    expect(screen.getByRole('button', { name: /Ordenar por PA/u })).toBeInstanceOf(
      HTMLButtonElement,
    );
    await waitFor(() => expect(clientMock.loadTableViews).toHaveBeenCalledOnce());
    expect(clientMock.importLegacyTablePreferences).not.toHaveBeenCalled();
    expect(window.localStorage.getItem('rivallo.squad-ui.v3')).toContain('"removedColumn"');
    expect(window.localStorage.getItem('rivallo.squad-ui.v4')).toBeNull();
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

    const columnsTrigger = screen.getByRole('button', { name: 'Configurar tabela' });
    await user.click(columnsTrigger);
    const columnsPopover = screen.getByRole('dialog', { name: 'Configurar tabela' });
    await user.click(within(columnsPopover).getByRole('button', { name: 'Ocultar Idade' }));
    expect(screen.getByRole('dialog', { name: 'Configurar tabela' })).toBeInstanceOf(HTMLElement);
    await user.keyboard('{Escape}');
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Configurar tabela' })).toBeNull(),
    );
    expect(document.activeElement).toBe(columnsTrigger);

    await user.click(columnsTrigger);
    await user.click(screen.getByRole('heading', { name: '12 jogadores' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Configurar tabela' })).toBeNull(),
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

  it('activates validated system, owned and read-only views with confirmed focus and announcements', async () => {
    const repository = lifecycleRepositoryState(SQUAD_SYSTEM_VIEW.viewId);
    const user = await renderMatchdayWithViews(repository);

    let selector = await openSavedViewSelector(user);
    expect(within(selector).queryByRole('button', { name: 'Renomear visualização' })).toBeNull();
    expect(within(selector).queryByRole('button', { name: 'Excluir visualização' })).toBeNull();
    await user.click(
      within(selector).getByRole('button', { name: /Abrir visualização Minha análise/u }),
    );

    await waitFor(() => expect(clientMock.saveTableViews).toHaveBeenCalledOnce());
    expect(
      screen.getByRole('button', { name: 'Visualização da tabela: Minha análise' }),
    ).toBeInstanceOf(HTMLButtonElement);
    expect(screen.getByText('Visualização “Minha análise” aberta.')).toBeInstanceOf(HTMLElement);
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Visualização da tabela: Minha análise' }),
    );

    selector = await openSavedViewSelector(user);
    expect(within(selector).getByRole('button', { name: 'Renomear visualização' })).toBeInstanceOf(
      HTMLButtonElement,
    );
    await user.click(
      within(selector).getByRole('button', { name: /Abrir visualização Leitura da comissão/u }),
    );
    await waitFor(() => expect(clientMock.saveTableViews).toHaveBeenCalledTimes(2));

    selector = await openSavedViewSelector(user);
    expect(within(selector).getByText('Somente leitura')).toBeInstanceOf(HTMLElement);
    expect(within(selector).getByRole('button', { name: 'Duplicar visualização' })).toBeInstanceOf(
      HTMLButtonElement,
    );
    expect(within(selector).queryByRole('button', { name: 'Renomear visualização' })).toBeNull();
    expect(within(selector).queryByRole('button', { name: 'Excluir visualização' })).toBeNull();
    expect(within(selector).queryByRole('button', { name: 'Salvar visualização' })).toBeNull();
  });

  it('creates, renames and sets a stable owned view as default through bounded name dialogs', async () => {
    const user = await renderMatchdayWithViews(lifecycleRepositoryState());

    let selector = await openSavedViewSelector(user);
    await user.click(within(selector).getByRole('button', { name: 'Criar visualização' }));
    let dialog = screen.getByRole('dialog', { name: 'Criar visualização' });
    const createInput = within(dialog).getByRole('textbox', { name: 'Nome da visualização' });
    expect(document.activeElement).toBe(createInput);

    await user.type(createInput, '   ');
    await user.click(within(dialog).getByRole('button', { name: 'Criar visualização' }));
    expect(within(dialog).getByText('Digite um nome para a visualização.')).toBeInstanceOf(
      HTMLElement,
    );
    expect(clientMock.saveTableViews).not.toHaveBeenCalled();

    await user.clear(createInput);
    await user.type(createInput, 'Observação da rodada');
    await user.click(within(dialog).getByRole('button', { name: 'Criar visualização' }));
    await waitFor(() =>
      expect(
        screen.getByRole('button', {
          name: 'Visualização da tabela: Observação da rodada',
        }),
      ).toBeInstanceOf(HTMLButtonElement),
    );

    const createdCandidate = (
      clientMock.saveTableViews.mock.calls.at(-1)?.[0] as SaveTableViewsRequest
    ).state;
    const createdView = createdCandidate.views.find(
      ({ state: viewState }) => viewState.label === 'Observação da rodada',
    );
    expect(createdView?.state.provenance).toBe('user-owned');
    expect(createdView?.mutability).toBe('mutable');
    const createdViewId = createdView?.state.viewId;
    expect(createdViewId).toMatch(/^squad\.user\./u);

    selector = await openSavedViewSelector(user);
    await user.click(within(selector).getByRole('button', { name: 'Renomear visualização' }));
    dialog = screen.getByRole('dialog', { name: 'Renomear visualização' });
    const renameInput = within(dialog).getByRole('textbox', { name: 'Nome da visualização' });
    expect((renameInput as HTMLInputElement).value).toBe('Observação da rodada');
    await user.clear(renameInput);
    await user.type(renameInput, 'Plano da rodada');
    await user.click(within(dialog).getByRole('button', { name: 'Renomear visualização' }));

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Visualização da tabela: Plano da rodada' }),
      ).toBeInstanceOf(HTMLButtonElement),
    );
    const renamedCandidate = (
      clientMock.saveTableViews.mock.calls.at(-1)?.[0] as SaveTableViewsRequest
    ).state;
    expect(
      renamedCandidate.views.find(({ state: viewState }) => viewState.label === 'Plano da rodada')
        ?.state.viewId,
    ).toBe(createdViewId);

    selector = await openSavedViewSelector(user);
    await user.click(
      within(selector).getByRole('button', { name: 'Definir como visualização padrão' }),
    );
    await waitFor(() =>
      expect(
        (clientMock.saveTableViews.mock.calls.at(-1)?.[0] as SaveTableViewsRequest).state
          .defaultViewId,
      ).toBe(createdViewId),
    );
    expect(screen.getByText('“Plano da rodada” definida como visualização padrão.')).toBeInstanceOf(
      HTMLElement,
    );
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Visualização da tabela: Plano da rodada' }),
    );
  });

  it('duplicates and safely deletes an owned view after a keep-first confirmation', async () => {
    const user = await renderMatchdayWithViews(lifecycleRepositoryState());

    let selector = await openSavedViewSelector(user);
    await user.click(within(selector).getByRole('button', { name: 'Duplicar visualização' }));
    let dialog = screen.getByRole('dialog', { name: 'Duplicar visualização' });
    const duplicateInput = within(dialog).getByRole('textbox', { name: 'Nome da visualização' });
    expect((duplicateInput as HTMLInputElement).value).toBe('Minha análise — cópia');
    await user.clear(duplicateInput);
    await user.type(duplicateInput, 'Análise duplicada');
    await user.click(within(dialog).getByRole('button', { name: 'Duplicar visualização' }));

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Visualização da tabela: Análise duplicada' }),
      ).toBeInstanceOf(HTMLButtonElement),
    );
    expect(screen.getByText('Visualização “Análise duplicada” criada.')).toBeInstanceOf(
      HTMLElement,
    );

    selector = await openSavedViewSelector(user);
    await user.click(within(selector).getByRole('button', { name: 'Excluir visualização' }));
    dialog = screen.getByRole('alertdialog', { name: 'Excluir visualização “Análise duplicada”?' });
    const keepButton = within(dialog).getByRole('button', { name: 'Manter visualização' });
    expect(document.activeElement).toBe(keepButton);
    await user.click(keepButton);
    await waitFor(() =>
      expect(
        screen.queryByRole('alertdialog', {
          name: 'Excluir visualização “Análise duplicada”?',
        }),
      ).toBeNull(),
    );
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: 'Visualização da tabela: Análise duplicada' }),
      ),
    );

    selector = await openSavedViewSelector(user);
    await user.click(within(selector).getByRole('button', { name: 'Excluir visualização' }));
    dialog = screen.getByRole('alertdialog', { name: 'Excluir visualização “Análise duplicada”?' });
    await user.click(within(dialog).getByRole('button', { name: 'Excluir visualização' }));

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Visualização da tabela: Padrão do elenco' }),
      ).toBeInstanceOf(HTMLButtonElement),
    );
    const deletedCandidate = (
      clientMock.saveTableViews.mock.calls.at(-1)?.[0] as SaveTableViewsRequest
    ).state;
    expect(
      deletedCandidate.views.some(
        ({ state: viewState }) => viewState.label === 'Análise duplicada',
      ),
    ).toBe(false);
    expect(
      screen.getByText('Visualização “Análise duplicada” excluída. “Padrão do elenco” foi aberta.'),
    ).toBeInstanceOf(HTMLElement);
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Visualização da tabela: Padrão do elenco' }),
    );
  });

  it('saves and restores owned proposals only after repository confirmation', async () => {
    const user = await renderMatchdayWithViews(lifecycleRepositoryState());

    await changeDensity(user, 'confortável');
    let selector = await openSavedViewSelector(user);
    expect(within(selector).getByText('Alterações não salvas')).toBeInstanceOf(HTMLElement);
    await user.click(within(selector).getByRole('button', { name: 'Salvar visualização' }));
    await waitFor(() => expect(clientMock.saveTableViews).toHaveBeenCalledOnce());
    expect(screen.getByText('Visualização “Minha análise” salva.')).toBeInstanceOf(HTMLElement);

    selector = await openSavedViewSelector(user);
    expect(within(selector).queryByText('Alterações não salvas')).toBeNull();
    await user.keyboard('{Escape}');

    await changeDensity(user, 'compacta');
    selector = await openSavedViewSelector(user);
    await user.click(within(selector).getByRole('button', { name: 'Restaurar visualização' }));
    await waitFor(() => expect(clientMock.saveTableViews).toHaveBeenCalledTimes(2));

    const restoredCandidate = (
      clientMock.saveTableViews.mock.calls.at(-1)?.[0] as SaveTableViewsRequest
    ).state;
    const restoredActive = restoredCandidate.views.find(
      ({ state: viewState }) => viewState.viewId === restoredCandidate.activeViewId,
    );
    expect(restoredActive?.state.density).toBe(SQUAD_SYSTEM_VIEW.density);
    selector = await openSavedViewSelector(user);
    expect(within(selector).queryByText('Alterações não salvas')).toBeNull();
    expect(screen.getByText('Visualização “Minha análise” restaurada.')).toBeInstanceOf(
      HTMLElement,
    );
  });

  it('guards dirty view switches with save, discard and continue-current decisions', async () => {
    const user = await renderMatchdayWithViews(lifecycleRepositoryState());

    await changeDensity(user, 'confortável');
    let selector = await openSavedViewSelector(user);
    await user.click(
      within(selector).getByRole('button', { name: /Abrir visualização Rotação do elenco/u }),
    );
    let dialog = screen.getByRole('alertdialog', {
      name: 'Salvar alterações antes de abrir “Rotação do elenco”?',
    });
    await user.click(within(dialog).getByRole('button', { name: 'Continuar nesta visualização' }));
    expect(
      screen.getByRole('button', { name: 'Visualização da tabela: Minha análise' }),
    ).toBeInstanceOf(HTMLButtonElement);
    expect(clientMock.saveTableViews).not.toHaveBeenCalled();

    selector = await openSavedViewSelector(user);
    await user.click(
      within(selector).getByRole('button', { name: /Abrir visualização Rotação do elenco/u }),
    );
    dialog = screen.getByRole('alertdialog', {
      name: 'Salvar alterações antes de abrir “Rotação do elenco”?',
    });
    await user.click(
      within(dialog).getByRole('button', { name: 'Descartar e abrir “Rotação do elenco”' }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Visualização da tabela: Rotação do elenco' }),
      ).toBeInstanceOf(HTMLButtonElement),
    );

    await changeDensity(user, 'confortável');
    selector = await openSavedViewSelector(user);
    await user.click(
      within(selector).getByRole('button', { name: /Abrir visualização Minha análise/u }),
    );
    dialog = screen.getByRole('alertdialog', {
      name: 'Salvar alterações antes de abrir “Minha análise”?',
    });
    await user.click(
      within(dialog).getByRole('button', { name: 'Salvar e abrir “Minha análise”' }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Visualização da tabela: Minha análise' }),
      ).toBeInstanceOf(HTMLButtonElement),
    );
    expect(clientMock.saveTableViews).toHaveBeenCalledTimes(3);
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Visualização da tabela: Minha análise' }),
    );
  });

  it('cancels a pending save-and-open view continuation when Escape dismisses the dialog', async () => {
    const pendingSave = deferred<SaveTableViewsOutcome>();
    clientMock.saveTableViews.mockImplementationOnce(() => pendingSave.promise);
    const user = await renderMatchdayWithViews(lifecycleRepositoryState());

    await changeDensity(user, 'confortável');
    const selector = await openSavedViewSelector(user);
    await user.click(
      within(selector).getByRole('button', { name: /Abrir visualização Rotação do elenco/u }),
    );
    const dialog = screen.getByRole('alertdialog', {
      name: 'Salvar alterações antes de abrir “Rotação do elenco”?',
    });
    await user.click(
      within(dialog).getByRole('button', { name: 'Salvar e abrir “Rotação do elenco”' }),
    );
    await waitFor(() => expect(clientMock.saveTableViews).toHaveBeenCalledOnce());

    fireEvent(dialog, new Event('cancel', { cancelable: true }));
    expect(screen.queryByRole('alertdialog')).toBeNull();

    const candidate = (clientMock.saveTableViews.mock.calls[0]?.[0] as SaveTableViewsRequest).state;
    pendingSave.resolve(confirmedTableViewSave(candidate));
    await waitFor(() => expect(screen.queryByText('Salvando visualização…')).toBeNull());

    expect(clientMock.saveTableViews).toHaveBeenCalledOnce();
    expect(
      screen.getByRole('button', { name: 'Visualização da tabela: Minha análise' }),
    ).toBeInstanceOf(HTMLButtonElement);
  });

  it('keeps Elenco open when Continue cancels a pending save-and-navigation continuation', async () => {
    const pendingSave = deferred<SaveTableViewsOutcome>();
    clientMock.saveTableViews.mockImplementationOnce(() => pendingSave.promise);
    const user = await renderMatchdayWithViews(lifecycleRepositoryState());

    await changeDensity(user, 'confortável');
    await user.click(screen.getByRole('button', { name: 'Táticas' }));
    const dialog = screen.getByRole('alertdialog', {
      name: 'Salvar alterações antes de abrir “Táticas”?',
    });
    await user.click(within(dialog).getByRole('button', { name: 'Salvar e abrir “Táticas”' }));
    await waitFor(() => expect(clientMock.saveTableViews).toHaveBeenCalledOnce());

    await user.click(within(dialog).getByRole('button', { name: 'Continuar nesta visualização' }));

    const candidate = (clientMock.saveTableViews.mock.calls[0]?.[0] as SaveTableViewsRequest).state;
    pendingSave.resolve(confirmedTableViewSave(candidate));
    await waitFor(() => expect(screen.queryByText('Salvando visualização…')).toBeNull());

    expect(screen.getByRole('heading', { name: 'Visão geral do elenco' })).toBeInstanceOf(
      HTMLElement,
    );
    expect(screen.queryByRole('heading', { name: 'Plano de jogo' })).toBeNull();
    expect(clientMock.saveTableViews).toHaveBeenCalledOnce();
  });

  it('does not delete the active view after Continue cancels its pending save continuation', async () => {
    const pendingSave = deferred<SaveTableViewsOutcome>();
    clientMock.saveTableViews.mockImplementationOnce(() => pendingSave.promise);
    const user = await renderMatchdayWithViews(
      lifecycleRepositoryState('squad.user.analysis', 'squad.user.rotation'),
    );

    await changeDensity(user, 'confortável');
    const selector = await openSavedViewSelector(user);
    await user.click(within(selector).getByRole('button', { name: 'Excluir visualização' }));
    let dialog = screen.getByRole('alertdialog', {
      name: 'Excluir visualização “Minha análise”?',
    });
    await user.click(within(dialog).getByRole('button', { name: 'Excluir visualização' }));
    dialog = screen.getByRole('alertdialog', {
      name: 'Salvar alterações antes de abrir “Rotação do elenco”?',
    });
    await user.click(
      within(dialog).getByRole('button', { name: 'Salvar e abrir “Rotação do elenco”' }),
    );
    await waitFor(() => expect(clientMock.saveTableViews).toHaveBeenCalledOnce());

    await user.click(within(dialog).getByRole('button', { name: 'Continuar nesta visualização' }));

    const candidate = (clientMock.saveTableViews.mock.calls[0]?.[0] as SaveTableViewsRequest).state;
    pendingSave.resolve(confirmedTableViewSave(candidate));
    await waitFor(() => expect(screen.queryByText('Salvando visualização…')).toBeNull());

    expect(clientMock.saveTableViews).toHaveBeenCalledOnce();
    expect(
      screen.getByRole('button', { name: 'Visualização da tabela: Minha análise' }),
    ).toBeInstanceOf(HTMLButtonElement);
  });

  it('cancels an immutable save-as continuation when its busy dialog is closed', async () => {
    const pendingSave = deferred<SaveTableViewsOutcome>();
    clientMock.saveTableViews.mockImplementationOnce(() => pendingSave.promise);
    const user = await renderMatchdayWithViews(
      lifecycleRepositoryState(lifecycleSharedView().state.viewId),
    );

    await changeDensity(user, 'compacta');
    await user.click(screen.getByRole('button', { name: 'Táticas' }));
    const dirtyDialog = screen.getByRole('alertdialog', {
      name: 'Salvar alterações antes de abrir “Táticas”?',
    });
    await user.click(within(dirtyDialog).getByRole('button', { name: 'Salvar e abrir “Táticas”' }));
    const nameDialog = screen.getByRole('dialog', {
      name: 'Criar uma visualização editável',
    });
    await user.type(
      within(nameDialog).getByRole('textbox', { name: 'Nome da visualização' }),
      'Leitura cancelada',
    );
    await user.click(within(nameDialog).getByRole('button', { name: 'Duplicar para editar' }));
    await waitFor(() => expect(clientMock.saveTableViews).toHaveBeenCalledOnce());

    await user.click(
      within(nameDialog).getByRole('button', {
        name: 'Fechar diálogo de visualização',
      }),
    );

    const candidate = (clientMock.saveTableViews.mock.calls[0]?.[0] as SaveTableViewsRequest).state;
    pendingSave.resolve(confirmedTableViewSave(candidate));
    await waitFor(() => expect(screen.queryByText('Salvando visualização…')).toBeNull());

    expect(screen.getByRole('heading', { name: 'Visão geral do elenco' })).toBeInstanceOf(
      HTMLElement,
    );
    expect(screen.queryByRole('heading', { name: 'Plano de jogo' })).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Visualização da tabela: Leitura cancelada' }),
    ).toBeInstanceOf(HTMLButtonElement);
    expect(clientMock.saveTableViews).toHaveBeenCalledOnce();
  });

  it('does not resume a failed save-as navigation after the proposal changes during retry', async () => {
    const pendingRetry = deferred<SaveTableViewsOutcome>();
    clientMock.saveTableViews
      .mockResolvedValueOnce({ status: 'saveFailed' })
      .mockImplementationOnce(() => pendingRetry.promise);
    const user = await renderMatchdayWithViews(
      lifecycleRepositoryState(lifecycleSharedView().state.viewId),
    );

    await changeDensity(user, 'compacta');
    await user.click(screen.getByRole('button', { name: 'Táticas' }));
    const dirtyDialog = screen.getByRole('alertdialog', {
      name: 'Salvar alterações antes de abrir “Táticas”?',
    });
    await user.click(within(dirtyDialog).getByRole('button', { name: 'Salvar e abrir “Táticas”' }));
    const nameDialog = screen.getByRole('dialog', {
      name: 'Criar uma visualização editável',
    });
    await user.type(
      within(nameDialog).getByRole('textbox', { name: 'Nome da visualização' }),
      'Retry protegido',
    );
    await user.click(within(nameDialog).getByRole('button', { name: 'Duplicar para editar' }));
    const retryButton = await screen.findByRole('button', {
      name: 'Tentar salvar visualização',
    });

    await user.click(retryButton);
    await waitFor(() => expect(clientMock.saveTableViews).toHaveBeenCalledTimes(2));
    await changeDensity(user, 'padrão');
    const candidate = (clientMock.saveTableViews.mock.calls[1]?.[0] as SaveTableViewsRequest).state;
    pendingRetry.resolve(confirmedTableViewSave(candidate));
    await waitFor(() => expect(screen.queryByText('Salvando visualização…')).toBeNull());

    expect(screen.getByRole('heading', { name: 'Visão geral do elenco' })).toBeInstanceOf(
      HTMLElement,
    );
    expect(screen.queryByRole('heading', { name: 'Plano de jogo' })).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Visualização da tabela: Retry protegido' }),
    ).toBeInstanceOf(HTMLButtonElement);
    expect(screen.getAllByText('Alterações não salvas').length).toBeGreaterThan(0);
    expect(clientMock.saveTableViews).toHaveBeenCalledTimes(2);
  });

  it('guards dirty deletion and Elenco navigation without implicit save or discard', async () => {
    const user = await renderMatchdayWithViews(
      lifecycleRepositoryState('squad.user.analysis', 'squad.user.rotation'),
    );

    await changeDensity(user, 'confortável');
    const tacticsButton = screen.getByRole('button', { name: 'Táticas' });
    await user.click(tacticsButton);
    let dialog = screen.getByRole('alertdialog', {
      name: 'Salvar alterações antes de abrir “Táticas”?',
    });
    await user.click(within(dialog).getByRole('button', { name: 'Continuar nesta visualização' }));
    expect(screen.getByRole('heading', { name: 'Visão geral do elenco' })).toBeInstanceOf(
      HTMLElement,
    );
    expect(clientMock.saveTableViews).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(tacticsButton);

    let selector = await openSavedViewSelector(user);
    await user.click(within(selector).getByRole('button', { name: 'Excluir visualização' }));
    dialog = screen.getByRole('alertdialog', { name: 'Excluir visualização “Minha análise”?' });
    expect(document.activeElement).toBe(
      within(dialog).getByRole('button', { name: 'Manter visualização' }),
    );
    await user.click(within(dialog).getByRole('button', { name: 'Excluir visualização' }));

    dialog = screen.getByRole('alertdialog', {
      name: 'Salvar alterações antes de abrir “Rotação do elenco”?',
    });
    await user.click(
      within(dialog).getByRole('button', {
        name: 'Descartar e abrir “Rotação do elenco”',
      }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Visualização da tabela: Rotação do elenco' }),
      ).toBeInstanceOf(HTMLButtonElement),
    );
    const deletedCandidate = (
      clientMock.saveTableViews.mock.calls.at(-1)?.[0] as SaveTableViewsRequest
    ).state;
    expect(
      deletedCandidate.views.some(
        ({ state: viewState }) => viewState.viewId === 'squad.user.analysis',
      ),
    ).toBe(false);

    await changeDensity(user, 'confortável');
    await user.click(screen.getByRole('button', { name: 'Táticas' }));
    dialog = screen.getByRole('alertdialog', {
      name: 'Salvar alterações antes de abrir “Táticas”?',
    });
    await user.click(within(dialog).getByRole('button', { name: 'Salvar e abrir “Táticas”' }));
    expect(await screen.findByRole('heading', { name: 'Plano de jogo' })).toBeInstanceOf(
      HTMLElement,
    );
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Táticas' }));
  });

  it('duplicates immutable dirty proposals and retains dirty state through save failure and retry', async () => {
    const user = await renderMatchdayWithViews(
      lifecycleRepositoryState(lifecycleSharedView().state.viewId),
    );

    await changeDensity(user, 'compacta');
    let selector = await openSavedViewSelector(user);
    expect(
      within(selector).getByText(
        'Esta visualização não pode ser editada diretamente. Duplique-a para criar uma versão própria.',
      ),
    ).toBeInstanceOf(HTMLElement);
    await user.click(within(selector).getByRole('button', { name: 'Duplicar para editar' }));
    let dialog = screen.getByRole('dialog', { name: 'Criar uma visualização editável' });
    const saveAsInput = within(dialog).getByRole('textbox', { name: 'Nome da visualização' });
    await user.type(saveAsInput, 'Leitura editável');
    await user.click(within(dialog).getByRole('button', { name: 'Duplicar para editar' }));
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Visualização da tabela: Leitura editável' }),
      ).toBeInstanceOf(HTMLButtonElement),
    );
    const editableCandidate = (
      clientMock.saveTableViews.mock.calls.at(-1)?.[0] as SaveTableViewsRequest
    ).state;
    const editableView = editableCandidate.views.find(
      ({ state: viewState }) => viewState.label === 'Leitura editável',
    );
    expect(editableView?.state.provenance).toBe('user-owned');
    expect(editableView?.state.density).toBe('compact');

    await changeDensity(user, 'confortável');
    clientMock.saveTableViews.mockResolvedValueOnce({ status: 'saveFailed' });
    selector = await openSavedViewSelector(user);
    await user.click(within(selector).getByRole('button', { name: 'Salvar visualização' }));

    const failureHeading = await screen.findByRole('heading', {
      name: 'Não foi possível salvar a visualização',
    });
    expect(document.activeElement).toBe(failureHeading);
    selector = await openSavedViewSelector(user);
    expect(within(selector).getByText('Alterações não salvas')).toBeInstanceOf(HTMLElement);
    await user.keyboard('{Escape}');

    await user.click(screen.getByRole('button', { name: 'Tentar salvar visualização' }));
    await waitFor(() =>
      expect(
        screen.queryByRole('heading', { name: 'Não foi possível salvar a visualização' }),
      ).toBeNull(),
    );
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: 'Visualização da tabela: Leitura editável' }),
      ),
    );
    selector = await openSavedViewSelector(user);
    expect(within(selector).queryByText('Alterações não salvas')).toBeNull();
    expect(screen.getByText('Visualização “Leitura editável” salva.')).toBeInstanceOf(HTMLElement);
  });

  it('supports continue and save branches when deleting the active dirty view', async () => {
    const user = await renderMatchdayWithViews(
      lifecycleRepositoryState('squad.user.analysis', 'squad.user.rotation'),
    );

    await changeDensity(user, 'confortável');
    let selector = await openSavedViewSelector(user);
    await user.click(within(selector).getByRole('button', { name: 'Excluir visualização' }));
    let dialog = screen.getByRole('alertdialog', { name: 'Excluir visualização “Minha análise”?' });
    await user.click(within(dialog).getByRole('button', { name: 'Excluir visualização' }));
    dialog = screen.getByRole('alertdialog', {
      name: 'Salvar alterações antes de abrir “Rotação do elenco”?',
    });
    await user.click(within(dialog).getByRole('button', { name: 'Continuar nesta visualização' }));
    expect(
      screen.getByRole('button', { name: 'Visualização da tabela: Minha análise' }),
    ).toBeInstanceOf(HTMLButtonElement);
    expect(clientMock.saveTableViews).not.toHaveBeenCalled();

    selector = await openSavedViewSelector(user);
    await user.click(within(selector).getByRole('button', { name: 'Excluir visualização' }));
    dialog = screen.getByRole('alertdialog', { name: 'Excluir visualização “Minha análise”?' });
    await user.click(within(dialog).getByRole('button', { name: 'Excluir visualização' }));
    dialog = screen.getByRole('alertdialog', {
      name: 'Salvar alterações antes de abrir “Rotação do elenco”?',
    });
    await user.click(
      within(dialog).getByRole('button', { name: 'Salvar e abrir “Rotação do elenco”' }),
    );

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Visualização da tabela: Rotação do elenco' }),
      ).toBeInstanceOf(HTMLButtonElement),
    );
    expect(clientMock.saveTableViews).toHaveBeenCalledTimes(2);
    const deletedCandidate = (
      clientMock.saveTableViews.mock.calls.at(-1)?.[0] as SaveTableViewsRequest
    ).state;
    expect(
      deletedCandidate.views.some(
        ({ state: viewState }) => viewState.viewId === 'squad.user.analysis',
      ),
    ).toBe(false);
  });

  it('discards dirty table proposals before navigating from Elenco to Táticas', async () => {
    const user = await renderMatchdayWithViews(lifecycleRepositoryState());

    await changeDensity(user, 'confortável');
    await user.click(screen.getByRole('button', { name: 'Táticas' }));
    const dialog = screen.getByRole('alertdialog', {
      name: 'Salvar alterações antes de abrir “Táticas”?',
    });
    await user.click(within(dialog).getByRole('button', { name: 'Descartar e abrir “Táticas”' }));

    expect(await screen.findByRole('heading', { name: 'Plano de jogo' })).toBeInstanceOf(
      HTMLElement,
    );
    expect(clientMock.saveTableViews).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Táticas' }));
  });

  it('prevents repeated name submissions while preserving dialog dismissal during a busy save', async () => {
    let resolveSave!: (outcome: SaveTableViewsOutcome) => void;
    clientMock.saveTableViews.mockImplementationOnce(
      ({ state: candidate }: SaveTableViewsRequest) =>
        new Promise<SaveTableViewsOutcome>((resolve) => {
          resolveSave = resolve;
        }).then((outcome) => outcome),
    );
    const user = await renderMatchdayWithViews(lifecycleRepositoryState());

    const selector = await openSavedViewSelector(user);
    await user.click(within(selector).getByRole('button', { name: 'Criar visualização' }));
    const dialog = screen.getByRole('dialog', { name: 'Criar visualização' });
    await user.type(
      within(dialog).getByRole('textbox', { name: 'Nome da visualização' }),
      'Visão ocupada',
    );
    await user.click(within(dialog).getByRole('button', { name: 'Criar visualização' }));

    const savingButton = within(dialog).getByRole('button', {
      name: /Salvando visualização…/u,
    }) as HTMLButtonElement;
    expect(savingButton.disabled).toBe(true);
    expect(clientMock.saveTableViews).toHaveBeenCalledOnce();
    await user.click(
      within(dialog).getByRole('button', { name: 'Fechar diálogo de visualização' }),
    );
    expect(screen.queryByRole('dialog', { name: 'Criar visualização' })).toBeNull();
    expect(clientMock.saveTableViews).toHaveBeenCalledOnce();

    const candidate = (clientMock.saveTableViews.mock.calls[0]?.[0] as SaveTableViewsRequest).state;
    const confirmedState = {
      ...candidate,
      metadata: {
        ...candidate.metadata,
        revision: candidate.metadata.revision + 1,
      },
    };
    resolveSave({
      status: 'confirmed',
      state: confirmedState,
      receipt: {
        tableId: 'squad.primary',
        schemaVersion: 1,
        ownerScope: 'local-fixed',
        acceptedRevision: confirmedState.metadata.revision,
      },
    });
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Visualização da tabela: Visão ocupada' }),
      ).toBeInstanceOf(HTMLButtonElement),
    );
  });

  it('keeps saved-view lifecycle inside the existing table header without displacing football DOM', async () => {
    const user = await renderMatchdayWithViews(
      lifecycleRepositoryState('squad.user.analysis', 'squad.user.analysis'),
    );

    const table = screen.getByRole('table');
    const selectorTrigger = screen.getByRole('button', {
      name: 'Visualização da tabela: Minha análise',
    });
    const tableHeader = selectorTrigger.closest('.squad-panel__header');
    expect(tableHeader).toBeInstanceOf(HTMLElement);
    expect(tableHeader?.contains(screen.getByRole('button', { name: 'Configurar tabela' }))).toBe(
      true,
    );
    expect(tableHeader?.compareDocumentPosition(table) ?? 0).toBe(Node.DOCUMENT_POSITION_FOLLOWING);

    const lifecycleState = screen.getByLabelText('Estado da visualização ativa');
    expect(within(lifecycleState).getByText('Minha visualização')).toBeInstanceOf(HTMLElement);
    expect(within(lifecycleState).getByText('Visualização padrão')).toBeInstanceOf(HTMLElement);
    expect(screen.getByLabelText('Resumo de Caio Brandão')).toBeInstanceOf(HTMLElement);
    expect(within(table).getAllByRole('button', { name: /Retirar|Escalar/u })).toHaveLength(12);

    await changeDensity(user, 'confortável');
    expect(within(lifecycleState).getByText('Alterações não salvas')).toBeInstanceOf(HTMLElement);
    expect(screen.getByRole('button', { name: 'Táticas' })).toBeInstanceOf(HTMLButtonElement);
  });

  it('translates rejected table commands into product-safe Portuguese copy', () => {
    const copy = describeTableViewRejection(
      {
        code: 'unknown-column-id',
        path: 'command.columnId',
        detail: 'removedInternalColumn',
      },
      { kind: 'column', columnId: 'removedInternalColumn' },
    );

    expect(copy).toBe(
      'Coluna da tabela: a coluna solicitada não está disponível nesta visualização. A configuração anterior foi mantida.',
    );
    expect(copy).not.toContain('command.columnId');
    expect(copy).not.toContain('unknown-column-id');
    expect(copy).not.toContain('removedInternalColumn');
  });

  it('preserves table geometry with disabled lifecycle controls and skeleton rows while loading views', async () => {
    let resolveLoad!: (outcome: LoadTableViewsOutcome) => void;
    clientMock.loadTableViews.mockReturnValueOnce(
      new Promise<LoadTableViewsOutcome>((resolve) => {
        resolveLoad = resolve;
      }),
    );

    render(<MatchdayScreen serviceOwnership="owned" />);
    await screen.findByRole('heading', { name: 'Visão geral do elenco' });
    const loadingHeading = screen.getByRole('heading', {
      name: 'Carregando visualizações do elenco…',
    });
    expect(loadingHeading).toBeInstanceOf(HTMLHeadingElement);
    expect(screen.getByRole('table')).toBeInstanceOf(HTMLTableElement);
    expect(document.querySelectorAll('.squad-table__skeleton-row')).toHaveLength(5);
    expect(
      (
        screen.getByRole('button', {
          name: /Visualização da tabela:/u,
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);

    resolveLoad({ status: 'loaded', state: lifecycleRepositoryState() });
    await waitFor(() =>
      expect(document.querySelectorAll('.squad-table__skeleton-row')).toHaveLength(0),
    );
    expect(
      within(screen.getByRole('table')).getAllByRole('button', { name: /Retirar|Escalar/u }),
    ).toHaveLength(12);
  });

  it.each([
    {
      name: 'unavailable repository',
      outcome: {
        status: 'unavailable',
        fallback: tableRepositoryState(),
      } satisfies LoadTableViewsOutcome,
      heading: 'Visualizações personalizadas indisponíveis',
      body: /O elenco continua utilizável na visualização padrão/u,
      action: 'Tentar reconectar ao repositório',
    },
    {
      name: 'invalid repository payload',
      outcome: {
        status: 'invalid',
        fallback: tableRepositoryState(),
        reason: 'table_view.invalid_payload',
      } satisfies LoadTableViewsOutcome,
      heading: 'Não foi possível carregar suas visualizações',
      body: /O elenco foi aberto com a visualização padrão/u,
      action: 'Tentar carregar visualizações',
    },
    {
      name: 'corrupt payload recovery',
      outcome: {
        status: 'recovered',
        state: tableRepositoryState(),
        reason: 'corrupt_payload',
      } satisfies LoadTableViewsOutcome,
      heading: 'Uma visualização corrompida foi isolada',
      body: /A configuração inválida não foi aplicada/u,
      action: 'Revisar visualização padrão',
    },
    {
      name: 'future schema recovery',
      outcome: {
        status: 'recovered',
        state: tableRepositoryState(),
        reason: 'future_schema_version',
      } satisfies LoadTableViewsOutcome,
      heading: 'Esta visualização exige uma versão mais recente',
      body: /Ela foi isolada para evitar perda de configuração/u,
      action: 'Usar visualização padrão',
    },
    {
      name: 'interrupted write recovery',
      outcome: {
        status: 'recovered',
        state: tableRepositoryState(),
        reason: 'interrupted_write',
      } satisfies LoadTableViewsOutcome,
      heading: 'Visualizações do elenco recuperadas',
      body: /Uma gravação interrompida foi reconciliada/u,
      action: 'Revisar visualização padrão',
    },
  ])(
    'renders exact $name copy with a usable system fallback',
    async ({ outcome, heading, body, action }) => {
      const user = userEvent.setup();
      clientMock.loadTableViews.mockResolvedValueOnce(outcome);
      render(<MatchdayScreen serviceOwnership="owned" />);

      expect(await screen.findByRole('heading', { name: heading })).toBeInstanceOf(
        HTMLHeadingElement,
      );
      expect(screen.getByText(body)).toBeInstanceOf(HTMLElement);
      expect(screen.getByRole('table')).toBeInstanceOf(HTMLTableElement);
      const recoveryAction = screen.getByRole('button', { name: action });

      if (action.includes('visualização padrão')) {
        await user.click(recoveryAction);
        await waitFor(() =>
          expect(document.activeElement).toBe(
            screen.getByRole('button', {
              name: /Visualização da tabela:/u,
            }),
          ),
        );
      } else {
        expect(recoveryAction).toBeInstanceOf(HTMLButtonElement);
      }
    },
  );

  it('announces repository migration and receipt-confirmed legacy import without raw diagnostics', async () => {
    const user = userEvent.setup();
    clientMock.loadTableViews.mockResolvedValueOnce({
      status: 'migrated',
      state: lifecycleRepositoryState(),
      fromEnvelopeVersion: 2,
      toEnvelopeVersion: 3,
    });
    const { unmount } = render(<MatchdayScreen serviceOwnership="owned" />);
    const migrationToast = await screen.findByRole('status', {
      name: 'Visualizações do elenco atualizadas',
    });
    expect(migrationToast).toBeInstanceOf(HTMLElement);
    expect(
      within(migrationToast).getByText(
        'Suas visualizações foram atualizadas e a configuração válida foi preservada.',
      ),
    ).toBeInstanceOf(HTMLElement);
    expect(document.body.textContent).not.toContain('table_view.');
    unmount();

    window.localStorage.setItem(
      'rivallo.squad-ui.v3',
      JSON.stringify({ density: 'standard', visibleColumns: ['age'] }),
    );
    clientMock.loadTableViews.mockResolvedValueOnce({
      status: 'loaded',
      state: tableRepositoryState(),
    });
    render(<MatchdayScreen serviceOwnership="owned" />);
    expect(await screen.findByText('Preferências antigas importadas')).toBeInstanceOf(HTMLElement);
    expect(
      screen.getByText(
        'Densidade e colunas compatíveis agora estão protegidas no repositório de visualizações.',
      ),
    ).toBeInstanceOf(HTMLElement);
    await user.click(screen.getByRole('button', { name: 'Revisar visualização importada' }));
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: 'Configurar tabela' }),
      ),
    );
    expect(clientMock.importLegacyTablePreferences).toHaveBeenCalledOnce();
  });

  it('keeps invalid legacy data and exposes the exact safe fallback copy', async () => {
    window.localStorage.setItem(
      'rivallo.squad-ui.v3',
      JSON.stringify({
        density: 'standard',
        visibleColumns: ['removedColumn'],
      }),
    );
    render(<MatchdayScreen serviceOwnership="owned" />);

    expect(
      await screen.findByRole('heading', {
        name: 'Preferências antigas não puderam ser importadas',
      }),
    ).toBeInstanceOf(HTMLHeadingElement);
    expect(
      screen.getByText(
        'Os dados antigos foram mantidos para diagnóstico e o elenco voltou à visualização padrão.',
      ),
    ).toBeInstanceOf(HTMLElement);
    expect(window.localStorage.getItem('rivallo.squad-ui.v3')).toContain('"removedColumn"');
    expect(clientMock.importLegacyTablePreferences).not.toHaveBeenCalled();
  });
});

const selectorView = (
  viewId: string,
  label: string,
  provenance: SavedTableView['state']['provenance'],
  mutability: SavedTableView['mutability'],
): SavedTableView => ({
  mutability,
  state: {
    ...structuredClone(SQUAD_SYSTEM_VIEW),
    viewId,
    baselineViewId: provenance === 'system-default' ? viewId : SQUAD_SYSTEM_VIEW.viewId,
    provenance,
    label,
  },
});

const selectorCallbacks = () => ({
  onActivate: vi.fn(),
  onCreate: vi.fn(),
  onDelete: vi.fn(),
  onDuplicate: vi.fn(),
  onRename: vi.fn(),
  onReset: vi.fn(),
  onSave: vi.fn(),
  onSetDefault: vi.fn(),
});

describe('SavedViewSelector', () => {
  const longViewName =
    'Análise de desenvolvimento e disponibilidade do elenco para a próxima rodada';
  const systemView = selectorView(
    SQUAD_SYSTEM_VIEW.viewId,
    'Padrão do elenco',
    'system-default',
    'immutable',
  );
  const alphaView = selectorView('squad.user.alpha', longViewName, 'user-owned', 'mutable');
  const zuluView = selectorView(
    'squad.user.zulu',
    'Zagueiros disponíveis',
    'user-owned',
    'mutable',
  );
  const sharedView = selectorView(
    'squad.shared.analysis',
    'Análise da comissão',
    'shared-read-only',
    'read-only',
  );
  const views = [sharedView, zuluView, systemView, alphaView] as const;

  it('orders stable views by provenance and exposes full names plus textual state', async () => {
    const user = userEvent.setup();
    render(
      <SavedViewSelector
        activeViewId={alphaView.state.viewId}
        defaultViewId={systemView.state.viewId}
        dirty
        views={views}
        {...selectorCallbacks()}
      />,
    );

    const trigger = screen.getByRole('button', {
      name: `Visualização da tabela: ${longViewName}`,
    });
    await user.click(trigger);

    const selector = screen.getByRole('dialog', { name: 'Visualização da tabela' });
    const viewButtons = within(selector).getAllByRole('button', {
      name: /^Abrir visualização/u,
    });
    expect(viewButtons.map((button) => button.getAttribute('data-view-id'))).toEqual([
      systemView.state.viewId,
      alphaView.state.viewId,
      zuluView.state.viewId,
      sharedView.state.viewId,
    ]);

    const longNameButton = within(selector).getByRole('button', {
      name: new RegExp(longViewName, 'u'),
    });
    expect(longNameButton.getAttribute('aria-label')).toContain(longViewName);
    expect(longNameButton.getAttribute('title')).toBe(longViewName);
    expect(longNameButton.getAttribute('aria-current')).toBe('true');
    expect(within(selector).getByText('Alterações não salvas')).toBeInstanceOf(HTMLElement);
    expect(within(selector).getByText('Padrão do sistema')).toBeInstanceOf(HTMLElement);
    expect(within(selector).getAllByText('Minha visualização')).toHaveLength(2);
    expect(within(selector).getByText('Somente leitura')).toBeInstanceOf(HTMLElement);
    expect(within(selector).getByText('Visualização padrão')).toBeInstanceOf(HTMLElement);
    expect(within(selector).getByText('Visualização ativa')).toBeInstanceOf(HTMLElement);
  });

  it('shows only lifecycle actions allowed by the active provenance', async () => {
    const user = userEvent.setup();
    const callbacks = selectorCallbacks();
    const { rerender } = render(
      <SavedViewSelector
        activeViewId={systemView.state.viewId}
        defaultViewId={systemView.state.viewId}
        dirty={false}
        views={views}
        {...callbacks}
      />,
    );

    const openSelector = async () => {
      await user.click(screen.getByRole('button', { name: /Visualização da tabela:/u }));
      return screen.getByRole('dialog', { name: 'Visualização da tabela' });
    };

    let selector = await openSelector();
    expect(within(selector).getByRole('button', { name: 'Duplicar visualização' })).toBeInstanceOf(
      HTMLButtonElement,
    );
    expect(
      within(selector).getByRole('button', { name: 'Definir como visualização padrão' }),
    ).toBeInstanceOf(HTMLButtonElement);
    expect(within(selector).queryByRole('button', { name: 'Renomear visualização' })).toBeNull();
    expect(within(selector).queryByRole('button', { name: 'Excluir visualização' })).toBeNull();
    expect(within(selector).queryByRole('button', { name: 'Salvar visualização' })).toBeNull();
    await user.keyboard('{Escape}');

    rerender(
      <SavedViewSelector
        activeViewId={alphaView.state.viewId}
        defaultViewId={systemView.state.viewId}
        dirty
        views={views}
        {...callbacks}
      />,
    );
    selector = await openSelector();
    for (const actionName of [
      'Duplicar visualização',
      'Renomear visualização',
      'Excluir visualização',
      'Definir como visualização padrão',
      'Restaurar visualização',
      'Salvar visualização',
    ]) {
      expect(within(selector).getByRole('button', { name: actionName })).toBeInstanceOf(
        HTMLButtonElement,
      );
    }
    await user.keyboard('{Escape}');

    rerender(
      <SavedViewSelector
        activeViewId={sharedView.state.viewId}
        defaultViewId={systemView.state.viewId}
        dirty={false}
        views={views}
        {...callbacks}
      />,
    );
    selector = await openSelector();
    expect(within(selector).getByRole('button', { name: 'Duplicar visualização' })).toBeInstanceOf(
      HTMLButtonElement,
    );
    for (const forbiddenAction of [
      'Renomear visualização',
      'Excluir visualização',
      'Definir como visualização padrão',
      'Restaurar visualização',
      'Salvar visualização',
    ]) {
      expect(within(selector).queryByRole('button', { name: forbiddenAction })).toBeNull();
    }
  });

  it('keeps the system view selectable and offers the first-view action when none are owned', async () => {
    const user = userEvent.setup();
    const callbacks = selectorCallbacks();
    render(
      <SavedViewSelector
        activeViewId={systemView.state.viewId}
        defaultViewId={systemView.state.viewId}
        dirty={false}
        views={[systemView]}
        {...callbacks}
      />,
    );

    const trigger = screen.getByRole('button', {
      name: 'Visualização da tabela: Padrão do elenco',
    });
    await user.click(trigger);
    const selector = screen.getByRole('dialog', { name: 'Visualização da tabela' });
    expect(
      within(selector).getByRole('button', { name: /Abrir visualização Padrão do elenco/u }),
    ).toBeInstanceOf(HTMLButtonElement);
    expect(within(selector).getByText('Você ainda não criou visualizações')).toBeInstanceOf(
      HTMLElement,
    );
    await user.click(within(selector).getByRole('button', { name: 'Criar primeira visualização' }));
    expect(callbacks.onCreate).toHaveBeenCalledOnce();
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Visualização da tabela' })).toBeNull(),
    );
    expect(document.activeElement).toBe(trigger);
  });

  it('opens with Enter and Space, restores focus on Escape and selection, and activates stable IDs', async () => {
    const user = userEvent.setup();
    const callbacks = selectorCallbacks();
    render(
      <SavedViewSelector
        activeViewId={systemView.state.viewId}
        defaultViewId={systemView.state.viewId}
        dirty={false}
        views={views}
        {...callbacks}
      />,
    );

    const trigger = screen.getByRole('button', {
      name: 'Visualização da tabela: Padrão do elenco',
    });
    trigger.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('dialog', { name: 'Visualização da tabela' })).toBeInstanceOf(
      HTMLElement,
    );
    await user.keyboard('{Escape}');
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Visualização da tabela' })).toBeNull(),
    );
    expect(document.activeElement).toBe(trigger);

    await user.keyboard(' ');
    const selector = screen.getByRole('dialog', { name: 'Visualização da tabela' });
    const sharedOption = within(selector).getByRole('button', {
      name: /Abrir visualização Análise da comissão/u,
    });
    sharedOption.focus();
    await user.keyboard('{Enter}');
    expect(callbacks.onActivate).toHaveBeenCalledWith(sharedView.state.viewId);
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Visualização da tabela' })).toBeNull(),
    );
    expect(document.activeElement).toBe(trigger);
  });
});
