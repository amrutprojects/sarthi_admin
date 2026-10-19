/* Users, roles and permissions management (backend /users, /roles, /permissions). */
import type { ApiRoleRef, ApiUser } from '../../auth/services/authApi';
import { request, requestAll } from '../../../services/api-client';

export interface ApiPermission {
  id: string;
  name: string;
  code: string;
  module: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiRole {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  permissions?: Pick<ApiPermission, 'id' | 'code' | 'name' | 'module'>[];
}

export interface CreateUserInput { name: string; email: string; password: string; isActive?: boolean; roleIds?: string[] }
export interface UpdateUserInput { name?: string; email?: string; password?: string }
export interface CreateRoleInput { name: string; code: string; description?: string | null; permissionIds?: string[] }
export interface UpdateRoleInput { name?: string; description?: string | null }

const enc = encodeURIComponent;

export const usersApi = {
  listAll: (query: { search?: string; isActive?: boolean; roleId?: string } = {}) => requestAll<ApiUser>('/users', { sortBy: 'name', sortOrder: 'asc', ...query }),
  get: async (id: string) => (await request<ApiUser>(`/users/${enc(id)}`)).data,
  create: async (input: CreateUserInput) => (await request<ApiUser>('/users', { method: 'POST', body: input })).data,
  update: async (id: string, input: UpdateUserInput) => (await request<ApiUser>(`/users/${enc(id)}`, { method: 'PATCH', body: input })).data,
  setStatus: async (id: string, isActive: boolean) => (await request<ApiUser>(`/users/${enc(id)}/status`, { method: 'PATCH', body: { isActive } })).data,
  remove: async (id: string) => { await request<null>(`/users/${enc(id)}`, { method: 'DELETE' }); },
  getRoles: async (id: string) => (await request<ApiRoleRef[]>(`/users/${enc(id)}/roles`)).data,
  replaceRoles: async (id: string, roleIds: string[]) => (await request<ApiRoleRef[]>(`/users/${enc(id)}/roles`, { method: 'PUT', body: { roleIds } })).data,
};

export const rolesApi = {
  listAll: () => requestAll<ApiRole>('/roles', { sortBy: 'name', sortOrder: 'asc' }),
  get: async (id: string) => (await request<ApiRole>(`/roles/${enc(id)}`)).data,
  create: async (input: CreateRoleInput) => (await request<ApiRole>('/roles', { method: 'POST', body: input })).data,
  update: async (id: string, input: UpdateRoleInput) => (await request<ApiRole>(`/roles/${enc(id)}`, { method: 'PATCH', body: input })).data,
  setStatus: async (id: string, isActive: boolean) => (await request<ApiRole>(`/roles/${enc(id)}/status`, { method: 'PATCH', body: { isActive } })).data,
  remove: async (id: string) => { await request<null>(`/roles/${enc(id)}`, { method: 'DELETE' }); },
  replacePermissions: async (id: string, permissionIds: string[]) =>
    (await request<NonNullable<ApiRole['permissions']>>(`/roles/${enc(id)}/permissions`, { method: 'PUT', body: { permissionIds } })).data,
};

export const permissionsApi = {
  listAll: () => requestAll<ApiPermission>('/permissions', { sortBy: 'module', sortOrder: 'asc' }),
  setStatus: async (id: string, isActive: boolean) => (await request<ApiPermission>(`/permissions/${enc(id)}/status`, { method: 'PATCH', body: { isActive } })).data,
};

/* ---------- Menu visibility (per-role sidebar menus) ---------- */
export interface MenuVisibilityMatrix {
  menus: string[];
  lockedForSuperAdmin: string[];
  roles: { id: string; code: string; name: string; isActive: boolean; hidden: string[] }[];
}
export interface MenuVisibilityChange { roleId: string; menuKey: string; visible: boolean }

export const menuVisibilityApi = {
  get: async () => (await request<MenuVisibilityMatrix>('/menu-visibility')).data,
  save: async (changes: MenuVisibilityChange[]) => (await request<MenuVisibilityMatrix>('/menu-visibility', { method: 'PUT', body: { changes } })).data,
};
