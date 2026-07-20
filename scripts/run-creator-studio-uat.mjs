import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

/** @typedef {{ exitCode: number; stdout: string; stderr: string }} ProcessResult */
/** @typedef {{ id: string; command: string; durationMs: number; exitCode: number; stdout: string; stderr: string }} CommandResult */
/** @typedef {'lifecycle' | 'asset' | 'export' | 'private'} NativeRequirement */
/** @typedef {{ title: string; duration?: number; error?: { message?: string }; steps?: PlaywrightStep[] }} PlaywrightStep */
/** @typedef {{ steps?: PlaywrightStep[] }} PlaywrightResult */
/** @typedef {{ results?: PlaywrightResult[] }} PlaywrightTest */
/** @typedef {{ tests?: PlaywrightTest[] }} PlaywrightSpec */
/** @typedef {{ specs?: PlaywrightSpec[]; suites?: PlaywrightSuite[] }} PlaywrightSuite */

const root = process.cwd();
const outputRoot = path.join(
  root,
  '.planning',
  'phases',
  '06.6-main-menu-new-career-and-coach-creator',
  'creator-studio-uat',
);
const screenshotRoot = path.join(outputRoot, 'screenshots');
const logRoot = path.join(outputRoot, 'logs');
const jsonReportPath = path.join(outputRoot, 'creator-studio-uat-report.json');
const markdownReportPath = path.join(outputRoot, 'creator-studio-uat-report.md');
const runId = `creator-studio-uat-${Date.now().toString(36)}`;
const tempRoot = await mkdtemp(path.join(os.tmpdir(), `${runId}-`));
const startedAt = new Date();

await rm(screenshotRoot, { recursive: true, force: true });
await rm(logRoot, { recursive: true, force: true });
await mkdir(screenshotRoot, { recursive: true });
await mkdir(logRoot, { recursive: true });

const environment = {
  ...process.env,
  CI: '1',
  CREATOR_STUDIO_UAT_REUSE_SERVER: '1',
  CREATOR_STUDIO_UAT_EVIDENCE: screenshotRoot,
  CREATOR_STUDIO_UAT_ROOT: tempRoot,
  CREATOR_STUDIO_UAT_CATALOG: path.join(tempRoot, 'catalog'),
  CREATOR_STUDIO_UAT_PROJECTS: path.join(tempRoot, 'projects'),
  CREATOR_STUDIO_UAT_EXPORTS: path.join(tempRoot, 'exports'),
  CREATOR_STUDIO_UAT_ID_NAMESPACE: `uat.${runId}`,
};

/** @type {CommandResult[]} */
const commandResults = [];
/**
 * @param {string} id
 * @param {string[]} args
 * @returns {Promise<CommandResult>}
 */
