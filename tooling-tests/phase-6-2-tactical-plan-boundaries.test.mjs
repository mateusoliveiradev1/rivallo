import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
/** @param {string} path */
const read = (path) => readFile(resolve(root, path), 'utf8');

describe('Phase 06.2 tactical-plan boundaries', () => {
  it('keeps normalized spatial authority free of persisted pixels', async () => {
    const [types, model, domain] = await Promise.all([
      read('apps/desktop/src/matchday/types.ts'),
      read('apps/desktop/src/matchday/tactics-model.ts'),
      read('crates/domain/src/matchday.rs'),
    ]);

    expect(types).toMatch(/normalizedX: number/);
    expect(types).toMatch(/normalizedY: number/);
    expect(model).toMatch(/normalizedX < 0[\s\S]*normalizedX > 1/);
    expect(domain).toMatch(/normalized_x: f64/);
    expect(domain).toMatch(/normalized_y: f64/);
    expect(`${types}\n${model}\n${domain}`).not.toMatch(
      /(?:pixelX|pixelY|positionPx|windowWidth)/u,
    );
  });

  it('uses one draft and one drag session for field and bench', async () => {
    const workspace = await read('apps/desktop/src/matchday/TacticsWorkspace.tsx');

    expect(workspace.match(/useState<DragSession \| null>/gu)).toHaveLength(1);
    expect(workspace).toMatch(/draft\.placements\.map/);
    expect(workspace).toMatch(/draft\.bench\.map/);
    expect(workspace.match(/const beginDrag =/gu)).toHaveLength(1);
    expect(workspace.match(/const dropOnPlayer =/gu)).toHaveLength(1);
  });

  it('submits field and bench atomically through the Rust-owned command', async () => {
    const [client, model, command] = await Promise.all([
      read('apps/desktop/src/matchday/client.ts'),
      read('apps/desktop/src/matchday/tactics-model.ts'),
      read('apps/desktop/src-tauri/src/main.rs'),
    ]);

    expect(client).toMatch(/invoke<TacticalPlanUpdate>\('update_tactical_plan', \{ proposal \}\)/);
    expect(model).toMatch(/placements: draft\.placements/);
    expect(model).toMatch(/bench: draft\.bench/);
    expect(command).toMatch(/fn update_tactical_plan\([\s\S]*TacticalPlanProposal/);
    expect(`${client}\n${model}`).not.toMatch(/localStorage/);
  });

  it('adds no drag or animation package dependency', async () => {
    const packageManifest = await read('package.json');

    expect(packageManifest).not.toMatch(/@dnd-kit|react-dnd|framer-motion|motion\/react/iu);
  });
});
