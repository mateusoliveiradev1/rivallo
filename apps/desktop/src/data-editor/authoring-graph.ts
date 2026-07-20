import type { Player } from '../matchday/types.js';
import type {
  AuthoringCoachProfile,
  AuthoringPlayerProfile,
  CommunityChange,
  FactualPerson,
  GeneratedPackagePatch,
  ModAuthoringWorld,
  StudioCompetition,
} from './types.js';

export type StudioModuleId =
  | 'nations'
  | 'regions'
  | 'cities'
  | 'stadiums'
  | 'clubs'
  | 'players'
  | 'coaches'
  | 'staff'
  | 'competitions'
  | 'seasons'
  | 'contracts'
  | 'registrations'
  | 'assets'
  | 'translations'
  | 'patches';

export interface StudioEntityRecord {
  readonly id: string;
  readonly name: string;
  readonly detail: string;
  readonly module: StudioModuleId;
  readonly value: unknown;
  readonly readiness?: AuthoringReadiness;
}

export interface StudioSeasonRecordValue {
  readonly competition: StudioCompetition;
  readonly season: StudioCompetition['seasons'][number];
}

export interface StudioRegistrationRecordValue extends StudioSeasonRecordValue {
  readonly registration: StudioCompetition['seasons'][number]['playerRegistrations'][number];
  readonly index: number;
}

export interface AuthoringIssue {
  readonly code: string;
  readonly label: string;
  readonly explanation: string;
  readonly module: StudioModuleId;
  readonly field?: string;
  readonly blocking: boolean;
}

export type AuthoringReadinessState =
  'incompleteDraft' | 'structurallyValid' | 'readyWithWarnings' | 'readyForCareer' | 'blocked';

export interface AuthoringReadiness {
  readonly state: AuthoringReadinessState;
  readonly label: string;
  readonly issues: readonly AuthoringIssue[];
}

const replaceById = <T>(items: readonly T[], id: string, value: T, getId: (item: T) => string) => [
  ...items.filter((item) => getId(item) !== id),
  value,
];

const removeById = <T>(items: readonly T[], id: string, getId: (item: T) => string) =>
  items.filter((item) => getId(item) !== id);

const baseEntityForPatch = (base: ModAuthoringWorld, patch: GeneratedPackagePatch): unknown => {
  switch (patch.entityKind) {
    case 'club':
      return base.clubs.find((item) => item.id === patch.targetId);
    case 'person':
      return base.people?.find((item) => item.personId === patch.targetId);
    case 'matchdayPlayer':
      return base.players.find((item) => item.id === patch.targetId);
    case 'playerProfile':
      return base.playerProfiles.find((item) => item.identity.entityId === patch.targetId);
    case 'externalPlayer': {
      const profile = base.playerProfiles.find((item) => item.identity.entityId === patch.targetId);
      return profile ? { profile } : undefined;
    }
    case 'coach':
      return base.coaches.find((item) => item.identity.entityId === patch.targetId);
    case 'nation':
      return base.nations.find((item) => item.id === patch.targetId);
    case 'region':
      return base.regions?.find((item) => item.id === patch.targetId);
    case 'city':
      return base.cities?.find((item) => item.id === patch.targetId);
    case 'stadium':
      return base.stadiums?.find((item) => item.id === patch.targetId);
    case 'competition':
      return base.competitions?.find((item) => item.id === patch.targetId);
    case 'asset':
      return undefined;
  }
};

const sameValue = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);

/**
 * Serializes one semantic change against the immutable authoring composition.
 * Forms may describe their visual create/edit mode, but never own patch origin.
 */
