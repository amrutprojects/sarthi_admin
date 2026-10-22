/* Document Master, as /api/v1/cms/documents returns and accepts it. */

export const DOCUMENT_CATEGORIES = [
  'CENTRE_PROFILE', 'AGREEMENT', 'APPROVAL_LETTER', 'CERTIFICATE', 'REPORT', 'FINANCE', 'PHOTO_EVIDENCE', 'OTHER',
] as const;
export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

export const CATEGORY_LABEL: Record<DocumentCategory, string> = {
  CENTRE_PROFILE: 'Centre profile',
  AGREEMENT: 'Agreement / MoU',
  APPROVAL_LETTER: 'Approval letter',
  CERTIFICATE: 'Certificate',
  REPORT: 'Report',
  FINANCE: 'Finance',
  PHOTO_EVIDENCE: 'Photo evidence',
  OTHER: 'Other',
};

export const VERIFICATION_STATUSES = ['PENDING', 'VERIFIED', 'REJECTED'] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const VERIFICATION_LABEL: Record<VerificationStatus, string> = { PENDING: 'Pending', VERIFIED: 'Verified', REJECTED: 'Rejected' };

/* Mirrors the backend default DOCUMENT_MAX_FILE_MB; the server re-checks size and type on every upload. */
export const DOCUMENT_MAX_FILE_MB = 5;
export const DOCUMENT_FILE_ACCEPT = '.pdf,.jpg,.jpeg,.png';

export interface ApiDocument {
  id: string;
  title: string;
  category: DocumentCategory;
  description: string | null;
  districtId: string | null;
  districtName: string | null;
  districtCode: string | null;
  districtIsActive: boolean | null;
  /* State of the linked district (for the State -> District cascade of the edit form). */
  stateId: string | null;
  stateName: string | null;
  stateCode: string | null;
  stateIsActive: boolean | null;
  centreId: string | null;
  centreName: string | null;
  centreCode: string | null;
  centreIsActive: boolean | null;
  fileName: string;
  mimeType: string;
  fileSize: number;
  sha256: string;
  uploadedById: string | null;
  uploadedByName: string | null;
  verificationStatus: VerificationStatus;
  verificationReason: string | null;
  verifiedById: string | null;
  verifiedByName: string | null;
  verifiedAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDocumentInput {
  title: string;
  category: DocumentCategory;
  description: string | null;
  districtId: string | null;
  centreId: string | null;
  isActive?: boolean;
  file: File;
}

/* Every field optional; null clears an optional value; a file replaces the current one. */
export interface UpdateDocumentInput {
  title?: string;
  category?: DocumentCategory;
  description?: string | null;
  districtId?: string | null;
  centreId?: string | null;
  file?: File;
}

export interface VerifyDocumentInput {
  status: 'VERIFIED' | 'REJECTED';
  reason?: string | null;
  /*
   * SHA-256 of the file the approver reviewed (the one the page shows). The server answers 409 when the
   * current file differs, so a file replaced after the page loaded is never verified unseen.
   */
  sha256: string;
}

/* Field names of the document form, used to key validation messages (stateId only drives the cascade). */
export const DOCUMENT_FIELDS = ['title', 'category', 'description', 'stateId', 'districtId', 'centreId', 'file'] as const;
export type DocumentField = (typeof DOCUMENT_FIELDS)[number];

/* "PDF", "PNG", "JPEG" for the stored MIME type. */
export const fileTypeLabel = (mimeType: string): string =>
  mimeType === 'application/pdf' ? 'PDF' : mimeType === 'image/png' ? 'PNG' : mimeType === 'image/jpeg' ? 'JPEG' : mimeType;

/* 532 KB, 1.4 MB. */
export const fileSizeLabel = (bytes: number): string =>
  bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
