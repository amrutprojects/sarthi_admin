/* Footer Management API (backend /api/v1/cms/footer). */
import { request } from '../../../../services/api-client';
import type { ApiFooter, UpdateFooterInput } from '../types/footer.types';

/*
 * The footer configuration is a singleton, so there is no list, no id in the path and no create:
 * the row is written once by the database seed and edited from then on. PUT replaces the text,
 * the columns and every link in one backend transaction.
 */
export const footerService = {
  get: async (): Promise<ApiFooter> => (await request<ApiFooter>('/cms/footer')).data,

  update: async (input: UpdateFooterInput): Promise<ApiFooter> =>
    (await request<ApiFooter>('/cms/footer', { method: 'PUT', body: input })).data,

  /* Visibility has its own endpoint so it can be toggled without resubmitting the content. */
  setPublished: async (isPublished: boolean): Promise<ApiFooter> =>
    (await request<ApiFooter>('/cms/footer/status', { method: 'PATCH', body: { isPublished } })).data,
};
