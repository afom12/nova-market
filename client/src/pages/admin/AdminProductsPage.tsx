import { useState } from 'react';
import { Link } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PaginationControls } from '@/components/shop/PaginationControls';
import { ProductImage } from '@/components/shop/ProductImage';
import { productService } from '@/services/product.service';
import { toast } from '@/hooks/useToast';
import { formatMoney } from '@/utils/format';
import type { Product } from '@/types';

export const AdminProductsPage = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [pendingDelete, setPendingDelete] = useState<Product | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'products', { page, search, status }],
    queryFn: () => productService.adminList({ page, limit: 10, search: search || undefined, status }),
    placeholderData: keepPreviousData,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => productService.adminDelete(id),
    onSuccess: async (result) => {
      // The server archives rather than deletes when a product has orders,
      // so the message reflects what actually happened.
      toast.success(result.archived ? 'Product archived' : 'Product deleted', result.message);
      setPendingDelete(null);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      await queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error) => {
      toast.error('Could not remove product', error instanceof Error ? error.message : undefined);
    },
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">Products</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Create, edit and retire catalogue items.
          </p>
        </div>
        <Button asChild>
          <Link to="/admin/products/new">
            <Plus className="h-4 w-4" aria-hidden="true" />
            New product
          </Link>
        </Button>
      </header>

      <Card>
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Label htmlFor="admin-product-search" className="mb-1.5 block">
              Search
            </Label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="admin-product-search"
                type="search"
                placeholder="Name, slug or category"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
          </div>

          <div className="sm:w-44">
            <Label htmlFor="admin-product-status" className="mb-1.5 block">
              Status
            </Label>
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value as typeof status);
                setPage(1);
              }}
            >
              <SelectTrigger id="admin-product-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All products</SelectItem>
                <SelectItem value="active">Active only</SelectItem>
                <SelectItem value="inactive">Archived only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="px-0 py-0">
          {isLoading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 5 }, (_, index) => (
                <Skeleton key={index} className="h-14 w-full" />
              ))}
            </div>
          ) : data && data.products.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-secondary">
                          <ProductImage src={product.imageUrl} alt="" />
                        </div>
                        <div className="min-w-0">
                          <p className="max-w-[16rem] truncate font-medium">{product.name}</p>
                          <p className="max-w-[16rem] truncate text-xs text-muted-foreground">
                            {product.slug}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{product.category}</TableCell>
                    <TableCell className="tabular text-right font-medium">
                      {formatMoney(product.priceCents, product.currency)}
                    </TableCell>
                    <TableCell className="tabular text-right">
                      <span className={product.stock <= 5 ? 'font-medium text-warning' : undefined}>
                        {product.stock}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge tone={product.isActive ? 'success' : 'neutral'}>
                        {product.isActive ? 'Active' : 'Archived'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button asChild variant="ghost" size="icon" aria-label={`Edit ${product.name}`}>
                          <Link to={`/admin/products/${product.id}/edit`}>
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Delete ${product.name}`}
                          onClick={() => setPendingDelete(product)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="p-8 text-center text-sm text-muted-foreground">
              No products match these filters.
            </p>
          )}
        </CardContent>
      </Card>

      {data ? (
        <PaginationControls pagination={data.pagination} onPageChange={setPage} label="products" />
      ) : null}

      <Dialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove “{pendingDelete?.name}”?</DialogTitle>
            <DialogDescription>
              If this product appears in any past order it is archived rather than deleted, so order
              history stays intact. Otherwise it is permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              loading={deleteMutation.isPending}
              onClick={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
            >
              Remove product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
