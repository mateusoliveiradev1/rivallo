import { useEffect, useMemo, useState } from 'react';

import { Button } from '../ui/primitives/actions.js';
import type { ModAuthoringWorld } from './types.js';

type EvaluationStatus =
  | 'notEvaluated'
  | 'draft'
  | 'insufficientEvidence'
  | 'inReview'
  | 'approved'
  | 'rejected'
  | 'stale'
  | 'superseded';
type EvaluationSubject = 'player' | 'coach' | 'staffMember';
type ValueKind = 'exact' | 'range' | 'unknown';

interface WorkbenchEvidence {
  readonly id: string;
  readonly label: string;
  readonly source: string;
  readonly observedAt: string;
  readonly quality: number;
}

interface WorkbenchHistory {
  readonly id: string;
  readonly at: string;
  readonly actor: string;
  readonly summary: string;
}

interface WorkbenchRecord {
  readonly entityId: string;
  readonly name: string;
  readonly club: string;
  readonly subject: EvaluationSubject;
  readonly role: string;
  readonly factualPosition: string | null;
  readonly factualSource: string;
  readonly methodologyVersion: string;
  readonly status: EvaluationStatus;
  readonly valueKind: ValueKind;
  readonly exact: number | null;
  readonly minimum: number | null;
  readonly maximum: number | null;
  readonly explanation: string;
  readonly evidence: readonly WorkbenchEvidence[];
  readonly reviewer: string | null;
  readonly reviewedAt: string | null;
  readonly updatedAt: string;
  readonly history: readonly WorkbenchHistory[];
}

interface ImportCandidate {
  readonly entityId: string;
  readonly methodologyVersion: string;
  readonly origin: string;
  readonly assessedAt: string;
  readonly minimum: number;
  readonly maximum: number;
}

interface ImportPreview {
  readonly rows: readonly ImportCandidate[];
  readonly errors: readonly string[];
  readonly before: readonly WorkbenchRecord[];
}

export const EVALUATION_METHODOLOGY_VERSION = 'rivallo.evaluation.foundation@1.0.0';

const statusLabel: Record<EvaluationStatus, string> = {
  notEvaluated: 'Não avaliada',
  draft: 'Rascunho',
  insufficientEvidence: 'Evidência insuficiente',
  inReview: 'Em revisão',
  approved: 'Aprovada',
  rejected: 'Rejeitada',
  stale: 'Desatualizada',
  superseded: 'Substituída',
};

const subjectLabel: Record<EvaluationSubject, string> = {
  player: 'Jogador',
  coach: 'Treinador',
  staffMember: 'Comissão',
};

const clubName = (world: ModAuthoringWorld, id: string | null | undefined) =>
  (world.clubs ?? []).find((club) => club.id === id)?.shortName ?? id ?? 'Sem clube';

const emptyRecord = (
  facts: Pick<
    WorkbenchRecord,
    'entityId' | 'name' | 'club' | 'subject' | 'role' | 'factualPosition' | 'factualSource'
  >,
): WorkbenchRecord => ({
  ...facts,
  methodologyVersion: EVALUATION_METHODOLOGY_VERSION,
  status: 'notEvaluated',
  valueKind: 'unknown',
  exact: null,
  minimum: null,
  maximum: null,
  explanation: '',
  evidence: [],
  reviewer: null,
  reviewedAt: null,
  updatedAt: 'Nunca revisada',
  history: [],
});

