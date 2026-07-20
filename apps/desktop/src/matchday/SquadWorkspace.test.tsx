import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { useRef, useState } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import {
  applyTableViewCommand,
  isTableViewDirty,
  type TableViewCommand,
  type TableViewCommandResult,
  type TableViewFilterGroup,
  type TableViewState,
} from '../table-view/table-view-engine.js';
import {
  defaultSquadSort,
  type Density,
  type RoleFilter,
  type SquadFilter,
  type StatusFilter,
} from './matchday-ui.js';
import {
  applySquadTableView,
  readSquadDurableFilter,
  SQUAD_SYSTEM_VIEW,
  SQUAD_TABLE_SCHEMA,
} from './squad-table-schema.js';
import { SquadWorkspace } from './SquadWorkspace.js';
import type { SquadSortState } from './squad-sort.js';
import type { MatchdayState, Player } from './types.js';

vi.mock('./client.js', () => ({
  loadCoachProfile: vi.fn(() => new Promise(() => undefined)),
  loadPlayerProfile: vi.fn(() => new Promise(() => undefined)),
}));

const players: readonly Player[] = [
  {
    id: 'player-gk',
    name: 'Caio Brandão',
    shortName: 'C. Brandão',
    shirtNumber: 1,
    position: 'GK',
    age: 29,
    nationality: 'BRA',
    heightCm: 190,
    preferredFoot: 'right',
    squadRole: 'firstTeam',
    rating: 76,
    potentialRating: 76,
    matchFitness: 94,
    morale: 82,
    condition: 96,
    appearances: 14,
    goals: 0,
    assists: 0,
    averageRating: 7.02,
    selected: false,
  },
  {
    id: 'player-cm',
    name: 'Ravi Monteiro',
    shortName: 'R. Monteiro',
    shirtNumber: 10,
    position: 'CM',
    age: 24,
    nationality: 'BRA',
    heightCm: 178,
    preferredFoot: 'left',
    squadRole: 'keyPlayer',
    rating: 79,
    potentialRating: 84,
    matchFitness: 91,
    morale: 88,
    condition: 93,
    appearances: 15,
    goals: 2,
    assists: 6,
    averageRating: 7.31,
    selected: true,
  },
  {
    id: 'player-st',
    name: 'Miguel Paes de Almeida com nome português extenso',
    shortName: 'M. Almeida',
    shirtNumber: 9,
    position: 'ST',
    age: 22,
    nationality: 'POR',
    heightCm: 184,
    preferredFoot: 'right',
    squadRole: 'firstTeam',
    rating: 81,
    potentialRating: 86,
    matchFitness: 89,
    morale: 90,
    condition: 88,
    appearances: 15,
    goals: 4,
    assists: 2,
    averageRating: 7.58,
    selected: false,
  },
];

const matchdayState: MatchdayState = {
  club: {
    id: 'aurora',
    name: 'Aurora Futebol Clube',
    shortName: 'AUR',
    city: 'Curitiba',
    primaryColor: '#174c45',
  },
  opponent: {
    id: 'ferroviaria',
    name: 'Ferroviária do Vale',
    shortName: 'FDV',
    city: 'Campinas',
    primaryColor: '#7d2c2c',
  },
  round: 5,
  players,
  formation: '4-3-3',
  approach: 'balanced',
  record: {
    played: 4,
    wins: 2,
    draws: 1,
    losses: 1,
    goalsFor: 7,
    goalsAgainst: 4,
    points: 7,
  },
  lastResult: null,
};

const emptyFilter: TableViewFilterGroup = {
  kind: 'group',
  groupId: 'filters.root',
  logic: 'and',
  children: [],
};

const runCommands = (
  initial: TableViewState,
  commands: readonly TableViewCommand[],
): TableViewState =>
  commands.reduce((current, command) => {
    const result = applyTableViewCommand(SQUAD_TABLE_SCHEMA, current, command);
    if (!result.accepted) throw new Error(`Fixture command rejected: ${result.event.reason.code}`);
    return result.state;
  }, initial);

const stateWith = (...commands: readonly TableViewCommand[]): TableViewState =>
  runCommands(structuredClone(SQUAD_SYSTEM_VIEW), commands);

