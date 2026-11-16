import type Stripe from 'stripe';
import request from 'supertest';
import type { Express } from 'express';
import { env } from '../../src/config/env';
import { stripe } from '../../src/lib/stripe';

/**
 * Builds a Checkout Session object shaped like the one Stripe sends.
 * Only the fields our webhook handler reads are populated.
 */
export const buildCheckoutSession = (
  overrides: Partial<Stripe.Checkout.Session> & { id?: string } = {},
): Stripe.Checkout.Session =>
  ({
    id: overrides.id ?? 'cs_test_default',
    object: 'checkout.session',
    amount_total: overrides.amount_total ?? 10_000,
    currency: overrides.currency ?? 'usd',
    payment_status: overrides.payment_status ?? 'paid',
    status: overrides.status ?? 'complete',
    payment_intent: overrides.payment_intent ?? 'pi_test_default',
    client_reference_id: overrides.client_reference_id ?? null,
    metadata: overrides.metadata ?? {},
    customer_email: overrides.customer_email ?? 'customer@test.io',
    url: null,
    ...overrides,
  }) as Stripe.Checkout.Session;

export const buildEvent = (
  type: string,
  object: unknown,
  id = `evt_test_${Math.random().toString(36).slice(2, 10)}`,
): Record<string, unknown> => ({
  id,
  object: 'event',
  api_version: '2025-02-24.acacia',
  created: Math.floor(Date.now() / 1000),
  type,
  livemode: false,
  pending_webhooks: 0,
  request: { id: null, idempotency_key: null },
  data: { object },
});

/**
 * Posts an event to the webhook endpoint with a REAL Stripe signature.
 *
 * `generateTestHeaderString` performs the same HMAC-SHA256 computation
 * Stripe's servers do, so `constructEvent` in the handler is exercised for
 * real — no mocking of the verification step, and no network access needed.
 */
export const postSignedWebhook = (
  app: Express,
  event: Record<string, unknown>,
  options: { secret?: string; timestamp?: number } = {},
) => {
  const payload = JSON.stringify(event);
  const signature = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: options.secret ?? env.STRIPE_WEBHOOK_SECRET,
    timestamp: options.timestamp,
  });

  return request(app)
    .post('/api/webhooks/stripe')
    .set('stripe-signature', signature)
    .set('Content-Type', 'application/json')
    .send(payload);
};

/** Posts the same payload with a signature that will not verify. */
export const postUnsignedWebhook = (app: Express, event: Record<string, unknown>) =>
  request(app)
    .post('/api/webhooks/stripe')
    .set('stripe-signature', 't=1234567890,v1=deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef')
    .set('Content-Type', 'application/json')
    .send(JSON.stringify(event));