export const evaluationRecordsFromWorld = (world: ModAuthoringWorld): WorkbenchRecord[] => {
  const records = new Map<string, WorkbenchRecord>();
  for (const person of world.people ?? []) {
    for (const role of person.roles ?? []) {
      records.set(
        person.personId,
        emptyRecord({
          entityId: person.personId,
          name: person.knownName ?? person.fullName ?? person.personId,
          club: clubName(world, role.clubId),
          subject: role.kind,
          role: role.title ?? subjectLabel[role.kind],
          factualPosition: person.detailedPosition,
          factualSource: person.provenance?.[0]?.source ?? 'Fato sem fonte identificada',
        }),
      );
    }
  }
  for (const profile of world.playerProfiles ?? []) {
    if (records.has(profile.identity.entityId)) continue;
    records.set(
      profile.identity.entityId,
      emptyRecord({
        entityId: profile.identity.entityId,
        name: profile.identity.knownName ?? profile.identity.entityId,
        club: profile.identity.clubShortName,
        subject: 'player',
        role: 'Jogador',
        factualPosition: profile.naturalPosition,
        factualSource: 'Pacote fictício oficial',
      }),
    );
  }
  for (const profile of world.coaches ?? []) {
    if (records.has(profile.identity.entityId)) continue;
    const subject = profile.role === 'Treinador principal' ? 'coach' : 'staffMember';
    records.set(
      profile.identity.entityId,
      emptyRecord({
        entityId: profile.identity.entityId,
        name: profile.identity.knownName ?? profile.identity.entityId,
        club: profile.identity.clubShortName,
        subject,
        role: profile.role,
        factualPosition: null,
        factualSource: 'Pacote fictício oficial',
      }),
    );
  }
  return [...records.values()].sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'));
};

export const confidenceForEvaluation = (record: WorkbenchRecord) => {
  const count = record.evidence.length;
  const coverage = Math.min(100, count * 35);
  const recency = count ? 90 : 0;
  const quality = count
    ? Math.round(record.evidence.reduce((sum, item) => sum + item.quality, 0) / count)
    : 0;
  const consistency = count > 1 ? 82 : count ? 70 : 0;
  const precision = record.valueKind === 'exact' ? 76 : record.valueKind === 'range' ? 64 : 0;
  const finalScore = Math.round(
    coverage * 0.25 + recency * 0.2 + quality * 0.25 + consistency * 0.2 + precision * 0.1,
  );
  return { coverage, recency, quality, consistency, precision, conflicts: 0, finalScore };
};

const withHistory = (
  record: WorkbenchRecord,
  patch: Partial<WorkbenchRecord>,
  summary: string,
  actor = 'Autor fictício',
): WorkbenchRecord => ({
  ...record,
  ...patch,
  updatedAt: '19/07/2026',
  history: [
    ...record.history,
    {
      id: `${record.entityId}.${record.history.length + 1}`,
      at: '19/07/2026',
      actor,
      summary,
    },
  ],
});

const parseCsv = (source: string): ImportCandidate[] => {
  const [headerLine, ...lines] = source.trim().split(/\r?\n/u);
  const headers = headerLine?.split(',').map((item) => item.trim()) ?? [];
  return lines.filter(Boolean).map((line) => {
    const values = line.split(',').map((item) => item.trim());
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
    return {
      entityId: row.entityId ?? '',
      methodologyVersion: row.methodologyVersion ?? '',
      origin: row.origin ?? '',
      assessedAt: row.assessedAt ?? '',
      minimum: Number(row.minimum),
      maximum: Number(row.maximum),
    };
  });
};

const parseImport = (format: 'json' | 'csv', source: string): ImportCandidate[] => {
  if (format === 'csv') return parseCsv(source);
  const value = JSON.parse(source) as unknown;
  if (!Array.isArray(value)) throw new Error('JSON precisa conter uma lista de avaliações.');
  return value as ImportCandidate[];
};

const importErrors = (rows: readonly ImportCandidate[], entityIds: ReadonlySet<string>) =>
  rows.flatMap((row, index) => {
    const errors: string[] = [];
    if (!entityIds.has(row.entityId)) errors.push(`Linha ${index + 1}: entityId inexistente.`);
    if (row.methodologyVersion !== EVALUATION_METHODOLOGY_VERSION) {
      errors.push(`Linha ${index + 1}: metodologia incompatível.`);
    }
    if (!row.origin || !row.assessedAt) {
      errors.push(`Linha ${index + 1}: origem e data são obrigatórias.`);
    }
    if (
      !Number.isFinite(row.minimum) ||
      !Number.isFinite(row.maximum) ||
      row.minimum < 0 ||
      row.maximum > 100 ||
      row.minimum > row.maximum
    ) {
      errors.push(`Linha ${index + 1}: faixa inválida ou fora de 0–100.`);
    }
    return errors;
  });

