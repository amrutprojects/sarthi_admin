import type { CourseOption } from '../../options';
import type { ApiCourseModule, PrescribedModulesResponse } from '../types/courseModule.types';

/* Test data shaped exactly like the /api/v1/lms/course-modules responses. */
export const AT = '2026-10-01T10:00:00.000Z';

export const COURSE_ID = '11111111-1111-4111-8111-111111111111';
export const OTHER_COURSE_ID = '22222222-2222-4222-8222-222222222222';

export const courseModule = (over: Partial<ApiCourseModule> = {}): ApiCourseModule => ({
  id: 'm1',
  courseId: COURSE_ID,
  course: { id: COURSE_ID, code: 'AKP', title: 'Amrut Kalash Programme', entityId: 'e1' },
  moduleNumber: 1,
  title: 'Personality Development and Communication',
  description: null,
  coreHours: 60,
  syllabusRef: 'Final syllabus v1',
  sessions: 30,
  sessionHours: 2,
  lectureHours: 22,
  practicalHours: 38,
  oftHoursMin: 42,
  oftHoursMax: 48,
  status: 'DRAFT',
  missingForRelease: [],
  isActive: true,
  createdAt: AT,
  updatedAt: AT,
  ...over,
});

/* Module 2 with nothing entered yet: everything "Required before release" is still missing. */
export const emptyModule = (over: Partial<ApiCourseModule> = {}): ApiCourseModule =>
  courseModule({
    id: 'm2',
    moduleNumber: 2,
    title: 'Basic Information Technology Skills',
    coreHours: null,
    syllabusRef: null,
    sessions: null,
    sessionHours: null,
    lectureHours: null,
    practicalHours: null,
    oftHoursMin: null,
    oftHoursMax: null,
    missingForRelease: ['coreHours', 'syllabusRef', 'deliveryPattern', 'oftHours'],
    ...over,
  });

export const page = <T,>(items: T[]) => ({ items, meta: { page: 1, limit: 15, total: items.length, totalPages: 1 } });

/* GET /lms/courses/options rows. */
export const courseFeed: CourseOption[] = [
  { id: COURSE_ID, code: 'AKP', title: 'Amrut Kalash Programme', entityId: 'e1' },
  { id: OTHER_COURSE_ID, code: 'PIL', title: 'Pilot Programme', entityId: 'e1' },
];

export const prescribed: PrescribedModulesResponse = {
  confirmedByCompetentAuthority: false,
  source: 'Final syllabus documents (draft for review and approval by the competent authority, OQ-012)',
  modules: [
    {
      moduleNumber: 1, title: 'Personality Development, Communication, Programme Orientation & Entrepreneurship Foundation', coreHours: 60,
      sessions: 30, sessionHours: 2, lectureHours: 22, practicalHours: 38, oftHoursMin: 42, oftHoursMax: 48, syllabusRef: null, description: null,
      structure: { units: 5, oftAssignments: 5 }, formalAssessment: 'Assessment 1, after the module',
    },
    {
      moduleNumber: 2, title: 'Basic Information Technology Skills', coreHours: 60, sessions: 30, sessionHours: 2, lectureHours: null, practicalHours: null,
      oftHoursMin: 42, oftHoursMax: 48, syllabusRef: null, description: null, structure: { oftAssignments: 10 },
      formalAssessment: 'Assessment 2, on completion of the module',
    },
    {
      moduleNumber: 3, title: 'Domain-Specific Basic Digital Skills', coreHours: 300, sessions: null, sessionHours: null, lectureHours: 150,
      practicalHours: 150, oftHoursMin: 210, oftHoursMax: 240, syllabusRef: null, description: null, structure: {},
      formalAssessment: 'Track assessment framework (ten components)',
    },
    {
      moduleNumber: 4, title: 'Domain-Specific Advanced Digital Skills', coreHours: 80, sessions: 40, sessionHours: 2, lectureHours: null,
      practicalHours: null, oftHoursMin: 56, oftHoursMax: 64, syllabusRef: null, description: null, structure: { units: 9 },
      formalAssessment: 'Assessment 4, after the module',
    },
  ],
};

/* The panel's toasts are written into #toast-root (index.html); a test page has to provide it. */
export const ensureToastRoot = () => {
  if (!document.getElementById('toast-root')) {
    const root = document.createElement('div');
    root.id = 'toast-root';
    document.body.appendChild(root);
  }
};
