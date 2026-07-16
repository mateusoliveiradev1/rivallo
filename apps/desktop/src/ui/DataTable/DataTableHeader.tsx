import { Icon } from '@rivallo/icons';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import type {
  TableViewColumnSchema,
  TableViewSortDirection,
  TableViewState,
} from '../../table-view/table-view-engine.js';
import { Menu, Tooltip, type MenuItem } from '../primitives/disclosure.js';
import {
  assertTableDefinition,
  columnSchemaById,
  type ColumnDefinition,
  type TableDefinition,
  type TablePreferencesAdapter,
} from './data-table-types.js';
import './DataTable.css';

type HeaderOperation =
  | { readonly kind: 'move'; readonly columnId: string; readonly snapshot: TableViewState }
  | {
      readonly kind: 'resize';
      readonly columnId: string;
      readonly snapshot: TableViewState;
      readonly startX: number;
      readonly startWidth: number;
    };

const resetBaseline = (snapshot: TableViewState, current: TableViewState): TableViewState => ({
  ...snapshot,
  viewId: current.viewId,
  baselineViewId: current.baselineViewId,
  label: current.label,
  provenance: current.provenance,
});

export const calculateDataTablePinOffsets = (
  columns: TableViewState['columns'],
): ReadonlyMap<string, number> => {
  const offsets = new Map<string, number>();
  let start = 0;
  for (const column of columns.filter(({ pinning }) => pinning.side === 'start')) {
    offsets.set(column.columnId, start);
    start += column.width;
  }
  let end = 0;
  for (const column of [...columns].reverse().filter(({ pinning }) => pinning.side === 'end')) {
    offsets.set(column.columnId, end);
    end += column.width;
  }
  return offsets;
};

export interface DataTableHeaderProps<Row> {
  readonly definition: TableDefinition<Row>;
  readonly preferences: TablePreferencesAdapter;
  readonly descendingFirstColumnIds?: ReadonlySet<string>;
  readonly onOpenAdvancedColumn?: (columnId: string) => void;
  readonly onAnnouncement?: (message: string) => void;
}

export interface DataTableHeaderCellProps<Row> {
  readonly column: ColumnDefinition<Row>;
  readonly schema: TableViewColumnSchema;
  readonly state: TableViewState['columns'][number];
  readonly stateIndex: number;
  readonly sortIndex: number;
  readonly preferences: TablePreferencesAdapter;
  readonly pinOffset: number;
  readonly moving: boolean;
  readonly resizing: boolean;
  readonly onBeginMove: (columnId: string, event: DragEvent<HTMLElement>) => void;
  readonly onMove: (columnId: string, toIndex: number) => void;
  readonly onMoveKeyDown: (
    event: KeyboardEvent<HTMLElement>,
    columnId: string,
    currentIndex: number,
  ) => void;
  readonly onMoveOver: (columnId: string) => void;
  readonly onFinishMove: () => void;
  readonly onResizePointerDown: (
    event: PointerEvent<HTMLSpanElement>,
    schema: TableViewColumnSchema,
  ) => void;
  readonly onResizePointerMove: (event: PointerEvent<HTMLSpanElement>) => void;
  readonly onResizePointerUp: (event: PointerEvent<HTMLSpanElement>) => void;
  readonly onResizeKeyDown: (
    event: KeyboardEvent<HTMLSpanElement>,
    schema: TableViewColumnSchema,
  ) => void;
  readonly onSort: (schema: TableViewColumnSchema, shiftKey: boolean) => void;
  readonly onResetWidth: (schema: TableViewColumnSchema) => void;
  readonly onOpenAdvancedColumn?: (columnId: string) => void;
}

export function ColumnSortIndicator({
  direction,
  priority,
}: {
  readonly direction: 'asc' | 'desc';
  readonly priority?: number;
}) {
  return (
    <span aria-hidden="true" className="rv-data-table-sort-indicator">
      <Icon name={direction === 'asc' ? 'sort-ascending' : 'sort-descending'} size={16} />
      {priority !== undefined && <b>{priority}</b>}
    </span>
  );
}

export function ColumnContextMenu({
  items,
  label,
}: {
  readonly items: readonly MenuItem[];
  readonly label: string;
}) {
  return (
    <span className="rv-data-table-header-cell__menu">
      <Menu items={items} triggerLabel={`Mais ações para ${label}`} />
    </span>
  );
}

