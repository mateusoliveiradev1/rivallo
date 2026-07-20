import { invoke } from '@tauri-apps/api/core';
import { act, render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SettingsScreen } from './SettingsScreen.js';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));

describe('SettingsScreen', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(invoke).mockReset().mockResolvedValue(undefined);
  });

  it('guards navigation while global preferences are unsaved', async () => {
    const onBack = vi.fn();
    const user = userEvent.setup();
    render(<SettingsScreen onBack={onBack} />);

    await user.click(screen.getByRole('checkbox', { name: /Preferir navegação compacta/u }));
    await user.click(screen.getByRole('button', { name: 'Voltar ao Menu Principal' }));

    const dialog = screen.getByRole('dialog', { name: 'Salvar configurações?' });
    expect(onBack).not.toHaveBeenCalled();
    await user.click(withinDialog(dialog, 'Cancelar'));
    await user.click(screen.getByRole('button', { name: 'Voltar ao Menu Principal' }));
    await user.click(withinDialog(screen.getByRole('dialog'), 'Descartar e voltar'));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('intercepts the window close coordinator and can save before exiting', async () => {
    const user = userEvent.setup();
    render(<SettingsScreen onBack={vi.fn()} />);
    await user.click(screen.getByRole('checkbox', { name: /Preferir navegação compacta/u }));

    const closeRequest = new Event('rivallo:window-close-requested', { cancelable: true });
    let dispatched = true;
    act(() => {
      dispatched = window.dispatchEvent(closeRequest);
    });
    expect(dispatched).toBe(false);
    const dialog = await screen.findByRole('dialog', { name: 'Salvar antes de sair?' });
    await user.click(withinDialog(dialog, 'Salvar e sair'));

    expect(localStorage.getItem('rivallo.global-settings.v1')).toContain(
      '"compactNavigation":true',
    );
    expect(invoke).toHaveBeenCalledWith('exit_application', undefined);
  });
});

const withinDialog = (dialog: HTMLElement, name: string) =>
  within(dialog).getByRole('button', { name });
