import express, { Router } from 'express';
import { handleStripeWebhook } from '../controllers/webhook.controller';

const router = Router();

/**
 * express.raw() is applied HERE, on the webhook route only.
 *
 * If the global express.json() parser ran first, req.body would be a parsed
 * object and the original bytes would be gone — and Stripe's HMAC is computed
 * over those exact bytes, so every signature check would fail. The rest of
 * the API still gets normal JSON parsing; see app.ts for the mount order.
 */
router.post(
  '/stripe',
  express.raw({ type: 'application/json', limit: '1mb' }),
  handleStripeWebhook,
);

export default router;
