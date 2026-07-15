import { Icon } from '@rivallo/icons';
import { useCallback, useEffect, useId, useState } from 'react';

import { IconButton } from './actions.js';

export interface ToastProps {
  readonly title: string;
  readonly message: string;
  readonly tone?: 'neutral' | 'positive';
  readonly durationMs?: number;
  readonly onDismiss?: () => void;
}

export function Toast({
  title,
  message,
  tone = 'neutral',
  durationMs = 5000,
  onDismiss,
}: ToastProps) {
  const titleId = `rv-toast-${useId()}`;
  const [open, setOpen] = useState(true);
  const dismiss = useCallback(() => {
    setOpen(false);
    onDismiss?.();
  }, [onDismiss]);

  useEffect(() => {
    if (!open) return undefined;
    const timer = window.setTimeout(dismiss, durationMs);
    return () => window.clearTimeout(timer);
  }, [dismiss, durationMs, open]);

  if (!open) return null;

  return (
    <section
      aria-labelledby={titleId}
      aria-live="polite"
      className="rv-toast"
      data-persistence="brief"
      data-tone={tone}
      role="status"
    >
      <Icon name={tone === 'positive' ? 'success' : 'information'} />
      <div className="rv-toast__content">
        <strong id={titleId}>{title}</strong>
        <p>{message}</p>
      </div>
      <IconButton
        accessibleLabel="Dispensar aviso"
        icon="close"
        onClick={dismiss}
        stablePosition
        tooltip="Dispensar aviso"
      />
    </section>
  );
}
