/* Roles, permissions and menu visibility (backend /roles, /permissions, /menu-visibility). Users live in modules/users. */
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

export interface CreateRoleInput {
  name: string;
  code: string;
  description?: string | null;
  permissionIds?: string[];
}
export interface UpdateRoleInput {
  name?: string;
  description?: string | null;
}

const enc = encodeURIComponent;

/* Server-side list parameters (backend listQuerySchema). */
export interface ListParams {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  module?: string;
}
const listQuery = (p: ListParams) => ({ ...p, isActive: p.isActive === undefined ? undefined : String(p.isActive) });

export const rolesApi = {
  list: (p: ListParams, signal?: AbortSignal) => request<ApiRole[]>('/roles', { query: listQuery(p), signal }),
  listAll: () => requestAll<ApiRole>('/roles', { sortBy: 'name', sortOrder: 'asc' }),
  get: async (id: string) => (await request<ApiRole>(`/roles/${enc(id)}`)).data,
  create: async (input: CreateRoleInput) => (await request<ApiRole>('/roles', { method: 'POST', body: input })).data,
  update: async (id: string, input: UpdateRoleInput) =>
    (await request<ApiRole>(`/roles/${enc(id)}`, { method: 'PATCH', body: input })).data,
  setStatus: async (id: string, isActive: boolean) =>
    (await request<ApiRole>(`/roles/${enc(id)}/status`, { method: 'PATCH', body: { isActive } })).data,
  remove: async (id: string) => {
    await request<null>(`/roles/${enc(id)}`, { method: 'DELETE' });
  },
  replacePermissions: async (id: string, permissionIds: string[]) =>
    (await request<NonNullable<ApiRole['permissions']>>(`/roles/${enc(id)}/permissions`, { method: 'PUT', body: { permissionIds } })).data,
};

export const permissionsApi = {
  list: (p: ListParams, signal?: AbortSignal) => request<ApiPermission[]>('/permissions', { query: listQuery(p), signal }),
  listAll: () => requestAll<ApiPermission>('/permissions', { sortBy: 'module', sortOrder: 'asc' }),
  setStatus: async (id: string, isActive: boolean) =>
    (await request<ApiPermission>(`/permissions/${enc(id)}/status`, { method: 'PATCH', body: { isActive } })).data,
};

/* ---------- Menu visibility (per-role sidebar menus) ---------- */
export interface MenuVisibilityMatrix {
  menus: string[];
  lockedForSuperAdmin: string[];
  roles: { id: string; code: string; name: string; isActive: boolean; hidden: string[] }[];
}
export interface MenuVisibilityChange {
  roleId: string;
  menuKey: string;
  visible: boolean;
}

export const menuVisibilityApi = {
  get: async () => (await request<MenuVisibilityMatrix>('/menu-visibility')).data,
  save: async (changes: MenuVisibilityChange[]) =>
    (await request<MenuVisibilityMatrix>('/menu-visibility', { method: 'PUT', body: { changes } })).data,
};
