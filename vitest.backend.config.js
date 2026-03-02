import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    pool: 'forks',
    setupFiles: ['./vitest.backend.setup.cjs'],
    include: [
      'server/**/*.{test,spec}.{js,ts,mjs}',
      'packages/cli/**/*.{test,spec}.{js,ts,mjs}',
      'packages/core/**/*.{test,spec}.{js,ts,mjs}',
    ],
  },
});
