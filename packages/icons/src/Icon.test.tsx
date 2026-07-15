import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';

import { Icon, genericIconMetadata, type IconProps } from './Icon.js';
import { FootballIcon, footballIconMetadata, type FootballIconProps } from './football-icons.js';

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

describe('original football icon registry', () => {
  it('keeps the proof vocabulary small, versioned, and Rivallo-owned', async () => {
    expect(Object.keys(footballIconMetadata)).toEqual([
      'football-ball',
      'goal-frame',
      'training-cone',
    ]);
    expect(
      Object.values(footballIconMetadata).every(
        ({ version, source, viewBox, meaning }) =>
          version === '1.0.0' &&
          source === 'rivallo-project-original' &&
          viewBox === '0 0 24 24' &&
          meaning.length > 0,
      ),
    ).toBe(true);

    const authorship = await readFile(resolve('packages/icons/AUTHORSHIP.md'), 'utf8');
    expect(authorship).toContain('2026-07-15');
    expect(authorship).toContain('Version 1.0.0');
    expect(authorship).toContain(
      'No external SVG path, crest, icon library, or game asset was imported',
    );
    for (const name of Object.keys(footballIconMetadata)) {
      expect(authorship).toContain(`\`${name}\``);
    }
  });

  it.each([16, 20, 24] as const)(
    'renders every football entry at the approved %ipx grid with coherent fixed geometry',
    (size) => {
      for (const name of Object.keys(footballIconMetadata) as Array<
        keyof typeof footballIconMetadata
      >) {
        const { container, unmount } = render(<FootballIcon name={name} size={size} />);
        const svg = container.querySelector('svg');

        expect(svg?.getAttribute('viewBox')).toBe('0 0 24 24');
        expect(svg?.getAttribute('width')).toBe(String(size));
        expect(svg?.getAttribute('height')).toBe(String(size));
        expect(svg?.getAttribute('stroke')).toBe('currentColor');
        expect(svg?.getAttribute('stroke-width')).toBe('1.75');
        expect(svg?.getAttribute('fill')).toBe('none');
        expect(svg?.getAttribute('data-icon-version')).toBe('1.0.0');
        expect(container.querySelectorAll('path, circle, line').length).toBeGreaterThan(1);
        unmount();
      }
    },
  );

  it('shares the decorative and meaningful accessibility boundary', () => {
    const { rerender } = render(<FootballIcon name="football-ball" />);
    expect(document.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');

    rerender(<FootballIcon name="training-cone" decorative={false} label="Treinamento de campo" />);
    expect(screen.getByRole('img', { name: 'Treinamento de campo' })).toBeTruthy();
  });

  it('contains only fixed local static SVG geometry and safe attributes', () => {
    for (const name of Object.keys(footballIconMetadata) as Array<
      keyof typeof footballIconMetadata
    >) {
      const { container, unmount } = render(
        <FootballIcon name={name} decorative={false} label={footballIconMetadata[name].meaning} />,
      );
      const markup = container.innerHTML;

      expect(markup).not.toMatch(/https?:|javascript:|data:|<use|<image|<animate|<foreignObject/iu);
      expect(container.querySelectorAll('[href], [src], [style]').length).toBe(0);
      for (const element of container.querySelectorAll('*')) {
        expect(element.getAttributeNames().some((attribute) => /^on/iu.test(attribute))).toBe(
          false,
        );
      }
      unmount();
    }
  });

  it('rejects unsupported runtime geometry configuration', () => {
    expect(() =>
      render(
        createElement(FootballIcon, {
          name: 'football-ball',
          size: 18,
        } as unknown as FootballIconProps),
      ),
    ).toThrow(/Unsupported Rivallo football icon size/u);
    expect(() =>
      render(
        createElement(FootballIcon, {
          name: 'external-crest',
          size: 20,
        } as unknown as FootballIconProps),
      ),
    ).toThrow(/Unsupported Rivallo football icon name/u);
  });

  it('keeps consumer paths, markup, handlers, and animation outside the public type', () => {
    if (false) {
      // @ts-expect-error no consumer SVG path input
      createElement(FootballIcon, { name: 'football-ball', path: 'M0 0' });
      // @ts-expect-error no consumer raw markup input
      createElement(FootballIcon, { name: 'football-ball', dangerouslySetInnerHTML: {} });
      // @ts-expect-error no consumer event handler input
      createElement(FootballIcon, { name: 'football-ball', onClick: () => undefined });
      // @ts-expect-error no consumer animation or style input
      createElement(FootballIcon, { name: 'football-ball', style: { animation: 'spin 1s' } });
    }

    expect(true).toBe(true);
  });
});
