import { api, unwrap } from './api';
import type { AdminOrder, Order, OrderStatus, Pagination } from '@/types';

export interface OrderQuery {
  page?: number;
  limit?: number;
  status?: OrderStatus;
}

export interface AdminOrderQuery extends OrderQuery {
  search?: string;
}

export const orderService = {
  list: async (query: OrderQuery = {}): Promise<{ orders: Order[]; pagination: Pagination }> => {
    const { data } = await api.get<{ data: { orders: Order[] }; meta: { pagination: Pagination } }>(
      '/orders',
      { params: query },
    );
    return { orders: data.data.orders, pagination: data.meta.pagination };
  },

  get: async (id: string): Promise<Order> => {
    const { data } = await api.get<{ data: { order: Order } }>(`/orders/${id}`);
    return unwrap(data).order;
  },

  /**
   * Looks up the order behind a Stripe Checkout Session.
   * `awaitingConfirmation` is true while the webhook has not landed yet —
   * the success page uses it to poll instead of claiming failure.
   */
  getBySession: async (
    sessionId: string,
  ): Promise<{ order: Order; awaitingConfirmation: boolean }> => {
    const { data } = await api.get<{ data: { order: Order; awaitingConfirmation: boolean } }>(
      '/orders/by-session',
      { params: { sessionId } },
    );
    return unwrap(data);
  },

  adminList: async (
    query: AdminOrderQuery = {},
  ): Promise<{ orders: AdminOrder[]; pagination: Pagination }> => {
    const { data } = await api.get<{
      data: { orders: AdminOrder[] };
      meta: { pagination: Pagination };
    }>('/admin/orders', { params: query });
    return { orders: data.data.orders, pagination: data.meta.pagination };
  },

  adminGet: async (id: string): Promise<AdminOrder> => {
    const { data } = await api.get<{ data: { order: AdminOrder } }>(`/admin/orders/${id}`);
    return unwrap(data).order;
  },
};
