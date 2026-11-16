import type Stripe from 'stripe';
import { OrderStatus, PaymentStatus, Prisma } from '@prisma/client';
import { env } from '../config/env';
import { prisma, type PrismaTransactionClient } from '../lib/prisma';
import { stripe } from '../lib/stripe';
import { logger } from '../lib/logger';
import { AppError } from '../utils/AppError';

/**
 * Verifies the Stripe signature and returns the typed event.
 *
 * `rawBody` MUST be the exact bytes Stripe sent. Any JSON parse/re-serialise
 * in between changes key order or whitespace and the HMAC no longer matches,
 * which is why the webhook route is mounted with express.raw().
 */
export const constructStripeEvent = (rawBody: Buffer, signature: string | undefined): Stripe.Event => {
  if (!signature) {
    throw new AppError(400, 'MISSING_SIGNATURE', 'Missing stripe-signature header');
  }

  try {
    return stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown verification error';
    logger.warn({ message }, 'Stripe webhook signature verification failed');
    // An unverified payload is treated as hostile: nothing downstream runs.
    throw new AppError(400, 'INVALID_SIGNATURE', 'Webhook signature verification failed');
  }
};

export type WebhookOutcome = 'processed' | 'duplicate' | 'ignored' | 'unhandled';

export interface WebhookResult {
  outcome: WebhookOutcome;
  eventId: string;
  eventType: string;
  orderId?: string;
  detail?: string;
}

/** What an individual event handler reports back to the dispatcher. */
interface HandlerOutcome {
  orderId?: string;
  detail: string;
}

/** Statuses a successful payment is allowed to overwrite. */
const PAYABLE_FROM: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.FAILED,
  OrderStatus.CANCELLED,
  OrderStatus.EXPIRED,
];

const findOrderForSession = async (tx: PrismaTransactionClient, session: Stripe.Checkout.Session) => {
  const orderId = session.metadata?.orderId ?? session.client_reference_id ?? undefined;

  // Prefer the session id (unique column); fall back to the metadata id.
  const order = await tx.order.findFirst({
    where: {
      OR: [
        { stripeCheckoutSessionId: session.id },
        ...(orderId ? [{ id: orderId }] : []),
      ],
    },
    include: { items: true },
  });

  return order;
};

const extractPaymentIntentId = (session: Stripe.Checkout.Session): string | undefined =>
  typeof session.payment_intent === 'string'
    ? session.payment_intent
    : (session.payment_intent?.id ?? undefined);

/**
 * Marks an order paid. Called only for events where Stripe has confirmed
 * funds (`payment_status === 'paid'`).
 */
