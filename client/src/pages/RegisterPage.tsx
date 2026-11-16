import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/useToast';
import { ApiError } from '@/services/api';
import { registerFormSchema, type RegisterFormValues } from '@/schemas/auth.schema';

export const RegisterPage = () => {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    try {
      // confirmPassword is a client-side concern only; it is not sent.
      const user = await registerUser({
        name: values.name,
        email: values.email,
        password: values.password,
      });
      toast.success('Account created', `Welcome to NOVA MARKET, ${user.name}.`);
      navigate('/', { replace: true });
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setError('email', { message: 'An account with this email already exists.' });
        return;
      }
      setError('root', {
        message: error instanceof Error ? error.message : 'Could not create your account.',
      });
    }
  };

  return (
    <div className="container flex justify-center py-16 md:py-24">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Create your account</CardTitle>
          <CardDescription>Track orders and check out in a few clicks.</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            {errors.root ? (
              <div
                role="alert"
                className="rounded-md border border-destructive/30 bg-destructive/5 px-3.5 py-3 text-sm text-destructive"
              >
                {errors.root.message}
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                autoComplete="name"
                placeholder="Ada Lovelace"
                aria-invalid={Boolean(errors.name)}
                {...register('name')}
              />
              {errors.name ? <p className="text-sm text-destructive">{errors.name.message}</p> : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                aria-invalid={Boolean(errors.email)}
                {...register('email')}
              />
              {errors.email ? <p className="text-sm text-destructive">{errors.email.message}</p> : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                aria-invalid={Boolean(errors.password)}
                aria-describedby="password-hint"
                {...register('password')}
              />
              {errors.password ? (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              ) : (
                <p id="password-hint" className="text-xs text-muted-foreground">
                  At least 8 characters, with an uppercase letter, a lowercase letter and a number.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                aria-invalid={Boolean(errors.confirmPassword)}
                {...register('confirmPassword')}
              />
              {errors.confirmPassword ? (
                <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
              ) : null}
            </div>

            <Button type="submit" className="w-full" loading={isSubmitting}>
              {isSubmitting ? 'Creating account' : 'Create account'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
