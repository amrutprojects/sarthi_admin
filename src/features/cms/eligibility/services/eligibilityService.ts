/* Eligibility Page Management API (backend /api/v1/cms/eligibility). */
import { request, type PageMeta } from '../../../../services/api-client';
import type { MasterQuery } from '../../components/MasterTable';
import type {
  ApiEligibilityItem,
  ApiEligibilitySettings,
  CreateEligibilityItemInput,
  EligibilityKind,
  UpdateEligibilityItemInput,
  UpdateEligibilitySettingsInput,
} from '../types/eligibility.types';

const enc = encodeURIComponent;

export interface EligibilityQuery extends MasterQuery {
  /* '' = both lists. */
  kind: '' | EligibilityKind;
}

/* EligibilityQuery to request parameters. An empty status or type means "any", so it is left off entirely. */
const listParams = (q: EligibilityQuery) => ({
  page: q.page,
  limit: q.limit,
  search: q.search || undefined,
  sortBy: q.sortBy,
  sortOrder: q.sortOrder,
  isActive: q.status === '' ? undefined : q.status,
  kind: q.kind || undefined,
});

export interface EligibilityPage {
  items: ApiEligibilityItem[];
  meta?: PageMeta;
}

export const eligibilityService = {
  list: async (q: EligibilityQuery): Promise<EligibilityPage> => {
    const { data, meta } = await request<ApiEligibilityItem[]>('/cms/eligibility/items', { query: listParams(q) });
    return { items: data, meta };
  },

  get: async (id: string): Promise<ApiEligibilityItem> => (await request<ApiEligibilityItem>(`/cms/eligibility/items/${enc(id)}`)).data,

  create: async (input: CreateEligibilityItemInput): Promise<ApiEligibilityItem> =>
    (await request<ApiEligibilityItem>('/cms/eligibility/items', { method: 'POST', body: input })).data,

  update: async (id: string, input: UpdateEligibilityItemInput): Promise<ApiEligibilityItem> =>
    (await request<ApiEligibilityItem>(`/cms/eligibility/items/${enc(id)}`, { method: 'PATCH', body: input })).data,

  setStatus: async (id: string, isActive: boolean): Promise<ApiEligibilityItem> =>
    (await request<ApiEligibilityItem>(`/cms/eligibility/items/${enc(id)}/status`, { method: 'PATCH', body: { isActive } })).data,

  remove: async (id: string): Promise<void> => {
    await request<null>(`/cms/eligibility/items/${enc(id)}`, { method: 'DELETE' });
  },

  restore: async (id: string): Promise<ApiEligibilityItem> =>
    (await request<ApiEligibilityItem>(`/cms/eligibility/items/${enc(id)}/restore`, { method: 'POST' })).data,

  /*
   * How many items match a filter, without fetching them. Reads the pagination meta of a one-row page,
   * so the KPI tiles show the real total rather than the size of the page on screen.
   */
  count: async (filters: { kind?: EligibilityKind; isActive?: 'true' | 'false' } = {}): Promise<number> => {
    const { meta } = await request<ApiEligibilityItem[]>('/cms/eligibility/items', {
      query: { page: 1, limit: 1, kind: filters.kind, isActive: filters.isActive },
    });
    return meta?.total ?? 0;
  },

  /*
   * The page text around the two lists is a singleton, so there is no list, no id in the path and no
   * create: the row is written once by the database migration and edited from then on.
   */
  getSettings: async (): Promise<ApiEligibilitySettings> => (await request<ApiEligibilitySettings>('/cms/eligibility/settings')).data,

  updateSettings: async (input: UpdateEligibilitySettingsInput): Promise<ApiEligibilitySettings> =>
    (await request<ApiEligibilitySettings>('/cms/eligibility/settings', { method: 'PUT', body: input })).data,
};
