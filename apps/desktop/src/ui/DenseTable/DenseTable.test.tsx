import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { fireEvent, render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { DenseTable, type DenseTableColumn } from './DenseTable.js';
import { denseTableEvidenceColumns, denseTableEvidenceRows } from './fixtures.js';

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

const interactiveColumns = [
  {
    id: 'name',
    header: 'Nome',
    width: 240,
    priority: 1,
    sortable: true,
    sortValue: (row: EvidenceRow) => row.name,
    render: (row: EvidenceRow) => row.name,
  },
  {
    id: 'score',
    header: 'Índice',
    width: 96,
    priority: 2,
    align: 'end',
    hideable: true,
    sortable: true,
    sortValue: (row: EvidenceRow) => row.score,
    render: (row: EvidenceRow) => row.score,
  },
  {
    id: 'note',
    header: 'Observação',
    width: 180,
    priority: 3,
    hideable: true,
    render: (row: EvidenceRow) => `Nota de ${row.name}`,
  },
] as const satisfies readonly DenseTableColumn<EvidenceRow>[];

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
    expect(
      within(table).getByText(
        'Selecione outro estado no controle acima para continuar a inspeção.',
      ),
    ).toBeInstanceOf(HTMLParagraphElement);

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

describe('DenseTable local interaction contracts', () => {
  it('cycles semantic sorting with visible direction and stable row order', async () => {
    const user = userEvent.setup();
    render(
      <DenseTable
        caption="Ordenação local"
        columns={interactiveColumns}
        content={{ kind: 'ready', rows: [rows[1], rows[0]] }}
        label="Tabela ordenável"
      />,
    );

    const table = screen.getByRole('table', { name: 'Ordenação local' });
    const nameHeader = within(table).getByRole('columnheader', { name: /Nome/u });
    const scoreHeader = within(table).getByRole('columnheader', { name: /Índice/u });
    const sortButton = within(nameHeader).getByRole('button', { name: 'Ordenar por Nome' });

    expect(nameHeader.hasAttribute('aria-sort')).toBe(false);
    expect(scoreHeader.hasAttribute('aria-sort')).toBe(false);
    await user.click(sortButton);
    expect(nameHeader.getAttribute('aria-sort')).toBe('ascending');
    expect(sortButton.textContent).toContain('Crescente');
    expect(table.querySelector('tbody tr')?.textContent).toContain('Exemplo Alfa');

    await user.click(sortButton);
    expect(nameHeader.getAttribute('aria-sort')).toBe('descending');
    expect(sortButton.textContent).toContain('Decrescente');
    expect(table.querySelector('tbody tr')?.textContent).toContain('Exemplo Beta');

    await user.click(sortButton);
    expect(nameHeader.hasAttribute('aria-sort')).toBe(false);
    expect(table.querySelector('tbody tr')?.textContent).toContain('Exemplo Beta');
  });

  it('operates labelled row and bulk selection by keyboard with a non-colour cue', async () => {
    const user = userEvent.setup();
    render(
      <DenseTable
        caption="Seleção local"
        columns={interactiveColumns}
        content={{ kind: 'ready', rows }}
        getRowLabel={(row) => row.name}
        label="Tabela selecionável"
        selectable
      />,
    );

    const table = screen.getByRole('table', { name: 'Seleção local' });
    const firstCheckbox = within(table).getByRole('checkbox', { name: 'Selecionar Exemplo Alfa' });
    firstCheckbox.focus();
    await user.keyboard(' ');
    const selectedRow = firstCheckbox.closest('tr');
    expect((firstCheckbox as HTMLInputElement).checked).toBe(true);
    expect(selectedRow?.getAttribute('data-selected')).toBe('true');
    expect(within(selectedRow as HTMLTableRowElement).getByText('Selecionado')).toBeInstanceOf(
      HTMLElement,
    );

    const bulk = within(table).getByRole('checkbox', { name: 'Selecionar todas as linhas' });
    bulk.focus();
    await user.keyboard(' ');
    expect(
      within(table)
        .getAllByRole('checkbox', { name: /Selecionar Exemplo/u })
        .every((checkbox) => (checkbox as HTMLInputElement).checked),
    ).toBe(true);
    expect(screen.getByText('2 linhas selecionadas')).toBeInstanceOf(HTMLElement);
  });

  it('removes priority-hidden and user-hidden columns consistently and resets locally', async () => {
    const user = userEvent.setup();
    const first = render(
      <DenseTable
        caption="Visibilidade local"
        columns={interactiveColumns}
        columnPriorityLimit={2}
        content={{ kind: 'ready', rows }}
        label="Tabela configurável"
      />,
    );

    let table = screen.getByRole('table', { name: 'Visibilidade local' });
    expect(within(table).queryByRole('columnheader', { name: 'Observação' })).toBeNull();
    expect(within(table).getByRole('columnheader', { name: /Índice/u })).toBeInstanceOf(
      HTMLTableCellElement,
    );

    await user.click(screen.getByRole('button', { name: 'Configurar colunas' }));
    await user.click(screen.getByRole('menuitemcheckbox', { name: /Índice/u }));
    table = screen.getByRole('table', { name: 'Visibilidade local' });
    expect(within(table).queryByRole('columnheader', { name: /Índice/u })).toBeNull();
    expect(within(table).getAllByRole('cell')).toHaveLength(2);

    first.unmount();
    render(
      <DenseTable
        caption="Visibilidade local"
        columns={interactiveColumns}
        columnPriorityLimit={2}
        content={{ kind: 'error' }}
        label="Tabela configurável"
      />,
    );
    table = screen.getByRole('table', { name: 'Visibilidade local' });
    expect(within(table).getByRole('columnheader', { name: /Índice/u })).toBeInstanceOf(
      HTMLTableCellElement,
    );
    expect(within(table).getByRole('alert').closest('td')?.colSpan).toBe(2);
  });

  it('exposes one visible primary action and keyboard-accessible secondary actions per row', async () => {
    const user = userEvent.setup();
    const onPrimary = vi.fn();
    const onSecondary = vi.fn();
    render(
      <DenseTable
        caption="Ações locais"
        columns={columns}
        content={{ kind: 'ready', rows }}
        getRowActions={(row) => ({
          primary: { label: 'Inspecionar exemplo', onSelect: () => onPrimary(row.id) },
          secondary: [
            { id: 'compare', label: 'Comparar exemplo', onSelect: () => onSecondary(row.id) },
          ],
        })}
        getRowLabel={(row) => row.name}
        label="Tabela com ações"
      />,
    );

    expect(screen.getAllByRole('button', { name: 'Inspecionar exemplo' })).toHaveLength(2);
    await user.click(screen.getAllByRole('button', { name: 'Inspecionar exemplo' })[0]);
    expect(onPrimary).toHaveBeenCalledWith('row-1');

    const menuTrigger = screen.getByRole('button', { name: 'Mais ações para Exemplo Alfa' });
    menuTrigger.focus();
    await user.keyboard('{Enter}');
    const secondary = await screen.findByRole('menuitem', { name: 'Comparar exemplo' });
    await user.keyboard('{Enter}');
    expect(onSecondary).toHaveBeenCalledWith('row-1');
  });
});

describe('DenseTable deterministic football-shaped UI evidence', () => {
  it('covers stable order, long text, numeric absence, priority and every semantic tone', () => {
    expect(denseTableEvidenceRows.map((row) => row.id)).toEqual([
      'evidence-01',
      'evidence-02',
      'evidence-03',
      'evidence-04',
      'evidence-05',
      'evidence-06',
      'evidence-07',
    ]);
    expect(new Set(denseTableEvidenceRows.map((row) => row.status.tone))).toEqual(
      new Set(['neutral', 'info', 'positive', 'warning', 'danger', 'offline', 'loading']),
    );
    expect(denseTableEvidenceRows.some((row) => row.name.length > 60)).toBe(true);
    expect(denseTableEvidenceRows.some((row) => row.score === null)).toBe(true);
    expect(denseTableEvidenceRows.some((row) => row.note === null)).toBe(true);
    expect(denseTableEvidenceColumns.map((column) => column.priority)).toEqual([1, 1, 2, 2, 3]);
  });

  it('keeps country code visible after flag failure and exposes the full name by keyboard', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <DenseTable
        caption="Nacionalidade de evidência"
        columns={denseTableEvidenceColumns}
        content={{ kind: 'ready', rows: denseTableEvidenceRows }}
        label="Tabela de nacionalidade"
      />,
    );

    const argentinaCode = screen.getByText('AR');
    const argentinaImage = argentinaCode.closest('span')?.querySelector('img');
    expect(argentinaImage).toBeInstanceOf(HTMLImageElement);
    fireEvent.error(argentinaImage as HTMLImageElement);
    expect(screen.getByText('AR')).toBeInstanceOf(HTMLElement);
    expect(container.querySelector('img[src="/fixture-flag-missing.svg"]')).toBeNull();

    argentinaCode.focus();
    expect((await screen.findByRole('tooltip')).textContent).toContain('Argentina');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('renders every status and missing value with a visible non-colour text cue', () => {
    render(
      <DenseTable
        caption="Estados de evidência"
        columns={denseTableEvidenceColumns}
        content={{ kind: 'ready', rows: denseTableEvidenceRows }}
        label="Tabela de estados"
      />,
    );

    for (const row of denseTableEvidenceRows) {
      expect(screen.getByText(row.status.label)).toBeInstanceOf(HTMLElement);
    }
    expect(screen.getAllByLabelText('Dado indisponível')).toHaveLength(2);
  });

  it('keeps fixtures locally owned and disconnected from production authority', async () => {
    const source = await readFile(resolve('apps/desktop/src/ui/DenseTable/fixtures.ts'), 'utf8');

    expect(source).toContain('UI evidence only');
    expect(source).not.toMatch(/from\s+['"][^'"]*(?:contracts-client|@tauri-apps|domain)/iu);
    expect(source).not.toMatch(/\binvoke\(|\bfetch\(/u);
  });
});
