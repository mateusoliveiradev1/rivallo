import { spawnSync } from 'node:child_process';

const minimumRustVersion = '1.88.0';
const cargoCommand = process.platform === 'win32' ? 'cargo.exe' : 'cargo';
const result = spawnSync(
  cargoCommand,
  ['metadata', '--no-deps', '--format-version', '1'],
  {
    encoding: 'utf8',
    env: { ...process.env, RUSTUP_AUTO_INSTALL: '0' },
  },
);

if (result.error?.code === 'ENOENT') {
  console.error('Cargo workspace verification failed.');
  console.error(`Expected tool: Cargo (Rust ${minimumRustVersion} or newer).`);
  console.error(`Minimum version: ${minimumRustVersion}.`);
  console.error('Detected version: unavailable (cargo was not found on PATH).');
  console.error(
    `Remediation: manually install Rust/Cargo ${minimumRustVersion} or newer, then rerun this command.`,
  );
  process.exitCode = 1;
} else if (result.status !== 0) {
  console.error('Cargo workspace verification failed with RUSTUP_AUTO_INSTALL=0.');
  console.error(
    `Remediation: manually install the Rust ${minimumRustVersion} toolchain and required components, then rerun this command.`,
  );
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
  process.exitCode = result.status ?? 1;
} else {
  process.stdout.write(result.stdout);
}
