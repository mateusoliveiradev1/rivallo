import type { CSSProperties } from 'react';

import face01 from '../assets/player-faces/rv-01.webp';
import face02 from '../assets/player-faces/rv-02.webp';
import face03 from '../assets/player-faces/rv-03.webp';
import face04 from '../assets/player-faces/rv-04.webp';
import face05 from '../assets/player-faces/rv-05.webp';
import face06 from '../assets/player-faces/rv-06.webp';
import face07 from '../assets/player-faces/rv-07.webp';
import face08 from '../assets/player-faces/rv-08.webp';
import face09 from '../assets/player-faces/rv-09.webp';
import face10 from '../assets/player-faces/rv-10.webp';
import face11 from '../assets/player-faces/rv-11.webp';
import face12 from '../assets/player-faces/rv-12.webp';
import face13 from '../assets/player-faces/rv-13.webp';
import face14 from '../assets/player-faces/rv-14.webp';
import face15 from '../assets/player-faces/rv-15.webp';
import face16 from '../assets/player-faces/rv-16.webp';
import face17 from '../assets/player-faces/rv-17.webp';
import face18 from '../assets/player-faces/rv-18.webp';

const faceSources = [
  face01,
  face02,
  face03,
  face04,
  face05,
  face06,
  face07,
  face08,
  face09,
  face10,
  face11,
  face12,
  face13,
  face14,
  face15,
  face16,
  face17,
  face18,
] as const;

interface PlayerFaceProps {
  readonly index: number;
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
  index,
  name,
  className,
  size = 40,
  decorative = false,
}: PlayerFaceProps) {
  const source = faceSources.length > 0 ? faceSources[index % faceSources.length] : undefined;
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
