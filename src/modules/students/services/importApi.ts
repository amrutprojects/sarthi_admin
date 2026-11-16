import { downloadFile, request, type PageMeta } from '../../../services/api-client';

export type BatchStatus =
  | 'IMPORT_PENDING'
  | 'IMPORT_FAILED'
  | 'VALIDATING'
  | 'VALIDATED_WITH_EXCEPTIONS'
  | 'READY_TO_FINALISE'
  | 'FINALISED'
  | 'CANCELLED';
export type RowStatus =
  | 'DATA_VALIDATION_PENDING'
  | 'VALID'
  | 'DATA_EXCEPTION'
  | 'POSSIBLE_DUPLICATE'
  | 'SKIPPED_UNCHANGED'
  | 'ROW_REJECTED'
  | 'RECONCILED';

export interface BatchCounts {
  total: number;
  valid: number;
  exceptions: number;
  duplicates: number;
  skipped: number;
  rejected: number;
  reconciled: number;
  created?: number;
  linked?: number;
  /* Of `created`: students added as pending approval (the source had not approved them yet; NOT_APPROVED accepted). */
  pendingApproval?: number;
}
export interface DocumentsReport {
  zipName: string;
  uploadedAt: string;
  stored: number;
  /* Files assigned because the Excel named their path. */
  matchedByPath?: number;
  replaced: number;
  studentsWithFiles: number;
  unmatchedFolders: string[];
  rejected: { path: string; reason: string }[];
  /* Paths named in the Excel that the ZIP did not contain. */
  missingReferenced?: { rowNumber: number; sourceRecordId: string | null; docType: string; path: string }[];
}
/* A stored document file (backend StudentDocument DTO). */
export interface StudentDocument {
  id: string;
  docType: string;
  label: string;
  originalName: string;
  /* Where the file was inside the uploaded ZIP. */
  sourcePath: string | null;
  mimeType: 'application/pdf' | 'image/jpeg' | 'image/png';
  sizeBytes: number;
  uploadedAt: string;
  /* Set once a reviewer has verified the file (absent on servers that do not report it). */
  verifiedAt?: string | null;
}
const EXT: Record<StudentDocument['mimeType'], string> = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png' };
const fileNameOf = (d: StudentDocument) => `${d.docType}.${EXT[d.mimeType]}`;

export interface ImportBatch {
  id: string;
  code: string;
  status: BatchStatus;
  sourceChannel: string;
  fileName: string;
  fileSize: number;
  sourceReference: string | null;
  counts: BatchCounts;
  columnMapping: Record<string, string>;
  ignoredColumns: string[];
  failureReason: string | null;
  documentsReport: DocumentsReport | null;
  createdById: string;
  finalisedById: string | null;
  finalisedAt: string | null;
  createdAt: string;
}
/* Issue types a reviewer may accept with a reason (A-17); every other issue must be corrected at the source. */
export const WAIVABLE_ISSUE_CODES = [
  'NOT_APPROVED',
  'FORMAT_INVALID',
  'REF_UNKNOWN',
  'TRACK_NOT_OFFERED',
  'DOC_MISSING',
  'DOC_INVALID',
] as const;
export type WaivableIssueCode = (typeof WAIVABLE_ISSUE_CODES)[number];
/* Their labels, for the bulk accept's issue-type choice. */
export const WAIVABLE_ISSUE_LABEL: Record<WaivableIssueCode, string> = {
  NOT_APPROVED: 'Not yet approved at the source',
  FORMAT_INVALID: 'Invalid format',
  REF_UNKNOWN: 'Value not in the reference list',
  TRACK_NOT_OFFERED: 'Track not offered',
  DOC_MISSING: 'Required document missing',
  DOC_INVALID: 'Document file rejected',
};

/*
 * Profile and source details of an imported application (row values and the student detail). Optional: rows validated,
 * and students imported, before these fields existed carry none. Alternate contacts arrive masked.
 */
export interface StudentProfileFields {
  gender?: string | null;
  maritalStatus?: string | null;
  permanentAddress?: string | null;
  landmark?: string | null;
  districtId?: string | null;
  districtName?: string | null;
  talukaName?: string | null;
  division?: string | null;
  pinCode?: string | null;
  alternateMobile?: string | null;
  alternateEmail?: string | null;
  disabilityStatus?: boolean | null;
  disabilityType?: string | null;
  disabilityCertificateNumber?: string | null;
  qualificationName?: string | null;
  qualificationStream?: string | null;
  qualificationBoard?: string | null;
  /* YYYY-MM-DD */
  qualificationCompletedOn?: string | null;
  gradingType?: 'PERCENTAGE' | 'CGPA' | null;
  cgpaScale?: number | null;
  /* numeric(5,2) as a string, e.g. "78.50". */
  score?: string | null;
  qualificationClass?: string | null;
  schemeName?: string | null;
  /* The source's own submission and last-update date-times (ISO). */
  sourceSubmittedAt?: string | null;
  sourceUpdatedAt?: string | null;
  sourceRemarks?: string | null;
  /* The file's other columns (and values that could not be stored), by header as written. */
  sourceExtra?: Record<string, string>;
}

