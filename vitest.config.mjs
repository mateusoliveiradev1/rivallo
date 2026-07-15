import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    fileParallelism: false,
    projects: [
      {
        test: {
          name: 'tooling-node',
          environment: 'node',
          include: ['tooling-tests/**/*.test.mjs'],
        },
      },
      {
        test: {
          name: 'desktop-dom',
          environment: 'jsdom',
          include: ['apps/desktop/src/**/*.test.{ts,tsx}', 'packages/icons/src/**/*.test.{ts,tsx}'],
          globals: true,
        },
      },
    ],
  },
});
