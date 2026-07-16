import { expect, test, type Page } from '@playwright/test';

import type { TableViewRepositoryState } from '../apps/desktop/src/matchday/client.js';
import { SQUAD_SYSTEM_VIEW } from '../apps/desktop/src/matchday/squad-table-schema.js';
import type { MatchdayState, Player } from '../apps/desktop/src/matchday/types.js';
import {
  requiredContrastRatio,
  sampleComputedContrast,
  type ComputedContrastSample,
  type ContrastForeground,
} from './helpers/wcag-contrast.js';

const developmentUrl = 'http://127.0.0.1:4173/';
const bridgeStateKey = 'rivallo.browser-test.matchday-state';
const tableViewBridgeStateKey = 'rivallo.browser-test.table-view-state';
const tableViewBridgeControlKey = 'rivallo.browser-test.table-view-control';
const browserErrorsByPage = new WeakMap<Page, string[]>();

test.beforeEach(({ page }) => {
  const browserErrors: string[] = [];
  browserErrorsByPage.set(page, browserErrors);
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => browserErrors.push(`page: ${error.message}`));
});

test.afterEach(({ page }) => {
  expect(browserErrorsByPage.get(page) ?? []).toEqual([]);
});

const screenshotViewports = [
  { width: 1024, height: 768 },
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
  { width: 2560, height: 1080 },
] as const;

const wcagStateInventory = [
  'default',
  'hover',
  'focus-visible',
  'active',
  'selected',
  'disabled',
  'loading',
  'empty',
  'invalid',
  'unavailable',
  'migrated',
  'recovered',
  'future-schema',
  'dirty',
  'save-failure',
] as const;

type WcagTableViewState = (typeof wcagStateInventory)[number];

interface TableViewContrastRequirement {
  readonly applicability?: 'inactive-control-exception' | 'required';
  readonly foreground?: ContrastForeground;
  readonly id: string;
  readonly kind: ComputedContrastSample['kind'];
  readonly label: string;
  readonly state: WcagTableViewState;
}

const tableViewContrastMatrix = [
  {
    id: 'default.table-row.text',
    state: 'default',
    kind: 'text',
    label: 'default player row text',
  },
  {
    id: 'default.saved-view-trigger.boundary',
    state: 'default',
    kind: 'control',
    label: 'default saved-view selector boundary',
  },
  {
    id: 'default.customizer-trigger.boundary',
    state: 'default',
    kind: 'control',
    label: 'default customizer selector boundary',
  },
  {
    id: 'default.live-header.inactive-sort-text',
    state: 'default',
    kind: 'text',
    label: 'inactive live-header sort control',
  },
  {
    id: 'default.live-header.move-action-boundary',
    state: 'default',
    kind: 'control',
    label: 'live-header move action boundary',
  },
  {
    id: 'default.live-header.resize-handle',
    state: 'default',
    kind: 'control',
    foreground: 'color',
    label: 'live-header resize handle',
  },
  {
    id: 'default.saved-view-menu.provenance-text',
    state: 'default',
    kind: 'text',
    label: 'saved-view provenance label',
  },
  {
    id: 'default.saved-view-menu.default-text',
    state: 'default',
    kind: 'text',
    label: 'saved-view default label',
  },
  {
    id: 'default.saved-view-menu.empty-explanation-text',
    state: 'default',
    kind: 'text',
    label: 'saved-view empty-state explanation',
  },
  {
    id: 'default.saved-view-menu.duplicate-action-boundary',
    state: 'default',
    kind: 'control',
    label: 'saved-view duplicate action boundary',
  },
  {
    id: 'default.saved-view-menu.create-first-action-boundary',
    state: 'default',
    kind: 'control',
    label: 'saved-view first-create action boundary',
  },
  {
    id: 'default.customizer.field-label-text',
    state: 'default',
    kind: 'text',
    label: 'customizer search field label',
  },
  {
    id: 'default.customizer.field-boundary',
    state: 'default',
    kind: 'control',
    label: 'customizer search field boundary',
  },
  {
    id: 'default.customizer.column-title-text',
    state: 'default',
    kind: 'text',
    label: 'customizer column title',
  },
  {
    id: 'default.customizer.column-width-text',
    state: 'default',
    kind: 'text',
    label: 'customizer column width',
  },
  {
    id: 'default.customizer.column-explanation-text',
    state: 'default',
    kind: 'text',
    label: 'customizer required-column explanation',
  },
  {
    id: 'default.customizer.move-action-boundary',
    state: 'default',
    kind: 'control',
    label: 'customizer move action boundary',
  },
  {
    id: 'default.customizer.resize-handle',
    state: 'default',
    kind: 'control',
    foreground: 'color',
    label: 'customizer resize handle',
  },
  {
    id: 'default.customizer.pin-action-boundary',
    state: 'default',
    kind: 'control',
    label: 'customizer pin action boundary',
  },
  {
    id: 'default.customizer.reset-columns-action-boundary',
    state: 'default',
    kind: 'control',
    label: 'customizer reset-columns action boundary',
  },
  {
    id: 'default.customizer.reset-view-action-boundary',
    state: 'default',
    kind: 'control',
    label: 'customizer reset-view action boundary',
  },
  {
    id: 'default.customizer.discard-action-boundary',
    state: 'default',
    kind: 'control',
    label: 'customizer discard action boundary',
  },
  {
    id: 'hover.saved-view-trigger.boundary',
    state: 'hover',
    kind: 'control',
    label: 'hover selector boundary',
  },
  {
    id: 'hover.customizer-trigger.boundary',
    state: 'hover',
    kind: 'control',
    label: 'hover customizer selector boundary',
  },
  {
    id: 'focus-visible.saved-view-trigger.ring',
    state: 'focus-visible',
    kind: 'focus',
    label: 'focus-visible selector ring',
  },
  {
    id: 'focus-visible.customizer-search.ring',
    state: 'focus-visible',
    kind: 'focus',
    label: 'focus-visible customizer search ring',
  },
  {
    id: 'active.live-header.sort-text',
    state: 'active',
    kind: 'text',
    label: 'active live header sort control',
  },
  {
    id: 'active.saved-view-menu.option-text',
    state: 'active',
    kind: 'text',
    label: 'active saved-view menu row',
  },
  {
    id: 'active.customizer.move-action-boundary',
    state: 'active',
    kind: 'control',
    label: 'active customizer move action boundary',
  },
  {
    id: 'selected.customizer.visibility-boundary',
    state: 'selected',
    kind: 'control',
    label: 'selected visibility control',
  },
  {
    id: 'disabled.saved-view-menu.default-action-boundary',
    state: 'disabled',
    kind: 'control',
    applicability: 'inactive-control-exception',
    label: 'disabled default action boundary',
  },
  {
    id: 'disabled.customizer.save-action-boundary',
    state: 'disabled',
    kind: 'control',
    applicability: 'inactive-control-exception',
    label: 'disabled customizer save action boundary',
  },
  {
    id: 'loading.repository-state.text',
    state: 'loading',
    kind: 'text',
    label: 'loading product state',
  },
  {
    id: 'empty.customizer-state.text',
    state: 'empty',
    kind: 'text',
    label: 'empty customizer state',
  },
  {
    id: 'invalid.repository-state.text',
    state: 'invalid',
    kind: 'text',
    label: 'invalid product state',
  },
  {
    id: 'unavailable.repository-state.text',
    state: 'unavailable',
    kind: 'text',
    label: 'unavailable product state',
  },
  {
    id: 'migrated.repository-state.text',
    state: 'migrated',
    kind: 'text',
    label: 'migrated product state',
  },
  {
    id: 'recovered.repository-state.text',
    state: 'recovered',
    kind: 'text',
    label: 'recovered product state',
  },
  {
    id: 'future-schema.repository-state.text',
    state: 'future-schema',
    kind: 'text',
    label: 'future-schema product state',
  },
  {
    id: 'dirty.customizer-state.text',
    state: 'dirty',
    kind: 'text',
    label: 'dirty state label',
  },
  {
    id: 'dirty.saved-view-menu.readonly-explanation-text',
    state: 'dirty',
    kind: 'text',
    label: 'dirty immutable-view explanation',
  },
  {
    id: 'dirty.saved-view-menu.duplicate-to-edit-action-boundary',
    state: 'dirty',
    kind: 'control',
    label: 'dirty immutable-view duplicate action boundary',
  },
  {
    id: 'dirty.customizer.save-action-boundary',
    state: 'dirty',
    kind: 'control',
    label: 'dirty customizer save action boundary',
  },
  {
    id: 'default.saved-view-menu.rename-action-boundary',
    state: 'default',
    kind: 'control',
    label: 'saved-view rename action boundary',
  },
  {
    id: 'default.saved-view-menu.delete-action-text',
    state: 'default',
    kind: 'text',
    label: 'saved-view destructive action text',
  },
  {
    id: 'default.saved-view-menu.delete-action-boundary',
    state: 'default',
    kind: 'control',
    label: 'saved-view destructive action boundary',
  },
  {
    id: 'default.saved-view-menu.set-default-action-boundary',
    state: 'default',
    kind: 'control',
    label: 'saved-view set-default action boundary',
  },
  {
    id: 'disabled.saved-view-menu.reset-action-boundary',
    state: 'disabled',
    kind: 'control',
    applicability: 'inactive-control-exception',
    label: 'disabled saved-view reset action boundary',
  },
  {
    id: 'disabled.saved-view-menu.save-action-boundary',
    state: 'disabled',
    kind: 'control',
    applicability: 'inactive-control-exception',
    label: 'disabled saved-view save action boundary',
  },
  {
    id: 'default.saved-view-menu.create-action-boundary',
    state: 'default',
    kind: 'control',
    label: 'saved-view create action boundary',
  },
  {
    id: 'save-failure.dialog-heading.text',
    state: 'save-failure',
    kind: 'text',
    label: 'save-failure destructive text',
  },
  {
    id: 'save-failure.retry-action.boundary',
    state: 'save-failure',
    kind: 'control',
    label: 'save-failure destructive boundary',
  },
] as const satisfies readonly TableViewContrastRequirement[];

type TableViewContrastRequirementId = (typeof tableViewContrastMatrix)[number]['id'];

interface EmittedTableViewContrastSample extends ComputedContrastSample {
  readonly id: TableViewContrastRequirementId;
  readonly state: WcagTableViewState;
  readonly threshold: number | null;
}

const tableViewSeed: TableViewRepositoryState = {
  metadata: { envelopeVersion: 1, revision: 0 },
  tableId: 'squad.primary',
  schemaVersion: 1,
  ownerScope: 'local-fixed',
  activeViewId: SQUAD_SYSTEM_VIEW.viewId,
  defaultViewId: SQUAD_SYSTEM_VIEW.viewId,
  views: [{ mutability: 'immutable', state: structuredClone(SQUAD_SYSTEM_VIEW) }],
  legacyImportReceipts: [],
};

const readTableViewRepository = async (page: Page): Promise<TableViewRepositoryState> =>
  page.evaluate((storageKey) => {
    const persisted = window.localStorage.getItem(storageKey);
    if (persisted === null) throw new Error('The browser table-view repository was not seeded.');
    return JSON.parse(persisted) as TableViewRepositoryState;
  }, tableViewBridgeStateKey);

