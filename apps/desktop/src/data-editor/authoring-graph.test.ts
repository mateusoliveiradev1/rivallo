import { describe, expect, it } from 'vitest';

import {
  projectAuthoringWorld,
  reconcileAuthoringChange,
  readinessForEntity,
  recordsForModule,
  removalChange,
} from './authoring-graph.js';
import type { CommunityChange, ModAuthoringWorld } from './types.js';

const world: ModAuthoringWorld = {
  clubs: [
    {
      id: 'club.draft',
      name: 'Clube Rascunho',
      shortName: 'CR',
      city: '',
      primaryColor: '#237a57',
      countryCode: null,
      competitionName: null,
      stadiumName: null,
      nationId: null,
      cityId: null,
      competitionId: null,
      stadiumId: null,
      crestAssetId: null,
      historySummary: null,
    },
  ],
  players: [],
  playerProfiles: [],
  coaches: [],
  nations: [{ id: 'nation.br', name: 'Brasil', iso2: 'BR', iso3: 'BRA' }],
  regions: [],
  cities: [],
  stadiums: [],
  competitions: [],
  activeClubId: 'club.draft',
};

const change = (
  kind: CommunityChange['kind'],
  entityKind: 'city' | 'stadium' | 'competition',
  id: string,
  value: unknown,
): CommunityChange => ({
  id: `${kind}:${id}`,
  kind,
  operation: 'create',
  targetId: id,
  label: id,
  summary: 'Rascunho',
  patches: [
    {
      operation: 'add',
      entityKind,
      targetId: id,
      entity: { kind: entityKind, value },
      reason: 'Teste',
    },
  ],
  asset: null,
});

