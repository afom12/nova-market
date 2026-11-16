import { z } from 'zod';

/**
 * The checkout payload carries product ids and quantities — and nothing else.
 *
 * There is deliberately no price, no subtotal and no total field. The server
 * cannot be tricked into honouring a client-supplied amount because it never
 * reads one; every figure is recomputed from the products table.
 */
export const checkoutItemSchema = z.object({
  productId: z.string().uuid('Invalid product id'),
  quantity: z
    .number()
    .int('Quantity must be a whole number')
    .positive('Quantity must be at least 1')
    .max(20, 'Maximum 20 units per product'),
});

export const createCheckoutSessionSchema = z.object({
  items: z
    .array(checkoutItemSchema)
    .min(1, 'Your cart is empty')
    .max(50, 'Too many distinct items in cart')
    .superRefine((items, ctx) => {
      const seen = new Set<string>();
      for (const item of items) {
        if (seen.has(item.productId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Duplicate product in cart — merge quantities instead',
            path: ['items'],
          });
          return;
        }
        seen.add(item.productId);
      }
    }),
});

export type CheckoutItemInput = z.infer<typeof checkoutItemSchema>;
export type CreateCheckoutSessionInput = z.infer<typeof createCheckoutSessionSchema>;
