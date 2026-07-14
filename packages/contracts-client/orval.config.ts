import { defineConfig } from 'orval';

export default defineConfig({
  contracts: {
    input: { target: '../../contracts/openapi.json' },
    output: {
      target: process.env.CONTRACT_CLIENT_OUTPUT ?? 'src/generated/contracts.ts',
      mode: 'single',
      client: 'fetch',
      clean: true,
      formatter: 'prettier',
    },
  },
});
