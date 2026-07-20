import type { CSSProperties } from 'react';

import { useActiveCoachPortrait } from '../career/CareerPortrait.js';
import { resolveWorldEntityAsset } from '../world-reference-catalog.js';

interface CoachFaceProps {
  readonly entityId: string;
  readonly name: string;
  readonly className?: string;
  readonly size?: number;
  readonly decorative?: boolean;
}

const initialsFor = (name: string) =>
  name
    .split(/\s+/u)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase('pt-BR') ?? '')
    .join('');

export function CoachFace({
  entityId,
  name,
  className,
  size = 40,
  decorative = false,
}: CoachFaceProps) {
  const careerSource = useActiveCoachPortrait(entityId);
  const source = careerSource ?? resolveWorldEntityAsset(entityId, 'coachPortrait');
  const style = { '--player-face-size': `${size}px` } as CSSProperties;
  return (
    <span
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : `Retrato de ${name}`}
      className={['player-face', 'coach-face', className].filter(Boolean).join(' ')}
      role={decorative ? undefined : 'img'}
      style={style}
    >
      {source ? <img alt="" draggable={false} src={source} /> : <b>{initialsFor(name)}</b>}
    </span>
  );
}
