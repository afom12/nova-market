import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product } from '@/types';

export interface CartLine {
  productId: string;
  name: string;
  slug: string;
  imageUrl: string;
  /**
   * Cached for DISPLAY ONLY. The server recomputes every price at checkout
   * from the products table, so a stale or edited value here changes the
   * basket the shopper sees, never the amount they are charged.
   */
  unitPriceCents: number;
  currency: string;
  quantity: number;
  maxStock: number;
}

interface CartState {
  lines: CartLine[];
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  increment: (productId: string) => void;
  decrement: (productId: string) => void;
  clear: () => void;
  totalItems: () => number;
  subtotalCents: () => number;
  currency: () => string;
}

const MAX_PER_LINE = 20;

const clampQuantity = (quantity: number, maxStock: number): number =>
  Math.max(1, Math.min(quantity, Math.min(maxStock, MAX_PER_LINE)));

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],

      addItem: (product, quantity = 1) =>
        set((state) => {
          const existing = state.lines.find((line) => line.productId === product.id);

          if (existing) {
            return {
              lines: state.lines.map((line) =>
                line.productId === product.id
                  ? {
                      ...line,
                      quantity: clampQuantity(line.quantity + quantity, product.stock),
                      // Refresh the snapshot whenever we see the product again.
                      unitPriceCents: product.priceCents,
                      maxStock: product.stock,
                    }
                  : line,
              ),
            };
          }

          return {
            lines: [
              ...state.lines,
              {
                productId: product.id,
                name: product.name,
                slug: product.slug,
                imageUrl: product.imageUrl,
                unitPriceCents: product.priceCents,
                currency: product.currency,
                quantity: clampQuantity(quantity, product.stock),
                maxStock: product.stock,
              },
            ],
          };
        }),

      removeItem: (productId) =>
        set((state) => ({ lines: state.lines.filter((line) => line.productId !== productId) })),

      setQuantity: (productId, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            return { lines: state.lines.filter((line) => line.productId !== productId) };
          }
          return {
            lines: state.lines.map((line) =>
              line.productId === productId
                ? { ...line, quantity: clampQuantity(quantity, line.maxStock) }
                : line,
            ),
          };
        }),

      increment: (productId) => {
        const line = get().lines.find((item) => item.productId === productId);
        if (line) get().setQuantity(productId, line.quantity + 1);
      },

      decrement: (productId) => {
        const line = get().lines.find((item) => item.productId === productId);
        if (line) get().setQuantity(productId, line.quantity - 1);
      },

      clear: () => set({ lines: [] }),

      totalItems: () => get().lines.reduce((total, line) => total + line.quantity, 0),

      // Integer arithmetic only.
      subtotalCents: () =>
        get().lines.reduce((total, line) => total + line.unitPriceCents * line.quantity, 0),

      currency: () => get().lines[0]?.currency ?? 'usd',
    }),
    {
      name: 'nova-cart',
      version: 1,
      // Only the lines are persisted; the action functions are not state.
      partialize: (state) => ({ lines: state.lines }),
    },
  ),
);