interface WorkspaceHarnessProps {
  readonly initialView?: TableViewState;
  readonly loading?: boolean;
  readonly initialFocusedId?: string | null;
  readonly initialSelectedIds?: readonly string[];
}

function WorkspaceHarness({
  initialView = SQUAD_SYSTEM_VIEW,
  loading = false,
  initialFocusedId = 'player-cm',
  initialSelectedIds = ['player-cm'],
}: WorkspaceHarnessProps) {
  const [view, setView] = useState(initialView);
  const viewRef = useRef(view);
  const [focusedPlayerId, setFocusedPlayerId] = useState<string | null>(initialFocusedId);
  const [selectedIds, setSelectedIds] = useState<readonly string[]>(initialSelectedIds);
  const durable = readSquadDurableFilter(view.filter);
  const primarySort = view.sort[0];
  const sortState: SquadSortState = primarySort
    ? { key: primarySort.columnId as SquadSortState['key'], direction: primarySort.direction }
    : defaultSquadSort;

  const dispatch = (command: TableViewCommand): TableViewCommandResult => {
    const result = applyTableViewCommand(SQUAD_TABLE_SCHEMA, viewRef.current, command);
    if (result.accepted) {
      viewRef.current = result.state;
      setView(result.state);
    }
    return result;
  };

  const tableResult = applySquadTableView(
    players.map((player) => ({
      ...player,
      selected: selectedIds.includes(player.id),
    })),
    view,
    { focusedPlayerId, selectedPlayerIds: selectedIds },
  );
  const setSingleSort = (sort: SquadSortState) => {
    dispatch({
      type: 'sort.set',
      sort: [{ columnId: sort.key, direction: sort.direction, nulls: 'last' }],
    });
  };

  return (
    <>
      <SquadWorkspace
        density={view.density as Density}
        dirty={false}
        error=""
        focusedPlayerId={focusedPlayerId}
        message=""
        onClearFilters={() => dispatch({ type: 'filter.set', filter: emptyFilter })}
        onDensityChange={(density) => dispatch({ type: 'density.set', density })}
        onFocusPlayer={setFocusedPlayerId}
        onOpenProfile={vi.fn()}
        onPositionFilterChange={vi.fn()}
        onPositionFilterVisibleChange={vi.fn()}
        onRoleFilterChange={vi.fn()}
        onSave={vi.fn()}
        onSaveTableView={() => true}
        onSortChange={setSingleSort}
        onSquadFilterChange={vi.fn()}
        onStatusFilterChange={vi.fn()}
        onTableViewCommand={dispatch}
        onTogglePlayer={(player) =>
          setSelectedIds((current) =>
            current.includes(player.id)
              ? current.filter((playerId) => playerId !== player.id)
              : [...current, player.id],
          )
        }
        players={tableResult.rows}
        positionFilter={durable.positions[0] ?? 'all'}
        positionFilterVisible={durable.positions.length > 0}
        query=""
        roleFilter={durable.sector as RoleFilter}
        saving={false}
        selectedIds={selectedIds}
        showPlayerDetails
        sortState={sortState}
        squadFilter={durable.lineup as SquadFilter}
        state={matchdayState}
        statusFilter={durable.status as StatusFilter}
        tableHeader={<span>Visualização controlada</span>}
        tableViewStatus={<span>Visualização padrão</span>}
        tableViewBaseline={SQUAD_SYSTEM_VIEW}
        tableViewDirty={isTableViewDirty(SQUAD_TABLE_SCHEMA, view, SQUAD_SYSTEM_VIEW)}
        tableViewLoading={loading}
        tableViewPersistenceStatus={{ status: 'idle' }}
        tableViewRepositoryStatus={{
          status: 'loaded',
          heading: 'Visualizações do elenco carregadas',
        }}
        tableViewState={view}
      />
      <pre aria-hidden="true" data-testid="workspace-view">
        {JSON.stringify(view)}
      </pre>
    </>
  );
}

function readView(): TableViewState {
  return JSON.parse(screen.getByTestId('workspace-view').textContent ?? '') as TableViewState;
}

function table() {
  return screen.getByRole('table', { name: 'Elenco principal' });
}

