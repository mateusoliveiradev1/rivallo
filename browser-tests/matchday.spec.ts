import { expect, test } from '@playwright/test';

import type { MatchdayState, Player } from '../apps/desktop/src/matchday/types.js';

const developmentUrl = 'http://127.0.0.1:4173/';
const bridgeStateKey = 'rivallo.browser-test.matchday-state';

const screenshotViewports = [
  { width: 1024, height: 768 },
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 },
  { width: 2560, height: 1080 },
] as const;

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
  await expect(page.locator('.squad-table img')).toHaveCount(18);
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
  await page.getByRole('button', { name: 'Densidade confortável' }).click();
  await page.getByText('Colunas', { exact: true }).click();
  await page.getByRole('button', { name: /Idade.*Visível/u }).click();
  await expect(page.locator('th[data-column="age"]')).toBeHidden();

  await page.reload();
  await expect(page.locator('.manager-shell')).toHaveAttribute('data-sidebar-collapsed', 'true');
  await expect(page.locator('th[data-column="age"]')).toBeHidden();
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
