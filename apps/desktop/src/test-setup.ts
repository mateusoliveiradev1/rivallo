import { beforeEach } from 'vitest';

import {
  configureWorldReferenceCatalog,
  type WorldAssetReference,
  type WorldNationReference,
} from './world-reference-catalog.js';

const asset = (
  id: string,
  entityId: string,
  kind: string,
  path: string,
  mediaType: string,
): WorldAssetReference => ({
  id,
  entityId,
  kind,
  path,
  mediaType,
  checksum: 'test-fixture',
  provenance: 'Rivallo test fixture',
  rights: 'test-only',
  privateUse: false,
});

const nation = (
  id: string,
  name: string,
  iso2: string,
  iso3: string,
  aliases: readonly string[],
): WorldNationReference => ({
  id,
  name,
  iso2,
  iso3,
  aliases,
  confederationId: null,
  flagAssetId: `asset.flag.${iso2.toLocaleLowerCase('en-US')}`,
  externalIds: [],
});

beforeEach(() => {
  configureWorldReferenceCatalog({
    assets: [
      asset('asset.flag.br', 'bra', 'nationFlag', 'assets/flags/br.svg', 'image/svg+xml'),
      asset('asset.flag.ar', 'arg', 'nationFlag', 'assets/flags/ar.svg', 'image/svg+xml'),
      asset('asset.flag.uy', 'ury', 'nationFlag', 'assets/flags/uy.svg', 'image/svg+xml'),
      asset('asset.flag.pt', 'prt', 'nationFlag', 'assets/flags/pt.svg', 'image/svg+xml'),
      asset(
        'asset.player.rv-01.portrait',
        'rv-01',
        'playerPortrait',
        'assets/player-faces/rv-01.webp',
        'image/webp',
      ),
      asset(
        'asset.coach.aurora.portrait',
        'coach.aurora.head',
        'coachPortrait',
        'assets/coach-faces/helena-sampaio.webp',
        'image/webp',
      ),
    ],
    nations: [
      nation('bra', 'Brasil', 'BR', 'BRA', ['BR', 'BRA']),
      nation('arg', 'Argentina', 'AR', 'ARG', ['AR', 'ARG']),
      nation('ury', 'Uruguai', 'UY', 'URY', ['UY', 'URY', 'URU']),
      nation('prt', 'Portugal', 'PT', 'PRT', ['PT', 'PRT', 'POR']),
    ],
  });
});
