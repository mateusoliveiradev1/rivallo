import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { createElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const invokeMock = vi.hoisted(() => vi.fn());
vi.mock('@tauri-apps/api/core', () => ({ invoke: invokeMock }));

import { App } from '../../App.js';
import { Button, IconButton, type IconButtonProps } from './actions.js';
import { EmptyState, ErrorState, Skeleton, Status } from './feedback.js';
import { Checkbox, RadioGroup, Select, TextField } from './forms.js';
import { Pagination, ScrollArea } from './layout.js';

describe('native action primitives', () => {
  it('exposes every approved button treatment through one native boundary', () => {
    render(
      <>
        <Button variant="primary">Confirmar</Button>
        <Button variant="secondary">Comparar</Button>
        <Button variant="quiet">Cancelar</Button>
        <Button variant="destructive-proof">Remover exemplo</Button>
      </>,
    );

    for (const [name, variant] of [
      ['Confirmar', 'primary'],
      ['Comparar', 'secondary'],
      ['Cancelar', 'quiet'],
      ['Remover exemplo', 'destructive-proof'],
    ] as const) {
      const button = screen.getByRole('button', { name });
      expect(button).toBeInstanceOf(HTMLButtonElement);
      expect(button.getAttribute('data-variant')).toBe(variant);
      expect(button.getAttribute('type')).toBe('button');
    }
  });

  it('prevents duplicate disabled/loading actions while retaining label context', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <>
        <Button disabled onClick={onClick}>
          Indisponível
        </Button>
        <Button loading onClick={onClick}>
          Salvar configuração
        </Button>
      </>,
    );

    const disabled = screen.getByRole('button', { name: 'Indisponível' });
    const loading = screen.getByRole('button', { name: /Salvar configuração.*Carregando/u });
    expect((disabled as HTMLButtonElement).disabled).toBe(true);
    expect((loading as HTMLButtonElement).disabled).toBe(true);
    expect(loading.getAttribute('aria-busy')).toBe('true');

    await user.click(disabled);
    await user.click(loading);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('requires a visible-to-assistive-technology name for icon-only actions', () => {
    render(<IconButton icon="columns" accessibleLabel="Configurar colunas" />);

    const button = screen.getByRole('button', { name: 'Configurar colunas' });
    expect(button).toBeInstanceOf(HTMLButtonElement);
    expect(button.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');

    if (false) {
      // @ts-expect-error Icon-only actions cannot omit their accessible label.
      createElement(IconButton, { icon: 'columns' } satisfies IconButtonProps);
    }
  });
});

describe('labelled native form primitives', () => {
  it('associates visible text-field labels, help, and errors with the input', () => {
    const { rerender } = render(
      <TextField label="Nome da visualização" helperText="Use um nome fácil de reconhecer." />,
    );

    const input = screen.getByRole('textbox', { name: 'Nome da visualização' });
    const helper = screen.getByText('Use um nome fácil de reconhecer.');
    expect(input.getAttribute('aria-describedby')).toBe(helper.id);
    expect(input.hasAttribute('aria-invalid')).toBe(false);

    rerender(
      <TextField
        label="Nome da visualização"
        helperText="Use um nome fácil de reconhecer."
        error="Informe um nome válido."
      />,
    );

    const errorText = screen.getByText('Informe um nome válido.');
    const error = errorText.closest('p');
    expect(error).not.toBeNull();
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')?.split(' ')).toEqual(
      expect.arrayContaining([helper.id, error?.id]),
    );
    expect(error?.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('keeps native select naming, help, error, and disabled semantics', () => {
    render(
      <Select
        label="Densidade"
        helperText="Altera somente esta inspeção."
        error="Escolha uma densidade disponível."
        disabled
        options={[
          { value: 'compact', label: 'Compacta' },
          { value: 'comfortable', label: 'Confortável' },
        ]}
      />,
    );

    const select = screen.getByRole('combobox', { name: 'Densidade' });
    expect((select as HTMLSelectElement).disabled).toBe(true);
    expect(select.getAttribute('aria-invalid')).toBe('true');
    expect(select.getAttribute('aria-describedby')).toContain(
      screen.getByText('Escolha uma densidade disponível.').id,
    );
  });

  it('sets the real native checkbox property for all three explicit states', async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    const { rerender } = render(
      <Checkbox
        label="Selecionar todos os exemplos"
        checked={false}
        onCheckedChange={onCheckedChange}
      />,
    );

    const checkbox = screen.getByRole('checkbox', { name: 'Selecionar todos os exemplos' });
    expect((checkbox as HTMLInputElement).checked).toBe(false);
    expect((checkbox as HTMLInputElement).indeterminate).toBe(false);
    expect(screen.getByText('Não marcado')).toBeInstanceOf(HTMLElement);

    await user.click(checkbox);
    expect(onCheckedChange).toHaveBeenCalledWith(true);

    rerender(
      <Checkbox
        label="Selecionar todos os exemplos"
        checked="indeterminate"
        onCheckedChange={onCheckedChange}
      />,
    );
    expect((checkbox as HTMLInputElement).indeterminate).toBe(true);
    expect(screen.getByText('Parcialmente marcado')).toBeInstanceOf(HTMLElement);

    rerender(
      <Checkbox label="Selecionar todos os exemplos" checked onCheckedChange={onCheckedChange} />,
    );
    expect((checkbox as HTMLInputElement).checked).toBe(true);
    expect((checkbox as HTMLInputElement).indeterminate).toBe(false);
    expect(screen.getByText('Marcado')).toBeInstanceOf(HTMLElement);
  });

  it('associates checkbox group errors and preserves native disabled behavior', () => {
    render(
      <Checkbox
        label="Incluir coluna indisponível"
        checked={false}
        disabled
        error="Esta coluna não pode ser usada neste estado."
        onCheckedChange={() => undefined}
      />,
    );

    const checkbox = screen.getByRole('checkbox', { name: 'Incluir coluna indisponível' });
    const error = screen.getByText('Esta coluna não pode ser usada neste estado.').closest('p');
    expect(error).not.toBeNull();
    expect((checkbox as HTMLInputElement).disabled).toBe(true);
    expect(checkbox.getAttribute('aria-invalid')).toBe('true');
    expect(checkbox.getAttribute('aria-describedby')).toBe(error?.id);
  });

  it('uses native radios with a visible group label and non-colour selection text', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <RadioGroup
        label="Estado inspecionado"
        value="default"
        onValueChange={onValueChange}
        options={[
          { value: 'default', label: 'Padrão' },
          { value: 'loading', label: 'Carregando' },
        ]}
      />,
    );

    const group = screen.getByRole('group', { name: 'Estado inspecionado' });
    const selected = screen.getByRole('radio', { name: /Padrão/u });
    const loading = screen.getByRole('radio', { name: /Carregando/u });
    expect(group.contains(selected)).toBe(true);
    expect((selected as HTMLInputElement).checked).toBe(true);
    expect(screen.getByText('Selecionado')).toBeInstanceOf(HTMLElement);

    await user.click(loading);
    expect(onValueChange).toHaveBeenCalledWith('loading');
  });
});

describe('compact primitive geometry contract', () => {
  it('keeps controls at 32px with 6px radius and semantic focus/motion variables', async () => {
    const css = await readFile(resolve('apps/desktop/src/ui/primitives/primitives.css'), 'utf8');

    expect(css).toMatch(/height:\s*var\(--rv-control-height\)/u);
    expect(css).toMatch(/border-radius:\s*var\(--rv-radius-control\)/u);
    expect(css).toMatch(/outline:\s*var\(--rv-stroke-focus\) solid var\(--rv-color-focus\)/u);
    expect(css).toMatch(/outline-offset:\s*2px/u);
    expect(css).toMatch(/var\(--rv-motion-feedback\)/u);
    expect(css).toMatch(/var\(--rv-motion-control\)/u);
    expect(css).not.toMatch(/#[0-9a-f]{3,8}|rgba?\(|hsla?\(/iu);
  });
});

describe('persistent feedback primitives', () => {
  it.each([
    ['neutral', 'status', 'Estado neutro'],
    ['info', 'status', 'Informação'],
    ['positive', 'status', 'Positivo'],
    ['warning', 'status', 'Atenção'],
    ['danger', 'alert', 'Crítico'],
    ['offline', 'status', 'Offline'],
    ['loading', 'status', 'Carregando'],
  ] as const)(
    'renders %s with explicit %s semantics and a visible label',
    (variant, role, label) => {
      const { unmount } = render(<Status variant={variant}>Descrição persistente.</Status>);
      const status = screen.getByRole(role);

      expect(status.getAttribute('data-variant')).toBe(variant);
      expect(status.textContent).toContain(label);
      expect(status.textContent).toContain('Descrição persistente.');
      expect(status.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
      expect(status.getAttribute('aria-live')).toBe(role === 'alert' ? 'assertive' : 'polite');
      expect(status.getAttribute('aria-busy')).toBe(variant === 'loading' ? 'true' : null);
      unmount();
    },
  );

  it('keeps skeleton content inert and marks its reduced-motion contract', () => {
    const { container } = render(<Skeleton lines={3} />);
    const skeleton = container.firstElementChild;

    expect(skeleton?.getAttribute('aria-hidden')).toBe('true');
    expect(skeleton?.getAttribute('data-reduced-motion')).toBe('static');
    expect(skeleton?.querySelectorAll('.rv-skeleton__line')).toHaveLength(3);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('uses the exact approved empty-state copy', () => {
    render(<EmptyState />);

    expect(
      screen.getByRole('heading', { name: 'Nenhum exemplo disponível para este estado.' }),
    ).toBeInstanceOf(HTMLHeadingElement);
    expect(
      screen.getByText('Selecione outro estado no controle acima para continuar a inspeção.'),
    ).toBeInstanceOf(HTMLParagraphElement);
  });

  it('uses the exact approved recovery copy and only exposes a meaningful retry', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    const { rerender } = render(<ErrorState onRetry={onRetry} />);

    const error = screen.getByRole('alert');
    expect(error.textContent).toContain(
      'Não foi possível renderizar este exemplo. Revise a configuração e tente novamente.',
    );
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(onRetry).toHaveBeenCalledOnce();

    rerender(<ErrorState />);
    expect(screen.queryByRole('button', { name: 'Tentar novamente' })).toBeNull();
  });
});

describe('native layout primitives', () => {
  it('labels pagination, exposes the current page, and disables real boundaries', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(<Pagination currentPage={1} onPageChange={onPageChange} totalPages={3} />);

    const navigation = screen.getByRole('navigation', { name: 'Paginação' });
    const previous = screen.getByRole('button', { name: 'Página anterior' });
    const current = screen.getByRole('button', { name: 'Página 1, atual' });
    expect(navigation.contains(current)).toBe(true);
    expect((previous as HTMLButtonElement).disabled).toBe(true);
    expect(current.getAttribute('aria-current')).toBe('page');
    expect(screen.getByText('Página 1 de 3')).toBeInstanceOf(HTMLElement);

    await user.click(screen.getByRole('button', { name: 'Próxima página' }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('keeps overflow native, labelled, keyboard reachable, and visibly discoverable', () => {
    render(
      <ScrollArea label="Comparação extensa">
        <p>Um conteúdo muito longo para inspeção horizontal.</p>
      </ScrollArea>,
    );

    const region = screen.getByRole('region', { name: 'Comparação extensa' });
    expect(region.getAttribute('tabindex')).toBe('0');
    expect(region.textContent).toContain('Um conteúdo muito longo para inspeção horizontal.');
    expect(region.textContent).toContain('Use a rolagem para acessar todo o conteúdo.');
  });
});

describe('desktop lifecycle shell regression', () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it('keeps initialization explicit while the Tauri lifecycle authority is pending', () => {
    invokeMock.mockReturnValue(new Promise(() => undefined));
    render(<App />);

    const status = screen.getByRole('status');
    expect(status.getAttribute('data-variant')).toBe('loading');
    expect(status.getAttribute('aria-busy')).toBe('true');
    expect(screen.getByRole('heading', { name: 'Starting local service' })).toBeInstanceOf(
      HTMLHeadingElement,
    );
    expect(invokeMock).toHaveBeenCalledWith('lifecycle_status');
  });

  it('keeps owned readiness and its ownership explanation explicit', async () => {
    invokeMock.mockResolvedValue({ state: 'ready', ownership: 'owned' });
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Local service ready' })).toBeInstanceOf(
      HTMLHeadingElement,
    );
    const status = screen.getByRole('status');
    expect(status.getAttribute('data-variant')).toBe('positive');
    expect(status.textContent).toContain('The local service started for this desktop session.');
  });

  it('retains recoverable failure, retry authority, and development diagnostics', async () => {
    const failure = {
      state: 'recoverableFailure',
      failure: {
        code: 'port_occupied',
        message: 'The configured local port is occupied.',
        diagnostic: 'port 3100 is unavailable',
      },
    };
    invokeMock.mockImplementation((command: string) => {
      if (command === 'retry_lifecycle') {
        return Promise.resolve({ state: 'ready', ownership: 'reused' });
      }
      return Promise.resolve(failure);
    });
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
    render(<App />);

    expect(
      await screen.findByRole('heading', { name: 'Local service needs attention' }),
    ).toBeInstanceOf(HTMLHeadingElement);
    expect(screen.getByRole('alert').textContent).toContain(
      'The configured local port is occupied.',
    );
    const diagnosticsSummary = screen.getByText('Development diagnostics');
    expect(diagnosticsSummary).toBeInstanceOf(HTMLElement);

    await user.click(diagnosticsSummary);
    await user.click(screen.getByRole('button', { name: 'Copy diagnostic' }));
    expect(await screen.findByText('Diagnostic copied.')).toBeInstanceOf(HTMLElement);
    expect(writeText).toHaveBeenCalledWith('port_occupied\nport 3100 is unavailable');

    await user.click(screen.getByRole('button', { name: 'Retry startup' }));
    expect(invokeMock).toHaveBeenCalledWith('retry_lifecycle');
    expect(await screen.findByRole('heading', { name: 'Local service ready' })).toBeInstanceOf(
      HTMLHeadingElement,
    );
    expect(screen.getByRole('status').textContent).toContain(
      'A compatible local service is already running and has been reused.',
    );
  });

  it('keeps polling, diagnostics guards, token imports, and raw palette out of the shell', async () => {
    const [appSource, styles] = await Promise.all([
      readFile(resolve('apps/desktop/src/App.tsx'), 'utf8'),
      readFile(resolve('apps/desktop/src/styles.css'), 'utf8'),
    ]);

    expect(appSource).toContain('STATUS_REFRESH_INTERVAL_MS = 500');
    expect(appSource).toContain("invoke<LifecycleStatus>('lifecycle_status')");
    expect(appSource).toContain("invoke<LifecycleStatus>('retry_lifecycle')");
    expect(appSource).toContain('import.meta.env.DEV');
    expect(styles).toContain("@import '@rivallo/design-tokens/generated.css'");
    expect(styles).toContain("@import './ui/primitives/primitives.css'");
    expect(styles).not.toMatch(/#[0-9a-f]{3,8}|rgba?\(|hsla?\(/iu);
  });
});
