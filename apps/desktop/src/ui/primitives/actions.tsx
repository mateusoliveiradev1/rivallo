import { Icon, type GenericIconName } from '@rivallo/icons';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { Tooltip } from './disclosure.js';

type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'destructive-proof';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'color'> {
  readonly variant?: ButtonVariant;
  readonly loading?: boolean;
  readonly loadingLabel?: string;
  readonly leadingIcon?: GenericIconName;
  readonly children: ReactNode;
}

export function Button({
  variant = 'secondary',
  loading = false,
  loadingLabel = 'Carregando',
  leadingIcon,
  disabled,
  type = 'button',
  className,
  children,
  ...buttonProps
}: ButtonProps) {
  return (
    <button
      {...buttonProps}
      aria-busy={loading || undefined}
      className={['rv-button', className].filter(Boolean).join(' ')}
      data-loading={loading || undefined}
      data-variant={variant}
      disabled={disabled || loading}
      type={type}
    >
      <span className="rv-button__label" data-loading-hidden={loading || undefined}>
        {leadingIcon && <Icon name={leadingIcon} size={16} />}
        {children}
      </span>
      {loading && (
        <span className="rv-button__loading">
          <Icon className="rv-icon--loading" name="loading" size={16} />
          <span>{loadingLabel}</span>
        </span>
      )}
    </button>
  );
}

type IconButtonBaseProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'aria-label' | 'children' | 'color'
> & {
  readonly icon: GenericIconName;
  readonly accessibleLabel: string;
  readonly variant?: Exclude<ButtonVariant, 'primary'>;
  readonly loading?: boolean;
};

type StableTooltipProps =
  | { readonly tooltip: string; readonly stablePosition: true }
  | { readonly tooltip?: never; readonly stablePosition?: never };

export type IconButtonProps = IconButtonBaseProps & StableTooltipProps;

export function IconButton({
  icon,
  accessibleLabel,
  variant = 'quiet',
  loading = false,
  tooltip,
  stablePosition,
  disabled,
  type = 'button',
  className,
  ...buttonProps
}: IconButtonProps) {
  if (accessibleLabel.trim().length === 0) {
    throw new Error('IconButton requires a non-empty accessibleLabel.');
  }

  const button = (
    <button
      {...buttonProps}
      aria-busy={loading || undefined}
      aria-label={loading ? `${accessibleLabel}, carregando` : accessibleLabel}
      className={['rv-icon-button', className].filter(Boolean).join(' ')}
      data-loading={loading || undefined}
      data-variant={variant}
      disabled={disabled || loading}
      type={type}
    >
      <Icon
        className={loading ? 'rv-icon--loading' : undefined}
        name={loading ? 'loading' : icon}
      />
    </button>
  );

  if (tooltip !== undefined && stablePosition !== true) {
    throw new Error('IconButton tooltip requires stablePosition=true.');
  }

  return tooltip ? <Tooltip content={tooltip}>{button}</Tooltip> : button;
}
