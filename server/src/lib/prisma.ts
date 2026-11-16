import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';

// A single PrismaClient per process. In dev, tsx watch re-evaluates modules on
// change, so the instance is cached on globalThis to avoid exhausting the
// Postgres connection pool with orphaned clients.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.isDevelopment ? ['warn', 'error'] : ['error'],
  });

if (!env.isProduction) {
  globalForPrisma.prisma = prisma;
}

export type PrismaTransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;
