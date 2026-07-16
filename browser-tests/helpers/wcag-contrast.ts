import type { Locator } from '@playwright/test';

export type ContrastKind = 'text' | 'control' | 'focus';
export type ContrastForeground = 'auto' | 'background' | 'border' | 'color' | 'outline';

export interface ComputedContrastSample {
  readonly label: string;
  readonly kind: ContrastKind;
  readonly foreground: string;
  readonly background: string;
  readonly ratio: number;
}

export interface ComputedContrastOptions {
  readonly foreground?: ContrastForeground;
  readonly kind: ContrastKind;
  readonly label: string;
}

export interface SrgbColor {
  readonly red: number;
  readonly green: number;
  readonly blue: number;
  readonly alpha: number;
}

export const requiredContrastRatio = (kind: ContrastKind): number => (kind === 'text' ? 4.5 : 3);

const clampUnit = (value: number): number => Math.min(1, Math.max(0, value));

export const parseSrgb = (value: string): SrgbColor => {
  const match = value
    .trim()
    .match(
      /^rgba?\(\s*([\d.]+)\s*[, ]\s*([\d.]+)\s*[, ]\s*([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/iu,
    );
  if (match === null) throw new Error(`Unsupported computed sRGB colour: ${value}`);
  const alphaToken = match[4];
  const alpha =
    alphaToken === undefined
      ? 1
      : alphaToken.endsWith('%')
        ? Number.parseFloat(alphaToken) / 100
        : Number.parseFloat(alphaToken);
  return {
    red: clampUnit(Number.parseFloat(match[1] ?? '0') / 255),
    green: clampUnit(Number.parseFloat(match[2] ?? '0') / 255),
    blue: clampUnit(Number.parseFloat(match[3] ?? '0') / 255),
    alpha: clampUnit(alpha),
  };
};

export const compositeSrgb = (foreground: SrgbColor, background: SrgbColor): SrgbColor => {
  const alpha = foreground.alpha + background.alpha * (1 - foreground.alpha);
  if (alpha === 0) return { red: 0, green: 0, blue: 0, alpha: 0 };
  return {
    red:
      (foreground.red * foreground.alpha +
        background.red * background.alpha * (1 - foreground.alpha)) /
      alpha,
    green:
      (foreground.green * foreground.alpha +
        background.green * background.alpha * (1 - foreground.alpha)) /
      alpha,
    blue:
      (foreground.blue * foreground.alpha +
        background.blue * background.alpha * (1 - foreground.alpha)) /
      alpha,
    alpha,
  };
};

export const resolveEffectiveBackground = (layers: readonly string[]): SrgbColor => {
  let effective: SrgbColor = { red: 0, green: 0, blue: 0, alpha: 1 };
  for (const layer of [...layers].reverse()) {
    effective = compositeSrgb(parseSrgb(layer), effective);
  }
  return effective;
};

const linearChannel = (value: number): number =>
  value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;

export const relativeLuminance = (color: SrgbColor): number =>
  0.2126 * linearChannel(color.red) +
  0.7152 * linearChannel(color.green) +
  0.0722 * linearChannel(color.blue);

export const contrastRatio = (first: SrgbColor, second: SrgbColor): number => {
  const lighter = Math.max(relativeLuminance(first), relativeLuminance(second));
  const darker = Math.min(relativeLuminance(first), relativeLuminance(second));
  return (lighter + 0.05) / (darker + 0.05);
};

const serializeSrgb = (color: SrgbColor): string =>
  `rgba(${Math.round(color.red * 255)}, ${Math.round(color.green * 255)}, ${Math.round(
    color.blue * 255,
  )}, ${color.alpha.toFixed(3)})`;

export async function sampleComputedContrast(
  locator: Locator,
  options: ComputedContrastOptions,
): Promise<ComputedContrastSample> {
  const computed = await locator.evaluate(
    (element, options) => {
      if (!(element instanceof HTMLElement || element instanceof SVGElement)) {
        throw new Error('Contrast sampling requires an HTML or SVG element.');
      }

      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (context === null) throw new Error('Canvas colour normalization is unavailable.');

      const normalizeToSrgb = (value: string): string => {
        context.clearRect(0, 0, 1, 1);
        context.fillStyle = 'rgba(0, 0, 0, 0)';
        context.fillStyle = value;
        context.fillRect(0, 0, 1, 1);
        const [red = 0, green = 0, blue = 0, alpha = 0] = context.getImageData(0, 0, 1, 1).data;
        return `rgba(${red}, ${green}, ${blue}, ${alpha / 255})`;
      };

      const style = getComputedStyle(element);
      const source =
        options.foreground === 'auto'
          ? options.kind === 'text'
            ? 'color'
            : options.kind === 'focus'
              ? 'outline'
              : style.borderTopColor === 'rgba(0, 0, 0, 0)' ||
                  style.borderTopStyle === 'none' ||
                  style.borderTopWidth === '0px'
                ? 'background'
                : 'border'
          : options.foreground;
      const foreground =
        source === 'color'
          ? style.color
          : source === 'outline'
            ? style.outlineColor
            : source === 'background'
              ? style.backgroundColor
              : style.borderTopColor;
      const layers: string[] = [];
      let current: Element | null = source === 'color' ? element : element.parentElement;
      while (current !== null) {
        layers.push(normalizeToSrgb(getComputedStyle(current).backgroundColor));
        current = current.parentElement;
      }

      return {
        foreground: normalizeToSrgb(foreground),
        backgroundLayers: layers,
      };
    },
    {
      foreground: options.foreground ?? 'auto',
      kind: options.kind,
    },
  );

  const background = resolveEffectiveBackground(computed.backgroundLayers);
  const foreground = compositeSrgb(parseSrgb(computed.foreground), background);
  return {
    label: options.label,
    kind: options.kind,
    foreground: serializeSrgb(foreground),
    background: serializeSrgb(background),
    ratio: contrastRatio(foreground, background),
  };
}
