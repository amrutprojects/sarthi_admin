/* Brand Bar API (backend /api/v1/cms/brand-bar). */
import { request } from '../../../../services/api-client';
import type { ApiBrandBar, UpdateBrandBarInput } from '../types/brandbar.types';

export const brandBarService = {
  /* The one Brand Bar record. A 404 means the database seed has not created it yet. */
  get: async (): Promise<ApiBrandBar> => (await request<ApiBrandBar>('/cms/brand-bar')).data,

  /* The whole bar at once; a 409 means someone else saved since `expectedUpdatedAt`. */
  update: async (input: UpdateBrandBarInput): Promise<ApiBrandBar> =>
    (await request<ApiBrandBar>('/cms/brand-bar', { method: 'PUT', body: input })).data,
};