export interface RowIssue {
  field: string;
  code: string;
  message: string;
  status: 'OPEN' | 'ACCEPTED';
  reason?: string;
}
export interface ImportRowView extends StudentProfileFields {
  id: string;
  rowNumber: number;
  status: RowStatus;
  sourceRecordId: string | null;
  name: string;
  fatherName?: string;
  motherName?: string;
  email: string | null;
  mobile: string | null;
  aadhaar: string | null;
  dateOfBirth?: string | null;
  religion?: string;
  caste?: string;
  centreCode?: string | null;
  trackCode?: string | null;
  trackSourceValue?: string;
  educationQualification?: string;
  approvalStatus?: string;
  approvedAt?: string | null;
  evidenceRef?: string | null;
  documents?: Record<string, { supplied: boolean; barcode: string | null }>;
  /* The course centre was taken from the District column (no Course Centre column). */
  centreFromDistrict?: boolean;
  /* First / last name were split from this column. */
  nameFrom?: 'full_name' | 'applicant_name' | null;
  issues: RowIssue[];
  match: { tier: string; studentId: string | null; rowNumber: number | null; note: string | null } | null;
  decision: string | null;
  decisionReason: string | null;
  rejectReason: string | null;
  studentId: string | null;
}
export interface StudentView {
  id: string;
  code: string;
  sourceRecordId: string | null;
  name: string;
  centreCode: string | null;
  centreName: string | null;
  trackCode: string | null;
  trackName: string | null;
  trackToBeConfirmed: boolean;
  status: string;
  mobile: string | null;
  email: string | null;
  aadhaar: string | null;
  approvedAt: string | null;
  importBatchId: string | null;
  createdAt: string;
  /* IMPORT = imported student, PUBLIC_REGISTRATION = registration; both live in the one students table. */
  source: 'IMPORT' | 'PUBLIC_REGISTRATION';
  registrationNumber: string | null;
  /* Full values for reviewers (registrations.update); the backend audits each list. */
  unmasked?: { email: string | null; mobile: string | null; aadhaar: string | null };
  /* Eligible with a live batch assignment, and that batch (list rows; the detail may carry them too). */
  enrolled?: boolean;
  batch?: StudentBatchRef | null;
}
/* A row of GET /students. caste / education are shown when the server includes them. */
export interface StudentListItem extends StudentView {
  enrolled: boolean;
  batch: StudentBatchRef | null;
  caste?: string | null;
  educationQualification?: string | null;
}
export interface StudentDetail extends StudentView, StudentProfileFields {
  firstName: string;
  lastName: string;
  fatherName: string;
  motherName: string;
  dateOfBirth: string | null;
  religion: string;
  caste: string;
  educationQualification: string;
  trackSourceValue: string;
  externalStatus: string;
  evidenceRef: string | null;
  declarationAccepted: boolean | null;
  documents: { key: string; label: string; required: boolean; supplied: boolean; barcode: string | null }[];
  talukaId?: string | null;
}
/*
 * Register buckets (GET /students?bucket=, GET /students/summary):
 * applications = every non-deleted student (any status, active or not); pending = REGISTRATION_PENDING;
 * eligible = RECEIVED, active; enrolled = eligible with a live batch assignment; awaiting = eligible without one.
 */
export type StudentBucket = 'applications' | 'pending' | 'eligible' | 'enrolled' | 'awaiting';
export type StudentSource = 'IMPORT' | 'PUBLIC_REGISTRATION';
/* Track filter value for students whose track is to be confirmed (trackCode null). */
export const NO_TRACK = 'none';

export interface StudentBatchRef {
  id: string;
  code: string;
  name: string;
}
export interface BucketCounts {
  applications: number;
  eligible: number;
  enrolled: number;
}
/* GET /students/summary: PII-free counts, computed by the server. */
export interface StudentSummary {
  asOf: string;
  totals: BucketCounts & { pending: number; awaitingBatch: number; inactive: number };
  bySource: { source: StudentSource; count: number }[];
  /* Every active district of the regions master, zeros included, ordered by name. */
  byCentre: (BucketCounts & { code: string; name: string })[];
  /* T01..T12, then code null = track to be confirmed. */
  byTrack: (BucketCounts & { code: string | null; name: string })[];
  /* Applications per master value, highest first (id null = not recorded). */
  byCaste: { id: string | null; name: string; count: number }[];
  byEducation: { id: string | null; name: string; count: number }[];
  /* Last 12 months up to now ('YYYY-MM'); applications by approval (or creation) date, enrolled by assignment date. */
  byMonth: { month: string; applications: number; enrolled: number }[];
}
export interface StudentListQuery {
  page?: number;
  limit?: number;
  search?: string;
  /* District (region) code, e.g. PUN. */
  centre?: string;
  /* T01..T12, or NO_TRACK. */
  track?: string;
  /* Import batch id. */
  batch?: string;
  source?: StudentSource;
  bucket?: StudentBucket;
  casteId?: string;
  educationId?: string;
  regionId?: string;
}

