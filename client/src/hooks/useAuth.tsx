import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authService, type Credentials, type RegisterPayload } from '@/services/auth.service';
import { ApiError } from '@/services/api';
import type { User } from '@/types';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (credentials: Credentials) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AUTH_QUERY_KEY = ['auth', 'me'] as const;

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient();

  /**
   * The session lives in an httpOnly cookie that JavaScript cannot read, so
   * the only way to know who is signed in is to ask the server. A 401 is an
   * expected answer (a signed-out visitor), not an error worth retrying.
   */
  const { data, isLoading } = useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: authService.me,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status === 401) return false;
      return failureCount < 1;
    },
    staleTime: 5 * 60 * 1000,
  });

  const user = data ?? null;

  const loginMutation = useMutation({
    mutationFn: authService.login,
    onSuccess: (loggedIn) => queryClient.setQueryData(AUTH_QUERY_KEY, loggedIn),
  });

  const registerMutation = useMutation({
    mutationFn: authService.register,
    onSuccess: (created) => queryClient.setQueryData(AUTH_QUERY_KEY, created),
  });

  const logout = useCallback(async () => {
    await authService.logout();
    queryClient.setQueryData(AUTH_QUERY_KEY, null);
    // Orders and admin data are per-user; drop them so nothing leaks into
    // the next session on a shared machine.
    await queryClient.invalidateQueries();
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === 'ADMIN',
      login: loginMutation.mutateAsync,
      register: registerMutation.mutateAsync,
      logout,
    }),
    [user, isLoading, loginMutation.mutateAsync, registerMutation.mutateAsync, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
