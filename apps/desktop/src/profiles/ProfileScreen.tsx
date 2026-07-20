import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';

import { loadCoachProfile, loadPlayerProfile, searchProfiles } from '../matchday/client.js';
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
import type {
  CoachProfileProjection,
  GlobalProfileSearchResult,
  PlayerProfileProjection,
  ProfileRoute,
} from './types.js';

import './profiles.css';

type ProfileProjection = PlayerProfileProjection | CoachProfileProjection;
type PlayerTab =
  'overview' | 'attributes' | 'roles' | 'performance' | 'history' | 'knowledge' | 'development';
type CoachTab = 'overview' | 'attributes' | 'style' | 'career' | 'development' | 'history';
type ProfileTab = PlayerTab | CoachTab;

interface ProfileScreenProps {
  readonly route: ProfileRoute;
  readonly variationId?: string | null;
  readonly onBack: () => void;
  readonly onNavigate: (route: ProfileRoute) => void;
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

const formatDate = (value: string | number) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Não informado' : date.toLocaleDateString('pt-BR');
};

const entityIndex = (entityId: string) => {
  const parsed = Number.parseInt(entityId.replace(/\D/gu, ''), 10);
  return Number.isFinite(parsed) ? Math.max(0, parsed - 1) : 0;
};

const isPlayerProfile = (profile: ProfileProjection): profile is PlayerProfileProjection =>
  'naturalPosition' in profile;

const profileRating = (profile: ProfileProjection) => profile.contextualRating;

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
  readonly current: ProfileProjection;
  readonly currentType: ProfileRoute['kind'];
  readonly onNavigate: (route: ProfileRoute) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<readonly GlobalProfileSearchResult[]>([]);
  const [comparison, setComparison] = useState<ProfileProjection | null>(null);
  const [error, setError] = useState('');
  const operationRef = useRef(0);

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
    <section className="comparison-panel" aria-label="Comparação de perfis">
      <header>
        <div>
          <span>DECISÃO ASSISTIDA</span>
          <h2>Comparar perfis</h2>
        </div>
        <Button
          leadingIcon={open ? 'close' : 'analysis'}
          onClick={() => setOpen((value) => !value)}
          variant="secondary"
        >
          {open ? 'Fechar' : 'Comparar'}
        </Button>
      </header>
      {open && (
        <div className="comparison-panel__body">
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
                  <RatingBadge rating={profileRating(profile)} />
                  <ConfidenceIndicator confidence={profile.knowledge.confidence} />
                  <dl>
                    <div>
                      <dt>Contexto</dt>
                      <dd>{profileRating(profile).contextLabel}</dd>
                    </div>
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
            <RatingBadge rating={profile.contextualRating} />
            <RatingBadge rating={profile.currentAbility} />
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
            <div>
              <dt>Potencial percebido</dt>
              <dd>
                <EstimatedRange value={profile.potential.perceived} />
              </dd>
            </div>
          </dl>
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
      <ProfileSection title="Potencial percebido">
        <EstimatedRange value={profile.potential.perceived} />
        <ConfidenceIndicator confidence={profile.potential.confidence} />
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
              <RatingBadge key={rating.contextId} rating={rating} />
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

function ProfileHero({ profile }: { readonly profile: ProfileProjection }) {
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
            index={entityIndex(profile.identity.entityId)}
            name={profile.identity.fullName}
            size={96}
          />
        ) : (
          <span aria-hidden="true" className="coach-avatar">
            {profile.identity.knownName
              .split(/\s/u)
              .map((part) => part[0])
              .join('')
              .slice(0, 2)}
          </span>
        )}
      </div>
      <div className="profile-hero__identity">
        <span>{player ? positionLongLabels[profile.naturalPosition] : profile.role}</span>
        <h1>{profile.identity.knownName}</h1>
        <p>{profile.identity.fullName}</p>
        <div>
          <NationalityDisplay codes={[profile.identity.nationality]} enableKeyboardTooltip />
          <span>{profile.identity.age} anos</span>
          <span>{profile.identity.clubName}</span>
          {player && <span>Camisa {profile.shirtNumber}</span>}
        </div>
      </div>
      <div className="profile-hero__rating">
        <RatingBadge rating={profile.contextualRating} />
        <ConfidenceIndicator confidence={profile.knowledge.confidence} />
      </div>
    </header>
  );
}

export function ProfileScreen({ route, variationId, onBack, onNavigate }: ProfileScreenProps) {
  const [profile, setProfile] = useState<ProfileProjection | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);
  const operationRef = useRef(0);

  useEffect(() => {
    const operation = ++operationRef.current;
    setProfile(null);
    setError('');
    setActiveTab('overview');
    const request =
      route.kind === 'player'
        ? loadPlayerProfile(route.entityId, variationId)
        : loadCoachProfile(route.entityId);
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
  }, [retryKey, route.entityId, route.kind, variationId]);

  const tabs = useMemo(
    () =>
      (route.kind === 'player' ? playerTabs : coachTabs) as readonly {
        readonly id: ProfileTab;
        readonly label: string;
      }[],
    [route.kind],
  );

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
    <section className="profile-screen" data-profile-kind={route.kind}>
      <div className="profile-command-bar">
        <Button leadingIcon="previous" onClick={onBack} variant="secondary">
          Voltar ao contexto
        </Button>
        <span>Perfil global · revisão {profile.revision}</span>
      </div>
      <ProfileHero profile={profile} />
      <KnowledgeState
        confidence={profile.knowledge.confidence}
        level={profile.knowledge.knowledgeLevel}
        source={profile.knowledge.source}
        updatedAt={profile.knowledge.updatedAt}
      />
      <ProfileTabs activeTab={activeTab} onChange={setActiveTab} tabs={tabs} />
      <div
        aria-labelledby={`profile-tab-${activeTab}`}
        className="profile-panel"
        id={`profile-panel-${activeTab}`}
        role="tabpanel"
        tabIndex={0}
      >
        {isPlayerProfile(profile) ? (
          <PlayerPanel profile={profile} tab={activeTab as PlayerTab} />
        ) : (
          <CoachPanel profile={profile} tab={activeTab as CoachTab} />
        )}
      </div>
      <ComparisonPanel current={profile} currentType={route.kind} onNavigate={onNavigate} />
    </section>
  );
}
