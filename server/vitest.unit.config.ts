import path from 'node:path';
import { defineConfig } from 'vitest/config';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '.env.test') });

/**
 * Unit suite: pure functions and real cryptography, with no database.
 * It deliberately omits tests/setup.ts (which truncates tables), so it can
 * run anywhere — CI without Postgres included.
 */
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/unit/**/*.test.ts'],
    reporters: ['verbose'],
  },
});
