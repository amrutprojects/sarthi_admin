/* Navigation Menu API (backend /api/v1/cms/nav-menu). */
import { request } from '../../../../services/api-client';
import type { Bilingual, NavMenuItem, UpdateNavMenuItemInput } from '../types/navmenu.types';

export const navMenuService = {
  /* Every item of the menu bar, all ten in menu order, each with whether the website shows it. */
  list: async (): Promise<NavMenuItem[]> => (await request<NavMenuItem[]>('/cms/nav-menu')).data,

  /*
   * Shows or hides one item in the menu bar and the mobile menu; nothing else changes. The server answers 403
   * without cms-navmenu.update and 422 for an unknown key.
   */
  set: async (key: string, show: boolean): Promise<NavMenuItem> => {
    const body: UpdateNavMenuItemInput = { show };
    return (await request<NavMenuItem>(`/cms/nav-menu/${encodeURIComponent(key)}`, { method: 'PUT', body })).data;
  },

  /*
   * Renames one item in the menu bar and the mobile menu (both languages at once), or puts the website's default
   * name back with null; whether it is shown does not change. The server answers 422 naming the half that is missing
   * (body.label.mr / body.label.en) or too long.
   */
  setLabel: async (key: string, label: Bilingual | null): Promise<NavMenuItem> => {
    const body: UpdateNavMenuItemInput = { label };
    return (await request<NavMenuItem>(`/cms/nav-menu/${encodeURIComponent(key)}`, { method: 'PUT', body })).data;
  },
};
