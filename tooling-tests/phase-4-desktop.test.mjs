import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const rootDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** @param {string} file */
const readRootFile = (file) => readFile(resolve(rootDirectory, file), 'utf8');

describe('Phase 4 desktop-owned local API lifecycle', () => {
  it('keeps sidecar execution fixed, argument-free, and capability-scoped', async () => {
    const [host, capability] = await Promise.all([
      readRootFile('apps/desktop/src-tauri/src/main.rs'),
      readRootFile('apps/desktop/src-tauri/capabilities/default.json'),
    ]);

    const parsedCapability = JSON.parse(capability);
    expect(parsedCapability.permissions).toEqual([
      'core:default',
      {
        identifier: 'shell:allow-execute',
        allow: [{ name: 'binaries/local_api', sidecar: true, args: false }],
      },
    ]);
    expect(host).toContain('.sidecar("local_api")');
    expect(host).not.toMatch(/\.args\s*\(/);
    expect(host).not.toMatch(/Command::new|std::process::Command|kill_by|port\s*:/);
  });

  it('uses the platform readiness contract and exposes only typed status and retry commands', async () => {
    const host = await readRootFile('apps/desktop/src-tauri/src/main.rs');

    for (const required of [
      'validate_readiness_response',
      'LOCAL_API_ADDRESS',
      'READINESS_TIMEOUT',
      'READINESS_POLL_INTERVAL',
      'SHUTDOWN_CONTROL_MESSAGE',
      'LifecycleStatus',
      'RecoverableFailure',
      'lifecycle_status',
      'retry_lifecycle',
    ]) {
      expect(host).toContain(required);
    }
    expect(host).not.toMatch(/#\[tauri::command\][\s\S]{0,160}(path|port|executable|command)\s*:/i);
  });

  it('regression-tests reuse isolation and continuous owned-child monitoring', async () => {
    const host = await readRootFile('apps/desktop/src-tauri/src/main.rs');

    for (const behaviorTest of [
      'compatible_reuse_has_no_owned_child_or_monitor',
      'owned_child_exit_becomes_recoverable_failure',
      'owned_readiness_loss_becomes_recoverable_failure',
      'retry_probes_again_before_spawning',
      'shutdown_contacts_only_the_owned_child',
    ]) {
      expect(host).toContain(behaviorTest);
    }
  });
});
