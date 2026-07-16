import { Icon, type GenericIconName } from '@rivallo/icons';
import { useEffect, useId, useMemo, useRef, useState } from 'react';

import { Button, IconButton } from '../ui/primitives/actions.js';
import { Popover } from '../ui/primitives/disclosure.js';
import { TextField } from '../ui/primitives/forms.js';

export interface SavedViewSelectorView {
  readonly mutability: 'immutable' | 'mutable' | 'read-only';
  readonly state: {
    readonly viewId: string;
    readonly label: string;
    readonly provenance: 'system-default' | 'user-owned' | 'shared-read-only';
  };
}

const provenanceOrder = {
  'system-default': 0,
  'user-owned': 1,
  'shared-read-only': 2,
} as const satisfies Record<SavedViewSelectorView['state']['provenance'], number>;

const provenancePresentation = {
  'system-default': {
    icon: 'favorite',
    label: 'Padrão do sistema',
  },
  'user-owned': {
    icon: 'edit',
    label: 'Minha visualização',
  },
  'shared-read-only': {
    icon: 'information',
    label: 'Somente leitura',
  },
} as const satisfies Record<
  SavedViewSelectorView['state']['provenance'],
  { readonly icon: GenericIconName; readonly label: string }
>;

const orderViews = (views: readonly SavedViewSelectorView[]): readonly SavedViewSelectorView[] =>
  [...views].sort((left, right) => {
    const provenanceDifference =
      provenanceOrder[left.state.provenance] - provenanceOrder[right.state.provenance];
    if (provenanceDifference !== 0) return provenanceDifference;

    const labelDifference = left.state.label.localeCompare(right.state.label, 'pt-BR', {
      sensitivity: 'base',
    });
    if (labelDifference !== 0) return labelDifference;

    return left.state.viewId.localeCompare(right.state.viewId);
  });

export interface SavedViewSelectorProps {
  readonly views: readonly SavedViewSelectorView[];
  readonly activeViewId: string;
  readonly defaultViewId: string;
  readonly dirty: boolean;
  readonly busy?: boolean;
  readonly disabled?: boolean;
  readonly mutationsDisabled?: boolean;
  readonly onActivate: (viewId: string) => void;
  readonly onCreate: () => void;
  readonly onDuplicate: (viewId: string) => void;
  readonly onRename: (viewId: string) => void;
  readonly onDelete: (viewId: string) => void;
  readonly onSetDefault: (viewId: string) => void;
  readonly onReset: () => void;
  readonly onSave: () => void;
}

