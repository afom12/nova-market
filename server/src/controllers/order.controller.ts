import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/http';
import { AppError } from '../utils/AppError';
import {
  getAdminOrder,
  getUserOrder,
  getUserOrderByCheckoutSession,
  listAdminOrders,
  listUserOrders,
} from '../services/order.service';
import type { AdminOrderListQuery, OrderListQuery } from '../schemas/order.schema';

export const getMyOrders = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const { orders, pagination } = await listUserOrders(
    req.user.id,
    req.query as unknown as OrderListQuery,
  );
  return sendSuccess(res, { orders }, 200, { pagination });
});

export const getMyOrder = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const order = await getUserOrder(req.user.id, req.params.id as string);
  return sendSuccess(res, { order });
});

/**
 * Backing endpoint for the payment success page.
 *
 * This is read-only on purpose: the success page asks the server what the
 * authoritative status is. Arriving here never changes an order to paid —
 * only a verified webhook can do that.
 */
export const getMyOrderBySession = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const { sessionId } = req.query as unknown as { sessionId: string };
  const order = await getUserOrderByCheckoutSession(req.user.id, sessionId);

  return sendSuccess(res, {
    order,
    // Tells the UI to keep polling: the customer can beat the webhook back
    // from Stripe, which is normal and must not look like a failure.
    awaitingConfirmation: order.status === 'PENDING',
  });
});

export const adminGetOrders = asyncHandler(async (req: Request, res: Response) => {
  const { orders, pagination } = await listAdminOrders(
    req.query as unknown as AdminOrderListQuery,
  );
  return sendSuccess(res, { orders }, 200, { pagination });
});

export const adminGetOrder = asyncHandler(async (req: Request, res: Response) => {
  const order = await getAdminOrder(req.params.id as string);
  return sendSuccess(res, { order });
});
