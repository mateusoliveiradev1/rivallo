import { convertFileSrc, invoke } from '@tauri-apps/api/core';

export interface WorldAssetReference {
  readonly id: string;
  readonly entityId: string | null;
  readonly kind: string;
  readonly path: string;
  readonly mediaType: string;
  readonly checksum: string;
  readonly provenance: string;
  readonly rights: string;
  readonly privateUse: boolean;
  readonly sourcePackageId?: string | null;
  readonly runtimeSource?: string | null;
}

export interface WorldNationReference {
  readonly id: string;
  readonly name: string;
  readonly iso2: string;
  readonly iso3: string;
  readonly aliases: readonly string[];
  readonly confederationId: string | null;
  readonly flagAssetId: string | null;
  readonly externalIds: readonly { readonly source: string; readonly externalId: string }[];
}

export interface WorldReferenceCatalog {
  readonly assets: readonly WorldAssetReference[];
  readonly nations: readonly WorldNationReference[];
}

const bundledAssetSources = import.meta.glob('./assets/**/*.{svg,webp}', {
  eager: true,
  import: 'default',
  query: '?url',
}) as Readonly<Record<string, string>>;

const EMPTY_CATALOG: WorldReferenceCatalog = { assets: [], nations: [] };
let activeCatalog = EMPTY_CATALOG;

const bundledSourceFor = (path: string): string | null =>
  bundledAssetSources[`./${path.replaceAll('\\', '/')}`] ?? null;

const sourceFor = (asset: WorldAssetReference): string | null =>
  asset.runtimeSource ? convertFileSrc(asset.runtimeSource) : bundledSourceFor(asset.path);

export const resolveAssetByIdFromCatalog = (
  catalog: WorldReferenceCatalog,
  assetId: string,
): string | null => {
  const asset = catalog.assets.find(({ id }) => id === assetId);
  return asset ? sourceFor(asset) : null;
};

export const resolveEntityAssetFromCatalog = (
  catalog: WorldReferenceCatalog,
  entityId: string,
  kind: string,
): string | null => {
  const asset = catalog.assets.find(
    (candidate) => candidate.entityId === entityId && candidate.kind === kind,
  );
  return asset ? sourceFor(asset) : null;
};

export const configureWorldReferenceCatalog = (catalog: WorldReferenceCatalog): void => {
  activeCatalog = {
    assets: [...catalog.assets],
    nations: [...catalog.nations],
  };
};

export const getWorldReferenceCatalog = (): WorldReferenceCatalog => activeCatalog;

export const resolveWorldAssetById = (assetId: string): string | null => {
  return resolveAssetByIdFromCatalog(activeCatalog, assetId);
};

export const resolveWorldEntityAsset = (entityId: string, kind: string): string | null => {
  return resolveEntityAssetFromCatalog(activeCatalog, entityId, kind);
};

export const loadWorldReferenceCatalog = async (): Promise<WorldReferenceCatalog> =>
  invoke<WorldReferenceCatalog>('world_reference_catalog');

export const loadWorldReferenceCatalogForSelection = async (
  packageIds: readonly string[],
): Promise<WorldReferenceCatalog> =>
  invoke<WorldReferenceCatalog>('world_reference_catalog_for_selection', {
    packageIds,
  });

export const initializeWorldReferenceCatalog = async (): Promise<void> => {
  try {
    configureWorldReferenceCatalog(await loadWorldReferenceCatalog());
  } catch {
    configureWorldReferenceCatalog(EMPTY_CATALOG);
  }
};