describe('SquadWorkspace normalized native table', () => {
  it('renders one native table with finite colgroup order, dynamic pins, and exact body spans', () => {
    const view = stateWith(
      { type: 'column.reorder', columnId: 'goals', toIndex: 4 },
      { type: 'column.resize', columnId: 'goals', width: 80 },
      { type: 'column.visibility', columnId: 'age', visible: false },
      { type: 'column.pin', columnId: 'goals', side: 'end' },
    );
    const { rerender } = render(<WorkspaceHarness initialView={view} />);
    const squadTable = table();
    const expectedVisible = view.columns.filter(({ visible }) => visible);
    const columns = [...squadTable.querySelectorAll('col')];
    const headers = within(squadTable).getAllByRole('columnheader');

    expect(squadTable).toBeInstanceOf(HTMLTableElement);
    expect(squadTable.querySelectorAll('caption')).toHaveLength(1);
    expect(squadTable.querySelectorAll('thead')).toHaveLength(1);
    expect(squadTable.querySelectorAll('tbody')).toHaveLength(1);
    expect(columns.map((column) => column.getAttribute('data-column-id'))).toEqual(
      expectedVisible.map(({ columnId }) => columnId),
    );
    expect(columns.map((column) => column.getAttribute('width'))).toEqual(
      expectedVisible.map(({ width }) => String(width)),
    );
    expect(headers.map((header) => header.getAttribute('data-column-id'))).toEqual(
      expectedVisible.map(({ columnId }) => columnId),
    );
    expect(
      within(squadTable).getByRole('columnheader', { name: /Gols/u }).getAttribute('data-pinned'),
    ).toBe('end');
    expect(
      within(squadTable)
        .getByRole('columnheader', { name: /Gols/u })
        .style.getPropertyValue('--rv-data-table-pin-offset'),
    ).toBe('0px');
    expect(squadTable.querySelector('[data-column-id="age"]')).toBeNull();

    rerender(<WorkspaceHarness initialView={view} loading />);
    const loadingCell = table().querySelector('tbody td');
    expect(loadingCell?.getAttribute('colspan')).toBe(String(expectedVisible.length));
  });

  it('cycles sort, supports Shift multi-sort, keeps header focus, and announces direction and priority', async () => {
    const user = userEvent.setup();
    render(<WorkspaceHarness initialView={stateWith({ type: 'sort.set', sort: [] })} />);
    const goalsSort = within(table()).getByRole('button', { name: 'Ordenar por Gols' });

    goalsSort.focus();
    await user.click(goalsSort);
    expect(
      within(table()).getByRole('columnheader', { name: /Gols/u }).getAttribute('aria-sort'),
    ).toBe('descending');
    expect(table().querySelector('tbody tr th[scope="row"]')?.textContent).toContain(
      'Miguel Paes de Almeida',
    );
    expect(screen.getByRole('status', { name: 'Resultado da tabela' }).textContent).toContain(
      'Gols, ordem decrescente, prioridade 1 de 1.',
    );

    const nameSort = within(table()).getByRole('button', { name: 'Ordenar por Jogador' });
    fireEvent.click(nameSort, { shiftKey: true });
    expect(readView().sort.map(({ columnId }) => columnId)).toEqual(['goals', 'name']);
    expect(screen.getByRole('status', { name: 'Resultado da tabela' }).textContent).toContain(
      'Jogador, ordem crescente, prioridade 2 de 2.',
    );

    await user.click(goalsSort);
    await user.click(goalsSort);
    expect(readView().sort.some(({ columnId }) => columnId === 'goals')).toBe(false);
    expect(document.activeElement).toBe(goalsSort);
    expect(screen.getByRole('status', { name: 'Resultado da tabela' }).textContent).toContain(
      'Gols, ordenação removida.',
    );
  });

  it('reorders and resizes live headers by keyboard and pointer with Escape rollback', async () => {
    const user = userEvent.setup();
    render(<WorkspaceHarness />);
    const originalOrder = readView().columns.map(({ columnId }) => columnId);
    const moveAge = within(table()).getByRole('button', { name: 'Ordenar por Idade' });

    moveAge.focus();
    await user.keyboard('{Alt>}{End}{/Alt}');
    expect(readView().columns.at(-1)?.columnId).toBe('age');
    expect(screen.getByRole('status', { name: 'Resultado da tabela' }).textContent).toContain(
      'Idade, posição 18 de 18.',
    );
    await user.keyboard('{Escape}');
    expect(readView().columns.map(({ columnId }) => columnId)).toEqual(originalOrder);
    expect(document.activeElement).toBe(moveAge);

    const ageHeader = moveAge.closest('th');
    if (!(ageHeader instanceof HTMLTableCellElement)) throw new Error('Age header missing.');
    const dataTransfer = {
      effectAllowed: 'none',
      setData: () => undefined,
    };
    fireEvent.dragStart(ageHeader, { dataTransfer });
    fireEvent.pointerEnter(within(table()).getByRole('columnheader', { name: /Gols/u }));
    fireEvent.dragEnd(ageHeader, { dataTransfer });
    expect(readView().columns.findIndex(({ columnId }) => columnId === 'age')).toBe(15);

    const resizeAge = within(table()).getByRole('separator', {
      name: 'Redimensionar Idade',
    });
    resizeAge.focus();
    await user.keyboard('{ArrowRight}');
    expect(readView().columns.find(({ columnId }) => columnId === 'age')?.width).toBe(72);
    await user.keyboard('{Escape}');
    expect(readView().columns.find(({ columnId }) => columnId === 'age')?.width).toBe(64);
    expect(document.activeElement).toBe(resizeAge);

    fireEvent.pointerDown(resizeAge, { pointerId: 2, clientX: 100 });
    fireEvent.pointerMove(resizeAge, { pointerId: 2, clientX: 116 });
    fireEvent.pointerUp(resizeAge, { pointerId: 2, clientX: 116 });
    expect(readView().columns.find(({ columnId }) => columnId === 'age')?.width).toBe(80);
    expect(screen.getByRole('status', { name: 'Resultado da tabela' }).textContent).toContain(
      'Idade, largura 80 pixels.',
    );
  });

  it('preserves focused player and XI selection by player ID across view transforms', async () => {
    const user = userEvent.setup();
    render(<WorkspaceHarness />);
    const selectedControl = screen.getByRole('button', { name: 'Retirar Ravi Monteiro' });
    const selectedRow = selectedControl.closest('tr');

    expect(selectedControl.getAttribute('aria-pressed')).toBe('true');
    expect(selectedRow?.getAttribute('data-focused')).toBe('true');

    await user.click(within(table()).getByRole('button', { name: 'Ordenar por Gols' }));
    await user.click(screen.getByRole('button', { name: 'Configurar tabela' }));
    await user.click(
      within(screen.getByRole('group', { name: 'Coluna Idade' })).getByRole('button', {
        name: 'Ocultar Idade',
      }),
    );

    expect(
      screen.getByRole('button', { name: 'Retirar Ravi Monteiro' }).getAttribute('aria-pressed'),
    ).toBe('true');
    expect(
      screen
        .getByRole('button', { name: 'Retirar Ravi Monteiro' })
        .closest('tr')
        ?.getAttribute('data-focused'),
    ).toBe('true');
  });

  it('renders Mostrar somente gols through ordinary columns, sort, and typed filter state', () => {
    const scorersView = stateWith(
      ...SQUAD_SYSTEM_VIEW.columns
        .filter(
          ({ columnId }) =>
            !['shirtNumber', 'info', 'name', 'position', 'goals'].includes(columnId),
        )
        .map(({ columnId }) => ({ type: 'column.visibility', columnId, visible: false }) as const),
      {
        type: 'sort.set',
        sort: [
          { columnId: 'goals', direction: 'desc', nulls: 'last' },
          { columnId: 'name', direction: 'asc', nulls: 'last' },
        ],
      },
      {
        type: 'filter.set',
        filter: {
          kind: 'group',
          groupId: 'filters.root',
          logic: 'and',
          children: [
            {
              kind: 'clause',
              filterId: 'goals.only',
              columnId: 'goals',
              operator: 'greater-than',
              value: { kind: 'number', value: 0 },
              enabled: true,
            },
          ],
        },
      },
    );
    render(<WorkspaceHarness initialView={scorersView} />);
    const squadTable = table();

    expect(
      within(squadTable)
        .getAllByRole('columnheader')
        .map((header) => header.getAttribute('data-column-id')),
    ).toEqual(['shirtNumber', 'info', 'name', 'position', 'goals']);
    expect(within(squadTable).queryByText('Caio Brandão')).toBeNull();
    expect(squadTable.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(squadTable.querySelector('tbody tr th[scope="row"]')?.textContent).toContain(
      'Miguel Paes de Almeida',
    );
  });

  it('keeps the empty recovery action inside native tbody geometry', async () => {
    const user = userEvent.setup();
    const filteredOut = stateWith({
      type: 'filter.set',
      filter: {
        kind: 'group',
        groupId: 'filters.root',
        logic: 'and',
        children: [
          {
            kind: 'clause',
            filterId: 'goals.impossible',
            columnId: 'goals',
            operator: 'greater-than',
            value: { kind: 'number', value: 99 },
            enabled: true,
          },
        ],
      },
    });
    render(<WorkspaceHarness initialView={filteredOut} />);
    const emptyCell = table().querySelector('tbody td');

    expect(emptyCell?.getAttribute('colspan')).toBe(
      String(filteredOut.columns.filter(({ visible }) => visible).length),
    );
    expect(
      within(emptyCell as HTMLTableCellElement).getByRole('heading', {
        name: 'Nenhum jogador corresponde a estes filtros',
      }),
    ).toBeInstanceOf(HTMLElement);
    await user.click(
      within(emptyCell as HTMLTableCellElement).getByRole('button', {
        name: 'Limpar filtros do elenco',
      }),
    );
    await waitFor(() => expect(table().querySelectorAll('tbody tr')).toHaveLength(3));
  });

  it('exposes deterministic density, focus, state, and responsive CSS contracts', async () => {
    const standardView = stateWith({ type: 'density.set', density: 'standard' });
    const first = render(<WorkspaceHarness initialView={standardView} />);
    const squadTable = table();

    expect(squadTable.getAttribute('data-density')).toBe('standard');
    expect(squadTable.style.getPropertyValue('--squad-row-height')).toBe('48px');
    expect(squadTable.closest('.squad-table-wrap')).toBeInstanceOf(HTMLElement);
    expect(squadTable.querySelector('[data-pinned="start"]')).toBeInstanceOf(HTMLElement);
    expect(screen.getByText('Miguel Paes de Almeida com nome português extenso')).toBeInstanceOf(
      HTMLElement,
    );
    first.unmount();

    render(
      <WorkspaceHarness
        initialView={stateWith({ type: 'density.set', density: 'comfortable' })}
        loading
      />,
    );
    expect(table().getAttribute('data-density')).toBe('comfortable');
    expect(table().style.getPropertyValue('--squad-row-height')).toBe('54px');
    expect(table().getAttribute('aria-busy')).toBe('true');

    const css = await readFile(resolve('apps/desktop/src/matchday/matchday.css'), 'utf8');
    expect(css).toMatch(/\.squad-table-wrap\s*\{[^}]*overflow:\s*auto;/su);
    expect(css).toContain('min(304px, calc(35% - var(--rv-space-3)))');
    expect(css).toContain('@media (max-width: 1120px)');
    expect(css).toMatch(
      /\.table-view-customizer\s*\{[^}]*width:\s*min\(24rem,[^}]*grid-template-rows:\s*auto minmax\(0, 1fr\);[^}]*overflow:\s*hidden;/su,
    );
    expect(css).toMatch(
      /\.table-view-customizer__content\s*\{[^}]*max-height:\s*min\(\s*28rem,[^}]*overflow-y:\s*auto;/su,
    );
    expect(css).not.toContain(':has(> .table-view-customizer)');
    expect(css).toContain("[data-pinned='start']");
    expect(css).toContain('left: var(--squad-pin-offset)');
    expect(css).toContain('right: var(--squad-pin-offset)');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toContain('.table-view-customizer__column');
    expect(css).not.toMatch(/\.squad-table[^{,\n]*nth-child/iu);
  });
});
