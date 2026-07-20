import { Icon } from '@rivallo/icons';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

import { loadCoachProfile, loadPlayerProfile } from '../matchday/client.js';
import { PlayerFace } from '../matchday/PlayerFace.js';
import { positionLongLabels } from '../matchday/matchday-ui.js';
import { NationalityDisplay } from '../ui/Nationality/index.js';
import { Button } from '../ui/primitives/actions.js';
import { Skeleton, Status } from '../ui/primitives/feedback.js';
import type {
  AttributeGroupProjection,
  ExplainableRating,
  KnowledgeLevel,
  KnowledgeValue,
  CoachProfileProjection,
  PlayerProfileProjection,
  RatingSnapshot,
} from './types.js';
import { CoachFace } from './CoachFace.js';

const knowledgeLabels: Record<KnowledgeLevel, string> = {
  ownClub: 'Conhecimento do próprio clube',
  wellKnown: 'Bem conhecido',
  partial: 'Observação parcial',
  limited: 'Conhecimento limitado',
  unknown: 'Desconhecido',
};

const formatDate = (value: number | string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Data indisponível' : date.toLocaleDateString('pt-BR');
};

export function EstimatedRange({ value }: { readonly value: KnowledgeValue }) {
  return (
    <span
      className="estimated-range"
      data-kind={value.kind}
      aria-label={
        value.kind === 'range'
          ? `Faixa estimada de ${value.minimum} a ${value.maximum}`
          : value.kind === 'unknown'
            ? 'Informação desconhecida'
            : value.label
      }
    >
      {value.label}
      {value.kind === 'range' && <small>estimado</small>}
    </span>
  );
}

export function ConfidenceIndicator({ confidence }: { readonly confidence: number }) {
  const level = confidence >= 80 ? 'high' : confidence >= 50 ? 'medium' : 'low';
  return (
    <span
      className="confidence-indicator"
      data-level={level}
      aria-label={`Confiança da avaliação: ${confidence}%`}
    >
      <i aria-hidden="true">
        <b style={{ '--confidence': `${confidence}%` } as CSSProperties} />
      </i>
      <span>{confidence}% de confiança</span>
    </span>
  );
}

export function KnowledgeState({
  level,
  confidence,
  source,
  updatedAt,
}: {
  readonly level: KnowledgeLevel;
  readonly confidence: number;
  readonly source: string;
  readonly updatedAt: number;
}) {
  return (
    <section className="knowledge-state" aria-label="Estado do conhecimento">
      <div>
        <Icon name={confidence < 50 ? 'warning' : 'information'} size={20} />
        <span>
          <strong>{knowledgeLabels[level]}</strong>
          <small>Atualizado em {formatDate(updatedAt)}</small>
        </span>
      </div>
      <ConfidenceIndicator confidence={confidence} />
      <p>Fonte: {source}</p>
    </section>
  );
}

export function RatingBadge({
  rating,
  compact = false,
}: {
  readonly rating: ExplainableRating;
  readonly compact?: boolean;
}) {
  return (
    <span
      className="rating-badge"
      data-compact={compact || undefined}
      aria-label={`${rating.contextLabel}: ${rating.perceived.label}; confiança ${rating.confidence}%`}
    >
      <strong>
        <EstimatedRange value={rating.perceived} />
      </strong>
      <small>{rating.contextLabel}</small>
    </span>
  );
}

export function RatingBreakdown({ rating }: { readonly rating: ExplainableRating }) {
  return (
    <details className="rating-breakdown">
      <summary>
        <span>
          <strong>Por que este rating?</strong>
          <small>{rating.summary}</small>
        </span>
        <Icon name="next" size={20} />
      </summary>
      <div className="rating-breakdown__body">
        <header>
          <RatingBadge compact rating={rating} />
          <ConfidenceIndicator confidence={rating.confidence} />
        </header>
        <ul aria-label="Fatores do rating">
          {rating.factors.map((factor) => (
            <li data-impact={factor.impact} key={factor.factorId}>
              <span>
                <strong>{factor.label}</strong>
                <small>{factor.explanation}</small>
              </span>
              <span>
                <b>{factor.value}</b>
                <small>{factor.weight}% do contexto</small>
              </span>
            </li>
          ))}
        </ul>
        <footer>
          <span>Fonte: {rating.source}</span>
          <span>Atualizado em {formatDate(rating.updatedAt)}</span>
          <span>Escala: {rating.scaleVersion}</span>
        </footer>
      </div>
    </details>
  );
}

