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

describe('Phase 4 operational lifecycle shell', () => {
  it('renders typed initializing, ready, and recoverable failure states', async () => {
    const [app, feedback] = await Promise.all([
      readRootFile('apps/desktop/src/App.tsx'),
      readRootFile('apps/desktop/src/ui/primitives/feedback.tsx'),
    ]);

    for (const required of [
      "state: 'initializing'",
      "state: 'ready'",
      "state: 'recoverableFailure'",
      'Local service ready',
      'Retry startup',
      'role="status"',
      'variant="loading"',
      'variant="positive"',
      'variant="danger"',
    ]) {
      expect(app).toContain(required);
    }
    expect(feedback).toContain("role={assertive ? 'alert' : 'status'}");
    expect(app).toContain("invoke<LifecycleStatus>('lifecycle_status')");
    expect(app).toContain("invoke<LifecycleStatus>('retry_lifecycle')");
  });

  it('keeps copyable technical detail in a development-only disclosure', async () => {
    const app = await readRootFile('apps/desktop/src/App.tsx');

    expect(app).toContain('import.meta.env.DEV');
    expect(app).toContain('<details');
    expect(app).toContain('Development diagnostics');
    expect(app).toContain('navigator.clipboard.writeText');
    expect(app).not.toMatch(/stdout|stderr|process logs|raw logs/i);
  });

  it('keeps the shell free of persistence and direct shell authority', async () => {
    const [entry, app, styles, generatedTokens, primitives] = await Promise.all([
      readRootFile('apps/desktop/src/main.tsx'),
      readRootFile('apps/desktop/src/App.tsx'),
      readRootFile('apps/desktop/src/styles.css'),
      readRootFile('packages/design-tokens/src/generated.css'),
      readRootFile('apps/desktop/src/ui/primitives/primitives.css'),
    ]);
    const shell = `${entry}\n${app}`;
    const styleBoundary = `${styles}\n${generatedTokens}\n${primitives}`;

    expect(entry).toContain(": import('./App.js')");
    expect(entry).toContain('surfaceModule.App');
    expect(entry).toContain('<Surface />');
    expect(shell).toContain("from '@tauri-apps/api/core'");
    expect(shell).not.toMatch(
      /tauri-plugin-shell|@tauri-apps\/plugin-shell|Command\.|sqlite|database/i,
    );
    expect(styles).toContain("@import '@rivallo/design-tokens/generated.css'");
    expect(styles).toContain("@import './ui/primitives/primitives.css'");
    expect(styleBoundary).toContain('@media (prefers-reduced-motion: reduce)');
  });
});
