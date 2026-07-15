import type { ReactNode } from 'react';

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
  readonly render: (row: Row) => ReactNode;
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
    ids.add(column.id);
  }
}

function LoadingRows<Row>({
  columns,
  rowCount,
}: {
  readonly columns: readonly DenseTableColumn<Row>[];
  readonly rowCount: number;
}) {
  const safeRowCount = Math.max(1, Math.floor(rowCount));
  return Array.from({ length: safeRowCount }, (_, rowIndex) => (
    <tr aria-hidden="true" key={`loading-${rowIndex}`}>
      {columns.map((column) => (
        <td data-align={column.align ?? 'start'} data-skeleton-cell="true" key={column.id}>
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
}: DenseTableProps<Row>) {
  assertColumns(columns);

  return (
    <ScrollArea className="rv-dense-table__scroll" label={label}>
      <table
        aria-busy={content.kind === 'loading' || undefined}
        className="rv-dense-table"
        data-density={density}
        data-sticky-header={stickyHeader || undefined}
      >
        <caption>{caption}</caption>
        <colgroup>
          {columns.map((column) => (
            <col key={column.id} style={{ width: `${column.width}px` }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                aria-label={column.accessibleHeader}
                data-align={column.align ?? 'start'}
                key={column.id}
                scope="col"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {content.kind === 'ready' &&
            content.rows.map((row) => (
              <tr key={row.id}>
                {columns.map((column) => (
                  <td data-align={column.align ?? 'start'} key={column.id}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          {content.kind === 'loading' && (
            <LoadingRows columns={columns} rowCount={content.rowCount ?? 5} />
          )}
          {content.kind === 'empty' && (
            <tr>
              <td colSpan={columns.length}>
                <EmptyState />
              </td>
            </tr>
          )}
          {content.kind === 'error' && (
            <tr>
              <td colSpan={columns.length}>
                <ErrorState onRetry={content.onRetry} />
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </ScrollArea>
  );
}
