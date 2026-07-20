import { expect, test, type Locator, type Page } from '@playwright/test';

import type { TableViewRepositoryState } from '../apps/desktop/src/matchday/client.js';
import {
  coachProfileFixture,
  playerProfileFixture,
} from '../apps/desktop/src/profiles/test-fixtures.js';
import { SQUAD_SYSTEM_VIEW } from '../apps/desktop/src/matchday/squad-table-schema.js';
import { createTacticalPlan } from '../apps/desktop/src/matchday/tactics-model.js';
import {
  attachTacticalModelFixture,
  tacticalStrategyCatalogFixture,
} from '../apps/desktop/src/matchday/tactical-test-fixture.js';
import type {
  MatchdayState,
  Player,
  TacticalPlanProposal,
  TacticalRecommendation,
} from '../apps/desktop/src/matchday/types.js';
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

const pointerDragTo = async (
  page: Page,
  source: Locator,
  target: Locator,
  targetPosition?: { readonly x: number; readonly y: number },
) => {
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();
  if (!sourceBox || !targetBox) throw new Error('Pointer drag targets must be visible.');
  const start = { x: sourceBox.x + sourceBox.width / 2, y: sourceBox.y + sourceBox.height / 2 };
  const end = {
    x: targetBox.x + (targetPosition?.x ?? targetBox.width / 2),
    y: targetBox.y + (targetPosition?.y ?? targetBox.height / 2),
  };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 3, start.y + 2);
  await expect(page.locator('.tactical-drag-overlay')).toBeHidden();
  await page.mouse.move(end.x, end.y, { steps: 8 });
  await expect(page.locator('.tactical-drag-overlay')).toBeVisible();
  await page.mouse.up();
};

const chooseFormation = async (page: Page, formation: string) => {
  await page.getByRole('button', { name: /^Formação: .*Abrir biblioteca$/u }).click();
  const picker = page.getByRole('dialog', { name: 'Escolher formação' });
  await picker.getByRole('searchbox', { name: 'Buscar formação' }).fill(formation);
  await picker.getByRole('option', { name: new RegExp(`^${formation}`, 'u') }).click();
  const preview = page.getByRole('alertdialog', { name: `Aplicar ${formation}?` });
  await expect(preview).toContainText('Titulares mantidos');
  await preview.getByRole('button', { name: 'Aplicar sugestão' }).click();
};

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

