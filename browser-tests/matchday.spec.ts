import { expect, test } from '@playwright/test';

import type { MatchdayState, Player } from '../apps/desktop/src/matchday/types.js';

const developmentUrl = 'http://127.0.0.1:4173/';

const playerRows: readonly (readonly [string, string, string, Player['position'], number])[] = [
  ['rv-01', 'Caio Brandão', 'C. Brandão', 'GK', 76],
  ['rv-02', 'Davi Moura', 'D. Moura', 'RB', 73],
  ['rv-03', 'Iago Serpa', 'I. Serpa', 'CB', 78],
  ['rv-04', 'Breno Vidal', 'B. Vidal', 'CB', 75],
  ['rv-05', 'Nilo Azevedo', 'N. Azevedo', 'LB', 74],
  ['rv-06', 'Tomás Paiva', 'T. Paiva', 'DM', 79],
  ['rv-07', 'Luan Seixas', 'L. Seixas', 'CM', 77],
  ['rv-08', 'Ravi Monteiro', 'R. Monteiro', 'CM', 76],
  ['rv-09', 'Enzo Falcão', 'E. Falcão', 'RW', 78],
  ['rv-10', 'Murilo Braga', 'M. Braga', 'ST', 81],
  ['rv-11', 'Noah Teles', 'N. Teles', 'LW', 77],
  ['rv-12', 'Ícaro Reis', 'Í. Reis', 'GK', 68],
  ['rv-13', 'Otávio Luz', 'O. Luz', 'CB', 72],
  ['rv-14', 'Pietro Nunes', 'P. Nunes', 'CM', 71],
  ['rv-15', 'Gael Ramos', 'G. Ramos', 'AM', 74],
  ['rv-16', 'Theo Barros', 'T. Barros', 'RW', 73],
  ['rv-17', 'Samuel Lins', 'S. Lins', 'ST', 75],
  ['rv-18', 'Vitor Amaral', 'V. Amaral', 'LB', 70],
];

const players: Player[] = playerRows.map(([id, name, shortName, position, rating], index) => ({
  id,
  name,
  shortName,
  position,
  age: 20 + (index % 11),
  rating,
  condition: 87 + (index % 13),
  selected: index < 11,
}));

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
  await page.addInitScript((seed) => {
    let state: MatchdayState = structuredClone(seed);
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
          return state;
        }
        if (command === 'play_next_match') {
          state = {
            ...state,
            round: 2,
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
          return state;
        }
        throw new Error(`Unexpected browser-test command: ${command}`);
      },
    };
    (window as unknown as { __TAURI_INTERNALS__: typeof bridge }).__TAURI_INTERNALS__ = bridge;
  }, initialState);
});

test('renders the real first-playable workspace without viewport overflow', async ({
  page,
}, testInfo) => {
  await page.goto(developmentUrl);

  await expect(
    page.getByRole('heading', { name: 'Prepare o Aurora para a rodada 1' }),
  ).toBeVisible();
  await expect(page.getByRole('table')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: testInfo.outputPath('matchday.png'), fullPage: true });
});

test('changes tactics, plays the match, and reveals the result feed', async ({
  page,
}, testInfo) => {
  await page.goto(developmentUrl);

  await page.getByRole('combobox').selectOption('4-2-3-1');
  await page.getByRole('radio', { name: /Protagonista/u }).check();
  const playButton = page.getByRole('button', { name: 'Jogar partida' });
  await playButton.click();

  await expect(page.getByRole('dialog', { name: '2 × 0' })).toBeVisible();
  await expect(page.getByText('Vitória · Rodada 1')).toBeVisible();
  await expect(page.getByText('Fim de jogo.')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('match-result.png') });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(playButton).toBeFocused();
});
