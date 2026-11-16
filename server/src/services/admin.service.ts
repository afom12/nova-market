import { OrderStatus, PaymentStatus, Role } from '@prisma/client';
import { prisma } from '../lib/prisma';

export interface RevenuePoint {
  date: string;
  revenueCents: number;
  orders: number;
}

export interface AdminStats {
  totalOrders: number;
  paidOrders: number;
  successfulRevenueCents: number;
  averageOrderValueCents: number;
  totalCustomers: number;
  totalProducts: number;
  activeProducts: number;
  lowStockProducts: number;
  payments: {
    pending: number;
    processing: number;
    successful: number;
    failed: number;
    cancelled: number;
    expired: number;
    refunded: number;
  };
  recentPurchases: Array<{
    id: string;
    orderNumber: string;
    status: OrderStatus;
    totalAmountCents: number;
    currency: string;
    createdAt: Date;
    customer: { id: string; name: string; email: string };
    itemCount: number;
  }>;
  revenueOverview: RevenuePoint[];
}

interface RevenueRow {
  day: Date;
  revenue: bigint | null;
  orders: bigint | number;
}

const LOW_STOCK_THRESHOLD = 5;

/**
 * Dashboard aggregates.
 *
 * Revenue counts PAID orders only. Pending, failed, cancelled, expired and
 * refunded orders are deliberately excluded — reporting money that was never
 * captured is the classic e-commerce reporting bug.
 */
export const getAdminStats = async (days = 14): Promise<AdminStats> => {
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - (days - 1));

  const [
    totalOrders,
    paidAggregate,
    totalCustomers,
    totalProducts,
    activeProducts,
    lowStockProducts,
    paymentGroups,
    recentOrders,
  ] = await prisma.$transaction([
    prisma.order.count(),
    prisma.order.aggregate({
      where: { status: OrderStatus.PAID },
      _sum: { totalAmountCents: true },
      _count: { _all: true },
      _avg: { totalAmountCents: true },
    }),
    prisma.user.count({ where: { role: Role.CUSTOMER } }),
    prisma.product.count(),
    prisma.product.count({ where: { isActive: true } }),
    prisma.product.count({ where: { isActive: true, stock: { lte: LOW_STOCK_THRESHOLD } } }),
    prisma.payment.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.order.findMany({
      where: { status: OrderStatus.PAID },
      orderBy: { createdAt: 'desc' },
      take: 6,
      include: {
        user: { select: { id: true, name: true, email: true } },
        items: { select: { id: true } },
      },
    }),
  ]);

  const countByStatus = (status: PaymentStatus): number =>
    paymentGroups.find((group) => group.status === status)?._count._all ?? 0;

  // date_trunc has no Prisma equivalent; the query is parameterised, so the
  // user-controlled value never reaches the SQL text.
  const revenueRows = await prisma.$queryRaw<RevenueRow[]>`
    SELECT date_trunc('day', "createdAt") AS day,
           SUM("totalAmountCents")::bigint AS revenue,
           COUNT(*)::bigint AS orders
    FROM "orders"
    WHERE status = 'PAID'::"OrderStatus"
      AND "createdAt" >= ${since}
    GROUP BY 1
    ORDER BY 1 ASC
  `;

  const revenueByDay = new Map(
    revenueRows.map((row) => [
      row.day.toISOString().slice(0, 10),
      { revenueCents: Number(row.revenue ?? 0), orders: Number(row.orders) },
    ]),
  );

  // Fill gaps so the chart has a continuous x-axis instead of skipping
  // days with no sales.
  const revenueOverview: RevenuePoint[] = [];
  for (let i = 0; i < days; i += 1) {
    const date = new Date(since);
    date.setUTCDate(since.getUTCDate() + i);
    const key = date.toISOString().slice(0, 10);
    const entry = revenueByDay.get(key);
    revenueOverview.push({
      date: key,
      revenueCents: entry?.revenueCents ?? 0,
      orders: entry?.orders ?? 0,
    });
  }

  return {
    totalOrders,
    paidOrders: paidAggregate._count._all,
    successfulRevenueCents: paidAggregate._sum.totalAmountCents ?? 0,
    averageOrderValueCents: Math.round(paidAggregate._avg.totalAmountCents ?? 0),
    totalCustomers,
    totalProducts,
    activeProducts,
    lowStockProducts,
    payments: {
      pending: countByStatus(PaymentStatus.PENDING),
      processing: countByStatus(PaymentStatus.PROCESSING),
      successful: countByStatus(PaymentStatus.SUCCEEDED),
      failed: countByStatus(PaymentStatus.FAILED),
      cancelled: countByStatus(PaymentStatus.CANCELLED),
      expired: countByStatus(PaymentStatus.EXPIRED),
      refunded: countByStatus(PaymentStatus.REFUNDED),
    },
    recentPurchases: recentOrders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      totalAmountCents: order.totalAmountCents,
      currency: order.currency,
      createdAt: order.createdAt,
      customer: order.user,
      itemCount: order.items.length,
    })),
    revenueOverview,
  };
};
