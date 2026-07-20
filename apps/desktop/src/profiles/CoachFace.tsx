import type { CSSProperties } from 'react';

import helenaSampaio from '../assets/coach-faces/helena-sampaio.webp';
import raulMendonza from '../assets/coach-faces/raul-mendonza.webp';

interface CoachFaceProps {
  readonly name: string;
  readonly className?: string;
  readonly size?: number;
  readonly decorative?: boolean;
}

const portraitFor = (name: string) =>
  name.toLocaleLowerCase('pt-BR').includes('helena') ? helenaSampaio : raulMendonza;

export function CoachFace({ name, className, size = 40, decorative = false }: CoachFaceProps) {
  const style = { '--player-face-size': `${size}px` } as CSSProperties;
  return (
    <span
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : `Retrato de ${name}`}
      className={['player-face', 'coach-face', className].filter(Boolean).join(' ')}
      role={decorative ? undefined : 'img'}
      style={style}
    >
      <img alt="" draggable={false} src={portraitFor(name)} />
    </span>
  );
}
