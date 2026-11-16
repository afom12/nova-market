import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { StoreLayout } from '@/layouts/StoreLayout';
import { AdminLayout } from '@/layouts/AdminLayout';
import { AdminRoute, GuestRoute, ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { ScrollToTop } from '@/components/layout/ScrollToTop';
import { HomePage } from '@/pages/HomePage';
import { ShopPage } from '@/pages/ShopPage';
import { ProductDetailsPage } from '@/pages/ProductDetailsPage';
import { CartPage } from '@/pages/CartPage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

// Admin bundles are only fetched once an admin actually navigates there,
// keeping the storefront payload small for ordinary shoppers.
const AdminDashboardPage = lazy(() =>
  import('@/pages/admin/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })),
);
const AdminProductsPage = lazy(() =>
  import('@/pages/admin/AdminProductsPage').then((m) => ({ default: m.AdminProductsPage })),
);
const AdminProductFormPage = lazy(() =>
  import('@/pages/admin/AdminProductFormPage').then((m) => ({ default: m.AdminProductFormPage })),
);
const AdminOrdersPage = lazy(() =>
  import('@/pages/admin/AdminOrdersPage').then((m) => ({ default: m.AdminOrdersPage })),
);
const AdminOrderDetailsPage = lazy(() =>
  import('@/pages/admin/AdminOrderDetailsPage').then((m) => ({ default: m.AdminOrderDetailsPage })),
);

const CheckoutSuccessPage = lazy(() =>
  import('@/pages/CheckoutSuccessPage').then((m) => ({ default: m.CheckoutSuccessPage })),
);
const CheckoutCancelPage = lazy(() =>
  import('@/pages/CheckoutCancelPage').then((m) => ({ default: m.CheckoutCancelPage })),
);
const OrdersPage = lazy(() => import('@/pages/OrdersPage').then((m) => ({ default: m.OrdersPage })));
const OrderDetailsPage = lazy(() =>
  import('@/pages/OrderDetailsPage').then((m) => ({ default: m.OrderDetailsPage })),
);
const ProfilePage = lazy(() =>
  import('@/pages/ProfilePage').then((m) => ({ default: m.ProfilePage })),
);

const RouteFallback = () => (
  <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-live="polite">
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
    <span className="sr-only">Loading page</span>
  </div>
);

export const App = () => (
  <>
    <ScrollToTop />
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route element={<StoreLayout />}>
          <Route index element={<HomePage />} />
          <Route path="shop" element={<ShopPage />} />
          <Route path="products/:slug" element={<ProductDetailsPage />} />
          <Route path="cart" element={<CartPage />} />
          <Route path="checkout/cancel" element={<CheckoutCancelPage />} />

          <Route element={<GuestRoute />}>
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route path="checkout/success" element={<CheckoutSuccessPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="orders/:id" element={<OrderDetailsPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Route>

        <Route element={<AdminRoute />}>
          <Route path="admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="products" element={<AdminProductsPage />} />
            <Route path="products/new" element={<AdminProductFormPage mode="create" />} />
            <Route path="products/:id/edit" element={<AdminProductFormPage mode="edit" />} />
            <Route path="orders" element={<AdminOrdersPage />} />
            <Route path="orders/:id" element={<AdminOrderDetailsPage />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  </>
);
