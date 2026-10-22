/* FAQ Management API (backend /api/v1/cms/faqs). */
import { request, type PageMeta } from '../../../../services/api-client';
import type { MasterQuery } from '../../components/MasterTable';
import type { ApiFaq, CreateFaqInput, UpdateFaqInput } from '../types/faq.types';

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

export interface FaqPage {
  items: ApiFaq[];
  meta?: PageMeta;
}

export const faqService = {
  list: async (q: MasterQuery): Promise<FaqPage> => {
    const { data, meta } = await request<ApiFaq[]>('/cms/faqs', { query: listParams(q) });
    return { items: data, meta };
  },

  get: async (id: string): Promise<ApiFaq> => (await request<ApiFaq>(`/cms/faqs/${enc(id)}`)).data,

  create: async (input: CreateFaqInput): Promise<ApiFaq> => (await request<ApiFaq>('/cms/faqs', { method: 'POST', body: input })).data,

  update: async (id: string, input: UpdateFaqInput): Promise<ApiFaq> =>
    (await request<ApiFaq>(`/cms/faqs/${enc(id)}`, { method: 'PATCH', body: input })).data,

  setStatus: async (id: string, isActive: boolean): Promise<ApiFaq> =>
    (await request<ApiFaq>(`/cms/faqs/${enc(id)}/status`, { method: 'PATCH', body: { isActive } })).data,

  remove: async (id: string): Promise<void> => {
    await request<null>(`/cms/faqs/${enc(id)}`, { method: 'DELETE' });
  },

  restore: async (id: string): Promise<ApiFaq> => (await request<ApiFaq>(`/cms/faqs/${enc(id)}/restore`, { method: 'POST' })).data,

  /*
   * How many FAQs match a filter, without fetching them. Reads the pagination meta of a one-row page,
   * so the KPI tiles show the real total rather than the size of the page on screen.
   */
  count: async (isActive?: 'true' | 'false'): Promise<number> => {
    const { meta } = await request<ApiFaq[]>('/cms/faqs', { query: { page: 1, limit: 1, isActive } });
    return meta?.total ?? 0;
  },
};
