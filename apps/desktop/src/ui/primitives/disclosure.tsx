import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { Icon } from '@rivallo/icons';
import { useId, type ReactElement, type ReactNode } from 'react';

export interface TooltipProps {
  readonly children: ReactElement;
  readonly content: string;
}

export function Tooltip({ children, content }: TooltipProps) {
  if (content.trim().length === 0) {
    throw new Error('Tooltip content must be non-empty supplemental text.');
  }

  return (
    <TooltipPrimitive.Provider delayDuration={0} skipDelayDuration={0}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content className="rv-tooltip" sideOffset={4}>
            {content}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

export interface PopoverProps {
  readonly triggerLabel: string;
  readonly title: string;
  readonly children: ReactNode;
}

export function Popover({ triggerLabel, title, children }: PopoverProps) {
  const titleId = `rv-popover-${useId()}`;

  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger asChild>
        <button className="rv-button" data-variant="secondary" type="button">
          <span className="rv-button__label">{triggerLabel}</span>
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          aria-labelledby={titleId}
          className="rv-popover"
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
