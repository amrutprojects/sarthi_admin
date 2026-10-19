import { request, setCsrfToken } from '../../../services/api-client';
import type { ApiRoleRef, ApiUser, CurrentUser } from '../types/auth.types';

export type { ApiRoleRef, ApiUser, CurrentUser } from '../types/auth.types';

interface LoginResponse {
  csrfToken: string;
  expiresAt: string;
  user: ApiUser;
}

/* Auth endpoints. The session itself is an HttpOnly cookie set by the backend; only the CSRF token is kept (in memory). */
export const authApi = {
  async login(email: string, password: string): Promise<void> {
    const { data } = await request<LoginResponse>('/auth/login', { method: 'POST', body: { email, password }, skipAuthHandling: true });
    setCsrfToken(data.csrfToken);
  },

  /* Current session; 401 when signed out. Also refreshes the in-memory CSRF token (e.g. after a page reload). */
  async me(): Promise<CurrentUser> {
    const { data } = await request<CurrentUser & { csrfToken: string }>('/auth/me', { skipAuthHandling: true });
    setCsrfToken(data.csrfToken);
    const { csrfToken: _csrf, ...user } = data;
    return user;
  },

  /* Revokes the session server-side (clears the cookie); local state is cleared even if the call fails. */
  async logout(): Promise<void> {
    try {
      await request<null>('/auth/logout', { method: 'POST', skipAuthHandling: true });
    } finally {
      setCsrfToken(null);
    }
  },
};

export type { ApiRoleRef as RoleRef };
