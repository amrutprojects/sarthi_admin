/* Training Centre Type Master API (backend /api/v1/cms/centre-types). */
import { request, type PageMeta } from '../../../../services/api-client';
import type { MasterQuery } from '../../components/MasterTable';
import type { ApiCentreType, CreateCentreTypeInput, UpdateCentreTypeInput } from '../types/centreType.types';

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

export interface CentreTypePage {
  items: ApiCentreType[];
  meta?: PageMeta;
}

export const centreTypeService = {
  list: async (q: MasterQuery): Promise<CentreTypePage> => {
    const { data, meta } = await request<ApiCentreType[]>('/cms/centre-types', { query: listParams(q) });
    return { items: data, meta };
  },

  get: async (id: string): Promise<ApiCentreType> => (await request<ApiCentreType>(`/cms/centre-types/${enc(id)}`)).data,

  create: async (input: CreateCentreTypeInput): Promise<ApiCentreType> =>
    (await request<ApiCentreType>('/cms/centre-types', { method: 'POST', body: input })).data,

  update: async (id: string, input: UpdateCentreTypeInput): Promise<ApiCentreType> =>
    (await request<ApiCentreType>(`/cms/centre-types/${enc(id)}`, { method: 'PATCH', body: input })).data,

  setStatus: async (id: string, isActive: boolean): Promise<ApiCentreType> =>
    (await request<ApiCentreType>(`/cms/centre-types/${enc(id)}/status`, { method: 'PATCH', body: { isActive } })).data,

  remove: async (id: string): Promise<void> => {
    await request<null>(`/cms/centre-types/${enc(id)}`, { method: 'DELETE' });
  },

  restore: async (id: string): Promise<ApiCentreType> =>
    (await request<ApiCentreType>(`/cms/centre-types/${enc(id)}/restore`, { method: 'POST' })).data,

  /* How many centre types match a filter, read from the pagination meta of a one-row page (KPI tiles). */
  count: async (isActive?: 'true' | 'false'): Promise<number> => {
    const { meta } = await request<ApiCentreType[]>('/cms/centre-types', { query: { page: 1, limit: 1, isActive } });
    return meta?.total ?? 0;
  },
};
