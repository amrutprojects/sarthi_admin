/* SARTHI Schemes API (backend /api/v1/cms/schemes). */
import { request } from '../../../../services/api-client';
import type { ApiScheme, ApiSchemesSection, SchemeInput, UpdateSchemesSectionInput } from '../types/schemes.types';

const enc = encodeURIComponent;

export const schemesService = {
  /* Every scheme, hidden ones included, in display order. The list is short, so it is not paged. */
  list: async (): Promise<ApiScheme[]> => (await request<ApiScheme[]>('/cms/schemes')).data,

  get: async (id: string): Promise<ApiScheme> => (await request<ApiScheme>(`/cms/schemes/${enc(id)}`)).data,

  /*
   * `idempotencyKey` identifies one submission of the Add form: a retry of the same submission (a
   * double click, a lost response) is answered with the first result instead of adding the scheme twice.
   */
  create: async (input: SchemeInput, idempotencyKey: string): Promise<ApiScheme> =>
    (await request<ApiScheme>('/cms/schemes', { method: 'POST', body: input, idempotencyKey })).data,

  /* A partial update: only the keys in `input` change, so an untouched field can never be cleared. */
  update: async (id: string, input: SchemeInput): Promise<ApiScheme> =>
    (await request<ApiScheme>(`/cms/schemes/${enc(id)}`, { method: 'PATCH', body: input })).data,

  setStatus: async (id: string, isActive: boolean): Promise<ApiScheme> =>
    (await request<ApiScheme>(`/cms/schemes/${enc(id)}/status`, { method: 'PATCH', body: { isActive } })).data,

  remove: async (id: string): Promise<void> => {
    await request<null>(`/cms/schemes/${enc(id)}`, { method: 'DELETE' });
  },

  /* The whole list in its new order, by id. A 409 means someone added or deleted a scheme meanwhile. */
  reorder: async (ids: string[]): Promise<ApiScheme[]> =>
    (await request<ApiScheme[]>('/cms/schemes/order', { method: 'PUT', body: { ids } })).data,

  getSection: async (): Promise<ApiSchemesSection> => (await request<ApiSchemesSection>('/cms/schemes/settings')).data,

  updateSection: async (input: UpdateSchemesSectionInput): Promise<ApiSchemesSection> =>
    (await request<ApiSchemesSection>('/cms/schemes/settings', { method: 'PUT', body: input })).data,
};