export function SavedViewSelector({
  views,
  activeViewId,
  defaultViewId,
  dirty,
  busy = false,
  disabled = false,
  mutationsDisabled = false,
  onActivate,
  onCreate,
  onDuplicate,
  onRename,
  onDelete,
  onSetDefault,
  onReset,
  onSave,
}: SavedViewSelectorProps) {
  const [open, setOpen] = useState(false);
  const orderedViews = useMemo(() => orderViews(views), [views]);
  const activeView =
    orderedViews.find(({ state }) => state.viewId === activeViewId) ?? orderedViews[0];
  const hasUserOwnedViews = orderedViews.some(({ state }) => state.provenance === 'user-owned');

  if (activeView === undefined) {
    throw new Error('SavedViewSelector requires at least one validated saved view.');
  }

  const activeProvenance = activeView.state.provenance;
  const canManageActive = activeProvenance === 'user-owned' && activeView.mutability === 'mutable';
  const canSetDefault =
    (activeProvenance === 'system-default' && activeView.mutability === 'immutable') ||
    canManageActive;
  const immutableDirty = dirty && !canManageActive;
  const interactionDisabled = busy || disabled;
  const mutationDisabled = interactionDisabled || mutationsDisabled;

  const selectAndClose = (callback: () => void) => {
    callback();
    setOpen(false);
  };

  return (
    <div className="saved-view-selector">
      <Popover
        align="end"
        contentClassName="saved-view-selector__popover"
        onOpenChange={setOpen}
        open={open}
        title="Visualização da tabela"
        triggerAccessibleLabel={`Visualização da tabela: ${activeView.state.label}`}
        triggerClassName="saved-view-selector__trigger"
        triggerContent={
          <>
            <Icon name="workspace" size={16} />
            <span className="saved-view-selector__trigger-copy">
              <span>Visualização da tabela</span>
              <strong title={activeView.state.label}>{activeView.state.label}</strong>
            </span>
          </>
        }
        triggerDisabled={interactionDisabled}
        triggerLabel="Visualização da tabela"
      >
        <div className="saved-view-selector__content">
          <div aria-label="Visualizações disponíveis" className="saved-view-selector__list">
            {orderedViews.map((view) => {
              const active = view.state.viewId === activeViewId;
              const defaultView = view.state.viewId === defaultViewId;
              const presentation = provenancePresentation[view.state.provenance];
              const stateLabels = [
                presentation.label,
                active ? 'Visualização ativa' : null,
                defaultView ? 'Visualização padrão' : null,
                active && dirty ? 'Alterações não salvas' : null,
              ].filter((label): label is string => label !== null);

              return (
                <Button
                  aria-current={active ? 'true' : undefined}
                  aria-label={`Abrir visualização ${view.state.label}. ${stateLabels.join('. ')}`}
                  className="saved-view-selector__option"
                  data-view-id={view.state.viewId}
                  disabled={interactionDisabled}
                  key={view.state.viewId}
                  onClick={() => selectAndClose(() => onActivate(view.state.viewId))}
                  title={view.state.label}
                  variant="quiet"
                >
                  <Icon name={presentation.icon} size={16} />
                  <span className="saved-view-selector__option-copy">
                    <strong>{view.state.label}</strong>
                    <span>{presentation.label}</span>
                  </span>
                  <span className="saved-view-selector__option-state">
                    {defaultView && <span>Visualização padrão</span>}
                    {active && <span>Visualização ativa</span>}
                    {active && dirty && <span>Alterações não salvas</span>}
                  </span>
                </Button>
              );
            })}
          </div>

          {!hasUserOwnedViews && (
            <section className="saved-view-selector__empty">
              <h4>Você ainda não criou visualizações</h4>
              <p>
                Crie uma configuração própria de colunas, filtros e ordenação sem alterar os dados
                do elenco.
              </p>
              <Button
                disabled={mutationDisabled || dirty}
                leadingIcon="add"
                onClick={() => selectAndClose(onCreate)}
                variant="secondary"
              >
                Criar primeira visualização
              </Button>
            </section>
          )}

          {immutableDirty && (
            <section className="saved-view-selector__readonly">
              <p>
                Esta visualização não pode ser editada diretamente. Duplique-a para criar uma versão
                própria.
              </p>
              <Button
                disabled={mutationDisabled}
                leadingIcon="copy"
                onClick={() => selectAndClose(() => onDuplicate(activeView.state.viewId))}
                variant="primary"
              >
                Duplicar para editar
              </Button>
            </section>
          )}

          <section
            aria-label={`Ações para ${activeView.state.label}`}
            className="saved-view-selector__actions"
          >
            {!immutableDirty && (
              <Button
                disabled={mutationDisabled || (dirty && canManageActive)}
                leadingIcon="copy"
                onClick={() => selectAndClose(() => onDuplicate(activeView.state.viewId))}
                variant="secondary"
              >
                Duplicar visualização
              </Button>
            )}

            {canManageActive && (
              <>
                <Button
                  disabled={mutationDisabled || dirty}
                  leadingIcon="edit"
                  onClick={() => selectAndClose(() => onRename(activeView.state.viewId))}
                  variant="secondary"
                >
                  Renomear visualização
                </Button>
                <Button
                  disabled={mutationDisabled}
                  onClick={() => selectAndClose(() => onDelete(activeView.state.viewId))}
                  variant="secondary"
                >
                  Excluir visualização
                </Button>
              </>
            )}

            {canSetDefault && (
              <Button
                disabled={mutationDisabled || dirty || activeView.state.viewId === defaultViewId}
                leadingIcon="favorite"
                onClick={() => selectAndClose(() => onSetDefault(activeView.state.viewId))}
                variant="secondary"
              >
                Definir como visualização padrão
              </Button>
            )}

            {canManageActive && (
              <>
                <Button
                  disabled={mutationDisabled || !dirty}
                  leadingIcon="retry"
                  onClick={() => selectAndClose(onReset)}
                  variant="secondary"
                >
                  Restaurar visualização
                </Button>
                <Button
                  disabled={mutationDisabled || !dirty}
                  leadingIcon="save"
                  onClick={() => selectAndClose(onSave)}
                  variant="primary"
                >
                  Salvar visualização
                </Button>
              </>
            )}

            {hasUserOwnedViews && (
              <Button
                disabled={mutationDisabled || dirty}
                leadingIcon="add"
                onClick={() => selectAndClose(onCreate)}
                variant="secondary"
              >
                Criar visualização
              </Button>
            )}
          </section>
        </div>
      </Popover>
    </div>
  );
}

