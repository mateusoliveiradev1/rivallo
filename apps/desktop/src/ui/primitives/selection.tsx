import * as SwitchPrimitive from '@radix-ui/react-switch';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { useId, type ReactNode } from 'react';

export { RadioGroup } from './forms.js';
export type { RadioGroupProps, RadioOption } from './forms.js';

export interface TabItem {
  readonly value: string;
  readonly label: string;
  readonly content: ReactNode;
  readonly disabled?: boolean;
}

export interface TabsProps {
  readonly label: string;
  readonly items: readonly TabItem[];
  readonly value?: string;
  readonly defaultValue?: string;
  readonly onValueChange?: (value: string) => void;
}

export function Tabs({ label, items, value, defaultValue, onValueChange }: TabsProps) {
  return (
    <TabsPrimitive.Root
      activationMode="automatic"
      className="rv-tabs"
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      orientation="horizontal"
      value={value}
    >
      <TabsPrimitive.List aria-label={label} className="rv-tabs__list" loop>
        {items.map((item) => (
          <TabsPrimitive.Trigger
            className="rv-tabs__trigger"
            disabled={item.disabled}
            key={item.value}
            value={item.value}
          >
            <span>{item.label}</span>
            <span aria-hidden="true" className="rv-tabs__marker">
              Selecionada
            </span>
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {items.map((item) => (
        <TabsPrimitive.Content className="rv-tabs__panel" key={item.value} value={item.value}>
          {item.content}
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  );
}

export interface SwitchProps {
  readonly label: string;
  readonly checked: boolean;
  readonly onCheckedChange: (checked: boolean) => void;
  readonly disabled?: boolean;
}

export function Switch({ label, checked, onCheckedChange, disabled = false }: SwitchProps) {
  const generatedId = useId();
  const id = `rv-switch-${generatedId}`;
  const stateId = `${id}-state`;

  return (
    <div className="rv-switch-field">
      <SwitchPrimitive.Root
        aria-describedby={stateId}
        checked={checked}
        className="rv-switch"
        disabled={disabled}
        id={id}
        onCheckedChange={onCheckedChange}
      >
        <SwitchPrimitive.Thumb className="rv-switch__thumb" />
      </SwitchPrimitive.Root>
      <div className="rv-switch__copy">
        <label htmlFor={id}>{label}</label>
        <span className="rv-switch__state" id={stateId}>
          {checked ? 'Ativado' : 'Desativado'}
        </span>
      </div>
    </div>
  );
}
