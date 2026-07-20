import { getWorldReferenceCatalog, resolveWorldAssetById } from '../../world-reference-catalog.js';

export type KnownIsoCountryCode = string;

export interface CountryCatalogEntry {
  readonly nationId: string;
  readonly iso2: string;
  readonly iso3: string;
  readonly countryName: string;
  readonly flagSrc: string | null;
  readonly aliases: readonly string[];
}

export interface ResolvedCountryCode {
  readonly key: string;
  readonly normalizedInput: string;
  readonly iso2: string | null;
  readonly iso3: string | null;
  readonly displayCode: string;
  readonly countryName: string;
  readonly flagSrc: string | null;
  readonly known: boolean;
}

export const normalizeCountryCode = (code: string) => code.trim().toLocaleUpperCase('en-US');

export const getCountryCatalog = (): readonly CountryCatalogEntry[] =>
  getWorldReferenceCatalog().nations.map((nation) => ({
    nationId: nation.id,
    iso2: normalizeCountryCode(nation.iso2),
    iso3: normalizeCountryCode(nation.iso3),
    countryName: nation.name,
    flagSrc: nation.flagAssetId ? resolveWorldAssetById(nation.flagAssetId) : null,
    aliases: [nation.iso2, nation.iso3, ...nation.aliases].map(normalizeCountryCode),
  }));

const isDisplayableUnknownCode = (code: string) => /^[A-Z]{2,3}$/u.test(code);

export function resolveCountryCode(code: string): ResolvedCountryCode {
  const normalizedInput = normalizeCountryCode(code);
  const country = getCountryCatalog().find(({ aliases }) => aliases.includes(normalizedInput));

  if (country) {
    return {
      key: `nation:${country.nationId}`,
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
