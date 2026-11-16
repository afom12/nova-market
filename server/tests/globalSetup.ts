import { execSync } from 'node:child_process';

/**
 * Applies the committed migrations to the TEST database once, before any
 * test file runs. `migrate deploy` is used rather than `migrate dev` so the
 * suite applies exactly the migrations that ship with the repo and never
 * invents a new one.
 */
export default async function setup(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set. Copy server/.env.test and point it at a test database.');
  }

  if (!/test/i.test(databaseUrl)) {
    // The suite truncates every table between tests, so refuse to run
    // against anything that is not clearly a test database.
    throw new Error(
      `Refusing to run tests against "${databaseUrl}" — the database name must contain "test".`,
    );
  }

  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
}