export type SavedViewNameDialogMode = 'create' | 'duplicate' | 'rename' | 'save-as';

const nameDialogCopy = {
  create: {
    title: 'Criar visualização',
    description: 'Dê um nome para guardar esta configuração de colunas, filtros e ordenação.',
    action: 'Criar visualização',
  },
  duplicate: {
    title: 'Duplicar visualização',
    description: 'Crie uma cópia própria sem alterar a visualização de origem.',
    action: 'Duplicar visualização',
  },
  rename: {
    title: 'Renomear visualização',
    description: 'O identificador estável e os ajustes desta visualização serão preservados.',
    action: 'Renomear visualização',
  },
  'save-as': {
    title: 'Criar uma visualização editável',
    description:
      'A visualização de origem continuará protegida. Seus ajustes serão salvos em uma cópia própria.',
    action: 'Duplicar para editar',
  },
} as const satisfies Record<
  SavedViewNameDialogMode,
  { readonly title: string; readonly description: string; readonly action: string }
>;

const openNativeDialog = (dialog: HTMLDialogElement | null, initialFocus: HTMLElement | null) => {
  if (dialog === null) return;
  if (!dialog.open) {
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }
  initialFocus?.focus();
};

export interface SavedViewNameDialogProps {
  readonly mode: SavedViewNameDialogMode;
  readonly initialValue: string;
  readonly busy: boolean;
  readonly onDismiss: () => void;
  readonly onSubmit: (name: string) => void;
}

export function SavedViewNameDialog({
  mode,
  initialValue,
  busy,
  onDismiss,
  onSubmit,
}: SavedViewNameDialogProps) {
  const copy = nameDialogCopy[mode];
  const titleId = `saved-view-name-${useId()}`;
  const descriptionId = `${titleId}-description`;
  const inputId = `${titleId}-input`;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState(initialValue);
  const [error, setError] = useState<string>();

  useEffect(() => {
    openNativeDialog(dialogRef.current, document.getElementById(inputId));
  }, [inputId]);

  const focusInput = () => {
    document.getElementById(inputId)?.focus();
  };

  const submit = () => {
    const normalizedName = name.trim();
    if (normalizedName.length === 0) {
      setError('Digite um nome para a visualização.');
      focusInput();
      return;
    }
    if (normalizedName.length > 80) {
      setError('Use no máximo 80 caracteres para o nome da visualização.');
      focusInput();
      return;
    }
    setError(undefined);
    onSubmit(normalizedName);
  };

  return (
    <dialog
      aria-describedby={descriptionId}
      aria-labelledby={titleId}
      className="saved-view-dialog"
      onCancel={(event) => {
        event.preventDefault();
        onDismiss();
      }}
      ref={dialogRef}
    >
      <header className="saved-view-dialog__header">
        <div>
          <h2 id={titleId}>{copy.title}</h2>
          <p id={descriptionId}>{copy.description}</p>
        </div>
        <IconButton
          accessibleLabel="Fechar diálogo de visualização"
          icon="close"
          onClick={onDismiss}
          stablePosition
          tooltip="Fechar diálogo de visualização"
        />
      </header>
      <form
        className="saved-view-dialog__form"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <TextField
          autoFocus
          disabled={busy}
          error={error}
          id={inputId}
          label="Nome da visualização"
          maxLength={80}
          onChange={(event) => setName(event.currentTarget.value)}
          value={name}
        />
        <div className="saved-view-dialog__actions">
          <Button disabled={busy} onClick={onDismiss} variant="secondary">
            Voltar para visualização
          </Button>
          <Button
            loading={busy}
            loadingLabel="Salvando visualização…"
            type="submit"
            variant="primary"
          >
            {copy.action}
          </Button>
        </div>
      </form>
    </dialog>
  );
}

