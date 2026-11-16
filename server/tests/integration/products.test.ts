import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../src/app';
import { prisma } from '../../src/lib/prisma';
import {
  createProduct,
  loginAsNewAdmin,
  loginAsNewCustomer,
} from '../helpers/factories';

let app: Express;

beforeAll(() => {
  app = createApp();
});

describe('GET /api/products', () => {
  it('lists active products with pagination metadata', async () => {
    await createProduct({ name: 'Visible One' });
    await createProduct({ name: 'Visible Two' });

    const response = await request(app).get('/api/products').expect(200);

    expect(response.body.data.products).toHaveLength(2);
    expect(response.body.meta.pagination).toMatchObject({ page: 1, total: 2, totalPages: 1 });
  });

  it('hides inactive products from the public catalogue', async () => {
    await createProduct({ name: 'Active Product' });
    await createProduct({ name: 'Archived Product', isActive: false });

    const response = await request(app).get('/api/products').expect(200);

    expect(response.body.data.products).toHaveLength(1);
    expect(response.body.data.products[0].name).toBe('Active Product');
  });

  it('filters by category', async () => {
    await createProduct({ category: 'Audio' });
    await createProduct({ category: 'Lighting' });

    const response = await request(app).get('/api/products?category=Audio').expect(200);

    expect(response.body.data.products).toHaveLength(1);
    expect(response.body.data.products[0].category).toBe('Audio');
  });

  it('searches by name', async () => {
    await createProduct({ name: 'Aurora Headphones' });
    await createProduct({ name: 'Meridian Keyboard' });

    const response = await request(app).get('/api/products?search=aurora').expect(200);

    expect(response.body.data.products).toHaveLength(1);
    expect(response.body.data.products[0].name).toBe('Aurora Headphones');
  });

  it('sorts by price ascending', async () => {
    await createProduct({ priceCents: 30_000 });
    await createProduct({ priceCents: 10_000 });
    await createProduct({ priceCents: 20_000 });

    const response = await request(app).get('/api/products?sort=price_asc').expect(200);

    expect(response.body.data.products.map((p: { priceCents: number }) => p.priceCents)).toEqual([
      10_000, 20_000, 30_000,
    ]);
  });

  it('paginates', async () => {
    for (let i = 0; i < 5; i += 1) await createProduct();

    const response = await request(app).get('/api/products?page=2&limit=2').expect(200);

    expect(response.body.data.products).toHaveLength(2);
    expect(response.body.meta.pagination).toMatchObject({
      page: 2,
      total: 5,
      totalPages: 3,
      hasNextPage: true,
      hasPreviousPage: true,
    });
  });

  it('rejects an invalid query parameter with 422', async () => {
    await request(app).get('/api/products?page=0').expect(422);
    await request(app).get('/api/products?sort=cheapest').expect(422);
  });

  it('returns prices as integer minor units', async () => {
    await createProduct({ priceCents: 24_999 });

    const response = await request(app).get('/api/products').expect(200);
    const price = response.body.data.products[0].priceCents;

    expect(price).toBe(24_999);
    expect(Number.isInteger(price)).toBe(true);
  });
});

describe('GET /api/products/:id', () => {
  it('fetches a product by id', async () => {
    const product = await createProduct();

    const response = await request(app).get(`/api/products/${product.id}`).expect(200);
    expect(response.body.data.product.id).toBe(product.id);
  });

  it('fetches a product by slug', async () => {
    const product = await createProduct({ slug: 'findable-by-slug' });

    const response = await request(app).get('/api/products/findable-by-slug').expect(200);
    expect(response.body.data.product.id).toBe(product.id);
  });

  it('returns 404 for an unknown id', async () => {
    await request(app).get('/api/products/11111111-1111-4111-8111-111111111111').expect(404);
  });

  it('returns 404 for an inactive product rather than revealing it exists', async () => {
    const product = await createProduct({ isActive: false, slug: 'hidden-product' });

    const byId = await request(app).get(`/api/products/${product.id}`).expect(404);
    await request(app).get('/api/products/hidden-product').expect(404);

    expect(byId.body.error.code).toBe('NOT_FOUND');
  });
});

describe('GET /api/products/categories', () => {
  it('returns the distinct categories of active products', async () => {
    await createProduct({ category: 'Audio' });
    await createProduct({ category: 'Audio' });
    await createProduct({ category: 'Home' });
    await createProduct({ category: 'Hidden', isActive: false });

    const response = await request(app).get('/api/products/categories').expect(200);
    expect(response.body.data.categories).toEqual(['Audio', 'Home']);
  });
});

