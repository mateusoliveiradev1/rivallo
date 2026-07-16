import type { TableDefinition } from '../ui/DataTable/index.js';
import { positionLabels, preferredFootLabels, squadRoleLabels } from './matchday-ui.js';
import { SQUAD_TABLE_SCHEMA, type SquadColumnId } from './squad-table-schema.js';
import type { Player } from './types.js';

const shortLabels: Record<SquadColumnId, string> = {
  shirtNumber: 'Nº',
  info: 'XI',
  name: 'Jogador',
  position: 'Pos.',
  age: 'Idade',
  nationality: 'Nac.',
  heightCm: 'Altura',
  preferredFoot: 'Pé',
  squadRole: 'Função',
  rating: 'CA',
  potentialRating: 'PA',
  matchFitness: 'Ritmo',
  morale: 'Moral',
  condition: 'Condição',
  appearances: 'Jogos',
  goals: 'Gols',
  assists: 'Assist.',
  averageRating: 'Média',
};

const descriptions: Record<SquadColumnId, string> = {
  shirtNumber: 'Número da camisa',
  info: 'Situação no XI inicial',
  name: 'Nome e posição natural do jogador',
  position: 'Posição principal',
  age: 'Idade',
  nationality: 'Nacionalidade',
  heightCm: 'Altura',
  preferredFoot: 'Pé preferido',
  squadRole: 'Função no elenco',
  rating: 'Capacidade atual (CA)',
  potentialRating: 'Potencial estimado (PA)',
  matchFitness: 'Ritmo de jogo',
  morale: 'Moral',
  condition: 'Condição física',
  appearances: 'Jogos disputados',
  goals: 'Gols marcados',
  assists: 'Assistências',
  averageRating: 'Avaliação média',
};

const endAligned = new Set<SquadColumnId>([
  'shirtNumber',
  'age',
  'heightCm',
  'rating',
  'potentialRating',
  'matchFitness',
  'morale',
  'condition',
  'appearances',
  'goals',
  'assists',
  'averageRating',
]);

const renderDefinitionValue = (player: Player, columnId: SquadColumnId) => {
  switch (columnId) {
    case 'shirtNumber':
      return player.shirtNumber;
    case 'info':
      return player.selected ? 'XI' : 'Reserva';
    case 'name':
      return player.name;
    case 'position':
      return positionLabels[player.position];
    case 'age':
      return player.age;
    case 'nationality':
      return player.nationality;
    case 'heightCm':
      return `${player.heightCm} cm`;
    case 'preferredFoot':
      return preferredFootLabels[player.preferredFoot];
    case 'squadRole':
      return squadRoleLabels[player.squadRole];
    case 'rating':
      return player.rating;
    case 'potentialRating':
      return player.potentialRating;
    case 'matchFitness':
      return `${player.matchFitness}%`;
    case 'morale':
      return `${player.morale}%`;
    case 'condition':
      return `${player.condition}%`;
    case 'appearances':
      return player.appearances;
    case 'goals':
      return player.goals;
    case 'assists':
      return player.assists;
    case 'averageRating':
      return player.averageRating.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
  }
};

export const SQUAD_TABLE_DEFINITION: TableDefinition<Player> = {
  tableId: SQUAD_TABLE_SCHEMA.tableId,
  schemaVersion: SQUAD_TABLE_SCHEMA.schemaVersion,
  label: 'Elenco principal',
  schema: SQUAD_TABLE_SCHEMA,
  columns: SQUAD_TABLE_SCHEMA.columns.map((column, index) => {
    const columnId = column.columnId as SquadColumnId;
    return {
      columnId,
      label: column.label,
      shortLabel: shortLabels[columnId],
      description: descriptions[columnId],
      tooltip: descriptions[columnId],
      align: endAligned.has(columnId) ? 'end' : 'start',
      responsivePriority: index + 1,
      render: (player: Player) => renderDefinitionValue(player, columnId),
    };
  }),
};
