/* Programme Page Management API (backend /api/v1/cms/programme). */
import { request } from '../../../../services/api-client';
import type { ApiProgrammePage, UpdateProgrammePageInput } from '../types/programme.types';

/*
 * The Programme page is a singleton, like the Modules page: no list, no id in the path and no create. The row is
 * written once by the database seed (with the website's current text) and edited from then on.
 */
export const programmeService = {
  get: async (): Promise<ApiProgrammePage> => (await request<ApiProgrammePage>('/cms/programme')).data,

  update: async (input: UpdateProgrammePageInput): Promise<ApiProgrammePage> =>
    (await request<ApiProgrammePage>('/cms/programme', { method: 'PUT', body: input })).data,

  /* Visibility has its own endpoint so it can be toggled without resubmitting the content. */
  setPublished: async (isPublished: boolean): Promise<ApiProgrammePage> =>
    (await request<ApiProgrammePage>('/cms/programme/status', { method: 'PATCH', body: { isPublished } })).data,

  /*
   * Shows or hides one row of the website's fact sheet; nothing else changes. Answers with the whole page, as the GET
   * does. The server answers 403 without cms-programme.update and 422 for an unknown key.
   */
  setFactVisibility: async (key: string, show: boolean): Promise<ApiProgrammePage> =>
    (await request<ApiProgrammePage>(`/cms/programme/facts/${encodeURIComponent(key)}`, { method: 'PATCH', body: { show } })).data,
};
