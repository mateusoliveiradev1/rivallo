import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const rootFile = (path) => readFile(resolve(root, path), 'utf8');

describe('Phase 4 local API runtime scope', () => {
  it('keeps the HTTP surface loopback-only and compatibility-aware', async () => {
    const runtime = await rootFile('crates/platform/src/runtime.rs');
    const routes = [...runtime.matchAll(/\.route\(\s*"([^"]+)"/g)].map((match) => match[1]);

    expect(routes).toEqual(['/health', '/ready']);
    expect(runtime).toContain('127.0.0.1:47831');
    expect(runtime).not.toMatch(/0\.0\.0\.0|\[::\]/);
    expect(runtime).toContain('"service"');
    expect(runtime).toContain('"contractVersion"');
    expect(runtime).toContain('"runtimeProtocol"');
    expect(runtime).toContain('payload.len() != 3');
  });

  it('wires only private stdin shutdown into the shared cancellation token', async () => {
    const [runtime, binary] = await Promise.all([
      rootFile('crates/platform/src/runtime.rs'),
      rootFile('crates/platform/src/bin/local_api.rs'),
    ]);

    expect(runtime).toContain('SHUTDOWN_CONTROL_MESSAGE');
    expect(runtime).toContain('cancellation.cancel()');
    expect(binary).toContain('tokio::io::stdin()');
    expect(binary).toContain('read_shutdown_control');
    expect(binary).toContain('run_local_api');
    expect(binary).not.toMatch(/std::env::args|Command::new|\/shutdown|route\(/);
  });

  it('keeps runtime and persistence frameworks out of domain and application', async () => {
    const manifests = await Promise.all([
      rootFile('crates/domain/Cargo.toml'),
      rootFile('crates/application/Cargo.toml'),
    ]);

    for (const manifest of manifests) {
      expect(manifest).not.toMatch(
        /\b(axum|tokio|tauri|rusqlite|sqlx|sqlite|postgres|tokio-postgres)\b/i,
      );
    }
  });
});
