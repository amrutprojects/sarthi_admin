/*
 * M1 DTOs, matching amrut-kalash-api:
 * - LMS sync admin API `/api/v1/lms-sync` (docs/lms-sync/admin-api.md, src/modules/lms-sync/lms-sync.validation.ts);
 * - API keys `/api/v1/api-keys` (docs/lms-integration-api-keys.md, src/modules/api-keys/api-key.validation.ts).
 */

/* student_lms_link.syncStatus (lms-sync.constants.ts SYNC_STATUSES) */
export const SYNC_FLAGS = ['NOT_SYNCED', 'PENDING', 'SENT', 'SYNCED', 'FAILED', 'REVIEW'] as const;
export type SyncFlag = (typeof SYNC_FLAGS)[number];
export const isSyncFlag = (v: string): v is SyncFlag => (SYNC_FLAGS as readonly string[]).includes(v);

/* GET /lms-sync/summary: counts over eligible students (approved, active, not deleted). */
export interface LmsSyncSummary {
  tenantCode: string | null;
  /* LMS_SYNC_ENABLED. Off: show "LMS sync is switched off"; push and retry still queue. */
  syncEnabled: boolean;
  eligible: number;
  byStatus: Record<SyncFlag, number>;
}

/* GET /lms-sync/students query. `syncStatus` is sent comma-separated. */
export interface LmsSyncListQuery {
  page?: number;
  limit?: number;
  syncStatus?: SyncFlag[];
  /* eligible (default) = what the sync sends; all = every student. */
  scope?: 'eligible' | 'all';
  /* Student code or name. */
  search?: string;
  centre?: string;
  errorCode?: string;
}

/* A row of GET /lms-sync/students (no personal data beyond code and name). A student without a link: NOT_SYNCED, 0, nulls. */
export interface LmsSyncRow {
  studentId: string;
  code: string;
  firstName: string;
  lastName: string;
  centreCode: string | null;
  trackCode: string | null;
  studentStatus: string;
  eligible: boolean;
  syncStatus: SyncFlag;
  /* The LMS intake status (RECEIVED, INVALID, PROVISIONED, …). */
  lmsStatus: string | null;
  lmsLearnerCode: string | null;
  attempts: number;
  lastErrorCode: string | null;
  lastSentAt: string | null;
  lastSyncedAt: string | null;
  nextAttemptAt: string | null;
}

/* GET /lms-sync/students/:id */
export interface LmsSyncDetail extends Omit<LmsSyncRow, 'centreCode' | 'trackCode'> {
  tenantCode: string | null;
  syncEnabled: boolean;
  lmsLearnerId: string | null;
  lmsRequestId: string | null;
  lmsReasonCodes: string[];
  /* Field names and codes only, never values. */
  lastErrorDetails: { field: string; code: string }[];
  queuedAt: string | null;
  lastCheckedAt: string | null;
  linkCreatedAt: string | null;
  payload: {
    fields: string[];
    /* LMS-required fields empty in Amrut: "fill these in to sync". */
    missingRequiredFields: string[];
    checksum: string;
    lastSentChecksum: string | null;
    /* With SYNCED: an edit waits for the next cycle. */
    changedSinceLastSend: boolean;
  };
}

/* POST /lms-sync/students/push (1–500 ids). */
export type PushSkipReason = 'NOT_ELIGIBLE' | 'NOT_FOUND';
export interface PushResult {
  syncEnabled: boolean;
  queued: string[];
  skipped: { studentId: string; reason: PushSkipReason | string }[];
}
/* POST /lms-sync/students/retry ({} = every FAILED student); non-failed ids are ignored, not listed. */
export interface RetryResult {
  syncEnabled: boolean;
  queued: string[];
}
export const BULK_PUSH_MAX = 500;

/* Error codes in lastErrorCode besides LMS_<status> and the LMS's own (lms-sync.constants.ts SYNC_ERROR). */
export const SYNC_ERROR_LABEL: Record<string, string> = {
  MISSING_REQUIRED_FIELDS: 'Required fields are empty in Amrut',
  LMS_REJECTED_FIELDS: 'The LMS rejected some fields',
  LMS_UNAVAILABLE: 'The LMS could not be reached; it will be tried again',
  NOT_ELIGIBLE: 'No longer approved or active',
};

/* Scopes of an Amrut-issued key (api-key.secret.ts API_KEY_SCOPES); the LMS needs all three. */
export const API_KEY_SCOPES = ['lms.students.match', 'lms.students.create', 'lms.students.update'] as const;
export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];
export const API_KEY_SCOPE_LABEL: Record<ApiKeyScope, string> = {
  'lms.students.match': 'Match students (duplicate check)',
  'lms.students.create': 'Create or match students',
  'lms.students.update': 'Request profile corrections',
};

/* `status` is stored (ACTIVE | REVOKED); `state` is what to show. EXPIRING = rotated, accepted until expiresAt. */
export type ApiKeyState = 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'REVOKED';
export interface ApiKey {
  id: string;
  label: string;
  prefix: string;
  /* e.g. "amk_3f9a1c0b7d2e_…" */
  displayPrefix: string;
  scopes: string[];
  status: 'ACTIVE' | 'REVOKED';
  state: ApiKeyState;
  expiresAt: string | null;
  createdAt: string;
  createdById: string | null;
  rotatedAt: string | null;
  rotatedById: string | null;
  replacedById: string | null;
  rotatedFromId: string | null;
  revokedAt: string | null;
  revokedById: string | null;
  revokedReason: string | null;
  lastUsedAt: string | null;
}

/* POST /api-keys: label 2–100; scopes default to all; optional future expiry. */
export interface CreateApiKeyInput {
  label: string;
  scopes?: ApiKeyScope[];
  expiresAt?: string | null;
}
export const API_KEY_LABEL_MIN = 2;
export const API_KEY_LABEL_MAX = 100;
/* 201 → the key plus its secret, returned once (`amk_<12 hex>_<43 base64url>`). */
export interface IssuedApiKey {
  key: ApiKey;
  secret: string;
}
/* POST /api-keys/:id/rotate → the new key and secret, and the old key (EXPIRING until its expiresAt). */
export interface RotatedApiKey extends IssuedApiKey {
  previous: ApiKey;
}
/* Overlap choices in minutes (API: 0–10080, default 1440). */
export const ROTATE_OVERLAP_MINUTES = [0, 60, 1440, 4320, 10080] as const;
export const ROTATE_OVERLAP_DEFAULT = 1440;
/* Revoke reason 3–300. */
export const REVOKE_REASON_MAX = 300;
