import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { createElement, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { IconButton, type IconButtonProps } from './actions.js';
import { Menu, Popover } from './disclosure.js';
import { RadioGroup, Switch, Tabs } from './selection.js';

describe('Tooltip and stable IconButton composition', () => {
  it('keeps the button named independently while tooltip follows focus, hover, and Escape', async () => {
    const user = userEvent.setup();
    render(
      <IconButton
        accessibleLabel="Configurar colunas"
        icon="columns"
        stablePosition
        tooltip="Escolher colunas visíveis"
      />,
    );

    const button = screen.getByRole('button', { name: 'Configurar colunas' });
    expect(screen.queryByRole('tooltip')).toBeNull();

    await user.tab();
    expect(document.activeElement).toBe(button);
    const focusedTooltip = await screen.findByRole('tooltip');
    expect(focusedTooltip.textContent).toBe('Escolher colunas visíveis');
    expect(focusedTooltip.querySelector('a, button, input, select, textarea')).toBeNull();
    expect(screen.getByRole('button', { name: 'Configurar colunas' })).toBe(button);

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull());
    expect(screen.getByRole('button', { name: 'Configurar colunas' })).toBe(button);

    await user.hover(button);
    expect(await screen.findByRole('tooltip')).toBeInstanceOf(HTMLElement);
    await user.unhover(button);
    await user.tab();
    await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull());

    if (false) {
      // @ts-expect-error A tooltip is allowed only when stable position is explicit.
      createElement(IconButton, {
        accessibleLabel: 'Configurar colunas',
        icon: 'columns',
        tooltip: 'Escolher colunas visíveis',
      });
      const typedBoundary: IconButtonProps = {
        accessibleLabel: 'Configurar colunas',
        icon: 'columns',
      };
      void typedBoundary;
    }
  });
});

