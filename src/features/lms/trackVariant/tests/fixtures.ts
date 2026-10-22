import type {
  ApiOftCard, ApiPhase, ApiTrackModule, ApiTrackVariant, ItemPath, TrackVariantCompleteness, TrackVariantFormOptions,
} from '../types/trackVariant.types';

/* Test data shaped exactly like the /api/v1/lms/track-variants responses. */
export const AT = '2026-10-01T10:00:00.000Z';

export const formOptions: TrackVariantFormOptions = {
  shape: { phases: 7, readinessGates: 6, trackModules: { min: 22, max: 23 }, oftCards: { min: 12, max: 13 }, assessmentComponents: 10 },
  statuses: ['DRAFT', 'PUBLISHED', 'RETIRED'],
  learningComponentKinds: ['MINI_PROJECT', 'INTEGRATION_PROJECT', 'CAPSTONE_PROJECT', 'BUSINESS_SIMULATION', 'PORTFOLIO'],
  singleLearningComponentKinds: ['CAPSTONE_PROJECT', 'BUSINESS_SIMULATION', 'PORTFOLIO'],
  evidenceTypes: ['PHOTOGRAPH', 'FIELD_LOG', 'DOCUMENT', 'LINK', 'HOST_NOTE'],
  clearanceModes: ['ASSESSOR_DECIDES', 'MINIMUM_BAND'],
  competencyBands: { min: 1, max: 5 },
};

export const incomplete = (over: Partial<TrackVariantCompleteness> = {}): TrackVariantCompleteness => ({
  complete: false,
  phases: { actual: 2, required: 7 },
  trackModules: { actual: 1, required: 22 },
  oftCards: { actual: 1, required: 12, hoursMin: 4, hoursMax: 6 },
  readinessGates: { actual: 0, required: 6 },
  assessmentComponents: { actual: 0, required: 10, weightTotal: null },
  learningComponents: { MINI_PROJECT: 1, INTEGRATION_PROJECT: 0, CAPSTONE_PROJECT: 0, BUSINESS_SIMULATION: 0, PORTFOLIO: 0 },
  missing: [
    { item: 'phases', message: '2 of 7 phases; missing phase 3, 4, 5, 6 and 7.' },
    { item: 'trackModules', message: '1 of 22 track modules.' },
    { item: 'readinessGates', message: '0 of 6 readiness gates; missing gate 1, 2, 3, 4, 5 and 6.' },
  ],
  warnings: [{ item: 'oftHours', message: 'The OFT cards allow at most 6 hours, below the module’s OFT minimum of 120 hours.' }],
  ...over,
});

export const complete = (): TrackVariantCompleteness => ({
  complete: true,
  phases: { actual: 7, required: 7 },
  trackModules: { actual: 22, required: 22 },
  oftCards: { actual: 12, required: 12, hoursMin: 120, hoursMax: 180 },
  readinessGates: { actual: 6, required: 6 },
  assessmentComponents: { actual: 10, required: 10, weightTotal: 100 },
  learningComponents: { MINI_PROJECT: 2, INTEGRATION_PROJECT: 1, CAPSTONE_PROJECT: 1, BUSINESS_SIMULATION: 1, PORTFOLIO: 1 },
  missing: [],
  warnings: [],
});

export const variant = (over: Partial<ApiTrackVariant> = {}): ApiTrackVariant => ({
  id: 'v1',
  courseModuleId: 'm3',
  trackId: 't7',
  course: { id: 'c1', code: 'AK-DIP', title: 'Amrut Kalash Diploma', entityId: 'e1' },
  courseModule: { id: 'm3', moduleNumber: 3, title: 'Track Specialisation', coreHours: 300, oftHoursMin: 120, oftHoursMax: 180 },
  track: { id: 't7', code: 'T07', name: 'Cyber Security', isActive: true },
  status: 'DRAFT',
  expectedTrackModules: 22,
  expectedOftCards: 12,
  syllabusReference: 'Track syllabus T07 v1.0',
  description: '<p>The <strong>cyber security</strong> track.</p>',
  publishedAt: null,
  isActive: true,
  createdAt: AT,
  updatedAt: AT,
  completeness: incomplete(),
  ...over,
});

const base = { trackVariantId: 'v1', createdAt: AT, updatedAt: AT };

export const phases: ApiPhase[] = [
  { ...base, id: 'p1', phaseNumber: 1, title: 'Foundations', description: null },
  { ...base, id: 'p2', phaseNumber: 2, title: 'Core Practice', description: null },
];

export const trackModules: ApiTrackModule[] = [
  { ...base, id: 'tm1', phaseId: 'p1', code: 'T07-M01', title: 'Networks Basics', sortOrder: 1, lectureHours: 6, practicalHours: 6, description: null },
];

export const oftCards: ApiOftCard[] = [
  {
    ...base, id: 'o1', oftCode: 'OFT-M3-T07-01', title: 'Site Survey', stage: null, linkedTrackModuleId: 'tm1',
    instructions: '<p>Survey the host site network and record findings.</p>', hoursMin: 4, hoursMax: 6,
    deliverable: 'A survey report with photographs.', evidenceTypes: ['PHOTOGRAPH', 'DOCUMENT'], evidenceNotes: null,
    hostVerificationRequired: true, status: 'PUBLISHED',
  },
  {
    ...base, id: 'o2', oftCode: 'OFT-M3-T07-02', title: 'Firewall Review', stage: 'Stage 2', linkedTrackModuleId: null,
    instructions: '<p>Review the firewall rules with the host engineer.</p>', hoursMin: 3, hoursMax: 5,
    deliverable: 'A list of the rules reviewed.', evidenceTypes: ['FIELD_LOG'], evidenceNotes: null,
    hostVerificationRequired: false, status: 'DRAFT',
  },
];

export const items: Partial<Record<ItemPath, unknown[]>> = {
  phases,
  'track-modules': trackModules,
  'oft-cards': oftCards,
};

export const page = <T,>(rows: T[]) => ({ items: rows, meta: { page: 1, limit: 15, total: rows.length, totalPages: 1 } });

export const courseOptions = [
  { id: 'c1', code: 'AK-DIP', title: 'Amrut Kalash Diploma', entityId: 'e1' },
  { id: 'c2', code: 'PILOT', title: 'Pilot Course', entityId: 'e2' },
];

export const trackOptions = [
  { id: 't1', code: 'T01', name: 'Data Analytics' },
  { id: 't7', code: 'T07', name: 'Cyber Security' },
];

/* The panel's toasts are written into #toast-root (index.html); a test page has to provide it. */
export const ensureToastRoot = () => {
  if (!document.getElementById('toast-root')) {
    const root = document.createElement('div');
    root.id = 'toast-root';
    document.body.appendChild(root);
  }
};
