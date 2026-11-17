/* Programme Progress – Live Dashboard API (backend /api/v1/cms/live-dashboard). */
import { request } from '../../../../services/api-client';
import type {
  ApiLiveDashboardCard,
  ApiLiveDashboardDistrict,
  ApiLiveDashboardSettings,
  ApiLiveDashboardStat,
  LiveDashboardCardInput,
  LiveDashboardDistrictInput,
  LiveDashboardStatInput,
  UpdateLiveDashboardSettingsInput,
} from '../types/livedashboard.types';

const BASE = '/cms/live-dashboard';
const enc = encodeURIComponent;

/*
 * The KPI cards and the side figures are the same kind of list under two paths: every row (inactive ones too) in
 * display order, not paged because the lists are short. `idempotencyKey` identifies one submission of an Add form,
 * so a retry of it (a double click, a lost response) is answered with the first result instead of adding the row
 * twice. A reorder sends the whole list by id; a 409 means someone added or deleted a row meanwhile.
 */
function listApi<T, I>(path: string) {
  return {
    list: async (): Promise<T[]> => (await request<T[]>(`${BASE}/${path}`)).data,
    get: async (id: string): Promise<T> => (await request<T>(`${BASE}/${path}/${enc(id)}`)).data,
    create: async (input: I, idempotencyKey: string): Promise<T> =>
      (await request<T>(`${BASE}/${path}`, { method: 'POST', body: input, idempotencyKey })).data,
    /* A partial update: only the keys in `input` change, so an untouched field can never be cleared. */
    update: async (id: string, input: I): Promise<T> =>
      (await request<T>(`${BASE}/${path}/${enc(id)}`, { method: 'PATCH', body: input })).data,
    setStatus: async (id: string, isActive: boolean): Promise<T> =>
      (await request<T>(`${BASE}/${path}/${enc(id)}/status`, { method: 'PATCH', body: { isActive } })).data,
    remove: async (id: string): Promise<void> => {
      await request<null>(`${BASE}/${path}/${enc(id)}`, { method: 'DELETE' });
    },
    reorder: async (ids: string[]): Promise<T[]> => (await request<T[]>(`${BASE}/${path}/order`, { method: 'PUT', body: { ids } })).data,
  };
}

export const liveDashboardCardsService = listApi<ApiLiveDashboardCard, LiveDashboardCardInput>('cards');
export const liveDashboardStatsService = listApi<ApiLiveDashboardStat, LiveDashboardStatInput>('stats');

export const liveDashboardService = {
  getSettings: async (): Promise<ApiLiveDashboardSettings> => (await request<ApiLiveDashboardSettings>(`${BASE}/settings`)).data,

  /* Everything but the section's own "Show on website" switch, which only PUT /cms/section-visibility changes. */
  updateSettings: async (input: UpdateLiveDashboardSettingsInput): Promise<ApiLiveDashboardSettings> =>
    (await request<ApiLiveDashboardSettings>(`${BASE}/settings`, { method: 'PUT', body: input })).data,

  /* The 36 districts of the map, in display order. Fixed: they are edited, never added or deleted. */
  listDistricts: async (): Promise<ApiLiveDashboardDistrict[]> => (await request<ApiLiveDashboardDistrict[]>(`${BASE}/districts`)).data,

  /* By the district's code, e.g. "PUN"; only the figures in `input` change. */
  updateDistrict: async (code: string, input: LiveDashboardDistrictInput): Promise<ApiLiveDashboardDistrict> =>
    (await request<ApiLiveDashboardDistrict>(`${BASE}/districts/${enc(code)}`, { method: 'PATCH', body: input })).data,
};
