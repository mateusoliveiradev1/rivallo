import { execFile } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';

import { describe, expect, it } from 'vitest';

import {
  colorPolicy,
  colorTokens,
  contrastPairs,
  dimensionTokens,
  elevationTokens,
  layerTokens,
  motionTokens,
  publicTokenEntries,
  radiusTokens,
  reducedMotion,
  spacingTokens,
  typographyTokens,
} from '../packages/design-tokens/src/tokens.js';
import {
  assertContrastPairs,
  measureContrastPairs,
  resolveColor,
} from '../packages/design-tokens/src/contrast.js';

const execFileAsync = promisify(execFile);
const root = resolve(import.meta.dirname, '..');
const generator = resolve(root, 'scripts/generate-design-tokens.mjs');
const driftChecker = resolve(root, 'scripts/verify-design-token-drift.mjs');

const REQUIRED_COLORS = [
  'color-canvas',
  'color-surface',
  'color-surface-raised',
  'color-overlay',
  'color-border',
  'color-border-subtle',
  'color-text',
  'color-text-strong',
  'color-text-muted',
  'color-action-primary',
  'color-on-action-primary',
  'color-info',
  'color-focus',
  'color-warning',
  'color-danger',
  'color-premium',
  'color-selection',
];

describe('Rivallo semantic token contract', () => {
  it('owns the complete restrained Noite de Comando color vocabulary', () => {
    expect(Object.keys(colorTokens)).toEqual(REQUIRED_COLORS);
    expect(colorPolicy).toEqual({
      direction: 'arquitetura-tatica',
      accentCoverageMaximum: 0.1,
      clubColorsAreContextOnly: true,
      colorNeverCarriesStateAlone: true,
      decorativeColorAllowed: false,
    });

    expect(resolveColor(colorTokens['color-canvas']).hex).not.toBe('#000000');
    expect(Object.keys(colorTokens)).not.toContain('color-club-primary');
    expect(Object.keys(colorTokens)).not.toContain('color-dashboard');
  });

  it('keeps every fixed desktop product scale exact', () => {
    expect(spacingTokens).toEqual({
      'space-1': '4px',
      'space-2': '8px',
      'space-3': '12px',
      'space-4': '16px',
      'space-5': '20px',
      'space-6': '24px',
      'space-8': '32px',
      'space-10': '40px',
      'space-12': '48px',
      'space-16': '64px',
    });
    expect(radiusTokens).toEqual({
      'radius-1': '4px',
      'radius-control': '6px',
      'radius-panel': '8px',
      'radius-dialog': '12px',
    });
    expect(layerTokens).toEqual({
      'layer-base': 0,
      'layer-sticky': 100,
      'layer-popover': 300,
      'layer-modal-backdrop': 400,
      'layer-modal': 500,
      'layer-toast': 600,
      'layer-tooltip': 700,
    });
    expect(motionTokens).toEqual({
      'motion-feedback': '100ms',
      'motion-control': '150ms',
      'motion-layout': '200ms',
      'motion-emphasis-max': '250ms',
      'motion-ease-out': 'cubic-bezier(0.22, 1, 0.36, 1)',
    });
    expect(reducedMotion).toEqual({ duration: '0.01ms', iterationCount: 1 });
    expect(elevationTokens['elevation-0']).toBe('none');
    expect(Object.keys(elevationTokens)).toEqual([
      'elevation-0',
      'elevation-1',
      'elevation-2',
      'elevation-3',
    ]);
    expect(dimensionTokens).toEqual({
      'stroke-border': '1px',
      'stroke-focus': '2px',
      'control-height': '32px',
      'table-row-compact': '32px',
      'table-row-comfortable': '40px',
    });
  });

  it('provides the fixed type inventory, operational budgets, and tabular data contract', () => {
    expect(typographyTokens.sizes).toEqual({
      'type-12': ['12px', '16px'],
      'type-14': ['14px', '20px'],
      'type-16': ['16px', '24px'],
      'type-18': ['18px', '24px'],
      'type-20': ['20px', '26px'],
      'type-24': ['24px', '30px'],
      'type-30': ['30px', '36px'],
      'type-36': ['36px', '42px'],
    });
    expect(typographyTokens.weights).toEqual([400, 600]);
    expect(typographyTokens.operationalSizeBudget).toEqual(['12px', '14px', '18px', '24px']);
    expect(typographyTokens.operationalFamily).toContain('Inter');
    expect(typographyTokens.titleFamily).toContain('Space Grotesk');
    expect(typographyTokens.numericVariant).toBe('tabular-nums');
  });
});

