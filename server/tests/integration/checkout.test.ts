import { beforeAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import type Stripe from 'stripe';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { createApp } from '../../src/app';
import { prisma } from '../../src/lib/prisma';
import { stripe } from '../../src/lib/stripe';
import { createProduct, loginAsNewCustomer } from '../helpers/factories';

let app: Express;

beforeAll(() => {
  app = createApp();
});

/**
 * Stubs only the outbound call to Stripe's API. Everything else — validation,
 * pricing, order creation, the database transaction — runs for real.
 */
const stubSessionCreate = (overrides: Record<string, unknown> = {}) =>
  vi.spyOn(stripe.checkout.sessions, 'create').mockResolvedValue({
    id: 'cs_test_stubbed',
    url: 'https://checkout.stripe.com/c/pay/cs_test_stubbed',
    payment_intent: 'pi_test_stubbed',
    ...overrides,
  } as never);

/**
 * `sessions.create` is overloaded in the SDK, so the recorded call tuple is
 * narrowed to the wrong overload by default. This asserts the shape we
 * actually invoke: (params, requestOptions).
 */
const sessionCreateArgs = (spy: ReturnType<typeof stubSessionCreate>) =>
  spy.mock.calls as unknown as Array<
    [Stripe.Checkout.SessionCreateParams, { idempotencyKey?: string } | undefined]
  >;

describe('POST /api/checkout', () => {
  it('requires authentication', async () => {
    const product = await createProduct();

    const response = await request(app)
      .post('/api/checkout')
      .send({ items: [{ productId: product.id, quantity: 1 }] })
      .expect(401);

    expect(response.body.error.code).toBe('UNAUTHORIZED');
    expect(await prisma.order.count()).toBe(0);
  });

  it('creates a pending order and returns the Stripe checkout URL', async () => {
    const createSpy = stubSessionCreate();
    const product = await createProduct({ priceCents: 24_999, stock: 5 });
    const { agent, csrfToken, user } = await loginAsNewCustomer(app);

    const response = await agent
      .post('/api/checkout')
      .set('X-CSRF-Token', csrfToken)
      .send({ items: [{ productId: product.id, quantity: 2 }] })
      .expect(201);

    expect(response.body.data).toMatchObject({
      checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_test_stubbed',
      sessionId: 'cs_test_stubbed',
      totalAmountCents: 49_998, // 24999 * 2, computed server-side
      currency: 'usd',
    });

    const order = await prisma.order.findFirst({
      where: { userId: user.id },
      include: { items: true, payment: true },
    });

    expect(order).toMatchObject({
      status: OrderStatus.PENDING,
      subtotalCents: 49_998,
      totalAmountCents: 49_998,
      stripeCheckoutSessionId: 'cs_test_stubbed',
    });
    expect(order?.payment?.status).toBe(PaymentStatus.PENDING);
    expect(order?.items).toHaveLength(1);
    expect(order?.items[0]).toMatchObject({
      quantity: 2,
      unitPriceCents: 24_999,
      subtotalCents: 49_998,
      productName: product.name, // snapshot
    });

    expect(createSpy).toHaveBeenCalledTimes(1);
  });

  it('sends Stripe the price from the database, in integer minor units', async () => {
    const createSpy = stubSessionCreate();
    const product = await createProduct({ priceCents: 1_999 });
    const { agent, csrfToken } = await loginAsNewCustomer(app);

    await agent
      .post('/api/checkout')
      .set('X-CSRF-Token', csrfToken)
      .send({ items: [{ productId: product.id, quantity: 3 }] })
      .expect(201);

    const params = sessionCreateArgs(createSpy)[0]![0];
    const firstLine = params.line_items?.[0];

    expect(firstLine?.price_data?.unit_amount).toBe(1_999);
    expect(firstLine?.quantity).toBe(3);
    expect(Number.isInteger(firstLine?.price_data?.unit_amount)).toBe(true);
  });

  it('passes an idempotency key so a retry cannot create two sessions', async () => {
    const createSpy = stubSessionCreate();
    const product = await createProduct();
    const { agent, csrfToken } = await loginAsNewCustomer(app);

    await agent
      .post('/api/checkout')
      .set('X-CSRF-Token', csrfToken)
      .send({ items: [{ productId: product.id, quantity: 1 }] })
      .expect(201);

    const options = sessionCreateArgs(createSpy)[0]![1];
    expect(options?.idempotencyKey).toMatch(/^checkout_session_/);
  });

  it('IGNORES a price supplied by the client and charges the database price', async () => {
    const createSpy = stubSessionCreate();
    const product = await createProduct({ priceCents: 50_000 });
    const { agent, csrfToken } = await loginAsNewCustomer(app);

    const response = await agent
      .post('/api/checkout')
      .set('X-CSRF-Token', csrfToken)
      .send({
        items: [
          {
            productId: product.id,
            quantity: 1,
            // Tampering attempt — all of these must be discarded.
            priceCents: 1,
            unitPriceCents: 1,
            price: 0.01,
          },
        ],
        totalAmountCents: 1,
        subtotalCents: 1,
        total: 1,
      })
      .expect(201);

    expect(response.body.data.totalAmountCents).toBe(50_000);

    const params = sessionCreateArgs(createSpy)[0]![0];
    expect(params.line_items?.[0]?.price_data?.unit_amount).toBe(50_000);

    const order = await prisma.order.findFirst();
    expect(order?.totalAmountCents).toBe(50_000);
  });

  it('rejects a malformed product id with 422', async () => {
    stubSessionCreate();
    const { agent, csrfToken } = await loginAsNewCustomer(app);

    await agent
      .post('/api/checkout')
      .set('X-CSRF-Token', csrfToken)
      .send({ items: [{ productId: 'not-a-uuid', quantity: 1 }] })
      .expect(422);
  });

  it('rejects a product that does not exist with 409', async () => {
    stubSessionCreate();
    const { agent, csrfToken } = await loginAsNewCustomer(app);

    const response = await agent
      .post('/api/checkout')
      .set('X-CSRF-Token', csrfToken)
      .send({ items: [{ productId: '11111111-1111-4111-8111-111111111111', quantity: 1 }] })
      .expect(409);

    expect(response.body.error.code).toBe('CONFLICT');
    expect(await prisma.order.count()).toBe(0);
  });

  it('rejects an invalid quantity with 422', async () => {
    stubSessionCreate();
    const product = await createProduct();
    const { agent, csrfToken } = await loginAsNewCustomer(app);

    for (const quantity of [0, -3, 1.5, 21]) {
      await agent
        .post('/api/checkout')
        .set('X-CSRF-Token', csrfToken)
        .send({ items: [{ productId: product.id, quantity }] })
        .expect(422);
    }

    expect(await prisma.order.count()).toBe(0);
  });

  it('rejects an empty cart with 422', async () => {
    stubSessionCreate();
    const { agent, csrfToken } = await loginAsNewCustomer(app);

    await agent.post('/api/checkout').set('X-CSRF-Token', csrfToken).send({ items: [] }).expect(422);
  });

  it('rejects the same product listed twice with 422', async () => {
    stubSessionCreate();
    const product = await createProduct();
    const { agent, csrfToken } = await loginAsNewCustomer(app);

    await agent
      .post('/api/checkout')
      .set('X-CSRF-Token', csrfToken)
      .send({
        items: [
          { productId: product.id, quantity: 1 },
          { productId: product.id, quantity: 1 },
        ],
      })
      .expect(422);
  });

  it('rejects insufficient stock with 409 and creates no order', async () => {
    stubSessionCreate();
    const product = await createProduct({ stock: 2 });
    const { agent, csrfToken } = await loginAsNewCustomer(app);

    const response = await agent
      .post('/api/checkout')
      .set('X-CSRF-Token', csrfToken)
      .send({ items: [{ productId: product.id, quantity: 5 }] })
      .expect(409);

    expect(response.body.error.details?.[0]?.reason).toContain('Only 2 left');
    expect(await prisma.order.count()).toBe(0);
  });

  it('rejects an out-of-stock product with 409', async () => {
    stubSessionCreate();
    const product = await createProduct({ stock: 0 });
    const { agent, csrfToken } = await loginAsNewCustomer(app);

    const response = await agent
      .post('/api/checkout')
      .set('X-CSRF-Token', csrfToken)
      .send({ items: [{ productId: product.id, quantity: 1 }] })
      .expect(409);

    expect(response.body.error.details?.[0]?.reason).toContain('out of stock');
  });

  it('rejects an inactive product with 409', async () => {
    stubSessionCreate();
    const product = await createProduct({ isActive: false });
    const { agent, csrfToken } = await loginAsNewCustomer(app);

    await agent
      .post('/api/checkout')
      .set('X-CSRF-Token', csrfToken)
      .send({ items: [{ productId: product.id, quantity: 1 }] })
      .expect(409);
  });

  it('rejects a cart mixing currencies', async () => {
    stubSessionCreate();
    const usd = await createProduct({ currency: 'usd' });
    const eur = await createProduct({ currency: 'eur' });
    const { agent, csrfToken } = await loginAsNewCustomer(app);

    await agent
      .post('/api/checkout')
      .set('X-CSRF-Token', csrfToken)
      .send({
        items: [
          { productId: usd.id, quantity: 1 },
          { productId: eur.id, quantity: 1 },
        ],
      })
      .expect(400);
  });

  it('does NOT decrement stock when the session is created', async () => {
    stubSessionCreate();
    const product = await createProduct({ stock: 10 });
    const { agent, csrfToken } = await loginAsNewCustomer(app);

    await agent
      .post('/api/checkout')
      .set('X-CSRF-Token', csrfToken)
      .send({ items: [{ productId: product.id, quantity: 4 }] })
      .expect(201);

    // Inventory is committed only when a verified payment arrives, so an
    // abandoned checkout cannot hold stock hostage.
    const stored = await prisma.product.findUnique({ where: { id: product.id } });
    expect(stored?.stock).toBe(10);
  });

  it('marks the order FAILED and returns 502 when Stripe rejects the request', async () => {
    vi.spyOn(stripe.checkout.sessions, 'create').mockRejectedValue(new Error('Stripe is down'));
    const product = await createProduct();
    const { agent, csrfToken } = await loginAsNewCustomer(app);

    const response = await agent
      .post('/api/checkout')
      .set('X-CSRF-Token', csrfToken)
      .send({ items: [{ productId: product.id, quantity: 1 }] })
      .expect(502);

    expect(response.body.error.code).toBe('STRIPE_ERROR');

    // No orphaned PENDING order the customer could never complete.
    const order = await prisma.order.findFirst({ include: { payment: true } });
    expect(order?.status).toBe(OrderStatus.FAILED);
    expect(order?.payment?.status).toBe(PaymentStatus.FAILED);
  });

  it('attaches the order id to the session metadata for webhook correlation', async () => {
    const createSpy = stubSessionCreate();
    const product = await createProduct();
    const { agent, csrfToken } = await loginAsNewCustomer(app);

    const response = await agent
      .post('/api/checkout')
      .set('X-CSRF-Token', csrfToken)
      .send({ items: [{ productId: product.id, quantity: 1 }] })
      .expect(201);

    const params = sessionCreateArgs(createSpy)[0]![0];

    expect(params.metadata?.orderId).toBe(response.body.data.orderId);
    expect(params.client_reference_id).toBe(response.body.data.orderId);
  });
});

describe('POST /api/checkout/validate', () => {
  it('returns server-computed totals without creating an order', async () => {
    const product = await createProduct({ priceCents: 7_400 });
    const { agent, csrfToken } = await loginAsNewCustomer(app);

    const response = await agent
      .post('/api/checkout/validate')
      .set('X-CSRF-Token', csrfToken)
      .send({ items: [{ productId: product.id, quantity: 2 }] })
      .expect(200);

    expect(response.body.data).toMatchObject({ valid: true, totalAmountCents: 14_800 });
    expect(await prisma.order.count()).toBe(0);
  });
});
