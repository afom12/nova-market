import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ShoppingBag, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCartStore } from '@/store/cart.store';

export const CheckoutCancelPage = () => {
  const [searchParams] = useSearchParams();
  const orderNumber = searchParams.get('orderNumber');

  // The cart was deliberately NOT cleared when checkout started, so an
  // abandoned payment leaves the shopper exactly where they were.
  const itemCount = useCartStore((state) => state.lines.reduce((sum, line) => sum + line.quantity, 0));

  return (
    <div className="container max-w-2xl py-16 md:py-24">
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
          <XCircle className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
        </div>

        <h1 className="mt-6 text-3xl font-semibold sm:text-4xl">Checkout cancelled</h1>

        <p className="mx-auto mt-3 max-w-lg text-base leading-relaxed text-muted-foreground">
          No payment was taken and you have not been charged. Your cart is exactly as you left it.
        </p>
      </div>

      <Card className="mt-10">
        <CardContent className="p-6">
          <h2 className="text-base font-semibold">What happens now</h2>
          <ul className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
            <li className="flex gap-3">
              <span aria-hidden="true">•</span>
              <span>
                {itemCount > 0
                  ? `Your cart still holds ${itemCount} item${itemCount === 1 ? '' : 's'} — you can pick up where you stopped.`
                  : 'Your cart is empty, so nothing is waiting to be purchased.'}
              </span>
            </li>
            <li className="flex gap-3">
              <span aria-hidden="true">•</span>
              <span>
                The order was recorded as unpaid and will expire on its own. It is never counted as
                revenue.
              </span>
            </li>
            {orderNumber ? (
              <li className="flex gap-3">
                <span aria-hidden="true">•</span>
                <span>
                  Reference <span className="tabular font-medium text-foreground">{orderNumber}</span>{' '}
                  is visible in your order history.
                </span>
              </li>
            ) : null}
          </ul>

          <div className="mt-7 flex flex-wrap gap-3">
            {itemCount > 0 ? (
              <Button asChild>
                <Link to="/cart">
                  <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                  Return to cart and retry
                </Link>
              </Button>
            ) : null}
            <Button asChild variant={itemCount > 0 ? 'outline' : 'default'}>
              <Link to="/shop">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back to the shop
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