export function reconcileAuthoringChange(
  base: ModAuthoringWorld,
  current: readonly CommunityChange[],
  incoming: CommunityChange,
): readonly CommunityChange[] {
  const existing = current.find((candidate) => candidate.targetId === incoming.targetId);
  const asset =
    incoming.kind === 'asset' && incoming.operation === 'delete'
      ? null
      : (incoming.asset ?? existing?.asset ?? null);
  const submittedPatches =
    incoming.patches.length === 0 && existing ? existing.patches : incoming.patches;
  const patches = submittedPatches.flatMap((patch): GeneratedPackagePatch[] => {
    const baseEntity = baseEntityForPatch(base, patch);
    const existsInBase = baseEntity !== undefined;
    if (patch.operation === 'remove') {
      return existsInBase ? [{ ...patch, operation: 'remove' }] : [];
    }
    const value = patch.entity?.value;
    if (existsInBase && sameValue(baseEntity, value)) return [];
    return [{ ...patch, operation: existsInBase ? 'replace' : 'add' }];
  });

  const withoutTarget = current.filter((candidate) => candidate.targetId !== incoming.targetId);
  if (patches.length === 0 && !asset) return withoutTarget;
  const operation: CommunityChange['operation'] =
    patches.length > 0 && patches.every((patch) => patch.operation === 'remove')
      ? 'delete'
      : patches.some((patch) => patch.operation === 'add')
        ? existing?.operation === 'duplicate'
          ? 'duplicate'
          : 'create'
        : 'edit';
  const semantic = incoming.patches.length === 0 && existing ? existing : incoming;
  return [...withoutTarget, { ...semantic, summary: incoming.summary, operation, patches, asset }];
}

const playerFromExternalProfile = (profile: AuthoringPlayerProfile): Player => ({
  id: profile.identity.entityId,
  name: profile.identity.fullName,
  shortName: profile.identity.knownName,
  shirtNumber: profile.shirtNumber,
  position: profile.naturalPosition,
  age: profile.identity.age,
  nationality: profile.identity.nationality,
  heightCm: profile.heightCm,
  preferredFoot: profile.preferredFoot as Player['preferredFoot'],
  squadRole: profile.squadRole as Player['squadRole'],
  rating: 50,
  potentialRating: profile.internalPotential,
  matchFitness: 100,
  morale: 70,
  condition: 100,
  appearances: 0,
  goals: 0,
  assists: 0,
  averageRating: 0,
  selected: false,
});

export function projectAuthoringWorld(
  base: ModAuthoringWorld,
  changes: readonly CommunityChange[],
): ModAuthoringWorld {
  let clubs = [...base.clubs];
  let people = [...(base.people ?? [])];
  let players = [...base.players];
  let playerProfiles = [...base.playerProfiles];
  let coaches = [...base.coaches];
  let nations = [...base.nations];
  let regions = [...(base.regions ?? [])];
  let cities = [...(base.cities ?? [])];
  let stadiums = [...(base.stadiums ?? [])];
  let competitions = [...(base.competitions ?? [])];

  for (const patch of changes.flatMap((change) => change.patches)) {
    const remove = patch.operation === 'remove';
    const value = patch.entity?.value;
    switch (patch.entityKind) {
      case 'club':
        clubs = remove
          ? removeById(clubs, patch.targetId, (item) => item.id)
          : replaceById(clubs, patch.targetId, value as (typeof clubs)[number], (item) => item.id);
        break;
      case 'person':
        people = remove
          ? removeById(people, patch.targetId, (item) => item.personId)
          : replaceById(people, patch.targetId, value as FactualPerson, (item) => item.personId);
        break;
      case 'matchdayPlayer':
        players = remove
          ? removeById(players, patch.targetId, (item) => item.id)
          : replaceById(players, patch.targetId, value as Player, (item) => item.id);
        break;
      case 'playerProfile':
        playerProfiles = remove
          ? removeById(playerProfiles, patch.targetId, (item) => item.identity.entityId)
          : replaceById(
              playerProfiles,
              patch.targetId,
              value as AuthoringPlayerProfile,
              (item) => item.identity.entityId,
            );
        break;
      case 'externalPlayer': {
        const profile = (value as { profile?: AuthoringPlayerProfile } | undefined)?.profile;
        players = remove
          ? removeById(players, patch.targetId, (item) => item.id)
          : profile
            ? replaceById(
                players,
                patch.targetId,
                playerFromExternalProfile(profile),
                (item) => item.id,
              )
            : players;
        playerProfiles = remove
          ? removeById(playerProfiles, patch.targetId, (item) => item.identity.entityId)
          : profile
            ? replaceById(playerProfiles, patch.targetId, profile, (item) => item.identity.entityId)
            : playerProfiles;
        break;
      }
      case 'coach':
        coaches = remove
          ? removeById(coaches, patch.targetId, (item) => item.identity.entityId)
          : replaceById(
              coaches,
              patch.targetId,
              value as AuthoringCoachProfile,
              (item) => item.identity.entityId,
            );
        break;
      case 'nation':
        nations = remove
          ? removeById(nations, patch.targetId, (item) => item.id)
          : replaceById(
              nations,
              patch.targetId,
              value as (typeof nations)[number],
              (item) => item.id,
            );
        break;
      case 'region':
        regions = remove
          ? removeById(regions, patch.targetId, (item) => item.id)
          : replaceById(
              regions,
              patch.targetId,
              value as (typeof regions)[number],
              (item) => item.id,
            );
        break;
      case 'city':
        cities = remove
          ? removeById(cities, patch.targetId, (item) => item.id)
          : replaceById(
              cities,
              patch.targetId,
              value as (typeof cities)[number],
              (item) => item.id,
            );
        break;
      case 'stadium':
        stadiums = remove
          ? removeById(stadiums, patch.targetId, (item) => item.id)
          : replaceById(
              stadiums,
              patch.targetId,
              value as (typeof stadiums)[number],
              (item) => item.id,
            );
        break;
      case 'competition':
        competitions = remove
          ? removeById(competitions, patch.targetId, (item) => item.id)
          : replaceById(
              competitions,
              patch.targetId,
              value as StudioCompetition,
              (item) => item.id,
            );
        break;
      default:
        break;
    }
  }

  return {
    ...base,
    clubs,
    people,
    players,
    playerProfiles,
    coaches,
    nations,
    regions,
    cities,
    stadiums,
    competitions,
  };
}