describe('Creator Studio authoring graph', () => {
  it('projects cities and stadiums created before club relationships are resolved', () => {
    const changes = [
      change('city', 'city', 'city.nova', {
        id: 'city.nova',
        name: 'Nova',
        nationId: 'nation.br',
        regionId: null,
      }),
      change('stadium', 'stadium', 'stadium.novo', {
        id: 'stadium.novo',
        name: 'Arena Nova',
        cityId: 'city.nova',
        ownerClubId: null,
        capacity: 22000,
        assetId: null,
      }),
    ];
    const projected = projectAuthoringWorld(world, changes);
    expect(projected.cities?.map((item) => item.id)).toContain('city.nova');
    expect(projected.stadiums?.map((item) => item.id)).toContain('stadium.novo');
    expect(recordsForModule(projected, changes, 'stadiums')[0]?.detail).toContain('22.000');
  });

  it('keeps club and competition drafts saveable while readiness remains actionable', () => {
    const competition = {
      id: 'competition.draft',
      name: 'Liga em construção',
      shortName: 'Liga',
      nationId: 'nation.br',
      baseSeasonId: null,
      seasons: [],
    };
    const projected = projectAuthoringWorld(world, [
      change('competition', 'competition', competition.id, competition),
    ]);
    const club = readinessForEntity(projected, 'clubs', 'club.draft');
    const competitionReadiness = readinessForEntity(projected, 'competitions', competition.id);
    expect(club.state).toBe('incompleteDraft');
    expect(club.issues.map((item) => item.code)).toContain('club.competition');
    expect(competitionReadiness.state).toBe('incompleteDraft');
    expect(competitionReadiness.issues[0]?.blocking).toBe(false);
  });

  it('creates a reversible remove patch and projects the deletion', () => {
    const projected = projectAuthoringWorld(world, []);
    const nation = recordsForModule(projected, [], 'nations')[0]!;
    const remove = removalChange(nation, projected)!;
    expect(remove.operation).toBe('delete');
    expect(remove.patches[0]?.operation).toBe('remove');
    expect(projectAuthoringWorld(projected, [remove]).nations).toHaveLength(0);
  });

  it('keeps Add while editing a new entity projected into the draft world', () => {
    const created = change('city', 'city', 'city.nova', {
      id: 'city.nova',
      name: 'Nova',
      nationId: 'nation.br',
      regionId: null,
    });
    const edited: CommunityChange = {
      ...created,
      operation: 'edit',
      patches: [
        {
          ...created.patches[0]!,
          operation: 'replace',
          entity: {
            kind: 'city',
            value: {
              id: 'city.nova',
              name: 'Nova Esperança',
              nationId: 'nation.br',
              regionId: null,
            },
          },
        },
      ],
    };
    const reconciled = reconcileAuthoringChange(world, [created], edited);
    expect(reconciled).toHaveLength(1);
    expect(reconciled[0]?.operation).toBe('create');
    expect(reconciled[0]?.patches[0]?.operation).toBe('add');
  });

  it('drops a new entity entirely when it is deleted', () => {
    const created = change('city', 'city', 'city.nova', {
      id: 'city.nova',
      name: 'Nova',
      nationId: 'nation.br',
      regionId: null,
    });
    const projected = projectAuthoringWorld(world, [created]);
    const record = recordsForModule(projected, [created], 'cities')[0]!;
    expect(reconcileAuthoringChange(world, [created], removalChange(record, projected)!)).toEqual(
      [],
    );
  });

  it('projects one partial factual person across roles without inventing sporting profiles', () => {
    const person = {
      personId: 'synthetic.person.alpha',
      externalIds: [{ source: 'synthetic', externalId: 'alpha-1' }],
      fullName: 'Pessoa Sintética Alpha',
      knownName: null,
      birthDate: null,
      heightCm: null,
      weightKg: null,
      preferredFoot: null,
      nationalityId: null,
      secondNationalityId: null,
      detailedPosition: null,
      shirtNumber: null,
      contract: null,
      roles: [
        { roleId: 'synthetic.player.alpha', kind: 'player', clubId: 'club.draft', title: null },
        {
          roleId: 'synthetic.coach.alpha',
          kind: 'coach',
          clubId: 'club.draft',
          title: 'Função sintética',
        },
      ],
      provenance: [
        {
          source: 'synthetic',
          sourceRecordId: 'alpha-1',
          observedAt: null,
          verificationStatus: 'pending',
          fields: ['fullName'],
        },
      ],
      readiness: {
        identity: 'partialFactualIdentity',
        structural: 'structurallyValid',
        runtimeProfile: 'runtimeProfileBlocked',
        evaluation: 'awaitingEvaluation',
        gameplay: 'gameplayBlocked',
        blockers: ['player.position_unknown', 'player.evaluation_missing'],
      },
    } as const;
    const created: CommunityChange = {
      id: `person:${person.personId}`,
      kind: 'player',
      operation: 'create',
      targetId: person.personId,
      label: person.fullName,
      summary: '1 fato · avaliação ausente',
      patches: [
        {
          operation: 'add',
          entityKind: 'person',
          targetId: person.personId,
          entity: { kind: 'person', value: person },
          reason: 'Fixture factual sintética',
        },
      ],
      asset: null,
    };
    const projected = projectAuthoringWorld(world, [created]);

    expect(projected.people).toHaveLength(1);
    expect(projected.playerProfiles).toHaveLength(0);
    expect(projected.coaches).toHaveLength(0);
    expect(recordsForModule(projected, [created], 'players')[0]).toEqual(
      expect.objectContaining({
        name: 'Pessoa Sintética Alpha',
        detail: 'Posição desconhecida · Não avaliado',
        readiness: expect.objectContaining({
          label: 'Identidade parcial · bloqueada para gameplay',
        }),
      }),
    );
    expect(recordsForModule(projected, [created], 'coaches')).toHaveLength(1);

    const edited: CommunityChange = {
      ...created,
      operation: 'edit',
      patches: [
        {
          ...created.patches[0]!,
          operation: 'replace',
          entity: { kind: 'person', value: { ...person, knownName: 'Alpha' } },
        },
      ],
    };
    const reconciled = reconcileAuthoringChange(world, [created], edited);
    expect(reconciled).toHaveLength(1);
    expect(reconciled[0]?.patches[0]?.operation).toBe('add');
    expect(projectAuthoringWorld(world, reconciled).people?.[0]?.knownName).toBe('Alpha');
  });

  it('uses Replace and Remove only for entities owned by the base composition', () => {
    const editedNation: CommunityChange = {
      ...change('nation', 'city', 'nation.br', {}),
      kind: 'nation',
      patches: [
        {
          operation: 'add',
          entityKind: 'nation',
          targetId: 'nation.br',
          entity: {
            kind: 'nation',
            value: { id: 'nation.br', name: 'Brasil', iso2: 'BR', iso3: 'BRA' },
          },
          reason: 'Teste',
        },
      ],
    };
    const edited = reconcileAuthoringChange(world, [], editedNation);
    expect(edited).toEqual([]);

    const changed = reconcileAuthoringChange(world, [], {
      ...editedNation,
      patches: [
        {
          ...editedNation.patches[0]!,
          entity: {
            kind: 'nation',
            value: { id: 'nation.br', name: 'Brasil Atualizado', iso2: 'BR', iso3: 'BRA' },
          },
        },
      ],
    });
    expect(changed[0]?.patches[0]?.operation).toBe('replace');
    const nation = recordsForModule(world, [], 'nations')[0]!;
    const removed = reconcileAuthoringChange(world, changed, removalChange(nation, world)!);
    expect(removed[0]?.patches[0]?.operation).toBe('remove');
  });

  it('edits nested data canonically when seasons, registrations, contracts and labels are deleted', () => {
    const nestedWorld = {
      ...world,
      nations: [{ ...world.nations[0], aliases: ['Brasil', 'Brazil'] }],
      playerProfiles: [
        {
          identity: {
            entityId: 'player.one',
            fullName: 'Jogador Um',
            knownName: 'Jogador Um',
            nationality: 'Brasil',
            birthDate: '2000-01-01',
            age: 26,
            clubId: 'club.draft',
            clubName: 'Clube Rascunho',
            clubShortName: 'CR',
            clubPrimaryColor: '#237a57',
          },
          shirtNumber: 10,
          heightCm: 180,
          weightKg: 75,
          preferredFoot: 'right',
          squadRole: 'Titular',
          naturalPosition: 'CM',
          attributes: {},
          internalPotential: 70,
          contract: {
            clubId: 'club.draft',
            startedAt: '2026-01-01',
            expiresAt: '2027-12-31',
            squadStatus: 'Ativo',
          },
        },
      ],
      competitions: [
        {
          id: 'competition.one',
          name: 'Liga Um',
          shortName: 'Liga',
          nationId: 'nation.br',
          baseSeasonId: 'season.one',
          seasons: [
            {
              id: 'season.one',
              competitionId: 'competition.one',
              label: '2026',
              startDate: '2026-01-01',
              endDate: '2026-12-31',
              participantClubIds: ['club.draft'],
              stages: [],
              rules: {},
              registrationWindows: [],
              calendarConstraints: {},
              playerRegistrations: [
                {
                  playerId: 'player.one',
                  clubId: 'club.draft',
                  shirtNumber: 10,
                  contractReference: null,
                  eligible: true,
                },
              ],
            },
          ],
        },
      ],
    } as unknown as ModAuthoringWorld;

    const registration = recordsForModule(nestedWorld, [], 'registrations')[0]!;
    expect(registration.id).toBe('registration:season.one:player.one');
    const withoutRegistration = projectAuthoringWorld(nestedWorld, [
      removalChange(registration, nestedWorld)!,
    ]);
    expect(withoutRegistration.competitions?.[0]?.seasons[0]?.playerRegistrations).toHaveLength(0);

    const contract = recordsForModule(nestedWorld, [], 'contracts')[0]!;
    const withoutContract = projectAuthoringWorld(nestedWorld, [
      removalChange(contract, nestedWorld)!,
    ]);
    expect(withoutContract.playerProfiles[0]?.contract).toBeNull();

    const labels = recordsForModule(nestedWorld, [], 'translations')[0]!;
    const withoutLabels = projectAuthoringWorld(nestedWorld, [removalChange(labels, nestedWorld)!]);
    expect(withoutLabels.nations[0]?.aliases).toEqual([]);

    const season = recordsForModule(nestedWorld, [], 'seasons')[0]!;
    const withoutSeason = projectAuthoringWorld(nestedWorld, [removalChange(season, nestedWorld)!]);
    expect(withoutSeason.competitions?.[0]?.seasons).toHaveLength(0);
    expect(withoutSeason.competitions?.[0]?.baseSeasonId).toBeNull();
  });
});
