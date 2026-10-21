/* Course Master API (backend /api/v1/lms/courses). */
import { request, type PageMeta } from '../../../../services/api-client';
import type { MasterQuery } from '../../../cms/components/MasterTable';
import type {
  ApiLmsCourse, ApiLmsCourseDetail, CourseLanguageOptions, CourseStatus, CreateLmsCourseInput, UpdateLmsCourseInput,
} from '../types/course.types';

const enc = encodeURIComponent;
const BASE = '/lms/courses';

export interface LmsCourseQuery extends MasterQuery {
  /* '' = no filter. `status` (MasterQuery) is the Active / Inactive switch; `lifecycle` the course status. */
  entityId: string;
  lifecycle: '' | CourseStatus;
  /* true: ONLY the soft-deleted courses (?deleted=true, the "Show deleted" view, restored from the list). */
  deleted: boolean;
}

export interface LmsCourseFilters {
  isActive?: 'true' | 'false';
  entityId?: string;
  lifecycle?: '' | CourseStatus;
}

const filterParams = (f: LmsCourseFilters) => ({
  isActive: f.isActive,
  entityId: f.entityId || undefined,
  status: f.lifecycle || undefined,
});

/* MasterQuery to request parameters. An empty filter means "any", so it is left off entirely. */
const listParams = (q: LmsCourseQuery) => ({
  page: q.page,
  limit: q.limit,
  search: q.search || undefined,
  sortBy: q.sortBy,
  sortOrder: q.sortOrder,
  ...filterParams({ isActive: q.status === '' ? undefined : q.status, entityId: q.entityId, lifecycle: q.lifecycle }),
  deleted: q.deleted ? 'true' : undefined,
});

export interface LmsCoursePage {
  items: ApiLmsCourse[];
  meta?: PageMeta;
  /* True when the rows came from the deleted=true listing: every one of them is soft-deleted. */
  deleted?: boolean;
}

export const courseService = {
  list: async (q: LmsCourseQuery): Promise<LmsCoursePage> => {
    const { data, meta } = await request<ApiLmsCourse[]>(BASE, { query: listParams(q) });
    return { items: data, meta, deleted: q.deleted };
  },

  /* The course with its modules (1 to 4), the missing module numbers and what references it. */
  get: async (id: string): Promise<ApiLmsCourseDetail> => (await request<ApiLmsCourseDetail>(`${BASE}/${enc(id)}`)).data,

  create: async (input: CreateLmsCourseInput): Promise<ApiLmsCourseDetail> =>
    (await request<ApiLmsCourseDetail>(BASE, { method: 'POST', body: input })).data,

  update: async (id: string, input: UpdateLmsCourseInput): Promise<ApiLmsCourseDetail> =>
    (await request<ApiLmsCourseDetail>(`${BASE}/${enc(id)}`, { method: 'PATCH', body: input })).data,

  /* The Active / Inactive switch (an inactive course leaves the dropdowns). */
  setStatus: async (id: string, isActive: boolean): Promise<ApiLmsCourseDetail> =>
    (await request<ApiLmsCourseDetail>(`${BASE}/${enc(id)}/status`, { method: 'PATCH', body: { isActive } })).data,

  /* F-LMS-06-06 Retire: PUBLISHED → RETIRED (lms-courses.delete). */
  retire: async (id: string): Promise<ApiLmsCourseDetail> =>
    (await request<ApiLmsCourseDetail>(`${BASE}/${enc(id)}/retire`, { method: 'POST' })).data,

  /* Soft delete of a DRAFT course with no programme modules. */
  remove: async (id: string): Promise<void> => {
    await request<null>(`${BASE}/${enc(id)}`, { method: 'DELETE' });
  },

  /* Brings a deleted course back, inactive. */
  restore: async (id: string): Promise<ApiLmsCourseDetail> =>
    (await request<ApiLmsCourseDetail>(`${BASE}/${enc(id)}/restore`, { method: 'POST' })).data,

  /* How many courses match a filter, read from the pagination meta of a one-row page (KPI tiles). */
  count: async (filters: LmsCourseFilters = {}): Promise<number> => {
    const { meta } = await request<ApiLmsCourse[]>(BASE, { query: { page: 1, limit: 1, ...filterParams(filters) } });
    return meta?.total ?? 0;
  },

  /*
   * The languages a course of this entity may use (F-LMS-06-05): the entity's enabled languages in platform order,
   * exactly what the server accepts, and its default language (lms-courses.view / .create / .update).
   */
  languages: async (entityId: string): Promise<CourseLanguageOptions> =>
    (await request<CourseLanguageOptions>(`${BASE}/languages`, { query: { entityId } })).data,
};