const clubReadiness = (world: ModAuthoringWorld, clubId: string): AuthoringReadiness => {
  const club = world.clubs.find((item) => item.id === clubId);
  if (!club) return { state: 'blocked', label: 'Bloqueado', issues: [] };
  const competition = world.competitions?.find((item) => item.id === club.competitionId);
  const season = competition?.seasons.find(
    (item) => item.id === competition.baseSeasonId || item.participantClubIds.includes(clubId),
  );
  const profiles = world.playerProfiles.filter((item) => item.identity.clubId === clubId);
  const goalkeepers = profiles.filter((item) => item.naturalPosition === 'GK').length;
  const coaches = world.coaches.filter(
    (item) => item.identity.clubId === clubId && item.role.toLowerCase().includes('principal'),
  );
  const candidates: AuthoringIssue[] = [
    {
      code: 'club.nation',
      label: 'Nação não definida',
      explanation: 'Selecione uma nação existente para completar a localização.',
      module: 'clubs',
      field: 'nationId',
      blocking: true,
    },
    {
      code: 'club.city',
      label: 'Cidade não definida',
      explanation: 'Crie ou selecione uma cidade; o rascunho pode ser salvo enquanto isso.',
      module: 'cities',
      field: 'cityId',
      blocking: true,
    },
    {
      code: 'club.competition',
      label: 'Sem competição inicial',
      explanation:
        'Vincule uma competição quando estiver pronto para usar o clube na Nova Carreira.',
      module: 'competitions',
      field: 'competitionId',
      blocking: true,
    },
    {
      code: 'club.season',
      label: 'Não inscrito em uma temporada',
      explanation: 'Adicione o clube aos participantes de uma temporada.',
      module: 'seasons',
      blocking: true,
    },
    {
      code: 'club.roster',
      label: `${profiles.length} de 18 jogadores mínimos`,
      explanation: 'Crie ou importe jogadores vinculados ao clube.',
      module: 'players',
      blocking: true,
    },
    {
      code: 'club.goalkeeper',
      label: 'Nenhum goleiro disponível',
      explanation: 'Adicione pelo menos um jogador com posição Goleiro.',
      module: 'players',
      blocking: true,
    },
    {
      code: 'club.coach',
      label: 'Nenhum treinador principal',
      explanation: 'Crie ou vincule exatamente um treinador principal.',
      module: 'coaches',
      blocking: true,
    },
  ];
  const issues = candidates.filter((issue) => {
    switch (issue.code) {
      case 'club.nation':
        return !club.nationId || !world.nations.some((item) => item.id === club.nationId);
      case 'club.city':
        return !club.cityId || !world.cities?.some((item) => item.id === club.cityId);
      case 'club.competition':
        return !competition;
      case 'club.season':
        return !season?.participantClubIds.includes(clubId);
      case 'club.roster':
        return profiles.length < 18;
      case 'club.goalkeeper':
        return goalkeepers < 1;
      case 'club.coach':
        return coaches.length !== 1;
      default:
        return false;
    }
  });
  if (issues.length > 0) return { state: 'incompleteDraft', label: 'Rascunho incompleto', issues };
  return { state: 'readyForCareer', label: 'Pronto para Nova Carreira', issues: [] };
};