describe('admin product management', () => {
  it('requires authentication', async () => {
    await request(app).get('/api/admin/products').expect(401);
  });

  it('rejects a non-admin customer with 403', async () => {
    const { agent } = await loginAsNewCustomer(app);

    const response = await agent.get('/api/admin/products').expect(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('lists all products including archived ones for an admin', async () => {
    await createProduct({ name: 'Active' });
    await createProduct({ name: 'Archived', isActive: false });

    const { agent } = await loginAsNewAdmin(app);
    const response = await agent.get('/api/admin/products').expect(200);

    expect(response.body.data.products).toHaveLength(2);
  });

  it('creates a product and derives the slug from the name', async () => {
    const { agent, csrfToken } = await loginAsNewAdmin(app);

    const response = await agent
      .post('/api/admin/products')
      .set('X-CSRF-Token', csrfToken)
      .send({
        name: 'Brand New Lamp',
        description: 'A description long enough to satisfy validation.',
        priceCents: 12_900,
        currency: 'usd',
        imageUrl: '/products/lamp.svg',
        category: 'Lighting',
        stock: 5,
        isActive: true,
      })
      .expect(201);

    expect(response.body.data.product).toMatchObject({
      slug: 'brand-new-lamp',
      priceCents: 12_900,
    });
  });

  it('rejects a non-integer or negative price', async () => {
    const { agent, csrfToken } = await loginAsNewAdmin(app);

    const base = {
      name: 'Bad Price',
      description: 'A description long enough to satisfy validation.',
      currency: 'usd',
      imageUrl: '/products/x.svg',
      category: 'Testing',
      stock: 1,
      isActive: true,
    };

    await agent
      .post('/api/admin/products')
      .set('X-CSRF-Token', csrfToken)
      .send({ ...base, priceCents: 129.99 })
      .expect(422);

    await agent
      .post('/api/admin/products')
      .set('X-CSRF-Token', csrfToken)
      .send({ ...base, priceCents: -500 })
      .expect(422);
  });

  it('updates a product', async () => {
    const product = await createProduct({ priceCents: 10_000 });
    const { agent, csrfToken } = await loginAsNewAdmin(app);

    const response = await agent
      .put(`/api/admin/products/${product.id}`)
      .set('X-CSRF-Token', csrfToken)
      .send({ priceCents: 15_000, stock: 42 })
      .expect(200);

    expect(response.body.data.product).toMatchObject({ priceCents: 15_000, stock: 42 });
  });

  it('hard-deletes a product that has never been ordered', async () => {
    const product = await createProduct();
    const { agent, csrfToken } = await loginAsNewAdmin(app);

    const response = await agent
      .delete(`/api/admin/products/${product.id}`)
      .set('X-CSRF-Token', csrfToken)
      .expect(200);

    expect(response.body.data).toMatchObject({ deleted: true, archived: false });
    expect(await prisma.product.findUnique({ where: { id: product.id } })).toBeNull();
  });

  it('archives instead of deleting a product that appears in an order', async () => {
    const { createPendingOrder, createUser } = await import('../helpers/factories');
    const customer = await createUser();
    const product = await createProduct();
    await createPendingOrder({ userId: customer.id, product, sessionId: 'cs_test_archive' });

    const { agent, csrfToken } = await loginAsNewAdmin(app);

    const response = await agent
      .delete(`/api/admin/products/${product.id}`)
      .set('X-CSRF-Token', csrfToken)
      .expect(200);

    expect(response.body.data).toMatchObject({ deleted: false, archived: true });

    // Order history must survive, so the row is kept and simply hidden.
    const stored = await prisma.product.findUnique({ where: { id: product.id } });
    expect(stored?.isActive).toBe(false);
  });

  it('prevents a customer from creating a product', async () => {
    const { agent, csrfToken } = await loginAsNewCustomer(app);

    await agent
      .post('/api/admin/products')
      .set('X-CSRF-Token', csrfToken)
      .send({
        name: 'Sneaky Product',
        description: 'A description long enough to satisfy validation.',
        priceCents: 100,
        currency: 'usd',
        imageUrl: '/x.svg',
        category: 'Testing',
        stock: 1,
        isActive: true,
      })
      .expect(403);

    expect(await prisma.product.count()).toBe(0);
  });
});
