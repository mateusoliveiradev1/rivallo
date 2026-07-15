import type { IconSize } from './Icon.js';

function FootballBallGeometry() {
  return (
    <>
      <circle cx="12" cy="12" r="9.25" />
      <path d="M12 7.25 L16 10.15 L14.45 14.8 H9.55 L8 10.15 Z" />
      <path d="M12 7.25 V2.75 M8 10.15 L3.2 8.6 M9.55 14.8 L6.65 18.75 M14.45 14.8 L17.35 18.75 M16 10.15 L20.8 8.6" />
    </>
  );
}

function GoalFrameGeometry() {
  return (
    <>
      <path d="M3.5 20.5 V5.25 H20.5 V20.5" />
      <path d="M3.5 5.25 L6.25 8.25 H17.75 L20.5 5.25" />
      <path d="M6.25 8.25 V20.5 M12 8.25 V20.5 M17.75 8.25 V20.5" />
      <path d="M3.5 12.25 H20.5 M3.5 16.5 H20.5" />
    </>
  );
}

function TrainingConeGeometry() {
  return (
    <>
      <path d="M10 4 H14 L18.1 19 H5.9 L10 4 Z" />
      <path d="M8.55 9.25 H15.45 M7.4 13.5 H16.6" />
      <path d="M4 19 H20 V21 H4 V19 Z" />
    </>
  );
}

export const footballIconGrammar = {
  masterGrid: 24,
  viewBox: '0 0 24 24',
  approvedSizes: [16, 20, 24],
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  color: 'currentColor',
  fill: 'none',
  opticalPadding: 2,
  detailCeiling: {
    elements: 4,
    pathCommands: 14,
  },
} as const;

const footballIconComponents = {
  'football-ball': FootballBallGeometry,
  'goal-frame': GoalFrameGeometry,
  'training-cone': TrainingConeGeometry,
} as const;

export const footballIconMetadata = {
  'football-ball': {
    meaning: 'Futebol e bola em jogo',
    version: '1.1.0',
    source: 'rivallo-project-original',
    viewBox: '0 0 24 24',
  },
  'goal-frame': {
    meaning: 'Meta e gol de futebol',
    version: '1.1.0',
    source: 'rivallo-project-original',
    viewBox: '0 0 24 24',
  },
  'training-cone': {
    meaning: 'Treinamento de campo',
    version: '1.1.0',
    source: 'rivallo-project-original',
    viewBox: '0 0 24 24',
  },
} as const satisfies Record<
  keyof typeof footballIconComponents,
  {
    readonly meaning: string;
    readonly version: '1.1.0';
    readonly source: 'rivallo-project-original';
    readonly viewBox: '0 0 24 24';
  }
>;

export type FootballIconName = keyof typeof footballIconComponents;

interface FootballIconBaseProps {
  readonly name: FootballIconName;
  readonly size?: IconSize;
  readonly className?: string;
}

interface DecorativeFootballIconProps {
  readonly decorative?: true;
  readonly label?: never;
}

interface SemanticFootballIconProps {
  readonly decorative: false;
  readonly label: string;
}

export type FootballIconProps = FootballIconBaseProps &
  (DecorativeFootballIconProps | SemanticFootballIconProps);

export function FootballIcon({
  name,
  size = 20,
  className,
  decorative = true,
  label,
}: FootballIconProps) {
  const Geometry = footballIconComponents[name];
  if (!Geometry) {
    throw new Error(`Unsupported Rivallo football icon name: ${String(name)}.`);
  }
  if (!footballIconGrammar.approvedSizes.includes(size)) {
    throw new Error(`Unsupported Rivallo football icon size: ${String(size)}. Use 16, 20, or 24.`);
  }
  if (!decorative && (!label || label.trim().length === 0)) {
    throw new Error('Semantic Rivallo football icons require a non-empty label.');
  }

  const metadata = footballIconMetadata[name];
  return (
    <svg
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : label}
      className={className}
      data-icon-family="rivallo-football"
      data-icon-grid={footballIconGrammar.masterGrid}
      data-icon-name={name}
      data-icon-version={metadata.version}
      fill={footballIconGrammar.fill}
      focusable="false"
      height={size}
      role={decorative ? undefined : 'img'}
      stroke={footballIconGrammar.color}
      strokeLinecap={footballIconGrammar.strokeLinecap}
      strokeLinejoin={footballIconGrammar.strokeLinejoin}
      strokeWidth={footballIconGrammar.strokeWidth}
      viewBox={footballIconGrammar.viewBox}
      width={size}
    >
      <Geometry />
    </svg>
  );
}