export function AttributeGroup({ group }: { readonly group: AttributeGroupProjection }) {
  return (
    <section className="attribute-group" aria-labelledby={`attribute-${group.category}`}>
      <h3 id={`attribute-${group.category}`}>{group.label}</h3>
      <dl>
        {group.attributes.map((attribute) => (
          <div key={attribute.attributeId}>
            <dt>{attribute.label}</dt>
            <dd>
              <EstimatedRange value={attribute.perceived} />
              <small>{attribute.confidence}%</small>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function StrengthWeaknessSummary({
  strengths,
  weaknesses,
}: {
  readonly strengths: readonly string[];
  readonly weaknesses: readonly string[];
}) {
  return (
    <section className="strength-weakness" aria-label="Qualidades e limitações">
      <div>
        <h3>
          <Icon name="success" size={20} /> Qualidades
        </h3>
        <ul>
          {strengths.map((strength) => (
            <li key={strength}>{strength}</li>
          ))}
        </ul>
      </div>
      <div>
        <h3>
          <Icon name="warning" size={20} /> Limitações
        </h3>
        {weaknesses.length > 0 ? (
          <ul>
            {weaknesses.map((weakness) => (
              <li key={weakness}>{weakness}</li>
            ))}
          </ul>
        ) : (
          <p>Nenhuma limitação dominante na avaliação disponível.</p>
        )}
      </div>
    </section>
  );
}

export function RatingHistory({ history }: { readonly history: readonly RatingSnapshot[] }) {
  if (history.length === 0) {
    return (
      <Status label="Sem histórico de rating" variant="neutral">
        <p>O Rivallo não cria retrospectiva fictícia. Novos marcos surgirão após mudanças reais.</p>
      </Status>
    );
  }
  return (
    <ol className="rating-history" aria-label="Histórico de ratings">
      {history.map((snapshot) => (
        <li key={snapshot.snapshotId}>
          <time dateTime={new Date(snapshot.recordedAt).toISOString()}>
            {formatDate(snapshot.recordedAt)}
          </time>
          <strong>{snapshot.value}</strong>
          <span>
            {snapshot.positionId ?? 'Cargo'}
            {snapshot.roleId ? ` · ${snapshot.roleId}` : ''}
          </span>
          <small>
            {snapshot.variationId ? `Variação ${snapshot.variationId} · ` : ''}
            confiança {snapshot.confidence}% · {snapshot.source}
          </small>
        </li>
      ))}
    </ol>
  );
}

export function HonestEmptyState({
  title,
  children,
}: {
  readonly title: string;
  readonly children: ReactNode;
}) {
  return (
    <Status label={title} variant="neutral">
      <div>{children}</div>
    </Status>
  );
}

export function PlayerInspector({
  playerId,
  variationId,
  onOpenProfile,
  children,
}: {
  readonly playerId: string;
  readonly variationId?: string | null;
  readonly onOpenProfile: (playerId: string) => void;
  readonly children?: ReactNode;
}) {
  const [profile, setProfile] = useState<PlayerProfileProjection | null>(null);
  const [error, setError] = useState('');
  const operationRef = useRef(0);

  useEffect(() => {
    const operation = ++operationRef.current;
    setProfile(null);
    setError('');
    void loadPlayerProfile(playerId, variationId)
      .then((nextProfile) => {
        if (operation === operationRef.current) setProfile(nextProfile);
      })
      .catch((reason: unknown) => {
        if (operation === operationRef.current)
          setError(reason instanceof Error ? reason.message : String(reason));
      });
    return () => {
      operationRef.current += 1;
    };
  }, [playerId, variationId]);

  if (error) {
    return (
      <aside className="player-inspector" aria-label="Inspetor de jogador">
        <Status label="Perfil indisponível" variant="danger">
          <p>{error}</p>
        </Status>
        <footer>
          {children}
          <Button onClick={() => onOpenProfile(playerId)} variant="primary">
            Abrir perfil completo
          </Button>
        </footer>
      </aside>
    );
  }
  if (!profile) {
    return (
      <aside className="player-inspector" aria-busy="true" aria-label="Carregando inspetor">
        <Skeleton lines={4} />
        <footer>{children}</footer>
      </aside>
    );
  }
  return (
    <aside className="player-inspector" aria-label={`Resumo de ${profile.identity.fullName}`}>
      <header>
        <PlayerFace
          decorative
          index={Number.parseInt(playerId.replace(/\D/gu, ''), 10) - 1}
          name={profile.identity.fullName}
          size={88}
        />
        <div>
          <span>{positionLongLabels[profile.naturalPosition]}</span>
          <h2>{profile.identity.fullName}</h2>
          <small>
            {profile.identity.age} anos ·{' '}
            <NationalityDisplay codes={[profile.identity.nationality]} />
          </small>
        </div>
        <RatingBadge compact rating={profile.contextualRating} />
      </header>
      <KnowledgeState
        confidence={profile.knowledge.confidence}
        level={profile.knowledge.knowledgeLevel}
        source={profile.knowledge.source}
        updatedAt={profile.knowledge.updatedAt}
      />
      <dl className="player-inspector__facts">
        <div>
          <dt>Capacidade</dt>
          <dd>
            <EstimatedRange value={profile.currentAbility.perceived} />
          </dd>
        </div>
        <div>
          <dt>Encaixe tático</dt>
          <dd>
            <EstimatedRange value={profile.tacticalFit.perceived} />
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
          <dt>Condição</dt>
          <dd>{profile.condition === null ? 'Desconhecida' : `${profile.condition}%`}</dd>
        </div>
        <div>
          <dt>Forma</dt>
          <dd>
            <EstimatedRange value={profile.form} />
          </dd>
        </div>
        <div>
          <dt>Potencial</dt>
          <dd>
            <EstimatedRange value={profile.potential.perceived} />
          </dd>
        </div>
      </dl>
      {profile.alerts.length > 0 && (
        <ul className="player-inspector__alerts">
          {profile.alerts.map((alert) => (
            <li key={alert}>{alert}</li>
          ))}
        </ul>
      )}
      <footer>
        {children}
        <Button onClick={() => onOpenProfile(playerId)} variant="primary">
          Abrir perfil completo
        </Button>
      </footer>
    </aside>
  );
}

export function CoachInspector({
  coachId,
  onOpenProfile,
}: {
  readonly coachId: string;
  readonly onOpenProfile: (coachId: string) => void;
}) {
  const [profile, setProfile] = useState<CoachProfileProjection | null>(null);
  const [error, setError] = useState('');
  const operationRef = useRef(0);

  useEffect(() => {
    const operation = ++operationRef.current;
    setProfile(null);
    setError('');
    void loadCoachProfile(coachId)
      .then((nextProfile) => {
        if (operation === operationRef.current) setProfile(nextProfile);
      })
      .catch((reason: unknown) => {
        if (operation === operationRef.current)
          setError(reason instanceof Error ? reason.message : String(reason));
      });
    return () => {
      operationRef.current += 1;
    };
  }, [coachId]);

  if (error) {
    return (
      <aside className="coach-inspector" aria-label="Inspetor de treinador">
        <Status label="Perfil indisponível" variant="danger">
          <p>{error}</p>
        </Status>
      </aside>
    );
  }
  if (!profile) {
    return (
      <aside
        aria-busy="true"
        aria-label="Carregando inspetor de treinador"
        className="coach-inspector"
      >
        <Skeleton lines={4} />
      </aside>
    );
  }
  return (
    <aside className="coach-inspector" aria-label={`Resumo de ${profile.identity.fullName}`}>
      <header>
        <CoachFace decorative name={profile.identity.fullName} size={56} />
        <div>
          <small>{profile.role}</small>
          <h2>{profile.identity.knownName}</h2>
          <span>{profile.identity.clubName}</span>
        </div>
        <RatingBadge compact rating={profile.contextualRating} />
      </header>
      <KnowledgeState
        confidence={profile.knowledge.confidence}
        level={profile.knowledge.knowledgeLevel}
        source={profile.knowledge.source}
        updatedAt={profile.knowledge.updatedAt}
      />
      <dl className="player-inspector__facts">
        <div>
          <dt>Qualificação</dt>
          <dd>{profile.qualification}</dd>
        </div>
        <div>
          <dt>Experiência</dt>
          <dd>{profile.experienceYears} anos</dd>
        </div>
        <div>
          <dt>Estilo</dt>
          <dd>{profile.style}</dd>
        </div>
        <div>
          <dt>Especialidades</dt>
          <dd>{profile.specialties.slice(0, 2).join(' · ')}</dd>
        </div>
      </dl>
      <footer>
        <Button onClick={() => onOpenProfile(coachId)} variant="primary">
          Abrir perfil completo
        </Button>
      </footer>
    </aside>
  );
}
