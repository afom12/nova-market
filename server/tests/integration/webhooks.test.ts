import { beforeAll, describe, expect, it } from 'vitest';
import type { Express } from 'express';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { createApp } from '../../src/app';
import { prisma } from '../../src/lib/prisma';
import { createPendingOrder, createProduct, createUser } from '../helpers/factories';
import { buildCheckoutSession, buildEvent, postSignedWebhook, postUnsignedWebhook } from '../helpers/stripe';

let app: Express;

beforeAll(() => {
  app = createApp();
});

/** Sets up a customer, a product and a PENDING order tied to a session id. */
const seedPendingOrder = async (options: { sessionId: string; stock?: number; quantity?: number } ) => {
  const user = await createUser();
  const product = await createProduct({ priceCents: 10_000, stock: options.stock ?? 10 });
  const order = await createPendingOrder({
    userId: user.id,
    product,
    quantity: options.quantity ?? 1,
    sessionId: options.sessionId,
  });
  return { user, product, order };
};

describe('signature verification', () => {
  it('accepts a correctly signed event', async () => {
    const { order } = await seedPendingOrder({ sessionId: 'cs_test_signed' });

    const event = buildEvent(
      'checkout.session.completed',
      buildCheckoutSession({
        id: 'cs_test_signed',
        payment_status: 'paid',
        amount_total: order.totalAmountCents,
        metadata: { orderId: order.id },
      }),
    );

    const response = await postSignedWebhook(app, event).expect(200);
    expect(response.body).toMatchObject({ received: true, outcome: 'processed' });
  });

  it('rejects an event whose signature does not verify', async () => {
    const { order } = await seedPendingOrder({ sessionId: 'cs_test_badsig' });

    const event = buildEvent(
      'checkout.session.completed',
      buildCheckoutSession({ id: 'cs_test_badsig', metadata: { orderId: order.id } }),
    );

    const response = await postUnsignedWebhook(app, event).expect(400);
    expect(response.body.error.code).toBe('INVALID_SIGNATURE');

    // Nothing may change on the back of an unverified request.
    const stored = await prisma.order.findUnique({ where: { id: order.id } });
    expect(stored?.status).toBe(OrderStatus.PENDING);
    expect(await prisma.webhookEvent.count()).toBe(0);
  });

  it('rejects an event signed with the wrong secret', async () => {
    const { order } = await seedPendingOrder({ sessionId: 'cs_test_wrongsecret' });

    const event = buildEvent(
      'checkout.session.completed',
      buildCheckoutSession({ id: 'cs_test_wrongsecret', metadata: { orderId: order.id } }),
    );

    await postSignedWebhook(app, event, { secret: 'whsec_a_completely_different_secret' }).expect(400);

    const stored = await prisma.order.findUnique({ where: { id: order.id } });
    expect(stored?.status).toBe(OrderStatus.PENDING);
  });

  it('rejects a request with no stripe-signature header', async () => {
    const request = (await import('supertest')).default;

    const response = await request(app)
      .post('/api/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify(buildEvent('checkout.session.completed', buildCheckoutSession())))
      .expect(400);

    expect(response.body.error.code).toBe('MISSING_SIGNATURE');
  });

  it('rejects an outdated signature timestamp (replay protection)', async () => {
    const { order } = await seedPendingOrder({ sessionId: 'cs_test_oldts' });

    const event = buildEvent(
      'checkout.session.completed',
      buildCheckoutSession({ id: 'cs_test_oldts', metadata: { orderId: order.id } }),
    );

    // Signed correctly, but an hour old — outside Stripe's default tolerance.
    await postSignedWebhook(app, event, { timestamp: Math.floor(Date.now() / 1000) - 3600 }).expect(400);
  });
});

describe('checkout.session.completed', () => {
  it('marks the order paid, records the payment and decrements stock', async () => {
    const { order, product } = await seedPendingOrder({
      sessionId: 'cs_test_paid',
      stock: 10,
      quantity: 3,
    });

    const event = buildEvent(
      'checkout.session.completed',
      buildCheckoutSession({
        id: 'cs_test_paid',
        payment_status: 'paid',
        amount_total: order.totalAmountCents,
        payment_intent: 'pi_test_paid',
        metadata: { orderId: order.id },
      }),
    );

    await postSignedWebhook(app, event).expect(200);

    const stored = await prisma.order.findUnique({
      where: { id: order.id },
      include: { payment: true },
    });

    expect(stored?.status).toBe(OrderStatus.PAID);
    expect(stored?.stripePaymentIntentId).toBe('pi_test_paid');
    expect(stored?.payment?.status).toBe(PaymentStatus.SUCCEEDED);
    expect(stored?.payment?.paidAt).toBeInstanceOf(Date);
    expect(stored?.payment?.amountCents).toBe(order.totalAmountCents);

    const storedProduct = await prisma.product.findUnique({ where: { id: product.id } });
    expect(storedProduct?.stock).toBe(7); // 10 - 3
  });

  it('records the event in the idempotency ledger', async () => {
    const { order } = await seedPendingOrder({ sessionId: 'cs_test_ledger' });

    const event = buildEvent(
      'checkout.session.completed',
      buildCheckoutSession({ id: 'cs_test_ledger', metadata: { orderId: order.id } }),
      'evt_ledger_entry',
    );

    await postSignedWebhook(app, event).expect(200);

    const ledger = await prisma.webhookEvent.findUnique({
      where: { stripeEventId: 'evt_ledger_entry' },
    });
    expect(ledger).toMatchObject({ eventType: 'checkout.session.completed' });
  });

  it('does NOT mark the order paid when payment_status is unpaid', async () => {
    const { order, product } = await seedPendingOrder({ sessionId: 'cs_test_unpaid', stock: 10 });

    // A completed session with a delayed payment method: funds are NOT
    // confirmed yet, so the order must stay pending.
    const event = buildEvent(
      'checkout.session.completed',
      buildCheckoutSession({
        id: 'cs_test_unpaid',
        payment_status: 'unpaid',
        metadata: { orderId: order.id },
      }),
    );

    await postSignedWebhook(app, event).expect(200);

    const stored = await prisma.order.findUnique({
      where: { id: order.id },
      include: { payment: true },
    });

    expect(stored?.status).toBe(OrderStatus.PENDING);
    expect(stored?.payment?.status).toBe(PaymentStatus.PROCESSING);
    expect(stored?.payment?.paidAt).toBeNull();

    const storedProduct = await prisma.product.findUnique({ where: { id: product.id } });
    expect(storedProduct?.stock).toBe(10); // untouched
  });

  it('associates the order via metadata when the session id is not yet stored', async () => {
    const user = await createUser();
    const product = await createProduct();
    // Order created without a session id — e.g. the webhook beat our update.
    const order = await prisma.order.create({
      data: {
        userId: user.id,
        orderNumber: `NM-TEST-${Date.now()}`,
        subtotalCents: 10_000,
        totalAmountCents: 10_000,
        currency: 'usd',
        items: {
          create: [
            {
              productId: product.id,
              productName: product.name,
              productImage: product.imageUrl,
              quantity: 1,
              unitPriceCents: 10_000,
              subtotalCents: 10_000,
            },
          ],
        },
      },
    });

    const event = buildEvent(
      'checkout.session.completed',
      buildCheckoutSession({
        id: 'cs_test_metadata_only',
        payment_status: 'paid',
        amount_total: 10_000,
        metadata: { orderId: order.id },
      }),
    );

    await postSignedWebhook(app, event).expect(200);

    const stored = await prisma.order.findUnique({ where: { id: order.id } });
    expect(stored?.status).toBe(OrderStatus.PAID);
    expect(stored?.stripeCheckoutSessionId).toBe('cs_test_metadata_only');
  });

  it('acknowledges an event for an unknown order without failing', async () => {
    const event = buildEvent(
      'checkout.session.completed',
      buildCheckoutSession({
        id: 'cs_test_orphan',
        payment_status: 'paid',
        metadata: { orderId: '11111111-1111-4111-8111-111111111111' },
      }),
    );

    // Retrying would never help, so this is acknowledged, not 500'd.
    const response = await postSignedWebhook(app, event).expect(200);
    expect(response.body.outcome).toBe('processed');
  });
});

describe('idempotency', () => {
  it('ignores a replayed event and never applies side effects twice', async () => {
    const { order, product } = await seedPendingOrder({
      sessionId: 'cs_test_replay',
      stock: 10,
      quantity: 2,
    });

    const event = buildEvent(
      'checkout.session.completed',
      buildCheckoutSession({
        id: 'cs_test_replay',
        payment_status: 'paid',
        amount_total: order.totalAmountCents,
        metadata: { orderId: order.id },
      }),
      'evt_replayed_once',
    );

    const first = await postSignedWebhook(app, event).expect(200);
    expect(first.body.outcome).toBe('processed');

    // Stripe redelivers the SAME event id.
    const second = await postSignedWebhook(app, event).expect(200);
    expect(second.body.outcome).toBe('duplicate');

    const third = await postSignedWebhook(app, event).expect(200);
    expect(third.body.outcome).toBe('duplicate');

    // Exactly one payment, one ledger row, one stock decrement.
    expect(await prisma.payment.count({ where: { orderId: order.id } })).toBe(1);
    expect(await prisma.webhookEvent.count({ where: { stripeEventId: 'evt_replayed_once' } })).toBe(1);

    const storedProduct = await prisma.product.findUnique({ where: { id: product.id } });
    expect(storedProduct?.stock).toBe(8); // 10 - 2, decremented once only
  });

  it('handles concurrent deliveries of the same event safely', async () => {
    const { order, product } = await seedPendingOrder({
      sessionId: 'cs_test_concurrent',
      stock: 10,
      quantity: 2,
    });

    const event = buildEvent(
      'checkout.session.completed',
      buildCheckoutSession({
        id: 'cs_test_concurrent',
        payment_status: 'paid',
        amount_total: order.totalAmountCents,
        metadata: { orderId: order.id },
      }),
      'evt_concurrent',
    );

    // Five simultaneous deliveries: the unique constraint must serialise them.
    const responses = await Promise.all(
      Array.from({ length: 5 }, () => postSignedWebhook(app, event)),
    );

    for (const response of responses) {
      expect(response.status).toBe(200);
    }
    expect(responses.filter((r) => r.body.outcome === 'processed')).toHaveLength(1);
    expect(responses.filter((r) => r.body.outcome === 'duplicate')).toHaveLength(4);

    const storedProduct = await prisma.product.findUnique({ where: { id: product.id } });
    expect(storedProduct?.stock).toBe(8);
    expect(await prisma.payment.count({ where: { orderId: order.id } })).toBe(1);
  });

  it('treats two distinct events for the same order independently but idempotently', async () => {
    const { order, product } = await seedPendingOrder({
      sessionId: 'cs_test_two_events',
      stock: 10,
      quantity: 2,
    });

    const session = buildCheckoutSession({
      id: 'cs_test_two_events',
      payment_status: 'paid',
      amount_total: order.totalAmountCents,
      metadata: { orderId: order.id },
    });

    await postSignedWebhook(app, buildEvent('checkout.session.completed', session, 'evt_a')).expect(200);
    // A different event id, but the order is already PAID — the conditional
    // status transition must stop the side effects.
    const second = await postSignedWebhook(
      app,
      buildEvent('checkout.session.async_payment_succeeded', session, 'evt_b'),
    ).expect(200);

    expect(second.body.outcome).toBe('processed');

    const storedProduct = await prisma.product.findUnique({ where: { id: product.id } });
    expect(storedProduct?.stock).toBe(8); // still decremented only once
    expect(await prisma.payment.count({ where: { orderId: order.id } })).toBe(1);
  });
});

describe('failure, cancellation and expiry', () => {
  it('marks the order FAILED on async_payment_failed', async () => {
    const { order, product } = await seedPendingOrder({ sessionId: 'cs_test_async_fail', stock: 10 });

    const event = buildEvent(
      'checkout.session.async_payment_failed',
      buildCheckoutSession({
        id: 'cs_test_async_fail',
        payment_status: 'unpaid',
        metadata: { orderId: order.id },
      }),
    );

    await postSignedWebhook(app, event).expect(200);

    const stored = await prisma.order.findUnique({
      where: { id: order.id },
      include: { payment: true },
    });

    expect(stored?.status).toBe(OrderStatus.FAILED);
    expect(stored?.payment?.status).toBe(PaymentStatus.FAILED);
    expect(stored?.payment?.paidAt).toBeNull();

    const storedProduct = await prisma.product.findUnique({ where: { id: product.id } });
    expect(storedProduct?.stock).toBe(10); // no stock consumed
  });

  it('marks the order EXPIRED when the session expires', async () => {
    const { order } = await seedPendingOrder({ sessionId: 'cs_test_expired' });

    const event = buildEvent(
      'checkout.session.expired',
      buildCheckoutSession({
        id: 'cs_test_expired',
        status: 'expired',
        payment_status: 'unpaid',
        metadata: { orderId: order.id },
      }),
    );

    await postSignedWebhook(app, event).expect(200);

    const stored = await prisma.order.findUnique({
      where: { id: order.id },
      include: { payment: true },
    });

    expect(stored?.status).toBe(OrderStatus.EXPIRED);
    expect(stored?.payment?.status).toBe(PaymentStatus.EXPIRED);
  });

  it('marks the order FAILED on payment_intent.payment_failed', async () => {
    const { order } = await seedPendingOrder({ sessionId: 'cs_test_pi_fail' });

    const event = buildEvent('payment_intent.payment_failed', {
      id: 'pi_test_failed',
      object: 'payment_intent',
      metadata: { orderId: order.id },
      last_payment_error: { message: 'Your card was declined.' },
    });

    await postSignedWebhook(app, event).expect(200);

    const stored = await prisma.order.findUnique({
      where: { id: order.id },
      include: { payment: true },
    });

    expect(stored?.status).toBe(OrderStatus.FAILED);
    expect(stored?.payment?.failureReason).toBe('Your card was declined.');
  });

  it('never downgrades a PAID order when a later failure event arrives', async () => {
    const { order } = await seedPendingOrder({ sessionId: 'cs_test_no_downgrade' });

    const session = buildCheckoutSession({
      id: 'cs_test_no_downgrade',
      payment_status: 'paid',
      amount_total: order.totalAmountCents,
      metadata: { orderId: order.id },
    });

    await postSignedWebhook(app, buildEvent('checkout.session.completed', session, 'evt_paid_first')).expect(200);
    await postSignedWebhook(
      app,
      buildEvent('checkout.session.async_payment_failed', session, 'evt_fail_after'),
    ).expect(200);

    const stored = await prisma.order.findUnique({
      where: { id: order.id },
      include: { payment: true },
    });

    expect(stored?.status).toBe(OrderStatus.PAID);
    expect(stored?.payment?.status).toBe(PaymentStatus.SUCCEEDED);
  });

  it('does not expire an order that has already been paid', async () => {
    const { order } = await seedPendingOrder({ sessionId: 'cs_test_paid_then_expire' });

    const session = buildCheckoutSession({
      id: 'cs_test_paid_then_expire',
      payment_status: 'paid',
      amount_total: order.totalAmountCents,
      metadata: { orderId: order.id },
    });

    await postSignedWebhook(app, buildEvent('checkout.session.completed', session, 'evt_p1')).expect(200);
    await postSignedWebhook(app, buildEvent('checkout.session.expired', session, 'evt_p2')).expect(200);

    const stored = await prisma.order.findUnique({ where: { id: order.id } });
    expect(stored?.status).toBe(OrderStatus.PAID);
  });
});

describe('unhandled events', () => {
  it('acknowledges an event type we do not act on', async () => {
    const event = buildEvent('customer.created', { id: 'cus_test', object: 'customer' });

    const response = await postSignedWebhook(app, event).expect(200);
    expect(response.body.outcome).toBe('unhandled');
  });
});

describe('order state is owned by webhooks, not by the browser', () => {
  it('leaves the order PENDING when the customer reaches the success endpoint first', async () => {
    const user = await createUser({ email: 'racer@test.io' });
    const product = await createProduct();
    const order = await createPendingOrder({
      userId: user.id,
      product,
      sessionId: 'cs_test_race',
    });

    const { login } = await import('../helpers/factories');
    const { agent } = await login(app, user.email);

    // The success page only reads; it cannot promote an order to paid.
    const before = await agent.get('/api/orders/by-session?sessionId=cs_test_race').expect(200);
    expect(before.body.data.order.status).toBe(OrderStatus.PENDING);
    expect(before.body.data.awaitingConfirmation).toBe(true);

    const stillPending = await prisma.order.findUnique({ where: { id: order.id } });
    expect(stillPending?.status).toBe(OrderStatus.PENDING);

    // Now the webhook lands.
    await postSignedWebhook(
      app,
      buildEvent(
        'checkout.session.completed',
        buildCheckoutSession({
          id: 'cs_test_race',
          payment_status: 'paid',
          amount_total: order.totalAmountCents,
          metadata: { orderId: order.id },
        }),
      ),
    ).expect(200);

    const after = await agent.get('/api/orders/by-session?sessionId=cs_test_race').expect(200);
    expect(after.body.data.order.status).toBe(OrderStatus.PAID);
    expect(after.body.data.awaitingConfirmation).toBe(false);
  });
});