export function ColumnResizeHandle({
  column,
  width,
  onDoubleClick,
  onKeyDown,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  readonly column: TableViewColumnSchema;
  readonly width: number;
  readonly onDoubleClick: () => void;
  readonly onKeyDown: (event: KeyboardEvent<HTMLSpanElement>) => void;
  readonly onPointerDown: (event: PointerEvent<HTMLSpanElement>) => void;
  readonly onPointerMove: (event: PointerEvent<HTMLSpanElement>) => void;
  readonly onPointerUp: (event: PointerEvent<HTMLSpanElement>) => void;
}) {
  return (
    <span
      aria-label={`Redimensionar ${column.label}`}
      aria-orientation="vertical"
      aria-valuemax={column.width.max}
      aria-valuemin={column.width.min}
      aria-valuenow={width}
      className="rv-data-table-resize-handle"
      onDoubleClick={onDoubleClick}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      role="separator"
      tabIndex={0}
    />
  );
}

export function ColumnDragOverlay() {
  return <span aria-hidden="true" className="rv-data-table-drag-overlay" />;
}

export function DataTableHeaderCell<Row>({
  column,
  schema,
  state,
  stateIndex,
  sortIndex,
  preferences,
  pinOffset,
  moving,
  resizing,
  onBeginMove,
  onMove,
  onMoveKeyDown,
  onMoveOver,
  onFinishMove,
  onResizePointerDown,
  onResizePointerMove,
  onResizePointerUp,
  onResizeKeyDown,
  onSort,
  onResetWidth,
  onOpenAdvancedColumn,
}: DataTableHeaderCellProps<Row>) {
  const activeSort = preferences.state.sort[sortIndex];
  const items: MenuItem[] = [];
  if (schema.capabilities.sortable) {
    items.push(
      {
        id: 'sort-ascending',
        label: 'Ordenar crescente',
        type: 'command',
        onSelect: () =>
          preferences.dispatch({
            type: 'sort.set',
            sort: [{ columnId: schema.columnId, direction: 'asc', nulls: 'last' }],
          }),
      },
      {
        id: 'sort-descending',
        label: 'Ordenar decrescente',
        type: 'command',
        onSelect: () =>
          preferences.dispatch({
            type: 'sort.set',
            sort: [{ columnId: schema.columnId, direction: 'desc', nulls: 'last' }],
          }),
      },
    );
    if (activeSort !== undefined) {
      items.push({
        id: 'sort-remove',
        label: 'Remover ordenação',
        type: 'command',
        onSelect: () =>
          preferences.dispatch({
            type: 'sort.set',
            sort: preferences.state.sort.filter(({ columnId }) => columnId !== schema.columnId),
          }),
      });
    }
  }
  if (schema.capabilities.reorderable) {
    if (stateIndex > 0) {
      items.push({
        id: 'move-left',
        label: 'Mover para esquerda',
        type: 'command',
        onSelect: () => onMove(schema.columnId, stateIndex - 1),
      });
    }
    if (stateIndex < preferences.state.columns.length - 1) {
      items.push({
        id: 'move-right',
        label: 'Mover para direita',
        type: 'command',
        onSelect: () => onMove(schema.columnId, stateIndex + 1),
      });
    }
  }
  if (schema.capabilities.pinnable) {
    if (state.pinning.side !== 'start') {
      items.push({
        id: 'pin-start',
        label: 'Fixar à esquerda',
        type: 'command',
        onSelect: () =>
          preferences.dispatch({ type: 'column.pin', columnId: schema.columnId, side: 'start' }),
      });
    }
    if (state.pinning.side !== 'end') {
      items.push({
        id: 'pin-end',
        label: 'Fixar à direita',
        type: 'command',
        onSelect: () =>
          preferences.dispatch({ type: 'column.pin', columnId: schema.columnId, side: 'end' }),
      });
    }
    if (state.pinning.side !== 'none') {
      items.push({
        id: 'unpin',
        label: 'Desafixar',
        type: 'command',
        onSelect: () =>
          preferences.dispatch({ type: 'column.pin', columnId: schema.columnId, side: 'none' }),
      });
    }
  }
  if (schema.required) {
    items.push({
      id: 'required',
      label: `Obrigatória — ${schema.requiredReason ?? 'não pode ser ocultada'}`,
      type: 'command',
      disabled: true,
    });
  } else if (schema.capabilities.hideable) {
    items.push({
      id: 'hide',
      label: 'Ocultar coluna',
      type: 'command',
      onSelect: () =>
        preferences.dispatch({
          type: 'column.visibility',
          columnId: schema.columnId,
          visible: false,
        }),
    });
  }
  if (schema.capabilities.resizable && state.width !== schema.width.default) {
    items.push({
      id: 'reset-width',
      label: 'Restaurar largura',
      type: 'command',
      onSelect: () => onResetWidth(schema),
    });
  }
  if (onOpenAdvancedColumn !== undefined) {
    items.push({
      id: 'advanced',
      label: 'Abrir configuração avançada',
      type: 'command',
      onSelect: () => onOpenAdvancedColumn(schema.columnId),
    });
  }

  const sortLabel =
    activeSort === undefined
      ? `Ordenar por ${column.label}`
      : `${column.label}, ${
          activeSort.direction === 'asc' ? 'ordem crescente' : 'ordem decrescente'
        }${preferences.state.sort.length > 1 ? `, prioridade ${sortIndex + 1}` : ''}`;
  const tooltip = column.tooltip ?? column.description ?? column.label;

  return (
    <th
      aria-sort={
        activeSort === undefined
          ? undefined
          : activeSort.direction === 'asc'
            ? 'ascending'
            : 'descending'
      }
      className="rv-data-table-header-cell"
      data-align={column.align ?? 'start'}
      data-column-id={state.columnId}
      data-moving={moving || undefined}
      data-pinned={state.pinning.side === 'none' ? undefined : state.pinning.side}
      data-resizing={resizing || undefined}
      draggable={schema.capabilities.reorderable}
      onDragEnd={onFinishMove}
      onDragOver={(event) => event.preventDefault()}
      onDragStart={(event) => onBeginMove(schema.columnId, event)}
      onDrop={(event) => {
        event.preventDefault();
        onMoveOver(schema.columnId);
        onFinishMove();
      }}
      onPointerEnter={() => onMoveOver(schema.columnId)}
      scope="col"
      style={
        {
          '--rv-data-table-column-width': `${state.width}px`,
          '--rv-data-table-pin-offset': `${pinOffset}px`,
        } as CSSProperties
      }
    >
      <div className="rv-data-table-header-cell__content">
        {schema.capabilities.sortable ? (
          <Tooltip content={tooltip}>
            <button
              aria-label={sortLabel}
              className="rv-data-table-header-cell__title"
              data-active={activeSort !== undefined || undefined}
              onClick={(event) => onSort(schema, event.shiftKey)}
              onKeyDown={(event) => onMoveKeyDown(event, schema.columnId, stateIndex)}
              type="button"
            >
              <span>{column.shortLabel}</span>
              {activeSort !== undefined && (
                <ColumnSortIndicator
                  direction={activeSort.direction}
                  priority={preferences.state.sort.length > 1 ? sortIndex + 1 : undefined}
                />
              )}
            </button>
          </Tooltip>
        ) : (
          <Tooltip content={tooltip}>
            <span
              aria-label={column.label}
              className="rv-data-table-header-cell__title rv-data-table-header-cell__title--static"
              onKeyDown={(event) => onMoveKeyDown(event, schema.columnId, stateIndex)}
              tabIndex={0}
            >
              {column.shortLabel}
            </span>
          </Tooltip>
        )}
        <ColumnContextMenu items={items} label={column.label} />
        {schema.capabilities.resizable && (
          <ColumnResizeHandle
            column={schema}
            onDoubleClick={() => onResetWidth(schema)}
            onKeyDown={(event) => onResizeKeyDown(event, schema)}
            onPointerDown={(event) => onResizePointerDown(event, schema)}
            onPointerMove={onResizePointerMove}
            onPointerUp={onResizePointerUp}
            width={state.width}
          />
        )}
        {moving && <ColumnDragOverlay />}
      </div>
      <span className="rv-data-table-header-cell__description">
        {column.description ?? column.label}
      </span>
    </th>
  );
}

