import argentinaFlag from '../../assets/flags/ar.svg';
import brazilFlag from '../../assets/flags/br.svg';
import portugalFlag from '../../assets/flags/pt.svg';
import uruguayFlag from '../../assets/flags/uy.svg';

export type KnownIsoCountryCode = 'AR' | 'BR' | 'PT' | 'UY';

export interface CountryCatalogEntry {
  readonly iso2: KnownIsoCountryCode;
  readonly iso3: 'ARG' | 'BRA' | 'PRT' | 'URY';
  readonly countryName: string;
  readonly flagSrc: string;
  readonly aliases: readonly string[];
}

export interface ResolvedCountryCode {
  readonly key: string;
  readonly normalizedInput: string;
  readonly iso2: KnownIsoCountryCode | null;
  readonly iso3: CountryCatalogEntry['iso3'] | null;
  readonly displayCode: string;
  readonly countryName: string;
  readonly flagSrc: string | null;
  readonly known: boolean;
}

export const countryCatalog: readonly CountryCatalogEntry[] = [
  {
    iso2: 'BR',
    iso3: 'BRA',
    countryName: 'Brasil',
    flagSrc: brazilFlag,
    aliases: ['BR', 'BRA'],
  },
  {
    iso2: 'AR',
    iso3: 'ARG',
    countryName: 'Argentina',
    flagSrc: argentinaFlag,
    aliases: ['AR', 'ARG'],
  },
  {
    iso2: 'UY',
    iso3: 'URY',
    countryName: 'Uruguai',
    flagSrc: uruguayFlag,
    aliases: ['UY', 'URY', 'URU'],
  },
  {
    iso2: 'PT',
    iso3: 'PRT',
    countryName: 'Portugal',
    flagSrc: portugalFlag,
    aliases: ['PT', 'PRT', 'POR'],
  },
] as const;

const countryByAlias = new Map(
  countryCatalog.flatMap((country) => country.aliases.map((alias) => [alias, country] as const)),
);

export const normalizeCountryCode = (code: string) => code.trim().toLocaleUpperCase('en-US');

const isDisplayableUnknownCode = (code: string) => /^[A-Z]{2,3}$/u.test(code);

export function resolveCountryCode(code: string): ResolvedCountryCode {
  const normalizedInput = normalizeCountryCode(code);
  const country = countryByAlias.get(normalizedInput);

  if (country) {
    return {
      key: `iso:${country.iso2}`,
      normalizedInput,
      iso2: country.iso2,
      iso3: country.iso3,
      displayCode: country.iso3,
      countryName: country.countryName,
      flagSrc: country.flagSrc,
      known: true,
    };
  }

  const displayCode = isDisplayableUnknownCode(normalizedInput) ? normalizedInput : '—';
  return {
    key: normalizedInput ? `unknown:${normalizedInput}` : 'unknown:empty',
    normalizedInput,
    iso2: null,
    iso3: null,
    displayCode,
    countryName:
      displayCode !== '—'
        ? `Nacionalidade não identificada (${displayCode})`
        : normalizedInput
          ? 'Nacionalidade não identificada'
          : 'Nacionalidade não informada',
    flagSrc: null,
    known: false,
  };
}

/** Resolves at most two unique nationalities while retaining first-seen order. */
export function resolveNationalityCodes(codes: readonly string[]): readonly ResolvedCountryCode[] {
  const source = codes.length > 0 ? codes : [''];
  const resolved: ResolvedCountryCode[] = [];
  const seen = new Set<string>();

  for (const code of source) {
    const country = resolveCountryCode(code);
    if (seen.has(country.key)) continue;
    seen.add(country.key);
    resolved.push(country);
    if (resolved.length === 2) break;
  }

  return resolved.length > 0 ? resolved : [resolveCountryCode('')];
}
