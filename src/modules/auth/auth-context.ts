/*
 * The auth context object, its types and the useAuth hook.
 *
 * Deliberately component-free. React Fast Refresh can only patch a module in place when that module
 * exports nothing but components; a module that exports both a component and a `createContext()` value
 * gets re-executed on edit, which mints a NEW context object. The already-mounted provider keeps
 * handing out the OLD one, so every consumer re-rendered from the new module reads `null` and throws
 * "useAuth must be used inside <AuthProvider>" even though the tree is correct. Keeping the context
 * here and the <AuthProvider> component in AuthContext.tsx makes that impossible.
 */
import { createContext, useContext } from 'react';
import type { Portal } from './permissions';
import type { ApiRoleRef, CurrentUser } from './types/auth.types';

export type AuthStatus = 'loading' | 'anonymous' | 'authenticated';

export interface AuthValue {
  status: AuthStatus;
  user: CurrentUser | null;
  /* First role, for display (the backend allows several). */
  primaryRole: ApiRoleRef | null;
  permissions: Set<string>;
  hiddenMenus: Set<string>;
  /* 'website': a Website Admin, who works in the CMS menu only. */
  portal: Portal;
  login:(email: string, password: string) => Promise<CurrentUser>;
  logout: () => Promise<void>;
  /* Re-load /auth/me, e.g. after the user's own roles changed. */
  refresh: () => Promise<void>;
}

export const SESSION_QUERY_KEY = ['auth', 'me'] as const;

export const AuthContext = createContext<AuthValue | null>(null);

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
