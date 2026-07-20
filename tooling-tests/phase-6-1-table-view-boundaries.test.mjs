import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  APPROVED_DIRECT_BASELINE,
  verifyApprovedPackageReview,
  verifyInstalledWorkspace,
} from '../scripts/verify-phase-5-package-approval.mjs';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const exactSquadColumnIds = Object.freeze([
  'shirtNumber',
  'info',
  'name',
  'position',
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
]);

const exactRequiredColumnIds = Object.freeze(['shirtNumber', 'info', 'name', 'position']);

const javascriptManifestPaths = Object.freeze([
  'package.json',
  'apps/desktop/package.json',
  'packages/contracts-client/package.json',
  'packages/design-tokens/package.json',
  'packages/icons/package.json',
]);

const cargoManifestPaths = Object.freeze([
  'crates/domain/Cargo.toml',
  'crates/contracts/Cargo.toml',
  'crates/application/Cargo.toml',
  'crates/platform/Cargo.toml',
  'apps/desktop/src-tauri/Cargo.toml',
]);

const reviewedBaselines = Object.freeze({
  'browser-tests/__screenshots__/matchday/table-view-1024x768.png': [1024, 768],
  'browser-tests/__screenshots__/matchday/table-view-1366x768.png': [1366, 768],
  'browser-tests/__screenshots__/matchday/table-view-1440x900.png': [1440, 900],
  'browser-tests/__screenshots__/matchday/table-view-1920x1080.png': [1920, 1080],
  'browser-tests/__screenshots__/matchday/table-view-2560x1080.png': [2560, 1080],
});

const focusedEvidenceFiles = Object.freeze([
  'apps/desktop/src/table-view/table-view-engine.test.ts',
  'apps/desktop/src/matchday/squad-table-schema.test.ts',
  'crates/application/src/table_view.rs',
  'crates/platform/src/table_view.rs',
  'apps/desktop/src/matchday/client.test.ts',
  'apps/desktop/src/matchday/legacy-squad-preferences.test.ts',
  'apps/desktop/src/matchday/use-squad-table-view.test.tsx',
  'apps/desktop/src/matchday/TableViewCustomizer.test.tsx',
  'apps/desktop/src/matchday/SquadWorkspace.test.tsx',
  'apps/desktop/src/matchday/MatchdayScreen.test.tsx',
  'browser-tests/matchday.spec.ts',
]);

const tableOwnerReactFiles = Object.freeze([
  'apps/desktop/src/matchday/MatchdayScreen.tsx',
  'apps/desktop/src/matchday/SquadWorkspace.tsx',
  'apps/desktop/src/matchday/TableViewCustomizer.tsx',
  'apps/desktop/src/matchday/SavedViewSelector.tsx',
  'apps/desktop/src/matchday/use-squad-table-view.ts',
]);

const phaseSixProductionFiles = Object.freeze([
  'apps/desktop/src/table-view/table-view-engine.ts',
  'apps/desktop/src/matchday/squad-table-schema.ts',
  'apps/desktop/src/matchday/squad-sort.ts',
  'apps/desktop/src/matchday/client.ts',
  'apps/desktop/src/matchday/legacy-squad-preferences.ts',
  ...tableOwnerReactFiles,
  'crates/application/src/table_view.rs',
  'crates/platform/src/table_view.rs',
  'apps/desktop/src-tauri/src/main.rs',
]);

/** @param {string} path */
const readRootFile = (path) => readFile(resolve(repositoryRoot, path), 'utf8');

/** @param {string} path */
const readRootJson = async (path) => JSON.parse(await readRootFile(path));

/** @param {string} source @param {string} area @param {RegExp[]} terms */
const expectTerms = (source, area, terms) => {
  for (const term of terms) {
    expect(source, `${area} is missing ${String(term)}`).toMatch(term);
  }
};

/** @param {string} source @param {string} area @param {RegExp[]} terms */
const expectAbsent = (source, area, terms) => {
  for (const term of terms) {
    expect(source, `${area} contains forbidden ${String(term)}`).not.toMatch(term);
  }
};

const repositoryFiles = () =>
  execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], {
    cwd: repositoryRoot,
    encoding: 'utf8',
  })
    .split('\0')
    .filter(Boolean)
    .map((path) => path.replaceAll('\\', '/'))
    .sort();

/** @param {string} source @param {string} title */
const browserTestBody = (source, title) => {
  const marker = `test('${title}'`;
  const start = source.indexOf(marker);
  expect(start, `browser test "${title}" is missing`).toBeGreaterThanOrEqual(0);
  const next = source.indexOf('\ntest(', start + marker.length);
  return source.slice(start, next === -1 ? source.length : next);
};

/** @param {string} source @param {RegExp} start @param {RegExp} end @param {string} label */
const sourceSection = (source, start, end, label) => {
  const startMatch = start.exec(source);
  expect(startMatch, `${label} start is missing`).not.toBeNull();
  const startIndex = (startMatch?.index ?? 0) + (startMatch?.[0].length ?? 0);
  const endMatch = end.exec(source.slice(startIndex));
  expect(endMatch, `${label} end is missing`).not.toBeNull();
  return source.slice(startIndex, startIndex + (endMatch?.index ?? source.length));
};

/** @param {string} source */
const normalizedSha256 = (source) =>
  createHash('sha256').update(source.replace(/\r\n?/gu, '\n')).digest('hex');

/** @param {Record<string, unknown>} manifest @param {string} path */
const javascriptManifestEdges = (manifest, path) => {
  const rows = [];
  for (const section of [
    'dependencies',
    'devDependencies',
    'optionalDependencies',
    'peerDependencies',
  ]) {
    const entries = manifest[section];
    if (entries === undefined) continue;
    expect(
      typeof entries === 'object' && entries !== null && !Array.isArray(entries),
      `${path} ${section} must be a dependency record`,
    ).toBe(true);
    for (const [name, specifier] of Object.entries(
      /** @type {Record<string, unknown>} */ (entries),
    )) {
      rows.push(`${path}|${section}|${name}|${String(specifier)}`);
    }
  }
  return rows;
};

