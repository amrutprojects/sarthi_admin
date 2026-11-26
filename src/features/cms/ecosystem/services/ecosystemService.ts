/* The SARTHI Ecosystem API (backend /api/v1/cms/ecosystem). */
import { request } from '../../../../services/api-client';
import type { ApiEcosystemSection, ApiProgramme, ProgrammeInput, UpdateEcosystemSectionInput } from '../types/ecosystem.types';

const enc = encodeURIComponent;

export const ecosystemService = {
  /* Every card, hidden ones included, in display order. The list is short, so it is not paged. */
  list: async (): Promise<ApiProgramme[]> => (await request<ApiProgramme[]>('/cms/ecosystem')).data,

  get: async (id: string): Promise<ApiProgramme> => (await request<ApiProgramme>(`/cms/ecosystem/${enc(id)}`)).data,

  /*
   * `idempotencyKey` identifies one submission of the Add form: a retry of the same submission (a
   * double click, a lost response) is answered with the first result instead of adding the card twice.
   */
  create: async (input: ProgrammeInput, idempotencyKey: string): Promise<ApiProgramme> =>
    (await request<ApiProgramme>('/cms/ecosystem', { method: 'POST', body: input, idempotencyKey })).data,

  /* A partial update: only the keys in `input` change, so an untouched field can never be cleared. */
  update: async (id: string, input: ProgrammeInput): Promise<ApiProgramme> =>
    (await request<ApiProgramme>(`/cms/ecosystem/${enc(id)}`, { method: 'PATCH', body: input })).data,

  setStatus: async (id: string, isActive: boolean): Promise<ApiProgramme> =>
    (await request<ApiProgramme>(`/cms/ecosystem/${enc(id)}/status`, { method: 'PATCH', body: { isActive } })).data,

  remove: async (id: string): Promise<void> => {
    await request<null>(`/cms/ecosystem/${enc(id)}`, { method: 'DELETE' });
  },

  /* The whole list in its new order, by id. A 409 means someone added or deleted a card meanwhile. */
  reorder: async (ids: string[]): Promise<ApiProgramme[]> =>
    (await request<ApiProgramme[]>('/cms/ecosystem/order', { method: 'PUT', body: { ids } })).data,

  getSection: async (): Promise<ApiEcosystemSection> => (await request<ApiEcosystemSection>('/cms/ecosystem/settings')).data,

  updateSection: async (input: UpdateEcosystemSectionInput): Promise<ApiEcosystemSection> =>
    (await request<ApiEcosystemSection>('/cms/ecosystem/settings', { method: 'PUT', body: input })).data,
};
