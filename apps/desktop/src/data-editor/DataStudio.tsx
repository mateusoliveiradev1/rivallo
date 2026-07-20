import { useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '../ui/primitives/actions.js';
import { Status } from '../ui/primitives/feedback.js';
import { AssetManager } from './AssetManager.js';
import {
  dependentRecords,
  projectAuthoringWorld,
  readinessForEntity,
  recordsForModule,
  removalChange,
  type StudioEntityRecord,
  type StudioModuleId,
  type StudioSeasonRecordValue,
} from './authoring-graph.js';
import { CsvImport } from './CsvImport.js';
import { EvaluationWorkbench } from './EvaluationWorkbench.js';
import { PackageValidationSummary } from './PackageValidationSummary.js';
import { StudioEntityEditor } from './StudioEntityEditor.js';
import type {
  AuthoringPlayerProfile,
  CommunityChange,
  GeneratedPackagePatch,
  ModAuthoringWorld,
  PackageValidationReport,
  StudioCompetition,
} from './types.js';

const modules = [
  ['overview', 'Visão geral'],
  ['nations', 'Nações'],
  ['regions', 'Divisões administrativas'],
  ['cities', 'Cidades'],
  ['stadiums', 'Estádios'],
  ['clubs', 'Clubes'],
  ['players', 'Jogadores'],
  ['coaches', 'Treinadores'],
  ['staff', 'Comissão'],
  ['evaluations', 'Avaliações'],
  ['competitions', 'Competições'],
  ['seasons', 'Temporadas'],
  ['contracts', 'Contratos'],
  ['registrations', 'Inscrições'],
  ['assets', 'Assets'],
  ['translations', 'Traduções'],
  ['patches', 'Patches'],
  ['validation', 'Validação'],
  ['advanced', 'Configuração avançada'],
] as const;

type StudioModule = (typeof modules)[number][0] | 'import' | 'sandbox';

const editableModules: readonly StudioModuleId[] = [
  'nations',
  'regions',
  'cities',
  'stadiums',
  'clubs',
  'players',
  'coaches',
  'staff',
  'competitions',
  'seasons',
  'contracts',
  'registrations',
  'translations',
];

const labelForModule = (module: StudioModule) =>
  modules.find(([id]) => id === module)?.[1] ??
  (module === 'import' ? 'Importação CSV' : 'Sandbox');

const moduleCountCopy = (module: StudioModule, count: number) => {
  if (module === 'regions') {
    return `${count.toLocaleString('pt-BR')} ${
      count === 1 ? 'divisão administrativa cadastrada' : 'divisões administrativas cadastradas'
    }`;
  }
  return `${count.toLocaleString('pt-BR')} ${labelForModule(module).toLowerCase()} cadastrados`;
};

const csvEscape = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;

const exportRecords = (module: StudioModuleId, records: readonly StudioEntityRecord[]) => {
  const rows = [
    ['internalId', 'name', 'detail'],
    ...records.map((record) => [record.id, record.name, record.detail]),
  ];
  const blob = new Blob([rows.map((row) => row.map(csvEscape).join(',')).join('\n')], {
    type: 'text/csv;charset=utf-8',
  });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `rivallo-${module}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
};

let cloneSequence = 0;
const cloneId = (id: string) =>
  `${id}.copy-${Date.now().toString(36)}-${(++cloneSequence).toString(36)}`;

function duplicateRecord(
  record: StudioEntityRecord,
  world: ModAuthoringWorld,
): CommunityChange | null {
  const id = cloneId(record.id);
  const simpleKind: Partial<Record<StudioModuleId, GeneratedPackagePatch['entityKind']>> = {
    nations: 'nation',
    regions: 'region',
    cities: 'city',
    stadiums: 'stadium',
    clubs: 'club',
    coaches: 'coach',
    staff: 'coach',
    competitions: 'competition',
  };
  if (record.module === 'players') {
    const player = world.players.find((item) => item.id === record.id);
    const profile = world.playerProfiles.find((item) => item.identity.entityId === record.id);
    if (!player || !profile) return null;
    const nextProfile: AuthoringPlayerProfile = {
      ...profile,
      identity: {
        ...profile.identity,
        entityId: id,
        fullName: `${profile.identity.fullName} — cópia`,
        knownName: `${profile.identity.knownName} — cópia`,
      },
    };
    const external = profile.identity.clubId !== world.activeClubId;
    return {
      id: `player:${id}`,
      kind: 'player',
      operation: 'duplicate',
      targetId: id,
      label: nextProfile.identity.knownName,
      summary: 'Cópia independente com novo ID estável',
      patches: external
        ? [
            {
              operation: 'add',
              entityKind: 'externalPlayer',
              targetId: id,
              entity: {
                kind: 'externalPlayer',
                value: {
                  profile: nextProfile,
                  condition: null,
                  matchFitness: null,
                  appearances: 0,
                  goals: 0,
                  assists: 0,
                  averageRating: null,
                },
              },
              reason: 'Jogador duplicado no Creator Studio',
            },
          ]
        : [
            {
              operation: 'add',
              entityKind: 'matchdayPlayer',
              targetId: id,
              entity: {
                kind: 'matchdayPlayer',
                value: {
                  ...player,
                  id,
                  name: `${player.name} — cópia`,
                  shortName: `${player.shortName} — cópia`,
                },
              },
              reason: 'Jogador duplicado no Creator Studio',
            },
            {
              operation: 'add',
              entityKind: 'playerProfile',
              targetId: id,
              entity: { kind: 'playerProfile', value: nextProfile },
              reason: 'Perfil duplicado no Creator Studio',
            },
          ],
      asset: null,
    };
  }
  if (record.module === 'seasons') {
    const context = record.value as StudioSeasonRecordValue;
    const competition =
      world.competitions?.find((item) => item.id === context.competition.id) ?? context.competition;
    const seasonId = cloneId(context.season.id);
    const season = {
      ...context.season,
      id: seasonId,
      competitionId: competition.id,
      label: `${context.season.label} — cópia`,
    };
    const next: StudioCompetition = {
      ...competition,
      seasons: [...competition.seasons, season],
    };
    return {
      id: `season:${seasonId}`,
      kind: 'season',
      operation: 'duplicate',
      targetId: competition.id,
      label: season.label,
      summary: 'Temporada duplicada dentro da competição',
      patches: [
        {
          operation: 'replace',
          entityKind: 'competition',
          targetId: competition.id,
          entity: { kind: 'competition', value: next },
          reason: `${context.season.label} duplicada no Creator Studio`,
        },
      ],
      asset: null,
    };
  }
  const entityKind = simpleKind[record.module];
  if (!entityKind || typeof record.value !== 'object' || record.value === null) return null;
  const value = {
    ...(record.value as Record<string, unknown>),
    id,
    ...(entityKind === 'coach'
      ? {
          identity: {
            ...((record.value as { identity: Record<string, unknown> }).identity ?? {}),
            entityId: id,
            fullName: `${record.name} — cópia`,
            knownName: `${record.name} — cópia`,
          },
        }
      : { name: `${record.name} — cópia` }),
  };
  const kind =
    record.module === 'staff'
      ? 'coach'
      : record.module === 'competitions'
        ? 'competition'
        : (record.module.slice(0, -1) as CommunityChange['kind']);
  return {
    id: `${entityKind}:${id}`,
    kind,
    operation: 'duplicate',
    targetId: id,
    label: `${record.name} — cópia`,
    summary: 'Cópia independente com novo ID estável',
    patches: [
      {
        operation: 'add',
        entityKind,
        targetId: id,
        entity: { kind: entityKind, value },
        reason: `${record.name} duplicado no Creator Studio`,
      },
    ],
    asset: null,
  };
}

function ModuleEmptyState({
  module,
  onCreate,
  onImport,
}: {
  readonly module: StudioModuleId;
  readonly onCreate: () => void;
  readonly onImport: () => void;
}) {
  const copy: Partial<Record<StudioModuleId, [string, string]>> = {
    staff: [
      'Nenhum membro da comissão',
      'Adicione treinador, auxiliares e profissionais do clube ou importe uma planilha.',
    ],
    cities: ['Nenhuma cidade', 'Crie cidades independentemente de clubes e vincule-as depois.'],
    stadiums: ['Nenhum estádio', 'Cadastre o estádio agora; o clube proprietário é opcional.'],
    players: ['Nenhum jogador', 'Crie jogadores visualmente ou importe uma base grande por CSV.'],
    contracts: ['Nenhum contrato', 'Selecione uma pessoa e registre o vínculo com um clube.'],
    registrations: [
      'Nenhuma inscrição',
      'Vincule jogador, clube e temporada quando estiverem prontos.',
    ],
  };
  const [title, description] = copy[module] ?? [
    `Nenhum item em ${labelForModule(module).toLowerCase()}`,
    'Crie o primeiro rascunho ou importe dados com IDs estáveis.',
  ];
  return (
    <div className="studio-actionable-empty">
      <h3>{title}</h3>
      <p>{description}</p>
      <div>
        <Button onClick={onCreate} variant="primary">
          Criar novo
        </Button>
        <Button onClick={onImport} variant="secondary">
          Importar CSV
        </Button>
      </div>
    </div>
  );
}

export function DataStudio({
  world,
  author,
  changes,
  initialModule,
  initialEntity,
  initialIssue,
  report,
  onUpsert,
  onBatch,
  onRollback,
  onValidate,
  advancedConfig = { packageId: '', version: '1.0.0', basePackageId: '', changelog: '' },
  onAdvancedUpdate = () => undefined,
}: {
  readonly world: ModAuthoringWorld;
  readonly author: string;
  readonly changes: readonly CommunityChange[];
  readonly initialModule?: string | null;
  readonly initialEntity?: string | null;
  readonly initialIssue?: string | null;
  readonly report: PackageValidationReport | null;
  readonly onUpsert: (change: CommunityChange) => void;
  readonly onBatch: (changes: readonly CommunityChange[]) => void;
  readonly onRollback: (ids: readonly string[]) => void;
  readonly onValidate: () => Promise<void>;
  readonly advancedConfig?: {
    readonly packageId: string;
    readonly version: string;
    readonly basePackageId: string;
    readonly changelog: string;
  };
  readonly onAdvancedUpdate?: (update: {
    readonly version?: string;
    readonly changelog?: string;
  }) => void;
}) {
  const safeInitial = modules.some(([id]) => id === initialModule)
    ? (initialModule as StudioModule)
    : 'overview';
  const [module, setModule] = useState<StudioModule>(safeInitial);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>(initialEntity ? [initialEntity] : []);
  const [activeId, setActiveId] = useState(initialEntity ?? '');
  const [page, setPage] = useState(0);
  const [editorMode, setEditorMode] = useState<'create' | 'edit' | null>(
    initialEntity ? 'edit' : null,
  );
  const [onlyPending, setOnlyPending] = useState(Boolean(initialIssue));
  const [showDependencies, setShowDependencies] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const inspectorTriggerRef = useRef<HTMLButtonElement | null>(null);
  const draftWorld = useMemo(() => projectAuthoringWorld(world, changes), [changes, world]);
  const assets = useMemo(
    () => changes.flatMap((change) => (change.asset ? [change.asset] : [])),
    [changes],
  );
  const moduleRecords = useMemo(
    () =>
      editableModules.includes(module as StudioModuleId) || ['assets', 'patches'].includes(module)
        ? recordsForModule(draftWorld, changes, module as StudioModuleId)
        : [],
    [changes, draftWorld, module],
  );
  const filteredRows = moduleRecords.filter((item) => {
    const query = search.trim().toLocaleLowerCase('pt-BR');
    const matchesSearch = `${item.name} ${item.detail}`.toLocaleLowerCase('pt-BR').includes(query);
    return matchesSearch && (!onlyPending || item.readiness?.issues.length);
  });
  const visibleRows = filteredRows.slice(page * 100, page * 100 + 100);
  const activeRecord = moduleRecords.find((item) => item.id === activeId) ?? null;
  const dependencies = activeRecord ? dependentRecords(draftWorld, activeRecord) : [];
  const isEntityModule = editableModules.includes(module as StudioModuleId);
  const canMutate = Boolean(activeRecord && isEntityModule);
  const canDuplicate = Boolean(
    activeRecord && !['contracts', 'registrations', 'translations'].includes(activeRecord.module),
  );
  const canDelete = Boolean(activeRecord && removalChange(activeRecord, draftWorld));
  const moduleReadiness = activeRecord
    ? readinessForEntity(draftWorld, activeRecord.module, activeRecord.id)
    : null;

  const navigate = (next: StudioModule, id?: string) => {
    setModule(next);
    setPage(0);
    setSearch('');
    setOnlyPending(false);
    setSelected(id ? [id] : []);
    setActiveId(id ?? '');
    setEditorMode(id ? 'edit' : null);
    setShowDependencies(false);
  };
  const startCreate = (next: StudioModuleId) => {
    navigate(next);
    setEditorMode('create');
  };
  const closeInspector = () => {
    setEditorMode(null);
    setActiveId('');
    setConfirmDelete(false);
    window.setTimeout(() => inspectorTriggerRef.current?.focus(), 0);
  };

  const applyDelete = () => {
    if (!activeRecord) return;
    const change = removalChange(activeRecord, draftWorld);
    if (change) onUpsert(change);
    setConfirmDelete(false);
    setEditorMode(null);
    setActiveId('');
    setSelected([]);
  };

  const selectedRecords = moduleRecords.filter((item) => selected.includes(item.id));
  const duplicableSelectedRecords = selectedRecords.filter(
    (record) => !['contracts', 'registrations', 'translations'].includes(record.module),
  );
  const deletableSelectedRecords = selectedRecords.filter((record) =>
    Boolean(removalChange(record, draftWorld) && dependentRecords(draftWorld, record).length === 0),
  );
  const applyBulkDuplicate = () => {
    let workingWorld = draftWorld;
    const batch: CommunityChange[] = [];
    for (const selectedRecord of duplicableSelectedRecords) {
      const currentRecord = recordsForModule(workingWorld, [], selectedRecord.module).find(
        (record) => record.id === selectedRecord.id,
      );
      if (!currentRecord) continue;
      const change = duplicateRecord(currentRecord, workingWorld);
      if (!change) continue;
      batch.push(change);
      workingWorld = projectAuthoringWorld(workingWorld, [change]);
    }
    if (batch.length) onBatch(batch);
    setBulkOpen(false);
  };
  const applyBulkDelete = () => {
    let workingWorld = draftWorld;
    const batch: CommunityChange[] = [];
    for (const selectedRecord of deletableSelectedRecords) {
      const currentRecord = recordsForModule(workingWorld, [], selectedRecord.module).find(
        (record) => record.id === selectedRecord.id,
      );
      if (!currentRecord) continue;
      const change = removalChange(currentRecord, workingWorld);
      if (!change) continue;
      batch.push(change);
      workingWorld = projectAuthoringWorld(workingWorld, [change]);
    }
    if (batch.length) onBatch(batch);
    setSelected([]);
    setActiveId('');
    setEditorMode(null);
    setBulkConfirm(false);
    setBulkOpen(false);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = Boolean(
        target?.closest('input, textarea, select, [contenteditable="true"]'),
      );
      if (event.key === 'Escape' && (editorMode || activeRecord || confirmDelete || bulkOpen)) {
        closeInspector();
        setConfirmDelete(false);
        setBulkConfirm(false);
        setBulkOpen(false);
      }
      if (event.key === 'Delete' && canDelete && !isTyping) {
        event.preventDefault();
        setConfirmDelete(true);
      }
      if (event.key === 'Enter' && activeRecord && !isTyping) {
        event.preventDefault();
        setEditorMode('edit');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeRecord, bulkOpen, canDelete, confirmDelete, editorMode]);

  return (
    <div className="data-studio">
      <aside className="data-studio__nav" aria-label="Módulos do Data Studio">
        <div>
          <strong>Data Studio</strong>
          <span>Um único draft canônico</span>
        </div>
        <nav>
          {modules.map(([id, label]) => (
            <button
              aria-current={module === id ? 'page' : undefined}
              key={id}
              onClick={() => navigate(id)}
              type="button"
            >
              {label}
            </button>
          ))}
        </nav>
        <button className="data-studio__import" onClick={() => navigate('import')} type="button">
          Importar CSV
        </button>
        <button className="data-studio__sandbox" onClick={() => navigate('sandbox')} type="button">
          Testar em sandbox
        </button>
      </aside>
      <main className="data-studio__main">
        {module === 'overview' && (
          <section className="studio-overview">
            <header>
              <span>Visão geral</span>
              <h2>Sua base, de ponta a ponta</h2>
              <p>Crie em qualquer ordem, relacione depois e distribua sem editar JSON.</p>
            </header>
            <dl className="studio-metrics">
              <div>
                <dt>Clubes</dt>
                <dd>{draftWorld.clubs.length}</dd>
              </div>
              <div>
                <dt>Jogadores</dt>
                <dd>{draftWorld.players.length}</dd>
              </div>
              <div>
                <dt>Profissionais</dt>
                <dd>{draftWorld.coaches.length}</dd>
              </div>
              <div>
                <dt>Competições</dt>
                <dd>{draftWorld.competitions?.length ?? 0}</dd>
              </div>
              <div>
                <dt>Mudanças</dt>
                <dd>{changes.length}</dd>
              </div>
              <div>
                <dt>Assets</dt>
                <dd>{changes.filter((item) => item.asset).length}</dd>
              </div>
            </dl>
            <section className="studio-validity-model">
              <div data-state="draft">
                <strong>1 · Rascunho editável</strong>
                <span>Pode ter relações pendentes e é salvo com segurança.</span>
              </div>
              <div data-state="valid">
                <strong>2 · Estruturalmente válido</strong>
                <span>Schema, IDs, referências e assets prontos para exportar.</span>
              </div>
              <div data-state="career">
                <strong>3 · Pronto para Nova Carreira</strong>
                <span>Temporada, inscrição, elenco, goleiro e treinador confirmados.</span>
              </div>
            </section>
            <div className="studio-quick-actions">
              <Button onClick={() => startCreate('cities')} variant="primary">
                Criar cidade
              </Button>
              <Button onClick={() => startCreate('clubs')} variant="secondary">
                Criar clube
              </Button>
              <Button onClick={() => startCreate('competitions')} variant="secondary">
                Criar competição
              </Button>
              <Button onClick={() => navigate('import')} variant="secondary">
                Importar dados
              </Button>
            </div>
          </section>
        )}

        <EvaluationWorkbench
          isActive={module === 'evaluations'}
          onOpenFactual={(recordSubject, entityId) =>
            navigate(
              recordSubject === 'player'
                ? 'players'
                : recordSubject === 'coach'
                  ? 'coaches'
                  : 'staff',
              entityId,
            )
          }
          world={draftWorld}
        />
        {module === 'assets' && (
          <AssetManager assets={assets} author={author} onUpsert={onUpsert} world={draftWorld} />
        )}
        {module === 'import' && (
          <CsvImport onImport={onBatch} onRollback={onRollback} world={draftWorld} />
        )}
        {module === 'validation' && (
          <section className="studio-validation">
            <header>
              <span>Validação completa</span>
              <h2>Problemas com contexto e ação</h2>
              <p>O rascunho continua editável; a exportação exige validade estrutural.</p>
            </header>
            <Button onClick={() => void onValidate()} variant="primary">
              Validar projeto
            </Button>
            {report ? (
              <PackageValidationSummary report={report} />
            ) : (
              <p className="studio-empty">Valide quando quiser revisar o pacote inteiro.</p>
            )}
          </section>
        )}
        {module === 'sandbox' && (
          <section className="studio-sandbox">
            <header>
              <span>Snapshot temporário</span>
              <h2>Teste sem alterar carreiras</h2>
              <p>
                A validação resolve o pacote em memória; não cria calendário, partidas ou
                resultados.
              </p>
            </header>
            <div className="sandbox-summary">
              <dl>
                <div>
                  <dt>Clubes</dt>
                  <dd>{draftWorld.clubs.length}</dd>
                </div>
                <div>
                  <dt>Jogadores</dt>
                  <dd>{draftWorld.players.length}</dd>
                </div>
                <div>
                  <dt>Treinadores</dt>
                  <dd>{draftWorld.coaches.length}</dd>
                </div>
                <div>
                  <dt>Competições</dt>
                  <dd>{draftWorld.competitions?.length ?? 0}</dd>
                </div>
              </dl>
              <Button onClick={() => void onValidate()} variant="primary">
                Criar snapshot e testar
              </Button>
            </div>
            {report && <PackageValidationSummary report={report} />}
          </section>
        )}
        {module === 'advanced' && (
          <section className="studio-advanced-notice" aria-labelledby="advanced-config-title">
            <header>
              <span>Configuração segura</span>
              <h2 id="advanced-config-title">Compatibilidade e versão</h2>
              <p>Altere metadados do pacote sem abrir ou editar JSON.</p>
            </header>
            <div className="studio-panel studio-form-grid">
              <label>
                Versão
                <input
                  aria-label="Versão do mod"
                  onChange={(event) => onAdvancedUpdate({ version: event.target.value })}
                  value={advancedConfig.version}
                />
                <small>Use major.minor.patch, por exemplo 1.2.0.</small>
              </label>
              <label>
                Compatibilidade do jogo
                <input disabled value=">=0.1.0 <0.2.0" />
              </label>
              <label>
                Base de referência
                <input disabled value={advancedConfig.basePackageId} />
              </label>
              <label>
                Identidade do pacote
                <input disabled value={advancedConfig.packageId} />
              </label>
              <label className="studio-form-grid__wide">
                Notas da versão
                <textarea
                  maxLength={1200}
                  onChange={(event) => onAdvancedUpdate({ changelog: event.target.value })}
                  value={advancedConfig.changelog}
                />
              </label>
            </div>
            <div className="studio-quick-actions">
              <Button onClick={() => navigate('patches')} variant="secondary">
                Revisar mudanças
              </Button>
              <Button onClick={() => navigate('validation')} variant="secondary">
                Verificar compatibilidade
              </Button>
            </div>
          </section>
        )}

        {(isEntityModule || module === 'patches') && (
          <section className="studio-entities" aria-labelledby="studio-module-heading">
            <header className="studio-module-heading">
              <div>
                <span>{labelForModule(module)}</span>
                <h2 id="studio-module-heading">Dados, relações e readiness</h2>
                <p>
                  {moduleCountCopy(module, moduleRecords.length)}
                  {moduleRecords.filter((item) => item.readiness?.issues.length).length
                    ? ` · ${moduleRecords.filter((item) => item.readiness?.issues.length).length} com pendências`
                    : ''}
                </p>
              </div>
            </header>
            {initialIssue && (
              <Status label="Correção aberta pela Nova Carreira" variant="warning">
                <p>
                  A pendência <strong>{initialIssue}</strong> está em foco. Corrija os dados e volte
                  para recalcular a disponibilidade do clube.
                </p>
              </Status>
            )}
            <div
              className="studio-module-toolbar"
              role="toolbar"
              aria-label={`Ações de ${labelForModule(module)}`}
            >
              {isEntityModule && (
                <Button
                  onClick={() => {
                    setEditorMode('create');
                    setActiveId('');
                  }}
                  variant="primary"
                >
                  Criar novo
                </Button>
              )}
              {canMutate && (
                <Button onClick={() => setEditorMode('edit')} variant="secondary">
                  Editar
                </Button>
              )}
              {canDuplicate && (
                <Button
                  onClick={() => {
                    const change = activeRecord && duplicateRecord(activeRecord, draftWorld);
                    if (change) onUpsert(change);
                  }}
                  variant="secondary"
                >
                  Duplicar
                </Button>
              )}
              {canDelete && (
                <Button onClick={() => setConfirmDelete(true)} variant="secondary">
                  Excluir
                </Button>
              )}
              <Button onClick={() => navigate('import')} variant="secondary">
                Importar
              </Button>
              <Button
                disabled={moduleRecords.length === 0}
                onClick={() => exportRecords(module as StudioModuleId, moduleRecords)}
                variant="secondary"
              >
                Exportar CSV
              </Button>
              <Button
                aria-pressed={onlyPending}
                onClick={() => {
                  setOnlyPending((value) => !value);
                  setPage(0);
                }}
                variant="secondary"
              >
                {onlyPending ? 'Todos os itens' : 'Filtros'}
              </Button>
              {isEntityModule && (
                <Button
                  disabled={selected.length === 0}
                  onClick={() => setBulkOpen((value) => !value)}
                  variant="secondary"
                >
                  Seleção em massa{selected.length ? ` (${selected.length})` : ''}
                </Button>
              )}
              <Button
                disabled={selected.length === 0}
                onClick={() => void onValidate()}
                variant="secondary"
              >
                Validar seleção
              </Button>
              <Button
                disabled={!activeRecord}
                onClick={() => setShowDependencies((value) => !value)}
                variant="secondary"
              >
                Abrir dependências
              </Button>
            </div>
            {bulkOpen && isEntityModule && (
              <section className="studio-bulk-panel" aria-labelledby="studio-bulk-title">
                <div>
                  <span>Prévia do lote</span>
                  <h3 id="studio-bulk-title">
                    {selectedRecords.length.toLocaleString('pt-BR')} itens selecionados
                  </h3>
                  <p>Confira o impacto antes de aplicar. O lote inteiro pode ser desfeito.</p>
                </div>
                <ul>
                  {selectedRecords.slice(0, 8).map((record) => (
                    <li key={record.id}>
                      <strong>{record.name}</strong>
                      <span>{record.detail}</span>
                    </li>
                  ))}
                </ul>
                <div className="studio-bulk-panel__actions">
                  <Button
                    onClick={() =>
                      setSelected((current) => [
                        ...new Set([...current, ...visibleRows.map((item) => item.id)]),
                      ])
                    }
                    variant="secondary"
                  >
                    Selecionar visíveis
                  </Button>
                  <Button
                    disabled={duplicableSelectedRecords.length === 0}
                    onClick={applyBulkDuplicate}
                    variant="secondary"
                  >
                    Duplicar selecionados
                  </Button>
                  {!bulkConfirm ? (
                    <Button
                      disabled={deletableSelectedRecords.length === 0}
                      onClick={() => setBulkConfirm(true)}
                      variant="secondary"
                    >
                      Excluir selecionados
                    </Button>
                  ) : (
                    <Button onClick={applyBulkDelete} variant="primary">
                      Confirmar exclusão do lote
                    </Button>
                  )}
                  <Button onClick={() => setBulkOpen(false)} variant="secondary">
                    Cancelar
                  </Button>
                </div>
              </section>
            )}
            <div className="studio-entity-layout">
              <section
                className="studio-entity-table"
                aria-label={`Lista de ${labelForModule(module)}`}
              >
                <div className="studio-table-toolbar">
                  <input
                    aria-label={`Buscar em ${labelForModule(module)}`}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setPage(0);
                    }}
                    placeholder="Buscar por nome ou detalhe"
                    value={search}
                  />
                  <span>
                    {search.trim() || onlyPending
                      ? `${filteredRows.length.toLocaleString('pt-BR')} exibidos de ${moduleRecords.length.toLocaleString('pt-BR')} cadastrados`
                      : `${filteredRows.length.toLocaleString('pt-BR')} itens`}
                  </span>
                </div>
                {visibleRows.length > 0 ? (
                  <div className="studio-table-list" role="table">
                    {visibleRows.map((item) => (
                      <div aria-selected={activeId === item.id} key={item.id} role="row">
                        <label>
                          <input
                            aria-label={`Selecionar ${item.name}`}
                            checked={selected.includes(item.id)}
                            onChange={(event) =>
                              setSelected((current) =>
                                event.target.checked
                                  ? [...new Set([...current, item.id])]
                                  : current.filter((id) => id !== item.id),
                              )
                            }
                            type="checkbox"
                          />
                        </label>
                        <button
                          onClick={(event) => {
                            inspectorTriggerRef.current = event.currentTarget;
                            setActiveId(item.id);
                            setEditorMode(null);
                            setConfirmDelete(false);
                          }}
                          type="button"
                        >
                          <span>
                            <strong>{item.name}</strong>
                            <small>{item.detail}</small>
                          </span>
                          {item.readiness && (
                            <em data-readiness={item.readiness.state}>{item.readiness.label}</em>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : moduleRecords.length > 0 ? (
                  <div className="studio-filter-empty" role="status">
                    <strong>Nenhum resultado com os filtros atuais</strong>
                    <p>Limpe a busca ou mostre todos os itens para voltar à lista completa.</p>
                    <Button
                      onClick={() => {
                        setSearch('');
                        setOnlyPending(false);
                        setPage(0);
                      }}
                      variant="secondary"
                    >
                      Limpar filtros
                    </Button>
                  </div>
                ) : (
                  <ModuleEmptyState
                    module={module as StudioModuleId}
                    onCreate={() => setEditorMode('create')}
                    onImport={() => navigate('import')}
                  />
                )}
                <footer>
                  <Button
                    disabled={page === 0}
                    onClick={() => setPage((value) => value - 1)}
                    variant="secondary"
                  >
                    Anterior
                  </Button>
                  <span>
                    Página {page + 1} de {Math.max(1, Math.ceil(filteredRows.length / 100))}
                  </span>
                  <Button
                    disabled={(page + 1) * 100 >= filteredRows.length}
                    onClick={() => setPage((value) => value + 1)}
                    variant="secondary"
                  >
                    Próxima
                  </Button>
                </footer>
              </section>
              <button
                aria-label="Fechar inspector"
                className="studio-inspector-backdrop"
                data-open={Boolean(editorMode || activeRecord || confirmDelete)}
                onClick={closeInspector}
                type="button"
              />
              <aside
                className="studio-inspector"
                aria-label="Inspector da entidade"
                data-open={Boolean(editorMode || activeRecord || confirmDelete)}
              >
                <button
                  aria-label="Fechar inspector"
                  className="studio-inspector__close"
                  onClick={closeInspector}
                  type="button"
                >
                  Fechar
                </button>
                {confirmDelete && activeRecord ? (
                  <div
                    className="studio-delete-confirmation"
                    role="alertdialog"
                    aria-labelledby="delete-entity-heading"
                  >
                    <span>Exclusão segura</span>
                    <h3 id="delete-entity-heading">Excluir {activeRecord.name}?</h3>
                    <p>
                      {dependencies.length
                        ? `${dependencies.length} dependência(s) impedem esta exclusão. Resolva ou desvincule cada uma primeiro.`
                        : 'A remoção será registrada como patch e poderá ser desfeita.'}
                    </p>
                    <div>
                      <Button onClick={() => setConfirmDelete(false)} variant="secondary">
                        Cancelar
                      </Button>
                      {dependencies.length ? (
                        <Button
                          onClick={() => {
                            setConfirmDelete(false);
                            setShowDependencies(true);
                          }}
                          variant="primary"
                        >
                          Ver dependências
                        </Button>
                      ) : (
                        <Button onClick={applyDelete} variant="primary">
                          Excluir do draft
                        </Button>
                      )}
                    </div>
                  </div>
                ) : editorMode && isEntityModule ? (
                  <StudioEntityEditor
                    assets={assets}
                    author={author}
                    key={`${module}:${editorMode}:${activeRecord?.id ?? 'new'}`}
                    mode={editorMode}
                    module={module as StudioModuleId}
                    onNavigate={(next, id) => navigate(next, id)}
                    onRelatedUpsert={onUpsert}
                    onUpsert={(change) => {
                      onUpsert(change);
                      setActiveId(
                        module === 'registrations'
                          ? change.id
                          : module === 'contracts'
                            ? `contract:${change.targetId}`
                            : module === 'seasons'
                              ? (activeRecord?.id ?? '')
                              : change.targetId,
                      );
                      setEditorMode('edit');
                    }}
                    record={editorMode === 'edit' ? activeRecord : null}
                    world={draftWorld}
                  />
                ) : activeRecord ? (
                  <div className="studio-inspector-summary">
                    <span>Inspector</span>
                    <h3>{activeRecord.name}</h3>
                    <p>{activeRecord.detail}</p>
                    {moduleReadiness && (
                      <strong data-readiness={moduleReadiness.state}>
                        {moduleReadiness.label}
                      </strong>
                    )}
                    {moduleReadiness?.issues.length ? (
                      <ul>
                        {moduleReadiness.issues.map((issue) => (
                          <li key={issue.code}>
                            <strong>{issue.label}</strong>
                            <span>{issue.explanation}</span>
                            <small>Campo: {issue.field ?? 'relação'}</small>
                            <button onClick={() => navigate(issue.module)} type="button">
                              Resolver
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>Nenhuma pendência conhecida nesta projeção.</p>
                    )}
                  </div>
                ) : (
                  <div className="studio-inspector-summary">
                    <span>Resumo do módulo</span>
                    <h3>
                      {moduleRecords.length > 0
                        ? 'Nenhum item selecionado'
                        : 'Nenhum item cadastrado'}
                    </h3>
                    <p>
                      {moduleRecords.length > 0
                        ? 'Selecione um item da lista para ver relações, pendências e impacto.'
                        : 'Crie um rascunho agora ou importe dados para começar.'}
                    </p>
                    <div className="studio-inspector-summary__actions">
                      <Button onClick={() => setEditorMode('create')} variant="primary">
                        Criar novo item
                      </Button>
                      <Button onClick={() => navigate('import')} variant="secondary">
                        Importar
                      </Button>
                      {moduleRecords.some((item) => item.readiness?.issues.length) && (
                        <Button onClick={() => setOnlyPending(true)} variant="secondary">
                          Revisar pendências
                        </Button>
                      )}
                    </div>
                  </div>
                )}
                {showDependencies && activeRecord && (
                  <section className="studio-dependency-panel">
                    <h3>Dependências e impacto</h3>
                    {dependencies.length ? (
                      <ul>
                        {dependencies.map((item) => (
                          <li key={`${item.module}:${item.id}`}>
                            <button onClick={() => navigate(item.module, item.id)} type="button">
                              {item.label}
                            </button>
                            <span>{labelForModule(item.module)}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>Nenhuma entidade do draft depende diretamente deste item.</p>
                    )}
                  </section>
                )}
              </aside>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
