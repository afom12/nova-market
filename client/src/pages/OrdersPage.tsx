import { useState } from 'react';
import { Link } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ChevronRight, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shop/EmptyState';
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/shop/StatusBadge';
import { PaginationControls } from '@/components/shop/PaginationControls';
import { orderService } from '@/services/order.service';
import { formatDate, formatMoney } from '@/utils/format';

export const OrdersPage = () => {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['orders', { page }],
    queryFn: () => orderService.list({ page, limit: 10 }),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="container py-16 md:py-24">
      <header className="max-w-2xl">
        <p className="text-eyebrow">Your account</p>
        <h1 className="mt-2 text-4xl sm:text-5xl">Order history</h1>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          Every order placed with this account, with its live payment status.
        </p>
      </header>

      <div className="mt-10">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-32 w-full" />
            ))}
          </div>
        ) : data && data.orders.length > 0 ? (
          <>
            <ul className="space-y-4">
              {data.orders.map((order) => (
                <li key={order.id}>
                  <Card className="transition-shadow hover:shadow-lift">
                    <CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="tabular text-sm font-semibold">{order.orderNumber}</span>
                          <OrderStatusBadge status={order.status} />
                          <PaymentStatusBadge status={order.payment?.status} />
                        </div>

                        <p className="mt-2 text-sm text-muted-foreground">
                          {formatDate(order.createdAt)} ·{' '}
                          {order.items.length} item{order.items.length === 1 ? '' : 's'}
                        </p>

                        <p className="mt-1.5 truncate text-sm text-muted-foreground">
                          {order.items.map((item) => `${item.quantity}× ${item.productName}`).join(', ')}
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-5 sm:justify-end">
                        <span className="tabular text-lg font-semibold">
                          {formatMoney(order.totalAmountCents, order.currency)}
                        </span>
                        <Button asChild variant="outline" size="sm">
                          <Link to={`/orders/${order.id}`}>
                            Details
                            <ChevronRight className="h-4 w-4" aria-hidden="true" />
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>

            <PaginationControls pagination={data.pagination} onPageChange={setPage} label="orders" />
          </>
        ) : (
          <EmptyState
            icon={Package}
            title="No orders yet"
            description="Once you complete a purchase it will appear here, with its payment status and a full receipt."
            action={
              <Button asChild>
                <Link to="/shop">Browse the shop</Link>
              </Button>
            }
          />
        )}
      </div>
    </div>
  );
};
