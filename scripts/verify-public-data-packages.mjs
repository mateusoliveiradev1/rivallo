import { access, readdir, readFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const publicRoots = ['data/packages'];

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
    else if (entry.isFile() && basename(entry.name) === 'manifest.json') files.push(path);
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
  try {
    const manifest = JSON.parse(await readFile(file, 'utf8'));
    if (manifest?.visibility === 'privateDevelopment') {
      leaks.push(file.slice(repositoryRoot.length + 1));
    }
  } catch {
    leaks.push(`${file.slice(repositoryRoot.length + 1)} (manifesto inválido)`);
  }
}

if (leaks.length > 0) {
  console.error(
    `Private development package leaked into public/build inputs:\n${leaks.join('\n')}`,
  );
  process.exit(1);
}

console.log('Public data-package isolation guard passed.');