/** @param {string} manifest @param {string} path */
const cargoManifestEdges = (manifest, path) => {
  const rows = [];
  let section = '';
  for (const raw of manifest.replace(/\r\n?/gu, '\n').split('\n')) {
    const line = raw.trim();
    const header = line.match(/^\[([^\]]+)\]$/u);
    if (header !== null) {
      section = header[1] ?? '';
      continue;
    }
    if (
      (section === 'dependencies' || section === 'build-dependencies') &&
      /^[A-Za-z0-9_-]+\s*=/u.test(line)
    ) {
      rows.push(`${path}|${section}|${line.replace(/\s+/gu, ' ')}`);
    }
  }
  return rows;
};

/** @param {string} lockfile */
const pnpmPackageInventory = (lockfile) => {
  const normalized = lockfile.replace(/\r\n?/gu, '\n');
  const packages = normalized.match(/^packages:\s*$([\s\S]*?)^snapshots:\s*$/mu)?.[1];
  expect(packages, 'pnpm-lock.yaml packages/snapshots boundary is missing').toBeDefined();
  return [...(packages ?? '').matchAll(/^ {2}(\S.*):$/gmu)]
    .map((match) => (match[1] ?? '').replace(/^(['"])(.*)\1$/u, '$2'))
    .sort();
};

/** @param {Buffer} png */
const pngDimensions = (png) => {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  expect(png.subarray(0, signature.length), 'invalid PNG signature').toEqual(signature);
  expect(png.subarray(12, 16).toString('ascii'), 'missing PNG IHDR').toBe('IHDR');
  return [png.readUInt32BE(16), png.readUInt32BE(20)];
};

/** @param {string} manifest */
const directDependencyNames = (manifest) => {
  const dependencyBlock = manifest.split('[dependencies]')[1]?.split(/\r?\n(?=\[)/u)[0];
  expect(dependencyBlock, 'Cargo manifest is missing [dependencies]').toBeDefined();
  return [...(dependencyBlock ?? '').matchAll(/^([A-Za-z0-9_-]+)\s*=/gmu)]
    .map((match) => match[1])
    .sort();
};

/** @param {string} lockfile */
const cargoRegistryInventory = (lockfile) =>
  [
    ...lockfile.matchAll(
      /\[\[package\]\]\s+name = "([^"]+)"\s+version = "([^"]+)"([\s\S]*?)(?=\n\[\[package\]\]|$)/gu,
    ),
  ]
    .filter((match) => /source = "registry\+/u.test(match[3] ?? ''))
    .map((match) => {
      const checksum = (match[3] ?? '').match(/checksum = "([^"]+)"/u)?.[1];
      expect(
        checksum,
        `Cargo registry package ${match[1]}@${match[2]} has no checksum`,
      ).toBeDefined();
      return `${match[1]}@${match[2]}|${checksum}`;
    })
    .sort();

describe('Phase 06.1 Table View Engine production boundaries', () => {
  it('pins the exact first-owner identity, required columns, finite bounds, and bounded client window', async () => {
    const [schema, controller, application] = await Promise.all([
      readRootFile('apps/desktop/src/matchday/squad-table-schema.ts'),
      readRootFile('apps/desktop/src/matchday/use-squad-table-view.ts'),
      readRootFile('crates/application/src/table_view.rs'),
    ]);

    for (const [area, source] of [
      ['Elenco schema', schema],
      ['Elenco controller', controller],
    ]) {
      expectTerms(source, area, [
        /tableId:\s*'squad\.primary'/u,
        /schemaVersion:\s*1/u,
        /ownerScope:\s*'local-fixed'/u,
      ]);
    }

    expectTerms(schema, 'Elenco capability bounds', [
      /maxColumns:\s*18/u,
      /maxPinnedColumns:\s*4/u,
      /maxPinnedWidthRatio:\s*0\.5/u,
      /maxSortClauses:\s*3/u,
      /maxFilterDepth:\s*2/u,
      /maxFilterClauses:\s*12/u,
      /maxGroupingClauses:\s*0/u,
      /groupingSupported:\s*false/u,
      /groupingModes:\s*\[\]/u,
      /mode:\s*'client-pagination'/u,
      /pageSizeOptions:\s*\[25\]/u,
      /defaultPageSize:\s*25/u,
      /maxPage:\s*1/u,
      /pageSize:\s*25/u,
    ]);

    const schemaColumnIds = [
      ...(schema.match(/SQUAD_COLUMN_IDS\s*=\s*\[([\s\S]*?)\]\s*as const/u)?.[1] ?? '').matchAll(
        /'([^']+)'/gu,
      ),
    ].map((match) => match[1]);
    expect(schemaColumnIds, 'TypeScript squad column identity/order drifted').toEqual(
      exactSquadColumnIds,
    );

    const columnBlocks = [...schema.matchAll(/column\(\{([\s\S]*?)\}\),/gu)].map(
      (match) => match[1] ?? '',
    );
    expect(columnBlocks, 'Elenco must declare exactly 18 bounded columns').toHaveLength(18);
    const requiredColumnIds = columnBlocks
      .filter((block) => /required:\s*true/u.test(block))
      .map((block) => block.match(/columnId:\s*'([^']+)'/u)?.[1]);
    expect(requiredColumnIds, 'Elenco required-column set drifted').toEqual(exactRequiredColumnIds);
    for (const columnId of exactRequiredColumnIds) {
      const block = columnBlocks.find((candidate) =>
        new RegExp(`columnId:\\s*'${columnId}'`, 'u').test(candidate),
      );
      expect(block, `required column ${columnId} is missing`).toBeDefined();
      expectTerms(block ?? '', `required column ${columnId}`, [
        /required:\s*true/u,
        /requiredReason:\s*'[^']+'/u,
      ]);
    }

    const widths = [
      ...schema.matchAll(/width:\s*\{\s*default:\s*(\d+),\s*min:\s*(\d+),\s*max:\s*(\d+)\s*\}/gu),
    ].map((match) => ({
      defaultWidth: Number(match[1]),
      minimum: Number(match[2]),
      maximum: Number(match[3]),
    }));
    expect(widths, 'every Elenco column needs explicit finite geometry').toHaveLength(18);
    for (const width of widths) {
      expect(Number.isFinite(width.defaultWidth)).toBe(true);
      expect(width.minimum).toBeGreaterThan(0);
      expect(width.minimum).toBeLessThanOrEqual(width.defaultWidth);
      expect(width.defaultWidth).toBeLessThanOrEqual(width.maximum);
      expect(width.maximum).toBeLessThanOrEqual(360);
    }

    expectTerms(application, 'application first-owner mirror', [
      /SQUAD_PRIMARY_TABLE_ID:\s*&str\s*=\s*"squad\.primary"/u,
      /SQUAD_PRIMARY_SCHEMA_VERSION:\s*u32\s*=\s*1/u,
      /MAX_COLUMNS:\s*usize\s*=\s*18/u,
      /MAX_CLIENT_PAGE:\s*u32\s*=\s*1/u,
      /MAX_CLIENT_PAGE_SIZE:\s*u16\s*=\s*25/u,
      /REQUIRED_COLUMN_IDS:\s*\[&str;\s*4\]\s*=\s*\[\s*"shirtNumber",\s*"info",\s*"name",\s*"position"/u,
      /MIN_COLUMN_WIDTH:\s*f64\s*=\s*48\.0/u,
      /MAX_COLUMN_WIDTH:\s*f64\s*=\s*360\.0/u,
    ]);
    const rustColumnIds = [
      ...(
        application.match(
          /const SUPPORTED_COLUMN_IDS:\s*\[&str;\s*18\]\s*=\s*\[([\s\S]*?)\];/u,
        )?.[1] ?? ''
      ).matchAll(/"([^"]+)"/gu),
    ].map((match) => match[1]);
    expect(rustColumnIds, 'Rust squad column identity/order drifted').toEqual(exactSquadColumnIds);
    const rustRequiredColumnIds = [
      ...(
        application.match(
          /const REQUIRED_COLUMN_IDS:\s*\[&str;\s*4\]\s*=\s*\[([\s\S]*?)\];/u,
        )?.[1] ?? ''
      ).matchAll(/"([^"]+)"/gu),
    ].map((match) => match[1]);
    expect(rustRequiredColumnIds, 'Rust required-column set drifted').toEqual(
      exactRequiredColumnIds,
    );
  });

  it('keeps Mostrar somente gols on the generic filter and sort pipeline with grouping unavailable', async () => {
    const [schema, pipeline, browser, production] = await Promise.all([
      readRootFile('apps/desktop/src/matchday/squad-table-schema.ts'),
      readRootFile('apps/desktop/src/table-view/table-view-engine.ts'),
      readRootFile('browser-tests/matchday.spec.ts'),
      Promise.all(phaseSixProductionFiles.map(readRootFile)).then((parts) => parts.join('\n')),
    ]);

    expectTerms(schema, 'generic goals column capability', [
      /columnId:\s*'goals'/u,
      /\{\s*operator:\s*'greater-than',\s*valueKind:\s*'number'\s*\}/u,
      /groupingSupported:\s*false/u,
      /maxGroupingClauses:\s*0/u,
    ]);
    expectTerms(pipeline, 'generic engine filter/sort commands', [
      /type:\s*'sort\.set'/u,
      /type:\s*'filter\.set'/u,
      /unsupported-grouping-mode/u,
    ]);
    expectTerms(browser, 'ordinary scorer-view browser evidence', [
      /durable lifecycle persists an ordinary Mostrar somente gols view across restart/u,
      /columnId:\s*'goals',\s*direction:\s*'desc'/u,
      /filterId:\s*'filter\.goals'/u,
      /columnId:\s*'goals',\s*operator:\s*'greater-than'/u,
      /value:\s*\{\s*kind:\s*'number',\s*value:\s*0\s*\}/u,
      /data-control="grouping"/u,
      /\.toHaveCount\(0\)/u,
    ]);
    expectAbsent(production, 'Phase 06.1 production scorer surface', [
      /\bgoalsOnly\b/iu,
      /\bonlyGoals\b/iu,
      /\bscorersOnly\b/iu,
    ]);

    const tableOwnerUi = (await Promise.all(tableOwnerReactFiles.map(readRootFile))).join('\n');
    expectAbsent(tableOwnerUi, 'Elenco product grouping UI', [
      /\bAgrupar\b/iu,
      /\bgroupBy\b/u,
      /grouping\.(?:add|set|replace)/u,
      /data-control=['"]grouping['"]/u,
    ]);
  });

  it('keeps repository, migration, quarantine, recovery, and fixed command/path authority in Rust and Tauri', async () => {
    const [application, platform, host, client, controller, screen] = await Promise.all([
      readRootFile('crates/application/src/table_view.rs'),
      readRootFile('crates/platform/src/table_view.rs'),
      readRootFile('apps/desktop/src-tauri/src/main.rs'),
      readRootFile('apps/desktop/src/matchday/client.ts'),
      readRootFile('apps/desktop/src/matchday/use-squad-table-view.ts'),
      readRootFile('apps/desktop/src/matchday/MatchdayScreen.tsx'),
    ]);

    expectTerms(application, 'application repository authority', [
      /pub trait TableViewRepository/u,
      /fn load\(&self\)\s*->\s*Result<TableViewRepositoryLoad/u,
      /fn save_atomic\(/u,
      /pub struct TableViewService<R>/u,
      /impl<R:\s*TableViewRepository>\s*TableViewService<R>/u,
      /pub fn load_or_seed\(/u,
      /pub fn save_view\(/u,
      /pub fn import_legacy\(/u,
      /TableViewRecoveryReason/u,
      /TableViewRepositoryLoad::Recovered/u,
      /MAX_STABLE_ID_BYTES:\s*usize\s*=\s*64/u,
      /MAX_VIEW_LABEL_BYTES:\s*usize\s*=\s*96/u,
      /MAX_SAVED_VIEWS:\s*usize\s*=\s*32/u,
      /MAX_COLUMNS:\s*usize\s*=\s*18/u,
      /MAX_SORT_CLAUSES:\s*usize\s*=\s*3/u,
      /MAX_FILTER_DEPTH:\s*usize\s*=\s*2/u,
      /MAX_FILTER_GROUPS:\s*usize\s*=\s*16/u,
      /MAX_FILTER_CLAUSES:\s*usize\s*=\s*12/u,
      /MAX_FILTER_TEXT_BYTES:\s*usize\s*=\s*128/u,
      /MAX_FILTER_LIST_VALUES:\s*usize\s*=\s*32/u,
      /MAX_LEGACY_IMPORT_RECEIPTS:\s*usize\s*=\s*16/u,
      /MAX_LEGACY_FINGERPRINT_BYTES:\s*usize\s*=\s*128/u,
      /MIN_COLUMN_WIDTH:\s*f64\s*=\s*48\.0/u,
      /MAX_COLUMN_WIDTH:\s*f64\s*=\s*360\.0/u,
      /MAX_PINNED_COLUMNS:\s*usize\s*=\s*4/u,
      /MAX_PINNED_WIDTH_RATIO:\s*f64\s*=\s*0\.5/u,
      /MAX_FILTER_NUMBER:\s*f64\s*=\s*1_000_000_000\.0/u,
      /MAX_CLIENT_PAGE:\s*u32\s*=\s*1/u,
      /MAX_CLIENT_PAGE_SIZE:\s*u16\s*=\s*25/u,
    ]);
    expectTerms(platform, 'platform migration and recovery authority', [
      /pub struct FileTableViewRepository/u,
      /impl TableViewRepository for FileTableViewRepository/u,
      /const STORAGE_MIGRATIONS:\s*\[MigrationStep;\s*3\]/u,
      /migrate_storage_v1_to_v2/u,
      /migrate_storage_v2_to_v3/u,
      /migrate_storage_v3_to_v4/u,
      /\.quarantine\.payload/u,
      /\.quarantine\.json/u,
      /save_atomic/u,
      /every_replacement_interruption_recovers_previous_or_new_complete_generation/u,
      /added_column_comes_from_owning_default_and_preserves_every_known_intent/u,
      /v3_rating_widths_migrate_without_losing_saved_view_intent/u,
      /averageRating/u,
      /MAX_REPOSITORY_BYTES:\s*usize\s*=\s*512\s*\*\s*1024/u,
      /MAX_QUARANTINE_BYTES:\s*usize\s*=\s*1024\s*\*\s*1024/u,
      /invalid_collection_count_is_rejected_before_any_bytes_are_staged/u,
      /oversized_input_is_bounded_before_json_parse_and_quarantined_whole/u,
    ]);
    const addedColumnMigration = sourceSection(
      platform,
      /fn migrate_storage_v2_to_v3\(envelope:\s*&mut Value\)\s*->\s*Result<\(\),\s*\(\)>\s*\{/u,
      /\n\}\n\nfn migrate_storage_v3_to_v4/u,
      'v2 to v3 added-column migration',
    );
    expectTerms(addedColumnMigration, 'v2 to v3 added-column migration', [
      /squad_system_default_repository_state\(\)/u,
      /column\.column_id\.as_str\(\)\s*==\s*"averageRating"/u,
      /column\.get\("columnId"\)\.and_then\(Value::as_str\)\s*==\s*Some\("averageRating"\)/u,
      /columns\.push\(average_rating\.clone\(\)\)/u,
    ]);
    const ratingWidthMigration = sourceSection(
      platform,
      /fn migrate_storage_v3_to_v4\(envelope:\s*&mut Value\)\s*->\s*Result<\(\),\s*\(\)>\s*\{/u,
      /\n\}\n\nfn value_u32/u,
      'v3 to v4 rating-width migration',
    );
    expectTerms(ratingWidthMigration, 'v3 to v4 rating-width migration', [
      /"rating" if width <= 80\.0/u,
      /\(width \+ 24\.0\)\.clamp\(80\.0, 112\.0\)/u,
      /"potentialRating" if width <= 80\.0/u,
      /\(width \+ 72\.0\)\.clamp\(128\.0, 168\.0\)/u,
    ]);
    const addedColumnFixture = sourceSection(
      platform,
      /#\[test\]\s*fn added_column_comes_from_owning_default_and_preserves_every_known_intent\(\)\s*\{/u,
      /\n\s*#\[test\]/u,
      'added-column migration fixture',
    );
    expectTerms(addedColumnFixture, 'added-column migration fixture', [
      /historical_payload\(1,\s*&expected,\s*true\)/u,
      /assert_eq!\(migrated,\s*expected\)/u,
      /column\.column_id\.as_str\(\)\s*==\s*"averageRating"/u,
      /assert_eq!\(migrated_average,\s*vec!\[default_average\]\)/u,
    ]);
    expectTerms(host, 'Tauri host ownership', [
      /fn load_table_views\(/u,
      /fn save_table_views\(/u,
      /fn import_legacy_table_preferences\(/u,
      /load_table_views,\s*save_table_views,\s*import_legacy_table_preferences/u,
      /app\.path\(\)\.app_data_dir\(\)\?\.join\("table-views\.json"\)/u,
      /TableViewCoordinator::new\(table_views_path\)/u,
      /TableViewRepositoryState::try_from\(request\.state\)/u,
      /request\.try_into\(\)/u,
      /LoadTableViewsResponse::Invalid/u,
      /LoadTableViewsResponse::Unavailable/u,
      /LoadTableViewsResponse::Recovered/u,
      /LoadTableViewsResponse::SaveFailed/u,
    ]);
    expectTerms(client, 'typed frontend command boundary', [
      /invoke<unknown>\('load_table_views'\)/u,
      /invoke<unknown>\('save_table_views'/u,
      /invoke<unknown>\('import_legacy_table_preferences'/u,
      /decodeLoadOutcome/u,
      /decodeSaveOutcome/u,
      /decodeImportOutcome/u,
      /'corrupt_payload'/u,
      /'future_envelope_version'/u,
      /'future_schema_version'/u,
      /\['confirmed',\s*'invalid',\s*'unavailable',\s*'saveFailed'\]/u,
    ]);
    expectTerms(controller, 'truthful controller status mapping', [
      /status:\s*'invalid'/u,
      /status:\s*'unavailable'/u,
      /status:\s*'save-failed'/u,
      /Uma visualização corrompida foi isolada/u,
      /Esta visualização exige uma versão mais recente/u,
      /Visualizações personalizadas indisponíveis/u,
      /Não foi possível carregar suas visualizações/u,
    ]);
    expectTerms(screen, 'truthful table-view product recovery UI', [
      /repositoryStatus\.status\s*===\s*'save-failed'/u,
      /future_envelope_version/u,
      /future_schema_version/u,
      /Não foi possível salvar a visualização/u,
      /Tentar salvar visualização/u,
      /Usar visualização padrão/u,
      /Tentar carregar visualizações/u,
    ]);
  });

  it('allows only the narrow legacy browser-storage adapter and rejects React or deferred Phase 9 ownership', async () => {
    const reactSources = await Promise.all(
      tableOwnerReactFiles.map(async (path) => [path, await readRootFile(path)]),
    );
    for (const [path, source] of reactSources) {
      expectAbsent(source, path, [
        /@tauri-apps\/api\/core/u,
        /\binvoke\s*\(/u,
        /(?:node:fs|@tauri-apps\/plugin-fs)/u,
        /\b(?:readFile|writeFile|readTextFile|writeTextFile)\s*\(/u,
        /table-views\.json/u,
        /\bappDataDir\s*\(/u,
        /new\s+(?:File)?TableViewRepository/u,
      ]);
    }

    for (const path of [
      'apps/desktop/src/table-view/table-view-engine.ts',
      'apps/desktop/src/matchday/SquadWorkspace.tsx',
      'apps/desktop/src/matchday/TableViewCustomizer.tsx',
      'apps/desktop/src/matchday/SavedViewSelector.tsx',
      'apps/desktop/src/matchday/use-squad-table-view.ts',
    ]) {
      expectAbsent(await readRootFile(path), `${path} browser-storage boundary`, [
        /\blocalStorage\b/u,
        /\bsessionStorage\b/u,
        /\bindexedDB\b/u,
      ]);
    }

    const [screen, uiVocabulary, legacyAdapter] = await Promise.all([
      readRootFile('apps/desktop/src/matchday/MatchdayScreen.tsx'),
      readRootFile('apps/desktop/src/matchday/matchday-ui.ts'),
      readRootFile('apps/desktop/src/matchday/legacy-squad-preferences.ts'),
    ]);
    const uiPreferenceShape = uiVocabulary.match(
      /interface UiPreferences\s*\{([\s\S]*?)\n\}/u,
    )?.[1];
    expect(uiPreferenceShape, 'MatchdayScreen UiPreferences shape is missing').toBeDefined();
    expectTerms(screen, 'MatchdayScreen non-table preference persistence', [
      /const defaultPreferences = \(\): UiPreferences/u,
      /JSON\.stringify\(\{\s*\.\.\.current,\s*\.\.\.preferences\s*\}\)/u,
    ]);
    expectAbsent(uiPreferenceShape ?? '', 'non-table UI preference seam', [
      /\bdensity\b/u,
      /\bvisibleColumns\b/u,
      /\bcolumns\b/u,
      /\bsort\b/u,
      /\bfilter\b/u,
    ]);
    expectTerms(legacyAdapter, 'sole one-time legacy table adapter', [
      /const LEGACY_SOURCES/u,
      /rivallo\.squad-ui\.v4/u,
      /rivallo\.squad-ui\.v3/u,
      /rivallo\.squad-ui\.v2/u,
      /const TABLE_FIELDS = new Set\(\['density', 'visibleColumns'\]\)/u,
      /window\.localStorage/u,
      /receiptMatches/u,
      /retireConfirmedLegacyTablePreferences/u,
    ]);

    const phaseSixProduction = (await Promise.all(phaseSixProductionFiles.map(readRootFile))).join(
      '\n',
    );
    expectAbsent(phaseSixProduction, 'deferred Phase 9 implementation surface', [
      /\b(?:sqlite|rusqlite|sqlx|plugin-sql)\b/iu,
      /\b(?:server-query|server-pagination|client-virtualization)\b/iu,
      /\bvirtualiz(?:e|ed|es|ing|ation)\b/iu,
      /\b(?:queryCache|syncQueue|remoteSync|offlineStore|cacheKey)\b/u,
    ]);
    const tableViewOwnershipSurface = (
      await Promise.all(
        phaseSixProductionFiles
          .filter(
            (path) =>
              path !== 'apps/desktop/src/matchday/MatchdayScreen.tsx' &&
              path !== 'apps/desktop/src-tauri/src/main.rs',
          )
          .map(readRootFile),
      )
    ).join('\n');
    expectAbsent(tableViewOwnershipSurface, 'table-view persistence ownership surface', [
      /\b(?:careerId|career_id|userId|user_id|profileId|profile_id|accountId|account_id)\b/u,
    ]);

    const rustProduction = (
      await Promise.all(
        [
          'crates/application/src/table_view.rs',
          'crates/platform/src/table_view.rs',
          'apps/desktop/src-tauri/src/main.rs',
        ].map(readRootFile),
      )
    )
      .map((source) => source.split(/\n#\[cfg\(test\)\]\nmod tests/u)[0] ?? '')
      .join('\n');
    const typescriptSecuritySurface = (
      await Promise.all(
        phaseSixProductionFiles.filter((path) => !path.endsWith('.rs')).map(readRootFile),
      )
    ).join('\n');
    const securitySurface = `${typescriptSecuritySurface}\n${rustProduction}`;
    expectAbsent(securitySurface, 'Phase 06.1 security/data-safety surface', [
      /\bconsole\.(?:log|info|warn|error|debug)\s*\(/u,
      /\b(?:println|eprintln|dbg)!\s*\(/u,
      /\b(?:tracing|log)::/u,
      /\bfetch\s*\(/u,
      /\b(?:XMLHttpRequest|WebSocket|reqwest)\b/u,
      /\b(?:eval|Function)\s*\(/u,
      /\bprocess\.env\b/u,
      /\bstd::env\b/u,
      /\bimport\s*\(\s*['"]https?:/u,
    ]);
  });

  it('freezes the approved JavaScript and Rust package inventories with only the reviewed serde seam', async () => {
    const review = verifyApprovedPackageReview(
      await readRootFile(
        '.planning/phases/05-design-tokens-icon-policy-and-ui-primitives/05-01-PACKAGE-REVIEW.md',
      ),
    );
    const currentManifests = {
      root: await readRootJson('package.json'),
      desktop: await readRootJson('apps/desktop/package.json'),
      icons: await readRootJson('packages/icons/package.json'),
      designTokens: await readRootJson('packages/design-tokens/package.json'),
    };
    const pnpmLock = await readRootFile('pnpm-lock.yaml');
    expect(
      verifyInstalledWorkspace({
        approvedRows: review.rows,
        baselineManifests: APPROVED_DIRECT_BASELINE,
        currentManifests,
        lockfileText: pnpmLock,
      }),
    ).toEqual({
      approvedCount: 17,
      workspaceLinkCount: 2,
      platformPeerCount: 1,
    });

    const javascriptEdges = (
      await Promise.all(
        javascriptManifestPaths.map(async (path) =>
          javascriptManifestEdges(await readRootJson(path), path),
        ),
      )
    )
      .flat()
      .sort();
    expect(javascriptEdges, 'JavaScript direct manifest inventory changed').toHaveLength(37);
    expect(
      createHash('sha256').update(javascriptEdges.join('\n')).digest('hex'),
      'JavaScript manifest edge inventory changed; review before accepting',
    ).toBe('137518d4a8ed0e65783588fd839b5d759e2b814d3fd53e6b99cf2ea95d43f751');

    const pnpmInventory = pnpmPackageInventory(pnpmLock);
    expect(pnpmInventory, 'pnpm transitive package/version inventory changed').toHaveLength(467);
    expect(
      createHash('sha256').update(pnpmInventory.join('\n')).digest('hex'),
      'pnpm package/version inventory changed; review before accepting',
    ).toBe('ab38bdd7caf5cfd06f4d673d8c8f37cc363a35e1293b60d1690195643d6bc302');

    const [applicationManifest, platformManifest, cargoLock] = await Promise.all([
      readRootFile('crates/application/Cargo.toml'),
      readRootFile('crates/platform/Cargo.toml'),
      readRootFile('Cargo.lock'),
    ]);
    expect(directDependencyNames(applicationManifest)).toEqual(['rivallo-domain', 'serde']);
    expectTerms(applicationManifest, 'reviewed application serde seam', [
      /rivallo-domain\s*=\s*\{\s*path\s*=\s*"\.\.\/domain"\s*\}/u,
      /serde\s*=\s*\{\s*version\s*=\s*"=1\.0\.228",\s*features\s*=\s*\["derive"\]\s*\}/u,
    ]);
    expect(directDependencyNames(platformManifest)).toEqual([
      'axum',
      'rivallo-application',
      'rivallo-contracts',
      'serde',
      'serde_json',
      'sha2',
      'tokio',
      'utoipa',
    ]);
    const cargoEdges = (
      await Promise.all(
        cargoManifestPaths.map(async (path) => cargoManifestEdges(await readRootFile(path), path)),
      )
    )
      .flat()
      .sort();
    expect(cargoEdges, 'Cargo direct manifest inventory changed').toHaveLength(18);
    expect(
      createHash('sha256').update(cargoEdges.join('\n')).digest('hex'),
      'Cargo manifest edge inventory changed; review before accepting',
    ).toBe('e062569ad3a0ff00e7d114978e793938b2f0579ff755b876cee1dfe98a159475');

    const applicationLockEntry = cargoLock.match(
      /\[\[package\]\]\s+name = "rivallo-application"[\s\S]*?(?=\n\[\[package\]\]|$)/u,
    )?.[0];
    expect(applicationLockEntry, 'Cargo.lock is missing rivallo-application').toBeDefined();
    expectTerms(applicationLockEntry ?? '', 'reviewed Cargo.lock serialization edges', [
      /dependencies = \[\s*"rivallo-domain",\s*"serde",\s*"serde_json",\s*\]/u,
    ]);

    const registryInventory = cargoRegistryInventory(cargoLock);
    expect(registryInventory, 'Cargo registry package/version inventory changed').toHaveLength(447);
    expect(
      createHash('sha256').update(registryInventory.join('\n')).digest('hex'),
      'Cargo registry package/version/checksum inventory changed; review before accepting',
    ).toBe('5999ebb91a124346e5cd2885ec3b9309a78912e8363affbd631011275cf7cb81');

    const phaseFiveContractTest = await readRootFile(
      'tooling-tests/phase-5-table-view-contract.test.mjs',
    );
    expectTerms(phaseFiveContractTest, 'unchanged Phase 5 canonical contract link', [
      /const contractPath/u,
      /05-TABLE-VIEW-ENGINE-CONTRACT\.md/u,
      /describe\('Phase 5 Table View Engine planning contract'/u,
    ]);
    expect(
      normalizedSha256(phaseFiveContractTest),
      'Phase 5 canonical table-view contract test changed; preserve it and add Phase 06.1 assertions separately',
    ).toBe('ef4177df17a8cd6db47939eed38ddb95f35722181547f9b65cd1fcb62c2df723');
  });

  it('requires source-coverage evidence for migration, lifecycle, parity, contrast, zoom, and non-regression', async () => {
    for (const path of focusedEvidenceFiles) {
      expect((await readRootFile(path)).length, `${path} is empty`).toBeGreaterThan(0);
    }

    const [
      engineTests,
      platform,
      legacyTests,
      controllerTests,
      customizerTests,
      workspaceTests,
      screenTests,
      browser,
      contrast,
      playwright,
    ] = await Promise.all([
      readRootFile('apps/desktop/src/table-view/table-view-engine.test.ts'),
      readRootFile('crates/platform/src/table_view.rs'),
      readRootFile('apps/desktop/src/matchday/legacy-squad-preferences.test.ts'),
      readRootFile('apps/desktop/src/matchday/use-squad-table-view.test.tsx'),
      readRootFile('apps/desktop/src/matchday/TableViewCustomizer.test.tsx'),
      readRootFile('apps/desktop/src/matchday/SquadWorkspace.test.tsx'),
      readRootFile('apps/desktop/src/matchday/MatchdayScreen.test.tsx'),
      readRootFile('browser-tests/matchday.spec.ts'),
      readRootFile('browser-tests/helpers/wcag-contrast.ts'),
      readRootFile('playwright.config.ts'),
    ]);

    expectTerms(engineTests, 'pure engine evidence', [
      /schema and state validation/u,
      /normalization/u,
      /dirty/u,
      /non-finite/iu,
      /unknown/iu,
    ]);
    expectTerms(platform, 'repository migration fixtures', [
      /adjacent_v1_and_v2_migrations_reach_current_without_skipping_steps/u,
      /added_column_comes_from_owning_default_and_preserves_every_known_intent/u,
      /removed_column_is_discarded_but_unknown_column_quarantines_the_whole_payload/u,
      /future_schema/u,
      /quarantine/u,
    ]);
    expectTerms(legacyTests, 'legacy import evidence', [
      /v2/u,
      /v3/u,
      /v4/u,
      /confirmed/iu,
      /failed import/iu,
      /preserves every non-table field/iu,
    ]);
    expectTerms(controllerTests, 'controller lifecycle evidence', [
      /save failure/iu,
      /dirty proposal/iu,
      /baseline/iu,
      /load/iu,
      /unmounted controller/iu,
    ]);
    expectTerms(customizerTests, 'customizer interaction evidence', [
      /pointer/iu,
      /keyboard/iu,
      /Escape/u,
      /restores its trigger/iu,
      /contrast/iu,
    ]);
    expectTerms(workspaceTests, 'live workspace interaction evidence', [
      /reorders and resizes live headers by keyboard and pointer with Escape rollback/iu,
      /keeps header focus/iu,
      /native table/iu,
      /responsive CSS contracts/iu,
    ]);
    expectTerms(screenTests, 'screen lifecycle and non-regression evidence', [
      /creates, renames and sets a stable owned view as default/iu,
      /legacy/iu,
      /Táticas/u,
      /match/iu,
      /XI/u,
      /persists real interface preferences/iu,
    ]);

    expectTerms(browser, 'browser acceptance inventory', [
      /load_table_views/u,
      /save_table_views/u,
      /import_legacy_table_preferences/u,
      /durable lifecycle persists an ordinary Mostrar somente gols view across restart/u,
      /live header parity keeps pointer and keyboard reorder resize rollback focus and announcements/u,
      /computed WCAG contrast matrix covers operational and truthful table-view states/u,
      /tableViewContrastMatrix/u,
      /'default',\s*'hover',\s*'focus-visible',\s*'active',\s*'selected',\s*'disabled',\s*'loading',\s*'empty',\s*'invalid',\s*'unavailable',\s*'migrated',\s*'recovered',\s*'future-schema',\s*'dirty',\s*'save-failure'/u,
      /200% zoom reflow proves long Portuguese controls have no clipping or overlap/u,
      /Emulation\.setDeviceMetricsOverride/u,
      /visual baseline and four-viewport geometry preserve the dense table and inspector/u,
      /tableRatio\)\.toBeGreaterThanOrEqual\(0\.65\)/u,
      /toHaveScreenshot/u,
    ]);
    const liveHeaderBody = browserTestBody(
      browser,
      'live header parity keeps pointer and keyboard reorder resize rollback focus and announcements',
    );
    expectTerms(liveHeaderBody, 'live-header parity body', [
      /\.dragTo\(/u,
      /page\.mouse\.down\(\)/u,
      /page\.mouse\.move\(/u,
      /page\.mouse\.up\(\)/u,
      /page\.keyboard\.press\('Enter'\)/u,
      /page\.keyboard\.press\('ArrowRight'\)/u,
      /page\.keyboard\.press\('Escape'\)/u,
      /aria-valuenow/u,
      /toBeFocused\(\)/u,
      /posição/u,
      /pixels/u,
      /operação desfeita/u,
    ]);

    const wcagBody = browserTestBody(
      browser,
      'computed WCAG contrast matrix covers operational and truthful table-view states',
    );
    expectTerms(wcagBody, 'computed WCAG browser body', [
      /result\.ratio/u,
      /inactive-control-exception/u,
      /threshold !== null/u,
      /toBeGreaterThanOrEqual\(threshold\)/u,
      /tableViewContrastMatrix/u,
      /wcagStateInventory/u,
      /default\.live-header\.move-action-boundary/u,
      /default\.live-header\.resize-handle/u,
      /active\.saved-view-menu\.option-text/u,
      /default\.saved-view-menu\.delete-action-text/u,
      /default\.saved-view-menu\.delete-action-boundary/u,
      /disabled\.saved-view-menu\.default-action-boundary/u,
      /disabledDefaultAction\)\.toBeDisabled\(\)/u,
      /default\.saved-view-menu\.provenance-text/u,
      /default\.saved-view-menu\.default-text/u,
      /default\.customizer\.field-label-text/u,
      /default\.customizer\.field-boundary/u,
      /default\.customizer\.column-title-text/u,
      /default\.customizer\.column-explanation-text/u,
      /default\.customizer\.move-action-boundary/u,
      /default\.customizer\.resize-handle/u,
      /default\.customizer\.pin-action-boundary/u,
      /default\.customizer\.reset-columns-action-boundary/u,
      /default\.customizer\.discard-action-boundary/u,
      /active\.customizer\.move-action-boundary/u,
      /selected\.customizer\.visibility-boundary/u,
      /disabled\.customizer\.save-action-boundary/u,
      /dirty\.saved-view-menu\.readonly-explanation-text/u,
      /default\.table-row\.text/u,
      /samples\.map\(\(\{\s*id\s*\}\)\s*=>\s*id\)\.sort\(\)/u,
      /new Set\(samples\.map\(\(\{\s*state\s*\}\)\s*=>\s*state\)\)/u,
      /wcag-contrast-matrix\.json/u,
      /requirements:\s*tableViewContrastMatrix/u,
      /save-failure\.retry-action\.boundary/u,
    ]);

    const zoomBody = browserTestBody(
      browser,
      '200% zoom reflow proves long Portuguese controls have no clipping or overlap',
    );
    expectTerms(zoomBody, '200% zoom/reflow body', [
      /emulateMedia\(\{\s*reducedMotion:\s*'reduce'\s*\}\)/u,
      /Emulation\.setDeviceMetricsOverride/u,
      /width:\s*960/u,
      /height:\s*540/u,
      /screenWidth:\s*1920/u,
      /screenHeight:\s*1080/u,
      /deviceScaleFactor:\s*2/u,
      /Visualização extensa para análise técnica do elenco principal em preparação/u,
      /longViewTrigger/u,
      /toHaveAttribute\('title',\s*longViewName\)/u,
      /clippingTargets/u,
      /geometry\.scrollWidth/u,
      /geometry\.clientWidth/u,
      /geometry\.scrollHeight/u,
      /geometry\.clientHeight/u,
      /headerControlsOverlap/u,
      /actionsOverlap/u,
      /Fechar personalização/u,
      /document\.documentElement\.scrollWidth/u,
      /window\.innerWidth/u,
      /html\.scrollWidth\s*-\s*html\.clientWidth/u,
      /toBeFocused\(\)/u,
    ]);

    const baselineBody = browserTestBody(
      browser,
      'visual baseline and four-viewport geometry preserve the dense table and inspector',
    );
    expectTerms(baselineBody, 'four-viewport baseline body', [
      /\{\s*width:\s*1024,\s*height:\s*768\s*\}/u,
      /desktop-1366x768/u,
      /desktop-1920x1080/u,
      /desktop-2560x1080/u,
      /document\.documentElement\.scrollWidth/u,
      /tableRatio\)\.toBeGreaterThanOrEqual\(0\.65\)/u,
      /compactGeometry\.width\)\.toBeLessThanOrEqual\(420\)/u,
      /compactGeometry\.bodyScrollHeight\)\.toBeGreaterThan\(compactGeometry\.bodyClientHeight\)/u,
      /compactGeometry\.bodyOverflowY\)\.toBe\('auto'\)/u,
      /compactGeometry\.columnsOverflowY\)\.toBe\('visible'\)/u,
      /compactGeometry\.headingTopDelta\)\.toBeLessThanOrEqual\(1\)/u,
      /Fechar personalização/u,
      /table-view-\$\{viewport\.width\}x\$\{viewport\.height\}\.png/u,
      /toHaveScreenshot/u,
    ]);

    expectTerms(contrast, 'repo-native WCAG helper', [
      /parseSrgb/u,
      /compositeSrgb/u,
      /resolveEffectiveBackground/u,
      /relativeLuminance/u,
      /contrastRatio/u,
      /kind === 'text' \? 4\.5 : 3/u,
      /getComputedStyle/u,
      /getImageData\(0,\s*0,\s*1,\s*1\)/u,
      /ContrastForeground/u,
      /source === 'color'/u,
      /foreground\.alpha/u,
      /background\.alpha/u,
      /0\.04045/u,
      /12\.92/u,
      /2\.4/u,
      /0\.2126/u,
      /0\.7152/u,
      /0\.0722/u,
      /\+\s*0\.05/u,
    ]);
    expectTerms(playwright, 'tracked screenshot configuration', [
      /snapshotPathTemplate:\s*'\{testDir\}\/__screenshots__\/matchday\/\{arg\}\{ext\}'/u,
      /desktop-1366x768/u,
      /desktop-1920x1080/u,
      /desktop-2560x1080/u,
    ]);
  });

  it('tracks exactly four reviewed browser baselines and rejects runtime or generated artifacts from the repository tree', async () => {
    const files = repositoryFiles();
    const screenshotFiles = files.filter((path) =>
      path.startsWith('browser-tests/__screenshots__/'),
    );
    expect(screenshotFiles).toEqual(Object.keys(reviewedBaselines).sort());

    for (const [path, dimensions] of Object.entries(reviewedBaselines)) {
      expect(files, `${path} is not tracked or staged`).toContain(path);
      expect(pngDimensions(await readFile(resolve(repositoryRoot, path)))).toEqual(dimensions);
    }

    const forbiddenArtifacts = files.filter(
      (path) =>
        /(?:^|\/)(?:playwright-report|test-results|node_modules|coverage|dist|target|tmp|temp|\.cache)(?:\/|$)/iu.test(
          path,
        ) ||
        /(?:-actual|-diff)\.png$/iu.test(path) ||
        /\.(?:trace|tmp|temp|sqlite|sqlite3|db)$/iu.test(path) ||
        /(?:^|\/)(?:prisma\/migrations|drizzle|database-push|db-push)(?:\/|$)/iu.test(path) ||
        /schema\.generated\./iu.test(path),
    );
    expect(
      forbiddenArtifacts,
      `runtime/generated artifacts must not enter the final tree:\n${forbiddenArtifacts.join('\n')}`,
    ).toEqual([]);
  });
});
