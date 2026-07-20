import type { Position } from '../matchday/types.js';
import type {
  CoachProfileProjection,
  ExplainableRating,
  KnowledgeValue,
  PlayerProfileProjection,
} from './types.js';

export const exactValue = (value: number): KnowledgeValue => ({
  kind: 'exact',
  value,
  minimum: value,
  maximum: value,
  label: String(value),
});

export const rangeValue = (minimum: number, maximum: number): KnowledgeValue => ({
  kind: 'range',
  value: null,
  minimum,
  maximum,
  label: `${minimum}–${maximum}`,
});

export const ratingFixture = (
  contextId: string,
  contextLabel: string,
  value = 78,
): ExplainableRating => ({
  ratingKind: contextId.includes('coach') ? 'coachRole' : 'contextual',
  contextId,
  contextLabel,
  realValue: value,
  perceived: exactValue(value),
  confidence: 92,
  source: 'Comissão técnica',
  updatedAt: Date.UTC(2026, 6, 15),
  scaleVersion: 'rivallo.rating.0-100.v1',
  factors: [
    {
      factorId: `${contextId}.position`,
      label: 'Posição',
      value: 80,
      weight: 50,
      contribution: 40,
      impact: 'positive',
      explanation: 'Atributos sustentam o contexto nominal.',
      source: 'Perfil esportivo',
    },
    {
      factorId: `${contextId}.familiarity`,
      label: 'Familiaridade',
      value: 70,
      weight: 10,
      contribution: 7,
      impact: 'neutral',
      explanation: 'Consumida diretamente do plano tático.',
      source: 'Modelo tático 06.3',
    },
  ],
  summary: 'Boa resposta para o contexto atual.',
});

export const playerProfileFixture = ({
  entityId = 'p1',
  fullName = 'Caio Brandão',
  knownName = 'Caio Brandão',
  position = 'GK',
  nationality = 'BRA',
  knowledge = 'ownClub',
}: {
  readonly entityId?: string;
  readonly fullName?: string;
  readonly knownName?: string;
  readonly position?: Position;
  readonly nationality?: string;
  readonly knowledge?: 'ownClub' | 'partial';
} = {}): PlayerProfileProjection => {
  const limited = knowledge === 'partial';
  const contextualRating = ratingFixture(`${entityId}.context`, 'Rating contextual', 78);
  const currentAbility = {
    ...ratingFixture(`${entityId}.ability`, 'Capacidade atual', 77),
    ratingKind: 'currentAbility' as const,
    perceived: limited ? rangeValue(72, 80) : exactValue(77),
  };
  const tacticalFit = {
    ...ratingFixture(`${entityId}.fit`, 'Encaixe tático', 76),
    ratingKind: 'tacticalFit' as const,
  };
  return {
    schemaVersion: 1,
    revision: 1,
    identity: {
      entityId,
      fullName,
      knownName,
      nationality,
      birthDate: '2002-01-10',
      age: 24,
      clubId: limited ? 'ferroviario' : 'aurora',
      clubName: limited ? 'Ferroviário do Vale' : 'Aurora Futebol Clube',
      clubShortName: limited ? 'FDV' : 'AUR',
      clubPrimaryColor: limited ? '#d18a42' : '#35c88a',
    },
    shirtNumber: 1,
    heightCm: 188,
    weightKg: 82,
    preferredFoot: 'Direito',
    squadRole: 'Titular',
    naturalPosition: position,
    currentAbility,
    contextualRating: limited
      ? { ...contextualRating, realValue: null, perceived: rangeValue(73, 81), confidence: 58 }
      : contextualRating,
    tacticalFit,
    tacticalFamiliarity: limited ? null : 71,
    positionRatings: [
      {
        positionId: position,
        suitability: 'Natural',
        rating: {
          ...ratingFixture(`${entityId}.${position}`, 'Rating por posição', 79),
          ratingKind: 'position',
        },
      },
    ],
    roleRatings: [
      {
        roleId: 'support',
        roleLabel: 'Apoio',
        positionId: position,
        responsibilities: ['Sustentar a estrutura', 'Dar opção segura'],
        rating: {
          ...ratingFixture(`${entityId}.support`, 'Rating por função', 77),
          ratingKind: 'role',
        },
      },
    ],
    attributeGroups: [
      {
        category: 'technical',
        label: 'Técnicos',
        attributes: [
          {
            attributeId: 'passing',
            label: 'Passe',
            category: 'technical',
            perceived: limited ? rangeValue(70, 78) : exactValue(76),
            confidence: limited ? 58 : 94,
            source: limited ? 'Observação parcial' : 'Comissão técnica',
            updatedAt: Date.UTC(2026, 6, 15),
          },
        ],
      },
      {
        category: 'mental',
        label: 'Mentais',
        attributes: [
          {
            attributeId: 'decisions',
            label: 'Decisões',
            category: 'mental',
            perceived: limited ? rangeValue(68, 78) : exactValue(79),
            confidence: limited ? 52 : 91,
            source: limited ? 'Observação parcial' : 'Comissão técnica',
            updatedAt: Date.UTC(2026, 6, 15),
          },
        ],
      },
    ],
    condition: limited ? null : 95,
    matchFitness: limited ? null : 91,
    form: limited
      ? { kind: 'unknown', value: null, minimum: null, maximum: null, label: 'Desconhecida' }
      : exactValue(74),
    potential: {
      perceived: limited ? rangeValue(76, 86) : rangeValue(80, 85),
      confidence: limited ? 45 : 72,
      source: 'Avaliação da comissão',
      updatedAt: Date.UTC(2026, 6, 15),
      dynamic: false,
      explanation: 'Estimativa observada; o potencial interno permanece protegido.',
    },
    knowledge: {
      entityId,
      observerClubId: 'aurora',
      knowledgeLevel: limited ? 'partial' : 'ownClub',
      confidence: limited ? 58 : 94,
      source: limited ? 'Observação parcial' : 'Comissão técnica',
      observedAt: Date.UTC(2026, 6, 10),
      updatedAt: Date.UTC(2026, 6, 15),
      expiresAt: limited ? Date.UTC(2026, 7, 15) : null,
      knownFields: ['identidade', 'posição'],
      estimatedFields: limited ? ['atributos', 'capacidade'] : ['potencial'],
      hiddenFields: limited ? ['condição', 'valor interno'] : ['potencial interno'],
      assessmentVersion: 1,
    },
    strengths: ['Leitura de jogo', 'Passe seguro'],
    weaknesses: limited ? ['Aceleração ainda incerta'] : ['Jogo aéreo'],
    alerts: limited ? ['Relatório com confiança moderada'] : [],
    contract: limited
      ? null
      : {
          clubId: 'aurora',
          startedAt: '2024-01-01',
          expiresAt: '2028-12-31',
          squadStatus: 'Ativo',
        },
    statistics: {
      appearances: 14,
      minutes: 1260,
      goals: 0,
      assists: 1,
      cards: 1,
      averageRating: 7.12,
      source: 'Competições oficiais',
    },
    ratingHistory: [
      {
        snapshotId: `${entityId}.snapshot`,
        entityId,
        ratingKind: 'contextual',
        value: 78,
        positionId: position,
        roleId: 'support',
        variationId: 'tactical-variation.primary',
        familiarity: 71,
        confidence: limited ? 58 : 94,
        source: 'Bootstrap 06.4',
        recordedAt: Date.UTC(2026, 6, 15),
      },
    ],
    development: {
      playerId: entityId,
      currentAbility: 77,
      potentialEstimate: {
        perceived: rangeValue(80, 85),
        confidence: 72,
        source: 'Avaliação da comissão',
        updatedAt: Date.UTC(2026, 6, 15),
        dynamic: false,
        explanation: 'Base para a Fase 06.8',
      },
      attributeHistory: [],
      ratingHistory: [],
      personality: null,
      professionalism: null,
      ambition: null,
      status: 'Base preparada',
    },
    training: {
      playerId: entityId,
      preferredPosition: position,
      preferredRoleId: 'support',
      futureIndividualPlanId: null,
      status: 'Aguardando Fase 06.8',
    },
  };
};

