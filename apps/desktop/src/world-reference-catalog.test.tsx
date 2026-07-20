import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PlayerFace } from './matchday/PlayerFace.js';
import { CoachFace } from './profiles/CoachFace.js';
import {
  configureWorldReferenceCatalog,
  loadWorldReferenceCatalog,
  resolveWorldEntityAsset,
  type WorldReferenceCatalog,
} from './world-reference-catalog.js';

const catalog: WorldReferenceCatalog = {
  assets: [
    {
      id: 'asset.player.rv-01.portrait',
      entityId: 'rv-01',
      kind: 'playerPortrait',
      path: 'assets/player-faces/rv-01.webp',
      mediaType: 'image/webp',
      checksum: 'test',
      provenance: 'test',
      rights: 'test',
      privateUse: false,
    },
    {
      id: 'asset.coach.aurora.portrait',
      entityId: 'coach.aurora.head',
      kind: 'coachPortrait',
      path: 'assets/coach-faces/helena-sampaio.webp',
      mediaType: 'image/webp',
      checksum: 'test',
      provenance: 'test',
      rights: 'test',
      privateUse: false,
    },
  ],
  nations: [],
};

describe('world reference catalog', () => {
  beforeEach(() => {
    configureWorldReferenceCatalog(catalog);
  });

  it('resolves bundled assets only through the package entity ID and declared kind', () => {
    expect(resolveWorldEntityAsset('rv-01', 'playerPortrait')).toContain('rv-01.webp');
    expect(resolveWorldEntityAsset('rv-02', 'playerPortrait')).toBeNull();
    expect(resolveWorldEntityAsset('rv-01', 'coachPortrait')).toBeNull();
  });

  it('prefers a backend-validated runtime source for future active local packages', () => {
    const convertFileSrc = vi.fn((path: string) => `asset://localhost/${path}`);
    Object.assign(window, { __TAURI_INTERNALS__: { convertFileSrc } });
    configureWorldReferenceCatalog({
      assets: [
        {
          ...catalog.assets[0],
          sourcePackageId: 'community.example.portraits',
          runtimeSource: 'C:/safe-catalog/community.example.portraits/assets/player.webp',
        },
      ],
      nations: [],
    });

    expect(resolveWorldEntityAsset('rv-01', 'playerPortrait')).toContain(
      'community.example.portraits/assets/player.webp',
    );
    expect(convertFileSrc).toHaveBeenCalledOnce();
  });

  it('renders portraits by stable entity ID and keeps accessible fallbacks', () => {
    const player = render(<PlayerFace entityId="rv-01" name="Léo Martins" />);
    expect(player.container.querySelector('img')?.getAttribute('src')).toContain('rv-01.webp');
    player.unmount();

    const coach = render(<CoachFace entityId="coach.unknown" name="Treinador Sem Retrato" />);
    expect(coach.container.querySelector('img')).toBeNull();
    expect(coach.getByText('TS')).toBeInstanceOf(HTMLElement);
  });

  it('loads the catalog from the desktop boundary', async () => {
    const invoke = vi.fn().mockResolvedValue(catalog);
    Object.assign(window, { __TAURI_INTERNALS__: { invoke } });
    await expect(loadWorldReferenceCatalog()).resolves.toEqual(catalog);
    expect(invoke).toHaveBeenCalledWith('world_reference_catalog', {}, undefined);
  });
});
