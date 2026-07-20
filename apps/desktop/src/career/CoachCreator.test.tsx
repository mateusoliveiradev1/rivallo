import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { CoachCreator, defaultCoachDraft } from './CoachCreator.js';
import type { CoachCreatorDraft } from './types.js';

function CreatorHarness() {
  const [draft, setDraft] = useState<CoachCreatorDraft>(() => defaultCoachDraft());
  return (
    <CoachCreator
      draft={draft}
      nations={[{ id: 'bra', name: 'Brasil', iso2: 'BR' }]}
      onChange={setDraft}
    />
  );
}

describe('CoachCreator', () => {
  it('blocks an incomplete identity and advances after the required fields are valid', async () => {
    const user = userEvent.setup();
    render(<CreatorHarness />);

    expect(screen.getByText(/Preencha nome, sobrenome/u)).toBeInstanceOf(HTMLParagraphElement);
    expect((screen.getByRole('button', { name: 'Próximo' }) as HTMLButtonElement).disabled).toBe(
      true,
    );

    await user.type(screen.getByRole('textbox', { name: 'Nome' }), 'Lia');
    await user.type(screen.getByRole('textbox', { name: 'Sobrenome' }), 'Torres');
    await user.type(screen.getByRole('textbox', { name: 'Nome conhecido' }), 'Lia Torres');
    await user.click(screen.getByRole('button', { name: 'Próximo' }));

    expect(screen.getByRole('heading', { name: 'Aparência' })).toBeInstanceOf(HTMLHeadingElement);
  });

  it('rejects SVG portrait input before it reaches the authoritative Rust validator', async () => {
    const user = userEvent.setup({ applyAccept: false });
    render(<CreatorHarness />);
    await user.type(screen.getByRole('textbox', { name: 'Nome' }), 'Lia');
    await user.type(screen.getByRole('textbox', { name: 'Sobrenome' }), 'Torres');
    await user.type(screen.getByRole('textbox', { name: 'Nome conhecido' }), 'Lia Torres');
    await user.click(screen.getByRole('button', { name: 'Próximo' }));

    const input = screen.getByLabelText('Importar retrato local');
    await user.upload(input, new File(['<svg/>'], 'coach.svg', { type: 'image/svg+xml' }));
    expect(screen.getByText(/SVG e arquivos remotos não são aceitos/u)).toBeInstanceOf(
      HTMLParagraphElement,
    );
  });
});
