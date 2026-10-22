/* Apply Page Management API (backend /api/v1/cms/apply). */
import { request, type PageMeta } from '../../../../services/api-client';
import type { MasterQuery } from '../../components/MasterTable';
import type {
  ApiApplyItem,
  ApiApplySettings,
  ApplyKind,
  Bilingual,
  CreateApplyItemInput,
  UpdateApplyItemInput,
  UpdateApplySettingsInput,
} from '../types/apply.types';

const enc = encodeURIComponent;

export interface ApplyQuery extends MasterQuery {
  /* '' = both lists. */
  kind: '' | ApplyKind;
}

/* ApplyQuery to request parameters. An empty status or type means "any", so it is left off entirely. */
const listParams = (q: ApplyQuery) => ({
  page: q.page,
  limit: q.limit,
  search: q.search || undefined,
  sortBy: q.sortBy,
  sortOrder: q.sortOrder,
  isActive: q.status === '' ? undefined : q.status,
  kind: q.kind || undefined,
});

export interface ApplyPage {
  items: ApiApplyItem[];
  meta?: PageMeta;
}

export const applyService = {
  list: async (q: ApplyQuery): Promise<ApplyPage> => {
    const { data, meta } = await request<ApiApplyItem[]>('/cms/apply/items', { query: listParams(q) });
    return { items: data, meta };
  },

  get: async (id: string): Promise<ApiApplyItem> => (await request<ApiApplyItem>(`/cms/apply/items/${enc(id)}`)).data,

  create: async (input: CreateApplyItemInput): Promise<ApiApplyItem> =>
    (await request<ApiApplyItem>('/cms/apply/items', { method: 'POST', body: input })).data,

  update: async (id: string, input: UpdateApplyItemInput): Promise<ApiApplyItem> =>
    (await request<ApiApplyItem>(`/cms/apply/items/${enc(id)}`, { method: 'PATCH', body: input })).data,

  setStatus: async (id: string, isActive: boolean): Promise<ApiApplyItem> =>
    (await request<ApiApplyItem>(`/cms/apply/items/${enc(id)}/status`, { method: 'PATCH', body: { isActive } })).data,

  remove: async (id: string): Promise<void> => {
    await request<null>(`/cms/apply/items/${enc(id)}`, { method: 'DELETE' });
  },

  restore: async (id: string): Promise<ApiApplyItem> =>
    (await request<ApiApplyItem>(`/cms/apply/items/${enc(id)}/restore`, { method: 'POST' })).data,

  /*
   * How many items match a filter, without fetching them. Reads the pagination meta of a one-row page,
   * so the KPI tiles show the real total rather than the size of the page on screen.
   */
  count: async (filters: { kind?: ApplyKind; isActive?: 'true' | 'false' } = {}): Promise<number> => {
    const { meta } = await request<ApiApplyItem[]>('/cms/apply/items', {
      query: { page: 1, limit: 1, kind: filters.kind, isActive: filters.isActive },
    });
    return meta?.total ?? 0;
  },

  /*
   * The page text around the two lists is a singleton, so there is no list, no id in the path and no
   * create: the row is written once by the database migration and edited from then on.
   */
  getSettings: async (): Promise<ApiApplySettings> => (await request<ApiApplySettings>('/cms/apply/settings')).data,

  updateSettings: async (input: UpdateApplySettingsInput): Promise<ApiApplySettings> =>
    (await request<ApiApplySettings>('/cms/apply/settings', { method: 'PUT', body: input })).data,

  /*
   * The "Documents to keep ready" list exactly as the public Apply page shows it: the Eligibility page's
   * active documents, in website order. Read from the public feed rather than the Eligibility admin API,
   * which needs that menu's own permission — this tab only shows the list, it is edited there.
   */
  publicDocuments: async (): Promise<Bilingual[]> =>
    (await request<{ documents: Bilingual[] } | null>('/public/apply')).data?.documents ?? [],
};
