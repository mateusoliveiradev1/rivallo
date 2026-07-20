import { Icon } from '@rivallo/icons';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';

import type { DataPackageCatalogEntry } from '../data-editor/types.js';
import { renderPortraitUpload } from '../portrait/PortraitEngine.js';
import { Button } from '../ui/primitives/actions.js';
import { Skeleton, Status } from '../ui/primitives/feedback.js';
import { CoachCreator, defaultCoachDraft, isCoachDraftReady } from './CoachCreator.js';
import {
  createCareer,
  operationId,
  previewCareerComposition,
  previewClubReadiness,
} from './client.js';
import { MenuShell } from './MenuShell.js';
import type {
  AssistanceProfile,
  CareerFailure,
  CareerSlot,
  ClubReadinessProjection,
  CoachCreationEvaluation,
  CoachCreatorDraft,
  ResolvedWorldDatabase,
  WorldCoach,
} from './types.js';

const steps = [
  'Base e mods',
  'Configuração do mundo',
  'Escolha do clube',
  'Treinador',
  'Experiência',
  'Revisão',
  'Criação',
] as const;

interface NewCareerWizardProps {
  readonly catalog: readonly DataPackageCatalogEntry[];
  readonly onCancel: () => void;
  readonly onCreated: (slot: CareerSlot) => void;
  readonly onExit: () => void;
}

const assistanceCopy: Record<
  AssistanceProfile,
  { readonly label: string; readonly description: string }
> = {
  guided: {
    label: 'Guiada',
    description: 'Mais explicações, confirmações e recomendações de interface.',
  },
  balanced: {
    label: 'Equilibrada',
    description: 'Contexto quando necessário, com decisões diretas no restante do fluxo.',
  },
  fullControl: {
    label: 'Controle total',
    description: 'Menos orientação e maior densidade de informação disponível.',
  },
};

