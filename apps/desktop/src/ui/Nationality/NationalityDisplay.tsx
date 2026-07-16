import { Fragment, useState } from 'react';

import { Tooltip } from '../primitives/disclosure.js';
import { resolveNationalityCodes, type ResolvedCountryCode } from './country-catalog.js';
import './NationalityDisplay.css';

export interface NationalityDisplayProps {
  readonly codes: readonly string[];
  readonly className?: string;
  readonly enableKeyboardTooltip?: boolean;
}

interface ResolvedNationalityDisplayProps {
  readonly countries: readonly ResolvedCountryCode[];
  readonly className?: string;
  readonly enableKeyboardTooltip?: boolean;
}

function NationalityItem({
  country,
  enableKeyboardTooltip,
}: {
  readonly country: ResolvedCountryCode;
  readonly enableKeyboardTooltip: boolean;
}) {
  const [flagFailed, setFlagFailed] = useState(false);
  const accessibleLabel = country.known
    ? `${country.countryName}, código ${country.displayCode}`
    : country.countryName;

  return (
    <span
      className="rv-nationality__item"
      data-country-code={
        country.iso2 ?? (country.displayCode === '—' ? 'unknown' : country.displayCode)
      }
      data-known={country.known || undefined}
    >
      {country.flagSrc && !flagFailed && (
        <img
          alt=""
          aria-hidden="true"
          className="rv-nationality__flag"
          draggable={false}
          height={14}
          onError={() => setFlagFailed(true)}
          src={country.flagSrc}
          width={20}
        />
      )}
      <Tooltip content={country.countryName}>
        <abbr
          aria-label={accessibleLabel}
          className="rv-nationality__code"
          tabIndex={enableKeyboardTooltip ? 0 : undefined}
        >
          {country.displayCode}
        </abbr>
      </Tooltip>
    </span>
  );
}

/** Shared presentational boundary used by product surfaces and legacy wrappers. */
export function ResolvedNationalityDisplay({
  countries,
  className,
  enableKeyboardTooltip = false,
}: ResolvedNationalityDisplayProps) {
  const displayedCountries =
    countries.length > 0 ? countries.slice(0, 2) : resolveNationalityCodes([]);

  return (
    <span
      className={['rv-nationality', className].filter(Boolean).join(' ')}
      data-nationality-count={displayedCountries.length}
    >
      {displayedCountries.map((country, index) => (
        <Fragment key={`${country.key}:${country.flagSrc ?? 'no-flag'}`}>
          {index > 0 && (
            <span aria-hidden="true" className="rv-nationality__separator">
              /
            </span>
          )}
          <NationalityItem country={country} enableKeyboardTooltip={enableKeyboardTooltip} />
        </Fragment>
      ))}
    </span>
  );
}

/** Resolves legacy/ISO aliases and renders one or two unique nationalities. */
export function NationalityDisplay({
  codes,
  className,
  enableKeyboardTooltip = false,
}: NationalityDisplayProps) {
  return (
    <ResolvedNationalityDisplay
      className={className}
      countries={resolveNationalityCodes(codes)}
      enableKeyboardTooltip={enableKeyboardTooltip}
    />
  );
}
