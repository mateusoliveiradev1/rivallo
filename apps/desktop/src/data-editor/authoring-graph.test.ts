import { describe, expect, it } from 'vitest';

import {
  projectAuthoringWorld,
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
});
