import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

describe('Phase 06.5 world-data foundation', () => {
  it('keeps JSON and SVG text payloads on portable LF checkouts', async () => {
    const attributes = await readFile(resolve(root, '.gitattributes'), 'utf8');
    expect(attributes.split(/\r?\n/u)).toEqual(
      expect.arrayContaining(['*.json text eol=lf', '*.svg text eol=lf']),
    );
  });

  it('keeps the official package checksum synchronized with its exact world payload', async () => {
    const packageRoot = resolve(root, 'data/packages/official.rivallo.foundation');
    const [manifestSource, world] = await Promise.all([
      readFile(resolve(packageRoot, 'manifest.json'), 'utf8'),
      readFile(resolve(packageRoot, 'data/world.json')),
    ]);
    const manifest = JSON.parse(manifestSource);
    expect(manifest.packageId).toBe('official.rivallo.foundation');
    expect(manifest.checksum).toBe(`sha256:${createHash('sha256').update(world).digest('hex')}`);
  });

  it('keeps every bundled asset reference pinned to its exact SHA-256', async () => {
    /** @type {{ assets: Array<{ id: string; path: string; checksum: string }> }} */
    const world = JSON.parse(
      await readFile(
        resolve(root, 'data/packages/official.rivallo.foundation/data/world.json'),
        'utf8',
      ),
    );

    await Promise.all(
      world.assets.map(async (asset) => {
        const bytes = await readFile(resolve(root, 'apps/desktop/src', asset.path));
        expect(asset.checksum, asset.id).toBe(
          `sha256:${createHash('sha256').update(bytes).digest('hex')}`,
        );
      }),
    );
  });

  it('runs the public package isolation guard successfully', () => {
    expect(() =>
      execFileSync(process.execPath, ['scripts/verify-public-data-packages.mjs'], {
        cwd: root,
        stdio: 'pipe',
      }),
    ).not.toThrow();
  });

  it('guards every privateDevelopment manifest without a package-specific allowlist', async () => {
    const guard = await readFile(resolve(root, 'scripts/verify-public-data-packages.mjs'), 'utf8');
    expect(guard).toMatch(/manifest\?\.visibility === 'privateDevelopment'/u);
    expect(guard).not.toMatch(/brasileir|serie-a|forbiddenPackageId/iu);
  });

  it('keeps the public partial-factual fixture synthetic, nullable and evaluation-free', async () => {
    const fixture = JSON.parse(
      await readFile(resolve(root, 'data/fixtures/partial-factual-entities-v2.json'), 'utf8'),
    );
    expect(fixture.schemaVersion).toBe(2);
    expect(fixture.people).toHaveLength(1);
    /** @type {Array<{ kind: string }>} */
    const roles = fixture.people[0].roles;
    expect(roles.map((role) => role.kind)).toEqual(['player', 'coach', 'staffMember']);
    expect(fixture.people[0]).toEqual(
      expect.objectContaining({
        birthDate: null,
        heightCm: null,
        weightKg: null,
        preferredFoot: null,
        detailedPosition: null,
      }),
    );
    expect(fixture.people[0].readiness).toEqual(
      expect.objectContaining({
        runtimeProfile: 'runtimeProfileBlocked',
        evaluation: 'awaitingEvaluation',
        gameplay: 'gameplayBlocked',
      }),
    );
    expect(JSON.stringify(fixture)).not.toMatch(/\b(?:rating|overall|potential|attributes)\b/iu);
    expect(fixture.registrations[0]).toEqual(
      expect.objectContaining({
        registrationId: 'synthetic.registration.fixture',
        playerId: 'synthetic.player.fixture',
        eligible: false,
      }),
    );
    expect(Object.keys(fixture.registrations[0]).sort()).toEqual(
      [
        'registrationId',
        'playerId',
        'clubId',
        'shirtNumber',
        'contractReference',
        'eligible',
      ].sort(),
    );
  });

  it('aligns v2 factual optionality, enums and ranges with the Rust contract', async () => {
    const schema = JSON.parse(
      await readFile(resolve(root, 'data/schemas/world-package.schema.json'), 'utf8'),
    );
    expect(schema.properties.schemaVersion.enum).toEqual([1, 2]);
    expect(schema.$defs.person.required).toEqual([
      'personId',
      'fullName',
      'roles',
      'provenance',
      'readiness',
    ]);
    expect(schema.$defs.personRole.required).toEqual(['roleId', 'kind']);
    expect(schema.$defs.factualContract.required).toEqual(['clubId']);
    expect(schema.$defs.factualProvenance.required).toEqual(['source', 'verificationStatus']);
    expect(schema.$defs.playerRegistration.required).toEqual(['playerId', 'clubId']);
    expect(schema.$defs.person.properties.preferredFoot.enum).toEqual([
      'left',
      'right',
      'both',
      null,
    ]);
    expect(schema.$defs.person.properties.shirtNumber).toEqual(
      expect.objectContaining({ minimum: 1, maximum: 255 }),
    );
    expect(schema.$defs.stableId.pattern).toContain('(?!.*\\.\\.)');
  });
});