const writeTableViewRepository = async (
  page: Page,
  repository: TableViewRepositoryState,
): Promise<void> => {
  await page.evaluate(
    ({ storageKey, state }) => window.localStorage.setItem(storageKey, JSON.stringify(state)),
    { storageKey: tableViewBridgeStateKey, state: repository },
  );
};

const setTableViewBridgeControl = async (
  page: Page,
  control: Readonly<Record<string, unknown>>,
): Promise<void> => {
  await page.evaluate(
    ({ storageKey, value }) => window.localStorage.setItem(storageKey, JSON.stringify(value)),
    { storageKey: tableViewBridgeControlKey, value: control },
  );
};

const openSavedViewSelector = async (page: Page) => {
  const trigger = page.getByRole('button', { name: /Visualização da tabela:/u });
  await expect(trigger).toBeEnabled();
  await trigger.click();
  const selector = page.getByRole('dialog', { name: 'Visualização da tabela' });
  await expect(selector).toBeVisible();
  return selector;
};

const createSavedView = async (page: Page, name: string): Promise<void> => {
  const selector = await openSavedViewSelector(page);
  const create = selector.getByRole('button', {
    name: /Criar (?:primeira )?visualização/u,
  });
  await create.click();
  const dialog = page.getByRole('dialog', { name: 'Criar visualização' });
  await dialog.getByRole('textbox', { name: 'Nome da visualização' }).fill(name);
  await dialog.getByRole('button', { name: 'Criar visualização' }).click();
  await expect(page.getByRole('button', { name: `Visualização da tabela: ${name}` })).toBeVisible();
};

const waitForStableFrame = async (page: Page): Promise<void> => {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.allSettled(document.getAnimations().map((animation) => animation.finished));
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
  });
};

const playerRows: readonly (readonly [
  string,
  string,
  string,
  Player['position'],
  number,
  number,
])[] = [
  ['rv-01', 'Caio Brandão', 'C. Brandão', 'GK', 76, 1],
  ['rv-02', 'Davi Moura', 'D. Moura', 'RB', 73, 22],
  ['rv-03', 'Iago Serpa', 'I. Serpa', 'CB', 78, 3],
  ['rv-04', 'Breno Vidal', 'B. Vidal', 'CB', 75, 4],
  ['rv-05', 'Nilo Azevedo', 'N. Azevedo', 'LB', 74, 16],
  ['rv-06', 'Tomás Paiva', 'T. Paiva', 'DM', 79, 5],
  ['rv-07', 'Luan Seixas', 'L. Seixas', 'CM', 77, 8],
  ['rv-08', 'Ravi Monteiro', 'R. Monteiro', 'CM', 76, 10],
  ['rv-09', 'Enzo Falcão', 'E. Falcão', 'RW', 78, 7],
  ['rv-10', 'Murilo Braga', 'M. Braga', 'ST', 81, 9],
  ['rv-11', 'Noah Teles', 'N. Teles', 'LW', 77, 11],
  ['rv-12', 'Ícaro Reis', 'Í. Reis', 'GK', 68, 12],
  ['rv-13', 'Otávio Luz', 'O. Luz', 'CB', 72, 14],
  ['rv-14', 'Pietro Nunes', 'P. Nunes', 'CM', 71, 27],
  ['rv-15', 'Gael Ramos', 'G. Ramos', 'AM', 74, 20],
  ['rv-16', 'Theo Barros', 'T. Barros', 'RW', 73, 17],
  ['rv-17', 'Samuel Lins', 'S. Lins', 'ST', 75, 19],
  ['rv-18', 'Vitor Amaral', 'V. Amaral', 'LB', 70, 25],
];

const players: Player[] = playerRows.map(
  ([id, name, shortName, position, rating, shirtNumber], index): Player => ({
    id,
    name,
    shortName,
    shirtNumber,
    position,
    age: 20 + (index % 11),
    nationality: index === 5 ? 'URU' : index === 14 ? 'ARG' : index === 15 ? 'POR' : 'BRA',
    heightCm: 174 + (index % 17),
    preferredFoot: ['LB', 'LW'].includes(position) ? 'left' : 'right',
    squadRole: index < 11 ? (rating >= 78 ? 'keyPlayer' : 'firstTeam') : 'rotation',
    rating,
    potentialRating: Math.min(88, rating + (index % 5)),
    matchFitness: 84 + (index % 14),
    morale: 70 + (index % 20),
    condition: 87 + (index % 13),
    appearances: 16 - (index % 12),
    goals: ['ST', 'RW', 'LW'].includes(position) ? index % 9 : index % 2,
    assists: ['CM', 'AM', 'RW', 'LW'].includes(position) ? index % 7 : 0,
    averageRating: 6.7 + (index % 10) / 10,
    selected: index < 11,
  }),
);

const initialState: MatchdayState = {
  club: {
    id: 'aurora-fc',
    name: 'Aurora Futebol Clube',
    shortName: 'AUR',
    city: 'Porto Claro',
    primaryColor: '#35c88a',
  },
  opponent: {
    id: 'ferroviario-do-vale',
    name: 'Ferroviário do Vale',
    shortName: 'FDV',
    city: 'Vale do Norte',
    primaryColor: '#d18a42',
  },
  round: 1,
  players,
  formation: '4-3-3',
  approach: 'balanced',
  record: {
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
  },
  lastResult: null,
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    ({ seed, storageKey, tableSeed, tableStorageKey, tableControlKey }) => {
      let state: MatchdayState = structuredClone(seed);
      let tableState: TableViewRepositoryState = structuredClone(tableSeed);
      try {
        const persisted = window.localStorage.getItem(storageKey);
        if (persisted) state = JSON.parse(persisted) as MatchdayState;
        const persistedTableState = window.localStorage.getItem(tableStorageKey);
        if (persistedTableState) {
          tableState = JSON.parse(persistedTableState) as TableViewRepositoryState;
        }
      } catch {
        // The in-memory bridge remains usable when browser storage is unavailable.
      }

      const persistState = () => {
        try {
          window.localStorage.setItem(storageKey, JSON.stringify(state));
        } catch {
          // The in-memory bridge remains authoritative for the current document.
        }
      };

      const persistTableState = () => {
        try {
          window.localStorage.setItem(tableStorageKey, JSON.stringify(tableState));
        } catch {
          // The in-memory bridge remains authoritative for the current document.
        }
      };

      const readTableControl = (): Record<string, unknown> => {
        try {
          const persisted = window.localStorage.getItem(tableControlKey);
          if (persisted) return JSON.parse(persisted) as Record<string, unknown>;
        } catch {
          // An invalid test control is treated as the normal loaded state.
        }
        return {};
      };

      const writeTableControl = (control: Record<string, unknown>) => {
        try {
          if (Object.keys(control).length === 0) {
            window.localStorage.removeItem(tableControlKey);
          } else {
            window.localStorage.setItem(tableControlKey, JSON.stringify(control));
          }
        } catch {
          // The control is test-only and may remain in memory when storage is unavailable.
        }
      };

      const consumeTableControl = (key: string): unknown => {
        const control = readTableControl();
        const value = control[key];
        delete control[key];
        writeTableControl(control);
        return value;
      };

      persistTableState();

      const bridge = {
        invoke: async (command: string, args: Record<string, unknown> = {}) => {
          if (command === 'lifecycle_status' || command === 'retry_lifecycle') {
            return { state: 'ready', ownership: 'owned' };
          }
          if (command === 'load_table_views') {
            const nextLoad = readTableControl().nextLoad;
            if (nextLoad === 'loading') {
              return new Promise<never>(() => undefined);
            }
            if (nextLoad !== undefined) consumeTableControl('nextLoad');
            if (nextLoad === 'unavailable') {
              return { status: 'unavailable', fallback: structuredClone(tableSeed) };
            }
            if (nextLoad === 'invalid') {
              return {
                status: 'invalid',
                fallback: structuredClone(tableSeed),
                reason: 'table_view.invalid_payload',
              };
            }
            if (nextLoad === 'migrated') {
              return {
                status: 'migrated',
                state: structuredClone(tableState),
                fromEnvelopeVersion: 2,
                toEnvelopeVersion: 3,
              };
            }
            if (nextLoad === 'corrupt' || nextLoad === 'future-schema') {
              return {
                status: 'recovered',
                state: structuredClone(tableSeed),
                reason: nextLoad === 'future-schema' ? 'future_schema_version' : 'corrupt_payload',
              };
            }
            return { status: 'loaded', state: structuredClone(tableState) };
          }
          if (command === 'save_table_views') {
            const failNextSave = consumeTableControl('failNextSave');
            if (failNextSave === true) return { status: 'saveFailed' };
            const request = args.request as { state: TableViewRepositoryState };
            tableState = {
              ...structuredClone(request.state),
              metadata: {
                envelopeVersion: 1,
                revision: tableState.metadata.revision + 1,
              },
            };
            persistTableState();
            return {
              status: 'confirmed',
              state: structuredClone(tableState),
              receipt: {
                tableId: 'squad.primary',
                schemaVersion: 1,
                ownerScope: 'local-fixed',
                acceptedRevision: tableState.metadata.revision,
              },
            };
          }
          if (command === 'import_legacy_table_preferences') {
            const request = args.request as {
              sourceVersion: 2 | 3 | 4;
              sourceFingerprint: string;
              state: TableViewRepositoryState['views'][number]['state'];
            };
            const existingReceipt = tableState.legacyImportReceipts.find(
              (receipt) =>
                receipt.sourceVersion === request.sourceVersion &&
                receipt.sourceFingerprint === request.sourceFingerprint,
            );
            if (existingReceipt !== undefined) {
              return {
                status: 'confirmed',
                state: structuredClone(tableState),
                receipt: structuredClone(existingReceipt),
                imported: false,
              };
            }
            const revision = tableState.metadata.revision + 1;
            const receipt = {
              sourceVersion: request.sourceVersion,
              sourceFingerprint: request.sourceFingerprint,
              tableId: 'squad.primary' as const,
              schemaVersion: 1 as const,
              ownerScope: 'local-fixed' as const,
              importedViewId: request.state.viewId,
              acceptedRevision: revision,
            };
            tableState = {
              ...tableState,
              metadata: { envelopeVersion: 1, revision },
              activeViewId: request.state.viewId,
              views: [
                ...tableState.views.filter(
                  ({ state: view }) => view.viewId !== request.state.viewId,
                ),
                { mutability: 'mutable', state: structuredClone(request.state) },
              ],
              legacyImportReceipts: [...tableState.legacyImportReceipts, receipt],
            };
            persistTableState();
            return {
              status: 'confirmed',
              state: structuredClone(tableState),
              receipt,
              imported: true,
            };
          }
          if (command === 'matchday_state') return state;
          if (command === 'update_matchday_lineup') {
            const selected = new Set(args.playerIds as string[]);
            state = {
              ...state,
              formation: args.formation as MatchdayState['formation'],
              approach: args.approach as MatchdayState['approach'],
              players: state.players.map((player) => ({
                ...player,
                selected: selected.has(player.id),
              })),
            };
            persistState();
            return state;
          }
          if (command === 'update_tactical_plan') {
            const proposal = args.proposal as NonNullable<MatchdayState['tacticalPlan']> & {
              expectedRevision: number;
              approach: MatchdayState['approach'];
            };
            const actualRevision = state.tacticalPlan?.revision ?? 0;
            if (proposal.expectedRevision !== actualRevision) {
              throw new Error(
                `tactical_plan_conflict:${proposal.expectedRevision}:${actualRevision}`,
              );
            }
            const acceptedRevision = actualRevision + 1;
            const selected = new Set(proposal.placements.map(({ playerId }) => playerId));
            state = {
              ...state,
              formation: proposal.formation,
              approach: proposal.approach,
              tacticalPlan: {
                schemaVersion: 2,
                planId: proposal.planId,
                name: proposal.name,
                sourcePresetId: proposal.sourcePresetId,
                formation: proposal.formation,
                placements: proposal.placements.map((placement) => ({
                  ...placement,
                  revision: acceptedRevision,
                })),
                bench: proposal.bench,
                customFormation: {
                  ...proposal.customFormation,
                  updatedAtRevision: acceptedRevision,
                },
                revision: acceptedRevision,
              },
              lastTacticalEvent: {
                kind: 'planSaved',
                planId: proposal.planId,
                acceptedRevision,
              },
              players: state.players.map((player) => ({
                ...player,
                selected: selected.has(player.id),
              })),
            };
            persistState();
            return {
              state,
              event: state.lastTacticalEvent,
            };
          }
          if (command === 'play_next_match') {
            state = {
              ...state,
              round: 2,
              players: state.players.map((player) => {
                if (!player.selected) return player;
                const scored = player.id === 'rv-10' || player.id === 'rv-11';
                const matchRating = scored ? 8.1 : 7.0;
                return {
                  ...player,
                  appearances: player.appearances + 1,
                  goals: player.goals + Number(scored),
                  averageRating:
                    Math.round(
                      ((player.averageRating * player.appearances + matchRating) /
                        (player.appearances + 1)) *
                        100,
                    ) / 100,
                  matchFitness: Math.max(0, player.matchFitness - 4),
                  condition: Math.max(0, player.condition - 3),
                  morale: Math.min(100, player.morale + 4),
                };
              }),
              record: {
                ...state.record,
                played: 1,
                wins: 1,
                goalsFor: 2,
                points: 3,
              },
              lastResult: {
                round: 1,
                homeClub: state.club.name,
                awayClub: state.opponent.name,
                homeGoals: 2,
                awayGoals: 0,
                possession: 58,
                shots: 12,
                shotsAgainst: 6,
                events: [
                  {
                    minute: 14,
                    kind: 'goal',
                    text: 'Gol do Aurora — M. Braga concluiu a jogada.',
                    forUserClub: true,
                  },
                  {
                    minute: 67,
                    kind: 'goal',
                    text: 'Gol do Aurora — N. Teles concluiu a jogada.',
                    forUserClub: true,
                  },
                  {
                    minute: 90,
                    kind: 'fullTime',
                    text: 'Fim de jogo.',
                    forUserClub: true,
                  },
                ],
              },
            };
            persistState();
            return state;
          }
          throw new Error(`Unexpected browser-test command: ${command}`);
        },
      };
      (window as unknown as { __TAURI_INTERNALS__: typeof bridge }).__TAURI_INTERNALS__ = bridge;
    },
    {
      seed: initialState,
      storageKey: bridgeStateKey,
      tableSeed: tableViewSeed,
      tableStorageKey: tableViewBridgeStateKey,
      tableControlKey: tableViewBridgeControlKey,
    },
  );
});

