import { OrderStatus } from '@prisma/client';
import { z } from 'zod';

export const orderIdParamSchema = z.object({
  id: z.string().uuid('Invalid order id'),
});

export const orderListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
  status: z.nativeEnum(OrderStatus).optional(),
});

export const adminOrderListQuerySchema = orderListQuerySchema.extend({
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().min(1).max(120).optional(),
});

export const orderBySessionQuerySchema = z.object({
  sessionId: z.string().trim().min(1).max(255),
});

export type OrderListQuery = z.infer<typeof orderListQuerySchema>;
export type AdminOrderListQuery = z.infer<typeof adminOrderListQuerySchema>;
