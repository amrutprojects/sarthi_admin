/* College Master API (backend /api/v1/cms/colleges). */
import { request, type PageMeta } from '../../../../services/api-client';
import type { MasterQuery } from '../../components/MasterTable';
import type { ApiCollege, CreateCollegeInput, UpdateCollegeInput } from '../types/college.types';

const enc = encodeURIComponent;

export interface CollegeQuery extends MasterQuery {
  stateId: string;
  districtId: string;
}

/* CollegeQuery to request parameters. An empty filter means "any", so it is left off entirely. */
const listParams = (q: CollegeQuery) => ({
  page: q.page,
  limit: q.limit,
  search: q.search || undefined,
  sortBy: q.sortBy,
  sortOrder: q.sortOrder,
  isActive: q.status === '' ? undefined : q.status,
  stateId: q.stateId || undefined,
  districtId: q.districtId || undefined,
});

export interface CollegePage {
  items: ApiCollege[];
  meta?: PageMeta;
}

export const collegeService = {
  list: async (q: CollegeQuery): Promise<CollegePage> => {
    const { data, meta } = await request<ApiCollege[]>('/cms/colleges', { query: listParams(q) });
    return { items: data, meta };
  },

  get: async (id: string): Promise<ApiCollege> => (await request<ApiCollege>(`/cms/colleges/${enc(id)}`)).data,

  create: async (input: CreateCollegeInput): Promise<ApiCollege> =>
    (await request<ApiCollege>('/cms/colleges', { method: 'POST', body: input })).data,

  update: async (id: string, input: UpdateCollegeInput): Promise<ApiCollege> =>
    (await request<ApiCollege>(`/cms/colleges/${enc(id)}`, { method: 'PATCH', body: input })).data,

  setStatus: async (id: string, isActive: boolean): Promise<ApiCollege> =>
    (await request<ApiCollege>(`/cms/colleges/${enc(id)}/status`, { method: 'PATCH', body: { isActive } })).data,

  remove: async (id: string): Promise<void> => {
    await request<null>(`/cms/colleges/${enc(id)}`, { method: 'DELETE' });
  },

  restore: async (id: string): Promise<ApiCollege> =>
    (await request<ApiCollege>(`/cms/colleges/${enc(id)}/restore`, { method: 'POST' })).data,

  /* How many colleges match a filter, read from the pagination meta of a one-row page (KPI tiles). */
  count: async (filters: { isActive?: 'true' | 'false'; stateId?: string; districtId?: string } = {}): Promise<number> => {
    const { meta } = await request<ApiCollege[]>('/cms/colleges', {
      query: {
        page: 1,
        limit: 1,
        isActive: filters.isActive,
        stateId: filters.stateId || undefined,
        districtId: filters.districtId || undefined,
      },
    });
    return meta?.total ?? 0;
  },
};
