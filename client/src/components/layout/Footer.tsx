import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';

const linkClass =
  'text-muted-foreground underline-offset-[6px] transition-colors hover:text-foreground hover:underline hover:decoration-accent';

export const Footer = () => (
  <footer className="mt-28 md:mt-36">
    <div className="container">
      <div className="grid gap-12 border-t border-foreground/80 pt-12 pb-16 md:grid-cols-12">
        <div className="md:col-span-6">
          <div className="flex items-baseline gap-1.5">
            <span className="font-serif text-4xl tracking-tightest text-foreground">Nova</span>
            <span className="font-serif text-4xl font-light italic tracking-tightest text-muted-foreground">
              Market
            </span>
          </div>
          <p className="mt-5 max-w-measure text-sm leading-relaxed text-muted-foreground">
            Considered objects for daily use — audio, workspace and home pieces chosen for how they
            hold up over years, not seasons.
          </p>
          <p className="mt-8 inline-flex items-center gap-2.5 border-t border-border pt-4 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5" aria-hidden="true" />
            Payments processed by Stripe. Card details never touch our servers.
          </p>
        </div>

        <div className="md:col-span-3">
          <h2 className="border-b border-border pb-3 text-xl">Shop</h2>
          <ul className="mt-4 space-y-3 text-sm">
            <li>
              <Link to="/shop" className={linkClass}>
                All products
              </Link>
            </li>
            <li>
              <Link to="/cart" className={linkClass}>
                Your cart
              </Link>
            </li>
            <li>
              <Link to="/orders" className={linkClass}>
                Order history
              </Link>
            </li>
          </ul>
        </div>

        <div className="md:col-span-3">
          <h2 className="border-b border-border pb-3 text-xl">Account</h2>
          <ul className="mt-4 space-y-3 text-sm">
            <li>
              <Link to="/login" className={linkClass}>
                Sign in
              </Link>
            </li>
            <li>
              <Link to="/register" className={linkClass}>
                Create account
              </Link>
            </li>
            <li>
              <Link to="/profile" className={linkClass}>
                Profile
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="flex flex-col justify-between gap-2 border-t border-border py-6 text-xs text-muted-foreground sm:flex-row">
        <p>&copy; {new Date().getFullYear()} NOVA MARKET. Demonstration project.</p>
        <p>Stripe test mode — no real payments are processed.</p>
      </div>
    </div>
  </footer>
);
