import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';

import {
  loadClubProfile,
  loadCoachProfile,
  loadNationProfile,
  loadPlayerProfile,
  searchProfiles,
} from '../matchday/client.js';
import { positionLongLabels } from '../matchday/matchday-ui.js';
import { PlayerFace } from '../matchday/PlayerFace.js';
import { NationalityDisplay } from '../ui/Nationality/index.js';
import { Button } from '../ui/primitives/actions.js';
import { Skeleton, Status } from '../ui/primitives/feedback.js';
import {
  AttributeGroup,
  ConfidenceIndicator,
  EstimatedRange,
  HonestEmptyState,
  KnowledgeState,
  RatingBadge,
  RatingBreakdown,
  RatingHistory,
  StrengthWeaknessSummary,
} from './components.js';
import { CoachFace } from './CoachFace.js';
import {
  EntityFactStrip,
  EntityLink,
  EntityReferenceList,
  NationalityEntityLink,
} from './EntityProfileSystem.js';
import type {
  ClubProfileProjection,
  CoachProfileProjection,
  GlobalProfileSearchResult,
  NationProfileProjection,
  PlayerProfileProjection,
  ProfileRoute,
} from './types.js';

import './profiles.css';

type ProfileProjection =
  | PlayerProfileProjection
  | CoachProfileProjection
  | ClubProfileProjection
  | NationProfileProjection;
type PersonProfileProjection = PlayerProfileProjection | CoachProfileProjection;
type PlayerTab =
  'overview' | 'attributes' | 'roles' | 'performance' | 'history' | 'knowledge' | 'development';
type CoachTab = 'overview' | 'attributes' | 'style' | 'career' | 'development' | 'history';
type ClubTab = 'overview' | 'squad' | 'staff' | 'tactics';
type NationTab = 'overview' | 'clubs' | 'players' | 'coaches' | 'competitions';
type ProfileTab = PlayerTab | CoachTab | ClubTab | NationTab;

interface ProfileScreenProps {
  readonly route: ProfileRoute;
  readonly activeTabHint?: string;
  readonly variationId?: string | null;
  readonly onBack: () => void;
  readonly onNavigate: (route: ProfileRoute) => void;
  readonly onTabChange?: (tab: string) => void;
}

const playerTabs: readonly { readonly id: PlayerTab; readonly label: string }[] = [
  { id: 'overview', label: 'Visão geral' },
  { id: 'attributes', label: 'Atributos' },
  { id: 'roles', label: 'Posições e funções' },
  { id: 'performance', label: 'Desempenho' },
  { id: 'history', label: 'Histórico' },
  { id: 'knowledge', label: 'Conhecimento' },
  { id: 'development', label: 'Desenvolvimento' },
];

const coachTabs: readonly { readonly id: CoachTab; readonly label: string }[] = [
  { id: 'overview', label: 'Visão geral' },
  { id: 'attributes', label: 'Capacidades' },
  { id: 'style', label: 'Estilo' },
  { id: 'career', label: 'Carreira' },
  { id: 'development', label: 'Desenvolvimento' },
  { id: 'history', label: 'Histórico' },
];

const clubTabs: readonly { readonly id: ClubTab; readonly label: string }[] = [
  { id: 'overview', label: 'Visão geral' },
  { id: 'squad', label: 'Elenco' },
  { id: 'staff', label: 'Comissão' },
  { id: 'tactics', label: 'Identidade tática' },
];

const nationTabs: readonly { readonly id: NationTab; readonly label: string }[] = [
  { id: 'overview', label: 'Visão geral' },
  { id: 'clubs', label: 'Clubes' },
  { id: 'players', label: 'Jogadores' },
  { id: 'coaches', label: 'Treinadores' },
  { id: 'competitions', label: 'Competições' },
];

const formatDate = (value: string | number) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Não informado' : date.toLocaleDateString('pt-BR');
};

const isPlayerProfile = (profile: ProfileProjection): profile is PlayerProfileProjection =>
  'naturalPosition' in profile;

const isCoachProfile = (profile: ProfileProjection): profile is CoachProfileProjection =>
  'role' in profile && 'identity' in profile;

const isClubProfile = (profile: ProfileProjection): profile is ClubProfileProjection =>
  'shortName' in profile && 'players' in profile;

const profileRating = (profile: PersonProfileProjection) => profile.contextualRating;

const ProfileSection = ({
  title,
  eyebrow,
  children,
}: {
  readonly title: string;
  readonly eyebrow?: string;
  readonly children: ReactNode;
}) => (
  <section className="profile-section">
    <header>
      {eyebrow && <span>{eyebrow}</span>}
      <h2>{title}</h2>
    </header>
    {children}
  </section>
);