export function readinessForEntity(
  world: ModAuthoringWorld,
  module: StudioModuleId,
  id: string,
): AuthoringReadiness {
  if (module === 'clubs') return clubReadiness(world, id);
  if (module === 'competitions') {
    const competition = world.competitions?.find((item) => item.id === id);
    const participantCount = competition?.seasons[0]?.participantClubIds.length ?? 0;
    return participantCount > 0
      ? { state: 'structurallyValid', label: 'Estruturalmente válido', issues: [] }
      : {
          state: 'incompleteDraft',
          label: 'Rascunho incompleto',
          issues: [
            {
              code: 'competition.participants',
              label: 'Sem participantes',
              explanation: 'A competição pode ser salva agora e receber clubes depois.',
              module: 'competitions',
              blocking: false,
            },
          ],
        };
  }
  return { state: 'structurallyValid', label: 'Estruturalmente válido', issues: [] };
}

const factualPersonReadiness = (person: FactualPerson): AuthoringReadiness => {
  const issues: AuthoringIssue[] = person.readiness.blockers.map((code) => ({
    code,
    label:
      code === 'player.evaluation_missing'
        ? 'Avaliação Rivallo ausente'
        : code === 'player.position_unknown'
          ? 'Posição não informada'
          : code === 'coach.evaluation_missing'
            ? 'Capacidades do treinador não avaliadas'
            : code === 'registration.person_runtime_blocked'
              ? 'Inscrição válida; pessoa ainda não pronta'
              : 'Verificação pendente',
    explanation: code.includes('evaluation')
      ? 'O fato foi preservado sem criar rating, potencial, atributos ou capacidades.'
      : 'Complete ou verifique este dado antes de liberar a pessoa para gameplay.',
    module: person.roles[0]?.kind === 'coach' ? 'coaches' : 'players',
    blocking: true,
  }));
  if (person.readiness.gameplay === 'gameplayReady') {
    return { state: 'readyForCareer', label: 'Pronto para gameplay', issues };
  }
  if (person.readiness.structural === 'structurallyValid') {
    return {
      state: 'structurallyValid',
      label:
        person.readiness.identity === 'partialFactualIdentity'
          ? 'Identidade parcial · bloqueada para gameplay'
          : 'Fatos importados · avaliação pendente',
      issues,
    };
  }
  return { state: 'blocked', label: 'Importação estrutural bloqueada', issues };
};

