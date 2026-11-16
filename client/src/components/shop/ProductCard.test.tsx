import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductCard } from './ProductCard';
import { useCartStore } from '@/store/cart.store';
import { buildProduct, renderWithProviders } from '@/test/utils';

describe('ProductCard', () => {
  it('renders the product name, category and formatted price', () => {
    renderWithProviders(<ProductCard product={buildProduct()} />);

    expect(screen.getByRole('heading', { name: 'Aurora Wireless Headphones' })).toBeInTheDocument();
    expect(screen.getByText('Audio')).toBeInTheDocument();
    // 34900 minor units must render as $349.00, not $34900 or $349.
    expect(screen.getByText('$349.00')).toBeInTheDocument();
  });

  it('adds the product to the cart when "Add" is clicked', async () => {
    const user = userEvent.setup();
    const product = buildProduct();

    renderWithProviders(<ProductCard product={product} />);
    expect(useCartStore.getState().lines).toHaveLength(0);

    await user.click(screen.getByRole('button', { name: /add/i }));

    const { lines } = useCartStore.getState();
    expect(lines).toHaveLength(1);
    expect(lines[0]?.productId).toBe(product.id);
    expect(lines[0]?.quantity).toBe(1);
  });

  it('disables purchasing when the product is out of stock', async () => {
    const user = userEvent.setup();

    renderWithProviders(<ProductCard product={buildProduct({ stock: 0 })} />);

    const button = screen.getByRole('button', { name: /unavailable/i });
    expect(button).toBeDisabled();
    expect(screen.getByText('Out of stock')).toBeInTheDocument();

    await user.click(button);
    expect(useCartStore.getState().lines).toHaveLength(0);
  });

  it('warns when stock is low', () => {
    renderWithProviders(<ProductCard product={buildProduct({ stock: 3 })} />);
    expect(screen.getByText('Only 3 left')).toBeInTheDocument();
  });

  it('links to the product details page by slug', () => {
    renderWithProviders(<ProductCard product={buildProduct()} />);

    const links = screen.getAllByRole('link');
    expect(links.some((link) => link.getAttribute('href') === '/products/aurora-wireless-headphones')).toBe(
      true,
    );
  });
});
