import { useCallback, useEffect, useRef, useState } from 'react';

import { MatchdayScreen } from '../matchday/MatchdayScreen.js';
import { Button } from '../ui/primitives/actions.js';
import { Skeleton, Status } from '../ui/primitives/feedback.js';
import { exitApplication, loadCareer, loadCareerBoot } from './client.js';
import { LoadCareerScreen } from './LoadCareerScreen.js';
import { MainMenu } from './MainMenu.js';
import { MenuShell } from './MenuShell.js';
import { ModsScreen } from './ModsScreen.js';
import { NewCareerWizard } from './NewCareerWizard.js';
import { SettingsScreen } from './SettingsScreen.js';
import type { CareerBootData, CareerFailure, CareerSlot } from './types.js';
import './career.css';

type MenuRoute = 'menu' | 'new-career' | 'load-career' | 'mods' | 'settings' | 'career';

const routeFromPath = (pathname: string): MenuRoute => {
  if (pathname.startsWith('/new-career') || pathname.startsWith('/coach-creator'))
    return 'new-career';
  if (pathname.startsWith('/load-career')) return 'load-career';
  if (pathname.startsWith('/mods')) return 'mods';
  if (pathname.startsWith('/settings')) return 'settings';
  if (pathname.startsWith('/career/')) return 'career';
  return 'menu';
};

const isCareerProfilePath = (pathname: string) =>
  /^\/(?:players|coaches|clubs|nations)\//u.test(pathname);

interface CareerAppProps {
  readonly serviceOwnership: 'owned' | 'reused';
}