const initialStateBase: MatchdayState = {
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

const initialTacticalVariation = attachTacticalModelFixture(
  createTacticalPlan(initialStateBase.players, initialStateBase.formation),
);
const initialState: MatchdayState = {
  ...initialStateBase,
  tacticalLibrary: {
    schemaVersion: 1,
    revision: 0,
    activeVariationId: initialTacticalVariation.variationId,
    primaryVariationId: initialTacticalVariation.variationId,
    variations: [initialTacticalVariation],
  },
};

const browserPlayerProfiles = [
  ...initialState.players.map((player) =>
    playerProfileFixture({
      entityId: player.id,
      fullName: player.name,
      knownName: player.shortName,
      position: player.position,
      nationality: player.nationality,
    }),
  ),
  playerProfileFixture({
    entityId: 'rv-fdv-01',
    fullName: 'Martín Gouveia',
    knownName: 'M. Gouveia',
    position: 'ST',
    nationality: 'URU',
    knowledge: 'partial',
  }),
];
const browserCoachProfiles = [
  coachProfileFixture(),
  coachProfileFixture({ entityId: 'coach.ferroviario.head', external: true }),
];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    ({
      seed,
      storageKey,
      strategyCatalog,
      tableSeed,
      tableStorageKey,
      tableControlKey,
      playerProfiles,
      coachProfiles,
    }) => {
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

      const asset = (id: string, entityId: string, kind: string, path: string) => ({
        id,
        entityId,
        kind,
        path,
        mediaType: path.endsWith('.svg') ? 'image/svg+xml' : 'image/webp',
        checksum: 'browser-fixture',
        provenance: 'Rivallo browser fixture',
        rights: 'test-only',
        privateUse: false,
      });
      const worldReferenceCatalog = {
        assets: [
          ...Array.from({ length: 18 }, (_, index) => {
            const suffix = String(index + 1).padStart(2, '0');
            return asset(
              `asset.player.rv-${suffix}.portrait`,
              `rv-${suffix}`,
              'playerPortrait',
              `assets/player-faces/rv-${suffix}.webp`,
            );
          }),
          asset(
            'asset.coach.helena-sampaio.portrait',
            'coach.aurora.head',
            'coachPortrait',
            'assets/coach-faces/helena-sampaio.webp',
          ),
          asset(
            'asset.coach.browser-aurora.portrait',
            'coach.aurora.1',
            'coachPortrait',
            'assets/coach-faces/helena-sampaio.webp',
          ),
          asset(
            'asset.coach.raul-mendonza.portrait',
            'coach.ferroviario.head',
            'coachPortrait',
            'assets/coach-faces/raul-mendonza.webp',
          ),
          ...[
            ['br', 'bra'],
            ['ar', 'arg'],
            ['uy', 'ury'],
            ['pt', 'prt'],
          ].map(([iso2, entityId]) =>
            asset(`asset.flag.${iso2}`, entityId, 'nationFlag', `assets/flags/${iso2}.svg`),
          ),
        ],
        nations: [
          ['bra', 'Brasil', 'BR', 'BRA', ['BR', 'BRA']],
          ['arg', 'Argentina', 'AR', 'ARG', ['AR', 'ARG']],
          ['ury', 'Uruguai', 'UY', 'URY', ['UY', 'URY', 'URU']],
          ['prt', 'Portugal', 'PT', 'PRT', ['PT', 'PRT', 'POR']],
        ].map(([id, name, iso2, iso3, aliases]) => ({
          id,
          name,
          iso2,
          iso3,
          aliases,
          confederationId: null,
          flagAssetId: `asset.flag.${String(iso2).toLocaleLowerCase('en-US')}`,
          externalIds: [],
        })),
      };

      const bridge = {
        invoke: async (command: string, args: Record<string, unknown> = {}) => {
          if (command === 'world_reference_catalog') {
            return structuredClone(worldReferenceCatalog);
          }
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
          if (command === 'player_profile' || command === 'preview_player_profile') {
            const profile = playerProfiles.find(
              ({ identity }) => identity.entityId === args.playerId,
            );
            if (!profile) throw new Error('Jogador não encontrado.');
            return structuredClone(profile);
          }
          if (command === 'coach_profile') {
            const profile = coachProfiles.find(
              ({ identity }) => identity.entityId === args.coachId,
            );
            if (!profile) throw new Error('Treinador não encontrado.');
            return structuredClone(profile);
          }
          const referenceFor = (
            profile: (typeof playerProfiles)[number] | (typeof coachProfiles)[number],
          ) => {
            const player = 'naturalPosition' in profile;
            return {
              entityId: profile.identity.entityId,
              entityType: player ? ('player' as const) : ('coach' as const),
              name: profile.identity.fullName,
              secondaryLabel: player ? profile.naturalPosition : profile.role,
              route: `/${player ? 'players' : 'coaches'}/${profile.identity.entityId}`,
              nationality: profile.identity.nationality,
              clubId: profile.identity.clubId,
              visualCode: player ? profile.naturalPosition : 'TEC',
              perceivedRating: player ? profile.currentAbility.perceived : profile.reputation,
              confidence: profile.knowledge.confidence,
              knowledgeLevel: profile.knowledge.knowledgeLevel,
            };
          };
          if (command === 'club_profile') {
            const club = [state.club, state.opponent].find(({ id }) => id === args.clubId);
            if (!club) throw new Error('Clube não encontrado.');
            const players = playerProfiles
              .filter(
                ({ identity }) =>
                  identity.clubId === club.id || identity.clubShortName === club.shortName,
              )
              .map(referenceFor);
            const staff = coachProfiles
              .filter(
                ({ identity }) =>
                  identity.clubId === club.id || identity.clubShortName === club.shortName,
              )
              .map(referenceFor);
            const own = club.id === state.club.id;
            return {
              schemaVersion: 1,
              revision: 1,
              entityId: club.id,
              name: club.name,
              shortName: club.shortName,
              city: club.city,
              primaryColor: club.primaryColor,
              countryCode: club.countryCode ?? 'BRA',
              competitionName: club.competitionName ?? 'Liga Horizonte',
              stadiumName: club.stadiumName ?? null,
              currentPosition: null,
              nextFixture: null,
              form: [],
              headCoach: staff[0] ?? null,
              players,
              staff,
              tactics: own
                ? {
                    formation: state.formation,
                    mentality: 'Equilibrada',
                    style: 'Balanced',
                    pressure: 50,
                    defensiveLine: 50,
                    transition: 'Balanced / Balanced',
                    confidence: 100,
                    source: 'Plano tático ativo do clube',
                    updatedAt: Date.now(),
                  }
                : null,
              knowledge: {
                ...playerProfiles[0]!.knowledge,
                entityId: `club:${club.id}`,
                confidence: own ? 100 : 61,
                knowledgeLevel: own ? 'ownClub' : 'partial',
              },
            };
          }
          if (command === 'nation_profile') {
            const code = String(args.nationId ?? '').toLocaleUpperCase('pt-BR');
            const canonical = code === 'BR' || code === 'BRA' ? 'BRA' : code;
            if (canonical !== 'BRA') throw new Error('Nação não encontrada.');
            const clubs = [state.club, state.opponent].map((club) => ({
              entityId: club.id,
              entityType: 'club' as const,
              name: club.name,
              secondaryLabel: club.city,
              route: `/clubs/${club.id}`,
              nationality: 'BRA',
              clubId: club.id,
              visualCode: club.shortName,
              perceivedRating: null,
              confidence: club.id === state.club.id ? 100 : 61,
              knowledgeLevel:
                club.id === state.club.id ? ('ownClub' as const) : ('partial' as const),
            }));
            return {
              schemaVersion: 1,
              revision: 1,
              entityId: 'bra',
              name: 'Brasil',
              code: 'BRA',
              confederation: 'CONMEBOL',
              clubs,
              players: playerProfiles
                .filter(({ identity }) => identity.nationality === 'BRA')
                .map(referenceFor),
              coaches: coachProfiles
                .filter(({ identity }) => identity.nationality === 'BRA')
                .map(referenceFor),
              competitions: ['Liga Horizonte'],
              knowledge: {
                ...playerProfiles[0]!.knowledge,
                entityId: 'nation:bra',
                confidence: 100,
                knowledgeLevel: 'wellKnown',
              },
            };
          }
          if (command === 'search_profiles') {
            const query = String(args.query ?? '').toLocaleLowerCase('pt-BR');
            const people = [...playerProfiles, ...coachProfiles]
              .filter((profile) =>
                [profile.identity.fullName, profile.identity.knownName, profile.identity.clubName]
                  .join(' ')
                  .toLocaleLowerCase('pt-BR')
                  .includes(query),
              )
              .map((profile) => {
                const player = 'naturalPosition' in profile;
                return {
                  entityId: profile.identity.entityId,
                  entityType: player ? ('player' as const) : ('coach' as const),
                  name: profile.identity.fullName,
                  secondaryLabel: `${profile.identity.clubName} · ${player ? profile.naturalPosition : profile.role}`,
                  route: `/${player ? 'players' : 'coaches'}/${profile.identity.entityId}`,
                  knowledgeLevel: profile.knowledge.knowledgeLevel,
                  context: `${profile.identity.clubName} · ${player ? profile.naturalPosition : profile.role}`,
                  visualCode: player ? profile.naturalPosition : 'TEC',
                  confidence: profile.knowledge.confidence,
                };
              });
            const clubs = [state.club, state.opponent]
              .filter((club) =>
                `${club.name} ${club.shortName} ${club.city}`
                  .toLocaleLowerCase('pt-BR')
                  .includes(query),
              )
              .map((club) => ({
                entityId: club.id,
                entityType: 'club' as const,
                name: club.name,
                secondaryLabel: club.competitionName ?? club.city,
                route: `/clubs/${club.id}`,
                knowledgeLevel:
                  club.id === state.club.id ? ('ownClub' as const) : ('partial' as const),
                context: `${club.city} · ${club.shortName}`,
                visualCode: club.shortName,
                confidence: club.id === state.club.id ? 100 : 61,
              }));
            const nations = 'brasil bra conmebol'.includes(query)
              ? [
                  {
                    entityId: 'bra',
                    entityType: 'nation' as const,
                    name: 'Brasil',
                    secondaryLabel: 'BRA · universo carregado',
                    route: '/nations/bra',
                    knowledgeLevel: 'wellKnown' as const,
                    context: 'CONMEBOL',
                    visualCode: 'BRA',
                    confidence: null,
                  },
                ]
              : [];
            return [...people, ...clubs, ...nations];
          }
          if (command === 'tactical_strategy_catalog') return structuredClone(strategyCatalog);
          if (command === 'preview_tactical_plan') {
            const proposal = args.proposal as TacticalPlanProposal;
            const existing = state.tacticalLibrary?.variations.find(
              ({ variationId }) => variationId === proposal.variationId,
            );
            if (!existing?.tacticalModel) throw new Error('Modelo tático ausente.');
            return {
              model: {
                ...existing.tacticalModel,
                config: proposal.tacticalConfig ?? existing.tacticalModel.config,
              },
              comparison: null,
            };
          }
          if (command === 'tactical_match_snapshot') {
            const variation = state.tacticalLibrary?.variations.find(
              ({ variationId }) => variationId === args.variationId,
            );
            if (!variation?.tacticalModel) throw new Error('Snapshot tático ausente.');
            return variation.tacticalModel.matchSnapshot;
          }
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
            const proposal = args.proposal as TacticalPlanProposal;
            const library = state.tacticalLibrary;
            const existing = library?.variations.find(
              ({ variationId }) => variationId === proposal.variationId,
            );
            const actualRevision = existing?.revision ?? 0;
            if (proposal.expectedRevision !== actualRevision) {
              throw new Error(
                `tactical_plan_conflict:${proposal.expectedRevision}:${actualRevision}`,
              );
            }
            const acceptedRevision = actualRevision + 1;
            const now = Date.now();
            const selected = new Set(proposal.placements.map(({ playerId }) => playerId));
            const variationBase = {
              schemaVersion: 4 as const,
              variationId: proposal.variationId,
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
              createdAt: existing?.createdAt ?? now,
              updatedAt: now,
            };
            const baseModel =
              existing?.tacticalModel ??
              library?.variations.find(
                ({ variationId }) => variationId === library.activeVariationId,
              )?.tacticalModel;
            if (!baseModel) throw new Error('Modelo tático ausente.');
            const variation = {
              ...variationBase,
              tacticalModel: {
                ...baseModel,
                config: proposal.tacticalConfig ?? baseModel.config,
                matchSnapshot: {
                  ...baseModel.matchSnapshot,
                  tacticalPlanId: proposal.variationId,
                  variationId: proposal.variationId,
                  revision: acceptedRevision,
                  starters: proposal.placements.map(({ playerId }) => playerId),
                  bench: proposal.bench,
                  normalizedPlacements: variationBase.placements,
                  createdAt: now,
                },
              },
            };
            const variations = library
              ? [
                  ...library.variations.filter(
                    ({ variationId }) => variationId !== proposal.variationId,
                  ),
                  variation,
                ]
              : [variation];
            state = {
              ...state,
              formation: proposal.formation,
              approach: proposal.approach,
              tacticalLibrary: {
                schemaVersion: 1,
                revision: (library?.revision ?? 0) + (existing ? 0 : 1),
                activeVariationId: proposal.variationId,
                primaryVariationId: library?.primaryVariationId ?? proposal.variationId,
                variations,
              },
              lastTacticalEvent: {
                kind: 'variationSaved',
                variationId: proposal.variationId,
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
          if (command === 'update_tactical_library') {
            const commandProposal = args.request as {
              kind: 'activate' | 'setPrimary' | 'delete';
              expectedLibraryRevision: number;
              variationId: string;
            };
            const library = state.tacticalLibrary;
            if (!library) throw new Error('Biblioteca tática ausente.');
            if (commandProposal.expectedLibraryRevision !== library.revision) {
              throw new Error(
                `tactical_library_conflict:${commandProposal.expectedLibraryRevision}:${library.revision}`,
              );
            }
            const variations =
              commandProposal.kind === 'delete'
                ? library.variations.filter(
                    ({ variationId }) => variationId !== commandProposal.variationId,
                  )
                : library.variations;
            const primaryVariationId =
              commandProposal.kind === 'setPrimary'
                ? commandProposal.variationId
                : library.primaryVariationId === commandProposal.variationId &&
                    commandProposal.kind === 'delete'
                  ? variations[0]!.variationId
                  : library.primaryVariationId;
            const activeVariationId =
              commandProposal.kind === 'activate'
                ? commandProposal.variationId
                : library.activeVariationId === commandProposal.variationId &&
                    commandProposal.kind === 'delete'
                  ? primaryVariationId
                  : library.activeVariationId;
            const active = variations.find(({ variationId }) => variationId === activeVariationId)!;
            state = {
              ...state,
              formation: active.formation,
              tacticalLibrary: {
                ...library,
                revision: library.revision + 1,
                activeVariationId,
                primaryVariationId,
                variations,
              },
              players: state.players.map((player) => ({
                ...player,
                selected: active.placements.some(({ playerId }) => playerId === player.id),
              })),
              lastTacticalEvent: {
                kind:
                  commandProposal.kind === 'activate'
                    ? 'variationActivated'
                    : commandProposal.kind === 'setPrimary'
                      ? 'primaryVariationChanged'
                      : 'variationDeleted',
                variationId: commandProposal.variationId,
                acceptedLibraryRevision: library.revision + 1,
              } as MatchdayState['lastTacticalEvent'],
            };
            persistState();
            return { state, event: state.lastTacticalEvent };
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
      strategyCatalog: tacticalStrategyCatalogFixture(),
      tableSeed: tableViewSeed,
      tableStorageKey: tableViewBridgeStateKey,
      tableControlKey: tableViewBridgeControlKey,
      playerProfiles: browserPlayerProfiles,
      coachProfiles: browserCoachProfiles,
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

test('opens global player and coach profiles with partial knowledge and responsive disclosure', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'desktop-1366x768',
    'The complete profile matrix only needs one Chromium project.',
  );

  await page.goto(developmentUrl);
  const search = page.getByRole('searchbox', {
    name: 'Buscar jogadores, treinadores, clubes e nações',
  });
  await search.fill('Martín');
  await page.getByRole('button', { name: /Martín Gouveia/u }).click();
  await expect(page).toHaveURL(/\/players\/rv-fdv-01$/u);
  await expect(page.getByRole('heading', { name: 'M. Gouveia' })).toBeVisible();
  await expect(page.getByText('Observação parcial', { exact: true })).toBeVisible();
  await expect(page.getByText('73–81').first()).toBeVisible();

  const rolesTab = page.getByRole('tab', { name: 'Posições e funções' });
  await rolesTab.click();
  await expect(page.getByRole('heading', { name: 'Encaixe no plano' })).toBeVisible();
  await rolesTab.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Desempenho' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.getByRole('tab', { name: 'Visão geral' }).click();

  for (const viewport of screenshotViewports) {
    await page.setViewportSize(viewport);
    await expect(page.locator('.profile-screen')).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({
      path: `.planning/phases/06.4-sm-5-player-coach-profiles-and-explainable-ratings/screenshots/player-profile-${viewport.width}x${viewport.height}.png`,
      fullPage: true,
    });
  }

  await page.setViewportSize({ width: 1366, height: 768 });
  await search.fill('Héctor');
  await page.getByRole('button', { name: /Héctor Salvatierra/u }).click();
  await expect(page).toHaveURL(/\/coaches\/coach\.ferroviario\.head$/u);
  await expect(page.getByRole('heading', { name: 'H. Salvatierra' })).toBeVisible();
  await expect(page.locator('.profile-hero .coach-face img')).toBeVisible();
  await page.getByRole('tab', { name: 'Capacidades' }).click();
  await expect(page.getByText('Desenvolvimento de jovens')).toBeVisible();
  await expect(page.getByText('Precisão de avaliação')).toBeVisible();
  await page.screenshot({
    path: '.planning/phases/06.4-sm-5-player-coach-profiles-and-explainable-ratings/screenshots/coach-profile-1366x768.png',
    fullPage: true,
  });

  await page.evaluate(() => {
    document.body.style.zoom = '2';
  });
  await expect(page.getByRole('tab', { name: 'Capacidades' })).toBeVisible();
  await page.evaluate(() => {
    document.body.style.zoom = '';
  });
});

test('discovers all entity types and preserves context across club, coach and nation profiles', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'desktop-1366x768',
    'The cross-entity product flow only needs one Chromium project.',
  );

  await page.goto(developmentUrl);
  const search = page.getByRole('searchbox', {
    name: 'Buscar jogadores, treinadores, clubes e nações',
  });
  await search.fill('ra');
  const results = page.locator('.global-profile-results');
  await expect(
    results
      .locator('em')
      .filter({ hasText: /^Jogador/u })
      .first(),
  ).toBeVisible();
  await expect(
    results
      .locator('em')
      .filter({ hasText: /^Treinador/u })
      .first(),
  ).toBeVisible();
  await expect(
    results
      .locator('em')
      .filter({ hasText: /^Clube/u })
      .first(),
  ).toBeVisible();
  await expect(
    results
      .locator('em')
      .filter({ hasText: /^Nação/u })
      .first(),
  ).toBeVisible();
  await page.screenshot({
    path: '.planning/phases/06.4-sm-5-player-coach-profiles-and-explainable-ratings/screenshots/global-search-four-entities.png',
    fullPage: true,
  });

  await results.getByRole('button', { name: /^Aurora Futebol Clube Porto Claro/u }).click();
  await expect(page).toHaveURL(/\/clubs\/aurora-fc$/u);
  await expect(page.getByRole('heading', { name: 'Aurora Futebol Clube' })).toBeVisible();
  const clubNavigation = page.getByRole('button', { name: 'Clube' });
  const staffNavigation = page.getByRole('button', { name: 'Comissão técnica' });
  await expect(clubNavigation).toHaveAttribute('aria-current', 'page');
  await expect(staffNavigation).not.toHaveAttribute('aria-current');
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.screenshot({
    path: '.planning/phases/06.4-sm-5-player-coach-profiles-and-explainable-ratings/screenshots/club-own-1024x768.png',
    fullPage: true,
  });

  await staffNavigation.click();
  await expect(page.getByRole('tab', { name: 'Comissão' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(staffNavigation).toHaveAttribute('aria-current', 'page');
  await expect(clubNavigation).not.toHaveAttribute('aria-current');
  await expect(page.locator('.entity-reference-list .coach-face img')).toBeVisible();
  await page.getByRole('link', { name: /Abrir perfil de Marcelo Nunes/u }).click();
  await expect(page).toHaveURL(/\/coaches\/coach\.aurora\.1$/u);
  await page.goBack();
  await expect(page.getByRole('tab', { name: 'Comissão' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(staffNavigation).toHaveAttribute('aria-current', 'page');

  await page.getByRole('tab', { name: 'Visão geral' }).click();
  await expect(clubNavigation).toHaveAttribute('aria-current', 'page');
  await page.getByRole('link', { name: 'Abrir perfil de BRA' }).click();
  await expect(page).toHaveURL(/\/nations\/bra$/u);
  await expect(page.getByRole('heading', { name: 'Brasil' })).toBeVisible();
  await expect(page.locator('.profile-hero__flag img')).toBeVisible();
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.screenshot({
    path: '.planning/phases/06.4-sm-5-player-coach-profiles-and-explainable-ratings/screenshots/nation-brazil-1920x1080.png',
    fullPage: true,
  });
});

test('keeps every profile section reachable with one scroll viewport and explicit metric semantics', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'desktop-1366x768',
    'The complete profile scroll and semantics matrix only needs one Chromium project.',
  );

  await page.goto(developmentUrl);
  const globalSearch = page.getByRole('searchbox', {
    name: 'Buscar jogadores, treinadores, clubes e nações',
  });
  await globalSearch.fill('Héctor');
  await page.getByRole('button', { name: /Héctor Salvatierra/u }).click();

  const profile = page.getByRole('region', { name: 'Perfil global' });
  await expect(profile).toBeVisible();
  await page.getByRole('tab', { name: 'Capacidades' }).click();
  await expect(page.getByRole('heading', { name: 'Especialidades' })).toBeVisible();

  const scrollContract = await profile.evaluate((element) => {
    const root = element as HTMLElement;
    const nestedVerticalScrollers = [...root.querySelectorAll<HTMLElement>('*')].filter((child) => {
      const style = getComputedStyle(child);
      return (
        child.scrollHeight > child.clientHeight + 1 &&
        (style.overflowY === 'auto' || style.overflowY === 'scroll')
      );
    });
    return {
      clientHeight: root.clientHeight,
      overflowY: getComputedStyle(root).overflowY,
      scrollHeight: root.scrollHeight,
      nestedVerticalScrollers: nestedVerticalScrollers.map((child) => child.className),
    };
  });
  expect(scrollContract.overflowY).toBe('auto');
  expect(scrollContract.scrollHeight).toBeGreaterThan(scrollContract.clientHeight);
  expect(scrollContract.nestedVerticalScrollers).toEqual([]);

  await profile.focus();
  await page.keyboard.press('Home');
  await page.screenshot({ path: testInfo.outputPath('coach-profile-top.png') });
  const profileBox = await profile.boundingBox();
  if (!profileBox) throw new Error('Profile scroll viewport is not measurable.');
  await page.mouse.move(profileBox.x + profileBox.width / 2, profileBox.y + profileBox.height / 2);
  await page.mouse.wheel(0, 480);
  await expect.poll(() => profile.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  await page.screenshot({ path: testInfo.outputPath('coach-profile-middle.png') });

  await profile.focus();
  await page.keyboard.press('Home');
  await page.keyboard.press('PageDown');
  await expect.poll(() => profile.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  const pageDownTop = await profile.evaluate((element) => element.scrollTop);
  await page.keyboard.press('PageUp');
  await expect
    .poll(() => profile.evaluate((element) => element.scrollTop))
    .toBeLessThan(pageDownTop);
  await page.keyboard.press('End');
  await expect
    .poll(() =>
      profile.evaluate(
        (element) => element.scrollHeight - element.clientHeight - element.scrollTop,
      ),
    )
    .toBeLessThanOrEqual(2);
  await expect(page.getByRole('button', { name: 'Comparar' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('coach-profile-end.png') });

  const originalBodyOverflow = await page.evaluate(() => getComputedStyle(document.body).overflow);
  const compareTrigger = page.getByRole('button', { name: 'Comparar' });
  await compareTrigger.click();
  const comparisonSearch = page.getByRole('searchbox', { name: 'Buscar treinador' });
  await comparisonSearch.fill('Marcelo');
  await page.getByRole('button', { name: /Marcelo Nunes/u }).click();
  await expect(page.getByRole('heading', { name: 'Marcelo Nunes' })).toBeVisible();
  await expect(page.getByText('Reputação percebida').last()).toBeVisible();
  await profile.focus();
  await page.keyboard.press('End');
  await expect(page.getByRole('button', { name: 'Abrir perfil' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('coach-comparison-end.png') });
  await comparisonSearch.focus();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Comparar' })).toBeFocused();
  expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).toBe(
    originalBodyOverflow,
  );

  for (const viewport of screenshotViewports) {
    await page.setViewportSize(viewport);
    await profile.focus();
    await page.keyboard.press('End');
    await expect
      .poll(() =>
        profile.evaluate(
          (element) => element.scrollHeight - element.clientHeight - element.scrollTop,
        ),
      )
      .toBeLessThanOrEqual(2);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  }

  await page.setViewportSize({ width: 1024, height: 768 });
  await page.evaluate(() => {
    document.body.style.zoom = '2';
  });
  await profile.focus();
  await page.keyboard.press('End');
  await expect
    .poll(() =>
      profile.evaluate(
        (element) => element.scrollHeight - element.clientHeight - element.scrollTop,
      ),
    )
    .toBeLessThanOrEqual(2);
  await expect(page.getByRole('button', { name: 'Comparar' })).toBeVisible();
  await page.evaluate(() => {
    document.body.style.zoom = '';
  });

  await globalSearch.fill('Aurora');
  await page.getByRole('button', { name: /^Aurora Futebol Clube/u }).click();
  await expect(page.getByText(/jogadores no elenco · plantel principal/u)).toBeVisible();
  await expect(page.getByText('Dados internos do clube')).toBeVisible();
  await expect(page.getByText('Avaliação como treinador principal')).toBeVisible();
  await expect(page.getByText('Reputação percebida')).toBeVisible();
  await profile.evaluate((element) => {
    element.scrollTop = 0;
  });
  await page.screenshot({ path: testInfo.outputPath('club-profile-top.png') });
  await profile.evaluate((element) => {
    element.scrollTop = Math.max(0, (element.scrollHeight - element.clientHeight) / 2);
  });
  await page.screenshot({ path: testInfo.outputPath('club-profile-middle.png') });
  await profile.focus();
  await page.keyboard.press('End');
  await page.screenshot({ path: testInfo.outputPath('club-profile-end.png') });
  await page.getByRole('button', { name: 'Comissão técnica' }).click();
  await expect(page.getByRole('tab', { name: 'Comissão' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await profile.focus();
  await page.keyboard.press('End');
  await expect(page.locator('.entity-reference-list li').last()).toBeVisible();
  await expect(page.getByText(/Reputação \d+/u).last()).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('club-staff-end.png') });

  await globalSearch.fill('Caio');
  await page.getByRole('button', { name: /Caio Brandão/u }).click();
  await expect(page.getByText('OVR atual').first()).toBeVisible();
  await expect(page.getByText('No plano atual').first()).toBeVisible();
  await expect(page.getByText('Potencial estimado')).toBeVisible();
  await expect(page.getByText('Confiança da projeção: 72%')).toBeVisible();
  await profile.evaluate((element) => {
    element.scrollTop = 0;
  });
  await page.screenshot({ path: testInfo.outputPath('player-profile-top.png') });
  await profile.evaluate((element) => {
    element.scrollTop = Math.max(0, (element.scrollHeight - element.clientHeight) / 2);
  });
  await page.screenshot({ path: testInfo.outputPath('player-profile-middle.png') });
  await profile.focus();
  await page.keyboard.press('End');
  await expect(page.getByRole('button', { name: 'Comparar' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('player-profile-end.png') });
  await page.goBack();
  await expect(page.getByRole('tab', { name: 'Comissão' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
});

test('changes the dedicated tactical plan, plays the match, and reveals the result feed', async ({
  page,
}, testInfo) => {
  await page.goto(developmentUrl);

  await page.getByRole('button', { name: 'Táticas' }).click();
  await expect(page.getByRole('heading', { name: 'Plano de jogo' })).toBeVisible();
  await chooseFormation(page, '4-2-3-1');
  await page.getByRole('button', { name: /Protagonista/u }).click();
  await page.getByRole('button', { name: 'Aplicar à proposta' }).click();
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

test('creates, duplicates, switches and reopens independent variations from one preset', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'desktop-1366x768',
    'The complete variation lifecycle only needs one desktop project.',
  );

  const openVariations = async () => {
    await page.getByRole('button', { name: /^Variação ativa:/u }).click();
    return page.getByRole('dialog', { name: 'Variações da formação' });
  };
  const createNamedVariation = async (action: 'Salvar como' | 'Duplicar', name: string) => {
    const variations = await openVariations();
    if (action === 'Duplicar') {
      await variations.getByText('Mais ações').click();
    }
    await variations.getByRole('button', { name: action }).click();
    const nameDialog = page.getByRole('alertdialog', { name: 'Nome da nova variação' });
    await nameDialog.getByRole('textbox', { name: 'Nome' }).fill(name);
    await nameDialog.getByRole('button', { name: 'Criar variação' }).click();
    await expect(
      page.getByRole('button', { name: new RegExp(`^Variação ativa: ${name}`) }),
    ).toBeVisible();
  };
  const switchTo = async (name: string) => {
    const variations = await openVariations();
    await variations.getByRole('option', { name: new RegExp(`^${name}`) }).click();
    await expect(
      page.getByRole('button', { name: new RegExp(`^Variação ativa: ${name}`) }),
    ).toBeVisible();
  };

  await page.goto(developmentUrl);
  await page.getByRole('button', { name: 'Táticas' }).click();
  await createNamedVariation('Salvar como', '4-3-3 Volante Alto');

  const volante = page.getByRole('button', { name: /Luan Seixas/u });
  await volante.press('Alt+ArrowRight');
  await page.getByRole('button', { name: 'Salvar plano' }).click();
  const volanteHighStyle = await volante.locator('xpath=..').getAttribute('style');

  await createNamedVariation('Duplicar', '4-3-3 Laterais Altos');
  const leftBack = page.getByRole('button', { name: /Nilo Azevedo/u });
  const rightBack = page.getByRole('button', { name: /Davi Moura/u });
  const leftBackBefore = await leftBack.locator('xpath=..').getAttribute('style');
  await leftBack.press('Alt+ArrowRight');
  await rightBack.press('Alt+ArrowRight');
  await page.getByRole('button', { name: 'Salvar plano' }).click();
  const leftBackHighStyle = await leftBack.locator('xpath=..').getAttribute('style');
  expect(leftBackHighStyle).not.toBe(leftBackBefore);

  await switchTo('4-3-3 Volante Alto');
  await expect(volante.locator('xpath=..')).toHaveAttribute('style', volanteHighStyle ?? '');
  await expect(leftBack.locator('xpath=..')).toHaveAttribute('style', leftBackBefore ?? '');

  await switchTo('4-3-3 Laterais Altos');
  await expect(leftBack.locator('xpath=..')).toHaveAttribute('style', leftBackHighStyle ?? '');

  await leftBack.press('Alt+ArrowRight');
  const variations = await openVariations();
  await variations.getByRole('option', { name: /^4-3-3 Volante Alto/u }).click();
  const dirtySwitch = page.getByRole('alertdialog', { name: 'Trocar para 4-3-3 Volante Alto?' });
  await expect(dirtySwitch).toContainText('alterações pendentes');
  await dirtySwitch.getByRole('button', { name: 'Cancelar' }).click();
  await expect(
    page.getByRole('button', { name: /^Variação ativa: 4-3-3 Laterais Altos/u }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Restaurar salvo' }).click();

  await page.reload();
  await expect(
    page.getByRole('button', { name: /^Variação ativa: 4-3-3 Laterais Altos/u }),
  ).toBeVisible();
  await expect(leftBack.locator('xpath=..')).toHaveAttribute('style', leftBackHighStyle ?? '');
  await switchTo('4-3-3 Volante Alto');
  await expect(volante.locator('xpath=..')).toHaveAttribute('style', volanteHighStyle ?? '');
  await expect(leftBack.locator('xpath=..')).toHaveAttribute('style', leftBackBefore ?? '');
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
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
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
  await page.getByRole('tab', { name: 'Análise' }).click();
  await expect(page.getByText('Prontidão 82%', { exact: true })).toBeVisible();

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

  await chooseFormation(page, '4-2-3-1');
  await page.getByRole('button', { name: /Protagonista/u }).click();
  await page.getByRole('button', { name: 'Aplicar à proposta' }).click();
  await page.getByRole('button', { name: 'Salvar plano' }).click();
  await expect(page.getByRole('button', { name: 'Salvar plano' })).toBeDisabled();

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Plano de jogo' })).toBeVisible();
  await expect(page.getByLabel('Escalação no 4-2-3-1')).toBeVisible();
  await expect(page.getByRole('button', { name: /^GOL: Ícaro Reis/u })).toBeVisible();
  await expect(page.getByRole('button', { name: /Protagonista/u })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

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

test('keeps tactical card anatomy disjoint and stable across readings, viewports and 200% zoom', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'desktop-1366x768',
    'The explicit tactical-card geometry matrix runs once and controls its own viewports.',
  );

  const viewports = screenshotViewports.filter(({ width }) => [1024, 1366, 1920].includes(width));
  const assertDisjointAnatomy = async (card: Locator) => {
    const result = await card.evaluate((element) => {
      const region = (name: string) => {
        const target = element.querySelector<HTMLElement>(`[data-card-region="${name}"]`);
        if (!target) throw new Error(`Missing tactical card region: ${name}`);
        return target.getBoundingClientRect();
      };
      const portrait = region('portrait');
      const shirt = region('shirt-number');
      const metric = region('primary-metric');
      const intersects = (first: DOMRect, second: DOMRect) =>
        first.left < second.right &&
        first.right > second.left &&
        first.top < second.bottom &&
        first.bottom > second.top;
      const clippedWithoutTooltip = Array.from(
        element.querySelectorAll<HTMLElement>(
          '.tactical-player-card__identity strong, .tactical-player-card__identity small, .tactical-player-card__metric, .tactical-player-card__condition',
        ),
      ).some(
        (target) =>
          (target.scrollWidth > target.clientWidth || target.scrollHeight > target.clientHeight) &&
          !target.title,
      );
      return {
        metricCount: element.querySelectorAll('[data-card-region="primary-metric"]').length,
        portraitMetricOverlap: intersects(portrait, metric),
        shirtMetricOverlap: intersects(shirt, metric),
        clippedWithoutTooltip,
      };
    });
    expect(result).toEqual({
      metricCount: 1,
      portraitMetricOverlap: false,
      shirtMetricOverlap: false,
      clippedWithoutTooltip: false,
    });
  };

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto(developmentUrl);
    await page.getByRole('button', { name: 'Táticas' }).click();
    const reading = page.getByRole('combobox', { name: 'Leitura do campo' });
    const fieldCard = page.locator('.pitch-player-card').first();
    const benchCard = page.locator('.bench-player').first();
    const baseline = await fieldCard.boundingBox();
    if (!baseline) throw new Error(`Missing field-card geometry at ${viewport.width}px.`);

    await expect(fieldCard).toHaveAttribute('data-primary-metric', 'ability');
    await expect(fieldCard.locator('[data-card-region="primary-metric"]')).toHaveAttribute(
      'aria-label',
      /^OVR \d+/u,
    );
    await expect(fieldCard).not.toContainText('Potencial');
    await expect(fieldCard.locator('.tactical-player-card__identity strong')).toHaveAttribute(
      'title',
      /.+/u,
    );
    await assertDisjointAnatomy(fieldCard);
    await assertDisjointAnatomy(benchCard);

    for (const [mode, kind, label] of [
      ['context', 'context', /^No plano atual: \d/u],
      ['familiarity', 'familiarity', /^Familiaridade com o plano: \d+%/u],
      ['condition', 'condition', /^Condição física: \d+%/u],
      ['roles', 'ability', /^OVR \d+/u],
    ] as const) {
      await reading.selectOption(mode);
      await expect(fieldCard).toHaveAttribute('data-primary-metric', kind);
      await expect(fieldCard.locator('[data-card-region="primary-metric"]')).toHaveAttribute(
        'aria-label',
        label,
      );
      const box = await fieldCard.boundingBox();
      expect(box?.width).toBeCloseTo(baseline.width, 2);
      expect(box?.height).toBeCloseTo(baseline.height, 2);
      await assertDisjointAnatomy(fieldCard);
    }

    await fieldCard.hover();
    await fieldCard.focus();
    await fieldCard.click();
    await expect(fieldCard).toHaveAttribute('aria-pressed', 'true');
    await assertDisjointAnatomy(fieldCard);
    await assertDisjointAnatomy(page.locator('.tactical-player-card--focus'));

    await page.evaluate(() => {
      document.body.style.zoom = '2';
    });
    await waitForStableFrame(page);
    await assertDisjointAnatomy(fieldCard);
    await assertDisjointAnatomy(benchCard);
    const zoomBox = await fieldCard.boundingBox();
    expect(zoomBox?.width).toBeGreaterThan(0);
    expect(zoomBox?.height).toBeGreaterThan(0);
    await page.evaluate(() => {
      document.body.style.zoom = '';
    });
  }
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
  const goalkeeperFreePosition = await pitch.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const candidates = [
      [0.68, 0.24],
      [0.68, 0.76],
      [0.42, 0.2],
    ] as const;
    const candidate = candidates.find(([x, y]) => {
      const hit = document.elementFromPoint(rect.left + rect.width * x, rect.top + rect.height * y);
      return hit?.closest('[data-tactical-player-id]') === null;
    });
    if (!candidate) throw new Error('No free tactical field coordinate was available.');
    return { x: rect.width * candidate[0], y: rect.height * candidate[1] };
  });
  await pointerDragTo(
    page,
    goalkeeper.locator('.tactical-player-card__identity strong'),
    pitch,
    goalkeeperFreePosition,
  );
  await expect(goalkeeperSlot).not.toHaveAttribute('style', goalkeeperStyle ?? '');

  await pointerDragTo(
    page,
    page.getByRole('button', { name: /Davi Moura/u }),
    page.getByRole('button', { name: /^ZAG: Iago Serpa/u }),
  );
  await expect(page.getByRole('button', { name: /^ZAG: Davi Moura/u })).toBeVisible();
  await expect(page.getByRole('button', { name: /^LD: Iago Serpa/u })).toBeVisible();
  await waitForStableFrame(page);

  await pointerDragTo(
    page,
    page.getByRole('button', { name: 'Selecionar reserva Otávio Luz' }),
    page.getByRole('button', { name: /^ZAG: Davi Moura/u }),
  );
  await expect(page.getByRole('button', { name: /^ZAG: Otávio Luz/u })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Selecionar reserva Davi Moura' })).toBeVisible();

  await pointerDragTo(
    page,
    page.getByRole('button', { name: /^ZAG: Breno Vidal/u }),
    page.getByRole('button', { name: 'Selecionar reserva Davi Moura' }),
  );
  await expect(page.getByRole('button', { name: /^ZAG: Davi Moura/u })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Selecionar reserva Breno Vidal' })).toBeVisible();

  const midfielder = page.getByRole('button', { name: /Luan Seixas/u });
  const midfielderSlot = midfielder.locator('xpath=..');
  const midfielderStyle = await midfielderSlot.getAttribute('style');
  const freePosition = await pitch.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const candidates = [
      [0.7, 0.24],
      [0.68, 0.76],
      [0.72, 0.5],
      [0.43, 0.22],
    ] as const;
    const candidate = candidates.find(([x, y]) => {
      const hit = document.elementFromPoint(rect.left + rect.width * x, rect.top + rect.height * y);
      return hit?.closest('[data-tactical-player-id]') === null;
    });
    if (!candidate) throw new Error('No free tactical field coordinate was available.');
    return { x: rect.width * candidate[0], y: rect.height * candidate[1] };
  });
  await pointerDragTo(page, midfielder, pitch, freePosition);
  await expect(midfielderSlot).not.toHaveAttribute('style', midfielderStyle ?? '');
  await midfielder.focus();
  await page.keyboard.press('Alt+ArrowUp');
  await expect(page.getByText('Origem: 4-3-3')).toBeVisible();

  const cancelSource = page.getByRole('button', { name: 'Selecionar reserva Ícaro Reis' });
  const cancelBox = await cancelSource.boundingBox();
  if (!cancelBox) throw new Error('Expected the reserve card to be visible.');
  await page.mouse.move(cancelBox.x + cancelBox.width / 2, cancelBox.y + cancelBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(cancelBox.x + 40, cancelBox.y - 40, { steps: 4 });
  await expect(page.locator('.tactical-drag-overlay')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect(page.locator('[role="status"].sr-only').last()).toContainText('Movimento cancelado');

  await page.getByRole('button', { name: 'Salvar plano' }).click();
  await expect(page.getByRole('button', { name: 'Salvar plano' })).toBeDisabled();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Plano de jogo' })).toBeVisible();
  await expect(page.getByText('Origem: 4-3-3')).toBeVisible();
  await expect(page.getByRole('button', { name: /^ZAG: Otávio Luz/u })).toBeVisible();
  await expect(page.getByRole('button', { name: /^ZAG: Davi Moura/u })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Selecionar reserva Breno Vidal' })).toBeVisible();
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

  const source = page.getByRole('button', { name: /Luan Seixas/u });
  const sourceBox = await source.boundingBox();
  if (!sourceBox) throw new Error('Expected a visible player card.');
  await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(sourceBox.x + 40, sourceBox.y + 30, { steps: 3 });
  await expect(page.locator('.tactical-drag-overlay')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('tactical-drag-overlay-reduced.png') });
  const overlayTransition = await page
    .locator('.tactical-drag-overlay')
    .evaluate((element) => getComputedStyle(element).transitionDuration);
  expect(Number.parseFloat(overlayTransition)).toBeLessThanOrEqual(0.00001);
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect(page.locator('.tactical-drag-overlay')).toHaveCount(0);
});

test('records the tactical drag hot path', async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== 'desktop-1366x768',
    'The tactical drag performance contract only needs one desktop project.',
  );

  await page.goto(developmentUrl);
  await page.getByRole('button', { name: 'Táticas' }).click();
  const source = page.getByRole('button', { name: /Luan Seixas/u });
  const pitch = page.getByLabel('Escalação no 4-3-3');
  await expect(source.locator('.tactical-player-card__metric')).toContainText('OVR77');
  const reserve = page.getByRole('button', { name: 'Selecionar reserva Ícaro Reis' });
  const reserveMetric = reserve.locator('.tactical-player-card__metric b');
  await expect(reserveMetric).toHaveText('68');
  expect(
    await reserve
      .locator('.tactical-player-card__identity strong')
      .evaluate(
        (element) =>
          element.scrollWidth <= element.clientWidth || Boolean(element.getAttribute('title')),
      ),
  ).toBe(true);
  expect(
    await reserveMetric.evaluate((element) => getComputedStyle(element).fontVariantNumeric),
  ).toContain('tabular-nums');
  const sourceBox = await source.boundingBox();
  const pitchBox = await pitch.boundingBox();
  if (!sourceBox || !pitchBox) throw new Error('Expected visible tactical drag geometry.');

  await page.evaluate(() => {
    window.__RIVALLO_TACTICS_DRAG_METRICS__ = {
      authoritativeValidations: 0,
      collisionCalculations: 0,
      fieldCardRenders: 0,
      layoutReads: 0,
      pointerMoves: 0,
      readinessCalculations: 0,
      reactStateUpdates: 0,
      persistenceCalls: 0,
      tooltipCreations: 0,
      draggedCardRenders: 0,
      inspectorRenders: 0,
      workspaceRenders: 0,
    };
    const samples: number[] = [];
    let previous = performance.now();
    let active = true;
    Object.assign(window, { __RIVALLO_TACTICS_FRAME_SAMPLES__: samples });
    const sample = (now: number) => {
      samples.push(now - previous);
      previous = now;
      if (active) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
    Object.assign(window, { __RIVALLO_STOP_TACTICS_FRAME_SAMPLES__: () => (active = false) });
  });

  const startX = sourceBox.x + sourceBox.width * 0.2;
  const startY = sourceBox.y + sourceBox.height * 0.35;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  let lastX = startX;
  let lastY = startY;
  for (let index = 0; index < 80; index += 1) {
    const angle = (Math.PI * 2 * index) / 80;
    lastX = pitchBox.x + pitchBox.width * (0.55 + Math.cos(angle) * 0.14);
    lastY = pitchBox.y + pitchBox.height * (0.5 + Math.sin(angle) * 0.18);
    await page.mouse.move(lastX, lastY);
  }

  await expect(page.locator('.tactical-drag-overlay')).toBeVisible();
  const overlay = page.locator('.tactical-drag-overlay');
  const overlayBox = await overlay.boundingBox();
  if (!overlayBox) throw new Error('Expected visible overlay geometry.');
  expect(overlayBox.width).toBeCloseTo(sourceBox.width, 1);
  expect(overlayBox.height).toBeCloseTo(sourceBox.height, 1);
  expect(overlayBox.x).toBeCloseTo(lastX - sourceBox.width * 0.2, 1);
  expect(overlayBox.y).toBeCloseTo(lastY - sourceBox.height * 0.35, 1);
  expect(
    await overlay.evaluate((element) => {
      const portrait = element
        .querySelector<HTMLElement>('[data-card-region="portrait"]')
        ?.getBoundingClientRect();
      const metric = element
        .querySelector<HTMLElement>('[data-card-region="primary-metric"]')
        ?.getBoundingClientRect();
      if (!portrait || !metric) throw new Error('Overlay did not clone the shared card anatomy.');
      return !(
        portrait.left < metric.right &&
        portrait.right > metric.left &&
        portrait.top < metric.bottom &&
        portrait.bottom > metric.top
      );
    }),
  ).toBe(true);
  await expect(page.getByRole('tooltip')).toHaveCount(0);
  const result = await page.evaluate(() => {
    const stop = (
      window as typeof window & {
        __RIVALLO_STOP_TACTICS_FRAME_SAMPLES__?: () => void;
        __RIVALLO_TACTICS_FRAME_SAMPLES__?: number[];
      }
    ).__RIVALLO_STOP_TACTICS_FRAME_SAMPLES__;
    stop?.();
    const frames =
      (window as typeof window & { __RIVALLO_TACTICS_FRAME_SAMPLES__?: number[] })
        .__RIVALLO_TACTICS_FRAME_SAMPLES__ ?? [];
    const stableFrames = frames.slice(2).sort((a, b) => a - b);
    const averageFrameMs =
      stableFrames.reduce((total, frame) => total + frame, 0) / Math.max(stableFrames.length, 1);
    const p95FrameMs = stableFrames[Math.floor(stableFrames.length * 0.95)] ?? 0;
    return {
      ...window.__RIVALLO_TACTICS_DRAG_METRICS__,
      averageFrameMs: Number(averageFrameMs.toFixed(2)),
      p95FrameMs: Number(p95FrameMs.toFixed(2)),
      sampledFrames: stableFrames.length,
    };
  });
  console.log(`TACTICAL_DRAG_METRICS ${JSON.stringify(result)}`);
  expect(result.workspaceRenders).toBe(0);
  expect(result.fieldCardRenders).toBe(0);
  expect(result.draggedCardRenders).toBe(0);
  expect(result.inspectorRenders).toBe(0);
  expect(result.reactStateUpdates).toBe(0);
  expect(result.authoritativeValidations).toBe(0);
  expect(result.collisionCalculations).toBe(0);
  expect(result.persistenceCalls).toBe(0);
  expect(result.readinessCalculations).toBe(0);
  expect(result.tooltipCreations).toBe(0);
  expect(result.layoutReads).toBe(4);
  expect(result.averageFrameMs).toBeLessThanOrEqual(20);
  expect(result.p95FrameMs).toBeLessThanOrEqual(25);
  await page.mouse.up();
  await expect(page.locator('.tactical-drag-overlay')).toHaveCount(0);
  const persistedPoint = await source.locator('xpath=..').evaluate((element) => ({
    x: Number.parseFloat(element.style.getPropertyValue('--slot-x')) / 100,
    y: Number.parseFloat(element.style.getPropertyValue('--slot-y')) / 100,
  }));
  const expectedX =
    (lastX - sourceBox.width * 0.2 + sourceBox.width / 2 - pitchBox.x) / pitchBox.width;
  const expectedY =
    (lastY - sourceBox.height * 0.35 + sourceBox.height / 2 - pitchBox.y) / pitchBox.height;
  expect(persistedPoint.x).toBeCloseTo(expectedX, 5);
  expect(persistedPoint.y).toBeCloseTo(expectedY, 5);
  expect(result.pointerMoves).toBeGreaterThanOrEqual(75);
});

test('keeps the tactical overlay locked to center and corner across zoom and movement speeds', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'desktop-1366x768',
    'The overlay fidelity contract only needs one desktop WebView-sized project.',
  );

  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1366,
    height: 768,
    deviceScaleFactor: 1.5,
    mobile: false,
  });
  await page.goto(developmentUrl);
  await page.getByRole('button', { name: 'Táticas' }).click();
  await page.evaluate(() => {
    document.documentElement.style.setProperty('zoom', '1.1');
    const workspace = document.querySelector<HTMLElement>('.tactics-view');
    if (!workspace) throw new Error('Expected the tactical workspace.');
    workspace.style.transform = 'translate3d(7.25px, 5.5px, 0)';
    workspace.style.transformOrigin = 'top left';
  });
  expect(await page.evaluate(() => window.devicePixelRatio)).toBe(1.5);

  const pitch = page.getByLabel('Escalação no 4-3-3');
  const source = page.getByRole('button', { name: /Luan Seixas/u });
  const sourceBox = await source.boundingBox();
  const pitchBox = await pitch.boundingBox();
  if (!sourceBox || !pitchBox) throw new Error('Expected transformed tactical geometry.');

  const centerStart = {
    x: sourceBox.x + sourceBox.width / 2,
    y: sourceBox.y + sourceBox.height / 2,
  };
  await page.mouse.move(centerStart.x, centerStart.y);
  await page.mouse.down();
  const shortPoint = { x: centerStart.x + 6, y: centerStart.y + 5 };
  await page.mouse.move(shortPoint.x, shortPoint.y);
  const overlay = page.locator('.tactical-drag-overlay');
  await expect(overlay).toBeVisible();
  let overlayBox = await overlay.boundingBox();
  if (!overlayBox) throw new Error('Expected the centered overlay.');
  expect(overlayBox.x).toBeCloseTo(shortPoint.x - sourceBox.width / 2, 1);
  expect(overlayBox.y).toBeCloseTo(shortPoint.y - sourceBox.height / 2, 1);

  const longPoint = {
    x: pitchBox.x + pitchBox.width * 0.64,
    y: pitchBox.y + pitchBox.height * 0.46,
  };
  for (let step = 1; step <= 16; step += 1) {
    await page.mouse.move(
      shortPoint.x + ((longPoint.x - shortPoint.x) * step) / 16,
      shortPoint.y + ((longPoint.y - shortPoint.y) * step) / 16,
    );
    await page.waitForTimeout(8);
  }
  overlayBox = await overlay.boundingBox();
  if (!overlayBox) throw new Error('Expected the slowly moved overlay.');
  expect(overlayBox.x).toBeCloseTo(longPoint.x - sourceBox.width / 2, 1);
  expect(overlayBox.y).toBeCloseTo(longPoint.y - sourceBox.height / 2, 1);
  expect(await overlay.evaluate((element) => getComputedStyle(element).pointerEvents)).toBe('none');
  expect(await overlay.evaluate((element) => getComputedStyle(element).transitionDuration)).toBe(
    '0s',
  );
  const expectedCenter = {
    x: (overlayBox.x + overlayBox.width / 2 - pitchBox.x) / pitchBox.width,
    y: (overlayBox.y + overlayBox.height / 2 - pitchBox.y) / pitchBox.height,
  };
  await page.mouse.up();
  await expect(overlay).toHaveCount(0);
  const persistedCenter = await source.locator('xpath=..').evaluate((element) => ({
    x: Number.parseFloat(element.style.getPropertyValue('--slot-x')) / 100,
    y: Number.parseFloat(element.style.getPropertyValue('--slot-y')) / 100,
  }));
  expect(persistedCenter.x).toBeCloseTo(expectedCenter.x, 5);
  expect(persistedCenter.y).toBeCloseTo(expectedCenter.y, 5);

  const cornerSource = page.getByRole('button', { name: /Davi Moura/u });
  const cornerBox = await cornerSource.boundingBox();
  const currentPitchBox = await pitch.boundingBox();
  if (!cornerBox || !currentPitchBox) throw new Error('Expected corner-drag geometry.');
  const cornerOffset = { x: 6, y: 8 };
  const cornerStart = {
    x: cornerBox.x + cornerOffset.x,
    y: cornerBox.y + cornerOffset.y,
  };
  const fastPoint = {
    x: currentPitchBox.x + currentPitchBox.width * 0.72,
    y: currentPitchBox.y + currentPitchBox.height * 0.72,
  };
  await page.mouse.move(cornerStart.x, cornerStart.y);
  await page.mouse.down();
  await page.mouse.move(fastPoint.x, fastPoint.y);
  await expect(overlay).toBeVisible();
  overlayBox = await overlay.boundingBox();
  if (!overlayBox) throw new Error('Expected the corner-grab overlay.');
  expect(overlayBox.x).toBeCloseTo(fastPoint.x - cornerOffset.x, 1);
  expect(overlayBox.y).toBeCloseTo(fastPoint.y - cornerOffset.y, 1);
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect(overlay).toHaveCount(0);
});

test('keeps the formation library searchable, keyboard navigable and viewport bounded', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'desktop-1366x768',
    'The focused formation picker contract only needs one desktop project.',
  );
  await page.setViewportSize({ width: 621, height: 1078 });
  await page.goto(developmentUrl);
  await page.getByRole('button', { name: 'Táticas' }).click();

  const trigger = page.getByRole('button', { name: 'Formação: 4-3-3. Abrir biblioteca' });
  await trigger.click();
  const picker = page.getByRole('dialog', { name: 'Escolher formação' });
  await expect(picker.getByRole('heading', { name: 'Linha de quatro' })).toBeVisible();
  await expect(picker.getByRole('heading', { name: 'Linha de três' })).toBeVisible();
  await expect(picker.getByRole('heading', { name: 'Linha de cinco' })).toBeVisible();
  const search = picker.getByRole('searchbox', { name: 'Buscar formação' });
  await expect(search).toBeFocused();
  const geometry = await picker.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const list = element.querySelector<HTMLElement>('.formation-picker__list');
    if (!list) throw new Error('Expected the formation list.');
    const listRect = list.getBoundingClientRect();
    return {
      bottom: rect.bottom,
      left: rect.left,
      listBottom: listRect.bottom,
      overflowY: getComputedStyle(list).overflowY,
      right: rect.right,
      viewportHeight: window.innerHeight,
      viewportWidth: window.innerWidth,
    };
  });
  expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewportHeight);
  expect(geometry.left).toBeGreaterThanOrEqual(8);
  expect(geometry.listBottom).toBeLessThanOrEqual(geometry.bottom);
  expect(geometry.right).toBeLessThanOrEqual(geometry.viewportWidth);
  expect(geometry.overflowY).toBe('auto');
  await page.screenshot({ path: testInfo.outputPath('formation-picker-621x1078.png') });

  await search.fill('duplo volante');
  await expect(picker.getByRole('option')).toHaveCount(1);
  await search.press('ArrowDown');
  const option = picker.getByRole('option', { name: /^4-2-3-1/u });
  await expect(option).toBeFocused();
  await option.press('Escape');
  await expect(picker).toBeHidden();
  await expect(trigger).toBeFocused();
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
    if (viewport.width === 1920) {
      for (const tab of ['Análise', 'Estratégia', 'Instruções', 'Oposição'] as const) {
        await page.getByRole('tab', { name: tab, exact: true }).click();
        await expect(page.getByRole('tab', { name: tab, exact: true })).toHaveAttribute(
          'aria-selected',
          'true',
        );
        await page.evaluate(
          () =>
            new Promise<void>((resolve) => {
              requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
            }),
        );
        await page.locator('.manager-shell').evaluate((shell) => shell.getBoundingClientRect());
        await page.waitForTimeout(100);
        await page.screenshot({
          animations: 'disabled',
          path: testInfo.outputPath(
            `taticas-06-3-${tab
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .toLowerCase()}-1920x1080.png`,
          ),
        });
      }
    }
    if (viewport.width === 1024) {
      const bench = page.getByRole('heading', { name: 'Banco e reservas' });
      await bench.scrollIntoViewIfNeeded();
      await expect(bench).toBeInViewport();
      await expect(page.getByRole('button', { name: 'Salvar plano' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Restaurar salvo' })).toBeVisible();
    }
  }
});

test('keeps the tactical inspector bounded, keyboard reachable and every derived card inside the pitch', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'desktop-1366x768',
    'The focused 06.3 layout contract only needs one desktop project.',
  );

  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto(developmentUrl);
  await page.getByRole('button', { name: 'Táticas' }).click();

  const inspector = page.getByLabel('Inspector tático');
  const tabs = inspector.getByRole('tablist', { name: 'Ferramentas táticas' });
  const summary = inspector.locator('.tactics-inspector__summary');
  const body = inspector.locator('.tactics-inspector__body');
  const footer = inspector.locator('.tactics-focus-player');

  const assertInspectorRegions = async () => {
    const geometry = await inspector.evaluate((element) => {
      const nav = element.querySelector<HTMLElement>('.tactics-tool-nav');
      const summaryElement = element.querySelector<HTMLElement>('.tactics-inspector__summary');
      const bodyElement = element.querySelector<HTMLElement>('.tactics-inspector__body');
      const footerElement = element.querySelector<HTMLElement>('.tactics-focus-player');
      const proposal = element.querySelector<HTMLElement>('.tactics-proposal');
      if (!nav || !summaryElement || !bodyElement || !footerElement)
        throw new Error('Expected every fixed inspector region.');
      const inspectorRect = element.getBoundingClientRect();
      const navRect = nav.getBoundingClientRect();
      const summaryRect = summaryElement.getBoundingClientRect();
      const bodyRect = bodyElement.getBoundingClientRect();
      const footerRect = footerElement.getBoundingClientRect();
      const proposalRect = proposal?.getBoundingClientRect();
      return {
        inspectorBottom: inspectorRect.bottom,
        navBottom: navRect.bottom,
        summaryTop: summaryRect.top,
        summaryBottom: summaryRect.bottom,
        bodyTop: bodyRect.top,
        bodyBottom: bodyRect.bottom,
        nextFixedTop: proposalRect?.top ?? footerRect.top,
        footerTop: footerRect.top,
        footerBottom: footerRect.bottom,
        bodyOverflowY: getComputedStyle(bodyElement).overflowY,
      };
    });
    expect(geometry.navBottom).toBeLessThanOrEqual(geometry.summaryTop + 1);
    expect(geometry.summaryBottom).toBeLessThanOrEqual(geometry.bodyTop + 1);
    expect(geometry.bodyBottom).toBeLessThanOrEqual(geometry.nextFixedTop + 1);
    expect(geometry.footerTop).toBeGreaterThanOrEqual(geometry.bodyBottom - 1);
    expect(geometry.footerBottom).toBeLessThanOrEqual(geometry.inspectorBottom + 1);
    expect(geometry.bodyOverflowY).toBe('auto');
  };

  for (const tab of ['Análise', 'Estratégia', 'Instruções', 'Oposição'] as const) {
    await tabs.getByRole('tab', { name: tab, exact: true }).click();
    await expect(summary).toBeVisible();
    await expect(footer).toBeVisible();
    await assertInspectorRegions();
  }

  await tabs.getByRole('tab', { name: 'Estratégia', exact: true }).click();
  await body.getByRole('button', { name: 'Personalizar estratégia' }).click();
  const scrollState = await body.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
    return {
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
      scrollTop: element.scrollTop,
    };
  });
  expect(scrollState.scrollHeight).toBeGreaterThan(scrollState.clientHeight);
  expect(scrollState.scrollTop).toBeGreaterThan(0);
  const verticalScrollOwners = await inspector.evaluate((element) =>
    [...element.querySelectorAll<HTMLElement>('*')]
      .filter((candidate) => {
        const overflow = getComputedStyle(candidate).overflowY;
        return (
          (overflow === 'auto' || overflow === 'scroll') &&
          candidate.scrollHeight > candidate.clientHeight + 1
        );
      })
      .map((candidate) => [...candidate.classList]),
  );
  expect(verticalScrollOwners).toHaveLength(1);
  expect(verticalScrollOwners[0]).toContain('tactics-inspector__body');
  await expect(tabs.getByRole('tab', { name: 'Estratégia', exact: true })).toBeVisible();
  await expect(footer).toBeVisible();
  await assertInspectorRegions();

  await tabs.getByRole('tab', { name: 'Instruções', exact: true }).click();
  await expect(inspector).not.toContainText('collective');
  await expect(inspector).not.toContainText('circulation');
  await expect(inspector).not.toContainText('supported');
  const focusableControls = inspector.locator(
    'button:not(:disabled):not([tabindex="-1"]), select:not(:disabled):not([tabindex="-1"]), input:not(:disabled):not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])',
  );
  const focusableCount = await focusableControls.count();
  expect(focusableCount).toBeGreaterThanOrEqual(6);
  for (let index = 0; index < focusableCount; index += 1) {
    const control = focusableControls.nth(index);
    expect(
      await control.evaluate((element) => {
        (element as HTMLElement).focus();
        return document.activeElement === element && (element as HTMLElement).tabIndex >= 0;
      }),
    ).toBe(true);
  }

  const baseStyles = await page
    .locator('.pitch-slot')
    .evaluateAll((slots) => slots.map((slot) => slot.getAttribute('style')));
  const pitch = page.getByLabel('Escalação no 4-3-3');
  for (const phase of ['Com posse', 'Sem posse', 'Transição +', 'Transição −'] as const) {
    await page.getByRole('button', { name: phase, exact: true }).click();
    const containment = await pitch.evaluate((element) => {
      const pitchRect = element.getBoundingClientRect();
      return [...element.querySelectorAll<HTMLElement>('.pitch-player-card')].every((card) => {
        const rect = card.getBoundingClientRect();
        return (
          rect.left >= pitchRect.left - 1 &&
          rect.right <= pitchRect.right + 1 &&
          rect.top >= pitchRect.top - 1 &&
          rect.bottom <= pitchRect.bottom + 1
        );
      });
    });
    expect(containment).toBe(true);
  }
  await page.getByRole('button', { name: 'Posição base', exact: true }).click();
  expect(
    await page
      .locator('.pitch-slot')
      .evaluateAll((slots) => slots.map((slot) => slot.getAttribute('style'))),
  ).toEqual(baseStyles);

  await page.setViewportSize({ width: 683, height: 384 });
  await inspector.scrollIntoViewIfNeeded();
  await assertInspectorRegions();
  await expect(tabs.getByRole('tab', { name: 'Instruções', exact: true })).toBeVisible();
});

test('keeps slider, recommendation and instruction changes in the proposal until an explicit save', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'desktop-1366x768',
    'The focused 06.3 proposal flow only needs one desktop project.',
  );

  await page.goto(developmentUrl);
  const recommendation: TacticalRecommendation = {
    recommendationId: 'model.raise-width',
    reason: 'Aumentar a amplitude para criar uma linha de passe no lado oposto.',
    proposedChanges: [{ path: 'strategy.inPossession.width', from: 55, to: 70 }],
    benefit: 'Mais espaço para circular.',
    risk: 'Maior distância após a perda.',
    affectedPlayers: ['rv-09', 'rv-11'],
    confidence: 81,
    origin: 'Análise do modelo tático',
    variationId: initialTacticalVariation.variationId,
    planRevision: initialTacticalVariation.revision,
    staffId: null,
    staffRole: null,
    staffName: null,
    staffSpecialty: null,
    staffQuality: null,
    planKnowledge: null,
    opponentKnowledge: null,
  };
  await page.evaluate(
    ({ seed, storageKey, seededRecommendation }) => {
      const persisted = window.localStorage.getItem(storageKey);
      const state =
        persisted === null ? structuredClone(seed) : (JSON.parse(persisted) as MatchdayState);
      const library = state.tacticalLibrary;
      if (!library) throw new Error('Expected the tactical browser fixture.');
      const activeVariation = library.variations.find(
        ({ variationId }) => variationId === library.activeVariationId,
      );
      const activeModel = activeVariation?.tacticalModel;
      if (!activeVariation || !activeModel) throw new Error('Expected the active tactical model.');
      const seededState: MatchdayState = {
        ...state,
        tacticalLibrary: {
          ...library,
          variations: library.variations.map((variation) =>
            variation.variationId === activeVariation.variationId
              ? {
                  ...variation,
                  tacticalModel: {
                    ...activeModel,
                    recommendations: [seededRecommendation],
                  },
                }
              : variation,
          ),
        },
      };
      window.localStorage.setItem(storageKey, JSON.stringify(seededState));
    },
    { seed: initialState, storageKey: bridgeStateKey, seededRecommendation: recommendation },
  );
  await page.reload();
  await page.getByRole('button', { name: 'Táticas' }).click();

  const inspector = page.getByLabel('Inspector tático');
  const tabs = inspector.getByRole('tablist', { name: 'Ferramentas táticas' });
  const strategyTab = tabs.getByRole('tab', { name: 'Estratégia', exact: true });
  await strategyTab.focus();
  await page.keyboard.press('ArrowRight');
  await expect(tabs.getByRole('tab', { name: 'Instruções', exact: true })).toBeFocused();
  await page.keyboard.press('Home');
  await expect(tabs.getByRole('tab', { name: 'Análise', exact: true })).toBeFocused();

  await strategyTab.click();
  await inspector.getByRole('button', { name: 'Personalizar estratégia' }).click();
  const amplitude = inspector.getByRole('slider', { name: 'Amplitude' });
  await expect(amplitude).toHaveAttribute('aria-valuemin', '0');
  await expect(amplitude).toHaveAttribute('aria-valuemax', '100');
  await expect(amplitude).toHaveAttribute('aria-valuetext', '55, Equilibrada');
  await amplitude.focus();
  await page.keyboard.press('ArrowRight');
  await expect(amplitude).toHaveValue('56');
  await expect(page.getByRole('button', { name: 'Com posse', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByRole('button', { name: 'Salvar plano' })).toBeEnabled();
  expect(
    await page.evaluate((storageKey) => {
      const state = JSON.parse(window.localStorage.getItem(storageKey) ?? '{}') as MatchdayState;
      return state.tacticalLibrary?.variations[0]?.tacticalModel?.config.strategy.inPossession
        .width;
    }, bridgeStateKey),
  ).toBe(55);
  await inspector
    .locator('.tactical-slider')
    .filter({ has: page.getByRole('slider', { name: 'Amplitude' }) })
    .getByRole('button', { name: 'Restaurar' })
    .click();
  await expect(amplitude).toHaveValue('55');

  await tabs.getByRole('tab', { name: 'Análise', exact: true }).click();
  await inspector.getByRole('button', { name: 'Ver alterações' }).click();
  const recommendationDialog = page.getByRole('alertdialog', { name: 'Revisar recomendação' });
  await expect(recommendationDialog).toContainText('Análise do modelo tático');
  await expect(recommendationDialog).toContainText('Confiança 81%');
  await expect(recommendationDialog).toContainText('55 → 70');
  await recommendationDialog.getByRole('button', { name: 'Aplicar à proposta' }).click();
  await expect(recommendationDialog).toBeHidden();
  await expect(page.getByRole('button', { name: 'Salvar plano' })).toBeEnabled();
  expect(
    await page.evaluate((storageKey) => {
      const state = JSON.parse(window.localStorage.getItem(storageKey) ?? '{}') as MatchdayState;
      return state.tacticalLibrary?.variations[0]?.tacticalModel?.config.strategy.inPossession
        .width;
    }, bridgeStateKey),
  ).toBe(55);

  await tabs.getByRole('tab', { name: 'Instruções', exact: true }).click();
  await inspector.getByRole('button', { name: 'Adicionar instrução' }).click();
  const instructionCard = inspector
    .getByRole('article')
    .filter({ hasText: 'Sair com apoios próximos' });
  await expect(
    instructionCard.getByText('Sair com apoios próximos', { exact: true }),
  ).toBeVisible();
  await expect(instructionCard.getByRole('button', { name: 'Editar' })).toBeVisible();
  await expect(instructionCard.getByRole('button', { name: 'Desativar' })).toBeVisible();
  await expect(instructionCard.getByRole('button', { name: 'Ver impacto' })).toBeVisible();
  await expect(instructionCard.getByRole('button', { name: 'Remover' })).toBeVisible();
  expect(
    await page.evaluate((storageKey) => {
      const state = JSON.parse(window.localStorage.getItem(storageKey) ?? '{}') as MatchdayState;
      return state.tacticalLibrary?.variations[0]?.tacticalModel?.config.instructions.length;
    }, bridgeStateKey),
  ).toBe(0);
});

test('saving protected column changes asks for a name and clears the navigation guard', async ({
  page,
}) => {
  await page.goto(developmentUrl);

  await page.getByRole('button', { name: 'Configurar tabela' }).click();
  const customizer = page.getByRole('dialog', { name: 'Configurar tabela' });
  await customizer.getByRole('searchbox', { name: 'Buscar colunas' }).fill('Idade');
  await customizer.getByRole('button', { name: 'Ocultar Idade' }).click();
  await customizer.getByRole('button', { name: 'Salvar como nova visualização' }).click();

  const nameDialog = page.getByRole('dialog', { name: 'Salvar nova visualização' });
  await expect(nameDialog).toContainText('não será alterada');
  await nameDialog.getByRole('textbox', { name: 'Nome da visualização' }).fill('Elenco sem idade');
  await nameDialog.getByRole('button', { name: 'Salvar e ativar' }).click();

  await expect(
    page.getByRole('button', { name: 'Visualização da tabela: Elenco sem idade' }),
  ).toBeVisible();
  await expect(page.locator('th[data-column-id="age"]')).toBeHidden();
  await expect(
    page.locator('.rv-table-view-status').getByText('Alterações não salvas'),
  ).toHaveCount(0);

  await page.getByRole('button', { name: 'Táticas', exact: true }).click();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Plano de jogo' })).toBeVisible();
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
  await customizer.getByRole('button', { name: 'Salvar alterações' }).click();
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
    name: 'Salvar como nova visualização',
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
    customizer.getByRole('button', { name: 'Salvar como nova visualização' }),
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

    if (productState.mode === 'unavailable') {
      await waitForStableFrame(page);
      const header = page.locator('.rv-data-table-workspace-header');
      const feedback = page.locator('.rv-data-table-workspace-header__feedback');
      const table = page.getByRole('table', { name: 'Elenco principal' });
      const [headerBox, feedbackBox, tableBox] = await Promise.all([
        header.boundingBox(),
        feedback.boundingBox(),
        table.boundingBox(),
      ]);
      if (!headerBox || !feedbackBox || !tableBox) {
        throw new Error('Repository fallback geometry must remain measurable.');
      }
      expect(feedbackBox.width).toBeGreaterThan(headerBox.width * 0.85);
      expect(headerBox.height).toBeLessThanOrEqual(148);
      expect(tableBox.y).toBeGreaterThanOrEqual(headerBox.y + headerBox.height - 1);
    }
  }

  await setTableViewBridgeControl(page, { nextLoad: 'loaded' });
  await page.reload();
  await createSavedView(page, 'Contraste de falha');
  await page.getByRole('button', { name: 'Configurar tabela' }).click();
  const failureCustomizer = page.getByRole('dialog', { name: 'Configurar tabela' });
  await failureCustomizer.getByRole('searchbox', { name: 'Buscar colunas' }).fill('Idade');
  await failureCustomizer.getByRole('button', { name: 'Ocultar Idade' }).click();
  await setTableViewBridgeControl(page, { failNextSave: true });
  await failureCustomizer.getByRole('button', { name: 'Salvar alterações' }).click();
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
      locator: customizer.getByRole('button', { name: 'Salvar alterações' }),
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
    const save = rect(buttonByName('Salvar alterações'));
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
  await expect(customizer.getByRole('button', { name: 'Salvar alterações' })).toBeVisible();
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
