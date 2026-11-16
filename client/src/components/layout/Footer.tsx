import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';

export const Footer = () => (
  <footer className="mt-20 border-t border-border bg-secondary/40">
    <div className="container grid gap-10 py-14 md:grid-cols-4">
      <div className="md:col-span-2">
        <div className="flex items-baseline gap-2">
          <span className="text-base font-bold tracking-[0.18em] text-primary">NOVA</span>
          <span className="text-base font-light tracking-[0.18em] text-muted-foreground">MARKET</span>
        </div>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
          Considered objects for daily use — audio, workspace and home pieces chosen for how they
          hold up over years, not seasons.
        </p>
        <p className="mt-5 inline-flex items-center gap-2 rounded-md bg-background px-3 py-2 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5" aria-hidden="true" />
          Payments processed by Stripe. Card details never touch our servers.
        </p>
      </div>

      <div>
        <h2 className="text-eyebrow">Shop</h2>
        <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
          <li>
            <Link to="/shop" className="transition-colors hover:text-primary">
              All products
            </Link>
          </li>
          <li>
            <Link to="/cart" className="transition-colors hover:text-primary">
              Your cart
            </Link>
          </li>
          <li>
            <Link to="/orders" className="transition-colors hover:text-primary">
              Order history
            </Link>
          </li>
        </ul>
      </div>

      <div>
        <h2 className="text-eyebrow">Account</h2>
        <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
          <li>
            <Link to="/login" className="transition-colors hover:text-primary">
              Sign in
            </Link>
          </li>
          <li>
            <Link to="/register" className="transition-colors hover:text-primary">
              Create account
            </Link>
          </li>
          <li>
            <Link to="/profile" className="transition-colors hover:text-primary">
              Profile
            </Link>
          </li>
        </ul>
      </div>
    </div>

    <div className="border-t border-border">
      <div className="container flex flex-col items-center justify-between gap-2 py-5 text-xs text-muted-foreground sm:flex-row">
        <p>&copy; {new Date().getFullYear()} NOVA MARKET. Demonstration project.</p>
        <p>Stripe test mode — no real payments are processed.</p>
      </div>
    </div>
  </footer>
);
