import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

// Load .env from the server package root regardless of the cwd the process
// was started from (npm scripts, docker, vitest all differ).
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  COOKIE_NAME: z.string().default('nova_token'),
  CSRF_COOKIE_NAME: z.string().default('nova_csrf'),
  COOKIE_DOMAIN: z.string().optional(),
  // 'lax' is deliberate: the Stripe success/cancel redirect is a top-level
  // cross-site GET navigation back to our app, and a 'strict' cookie would
  // not be sent on it, logging the customer out at the worst moment.
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),

  STRIPE_SECRET_KEY: z.string().min(1, 'STRIPE_SECRET_KEY is required'),
  STRIPE_WEBHOOK_SECRET: z.string().min(1, 'STRIPE_WEBHOOK_SECRET is required'),
  STRIPE_CURRENCY: z.string().length(3).default('usd'),

  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  SEED_ADMIN_EMAIL: z.string().email().default('admin@novamarket.test'),
  SEED_ADMIN_PASSWORD: z.string().min(8).default('Admin123!change'),
  SEED_ADMIN_NAME: z.string().default('Nova Admin'),
  SEED_CUSTOMER_EMAIL: z.string().email().default('customer@novamarket.test'),
  SEED_CUSTOMER_PASSWORD: z.string().min(8).default('Customer123!'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  // Fail fast and loudly: a missing secret must never degrade into a
  // half-configured server that silently skips signature verification.
  throw new Error(`Invalid environment configuration:\n${issues}`);
}

const raw = parsed.data;

export const env = {
  ...raw,
  isProduction: raw.NODE_ENV === 'production',
  isTest: raw.NODE_ENV === 'test',
  isDevelopment: raw.NODE_ENV === 'development',
  corsOrigins: raw.CORS_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
} as const;

export type Env = typeof env;
