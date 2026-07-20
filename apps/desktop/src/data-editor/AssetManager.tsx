import { useEffect, useMemo, useRef, useState } from 'react';

import {
  defaultPortraitRecipe,
  randomizePortrait,
  renderPortraitUpload,
} from '../portrait/PortraitEngine.js';
import { Button } from '../ui/primitives/actions.js';
import type {
  AuthoringAssetUpload,
  CommunityChange,
  GeneratedPackagePatch,
  ModAuthoringWorld,
} from './types.js';

const extensions: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpeg',
  'image/webp': 'webp',
};

export function AssetManager({
  world,
  assets,
  author,
  onUpsert,
}: {
  readonly world: ModAuthoringWorld;
  readonly assets: readonly AuthoringAssetUpload[];
  readonly author: string;
  readonly onUpsert: (change: CommunityChange) => void;
}) {
  const people = [
    ...world.players.map((item) => ({
      id: item.id,
      label: item.name,
      kind: 'playerPortrait' as const,
    })),
    ...world.coaches.map((item) => ({
      id: item.identity.entityId,
      label: item.identity.knownName,
      kind: item.role.toLowerCase().includes('principal')
        ? ('coachPortrait' as const)
        : ('staffPortrait' as const),
    })),
  ];
  const entities = useMemo(
    () => [
      ...world.clubs.map((item) => ({
        id: item.id,
        label: item.name,
        kind: 'clubCrest' as const,
        entityKind: 'club' as const,
        value: item,
      })),
      ...people,
      ...(world.competitions ?? []).map((item) => ({
        id: item.id,
        label: item.name,
        kind: 'competitionLogo' as const,
        entityKind: 'competition' as const,
        value: item,
      })),
      ...world.nations.map((item) => ({
        id: item.id,
        label: item.name,
        kind: 'nationFlag' as const,
        entityKind: 'nation' as const,
        value: item,
      })),
      ...(world.stadiums ?? []).map((item) => ({
        id: item.id,
        label: item.name,
        kind: 'stadiumImage' as const,
        entityKind: 'stadium' as const,
        value: item,
      })),
    ],
    [people, world.clubs, world.competitions, world.nations, world.stadiums],
  );
  const [entityId, setEntityId] = useState(entities[0]?.id ?? '');
  const [selectedPeople, setSelectedPeople] = useState<string[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState('');
  const [currentAssetId, setCurrentAssetId] = useState('');
  const [framing, setFraming] = useState(50);
  const cancelled = useRef(false);

  useEffect(() => {
    const current = assets.find((asset) => asset.entityId === entityId);
    setCurrentAssetId(current?.id ?? '');
    if (!current) {
      setPreview('');
      return;
    }
    const url = URL.createObjectURL(
      new Blob([new Uint8Array(current.bytes)], { type: current.mediaType }),
    );
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [assets, entityId]);

  const referencePatches = (
    assetId: string | null,
    target = entities.find((item) => item.id === entityId),
  ): GeneratedPackagePatch[] => {
    if (!target || !('entityKind' in target)) return [];
    const field =
      target.entityKind === 'club'
        ? 'crestAssetId'
        : target.entityKind === 'competition'
          ? 'logoAssetId'
          : target.entityKind === 'nation'
            ? 'flagAssetId'
            : 'assetId';
    return [
      {
        operation: 'replace',
        entityKind: target.entityKind,
        targetId: target.id,
        entity: { kind: target.entityKind, value: { ...target.value, [field]: assetId } },
        reason: assetId
          ? 'Asset associado no Creator Studio'
          : 'Asset desvinculado no Creator Studio',
      },
    ];
  };

  const addAsset = (asset: AuthoringAssetUpload, label: string) => {
    setCurrentAssetId(asset.id);
    const entity = entities.find((item) => item.id === asset.entityId);
    const changeKind: CommunityChange['kind'] =
      entity && 'entityKind' in entity ? entity.entityKind : 'asset';
    onUpsert({
      id: `asset:${asset.id}`,
      kind: changeKind,
      operation: 'create',
      targetId: asset.entityId,
      label,
      summary: `${asset.kind} · associado por ID`,
      patches: referencePatches(asset.id, entity),
      asset,
    });
  };
  const removeAsset = () => {
    if (!currentAssetId) return;
    const entity = entities.find((item) => item.id === entityId);
    onUpsert({
      id: `asset:${currentAssetId}`,
      kind: 'asset',
      operation: 'delete',
      targetId: entityId,
      label: entity?.label ?? 'Asset',
      summary: 'Imagem removida; o fallback visual será usado.',
      patches: referencePatches(null, entity),
      asset: null,
    });
    if (preview.startsWith('blob:')) URL.revokeObjectURL(preview);
    setPreview('');
    setCurrentAssetId('');
  };
  const upload = async (file: File | undefined) => {
    setError('');
    if (!file) return;
    if (!extensions[file.type] || file.size > 16 * 1024 * 1024) {
      setError('Use PNG, JPEG ou WebP com até 16 MB. SVG externo não é aceito.');
      return;
    }
    const entity = entities.find((item) => item.id === entityId);
    if (!entity) return;
    const bytes = [...new Uint8Array(await file.arrayBuffer())];
    if (preview.startsWith('blob:')) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
    addAsset(
      {
        id: `asset.${entity.id}.${entity.kind}`,
        entityId: entity.id,
        kind: entity.kind,
        path: `assets/${entity.kind}/${entity.id.replaceAll('.', '-')}.${extensions[file.type]}`,
        mediaType: file.type as AuthoringAssetUpload['mediaType'],
        bytes,
        provenance: `Asset associado por ${author.trim() || 'autor comunitário'}`,
        rights: 'Conteúdo fornecido pelo autor do mod',
      },
      entity.label,
    );
  };
  const generateBatch = async () => {
    cancelled.current = false;
    setProgress({ done: 0, total: selectedPeople.length });
    for (let index = 0; index < selectedPeople.length; index += 1) {
      if (cancelled.current) break;
      const person = people.find((item) => item.id === selectedPeople[index]);
      if (!person) continue;
      const recipe = randomizePortrait(defaultPortraitRecipe(), 'all', 1000 + index * 7919);
      const rendered = await renderPortraitUpload(recipe);
      if (index === 0) {
        if (preview.startsWith('blob:')) URL.revokeObjectURL(preview);
        setPreview(
          URL.createObjectURL(new Blob([new Uint8Array(rendered.bytes)], { type: 'image/png' })),
        );
      }
      addAsset(
        {
          id: `asset.${person.id}.${person.kind}`,
          entityId: person.id,
          kind: person.kind,
          path: `assets/${person.kind}/${person.id.replaceAll('.', '-')}.png`,
          mediaType: 'image/png',
          bytes: rendered.bytes,
          provenance: `Retrato procedural Rivallo · renderer ${recipe.rendererVersion} · seed ${recipe.seed}`,
          rights: 'Asset procedural original do projeto',
        },
        person.label,
      );
      setProgress({ done: index + 1, total: selectedPeople.length });
      await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
    }
  };
  return (
    <section className="asset-manager" aria-labelledby="asset-manager-title">
      <header>
        <div>
          <span>Asset Manager</span>
          <h2 id="asset-manager-title">Imagens ligadas por identidade estável</h2>
          <p>Preview, substituição e associação explícita — nunca por coincidência de nome.</p>
        </div>
      </header>
      <div className="asset-manager__grid">
        <section className="studio-panel">
          <h3>Adicionar ou substituir</h3>
          <label>
            Entidade
            <select onChange={(event) => setEntityId(event.target.value)} value={entityId}>
              {entities.map((item) => (
                <option key={`${item.kind}:${item.id}`} value={item.id}>
                  {item.label} · {item.kind}
                </option>
              ))}
            </select>
          </label>
          <label
            className="asset-dropzone"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              void upload(event.dataTransfer.files[0]);
            }}
          >
            Arraste uma imagem aqui
            <span>
              ou selecione PNG, JPEG ou WebP
              <input
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={(event) => void upload(event.target.files?.[0])}
                type="file"
              />
            </span>
          </label>
          {error && <p role="alert">{error}</p>}
          {preview && (
            <div className="asset-preview-suite">
              <div>
                <span>Perfil</span>
                <img
                  alt="Preview em perfil"
                  src={preview}
                  style={{ objectPosition: `50% ${framing}%` }}
                />
              </div>
              <div>
                <span>Card</span>
                <img
                  alt="Preview em card"
                  src={preview}
                  style={{ objectPosition: `50% ${framing}%` }}
                />
              </div>
              <div>
                <span>Mini-card</span>
                <img
                  alt="Preview na sidebar"
                  src={preview}
                  style={{ objectPosition: `50% ${framing}%` }}
                />
              </div>
            </div>
          )}
          {preview && (
            <label>
              Enquadramento vertical
              <input
                aria-label="Enquadramento vertical"
                max={100}
                min={0}
                onChange={(event) => setFraming(Number(event.target.value))}
                type="range"
                value={framing}
              />
            </label>
          )}
          {preview && (
            <div className="asset-preview-actions">
              <Button onClick={removeAsset} variant="secondary">
                Remover imagem
              </Button>
              <Button onClick={removeAsset} variant="secondary">
                Usar fallback
              </Button>
            </div>
          )}
        </section>
        <section className="studio-panel asset-library" aria-labelledby="asset-library-title">
          <div className="studio-panel__heading">
            <div>
              <h3 id="asset-library-title">Biblioteca do projeto</h3>
              <p>Imagens persistidas no rascunho e restauradas por identidade.</p>
            </div>
            <strong>{assets.length}</strong>
          </div>
          {assets.length === 0 ? (
            <p className="studio-empty">Nenhuma imagem adicionada. Escolha uma entidade ao lado.</p>
          ) : (
            <ul className="asset-library__list">
              {assets.map((asset) => {
                const entity = entities.find((item) => item.id === asset.entityId);
                return (
                  <li key={asset.id}>
                    <button onClick={() => setEntityId(asset.entityId)} type="button">
                      <strong>{entity?.label ?? asset.entityId}</strong>
                      <span>
                        {asset.kind} · {(asset.bytes.length / 1024).toFixed(1)} KB
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        <section className="studio-panel">
          <div className="studio-panel__heading">
            <div>
              <h3>Retratos em lote</h3>
              <p>Seeds únicos, processamento local e cancelável.</p>
            </div>
            <strong>{selectedPeople.length}</strong>
          </div>
          <div className="asset-people-list">
            {people.map((person) => (
              <label key={person.id}>
                <input
                  checked={selectedPeople.includes(person.id)}
                  onChange={(event) =>
                    setSelectedPeople((current) =>
                      event.target.checked
                        ? [...current, person.id]
                        : current.filter((id) => id !== person.id),
                    )
                  }
                  type="checkbox"
                />
                {person.label}
              </label>
            ))}
          </div>
          <div className="asset-batch-actions">
            <Button
              disabled={selectedPeople.length === 0 || progress?.done !== progress?.total}
              onClick={() => void generateBatch()}
              variant="primary"
            >
              Gerar retratos
            </Button>
            {progress && progress.done < progress.total && (
              <Button
                onClick={() => {
                  cancelled.current = true;
                }}
                variant="secondary"
              >
                Cancelar
              </Button>
            )}
          </div>
          {progress && (
            <progress
              aria-label="Progresso da geração"
              max={progress.total}
              value={progress.done}
            />
          )}
        </section>
      </div>
    </section>
  );
}