function ProfileTabs({
  activeTab,
  tabs,
  onChange,
}: {
  readonly activeTab: ProfileTab;
  readonly tabs: readonly { readonly id: ProfileTab; readonly label: string }[];
  readonly onChange: (tab: ProfileTab) => void;
}) {
  return (
    <nav aria-label="Seções do perfil" className="profile-tabs" role="tablist">
      {tabs.map((tab, index) => (
        <button
          aria-controls={`profile-panel-${tab.id}`}
          aria-selected={activeTab === tab.id}
          id={`profile-tab-${tab.id}`}
          key={tab.id}
          onClick={() => onChange(tab.id)}
          onKeyDown={(event) => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
            event.preventDefault();
            const nextIndex =
              event.key === 'Home'
                ? 0
                : event.key === 'End'
                  ? tabs.length - 1
                  : event.key === 'ArrowRight'
                    ? (index + 1) % tabs.length
                    : (index - 1 + tabs.length) % tabs.length;
            const next = tabs[nextIndex];
            if (!next) return;
            onChange(next.id);
            window.requestAnimationFrame(() =>
              document.getElementById(`profile-tab-${next.id}`)?.focus(),
            );
          }}
          role="tab"
          tabIndex={activeTab === tab.id ? 0 : -1}
          type="button"
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}

function ContractCard({
  contract,
}: {
  readonly contract: PlayerProfileProjection['contract'] | CoachProfileProjection['contract'];
}) {
  if (!contract) {
    return (
      <HonestEmptyState title="Contrato não disponível">
        <p>Não há informação contratual confirmada nesta avaliação.</p>
      </HonestEmptyState>
    );
  }
  return (
    <dl className="profile-facts profile-facts--contract">
      <div>
        <dt>Início</dt>
        <dd>{formatDate(contract.startedAt)}</dd>
      </div>
      <div>
        <dt>Vencimento</dt>
        <dd>{formatDate(contract.expiresAt)}</dd>
      </div>
      <div>
        <dt>Status</dt>
        <dd>{contract.squadStatus}</dd>
      </div>
    </dl>
  );
}

function ComparisonPanel({
  current,
  currentType,
  onNavigate,
}: {
  readonly current: PersonProfileProjection;
  readonly currentType: 'player' | 'coach';
  readonly onNavigate: (route: ProfileRoute) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<readonly GlobalProfileSearchResult[]>([]);
  const [comparison, setComparison] = useState<PersonProfileProjection | null>(null);
  const [error, setError] = useState('');
  const operationRef = useRef(0);
  const closeComparison = () => {
    setOpen(false);
    window.requestAnimationFrame(() =>
      document.getElementById('profile-comparison-trigger')?.focus(),
    );
  };

  useEffect(() => {
    if (!open || query.trim().length < 2) {
      setResults([]);
      return;
    }
    const operation = ++operationRef.current;
    const timer = window.setTimeout(() => {
      void searchProfiles(query)
        .then((items) => {
          if (operation !== operationRef.current) return;
          setResults(
            items.filter(
              (item) =>
                item.entityType === currentType && item.entityId !== current.identity.entityId,
            ),
          );
        })
        .catch((reason: unknown) => {
          if (operation === operationRef.current)
            setError(reason instanceof Error ? reason.message : String(reason));
        });
    }, 180);
    return () => {
      window.clearTimeout(timer);
      operationRef.current += 1;
    };
  }, [current.identity.entityId, currentType, open, query]);

  const loadComparison = async (result: GlobalProfileSearchResult) => {
    const operation = ++operationRef.current;
    setError('');
    try {
      const next =
        currentType === 'player'
          ? await loadPlayerProfile(result.entityId)
          : await loadCoachProfile(result.entityId);
      if (operation === operationRef.current) setComparison(next);
    } catch (reason) {
      if (operation === operationRef.current)
        setError(reason instanceof Error ? reason.message : String(reason));
    }
  };

  return (
    <section
      className="comparison-panel"
      aria-label="Comparação de perfis"
      onKeyDown={(event) => {
        if (event.key !== 'Escape' || !open) return;
        event.preventDefault();
        closeComparison();
      }}
    >
      <header>
        <div>
          <span>DECISÃO ASSISTIDA</span>
          <h2>Comparar perfis</h2>
        </div>
        <Button
          aria-controls="profile-comparison-content"
          aria-expanded={open}
          id="profile-comparison-trigger"
          leadingIcon={open ? 'close' : 'analysis'}
          onClick={() => (open ? closeComparison() : setOpen(true))}
          variant="secondary"
        >
          {open ? 'Fechar' : 'Comparar'}
        </Button>
      </header>
      {open && (
        <div className="comparison-panel__body" id="profile-comparison-content">
          <label>
            <span>Buscar {currentType === 'player' ? 'jogador' : 'treinador'}</span>
            <input
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Digite ao menos 2 caracteres"
              type="search"
              value={query}
            />
          </label>
          {results.length > 0 && (
            <ul className="comparison-results">
              {results.map((result) => (
                <li key={result.entityId}>
                  <button onClick={() => void loadComparison(result)} type="button">
                    <strong>{result.name}</strong>
                    <small>{result.secondaryLabel}</small>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {error && (
            <p className="profile-inline-error" role="alert">
              {error}
            </p>
          )}
          {comparison && (
            <div className="comparison-grid">
              {[current, comparison].map((profile) => (
                <article key={profile.identity.entityId}>
                  <span>{profile.identity.clubName}</span>
                  <h3>{profile.identity.knownName}</h3>
                  <RatingBadge
                    displayLabel={
                      'naturalPosition' in profile
                        ? 'No plano atual'
                        : `Avaliação como ${profile.role.toLocaleLowerCase('pt-BR')}`
                    }
                    rating={profileRating(profile)}
                  />
                  <ConfidenceIndicator
                    confidence={profileRating(profile).confidence}
                    label="Confiança do rating"
                  />
                  <dl>
                    <div>
                      <dt>Referência da avaliação</dt>
                      <dd>
                        {'naturalPosition' in profile
                          ? `Plano atual · ${profileRating(profile).contextLabel}`
                          : `Cargo · ${profile.role}`}
                      </dd>
                    </div>
                    {'naturalPosition' in profile ? (
                      <>
                        <div>
                          <dt>OVR atual</dt>
                          <dd>
                            <EstimatedRange value={profile.currentAbility.perceived} />
                          </dd>
                        </div>
                        <div className="comparison-grid__potential">
                          <dt>Potencial estimado</dt>
                          <dd>
                            <EstimatedRange
                              qualifier="projeção futura"
                              value={profile.potential.perceived}
                            />
                          </dd>
                          <small>Confiança da projeção: {profile.potential.confidence}%</small>
                        </div>
                      </>
                    ) : (
                      <div className="comparison-grid__reputation">
                        <dt>Reputação percebida</dt>
                        <dd>
                          <EstimatedRange value={profile.reputation} />
                        </dd>
                      </div>
                    )}
                    <div>
                      <dt>Qualidades</dt>
                      <dd>{profile.strengths.slice(0, 2).join(' · ')}</dd>
                    </div>
                    <div>
                      <dt>Limitações</dt>
                      <dd>{profile.weaknesses.slice(0, 2).join(' · ') || 'Sem destaque'}</dd>
                    </div>
                  </dl>
                  {profile.identity.entityId !== current.identity.entityId && (
                    <Button
                      onClick={() =>
                        onNavigate({ kind: currentType, entityId: profile.identity.entityId })
                      }
                      variant="secondary"
                    >
                      Abrir perfil
                    </Button>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function PlayerOverview({ profile }: { readonly profile: PlayerProfileProjection }) {
  return (
    <div className="profile-content-grid">
      <div className="profile-content-stack">
        <ProfileSection eyebrow="LEITURA CONTEXTUAL" title="Avaliação atual">
          <div className="rating-feature-grid">
            <RatingBadge displayLabel="OVR atual" rating={profile.currentAbility} />
            <RatingBadge displayLabel="No plano atual" rating={profile.contextualRating} />
            <RatingBadge rating={profile.tacticalFit} />
          </div>
          <RatingBreakdown rating={profile.contextualRating} />
        </ProfileSection>
        <StrengthWeaknessSummary strengths={profile.strengths} weaknesses={profile.weaknesses} />
        {profile.alerts.length > 0 && (
          <ProfileSection title="Alertas">
            <ul className="profile-alerts">
              {profile.alerts.map((alert) => (
                <li key={alert}>{alert}</li>
              ))}
            </ul>
          </ProfileSection>
        )}
      </div>
      <aside className="profile-side-stack">
        <ProfileSection title="Estado e projeção">
          <dl className="profile-facts">
            <div>
              <dt>Condição</dt>
              <dd>{profile.condition === null ? 'Desconhecida' : `${profile.condition}%`}</dd>
            </div>
            <div>
              <dt>Ritmo de jogo</dt>
              <dd>{profile.matchFitness === null ? 'Desconhecido' : `${profile.matchFitness}%`}</dd>
            </div>
            <div>
              <dt>Forma</dt>
              <dd>
                <EstimatedRange value={profile.form} />
              </dd>
            </div>
            <div>
              <dt>Familiaridade</dt>
              <dd>
                {profile.tacticalFamiliarity === null
                  ? 'Sem contexto'
                  : `${profile.tacticalFamiliarity}%`}
              </dd>
            </div>
          </dl>
          <div className="potential-estimate" aria-label="Projeção de potencial">
            <span>Potencial estimado</span>
            <strong>
              <EstimatedRange qualifier="faixa futura" value={profile.potential.perceived} />
            </strong>
            <ConfidenceIndicator
              confidence={profile.potential.confidence}
              label="Confiança da projeção"
            />
            <p>Projeção futura incerta; não altera o OVR atual.</p>
          </div>
          <p className="profile-separation-note">
            Condição, forma e potencial não alteram a capacidade estrutural.
          </p>
        </ProfileSection>
        <ProfileSection title="Contrato">
          <ContractCard contract={profile.contract} />
        </ProfileSection>
      </aside>
    </div>
  );
}

function PlayerAttributes({ profile }: { readonly profile: PlayerProfileProjection }) {
  return (
    <div className="attribute-groups">
      {profile.attributeGroups.map((group) => (
        <AttributeGroup group={group} key={group.category} />
      ))}
    </div>
  );
}

function PlayerRoles({ profile }: { readonly profile: PlayerProfileProjection }) {
  return (
    <div className="profile-content-stack">
      <ProfileSection eyebrow="VARIAÇÃO ATIVA" title="Encaixe no plano">
        <RatingBreakdown rating={profile.tacticalFit} />
        <p className="profile-separation-note">
          Encaixe mede compatibilidade com a variação; familiaridade mede conhecimento do plano.
        </p>
      </ProfileSection>
      <ProfileSection title="Posições">
        <div className="context-rating-list">
          {profile.positionRatings.map((item) => (
            <article key={item.positionId}>
              <div>
                <span>{item.suitability}</span>
                <h3>{positionLongLabels[item.positionId]}</h3>
              </div>
              <RatingBadge compact rating={item.rating} />
              <RatingBreakdown rating={item.rating} />
            </article>
          ))}
        </div>
      </ProfileSection>
      <ProfileSection title="Funções e responsabilidades">
        <div className="context-rating-list">
          {profile.roleRatings.map((item) => (
            <article key={`${item.positionId}:${item.roleId}`}>
              <div>
                <span>{positionLongLabels[item.positionId]}</span>
                <h3>{item.roleLabel}</h3>
                <p>{item.responsibilities.join(' · ')}</p>
              </div>
              <RatingBadge compact rating={item.rating} />
              <RatingBreakdown rating={item.rating} />
            </article>
          ))}
        </div>
      </ProfileSection>
    </div>
  );
}

function PlayerPerformance({ profile }: { readonly profile: PlayerProfileProjection }) {
  const statistics = profile.statistics;
  return (
    <div className="profile-content-grid">
      <ProfileSection eyebrow="DADOS CONFIRMADOS" title="Temporada">
        <dl className="performance-grid">
          <div>
            <dt>Partidas</dt>
            <dd>{statistics.appearances}</dd>
          </div>
          <div>
            <dt>Minutos</dt>
            <dd>{statistics.minutes ?? '—'}</dd>
          </div>
          <div>
            <dt>Gols</dt>
            <dd>{statistics.goals}</dd>
          </div>
          <div>
            <dt>Assistências</dt>
            <dd>{statistics.assists}</dd>
          </div>
          <div>
            <dt>Cartões</dt>
            <dd>{statistics.cards ?? '—'}</dd>
          </div>
          <div>
            <dt>Nota média</dt>
            <dd>
              {statistics.averageRating?.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) ??
                '—'}
            </dd>
          </div>
        </dl>
        <small className="profile-source">Fonte: {statistics.source}</small>
      </ProfileSection>
      <HonestEmptyState title="Sem recorte por competição">
        <p>Não existem estatísticas autoritativas por competição ou forma recente detalhada.</p>
      </HonestEmptyState>
    </div>
  );
}

function PlayerHistory({ profile }: { readonly profile: PlayerProfileProjection }) {
  return (
    <div className="profile-content-stack">
      <ProfileSection title="Histórico de ratings">
        <RatingHistory history={profile.ratingHistory} />
      </ProfileSection>
      <ProfileSection title="Histórico de atributos">
        {profile.development.attributeHistory.length === 0 ? (
          <HonestEmptyState title="Sem marcos de atributos">
            <p>O histórico começa no bootstrap real dos perfis; não há retrospectiva inventada.</p>
          </HonestEmptyState>
        ) : (
          <ol className="attribute-history">
            {profile.development.attributeHistory.map((snapshot) => (
              <li key={snapshot.snapshotId}>
                <time>{formatDate(snapshot.recordedAt)}</time>
                <span>{snapshot.source}</span>
              </li>
            ))}
          </ol>
        )}
      </ProfileSection>
    </div>
  );
}

function PlayerKnowledge({ profile }: { readonly profile: PlayerProfileProjection }) {
  return (
    <div className="profile-content-grid">
      <KnowledgeState
        confidence={profile.knowledge.confidence}
        level={profile.knowledge.knowledgeLevel}
        source={profile.knowledge.source}
        updatedAt={profile.knowledge.updatedAt}
      />
      <ProfileSection title="Cobertura da avaliação">
        <dl className="knowledge-lists">
          <div>
            <dt>Conhecido</dt>
            <dd>{profile.knowledge.knownFields.join(', ') || 'Nenhum campo'}</dd>
          </div>
          <div>
            <dt>Estimado</dt>
            <dd>{profile.knowledge.estimatedFields.join(', ') || 'Nenhum campo'}</dd>
          </div>
          <div>
            <dt>Oculto</dt>
            <dd>{profile.knowledge.hiddenFields.join(', ') || 'Nenhum campo'}</dd>
          </div>
        </dl>
      </ProfileSection>
      <ProfileSection title="Potencial estimado">
        <EstimatedRange qualifier="projeção futura" value={profile.potential.perceived} />
        <ConfidenceIndicator
          confidence={profile.potential.confidence}
          label="Confiança da projeção"
        />
        <p>{profile.potential.explanation}</p>
        <small className="profile-source">
          Fonte: {profile.potential.source} · {formatDate(profile.potential.updatedAt)}
        </small>
      </ProfileSection>
    </div>
  );
}

function PlayerDevelopment({ profile }: { readonly profile: PlayerProfileProjection }) {
  return (
    <div className="profile-content-grid">
      <ProfileSection eyebrow="FUNDAÇÃO 06.8" title="Desenvolvimento">
        <dl className="profile-facts">
          <div>
            <dt>Capacidade atual</dt>
            <dd>{profile.development.currentAbility}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{profile.development.status}</dd>
          </div>
          <div>
            <dt>Personalidade</dt>
            <dd>{profile.development.personality ?? 'Ainda não avaliada'}</dd>
          </div>
          <div>
            <dt>Profissionalismo</dt>
            <dd>{profile.development.professionalism ?? 'Desconhecido'}</dd>
          </div>
          <div>
            <dt>Ambição</dt>
            <dd>{profile.development.ambition ?? 'Desconhecida'}</dd>
          </div>
        </dl>
      </ProfileSection>
      <HonestEmptyState title="Plano individual ainda não disponível">
        <p>
          A posição e a função preferidas já estão contratadas, mas sessões, carga e progressão
          pertencem à futura Fase 06.8.
        </p>
        <p>
          {positionLongLabels[profile.training.preferredPosition]} ·{' '}
          {profile.training.preferredRoleId}
        </p>
      </HonestEmptyState>
    </div>
  );
}

function PlayerPanel({
  profile,
  tab,
}: {
  readonly profile: PlayerProfileProjection;
  readonly tab: PlayerTab;
}) {
  switch (tab) {
    case 'attributes':
      return <PlayerAttributes profile={profile} />;
    case 'roles':
      return <PlayerRoles profile={profile} />;
    case 'performance':
      return <PlayerPerformance profile={profile} />;
    case 'history':
      return <PlayerHistory profile={profile} />;
    case 'knowledge':
      return <PlayerKnowledge profile={profile} />;
    case 'development':
      return <PlayerDevelopment profile={profile} />;
    default:
      return <PlayerOverview profile={profile} />;
  }
}

function CoachOverview({ profile }: { readonly profile: CoachProfileProjection }) {
  return (
    <div className="profile-content-grid">
      <div className="profile-content-stack">
        <ProfileSection eyebrow="RATING POR FUNÇÃO" title="Avaliação contextual">
          <RatingBreakdown rating={profile.contextualRating} />
          <div className="coach-rating-grid">
            {profile.categoryRatings.map((rating) => (
              <RatingBadge
                displayLabel={rating.contextLabel}
                key={rating.contextId}
                rating={rating}
              />
            ))}
          </div>
        </ProfileSection>
        <StrengthWeaknessSummary strengths={profile.strengths} weaknesses={profile.weaknesses} />
      </div>
      <aside className="profile-side-stack">
        <ProfileSection title="Experiência profissional">
          <dl className="profile-facts">
            <div>
              <dt>Cargo</dt>
              <dd>{profile.role}</dd>
            </div>
            <div>
              <dt>Qualificação</dt>
              <dd>{profile.qualification}</dd>
            </div>
            <div>
              <dt>Experiência</dt>
              <dd>{profile.experienceYears} anos</dd>
            </div>
            <div>
              <dt>Reputação percebida</dt>
              <dd>
                <EstimatedRange value={profile.reputation} />
              </dd>
            </div>
          </dl>
        </ProfileSection>
        <ProfileSection title="Contrato">
          <ContractCard contract={profile.contract} />
        </ProfileSection>
      </aside>
    </div>
  );
}

type CoachCapabilityKey =
  | 'technicalDevelopment'
  | 'physicalDevelopment'
  | 'mentalDevelopment'
  | 'tacticalDevelopment'
  | 'youthDevelopment'
  | 'positionAdaptation'
  | 'roleTeaching'
  | 'motivation'
  | 'peopleManagement'
  | 'assessmentAccuracy';

const coachCapabilityLabels: ReadonlyArray<[CoachCapabilityKey, string]> = [
  ['technicalDevelopment', 'Desenvolvimento técnico'],
  ['physicalDevelopment', 'Desenvolvimento físico'],
  ['mentalDevelopment', 'Desenvolvimento mental'],
  ['tacticalDevelopment', 'Desenvolvimento tático'],
  ['youthDevelopment', 'Desenvolvimento de jovens'],
  ['positionAdaptation', 'Adaptação de posição'],
  ['roleTeaching', 'Aprendizagem de função'],
  ['motivation', 'Motivação'],
  ['peopleManagement', 'Gestão humana'],
  ['assessmentAccuracy', 'Precisão de avaliação'],
];

function CoachCapabilities({ profile }: { readonly profile: CoachProfileProjection }) {
  return (
    <div className="profile-content-stack">
      <ProfileSection eyebrow="DIMENSÕES SEPARADAS" title="Capacidades de desenvolvimento">
        <dl className="coach-capabilities">
          {coachCapabilityLabels.map(([key, label]) => (
            <div key={key}>
              <dt>{label}</dt>
              <dd>
                <span style={{ '--capability': `${profile.development[key]}%` } as CSSProperties} />
                <b>{profile.development[key]}</b>
              </dd>
            </div>
          ))}
        </dl>
      </ProfileSection>
      <ProfileSection title="Especialidades">
        <ul className="specialty-list">
          {profile.specialties.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </ProfileSection>
    </div>
  );
}

function CoachStyle({ profile }: { readonly profile: CoachProfileProjection }) {
  return (
    <div className="profile-content-grid">
      <ProfileSection eyebrow="IDENTIDADE PROFISSIONAL" title={profile.style}>
        <h3>Formações preferidas</h3>
        <ul className="specialty-list">
          {profile.preferredFormations.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </ProfileSection>
      <HonestEmptyState title="Sem padrões táticos observados suficientes">
        <p>
          Pressão, transições e frequência de alterações não serão inferidas sem dados
          autoritativos.
        </p>
      </HonestEmptyState>
    </div>
  );
}

function CoachPanel({
  profile,
  tab,
}: {
  readonly profile: CoachProfileProjection;
  readonly tab: CoachTab;
}) {
  if (tab === 'attributes' || tab === 'development') return <CoachCapabilities profile={profile} />;
  if (tab === 'style') return <CoachStyle profile={profile} />;
  if (tab === 'career') {
    return profile.careerHistory.length === 0 ? (
      <HonestEmptyState title="Carreira sem dados confirmados">
        <p>Nenhum vínculo anterior foi registrado.</p>
      </HonestEmptyState>
    ) : (
      <ProfileSection title="Carreira">
        <ol className="career-history">
          {profile.careerHistory.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </ProfileSection>
    );
  }
  if (tab === 'history')
    return (
      <ProfileSection title="Histórico de ratings">
        <RatingHistory history={profile.ratingHistory} />
      </ProfileSection>
    );
  return <CoachOverview profile={profile} />;
}

function ClubPanel({
  profile,
  tab,
  onNavigate,
}: {
  readonly profile: ClubProfileProjection;
  readonly tab: ClubTab;
  readonly onNavigate: (route: ProfileRoute) => void;
}) {
  if (tab === 'squad') {
    return (
      <ProfileSection
        title={
          profile.knowledge.knowledgeLevel === 'ownClub' ? 'Plantel principal' : 'Elenco conhecido'
        }
      >
        <EntityReferenceList
          emptyBody="Nenhum vínculo de jogador está disponível no universo carregado."
          emptyTitle="Elenco ainda desconhecido"
          onNavigate={onNavigate}
          references={profile.players}
        />
      </ProfileSection>
    );
  }
  if (tab === 'staff') {
    return (
      <ProfileSection title="Comissão técnica">
        <EntityReferenceList
          emptyBody="Não há profissionais confirmados para este clube."
          emptyTitle="Comissão não informada"
          onNavigate={onNavigate}
          references={profile.staff}
        />
      </ProfileSection>
    );
  }
  if (tab === 'tactics') {
    if (!profile.tactics) {
      return (
        <HonestEmptyState title="Identidade tática não observada">
          <p>Nenhuma leitura tática confiável está disponível para este clube no contexto atual.</p>
        </HonestEmptyState>
      );
    }
    return (
      <ProfileSection title="Identidade tática">
        <EntityFactStrip
          facts={[
            { label: 'Formação', value: profile.tactics.formation ?? 'Não informada' },
            { label: 'Mentalidade', value: profile.tactics.mentality ?? 'Não observada' },
            { label: 'Estilo', value: profile.tactics.style ?? 'Não observado' },
            {
              label: 'Pressão',
              value: profile.tactics.pressure === null ? 'Não observada' : profile.tactics.pressure,
            },
            {
              label: 'Linha',
              value:
                profile.tactics.defensiveLine === null
                  ? 'Não observada'
                  : profile.tactics.defensiveLine,
            },
            { label: 'Transição', value: profile.tactics.transition ?? 'Não observada' },
          ]}
        />
        <p className="profile-source">
          {profile.tactics.source} · {profile.tactics.confidence}% de confiança · atualizado em{' '}
          {formatDate(profile.tactics.updatedAt)}
        </p>
      </ProfileSection>
    );
  }
  return (
    <div className="profile-content-grid">
      <div className="profile-content-stack">
        <ProfileSection title="Contexto do clube">
          <EntityFactStrip
            facts={[
              { label: 'Cidade', value: profile.city || 'Não informada' },
              { label: 'Competição', value: profile.competitionName ?? 'Não informada' },
              {
                label: 'Estádio',
                value: profile.stadiumName ?? 'Não informado',
                muted: !profile.stadiumName,
              },
              {
                label: 'Posição atual',
                value:
                  profile.currentPosition === null
                    ? 'Não disponível'
                    : `${profile.currentPosition}º`,
                muted: profile.currentPosition === null,
              },
            ]}
          />
        </ProfileSection>
        <ProfileSection
          title={
            profile.knowledge.knowledgeLevel === 'ownClub'
              ? 'Destaques do plantel principal'
              : 'Jogadores relevantes conhecidos'
          }
        >
          <EntityReferenceList
            emptyBody="A observação atual não identificou jogadores vinculados."
            emptyTitle="Sem jogadores conhecidos"
            onNavigate={onNavigate}
            references={profile.players.slice(0, 6)}
          />
        </ProfileSection>
      </div>
      <aside className="profile-side-stack">
        <ProfileSection title="Liderança esportiva">
          {profile.headCoach ? (
            <ClubLeadership onNavigate={onNavigate} reference={profile.headCoach} />
          ) : (
            <HonestEmptyState title="Treinador não confirmado">
              <p>Nenhum treinador principal está disponível nos dados atuais.</p>
            </HonestEmptyState>
          )}
        </ProfileSection>
        <ProfileSection title="Próximo contexto">
          <p>{profile.nextFixture ?? 'O próximo compromisso ainda não está disponível.'}</p>
          <p>
            {profile.form.length > 0 ? profile.form.join(' · ') : 'Forma recente não disponível.'}
          </p>
        </ProfileSection>
      </aside>
    </div>
  );
}

function ClubLeadership({
  reference,
  onNavigate,
}: {
  readonly reference: NonNullable<ClubProfileProjection['headCoach']>;
  readonly onNavigate: (route: ProfileRoute) => void;
}) {
  const [coach, setCoach] = useState<CoachProfileProjection | null>(null);

  useEffect(() => {
    let active = true;
    void loadCoachProfile(reference.entityId)
      .then((profile) => {
        if (active) setCoach(profile);
      })
      .catch(() => {
        if (active) setCoach(null);
      });
    return () => {
      active = false;
    };
  }, [reference.entityId]);

  return (
    <div className="club-leadership">
      <EntityReferenceList
        emptyBody=""
        emptyTitle=""
        onNavigate={onNavigate}
        references={[reference]}
      />
      {coach && (
        <dl className="club-leadership__metrics">
          <div>
            <dt>Avaliação como treinador principal</dt>
            <dd>{coach.contextualRating.perceived.label}</dd>
          </div>
          <div>
            <dt>Reputação percebida</dt>
            <dd>
              <EstimatedRange value={coach.reputation} />
            </dd>
          </div>
          <div>
            <dt>Confiança do rating</dt>
            <dd>{coach.contextualRating.confidence}%</dd>
          </div>
        </dl>
      )}
    </div>
  );
}

function NationPanel({
  profile,
  tab,
  onNavigate,
}: {
  readonly profile: NationProfileProjection;
  readonly tab: NationTab;
  readonly onNavigate: (route: ProfileRoute) => void;
}) {
  const lists = {
    clubs: profile.clubs,
    players: profile.players,
    coaches: profile.coaches,
  } as const;
  if (tab === 'clubs' || tab === 'players' || tab === 'coaches') {
    const labels = {
      clubs: [
        'Clubes conhecidos',
        'Nenhum clube conhecido',
        'Nenhum clube desta nação está presente no universo carregado.',
      ],
      players: [
        'Jogadores conhecidos',
        'Nenhum jogador conhecido',
        'Nenhum jogador desta nacionalidade está disponível com o conhecimento atual.',
      ],
      coaches: [
        'Treinadores conhecidos',
        'Nenhum treinador conhecido',
        'Nenhum treinador desta nacionalidade está disponível com o conhecimento atual.',
      ],
    } as const;
    const [title, emptyTitle, emptyBody] = labels[tab];
    return (
      <ProfileSection title={title}>
        <EntityReferenceList
          emptyBody={emptyBody}
          emptyTitle={emptyTitle}
          onNavigate={onNavigate}
          references={lists[tab]}
        />
      </ProfileSection>
    );
  }
  if (tab === 'competitions') {
    return profile.competitions.length === 0 ? (
      <HonestEmptyState title="Competições não disponíveis">
        <p>Nenhuma competição vinculada existe no universo atualmente carregado.</p>
      </HonestEmptyState>
    ) : (
      <ProfileSection title="Competições vinculadas">
        <ul className="nation-competition-list">
          {profile.competitions.map((competition) => (
            <li key={competition}>{competition}</li>
          ))}
        </ul>
      </ProfileSection>
    );
  }
  return (
    <div className="profile-content-grid profile-content-grid--nation">
      <ProfileSection title="Presença no universo carregado">
        <EntityFactStrip
          facts={[
            { label: 'Clubes', value: profile.clubs.length },
            { label: 'Jogadores', value: profile.players.length },
            { label: 'Treinadores', value: profile.coaches.length },
            { label: 'Competições', value: profile.competitions.length },
          ]}
        />
      </ProfileSection>
      <ProfileSection title="Principais entidades conhecidas">
        <EntityReferenceList
          emptyBody="Nenhuma entidade vinculada está disponível no recorte atual."
          emptyTitle="Presença ainda não observada"
          onNavigate={onNavigate}
          references={[...profile.clubs, ...profile.players, ...profile.coaches].slice(0, 8)}
        />
      </ProfileSection>
    </div>
  );
}

function ProfileHero({
  profile,
  onNavigate,
}: {
  readonly profile: ProfileProjection;
  readonly onNavigate: (route: ProfileRoute) => void;
}) {
  if (isClubProfile(profile)) {
    const ownClub = profile.knowledge.knowledgeLevel === 'ownClub';
    return (
      <header
        className="profile-hero profile-hero--club"
        style={{ '--club-color': profile.primaryColor } as CSSProperties}
      >
        <div aria-label={`Escudo de ${profile.name}`} className="profile-hero__crest" role="img">
          {profile.shortName}
        </div>
        <div className="profile-hero__identity">
          <span>CLUBE</span>
          <h1>{profile.name}</h1>
          <p>{profile.shortName}</p>
          <div>
            <span>{profile.city}</span>
            {profile.countryCode && (
              <NationalityEntityLink code={profile.countryCode} onNavigate={onNavigate} />
            )}
            {profile.competitionName && <span>{profile.competitionName}</span>}
          </div>
        </div>
        <div className="profile-hero__rating profile-hero__rating--context">
          <strong>{profile.players.length}</strong>
          <span>
            {ownClub ? 'jogadores no elenco · plantel principal' : 'jogadores conhecidos'}
          </span>
          <ConfidenceIndicator
            confidence={profile.knowledge.confidence}
            label="Confiança cadastral"
          />
        </div>
      </header>
    );
  }
  if (!('identity' in profile)) {
    return (
      <header className="profile-hero profile-hero--nation">
        <div className="profile-hero__flag">
          <NationalityDisplay codes={[profile.code]} />
        </div>
        <div className="profile-hero__identity">
          <span>NAÇÃO</span>
          <h1>{profile.name}</h1>
          <p>{profile.code}</p>
          <div>
            <span>{profile.confederation ?? 'Confederação não informada'}</span>
            <span>
              {profile.clubs.length + profile.players.length + profile.coaches.length} entidades
              conhecidas
            </span>
          </div>
        </div>
        <div className="profile-hero__rating profile-hero__rating--context">
          <strong>{profile.players.length}</strong>
          <span>jogadores no recorte</span>
        </div>
      </header>
    );
  }
  const player = isPlayerProfile(profile);
  return (
    <header
      className="profile-hero"
      style={{ '--club-color': profile.identity.clubPrimaryColor } as CSSProperties}
    >
      <div className="profile-hero__portrait">
        {player ? (
          <PlayerFace
            decorative
            entityId={profile.identity.entityId}
            name={profile.identity.fullName}
            size={96}
          />
        ) : (
          <CoachFace
            decorative
            entityId={profile.identity.entityId}
            name={profile.identity.fullName}
            size={96}
          />
        )}
      </div>
      <div className="profile-hero__identity">
        <span>{player ? positionLongLabels[profile.naturalPosition] : profile.role}</span>
        <h1>{profile.identity.knownName}</h1>
        <p>{profile.identity.fullName}</p>
        <div>
          <NationalityEntityLink
            code={profile.identity.nationality}
            enableKeyboardTooltip
            onNavigate={onNavigate}
          />
          <span>{profile.identity.age} anos</span>
          <EntityLink
            ariaLabel={`Abrir perfil de ${profile.identity.clubName}`}
            onNavigate={onNavigate}
            route={{ kind: 'club', entityId: profile.identity.clubId }}
          >
            {profile.identity.clubName}
          </EntityLink>
          {player && <span>Camisa {profile.shirtNumber}</span>}
        </div>
      </div>
      <div className="profile-hero__rating">
        <RatingBadge
          displayLabel={
            player ? 'OVR atual' : `Avaliação como ${profile.role.toLocaleLowerCase('pt-BR')}`
          }
          rating={player ? profile.currentAbility : profile.contextualRating}
        />
        <ConfidenceIndicator
          confidence={
            player ? profile.currentAbility.confidence : profile.contextualRating.confidence
          }
          label={
            player ? 'Confiança do OVR atual' : 'Confiança da avaliação como treinador principal'
          }
        />
      </div>
    </header>
  );
}

export function ProfileScreen({
  route,
  activeTabHint,
  variationId,
  onBack,
  onNavigate,
  onTabChange,
}: ProfileScreenProps) {
  const [profile, setProfile] = useState<ProfileProjection | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);
  const operationRef = useRef(0);
  const screenRef = useRef<HTMLElement>(null);
  const routeKeyRef = useRef('');
  const pendingScrollTopRef = useRef(0);

  useEffect(() => {
    const operation = ++operationRef.current;
    const routeKey = `${route.kind}:${route.entityId}`;
    pendingScrollTopRef.current =
      routeKeyRef.current === routeKey
        ? (screenRef.current?.scrollTop ?? Number(window.history.state?.rivalloScrollTop ?? 0))
        : Number(window.history.state?.rivalloScrollTop ?? 0);
    routeKeyRef.current = routeKey;
    setProfile(null);
    setError('');
    const restoredTab = window.history.state?.rivalloProfileTab;
    const nextTab = typeof restoredTab === 'string' ? (restoredTab as ProfileTab) : 'overview';
    setActiveTab(nextTab);
    onTabChange?.(nextTab);
    const request =
      route.kind === 'player'
        ? loadPlayerProfile(route.entityId, variationId)
        : route.kind === 'coach'
          ? loadCoachProfile(route.entityId)
          : route.kind === 'club'
            ? loadClubProfile(route.entityId)
            : loadNationProfile(route.entityId);
    void request
      .then((next) => {
        if (operation === operationRef.current) setProfile(next);
      })
      .catch((reason: unknown) => {
        if (operation === operationRef.current)
          setError(reason instanceof Error ? reason.message : String(reason));
      });
    return () => {
      operationRef.current += 1;
    };
  }, [onTabChange, retryKey, route.entityId, route.kind, variationId]);

  const tabs = useMemo(() => {
    const selectedTabs =
      route.kind === 'player'
        ? playerTabs
        : route.kind === 'coach'
          ? coachTabs
          : route.kind === 'club'
            ? clubTabs
            : nationTabs;
    return selectedTabs as readonly {
      readonly id: ProfileTab;
      readonly label: string;
    }[];
  }, [route.kind]);

  useEffect(() => {
    if (activeTabHint && tabs.some((tab) => tab.id === activeTabHint)) {
      setActiveTab(activeTabHint as ProfileTab);
    }
  }, [activeTabHint, tabs]);

  useEffect(() => {
    if (!tabs.some((tab) => tab.id === activeTab)) setActiveTab('overview');
  }, [activeTab, tabs]);

  useEffect(() => {
    if (!profile) return;
    const frame = window.requestAnimationFrame(() => {
      const screen = screenRef.current;
      if (!screen) return;
      screen.scrollTop = pendingScrollTopRef.current;
      screen.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [profile]);

  if (error) {
    const offline = typeof navigator !== 'undefined' && !navigator.onLine;
    const missing = /not found|não encontr|inexist/iu.test(error);
    return (
      <section className="profile-screen profile-screen--state">
        <Button leadingIcon="previous" onClick={onBack} variant="secondary">
          Voltar ao contexto
        </Button>
        <Status
          label={
            missing
              ? 'Perfil não encontrado'
              : offline
                ? 'Perfil indisponível offline'
                : 'Não foi possível abrir o perfil'
          }
          variant="danger"
        >
          <p>{missing ? 'A entidade solicitada não existe ou não está mais disponível.' : error}</p>
          {!missing && (
            <Button
              leadingIcon="retry"
              onClick={() => setRetryKey((value) => value + 1)}
              variant="secondary"
            >
              Tentar novamente
            </Button>
          )}
        </Status>
      </section>
    );
  }

  if (!profile) {
    return (
      <section aria-busy="true" className="profile-screen profile-screen--state">
        <span className="profile-loading-label">Carregando perfil canônico…</span>
        <Skeleton lines={10} />
      </section>
    );
  }

  return (
    <section
      aria-label="Perfil global"
      className="profile-screen"
      data-profile-kind={route.kind}
      onKeyDown={(event) => {
        if (event.currentTarget !== event.target) return;
        const screen = event.currentTarget;
        if (event.key === 'End') screen.scrollTo({ top: screen.scrollHeight });
        else if (event.key === 'Home') screen.scrollTo({ top: 0 });
        else if (event.key === 'PageDown')
          screen.scrollBy({ top: Math.max(1, screen.clientHeight * 0.85) });
        else if (event.key === 'PageUp')
          screen.scrollBy({ top: -Math.max(1, screen.clientHeight * 0.85) });
        else return;
        event.preventDefault();
      }}
      ref={screenRef}
      tabIndex={-1}
    >
      <div className="profile-command-bar">
        <Button leadingIcon="previous" onClick={onBack} variant="secondary">
          Voltar ao contexto
        </Button>
        <span>Perfil global · revisão {profile.revision}</span>
      </div>
      <ProfileHero onNavigate={onNavigate} profile={profile} />
      <KnowledgeState
        confidence={profile.knowledge.confidence}
        level={profile.knowledge.knowledgeLevel}
        source={profile.knowledge.source}
        updatedAt={profile.knowledge.updatedAt}
      />
      <ProfileTabs
        activeTab={activeTab}
        onChange={(tab) => {
          setActiveTab(tab);
          onTabChange?.(tab);
          window.history.replaceState(
            { ...window.history.state, rivalloProfileTab: tab },
            '',
            window.location.href,
          );
        }}
        tabs={tabs}
      />
      <div
        aria-labelledby={`profile-tab-${activeTab}`}
        className="profile-panel"
        id={`profile-panel-${activeTab}`}
        role="tabpanel"
        tabIndex={0}
      >
        {isPlayerProfile(profile) ? (
          <PlayerPanel profile={profile} tab={activeTab as PlayerTab} />
        ) : isCoachProfile(profile) ? (
          <CoachPanel profile={profile} tab={activeTab as CoachTab} />
        ) : isClubProfile(profile) ? (
          <ClubPanel onNavigate={onNavigate} profile={profile} tab={activeTab as ClubTab} />
        ) : (
          <NationPanel onNavigate={onNavigate} profile={profile} tab={activeTab as NationTab} />
        )}
      </div>
      {(isPlayerProfile(profile) || isCoachProfile(profile)) && (
        <ComparisonPanel
          current={profile}
          currentType={isPlayerProfile(profile) ? 'player' : 'coach'}
          onNavigate={onNavigate}
        />
      )}
    </section>
  );
}
