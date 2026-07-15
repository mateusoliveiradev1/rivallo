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