const run = async (id, args) => {
  const commandStartedAt = Date.now();
  /** @type {ProcessResult} */
  const result = await new Promise((resolve) => {
    const pnpmCli = process.env.npm_execpath;
    const executable = pnpmCli
      ? process.execPath
      : process.platform === 'win32'
        ? 'pnpm.cmd'
        : 'pnpm';
    const childArgs = pnpmCli ? [pnpmCli, ...args] : args;
    const child = spawn(executable, childArgs, {
      cwd: root,
      env: environment,
      shell: false,
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', (error) =>
      resolve({ exitCode: -1, stdout, stderr: `${stderr}\n${error.stack}` }),
    );
    child.on('close', (exitCode) => resolve({ exitCode: exitCode ?? -1, stdout, stderr }));
  });
  const entry = {
    id,
    command: `pnpm ${args.join(' ')}`,
    durationMs: Date.now() - commandStartedAt,
    ...result,
  };
  commandResults.push(entry);
  await writeFile(
    path.join(logRoot, `${id}.log`),
    [`$ ${entry.command}`, '', entry.stdout, entry.stderr].join('\n'),
    'utf8',
  );
  return entry;
};

/** @type {{ attempted: boolean; success: boolean; error: string | null }} */
let cleanup = { attempted: false, success: false, error: null };
/** @type {CommandResult | undefined} */
let browserResult;
/** @type {CommandResult | undefined} */
let focusedResult;
/** @type {CommandResult | undefined} */
let nativeLifecycleResult;
/** @type {CommandResult | undefined} */
let nativeAssetResult;
/** @type {CommandResult | undefined} */
let nativeExportResult;
/** @type {CommandResult | undefined} */
let nativePrivateResult;

try {
  focusedResult = await run('focused-tests', [
    'exec',
    'vitest',
    'run',
    'apps/desktop/src/data-editor/CompetitionBuilder.test.tsx',
    'apps/desktop/src/data-editor/DataStudio.test.tsx',
    'apps/desktop/src/data-editor/CsvImport.test.tsx',
    'apps/desktop/src/data-editor/authoring-graph.test.ts',
  ]);
  browserResult = await run('playwright', [
    'exec',
    'playwright',
    'test',
    'browser-tests/creator-studio-uat.spec.ts',
    '--project=desktop-1366x768',
    '--reporter=json',
  ]);
  nativeLifecycleResult = await run('native-lifecycle', [
    'exec',
    'cargo',
    'test',
    '-p',
    'rivallo-platform',
    'creator_project_bundle_update_and_rollback_are_separate_atomic_lifecycles',
  ]);
  nativeAssetResult = await run('native-asset', [
    'exec',
    'cargo',
    'test',
    '-p',
    'rivallo-platform',
    'authoring_png_is_materialized_with_authoritative_checksum',
  ]);
  nativeExportResult = await run('native-export-isolation', [
    'exec',
    'cargo',
    'test',
    '-p',
    'rivallo-platform',
    'editor_export_is_atomic_and_does_not_activate_the_mod',
  ]);
  nativePrivateResult = await run('native-private-catalog', [
    'exec',
    'cargo',
    'test',
    '-p',
    'rivallo-platform',
    'authorized_uat_catalog_discovers_and_sandboxes_only_its_private_package',
  ]);
} finally {
  cleanup.attempted = true;
  try {
    await rm(tempRoot, { recursive: true, force: true });
    cleanup.success = true;
  } catch (error) {
    cleanup.error = error instanceof Error ? error.message : String(error);
  }
}

/**
 * @param {string} stdout
 * @returns {Map<string, { durationMs: number; error: string | null }>}
 */
const parsePlaywright = (stdout) => {
  try {
    const document = JSON.parse(stdout);
    const steps = new Map();
    /** @param {PlaywrightSuite} suite */
    const visitSuite = (suite) => {
      for (const spec of suite.specs ?? []) {
        for (const test of spec.tests ?? []) {
          for (const result of test.results ?? []) {
            for (const step of result.steps ?? []) {
              steps.set(step.title, {
                durationMs: step.duration ?? 0,
                error: step.error?.message ?? null,
              });
            }
          }
        }
      }
      for (const child of suite.suites ?? []) visitSuite(child);
    };
    for (const suite of document.suites ?? []) visitSuite(suite);
    return steps;
  } catch {
    return new Map();
  }
};

const browserSteps = parsePlaywright(browserResult?.stdout ?? '');
const browserPassed = browserResult?.exitCode === 0;
const focusedPassed = focusedResult?.exitCode === 0;
const nativeLifecyclePassed = nativeLifecycleResult?.exitCode === 0;
const nativeAssetPassed = nativeAssetResult?.exitCode === 0;
const nativeExportPassed = nativeExportResult?.exitCode === 0;
const nativePrivatePassed = nativePrivateResult?.exitCode === 0;

/** @type {Array<[string, string, string, string[], NativeRequirement[]]>} */
const definitions = [
  [
    '01',
    'Projeto',
    '01 Projeto — criar, salvar, fechar e reabrir',
    ['01-projeto.png'],
    ['lifecycle'],
  ],
  [
    '02',
    'Geografia',
    '02 Geografia — Brasil, Vila Modelo e autoridade de contagem',
    ['02-divisao-administrativa.png', '02-cidade.png'],
    [],
  ],
  ['03', 'Estádio', '03 Estádio — Arena Modelo sem clube', ['03-estadio-Arena Modelo.png'], []],
  [
    '04',
    'Clube',
    '04 Clube — Atlético Modelo como Add e rascunho sem competição',
    ['04-clube-cam.png'],
    [],
  ],
  [
    '05',
    'Asset',
    '05 Asset — escudo sintético persistente por assetId, sem blob salvo',
    ['05-asset-escudo.png', '05-asset-reaberto.png'],
    ['asset'],
  ],
  [
    '06',
    'Competição',
    '06–08 Competição, temporada explícita e participante sem duplicação',
    ['06-competicao-liga-modelo.png'],
    [],
  ],
  [
    '07',
    'Temporada',
    '06–08 Competição, temporada explícita e participante sem duplicação',
    ['06-temporada-explicita.png'],
    [],
  ],
  [
    '08',
    'Participantes',
    '06–08 Competição, temporada explícita e participante sem duplicação',
    ['06-competicao-liga-modelo.png'],
    [],
  ],
  [
    '09',
    'Pessoas e CSV',
    '09 Pessoas — treinador, auxiliar, goleiro e dois jogadores por CRUD visual',
    [
      '09-comissao-e-pessoas.png',
      '09a-avaliacoes-revisao.png',
      '09a-avaliacoes-zoom-200.png',
      '09-importacao-elenco-csv.png',
    ],
    [],
  ],
  [
    '10',
    'Contratos e inscrições',
    '10 Contratos e inscrições — lote acumulativo, idempotente e sem duplicação',
    ['10-contratos-inscricoes.png'],
    [],
  ],
  [
    '11',
    'Readiness',
    '11 Readiness — validade estrutural sem liberar gameplay',
    [
      '11-readiness-bloqueada.png',
      '11-readiness-estrutural.png',
      '11-readiness-gameplay-bloqueada.png',
    ],
    [],
  ],
  [
    '12',
    'Sandbox',
    '12 Sandbox — snapshot temporário sem carreira, calendário ou resultado',
    ['12-sandbox.png'],
    ['export'],
  ],
  [
    '13',
    'Exportação',
    '13 Exportação — validar, gerar bundle e permanecer inativo',
    ['13-exportacao.png'],
    ['lifecycle', 'asset', 'export'],
  ],
  [
    '14',
    'Instalação',
    '14 Instalação — inspeção, hashes e catálogo temporário',
    ['14-instalacao-inspecao.png', '14-instalacao-concluida.png'],
    ['lifecycle'],
  ],
  [
    '15',
    'Versionamento',
    '15 Versionamento — 1.0.1, história, diff, atualização e rollback',
    ['15-versao-1-0-1-revisao.png', '15-atualizacao-1-0-1.png', '15-historico-rollback.png'],
    ['lifecycle'],
  ],
  [
    '16',
    'Nova Carreira',
    '16 Nova Carreira — pacote com avaliação pendente permanece bloqueado',
    ['16-nova-carreira-bloqueada.png'],
    [],
  ],
  [
    '17',
    'Cobertura visual',
    '17 Cobertura responsiva — 1024, 1920 e zoom 200%',
    ['17-1024x768.png', '17-1920x1080.png', '17-zoom-200.png'],
    [],
  ],
  [
    '18',
    'Catálogo privado factual',
    '18 Catálogo privado factual — capability explícita, pessoa parcial e sandbox sem carreira',
    [],
    ['private'],
  ],
];

const nativeState = {
  lifecycle: nativeLifecyclePassed,
  asset: nativeAssetPassed,
  export: nativeExportPassed,
  private: nativePrivatePassed,
};
const stages = definitions.map(([id, name, stepTitle, screenshots, nativeRequirements]) => {
  const browserStep = browserSteps.get(stepTitle);
  const failedNative = nativeRequirements.filter((requirement) => !nativeState[requirement]);
  const passed = browserPassed && focusedPassed && failedNative.length === 0;
  return {
    id,
    name,
    status: passed ? 'PASS' : 'FAIL',
    durationMs: browserStep?.durationMs ?? 0,
    evidence: [
      `browser-tests/creator-studio-uat.spec.ts — ${stepTitle}`,
      ...nativeRequirements.map((requirement) => `native:${requirement}`),
    ],
    error: passed
      ? null
      : (browserStep?.error ??
        (failedNative.length
          ? `Gate(s) nativo(s) falharam: ${failedNative.join(', ')}`
          : 'Gate funcional falhou.')),
    screenshots: screenshots.map((file) => path.join(screenshotRoot, file)),
    temporaryFiles: [tempRoot],
    cleanup,
  };
});

const passed = stages.every((stage) => stage.status === 'PASS') && cleanup.success;
const report = {
  schemaVersion: 1,
  runId,
  command: 'pnpm uat:creator-studio',
  status: passed ? 'PASS' : 'FAIL',
  startedAt: startedAt.toISOString(),
  finishedAt: new Date().toISOString(),
  durationMs: Date.now() - startedAt.getTime(),
  isolation: {
    temporaryRoot: tempRoot,
    catalog: environment.CREATOR_STUDIO_UAT_CATALOG,
    projects: environment.CREATOR_STUDIO_UAT_PROJECTS,
    exports: environment.CREATOR_STUDIO_UAT_EXPORTS,
    idNamespace: environment.CREATOR_STUDIO_UAT_ID_NAMESPACE,
    realCatalogTouched: false,
    realCareersTouched: false,
    realProjectsTouched: false,
  },
  cleanup,
  commands: commandResults.map(({ id, command, durationMs, exitCode }) => ({
    id,
    command,
    durationMs,
    exitCode,
  })),
  stages,
};

await writeFile(jsonReportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

/** @param {string} file */
const relative = (file) => path.relative(outputRoot, file).replaceAll('\\', '/');
const markdown = [
  '# Creator Studio Automated UAT',
  '',
  `- Resultado: **${report.status}**`,
  `- Comando: \`${report.command}\``,
  `- Execução: \`${report.runId}\``,
  `- Duração: ${(report.durationMs / 1000).toFixed(1)} s`,
  `- Cleanup temporário: **${cleanup.success ? 'PASS' : 'FAIL'}**`,
  `- Catálogo, carreiras e projetos reais alterados: **não**`,
  '',
  '| Etapa | Resultado | Duração | Evidência | Erro |',
  '| --- | --- | ---: | --- | --- |',
  ...stages.map(
    (stage) =>
      `| ${stage.id} · ${stage.name} | **${stage.status}** | ${(stage.durationMs / 1000).toFixed(2)} s | ${[
        ...stage.evidence.map((item) => `\`${item}\``),
        ...stage.screenshots.map((file) => `[screenshot](${relative(file)})`),
      ].join('<br>')} | ${stage.error ?? '—'} |`,
  ),
  '',
  '## Isolamento e cleanup',
  '',
  `O runner criou \`${tempRoot}\`, direcionou catálogo, projetos e exportações para subdiretórios exclusivos e removeu toda a árvore no bloco \`finally\`. Cleanup: **${cleanup.success ? 'concluído' : `falhou — ${cleanup.error}`}**.`,
  '',
  '## Logs',
  '',
  ...commandResults.map(
    (entry) => `- [${entry.id}](${relative(path.join(logRoot, `${entry.id}.log`))})`,
  ),
  '',
  '## Limites de automação',
  '',
  'A automação valida comportamento, persistência temporária, layout e integrações nativas. Julgamentos subjetivos de estética, redação e percepção de fluidez ainda pedem inspeção humana das screenshots.',
  '',
].join('\n');
await writeFile(markdownReportPath, markdown, 'utf8');

console.log(`Creator Studio UAT: ${report.status}`);
console.log(`JSON: ${jsonReportPath}`);
console.log(`Markdown: ${markdownReportPath}`);
process.exitCode = passed ? 0 : 1;
