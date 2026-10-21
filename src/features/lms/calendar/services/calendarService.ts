/* Academic Calendar and learning configuration API (backend /api/v1/lms/calendars). */
import { request, type PageMeta } from '../../../../services/api-client';
import type { MasterQuery } from '../../../cms/components/MasterTable';
import type {
  ApiLmsCalendar, CalendarType, CreateLmsCalendarInput, LmsCalendarFormOptions, UpdateLmsCalendarInput,
} from '../types/calendar.types';
import type { LearningConfigView, UpdateLearningConfigInput } from '../types/learningConfig.types';

const enc = encodeURIComponent;
const BASE = '/lms/calendars';

export interface LmsCalendarQuery extends MasterQuery {
  /* '' = no filter. */
  entityId: string;
  centreId: string;
  type: '' | CalendarType;
  /* Calendars whose period touches this calendar year ('' = any). */
  year: string;
  /* true: ONLY the soft-deleted calendars (?deleted=true, the "Show deleted" view, restored from the list). */
  deleted: boolean;
}

export interface LmsCalendarFilters {
  isActive?: 'true' | 'false';
  entityId?: string;
  centreId?: string;
  type?: '' | CalendarType;
  year?: string;
}

const filterParams = (f: LmsCalendarFilters) => ({
  isActive: f.isActive,
  entityId: f.entityId || undefined,
  centreId: f.centreId || undefined,
  type: f.type || undefined,
  year: f.year || undefined,
});

/* MasterQuery to request parameters. An empty filter means "any", so it is left off entirely. */
const listParams = (q: LmsCalendarQuery) => ({
  page: q.page,
  limit: q.limit,
  search: q.search || undefined,
  sortBy: q.sortBy,
  sortOrder: q.sortOrder,
  ...filterParams({ isActive: q.status === '' ? undefined : q.status, entityId: q.entityId, centreId: q.centreId, type: q.type, year: q.year }),
  deleted: q.deleted ? 'true' : undefined,
});

export interface LmsCalendarPage {
  items: ApiLmsCalendar[];
  meta?: PageMeta;
  /* True when the rows came from the deleted=true listing: every one of them is soft-deleted. */
  deleted?: boolean;
}

export const calendarService = {
  list: async (q: LmsCalendarQuery): Promise<LmsCalendarPage> => {
    const { data, meta } = await request<ApiLmsCalendar[]>(BASE, { query: listParams(q) });
    return { items: data, meta, deleted: q.deleted };
  },

  /* The calendar with its holidays (date order). */
  get: async (id: string): Promise<ApiLmsCalendar> => (await request<ApiLmsCalendar>(`${BASE}/${enc(id)}`)).data,

  create: async (input: CreateLmsCalendarInput): Promise<ApiLmsCalendar> =>
    (await request<ApiLmsCalendar>(BASE, { method: 'POST', body: input })).data,

  update: async (id: string, input: UpdateLmsCalendarInput): Promise<ApiLmsCalendar> =>
    (await request<ApiLmsCalendar>(`${BASE}/${enc(id)}`, { method: 'PATCH', body: input })).data,

  setStatus: async (id: string, isActive: boolean): Promise<ApiLmsCalendar> =>
    (await request<ApiLmsCalendar>(`${BASE}/${enc(id)}/status`, { method: 'PATCH', body: { isActive } })).data,

  /* Archive (soft delete). The holidays are kept, so a restore brings them back. */
  remove: async (id: string): Promise<void> => {
    await request<null>(`${BASE}/${enc(id)}`, { method: 'DELETE' });
  },

  /* Brings an archived calendar back, inactive. */
  restore: async (id: string): Promise<ApiLmsCalendar> => (await request<ApiLmsCalendar>(`${BASE}/${enc(id)}/restore`, { method: 'POST' })).data,

  /* How many calendars match a filter, read from the pagination meta of a one-row page (KPI tiles). */
  count: async (filters: LmsCalendarFilters = {}): Promise<number> => {
    const { meta } = await request<ApiLmsCalendar[]>(BASE, { query: { page: 1, limit: 1, ...filterParams(filters) } });
    return meta?.total ?? 0;
  },

  formOptions: async (): Promise<LmsCalendarFormOptions> => (await request<LmsCalendarFormOptions>(`${BASE}/form-options`)).data,

  /* Every learning-configuration key of the entity, with its value, source and To Be Confirmed flag. */
  learningConfig: async (entityId: string): Promise<LearningConfigView> =>
    (await request<LearningConfigView>(`${BASE}/learning-config`, { query: { entityId } })).data,

  /* Sets one key (one mode, or both when mode is omitted). Answers with that key's rows. */
  updateLearningConfig: async (key: string, input: UpdateLearningConfigInput): Promise<LearningConfigView> =>
    (await request<LearningConfigView>(`${BASE}/learning-config/${enc(key)}`, { method: 'PATCH', body: input })).data,
};
