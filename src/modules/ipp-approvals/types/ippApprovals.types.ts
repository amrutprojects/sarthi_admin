/*
 * Types of the IPP approvals (sarthi-api /api/v1/ipp-approvals, see docs/ipp-approvals.md of that repository).
 * The form itself is IPP's: Sarthi keeps a read-only copy of it and the officers' decisions.
 */
export const STAGES = ['AUDITOR', 'DIVISION', 'COEP', 'HEAD_OFFICE', 'SUPER_ADMIN', 'APPROVED'] as const;
export type Stage = (typeof STAGES)[number];

export const APPLICATION_VIEWS = ['TO_DECIDE', 'SENT_ON', 'SENT_BACK', 'ALL'] as const;
export type ApplicationView = (typeof APPLICATION_VIEWS)[number];

/* The most applications one POST /approve takes. */
export const BULK_APPROVE_MAX = 500;
/* The most districts one officer can have (PUT /officers/:userId/districts). */
export const OFFICER_DISTRICTS_MAX = 200;

export interface NamedRef {
  id: string;
  name: string;
}
export interface District extends NamedRef {
  code: string;
}

export interface ApprovalSummary {
  /* The stages the signed-in user decides; empty = read-only. */
  stages: Stage[];
  /* null = not limited to districts. */
  districts: NamedRef[] | null;
  headOfficeEnabled: boolean;
  toDecide: number;
  /* Waiting for me after a rejection: part of toDecide, not the "Sent back" list. */
  sentBack: number;
  /* Of the applications I see. */
  counts: Record<Stage, number>;
}

export interface ApprovalEvent {
  /* RECEIVED, RESUBMITTED, CORRECTED, APPROVED, REJECTED, MOVED */
  event: string;
  from: Stage | null;
  to: Stage;
  reason: string | null;
  by: string;
  role: string | null;
  at: string;
}

export interface ApplicationRow {
  id: string;
  registrationId: string;
  registrationNumber: string | null;
  name: string;
  mobile: string;
  email: string;
  /* Of the batch. */
  district: NamedRef;
  category: string | null;
  centre: string | null;
  technology: string | null;
  stage: Stage;
  stageLabel: string;
  stageUpdatedAt: string;
  batch: { id: string; code: string; name: string };
  documents: { uploaded: number; verified: number };
  lastEvent: ApprovalEvent | null;
  /* By the signed-in user, now. */
  canDecide: boolean;
}

export interface ApplicationField {
  key: string;
  step: 1 | 2;
  labelEn: string;
  labelMr: string;
  type: string;
  text: string;
}

export interface DocumentFile {
  name: string;
  mime: string;
  size: number;
  uploadedAt: string;
}
export interface ApplicationDocument {
  code: string;
  name: string;
  nameMr: string | null;
  required: boolean;
  kind: 'DOCUMENT' | 'VIDEO';
  file: DocumentFile | null;
  verified: boolean;
  verifiedAt: string | null;
  verifiedBy: string | null;
}

export interface ApplicationEdit {
  at: string;
  by: string | null;
  changes: { key: string; label: string; from: string; to: string }[];
}

export interface DecisionTarget {
  stage: Stage;
  label: string;
}

export interface ApplicationDetail extends ApplicationRow {
  aadhaarMasked: string | null;
  formDistrict: string | null;
  submittedAt: string;
  auditor: { approvedAt: string | null; by: string | null };
  fields: ApplicationField[];
  documentList: ApplicationDocument[];
  edits: ApplicationEdit[];
  /* Newest first. */
  history: ApprovalEvent[];
  /* Where my approval / rejection sends it; null = not mine to decide now. */
  approveTo: DecisionTarget | null;
  rejectTo: DecisionTarget | null;
}

export type ApplicationSort = 'stageUpdatedAt' | 'name' | 'registrationId';
export type SortOrder = 'ASC' | 'DESC';

export interface ApplicationListQuery {
  page: number;
  limit: number;
  view: ApplicationView;
  search?: string;
  stage?: Stage;
  batchId?: string;
  districtId?: string;
  sortBy?: ApplicationSort;
  sortOrder?: SortOrder;
}

export interface BatchRow {
  id: string;
  code: string;
  name: string;
  district: NamedRef;
  centre: { code: string; name: string };
  size: number;
  startDate: string | null;
  endDate: string | null;
  deliveryMode: 'OFFLINE' | 'ONLINE' | 'BLENDED';
  technology: string | null;
  sentBy: string | null;
  receivedAt: string;
  /* students and stages count the applications I see. */
  students: number;
  stages: Record<Stage, number>;
  toDecide: number;
}

export type BatchSort = 'receivedAt' | 'name';
export interface BatchListQuery {
  page: number;
  limit: number;
  search?: string;
  districtId?: string;
  sortBy?: BatchSort;
  sortOrder?: SortOrder;
}

/* Answer of POST /approve and POST /batches/:id/approve; skipped = not mine to decide any more. */
export interface ApproveResult {
  approved: number;
  skipped: number;
  applications: { id: string; stage: Stage; stageLabel: string }[];
}

export interface HeadOfficeState {
  enabled: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
}
/* moved = applications that changed hands because of the switch. */
export type HeadOfficeChange = HeadOfficeState & { moved: number };

export interface Officer {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  districts: NamedRef[];
}
export interface DistrictWithoutOfficer extends NamedRef {
  waiting: number;
}
export interface OfficersResult {
  officers: Officer[];
  withoutOfficer: DistrictWithoutOfficer[];
}

export interface LinkItem {
  id: string;
  application: { id: string; registrationId: string; name: string };
  action: string;
  from: Stage;
  to: Stage;
  /* PENDING or FAILED */
  status: string;
  attempts: number;
  nextAttemptAt: string | null;
  lastError: string | null;
  createdAt: string;
}
export interface LinkState {
  enabled: boolean;
  configured: boolean;
  host: string | null;
  lastSentAt: string | null;
  lastReceivedAt: string | null;
  pending: number;
  failed: number;
  /* Pending and failed, oldest first, at most 100. */
  items: LinkItem[];
}
