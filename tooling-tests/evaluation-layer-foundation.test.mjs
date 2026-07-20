import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

describe('versioned evaluation methodology foundation', () => {
  it('publishes a separate layer schema keyed by entity ID and methodology version', async () => {
    const schema = JSON.parse(
      await readFile(resolve(root, 'data/schemas/evaluation-layer.schema.json'), 'utf8'),
    );
    expect(schema.properties.manifest.required).toEqual(
      expect.arrayContaining([
        'packageId',
        'version',
        'methodologyId',
        'methodologyVersion',
        'targetBaseFingerprint',
        'checksum',
      ]),
    );
    expect(schema.properties.entityAssessments.items.required).toEqual(
      expect.arrayContaining(['evaluationId', 'entityId', 'status', 'overallConfidence']),
    );
    expect(schema.properties.entityAssessments.items.properties).not.toHaveProperty('name');
    expect(schema.properties.entityAssessments.items.properties).not.toHaveProperty('club');
    expect(schema.properties.entityAssessments.items.properties.status.enum).toEqual([
      'notEvaluated',
      'draft',
      'insufficientEvidence',
      'inReview',
      'approved',
      'rejected',
      'stale',
      'superseded',
    ]);
  });

  it('keeps the public calibration package synthetic and conceptually separated', async () => {
    /** @type {{ syntheticOnly: boolean, samples: Array<{ group: string }>, invariants: string[] }} */
    const fixture = JSON.parse(
      await readFile(resolve(root, 'data/evaluations/synthetic-calibration-v1.json'), 'utf8'),
    );
    const source = JSON.stringify(fixture);
    expect(fixture.syntheticOnly).toBe(true);
    expect(fixture.samples).toHaveLength(8);
    expect(fixture.samples.map((sample) => sample.group)).toEqual(
      expect.arrayContaining(['outfield', 'goalkeeper', 'coach', 'staff']),
    );
    expect(fixture.invariants).toEqual(
      expect.arrayContaining([
        'conditionDoesNotChangeAbility',
        'formDoesNotChangeAttribute',
        'familiarityDoesNotChangePotential',
        'confidenceDoesNotChangeQuality',
      ]),
    );
    expect(source).not.toMatch(/brasileir|flamengo|palmeiras|corinthians|são paulo/iu);
  });

  it('preserves the Phase 06.4 weights and prohibits implicit range midpoints', async () => {
    const domain = await readFile(resolve(root, 'crates/domain/src/evaluations.rs'), 'utf8');
    expect(domain).toContain('("player.contextual", "context.position", 50)');
    expect(domain).toContain('("player.contextual", "context.role", 20)');
    expect(domain).toContain('("player.contextual", "context.tacticalFit", 20)');
    expect(domain).toContain('("player.contextual", "context.familiarity", 10)');
    expect(domain).toContain('midpoint implícito é proibido');
    expect(domain).toContain('Somente avaliação aprovada pode alimentar ratings runtime');
  });

  it('keeps factual editing outside the evaluation workbench', async () => {
    const workbench = await readFile(
      resolve(root, 'apps/desktop/src/data-editor/EvaluationWorkbench.tsx'),
      'utf8',
    );
    expect(workbench).toContain('Somente leitura. Avaliações nunca sobrescrevem estes campos.');
    expect(workbench).toContain('Abrir entidade factual');
    expect(workbench).toContain('Nenhuma avaliação foi aprovada automaticamente');
    expect(workbench).not.toMatch(/definir o mesmo OVR|bulk.*OVR/iu);
  });
});
