import { Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ProductImage } from './ProductImage';
import { useCartStore } from '@/store/cart.store';
import { toast } from '@/hooks/useToast';
import { formatMoney } from '@/utils/format';
import type { Product } from '@/types';

interface ProductCardProps {
  product: Product;
}

export const ProductCard = ({ product }: ProductCardProps) => {
  const addItem = useCartStore((state) => state.addItem);
  const outOfStock = product.stock <= 0;
  const lowStock = !outOfStock && product.stock <= 5;

  const handleAdd = () => {
    addItem(product, 1);
    toast.success('Added to cart', `${product.name} is in your cart.`);
  };

  return (
    <article className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-card transition-shadow duration-300 hover:shadow-lift">
      <Link
        to={`/products/${product.slug}`}
        className="relative block aspect-[4/3] overflow-hidden bg-secondary"
        aria-label={`View ${product.name}`}
      >
        <ProductImage
          src={product.imageUrl}
          alt={product.name}
          className="transition-transform duration-500 group-hover:scale-[1.03]"
        />
        {outOfStock ? (
          <span className="absolute left-3 top-3">
            <Badge tone="neutral">Out of stock</Badge>
          </span>
        ) : lowStock ? (
          <span className="absolute left-3 top-3">
            <Badge tone="warning">Only {product.stock} left</Badge>
          </span>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <p className="text-eyebrow">{product.category}</p>

        <h3 className="mt-2 text-base font-semibold leading-snug">
          <Link to={`/products/${product.slug}`} className="transition-colors hover:text-primary">
            {product.name}
          </Link>
        </h3>

        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {product.description}
        </p>

        <div className="mt-5 flex items-center justify-between gap-3 pt-1">
          <span className="tabular text-lg font-semibold">
            {formatMoney(product.priceCents, product.currency)}
          </span>
          <Button size="sm" onClick={handleAdd} disabled={outOfStock}>
            <ShoppingBag className="h-4 w-4" aria-hidden="true" />
            {outOfStock ? 'Unavailable' : 'Add'}
          </Button>
        </div>
      </div>
    </article>
  );
};

/** Matches the card's real dimensions so the grid does not jump on load. */
export const ProductCardSkeleton = () => (
  <div className="overflow-hidden rounded-lg border border-border bg-card">
    <Skeleton className="aspect-[4/3] w-full rounded-none" />
    <div className="space-y-3 p-5">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <div className="flex items-center justify-between pt-2">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-9 w-20" />
      </div>
    </div>
  </div>
);
