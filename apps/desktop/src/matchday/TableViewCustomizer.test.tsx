import { useState } from 'react';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import {
  applyTableViewCommand,
  type TableViewCommand,
  type TableViewCommandResult,
  type TableViewState,
} from '../table-view/table-view-engine.js';
import { SQUAD_SYSTEM_VIEW, SQUAD_TABLE_SCHEMA } from './squad-table-schema.js';
import { TableViewCustomizer } from './TableViewCustomizer.js';

interface HarnessProps {
  readonly initialState?: TableViewState;
  readonly onSave?: () => boolean | Promise<boolean>;
}

function Harness({ initialState = SQUAD_SYSTEM_VIEW, onSave = () => true }: HarnessProps) {
  const [state, setState] = useState(initialState);

  const dispatch = (command: TableViewCommand): TableViewCommandResult => {
    const result = applyTableViewCommand(SQUAD_TABLE_SCHEMA, state, command);
    if (result.accepted) setState(result.state);
    return result;
  };

  return (
    <div data-testid="customizer-host">
      <TableViewCustomizer
        baseline={SQUAD_SYSTEM_VIEW}
        busy={false}
        dirty={state !== SQUAD_SYSTEM_VIEW}
        dispatch={dispatch}
        onSave={onSave}
        schema={SQUAD_TABLE_SCHEMA}
        state={state}
      />
      <output data-testid="table-state">{JSON.stringify(state)}</output>
    </div>
  );
}

function readState(): TableViewState {
  return JSON.parse(screen.getByTestId('table-state').textContent ?? '') as TableViewState;
}

async function openCustomizer() {
  const user = userEvent.setup();
  const trigger = screen.getByRole('button', { name: 'Configurar tabela' });
  await user.click(trigger);
  const search = await screen.findByRole('searchbox', { name: 'Buscar colunas' });
  expect(document.activeElement).toBe(search);
  return { trigger, user };
}

function columnRow(label: string): HTMLElement {
  return screen.getByRole('group', { name: `Coluna ${label}` });
}

