import { Icon } from '@rivallo/icons';
import { useState, type CSSProperties } from 'react';

import { Button } from '../ui/primitives/actions.js';
import { Status } from '../ui/primitives/feedback.js';
import {
  createCareerBackup,
  deleteCareer,
  loadCareerBackups,
  renameCareer,
  restoreCareerBackup,
} from './client.js';
import { MenuShell } from './MenuShell.js';
import type { CareerFailure, CareerSlot, CareerSlotSummary } from './types.js';

interface LoadCareerScreenProps {
  readonly slots: readonly CareerSlotSummary[];
  readonly openingId: string | null;
  readonly onBack: () => void;
  readonly onLoad: (careerId: string) => void;
  readonly onChanged: () => void;
  readonly onRestored: (slot: CareerSlot) => void;
}

export function LoadCareerScreen({
  slots,
  openingId,
  onBack,
  onLoad,
  onChanged,
  onRestored,
}: LoadCareerScreenProps) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<CareerFailure | null>(null);
  const [rename, setRename] = useState<{ careerId: string; value: string } | null>(null);
  const [remove, setRemove] = useState<{
    careerId: string;
    expected: string;
    value: string;
  } | null>(null);
  const [backups, setBackups] = useState<{ careerId: string; names: readonly string[] } | null>(
    null,
  );

  const run = async (key: string, action: () => Promise<void>) => {
    setBusy(key);
    setError(null);
    try {
      await action();
    } catch (reason) {
      setError(reason as CareerFailure);
    } finally {
      setBusy(null);
    }
  };

  return (
    <MenuShell
      description="Escolha um slot verificado, restaure um backup ou organize suas carreiras."
      onBack={onBack}
      title="Carregar carreira"
    >
      <section className="load-career-screen">
        {error && (
          <Status headingLevel={2} label="A operação não pôde ser concluída" variant="danger">
            <p>{error.message}</p>
            {error.details.length > 0 && <small>{error.details.join(' · ')}</small>}
          </Status>
        )}
        {slots.length === 0 ? (
          <Status headingLevel={2} label="Nenhuma carreira encontrada" variant="info">
            <p>Crie uma nova carreira para que ela apareça nesta lista.</p>
          </Status>
        ) : (
          <div className="career-slot-list">
            {slots.map((slot) => (
              <article className="career-slot-row" key={slot.careerId}>
                <div
                  aria-label={`Escudo de ${slot.clubName}`}
                  className="career-slot-row__crest"
                  style={{ '--career-club-color': slot.clubPrimaryColor } as CSSProperties}
                >
                  {slot.clubShortName}
                </div>
                <div className="career-slot-row__identity">
                  <span>{slot.displayName}</span>
                  <h2>{slot.clubName}</h2>
                  <p>
                    {slot.managerName} · {slot.currentDate} · {slot.baseName}
                  </p>
                </div>
                <div className="career-slot-row__health">
                  <span data-integrity={slot.integrity}>
                    {slot.integrity === 'valid' ? 'Integridade verificada' : 'Requer atenção'}
                  </span>
                  <small>
                    revisão {slot.saveRevision} · {slot.backupCount} backups
                  </small>
                </div>
                <Button
                  disabled={slot.integrity === 'corrupt'}
                  loading={openingId === slot.careerId}
                  loadingLabel="Carregando…"
                  onClick={() => onLoad(slot.careerId)}
                  variant="primary"
                >
                  Carregar
                </Button>
                <details className="career-slot-row__menu">
                  <summary aria-label={`Ações de ${slot.displayName}`}>
                    <Icon name="more-actions" size={20} />
                  </summary>
                  <div>
                    <button
                      onClick={() =>
                        setRename({ careerId: slot.careerId, value: slot.displayName })
                      }
                      type="button"
                    >
                      Renomear
                    </button>
                    <button
                      disabled={busy !== null}
                      onClick={() =>
                        void run(`backup:${slot.careerId}`, async () => {
                          await createCareerBackup(slot.careerId);
                          onChanged();
                        })
                      }
                      type="button"
                    >
                      Criar backup
                    </button>
                    <button
                      onClick={() =>
                        void run(`backups:${slot.careerId}`, async () => {
                          setBackups({
                            careerId: slot.careerId,
                            names: await loadCareerBackups(slot.careerId),
                          });
                        })
                      }
                      type="button"
                    >
                      Ver backups
                    </button>
                    <button
                      className="danger-action"
                      onClick={() =>
                        setRemove({
                          careerId: slot.careerId,
                          expected: slot.displayName,
                          value: '',
                        })
                      }
                      type="button"
                    >
                      Excluir
                    </button>
                  </div>
                </details>
              </article>
            ))}
          </div>
        )}
      </section>

      {rename && (
        <div className="career-action-overlay" role="presentation">
          <section
            aria-labelledby="rename-career-title"
            className="career-action-dialog"
            role="dialog"
          >
            <h2 id="rename-career-title">Renomear carreira</h2>
            <label>
              Nome do slot
              <input
                autoFocus
                maxLength={80}
                onChange={(event) => setRename({ ...rename, value: event.target.value })}
                value={rename.value}
              />
            </label>
            <div>
              <Button onClick={() => setRename(null)} variant="secondary">
                Cancelar
              </Button>
              <Button
                disabled={!rename.value.trim()}
                loading={busy === `rename:${rename.careerId}`}
                onClick={() =>
                  void run(`rename:${rename.careerId}`, async () => {
                    await renameCareer(rename.careerId, rename.value);
                    setRename(null);
                    onChanged();
                  })
                }
                variant="primary"
              >
                Renomear
              </Button>
            </div>
          </section>
        </div>
      )}

      {remove && (
        <div className="career-action-overlay" role="presentation">
          <section
            aria-labelledby="delete-career-title"
            className="career-action-dialog"
            role="alertdialog"
          >
            <h2 id="delete-career-title">Excluir carreira</h2>
            <p>
              Esta ação remove o slot e seus backups locais. Digite{' '}
              <strong>{remove.expected}</strong> para confirmar.
            </p>
            <input
              aria-label="Nome da carreira para confirmar exclusão"
              autoFocus
              onChange={(event) => setRemove({ ...remove, value: event.target.value })}
              value={remove.value}
            />
            <div>
              <Button onClick={() => setRemove(null)} variant="secondary">
                Cancelar
              </Button>
              <Button
                disabled={remove.value !== remove.expected}
                loading={busy === `delete:${remove.careerId}`}
                onClick={() =>
                  void run(`delete:${remove.careerId}`, async () => {
                    await deleteCareer(remove.careerId);
                    setRemove(null);
                    onChanged();
                  })
                }
                variant="destructive-proof"
              >
                Excluir carreira
              </Button>
            </div>
          </section>
        </div>
      )}

      {backups && (
        <div className="career-action-overlay" role="presentation">
          <section aria-labelledby="backups-title" className="career-action-dialog" role="dialog">
            <h2 id="backups-title">Backups disponíveis</h2>
            <p>Restaurar cria primeiro uma cópia do estado atual e nunca altera outro slot.</p>
            <ul className="backup-list">
              {backups.names.map((name) => (
                <li key={name}>
                  <code>{name}</code>
                  <Button
                    loading={busy === `restore:${name}`}
                    onClick={() =>
                      void run(`restore:${name}`, async () => {
                        const restored = await restoreCareerBackup(backups.careerId, name);
                        setBackups(null);
                        onRestored(restored);
                        onChanged();
                      })
                    }
                    variant="secondary"
                  >
                    Restaurar
                  </Button>
                </li>
              ))}
            </ul>
            <Button onClick={() => setBackups(null)} variant="secondary">
              Fechar
            </Button>
          </section>
        </div>
      )}
    </MenuShell>
  );
}
