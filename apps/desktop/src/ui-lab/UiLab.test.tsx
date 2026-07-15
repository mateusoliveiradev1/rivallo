import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { UiLab } from './UiLab.js';

describe('UI Lab development boundary', () => {
  it('uses the exact internal path behind a compile-time development guard', async () => {
    const mainSource = await readFile(resolve('apps/desktop/src/main.tsx'), 'utf8');

    expect(mainSource).toContain(
      "const isUiLab = import.meta.env.DEV && window.location.pathname === '/__ui-lab';",
    );
    expect(mainSource).toMatch(
      /isUiLab\s*\?\s*import\('\.\/ui-lab\/UiLab\.js'\)\s*:\s*import\('\.\/App\.js'\)/u,
    );
    expect(mainSource).not.toMatch(/import\s+\{\s*UiLab\s*\}\s+from/u);
    expect(mainSource).not.toContain('href="/__ui-lab"');
  });

  it('renders without service readiness, host bridge, network, or storage access', async () => {
    render(<UiLab />);

    expect(screen.getByRole('heading', { name: 'UI Lab Rivallo' })).toBeInstanceOf(
      HTMLHeadingElement,
    );
    expect(
      screen.getByText('Inspeção determinística da fundação visual em desenvolvimento.'),
    ).toBeInstanceOf(HTMLParagraphElement);

    const source = await readFile(resolve('apps/desktop/src/ui-lab/UiLab.tsx'), 'utf8');
    expect(source).not.toMatch(/@tauri-apps|contracts-client|lifecycle|\binvoke\(|\bfetch\(/iu);
    expect(source).not.toMatch(/localStorage|sessionStorage|indexedDB|navigator\.storage/u);
  });
});

const categories = [
  ['Semantic tokens', 'Valores, pares e contraste da linguagem visual.'],
  ['Typography', 'Escala operacional e restrições de uso tipográfico.'],
  ['Icons', 'Família genérica e símbolos originais de futebol.'],
  ['Primitives', 'Estados reais dos controles compartilhados.'],
  ['DenseTable', 'Densidade, configuração e leitura de dados.'],
  ['Accessibility evidence', 'Evidências de teclado, foco, contraste e movimento.'],
  ['Shell proof', 'Composição estrutural expandida e recolhida.'],
] as const;

describe('UI Lab proof hierarchy and real specimen inventory', () => {
  it('navigates exactly seven approved categories with heading and purpose', async () => {
    const user = userEvent.setup();
    render(<UiLab />);

    const navigation = screen.getByRole('navigation', { name: 'Categorias do UI Lab' });
    const buttons = within(navigation).getAllByRole('button');
    expect(buttons.map((button) => button.textContent)).toEqual(categories.map(([label]) => label));

    for (const [label, purpose] of categories) {
      await user.click(within(navigation).getByRole('button', { name: label }));
      expect(screen.getByRole('heading', { name: label, level: 2 })).toBeInstanceOf(
        HTMLHeadingElement,
      );
      expect(screen.getByText(purpose)).toBeInstanceOf(HTMLParagraphElement);
    }
  });

  it('shows authored/resolved contrast evidence and the isolated eight-token type catalog', async () => {
    const user = userEvent.setup();
    render(<UiLab />);

    const tokenTable = screen.getByRole('table', { name: 'Evidência de tokens semânticos' });
    expect(within(tokenTable).getByRole('columnheader', { name: 'Valor authored' })).toBeInstanceOf(
      HTMLTableCellElement,
    );
    expect(within(tokenTable).getByRole('columnheader', { name: 'Valor resolved' })).toBeInstanceOf(
      HTMLTableCellElement,
    );
    expect(within(tokenTable).getByRole('columnheader', { name: 'Razão / limite' })).toBeInstanceOf(
      HTMLTableCellElement,
    );
    expect(within(tokenTable).getByText('operational text on canvas')).toBeInstanceOf(
      HTMLTableCellElement,
    );

    await user.click(screen.getByRole('button', { name: 'Typography' }));
    expect(document.querySelectorAll('[data-type-token]')).toHaveLength(8);
    expect(screen.getByText('Inter operacional')).toBeInstanceOf(HTMLElement);
    expect(screen.getByText('Space Grotesk — uso restrito')).toBeInstanceOf(HTMLElement);
    expect(screen.getByText('12.345.678')).toBeInstanceOf(HTMLElement);
  });

  it('renders every icon at three sizes and every primitive as a real state proof', async () => {
    const user = userEvent.setup();
    render(<UiLab />);

    await user.click(screen.getByRole('button', { name: 'Icons' }));
    expect(document.querySelectorAll('[data-icon-proof]')).toHaveLength(66);
    expect(screen.getByText('football-ball · Futebol e bola em jogo')).toBeInstanceOf(HTMLElement);

    await user.click(screen.getByRole('button', { name: 'Primitives' }));
    expect(document.querySelectorAll('[data-primitive-name]')).toHaveLength(20);
    expect(screen.getByRole('button', { name: 'Aplicar estado' })).toBeInstanceOf(
      HTMLButtonElement,
    );
    expect(screen.getByText('Nenhum exemplo disponível para este estado.')).toBeInstanceOf(
      HTMLHeadingElement,
    );
    expect(
      screen.getByText(
        'Não foi possível renderizar este exemplo. Revise a configuração e tente novamente.',
      ),
    ).toBeInstanceOf(HTMLHeadingElement);

    const unchecked = screen.getByRole('checkbox', { name: 'Exemplo não marcado' });
    const checked = screen.getByRole('checkbox', { name: 'Exemplo marcado' });
    const indeterminate = screen.getByRole('checkbox', { name: 'Exemplo parcialmente marcado' });
    const disabled = screen.getByRole('checkbox', { name: 'Exemplo indisponível' });
    expect((unchecked as HTMLInputElement).checked).toBe(false);
    expect((checked as HTMLInputElement).checked).toBe(true);
    expect((indeterminate as HTMLInputElement).indeterminate).toBe(true);
    expect((disabled as HTMLInputElement).disabled).toBe(true);
    expect(screen.getByText('Este grupo contém um erro de demonstração.')).toBeInstanceOf(
      HTMLElement,
    );
  });
});

describe('UI Lab viewport, accessibility, and shell proofs', () => {
  it('labels the three deterministic viewport presets without claiming device emulation', async () => {
    const user = userEvent.setup();
    render(<UiLab />);

    const controls = screen.getByRole('group', { name: 'Resolução de inspeção' });
    const compact = within(controls).getByRole('radio', { name: '1366×768' });
    const defaultDesktop = within(controls).getByRole('radio', { name: '1920×1080' });
    const ultrawide = within(controls).getByRole('radio', { name: '2560×1080' });
    const preview = screen.getByTestId('viewport-preview');

    expect(defaultDesktop).toBeChecked();
    expect(preview).toHaveAttribute('aria-label', 'Quadro de inspeção 1920×1080');
    expect(preview).toHaveAttribute('data-viewport', '1920x1080');
    expect(preview.style.getPropertyValue('--ui-lab-preview-width')).toBe('1920px');
    expect(preview.style.getPropertyValue('--ui-lab-preview-height')).toBe('1080px');
    expect(screen.getByText('Evidência de layout, não emulação de dispositivo.')).toBeInstanceOf(
      HTMLElement,
    );

    await user.click(compact);
    expect(preview).toHaveAttribute('aria-label', 'Quadro de inspeção 1366×768');
    expect(preview).toHaveAttribute('data-viewport', '1366x768');
    expect(preview.style.getPropertyValue('--ui-lab-preview-width')).toBe('1366px');

    await user.click(ultrawide);
    expect(preview).toHaveAttribute('aria-label', 'Quadro de inspeção 2560×1080');
    expect(preview).toHaveAttribute('data-viewport', '2560x1080');
    expect(preview.style.getPropertyValue('--ui-lab-preview-width')).toBe('2560px');
  });

  it('keeps DenseTable density, content state, and column priority local and resettable', async () => {
    const user = userEvent.setup();
    const firstRender = render(<UiLab />);
    await user.click(screen.getByRole('button', { name: 'DenseTable' }));

    const density = screen.getByRole('combobox', { name: 'Densidade da tabela' });
    const contentState = screen.getByRole('combobox', { name: 'Estado da tabela' });
    const columnPriority = screen.getByRole('combobox', { name: 'Prioridade de colunas' });

    expect(density).toHaveValue('compact');
    expect(contentState).toHaveValue('ready');
    expect(columnPriority).toHaveValue('3');

    await user.selectOptions(density, 'comfortable');
    expect(screen.getByRole('table', { name: 'DenseTable de evidência' })).toHaveAttribute(
      'data-density',
      'comfortable',
    );

    await user.selectOptions(columnPriority, '2');
    expect(screen.queryByRole('columnheader', { name: 'Nota de evidência' })).toBeNull();
    expect(screen.getByRole('columnheader', { name: 'Estado' })).toBeInstanceOf(
      HTMLTableCellElement,
    );

    await user.selectOptions(contentState, 'loading');
    expect(screen.getByRole('table', { name: 'DenseTable de evidência' })).toHaveAttribute(
      'aria-busy',
      'true',
    );
    await user.selectOptions(contentState, 'empty');
    expect(screen.getByText('Nenhum exemplo disponível para este estado.')).toBeInstanceOf(
      HTMLHeadingElement,
    );
    await user.selectOptions(contentState, 'error');
    expect(
      screen.getByText(
        'Não foi possível renderizar este exemplo. Revise a configuração e tente novamente.',
      ),
    ).toBeInstanceOf(HTMLHeadingElement);

    firstRender.unmount();
    render(<UiLab />);
    await user.click(screen.getByRole('button', { name: 'DenseTable' }));
    expect(screen.getByRole('combobox', { name: 'Densidade da tabela' })).toHaveValue('compact');
    expect(screen.getByRole('combobox', { name: 'Estado da tabela' })).toHaveValue('ready');
    expect(screen.getByRole('combobox', { name: 'Prioridade de colunas' })).toHaveValue('3');
  });

  it('exposes keyboard, focus, non-colour, long-text, 200%, text-spacing, and motion evidence', async () => {
    const user = userEvent.setup();
    render(<UiLab />);
    await user.click(screen.getByRole('button', { name: 'Accessibility evidence' }));

    const keyboardPath = screen.getByRole('group', { name: 'Ordem de teclado demonstrável' });
    const firstTarget = within(keyboardPath).getByRole('button', {
      name: 'Primeiro alvo de teclado',
    });
    const secondTarget = within(keyboardPath).getByRole('button', {
      name: 'Segundo alvo de teclado',
    });
    firstTarget.focus();
    await user.tab();
    expect(secondTarget).toHaveFocus();

    expect(screen.getByRole('status')).toHaveTextContent(
      'Informação acompanhada por ícone e texto; a cor não é o único sinal.',
    );
    expect(screen.getByTestId('visible-focus-proof')).toHaveAttribute('tabindex', '0');
    expect(screen.getByTestId('long-text-proof')).toHaveAttribute('data-text-expansion', '200');
    expect(screen.getByTestId('text-spacing-proof')).toHaveClass('ui-lab-a11y__text-spacing');
    expect(screen.getByTestId('reduced-motion-proof')).toHaveAttribute(
      'data-reduced-motion-supported',
      'true',
    );

    const css = await readFile(resolve('apps/desktop/src/ui-lab/UiLab.css'), 'utf8');
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/u);
  });

  it('collapses the shell proof from 232px to 56px without moving content or focus', async () => {
    const user = userEvent.setup();
    const firstRender = render(<UiLab />);
    await user.click(screen.getByRole('button', { name: 'Shell proof' }));

    const shell = screen.getByTestId('shell-proof');
    const navigation = within(shell).getByRole('navigation', {
      name: 'Composição de navegação',
    });
    const workspace = within(shell).getByTestId('shell-workspace');
    const initialOrder = navigation.compareDocumentPosition(workspace);
    const collapse = within(shell).getByRole('button', { name: 'Recolher navegação' });

    expect(navigation).toHaveAttribute('data-navigation-width', '232');
    expect(within(navigation).getAllByTestId('shell-navigation-icon')).toHaveLength(3);
    await user.click(collapse);

    expect(collapse).toHaveFocus();
    expect(collapse).toHaveAccessibleName('Expandir navegação');
    expect(navigation).toHaveAttribute('data-navigation-width', '56');
    expect(navigation.compareDocumentPosition(workspace)).toBe(initialOrder);
    expect(within(navigation).getAllByTestId('shell-navigation-icon')).toHaveLength(3);
    expect(workspace).toHaveTextContent('Área de trabalho preservada');

    firstRender.unmount();
    render(<UiLab />);
    await user.click(screen.getByRole('button', { name: 'Shell proof' }));
    expect(
      screen.getByRole('navigation', { name: 'Composição de navegação' }),
    ).toHaveAttribute('data-navigation-width', '232');
    expect(screen.getByRole('button', { name: 'Recolher navegação' })).toBeInstanceOf(
      HTMLButtonElement,
    );
  });

  it('contains no persistence or preference boundary in the Lab sources', async () => {
    const sources = await Promise.all(
      ['UiLab.tsx', 'specimens.tsx'].map((file) =>
        readFile(resolve('apps/desktop/src/ui-lab', file), 'utf8'),
      ),
    );

    for (const source of sources) {
      expect(source).not.toMatch(
        /localStorage|sessionStorage|indexedDB|navigator\.storage|storage|preferences/iu,
      );
    }
  });
});