describe('Popover disclosure boundary', () => {
  it('opens contextual work from a named trigger and returns focus after Escape/outside close', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <Popover title="Contexto de inspeção" triggerLabel="Abrir contexto">
          <button type="button">Ação contextual</button>
        </Popover>
        <button type="button">Fora do contexto</button>
      </div>,
    );

    const trigger = screen.getByRole('button', { name: 'Abrir contexto' });
    await user.click(trigger);
    expect(screen.getByRole('dialog', { name: 'Contexto de inspeção' })).toBeInstanceOf(
      HTMLElement,
    );

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(document.activeElement).toBe(trigger);

    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Fora do contexto' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});

describe('Menu command boundary', () => {
  it('supports Arrow/Home/End, skips disabled commands, and exposes checked state', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onCheckedChange = vi.fn();
    render(
      <Menu
        items={[
          { type: 'command', id: 'reset', label: 'Redefinir exemplo', onSelect },
          { type: 'command', id: 'disabled', label: 'Ação indisponível', disabled: true },
          {
            type: 'checkbox',
            id: 'details',
            label: 'Mostrar detalhes',
            checked: true,
            onCheckedChange,
          },
        ]}
        triggerLabel="Mais ações"
      />,
    );

    const trigger = screen.getByRole('button', { name: 'Mais ações' });
    await user.click(trigger);
    expect(screen.getByRole('menu')).toBeInstanceOf(HTMLElement);

    await user.keyboard('{Home}');
    expect(document.activeElement).toBe(
      screen.getByRole('menuitem', { name: 'Redefinir exemplo' }),
    );

    await user.keyboard('{ArrowDown}');
    const checked = screen.getByRole('menuitemcheckbox', { name: /Mostrar detalhes/u });
    expect(document.activeElement).toBe(checked);
    expect(checked.getAttribute('aria-checked')).toBe('true');
    expect(checked.textContent).toContain('Selecionado');
    expect(
      screen.getByRole('menuitem', { name: 'Ação indisponível' }).getAttribute('aria-disabled'),
    ).toBe('true');

    await user.keyboard('{Enter}');
    expect(onCheckedChange).toHaveBeenCalledWith(false);
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
    expect(document.activeElement).toBe(trigger);

    await user.click(trigger);
    await user.keyboard('{End}');
    expect(document.activeElement).toBe(
      screen.getByRole('menuitemcheckbox', { name: /Mostrar detalhes/u }),
    );
    await user.keyboard('{Escape}');
    expect(document.activeElement).toBe(trigger);
    expect(onSelect).not.toHaveBeenCalled();
  });
});

describe('composite selection boundaries', () => {
  it('uses roving arrow focus with stable tab and panel associations', async () => {
    const user = userEvent.setup();
    render(
      <Tabs
        defaultValue="overview"
        label="Seções do exemplo"
        items={[
          { value: 'overview', label: 'Visão geral', content: 'Conteúdo geral' },
          { value: 'details', label: 'Detalhes', content: 'Conteúdo detalhado' },
          { value: 'disabled', label: 'Indisponível', content: 'Nunca exibido', disabled: true },
        ]}
      />,
    );

    const overview = screen.getByRole('tab', { name: 'Visão geral' });
    const details = screen.getByRole('tab', { name: 'Detalhes' });
    expect(overview.getAttribute('aria-selected')).toBe('true');
    expect(overview.getAttribute('aria-controls')).toBe(
      screen.getByRole('tabpanel', { name: 'Visão geral' }).id,
    );

    await user.click(overview);
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(details);
    expect(details.getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tabpanel', { name: 'Detalhes' }).textContent).toBe(
      'Conteúdo detalhado',
    );

    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(overview);
  });

  it('keeps native radio naming while arrow-selecting and associating disabled/error state', async () => {
    function RadioFixture() {
      const [value, setValue] = useState('compact');
      return (
        <RadioGroup
          error="Escolha uma densidade disponível."
          label="Densidade do exemplo"
          onValueChange={setValue}
          options={[
            { value: 'compact', label: 'Compacta' },
            { value: 'comfortable', label: 'Confortável' },
            { value: 'unavailable', label: 'Indisponível', disabled: true },
          ]}
          value={value}
        />
      );
    }

    const user = userEvent.setup();
    render(<RadioFixture />);
    const group = screen.getByRole('group', { name: 'Densidade do exemplo' });
    const compact = screen.getByRole('radio', { name: 'Compacta' });
    const comfortable = screen.getByRole('radio', { name: 'Confortável' });
    const unavailable = screen.getByRole('radio', { name: 'Indisponível' });
    expect(group.getAttribute('aria-invalid')).toBe('true');
    expect(group.getAttribute('aria-describedby')).toBe(
      screen.getByText('Escolha uma densidade disponível.').closest('p')?.id,
    );
    expect((unavailable as HTMLInputElement).disabled).toBe(true);

    compact.focus();
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(comfortable);
    expect((comfortable as HTMLInputElement).checked).toBe(true);
    expect(screen.getByText('Selecionado')).toBeInstanceOf(HTMLElement);
  });

  it('exposes a visible switch label/state and supports Space, Enter, focus, and disabled state', async () => {
    function SwitchFixture() {
      const [checked, setChecked] = useState(false);
      return (
        <>
          <Switch checked={checked} label="Mostrar ajuda contextual" onCheckedChange={setChecked} />
          <Switch
            checked={false}
            disabled
            label="Opção indisponível"
            onCheckedChange={() => undefined}
          />
        </>
      );
    }

    const user = userEvent.setup();
    render(<SwitchFixture />);
    const control = screen.getByRole('switch', { name: /Mostrar ajuda contextual/u });
    const disabled = screen.getByRole('switch', { name: /Opção indisponível/u });
    const state = document.getElementById(control.getAttribute('aria-describedby') ?? '');
    expect(control.getAttribute('aria-checked')).toBe('false');
    expect(state?.textContent).toBe('Desativado');
    expect((disabled as HTMLButtonElement).disabled).toBe(true);

    control.focus();
    await user.keyboard(' ');
    expect(control.getAttribute('aria-checked')).toBe('true');
    expect(state?.textContent).toBe('Ativado');

    await user.keyboard('{Enter}');
    expect(control.getAttribute('aria-checked')).toBe('false');
    expect(document.activeElement).toBe(control);
  });
});
