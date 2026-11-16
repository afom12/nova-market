import { z } from 'zod';

/**
 * The price field is a STRING in the form and is converted to integer cents
 * on submit (see utils/money.ts), so no float ever represents money.
 */
export const productFormSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(160),
  description: z.string().trim().min(10, 'Description must be at least 10 characters').max(5000),
  price: z
    .string()
    .min(1, 'Price is required')
    .regex(/^\d+(\.\d{1,2})?$/, 'Enter a price such as 249.99')
    .refine((value) => Number(value) > 0, 'Price must be greater than zero'),
  currency: z.string().trim().length(3, 'Use a 3-letter currency code').toLowerCase(),
  imageUrl: z.string().trim().min(1, 'Image URL is required').max(500),
  category: z.string().trim().min(2, 'Category is required').max(80),
  stock: z.coerce.number().int('Stock must be a whole number').min(0, 'Stock cannot be negative'),
  isActive: z.boolean(),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;
