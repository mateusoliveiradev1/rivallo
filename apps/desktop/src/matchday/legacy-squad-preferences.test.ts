import { describe, expect, it } from 'vitest';

import { SQUAD_SYSTEM_VIEW, SQUAD_TABLE_SCHEMA } from './squad-table-schema.js';
import {
  readLegacySquadTablePreferences,
  retireConfirmedLegacyTablePreferences,
  type LegacyPreferenceStorage,
} from './legacy-squad-preferences.js';

class MemoryStorage implements LegacyPreferenceStorage {
  readonly reads: string[] = [];
  readonly removals: string[] = [];
  readonly writes: Array<readonly [string, string]> = [];
  readonly values = new Map<string, string>();

  constructor(entries: Readonly<Record<string, string>> = {}) {
    for (const [key, value] of Object.entries(entries)) {
      this.values.set(key, value);
    }
  }

  getItem(key: string): string | null {
    this.reads.push(key);
    return this.values.get(key) ?? null;
  }

  removeItem(key: string): void {
    this.removals.push(key);
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.writes.push([key, value]);
    this.values.set(key, value);
  }
}

const encoded = (value: unknown): string => JSON.stringify(value);

const readReady = (storage: LegacyPreferenceStorage) => {
  const result = readLegacySquadTablePreferences(storage);
  expect(result.status).toBe('ready');
  if (result.status !== 'ready') {
    throw new Error(`Expected ready legacy fixture, received ${result.status}`);
  }
  return result;
};

const visibleIds = (result: ReturnType<typeof readReady>): readonly string[] =>
  result.request.state.columns.filter(({ visible }) => visible).map(({ columnId }) => columnId);

const columnIds = (result: ReturnType<typeof readReady>): readonly string[] =>
  result.request.state.columns.map(({ columnId }) => columnId);

const confirmedReceipt = (result: ReturnType<typeof readReady>) => ({
  sourceVersion: result.request.sourceVersion,
  sourceFingerprint: result.request.sourceFingerprint,
  tableId: 'squad.primary' as const,
  schemaVersion: 1 as const,
  ownerScope: 'local-fixed' as const,
  importedViewId: result.request.state.viewId,
  acceptedRevision: 1,
});

