/* Home Programme Section API (backend /api/v1/cms/highlight). */
import { request } from '../../../../services/api-client';
import type { ApiProgrammeHighlight, UpdateProgrammeHighlightInput } from '../types/highlight.types';

/*
 * A singleton, so there is no list, no id in the path and no create: the row is written once by
 * the database seed and edited from then on. PUT replaces the section and its objectives in one
 * backend transaction. The tab's "Show on website" switch uses the section visibility API instead
 * (features/cms/visibility).
 */
export const highlightService = {
  get: async (): Promise<ApiProgrammeHighlight> => (await request<ApiProgrammeHighlight>('/cms/highlight')).data,

  update: async (input: UpdateProgrammeHighlightInput): Promise<ApiProgrammeHighlight> =>
    (await request<ApiProgrammeHighlight>('/cms/highlight', { method: 'PUT', body: input })).data,
};
