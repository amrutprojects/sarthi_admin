/*
 * Dropdown feeds of the LMS Admin masters, in one place so no LMS master depends on another master's service.
 *
 * Every feed returns only active, non-deleted rows, A to Z. Centres and tracks are the Admin Panel's records,
 * read by the LMS as reference data (read-only); entities, courses and modules are LMS-owned.
 */
import { request } from '../../services/api-client';
import type { GeoOption } from '../cms/types';

const get = async <T = GeoOption>(path: string, query?: Record<string, string | undefined>): Promise<T[]> =>
  (await request<T[]>(path, query ? { query } : {})).data;

export interface CentreOption extends GeoOption {
  districtName: string | null;
}

/* GET /lms/courses/options rows (backend LmsCourseOption). */
export interface CourseOption {
  id: string;
  code: string;
  title: string;
  entityId: string;
}

/* GET /lms/course-modules/options rows (backend LmsCourseModuleOption). */
export interface CourseModuleOption {
  id: string;
  courseId: string;
  moduleNumber: number;
  title: string;
}

export const lmsOptions = {
  /*
   * Admin Panel reference data (read-only in the LMS). With an entityId, only the centres / tracks enabled for that
   * LMS entity — what the server accepts next to that entity (readable with any picking master's view permission).
   */
  centres: (entityId?: string) => get<CentreOption>('/lms/reference/options/centres', { entityId }),
  tracks: (entityId?: string) => get('/lms/reference/options/tracks', { entityId }),

  /* LMS-owned masters. */
  entities: () => get('/lms/entities/options'),
  courses: (entityId?: string) => get<CourseOption>('/lms/courses/options', { entityId }),
  modules: (courseId: string, moduleNumber?: string) => get<CourseModuleOption>('/lms/course-modules/options', { courseId, moduleNumber }),
};
