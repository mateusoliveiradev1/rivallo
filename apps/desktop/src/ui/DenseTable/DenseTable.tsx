import { Icon } from '@rivallo/icons';
import { useState, type ReactNode } from 'react';

import { Button } from '../primitives/actions.js';
import { Menu, type MenuItem } from '../primitives/disclosure.js';
import { EmptyState, ErrorState, Skeleton } from '../primitives/feedback.js';
import { ScrollArea } from '../primitives/layout.js';
import './DenseTable.css';

export type DenseTableDensity = 'compact' | 'comfortable';
export type DenseTableAlignment = 'start' | 'center' | 'end';

export interface DenseTableColumn<Row> {
  readonly id: string;
  readonly header: string;
  readonly accessibleHeader?: string;
  readonly width: number;
  readonly priority: number;
  readonly align?: DenseTableAlignment;
  readonly hideable?: boolean;
  readonly sortable?: boolean;
  readonly sortValue?: (row: Row) => string | number | null;
  readonly render: (row: Row) => ReactNode;
}

export interface DenseTablePrimaryAction {
  readonly label: string;
  readonly disabled?: boolean;
  readonly onSelect: () => void;
}

export interface DenseTableSecondaryAction extends DenseTablePrimaryAction {
  readonly id: string;
}

export interface DenseTableRowActions {
  readonly primary?: DenseTablePrimaryAction;
  readonly secondary?: readonly DenseTableSecondaryAction[];
}

export type DenseTableContent<Row> =
  | { readonly kind: 'ready'; readonly rows: readonly Row[] }
  | { readonly kind: 'loading'; readonly rowCount?: number }
  | { readonly kind: 'empty' }
  | { readonly kind: 'error'; readonly onRetry?: () => void };

export interface DenseTableProps<Row extends { readonly id: string }> {
  readonly label: string;
  readonly caption: string;
  readonly columns: readonly DenseTableColumn<Row>[];
  readonly content: DenseTableContent<Row>;
  readonly density?: DenseTableDensity;
  readonly stickyHeader?: boolean;
  readonly selectable?: boolean;
  readonly getRowLabel?: (row: Row) => string;
  readonly getRowActions?: (row: Row) => DenseTableRowActions;
  readonly columnPriorityLimit?: number;
}

type SortDirection = 'ascending' | 'descending';

interface SortState {
  readonly columnId: string;
  readonly direction: SortDirection;
}

function assertColumns<Row>(columns: readonly DenseTableColumn<Row>[]) {
  if (columns.length === 0) {
    throw new Error('DenseTable requires at least one column.');
  }

  const ids = new Set<string>();
  for (const column of columns) {
    if (column.id.trim().length === 0 || ids.has(column.id)) {
      throw new Error(`DenseTable column ids must be unique and non-empty: "${column.id}".`);
    }
    if (!Number.isFinite(column.width) || column.width <= 0) {
      throw new Error(`DenseTable column "${column.id}" requires a positive finite width.`);
    }
    if (!Number.isInteger(column.priority) || column.priority < 1) {
      throw new Error(`DenseTable column "${column.id}" requires a positive integer priority.`);
    }
    if (column.sortable && !column.sortValue) {
      throw new Error(`DenseTable sortable column "${column.id}" requires sortValue.`);
    }
    ids.add(column.id);
  }
}

function LoadingRows<Row>({
  alignments,
  rowCount,
}: {
  readonly alignments: readonly DenseTableAlignment[];
  readonly rowCount: number;
}) {
  const safeRowCount = Math.max(1, Math.floor(rowCount));
  return Array.from({ length: safeRowCount }, (_, rowIndex) => (
    <tr aria-hidden="true" key={`loading-${rowIndex}`}>
      {alignments.map((alignment, columnIndex) => (
        <td data-align={alignment} data-skeleton-cell="true" key={columnIndex}>
          <Skeleton />
        </td>
      ))}
    </tr>
  ));
}