const markOrderPaid = async (
  tx: PrismaTransactionClient,
  session: Stripe.Checkout.Session,
  eventId: string,
): Promise<HandlerOutcome> => {
  const order = await findOrderForSession(tx, session);

  if (!order) {
    // Retrying will not conjure an order, so this is recorded rather than thrown.
    logger.error({ sessionId: session.id, eventId }, 'Webhook received for unknown order');
    return { detail: 'order_not_found' };
  }

  // Defence in depth: the amount Stripe captured must equal what we recorded.
  const amountTotal = session.amount_total ?? null;
  if (amountTotal !== null && amountTotal !== order.totalAmountCents) {
    logger.error(
      { orderId: order.id, expected: order.totalAmountCents, received: amountTotal, eventId },
      'Payment amount mismatch between Stripe session and order',
    );
  }
  if (session.currency && session.currency.toLowerCase() !== order.currency.toLowerCase()) {
    logger.error(
      { orderId: order.id, expected: order.currency, received: session.currency, eventId },
      'Payment currency mismatch between Stripe session and order',
    );
  }

  const paymentIntentId = extractPaymentIntentId(session);

  // Conditional update = atomic state transition. If a concurrent delivery
  // already moved the order to PAID, count is 0 and the side effects below
  // are skipped, so stock is never decremented twice.
  const transition = await tx.order.updateMany({
    where: { id: order.id, status: { in: PAYABLE_FROM } },
    data: {
      status: OrderStatus.PAID,
      stripeCheckoutSessionId: session.id,
      ...(paymentIntentId ? { stripePaymentIntentId: paymentIntentId } : {}),
    },
  });

  if (transition.count === 0) {
    logger.info({ orderId: order.id, eventId }, 'Order already paid — skipping side effects');
    return { orderId: order.id, detail: 'already_paid' };
  }

  await tx.payment.upsert({
    where: { orderId: order.id },
    create: {
      orderId: order.id,
      provider: 'stripe',
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: paymentIntentId,
      amountCents: amountTotal ?? order.totalAmountCents,
      currency: (session.currency ?? order.currency).toLowerCase(),
      status: PaymentStatus.SUCCEEDED,
      paidAt: new Date(),
      failureReason: null,
    },
    update: {
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: paymentIntentId,
      amountCents: amountTotal ?? order.totalAmountCents,
      status: PaymentStatus.SUCCEEDED,
      paidAt: new Date(),
      failureReason: null,
    },
  });

  // Stock is committed at payment time, not at session creation: an abandoned
  // checkout must not hold inventory hostage. The `gte` guard makes the
  // decrement safe under concurrency and prevents negative stock.
  for (const item of order.items) {
    if (!item.productId) continue;
    const result = await tx.product.updateMany({
      where: { id: item.productId, stock: { gte: item.quantity } },
      data: { stock: { decrement: item.quantity } },
    });
    if (result.count === 0) {
      // The customer has already paid, so the order stands; this is flagged
      // for operations to resolve (restock, partial refund).
      logger.error(
        { orderId: order.id, productId: item.productId, quantity: item.quantity },
        'Oversold: insufficient stock at payment confirmation',
      );
    }
  }

  logger.info({ orderId: order.id, orderNumber: order.orderNumber, eventId }, 'Order marked as paid');
  return { orderId: order.id, detail: 'order_paid' };
};

const markPaymentProcessing = async (
  tx: PrismaTransactionClient,
  session: Stripe.Checkout.Session,
): Promise<HandlerOutcome> => {
  const order = await findOrderForSession(tx, session);
  if (!order) return { detail: 'order_not_found' };

  // Session completed but funds are not confirmed (e.g. a bank debit).
  // The order stays PENDING until an async_payment_* event arrives.
  await tx.payment.updateMany({
    where: { orderId: order.id, status: { in: [PaymentStatus.PENDING] } },
    data: {
      status: PaymentStatus.PROCESSING,
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: extractPaymentIntentId(session),
    },
  });

  return { orderId: order.id, detail: 'payment_processing' };
};

const markOrderFailed = async (
  tx: PrismaTransactionClient,
  session: Stripe.Checkout.Session,
  reason: string,
): Promise<HandlerOutcome> => {
  const order = await findOrderForSession(tx, session);
  if (!order) return { detail: 'order_not_found' };

  // A paid order is never downgraded by a later failure event.
  const transition = await tx.order.updateMany({
    where: { id: order.id, status: { in: [OrderStatus.PENDING] } },
    data: { status: OrderStatus.FAILED },
  });

  await tx.payment.updateMany({
    where: { orderId: order.id, status: { notIn: [PaymentStatus.SUCCEEDED, PaymentStatus.REFUNDED] } },
    data: { status: PaymentStatus.FAILED, failureReason: reason, paidAt: null },
  });

  return { orderId: order.id, detail: transition.count > 0 ? 'order_failed' : 'order_unchanged' };
};

const markOrderExpired = async (
  tx: PrismaTransactionClient,
  session: Stripe.Checkout.Session,
): Promise<HandlerOutcome> => {
  const order = await findOrderForSession(tx, session);
  if (!order) return { detail: 'order_not_found' };

  const transition = await tx.order.updateMany({
    where: { id: order.id, status: { in: [OrderStatus.PENDING] } },
    data: { status: OrderStatus.EXPIRED },
  });

  await tx.payment.updateMany({
    where: { orderId: order.id, status: { notIn: [PaymentStatus.SUCCEEDED, PaymentStatus.REFUNDED] } },
    data: { status: PaymentStatus.EXPIRED, failureReason: 'Checkout session expired' },
  });

  return { orderId: order.id, detail: transition.count > 0 ? 'order_expired' : 'order_unchanged' };
};

