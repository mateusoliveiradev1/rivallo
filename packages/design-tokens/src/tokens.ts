export const colorPolicy = {
  direction: 'arquitetura-tatica',
  accentCoverageMaximum: 0.1,
  clubColorsAreContextOnly: true,
  colorNeverCarriesStateAlone: true,
  decorativeColorAllowed: false,
} as const;

export const colorTokens = {
  'color-canvas': 'oklch(0.145 0.014 190)',
  'color-surface': 'oklch(0.185 0.018 190)',
  'color-surface-raised': 'oklch(0.225 0.020 190)',
  'color-overlay': 'oklch(0.105 0.010 190 / 0.78)',
  'color-border': 'oklch(0.520 0.022 190)',
  'color-border-subtle': 'oklch(0.270 0.018 190)',
  'color-text': 'oklch(0.955 0.008 185)',
  'color-text-strong': 'oklch(0.985 0.004 185)',
  'color-text-muted': 'oklch(0.760 0.018 185)',
  'color-action-primary': 'oklch(0.720 0.150 155)',
  'color-on-action-primary': 'oklch(0.165 0.018 175)',
  'color-info': 'oklch(0.780 0.120 220)',
  'color-focus': 'oklch(0.780 0.120 220)',
  'color-warning': 'oklch(0.800 0.135 80)',
  'color-danger': 'oklch(0.680 0.180 25)',
  'color-premium': 'oklch(0.750 0.100 85)',
  'color-selection': 'oklch(0.320 0.055 210)',
} as const;

export type ColorTokenName = keyof typeof colorTokens;

export const spacingTokens = {
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
} as const;

export const radiusTokens = {
  'radius-1': '4px',
  'radius-control': '6px',
  'radius-panel': '8px',
  'radius-dialog': '12px',
} as const;

export const elevationTokens = {
  'elevation-0': 'none',
  'elevation-1': '0 2px 6px rgb(0 0 0 / 0.18)',
  'elevation-2': '0 4px 8px rgb(0 0 0 / 0.24)',
  'elevation-3': '0 6px 8px rgb(0 0 0 / 0.3)',
} as const;

export const layerTokens = {
  'layer-base': 0,
  'layer-sticky': 100,
  'layer-popover': 300,
  'layer-modal-backdrop': 400,
  'layer-modal': 500,
  'layer-toast': 600,
  'layer-tooltip': 700,
} as const;

export const motionTokens = {
  'motion-feedback': '100ms',
  'motion-control': '150ms',
  'motion-layout': '200ms',
  'motion-emphasis-max': '250ms',
  'motion-ease-out': 'cubic-bezier(0.22, 1, 0.36, 1)',
} as const;

export const reducedMotion = {
  duration: '0.01ms',
  iterationCount: 1,
} as const;

export const dimensionTokens = {
  'stroke-border': '1px',
  'stroke-focus': '2px',
  'control-height': '32px',
  'table-row-compact': '32px',
  'table-row-comfortable': '40px',
} as const;

export const typographyTokens = {
  operationalFamily:
    "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  titleFamily: "'Space Grotesk', Inter, ui-sans-serif, system-ui, sans-serif",
  numericVariant: 'tabular-nums',
  weights: [400, 600],
  operationalSizeBudget: ['12px', '14px', '18px', '24px'],
  sizes: {
    'type-12': ['12px', '16px'],
    'type-14': ['14px', '20px'],
    'type-16': ['16px', '24px'],
    'type-18': ['18px', '24px'],
    'type-20': ['20px', '26px'],
    'type-24': ['24px', '30px'],
    'type-30': ['30px', '36px'],
    'type-36': ['36px', '42px'],
  },
} as const;

export type ContrastKind = 'normal-text' | 'non-text';

export interface ContrastPair {
  readonly name: string;
  readonly foreground: ColorTokenName;
  readonly background: ColorTokenName;
  readonly kind: ContrastKind;
  readonly threshold: 4.5 | 3;
}

