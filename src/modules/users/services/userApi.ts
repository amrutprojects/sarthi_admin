import { newIdempotencyKey, request, type PageMeta } from '../../../services/api-client';
import type { ApiRoleRef } from '../../auth';
import type { CreateUserInput, UpdateUserInput, User, UserListParams } from '../types/user.types';

/* Users endpoints (backend /api/v1/users). Thin and typed: no state, no UI concerns. */
export const userApi = {
  async list(params: UserListParams, signal?: AbortSignal): Promise<{ items: User[]; meta: PageMeta }> {
    const { data, meta } = await request<User[]>('/users', { query: { ...params }, signal });
    return { items: data, meta: meta ?? { page: 1, limit: params.limit, total: data.length, totalPages: 1 } };
  },

  async get(id: string): Promise<User> {
    return (await request<User>(`/users/${id}`)).data;
  },

  /* The idempotency key makes a retried "Create" (e.g. after a network error) safe: the user is created once. */
  async create(input: CreateUserInput, idempotencyKey = newIdempotencyKey()): Promise<User> {
    return (await request<User>('/users', { method: 'POST', body: input, idempotencyKey })).data;
  },

  async update(id: string, input: UpdateUserInput): Promise<User> {
    return (await request<User>(`/users/${id}`, { method: 'PATCH', body: input })).data;
  },

  async setStatus(id: string, isActive: boolean): Promise<User> {
    return (await request<User>(`/users/${id}/status`, { method: 'PATCH', body: { isActive } })).data;
  },

  async remove(id: string): Promise<void> {
    await request<null>(`/users/${id}`, { method: 'DELETE' });
  },

  async replaceRoles(id: string, roleIds: string[]): Promise<ApiRoleRef[]> {
    return (await request<ApiRoleRef[]>(`/users/${id}/roles`, { method: 'PUT', body: { roleIds } })).data;
  },
};
