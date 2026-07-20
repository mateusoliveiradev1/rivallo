import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { loadCareerPortrait } from './client.js';

interface CareerPortraitProps {
  readonly careerId: string;
  readonly className: string;
  readonly managerName: string;
  readonly fallback: ReactNode;
}

interface ActiveCareerPortrait {
  readonly managerId: string;
  readonly source: string | null;
}

const ActiveCareerPortraitContext = createContext<ActiveCareerPortrait | null>(null);

const usePortraitSource = (careerId: string) => {
  const [source, setSource] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    setSource(null);
    void loadCareerPortrait(careerId)
      .then((portrait) => {
        if (!active || !portrait || typeof URL.createObjectURL !== 'function') return;
        objectUrl = URL.createObjectURL(
          new Blob([new Uint8Array(portrait.bytes)], { type: portrait.mimeType }),
        );
        setSource(objectUrl);
      })
      .catch(() => {
        // A carreira permanece utilizável; a UI usa o fallback canônico do treinador.
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [careerId]);

  return source;
};

export function CareerPortraitProvider({
  careerId,
  managerId,
  children,
}: {
  readonly careerId: string;
  readonly managerId: string;
  readonly children: ReactNode;
}) {
  const source = usePortraitSource(careerId);
  const value = useMemo(() => ({ managerId, source }), [managerId, source]);
  return (
    <ActiveCareerPortraitContext.Provider value={value}>
      {children}
    </ActiveCareerPortraitContext.Provider>
  );
}

export const useActiveCoachPortrait = (entityId: string) => {
  const portrait = useContext(ActiveCareerPortraitContext);
  return portrait?.managerId === entityId ? portrait.source : null;
};

export function CareerPortrait({
  careerId,
  className,
  managerName,
  fallback,
}: CareerPortraitProps) {
  const source = usePortraitSource(careerId);
  return (
    <div aria-label={`Retrato de ${managerName}`} className={className} role="img">
      {source ? <img alt="" src={source} /> : fallback}
    </div>
  );
}
