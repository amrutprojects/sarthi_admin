import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authApi, type ApiRoleRef, type CurrentUser } from '../services/authApi';
import { ApiError, onUnauthorized, tokenStore } from '../services/http';

/*
 * Authentication state backed by the admin backend:
 * - login(email, password) → POST /auth/login (JWT kept in sessionStorage) → GET /auth/me
 * - on start-up, an existing token is validated with GET /auth/me
 * - logout() → POST /auth/logout (token revoked server-side)
 * - any 401 from the API (expired / revoked token, deactivated account) signs the user out
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

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(() => (tokenStore.get() ? 'loading' : 'anonymous'));
  const [user, setUser] = useState<CurrentUser | null>(null);

  const signOutLocally = useCallback(() => {
    tokenStore.clear();
    setUser(null);
    setStatus('anonymous');
  }, []);

  /*
   * Only a 401 means the session is over. A network error or 5xx (e.g. the backend restarting) is retried
   * a few times with back-off, so a brief outage does not sign the user out.
   */
  const refresh = useCallback(async () => {
    for (let attempt = 0; ; attempt++) {
      try {
        setUser(await authApi.me());
        setStatus('authenticated');
        return;
      } catch (err) {
        const unauthorised = err instanceof ApiError && err.status === 401;
        if (unauthorised || attempt >= 5 || !tokenStore.get()) { signOutLocally(); return; }
        await new Promise((r) => setTimeout(r, Math.min(8000, 500 * 2 ** attempt)));
      }
    }
  }, [signOutLocally]);

  useEffect(() => {
    onUnauthorized(signOutLocally);
    if (tokenStore.get()) void refresh();
    return () => onUnauthorized(null);
  }, [refresh, signOutLocally]);

  const login = useCallback(async (email: string, password: string) => {
    await authApi.login(email, password);
    const me = await authApi.me();
    setUser(me);
    setStatus('authenticated');
    return me;
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout().catch(() => undefined);
    signOutLocally();
  }, [signOutLocally]);

  const value = useMemo<AuthValue>(() => ({
    status,
    user,
    primaryRole: user?.roles[0] ?? null,
    permissions: new Set(user?.permissions ?? []),
    hiddenMenus: new Set(user?.hiddenMenus ?? []),
    login,
    logout,
    refresh,
  }), [status, user, login, logout, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