test('opens Elenco as a dedicated table workspace without rendering the tactical field', async ({
  page,
}, testInfo) => {
  await page.goto(developmentUrl);

  await expect(page.getByRole('heading', { name: 'Visão geral do elenco' })).toBeVisible();
  await expect(page.getByRole('table')).toBeVisible();
  await expect(page.getByLabel(/^Escalação no/u)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Elenco', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(page.locator('.squad-table .player-face')).toHaveCount(18);
  await expect(page.locator('.squad-table img.rv-nationality__flag')).toHaveCount(18);
  await expect(page.locator('.player-dossier img.rv-nationality__flag')).toHaveCount(1);
  await expect(page.locator('th[data-column-id="potentialRating"]')).toBeVisible();
  await expect(page.getByRole('row', { name: /Caio Brandão/u })).toContainText('1');
  await expect(page.getByRole('row', { name: /Davi Moura/u })).toContainText('22');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: testInfo.outputPath('elenco.png'), fullPage: true });
});

test('changes the dedicated tactical plan, plays the match, and reveals the result feed', async ({
  page,
}, testInfo) => {
  await page.goto(developmentUrl);

  await page.getByRole('button', { name: 'Táticas' }).click();
  await expect(page.getByRole('heading', { name: 'Plano de jogo' })).toBeVisible();
  await page.getByRole('combobox', { name: 'Formação' }).selectOption('4-2-3-1');
  await page.getByRole('radio', { name: /Protagonista/u }).check();
  const playButton = page.getByRole('button', { name: 'Continuar' });
  await playButton.click();

  await expect(page.getByRole('dialog', { name: '2 × 0' })).toBeVisible();
  await expect(page.getByText('Vitória · Rodada 1')).toBeVisible();
  await expect(page.getByText('Fim de jogo.')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('match-result.png') });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(playButton).toBeFocused();
});

