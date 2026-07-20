import { useEffect, useMemo, useState } from 'react';

import { Button } from '../ui/primitives/actions.js';
import { Skeleton, Status } from '../ui/primitives/feedback.js';
import {
  exportDataPackageSource,
  loadDataPackageCatalog,
  loadWorldDatabaseSummary,
  validateDataPackageSource,
} from './client.js';
import { PackageValidationSummary } from './PackageValidationSummary.js';
import type {
  DataPackageAuthoringSource,
  DataPackageCatalogEntry,
  PackageValidationReport,
  WorldDatabaseSummary,
} from './types.js';

import './data-editor.css';

const EMPTY_SHA256 = 'sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

const manifestTemplate = JSON.stringify(
  {
    packageId: 'community.author.package',
    name: 'Novo pacote Rivallo',
    version: '1.0.0',
    schemaVersion: 1,
    gameVersionCompatibility: '>=0.1.0 <0.2.0',
    author: 'Autor',
    description: 'Descreva o conteúdo e a intenção deste pacote.',
    contentType: 'mod',
    dependencies: [
      {
        packageId: 'official.rivallo.foundation',
        versionRequirement: '>=1.0.0 <2.0.0',
        optional: false,
      },
    ],
    conflicts: [],
    loadOrderHint: 100,
    entrypoints: {
      world: 'data/world.json',
      patches: 'data/patches.json',
      assets: 'assets',
    },
    assets: [],
    provenance: {
      source: 'Autoria local',
      rights: 'Conteúdo original do autor',
      createdAt: '2026-07-17',
      notes: null,
    },
    visibility: 'public',
    checksum: EMPTY_SHA256,
  },
  null,
  2,
);

const patchesTemplate = JSON.stringify([], null, 2);

