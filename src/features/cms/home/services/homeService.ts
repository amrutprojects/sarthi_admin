/* Home page figures API (backend /api/v1/cms/home). */
import { request } from '../../../../services/api-client';
import type { ApiHomeGlance, UpdateHomeGlanceInput } from '../types/home.types';

/*
 * PATCH rather than PUT: only the district count is writable. The other three figures are summed
 * from the modules, so changing them means editing the Modules page.
 */
export const homeService = {
  get: async (): Promise<ApiHomeGlance> => (await request<ApiHomeGlance>('/cms/home')).data,

  update: async (input: UpdateHomeGlanceInput): Promise<ApiHomeGlance> =>
    (await request<ApiHomeGlance>('/cms/home', { method: 'PATCH', body: input })).data,
};
