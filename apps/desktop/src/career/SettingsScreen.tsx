import { useEffect, useState } from 'react';

import { Button } from '../ui/primitives/actions.js';
import { exitApplication } from './client.js';
import { MenuShell } from './MenuShell.js';

interface SettingsScreenProps {
  readonly onBack: () => void;
}

const SETTINGS_KEY = 'rivallo.global-settings.v1';

interface GlobalSettings {
  readonly compactNavigation: boolean;
  readonly confirmDestructiveActions: boolean;
}

const readSettings = (): GlobalSettings => {
  try {
    return {
      compactNavigation: false,
      confirmDestructiveActions: true,
      ...(JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') as Partial<GlobalSettings>),
    };
  } catch {
    return { compactNavigation: false, confirmDestructiveActions: true };
  }
};

export function SettingsScreen({ onBack }: SettingsScreenProps) {
  const [settings, setSettings] = useState(readSettings);
  const [savedSettings, setSavedSettings] = useState(settings);
  const [saved, setSaved] = useState(false);
  const [pendingExit, setPendingExit] = useState<'back' | 'application' | null>(null);
  const dirty = JSON.stringify(settings) !== JSON.stringify(savedSettings);
  const save = (next: 'stay' | 'back' | 'application' = 'stay') => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    setSavedSettings(settings);
    setSaved(true);
    setPendingExit(null);
    if (next === 'back') onBack();
    if (next === 'application') void exitApplication();
  };

  useEffect(() => {
    if (!dirty) return;
    const protectWindowClose = (event: Event) => {
      event.preventDefault();
      setPendingExit('application');
    };
    const protectReload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('rivallo:window-close-requested', protectWindowClose);
    window.addEventListener('beforeunload', protectReload);
    return () => {
      window.removeEventListener('rivallo:window-close-requested', protectWindowClose);
      window.removeEventListener('beforeunload', protectReload);
    };
  }, [dirty]);

  const requestBack = () => {
    if (dirty) setPendingExit('back');
    else onBack();
  };

  const discardAndLeave = () => {
    const destination = pendingExit;
    setPendingExit(null);
    if (destination === 'back') onBack();
    if (destination === 'application') void exitApplication();
  };

  return (
    <>
      <MenuShell
        description="Preferências globais do aplicativo. A base ativa pertence a cada carreira."
        onBack={requestBack}
        title="Configurações"
      >
        <section className="settings-screen">
          <div>
            <h2>Interface</h2>
            <label className="settings-option">
              <span>
                <strong>Preferir navegação compacta</strong>
                <small>A carreira pode adaptar a sidebar em telas menores.</small>
              </span>
              <input
                checked={settings.compactNavigation}
                onChange={(event) =>
                  setSettings({ ...settings, compactNavigation: event.target.checked })
                }
                type="checkbox"
              />
            </label>
            <label className="settings-option">
              <span>
                <strong>Confirmar ações destrutivas</strong>
                <small>Exclusões e descartes sempre explicam seu impacto.</small>
              </span>
              <input
                checked={settings.confirmDestructiveActions}
                onChange={(event) =>
                  setSettings({ ...settings, confirmDestructiveActions: event.target.checked })
                }
                type="checkbox"
              />
            </label>
          </div>
          <div>
            <h2>Proteção de carreira</h2>
            <dl className="settings-facts">
              <div>
                <dt>Autosave</dt>
                <dd>Em pontos seguros e na saída</dd>
              </div>
              <div>
                <dt>Retenção</dt>
                <dd>5 backups rotativos + backup inicial</dd>
              </div>
              <div>
                <dt>Conteúdo</dt>
                <dd>Base, mods e fingerprint congelados por slot</dd>
              </div>
            </dl>
          </div>
          <footer>
            <span role="status">{saved ? 'Configurações salvas.' : ''}</span>
            <Button leadingIcon="save" onClick={() => save()} variant="primary">
              Salvar configurações
            </Button>
          </footer>
        </section>
      </MenuShell>
      {pendingExit && (
        <div className="career-action-overlay" role="presentation">
          <section
            aria-labelledby="settings-exit-title"
            aria-modal="true"
            className="career-action-dialog"
            role="dialog"
          >
            <h2 id="settings-exit-title">
              {pendingExit === 'application' ? 'Salvar antes de sair?' : 'Salvar configurações?'}
            </h2>
            <p>As preferências globais foram alteradas e ainda não estão persistidas.</p>
            <div>
              <Button onClick={() => setPendingExit(null)} variant="secondary">
                Cancelar
              </Button>
              <Button onClick={discardAndLeave} variant="destructive-proof">
                Descartar e {pendingExit === 'application' ? 'sair' : 'voltar'}
              </Button>
              <Button leadingIcon="save" onClick={() => save(pendingExit)} variant="primary">
                Salvar e {pendingExit === 'application' ? 'sair' : 'voltar'}
              </Button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
