import path from 'node:path';
import { defineConfig } from 'vitest/config';
import dotenv from 'dotenv';

// Load the test environment BEFORE the application reads process.env.
// dotenv does not override variables that are already set, so CI can still
// point DATABASE_URL at its own instance.
dotenv.config({ path: path.resolve(__dirname, '.env.test') });

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    // Integration tests share one Postgres database, so they run serially
    // in a single fork. Parallel workers would truncate each other's rows.
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    fileParallelism: false,
    include: ['tests/integration/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
    globalSetup: ['tests/globalSetup.ts'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    reporters: ['verbose'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts', 'src/types/**'],
    },
  },
});
