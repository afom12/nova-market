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
      {/* Hero — typographic, on the paper ground. No colour blocks. */}
      <section className="container pt-14 md:pt-20">
        <div className="flex items-baseline justify-between gap-6 border-b border-foreground/80 pb-3">
          <p className="text-eyebrow text-foreground">New season</p>
          <p className="text-eyebrow hidden sm:block">Audio · Workspace · Home</p>
        </div>

        <div className="grid gap-12 py-14 md:grid-cols-12 md:gap-8 md:py-20">
          <h1 className="text-display font-light md:col-span-9">
            Considered objects <br className="hidden sm:inline" />
            for <em className="font-light italic text-accent">daily</em> use.
          </h1>

          <div className="flex flex-col justify-end md:col-span-4 md:col-start-9 md:row-start-2 lg:col-span-3 lg:col-start-10">
            <p className="max-w-measure text-base leading-relaxed text-muted-foreground">
              A small, deliberate catalogue of audio, workspace and home pieces — chosen for how
              they hold up over years rather than seasons.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
              <Button asChild size="lg">
                <Link to="/shop">
                  Browse the catalogue
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild variant="link" className="h-auto px-0">
                <Link to="/register">Create an account</Link>
              </Button>
            </div>
          </div>

          <dl className="grid grid-cols-3 gap-6 border-t border-border pt-6 md:col-span-6 md:row-start-2 md:self-end">
            {[
              { label: 'Categories', value: '5' },
              { label: 'Avg. rating', value: '4.8' },
              { label: 'Returns', value: '30d' },
            ].map((stat) => (
              <div key={stat.label}>
                <dt className="text-eyebrow">{stat.label}</dt>
                <dd className="tabular mt-2 font-serif text-3xl font-light tracking-tightest">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Featured */}
      <section className="container py-20 md:py-28">
        <div className="grid gap-6 border-t border-border pt-6 md:grid-cols-12">
          <p className="text-eyebrow md:col-span-3">Latest additions</p>
          <div className="flex items-end justify-between gap-6 md:col-span-9">
            <h2 className="text-4xl sm:text-5xl">Recently added to the shop</h2>
            <Button asChild variant="link" className="hidden h-auto shrink-0 px-0 sm:inline-flex">
              <Link to="/shop">
                View all
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>

        <div className="mt-14 grid gap-x-8 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading
            ? Array.from({ length: 3 }, (_, index) => <ProductCardSkeleton key={index} />)
            : data?.products.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>

        <div className="mt-12 sm:hidden">
          <Button asChild variant="outline" className="w-full">
            <Link to="/shop">View all products</Link>
          </Button>
        </div>
      </section>

      {/* Guarantees — three columns divided by hairlines, no boxes. */}
      <section className="container pb-8">
        <div className="grid border-t border-border sm:grid-cols-3 sm:divide-x sm:divide-border">
          {guarantees.map((item, index) => (
            <div
              key={item.title}
              className="border-b border-border py-10 sm:border-b-0 sm:px-8 sm:first:pl-0 sm:last:pr-0"
            >
              <div className="flex items-center justify-between">
                <span className="tabular font-serif text-sm italic text-muted-foreground">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <item.icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </div>
              <h3 className="mt-6 text-2xl">{item.title}</h3>
              <p className="mt-3 max-w-measure text-sm leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
};
