import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { ApiError, onUnauthorized } from '../../services/api-client';
import { authApi } from './services/authApi';
import type { ApiRoleRef, CurrentUser } from './types/auth.types';

/*
 * Authentication state backed by the admin backend (ADR-0003):
 * - the session is the backend's HttpOnly cookie; GET /auth/me (TanStack Query key ['auth','me']) says who is signed in
 * - login(email, password) → POST /auth/login → refetch /auth/me
 * - logout() → POST /auth/logout (session revoked server-side) → clear every cached query
 * - any 401 from the API signs the user out; network errors and 5xx are retried (a backend restart
 *   must not sign anyone out)
 * Permissions are the effective codes returned by the backend; the backend re-checks every call.
 */
export type AuthStatus = 'loading' | 'anonymous' | 'authenticated';

export interface AuthValue {
  status: AuthStatus;
  user: CurrentUser | null;
  /* First role, for display (the backend allows several). */
  primaryRole: ApiRoleRef | null;
  permissions: Set<string>;
  hiddenMenus: Set<string>;
  login: (email: string, password: string) => Promise<CurrentUser>;
  logout: () => Promise<void>;
  /* Re-load /auth/me, e.g. after the user's own roles changed. */
  refresh: () => Promise<void>;
}

export const SESSION_QUERY_KEY = ['auth', 'me'] as const;
const isUnauthorized = (e: unknown) => e instanceof ApiError && e.status === 401;

const AuthContext = createContext<AuthValue | null>(null);

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
      login,
      logout,
      refresh,
    }),
    [status, user, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
