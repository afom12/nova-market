import type { ReactElement, ReactNode } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Product } from '@/types';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      // Retries would make a failing request take seconds to surface.
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

export const renderWithProviders = (
  ui: ReactElement,
  { route = '/', ...options }: RenderOptions & { route?: string } = {},
) => {
  const queryClient = createTestQueryClient();

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
    </QueryClientProvider>
  );

  return { queryClient, ...render(ui, { wrapper: Wrapper, ...options }) };
};

export const buildProduct = (overrides: Partial<Product> = {}): Product => ({
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Aurora Wireless Headphones',
  slug: 'aurora-wireless-headphones',
  description: 'Reference-grade over-ear headphones with adaptive noise cancellation.',
  priceCents: 34_900,
  currency: 'usd',
  imageUrl: '/products/aurora-headphones.svg',
  category: 'Audio',
  stock: 10,
  isActive: true,
  createdAt: new Date('2026-01-01').toISOString(),
  updatedAt: new Date('2026-01-01').toISOString(),
  ...overrides,
});
