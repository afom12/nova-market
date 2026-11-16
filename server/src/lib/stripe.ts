import Stripe from 'stripe';
import { env } from '../config/env';

/**
 * Single shared Stripe client.
 *
 * Pinning `apiVersion` matters: Stripe ships breaking API changes behind
 * dated versions, and an unpinned client silently follows the account
 * default, which can change under a deployed app.
 */
export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  // Must match the version the installed SDK is typed against
  // (Stripe.LatestApiVersion in stripe@17.7.x).
  apiVersion: '2025-02-24.acacia',
  typescript: true,
  appInfo: {
    name: 'NOVA MARKET',
    version: '1.0.0',
  },
  maxNetworkRetries: 2,
});

export type StripeCheckoutSession = Stripe.Checkout.Session;
export type StripeEvent = Stripe.Event;
