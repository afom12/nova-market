import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Package, ReceiptText, Store } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { cn } from '@/utils/cn';

const adminLinks = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/products', label: 'Products', icon: Package, end: false },
  { to: '/admin/orders', label: 'Orders', icon: ReceiptText, end: false },
];

export const AdminLayout = () => (
  <div className="flex min-h-screen flex-col bg-secondary/30">
    <Navbar />

    <div className="container flex flex-1 flex-col gap-8 py-8 lg:flex-row">
      <aside className="lg:w-60 lg:shrink-0" aria-label="Admin navigation">
        <p className="text-eyebrow mb-3">Administration</p>
        <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
          {adminLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                cn(
                  'inline-flex items-center gap-2.5 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-background hover:text-foreground',
                )
              }
            >
              <link.icon className="h-4 w-4" aria-hidden="true" />
              {link.label}
            </NavLink>
          ))}

          <NavLink
            to="/shop"
            className="inline-flex items-center gap-2.5 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-background hover:text-foreground lg:mt-4"
          >
            <Store className="h-4 w-4" aria-hidden="true" />
            View storefront
          </NavLink>
        </nav>
      </aside>

      <main id="main" className="min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  </div>
);
