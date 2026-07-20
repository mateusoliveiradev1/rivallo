import { useMemo, useRef, useState } from 'react';

import { Button } from '../ui/primitives/actions.js';
import type { CommunityChange, ModAuthoringWorld } from './types.js';

type CsvEntity = 'nation' | 'city' | 'stadium' | 'club' | 'player';

const templates: Record<CsvEntity, string[]> = {
  nation: ['internalId', 'name', 'iso2', 'iso3'],
  city: ['internalId', 'name', 'nationId', 'regionId'],
  stadium: ['internalId', 'name', 'cityId', 'capacity', 'ownerClubId'],
  club: [
    'internalId',
    'name',
    'shortName',
    'nationId',
    'cityId',
    'competitionId',
    'stadiumId',
    'primaryColor',
  ],
  player: [
    'internalId',
    'externalId',
    'fullName',
    'knownName',
    'clubId',
    'nationality',
    'birthDate',
    'position',
    'shirtNumber',
    'currentAbility',
    'potential',
  ],
};

const parseCsv = (text: string) => {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]!;
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        value += '"';
        index += 1;
      } else quoted = !quoted;
    } else if (character === ',' && !quoted) {
      row.push(value.trim());
      value = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && text[index + 1] === '\n') index += 1;
      row.push(value.trim());
      value = '';
      if (row.some(Boolean)) rows.push(row);
      row = [];
    } else value += character;
  }
  row.push(value.trim());
  if (row.some(Boolean)) rows.push(row);
  const [headers = [], ...data] = rows;
  return data.map((values) =>
    Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])),
  );
};

const slug = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '');
const numeric = (value: string, fallback: number) =>
  Number.isFinite(Number(value)) ? Number(value) : fallback;

const toChange = (
  entity: CsvEntity,
  row: Record<string, string>,
  index: number,
  world: ModAuthoringWorld,
): CommunityChange => {
  const id =
    row.internalId ||
    `community.csv.${entity}.${slug(row.name || row.knownName || String(index + 1))}`;
  const common = {
    id: `${entity}:${id}`,
    kind: entity,
    operation: 'create' as const,
    targetId: id,
    asset: null,
  };
  if (entity === 'nation') {
    const value = {
      id,
      name: row.name,
      iso2: row.iso2.toUpperCase(),
      iso3: row.iso3.toUpperCase(),
    };
    return {
      ...common,
      label: value.name,
      summary: `${value.iso2} · ${value.iso3}`,
      patches: [
        {
          operation: 'add',
          entityKind: 'nation',
          targetId: id,
          entity: { kind: 'nation', value },
          reason: 'Importação CSV revisada pelo autor',
        },
      ],
    };
  }
  if (entity === 'city') {
    const value = { id, name: row.name, nationId: row.nationId, regionId: row.regionId || null };
    return {
      ...common,
      label: value.name,
      summary: `Nação ${value.nationId}`,
      patches: [
        {
          operation: 'add',
          entityKind: 'city',
          targetId: id,
          entity: { kind: 'city', value },
          reason: 'Importação CSV revisada pelo autor',
        },
      ],
    };
  }
  if (entity === 'stadium') {
    const value = {
      id,
      name: row.name,
      cityId: row.cityId,
      ownerClubId: row.ownerClubId || null,
      capacity: numeric(row.capacity, 10000),
      assetId: null,
    };
    return {
      ...common,
      label: value.name,
      summary: `${value.capacity.toLocaleString('pt-BR')} lugares`,
      patches: [
        {
          operation: 'add',
          entityKind: 'stadium',
          targetId: id,
          entity: { kind: 'stadium', value },
          reason: 'Importação CSV revisada pelo autor',
        },
      ],
    };
  }
  if (entity === 'club') {
    const city = world.cities?.find((item) => item.id === row.cityId);
    const nation = world.nations.find((item) => item.id === row.nationId);
    const competition = world.competitions?.find((item) => item.id === row.competitionId);
    const stadium = world.stadiums?.find((item) => item.id === row.stadiumId);
    const value = {
      id,
      name: row.name,
      shortName: row.shortName.toUpperCase(),
      city: city?.name ?? '',
      primaryColor: row.primaryColor || '#36d39a',
      countryCode: nation?.iso2 ?? null,
      competitionName: competition?.name ?? null,
      stadiumName: stadium?.name ?? null,
      nationId: row.nationId || null,
      cityId: row.cityId || null,
      competitionId: row.competitionId || null,
      stadiumId: row.stadiumId || null,
      crestAssetId: null,
      historySummary: null,
    };
    return {
      ...common,
      label: value.name,
      summary: `${value.shortName} · ${value.city}`,
      patches: [
        {
          operation: 'add',
          entityKind: 'club',
          targetId: id,
          entity: { kind: 'club', value },
          reason: 'Importação CSV revisada pelo autor',
        },
      ],
    };
  }
  const club = world.clubs.find((item) => item.id === row.clubId) ?? world.clubs[0];
  const position = row.position || 'CM';
  const rating = numeric(row.currentAbility, 50);
  const profile = {
    identity: {
      entityId: id,
      fullName: row.fullName,
      knownName: row.knownName,
      nationality: row.nationality,
      birthDate: row.birthDate,
      age: Math.max(15, new Date().getUTCFullYear() - numeric(row.birthDate.slice(0, 4), 2000)),
      clubId: club?.id ?? row.clubId,
      clubName: club?.name ?? row.clubId,
      clubShortName: club?.shortName ?? '---',
      clubPrimaryColor: club?.primaryColor ?? '#36d39a',
    },
    shirtNumber: numeric(row.shirtNumber, 20),
    heightCm: 178,
    weightKg: 74,
    preferredFoot: 'right',
    squadRole: 'rotation',
    naturalPosition: position,
    attributes:
      position === 'GK'
        ? {
            model: 'goalkeeper',
            reaction: rating,
            positioning: rating,
            handling: rating,
            mobility: rating,
            rushingOut: rating,
            distribution: rating,
          }
        : {
            model: 'outfield',
            finishing: rating,
            technique: rating,
            passing: rating,
            tackling: rating,
            physical: rating,
            pace: rating,
          },
    internalPotential: numeric(row.potential, Math.min(100, rating + 5)),
    contract: {
      clubId: club?.id ?? row.clubId,
      startedAt: '2026-07-01',
      expiresAt: '2029-06-30',
      squadStatus: 'rotation',
    },
  };
  const value = {
    profile,
    condition: 100,
    matchFitness: 100,
    appearances: 0,
    goals: 0,
    assists: 0,
    averageRating: null,
  };
  return {
    ...common,
    label: row.knownName,
    summary: `${club?.name ?? row.clubId} · ${position} · ${rating}`,
    patches: [
      {
        operation: 'add',
        entityKind: 'externalPlayer',
        targetId: id,
        entity: { kind: 'externalPlayer', value },
        reason: `Importação CSV${row.externalId ? ` · externalId ${row.externalId}` : ''}`,
      },
    ],
  };
};

