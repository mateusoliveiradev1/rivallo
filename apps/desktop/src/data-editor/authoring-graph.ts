import type { Player } from '../matchday/types.js';
import type {
  AuthoringCoachProfile,
  AuthoringPlayerProfile,
  CommunityChange,
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
        detail:
          world.nations.find((nation) => nation.id === item.nationId)?.name ?? 'Nação pendente',
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
            id: `${season.id}:registration:${index}`,
            name: `Inscrição ${index + 1}`,
            detail: `${competition.shortName} · ${season.label}`,
            module,
            value: item,
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
    ];
  if (record.module === 'cities')
    return [
      ...(world.stadiums ?? [])
        .filter((item) => item.cityId === record.id)
        .map((item) => ({ label: item.name, module: 'stadiums' as const, id: item.id })),
      ...world.clubs
        .filter((item) => item.cityId === record.id)
        .map((item) => ({ label: item.name, module: 'clubs' as const, id: item.id })),
    ];
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
    ];
  return [];
}
