/* Module Master API (backend /api/v1/lms/course-modules). */
import { request, type PageMeta } from '../../../../services/api-client';
import type { MasterQuery } from '../../../cms/components/MasterTable';
import type {
  ApiCourseModule, CreateCourseModuleInput, CreatePrescribedModulesInput, ModuleStatus, PrescribedModulesResponse,
  PrescribedModulesResult, UpdateCourseModuleInput,
} from '../types/courseModule.types';

const enc = encodeURIComponent;
const BASE = '/lms/course-modules';

export interface CourseModuleQuery extends MasterQuery {
  /* '' = no filter. */
  courseId: string;
  moduleNumber: string;
  lifecycle: '' | ModuleStatus;
  /* true: ONLY the soft-deleted modules (?deleted=true, the "Show deleted" view, restored from the list). */
  deleted: boolean;
}

export interface CourseModuleFilters {
  isActive?: 'true' | 'false';
  courseId?: string;
  moduleNumber?: string;
  status?: ModuleStatus;
}

const filterParams = (f: CourseModuleFilters) => ({
  isActive: f.isActive,
  courseId: f.courseId || undefined,
  moduleNumber: f.moduleNumber || undefined,
  status: f.status || undefined,
});

/* MasterQuery to request parameters (?page&limit&search&sortBy&sortOrder&isActive&courseId&moduleNumber&status). */
const listParams = (q: CourseModuleQuery) => ({
  page: q.page,
  limit: q.limit,
  search: q.search || undefined,
  sortBy: q.sortBy,
  sortOrder: q.sortOrder,
  ...filterParams({
    isActive: q.status === '' ? undefined : q.status,
    courseId: q.courseId,
    moduleNumber: q.moduleNumber,
    status: q.lifecycle || undefined,
  }),
  deleted: q.deleted ? 'true' : undefined,
});

export interface CourseModulePage {
  items: ApiCourseModule[];
  meta?: PageMeta;
  /* True when the rows came from the deleted=true listing: every one of them is soft-deleted. */
  deleted?: boolean;
}

/* "Sarthi Programme (AKP)": a course option (lmsOptions.courses) or a module's course summary. */
export const courseLabel = (c: { code: string; title: string }) => (c.code ? `${c.title} (${c.code})` : c.title);

export const courseModuleService = {
  list: async (q: CourseModuleQuery): Promise<CourseModulePage> => {
    const { data, meta } = await request<ApiCourseModule[]>(BASE, { query: listParams(q) });
    return { items: data, meta, deleted: q.deleted };
  },

  /* The (at most four) non-deleted modules of one course, active or not, by number. */
  forCourse: async (courseId: string): Promise<ApiCourseModule[]> =>
    (await request<ApiCourseModule[]>(BASE, { query: { courseId, page: 1, limit: 10, sortBy: 'moduleNumber', sortOrder: 'asc' } })).data,

  get: async (id: string): Promise<ApiCourseModule> => (await request<ApiCourseModule>(`${BASE}/${enc(id)}`)).data,

  create: async (input: CreateCourseModuleInput): Promise<ApiCourseModule> =>
    (await request<ApiCourseModule>(BASE, { method: 'POST', body: input })).data,

  update: async (id: string, input: UpdateCourseModuleInput): Promise<ApiCourseModule> =>
    (await request<ApiCourseModule>(`${BASE}/${enc(id)}`, { method: 'PATCH', body: input })).data,

  setStatus: async (id: string, isActive: boolean): Promise<ApiCourseModule> =>
    (await request<ApiCourseModule>(`${BASE}/${enc(id)}/status`, { method: 'PATCH', body: { isActive } })).data,

  remove: async (id: string): Promise<void> => {
    await request<null>(`${BASE}/${enc(id)}`, { method: 'DELETE' });
  },

  restore: async (id: string): Promise<ApiCourseModule> => (await request<ApiCourseModule>(`${BASE}/${enc(id)}/restore`, { method: 'POST' })).data,

  /* How many modules match a filter, read from the pagination meta of a one-row page (KPI tiles). */
  count: async (filters: CourseModuleFilters = {}): Promise<number> => {
    const { meta } = await request<ApiCourseModule[]>(BASE, { query: { page: 1, limit: 1, ...filterParams(filters) } });
    return meta?.total ?? 0;
  },

  /* The four prescribed modules of the final syllabus documents (defaults the editor offers). */
  prescribed: async (): Promise<PrescribedModulesResponse> => (await request<PrescribedModulesResponse>(`${BASE}/prescribed`)).data,

  /* Creates the prescribed modules the course is missing. message is the server's ("…already has its four modules"). */
  createPrescribed: async (input: CreatePrescribedModulesInput): Promise<PrescribedModulesResult & { message: string }> => {
    const { data, message } = await request<PrescribedModulesResult>(`${BASE}/prescribed`, { method: 'POST', body: input });
    return { ...data, message };
  },
};
