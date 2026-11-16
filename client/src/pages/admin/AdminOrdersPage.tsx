import { useState } from 'react';
import { Link } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ChevronRight, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/shop/StatusBadge';
import { PaginationControls } from '@/components/shop/PaginationControls';
import { orderService } from '@/services/order.service';
import { formatDate, formatMoney } from '@/utils/format';
import type { OrderStatus } from '@/types';

const STATUS_OPTIONS: Array<{ value: OrderStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'PAID', label: 'Paid' },
  { value: 'PENDING', label: 'Awaiting payment' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'REFUNDED', label: 'Refunded' },
];

export const AdminOrdersPage = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<OrderStatus | 'ALL'>('ALL');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'orders', { page, search, status }],
    queryFn: () =>
      orderService.adminList({
        page,
        limit: 15,
        search: search || undefined,
        status: status === 'ALL' ? undefined : status,
      }),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold sm:text-3xl">Orders</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Every order and its verified payment state.
        </p>
      </header>

      <Card>
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Label htmlFor="order-search" className="mb-1.5 block">
              Search
            </Label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="order-search"
                type="search"
                placeholder="Order number, customer or session id"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
          </div>

          <div className="sm:w-56">
            <Label htmlFor="order-status" className="mb-1.5 block">
              Status
            </Label>
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value as OrderStatus | 'ALL');
                setPage(1);
              }}
            >
              <SelectTrigger id="order-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="px-0 py-0">
          {isLoading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 6 }, (_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : data && data.orders.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Order status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="tabular font-medium">{order.orderNumber}</TableCell>
                    <TableCell>
                      <span className="block max-w-[13rem] truncate">{order.user.name}</span>
                      <span className="block max-w-[13rem] truncate text-xs text-muted-foreground">
                        {order.user.email}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDate(order.createdAt)}
                    </TableCell>
                    <TableCell>
                      <OrderStatusBadge status={order.status} />
                    </TableCell>
                    <TableCell>
                      <PaymentStatusBadge status={order.payment?.status} />
                    </TableCell>
                    <TableCell className="tabular text-right font-medium">
                      {formatMoney(order.totalAmountCents, order.currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="icon" aria-label={`Open ${order.orderNumber}`}>
                        <Link to={`/admin/orders/${order.id}`}>
                          <ChevronRight className="h-4 w-4" aria-hidden="true" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="p-8 text-center text-sm text-muted-foreground">
              No orders match these filters.
            </p>
          )}
        </CardContent>
      </Card>

      {data ? (
        <PaginationControls pagination={data.pagination} onPageChange={setPage} label="orders" />
      ) : null}
    </div>
  );
};