export const contrastPairs: readonly ContrastPair[] = [
  {
    name: 'operational text on canvas',
    foreground: 'color-text',
    background: 'color-canvas',
    kind: 'normal-text',
    threshold: 4.5,
  },
  {
    name: 'operational text on surface',
    foreground: 'color-text',
    background: 'color-surface',
    kind: 'normal-text',
    threshold: 4.5,
  },
  {
    name: 'operational text on raised surface',
    foreground: 'color-text',
    background: 'color-surface-raised',
    kind: 'normal-text',
    threshold: 4.5,
  },
  {
    name: 'muted text on canvas',
    foreground: 'color-text-muted',
    background: 'color-canvas',
    kind: 'normal-text',
    threshold: 4.5,
  },
  {
    name: 'muted text on surface',
    foreground: 'color-text-muted',
    background: 'color-surface',
    kind: 'normal-text',
    threshold: 4.5,
  },
  {
    name: 'muted text on raised surface',
    foreground: 'color-text-muted',
    background: 'color-surface-raised',
    kind: 'normal-text',
    threshold: 4.5,
  },
  {
    name: 'strong text on canvas',
    foreground: 'color-text-strong',
    background: 'color-canvas',
    kind: 'normal-text',
    threshold: 4.5,
  },
  {
    name: 'action label on primary action',
    foreground: 'color-on-action-primary',
    background: 'color-action-primary',
    kind: 'normal-text',
    threshold: 4.5,
  },
  {
    name: 'information text on canvas',
    foreground: 'color-info',
    background: 'color-canvas',
    kind: 'normal-text',
    threshold: 4.5,
  },
  {
    name: 'warning text on canvas',
    foreground: 'color-warning',
    background: 'color-canvas',
    kind: 'normal-text',
    threshold: 4.5,
  },
  {
    name: 'danger text on canvas',
    foreground: 'color-danger',
    background: 'color-canvas',
    kind: 'normal-text',
    threshold: 4.5,
  },
  {
    name: 'premium text on canvas',
    foreground: 'color-premium',
    background: 'color-canvas',
    kind: 'normal-text',
    threshold: 4.5,
  },
  {
    name: 'text on selected surface',
    foreground: 'color-text',
    background: 'color-selection',
    kind: 'normal-text',
    threshold: 4.5,
  },
  {
    name: 'control border on raised surface',
    foreground: 'color-border',
    background: 'color-surface-raised',
    kind: 'non-text',
    threshold: 3,
  },
  {
    name: 'focus ring on canvas',
    foreground: 'color-focus',
    background: 'color-canvas',
    kind: 'non-text',
    threshold: 3,
  },
  {
    name: 'focus ring on raised surface',
    foreground: 'color-focus',
    background: 'color-surface-raised',
    kind: 'non-text',
    threshold: 3,
  },
  {
    name: 'primary action against raised surface',
    foreground: 'color-action-primary',
    background: 'color-surface-raised',
    kind: 'non-text',
    threshold: 3,
  },
  {
    name: 'danger indicator against raised surface',
    foreground: 'color-danger',
    background: 'color-surface-raised',
    kind: 'non-text',
    threshold: 3,
  },
] as const;

const typographyCssTokens = Object.fromEntries(
  Object.entries(typographyTokens.sizes).flatMap(([name, [size, lineHeight]]) => [
    [`${name}-size`, size],
    [`${name}-line-height`, lineHeight],
  ]),
);

export const publicTokenGroups = [
  { name: 'color', values: colorTokens },
  { name: 'spacing', values: spacingTokens },
  { name: 'radius', values: radiusTokens },
  { name: 'elevation', values: elevationTokens },
  { name: 'layer', values: layerTokens },
  { name: 'motion', values: motionTokens },
  { name: 'dimension', values: dimensionTokens },
  {
    name: 'typography',
    values: {
      'font-operational': typographyTokens.operationalFamily,
      'font-title': typographyTokens.titleFamily,
      'font-numeric-variant': typographyTokens.numericVariant,
      'font-weight-regular': typographyTokens.weights[0],
      'font-weight-semibold': typographyTokens.weights[1],
      ...typographyCssTokens,
    },
  },
] as const;

export const publicTokenEntries = publicTokenGroups.flatMap(({ name, values }) =>
  Object.entries(values).map(([token, value]) => ({ group: name, token, value: String(value) })),
);
