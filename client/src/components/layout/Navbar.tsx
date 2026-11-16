import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, LogOut, Menu, Package, ShoppingBag, User as UserIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useCartStore } from '@/store/cart.store';
import { toast } from '@/hooks/useToast';
import { cn } from '@/utils/cn';

const navLinks = [
  { to: '/', label: 'Home', end: true },
  { to: '/shop', label: 'Shop', end: false },
];

export const Navbar = () => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Selecting the derived count re-renders the badge on every cart change.
  const itemCount = useCartStore((state) => state.lines.reduce((sum, line) => sum + line.quantity, 0));

  const handleLogout = async () => {
    await logout();
    setMobileOpen(false);
    toast.success('Signed out', 'You have been signed out of NOVA MARKET.');
    navigate('/');
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'relative py-1 text-sm transition-colors hover:text-foreground',
      // Active page: ink text plus a terracotta hairline, not colour alone.
      isActive
        ? 'text-foreground after:absolute after:inset-x-0 after:-bottom-px after:h-px after:bg-accent'
        : 'text-muted-foreground',
    );

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/85 backdrop-blur-sm supports-[backdrop-filter]:bg-background/70">
      <div className="container flex h-[4.5rem] items-center justify-between gap-6">
        <Link to="/" className="flex items-baseline gap-1.5" aria-label="NOVA MARKET home">
          <span className="font-serif text-2xl tracking-tightest text-foreground">Nova</span>
          <span className="font-serif text-2xl font-light italic tracking-tightest text-muted-foreground">
            Market
          </span>
        </Link>

        <nav className="hidden items-center gap-9 md:flex" aria-label="Main">
          {navLinks.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} className={linkClass}>
              {link.label}
            </NavLink>
          ))}
          {isAuthenticated ? (
            <NavLink to="/orders" className={linkClass}>
              Orders
            </NavLink>
          ) : null}
          {isAdmin ? (
            <NavLink to="/admin" className={linkClass}>
              Admin
            </NavLink>
          ) : null}
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="icon" className="relative">
            <Link to="/cart" aria-label={`Cart, ${itemCount} item${itemCount === 1 ? '' : 's'}`}>
              <ShoppingBag className="h-5 w-5" aria-hidden="true" />
              {itemCount > 0 ? (
                <span className="tabular absolute right-0.5 top-0.5 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-medium text-accent-foreground">
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              ) : null}
            </Link>
          </Button>

          {isAuthenticated ? (
            <div className="hidden items-center gap-2 md:flex">
              <Button asChild variant="ghost" size="sm">
                <Link to="/profile">
                  <UserIcon className="h-4 w-4" aria-hidden="true" />
                  <span className="max-w-[9rem] truncate">{user?.name}</span>
                </Link>
              </Button>
              <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Sign out">
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Button asChild variant="ghost" size="sm">
                <Link to="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/register">Create account</Link>
              </Button>
            </div>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen((open) => !open)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {mobileOpen ? (
        <nav id="mobile-nav" className="border-t border-border bg-background md:hidden" aria-label="Mobile">
          <div className="container flex flex-col pb-6 pt-2">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                onClick={() => setMobileOpen(false)}
                className="border-b border-border py-3.5 font-serif text-xl text-foreground"
              >
                {link.label}
              </NavLink>
            ))}

            {isAuthenticated ? (
              <>
                <NavLink to="/orders" onClick={() => setMobileOpen(false)} className="border-b border-border py-3.5 font-serif text-xl">
                  <span className="inline-flex items-center gap-2">
                    <Package className="h-4 w-4" aria-hidden="true" /> Orders
                  </span>
                </NavLink>
                <NavLink to="/profile" onClick={() => setMobileOpen(false)} className="border-b border-border py-3.5 font-serif text-xl">
                  <span className="inline-flex items-center gap-2">
                    <UserIcon className="h-4 w-4" aria-hidden="true" /> Profile
                  </span>
                </NavLink>
                {isAdmin ? (
                  <NavLink to="/admin" onClick={() => setMobileOpen(false)} className="border-b border-border py-3.5 font-serif text-xl">
                    <span className="inline-flex items-center gap-2">
                      <LayoutDashboard className="h-4 w-4" aria-hidden="true" /> Admin
                    </span>
                  </NavLink>
                ) : null}
                <Button variant="outline" className="mt-6" onClick={handleLogout}>
                  Sign out
                </Button>
              </>
            ) : (
              <div className="mt-6 flex flex-col gap-2">
                <Button asChild variant="outline" onClick={() => setMobileOpen(false)}>
                  <Link to="/login">Sign in</Link>
                </Button>
                <Button asChild onClick={() => setMobileOpen(false)}>
                  <Link to="/register">Create account</Link>
                </Button>
              </div>
            )}
          </div>
        </nav>
      ) : null}
    </header>
  );
};
