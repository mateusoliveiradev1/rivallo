import { useMemo, useRef, useState } from 'react';

import { Button } from '../ui/primitives/actions.js';
import { projectAuthoringWorld } from './authoring-graph.js';
import type { CommunityChange, ModAuthoringWorld } from './types.js';

type CsvEntity =
  | 'nation'
  | 'region'
  | 'city'
  | 'stadium'
  | 'club'
  | 'player'
  | 'coach'
  | 'staff'
  | 'competition'
  | 'season'
  | 'contract'
  | 'registration';

const templates: Record<CsvEntity, string[]> = {
  nation: ['internalId', 'name', 'iso2', 'iso3'],
  region: ['internalId', 'name', 'nationId'],
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
  coach: [
    'internalId',
    'fullName',
    'knownName',
    'clubId',
    'nationality',
    'birthDate',
    'role',
    'qualification',
    'experienceYears',
  ],
  staff: [
    'internalId',
    'fullName',
    'knownName',
    'clubId',
    'nationality',
    'birthDate',
    'role',
    'qualification',
    'experienceYears',
  ],
  competition: ['internalId', 'name', 'shortName', 'nationId'],
  season: ['internalId', 'competitionId', 'label', 'startDate', 'endDate'],
  contract: ['internalId', 'personId', 'clubId', 'startedAt', 'expiresAt', 'status'],
  registration: ['internalId', 'competitionId', 'seasonId', 'playerId', 'clubId', 'shirtNumber'],
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
  return {
    headers,
    rows: data.map((values) =>
      Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])),
    ),
  };
};

interface ImportProfile {
  readonly name: string;
  readonly entity: CsvEntity;
  readonly mapping: Readonly<Record<string, string>>;
}

