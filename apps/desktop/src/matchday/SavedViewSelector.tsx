import { Icon, type GenericIconName } from '@rivallo/icons';
import { useMemo, useState } from 'react';

import { Button } from '../ui/primitives/actions.js';
import { Popover } from '../ui/primitives/disclosure.js';
import type { SavedTableView } from './client.js';

const provenanceOrder = {
  'system-default': 0,
  'user-owned': 1,
  'shared-read-only': 2,
} as const satisfies Record<SavedTableView['state']['provenance'], number>;

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
  SavedTableView['state']['provenance'],
  { readonly icon: GenericIconName; readonly label: string }
>;

const orderViews = (views: readonly SavedTableView[]): readonly SavedTableView[] =>
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
  readonly views: readonly SavedTableView[];
  readonly activeViewId: string;
  readonly defaultViewId: string;
  readonly dirty: boolean;
  readonly busy?: boolean;
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
  const hasUserOwnedViews = orderedViews.some(
    ({ state }) => state.provenance === 'user-owned',
  );

  if (activeView === undefined) {
    throw new Error('SavedViewSelector requires at least one validated saved view.');
  }

  const activeProvenance = activeView.state.provenance;
  const canManageActive =
    activeProvenance === 'user-owned' && activeView.mutability === 'mutable';
  const canSetDefault =
    (activeProvenance === 'system-default' && activeView.mutability === 'immutable') ||
    canManageActive;

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
                  disabled={busy}
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
                disabled={busy}
                leadingIcon="add"
                onClick={() => selectAndClose(onCreate)}
                variant="secondary"
              >
                Criar primeira visualização
              </Button>
            </section>
          )}

          <section
            aria-label={`Ações para ${activeView.state.label}`}
            className="saved-view-selector__actions"
          >
            <Button
              disabled={busy}
              leadingIcon="copy"
              onClick={() =>
                selectAndClose(() => onDuplicate(activeView.state.viewId))
              }
              variant="secondary"
            >
              Duplicar visualização
            </Button>

            {canManageActive && (
              <>
                <Button
                  disabled={busy}
                  leadingIcon="edit"
                  onClick={() => selectAndClose(() => onRename(activeView.state.viewId))}
                  variant="secondary"
                >
                  Renomear visualização
                </Button>
                <Button
                  disabled={busy}
                  onClick={() => selectAndClose(() => onDelete(activeView.state.viewId))}
                  variant="secondary"
                >
                  Excluir visualização
                </Button>
              </>
            )}

            {canSetDefault && (
              <Button
                disabled={busy || activeView.state.viewId === defaultViewId}
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
                  disabled={busy || !dirty}
                  leadingIcon="retry"
                  onClick={() => selectAndClose(onReset)}
                  variant="secondary"
                >
                  Restaurar visualização
                </Button>
                <Button
                  disabled={busy || !dirty}
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
                disabled={busy}
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
