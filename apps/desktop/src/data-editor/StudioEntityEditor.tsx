import { useMemo, useState } from 'react';

import { Button } from '../ui/primitives/actions.js';
import { CommunityEntityEditor } from './CommunityEntityEditor.js';
import { CompetitionBuilder } from './CompetitionBuilder.js';
import type { StudioEntityRecord, StudioModuleId } from './authoring-graph.js';
import type {
  AuthoringCoachProfile,
  AuthoringPlayerProfile,
  CommunityChange,
  GeneratedPackagePatch,
  ModAuthoringWorld,
  StudioCompetition,
} from './types.js';

const slug = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '');

const simpleKind: Partial<Record<StudioModuleId, GeneratedPackagePatch['entityKind']>> = {
  nations: 'nation',
  regions: 'region',
  cities: 'city',
  stadiums: 'stadium',
};

interface SimpleDraft {
  readonly name: string;
  readonly code: string;
  readonly iso3: string;
  readonly nationId: string;
  readonly regionId: string;
  readonly cityId: string;
  readonly capacity: string;
  readonly ownerClubId: string;
}

const draftFrom = (module: StudioModuleId, record: StudioEntityRecord | null): SimpleDraft => {
  const value = (record?.value ?? {}) as Record<string, unknown>;
  return {
    name: String(value.name ?? ''),
    code: String(value.iso2 ?? ''),
    iso3: String(value.iso3 ?? ''),
    nationId: String(value.nationId ?? ''),
    regionId: String(value.regionId ?? ''),
    cityId: String(value.cityId ?? ''),
    capacity: String(value.capacity ?? (module === 'stadiums' ? 10000 : '')),
    ownerClubId: String(value.ownerClubId ?? ''),
  };
};

const communityKindForModule = (module: StudioModuleId): CommunityChange['kind'] => {
  if (module === 'nations') return 'nation';
  if (module === 'regions') return 'region';
  if (module === 'stadiums') return 'stadium';
  return 'city';
};

