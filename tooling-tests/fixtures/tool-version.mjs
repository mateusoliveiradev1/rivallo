import { appendFileSync } from 'node:fs';

const [tool, version, logFile] = process.argv.slice(2);
appendFileSync(logFile, `${tool}:${process.env.RUSTUP_AUTO_INSTALL ?? 'unset'}\n`);

if (version === 'MISSING') {
  process.exitCode = 127;
} else if (version.startsWith('UNAVAILABLE:')) {
  process.stderr.write(
    `error: toolchain '${version.slice('UNAVAILABLE:'.length)}' is not installed\n`,
  );
  process.exitCode = 1;
} else if (tool === 'rustc' && !version.startsWith('rustc ')) {
  process.stdout.write(`rustc ${version}\n`);
} else if (tool === 'cargo') {
  process.stdout.write(`cargo ${version}\n`);
} else {
  process.stdout.write(`${version}\n`);
}
