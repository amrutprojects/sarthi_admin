/* Page Banners API (backend /api/v1/cms/page-banners). */
import { request } from '../../../../services/api-client';
import type { PageBanner, UpdatePageBannerInput } from '../types/pagebanners.types';

export const pageBannersService = {
  /* The five pages' banners, in list order, each half its own text or null for the website's default. */
  list: async (): Promise<PageBanner[]> => (await request<PageBanner[]>('/cms/page-banners')).data,

  /*
   * Changes one page's banner title, subtitle or both (null puts the website's default back). The server answers
   * 403 without cms-pagebanners.update, and 422 for an unknown key or naming the half that is missing or too long
   * (body.title.mr, body.subtitle.en, …).
   */
  update: async (key: string, body: UpdatePageBannerInput): Promise<PageBanner> =>
    (await request<PageBanner>(`/cms/page-banners/${encodeURIComponent(key)}`, { method: 'PUT', body })).data,
};