function SimpleEntityForm({
  module,
  record,
  mode,
  author,
  world,
  onUpsert,
  onNavigate,
}: {
  readonly module: StudioModuleId;
  readonly record: StudioEntityRecord | null;
  readonly mode: 'create' | 'edit';
  readonly author: string;
  readonly world: ModAuthoringWorld;
  readonly onUpsert: (change: CommunityChange) => void;
  readonly onNavigate: (module: StudioModuleId, id?: string) => void;
}) {
  const [draft, setDraft] = useState(() => draftFrom(module, record));
  const entityKind = simpleKind[module];
  if (!entityKind) return null;
  const id =
    mode === 'edit' && record
      ? record.id
      : `community.${slug(author || 'autor')}.${entityKind}.${slug(draft.name || 'novo')}`;
  const save = () => {
    let value: Record<string, unknown>;
    if (module === 'nations') {
      value = {
        id,
        name: draft.name.trim(),
        iso2: draft.code.trim().toUpperCase(),
        iso3: draft.iso3.trim().toUpperCase(),
        aliases: [],
        confederationId: null,
        flagAssetId: null,
        externalIds: [],
      };
    } else if (module === 'regions') {
      value = { id, nationId: draft.nationId, name: draft.name.trim() };
    } else if (module === 'cities') {
      value = {
        id,
        nationId: draft.nationId,
        regionId: draft.regionId || null,
        name: draft.name.trim(),
      };
    } else {
      value = {
        id,
        name: draft.name.trim(),
        cityId: draft.cityId,
        ownerClubId: draft.ownerClubId || null,
        capacity: Number(draft.capacity) || 0,
        assetId: null,
      };
    }
    onUpsert({
      id: `${entityKind}:${id}`,
      kind: communityKindForModule(module),
      operation: mode,
      targetId: id,
      label: draft.name.trim() || 'Rascunho sem nome',
      summary:
        module === 'stadiums'
          ? `${Number(draft.capacity || 0).toLocaleString('pt-BR')} lugares`
          : mode === 'create'
            ? 'Novo rascunho editável'
            : 'Dados atualizados',
      patches: [
        {
          operation: mode === 'create' ? 'add' : 'replace',
          entityKind,
          targetId: id,
          entity: { kind: entityKind, value },
          reason: `${mode === 'create' ? 'Criação' : 'Edição'} visual no Creator Studio`,
        },
      ],
      asset: null,
    });
  };
  return (
    <form
      className="studio-inspector-form"
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
    >
      <header>
        <h3>{mode === 'create' ? 'Criar novo' : `Editar ${record?.name ?? ''}`}</h3>
        <p>O ID estável nasce com o rascunho. Relações pendentes podem ser resolvidas depois.</p>
      </header>
      <label>
        Nome
        <input
          autoFocus
          maxLength={160}
          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          value={draft.name}
        />
      </label>
      {module === 'nations' && (
        <div className="studio-inline-fields">
          <label>
            Código de 2 letras
            <input
              maxLength={2}
              onChange={(event) => setDraft({ ...draft, code: event.target.value })}
              value={draft.code}
            />
          </label>
          <label>
            Código de 3 letras
            <input
              maxLength={3}
              onChange={(event) => setDraft({ ...draft, iso3: event.target.value })}
              value={draft.iso3}
            />
          </label>
        </div>
      )}
      {(module === 'regions' || module === 'cities') && (
        <label>
          Nação
          <span className="studio-relation-control">
            <select
              aria-label="Nação"
              onChange={(event) => setDraft({ ...draft, nationId: event.target.value })}
              value={draft.nationId}
            >
              <option value="">Resolver depois</option>
              {world.nations.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <button onClick={() => onNavigate('nations')} type="button">
              + Criar nação
            </button>
          </span>
        </label>
      )}
      {module === 'cities' && (
        <label>
          Região
          <span className="studio-relation-control">
            <select
              aria-label="Região"
              onChange={(event) => setDraft({ ...draft, regionId: event.target.value })}
              value={draft.regionId}
            >
              <option value="">Sem região</option>
              {(world.regions ?? [])
                .filter((item) => !draft.nationId || item.nationId === draft.nationId)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
            </select>
            <button onClick={() => onNavigate('regions')} type="button">
              + Criar região
            </button>
          </span>
        </label>
      )}
      {module === 'stadiums' && (
        <>
          <label>
            Cidade
            <span className="studio-relation-control">
              <select
                aria-label="Cidade"
                onChange={(event) => setDraft({ ...draft, cityId: event.target.value })}
                value={draft.cityId}
              >
                <option value="">Resolver depois</option>
                {(world.cities ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <button onClick={() => onNavigate('cities')} type="button">
                + Criar cidade
              </button>
            </span>
          </label>
          <label>
            Capacidade
            <input
              max={250000}
              min={0}
              onChange={(event) => setDraft({ ...draft, capacity: event.target.value })}
              type="number"
              value={draft.capacity}
            />
          </label>
          <label>
            Clube proprietário
            <select
              onChange={(event) => setDraft({ ...draft, ownerClubId: event.target.value })}
              value={draft.ownerClubId}
            >
              <option value="">Nenhum</option>
              {world.clubs.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        </>
      )}
      <p className="studio-id-preview">ID: {id}</p>
      <div className="studio-inspector-form__actions">
        <Button disabled={!draft.name.trim()} type="submit" variant="primary">
          Salvar rascunho
        </Button>
      </div>
    </form>
  );
}

function ContractEditor({
  record,
  world,
  onUpsert,
}: {
  readonly record: StudioEntityRecord | null;
  readonly world: ModAuthoringWorld;
  readonly onUpsert: (change: CommunityChange) => void;
}) {
  const person = record?.value as AuthoringPlayerProfile | AuthoringCoachProfile | undefined;
  const [personId, setPersonId] = useState(person?.identity.entityId ?? '');
  const selected =
    world.playerProfiles.find((item) => item.identity.entityId === personId) ??
    world.coaches.find((item) => item.identity.entityId === personId);
  const [startedAt, setStartedAt] = useState(selected?.contract?.startedAt ?? '2026-01-01');
  const [expiresAt, setExpiresAt] = useState(selected?.contract?.expiresAt ?? '');
  const [clubId, setClubId] = useState(selected?.contract?.clubId ?? world.clubs[0]?.id ?? '');
  const [status, setStatus] = useState(selected?.contract?.squadStatus ?? 'Ativo');
  const save = () => {
    if (!selected) return;
    const next = {
      ...selected,
      contract: { clubId, startedAt, expiresAt: expiresAt || null, squadStatus: status },
    };
    const coach = world.coaches.some(
      (item) => item.identity.entityId === selected.identity.entityId,
    );
    const external = !coach && selected.identity.clubId !== world.activeClubId;
    const entityKind = coach ? 'coach' : external ? 'externalPlayer' : 'playerProfile';
    onUpsert({
      id: `contract:${selected.identity.entityId}`,
      kind: 'contract',
      operation: 'edit',
      targetId: selected.identity.entityId,
      label: `Contrato de ${selected.identity.knownName}`,
      summary: `${startedAt} → ${expiresAt || 'sem vencimento'}`,
      patches: [
        {
          operation: 'replace',
          entityKind,
          targetId: selected.identity.entityId,
          entity: {
            kind: entityKind,
            value: external ? { profile: next } : next,
          },
          reason: 'Contrato editado visualmente no Creator Studio',
        },
      ],
      asset: null,
    });
  };
  return (
    <form className="studio-inspector-form" onSubmit={(event) => event.preventDefault()}>
      <header>
        <h3>Contrato</h3>
        <p>O contrato permanece dentro do perfil canônico da pessoa.</p>
      </header>
      <label>
        Pessoa
        <select onChange={(event) => setPersonId(event.target.value)} value={personId}>
          <option value="">Selecione</option>
          {[...world.playerProfiles, ...world.coaches].map((item) => (
            <option key={item.identity.entityId} value={item.identity.entityId}>
              {item.identity.knownName}
            </option>
          ))}
        </select>
      </label>
      <label>
        Clube
        <select onChange={(event) => setClubId(event.target.value)} value={clubId}>
          {world.clubs.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <div className="studio-inline-fields">
        <label>
          Início
          <input
            onChange={(event) => setStartedAt(event.target.value)}
            type="date"
            value={startedAt}
          />
        </label>
        <label>
          Fim opcional
          <input
            onChange={(event) => setExpiresAt(event.target.value)}
            type="date"
            value={expiresAt}
          />
        </label>
      </div>
      <label>
        Função ou status
        <input onChange={(event) => setStatus(event.target.value)} value={status} />
      </label>
      <Button disabled={!selected} onClick={save} variant="primary">
        Salvar contrato
      </Button>
    </form>
  );
}

function RegistrationEditor({
  world,
  onUpsert,
}: {
  readonly world: ModAuthoringWorld;
  readonly onUpsert: (change: CommunityChange) => void;
}) {
  const competitions = world.competitions ?? [];
  const [competitionId, setCompetitionId] = useState(competitions[0]?.id ?? '');
  const competition = competitions.find((item) => item.id === competitionId);
  const [seasonId, setSeasonId] = useState(competition?.seasons[0]?.id ?? '');
  const [playerId, setPlayerId] = useState(world.playerProfiles[0]?.identity.entityId ?? '');
  const [clubId, setClubId] = useState(world.clubs[0]?.id ?? '');
  const [shirtNumber, setShirtNumber] = useState('');
  const save = () => {
    const currentCompetition = competitions.find((item) => item.id === competitionId);
    if (!currentCompetition) return;
    const registration = {
      playerId,
      clubId,
      shirtNumber: shirtNumber ? Number(shirtNumber) : null,
      contractReference: null,
      eligible: true,
    };
    const next: StudioCompetition = {
      ...currentCompetition,
      seasons: currentCompetition.seasons.map((season) =>
        season.id === seasonId
          ? { ...season, playerRegistrations: [...season.playerRegistrations, registration] }
          : season,
      ),
    };
    onUpsert({
      id: `registration:${seasonId}:${playerId}`,
      kind: 'registration',
      operation: 'create',
      targetId: playerId,
      label: `Inscrição de ${world.playerProfiles.find((item) => item.identity.entityId === playerId)?.identity.knownName ?? playerId}`,
      summary: currentCompetition.name,
      patches: [
        {
          operation: 'replace',
          entityKind: 'competition',
          targetId: currentCompetition.id,
          entity: { kind: 'competition', value: next },
          reason: 'Inscrição criada visualmente no Creator Studio',
        },
      ],
      asset: null,
    });
  };
  return (
    <form className="studio-inspector-form" onSubmit={(event) => event.preventDefault()}>
      <header>
        <h3>Nova inscrição</h3>
        <p>Vincule jogador, clube e temporada sem editar JSON.</p>
      </header>
      <label>
        Competição
        <select
          onChange={(event) => {
            setCompetitionId(event.target.value);
            setSeasonId(
              competitions.find((item) => item.id === event.target.value)?.seasons[0]?.id ?? '',
            );
          }}
          value={competitionId}
        >
          {competitions.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Temporada
        <select onChange={(event) => setSeasonId(event.target.value)} value={seasonId}>
          {competition?.seasons.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Jogador
        <select onChange={(event) => setPlayerId(event.target.value)} value={playerId}>
          {world.playerProfiles.map((item) => (
            <option key={item.identity.entityId} value={item.identity.entityId}>
              {item.identity.knownName}
            </option>
          ))}
        </select>
      </label>
      <label>
        Clube
        <select onChange={(event) => setClubId(event.target.value)} value={clubId}>
          {world.clubs.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Número opcional
        <input
          min={1}
          onChange={(event) => setShirtNumber(event.target.value)}
          type="number"
          value={shirtNumber}
        />
      </label>
      <Button disabled={!seasonId || !playerId || !clubId} onClick={save} variant="primary">
        Salvar inscrição
      </Button>
    </form>
  );
}

function TranslationEditor({
  record,
  world,
  onUpsert,
}: {
  readonly record: StudioEntityRecord | null;
  readonly world: ModAuthoringWorld;
  readonly onUpsert: (change: CommunityChange) => void;
}) {
  const nation = world.nations.find((item) => item.id === record?.id) ?? world.nations[0];
  const [nationId, setNationId] = useState(nation?.id ?? '');
  const current = world.nations.find((item) => item.id === nationId);
  const [aliases, setAliases] = useState((current?.aliases ?? []).join(', '));
  const save = () => {
    if (!current) return;
    const value = {
      ...current,
      iso3: current.iso3 ?? `${current.iso2}X`.slice(0, 3),
      aliases: aliases
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      confederationId: current.confederationId ?? null,
      flagAssetId: current.flagAssetId ?? null,
      externalIds: [],
    };
    onUpsert({
      id: `translation:nation:${current.id}`,
      kind: 'translation',
      operation: 'edit',
      targetId: current.id,
      label: `Traduções de ${current.name}`,
      summary: `${value.aliases.length} label(s) localizado(s)`,
      patches: [
        {
          operation: 'replace',
          entityKind: 'nation',
          targetId: current.id,
          entity: { kind: 'nation', value },
          reason: 'Aliases localizados editados no Creator Studio',
        },
      ],
      asset: null,
    });
  };
  return (
    <form className="studio-inspector-form" onSubmit={(event) => event.preventDefault()}>
      <header>
        <h3>Labels localizados</h3>
        <p>
          O schema v1 oferece aliases de nação; novos campos só entram após evolução explícita do
          schema.
        </p>
      </header>
      <label>
        Nação
        <select
          onChange={(event) => {
            setNationId(event.target.value);
            setAliases(
              (world.nations.find((item) => item.id === event.target.value)?.aliases ?? []).join(
                ', ',
              ),
            );
          }}
          value={nationId}
        >
          {world.nations.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Nomes alternativos
        <textarea
          onChange={(event) => setAliases(event.target.value)}
          placeholder="Brasil, República Federativa do Brasil"
          value={aliases}
        />
      </label>
      <Button disabled={!current} onClick={save} variant="primary">
        Salvar labels
      </Button>
    </form>
  );
}

export function StudioEntityEditor({
  module,
  record,
  mode,
  author,
  world,
  onUpsert,
  onNavigate,
}: {
  readonly module: StudioModuleId;
  readonly record: StudioEntityRecord | null;
  readonly mode: 'create' | 'edit';
  readonly author: string;
  readonly world: ModAuthoringWorld;
  readonly onUpsert: (change: CommunityChange) => void;
  readonly onNavigate: (module: StudioModuleId, id?: string) => void;
}) {
  const editorKey = `${module}:${mode}:${record?.id ?? 'new'}`;
  const personKind = module === 'clubs' ? 'club' : module === 'players' ? 'player' : 'coach';
  const canUsePersonEditor = ['clubs', 'players', 'coaches', 'staff'].includes(module);
  const memoRecord = useMemo(() => record, [record]);
  if (['nations', 'regions', 'cities', 'stadiums'].includes(module))
    return (
      <SimpleEntityForm
        author={author}
        key={editorKey}
        mode={mode}
        module={module}
        onNavigate={onNavigate}
        onUpsert={onUpsert}
        record={memoRecord}
        world={world}
      />
    );
  if (canUsePersonEditor)
    return (
      <CommunityEntityEditor
        author={author}
        embedded
        initialEntityId={record?.id}
        initialKind={personKind}
        initialMode={mode}
        key={editorKey}
        onUpsert={onUpsert}
        staffMode={module === 'staff'}
        world={world}
      />
    );
  if (module === 'competitions' || module === 'seasons')
    return (
      <CompetitionBuilder
        author={author}
        initialCompetition={
          mode === 'edit'
            ? module === 'competitions'
              ? (record?.value as StudioCompetition | undefined)
              : ((record?.value as { competition?: StudioCompetition } | undefined)?.competition ??
                null)
            : null
        }
        onUpsert={onUpsert}
        world={world}
      />
    );
  if (module === 'contracts')
    return <ContractEditor key={editorKey} onUpsert={onUpsert} record={record} world={world} />;
  if (module === 'registrations')
    return <RegistrationEditor key={editorKey} onUpsert={onUpsert} world={world} />;
  if (module === 'translations')
    return <TranslationEditor key={editorKey} onUpsert={onUpsert} record={record} world={world} />;
  return null;
}