function ConfidenceInspector({ record }: { readonly record: WorkbenchRecord }) {
  const confidence = confidenceForEvaluation(record);
  return (
    <section className="evaluation-confidence" aria-labelledby="confidence-heading">
      <header>
        <h4 id="confidence-heading">Confiança</h4>
        <strong>{confidence.finalScore}%</strong>
      </header>
      <dl>
        {(
          [
            ['Cobertura', confidence.coverage],
            ['Recência', confidence.recency],
            ['Qualidade', confidence.quality],
            ['Consistência', confidence.consistency],
            ['Precisão', confidence.precision],
            ['Conflitos', confidence.conflicts],
          ] as const
        ).map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{label === 'Conflitos' ? value : `${value}%`}</dd>
          </div>
        ))}
      </dl>
      <p>Confiança mede a avaliação, não a qualidade esportiva da pessoa.</p>
    </section>
  );
}

export function EvaluationWorkbench({
  isActive = true,
  world,
  onOpenFactual,
}: {
  readonly isActive?: boolean;
  readonly world: ModAuthoringWorld;
  readonly onOpenFactual: (subject: EvaluationSubject, entityId: string) => void;
}) {
  const [records, setRecords] = useState(() => evaluationRecordsFromWorld(world));
  const [activeId, setActiveId] = useState(records[0]?.entityId ?? '');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<EvaluationStatus | 'all'>('all');
  const [subject, setSubject] = useState<EvaluationSubject | 'all'>('all');
  const [confidenceBand, setConfidenceBand] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [selected, setSelected] = useState<readonly string[]>([]);
  const [visibleCount, setVisibleCount] = useState(120);
  const [importOpen, setImportOpen] = useState(false);
  const [importFormat, setImportFormat] = useState<'json' | 'csv'>('json');
  const [importSource, setImportSource] = useState('');
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importMessage, setImportMessage] = useState('');
  const [rollback, setRollback] = useState<readonly WorkbenchRecord[] | null>(null);

  useEffect(() => {
    const projected = evaluationRecordsFromWorld(world);
    setRecords((current) => {
      const authored = new Map(current.map((record) => [record.entityId, record]));
      return projected.map((facts) => {
        const record = authored.get(facts.entityId);
        return record
          ? {
              ...record,
              name: facts.name,
              club: facts.club,
              subject: facts.subject,
              role: facts.role,
              factualPosition: facts.factualPosition,
              factualSource: facts.factualSource,
            }
          : facts;
      });
    });
    setActiveId((current) => current || projected[0]?.entityId || '');
  }, [world]);

  const active = records.find((record) => record.entityId === activeId) ?? null;
  const filtered = useMemo(
    () =>
      records.filter((record) => {
        const confidence = confidenceForEvaluation(record).finalScore;
        const matchesConfidence =
          confidenceBand === 'all' ||
          (confidenceBand === 'low' && confidence < 50) ||
          (confidenceBand === 'medium' && confidence >= 50 && confidence < 75) ||
          (confidenceBand === 'high' && confidence >= 75);
        return (
          (status === 'all' || record.status === status) &&
          (subject === 'all' || record.subject === subject) &&
          matchesConfidence &&
          `${record.name} ${record.club} ${record.role}`
            .toLocaleLowerCase('pt-BR')
            .includes(query.trim().toLocaleLowerCase('pt-BR'))
        );
      }),
    [confidenceBand, query, records, status, subject],
  );
  const visibleRecords = filtered.slice(0, visibleCount);

  const update = (entityId: string, transform: (record: WorkbenchRecord) => WorkbenchRecord) => {
    setRecords((current) =>
      current.map((record) => (record.entityId === entityId ? transform(record) : record)),
    );
  };

  const exportTemplate = () => {
    const template = records.map((record) => ({
      entityId: record.entityId,
      methodologyVersion: EVALUATION_METHODOLOGY_VERSION,
      origin: '',
      assessedAt: '',
      minimum: '',
      maximum: '',
    }));
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = 'rivallo-evaluation-template.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const dryRun = () => {
    try {
      const rows = parseImport(importFormat, importSource);
      const errors = importErrors(rows, new Set(records.map((record) => record.entityId)));
      setImportPreview({ rows, errors, before: records });
      setImportMessage(
        errors.length
          ? `${errors.length} blocker(s) no dry run.`
          : `${rows.length} mudança(s) pronta(s).`,
      );
    } catch (error) {
      setImportPreview({ rows: [], errors: [String(error)], before: records });
      setImportMessage('Não foi possível interpretar a importação.');
    }
  };

  const applyImport = () => {
    if (!importPreview || importPreview.errors.length) return;
    setRollback(importPreview.before);
    setRecords((current) =>
      current.map((record) => {
        const row = importPreview.rows.find((candidate) => candidate.entityId === record.entityId);
        return row
          ? withHistory(
              record,
              {
                status: 'draft',
                valueKind: 'range',
                exact: null,
                minimum: row.minimum,
                maximum: row.maximum,
                explanation: `Importado como rascunho de ${row.origin}.`,
              },
              'Importação aplicada como rascunho; aprovação pendente.',
            )
          : record;
      }),
    );
    setImportMessage('Importação aplicada. Nenhuma avaliação foi aprovada automaticamente.');
  };

  const applyBulk = (action: 'methodology' | 'confidence' | 'stale' | 'reviewer') => {
    setRecords((current) =>
      current.map((record) => {
        if (!selected.includes(record.entityId)) return record;
        if (action === 'stale' && record.status !== 'approved') return record;
        const patch: Partial<WorkbenchRecord> =
          action === 'methodology'
            ? { methodologyVersion: EVALUATION_METHODOLOGY_VERSION, status: 'draft' }
            : action === 'stale'
              ? { status: 'stale' }
              : action === 'reviewer'
                ? { reviewer: 'Revisor fictício designado' }
                : {};
        return withHistory(
          record,
          patch,
          action === 'confidence'
            ? `Confiança recalculada em ${confidenceForEvaluation(record).finalScore}%.`
            : `Operação em massa: ${action}.`,
        );
      }),
    );
  };

  const queueCounts = records.reduce<Record<EvaluationStatus, number>>(
    (counts, record) => ({ ...counts, [record.status]: counts[record.status] + 1 }),
    {
      notEvaluated: 0,
      draft: 0,
      insufficientEvidence: 0,
      inReview: 0,
      approved: 0,
      rejected: 0,
      stale: 0,
      superseded: 0,
    },
  );

  if (!isActive) return null;

  return (
    <section className="evaluation-workbench" aria-labelledby="evaluation-workbench-heading">
      <header className="evaluation-workbench__header">
        <div>
          <span>Camada separada dos fatos</span>
          <h2 id="evaluation-workbench-heading">Avaliações</h2>
          <p>
            Evidência, autoria e revisão sobre a metodologia oficial 1.0. Rascunhos não alteram
            carreiras.
          </p>
        </div>
        <div>
          <Button onClick={() => setImportOpen((value) => !value)} variant="secondary">
            Importar avaliações
          </Button>
          <Button onClick={exportTemplate} variant="secondary">
            Exportar template
          </Button>
        </div>
      </header>

      <nav className="evaluation-queues" aria-label="Filas de avaliação">
        {(
          [
            ['notEvaluated', 'Não avaliados'],
            ['insufficientEvidence', 'Evidência insuficiente'],
            ['inReview', 'Em revisão'],
            ['approved', 'Aprovados'],
            ['stale', 'Desatualizados'],
            ['rejected', 'Com conflitos'],
          ] as const
        ).map(([id, label]) => (
          <button
            aria-pressed={status === id}
            key={id}
            onClick={() => setStatus((current) => (current === id ? 'all' : id))}
            type="button"
          >
            <span>{label}</span>
            <strong>{queueCounts[id]}</strong>
          </button>
        ))}
        <button
          aria-pressed={status === 'draft'}
          onClick={() => setStatus((current) => (current === 'draft' ? 'all' : 'draft'))}
          type="button"
        >
          <span>Bloqueados para gameplay</span>
          <strong>{records.filter((record) => record.status !== 'approved').length}</strong>
        </button>
      </nav>

      {importOpen && (
        <section className="evaluation-import" aria-labelledby="evaluation-import-heading">
          <header>
            <h3 id="evaluation-import-heading">Dry run de importação</h3>
            <p>Exige entityId, metodologia, origem e data. Nome nunca é chave.</p>
          </header>
          <label>
            Formato
            <select
              onChange={(event) => setImportFormat(event.target.value as 'json' | 'csv')}
              value={importFormat}
            >
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
            </select>
          </label>
          <label>
            Conteúdo
            <textarea
              aria-label="Conteúdo da importação"
              onChange={(event) => setImportSource(event.target.value)}
              placeholder={
                importFormat === 'json'
                  ? '[{"entityId":"...","methodologyVersion":"rivallo.evaluation.foundation@1.0.0",...}]'
                  : 'entityId,methodologyVersion,origin,assessedAt,minimum,maximum'
              }
              value={importSource}
            />
          </label>
          <div>
            <Button onClick={dryRun} variant="primary">
              Executar dry run
            </Button>
            <Button
              disabled={!importPreview || importPreview.errors.length > 0}
              onClick={applyImport}
              variant="secondary"
            >
              Aplicar como rascunho
            </Button>
            {rollback && (
              <Button
                onClick={() => {
                  setRecords([...rollback]);
                  setRollback(null);
                  setImportMessage('Rollback concluído.');
                }}
                variant="secondary"
              >
                Desfazer importação
              </Button>
            )}
          </div>
          {importMessage && <p role="status">{importMessage}</p>}
          {importPreview?.errors.length ? (
            <ul className="evaluation-import__errors">
              {importPreview.errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          ) : null}
        </section>
      )}

      <div className="evaluation-filters" role="search" aria-label="Filtros de avaliações">
        <label>
          Buscar entidade ou clube
          <input onChange={(event) => setQuery(event.target.value)} value={query} />
        </label>
        <label>
          Papel
          <select
            onChange={(event) => setSubject(event.target.value as EvaluationSubject | 'all')}
            value={subject}
          >
            <option value="all">Todos</option>
            <option value="player">Jogadores</option>
            <option value="coach">Treinadores</option>
            <option value="staffMember">Comissão</option>
          </select>
        </label>
        <label>
          Confiança
          <select
            onChange={(event) =>
              setConfidenceBand(event.target.value as 'all' | 'low' | 'medium' | 'high')
            }
            value={confidenceBand}
          >
            <option value="all">Todas</option>
            <option value="low">Baixa · abaixo de 50%</option>
            <option value="medium">Média · 50–74%</option>
            <option value="high">Alta · 75%+</option>
          </select>
        </label>
        <button onClick={() => setStatus('all')} type="button">
          Limpar fila
        </button>
      </div>

      {selected.length > 0 && (
        <div className="evaluation-bulk" role="toolbar" aria-label="Edição em massa segura">
          <strong>{selected.length} selecionada(s)</strong>
          <button onClick={() => applyBulk('methodology')} type="button">
            Aplicar metodologia
          </button>
          <button onClick={() => applyBulk('confidence')} type="button">
            Recalcular confiança
          </button>
          <button onClick={() => applyBulk('stale')} type="button">
            Marcar obsoleto
          </button>
          <button onClick={() => applyBulk('reviewer')} type="button">
            Atribuir revisor
          </button>
        </div>
      )}

      <div className="evaluation-workspace">
        <section className="evaluation-list" aria-label="Lista de pessoas para avaliação">
          <table>
            <thead>
              <tr>
                <th scope="col">
                  <span className="sr-only">Selecionar</span>
                </th>
                <th scope="col">Pessoa</th>
                <th scope="col">Papel</th>
                <th scope="col">Status</th>
                <th scope="col">Conf.</th>
              </tr>
            </thead>
            <tbody>
              {visibleRecords.map((record) => (
                <tr data-active={record.entityId === activeId} key={record.entityId}>
                  <td>
                    <input
                      aria-label={`Selecionar ${record.name}`}
                      checked={selected.includes(record.entityId)}
                      onChange={(event) =>
                        setSelected((current) =>
                          event.target.checked
                            ? [...current, record.entityId]
                            : current.filter((id) => id !== record.entityId),
                        )
                      }
                      type="checkbox"
                    />
                  </td>
                  <th scope="row">
                    <button onClick={() => setActiveId(record.entityId)} type="button">
                      <strong>{record.name}</strong>
                      <span>{record.club}</span>
                    </button>
                  </th>
                  <td>{record.role}</td>
                  <td>
                    <span data-evaluation-status={record.status}>{statusLabel[record.status]}</span>
                  </td>
                  <td>{confidenceForEvaluation(record).finalScore}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          {visibleRecords.length < filtered.length && (
            <button
              className="evaluation-list__more"
              onClick={() => setVisibleCount((count) => count + 120)}
              type="button"
            >
              Carregar mais · {filtered.length - visibleRecords.length} restantes
            </button>
          )}
          {filtered.length === 0 && (
            <div className="evaluation-empty">
              <h3>Nenhuma avaliação nesta fila</h3>
              <p>Altere os filtros ou importe uma camada de avaliações.</p>
            </div>
          )}
        </section>

        <section className="evaluation-editor" aria-label="Editor da avaliação">
          {active ? (
            <>
              <header>
                <div>
                  <span>{subjectLabel[active.subject]}</span>
                  <h3>{active.name}</h3>
                  <p>
                    {active.role} · {active.club}
                  </p>
                </div>
                <span data-evaluation-status={active.status}>{statusLabel[active.status]}</span>
              </header>
              <section className="evaluation-facts" aria-labelledby="available-facts-heading">
                <header>
                  <h4 id="available-facts-heading">Fatos disponíveis</h4>
                  <button
                    onClick={() => onOpenFactual(active.subject, active.entityId)}
                    type="button"
                  >
                    Abrir entidade factual
                  </button>
                </header>
                <dl>
                  <div>
                    <dt>Clube</dt>
                    <dd>{active.club}</dd>
                  </div>
                  <div>
                    <dt>Posição declarada</dt>
                    <dd>{active.factualPosition ?? 'Fato ausente'}</dd>
                  </div>
                  <div>
                    <dt>Origem factual</dt>
                    <dd>{active.factualSource}</dd>
                  </div>
                </dl>
                <p>Somente leitura. Avaliações nunca sobrescrevem estes campos.</p>
              </section>

              <fieldset>
                <legend>Capacidade estimada</legend>
                <label>
                  Representação
                  <select
                    disabled={active.status === 'approved'}
                    onChange={(event) =>
                      update(active.entityId, (record) =>
                        withHistory(
                          record,
                          {
                            status: 'draft',
                            valueKind: event.target.value as ValueKind,
                            exact: null,
                            minimum: null,
                            maximum: null,
                          },
                          'Representação da capacidade alterada.',
                        ),
                      )
                    }
                    value={active.valueKind}
                  >
                    <option value="unknown">Desconhecido</option>
                    <option value="range">Faixa</option>
                    <option value="exact">Valor exato</option>
                  </select>
                </label>
                {active.valueKind === 'range' && (
                  <div className="evaluation-range">
                    <label>
                      Mínimo
                      <input
                        max={100}
                        min={0}
                        onChange={(event) =>
                          update(active.entityId, (record) => ({
                            ...record,
                            status: 'draft',
                            minimum: Number(event.target.value),
                          }))
                        }
                        type="number"
                        value={active.minimum ?? ''}
                      />
                    </label>
                    <span aria-hidden="true">até</span>
                    <label>
                      Máximo
                      <input
                        max={100}
                        min={0}
                        onChange={(event) =>
                          update(active.entityId, (record) => ({
                            ...record,
                            status: 'draft',
                            maximum: Number(event.target.value),
                          }))
                        }
                        type="number"
                        value={active.maximum ?? ''}
                      />
                    </label>
                  </div>
                )}
                {active.valueKind === 'exact' && (
                  <label>
                    Valor
                    <input
                      max={100}
                      min={0}
                      onChange={(event) =>
                        update(active.entityId, (record) => ({
                          ...record,
                          status: 'draft',
                          exact: Number(event.target.value),
                        }))
                      }
                      type="number"
                      value={active.exact ?? ''}
                    />
                  </label>
                )}
                {active.valueKind === 'range' &&
                  active.minimum != null &&
                  active.maximum != null && (
                    <p>
                      Capacidade estimada:{' '}
                      <strong>
                        {active.minimum}–{active.maximum}
                      </strong>
                      . O ponto central não será apresentado como valor exato.
                    </p>
                  )}
              </fieldset>

              <label className="evaluation-explanation">
                Justificativa
                <textarea
                  disabled={active.status === 'approved'}
                  onChange={(event) =>
                    update(active.entityId, (record) => ({
                      ...record,
                      status: 'draft',
                      explanation: event.target.value,
                    }))
                  }
                  placeholder="Explique fatores positivos, limitações e regra aplicada."
                  value={active.explanation}
                />
              </label>

              <section className="evaluation-evidence" aria-labelledby="evidence-heading">
                <header>
                  <div>
                    <h4 id="evidence-heading">Evidências</h4>
                    <p>{active.evidence.length} vinculada(s)</p>
                  </div>
                  <Button
                    disabled={active.status === 'approved'}
                    onClick={() =>
                      update(active.entityId, (record) => {
                        const evidence: WorkbenchEvidence = {
                          id: `${record.entityId}.evidence.${record.evidence.length + 1}`,
                          label: 'Observação técnica estruturada',
                          source: 'Autor fictício',
                          observedAt: '19/07/2026',
                          quality: 76,
                        };
                        return withHistory(
                          record,
                          { status: 'draft', evidence: [...record.evidence, evidence] },
                          'Evidência manual vinculada.',
                        );
                      })
                    }
                    variant="secondary"
                  >
                    Adicionar evidência
                  </Button>
                </header>
                {active.evidence.length ? (
                  <ul>
                    {active.evidence.map((evidence) => (
                      <li key={evidence.id}>
                        <strong>{evidence.label}</strong>
                        <span>
                          {evidence.source} · {evidence.observedAt}
                        </span>
                        <small>Qualidade {evidence.quality}% · observação manual</small>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="evaluation-evidence__empty">
                    Nenhuma evidência vinculada. A aprovação permanecerá bloqueada.
                  </p>
                )}
              </section>

              <div className="evaluation-editor__actions">
                {!['approved', 'inReview', 'stale'].includes(active.status) && (
                  <>
                    <Button
                      onClick={() =>
                        update(active.entityId, (record) =>
                          withHistory(record, { status: 'draft' }, 'Rascunho salvo.'),
                        )
                      }
                      variant="secondary"
                    >
                      Salvar rascunho
                    </Button>
                    <Button
                      onClick={() =>
                        update(active.entityId, (record) => {
                          const hasValue =
                            (record.valueKind === 'range' &&
                              record.minimum != null &&
                              record.maximum != null &&
                              record.minimum <= record.maximum) ||
                            (record.valueKind === 'exact' && record.exact != null);
                          const canReview = hasValue && record.evidence.length > 0;
                          return withHistory(
                            record,
                            { status: canReview ? 'inReview' : 'insufficientEvidence' },
                            canReview
                              ? 'Avaliação enviada para revisão.'
                              : 'Envio bloqueado por evidência ou valor insuficiente.',
                          );
                        })
                      }
                      variant="primary"
                    >
                      Enviar para revisão
                    </Button>
                  </>
                )}
                {active.status === 'inReview' && (
                  <>
                    <Button
                      onClick={() =>
                        update(active.entityId, (record) =>
                          withHistory(
                            record,
                            {
                              status: 'approved',
                              reviewer: 'Revisor fictício',
                              reviewedAt: '19/07/2026',
                            },
                            'Avaliação aprovada.',
                            'Revisor fictício',
                          ),
                        )
                      }
                      variant="primary"
                    >
                      Aprovar
                    </Button>
                    <Button
                      onClick={() =>
                        update(active.entityId, (record) =>
                          withHistory(
                            record,
                            { status: 'insufficientEvidence' },
                            'Mais evidência solicitada.',
                            'Revisor fictício',
                          ),
                        )
                      }
                      variant="secondary"
                    >
                      Solicitar evidência
                    </Button>
                    <Button
                      onClick={() =>
                        update(active.entityId, (record) =>
                          withHistory(
                            record,
                            { status: 'rejected' },
                            'Avaliação rejeitada.',
                            'Revisor fictício',
                          ),
                        )
                      }
                      variant="secondary"
                    >
                      Rejeitar
                    </Button>
                  </>
                )}
                {active.status === 'approved' && (
                  <Button
                    onClick={() =>
                      update(active.entityId, (record) =>
                        withHistory(
                          record,
                          { status: 'stale' },
                          'Avaliação marcada como desatualizada após mudança de contexto.',
                          'Revisor fictício',
                        ),
                      )
                    }
                    variant="secondary"
                  >
                    Marcar como desatualizada
                  </Button>
                )}
                {active.status === 'stale' && (
                  <Button
                    onClick={() =>
                      update(active.entityId, (record) =>
                        withHistory(
                          record,
                          {
                            status: 'draft',
                            reviewer: null,
                            reviewedAt: null,
                          },
                          'Nova revisão criada sem sobrescrever o histórico.',
                        ),
                      )
                    }
                    variant="primary"
                  >
                    Criar reavaliação
                  </Button>
                )}
              </div>
            </>
          ) : (
            <div className="evaluation-empty">
              <h3>Nenhuma avaliação selecionada</h3>
              <p>Selecione uma pessoa na lista.</p>
            </div>
          )}
        </section>

        <aside className="evaluation-inspector" aria-label="Inspector da avaliação">
          {active ? (
            <>
              <ConfidenceInspector record={active} />
              <section>
                <h4>Metodologia</h4>
                <dl>
                  <div>
                    <dt>Versão</dt>
                    <dd>Player Evaluation 1.0</dd>
                  </div>
                  <div>
                    <dt>Escala</dt>
                    <dd>0–100 · rating v2</dd>
                  </div>
                  <div>
                    <dt>Readiness</dt>
                    <dd>
                      {active.status === 'approved'
                        ? 'Avaliação mínima aprovada'
                        : 'Gameplay bloqueado'}
                    </dd>
                  </div>
                </dl>
                <p>Posição 50% · função 20% · encaixe 20% · familiaridade 10%.</p>
              </section>
              <section>
                <h4>Proveniência e revisão</h4>
                <p>Origem: camada pública fictícia.</p>
                <p>Revisor: {active.reviewer ?? 'Não atribuído'}</p>
                <p>Revisado em: {active.reviewedAt ?? 'Ainda não revisado'}</p>
              </section>
              <section className="evaluation-history">
                <h4>Histórico</h4>
                {active.history.length ? (
                  <ol>
                    {[...active.history].reverse().map((item) => (
                      <li key={item.id}>
                        <strong>{item.summary}</strong>
                        <span>
                          {item.actor} · {item.at}
                        </span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p>Nenhuma alteração registrada.</p>
                )}
              </section>
            </>
          ) : (
            <div className="evaluation-empty">
              <h3>Inspector</h3>
              <p>Blockers e histórico aparecerão aqui.</p>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
