/* Contact Page Management API (backend /api/v1/cms/contact). */
import { request } from '../../../../services/api-client';
import type { ApiContactPage, UpdateContactPageInput } from '../types/contact.types';

/*
 * The Contact page configuration is a singleton, so there is no list, no id in the path and no
 * create: the row is written once by the database seed and edited from then on. PUT replaces the
 * banner and every card in one backend transaction.
 */
export const contactService = {
  get: async (): Promise<ApiContactPage> => (await request<ApiContactPage>('/cms/contact')).data,

  update: async (input: UpdateContactPageInput): Promise<ApiContactPage> =>
    (await request<ApiContactPage>('/cms/contact', { method: 'PUT', body: input })).data,

  /* Visibility has its own endpoint so it can be toggled without resubmitting the content. */
  setPublished: async (isPublished: boolean): Promise<ApiContactPage> =>
    (await request<ApiContactPage>('/cms/contact/status', { method: 'PATCH', body: { isPublished } })).data,
};