export interface SavedViewDeleteDialogProps {
  readonly viewName: string;
  readonly busy: boolean;
  readonly onDismiss: () => void;
  readonly onConfirm: () => void;
}

export function SavedViewDeleteDialog({
  viewName,
  busy,
  onDismiss,
  onConfirm,
}: SavedViewDeleteDialogProps) {
  const titleId = `saved-view-delete-${useId()}`;
  const descriptionId = `${titleId}-description`;
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    openNativeDialog(
      dialogRef.current,
      dialogRef.current?.querySelector<HTMLElement>('[data-dialog-initial-focus]') ?? null,
    );
  }, []);

  return (
    <dialog
      aria-describedby={descriptionId}
      aria-labelledby={titleId}
      className="saved-view-dialog"
      onCancel={(event) => {
        event.preventDefault();
        onDismiss();
      }}
      ref={dialogRef}
      role="alertdialog"
    >
      <h2 id={titleId}>Excluir visualização “{viewName}”?</h2>
      <p id={descriptionId}>
        Essa configuração será removida deste dispositivo. O elenco, os jogadores e a escalação não
        serão alterados.
      </p>
      <div className="saved-view-dialog__actions">
        <Button autoFocus data-dialog-initial-focus onClick={onDismiss} variant="primary">
          Manter visualização
        </Button>
        <Button
          disabled={busy}
          loading={busy}
          loadingLabel="Excluindo visualização…"
          onClick={onConfirm}
          variant="destructive-proof"
        >
          Excluir visualização
        </Button>
      </div>
    </dialog>
  );
}

export interface SavedViewDirtyDialogProps {
  readonly targetName: string;
  readonly busy: boolean;
  readonly onContinue: () => void;
  readonly onDiscard: () => void;
  readonly onSave: () => void;
}

export function SavedViewDirtyDialog({
  targetName,
  busy,
  onContinue,
  onDiscard,
  onSave,
}: SavedViewDirtyDialogProps) {
  const titleId = `saved-view-dirty-${useId()}`;
  const descriptionId = `${titleId}-description`;
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    openNativeDialog(
      dialogRef.current,
      dialogRef.current?.querySelector<HTMLElement>('[data-dialog-initial-focus]') ?? null,
    );
  }, []);

  return (
    <dialog
      aria-describedby={descriptionId}
      aria-labelledby={titleId}
      className="saved-view-dialog"
      onCancel={(event) => {
        event.preventDefault();
        onContinue();
      }}
      ref={dialogRef}
      role="alertdialog"
    >
      <h2 id={titleId}>Salvar alterações antes de abrir “{targetName}”?</h2>
      <p id={descriptionId}>
        A visualização atual possui ajustes ainda não gravados. Escolha o que fazer antes de trocar
        de visualização.
      </p>
      <div className="saved-view-dialog__actions">
        <Button autoFocus data-dialog-initial-focus onClick={onContinue} variant="secondary">
          Continuar nesta visualização
        </Button>
        <Button disabled={busy} onClick={onDiscard} variant="secondary">
          Descartar e abrir “{targetName}”
        </Button>
        <Button
          loading={busy}
          loadingLabel="Salvando visualização…"
          onClick={onSave}
          variant="primary"
        >
          Salvar e abrir “{targetName}”
        </Button>
      </div>
    </dialog>
  );
}
