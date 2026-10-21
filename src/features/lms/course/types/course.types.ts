/* Course Master (AMRUT_KALASH_03 L-06 / FR-306, form F-LMS-06), as /api/v1/lms/courses returns and accepts it. */

/*
 * Course lifecycle (L-06 "DRAFT → PUBLISHED → RETIRED", F-LMS-06-06). System-set, never sent in a body:
 * DRAFT on creation, PUBLISHED by the first published content release (L-30, not built yet), RETIRED by the
 * Retire action (from PUBLISHED only).
 */
export const COURSE_STATUSES = ['DRAFT', 'PUBLISHED', 'RETIRED'] as const;
export type CourseStatus = (typeof COURSE_STATUSES)[number];

export const COURSE_STATUS_LABELS: Record<CourseStatus, string> = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  RETIRED: 'Retired',
};

/* F-LMS-06-01 / -02 / -04 limits, the same numbers as course.constants.ts and course.validator.ts. */
export const COURSE_CODE_MIN = 2;
export const COURSE_CODE_MAX = 20;
export const COURSE_TITLE_MIN = 3;
export const COURSE_TITLE_MAX = 120;
export const COURSE_DESCRIPTION_MAX = 2000;

/* The four programme modules a course needs before it can be included in a release (L-06 acceptance). */
export const MODULE_NUMBERS = [1, 2, 3, 4] as const;

/* The owner entity as shown next to a course. */
export interface CourseEntitySummary {
  id: string;
  name: string;
  code: string;
}

/* One programme module of the course, as summarised on the course detail (UI-316). */
export interface CourseModuleSummary {
  id: string;
  moduleNumber: number;
  title: string;
  coreHours: number | null;
  oftHoursMin: number | null;
  oftHoursMax: number | null;
  syllabusRef: string | null;
  status: string;
  isActive: boolean;
}

/* One kind of record that points at the course, e.g. { label: '3 programme modules', count: 3 }. */
export interface LmsCourseReference {
  label: string;
  count: number;
}

/* List rows. */
export interface ApiLmsCourse {
  id: string;
  entityId: string;
  /* null when the entity row can no longer be read. */
  entity: CourseEntitySummary | null;
  code: string;
  title: string;
  /* Allow-listed rich text (F-LMS-06-04). */
  description: string | null;
  languages: string[];
  status: CourseStatus;
  /* The latest published content release (L-30 / DB-312). Read-only; null until content releases exist. */
  publishedReleaseId: string | null;
  publishedReleaseNo: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/* GET /lms/courses/:id and every write: the course with its modules and what still references it. */
export interface ApiLmsCourseDetail extends ApiLmsCourse {
  modules: CourseModuleSummary[];
  missingModuleNumbers: number[];
  hasAllModules: boolean;
  references: LmsCourseReference[];
}

export interface CreateLmsCourseInput {
  entityId: string;
  code: string;
  title: string;
  description: string | null;
  /* Left out: the server uses the entity's default language. */
  languages?: string[];
  isActive?: boolean;
}

/* undefined = not sent (left alone); null = cleared. The entity is immutable, status has its own endpoints. */
export interface UpdateLmsCourseInput {
  code?: string;
  title?: string;
  description?: string | null;
  languages?: string[];
}

/* A platform language (To Be Confirmed, OQ-023). */
export interface CourseLanguage {
  code: string;
  label: string;
}

/*
 * GET /lms/courses/languages?entityId=: the entity's enabled languages in platform order (F-LMS-06-05) — exactly
 * what the server accepts for a course of that entity — and its default language.
 */
export interface CourseLanguageOptions {
  defaultLanguage: string;
  languages: CourseLanguage[];
}

/* Field names of the course form, used to key validation messages. */
export const COURSE_FIELDS = ['entityId', 'code', 'title', 'description', 'languages'] as const;
export type CourseField = (typeof COURSE_FIELDS)[number];
