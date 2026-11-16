import { useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, Clock, Package, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shop/EmptyState';
import { ProductImage } from '@/components/shop/ProductImage';
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/shop/StatusBadge';
import { orderService } from '@/services/order.service';
import { useCartStore } from '@/store/cart.store';
import { formatDateTime, formatMoney } from '@/utils/format';

/** Roughly 60s of polling at 2.5s intervals before we stop and offer a manual refresh. */
const MAX_POLLS = 24;

export const CheckoutSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const clearCart = useCartStore((state) => state.clear);
  const pollCount = useRef(0);

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['order', 'by-session', sessionId],
    queryFn: () => orderService.getBySession(sessionId as string),
    enabled: Boolean(sessionId),
    /**
     * The customer is redirected here by Stripe the instant payment is
     * authorised, which can be BEFORE the webhook reaches our server. So we
     * poll for the authoritative status instead of assuming success — this
     * page never writes anything, it only reads.
     */
    refetchInterval: (query) => {
      const result = query.state.data;
      if (!result?.awaitingConfirmation) return false;
      pollCount.current += 1;
      return pollCount.current >= MAX_POLLS ? false : 2500;
    },
  });

  const order = data?.order;
  const isPaid = order?.status === 'PAID';
  const stillWaiting = Boolean(data?.awaitingConfirmation);
  const gaveUpWaiting = stillWaiting && pollCount.current >= MAX_POLLS;

  // The basket became an order; emptying it prevents a duplicate purchase.
  useEffect(() => {
    if (isPaid) clearCart();
  }, [isPaid, clearCart]);

  if (!sessionId) {
    return (
      <div className="container py-20">
        <EmptyState
          icon={AlertCircle}
          title="No checkout session"
          description="This page is shown after a Stripe checkout. There is no session reference in the URL."
          action={
            <Button asChild>
              <Link to="/shop">Back to shop</Link>
            </Button>
          }
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container max-w-3xl py-16">
        <Skeleton className="mx-auto h-14 w-14 rounded-full" />
        <Skeleton className="mx-auto mt-6 h-9 w-72" />
        <Skeleton className="mx-auto mt-3 h-5 w-96" />
        <Skeleton className="mt-10 h-64 w-full" />
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="container py-20">
        <EmptyState
          icon={AlertCircle}
          title="We could not find that order"
          description="The checkout session may belong to a different account. Check your order history, or contact support with your session reference."
          action={
            <Button asChild>
              <Link to="/orders">View order history</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="container max-w-3xl py-14 md:py-20">
      <div className="text-center">
        <div
          className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${
            isPaid ? 'bg-success/10' : 'bg-warning/10'
          }`}
        >
          {isPaid ? (
            <CheckCircle2 className="h-7 w-7 text-success" aria-hidden="true" />
          ) : (
            <Clock className="h-7 w-7 text-warning" aria-hidden="true" />
          )}
        </div>

        <h1 className="mt-6 text-3xl font-semibold sm:text-4xl">
          {isPaid ? 'Thank you for your order' : 'Confirming your payment'}
        </h1>

        <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-muted-foreground">
          {isPaid
            ? 'Your payment was confirmed by Stripe and your order is now being prepared.'
            : gaveUpWaiting
              ? 'Stripe has not confirmed this payment yet. This can happen with slower payment methods — your order history will update automatically once it does.'
              : 'Your payment is being confirmed. This page updates by itself, so there is no need to reload.'}
        </p>

        {/* Status is announced to assistive technology as it changes. */}
        <div className="sr-only" role="status" aria-live="polite">
          {isPaid ? 'Payment confirmed' : 'Awaiting payment confirmation'}
        </div>

        {stillWaiting ? (
          <Button
            variant="outline"
            size="sm"
            className="mt-6"
            onClick={() => {
              pollCount.current = 0;
              void refetch();
            }}
            loading={isRefetching}
          >
            {!isRefetching ? <RefreshCw className="h-4 w-4" aria-hidden="true" /> : null}
            Check again
          </Button>
        ) : null}
      </div>

      <Card className="mt-10">
        <CardContent className="p-6">
          <dl className="grid gap-5 sm:grid-cols-2">
            <div>
              <dt className="text-eyebrow">Order number</dt>
              <dd className="tabular mt-1.5 text-sm font-semibold">{order.orderNumber}</dd>
            </div>
            <div>
              <dt className="text-eyebrow">Order date</dt>
              <dd className="mt-1.5 text-sm">{formatDateTime(order.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-eyebrow">Order status</dt>
              <dd className="mt-1.5">
                <OrderStatusBadge status={order.status} />
              </dd>
            </div>
            <div>
              <dt className="text-eyebrow">Payment status</dt>
              <dd className="mt-1.5">
                <PaymentStatusBadge status={order.payment?.status} />
              </dd>
            </div>
          </dl>

          <Separator className="my-6" />

          <h2 className="text-base font-semibold">Items</h2>
          <ul className="mt-4 divide-y divide-border">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-center gap-4 py-4">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-secondary">
                  <ProductImage src={item.productImage} alt={item.productName} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.productName}</p>
                  <p className="tabular mt-0.5 text-sm text-muted-foreground">
                    {item.quantity} × {formatMoney(item.unitPriceCents, order.currency)}
                  </p>
                </div>
                <p className="tabular text-sm font-semibold">
                  {formatMoney(item.subtotalCents, order.currency)}
                </p>
              </li>
            ))}
          </ul>

          <Separator className="my-6" />

          <div className="flex items-baseline justify-between">
            <span className="text-base font-semibold">
              {isPaid ? 'Total paid' : 'Order total'}
            </span>
            <span className="tabular text-xl font-semibold">
              {formatMoney(order.totalAmountCents, order.currency)}
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link to="/orders">
            <Package className="h-4 w-4" aria-hidden="true" />
            View order history
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/shop">Continue shopping</Link>
        </Button>
      </div>
    </div>
  );
};
