import bcrypt from 'bcryptjs';
import request from 'supertest';
import type { Express } from 'express';
import { OrderStatus, PaymentStatus, Role, type Order, type Product, type User } from '@prisma/client';
import { prisma } from '../../src/lib/prisma';
import { generateOrderNumber } from '../../src/utils/orderNumber';

export const VALID_PASSWORD = 'Password123';

export const createUser = async (
  overrides: Partial<Pick<User, 'name' | 'email' | 'role'>> & { password?: string } = {},
): Promise<User> => {
  const password = overrides.password ?? VALID_PASSWORD;
  return prisma.user.create({
    data: {
      name: overrides.name ?? 'Test Customer',
      email: overrides.email ?? `customer-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@test.io`,
      passwordHash: await bcrypt.hash(password, 4), // low cost: tests, not production
      role: overrides.role ?? Role.CUSTOMER,
    },
  });
};

export const createAdmin = (overrides: Parameters<typeof createUser>[0] = {}) =>
  createUser({ ...overrides, role: Role.ADMIN, name: overrides.name ?? 'Test Admin' });

let productCounter = 0;

export const createProduct = async (overrides: Partial<Product> = {}): Promise<Product> => {
  productCounter += 1;
  const slug = overrides.slug ?? `test-product-${productCounter}-${Math.random().toString(36).slice(2, 7)}`;

  return prisma.product.create({
    data: {
      name: overrides.name ?? `Test Product ${productCounter}`,
      slug,
      description: overrides.description ?? 'A product used by the automated test suite.',
      priceCents: overrides.priceCents ?? 10_000,
      currency: overrides.currency ?? 'usd',
      imageUrl: overrides.imageUrl ?? '/products/test.svg',
      category: overrides.category ?? 'Testing',
      stock: overrides.stock ?? 10,
      isActive: overrides.isActive ?? true,
    },
  });
};

export interface AuthenticatedAgent {
  agent: ReturnType<typeof request.agent>;
  csrfToken: string;
  user: { id: string; email: string; name: string; role: Role };
}

/**
 * Signs a user in and returns a cookie-persisting agent plus the CSRF token
 * the server issued, so tests exercise the same double-submit flow the
 * browser does.
 */
export const login = async (
  app: Express,
  email: string,
  password = VALID_PASSWORD,
): Promise<AuthenticatedAgent> => {
  const agent = request.agent(app);
  const response = await agent.post('/api/auth/login').send({ email, password }).expect(200);

  return {
    agent,
    csrfToken: response.body.data.csrfToken,
    user: response.body.data.user,
  };
};

export const loginAsNewCustomer = async (app: Express): Promise<AuthenticatedAgent> => {
  const user = await createUser();
  return login(app, user.email);
};

export const loginAsNewAdmin = async (app: Express): Promise<AuthenticatedAgent> => {
  const admin = await createAdmin();
  return login(app, admin.email);
};

/** Creates a PENDING order already linked to a Stripe session id. */
export const createPendingOrder = async (options: {
  userId: string;
  product: Product;
  quantity?: number;
  sessionId: string;
}): Promise<Order> => {
  const quantity = options.quantity ?? 1;
  const subtotal = options.product.priceCents * quantity;

  return prisma.order.create({
    data: {
      userId: options.userId,
      orderNumber: generateOrderNumber(),
      status: OrderStatus.PENDING,
      subtotalCents: subtotal,
      totalAmountCents: subtotal,
      currency: options.product.currency,
      stripeCheckoutSessionId: options.sessionId,
      items: {
        create: [
          {
            productId: options.product.id,
            productName: options.product.name,
            productImage: options.product.imageUrl,
            quantity,
            unitPriceCents: options.product.priceCents,
            subtotalCents: subtotal,
          },
        ],
      },
      payment: {
        create: {
          provider: 'stripe',
          stripeCheckoutSessionId: options.sessionId,
          amountCents: subtotal,
          currency: options.product.currency,
          status: PaymentStatus.PENDING,
        },
      },
    },
  });
};
