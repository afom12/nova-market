import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { ArrowRight, Lock, ShoppingBag, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { EmptyState } from '@/components/shop/EmptyState';
import { ProductImage } from '@/components/shop/ProductImage';
import { QuantityStepper } from '@/components/shop/QuantityStepper';
import { checkoutService } from '@/services/checkout.service';
import { ApiError } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/useToast';
import { useCartStore } from '@/store/cart.store';
import { formatMoney } from '@/utils/format';

export const CartPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const lines = useCartStore((state) => state.lines);
  const setQuantity = useCartStore((state) => state.setQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const clear = useCartStore((state) => state.clear);

  // Display total. The authoritative amount is recomputed server-side.
  const subtotalCents = lines.reduce((total, line) => total + line.unitPriceCents * line.quantity, 0);
  const currency = lines[0]?.currency ?? 'usd';

  const checkoutMutation = useMutation({
    mutationFn: () =>
      checkoutService.createSession(
        // Only ids and quantities leave the browser — never a price.
        lines.map((line) => ({ productId: line.productId, quantity: line.quantity })),
      ),
    onSuccess: (session) => {
      // Full page navigation to Stripe-hosted Checkout.
      window.location.href = session.checkoutUrl;
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          toast.error('Please sign in', 'You need an account to complete checkout.');
          navigate('/login', { state: { from: { pathname: '/cart' } } });
          return;
        }

        if (error.code === 'CONFLICT' && Array.isArray(error.details)) {
          const reasons = error.details.map((detail) => detail.reason).filter(Boolean).join(' ');
          toast.error('Some items are unavailable', reasons || error.message);
          return;
        }

        toast.error('Checkout could not start', error.message);
        return;
      }

      toast.error('Checkout could not start', 'Please try again in a moment.');
    },
  });

  if (lines.length === 0) {
    return (
      <div className="container py-16 md:py-20">
        <h1 className="mb-10 text-4xl sm:text-5xl">Your cart</h1>
        <EmptyState
          icon={ShoppingBag}
          title="Your cart is empty"
          description="Browse the catalogue and add something you will still be using in five years."
          action={
            <Button asChild>
              <Link to="/shop">Browse products</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="container py-16 md:py-24">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-4xl sm:text-5xl">Your cart</h1>
        <Button variant="ghost" size="sm" onClick={clear}>
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          Clear cart
        </Button>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-12">
        <section className="lg:col-span-7 xl:col-span-8" aria-label="Cart items">
          <ul className="divide-y divide-border rounded-lg border border-border bg-card">
            {lines.map((line) => (
              <li key={line.productId} className="flex gap-4 p-4 sm:gap-6 sm:p-6">
                <Link
                  to={`/products/${line.slug}`}
                  className="h-24 w-24 shrink-0 overflow-hidden rounded-md bg-secondary sm:h-28 sm:w-28"
                >
                  <ProductImage src={line.imageUrl} alt={line.name} />
                </Link>

                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h2 className="text-lg sm:text-xl">
                      <Link to={`/products/${line.slug}`} className="hover:text-primary">
                        {line.name}
                      </Link>
                    </h2>
                    <p className="tabular text-sm font-semibold sm:text-base">
                      {formatMoney(line.unitPriceCents * line.quantity, line.currency)}
                    </p>
                  </div>

                  <p className="tabular mt-1 text-sm text-muted-foreground">
                    {formatMoney(line.unitPriceCents, line.currency)} each
                  </p>

                  <div className="mt-auto flex flex-wrap items-center gap-3 pt-4">
                    <QuantityStepper
                      quantity={line.quantity}
                      max={line.maxStock}
                      onChange={(quantity) => setQuantity(line.productId, quantity)}
                      label={`Quantity of ${line.name}`}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(line.productId)}
                      aria-label={`Remove ${line.name} from cart`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      Remove
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <aside className="lg:col-span-5 xl:col-span-4">
          <Card className="sticky top-24">
            <CardContent className="p-6">
              <h2 className="text-2xl">Order summary</h2>

              <dl className="mt-5 space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Subtotal</dt>
                  <dd className="tabular font-medium">{formatMoney(subtotalCents, currency)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Shipping</dt>
                  <dd className="text-muted-foreground">Calculated at checkout</dd>
                </div>
              </dl>

              <Separator className="my-5" />

              <div className="flex items-baseline justify-between">
                <span className="text-base font-semibold">Total</span>
                <span className="tabular text-xl font-semibold">
                  {formatMoney(subtotalCents, currency)}
                </span>
              </div>

              <Button
                size="lg"
                className="mt-6 w-full"
                onClick={() => checkoutMutation.mutate()}
                loading={checkoutMutation.isPending}
              >
                {checkoutMutation.isPending ? 'Starting checkout' : 'Proceed to checkout'}
                {!checkoutMutation.isPending ? (
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                ) : null}
              </Button>

              <p className="tabular mt-3 text-center text-xs text-muted-foreground">
                Test mode — pay with card 4242 4242 4242 4242
              </p>

              {!isAuthenticated ? (
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  You will be asked to sign in before payment.
                </p>
              ) : null}

              <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <Lock className="h-3 w-3" aria-hidden="true" />
                Secure payment via Stripe
              </p>

              <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">
                Final prices are confirmed by our server at checkout.
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
};