export function CsvImport({
  world,
  onImport,
  onRollback,
}: {
  readonly world: ModAuthoringWorld;
  readonly onImport: (changes: readonly CommunityChange[]) => void;
  readonly onRollback: (ids: readonly string[]) => void;
}) {
  const [entity, setEntity] = useState<CsvEntity>('player');
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [profileName, setProfileName] = useState('Mapeamento padrão');
  const [lastBatch, setLastBatch] = useState<string[]>([]);
  const input = useRef<HTMLInputElement>(null);
  const diagnostics = useMemo(
    () =>
      rows.flatMap((row, index) => {
        const missing = templates[entity].filter(
          (field) =>
            field !== 'externalId' &&
            field !== 'regionId' &&
            field !== 'ownerClubId' &&
            !row[field],
        );
        return missing.length ? [`Linha ${index + 2}: ${missing.join(', ')} ausente(s).`] : [];
      }),
    [entity, rows],
  );
  const downloadTemplate = () => {
    const blob = new Blob([`${templates[entity].join(',')}\n`], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `rivallo-${entity}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };
  const commit = () => {
    const changes = rows.map((row, index) => toChange(entity, row, index, world));
    onImport(changes);
    setLastBatch(changes.map((change) => change.id));
  };
  return (
    <section className="csv-import" aria-labelledby="csv-import-title">
      <header>
        <div>
          <span>Importação em massa</span>
          <h2 id="csv-import-title">CSV com preview, identidade e rollback</h2>
          <p>
            Atualizações usam apenas internalId ou externalId explícito — nunca coincidência de
            nome.
          </p>
        </div>
        <Button onClick={downloadTemplate} variant="secondary">
          Baixar template
        </Button>
      </header>
      <div className="csv-import__setup studio-form-grid">
        <label>
          Entidade
          <select
            onChange={(event) => {
              setEntity(event.target.value as CsvEntity);
              setRows([]);
            }}
            value={entity}
          >
            <option value="nation">Nações</option>
            <option value="city">Cidades</option>
            <option value="stadium">Estádios</option>
            <option value="club">Clubes</option>
            <option value="player">Jogadores</option>
          </select>
        </label>
        <label>
          Perfil de mapeamento
          <input onChange={(event) => setProfileName(event.target.value)} value={profileName} />
          <small>Persistido junto ao projeto após salvar.</small>
        </label>
        <input
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void file.text().then((text) => setRows(parseCsv(text)));
          }}
          ref={input}
          type="file"
        />
        <Button onClick={() => input.current?.click()} variant="primary">
          Selecionar CSV
        </Button>
      </div>
      {rows.length > 0 && (
        <>
          <div className="csv-import__summary">
            <strong>{rows.length.toLocaleString('pt-BR')} registros</strong>
            <span>{templates[entity].length} colunas mapeadas</span>
            <span>{diagnostics.length} pendência(s)</span>
          </div>
          <div className="csv-table-wrap">
            <table>
              <thead>
                <tr>
                  {templates[entity].map((header) => (
                    <th key={header}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 12).map((row, index) => (
                  <tr key={index}>
                    {templates[entity].map((header) => (
                      <td key={header}>{row[header] || '—'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > 12 && (
            <p className="studio-muted">
              Amostra de 12 registros. Todos os {rows.length.toLocaleString('pt-BR')} serão
              processados em lote.
            </p>
          )}
          {diagnostics.length > 0 && (
            <details className="csv-diagnostics">
              <summary>Ver pendências</summary>
              <ul>
                {diagnostics.slice(0, 30).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </details>
          )}
          <div className="csv-import__actions">
            <Button disabled={diagnostics.length > 0} onClick={commit} variant="primary">
              Revisar e importar {rows.length.toLocaleString('pt-BR')}
            </Button>
            {lastBatch.length > 0 && (
              <Button
                onClick={() => {
                  onRollback(lastBatch);
                  setLastBatch([]);
                }}
                variant="secondary"
              >
                Desfazer último lote
              </Button>
            )}
          </div>
        </>
      )}
    </section>
  );
}
