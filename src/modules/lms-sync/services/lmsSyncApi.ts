import { newIdempotencyKey, request } from '../../../services/api-client';
import type {
  ApiKey,
  BulkPushResult,
  CreateApiKeyInput,
  IssuedApiKey,
  LmsSyncDetail,
  LmsSyncStatus,
  RotatedApiKey,
} from '../types/lmsSync.types';

/*
 * Every M1 call of the Panel. PROVISIONAL paths and bodies (see types/lmsSync.types.ts); the register's flag column
 * and filter ride on GET /students (`lmsSync` on each row, `lmsSyncStatus` filter) in the students module.
 *
 * Secrets: generate and rotate return the new key's secret once. It is handed to the caller and never cached
 * (these calls do not go through the query cache) or written to browser storage.
 */
const KEYS = '/lms-api-keys';

export const lmsSyncApi = {
  /* 404 / 403 = this server or user has no LMS sync: the Panel hides the flag column, filter and actions. */
  status: async () => (await request<LmsSyncStatus>('/lms-sync/status')).data,
  detail: async (studentId: string) => (await request<LmsSyncDetail>(`/students/${studentId}/lms-sync`)).data,
  /* Manual "Push to LMS" (D-11): queue the student now, whatever its flag. */
  push: async (studentId: string) =>
    (
      await request<LmsSyncDetail>(`/students/${studentId}/lms-sync/push`, {
        method: 'POST',
        body: {},
        idempotencyKey: newIdempotencyKey(),
      })
    ).data,
  /* Retry a FAILED sync now instead of waiting for the backoff. */
  retry: async (studentId: string) =>
    (
      await request<LmsSyncDetail>(`/students/${studentId}/lms-sync/retry`, {
        method: 'POST',
        body: {},
        idempotencyKey: newIdempotencyKey(),
      })
    ).data,
  bulkPush: async (studentIds: string[]) =>
    (await request<BulkPushResult>('/lms-sync/push', { method: 'POST', body: { studentIds }, idempotencyKey: newIdempotencyKey() })).data,
};

export const apiKeyApi = {
  list: async () => (await request<ApiKey[]>(KEYS)).data,
  create: async (input: CreateApiKeyInput, idempotencyKey = newIdempotencyKey()) =>
    (await request<IssuedApiKey>(KEYS, { method: 'POST', body: input, idempotencyKey })).data,
  /* overlapHours: how long the old key stays valid (0 = revoke it now). */
  rotate: async (id: string, overlapHours: number, idempotencyKey = newIdempotencyKey()) =>
    (await request<RotatedApiKey>(`${KEYS}/${id}/rotate`, { method: 'POST', body: { overlapHours }, idempotencyKey })).data,
  revoke: async (id: string, reason: string) => (await request<ApiKey>(`${KEYS}/${id}/revoke`, { method: 'POST', body: { reason } })).data,
};
