import { Icon } from '@rivallo/icons';
import { useState, type CSSProperties, type ReactNode } from 'react';

import { Button } from '../ui/primitives/actions.js';
import { NationalityDisplay } from '../ui/Nationality/index.js';
import { Popover, Tooltip } from '../ui/primitives/disclosure.js';
import { Skeleton } from '../ui/primitives/feedback.js';
import {
  defaultSquadSort,
  optionalColumnLabels,
  optionalColumns,
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

const abbreviatedColumns = new Set<SortKey>([
  'shirtNumber',
  'info',
  'position',
  'nationality',
  'heightCm',
  'preferredFoot',
  'rating',
  'potentialRating',
  'matchFitness',
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

interface SortableColumnHeaderProps {
  readonly column: SortKey;
  readonly sortState: SquadSortState;
  readonly onSortChange: (sort: SquadSortState) => void;
}

function SortableColumnHeader({ column, sortState, onSortChange }: SortableColumnHeaderProps) {
  const active = sortState.key === column;
  const nextDirection = active
    ? sortState.direction === 'asc'
      ? 'desc'
      : 'asc'
    : descendingFirstColumns.has(column)
      ? 'desc'
      : 'asc';
  const ariaSort = active ? (sortState.direction === 'asc' ? 'ascending' : 'descending') : 'none';
  const sortButton = (
    <button
      aria-label={`Ordenar por ${squadColumnSortLabels[column]} em ordem ${nextDirection === 'asc' ? 'crescente' : 'decrescente'}`}
      data-active={active || undefined}
      onClick={() => onSortChange({ key: column, direction: nextDirection })}
      type="button"
    >
      {squadColumnLabels[column]}
      {active && <span aria-hidden="true">{sortState.direction === 'asc' ? ' ↑' : ' ↓'}</span>}
    </button>
  );

  return (
    <th aria-sort={ariaSort} data-column={column} scope="col">
      {abbreviatedColumns.has(column) ? (
        <Tooltip content={squadColumnSortLabels[column]}>{sortButton}</Tooltip>
      ) : (
        sortButton
      )}
    </th>
  );
}

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
  readonly visibleColumns: readonly OptionalColumn[];
  readonly showPlayerDetails: boolean;
  readonly tableViewRepositoryStatus: SquadTableViewRepositoryStatus;
  readonly tableViewPersistenceStatus: SquadTableViewPersistenceStatus;
  readonly tableHeader: ReactNode;
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
  readonly onToggleColumn: (column: OptionalColumn) => void;
  readonly onResetView: () => void;
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
  visibleColumns,
  showPlayerDetails,
  tableViewRepositoryStatus,
  tableViewPersistenceStatus,
  tableHeader,
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
  onToggleColumn,
  onResetView,
}: SquadWorkspaceProps) {
  const [openTableControl, setOpenTableControl] = useState<'density' | 'columns' | null>(null);
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
    sortState.key !== defaultSquadSort.key ||
    sortState.direction !== defaultSquadSort.direction ||
    roleFilter !== 'all' ||
    statusFilter !== 'all' ||
    positionFilterVisible;
  const tableViewBusy =
    tableViewRepositoryStatus.status === 'loading' ||
    tableViewPersistenceStatus.status === 'saving';
  const updateTableControl = (control: 'density' | 'columns', open: boolean) =>
    setOpenTableControl((current) => (open ? control : current === control ? null : current));

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
          Limpar
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
              <Popover
                align="end"
                contentClassName="table-control-popover column-picker"
                onOpenChange={(open) => updateTableControl('columns', open)}
                open={openTableControl === 'columns'}
                title="Colunas visíveis"
                triggerAccessibleLabel="Configurar colunas"
                triggerClassName="column-picker__trigger"
                triggerContent={
                  <>
                    <Icon name="columns" size={16} /> Colunas
                  </>
                }
                triggerLabel="Colunas"
                triggerTooltip="Escolher colunas visíveis"
              >
                <div className="column-picker__menu">
                  {optionalColumns.map((column) => (
                    <button
                      aria-pressed={visibleColumns.includes(column)}
                      key={column}
                      onClick={() => onToggleColumn(column)}
                      type="button"
                    >
                      <span>{optionalColumnLabels[column]}</span>
                      <b>{visibleColumns.includes(column) ? 'Visível' : 'Oculta'}</b>
                    </button>
                  ))}
                </div>
              </Popover>
              <Tooltip content="Restaurar densidade e colunas padrão">
                <button className="reset-view" onClick={onResetView} type="button">
                  Restaurar
                </button>
              </Tooltip>
            </div>
          </header>

          <div className="squad-table-wrap">
            <table className="squad-table">
              <thead>
                <tr>
                  <SortableColumnHeader
                    column="shirtNumber"
                    onSortChange={onSortChange}
                    sortState={sortState}
                  />
                  <SortableColumnHeader
                    column="info"
                    onSortChange={onSortChange}
                    sortState={sortState}
                  />
                  <SortableColumnHeader
                    column="name"
                    onSortChange={onSortChange}
                    sortState={sortState}
                  />
                  <SortableColumnHeader
                    column="position"
                    onSortChange={onSortChange}
                    sortState={sortState}
                  />
                  {optionalColumns.map(
                    (column) =>
                      visibleColumns.includes(column) && (
                        <SortableColumnHeader
                          column={column}
                          key={column}
                          onSortChange={onSortChange}
                          sortState={sortState}
                        />
                      ),
                  )}
                </tr>
              </thead>
              <tbody>
                {tableViewLoading
                  ? Array.from({ length: 5 }, (_, index) => (
                      <tr
                        aria-hidden="true"
                        className="squad-table__skeleton-row"
                        key={`table-view-loading-${index}`}
                      >
                        <td colSpan={4 + visibleColumns.length}>
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
                          key={player.id}
                          onClick={() => onFocusPlayer(player.id)}
                        >
                          <td className="squad-number">{player.shirtNumber}</td>
                          <td>
                            <Tooltip
                              content={
                                selected ? 'Retirar do XI' : 'Escalar no primeiro espaço livre'
                              }
                            >
                              <button
                                aria-label={`${selected ? 'Retirar' : 'Escalar'} ${player.name}`}
                                aria-pressed={selected}
                                className="lineup-control"
                                onFocus={() => onFocusPlayer(player.id)}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onFocusPlayer(player.id);
                                  onTogglePlayer(player);
                                }}
                                type="button"
                              >
                                {selected ? 'XI' : '+'}
                              </button>
                            </Tooltip>
                          </td>
                          <th scope="row">
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
                          </th>
                          <td>
                            <span className="position-badge">
                              {positionLabels[player.position]}
                            </span>
                          </td>
                          {optionalColumns.map(
                            (column) =>
                              visibleColumns.includes(column) && (
                                <td data-column={column} key={column}>
                                  {renderOptionalPlayerValue(player, column)}
                                </td>
                              ),
                          )}
                        </tr>
                      );
                    })}
              </tbody>
            </table>
            {players.length === 0 && (
              <div className="squad-empty">
                <Icon name="search" size={20} />
                <strong>Nenhum jogador encontrado</strong>
                <span>Ajuste a busca ou os filtros acima.</span>
              </div>
            )}
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
