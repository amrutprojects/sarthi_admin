/* Home Programme Section API (backend /api/v1/cms/highlight). */
import { request } from '../../../../services/api-client';
import type { ApiProgrammeHighlight, Bilingual, UpdateProgrammeHighlightInput } from '../types/highlight.types';

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

  /*
   * Shows or hides one row of the home page band's fact table; nothing else changes. Answers with the whole section, as
   * the GET does. The server answers 403 without cms-highlight.update and 422 for an unknown key.
   */
  setRowVisibility: async (key: string, show: boolean): Promise<ApiProgrammeHighlight> =>
    (await request<ApiProgrammeHighlight>(`/cms/highlight/rows/${encodeURIComponent(key)}`, { method: 'PATCH', body: { show } })).data,

  /*
   * Names one row of the fact table in both languages, or (null) puts its default name back; whether it is shown does
   * not change. Same PATCH and answer as setRowVisibility; a 422 names body.label.mr / body.label.en.
   */
  setRowLabel: async (key: string, label: Bilingual | null): Promise<ApiProgrammeHighlight> =>
    (await request<ApiProgrammeHighlight>(`/cms/highlight/rows/${encodeURIComponent(key)}`, { method: 'PATCH', body: { label } })).data,
};
