import { describe, expect, it } from 'vitest';
import { env } from '../../src/config/env';
import { stripe } from '../../src/lib/stripe';

/**
 * Exercises Stripe's REAL signature verification.
 *
 * `generateTestHeaderString` runs the same HMAC-SHA256 construction Stripe's
 * servers use, and `constructEvent` is the verification our webhook endpoint
 * calls. Both are pure cryptography, so this needs no network access and no
 * mocking — if these pass, the signature check genuinely works.
 */
const secret = env.STRIPE_WEBHOOK_SECRET;

const buildPayload = (id = 'evt_signature_test') =>
  JSON.stringify({
    id,
    object: 'event',
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_sig',
        object: 'checkout.session',
        payment_status: 'paid',
        amount_total: 24_999,
        currency: 'usd',
        metadata: { orderId: 'order-1' },
      },
    },
  });

describe('Stripe webhook signature verification', () => {
  it('accepts a correctly signed payload and returns the parsed event', () => {
    const payload = buildPayload();
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret });

    const event = stripe.webhooks.constructEvent(payload, header, secret);

    expect(event.id).toBe('evt_signature_test');
    expect(event.type).toBe('checkout.session.completed');
    const session = event.data.object as { payment_status: string; amount_total: number };
    expect(session.payment_status).toBe('paid');
    expect(session.amount_total).toBe(24_999);
  });

  it('rejects a payload that was modified after signing', () => {
    const payload = buildPayload();
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret });

    // An attacker inflates the amount but cannot re-sign it.
    const tampered = payload.replace('"amount_total":24999', '"amount_total":1');

    expect(() => stripe.webhooks.constructEvent(tampered, header, secret)).toThrow(
      /signature/i,
    );
  });

  it('rejects a signature produced with a different secret', () => {
    const payload = buildPayload();
    const header = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: 'whsec_attacker_secret_value',
    });

    expect(() => stripe.webhooks.constructEvent(payload, header, secret)).toThrow(/signature/i);
  });

  it('rejects an unsigned request', () => {
    expect(() => stripe.webhooks.constructEvent(buildPayload(), '', secret)).toThrow();
  });

  it('rejects a replayed signature outside the timestamp tolerance', () => {
    const payload = buildPayload();
    const header = stripe.webhooks.generateTestHeaderString({
      payload,
      secret,
      timestamp: Math.floor(Date.now() / 1000) - 3_600, // an hour old
    });

    expect(() => stripe.webhooks.constructEvent(payload, header, secret)).toThrow(/timestamp/i);
  });

  it('verifies byte-for-byte, so re-serialising the JSON breaks the signature', () => {
    const payload = buildPayload();
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret });

    // This is exactly what happens if express.json() parses the body before
    // verification — which is why the webhook route uses express.raw().
    const reserialised = JSON.stringify(JSON.parse(payload), null, 2);

    expect(reserialised).not.toBe(payload);
    expect(() => stripe.webhooks.constructEvent(reserialised, header, secret)).toThrow(/signature/i);
  });

  it('accepts the payload as a Buffer, as the raw body middleware supplies it', () => {
    const payload = buildPayload();
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret });

    const event = stripe.webhooks.constructEvent(Buffer.from(payload, 'utf8'), header, secret);
    expect(event.id).toBe('evt_signature_test');
  });
});
