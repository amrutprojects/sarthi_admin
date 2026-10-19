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
export interface RowIssue {
  field: string;
  code: string;
  message: string;
  status: 'OPEN' | 'ACCEPTED';
  reason?: string;
}
export interface ImportRowView {
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
  approvedAt: string;
  importBatchId: string;
  createdAt: string;
}
export interface StudentDetail extends StudentView {
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
}
export interface ImportReference {
  columns: { field: string; label: string; required: boolean }[];
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
  reject: (id: string, rowId: string, reason: string) =>
    request<ImportRowView>(`/imports/${id}/rows/${rowId}/reject`, { method: 'POST', body: { reason } }),
  restore: (id: string, rowId: string) => request<ImportRowView>(`/imports/${id}/rows/${rowId}/restore`, { method: 'POST', body: {} }),
  decide: (id: string, rowId: string, decision: 'SAME_PERSON' | 'DIFFERENT_PERSON' | 'HOLD', reason: string) =>
    request<ImportRowView>(`/imports/${id}/rows/${rowId}/decide`, { method: 'POST', body: { decision, reason } }),
  finalise: (id: string, confirmCode: string) => request<ImportBatch>(`/imports/${id}/finalise`, { method: 'POST', body: { confirmCode } }),
  cancel: (id: string) => request<ImportBatch>(`/imports/${id}/cancel`, { method: 'POST', body: {} }),
};

export const studentApi = {
  list: (q: { page?: number; limit?: number; search?: string; centre?: string; track?: string; batch?: string }) =>
    paged<StudentView>('/students', q),
  get: async (id: string) => (await request<StudentDetail>(`/students/${id}`)).data,
  documents: async (id: string) => (await request<StudentDocument[]>(`/students/${id}/documents`)).data,
  downloadDocument: (studentId: string, doc: StudentDocument) =>
    downloadFile(`/students/${studentId}/documents/${doc.id}/file`, fileNameOf(doc)),
};
