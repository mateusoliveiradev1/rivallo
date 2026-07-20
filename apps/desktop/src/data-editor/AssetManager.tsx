import { useRef, useState } from 'react';

import {
  defaultPortraitRecipe,
  randomizePortrait,
  renderPortraitUpload,
} from '../portrait/PortraitEngine.js';
import { Button } from '../ui/primitives/actions.js';
import type { AuthoringAssetUpload, CommunityChange, ModAuthoringWorld } from './types.js';

const extensions: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpeg',
  'image/webp': 'webp',
};

export function AssetManager({
  world,
  author,
  onUpsert,
}: {
  readonly world: ModAuthoringWorld;
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
      kind: 'coachPortrait' as const,
    })),
  ];
  const entities = [
    ...world.clubs.map((item) => ({ id: item.id, label: item.name, kind: 'clubCrest' as const })),
    ...people,
    ...(world.competitions ?? []).map((item) => ({
      id: item.id,
      label: item.name,
      kind: 'competitionLogo' as const,
    })),
  ];
  const [entityId, setEntityId] = useState(entities[0]?.id ?? '');
  const [selectedPeople, setSelectedPeople] = useState<string[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState('');
  const cancelled = useRef(false);

  const addAsset = (asset: AuthoringAssetUpload, label: string) =>
    onUpsert({
      id: `asset:${asset.id}`,
      kind: 'asset',
      operation: 'create',
      targetId: asset.id,
      label,
      summary: `${asset.kind} · associado por ID`,
      patches: [],
      asset,
    });
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
