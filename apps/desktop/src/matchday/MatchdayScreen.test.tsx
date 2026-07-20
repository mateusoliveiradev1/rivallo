import '@testing-library/dom';

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { describeTableViewRejection, MatchdayScreen, parseProfileRoute } from './MatchdayScreen.js';
import { coachProfileFixture, playerProfileFixture } from '../profiles/test-fixtures.js';
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
import { createTacticalPlan } from './tactics-model.js';
import {
  attachTacticalModelFixture,
  tacticalStrategyCatalogFixture,
} from './tactical-test-fixture.js';
import type {
  MatchdayState,
  Player,
  TacticalPlayerPlacement,
  TacticalPlanUpdate,
  TacticalRecommendation,
} from './types.js';

const clientMock = vi.hoisted(() => ({
  loadMatchday: vi.fn(),
  saveMatchdayLineup: vi.fn(),
  saveTacticalPlan: vi.fn(),
  updateTacticalLibrary: vi.fn(),
  previewTacticalPlan: vi.fn(),
  loadTacticalStrategyCatalog: vi.fn(),
  loadTacticalMatchSnapshot: vi.fn(),
  playNextMatch: vi.fn(),
  loadTableViews: vi.fn(),
  saveTableViews: vi.fn(),
  importLegacyTablePreferences: vi.fn(),
  loadPlayerProfile: vi.fn(),
  previewPlayerProfile: vi.fn(),
  loadCoachProfile: vi.fn(),
  loadClubProfile: vi.fn(),
  loadNationProfile: vi.fn(),
  searchProfiles: vi.fn(),
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

const initialTacticalPlan = attachTacticalModelFixture(createTacticalPlan(players, '4-3-3'));

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
  tacticalLibrary: {
    schemaVersion: 1,
    revision: 0,
    activeVariationId: initialTacticalPlan.variationId,
    primaryVariationId: initialTacticalPlan.variationId,
    variations: [initialTacticalPlan],
  },
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
    window.history.replaceState(null, '', '/');
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1920 });
    clientMock.loadMatchday.mockReset().mockResolvedValue(state);
    clientMock.loadPlayerProfile.mockReset().mockImplementation(async (playerId: string) => {
      const player = players.find(({ id }) => id === playerId) ?? players[0]!;
      return playerProfileFixture({
        entityId: player.id,
        fullName: player.name,
        knownName: player.name,
        position: player.position,
        nationality: player.nationality,
      });
    });
    clientMock.previewPlayerProfile.mockReset().mockImplementation(async (playerId: string) => {
      const player = players.find(({ id }) => id === playerId) ?? players[0]!;
      return playerProfileFixture({
        entityId: player.id,
        fullName: player.name,
        knownName: player.name,
        position: player.position,
        nationality: player.nationality,
      });
    });
    clientMock.loadCoachProfile.mockReset().mockResolvedValue(coachProfileFixture());
    clientMock.loadClubProfile.mockReset().mockResolvedValue({
      schemaVersion: 1,
      revision: 1,
      entityId: state.club.id,
      name: state.club.name,
      shortName: state.club.shortName,
      city: state.club.city,
      primaryColor: state.club.primaryColor,
      countryCode: 'BRA',
      competitionName: 'Liga Horizonte',
      stadiumName: null,
      currentPosition: null,
      nextFixture: null,
      form: [],
      headCoach: null,
      players: [],
      staff: [],
      tactics: null,
      knowledge: playerProfileFixture().knowledge,
    });
    clientMock.loadNationProfile.mockReset().mockResolvedValue({
      schemaVersion: 1,
      revision: 1,
      entityId: 'bra',
      name: 'Brasil',
      code: 'BRA',
      confederation: 'CONMEBOL',
      clubs: [],
      players: [],
      coaches: [],
      competitions: [],
      knowledge: playerProfileFixture().knowledge,
    });
    clientMock.searchProfiles.mockReset().mockResolvedValue([]);
    clientMock.saveMatchdayLineup.mockReset().mockResolvedValue(state);
    clientMock.saveTacticalPlan.mockReset().mockResolvedValue({
      state,
      event: {
        kind: 'variationSaved',
        variationId: 'tactical-variation.primary',
        acceptedRevision: 1,
      },
    });
    clientMock.updateTacticalLibrary.mockReset().mockResolvedValue({
      state,
      event: {
        kind: 'variationActivated',
        variationId: 'tactical-variation.primary',
        acceptedLibraryRevision: 1,
      },
    });
    clientMock.loadTacticalStrategyCatalog
      .mockReset()
      .mockResolvedValue(tacticalStrategyCatalogFixture());
    clientMock.previewTacticalPlan.mockReset().mockImplementation(async ({ tacticalConfig }) => ({
      model: {
        ...initialTacticalPlan.tacticalModel,
        config: tacticalConfig ?? initialTacticalPlan.tacticalModel?.config,
      },
      comparison: null,
    }));
    clientMock.loadTacticalMatchSnapshot
      .mockReset()
      .mockResolvedValue(initialTacticalPlan.tacticalModel?.matchSnapshot);
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

  it('parses the four stable global entity routes', () => {
    expect(parseProfileRoute('/players/rv-fdv-01')).toEqual({
      kind: 'player',
      entityId: 'rv-fdv-01',
    });
    expect(parseProfileRoute('/coaches/coach.aurora.1/')).toEqual({
      kind: 'coach',
      entityId: 'coach.aurora.1',
    });
    expect(parseProfileRoute('/clubs/aurora-fc')).toEqual({
      kind: 'club',
      entityId: 'aurora-fc',
    });
    expect(parseProfileRoute('/nations/bra')).toEqual({ kind: 'nation', entityId: 'bra' });
    expect(parseProfileRoute('/tactics')).toBeNull();
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
      within(await screen.findByLabelText('Resumo de Caio Brandão')).getByLabelText(
        'Brasil, código BRA',
      ),
    ).toBeInstanceOf(HTMLElement);
  });

  it('uses global search to deep-link one canonical external profile', async () => {
    const user = userEvent.setup();
    clientMock.searchProfiles.mockResolvedValue([
      {
        entityId: 'rv-fdv-01',
        entityType: 'player',
        name: 'Martín Gouveia',
        secondaryLabel: 'Ferroviário do Vale · Atacante',
        route: '/players/rv-fdv-01',
        knowledgeLevel: 'partial',
      },
    ]);
    clientMock.loadPlayerProfile.mockImplementation(async (playerId: string) =>
      playerId === 'rv-fdv-01'
        ? playerProfileFixture({
            entityId: playerId,
            fullName: 'Martín Gouveia',
            knownName: 'M. Gouveia',
            position: 'ST',
            nationality: 'URU',
            knowledge: 'partial',
          })
        : playerProfileFixture(),
    );

    render(<MatchdayScreen serviceOwnership="owned" />);
    await screen.findByRole('heading', { name: 'Visão geral do elenco' });
    await user.type(
      screen.getByRole('searchbox', { name: 'Buscar jogadores, treinadores, clubes e nações' }),
      'mart',
    );
    await user.click(await screen.findByRole('button', { name: /Martín Gouveia/u }));

    expect(await screen.findByRole('heading', { name: 'M. Gouveia' })).toBeInstanceOf(
      HTMLHeadingElement,
    );
    expect(window.location.pathname).toBe('/players/rv-fdv-01');
    expect(clientMock.loadPlayerProfile).toHaveBeenCalledWith(
      'rv-fdv-01',
      initialTacticalPlan.variationId,
    );
  });

  it('ignores an older global-search response after the query changes', async () => {
    const user = userEvent.setup();
    const older = deferred<readonly []>();
    const newer = deferred<
      readonly [
        {
          readonly entityId: string;
          readonly entityType: 'player';
          readonly name: string;
          readonly secondaryLabel: string;
          readonly route: string;
          readonly knowledgeLevel: 'partial';
        },
      ]
    >();
    clientMock.searchProfiles.mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise);

    render(<MatchdayScreen serviceOwnership="owned" />);
    await screen.findByRole('heading', { name: 'Visão geral do elenco' });
    const search = screen.getByRole('searchbox', {
      name: 'Buscar jogadores, treinadores, clubes e nações',
    });
    await user.type(search, 'ca');
    await waitFor(() => expect(clientMock.searchProfiles).toHaveBeenCalledWith('ca'));
    await user.clear(search);
    await user.type(search, 'mart');
    await waitFor(() => expect(clientMock.searchProfiles).toHaveBeenCalledWith('mart'));

    newer.resolve([
      {
        entityId: 'rv-fdv-01',
        entityType: 'player',
        name: 'Martín Gouveia',
        secondaryLabel: 'Ferroviário do Vale',
        route: '/players/rv-fdv-01',
        knowledgeLevel: 'partial',
      },
    ]);
    expect(await screen.findByRole('button', { name: /Martín Gouveia/u })).toBeInstanceOf(
      HTMLButtonElement,
    );
    older.resolve([]);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Martín Gouveia/u })).toBeInstanceOf(
        HTMLButtonElement,
      ),
    );
  });

  it('restores a coach profile from a direct native route', async () => {
    window.history.replaceState(null, '', '/coaches/coach.aurora.1');
    render(<MatchdayScreen serviceOwnership="owned" />);

    expect(await screen.findByRole('heading', { name: 'Marcelo Nunes' })).toBeInstanceOf(
      HTMLHeadingElement,
    );
    expect(clientMock.loadCoachProfile).toHaveBeenCalledWith('coach.aurora.1');
  });

  it('opens club and nation profiles from direct native routes', async () => {
    window.history.replaceState(null, '', '/clubs/aurora-fc');
    const { unmount } = render(<MatchdayScreen serviceOwnership="owned" />);
    expect(await screen.findByRole('heading', { name: state.club.name })).toBeInstanceOf(
      HTMLHeadingElement,
    );
    expect(clientMock.loadClubProfile).toHaveBeenCalledWith('aurora-fc');

    unmount();
    window.history.replaceState(null, '', '/nations/bra');
    render(<MatchdayScreen serviceOwnership="owned" />);
    expect(await screen.findByRole('heading', { name: 'Brasil' })).toBeInstanceOf(
      HTMLHeadingElement,
    );
    expect(clientMock.loadNationProfile).toHaveBeenCalledWith('bra');
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

    fireEvent.change(
      screen.getByRole('searchbox', {
        name: 'Buscar jogadores, treinadores, clubes e nações',
      }),
      {
        target: { value: 'Luan' },
      },
    );

    expect(await screen.findByRole('heading', { name: '1 jogadores' })).toBeInstanceOf(
      HTMLHeadingElement,
    );
    expect(clientMock.saveTableViews).not.toHaveBeenCalled();
  });

  it('switches to a calm management preset without persisting or changing squad data', async () => {
    const user = userEvent.setup();
    render(<MatchdayScreen serviceOwnership="owned" />);
    await screen.findByRole('heading', { name: 'Visão geral do elenco' });
    const presetNavigation = screen.getByRole('navigation', { name: 'Modos de leitura do elenco' });
    await user.click(within(presetNavigation).getByRole('button', { name: 'Gestão' }));

    expect(screen.getByRole('button', { name: /Ordenar por OVR atual/u })).toBeInstanceOf(
      HTMLButtonElement,
    );
    expect(screen.queryByRole('button', { name: /Ordenar por Potencial estimado/u })).toBeNull();
    expect(screen.getAllByLabelText(/OVR atual \d+/u).length).toBeGreaterThan(0);
    expect(clientMock.saveTableViews).not.toHaveBeenCalled();
    expect(clientMock.saveMatchdayLineup).not.toHaveBeenCalled();
  });

  it('keeps an unknown nationality readable in the real table and dossier', async () => {
    clientMock.loadMatchday.mockResolvedValue({
      ...state,
      players: state.players.map((player, index) =>
        index === 0 ? { ...player, nationality: 'código-corrompido-comprido' } : player,
      ),
    });
    clientMock.loadPlayerProfile.mockResolvedValue(
      playerProfileFixture({ nationality: 'código-corrompido-comprido' }),
    );

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
    await waitFor(() => expect(clientMock.saveTacticalPlan).toHaveBeenCalledOnce());
    const [proposal] = clientMock.saveTacticalPlan.mock.calls[0] as [
      { placements: { playerId: string }[] },
    ];
    const selectedIds = proposal.placements.map(({ playerId }) => playerId);
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
    expect(clientMock.saveTacticalPlan).toHaveBeenCalledOnce();
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
    expect(screen.queryByRole('button', { name: /Ordenar por Potencial estimado/u })).toBeNull();
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
    expect(screen.getByRole('button', { name: /Ordenar por Potencial estimado/u })).toBeInstanceOf(
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
    await waitFor(() => expect(clientMock.saveTacticalPlan).toHaveBeenCalledOnce());
    const [proposal] = clientMock.saveTacticalPlan.mock.calls[0] as [
      { placements: { playerId: string }[] },
    ];
    const selectedIds = proposal.placements.map(({ playerId }) => playerId);
    expect(selectedIds).toContain('p12');
    expect(selectedIds).not.toContain('p1');
  });

  it('changes only the transient card projection when the field reading changes', async () => {
    render(<MatchdayScreen serviceOwnership="owned" />);
    await screen.findByRole('heading', { name: 'Visão geral do elenco' });
    fireEvent.click(screen.getByRole('button', { name: 'Táticas' }));

    const playerIdsBefore = Array.from(
      document.querySelectorAll<HTMLElement>('[data-tactical-player-origin="field"]'),
      (card) => card.dataset.tacticalPlayerId,
    );
    const reading = screen.getByRole('combobox', { name: 'Leitura do campo' });
    const firstCard = document.querySelector<HTMLElement>('[data-tactical-player-id="p1"]');
    expect(firstCard?.dataset.primaryMetric).toBe('ability');
    expect(firstCard?.querySelectorAll('[data-card-region="primary-metric"]')).toHaveLength(1);
    expect(firstCard?.textContent).not.toContain('Potencial');

    await waitFor(() =>
      expect(window.localStorage.getItem('rivallo.squad-ui.v4')).toContain(
        '"activeScreen":"tactics"',
      ),
    );
    const storedPreferences = window.localStorage.getItem('rivallo.squad-ui.v4');
    expect(JSON.parse(storedPreferences ?? '{}')).not.toHaveProperty('pitchMode');

    fireEvent.change(reading, { target: { value: 'context' } });
    await waitFor(() => expect(firstCard?.dataset.primaryMetric).toBe('context'));
    expect(within(firstCard!).getByLabelText('No plano atual: 78')).toBeInstanceOf(HTMLElement);
    expect(firstCard?.querySelectorAll('[data-card-region="primary-metric"]')).toHaveLength(1);

    fireEvent.change(reading, { target: { value: 'familiarity' } });
    expect(firstCard?.dataset.primaryMetric).toBe('familiarity');
    expect(within(firstCard!).getByLabelText(/Familiaridade com o plano:/u)).toBeInstanceOf(
      HTMLElement,
    );

    fireEvent.change(reading, { target: { value: 'condition' } });
    expect(firstCard?.dataset.primaryMetric).toBe('condition');
    expect(within(firstCard!).getByLabelText('Condição física: 95%')).toBeInstanceOf(HTMLElement);
    expect(
      Array.from(
        document.querySelectorAll<HTMLElement>('[data-tactical-player-origin="field"]'),
        (card) => card.dataset.tacticalPlayerId,
      ),
    ).toEqual(playerIdsBefore);
    expect(window.localStorage.getItem('rivallo.squad-ui.v4')).toBe(storedPreferences);
    expect(clientMock.saveTacticalPlan).not.toHaveBeenCalled();
  });

  it('integrates phases, authoritative analysis, strategy, instructions and honest opposition', async () => {
    const user = userEvent.setup();
    render(<MatchdayScreen serviceOwnership="owned" />);
    await screen.findByRole('heading', { name: 'Visão geral do elenco' });
    await user.click(screen.getByRole('button', { name: 'Táticas' }));

    expect(screen.getByText('Visão da equipe')).toBeInstanceOf(HTMLElement);
    await user.click(screen.getByRole('button', { name: 'Com posse' }));
    expect(screen.getByText(/projeção derivada; a posição base não foi alterada/iu)).toBeInstanceOf(
      HTMLElement,
    );

    await user.click(screen.getByRole('tab', { name: 'Análise' }));
    expect(screen.getByText('Diagnóstico autoritativo')).toBeInstanceOf(HTMLElement);
    expect(screen.getByText(/Familiaridade coletiva 84%/u)).toBeInstanceOf(HTMLElement);

    await user.click(screen.getByRole('tab', { name: 'Estratégia' }));
    await user.click(await screen.findByRole('button', { name: /Protagonista/u }));
    expect(screen.getByRole('heading', { name: 'Aplicar Protagonista?' })).toBeInstanceOf(
      HTMLHeadingElement,
    );
    await user.click(screen.getByRole('button', { name: 'Aplicar à proposta' }));
    await waitFor(() => expect(clientMock.previewTacticalPlan).toHaveBeenCalledOnce());

    await user.click(screen.getByRole('tab', { name: 'Instruções' }));
    expect(screen.getByText(/Jogador → função → posição/u)).toBeInstanceOf(HTMLElement);
    expect(screen.queryByText(/collective|circulation|supported/u)).toBeNull();
    expect(screen.getByText(/só é persistida ao salvar o plano/u)).toBeInstanceOf(HTMLElement);
    await user.click(screen.getByRole('button', { name: 'Adicionar instrução' }));
    await waitFor(() => expect(clientMock.previewTacticalPlan).toHaveBeenCalledTimes(2));

    await user.click(screen.getByRole('tab', { name: 'Oposição' }));
    expect(screen.getByText(/nenhum dado foi inventado/iu)).toBeInstanceOf(HTMLElement);
  });

  it('routes spatial controls to the right derived preview and keeps behavior controls stationary', async () => {
    const user = userEvent.setup();
    clientMock.previewTacticalPlan.mockImplementation(async ({ tacticalConfig }) => ({
      model: {
        ...initialTacticalPlan.tacticalModel,
        config: tacticalConfig ?? initialTacticalPlan.tacticalModel?.config,
      },
      comparison: {
        fromRevision: 0,
        toRevision: 0,
        changes: [
          {
            changeId: 'width',
            label: 'Largura com a bola',
            before: '55',
            after: '90',
            cause: 'Ajuste de estratégia',
            expectedConsequences: ['amplitude para abrir o bloco adversário'],
          },
        ],
        familiarityBefore: 84,
        familiarityAfter: 82,
        affectedPlayers: ['p7', 'p11'],
        risksCreated: ['espaço após a perda'],
        risksReduced: [],
      },
    }));
    render(<MatchdayScreen serviceOwnership="owned" />);
    await screen.findByRole('heading', { name: 'Visão geral do elenco' });
    await user.click(screen.getByRole('button', { name: 'Táticas' }));
    await user.click(screen.getByRole('tab', { name: 'Estratégia' }));
    await user.click(screen.getByRole('button', { name: 'Personalizar estratégia' }));

    const basePlacements = initialTacticalPlan.placements.map(
      ({ normalizedX, normalizedY, playerId }) => ({ normalizedX, normalizedY, playerId }),
    );
    const amplitude = screen.getByRole('slider', { name: 'Amplitude' });
    fireEvent.change(amplitude, { target: { value: '90' } });
    fireEvent.pointerUp(amplitude);
    await waitFor(() => expect(clientMock.previewTacticalPlan).toHaveBeenCalledOnce());
    expect(
      screen.getByRole('button', { name: 'Com posse', hidden: true }).getAttribute('aria-pressed'),
    ).toBe('true');
    const [widthProposal] = clientMock.previewTacticalPlan.mock.calls[0] ?? [];
    expect(widthProposal?.tacticalConfig?.strategy.inPossession.width).toBe(90);
    expect(
      widthProposal?.placements.map(
        ({ normalizedX, normalizedY, playerId }: TacticalPlayerPlacement) => ({
          normalizedX,
          normalizedY,
          playerId,
        }),
      ),
    ).toEqual(basePlacements);
    const proposal = screen.getByLabelText('Comparação entre salvo e proposta');
    expect(proposal.textContent).toContain('Ataque');
    for (const action of [
      'Aplicar à proposta',
      'Continuar editando',
      'Restaurar salvo',
      'Cancelar comparação',
      'Salvar plano',
    ]) {
      expect(within(proposal).getByRole('button', { name: action })).toBeInstanceOf(
        HTMLButtonElement,
      );
    }

    const slotsBeforeTempo = [...document.querySelectorAll<HTMLElement>('.pitch-slot')].map(
      ({ style }) => [style.getPropertyValue('--slot-x'), style.getPropertyValue('--slot-y')],
    );
    const tempo = screen.getByRole('slider', { name: 'Ritmo' });
    fireEvent.change(tempo, { target: { value: '75' } });
    fireEvent.pointerUp(tempo);
    await waitFor(() => expect(clientMock.previewTacticalPlan).toHaveBeenCalledTimes(2));
    const slotsAfterTempo = [...document.querySelectorAll<HTMLElement>('.pitch-slot')].map(
      ({ style }) => [style.getPropertyValue('--slot-x'), style.getPropertyValue('--slot-y')],
    );
    expect(slotsAfterTempo).toEqual(slotsBeforeTempo);
    expect(
      screen.getByRole('button', { name: 'Com posse', hidden: true }).getAttribute('aria-pressed'),
    ).toBe('true');

    await user.click(screen.getByRole('button', { name: /Sem a bola/u }));
    const defensiveLine = screen.getByRole('slider', { name: 'Linha defensiva' });
    fireEvent.change(defensiveLine, { target: { value: '75' } });
    fireEvent.pointerUp(defensiveLine);
    expect(screen.getByRole('button', { name: 'Sem posse' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    const horizontalCompactness = screen.getByRole('slider', {
      name: 'Compactação horizontal',
    });
    fireEvent.change(horizontalCompactness, { target: { value: '75' } });
    fireEvent.pointerUp(horizontalCompactness);
    await waitFor(() => expect(clientMock.previewTacticalPlan).toHaveBeenCalledTimes(4));
    expect(screen.getByRole('button', { name: 'Sem posse' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
  });

  it('exposes saved and proposed slider values, keyboard tabs, restore and explicit persistence', async () => {
    const user = userEvent.setup();
    render(<MatchdayScreen serviceOwnership="owned" />);
    await screen.findByRole('heading', { name: 'Visão geral do elenco' });
    await user.click(screen.getByRole('button', { name: 'Táticas' }));

    const analysisTab = screen.getByRole('tab', { name: 'Análise' });
    analysisTab.focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Estratégia' }).getAttribute('aria-selected')).toBe(
      'true',
    );
    await user.click(screen.getByRole('button', { name: 'Personalizar estratégia' }));

    const amplitude = screen.getByRole('slider', { name: 'Amplitude' });
    expect(amplitude.getAttribute('min')).toBe('0');
    expect(amplitude.getAttribute('max')).toBe('100');
    expect(amplitude.getAttribute('aria-valuetext')).toBe('55, Equilibrada');
    const slider = amplitude.closest('.tactical-slider');
    expect(slider?.querySelector('.tactical-slider__saved')?.getAttribute('style')).toContain(
      '--saved-value: 55%',
    );

    fireEvent.change(amplitude, { target: { value: '72' } });
    fireEvent.pointerUp(amplitude);
    await waitFor(() => expect(clientMock.previewTacticalPlan).toHaveBeenCalledOnce());
    expect(clientMock.saveTacticalPlan).not.toHaveBeenCalled();
    expect(screen.getByRole('slider', { name: 'Amplitude' }).getAttribute('aria-valuetext')).toBe(
      '72, Alta',
    );

    await user.click(within(slider as HTMLElement).getByRole('button', { name: 'Restaurar' }));
    await waitFor(() => expect(clientMock.previewTacticalPlan).toHaveBeenCalledTimes(2));
    expect((screen.getByRole('slider', { name: 'Amplitude' }) as HTMLInputElement).value).toBe(
      '55',
    );
    expect(clientMock.saveTacticalPlan).not.toHaveBeenCalled();
  });

  it('previews a current model recommendation in the field and applies it only to the draft', async () => {
    const recommendation: TacticalRecommendation = {
      recommendationId: 'model.raise-width',
      reason: 'Aumentar a amplitude para criar uma linha de passe no lado oposto.',
      proposedChanges: [{ path: 'strategy.inPossession.width', from: 55, to: 70 }],
      benefit: 'Mais espaço para circular.',
      risk: 'Maior distância após a perda.',
      affectedPlayers: ['p9', 'p11'],
      confidence: 81,
      origin: 'Análise do modelo tático',
      variationId: initialTacticalPlan.variationId,
      planRevision: initialTacticalPlan.revision,
      staffId: null,
      staffRole: null,
      staffName: null,
      staffSpecialty: null,
      staffQuality: null,
      planKnowledge: null,
      opponentKnowledge: null,
    };
    const recommendedPlan = {
      ...initialTacticalPlan,
      tacticalModel: {
        ...initialTacticalPlan.tacticalModel!,
        recommendations: [recommendation],
      },
    };
    clientMock.loadMatchday.mockResolvedValue({
      ...state,
      tacticalLibrary: {
        ...state.tacticalLibrary!,
        variations: [recommendedPlan],
      },
    });
    clientMock.previewTacticalPlan.mockImplementation(async ({ tacticalConfig }) => ({
      model: {
        ...recommendedPlan.tacticalModel!,
        config: tacticalConfig ?? recommendedPlan.tacticalModel!.config,
      },
      comparison: {
        fromRevision: 0,
        toRevision: 0,
        changes: [
          {
            changeId: 'width',
            label: 'Amplitude',
            before: '55',
            after: '70',
            cause: 'Recomendação do modelo tático',
            expectedConsequences: ['mais espaço para circular'],
          },
        ],
        familiarityBefore: 84,
        familiarityAfter: 82,
        affectedPlayers: ['p9', 'p11'],
        risksCreated: ['distância após a perda'],
        risksReduced: [],
      },
    }));

    const user = userEvent.setup();
    render(<MatchdayScreen serviceOwnership="owned" />);
    await screen.findByRole('heading', { name: 'Visão geral do elenco' });
    await user.click(screen.getByRole('button', { name: 'Táticas' }));
    await user.click(screen.getByRole('tab', { name: 'Análise' }));
    await user.click(await screen.findByRole('button', { name: 'Ver alterações' }));

    const dialog = await screen.findByRole('alertdialog', { name: 'Revisar recomendação' });
    expect(within(dialog).getByText('Análise do modelo tático')).toBeInstanceOf(HTMLElement);
    expect(within(dialog).getByText('55 → 70')).toBeInstanceOf(HTMLElement);
    expect(
      screen.getByRole('button', { name: 'Com posse', hidden: true }).getAttribute('aria-pressed'),
    ).toBe('true');
    expect(clientMock.saveTacticalPlan).not.toHaveBeenCalled();

    const applyRecommendation = within(dialog).getByRole('button', {
      name: 'Aplicar à proposta',
    });
    await waitFor(() => expect((applyRecommendation as HTMLButtonElement).disabled).toBe(false));
    await user.click(applyRecommendation);
    await waitFor(() => expect(clientMock.previewTacticalPlan).toHaveBeenCalledTimes(2));
    expect(clientMock.saveTacticalPlan).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Comparação entre salvo e proposta')).toBeInstanceOf(HTMLElement);
  });

  it('blocks a stale recommendation and offers recalculation without changing the draft', async () => {
    const staleRecommendation: TacticalRecommendation = {
      recommendationId: 'model.stale',
      reason: 'Ajustar a compactação vertical.',
      proposedChanges: [{ path: 'strategy.outOfPossession.verticalCompactness', from: 60, to: 70 }],
      benefit: 'Menos espaço entre setores.',
      risk: 'Menor cobertura em profundidade.',
      affectedPlayers: ['p3', 'p4'],
      confidence: 78,
      origin: 'Análise do modelo tático',
      variationId: initialTacticalPlan.variationId,
      planRevision: initialTacticalPlan.revision + 1,
      staffId: null,
      staffRole: null,
      staffName: null,
      staffSpecialty: null,
      staffQuality: null,
      planKnowledge: null,
      opponentKnowledge: null,
    };
    const recommendedPlan = {
      ...initialTacticalPlan,
      tacticalModel: {
        ...initialTacticalPlan.tacticalModel!,
        recommendations: [staleRecommendation],
      },
    };
    clientMock.loadMatchday.mockResolvedValue({
      ...state,
      tacticalLibrary: { ...state.tacticalLibrary!, variations: [recommendedPlan] },
    });

    const user = userEvent.setup();
    render(<MatchdayScreen serviceOwnership="owned" />);
    await screen.findByRole('heading', { name: 'Visão geral do elenco' });
    await user.click(screen.getByRole('button', { name: 'Táticas' }));
    await user.click(screen.getByRole('tab', { name: 'Análise' }));
    await user.click(await screen.findByRole('button', { name: 'Ver alterações' }));
    const dialog = await screen.findByRole('alertdialog', { name: 'Revisar recomendação' });
    const applyRecommendation = within(dialog).getByRole('button', {
      name: 'Aplicar à proposta',
    });
    await waitFor(() => expect((applyRecommendation as HTMLButtonElement).disabled).toBe(false));
    await user.click(applyRecommendation);

    expect(within(dialog).getByText(/criada para uma versão anterior do plano/iu)).toBeInstanceOf(
      HTMLElement,
    );
    expect(within(dialog).getByRole('button', { name: 'Recalcular' })).toBeInstanceOf(
      HTMLButtonElement,
    );
    expect(clientMock.saveTacticalPlan).not.toHaveBeenCalled();
  });

  it('moves freely by keyboard, announces cancellation, allows an unusual goalkeeper drop and undoes', async () => {
    const user = userEvent.setup();
    render(<MatchdayScreen serviceOwnership="owned" />);
    await screen.findByRole('heading', { name: 'Visão geral do elenco' });
    await user.click(screen.getByRole('button', { name: 'Táticas' }));

    const goalkeeper = screen.getByRole('button', { name: /^GOL: Caio Brandão/u });
    const goalkeeperSlot = goalkeeper.closest('li');
    const originalStyle = goalkeeperSlot?.getAttribute('style');
    fireEvent.keyDown(goalkeeper, { altKey: true, key: 'ArrowRight' });
    expect(screen.getByText('Origem: 4-3-3')).toBeInstanceOf(HTMLElement);
    expect(goalkeeperSlot?.getAttribute('style')).not.toBe(originalStyle);
    expect(screen.getByText(/foi movido com o teclado/u)).toBeInstanceOf(HTMLElement);
    await waitFor(() => expect(clientMock.previewTacticalPlan).toHaveBeenCalledOnce());

    await user.click(screen.getByRole('button', { name: 'Desfazer última' }));
    expect(goalkeeperSlot?.getAttribute('style')).toBe(originalStyle);

    await user.click(screen.getByRole('button', { name: 'Selecionar reserva Ícaro Reis' }));
    await user.keyboard('{Escape}');
    expect(screen.getByText(/Movimento cancelado/u)).toBeInstanceOf(HTMLElement);

    const pitch = screen.getByLabelText('Escalação no 4-3-3');
    vi.spyOn(pitch, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 1000,
      bottom: 600,
      width: 1000,
      height: 600,
      toJSON: () => ({}),
    });
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: vi.fn(() => pitch),
    });
    fireEvent.pointerDown(goalkeeper, {
      button: 0,
      clientX: 80,
      clientY: 80,
      isPrimary: true,
      pointerId: 1,
      pointerType: 'mouse',
    });
    fireEvent.pointerMove(window, {
      clientX: 700,
      clientY: 300,
      isPrimary: true,
      pointerId: 1,
      pointerType: 'mouse',
    });
    expect(document.querySelector('.tactical-drag-overlay')).toBeInstanceOf(HTMLElement);
    expect(clientMock.previewTacticalPlan).toHaveBeenCalledOnce();
    fireEvent.pointerUp(window, {
      clientX: 700,
      clientY: 300,
      isPrimary: true,
      pointerId: 1,
      pointerType: 'mouse',
    });
    expect(screen.getByText(/foi movido para uma coordenada livre/u)).toBeInstanceOf(HTMLElement);
    expect(goalkeeperSlot?.getAttribute('style')).not.toBe(originalStyle);
    await waitFor(() => expect(clientMock.previewTacticalPlan).toHaveBeenCalledTimes(2));
  });

  it('protects sidebar navigation while the tactical plan is being saved', async () => {
    const pendingSave = deferred<TacticalPlanUpdate>();
    clientMock.saveTacticalPlan.mockReturnValueOnce(pendingSave.promise);
    const user = userEvent.setup();
    render(<MatchdayScreen serviceOwnership="owned" />);
    await screen.findByRole('heading', { name: 'Visão geral do elenco' });
    await user.click(screen.getByRole('button', { name: 'Táticas' }));

    const midfielder = screen.getByRole('button', { name: /Luan Seixas/u });
    fireEvent.keyDown(midfielder, { altKey: true, key: 'ArrowUp' });
    await user.click(screen.getByRole('button', { name: 'Salvar plano' }));
    await waitFor(() => expect(clientMock.saveTacticalPlan).toHaveBeenCalledOnce());

    const squadNavigation = screen.getByRole('button', { name: 'Elenco' }) as HTMLButtonElement;
    expect(squadNavigation.disabled).toBe(true);
    fireEvent.click(squadNavigation);
    expect(screen.getByRole('heading', { name: 'Plano de jogo' })).toBeInstanceOf(
      HTMLHeadingElement,
    );

    pendingSave.resolve({
      state,
      event: {
        kind: 'variationSaved',
        variationId: 'tactical-variation.primary',
        acceptedRevision: 1,
      },
    });
    await waitFor(() => expect(squadNavigation.disabled).toBe(false));
  });

  it('uses the same drag session to swap starters and reorder the bench atomically', async () => {
    const user = userEvent.setup();
    const expandedPlayers = [
      ...state.players,
      {
        ...state.players[2]!,
        id: 'p13',
        name: 'Otávio Luz',
        shortName: 'O. Luz',
        shirtNumber: 13,
        selected: false,
      },
    ];
    const expandedPlan = attachTacticalModelFixture(createTacticalPlan(expandedPlayers, '4-3-3'));
    clientMock.loadMatchday.mockResolvedValue({
      ...state,
      players: expandedPlayers,
      tacticalLibrary: {
        ...state.tacticalLibrary!,
        activeVariationId: expandedPlan.variationId,
        primaryVariationId: expandedPlan.variationId,
        variations: [expandedPlan],
      },
    });
    render(<MatchdayScreen serviceOwnership="owned" />);
    await screen.findByRole('heading', { name: 'Visão geral do elenco' });
    await user.click(screen.getByRole('button', { name: 'Táticas' }));

    const moura = screen.getByRole('button', { name: /Davi Moura/u });
    const serpa = screen.getByRole('button', { name: /^ZAG.*Iago Serpa/u });
    const mouraStyle = moura.closest('li')?.getAttribute('style');
    const serpaStyle = serpa.closest('li')?.getAttribute('style');
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: vi.fn(() => serpa),
    });
    fireEvent.pointerDown(moura.querySelector('strong') ?? moura, {
      button: 0,
      clientX: 100,
      clientY: 100,
      isPrimary: true,
      pointerId: 2,
      pointerType: 'mouse',
    });
    fireEvent.pointerMove(window, {
      clientX: 180,
      clientY: 180,
      isPrimary: true,
      pointerId: 2,
      pointerType: 'mouse',
    });
    fireEvent.pointerUp(window, {
      clientX: 180,
      clientY: 180,
      isPrimary: true,
      pointerId: 2,
      pointerType: 'mouse',
    });
    await waitFor(() => expect(clientMock.previewTacticalPlan).toHaveBeenCalledOnce());
    expect(moura.closest('li')?.getAttribute('style')).toBe(serpaStyle);
    expect(serpa.closest('li')?.getAttribute('style')).toBe(mouraStyle);

    const firstReserve = screen.getByRole('button', { name: 'Selecionar reserva Ícaro Reis' });
    const secondReserve = screen.getByRole('button', { name: 'Selecionar reserva Otávio Luz' });
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: vi.fn(() => secondReserve),
    });
    fireEvent.pointerDown(firstReserve, {
      button: 0,
      clientX: 100,
      clientY: 700,
      isPrimary: true,
      pointerId: 3,
      pointerType: 'mouse',
    });
    fireEvent.pointerMove(window, {
      clientX: 260,
      clientY: 700,
      isPrimary: true,
      pointerId: 3,
      pointerType: 'mouse',
    });
    fireEvent.pointerUp(window, {
      clientX: 260,
      clientY: 700,
      isPrimary: true,
      pointerId: 3,
      pointerType: 'mouse',
    });
    await waitFor(() => expect(clientMock.previewTacticalPlan).toHaveBeenCalledTimes(2));
    const reserveButtons = screen.getAllByRole('button', { name: /^Selecionar reserva/u });
    expect(reserveButtons[0]?.getAttribute('aria-label')).toBe('Selecionar reserva Otávio Luz');
    expect(reserveButtons[1]?.getAttribute('aria-label')).toBe('Selecionar reserva Ícaro Reis');
  });

  it('locks the overlay to the grabbed corner before its first frame and commits its visual center', async () => {
    const user = userEvent.setup();
    render(<MatchdayScreen serviceOwnership="owned" />);
    await screen.findByRole('heading', { name: 'Visão geral do elenco' });
    await user.click(screen.getByRole('button', { name: 'Táticas' }));

    const midfielder = screen.getByRole('button', { name: /Luan Seixas/u });
    const midfielderSlot = midfielder.closest('li');
    const pitch = screen.getByLabelText('Escalação no 4-3-3');
    vi.spyOn(midfielder, 'getBoundingClientRect').mockReturnValue({
      x: 200,
      y: 250,
      top: 250,
      left: 200,
      right: 328,
      bottom: 322,
      width: 128,
      height: 72,
      toJSON: () => ({}),
    });
    vi.spyOn(pitch, 'getBoundingClientRect').mockReturnValue({
      x: 100,
      y: 50,
      top: 50,
      left: 100,
      right: 1100,
      bottom: 650,
      width: 1000,
      height: 600,
      toJSON: () => ({}),
    });
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: vi.fn(() => pitch),
    });

    fireEvent.pointerDown(midfielder, {
      button: 0,
      clientX: 212,
      clientY: 262,
      isPrimary: true,
      pointerId: 9,
      pointerType: 'mouse',
    });
    const overlay = document.querySelector<HTMLElement>('.tactical-drag-overlay');
    expect(overlay?.hidden).toBe(true);
    expect(overlay?.style.transform).toBe('translate3d(200px, 250px, 0)');

    fireEvent.pointerMove(window, {
      clientX: 500,
      clientY: 400,
      isPrimary: true,
      pointerId: 9,
      pointerType: 'mouse',
    });
    expect(overlay?.hidden).toBe(false);
    expect(overlay?.style.transform).toBe('translate3d(488px, 388px, 0)');
    expect(getComputedStyle(overlay!).pointerEvents).toBe('none');
    expect(overlay?.style.transition).toBe('none');

    fireEvent.pointerUp(window, {
      clientX: 500,
      clientY: 400,
      isPrimary: true,
      pointerId: 9,
      pointerType: 'mouse',
    });
    await waitFor(() => expect(clientMock.previewTacticalPlan).toHaveBeenCalledOnce());
    expect(document.querySelector('.tactical-drag-overlay')).toBeNull();
    expect(
      Number.parseFloat(midfielderSlot?.style.getPropertyValue('--slot-x') ?? '') / 100,
    ).toBeCloseTo(0.452, 5);
    expect(
      Number.parseFloat(midfielderSlot?.style.getPropertyValue('--slot-y') ?? '') / 100,
    ).toBeCloseTo(0.623_333, 5);
  });

  it('uses pointer capture, a movement threshold and scaled field coordinates with safe cancellation', async () => {
    const user = userEvent.setup();
    render(<MatchdayScreen serviceOwnership="owned" />);
    await screen.findByRole('heading', { name: 'Visão geral do elenco' });
    await user.click(screen.getByRole('button', { name: 'Táticas' }));

    const midfielder = screen.getByRole('button', { name: /Luan Seixas/u });
    const midfielderSlot = midfielder.closest('li');
    const originalStyle = midfielderSlot?.getAttribute('style');
    const pitch = screen.getByLabelText('Escalação no 4-3-3');
    vi.spyOn(pitch, 'getBoundingClientRect').mockReturnValue({
      x: 100,
      y: 50,
      top: 50,
      left: 100,
      right: 1100,
      bottom: 650,
      width: 1000,
      height: 600,
      toJSON: () => ({}),
    });
    let hitTarget: Element = pitch;
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: vi.fn(() => hitTarget),
    });
    const setPointerCapture = vi.fn();
    const releasePointerCapture = vi.fn();
    Object.defineProperties(midfielder, {
      setPointerCapture: { configurable: true, value: setPointerCapture },
      hasPointerCapture: { configurable: true, value: vi.fn(() => true) },
      releasePointerCapture: { configurable: true, value: releasePointerCapture },
    });

    fireEvent.pointerDown(midfielder.querySelector('strong') ?? midfielder, {
      button: 0,
      clientX: 250,
      clientY: 300,
      isPrimary: true,
      pointerId: 10,
      pointerType: 'mouse',
    });
    fireEvent.pointerMove(window, {
      clientX: 252,
      clientY: 301,
      isPrimary: true,
      pointerId: 10,
      pointerType: 'mouse',
    });
    expect(document.querySelector<HTMLElement>('.tactical-drag-overlay')?.hidden).toBe(true);
    fireEvent.pointerMove(window, {
      clientX: 700,
      clientY: 300,
      isPrimary: true,
      pointerId: 10,
      pointerType: 'mouse',
    });
    const overlay = document.querySelector<HTMLElement>('.tactical-drag-overlay');
    expect(overlay).toBeInstanceOf(HTMLElement);
    expect(overlay?.hidden).toBe(false);
    expect(overlay?.style.width).toBe('128px');
    expect(overlay?.style.height).toBe('72px');
    expect(overlay?.querySelector('.player-face')).toBeInstanceOf(HTMLElement);
    expect(setPointerCapture).toHaveBeenCalledWith(10);
    fireEvent.pointerMove(window, {
      clientX: 710,
      clientY: 305,
      isPrimary: true,
      pointerId: 10,
      pointerType: 'mouse',
    });
    expect(document.querySelector('.tactical-drag-overlay')).toBe(overlay);
    fireEvent.pointerMove(window, {
      clientX: 700,
      clientY: 300,
      isPrimary: true,
      pointerId: 10,
      pointerType: 'mouse',
    });
    fireEvent.pointerUp(window, {
      clientX: 700,
      clientY: 300,
      isPrimary: true,
      pointerId: 10,
      pointerType: 'mouse',
    });
    await waitFor(() => expect(clientMock.previewTacticalPlan).toHaveBeenCalledOnce());
    expect(midfielderSlot?.getAttribute('style')).toContain('--slot-x: 60%');
    expect(midfielderSlot?.getAttribute('style')).not.toBe(originalStyle);
    expect(screen.queryByText('Função livre')).toBeNull();
    expect(document.activeElement).toBe(midfielder);
    expect(document.querySelector('.tactical-drag-overlay')).toBeNull();
    expect(releasePointerCapture).toHaveBeenCalledWith(10);

    let movedStyle = midfielderSlot?.getAttribute('style');
    hitTarget = midfielder;
    fireEvent.pointerDown(midfielder, {
      button: 0,
      clientX: 700,
      clientY: 300,
      isPrimary: true,
      pointerId: 11,
      pointerType: 'mouse',
    });
    fireEvent.pointerMove(window, {
      clientX: 730,
      clientY: 320,
      isPrimary: true,
      pointerId: 11,
      pointerType: 'mouse',
    });
    fireEvent.pointerUp(window, {
      clientX: 730,
      clientY: 320,
      isPrimary: true,
      pointerId: 11,
      pointerType: 'mouse',
    });
    await waitFor(() => expect(clientMock.previewTacticalPlan).toHaveBeenCalledTimes(2));
    expect(midfielderSlot?.getAttribute('style')).not.toBe(movedStyle);
    expect(screen.getByText(/coordenada livre/u)).toBeInstanceOf(HTMLElement);
    movedStyle = midfielderSlot?.getAttribute('style');

    hitTarget = document.body;
    fireEvent.pointerDown(midfielder, {
      button: 0,
      clientX: 700,
      clientY: 300,
      isPrimary: true,
      pointerId: 12,
      pointerType: 'mouse',
    });
    fireEvent.pointerMove(window, {
      clientX: 10,
      clientY: 10,
      isPrimary: true,
      pointerId: 12,
      pointerType: 'mouse',
    });
    fireEvent.pointerUp(window, {
      clientX: 10,
      clientY: 10,
      isPrimary: true,
      pointerId: 12,
      pointerType: 'mouse',
    });
    expect(midfielderSlot?.getAttribute('style')).toBe(movedStyle);
    expect(screen.getByText(/cancelado fora da área tática/u)).toBeInstanceOf(HTMLElement);

    fireEvent.pointerDown(midfielder, {
      button: 0,
      clientX: 700,
      clientY: 300,
      isPrimary: true,
      pointerId: 13,
      pointerType: 'mouse',
    });
    fireEvent.pointerMove(window, {
      clientX: 10,
      clientY: 10,
      isPrimary: true,
      pointerId: 13,
      pointerType: 'mouse',
    });
    fireEvent.keyDown(midfielder, { key: 'Escape' });
    expect(document.querySelector('.tactical-drag-overlay')).toBeNull();
    fireEvent.pointerUp(window, {
      clientX: 10,
      clientY: 10,
      isPrimary: true,
      pointerId: 13,
      pointerType: 'mouse',
    });
    expect(midfielderSlot?.getAttribute('style')).toBe(movedStyle);
    expect(screen.getByText(/Movimento cancelado/u)).toBeInstanceOf(HTMLElement);

    fireEvent.pointerDown(midfielder, {
      button: 0,
      clientX: 700,
      clientY: 300,
      isPrimary: true,
      pointerId: 14,
      pointerType: 'mouse',
    });
    fireEvent.pointerMove(window, {
      clientX: 720,
      clientY: 320,
      isPrimary: true,
      pointerId: 14,
      pointerType: 'mouse',
    });
    fireEvent.pointerCancel(window, {
      clientX: 720,
      clientY: 320,
      isPrimary: true,
      pointerId: 14,
      pointerType: 'mouse',
    });
    fireEvent.pointerMove(window, {
      clientX: 740,
      clientY: 340,
      isPrimary: true,
      pointerId: 14,
      pointerType: 'mouse',
    });
    expect(document.querySelector('.tactical-drag-overlay')).toBeNull();
    expect(midfielderSlot?.getAttribute('style')).toBe(movedStyle);
  });

  it('searches grouped formation presets and confirms destructive preset changes', async () => {
    const user = userEvent.setup();
    render(<MatchdayScreen serviceOwnership="owned" />);
    await screen.findByRole('heading', { name: 'Visão geral do elenco' });
    await user.click(screen.getByRole('button', { name: 'Táticas' }));

    const formationTrigger = screen.getByRole('button', {
      name: 'Formação: 4-3-3. Abrir biblioteca',
    });
    await user.click(formationTrigger);
    const picker = screen.getByRole('dialog', { name: 'Escolher formação' });
    expect(within(picker).getByRole('heading', { name: 'Linha de quatro' })).toBeInstanceOf(
      HTMLElement,
    );
    expect(within(picker).getByRole('heading', { name: 'Linha de três' })).toBeInstanceOf(
      HTMLElement,
    );
    expect(within(picker).getByRole('heading', { name: 'Linha de cinco' })).toBeInstanceOf(
      HTMLElement,
    );
    const search = within(picker).getByRole('searchbox', { name: 'Buscar formação' });
    expect(document.activeElement).toBe(search);
    await user.type(search, 'duplo volante');
    const targetPreset = within(picker).getByRole('option', { name: /4-2-3-1/u });
    expect(within(picker).getAllByRole('option')).toHaveLength(1);
    fireEvent.keyDown(search, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(targetPreset);
    await user.keyboard('{Enter}');
    const firstPreview = screen.getByRole('alertdialog', { name: 'Aplicar 4-2-3-1?' });
    expect(within(firstPreview).getByText('Titulares mantidos')).toBeInstanceOf(HTMLElement);
    await user.click(within(firstPreview).getByRole('button', { name: 'Aplicar sugestão' }));
    expect(
      screen.getByRole('button', { name: 'Formação: 4-2-3-1. Abrir biblioteca' }),
    ).toBeInstanceOf(HTMLButtonElement);

    const midfielder = screen.getByRole('button', { name: /Luan Seixas/u });
    fireEvent.keyDown(midfielder, { altKey: true, key: 'ArrowUp' });
    await user.click(screen.getByRole('button', { name: 'Formação: 4-2-3-1. Abrir biblioteca' }));
    await user.click(
      within(screen.getByRole('dialog', { name: 'Escolher formação' })).getByRole('option', {
        name: /4-4-2/u,
      }),
    );
    const confirmation = screen.getByRole('alertdialog', { name: 'Aplicar 4-4-2?' });
    expect(within(confirmation).getByRole('button', { name: 'Aplicar sugestão' })).toBeInstanceOf(
      HTMLButtonElement,
    );
    expect(within(confirmation).getByRole('button', { name: 'Manter jogadores' })).toBeInstanceOf(
      HTMLButtonElement,
    );
    await user.click(within(confirmation).getByRole('button', { name: 'Cancelar' }));
    expect(
      screen.getByRole('button', { name: 'Formação: 4-2-3-1. Abrir biblioteca' }),
    ).toBeInstanceOf(HTMLButtonElement);

    await user.click(screen.getByRole('button', { name: 'Formação: 4-2-3-1. Abrir biblioteca' }));
    await user.click(
      within(screen.getByRole('dialog', { name: 'Escolher formação' })).getByRole('option', {
        name: /4-4-2/u,
      }),
    );
    await user.click(
      within(screen.getByRole('alertdialog', { name: 'Aplicar 4-4-2?' })).getByRole('button', {
        name: 'Manter jogadores',
      }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Formação: 4-4-2. Abrir biblioteca' }),
      ).toBeInstanceOf(HTMLButtonElement),
    );
    expect(clientMock.saveTacticalPlan).not.toHaveBeenCalled();
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
      name: 'Salvar nova visualização',
    });
    await user.type(
      within(nameDialog).getByRole('textbox', { name: 'Nome da visualização' }),
      'Leitura cancelada',
    );
    await user.click(within(nameDialog).getByRole('button', { name: 'Salvar e ativar' }));
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
      name: 'Salvar nova visualização',
    });
    await user.type(
      within(nameDialog).getByRole('textbox', { name: 'Nome da visualização' }),
      'Retry protegido',
    );
    await user.click(within(nameDialog).getByRole('button', { name: 'Salvar e ativar' }));
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
    let dialog = screen.getByRole('dialog', { name: 'Salvar nova visualização' });
    const saveAsInput = within(dialog).getByRole('textbox', { name: 'Nome da visualização' });
    await user.type(saveAsInput, 'Leitura editável');
    await user.click(within(dialog).getByRole('button', { name: 'Salvar e ativar' }));
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

  it('asks for a name immediately when saving column changes from the protected system view', async () => {
    const user = await renderMatchdayWithViews(lifecycleRepositoryState(SQUAD_SYSTEM_VIEW.viewId));

    await user.click(screen.getByRole('button', { name: 'Configurar tabela' }));
    const customizer = screen.getByRole('dialog', { name: 'Configurar tabela' });
    await user.click(within(customizer).getByRole('button', { name: 'Ocultar Idade' }));

    const saveAsButton = within(customizer).getByRole('button', {
      name: 'Salvar como nova visualização',
    });
    expect(saveAsButton).toBeInstanceOf(HTMLButtonElement);
    await user.click(saveAsButton);

    const nameDialog = screen.getByRole('dialog', { name: 'Salvar nova visualização' });
    expect(
      within(nameDialog).getByText(
        'A visualização “Padrão do elenco” não será alterada. Dê um nome para salvar estes ajustes.',
      ),
    ).toBeInstanceOf(HTMLElement);
    expect(clientMock.saveTableViews).not.toHaveBeenCalled();

    await user.type(
      within(nameDialog).getByRole('textbox', { name: 'Nome da visualização' }),
      'Elenco sem idade',
    );
    await user.click(within(nameDialog).getByRole('button', { name: 'Salvar e ativar' }));

    await waitFor(() => expect(clientMock.saveTableViews).toHaveBeenCalledOnce());
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Visualização da tabela: Elenco sem idade' }),
      ).toBeInstanceOf(HTMLButtonElement),
    );
    const savedCandidate = (clientMock.saveTableViews.mock.calls[0]?.[0] as SaveTableViewsRequest)
      .state;
    const savedView = savedCandidate.views.find(
      ({ state: viewState }) => viewState.label === 'Elenco sem idade',
    );
    expect(savedView?.state.provenance).toBe('user-owned');
    expect(savedView?.state.columns.find(({ columnId }) => columnId === 'age')?.visible).toBe(
      false,
    );
    expect(screen.getByText('Visualização “Elenco sem idade” criada e ativada.')).toBeInstanceOf(
      HTMLElement,
    );

    await user.click(screen.getByRole('button', { name: 'Táticas' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(await screen.findByRole('heading', { name: 'Plano de jogo' })).toBeInstanceOf(
      HTMLElement,
    );
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
    const tableHeader = selectorTrigger.closest('.rv-data-table-workspace-header');
    expect(tableHeader).toBeInstanceOf(HTMLElement);
    expect(tableHeader?.contains(screen.getByRole('button', { name: 'Configurar tabela' }))).toBe(
      true,
    );
    expect(tableHeader?.compareDocumentPosition(table) ?? 0).toBe(Node.DOCUMENT_POSITION_FOLLOWING);

    const lifecycleState = screen.getByLabelText('Estado da visualização ativa');
    expect(within(lifecycleState).getByText('Visualização personalizada')).toBeInstanceOf(
      HTMLElement,
    );
    expect(within(lifecycleState).getByText('Padrão')).toBeInstanceOf(HTMLElement);
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
      body: /O Elenco segue na visualização Padrão/u,
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

      const recoveryHeading = await screen.findByRole('heading', { name: heading });
      expect(recoveryHeading).toBeInstanceOf(HTMLHeadingElement);
      expect(recoveryHeading.closest('.rv-data-table-workspace-header__feedback')).toBeInstanceOf(
        HTMLElement,
      );
      expect(recoveryHeading.closest('.saved-view-lifecycle-host')).toBeNull();
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