/**
 * Single entry point for verified Stripe events.
 *
 * Idempotency strategy — three independent layers:
 *   1. `webhook_events.stripeEventId` UNIQUE, inserted inside the SAME
 *      transaction as the side effects. A replayed event fails the insert and
 *      the whole transaction rolls back, leaving no second payment row.
 *   2. Conditional status transitions (`updateMany` filtered on the current
 *      status) so two concurrent deliveries cannot both apply side effects.
 *   3. `payment.upsert` keyed on the unique orderId, so a payment record can
 *      never be duplicated for one order.
 *
 * Because the ledger insert and the side effects share a transaction, a
 * mid-processing crash rolls back BOTH — Stripe's retry then reprocesses the
 * event cleanly instead of finding it falsely marked as handled.
 */
export const processStripeEvent = async (event: Stripe.Event): Promise<WebhookResult> => {
  try {
    const result = await prisma.$transaction(
      async (tx) => {
        await tx.webhookEvent.create({
          data: { stripeEventId: event.id, eventType: event.type },
        });

        switch (event.type) {
          case 'checkout.session.completed': {
            const session = event.data.object as Stripe.Checkout.Session;
            // THE critical check: a completed session is not necessarily a
            // paid session. Card payments settle immediately; delayed methods
            // report `unpaid` here and succeed (or fail) asynchronously.
            if (session.payment_status === 'paid') {
              const outcome = await markOrderPaid(tx, session, event.id);
              return { outcome: 'processed' as const, ...outcome };
            }
            const outcome = await markPaymentProcessing(tx, session);
            return { outcome: 'processed' as const, ...outcome };
          }

          case 'checkout.session.async_payment_succeeded': {
            const session = event.data.object as Stripe.Checkout.Session;
            const outcome = await markOrderPaid(tx, session, event.id);
            return { outcome: 'processed' as const, ...outcome };
          }

          case 'checkout.session.async_payment_failed': {
            const session = event.data.object as Stripe.Checkout.Session;
            const outcome = await markOrderFailed(tx, session, 'Asynchronous payment failed');
            return { outcome: 'processed' as const, ...outcome };
          }

          case 'checkout.session.expired': {
            const session = event.data.object as Stripe.Checkout.Session;
            const outcome = await markOrderExpired(tx, session);
            return { outcome: 'processed' as const, ...outcome };
          }

          case 'payment_intent.payment_failed': {
            const intent = event.data.object as Stripe.PaymentIntent;
            const orderId = intent.metadata?.orderId;
            if (!orderId) return { outcome: 'ignored' as const, detail: 'no_order_metadata' };

            await tx.payment.updateMany({
              where: {
                orderId,
                status: { notIn: [PaymentStatus.SUCCEEDED, PaymentStatus.REFUNDED] },
              },
              data: {
                status: PaymentStatus.FAILED,
                failureReason: intent.last_payment_error?.message ?? 'Payment failed',
              },
            });
            await tx.order.updateMany({
              where: { id: orderId, status: OrderStatus.PENDING },
              data: { status: OrderStatus.FAILED },
            });
            return { outcome: 'processed' as const, orderId, detail: 'payment_intent_failed' };
          }

          default:
            // Recorded in the ledger so the same unhandled event is not
            // re-examined on every retry.
            return { outcome: 'unhandled' as const, detail: `Unhandled event type ${event.type}` };
        }
      },
      { timeout: 15_000, isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );

    return { eventId: event.id, eventType: event.type, ...result } as WebhookResult;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      // The unique constraint fired: Stripe delivered this event before and
      // we already applied it. Acknowledge with 200 so Stripe stops retrying.
      logger.info({ eventId: event.id, eventType: event.type }, 'Duplicate webhook event ignored');
      return { outcome: 'duplicate', eventId: event.id, eventType: event.type };
    }
    logger.error({ err: error, eventId: event.id, eventType: event.type }, 'Webhook processing failed');
    throw error;
  }
};
