import { afterAll, afterEach, beforeEach, vi } from 'vitest';
import { prisma } from '../src/lib/prisma';

/**
 * Every test starts from an empty database. Truncating is faster than
 * re-running migrations and keeps tests independent of execution order.
 * CASCADE handles the foreign keys between orders, items and payments.
 */
const truncateAll = async (): Promise<void> => {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "webhook_events", "order_items", "payments", "orders", "products", "users" CASCADE',
  );
};

beforeEach(async () => {
  await truncateAll();
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(async () => {
  await truncateAll();
  await prisma.$disconnect();
});
