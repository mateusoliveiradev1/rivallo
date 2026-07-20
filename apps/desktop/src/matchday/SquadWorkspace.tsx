import { Icon } from '@rivallo/icons';
import { getCoreRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table';
import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';

import {
  type TableViewColumnState,
  type TableViewCommand,
  type TableViewCommandResult,
  type TableViewState,
} from '../table-view/table-view-engine.js';
import { PlayerInspector } from '../profiles/components.js';
import { EntityLink, NationalityEntityLink } from '../profiles/EntityProfileSystem.js';

import {
  DataTableHeader,
  DataTableWorkspaceHeader,
  TableDensityControl,
  type TablePreferencesAdapter,
} from '../ui/DataTable/index.js';
import { Button } from '../ui/primitives/actions.js';
import { NationalityDisplay } from '../ui/Nationality/index.js';
import { Tooltip } from '../ui/primitives/disclosure.js';
import { Skeleton } from '../ui/primitives/feedback.js';
import {
  positionLabels,
  positionLongLabels,
  preferredFootLabels,
  squadRoleLabels,
  squadSortPresets,
  type Density,
  type OptionalColumn,
  type RoleFilter,
  type SquadFilter,
  type StatusFilter,
} from './matchday-ui.js';
import { PlayerFace } from './PlayerFace.js';
import { SQUAD_TABLE_DEFINITION } from './squad-table-definition.js';
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

const squadViewPresets = [
  {
    id: 'management',
    label: 'Gestão',
    columns: [
      'shirtNumber',
      'info',
      'name',
      'position',
      'age',
      'squadRole',
      'rating',
      'condition',
      'morale',
    ],
  },
  {
    id: 'lineup',
    label: 'Escalação',
    columns: [
      'shirtNumber',
      'info',
      'name',
      'position',
      'rating',
      'matchFitness',
      'condition',
      'morale',
      'preferredFoot',
    ],
  },
  {
    id: 'attributes',
    label: 'Atributos',
    columns: [
      'shirtNumber',
      'info',
      'name',
      'position',
      'age',
      'heightCm',
      'preferredFoot',
      'rating',
      'potentialRating',
    ],
  },
  {
    id: 'performance',
    label: 'Desempenho',
    columns: [
      'shirtNumber',
      'info',
      'name',
      'position',
      'appearances',
      'goals',
      'assists',
      'averageRating',
    ],
  },
] as const satisfies readonly {
  readonly id: string;
  readonly label: string;
  readonly columns: readonly SquadColumnId[];
}[];

const averageRatingFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
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
      return (
        <strong aria-label={`OVR atual ${player.rating}`} className="rating-value">
          {player.rating}
        </strong>
      );
    case 'potentialRating':
      return (
        <Tooltip content="Projeção estrutural; não é o OVR atual e pode mudar com novas avaliações.">
          <strong
            aria-label={`Potencial estimado ${player.potentialRating}`}
            className="rating-value rating-value--potential"
            tabIndex={0}
          >
            {player.potentialRating}
          </strong>
        </Tooltip>
      );
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
  readonly tableFeedback: ReactNode;
  readonly tableViewStatus: ReactNode;
  readonly tableViewState: TableViewState;
  readonly tableViewBaseline: TableViewState;
  readonly tableViewDirty: boolean;
  readonly tableViewLoading: boolean;
  readonly dirty: boolean;
  readonly message: string;
  readonly error: string;
  readonly saving: boolean;
  readonly onFocusPlayer: (playerId: string) => void;
  readonly onOpenProfile: (playerId: string) => void;
  readonly onOpenNation: (nationId: string) => void;
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
  readonly tableViewSaveMode?: 'update' | 'save-as';
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
  tableFeedback,
  tableViewStatus,
  tableViewState,
  tableViewBaseline,
  tableViewDirty,
  tableViewLoading,
  dirty,
  message,
  error,
  saving,
  onFocusPlayer,
  onOpenProfile,
  onOpenNation,
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
  tableViewSaveMode = 'update',
  onSaveTableView,
}: SquadWorkspaceProps) {
  const focusedPlayer =
    state.players.find((player) => player.id === focusedPlayerId) ?? state.players[0];
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
  const [tableAnnouncement, setTableAnnouncement] = useState('');
  const visibleColumnStates = tableViewState.columns.filter(({ visible }) => visible);
  const pinOffsets = calculatePinOffsets(visibleColumnStates);
  const tableData = useMemo(() => [...players], [players]);
  const tanstackColumns = useMemo<ColumnDef<Player>[]>(
    () =>
      visibleColumnStates.map((column) => ({
        id: column.columnId,
        accessorFn: (player) => player[column.columnId as keyof Player],
      })),
    [visibleColumnStates],
  );
  const squadTable = useReactTable({
    data: tableData,
    columns: tanstackColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (player) => player.id,
  });
  const activeViewPreset = squadViewPresets.find((preset) => {
    const visible = new Set(visibleColumnStates.map(({ columnId }) => columnId));
    return (
      visible.size === preset.columns.length &&
      preset.columns.every((columnId) => visible.has(columnId))
    );
  })?.id;

  const announceTable = (message: string) => {
    setTableAnnouncement((current) => (current === message ? current : message));
  };

  const dispatchTableView = (command: TableViewCommand): TableViewCommandResult => {
    return onTableViewCommand(command);
  };
  const tablePreferences: TablePreferencesAdapter = {
    state: tableViewState,
    baseline: tableViewBaseline,
    dispatch: dispatchTableView,
  };

  const applyViewPreset = (columns: readonly SquadColumnId[]) => {
    const visible = new Set(columns);
    for (const column of tableViewState.columns) {
      const nextVisible = visible.has(column.columnId as SquadColumnId);
      if (column.visible !== nextVisible) {
        dispatchTableView({
          type: 'column.visibility',
          columnId: column.columnId,
          visible: nextVisible,
        });
      }
    }
    announceTable(`Visualização atualizada para ${columns.length} colunas essenciais.`);
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

      <section aria-label="Controles do elenco" className="squad-controls">
        <nav aria-label="Modos de leitura do elenco" className="squad-view-presets">
          <span>Mostrar</span>
          {squadViewPresets.map((preset) => (
            <button
              aria-pressed={activeViewPreset === preset.id}
              data-active={activeViewPreset === preset.id || undefined}
              key={preset.id}
              onClick={() => applyViewPreset(preset.columns)}
              type="button"
            >
              {preset.label}
            </button>
          ))}
          {(['Contratos', 'Mercado'] as const).map((label) => (
            <Tooltip
              content={`${label}: será ativado quando os dados autoritativos desta área estiverem disponíveis na tabela.`}
              key={label}
            >
              <button aria-disabled="true" className="squad-view-presets__future" type="button">
                {label}
              </button>
            </Tooltip>
          ))}
          <small>
            Troca apenas a projeção da tabela; salve a visualização se quiser persistir.
          </small>
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

        {hasActiveFilters && (
          <div aria-label="Filtros ativos" className="squad-filter-chips">
            <span>Filtros ativos</span>
            {query.length > 0 && <button onClick={onClearFilters}>Busca: “{query}”</button>}
            {squadFilter !== 'all' && (
              <button onClick={() => onSquadFilterChange('all')}>
                {squadFilter === 'selected' ? 'Titulares' : 'Reservas'}
              </button>
            )}
            {roleFilter !== 'all' && (
              <button onClick={() => onRoleFilterChange('all')}>Setor selecionado</button>
            )}
            {statusFilter !== 'all' && (
              <button onClick={() => onStatusFilterChange('all')}>
                {statusFilter === 'ready' ? 'Prontos' : 'Atenção'}
              </button>
            )}
            {positionFilterVisible && positionFilter !== 'all' && (
              <button onClick={() => onPositionFilterChange('all')}>
                Posição: {positionLabels[positionFilter]}
              </button>
            )}
          </div>
        )}
      </section>

      <div
        className="squad-layout"
        data-details={(showPlayerDetails && Boolean(focusedPlayer)) || undefined}
        data-density={density}
      >
        <section className="squad-panel" aria-labelledby="players-title">
          <DataTableWorkspaceHeader
            configurationTrigger={
              <TableViewCustomizer
                baseline={tableViewBaseline}
                busy={tableViewBusy}
                dirty={tableViewDirty}
                dispatch={dispatchTableView}
                onSave={onSaveTableView}
                saveMode={tableViewSaveMode}
                schema={SQUAD_TABLE_SCHEMA}
                state={tableViewState}
              />
            }
            contextLabel={`${state.club.name} · plantel principal`}
            feedback={tableFeedback}
            densityControl={
              <TableDensityControl
                densities={SQUAD_TABLE_SCHEMA.densities}
                density={density}
                onChange={(nextDensity) => onDensityChange(nextDensity as Density)}
                title="Densidade do elenco"
              />
            }
            recordLabel={`${players.length} jogadores`}
            recordHeadingId="players-title"
            viewSelector={tableHeader}
            viewStatus={tableViewStatus}
          />

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
              <DataTableHeader
                definition={SQUAD_TABLE_DEFINITION}
                descendingFirstColumnIds={descendingFirstColumns}
                onAnnouncement={announceTable}
                onOpenAdvancedColumn={() => {
                  document
                    .querySelector<HTMLButtonElement>('[aria-label="Configurar tabela"]')
                    ?.click();
                }}
                preferences={tablePreferences}
              />
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
                  : squadTable.getRowModel().rows.map(({ original: player }) => {
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
                                  <EntityLink
                                    ariaLabel={`Abrir perfil de ${player.name}`}
                                    className="squad-player-cell"
                                    onNavigate={() => onOpenProfile(player.id)}
                                    route={{ kind: 'player', entityId: player.id }}
                                  >
                                    <PlayerFace index={playerIndex} name={player.name} size={36} />
                                    <span className="player-identity">
                                      <strong>{player.name}</strong>
                                      <small>{positionLongLabels[player.position]}</small>
                                    </span>
                                  </EntityLink>
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
                            if (columnId === 'nationality') {
                              return (
                                <td {...cellProps} key={columnId}>
                                  <NationalityEntityLink
                                    code={player.nationality}
                                    onNavigate={({ entityId }) => onOpenNation(entityId)}
                                  />
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
          <aside className="player-dossier">
            <PlayerInspector
              onOpenProfile={onOpenProfile}
              playerId={focusedPlayer.id}
              variationId={state.tacticalLibrary?.activeVariationId}
            >
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
                variant="secondary"
              >
                Salvar escalação
              </Button>
            </PlayerInspector>
          </aside>
        )}
      </div>
    </section>
  );
}
