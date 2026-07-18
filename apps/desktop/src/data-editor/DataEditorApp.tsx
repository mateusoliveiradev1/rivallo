import { Icon } from '@rivallo/icons';
import { useEffect, useMemo, useRef, useState } from 'react';

import { exitApplication } from '../career/client.js';
import { RivalloBrand } from '../matchday/RivalloBrand.js';
import { WindowControls } from '../matchday/WindowControls.js';
import { Button } from '../ui/primitives/actions.js';
import { Menu } from '../ui/primitives/disclosure.js';
import { Skeleton, Status } from '../ui/primitives/feedback.js';
import {
  exportDataPackageSource,
  chooseRivmodOpenPath,
  chooseRivmodSavePath,
  deleteCreatorProject,
  exportRivmod,
  forkCreatorPackage,
  inspectRivmod,
  installRivmod,
  loadDataPackageCatalog,
  loadCreatorProject,
  loadCreatorProjects,
  loadModAuthoringWorld,
  loadPackageHistory,
  loadWorldDatabaseSummary,
  rollbackPackage,
  saveCreatorProject,
  validateDataPackageSource,
} from './client.js';
import { CommunityEntityEditor } from './CommunityEntityEditor.js';
import { DataStudio } from './DataStudio.js';
import { PackageValidationSummary } from './PackageValidationSummary.js';
import type {
  CommunityChange,
  CreatorProjectRecord,
  CreatorProjectSummary,
  DataPackageAuthoringSource,
  DataPackageCatalogEntry,
  ModAuthoringWorld,
  PackageValidationReport,
  PackageHistoryEntry,
  RivmodInspection,
  WorldDatabaseSummary,
} from './types.js';

import './data-editor.css';

const EMPTY_SHA256 = 'sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

const editorSteps = ['Sobre o mod', 'Mudanças', 'Revisar e exportar'] as const;

interface ModDetails {
  readonly name: string;
  readonly author: string;
  readonly description: string;
  readonly version: string;
}

const defaultDetails: ModDetails = {
  name: 'Meu mod',
  author: '',
  description: '',
  version: '1.0.0',
};

const cleanIdPart = (value: string, fallback: string) => {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/gu, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '');
  return normalized || fallback;
};

const generatedPackageId = (details: ModDetails) =>
  `community.${cleanIdPart(details.author, 'autor')}.${cleanIdPart(details.name, 'mod')}`;

const nextPatchVersion = (version: string) => {
  const [major = 1, minor = 0, patch = 0] = version.split('.').map(Number);
  return `${major}.${minor}.${patch + 1}`;
};

const changesFromProject = (record: CreatorProjectRecord): CommunityChange[] => {
  const patches = record.source.patchesJson
    ? (JSON.parse(record.source.patchesJson) as CommunityChange['patches'])
    : [];
  const groups = new Map<string, CommunityChange['patches'][number][]>();
  for (const patch of patches) {
    groups.set(patch.targetId, [...(groups.get(patch.targetId) ?? []), patch]);
  }
  return [...groups.entries()].map(([targetId, entityPatches]) => {
    const entityKind = entityPatches[0]?.entityKind ?? 'club';
    const asset = record.source.assets.find((item) => item.entityId === targetId) ?? null;
    const value = entityPatches[0]?.entity.value as
      { name?: string; shortName?: string } | undefined;
    const kind =
      entityKind === 'matchdayPlayer' ||
      entityKind === 'playerProfile' ||
      entityKind === 'externalPlayer'
        ? 'player'
        : entityKind;
    return {
      id: `${kind}:${targetId}`,
      kind: kind as CommunityChange['kind'],
      operation: entityPatches[0]?.operation === 'replace' ? 'edit' : 'create',
      targetId,
      label: value?.name ?? value?.shortName ?? targetId,
      summary: 'Projeto de autoria reaberto',
      patches: entityPatches,
      asset,
    };
  });
};

const signatureFor = (
  details: ModDetails,
  packageIdOverride: string,
  baseId: string,
  changes: readonly CommunityChange[],
) =>
  JSON.stringify({
    details,
    packageIdOverride,
    baseId,
    changes: changes.map(({ asset, ...change }) => ({
      ...change,
      asset: asset ? { ...asset, bytes: asset.bytes.length } : null,
    })),
  });