export const coachProfileFixture = ({
  entityId = 'coach.aurora.1',
  external = false,
}: {
  readonly entityId?: string;
  readonly external?: boolean;
} = {}): CoachProfileProjection => ({
  schemaVersion: 1,
  revision: 1,
  identity: {
    entityId,
    fullName: external ? 'Héctor Salvatierra' : 'Marcelo Nunes',
    knownName: external ? 'H. Salvatierra' : 'Marcelo Nunes',
    nationality: external ? 'URU' : 'BRA',
    birthDate: '1978-04-20',
    age: 48,
    clubId: external ? 'ferroviario' : 'aurora',
    clubName: external ? 'Ferroviário do Vale' : 'Aurora Futebol Clube',
    clubShortName: external ? 'FDV' : 'AUR',
    clubPrimaryColor: external ? '#d18a42' : '#35c88a',
  },
  role: 'Treinador principal',
  reputation: external ? rangeValue(68, 78) : exactValue(76),
  qualification: 'Licença Continental Pro',
  experienceYears: 16,
  style: 'Controle territorial com pressão coordenada',
  preferredFormations: ['4-3-3', '4-2-3-1'],
  contextualRating: ratingFixture(`${entityId}.coach`, 'Treinador principal', 79),
  categoryRatings: [
    ratingFixture(`${entityId}.tactics`, 'Tática', 81),
    ratingFixture(`${entityId}.people`, 'Gestão humana', 75),
  ],
  knowledge: {
    entityId,
    observerClubId: 'aurora',
    knowledgeLevel: external ? 'partial' : 'ownClub',
    confidence: external ? 62 : 95,
    source: external ? 'Informação pública e observação' : 'Clube',
    observedAt: Date.UTC(2026, 6, 10),
    updatedAt: Date.UTC(2026, 6, 15),
    expiresAt: external ? Date.UTC(2026, 8, 15) : null,
    knownFields: ['cargo', 'formações'],
    estimatedFields: external ? ['capacidades'] : ['reputação'],
    hiddenFields: external ? ['detalhes internos'] : [],
    assessmentVersion: 1,
  },
  strengths: ['Organização tática', 'Desenvolvimento de jovens'],
  weaknesses: ['Adaptação durante partidas'],
  specialties: ['Jovens', 'Aprendizagem de função'],
  contract: external
    ? null
    : { clubId: 'aurora', startedAt: '2025-01-01', expiresAt: '2027-12-31', squadStatus: 'Ativo' },
  careerHistory: ['Aurora Futebol Clube · 2025–atual', 'União Costeira · 2021–2024'],
  ratingHistory: [],
  development: {
    coachId: entityId,
    technicalDevelopment: 82,
    physicalDevelopment: 70,
    mentalDevelopment: 78,
    tacticalDevelopment: 84,
    youthDevelopment: 86,
    positionAdaptation: 74,
    roleTeaching: 83,
    motivation: 77,
    peopleManagement: 75,
    assessmentAccuracy: 80,
    specialties: ['Jovens', 'Aprendizagem de função'],
  },
});
