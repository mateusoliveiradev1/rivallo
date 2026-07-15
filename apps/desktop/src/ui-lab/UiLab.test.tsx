import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { UiLab } from './UiLab.js';

describe('UI Lab development boundary', () => {
  it('uses the exact internal path behind a compile-time development guard', async () => {
    const mainSource = await readFile(resolve('apps/desktop/src/main.tsx'), 'utf8');

    expect(mainSource).toContain(
      "const isUiLab = import.meta.env.DEV && window.location.pathname === '/__ui-lab';",
    );
    expect(mainSource).toMatch(
      /isUiLab\s*\?\s*import\('\.\/ui-lab\/UiLab\.js'\)\s*:\s*import\('\.\/App\.js'\)/u,
    );
    expect(mainSource).not.toMatch(/import\s+\{\s*UiLab\s*\}\s+from/u);
    expect(mainSource).not.toContain('href="/__ui-lab"');
  });

  it('renders without service readiness, host bridge, network, or storage access', async () => {
    render(<UiLab />);

    expect(screen.getByRole('heading', { name: 'UI Lab Rivallo' })).toBeInstanceOf(
      HTMLHeadingElement,
    );
    expect(
      screen.getByText('Inspeção determinística da fundação visual em desenvolvimento.'),
    ).toBeInstanceOf(HTMLParagraphElement);

    const source = await readFile(resolve('apps/desktop/src/ui-lab/UiLab.tsx'), 'utf8');
    expect(source).not.toMatch(/@tauri-apps|contracts-client|lifecycle|\binvoke\(|\bfetch\(/iu);
    expect(source).not.toMatch(/localStorage|sessionStorage|indexedDB|navigator\.storage/u);
  });
});