describe('TableViewCustomizer', () => {
  it('opens one non-modal portalled surface, focuses search, and restores its trigger', async () => {
    render(<Harness />);

    const { trigger, user } = await openCustomizer();
    const dialog = screen.getByRole('dialog', { name: 'Configurar tabela' });

    expect(dialog.closest('[data-radix-popper-content-wrapper]')).not.toBeNull();
    expect(screen.getByTestId('customizer-host').contains(dialog)).toBe(false);
    expect(screen.queryByText(/Agrupar|Agrupamento/iu)).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Fechar personalização' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Configurar tabela' })).toBeNull());
    expect(document.activeElement).toBe(trigger);
  });

  it('filters localized labels, exposes an actionable no-result state, and keeps required reasons', async () => {
    render(<Harness />);
    const { user } = await openCustomizer();

    const playerRow = columnRow('Jogador');
    const playerVisibility = within(playerRow).getByRole('button', {
      name: 'Ocultar Jogador',
    });
    expect(playerVisibility.getAttribute('aria-disabled')).toBe('true');
    expect(playerRow.textContent).toContain('Obrigatória para identificar cada jogador.');

    await user.click(playerVisibility);
    expect(readState().columns.find(({ columnId }) => columnId === 'name')?.visible).toBe(true);

    const search = screen.getByRole('searchbox', { name: 'Buscar colunas' });
    await user.type(search, 'inexistente');
    expect(screen.getByRole('heading', { name: 'Nenhuma coluna encontrada' })).toBeInstanceOf(
      HTMLElement,
    );
    expect(screen.getByText('Tente outro nome; as colunas do elenco continuam disponíveis.')).toBeInstanceOf(
      HTMLElement,
    );

    await user.click(screen.getByRole('button', { name: 'Limpar busca de colunas' }));
    expect((search as HTMLInputElement).value).toBe('');
    expect(columnRow('Jogador')).toBeInstanceOf(HTMLElement);
  });

  it('previews visibility and restores the exact opening proposal when adjustments are discarded', async () => {
    render(<Harness />);
    const { trigger, user } = await openCustomizer();
    const ageRow = columnRow('Idade');

    await user.click(within(ageRow).getByRole('button', { name: 'Ocultar Idade' }));
    expect(readState().columns.find(({ columnId }) => columnId === 'age')?.visible).toBe(false);
    expect(screen.getByRole('status').textContent).toContain('Idade oculta.');

    await user.click(screen.getByRole('button', { name: 'Descartar ajustes' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Configurar tabela' })).toBeNull());

    expect(readState()).toEqual(SQUAD_SYSTEM_VIEW);
    expect(document.activeElement).toBe(trigger);
  });

  it('supports keyboard and pointer reorder with operation Escape rollback and retained focus', async () => {
    render(<Harness />);
    const { user } = await openCustomizer();
    const originalOrder = SQUAD_SYSTEM_VIEW.columns.map(({ columnId }) => columnId);
    const moveAge = within(columnRow('Idade')).getByRole('button', { name: 'Mover Idade' });

    moveAge.focus();
    await user.keyboard('{Enter}{ArrowDown}');
    expect(readState().columns.findIndex(({ columnId }) => columnId === 'age')).toBe(5);
    expect(screen.getByRole('status').textContent).toContain('Idade, posição 6 de 18.');

    await user.keyboard('{Escape}');
    expect(readState().columns.map(({ columnId }) => columnId)).toEqual(originalOrder);
    expect(document.activeElement).toBe(moveAge);
    expect(screen.getByRole('dialog', { name: 'Configurar tabela' })).toBeInstanceOf(HTMLElement);

    fireEvent.pointerDown(moveAge, { clientX: 10, pointerId: 1 });
    fireEvent.pointerEnter(columnRow('Gols'), { clientX: 40, pointerId: 1 });
    fireEvent.pointerUp(moveAge, { clientX: 40, pointerId: 1 });
    expect(readState().columns.findIndex(({ columnId }) => columnId === 'age')).toBe(15);
    expect(screen.getByRole('status').textContent).toContain('Idade, posição 16 de 18.');

    moveAge.focus();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Configurar tabela' })).toBeNull());
  });

  it('uses the same finite engine bounds for keyboard and pointer resize and lets Escape restore width', async () => {
    render(<Harness />);
    const { user } = await openCustomizer();
    const separator = within(columnRow('Idade')).getByRole('separator', {
      name: 'Redimensionar Idade',
    });

    separator.focus();
    await user.keyboard('{End}');
    expect(readState().columns.find(({ columnId }) => columnId === 'age')?.width).toBe(80);
    expect(separator.getAttribute('aria-valuenow')).toBe('80');
    expect(screen.getByRole('status').textContent).toContain('Idade, largura 80 pixels.');

    await user.keyboard('{Escape}');
    expect(readState().columns.find(({ columnId }) => columnId === 'age')?.width).toBe(64);
    expect(document.activeElement).toBe(separator);

    fireEvent.pointerDown(separator, { clientX: 100, pointerId: 2 });
    fireEvent.pointerMove(separator, { clientX: 132, pointerId: 2 });
    fireEvent.pointerUp(separator, { clientX: 132, pointerId: 2 });
    expect(readState().columns.find(({ columnId }) => columnId === 'age')?.width).toBe(80);
  });

  it('pins through validated commands, preserves rejected state, and names both results politely', async () => {
    render(<Harness />);
    const { user } = await openCustomizer();

    await user.click(within(columnRow('Idade')).getByRole('button', { name: 'Fixar no início' }));
    expect(readState().columns.find(({ columnId }) => columnId === 'age')?.pinning.side).toBe(
      'start',
    );
    expect(screen.getByRole('status').textContent).toContain('Idade fixada no início.');

    const beforeRejectedPin = readState();
    await user.click(
      within(columnRow('NAT')).getByRole('button', { name: 'Fixar no início' }),
    );
    expect(readState()).toEqual(beforeRejectedPin);
    expect(screen.getByRole('status').textContent).toContain(
      'NAT: no máximo quatro colunas podem ficar fixadas.',
    );

    await user.click(within(columnRow('Idade')).getByRole('button', { name: 'Desafixar coluna' }));
    expect(readState().columns.find(({ columnId }) => columnId === 'age')?.pinning.side).toBe(
      'none',
    );
    expect(screen.getByRole('status').textContent).toContain('Idade desafixada.');
  });

  it('keeps reset scopes distinct and closes only after a confirmed save', async () => {
    const onSave = vi.fn(() => true);
    const initialState = applyTableViewCommand(SQUAD_TABLE_SCHEMA, SQUAD_SYSTEM_VIEW, {
      type: 'sort.set',
      sort: [{ columnId: 'goals', direction: 'desc', nulls: 'last' }],
    }).state;
    render(<Harness initialState={initialState} onSave={onSave} />);
    const { user } = await openCustomizer();

    await user.click(within(columnRow('Idade')).getByRole('button', { name: 'Ocultar Idade' }));
    await user.click(screen.getByRole('button', { name: 'Restaurar colunas' }));
    expect(readState().columns).toEqual(SQUAD_SYSTEM_VIEW.columns);
    expect(readState().sort).toEqual(initialState.sort);

    await user.click(screen.getByRole('button', { name: 'Restaurar visualização' }));
    expect(readState().sort).toEqual(SQUAD_SYSTEM_VIEW.sort);

    await user.click(screen.getByRole('button', { name: 'Salvar visualização' }));
    expect(onSave).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Configurar tabela' })).toBeNull());
  });
});
