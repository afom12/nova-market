import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shop/EmptyState';
import { ProductImage } from '@/components/shop/ProductImage';
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/shop/StatusBadge';
import { orderService } from '@/services/order.service';
import { formatDateTime, formatMoney } from '@/utils/format';

/** Read-only by design: order state is owned by verified Stripe events. */
export const AdminOrderDetailsPage = () => {
  const { id } = useParams<{ id: string }>();

  const { data: order, isLoading, isError } = useQuery({
    queryKey: ['admin', 'order', id],
    queryFn: () => orderService.adminGet(id as string),
    enabled: Boolean(id),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (isError || !order) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Order not found"
        description="This order does not exist."
        action={
          <Button asChild>
            <Link to="/admin/orders">Back to orders</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-3">
        <Link to="/admin/orders">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to orders
        </Link>
      </Button>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-eyebrow">Order</p>
          <h1 className="tabular mt-2 text-3xl sm:text-4xl">{order.orderNumber}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{formatDateTime(order.createdAt)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <OrderStatusBadge status={order.status} />
          <PaymentStatusBadge status={order.payment?.status} />
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Customer</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-5 sm:grid-cols-2 text-sm">
            <div>
              <dt className="text-eyebrow">Name</dt>
              <dd className="mt-1.5 font-medium">{order.user.name}</dd>
            </div>
            <div>
              <dt className="text-eyebrow">Email</dt>
              <dd className="mt-1.5 break-all">{order.user.email}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-border">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-center gap-4 py-4 first:pt-0">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-secondary">
                  <ProductImage src={item.productImage} alt="" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.productName}</p>
                  <p className="tabular mt-0.5 text-sm text-muted-foreground">
                    {item.quantity} × {formatMoney(item.unitPriceCents, order.currency)}
                  </p>
                  {!item.productId ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Original product has since been deleted — snapshot retained.
                    </p>
                  ) : null}
                </div>
                <p className="tabular text-sm font-semibold">
                  {formatMoney(item.subtotalCents, order.currency)}
                </p>
              </li>
            ))}
          </ul>

          <Separator className="my-5" />

          <div className="flex items-baseline justify-between">
            <span className="font-semibold">Total</span>
            <span className="tabular text-lg font-semibold">
              {formatMoney(order.totalAmountCents, order.currency)}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stripe references</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-4 text-sm">
            <div>
              <dt className="text-eyebrow">Checkout Session</dt>
              <dd className="mt-1.5 break-all font-mono text-xs">
                {order.stripeCheckoutSessionId ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="text-eyebrow">Payment Intent</dt>
              <dd className="mt-1.5 break-all font-mono text-xs">
                {order.stripePaymentIntentId ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="text-eyebrow">Paid at</dt>
              <dd className="mt-1.5">
                {order.payment?.paidAt ? formatDateTime(order.payment.paidAt) : 'Not paid'}
              </dd>
            </div>
            {order.payment?.failureReason ? (
              <div>
                <dt className="text-eyebrow">Failure reason</dt>
                <dd className="mt-1.5 text-destructive">{order.payment.failureReason}</dd>
              </div>
            ) : null}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
};