export function CareerApp({ serviceOwnership }: CareerAppProps) {
  const [route, setRoute] = useState<MenuRoute>(() => routeFromPath(window.location.pathname));
  const [boot, setBoot] = useState<CareerBootData | null>(null);
  const [bootStage, setBootStage] = useState<'catalog' | 'careers' | 'ready'>('catalog');
  const [bootError, setBootError] = useState<CareerFailure | null>(null);
  const [activeSlot, setActiveSlot] = useState<CareerSlot | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [safeExitRequest, setSafeExitRequest] = useState(0);
  const deepLinkAttempt = useRef<string | null>(null);

  const navigate = useCallback((nextRoute: MenuRoute, path: string) => {
    window.history.pushState({ rivalloRoute: nextRoute }, '', path);
    setRoute(nextRoute);
  }, []);

  const refreshBoot = useCallback(async () => {
    setBootError(null);
    try {
      const data = await loadCareerBoot((stage) => setBootStage(stage));
      setBoot(data);
      setBootStage('ready');
      return data;
    } catch (error) {
      setBootError(error as CareerFailure);
      return null;
    }
  }, []);

  useEffect(() => {
    void refreshBoot();
  }, [refreshBoot]);

  useEffect(() => {
    const onPopState = () =>
      setRoute(
        activeSlot && isCareerProfilePath(window.location.pathname)
          ? 'career'
          : routeFromPath(window.location.pathname),
      );
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [activeSlot]);

  useEffect(() => {
    const handleCloseRequest = (event: Event) => {
      if (!activeSlot) return;
      event.preventDefault();
      setSafeExitRequest((current) => current + 1);
    };
    window.addEventListener('rivallo:window-close-requested', handleCloseRequest);
    return () => window.removeEventListener('rivallo:window-close-requested', handleCloseRequest);
  }, [activeSlot]);

  const openCareer = async (careerId: string) => {
    if (openingId) return;
    setOpeningId(careerId);
    setBootError(null);
    try {
      const slot = await loadCareer(careerId);
      setActiveSlot(slot);
      navigate('career', `/career/${encodeURIComponent(slot.careerId)}`);
    } catch (error) {
      setBootError(error as CareerFailure);
    } finally {
      setOpeningId(null);
    }
  };

  useEffect(() => {
    if (!boot || activeSlot || openingId || route !== 'career') return;
    const prefix = '/career/';
    const careerId = decodeURIComponent(
      window.location.pathname.slice(prefix.length).split('/')[0] ?? '',
    );
    if (!careerId || deepLinkAttempt.current === careerId) return;
    deepLinkAttempt.current = careerId;
    void openCareer(careerId);
  }, [activeSlot, boot, openingId, route]);

  const returnToMenu = async () => {
    setActiveSlot(null);
    await refreshBoot();
    navigate('menu', '/main-menu');
  };

  if (activeSlot && route === 'career') {
    return (
      <MatchdayScreen
        career={activeSlot}
        exitRequestToken={safeExitRequest}
        onCareerSaved={setActiveSlot}
        onReturnToMenu={() => void returnToMenu()}
        serviceOwnership={serviceOwnership}
      />
    );
  }

  if (bootError && !boot) {
    return (
      <main className="career-boot-state">
        <Status headingLevel={2} label="O Menu Principal precisa de atenção" variant="danger">
          <p>{bootError.message}</p>
          {bootError.details.length > 0 && <small>{bootError.details.join(' · ')}</small>}
        </Status>
        <Button leadingIcon="retry" onClick={() => void refreshBoot()} variant="primary">
          Tentar novamente
        </Button>
      </main>
    );
  }

  if (bootError && boot && route === 'career' && !activeSlot) {
    return (
      <MenuShell title="A carreira não pôde ser aberta">
        <section className="load-career-screen">
          <Status headingLevel={2} label="O slot precisa de atenção" variant="danger">
            <p>{bootError.message}</p>
            {bootError.details.length > 0 && <small>{bootError.details.join(' · ')}</small>}
          </Status>
          <div className="career-recovery-actions">
            <Button onClick={() => navigate('menu', '/main-menu')} variant="secondary">
              Voltar ao Menu Principal
            </Button>
            <Button onClick={() => navigate('load-career', '/load-career')} variant="primary">
              Escolher outra carreira
            </Button>
          </div>
        </section>
      </MenuShell>
    );
  }

  if (!boot) {
    const label = bootStage === 'catalog' ? 'Carregando catálogo' : 'Verificando carreiras';
    return (
      <main className="career-boot-state" aria-label={label}>
        <div>
          <span>Rivallo</span>
          <h1>Inicializando</h1>
          <p>{label}…</p>
        </div>
        <Skeleton lines={4} />
      </main>
    );
  }

  if (route === 'new-career') {
    return (
      <NewCareerWizard
        catalog={boot.catalog}
        onCancel={() => navigate('menu', '/main-menu')}
        onCreated={(slot) => {
          setActiveSlot(slot);
          navigate('career', `/career/${encodeURIComponent(slot.careerId)}`);
        }}
      />
    );
  }

  if (route === 'load-career') {
    return (
      <LoadCareerScreen
        onBack={() => navigate('menu', '/main-menu')}
        onChanged={() => void refreshBoot()}
        onLoad={(careerId) => void openCareer(careerId)}
        onRestored={() => void refreshBoot()}
        openingId={openingId}
        slots={boot.slots}
      />
    );
  }

  if (route === 'mods') {
    return <ModsScreen catalog={boot.catalog} onBack={() => navigate('menu', '/main-menu')} />;
  }

  if (route === 'settings') {
    return <SettingsScreen onBack={() => navigate('menu', '/main-menu')} />;
  }

  return (
    <MainMenu
      lastCareer={boot.lastCareer}
      onContinue={(careerId) => void openCareer(careerId)}
      onDataEditor={() => {
        window.location.href = '/data-editor';
      }}
      onExit={() => void exitApplication()}
      onLoadCareer={() => navigate('load-career', '/load-career')}
      onMods={() => navigate('mods', '/mods')}
      onNewCareer={() => navigate('new-career', '/new-career')}
      onSettings={() => navigate('settings', '/settings')}
      opening={openingId !== null}
      slotCount={boot.slots.length}
    />
  );
}
