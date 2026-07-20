import type { MouseEvent, ReactNode } from 'react';

import { NationalityDisplay } from '../ui/Nationality/index.js';
import { resolveCountryCode } from '../ui/Nationality/country-catalog.js';
import type { EntityProfileReference, ProfileRoute } from './types.js';
import { CoachFace } from './CoachFace.js';
import { PlayerFace } from '../matchday/PlayerFace.js';

export const entityPath = (route: ProfileRoute): string => {
  const segment =
    route.kind === 'player'
      ? 'players'
      : route.kind === 'coach'
        ? 'coaches'
        : route.kind === 'club'
          ? 'clubs'
          : 'nations';
  return `/${segment}/${encodeURIComponent(route.entityId)}`;
};

export function EntityLink({
  route,
  onNavigate,
  children,
  className,
  ariaLabel,
}: {
  readonly route: ProfileRoute;
  readonly onNavigate: (route: ProfileRoute) => void;
  readonly children: ReactNode;
  readonly className?: string;
  readonly ariaLabel?: string;
}) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    event.preventDefault();
    onNavigate(route);
  };

  return (
    <a
      aria-label={ariaLabel}
      className={className ? `entity-link ${className}` : 'entity-link'}
      href={entityPath(route)}
      onClick={handleClick}
    >
      {children}
    </a>
  );
}

export function EntityFactStrip({
  facts,
}: {
  readonly facts: readonly {
    readonly label: string;
    readonly value: ReactNode;
    readonly muted?: boolean;
  }[];
}) {
  return (
    <dl className="entity-fact-strip">
      {facts.map((fact) => (
        <div data-muted={fact.muted || undefined} key={fact.label}>
          <dt>{fact.label}</dt>
          <dd>{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function NationalityEntityLink({
  code,
  onNavigate,
  enableKeyboardTooltip = false,
}: {
  readonly code: string;
  readonly onNavigate: (route: ProfileRoute) => void;
  readonly enableKeyboardTooltip?: boolean;
}) {
  const country = resolveCountryCode(code);
  const display = (
    <NationalityDisplay codes={[code]} enableKeyboardTooltip={enableKeyboardTooltip} />
  );
  if (!country.known || !country.iso3) return display;
  return (
    <EntityLink
      ariaLabel={`Abrir perfil de ${country.countryName}`}
      onNavigate={onNavigate}
      route={{ kind: 'nation', entityId: country.iso3.toLowerCase() }}
    >
      {display}
    </EntityLink>
  );
}

const routeForReference = (reference: EntityProfileReference): ProfileRoute => ({
  kind: reference.entityType,
  entityId: reference.entityId,
});

export function EntityReferenceList({
  references,
  onNavigate,
  emptyTitle,
  emptyBody,
}: {
  readonly references: readonly EntityProfileReference[];
  readonly onNavigate: (route: ProfileRoute) => void;
  readonly emptyTitle: string;
  readonly emptyBody: string;
}) {
  if (references.length === 0) {
    return (
      <section className="entity-empty-state" role="status">
        <strong>{emptyTitle}</strong>
        <p>{emptyBody}</p>
      </section>
    );
  }

  return (
    <ul className="entity-reference-list">
      {references.map((reference) => (
        <li key={`${reference.entityType}:${reference.entityId}`}>
          <EntityLink
            ariaLabel={`Abrir perfil de ${reference.name}`}
            onNavigate={onNavigate}
            route={routeForReference(reference)}
          >
            {reference.entityType === 'coach' ? (
              <CoachFace decorative entityId={reference.entityId} name={reference.name} size={36} />
            ) : reference.entityType === 'player' ? (
              <PlayerFace
                decorative
                entityId={reference.entityId}
                name={reference.name}
                size={36}
              />
            ) : (
              <span aria-hidden="true" className="entity-reference-list__visual">
                {reference.visualCode}
              </span>
            )}
            <span className="entity-reference-list__identity">
              <strong>{reference.name}</strong>
              <small>{reference.secondaryLabel}</small>
              {reference.contract && <small>Contrato até {reference.contract.expiresAt}</small>}
            </span>
            {reference.nationality && <NationalityDisplay codes={[reference.nationality]} />}
            <span
              className="entity-reference-list__knowledge"
              data-metric-kind={
                reference.entityType === 'player'
                  ? 'current-ability'
                  : reference.entityType === 'coach'
                    ? 'reputation'
                    : undefined
              }
            >
              {reference.perceivedRating
                ? `${reference.entityType === 'player' ? 'OVR' : reference.entityType === 'coach' ? 'Reputação' : 'Avaliação'} ${reference.perceivedRating.label}`
                : 'Perfil sem avaliação numérica'}
              {reference.confidence !== null && (
                <small>Confiança cadastral: {reference.confidence}%</small>
              )}
            </span>
          </EntityLink>
        </li>
      ))}
    </ul>
  );
}