describe('readLegacySquadTablePreferences', () => {
  it.each([
    {
      version: 2,
      density: 'standard',
      visibleColumns: ['condition', 'age'],
    },
    {
      version: 3,
      density: 'comfortable',
      visibleColumns: ['goals', 'age'],
    },
    {
      version: 4,
      density: 'compact',
      visibleColumns: ['assists', 'goals'],
    },
  ] as const)(
    'decodes v$version density and recognized column order into one import request',
    ({ version, density, visibleColumns }) => {
      const storage = new MemoryStorage({
        [`rivallo.squad-ui.v${version}`]: encoded({
          density,
          visibleColumns,
        }),
      });

      const result = readReady(storage);

      expect(result.request.sourceVersion).toBe(version);
      expect(result.request.sourceFingerprint).toMatch(/^fnv1a32:[0-9a-f]{8}$/u);
      expect(result.request.state).toMatchObject({
        tableId: 'squad.primary',
        schemaVersion: 1,
        ownerScope: 'local-fixed',
        baselineViewId: 'squad.view.system-default',
        provenance: 'user-owned',
        density,
      });
      expect(columnIds(result).slice(0, 4)).toEqual(['shirtNumber', 'info', 'name', 'position']);
      expect(columnIds(result).filter((columnId) => columnId === visibleColumns[0])).toHaveLength(
        1,
      );
      expect(
        columnIds(result).indexOf(visibleColumns[0]!) <
          columnIds(result).indexOf(visibleColumns[1]!),
      ).toBe(true);
      expect(storage.writes).toEqual([]);
      expect(storage.removals).toEqual([]);
    },
  );

  it('selects only the newest present supported payload', () => {
    const storage = new MemoryStorage({
      'rivallo.squad-ui.v2': encoded({
        density: 'compact',
        visibleColumns: ['age'],
      }),
      'rivallo.squad-ui.v3': encoded({
        density: 'standard',
        visibleColumns: ['goals'],
      }),
      'rivallo.squad-ui.v4': encoded({
        density: 'comfortable',
        visibleColumns: ['assists'],
      }),
    });

    const result = readReady(storage);

    expect(result.request.sourceVersion).toBe(4);
    expect(result.request.state.density).toBe('comfortable');
    expect(visibleIds(result)).toEqual(['shirtNumber', 'info', 'name', 'position', 'assists']);
  });

  it('materializes averageRating once at its owning-schema default for a pre-column v3 payload', () => {
    const storage = new MemoryStorage({
      'rivallo.squad-ui.v3': encoded({
        density: 'standard',
        visibleColumns: ['goals', 'age'],
      }),
    });

    const result = readReady(storage);
    const averageRating = result.request.state.columns.filter(
      ({ columnId }) => columnId === 'averageRating',
    );
    const schemaDefault = SQUAD_TABLE_SCHEMA.columns.find(
      ({ columnId }) => columnId === 'averageRating',
    );

    expect(averageRating).toEqual([
      {
        columnId: 'averageRating',
        visible: schemaDefault?.defaultVisible,
        width: schemaDefault?.width.default,
        pinning: schemaDefault?.defaultPinning,
      },
    ]);
    expect(columnIds(result).indexOf('goals')).toBeLessThan(columnIds(result).indexOf('age'));
  });

  it('keeps an intentional empty v4 optional-column selection valid', () => {
    const storage = new MemoryStorage({
      'rivallo.squad-ui.v4': encoded({
        density: 'standard',
        visibleColumns: [],
      }),
    });

    const result = readReady(storage);

    expect(visibleIds(result)).toEqual(['shirtNumber', 'info', 'name', 'position']);
  });

  it('drops explicit removed and unknown columns only when recognized intent remains', () => {
    const storage = new MemoryStorage({
      'rivallo.squad-ui.v3': encoded({
        density: 'standard',
        visibleColumns: ['goals', 'removedColumn', 'importance', 'futureMetric'],
      }),
    });

    const result = readReady(storage);

    expect(columnIds(result)).not.toContain('removedColumn');
    expect(columnIds(result)).not.toContain('importance');
    expect(columnIds(result)).not.toContain('futureMetric');
    expect(visibleIds(result)).toContain('goals');
  });

  it.each([
    {
      name: 'corrupt JSON',
      raw: '{"density":',
      reason: 'corrupt',
    },
    {
      name: 'unknown-only columns',
      raw: encoded({
        density: 'standard',
        visibleColumns: ['removedColumn', 'futureMetric'],
      }),
      reason: 'unknown-only',
    },
    {
      name: 'invalid density',
      raw: encoded({
        density: 'cinematic',
        visibleColumns: ['age'],
      }),
      reason: 'invalid-density',
    },
    {
      name: 'unbounded column array',
      raw: encoded({
        density: 'compact',
        visibleColumns: Array.from({ length: 65 }, (_, index) => `column${index}`),
      }),
      reason: 'unbounded',
    },
  ])('returns a typed invalid fallback for $name without mutation', ({ raw, reason }) => {
    const storage = new MemoryStorage({ 'rivallo.squad-ui.v3': raw });

    const result = readLegacySquadTablePreferences(storage);

    expect(result).toMatchObject({
      status: 'invalid',
      sourceVersion: 3,
      reason,
      fallback: SQUAD_SYSTEM_VIEW,
    });
    expect(result.status === 'invalid' && result.sourceFingerprint).toMatch(
      /^fnv1a32:[0-9a-f]{8}$/u,
    );
    expect(storage.values.get('rivallo.squad-ui.v3')).toBe(raw);
    expect(storage.writes).toEqual([]);
    expect(storage.removals).toEqual([]);
  });

  it('rejects an oversized raw payload before JSON parsing', () => {
    const raw = `"${'x'.repeat(65 * 1024)}"`;
    const storage = new MemoryStorage({ 'rivallo.squad-ui.v4': raw });

    expect(readLegacySquadTablePreferences(storage)).toMatchObject({
      status: 'invalid',
      sourceVersion: 4,
      reason: 'unbounded',
    });
    expect(storage.values.get('rivallo.squad-ui.v4')).toBe(raw);
  });

  it('returns the same request across StrictMode-style duplicate reads with no side effects', () => {
    const storage = new MemoryStorage({
      'rivallo.squad-ui.v3': encoded({
        density: 'standard',
        visibleColumns: ['goals', 'age'],
      }),
    });

    const first = readLegacySquadTablePreferences(storage);
    const second = readLegacySquadTablePreferences(storage);

    expect(second).toEqual(first);
    expect(storage.writes).toEqual([]);
    expect(storage.removals).toEqual([]);
  });
});

