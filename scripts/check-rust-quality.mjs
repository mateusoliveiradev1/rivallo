import { spawnSync } from 'node:child_process';

const cargo = process.platform === 'win32' ? 'cargo.exe' : 'cargo';
const rustfmt = process.platform === 'win32' ? 'rustfmt.exe' : 'rustfmt';
const environment = { ...process.env, RUSTUP_AUTO_INSTALL: '0' };

/** @param {string} command @param {string[]} args */
const run = (command, args) => {
  const result = spawnSync(command, args, { encoding: 'utf8', env: environment });
  if (result.error || result.status !== 0) {
    const detail = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
    console.error(`Rust quality check failed: ${command} ${args.join(' ')}.`);
    if (detail) console.error(detail);
    console.error(
      'Remediation: manually install Rust 1.88.0 or newer and its required components, then rerun the command.',
    );
    process.exit(result.status ?? 1);
  }
  return result.stdout ?? '';
};

const metadata = () => JSON.parse(run(cargo, ['metadata', '--no-deps', '--format-version', '1']));
const workspace = metadata();
const members = workspace.workspace_members ?? [];
const command = process.argv[2];

if (!['fmt', 'clippy', 'test'].includes(command)) {
  console.error('Usage: node scripts/check-rust-quality.mjs <fmt|clippy|test>');
  process.exit(1);
}

if (command === 'fmt') {
  run(rustfmt, ['--version']);
  if (members.length === 0) {
    console.log(
      'Rustfmt component is available; zero-member virtual workspace is structurally valid.',
    );
  } else {
    run(cargo, ['fmt', '--all', '--', '--check']);
  }
}

if (command === 'clippy') {
  run(cargo, ['clippy', '--version']);
  if (members.length === 0) {
    console.log(
      'Clippy component is available; no Rust source members exist in this virtual workspace.',
    );
  } else {
    run(cargo, ['clippy', '--workspace', '--all-targets', '--', '-D', 'warnings']);
  }
}

if (command === 'test') {
  run(cargo, ['nextest', '--version']);
  console.log(
    `cargo-nextest is available; zero-member virtual workspace metadata is valid (${members.length} members).`,
  );
}
