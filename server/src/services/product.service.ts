import { Prisma, type Product } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';
import { slugify } from '../utils/slug';
import { buildPaginationMeta, type PaginationMeta } from '../utils/http';
import type {
  AdminProductListQuery,
  CreateProductInput,
  ProductListQuery,
  UpdateProductInput,
} from '../schemas/product.schema';

export interface PaginatedProducts {
  products: Product[];
  pagination: PaginationMeta;
}

const buildSort = (sort: ProductListQuery['sort']): Prisma.ProductOrderByWithRelationInput => {
  switch (sort) {
    case 'price_asc':
      return { priceCents: 'asc' };
    case 'price_desc':
      return { priceCents: 'desc' };
    case 'name_asc':
      return { name: 'asc' };
    case 'newest':
    default:
      return { createdAt: 'desc' };
  }
};

/** Public catalogue: only active products are ever visible. */
export const listPublicProducts = async (query: ProductListQuery): Promise<PaginatedProducts> => {
  const where: Prisma.ProductWhereInput = { isActive: true };

  if (query.category) where.category = { equals: query.category, mode: 'insensitive' };
  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { description: { contains: query.search, mode: 'insensitive' } },
      { category: { contains: query.search, mode: 'insensitive' } },
    ];
  }
  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    where.priceCents = {
      ...(query.minPrice !== undefined ? { gte: query.minPrice } : {}),
      ...(query.maxPrice !== undefined ? { lte: query.maxPrice } : {}),
    };
  }

  const [products, total] = await prisma.$transaction([
    prisma.product.findMany({
      where,
      orderBy: buildSort(query.sort),
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.product.count({ where }),
  ]);

  return { products, pagination: buildPaginationMeta(query.page, query.limit, total) };
};

export const listAdminProducts = async (
  query: AdminProductListQuery,
): Promise<PaginatedProducts> => {
  const where: Prisma.ProductWhereInput = {};

  if (query.status === 'active') where.isActive = true;
  if (query.status === 'inactive') where.isActive = false;
  if (query.category) where.category = { equals: query.category, mode: 'insensitive' };
  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { slug: { contains: query.search, mode: 'insensitive' } },
      { category: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  const [products, total] = await prisma.$transaction([
    prisma.product.findMany({
      where,
      orderBy: buildSort(query.sort),
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.product.count({ where }),
  ]);

  return { products, pagination: buildPaginationMeta(query.page, query.limit, total) };
};

/** Accepts a UUID or a slug, so product URLs can be human readable. */
export const getPublicProduct = async (idOrSlug: string): Promise<Product> => {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);

  const product = await prisma.product.findFirst({
    where: isUuid ? { id: idOrSlug, isActive: true } : { slug: idOrSlug, isActive: true },
  });

  // An inactive product is reported as not found rather than as forbidden —
  // the catalogue does not disclose what it is hiding.
  if (!product) throw AppError.notFound('Product not found');
  return product;
};

export const getProductByIdForAdmin = async (id: string): Promise<Product> => {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw AppError.notFound('Product not found');
  return product;
};

export const listCategories = async (): Promise<string[]> => {
  const rows = await prisma.product.findMany({
    where: { isActive: true },
    distinct: ['category'],
    select: { category: true },
    orderBy: { category: 'asc' },
  });
  return rows.map((row) => row.category);
};

export const createProduct = async (input: CreateProductInput): Promise<Product> => {
  const slug = input.slug ?? slugify(input.name);

  try {
    return await prisma.product.create({ data: { ...input, slug } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw AppError.conflict('A product with this slug already exists');
    }
    throw error;
  }
};

export const updateProduct = async (id: string, input: UpdateProductInput): Promise<Product> => {
  await getProductByIdForAdmin(id);

  const data: Prisma.ProductUpdateInput = { ...input };
  if (input.name && !input.slug) data.slug = slugify(input.name);

  try {
    return await prisma.product.update({ where: { id }, data });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw AppError.conflict('A product with this slug already exists');
    }
    throw error;
  }
};

export interface DeleteProductResult {
  deleted: boolean;
  archived: boolean;
  product: Product;
}

/**
 * Deleting a product that has been ordered would amputate order history, so
 * a product with order items is ARCHIVED (isActive=false) instead. Only a
 * product that has never been purchased is physically removed.
 */
export const deleteProduct = async (id: string): Promise<DeleteProductResult> => {
  await getProductByIdForAdmin(id);

  const orderItemCount = await prisma.orderItem.count({ where: { productId: id } });

  if (orderItemCount > 0) {
    const product = await prisma.product.update({ where: { id }, data: { isActive: false } });
    return { deleted: false, archived: true, product };
  }

  const product = await prisma.product.delete({ where: { id } });
  return { deleted: true, archived: false, product };
};
