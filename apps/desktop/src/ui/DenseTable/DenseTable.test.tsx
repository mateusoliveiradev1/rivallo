import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { DenseTable, type DenseTableColumn } from './DenseTable.js';

interface EvidenceRow {
  readonly id: string;
  readonly name: string;
  readonly score: number;
}

const columns = [
  {
    id: 'name',
    header: 'Nome',
    width: 240,
    priority: 1,
    render: (row) => row.name,
  },
  {
    id: 'score',
    header: 'Índice',
    width: 96,
    priority: 1,
    align: 'end',
    render: (row) => row.score,
  },
] as const satisfies readonly DenseTableColumn<EvidenceRow>[];

const rows: readonly EvidenceRow[] = [
  { id: 'row-1', name: 'Exemplo Alfa', score: 82 },
  { id: 'row-2', name: 'Exemplo Beta', score: 74 },
];

describe('DenseTable semantic structure and finite content states', () => {
  it('uses native table relationships inside a labelled overflow region', () => {
    render(
      <DenseTable
        caption="Evidência de densidade"
        columns={columns}
        content={{ kind: 'ready', rows }}
        label="Tabela de evidência"
        stickyHeader
      />,
    );

    const region = screen.getByRole('region', { name: 'Tabela de evidência' });
    const table = within(region).getByRole('table', { name: 'Evidência de densidade' });
    expect(region.getAttribute('tabindex')).toBe('0');
    expect(table).toBeInstanceOf(HTMLTableElement);
    expect(table.querySelector('caption')?.textContent).toBe('Evidência de densidade');
    expect(table.querySelector('thead')).toBeInstanceOf(HTMLTableSectionElement);
    expect(table.querySelector('tbody')).toBeInstanceOf(HTMLTableSectionElement);

    const headers = within(table).getAllByRole('columnheader');
    expect(headers).toHaveLength(2);
    expect(headers.every((header) => header.getAttribute('scope') === 'col')).toBe(true);
    expect(within(table).getAllByRole('row')).toHaveLength(3);
    expect(within(table).getAllByRole('cell')).toHaveLength(4);
    expect(table.getAttribute('data-density')).toBe('compact');
    expect(table.getAttribute('data-sticky-header')).toBe('true');
    expect(within(table).getByText('82').closest('td')?.getAttribute('data-align')).toBe('end');
  });

  it('keeps loading geometry and empty/error recovery inside the table body', async () => {
    const onRetry = vi.fn();
    const { rerender } = render(
      <DenseTable
        caption="Estados da tabela"
        columns={columns}
        content={{ kind: 'loading', rowCount: 3 }}
        density="comfortable"
        label="Tabela em estados"
      />,
    );

    let table = screen.getByRole('table', { name: 'Estados da tabela' });
    expect(table.getAttribute('aria-busy')).toBe('true');
    expect(table.getAttribute('data-density')).toBe('comfortable');
    expect(table.querySelectorAll('tbody tr')).toHaveLength(3);
    expect(table.querySelectorAll('[data-skeleton-cell="true"]')).toHaveLength(6);

    rerender(
      <DenseTable
        caption="Estados da tabela"
        columns={columns}
        content={{ kind: 'empty' }}
        label="Tabela em estados"
      />,
    );
    table = screen.getByRole('table', { name: 'Estados da tabela' });
    const emptyCell = within(table)
      .getByText('Nenhum exemplo disponível para este estado.')
      .closest('td');
    expect(emptyCell?.colSpan).toBe(2);
    expect(within(table).getByText('Selecione outro estado no controle acima para continuar a inspeção.')).toBeInstanceOf(
      HTMLParagraphElement,
    );

    rerender(
      <DenseTable
        caption="Estados da tabela"
        columns={columns}
        content={{ kind: 'error', onRetry }}
        label="Tabela em estados"
      />,
    );
    table = screen.getByRole('table', { name: 'Estados da tabela' });
    const error = within(table).getByRole('alert');
    expect(error.textContent).toContain(
      'Não foi possível renderizar este exemplo. Revise a configuração e tente novamente.',
    );
    expect(error.closest('td')?.colSpan).toBe(2);
    await userEvent.setup().click(within(table).getByRole('button', { name: 'Tentar novamente' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('encodes compact, comfortable, sticky and token-only visual contracts', async () => {
    const css = await readFile(resolve('apps/desktop/src/ui/DenseTable/DenseTable.css'), 'utf8');

    expect(css).toContain('var(--rv-table-row-compact)');
    expect(css).toContain('var(--rv-table-row-comfortable)');
    expect(css).toContain('var(--rv-type-12-size)');
    expect(css).toContain('var(--rv-type-14-size)');
    expect(css).toContain('position: sticky');
    expect(css).toContain('var(--rv-layer-sticky)');
    expect(css).toContain('var(--rv-color-surface-raised)');
    expect(css).toContain('font-variant-numeric: var(--rv-font-numeric-variant)');
    expect(css).not.toMatch(/#[0-9a-f]{3,8}|rgba?\(|hsla?\(/iu);
  });
});
