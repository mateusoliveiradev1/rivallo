import { fireEvent, render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import type { TableViewState } from '../../table-view/table-view-engine.js';
import { DataTableHeader } from './DataTableHeader.js';
import {
  createFinanceFixtureAdapter,
  FINANCE_FIXTURE_DEFINITION,
  FINANCE_FIXTURE_VIEW,
  persistFinanceFixtureView,
  restoreFinanceFixtureView,
} from './fixtures.js';

function FinanceHeaderHarness({ onState }: { readonly onState?: (state: TableViewState) => void }) {
  const [state, setState] = useState(FINANCE_FIXTURE_VIEW);
  const update = (next: TableViewState) => {
    setState(next);
    onState?.(next);
  };
  return (
    <table>
      <caption>Fixture financeira</caption>
      <DataTableHeader
        definition={FINANCE_FIXTURE_DEFINITION}
        preferences={createFinanceFixtureAdapter(state, update)}
      />
    </table>
  );
}

describe('DataTableHeader reusable contract', () => {
  it('uses labels as the primary affordance and discloses only supported column actions', async () => {
    const user = userEvent.setup();
    render(<FinanceHeaderHarness />);

    expect(screen.queryByRole('button', { name: /Mover coluna/u })).toBeNull();
    expect(screen.getByRole('button', { name: 'Ordenar por Valor' })).toBeInstanceOf(
      HTMLButtonElement,
    );
    expect(screen.queryByRole('button', { name: 'Ordenar por Observação' })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Mais ações para Conta' }));
    const requiredMenu = screen.getByRole('menu', { name: 'Mais ações para Conta' });
    expect(
      within(requiredMenu).getByText(/Obrigatória — Obrigatória para identificar/u),
    ).toBeInstanceOf(HTMLElement);
    expect(within(requiredMenu).queryByText('Ocultar coluna')).toBeNull();
    expect(within(requiredMenu).queryByText('Fixar à direita')).toBeNull();

    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: 'Mais ações para Observação' }));
    const noteMenu = screen.getByRole('menu', { name: 'Mais ações para Observação' });
    expect(within(noteMenu).queryByText('Ordenar crescente')).toBeNull();

    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: 'Mais ações para Responsável' }));
    const ownerMenu = screen.getByRole('menu', { name: 'Mais ações para Responsável' });
    expect(within(ownerMenu).queryByText(/Fixar/u)).toBeNull();
  });

  it('sorts, reorders, resizes and restores width through the shared implementation', async () => {
    const user = userEvent.setup();
    let current = FINANCE_FIXTURE_VIEW;
    render(<FinanceHeaderHarness onState={(state) => (current = state)} />);

    await user.click(screen.getByRole('button', { name: 'Ordenar por Valor' }));
    expect(current.sort).toEqual([{ columnId: 'amount', direction: 'asc', nulls: 'last' }]);

    const valueSort = screen.getByRole('button', { name: /Valor, ordem crescente/u });
    valueSort.focus();
    await user.keyboard('{Alt>}{End}{/Alt}');
    expect(current.columns.at(-1)?.columnId).toBe('amount');
    await user.keyboard('{Escape}');
    expect(current.columns[1]?.columnId).toBe('amount');

    const resize = screen.getByRole('separator', { name: 'Redimensionar Valor' });
    resize.focus();
    await user.keyboard('{ArrowRight}');
    expect(current.columns.find(({ columnId }) => columnId === 'amount')?.width).toBe(128);
    fireEvent.doubleClick(resize);
    expect(current.columns.find(({ columnId }) => columnId === 'amount')?.width).toBe(120);
  });

  it('persists and restores preferences under the fixture tableId', () => {
    const values = new Map<string, string>();
    const store = {
      get: (key: string) => values.get(key) ?? null,
      set: (key: string, value: string) => values.set(key, value),
    };
    const customized: TableViewState = {
      ...FINANCE_FIXTURE_VIEW,
      columns: FINANCE_FIXTURE_VIEW.columns.map((column) =>
        column.columnId === 'amount' ? { ...column, width: 168 } : column,
      ),
    };

    persistFinanceFixtureView(store, customized);
    expect([...values.keys()]).toEqual(['rivallo.table-preferences.fixture.finance-ledger']);
    expect(
      restoreFinanceFixtureView(store).columns.find(({ columnId }) => columnId === 'amount')?.width,
    ).toBe(168);
  });
});
