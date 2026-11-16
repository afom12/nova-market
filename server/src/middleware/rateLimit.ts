import rateLimit, { type Options } from 'express-rate-limit';
import { env } from '../config/env';
import { sendFailure } from '../utils/http';

const sharedOptions: Partial<Options> = {
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  // Limits would make the test suite flaky and tell us nothing about
  // correctness, so they are disabled only under NODE_ENV=test.
  skip: () => env.isTest,
  handler: (_req, res) =>
    sendFailure(res, 429, 'RATE_LIMITED', 'Too many requests, please try again later'),
};

/** Baseline limiter for the whole API surface. */
export const apiLimiter = rateLimit({
  ...sharedOptions,
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX,
});

/** Tighter limiter for credential endpoints — slows password guessing. */
export const authLimiter = rateLimit({
  ...sharedOptions,
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.AUTH_RATE_LIMIT_MAX,
});

/** Checkout creates Stripe resources, so it gets its own budget. */
export const checkoutLimiter = rateLimit({
  ...sharedOptions,
  windowMs: 60 * 1000,
  limit: 10,
});
