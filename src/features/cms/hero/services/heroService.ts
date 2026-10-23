/* Home Hero Section API (backend /api/v1/cms/hero). */
import { request } from '../../../../services/api-client';
import type { ApiHomeHero, UpdateHomeHeroInput } from '../types/hero.types';

/*
 * A singleton, so there is no list, no id in the path and no create: the row is written once by
 * the database seed and edited from then on. PUT replaces the section and its slides, and writes the
 * glance card's district count when it is sent, in one backend transaction.
 */
export const heroService = {
  get: async (): Promise<ApiHomeHero> => (await request<ApiHomeHero>('/cms/hero')).data,

  update: async (input: UpdateHomeHeroInput): Promise<ApiHomeHero> =>
    (await request<ApiHomeHero>('/cms/hero', { method: 'PUT', body: input })).data,

  setPublished: async (isPublished: boolean): Promise<ApiHomeHero> =>
    (await request<ApiHomeHero>('/cms/hero/status', { method: 'PATCH', body: { isPublished } })).data,
};
