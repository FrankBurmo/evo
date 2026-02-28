import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['server/**/*.{test,spec}.{js,mjs}', 'packages/cli/**/*.{test,spec}.{js,mjs}'],
  },
});
