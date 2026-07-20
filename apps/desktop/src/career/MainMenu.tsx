import { Icon } from '@rivallo/icons';
import type { CSSProperties } from 'react';

import { Button } from '../ui/primitives/actions.js';
import { Status } from '../ui/primitives/feedback.js';
import { CareerPortrait } from './CareerPortrait.js';
import { MenuShell } from './MenuShell.js';
import type { CareerSlotSummary } from './types.js';

interface MainMenuProps {
  readonly lastCareer: CareerSlotSummary | null;
  readonly slotCount: number;
  readonly opening: boolean;
  readonly onContinue: (careerId: string) => void;
  readonly onNewCareer: () => void;
  readonly onLoadCareer: () => void;
  readonly onMods: () => void;
  readonly onSettings: () => void;
  readonly onDataEditor: () => void;
  readonly onExit: () => void;
}

const formatMoment = (value: number) => {
  const moment = new Date(value);
  if (Number.isNaN(moment.getTime())) return 'Data indisponível';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(moment);
};

export function MainMenu({
  lastCareer,
  slotCount,
  opening,
  onContinue,
  onNewCareer,
  onLoadCareer,
  onMods,
  onSettings,
  onDataEditor,
  onExit,
}: MainMenuProps) {
  return (
    <MenuShell
      actions={
        <>
          <button onClick={onSettings} type="button">
            <Icon name="settings" size={16} /> Configurações
          </button>
          <button onClick={onExit} type="button">
            Sair
          </button>
        </>
      }
    >
      <div className="main-menu">
        <section className="main-menu__story" aria-labelledby="main-menu-title">
          <div className="main-menu__atmosphere" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
          <div className="main-menu__intro">
            <p>Sala de comando</p>
            <h1 id="main-menu-title">
              {lastCareer ? 'Sua carreira espera por você.' : 'Comece uma história no futebol.'}
            </h1>
            <span>
              Decisões claras, dados sob controle e uma base congelada para proteger cada capítulo.
            </span>
          </div>

          {lastCareer ? (
            <div className="continue-career">
              <div className="continue-career__visual">
                <CareerPortrait
                  careerId={lastCareer.careerId}
                  className="career-portrait career-portrait--large"
                  fallback={<span>{lastCareer.managerName.slice(0, 2).toUpperCase()}</span>}
                  managerName={lastCareer.managerName}
                />
                <div
                  aria-label={`Escudo de ${lastCareer.clubName}`}
                  className="continue-career__crest"
                  style={{ '--career-club-color': lastCareer.clubPrimaryColor } as CSSProperties}
                >
                  {lastCareer.clubShortName}
                </div>
              </div>
              <div className="continue-career__identity">
                <span>
                  {lastCareer.integrity === 'valid'
                    ? 'Última carreira válida'
                    : 'Última carreira requer atenção'}
                </span>
                <h2>{lastCareer.clubName}</h2>
                <p>
                  {lastCareer.managerName} · {lastCareer.currentDate}
                </p>
                <dl>
                  <div>
                    <dt>Base</dt>
                    <dd>
                      {lastCareer.baseName} {lastCareer.basePackageVersion}
                    </dd>
                  </div>
                  <div>
                    <dt>Integridade</dt>
                    <dd data-integrity={lastCareer.integrity}>
                      {lastCareer.integrity === 'valid' ? 'Verificada' : 'Requer atenção'}
                    </dd>
                  </div>
                  <div>
                    <dt>Última sessão</dt>
                    <dd>{formatMoment(lastCareer.lastPlayedAt)}</dd>
                  </div>
                </dl>
              </div>
              <Button
                className="continue-career__action"
                disabled={lastCareer.integrity !== 'valid'}
                leadingIcon="next"
                loading={opening}
                loadingLabel="Abrindo carreira…"
                onClick={() => onContinue(lastCareer.careerId)}
                variant="primary"
              >
                Continuar carreira
              </Button>
            </div>
          ) : (
            <div className="continue-career continue-career--empty">
              <Status headingLevel={2} label="Seu primeiro capítulo começa aqui" variant="info">
                <p>Escolha uma base, um clube e o treinador que vai conduzir o projeto.</p>
              </Status>
              <Button leadingIcon="next" onClick={onNewCareer} variant="primary">
                Nova carreira
              </Button>
            </div>
          )}
        </section>

        <nav aria-label="Ações do Menu Principal" className="main-menu__actions">
          {lastCareer && (
            <button
              className="main-menu-action main-menu-action--new"
              onClick={onNewCareer}
              type="button"
            >
              <Icon name="add" size={24} />
              <span>
                <strong>Nova carreira</strong>
                <small>Escolha outra base, clube ou treinador.</small>
              </span>
              <Icon name="next" size={20} />
            </button>
          )}
          <button className="main-menu-action" onClick={onLoadCareer} type="button">
            <Icon name="save" size={24} />
            <span>
              <strong>Carregar carreira</strong>
              <small>
                {slotCount === 1 ? '1 slot disponível' : `${slotCount} slots disponíveis`}
              </small>
            </span>
            <Icon name="next" size={20} />
          </button>
          <button className="main-menu-action" onClick={onMods} type="button">
            <Icon name="workspace" size={24} />
            <span>
              <strong>Bases e mods</strong>
              <small>Consulte o catálogo instalado e sua compatibilidade.</small>
            </span>
            <Icon name="next" size={20} />
          </button>
          <button className="main-menu-action" onClick={onDataEditor} type="button">
            <Icon name="edit" size={24} />
            <span>
              <strong>Editor de Dados</strong>
              <small>Valide e exporte pacotes locais sem ativá-los.</small>
            </span>
            <Icon name="next" size={20} />
          </button>
        </nav>
      </div>
    </MenuShell>
  );
}
