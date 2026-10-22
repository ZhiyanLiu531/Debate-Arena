import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 30000,
    setupFiles: ['./tests/setup.mjs'],
    include: ['tests/**/*.test.mjs'],
    fileParallelism: false,
    sequence: {
      shuffle: false,
      concurrent: false
    },
    poolOptions: {
      forks: {
        singleFork: true
      }
    }
  }
});
