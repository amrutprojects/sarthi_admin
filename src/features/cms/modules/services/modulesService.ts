/* Modules Page Management API (backend /api/v1/cms/modules). */
import { request } from '../../../../services/api-client';
import type { ApiModulesPage, UpdateModulesPageInput } from '../types/modules.types';

/*
 * The Modules page configuration is a singleton, so there is no list, no id in the path and no
 * create: the row is written once by the database seed and edited from then on. PUT replaces the
 * hours, every module card and every elective domain in one backend transaction.
 */
export const modulesService = {
  get: async (): Promise<ApiModulesPage> => (await request<ApiModulesPage>('/cms/modules')).data,

  update: async (input: UpdateModulesPageInput): Promise<ApiModulesPage> =>
    (await request<ApiModulesPage>('/cms/modules', { method: 'PUT', body: input })).data,

  /* Visibility has its own endpoint so it can be toggled without resubmitting the content. */
  setPublished: async (isPublished: boolean): Promise<ApiModulesPage> =>
    (await request<ApiModulesPage>('/cms/modules/status', { method: 'PATCH', body: { isPublished } })).data,
};
