import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, PackageCheck, ShieldCheck, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductCard, ProductCardSkeleton } from '@/components/shop/ProductCard';
import { productService } from '@/services/product.service';

const guarantees = [
  {
    icon: ShieldCheck,
    title: 'Secure checkout',
    description: 'Payments are handled by Stripe. Card details never reach our servers.',
  },
  {
    icon: PackageCheck,
    title: 'Chosen, not stocked',
    description: 'Every item is selected for materials, repairability and how it ages.',
  },
  {
    icon: Truck,
    title: 'Tracked delivery',
    description: 'Orders ship within two working days with tracking from dispatch.',
  },
];

export const HomePage = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['products', { featured: true }],
    queryFn: () => productService.list({ limit: 3, sort: 'newest' }),
  });

  return (
    <>
      {/* Hero */}
      <section className="border-b border-border bg-primary text-primary-foreground">
        <div className="container grid gap-10 py-20 md:grid-cols-12 md:py-28">
          <div className="md:col-span-7 lg:col-span-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-foreground/60">
              New season
            </p>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.08] tracking-tightest text-primary-foreground sm:text-5xl lg:text-6xl">
              Considered objects for daily use.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-primary-foreground/70">
              A small, deliberate catalogue of audio, workspace and home pieces — chosen for how
              they hold up over years rather than seasons.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button asChild size="lg" variant="accent">
                <Link to="/shop">
                  Browse the catalogue
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-primary-foreground/25 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              >
                <Link to="/register">Create an account</Link>
              </Button>
            </div>
          </div>

          <div className="hidden md:col-span-5 md:flex md:items-end lg:col-span-6 lg:justify-end">
            <dl className="grid w-full grid-cols-3 gap-6 border-t border-primary-foreground/15 pt-6 lg:max-w-md">
              {[
                { label: 'Categories', value: '5' },
                { label: 'Avg. rating', value: '4.8' },
                { label: 'Returns', value: '30d' },
              ].map((stat) => (
                <div key={stat.label}>
                  <dt className="text-xs uppercase tracking-wider text-primary-foreground/50">
                    {stat.label}
                  </dt>
                  <dd className="tabular mt-1.5 text-2xl font-semibold">{stat.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* Featured */}
      <section className="container py-16 md:py-20">
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="text-eyebrow">Latest additions</p>
            <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">Recently added to the shop</h2>
          </div>
          <Button asChild variant="link" className="hidden shrink-0 sm:inline-flex">
            <Link to="/shop">
              View all
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>

        <div className="mt-9 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading
            ? Array.from({ length: 3 }, (_, index) => <ProductCardSkeleton key={index} />)
            : data?.products.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>

        <div className="mt-10 sm:hidden">
          <Button asChild variant="outline" className="w-full">
            <Link to="/shop">View all products</Link>
          </Button>
        </div>
      </section>

      {/* Guarantees */}
      <section className="border-t border-border bg-secondary/40">
        <div className="container grid gap-10 py-16 sm:grid-cols-3">
          {guarantees.map((item) => (
            <div key={item.title}>
              <item.icon className="h-5 w-5 text-primary" aria-hidden="true" />
              <h3 className="mt-4 text-base font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
};
