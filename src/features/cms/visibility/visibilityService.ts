/* Section visibility API (backend /api/v1/cms/section-visibility). */
import { request } from '../../../services/api-client';
import type { SectionVisibility, SectionVisibilityKey, UpdateSectionVisibilityInput } from './visibility.types';

export const visibilityService = {
  /* Every section whose menu the user may view, in Home Page Management's tab order. */
  list: async (): Promise<SectionVisibility[]> => (await request<SectionVisibility[]>('/cms/section-visibility')).data,

  /*
   * Shows or hides one section on the public website. Only that section's switch changes, none of its content;
   * the server answers 403 without the menu's update permission and 404 while the section is not configured.
   */
  set: async (key: SectionVisibilityKey, visible: boolean): Promise<SectionVisibility> => {
    const body: UpdateSectionVisibilityInput = { visible };
    return (await request<SectionVisibility>(`/cms/section-visibility/${encodeURIComponent(key)}`, { method: 'PUT', body })).data;
  },
};
