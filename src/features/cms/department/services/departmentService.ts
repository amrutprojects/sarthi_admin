/* Department Master API (backend /api/v1/cms/departments). */
import { request, type PageMeta } from '../../../../services/api-client';
import type { MasterQuery } from '../../components/MasterTable';
import type { ApiDepartment, CreateDepartmentInput, UpdateDepartmentInput } from '../types/department.types';

const enc = encodeURIComponent;

/* MasterQuery to request parameters. An empty status means "any", so it is left off entirely. */
const listParams = (q: MasterQuery) => ({
  page: q.page,
  limit: q.limit,
  search: q.search || undefined,
  sortBy: q.sortBy,
  sortOrder: q.sortOrder,
  isActive: q.status === '' ? undefined : q.status,
});

export interface DepartmentPage {
  items: ApiDepartment[];
  meta?: PageMeta;
}

export const departmentService = {
  list: async (q: MasterQuery): Promise<DepartmentPage> => {
    const { data, meta } = await request<ApiDepartment[]>('/cms/departments', { query: listParams(q) });
    return { items: data, meta };
  },

  get: async (id: string): Promise<ApiDepartment> => (await request<ApiDepartment>(`/cms/departments/${enc(id)}`)).data,

  create: async (input: CreateDepartmentInput): Promise<ApiDepartment> =>
    (await request<ApiDepartment>('/cms/departments', { method: 'POST', body: input })).data,

  update: async (id: string, input: UpdateDepartmentInput): Promise<ApiDepartment> =>
    (await request<ApiDepartment>(`/cms/departments/${enc(id)}`, { method: 'PATCH', body: input })).data,

  setStatus: async (id: string, isActive: boolean): Promise<ApiDepartment> =>
    (await request<ApiDepartment>(`/cms/departments/${enc(id)}/status`, { method: 'PATCH', body: { isActive } })).data,

  remove: async (id: string): Promise<void> => {
    await request<null>(`/cms/departments/${enc(id)}`, { method: 'DELETE' });
  },

  restore: async (id: string): Promise<ApiDepartment> =>
    (await request<ApiDepartment>(`/cms/departments/${enc(id)}/restore`, { method: 'POST' })).data,

  /* How many departments match a filter, read from the pagination meta of a one-row page (KPI tiles). */
  count: async (isActive?: 'true' | 'false'): Promise<number> => {
    const { meta } = await request<ApiDepartment[]>('/cms/departments', { query: { page: 1, limit: 1, isActive } });
    return meta?.total ?? 0;
  },
};
