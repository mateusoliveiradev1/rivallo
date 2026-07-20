import { access, readdir, readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const forbiddenPackageId = 'dev.example.league-2026';
const publicRoots = [
  'data/packages',
  'data/schemas',
  'apps/desktop/src/assets',
  'apps/desktop/dist',
];
const textExtensions = new Set(['.css', '.html', '.js', '.json', '.map', '.mjs', '.svg']);

/** @param {string} path */
const existing = async (path) => {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
};

/**
 * @param {string} directory
 * @returns {Promise<string[]>}
 */
const collectTextFiles = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collectTextFiles(path)));
    else if (entry.isFile() && textExtensions.has(extname(entry.name).toLocaleLowerCase('en-US'))) {
      files.push(path);
    }
  }
  return files;
};

const roots = publicRoots.map((path) => resolve(repositoryRoot, path));
const files = (
  await Promise.all(
    roots.map(async (root) => ((await existing(root)) ? collectTextFiles(root) : [])),
  )
).flat();
const leaks = [];

for (const file of files) {
  if ((await readFile(file, 'utf8')).includes(forbiddenPackageId)) {
    leaks.push(file.slice(repositoryRoot.length + 1));
  }
}

if (leaks.length > 0) {
  console.error(
    `Private development package leaked into public/build inputs:\n${leaks.join('\n')}`,
  );
  process.exit(1);
}

console.log('Public data-package isolation guard passed.');
