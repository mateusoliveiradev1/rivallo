import { render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';

import { Icon, genericIconMetadata, type IconProps } from './Icon.js';

describe('curated generic Icon boundary', () => {
  it.each([16, 20, 24] as const)(
    'renders approved size %ipx with fixed currentColor and 1.75px stroke',
    (size) => {
      const { container } = render(<Icon name="add" size={size} />);
      const svg = container.querySelector('svg');

      expect(svg).not.toBeNull();
      expect(svg?.getAttribute('width')).toBe(String(size));
      expect(svg?.getAttribute('height')).toBe(String(size));
      expect(svg?.getAttribute('stroke')).toBe('currentColor');
      expect(svg?.getAttribute('stroke-width')).toBe('1.75');
      expect(svg?.getAttribute('fill')).toBe('none');
      expect(svg?.getAttribute('focusable')).toBe('false');
    },
  );

  it('hides decorative icons and deliberately labels semantic standalone icons', () => {
    const { rerender } = render(<Icon name="information" />);

    expect(document.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(document.querySelector('svg')?.hasAttribute('role')).toBe(false);

    rerender(<Icon name="warning" decorative={false} label="Atenção" />);
    expect(screen.getByRole('img', { name: 'Atenção' }).hasAttribute('aria-hidden')).toBe(false);
  });

  it('exposes semantic metadata without leaking Lucide implementation names', () => {
    expect(Object.keys(genericIconMetadata)).toEqual([
      'add',
      'check',
      'close',
      'collapse-navigation',
      'columns',
      'copy',
      'danger',
      'expand-navigation',
      'information',
      'loading',
      'more-actions',
      'next',
      'previous',
      'retry',
      'search',
      'sort-ascending',
      'sort-descending',
      'success',
      'warning',
    ]);
    expect(Object.values(genericIconMetadata).every(({ meaning }) => meaning.length > 0)).toBe(
      true,
    );
    expect(JSON.stringify(genericIconMetadata)).not.toMatch(/lucide|svg|path/iu);
  });

  it('rejects unsupported runtime names, sizes, and empty semantic labels', () => {
    expect(() =>
      render(createElement(Icon, { name: 'unknown', size: 20 } as unknown as IconProps)),
    ).toThrow(/Unsupported Rivallo icon name/u);
    expect(() =>
      render(createElement(Icon, { name: 'add', size: 18 } as unknown as IconProps)),
    ).toThrow(/Unsupported Rivallo icon size/u);
    expect(() =>
      render(
        createElement(Icon, {
          name: 'warning',
          size: 20,
          decorative: false,
          label: ' ',
        } as IconProps),
      ),
    ).toThrow(/Semantic Rivallo icons require a non-empty label/u);
  });

  it('does not forward arbitrary color, stroke, animation, style, or SVG path input', () => {
    const unsafeProps = {
      name: 'add',
      size: 20,
      color: 'red',
      strokeWidth: 8,
      style: { animation: 'spin 1s infinite' },
      d: 'M0 0',
    } as unknown as IconProps;
    const { container } = render(createElement(Icon, unsafeProps));
    const svg = container.querySelector('svg');

    expect(svg?.getAttribute('stroke')).toBe('currentColor');
    expect(svg?.getAttribute('stroke-width')).toBe('1.75');
    expect(svg?.hasAttribute('style')).toBe(false);
    expect(container.innerHTML).not.toContain('M0 0');
    expect(container.innerHTML).not.toContain('spin');
  });

  it('keeps unsupported configuration out of the TypeScript surface', () => {
    if (false) {
      // @ts-expect-error arbitrary Lucide names are not public Rivallo names
      createElement(Icon, { name: 'airplay' });
      // @ts-expect-error only the approved optical grids are public
      createElement(Icon, { name: 'add', size: 18 });
      // @ts-expect-error consumers cannot override stroke width
      createElement(Icon, { name: 'add', strokeWidth: 2 });
      // @ts-expect-error semantic icons require a label
      createElement(Icon, { name: 'warning', decorative: false });
    }

    expect(true).toBe(true);
  });
});
