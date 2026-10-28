/* Center Master API (backend /api/v1/cms/centres). */
import { request, type PageMeta } from '../../../../services/api-client';
import type { MasterQuery } from '../../components/MasterTable';
import type { ApiCentre, CreateCentreInput, TechnologyOption, UpdateCentreInput } from '../types/centre.types';

const enc = encodeURIComponent;

export interface CentreQuery extends MasterQuery {
  stateId: string;
  districtId: string;
  /* Only centres allocated this technology track (a code such as T03). */
  technologyCode: string;
}

/* CentreQuery to request parameters. An empty filter means "any", so it is left off entirely. */
const listParams = (q: CentreQuery) => ({
  page: q.page,
  limit: q.limit,
  search: q.search || undefined,
  sortBy: q.sortBy,
  sortOrder: q.sortOrder,
  isActive: q.status === '' ? undefined : q.status,
  stateId: q.stateId || undefined,
  districtId: q.districtId || undefined,
  technologyCode: q.technologyCode || undefined,
});

export interface CentrePage {
  items: ApiCentre[];
  meta?: PageMeta;
}

export const centreService = {
  list: async (q: CentreQuery): Promise<CentrePage> => {
    const { data, meta } = await request<ApiCentre[]>('/cms/centres', { query: listParams(q) });
    return { items: data, meta };
  },

  get: async (id: string): Promise<ApiCentre> => (await request<ApiCentre>(`/cms/centres/${enc(id)}`)).data,

  create: async (input: CreateCentreInput): Promise<ApiCentre> =>
    (await request<ApiCentre>('/cms/centres', { method: 'POST', body: input })).data,

  update: async (id: string, input: UpdateCentreInput): Promise<ApiCentre> =>
    (await request<ApiCentre>(`/cms/centres/${enc(id)}`, { method: 'PATCH', body: input })).data,

  setStatus: async (id: string, isActive: boolean): Promise<ApiCentre> =>
    (await request<ApiCentre>(`/cms/centres/${enc(id)}/status`, { method: 'PATCH', body: { isActive } })).data,

  /* 409 when a student or an EDP draft references the centre; the API message says to deactivate instead. */
  remove: async (id: string): Promise<void> => {
    await request<null>(`/cms/centres/${enc(id)}`, { method: 'DELETE' });
  },

  restore: async (id: string): Promise<ApiCentre> =>
    (await request<ApiCentre>(`/cms/centres/${enc(id)}/restore`, { method: 'POST' })).data,

  /* Active technology tracks for the "Allocated Technologies" selection and the technology filter. */
  technologyOptions: async (): Promise<TechnologyOption[]> =>
    (await request<TechnologyOption[]>('/cms/centres/technology-options')).data,

  /* How many centres match a filter, read from the pagination meta of a one-row page (KPI tiles). */
  count: async (
    filters: { isActive?: 'true' | 'false'; stateId?: string; districtId?: string; technologyCode?: string } = {},
  ): Promise<number> => {
    const { meta } = await request<ApiCentre[]>('/cms/centres', {
      query: {
        page: 1,
        limit: 1,
        isActive: filters.isActive,
        stateId: filters.stateId || undefined,
        districtId: filters.districtId || undefined,
        technologyCode: filters.technologyCode || undefined,
      },
    });
    return meta?.total ?? 0;
  },
};