export function recordsForModule(
  world: ModAuthoringWorld,
  changes: readonly CommunityChange[],
  module: StudioModuleId,
): StudioEntityRecord[] {
  const records: StudioEntityRecord[] = [];
  if (module === 'nations')
    records.push(
      ...world.nations.map((item) => ({
        id: item.id,
        name: item.name,
        detail: item.iso2,
        module,
        value: item,
      })),
    );
  if (module === 'regions')
    records.push(
      ...(world.regions ?? []).map((item) => ({
        id: item.id,
        name: item.name,
        detail:
          world.nations.find((nation) => nation.id === item.nationId)?.name ?? 'Nação pendente',
        module,
        value: item,
      })),
    );
  if (module === 'cities')
    records.push(
      ...(world.cities ?? []).map((item) => ({
        id: item.id,
        name: item.name,
        detail: [
          world.regions?.find((region) => region.id === item.regionId)?.name,
          world.nations.find((nation) => nation.id === item.nationId)?.name ?? 'Nação pendente',
        ]
          .filter(Boolean)
          .join(' · '),
        module,
        value: item,
      })),
    );
  if (module === 'stadiums')
    records.push(
      ...(world.stadiums ?? []).map((item) => ({
        id: item.id,
        name: item.name,
        detail: `${item.capacity.toLocaleString('pt-BR')} lugares`,
        module,
        value: item,
      })),
    );
  if (module === 'clubs')
    records.push(
      ...world.clubs.map((item) => ({
        id: item.id,
        name: item.name,
        detail: `${item.city || 'Cidade pendente'} · ${item.shortName}`,
        module,
        value: item,
        readiness: clubReadiness(world, item.id),
      })),
    );
  if (module === 'players')
    records.push(
      ...world.players.map((item) => ({
        id: item.id,
        name: item.shortName || item.name,
        detail: `${item.position} · ${item.rating}/${item.potentialRating}`,
        module,
        value: item,
      })),
      ...(world.people ?? [])
        .filter((person) => person.roles.some((role) => role.kind === 'player'))
        .map((person) => ({
          id: person.personId,
          name: person.knownName || person.fullName,
          detail: `${person.detailedPosition ?? 'Posição desconhecida'} · Não avaliado`,
          module,
          value: person,
          readiness: factualPersonReadiness(person),
        })),
    );
  if (module === 'coaches' || module === 'staff')
    records.push(
      ...world.coaches
        .filter((item) => module === 'staff' || item.role.toLowerCase().includes('principal'))
        .map((item) => ({
          id: item.identity.entityId,
          name: item.identity.knownName,
          detail: `${item.role} · ${item.identity.clubName || 'Sem clube'}`,
          module,
          value: item,
        })),
      ...(world.people ?? [])
        .filter((person) =>
          person.roles.some((role) => role.kind === (module === 'staff' ? 'staffMember' : 'coach')),
        )
        .map((person) => ({
          id: person.personId,
          name: person.knownName || person.fullName,
          detail: `${person.roles.find((role) => role.kind === (module === 'staff' ? 'staffMember' : 'coach'))?.title ?? 'Função não informada'} · Não avaliado`,
          module,
          value: person,
          readiness: factualPersonReadiness(person),
        })),
    );
  if (module === 'competitions')
    records.push(
      ...(world.competitions ?? []).map((item) => ({
        id: item.id,
        name: item.name,
        detail: `${item.shortName} · ${item.seasons.length} temporada(s)`,
        module,
        value: item,
        readiness: readinessForEntity(world, module, item.id),
      })),
    );
  if (module === 'seasons')
    records.push(
      ...(world.competitions ?? []).flatMap((competition) =>
        competition.seasons.map((item) => ({
          id: item.id,
          name: item.label,
          detail: `${competition.name} · ${item.participantClubIds.length} participantes`,
          module,
          value: { competition, season: item },
        })),
      ),
    );
  if (module === 'contracts')
    records.push(
      ...(world.people ?? [])
        .filter((item) => item.contract)
        .map((item) => ({
          id: `contract:${item.personId}`,
          name: item.knownName || item.fullName,
          detail: `${item.contract?.startedAt ?? 'Início desconhecido'} → ${item.contract?.expiresAt ?? 'Fim desconhecido'}`,
          module,
          value: item,
        })),
      ...world.playerProfiles
        .filter((item) => item.contract)
        .map((item) => ({
          id: `contract:${item.identity.entityId}`,
          name: item.identity.knownName,
          detail: `${item.contract?.startedAt ?? '—'} → ${item.contract?.expiresAt ?? 'Sem fim'}`,
          module,
          value: item,
        })),
      ...world.coaches
        .filter((item) => item.contract)
        .map((item) => ({
          id: `contract:${item.identity.entityId}`,
          name: item.identity.knownName,
          detail: `${item.role} · ${item.contract?.expiresAt ?? 'Sem fim'}`,
          module,
          value: item,
        })),
    );
  if (module === 'registrations')
    records.push(
      ...(world.competitions ?? []).flatMap((competition) =>
        competition.seasons.flatMap((season) =>
          season.playerRegistrations.map((item, index) => ({
            id: item.registrationId ?? `registration:${season.id}:${item.playerId}`,
            name:
              world.playerProfiles.find((profile) => profile.identity.entityId === item.playerId)
                ?.identity.knownName ??
              world.people?.find((person) =>
                person.roles.some((role) => role.roleId === item.playerId),
              )?.knownName ??
              world.people?.find((person) =>
                person.roles.some((role) => role.roleId === item.playerId),
              )?.fullName ??
              `Inscrição ${index + 1}`,
            detail: `${competition.shortName} · ${season.label} · ${item.eligible ? 'Inscrição elegível' : 'Inscrição pendente'}${world.playerProfiles.some((profile) => profile.identity.entityId === item.playerId) ? '' : ' · Runtime bloqueado'}`,
            module,
            value: { competition, season, registration: item, index },
          })),
        ),
      ),
    );
  if (module === 'assets')
    records.push(
      ...changes
        .filter((item) => item.asset)
        .map((item) => ({
          id: item.asset!.id,
          name: item.label,
          detail: item.asset!.kind,
          module,
          value: item.asset,
        })),
    );
  if (module === 'translations')
    records.push(
      ...world.nations.map((item) => ({
        id: item.id,
        name: item.name,
        detail: `${item.aliases?.length ?? 0} nomes alternativos`,
        module,
        value: item,
      })),
    );
  if (module === 'patches')
    records.push(
      ...changes.map((item) => ({
        id: item.id,
        name: item.label,
        detail: `${item.operation} · ${item.kind}`,
        module,
        value: item,
      })),
    );
  return records;
}

