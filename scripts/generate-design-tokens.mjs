import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import ts from 'typescript';

const DEFAULT_SOURCE = resolve('packages/design-tokens/src/tokens.ts');
const DEFAULT_OUTPUT = resolve('packages/design-tokens/src/generated.css');

/** @typedef {{ name: string, values: Record<string, string | number> }} TokenGroup */

/** @param {string[]} args */
function parseOutputPath(args) {
  if (args.length === 0) return DEFAULT_OUTPUT;
  if (args.length === 2 && args[0] === '--output' && args[1].trim().length > 0) {
    return resolve(args[1]);
  }
  throw new Error('Usage: node scripts/generate-design-tokens.mjs [--output <path>]');
}

/** @param {string} sourcePath */
async function loadTokenGroups(sourcePath) {
  const source = await readFile(sourcePath, 'utf8');
  const transpiled = ts.transpileModule(source, {
    fileName: sourcePath,
    reportDiagnostics: true,
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2024,
    },
  });
  const errors = (transpiled.diagnostics ?? []).filter(
    ({ category }) => category === ts.DiagnosticCategory.Error,
  );
  if (errors.length > 0) {
    const detail = ts.formatDiagnosticsWithColorAndContext(errors, {
      getCanonicalFileName: (fileName) => fileName,
      getCurrentDirectory: () => process.cwd(),
      getNewLine: () => '\n',
    });
    throw new Error(`Unable to compile canonical token source:\n${detail}`);
  }

  const dataUrl = `data:text/javascript;base64,${Buffer.from(transpiled.outputText).toString('base64')}`;
  const module = await import(dataUrl);
  if (!Array.isArray(module.publicTokenGroups)) {
    throw new Error('Canonical token source did not export publicTokenGroups.');
  }
  return /** @type {TokenGroup[]} */ (module.publicTokenGroups);
}

/** @param {TokenGroup[]} groups */
export function serializeDesignTokens(groups) {
  const seen = new Set();
  const lines = [
    '/* Rivallo semantic tokens — generated from tokens.ts; do not edit. */',
    '',
    ':root {',
  ];

  for (const group of groups) {
    lines.push(`  /* ${group.name} */`);
    for (const [token, value] of Object.entries(group.values)) {
      if (!/^[a-z][a-z0-9-]*$/u.test(token)) {
        throw new Error(`Invalid public token name: ${token}.`);
      }
      if (seen.has(token)) {
        throw new Error(`Duplicate public token name: ${token}.`);
      }
      seen.add(token);
      const declaration = `  --rv-${token}: ${String(value)};`;
      if (declaration.length > 80) {
        lines.push(`  --rv-${token}:`, `    ${String(value)};`);
      } else {
        lines.push(declaration);
      }
    }
    lines.push('');
  }

  lines.pop();
  lines.push(
    '}',
    '',
    '@media (prefers-reduced-motion: reduce) {',
    '  *,',
    '  *::before,',
    '  *::after {',
    '    scroll-behavior: auto !important;',
    '    transition-duration: var(--rv-motion-reduced-duration) !important;',
    '    animation-duration: var(--rv-motion-reduced-duration) !important;',
    '    animation-iteration-count: var(--rv-motion-reduced-iteration-count) !important;',
    '  }',
    '}',
    '',
  );
  return lines.join('\n');
}

/**
 * @param {{ sourcePath?: string, outputPath?: string }} [options]
 */
export async function writeDesignTokens({
  sourcePath = DEFAULT_SOURCE,
  outputPath = DEFAULT_OUTPUT,
} = {}) {
  const css = serializeDesignTokens(await loadTokenGroups(resolve(sourcePath)));
  const resolvedOutput = resolve(outputPath);
  await mkdir(dirname(resolvedOutput), { recursive: true });
  await writeFile(resolvedOutput, css, 'utf8');
  return { outputPath: resolvedOutput, bytes: Buffer.byteLength(css), css };
}

async function runCli() {
  const outputPath = parseOutputPath(process.argv.slice(2));
  const result = await writeDesignTokens({ outputPath });
  console.log(`Generated ${result.outputPath} (${result.bytes} bytes).`);
}

const isCli = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isCli) {
  runCli().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Design token generation failed: ${message}`);
    process.exitCode = 1;
  });
}
