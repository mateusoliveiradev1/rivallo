import { Icon } from '@rivallo/icons';
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';

import {
  type TableViewColumnSchema,
  type TableViewCommand,
  type TableViewCommandResult,
  type TableViewRejectionCode,
  type TableViewSchema,
  type TableViewState,
} from '../table-view/table-view-engine.js';
import { Button } from '../ui/primitives/actions.js';
import { Popover } from '../ui/primitives/disclosure.js';
import { TextField } from '../ui/primitives/forms.js';

type OperationKind = 'move' | 'resize';
type OperationInput = 'keyboard' | 'pointer';

interface OperationSession {
  readonly kind: OperationKind;
  readonly input: OperationInput;
  readonly columnId: string;
  readonly snapshot: TableViewState;
  readonly startX?: number;
  readonly startWidth?: number;
}

export interface TableViewCustomizerProps {
  readonly schema: TableViewSchema;
  readonly state: TableViewState;
  readonly baseline: TableViewState;
  readonly dirty: boolean;
  readonly busy?: boolean;
  readonly disabled?: boolean;
  readonly dispatch: (command: TableViewCommand) => TableViewCommandResult;
  readonly onSave: () => boolean | void | Promise<boolean | void>;
}

const normalizeSearch = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('pt-BR')
    .trim();

const rejectionMessage = (
  code: TableViewRejectionCode,
  column: TableViewColumnSchema | undefined,
): string => {
  const label = column?.label ?? 'Coluna';

  switch (code) {
    case 'pinned-column-limit-exceeded':
      return `${label}: no máximo quatro colunas podem ficar fixadas. A configuração anterior foi mantida.`;
    case 'pinned-width-limit-exceeded':
      return `${label}: as colunas fixadas não podem ocupar mais da metade da tabela. A configuração anterior foi mantida.`;
    case 'required-column-hidden':
      return `${label}: ${column?.requiredReason ?? 'esta coluna é obrigatória.'}`;
    case 'column-pinning-unsupported':
      return `${label}: esta coluna não pode ser fixada ou desafixada. A configuração anterior foi mantida.`;
    case 'column-reorder-unsupported':
      return `${label}: esta coluna não pode ser reordenada. A configuração anterior foi mantida.`;
    case 'column-resize-unsupported':
      return `${label}: esta coluna não pode ser redimensionada. A configuração anterior foi mantida.`;
    case 'column-visibility-unsupported':
      return `${label}: a visibilidade desta coluna não pode ser alterada. A configuração anterior foi mantida.`;
    default:
      return `${label}: este ajuste não pode ser aplicado. A configuração anterior foi mantida.`;
  }
};

const asResetBaseline = (snapshot: TableViewState, current: TableViewState): TableViewState => ({
  ...snapshot,
  viewId: current.baselineViewId,
  baselineViewId: current.baselineViewId,
});

const columnFromState = (state: TableViewState, columnId: string) =>
  state.columns.find((column) => column.columnId === columnId);

