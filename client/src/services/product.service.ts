import { api, unwrap } from './api';
import type { Pagination, Product } from '@/types';

export interface ProductQuery {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'name_asc';
}

export interface AdminProductQuery extends ProductQuery {
  status?: 'all' | 'active' | 'inactive';
}

export interface ProductListResult {
  products: Product[];
  pagination: Pagination;
}

export interface ProductPayload {
  name: string;
  description: string;
  priceCents: number;
  currency: string;
  imageUrl: string;
  category: string;
  stock: number;
  isActive: boolean;
}

export const productService = {
  list: async (query: ProductQuery = {}): Promise<ProductListResult> => {
    const { data } = await api.get<{ data: { products: Product[] }; meta: { pagination: Pagination } }>(
      '/products',
      { params: query },
    );
    return { products: data.data.products, pagination: data.meta.pagination };
  },

  get: async (idOrSlug: string): Promise<Product> => {
    const { data } = await api.get<{ data: { product: Product } }>(`/products/${idOrSlug}`);
    return unwrap(data).product;
  },

  categories: async (): Promise<string[]> => {
    const { data } = await api.get<{ data: { categories: string[] } }>('/products/categories');
    return unwrap(data).categories;
  },

  adminList: async (query: AdminProductQuery = {}): Promise<ProductListResult> => {
    const { data } = await api.get<{ data: { products: Product[] }; meta: { pagination: Pagination } }>(
      '/admin/products',
      { params: query },
    );
    return { products: data.data.products, pagination: data.meta.pagination };
  },

  adminGet: async (id: string): Promise<Product> => {
    const { data } = await api.get<{ data: { product: Product } }>(`/admin/products/${id}`);
    return unwrap(data).product;
  },

  adminCreate: async (payload: ProductPayload): Promise<Product> => {
    const { data } = await api.post<{ data: { product: Product } }>('/admin/products', payload);
    return unwrap(data).product;
  },

  adminUpdate: async (id: string, payload: Partial<ProductPayload>): Promise<Product> => {
    const { data } = await api.put<{ data: { product: Product } }>(`/admin/products/${id}`, payload);
    return unwrap(data).product;
  },

  adminDelete: async (id: string): Promise<{ archived: boolean; message: string }> => {
    const { data } = await api.delete<{ data: { archived: boolean; message: string } }>(
      `/admin/products/${id}`,
    );
    return unwrap(data);
  },
};
