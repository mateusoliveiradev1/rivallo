import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { Icon } from '@rivallo/icons';
import { createContext, useContext, useId, useRef, type ReactElement, type ReactNode } from 'react';

const TOOLTIP_DELAY_DURATION = 300;
const TOOLTIP_SKIP_DELAY_DURATION = 100;
const TooltipProviderBoundary = createContext(false);

export interface TooltipProviderProps {
  readonly children: ReactNode;
  readonly delayDuration?: number;
  readonly skipDelayDuration?: number;
}

export function TooltipProvider({
  children,
  delayDuration = TOOLTIP_DELAY_DURATION,
  skipDelayDuration = TOOLTIP_SKIP_DELAY_DURATION,
}: TooltipProviderProps) {
  return (
    <TooltipProviderBoundary.Provider value>
      <TooltipPrimitive.Provider
        delayDuration={delayDuration}
        skipDelayDuration={skipDelayDuration}
      >
        {children}
      </TooltipPrimitive.Provider>
    </TooltipProviderBoundary.Provider>
  );
}

export interface TooltipProps {
  readonly children: ReactElement;
  readonly content: string;
}

export function Tooltip({ children, content }: TooltipProps) {
  const hasSharedProvider = useContext(TooltipProviderBoundary);
  if (content.trim().length === 0) {
    throw new Error('Tooltip content must be non-empty supplemental text.');
  }

  const tooltip = (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content className="rv-tooltip" sideOffset={4}>
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );

  return hasSharedProvider ? tooltip : <TooltipProvider>{tooltip}</TooltipProvider>;
}

export interface PopoverProps {
  readonly triggerLabel: string;
  readonly title: string;
  readonly children: ReactNode;
  readonly align?: 'start' | 'center' | 'end';
  readonly contentClassName?: string;
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly triggerAccessibleLabel?: string;
  readonly triggerClassName?: string;
  readonly triggerContent?: ReactNode;
  readonly triggerTooltip?: string;
}

export function Popover({
  triggerLabel,
  title,
  children,
  align = 'center',
  contentClassName,
  open,
  onOpenChange,
  triggerAccessibleLabel,
  triggerClassName,
  triggerContent,
  triggerTooltip,
}: PopoverProps) {
  const titleId = `rv-popover-${useId()}`;
  const contentRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const trigger = (
    <PopoverPrimitive.Trigger asChild>
      <button
        aria-label={triggerAccessibleLabel}
        className={triggerClassName ?? 'rv-button'}
        data-variant={triggerClassName ? undefined : 'secondary'}
        ref={triggerRef}
        type="button"
      >
        <span className="rv-button__label">{triggerContent ?? triggerLabel}</span>
      </button>
    </PopoverPrimitive.Trigger>
  );

  return (
    <PopoverPrimitive.Root modal={false} onOpenChange={onOpenChange} open={open}>
      {triggerTooltip ? <Tooltip content={triggerTooltip}>{trigger}</Tooltip> : trigger}
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align={align}
          aria-labelledby={titleId}
          className={['rv-popover', contentClassName].filter(Boolean).join(' ')}
          ref={contentRef}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            const activeElement = document.activeElement;
            const focusMovedOutside =
              activeElement instanceof HTMLElement &&
              activeElement !== document.body &&
              !contentRef.current?.contains(activeElement);
            if (!focusMovedOutside) triggerRef.current?.focus();
          }}
          role="dialog"
          sideOffset={4}
        >
          <div className="rv-overlay__header">
            <h3 id={titleId}>{title}</h3>
            <PopoverPrimitive.Close asChild>
              <button aria-label="Fechar contexto" className="rv-icon-button" type="button">
                <Icon name="close" />
              </button>
            </PopoverPrimitive.Close>
          </div>
          <div className="rv-popover__content">{children}</div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

interface MenuItemBase {
  readonly id: string;
  readonly label: string;
  readonly disabled?: boolean;
}

export interface MenuCommandItem extends MenuItemBase {
  readonly type: 'command';
  readonly onSelect?: () => void;
}

export interface MenuCheckboxItem extends MenuItemBase {
  readonly type: 'checkbox';
  readonly checked: boolean;
  readonly onCheckedChange: (checked: boolean) => void;
}

export type MenuItem = MenuCommandItem | MenuCheckboxItem;

export interface MenuProps {
  readonly triggerLabel: string;
  readonly items: readonly MenuItem[];
}

export function Menu({ triggerLabel, items }: MenuProps) {
  return (
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger asChild>
        <button
          aria-label={triggerLabel}
          className="rv-icon-button"
          data-variant="quiet"
          type="button"
        >
          <Icon name="more-actions" />
        </button>
      </DropdownMenuPrimitive.Trigger>
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          aria-label={triggerLabel}
          className="rv-menu"
          loop
          sideOffset={4}
        >
          {items.map((item) =>
            item.type === 'checkbox' ? (
              <DropdownMenuPrimitive.CheckboxItem
                checked={item.checked}
                className="rv-menu__item"
                disabled={item.disabled}
                key={item.id}
                onCheckedChange={(checked) => item.onCheckedChange(checked === true)}
              >
                <span>{item.label}</span>
                <DropdownMenuPrimitive.ItemIndicator className="rv-menu__indicator">
                  <Icon name="check" size={16} />
                  <span>Selecionado</span>
                </DropdownMenuPrimitive.ItemIndicator>
              </DropdownMenuPrimitive.CheckboxItem>
            ) : (
              <DropdownMenuPrimitive.Item
                className="rv-menu__item"
                disabled={item.disabled}
                key={item.id}
                onSelect={() => item.onSelect?.()}
              >
                {item.label}
              </DropdownMenuPrimitive.Item>
            ),
          )}
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  );
}