export function TableViewCustomizer({
  schema,
  state,
  baseline,
  dirty,
  busy = false,
  disabled = false,
  dispatch,
  onSave,
}: TableViewCustomizerProps) {
  const searchId = `table-column-search-${useId()}`;
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [saving, setSaving] = useState(false);
  const [operation, setOperation] = useState<OperationSession | null>(null);
  const stateRef = useRef(state);
  const operationRef = useRef<OperationSession | null>(null);
  const openingSnapshotRef = useRef<TableViewState | null>(null);
  const acceptedCloseRef = useRef(false);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const schemaById = useMemo(
    () => new Map(schema.columns.map((column) => [column.columnId, column])),
    [schema.columns],
  );
  const orderedSchemas = state.columns
    .map(({ columnId }) => schemaById.get(columnId))
    .filter((column): column is TableViewColumnSchema => column !== undefined);
  const normalizedSearch = normalizeSearch(search);
  const filteredSchemas =
    normalizedSearch.length === 0
      ? orderedSchemas
      : orderedSchemas.filter((column) => normalizeSearch(column.label).includes(normalizedSearch));

  const announce = (message: string) => {
    setAnnouncement((current) => (current === message ? current : message));
  };

  const messageForAccepted = (
    result: Extract<TableViewCommandResult, { readonly accepted: true }>,
    command: TableViewCommand,
  ): string => {
    if (
      command.type === 'column.visibility' ||
      command.type === 'column.reorder' ||
      command.type === 'column.resize' ||
      command.type === 'column.pin'
    ) {
      const columnSchema = schemaById.get(command.columnId);
      const label = columnSchema?.label ?? command.columnId;
      const nextColumn = columnFromState(result.state, command.columnId);

      if (command.type === 'column.visibility') {
        return `${label} ${command.visible ? 'visível' : 'oculta'}.`;
      }
      if (command.type === 'column.reorder') {
        const position = result.state.columns.findIndex(
          ({ columnId }) => columnId === command.columnId,
        );
        return `${label}, posição ${position + 1} de ${result.state.columns.length}.`;
      }
      if (command.type === 'column.resize') {
        return `${label}, largura ${nextColumn?.width ?? command.width} pixels.`;
      }
      if (command.side === 'start') return `${label} fixada no início.`;
      if (command.side === 'end') return `${label} fixada no fim.`;
      return `${label} desafixada.`;
    }

    return command.type === 'view.reset'
      ? 'A visualização foi restaurada.'
      : 'Ajuste aplicado à tabela.';
  };

  const emit = (command: TableViewCommand, acceptedMessage?: string): TableViewCommandResult => {
    const result = dispatch(command);
    if (result.accepted) {
      stateRef.current = result.state;
      announce(acceptedMessage ?? messageForAccepted(result, command));
    } else {
      const column = 'columnId' in command ? schemaById.get(command.columnId) : undefined;
      announce(rejectionMessage(result.event.reason.code, column));
    }
    return result;
  };

  const setSession = (session: OperationSession | null) => {
    operationRef.current = session;
    setOperation(session);
  };

  const beginSession = (
    kind: OperationKind,
    input: OperationInput,
    columnId: string,
    pointer?: { readonly startX: number; readonly startWidth: number },
  ) => {
    if (operationRef.current !== null) return;
    setSession({
      kind,
      input,
      columnId,
      snapshot: stateRef.current,
      ...(pointer === undefined ? {} : pointer),
    });
  };

  const restoreSnapshot = (snapshot: TableViewState, message: string): TableViewCommandResult =>
    emit(
      {
        type: 'view.reset',
        baseline: asResetBaseline(snapshot, stateRef.current),
      },
      message,
    );

  const rollbackOperation = () => {
    const activeOperation = operationRef.current;
    if (activeOperation === null) return;
    const focusTarget =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const label = schemaById.get(activeOperation.columnId)?.label ?? activeOperation.columnId;
    restoreSnapshot(activeOperation.snapshot, `${label}, operação desfeita.`);
    setSession(null);
    focusTarget?.focus();
  };

  const closeWithRollback = () => {
    const openingSnapshot = openingSnapshotRef.current;
    if (openingSnapshot !== null) {
      restoreSnapshot(openingSnapshot, 'Ajustes descartados.');
    }
    acceptedCloseRef.current = true;
    setSession(null);
    setOpen(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      openingSnapshotRef.current = stateRef.current;
      acceptedCloseRef.current = false;
      setSearch('');
      setAnnouncement('Personalização da tabela aberta.');
      setOpen(true);
      return;
    }

    if (!acceptedCloseRef.current && openingSnapshotRef.current !== null) {
      restoreSnapshot(openingSnapshotRef.current, 'Personalização da tabela fechada.');
    }
    setSession(null);
    setOpen(false);
  };

  const moveColumn = (columnId: string, toIndex: number) => {
    emit({ type: 'column.reorder', columnId, toIndex });
  };

  const handleMoveKeyDown = (event: KeyboardEvent<HTMLButtonElement>, columnId: string) => {
    const active = operationRef.current;
    const isActiveMove = active?.kind === 'move' && active.columnId === columnId;

    if (!isActiveMove && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      beginSession('move', 'keyboard', columnId);
      const label = schemaById.get(columnId)?.label ?? columnId;
      announce(`${label} pronta para mover.`);
      return;
    }
    if (!isActiveMove) return;

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setSession(null);
      return;
    }
    if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;

    event.preventDefault();
    const currentIndex = stateRef.current.columns.findIndex(
      (column) => column.columnId === columnId,
    );
    const lastIndex = stateRef.current.columns.length - 1;
    const nextIndex =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? lastIndex
          : event.key === 'ArrowUp'
            ? Math.max(0, currentIndex - 1)
            : Math.min(lastIndex, currentIndex + 1);
    moveColumn(columnId, nextIndex);
  };

  const handleMovePointerDown = (event: PointerEvent<HTMLButtonElement>, columnId: string) => {
    beginSession('move', 'pointer', columnId);
    event.currentTarget.focus();
  };

  const handleMovePointerEnter = (targetColumnId: string) => {
    const active = operationRef.current;
    if (active?.kind !== 'move' || active.input !== 'pointer') return;
    const targetIndex = stateRef.current.columns.findIndex(
      ({ columnId }) => columnId === targetColumnId,
    );
    if (targetIndex >= 0) moveColumn(active.columnId, targetIndex);
  };

  const finishPointerMove = () => {
    if (operationRef.current?.kind === 'move' && operationRef.current.input === 'pointer') {
      setSession(null);
    }
  };

  const handleDragStart = (event: DragEvent<HTMLButtonElement>, columnId: string) => {
    beginSession('move', 'pointer', columnId);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', columnId);
  };

  const handleDrop = (event: DragEvent<HTMLElement>, targetColumnId: string) => {
    event.preventDefault();
    handleMovePointerEnter(targetColumnId);
    finishPointerMove();
  };

  const resizeColumn = (columnId: string, width: number) => {
    emit({ type: 'column.resize', columnId, width });
  };

  const handleResizeKeyDown = (
    event: KeyboardEvent<HTMLSpanElement>,
    column: TableViewColumnSchema,
  ) => {
    if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      if (
        operationRef.current?.kind !== 'resize' ||
        operationRef.current.columnId !== column.columnId
      ) {
        beginSession('resize', 'keyboard', column.columnId);
      }
      const currentWidth =
        columnFromState(stateRef.current, column.columnId)?.width ?? column.width.default;
      const step = event.shiftKey ? 24 : 8;
      const nextWidth =
        event.key === 'Home'
          ? column.width.min
          : event.key === 'End'
            ? column.width.max
            : event.key === 'ArrowLeft'
              ? currentWidth - step
              : currentWidth + step;
      resizeColumn(column.columnId, nextWidth);
      return;
    }

    if (
      event.key === 'Enter' &&
      operationRef.current?.kind === 'resize' &&
      operationRef.current.columnId === column.columnId
    ) {
      event.preventDefault();
      setSession(null);
    }
  };

  const handleResizePointerDown = (
    event: PointerEvent<HTMLSpanElement>,
    column: TableViewColumnSchema,
  ) => {
    const currentWidth =
      columnFromState(stateRef.current, column.columnId)?.width ?? column.width.default;
    beginSession('resize', 'pointer', column.columnId, {
      startX: event.clientX,
      startWidth: currentWidth,
    });
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handleResizePointerMove = (event: PointerEvent<HTMLSpanElement>) => {
    const active = operationRef.current;
    if (
      active?.kind !== 'resize' ||
      active.input !== 'pointer' ||
      active.startX === undefined ||
      active.startWidth === undefined
    ) {
      return;
    }
    resizeColumn(active.columnId, active.startWidth + event.clientX - active.startX);
  };

  const finishPointerResize = (event: PointerEvent<HTMLSpanElement>) => {
    const active = operationRef.current;
    if (active?.kind !== 'resize' || active.input !== 'pointer') return;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    setSession(null);
  };

  const resetColumns = () => {
    const resetState: TableViewState = {
      ...stateRef.current,
      viewId: stateRef.current.baselineViewId,
      baselineViewId: stateRef.current.baselineViewId,
      columns: baseline.columns,
    };
    emit(
      { type: 'view.reset', baseline: resetState },
      'Colunas restauradas para a configuração da visualização.',
    );
  };

  const resetView = () => {
    emit(
      {
        type: 'view.reset',
        baseline: asResetBaseline(baseline, stateRef.current),
      },
      'Visualização restaurada para a configuração salva.',
    );
  };

  const saveView = async () => {
    setSaving(true);
    try {
      const saved = await onSave();
      if (saved === false) {
        announce('Não foi possível salvar a visualização. Os ajustes continuam disponíveis.');
        return;
      }
      acceptedCloseRef.current = true;
      openingSnapshotRef.current = stateRef.current;
      announce('Visualização salva.');
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Popover
      align="end"
      closeLabel="Fechar personalização"
      contentClassName="table-view-customizer"
      initialFocusId={searchId}
      onOpenChange={handleOpenChange}
      onEscapeKeyDown={(event) => {
        if (operationRef.current === null) return;
        event.preventDefault();
        rollbackOperation();
      }}
      open={open}
      title="Configurar tabela"
      triggerAccessibleLabel="Configurar tabela"
      triggerClassName="table-view-customizer__trigger"
      triggerContent={
        <>
          <Icon name="columns" size={16} />
          <span>Configurar tabela</span>
        </>
      }
      triggerDisabled={disabled}
      triggerLabel="Configurar tabela"
      triggerTooltip="Ajustar colunas, largura e fixação"
    >
      <div className="table-view-customizer__content">
        <TextField
          autoComplete="off"
          id={searchId}
          label="Buscar colunas"
          onChange={(event) => setSearch(event.currentTarget.value)}
          placeholder="Nome da coluna"
          type="search"
          value={search}
        />

        <div className="table-view-customizer__summary">
          <span>{state.columns.filter(({ visible }) => visible).length} colunas visíveis</span>
          {dirty && <strong>Alterações não salvas</strong>}
        </div>

        {filteredSchemas.length === 0 ? (
          <section className="table-view-customizer__empty">
            <h4>Nenhuma coluna encontrada</h4>
            <p>Tente outro nome; as colunas do elenco continuam disponíveis.</p>
            <Button onClick={() => setSearch('')} variant="secondary">
              Limpar busca de colunas
            </Button>
          </section>
        ) : (
          <div aria-label="Colunas da tabela" className="table-view-customizer__columns">
            {filteredSchemas.map((columnSchema) => {
              const columnState = columnFromState(state, columnSchema.columnId);
              if (columnState === undefined) return null;
              const requiredReasonId = `${searchId}-${columnSchema.columnId}-required`;
              const moving =
                operation?.kind === 'move' && operation.columnId === columnSchema.columnId;
              const resizing =
                operation?.kind === 'resize' && operation.columnId === columnSchema.columnId;

              return (
                <section
                  aria-label={`Coluna ${columnSchema.label}`}
                  className="table-view-customizer__column"
                  data-column-id={columnSchema.columnId}
                  data-moving={moving || undefined}
                  data-pinned={columnState.pinning.side}
                  data-resizing={resizing || undefined}
                  key={columnSchema.columnId}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => handleDrop(event, columnSchema.columnId)}
                  onPointerEnter={() => handleMovePointerEnter(columnSchema.columnId)}
                  role="group"
                >
                  <div className="table-view-customizer__column-heading">
                    <button
                      aria-label={`Mover ${columnSchema.label}`}
                      aria-pressed={moving}
                      className="table-view-customizer__move"
                      data-control="move"
                      draggable
                      onDragEnd={finishPointerMove}
                      onDragStart={(event) => handleDragStart(event, columnSchema.columnId)}
                      onKeyDown={(event) => handleMoveKeyDown(event, columnSchema.columnId)}
                      onPointerDown={(event) => handleMovePointerDown(event, columnSchema.columnId)}
                      onPointerUp={finishPointerMove}
                      type="button"
                    >
                      <span aria-hidden="true">⋮⋮</span>
                    </button>
                    <span>
                      <strong>{columnSchema.label}</strong>
                      <small>{columnState.width}px</small>
                    </span>
                    <button
                      aria-describedby={columnSchema.required ? requiredReasonId : undefined}
                      aria-disabled={columnSchema.required || undefined}
                      aria-label={`${columnState.visible ? 'Ocultar' : 'Mostrar'} ${columnSchema.label}`}
                      aria-pressed={columnState.visible}
                      className="table-view-customizer__visibility"
                      onClick={() =>
                        emit({
                          type: 'column.visibility',
                          columnId: columnSchema.columnId,
                          visible: !columnState.visible,
                        })
                      }
                      type="button"
                    >
                      {columnState.visible ? 'Ocultar' : 'Mostrar'}
                    </button>
                  </div>

                  {columnSchema.required && (
                    <p className="table-view-customizer__required" id={requiredReasonId}>
                      {columnSchema.requiredReason}
                    </p>
                  )}

                  <div className="table-view-customizer__geometry">
                    <span
                      aria-label={`Redimensionar ${columnSchema.label}`}
                      aria-orientation="vertical"
                      aria-valuemax={columnSchema.width.max}
                      aria-valuemin={columnSchema.width.min}
                      aria-valuenow={columnState.width}
                      className="table-view-customizer__resize"
                      data-control="resize"
                      onKeyDown={(event) => handleResizeKeyDown(event, columnSchema)}
                      onPointerDown={(event) => handleResizePointerDown(event, columnSchema)}
                      onPointerMove={handleResizePointerMove}
                      onPointerUp={finishPointerResize}
                      role="separator"
                      tabIndex={0}
                    />
                    <span aria-hidden="true" className="table-view-customizer__width">
                      {columnSchema.width.min}–{columnSchema.width.max}px
                    </span>
                  </div>

                  {columnSchema.capabilities.pinnable && (
                    <div
                      aria-label={`Fixação de ${columnSchema.label}`}
                      className="table-view-customizer__pinning"
                      role="group"
                    >
                      {columnState.pinning.side !== 'start' && (
                        <button
                          onClick={() =>
                            emit({
                              type: 'column.pin',
                              columnId: columnSchema.columnId,
                              side: 'start',
                            })
                          }
                          type="button"
                        >
                          Fixar no início
                        </button>
                      )}
                      {columnState.pinning.side !== 'end' && (
                        <button
                          onClick={() =>
                            emit({
                              type: 'column.pin',
                              columnId: columnSchema.columnId,
                              side: 'end',
                            })
                          }
                          type="button"
                        >
                          Fixar no fim
                        </button>
                      )}
                      {columnState.pinning.side !== 'none' && (
                        <button
                          onClick={() =>
                            emit({
                              type: 'column.pin',
                              columnId: columnSchema.columnId,
                              side: 'none',
                            })
                          }
                          type="button"
                        >
                          Desafixar coluna
                        </button>
                      )}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}

        <div className="table-view-customizer__resets">
          <Button disabled={busy || saving} onClick={resetColumns} variant="secondary">
            Restaurar colunas
          </Button>
          <Button disabled={busy || saving} onClick={resetView} variant="secondary">
            Restaurar visualização
          </Button>
        </div>

        <div className="table-view-customizer__actions">
          <Button disabled={busy || saving} onClick={closeWithRollback} variant="secondary">
            Descartar ajustes
          </Button>
          <Button
            disabled={busy || saving || !dirty}
            leadingIcon="save"
            loading={saving}
            loadingLabel="Salvando visualização…"
            onClick={() => void saveView()}
            variant="primary"
          >
            Salvar visualização
          </Button>
        </div>

        <p aria-atomic="true" aria-live="polite" className="sr-only" role="status">
          {announcement}
        </p>
      </div>
    </Popover>
  );
}
