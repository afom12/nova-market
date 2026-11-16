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

/*
 * The add-to-cart affordance is revealed on hover — but only on devices that
 * can actually hover. Touch screens always see it, and keyboard users see it
 * as soon as focus enters the card (focus-within), so it is never hidden from
 * anyone who cannot hover.
 */
const revealOnHover =
  'transition-opacity duration-300 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 group-focus-within:!opacity-100';

export const ProductCard = ({ product }: ProductCardProps) => {
  const addItem = useCartStore((state) => state.addItem);
  const outOfStock = product.stock <= 0;
  const lowStock = !outOfStock && product.stock <= 5;

  const handleAdd = () => {
    addItem(product, 1);
    toast.success('Added to cart', `${product.name} is in your cart.`);
  };

  return (
    <article className="group flex flex-col">
      <Link
        to={`/products/${product.slug}`}
        className="relative block aspect-[4/5] overflow-hidden rounded-sm bg-secondary"
        aria-label={`View ${product.name}`}
      >
        <ProductImage
          src={product.imageUrl}
          alt={product.name}
          className="transition-transform duration-700 ease-out group-hover:scale-[1.025]"
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

      <div className="flex flex-1 flex-col pt-5">
        <div className="flex items-baseline justify-between gap-4 border-b border-border pb-3">
          <p className="text-eyebrow">{product.category}</p>
          <span className="tabular text-sm text-foreground">
            {formatMoney(product.priceCents, product.currency)}
          </span>
        </div>

        <h3 className="mt-4 text-2xl leading-[1.12]">
          <Link
            to={`/products/${product.slug}`}
            className="bg-[length:0%_1px] bg-left-bottom bg-no-repeat transition-[background-size] duration-500 [background-image:linear-gradient(currentColor,currentColor)] group-hover:bg-[length:100%_1px]"
          >
            {product.name}
          </Link>
        </h3>

        <p className="mt-3 line-clamp-2 max-w-measure text-sm leading-relaxed text-muted-foreground">
          {product.description}
        </p>

        <div className={`mt-5 ${revealOnHover}`}>
          <Button size="sm" variant="outline" onClick={handleAdd} disabled={outOfStock}>
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
  <div>
    <Skeleton className="aspect-[4/5] w-full rounded-sm" />
    <div className="pt-5">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-4 w-14" />
      </div>
      <Skeleton className="mt-4 h-7 w-3/4" />
      <Skeleton className="mt-3 h-4 w-full" />
      <Skeleton className="mt-2 h-4 w-2/3" />
      <Skeleton className="mt-5 h-9 w-20" />
    </div>
  </div>
);
