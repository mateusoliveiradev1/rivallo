import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
/** @param {string} path */
const read = (path) => readFile(resolve(root, path), 'utf8');

describe('Phase 06.3 tactical-model boundaries', () => {
  it('keeps sporting calculations and match snapshots in Rust', async () => {
    const [domain, workspace] = await Promise.all([
      read('crates/domain/src/tactics.rs'),
      read('apps/desktop/src/matchday/TacticsWorkspace.tsx'),
    ]);

    expect(domain).toMatch(/pub fn resolve_tactical_model/);
    expect(domain).toMatch(/pub struct TacticalMatchSnapshot/);
    expect(domain).toMatch(/fn familiarity\(/);
    expect(domain).toMatch(/fn spatial_analysis\(/);
    expect(workspace).toMatch(/model\.diagnostic\.readiness/);
    expect(workspace).toMatch(/model\.familiarity\.overall/);
    expect(workspace).not.toMatch(/formationFit \*|readiness = Math|TEAM_INSTRUCTIONS_KEY/u);
  });

  it('uses one versioned variation aggregate for geometry and semantics', async () => {
    const [domain, types] = await Promise.all([
      read('crates/domain/src/matchday.rs'),
      read('apps/desktop/src/matchday/types.ts'),
    ]);

    expect(domain).toMatch(/pub tactical_model: Option<TacticalModelSnapshot>/);
    expect(domain).toMatch(/pub tactical_config: TacticalModelConfig/);
    expect(types).toMatch(/readonly tacticalModel\?: TacticalModelSnapshot/);
    expect(`${domain}\n${types}`).not.toMatch(/semanticVariation|tacticalStarters|tacticalBench/u);
  });

  it('keeps semantic preview out of the pointermove hot path', async () => {
    const workspace = await read('apps/desktop/src/matchday/TacticsWorkspace.tsx');
    const pointerMove = workspace.slice(
      workspace.indexOf('const handlePointerMove'),
      workspace.indexOf('const handlePointerUp'),
    );

    expect(workspace).toMatch(/previewTacticalPlan/);
    expect(pointerMove).not.toMatch(
      /previewTacticalPlan|applyTacticalConfig|setState|onDraftChange/u,
    );
    expect(workspace).toMatch(/persistenceCalls: number/);
    expect(workspace).toMatch(/readinessCalculations: number/);
  });

  it('removes local instruction persistence and exposes all four integrated tools', async () => {
    const workspace = await read('apps/desktop/src/matchday/TacticsWorkspace.tsx');

    expect(workspace).toMatch(/'analysis'.*'Análise'/u);
    expect(workspace).toMatch(/'tactics'.*'Estratégia'/u);
    expect(workspace).toMatch(/'instructions'.*'Instruções'/u);
    expect(workspace).toMatch(/'opposition'.*'Oposição'/u);
    expect(workspace).not.toMatch(/team-instructions|setItem\([^)]*instruction/iu);
  });
});
