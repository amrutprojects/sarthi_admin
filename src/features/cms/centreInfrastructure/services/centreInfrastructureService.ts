/* Capacity & Infrastructure API (backend /api/v1/cms/centre-infrastructure). */
import { request, type PageMeta } from '../../../../services/api-client';
import type { MasterQuery } from '../../components/MasterTable';
import type {
  ApiCentreInfrastructure, CentreInfrastructureSummary, CreateCentreInfrastructureInput, UpdateCentreInfrastructureInput,
} from '../types/centreInfrastructure.types';

const enc = encodeURIComponent;

export interface CentreInfrastructureQuery extends MasterQuery {
  /* '' = every centre. */
  centreId: string;
}

const listParams = (q: CentreInfrastructureQuery) => ({
  page: q.page,
  limit: q.limit,
  search: q.search || undefined,
  sortBy: q.sortBy,
  sortOrder: q.sortOrder,
  isActive: q.status === '' ? undefined : q.status,
  centreId: q.centreId || undefined,
});

export interface CentreInfrastructurePage {
  items: ApiCentreInfrastructure[];
  meta?: PageMeta;
}

export const centreInfrastructureService = {
  list: async (q: CentreInfrastructureQuery): Promise<CentreInfrastructurePage> => {
    const { data, meta } = await request<ApiCentreInfrastructure[]>('/cms/centre-infrastructure', { query: listParams(q) });
    return { items: data, meta };
  },

  get: async (id: string): Promise<ApiCentreInfrastructure> =>
    (await request<ApiCentreInfrastructure>(`/cms/centre-infrastructure/${enc(id)}`)).data,

  create: async (input: CreateCentreInfrastructureInput): Promise<ApiCentreInfrastructure> =>
    (await request<ApiCentreInfrastructure>('/cms/centre-infrastructure', { method: 'POST', body: input })).data,

  update: async (id: string, input: UpdateCentreInfrastructureInput): Promise<ApiCentreInfrastructure> =>
    (await request<ApiCentreInfrastructure>(`/cms/centre-infrastructure/${enc(id)}`, { method: 'PATCH', body: input })).data,

  setStatus: async (id: string, isActive: boolean): Promise<ApiCentreInfrastructure> =>
    (await request<ApiCentreInfrastructure>(`/cms/centre-infrastructure/${enc(id)}/status`, { method: 'PATCH', body: { isActive } })).data,

  remove: async (id: string): Promise<void> => {
    await request<null>(`/cms/centre-infrastructure/${enc(id)}`, { method: 'DELETE' });
  },

  restore: async (id: string): Promise<ApiCentreInfrastructure> =>
    (await request<ApiCentreInfrastructure>(`/cms/centre-infrastructure/${enc(id)}/restore`, { method: 'POST' })).data,

  /* How many records match a filter, read from the pagination meta of a one-row page. */
  count: async (filters: { isActive?: 'true' | 'false'; centreId?: string } = {}): Promise<number> => {
    const { meta } = await request<ApiCentreInfrastructure[]>('/cms/centre-infrastructure', {
      query: { page: 1, limit: 1, isActive: filters.isActive, centreId: filters.centreId || undefined },
    });
    return meta?.total ?? 0;
  },

  /* KPI figures in one request: counts plus the seating capacity of the active records. */
  summary: async (centreId?: string): Promise<CentreInfrastructureSummary> =>
    (await request<CentreInfrastructureSummary>('/cms/centre-infrastructure/summary', { query: { centreId: centreId || undefined } })).data,
};
