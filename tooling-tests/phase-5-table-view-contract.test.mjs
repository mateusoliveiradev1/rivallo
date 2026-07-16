import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const contractPath =
  '.planning/phases/05-design-tokens-icon-policy-and-ui-primitives/05-TABLE-VIEW-ENGINE-CONTRACT.md';

/** @param {string} path */
const readRootFile = (path) => readFile(resolve(repositoryRoot, path), 'utf8');

/** @param {string} source @param {string} area @param {RegExp[]} terms */
function expectTerms(source, area, terms) {
  for (const term of terms) {
    expect(source, `${area} is missing ${String(term)}`).toMatch(term);
  }
}

/** @param {string} roadmap @param {number} number */
function phaseSection(roadmap, number) {
  const match = roadmap.match(
    new RegExp(`^## Phase ${number}:.*?(?=^## Phase ${number + 1}:|^## Approval Record)`, 'msu'),
  );
  expect(match, `Roadmap Phase ${number} section is missing`).not.toBeNull();
  return match?.[0] ?? '';
}

describe('Phase 5 Table View Engine planning contract', () => {
  it('defines complete bounded controlled state without duplicating visual authority', async () => {
    const contract = await readRootFile(contractPath);

    expectTerms(contract, 'canonical visual boundary', [
      /DESIGN\.md.*canonical source of truth/iu,
      /does not duplicate visual tokens, scales, or the component-state matrix/iu,
      /05-UI-SPEC\.md#densetable-contract/iu,
    ]);
    expectTerms(contract, 'controlled state identity', [
      /TableViewState/,
      /`tableId`/,
      /`schemaVersion`/,
      /`viewId`/,
      /`baselineViewId`/,
      /`density`/,
      /`columns\[\]`/,
      /`sort\[\]`/,
      /`filter`/,
      /`grouping\[\]`/,
      /`dataWindow`/,
    ]);
    expectTerms(contract, 'ordered column state', [
      /`columnId`/,
      /`visible`/,
      /finite `width`/iu,
      /`pinning\.side`/,
      /`pinning\.order`/,
      /duplicate or unknown column IDs/iu,
    ]);
    expectTerms(contract, 'controlled boundary', [
      /Commands and Events Are Not Persisted State/,
      /React renders state and emits commands/,
      /never accesses SQLite or `localStorage` directly/iu,
      /does not mutate an external object/iu,
    ]);
  });

  it('covers all customization and general saved-view lifecycle operations', async () => {
    const contract = await readRootFile(contractPath);

    expectTerms(contract, 'column customization', [
      /column chooser supports search/iu,
      /screen-defined groups/iu,
      /reorder, resize, pin, unpin, hide, and show/iu,
      /finite screen-owned bounds/iu,
    ]);
    expectTerms(contract, 'filter, sort, and grouping', [
      /typed filter tree/iu,
      /multi-sort/iu,
      /Grouping clauses are ordered/iu,
    ]);
    expectTerms(contract, 'saved-view lifecycle', [
      /\*\*Create:\*\*/,
      /\*\*Duplicate:\*\*/,
      /\*\*Rename:\*\*/,
      /\*\*Delete:\*\*/,
      /\*\*Set default:\*\*/,
      /\*\*Reset:\*\*/,
      /\*\*Save:\*\*/,
      /`system-default`/,
      /`user-owned`/,
      /`shared-read-only`/,
    ]);
    expectTerms(contract, 'normalized dirty detection', [
      /canonical normalized comparison/iu,
      /canonicalizes unordered filter-group/iu,
      /never object identity or serialized key order/iu,
      /textual dirty indicator/iu,
      /save\/discard\/cancel path/iu,
    ]);
  });

  it('requires versioned migration, validation, quarantine, and safe recovery', async () => {
    const contract = await readRootFile(contractPath);

    expectTerms(contract, 'versioned envelope', [
      /TableViewEnvelope/,
      /`envelopeVersion`/,
      /provenance, owner\/scope metadata, mutability/iu,
      /sequential migration/iu,
      /one version at a time/iu,
    ]);
    expectTerms(contract, 'invalid-state recovery', [
      /quarantined rather than partially applied/iu,
      /falls back to the owning screen's valid system default/iu,
      /explicit non-colour error\/recovery message/iu,
      /Unknown future versions/iu,
    ]);
    expectTerms(contract, 'scope ownership', [
      /Phase 06\.1 owns the first adapter\/repository, versioned persistence location, sequential schema migrations/iu,
      /explicit `local-fixed` owner scope/iu,
      /Phase 9 replaces or migrates the storage implementation/iu,
      /does (?:\*\*)?not(?:\*\*)? promise network sharing in Phase 9/iu,
    ]);
  });

  it('makes keyboard, focus, live announcements, and non-colour cues first-class', async () => {
    const contract = await readRootFile(contractPath);

    expectTerms(contract, 'keyboard equivalents', [
      /Reorder column/,
      /Resize column/,
      /Pin\/unpin/,
      /Sort\/multi-sort/,
      /Filter\/group/,
      /View lifecycle/,
      /Pointer drag is never the only/iu,
    ]);
    expectTerms(contract, 'focus and announcements', [
      /bounded tab stops/iu,
      /Focus remains visible/,
      /focus returns/iu,
      /Live announcement example/,
      /no state depends only on colour/iu,
    ]);
  });

  it('defines explicit data modes, stable rows, selection, and stale-query protection', async () => {
    const contract = await readRootFile(contractPath);

    expectTerms(contract, 'data modes', [
      /`client-virtualization`/,
      /`client-pagination`/,
      /`server-pagination`/,
      /`server-query`/,
      /Capability negotiation/,
    ]);
    expectTerms(contract, 'query and row integrity', [
      /Query serialization is deterministic/,
      /stable query identity/iu,
      /newer request cancels the older request/iu,
      /stale results are ignored/iu,
      /stable `rowId`/iu,
      /current-window, current-query, or explicitly global/iu,
      /Select all.*name its scope/isu,
    ]);
  });

  it('models Mostrar somente gols as a normal configured view', async () => {
    const contract = await readRootFile(contractPath);
    const example = contract.match(
      /^## Configured View Example: Mostrar somente gols.*?(?=^## )/msu,
    )?.[0];

    expect(example, 'configured goals view section is missing').toBeTypeOf('string');
    expectTerms(example ?? '', 'Mostrar somente gols example', [
      /normal `user-owned` saved view/iu,
      /Required player identity columns plus the screen's goals column/iu,
      /Goals descending/iu,
      /Optional typed `goals > 0`/iu,
      /no `goalsOnly` flag/iu,
      /one-off query branch/iu,
    ]);
  });

  it('assigns split 06.1/Phase 9 ownership and preserves the canonical Roadmap and pending Gate 2', async () => {
    const [contract, roadmap] = await Promise.all([
      readRootFile(contractPath),
      readRootFile('.planning/ROADMAP.md'),
    ]);
    const headings = [...roadmap.matchAll(/^## Phase (\d+):/gmu)].map((match) => Number(match[1]));

    expect(headings, 'Roadmap must preserve exactly Phases 1 through 13 in order').toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13,
    ]);
    expect(roadmap, 'Gate 2 must remain Pending').toMatch(/^\| Gate 2 \| Pending\s+\|/mu);
    const phase9 = phaseSection(roadmap, 9);
    expectTerms(phase9, 'Roadmap Phase 9 ownership', [
      /Phase 06\.1 Table View Engine/iu,
      /migrated from `local-fixed` ownership to career identity/iu,
      /SQLite\/cache\/offline boundaries/iu,
      /actual dashboard\/squad data/iu,
      /client virtualization, client pagination, server pagination, or server query/iu,
      /measured data scale/iu,
      /query\/cancellation/iu,
      /cache\/offline/iu,
      /drift, migration, and recovery evidence/iu,
    ]);

    expectTerms(contract, 'responsibility matrix', [
      /Cross-Phase Responsibility and Acceptance Matrix/,
      /Phase 06\.1 — current product owner/,
      /Phase 9 — career integration\/hardening owner/,
      /Assign `tableId`, schema version, stable columns/iu,
      /`local-fixed` versioned persistence, sequential migrations, quarantine and recovery/iu,
      /adapter\/repository\/query and scale evidence/iu,
      /Reverse traceability/,
    ]);
    expectTerms(contract, 'Phase 5 implementation fence', [
      /creates no Table View Engine production code or production types/iu,
      /no storage schema/iu,
      /no adapter or repository/iu,
      /no endpoint/iu,
      /no dashboard, squad/iu,
      /no dependency installation/iu,
      /Gate 2 remains pending explicit human approval/iu,
    ]);
  });
});
