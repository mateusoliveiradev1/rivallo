import type { Locator } from '@playwright/test';

export type ContrastKind = 'text' | 'control' | 'focus';

export interface ComputedContrastSample {
  readonly label: string;
  readonly kind: ContrastKind;
  readonly foreground: string;
  readonly background: string;
  readonly ratio: number;
}

export interface ComputedContrastOptions {
  readonly kind: ContrastKind;
  readonly label: string;
}

export const requiredContrastRatio = (kind: ContrastKind): number => (kind === 'text' ? 4.5 : 3);

export async function sampleComputedContrast(
  _locator: Locator,
  _options: ComputedContrastOptions,
): Promise<ComputedContrastSample> {
  throw new Error('WCAG contrast sampling is not implemented yet.');
}
