import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { logger } from '../lib/logger';
import { constructStripeEvent, processStripeEvent } from '../services/webhook.service';

/**
 * POST /api/webhooks/stripe
 *
 * Mounted with express.raw() so `req.body` is the untouched Buffer Stripe
 * sent. Signature verification happens before anything else; an unverified
 * request is rejected with 400 and never reaches the database.
 *
 * Response contract with Stripe:
 *   2xx  -> event acknowledged, do not retry
 *   4xx  -> permanently rejected (bad signature) — retrying cannot help
 *   5xx  -> transient failure, please retry with backoff
 * So a processing error must NOT be swallowed into a 200.
 */
export const handleStripeWebhook = asyncHandler(async (req: Request, res: Response) => {
  const signature = req.get('stripe-signature');
  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));

  // Throws AppError(400) on failure — handled centrally.
  const event = constructStripeEvent(rawBody, signature);

  logger.info({ eventId: event.id, eventType: event.type }, 'Verified Stripe webhook received');

  const result = await processStripeEvent(event);

  return res.status(200).json({
    received: true,
    outcome: result.outcome,
    eventId: result.eventId,
    ...(result.orderId ? { orderId: result.orderId } : {}),
  });
});
