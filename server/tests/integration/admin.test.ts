import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { createApp } from '../../src/app';
import { prisma } from '../../src/lib/prisma';
import {
  createPendingOrder,
  createProduct,
  createUser,
  loginAsNewAdmin,
  loginAsNewCustomer,
} from '../helpers/factories';

let app: Express;

beforeAll(() => {
  app = createApp();
});

/** Creates an order in a given state, with a matching payment record. */
const createOrderInState = async (options: {
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  totalCents: number;
  sessionId: string;
}) => {
  const user = await createUser();
  const product = await createProduct({ priceCents: options.totalCents, stock: 100 });
  const order = await createPendingOrder({
    userId: user.id,
    product,
    sessionId: options.sessionId,
  });

  await prisma.order.update({ where: { id: order.id }, data: { status: options.status } });
  await prisma.payment.update({
    where: { orderId: order.id },
    data: {
      status: options.paymentStatus,
      paidAt: options.paymentStatus === PaymentStatus.SUCCEEDED ? new Date() : null,
    },
  });

  return order;
};

describe('GET /api/admin/stats', () => {
  it('rejects an unauthenticated request', async () => {
    await request(app).get('/api/admin/stats').expect(401);
  });

  it('rejects a non-admin customer with 403', async () => {
    const { agent } = await loginAsNewCustomer(app);

    const response = await agent.get('/api/admin/stats').expect(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('counts ONLY paid orders as successful revenue', async () => {
    await createOrderInState({
      status: OrderStatus.PAID,
      paymentStatus: PaymentStatus.SUCCEEDED,
      totalCents: 10_000,
      sessionId: 'cs_stats_paid_1',
    });
    await createOrderInState({
      status: OrderStatus.PAID,
      paymentStatus: PaymentStatus.SUCCEEDED,
      totalCents: 25_000,
      sessionId: 'cs_stats_paid_2',
    });

    // None of the following may contribute a cent to revenue.
    await createOrderInState({
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      totalCents: 99_999,
      sessionId: 'cs_stats_pending',
    });
    await createOrderInState({
      status: OrderStatus.FAILED,
      paymentStatus: PaymentStatus.FAILED,
      totalCents: 88_888,
      sessionId: 'cs_stats_failed',
    });
    await createOrderInState({
      status: OrderStatus.CANCELLED,
      paymentStatus: PaymentStatus.CANCELLED,
      totalCents: 77_777,
      sessionId: 'cs_stats_cancelled',
    });
    await createOrderInState({
      status: OrderStatus.EXPIRED,
      paymentStatus: PaymentStatus.EXPIRED,
      totalCents: 66_666,
      sessionId: 'cs_stats_expired',
    });
    await createOrderInState({
      status: OrderStatus.REFUNDED,
      paymentStatus: PaymentStatus.REFUNDED,
      totalCents: 55_555,
      sessionId: 'cs_stats_refunded',
    });

    const { agent } = await loginAsNewAdmin(app);
    const response = await agent.get('/api/admin/stats').expect(200);
    const stats = response.body.data.stats;

    expect(stats.successfulRevenueCents).toBe(35_000); // 10000 + 25000 only
    expect(stats.paidOrders).toBe(2);
    expect(stats.totalOrders).toBe(7);
    expect(stats.averageOrderValueCents).toBe(17_500);
  });

  it('reports zero revenue when nothing has been paid', async () => {
    await createOrderInState({
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      totalCents: 42_000,
      sessionId: 'cs_stats_zero',
    });

    const { agent } = await loginAsNewAdmin(app);
    const response = await agent.get('/api/admin/stats').expect(200);

    expect(response.body.data.stats.successfulRevenueCents).toBe(0);
    expect(response.body.data.stats.averageOrderValueCents).toBe(0);
  });

  it('breaks payments down by status', async () => {
    await createOrderInState({
      status: OrderStatus.PAID,
      paymentStatus: PaymentStatus.SUCCEEDED,
      totalCents: 10_000,
      sessionId: 'cs_breakdown_1',
    });
    await createOrderInState({
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      totalCents: 10_000,
      sessionId: 'cs_breakdown_2',
    });
    await createOrderInState({
      status: OrderStatus.FAILED,
      paymentStatus: PaymentStatus.FAILED,
      totalCents: 10_000,
      sessionId: 'cs_breakdown_3',
    });

    const { agent } = await loginAsNewAdmin(app);
    const stats = (await agent.get('/api/admin/stats').expect(200)).body.data.stats;

    expect(stats.payments).toMatchObject({ successful: 1, pending: 1, failed: 1 });
  });

  it('counts customers without counting admins', async () => {
    await createUser();
    await createUser();

    const { agent } = await loginAsNewAdmin(app);
    const stats = (await agent.get('/api/admin/stats').expect(200)).body.data.stats;

    expect(stats.totalCustomers).toBe(2);
  });

  it('reports product counts and low stock', async () => {
    await createProduct({ stock: 50 });
    await createProduct({ stock: 3 });
    await createProduct({ stock: 0 });
    await createProduct({ stock: 20, isActive: false });

    const { agent } = await loginAsNewAdmin(app);
    const stats = (await agent.get('/api/admin/stats').expect(200)).body.data.stats;

    expect(stats.totalProducts).toBe(4);
    expect(stats.activeProducts).toBe(3);
    expect(stats.lowStockProducts).toBe(2); // the 3 and the 0
  });

  it('returns a continuous revenue series with no gaps', async () => {
    const { agent } = await loginAsNewAdmin(app);
    const stats = (await agent.get('/api/admin/stats?days=7').expect(200)).body.data.stats;

    expect(stats.revenueOverview).toHaveLength(7);
    for (const point of stats.revenueOverview) {
      expect(point).toHaveProperty('date');
      expect(Number.isInteger(point.revenueCents)).toBe(true);
    }
  });

  it('lists recent paid purchases only', async () => {
    const paid = await createOrderInState({
      status: OrderStatus.PAID,
      paymentStatus: PaymentStatus.SUCCEEDED,
      totalCents: 10_000,
      sessionId: 'cs_recent_paid',
    });
    await createOrderInState({
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      totalCents: 10_000,
      sessionId: 'cs_recent_pending',
    });

    const { agent } = await loginAsNewAdmin(app);
    const stats = (await agent.get('/api/admin/stats').expect(200)).body.data.stats;

    expect(stats.recentPurchases).toHaveLength(1);
    expect(stats.recentPurchases[0].id).toBe(paid.id);
    expect(stats.recentPurchases[0].customer).toHaveProperty('email');
  });
});

describe('API hygiene', () => {
  it('responds to the health check', async () => {
    const response = await request(app).get('/api/health').expect(200);
    expect(response.body.data.status).toBe('ok');
  });

  it('returns a structured 404 for an unknown route', async () => {
    const response = await request(app).get('/api/does-not-exist').expect(404);
    expect(response.body).toMatchObject({ success: false, error: { code: 'NOT_FOUND' } });
  });

  it('rejects malformed JSON with 400 rather than crashing', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": "broken"')
      .expect(400);

    expect(response.body.success).toBe(false);
  });

  it('sets security headers', async () => {
    const response = await request(app).get('/api/health').expect(200);

    expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
    expect(response.headers['x-powered-by']).toBeUndefined();
  });
});
