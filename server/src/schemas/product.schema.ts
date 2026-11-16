import { z } from 'zod';

export const productIdParamSchema = z.object({
  id: z.string().uuid('Invalid product id'),
});

export const productListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(60).default(12),
  category: z.string().trim().min(1).max(80).optional(),
  search: z.string().trim().min(1).max(120).optional(),
  sort: z.enum(['newest', 'price_asc', 'price_desc', 'name_asc']).default('newest'),
  minPrice: z.coerce.number().int().nonnegative().optional(),
  maxPrice: z.coerce.number().int().nonnegative().optional(),
});

export const adminProductListQuerySchema = productListQuerySchema.extend({
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['all', 'active', 'inactive']).default('all'),
});

export const createProductSchema = z.object({
  name: z.string().trim().min(2).max(160),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase words separated by hyphens')
    .max(180)
    .optional(),
  description: z.string().trim().min(10, 'Description must be at least 10 characters').max(5000),
  // Prices arrive and are stored as integer minor units.
  priceCents: z
    .number()
    .int('Price must be an integer number of cents')
    .positive('Price must be greater than zero')
    .max(99_999_999),
  currency: z.string().trim().toLowerCase().length(3).default('usd'),
  imageUrl: z.string().trim().min(1).max(500),
  category: z.string().trim().min(2).max(80),
  stock: z.number().int().nonnegative().max(1_000_000),
  isActive: z.boolean().default(true),
});

export const updateProductSchema = createProductSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'Provide at least one field to update' },
);

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductListQuery = z.infer<typeof productListQuerySchema>;
export type AdminProductListQuery = z.infer<typeof adminProductListQuerySchema>;
