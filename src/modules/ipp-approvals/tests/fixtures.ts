import type {
  ApplicationDetail,
  ApplicationRow,
  ApprovalEvent,
  ApprovalSummary,
  BatchRow,
  LinkState,
  Stage,
} from '../types/ippApprovals.types';

/* Answers of the API as its specification gives them (sarthi-api docs/ipp-approvals.md). */
export const PUNE = { id: '11111111-1111-4111-8111-111111111111', name: 'Pune' };
export const SATARA = { id: '22222222-2222-4222-8222-222222222222', name: 'Satara' };
export const BATCH_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

const NO_ONE: Record<Stage, number> = { AUDITOR: 0, DIVISION: 0, COEP: 0, HEAD_OFFICE: 0, SUPER_ADMIN: 0, APPROVED: 0 };
export const counts = (over: Partial<Record<Stage, number>> = {}): Record<Stage, number> => ({ ...NO_ONE, ...over });

export const summary = (over: Partial<ApprovalSummary> = {}): ApprovalSummary => ({
  stages: ['DIVISION'],
  districts: [PUNE, SATARA],
  headOfficeEnabled: true,
  toDecide: 12,
  sentBack: 2,
  counts: counts({ DIVISION: 12, COEP: 20, APPROVED: 3 }),
  ...over,
});
export const readOnlySummary = (over: Partial<ApprovalSummary> = {}) =>
  summary({ stages: [], districts: null, toDecide: 0, sentBack: 0, ...over });

export const event = (over: Partial<ApprovalEvent> = {}): ApprovalEvent => ({
  event: 'RECEIVED',
  from: null,
  to: 'DIVISION',
  reason: null,
  by: 'IPP',
  role: null,
  at: '2026-11-20T05:00:00.000Z',
  ...over,
});

export const row = (over: Partial<ApplicationRow> = {}): ApplicationRow => ({
  id: 'app-1',
  registrationId: 'IPP-000001',
  registrationNumber: '202611200001',
  name: 'Asha Patil',
  mobile: '9876543210',
  email: 'asha@example.invalid',
  district: PUNE,
  category: 'OBC',
  centre: 'Shivajinagar Centre',
  technology: 'Data Analytics',
  stage: 'DIVISION',
  stageLabel: 'With Divisional Officer',
  stageUpdatedAt: '2026-11-20T05:00:00.000Z',
  batch: { id: BATCH_ID, code: 'IPP-B-0001', name: 'Pune 1' },
  documents: { uploaded: 4, verified: 3 },
  lastEvent: event(),
  canDecide: true,
  reasonRequired: false,
  ...over,
});

export const detail = (over: Partial<ApplicationDetail> = {}): ApplicationDetail => ({
  ...row(),
  aadhaarMasked: 'XXXX-XXXX-1234',
  formDistrict: 'Pune',
  submittedAt: '2026-11-18T05:00:00.000Z',
  auditor: { approvedAt: '2026-11-19T05:00:00.000Z', by: 'Auditor One', reason: 'Every document verified' },
  fields: [
    { key: 'father', step: 1, labelEn: 'Father name', labelMr: 'वडिलांचे नाव', type: 'TEXT', text: 'Suresh' },
    { key: 'mother', step: 1, labelEn: '', labelMr: 'आईचे नाव', type: 'TEXT', text: '' },
    { key: 'dob', step: 1, labelEn: 'Date of birth', labelMr: 'जन्मतारीख', type: 'DATE', text: '2003-04-12' },
    { key: 'qualification', step: 2, labelEn: 'Qualification', labelMr: 'शैक्षणिक पात्रता', type: 'SELECT', text: 'B.Sc' },
    { key: 'passed', step: 2, labelEn: 'Passed in', labelMr: 'उत्तीर्ण', type: 'MONTH', text: '2024-06' },
  ],
  documentList: [
    {
      code: 'PHOTO',
      name: 'Photo',
      nameMr: null,
      required: true,
      kind: 'DOCUMENT',
      file: { name: 'photo.png', mime: 'image/png', size: 2048, uploadedAt: '2026-11-18T05:00:00.000Z' },
      verified: true,
      verifiedAt: '2026-11-19T05:00:00.000Z',
      verifiedBy: 'Auditor One',
    },
    {
      code: 'CASTE CERT',
      name: 'Caste certificate',
      nameMr: null,
      required: true,
      kind: 'DOCUMENT',
      file: { name: 'caste.pdf', mime: 'application/pdf', size: 3 * 1024 * 1024, uploadedAt: '2026-11-18T05:00:00.000Z' },
      verified: false,
      verifiedAt: null,
      verifiedBy: null,
    },
    {
      code: 'VIDEO',
      name: 'Applicant video',
      nameMr: null,
      required: false,
      kind: 'VIDEO',
      file: { name: 'me.mp4', mime: 'video/mp4', size: 5 * 1024 * 1024, uploadedAt: '2026-11-18T05:00:00.000Z' },
      verified: true,
      verifiedAt: null,
      verifiedBy: null,
    },
    {
      code: 'PAN',
      name: 'PAN card',
      nameMr: null,
      required: false,
      kind: 'DOCUMENT',
      file: null,
      verified: false,
      verifiedAt: null,
      verifiedBy: null,
    },
  ],
  edits: [
    {
      at: '2026-11-19T04:00:00.000Z',
      by: 'Auditor One',
      changes: [{ key: 'pin', label: 'PIN code', from: '411001', to: '411005' }],
    },
  ],
  history: [event()],
  approveTo: { stage: 'COEP', label: 'With COEP' },
  rejectTo: { stage: 'AUDITOR', label: 'With IPP Auditor' },
  ...over,
});
/* The same application after the Divisional Officer's approval. */
export const movedOn = (over: Partial<ApplicationDetail> = {}) =>
  detail({ stage: 'COEP', stageLabel: 'With COEP', canDecide: false, approveTo: null, rejectTo: null, ...over });

export const batch = (over: Partial<BatchRow> = {}): BatchRow => ({
  id: BATCH_ID,
  code: 'IPP-B-0001',
  name: 'Pune 1',
  district: PUNE,
  centre: { code: 'SHV', name: 'Shivajinagar Centre' },
  size: 30,
  startDate: '2026-12-01',
  endDate: null,
  deliveryMode: 'OFFLINE',
  technology: 'Data Analytics',
  sentBy: 'Auditor One',
  receivedAt: '2026-11-20T05:00:00.000Z',
  students: 30,
  stages: counts({ DIVISION: 7, COEP: 23 }),
  toDecide: 7,
  ...over,
});

export const linkState = (over: Partial<LinkState> = {}): LinkState => ({
  enabled: true,
  configured: true,
  host: 'ippapi.example.invalid',
  lastSentAt: '2026-11-24T05:00:00.000Z',
  lastReceivedAt: null,
  pending: 0,
  failed: 0,
  items: [],
  ...over,
});

export const pageOf = <T>(items: T[], page = 1, total = items.length, totalPages = 1) => ({
  items,
  meta: { page, limit: 25, total, totalPages },
});

/* The toasts are drawn by the shared library into this element (index.html). */
export function resetToasts() {
  document.getElementById('toast-root')?.remove();
  document.body.insertAdjacentHTML('beforeend', '<div id="toast-root"></div>');
}
export const toasts = () => document.getElementById('toast-root') as HTMLElement;