export function DataEditorApp() {
  const [catalog, setCatalog] = useState<readonly DataPackageCatalogEntry[]>([]);
  const [projects, setProjects] = useState<readonly CreatorProjectSummary[]>([]);
  const [catalogState, setCatalogState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [worldSummary, setWorldSummary] = useState<WorldDatabaseSummary | null>(null);
  const [authoringWorld, setAuthoringWorld] = useState<ModAuthoringWorld | null>(null);
  const [worldState, setWorldState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [details, setDetails] = useState<ModDetails>(defaultDetails);
  const [packageIdOverride, setPackageIdOverride] = useState('');
  const [selectedBaseId, setSelectedBaseId] = useState('');
  const [changes, setChanges] = useState<readonly CommunityChange[]>([]);
  const [step, setStep] = useState(0);
  const requestedModule = new URLSearchParams(window.location.search).get('module');
  const [surface, setSurface] = useState<'quick' | 'studio'>(() =>
    requestedModule ? 'studio' : 'quick',
  );
  const [projectId, setProjectId] = useState('');
  const [inspection, setInspection] = useState<RivmodInspection | null>(null);
  const [distributionPath, setDistributionPath] = useState('');
  const [history, setHistory] = useState<{
    packageId: string;
    entries: readonly PackageHistoryEntry[];
  } | null>(null);
  const [report, setReport] = useState<PackageValidationReport | null>(null);
  const [busy, setBusy] = useState<
    'validate' | 'export' | 'save' | 'distribution' | 'install' | null
  >(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [leaveIntent, setLeaveIntent] = useState<'menu' | 'exit' | null>(null);
  const allowUnload = useRef(false);
  const [cleanSignature, setCleanSignature] = useState(() =>
    signatureFor(defaultDetails, '', '', []),
  );

  const bases = catalog.filter(
    (entry) => entry.manifest.contentType === 'base' && entry.validation.valid,
  );
  const packageId = packageIdOverride.trim() || generatedPackageId(details);
  const currentSignature = signatureFor(details, packageIdOverride, selectedBaseId, changes);
  const dirty = currentSignature !== cleanSignature;
  const detailsValid =
    details.name.trim().length > 0 &&
    details.author.trim().length > 0 &&
    details.description.trim().length > 0 &&
    /^\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?$/u.test(details.version) &&
    selectedBaseId.length > 0;

  useEffect(() => {
    let active = true;
    void Promise.all([loadDataPackageCatalog(), loadWorldDatabaseSummary(), loadCreatorProjects()])
      .then(([entries, summary, creatorProjects]) => {
        if (!active) return;
        setCatalog(entries);
        setWorldSummary(summary);
        setProjects(creatorProjects);
        const base = entries.find(
          (entry) => entry.manifest.contentType === 'base' && entry.validation.valid,
        );
        if (base) {
          setSelectedBaseId(base.manifest.packageId);
          setCleanSignature(signatureFor(defaultDetails, '', base.manifest.packageId, []));
        }
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
    if (!selectedBaseId) {
      setAuthoringWorld(null);
      setWorldState('idle');
      return;
    }
    let active = true;
    setWorldState('loading');
    void loadModAuthoringWorld(selectedBaseId)
      .then((world) => {
        if (!active) return;
        setAuthoringWorld(world);
        setWorldState('ready');
      })
      .catch(() => {
        if (active) setWorldState('error');
      });
    return () => {
      active = false;
    };
  }, [selectedBaseId]);

  useEffect(() => {
    if (!dirty) return;
    const protectDraft = (event: BeforeUnloadEvent) => {
      if (!allowUnload.current) event.preventDefault();
    };
    const protectWindowClose = (event: Event) => {
      event.preventDefault();
      setLeaveIntent('exit');
    };
    window.addEventListener('beforeunload', protectDraft);
    window.addEventListener('rivallo:window-close-requested', protectWindowClose);
    return () => {
      window.removeEventListener('beforeunload', protectDraft);
      window.removeEventListener('rivallo:window-close-requested', protectWindowClose);
    };
  }, [dirty]);

  useEffect(() => {
    if (!message || error) return;
    const timeout = window.setTimeout(() => setMessage(''), 6_000);
    return () => window.clearTimeout(timeout);
  }, [error, message]);

  const manifestJson = useMemo(() => {
    const base = bases.find((entry) => entry.manifest.packageId === selectedBaseId);
    const nextMajor = Number(base?.manifest.version.split('.')[0] ?? '1') + 1;
    return JSON.stringify(
      {
        packageId,
        name: details.name.trim(),
        version: details.version,
        schemaVersion: 1,
        gameVersionCompatibility: '>=0.1.0 <0.2.0',
        author: details.author.trim(),
        description: details.description.trim(),
        contentType: 'mod',
        dependencies: base
          ? [
              {
                packageId: base.manifest.packageId,
                versionRequirement: `>=${base.manifest.version} <${nextMajor}.0.0`,
                optional: false,
              },
            ]
          : [],
        conflicts: [],
        loadOrderHint: 100,
        entrypoints: {
          world: 'data/world.json',
          patches: 'data/patches.json',
          assets: 'assets',
        },
        assets: [],
        provenance: {
          source: 'Editor guiado do Rivallo',
          rights: 'Conteúdo original do autor',
          createdAt: new Date().toISOString().slice(0, 10),
          notes: null,
        },
        visibility: 'public',
        checksum: EMPTY_SHA256,
      },
      null,
      2,
    );
  }, [bases, details, packageId, selectedBaseId]);
  const patchesJson = useMemo(
    () =>
      JSON.stringify(
        changes.flatMap((change) => change.patches),
        null,
        2,
      ),
    [changes],
  );
  const assets = useMemo(
    () => changes.flatMap((change) => (change.asset ? [change.asset] : [])),
    [changes],
  );
  const source = useMemo<DataPackageAuthoringSource>(
    () => ({ manifestJson, worldJson: null, patchesJson, assets }),
    [assets, manifestJson, patchesJson],
  );

  const upsertChange = (change: CommunityChange) => {
    setChanges((current) => [...current.filter((candidate) => candidate.id !== change.id), change]);
    setReport(null);
    setMessage(`${change.label} foi adicionado ao mod.`);
  };

  const runValidation = async () => {
    setBusy('validate');
    setError('');
    setMessage('');
    try {
      const nextReport = await validateDataPackageSource(source);
      setReport(nextReport);
      setMessage(
        nextReport.valid
          ? 'Tudo certo. O mod está pronto para exportar.'
          : 'Encontramos pontos que precisam ser corrigidos antes da exportação.',
      );
    } catch {
      setError('Não foi possível acessar o validador local. Suas alterações foram preservadas.');
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
        setCleanSignature(currentSignature);
        try {
          setCatalog(await loadDataPackageCatalog());
          setMessage(
            'Mod exportado com sucesso. Ele estará disponível para seleção ao criar uma nova carreira.',
          );
        } catch {
          setMessage('Mod exportado. Reabra o editor para atualizar a lista de pacotes.');
        }
      } else {
        setMessage('A exportação foi bloqueada. Veja abaixo o que precisa ser corrigido.');
      }
    } catch {
      setError('A exportação falhou com segurança; nenhum pacote incompleto foi criado.');
    } finally {
      setBusy(null);
    }
  };

  const saveProject = async (
    mode: 'quickMod' | 'dataStudio' = surface === 'studio' ? 'dataStudio' : 'quickMod',
  ) => {
    setBusy('save');
    setError('');
    try {
      const id = projectId || `project.${packageId}`;
      const record = await saveCreatorProject({
        projectId: id,
        name: details.name.trim(),
        mode,
        basePackageId: selectedBaseId,
        source,
      });
      setProjectId(record.projectId);
      setProjects(await loadCreatorProjects());
      setCleanSignature(currentSignature);
      setMessage(`Projeto salvo · revisão ${record.revision}.`);
    } catch {
      setError('Não foi possível salvar o projeto de autoria. Os dados continuam nesta sessão.');
    } finally {
      setBusy(null);
    }
  };

  const openProject = async (id: string, openSurface?: 'quick' | 'studio') => {
    setError('');
    try {
      const record = await loadCreatorProject(id);
      const manifest = JSON.parse(record.source.manifestJson) as {
        name: string;
        author: string;
        description: string;
        version: string;
        packageId: string;
      };
      const restoredChanges = changesFromProject(record);
      setProjectId(record.projectId);
      setDetails({
        name: manifest.name,
        author: manifest.author,
        description: manifest.description,
        version: manifest.version,
      });
      setPackageIdOverride(manifest.packageId);
      setSelectedBaseId(record.basePackageId);
      setChanges(restoredChanges);
      setSurface(openSurface ?? (record.mode === 'dataStudio' ? 'studio' : 'quick'));
      setStep(record.mode === 'quickMod' ? 1 : 0);
      setMessage(`${record.name} reaberto para continuar a edição.`);
    } catch {
      setError('O projeto não pôde ser reaberto com segurança.');
    }
  };

  const forkPackage = async (entry: DataPackageCatalogEntry, duplicate: boolean) => {
    setBusy('save');
    setError('');
    try {
      const nextVersion = duplicate ? '1.0.0' : nextPatchVersion(entry.manifest.version);
      const duplicateId = duplicate
        ? `${entry.manifest.packageId}.copy-${Date.now().toString(36)}`
        : null;
      const record = await forkCreatorPackage({
        packageId: entry.manifest.packageId,
        projectId: `project.${entry.manifest.packageId}.${Date.now().toString(36)}`,
        name: duplicate ? `${entry.manifest.name} — cópia` : entry.manifest.name,
        mode: 'dataStudio',
        nextVersion,
        duplicatePackageId: duplicateId,
      });
      setProjects(await loadCreatorProjects());
      await openProject(record.projectId, 'studio');
    } catch {
      setError(
        'Este pacote não pôde originar um novo projeto. Bases oficiais permanecem imutáveis.',
      );
    } finally {
      setBusy(null);
    }
  };

  const exportSharedBundle = async () => {
    setBusy('distribution');
    setError('');
    try {
      const path = await chooseRivmodSavePath();
      if (!path) return;
      const receipt = await exportRivmod(source, path);
      setDistributionPath(receipt.path);
      setMessage(
        `${receipt.name} ${receipt.version} exportado · ${(receipt.size / 1024).toFixed(1)} KB · SHA-256 ${receipt.sha256.slice(0, 16)}…`,
      );
      setProjects(await loadCreatorProjects());
    } catch {
      setError('A exportação .rivmod foi bloqueada; nenhum arquivo incompleto foi mantido.');
    } finally {
      setBusy(null);
    }
  };

  const chooseBundleToInstall = async () => {
    setBusy('install');
    setError('');
    try {
      const path = await chooseRivmodOpenPath();
      if (!path) return;
      setDistributionPath(path);
      setInspection(await inspectRivmod(path));
    } catch {
      setError('O arquivo não passou pela inspeção de segurança do Rivallo.');
    } finally {
      setBusy(null);
    }
  };

  const confirmBundleInstall = async () => {
    if (!inspection) return;
    setBusy('install');
    try {
      const receipt = await installRivmod(distributionPath);
      setInspection(null);
      setCatalog(await loadDataPackageCatalog());
      setMessage(
        `${receipt.name} ${receipt.version} foi instalado. Nenhuma carreira existente foi alterada.`,
      );
    } catch {
      setInspection(null);
      setError('A instalação foi bloqueada por versão, conflito ou validação.');
    } finally {
      setBusy(null);
    }
  };

  const showHistory = async (packageId: string) => {
    setError('');
    try {
      setHistory({ packageId, entries: await loadPackageHistory(packageId) });
    } catch {
      setError('Não foi possível abrir o histórico seguro deste pacote.');
    }
  };

  const runRollback = async (version: string) => {
    if (!history) return;
    setBusy('install');
    try {
      const receipt = await rollbackPackage(history.packageId, version);
      setHistory(null);
      setCatalog(await loadDataPackageCatalog());
      setMessage(`${receipt.name} voltou com segurança para a versão ${receipt.version}.`);
    } catch {
      setHistory(null);
      setError('O rollback foi bloqueado e a versão instalada foi preservada.');
    } finally {
      setBusy(null);
    }
  };

  const goToMenu = () => {
    allowUnload.current = true;
    window.location.href = '/main-menu';
  };

  const confirmExit = () => {
    allowUnload.current = true;
    void exitApplication();
  };

  return (
    <main className="data-editor-shell">
      <header className="data-editor-header" data-tauri-drag-region>
        <div className="data-editor-header__brand">
          <RivalloBrand />
          <span>Creator Studio</span>
        </div>
        <div className="data-editor-header__actions">
          <button
            aria-label="Voltar ao Menu Principal"
            className="data-editor-header__back"
            onClick={() => (dirty ? setLeaveIntent('menu') : goToMenu())}
            title="Voltar ao Menu Principal"
            type="button"
          >
            <Icon name="previous" size={20} />
          </button>
          <Button loading={busy === 'save'} onClick={() => void saveProject()} variant="secondary">
            Salvar
          </Button>
          <Button onClick={() => void runValidation()} variant="secondary">
            Validar
          </Button>
          <Button
            loading={busy === 'distribution'}
            onClick={() => void exportSharedBundle()}
            variant="primary"
          >
            Exportar .rivmod
          </Button>
          <Button
            loading={busy === 'install'}
            onClick={() => void chooseBundleToInstall()}
            variant="secondary"
          >
            Instalar arquivo
          </Button>
          <WindowControls />
        </div>
      </header>

      <div className="data-editor-layout">
        <aside aria-labelledby="catalog-heading" className="data-editor-catalog">
          <div>
            <span>Biblioteca local</span>
            <h2 id="catalog-heading">Projetos e pacotes</h2>
            <p>Rascunhos são editáveis. Bundles exportados e pacotes instalados são imutáveis.</p>
          </div>
          {catalogState === 'loading' && <Skeleton lines={4} />}
          {catalogState === 'error' && (
            <Status label="Biblioteca indisponível" variant="danger">
              <p>Você ainda pode editar, mas a lista de pacotes não pôde ser carregada.</p>
            </Status>
          )}
          {catalogState === 'ready' && (
            <>
              <section className="creator-library-group">
                <h3>
                  Rascunhos <span>{projects.length}</span>
                </h3>
                {projects.length === 0 ? (
                  <p>Nenhum projeto salvo ainda.</p>
                ) : (
                  <ul>
                    {projects.map((project) => (
                      <li key={project.projectId}>
                        <button
                          className="creator-library-entry"
                          onClick={() => void openProject(project.projectId)}
                          type="button"
                        >
                          <strong>{project.name}</strong>
                          <span>
                            {project.mode === 'quickMod' ? 'Mod rápido' : 'Data Studio'} · v
                            {project.version} · {project.entityCount} itens
                          </span>
                          <em data-status={project.status}>
                            {project.status === 'blocked'
                              ? 'Bloqueado'
                              : project.status === 'validWithWarnings'
                                ? 'Válido com avisos'
                                : project.status === 'valid'
                                  ? 'Válido'
                                  : 'Rascunho'}
                          </em>
                        </button>
                        <Menu
                          items={[
                            {
                              id: `${project.projectId}.continue`,
                              label: 'Continuar edição',
                              onSelect: () => void openProject(project.projectId, 'quick'),
                              type: 'command',
                            },
                            {
                              id: `${project.projectId}.studio`,
                              label: 'Abrir no Data Studio',
                              onSelect: () => void openProject(project.projectId, 'studio'),
                              type: 'command',
                            },
                            {
                              id: `${project.projectId}.delete`,
                              label: 'Excluir rascunho',
                              onSelect: () =>
                                void deleteCreatorProject(project.projectId).then(async () =>
                                  setProjects(await loadCreatorProjects()),
                                ),
                              type: 'command',
                            },
                          ]}
                          triggerLabel={`Ações de ${project.name}`}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              <section className="creator-library-group">
                <h3>
                  Instalados e bases <span>{catalog.length}</span>
                </h3>
                <ul>
                  {catalog.map((entry) => (
                    <li key={entry.manifest.packageId}>
                      <div>
                        <strong>{entry.manifest.name}</strong>
                        <span>
                          {entry.manifest.contentType === 'base' ? 'Base' : 'Mod instalado'} · v
                          {entry.manifest.version}
                        </span>
                        <em data-valid={entry.validation.valid || undefined}>
                          {entry.validation.valid ? 'Pronto' : 'Requer atenção'}
                        </em>
                      </div>
                      {entry.manifest.contentType === 'mod' && (
                        <Menu
                          items={[
                            {
                              id: `${entry.manifest.packageId}.new-version`,
                              label: 'Criar nova versão',
                              onSelect: () => void forkPackage(entry, false),
                              type: 'command',
                            },
                            {
                              id: `${entry.manifest.packageId}.duplicate`,
                              label: 'Duplicar como novo mod',
                              onSelect: () => void forkPackage(entry, true),
                              type: 'command',
                            },
                            {
                              id: `${entry.manifest.packageId}.history`,
                              label: 'Ver histórico e rollback',
                              onSelect: () => void showHistory(entry.manifest.packageId),
                              type: 'command',
                            },
                          ]}
                          triggerLabel={`Ações de ${entry.manifest.name}`}
                        />
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            </>
          )}
          {worldSummary && (
            <details className="data-editor-runtime-details">
              <summary>Detalhes da base ativa</summary>
              <dl>
                <div>
                  <dt>Base</dt>
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
              </dl>
            </details>
          )}
        </aside>

        <section aria-labelledby="authoring-heading" className="data-editor-workspace">
          <header className="data-editor-workspace__heading">
            <div>
              <span>{surface === 'quick' ? 'Mod rápido' : 'Data Studio'}</span>
              <h1 id="authoring-heading">
                {surface === 'quick' ? 'Crie um mod sem editar arquivos' : details.name}
              </h1>
              <p>
                {surface === 'quick'
                  ? 'Escolha o que mudar; o Rivallo monta, valida e exporta o pacote por você.'
                  : `${details.version} · ${selectedBaseId || 'Escolha uma base'} · autoria completa e escalável`}
              </p>
            </div>
            <div className="data-editor-workspace__tools">
              <div aria-label="Modo de autoria" className="creator-mode-switch" role="radiogroup">
                <button
                  aria-checked={surface === 'quick'}
                  onClick={() => setSurface('quick')}
                  role="radio"
                  type="button"
                >
                  Mod rápido
                </button>
                <button
                  aria-checked={surface === 'studio'}
                  onClick={() => setSurface('studio')}
                  role="radio"
                  type="button"
                >
                  Data Studio
                </button>
              </div>
              <span className="data-editor-draft-state" data-dirty={dirty || undefined}>
                {dirty ? 'Modificado' : 'Salvo'}
              </span>
            </div>
          </header>

          {surface === 'quick' && (
            <nav aria-label="Etapas do Editor de mods" className="data-editor-stepper">
              {editorSteps.map((label, index) => (
                <button
                  aria-current={step === index ? 'step' : undefined}
                  data-complete={index < step || undefined}
                  disabled={index > step}
                  key={label}
                  onClick={() => setStep(index)}
                  type="button"
                >
                  <span>{index < step ? <Icon name="check" size={16} /> : index + 1}</span>
                  {label}
                </button>
              ))}
            </nav>
          )}

          <div className="data-editor-stage">
            {surface === 'studio' && worldState === 'ready' && authoringWorld && (
              <DataStudio
                author={details.author}
                changes={changes}
                initialModule={requestedModule}
                onBatch={(batch) => {
                  batch.forEach(upsertChange);
                  setMessage(
                    `${batch.length.toLocaleString('pt-BR')} registros foram preparados no projeto.`,
                  );
                }}
                onRollback={(ids) =>
                  setChanges((current) => current.filter((change) => !ids.includes(change.id)))
                }
                onUpsert={upsertChange}
                onValidate={runValidation}
                report={report}
                world={authoringWorld}
              />
            )}
            {surface === 'studio' && worldState === 'loading' && <Skeleton lines={8} />}
            {surface === 'quick' && step === 0 && (
              <section aria-labelledby="mod-details-heading" className="data-editor-stage__section">
                <header>
                  <h2 id="mod-details-heading">Conte um pouco sobre o seu mod</h2>
                  <p>Essas informações ajudam você e outros jogadores a reconhecer o pacote.</p>
                </header>
                <div className="data-editor-form-grid">
                  <label>
                    Nome do mod
                    <input
                      autoFocus
                      maxLength={100}
                      onChange={(event) => setDetails({ ...details, name: event.target.value })}
                      value={details.name}
                    />
                  </label>
                  <label>
                    Seu nome ou apelido
                    <input
                      maxLength={80}
                      onChange={(event) => setDetails({ ...details, author: event.target.value })}
                      placeholder="Como deseja aparecer nos créditos"
                      value={details.author}
                    />
                  </label>
                  <label className="data-editor-form-grid__wide">
                    O que este mod faz?
                    <textarea
                      aria-label="O que este mod faz?"
                      maxLength={280}
                      onChange={(event) =>
                        setDetails({ ...details, description: event.target.value })
                      }
                      placeholder="Ex.: atualiza nomes, cores e avaliações do elenco."
                      value={details.description}
                    />
                    <small>{details.description.length}/280</small>
                  </label>
                  <label>
                    Base usada como referência
                    <select
                      aria-label="Base usada como referência"
                      onChange={(event) => {
                        setSelectedBaseId(event.target.value);
                        setChanges([]);
                      }}
                      value={selectedBaseId}
                    >
                      {bases.map((base) => (
                        <option key={base.manifest.packageId} value={base.manifest.packageId}>
                          {base.manifest.name} · v{base.manifest.version}
                        </option>
                      ))}
                    </select>
                    <small>O mod não altera carreiras já existentes.</small>
                  </label>
                </div>
                <details className="data-editor-advanced">
                  <summary>Opções avançadas</summary>
                  <div className="data-editor-form-grid">
                    <label>
                      Versão do mod
                      <input
                        onChange={(event) =>
                          setDetails({ ...details, version: event.target.value })
                        }
                        value={details.version}
                      />
                    </label>
                    <label>
                      Identificador técnico
                      <input
                        onChange={(event) => setPackageIdOverride(event.target.value)}
                        placeholder={generatedPackageId(details)}
                        value={packageIdOverride}
                      />
                      <small>Deixe vazio para o Rivallo gerar automaticamente.</small>
                    </label>
                  </div>
                </details>
                {!detailsValid && (
                  <p className="data-editor-inline-help">
                    Preencha autor e descrição para continuar. Nome, versão e base também precisam
                    ser válidos.
                  </p>
                )}
              </section>
            )}

            {surface === 'quick' && step === 1 && (
              <section aria-labelledby="changes-heading" className="data-editor-stage__section">
                <header>
                  <h2 id="changes-heading">O que você quer mudar?</h2>
                  <p>
                    Adicione quantas mudanças quiser. Você pode revisar ou remover qualquer uma.
                  </p>
                </header>
                {worldState === 'loading' && <Skeleton lines={5} />}
                {worldState === 'error' && (
                  <Status label="A base não pôde ser aberta" variant="danger">
                    <p>Volte à etapa anterior, escolha outra base e tente novamente.</p>
                  </Status>
                )}

                {worldState === 'ready' && authoringWorld && (
                  <CommunityEntityEditor
                    author={details.author}
                    onUpsert={upsertChange}
                    world={authoringWorld}
                  />
                )}

                <section aria-labelledby="change-list-heading" className="change-list">
                  <div>
                    <h3 id="change-list-heading">Mudanças adicionadas</h3>
                    <span>{changes.length}</span>
                  </div>
                  {changes.length === 0 ? (
                    <p>Nenhuma mudança ainda. Crie ou edite um item acima para começar.</p>
                  ) : (
                    <ul>
                      {changes.map((change) => (
                        <li key={change.id}>
                          <Icon name={change.kind === 'club' ? 'club' : 'staff'} size={20} />
                          <span>
                            <strong>{change.label}</strong>
                            <small>{change.summary}</small>
                          </span>
                          <button
                            aria-label={`Remover mudança de ${change.label}`}
                            onClick={() =>
                              setChanges((current) =>
                                current.filter((candidate) => candidate !== change),
                              )
                            }
                            type="button"
                          >
                            <Icon name="close" size={16} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </section>
            )}

            {surface === 'quick' && step === 2 && (
              <section
                aria-labelledby="review-heading"
                className="data-editor-stage__section data-editor-review"
              >
                <header>
                  <h2 id="review-heading">Revise antes de exportar</h2>
                  <p>
                    O Rivallo valida dependências, referências e segurança antes de criar o pacote.
                  </p>
                </header>
                <dl className="data-editor-review__summary">
                  <div>
                    <dt>Mod</dt>
                    <dd>{details.name}</dd>
                  </div>
                  <div>
                    <dt>Autor</dt>
                    <dd>{details.author}</dd>
                  </div>
                  <div>
                    <dt>Versão</dt>
                    <dd>{details.version}</dd>
                  </div>
                  <div>
                    <dt>Mudanças</dt>
                    <dd>{changes.length}</dd>
                  </div>
                </dl>
                <section className="data-editor-review__changes">
                  <h3>Conteúdo do pacote</h3>
                  <ul>
                    {changes.map((change) => (
                      <li key={change.id}>
                        <strong>{change.label}</strong>
                        <span>
                          {change.kind === 'club'
                            ? 'Clube'
                            : change.kind === 'player'
                              ? 'Jogador'
                              : 'Treinador'}
                          {change.asset ? ' · imagem incluída' : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
                <div className="data-editor-review__actions">
                  <Button
                    loading={busy === 'validate'}
                    loadingLabel="Validando…"
                    onClick={() => void runValidation()}
                    variant="secondary"
                  >
                    Validar mod
                  </Button>
                  <Button
                    loading={busy === 'export'}
                    loadingLabel="Exportando…"
                    onClick={() => void runExport()}
                    variant="primary"
                  >
                    Exportar mod
                  </Button>
                </div>
                {report && <PackageValidationSummary report={report} />}
                <details className="data-editor-generated-files">
                  <summary>Ver arquivos técnicos gerados</summary>
                  <p>Somente leitura. Você não precisa editar estes arquivos.</p>
                  <div>
                    <h3>manifest.json</h3>
                    <pre>{manifestJson}</pre>
                  </div>
                  <div>
                    <h3>data/patches.json</h3>
                    <pre>{patchesJson}</pre>
                  </div>
                </details>
              </section>
            )}
          </div>

          {surface === 'quick' && (
            <footer className="data-editor-footer">
              <Button
                disabled={step === 0 || busy !== null}
                onClick={() => setStep((current) => current - 1)}
                variant="secondary"
              >
                Voltar
              </Button>
              <span>
                Etapa {step + 1} de {editorSteps.length} · {editorSteps[step]}
              </span>
              {step < editorSteps.length - 1 ? (
                <Button
                  disabled={
                    (step === 0 && !detailsValid) ||
                    (step === 1 && changes.length === 0) ||
                    worldState === 'loading'
                  }
                  onClick={() => setStep((current) => current + 1)}
                  variant="primary"
                >
                  Continuar
                </Button>
              ) : (
                <span />
              )}
            </footer>
          )}
        </section>
      </div>

      {(message || error) && (
        <div
          aria-live={error ? 'assertive' : 'polite'}
          className="data-editor-toast"
          data-variant={error ? 'danger' : report ? (report.valid ? 'success' : 'warning') : 'info'}
          role={error ? 'alert' : 'status'}
        >
          <Icon
            name={
              error ? 'danger' : report ? (report.valid ? 'success' : 'warning') : 'information'
            }
            size={20}
          />
          <div>
            <strong>
              {error
                ? 'Não foi possível concluir'
                : report
                  ? report.valid
                    ? 'Tudo certo'
                    : 'Revise os dados'
                  : 'Rascunho atualizado'}
            </strong>
            <p>{error || message}</p>
          </div>
          <button
            aria-label="Fechar notificação"
            onClick={() => {
              setMessage('');
              setError('');
            }}
            type="button"
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      )}

      {inspection && (
        <div className="data-editor-leave-overlay" role="presentation">
          <section
            aria-labelledby="install-mod-heading"
            className="data-editor-leave-dialog distribution-dialog"
            role="dialog"
          >
            <span>Inspeção de segurança concluída</span>
            <h2 id="install-mod-heading">Instalar {inspection.receipt.name}?</h2>
            <p>
              {inspection.receipt.packageId} · v{inspection.receipt.version} ·{' '}
              {(inspection.receipt.size / 1024).toFixed(1)} KB
            </p>
            <dl>
              <div>
                <dt>Validação</dt>
                <dd>{inspection.validation.valid ? 'Válido' : 'Bloqueado'}</dd>
              </div>
              <div>
                <dt>Dependências</dt>
                <dd>{inspection.dependencies.length || 'Nenhuma'}</dd>
              </div>
              <div>
                <dt>Conflitos</dt>
                <dd>{inspection.conflicts.length || 'Nenhum'}</dd>
              </div>
              <div>
                <dt>Atualização</dt>
                <dd>
                  {inspection.updateFromVersion
                    ? `${inspection.updateFromVersion} → ${inspection.receipt.version}`
                    : 'Nova instalação'}
                </dd>
              </div>
              <div>
                <dt>SHA-256</dt>
                <dd>{inspection.receipt.sha256}</dd>
              </div>
            </dl>
            {inspection.downgrade && (
              <Status label="Downgrade bloqueado" variant="danger">
                <p>Escolha uma versão superior ou use o histórico seguro para rollback.</p>
              </Status>
            )}
            <p>Instalar atualiza o catálogo, mas não ativa o mod em nenhuma carreira existente.</p>
            <div>
              <Button onClick={() => setInspection(null)} variant="secondary">
                Cancelar
              </Button>
              <Button
                disabled={!inspection.validation.valid || inspection.downgrade}
                loading={busy === 'install'}
                onClick={() => void confirmBundleInstall()}
                variant="primary"
              >
                Confirmar instalação
              </Button>
            </div>
          </section>
        </div>
      )}

      {history && (
        <div className="data-editor-leave-overlay" role="presentation">
          <section
            aria-labelledby="package-history-heading"
            className="data-editor-leave-dialog distribution-dialog"
            role="dialog"
          >
            <span>Histórico local preservado</span>
            <h2 id="package-history-heading">Versões anteriores</h2>
            {history.entries.length === 0 ? (
              <p>Nenhuma versão anterior foi preservada para este pacote.</p>
            ) : (
              <ul className="package-history-list">
                {history.entries.map((entry) => (
                  <li key={entry.version}>
                    <span>
                      <strong>
                        {entry.name} {entry.version}
                      </strong>
                      <small>{new Date(entry.archivedAt).toLocaleString('pt-BR')}</small>
                    </span>
                    <Button
                      loading={busy === 'install'}
                      onClick={() => void runRollback(entry.version)}
                      variant="secondary"
                    >
                      Restaurar
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <div>
              <Button onClick={() => setHistory(null)} variant="secondary">
                Fechar
              </Button>
            </div>
          </section>
        </div>
      )}

      {leaveIntent && (
        <div className="data-editor-leave-overlay" role="presentation">
          <section
            aria-labelledby="leave-editor-heading"
            className="data-editor-leave-dialog"
            role="alertdialog"
          >
            <h2 id="leave-editor-heading">Descartar o mod não exportado?</h2>
            <p>As mudanças deste rascunho serão perdidas. Mods já exportados permanecem seguros.</p>
            <div>
              <Button onClick={() => setLeaveIntent(null)} variant="secondary">
                Continuar editando
              </Button>
              <Button
                onClick={leaveIntent === 'exit' ? confirmExit : goToMenu}
                variant="destructive-proof"
              >
                {leaveIntent === 'exit' ? 'Descartar e sair' : 'Descartar e voltar'}
              </Button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
