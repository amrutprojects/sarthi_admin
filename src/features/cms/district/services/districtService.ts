/* District Master API (backend /api/v1/cms/districts). */
import { request, type PageMeta } from '../../../../services/api-client';
import type { GeoOption } from '../../types';
import type { MasterQuery } from '../../components/MasterTable';
import type { ApiDistrict, CreateDistrictInput, UpdateDistrictInput } from '../types/district.types';

const enc = encodeURIComponent;

export interface DistrictQuery extends MasterQuery {
  /* '' = every state. */
  stateId: string;
}

const listParams = (q: DistrictQuery) => ({
  page: q.page,
  limit: q.limit,
  search: q.search || undefined,
  sortBy: q.sortBy,
  sortOrder: q.sortOrder,
  isActive: q.status === '' ? undefined : q.status,
  stateId: q.stateId || undefined,
});

export interface DistrictPage {
  items: ApiDistrict[];
  meta?: PageMeta;
}

export const districtService = {
  list: async (q: DistrictQuery): Promise<DistrictPage> => {
    const { data, meta } = await request<ApiDistrict[]>('/cms/districts', { query: listParams(q) });
    return { items: data, meta };
  },

  get: async (id: string): Promise<ApiDistrict> => (await request<ApiDistrict>(`/cms/districts/${enc(id)}`)).data,

  create: async (input: CreateDistrictInput): Promise<ApiDistrict> =>
    (await request<ApiDistrict>('/cms/districts', { method: 'POST', body: input })).data,

  update: async (id: string, input: UpdateDistrictInput): Promise<ApiDistrict> =>
    (await request<ApiDistrict>(`/cms/districts/${enc(id)}`, { method: 'PATCH', body: input })).data,

  setStatus: async (id: string, isActive: boolean): Promise<ApiDistrict> =>
    (await request<ApiDistrict>(`/cms/districts/${enc(id)}/status`, { method: 'PATCH', body: { isActive } })).data,

  remove: async (id: string): Promise<void> => {
    await request<null>(`/cms/districts/${enc(id)}`, { method: 'DELETE' });
  },

  restore: async (id: string): Promise<ApiDistrict> =>
    (await request<ApiDistrict>(`/cms/districts/${enc(id)}/restore`, { method: 'POST' })).data,

  /* How many districts match a filter, without fetching them (see stateService.count). */
  count: async (filters: { isActive?: 'true' | 'false'; stateId?: string } = {}): Promise<number> => {
    const { meta } = await request<ApiDistrict[]>('/cms/districts', {
      query: { page: 1, limit: 1, isActive: filters.isActive, stateId: filters.stateId || undefined },
    });
    return meta?.total ?? 0;
  },

  /* Options for the District dropdown of the Taluka form: the active districts of one state. */
  optionsOfState: async (stateId: string): Promise<GeoOption[]> =>
    (await request<GeoOption[]>(`/cms/states/${enc(stateId)}/districts`)).data,
};