describe('rendered contrast evidence', () => {
  it('passes every declared normal-text and meaningful UI pair after sRGB gamut mapping', () => {
    const evidence = measureContrastPairs(contrastPairs, colorTokens);

    expect(evidence).toHaveLength(contrastPairs.length);
    expect(evidence.every((pair) => pair.ratio >= pair.threshold)).toBe(true);
    expect(() => assertContrastPairs(contrastPairs, colorTokens)).not.toThrow();
    expect(
      evidence
        .filter((pair) => pair.kind === 'normal-text')
        .every((pair) => pair.threshold === 4.5),
    ).toBe(true);
    expect(
      evidence.filter((pair) => pair.kind === 'non-text').every((pair) => pair.threshold === 3),
    ).toBe(true);
  });

  it('reports the pair, resolved values, measured ratio, and threshold on failure', () => {
    expect(() =>
      assertContrastPairs(
        [
          {
            name: 'forced low-contrast evidence',
            foreground: 'color-canvas',
            background: 'color-surface',
            kind: 'normal-text',
            threshold: 4.5,
          },
        ],
        colorTokens,
      ),
    ).toThrow(
      /forced low-contrast evidence.*#[0-9a-f]{6}.*#[0-9a-f]{6}.*ratio \d+\.\d{2}.*threshold 4\.50/iu,
    );
  });
});

describe('generated semantic CSS', () => {
  it('writes byte-identical isolated output with every public token exactly once', async () => {
    const temporaryRoot = await mkdtemp(join(tmpdir(), 'rivallo-design-tokens-'));
    const first = join(temporaryRoot, 'first', 'generated.css');
    const second = join(temporaryRoot, 'second', 'generated.css');

    try {
      await execFileAsync(process.execPath, [generator, '--output', first], { cwd: root });
      await execFileAsync(process.execPath, [generator, '--output', second], { cwd: root });
      const [firstBytes, secondBytes] = await Promise.all([readFile(first), readFile(second)]);
      const css = firstBytes.toString('utf8');

      expect(firstBytes.equals(secondBytes)).toBe(true);
      expect(css).toMatch(
        /^\/\* Rivallo semantic tokens — generated from tokens\.ts; do not edit\. \*\//u,
      );
      expect(css).toContain('@media (prefers-reduced-motion: reduce)');
      const writtenPaths = (await readdir(temporaryRoot, { recursive: true }))
        .map((path) => path.replaceAll('\\', '/'))
        .sort();
      expect(writtenPaths).toEqual([
        'first',
        'first/generated.css',
        'second',
        'second/generated.css',
      ]);

      for (const { token } of publicTokenEntries) {
        expect(css.match(new RegExp(`--rv-${token}:`, 'gu'))).toHaveLength(1);
      }
      expect(css.match(/--rv-[a-z0-9-]+:/gu)).toHaveLength(publicTokenEntries.length);
      expect(css).not.toMatch(/(?:z-index:\s*999|3\d{2}ms|border-radius:\s*(?:16|24|32)px)/u);
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });

  it('fails actionably for an invalid writer invocation', async () => {
    await expect(
      execFileAsync(process.execPath, [generator, '--output'], { cwd: root }),
    ).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringMatching(/Usage:.*--output <path>/u),
    });
  });
});

describe('semantic CSS drift check', () => {
  it('passes without changing the repository porcelain baseline', async () => {
    const before = await execFileAsync('git', ['status', '--porcelain'], { cwd: root });

    await execFileAsync(process.execPath, [driftChecker], { cwd: root });

    const after = await execFileAsync('git', ['status', '--porcelain'], { cwd: root });
    expect(after.stdout).toBe(before.stdout);
  });

  it('detects controlled drift actionably without repairing altered bytes', async () => {
    const temporaryRoot = await mkdtemp(join(tmpdir(), 'rivallo-token-drift-'));
    const driftedArtifact = join(temporaryRoot, 'generated.css');
    const driftedBytes = Buffer.from('/* deliberately drifted */\n', 'utf8');
    await writeFile(driftedArtifact, driftedBytes);

    try {
      await expect(
        execFileAsync(process.execPath, [driftChecker], {
          cwd: root,
          env: { ...process.env, DESIGN_TOKENS_CSS: driftedArtifact },
        }),
      ).rejects.toMatchObject({
        code: 1,
        stderr: expect.stringMatching(/Design token drift detected[\s\S]*pnpm tokens:generate/u),
      });
      expect(await readFile(driftedArtifact)).toEqual(driftedBytes);
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });
});
