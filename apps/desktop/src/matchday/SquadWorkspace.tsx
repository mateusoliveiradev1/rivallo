import { Icon } from '@rivallo/icons';
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';

import {
  type TableViewColumnSchema,
  type TableViewColumnState,
  type TableViewCommand,
  type TableViewCommandResult,
  type TableViewState,
} from '../table-view/table-view-engine.js';

import { Button } from '../ui/primitives/actions.js';
import { NationalityDisplay } from '../ui/Nationality/index.js';
import { Popover, Tooltip } from '../ui/primitives/disclosure.js';
import { Skeleton } from '../ui/primitives/feedback.js';
import {
  positionLabels,
  positionLongLabels,
  preferredFootLabels,
  squadColumnLabels,
  squadColumnSortLabels,
  squadRoleLabels,
  squadSortPresets,
  type Density,
  type OptionalColumn,
  type RoleFilter,
  type SquadFilter,
  type StatusFilter,
} from './matchday-ui.js';
import { PlayerFace } from './PlayerFace.js';
import { SQUAD_TABLE_SCHEMA, type SquadColumnId } from './squad-table-schema.js';
import { TableViewCustomizer } from './TableViewCustomizer.js';
import type { SortKey, SquadSortState } from './squad-sort.js';
import type { MatchdayState, Player } from './types.js';
import type {
  SquadTableViewPersistenceStatus,
  SquadTableViewRepositoryStatus,
} from './use-squad-table-view.js';

const descendingFirstColumns = new Set<SortKey>([
  'rating',
  'potentialRating',
  'matchFitness',
  'morale',
  'condition',
  'appearances',
  'goals',
  'assists',
  'averageRating',
]);

const averageRatingFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const densityLabels: Record<Density, string> = {
  compact: 'Compacta',
  standard: 'Padrão',
  comfortable: 'Confortável',
};

interface HeaderOperationSession {
  readonly kind: 'move' | 'resize';
  readonly input: 'keyboard' | 'pointer';
  readonly columnId: string;
  readonly snapshot: TableViewState;
  readonly startX?: number;
  readonly startWidth?: number;
}

const asResetBaseline = (snapshot: TableViewState, current: TableViewState): TableViewState => ({
  ...snapshot,
  viewId: current.baselineViewId,
  baselineViewId: current.baselineViewId,
});

const calculatePinOffsets = (
  columns: readonly TableViewColumnState[],
): ReadonlyMap<string, number> => {
  const offsets = new Map<string, number>();

  for (const side of ['start', 'end'] as const) {
    let offset = 0;
    const pinned = columns
      .filter((column) => column.visible && column.pinning.side === side)
      .sort(
        (left, right) =>
          (left.pinning.order ?? Number.MAX_SAFE_INTEGER) -
          (right.pinning.order ?? Number.MAX_SAFE_INTEGER),
      );
    for (const column of pinned) {
      offsets.set(column.columnId, offset);
      offset += column.width;
    }
  }

  return offsets;
};

const renderReadiness = (value: number): ReactNode => (
  <span className="condition-cell" data-attention={value < 90 || undefined}>
    <i aria-hidden="true">
      <b style={{ '--condition': `${value}%` } as CSSProperties} />
    </i>
    <strong>{value}%</strong>
  </span>
);

const renderOptionalPlayerValue = (player: Player, column: OptionalColumn): ReactNode => {
  switch (column) {
    case 'age':
      return player.age;
    case 'nationality':
      return <NationalityDisplay codes={[player.nationality]} />;
    case 'heightCm':
      return `${Math.floor(player.heightCm / 100)},${String(player.heightCm % 100).padStart(2, '0')} m`;
    case 'preferredFoot':
      return preferredFootLabels[player.preferredFoot];
    case 'squadRole':
      return (
        <span className="importance-label" data-level={squadRoleLabels[player.squadRole]}>
          {squadRoleLabels[player.squadRole]}
        </span>
      );
    case 'rating':
      return <strong className="rating-value">{player.rating}</strong>;
    case 'potentialRating':
      return <strong className="rating-value">{player.potentialRating}</strong>;
    case 'matchFitness':
      return renderReadiness(player.matchFitness);
    case 'morale':
      return `${player.morale}%`;
    case 'condition':
      return renderReadiness(player.condition);
    case 'appearances':
      return player.appearances;
    case 'goals':
      return player.goals;
    case 'assists':
      return player.assists;
    case 'averageRating':
      return averageRatingFormatter.format(player.averageRating);
  }
};

