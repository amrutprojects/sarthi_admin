import { newIdempotencyKey, request, type PageMeta } from '../../../services/api-client';
import type {
  ApiKey,
  ApiKeyState,
  CreateApiKeyInput,
  IssuedApiKey,
  LmsSyncDetail,
  LmsSyncListQuery,
  LmsSyncRow,
  LmsSyncSummary,
  PushResult,
  RetryResult,
  RotatedApiKey,
} from '../types/lmsSync.types';

/*
 * Every M1 call of the Panel (amrut-kalash-api: docs/lms-sync/admin-api.md, docs/lms-integration-api-keys.md).
 *
 * Secrets: generate and rotate return the new key's secret once (Cache-Control: no-store). It is handed to the
 * caller and never cached (these calls do not go through the query cache) or written to browser storage.
 */
const SYNC = '/lms-sync';
const KEYS = '/api-keys';

export const lmsSyncApi = {
  /* Any error (404 on a server without M1, 403) hides the sync screens. */
  summary: async () => (await request<LmsSyncSummary>(`${SYNC}/summary`)).data,
  list: async (q: LmsSyncListQuery): Promise<{ items: LmsSyncRow[]; meta?: PageMeta }> => {
    const r = await request<LmsSyncRow[]>(`${SYNC}/students`, {
      query: { ...q, syncStatus: q.syncStatus?.length ? q.syncStatus.join(',') : undefined },
    });
    return { items: r.data, meta: r.meta };
  },
  detail: async (studentId: string) => (await request<LmsSyncDetail>(`${SYNC}/students/${studentId}`)).data,
  /* "Push to LMS", one or many (1–500): eligible students become PENDING and are sent in the next cycle. */
  push: async (studentIds: string[]) => (await request<PushResult>(`${SYNC}/students/push`, { method: 'POST', body: { studentIds } })).data,
  /* "Retry": FAILED students back to PENDING; no ids = every failed student. */
  retry: async (studentIds?: string[]) =>
    (await request<RetryResult>(`${SYNC}/students/retry`, { method: 'POST', body: studentIds ? { studentIds } : {} })).data,
};

export const apiKeyApi = {
  list: async (state?: ApiKeyState) => (await request<ApiKey[]>(KEYS, { query: { state } })).data,
  create: async (input: CreateApiKeyInput, idempotencyKey = newIdempotencyKey()) =>
    (await request<IssuedApiKey>(KEYS, { method: 'POST', body: input, idempotencyKey })).data,
  /* overlapMinutes: how long the old key keeps working (0 = stops now; API default 1440). 409 when the key is not ACTIVE. */
  rotate: async (id: string, overlapMinutes: number, idempotencyKey = newIdempotencyKey()) =>
    (await request<RotatedApiKey>(`${KEYS}/${id}/rotate`, { method: 'POST', body: { overlapMinutes }, idempotencyKey })).data,
  /* 409 when already revoked. */
  revoke: async (id: string, reason: string) => (await request<ApiKey>(`${KEYS}/${id}/revoke`, { method: 'POST', body: { reason } })).data,
};
