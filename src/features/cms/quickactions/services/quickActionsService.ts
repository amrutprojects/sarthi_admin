/* Quick Actions API (backend /api/v1/cms/quick-actions). */
import { request } from '../../../../services/api-client';
import type { ApiQuickAction, QuickActionInput } from '../types/quickactions.types';

const enc = encodeURIComponent;

export const quickActionsService = {
  /* Every tile, hidden ones included, in display order. The list is short, so it is not paged. */
  list: async (): Promise<ApiQuickAction[]> => (await request<ApiQuickAction[]>('/cms/quick-actions')).data,

  get: async (id: string): Promise<ApiQuickAction> => (await request<ApiQuickAction>(`/cms/quick-actions/${enc(id)}`)).data,

  /*
   * `idempotencyKey` identifies one submission of the Add form: a retry of the same submission (a
   * double click, a lost response) is answered with the first result instead of adding the tile twice.
   */
  create: async (input: QuickActionInput, idempotencyKey: string): Promise<ApiQuickAction> =>
    (await request<ApiQuickAction>('/cms/quick-actions', { method: 'POST', body: input, idempotencyKey })).data,

  /* A partial update: only the keys in `input` change, so an untouched field can never be cleared. */
  update: async (id: string, input: QuickActionInput): Promise<ApiQuickAction> =>
    (await request<ApiQuickAction>(`/cms/quick-actions/${enc(id)}`, { method: 'PATCH', body: input })).data,

  setStatus: async (id: string, isActive: boolean): Promise<ApiQuickAction> =>
    (await request<ApiQuickAction>(`/cms/quick-actions/${enc(id)}/status`, { method: 'PATCH', body: { isActive } })).data,

  remove: async (id: string): Promise<void> => {
    await request<null>(`/cms/quick-actions/${enc(id)}`, { method: 'DELETE' });
  },

  /* The whole list in its new order, by id. A 409 means someone added or deleted a tile meanwhile. */
  reorder: async (ids: string[]): Promise<ApiQuickAction[]> =>
    (await request<ApiQuickAction[]>('/cms/quick-actions/order', { method: 'PUT', body: { ids } })).data,
};
