import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';
import { buildPaginationMeta, type PaginationMeta } from '../utils/http';
import type { AdminOrderListQuery, OrderListQuery } from '../schemas/order.schema';

const orderInclude = {
  items: { orderBy: { productName: 'asc' } },
  payment: true,
} satisfies Prisma.OrderInclude;

const adminOrderInclude = {
  ...orderInclude,
  user: { select: { id: true, name: true, email: true } },
} satisfies Prisma.OrderInclude;

export type OrderWithDetails = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;
export type AdminOrderWithDetails = Prisma.OrderGetPayload<{ include: typeof adminOrderInclude }>;

export interface PaginatedOrders<T> {
  orders: T[];
  pagination: PaginationMeta;
}

/** Customer-scoped listing. `userId` is taken from the verified session. */
export const listUserOrders = async (
  userId: string,
  query: OrderListQuery,
): Promise<PaginatedOrders<OrderWithDetails>> => {
  const where: Prisma.OrderWhereInput = { userId };
  if (query.status) where.status = query.status;

  const [orders, total] = await prisma.$transaction([
    prisma.order.findMany({
      where,
      include: orderInclude,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.order.count({ where }),
  ]);

  return { orders, pagination: buildPaginationMeta(query.page, query.limit, total) };
};

/**
 * Ownership is enforced in the WHERE clause, not by fetching and then
 * comparing. A customer requesting someone else's order id gets the same 404
 * as for an id that does not exist, so the endpoint does not confirm which
 * order ids are real.
 */
export const getUserOrder = async (userId: string, orderId: string): Promise<OrderWithDetails> => {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    include: orderInclude,
  });

  if (!order) throw AppError.notFound('Order not found');
  return order;
};

/** Used by the success page, which only knows the Stripe session id. */
export const getUserOrderByCheckoutSession = async (
  userId: string,
  sessionId: string,
): Promise<OrderWithDetails> => {
  const order = await prisma.order.findFirst({
    where: { stripeCheckoutSessionId: sessionId, userId },
    include: orderInclude,
  });

  if (!order) throw AppError.notFound('Order not found for this checkout session');
  return order;
};

export const listAdminOrders = async (
  query: AdminOrderListQuery,
): Promise<PaginatedOrders<AdminOrderWithDetails>> => {
  const where: Prisma.OrderWhereInput = {};
  if (query.status) where.status = query.status;
  if (query.search) {
    where.OR = [
      { orderNumber: { contains: query.search, mode: 'insensitive' } },
      { user: { email: { contains: query.search, mode: 'insensitive' } } },
      { user: { name: { contains: query.search, mode: 'insensitive' } } },
      { stripeCheckoutSessionId: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  const [orders, total] = await prisma.$transaction([
    prisma.order.findMany({
      where,
      include: adminOrderInclude,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.order.count({ where }),
  ]);

  return { orders, pagination: buildPaginationMeta(query.page, query.limit, total) };
};

export const getAdminOrder = async (orderId: string): Promise<AdminOrderWithDetails> => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: adminOrderInclude,
  });
  if (!order) throw AppError.notFound('Order not found');
  return order;
};
