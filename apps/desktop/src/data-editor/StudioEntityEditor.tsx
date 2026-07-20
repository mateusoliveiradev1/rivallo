import { useMemo, useState } from 'react';

import { Button } from '../ui/primitives/actions.js';
import { CommunityEntityEditor } from './CommunityEntityEditor.js';
import { CompetitionBuilder } from './CompetitionBuilder.js';
import { FactualPersonEditor } from './FactualPersonEditor.js';
import type {
  StudioEntityRecord,
  StudioModuleId,
  StudioRegistrationRecordValue,
} from './authoring-graph.js';
import type {
  AuthoringAssetUpload,
  AuthoringCoachProfile,
  AuthoringPlayerProfile,
  CommunityChange,
  FactualPerson,
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
  onRelatedUpsert,
  onNavigate,
}: {
  readonly module: StudioModuleId;
  readonly record: StudioEntityRecord | null;
  readonly mode: 'create' | 'edit';
  readonly author: string;
  readonly world: ModAuthoringWorld;
  readonly onUpsert: (change: CommunityChange) => void;
  readonly onRelatedUpsert: (change: CommunityChange) => void;
  readonly onNavigate: (module: StudioModuleId, id?: string) => void;
}) {
  const [draft, setDraft] = useState(() => draftFrom(module, record));
  const [inlineDivisionOpen, setInlineDivisionOpen] = useState(false);
  const [inlineDivisionName, setInlineDivisionName] = useState('');
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
  const createInlineDivision = () => {
    if (!draft.nationId || !inlineDivisionName.trim()) return;
    const regionId = `community.${slug(author || 'autor')}.region.${slug(inlineDivisionName)}`;
    const value = { id: regionId, nationId: draft.nationId, name: inlineDivisionName.trim() };
    onRelatedUpsert({
      id: `region:${regionId}`,
      kind: 'region',
      operation: 'create',
      targetId: regionId,
      label: value.name,
      summary: 'Divisão administrativa criada durante o cadastro da cidade',
      patches: [
        {
          operation: 'add',
          entityKind: 'region',
          targetId: regionId,
          entity: { kind: 'region', value },
          reason: 'Criação relacionada no Creator Studio',
        },
      ],
      asset: null,
    });
    setDraft({ ...draft, regionId });
    setInlineDivisionName('');
    setInlineDivisionOpen(false);
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
          Divisão administrativa
          <small>Estado, província, departamento ou outra divisão que organiza a cidade.</small>
          <span className="studio-relation-control">
            <select
              aria-label="Divisão administrativa"
              onChange={(event) => setDraft({ ...draft, regionId: event.target.value })}
              value={draft.regionId}
            >
              <option value="">Resolver depois</option>
              {(world.regions ?? [])
                .filter((item) => !draft.nationId || item.nationId === draft.nationId)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
            </select>
            <button
              disabled={!draft.nationId}
              onClick={() => setInlineDivisionOpen(true)}
              type="button"
            >
              + Criar divisão
            </button>
          </span>
        </label>
      )}
      {inlineDivisionOpen && (
        <div
          aria-labelledby="inline-division-title"
          aria-modal="true"
          className="studio-inline-dialog"
          role="dialog"
        >
          <div>
            <span>Criação relacionada</span>
            <h4 id="inline-division-title">Nova divisão administrativa</h4>
            <p>O formulário da cidade ficará preservado e a nova divisão será selecionada.</p>
            <label>
              Nome
              <input
                autoFocus
                onChange={(event) => setInlineDivisionName(event.target.value)}
                placeholder="Ex.: São Paulo"
                value={inlineDivisionName}
              />
            </label>
            <div>
              <Button
                onClick={() => setInlineDivisionOpen(false)}
                type="button"
                variant="secondary"
              >
                Cancelar
              </Button>
              <Button
                disabled={!inlineDivisionName.trim()}
                onClick={createInlineDivision}
                type="button"
                variant="primary"
              >
                Criar e selecionar
              </Button>
            </div>
          </div>
        </div>
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
  const person = record?.value as
    AuthoringPlayerProfile | AuthoringCoachProfile | FactualPerson | undefined;
  const initialPersonId =
    person && 'personId' in person ? person.personId : person?.identity.entityId;
  const [personId, setPersonId] = useState(initialPersonId ?? '');
  const selectedProfile =
    world.playerProfiles.find((item) => item.identity.entityId === personId) ??
    world.coaches.find((item) => item.identity.entityId === personId);
  const selectedFactual = world.people?.find((item) => item.personId === personId);
  const selected = selectedFactual ?? selectedProfile;
  const [startedAt, setStartedAt] = useState(selected?.contract?.startedAt ?? '');
  const [expiresAt, setExpiresAt] = useState(selected?.contract?.expiresAt ?? '');
  const [clubId, setClubId] = useState(selected?.contract?.clubId ?? world.clubs[0]?.id ?? '');
  const [status, setStatus] = useState(selected?.contract?.squadStatus ?? '');
  const save = () => {
    if (!selected) return;
    const next = {
      ...selected,
      contract: {
        clubId,
        startedAt: startedAt || null,
        expiresAt: expiresAt || null,
        squadStatus: status || null,
      },
    };
    if (selectedFactual) {
      onUpsert({
        id: `contract:${selectedFactual.personId}`,
        kind: 'contract',
        operation: 'edit',
        targetId: selectedFactual.personId,
        label: `Contrato de ${selectedFactual.knownName || selectedFactual.fullName}`,
        summary: `${startedAt || 'início desconhecido'} → ${expiresAt || 'fim desconhecido'}`,
        patches: [
          {
            operation: 'replace',
            entityKind: 'person',
            targetId: selectedFactual.personId,
            entity: { kind: 'person', value: next },
            reason: 'Fatos contratuais editados sem datas inventadas',
          },
        ],
        asset: null,
      });
      return;
    }
    if (!selectedProfile) return;
    const coach = world.coaches.some(
      (item) => item.identity.entityId === selectedProfile.identity.entityId,
    );
    const external = !coach && selectedProfile.identity.clubId !== world.activeClubId;
    const entityKind = coach ? 'coach' : external ? 'externalPlayer' : 'playerProfile';
    onUpsert({
      id: `contract:${selectedProfile.identity.entityId}`,
      kind: 'contract',
      operation: 'edit',
      targetId: selectedProfile.identity.entityId,
      label: `Contrato de ${selectedProfile.identity.knownName}`,
      summary: `${startedAt} → ${expiresAt || 'sem vencimento'}`,
      patches: [
        {
          operation: 'replace',
          entityKind,
          targetId: selectedProfile.identity.entityId,
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
          {(world.people ?? []).map((item) => (
            <option key={item.personId} value={item.personId}>
              {item.knownName || item.fullName} · fatos parciais
            </option>
          ))}
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
  record,
  world,
  onUpsert,
}: {
  readonly record: StudioEntityRecord | null;
  readonly world: ModAuthoringWorld;
  readonly onUpsert: (change: CommunityChange) => void;
}) {
  const existing = record?.value as StudioRegistrationRecordValue | undefined;
  const competitions = world.competitions ?? [];
  const factualPlayers = (world.people ?? []).flatMap((person) =>
    person.roles.filter((role) => role.kind === 'player').map((role) => ({ person, role })),
  );
  const [competitionId, setCompetitionId] = useState(
    existing?.competition.id ?? competitions[0]?.id ?? '',
  );
  const competition = competitions.find((item) => item.id === competitionId);
  const [seasonId, setSeasonId] = useState(
    existing?.season.id ?? competition?.seasons[0]?.id ?? '',
  );
  const [playerId, setPlayerId] = useState(
    existing?.registration.playerId ??
      factualPlayers[0]?.role.roleId ??
      world.playerProfiles[0]?.identity.entityId ??
      '',
  );
  const [clubId, setClubId] = useState(existing?.registration.clubId ?? world.clubs[0]?.id ?? '');
  const [shirtNumber, setShirtNumber] = useState(
    existing?.registration.shirtNumber?.toString() ?? '',
  );
  const [eligible, setEligible] = useState(existing?.registration.eligible ?? false);
  const save = () => {
    const currentCompetition = competitions.find((item) => item.id === competitionId);
    if (!currentCompetition) return;
    const registration = {
      registrationId:
        existing?.registration.registrationId ?? `registration:${seasonId}:${playerId}`,
      playerId,
      clubId,
      shirtNumber: shirtNumber ? Number(shirtNumber) : null,
      contractReference: null,
      eligible,
    };
    const next: StudioCompetition = {
      ...currentCompetition,
      seasons: currentCompetition.seasons.map((season) => {
        const withoutEdited = existing
          ? season.playerRegistrations.filter(
              (item, index) =>
                season.id !== existing.season.id ||
                index !== existing.index ||
                item.playerId !== existing.registration.playerId,
            )
          : season.playerRegistrations;
        if (season.id !== seasonId) return { ...season, playerRegistrations: withoutEdited };
        return {
          ...season,
          playerRegistrations: [
            ...withoutEdited.filter((item) => item.playerId !== playerId),
            registration,
          ],
        };
      }),
    };
    onUpsert({
      id: registration.registrationId,
      kind: 'registration',
      operation: existing ? 'edit' : 'create',
      targetId: currentCompetition.id,
      label: `Inscrição de ${world.playerProfiles.find((item) => item.identity.entityId === playerId)?.identity.knownName ?? factualPlayers.find((item) => item.role.roleId === playerId)?.person.knownName ?? factualPlayers.find((item) => item.role.roleId === playerId)?.person.fullName ?? playerId}`,
      summary: currentCompetition.name,
      patches: [
        {
          operation: 'replace',
          entityKind: 'competition',
          targetId: currentCompetition.id,
          entity: { kind: 'competition', value: next },
          reason: `Inscrição ${existing ? 'editada' : 'criada'} visualmente no Creator Studio`,
        },
      ],
      asset: null,
    });
  };
  return (
    <form className="studio-inspector-form" onSubmit={(event) => event.preventDefault()}>
      <header>
        <h3>{existing ? 'Editar inscrição' : 'Nova inscrição'}</h3>
        <p>A validade da inscrição é separada do perfil runtime e da prontidão do elenco.</p>
      </header>
      <label>
        Competição
        <select
          disabled={Boolean(existing)}
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
          {factualPlayers.map(({ person, role }) => (
            <option key={role.roleId} value={role.roleId}>
              {person.knownName || person.fullName} · identidade parcial
            </option>
          ))}
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
          max={255}
          min={1}
          onChange={(event) => setShirtNumber(event.target.value)}
          type="number"
          value={shirtNumber}
        />
      </label>
      <label className="studio-checkbox-field">
        <input
          checked={eligible}
          onChange={(event) => setEligible(event.target.checked)}
          type="checkbox"
        />
        Elegível na competição
        <small>Este fato não torna a pessoa pronta para gameplay.</small>
      </label>
      {playerId && !world.playerProfiles.some((item) => item.identity.entityId === playerId) && (
        <p className="factual-state-help">
          Inscrição estruturalmente válida; profile runtime da pessoa bloqueado e elenco ainda não
          pronto.
        </p>
      )}
      <Button disabled={!seasonId || !playerId || !clubId} onClick={save} variant="primary">
        {existing ? 'Salvar alterações' : 'Salvar inscrição'}
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
  assets = [],
  world,
  onUpsert,
  onRelatedUpsert,
  onNavigate,
}: {
  readonly module: StudioModuleId;
  readonly record: StudioEntityRecord | null;
  readonly mode: 'create' | 'edit';
  readonly author: string;
  readonly assets?: readonly AuthoringAssetUpload[];
  readonly world: ModAuthoringWorld;
  readonly onUpsert: (change: CommunityChange) => void;
  readonly onRelatedUpsert?: (change: CommunityChange) => void;
  readonly onNavigate: (module: StudioModuleId, id?: string) => void;
}) {
  const editorKey = `${module}:${mode}:${record?.id ?? 'new'}`;
  const personKind = module === 'clubs' ? 'club' : module === 'players' ? 'player' : 'coach';
  const canUsePersonEditor = ['clubs', 'players', 'coaches', 'staff'].includes(module);
  const factualRecord = Boolean(
    record?.value && typeof record.value === 'object' && 'personId' in record.value,
  );
  const memoRecord = useMemo(() => record, [record]);
  if (['nations', 'regions', 'cities', 'stadiums'].includes(module))
    return (
      <SimpleEntityForm
        author={author}
        key={editorKey}
        mode={mode}
        module={module}
        onNavigate={onNavigate}
        onRelatedUpsert={onRelatedUpsert ?? onUpsert}
        onUpsert={onUpsert}
        record={memoRecord}
        world={world}
      />
    );
  if (canUsePersonEditor)
    if (module !== 'clubs' && (mode === 'create' || factualRecord))
      return (
        <FactualPersonEditor
          author={author}
          key={editorKey}
          module={module}
          onUpsert={onUpsert}
          recordValue={record?.value}
          world={world}
        />
      );
  if (canUsePersonEditor)
    return (
      <CommunityEntityEditor
        assets={assets}
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
    return <RegistrationEditor key={editorKey} onUpsert={onUpsert} record={record} world={world} />;
  if (module === 'translations')
    return <TranslationEditor key={editorKey} onUpsert={onUpsert} record={record} world={world} />;
  return null;
}
