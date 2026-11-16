import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export const NotFoundPage = () => (
  <div className="container flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
    <p className="tabular text-6xl font-semibold tracking-tightest text-primary/15 sm:text-7xl">404</p>
    <h1 className="mt-4 text-3xl sm:text-4xl">This page does not exist</h1>
    <p className="mt-3 max-w-md text-base leading-relaxed text-muted-foreground">
      The link may be out of date, or the product may have been removed from the catalogue.
    </p>
    <div className="mt-8 flex flex-wrap justify-center gap-3">
      <Button asChild>
        <Link to="/">Back to home</Link>
      </Button>
      <Button asChild variant="outline">
        <Link to="/shop">Browse the shop</Link>
      </Button>
    </div>
  </div>
);