export function removalChange(
  record: StudioEntityRecord,
  world?: ModAuthoringWorld,
): CommunityChange | null {
  if (record.module === 'seasons') {
    const context = record.value as StudioSeasonRecordValue;
    const competition =
      world?.competitions?.find((item) => item.id === context.competition.id) ??
      context.competition;
    const seasons = competition.seasons.filter((season) => season.id !== context.season.id);
    const next: StudioCompetition = {
      ...competition,
      baseSeasonId:
        competition.baseSeasonId === context.season.id
          ? (seasons[0]?.id ?? null)
          : competition.baseSeasonId,
      seasons,
    };
    return {
      id: `delete:season:${context.season.id}`,
      kind: 'season',
      operation: 'delete',
      targetId: competition.id,
      label: context.season.label,
      summary: 'Temporada removida da competição',
      patches: [
        {
          operation: 'replace',
          entityKind: 'competition',
          targetId: competition.id,
          entity: { kind: 'competition', value: next },
          reason: `Remoção revisada da temporada ${context.season.label}`,
        },
      ],
      asset: null,
    };
  }
  if (record.module === 'registrations') {
    const context = record.value as StudioRegistrationRecordValue;
    const competition =
      world?.competitions?.find((item) => item.id === context.competition.id) ??
      context.competition;
    const next: StudioCompetition = {
      ...competition,
      seasons: competition.seasons.map((season) =>
        season.id === context.season.id
          ? {
              ...season,
              playerRegistrations: season.playerRegistrations.filter(
                (registration, index) =>
                  index !== context.index ||
                  registration.playerId !== context.registration.playerId,
              ),
            }
          : season,
      ),
    };
    return {
      id: `delete:${record.id}`,
      kind: 'registration',
      operation: 'delete',
      targetId: competition.id,
      label: record.name,
      summary: 'Inscrição removida da temporada',
      patches: [
        {
          operation: 'replace',
          entityKind: 'competition',
          targetId: competition.id,
          entity: { kind: 'competition', value: next },
          reason: `Remoção revisada da inscrição de ${record.name}`,
        },
      ],
      asset: null,
    };
  }
  if (record.module === 'contracts') {
    const person = record.value as AuthoringPlayerProfile | AuthoringCoachProfile | FactualPerson;
    const next = { ...person, contract: null };
    if ('personId' in person) {
      return {
        id: `delete:contract:${person.personId}`,
        kind: 'contract',
        operation: 'delete',
        targetId: person.personId,
        label: record.name,
        summary: 'Contrato factual removido; a pessoa permanece no projeto',
        patches: [
          {
            operation: 'replace',
            entityKind: 'person',
            targetId: person.personId,
            entity: { kind: 'person', value: next },
            reason: `Remoção revisada do contrato de ${record.name}`,
          },
        ],
        asset: null,
      };
    }
    const coach = world?.coaches.some(
      (item) => item.identity.entityId === person.identity.entityId,
    );
    const external = !coach && person.identity.clubId !== world?.activeClubId;
    const entityKind = coach ? 'coach' : external ? 'externalPlayer' : 'playerProfile';
    return {
      id: `delete:contract:${person.identity.entityId}`,
      kind: 'contract',
      operation: 'delete',
      targetId: person.identity.entityId,
      label: record.name,
      summary: 'Contrato removido; a pessoa permanece no projeto',
      patches: [
        {
          operation: 'replace',
          entityKind,
          targetId: person.identity.entityId,
          entity: { kind: entityKind, value: external ? { profile: next } : next },
          reason: `Remoção revisada do contrato de ${record.name}`,
        },
      ],
      asset: null,
    };
  }
  if (record.module === 'translations') {
    const nation = record.value as ModAuthoringWorld['nations'][number];
    if (!nation.aliases?.length) return null;
    const next = { ...nation, aliases: [] };
    return {
      id: `delete:translation:nation:${nation.id}`,
      kind: 'translation',
      operation: 'delete',
      targetId: nation.id,
      label: record.name,
      summary: 'Nomes alternativos removidos',
      patches: [
        {
          operation: 'replace',
          entityKind: 'nation',
          targetId: nation.id,
          entity: { kind: 'nation', value: next },
          reason: `Remoção revisada das traduções de ${record.name}`,
        },
      ],
      asset: null,
    };
  }
  const factualPerson = world?.people?.find((person) => person.personId === record.id);
  if (factualPerson && ['players', 'coaches', 'staff'].includes(record.module)) {
    return {
      id: `delete:person:${record.id}`,
      kind: record.module === 'players' ? 'player' : record.module === 'staff' ? 'staff' : 'coach',
      operation: 'delete',
      targetId: record.id,
      label: record.name,
      summary: 'Pessoa factual removida após revisão de dependentes',
      patches: [
        {
          operation: 'remove',
          entityKind: 'person',
          targetId: record.id,
          reason: `Remoção revisada de ${record.name}`,
        },
      ],
      asset: null,
    };
  }
  const kindMap: Partial<Record<StudioModuleId, GeneratedPackagePatch['entityKind']>> = {
    nations: 'nation',
    regions: 'region',
    cities: 'city',
    stadiums: 'stadium',
    clubs: 'club',
    players: 'externalPlayer',
    coaches: 'coach',
    staff: 'coach',
    competitions: 'competition',
  };
  const entityKind = kindMap[record.module];
  if (!entityKind) return null;
  const changeKind: Partial<Record<StudioModuleId, CommunityChange['kind']>> = {
    nations: 'nation',
    regions: 'region',
    cities: 'city',
    stadiums: 'stadium',
    clubs: 'club',
    players: 'player',
    coaches: 'coach',
    staff: 'coach',
    competitions: 'competition',
  };
  const patches: GeneratedPackagePatch[] =
    record.module === 'players'
      ? world?.playerProfiles.find((item) => item.identity.entityId === record.id)?.identity
          .clubId === world?.activeClubId
        ? [
            {
              operation: 'remove',
              entityKind: 'matchdayPlayer',
              targetId: record.id,
              reason: `Remoção revisada de ${record.name}`,
            },
            {
              operation: 'remove',
              entityKind: 'playerProfile',
              targetId: record.id,
              reason: `Remoção revisada de ${record.name}`,
            },
          ]
        : [
            {
              operation: 'remove',
              entityKind: 'externalPlayer',
              targetId: record.id,
              reason: `Remoção revisada de ${record.name}`,
            },
          ]
      : [
          {
            operation: 'remove',
            entityKind,
            targetId: record.id,
            reason: `Remoção revisada de ${record.name}`,
          },
        ];
  return {
    id: `delete:${entityKind}:${record.id}`,
    kind: changeKind[record.module] ?? 'club',
    operation: 'delete',
    targetId: record.id,
    label: record.name,
    summary: 'Remoção segura pendente de validação de dependentes',
    patches,
    asset: null,
  };
}

