import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, type ReactNode } from 'react';
import { ApiError, onUnauthorized } from '../../services/api-client';
import { AuthContext, SESSION_QUERY_KEY, type AuthStatus, type AuthValue } from './auth-context';
import { authApi } from './services/authApi';

/*
 * Authentication state backed by the admin backend (ADR-0003):
 * - the session is the backend's HttpOnly cookie; GET /auth/me (TanStack Query key ['auth','me']) says who is signed in
 * - login(email, password) → POST /auth/login → refetch /auth/me
 * - logout() → POST /auth/logout (session revoked server-side) → clear every cached query
 * - any 401 from the API signs the user out; network errors and 5xx are retried (a backend restart
 *   must not sign anyone out)
 * Permissions are the effective codes returned by the backend; the backend re-checks every call.
 *
 * This file exports only the provider component, so React Fast Refresh patches it in place instead of
 * re-running it; the context object itself lives in auth-context.ts (see the note there).
 */
const isUnauthorized = (e: unknown) => e instanceof ApiError && e.status === 401;

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const session = useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: async () => {
      try {
        return await authApi.me();
      } catch (e) {
        if (isUnauthorized(e)) return null; // signed out is a normal state, not an error
        throw e;
      }
    },
    retry: (failures) => failures < 5,
    retryDelay: (attempt) => Math.min(8000, 500 * 2 ** attempt),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: true,
  });

  const signOutLocally = useCallback(() => {
    queryClient.setQueryData(SESSION_QUERY_KEY, null);
    queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== 'auth' });
  }, [queryClient]);

  useEffect(() => {
    onUnauthorized(signOutLocally);
    return () => onUnauthorized(null);
  }, [signOutLocally]);

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
  }, [queryClient]);

  const login = useCallback(
    async (email: string, password: string) => {
      await authApi.login(email, password);
      const me = await queryClient.fetchQuery({ queryKey: SESSION_QUERY_KEY, queryFn: authApi.me, staleTime: 0 });
      return me;
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    await authApi.logout().catch(() => undefined);
    signOutLocally();
  }, [signOutLocally]);

  const user = session.data ?? null;
  const status: AuthStatus =
    session.isPending || (session.isError && session.isFetching) ? 'loading' : user ? 'authenticated' : 'anonymous';

  const value = useMemo<AuthValue>(
    () => ({
      status,
      user,
      primaryRole: user?.roles[0] ?? null,
      permissions: new Set(user?.permissions ?? []),
      hiddenMenus: new Set(user?.hiddenMenus ?? []),
      portal: user?.portal ?? 'admin',
      login,
      logout,
      refresh,
    }),
    [status, user, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