describe('retireConfirmedLegacyTablePreferences', () => {
  it('does nothing for a mismatched receipt or failed import outcome', () => {
    const raw = encoded({
      density: 'standard',
      visibleColumns: ['goals'],
      sidebarCollapsed: true,
    });
    const storage = new MemoryStorage({ 'rivallo.squad-ui.v3': raw });
    const result = readReady(storage);

    expect(
      retireConfirmedLegacyTablePreferences(storage, result, {
        ...confirmedReceipt(result),
        sourceFingerprint: 'fnv1a32:00000000',
      }),
    ).toBe(false);
    expect(retireConfirmedLegacyTablePreferences(storage, result, null)).toBe(false);
    expect(storage.values.get('rivallo.squad-ui.v3')).toBe(raw);
    expect(storage.writes).toEqual([]);
    expect(storage.removals).toEqual([]);
  });

  it('moves mixed v2/v3 non-table preferences into v4 only after exact receipt', () => {
    const storage = new MemoryStorage({
      'rivallo.squad-ui.v2': encoded({
        density: 'compact',
        visibleColumns: ['age'],
        stale: true,
      }),
      'rivallo.squad-ui.v3': encoded({
        density: 'standard',
        visibleColumns: ['goals'],
        sidebarCollapsed: true,
        activeScreen: 'tactics',
        workspaceView: 'split',
        showPlayerDetails: false,
        pitchMode: 'condition',
        tableShare: 61,
      }),
    });
    const result = readReady(storage);

    expect(retireConfirmedLegacyTablePreferences(storage, result, confirmedReceipt(result))).toBe(
      true,
    );

    expect(storage.values.has('rivallo.squad-ui.v2')).toBe(false);
    expect(storage.values.has('rivallo.squad-ui.v3')).toBe(false);
    expect(JSON.parse(storage.values.get('rivallo.squad-ui.v4') ?? '{}')).toEqual({
      sidebarCollapsed: true,
      activeScreen: 'tactics',
      workspaceView: 'split',
      showPlayerDetails: false,
      pitchMode: 'condition',
      tableShare: 61,
    });
  });

  it('rewrites v4 without table fields and preserves every non-table field', () => {
    const storage = new MemoryStorage({
      'rivallo.squad-ui.v4': encoded({
        density: 'comfortable',
        visibleColumns: ['age', 'goals'],
        sidebarCollapsed: false,
        activeScreen: 'squad',
        showPlayerDetails: true,
        pitchMode: 'familiarity',
        futureNonTablePreference: { enabled: true },
      }),
    });
    const result = readReady(storage);

    expect(retireConfirmedLegacyTablePreferences(storage, result, confirmedReceipt(result))).toBe(
      true,
    );

    expect(JSON.parse(storage.values.get('rivallo.squad-ui.v4') ?? '{}')).toEqual({
      sidebarCollapsed: false,
      activeScreen: 'squad',
      showPlayerDetails: true,
      pitchMode: 'familiarity',
      futureNonTablePreference: { enabled: true },
    });
  });
});
