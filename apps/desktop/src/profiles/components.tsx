import { Icon } from '@rivallo/icons';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

import { loadCoachProfile, loadPlayerProfile } from '../matchday/client.js';
import { PlayerFace } from '../matchday/PlayerFace.js';
import { positionLongLabels } from '../matchday/matchday-ui.js';
import { NationalityDisplay } from '../ui/Nationality/index.js';
import { Button } from '../ui/primitives/actions.js';
import { Tooltip } from '../ui/primitives/disclosure.js';
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
  ownClub: 'Dados internos do clube',
  wellKnown: 'Bem conhecido',
  partial: 'Observação parcial',
  limited: 'Conhecimento limitado',
  unknown: 'Desconhecido',
};

const formatDate = (value: number | string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Data indisponível' : date.toLocaleDateString('pt-BR');
};

export function EstimatedRange({
  value,
  qualifier,
}: {
  readonly value: KnowledgeValue;
  readonly qualifier?: string;
}) {
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
      {(value.kind === 'range' || qualifier) && <small>{qualifier ?? 'estimado'}</small>}
    </span>
  );
}

export function ConfidenceIndicator({
  confidence,
  label = 'Confiança da avaliação',
}: {
  readonly confidence: number;
  readonly label?: string;
}) {
  const level = confidence >= 80 ? 'high' : confidence >= 50 ? 'medium' : 'low';
  return (
    <span
      className="confidence-indicator"
      data-level={level}
      aria-label={`${label}: ${confidence}%`}
    >
      <i aria-hidden="true">
        <b style={{ '--confidence': `${confidence}%` } as CSSProperties} />
      </i>
      <span>
        {label}: {confidence}%
      </span>
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
      <ConfidenceIndicator confidence={confidence} label="Confiança cadastral" />
      <p>Fonte: {source}</p>
    </section>
  );
}

export function RatingBadge({
  rating,
  compact = false,
  displayLabel,
}: {
  readonly rating: ExplainableRating;
  readonly compact?: boolean;
  readonly displayLabel?: string;
}) {
  const label =
    displayLabel ??
    (() => {
      switch (rating.ratingKind) {
        case 'currentAbility':
          return 'OVR atual';
        case 'coachRole':
          return `Avaliação como ${rating.contextLabel.toLocaleLowerCase('pt-BR')}`;
        case 'position':
          return 'Nesta posição';
        case 'role':
          return 'Nesta função';
        case 'tacticalFit':
          return 'Encaixe tático';
        default:
          return 'No plano atual';
      }
    })();
  return (
    <span
      className="rating-badge"
      data-compact={compact || undefined}
      data-rating-kind={rating.ratingKind}
      aria-label={`${label}: ${rating.perceived.label}; confiança do rating ${rating.confidence}%`}
    >
      <strong>
        <EstimatedRange value={rating.perceived} />
      </strong>
      <small>{label}</small>
    </span>
  );
}

export function RatingBreakdown({ rating }: { readonly rating: ExplainableRating }) {
  const referenceLabel =
    rating.ratingKind === 'coachRole'
      ? 'Cargo avaliado'
      : rating.ratingKind === 'position'
        ? 'Posição avaliada'
        : rating.ratingKind === 'role'
          ? 'Função avaliada'
          : rating.ratingKind === 'tacticalFit'
            ? 'Plano avaliado'
            : rating.ratingKind === 'currentAbility'
              ? 'Métrica estrutural'
              : 'Posição e função avaliadas';
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
          <ConfidenceIndicator confidence={rating.confidence} label="Confiança do rating" />
        </header>
        <dl className="rating-breakdown__facts">
          <div>
            <dt>{referenceLabel}</dt>
            <dd>{rating.contextLabel}</dd>
          </div>
          <div>
            <dt>Rating calculado</dt>
            <dd>{rating.perceived.label}</dd>
          </div>
          <div>
            <dt>Versão da fórmula</dt>
            <dd>{rating.scaleVersion}</dd>
          </div>
        </dl>
        <h4>Fatores mais relevantes</h4>
        <ul aria-label="Fatores mais relevantes do rating">
          {rating.factors.map((factor) => (
            <li data-impact={factor.impact} key={factor.factorId}>
              <span>
                <strong>{factor.label}</strong>
                <small>{factor.explanation}</small>
              </span>
              <span>
                <b>Nota do fator {factor.value}</b>
                <small>
                  Peso {factor.weight}% · contribuição {factor.contribution.toLocaleString('pt-BR')}
                </small>
              </span>
            </li>
          ))}
        </ul>
        <div className="rating-breakdown__assessment">
          <section>
            <h4>Pontos fortes</h4>
            <p>
              {rating.factors
                .filter((factor) => factor.impact === 'positive')
                .map((factor) => factor.label)
                .join(' · ') || 'Nenhum fator positivo dominante nesta avaliação.'}
            </p>
          </section>
          <section>
            <h4>Limitações</h4>
            <p>
              {rating.factors
                .filter((factor) => factor.impact === 'negative')
                .map((factor) => factor.label)
                .join(' · ') || 'Nenhuma limitação dominante identificada nos fatores disponíveis.'}
            </p>
          </section>
        </div>
        <footer>
          <span>Fonte: {rating.source}</span>
          <span>Atualizado em {formatDate(rating.updatedAt)}</span>
        </footer>
      </div>
    </details>
  );
}

