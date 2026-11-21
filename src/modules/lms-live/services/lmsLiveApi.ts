import { request } from '../../../services/api-client';
import type {
  AttendanceGroupBy,
  LiveDataState,
  LiveResult,
  LmsAttendance,
  LmsBatch,
  LmsCentre,
  LmsLiveSessions,
  LmsSession,
  LmsTrainer,
} from '../types/lmsLive.types';

/*
 * G-2 calls of the Panel (amrut-kalash-api /api/v1/lms-reads, docs/mt-g2-live-data-setting.md).
 * The live reads answer only while "Show live LMS data" is on; they never fall back to local data, so an error is shown
 * as an error. The LMS key never reaches the browser.
 */
const BASE = '/lms-reads';
/* One page of a list (the LMS caps page_size; the screens show the first page and say how many there are). */
export const LIVE_PAGE_SIZE = 100;

async function live<T>(path: string, query?: Record<string, string | number | undefined>): Promise<LiveResult<T>> {
  const r = await request<T>(`${BASE}${path}`, { query });
  return { data: r.data, meta: r.meta, source: 'live', fetchedAt: r.fetchedAt ?? null };
}

export const lmsLiveApi = {
  /* The switch state ("Live from LMS" or "Local data"). A server without G-2 (404) or a refused user (403) = local. */
  state: async () => (await request<LiveDataState>(`${BASE}/live-data`)).data,
  /* System Settings switch (settings.update; audited on the server). 409 LMS_LIVE_DATA_UNAVAILABLE when it cannot be switched on. */
  setState: async (enabled: boolean) => (await request<LiveDataState>(`${BASE}/live-data`, { method: 'PUT', body: { enabled } })).data,

  centres: () => live<LmsCentre[]>('/centres', { page: 1, limit: LIVE_PAGE_SIZE }),
  batches: () => live<LmsBatch[]>('/batches', { page: 1, limit: LIVE_PAGE_SIZE }),
  sessions: () => live<LmsSession[]>('/sessions', { page: 1, limit: LIVE_PAGE_SIZE }),
  trainers: () => live<LmsTrainer[]>('/trainers', { page: 1, limit: LIVE_PAGE_SIZE }),
  liveSessions: (date?: string) => live<LmsLiveSessions>('/live-sessions', { date }),
  attendance: (groupBy: AttendanceGroupBy) => live<LmsAttendance>('/attendance', { groupBy }),
};