export function dependentRecords(
  world: ModAuthoringWorld,
  record: StudioEntityRecord,
): readonly { readonly label: string; readonly module: StudioModuleId; readonly id: string }[] {
  if (record.module === 'nations')
    return [
      ...(world.regions ?? [])
        .filter((item) => item.nationId === record.id)
        .map((item) => ({ label: item.name, module: 'regions' as const, id: item.id })),
      ...(world.cities ?? [])
        .filter((item) => item.nationId === record.id)
        .map((item) => ({ label: item.name, module: 'cities' as const, id: item.id })),
      ...world.clubs
        .filter((item) => item.nationId === record.id)
        .map((item) => ({ label: item.name, module: 'clubs' as const, id: item.id })),
      ...(world.competitions ?? [])
        .filter((item) => item.nationId === record.id)
        .map((item) => ({ label: item.name, module: 'competitions' as const, id: item.id })),
    ];
  if (record.module === 'regions')
    return (world.cities ?? [])
      .filter((item) => item.regionId === record.id)
      .map((item) => ({ label: item.name, module: 'cities' as const, id: item.id }));
  if (record.module === 'cities')
    return [
      ...(world.stadiums ?? [])
        .filter((item) => item.cityId === record.id)
        .map((item) => ({ label: item.name, module: 'stadiums' as const, id: item.id })),
      ...world.clubs
        .filter((item) => item.cityId === record.id)
        .map((item) => ({ label: item.name, module: 'clubs' as const, id: item.id })),
    ];
  if (record.module === 'stadiums')
    return world.clubs
      .filter((item) => item.stadiumId === record.id)
      .map((item) => ({ label: item.name, module: 'clubs' as const, id: item.id }));
  if (record.module === 'clubs')
    return [
      ...world.playerProfiles
        .filter((item) => item.identity.clubId === record.id)
        .map((item) => ({
          label: item.identity.knownName,
          module: 'players' as const,
          id: item.identity.entityId,
        })),
      ...world.coaches
        .filter((item) => item.identity.clubId === record.id)
        .map((item) => ({
          label: item.identity.knownName,
          module: 'staff' as const,
          id: item.identity.entityId,
        })),
      ...(world.stadiums ?? [])
        .filter((item) => item.ownerClubId === record.id)
        .map((item) => ({ label: item.name, module: 'stadiums' as const, id: item.id })),
      ...(world.competitions ?? []).flatMap((competition) =>
        competition.seasons
          .filter((season) => season.participantClubIds.includes(record.id))
          .map((season) => ({
            label: `${competition.shortName} · ${season.label}`,
            module: 'seasons' as const,
            id: season.id,
          })),
      ),
    ];
  if (record.module === 'players')
    return (world.competitions ?? []).flatMap((competition) =>
      competition.seasons.flatMap((season) =>
        season.playerRegistrations
          .filter((registration) => registration.playerId === record.id)
          .map((registration) => ({
            label: `${competition.shortName} · ${season.label}`,
            module: 'registrations' as const,
            id: `registration:${season.id}:${registration.playerId}`,
          })),
      ),
    );
  if (record.module === 'competitions')
    return world.clubs
      .filter((item) => item.competitionId === record.id)
      .map((item) => ({ label: item.name, module: 'clubs' as const, id: item.id }));
  if (record.module === 'seasons') {
    const context = record.value as StudioSeasonRecordValue;
    return context.season.playerRegistrations.map((registration) => ({
      label:
        world.playerProfiles.find((profile) => profile.identity.entityId === registration.playerId)
          ?.identity.knownName ?? registration.playerId,
      module: 'registrations' as const,
      id: `registration:${context.season.id}:${registration.playerId}`,
    }));
  }
  return [];
}
