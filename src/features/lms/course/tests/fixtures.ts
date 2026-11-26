import type { ApiLmsCourseDetail, CourseLanguageOptions, CourseModuleSummary } from '../types/course.types';

/* Test data shaped exactly like the /api/v1/lms/courses responses. */
export const AT = '2026-10-01T10:00:00.000Z';
export const ENTITY_ID = '6f1c2a3e-0b7d-4c55-9a51-0d3e8f2b7c11';
export const ENTITY_2 = '0a9b8c7d-6e5f-4a3b-8c1d-2e3f4a5b6c7d';

export const module = (n: number, over: Partial<CourseModuleSummary> = {}): CourseModuleSummary => ({
  id: `m${n}`,
  moduleNumber: n,
  title: n === 1 ? 'Personality Development, Communication, Programme Orientation & Entrepreneurship Foundation' : 'Basic Information Technology Skills',
  coreHours: 60,
  oftHoursMin: 42,
  oftHoursMax: 48,
  syllabusRef: n === 1 ? 'Final syllabus M1 v1.0' : null,
  status: 'DRAFT',
  isActive: true,
  ...over,
});

export const course = (over: Partial<ApiLmsCourseDetail> = {}): ApiLmsCourseDetail => ({
  id: 'co1',
  entityId: ENTITY_ID,
  entity: { id: ENTITY_ID, name: 'Sarthi', code: 'AMK' },
  code: 'AK-PROG',
  title: 'Sarthi Programme',
  description: '<p>Four-module <strong>skilling</strong> programme.</p>',
  languages: ['en', 'mr'],
  status: 'DRAFT',
  publishedReleaseId: null,
  publishedReleaseNo: null,
  isActive: true,
  createdAt: AT,
  updatedAt: AT,
  modules: [module(1), module(2)],
  missingModuleNumbers: [3, 4],
  hasAllModules: false,
  references: [{ label: '2 programme modules', count: 2 }],
  ...over,
});

export const entityOptions = [
  { id: ENTITY_ID, name: 'Sarthi', code: 'AMK' },
  { id: ENTITY_2, name: 'Pilot Entity', code: 'PILOT' },
];

/* GET /lms/courses/languages: the entity enables English and Marathi, Marathi is its default. */
export const entityLanguages: CourseLanguageOptions = {
  defaultLanguage: 'mr',
  languages: [{ code: 'en', label: 'English' }, { code: 'mr', label: 'Marathi' }],
};

export const page = <T,>(items: T[]) => ({ items, meta: { page: 1, limit: 15, total: items.length, totalPages: 1 } });

/* The panel's toasts are written into #toast-root (index.html); a test page has to provide it. */
export const ensureToastRoot = () => {
  if (!document.getElementById('toast-root')) {
    const root = document.createElement('div');
    root.id = 'toast-root';
    document.body.appendChild(root);
  }
};
