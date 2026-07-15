import type { ReactNode } from 'react';

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

export function DenseTable<Row extends { readonly id: string }>(_props: DenseTableProps<Row>) {
  return <div data-testid="dense-table-not-implemented" />;
}
