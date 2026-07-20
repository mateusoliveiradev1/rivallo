import { Icon } from '@rivallo/icons';
import { useState, type ReactNode } from 'react';
import { Popover } from '../primitives/disclosure.js';
import type {
  TableViewDensitySchema,
  TableViewProvenance,
} from '../../table-view/table-view-engine.js';
import './DataTable.css';

const provenanceLabels: Record<TableViewProvenance, string> = {
  'system-default': 'Preset do sistema',
  'user-owned': 'Visualização personalizada',
  'shared-read-only': 'Visualização importada',
};

export interface TableViewStatusProps {
  readonly provenance: TableViewProvenance;
  readonly isDefault: boolean;
  readonly dirty: boolean;
}

export function TableViewStatus({ provenance, isDefault, dirty }: TableViewStatusProps) {
  return (
    <div aria-label="Estado da visualização ativa" className="rv-table-view-status">
      <span>{provenanceLabels[provenance]}</span>
      {isDefault && (
        <span>
          <Icon name="check" size={16} />
          Padrão
        </span>
      )}
      {dirty && (
        <strong>
          <Icon name="warning" size={16} />
          Alterações não salvas
        </strong>
      )}
    </div>
  );
}

export interface TableDensityControlProps {
  readonly densities: readonly TableViewDensitySchema[];
  readonly density: string;
  readonly onChange: (density: string) => void;
  readonly disabled?: boolean;
  readonly title?: string;
}

export function TableDensityControl({
  densities,
  density,
  onChange,
  disabled,
  title = 'Densidade da tabela',
}: TableDensityControlProps) {
  const [open, setOpen] = useState(false);
  const activeDensity = densities.find(({ densityId }) => densityId === density) ?? densities[0];
  if (activeDensity === undefined) throw new Error('TableDensityControl requires density options.');

  return (
    <div className="rv-table-density">
      <span>Densidade</span>
      <Popover
        align="end"
        contentClassName="table-control-popover density-picker"
        onOpenChange={setOpen}
        open={open}
        title={title}
        triggerAccessibleLabel={`Alterar densidade da tabela: ${activeDensity.label}`}
        triggerClassName="density-picker__trigger"
        triggerContent={
          <>
            <i aria-hidden="true" data-lines={activeDensity.densityId} />
            <span>{activeDensity.label}</span>
          </>
        }
        triggerDisabled={disabled}
        triggerLabel="Densidade"
        triggerTooltip="Alterar espaçamento das linhas"
      >
        <div aria-label="Densidade da tabela" className="density-picker__menu" role="group">
          {densities.map((option) => (
            <button
              aria-label={`Densidade ${option.label.toLocaleLowerCase('pt-BR')}`}
              aria-pressed={density === option.densityId}
              className="density-option"
              key={option.densityId}
              onClick={() => {
                onChange(option.densityId);
                setOpen(false);
              }}
              type="button"
            >
              <i aria-hidden="true" data-lines={option.densityId} />
              <span>{option.label}</span>
              <b>{density === option.densityId ? 'Atual' : 'Selecionar'}</b>
            </button>
          ))}
        </div>
      </Popover>
    </div>
  );
}

export interface DataTableWorkspaceHeaderProps {
  readonly recordLabel: string;
  readonly recordHeadingId?: string;
  readonly contextLabel: string;
  readonly viewSelector: ReactNode;
  readonly viewStatus: ReactNode;
  readonly densityControl: ReactNode;
  readonly configurationTrigger: ReactNode;
  readonly feedback?: ReactNode;
}

export function DataTableWorkspaceHeader({
  recordLabel,
  recordHeadingId,
  contextLabel,
  viewSelector,
  viewStatus,
  densityControl,
  configurationTrigger,
  feedback,
}: DataTableWorkspaceHeaderProps) {
  return (
    <header className="rv-data-table-workspace-header">
      <div className="rv-data-table-workspace-header__records">
        <h2 id={recordHeadingId}>{recordLabel}</h2>
        <span>{contextLabel}</span>
      </div>
      <div className="rv-data-table-workspace-header__view">
        {viewSelector}
        {viewStatus}
      </div>
      <div className="rv-data-table-workspace-header__actions">
        {densityControl}
        {configurationTrigger}
      </div>
      {feedback ? <div className="rv-data-table-workspace-header__feedback">{feedback}</div> : null}
    </header>
  );
}
