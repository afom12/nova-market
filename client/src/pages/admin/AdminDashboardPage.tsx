import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ChevronRight,
  CircleDollarSign,
  Package,
  ReceiptText,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { OrderStatusBadge } from '@/components/shop/StatusBadge';
import { RevenueChart } from '@/components/admin/RevenueChart';
import { StatTile } from '@/components/admin/StatTile';
import { adminService } from '@/services/admin.service';
import { formatDate, formatMoney } from '@/utils/format';

export const AdminDashboardPage = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => adminService.stats(14),
  });

  if (isLoading || !stats) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-56" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  const currency = stats.recentPurchases[0]?.currency ?? 'usd';

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl sm:text-4xl">Dashboard</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Revenue counts verified, successfully paid orders only.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Key figures">
        <StatTile
          label="Successful revenue"
          value={formatMoney(stats.successfulRevenueCents, currency)}
          hint={`${stats.paidOrders} paid order${stats.paidOrders === 1 ? '' : 's'}`}
          icon={CircleDollarSign}
          emphasis
        />
        <StatTile
          label="Total orders"
          value={String(stats.totalOrders)}
          hint={`Avg. ${formatMoney(stats.averageOrderValueCents, currency)} per paid order`}
          icon={ReceiptText}
        />
        <StatTile
          label="Customers"
          value={String(stats.totalCustomers)}
          hint="Registered customer accounts"
          icon={Users}
        />
        <StatTile
          label="Active products"
          value={`${stats.activeProducts}/${stats.totalProducts}`}
          hint={
            stats.lowStockProducts > 0
              ? `${stats.lowStockProducts} low on stock`
              : 'All products well stocked'
          }
          icon={Package}
        />
      </section>

      {stats.lowStockProducts > 0 ? (
        <div
          role="status"
          className="flex items-start gap-3 rounded-md border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-warning"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            {stats.lowStockProducts} active product{stats.lowStockProducts === 1 ? ' has' : 's have'}{' '}
            five units or fewer left.{' '}
            <Link to="/admin/products" className="font-medium underline">
              Review stock
            </Link>
          </span>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue — last 14 days</CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueChart data={stats.revenueOverview} currency={currency} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payments by status</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3.5 text-sm">
              {[
                { label: 'Succeeded', value: stats.payments.successful },
                { label: 'Pending', value: stats.payments.pending },
                { label: 'Processing', value: stats.payments.processing },
                { label: 'Failed', value: stats.payments.failed },
                { label: 'Expired', value: stats.payments.expired },
                { label: 'Cancelled', value: stats.payments.cancelled },
                { label: 'Refunded', value: stats.payments.refunded },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between">
                  <dt className="text-muted-foreground">{row.label}</dt>
                  <dd className="tabular font-medium">{row.value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Recent purchases</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link to="/admin/orders">
              All orders
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {stats.recentPurchases.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">No paid orders yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recentPurchases.map((purchase) => (
                  <TableRow key={purchase.id}>
                    <TableCell className="tabular font-medium">
                      <Link to={`/admin/orders/${purchase.id}`} className="hover:text-primary">
                        {purchase.orderNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <span className="block max-w-[14rem] truncate">{purchase.customer.name}</span>
                      <span className="block max-w-[14rem] truncate text-xs text-muted-foreground">
                        {purchase.customer.email}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDate(purchase.createdAt)}
                    </TableCell>
                    <TableCell>
                      <OrderStatusBadge status={purchase.status} />
                    </TableCell>
                    <TableCell className="tabular text-right font-medium">
                      {formatMoney(purchase.totalAmountCents, purchase.currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
