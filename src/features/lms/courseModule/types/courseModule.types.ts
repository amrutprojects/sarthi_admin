/*
 * Module Master (AMRUT_KALASH_03 L-06 / FR-306, form F-LMS-07 Table 32), as /api/v1/lms/course-modules returns
 * and accepts it. Mirrors backend src/lms/course-module/course-module.types.ts and course-module.constants.ts.
 */

/* F-LMS-07-01: a course has exactly four programme modules, numbered 1 to 4 (BRL-310). */
export const MODULE_NUMBERS = [1, 2, 3, 4] as const;
export type ModuleNumber = (typeof MODULE_NUMBERS)[number];

/* L-06 lifecycle "DRAFT → PUBLISHED → RETIRED", set through content releases (L-30), never by this form. */
export const MODULE_STATUSES = ['DRAFT', 'PUBLISHED', 'RETIRED'] as const;
export type ModuleStatus = (typeof MODULE_STATUSES)[number];

export const MODULE_STATUS_LABELS: Record<ModuleStatus, string> = { DRAFT: 'Draft', PUBLISHED: 'Published', RETIRED: 'Retired' };
export const MODULE_STATUS_TONES: Record<ModuleStatus, string> = { DRAFT: 'grey', PUBLISHED: 'green', RETIRED: 'amber' };

/* The course as shown next to a module. */
export interface ModuleCourseSummary {
  id: string;
  code: string;
  title: string;
  entityId: string;
}

/* The values F-LMS-07 stores. null = not entered yet (each may stay empty until release). */
export interface ModuleHours {
  coreHours: number | null;
  syllabusRef: string | null;
  sessions: number | null;
  sessionHours: number | null;
  lectureHours: number | null;
  practicalHours: number | null;
  oftHoursMin: number | null;
  oftHoursMax: number | null;
}

/* One kind of LMS record using the module, e.g. { label: '2 track variants', count: 2 } (detail only). */
export interface CourseModuleReference {
  label: string;
  count: number;
}

/* The "Required before release" fields still empty, as the API names them. */
export type ReleaseField = 'coreHours' | 'syllabusRef' | 'deliveryPattern' | 'oftHours';

export const RELEASE_FIELD_LABELS: Record<ReleaseField, string> = {
  coreHours: 'Core hours',
  syllabusRef: 'Syllabus reference',
  deliveryPattern: 'Delivery pattern (sessions × session hours, or lecture + practical hours)',
  oftHours: 'OFT hours range',
};

/* API shape of a programme module (list rows and detail). */
export interface ApiCourseModule extends ModuleHours {
  id: string;
  courseId: string;
  course: ModuleCourseSummary | null;
  moduleNumber: number;
  title: string;
  description: string | null;
  status: ModuleStatus;
  missingForRelease: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  /* GET /:id only. */
  references?: CourseModuleReference[];
}

/* One of the four prescribed modules of the final syllabus documents (section 2.1, Table 7). */
export interface PrescribedModule {
  moduleNumber: ModuleNumber;
  title: string;
  coreHours: number;
  sessions: number | null;
  sessionHours: number | null;
  lectureHours: number | null;
  practicalHours: number | null;
  oftHoursMin: number;
  oftHoursMax: number;
  syllabusRef: null;
  description: null;
  /* Read-only information, not stored on the module record. */
  structure: { units?: number; assignments?: number; oftAssignments?: number; note?: string };
  formalAssessment: string;
}

/* GET /lms/course-modules/prescribed. */
export interface PrescribedModulesResponse {
  modules: PrescribedModule[];
  /* false while OQ-012 (approval of the syllabus values by the competent authority) is open. */
  confirmedByCompetentAuthority: boolean;
  source: string;
}

/* POST /lms/course-modules/prescribed. */
export interface PrescribedModulesResult {
  courseId: string;
  /* Module numbers created by this call; empty when the course already had all four. */
  created: number[];
  modules: ApiCourseModule[];
}

export interface CreatePrescribedModulesInput {
  courseId: string;
  syllabusRef: string;
}

export interface CreateCourseModuleInput extends Partial<ModuleHours> {
  courseId: string;
  moduleNumber: number;
  title: string;
  description?: string | null;
  isActive?: boolean;
}

/* undefined = not sent (left alone); null = cleared. Course and module number are fixed on creation. */
export interface UpdateCourseModuleInput extends Partial<ModuleHours> {
  title?: string;
  description?: string | null;
  /* F-LMS-07-04: a change of the core hours needs a reason (kept in the audit record). */
  reason?: string;
}

/* Field names of the module form, used to key validation and server messages. */
export const COURSE_MODULE_FIELDS = [
  'courseId', 'moduleNumber', 'title', 'description', 'coreHours', 'syllabusRef', 'sessions', 'sessionHours',
  'lectureHours', 'practicalHours', 'oftHoursMin', 'oftHoursMax', 'reason',
] as const;
export type CourseModuleField = (typeof COURSE_MODULE_FIELDS)[number];
