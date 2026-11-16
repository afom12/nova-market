import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { PackageSearch, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ProductCard, ProductCardSkeleton } from '@/components/shop/ProductCard';
import { EmptyState } from '@/components/shop/EmptyState';
import { PaginationControls } from '@/components/shop/PaginationControls';
import { productService, type ProductQuery } from '@/services/product.service';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'name_asc', label: 'Name: A to Z' },
] as const;

const ALL_CATEGORIES = '__all__';

export const ShopPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const page = Number(searchParams.get('page') ?? 1);
  const category = searchParams.get('category') ?? '';
  const sort = (searchParams.get('sort') ?? 'newest') as ProductQuery['sort'];
  const search = searchParams.get('search') ?? '';

  const [searchInput, setSearchInput] = useState(search);

  // Debounce so typing does not fire a request per keystroke.
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (searchInput === search) return;
      setSearchParams((params) => {
        const next = new URLSearchParams(params);
        if (searchInput) next.set('search', searchInput);
        else next.delete('search');
        next.delete('page');
        return next;
      });
    }, 350);

    return () => clearTimeout(timeout);
  }, [searchInput, search, setSearchParams]);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: productService.categories,
    staleTime: 10 * 60 * 1000,
  });

  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ['products', { page, category, sort, search }],
    queryFn: () =>
      productService.list({ page, limit: 9, category: category || undefined, sort, search: search || undefined }),
    // Keeps the previous page visible while the next one loads, instead of
    // collapsing the grid to skeletons on every page change.
    placeholderData: keepPreviousData,
  });

  const updateParam = (key: string, value: string | null) => {
    setSearchParams((params) => {
      const next = new URLSearchParams(params);
      if (value) next.set(key, value);
      else next.delete(key);
      if (key !== 'page') next.delete('page');
      return next;
    });
  };

  const hasFilters = Boolean(category || search);

  return (
    <div className="container py-12 md:py-16">
      <header className="max-w-2xl">
        <p className="text-eyebrow">Catalogue</p>
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Shop all products</h1>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          Six considered pieces across audio, workspace, lighting and home.
        </p>
      </header>

      {/* Filters */}
      <div className="mt-10 flex flex-col gap-4 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Label htmlFor="product-search" className="mb-1.5 block">
            Search
          </Label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="product-search"
              type="search"
              placeholder="Search products"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="sm:w-48">
          <Label htmlFor="category-filter" className="mb-1.5 block">
            Category
          </Label>
          <Select
            value={category || ALL_CATEGORIES}
            onValueChange={(value) => updateParam('category', value === ALL_CATEGORIES ? null : value)}
          >
            <SelectTrigger id="category-filter">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_CATEGORIES}>All categories</SelectItem>
              {categories?.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="sm:w-52">
          <Label htmlFor="sort-filter" className="mb-1.5 block">
            Sort by
          </Label>
          <Select value={sort} onValueChange={(value) => updateParam('sort', value)}>
            <SelectTrigger id="sort-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {hasFilters ? (
          <Button
            variant="ghost"
            onClick={() => {
              setSearchInput('');
              setSearchParams(new URLSearchParams());
            }}
          >
            <X className="h-4 w-4" aria-hidden="true" />
            Clear
          </Button>
        ) : null}
      </div>

      {/* Results */}
      <div className="mt-10" aria-busy={isFetching}>
        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <ProductCardSkeleton key={index} />
            ))}
          </div>
        ) : isError ? (
          <EmptyState
            icon={PackageSearch}
            title="Could not load products"
            description={error instanceof Error ? error.message : 'Please try again in a moment.'}
            action={
              <Button onClick={() => window.location.reload()} variant="outline">
                Retry
              </Button>
            }
          />
        ) : data && data.products.length > 0 ? (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {data.products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            <PaginationControls
              pagination={data.pagination}
              onPageChange={(nextPage) => updateParam('page', String(nextPage))}
              label="products"
            />
          </>
        ) : (
          <EmptyState
            icon={PackageSearch}
            title="No products match those filters"
            description="Try a different search term or clear the filters to see the full catalogue."
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setSearchInput('');
                  setSearchParams(new URLSearchParams());
                }}
              >
                Clear filters
              </Button>
            }
          />
        )}
      </div>
    </div>
  );
};
