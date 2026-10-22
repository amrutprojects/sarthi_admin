/* AMRUT's Impact API (backend /api/v1/cms/impact). */
import { request } from '../../../../services/api-client';
import type { ApiImpactSection, ApiImpactStat, ImpactStatInput, UpdateImpactSectionInput } from '../types/impact.types';

const enc = encodeURIComponent;

export const impactService = {
  /* Every statistic, inactive ones included, in display order. The list is short, so it is not paged. */
  list: async (): Promise<ApiImpactStat[]> => (await request<ApiImpactStat[]>('/cms/impact')).data,

  get: async (id: string): Promise<ApiImpactStat> => (await request<ApiImpactStat>(`/cms/impact/${enc(id)}`)).data,

  /*
   * `idempotencyKey` identifies one submission of the Add form: a retry of the same submission (a
   * double click, a lost response) is answered with the first result instead of adding the card twice.
   */
  create: async (input: ImpactStatInput, idempotencyKey: string): Promise<ApiImpactStat> =>
    (await request<ApiImpactStat>('/cms/impact', { method: 'POST', body: input, idempotencyKey })).data,

  /* A partial update: only the keys in `input` change, so an untouched field can never be cleared. */
  update: async (id: string, input: ImpactStatInput): Promise<ApiImpactStat> =>
    (await request<ApiImpactStat>(`/cms/impact/${enc(id)}`, { method: 'PATCH', body: input })).data,

  setStatus: async (id: string, isActive: boolean): Promise<ApiImpactStat> =>
    (await request<ApiImpactStat>(`/cms/impact/${enc(id)}/status`, { method: 'PATCH', body: { isActive } })).data,

  remove: async (id: string): Promise<void> => {
    await request<null>(`/cms/impact/${enc(id)}`, { method: 'DELETE' });
  },

  /* The whole list in its new order, by id. A 409 means someone added or deleted a card meanwhile. */
  reorder: async (ids: string[]): Promise<ApiImpactStat[]> =>
    (await request<ApiImpactStat[]>('/cms/impact/order', { method: 'PUT', body: { ids } })).data,

  getSection: async (): Promise<ApiImpactSection> => (await request<ApiImpactSection>('/cms/impact/settings')).data,

  updateSection: async (input: UpdateImpactSectionInput): Promise<ApiImpactSection> =>
    (await request<ApiImpactSection>('/cms/impact/settings', { method: 'PUT', body: input })).data,
};
