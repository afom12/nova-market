import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Check, PackageSearch, ShieldCheck, ShoppingBag, Truck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shop/EmptyState';
import { ProductImage } from '@/components/shop/ProductImage';
import { QuantityStepper } from '@/components/shop/QuantityStepper';
import { productService } from '@/services/product.service';
import { useCartStore } from '@/store/cart.store';
import { toast } from '@/hooks/useToast';
import { formatMoney } from '@/utils/format';

export const ProductDetailsPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [quantity, setQuantity] = useState(1);
  const addItem = useCartStore((state) => state.addItem);

  const { data: product, isLoading, isError } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => productService.get(slug as string),
    enabled: Boolean(slug),
  });

  if (isLoading) {
    return (
      <div className="container grid gap-12 py-12 lg:grid-cols-2 lg:py-16">
        <Skeleton className="aspect-[4/3] w-full" />
        <div className="space-y-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-12 w-48" />
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="container py-20">
        <EmptyState
          icon={PackageSearch}
          title="Product not found"
          description="This product may have been removed or is no longer available."
          action={
            <Button asChild>
              <Link to="/shop">Back to shop</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const outOfStock = product.stock <= 0;

  const handleAddToCart = () => {
    addItem(product, quantity);
    toast.success(
      'Added to cart',
      `${quantity} × ${product.name} ${quantity === 1 ? 'is' : 'are'} in your cart.`,
    );
  };

  return (
    <div className="container py-10 md:py-14">
      <Button asChild variant="ghost" size="sm" className="-ml-3 mb-8">
        <Link to="/shop">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to shop
        </Link>
      </Button>

      <div className="grid gap-12 lg:grid-cols-2">
        <div className="overflow-hidden rounded-lg border border-border bg-secondary">
          <div className="aspect-[4/3]">
            <ProductImage src={product.imageUrl} alt={product.name} />
          </div>
        </div>

        <div>
          <p className="text-eyebrow">{product.category}</p>
          <h1 className="mt-2.5 text-3xl font-semibold leading-tight sm:text-4xl">{product.name}</h1>

          <p className="tabular mt-5 text-3xl font-semibold">
            {formatMoney(product.priceCents, product.currency)}
          </p>

          <div className="mt-4">
            {outOfStock ? (
              <Badge tone="neutral">Out of stock</Badge>
            ) : product.stock <= 5 ? (
              <Badge tone="warning">Only {product.stock} left in stock</Badge>
            ) : (
              <Badge tone="success">
                <Check className="mr-1 h-3 w-3" aria-hidden="true" />
                In stock
              </Badge>
            )}
          </div>

          <p className="mt-6 text-base leading-relaxed text-muted-foreground">{product.description}</p>

          <Separator className="my-8" />

          <div className="flex flex-wrap items-center gap-4">
            <QuantityStepper quantity={quantity} max={product.stock} onChange={setQuantity} />
            <Button size="lg" onClick={handleAddToCart} disabled={outOfStock} className="flex-1 sm:flex-none">
              <ShoppingBag className="h-4 w-4" aria-hidden="true" />
              {outOfStock ? 'Out of stock' : 'Add to cart'}
            </Button>
          </div>

          <dl className="mt-10 space-y-3 text-sm">
            <div className="flex gap-3 text-muted-foreground">
              <ShieldCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <span>Secure payment via Stripe — your card details never reach our servers.</span>
            </div>
            <div className="flex gap-3 text-muted-foreground">
              <Truck className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <span>Dispatched within two working days, tracked from the warehouse.</span>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
};
