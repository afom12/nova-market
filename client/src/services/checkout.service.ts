import { api, unwrap } from './api';
import type { CheckoutSessionResult } from '@/types';

export interface CheckoutLine {
  productId: string;
  quantity: number;
}

export interface CartValidationResult {
  valid: boolean;
  currency: string;
  subtotalCents: number;
  totalAmountCents: number;
  lines: Array<{
    productId: string;
    name: string;
    quantity: number;
    unitPriceCents: number;
    subtotalCents: number;
  }>;
}

export const checkoutService = {
  /**
   * Sends ONLY product ids and quantities. No price, subtotal or total is
   * transmitted — the server recomputes everything from the database, so a
   * tampered client cannot influence what is charged.
   */
  createSession: async (items: CheckoutLine[]): Promise<CheckoutSessionResult> => {
    const { data } = await api.post<{ data: CheckoutSessionResult }>('/checkout', { items });
    return unwrap(data);
  },

  validate: async (items: CheckoutLine[]): Promise<CartValidationResult> => {
    const { data } = await api.post<{ data: CartValidationResult }>('/checkout/validate', { items });
    return unwrap(data);
  },
};
