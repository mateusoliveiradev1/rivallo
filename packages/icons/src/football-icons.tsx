import type { IconSize } from './Icon.js';

function FootballBallGeometry() {
  return (
    <>
      <circle cx="12" cy="12" r="8.75" />
      <path d="m9.2 9.25 2.8-2.05 2.8 2.05-1.05 3.3h-3.5Z" />
      <path d="m12 7.2-.1-3.95M9.2 9.25 5.45 8M10.25 12.55l-2.3 3.2M13.75 12.55l2.3 3.2M14.8 9.25 18.55 8M7.95 15.75l-2.25 1.1M16.05 15.75l2.25 1.1" />
    </>
  );
}

function GoalFrameGeometry() {
  return (
    <>
      <path d="M4 19V6h16v13" />
      <path d="M4 10h16M8 6v13m8-13v13" />
      <path d="m4 14 4-4 4 4 4-4 4 4" />
      <path d="M3 20h18" />
    </>
  );
}

function TrainingConeGeometry() {
  return (
    <>
      <path d="M9.25 5h5.5l3.4 13H5.85Z" />
      <path d="M7.55 12h8.9" />
      <path d="M4 20h16" />
      <path d="M10.2 5 9.65 3h4.7l-.55 2" />
    </>
  );
}

const footballIconComponents = {
  'football-ball': FootballBallGeometry,
  'goal-frame': GoalFrameGeometry,
  'training-cone': TrainingConeGeometry,
} as const;

export const footballIconMetadata = {
  'football-ball': {
    meaning: 'Futebol e bola em jogo',
    version: '1.0.0',
    source: 'rivallo-project-original',
    viewBox: '0 0 24 24',
  },
  'goal-frame': {
    meaning: 'Meta e gol de futebol',
    version: '1.0.0',
    source: 'rivallo-project-original',
    viewBox: '0 0 24 24',
  },
  'training-cone': {
    meaning: 'Treinamento de campo',
    version: '1.0.0',
    source: 'rivallo-project-original',
    viewBox: '0 0 24 24',
  },
} as const satisfies Record<
  keyof typeof footballIconComponents,
  {
    readonly meaning: string;
    readonly version: '1.0.0';
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
  if (size !== 16 && size !== 20 && size !== 24) {
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
      data-icon-name={name}
      data-icon-version={metadata.version}
      fill="none"
      focusable="false"
      height={size}
      role={decorative ? undefined : 'img'}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.75"
      viewBox={metadata.viewBox}
      width={size}
    >
      <Geometry />
    </svg>
  );
}