test('personalizes the squad workspace and persists the choices', async ({ page }) => {
  await page.goto(developmentUrl);
  await createSavedView(page, 'Preferências pessoais');

  const personalizationButton = page.getByRole('button', { name: 'Personalizar' });
  await personalizationButton.click();
  await expect(page.getByRole('dialog', { name: 'Personalizar Rivallo' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(personalizationButton).toBeFocused();

  await page.getByRole('button', { name: 'Recolher navegação' }).click();
  await expect(page.locator('.manager-shell')).toHaveAttribute('data-sidebar-collapsed', 'true');
  const expandNavigationButton = page.getByRole('button', { name: 'Expandir navegação' });
  await expect(expandNavigationButton).toBeVisible();
  await expect(page.getByRole('button', { name: 'Personalizar' })).toBeVisible();
  await expandNavigationButton.click();
  await expect(page.locator('.manager-shell')).not.toHaveAttribute('data-sidebar-collapsed');
  await page.getByRole('button', { name: 'Recolher navegação' }).click();
  await expect(page.locator('.manager-shell')).toHaveAttribute('data-sidebar-collapsed', 'true');

  const densityTrigger = page.getByRole('button', { name: /Alterar densidade da tabela/u });
  const columnsTrigger = page.getByRole('button', { name: 'Configurar tabela' });
  await densityTrigger.focus();
  await expect(page.getByRole('tooltip')).toHaveText('Alterar espaçamento das linhas');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Densidade do elenco' })).toBeVisible();
  await expect(page.getByRole('tooltip')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(densityTrigger).toBeFocused();

  for (let cycle = 0; cycle < 3; cycle += 1) {
    await densityTrigger.click();
    await expect(page.getByRole('dialog', { name: 'Densidade do elenco' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Densidade do elenco' })).toBeHidden();
    await expect(densityTrigger).toBeFocused();
  }

  await densityTrigger.click();
  await page
    .getByRole('dialog', { name: 'Densidade do elenco' })
    .getByRole('button', { name: 'Fechar contexto' })
    .click();
  await expect(page.getByRole('dialog', { name: 'Densidade do elenco' })).toBeHidden();
  await expect(densityTrigger).toBeFocused();

  await densityTrigger.click();
  await columnsTrigger.click();
  await expect(page.getByRole('dialog', { name: 'Densidade do elenco' })).toBeHidden();
  await expect(page.getByRole('dialog', { name: 'Configurar tabela' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(columnsTrigger).toBeFocused();

  await columnsTrigger.click();
  await expect(page.getByRole('dialog', { name: 'Configurar tabela' })).toBeVisible();
  await densityTrigger.click();
  await expect(page.getByRole('dialog', { name: 'Configurar tabela' })).toBeHidden();
  await expect(page.getByRole('dialog', { name: 'Densidade do elenco' })).toBeVisible();
  await page.getByRole('button', { name: 'Densidade padrão' }).click();
  await expect(page.getByRole('dialog', { name: 'Densidade do elenco' })).toBeHidden();

  const readDensityGeometry = () =>
    page
      .locator('.squad-table tbody tr')
      .first()
      .evaluate((row) => {
        const cell = row.querySelector('td');
        const playerCell = row.querySelector('th');
        if (!(cell instanceof HTMLElement) || !(playerCell instanceof HTMLElement)) {
          throw new Error('A linha do elenco não possui as células esperadas.');
        }
        return {
          height: row.getBoundingClientRect().height,
          padding: Number.parseFloat(getComputedStyle(cell).paddingInlineStart),
          gap: Number.parseFloat(getComputedStyle(playerCell).columnGap),
        };
      });

  await densityTrigger.click();
  await page.getByRole('button', { name: 'Densidade compacta' }).click();
  const compactGeometry = await readDensityGeometry();
  await densityTrigger.click();
  await page.getByRole('button', { name: 'Densidade padrão' }).click();
  const standardGeometry = await readDensityGeometry();
  await densityTrigger.click();
  await page.getByRole('button', { name: 'Densidade confortável' }).click();
  const comfortableGeometry = await readDensityGeometry();
  expect(compactGeometry.height).toBeLessThan(standardGeometry.height);
  expect(standardGeometry.height).toBeLessThan(comfortableGeometry.height);
  expect(compactGeometry.padding).toBeLessThan(standardGeometry.padding);
  expect(standardGeometry.padding).toBeLessThan(comfortableGeometry.padding);
  expect(compactGeometry.gap).toBeLessThan(standardGeometry.gap);
  expect(standardGeometry.gap).toBeLessThan(comfortableGeometry.gap);
  await expect(page.getByRole('dialog', { name: 'Densidade do elenco' })).toBeHidden();
  await expect(densityTrigger).toHaveAttribute('aria-label', /Confortável/u);
  await expect(densityTrigger).toBeFocused();

  await columnsTrigger.click();
  await expect(page.getByRole('dialog', { name: 'Configurar tabela' })).toBeVisible();
  await page.keyboard.press('Tab');
  const focusedPopoverControl = page.locator('.rv-popover button:focus-visible');
  await expect(focusedPopoverControl).toHaveCount(1);
  const focusStyle = await focusedPopoverControl.evaluate((element) => {
    const styles = getComputedStyle(element);
    const rootStyles = getComputedStyle(document.documentElement);
    return {
      outlineColor: styles.outlineColor,
      focusColor: rootStyles.getPropertyValue('--rv-color-focus').trim(),
      outlineWidth: Number.parseFloat(styles.outlineWidth),
    };
  });
  expect(focusStyle.outlineColor).toBe(focusStyle.focusColor);
  expect(focusStyle.outlineWidth).toBeGreaterThanOrEqual(2);
  await page.getByRole('button', { name: 'Ocultar Idade' }).click();
  await expect(page.getByRole('dialog', { name: 'Configurar tabela' })).toBeVisible();
  await expect(page.locator('th[data-column-id="age"]')).toBeHidden();
  await page.getByRole('button', { name: 'Salvar visualização' }).click();
  await expect(page.getByRole('dialog', { name: 'Configurar tabela' })).toBeHidden();
  await columnsTrigger.focus();
  await expect(columnsTrigger).toBeFocused();

  await columnsTrigger.click();
  await page.getByRole('heading', { name: /jogadores$/u }).click();
  await expect(page.getByRole('dialog', { name: 'Configurar tabela' })).toBeHidden();
  await expect(columnsTrigger).toBeFocused();
  await expect(page.locator('.rv-popover')).toHaveCount(0);
  await expect(page.locator('body')).not.toHaveAttribute('style', /(?:overflow|pointer-events)/u);

  await page.getByRole('button', { name: 'Táticas', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Plano de jogo' })).toBeVisible();
  await page.getByRole('button', { name: 'Elenco', exact: true }).click();
  await expect(
    page.getByRole('button', { name: /Alterar densidade da tabela: Confortável/u }),
  ).toBeVisible();
  await expect(page.locator('th[data-column-id="age"]')).toBeHidden();

  await page.reload();
  await expect(page.locator('.manager-shell')).toHaveAttribute('data-sidebar-collapsed', 'true');
  await expect(page.locator('th[data-column-id="age"]')).toBeHidden();
  await expect(
    page.getByRole('button', { name: /Alterar densidade da tabela: Confortável/u }),
  ).toBeVisible();
});

test('uses real squad filters and navigates between the separate workspaces', async ({ page }) => {
  await page.goto(developmentUrl);

  await page.getByRole('combobox', { name: 'Filtro rápido' }).selectOption('reserve');
  await expect(page.getByRole('row', { name: /Ícaro Reis/u })).toBeVisible();
  await expect(page.getByRole('row', { name: /Caio Brandão/u })).toBeHidden();
  await expect(page.getByLabel(/^Escalação no/u)).toHaveCount(0);

  await page.getByRole('button', { name: 'Limpar' }).click();
  const playerRows = page.locator('.squad-table tbody tr');
  const positionHeader = page.getByRole('button', {
    name: /^(?:Ordenar por POS|POS, ordem)/u,
  });
  await expect(playerRows.first()).toContainText('Caio Brandão');
  await positionHeader.click();
  await expect(playerRows.first()).toContainText('Murilo Braga');
  await positionHeader.click();
  await expect(playerRows.first()).toContainText('Caio Brandão');

  await page.getByRole('button', { name: 'Adicionar filtro' }).click();
  await page.getByRole('combobox', { name: 'Filtrar por posição' }).selectOption('GK');
  await expect(playerRows).toHaveCount(2);
  await expect(page.getByRole('row', { name: /Caio Brandão/u })).toBeVisible();
  await expect(page.getByRole('row', { name: /Ícaro Reis/u })).toBeVisible();
  await expect(page.getByRole('row', { name: /Davi Moura/u })).toBeHidden();

  await page.getByRole('button', { name: 'Táticas' }).click();
  const dirtyNavigation = page.getByRole('alertdialog', {
    name: 'Salvar alterações antes de abrir “Táticas”?',
  });
  await dirtyNavigation.getByRole('button', { name: 'Descartar e abrir “Táticas”' }).click();
  await expect(page.getByRole('heading', { name: 'Plano de jogo' })).toBeVisible();
  await expect(page.getByRole('table')).toHaveCount(0);
  await expect(page.getByLabel('Escalação no 4-3-3')).toBeVisible();
  await page.getByRole('button', { name: 'Análise' }).click();
  await expect(page.getByText(/% pronto/u)).toBeVisible();

  await page.getByRole('button', { name: 'Elenco' }).click();
  await expect(page.getByRole('heading', { name: 'Visão geral do elenco' })).toBeVisible();
  await expect(page.getByRole('table')).toBeVisible();
  await expect(page.getByLabel(/^Escalação no/u)).toHaveCount(0);
});

test('substitutes through the accessible field flow and persists the saved plan', async ({
  page,
}) => {
  await page.goto(developmentUrl);

  const caioRow = page.getByRole('row', { name: /Caio Brandão/u });
  const icaroRow = page.getByRole('row', { name: /Ícaro Reis/u });
  await expect(caioRow.locator('.squad-number')).toHaveText('1');
  await expect(icaroRow.locator('.squad-number')).toHaveText('12');

  await page.getByRole('button', { name: 'Táticas' }).click();
  await page.getByRole('button', { name: 'Selecionar reserva Ícaro Reis' }).click();
  await page.getByRole('button', { name: /^GOL: Caio Brandão/u }).click();
  await expect(page.getByRole('button', { name: /^GOL: Ícaro Reis/u })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Selecionar reserva Caio Brandão' })).toBeVisible();

  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('combobox', { name: 'Formação' }).selectOption('4-2-3-1');
  await page.getByRole('radio', { name: /Protagonista/u }).check();
  await page.getByRole('button', { name: 'Salvar plano' }).click();
  await expect(page.getByRole('button', { name: 'Salvar plano' })).toBeDisabled();

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Plano de jogo' })).toBeVisible();
  await expect(page.getByLabel('Escalação no 4-2-3-1')).toBeVisible();
  await expect(page.getByRole('button', { name: /^GOL: Ícaro Reis/u })).toBeVisible();
  await expect(page.getByRole('radio', { name: /Protagonista/u })).toBeChecked();

  await page.getByRole('button', { name: 'Elenco' }).click();
  await expect(caioRow.locator('.squad-number')).toHaveText('1');
  await expect(icaroRow.locator('.squad-number')).toHaveText('12');
  await expect(caioRow.getByRole('button', { name: 'Escalar Caio Brandão' })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await expect(icaroRow.getByRole('button', { name: 'Retirar Ícaro Reis' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('keeps field and bench in one drag session and persists a custom formation', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'desktop-1366x768',
    'The focused tactical interaction contract only needs one desktop project.',
  );

  await page.goto(developmentUrl);
  await page.getByRole('button', { name: 'Táticas' }).click();
  const pitch = page.getByLabel('Escalação no 4-3-3');

  const goalkeeper = page.getByRole('button', { name: /^GOL: Caio Brandão/u });
  const goalkeeperSlot = goalkeeper.locator('xpath=..');
  const goalkeeperStyle = await goalkeeperSlot.getAttribute('style');
  await goalkeeper.dragTo(pitch, { targetPosition: { x: 500, y: 260 } });
  await expect(page.locator('.pitch-save-state')).toContainText(
    'O goleiro precisa permanecer no setor defensivo permitido.',
  );
  await expect(goalkeeperSlot).toHaveAttribute('style', goalkeeperStyle ?? '');

  await page
    .getByRole('button', { name: /^LE: Davi Moura/u })
    .dragTo(page.getByRole('button', { name: /^ZAG: Iago Serpa/u }));
  await expect(page.getByRole('button', { name: /^ZAG: Davi Moura/u })).toBeVisible();
  await expect(page.getByRole('button', { name: /^LE: Iago Serpa/u })).toBeVisible();

  await page
    .getByRole('button', { name: 'Selecionar reserva Otávio Luz' })
    .dragTo(page.getByRole('button', { name: /^ZAG: Davi Moura/u }));
  await expect(page.getByRole('button', { name: /^ZAG: Otávio Luz/u })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Selecionar reserva Davi Moura' })).toBeVisible();

  const midfielder = page.getByRole('button', { name: /^VOL: Luan Seixas/u });
  await midfielder.focus();
  await page.keyboard.press('Alt+ArrowUp');
  const customName = page.getByLabel('Nome da formação personalizada');
  await expect(customName).toBeVisible();
  await customName.fill('Pressão assimétrica');

  await page.getByRole('button', { name: 'Selecionar reserva Ícaro Reis' }).click();
  await page.keyboard.press('Escape');
  await expect(page.locator('[role="status"].sr-only').last()).toContainText('Movimento cancelado');

  await page.getByRole('button', { name: 'Salvar plano' }).click();
  await expect(page.getByRole('button', { name: 'Salvar plano' })).toBeDisabled();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Plano de jogo' })).toBeVisible();
  await expect(page.getByLabel('Nome da formação personalizada')).toHaveValue(
    'Pressão assimétrica',
  );
  await expect(page.getByRole('button', { name: /^ZAG: Otávio Luz/u })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Selecionar reserva Davi Moura' })).toBeVisible();
});

test('honors reduced motion in the tactical interaction surface', async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== 'desktop-1366x768',
    'The reduced-motion contract only needs one desktop project.',
  );
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(developmentUrl);
  await page.getByRole('button', { name: 'Táticas' }).click();

  const duration = await page
    .getByRole('button', { name: /^GOL: Caio Brandão/u })
    .evaluate((element) => getComputedStyle(element).transitionDuration);
  const seconds = duration.endsWith('ms')
    ? Number.parseFloat(duration) / 1000
    : Number.parseFloat(duration);
  expect(seconds).toBeLessThanOrEqual(0.00001);
  await expect(page.locator('.tactical-drag-overlay')).toHaveCount(0);
});

test('captures Elenco and Táticas at 1024, 1366, 1440, 1920 and 2560 pixels', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'desktop-1366x768',
    'The explicit viewport matrix only needs to run in one project.',
  );

  await page.goto(developmentUrl);
  await expect(page.getByRole('heading', { name: 'Visão geral do elenco' })).toBeVisible();

  for (const viewport of screenshotViewports) {
    await page.setViewportSize(viewport);
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();

    await expect(page.getByRole('heading', { name: 'Visão geral do elenco' })).toBeVisible();
    await expect(page.getByRole('table')).toBeVisible();
    await expect(page.getByLabel(/^Escalação no/u)).toHaveCount(0);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(`elenco-${viewport.width}x${viewport.height}.png`),
    });

    await page.getByRole('button', { name: 'Táticas' }).click();
    await expect(page.getByRole('heading', { name: 'Plano de jogo' })).toBeVisible();
    await expect(page.getByRole('table')).toHaveCount(0);
    await expect(page.getByLabel('Escalação no 4-3-3')).toBeVisible();
    await expect(page.locator('.rivallo-brand')).toBeVisible();
    await expect(page.locator('.manager-navigation__group').first()).toBeVisible();
    await expect(page.locator('.continue-button')).toBeVisible();
    await expect(page.getByRole('group', { name: 'Controles da janela' })).toBeVisible();
    await expect(page.locator('.tactics-heading .fixture-summary')).toContainText(
      'Preparação · Rodada 1',
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.allSettled(document.getAnimations().map((animation) => animation.finished));
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
    });
    await page.locator('.manager-shell').evaluate((shell) => shell.getBoundingClientRect());
    await page.screenshot({
      animations: 'disabled',
      path: testInfo.outputPath(`taticas-${viewport.width}x${viewport.height}.png`),
    });
    if (viewport.width === 1024) {
      const bench = page.getByRole('heading', { name: 'Banco e reservas' });
      await bench.scrollIntoViewIfNeeded();
      await expect(bench).toBeInViewport();
      await expect(page.getByRole('button', { name: 'Salvar plano' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Descartar' })).toBeVisible();
    }
  }
});

test('durable lifecycle persists an ordinary Mostrar somente gols view across restart', async ({
  page,
}) => {
  await page.goto(developmentUrl);
  await createSavedView(page, 'Mostrar somente gols');

  await page.getByRole('button', { name: 'Configurar tabela' }).click();
  const customizer = page.getByRole('dialog', { name: 'Configurar tabela' });
  await customizer.getByRole('searchbox', { name: 'Buscar colunas' }).fill('Idade');
  await customizer.getByRole('button', { name: 'Ocultar Idade' }).click();
  await setTableViewBridgeControl(page, { failNextSave: true });
  await customizer.getByRole('button', { name: 'Salvar visualização' }).click();
  await expect(
    page.getByRole('heading', { name: 'Não foi possível salvar a visualização' }),
  ).toBeFocused();
  await expect(
    page.locator('.rv-table-view-status').getByText('Alterações não salvas'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Tentar salvar visualização' }).click();
  await expect(
    page.getByRole('heading', { name: 'Não foi possível salvar a visualização' }),
  ).toHaveCount(0);

  const repository = await readTableViewRepository(page);
  const active = repository.views.find(({ state }) => state.viewId === repository.activeViewId);
  expect(active?.state.provenance).toBe('user-owned');
  if (active === undefined) throw new Error('The created browser view did not become active.');

  const scorerState = {
    ...active.state,
    columns: active.state.columns.map((column) => ({
      ...column,
      visible: ['shirtNumber', 'info', 'name', 'position', 'goals'].includes(column.columnId),
    })),
    sort: [
      { columnId: 'goals', direction: 'desc', nulls: 'last' },
      { columnId: 'name', direction: 'asc', nulls: 'last' },
    ],
    filter: {
      kind: 'group',
      groupId: 'filters.root',
      logic: 'and',
      children: [
        {
          kind: 'clause',
          filterId: 'filter.goals',
          columnId: 'goals',
          operator: 'greater-than',
          value: { kind: 'number', value: 0 },
          enabled: true,
        },
      ],
    },
    grouping: [],
  } as const;
  const scorerRepository: TableViewRepositoryState = {
    ...repository,
    metadata: { ...repository.metadata, revision: repository.metadata.revision + 1 },
    views: repository.views.map((view) =>
      view.state.viewId === active.state.viewId ? { ...view, state: scorerState } : view,
    ),
  };
  await writeTableViewRepository(page, scorerRepository);
  await page.reload();

  await expect(
    page.getByRole('button', { name: 'Visualização da tabela: Mostrar somente gols' }),
  ).toBeVisible();
  await expect(page.locator('.squad-table thead th')).toHaveCount(5);
  await expect(page.locator('th[data-column-id="goals"]')).toBeVisible();
  await expect(page.locator('[aria-label*="Agrupar"], [data-control="grouping"]')).toHaveCount(0);
  const visibleGoals = await page
    .locator('.squad-table tbody tr td[data-column-id="goals"]')
    .allTextContents();
  expect(visibleGoals.length).toBeGreaterThan(0);
  expect(visibleGoals.every((value) => Number(value.trim()) > 0)).toBe(true);
  expect(visibleGoals.map(Number)).toEqual([...visibleGoals.map(Number)].sort((a, b) => b - a));

  const makeDensityDirty = async () => {
    await page.getByRole('button', { name: /Alterar densidade da tabela:/u }).click();
    await page.getByRole('button', { name: 'Densidade padrão' }).click();
    await expect(
      page.locator('.rv-table-view-status').getByText('Alterações não salvas'),
    ).toBeVisible();
  };
  const requestSystemView = async () => {
    const lifecycleSelector = await openSavedViewSelector(page);
    await lifecycleSelector.getByRole('button', { name: /^Abrir visualização Padrão\./u }).click();
    return page.getByRole('alertdialog', {
      name: 'Salvar alterações antes de abrir “Padrão”?',
    });
  };

  await makeDensityDirty();
  let dirtyDialog = await requestSystemView();
  await expect(
    dirtyDialog.getByRole('button', { name: 'Continuar nesta visualização' }),
  ).toBeFocused();
  await dirtyDialog.getByRole('button', { name: 'Continuar nesta visualização' }).click();
  await expect(
    page.getByRole('button', { name: 'Visualização da tabela: Mostrar somente gols' }),
  ).toBeVisible();

  dirtyDialog = await requestSystemView();
  await dirtyDialog.getByRole('button', { name: 'Descartar e abrir “Padrão”' }).click();
  await expect(page.getByRole('button', { name: 'Visualização da tabela: Padrão' })).toBeVisible();
  let lifecycleSelector = await openSavedViewSelector(page);
  await lifecycleSelector
    .getByRole('button', { name: /^Abrir visualização Mostrar somente gols\./u })
    .click();

  await makeDensityDirty();
  dirtyDialog = await requestSystemView();
  await dirtyDialog.getByRole('button', { name: 'Salvar e abrir “Padrão”' }).click();
  await expect(page.getByRole('button', { name: 'Visualização da tabela: Padrão' })).toBeVisible();
  lifecycleSelector = await openSavedViewSelector(page);
  await lifecycleSelector
    .getByRole('button', { name: /^Abrir visualização Mostrar somente gols\./u })
    .click();

  await page.getByRole('button', { name: 'Configurar tabela' }).click();
  const reopenedCustomizer = page.getByRole('dialog', { name: 'Configurar tabela' });
  await reopenedCustomizer.getByRole('searchbox', { name: 'Buscar colunas' }).fill('Idade');
  await reopenedCustomizer.getByRole('button', { name: 'Mostrar Idade' }).click();
  await reopenedCustomizer.getByRole('button', { name: 'Restaurar visualização' }).click();
  await expect(reopenedCustomizer.getByRole('button', { name: 'Mostrar Idade' })).toBeVisible();
  await reopenedCustomizer.getByRole('button', { name: 'Descartar ajustes' }).click();

  let selector = await openSavedViewSelector(page);
  await selector.getByRole('button', { name: 'Renomear visualização' }).click();
  const renameDialog = page.getByRole('dialog', { name: 'Renomear visualização' });
  await renameDialog
    .getByRole('textbox', { name: 'Nome da visualização' })
    .fill('Artilheiros — visão longa e persistente do elenco principal');
  await renameDialog.getByRole('button', { name: 'Renomear visualização' }).click();
  await expect(
    page.getByRole('button', {
      name: 'Visualização da tabela: Artilheiros — visão longa e persistente do elenco principal',
    }),
  ).toBeVisible();

  selector = await openSavedViewSelector(page);
  await selector.getByRole('button', { name: 'Duplicar visualização' }).click();
  const duplicateDialog = page.getByRole('dialog', { name: 'Duplicar visualização' });
  await duplicateDialog
    .getByRole('textbox', { name: 'Nome da visualização' })
    .fill('Artilheiros — cópia de trabalho');
  await duplicateDialog.getByRole('button', { name: 'Duplicar visualização' }).click();
  selector = await openSavedViewSelector(page);
  await selector.getByRole('button', { name: 'Definir como visualização padrão' }).click();

  selector = await openSavedViewSelector(page);
  await selector.getByRole('button', { name: 'Excluir visualização' }).click();
  const deleteDialog = page.getByRole('alertdialog', {
    name: 'Excluir visualização “Artilheiros — cópia de trabalho”?',
  });
  await expect(deleteDialog.getByRole('button', { name: 'Manter visualização' })).toBeFocused();
  await deleteDialog.getByRole('button', { name: 'Excluir visualização' }).click();
  await page.reload();

  const persisted = await readTableViewRepository(page);
  expect(
    persisted.views.some(({ state }) => state.label === 'Artilheiros — cópia de trabalho'),
  ).toBe(false);
  expect(
    persisted.views.some(
      ({ state }) => state.label === 'Artilheiros — visão longa e persistente do elenco principal',
    ),
  ).toBe(true);
  expect(persisted.legacyImportReceipts).toEqual([]);

  await page.evaluate(() => {
    window.localStorage.setItem(
      'rivallo.squad-ui.v3',
      JSON.stringify({
        density: 'comfortable',
        visibleColumns: ['goals', 'age'],
        showPlayerDetails: true,
        sidebarCollapsed: false,
        customNonTable: 'preservar',
      }),
    );
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect
    .poll(async () => (await readTableViewRepository(page)).legacyImportReceipts.length)
    .toBe(1);
  const afterLegacyImport = await readTableViewRepository(page);
  expect(afterLegacyImport.legacyImportReceipts).toHaveLength(1);
  expect(
    afterLegacyImport.views.find(({ state }) => state.viewId === afterLegacyImport.activeViewId)
      ?.state.label,
  ).toBe('Preferências anteriores');
  await expect
    .poll(() => page.evaluate(() => window.localStorage.getItem('rivallo.squad-ui.v3')))
    .toBeNull();
  const retiredLegacy = await page.evaluate(() => ({
    old: window.localStorage.getItem('rivallo.squad-ui.v3'),
    current: JSON.parse(window.localStorage.getItem('rivallo.squad-ui.v4') ?? '{}') as Record<
      string,
      unknown
    >,
  }));
  expect(retiredLegacy.old).toBeNull();
  expect(retiredLegacy.current).toMatchObject({ customNonTable: 'preservar' });
  expect(retiredLegacy.current).not.toHaveProperty('density');
  expect(retiredLegacy.current).not.toHaveProperty('visibleColumns');

  await page.evaluate(() => {
    window.localStorage.setItem(
      'rivallo.squad-ui.v3',
      JSON.stringify({ visibleColumns: ['removedInternalColumn'] }),
    );
  });
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Preferências antigas não puderam ser importadas' }),
  ).toBeVisible();
  expect(await page.evaluate(() => window.localStorage.getItem('rivallo.squad-ui.v3'))).toContain(
    'removedInternalColumn',
  );

  await page.evaluate(() => window.localStorage.removeItem('rivallo.squad-ui.v3'));
  const sharedRepository = await readTableViewRepository(page);
  const sharedState = {
    ...structuredClone(SQUAD_SYSTEM_VIEW),
    viewId: 'squad.shared.staff-analysis',
    baselineViewId: SQUAD_SYSTEM_VIEW.viewId,
    provenance: 'shared-read-only',
    label: 'Análise da comissão',
  } as const;
  await writeTableViewRepository(page, {
    ...sharedRepository,
    metadata: {
      ...sharedRepository.metadata,
      revision: sharedRepository.metadata.revision + 1,
    },
    activeViewId: sharedState.viewId,
    views: [...sharedRepository.views, { mutability: 'read-only', state: sharedState }],
  });
  await page.reload();
  selector = await openSavedViewSelector(page);
  await expect(selector.getByText('Somente leitura')).toBeVisible();
  await expect(selector.getByRole('button', { name: 'Duplicar visualização' })).toBeVisible();
  await expect(selector.getByRole('button', { name: 'Renomear visualização' })).toHaveCount(0);
  await expect(selector.getByRole('button', { name: 'Excluir visualização' })).toHaveCount(0);
});

test('live header parity keeps pointer and keyboard reorder resize rollback focus and announcements', async ({
  page,
}) => {
  const columnOrder = () =>
    page
      .locator('.squad-table thead th')
      .evaluateAll((headers) => headers.map((header) => header.getAttribute('data-column-id')));

  await page.goto(developmentUrl);
  await expect(page.locator('.squad-table thead th')).toHaveCount(18);
  const focusedPlayerRow = page.getByRole('row', { name: /Caio Brandão/u });
  await focusedPlayerRow.click();
  await expect(focusedPlayerRow).toHaveAttribute('data-focused', 'true');
  await page.getByRole('button', { name: 'Ordenar por Jogador' }).click();
  await expect(focusedPlayerRow).toHaveAttribute('data-focused', 'true');
  await expect(
    focusedPlayerRow.getByRole('button', { name: 'Retirar Caio Brandão' }),
  ).toHaveAttribute('aria-pressed', 'true');
  const initialOrder = await columnOrder();
  const keyboardMove = page.getByRole('button', {
    name: /^(?:Ordenar por Jogador|Jogador, ordem)/u,
  });
  await keyboardMove.focus();
  await page.keyboard.press('Alt+ArrowRight');
  const keyboardOrder = await columnOrder();
  expect(keyboardOrder).not.toEqual(initialOrder);
  await expect(page.getByText(/^Jogador, posição \d+ de 18\.$/u)).toBeVisible();
  await expect(keyboardMove).toBeFocused();

  await page.reload();
  const pointerMove = page.locator('thead th[data-column-id="name"]');
  await pointerMove.dragTo(page.locator('thead th[data-column-id="position"]'));
  expect(await columnOrder()).toEqual(keyboardOrder);
  await expect(pointerMove).toBeVisible();

  await page.reload();
  const rollbackMove = page.getByRole('button', {
    name: /^(?:Ordenar por Jogador|Jogador, ordem)/u,
  });
  await rollbackMove.focus();
  await page.keyboard.press('Alt+ArrowRight');
  await page.keyboard.press('Escape');
  expect(await columnOrder()).toEqual(initialOrder);
  await expect(rollbackMove).toBeFocused();
  await expect(page.getByText('Jogador, operação desfeita.')).toBeVisible();

  const keyboardResize = page.getByRole('separator', { name: 'Redimensionar Jogador' });
  const initialWidth = Number(await keyboardResize.getAttribute('aria-valuenow'));
  await keyboardResize.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  expect(Number(await keyboardResize.getAttribute('aria-valuenow'))).toBe(initialWidth + 8);
  await expect(page.getByText(`Jogador, largura ${initialWidth + 8} pixels.`)).toBeVisible();
  await expect(keyboardResize).toBeFocused();

  await page.reload();
  const pointerResize = page.getByRole('separator', { name: 'Redimensionar Jogador' });
  const resizeBox = await pointerResize.boundingBox();
  if (resizeBox === null) throw new Error('The live Jogador resize handle is not measurable.');
  const resizeX = resizeBox.x + resizeBox.width / 2;
  const resizeY = resizeBox.y + resizeBox.height / 2;
  await page.mouse.move(resizeX, resizeY);
  await page.mouse.down();
  await page.mouse.move(resizeX + 8, resizeY);
  await page.mouse.up();
  expect(Number(await pointerResize.getAttribute('aria-valuenow'))).toBe(initialWidth + 8);

  await page.reload();
  const rollbackResize = page.getByRole('separator', { name: 'Redimensionar Jogador' });
  await rollbackResize.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Escape');
  expect(Number(await rollbackResize.getAttribute('aria-valuenow'))).toBe(initialWidth);
  await expect(rollbackResize).toBeFocused();

  const customizerTrigger = page.getByRole('button', { name: 'Configurar tabela' });
  await customizerTrigger.focus();
  await page.keyboard.press('Enter');
  const customizer = page.getByRole('dialog', { name: 'Configurar tabela' });
  const search = customizer.getByRole('searchbox', { name: 'Buscar colunas' });
  await expect(search).toBeFocused();
  await search.fill('Idade');
  const customizerMove = customizer.getByRole('button', { name: 'Mover Idade' });
  await customizerMove.focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(customizer.getByText(/^Idade, posição \d+ de 18\.$/u)).toBeVisible();
  await expect(customizerMove).toBeFocused();

  const customizerResize = customizer.getByRole('separator', { name: 'Redimensionar Idade' });
  const customizerInitialWidth = Number(await customizerResize.getAttribute('aria-valuenow'));
  await customizerResize.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Escape');
  expect(Number(await customizerResize.getAttribute('aria-valuenow'))).toBe(customizerInitialWidth);
  await expect(customizerResize).toBeFocused();

  const pinStart = customizer.getByRole('button', { name: 'Fixar no início' });
  await pinStart.focus();
  await page.keyboard.press('Enter');
  await expect(customizer.getByText('Idade fixada no início.')).toBeVisible();
  const unpin = customizer.getByRole('button', { name: 'Desafixar coluna' });
  await unpin.focus();
  await page.keyboard.press('Enter');
  await expect(customizer.getByText('Idade desafixada.')).toBeVisible();
  const hideAge = customizer.getByRole('button', { name: 'Ocultar Idade' });
  await hideAge.focus();
  await page.keyboard.press('Enter');
  await expect(customizer.getByText('Idade oculta.')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(customizer).toBeHidden();
  await expect(customizerTrigger).toBeFocused();

  await customizerTrigger.click();
  const pointerCustomizer = page.getByRole('dialog', { name: 'Configurar tabela' });
  await pointerCustomizer.getByRole('searchbox', { name: 'Buscar colunas' }).fill('');
  const pointerMoveAge = pointerCustomizer.getByRole('button', { name: 'Mover Idade' });
  await pointerMoveAge.dragTo(pointerCustomizer.getByRole('group', { name: 'Coluna NAT' }));
  await expect(pointerCustomizer.getByText(/^Idade, posição \d+ de 18\.$/u)).toBeVisible();
  const pointerResizeAge = pointerCustomizer.getByRole('separator', {
    name: 'Redimensionar Idade',
  });
  await pointerResizeAge.scrollIntoViewIfNeeded();
  await expect(pointerResizeAge).toBeVisible();
  const pointerResizeBox = await pointerResizeAge.boundingBox();
  if (pointerResizeBox === null)
    throw new Error('The customizer Idade resize handle is not measurable.');
  const pointerResizeX = pointerResizeBox.x + pointerResizeBox.width / 2;
  const pointerResizeY = pointerResizeBox.y + pointerResizeBox.height / 2;
  await page.mouse.move(pointerResizeX, pointerResizeY);
  await page.mouse.down();
  await page.mouse.move(pointerResizeX + 8, pointerResizeY);
  await page.mouse.up();
  expect(Number(await pointerResizeAge.getAttribute('aria-valuenow'))).toBe(
    customizerInitialWidth + 8,
  );
  const discardAdjustments = pointerCustomizer.getByRole('button', { name: 'Descartar ajustes' });
  const discardGeometry = await discardAdjustments.evaluate((button) => {
    const rect = button.getBoundingClientRect();
    const content = button.closest<HTMLElement>('.table-view-customizer__content');
    return {
      bottom: rect.bottom,
      top: rect.top,
      viewportHeight: window.innerHeight,
      contentClientHeight: content?.clientHeight ?? 0,
      contentScrollHeight: content?.scrollHeight ?? 0,
    };
  });
  expect(discardGeometry.bottom, JSON.stringify(discardGeometry)).toBeLessThanOrEqual(
    discardGeometry.viewportHeight,
  );
  await discardAdjustments.click();
  await expect(customizerTrigger).toBeFocused();
});

test('computed WCAG contrast matrix covers operational and truthful table-view states', async ({
  page,
}, testInfo) => {
  const samples: EmittedTableViewContrastSample[] = [];
  const requirements = new Map<TableViewContrastRequirementId, TableViewContrastRequirement>(
    tableViewContrastMatrix.map((requirement) => [requirement.id, requirement]),
  );
  const sample = async (
    id: TableViewContrastRequirementId,
    locator: ReturnType<Page['locator']>,
  ) => {
    const requirement = requirements.get(id);
    if (requirement === undefined) throw new Error(`Unknown WCAG contrast requirement: ${id}`);
    const result = await sampleComputedContrast(locator, requirement);
    const threshold =
      requirement.applicability === 'inactive-control-exception'
        ? null
        : requiredContrastRatio(requirement.kind);
    samples.push({ ...result, id, state: requirement.state, threshold });
    if (threshold !== null) {
      expect(
        result.ratio,
        `${requirement.label}: ${result.foreground} on ${result.background}`,
      ).toBeGreaterThanOrEqual(threshold);
    }
  };

  await page.goto(developmentUrl);
  await sample('default.table-row.text', page.locator('.squad-table tbody th').first());
  await sample(
    'default.live-header.inactive-sort-text',
    page.locator('.rv-data-table-header-cell__title:not([data-active])').first(),
  );
  await sample(
    'default.live-header.move-action-boundary',
    page.getByRole('button', { name: /Mais ações para/u }).first(),
  );
  await sample(
    'active.live-header.sort-text',
    page.locator('.rv-data-table-header-cell__title[data-active]').first(),
  );
  await sample(
    'default.live-header.resize-handle',
    page.getByRole('separator', { name: /Redimensionar/u }).first(),
  );

  const selectorTrigger = page.getByRole('button', { name: /Visualização da tabela:/u });
  await sample('default.saved-view-trigger.boundary', selectorTrigger);
  const customizerTrigger = page.getByRole('button', { name: 'Configurar tabela' });
  await sample('default.customizer-trigger.boundary', customizerTrigger);
  await customizerTrigger.hover();
  await sample('hover.customizer-trigger.boundary', customizerTrigger);
  await selectorTrigger.hover();
  await sample('hover.saved-view-trigger.boundary', selectorTrigger);
  await selectorTrigger.focus();
  await sample('focus-visible.saved-view-trigger.ring', selectorTrigger);
  await selectorTrigger.click();

  const selector = page.getByRole('dialog', { name: 'Visualização da tabela' });
  await sample(
    'active.saved-view-menu.option-text',
    selector.locator(".saved-view-selector__option[aria-current='true'] strong").first(),
  );
  await sample(
    'default.saved-view-menu.provenance-text',
    selector.getByText('Padrão do sistema', { exact: true }),
  );
  await sample(
    'default.saved-view-menu.default-text',
    selector.getByText('Visualização padrão', { exact: true }),
  );
  await sample(
    'default.saved-view-menu.duplicate-action-boundary',
    selector.getByRole('button', { name: 'Duplicar visualização' }),
  );
  await sample(
    'default.saved-view-menu.empty-explanation-text',
    selector.locator('.saved-view-selector__empty p'),
  );
  await sample(
    'default.saved-view-menu.create-first-action-boundary',
    selector.locator('.saved-view-selector__empty .rv-button'),
  );
  const disabledDefaultAction = selector.getByRole('button', {
    name: 'Definir como visualização padrão',
  });
  await expect(disabledDefaultAction).toBeDisabled();
  await sample('disabled.saved-view-menu.default-action-boundary', disabledDefaultAction);
  await page.keyboard.press('Escape');

  const densityTrigger = page.getByRole('button', { name: /Alterar densidade da tabela/u });
  await densityTrigger.click();
  await page.getByRole('button', { name: /Densidade confortável/u }).click();
  await selectorTrigger.click();
  const dirtyImmutableSelector = page.getByRole('dialog', { name: 'Visualização da tabela' });
  await sample(
    'dirty.saved-view-menu.readonly-explanation-text',
    dirtyImmutableSelector.locator('.saved-view-selector__readonly p'),
  );
  await sample(
    'dirty.saved-view-menu.duplicate-to-edit-action-boundary',
    dirtyImmutableSelector.locator('.saved-view-selector__readonly .rv-button'),
  );
  await page.keyboard.press('Escape');
  await densityTrigger.click();
  await page.getByRole('button', { name: /Densidade compacta/u }).click();

  await page.getByRole('button', { name: 'Configurar tabela' }).click();
  const customizer = page.getByRole('dialog', { name: 'Configurar tabela' });
  const search = customizer.getByRole('searchbox', { name: 'Buscar colunas' });
  await expect(search).toBeFocused();
  await sample(
    'default.customizer.field-label-text',
    customizer.locator('.rv-field__label').filter({ hasText: 'Buscar colunas' }),
  );
  await sample('default.customizer.field-boundary', search);
  await sample('focus-visible.customizer-search.ring', search);
  const requiredColumn = customizer.getByRole('group', { name: 'Coluna Jogador' });
  await sample('default.customizer.column-title-text', requiredColumn.locator('strong').first());
  await sample('default.customizer.column-width-text', requiredColumn.locator('small').first());
  await sample(
    'default.customizer.column-explanation-text',
    requiredColumn.locator('.table-view-customizer__required'),
  );
  const customizerMove = requiredColumn.getByRole('button', { name: 'Mover Jogador' });
  await sample('default.customizer.move-action-boundary', customizerMove);
  await sample(
    'default.customizer.resize-handle',
    requiredColumn.getByRole('separator', { name: 'Redimensionar Jogador' }),
  );
  await sample(
    'default.customizer.pin-action-boundary',
    customizer.locator('.table-view-customizer__pinning button').first(),
  );
  const selectedVisibility = requiredColumn.getByRole('button', { name: 'Ocultar Jogador' });
  await sample('selected.customizer.visibility-boundary', selectedVisibility);
  await sample(
    'default.customizer.reset-columns-action-boundary',
    customizer.getByRole('button', { name: 'Restaurar colunas' }),
  );
  await sample(
    'default.customizer.reset-view-action-boundary',
    customizer.getByRole('button', { name: 'Restaurar visualização' }),
  );
  await sample(
    'default.customizer.discard-action-boundary',
    customizer.getByRole('button', { name: 'Descartar ajustes' }),
  );
  const disabledCustomizerSave = customizer.getByRole('button', {
    name: 'Salvar visualização',
  });
  await expect(disabledCustomizerSave).toBeDisabled();
  await sample('disabled.customizer.save-action-boundary', disabledCustomizerSave);
  await customizerMove.focus();
  await page.keyboard.press('Enter');
  await waitForStableFrame(page);
  await sample('active.customizer.move-action-boundary', customizerMove);
  await page.keyboard.press('Escape');
  await customizer
    .getByRole('searchbox', { name: 'Buscar colunas' })
    .fill('sem resultado possível');
  await sample(
    'empty.customizer-state.text',
    customizer.getByRole('heading', { name: 'Nenhuma coluna encontrada' }),
  );
  await search.fill('Idade');
  await customizer.getByRole('button', { name: 'Ocultar Idade' }).click();
  await sample('dirty.customizer-state.text', customizer.getByText('Alterações não salvas'));
  await sample(
    'dirty.customizer.save-action-boundary',
    customizer.getByRole('button', { name: 'Salvar visualização' }),
  );
  await customizer.getByRole('button', { name: 'Descartar ajustes' }).click();

  await createSavedView(page, 'Contraste de ações');
  const ownedSelector = await openSavedViewSelector(page);
  await sample(
    'default.saved-view-menu.rename-action-boundary',
    ownedSelector.getByRole('button', { name: 'Renomear visualização' }),
  );
  await sample(
    'default.saved-view-menu.delete-action-text',
    ownedSelector.getByRole('button', { name: 'Excluir visualização' }),
  );
  await sample(
    'default.saved-view-menu.delete-action-boundary',
    ownedSelector.getByRole('button', { name: 'Excluir visualização' }),
  );
  await sample(
    'default.saved-view-menu.set-default-action-boundary',
    ownedSelector.getByRole('button', { name: 'Definir como visualização padrão' }),
  );
  const disabledResetAction = ownedSelector.getByRole('button', {
    name: 'Restaurar visualização',
  });
  await expect(disabledResetAction).toBeDisabled();
  await sample('disabled.saved-view-menu.reset-action-boundary', disabledResetAction);
  const disabledSaveAction = ownedSelector.getByRole('button', {
    name: 'Salvar visualização',
  });
  await expect(disabledSaveAction).toBeDisabled();
  await sample('disabled.saved-view-menu.save-action-boundary', disabledSaveAction);
  await sample(
    'default.saved-view-menu.create-action-boundary',
    ownedSelector.getByRole('button', { name: 'Criar visualização' }),
  );
  await page.keyboard.press('Escape');

  for (const productState of [
    {
      mode: 'loading',
      heading: 'Carregando visualizações do elenco…',
      id: 'loading.repository-state.text',
    },
    {
      mode: 'invalid',
      heading: 'Não foi possível carregar suas visualizações',
      id: 'invalid.repository-state.text',
    },
    {
      mode: 'unavailable',
      heading: 'Visualizações personalizadas indisponíveis',
      id: 'unavailable.repository-state.text',
    },
    {
      mode: 'migrated',
      heading: 'Visualizações do elenco atualizadas',
      id: 'migrated.repository-state.text',
    },
    {
      mode: 'corrupt',
      heading: 'Uma visualização corrompida foi isolada',
      id: 'recovered.repository-state.text',
    },
    {
      mode: 'future-schema',
      heading: 'Esta visualização exige uma versão mais recente',
      id: 'future-schema.repository-state.text',
    },
  ] as const satisfies readonly {
    readonly heading: string;
    readonly id: TableViewContrastRequirementId;
    readonly mode: string;
  }[]) {
    await setTableViewBridgeControl(page, { nextLoad: productState.mode });
    await page.reload();
    const stateLocator =
      productState.mode === 'migrated'
        ? page.getByRole('status', { name: productState.heading })
        : page.getByRole('heading', { name: productState.heading });
    await sample(productState.id, stateLocator);
  }

  await setTableViewBridgeControl(page, { nextLoad: 'loaded' });
  await page.reload();
  await createSavedView(page, 'Contraste de falha');
  await page.getByRole('button', { name: 'Configurar tabela' }).click();
  const failureCustomizer = page.getByRole('dialog', { name: 'Configurar tabela' });
  await failureCustomizer.getByRole('searchbox', { name: 'Buscar colunas' }).fill('Idade');
  await failureCustomizer.getByRole('button', { name: 'Ocultar Idade' }).click();
  await setTableViewBridgeControl(page, { failNextSave: true });
  await failureCustomizer.getByRole('button', { name: 'Salvar visualização' }).click();
  await sample(
    'save-failure.dialog-heading.text',
    page.getByRole('heading', { name: 'Não foi possível salvar a visualização' }),
  );
  await sample(
    'save-failure.retry-action.boundary',
    page.getByRole('button', { name: 'Tentar salvar visualização' }),
  );

  const requiredIds = tableViewContrastMatrix.map(({ id }) => id);
  expect(new Set(requiredIds).size).toBe(requiredIds.length);
  expect([...new Set(tableViewContrastMatrix.map(({ state }) => state))].sort()).toEqual(
    [...wcagStateInventory].sort(),
  );
  expect(samples.map(({ id }) => id).sort()).toEqual([...requiredIds].sort());
  expect([...new Set(samples.map(({ state }) => state))].sort()).toEqual(
    [...wcagStateInventory].sort(),
  );

  await testInfo.attach('wcag-contrast-matrix.json', {
    body: Buffer.from(
      JSON.stringify(
        {
          states: wcagStateInventory,
          requirements: tableViewContrastMatrix,
          samples,
        },
        null,
        2,
      ),
    ),
    contentType: 'application/json',
  });
});

test('200% zoom reflow proves long Portuguese controls have no clipping or overlap', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 960,
    height: 540,
    screenWidth: 1920,
    screenHeight: 1080,
    deviceScaleFactor: 2,
    mobile: false,
  });
  await page.goto(developmentUrl);
  const longViewName =
    'Visualização extensa para análise técnica do elenco principal em preparação';
  await createSavedView(page, longViewName);

  const longViewTrigger = page.getByRole('button', {
    name: `Visualização da tabela: ${longViewName}`,
  });
  await expect(longViewTrigger.locator('strong')).toHaveAttribute('title', longViewName);
  await longViewTrigger.click();
  const longViewOption = page
    .getByRole('dialog', { name: 'Visualização da tabela' })
    .getByRole('button', { name: new RegExp(longViewName, 'u') });
  await expect(longViewOption).toHaveAttribute('title', longViewName);
  await page.keyboard.press('Escape');

  const customizerTrigger = page.getByRole('button', { name: 'Configurar tabela' });
  await customizerTrigger.focus();
  const focusRect = await customizerTrigger.boundingBox();
  expect(focusRect).not.toBeNull();
  expect(focusRect?.x).toBeGreaterThanOrEqual(0);
  const layoutWidth = await page.evaluate(() => window.innerWidth);
  expect((focusRect?.x ?? 0) + (focusRect?.width ?? 0)).toBeLessThanOrEqual(layoutWidth);
  await customizerTrigger.click();
  const customizer = page.getByRole('dialog', { name: 'Configurar tabela' });
  await expect(customizer.getByRole('searchbox', { name: 'Buscar colunas' })).toBeFocused();
  await customizer.getByRole('searchbox', { name: 'Buscar colunas' }).fill('Jogador');
  await expect(customizer.getByText('Obrigatória para identificar cada jogador.')).toBeVisible();

  const clippingTargets = [
    {
      label: 'customizer heading',
      locator: customizer.getByRole('heading', { name: 'Configurar tabela' }),
    },
    {
      label: 'required-column explanation',
      locator: customizer.getByText('Obrigatória para identificar cada jogador.'),
    },
    {
      label: 'visibility action',
      locator: customizer.getByRole('button', { name: 'Ocultar Jogador' }),
    },
    {
      label: 'restore-columns action',
      locator: customizer.getByRole('button', { name: 'Restaurar colunas' }),
    },
    {
      label: 'restore-view action',
      locator: customizer.getByRole('button', { name: 'Restaurar visualização' }),
    },
    {
      label: 'discard action',
      locator: customizer.getByRole('button', { name: 'Descartar ajustes' }),
    },
    {
      label: 'save action',
      locator: customizer.getByRole('button', { name: 'Salvar visualização' }),
    },
  ] as const;
  for (const target of clippingTargets) {
    await target.locator.scrollIntoViewIfNeeded();
    const geometry = await target.locator.evaluate((element) => {
      const html = element as HTMLElement;
      return {
        clientHeight: html.clientHeight,
        clientWidth: html.clientWidth,
        scrollHeight: html.scrollHeight,
        scrollWidth: html.scrollWidth,
      };
    });
    expect(
      geometry.scrollWidth,
      `${target.label} must not clip horizontally at 200% zoom`,
    ).toBeLessThanOrEqual(geometry.clientWidth + 1);
    expect(
      geometry.scrollHeight,
      `${target.label} must not clip vertically at 200% zoom`,
    ).toBeLessThanOrEqual(geometry.clientHeight + 1);
  }

  const customizerBody = customizer.locator('.table-view-customizer__content');
  await customizerBody.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  const zoomGeometry = await customizer.evaluate((element) => {
    const root = element as HTMLElement;
    const required = (selector: string): HTMLElement => {
      const target = root.querySelector<HTMLElement>(selector);
      if (target === null) throw new Error(`Missing zoom geometry target: ${selector}`);
      return target;
    };
    const buttonByName = (name: string): HTMLButtonElement => {
      const target = [...root.querySelectorAll<HTMLButtonElement>('button')].find(
        (button) => button.textContent?.trim() === name,
      );
      if (target === undefined) throw new Error(`Missing zoom action: ${name}`);
      return target;
    };
    const rect = (target: Element) => target.getBoundingClientRect();
    const overlaps = (first: DOMRect, second: DOMRect) =>
      first.left < second.right &&
      first.right > second.left &&
      first.top < second.bottom &&
      first.bottom > second.top;
    const containedHorizontally = (outer: DOMRect, inner: DOMRect) =>
      inner.left >= outer.left - 1 && inner.right <= outer.right + 1;

    const outer = rect(root);
    const heading = rect(required('.rv-overlay__header h3'));
    const close = rect(required('.rv-overlay__header button'));
    const discard = rect(buttonByName('Descartar ajustes'));
    const save = rect(buttonByName('Salvar visualização'));
    return {
      actionsContained: containedHorizontally(outer, discard) && containedHorizontally(outer, save),
      actionsOverlap: overlaps(discard, save),
      closeContained: containedHorizontally(outer, close),
      headerControlsOverlap: overlaps(heading, close),
      headingContained: containedHorizontally(outer, heading),
    };
  });
  expect(zoomGeometry.headingContained).toBe(true);
  expect(zoomGeometry.closeContained).toBe(true);
  expect(zoomGeometry.headerControlsOverlap).toBe(false);
  expect(zoomGeometry.actionsContained).toBe(true);
  expect(zoomGeometry.actionsOverlap).toBe(false);
  await expect(customizer.getByRole('heading', { name: 'Configurar tabela' })).toBeVisible();
  await expect(customizer.getByRole('button', { name: 'Fechar personalização' })).toBeVisible();

  const reducedDuration = await customizer.evaluate(
    (element) => getComputedStyle(element).transitionDuration,
  );
  const reducedDurationSeconds = reducedDuration.endsWith('ms')
    ? Number.parseFloat(reducedDuration) / 1000
    : Number.parseFloat(reducedDuration);
  expect(reducedDurationSeconds).toBeLessThanOrEqual(0.00001);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  const tableOverflow = await page.locator('.squad-table-wrap').evaluate((element) => {
    const html = element as HTMLElement;
    const maximum = html.scrollWidth - html.clientWidth;
    html.scrollLeft = maximum;
    const reachedEnd = Math.abs(html.scrollLeft - maximum) <= 1;
    html.scrollLeft = 0;
    return { localOverflow: maximum > 0, reachedEnd };
  });
  expect(tableOverflow).toEqual({ localOverflow: true, reachedEnd: true });
  await expect(customizer.getByRole('button', { name: 'Salvar visualização' })).toBeVisible();
  await expect(customizer.getByRole('button', { name: 'Descartar ajustes' })).toBeVisible();
});

test('visual baseline and four-viewport geometry preserve the dense table and inspector', async ({
  page,
}, testInfo) => {
  const projectViewport = {
    'desktop-1366x768': { width: 1366, height: 768 },
    'desktop-1920x1080': { width: 1920, height: 1080 },
    'desktop-2560x1080': { width: 2560, height: 1080 },
  } as const;
  const currentViewport =
    projectViewport[testInfo.project.name as keyof typeof projectViewport] ??
    projectViewport['desktop-1366x768'];
  const viewports =
    testInfo.project.name === 'desktop-1366x768'
      ? [{ width: 1024, height: 768 }, currentViewport, { width: 1440, height: 900 }]
      : [currentViewport];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto(developmentUrl);
    await Promise.all([
      page.waitForNavigation(),
      page.evaluate(() => {
        window.localStorage.clear();
        window.location.reload();
      }),
    ]);
    await expect(page.getByRole('table')).toBeVisible();
    await expect(page.locator('.player-dossier')).toBeVisible();
    const shell = page.locator('.manager-shell');
    const shouldCollapseSidebar = viewport.width < 1280;
    const sidebarIsCollapsed = await shell.evaluate((element) =>
      element.hasAttribute('data-sidebar-collapsed'),
    );
    if (sidebarIsCollapsed !== shouldCollapseSidebar) {
      await page
        .getByRole('button', {
          name: sidebarIsCollapsed ? 'Expandir navegação' : 'Recolher navegação',
        })
        .click();
    }
    if (shouldCollapseSidebar) {
      await expect(shell).toHaveAttribute('data-sidebar-collapsed', 'true');
    } else {
      await expect(shell).not.toHaveAttribute('data-sidebar-collapsed');
    }

    const geometry = await page.evaluate(() => {
      const layout = document.querySelector<HTMLElement>('.squad-layout');
      const tablePanel = document.querySelector<HTMLElement>('.squad-panel');
      const inspector = document.querySelector<HTMLElement>('.player-dossier');
      const tableOverflow = document.querySelector<HTMLElement>('.squad-table-wrap');
      if (layout === null || tablePanel === null || inspector === null || tableOverflow === null) {
        throw new Error('Expected squad geometry nodes were not rendered.');
      }
      const layoutRect = layout.getBoundingClientRect();
      const tableRect = tablePanel.getBoundingClientRect();
      const inspectorRect = inspector.getBoundingClientRect();
      const firstHeader = tableOverflow.querySelector<HTMLElement>('thead th:first-child');
      const lastHeader = tableOverflow.querySelector<HTMLElement>('thead th:last-child');
      const overflowRect = tableOverflow.getBoundingClientRect();
      const maximumScrollLeft = tableOverflow.scrollWidth - tableOverflow.clientWidth;
      tableOverflow.scrollLeft = 0;
      const firstEdgeReachable =
        firstHeader !== null && firstHeader.getBoundingClientRect().left >= overflowRect.left - 1;
      tableOverflow.scrollLeft = maximumScrollLeft;
      const lastEdgeReachable =
        lastHeader !== null && lastHeader.getBoundingClientRect().right <= overflowRect.right + 1;
      tableOverflow.scrollLeft = 0;
      const horizontalScrollOwners = [...document.querySelectorAll<HTMLElement>('*')]
        .filter((element) => {
          const overflowX = getComputedStyle(element).overflowX;
          return (
            (overflowX === 'auto' || overflowX === 'scroll') &&
            element.scrollWidth > element.clientWidth + 1
          );
        })
        .map((element) => element.className);
      return {
        documentOverflow: document.documentElement.scrollWidth > window.innerWidth,
        tableRatio: tableRect.width / layoutRect.width,
        tableLocalOverflow: maximumScrollLeft > 0,
        firstEdgeReachable,
        lastEdgeReachable,
        horizontalScrollOwners,
        inspectorReflowed: inspectorRect.top >= tableRect.bottom - 1,
      };
    });
    expect(geometry.documentOverflow).toBe(false);
    expect(geometry.firstEdgeReachable).toBe(true);
    expect(geometry.lastEdgeReachable).toBe(true);
    expect(
      geometry.horizontalScrollOwners.every((className) =>
        String(className).includes('squad-table-wrap'),
      ),
    ).toBe(true);
    if (viewport.width < 2560) expect(geometry.tableLocalOverflow).toBe(true);
    if (viewport.width >= 1280) {
      expect(geometry.tableRatio).toBeGreaterThanOrEqual(0.65);
    } else {
      expect(geometry.inspectorReflowed).toBe(true);
    }

    await page.getByRole('button', { name: 'Configurar tabela' }).click();
    const customizer = page.getByRole('dialog', { name: 'Configurar tabela' });
    if (viewport.width === 1024) {
      const heading = customizer.getByRole('heading', { name: 'Configurar tabela' });
      const close = customizer.getByRole('button', { name: 'Fechar personalização' });
      await expect(heading).toBeVisible();
      await expect(close).toBeVisible();
      const compactGeometry = await customizer.evaluate((element) => {
        const root = element as HTMLElement;
        const body = root.querySelector<HTMLElement>('.table-view-customizer__content');
        const columns = root.querySelector<HTMLElement>('.table-view-customizer__columns');
        const headingElement = root.querySelector<HTMLElement>('.rv-overlay__header h3');
        const closeElement = root.querySelector<HTMLElement>('.rv-overlay__header button');
        if (body === null || columns === null || headingElement === null || closeElement === null) {
          throw new Error('Expected compact customizer geometry nodes were not rendered.');
        }
        const rootRect = root.getBoundingClientRect();
        const headingRect = headingElement.getBoundingClientRect();
        const closeRect = closeElement.getBoundingClientRect();
        const initialHeadingTop = headingRect.top;
        const initialCloseTop = closeRect.top;
        body.scrollTop = body.scrollHeight;
        return {
          bodyClientHeight: body.clientHeight,
          bodyOverflowY: getComputedStyle(body).overflowY,
          bodyScrollHeight: body.scrollHeight,
          closeContained:
            closeRect.left >= rootRect.left - 1 && closeRect.right <= rootRect.right + 1,
          closeTopDelta: Math.abs(closeElement.getBoundingClientRect().top - initialCloseTop),
          columnsOverflowY: getComputedStyle(columns).overflowY,
          headingContained:
            headingRect.left >= rootRect.left - 1 && headingRect.right <= rootRect.right + 1,
          headingTopDelta: Math.abs(headingElement.getBoundingClientRect().top - initialHeadingTop),
          width: rootRect.width,
        };
      });
      expect(compactGeometry.width).toBeGreaterThanOrEqual(360);
      expect(compactGeometry.width).toBeLessThanOrEqual(420);
      expect(compactGeometry.bodyScrollHeight).toBeGreaterThan(compactGeometry.bodyClientHeight);
      expect(compactGeometry.bodyOverflowY).toBe('auto');
      expect(compactGeometry.columnsOverflowY).toBe('visible');
      expect(compactGeometry.headingContained).toBe(true);
      expect(compactGeometry.closeContained).toBe(true);
      expect(compactGeometry.headingTopDelta).toBeLessThanOrEqual(1);
      expect(compactGeometry.closeTopDelta).toBeLessThanOrEqual(1);
      await expect(heading).toBeVisible();
      await expect(close).toBeVisible();
    }
    await customizer.getByRole('searchbox', { name: 'Buscar colunas' }).fill('Idade');
    await customizer.getByRole('button', { name: 'Ocultar Idade' }).click();
    await expect(customizer.getByText('Alterações não salvas')).toBeVisible();
    await waitForStableFrame(page);
    await expect(page).toHaveScreenshot(`table-view-${viewport.width}x${viewport.height}.png`, {
      animations: 'disabled',
      caret: 'hide',
    });
  }
});
