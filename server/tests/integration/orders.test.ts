import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { OrderStatus } from '@prisma/client';
import { createApp } from '../../src/app';
import { prisma } from '../../src/lib/prisma';
import {
  createPendingOrder,
  createProduct,
  createUser,
  login,
  loginAsNewAdmin,
} from '../helpers/factories';

let app: Express;

beforeAll(() => {
  app = createApp();
});

describe('GET /api/orders', () => {
  it('requires authentication', async () => {
    await request(app).get('/api/orders').expect(401);
  });

  it('returns only the signed-in customer’s orders', async () => {
    const alice = await createUser({ email: 'alice@test.io' });
    const bob = await createUser({ email: 'bob@test.io' });
    const product = await createProduct();

    await createPendingOrder({ userId: alice.id, product, sessionId: 'cs_alice_1' });
    await createPendingOrder({ userId: alice.id, product, sessionId: 'cs_alice_2' });
    await createPendingOrder({ userId: bob.id, product, sessionId: 'cs_bob_1' });

    const { agent } = await login(app, alice.email);
    const response = await agent.get('/api/orders').expect(200);

    expect(response.body.data.orders).toHaveLength(2);
    expect(response.body.meta.pagination.total).toBe(2);
    for (const order of response.body.data.orders) {
      expect(order.userId).toBe(alice.id);
    }
  });

  it('includes items, snapshots and payment state', async () => {
    const user = await createUser();
    const product = await createProduct({ name: 'Snapshot Product', priceCents: 12_345 });
    await createPendingOrder({ userId: user.id, product, quantity: 2, sessionId: 'cs_detail' });

    const { agent } = await login(app, user.email);
    const response = await agent.get('/api/orders').expect(200);
    const order = response.body.data.orders[0];

    expect(order).toMatchObject({
      status: OrderStatus.PENDING,
      totalAmountCents: 24_690,
      currency: 'usd',
    });
    expect(order.items[0]).toMatchObject({
      productName: 'Snapshot Product',
      quantity: 2,
      unitPriceCents: 12_345,
      subtotalCents: 24_690,
    });
    expect(order.payment).not.toBeNull();
    expect(order.orderNumber).toMatch(/^NM-\d{8}-[A-Z0-9]{6}$/);
  });

  it('filters by status', async () => {
    const user = await createUser();
    const product = await createProduct();
    const paid = await createPendingOrder({ userId: user.id, product, sessionId: 'cs_paid_filter' });
    await createPendingOrder({ userId: user.id, product, sessionId: 'cs_pending_filter' });
    await prisma.order.update({ where: { id: paid.id }, data: { status: OrderStatus.PAID } });

    const { agent } = await login(app, user.email);
    const response = await agent.get('/api/orders?status=PAID').expect(200);

    expect(response.body.data.orders).toHaveLength(1);
    expect(response.body.data.orders[0].id).toBe(paid.id);
  });

  it('paginates', async () => {
    const user = await createUser();
    const product = await createProduct();
    for (let i = 0; i < 4; i += 1) {
      await createPendingOrder({ userId: user.id, product, sessionId: `cs_page_${i}` });
    }

    const { agent } = await login(app, user.email);
    const response = await agent.get('/api/orders?page=1&limit=2').expect(200);

    expect(response.body.data.orders).toHaveLength(2);
    expect(response.body.meta.pagination).toMatchObject({ total: 4, totalPages: 2, hasNextPage: true });
  });

  it('persists order history across sessions', async () => {
    const user = await createUser({ email: 'persist@test.io' });
    const product = await createProduct();
    await createPendingOrder({ userId: user.id, product, sessionId: 'cs_persist' });

    const first = await login(app, user.email);
    expect((await first.agent.get('/api/orders').expect(200)).body.data.orders).toHaveLength(1);
    await first.agent.post('/api/auth/logout').set('X-CSRF-Token', first.csrfToken).expect(200);

    // Sign in again — the order must still be there.
    const second = await login(app, user.email);
    expect((await second.agent.get('/api/orders').expect(200)).body.data.orders).toHaveLength(1);
  });
});

