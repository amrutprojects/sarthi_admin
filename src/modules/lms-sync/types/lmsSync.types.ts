/*
 * M1 DTOs: Amrut students synchronised to the LMS (student_lms_link) and the API keys Amrut issues to the LMS.
 *
 * PROVISIONAL: the API (amrut-kalash-api, M1) is being built in parallel. These shapes follow the master plan
 * (Stage 3 M1), three-project-integration-design.md §6 and lms-api contracts/multi-tenant/amrut-student-api.md.
 * Every field the UI relies on is listed here, and every call is in services/lmsSyncApi.ts, so aligning with the
 * final API touches these two files only.
 */

/* student_lms_link.sync_status */
export const SYNC_FLAGS = ['NOT_SYNCED', 'PENDING', 'SENT', 'SYNCED', 'FAILED', 'REVIEW'] as const;
export type SyncFlag = (typeof SYNC_FLAGS)[number];
export const isSyncFlag = (v: string): v is SyncFlag => (SYNC_FLAGS as readonly string[]).includes(v);

/* GET /lms-sync/status: whether this server has the M1 sync at all, whether the worker is switched on, and counts per flag. */
export interface LmsSyncStatus {
  /* LMS_SYNC_ENABLED: off means flags are shown but pushes are refused. */
  enabled: boolean;
  lmsTenantCode: string | null;
  counts: Partial<Record<SyncFlag, number>>;
}

/* The sync summary a GET /students row carries (absent on servers without M1; null = never synced). */
export interface LmsSyncRowSummary {
  status: SyncFlag;
  lmsLearnerCode: string | null;
  lastSyncedAt: string | null;
}

/* One entry of a student's sync history, newest first. Values carry no personal data, only codes and outcomes. */
export interface LmsSyncEvent {
  id: string;
  at: string;
  /* e.g. QUEUED, MANUAL_PUSH, RETRY, SENT, SYNCED, FAILED, REVIEW, RECONCILED */
  type: string;
  /* The flag after the event, when it changed one. */
  status: SyncFlag | null;
  message: string | null;
  errorCodes?: string[];
  /* The staff member who pushed or retried; null for the worker. */
  actorName: string | null;
}

/* GET /students/:id/lms-sync */
export interface LmsSyncDetail {
  studentId: string;
  lmsTenantCode: string | null;
  status: SyncFlag;
  lmsLearnerId: string | null;
  lmsLearnerCode: string | null;
  attempts: number;
  lastAttemptAt: string | null;
  lastSyncedAt: string | null;
  /* When the worker will try again after a failure (backoff). */
  nextAttemptAt: string | null;
  lastErrorCodes: string[];
  lastErrorMessage: string | null;
  timeline: LmsSyncEvent[];
  /* The server's own answer to "may this student be pushed / retried now"; derived from the flag when absent. */
  canPush?: boolean;
  canRetry?: boolean;
}

/* POST /lms-sync/push */
export interface BulkPushResult {
  queued: number;
  skipped: { studentId: string; reason: string }[];
}

/* Scopes an Amrut-issued key may carry (amrut-student-api.md §2–4). */
export const API_KEY_SCOPES = ['students.match', 'students.create', 'students.update'] as const;
export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];
export const API_KEY_SCOPE_LABEL: Record<ApiKeyScope, string> = {
  'students.match': 'Match students (duplicate check)',
  'students.create': 'Create or match students',
  'students.update': 'Request profile corrections',
};

/*
 * An Amrut-issued API key as listed. The secret is never returned after creation; only its prefix identifies it.
 * ROTATING = replaced by a newer key and still accepted until `expiresAt` (the overlap window).
 */
export type ApiKeyStatus = 'ACTIVE' | 'ROTATING' | 'REVOKED' | 'EXPIRED';
export interface ApiKey {
  id: string;
  prefix: string;
  label: string;
  scopes: string[];
  status: ApiKeyStatus;
  createdAt: string;
  createdByName: string | null;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  /* The key this one replaced (rotation). */
  replacesId: string | null;
}

export interface CreateApiKeyInput {
  label: string;
  scopes: ApiKeyScope[];
}
/* POST /lms-api-keys → the key plus its secret, shown once. */
export interface IssuedApiKey {
  key: ApiKey;
  secret: string;
}
/* POST /lms-api-keys/:id/rotate → the new key and secret, and the old key (now ROTATING until its expiresAt). */
export interface RotatedApiKey extends IssuedApiKey {
  previous: ApiKey;
}
/* Overlap choices for a rotation: how long the old key keeps working so the LMS can be updated. */
export const ROTATE_OVERLAP_HOURS = [0, 1, 24, 72, 168] as const;
