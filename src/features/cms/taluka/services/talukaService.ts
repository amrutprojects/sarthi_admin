/* Taluka Master API (backend /api/v1/cms/talukas). */
import { request, type PageMeta } from '../../../../services/api-client';
import type { GeoOption } from '../../types';
import type { MasterQuery } from '../../components/MasterTable';
import type { ApiTaluka, CreateTalukaInput, UpdateTalukaInput } from '../types/taluka.types';

const enc = encodeURIComponent;

export interface TalukaQuery extends MasterQuery {
  stateId: string;
  districtId: string;
}

const listParams = (q: TalukaQuery) => ({
  page: q.page,
  limit: q.limit,
  search: q.search || undefined,
  sortBy: q.sortBy,
  sortOrder: q.sortOrder,
  isActive: q.status === '' ? undefined : q.status,
  stateId: q.stateId || undefined,
  districtId: q.districtId || undefined,
});

export interface TalukaPage {
  items: ApiTaluka[];
  meta?: PageMeta;
}

export const talukaService = {
  list: async (q: TalukaQuery): Promise<TalukaPage> => {
    const { data, meta } = await request<ApiTaluka[]>('/cms/talukas', { query: listParams(q) });
    return { items: data, meta };
  },

  get: async (id: string): Promise<ApiTaluka> => (await request<ApiTaluka>(`/cms/talukas/${enc(id)}`)).data,

  create: async (input: CreateTalukaInput): Promise<ApiTaluka> =>
    (await request<ApiTaluka>('/cms/talukas', { method: 'POST', body: input })).data,

  update: async (id: string, input: UpdateTalukaInput): Promise<ApiTaluka> =>
    (await request<ApiTaluka>(`/cms/talukas/${enc(id)}`, { method: 'PATCH', body: input })).data,

  setStatus: async (id: string, isActive: boolean): Promise<ApiTaluka> =>
    (await request<ApiTaluka>(`/cms/talukas/${enc(id)}/status`, { method: 'PATCH', body: { isActive } })).data,

  remove: async (id: string): Promise<void> => {
    await request<null>(`/cms/talukas/${enc(id)}`, { method: 'DELETE' });
  },

  restore: async (id: string): Promise<ApiTaluka> => (await request<ApiTaluka>(`/cms/talukas/${enc(id)}/restore`, { method: 'POST' })).data,

  /* How many talukas match a filter, without fetching them (see stateService.count). */
  count: async (filters: { isActive?: 'true' | 'false'; stateId?: string; districtId?: string } = {}): Promise<number> => {
    const { meta } = await request<ApiTaluka[]>('/cms/talukas', {
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

  /* Options for a Taluka dropdown elsewhere: the active talukas of one district. */
  optionsOfDistrict: async (districtId: string): Promise<GeoOption[]> =>
    (await request<GeoOption[]>(`/cms/districts/${enc(districtId)}/talukas`)).data,
};
