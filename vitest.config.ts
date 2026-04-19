import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Exclude the integration suite from default `pnpm test` runs.
    // Use `pnpm test:integration` to run it explicitly.
    exclude: ['**/node_modules/**', '**/dist/**', 'tests/integration/**'],
  },
});
