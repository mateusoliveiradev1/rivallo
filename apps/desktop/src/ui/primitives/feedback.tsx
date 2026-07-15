import { Icon, type GenericIconName } from '@rivallo/icons';
import type { ReactNode } from 'react';

import { Button } from './actions.js';

export type StatusVariant =
  'neutral' | 'info' | 'positive' | 'warning' | 'danger' | 'offline' | 'loading';

const statusPresentation = {
  neutral: { icon: 'information', label: 'Estado neutro' },
  info: { icon: 'information', label: 'Informação' },
  positive: { icon: 'success', label: 'Positivo' },
  warning: { icon: 'warning', label: 'Atenção' },
  danger: { icon: 'danger', label: 'Crítico' },
  offline: { icon: 'warning', label: 'Offline' },
  loading: { icon: 'loading', label: 'Carregando' },
} as const satisfies Record<
  StatusVariant,
  { readonly icon: GenericIconName; readonly label: string }
>;

export interface StatusProps {
  readonly variant: StatusVariant;
  readonly children: ReactNode;
  readonly label?: string;
  readonly labelId?: string;
  readonly headingLevel?: 2 | 3 | 4;
  readonly className?: string;
}

export function Status({
  variant,
  children,
  label,
  labelId,
  headingLevel,
  className,
}: StatusProps) {
  const presentation = statusPresentation[variant];
  const assertive = variant === 'danger';
  const loading = variant === 'loading';
  const visibleLabel = label ?? presentation.label;
  const heading =
    headingLevel === 2 ? (
      <h2 className="rv-status__label" id={labelId}>
        {visibleLabel}
      </h2>
    ) : headingLevel === 3 ? (
      <h3 className="rv-status__label" id={labelId}>
        {visibleLabel}
      </h3>
    ) : headingLevel === 4 ? (
      <h4 className="rv-status__label" id={labelId}>
        {visibleLabel}
      </h4>
    ) : (
      <strong className="rv-status__label" id={labelId}>
        {visibleLabel}
      </strong>
    );

  return (
    <div
      aria-busy={loading || undefined}
      aria-live={assertive ? 'assertive' : 'polite'}
      className={['rv-status', className].filter(Boolean).join(' ')}
      data-variant={variant}
      role={assertive ? 'alert' : 'status'}
    >
      <Icon className={loading ? 'rv-icon--loading' : undefined} name={presentation.icon} />
      <div className="rv-status__content">
        {heading}
        <div className="rv-status__message">{children}</div>
      </div>
    </div>
  );
}

export interface SkeletonProps {
  readonly lines?: number;
  readonly className?: string;
}

export function Skeleton({ lines = 1, className }: SkeletonProps) {
  const safeLines = Math.max(1, Math.floor(lines));

  return (
    <div
      aria-hidden="true"
      className={['rv-skeleton', className].filter(Boolean).join(' ')}
      data-reduced-motion="static"
    >
      {Array.from({ length: safeLines }, (_, index) => (
        <span className="rv-skeleton__line" key={index} />
      ))}
    </div>
  );
}

export interface EmptyStateProps {
  readonly heading?: string;
  readonly body?: string;
  readonly action?: ReactNode;
}

export function EmptyState({
  heading = 'Nenhum exemplo disponível para este estado.',
  body = 'Selecione outro estado no controle acima para continuar a inspeção.',
  action,
}: EmptyStateProps) {
  return (
    <section className="rv-empty-state">
      <Icon name="information" />
      <div>
        <h3>{heading}</h3>
        <p>{body}</p>
        {action && <div className="rv-state-action">{action}</div>}
      </div>
    </section>
  );
}

export interface ErrorStateProps {
  readonly message?: string;
  readonly retryLabel?: string;
  readonly onRetry?: () => void;
}

export function ErrorState({
  message = 'Não foi possível renderizar este exemplo. Revise a configuração e tente novamente.',
  retryLabel = 'Tentar novamente',
  onRetry,
}: ErrorStateProps) {
  return (
    <section className="rv-error-state" role="alert">
      <Icon name="danger" />
      <div>
        <h3>{message}</h3>
        {onRetry && (
          <div className="rv-state-action">
            <Button leadingIcon="retry" onClick={onRetry} variant="secondary">
              {retryLabel}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
