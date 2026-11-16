import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { productService } from '@/services/product.service';
import { toast } from '@/hooks/useToast';
import { productFormSchema, type ProductFormValues } from '@/schemas/product.schema';
import { centsToDollarString, dollarsToCents } from '@/utils/money';

interface AdminProductFormPageProps {
  mode: 'create' | 'edit';
}

export const AdminProductFormPage = ({ mode }: AdminProductFormPageProps) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = mode === 'edit';

  const { data: product, isLoading } = useQuery({
    queryKey: ['admin', 'product', id],
    queryFn: () => productService.adminGet(id as string),
    enabled: isEdit && Boolean(id),
  });

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: '',
      description: '',
      price: '',
      currency: 'usd',
      imageUrl: '',
      category: '',
      stock: 0,
      isActive: true,
    },
  });

  // Populate the form once the product arrives.
  useEffect(() => {
    if (!product) return;
    reset({
      name: product.name,
      description: product.description,
      price: centsToDollarString(product.priceCents),
      currency: product.currency,
      imageUrl: product.imageUrl,
      category: product.category,
      stock: product.stock,
      isActive: product.isActive,
    });
  }, [product, reset]);

  const mutation = useMutation({
    mutationFn: (values: ProductFormValues) => {
      const payload = {
        name: values.name,
        description: values.description,
        // String -> integer cents, without ever touching a float.
        priceCents: dollarsToCents(values.price),
        currency: values.currency,
        imageUrl: values.imageUrl,
        category: values.category,
        stock: values.stock,
        isActive: values.isActive,
      };

      return isEdit && id
        ? productService.adminUpdate(id, payload)
        : productService.adminCreate(payload);
    },
    onSuccess: async (saved) => {
      toast.success(isEdit ? 'Product updated' : 'Product created', `“${saved.name}” has been saved.`);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      navigate('/admin/products');
    },
    onError: (error) => {
      setError('root', {
        message: error instanceof Error ? error.message : 'Could not save the product.',
      });
    },
  });

  if (isEdit && isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-3">
        <Link to="/admin/products">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to products
        </Link>
      </Button>

      <header>
        <h1 className="text-2xl font-semibold sm:text-3xl">
          {isEdit ? 'Edit product' : 'New product'}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The slug is generated from the name automatically.
        </p>
      </header>

      <Card>
        <CardContent className="p-6">
          <form
            onSubmit={handleSubmit((values) => mutation.mutate(values))}
            noValidate
            className="space-y-5"
          >
            {errors.root ? (
              <div
                role="alert"
                className="rounded-md border border-destructive/30 bg-destructive/5 px-3.5 py-3 text-sm text-destructive"
              >
                {errors.root.message}
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" aria-invalid={Boolean(errors.name)} {...register('name')} />
              {errors.name ? <p className="text-sm text-destructive">{errors.name.message}</p> : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                aria-invalid={Boolean(errors.description)}
                {...register('description')}
              />
              {errors.description ? (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              ) : null}
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="price">Price</Label>
                <Input
                  id="price"
                  inputMode="decimal"
                  placeholder="249.99"
                  aria-invalid={Boolean(errors.price)}
                  aria-describedby="price-hint"
                  {...register('price')}
                />
                {errors.price ? (
                  <p className="text-sm text-destructive">{errors.price.message}</p>
                ) : (
                  <p id="price-hint" className="text-xs text-muted-foreground">
                    Stored as integer minor units (249.99 → 24999 cents).
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Input id="currency" maxLength={3} aria-invalid={Boolean(errors.currency)} {...register('currency')} />
                {errors.currency ? (
                  <p className="text-sm text-destructive">{errors.currency.message}</p>
                ) : null}
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input id="category" aria-invalid={Boolean(errors.category)} {...register('category')} />
                {errors.category ? (
                  <p className="text-sm text-destructive">{errors.category.message}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="stock">Stock</Label>
                <Input
                  id="stock"
                  type="number"
                  min={0}
                  step={1}
                  aria-invalid={Boolean(errors.stock)}
                  {...register('stock')}
                />
                {errors.stock ? (
                  <p className="text-sm text-destructive">{errors.stock.message}</p>
                ) : null}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="imageUrl">Image URL</Label>
              <Input
                id="imageUrl"
                placeholder="/products/example.svg or https://cdn.example.com/image.jpg"
                aria-invalid={Boolean(errors.imageUrl)}
                {...register('imageUrl')}
              />
              {errors.imageUrl ? (
                <p className="text-sm text-destructive">{errors.imageUrl.message}</p>
              ) : null}
            </div>

            <div className="flex items-center gap-3 rounded-md border border-border p-4">
              <input
                id="isActive"
                type="checkbox"
                className="h-4 w-4 rounded border-input accent-primary"
                {...register('isActive')}
              />
              <div>
                <Label htmlFor="isActive">Visible in the storefront</Label>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Inactive products are hidden from customers and cannot be purchased.
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" loading={isSubmitting || mutation.isPending}>
                {isEdit ? 'Save changes' : 'Create product'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/admin/products')}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