interface SquadWorkspaceProps {
  readonly state: MatchdayState;
  readonly players: readonly Player[];
  readonly selectedIds: readonly string[];
  readonly focusedPlayerId: string | null;
  readonly query: string;
  readonly squadFilter: SquadFilter;
  readonly sortState: SquadSortState;
  readonly roleFilter: RoleFilter;
  readonly statusFilter: StatusFilter;
  readonly positionFilter: 'all' | Player['position'];
  readonly positionFilterVisible: boolean;
  readonly density: Density;
  readonly showPlayerDetails: boolean;
  readonly tableViewRepositoryStatus: SquadTableViewRepositoryStatus;
  readonly tableViewPersistenceStatus: SquadTableViewPersistenceStatus;
  readonly tableHeader: ReactNode;
  readonly tableViewState: TableViewState;
  readonly tableViewBaseline: TableViewState;
  readonly tableViewDirty: boolean;
  readonly tableViewLoading: boolean;
  readonly dirty: boolean;
  readonly message: string;
  readonly error: string;
  readonly saving: boolean;
  readonly onFocusPlayer: (playerId: string) => void;
  readonly onTogglePlayer: (player: Player) => void;
  readonly onSave: () => void;
  readonly onClearFilters: () => void;
  readonly onSquadFilterChange: (filter: SquadFilter) => void;
  readonly onSortChange: (sort: SquadSortState) => void;
  readonly onRoleFilterChange: (filter: RoleFilter) => void;
  readonly onStatusFilterChange: (filter: StatusFilter) => void;
  readonly onPositionFilterChange: (filter: 'all' | Player['position']) => void;
  readonly onPositionFilterVisibleChange: (visible: boolean) => void;
  readonly onDensityChange: (density: Density) => void;
  readonly onTableViewCommand: (command: TableViewCommand) => TableViewCommandResult;
  readonly onSaveTableView: () => boolean | void | Promise<boolean | void>;
}

