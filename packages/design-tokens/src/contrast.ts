import Color from 'colorjs.io';

import type { ColorTokenName, ContrastPair } from './tokens.js';

export interface ResolvedColor {
  readonly authored: string;
  readonly hex: string;
  readonly srgb: string;
}

export interface ContrastEvidence extends ContrastPair {
  readonly foregroundAuthored: string;
  readonly backgroundAuthored: string;
  readonly foregroundResolved: string;
  readonly backgroundResolved: string;
  readonly ratio: number;
  readonly passes: boolean;
}

export function resolveColor(authored: string): ResolvedColor {
  const resolved = new Color(authored).to('srgb');
  resolved.toGamut({ space: 'srgb', method: 'oklch.chroma' });

  return {
    authored,
    hex: resolved.toString({ format: 'hex' }).toLowerCase(),
    srgb: resolved.toString({ format: 'color' }),
  };
}

export function measureContrastPairs(
  pairs: readonly ContrastPair[],
  colors: Readonly<Record<ColorTokenName, string>>,
): ContrastEvidence[] {
  return pairs.map((pair) => {
    const foreground = resolveColor(colors[pair.foreground]);
    const background = resolveColor(colors[pair.background]);
    const ratio = Color.contrastWCAG21(new Color(foreground.hex), new Color(background.hex));

    return {
      ...pair,
      foregroundAuthored: foreground.authored,
      backgroundAuthored: background.authored,
      foregroundResolved: foreground.hex,
      backgroundResolved: background.hex,
      ratio,
      passes: ratio >= pair.threshold,
    };
  });
}

export function assertContrastPairs(
  pairs: readonly ContrastPair[],
  colors: Readonly<Record<ColorTokenName, string>>,
): ContrastEvidence[] {
  const evidence = measureContrastPairs(pairs, colors);
  const failures = evidence.filter(({ passes }) => !passes);

  if (failures.length > 0) {
    throw new Error(
      failures
        .map(
          (pair) =>
            `Contrast failure "${pair.name}": foreground ${pair.foreground} ${pair.foregroundResolved} on background ${pair.background} ${pair.backgroundResolved}; measured ratio ${pair.ratio.toFixed(2)}; required threshold ${pair.threshold.toFixed(2)}.`,
        )
        .join('\n'),
    );
  }

  return evidence;
}