export function DenseTable<Row extends { readonly id: string }>({
  label,
  caption,
  columns,
  content,
  density = 'compact',
  stickyHeader = false,
  selectable = false,
  getRowLabel,
  getRowActions,
  columnPriorityLimit = Number.POSITIVE_INFINITY,
}: DenseTableProps<Row>) {
  assertColumns(columns);
  if ((selectable || getRowActions) && !getRowLabel) {
    throw new Error('DenseTable selection and row actions require getRowLabel.');
  }
  if (
    columnPriorityLimit !== Number.POSITIVE_INFINITY &&
    (!Number.isInteger(columnPriorityLimit) || columnPriorityLimit < 1)
  ) {
    throw new Error('DenseTable columnPriorityLimit must be a positive integer.');
  }

  const [hiddenColumnIds, setHiddenColumnIds] = useState<ReadonlySet<string>>(() => new Set());
  const [sort, setSort] = useState<SortState | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<ReadonlySet<string>>(() => new Set());
  const visibleColumns = columns.filter(
    (column) => column.priority <= columnPriorityLimit && !hiddenColumnIds.has(column.id),
  );
  if (visibleColumns.length === 0) {
    throw new Error('DenseTable must retain at least one visible data column.');
  }

  const readyRows = content.kind === 'ready' ? content.rows : [];
  const sortedRows = (() => {
    if (!sort) return readyRows;
    const column = columns.find((candidate) => candidate.id === sort.columnId);
    if (!column?.sortValue) return readyRows;

    return readyRows
      .map((row, originalIndex) => ({ row, originalIndex, value: column.sortValue?.(row) }))
      .sort((left, right) => {
        if (left.value === right.value) return left.originalIndex - right.originalIndex;
        if (left.value === null || left.value === undefined) return 1;
        if (right.value === null || right.value === undefined) return -1;
        const comparison =
          typeof left.value === 'number' && typeof right.value === 'number'
            ? left.value - right.value
            : String(left.value).localeCompare(String(right.value), 'pt-BR');
        return sort.direction === 'ascending' ? comparison : -comparison;
      })
      .map(({ row }) => row);
  })();

  const hasActions = getRowActions !== undefined;
  const renderedColumnCount = visibleColumns.length + Number(selectable) + Number(hasActions);
  const allReadyRowsSelected =
    sortedRows.length > 0 && sortedRows.every((row) => selectedRowIds.has(row.id));
  const someReadyRowsSelected = sortedRows.some((row) => selectedRowIds.has(row.id));
  const selectableRowIds = new Set(sortedRows.map((row) => row.id));
  const selectedVisibleCount = [...selectedRowIds].filter((id) => selectableRowIds.has(id)).length;

  const cycleSort = (columnId: string) => {
    setSort((current) => {
      if (current?.columnId !== columnId) return { columnId, direction: 'ascending' };
      if (current.direction === 'ascending') return { columnId, direction: 'descending' };
      return null;
    });
  };

  const columnMenuItems: readonly MenuItem[] = columns
    .filter((column) => column.hideable)
    .map((column) => ({
      id: column.id,
      type: 'checkbox' as const,
      label: column.header,
      checked: !hiddenColumnIds.has(column.id),
      onCheckedChange: (checked: boolean) => {
        setHiddenColumnIds((current) => {
          const next = new Set(current);
          if (checked) next.delete(column.id);
          else next.add(column.id);
          return next;
        });
        if (!checked) {
          setSort((current) => (current?.columnId === column.id ? null : current));
        }
      },
    }));

  const toggleAllRows = () => {
    setSelectedRowIds((current) => {
      const next = new Set(current);
      if (allReadyRowsSelected) {
        for (const row of sortedRows) next.delete(row.id);
      } else {
        for (const row of sortedRows) next.add(row.id);
      }
      return next;
    });
  };

  const loadingAlignments: readonly DenseTableAlignment[] = [
    ...(selectable ? (['center'] as const) : []),
    ...visibleColumns.map((column) => column.align ?? 'start'),
    ...(hasActions ? (['end'] as const) : []),
  ];

  return (
    <ScrollArea className="rv-dense-table__scroll" label={label}>
      {(columnMenuItems.length > 0 || selectable) && (
        <div className="rv-dense-table__toolbar">
          {selectable && (
            <span aria-live="polite" className="rv-dense-table__selection-summary">
              {selectedVisibleCount}{' '}
              {selectedVisibleCount === 1 ? 'linha selecionada' : 'linhas selecionadas'}
            </span>
          )}
          {columnMenuItems.length > 0 && (
            <Menu items={columnMenuItems} triggerLabel="Configurar colunas" />
          )}
        </div>
      )}
      <table
        aria-busy={content.kind === 'loading' || undefined}
        className="rv-dense-table"
        data-density={density}
        data-sticky-header={stickyHeader || undefined}
      >
        <caption>{caption}</caption>
        <colgroup>
          {selectable && <col className="rv-dense-table__selection-column" />}
          {visibleColumns.map((column) => (
            <col key={column.id} style={{ width: `${column.width}px` }} />
          ))}
          {hasActions && <col className="rv-dense-table__actions-column" />}
        </colgroup>
        <thead>
          <tr>
            {selectable && (
              <th aria-label="Seleção de linhas" data-align="center" scope="col">
                <input
                  aria-label="Selecionar todas as linhas"
                  checked={allReadyRowsSelected}
                  className="rv-dense-table__checkbox"
                  disabled={sortedRows.length === 0}
                  onChange={toggleAllRows}
                  ref={(input) => {
                    if (input) input.indeterminate = someReadyRowsSelected && !allReadyRowsSelected;
                  }}
                  type="checkbox"
                />
              </th>
            )}
            {visibleColumns.map((column) => {
              const activeSort = sort?.columnId === column.id ? sort.direction : undefined;
              return (
                <th
                  aria-label={column.sortable ? undefined : column.accessibleHeader}
                  aria-sort={activeSort}
                  data-align={column.align ?? 'start'}
                  key={column.id}
                  scope="col"
                >
                  {column.sortable ? (
                    <Button
                      aria-label={`Ordenar por ${column.accessibleHeader ?? column.header}`}
                      className="rv-dense-table__sort"
                      onClick={() => cycleSort(column.id)}
                      variant="quiet"
                    >
                      <span>{column.header}</span>
                      {activeSort && (
                        <span aria-hidden="true" className="rv-dense-table__sort-direction">
                          <Icon
                            name={activeSort === 'ascending' ? 'sort-ascending' : 'sort-descending'}
                            size={16}
                          />
                          {activeSort === 'ascending' ? 'Crescente' : 'Decrescente'}
                        </span>
                      )}
                    </Button>
                  ) : (
                    column.header
                  )}
                </th>
              );
            })}
            {hasActions && (
              <th data-align="end" scope="col">
                Ações
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {content.kind === 'ready' &&
            sortedRows.map((row) => {
              const selected = selectedRowIds.has(row.id);
              const rowLabel = getRowLabel?.(row) ?? row.id;
              const actions = getRowActions?.(row);
              const secondaryItems: readonly MenuItem[] = (actions?.secondary ?? []).map(
                (action) => ({
                  id: action.id,
                  label: action.label,
                  disabled: action.disabled,
                  type: 'command' as const,
                  onSelect: action.onSelect,
                }),
              );

              return (
                <tr data-selected={selected || undefined} key={row.id}>
                  {selectable && (
                    <td data-align="center">
                      <span className="rv-dense-table__selection-control">
                        <input
                          aria-label={`Selecionar ${rowLabel}`}
                          checked={selected}
                          className="rv-dense-table__checkbox"
                          onChange={(event) => {
                            setSelectedRowIds((current) => {
                              const next = new Set(current);
                              if (event.target.checked) next.add(row.id);
                              else next.delete(row.id);
                              return next;
                            });
                          }}
                          type="checkbox"
                        />
                        {selected && (
                          <span className="rv-dense-table__selected-marker">
                            <Icon name="check" size={16} />
                            <span className="rv-dense-table__visually-hidden">Selecionado</span>
                          </span>
                        )}
                      </span>
                    </td>
                  )}
                  {visibleColumns.map((column) => (
                    <td data-align={column.align ?? 'start'} key={column.id}>
                      {column.render(row)}
                    </td>
                  ))}
                  {hasActions && (
                    <td data-align="end">
                      <span className="rv-dense-table__row-actions">
                        {actions?.primary && (
                          <Button
                            disabled={actions.primary.disabled}
                            onClick={actions.primary.onSelect}
                            variant="quiet"
                          >
                            {actions.primary.label}
                          </Button>
                        )}
                        {secondaryItems.length > 0 && (
                          <Menu
                            items={secondaryItems}
                            triggerLabel={`Mais ações para ${rowLabel}`}
                          />
                        )}
                      </span>
                    </td>
                  )}
                </tr>
              );
            })}
          {content.kind === 'loading' && (
            <LoadingRows alignments={loadingAlignments} rowCount={content.rowCount ?? 5} />
          )}
          {content.kind === 'empty' && (
            <tr>
              <td colSpan={renderedColumnCount}>
                <EmptyState />
              </td>
            </tr>
          )}
          {content.kind === 'error' && (
            <tr>
              <td colSpan={renderedColumnCount}>
                <ErrorState onRetry={content.onRetry} />
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </ScrollArea>
  );
}