export function SquadWorkspace({
  state,
  players,
  selectedIds,
  focusedPlayerId,
  query,
  squadFilter,
  sortState,
  roleFilter,
  statusFilter,
  positionFilter,
  positionFilterVisible,
  density,
  showPlayerDetails,
  tableViewRepositoryStatus,
  tableViewPersistenceStatus,
  tableHeader,
  tableViewState,
  tableViewBaseline,
  tableViewDirty,
  tableViewLoading,
  dirty,
  message,
  error,
  saving,
  onFocusPlayer,
  onTogglePlayer,
  onSave,
  onClearFilters,
  onSquadFilterChange,
  onSortChange,
  onRoleFilterChange,
  onStatusFilterChange,
  onPositionFilterChange,
  onPositionFilterVisibleChange,
  onDensityChange,
  onTableViewCommand,
  onSaveTableView,
}: SquadWorkspaceProps) {
  const [openTableControl, setOpenTableControl] = useState<'density' | null>(null);
  const focusedPlayer =
    state.players.find((player) => player.id === focusedPlayerId) ?? state.players[0];
  const focusedIndex = focusedPlayer
    ? state.players.findIndex((player) => player.id === focusedPlayer.id)
    : -1;
  const focusedSelected = focusedPlayer ? selectedIds.includes(focusedPlayer.id) : false;
  const activeSortPreset =
    squadSortPresets.find(
      ({ sort }) => sort.key === sortState.key && sort.direction === sortState.direction,
    )?.id ?? 'custom';
  const hasActiveFilters =
    query.length > 0 ||
    squadFilter !== 'all' ||
    roleFilter !== 'all' ||
    statusFilter !== 'all' ||
    positionFilterVisible;
  const tableViewBusy =
    tableViewRepositoryStatus.status === 'loading' ||
    tableViewPersistenceStatus.status === 'saving';
  const updateTableControl = (control: 'density', open: boolean) =>
    setOpenTableControl((current) => (open ? control : current === control ? null : current));
  const [tableAnnouncement, setTableAnnouncement] = useState('');
  const [headerOperation, setHeaderOperation] = useState<HeaderOperationSession | null>(null);
  const headerOperationRef = useRef<HeaderOperationSession | null>(null);
  const tableViewStateRef = useRef(tableViewState);
  const schemaById = new Map(SQUAD_TABLE_SCHEMA.columns.map((column) => [column.columnId, column]));
  const visibleColumnStates = tableViewState.columns.filter(({ visible }) => visible);
  const pinOffsets = calculatePinOffsets(visibleColumnStates);

  useEffect(() => {
    tableViewStateRef.current = tableViewState;
  }, [tableViewState]);

  const announceTable = (message: string) => {
    setTableAnnouncement((current) => (current === message ? current : message));
  };

  const dispatchTableView = (command: TableViewCommand): TableViewCommandResult => {
    const result = onTableViewCommand(command);
    if (result.accepted) tableViewStateRef.current = result.state;
    return result;
  };

  const setHeaderSession = (session: HeaderOperationSession | null) => {
    headerOperationRef.current = session;
    setHeaderOperation(session);
  };

  const beginHeaderSession = (
    kind: HeaderOperationSession['kind'],
    input: HeaderOperationSession['input'],
    columnId: string,
    pointer?: { readonly startX: number; readonly startWidth: number },
  ) => {
    if (headerOperationRef.current !== null) return;
    setHeaderSession({
      kind,
      input,
      columnId,
      snapshot: tableViewStateRef.current,
      ...(pointer === undefined ? {} : pointer),
    });
  };

  const restoreHeaderOperation = () => {
    const activeOperation = headerOperationRef.current;
    if (activeOperation === null) return;
    const focusTarget =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const label = schemaById.get(activeOperation.columnId)?.label ?? activeOperation.columnId;
    const result = dispatchTableView({
      type: 'view.reset',
      baseline: asResetBaseline(activeOperation.snapshot, tableViewStateRef.current),
    });
    if (result.accepted) announceTable(`${label}, operação desfeita.`);
    setHeaderSession(null);
    focusTarget?.focus();
  };

  const moveHeader = (columnId: string, toIndex: number) => {
    const result = dispatchTableView({ type: 'column.reorder', columnId, toIndex });
    const label = schemaById.get(columnId)?.label ?? columnId;
    if (result.accepted) {
      const position = result.state.columns.findIndex((column) => column.columnId === columnId);
      announceTable(`${label}, posição ${position + 1} de ${result.state.columns.length}.`);
    } else {
      announceTable(`${label}: esta posição não pode ser aplicada.`);
    }
  };

  const handleHeaderMoveKeyDown = (event: KeyboardEvent<HTMLButtonElement>, columnId: string) => {
    const active = headerOperationRef.current;
    const moving = active?.kind === 'move' && active.columnId === columnId;
    if (!moving && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      beginHeaderSession('move', 'keyboard', columnId);
      return;
    }
    if (!moving) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setHeaderSession(null);
      return;
    }
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
      return;
    }
    event.preventDefault();
    const currentIndex = tableViewStateRef.current.columns.findIndex(
      (column) => column.columnId === columnId,
    );
    const lastIndex = tableViewStateRef.current.columns.length - 1;
    const nextIndex =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? lastIndex
          : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
            ? Math.max(0, currentIndex - 1)
            : Math.min(lastIndex, currentIndex + 1);
    moveHeader(columnId, nextIndex);
  };

  const handleHeaderMovePointerDown = (
    event: PointerEvent<HTMLButtonElement>,
    columnId: string,
  ) => {
    beginHeaderSession('move', 'pointer', columnId);
    event.currentTarget.focus();
  };

  const movePointerToHeader = (targetColumnId: string) => {
    const active = headerOperationRef.current;
    if (active?.kind !== 'move' || active.input !== 'pointer') return;
    const targetIndex = tableViewStateRef.current.columns.findIndex(
      (column) => column.columnId === targetColumnId,
    );
    if (targetIndex >= 0) moveHeader(active.columnId, targetIndex);
  };

  const finishHeaderPointerMove = () => {
    if (
      headerOperationRef.current?.kind === 'move' &&
      headerOperationRef.current.input === 'pointer'
    ) {
      setHeaderSession(null);
    }
  };

  const handleHeaderDragStart = (event: DragEvent<HTMLButtonElement>, columnId: string) => {
    beginHeaderSession('move', 'pointer', columnId);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', columnId);
  };

  const resizeHeader = (columnId: string, width: number) => {
    const result = dispatchTableView({ type: 'column.resize', columnId, width });
    const label = schemaById.get(columnId)?.label ?? columnId;
    if (result.accepted) {
      const nextWidth =
        result.state.columns.find((column) => column.columnId === columnId)?.width ?? width;
      announceTable(`${label}, largura ${nextWidth} pixels.`);
    } else {
      announceTable(`${label}: esta largura não pode ser aplicada.`);
    }
  };

  const handleHeaderResizeKeyDown = (
    event: KeyboardEvent<HTMLSpanElement>,
    columnSchema: TableViewColumnSchema,
  ) => {
    if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      if (
        headerOperationRef.current?.kind !== 'resize' ||
        headerOperationRef.current.columnId !== columnSchema.columnId
      ) {
        beginHeaderSession('resize', 'keyboard', columnSchema.columnId);
      }
      const currentWidth =
        tableViewStateRef.current.columns.find(
          (column) => column.columnId === columnSchema.columnId,
        )?.width ?? columnSchema.width.default;
      const step = event.shiftKey ? 24 : 8;
      const width =
        event.key === 'Home'
          ? columnSchema.width.min
          : event.key === 'End'
            ? columnSchema.width.max
            : event.key === 'ArrowLeft'
              ? currentWidth - step
              : currentWidth + step;
      resizeHeader(columnSchema.columnId, width);
      return;
    }
    if (
      event.key === 'Enter' &&
      headerOperationRef.current?.kind === 'resize' &&
      headerOperationRef.current.columnId === columnSchema.columnId
    ) {
      event.preventDefault();
      setHeaderSession(null);
    }
  };

  const handleHeaderResizePointerDown = (
    event: PointerEvent<HTMLSpanElement>,
    columnSchema: TableViewColumnSchema,
  ) => {
    const currentWidth =
      tableViewStateRef.current.columns.find((column) => column.columnId === columnSchema.columnId)
        ?.width ?? columnSchema.width.default;
    beginHeaderSession('resize', 'pointer', columnSchema.columnId, {
      startX: event.clientX,
      startWidth: currentWidth,
    });
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handleHeaderResizePointerMove = (event: PointerEvent<HTMLSpanElement>) => {
    const active = headerOperationRef.current;
    if (
      active?.kind !== 'resize' ||
      active.input !== 'pointer' ||
      active.startX === undefined ||
      active.startWidth === undefined
    ) {
      return;
    }
    resizeHeader(active.columnId, active.startWidth + event.clientX - active.startX);
  };

  const finishHeaderPointerResize = (event: PointerEvent<HTMLSpanElement>) => {
    if (
      headerOperationRef.current?.kind !== 'resize' ||
      headerOperationRef.current.input !== 'pointer'
    ) {
      return;
    }
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    setHeaderSession(null);
  };

  const cycleHeaderSort = (columnSchema: TableViewColumnSchema, shiftKey: boolean) => {
    const currentSort = tableViewStateRef.current.sort;
    const currentIndex = currentSort.findIndex(
      (clause) => clause.columnId === columnSchema.columnId,
    );
    const currentClause = currentSort[currentIndex];
    const descendingFirst = descendingFirstColumns.has(columnSchema.columnId as SortKey);
    const nextDirection: 'asc' | 'desc' | null =
      currentClause === undefined
        ? descendingFirst
          ? 'desc'
          : 'asc'
        : currentClause.direction === (descendingFirst ? 'desc' : 'asc')
          ? descendingFirst
            ? 'asc'
            : 'desc'
          : null;
    let nextSort = shiftKey ? [...currentSort] : [];

    if (shiftKey && currentIndex >= 0) nextSort.splice(currentIndex, 1);
    if (nextDirection !== null) {
      const nextClause = {
        columnId: columnSchema.columnId,
        direction: nextDirection,
        nulls: 'last' as const,
      };
      if (shiftKey)
        nextSort.splice(currentIndex >= 0 ? currentIndex : nextSort.length, 0, nextClause);
      else nextSort = [nextClause];
    }

    const result = dispatchTableView({ type: 'sort.set', sort: nextSort });
    if (!result.accepted) {
      announceTable(`${columnSchema.label}: use no máximo três critérios de ordenação.`);
      return;
    }

    const nextIndex = result.state.sort.findIndex(
      (clause) => clause.columnId === columnSchema.columnId,
    );
    if (nextIndex < 0) {
      announceTable(`${columnSchema.label}, ordenação removida.`);
      return;
    }
    const clause = result.state.sort[nextIndex];
    announceTable(
      `${columnSchema.label}, ordem ${clause.direction === 'asc' ? 'crescente' : 'decrescente'}, prioridade ${nextIndex + 1} de ${result.state.sort.length}.`,
    );
  };

  return (
    <section
      aria-busy={tableViewBusy || undefined}
      aria-labelledby="squad-screen-title"
      className="screen-view squad-view"
      data-table-view-status={tableViewRepositoryStatus.status}
    >
      <header className="screen-heading">
        <div>
          <span>ELENCO · PLANTEL PRINCIPAL</span>
          <h1 id="squad-screen-title">Visão geral do elenco</h1>
        </div>
        <div
          className="fixture-summary"
          aria-label={`${state.club.name} contra ${state.opponent.name}`}
        >
          <span>Próximo jogo · Rodada {state.round}</span>
          <strong>
            {state.club.shortName} <i>20:30</i> {state.opponent.shortName}
          </strong>
        </div>
      </header>

      <nav aria-label="Seções do elenco" className="section-tabs">
        <button aria-current="page" type="button">
          Jogadores
        </button>
        <button disabled title="Em breve" type="button">
          Internacional
        </button>
        <button disabled title="Em breve" type="button">
          Empréstimos
        </button>
        <button disabled title="Em breve" type="button">
          Numeração
        </button>
        <button disabled title="Em breve" type="button">
          Planejamento
        </button>
      </nav>

      <section aria-label="Filtros do elenco" className="squad-toolbar">
        <label className="toolbar-field toolbar-field--accent">
          <Icon name="filter" size={16} />
          <span>Visualização</span>
          <select
            aria-label="Filtro rápido"
            onChange={(event) => onSquadFilterChange(event.target.value as SquadFilter)}
            value={squadFilter}
          >
            <option value="all">Todos</option>
            <option value="selected">Titulares</option>
            <option value="reserve">Reservas</option>
          </select>
        </label>
        <label className="toolbar-field">
          <span>Ordenar</span>
          <select
            aria-label="Ordenar elenco"
            onChange={(event) => {
              const preset = squadSortPresets.find(({ id }) => id === event.target.value);
              if (preset) onSortChange(preset.sort);
            }}
            value={activeSortPreset}
          >
            {activeSortPreset === 'custom' && <option value="custom">Personalizada</option>}
            {squadSortPresets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label}
              </option>
            ))}
          </select>
        </label>
        <label className="toolbar-field">
          <span>Setor</span>
          <select
            aria-label="Filtrar por setor"
            onChange={(event) => onRoleFilterChange(event.target.value as RoleFilter)}
            value={roleFilter}
          >
            <option value="all">Todos</option>
            <option value="goalkeepers">Goleiros</option>
            <option value="defenders">Defesa</option>
            <option value="midfielders">Meio-campo</option>
            <option value="attackers">Ataque</option>
          </select>
        </label>
        <label className="toolbar-field">
          <span>Status</span>
          <select
            aria-label="Filtrar por condição"
            onChange={(event) => onStatusFilterChange(event.target.value as StatusFilter)}
            value={statusFilter}
          >
            <option value="all">Todos</option>
            <option value="ready">Prontos</option>
            <option value="attention">Atenção</option>
          </select>
        </label>
        {positionFilterVisible && (
          <label className="toolbar-field toolbar-field--position">
            <span>Posição</span>
            <select
              aria-label="Filtrar por posição"
              onChange={(event) =>
                onPositionFilterChange(event.target.value as 'all' | Player['position'])
              }
              value={positionFilter}
            >
              <option value="all">Todas</option>
              {Object.entries(positionLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        )}
        <span className="squad-toolbar__spacer" />
        <button
          className="toolbar-action"
          disabled={!hasActiveFilters}
          onClick={onClearFilters}
          type="button"
        >
          <Icon name="close" size={16} />
          Limpar filtros do elenco
        </button>
        <button
          className="toolbar-action toolbar-action--accent"
          onClick={() => {
            if (positionFilterVisible) onPositionFilterChange('all');
            onPositionFilterVisibleChange(!positionFilterVisible);
          }}
          type="button"
        >
          <Icon name={positionFilterVisible ? 'close' : 'add'} size={16} />
          {positionFilterVisible ? 'Remover posição' : 'Adicionar filtro'}
        </button>
      </section>

      <div
        className="squad-layout"
        data-details={(showPlayerDetails && Boolean(focusedPlayer)) || undefined}
        data-density={density}
      >
        <section className="squad-panel" aria-labelledby="players-title">
          <header className="squad-panel__header">
            <div className="squad-panel__title">
              <h2 id="players-title">{players.length} jogadores</h2>
              <span>{state.club.name} · plantel principal</span>
            </div>
            {tableHeader}
            <div className="table-controls">
              <span>Densidade</span>
              <Popover
                align="end"
                contentClassName="table-control-popover density-picker"
                onOpenChange={(open) => updateTableControl('density', open)}
                open={openTableControl === 'density'}
                title="Densidade do elenco"
                triggerAccessibleLabel={`Alterar densidade da tabela: ${densityLabels[density]}`}
                triggerClassName="density-picker__trigger"
                triggerContent={
                  <>
                    <i aria-hidden="true" data-lines={density} />
                    <span>{densityLabels[density]}</span>
                  </>
                }
                triggerLabel="Densidade"
                triggerTooltip="Alterar espaçamento das linhas"
              >
                <div aria-label="Densidade da tabela" className="density-picker__menu" role="group">
                  {(['compact', 'standard', 'comfortable'] as const).map((densityOption) => (
                    <button
                      aria-label={`Densidade ${densityOption === 'compact' ? 'compacta' : densityOption === 'standard' ? 'padrão' : 'confortável'}`}
                      aria-pressed={density === densityOption}
                      className="density-option"
                      key={densityOption}
                      onClick={() => {
                        onDensityChange(densityOption);
                        setOpenTableControl(null);
                      }}
                      type="button"
                    >
                      <i aria-hidden="true" data-lines={densityOption} />
                      <span>{densityLabels[densityOption]}</span>
                      <b>{density === densityOption ? 'Atual' : 'Selecionar'}</b>
                    </button>
                  ))}
                </div>
              </Popover>
              <TableViewCustomizer
                baseline={tableViewBaseline}
                busy={tableViewBusy}
                dirty={tableViewDirty}
                dispatch={dispatchTableView}
                onSave={onSaveTableView}
                schema={SQUAD_TABLE_SCHEMA}
                state={tableViewState}
              />
            </div>
          </header>

          <div className="squad-table-wrap">
            <table
              aria-busy={tableViewLoading || undefined}
              className="squad-table squad-table--controlled"
              data-density={density}
              style={
                {
                  '--squad-row-height': `${
                    SQUAD_TABLE_SCHEMA.densities.find(({ densityId }) => densityId === density)
                      ?.rowHeight ?? 44
                  }px`,
                } as CSSProperties
              }
              onKeyDownCapture={(event) => {
                if (event.key !== 'Escape' || headerOperationRef.current === null) return;
                event.preventDefault();
                event.stopPropagation();
                restoreHeaderOperation();
              }}
            >
              <caption className="sr-only">Elenco principal</caption>
              <colgroup>
                {visibleColumnStates.map((column) => (
                  <col
                    data-column-id={column.columnId}
                    key={column.columnId}
                    style={{ width: `${column.width}px` }}
                    width={column.width}
                  />
                ))}
              </colgroup>
              <thead>
                <tr>
                  {visibleColumnStates.map((columnState) => {
                    const columnSchema = schemaById.get(columnState.columnId);
                    if (columnSchema === undefined) return null;
                    const sortIndex = tableViewState.sort.findIndex(
                      (clause) => clause.columnId === columnState.columnId,
                    );
                    const activeSort = tableViewState.sort[sortIndex];
                    const pinned = columnState.pinning.side;
                    const pinOffset = pinOffsets.get(columnState.columnId) ?? 0;
                    const moving =
                      headerOperation?.kind === 'move' &&
                      headerOperation.columnId === columnState.columnId;
                    const resizing =
                      headerOperation?.kind === 'resize' &&
                      headerOperation.columnId === columnState.columnId;
                    const columnId = columnState.columnId as SquadColumnId;

                    return (
                      <th
                        aria-sort={
                          activeSort === undefined
                            ? undefined
                            : activeSort.direction === 'asc'
                              ? 'ascending'
                              : 'descending'
                        }
                        data-column={columnState.columnId}
                        data-column-id={columnState.columnId}
                        data-moving={moving || undefined}
                        data-pinned={pinned === 'none' ? undefined : pinned}
                        data-resizing={resizing || undefined}
                        key={columnState.columnId}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => {
                          event.preventDefault();
                          movePointerToHeader(columnState.columnId);
                          finishHeaderPointerMove();
                        }}
                        onPointerEnter={() => movePointerToHeader(columnState.columnId)}
                        scope="col"
                        style={
                          {
                            '--squad-column-width': `${columnState.width}px`,
                            '--squad-pin-offset': `${pinOffset}px`,
                          } as CSSProperties
                        }
                      >
                        <div className="squad-table__header">
                          <button
                            aria-label={`Ordenar por ${columnSchema.label}`}
                            className="squad-table__sort"
                            data-active={activeSort !== undefined || undefined}
                            onClick={(event) => cycleHeaderSort(columnSchema, event.shiftKey)}
                            title={squadColumnSortLabels[columnId]}
                            type="button"
                          >
                            <span>{squadColumnLabels[columnId]}</span>
                            {activeSort !== undefined && (
                              <span aria-hidden="true">
                                {activeSort.direction === 'asc' ? '↑' : '↓'}
                                {tableViewState.sort.length > 1 ? sortIndex + 1 : ''}
                              </span>
                            )}
                          </button>
                          <button
                            aria-label={`Mover coluna ${columnSchema.label}`}
                            aria-pressed={moving}
                            className="squad-table__move"
                            draggable
                            onDragEnd={finishHeaderPointerMove}
                            onDragStart={(event) =>
                              handleHeaderDragStart(event, columnState.columnId)
                            }
                            onKeyDown={(event) =>
                              handleHeaderMoveKeyDown(event, columnState.columnId)
                            }
                            onPointerDown={(event) =>
                              handleHeaderMovePointerDown(event, columnState.columnId)
                            }
                            onPointerUp={finishHeaderPointerMove}
                            type="button"
                          >
                            <span aria-hidden="true">↔</span>
                          </button>
                          <span
                            aria-label={`Redimensionar coluna ${columnSchema.label}`}
                            aria-orientation="vertical"
                            aria-valuemax={columnSchema.width.max}
                            aria-valuemin={columnSchema.width.min}
                            aria-valuenow={columnState.width}
                            className="squad-table__resize"
                            onKeyDown={(event) => handleHeaderResizeKeyDown(event, columnSchema)}
                            onPointerDown={(event) =>
                              handleHeaderResizePointerDown(event, columnSchema)
                            }
                            onPointerMove={handleHeaderResizePointerMove}
                            onPointerUp={finishHeaderPointerResize}
                            role="separator"
                            tabIndex={0}
                          />
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {tableViewLoading
                  ? Array.from({ length: 5 }, (_, index) => (
                      <tr
                        aria-hidden="true"
                        className="squad-table__skeleton-row"
                        key={`table-view-loading-controlled-${index}`}
                      >
                        <td colSpan={visibleColumnStates.length}>
                          <Skeleton />
                        </td>
                      </tr>
                    ))
                  : players.map((player) => {
                      const playerIndex = state.players.findIndex(
                        (candidate) => candidate.id === player.id,
                      );
                      const selected = selectedIds.includes(player.id);
                      const focused = player.id === focusedPlayerId;

                      return (
                        <tr
                          data-focused={focused || undefined}
                          data-player-id={player.id}
                          key={player.id}
                          onClick={() => onFocusPlayer(player.id)}
                        >
                          {visibleColumnStates.map((columnState) => {
                            const columnId = columnState.columnId as SquadColumnId;
                            const pinned = columnState.pinning.side;
                            const pinOffset = pinOffsets.get(columnState.columnId) ?? 0;
                            const cellProps = {
                              'data-column-id': columnState.columnId,
                              'data-pinned': pinned === 'none' ? undefined : pinned,
                              style: {
                                '--squad-column-width': `${columnState.width}px`,
                                '--squad-pin-offset': `${pinOffset}px`,
                              } as CSSProperties,
                            };

                            if (columnId === 'shirtNumber') {
                              return (
                                <td {...cellProps} className="squad-number" key={columnId}>
                                  {player.shirtNumber}
                                </td>
                              );
                            }
                            if (columnId === 'info') {
                              return (
                                <td {...cellProps} key={columnId}>
                                  <Tooltip
                                    content={
                                      selected
                                        ? 'Retirar do XI'
                                        : 'Escalar no primeiro espaço livre'
                                    }
                                  >
                                    <button
                                      aria-label={`${selected ? 'Retirar' : 'Escalar'} ${player.name}`}
                                      aria-pressed={selected}
                                      className="lineup-control"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        onFocusPlayer(player.id);
                                        onTogglePlayer(player);
                                      }}
                                      onFocus={() => onFocusPlayer(player.id)}
                                      type="button"
                                    >
                                      {selected ? 'XI' : '+'}
                                    </button>
                                  </Tooltip>
                                </td>
                              );
                            }
                            if (columnId === 'name') {
                              return (
                                <th {...cellProps} key={columnId} scope="row">
                                  <span className="squad-player-cell">
                                    <PlayerFace
                                      decorative
                                      index={playerIndex}
                                      name={player.name}
                                      size={36}
                                    />
                                    <span className="player-identity">
                                      <strong>{player.name}</strong>
                                      <small>{positionLongLabels[player.position]}</small>
                                    </span>
                                  </span>
                                </th>
                              );
                            }
                            if (columnId === 'position') {
                              return (
                                <td {...cellProps} key={columnId}>
                                  <span className="position-badge">
                                    {positionLabels[player.position]}
                                  </span>
                                </td>
                              );
                            }

                            return (
                              <td {...cellProps} key={columnId}>
                                {renderOptionalPlayerValue(player, columnId as OptionalColumn)}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}

                {!tableViewLoading && players.length === 0 && (
                  <tr className="squad-table__state-row">
                    <td colSpan={visibleColumnStates.length}>
                      <section className="squad-empty">
                        <Icon name="search" size={20} />
                        <h3>Nenhum jogador corresponde a estes filtros</h3>
                        <p>Revise os filtros ativos para voltar a exibir o plantel.</p>
                        <Button onClick={onClearFilters} variant="secondary">
                          Limpar filtros do elenco
                        </Button>
                      </section>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <p
              aria-atomic="true"
              aria-label="Resultado da tabela"
              aria-live="polite"
              className="sr-only"
              role="status"
            >
              {tableAnnouncement}
            </p>
          </div>

          <footer className="squad-panel__footer">
            <span>
              <i data-tone="starter" /> XI atual
            </span>
            <span>
              <i data-tone="attention" /> Atenção física
            </span>
            <span>
              <i data-tone="available" /> Disponível
            </span>
            <span
              className="save-state"
              data-dirty={dirty || undefined}
              data-error={Boolean(error) || undefined}
              role={error ? 'alert' : 'status'}
              title={error || message || undefined}
            >
              {error || message || (dirty ? 'Alterações não salvas' : 'Escalação salva localmente')}
            </span>
          </footer>
        </section>

        {showPlayerDetails && focusedPlayer && (
          <aside className="player-dossier" aria-label={`Resumo de ${focusedPlayer.name}`}>
            <header>
              <PlayerFace decorative index={focusedIndex} name={focusedPlayer.name} size={96} />
              <div>
                <span>{positionLongLabels[focusedPlayer.position]}</span>
                <h2>{focusedPlayer.name}</h2>
                <small className="dossier-meta">
                  <span>
                    Camisa {focusedPlayer.shirtNumber} · {focusedPlayer.age} anos ·
                  </span>
                  <NationalityDisplay codes={[focusedPlayer.nationality]} enableKeyboardTooltip />
                </small>
              </div>
              <strong className="dossier-rating">
                <b>{focusedPlayer.rating}</b>
                <small>OVR</small>
              </strong>
            </header>
            <section className="dossier-readiness">
              <div>
                <span>Condição para o jogo</span>
                <strong>{focusedPlayer.condition}%</strong>
              </div>
              <i aria-hidden="true">
                <b style={{ '--condition': `${focusedPlayer.condition}%` } as CSSProperties} />
              </i>
              <p>
                {focusedPlayer.condition >= 90
                  ? 'Pronto para iniciar'
                  : 'Requer atenção da comissão'}
              </p>
            </section>
            <dl className="dossier-facts">
              <div>
                <dt>Posição natural</dt>
                <dd>{positionLabels[focusedPlayer.position]}</dd>
              </div>
              <div>
                <dt>Papel no elenco</dt>
                <dd>{squadRoleLabels[focusedPlayer.squadRole]}</dd>
              </div>
              <div>
                <dt>Temporada</dt>
                <dd>
                  {focusedPlayer.appearances} J · {focusedPlayer.goals} G · {focusedPlayer.assists}{' '}
                  A
                </dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{focusedSelected ? 'No XI inicial' : 'Disponível no banco'}</dd>
              </div>
            </dl>
            <section className="dossier-note">
              <Icon name="information" size={16} />
              <p>Selecione o jogador e ajuste sua posição detalhada na tela de Táticas.</p>
            </section>
            <footer>
              <Button
                leadingIcon={focusedSelected ? 'close' : 'add'}
                onClick={() => onTogglePlayer(focusedPlayer)}
                variant="secondary"
              >
                {focusedSelected ? 'Retirar do XI' : 'Escalar no XI'}
              </Button>
              <Button
                disabled={!dirty}
                leadingIcon="save"
                loading={saving}
                loadingLabel="Salvando…"
                onClick={onSave}
                variant="primary"
              >
                Salvar escalação
              </Button>
            </footer>
          </aside>
        )}
      </div>
    </section>
  );
}
