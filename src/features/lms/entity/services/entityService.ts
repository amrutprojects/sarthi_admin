/* Entity Master API (backend /api/v1/lms/entities). */
import { request, type PageMeta } from '../../../../services/api-client';
import type { MasterQuery } from '../../../cms/components/MasterTable';
import type { ApiLmsEntity, CreateLmsEntityInput, LmsEntityFormOptions, UpdateLmsEntityInput } from '../types/entity.types';

const enc = encodeURIComponent;
const BASE = '/lms/entities';

export interface LmsEntityQuery extends MasterQuery {
  /* '' = no filter: entities with this centre / track enabled. */
  centreId: string;
  trackId: string;
  /* true: ONLY the soft-deleted entities (?deleted=true, the "Show deleted" view, restored from the list). */
  deleted: boolean;
}

export interface LmsEntityFilters {
  isActive?: 'true' | 'false';
  centreId?: string;
  trackId?: string;
}

const filterParams = (f: LmsEntityFilters) => ({
  isActive: f.isActive,
  centreId: f.centreId || undefined,
  trackId: f.trackId || undefined,
});

/* MasterQuery to request parameters. An empty filter means "any", so it is left off entirely. */
const listParams = (q: LmsEntityQuery) => ({
  page: q.page,
  limit: q.limit,
  search: q.search || undefined,
  sortBy: q.sortBy,
  sortOrder: q.sortOrder,
  ...filterParams({ isActive: q.status === '' ? undefined : q.status, centreId: q.centreId, trackId: q.trackId }),
  deleted: q.deleted ? 'true' : undefined,
});

export interface LmsEntityPage {
  items: ApiLmsEntity[];
  meta?: PageMeta;
  /* True when the rows came from the deleted=true listing: every one of them is soft-deleted. */
  deleted?: boolean;
}

export const lmsEntityService = {
  list: async (q: LmsEntityQuery): Promise<LmsEntityPage> => {
    const { data, meta } = await request<ApiLmsEntity[]>(BASE, { query: listParams(q) });
    return { items: data, meta, deleted: q.deleted };
  },

  get: async (id: string): Promise<ApiLmsEntity> => (await request<ApiLmsEntity>(`${BASE}/${enc(id)}`)).data,

  create: async (input: CreateLmsEntityInput): Promise<ApiLmsEntity> =>
    (await request<ApiLmsEntity>(BASE, { method: 'POST', body: input })).data,

  update: async (id: string, input: UpdateLmsEntityInput): Promise<ApiLmsEntity> =>
    (await request<ApiLmsEntity>(`${BASE}/${enc(id)}`, { method: 'PATCH', body: input })).data,

  setStatus: async (id: string, isActive: boolean): Promise<ApiLmsEntity> =>
    (await request<ApiLmsEntity>(`${BASE}/${enc(id)}/status`, { method: 'PATCH', body: { isActive } })).data,

  remove: async (id: string): Promise<void> => {
    await request<null>(`${BASE}/${enc(id)}`, { method: 'DELETE' });
  },

  restore: async (id: string): Promise<ApiLmsEntity> => (await request<ApiLmsEntity>(`${BASE}/${enc(id)}/restore`, { method: 'POST' })).data,

  /* How many entities match a filter, read from the pagination meta of a one-row page (KPI tiles). */
  count: async (filters: LmsEntityFilters = {}): Promise<number> => {
    const { meta } = await request<ApiLmsEntity[]>(BASE, { query: { page: 1, limit: 1, ...filterParams(filters) } });
    return meta?.total ?? 0;
  },

  /* The platform languages (To Be Confirmed, OQ-023) and the IANA time zones the form offers. */
  formOptions: async (): Promise<LmsEntityFormOptions> => (await request<LmsEntityFormOptions>(`${BASE}/form-options`)).data,
};
