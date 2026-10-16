import { request, tokenStore } from './http';

export interface ApiRoleRef { id: string; name: string; code: string }

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  roles?: ApiRoleRef[];
}

/* GET /auth/me: the signed-in user with roles and effective permission codes. */
export interface CurrentUser extends ApiUser {
  roles: ApiRoleRef[];
  permissions: string[];
  /* Menus hidden from this user by the per-role Menu Visibility settings. */
  hiddenMenus?: string[];
}

interface LoginResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  expiresAt: string;
  user: ApiUser;
}

export const authApi = {
  async login(email: string, password: string): Promise<void> {
    const { data } = await request<LoginResponse>('/auth/login', { method: 'POST', body: { email, password }, skipAuthHandling: true });
    tokenStore.set(data.accessToken);
  },

  async me(): Promise<CurrentUser> {
    return (await request<CurrentUser>('/auth/me')).data;
  },

  /* Revokes the token server-side; the local token is cleared even if the call fails. */
  async logout(): Promise<void> {
    try {
      if (tokenStore.get()) await request<null>('/auth/logout', { method: 'POST', skipAuthHandling: true });
    } finally {
      tokenStore.clear();
    }
  },
};