const importProfileKey = 'rivallo:creator-studio:csv-profiles';
const readProfiles = (): ImportProfile[] => {
  try {
    const value = JSON.parse(window.localStorage.getItem(importProfileKey) ?? '[]') as unknown;
    return Array.isArray(value) ? (value as ImportProfile[]) : [];
  } catch {
    return [];
  }
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
  const kind: CommunityChange['kind'] = entity === 'staff' ? 'coach' : entity;
  const common = {
    id: `${entity}:${id}`,
    kind,
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
  if (entity === 'region') {
    const value = { id, name: row.name, nationId: row.nationId };
    return {
      ...common,
      kind: 'region',
      label: value.name,
      summary: `Divisão administrativa · ${value.nationId}`,
      patches: [
        {
          operation: 'add',
          entityKind: 'region',
          targetId: id,
          entity: { kind: 'region', value },
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
  if (entity === 'coach' || entity === 'staff') {
    const club = world.clubs.find((item) => item.id === row.clubId) ?? world.clubs[0];
    const value = {
      identity: {
        entityId: id,
        fullName: row.fullName,
        knownName: row.knownName,
        nationality: row.nationality,
        birthDate: row.birthDate,
        age: Math.max(18, new Date().getUTCFullYear() - numeric(row.birthDate.slice(0, 4), 1985)),
        clubId: club?.id ?? row.clubId,
        clubName: club?.name ?? row.clubId,
        clubShortName: club?.shortName ?? '---',
        clubPrimaryColor: club?.primaryColor ?? '#36d39a',
      },
      role: row.role || (entity === 'coach' ? 'Treinador principal' : 'Auxiliar'),
      reputation: 40,
      qualification: row.qualification || 'Sem licença informada',
      experienceYears: numeric(row.experienceYears, 0),
      style: 'Equilibrado',
      preferredFormations: [],
      attributes: {
        tactical: 40,
        peopleManagement: 40,
        playerDevelopment: 40,
        analysis: 40,
        recruitment: 40,
      },
      specialties: [],
      contract: null,
    };
    return {
      ...common,
      kind: 'coach',
      label: row.knownName,
      summary: `${value.role} · ${value.identity.clubName}`,
      patches: [
        {
          operation: 'add',
          entityKind: 'coach',
          targetId: id,
          entity: { kind: 'coach', value },
          reason: 'Importação CSV revisada pelo autor',
        },
      ],
    };
  }
  if (entity === 'competition') {
    const value = {
      id,
      name: row.name,
      shortName: row.shortName,
      nationId: row.nationId,
      regionId: null,
      logoAssetId: null,
      category: 'league',
      level: 1,
      description: null,
      primaryColor: null,
      secondaryColor: null,
      baseSeasonId: null,
      seasons: [],
    };
    return {
      ...common,
      label: value.name,
      summary: 'Competição em rascunho, sem participantes',
      patches: [
        {
          operation: 'add',
          entityKind: 'competition',
          targetId: id,
          entity: { kind: 'competition', value },
          reason: 'Importação CSV revisada pelo autor',
        },
      ],
    };
  }
  if (entity === 'season') {
    const competition = world.competitions?.find((item) => item.id === row.competitionId);
    const season = {
      id,
      competitionId: row.competitionId,
      label: row.label,
      startDate: row.startDate,
      endDate: row.endDate,
      participantClubIds: [],
      stages: [],
      rules: {
        pointsForWin: 3,
        pointsForDraw: 1,
        pointsForLoss: 0,
        participantCount: 0,
        rounds: 0,
        legs: 1,
        tieBreakers: [],
      },
      registrationWindows: [],
      calendarConstraints: {},
      playerRegistrations: [],
    };
    const value = competition
      ? {
          ...competition,
          baseSeasonId: competition.baseSeasonId ?? id,
          seasons: [...competition.seasons, season],
        }
      : null;
    return {
      ...common,
      kind: 'season',
      label: row.label,
      summary: 'Temporada em rascunho, sem participantes',
      patches: value
        ? [
            {
              operation: 'replace',
              entityKind: 'competition',
              targetId: competition!.id,
              entity: { kind: 'competition', value },
              reason: 'Temporada importada por CSV',
            },
          ]
        : [],
    };
  }
  if (entity === 'contract') {
    const player = world.playerProfiles.find((item) => item.identity.entityId === row.personId);
    const coach = world.coaches.find((item) => item.identity.entityId === row.personId);
    const person = player ?? coach;
    const entityKind = coach ? 'coach' : 'playerProfile';
    const value = person
      ? {
          ...person,
          contract: {
            clubId: row.clubId,
            startedAt: row.startedAt,
            expiresAt: row.expiresAt,
            squadStatus: row.status,
          },
        }
      : null;
    return {
      ...common,
      kind: 'contract',
      label: `Contrato ${row.personId}`,
      summary: `${row.startedAt} → ${row.expiresAt || 'sem fim'}`,
      patches: value
        ? [
            {
              operation: 'replace',
              entityKind,
              targetId: row.personId,
              entity: { kind: entityKind, value },
              reason: 'Contrato importado por CSV',
            },
          ]
        : [],
    };
  }
  if (entity === 'registration') {
    const competition = world.competitions?.find((item) => item.id === row.competitionId);
    const value = competition
      ? {
          ...competition,
          seasons: competition.seasons.map((season) =>
            season.id === row.seasonId
              ? {
                  ...season,
                  playerRegistrations: [
                    ...season.playerRegistrations.filter((item) => item.playerId !== row.playerId),
                    {
                      playerId: row.playerId,
                      clubId: row.clubId,
                      shirtNumber: numeric(row.shirtNumber, 0) || null,
                      contractReference: null,
                      eligible: true,
                    },
                  ],
                }
              : season,
          ),
        }
      : null;
    return {
      ...common,
      kind: 'registration',
      label: `Inscrição ${row.playerId}`,
      summary: `${row.competitionId} · ${row.seasonId}`,
      patches: value
        ? [
            {
              operation: 'replace',
              entityKind: 'competition',
              targetId: competition!.id,
              entity: { kind: 'competition', value },
              reason: 'Inscrição importada por CSV',
            },
          ]
        : [],
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
    contract: null,
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
  const [sourceHeaders, setSourceHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [profileName, setProfileName] = useState('Mapeamento padrão');
  const [profiles, setProfiles] = useState<ImportProfile[]>(readProfiles);
  const [lastBatch, setLastBatch] = useState<string[]>([]);
  const input = useRef<HTMLInputElement>(null);
  const mappedRows = useMemo(
    () =>
      rows.map((row) =>
        Object.fromEntries(
          templates[entity].map((field) => [field, row[mapping[field] || field] ?? '']),
        ),
      ),
    [entity, mapping, rows],
  );
  const diagnostics = useMemo(
    () =>
      mappedRows.flatMap((row, index) => {
        const missing = templates[entity].filter(
          (field) =>
            field !== 'externalId' &&
            field !== 'regionId' &&
            field !== 'ownerClubId' &&
            !row[field],
        );
        return missing.length ? [`Linha ${index + 2}: ${missing.join(', ')} ausente(s).`] : [];
      }),
    [entity, mappedRows],
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
    let projectedWorld = world;
    const changes = mappedRows.map((row, index) => {
      const change = toChange(entity, row, index, projectedWorld);
      projectedWorld = projectAuthoringWorld(projectedWorld, [change]);
      return change;
    });
    onImport(changes);
    setLastBatch(changes.map((change) => change.id));
  };
  const saveProfile = () => {
    const profile: ImportProfile = { name: profileName.trim(), entity, mapping };
    if (!profile.name) return;
    const next = [
      ...profiles.filter((item) => !(item.entity === entity && item.name === profile.name)),
      profile,
    ];
    setProfiles(next);
    window.localStorage.setItem(importProfileKey, JSON.stringify(next));
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
              setSourceHeaders([]);
              setMapping({});
            }}
            value={entity}
          >
            <option value="nation">Nações</option>
            <option value="region">Divisões administrativas</option>
            <option value="city">Cidades</option>
            <option value="stadium">Estádios</option>
            <option value="club">Clubes</option>
            <option value="player">Jogadores</option>
            <option value="coach">Treinadores</option>
            <option value="staff">Comissão</option>
            <option value="competition">Competições</option>
            <option value="season">Temporadas</option>
            <option value="contract">Contratos</option>
            <option value="registration">Inscrições</option>
          </select>
        </label>
        <label>
          Perfil de mapeamento
          <input onChange={(event) => setProfileName(event.target.value)} value={profileName} />
          <small>Reutilizável em próximas importações neste dispositivo.</small>
        </label>
        {profiles.some((item) => item.entity === entity) && (
          <label>
            Usar perfil salvo
            <select
              defaultValue=""
              onChange={(event) => {
                const profile = profiles.find(
                  (item) => item.entity === entity && item.name === event.target.value,
                );
                if (profile) {
                  setProfileName(profile.name);
                  setMapping({ ...profile.mapping });
                }
              }}
            >
              <option value="">Escolha um perfil</option>
              {profiles
                .filter((item) => item.entity === entity)
                .map((item) => (
                  <option key={`${item.entity}:${item.name}`}>{item.name}</option>
                ))}
            </select>
          </label>
        )}
        <input
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file)
              void file.text().then((text) => {
                const parsed = parseCsv(text);
                setRows(parsed.rows);
                setSourceHeaders(parsed.headers);
                setMapping(
                  Object.fromEntries(
                    templates[entity].map((field) => [
                      field,
                      parsed.headers.find(
                        (header) => header.toLocaleLowerCase() === field.toLocaleLowerCase(),
                      ) ?? '',
                    ]),
                  ),
                );
              });
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
          <section className="csv-mapping" aria-labelledby="csv-mapping-title">
            <div className="studio-panel__heading">
              <div>
                <h3 id="csv-mapping-title">Mapear colunas</h3>
                <p>Associe cada campo do Rivallo a uma coluna do arquivo.</p>
              </div>
              <Button onClick={saveProfile} variant="secondary">
                Salvar perfil
              </Button>
            </div>
            <div className="csv-mapping__grid">
              {templates[entity].map((field) => (
                <label key={field}>
                  <span>{field}</span>
                  <select
                    aria-label={`Coluna para ${field}`}
                    onChange={(event) =>
                      setMapping((current) => ({ ...current, [field]: event.target.value }))
                    }
                    value={mapping[field] ?? ''}
                  >
                    <option value="">Não importar</option>
                    {sourceHeaders.map((header) => (
                      <option key={header}>{header}</option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </section>
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
                {mappedRows.slice(0, 12).map((row, index) => (
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
