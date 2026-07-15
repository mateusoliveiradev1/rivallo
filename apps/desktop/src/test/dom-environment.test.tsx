import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

function TestCounter() {
  const [count, setCount] = useState(0);

  return (
    <button type="button" onClick={() => setCount((value) => value + 1)}>
      Incrementar teste: {count}
    </button>
  );
}

function ThrowingFixture(): never {
  throw new Error('deliberate DOM harness failure');
}

describe('desktop DOM test environment', () => {
  it('renders and interacts through an accessible role and name', async () => {
    const user = userEvent.setup();
    render(<TestCounter />);

    const button = screen.getByRole('button', { name: 'Incrementar teste: 0' });
    await user.click(button);

    expect(screen.getByRole('button', { name: 'Incrementar teste: 1' })).toBe(button);
  });

  it('automatically cleans the DOM between tests', () => {
    expect(screen.queryByRole('button', { name: /Incrementar teste/u })).toBeNull();

    render(<p>Ambiente DOM limpo</p>);
    expect(screen.getByText('Ambiente DOM limpo')).toBeInstanceOf(HTMLParagraphElement);
  });

  it('surfaces a deliberate render error to the test harness', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    try {
      expect(() => render(<ThrowingFixture />)).toThrow('deliberate DOM harness failure');
    } finally {
      consoleError.mockRestore();
    }
  });
});
