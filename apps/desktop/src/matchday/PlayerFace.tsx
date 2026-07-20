import type { CSSProperties } from 'react';

import { resolveWorldEntityAsset } from '../world-reference-catalog.js';

interface PlayerFaceProps {
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

export function PlayerFace({
  entityId,
  name,
  className,
  size = 40,
  decorative = false,
}: PlayerFaceProps) {
  const source = resolveWorldEntityAsset(entityId, 'playerPortrait');
  const style = { '--player-face-size': `${size}px` } as CSSProperties;

  return (
    <span
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : `Miniface de ${name}`}
      className={['player-face', className].filter(Boolean).join(' ')}
      role={decorative ? undefined : 'img'}
      style={style}
    >
      {source ? <img alt="" draggable={false} src={source} /> : <b>{initialsFor(name)}</b>}
    </span>
  );
}