export function DataTableHeader<Row>({
  definition,
  preferences,
  descendingFirstColumnIds = new Set(),
  onOpenAdvancedColumn,
  onAnnouncement,
}: DataTableHeaderProps<Row>) {
  assertTableDefinition(definition);
  const schemaById = useMemo(() => columnSchemaById(definition.schema), [definition.schema]);
  const definitionById = useMemo(
    () => new Map(definition.columns.map((column) => [column.columnId, column])),
    [definition.columns],
  );
  const stateRef = useRef(preferences.state);
  const operationRef = useRef<HeaderOperation | null>(null);
  const [operation, setOperation] = useState<HeaderOperation | null>(null);
  const pinOffsets = calculateDataTablePinOffsets(
    preferences.state.columns.filter(({ visible }) => visible),
  );

  useEffect(() => {
    stateRef.current = preferences.state;
  }, [preferences.state]);

  const announce = (message: string) => onAnnouncement?.(message);
  const emit = (command: Parameters<TablePreferencesAdapter['dispatch']>[0]) => {
    const result = preferences.dispatch(command);
    if (result.accepted) stateRef.current = result.state;
    return result;
  };
  const setActiveOperation = (next: HeaderOperation | null) => {
    operationRef.current = next;
    setOperation(next);
  };
  const moveColumn = (columnId: string, toIndex: number) => {
    const result = emit({ type: 'column.reorder', columnId, toIndex });
    if (result.accepted) {
      const column = definitionById.get(columnId);
      const nextIndex = result.state.columns.findIndex(
        (candidate) => candidate.columnId === columnId,
      );
      announce(
        `${column?.label ?? columnId}, posição ${nextIndex + 1} de ${result.state.columns.length}.`,
      );
    }
  };
  const moveWithKeyboard = (
    event: KeyboardEvent<HTMLElement>,
    columnId: string,
    currentIndex: number,
  ) => {
    if (!event.altKey || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    if (operationRef.current?.kind !== 'move' || operationRef.current.columnId !== columnId) {
      setActiveOperation({ kind: 'move', columnId, snapshot: stateRef.current });
    }
    const lastIndex = stateRef.current.columns.length - 1;
    const nextIndex =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? lastIndex
          : event.key === 'ArrowLeft'
            ? Math.max(0, currentIndex - 1)
            : Math.min(lastIndex, currentIndex + 1);
    moveColumn(columnId, nextIndex);
  };
  const beginMove = (columnId: string, event: DragEvent<HTMLElement>) => {
    setActiveOperation({ kind: 'move', columnId, snapshot: stateRef.current });
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', columnId);
  };
  const moveOver = (targetColumnId: string) => {
    const active = operationRef.current;
    if (active?.kind !== 'move') return;
    const targetIndex = stateRef.current.columns.findIndex(
      ({ columnId }) => columnId === targetColumnId,
    );
    if (targetIndex >= 0) moveColumn(active.columnId, targetIndex);
  };
  const resize = (columnId: string, width: number) => {
    const result = emit({ type: 'column.resize', columnId, width });
    if (result.accepted) {
      const nextWidth =
        result.state.columns.find((column) => column.columnId === columnId)?.width ?? width;
      announce(`${definitionById.get(columnId)?.label ?? columnId}, largura ${nextWidth} pixels.`);
    }
  };
  const beginResize = (event: PointerEvent<HTMLSpanElement>, schema: TableViewColumnSchema) => {
    const width =
      stateRef.current.columns.find(({ columnId }) => columnId === schema.columnId)?.width ??
      schema.width.default;
    setActiveOperation({
      kind: 'resize',
      columnId: schema.columnId,
      snapshot: stateRef.current,
      startX: event.clientX,
      startWidth: width,
    });
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const moveResize = (event: PointerEvent<HTMLSpanElement>) => {
    const active = operationRef.current;
    if (active?.kind !== 'resize') return;
    resize(active.columnId, active.startWidth + event.clientX - active.startX);
  };
  const finishResize = (event: PointerEvent<HTMLSpanElement>) => {
    if (operationRef.current?.kind !== 'resize') return;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    setActiveOperation(null);
  };
  const resizeWithKeyboard = (
    event: KeyboardEvent<HTMLSpanElement>,
    schema: TableViewColumnSchema,
  ) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const width =
      stateRef.current.columns.find(({ columnId }) => columnId === schema.columnId)?.width ??
      schema.width.default;
    if (
      operationRef.current?.kind !== 'resize' ||
      operationRef.current.columnId !== schema.columnId
    ) {
      setActiveOperation({
        kind: 'resize',
        columnId: schema.columnId,
        snapshot: stateRef.current,
        startX: 0,
        startWidth: width,
      });
    }
    const step = event.shiftKey ? 24 : 8;
    const next =
      event.key === 'Home'
        ? schema.width.min
        : event.key === 'End'
          ? schema.width.max
          : event.key === 'ArrowLeft'
            ? width - step
            : width + step;
    resize(schema.columnId, next);
  };
  const cycleSort = (schema: TableViewColumnSchema, shiftKey: boolean) => {
    const current = stateRef.current.sort;
    const currentIndex = current.findIndex(({ columnId }) => columnId === schema.columnId);
    const currentClause = current[currentIndex];
    const first: TableViewSortDirection = descendingFirstColumnIds.has(schema.columnId)
      ? 'desc'
      : 'asc';
    const second: TableViewSortDirection = first === 'asc' ? 'desc' : 'asc';
    const nextDirection =
      currentClause === undefined ? first : currentClause.direction === first ? second : null;
    const nextSort = shiftKey ? [...current] : [];
    if (shiftKey && currentIndex >= 0) nextSort.splice(currentIndex, 1);
    if (nextDirection !== null) {
      const nextClause = {
        columnId: schema.columnId,
        direction: nextDirection,
        nulls: 'last' as const,
      };
      if (shiftKey) nextSort.push(nextClause);
      else nextSort.push(nextClause);
    }
    const result = emit({ type: 'sort.set', sort: nextSort });
    if (result.accepted) {
      const nextIndex = result.state.sort.findIndex(({ columnId }) => columnId === schema.columnId);
      announce(
        nextDirection === null
          ? `${schema.label}, ordenação removida.`
          : `${schema.label}, ordem ${
              nextDirection === 'asc' ? 'crescente' : 'decrescente'
            }, prioridade ${nextIndex + 1} de ${result.state.sort.length}.`,
      );
    }
  };
  const restoreOperation = () => {
    const active = operationRef.current;
    if (active === null) return;
    emit({ type: 'view.reset', baseline: resetBaseline(active.snapshot, stateRef.current) });
    announce(
      `${definitionById.get(active.columnId)?.label ?? active.columnId}, operação desfeita.`,
    );
    setActiveOperation(null);
  };

  return (
    <thead
      className="rv-data-table-header"
      onKeyDownCapture={(event) => {
        if (event.key !== 'Escape' || operationRef.current === null) return;
        event.preventDefault();
        event.stopPropagation();
        restoreOperation();
      }}
    >
      <tr>
        {preferences.state.columns
          .filter(({ visible }) => visible)
          .map((columnState) => {
            const column = definitionById.get(columnState.columnId);
            const schema = schemaById.get(columnState.columnId);
            if (column === undefined || schema === undefined) return null;
            const stateIndex = preferences.state.columns.findIndex(
              ({ columnId }) => columnId === columnState.columnId,
            );
            const sortIndex = preferences.state.sort.findIndex(
              ({ columnId }) => columnId === columnState.columnId,
            );
            return (
              <DataTableHeaderCell
                column={column}
                key={columnState.columnId}
                moving={operation?.kind === 'move' && operation.columnId === columnState.columnId}
                onBeginMove={beginMove}
                onFinishMove={() => setActiveOperation(null)}
                onMove={moveColumn}
                onMoveKeyDown={moveWithKeyboard}
                onMoveOver={moveOver}
                onOpenAdvancedColumn={onOpenAdvancedColumn}
                onResetWidth={(columnSchema) =>
                  resize(columnSchema.columnId, columnSchema.width.default)
                }
                onResizeKeyDown={resizeWithKeyboard}
                onResizePointerDown={beginResize}
                onResizePointerMove={moveResize}
                onResizePointerUp={finishResize}
                onSort={cycleSort}
                pinOffset={pinOffsets.get(columnState.columnId) ?? 0}
                preferences={preferences}
                resizing={
                  operation?.kind === 'resize' && operation.columnId === columnState.columnId
                }
                schema={schema}
                sortIndex={sortIndex}
                state={columnState}
                stateIndex={stateIndex}
              />
            );
          })}
      </tr>
    </thead>
  );
}
