import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/http';
import {
  createProduct,
  deleteProduct,
  getProductByIdForAdmin,
  getPublicProduct,
  listAdminProducts,
  listCategories,
  listPublicProducts,
  updateProduct,
} from '../services/product.service';
import type {
  AdminProductListQuery,
  CreateProductInput,
  ProductListQuery,
  UpdateProductInput,
} from '../schemas/product.schema';

export const getProducts = asyncHandler(async (req: Request, res: Response) => {
  const { products, pagination } = await listPublicProducts(
    req.query as unknown as ProductListQuery,
  );
  return sendSuccess(res, { products }, 200, { pagination });
});

export const getProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await getPublicProduct(req.params.id as string);
  return sendSuccess(res, { product });
});

export const getCategories = asyncHandler(async (_req: Request, res: Response) => {
  const categories = await listCategories();
  return sendSuccess(res, { categories });
});

export const adminGetProducts = asyncHandler(async (req: Request, res: Response) => {
  const { products, pagination } = await listAdminProducts(
    req.query as unknown as AdminProductListQuery,
  );
  return sendSuccess(res, { products }, 200, { pagination });
});

export const adminGetProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await getProductByIdForAdmin(req.params.id as string);
  return sendSuccess(res, { product });
});

export const adminCreateProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await createProduct(req.body as CreateProductInput);
  return sendSuccess(res, { product }, 201);
});

export const adminUpdateProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await updateProduct(req.params.id as string, req.body as UpdateProductInput);
  return sendSuccess(res, { product });
});

export const adminDeleteProduct = asyncHandler(async (req: Request, res: Response) => {
  const result = await deleteProduct(req.params.id as string);
  return sendSuccess(res, {
    deleted: result.deleted,
    archived: result.archived,
    message: result.archived
      ? 'Product has existing orders, so it was archived instead of deleted'
      : 'Product deleted',
    product: result.product,
  });
});
