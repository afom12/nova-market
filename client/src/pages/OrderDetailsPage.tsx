import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shop/EmptyState';
import { ProductImage } from '@/components/shop/ProductImage';
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/shop/StatusBadge';
import { orderService } from '@/services/order.service';
import { formatDateTime, formatMoney } from '@/utils/format';

export const OrderDetailsPage = () => {
  const { id } = useParams<{ id: string }>();

  const { data: order, isLoading, isError } = useQuery({
    queryKey: ['order', id],
    queryFn: () => orderService.get(id as string),
    enabled: Boolean(id),
  });

  if (isLoading) {
    return (
      <div className="container max-w-3xl py-14">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="mt-8 h-72 w-full" />
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="container py-20">
        <EmptyState
          icon={AlertCircle}
          title="Order not found"
          description="This order does not exist, or it belongs to a different account."
          action={
            <Button asChild>
              <Link to="/orders">Back to order history</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="container max-w-3xl py-16 md:py-24">
      <Button asChild variant="ghost" size="sm" className="-ml-3 mb-8">
        <Link to="/orders">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to orders
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-eyebrow">Order</p>
          <h1 className="tabular mt-2 text-3xl sm:text-4xl">{order.orderNumber}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{formatDateTime(order.createdAt)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <OrderStatusBadge status={order.status} />
          <PaymentStatusBadge status={order.payment?.status} />
        </div>
      </div>

      {order.status === 'PENDING' ? (
        <div
          role="status"
          className="mt-6 rounded-md border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-warning"
        >
          This order is waiting for payment confirmation from Stripe. It updates automatically once
          the payment is verified.
        </div>
      ) : null}

      {order.status === 'FAILED' && order.payment?.failureReason ? (
        <div
          role="alert"
          className="mt-6 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          Payment failed: {order.payment.failureReason}
        </div>
      ) : null}

      <Card className="mt-8">
        <CardContent className="p-6">
          <h2 className="text-2xl">Items</h2>

          <ul className="mt-4 divide-y divide-border">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-center gap-4 py-4">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-secondary">
                  <ProductImage src={item.productImage} alt={item.productName} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{item.productName}</p>
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

          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="tabular">{formatMoney(order.subtotalCents, order.currency)}</dd>
            </div>
            <div className="flex justify-between text-base font-semibold">
              <dt>Total</dt>
              <dd className="tabular">{formatMoney(order.totalAmountCents, order.currency)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardContent className="p-6">
          <h2 className="text-2xl">Payment</h2>
          <dl className="mt-4 grid gap-5 sm:grid-cols-2">
            <div>
              <dt className="text-eyebrow">Method</dt>
              <dd className="mt-1.5 text-sm capitalize">{order.payment?.provider ?? 'stripe'}</dd>
            </div>
            <div>
              <dt className="text-eyebrow">Status</dt>
              <dd className="mt-1.5">
                <PaymentStatusBadge status={order.payment?.status} />
              </dd>
            </div>
            {order.payment?.paidAt ? (
              <div>
                <dt className="text-eyebrow">Paid at</dt>
                <dd className="mt-1.5 text-sm">{formatDateTime(order.payment.paidAt)}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-eyebrow">Amount</dt>
              <dd className="tabular mt-1.5 text-sm font-medium">
                {formatMoney(order.payment?.amountCents ?? order.totalAmountCents, order.currency)}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
};
