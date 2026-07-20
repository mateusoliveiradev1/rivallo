import { PlayerFace } from './PlayerFace.js';
import type { PitchMode } from './matchday-ui.js';
import type { Player } from './types.js';

export interface TacticalPrimaryMetric {
  readonly kind: 'ability' | 'context' | 'familiarity' | 'condition';
  readonly shortLabel: string;
  readonly value: string;
  readonly accessibleLabel: string;
}

export const tacticalPrimaryMetric = ({
  mode,
  player,
  familiarity,
  contextualRating,
}: {
  readonly mode: PitchMode;
  readonly player: Player;
  readonly familiarity: number;
  readonly contextualRating?: string;
}): TacticalPrimaryMetric => {
  if (mode === 'context') {
    const value = contextualRating ?? '—';
    return {
      kind: 'context',
      shortLabel: 'Plano',
      value,
      accessibleLabel: `No plano atual: ${contextualRating ?? 'avaliação indisponível'}`,
    };
  }
  if (mode === 'familiarity') {
    return {
      kind: 'familiarity',
      shortLabel: 'Fam.',
      value: `${familiarity}%`,
      accessibleLabel: `Familiaridade com o plano: ${familiarity}%`,
    };
  }
  if (mode === 'condition') {
    return {
      kind: 'condition',
      shortLabel: 'Físico',
      value: `${player.condition}%`,
      accessibleLabel: `Condição física: ${player.condition}%`,
    };
  }
  return {
    kind: 'ability',
    shortLabel: 'OVR',
    value: String(player.rating),
    accessibleLabel: `OVR ${player.rating}`,
  };
};

const conditionSummary = (condition: number) => {
  if (condition >= 90) return { label: 'Pronto', level: 'ready' } as const;
  if (condition >= 75) return { label: 'Atenção', level: 'attention' } as const;
  return { label: 'Limitado', level: 'limited' } as const;
};

export function TacticalPlayerCardContent({
  player,
  displayName,
  positionLabel,
  metric,
}: {
  readonly player: Player;
  readonly displayName: string;
  readonly positionLabel: string;
  readonly metric: TacticalPrimaryMetric;
}) {
  const condition = conditionSummary(player.condition);
  return (
    <>
      <span className="tactical-player-card__portrait" data-card-region="portrait">
        <PlayerFace decorative entityId={player.id} name={player.name} size={44} />
      </span>
      <span
        aria-label={`Camisa ${player.shirtNumber}`}
        className="tactical-player-card__shirt"
        data-card-region="shirt-number"
      >
        <span aria-hidden="true">#</span>
        {player.shirtNumber}
      </span>
      <span className="tactical-player-card__identity">
        <strong title={player.name}>{displayName}</strong>
        <small title={positionLabel}>{positionLabel}</small>
      </span>
      <span
        aria-label={metric.accessibleLabel}
        className="tactical-player-card__metric"
        data-card-region="primary-metric"
        data-metric-kind={metric.kind}
        title={metric.accessibleLabel}
      >
        <small aria-hidden="true">{metric.shortLabel}</small>
        <b aria-hidden="true">{metric.value}</b>
      </span>
      <span
        aria-label={`Condição física ${player.condition}%: ${condition.label}`}
        className="tactical-player-card__condition"
        data-condition-level={condition.level}
        title={`Condição física ${player.condition}%: ${condition.label}`}
      >
        <i aria-hidden="true" />
        <small aria-hidden="true">{condition.label}</small>
      </span>
    </>
  );
}
