import { createElement } from 'react';

import {
  DenseTableNationality,
  DenseTableTruncatedText,
  type DenseTableColumn,
} from './DenseTable.js';

export type DenseTableEvidenceStatus =
  'neutral' | 'info' | 'positive' | 'warning' | 'danger' | 'offline' | 'loading';

export interface DenseTableEvidenceRow {
  readonly id: string;
  readonly name: string;
  readonly nationality: {
    readonly code: string;
    readonly countryName: string;
    readonly flagSrc: string;
  };
  readonly score: number | null;
  readonly status: {
    readonly tone: DenseTableEvidenceStatus;
    readonly label: string;
  };
  readonly note: string | null;
}

const neutralFlagFixture =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 14'/%3E";

// UI evidence only: these stable fictional objects are not domain, API, scouting, or squad data.
export const denseTableEvidenceRows: readonly DenseTableEvidenceRow[] = [
  {
    id: 'evidence-01',
    name: 'Exemplo Ágata do Norte com nome deliberadamente extenso para localização',
    nationality: { code: 'BR', countryName: 'Brasil', flagSrc: neutralFlagFixture },
    score: 91,
    status: { tone: 'positive', label: 'Condição positiva' },
    note: 'Texto longo de evidência para provar truncamento intencional e acesso ao valor completo.',
  },
  {
    id: 'evidence-02',
    name: 'Exemplo Basalto',
    nationality: { code: 'PT', countryName: 'Portugal', flagSrc: neutralFlagFixture },
    score: 78,
    status: { tone: 'neutral', label: 'Sem observação' },
    note: null,
  },
  {
    id: 'evidence-03',
    name: 'Exemplo Cobalto',
    nationality: { code: 'AR', countryName: 'Argentina', flagSrc: '/fixture-flag-missing.svg' },
    score: null,
    status: { tone: 'warning', label: 'Requer atenção' },
    note: 'Valor numérico propositalmente ausente.',
  },
  {
    id: 'evidence-04',
    name: 'Exemplo Duna',
    nationality: { code: 'UY', countryName: 'Uruguai', flagSrc: neutralFlagFixture },
    score: 66,
    status: { tone: 'danger', label: 'Estado crítico' },
    note: 'Estado semântico acompanhado de texto.',
  },
  {
    id: 'evidence-05',
    name: 'Exemplo Estuário',
    nationality: { code: 'ES', countryName: 'Espanha', flagSrc: neutralFlagFixture },
    score: 84,
    status: { tone: 'info', label: 'Informação disponível' },
    note: 'Nação permanece legível sem depender da imagem.',
  },
  {
    id: 'evidence-06',
    name: 'Exemplo Fiorde',
    nationality: { code: 'NO', countryName: 'Noruega', flagSrc: neutralFlagFixture },
    score: 73,
    status: { tone: 'offline', label: 'Dados offline' },
    note: 'Condição persistente explícita.',
  },
  {
    id: 'evidence-07',
    name: 'Exemplo Granito',
    nationality: { code: 'JP', countryName: 'Japão', flagSrc: neutralFlagFixture },
    score: 69,
    status: { tone: 'loading', label: 'Atualizando amostra' },
    note: 'Ordem e identificador permanecem determinísticos.',
  },
];

export const denseTableEvidenceColumns: readonly DenseTableColumn<DenseTableEvidenceRow>[] = [
  {
    id: 'name',
    header: 'Exemplo',
    width: 360,
    priority: 1,
    sortable: true,
    sortValue: (row) => row.name,
    render: (row) =>
      row.name.length > 40 ? createElement(DenseTableTruncatedText, { text: row.name }) : row.name,
  },
  {
    id: 'nationality',
    header: 'Nação',
    width: 104,
    priority: 1,
    render: (row) => createElement(DenseTableNationality, row.nationality),
  },
  {
    id: 'score',
    header: 'Índice',
    width: 88,
    priority: 2,
    align: 'end',
    hideable: true,
    sortable: true,
    sortValue: (row) => row.score,
    render: (row) => row.score ?? createElement('span', { 'aria-label': 'Dado indisponível' }, '—'),
  },
  {
    id: 'status',
    header: 'Estado',
    width: 184,
    priority: 2,
    hideable: true,
    render: (row) =>
      createElement(
        'span',
        { className: 'rv-dense-table__fixture-status', 'data-tone': row.status.tone },
        row.status.label,
      ),
  },
  {
    id: 'note',
    header: 'Nota de evidência',
    width: 420,
    priority: 3,
    hideable: true,
    render: (row) =>
      row.note
        ? createElement(DenseTableTruncatedText, { text: row.note })
        : createElement('span', { 'aria-label': 'Dado indisponível' }, '—'),
  },
];
