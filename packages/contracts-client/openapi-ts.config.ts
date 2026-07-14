import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input: '../../contracts/openapi.json',
  output: {
    path: './src/generated',
  },
  plugins: ['@hey-api/typescript', '@hey-api/sdk', '@hey-api/client-fetch'],
});
