import { expect, test, type Page } from '@playwright/test';

import type { TableViewRepositoryState } from '../apps/desktop/src/matchday/client.js';
import { SQUAD_SYSTEM_VIEW } from '../apps/desktop/src/matchday/squad-table-schema.js';
import type { MatchdayState, Player } from '../apps/desktop/src/matchday/types.js';
import {
  requiredContrastRatio,
  sampleComputedContrast,
  type ComputedContrastSample,
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
  { width: 1920, height: 1080 },
  { width: 2560, height: 1080 },
] as const;

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
    ({ seed, storageKey }) => {
      let state: MatchdayState = structuredClone(seed);
      try {
        const persisted = window.localStorage.getItem(storageKey);
        if (persisted) state = JSON.parse(persisted) as MatchdayState;
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

      const bridge = {
        invoke: async (command: string, args: Record<string, unknown> = {}) => {
          if (command === 'lifecycle_status' || command === 'retry_lifecycle') {
            return { state: 'ready', ownership: 'owned' };
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
    { seed: initialState, storageKey: bridgeStateKey },
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
  await expect(page.locator('th[data-column="potentialRating"]')).toBeVisible();
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
  const columnsTrigger = page.getByRole('button', { name: 'Configurar colunas' });
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
  await expect(page.getByRole('dialog', { name: 'Colunas visíveis' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(columnsTrigger).toBeFocused();

  await columnsTrigger.click();
  await expect(page.getByRole('dialog', { name: 'Colunas visíveis' })).toBeVisible();
  await densityTrigger.click();
  await expect(page.getByRole('dialog', { name: 'Colunas visíveis' })).toBeHidden();
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
  await expect(page.getByRole('dialog', { name: 'Colunas visíveis' })).toBeVisible();
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
  await page.getByRole('button', { name: /Idade.*Visível/u }).click();
  await expect(page.getByRole('dialog', { name: 'Colunas visíveis' })).toBeVisible();
  await expect(page.locator('th[data-column="age"]')).toBeHidden();
  await page.getByRole('button', { name: 'Fechar contexto' }).click();
  await expect(page.getByRole('dialog', { name: 'Colunas visíveis' })).toBeHidden();
  await expect(columnsTrigger).toBeFocused();

  await columnsTrigger.click();
  await page.getByRole('heading', { name: /jogadores$/u }).click();
  await expect(page.getByRole('dialog', { name: 'Colunas visíveis' })).toBeHidden();
  await expect(columnsTrigger).toBeFocused();
  await expect(page.locator('.rv-popover')).toHaveCount(0);
  await expect(page.locator('body')).not.toHaveAttribute('style', /(?:overflow|pointer-events)/u);

  await page.getByRole('button', { name: 'Táticas', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Plano de jogo' })).toBeVisible();
  await page.getByRole('button', { name: 'Elenco', exact: true }).click();
  await expect(
    page.getByRole('button', { name: /Alterar densidade da tabela: Confortável/u }),
  ).toBeVisible();
  await expect(page.locator('th[data-column="age"]')).toBeHidden();

  await page.reload();
  await expect(page.locator('.manager-shell')).toHaveAttribute('data-sidebar-collapsed', 'true');
  await expect(page.locator('th[data-column="age"]')).toBeHidden();
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
  const positionHeader = page.locator('th[data-column="position"] button');
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

test('captures Elenco and Táticas at 1024, 1366, 1920 and 2560 pixels', async ({
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
  await expect(page.getByText('Alterações não salvas')).toBeVisible();
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
  await expect(page.locator('th[data-column="goals"]')).toBeVisible();
  await expect(page.locator('[aria-label*="Agrupar"], [data-control="grouping"]')).toHaveCount(0);
  const visibleGoals = await page
    .locator('.squad-table tbody tr td[data-column-id="goals"]')
    .allTextContents();
  expect(visibleGoals.length).toBeGreaterThan(0);
  expect(visibleGoals.every((value) => Number(value.trim()) > 0)).toBe(true);
  expect(visibleGoals.map(Number)).toEqual([...visibleGoals.map(Number)].sort((a, b) => b - a));

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
});

test('live header parity keeps pointer and keyboard reorder resize rollback focus and announcements', async ({
  page,
}) => {
  const columnOrder = () =>
    page
      .locator('.squad-table thead th')
      .evaluateAll((headers) => headers.map((header) => header.getAttribute('data-column-id')));

  await page.goto(developmentUrl);
  const initialOrder = await columnOrder();
  const keyboardMove = page.getByRole('button', { name: 'Mover coluna Jogador' });
  await keyboardMove.focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  const keyboardOrder = await columnOrder();
  expect(keyboardOrder).not.toEqual(initialOrder);
  await expect(page.getByText(/^Jogador, posição \d+ de 18\.$/u)).toBeVisible();
  await expect(keyboardMove).toBeFocused();

  await page.reload();
  const pointerMove = page.getByRole('button', { name: 'Mover coluna Jogador' });
  await pointerMove.dispatchEvent('pointerdown', { pointerId: 1, button: 0 });
  await page.locator('th[data-column="position"]').dispatchEvent('pointerenter', { pointerId: 1 });
  await pointerMove.dispatchEvent('pointerup', { pointerId: 1, button: 0 });
  expect(await columnOrder()).toEqual(keyboardOrder);
  await expect(pointerMove).toBeFocused();

  await page.reload();
  const rollbackMove = page.getByRole('button', { name: 'Mover coluna Jogador' });
  await rollbackMove.focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Escape');
  expect(await columnOrder()).toEqual(initialOrder);
  await expect(rollbackMove).toBeFocused();
  await expect(page.getByText('Jogador, operação desfeita.')).toBeVisible();

  const keyboardResize = page.getByRole('separator', { name: 'Redimensionar coluna Jogador' });
  const initialWidth = Number(await keyboardResize.getAttribute('aria-valuenow'));
  await keyboardResize.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  expect(Number(await keyboardResize.getAttribute('aria-valuenow'))).toBe(initialWidth + 8);
  await expect(page.getByText(`Jogador, largura ${initialWidth + 8} pixels.`)).toBeVisible();
  await expect(keyboardResize).toBeFocused();

  await page.reload();
  const pointerResize = page.getByRole('separator', { name: 'Redimensionar coluna Jogador' });
  await pointerResize.dispatchEvent('pointerdown', { pointerId: 2, button: 0, clientX: 100 });
  await pointerResize.dispatchEvent('pointermove', { pointerId: 2, clientX: 108 });
  await pointerResize.dispatchEvent('pointerup', { pointerId: 2, button: 0, clientX: 108 });
  expect(Number(await pointerResize.getAttribute('aria-valuenow'))).toBe(initialWidth + 8);

  await page.reload();
  const rollbackResize = page.getByRole('separator', { name: 'Redimensionar coluna Jogador' });
  await rollbackResize.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Escape');
  expect(Number(await rollbackResize.getAttribute('aria-valuenow'))).toBe(initialWidth);
  await expect(rollbackResize).toBeFocused();
});

test('computed WCAG contrast matrix covers operational and truthful table-view states', async ({
  page,
}, testInfo) => {
  const samples: ComputedContrastSample[] = [];
  const sample = async (
    label: string,
    kind: 'text' | 'control' | 'focus',
    locator: ReturnType<Page['locator']>,
  ) => {
    const result = await sampleComputedContrast(locator, { kind, label });
    samples.push(result);
    expect(
      result.ratio,
      `${label}: ${result.foreground} on ${result.background}`,
    ).toBeGreaterThanOrEqual(requiredContrastRatio(kind));
  };

  const stateInventory = [
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
  expect(stateInventory).toHaveLength(15);

  await page.goto(developmentUrl);
  await sample('default table text', 'text', page.locator('.squad-table tbody th').first());
  const selectorTrigger = page.getByRole('button', { name: /Visualização da tabela:/u });
  await selectorTrigger.hover();
  await sample('hover selector boundary', 'control', selectorTrigger);
  await selectorTrigger.focus();
  await sample('focus-visible selector ring', 'focus', selectorTrigger);

  await page.getByRole('button', { name: 'Configurar tabela' }).click();
  const customizer = page.getByRole('dialog', { name: 'Configurar tabela' });
  const search = customizer.getByRole('searchbox', { name: 'Buscar colunas' });
  await sample('customizer field text', 'text', search);
  await sample('customizer field boundary', 'control', search);
  const selectedVisibility = customizer.getByRole('button', { name: 'Ocultar Jogador' });
  await sample('selected visibility control', 'control', selectedVisibility);
  await sample(
    'disabled required visibility explanation',
    'text',
    customizer.getByText(/identidade principal/u).first(),
  );
  await customizer
    .getByRole('searchbox', { name: 'Buscar colunas' })
    .fill('sem resultado possível');
  await sample(
    'empty customizer state',
    'text',
    customizer.getByRole('heading', { name: 'Nenhuma coluna encontrada' }),
  );
  await search.fill('Idade');
  await customizer.getByRole('button', { name: 'Ocultar Idade' }).click();
  await sample('dirty state label', 'text', customizer.getByText('Alterações não salvas'));

  for (const [mode, heading] of [
    ['loading', 'Carregando visualizações do elenco…'],
    ['invalid', 'Não foi possível carregar suas visualizações'],
    ['unavailable', 'Visualizações personalizadas indisponíveis'],
    ['migrated', 'Visualizações do elenco atualizadas'],
    ['corrupt', 'Uma visualização corrompida foi isolada'],
    ['future-schema', 'Esta visualização exige uma versão mais recente'],
  ] as const) {
    await setTableViewBridgeControl(page, { nextLoad: mode });
    await page.reload();
    await sample(`${mode} product state`, 'text', page.getByRole('heading', { name: heading }));
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
    'save-failure destructive text',
    'text',
    page.getByRole('heading', { name: 'Não foi possível salvar a visualização' }),
  );
  await sample(
    'save-failure destructive boundary',
    'control',
    page.getByRole('button', { name: 'Tentar salvar visualização' }),
  );

  await testInfo.attach('wcag-contrast-matrix.json', {
    body: Buffer.from(JSON.stringify({ states: stateInventory, samples }, null, 2)),
    contentType: 'application/json',
  });
});

test('200% zoom reflow keeps long Portuguese controls, table overflow and focus reachable', async ({
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
  await createSavedView(
    page,
    'Visualização extensa para análise técnica do elenco principal em preparação',
  );

  const customizerTrigger = page.getByRole('button', { name: 'Configurar tabela' });
  await customizerTrigger.focus();
  const focusRect = await customizerTrigger.boundingBox();
  expect(focusRect).not.toBeNull();
  expect(focusRect?.x).toBeGreaterThanOrEqual(0);
  expect((focusRect?.x ?? 0) + (focusRect?.width ?? 0)).toBeLessThanOrEqual(960);
  await customizerTrigger.click();
  const customizer = page.getByRole('dialog', { name: 'Configurar tabela' });
  await expect(customizer.getByRole('searchbox', { name: 'Buscar colunas' })).toBeFocused();
  await customizer.getByRole('searchbox', { name: 'Buscar colunas' }).fill('Jogador');
  await expect(customizer.getByText(/identidade principal/u)).toBeVisible();

  const reducedDuration = await customizer.evaluate(
    (element) => getComputedStyle(element).transitionDuration,
  );
  expect(reducedDuration).toMatch(/(?:0s|0\.00001s|0\.01ms)/u);
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
      ? [{ width: 1024, height: 768 }, currentViewport]
      : [currentViewport];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto(developmentUrl);
    await expect(page.getByRole('table')).toBeVisible();

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
      return {
        documentOverflow: document.documentElement.scrollWidth > window.innerWidth,
        tableRatio: tableRect.width / layoutRect.width,
        tableLocalOverflow: tableOverflow.scrollWidth > tableOverflow.clientWidth,
        inspectorReflowed: inspectorRect.top >= tableRect.bottom - 1,
      };
    });
    expect(geometry.documentOverflow).toBe(false);
    expect(geometry.tableLocalOverflow).toBe(true);
    if (viewport.width >= 1280) {
      expect(geometry.tableRatio).toBeGreaterThanOrEqual(0.65);
    } else {
      expect(geometry.inspectorReflowed).toBe(true);
    }

    await page.getByRole('button', { name: 'Configurar tabela' }).click();
    const customizer = page.getByRole('dialog', { name: 'Configurar tabela' });
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
