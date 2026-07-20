import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const PHASE_CRATES = new Map([
  ['rivallo-domain', []],
  ['rivallo-application', ['rivallo-domain']],
  ['rivallo-contracts', []],
  ['rivallo-platform', ['rivallo-application', 'rivallo-contracts']],
]);

// Domain may use only deliberately neutral, framework-free support crates.
const DOMAIN_ALLOWLIST = new Set([
  'rivallo-domain',
  'serde',
  'serde_core',
  'serde_derive',
  'serde_json',
  'itoa',
  'memchr',
  'proc-macro2',
  'quote',
  'syn',
  'thiserror',
  'unicode-ident',
  'zmij',
]);
const DOMAIN_DENYLIST = new Set([
  'actix-web',
  'axum',
  'deadpool',
  'diesel',
  'dioxus',
  'egui',
  'hyper',
  'hyper-util',
  'iced',
  'leptos',
  'mongodb',
  'neon',
  'poem',
  'postgres',
  'redis',
  'reqwest',
  'rocket',
  'rusqlite',
  'sea-orm',
  'sqlx',
  'surrealdb',
  'tauri',
  'tokio',
  'tokio-postgres',
  'tonic',
  'tower',
  'warp',
  'yew',
]);

/** @param {{ packages?: Array<{ id: string, name: string }> }} metadata */
const packageNameById = (metadata) =>
  new Map((metadata.packages ?? []).map((pkg) => [pkg.id, pkg.name]));

/** @param {{ resolve?: { nodes?: Array<{ id: string, dependencies?: string[] }> } }} metadata */
const graphById = (metadata) =>
  new Map((metadata.resolve?.nodes ?? []).map((node) => [node.id, node.dependencies ?? []]));

/** @param {{ workspace_members?: string[] } & Parameters<typeof packageNameById>[0]} metadata @param {Map<string, string[]>} names */
const memberIdByName = (metadata, names) => {
  const namesById = packageNameById(metadata);
  /** @type {[string, string][]} */
  const members = [];
  for (const id of metadata.workspace_members ?? []) {
    const name = namesById.get(id);
    if (name && names.has(name)) members.push([name, id]);
  }
  return new Map(members);
};

/** @param {string} startId @param {Map<string, string[]>} graph @param {Map<string, string>} namesById */
const dependencyPath = (startId, graph, namesById) => {
  const paths = new Map([[startId, [startId]]]);
  const queue = [startId];

  while (queue.length > 0) {
    const id = queue.shift();
    if (!id) continue;
    for (const dependency of graph.get(id) ?? []) {
      if (!paths.has(dependency)) {
        paths.set(dependency, [...(paths.get(id) ?? []), dependency]);
        queue.push(dependency);
      }
    }
  }

  return new Map(
    [...paths].map(([id, path]) => [id, path.map((entry) => namesById.get(entry) ?? entry)]),
  );
};

/** @param {unknown} metadata */
/** @param {{ packages?: Array<{ id: string, name: string }>, resolve?: { nodes?: Array<{ id: string, dependencies?: string[] }> }, workspace_members?: string[] }} metadata */
export const auditCargoArchitecture = (metadata) => {
  const failures = [];
  const namesById = packageNameById(metadata);
  const graph = graphById(metadata);
  const members = memberIdByName(metadata, PHASE_CRATES);

  if (!metadata.resolve?.nodes) {
    return [
      'Cargo metadata has no resolved dependency graph. Run `cargo metadata --format-version=1`.',
    ];
  }

  for (const crate of PHASE_CRATES.keys()) {
    if (!members.has(crate)) failures.push(`Missing required Phase-3 workspace crate: ${crate}.`);
  }

  for (const [crate, allowedDependencies] of PHASE_CRATES) {
    const crateId = members.get(crate);
    if (!crateId) continue;
    const actualDependencies = (graph.get(crateId) ?? []).map((id) => namesById.get(id) ?? id);
    for (const dependency of actualDependencies) {
      if (PHASE_CRATES.has(dependency) && !allowedDependencies.includes(dependency)) {
        failures.push(`D-01 forbids ${crate} -> ${dependency}. Path: ${crate} -> ${dependency}.`);
      }
    }
  }

  const domainId = members.get('rivallo-domain');
  if (!domainId) return failures;

  for (const [id, path] of dependencyPath(domainId, graph, namesById)) {
    if (id === domainId) continue;
    const name = namesById.get(id) ?? id;
    const renderedPath = path.join(' -> ');
    if (DOMAIN_DENYLIST.has(name)) {
      failures.push(`Domain reaches prohibited dependency ${name}. Path: ${renderedPath}.`);
    } else if (!DOMAIN_ALLOWLIST.has(name)) {
      failures.push(
        `Domain dependency ${name} is not in the approved core allowlist. Path: ${renderedPath}.`,
      );
    }
  }

  return failures;
};

/** @param {string[]} failures */
export const formatArchitectureFailures = (failures) => failures.join('\n');

const cargo = process.platform === 'win32' ? 'cargo.exe' : 'cargo';
const CARGO_METADATA_MAX_BUFFER = 64 * 1024 * 1024;
const runAudit = () => {
  const result = spawnSync(cargo, ['metadata', '--format-version=1'], {
    encoding: 'utf8',
    env: { ...process.env, RUSTUP_AUTO_INSTALL: '0' },
    maxBuffer: CARGO_METADATA_MAX_BUFFER,
  });
  if (result.error || result.status !== 0) {
    const detail = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
    console.error('Cargo architecture audit could not obtain resolved metadata.');
    if (detail) console.error(detail);
    process.exit(result.status ?? 1);
  }

  const failures = auditCargoArchitecture(JSON.parse(result.stdout));
  if (failures.length > 0) {
    console.error('Cargo architecture policy failed:');
    console.error(formatArchitectureFailures(failures));
    process.exit(1);
  }
  console.log('Cargo architecture policy passed for the resolved workspace graph.');
};

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) runAudit();
