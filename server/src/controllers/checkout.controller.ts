import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/http';
import { AppError } from '../utils/AppError';
import { createCheckoutSession, validateCart } from '../services/checkout.service';
import type { CreateCheckoutSessionInput } from '../schemas/checkout.schema';

/**
 * POST /api/checkout
 * Authenticated. Returns the Stripe-hosted Checkout URL for the frontend to
 * redirect to. The response deliberately contains no price the client could
 * have influenced — only the amount the server computed and recorded.
 */
export const createCheckout = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized('You must be signed in to check out');

  const { items } = req.body as CreateCheckoutSessionInput;
  const result = await createCheckoutSession(req.user, items);

  return sendSuccess(res, result, 201);
});

/**
 * POST /api/checkout/validate
 * Lets the cart page surface stock/availability problems before the customer
 * is bounced to Stripe. Uses exactly the same validation path as checkout.
 */
export const validateCheckout = asyncHandler(async (req: Request, res: Response) => {
  const { items } = req.body as CreateCheckoutSessionInput;
  const cart = await validateCart(items);

  return sendSuccess(res, {
    valid: true,
    currency: cart.currency,
    subtotalCents: cart.subtotalCents,
    totalAmountCents: cart.totalAmountCents,
    lines: cart.lines.map((line) => ({
      productId: line.product.id,
      name: line.product.name,
      quantity: line.quantity,
      unitPriceCents: line.unitPriceCents,
      subtotalCents: line.subtotalCents,
    })),
  });
});
