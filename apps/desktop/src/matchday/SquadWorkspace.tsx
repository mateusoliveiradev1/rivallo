import { Icon } from '@rivallo/icons';
import { useState, type CSSProperties, type ReactNode } from 'react';

import {
  type TableViewColumnState,
  type TableViewCommand,
  type TableViewCommandResult,
  type TableViewState,
} from '../table-view/table-view-engine.js';

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
  const [tableAnnouncement, setTableAnnouncement] = useState('');
  const visibleColumnStates = tableViewState.columns.filter(({ visible }) => visible);
  const pinOffsets = calculatePinOffsets(visibleColumnStates);

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
          <DataTableWorkspaceHeader
            configurationTrigger={
              <TableViewCustomizer
                baseline={tableViewBaseline}
                busy={tableViewBusy}
                dirty={tableViewDirty}
                dispatch={dispatchTableView}
                onSave={onSaveTableView}
                schema={SQUAD_TABLE_SCHEMA}
                state={tableViewState}
              />
            }
            contextLabel={`${state.club.name} · plantel principal`}
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
