import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { run as runTauri } from '@tauri-apps/cli';

const rootDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tauriDirectory = resolve(rootDirectory, 'apps', 'desktop', 'src-tauri');
const cargo = process.platform === 'win32' ? 'cargo.exe' : 'cargo';
const rustc = process.platform === 'win32' ? 'rustc.exe' : 'rustc';
const executableSuffix = process.platform === 'win32' ? '.exe' : '';
const prepareSidecarOnly = process.argv.includes('--prepare-sidecar-only');

process.env.RUSTUP_AUTO_INSTALL = '0';

/** @param {string} command @param {string[]} args @param {boolean} capture */
const runRust = (command, args, capture = false) => {
  const result = spawnSync(command, args, {
    cwd: rootDirectory,
    encoding: 'utf8',
    env: process.env,
    stdio: capture ? 'pipe' : 'inherit',
  });

  if (result.error || result.status !== 0) {
    const detail = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
    console.error(`Desktop build prerequisite failed: ${command} ${args.join(' ')}.`);
    if (detail) console.error(detail);
    console.error(
      'Remediation: manually install the pinned Rust toolchain and required components, then rerun the desktop build.',
    );
    process.exit(result.status ?? 1);
  }

  return result.stdout ?? '';
};

const rustcDetails = runRust(rustc, ['-vV'], true);
const targetTriple = rustcDetails.match(/^host:\s*(\S+)$/m)?.[1];
if (!targetTriple) {
  console.error('Desktop build prerequisite failed: rustc did not report a host target triple.');
  process.exit(1);
}

const metadata = JSON.parse(
  runRust(cargo, ['metadata', '--no-deps', '--format-version', '1'], true),
);
const targetDirectory = metadata.target_directory;
if (typeof targetDirectory !== 'string' || targetDirectory.length === 0) {
  console.error('Desktop build prerequisite failed: Cargo metadata omitted target_directory.');
  process.exit(1);
}

runRust(cargo, [
  'build',
  '--locked',
  '--release',
  '--package',
  'rivallo-platform',
  '--bin',
  'local_api',
]);

const sourceBinary = resolve(targetDirectory, 'release', `local_api${executableSuffix}`);
const sidecarDirectory = resolve(tauriDirectory, 'binaries');
const packagedBinary = resolve(sidecarDirectory, `local_api-${targetTriple}${executableSuffix}`);

mkdirSync(sidecarDirectory, { recursive: true });
copyFileSync(sourceBinary, packagedBinary);
console.log(`Prepared Tauri sidecar for ${targetTriple}.`);

if (prepareSidecarOnly) process.exit(0);

process.chdir(tauriDirectory);
await runTauri(['build', '--no-bundle']);