export function DataEditorApp() {
  const [catalog, setCatalog] = useState<readonly DataPackageCatalogEntry[]>([]);
  const [catalogState, setCatalogState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [worldSummary, setWorldSummary] = useState<WorldDatabaseSummary | null>(null);
  const [manifestJson, setManifestJson] = useState(manifestTemplate);
  const [worldJson, setWorldJson] = useState('');
  const [patchesJson, setPatchesJson] = useState(patchesTemplate);
  const [report, setReport] = useState<PackageValidationReport | null>(null);
  const [busy, setBusy] = useState<'validate' | 'export' | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const dirty =
    manifestJson !== manifestTemplate ||
    worldJson.trim().length > 0 ||
    patchesJson !== patchesTemplate;

  useEffect(() => {
    let active = true;
    void Promise.all([loadDataPackageCatalog(), loadWorldDatabaseSummary()])
      .then(([entries, summary]) => {
        if (!active) return;
        setCatalog(entries);
        setWorldSummary(summary);
        setCatalogState('ready');
      })
      .catch(() => {
        if (active) setCatalogState('error');
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!dirty) return;
    const protectDraft = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', protectDraft);
    return () => window.removeEventListener('beforeunload', protectDraft);
  }, [dirty]);

  const source = useMemo<DataPackageAuthoringSource>(
    () => ({
      manifestJson,
      worldJson: worldJson.trim() ? worldJson : null,
      patchesJson: patchesJson.trim() ? patchesJson : null,
    }),
    [manifestJson, patchesJson, worldJson],
  );

  const runValidation = async () => {
    setBusy('validate');
    setError('');
    setMessage('');
    try {
      const nextReport = await validateDataPackageSource(source);
      setReport(nextReport);
      setMessage(nextReport.valid ? 'Validação concluída.' : 'Revise os diagnósticos abaixo.');
    } catch {
      setError('Não foi possível acessar o validador local. O conteúdo permaneceu inalterado.');
    } finally {
      setBusy(null);
    }
  };

  const runExport = async () => {
    setBusy('export');
    setError('');
    setMessage('');
    try {
      const nextReport = await exportDataPackageSource(source);
      setReport(nextReport);
      if (nextReport.valid) {
        try {
          setCatalog(await loadDataPackageCatalog());
          setMessage(
            'Pacote exportado e catálogo atualizado. Ele não foi ativado em nenhuma carreira.',
          );
        } catch {
          setMessage(
            'Pacote exportado, mas o catálogo visual não pôde ser atualizado. Reabra o editor. Ele não foi ativado em nenhuma carreira.',
          );
        }
      } else {
        setMessage('A exportação foi bloqueada. Revise os diagnósticos abaixo.');
      }
    } catch {
      setError('A exportação falhou com segurança; nenhum pacote parcial foi ativado.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <main className="data-editor-shell">
      <header className="data-editor-header">
        <div>
          <p>Rivallo · Fundação de dados</p>
          <h1>Editor de pacotes</h1>
          <span>
            Autoria JSON versionada para bases e mods data-only. A ativação fica para a criação de
            carreira.
          </span>
        </div>
        <a
          href="/main-menu"
          onClick={(event) => {
            if (
              dirty &&
              !window.confirm(
                'O rascunho do Editor de Dados ainda não foi exportado. Descartar e voltar ao Menu Principal?',
              )
            ) {
              event.preventDefault();
            }
          }}
        >
          Voltar ao Menu Principal
        </a>
      </header>

      <div className="data-editor-layout">
        <aside aria-labelledby="catalog-heading" className="data-editor-catalog">
          <h2 id="catalog-heading">Catálogo local</h2>
          {catalogState === 'loading' && <Skeleton lines={4} />}
          {catalogState === 'error' && (
            <Status label="Catálogo indisponível" variant="danger">
              <p>O editor continua disponível, mas não pode listar pacotes agora.</p>
            </Status>
          )}
          {catalogState === 'ready' && (
            <>
              {worldSummary && (
                <section aria-labelledby="active-snapshot-heading" className="data-editor-snapshot">
                  <h3 id="active-snapshot-heading">Snapshot ativo</h3>
                  <dl>
                    <div>
                      <dt>packageId</dt>
                      <dd>{worldSummary.packageId}</dd>
                    </div>
                    <div>
                      <dt>Versão</dt>
                      <dd>{worldSummary.version}</dd>
                    </div>
                    <div>
                      <dt>Schema</dt>
                      <dd>{worldSummary.schemaVersion}</dd>
                    </div>
                    <div>
                      <dt>Fingerprint ({worldSummary.fingerprintAlgorithm})</dt>
                      <dd>{worldSummary.worldFingerprint}</dd>
                    </div>
                  </dl>
                </section>
              )}
              <ul>
                {catalog.map((entry) => (
                  <li key={entry.manifest.packageId}>
                    <div>
                      <strong>{entry.manifest.name}</strong>
                      <span>{entry.manifest.packageId}</span>
                    </div>
                    <dl>
                      <div>
                        <dt>Versão</dt>
                        <dd>{entry.manifest.version}</dd>
                      </div>
                      <div>
                        <dt>Estado</dt>
                        <dd>{entry.active ? 'Base ativa' : 'Disponível, inativo'}</dd>
                      </div>
                    </dl>
                  </li>
                ))}
              </ul>
            </>
          )}
        </aside>

        <section aria-labelledby="authoring-heading" className="data-editor-workspace">
          <div className="data-editor-workspace__heading">
            <div>
              <h2 id="authoring-heading">Conteúdo de autoria</h2>
              <p>Campos inválidos retornam arquivo, entidade, campo, referência e correção.</p>
            </div>
            <div className="data-editor-actions">
              <Button
                loading={busy === 'validate'}
                loadingLabel="Validando…"
                onClick={() => void runValidation()}
                variant="secondary"
              >
                Validar
              </Button>
              <Button
                loading={busy === 'export'}
                loadingLabel="Exportando…"
                onClick={() => void runExport()}
                variant="primary"
              >
                Exportar pacote
              </Button>
            </div>
          </div>

          <div className="data-editor-source-grid">
            <label>
              <span>manifest.json</span>
              <small>Obrigatório · metadados, dependências, compatibilidade e checksum</small>
              <textarea
                aria-describedby="manifest-help"
                onChange={(event) => setManifestJson(event.currentTarget.value)}
                spellCheck={false}
                value={manifestJson}
              />
              <span className="data-editor-sr-help" id="manifest-help">
                JSON do manifesto versionado do pacote.
              </span>
            </label>
            <label>
              <span>data/world.json</span>
              <small>Obrigatório para bases; mods podem usar somente patches</small>
              <textarea
                onChange={(event) => setWorldJson(event.currentTarget.value)}
                placeholder="Cole um mundo exportado ou deixe vazio para um mod de patches."
                spellCheck={false}
                value={worldJson}
              />
            </label>
            <label>
              <span>data/patches.json</span>
              <small>Operações tipadas add, replace e remove por ID estável</small>
              <textarea
                onChange={(event) => setPatchesJson(event.currentTarget.value)}
                spellCheck={false}
                value={patchesJson}
              />
            </label>
          </div>

          <div aria-live="polite" className="data-editor-feedback">
            {message && <p>{message}</p>}
            {error && <p role="alert">{error}</p>}
          </div>
          {report && <PackageValidationSummary report={report} />}
        </section>
      </div>
    </main>
  );
}
