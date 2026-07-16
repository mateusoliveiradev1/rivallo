import { describe, expect, it } from 'vitest';

import {
  countryCatalog,
  normalizeCountryCode,
  resolveCountryCode,
  resolveNationalityCodes,
} from './country-catalog.js';

describe('country catalog', () => {
  it.each([
    ['BR', 'BR', 'BRA', 'Brasil'],
    ['BRA', 'BR', 'BRA', 'Brasil'],
    ['AR', 'AR', 'ARG', 'Argentina'],
    ['ARG', 'AR', 'ARG', 'Argentina'],
    ['UY', 'UY', 'URY', 'Uruguai'],
    ['URY', 'UY', 'URY', 'Uruguai'],
    ['URU', 'UY', 'URY', 'Uruguai'],
    ['PT', 'PT', 'PRT', 'Portugal'],
    ['PRT', 'PT', 'PRT', 'Portugal'],
    ['POR', 'PT', 'PRT', 'Portugal'],
  ] as const)('resolves %s to canonical ISO codes', (input, iso2, iso3, countryName) => {
    expect(resolveCountryCode(input)).toMatchObject({
      iso2,
      iso3,
      displayCode: iso3,
      countryName,
      known: true,
    });
  });

  it('normalizes lowercase codes and surrounding whitespace', () => {
    expect(normalizeCountryCode('  por  ')).toBe('POR');
    expect(resolveCountryCode('  por  ')).toMatchObject({ iso2: 'PT', iso3: 'PRT' });
  });

  it('returns non-throwing visible fallbacks for unknown and empty codes', () => {
    expect(resolveCountryCode('zzz')).toMatchObject({
      displayCode: 'ZZZ',
      flagSrc: null,
      known: false,
    });
    expect(resolveCountryCode('   ')).toMatchObject({
      displayCode: '—',
      countryName: 'Nacionalidade não informada',
      flagSrc: null,
      known: false,
    });
    expect(resolveCountryCode('código-corrompido-comprido')).toMatchObject({
      displayCode: '—',
      countryName: 'Nacionalidade não identificada',
      flagSrc: null,
      known: false,
    });
  });

  it('deduplicates aliases and retains the first-seen order for two countries', () => {
    const resolved = resolveNationalityCodes([' por ', 'PT', 'bra']);
    expect(resolved.map(({ iso2 }) => iso2)).toEqual(['PT', 'BR']);
  });

  it('uses only bundled local assets', () => {
    expect(countryCatalog).toHaveLength(4);
    expect(countryCatalog.every(({ flagSrc }) => flagSrc.length > 0)).toBe(true);
    expect(countryCatalog.every(({ flagSrc }) => !/^https?:/u.test(flagSrc))).toBe(true);
  });
});
