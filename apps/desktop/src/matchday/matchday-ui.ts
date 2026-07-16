import type { SortKey, SquadSortState } from './squad-sort.js';
import { formationPresets } from './tactics-model.js';
import type { Formation, Player, PreferredFoot, SquadRole, TacticalApproach } from './types.js';

export type Density = 'compact' | 'standard' | 'comfortable';
export type OptionalColumn = Exclude<SortKey, 'shirtNumber' | 'info' | 'name' | 'position'>;
export type ActiveScreen = 'squad' | 'tactics';
export type SquadFilter = 'all' | 'selected' | 'reserve';
export type SquadSortPreset =
  | 'position'
  | 'lineup'
  | 'shirtNumber'
  | 'rating'
  | 'potentialRating'
  | 'condition'
  | 'age'
  | 'averageRating';
export type RoleFilter = 'all' | 'goalkeepers' | 'defenders' | 'midfielders' | 'attackers';
export type StatusFilter = 'all' | 'ready' | 'attention';
export type TacticalTool = 'analysis' | 'tactics' | 'instructions' | 'opposition';
export type PitchMode = 'roles' | 'condition' | 'familiarity';

export interface UiPreferences {
  readonly sidebarCollapsed: boolean;
  readonly activeScreen: ActiveScreen;
  readonly showPlayerDetails: boolean;
  readonly pitchMode: PitchMode;
}

export const optionalColumns: readonly OptionalColumn[] = [
  'age',
  'nationality',
  'heightCm',
  'preferredFoot',
  'squadRole',
  'rating',
  'potentialRating',
  'matchFitness',
  'morale',
  'condition',
  'appearances',
  'goals',
  'assists',
  'averageRating',
];

export const optionalColumnLabels: Record<OptionalColumn, string> = {
  age: 'Idade',
  nationality: 'Nacionalidade (NAT)',
  heightCm: 'Altura',
  preferredFoot: 'Pé preferido',
  squadRole: 'Função no elenco',
  rating: 'Capacidade atual (CA)',
  potentialRating: 'Potencial (PA)',
  matchFitness: 'Ritmo de jogo',
  morale: 'Moral',
  condition: 'Condição',
  appearances: 'Jogos',
  goals: 'Gols',
  assists: 'Assistências',
  averageRating: 'Média',
};

export const squadColumnLabels: Record<SortKey, string> = {
  shirtNumber: '#',
  info: 'INF',
  name: 'Jogador',
  position: 'POS',
  age: 'IDADE',
  nationality: 'NAT',
  heightCm: 'ALT.',
  preferredFoot: 'PÉ',
  squadRole: 'FUNÇÃO',
  rating: 'CA',
  potentialRating: 'PA',
  matchFitness: 'RITMO',
  morale: 'MORAL',
  condition: 'COND.',
  appearances: 'J',
  goals: 'G',
  assists: 'A',
  averageRating: 'MÉD.',
};

export const squadColumnSortLabels: Record<SortKey, string> = {
  shirtNumber: 'número da camisa',
  info: 'situação no XI e prontidão',
  name: 'nome do jogador',
  position: 'posição, de goleiro a atacante',
  age: 'idade',
  nationality: 'nacionalidade',
  heightCm: 'altura',
  preferredFoot: 'pé preferido',
  squadRole: 'função no elenco',
  rating: 'capacidade atual',
  potentialRating: 'potencial',
  matchFitness: 'ritmo de jogo',
  morale: 'moral',
  condition: 'condição física',
  appearances: 'jogos disputados',
  goals: 'gols',
  assists: 'assistências',
  averageRating: 'avaliação média',
};

export const preferredFootLabels: Record<PreferredFoot, string> = {
  left: 'Esq.',
  right: 'Dir.',
};

export const squadRoleLabels: Record<SquadRole, string> = {
  keyPlayer: 'Jogador-chave',
  firstTeam: 'Equipe principal',
  rotation: 'Rotação',
  prospect: 'Promessa',
  backup: 'Reserva',
};

export const defaultSquadSort: SquadSortState = { key: 'position', direction: 'asc' };

export const squadSortPresets: readonly {
  readonly id: SquadSortPreset;
  readonly label: string;
  readonly sort: SquadSortState;
}[] = [
  { id: 'position', label: 'Posição · GOL → ATA', sort: defaultSquadSort },
  { id: 'lineup', label: 'XI e prontidão', sort: { key: 'info', direction: 'asc' } },
  { id: 'shirtNumber', label: 'Número da camisa', sort: { key: 'shirtNumber', direction: 'asc' } },
  { id: 'rating', label: 'Maior CA', sort: { key: 'rating', direction: 'desc' } },
  {
    id: 'potentialRating',
    label: 'Maior PA',
    sort: { key: 'potentialRating', direction: 'desc' },
  },
  { id: 'condition', label: 'Melhor condição', sort: { key: 'condition', direction: 'desc' } },
  { id: 'age', label: 'Mais jovens', sort: { key: 'age', direction: 'asc' } },
  {
    id: 'averageRating',
    label: 'Melhor média',
    sort: { key: 'averageRating', direction: 'desc' },
  },
];

export const positionLabels: Record<Player['position'], string> = {
  GK: 'GOL',
  RB: 'LD',
  CB: 'ZAG',
  LB: 'LE',
  DM: 'VOL',
  CM: 'MC',
  AM: 'MEI',
  RW: 'PD',
  LW: 'PE',
  ST: 'ATA',
};

export const positionLongLabels: Record<Player['position'], string> = {
  GK: 'Goleiro',
  RB: 'Lateral-direito',
  CB: 'Zagueiro',
  LB: 'Lateral-esquerdo',
  DM: 'Volante',
  CM: 'Meia central',
  AM: 'Meia ofensivo',
  RW: 'Ponta-direita',
  LW: 'Ponta-esquerda',
  ST: 'Atacante',
};

export const approachCopy: Record<
  TacticalApproach,
  { readonly title: string; readonly description: string; readonly mentality: string }
> = {
  balanced: {
    title: 'Equilibrado',
    description: 'Ritmo controlado e ocupação estável entre os setores.',
    mentality: 'Equilibrada',
  },
  frontFoot: {
    title: 'Protagonista',
    description: 'Pressão alta, amplitude e iniciativa constante com a bola.',
    mentality: 'Positiva',
  },
  compact: {
    title: 'Compacto',
    description: 'Proteção do corredor central com bloco médio coordenado.',
    mentality: 'Cautelosa',
  },
};

export const formationOptions: readonly Formation[] = formationPresets.map(({ id }) => id);

export const rolePositions: Record<Exclude<RoleFilter, 'all'>, readonly Player['position'][]> = {
  goalkeepers: ['GK'],
  defenders: ['RB', 'CB', 'LB'],
  midfielders: ['DM', 'CM', 'AM'],
  attackers: ['RW', 'LW', 'ST'],
};
