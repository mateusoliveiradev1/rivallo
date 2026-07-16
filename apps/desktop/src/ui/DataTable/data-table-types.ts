import type { ReactNode } from 'react';
import type {
  TableViewColumnSchema,
  TableViewCommand,
  TableViewCommandResult,
  TableViewSchema,
  TableViewState,
} from '../../table-view/table-view-engine.js';

export type DataTableAlignment = 'start' | 'center' | 'end';

export interface ColumnDefinition<Row> {
  readonly columnId: string;
  readonly label: string;
  readonly shortLabel: string;
  readonly description?: string;
  readonly tooltip?: string;
  readonly align?: DataTableAlignment;
  readonly responsivePriority: number;
  readonly render: (row: Row) => ReactNode;
  readonly alignmentOptions?: readonly DataTableAlignment[];
}

export interface TableDefinition<Row> {
  readonly tableId: string;
  readonly schemaVersion: number;
  readonly label: string;
  readonly schema: TableViewSchema;
  readonly columns: readonly ColumnDefinition<Row>[];
}

export interface TablePreferencesAdapter {
  readonly state: TableViewState;
  readonly baseline: TableViewState;
  readonly dispatch: (command: TableViewCommand) => TableViewCommandResult;
}

export const columnSchemaById = (
  schema: TableViewSchema,
): ReadonlyMap<string, TableViewColumnSchema> =>
  new Map(schema.columns.map((column) => [column.columnId, column]));

export const assertTableDefinition = <Row>(definition: TableDefinition<Row>): void => {
  if (definition.tableId !== definition.schema.tableId) {
    throw new Error('TableDefinition tableId must match its preference schema.');
  }
  if (definition.schemaVersion !== definition.schema.schemaVersion) {
    throw new Error('TableDefinition schemaVersion must match its preference schema.');
  }

  const schemaIds = new Set(definition.schema.columns.map(({ columnId }) => columnId));
  const definitionIds = new Set<string>();
  for (const column of definition.columns) {
    if (column.columnId.trim().length === 0 || definitionIds.has(column.columnId)) {
      throw new Error(`ColumnDefinition ids must be stable and unique: "${column.columnId}".`);
    }
    if (!schemaIds.has(column.columnId)) {
      throw new Error(`ColumnDefinition "${column.columnId}" is absent from the table schema.`);
    }
    if (column.label.trim().length === 0 || column.shortLabel.trim().length === 0) {
      throw new Error(`ColumnDefinition "${column.columnId}" requires complete and short labels.`);
    }
    if (!Number.isInteger(column.responsivePriority) || column.responsivePriority < 1) {
      throw new Error(
        `ColumnDefinition "${column.columnId}" requires a positive responsive priority.`,
      );
    }
    definitionIds.add(column.columnId);
  }

  if (definitionIds.size !== schemaIds.size) {
    throw new Error('TableDefinition must describe every column in its preference schema.');
  }
};
