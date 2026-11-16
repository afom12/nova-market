import { describe, expect, it } from 'vitest';
import { useCartStore } from './cart.store';
import { buildProduct } from '@/test/utils';

const getState = () => useCartStore.getState();

describe('cart store', () => {
  it('adds a product to an empty cart', () => {
    const product = buildProduct();
    getState().addItem(product);

    const { lines } = getState();
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      productId: product.id,
      quantity: 1,
      unitPriceCents: 34_900,
    });
  });

  it('merges quantities instead of duplicating an existing line', () => {
    const product = buildProduct();
    getState().addItem(product, 2);
    getState().addItem(product, 3);

    const { lines } = getState();
    expect(lines).toHaveLength(1);
    expect(lines[0]?.quantity).toBe(5);
  });

  it('increments and decrements a line quantity', () => {
    const product = buildProduct();
    getState().addItem(product);

    getState().increment(product.id);
    expect(getState().lines[0]?.quantity).toBe(2);

    getState().decrement(product.id);
    expect(getState().lines[0]?.quantity).toBe(1);
  });

  it('never lets quantity exceed available stock', () => {
    const product = buildProduct({ stock: 3 });
    getState().addItem(product, 10);

    expect(getState().lines[0]?.quantity).toBe(3);
  });

  it('caps a single line at 20 units even when stock is plentiful', () => {
    const product = buildProduct({ stock: 500 });
    getState().setQuantity(product.id, 50);
    getState().addItem(product, 50);

    expect(getState().lines[0]?.quantity).toBe(20);
  });

  it('removes the line when quantity drops to zero', () => {
    const product = buildProduct();
    getState().addItem(product);
    getState().setQuantity(product.id, 0);

    expect(getState().lines).toHaveLength(0);
  });

  it('removes a specific item and clears the whole cart', () => {
    const first = buildProduct();
    const second = buildProduct({ id: '22222222-2222-4222-8222-222222222222', slug: 'second' });

    getState().addItem(first);
    getState().addItem(second);
    expect(getState().lines).toHaveLength(2);

    getState().removeItem(first.id);
    expect(getState().lines).toHaveLength(1);

    getState().clear();
    expect(getState().lines).toHaveLength(0);
  });

  it('computes totals with integer arithmetic only', () => {
    // 19.99 and 0.07 are the classic float traps.
    getState().addItem(buildProduct({ priceCents: 1_999 }), 3);
    getState().addItem(
      buildProduct({ id: '33333333-3333-4333-8333-333333333333', slug: 'cent', priceCents: 7 }),
      3,
    );

    const subtotal = getState().subtotalCents();
    expect(subtotal).toBe(6_018);
    expect(Number.isInteger(subtotal)).toBe(true);
    expect(getState().totalItems()).toBe(6);
  });
});
