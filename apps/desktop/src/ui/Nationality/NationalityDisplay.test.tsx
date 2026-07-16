import { act, fireEvent, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { NationalityDisplay } from './NationalityDisplay.js';

describe('NationalityDisplay', () => {
  it('renders two unique nationalities in stable order with local decorative flags', () => {
    const { container } = render(<NationalityDisplay codes={[' por ', 'PT', 'bra']} />);

    expect(screen.getByText('PRT')).toBeInstanceOf(HTMLElement);
    expect(screen.getByText('BRA')).toBeInstanceOf(HTMLElement);
    expect(container.querySelector('.rv-nationality')?.getAttribute('data-nationality-count')).toBe(
      '2',
    );
    expect(container.querySelectorAll('img')).toHaveLength(2);
    expect(
      [...container.querySelectorAll('img')].every((image) => image.getAttribute('alt') === ''),
    ).toBe(true);
    expect(screen.getByText('PRT').compareDocumentPosition(screen.getByText('BRA'))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it('keeps the code visible when a local image fails', () => {
    const { container } = render(<NationalityDisplay codes={['BRA']} />);
    const image = container.querySelector('img');
    expect(image).toBeInstanceOf(HTMLImageElement);

    fireEvent.error(image as HTMLImageElement);

    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('BRA')).toBeInstanceOf(HTMLElement);
  });

  it('exposes the full country name by keyboard and dismisses its tooltip with Escape', async () => {
    const user = userEvent.setup();
    render(<NationalityDisplay codes={['BRA']} enableKeyboardTooltip />);
    const code = screen.getByText('BRA');

    await act(async () => code.focus());
    expect((await screen.findByRole('tooltip')).textContent).toBe('Brasil');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('does not add table-style nationality codes to the sequential tab order by default', () => {
    render(<NationalityDisplay codes={['BRA']} />);

    expect(screen.getByText('BRA').getAttribute('tabindex')).toBeNull();
  });

  it('renders unknown and empty codes without throwing or relying on imagery', () => {
    const { container, rerender } = render(<NationalityDisplay codes={[' zzz ']} />);
    expect(screen.getByText('ZZZ')).toBeInstanceOf(HTMLElement);
    expect(container.querySelector('img')).toBeNull();

    rerender(<NationalityDisplay codes={[]} />);
    expect(screen.getByText('—').getAttribute('aria-label')).toBe('Nacionalidade não informada');
    expect(container.querySelector('img')).toBeNull();

    rerender(<NationalityDisplay codes={['código-corrompido-comprido']} />);
    expect(screen.getByText('—').getAttribute('aria-label')).toBe('Nacionalidade não identificada');
    expect(container.querySelector('[data-country-code="unknown"]')).toBeInstanceOf(HTMLElement);
  });
});
