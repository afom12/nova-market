import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const FullPageLoader = () => (
  <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-live="polite">
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
    <span className="sr-only">Loading</span>
  </div>
);

/**
 * Route guards are a UX convenience only. Every protected resource is also
 * enforced on the server — removing these components would change what the
 * user sees, never what they can access.
 */
export const ProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <FullPageLoader />;

  // Remember where they were heading so login can return them there.
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;

  return <Outlet />;
};

export const AdminRoute = () => {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <FullPageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  return <Outlet />;
};

/** Keeps signed-in users away from the login/register screens. */
export const GuestRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <FullPageLoader />;
  if (isAuthenticated) return <Navigate to="/" replace />;

  return <Outlet />;
};
