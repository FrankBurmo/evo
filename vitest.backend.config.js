import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['server/**/*.{test,spec}.{js,mjs}', 'packages/cli/**/*.{test,spec}.{js,mjs}', 'packages/core/**/*.{test,spec}.{js,mjs}'],
  },
});
