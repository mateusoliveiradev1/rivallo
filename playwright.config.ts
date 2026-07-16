import { defineConfig } from '@playwright/test';

const developmentServer = {
  command: 'pnpm --filter @rivallo/desktop exec vite --host 127.0.0.1 --port 4173 --strictPort',
  url: 'http://127.0.0.1:4173/__ui-lab',
  reuseExistingServer: !process.env.CI,
  timeout: 60_000,
};

const productionServer = {
  command:
    'pnpm --filter @rivallo/desktop build && pnpm --filter @rivallo/desktop exec vite preview --host 127.0.0.1 --port 4174 --strictPort',
  url: 'http://127.0.0.1:4174/',
  reuseExistingServer: !process.env.CI,
  timeout: 60_000,
};

export default defineConfig({
  testDir: './browser-tests',
  outputDir: 'test-results',
  snapshotPathTemplate: '{testDir}/__screenshots__/matchday/{arg}{ext}',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['line'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    browserName: 'chromium',
    colorScheme: 'dark',
    deviceScaleFactor: 1,
    locale: 'pt-BR',
    screenshot: 'off',
    timezoneId: 'America/Sao_Paulo',
    trace: 'retain-on-failure',
    video: 'off',
  },
  webServer: [developmentServer, productionServer],
  projects: [
    { name: 'desktop-1366x768', use: { viewport: { width: 1366, height: 768 } } },
    { name: 'desktop-1920x1080', use: { viewport: { width: 1920, height: 1080 } } },
    { name: 'desktop-2560x1080', use: { viewport: { width: 2560, height: 1080 } } },
  ],
});
