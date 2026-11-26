import type { ApiLmsCalendar } from '../types/calendar.types';
import type { ApiLearningConfigValue, LearningConfigView } from '../types/learningConfig.types';

/* Test data shaped exactly like the /api/v1/lms/calendars responses. */
export const AT = '2026-10-01T10:00:00.000Z';

export const ENTITY_ID = '11111111-1111-4111-8111-111111111111';
export const CENTRE_ID = '22222222-2222-4222-8222-222222222222';

export const calendar = (over: Partial<ApiLmsCalendar> = {}): ApiLmsCalendar => ({
  id: 'cal1',
  name: 'Academic Year 2026-27',
  entityId: ENTITY_ID,
  entity: { id: ENTITY_ID, name: 'Sarthi', code: 'AMK', isActive: true },
  centreId: null,
  centre: null,
  type: 'ENTITY',
  validFrom: '2026-06-01',
  validTo: '2027-05-31',
  workingDays: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
  holidayCount: 2,
  holidays: [
    { id: 'h1', date: '2026-08-15', name: 'Independence Day' },
    { id: 'h2', date: '2026-10-02', name: 'Gandhi Jayanti' },
  ],
  isActive: true,
  createdAt: AT,
  updatedAt: AT,
  ...over,
});

export const page = <T,>(items: T[]) => ({ items, meta: { page: 1, limit: 15, total: items.length, totalPages: 1 } });

export const entityOptions = [
  { id: ENTITY_ID, name: 'Sarthi', code: 'AMK' },
  { id: 'e2', name: 'Pilot Entity', code: 'PILOT' },
];

export const centreOptions = [
  { id: CENTRE_ID, name: 'Nashik Road Centre', code: 'TC0001', districtName: 'Nashik' },
  { id: 'c3', name: 'Pune Main Centre', code: 'TC0003', districtName: 'Pune' },
];

const base: Pick<
  ApiLearningConfigValue,
  'unit' | 'min' | 'options' | 'length' | 'mode' | 'syllabusValue' | 'reason' | 'updatedAt'
> = {
  unit: null,
  min: null,
  options: null,
  length: null,
  mode: null,
  syllabusValue: null,
  reason: null,
  updatedAt: null,
};

export const configRow = (over: Partial<ApiLearningConfigValue> & Pick<ApiLearningConfigValue, 'key' | 'label' | 'group' | 'type' | 'kind'>): ApiLearningConfigValue => ({
  ...base,
  openQuestions: [],
  value: null,
  valueSource: null,
  sourceNote: 'To be prescribed by the competent authority',
  toBeConfirmed: true,
  ...over,
});

export const learningConfig = (): LearningConfigView => ({
  entityId: ENTITY_ID,
  keys: [
    configRow({
      key: 'core_hours.module_1', label: 'Core hours — Module 1', group: 'Core hours', type: 'integer', kind: 'SYLLABUS',
      unit: 'hours', min: 1, value: 60, syllabusValue: 60, valueSource: 'SYLLABUS', toBeConfirmed: false,
      sourceNote: 'Final syllabus document, pending approval by the competent authority', openQuestions: ['OQ-012'],
    }),
    configRow({
      key: 'oft_hours.module_1', label: 'OFT hours range — Module 1', group: 'On Field Training', type: 'range', kind: 'SYLLABUS',
      unit: 'hours', min: 1, value: { min: 40, max: 48 }, syllabusValue: { min: 42, max: 48 }, valueSource: 'CONFIGURED', toBeConfirmed: false,
      sourceNote: 'Final syllabus document, pending approval by the competent authority', openQuestions: ['OQ-012'],
      reason: 'Approved by the board', updatedAt: AT,
    }),
    configRow({
      key: 'attendance.requirement', label: 'Attendance requirement', group: 'Attendance', type: 'percentage', kind: 'PRESCRIBED',
      unit: 'percent', openQuestions: ['OQ-014'],
    }),
    configRow({
      key: 'attendance.capture_method', label: 'Attendance capture method', group: 'Delivery mode rules', type: 'enum', kind: 'PRESCRIBED',
      mode: 'OFFLINE', options: ['trainer_marked', 'self_check_in'], openQuestions: ['OQ-014', 'OQ-042'],
    }),
    configRow({
      key: 'attendance.capture_method', label: 'Attendance capture method', group: 'Delivery mode rules', type: 'enum', kind: 'PRESCRIBED',
      mode: 'ONLINE', options: ['trainer_marked', 'self_check_in'], openQuestions: ['OQ-014', 'OQ-042'],
      value: 'self_check_in', valueSource: 'CONFIGURED', toBeConfirmed: false, reason: 'Pilot rule', updatedAt: AT,
    }),
  ],
});

/* The panel's toasts are written into #toast-root (index.html); a test page has to provide it. */
export const ensureToastRoot = () => {
  if (!document.getElementById('toast-root')) {
    const root = document.createElement('div');
    root.id = 'toast-root';
    document.body.appendChild(root);
  }
};
