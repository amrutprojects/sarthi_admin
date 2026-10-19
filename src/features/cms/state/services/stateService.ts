/* State Master API (backend /api/v1/cms/states). */
import { request, requestAll, type PageMeta } from '../../../../services/api-client';
import type { GeoOption } from '../../types';
import type { MasterQuery } from '../../components/MasterTable';
import type { ApiState, CreateStateInput, UpdateStateInput } from '../types/state.types';

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

export interface StatePage {
  items: ApiState[];
  meta?: PageMeta;
}

export const stateService = {
  list: async (q: MasterQuery): Promise<StatePage> => {
    const { data, meta } = await request<ApiState[]>('/cms/states', { query: listParams(q) });
    return { items: data, meta };
  },

  get: async (id: string): Promise<ApiState> => (await request<ApiState>(`/cms/states/${enc(id)}`)).data,

  create: async (input: CreateStateInput): Promise<ApiState> => (await request<ApiState>('/cms/states', { method: 'POST', body: input })).data,

  update: async (id: string, input: UpdateStateInput): Promise<ApiState> =>
    (await request<ApiState>(`/cms/states/${enc(id)}`, { method: 'PATCH', body: input })).data,

  setStatus: async (id: string, isActive: boolean): Promise<ApiState> =>
    (await request<ApiState>(`/cms/states/${enc(id)}/status`, { method: 'PATCH', body: { isActive } })).data,

  remove: async (id: string): Promise<void> => {
    await request<null>(`/cms/states/${enc(id)}`, { method: 'DELETE' });
  },

  restore: async (id: string): Promise<ApiState> => (await request<ApiState>(`/cms/states/${enc(id)}/restore`, { method: 'POST' })).data,

  /*
   * How many states match a filter, without fetching them. Reads the pagination meta of a one-row
   * page, so the KPI tiles show the real total rather than the size of the page on screen.
   */
  count: async (isActive?: 'true' | 'false'): Promise<number> => {
    const { meta } = await request<ApiState[]>('/cms/states', { query: { page: 1, limit: 1, isActive } });
    return meta?.total ?? 0;
  },

  /*
   * Options for the State dropdown of the District and Taluka forms: active states only, A to Z.
   * Paged through with requestAll because a dropdown needs the whole list, not one page of it.
   */
  options: async (): Promise<GeoOption[]> => {
    const rows = await requestAll<ApiState>('/cms/states', { isActive: 'true', sortBy: 'name', sortOrder: 'asc' });
    return rows.map((s) => ({ id: s.id, name: s.name, code: s.code }));
  },
};
