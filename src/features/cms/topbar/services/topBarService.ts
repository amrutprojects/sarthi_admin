/* Top Bar API (backend /api/v1/cms/top-bar). */
import { request } from '../../../../services/api-client';
import type { ApiTopBarLink, ApiTopBarSettings, TopBarLinkInput, UpdateTopBarSettingsInput } from '../types/topbar.types';

const enc = encodeURIComponent;

export const topBarService = {
  /* Every link, hidden ones included, in display order. The list is short, so it is not paged. */
  list: async (): Promise<ApiTopBarLink[]> => (await request<ApiTopBarLink[]>('/cms/top-bar')).data,

  get: async (id: string): Promise<ApiTopBarLink> => (await request<ApiTopBarLink>(`/cms/top-bar/${enc(id)}`)).data,

  /*
   * `idempotencyKey` identifies one submission of the Add form: a retry of the same submission (a
   * double click, a lost response) is answered with the first result instead of adding the link twice.
   */
  create: async (input: TopBarLinkInput, idempotencyKey: string): Promise<ApiTopBarLink> =>
    (await request<ApiTopBarLink>('/cms/top-bar', { method: 'POST', body: input, idempotencyKey })).data,

  /* A partial update: only the keys in `input` change, so an untouched field can never be cleared. */
  update: async (id: string, input: TopBarLinkInput): Promise<ApiTopBarLink> =>
    (await request<ApiTopBarLink>(`/cms/top-bar/${enc(id)}`, { method: 'PATCH', body: input })).data,

  setStatus: async (id: string, isActive: boolean): Promise<ApiTopBarLink> =>
    (await request<ApiTopBarLink>(`/cms/top-bar/${enc(id)}/status`, { method: 'PATCH', body: { isActive } })).data,

  remove: async (id: string): Promise<void> => {
    await request<null>(`/cms/top-bar/${enc(id)}`, { method: 'DELETE' });
  },

  /* The whole list in its new order, by id. A 409 means someone added or deleted a link meanwhile. */
  reorder: async (ids: string[]): Promise<ApiTopBarLink[]> =>
    (await request<ApiTopBarLink[]>('/cms/top-bar/order', { method: 'PUT', body: { ids } })).data,

  getSettings: async (): Promise<ApiTopBarSettings> => (await request<ApiTopBarSettings>('/cms/top-bar/settings')).data,

  updateSettings: async (input: UpdateTopBarSettingsInput): Promise<ApiTopBarSettings> =>
    (await request<ApiTopBarSettings>('/cms/top-bar/settings', { method: 'PUT', body: input })).data,
};