export function AttributeGroup({ group }: { readonly group: AttributeGroupProjection }) {
  const visualValue = (value: KnowledgeValue) => {
    if (value.value !== null) return value.value;
    if (value.minimum !== null && value.maximum !== null) {
      return Math.round((value.minimum + value.maximum) / 2);
    }
    if (value.kind === 'qualitative') {
      return (
        {
          Excelente: 90,
          'Muito bom': 75,
          Bom: 65,
          Regular: 55,
          'Abaixo da média': 40,
        }[value.label] ?? 50
      );
    }
    return 0;
  };
  const radarPoints = group.attributes.map((attribute, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / group.attributes.length;
    const radius = (visualValue(attribute.perceived) / 100) * 68;
    return `${80 + Math.cos(angle) * radius},${80 + Math.sin(angle) * radius}`;
  });
  return (
    <section className="attribute-group" aria-labelledby={`attribute-${group.category}`}>
      <header className="attribute-group__header">
        <div>
          <h3 id={`attribute-${group.category}`}>{group.label}</h3>
          <p>Conhecimento esportivo disponível para esta avaliação.</p>
        </div>
        <span>{group.attributes.length} atributos</span>
      </header>
      <div className="attribute-group__body">
        <dl className="attribute-list">
          {group.attributes.map((attribute) => {
            const amount = visualValue(attribute.perceived);
            const status =
              attribute.perceived.kind === 'exact'
                ? 'Valor conhecido'
                : attribute.perceived.kind === 'unknown'
                  ? 'Ainda não observado'
                  : 'Estimativa do conhecimento atual';
            const tooltip = `${attribute.description}\n${status}: ${attribute.perceived.label}\nConfiança: ${attribute.confidence}%\nFonte: ${attribute.source}\nAtualizado em ${formatDate(attribute.updatedAt)}`;
            return (
              <div data-knowledge={attribute.perceived.kind} key={attribute.attributeId}>
                <dt>
                  <Tooltip content={tooltip}>
                    <button
                      aria-label={`${attribute.label}. Abrir definição e origem da avaliação`}
                      className="attribute-list__label"
                      type="button"
                    >
                      <span>{attribute.label}</span>
                      <Icon aria-hidden name="information" size={16} />
                    </button>
                  </Tooltip>
                </dt>
                <dd>
                  <span className="attribute-list__value">
                    <EstimatedRange value={attribute.perceived} />
                  </span>
                  <span
                    aria-hidden="true"
                    className="attribute-list__track"
                    style={{ '--attribute-value': `${amount}%` } as CSSProperties}
                  >
                    <i />
                  </span>
                  <small aria-label={`Confiança da avaliação: ${attribute.confidence}%`}>
                    {attribute.confidence}% confiança
                  </small>
                </dd>
              </div>
            );
          })}
        </dl>
        {group.attributes.length === 6 && (
          <figure className="attribute-radar" aria-label={`Radar de ${group.label.toLowerCase()}`}>
            <svg aria-hidden="true" viewBox="0 0 160 160">
              {[25, 50, 75, 100].map((level) => {
                const radius = (level / 100) * 68;
                const points = group.attributes
                  .map((_, index) => {
                    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / 6;
                    return `${80 + Math.cos(angle) * radius},${80 + Math.sin(angle) * radius}`;
                  })
                  .join(' ');
                return <polygon key={level} points={points} />;
              })}
              {group.attributes.map((attribute, index) => {
                const angle = -Math.PI / 2 + (Math.PI * 2 * index) / 6;
                return (
                  <line
                    key={attribute.attributeId}
                    x1="80"
                    x2={80 + Math.cos(angle) * 68}
                    y1="80"
                    y2={80 + Math.sin(angle) * 68}
                  />
                );
              })}
              <polygon className="attribute-radar__value" points={radarPoints.join(' ')} />
            </svg>
            <figcaption>Forma relativa dos atributos conhecidos</figcaption>
          </figure>
        )}
      </div>
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
        <RatingBadge compact displayLabel="OVR atual" rating={profile.currentAbility} />
      </header>
      <KnowledgeState
        confidence={profile.knowledge.confidence}
        level={profile.knowledge.knowledgeLevel}
        source={profile.knowledge.source}
        updatedAt={profile.knowledge.updatedAt}
      />
      <dl className="player-inspector__facts">
        <div>
          <dt>OVR atual</dt>
          <dd>
            <EstimatedRange value={profile.currentAbility.perceived} />
          </dd>
        </div>
        <div>
          <dt>No plano atual</dt>
          <dd>
            <EstimatedRange value={profile.contextualRating.perceived} />
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
          <dt>Potencial estimado</dt>
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
        <RatingBadge
          compact
          displayLabel={`Avaliação como ${profile.role.toLocaleLowerCase('pt-BR')}`}
          rating={profile.contextualRating}
        />
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