export interface ImportReference {
  /* alternative: when another column can stand in for this one, e.g. "required unless Full Name is given". */
  columns: { field: string; label: string; required: boolean; alternative?: string | null; aliases?: string[] }[];
  tracks: { code: string; name: string; aliases: string[] }[];
  centres: { code: string; name: string }[];
  maxFileMb: number;
  maxRows: number;
}

type Page<T> = { items: T[]; meta?: PageMeta };
const paged = async <T>(path: string, query: Record<string, string | number | undefined>): Promise<Page<T>> => {
  const r = await request<T[]>(path, { query });
  return { items: r.data, meta: r.meta };
};

export const importApi = {
  reference: async () => (await request<ImportReference>('/imports/reference')).data,
  template: () => downloadFile('/imports/template.csv', 'student-import-template.csv'),
  templateXlsx: () => downloadFile('/imports/template.xlsx', 'student-import-template.xlsx'),
  sampleDocuments: () => downloadFile('/imports/sample-documents.zip', 'sample-documents.zip'),
  list: (q: { page?: number; limit?: number; status?: string; search?: string }) => paged<ImportBatch>('/imports', q),
  get: async (id: string) => (await request<ImportBatch>(`/imports/${id}`)).data,
  /* Data file plus, optionally, the documents ZIP (one folder per student named by source_record_id). */
  upload: async (file: File, sourceReference?: string, documents?: File) => {
    const fd = new FormData();
    fd.append('file', file);
    if (documents) fd.append('documents', documents);
    if (sourceReference) fd.append('sourceReference', sourceReference);
    return request<ImportBatch>('/imports', { method: 'POST', body: fd });
  },
  uploadDocuments: async (batchId: string, documents: File) => {
    const fd = new FormData();
    fd.append('documents', documents);
    return request<ImportBatch>(`/imports/${batchId}/documents`, { method: 'POST', body: fd });
  },
  rowDocuments: async (batchId: string, rowId: string) =>
    (await request<StudentDocument[]>(`/imports/${batchId}/rows/${rowId}/documents`)).data,
  downloadRowDocument: (batchId: string, rowId: string, doc: StudentDocument) =>
    downloadFile(`/imports/${batchId}/rows/${rowId}/documents/${doc.id}/file`, fileNameOf(doc)),
  rows: (id: string, q: { page?: number; limit?: number; status?: string; search?: string }) =>
    paged<ImportRowView>(`/imports/${id}/rows`, q),
  accept: (id: string, rowId: string, reason: string) =>
    request<ImportRowView>(`/imports/${id}/rows/${rowId}/accept`, { method: 'POST', body: { reason } }),
  /* Accept the waivable issues (only `code` when given) of every exception row; rows with a non-waivable issue are skipped. */
  acceptAll: (id: string, reason: string, code?: WaivableIssueCode) =>
    request<{ batch: ImportBatch; accepted: number; skipped: number }>(`/imports/${id}/accept-issues`, {
      method: 'POST',
      body: code ? { reason, code } : { reason },
    }),
  reject: (id: string, rowId: string, reason: string) =>
    request<ImportRowView>(`/imports/${id}/rows/${rowId}/reject`, { method: 'POST', body: { reason } }),
  restore: (id: string, rowId: string) => request<ImportRowView>(`/imports/${id}/rows/${rowId}/restore`, { method: 'POST', body: {} }),
  decide: (id: string, rowId: string, decision: 'SAME_PERSON' | 'DIFFERENT_PERSON' | 'HOLD', reason: string) =>
    request<ImportRowView>(`/imports/${id}/rows/${rowId}/decide`, { method: 'POST', body: { decision, reason } }),
  finalise: (id: string, confirmCode: string) => request<ImportBatch>(`/imports/${id}/finalise`, { method: 'POST', body: { confirmCode } }),
  cancel: (id: string) => request<ImportBatch>(`/imports/${id}/cancel`, { method: 'POST', body: {} }),
};

export const studentApi = {
  list: (q: StudentListQuery) => paged<StudentListItem>('/students', { ...q }),
  /* Register counts for the dashboard and the candidate list; `centre` limits them to one district. */
  summary: async (centre?: string) => (await request<StudentSummary>('/students/summary', { query: { centre } })).data,
  get: async (id: string) => (await request<StudentDetail>(`/students/${id}`)).data,
  documents: async (id: string) => (await request<StudentDocument[]>(`/students/${id}/documents`)).data,
  downloadDocument: (studentId: string, doc: StudentDocument) =>
    downloadFile(`/students/${studentId}/documents/${doc.id}/file`, fileNameOf(doc)),
};