export function NewCareerWizard({ catalog, onCancel, onCreated, onExit }: NewCareerWizardProps) {
  const bases = catalog.filter(
    (entry) => entry.manifest.contentType === 'base' && entry.manifest.visibility === 'public',
  );
  const mods = catalog.filter(
    (entry) => entry.manifest.contentType === 'mod' && entry.manifest.visibility === 'public',
  );
  const defaultBase =
    bases.find((entry) => entry.manifest.packageId === 'official.rivallo.foundation') ?? bases[0];
  const [step, setStep] = useState(0);
  const [selectedBaseId, setSelectedBaseId] = useState(defaultBase?.manifest.packageId ?? '');
  const [selectedMods, setSelectedMods] = useState<string[]>([]);
  const [composition, setComposition] = useState<ResolvedWorldDatabase | null>(null);
  const [compositionBusy, setCompositionBusy] = useState(false);
  const [compositionError, setCompositionError] = useState<CareerFailure | null>(null);
  const [readiness, setReadiness] = useState<readonly ClubReadinessProjection[]>([]);
  const [displayName, setDisplayName] = useState('Minha carreira');
  const [seasonRef, setSeasonRef] = useState('');
  const [clubId, setClubId] = useState('');
  const [clubSearch, setClubSearch] = useState('');
  const [clubStatusFilter, setClubStatusFilter] = useState<'all' | 'available' | 'blocked'>('all');
  const [coachMode, setCoachMode] = useState<'existing' | 'created'>('existing');
  const [existingCoachId, setExistingCoachId] = useState('');
  const [coachDraft, setCoachDraft] = useState<CoachCreatorDraft>(() => defaultCoachDraft());
  const [coachEvaluation, setCoachEvaluation] = useState<CoachCreationEvaluation | null>(null);
  const [assistance, setAssistance] = useState<AssistanceProfile>('balanced');
  const [creating, setCreating] = useState(false);
  const [creationError, setCreationError] = useState<CareerFailure | null>(null);
  const [cancelIntent, setCancelIntent] = useState<'menu' | 'exit' | null>(null);
  const compositionOperation = useRef(0);
  const creationOperationId = useRef(operationId('career-create'));

  useEffect(() => {
    const stored = window.sessionStorage.getItem('rivallo:new-career-return');
    if (!stored) return;
    window.sessionStorage.removeItem('rivallo:new-career-return');
    try {
      const value = JSON.parse(stored) as {
        selectedBaseId?: string;
        selectedMods?: string[];
        seasonRef?: string;
        clubId?: string;
      };
      if (value.selectedBaseId) setSelectedBaseId(value.selectedBaseId);
      if (Array.isArray(value.selectedMods)) setSelectedMods(value.selectedMods);
      if (value.seasonRef) setSeasonRef(value.seasonRef);
      if (value.clubId) setClubId(value.clubId);
      setStep(2);
    } catch {
      // A sessão inválida é descartada; o wizard continua com defaults seguros.
    }
  }, []);

  const selectedPackageIds = useMemo(
    () => [selectedBaseId, ...selectedMods].filter(Boolean),
    [selectedBaseId, selectedMods],
  );

  useEffect(() => {
    if (!selectedBaseId) {
      setComposition(null);
      return;
    }
    const operation = ++compositionOperation.current;
    setCompositionBusy(true);
    setCompositionError(null);
    const timer = window.setTimeout(() => {
      void previewCareerComposition(selectedPackageIds)
        .then((resolved) => {
          if (operation !== compositionOperation.current) return;
          setComposition(resolved);
          const seasons = resolved.world.competitions.flatMap((competition) => competition.seasons);
          setSeasonRef((current) =>
            seasons.some((season) => season.id === current) ? current : (seasons[0]?.id ?? ''),
          );
          const nation = resolved.world.nations[0]?.name;
          if (nation) {
            setCoachDraft((current) =>
              current.nationality ? current : { ...current, nationality: nation },
            );
          }
        })
        .catch((error: CareerFailure) => {
          if (operation !== compositionOperation.current) return;
          setComposition(null);
          setCompositionError(error);
        })
        .finally(() => {
          if (operation === compositionOperation.current) setCompositionBusy(false);
        });
    }, 160);
    return () => {
      window.clearTimeout(timer);
      compositionOperation.current += 1;
    };
  }, [selectedBaseId, selectedPackageIds]);

  useEffect(() => {
    const protectWindowClose = (event: Event) => {
      event.preventDefault();
      setCancelIntent('exit');
    };
    window.addEventListener('rivallo:window-close-requested', protectWindowClose);
    return () => window.removeEventListener('rivallo:window-close-requested', protectWindowClose);
  }, []);

  const season = composition?.world.competitions
    .flatMap((competition) => competition.seasons)
    .find((candidate) => candidate.id === seasonRef);
  useEffect(() => {
    if (!seasonRef || selectedPackageIds.length === 0) {
      setReadiness([]);
      return;
    }
    let active = true;
    void previewClubReadiness(selectedPackageIds, seasonRef)
      .then((value) => {
        if (active) setReadiness(value);
      })
      .catch(() => {
        if (active) setReadiness([]);
      });
    return () => {
      active = false;
    };
  }, [seasonRef, selectedPackageIds]);
  const clubOptions = useMemo(
    () =>
      (composition?.world.clubs ?? []).map((club) => {
        const playerCount =
          composition?.world.profiles.players.filter((player) => player.identity.clubId === club.id)
            .length ?? 0;
        const coach = composition?.world.profiles.coaches.find(
          (candidate) => candidate.identity.clubId === club.id,
        );
        const projection = readiness.find((candidate) => candidate.clubId === club.id);
        const available = Boolean(projection && projection.status !== 'blocked');
        const reasons =
          projection?.requirements.filter(
            (requirement) => requirement.blocking && !requirement.satisfied,
          ) ?? [];
        return { club, playerCount, coach, available, reasons, projection };
      }),
    [composition, readiness],
  );
  const selectedClub = clubOptions.find((option) => option.club.id === clubId);
  const visibleClubs = clubOptions.filter((option) => {
    const matchesSearch = `${option.club.name} ${option.club.city}`
      .toLocaleLowerCase('pt-BR')
      .includes(clubSearch.trim().toLocaleLowerCase('pt-BR'));
    const matchesStatus =
      clubStatusFilter === 'all' ||
      (clubStatusFilter === 'available' ? option.available : !option.available);
    return matchesSearch && matchesStatus;
  });
  const currentCoach = selectedClub?.coach ?? null;

  useEffect(() => {
    if (currentCoach && !existingCoachId) setExistingCoachId(currentCoach.identity.entityId);
  }, [currentCoach, existingCoachId]);

  const selectedBase = bases.find((entry) => entry.manifest.packageId === selectedBaseId);
  const currentDate = season?.startDate ?? '';
  const coachValid =
    coachMode === 'existing'
      ? Boolean(existingCoachId)
      : isCoachDraftReady(coachDraft, coachEvaluation);
  const validations = [
    Boolean(composition?.validation.valid && selectedBaseId),
    Boolean(displayName.trim() && seasonRef && currentDate),
    Boolean(selectedClub?.available),
    coachValid,
    Boolean(assistance),
    true,
    false,
  ];
  const canAdvance = validations[step] ?? false;

  const toggleMod = (entry: DataPackageCatalogEntry) => {
    const id = entry.manifest.packageId;
    setSelectedMods((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const addDependencies = (entry: DataPackageCatalogEntry) => {
    const required = (entry.manifest.dependencies ?? [])
      .filter((dependency) => !dependency.optional && dependency.packageId !== selectedBaseId)
      .map((dependency) => dependency.packageId)
      .filter((id) => mods.some((mod) => mod.manifest.packageId === id));
    setSelectedMods((current) => [...new Set([...current, ...required, entry.manifest.packageId])]);
  };

  const create = async () => {
    if (!composition || !selectedClub || !season || !coachValid) return;
    setCreating(true);
    setCreationError(null);
    setStep(6);
    try {
      const createdCoachDraft =
        coachMode === 'created' && !coachDraft.portrait
          ? { ...coachDraft, portrait: await renderPortraitUpload(coachDraft.appearance) }
          : coachDraft;
      const slot = await createCareer({
        displayName: displayName.trim(),
        selectedPackageIds,
        clubId: selectedClub.club.id,
        seasonRef: season.id,
        currentDate: season.startDate,
        assistance,
        coach:
          coachMode === 'existing'
            ? { mode: 'existing', coachId: existingCoachId }
            : { mode: 'created', draft: createdCoachDraft },
        operationId: creationOperationId.current,
      });
      onCreated(slot);
    } catch (error) {
      const failure = error as Partial<CareerFailure>;
      setCreationError({
        code: typeof failure.code === 'string' ? failure.code : 'career.unexpected_failure',
        message:
          typeof failure.message === 'string'
            ? failure.message
            : 'Não foi possível criar a carreira agora.',
        details: Array.isArray(failure.details)
          ? failure.details.filter((item): item is string => typeof item === 'string')
          : [],
      });
      setCreating(false);
    }
  };

  return (
    <MenuShell
      description="A carreira só é gravada depois da revisão final. Você pode voltar sem perder este draft durante a sessão."
      onBack={() => setCancelIntent('menu')}
      title="Nova carreira"
    >
      <div className="career-wizard">
        <nav aria-label="Progresso da Nova Carreira" className="career-wizard__stepper">
          {steps.map((label, index) => (
            <button
              aria-current={index === step ? 'step' : undefined}
              data-complete={index < step || undefined}
              disabled={index > step || creating}
              key={label}
              onClick={() => setStep(index)}
              type="button"
            >
              <span>{index < step ? <Icon name="check" size={16} /> : index + 1}</span>
              <strong>{label}</strong>
            </button>
          ))}
        </nav>

        <section className="career-wizard__content">
          {step === 0 && (
            <BaseAndModsStep
              bases={bases}
              composition={composition}
              compositionBusy={compositionBusy}
              compositionError={compositionError}
              mods={mods}
              onAddDependencies={addDependencies}
              onBaseChange={(id) => {
                setSelectedBaseId(id);
                setSelectedMods([]);
                setClubId('');
              }}
              onToggleMod={toggleMod}
              selectedBaseId={selectedBaseId}
              selectedMods={selectedMods}
            />
          )}

          {step === 1 && (
            <section aria-labelledby="world-step-title" className="wizard-stage">
              <header>
                <span>Configuração do mundo</span>
                <h2 id="world-step-title">Defina o ponto de partida</h2>
                <p>Somente opções realmente presentes na base são exibidas.</p>
              </header>
              <div className="wizard-form-grid">
                <label>
                  Nome da carreira
                  <input
                    autoFocus
                    maxLength={80}
                    onChange={(event) => setDisplayName(event.target.value)}
                    value={displayName}
                  />
                </label>
                <label>
                  Definição de início
                  <select onChange={(event) => setSeasonRef(event.target.value)} value={seasonRef}>
                    {composition?.world.competitions.flatMap((competition) =>
                      competition.seasons.map((item) => (
                        <option key={item.id} value={item.id}>
                          {competition.name} · {item.label}
                        </option>
                      )),
                    )}
                  </select>
                </label>
                <div className="world-start-summary">
                  <span>Data inicial</span>
                  <strong>{season?.startDate ?? 'Indisponível'}</strong>
                  <small>
                    A 06.6 registra esta referência; calendário, rodadas e classificação continuam
                    aguardando a 06.7.
                  </small>
                </div>
              </div>
            </section>
          )}

          {step === 2 && (
            <section aria-labelledby="club-step-title" className="wizard-stage wizard-stage--clubs">
              <header>
                <span>Escolha do clube</span>
                <h2 id="club-step-title">Onde sua história começa?</h2>
                <p>Clubes e disponibilidade vêm do snapshot candidato, sem listas hardcoded.</p>
              </header>
              <div className="club-browser">
                <div className="club-browser__toolbar">
                  <label>
                    <Icon name="search" size={16} />
                    <span className="sr-only">Buscar clube</span>
                    <input
                      onChange={(event) => setClubSearch(event.target.value)}
                      placeholder="Buscar por nome ou cidade"
                      type="search"
                      value={clubSearch}
                    />
                  </label>
                  <label>
                    Status
                    <select
                      onChange={(event) =>
                        setClubStatusFilter(event.target.value as typeof clubStatusFilter)
                      }
                      value={clubStatusFilter}
                    >
                      <option value="all">Todos</option>
                      <option value="available">Disponíveis</option>
                      <option value="blocked">Bloqueados</option>
                    </select>
                  </label>
                </div>
                <div className="club-browser__list" role="listbox" aria-label="Clubes da base">
                  {visibleClubs.map((option) => (
                    <button
                      aria-selected={clubId === option.club.id}
                      className="club-option"
                      key={option.club.id}
                      onClick={() => {
                        setClubId(option.club.id);
                        setExistingCoachId(option.coach?.identity.entityId ?? '');
                      }}
                      role="option"
                      type="button"
                    >
                      <span
                        className="club-option__crest"
                        style={{ '--career-club-color': option.club.primaryColor } as CSSProperties}
                      >
                        {option.club.shortName}
                      </span>
                      <span>
                        <strong>{option.club.name}</strong>
                        <small>
                          {option.club.city} ·{' '}
                          {option.club.competitionName ?? 'Competição declarada'}
                        </small>
                      </span>
                      <em data-available={option.available || undefined}>
                        {option.available ? 'Disponível' : 'Bloqueado'}
                      </em>
                    </button>
                  ))}
                </div>
                <aside className="club-preview">
                  {selectedClub ? (
                    <>
                      <div>
                        <span
                          className="club-preview__crest"
                          style={
                            {
                              '--career-club-color': selectedClub.club.primaryColor,
                            } as CSSProperties
                          }
                        >
                          {selectedClub.club.shortName}
                        </span>
                        <div>
                          <h3>{selectedClub.club.name}</h3>
                          <p>{selectedClub.club.city}</p>
                        </div>
                      </div>
                      <dl>
                        <div>
                          <dt>Jogadores</dt>
                          <dd>{selectedClub.playerCount}</dd>
                        </div>
                        <div>
                          <dt>Treinador atual</dt>
                          <dd>{selectedClub.coach?.identity.knownName ?? 'Ausente'}</dd>
                        </div>
                        <div>
                          <dt>Base de origem</dt>
                          <dd>{selectedBase?.manifest.name}</dd>
                        </div>
                      </dl>
                      <section className="club-preview__history">
                        <h4>Sobre o clube</h4>
                        <p>
                          {selectedClub.club.historySummary?.trim() ||
                            'História não informada nesta base.'}
                        </p>
                        {selectedClub.club.historySummary &&
                          selectedClub.club.historySummary.length > 220 && (
                            <details>
                              <summary>Ler mais</summary>
                              <p>{selectedClub.club.historySummary}</p>
                            </details>
                          )}
                      </section>
                      {!selectedClub.available && (
                        <Status headingLevel={3} label="Clube indisponível" variant="warning">
                          <p>{selectedClub.reasons.length} requisitos pendentes:</p>
                          <ul className="club-readiness-list">
                            {selectedClub.reasons.map((reason) => (
                              <li key={reason.code}>
                                <strong>{reason.label}</strong>
                                <span>
                                  {reason.current !== null && reason.required !== null
                                    ? `${reason.current} de ${reason.required} · `
                                    : ''}
                                  {reason.suggestion}
                                </span>
                              </li>
                            ))}
                          </ul>
                          <Button
                            onClick={() => {
                              window.sessionStorage.setItem(
                                'rivallo:new-career-return',
                                JSON.stringify({
                                  selectedBaseId,
                                  selectedMods,
                                  seasonRef,
                                  clubId: selectedClub.club.id,
                                }),
                              );
                              const module = selectedClub.reasons[0]?.editorModule ?? 'clubs';
                              window.location.href = `/data-editor?module=${module}&entity=${encodeURIComponent(selectedClub.club.id)}&return=new-career`;
                            }}
                            variant="secondary"
                          >
                            Corrigir no Editor
                          </Button>
                        </Status>
                      )}
                      <p className="honest-state">
                        Classificação, próximos jogos, orçamento e objetivos ainda não estão
                        disponíveis nesta fase.
                      </p>
                    </>
                  ) : (
                    <Status headingLevel={3} label="Selecione um clube" variant="info">
                      <p>O preview mostra somente dados presentes na base.</p>
                    </Status>
                  )}
                </aside>
              </div>
            </section>
          )}

          {step === 3 && (
            <section
              aria-labelledby="coach-step-title"
              className="wizard-stage wizard-stage--coach"
            >
              <header>
                <span>Treinador</span>
                <h2 id="coach-step-title">Escolha quem assume o projeto</h2>
                <p>O treinador anterior é preservado no snapshot se você criar um novo.</p>
              </header>
              <div className="coach-mode" role="radiogroup" aria-label="Modo de treinador">
                <button
                  aria-checked={coachMode === 'existing'}
                  disabled={!currentCoach}
                  onClick={() => setCoachMode('existing')}
                  role="radio"
                  type="button"
                >
                  <Icon name="staff" size={24} />
                  <span>
                    <strong>Usar treinador atual</strong>
                    <small>Continua com a entidade já vinculada ao clube.</small>
                  </span>
                </button>
                <button
                  aria-checked={coachMode === 'created'}
                  onClick={() => setCoachMode('created')}
                  role="radio"
                  type="button"
                >
                  <Icon name="add" size={24} />
                  <span>
                    <strong>Criar novo treinador</strong>
                    <small>Cria uma entidade exclusiva e estável dentro do save.</small>
                  </span>
                </button>
              </div>
              {coachMode === 'existing' && currentCoach ? (
                <ExistingCoachPreview coach={currentCoach} />
              ) : (
                <CoachCreator
                  draft={coachDraft}
                  nations={composition?.world.nations ?? []}
                  onChange={setCoachDraft}
                  onEvaluation={setCoachEvaluation}
                />
              )}
            </section>
          )}

          {step === 4 && (
            <section aria-labelledby="experience-step-title" className="wizard-stage">
              <header>
                <span>Preferências da experiência</span>
                <h2 id="experience-step-title">Quanto contexto você quer receber?</h2>
                <p>
                  Este ajuste muda assistência e apresentação; não concede bônus ou penalidades.
                </p>
              </header>
              <div
                className="assistance-options"
                role="radiogroup"
                aria-label="Perfil de assistência"
              >
                {(
                  Object.entries(assistanceCopy) as [
                    AssistanceProfile,
                    (typeof assistanceCopy)[AssistanceProfile],
                  ][]
                ).map(([value, option]) => (
                  <button
                    aria-checked={assistance === value}
                    key={value}
                    onClick={() => setAssistance(value)}
                    role="radio"
                    type="button"
                  >
                    <span>
                      <strong>{option.label}</strong>
                      <small>{option.description}</small>
                    </span>
                    {assistance === value && <Icon name="check" size={20} />}
                  </button>
                ))}
              </div>
            </section>
          )}

          {step === 5 && (
            <ReviewStep
              assistance={assistance}
              club={selectedClub}
              coachDraft={coachDraft}
              coachEvaluation={coachEvaluation}
              coachMode={coachMode}
              composition={composition}
              displayName={displayName}
              existingCoach={currentCoach}
              seasonLabel={season?.label ?? seasonRef}
            />
          )}

          {step === 6 && (
            <section aria-labelledby="creation-step-title" className="wizard-stage creation-stage">
              <header>
                <span>Criação atômica</span>
                <h2 id="creation-step-title">
                  {creating ? 'Preparando sua carreira…' : 'A criação precisa de atenção'}
                </h2>
              </header>
              {creating ? (
                <>
                  <Skeleton lines={5} />
                  <ol>
                    <li>Revalidando pacotes, versões e hashes</li>
                    <li>Congelando a assinatura dos dados</li>
                    <li>Criando treinador, slot e backup inicial</li>
                    <li>Abrindo a carreira somente após o commit</li>
                  </ol>
                </>
              ) : creationError ? (
                <Status headingLevel={3} label="A carreira não foi criada" variant="danger">
                  <p>{creationError.message}</p>
                  {creationError.details.length > 0 && (
                    <small>{creationError.details.join(' · ')}</small>
                  )}
                  <Button onClick={() => void create()} variant="primary">
                    Tentar novamente
                  </Button>
                  <Button onClick={() => setStep(5)} variant="secondary">
                    Voltar à revisão
                  </Button>
                </Status>
              ) : null}
            </section>
          )}
        </section>

        <footer className="career-wizard__footer">
          <Button
            disabled={step === 0 || creating}
            onClick={() => setStep((current) => current - 1)}
            variant="secondary"
          >
            Voltar
          </Button>
          <span>
            Etapa {step + 1} de {steps.length} · {steps[step]}
          </span>
          {step < 5 ? (
            <Button
              disabled={!canAdvance || compositionBusy}
              onClick={() => setStep((current) => current + 1)}
              variant="primary"
            >
              Avançar
            </Button>
          ) : step === 5 ? (
            <Button
              disabled={!validations.slice(0, 5).every(Boolean)}
              onClick={() => void create()}
              variant="primary"
            >
              Criar carreira
            </Button>
          ) : (
            <span />
          )}
        </footer>
      </div>

      {cancelIntent && (
        <div className="career-action-overlay" role="presentation">
          <section
            aria-labelledby="cancel-wizard-title"
            className="career-action-dialog"
            role="alertdialog"
          >
            <h2 id="cancel-wizard-title">
              {creating
                ? 'A carreira ainda está sendo criada'
                : cancelIntent === 'exit'
                  ? 'Sair do Rivallo?'
                  : 'Cancelar Nova Carreira?'}
            </h2>
            <p>
              {creating
                ? 'Aguarde a gravação segura terminar. O aplicativo não será fechado no meio da operação.'
                : cancelIntent === 'exit'
                  ? 'As escolhas desta Nova Carreira ainda não foram gravadas. Ao sair, este rascunho será descartado.'
                  : 'As escolhas desta sessão serão descartadas. Nenhuma carreira ou treinador foi criado ainda.'}
            </p>
            <div>
              <Button onClick={() => setCancelIntent(null)} variant="secondary">
                {creating ? 'Continuar aguardando' : 'Continuar configurando'}
              </Button>
              {!creating && (
                <Button
                  onClick={cancelIntent === 'exit' ? onExit : onCancel}
                  variant="destructive-proof"
                >
                  {cancelIntent === 'exit' ? 'Descartar e sair' : 'Descartar e voltar'}
                </Button>
              )}
            </div>
          </section>
        </div>
      )}
    </MenuShell>
  );
}

interface BaseAndModsStepProps {
  readonly bases: readonly DataPackageCatalogEntry[];
  readonly mods: readonly DataPackageCatalogEntry[];
  readonly selectedBaseId: string;
  readonly selectedMods: readonly string[];
  readonly composition: ResolvedWorldDatabase | null;
  readonly compositionBusy: boolean;
  readonly compositionError: CareerFailure | null;
  readonly onBaseChange: (id: string) => void;
  readonly onToggleMod: (entry: DataPackageCatalogEntry) => void;
  readonly onAddDependencies: (entry: DataPackageCatalogEntry) => void;
}

function BaseAndModsStep({
  bases,
  mods,
  selectedBaseId,
  selectedMods,
  composition,
  compositionBusy,
  compositionError,
  onBaseChange,
  onToggleMod,
  onAddDependencies,
}: BaseAndModsStepProps) {
  return (
    <section aria-labelledby="packages-step-title" className="wizard-stage wizard-stage--packages">
      <header>
        <span>Base e mods</span>
        <h2 id="packages-step-title">Escolha os dados desta carreira</h2>
        <p>Exatamente uma base é necessária. Mods só entram neste novo snapshot.</p>
      </header>
      <div className="package-selector">
        <section>
          <h3>Base principal</h3>
          <div className="base-options" role="radiogroup" aria-label="Base principal">
            {bases.map((entry) => {
              const blocked = !entry.validation.valid;
              return (
                <button
                  aria-checked={selectedBaseId === entry.manifest.packageId}
                  disabled={blocked}
                  key={entry.manifest.packageId}
                  onClick={() => onBaseChange(entry.manifest.packageId)}
                  role="radio"
                  type="button"
                >
                  <span>
                    <strong>{entry.manifest.name}</strong>
                    <small>{entry.manifest.description}</small>
                  </span>
                  <dl>
                    <div>
                      <dt>Versão</dt>
                      <dd>{entry.manifest.version}</dd>
                    </div>
                    <div>
                      <dt>Schema</dt>
                      <dd>{entry.manifest.schemaVersion}</dd>
                    </div>
                    <div>
                      <dt>Status</dt>
                      <dd>{blocked ? 'Bloqueada' : 'Pronta'}</dd>
                    </div>
                  </dl>
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <h3>Mods compatíveis</h3>
          {mods.length === 0 ? (
            <div className="mods-empty mods-empty--wizard">
              <Icon name="workspace" size={24} />
              <div>
                <strong>Nenhum mod instalado</strong>
                <p>A base oficial funciona sem mods adicionais.</p>
              </div>
            </div>
          ) : (
            <div className="mod-options">
              {mods.map((entry) => {
                const selected = selectedMods.includes(entry.manifest.packageId);
                const required = (entry.manifest.dependencies ?? []).filter(
                  (dependency) => !dependency.optional,
                );
                const missing = required.filter(
                  (dependency) =>
                    dependency.packageId !== selectedBaseId &&
                    !selectedMods.includes(dependency.packageId),
                );
                return (
                  <article data-selected={selected || undefined} key={entry.manifest.packageId}>
                    <button
                      aria-pressed={selected}
                      disabled={!entry.validation.valid}
                      onClick={() => onToggleMod(entry)}
                      type="button"
                    >
                      <span>
                        <strong>{entry.manifest.name}</strong>
                        <small>
                          {entry.manifest.author} · {entry.manifest.version}
                        </small>
                      </span>
                      <Icon name={selected ? 'check' : 'add'} size={20} />
                    </button>
                    {missing.length > 0 && selected && (
                      <div className="dependency-notice">
                        <span>
                          Depende de {missing.map((dependency) => dependency.packageId).join(', ')}
                        </span>
                        <Button onClick={() => onAddDependencies(entry)} variant="secondary">
                          Selecionar dependências
                        </Button>
                      </div>
                    )}
                    {(entry.manifest.conflicts ?? []).length > 0 && (
                      <small>
                        Conflitos declarados:{' '}
                        {(entry.manifest.conflicts ?? []).map((item) => item.packageId).join(', ')}
                      </small>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <aside className="composition-summary" aria-live="polite">
        {compositionBusy ? (
          <Skeleton lines={3} />
        ) : compositionError ? (
          <Status headingLevel={3} label="Composição bloqueada" variant="danger">
            <p>{compositionError.message}</p>
            <small>{compositionError.details.join(' · ')}</small>
          </Status>
        ) : composition ? (
          <>
            <div>
              <span>Assinatura dos dados</span>
              <strong>
                {composition.fingerprint.algorithm}:{composition.fingerprint.value}
              </strong>
              <p>Esta assinatura identifica exatamente os dados usados pela carreira.</p>
            </div>
            <dl>
              <div>
                <dt>Clubes</dt>
                <dd>{composition.coverage.clubs}</dd>
              </div>
              <div>
                <dt>Jogadores</dt>
                <dd>{composition.coverage.players}</dd>
              </div>
              <div>
                <dt>Competições</dt>
                <dd>{composition.coverage.competitions}</dd>
              </div>
              <div>
                <dt>Assets</dt>
                <dd>{composition.coverage.assets}</dd>
              </div>
            </dl>
            <details>
              <summary>Load order e detalhes avançados</summary>
              <p>
                A ordem posterior pode prevalecer; dependências e hints impedem ordens inválidas.
              </p>
              <ol>
                {composition.fingerprint.packageOrder.map((packageId) => (
                  <li key={packageId}>
                    <code>{packageId}</code>
                  </li>
                ))}
              </ol>
            </details>
          </>
        ) : null}
      </aside>
    </section>
  );
}

function ExistingCoachPreview({ coach }: { readonly coach: WorldCoach }) {
  const average = Math.round(
    Object.values(coach.attributes).reduce((total, value) => total + value, 0) /
      Object.values(coach.attributes).length,
  );
  return (
    <article className="existing-coach-preview">
      <div className="coach-avatar-preview">
        <span>{coach.identity.knownName.slice(0, 2).toUpperCase()}</span>
      </div>
      <div>
        <span>Treinador atual do clube</span>
        <h3>{coach.identity.knownName}</h3>
        <p>
          {coach.identity.age} anos · {coach.identity.nationality} · {coach.qualification}
        </p>
        <dl>
          <div>
            <dt>Adequação ao papel</dt>
            <dd>{average}</dd>
          </div>
          <div>
            <dt>Reputação</dt>
            <dd>{coach.reputation}</dd>
          </div>
          <div>
            <dt>Experiência</dt>
            <dd>{coach.experienceYears} anos</dd>
          </div>
          <div>
            <dt>Estilo</dt>
            <dd>{coach.style}</dd>
          </div>
        </dl>
        <p>{coach.specialties.join(' · ') || 'Sem especialidades declaradas'}</p>
      </div>
    </article>
  );
}

interface ReviewStepProps {
  readonly composition: ResolvedWorldDatabase | null;
  readonly club: ClubReviewOption | undefined;
  readonly coachMode: 'existing' | 'created';
  readonly existingCoach: WorldCoach | null;
  readonly coachDraft: CoachCreatorDraft;
  readonly coachEvaluation: CoachCreationEvaluation | null;
  readonly displayName: string;
  readonly seasonLabel: string;
  readonly assistance: AssistanceProfile;
}

interface ClubReviewOption {
  readonly club: ResolvedWorldDatabase['world']['clubs'][number];
  readonly playerCount: number;
  readonly coach: WorldCoach | undefined;
  readonly available: boolean;
  readonly reasons: ClubReadinessProjection['requirements'];
  readonly projection?: ClubReadinessProjection;
}

function ReviewStep({
  composition,
  club,
  coachMode,
  existingCoach,
  coachDraft,
  coachEvaluation,
  displayName,
  seasonLabel,
  assistance,
}: ReviewStepProps) {
  const base = composition?.packages.find((entry) => entry.contentType === 'base');
  const mods = composition?.packages.filter((entry) => entry.contentType === 'mod') ?? [];
  return (
    <section aria-labelledby="review-step-title" className="wizard-stage review-stage">
      <header>
        <span>Revisão final</span>
        <h2 id="review-step-title">Tudo pronto para criar a carreira</h2>
        <p>Depois da confirmação, o Rust revalida e grava o slot atomicamente.</p>
      </header>
      <div className="career-review-grid">
        <section>
          <h3>Base</h3>
          <strong>{base?.name}</strong>
          <p>
            versão {base?.version} · schema {composition?.schemaVersion}
          </p>
          <code>
            {composition?.fingerprint.algorithm}:{composition?.fingerprint.value}
          </code>
        </section>
        <section>
          <h3>Mods</h3>
          <strong>{mods.length === 0 ? 'Nenhum mod' : `${mods.length} selecionados`}</strong>
          <p>
            {mods.map((mod) => `${mod.name} ${mod.version}`).join(' · ') ||
              'Somente a base principal'}
          </p>
        </section>
        <section>
          <h3>Mundo</h3>
          <strong>{seasonLabel}</strong>
          <p>Calendário e classificação aguardam inicialização esportiva.</p>
        </section>
        <section>
          <h3>Clube</h3>
          <strong>{club?.club.name}</strong>
          <p>Treinador anterior: {club?.coach?.identity.knownName ?? 'Não declarado'}</p>
        </section>
        <section>
          <h3>Treinador</h3>
          <strong>
            {coachMode === 'existing' ? existingCoach?.identity.knownName : coachDraft.knownName}
          </strong>
          <p>
            {coachMode === 'existing'
              ? 'Entidade existente da base'
              : `${coachDraft.background} · ${coachDraft.qualification} · entidade do save`}
          </p>
          {coachMode === 'created' && coachEvaluation && (
            <dl className="review-coach-balance">
              <div>
                <dt>Avaliação contextual</dt>
                <dd>{coachEvaluation.contextualRating}</dd>
              </div>
              <div>
                <dt>Pontos restantes</dt>
                <dd>{coachEvaluation.remainingPoints}</dd>
              </div>
              <div>
                <dt>Equilíbrio</dt>
                <dd>{coachEvaluation.balanceLabel}</dd>
              </div>
              <div>
                <dt>Forças</dt>
                <dd>{coachEvaluation.strengths.join(' · ')}</dd>
              </div>
              <div>
                <dt>Limitações</dt>
                <dd>{coachEvaluation.limitations.join(' · ')}</dd>
              </div>
            </dl>
          )}
        </section>
        <section>
          <h3>Slot</h3>
          <strong>{displayName}</strong>
          <p>Backup inicial · assistência {assistanceCopy[assistance].label}</p>
        </section>
      </div>
      <Status headingLevel={3} label="Confirmação consciente" variant="info">
        <p>
          Atualizações futuras no catálogo não alteram esta carreira. Mudanças exigirão migração
          explícita.
        </p>
      </Status>
    </section>
  );
}