describe('GET /api/orders/:id', () => {
  it('returns the customer’s own order', async () => {
    const user = await createUser();
    const product = await createProduct();
    const order = await createPendingOrder({ userId: user.id, product, sessionId: 'cs_own' });

    const { agent } = await login(app, user.email);
    const response = await agent.get(`/api/orders/${order.id}`).expect(200);

    expect(response.body.data.order.id).toBe(order.id);
  });

  it('returns 404 — not 403 — for another customer’s order', async () => {
    const alice = await createUser({ email: 'alice2@test.io' });
    const bob = await createUser({ email: 'bob2@test.io' });
    const product = await createProduct();
    const bobsOrder = await createPendingOrder({ userId: bob.id, product, sessionId: 'cs_bobs' });

    const { agent } = await login(app, alice.email);

    // 404 rather than 403, so the endpoint does not confirm the id is real.
    const response = await agent.get(`/api/orders/${bobsOrder.id}`).expect(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('rejects an unauthenticated request', async () => {
    const user = await createUser();
    const product = await createProduct();
    const order = await createPendingOrder({ userId: user.id, product, sessionId: 'cs_anon' });

    await request(app).get(`/api/orders/${order.id}`).expect(401);
  });

  it('rejects a malformed id with 422', async () => {
    const user = await createUser();
    const { agent } = await login(app, user.email);

    await agent.get('/api/orders/not-a-uuid').expect(422);
  });

  it('does not let an admin read a customer order through the customer endpoint', async () => {
    const customer = await createUser({ email: 'cust-scope@test.io' });
    const product = await createProduct();
    const order = await createPendingOrder({ userId: customer.id, product, sessionId: 'cs_scope' });

    const { agent } = await loginAsNewAdmin(app);

    // The customer endpoint is strictly self-scoped; admins use /api/admin.
    await agent.get(`/api/orders/${order.id}`).expect(404);
  });
});

describe('GET /api/orders/by-session', () => {
  it('finds the order behind a checkout session', async () => {
    const user = await createUser();
    const product = await createProduct();
    const order = await createPendingOrder({ userId: user.id, product, sessionId: 'cs_lookup' });

    const { agent } = await login(app, user.email);
    const response = await agent.get('/api/orders/by-session?sessionId=cs_lookup').expect(200);

    expect(response.body.data.order.id).toBe(order.id);
    expect(response.body.data.awaitingConfirmation).toBe(true);
  });

  it('does not expose another customer’s session', async () => {
    const alice = await createUser({ email: 'alice3@test.io' });
    const bob = await createUser({ email: 'bob3@test.io' });
    const product = await createProduct();
    await createPendingOrder({ userId: bob.id, product, sessionId: 'cs_bob_session' });

    const { agent } = await login(app, alice.email);
    await agent.get('/api/orders/by-session?sessionId=cs_bob_session').expect(404);
  });

  it('requires the sessionId parameter', async () => {
    const user = await createUser();
    const { agent } = await login(app, user.email);

    await agent.get('/api/orders/by-session').expect(422);
  });
});

describe('GET /api/admin/orders', () => {
  it('rejects a customer with 403', async () => {
    const { loginAsNewCustomer } = await import('../helpers/factories');
    const { agent } = await loginAsNewCustomer(app);

    await agent.get('/api/admin/orders').expect(403);
  });

  it('returns every order with its customer for an admin', async () => {
    const alice = await createUser({ email: 'alice4@test.io' });
    const bob = await createUser({ email: 'bob4@test.io' });
    const product = await createProduct();
    await createPendingOrder({ userId: alice.id, product, sessionId: 'cs_admin_1' });
    await createPendingOrder({ userId: bob.id, product, sessionId: 'cs_admin_2' });

    const { agent } = await loginAsNewAdmin(app);
    const response = await agent.get('/api/admin/orders').expect(200);

    expect(response.body.data.orders).toHaveLength(2);
    expect(response.body.data.orders[0].user).toHaveProperty('email');
    expect(JSON.stringify(response.body)).not.toContain('passwordHash');
  });

  it('searches by order number', async () => {
    const user = await createUser();
    const product = await createProduct();
    const order = await createPendingOrder({ userId: user.id, product, sessionId: 'cs_search' });

    const { agent } = await loginAsNewAdmin(app);
    const response = await agent
      .get(`/api/admin/orders?search=${order.orderNumber}`)
      .expect(200);

    expect(response.body.data.orders).toHaveLength(1);
    expect(response.body.data.orders[0].id).toBe(order.id);
  });

  it('allows an admin to open any order’s details', async () => {
    const user = await createUser();
    const product = await createProduct();
    const order = await createPendingOrder({ userId: user.id, product, sessionId: 'cs_admin_detail' });

    const { agent } = await loginAsNewAdmin(app);
    const response = await agent.get(`/api/admin/orders/${order.id}`).expect(200);

    expect(response.body.data.order.id).toBe(order.id);
    expect(response.body.data.order.user.email).toBe(user.email);
  });
});
