import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LogOut, Package, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/useToast';
import { orderService } from '@/services/order.service';
import { formatDate, formatMoney } from '@/utils/format';

export const ProfilePage = () => {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ['orders', { page: 1, summary: true }],
    queryFn: () => orderService.list({ page: 1, limit: 100 }),
  });

  const paidOrders = data?.orders.filter((order) => order.status === 'PAID') ?? [];
  const lifetimeSpendCents = paidOrders.reduce((total, order) => total + order.totalAmountCents, 0);

  const handleLogout = async () => {
    await logout();
    toast.success('Signed out', 'You have been signed out of NOVA MARKET.');
    navigate('/');
  };

  if (!user) return null;

  return (
    <div className="container max-w-3xl py-12 md:py-16">
      <header>
        <p className="text-eyebrow">Your account</p>
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Profile</h1>
      </header>

      <Card className="mt-9">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">{user.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
            </div>
            <Badge tone={isAdmin ? 'info' : 'neutral'}>
              {isAdmin ? (
                <>
                  <ShieldCheck className="mr-1 h-3 w-3" aria-hidden="true" />
                  Administrator
                </>
              ) : (
                'Customer'
              )}
            </Badge>
          </div>

          <Separator className="my-6" />

          <dl className="grid gap-6 sm:grid-cols-3">
            <div>
              <dt className="text-eyebrow">Member since</dt>
              <dd className="mt-1.5 text-sm font-medium">{formatDate(user.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-eyebrow">Paid orders</dt>
              <dd className="tabular mt-1.5 text-sm font-medium">{paidOrders.length}</dd>
            </div>
            <div>
              <dt className="text-eyebrow">Lifetime spend</dt>
              <dd className="tabular mt-1.5 text-sm font-medium">
                {formatMoney(lifetimeSpendCents, paidOrders[0]?.currency ?? 'usd')}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link to="/orders">
            <Package className="h-4 w-4" aria-hidden="true" />
            Order history
          </Link>
        </Button>
        {isAdmin ? (
          <Button asChild variant="outline">
            <Link to="/admin">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Admin dashboard
            </Link>
          </Button>
        ) : null}
        <Button variant="ghost" onClick={handleLogout}>
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Sign out
        </Button>
      </div>
    </div>
  );
};
