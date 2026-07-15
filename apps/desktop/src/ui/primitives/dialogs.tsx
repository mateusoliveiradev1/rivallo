import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';

import { Button, IconButton } from './actions.js';

export interface DialogProps {
  readonly triggerLabel: string;
  readonly title: string;
  readonly description: string;
  readonly children: ReactNode;
}

export function Dialog({ triggerLabel, title, description, children }: DialogProps) {
  return (
    <DialogPrimitive.Root>
      <DialogPrimitive.Trigger asChild>
        <Button variant="secondary">{triggerLabel}</Button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="rv-modal-backdrop" />
        <DialogPrimitive.Content className="rv-dialog">
          <div className="rv-overlay__header">
            <DialogPrimitive.Title>{title}</DialogPrimitive.Title>
          </div>
          <DialogPrimitive.Description className="rv-dialog__description">
            {description}
          </DialogPrimitive.Description>
          <div className="rv-dialog__content">{children}</div>
          <DialogPrimitive.Close asChild>
            <IconButton
              accessibleLabel="Fechar diálogo"
              className="rv-dialog__close"
              icon="close"
              stablePosition
              tooltip="Fechar diálogo"
            />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export interface AlertDialogProofProps {
  readonly triggerLabel: string;
}

export function AlertDialogProof({ triggerLabel }: AlertDialogProofProps) {
  return (
    <AlertDialogPrimitive.Root>
      <AlertDialogPrimitive.Trigger asChild>
        <Button variant="secondary">{triggerLabel}</Button>
      </AlertDialogPrimitive.Trigger>
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay className="rv-modal-backdrop" />
        <AlertDialogPrimitive.Content className="rv-dialog rv-alert-dialog">
          <AlertDialogPrimitive.Title>Confirmar ação</AlertDialogPrimitive.Title>
          <AlertDialogPrimitive.Description className="rv-dialog__description">
            Esta demonstração confirma apenas o comportamento do diálogo. Nenhuma ação real será
            executada.
          </AlertDialogPrimitive.Description>
          <div className="rv-dialog__actions">
            <AlertDialogPrimitive.Cancel asChild>
              <Button variant="primary">Cancelar</Button>
            </AlertDialogPrimitive.Cancel>
            <AlertDialogPrimitive.Action asChild>
              <Button variant="destructive-proof">Confirmar ação</Button>
            </AlertDialogPrimitive.Action>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}
