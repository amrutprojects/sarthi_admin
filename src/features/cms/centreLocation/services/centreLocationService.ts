/* Location Information API (backend /api/v1/cms/centre-locations). */
import { request, type PageMeta } from '../../../../services/api-client';
import type { MasterQuery } from '../../components/MasterTable';
import type {
  ApiCentreLocation, CreateCentreLocationInput, ParkingOption, UpdateCentreLocationInput,
} from '../types/centreLocation.types';

const enc = encodeURIComponent;

export interface CentreLocationQuery extends MasterQuery {
  /* '' = every centre. */
  centreId: string;
  /* '' = any parking. */
  parking: '' | ParkingOption;
}

const listParams = (q: CentreLocationQuery) => ({
  page: q.page,
  limit: q.limit,
  search: q.search || undefined,
  sortBy: q.sortBy,
  sortOrder: q.sortOrder,
  isActive: q.status === '' ? undefined : q.status,
  centreId: q.centreId || undefined,
  parking: q.parking || undefined,
});

export interface CentreLocationPage {
  items: ApiCentreLocation[];
  meta?: PageMeta;
}

export const centreLocationService = {
  list: async (q: CentreLocationQuery): Promise<CentreLocationPage> => {
    const { data, meta } = await request<ApiCentreLocation[]>('/cms/centre-locations', { query: listParams(q) });
    return { items: data, meta };
  },

  get: async (id: string): Promise<ApiCentreLocation> => (await request<ApiCentreLocation>(`/cms/centre-locations/${enc(id)}`)).data,

  create: async (input: CreateCentreLocationInput): Promise<ApiCentreLocation> =>
    (await request<ApiCentreLocation>('/cms/centre-locations', { method: 'POST', body: input })).data,

  update: async (id: string, input: UpdateCentreLocationInput): Promise<ApiCentreLocation> =>
    (await request<ApiCentreLocation>(`/cms/centre-locations/${enc(id)}`, { method: 'PATCH', body: input })).data,

  setStatus: async (id: string, isActive: boolean): Promise<ApiCentreLocation> =>
    (await request<ApiCentreLocation>(`/cms/centre-locations/${enc(id)}/status`, { method: 'PATCH', body: { isActive } })).data,

  remove: async (id: string): Promise<void> => {
    await request<null>(`/cms/centre-locations/${enc(id)}`, { method: 'DELETE' });
  },

  restore: async (id: string): Promise<ApiCentreLocation> =>
    (await request<ApiCentreLocation>(`/cms/centre-locations/${enc(id)}/restore`, { method: 'POST' })).data,

  /* How many records match a filter, read from the pagination meta of a one-row page (KPI tiles). */
  count: async (filters: { isActive?: 'true' | 'false'; centreId?: string; parking?: ParkingOption } = {}): Promise<number> => {
    const { meta } = await request<ApiCentreLocation[]>('/cms/centre-locations', {
      query: { page: 1, limit: 1, isActive: filters.isActive, centreId: filters.centreId || undefined, parking: filters.parking },
    });
    return meta?.total ?? 0;
  },
};
